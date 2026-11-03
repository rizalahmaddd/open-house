import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import {
  users,
  sessions,
  organizations,
  organizationMembers,
  properties,
} from '../db/schema';
import { createId, hashPassword, verifyPassword } from '../utils/crypto';
import { requireAuth, requireOwner } from '../middleware/auth';
import { checkStaffQuota } from '../middleware/plan-limit';
import { ensureDemoMalangData } from '../db/seed-malang';
import type { Env, AppVariables } from '../types';

export const authRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

// Helper to create session & set cookie
async function createUserSession(
  d1: D1Database,
  userId: string,
  orgId: string
): Promise<string> {
  const db = drizzle(d1);
  const sessionId = createId('ses');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    orgId,
    expiresAt,
    createdAt: now.toISOString(),
  });

  return sessionId;
}

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password) {
    return c.json({ error: 'Email dan password wajib diisi.' }, 400);
  }

  // Ensure demo data exists if logging in with demo account
  if (email === 'juragan@malangkos.id' || email === 'penjaga@malangkos.id') {
    await ensureDemoMalangData(c.env.DB);
  }

  const db = drizzle(c.env.DB);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return c.json({ error: 'Email atau password salah.' }, 401);
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return c.json({ error: 'Email atau password salah.' }, 401);
  }

  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, user.id))
    .limit(1);

  if (!membership) {
    return c.json({ error: 'Akun tidak terhubung ke kos manapun.' }, 403);
  }

  const sessionId = await createUserSession(c.env.DB, user.id, membership.orgId);

  setCookie(c, 'jk_session', sessionId, {
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.json({
    token: sessionId,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
    role: membership.role,
  });
});

// POST /api/auth/register (Daftar Akun Pemilik Kos Baru)
authRoutes.post('/register', async (c) => {
  const body = await c.req.json<{
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    kosName?: string;
    areaMalang?: string;
    genderType?: 'putra' | 'putri' | 'campur';
  }>();

  const name = (body.name || '').trim();
  const phone = (body.phone || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const firstName = name.split(' ')[0] || 'Saya';
  const kosName = (body.kosName || '').trim() || `Kos ${firstName}`;
  const areaMalang = (body.areaMalang || 'Jakarta Selatan - Setiabudi / Kuningan').trim();
  const genderType = body.genderType || 'campur';

  if (!name || !email || !password) {
    return c.json({ error: 'Nama, email, dan password wajib diisi.' }, 400);
  }

  if (password.length < 6) {
    return c.json({ error: 'Password minimal 6 karakter.' }, 400);
  }

  const db = drizzle(c.env.DB);
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: 'Email sudah terdaftar. Silakan login.' }, 409);
  }

  const now = new Date().toISOString();
  const userId = createId('usr');
  const orgId = createId('org');
  const memberId = createId('mem');
  const propId = createId('prop');
  const passwordHash = await hashPassword(password);

  const slugBase = kosName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'kos';
  const slug = `${slugBase}-${Math.floor(100 + Math.random() * 900)}`;

  await db.insert(users).values({
    id: userId,
    name,
    phone: phone || '-',
    email,
    passwordHash,
    createdAt: now,
  });

  await db.insert(organizations).values({
    id: orgId,
    ownerId: userId,
    name: kosName,
    planTier: 'free',
    maxRooms: 10,
    maxProperties: 1,
    createdAt: now,
  });

  await db.insert(organizationMembers).values({
    id: memberId,
    orgId,
    userId,
    role: 'owner',
    assignedPropertyIds: '["*"]',
    createdAt: now,
  });

  await db.insert(properties).values({
    id: propId,
    orgId,
    name: kosName,
    slug,
    areaMalang,
    address: `Kawasan ${areaMalang}`,
    genderType,
    rulesText: 'Tamu menginap wajib lapor pengurus kos. Jaga kebersihan dan ketertiban bersama.',
    bankName: 'BCA',
    bankAccountNumber: '',
    bankAccountHolder: name,
    isPublicCatalogEnabled: true,
    createdAt: now,
  });

  const sessionId = await createUserSession(c.env.DB, userId, orgId);

  setCookie(c, 'jk_session', sessionId, {
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.json({
    token: sessionId,
    user: { id: userId, name, email, phone },
    role: 'owner',
  });
});

// POST /api/auth/logout
authRoutes.post('/logout', async (c) => {
  const cookieToken = getCookie(c, 'jk_session');
  const authHeader = c.req.header('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : undefined;
  const sessionId = bearerToken || cookieToken;

  if (sessionId) {
    const db = drizzle(c.env.DB);
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  deleteCookie(c, 'jk_session', { path: '/' });
  return c.json({ ok: true });
});

// GET /api/auth/me
authRoutes.get('/me', requireAuth, async (c) => {
  const auth = c.get('auth');
  return c.json(auth);
});

// GET /api/auth/staff — Daftar Pemilik & Penjaga Kos (Owner Only)
authRoutes.get('/staff', requireAuth, requireOwner, async (c) => {
  const auth = c.get('auth');
  const db = drizzle(c.env.DB);

  const rows = await db
    .select({
      memberId: organizationMembers.id,
      role: organizationMembers.role,
      assignedPropertyIds: organizationMembers.assignedPropertyIds,
      createdAt: organizationMembers.createdAt,
      userId: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.orgId, auth.org.id));

  return c.json({
    members: rows.map((r) => ({
      ...r,
      assignedPropertyIds: (() => {
        try {
          return JSON.parse(r.assignedPropertyIds);
        } catch {
          return ['*'];
        }
      })(),
    })),
  });
});

// POST /api/auth/staff — Tambah Akun Penjaga Kos (Owner Only + Pro Plan Limit)
authRoutes.post(
  '/staff',
  requireAuth,
  requireOwner,
  checkStaffQuota,
  async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json<{
      name?: string;
      phone?: string;
      email?: string;
      password?: string;
      assignedPropertyIds?: string[];
    }>();

    const name = (body.name || '').trim();
    const phone = (body.phone || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const assignedPropertyIds = body.assignedPropertyIds?.length
      ? body.assignedPropertyIds
      : ['*'];

    if (!name || !phone || !email || !password) {
      return c.json(
        { error: 'Nama, No WA, Email, dan Password penjaga kos wajib diisi.' },
        400
      );
    }

    const db = drizzle(c.env.DB);
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: 'Email sudah digunakan oleh akun lain.' }, 409);
    }

    const now = new Date().toISOString();
    const userId = createId('usr');
    const memberId = createId('mem');
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      id: userId,
      name,
      phone,
      email,
      passwordHash,
      createdAt: now,
    });

    await db.insert(organizationMembers).values({
      id: memberId,
      orgId: auth.org.id,
      userId,
      role: 'staff',
      assignedPropertyIds: JSON.stringify(assignedPropertyIds),
      createdAt: now,
    });

    return c.json({
      member: {
        memberId,
        userId,
        name,
        phone,
        email,
        role: 'staff',
        assignedPropertyIds,
        createdAt: now,
      },
    });
  }
);

// DELETE /api/auth/staff/:memberId — Hapus Akun Penjaga Kos (Owner Only)
authRoutes.delete('/staff/:memberId', requireAuth, requireOwner, async (c) => {
  const auth = c.get('auth');
  const memberId = c.req.param('memberId');
  const db = drizzle(c.env.DB);

  const [target] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.id, memberId),
        eq(organizationMembers.orgId, auth.org.id)
      )
    )
    .limit(1);

  if (!target) {
    return c.json({ error: 'Data staf penjaga tidak ditemukan.' }, 404);
  }

  if (target.role === 'owner') {
    return c.json({ error: 'Akun pemilik utama tidak dapat dihapus.' }, 400);
  }

  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.id, memberId));
  await db.delete(users).where(eq(users.id, target.userId));

  return c.json({ ok: true });
});
