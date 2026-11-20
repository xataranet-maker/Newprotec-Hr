import { StaffRecord } from '../types';

export const SHARED_APP_BASE_URL =
  'https://ais-pre-pd7mefhivzxrv2ypqhd7yd-389586521748.asia-southeast1.run.app';

export const QR_EMP_PARAM = 'qr_emp';
export const QR_TOKEN_PARAM = 'qr_token';

/**
 * Generates a deterministic default token for an employee ID so any existing
 * employee record (e.g. seeded from INITIAL_STAFF) has a consistent token across devices.
 */
export function createDefaultStaffQrToken(employeeId: string): string {
  const cleanId = employeeId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'EMP';
  let hash = 5381;
  const seed = `NEWPROTEC_QR_${cleanId}_V2`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
  }
  const suffix = hash.toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  return `NP-${cleanId}-${suffix}`;
}

/**
 * Generates a fresh random token when creating a new employee or regenerating/revoking a QR code.
 */
export function generateStaffQrToken(employeeId: string): string {
  const cleanId = employeeId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'EMP';
  const randA = Math.floor(100000 + Math.random() * 899999).toString(36).toUpperCase();
  const randB = (Date.now() % 1679616).toString(36).toUpperCase().padStart(4, '0');
  return `NP-${cleanId}-${randA}${randB}`.slice(0, 32);
}

export function getStaffQrToken(staff: StaffRecord): string {
  if (staff.qrAccessToken && staff.qrAccessToken.trim().length > 0) {
    return staff.qrAccessToken.trim();
  }
  return createDefaultStaffQrToken(staff.employeeId);
}

export function isStaffQrEnabled(staff: StaffRecord): boolean {
  return staff.qrAccessEnabled !== false;
}

export function getPreferredAppOrigin(): string {
  if (
    typeof window !== 'undefined' &&
    window.location.origin &&
    !window.location.origin.includes('localhost') &&
    !window.location.origin.includes('127.0.0.1')
  ) {
    return window.location.origin;
  }
  return SHARED_APP_BASE_URL;
}

export function buildStaffQrUrl(staff: StaffRecord, baseUrl?: string): string {
  const origin = (baseUrl || getPreferredAppOrigin()).replace(/\/+$/, '');
  const token = getStaffQrToken(staff);
  const params = new URLSearchParams({
    [QR_EMP_PARAM]: staff.employeeId.trim(),
    [QR_TOKEN_PARAM]: token,
  });
  return `${origin}/?${params.toString()}`;
}

export function parseStaffQrParamsFromUrl(): {
  employeeId: string;
  token: string;
} | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const emp = params.get(QR_EMP_PARAM)?.trim();
  const token = params.get(QR_TOKEN_PARAM)?.trim();
  if (!emp || !token) return null;
  return { employeeId: emp, token };
}

export function clearStaffQrParamsFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete(QR_EMP_PARAM);
  url.searchParams.delete(QR_TOKEN_PARAM);
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
}
