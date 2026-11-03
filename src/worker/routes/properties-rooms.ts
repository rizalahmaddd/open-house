import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import { properties, rooms, leases } from '../db/schema';
import { requireAuth, requireOwner } from '../middleware/auth';
import { checkPropertyQuota, checkRoomQuota } from '../middleware/plan-limit';
import { createId } from '../utils/crypto';
import type { Env, AppVariables } from '../types';

export const propertiesRoomsRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

// POST /api/properties — Tambah Cabang Kos Baru
propertiesRoomsRoutes.post(
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
      rulesText?: string;
      bankName?: string;
      bankAccountNumber?: string;
      bankAccountHolder?: string;
      qrisImageUrl?: string | null;
    }>();

    const name = (body.name || '').trim();
    if (!name) {
      return c.json({ error: 'Nama properti kos wajib diisi.' }, 400);
    }

    const slugBase = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${slugBase}-${Math.floor(100 + Math.random() * 900)}`;

    const propId = createId('prop');
    const db = drizzle(c.env.DB);

    await db.insert(properties).values({
      id: propId,
      orgId: auth.org.id,
      name,
      slug,
      areaMalang: (body.areaMalang || 'Jakarta Selatan - Setiabudi').trim(),
      address: (body.address || '').trim(),
      genderType: body.genderType || 'putra',
      rulesText: (body.rulesText || 'Tamu menginap wajib lapor pengurus kos.').trim(),
      bankName: (body.bankName || 'BCA').trim(),
      bankAccountNumber: (body.bankAccountNumber || '').trim(),
      bankAccountHolder: (body.bankAccountHolder || auth.user.name).trim(),
      qrisImageUrl: body.qrisImageUrl || null,
      isPublicCatalogEnabled: true,
      createdAt: new Date().toISOString(),
    });

    return c.json({ ok: true, propertyId: propId });
  }
);

// PUT /api/properties/:id — Update Pengaturan Kos, Rekening Bank & Gambar QRIS
propertiesRoomsRoutes.put(
  '/properties/:id',
  requireAuth,
  requireOwner,
  async (c) => {
    const auth = c.get('auth');
    const propId = c.req.param('id');
    const body = await c.req.json<{
      name?: string;
      areaMalang?: string;
      address?: string;
      genderType?: 'putra' | 'putri' | 'campur';
      rulesText?: string;
      bankName?: string;
      bankAccountNumber?: string;
      bankAccountHolder?: string;
      qrisImageUrl?: string | null;
      isPublicCatalogEnabled?: boolean;
    }>();

    const db = drizzle(c.env.DB);
    const [existing] = await db
      .select()
      .from(properties)
      .where(
        and(eq(properties.id, propId), eq(properties.orgId, auth.org.id))
      )
      .limit(1);

    if (!existing) {
      return c.json({ error: 'Properti kos tidak ditemukan.' }, 404);
    }

    await db
      .update(properties)
      .set({
        name: body.name !== undefined ? body.name.trim() : existing.name,
        areaMalang:
          body.areaMalang !== undefined
            ? body.areaMalang.trim()
            : existing.areaMalang,
        address:
          body.address !== undefined ? body.address.trim() : existing.address,
        genderType: body.genderType ?? existing.genderType,
        rulesText:
          body.rulesText !== undefined
            ? body.rulesText.trim()
            : existing.rulesText,
        bankName:
          body.bankName !== undefined ? body.bankName.trim() : existing.bankName,
        bankAccountNumber:
          body.bankAccountNumber !== undefined
            ? body.bankAccountNumber.trim()
            : existing.bankAccountNumber,
        bankAccountHolder:
          body.bankAccountHolder !== undefined
            ? body.bankAccountHolder.trim()
            : existing.bankAccountHolder,
        qrisImageUrl:
          body.qrisImageUrl !== undefined
            ? body.qrisImageUrl
            : existing.qrisImageUrl,
        isPublicCatalogEnabled:
          body.isPublicCatalogEnabled !== undefined
            ? body.isPublicCatalogEnabled
            : existing.isPublicCatalogEnabled,
      })
      .where(eq(properties.id, propId));

    return c.json({ ok: true });
  }
);

// POST /api/rooms — Tambah Kamar Baru (Multi-Siklus Harga)
propertiesRoomsRoutes.post(
  '/rooms',
  requireAuth,
  checkRoomQuota,
  async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json<{
      propertyId?: string;
      roomNumber?: string;
      floor?: number;
      typeName?: string;
      facilities?: string[];
      status?: 'available' | 'occupied' | 'maintenance';
      priceMonthly?: number;
      priceQuarterly?: number | null;
      priceSemester?: number | null;
      priceYearly?: number | null;
    }>();

    const propertyId = body.propertyId;
    const roomNumber = (body.roomNumber || '').trim();
    if (!propertyId || !roomNumber) {
      return c.json({ error: 'Lokasi kos dan nomor kamar wajib diisi.' }, 400);
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

    const priceMonthly = Number(body.priceMonthly) || 850000;
    const priceQuarterly =
      body.priceQuarterly !== undefined && body.priceQuarterly !== null
        ? Number(body.priceQuarterly)
        : Math.round(priceMonthly * 2.85);
    const priceSemester =
      body.priceSemester !== undefined && body.priceSemester !== null
        ? Number(body.priceSemester)
        : Math.round(priceMonthly * 5.5);
    const priceYearly =
      body.priceYearly !== undefined && body.priceYearly !== null
        ? Number(body.priceYearly)
        : Math.round(priceMonthly * 11);

    const roomId = createId('rm');
    await db.insert(rooms).values({
      id: roomId,
      propertyId,
      roomNumber,
      floor: Number(body.floor) || 1,
      typeName: (body.typeName || 'Reguler KM Dalam').trim(),
      facilitiesJson: JSON.stringify(
        body.facilities?.length
          ? body.facilities
          : ['Kasur', 'KM Dalam', 'Lemari', 'Meja Belajar', 'WiFi']
      ),
      status: body.status || 'available',
      priceMonthly,
      priceQuarterly,
      priceSemester,
      priceYearly,
      photosJson: '[]',
      createdAt: new Date().toISOString(),
    });

    return c.json({ ok: true, roomId });
  }
);

// PUT /api/rooms/:id — Edit Kamar & Siklus Harga / Status Kamar
propertiesRoomsRoutes.put('/rooms/:id', requireAuth, async (c) => {
  const auth = c.get('auth');
  const roomId = c.req.param('id');
  const body = await c.req.json<{
    roomNumber?: string;
    floor?: number;
    typeName?: string;
    facilities?: string[];
    status?: 'available' | 'occupied' | 'maintenance';
    priceMonthly?: number;
    priceQuarterly?: number | null;
    priceSemester?: number | null;
    priceYearly?: number | null;
  }>();

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

  await db
    .update(rooms)
    .set({
      roomNumber:
        body.roomNumber !== undefined ? body.roomNumber.trim() : rm.roomNumber,
      floor: body.floor !== undefined ? Number(body.floor) : rm.floor,
      typeName:
        body.typeName !== undefined ? body.typeName.trim() : rm.typeName,
      facilitiesJson:
        body.facilities !== undefined
          ? JSON.stringify(body.facilities)
          : rm.facilitiesJson,
      status: body.status ?? rm.status,
      priceMonthly:
        body.priceMonthly !== undefined
          ? Number(body.priceMonthly)
          : rm.priceMonthly,
      priceQuarterly:
        body.priceQuarterly !== undefined
          ? body.priceQuarterly
            ? Number(body.priceQuarterly)
            : null
          : rm.priceQuarterly,
      priceSemester:
        body.priceSemester !== undefined
          ? body.priceSemester
            ? Number(body.priceSemester)
            : null
          : rm.priceSemester,
      priceYearly:
        body.priceYearly !== undefined
          ? body.priceYearly
            ? Number(body.priceYearly)
            : null
          : rm.priceYearly,
    })
    .where(eq(rooms.id, roomId));

  return c.json({ ok: true });
});

// DELETE /api/rooms/:id — Hapus Kamar (Jika tidak ada kontrak aktif)
propertiesRoomsRoutes.delete('/rooms/:id', requireAuth, async (c) => {
  const auth = c.get('auth');
  const roomId = c.req.param('id');
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
    return c.json({ error: 'Akses ditolak.' }, 403);
  }

  const activeLease = await db
    .select()
    .from(leases)
    .where(and(eq(leases.roomId, roomId), eq(leases.status, 'active')))
    .limit(1);

  if (activeLease.length > 0) {
    return c.json(
      {
        error:
          'Kamar sedang dihuni kontrak sewa aktif. Lakukan Check-out penghuni terlebih dahulu sebelum menghapus kamar.',
      },
      400
    );
  }

  await db.delete(rooms).where(eq(rooms.id, roomId));
  return c.json({ ok: true });
});
