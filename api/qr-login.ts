import {
  createQrLoginSessionDb,
  getQrLoginSessionDb,
  approveQrLoginSessionDb,
  consumeQrLoginSessionDb,
} from '../lib/tursoDb.ts';

interface ApiRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
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
      const rawId = req.query?.sessionId;
      const sessionId = String(Array.isArray(rawId) ? rawId[0] : rawId || '').trim();
      if (!sessionId) {
        return res.status(400).json({ success: false, error: 'Missing sessionId' });
      }
      const session = await getQrLoginSessionDb(sessionId);
      return res.status(200).json({ success: true, session });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const body = parseBody(req.body);
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
      const targetAction =
        body.targetAction === 'LOGOUT_TO_LOGIN' ? 'LOGOUT_TO_LOGIN' : 'LOGIN_ADMIN';
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
}
