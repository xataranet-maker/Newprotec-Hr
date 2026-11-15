import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { pullFactoryState, pushFactoryState, getDatabaseHealth } from './lib/tursoDb.ts';

const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  app.use(express.json({ limit: '25mb' }));

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

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
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
