import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import {
  pullFactoryState,
  pushFactoryState,
  getDatabaseHealth,
  createQrLoginSessionDb,
  getQrLoginSessionDb,
  approveQrLoginSessionDb,
  consumeQrLoginSessionDb,
} from './lib/tursoDb.ts';
import { handleApiCors } from './lib/cors.ts';

const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  app.use('/api', (req, res, next) => {
    if (handleApiCors(req, res)) return;
    next();
  });
  app.use(express.json({ limit: '25mb' }));

  const resolvePublicOrigin = (req: express.Request): string => {
    const envUrl = String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
    if (envUrl) return envUrl;
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const proto = forwardedProto || req.protocol || 'https';
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000').trim();
    return `${proto}://${host}`;
  };

  app.get('/robots.txt', (req, res) => {
    const origin = resolvePublicOrigin(req);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(
      [
        'User-agent: *',
        'Allow: /',
        'Allow: /?catalog=1',
        'Disallow: /api/',
        'Disallow: /?qrcode=1',
        '',
        `Sitemap: ${origin}/sitemap.xml`,
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const origin = resolvePublicOrigin(req);
    const today = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${origin}/?catalog=1</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`);
  });

  app.get('/api/health', async (_req, res) => {
    try {
      const health = await getDatabaseHealth();
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(health);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Database health check failed';
      console.error('[Server /api/health] Error:', message);
      res.status(500).json({ ok: false, error: message });
    }
  });

  app.get('/api/sync', async (_req, res) => {
    try {
      const result = await pullFactoryState();
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Database pull failed';
      console.error('[Server GET /api/sync] Error:', message);
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/sync', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const body = (req.body || {}) as Record<string, unknown>;
      const action = String(body.action || 'PULL').toUpperCase();

      if (action === 'STATUS' || action === 'HEALTH') {
        const health = await getDatabaseHealth();
        return res.status(200).json({ success: true, ...health });
      }

      if (action === 'PULL') {
        const result = await pullFactoryState();
        return res.status(200).json(result);
      }

      if (action === 'PUSH') {
        const payload = (body.data || {}) as Record<string, unknown>;
        const actor = body.actor ? String(body.actor) : 'system';
        const result = await pushFactoryState(payload, actor);
        return res.status(200).json(result);
      }

      return res.status(400).json({ success: false, error: `Unsupported action: ${action}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Database sync failed';
      console.error('[Server POST /api/sync] Error:', message);
      return res.status(500).json({ success: false, error: message });
    }
  });

  app.get('/api/qr-login', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const sessionId = String(req.query.sessionId || '').trim();
      if (!sessionId) {
        return res.status(400).json({ success: false, error: 'Missing sessionId' });
      }
      const session = await getQrLoginSessionDb(sessionId);
      return res.status(200).json({ success: true, session });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'QR login query failed';
      return res.status(500).json({ success: false, error: message });
    }
  });

  app.post('/api/qr-login', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const body = (req.body || {}) as Record<string, unknown>;
      const action = String(body.action || '').toUpperCase();

      if (action === 'CREATE') {
        const session = await createQrLoginSessionDb({
          sessionId: String(body.sessionId || ''),
          deviceLabel: body.deviceLabel ? String(body.deviceLabel) : undefined,
          expiresAt: Number(body.expiresAt) || Date.now() + 180_000,
          createdAt: body.createdAt ? String(body.createdAt) : undefined,
        });
        return res.status(200).json({ success: true, session });
      }

      if (action === 'APPROVE') {
        const targetAction = body.targetAction === 'LOGOUT_TO_LOGIN' ? 'LOGOUT_TO_LOGIN' : 'LOGIN_QRCODE';
        const approvedBy = (body.approvedBy || {}) as {
          username: string;
          fullName: string;
          role: string;
          employeeId?: string;
          department?: string;
        };
        const session = await approveQrLoginSessionDb({
          sessionId: String(body.sessionId || ''),
          targetAction,
          approvedBy,
        });
        return res.status(200).json({ success: true, session });
      }

      if (action === 'CONSUME') {
        await consumeQrLoginSessionDb(String(body.sessionId || ''));
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ success: false, error: `Unsupported action: ${action}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'QR login operation failed';
      return res.status(400).json({ success: false, error: message });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ...(disableHmr ? { hmr: false, ws: false } : { ws: { server: httpServer } }),
      },
      appType: 'spa',
    });

    app.get('/@vite/client', async (_req, res, next) => {
      try {
        if (disableHmr || vite.config.server.hmr === false) {
          const transformed = await vite.transformRequest('/@vite/client');
          if (transformed?.code) {
            const patched = transformed.code.replace(
              /const transport = normalizeModuleRunnerTransport\(\(\(\) => \{[\s\S]*?\}\)\(\)\);/,
              'const transport = normalizeModuleRunnerTransport({ async connect() {}, async disconnect() {}, send() {} }); /* HMR WebSocket disabled */'
            );
            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader('Cache-Control', 'no-store');
            return res.status(200).send(patched);
          }
        }
      } catch {
        // Fall through to Vite middleware
      }
      return next();
    });

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Newprotec Vina V2.0 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
