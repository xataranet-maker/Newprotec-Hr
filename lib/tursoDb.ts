import { createClient, type Client, type InStatement } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

export interface TursoConnectionInfo {
  url: string;
  authToken?: string;
  provider: 'turso' | 'local-sqlite';
  tursoConfigured: boolean;
  databaseHost: string | null;
}

let cachedClient: Client | null = null;
let cachedConfigKey = '';
let schemaInitialized = false;

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function extractEnvValue(raw: string, keys: string[]): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  for (const key of keys) {
    const match = trimmed.match(new RegExp(`(?:^|\\s)${key}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|([^\\s]+))`));
    if (match) {
      return (match[1] || match[2] || match[3] || '').trim();
    }
  }

  return '';
}

export function resolveTursoConfig(): TursoConnectionInfo {
  const rawUrl = (
    process.env.TURSO_DATABASE_URL ||
    process.env.NEWPROTEC_TURSO_DATABASE_URL ||
    process.env.STORAGE_TURSO_DATABASE_URL ||
    process.env.LIBSQL_URL ||
    process.env.DATABASE_URL ||
    ''
  ).trim();

  const rawToken = (
    process.env.TURSO_AUTH_TOKEN ||
    process.env.NEWPROTEC_TURSO_AUTH_TOKEN ||
    process.env.STORAGE_TURSO_AUTH_TOKEN ||
    process.env.LIBSQL_AUTH_TOKEN ||
    process.env.DATABASE_AUTH_TOKEN ||
    ''
  ).trim();

  const urlKeys = [
    'TURSO_DATABASE_URL',
    'NEWPROTEC_TURSO_DATABASE_URL',
    'STORAGE_TURSO_DATABASE_URL',
    'LIBSQL_URL',
    'DATABASE_URL',
  ];
  const tokenKeys = [
    'TURSO_AUTH_TOKEN',
    'NEWPROTEC_TURSO_AUTH_TOKEN',
    'STORAGE_TURSO_AUTH_TOKEN',
    'LIBSQL_AUTH_TOKEN',
    'DATABASE_AUTH_TOKEN',
  ];

  let url = extractEnvValue(rawUrl, urlKeys) || extractEnvValue(rawToken, urlKeys);
  if (!url && rawUrl && !rawUrl.includes('=')) {
    url = stripQuotes(rawUrl);
  }
  if (!url) {
    const directUrlMatch = `${rawUrl} ${rawToken}`.match(/(?:libsql|https?):\/\/[^\s"']+/);
    if (directUrlMatch) {
      url = directUrlMatch[0];
    }
  }

  let authToken = extractEnvValue(rawToken, tokenKeys) || extractEnvValue(rawUrl, tokenKeys);
  if (!authToken && rawToken && !rawToken.includes('=')) {
    authToken = stripQuotes(rawToken);
  }

  if (url) {
    let databaseHost: string | null = null;
    try {
      const normalized = url.replace(/^libsql:\/\//, 'https://');
      databaseHost = new URL(normalized).hostname;
    } catch {
      databaseHost = null;
    }
    return {
      url,
      authToken: authToken || undefined,
      provider: 'turso',
      tursoConfigured: true,
      databaseHost,
    };
  }

  if (process.env.VERCEL === '1') {
    throw new Error(
      'TURSO_DATABASE_URL chưa được cấu hình trên Vercel Project. Vui lòng kiểm tra kết nối database-newprotec trong Vercel Storage.'
    );
  }

  const dataDir = path.resolve(process.cwd(), '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const localDbPath = path.join(dataDir, 'newprotec-local.db');

  return {
    url: `file:${localDbPath}`,
    provider: 'local-sqlite',
    tursoConfigured: false,
    databaseHost: 'local-sqlite',
  };
}

export function getTursoClient(): { client: Client; info: TursoConnectionInfo } {
  const info = resolveTursoConfig();
  const configKey = `${info.url}::${info.authToken || ''}`;

  if (!cachedClient || cachedConfigKey !== configKey) {
    cachedClient = createClient({
      url: info.url,
      authToken: info.authToken,
    });
    cachedConfigKey = configKey;
    schemaInitialized = false;
  }

  return { client: cachedClient, info };
}

export async function ensureSchema(): Promise<TursoConnectionInfo> {
  const { client, info } = getTursoClient();
  if (schemaInitialized) {
    return info;
  }

  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS factory_state_slices (
        slice_key TEXT PRIMARY KEY,
        data_json TEXT NOT NULL,
        record_count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL DEFAULT 'system'
      )`,
      `CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        actor TEXT NOT NULL DEFAULT 'system',
        slices_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_factory_state_updated_at ON factory_state_slices(updated_at)`,
      `CREATE TABLE IF NOT EXISTS qr_login_sessions (
        session_id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'PENDING',
        target_action TEXT,
        device_label TEXT,
        created_at TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        approved_by_json TEXT,
        approved_at TEXT
      )`,
    ],
    'write'
  );

  schemaInitialized = true;
  return info;
}

export async function getDatabaseHealth() {
  const info = await ensureSchema();
  const { client } = getTursoClient();

  const summaryRes = await client.execute(
    'SELECT COUNT(*) AS slices_count, MAX(updated_at) AS last_updated FROM factory_state_slices'
  );
  const row = summaryRes.rows[0];

  return {
    ok: true,
    databaseName: 'database-newprotec',
    provider: info.provider,
    tursoConfigured: info.tursoConfigured,
    databaseHost: info.databaseHost,
    slicesCount: Number(row?.slices_count ?? 0),
    lastUpdated: row?.last_updated ? String(row.last_updated) : null,
    timestamp: new Date().toISOString(),
  };
}

export async function pullFactoryState() {
  const info = await ensureSchema();
  const { client } = getTursoClient();

  const result = await client.execute(
    'SELECT slice_key, data_json, updated_at FROM factory_state_slices'
  );

  const data: Record<string, unknown> = {};
  let latestUpdatedAt: string | null = null;

  for (const row of result.rows) {
    const sliceKey = String(row.slice_key);
    const rawJson = String(row.data_json);
    const updatedAt = row.updated_at ? String(row.updated_at) : null;

    try {
      data[sliceKey] = JSON.parse(rawJson);
    } catch {
      // Skip malformed slice
    }

    if (updatedAt && (!latestUpdatedAt || updatedAt > latestUpdatedAt)) {
      latestUpdatedAt = updatedAt;
    }
  }

  return {
    success: true,
    databaseName: 'database-newprotec',
    provider: info.provider,
    tursoConfigured: info.tursoConfigured,
    empty: result.rows.length === 0,
    slicesCount: result.rows.length,
    updatedAt: latestUpdatedAt,
    data,
  };
}

export async function pushFactoryState(
  statePayload: Record<string, unknown>,
  actor = 'system'
) {
  if (!statePayload || typeof statePayload !== 'object' || Array.isArray(statePayload)) {
    throw new Error('Invalid state payload: expected a plain object.');
  }

  const info = await ensureSchema();
  const { client } = getTursoClient();
  const nowIso = new Date().toISOString();
  const safeActor = String(actor || 'system').slice(0, 128);

  const entries = Object.entries(statePayload).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return {
      success: true,
      databaseName: 'database-newprotec',
      provider: info.provider,
      tursoConfigured: info.tursoConfigured,
      slicesCount: 0,
      updatedAt: nowIso,
    };
  }

  const statements: InStatement[] = entries.map(([sliceKey, value]) => {
    const recordCount = Array.isArray(value) ? value.length : 1;
    return {
      sql: `INSERT INTO factory_state_slices (slice_key, data_json, record_count, updated_at, updated_by)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(slice_key) DO UPDATE SET
              data_json = excluded.data_json,
              record_count = excluded.record_count,
              updated_at = excluded.updated_at,
              updated_by = excluded.updated_by`,
      args: [sliceKey, JSON.stringify(value), recordCount, nowIso, safeActor],
    };
  });

  statements.push({
    sql: `INSERT INTO sync_logs (action, actor, slices_count, created_at) VALUES (?, ?, ?, ?)`,
    args: ['PUSH', safeActor, entries.length, nowIso],
  });

  await client.batch(statements, 'write');

  return {
    success: true,
    databaseName: 'database-newprotec',
    provider: info.provider,
    tursoConfigured: info.tursoConfigured,
    slicesCount: entries.length,
    updatedAt: nowIso,
  };
}

export async function createQrLoginSessionDb(params: {
  sessionId: string;
  deviceLabel?: string;
  expiresAt: number;
  createdAt?: string;
}) {
  await ensureSchema();
  const { client } = getTursoClient();
  const createdAt = params.createdAt || new Date().toISOString();
  const cleanId = String(params.sessionId || '').trim().slice(0, 128);
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
    throw new Error('Invalid sessionId format');
  }
  const cleanLabel = String(params.deviceLabel || 'Trạm QR Chấm Công').slice(0, 128);
  const expiresAt = Number(params.expiresAt) || Date.now() + 180_000;

  await client.execute({
    sql: `INSERT INTO qr_login_sessions (session_id, status, device_label, created_at, expires_at)
          VALUES (?, 'PENDING', ?, ?, ?)
          ON CONFLICT(session_id) DO UPDATE SET
            status = 'PENDING',
            target_action = NULL,
            device_label = excluded.device_label,
            created_at = excluded.created_at,
            expires_at = excluded.expires_at,
            approved_by_json = NULL,
            approved_at = NULL`,
    args: [cleanId, cleanLabel, createdAt, expiresAt],
  });

  return {
    sessionId: cleanId,
    status: 'PENDING',
    deviceLabel: cleanLabel,
    createdAt,
    expiresAt,
  };
}

export async function getQrLoginSessionDb(sessionId: string) {
  await ensureSchema();
  const { client } = getTursoClient();
  const cleanId = String(sessionId || '').trim().slice(0, 128);
  if (!cleanId) return null;

  const res = await client.execute({
    sql: `SELECT session_id, status, target_action, device_label, created_at, expires_at, approved_by_json, approved_at
          FROM qr_login_sessions WHERE session_id = ? LIMIT 1`,
    args: [cleanId],
  });

  const row = res.rows[0];
  if (!row) return null;

  let approvedBy = undefined;
  if (row.approved_by_json) {
    try {
      approvedBy = JSON.parse(String(row.approved_by_json));
    } catch {
      approvedBy = undefined;
    }
  }

  return {
    sessionId: String(row.session_id),
    status: String(row.status),
    targetAction: row.target_action ? String(row.target_action) : undefined,
    deviceLabel: row.device_label ? String(row.device_label) : undefined,
    createdAt: String(row.created_at),
    expiresAt: Number(row.expires_at),
    approvedBy,
    approvedAt: row.approved_at ? String(row.approved_at) : undefined,
  };
}

export async function approveQrLoginSessionDb(params: {
  sessionId: string;
  targetAction: 'LOGIN_QRCODE' | 'LOGOUT_TO_LOGIN';
  approvedBy: {
    username: string;
    fullName: string;
    role: string;
    employeeId?: string;
    department?: string;
  };
}) {
  await ensureSchema();
  const { client } = getTursoClient();
  const cleanId = String(params.sessionId || '').trim().slice(0, 128);
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
    throw new Error('Invalid sessionId');
  }
  const existing = await getQrLoginSessionDb(cleanId);
  if (!existing) {
    throw new Error('Không tìm thấy phiên QR hoặc mã QR đã hết hạn.');
  }
  if (existing.status === 'CONSUMED') {
    throw new Error('Mã QR này đã được sử dụng.');
  }
  if (Date.now() > existing.expiresAt) {
    throw new Error('Mã QR đã hết hạn. Vui lòng tạo lại mã mới trên thiết bị chấm công.');
  }
  if (params.approvedBy?.role !== 'admin') {
    throw new Error('Chỉ tài khoản Quản trị viên mới có quyền xác nhận đăng nhập.');
  }

  const approvedAt = new Date().toISOString();
  const sanitizedUser = {
    username: String(params.approvedBy.username).slice(0, 64),
    fullName: String(params.approvedBy.fullName).slice(0, 128),
    role: 'admin',
    ...(params.approvedBy.employeeId ? { employeeId: String(params.approvedBy.employeeId).slice(0, 32) } : {}),
    ...(params.approvedBy.department ? { department: String(params.approvedBy.department).slice(0, 64) } : {}),
  };

  await client.execute({
    sql: `UPDATE qr_login_sessions
          SET status = 'APPROVED', target_action = ?, approved_by_json = ?, approved_at = ?
          WHERE session_id = ?`,
    args: [params.targetAction, JSON.stringify(sanitizedUser), approvedAt, cleanId],
  });

  return {
    ...existing,
    status: 'APPROVED',
    targetAction: params.targetAction,
    approvedBy: sanitizedUser,
    approvedAt,
  };
}

export async function consumeQrLoginSessionDb(sessionId: string) {
  await ensureSchema();
  const { client } = getTursoClient();
  const cleanId = String(sessionId || '').trim().slice(0, 128);
  if (!cleanId) return;
  await client.execute({
    sql: `UPDATE qr_login_sessions SET status = 'CONSUMED' WHERE session_id = ?`,
    args: [cleanId],
  });
}
