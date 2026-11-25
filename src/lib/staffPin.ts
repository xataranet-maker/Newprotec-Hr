import { StaffRecord } from '../types';

export const DEFAULT_STAFF_PIN = '123';

/**
 * Returns the single unified PIN shared across Employee ID login and Employee QR code access.
 */
export function getEffectiveStaffPin(
  staff?: StaffRecord | null,
  fallbackAccountPassword?: string
): string {
  const fromStaff = (staff?.securityPin || '').trim();
  if (fromStaff) return fromStaff;
  const fromAccount = (fallbackAccountPassword || '').trim();
  if (fromAccount) return fromAccount;
  return DEFAULT_STAFF_PIN;
}

/**
 * Returns true if the employee must set a new personal PIN on login/QR scan
 * (first login using default PIN '123' or PIN recently reissued by HC & NS).
 */
export function staffNeedsFirstPinChange(
  staff?: StaffRecord | null,
  fallbackAccountPassword?: string
): boolean {
  if (!staff) return false;
  const effectivePin = getEffectiveStaffPin(staff, fallbackAccountPassword);
  return effectivePin === DEFAULT_STAFF_PIN || Boolean(staff.mustChangePin);
}

export function validateNewStaffPin(
  newPinRaw: string,
  confirmPinRaw: string,
  currentPin?: string
): { ok: true; pin: string } | { ok: false; error: string } {
  const newPin = newPinRaw.trim();
  const confirmPin = confirmPinRaw.trim();

  if (!newPin) {
    return { ok: false, error: 'Vui lòng nhập mã PIN mới.' };
  }
  if (newPin.length < 4) {
    return { ok: false, error: 'Mã PIN mới phải có ít nhất 4 ký tự hoặc chữ số.' };
  }
  if (newPin.length > 32) {
    return { ok: false, error: 'Mã PIN tối đa 32 ký tự.' };
  }
  if (newPin === DEFAULT_STAFF_PIN) {
    return { ok: false, error: 'Mã PIN này không được phép sử dụng làm mã cá nhân. Vui lòng chọn mã PIN khác.' };
  }
  if (currentPin && currentPin !== DEFAULT_STAFF_PIN && newPin === currentPin.trim()) {
    return { ok: false, error: 'Mã PIN mới phải khác với mã PIN tạm thời vừa được cấp.' };
  }
  if (newPin !== confirmPin) {
    return { ok: false, error: 'Xác nhận mã PIN không khớp.' };
  }

  return { ok: true, pin: newPin };
}

export function generateRandomStaffPin(length = 4): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  if (result === '0000' || result === '1234' || result === '1111') {
    return '5839';
  }
  return result;
}
