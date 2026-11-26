/**
 * Resolves relative `/api/...` paths so the app works identically:
 * - On Web / PWA: keeps relative `/api/...` paths on the same origin.
 * - Inside packaged Desktop (Electron) or Mobile (Capacitor) installers:
 *   uses `VITE_API_BASE_URL` (if configured at build time) or an optional
 *   `app_api_base_url` override stored in localStorage.
 */
export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const envBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (envBase) {
    return `${envBase}${normalizedPath}`;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const isPackagedShell =
      protocol === 'file:' ||
      protocol === 'capacitor:' ||
      protocol === 'ionic:' ||
      hostname === '127.0.0.1';

    if (isPackagedShell) {
      try {
        const storedBase = (window.localStorage.getItem('app_api_base_url') || '')
          .trim()
          .replace(/\/+$/, '');
        if (storedBase) {
          return `${storedBase}${normalizedPath}`;
        }
      } catch {
        // ignore storage errors
      }
    }
  }

  return normalizedPath;
}
