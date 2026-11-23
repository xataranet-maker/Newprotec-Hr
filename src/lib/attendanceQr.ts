import { AttendanceStatus, MachineSwipeRecord, StaffRecord } from '../types';
import {
  calculateMatrixDayHoursFromTimes,
  dispatchMatrixUpdatedEvent,
  getEmployeeProfileMatrixData,
  getFacePunchStorageKey,
  getQrPunchStorageKey,
} from './matrixTimekeeping';
import { parseStaffQrPayload } from './staffQr';

export const ATTENDANCE_QR_TYPE = 'NP_ATTENDANCE_KIOSK';
export const ATTENDANCE_QR_STATION = 'NEWPROTEC_MAIN';

export const ATTENDANCE_QR_PAYLOAD = JSON.stringify({
  type: ATTENDANCE_QR_TYPE,
  station: ATTENDANCE_QR_STATION,
  v: 1,
});

export type ParsedAttendanceQrResult =
  | { type: 'ATTENDANCE_QR'; station: string }
  | { type: 'STAFF_QR' }
  | { type: 'APP_URL' }
  | { type: 'INVALID' };

export function parseAttendanceQrPayload(rawText: string): ParsedAttendanceQrResult {
  const trimmed = (rawText || '').trim();
  if (!trimmed) return { type: 'INVALID' };

  if (
    trimmed === ATTENDANCE_QR_TYPE ||
    trimmed.startsWith('NEWPROTEC_ATTENDANCE_QR')
  ) {
    return { type: 'ATTENDANCE_QR', station: ATTENDANCE_QR_STATION };
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj?.type === ATTENDANCE_QR_TYPE || obj?.kind === ATTENDANCE_QR_TYPE) {
        return {
          type: 'ATTENDANCE_QR',
          station: String(obj.station || ATTENDANCE_QR_STATION),
        };
      }
    } catch {
      // fall through
    }
  }

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('?')) {
      const url = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? new URL(trimmed)
        : new URL(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, 'https://placeholder.local');
      if (url.searchParams.get('qr_att') === '1' || url.searchParams.get('station')) {
        return {
          type: 'ATTENDANCE_QR',
          station: url.searchParams.get('station') || ATTENDANCE_QR_STATION,
        };
      }
    }
  } catch {
    // ignore URL parse error
  }

  const staffParsed = parseStaffQrPayload(trimmed);
  if (staffParsed.type === 'STAFF_QR') return { type: 'STAFF_QR' };
  if (staffParsed.type === 'APP_URL') return { type: 'APP_URL' };

  return { type: 'INVALID' };
}

export function formatCurrentHhMm(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadQrPunchMap(
  year: number,
  month: number
): Record<string, MachineSwipeRecord> {
  try {
    const raw = localStorage.getItem(getQrPunchStorageKey(year, month));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, MachineSwipeRecord>;
      }
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveQrPunchMap(
  year: number,
  month: number,
  nextMap: Record<string, MachineSwipeRecord>,
  department = 'MULTI'
): void {
  try {
    localStorage.setItem(getQrPunchStorageKey(year, month), JSON.stringify(nextMap));
    dispatchMatrixUpdatedEvent(department || 'MULTI', year, month);
  } catch (e) {
    console.error('Save QR punch map error', e);
  }
}

export function loadFacePunchMap(
  year: number,
  month: number
): Record<string, MachineSwipeRecord> {
  try {
    const raw = localStorage.getItem(getFacePunchStorageKey(year, month));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, MachineSwipeRecord>;
      }
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveFacePunchMap(
  year: number,
  month: number,
  nextMap: Record<string, MachineSwipeRecord>,
  department = 'MULTI'
): void {
  try {
    localStorage.setItem(getFacePunchStorageKey(year, month), JSON.stringify(nextMap));
    dispatchMatrixUpdatedEvent(department || 'MULTI', year, month);
  } catch (e) {
    console.error('Save Face punch map error', e);
  }
}

function parseHhMmMins(t?: string): number | null {
  if (!t) return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (isNaN(h) || isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export interface DayPunchState {
  year: number;
  month: number;
  day: number;
  dateStr: string;
  dateIso: string;
  existingInTime: string;
  existingOutTime: string;
  existingShift: 'DAY' | 'NIGHT';
  suggestedMode: 'IN' | 'OUT';
  isHoliday: boolean;
  isSunday: boolean;
  sourceDepartment: string;
}

export function getDateMatrixPunchState(
  staff: StaffRecord,
  year: number,
  month: number,
  day: number,
  source: 'QR' | 'FACE' = 'QR'
): DayPunchState {
  const { days, holidays, sourceDepartment } = getEmployeeProfileMatrixData(
    staff.employeeId,
    staff.department || 'MULTI',
    year,
    month,
    staff
  );

  const entry = days[day];
  const punchMap = source === 'FACE' ? loadFacePunchMap(year, month) : loadQrPunchMap(year, month);
  const punchKey = `${staff.employeeId.trim().toLowerCase()}_${day}`;
  const punchRecord = punchMap[punchKey];

  const existingInTime = (punchRecord?.rawInTime || '').trim();
  const existingOutTime = (punchRecord?.rawOutTime || '').trim();
  const existingShift: 'DAY' | 'NIGHT' =
    entry?.shift || (staff.shift === 'NIGHT' ? 'NIGHT' : 'DAY');
  const isSunday = new Date(year, month - 1, day).getDay() === 0;
  const isHoliday = Boolean(holidays[day] || entry?.isHoliday);

  const suggestedMode: 'IN' | 'OUT' = !existingInTime ? 'IN' : 'OUT';

  return {
    year,
    month,
    day,
    dateStr: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
    dateIso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    existingInTime,
    existingOutTime,
    existingShift,
    suggestedMode,
    isHoliday,
    isSunday,
    sourceDepartment: staff.department?.trim().toUpperCase() || sourceDepartment || 'MULTI',
  };
}

export interface AttendancePunchResult {
  ok: boolean;
  error?: string;
  mode: 'IN' | 'OUT' | 'BOTH';
  dateStr: string;
  dateIso: string;
  inTime: string;
  outTime: string;
  shift: 'DAY' | 'NIGHT';
  status: AttendanceStatus;
  departmentLabel: string;
  regularHours: number;
  totalOtHours: number;
}

export function recordEmployeeAttendancePunch(params: {
  staff: StaffRecord;
  allStaff: StaffRecord[];
  year: number;
  month: number;
  day: number;
  mode: 'IN' | 'OUT' | 'BOTH';
  inTime?: string;
  outTime?: string;
  shift?: 'DAY' | 'NIGHT';
  note?: string;
  method?: 'QR' | 'FACE' | 'MANUAL';
}): AttendancePunchResult {
  const { staff, year, month, day, mode, method = 'QR' } = params;
  const targetSource: 'QR' | 'FACE' = method === 'FACE' ? 'FACE' : 'QR';
  const state = getDateMatrixPunchState(staff, year, month, day, targetSource);
  const nowHhMm = formatCurrentHhMm();

  let nextInTime = state.existingInTime;
  let nextOutTime = state.existingOutTime;

  if (mode === 'IN') {
    nextInTime = (params.inTime ?? nowHhMm).trim();
    nextOutTime = state.existingOutTime || '';
  } else if (mode === 'OUT') {
    nextInTime = state.existingInTime || '';
    nextOutTime = (params.outTime ?? nowHhMm).trim();
  } else {
    nextInTime = (params.inTime ?? '').trim();
    nextOutTime = (params.outTime ?? '').trim();
  }

  if (mode === 'IN' && nextInTime && !state.existingOutTime) {
    nextOutTime = '';
  }
  if (mode !== 'BOTH' && nextInTime && nextOutTime && nextInTime === nextOutTime) {
    if (mode === 'IN') {
      nextOutTime = '';
    } else {
      nextInTime = '';
    }
  }

  if (!nextInTime && !nextOutTime) {
    return {
      ok: false,
      error: 'Không có dữ liệu Giờ Vào hoặc Giờ Ra hợp lệ.',
      mode,
      dateStr: state.dateStr,
      dateIso: state.dateIso,
      inTime: '',
      outTime: '',
      shift: state.existingShift,
      status: 'Đúng giờ',
      departmentLabel: state.sourceDepartment,
      regularHours: 0,
      totalOtHours: 0,
    };
  }

  const shift: 'DAY' | 'NIGHT' = params.shift || state.existingShift || 'DAY';

  let regularHours = 0;
  let totalOtHours = 0;
  let status: AttendanceStatus = state.isHoliday
    ? 'Nghỉ lễ'
    : state.isSunday
    ? 'Nghỉ chủ nhật'
    : 'Đúng giờ';

  if (nextInTime && nextOutTime) {
    const calc = calculateMatrixDayHoursFromTimes(
      nextInTime,
      nextOutTime,
      shift,
      state.isSunday,
      state.isHoliday
    );
    regularHours = calc.regularHours;
    totalOtHours = calc.totalOtHours;
    status = calc.suggestedStatus;
  } else if (nextInTime) {
    const inM = parseHhMmMins(nextInTime);
    if (inM !== null) {
      if (shift === 'DAY') {
        status = inM > 8 * 60 ? 'Đi muộn' : 'Đúng giờ';
      } else {
        status = inM > 20 * 60 && inM <= 23 * 60 + 59 ? 'Đi muộn' : 'Đúng giờ';
      }
    }
  } else if (nextOutTime) {
    const outM = parseHhMmMins(nextOutTime);
    if (outM !== null) {
      if (shift === 'DAY') {
        status = outM < 17 * 60 ? 'Về sớm' : 'Đúng giờ';
      } else {
        status = outM < 5 * 60 ? 'Về sớm' : 'Đúng giờ';
      }
    }
  }

  const deptDisplay = staff.department?.trim().toUpperCase() || state.sourceDepartment || 'MULTI';
  const punchKey = `${staff.employeeId.trim().toLowerCase()}_${day}`;
  const isFace = method === 'FACE';
  const existingMap = isFace ? loadFacePunchMap(year, month) : loadQrPunchMap(year, month);
  const note =
    params.note?.trim() ||
    (isFace
      ? `Chấm công khuôn mặt lúc ${formatCurrentHhMm()}`
      : `Quét QR chấm công lúc ${formatCurrentHhMm()}`);

  const nextMap: Record<string, MachineSwipeRecord> = {
    ...existingMap,
    [punchKey]: {
      id: punchKey,
      employeeId: staff.employeeId,
      fullName: staff.fullName,
      department: deptDisplay,
      date: state.dateStr,
      rawInTime: nextInTime,
      rawOutTime: nextOutTime,
      note,
    },
  };

  if (isFace) {
    saveFacePunchMap(year, month, nextMap, deptDisplay);
  } else {
    saveQrPunchMap(year, month, nextMap, deptDisplay);
  }

  playSuccessChime();

  return {
    ok: true,
    mode,
    dateStr: state.dateStr,
    dateIso: state.dateIso,
    inTime: nextInTime,
    outTime: nextOutTime,
    shift,
    status,
    departmentLabel: deptDisplay,
    regularHours,
    totalOtHours,
  };
}

export function playSuccessChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.18);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.14); // A5
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.14);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn('Audio chime error:', e);
  }
}

export function recordEmployeeFacePunch(params: {
  staff: StaffRecord;
  allStaff: StaffRecord[];
  year?: number;
  month?: number;
  day?: number;
  mode?: 'AUTO' | 'IN' | 'OUT';
  note?: string;
}): AttendancePunchResult {
  const now = new Date();
  const year = params.year ?? now.getFullYear();
  const month = params.month ?? now.getMonth() + 1;
  const day = params.day ?? now.getDate();
  const currentState = getDateMatrixPunchState(params.staff, year, month, day, 'FACE');
  const resolvedMode: 'IN' | 'OUT' =
    params.mode === 'IN' || params.mode === 'OUT'
      ? params.mode
      : currentState.suggestedMode;

  return recordEmployeeAttendancePunch({
    staff: params.staff,
    allStaff: params.allStaff,
    year,
    month,
    day,
    mode: resolvedMode,
    shift: currentState.existingShift,
    note: params.note,
    method: 'FACE',
  });
}

