const API_BASE_STORAGE_KEY = 'app_api_base_url';

export function isPackagedAppShell(): boolean {
  if (typeof window === 'undefined') return false;
  const { protocol, hostname, port } = window.location;
  const win = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean };
  };
  const isCapacitorNative = Boolean(win.Capacitor?.isNativePlatform?.());
  const isElectronUa =
    typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

  return (
    isCapacitorNative ||
    isElectronUa ||
    protocol === 'file:' ||
    protocol === 'capacitor:' ||
    protocol === 'ionic:' ||
    hostname === '127.0.0.1' ||
    (hostname === 'localhost' && port === '')
  );
}

export function getConfiguredApiBaseUrl(): string {
  const envBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (envBase) return envBase;

  if (typeof window !== 'undefined') {
    try {
      const storedBase = (window.localStorage.getItem(API_BASE_STORAGE_KEY) || '')
        .trim()
        .replace(/\/+$/, '');
      if (storedBase) return storedBase;
    } catch {
      // ignore storage errors
    }
  }
  return '';
}

export function setConfiguredApiBaseUrl(url: string): string {
  const normalized = url.trim().replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    try {
      if (normalized) {
        window.localStorage.setItem(API_BASE_STORAGE_KEY, normalized);
      } else {
        window.localStorage.removeItem(API_BASE_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }
  return normalized;
}

/**
 * Resolves relative `/api/...` paths so the app works identically:
 * - On Web / PWA: keeps relative `/api/...` paths on the same origin.
 * - Inside packaged Desktop (Electron) or Mobile (Capacitor) installers:
 *   uses `VITE_API_BASE_URL` (if configured at build time) or an optional
 *   `app_api_base_url` override stored in localStorage.
 */
export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getConfiguredApiBaseUrl();
  if (base) {
    return `${base}${normalizedPath}`;
  }
  return normalizedPath;
}
