import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { resolveApiUrl } from './apiBase';
import { UserAccount } from '../types';

export const ADMIN_QR_LOGIN_TYPE = 'NP_ADMIN_QR_LOGIN';
export const QR_LOGIN_COLLECTION = 'qr_login_sessions';
export const QR_LOGIN_TTL_MS = 180_000; // 3 phút

export type QrLoginTargetAction = 'LOGIN_QRCODE' | 'LOGOUT_TO_LOGIN';

export const QRCODE_STATION_ACCOUNT: UserAccount = {
  username: 'QRCODE',
  fullName: 'Trạm QR Chấm Công',
  role: 'qrcode',
  employeeId: 'QRCODE',
  department: 'ALL',
};

export function checkIsQrcodeGateUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const qrParam = (params.get('qrcode') || '').toLowerCase();
    const modeParam = (params.get('mode') || '').toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    return (
      qrParam === '1' ||
      qrParam === 'true' ||
      modeParam === 'qrcode' ||
      hash === '#qrcode'
    );
  } catch {
    return false;
  }
}

export function updateQrcodeGateUrl(open: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (open) {
      url.searchParams.set('qrcode', '1');
      url.searchParams.delete('catalog');
    } else {
      url.searchParams.delete('qrcode');
      if ((url.searchParams.get('mode') || '').toLowerCase() === 'qrcode') {
        url.searchParams.delete('mode');
      }
      if (url.hash.toLowerCase() === '#qrcode') {
        url.hash = '';
      }
    }
    window.history.replaceState({}, '', url.toString());
  } catch {
    // ignore URL errors
  }
}

export function getDedicatedQrcodeStationUrl(): string {
  if (typeof window === 'undefined') return '?qrcode=1';
  try {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('qrcode', '1');
    return url.toString();
  } catch {
    return '?qrcode=1';
  }
}

export interface QrLoginSessionDoc {
  sessionId: string;
  status: 'PENDING' | 'APPROVED' | 'CONSUMED' | 'EXPIRED';
  targetAction?: QrLoginTargetAction;
  deviceLabel?: string;
  createdAt: string;
  expiresAt: number;
  approvedBy?: {
    username: string;
    fullName: string;
    role: 'admin';
    employeeId?: string;
    department?: string;
  };
  approvedAt?: string;
}

export interface ParsedAdminQrLoginPayload {
  valid: boolean;
  sessionId?: string;
  station?: string;
  intent?: QrLoginTargetAction;
}

export function generateQrLoginSessionId(): string {
  const bytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `qrl_${Date.now()}_${hex}`;
}

export function buildAdminQrLoginPayload(
  sessionId: string,
  station = 'QRCODE_KIOSK',
  intent: QrLoginTargetAction = 'LOGIN_QRCODE'
): string {
  return JSON.stringify({
    type: ADMIN_QR_LOGIN_TYPE,
    sessionId,
    station,
    intent,
    v: 1,
  });
}

export function parseAdminQrLoginPayload(rawText: string): ParsedAdminQrLoginPayload {
  const trimmed = (rawText || '').trim();
  if (!trimmed) return { valid: false };

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      if (obj?.type === ADMIN_QR_LOGIN_TYPE && typeof obj.sessionId === 'string') {
        const sid = obj.sessionId.trim();
        if (/^[a-zA-Z0-9_-]{8,128}$/.test(sid)) {
          const rawIntent = obj.intent;
          const intent: QrLoginTargetAction =
            rawIntent === 'LOGOUT_TO_LOGIN' ? 'LOGOUT_TO_LOGIN' : 'LOGIN_QRCODE';
          return {
            valid: true,
            sessionId: sid,
            station: typeof obj.station === 'string' ? obj.station : 'QRCODE_KIOSK',
            intent,
          };
        }
      }
    } catch {
      return { valid: false };
    }
  }

  // Also support pasting raw session ID (qrl_...)
  if (/^qrl_[0-9]+_[a-f0-9]+$/i.test(trimmed)) {
    return {
      valid: true,
      sessionId: trimmed,
      station: 'QRCODE_KIOSK',
    };
  }

  return { valid: false };
}

function logFirestoreChannelWarning(error: unknown, op: OperationType, path: string) {
  try {
    handleFirestoreError(error, op, path);
  } catch (structuredErr) {
    console.warn('[QR Login Firestore channel]', structuredErr);
  }
}

export async function createRemoteQrLoginSession(
  sessionId: string,
  deviceLabel = 'Trạm QR Chấm Công (QRCODE)'
): Promise<QrLoginSessionDoc> {
  const nowIso = new Date().toISOString();
  const expiresAt = Date.now() + QR_LOGIN_TTL_MS;
  const payload: QrLoginSessionDoc = {
    sessionId,
    status: 'PENDING',
    deviceLabel: deviceLabel.slice(0, 128),
    createdAt: nowIso,
    expiresAt,
  };

  const firestorePath = `${QR_LOGIN_COLLECTION}/${sessionId}`;
  const writeFirestore = setDoc(doc(db, QR_LOGIN_COLLECTION, sessionId), payload).catch((err) => {
    logFirestoreChannelWarning(err, OperationType.CREATE, firestorePath);
  });

  const writeApi = fetch(resolveApiUrl('/api/qr-login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'CREATE',
      ...payload,
    }),
  }).catch(() => {});

  await Promise.allSettled([writeFirestore, writeApi]);
  return payload;
}

export function subscribeRemoteQrLoginSession(
  sessionId: string,
  onUpdate: (session: QrLoginSessionDoc) => void
): () => void {
  let stopped = false;
  let handledApproved = false;

  const emitIfRelevant = (data: QrLoginSessionDoc | null | undefined) => {
    if (stopped || !data || handledApproved) return;
    if (data.status === 'APPROVED') {
      handledApproved = true;
    }
    onUpdate(data);
  };

  // Channel 1: Firestore real-time push (instant cross-device like Zalo)
  const firestorePath = `${QR_LOGIN_COLLECTION}/${sessionId}`;
  const unsubFirestore = onSnapshot(
    doc(db, QR_LOGIN_COLLECTION, sessionId),
    (snap) => {
      if (snap.exists()) {
        emitIfRelevant(snap.data() as QrLoginSessionDoc);
      }
    },
    (error) => {
      logFirestoreChannelWarning(error, OperationType.GET, firestorePath);
    }
  );

  // Channel 2: Same-browser BroadcastChannel for instant local multi-tab testing
  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel('np_admin_qr_login');
      bc.onmessage = (ev) => {
        const msg = ev.data as QrLoginSessionDoc | undefined;
        if (msg && msg.sessionId === sessionId) {
          emitIfRelevant(msg);
        }
      };
    } catch {
      bc = null;
    }
  }

  // Channel 3: Server API polling fallback (every 1.4s)
  const pollTimer = window.setInterval(async () => {
    if (stopped || handledApproved) return;
    try {
      const res = await fetch(
        resolveApiUrl(`/api/qr-login?sessionId=${encodeURIComponent(sessionId)}`),
        {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = (await res.json()) as { success?: boolean; session?: QrLoginSessionDoc | null };
        if (json?.success && json.session) {
          emitIfRelevant(json.session);
        }
      }
    } catch {
      // ignore network poll errors
    }
  }, 1400);

  return () => {
    stopped = true;
    unsubFirestore();
    window.clearInterval(pollTimer);
    if (bc) {
      try {
        bc.close();
      } catch {
        // ignore
      }
    }
  };
}

export async function approveRemoteQrLoginSession(params: {
  sessionId: string;
  targetAction: QrLoginTargetAction;
  adminUser: UserAccount;
}): Promise<{ ok: boolean; error?: string; session?: QrLoginSessionDoc }> {
  const { sessionId, targetAction, adminUser } = params;

  if (!adminUser || adminUser.role !== 'admin') {
    return {
      ok: false,
      error: 'Chỉ tài khoản Quản trị viên (admin) mới có quyền quét xác nhận đăng nhập.',
    };
  }

  const sanitizedUser: NonNullable<QrLoginSessionDoc['approvedBy']> = {
    username: String(adminUser.username || 'admin').slice(0, 64),
    fullName: String(adminUser.fullName || adminUser.username || 'Quản trị viên').slice(0, 128),
    role: 'admin',
    ...(adminUser.employeeId ? { employeeId: String(adminUser.employeeId).slice(0, 32) } : {}),
    ...(adminUser.department ? { department: String(adminUser.department).slice(0, 64) } : {}),
  };

  const approvedAt = new Date().toISOString();
  const firestorePath = `${QR_LOGIN_COLLECTION}/${sessionId}`;
  let firestoreSucceeded = false;
  let apiSucceeded = false;
  let lastErrorMsg = '';
  let resolvedSession: QrLoginSessionDoc | undefined;

  // Channel 1: Try Firestore session verification & update
  try {
    const docRef = doc(db, QR_LOGIN_COLLECTION, sessionId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const existing = snap.data() as QrLoginSessionDoc;
      if (existing.status === 'CONSUMED') {
        return { ok: false, error: 'Mã QR này đã được sử dụng trước đó.' };
      }
      if (Date.now() > Number(existing.expiresAt || 0)) {
        return {
          ok: false,
          error: 'Mã QR đã hết hạn. Vui lòng tạo lại mã mới trên thiết bị chấm công.',
        };
      }
      await updateDoc(docRef, {
        status: 'APPROVED',
        targetAction,
        approvedBy: sanitizedUser,
        approvedAt,
      });
      firestoreSucceeded = true;
      resolvedSession = {
        ...existing,
        status: 'APPROVED',
        targetAction,
        approvedBy: sanitizedUser,
        approvedAt,
      };
    }
  } catch (err) {
    logFirestoreChannelWarning(err, OperationType.UPDATE, firestorePath);
  }

  // Channel 2: Backend /api/qr-login approval
  try {
    const res = await fetch(resolveApiUrl('/api/qr-login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'APPROVE',
        sessionId,
        targetAction,
        approvedBy: sanitizedUser,
      }),
    });
    const json = (await res.json()) as {
      success?: boolean;
      error?: string;
      session?: QrLoginSessionDoc;
    };
    if (res.ok && json?.success && json.session) {
      apiSucceeded = true;
      resolvedSession = resolvedSession || json.session;
    } else if (json?.error) {
      lastErrorMsg = json.error;
    }
  } catch {
    // ignore network error if Firestore succeeded
  }

  // Channel 3: BroadcastChannel
  if (typeof BroadcastChannel !== 'undefined' && (firestoreSucceeded || apiSucceeded)) {
    try {
      const bc = new BroadcastChannel('np_admin_qr_login');
      bc.postMessage(
        resolvedSession || {
          sessionId,
          status: 'APPROVED',
          targetAction,
          approvedBy: sanitizedUser,
          approvedAt,
          createdAt: approvedAt,
          expiresAt: Date.now() + QR_LOGIN_TTL_MS,
        }
      );
      bc.close();
    } catch {
      // ignore
    }
  }

  if (firestoreSucceeded || apiSucceeded) {
    return { ok: true, session: resolvedSession };
  }

  return {
    ok: false,
    error: lastErrorMsg || 'Không tìm thấy phiên QR hợp lệ hoặc mã QR đã hết hạn.',
  };
}

export async function consumeRemoteQrLoginSession(sessionId: string): Promise<void> {
  const firestorePath = `${QR_LOGIN_COLLECTION}/${sessionId}`;
  const updateFs = updateDoc(doc(db, QR_LOGIN_COLLECTION, sessionId), {
    status: 'CONSUMED',
  }).catch((err) => {
    logFirestoreChannelWarning(err, OperationType.UPDATE, firestorePath);
  });

  const updateApi = fetch(resolveApiUrl('/api/qr-login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'CONSUME', sessionId }),
  }).catch(() => {});

  await Promise.allSettled([updateFs, updateApi]);
}
