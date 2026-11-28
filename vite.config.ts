import fs from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname || '.', 'package.json'), 'utf8'));
    if (pkg.version && pkg.version !== '0.0.0') return String(pkg.version);
  } catch {
    // ignore
  }
  return '2.2.0';
}

function appVersionManifestPlugin(version: string, buildId: string, builtAt: string): Plugin {
  const payload = JSON.stringify({ version, buildId, builtAt }, null, 2);
  return {
    name: 'app-version-manifest',
    configureServer(server) {
      server.middlewares.use('/app-version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(payload);
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'app-version.json',
        source: payload,
      });
    },
  };
}

export default defineConfig(() => {
  const appVersion = readPackageVersion();
  const builtAt = new Date().toISOString();
  const buildId = `${appVersion}-${builtAt.replace(/[-:.TZ]/g, '').slice(0, 14)}`;

  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_BUILD_ID__: JSON.stringify(buildId),
    },
    plugins: [
      react(),
      tailwindcss(),
      appVersionManifestPlugin(appVersion, buildId, builtAt),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'app-logo.png'],
        manifest: {
          id: '/',
          name: 'Newprotec Vina V2.0 - Quản Lý Sản Xuất',
          short_name: 'Newprotec V2',
          description: 'Hệ thống quản lý sản xuất MES/ERP Newprotec Vina V2.0 với đầy đủ các phân hệ Multi Auto, Stiff, Dập Tự Động, Khuôn & Jig, Thiết Bị, Hành Chính Nhân Sự.',
          theme_color: '#020617',
          background_color: '#020617',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: `/pwa-192x192.png?v=${appVersion}`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `/pwa-512x512.png?v=${appVersion}`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `/pwa-maskable-512x512.png?v=${appVersion}`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          globIgnores: ['**/app-version.json'],
          ignoreURLParametersMatching: [/^v$/],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MiB
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/robots\.txt$/,
            /^\/sitemap\.xml$/,
            /^\/app-version\.json$/,
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
