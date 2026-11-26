export interface CorsRequestLike {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}

export interface CorsResponseLike {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => CorsResponseLike;
  json: (payload: unknown) => void;
  end?: () => void;
}

function getHeaderValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  key: string
): string {
  if (!headers) return '';
  const direct = headers[key] ?? headers[key.toLowerCase()];
  if (Array.isArray(direct)) return String(direct[0] || '').trim();
  return String(direct || '').trim();
}

export function isAllowedCorsOrigin(origin: string, hostHeader?: string): boolean {
  if (!origin) return false;

  const trimmed = origin.trim();
  if (!trimmed || trimmed === 'null') {
    // Allow packaged Electron file:// origins that report "null" only when explicitly needed?
    // Better: deny "null" or allow only known schemes; Electron main.cjs can load http/file,
    // while Capacitor & local shells use explicit localhost/capacitor origins.
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();

  // Same host
  if (hostHeader && parsed.host.toLowerCase() === hostHeader.toLowerCase()) {
    return true;
  }

  // Packaged Mobile (Capacitor / Ionic) & Localhost Desktop Dev/Shells
  if (
    (protocol === 'capacitor:' || protocol === 'ionic:') &&
    hostname === 'localhost'
  ) {
    return true;
  }
  if (
    (protocol === 'https:' || protocol === 'http:') &&
    (hostname === 'localhost' || hostname === '127.0.0.1')
  ) {
    return true;
  }

  // Vercel preview/production deployments
  if (protocol === 'https:' && hostname.endsWith('.vercel.app')) {
    return true;
  }

  // Configured APP_URL or explicit ALLOWED_CORS_ORIGINS
  const envOriginsRaw = [
    process.env.APP_URL || '',
    process.env.ALLOWED_CORS_ORIGINS || '',
  ]
    .filter(Boolean)
    .join(',');

  if (envOriginsRaw) {
    const allowedList = envOriginsRaw
      .split(',')
      .map((item) => item.trim().replace(/\/+$/, '').toLowerCase())
      .filter(Boolean);
    const normalizedOrigin = `${protocol}//${parsed.host}`.toLowerCase();
    if (allowedList.includes(normalizedOrigin)) {
      return true;
    }
  }

  return false;
}

/**
 * Applies explicit origin-checked CORS headers (never wildcard `*`).
 * Returns true if the request was an OPTIONS preflight and already handled.
 */
export function handleApiCors(req: CorsRequestLike, res: CorsResponseLike): boolean {
  const origin = getHeaderValue(req.headers, 'origin');
  const host = getHeaderValue(req.headers, 'x-forwarded-host') || getHeaderValue(req.headers, 'host');

  if (origin && isAllowedCorsOrigin(origin, host)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') {
    const statusRes = res.status(204);
    if (typeof statusRes.end === 'function') {
      statusRes.end();
    } else {
      statusRes.json({ ok: true });
    }
    return true;
  }

  return false;
}
