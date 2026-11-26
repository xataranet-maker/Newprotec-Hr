import { getDatabaseHealth } from '../lib/tursoDb.ts';
import { handleApiCors } from '../lib/cors.ts';

interface ApiRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end?: () => void;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (handleApiCors(req, res)) return;

  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const health = await getDatabaseHealth();
    return res.status(200).json(health);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database health check failed';
    console.error('[API /api/health] Error:', message);
    return res.status(500).json({ ok: false, error: message });
  }
}
