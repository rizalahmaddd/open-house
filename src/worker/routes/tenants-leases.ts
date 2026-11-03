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

export const tenantsLeasesRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

function calculateNextDueDate(
  startDateStr: string,
  cycle: 'monthly' | 'quarterly' | 'semester' | 'yearly'
): string {
  const date = new Date(startDateStr + 'T00:00:00Z');
  if (isNaN(date.getTime())) {
    return startDateStr;
  }
  const monthsToAdd =
    cycle === 'yearly'
      ? 12
      : cycle === 'semester'
      ? 6
      : cycle === 'quarterly'
      ? 3
      : 1;
  date.setUTCMonth(date.getUTCMonth() + monthsToAdd);
  return date.toISOString().slice(0, 10);
}

// GET /api/tenants-leases — Daftar Penghuni & Kontrak Sewa (Aktif & Histori)
tenantsLeasesRoutes.get('/', requireAuth, async (c) => {
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
    return c.json({ leases: [] });
  }

  const rows = await db
    .select({
      leaseId: leases.id,
      propertyId: leases.propertyId,
      roomId: leases.roomId,
      tenantId: leases.tenantId,
      billingCycle: leases.billingCycle,
      startDate: leases.startDate,
      nextDueDate: leases.nextDueDate,
      endDate: leases.endDate,
      baseRentAmount: leases.baseRentAmount,
      recurringAddonsJson: leases.recurringAddonsJson,
      depositAmount: leases.depositAmount,
      depositStatus: leases.depositStatus,
      depositNotes: leases.depositNotes,
      leaseStatus: leases.status,
      roomNumber: rooms.roomNumber,
      roomFloor: rooms.floor,
      roomTypeName: rooms.typeName,
      propertyName: properties.name,
      fullName: tenants.fullName,
      phoneWa: tenants.phoneWa,
      idCardNumber: tenants.idCardNumber,
      idCardPhotoR2Key: tenants.idCardPhotoR2Key,
      universityOrWork: tenants.universityOrWork,
      originCity: tenants.originCity,
      emergencyContactName: tenants.emergencyContactName,
      emergencyContactPhone: tenants.emergencyContactPhone,
      emergencyContactRelation: tenants.emergencyContactRelation,
    })
    .from(leases)
    .innerJoin(rooms, eq(leases.roomId, rooms.id))
    .innerJoin(properties, eq(leases.propertyId, properties.id))
    .innerJoin(tenants, eq(leases.tenantId, tenants.id))
    .where(inArray(leases.propertyId, activePropIds));

  const formatted = rows.map((r) => {
    let addons: Array<{ label: string; amount: number }> = [];
    try {
      addons = JSON.parse(r.recurringAddonsJson);
    } catch {
      addons = [];
    }
    return {
      ...r,
      recurringAddons: addons,
      idCardPhotoUrl: r.idCardPhotoR2Key
        ? `/api/storage/file/${r.idCardPhotoR2Key}`
        : null,
    };
  });

  // Ensure demo Room 201 & 203 that were marked occupied in seed also have tenant leases if not yet created, or return formatted
  return c.json({ leases: formatted });
});

// POST /api/tenants-leases/checkin — Onboarding Check-in Penghuni Baru + Kontrak + Deposit + Tagihan Awal
tenantsLeasesRoutes.post('/checkin', requireAuth, async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json<{
    roomId?: string;
    fullName?: string;
    phoneWa?: string;
    idCardNumber?: string;
    idCardPhotoR2Key?: string | null;
    universityOrWork?: string;
    originCity?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    billingCycle?: 'monthly' | 'quarterly' | 'semester' | 'yearly';
    startDate?: string;
    baseRentAmount?: number;
    recurringAddons?: Array<{ label: string; amount: number }>;
    depositAmount?: number;
    depositNotes?: string;
    initialPaymentStatus?: 'paid' | 'unpaid';
  }>();

  const roomId = body.roomId;
  const fullName = (body.fullName || '').trim();
  const phoneWa = (body.phoneWa || '').trim();

  if (!roomId || !fullName || !phoneWa) {
    return c.json(
      { error: 'Kamar, Nama Lengkap Penghuni, dan Nomor WA wajib diisi.' },
      400
    );
  }

  const db = drizzle(c.env.DB);
  const [rm] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);

  if (!rm) {
    return c.json({ error: 'Kamar tidak ditemukan.' }, 404);
  }

  const [prop] = await db
    .select()
    .from(properties)
    .where(
      and(eq(properties.id, rm.propertyId), eq(properties.orgId, auth.org.id))
    )
    .limit(1);

  if (!prop) {
    return c.json({ error: 'Akses properti ditolak.' }, 403);
  }

  // Check if room already has active lease
  const existingLease = await db
    .select()
    .from(leases)
    .where(and(eq(leases.roomId, roomId), eq(leases.status, 'active')))
    .limit(1);

  if (existingLease.length > 0) {
    return c.json(
      { error: `Kamar ${rm.roomNumber} masih memiliki kontrak sewa aktif.` },
      400
    );
  }

  const now = new Date().toISOString();
  const startDate = body.startDate || now.slice(0, 10);
  const billingCycle = body.billingCycle || 'monthly';
  const nextDueDate = calculateNextDueDate(startDate, billingCycle);

  const defaultCycleRent =
    billingCycle === 'yearly'
      ? rm.priceYearly || rm.priceMonthly * 11
      : billingCycle === 'semester'
      ? rm.priceSemester || rm.priceMonthly * 5.5
      : billingCycle === 'quarterly'
      ? rm.priceQuarterly || rm.priceMonthly * 2.85
      : rm.priceMonthly;

  const baseRentAmount =
    body.baseRentAmount !== undefined
      ? Number(body.baseRentAmount)
      : defaultCycleRent;

  const recurringAddons = (body.recurringAddons || []).filter(
    (a) => a.label.trim() && Number(a.amount) > 0
  );
  const addonsTotal = recurringAddons.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );
  const depositAmount = Number(body.depositAmount) || 0;

  const tenantId = createId('tnt');
  const leaseId = createId('lse');

  // 1. Insert Tenant
  await db.insert(tenants).values({
    id: tenantId,
    orgId: auth.org.id,
    fullName,
    phoneWa,
    idCardNumber: (body.idCardNumber || '').trim(),
    idCardPhotoR2Key: body.idCardPhotoR2Key || null,
    universityOrWork: (body.universityOrWork || '').trim(),
    originCity: (body.originCity || '').trim(),
    emergencyContactName: (body.emergencyContactName || '').trim(),
    emergencyContactPhone: (body.emergencyContactPhone || '').trim(),
    emergencyContactRelation: (
      body.emergencyContactRelation || 'Orang Tua'
    ).trim(),
    createdAt: now,
  });

  // 2. Insert Lease
  await db.insert(leases).values({
    id: leaseId,
    propertyId: prop.id,
    roomId: rm.id,
    tenantId,
    billingCycle,
    startDate,
    nextDueDate,
    endDate: null,
    baseRentAmount,
    recurringAddonsJson: JSON.stringify(recurringAddons),
    depositAmount,
    depositStatus: 'held',
    depositNotes: (body.depositNotes || 'Deposit awal masuk').trim(),
    status: 'active',
    createdAt: now,
  });

  // 3. Update Room Status -> occupied
  await db
    .update(rooms)
    .set({ status: 'occupied' })
    .where(eq(rooms.id, rm.id));

  // 4. Generate First Invoice automatically
  const invId = createId('inv');
  const invCode = `INV/${startDate.slice(0, 4)}/${startDate.slice(5, 7)}/${Math.floor(
    100 + Math.random() * 900
  )}`;
  const publicToken = createId('tk');
  const totalAmount = baseRentAmount + addonsTotal;
  const isPaidNow = body.initialPaymentStatus === 'paid';

  await db.insert(invoices).values({
    id: invId,
    leaseId,
    propertyId: prop.id,
    tenantId,
    invoiceNumber: invCode,
    publicToken,
    periodStart: startDate,
    periodEnd: nextDueDate,
    dueDate: startDate,
    baseAmount: baseRentAmount,
    additionalItemsJson: JSON.stringify(recurringAddons),
    discountAmount: 0,
    totalAmount,
    paidAmount: isPaidNow ? totalAmount : 0,
    status: isPaidNow ? 'paid' : 'unpaid',
    paidAt: isPaidNow ? now : null,
    verifiedByUserId: isPaidNow ? auth.user.id : null,
    notes: isPaidNow
      ? 'Pembayaran awal check-in lunas'
      : 'Tagihan awal check-in penghuni baru',
    createdAt: now,
  });

  return c.json({
    ok: true,
    tenantId,
    leaseId,
    invoiceId: invId,
  });
});

// PUT /api/tenants-leases/tenant/:id — Update Data Penghuni / Foto KTP / Kontak Darurat
tenantsLeasesRoutes.put('/tenant/:id', requireAuth, async (c) => {
  const auth = c.get('auth');
  const tenantId = c.req.param('id');
  const body = await c.req.json<{
    fullName?: string;
    phoneWa?: string;
    idCardNumber?: string;
    idCardPhotoR2Key?: string | null;
    universityOrWork?: string;
    originCity?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
  }>();

  const db = drizzle(c.env.DB);
  const [existing] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, tenantId), eq(tenants.orgId, auth.org.id)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Data penghuni tidak ditemukan.' }, 404);
  }

  await db
    .update(tenants)
    .set({
      fullName:
        body.fullName !== undefined ? body.fullName.trim() : existing.fullName,
      phoneWa:
        body.phoneWa !== undefined ? body.phoneWa.trim() : existing.phoneWa,
      idCardNumber:
        body.idCardNumber !== undefined
          ? body.idCardNumber.trim()
          : existing.idCardNumber,
      idCardPhotoR2Key:
        body.idCardPhotoR2Key !== undefined
          ? body.idCardPhotoR2Key
          : existing.idCardPhotoR2Key,
      universityOrWork:
        body.universityOrWork !== undefined
          ? body.universityOrWork.trim()
          : existing.universityOrWork,
      originCity:
        body.originCity !== undefined
          ? body.originCity.trim()
          : existing.originCity,
      emergencyContactName:
        body.emergencyContactName !== undefined
          ? body.emergencyContactName.trim()
          : existing.emergencyContactName,
      emergencyContactPhone:
        body.emergencyContactPhone !== undefined
          ? body.emergencyContactPhone.trim()
          : existing.emergencyContactPhone,
      emergencyContactRelation:
        body.emergencyContactRelation !== undefined
          ? body.emergencyContactRelation.trim()
          : existing.emergencyContactRelation,
    })
    .where(eq(tenants.id, tenantId));

  return c.json({ ok: true });
});

// POST /api/tenants-leases/:leaseId/checkout — Proses Check-out Penghuni, Penyelesaian Deposit & Pengosongan Kamar
tenantsLeasesRoutes.post('/:leaseId/checkout', requireAuth, async (c) => {
  const auth = c.get('auth');
  const leaseId = c.req.param('leaseId');
  const body = await c.req.json<{
    depositStatus?: 'refunded' | 'deducted';
    depositNotes?: string;
    nextRoomStatus?: 'available' | 'maintenance';
  }>();

  const db = drizzle(c.env.DB);
  const [lse] = await db
    .select()
    .from(leases)
    .where(eq(leases.id, leaseId))
    .limit(1);

  if (!lse) {
    return c.json({ error: 'Data kontrak sewa tidak ditemukan.' }, 404);
  }

  const [prop] = await db
    .select()
    .from(properties)
    .where(
      and(eq(properties.id, lse.propertyId), eq(properties.orgId, auth.org.id))
    )
    .limit(1);

  if (!prop) {
    return c.json({ error: 'Akses ditolak.' }, 403);
  }

  const today = new Date().toISOString().slice(0, 10);
  const depositStatus = body.depositStatus || 'refunded';
  const nextRoomStatus = body.nextRoomStatus || 'available';

  await db
    .update(leases)
    .set({
      status: 'ended',
      endDate: today,
      depositStatus,
      depositNotes:
        body.depositNotes !== undefined
          ? body.depositNotes.trim()
          : lse.depositNotes,
    })
    .where(eq(leases.id, leaseId));

  await db
    .update(rooms)
    .set({ status: nextRoomStatus })
    .where(eq(rooms.id, lse.roomId));

  return c.json({
    ok: true,
    endDate: today,
    roomStatus: nextRoomStatus,
  });
});

// POST /api/tenants-leases/:leaseId/move-room — Pindah Kamar Kos
tenantsLeasesRoutes.post('/:leaseId/move-room', requireAuth, async (c) => {
  const auth = c.get('auth');
  const leaseId = c.req.param('leaseId');
  const body = await c.req.json<{
    targetRoomId?: string;
    newBaseRentAmount?: number;
  }>();

  if (!body.targetRoomId) {
    return c.json({ error: 'Pilih kamar tujuan pindah.' }, 400);
  }

  const db = drizzle(c.env.DB);
  const [lse] = await db
    .select()
    .from(leases)
    .where(eq(leases.id, leaseId))
    .limit(1);

  if (!lse || lse.status !== 'active') {
    return c.json({ error: 'Kontrak sewa aktif tidak ditemukan.' }, 404);
  }

  const [prop] = await db
    .select()
    .from(properties)
    .where(
      and(eq(properties.id, lse.propertyId), eq(properties.orgId, auth.org.id))
    )
    .limit(1);

  if (!prop) {
    return c.json({ error: 'Akses ditolak.' }, 403);
  }

  const [targetRoom] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.id, body.targetRoomId))
    .limit(1);

  if (!targetRoom || targetRoom.status !== 'available') {
    return c.json({ error: 'Kamar tujuan tidak tersedia.' }, 400);
  }

  // Free old room
  await db
    .update(rooms)
    .set({ status: 'available' })
    .where(eq(rooms.id, lse.roomId));

  // Occupy new room
  await db
    .update(rooms)
    .set({ status: 'occupied' })
    .where(eq(rooms.id, targetRoom.id));

  // Update lease
  await db
    .update(leases)
    .set({
      roomId: targetRoom.id,
      baseRentAmount:
        body.newBaseRentAmount !== undefined
          ? Number(body.newBaseRentAmount)
          : lse.baseRentAmount,
    })
    .where(eq(leases.id, leaseId));

  return c.json({ ok: true });
});
