import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, inArray } from 'drizzle-orm';
import {
  properties,
  rooms,
  tenants,
  leases,
  invoices,
} from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { createId } from '../utils/crypto';
import type { Env, AppVariables } from '../types';

export const invoicesRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

function addCycleMonths(
  dateStr: string,
  cycle: 'monthly' | 'quarterly' | 'semester' | 'yearly'
): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(date.getTime())) return dateStr;
  const months =
    cycle === 'yearly'
      ? 12
      : cycle === 'semester'
      ? 6
      : cycle === 'quarterly'
      ? 3
      : 1;
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

// Reusable Cron Logic: Check overdue invoices & auto-generate upcoming lease invoices
export async function processDailyBillingCron(
  d1: D1Database,
  orgIdFilter?: string
): Promise<{ markedOverdue: number; generatedInvoices: number }> {
  const db = drizzle(d1);
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const allInvoices = await db.select().from(invoices);
  let markedOverdue = 0;

  for (const inv of allInvoices) {
    if (inv.status === 'unpaid' && inv.dueDate < today) {
      await db
        .update(invoices)
        .set({ status: 'overdue' })
        .where(eq(invoices.id, inv.id));
      markedOverdue++;
    }
  }

  const activeLeases = await db
    .select()
    .from(leases)
    .where(eq(leases.status, 'active'));

  let generatedInvoices = 0;
  const nowIso = new Date().toISOString();

  for (const lse of activeLeases) {
    if (orgIdFilter) {
      const [prop] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, lse.propertyId))
        .limit(1);
      if (!prop || prop.orgId !== orgIdFilter) continue;
    }

    // If nextDueDate is within 7 days or already past due
    if (lse.nextDueDate <= sevenDaysLater) {
      // Check if an invoice for this periodStart already exists
      const existingForPeriod = allInvoices.find(
        (inv) =>
          inv.leaseId === lse.id && inv.periodStart === lse.nextDueDate
      );

      if (!existingForPeriod) {
        let addons: Array<{ label: string; amount: number }> = [];
        try {
          addons = JSON.parse(lse.recurringAddonsJson);
        } catch {
          addons = [];
        }
        const addonsTotal = addons.reduce(
          (sum, a) => sum + Number(a.amount || 0),
          0
        );
        const totalAmount = lse.baseRentAmount + addonsTotal;
        const periodEnd = addCycleMonths(lse.nextDueDate, lse.billingCycle);

        await db.insert(invoices).values({
          id: createId('inv'),
          leaseId: lse.id,
          propertyId: lse.propertyId,
          tenantId: lse.tenantId,
          invoiceNumber: `INV/${lse.nextDueDate.slice(
            0,
            4
          )}/${lse.nextDueDate.slice(5, 7)}/${Math.floor(
            100 + Math.random() * 900
          )}`,
          publicToken: createId('tk'),
          periodStart: lse.nextDueDate,
          periodEnd,
          dueDate: lse.nextDueDate,
          baseAmount: lse.baseRentAmount,
          additionalItemsJson: lse.recurringAddonsJson,
          discountAmount: 0,
          totalAmount,
          paidAmount: 0,
          status: lse.nextDueDate < today ? 'overdue' : 'unpaid',
          notes: 'Tagihan otomatis jatuh tempo periode berikutnya',
          createdAt: nowIso,
        });
        generatedInvoices++;
      }
    }
  }

  return { markedOverdue, generatedInvoices };
}

// GET /api/invoices — Daftar Lengkap Tagihan & Kwitansi
invoicesRoutes.get('/', requireAuth, async (c) => {
  const auth = c.get('auth');
  const selectedPropertyId = c.req.query('propertyId');
  const db = drizzle(c.env.DB);

  const allOrgProps = await db
    .select()
    .from(properties)
    .where(eq(properties.orgId, auth.org.id));

  const accessibleProps =
    auth.member.role === 'owner' ||
    auth.member.assignedPropertyIds.includes('*')
      ? allOrgProps
      : allOrgProps.filter((p) =>
          auth.member.assignedPropertyIds.includes(p.id)
        );

  const activePropIds =
    selectedPropertyId &&
    selectedPropertyId !== 'all' &&
    accessibleProps.some((p) => p.id === selectedPropertyId)
      ? [selectedPropertyId]
      : accessibleProps.map((p) => p.id);

  if (activePropIds.length === 0) {
    return c.json({ invoices: [] });
  }

  const rows = await db
    .select({
      id: invoices.id,
      leaseId: invoices.leaseId,
      propertyId: invoices.propertyId,
      tenantId: invoices.tenantId,
      invoiceNumber: invoices.invoiceNumber,
      publicToken: invoices.publicToken,
      periodStart: invoices.periodStart,
      periodEnd: invoices.periodEnd,
      dueDate: invoices.dueDate,
      baseAmount: invoices.baseAmount,
      additionalItemsJson: invoices.additionalItemsJson,
      discountAmount: invoices.discountAmount,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
      status: invoices.status,
      paymentProofR2Key: invoices.paymentProofR2Key,
      paidAt: invoices.paidAt,
      notes: invoices.notes,
      createdAt: invoices.createdAt,
      tenantName: tenants.fullName,
      tenantPhone: tenants.phoneWa,
      tenantKampus: tenants.universityOrWork,
      roomNumber: rooms.roomNumber,
      roomTypeName: rooms.typeName,
      billingCycle: leases.billingCycle,
      propertyName: properties.name,
      propertyAddress: properties.address,
      bankName: properties.bankName,
      bankAccountNumber: properties.bankAccountNumber,
      bankAccountHolder: properties.bankAccountHolder,
      qrisImageUrl: properties.qrisImageUrl,
    })
    .from(invoices)
    .innerJoin(leases, eq(invoices.leaseId, leases.id))
    .innerJoin(rooms, eq(leases.roomId, rooms.id))
    .innerJoin(tenants, eq(invoices.tenantId, tenants.id))
    .innerJoin(properties, eq(invoices.propertyId, properties.id))
    .where(inArray(invoices.propertyId, activePropIds));

  const formatted = rows.map((r) => {
    let additionalItems: Array<{ label: string; amount: number }> = [];
    try {
      additionalItems = JSON.parse(r.additionalItemsJson);
    } catch {
      additionalItems = [];
    }
    return {
      ...r,
      additionalItems,
      paymentProofUrl: r.paymentProofR2Key
        ? `/api/storage/file/${r.paymentProofR2Key}`
        : null,
    };
  });

  return c.json({ invoices: formatted });
});

// POST /api/invoices — Buat Tagihan Baru Manual (Sewa Pokok + Biaya Tambahan/Denda - Diskon)
invoicesRoutes.post('/', requireAuth, async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json<{
    leaseId?: string;
    periodStart?: string;
    periodEnd?: string;
    dueDate?: string;
    baseAmount?: number;
    additionalItems?: Array<{ label: string; amount: number }>;
    discountAmount?: number;
    notes?: string;
  }>();

  if (!body.leaseId) {
    return c.json({ error: 'Pilih penghuni / kamar terlebih dahulu.' }, 400);
  }

  const db = drizzle(c.env.DB);
  const [lse] = await db
    .select()
    .from(leases)
    .where(eq(leases.id, body.leaseId))
    .limit(1);

  if (!lse) {
    return c.json({ error: 'Kontrak sewa tidak ditemukan.' }, 404);
  }

  const [prop] = await db
    .select()
    .from(properties)
    .where(
      and(eq(properties.id, lse.propertyId), eq(properties.orgId, auth.org.id))
    )
    .limit(1);

  if (!prop) {
    return c.json({ error: 'Akses properti ditolak.' }, 403);
  }

  const periodStart = body.periodStart || lse.nextDueDate;
  const periodEnd =
    body.periodEnd || addCycleMonths(periodStart, lse.billingCycle);
  const dueDate = body.dueDate || periodStart;
  const baseAmount =
    body.baseAmount !== undefined
      ? Number(body.baseAmount)
      : lse.baseRentAmount;

  const additionalItems = (body.additionalItems || []).filter(
    (a) => a.label.trim() && Number(a.amount) > 0
  );
  const addonsTotal = additionalItems.reduce(
    (sum, a) => sum + Number(a.amount),
    0
  );
  const discountAmount = Number(body.discountAmount) || 0;
  const totalAmount = Math.max(0, baseAmount + addonsTotal - discountAmount);

  const invId = createId('inv');
  const invoiceNumber = `INV/${dueDate.slice(0, 4)}/${dueDate.slice(
    5,
    7
  )}/${Math.floor(100 + Math.random() * 900)}`;
  const publicToken = createId('tk');

  await db.insert(invoices).values({
    id: invId,
    leaseId: lse.id,
    propertyId: lse.propertyId,
    tenantId: lse.tenantId,
    invoiceNumber,
    publicToken,
    periodStart,
    periodEnd,
    dueDate,
    baseAmount,
    additionalItemsJson: JSON.stringify(additionalItems),
    discountAmount,
    totalAmount,
    paidAmount: 0,
    status: 'unpaid',
    notes: (body.notes || '').trim(),
    createdAt: new Date().toISOString(),
  });

  return c.json({
    ok: true,
    invoiceId: invId,
    invoiceNumber,
    publicToken,
  });
});

// POST /api/invoices/run-cron — Trigger Pengecekan Jatuh Tempo & Generate Tagihan Otomatis
invoicesRoutes.post('/run-cron', requireAuth, async (c) => {
  const auth = c.get('auth');
  const res = await processDailyBillingCron(c.env.DB, auth.org.id);
  return c.json({ ok: true, ...res });
});

// POST /api/invoices/:id/verify — Verifikasi Bukti Bayar & Terbitkan Status Lunas / Cicilan
invoicesRoutes.post('/:id/verify', requireAuth, async (c) => {
  const auth = c.get('auth');
  const invId = c.req.param('id');
  const body = await c.req.json<{
    status?: 'paid' | 'partial' | 'unpaid';
    paidAmount?: number;
    notes?: string;
  }>();

  const db = drizzle(c.env.DB);
  const [inv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invId))
    .limit(1);

  if (!inv) {
    return c.json({ error: 'Tagihan tidak ditemukan.' }, 404);
  }

  const [prop] = await db
    .select()
    .from(properties)
    .where(
      and(eq(properties.id, inv.propertyId), eq(properties.orgId, auth.org.id))
    )
    .limit(1);

  if (!prop) {
    return c.json({ error: 'Akses ditolak.' }, 403);
  }

  const targetStatus = body.status || 'paid';
  const paidAmount =
    targetStatus === 'paid'
      ? inv.totalAmount
      : body.paidAmount !== undefined
      ? Number(body.paidAmount)
      : inv.paidAmount;

  const nowIso = new Date().toISOString();

  await db
    .update(invoices)
    .set({
      status: targetStatus,
      paidAmount,
      paidAt: targetStatus === 'paid' ? nowIso : inv.paidAt,
      verifiedByUserId: auth.user.id,
      notes:
        body.notes !== undefined
          ? body.notes.trim()
          : targetStatus === 'paid'
          ? 'Pembayaran telah diverifikasi lunas'
          : inv.notes,
    })
    .where(eq(invoices.id, invId));

  // If paid in full, advance lease.nextDueDate to periodEnd if needed
  if (targetStatus === 'paid') {
    const [lse] = await db
      .select()
      .from(leases)
      .where(eq(leases.id, inv.leaseId))
      .limit(1);

    if (lse && lse.nextDueDate <= inv.periodStart) {
      await db
        .update(leases)
        .set({ nextDueDate: inv.periodEnd })
        .where(eq(leases.id, lse.id));
    }
  }

  return c.json({ ok: true, status: targetStatus, paidAmount });
});

// ================= PUBLIC INVOICE ENDPOINTS (TANPA LOGIN PENGHUNI) =================

// GET /api/invoices/public/:token
invoicesRoutes.get('/public/:token', async (c) => {
  const token = c.req.param('token');
  const db = drizzle(c.env.DB);

  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      publicToken: invoices.publicToken,
      periodStart: invoices.periodStart,
      periodEnd: invoices.periodEnd,
      dueDate: invoices.dueDate,
      baseAmount: invoices.baseAmount,
      additionalItemsJson: invoices.additionalItemsJson,
      discountAmount: invoices.discountAmount,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
      status: invoices.status,
      paymentProofR2Key: invoices.paymentProofR2Key,
      paidAt: invoices.paidAt,
      notes: invoices.notes,
      tenantName: tenants.fullName,
      tenantPhone: tenants.phoneWa,
      tenantKampus: tenants.universityOrWork,
      roomNumber: rooms.roomNumber,
      roomTypeName: rooms.typeName,
      billingCycle: leases.billingCycle,
      propertyName: properties.name,
      propertyAddress: properties.address,
      areaMalang: properties.areaMalang,
      bankName: properties.bankName,
      bankAccountNumber: properties.bankAccountNumber,
      bankAccountHolder: properties.bankAccountHolder,
      qrisImageUrl: properties.qrisImageUrl,
    })
    .from(invoices)
    .innerJoin(leases, eq(invoices.leaseId, leases.id))
    .innerJoin(rooms, eq(leases.roomId, rooms.id))
    .innerJoin(tenants, eq(invoices.tenantId, tenants.id))
    .innerJoin(properties, eq(invoices.propertyId, properties.id))
    .where(eq(invoices.publicToken, token))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return c.json({ error: 'Link tagihan tidak ditemukan atau tidak valid.' }, 404);
  }

  let additionalItems: Array<{ label: string; amount: number }> = [];
  try {
    additionalItems = JSON.parse(row.additionalItemsJson);
  } catch {
    additionalItems = [];
  }

  return c.json({
    invoice: {
      ...row,
      additionalItems,
      paymentProofUrl: row.paymentProofR2Key
        ? `/api/storage/file/${row.paymentProofR2Key}`
        : null,
    },
  });
});

// POST /api/invoices/public/:token/upload-proof — Penghuni Upload Foto Bukti Bayar Tanpa Login
invoicesRoutes.post('/public/:token/upload-proof', async (c) => {
  const token = c.req.param('token');
  const db = drizzle(c.env.DB);

  const [inv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.publicToken, token))
    .limit(1);

  if (!inv) {
    return c.json({ error: 'Tagihan tidak ditemukan.' }, 404);
  }

  const formData = await c.req.formData();
  const file = formData.get('file');
  const tenantNote = (formData.get('notes') as string) || '';

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'Mohon pilih file foto bukti pembayaran.' }, 400);
  }

  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'Ukuran foto maksimal 5 MB.' }, 400);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
  const r2Key = `proofs/${inv.propertyId}/${createId('proof')}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  await c.env.BUCKET.put(r2Key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type || 'image/webp',
    },
  });

  await db
    .update(invoices)
    .set({
      paymentProofR2Key: r2Key,
      status: inv.status === 'paid' ? 'paid' : 'waiting_verification',
      notes: tenantNote.trim()
        ? `Bukti diunggah penghuni: ${tenantNote.trim()}`
        : 'Penghuni telah mengunggah bukti transfer via link tagihan',
    })
    .where(eq(invoices.id, inv.id));

  return c.json({
    ok: true,
    paymentProofUrl: `/api/storage/file/${r2Key}`,
    status: inv.status === 'paid' ? 'paid' : 'waiting_verification',
  });
});
