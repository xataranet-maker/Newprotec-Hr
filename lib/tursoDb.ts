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
