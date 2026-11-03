import { createMiddleware } from 'hono/factory';
import { drizzle } from 'drizzle-orm/d1';
import { eq, inArray, count } from 'drizzle-orm';
import { properties, rooms, organizationMembers } from '../db/schema';
import type { Env, AppVariables } from '../types';

export const checkPropertyQuota = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const auth = c.get('auth');
  if (auth.org.planTier === 'pro') {
    await next();
    return;
  }

  const db = drizzle(c.env.DB);
  const [{ value: propCount }] = await db
    .select({ value: count() })
    .from(properties)
    .where(eq(properties.orgId, auth.org.id));

  if (propCount >= auth.org.maxProperties) {
    return c.json(
      {
        error: `Paket Gratis maksimal ${auth.org.maxProperties} lokasi kos. Upgrade ke OpenHouse Pro untuk tambah cabang kos baru.`,
        code: 'PLAN_LIMIT_PROPERTIES',
      },
      403
    );
  }

  await next();
});

export const checkRoomQuota = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const auth = c.get('auth');
  if (auth.org.planTier === 'pro') {
    await next();
    return;
  }

  const db = drizzle(c.env.DB);
  const orgProps = await db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.orgId, auth.org.id));

  const propIds = orgProps.map((p) => p.id);
  let roomCount = 0;

  if (propIds.length > 0) {
    const [{ value }] = await db
      .select({ value: count() })
      .from(rooms)
      .where(inArray(rooms.propertyId, propIds));
    roomCount = value;
  }

  if (roomCount >= auth.org.maxRooms) {
    return c.json(
      {
        error: `Kuota Paket Gratis penuh (${roomCount}/${auth.org.maxRooms} kamar). Upgrade ke OpenHouse Pro untuk unlimited kamar.`,
        code: 'PLAN_LIMIT_ROOMS',
      },
      403
    );
  }

  await next();
});

export const checkStaffQuota = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const auth = c.get('auth');
  if (auth.org.planTier !== 'pro') {
    return c.json(
      {
        error:
          'Penambahan akun Penjaga Kos hanya tersedia di Paket OpenHouse Pro.',
        code: 'PLAN_LIMIT_STAFF',
      },
      403
    );
  }

  const db = drizzle(c.env.DB);
  const members = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.orgId, auth.org.id));

  if (members.length >= 10) {
    return c.json(
      { error: 'Maksimal 10 akun staf per organisasi.' },
      403
    );
  }

  await next();
});
