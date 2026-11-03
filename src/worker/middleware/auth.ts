import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import {
  sessions,
  users,
  organizations,
  organizationMembers,
} from '../db/schema';
import type { Env, AppVariables } from '../types';

export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const cookieToken = getCookie(c, 'jk_session');
  const authHeader = c.req.header('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : undefined;

  const sessionId = bearerToken || cookieToken;
  if (!sessionId) {
    return c.json({ error: 'Sesi tidak ditemukan. Silakan login kembali.' }, 401);
  }

  const db = drizzle(c.env.DB);

  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const session = sessionRows[0];
  if (!session || new Date(session.expiresAt) < new Date()) {
    return c.json({ error: 'Sesi telah berakhir. Silakan login kembali.' }, 401);
  }

  const [userRow] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const [orgRow] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.orgId))
    .limit(1);

  const [memberRow] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, session.orgId),
        eq(organizationMembers.userId, session.userId)
      )
    )
    .limit(1);

  if (!userRow || !orgRow || !memberRow) {
    return c.json({ error: 'Akun atau organisasi tidak valid.' }, 401);
  }

  let parsedAssignedIds: string[] = ['*'];
  try {
    parsedAssignedIds = JSON.parse(memberRow.assignedPropertyIds);
  } catch {
    parsedAssignedIds = ['*'];
  }

  c.set('auth', {
    user: {
      id: userRow.id,
      name: userRow.name,
      phone: userRow.phone,
      email: userRow.email,
    },
    org: {
      id: orgRow.id,
      name: orgRow.name,
      planTier: orgRow.planTier,
      maxRooms: orgRow.maxRooms,
      maxProperties: orgRow.maxProperties,
    },
    member: {
      id: memberRow.id,
      role: memberRow.role,
      assignedPropertyIds: parsedAssignedIds,
    },
  });

  await next();
});

export const requireOwner = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const auth = c.get('auth');
  if (!auth || auth.member.role !== 'owner') {
    return c.json(
      {
        error:
          'Akses ditolak. Fitur ini hanya untuk Pemilik Kos (tidak tersedia untuk Penjaga Kos).',
      },
      403
    );
  }
  await next();
});
