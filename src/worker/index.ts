import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { orgRoutes } from './routes/organization';
import { storageRoutes } from './routes/storage';
import { propertiesRoomsRoutes } from './routes/properties-rooms';
import { tenantsLeasesRoutes } from './routes/tenants-leases';
import { invoicesRoutes, processDailyBillingCron } from './routes/invoices';
import { operationsPublicRoutes } from './routes/operations-public';
import { ensureDemoMalangData } from './db/seed-malang';
import type { Env, AppVariables } from './types';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use('/api/*', cors({ origin: '*', credentials: true }));

app.get('/api/health', async (c) => {
  return c.json({
    status: 'ok',
    service: 'OpenHouse Edge API (openhouse.my.id)',
    timestamp: new Date().toISOString(),
  });
});

// Seed endpoint for quick demo reset/initialization
app.post('/api/seed-demo', async (c) => {
  const res = await ensureDemoMalangData(c.env.DB);
  return c.json({ ok: true, ...res });
});

app.route('/api/auth', authRoutes);
app.route('/api/org', orgRoutes);
app.route('/api/storage', storageRoutes);
app.route('/api', propertiesRoomsRoutes);
app.route('/api/tenants-leases', tenantsLeasesRoutes);
app.route('/api/invoices', invoicesRoutes);
app.route('/api', operationsPublicRoutes);

// Fallback to static assets for single-page-application (SPA) client routing
app.notFound(async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Not Found', 404);
});

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    // Fase 3: Cron job harian pengecekan jatuh tempo tagihan sewa kos Malang
    ctx.waitUntil(processDailyBillingCron(env.DB));
  },
};
