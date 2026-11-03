import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, inArray } from 'drizzle-orm';
import {
  properties,
  rooms,
  expenses,
  maintenanceTickets,
  users,
  organizations,
} from '../db/schema';
import { requireAuth, requireOwner } from '../middleware/auth';
import { createId } from '../utils/crypto';
import type { Env, AppVariables } from '../types';

export const operationsPublicRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

// ================= EXPENSES (PENGELUARAN OPERASIONAL KOS) =================

// GET /api/operations/expenses
operationsPublicRoutes.get('/operations/expenses', requireAuth, async (c) => {
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
    return c.json({ expenses: [] });
  }

  const rows = await db
    .select({
      id: expenses.id,
      propertyId: expenses.propertyId,
      propertyName: properties.name,
      recordedByUserId: expenses.recordedByUserId,
      recordedByName: users.name,
      category: expenses.category,
      title: expenses.title,
      amount: expenses.amount,
      expenseDate: expenses.expenseDate,
      receiptPhotoR2Key: expenses.receiptPhotoR2Key,
      notes: expenses.notes,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .innerJoin(properties, eq(expenses.propertyId, properties.id))
    .innerJoin(users, eq(expenses.recordedByUserId, users.id))
    .where(inArray(expenses.propertyId, activePropIds));

  return c.json({
    expenses: rows.map((r) => ({
      ...r,
      receiptPhotoUrl: r.receiptPhotoR2Key
        ? `/api/storage/file/${r.receiptPhotoR2Key}`
        : null,
    })),
  });
});

// POST /api/operations/expenses — Catat Pengeluaran Operasional Baru + Foto Nota R2
operationsPublicRoutes.post('/operations/expenses', requireAuth, async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json<{
    propertyId?: string;
    category?:
      | 'electricity'
      | 'water'
      | 'internet'
      | 'maintenance'
      | 'staff_salary'
      | 'tax_retribution'
      | 'other';
    title?: string;
    amount?: number;
    expenseDate?: string;
    receiptPhotoR2Key?: string | null;
    notes?: string;
  }>();

  const propertyId = body.propertyId;
  const title = (body.title || '').trim();
  const amount = Number(body.amount) || 0;

  if (!propertyId || !title || amount <= 0) {
    return c.json(
      { error: 'Lokasi kos, nama pengeluaran, dan nominal wajib diisi.' },
      400
    );
  }

  const db = drizzle(c.env.DB);
  const [prop] = await db
    .select()
    .from(properties)
    .where(
      and(eq(properties.id, propertyId), eq(properties.orgId, auth.org.id))
    )
    .limit(1);

  if (!prop) {
    return c.json({ error: 'Properti kos tidak ditemukan.' }, 404);
  }

  const expId = createId('exp');
  const now = new Date().toISOString();

  await db.insert(expenses).values({
    id: expId,
    propertyId,
    recordedByUserId: auth.user.id,
    category: body.category || 'other',
    title,
    amount,
    expenseDate: body.expenseDate || now.slice(0, 10),
    receiptPhotoR2Key: body.receiptPhotoR2Key || null,
    notes: (body.notes || '').trim(),
    createdAt: now,
  });

  return c.json({ ok: true, expenseId: expId });
});

// DELETE /api/operations/expenses/:id — Hapus Catatan Pengeluaran (Owner Only)
operationsPublicRoutes.delete(
  '/operations/expenses/:id',
  requireAuth,
  requireOwner,
  async (c) => {
    const auth = c.get('auth');
    const expId = c.req.param('id');
    const db = drizzle(c.env.DB);

    const [exp] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expId))
      .limit(1);

    if (!exp) {
      return c.json({ error: 'Data pengeluaran tidak ditemukan.' }, 404);
    }

    const [prop] = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.id, exp.propertyId),
          eq(properties.orgId, auth.org.id)
        )
      )
      .limit(1);

    if (!prop) {
      return c.json({ error: 'Akses ditolak.' }, 403);
    }

    await db.delete(expenses).where(eq(expenses.id, expId));
    return c.json({ ok: true });
  }
);

// ================= MAINTENANCE TICKETS (KOMPLAIN FASILITAS) =================

// GET /api/operations/tickets
operationsPublicRoutes.get('/operations/tickets', requireAuth, async (c) => {
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
    return c.json({ tickets: [] });
  }

  const allRooms = await db
    .select()
    .from(rooms)
    .where(inArray(rooms.propertyId, activePropIds));
  const roomMap = new Map(allRooms.map((r) => [r.id, r.roomNumber]));
  const propMap = new Map(accessibleProps.map((p) => [p.id, p]));

  const rows = await db
    .select()
    .from(maintenanceTickets)
    .where(inArray(maintenanceTickets.propertyId, activePropIds));

  return c.json({
    tickets: rows.map((t) => ({
      ...t,
      roomNumber: t.roomId ? roomMap.get(t.roomId) || '-' : 'Area Umum Kos',
      propertyName: propMap.get(t.propertyId)?.name || '',
      propertySlug: propMap.get(t.propertyId)?.slug || '',
      photoUrl: t.photoR2Key ? `/api/storage/file/${t.photoR2Key}` : null,
    })),
  });
});

// PUT /api/operations/tickets/:id/status — Update Status Tiket & Opsional Catat Biaya Perbaikan ke Pengeluaran
operationsPublicRoutes.put(
  '/operations/tickets/:id/status',
  requireAuth,
  async (c) => {
    const auth = c.get('auth');
    const ticketId = c.req.param('id');
    const body = await c.req.json<{
      status?: 'open' | 'in_progress' | 'resolved';
      repairCostAmount?: number;
      repairCostNotes?: string;
    }>();

    const db = drizzle(c.env.DB);
    const [tkt] = await db
      .select()
      .from(maintenanceTickets)
      .where(eq(maintenanceTickets.id, ticketId))
      .limit(1);

    if (!tkt) {
      return c.json({ error: 'Tiket komplain tidak ditemukan.' }, 404);
    }

    const [prop] = await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.id, tkt.propertyId),
          eq(properties.orgId, auth.org.id)
        )
      )
      .limit(1);

    if (!prop) {
      return c.json({ error: 'Akses ditolak.' }, 403);
    }

    const now = new Date().toISOString();
    const targetStatus = body.status || 'resolved';
    let createdExpenseId = tkt.expenseId;

    // Jika ada biaya perbaikan yang diinput saat menyelesaikan tiket, otomatis catat ke tabel expenses!
    const repairCost = Number(body.repairCostAmount) || 0;
    if (repairCost > 0 && !tkt.expenseId) {
      createdExpenseId = createId('exp');
      await db.insert(expenses).values({
        id: createdExpenseId,
        propertyId: tkt.propertyId,
        recordedByUserId: auth.user.id,
        category: 'maintenance',
        title: `Perbaikan: ${tkt.title}`,
        amount: repairCost,
        expenseDate: now.slice(0, 10),
        notes: (
          body.repairCostNotes || `Dari tiket komplain ${tkt.reporterName}`
        ).trim(),
        createdAt: now,
      });
    }

    await db
      .update(maintenanceTickets)
      .set({
        status: targetStatus,
        expenseId: createdExpenseId,
        resolvedAt: targetStatus === 'resolved' ? now : null,
      })
      .where(eq(maintenanceTickets.id, ticketId));

    return c.json({
      ok: true,
      status: targetStatus,
      expenseId: createdExpenseId,
    });
  }
);

// ================= PUBLIC ENDPOINTS: KATALOG KOS (/kos/:slug) & LAPOR KERUSAKAN (/lapor/:slug) =================

// GET /api/public/kos/:slug — Data Publik untuk Katalog Kos & Form Lapor Kerusakan
operationsPublicRoutes.get('/public/kos/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = drizzle(c.env.DB);

  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.slug, slug))
    .limit(1);

  if (!prop) {
    return c.json({ error: 'Halaman kos tidak ditemukan.' }, 404);
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, prop.orgId))
    .limit(1);

  const [owner] = org
    ? await db
        .select({ name: users.name, phone: users.phone })
        .from(users)
        .where(eq(users.id, org.ownerId))
        .limit(1)
    : [];

  const propRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.propertyId, prop.id));

  return c.json({
    property: {
      id: prop.id,
      name: prop.name,
      slug: prop.slug,
      areaMalang: prop.areaMalang,
      address: prop.address,
      genderType: prop.genderType,
      rulesText: prop.rulesText,
      ownerName: owner?.name || 'Pengelola Kos',
      ownerPhone: owner?.phone || '081233445566',
    },
    rooms: propRooms.map((r) => {
      let facilities: string[] = [];
      try {
        facilities = JSON.parse(r.facilitiesJson);
      } catch {
        facilities = [];
      }
      return {
        id: r.id,
        roomNumber: r.roomNumber,
        floor: r.floor,
        typeName: r.typeName,
        facilities,
        status: r.status,
        priceMonthly: r.priceMonthly,
        priceQuarterly: r.priceQuarterly,
        priceSemester: r.priceSemester,
        priceYearly: r.priceYearly,
      };
    }),
  });
});

// POST /api/public/lapor/:slug — Penghuni Kirim Laporan Kerusakan Tanpa Login
operationsPublicRoutes.post('/public/lapor/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = drizzle(c.env.DB);

  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.slug, slug))
    .limit(1);

  if (!prop) {
    return c.json({ error: 'Properti kos tidak ditemukan.' }, 404);
  }

  const formData = await c.req.formData();
  const roomId = (formData.get('roomId') as string) || null;
  const reporterName = ((formData.get('reporterName') as string) || '').trim();
  const reporterWa = ((formData.get('reporterWa') as string) || '').trim();
  const title = ((formData.get('title') as string) || '').trim();
  const description = ((formData.get('description') as string) || '').trim();
  const priority =
    ((formData.get('priority') as 'low' | 'medium' | 'high') || 'medium');
  const file = formData.get('file');

  if (!reporterName || !reporterWa || !title || !description) {
    return c.json(
      { error: 'Nama pelapor, No. WA, judul masalah, dan detail keluhan wajib diisi.' },
      400
    );
  }

  let photoR2Key: string | null = null;
  if (file && file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: 'Ukuran foto maksimal 5 MB.' }, 400);
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    photoR2Key = `tickets/${prop.id}/${createId('tktimg')}.${ext}`;
    const buf = await file.arrayBuffer();
    await c.env.BUCKET.put(photoR2Key, buf, {
      httpMetadata: {
        contentType: file.type || 'image/webp',
      },
    });
  }

  const ticketId = createId('tkt');
  await db.insert(maintenanceTickets).values({
    id: ticketId,
    propertyId: prop.id,
    roomId: roomId && roomId !== 'general' ? roomId : null,
    reporterName,
    reporterWa,
    title,
    description,
    photoR2Key,
    priority,
    status: 'open',
    createdAt: new Date().toISOString(),
  });

  return c.json({ ok: true, ticketId });
});
