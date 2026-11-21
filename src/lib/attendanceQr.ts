import { AttendanceStatus, StaffRecord } from '../types';
import {
  calculateMatrixDayHoursFromTimes,
  getEmployeeProfileMatrixData,
  updateEmployeeMatrixDayEntry,
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
  day: number
): DayPunchState {
  const { days, holidays, sourceDepartment } = getEmployeeProfileMatrixData(
    staff.employeeId,
    staff.department || 'MULTI',
    year,
    month,
    staff
  );

  const entry = days[day];
  const isRealSaved = Boolean(
    entry &&
      !entry.isAutoDefault &&
      (entry.isManual || entry.isRestored || entry.leaveRecordId !== undefined)
  );
  const existingInTime = isRealSaved ? (entry?.inTime || '').trim() : '';
  const existingOutTime = isRealSaved ? (entry?.outTime || '').trim() : '';
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
  method?: 'QR' | 'MANUAL';
}): AttendancePunchResult {
  const { staff, allStaff, year, month, day, mode } = params;
  const state = getDateMatrixPunchState(staff, year, month, day);
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

  if (!nextInTime && !nextOutTime) {
    return {
      ok: false,
      error: 'Vui lòng nhập ít nhất Giờ Vào hoặc Giờ Ra hợp lệ.',
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
  let otDayHours = 0;
  let otNightHours = 0;
  let otSundayHours = 0;
  let otSundayNightHours = 0;
  let otHolidayHours = 0;
  let otHolidayNightHours = 0;
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
    otDayHours = calc.otDayHours;
    otNightHours = calc.otNightHours;
    otSundayHours = calc.otSundayHours;
    otSundayNightHours = calc.otSundayNightHours;
    otHolidayHours = calc.otHolidayHours;
    otHolidayNightHours = calc.otHolidayNightHours;
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

  const methodTag = params.method === 'MANUAL' ? 'Chấm công thủ công' : 'Quét QR chấm công';
  const note = params.note?.trim() || `${methodTag} (${formatCurrentHhMm()})`;

  const updateRes = updateEmployeeMatrixDayEntry({
    staff,
    allStaff: allStaff.length > 0 ? allStaff : [staff],
    year,
    month,
    day,
    entryPatch: {
      inTime: nextInTime,
      outTime: nextOutTime,
      shift,
      regularHours,
      otDayHours,
      otNightHours,
      otSundayHours,
      otSundayNightHours,
      otHolidayHours,
      otHolidayNightHours,
      isHoliday: state.isHoliday,
      status,
      note,
    },
  });

  const deptDisplay = staff.department?.trim().toUpperCase() || updateRes.sourceDepartment || 'MULTI';

  if (!updateRes.ok) {
    return {
      ok: false,
      error: updateRes.error || 'Không thể lưu dữ liệu vào bảng chấm công.',
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
