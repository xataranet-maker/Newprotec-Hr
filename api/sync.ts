import { pullFactoryState, pushFactoryState, getDatabaseHealth } from '../lib/tursoDb.ts';

interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

function parseBody(rawBody: unknown): Record<string, unknown> {
  if (!rawBody) return {};
  if (typeof rawBody === 'string') {
    try {
      return JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof rawBody === 'object') {
    return rawBody as Record<string, unknown>;
  }
  return {};
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      const result = await pullFactoryState();
      return res.status(200).json(result);
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const body = parseBody(req.body);
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
    console.error('[API /api/sync] Error:', message);
    return res.status(500).json({ success: false, error: message });
  }
}
