import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, inArray } from 'drizzle-orm';
import {
  organizations,
  properties,
  rooms,
  tenants,
  invoices,
  expenses,
  maintenanceTickets,
  organizationMembers,
} from '../db/schema';
import { requireAuth, requireOwner } from '../middleware/auth';
import { checkPropertyQuota, checkRoomQuota } from '../middleware/plan-limit';
import { createId } from '../utils/crypto';
import type { Env, AppVariables } from '../types';

export const orgRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

// GET /api/org/overview
orgRoutes.get('/overview', requireAuth, async (c) => {
  const auth = c.get('auth');
  const db = drizzle(c.env.DB);
  const selectedPropertyId = c.req.query('propertyId');

  const allOrgProps = await db
    .select()
    .from(properties)
    .where(eq(properties.orgId, auth.org.id));

  // Filter properties for staff if assigned specific property IDs
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

  const allOrgPropIds = allOrgProps.map((p) => p.id);

  // Total rooms across entire org for Freemium quota bar
  const allOrgRooms =
    allOrgPropIds.length > 0
      ? await db
          .select()
          .from(rooms)
          .where(inArray(rooms.propertyId, allOrgPropIds))
      : [];

  // Filtered rooms for current view
  const viewRooms =
    activePropIds.length > 0
      ? allOrgRooms.filter((r) => activePropIds.includes(r.propertyId))
      : [];

  const viewInvoices =
    activePropIds.length > 0
      ? await db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            dueDate: invoices.dueDate,
            totalAmount: invoices.totalAmount,
            paidAmount: invoices.paidAmount,
            status: invoices.status,
            notes: invoices.notes,
            tenantName: tenants.fullName,
            tenantPhone: tenants.phoneWa,
            propertyId: invoices.propertyId,
          })
          .from(invoices)
          .innerJoin(tenants, eq(invoices.tenantId, tenants.id))
          .where(inArray(invoices.propertyId, activePropIds))
      : [];

  const viewTickets =
    activePropIds.length > 0
      ? await db
          .select()
          .from(maintenanceTickets)
          .where(inArray(maintenanceTickets.propertyId, activePropIds))
      : [];

  const membersCountRows = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.orgId, auth.org.id));

  // Owner-only financial metrics (Penjaga Kos TIDAK boleh melihat total omzet & laba bersih)
  let financials: {
    totalRevenuePaid: number;
    totalUnpaidReceivables: number;
    totalExpenses: number;
    netCashflow: number;
    recentExpenses: typeof viewExpenses;
  } | null = null;

  let viewExpenses: Array<{
    id: string;
    title: string;
    category: string;
    amount: number;
    expenseDate: string;
  }> = [];

  if (activePropIds.length > 0) {
    viewExpenses = await db
      .select({
        id: expenses.id,
        title: expenses.title,
        category: expenses.category,
        amount: expenses.amount,
        expenseDate: expenses.expenseDate,
      })
      .from(expenses)
      .where(inArray(expenses.propertyId, activePropIds));
  }

  if (auth.member.role === 'owner') {
    const totalRevenuePaid = viewInvoices
      .filter((inv) => inv.status === 'paid' || inv.status === 'partial')
      .reduce((sum, inv) => sum + inv.paidAmount, 0);

    const totalUnpaidReceivables = viewInvoices
      .filter((inv) => inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

    const totalExpenses = viewExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    financials = {
      totalRevenuePaid,
      totalUnpaidReceivables,
      totalExpenses,
      netCashflow: totalRevenuePaid - totalExpenses,
      recentExpenses: viewExpenses,
    };
  }

  return c.json({
    org: auth.org,
    role: auth.member.role,
    quota: {
      roomsUsed: allOrgRooms.length,
      maxRooms: auth.org.maxRooms,
      propertiesUsed: allOrgProps.length,
      maxProperties: auth.org.maxProperties,
      staffCount: membersCountRows.filter((m) => m.role === 'staff').length,
    },
    properties: accessibleProps,
    roomSummary: {
      total: viewRooms.length,
      occupied: viewRooms.filter((r) => r.status === 'occupied').length,
      available: viewRooms.filter((r) => r.status === 'available').length,
      maintenance: viewRooms.filter((r) => r.status === 'maintenance').length,
      rooms: viewRooms,
    },
    invoices: viewInvoices,
    tickets: viewTickets,
    financials, // null if staff!
  });
});

// POST /api/org/plan — Simulasi Upgrade / Downgrade Paket SaaS (Owner Only)
orgRoutes.post('/plan', requireAuth, requireOwner, async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json<{ planTier: 'free' | 'pro' }>();
  const targetTier = body.planTier === 'pro' ? 'pro' : 'free';

  const db = drizzle(c.env.DB);
  const maxRooms = targetTier === 'pro' ? 9999 : 10;
  const maxProperties = targetTier === 'pro' ? 99 : 1;

  await db
    .update(organizations)
    .set({
      planTier: targetTier,
      maxRooms,
      maxProperties,
      planExpiresAt:
        targetTier === 'pro'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null,
    })
    .where(eq(organizations.id, auth.org.id));

  return c.json({
    ok: true,
    planTier: targetTier,
    maxRooms,
    maxProperties,
  });
});

// POST /api/org/properties — Tambah Cabang Kos Baru di Malang (Dibatasi checkPropertyQuota)
orgRoutes.post(
  '/properties',
  requireAuth,
  requireOwner,
  checkPropertyQuota,
  async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json<{
      name?: string;
      areaMalang?: string;
      address?: string;
      genderType?: 'putra' | 'putri' | 'campur';
    }>();

    const name = (body.name || '').trim();
    const areaMalang = (body.areaMalang || 'Sigura-gura - Sumbersari').trim();
    const address = (body.address || `Kawasan ${areaMalang}, Kota Malang`).trim();
    const genderType = body.genderType || 'putri';

    if (!name) {
      return c.json({ error: 'Nama cabang kos wajib diisi.' }, 400);
    }

    const slugBase = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${slugBase}-${Math.floor(100 + Math.random() * 900)}`;

    const db = drizzle(c.env.DB);
    const propId = createId('prop');
    const now = new Date().toISOString();

    await db.insert(properties).values({
      id: propId,
      orgId: auth.org.id,
      name,
      slug,
      areaMalang,
      address,
      genderType,
      rulesText: 'Tamu wajib lapor. Jaga ketertiban lingkungan.',
      bankName: 'BCA',
      bankAccountNumber: '',
      bankAccountHolder: auth.user.name,
      isPublicCatalogEnabled: true,
      createdAt: now,
    });

    return c.json({ ok: true, propertyId: propId });
  }
);

// POST /api/org/rooms — Tambah Kamar Kos (Dibatasi checkRoomQuota: maks 10 kamar di paket Free)
orgRoutes.post('/rooms', requireAuth, checkRoomQuota, async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json<{
    propertyId?: string;
    roomNumber?: string;
    floor?: number;
    typeName?: string;
    priceMonthly?: number;
    priceSemester?: number;
    priceYearly?: number;
  }>();

  const propertyId = body.propertyId;
  const roomNumber = (body.roomNumber || '').trim();
  const floor = Number(body.floor) || 1;
  const typeName = (body.typeName || 'Reguler KM Dalam').trim();
  const priceMonthly = Number(body.priceMonthly) || 850000;
  const priceSemester = body.priceSemester ? Number(body.priceSemester) : priceMonthly * 5.5;
  const priceYearly = body.priceYearly ? Number(body.priceYearly) : priceMonthly * 11;

  if (!propertyId || !roomNumber) {
    return c.json({ error: 'Pilih lokasi kos dan isi nomor kamar.' }, 400);
  }

  const db = drizzle(c.env.DB);
  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);

  if (!prop || prop.orgId !== auth.org.id) {
    return c.json({ error: 'Properti kos tidak ditemukan.' }, 404);
  }

  const roomId = createId('rm');
  await db.insert(rooms).values({
    id: roomId,
    propertyId,
    roomNumber,
    floor,
    typeName,
    facilitiesJson: '["Kasur","KM Dalam","Lemari","Meja Belajar","WiFi"]',
    status: 'available',
    priceMonthly,
    priceQuarterly: Math.round(priceMonthly * 2.85),
    priceSemester: Math.round(priceSemester),
    priceYearly: Math.round(priceYearly),
    photosJson: '[]',
    createdAt: new Date().toISOString(),
  });

  return c.json({ ok: true, roomId });
});
