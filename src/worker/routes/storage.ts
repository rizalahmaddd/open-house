import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { createId } from '../utils/crypto';
import type { Env, AppVariables } from '../types';

export const storageRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

// POST /api/storage/upload — Upload file (WebP/JPEG/PNG/PDF) ke Cloudflare R2
storageRoutes.post('/upload', requireAuth, async (c) => {
  const auth = c.get('auth');
  const formData = await c.req.formData();
  const file = formData.get('file');
  const folder = (formData.get('folder') as string) || 'general';

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'File tidak ditemukan.' }, 400);
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'Ukuran file maksimal 5 MB.' }, 400);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, '');
  const r2Key = `${auth.org.id}/${safeFolder}/${createId('file')}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  await c.env.BUCKET.put(r2Key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type || 'image/webp',
    },
  });

  return c.json({
    ok: true,
    key: r2Key,
    url: `/api/storage/file/${r2Key}`,
  });
});

// GET /api/storage/file/:key — Stream file dari Cloudflare R2
storageRoutes.get('/file/*', async (c) => {
  const key = c.req.path.replace(/^\/api\/storage\/file\//, '');
  if (!key) {
    return c.json({ error: 'Key tidak valid.' }, 400);
  }

  const object = await c.env.BUCKET.get(key);
  if (!object) {
    return c.json({ error: 'File tidak ditemukan atau telah dihapus.' }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, {
    headers,
  });
});
