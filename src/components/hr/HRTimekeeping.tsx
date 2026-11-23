import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StaffRecord,
  TimekeepingRecord,
  AttendanceCorrectionRequest,
  AttendanceRecord,
  MachineSwipeRecord,
  AttendanceStatus,
  MatrixDayTimeEntry,
} from '../../types';
import {
  Clock,
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Edit3,
  Trash2,
  Users,
  Check,
  Timer,
  Info,
  X,
  FileUp,
  ArrowRight,
  CalendarClock,
  FileText,
  Eye,
  Printer,
  QrCode,
  ScanFace,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getEmployeeProfileMatrixData,
  MATRIX_UPDATED_EVENT,
  dispatchMatrixUpdatedEvent,
  calculateMatrixDayHoursFromTimes,
  updateEmployeeMatrixDayEntry,
  getQrPunchStorageKey,
  getFacePunchStorageKey,
} from '../../lib/matrixTimekeeping';
import {
  loadQrPunchMap,
  saveQrPunchMap,
  loadFacePunchMap,
  saveFacePunchMap,
} from '../../lib/attendanceQr';
import {
  AbnormalAttendanceHistorySection,
  AbnormalAttendanceModal,
} from './AbnormalAttendanceFormNPTFM008';

interface HRTimekeepingProps {
  data: TimekeepingRecord[];
  allStaff: StaffRecord[];
  onUpdate: (data: TimekeepingRecord[]) => void;
  attendanceRequests?: AttendanceCorrectionRequest[];
  onUpdateRequest?: (r: AttendanceCorrectionRequest[]) => void;
  onRequestCorrection?: (r: AttendanceCorrectionRequest[]) => void;
  attendanceHistory?: AttendanceRecord[];
  onViewProfile?: (staff: StaffRecord) => void;
}

export type DiscrepancyType =
  | 'MATCH'
  | 'MISSING_IN'
  | 'MISSING_OUT'
  | 'MISSING_BOTH'
  | 'LATE_IN'
  | 'EARLY_OUT'
  | 'LATE_AND_EARLY'
  | 'OT_MISMATCH'
  | 'OFF_DAY_MATCH'
  | 'UNSCHEDULED_SWIPE';

export interface ComparisonRow {
  rowId: string;
  staff: StaffRecord;
  day: number;
  dateStr: string; // "DD/MM/YYYY"
  dateIso: string; // "YYYY-MM-DD"
  dayOfWeek: string;
  isSunday: boolean;
  isHoliday: boolean;
  shift: 'DAY' | 'NIGHT';
  shiftLabel: string;

  // BẢNG CHẤM CÔNG (3 cột)
  bcInTime: string;
  bcOutTime: string;
  bcRegularHours: number;
  bcOtHours: number;
  bcStatus: string;
  hasBcWork: boolean;

  // MÁY QUẸT THẺ / CHẤM CÔNG QR / KHUÔN MẶT (3 cột)
  compareSource?: 'MQT' | 'QR' | 'FACE';
  rawInTime: string;
  rawOutTime: string;
  qrInTime?: string;
  qrOutTime?: string;
  faceInTime?: string;
  faceOutTime?: string;
  mqtInTime: string; // After applying rule
  mqtOutTime: string; // After applying rule
  mqtOtHours: number; // Calculated OT
  hasMqtSwipe: boolean;
  isClampedIn: boolean; // e.g. < 8h -> 8h or < 20h -> 20h
  isClampedOut: boolean; // e.g. > 20h -> 20h or > 8h -> 8h
  rawNote?: string;

  // SO SÁNH & PHÂN TÍCH SAI LỆCH
  discrepancyType: DiscrepancyType;
  discrepancyLabel: string;
  discrepancyDetail: string;
  lateMinutes: number;
  earlyMinutes: number;
  otDifference: number; // mqtOt - bcOt
}

export const VI_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Storage key for machine swipe records by month/year
export const getMachineSwipeStorageKey = (year: number, month: number) =>
  `app_timekeeping_machine_swipes_${year}_${month}`;

interface ParsedPunchDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  hasTime: boolean;
  timeStr: string; // "HH:mm"
  fullTimeStr: string; // "HH:mm:ss"
  minutesOfDay: number;
  timestamp: number;
}

interface ImportSummary {
  fileName: string;
  rawRowCount: number;
  dailyRecordCount: number;
  monthCounts: Array<{ year: number; month: number; count: number }>;
  matchedEmployees: Array<{ name: string; employeeId: string; count: number }>;
  unmatchedNames: string[];
}

/**
 * Normalize Excel column header or lookup key (strip accents + handle đ/Đ + remove punctuation)
 */
function normalizeColumnKey(k: string): string {
  return String(k || '')
    .trim()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Normalize Vietnamese full name for matching machine logs (e.g. "NGUYỄN ĐĂNG NINH" <-> "NGUYEN DANG NINH")
 */
function normalizeVietnameseName(name?: any): string {
  if (!name) return '';
  return String(name)
    .trim()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean leading Excel text apostrophe or extra whitespace (e.g. "'2", "'00000004")
 */
function cleanCellText(val?: any): string {
  if (val === undefined || val === null) return '';
  return String(val).trim().replace(/^'+/, '').trim();
}

/**
 * Parse combined date-time values from fingerprint/card machines:
 * - "2026-10-31 07:40:08"
 * - "31/10/2026 07:40:08"
 * - Excel serial numbers (e.g. 46326.319537)
 * - JS Date objects
 */
function parsePunchDateTime(
  raw: any,
  fallbackYear?: number,
  fallbackMonth?: number
): ParsedPunchDateTime | null {
  if (raw === undefined || raw === null || raw === '') return null;

  const buildResult = (
    y: number,
    m: number,
    d: number,
    H = 0,
    M = 0,
    S = 0,
    hasTime = true
  ): ParsedPunchDateTime | null => {
    if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const check = new Date(y, m - 1, d, H, M, S);
    if (
      isNaN(check.getTime()) ||
      check.getFullYear() !== y ||
      check.getMonth() !== m - 1 ||
      check.getDate() !== d
    ) {
      return null;
    }
    const timeStr = hasTime
      ? `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`
      : '';
    const fullTimeStr = hasTime
      ? `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}:${String(S).padStart(2, '0')}`
      : '';
    return {
      year: y,
      month: m,
      day: d,
      hour: H,
      minute: M,
      second: S,
      hasTime,
      timeStr,
      fullTimeStr,
      minutesOfDay: H * 60 + M,
      timestamp: check.getTime(),
    };
  };

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return buildResult(
      raw.getFullYear(),
      raw.getMonth() + 1,
      raw.getDate(),
      raw.getHours(),
      raw.getMinutes(),
      raw.getSeconds(),
      true
    );
  }

  if (typeof raw === 'number') {
    if (raw >= 1 && raw <= 31 && fallbackYear && fallbackMonth) {
      return buildResult(fallbackYear, fallbackMonth, Math.floor(raw), 0, 0, 0, false);
    }
    if (raw > 1000) {
      const parsed = XLSX.SSF.parse_date_code(raw);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        const hasTime = raw % 1 !== 0 || (parsed.H || 0) > 0 || (parsed.M || 0) > 0 || (parsed.S || 0) > 0;
        return buildResult(
          parsed.y,
          parsed.m,
          parsed.d,
          parsed.H || 0,
          parsed.M || 0,
          Math.floor(parsed.S || 0),
          hasTime
        );
      }
    }
    return null;
  }

  const s = cleanCellText(raw);
  if (!s) return null;

  // 1. YYYY-MM-DD[ T]HH:mm(:ss)? or YYYY/MM/DD[ T]HH:mm(:ss)?
  let match = s.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const hasTime = match[4] !== undefined && match[5] !== undefined;
    const H = hasTime ? Number(match[4]) : 0;
    const M = hasTime ? Number(match[5]) : 0;
    const S = match[6] ? Number(match[6]) : 0;
    return buildResult(y, m, d, H, M, S, hasTime);
  }

  // 2. DD/MM/YYYY HH:mm(:ss)? or DD-MM-YYYY HH:mm(:ss)?
  match = s.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (match) {
    const d = Number(match[1]);
    const m = Number(match[2]);
    const y = Number(match[3]);
    const hasTime = match[4] !== undefined && match[5] !== undefined;
    const H = hasTime ? Number(match[4]) : 0;
    const M = hasTime ? Number(match[5]) : 0;
    const S = match[6] ? Number(match[6]) : 0;
    return buildResult(y, m, d, H, M, S, hasTime);
  }

  // 3. Day only ("1" .. "31")
  const dayOnly = Number(s);
  if (!isNaN(dayOnly) && Number.isInteger(dayOnly) && dayOnly >= 1 && dayOnly <= 31 && fallbackYear && fallbackMonth) {
    return buildResult(fallbackYear, fallbackMonth, dayOnly, 0, 0, 0, false);
  }

  return null;
}

/**
 * Helper to convert "HH:mm" to minutes from 00:00
 */
export function timeToMinutes(t?: string): number | null {
  if (!t) return null;
  const s = t.trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (isNaN(h) || isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Standardize time string to "HH:mm"
 */
export function normalizeTimeString(raw?: any): string {
  if (raw === undefined || raw === null || raw === '') return '';
  if (typeof raw === 'number') {
    // Excel decimal fraction of day or full serial datetime
    const frac = raw > 1 ? raw % 1 : raw;
    const totalMinutes = Math.round(frac * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const s = cleanCellText(raw);
  // If datetime string contains date + time, extract the time portion specifically
  const dtMatch = s.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}[T\s]+(\d{1,2}):(\d{2})/) ||
    s.match(/\d{1,2}[-/]\d{1,2}[-/]\d{4}[T\s]+(\d{1,2}):(\d{2})/);
  if (dtMatch) {
    return `${String(Number(dtMatch[1])).padStart(2, '0')}:${dtMatch[2]}`;
  }
  const match = s.match(/(\d{1,2})[:hH-](\d{2})/);
  if (match) {
    const h = String(Number(match[1])).padStart(2, '0');
    const m = match[2];
    return `${h}:${m}`;
  }
  return '';
}

/**
 * Format minutes into readable Vietnamese string e.g. "30 phút" or "1h 15p"
 */
export function formatMinutes(mins: number): string {
  if (mins <= 0) return '0p';
  if (mins < 60) return `${mins} phút`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}p` : `${h} giờ`;
}

/**
 * APPLIES USER SPECIFICATION:
 * Ca ngày:
 * - Trước 8 giờ tính là 8 giờ (ví dụ 07:45 -> 08:00)
 * - Sau 20 giờ tính là 20 giờ (ví dụ 20:15 -> 20:00)
 * Ca đêm:
 * - Trước 20 giờ tính là 20 giờ (ví dụ 19:40 -> 20:00)
 * - Sau 8 giờ tính là 8 giờ (ví dụ 08:15 -> 08:00)
 */
export function calculateMachineTimes(
  rawIn: string,
  rawOut: string,
  shift: 'DAY' | 'NIGHT',
  isSundayOrHoliday = false
): {
  mqtIn: string;
  mqtOut: string;
  mqtOt: number;
  isClampedIn: boolean;
  isClampedOut: boolean;
} {
  const normIn = normalizeTimeString(rawIn);
  const normOut = normalizeTimeString(rawOut);

  let mqtIn = normIn;
  let mqtOut = normOut;
  let isClampedIn = false;
  let isClampedOut = false;
  let mqtOt = 0;

  const inMins = timeToMinutes(normIn);
  const outMins = timeToMinutes(normOut);

  if (shift === 'NIGHT') {
    // --- CA ĐÊM ---
    // Trước 20:00 tính là 20:00 (nếu quẹt từ 15:00 đến 19:59)
    if (inMins !== null) {
      if (inMins < 1200 && inMins >= 900) {
        mqtIn = '20:00';
        isClampedIn = true;
      }
    }
    // Sau 8:00 sáng hôm sau tính là 8:00 (nếu quẹt từ 08:01 đến 12:00)
    if (outMins !== null) {
      if (outMins > 480 && outMins <= 720) {
        mqtOut = '08:00';
        isClampedOut = true;
      }
    }

    const finalInMins = timeToMinutes(mqtIn);
    const finalOutMins = timeToMinutes(mqtOut);

    if (isSundayOrHoliday) {
      // Ngày Chủ Nhật / Ngày Lễ (Ca đêm): tính đúng theo quy chuẩn 20:00 -> 05:00 = 8h, sau 05:00 tính thêm tăng ca (20:00 -> 08:00 = 11h)
      if (finalInMins !== null && finalOutMins !== null) {
        const adjOut = finalOutMins <= finalInMins ? finalOutMins + 24 * 60 : finalOutMins;
        const cappedOut = Math.min(32 * 60, adjOut); // Tối đa 08:00 sáng hôm sau (32:00)
        const effectiveOut = cappedOut > 1740 && cappedOut - 1740 < 15 ? 1740 : cappedOut;
        let span = Math.max(0, effectiveOut - finalInMins);
        if (span >= 6 * 60 && finalInMins <= 23 * 60 && effectiveOut >= 25 * 60) {
          span -= 60;
        }
        mqtOt = Math.round((span / 60) * 10) / 10;
      }
    } else {
      // Ngày thường (Ca đêm): 20:00 - 05:00 (8h). Sau 05:00 (>= 15 phút) tính tăng ca tối đa đến 08:00 (3h).
      if (finalOutMins !== null && finalOutMins > 300 && finalOutMins <= 720) {
        const otMins = Math.min(480, finalOutMins) - 300;
        if (otMins >= 15) {
          mqtOt = Math.round((otMins / 60) * 10) / 10;
        }
      }
    }
  } else {
    // --- CA NGÀY ---
    // Trước 8:00 tính là 8:00 (nếu quẹt từ 05:00 đến 07:59)
    if (inMins !== null) {
      if (inMins < 480 && inMins >= 300) {
        mqtIn = '08:00';
        isClampedIn = true;
      }
    }
    // Sau 20:00 tính là 20:00 (nếu quẹt sau 20:00 đến 23:59)
    if (outMins !== null) {
      if (outMins > 1200) {
        mqtOut = '20:00';
        isClampedOut = true;
      }
    }

    const finalInMins = timeToMinutes(mqtIn);
    const finalOutMins = timeToMinutes(mqtOut);

    if (isSundayOrHoliday) {
      // Ngày Chủ Nhật / Ngày Lễ (Ca ngày): 08:00 -> 17:00 = 8h, sau 17:00 tính thêm tăng ca (08:00 -> 20:00 = 11h)
      if (finalInMins !== null && finalOutMins !== null) {
        const cappedOut = Math.min(1200, finalOutMins); // Tối đa 20:00
        const effectiveOut = cappedOut > 1020 && cappedOut - 1020 < 15 ? 1020 : cappedOut;
        let span = Math.max(0, effectiveOut - finalInMins);
        if (finalInMins < 12 * 60 && effectiveOut > 13 * 60) {
          span -= 60;
        }
        mqtOt = Math.round((span / 60) * 10) / 10;
      }
    } else {
      // Ngày thường (Ca ngày): 08:00 - 17:00 (8h). Sau 17:00 (>= 15 phút) tính tăng ca tối đa đến 20:00 (3h).
      if (finalOutMins !== null && finalOutMins > 1020) {
        const otMins = Math.min(1200, finalOutMins) - 1020;
        if (otMins >= 15) {
          mqtOt = Math.round((otMins / 60) * 10) / 10;
        }
      }
    }
  }

  return {
    mqtIn,
    mqtOut,
    mqtOt,
    isClampedIn,
    isClampedOut,
  };
}

/**
 * Build comparison row for a single employee on a given day
 * Reusable across HRTimekeeping and EmployeeProfile
 */
export function buildComparisonRowForEmployeeDay(params: {
  staff: StaffRecord;
  day: number;
  selectedYear: number;
  selectedMonth: number;
  bcEntry?: MatrixDayTimeEntry;
  holidayMap?: Record<number, boolean>;
  swipeRecord?: MachineSwipeRecord;
  compareSource?: 'MQT' | 'QR' | 'FACE';
}): ComparisonRow {
  const {
    staff,
    day,
    selectedYear,
    selectedMonth,
    bcEntry,
    holidayMap = {},
    swipeRecord,
    compareSource = 'MQT',
  } = params;
  const isFaceMode = compareSource === 'FACE';
  const isQrMode = compareSource === 'QR';
  const srcShort = isFaceMode ? 'Khuôn mặt' : isQrMode ? 'QR' : 'MQT';

  const dateObj = new Date(selectedYear, selectedMonth - 1, day);
  const dayOfWeekNum = dateObj.getDay();
  const dayOfWeek = VI_DAYS[dayOfWeekNum];
  const isSunday = dayOfWeekNum === 0;
  const isHoliday = Boolean(holidayMap[day]);
  const dateStr = `${String(day).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${selectedYear}`;
  const dateIso = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const effectiveShift: 'DAY' | 'NIGHT' = bcEntry?.shift || staff.shift || 'DAY';
  const shiftLabel = effectiveShift === 'NIGHT' ? 'Ca Đêm (20:00 - 08:00)' : 'Ca Ngày (08:00 - 20:00)';

  // 1. DATA FROM BẢNG CHẤM CÔNG (BC / Chấm công thường)
  const bcInTime = bcEntry?.inTime ? normalizeTimeString(bcEntry.inTime) : '';
  const bcOutTime = bcEntry?.outTime ? normalizeTimeString(bcEntry.outTime) : '';
  const bcOtHours = bcEntry
    ? Math.round(
        ((bcEntry.otDayHours || 0) +
          (bcEntry.otNightHours || 0) +
          (bcEntry.otSundayHours || 0) +
          (bcEntry.otSundayNightHours || 0) +
          (bcEntry.otHolidayHours || 0) +
          (bcEntry.otHolidayNightHours || 0)) *
          10
      ) / 10
    : 0;
  const bcStatus = bcEntry?.status || '';
  const isResigned = (bcStatus as string) === 'Đã thôi việc' || (bcStatus as string) === 'Đã nghỉ việc';
  const isRegimeLeave = (bcStatus as string) === 'Nghỉ chế độ';
  const hasBcSundayHours =
    (bcEntry?.otSundayHours || 0) > 0 || (bcEntry?.otSundayNightHours || 0) > 0;
  const isSundayOff =
    isSunday &&
    (!bcEntry ||
      (!bcEntry.inTime && !bcEntry.outTime && !hasBcSundayHours) ||
      bcStatus === 'Nghỉ chủ nhật');
  const hasBcWork = Boolean(
    !isResigned &&
      !isRegimeLeave &&
      !isSundayOff &&
      (bcInTime || bcOutTime || (bcEntry?.regularHours || 0) > 0 || bcOtHours > 0)
  );

  // 2. DATA FROM MÁY QUẸT THẺ (MQT) OR CHẤM CÔNG QR (QR)
  const rawInTime = swipeRecord?.rawInTime || '';
  const rawOutTime = swipeRecord?.rawOutTime || '';
  const hasMqtSwipe = Boolean(rawInTime || rawOutTime);

  // Compute standardized times & OT using shift rules
  const calc = calculateMachineTimes(rawInTime, rawOutTime, effectiveShift, isSunday || isHoliday);
  const mqtInTime = calc.mqtIn;
  const mqtOutTime = calc.mqtOut;
  const mqtOtHours = calc.mqtOt;

  // 3. COMPARE & ANALYZE DISCREPANCIES
  let discrepancyType: DiscrepancyType = 'MATCH';
  let discrepancyLabel = 'Khớp chuẩn';
  let discrepancyDetail = isFaceMode
    ? 'Dữ liệu chấm công khuôn mặt khớp 100% với bảng chấm công thường.'
    : isQrMode
    ? 'Dữ liệu quét QR khớp 100% với bảng chấm công thường.'
    : 'Dữ liệu quẹt thẻ khớp 100% với bảng chấm công.';
  let lateMinutes = 0;
  let earlyMinutes = 0;
  let otDifference = 0;

  if (!hasBcWork) {
    // Ngày không có lịch làm việc theo bảng công (Nghỉ CN, Nghỉ lễ, Nghỉ chế độ, Thôi việc)
    if (!hasMqtSwipe) {
      discrepancyType = 'OFF_DAY_MATCH';
      discrepancyLabel = isSunday ? 'Nghỉ CN' : isHoliday ? 'Nghỉ Lễ' : isRegimeLeave ? 'Nghỉ Chế Độ' : 'Nghỉ Theo Lịch';
      discrepancyDetail = isSunday
        ? 'Nghỉ Chủ Nhật theo quy định.'
        : isHoliday
        ? 'Nghỉ Lễ theo lịch nhà máy.'
        : isRegimeLeave
        ? 'Nhân viên đang nghỉ chế độ.'
        : isResigned
        ? 'Nhân viên đã thôi việc.'
        : 'Nghỉ theo lịch phân công.';
    } else {
      discrepancyType = 'UNSCHEDULED_SWIPE';
      if (isFaceMode && !isSunday && !isHoliday && !isRegimeLeave && !isResigned) {
        discrepancyLabel = 'Có Khuôn mặt · Chưa có BC';
        discrepancyDetail = `Đã chấm công khuôn mặt (${mqtInTime || '--'} - ${mqtOutTime || '--'}), bảng chấm công thường (BC) chưa nhập giờ.`;
      } else if (isQrMode && !isSunday && !isHoliday && !isResigned && !isRegimeLeave) {
        discrepancyLabel = 'Có QR · Chưa có BC';
        discrepancyDetail = `Đã quét QR (${mqtInTime || '--'} - ${mqtOutTime || '--'}), bảng chấm công thường (BC) chưa nhập giờ.`;
      } else {
        discrepancyLabel = isFaceMode
          ? 'Khuôn mặt ngoài lịch'
          : isQrMode
          ? 'Quét QR ngoài lịch'
          : 'Quẹt ngoài lịch';
        discrepancyDetail = isFaceMode
          ? `Có chấm công khuôn mặt ngày nghỉ/ngoài lịch: Vào ${mqtInTime || '--'} - Ra ${mqtOutTime || '--'} (Bảng công thường chưa có giờ)`
          : isQrMode
          ? `Có quét QR ngày nghỉ/ngoài lịch: Vào ${mqtInTime || '--'} - Ra ${mqtOutTime || '--'} (Bảng công thường chưa có giờ)`
          : `Có quẹt thẻ ngày nghỉ/ngoài lịch: Vào ${mqtInTime || '--'} - Ra ${mqtOutTime || '--'}`;
      }
    }
  } else {
    // Bảng công có ca làm việc cần chấm công
    if (!rawInTime && !rawOutTime) {
      discrepancyType = 'MISSING_BOTH';
      discrepancyLabel = isFaceMode
        ? 'Chưa quét mặt'
        : isQrMode
        ? 'Chưa quét QR'
        : 'Chưa quẹt thẻ';
      discrepancyDetail = isFaceMode
        ? `Chưa chấm công khuôn mặt giờ vào và giờ ra (Bảng chấm công thường: ${bcInTime || '08:00'} - ${bcOutTime || '20:00'}).`
        : isQrMode
        ? `Chưa quét QR giờ vào và giờ ra (Bảng chấm công thường: ${bcInTime || '08:00'} - ${bcOutTime || '20:00'}).`
        : `Máy quẹt thẻ chưa ghi nhận giờ vào và giờ ra (BC yêu cầu: ${bcInTime || '08:00'} - ${bcOutTime || '20:00'}).`;
    } else if (!rawInTime && rawOutTime) {
      discrepancyType = 'MISSING_IN';
      discrepancyLabel = 'Thiếu giờ vào';
      discrepancyDetail = isFaceMode
        ? `Thiếu giờ vào bằng Khuôn mặt (Bảng chấm công thường ghi nhận vào lúc ${bcInTime || (effectiveShift === 'NIGHT' ? '20:00' : '08:00')}).`
        : isQrMode
        ? `Thiếu giờ vào bằng QR (Bảng chấm công thường ghi nhận vào lúc ${bcInTime || (effectiveShift === 'NIGHT' ? '20:00' : '08:00')}).`
        : `Thiếu giờ vào trên máy quẹt thẻ (Bảng công ghi nhận vào lúc ${bcInTime || (effectiveShift === 'NIGHT' ? '20:00' : '08:00')}).`;
    } else if (rawInTime && !rawOutTime) {
      discrepancyType = 'MISSING_OUT';
      discrepancyLabel = 'Thiếu giờ ra';
      discrepancyDetail = isFaceMode
        ? `Thiếu giờ ra bằng Khuôn mặt (Bảng chấm công thường ghi nhận ra lúc ${bcOutTime || (effectiveShift === 'NIGHT' ? '08:00' : '20:00')}).`
        : isQrMode
        ? `Thiếu giờ ra bằng QR (Bảng chấm công thường ghi nhận ra lúc ${bcOutTime || (effectiveShift === 'NIGHT' ? '08:00' : '20:00')}).`
        : `Thiếu giờ ra trên máy quẹt thẻ (Bảng công ghi nhận ra lúc ${bcOutTime || (effectiveShift === 'NIGHT' ? '08:00' : '20:00')}).`;
    } else {
      // Có cả giờ vào và giờ ra -> So sánh chi tiết (xử lý ca đêm qua nửa đêm)
      const toShiftMins = (mins: number | null, isOut: boolean): number | null => {
        if (mins === null) return null;
        if (effectiveShift === 'NIGHT' && (isOut ? mins <= 720 : mins < 720)) {
          return mins + 1440;
        }
        return mins;
      };
      const bcInM = toShiftMins(
        timeToMinutes(bcInTime) ?? (effectiveShift === 'NIGHT' ? 1200 : 480),
        false
      );
      const mqtInM = toShiftMins(timeToMinutes(mqtInTime), false);
      const bcOutM = toShiftMins(
        timeToMinutes(bcOutTime) ?? (effectiveShift === 'NIGHT' ? 480 : 1200),
        true
      );
      const mqtOutM = toShiftMins(timeToMinutes(mqtOutTime), true);

      // Đi muộn
      if (mqtInM !== null && bcInM !== null && mqtInM > bcInM) {
        lateMinutes = mqtInM - bcInM;
      }

      // Về sớm
      if (mqtOutM !== null && bcOutM !== null && mqtOutM < bcOutM) {
        earlyMinutes = bcOutM - mqtOutM;
      }

      otDifference = Math.round((mqtOtHours - bcOtHours) * 10) / 10;

      if (lateMinutes > 0 && earlyMinutes > 0) {
        discrepancyType = 'LATE_AND_EARLY';
        discrepancyLabel = 'Muộn & Về sớm';
        discrepancyDetail = `Đi muộn ${formatMinutes(lateMinutes)} (${srcShort}: ${mqtInTime} vs BC: ${bcInTime}) & Về sớm ${formatMinutes(earlyMinutes)} (${srcShort}: ${mqtOutTime} vs BC: ${bcOutTime}).`;
      } else if (lateMinutes > 0) {
        discrepancyType = 'LATE_IN';
        discrepancyLabel = 'Đi muộn';
        discrepancyDetail = `Vào trễ ${formatMinutes(lateMinutes)} (${srcShort}: ${mqtInTime} vs BC: ${bcInTime}).`;
      } else if (earlyMinutes > 0) {
        discrepancyType = 'EARLY_OUT';
        discrepancyLabel = 'Về sớm';
        discrepancyDetail = `Về sớm ${formatMinutes(earlyMinutes)} (${srcShort}: ${mqtOutTime} vs BC: ${bcOutTime}).`;
      } else if (Math.abs(otDifference) >= 0.2) {
        discrepancyType = 'OT_MISMATCH';
        discrepancyLabel = 'Lệch tăng ca';
        discrepancyDetail = `Lệch tăng ca: Bảng công ${bcOtHours}h vs ${isFaceMode ? 'Khuôn mặt' : isQrMode ? 'Quét QR' : 'Máy quẹt'} ${mqtOtHours}h (Chênh ${otDifference > 0 ? '+' : ''}${otDifference}h).`;
      } else {
        discrepancyType = 'MATCH';
        discrepancyLabel = 'Khớp chuẩn';
        discrepancyDetail = isFaceMode
          ? 'Dữ liệu chấm công khuôn mặt khớp 100% với bảng chấm công thường.'
          : isQrMode
          ? 'Dữ liệu quét QR khớp 100% với bảng chấm công thường.'
          : 'Dữ liệu quẹt thẻ khớp 100% với bảng chấm công.';
      }
    }
  }

  return {
    rowId: `${staff.employeeId}_${day}`,
    staff,
    day,
    dateStr,
    dateIso,
    dayOfWeek,
    isSunday,
    isHoliday,
    shift: effectiveShift,
    shiftLabel,
    bcInTime,
    bcOutTime,
    bcRegularHours: bcEntry?.regularHours || 0,
    bcOtHours,
    bcStatus,
    hasBcWork,
    compareSource,
    rawInTime,
    rawOutTime,
    mqtInTime,
    mqtOutTime,
    mqtOtHours,
    hasMqtSwipe,
    isClampedIn: calc.isClampedIn,
    isClampedOut: calc.isClampedOut,
    rawNote: swipeRecord?.note,
    discrepancyType,
    discrepancyLabel,
    discrepancyDetail,
    lateMinutes,
    earlyMinutes,
    otDifference,
  };
}

export interface SwipeExcelImportResult {
  success: boolean;
  errorMsg?: string;
  monthlyUpdates: Map<string, Record<string, MachineSwipeRecord>>;
  monthCounts: Array<{ year: number; month: number; count: number }>;
  matchedEmployees: Array<{ name: string; employeeId: string; count: number }>;
  unmatchedNames: string[];
  rawPunchesParsed: number;
}

export function importMachineSwipesFromArrayBuffer(
  buffer: ArrayBuffer,
  allStaff: StaffRecord[],
  selectedYear: number,
  selectedMonth: number,
  departmentHint = 'MULTI'
): SwipeExcelImportResult {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  const sheetRows = XLSX.utils.sheet_to_json<any[]>(ws, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (!sheetRows || sheetRows.length === 0) {
    return {
      success: false,
      errorMsg: 'File Excel trống hoặc không có dữ liệu!',
      monthlyUpdates: new Map(),
      monthCounts: [],
      matchedEmployees: [],
      unmatchedNames: [],
      rawPunchesParsed: 0,
    };
  }

  const HEADER_KEYWORDS = new Set([
    'idnguoi',
    'ten',
    'hovaten',
    'hoten',
    'hovatennhanvien',
    'hovatennv',
    'thoigian',
    'ngaygio',
    'ngay',
    'bophan',
    'manhanvien',
    'manv',
    'employeeid',
    'userid',
    'macc',
    'giovao',
    'giovaocheckin',
    'checkin',
    'giora',
    'gioracheckout',
    'checkout',
    'tinhtrangchuyencan',
    'diemkiemtrachamcong',
    'nguondulieu',
  ]);

  let headerRowIdx = 0;
  let bestScore = -1;
  const scanLimit = Math.min(sheetRows.length, 15);
  for (let r = 0; r < scanLimit; r++) {
    const row = sheetRows[r];
    if (!Array.isArray(row)) continue;
    let score = 0;
    let nonEmpty = 0;
    row.forEach((cell) => {
      const norm = normalizeColumnKey(String(cell || ''));
      if (norm) nonEmpty++;
      if (HEADER_KEYWORDS.has(norm)) score += 3;
    });
    if (nonEmpty >= 2 && score > bestScore) {
      bestScore = score;
      headerRowIdx = r;
    }
  }

  const headerRow = (sheetRows[headerRowIdx] || []).map((h) => normalizeColumnKey(String(h || '')));
  const headerSet = new Set(headerRow.filter(Boolean));

  const dataObjects: Record<string, any>[] = [];
  for (let r = headerRowIdx + 1; r < sheetRows.length; r++) {
    const cells = sheetRows[r];
    if (!Array.isArray(cells)) continue;
    const hasAnyValue = cells.some((c) => cleanCellText(c) !== '');
    if (!hasAnyValue) continue;
    const obj: Record<string, any> = {};
    headerRow.forEach((colKey, idx) => {
      if (colKey) obj[colKey] = cells[idx];
    });
    dataObjects.push(obj);
  }

  if (dataObjects.length === 0) {
    return {
      success: false,
      errorMsg: 'Không tìm thấy dòng dữ liệu hợp lệ trong file đã tải lên!',
      monthlyUpdates: new Map(),
      monthCounts: [],
      matchedEmployees: [],
      unmatchedNames: [],
      rawPunchesParsed: 0,
    };
  }

  const staffById = new Map<string, StaffRecord>();
  const staffByName = new Map<string, StaffRecord[]>();
  allStaff.forEach((s) => {
    staffById.set(s.employeeId.trim().toLowerCase(), s);
    const normName = normalizeVietnameseName(s.fullName);
    if (normName) {
      const list = staffByName.get(normName) || [];
      list.push(s);
      staffByName.set(normName, list);
    }
  });

  const resolveStaffMatch = (
    rawEmpCode: string,
    rawPersonId: string,
    rawName: string,
    rawDept: string
  ): StaffRecord | undefined => {
    if (rawEmpCode && staffById.has(rawEmpCode.toLowerCase())) {
      return staffById.get(rawEmpCode.toLowerCase());
    }
    if (rawPersonId && staffById.has(rawPersonId.toLowerCase())) {
      return staffById.get(rawPersonId.toLowerCase());
    }
    const normName = normalizeVietnameseName(rawName);
    if (normName && staffByName.has(normName)) {
      const candidates = staffByName.get(normName)!;
      if (candidates.length === 1) return candidates[0];
      if (rawDept) {
        const normDept = normalizeVietnameseName(rawDept);
        const deptMatch = candidates.find(
          (c) =>
            normalizeVietnameseName(c.department).includes(normDept) ||
            normDept.includes(normalizeVietnameseName(c.department))
        );
        if (deptMatch) return deptMatch;
      }
      return candidates[0];
    }
    return undefined;
  };

  const hasPairedInOutCols =
    headerSet.has('giovao') ||
    headerSet.has('giovaocheckin') ||
    headerSet.has('checkin') ||
    headerSet.has('vao') ||
    headerSet.has('giora') ||
    headerSet.has('gioracheckout') ||
    headerSet.has('checkout') ||
    headerSet.has('ra');
  const hasCombinedTimestampCol =
    headerSet.has('thoigian') ||
    headerSet.has('ngaygio') ||
    headerSet.has('datetime') ||
    headerSet.has('timestamp') ||
    headerSet.has('checktime');

  const isRawPunchFormat = hasCombinedTimestampCol && !hasPairedInOutCols;

  const monthlyUpdates = new Map<string, Record<string, MachineSwipeRecord>>();
  const matchedEmpStats = new Map<string, { name: string; employeeId: string; count: number }>();
  const unmatchedSet = new Set<string>();

  const matrixShiftCache = new Map<string, Record<number, 'DAY' | 'NIGHT'>>();
  const getEffectiveShiftForDate = (
    staff: StaffRecord,
    year: number,
    month: number,
    day: number
  ): 'DAY' | 'NIGHT' => {
    const cacheKey = `${staff.employeeId}_${year}_${month}`;
    let dayShifts = matrixShiftCache.get(cacheKey);
    if (!dayShifts) {
      const matrixData = getEmployeeProfileMatrixData(
        staff.employeeId,
        staff.department || departmentHint || 'MULTI',
        year,
        month,
        staff
      );
      dayShifts = {};
      Object.entries(matrixData.days || {}).forEach(([dStr, entry]) => {
        if (entry?.shift) dayShifts![Number(dStr)] = entry.shift;
      });
      matrixShiftCache.set(cacheKey, dayShifts);
    }
    return dayShifts[day] || staff.shift || 'DAY';
  };

  const addRecordToMonthBucket = (
    year: number,
    month: number,
    day: number,
    record: MachineSwipeRecord
  ) => {
    const bucketKey = `${year}_${month}`;
    if (!monthlyUpdates.has(bucketKey)) {
      let existing: Record<string, MachineSwipeRecord> = {};
      try {
        const saved = localStorage.getItem(getMachineSwipeStorageKey(year, month));
        if (saved) existing = JSON.parse(saved);
      } catch {
        existing = {};
      }
      monthlyUpdates.set(bucketKey, existing);
    }
    const bucket = monthlyUpdates.get(bucketKey)!;
    const swipeKey = `${record.employeeId.trim().toLowerCase()}_${day}`;
    bucket[swipeKey] = record;

    const statKey = record.employeeId.trim().toLowerCase();
    const prevStat = matchedEmpStats.get(statKey);
    if (prevStat) {
      prevStat.count += 1;
    } else {
      matchedEmpStats.set(statKey, {
        name: record.fullName || record.employeeId,
        employeeId: record.employeeId,
        count: 1,
      });
    }
  };

  let rawPunchesParsed = 0;

  if (isRawPunchFormat) {
    interface EmployeePunchItem {
      parsed: ParsedPunchDateTime;
      rawDept: string;
      point: string;
      source: string;
    }
    const punchesByStaff = new Map<string, { staff: StaffRecord; punches: EmployeePunchItem[] }>();

    dataObjects.forEach((row) => {
      const rawEmpCode = cleanCellText(
        row['manhanvien'] || row['manv'] || row['employeeid'] || row['macc']
      );
      const rawPersonId = cleanCellText(row['idnguoi'] || row['userid'] || row['id']);
      const rawName = cleanCellText(
        row['ten'] ||
          row['hovaten'] ||
          row['hovatennv'] ||
          row['hovatennhanvien'] ||
          row['hoten'] ||
          row['fullname'] ||
          row['name']
      );
      const rawDept = cleanCellText(row['bophan'] || row['department']);
      const rawTimeVal =
        row['thoigian'] ?? row['ngaygio'] ?? row['datetime'] ?? row['timestamp'] ?? row['checktime'];

      const parsed = parsePunchDateTime(rawTimeVal, selectedYear, selectedMonth);
      if (!parsed || !parsed.hasTime) return;

      const matchedStaff = resolveStaffMatch(rawEmpCode, rawPersonId, rawName, rawDept);
      if (!matchedStaff) {
        const label = rawName || rawEmpCode || rawPersonId;
        if (label) unmatchedSet.add(label);
        return;
      }

      rawPunchesParsed++;
      const sKey = matchedStaff.employeeId.trim().toLowerCase();
      if (!punchesByStaff.has(sKey)) {
        punchesByStaff.set(sKey, { staff: matchedStaff, punches: [] });
      }
      punchesByStaff.get(sKey)!.punches.push({
        parsed,
        rawDept,
        point: cleanCellText(row['diemkiemtrachamcong']),
        source: cleanCellText(row['nguondulieu']),
      });
    });

    punchesByStaff.forEach(({ staff, punches }) => {
      punches.sort((a, b) => a.parsed.timestamp - b.parsed.timestamp);

      const byDateIso = new Map<string, EmployeePunchItem[]>();
      punches.forEach((p) => {
        const iso = `${p.parsed.year}-${String(p.parsed.month).padStart(2, '0')}-${String(p.parsed.day).padStart(2, '0')}`;
        const list = byDateIso.get(iso) || [];
        list.push(p);
        byDateIso.set(iso, list);
      });

      const sortedIsos = Array.from(byDateIso.keys()).sort();
      const consumedTimestamps = new Set<number>();

      sortedIsos.forEach((dateIso) => {
        const [yStr, mStr, dStr] = dateIso.split('-');
        const y = Number(yStr);
        const m = Number(mStr);
        const d = Number(dStr);
        const dayPunches = (byDateIso.get(dateIso) || []).filter(
          (p) => !consumedTimestamps.has(p.parsed.timestamp)
        );
        if (dayPunches.length === 0) return;

        const effectiveShift = getEffectiveShiftForDate(staff, y, m, d);
        let rawInTime = '';
        let rawOutTime = '';
        const noteParts: string[] = [];

        if (effectiveShift === 'NIGHT') {
          const orphanMorning = dayPunches.filter((p) => p.parsed.minutesOfDay <= 12 * 60);
          if (orphanMorning.length > 0) {
            const prevDateObj = new Date(y, m - 1, d - 1);
            const prevY = prevDateObj.getFullYear();
            const prevM = prevDateObj.getMonth() + 1;
            const prevD = prevDateObj.getDate();
            const prevShift = getEffectiveShiftForDate(staff, prevY, prevM, prevD);
            if (prevShift === 'NIGHT') {
              const prevBucket = monthlyUpdates.get(`${prevY}_${prevM}`);
              const prevKey = `${staff.employeeId.trim().toLowerCase()}_${prevD}`;
              const existingPrev = prevBucket?.[prevKey];
              if (!existingPrev?.rawOutTime) {
                const lastMorning = orphanMorning[orphanMorning.length - 1];
                addRecordToMonthBucket(prevY, prevM, prevD, {
                  id: prevKey,
                  employeeId: staff.employeeId,
                  fullName: staff.fullName,
                  department: staff.department || departmentHint || 'MULTI',
                  date: `${String(prevD).padStart(2, '0')}/${String(prevM).padStart(2, '0')}/${prevY}`,
                  rawInTime: existingPrev?.rawInTime || '',
                  rawOutTime: lastMorning.parsed.timeStr,
                  note: `${existingPrev?.note ? `${existingPrev.note} | ` : ''}Ra sáng ${d}/${m}: ${orphanMorning.map((p) => p.parsed.fullTimeStr).join(', ')}`,
                });
                orphanMorning.forEach((p) => consumedTimestamps.add(p.parsed.timestamp));
              }
            }
          }

          const eveningPunches = dayPunches.filter(
            (p) => !consumedTimestamps.has(p.parsed.timestamp) && p.parsed.minutesOfDay >= 15 * 60
          );
          const nextDateObj = new Date(y, m - 1, d + 1);
          const nextIso = `${nextDateObj.getFullYear()}-${String(nextDateObj.getMonth() + 1).padStart(2, '0')}-${String(nextDateObj.getDate()).padStart(2, '0')}`;
          const nextMorningPunches = (byDateIso.get(nextIso) || []).filter(
            (p) => !consumedTimestamps.has(p.parsed.timestamp) && p.parsed.minutesOfDay <= 12 * 60
          );

          if (eveningPunches.length > 0) {
            rawInTime = eveningPunches[0].parsed.timeStr;
            eveningPunches.forEach((p) => consumedTimestamps.add(p.parsed.timestamp));
            noteParts.push(`Vào: ${eveningPunches.map((p) => p.parsed.fullTimeStr).join(', ')}`);

            if (nextMorningPunches.length > 0) {
              rawOutTime = nextMorningPunches[nextMorningPunches.length - 1].parsed.timeStr;
              nextMorningPunches.forEach((p) => consumedTimestamps.add(p.parsed.timestamp));
              noteParts.push(
                `Ra sáng hôm sau: ${nextMorningPunches.map((p) => p.parsed.fullTimeStr).join(', ')}`
              );
            }
          }
        } else {
          const first = dayPunches[0];
          const last = dayPunches[dayPunches.length - 1];
          const spanMinutes = last.parsed.minutesOfDay - first.parsed.minutesOfDay;

          if (spanMinutes >= 30) {
            rawInTime = first.parsed.timeStr;
            rawOutTime = last.parsed.timeStr;
          } else if (first.parsed.minutesOfDay < 12 * 60 + 30) {
            rawInTime = first.parsed.timeStr;
            rawOutTime = '';
          } else {
            rawInTime = '';
            rawOutTime = last.parsed.timeStr;
          }
          dayPunches.forEach((p) => consumedTimestamps.add(p.parsed.timestamp));
          noteParts.push(
            `Quẹt gốc (${dayPunches.length} lượt): ${dayPunches.map((p) => p.parsed.fullTimeStr).join(', ')}`
          );
        }

        if (!rawInTime && !rawOutTime) return;

        const dateStr = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
        const swipeKey = `${staff.employeeId.trim().toLowerCase()}_${d}`;
        addRecordToMonthBucket(y, m, d, {
          id: swipeKey,
          employeeId: staff.employeeId,
          fullName: staff.fullName,
          department: staff.department || departmentHint || 'MULTI',
          date: dateStr,
          rawInTime,
          rawOutTime,
          note: noteParts.join(' | '),
        });
      });
    });
  } else {
    dataObjects.forEach((row) => {
      const rawEmpCode = cleanCellText(
        row['manhanvien'] || row['manv'] || row['employeeid'] || row['macc']
      );
      const rawPersonId = cleanCellText(row['idnguoi'] || row['userid'] || row['id']);
      const rawName = cleanCellText(
        row['ten'] ||
          row['hovaten'] ||
          row['hovatennv'] ||
          row['hovatennhanvien'] ||
          row['hoten'] ||
          row['fullname'] ||
          row['name']
      );
      const rawDept = cleanCellText(row['bophan'] || row['department']);

      const matchedStaff = resolveStaffMatch(rawEmpCode, rawPersonId, rawName, rawDept);
      const empId = matchedStaff ? matchedStaff.employeeId : rawEmpCode || rawPersonId;
      if (!empId) {
        if (rawName) unmatchedSet.add(rawName);
        return;
      }
      if (!matchedStaff && rawName) {
        unmatchedSet.add(rawName);
      }

      const rawDay = row['ngay'] ?? row['date'] ?? row['day'] ?? row['thoigian'];
      const parsedDate = parsePunchDateTime(rawDay, selectedYear, selectedMonth);
      if (!parsedDate) return;

      const rawIn =
        row['giovao'] ?? row['giovaocheckin'] ?? row['checkin'] ?? row['vao'] ?? row['in'] ?? row['vao1'] ?? '';
      const rawOut =
        row['giora'] ?? row['gioracheckout'] ?? row['checkout'] ?? row['ra'] ?? row['out'] ?? row['ra1'] ?? row['ra2'] ?? '';
      const note = cleanCellText(row['ghichu'] || row['note']);

      const normalizedIn = normalizeTimeString(rawIn);
      const normalizedOut = normalizeTimeString(rawOut);
      if (!normalizedIn && !normalizedOut) return;

      rawPunchesParsed++;
      const key = `${empId.trim().toLowerCase()}_${parsedDate.day}`;
      addRecordToMonthBucket(parsedDate.year, parsedDate.month, parsedDate.day, {
        id: key,
        employeeId: empId,
        fullName: matchedStaff?.fullName || rawName || empId,
        department: matchedStaff?.department || rawDept || departmentHint || 'MULTI',
        date: `${String(parsedDate.day).padStart(2, '0')}/${String(parsedDate.month).padStart(2, '0')}/${parsedDate.year}`,
        rawInTime: normalizedIn,
        rawOutTime: normalizedOut,
        note,
      });
    });
  }

  const monthCounts: Array<{ year: number; month: number; count: number }> = [];

  monthlyUpdates.forEach((bucket, bucketKey) => {
    const [yStr, mStr] = bucketKey.split('_');
    const y = Number(yStr);
    const m = Number(mStr);
    try {
      localStorage.setItem(getMachineSwipeStorageKey(y, m), JSON.stringify(bucket));
      dispatchMatrixUpdatedEvent(departmentHint || 'MULTI', y, m);
    } catch (err) {
      console.error('Save multi-month swipes error', err);
    }
    const count = Object.keys(bucket).length;
    monthCounts.push({ year: y, month: m, count });
  });

  monthCounts.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));

  const matchedEmployees = Array.from(matchedEmpStats.values());
  const unmatchedNames = Array.from(unmatchedSet);

  return {
    success: matchedEmployees.length > 0 && monthCounts.length > 0,
    monthlyUpdates,
    monthCounts,
    matchedEmployees,
    unmatchedNames,
    rawPunchesParsed,
  };
}

export const HRTimekeeping: React.FC<HRTimekeepingProps> = ({
  data,
  allStaff,
  onUpdate,
  attendanceRequests = [],
  onRequestCorrection,
  onUpdateRequest,
  onViewProfile,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL'); // 'ALL' or '1'..'31'
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterShift, setFilterShift] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [filterDiscrepancy, setFilterDiscrepancy] = useState<string>('ALL');
  const swipeStorageKey = getMachineSwipeStorageKey(selectedYear, selectedMonth);
  const qrStorageKey = getQrPunchStorageKey(selectedYear, selectedMonth);
  const faceStorageKey = getFacePunchStorageKey(selectedYear, selectedMonth);
  const [swipeRecords, setSwipeRecords] = useState<Record<string, MachineSwipeRecord>>(() => {
    try {
      const saved = localStorage.getItem(swipeStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });
  const [qrPunchRecords, setQrPunchRecords] = useState<Record<string, MachineSwipeRecord>>(() =>
    loadQrPunchMap(selectedYear, selectedMonth)
  );
  const [facePunchRecords, setFacePunchRecords] = useState<Record<string, MachineSwipeRecord>>(() =>
    loadFacePunchMap(selectedYear, selectedMonth)
  );
  const hasManualPunchSourceRef = useRef(false);
  const [punchSource, setPunchSource] = useState<'MQT' | 'QR' | 'FACE'>(() => {
    try {
      const savedSwipes = localStorage.getItem(getMachineSwipeStorageKey(now.getFullYear(), now.getMonth() + 1));
      const swipeCount = savedSwipes ? Object.keys(JSON.parse(savedSwipes) || {}).length : 0;
      const qrCount = Object.keys(loadQrPunchMap(now.getFullYear(), now.getMonth() + 1)).length;
      const faceCount = Object.keys(loadFacePunchMap(now.getFullYear(), now.getMonth() + 1)).length;
      if (faceCount > 0 && swipeCount === 0 && qrCount === 0) return 'FACE';
      if (qrCount > 0 && swipeCount === 0) return 'QR';
    } catch {
      // ignore
    }
    return 'MQT';
  });
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  // Modal manual edit swipe (MQT / QR / FACE)
  const [editingRow, setEditingRow] = useState<ComparisonRow | null>(null);
  const [editingSourceOverride, setEditingSourceOverride] = useState<'MQT' | 'QR' | 'FACE' | null>(null);
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');
  const [editNote, setEditNote] = useState('');

  // Modal edit Bảng Chấm Công (BC)
  const [editingBcRow, setEditingBcRow] = useState<ComparisonRow | null>(null);
  const [bcEditInTime, setBcEditInTime] = useState('');
  const [bcEditOutTime, setBcEditOutTime] = useState('');
  const [bcEditShift, setBcEditShift] = useState<'DAY' | 'NIGHT'>('DAY');
  const [bcEditRegularHours, setBcEditRegularHours] = useState<number>(8);
  const [bcEditOtHours, setBcEditOtHours] = useState<number>(0);
  const [bcEditStatus, setBcEditStatus] = useState<AttendanceStatus>('Đúng giờ');

  // Modal explanation request (Phiếu xác nhận công bất thường NPT-FM-008)
  const [requestModalRow, setRequestModalRow] = useState<ComparisonRow | null>(null);
  const [viewingAbnormalRequest, setViewingAbnormalRequest] =
    useState<AttendanceCorrectionRequest | null>(null);
  const [showRequestsHistoryModal, setShowRequestsHistoryModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Reload swipe, QR & Face punch records when year/month changes
  useEffect(() => {
    let nextSwipes: Record<string, MachineSwipeRecord> = {};
    try {
      const saved = localStorage.getItem(swipeStorageKey);
      nextSwipes = saved ? JSON.parse(saved) : {};
    } catch {
      nextSwipes = {};
    }
    const nextQr = loadQrPunchMap(selectedYear, selectedMonth);
    const nextFace = loadFacePunchMap(selectedYear, selectedMonth);
    setSwipeRecords(nextSwipes);
    setQrPunchRecords(nextQr);
    setFacePunchRecords(nextFace);
    if (!hasManualPunchSourceRef.current) {
      const sCnt = Object.keys(nextSwipes).length;
      const qCnt = Object.keys(nextQr).length;
      const fCnt = Object.keys(nextFace).length;
      if (fCnt > 0 && sCnt === 0 && qCnt === 0) {
        setPunchSource('FACE');
      } else if (qCnt > 0 && sCnt === 0) {
        setPunchSource('QR');
      } else if (sCnt > 0 && qCnt === 0 && fCnt === 0) {
        setPunchSource('MQT');
      }
    }
  }, [swipeStorageKey, qrStorageKey, faceStorageKey, selectedYear, selectedMonth]);

  // Persist machine swipe records
  const saveSwipes = (next: Record<string, MachineSwipeRecord>) => {
    setSwipeRecords(next);
    try {
      localStorage.setItem(swipeStorageKey, JSON.stringify(next));
      dispatchMatrixUpdatedEvent('MULTI', selectedYear, selectedMonth);
    } catch (e) {
      console.error('Save swipes error', e);
    }
  };

  // Persist QR punch records
  const saveQrPunches = (next: Record<string, MachineSwipeRecord>) => {
    setQrPunchRecords(next);
    saveQrPunchMap(selectedYear, selectedMonth, next, 'MULTI');
  };

  // Persist Face punch records
  const saveFacePunches = (next: Record<string, MachineSwipeRecord>) => {
    setFacePunchRecords(next);
    saveFacePunchMap(selectedYear, selectedMonth, next, 'MULTI');
  };

  // Days in month
  const daysInMonth = useMemo(
    () => new Date(selectedYear, selectedMonth, 0).getDate(),
    [selectedYear, selectedMonth]
  );

  // Departments list
  const departments = useMemo(() => {
    const set = new Set<string>();
    allStaff.forEach((s) => {
      if (s.department) set.add(s.department.toUpperCase());
    });
    return Array.from(set);
  }, [allStaff]);

  // Listen to matrix & storage updates
  const [matrixVersion, setMatrixVersion] = useState(0);
  useEffect(() => {
    const handleUpdate = () => {
      setMatrixVersion((v) => v + 1);
      let nextSwipes: Record<string, MachineSwipeRecord> = {};
      try {
        const saved = localStorage.getItem(swipeStorageKey);
        nextSwipes = saved ? JSON.parse(saved) : {};
      } catch {
        nextSwipes = {};
      }
      const nextQr = loadQrPunchMap(selectedYear, selectedMonth);
      const nextFace = loadFacePunchMap(selectedYear, selectedMonth);
      setSwipeRecords(nextSwipes);
      setQrPunchRecords(nextQr);
      setFacePunchRecords(nextFace);
      if (!hasManualPunchSourceRef.current) {
        if (Object.keys(nextFace).length > 0 && Object.keys(nextSwipes).length === 0 && Object.keys(nextQr).length === 0) {
          setPunchSource('FACE');
        } else if (Object.keys(nextQr).length > 0 && Object.keys(nextSwipes).length === 0) {
          setPunchSource('QR');
        }
      }
    };
    window.addEventListener(MATRIX_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(MATRIX_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [swipeStorageKey, qrStorageKey, faceStorageKey, selectedYear, selectedMonth]);

  // --- BUILD COMPARISON MATRIX ROWS ---
  const allComparisonRows = useMemo<ComparisonRow[]>(() => {
    const rows: ComparisonRow[] = [];
    const activePunchMap =
      punchSource === 'FACE'
        ? facePunchRecords
        : punchSource === 'QR'
        ? qrPunchRecords
        : swipeRecords;

    allStaff.forEach((staff) => {
      // Get Matrix Timekeeping Data for this employee for selectedMonth/Year
      const matrixData = getEmployeeProfileMatrixData(
        staff.employeeId,
        staff.department || 'MULTI',
        selectedYear,
        selectedMonth,
        staff
      );

      const daysMap = matrixData.days || {};
      const holidayMap = matrixData.holidays || {};

      for (let day = 1; day <= daysInMonth; day++) {
        const swipeKey = `${staff.employeeId.trim().toLowerCase()}_${day}`;
        const swipeRec = activePunchMap[swipeKey];
        const qrRec = qrPunchRecords[swipeKey];
        const faceRec = facePunchRecords[swipeKey];
        const bcEntry = daysMap[day];

        const built = buildComparisonRowForEmployeeDay({
          staff,
          day,
          selectedYear,
          selectedMonth,
          bcEntry,
          holidayMap,
          swipeRecord: swipeRec,
          compareSource: punchSource,
        });
        rows.push({
          ...built,
          qrInTime: (qrRec?.rawInTime || '').trim(),
          qrOutTime: (qrRec?.rawOutTime || '').trim(),
          faceInTime: (faceRec?.rawInTime || '').trim(),
          faceOutTime: (faceRec?.rawOutTime || '').trim(),
        });
      }
    });

    return rows;
  }, [
    allStaff,
    daysInMonth,
    selectedYear,
    selectedMonth,
    swipeRecords,
    qrPunchRecords,
    facePunchRecords,
    punchSource,
    matrixVersion,
  ]);

  // --- FILTERED ROWS ---
  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allComparisonRows.filter((r) => {
      // 1. Day Filter
      if (selectedDayFilter !== 'ALL' && r.day !== Number(selectedDayFilter)) {
        return false;
      }
      // 2. Search
      if (
        q &&
        !r.staff.fullName.toLowerCase().includes(q) &&
        !r.staff.employeeId.toLowerCase().includes(q) &&
        !r.staff.position.toLowerCase().includes(q)
      ) {
        return false;
      }
      // 3. Dept Filter
      if (filterDept !== 'ALL' && (r.staff.department || '').toUpperCase() !== filterDept) {
        return false;
      }
      // 4. Shift Filter
      if (filterShift !== 'ALL' && r.shift !== filterShift) {
        return false;
      }
      // 5. Discrepancy Filter
      if (filterDiscrepancy === 'ERRORS_ONLY') {
        return (
          r.discrepancyType === 'MISSING_IN' ||
          r.discrepancyType === 'MISSING_OUT' ||
          r.discrepancyType === 'MISSING_BOTH' ||
          r.discrepancyType === 'LATE_IN' ||
          r.discrepancyType === 'EARLY_OUT' ||
          r.discrepancyType === 'LATE_AND_EARLY' ||
          r.discrepancyType === 'OT_MISMATCH' ||
          r.discrepancyType === 'UNSCHEDULED_SWIPE'
        );
      }
      if (filterDiscrepancy === 'MISSING_IN') return r.discrepancyType === 'MISSING_IN';
      if (filterDiscrepancy === 'MISSING_OUT') return r.discrepancyType === 'MISSING_OUT';
      if (filterDiscrepancy === 'MISSING_BOTH') return r.discrepancyType === 'MISSING_BOTH';
      if (filterDiscrepancy === 'LATE_EARLY') {
        return (
          r.discrepancyType === 'LATE_IN' ||
          r.discrepancyType === 'EARLY_OUT' ||
          r.discrepancyType === 'LATE_AND_EARLY'
        );
      }
      if (filterDiscrepancy === 'OT_MISMATCH') return r.discrepancyType === 'OT_MISMATCH';
      if (filterDiscrepancy === 'MATCH') return r.discrepancyType === 'MATCH';

      return true;
    });
  }, [allComparisonRows, selectedDayFilter, searchTerm, filterDept, filterShift, filterDiscrepancy]);

  // --- KPI SUMMARY STATS ---
  const summaryStats = useMemo(() => {
    let totalWorkDays = 0;
    let matchCount = 0;
    let missingInCount = 0;
    let missingOutCount = 0;
    let missingBothCount = 0;
    let lateEarlyCount = 0;
    let otMismatchCount = 0;
    let totalBcOt = 0;
    let totalMqtOt = 0;

    allComparisonRows.forEach((r) => {
      if (r.hasBcWork) {
        totalWorkDays++;
        totalBcOt += r.bcOtHours;
        totalMqtOt += r.mqtOtHours;

        if (r.discrepancyType === 'MATCH') matchCount++;
        else if (r.discrepancyType === 'MISSING_IN') missingInCount++;
        else if (r.discrepancyType === 'MISSING_OUT') missingOutCount++;
        else if (r.discrepancyType === 'MISSING_BOTH') missingBothCount++;
        else if (
          r.discrepancyType === 'LATE_IN' ||
          r.discrepancyType === 'EARLY_OUT' ||
          r.discrepancyType === 'LATE_AND_EARLY'
        ) {
          lateEarlyCount++;
        } else if (r.discrepancyType === 'OT_MISMATCH') {
          otMismatchCount++;
        }
      }
    });

    const errorCount =
      missingInCount + missingOutCount + missingBothCount + lateEarlyCount + otMismatchCount;

    return {
      totalWorkDays,
      matchCount,
      missingInCount,
      missingOutCount,
      missingBothCount,
      lateEarlyCount,
      otMismatchCount,
      errorCount,
      totalBcOt: Math.round(totalBcOt * 10) / 10,
      totalMqtOt: Math.round(totalMqtOt * 10) / 10,
      matchRate: totalWorkDays > 0 ? Math.round((matchCount / totalWorkDays) * 100) : 100,
    };
  }, [allComparisonRows]);

  // --- ACTIONS: EXCEL UPLOAD ---
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const result = importMachineSwipesFromArrayBuffer(
          buffer,
          allStaff,
          selectedYear,
          selectedMonth,
          'MULTI'
        );

        if (result.errorMsg) {
          showToast(result.errorMsg, 'error');
          return;
        }

        const {
          monthlyUpdates,
          monthCounts,
          matchedEmployees,
          unmatchedNames,
          rawPunchesParsed,
          success,
        } = result;

        if (success) {
          const currentBucketKey = `${selectedYear}_${selectedMonth}`;
          if (monthlyUpdates.has(currentBucketKey)) {
            setSwipeRecords({ ...monthlyUpdates.get(currentBucketKey)! });
          } else {
            const bestMonth = [...monthCounts].sort((a, b) => b.count - a.count)[0];
            setSelectedYear(bestMonth.year);
            setSelectedMonth(bestMonth.month);
            const bestKey = `${bestMonth.year}_${bestMonth.month}`;
            setSwipeRecords({ ...(monthlyUpdates.get(bestKey) || {}) });
          }

          setImportSummary({
            fileName: file.name,
            rawRowCount: rawPunchesParsed,
            dailyRecordCount: matchedEmployees.reduce((sum, item) => sum + item.count, 0),
            monthCounts,
            matchedEmployees,
            unmatchedNames,
          });

          const monthLabel = monthCounts.map((mc) => `T${mc.month}/${mc.year}`).join(', ');
          showToast(
            `Đã đọc ${rawPunchesParsed} dòng quẹt thẻ cho ${matchedEmployees.length} nhân viên (${monthLabel})!`
          );
        } else {
          setImportSummary(
            unmatchedNames.length > 0
              ? {
                  fileName: file.name,
                  rawRowCount: 0,
                  dailyRecordCount: 0,
                  monthCounts: [],
                  matchedEmployees: [],
                  unmatchedNames,
                }
              : null
          );
          showToast(
            unmatchedNames.length > 0
              ? `Không khớp được nhân viên nào trong bảng công (tên trong file: ${unmatchedNames.slice(0, 3).join(', ')}).`
              : 'Không tìm thấy dữ liệu thời gian hoặc tên nhân viên hợp lệ trong file Excel.',
            'error'
          );
        }
      } catch (err: any) {
        console.error('Import error', err);
        showToast(`Lỗi khi đọc file Excel: ${err?.message || err}`, 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- ACTIONS: DEMO GENERATOR ---
  const handleGenerateDemoData = () => {
    const nextSwipes: Record<string, MachineSwipeRecord> = {};
    let count = 0;

    allStaff.forEach((staff) => {
      const shift = staff.shift || 'DAY';
      const matrixData = getEmployeeProfileMatrixData(
        staff.employeeId,
        staff.department || 'MULTI',
        selectedYear,
        selectedMonth,
        staff
      );
      const daysMap = matrixData.days || {};

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(selectedYear, selectedMonth - 1, day);
        const dayOfWeekNum = dateObj.getDay();
        const isSunday = dayOfWeekNum === 0;
        const entry = daysMap[day];
        const isResigned =
          (entry?.status as string) === 'Đã thôi việc' ||
          (entry?.status as string) === 'Đã nghỉ việc' ||
          (entry?.status as string) === 'Nghỉ chế độ';

        if (isSunday || isResigned) continue;

        let rawIn = '';
        let rawOut = '';

        // Inject varied realistic cases to showcase the rules
        if (shift === 'DAY') {
          if (day === 4) {
            // Case 1: Thiếu giờ vào (quên quẹt vào, có quẹt ra)
            rawIn = '';
            rawOut = '20:15';
          } else if (day === 11) {
            // Case 2: Thiếu giờ ra (quên quẹt ra, có quẹt vào)
            rawIn = '07:45';
            rawOut = '';
          } else if (day === 18) {
            // Case 3: Chưa quẹt cả vào lẫn ra
            rawIn = '';
            rawOut = '';
          } else if (day === 5) {
            // Case 4: Đi muộn (vào lúc 08:35)
            rawIn = '08:35';
            rawOut = '20:05';
          } else if (day === 16) {
            // Case 5: Về sớm (về lúc 17:00, không tăng ca trong khi bảng công có 3h)
            rawIn = '07:50';
            rawOut = '17:00';
          } else if (day % 3 === 0) {
            // Normal clamped case: quẹt trước 8h (07:40 -> 08:00) & sau 20h (20:20 -> 20:00)
            rawIn = '07:40';
            rawOut = '20:20';
          } else {
            // Standard punch
            rawIn = '07:55';
            rawOut = '20:02';
          }
        } else {
          // NIGHT SHIFT
          if (day === 7) {
            // Thiếu giờ vào
            rawIn = '';
            rawOut = '08:10';
          } else if (day === 14) {
            // Thiếu giờ ra
            rawIn = '19:40';
            rawOut = '';
          } else if (day === 9) {
            // Đi muộn ca đêm (20:25)
            rawIn = '20:25';
            rawOut = '08:15';
          } else if (day === 21) {
            // Về sớm ca đêm (05:00)
            rawIn = '19:50';
            rawOut = '05:00';
          } else {
            // Normal night punch: quẹt trước 20h (19:45 -> 20:00) & sau 8h (08:15 -> 08:00)
            rawIn = '19:45';
            rawOut = '08:15';
          }
        }

        const key = `${staff.employeeId.trim().toLowerCase()}_${day}`;
        nextSwipes[key] = {
          id: key,
          employeeId: staff.employeeId,
          fullName: staff.fullName,
          department: staff.department || 'MULTI',
          date: `${String(day).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${selectedYear}`,
          rawInTime: rawIn,
          rawOutTime: rawOut,
          note: 'Dữ liệu mô phỏng từ máy quẹt thẻ',
        };
        count++;
      }
    });

    saveSwipes(nextSwipes);
    showToast(`Đã tạo dữ liệu quẹt thẻ mẫu cho ${count} lượt làm việc tháng ${selectedMonth}/${selectedYear}!`);
  };

  // --- ACTIONS: CLEAR SWIPES ---
  const handleClearSwipes = () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ dữ liệu quẹt thẻ của Tháng ${selectedMonth}/${selectedYear}?`)) {
      saveSwipes({});
      showToast(`Đã xóa sạch dữ liệu quẹt thẻ tháng ${selectedMonth}/${selectedYear}.`);
    }
  };

  // --- ACTIONS: DOWNLOAD EXCEL TEMPLATE ---
  const handleDownloadTemplate = () => {
    const headers = [
      'Mã Nhân Viên',
      'Họ và Tên Nhân Viên',
      'Bộ Phận',
      'Ngày',
      'Giờ Vào (Check-in)',
      'Giờ Ra (Check-out)',
      'Ghi Chú',
    ];

    const sampleData = allStaff.slice(0, 5).map((s, idx) => [
      s.employeeId,
      s.fullName,
      s.department || 'MULTI',
      `${String(idx + 1).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${selectedYear}`,
      s.shift === 'NIGHT' ? '19:45' : '07:45',
      s.shift === 'NIGHT' ? '08:15' : '20:15',
      'Quẹt thẻ vân tay cổng chính',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
      [`FILE MẪU CHẤM CÔNG MÁY QUẸT THẺ - THÁNG ${selectedMonth}/${selectedYear}`],
      ['Lưu ý: Hệ thống tự động tính ca ngày trước 8h = 8h, sau 20h = 20h; ca đêm trước 20h = 20h, sau 8h = 8h'],
      [],
      headers,
      ...sampleData,
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_May_Quet_The');
    XLSX.writeFile(wb, `Mau_File_May_Quet_The_T${selectedMonth}_${selectedYear}.xlsx`);
    showToast('Đã tải xuống file mẫu máy quẹt thẻ Excel!');
  };

  // --- ACTIONS: EXPORT REPORT ---
  const handleExportReport = () => {
    const wb = XLSX.utils.book_new();
    const isFace = punchSource === 'FACE';
    const isQr = punchSource === 'QR';
    const srcName = isFace ? 'Khuôn Mặt' : isQr ? 'Quét QR' : 'Máy Quẹt';
    const headers = [
      'STT',
      'Họ và Tên',
      'Mã Nhân Viên',
      'Vị Trí / Chức Vụ',
      'Bộ Phận',
      'Ca Làm Việc',
      'Ngày',
      'Thứ',
      // 6 CỘT CHÍNH
      'Giờ Vào (Bảng Công)',
      'Giờ Ra (Bảng Công)',
      'Tăng Ca (Bảng Công)',
      `Giờ Vào (${srcName})`,
      `Giờ Ra (${srcName})`,
      `Tăng Ca (${srcName})`,
      // CỘT QR & KHUÔN MẶT BÊN CẠNH NHAU
      'Cột QR (Vào - Ra)',
      'Cột Khuôn Mặt (Vào - Ra)',
      // KẾT QUẢ ĐỐI SOÁT
      'Trạng Thái Đối Soát',
      'Chi Tiết Sai Lệch',
      isFace ? 'Giờ Khuôn Mặt Gốc (Vào - Ra)' : isQr ? 'Giờ Quét QR Gốc (Vào - Ra)' : 'Giờ Quẹt Gốc (Vào - Ra)',
    ];

    const data = filteredRows.map((r, idx) => [
      idx + 1,
      r.staff.fullName,
      r.staff.employeeId,
      r.staff.position,
      r.staff.department || 'MULTI',
      r.shift === 'NIGHT' ? 'Ca Đêm' : 'Ca Ngày',
      r.dateStr,
      r.dayOfWeek,
      r.bcInTime || '—',
      r.bcOutTime || '—',
      r.bcOtHours > 0 ? `${r.bcOtHours}h` : '0h',
      r.mqtInTime || '—',
      r.mqtOutTime || '—',
      r.mqtOtHours > 0 ? `${r.mqtOtHours}h` : '0h',
      r.qrInTime || r.qrOutTime ? `${r.qrInTime || '--'} - ${r.qrOutTime || '--'}` : '—',
      r.faceInTime || r.faceOutTime ? `${r.faceInTime || '--'} - ${r.faceOutTime || '--'}` : '—',
      r.discrepancyLabel,
      r.discrepancyDetail,
      r.rawInTime || r.rawOutTime
        ? `${r.rawInTime || '--'} - ${r.rawOutTime || '--'}`
        : isFace
        ? 'Chưa quét mặt'
        : isQr
        ? 'Chưa quét QR'
        : 'Chưa quẹt thẻ',
    ]);

    const summaryRow = [
      '',
      'TỔNG HỢP BÁO CÁO',
      '',
      '',
      '',
      '',
      `${filteredRows.length} dòng`,
      '',
      '',
      '',
      `${summaryStats.totalBcOt}h`,
      '',
      '',
      `${summaryStats.totalMqtOt}h`,
      '',
      '',
      `Khớp: ${summaryStats.matchCount} | Thiếu vào: ${summaryStats.missingInCount} | Thiếu ra: ${summaryStats.missingOutCount}`,
      `Lệch TC: ${summaryStats.otMismatchCount} | Đi muộn/sớm: ${summaryStats.lateEarlyCount}`,
      '',
    ];

    const ws = XLSX.utils.aoa_to_sheet([
      [
        `BÁO CÁO ĐỐI SOÁT DỮ LIỆU CÔNG - BẢNG CHẤM CÔNG VS ${
          isFace ? 'CHẤM CÔNG KHUÔN MẶT' : isQr ? 'CHẤM CÔNG QR' : 'MÁY QUẸT THẺ'
        }`,
      ],
      [`Tháng ${selectedMonth}/${selectedYear} · Đơn vị: Newprotec Vina · Tỷ lệ khớp: ${summaryStats.matchRate}%`],
      [],
      headers,
      ...data,
      summaryRow,
    ]);

    XLSX.utils.book_append_sheet(wb, ws, `Doi_Soat_T${selectedMonth}_${selectedYear}`);
    XLSX.writeFile(
      wb,
      `Bao_Cao_Doi_Soat_Cong_${isFace ? 'KhuonMat_' : isQr ? 'QR_' : ''}T${selectedMonth}_${selectedYear}.xlsx`
    );
    showToast('Đã xuất file Excel báo cáo đối soát công thành công!');
  };

  // --- ACTIONS: SAVE MANUAL EDIT ---
  const handleSaveManualEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;

    const targetSource = editingSourceOverride || punchSource;
    const key = `${editingRow.staff.employeeId.trim().toLowerCase()}_${editingRow.day}`;
    const isFace = targetSource === 'FACE';
    const isQr = targetSource === 'QR';
    const nextRecord: MachineSwipeRecord = {
      id: key,
      employeeId: editingRow.staff.employeeId,
      fullName: editingRow.staff.fullName,
      department: editingRow.staff.department,
      date: editingRow.dateStr,
      rawInTime: normalizeTimeString(editInTime),
      rawOutTime: normalizeTimeString(editOutTime),
      note:
        editNote.trim() ||
        (isFace
          ? 'Cập nhật giờ Khuôn mặt bởi HC-NS'
          : isQr
          ? 'Cập nhật giờ QR bởi HC-NS'
          : 'Cập nhật thủ công bởi HC-NS'),
    };

    if (isFace) {
      saveFacePunches({ ...facePunchRecords, [key]: nextRecord });
    } else if (isQr) {
      saveQrPunches({ ...qrPunchRecords, [key]: nextRecord });
    } else {
      saveSwipes({ ...swipeRecords, [key]: nextRecord });
    }

    setEditingRow(null);
    setEditingSourceOverride(null);
    showToast(
      `Đã cập nhật giờ ${
        isFace ? 'chấm công khuôn mặt' : isQr ? 'chấm công QR' : 'quẹt thẻ'
      } ngày ${editingRow.dateStr} cho ${editingRow.staff.fullName}!`
    );
  };

  // --- ACTIONS: EDIT BẢNG CHẤM CÔNG (BC) ---
  const openEditBcModal = (row: ComparisonRow) => {
    setEditingBcRow(row);
    setBcEditInTime(row.bcInTime || '');
    setBcEditOutTime(row.bcOutTime || '');
    setBcEditShift(row.shift);
    setBcEditRegularHours(row.bcRegularHours || 0);
    setBcEditOtHours(row.bcOtHours || 0);
    setBcEditStatus(
      (row.bcStatus as AttendanceStatus) ||
        (row.isHoliday ? 'Nghỉ lễ' : row.isSunday ? 'Nghỉ chủ nhật' : 'Đúng giờ')
    );
  };

  const applyBcTimesAndRecalc = (
    nextIn: string,
    nextOut: string,
    nextShift: 'DAY' | 'NIGHT',
    row: ComparisonRow
  ) => {
    setBcEditInTime(nextIn);
    setBcEditOutTime(nextOut);
    setBcEditShift(nextShift);

    const calc = calculateMatrixDayHoursFromTimes(
      normalizeTimeString(nextIn),
      normalizeTimeString(nextOut),
      nextShift,
      row.isSunday,
      row.isHoliday
    );
    setBcEditRegularHours(calc.regularHours);
    setBcEditOtHours(calc.totalOtHours);
    setBcEditStatus(calc.suggestedStatus);
  };

  const handleSaveBcEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBcRow) return;

    const normIn = normalizeTimeString(bcEditInTime);
    const normOut = normalizeTimeString(bcEditOutTime);
    const regHours = Math.max(0, Math.min(8, Number(bcEditRegularHours) || 0));
    const otHours = Math.max(0, Math.round((Number(bcEditOtHours) || 0) * 10) / 10);

    const res = updateEmployeeMatrixDayEntry({
      staff: editingBcRow.staff,
      allStaff,
      year: selectedYear,
      month: selectedMonth,
      day: editingBcRow.day,
      entryPatch: {
        inTime: normIn,
        outTime: normOut,
        shift: bcEditShift,
        regularHours: editingBcRow.isHoliday || editingBcRow.isSunday ? 0 : regHours,
        otDayHours: !editingBcRow.isHoliday && !editingBcRow.isSunday && bcEditShift === 'DAY' ? otHours : 0,
        otNightHours: !editingBcRow.isHoliday && !editingBcRow.isSunday && bcEditShift === 'NIGHT' ? otHours : 0,
        otSundayHours: !editingBcRow.isHoliday && editingBcRow.isSunday && bcEditShift === 'DAY' ? otHours : 0,
        otSundayNightHours: !editingBcRow.isHoliday && editingBcRow.isSunday && bcEditShift === 'NIGHT' ? otHours : 0,
        otHolidayHours: editingBcRow.isHoliday && bcEditShift === 'DAY' ? otHours : 0,
        otHolidayNightHours: editingBcRow.isHoliday && bcEditShift === 'NIGHT' ? otHours : 0,
        isHoliday: editingBcRow.isHoliday,
        status: bcEditStatus,
      },
    });

    if (!res.ok) {
      showToast(res.error || 'Không thể cập nhật bảng chấm công.', 'error');
      return;
    }

    setMatrixVersion((v) => v + 1);
    setEditingBcRow(null);
    showToast(
      `Đã sửa giờ Bảng chấm công ngày ${editingBcRow.dateStr} cho ${editingBcRow.staff.fullName} (đã đồng bộ Bảng công & Phiếu lương)!`
    );
  };

  // --- ACTIONS: CREATE / CONFIRM ABNORMAL ATTENDANCE (NPT-FM-008) ---
  const handleSubmitAbnormalExplanation = ({
    request,
    applyFixToMachine,
    confirmedInTime,
    confirmedOutTime,
  }: {
    request: AttendanceCorrectionRequest;
    applyFixToMachine: boolean;
    confirmedInTime: string;
    confirmedOutTime: string;
  }) => {
    const updater = onRequestCorrection || onUpdateRequest;
    if (!requestModalRow) return;

    if (updater) {
      updater([request, ...attendanceRequests]);
    }

    if (applyFixToMachine) {
      const key = `${requestModalRow.staff.employeeId.trim().toLowerCase()}_${requestModalRow.day}`;
      const effectiveSrc = requestModalRow.compareSource || punchSource;
      const isFace = effectiveSrc === 'FACE';
      const isQr = effectiveSrc === 'QR';
      const existingRecord = isFace
        ? facePunchRecords[key]
        : isQr
        ? qrPunchRecords[key]
        : swipeRecords[key];
      const nextIn =
        normalizeTimeString(confirmedInTime) ||
        existingRecord?.rawInTime ||
        requestModalRow.rawInTime ||
        '';
      const nextOut =
        normalizeTimeString(confirmedOutTime) ||
        existingRecord?.rawOutTime ||
        requestModalRow.rawOutTime ||
        '';

      const updatedRec: MachineSwipeRecord = {
        id: key,
        employeeId: requestModalRow.staff.employeeId,
        fullName: requestModalRow.staff.fullName,
        department: requestModalRow.staff.department,
        date: requestModalRow.dateStr,
        rawInTime: nextIn,
        rawOutTime: nextOut,
        note: `Xác nhận NPT-FM-008: ${request.reason}`,
      };
      if (isFace) {
        saveFacePunches({ ...facePunchRecords, [key]: updatedRec });
      } else if (isQr) {
        saveQrPunches({ ...qrPunchRecords, [key]: updatedRec });
      } else {
        saveSwipes({ ...swipeRecords, [key]: updatedRec });
      }
      showToast(
        `Đã lưu phiếu NPT-FM-008 & cập nhật giờ (${nextIn || '--:--'} - ${nextOut || '--:--'}) cho ${requestModalRow.staff.fullName}!`
      );
    } else {
      showToast(`Đã tạo phiếu giải trình NPT-FM-008 cho ${requestModalRow.staff.fullName}!`);
    }

    setRequestModalRow(null);
  };

  return (
    <div className="p-3 sm:p-6 max-w-[100vw] space-y-4">
      {/* Top Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="w-full xl:w-auto px-7 sm:px-4 xl:px-0">
          <div className="flex flex-col sm:flex-row items-center justify-center xl:justify-start gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-white flex flex-wrap items-center justify-center sm:justify-start gap-2 uppercase tracking-wide">
                <span>
                  {punchSource === 'FACE'
                    ? 'Dữ Liệu Công & Đối Soát Chấm Công Khuôn Mặt'
                    : punchSource === 'QR'
                    ? 'Dữ Liệu Công & Đối Soát Chấm Công QR'
                    : 'Dữ Liệu Công & Đối Soát Máy Quẹt Thẻ'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                  Tháng {selectedMonth}/{selectedYear}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  Khớp: {summaryStats.matchRate}%
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 sm:mt-0.5 text-center sm:text-left">
                {punchSource === 'FACE'
                  ? 'Đang đối chiếu giờ vào, giờ ra, tăng ca giữa Bảng chấm công thường & Chấm công Khuôn mặt.'
                  : punchSource === 'QR'
                  ? 'Đang đối chiếu 6 cột giờ vào, giờ ra, tăng ca giữa Bảng chấm công thường & Chấm công bằng Mã QR.'
                  : 'Tự động đối chiếu giữa Bảng chấm công, Máy quẹt thẻ, Chấm công QR và Chấm công Khuôn mặt.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Month Navigation */}
        <div className="w-full max-w-md mx-auto xl:max-w-none xl:w-auto xl:mx-0 flex flex-col sm:flex-row sm:flex-wrap items-center justify-center xl:justify-end gap-2">
          {/* Month Switcher */}
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-200">
            <button
              type="button"
              onClick={() => {
                if (selectedMonth === 1) {
                  setSelectedMonth(12);
                  setSelectedYear((y) => y - 1);
                } else {
                  setSelectedMonth((m) => m - 1);
                }
              }}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5">
              Tháng {selectedMonth} / {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => {
                if (selectedMonth === 12) {
                  setSelectedMonth(1);
                  setSelectedYear((y) => y + 1);
                } else {
                  setSelectedMonth((m) => m + 1);
                }
              }}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
              title="Tải lên file máy chấm công / quẹt thẻ (.xlsx, .xls, .csv)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Nạp File Máy Quẹt</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateDemoData}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 text-xs font-semibold cursor-pointer transition-colors"
              title="Tự động tạo dữ liệu quẹt thẻ mẫu tháng này để đối soát thử nghiệm"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dữ Liệu Mẫu</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              title="Tải file mẫu Excel máy quẹt thẻ"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>File Mẫu</span>
            </button>

            <button
              type="button"
              onClick={handleExportReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
              title="Xuất bảng đối soát ra file Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRequestsHistoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900/90 text-rose-200 border border-rose-700/60 text-xs font-bold cursor-pointer transition-colors"
              title="Xem & in lại danh sách Phiếu xác nhận chấm công bất thường (NPT-FM-008)"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>Phiếu NPT-FM-008 ({attendanceRequests.length})</span>
            </button>

            {Object.keys(swipeRecords).length > 0 && (
              <button
                type="button"
                onClick={handleClearSwipes}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 cursor-pointer transition-colors"
                title="Xóa dữ liệu quẹt thẻ tháng này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950/90 border border-emerald-500/60 text-emerald-200'
              : 'bg-rose-950/90 border border-rose-500/60 text-rose-200'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Import Summary Banner */}
      {importSummary && (
        <div className="bg-blue-950/40 border border-blue-700/50 rounded-xl p-3 text-xs flex flex-col gap-2 shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-blue-200 font-semibold">
              <FileUp className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Kết quả đọc file <span className="font-mono text-white">{importSummary.fileName}</span>:
                <span className="text-emerald-300 ml-1">
                  {importSummary.rawRowCount} dòng quẹt gốc → {importSummary.dailyRecordCount} ngày công đã nạp
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setImportSummary(null)}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {importSummary.matchedEmployees.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400">Đã khớp tên với chấm công:</span>
              {importSummary.matchedEmployees.map((emp) => (
                <span
                  key={emp.employeeId}
                  className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/50 text-emerald-200 font-medium"
                >
                  {emp.name} ({emp.employeeId}) · {emp.count} ngày
                </span>
              ))}
              {importSummary.monthCounts.length > 0 && (
                <span className="text-cyan-300 font-mono ml-1">
                  [Tháng:{' '}
                  {importSummary.monthCounts.map((mc) => `${mc.month}/${mc.year}`).join(', ')}]
                </span>
              )}
            </div>
          )}
          {importSummary.unmatchedNames.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Không tìm thấy trong danh sách nhân viên chấm công:</span>
              <span className="font-mono text-amber-200">
                {importSummary.unmatchedNames.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Rules Banner */}
      <div className="bg-slate-900/80 border border-slate-800/90 p-3 rounded-xl text-xs text-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white uppercase text-[11px] block">
              Quy tắc tính giờ máy quẹt thẻ theo ca làm việc:
            </span>
            <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
              <span>
                &bull; <strong className="text-amber-300">Ca Ngày:</strong> Trước 8:00 tính là 8:00 &bull; Sau 20:00 tính là 20:00.
              </span>
              <span>
                &bull; <strong className="text-purple-300">Ca Đêm:</strong> Trước 20:00 tính là 20:00 &bull; Sau 8:00 sáng tính là 8:00.
              </span>
              <span>
                &bull; <strong className="text-rose-300">Cảnh Báo:</strong> Không quẹt giờ vào/ra trên máy nhưng có lịch trong bảng công sẽ tự động gắn cờ <em>Thiếu giờ vào</em> hoặc <em>Thiếu giờ ra</em>.
              </span>
            </div>
          </div>
        </div>
        <div className="shrink-0 flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => {
              hasManualPunchSourceRef.current = true;
              setPunchSource('MQT');
            }}
            className={`px-2.5 py-1 rounded-full border font-bold cursor-pointer transition-colors ${
              punchSource === 'MQT'
                ? 'bg-blue-500/25 text-blue-200 border-blue-500/60'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Quẹt thẻ: {Object.keys(swipeRecords).length} lượt
          </button>
          <button
            type="button"
            onClick={() => {
              hasManualPunchSourceRef.current = true;
              setPunchSource('QR');
            }}
            className={`px-2.5 py-1 rounded-full border font-bold cursor-pointer transition-colors ${
              punchSource === 'QR'
                ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/60'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Quét QR: {Object.keys(qrPunchRecords).length} lượt
          </button>
          <button
            type="button"
            onClick={() => {
              hasManualPunchSourceRef.current = true;
              setPunchSource('FACE');
            }}
            className={`px-2.5 py-1 rounded-full border font-bold cursor-pointer transition-colors ${
              punchSource === 'FACE'
                ? 'bg-sky-500/25 text-sky-200 border-sky-500/60'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Khuôn mặt: {Object.keys(facePunchRecords).length} lượt
          </button>
        </div>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
            <span>Tổng Công Lịch</span>
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {summaryStats.totalWorkDays}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">lượt</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Tháng {selectedMonth}/{selectedYear}
          </div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-700/50 p-3 rounded-xl">
          <div className="text-[10px] text-emerald-300 uppercase font-semibold flex items-center justify-between">
            <span>Khớp Chuẩn 100%</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {summaryStats.matchCount}{' '}
            <span className="text-xs font-sans font-normal text-emerald-300/80">lượt</span>
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5 font-mono">
            {summaryStats.matchRate}% trên tổng công
          </div>
        </div>

        <div className="bg-rose-950/25 border border-rose-700/50 p-3 rounded-xl">
          <div className="text-[10px] text-rose-300 uppercase font-semibold flex items-center justify-between">
            <span>Thiếu Giờ Vào</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">
            {summaryStats.missingInCount}{' '}
            <span className="text-xs font-sans font-normal text-rose-300/80">lượt</span>
          </div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">
            Cần giải trình công
          </div>
        </div>

        <div className="bg-orange-950/25 border border-orange-700/50 p-3 rounded-xl">
          <div className="text-[10px] text-orange-300 uppercase font-semibold flex items-center justify-between">
            <span>Thiếu Giờ Ra</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-xl font-bold font-mono text-orange-400 mt-1">
            {summaryStats.missingOutCount}{' '}
            <span className="text-xs font-sans font-normal text-orange-300/80">lượt</span>
          </div>
          <div className="text-[10px] text-orange-400/80 mt-0.5">
            Cần giải trình công
          </div>
        </div>

        <div className="bg-amber-950/25 border border-amber-700/50 p-3 rounded-xl">
          <div className="text-[10px] text-amber-300 uppercase font-semibold flex items-center justify-between">
            <span>Đi Muộn / Về Sớm</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {summaryStats.lateEarlyCount}{' '}
            <span className="text-xs font-sans font-normal text-amber-300/80">lượt</span>
          </div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">
            Lệch giờ vào hoặc ra
          </div>
        </div>

        <div className="bg-purple-950/25 border border-purple-700/50 p-3 rounded-xl">
          <div className="text-[10px] text-purple-300 uppercase font-semibold flex items-center justify-between">
            <span>
              Tăng Ca BC vs {punchSource === 'FACE' ? 'Khuôn mặt' : punchSource === 'QR' ? 'QR' : 'MQT'}
            </span>
            <Timer className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-300 mt-1">
            {summaryStats.totalMqtOt}h
            <span className="text-xs font-sans font-normal text-slate-400 ml-1">
              / BC: {summaryStats.totalBcOt}h
            </span>
          </div>
          <div className="text-[10px] text-purple-400/80 mt-0.5">
            {summaryStats.otMismatchCount} lượt lệch tăng ca
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Source Mode Switcher: Quẹt thẻ vs QR vs Khuôn mặt */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs">
            <button
              type="button"
              onClick={() => {
                hasManualPunchSourceRef.current = true;
                setPunchSource('MQT');
              }}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                punchSource === 'MQT'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Máy quẹt thẻ
            </button>
            <button
              type="button"
              onClick={() => {
                hasManualPunchSourceRef.current = true;
                setPunchSource('QR');
              }}
              className={`px-2.5 py-1 rounded-md font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                punchSource === 'QR'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Chấm công QR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                hasManualPunchSourceRef.current = true;
                setPunchSource('FACE');
              }}
              className={`px-2.5 py-1 rounded-md font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                punchSource === 'FACE'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ScanFace className="w-3.5 h-3.5" />
              <span>Khuôn mặt</span>
            </button>
          </div>

          {/* Day Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 font-semibold">Xem ngày:</span>
            <select
              value={selectedDayFilter}
              onChange={(e) => setSelectedDayFilter(e.target.value)}
              className="bg-transparent text-cyan-300 font-bold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">
                Tất cả các ngày (1 - {daysInMonth})
              </option>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)} className="bg-slate-900 text-white">
                  Ngày {d}/{selectedMonth}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Tất cả bộ phận</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                Bộ phận {d}
              </option>
            ))}
          </select>

          {/* Shift Filter */}
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Tất cả ca</option>
            <option value="DAY">Ca Ngày (08:00 - 20:00)</option>
            <option value="NIGHT">Ca Đêm (20:00 - 08:00)</option>
          </select>

          {/* Discrepancy Status Filter */}
          <select
            value={filterDiscrepancy}
            onChange={(e) => setFilterDiscrepancy(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái đối soát</option>
            <option value="ERRORS_ONLY">🚨 Chỉ xem có sai lệch / Lỗi</option>
            <option value="MISSING_IN">❌ Thiếu giờ vào</option>
            <option value="MISSING_OUT">❌ Thiếu giờ ra</option>
            <option value="MISSING_BOTH">
              {punchSource === 'FACE'
                ? '⛔ Chưa quét mặt cả ca'
                : punchSource === 'QR'
                ? '⛔ Chưa quét QR cả ca'
                : '⛔ Chưa quẹt thẻ cả ca'}
            </option>
            <option value="LATE_EARLY">⏱️ Đi muộn / Về sớm</option>
            <option value="OT_MISMATCH">⚡ Lệch giờ tăng ca</option>
            <option value="MATCH">✅ Khớp chuẩn 100%</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên, mã nhân viên..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Main Reconciliation Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="w-full overflow-x-auto overflow-y-auto custom-scrollbar max-h-[72vh]">
          <table className="w-full min-w-[1800px] text-left text-xs border-collapse whitespace-nowrap">
            {/* Multi-level Table Header */}
            <thead className="bg-slate-950 text-slate-300 uppercase text-[10px] tracking-wider sticky top-0 z-20 shadow-md whitespace-nowrap">
              <tr className="border-b border-slate-800">
                <th
                  rowSpan={2}
                  className="py-2.5 px-2.5 text-center border-r border-slate-800 w-[44px] sm:sticky sm:left-0 sm:z-30 bg-slate-950"
                >
                  STT
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 border-r border-slate-800 min-w-[210px] sm:sticky sm:left-[44px] sm:z-30 bg-slate-950"
                >
                  Nhân Viên
                </th>
                <th rowSpan={2} className="py-2.5 px-2.5 border-r border-slate-800 min-w-[160px]">
                  Vị Trí / Chức Vụ
                </th>
                <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-slate-800 min-w-[110px]">
                  Ca Làm Việc
                </th>
                <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-slate-800 min-w-[100px]">
                  Ngày
                </th>
                <th rowSpan={2} className="py-2.5 px-2 text-center border-r border-slate-800 w-[50px]">
                  Thứ
                </th>

                {/* HEADER NHÓM 1: BẢNG CHẤM CÔNG */}
                <th
                  colSpan={3}
                  className="py-1.5 px-2 text-center border-r border-slate-800 bg-amber-950/40 text-amber-300 font-bold border-b border-amber-800/40"
                >
                  1. BẢNG CHẤM CÔNG (LỊCH PHÂN CÔNG)
                </th>

                {/* HEADER NHÓM 2: MÁY QUẸT THẺ HOẶC CHẤM CÔNG QR HOẶC KHUÔN MẶT */}
                <th
                  colSpan={3}
                  className={`py-1.5 px-2 text-center border-r border-slate-800 font-bold border-b ${
                    punchSource === 'FACE'
                      ? 'bg-sky-950/45 text-sky-300 border-sky-800/40'
                      : punchSource === 'QR'
                      ? 'bg-emerald-950/45 text-emerald-300 border-emerald-800/40'
                      : 'bg-blue-950/40 text-blue-300 border-blue-800/40'
                  }`}
                >
                  <div className="inline-flex items-center justify-center gap-2 flex-wrap">
                    <span>
                      {punchSource === 'FACE'
                        ? '2. CHẤM CÔNG KHUÔN MẶT'
                        : punchSource === 'QR'
                        ? '2. CHẤM CÔNG BẰNG MÃ QR'
                        : '2. MÁY QUẸT THẺ (DỮ LIỆU ĐÃ QUY CHUẨN)'}
                    </span>
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-950/90 border border-slate-700/80 normal-case tracking-normal">
                      <button
                        type="button"
                        onClick={() => {
                          hasManualPunchSourceRef.current = true;
                          setPunchSource('MQT');
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                          punchSource === 'MQT'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Quẹt thẻ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          hasManualPunchSourceRef.current = true;
                          setPunchSource('QR');
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                          punchSource === 'QR'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        QR
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          hasManualPunchSourceRef.current = true;
                          setPunchSource('FACE');
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                          punchSource === 'FACE'
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Khuôn mặt
                      </button>
                    </div>
                  </div>
                </th>

                {/* HEADER NHÓM 2B: CỘT QR & KHUÔN MẶT BÊN CẠNH NHAU ĐỂ TIỆN THAO TÁC */}
                <th
                  colSpan={2}
                  className="py-1.5 px-2 text-center border-r border-slate-800 bg-sky-950/35 text-sky-300 font-bold border-b border-sky-800/40"
                >
                  THAO TÁC NHANH QR &amp; KHUÔN MẶT
                </th>

                {/* HEADER NHÓM 3: ĐỐI SOÁT & PHÂN TÍCH */}
                <th
                  colSpan={3}
                  className="py-1.5 px-2 text-center bg-cyan-950/40 text-cyan-300 font-bold border-b border-cyan-800/40"
                >
                  {punchSource === 'FACE'
                    ? '3. ĐỐI SOÁT KHUÔN MẶT VS CHẤM CÔNG THƯỜNG'
                    : punchSource === 'QR'
                    ? '3. ĐỐI SOÁT CHẤM CÔNG QR VS CHẤM CÔNG THƯỜNG'
                    : '3. TỰ ĐỘNG SO SÁNH & PHÂN TÍCH SAI LỆCH'}
                </th>
              </tr>

              <tr className="border-b border-slate-800 text-[9px] text-slate-400">
                {/* 3 Cột Bảng Chấm Công */}
                <th className="py-2 px-3 text-center border-r border-slate-800 bg-amber-950/20 text-amber-300 min-w-[95px]">
                  Giờ Vào (BC)
                </th>
                <th className="py-2 px-3 text-center border-r border-slate-800 bg-amber-950/20 text-amber-300 min-w-[95px]">
                  Giờ Ra (BC)
                </th>
                <th className="py-2 px-3 text-center border-r border-slate-800 bg-amber-950/20 text-amber-400 font-bold min-w-[95px]">
                  Tăng Ca (BC)
                </th>

                {/* 3 Cột Máy Quẹt Thẻ / QR / Khuôn mặt */}
                <th
                  className={`py-2 px-3 text-center border-r border-slate-800 min-w-[140px] ${
                    punchSource === 'FACE'
                      ? 'bg-sky-950/20 text-sky-300'
                      : punchSource === 'QR'
                      ? 'bg-emerald-950/20 text-emerald-300'
                      : 'bg-blue-950/20 text-blue-300'
                  }`}
                >
                  {punchSource === 'FACE'
                    ? 'Giờ Vào (Khuôn mặt)'
                    : punchSource === 'QR'
                    ? 'Giờ Vào (QR)'
                    : 'Giờ Vào (MQT)'}
                </th>
                <th
                  className={`py-2 px-3 text-center border-r border-slate-800 min-w-[140px] ${
                    punchSource === 'FACE'
                      ? 'bg-sky-950/20 text-sky-300'
                      : punchSource === 'QR'
                      ? 'bg-emerald-950/20 text-emerald-300'
                      : 'bg-blue-950/20 text-blue-300'
                  }`}
                >
                  {punchSource === 'FACE'
                    ? 'Giờ Ra (Khuôn mặt)'
                    : punchSource === 'QR'
                    ? 'Giờ Ra (QR)'
                    : 'Giờ Ra (MQT)'}
                </th>
                <th
                  className={`py-2 px-3 text-center border-r border-slate-800 font-bold min-w-[95px] ${
                    punchSource === 'FACE'
                      ? 'bg-sky-950/25 text-sky-200'
                      : punchSource === 'QR'
                      ? 'bg-emerald-950/25 text-emerald-200'
                      : 'bg-blue-950/20 text-cyan-300'
                  }`}
                >
                  {punchSource === 'FACE'
                    ? 'Tăng Ca (Mặt)'
                    : punchSource === 'QR'
                    ? 'Tăng Ca (QR)'
                    : 'Tăng Ca (MQT)'}
                </th>

                {/* 2 Cột QR & Khuôn Mặt cạnh nhau */}
                <th className="py-2 px-3 text-center border-r border-slate-800 bg-emerald-950/20 text-emerald-300 min-w-[145px]">
                  Cột QR (Vào / Ra)
                </th>
                <th className="py-2 px-3 text-center border-r border-slate-800 bg-sky-950/20 text-sky-300 min-w-[155px]">
                  Khuôn Mặt (Vào / Ra)
                </th>

                {/* Phân tích */}
                <th className="py-2 px-3 text-center border-r border-slate-800 min-w-[140px] bg-slate-950 text-white font-bold">
                  Trạng Thái Đối Soát
                </th>
                <th className="py-2 px-4 border-r border-slate-800 min-w-[360px] bg-slate-950 text-white font-bold">
                  Chi Tiết Phân Tích Sai Lệch
                </th>
                <th className="py-2 px-3 text-center min-w-[180px] bg-slate-950 text-slate-300">
                  Thao Tác
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/70 text-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-slate-500">
                    Không có dòng dữ liệu nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isMissingIn = row.discrepancyType === 'MISSING_IN';
                  const isMissingOut = row.discrepancyType === 'MISSING_OUT';
                  const isMissingBoth = row.discrepancyType === 'MISSING_BOTH';
                  const isLateOrEarly =
                    row.discrepancyType === 'LATE_IN' ||
                    row.discrepancyType === 'EARLY_OUT' ||
                    row.discrepancyType === 'LATE_AND_EARLY';
                  const isOtMismatch = row.discrepancyType === 'OT_MISMATCH';
                  const isMatch = row.discrepancyType === 'MATCH';

                  return (
                    <tr
                      key={row.rowId}
                      className={`hover:bg-slate-800/40 transition-colors group ${
                        isMissingIn || isMissingOut || isMissingBoth
                          ? 'bg-rose-950/10'
                          : isLateOrEarly
                          ? 'bg-amber-950/10'
                          : isOtMismatch
                          ? 'bg-purple-950/10'
                          : ''
                      }`}
                    >
                      {/* 1. STT */}
                      <td className="py-2 px-2.5 text-center font-mono text-slate-400 border-r border-slate-800 sm:sticky sm:left-0 sm:z-10 bg-slate-950 group-hover:bg-slate-900">
                        {idx + 1}
                      </td>

                      {/* 2. Nhân viên (Tên & Mã NV) */}
                      <td className="py-2 px-3 border-r border-slate-800 sm:sticky sm:left-[44px] sm:z-10 bg-slate-950 group-hover:bg-slate-900">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => onViewProfile?.(row.staff)}
                              className="font-bold text-white hover:text-cyan-300 text-xs text-left truncate block max-w-[170px] cursor-pointer"
                              title="Xem hồ sơ nhân viên"
                            >
                              {row.staff.fullName}
                            </button>
                            <span className="font-mono text-[10px] text-cyan-400 block mt-0.5">
                              {row.staff.employeeId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Vị Trí / Chức Vụ & Bộ Phận */}
                      <td className="py-2 px-2.5 border-r border-slate-800">
                        <div className="font-medium text-slate-300 text-xs truncate max-w-[140px]" title={row.staff.position}>
                          {row.staff.position}
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {row.staff.department || 'MULTI'}
                        </span>
                      </td>

                      {/* 4. Ca Làm Việc */}
                      <td className="py-2 px-2 text-center border-r border-slate-800 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                            row.shift === 'NIGHT'
                              ? 'bg-purple-950/70 text-purple-300 border border-purple-700/50'
                              : 'bg-amber-950/60 text-amber-300 border border-amber-700/50'
                          }`}
                        >
                          {row.shift === 'NIGHT' ? 'Ca Đêm' : 'Ca Ngày'}
                        </span>
                      </td>

                      {/* 5. Ngày */}
                      <td className="py-2 px-2.5 text-center font-mono text-slate-200 border-r border-slate-800 whitespace-nowrap">
                        {row.dateStr}
                      </td>

                      {/* 6. Thứ */}
                      <td
                        className={`py-2 px-2 text-center font-mono font-bold border-r border-slate-800 ${
                          row.isSunday ? 'text-rose-400 bg-rose-950/20' : 'text-slate-400'
                        }`}
                      >
                        {row.dayOfWeek}
                      </td>

                      {/* --- CỘT 1: GIỜ VÀO (BẢNG CHẤM CÔNG) --- */}
                      <td
                        onClick={() => openEditBcModal(row)}
                        className="py-2 px-2 text-center font-mono border-r border-slate-800 bg-amber-950/5 hover:bg-amber-900/25 cursor-pointer transition-colors"
                        title="Nhấn để sửa giờ vào trong Bảng chấm công"
                      >
                        {row.bcInTime ? (
                          <span className="font-semibold text-amber-200 underline decoration-amber-500/30 underline-offset-2">
                            {row.bcInTime}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>

                      {/* --- CỘT 2: GIỜ RA (BẢNG CHẤM CÔNG) --- */}
                      <td
                        onClick={() => openEditBcModal(row)}
                        className="py-2 px-2 text-center font-mono border-r border-slate-800 bg-amber-950/5 hover:bg-amber-900/25 cursor-pointer transition-colors"
                        title="Nhấn để sửa giờ ra trong Bảng chấm công"
                      >
                        {row.bcOutTime ? (
                          <span className="font-semibold text-amber-200 underline decoration-amber-500/30 underline-offset-2">
                            {row.bcOutTime}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>

                      {/* --- CỘT 3: TĂNG CA (BẢNG CHẤM CÔNG) --- */}
                      <td
                        onClick={() => openEditBcModal(row)}
                        className="py-2 px-2 text-center font-mono border-r border-slate-800 bg-amber-950/10 hover:bg-amber-900/25 font-bold text-amber-400 cursor-pointer transition-colors"
                        title="Nhấn để sửa giờ tăng ca trong Bảng chấm công"
                      >
                        {row.bcOtHours > 0 ? `${row.bcOtHours}h` : '0h'}
                      </td>

                      {/* --- CỘT 4: GIỜ VÀO (MÁY QUẸT THẺ) --- */}
                      <td
                        className="py-2 px-3 text-center font-mono border-r border-slate-800 bg-blue-950/5 whitespace-nowrap"
                        title={row.rawNote || undefined}
                      >
                        {row.mqtInTime ? (
                          <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                            <span
                              className={`font-semibold ${
                                isMissingIn
                                  ? 'text-rose-400'
                                  : row.isClampedIn
                                  ? 'text-cyan-300'
                                  : 'text-blue-200'
                              }`}
                            >
                              {row.mqtInTime}
                            </span>
                            {row.isClampedIn && (
                              <span className="text-[10px] text-cyan-400/80 font-mono" title={`Quẹt thực tế: ${row.rawInTime} (Đã quy chuẩn theo ca)`}>
                                (Gốc: {row.rawInTime})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`text-xs font-bold whitespace-nowrap ${
                              row.hasBcWork ? 'text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded' : 'text-slate-600'
                            }`}
                          >
                            {row.hasBcWork ? 'Thiếu vào' : '—'}
                          </span>
                        )}
                      </td>

                      {/* --- CỘT 5: GIỜ RA (MÁY QUẸT THẺ) --- */}
                      <td
                        className="py-2 px-3 text-center font-mono border-r border-slate-800 bg-blue-950/5 whitespace-nowrap"
                        title={row.rawNote || undefined}
                      >
                        {row.mqtOutTime ? (
                          <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                            <span
                              className={`font-semibold ${
                                isMissingOut
                                  ? 'text-rose-400'
                                  : row.isClampedOut
                                  ? 'text-cyan-300'
                                  : 'text-blue-200'
                              }`}
                            >
                              {row.mqtOutTime}
                            </span>
                            {row.isClampedOut && (
                              <span className="text-[10px] text-cyan-400/80 font-mono" title={`Quẹt thực tế: ${row.rawOutTime} (Đã quy chuẩn theo ca)`}>
                                (Gốc: {row.rawOutTime})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`text-xs font-bold whitespace-nowrap ${
                              row.hasBcWork ? 'text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded' : 'text-slate-600'
                            }`}
                          >
                            {row.hasBcWork ? 'Thiếu ra' : '—'}
                          </span>
                        )}
                      </td>

                      {/* --- CỘT 6: TĂNG CA (MÁY QUẸT THẺ / QR / KHUÔN MẶT) --- */}
                      <td className="py-2 px-2 text-center font-mono border-r border-slate-800 bg-blue-950/10 font-bold text-cyan-300">
                        {row.mqtOtHours > 0 ? `${row.mqtOtHours}h` : '0h'}
                      </td>

                      {/* --- CỘT QR NHANH (BÊN CẠNH KHUÔN MẶT) --- */}
                      <td
                        onClick={() => {
                          setEditingSourceOverride('QR');
                          setEditingRow(row);
                          setEditInTime(row.qrInTime || '');
                          setEditOutTime(row.qrOutTime || '');
                          const qRec = qrPunchRecords[`${row.staff.employeeId.trim().toLowerCase()}_${row.day}`];
                          setEditNote(qRec?.note || '');
                        }}
                        className="py-2 px-2.5 text-center font-mono border-r border-slate-800 bg-emerald-950/10 hover:bg-emerald-900/25 cursor-pointer transition-colors whitespace-nowrap"
                        title="Nhấn để chỉnh sửa giờ Chấm Công QR ngày này"
                      >
                        {row.qrInTime || row.qrOutTime ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/50 text-emerald-200 text-[11px] font-bold">
                            <QrCode className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>
                              {row.qrInTime || '--:--'} - {row.qrOutTime || '--:--'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 hover:text-emerald-300">
                            — + QR
                          </span>
                        )}
                      </td>

                      {/* --- CỘT KHUÔN MẶT NHANH (BÊN CẠNH CỘT QR) --- */}
                      <td
                        onClick={() => {
                          setEditingSourceOverride('FACE');
                          setEditingRow(row);
                          setEditInTime(row.faceInTime || '');
                          setEditOutTime(row.faceOutTime || '');
                          const fRec = facePunchRecords[`${row.staff.employeeId.trim().toLowerCase()}_${row.day}`];
                          setEditNote(fRec?.note || '');
                        }}
                        className="py-2 px-2.5 text-center font-mono border-r border-slate-800 bg-sky-950/10 hover:bg-sky-900/25 cursor-pointer transition-colors whitespace-nowrap"
                        title="Nhấn để chỉnh sửa giờ Chấm Công Khuôn Mặt ngày này"
                      >
                        {row.faceInTime || row.faceOutTime ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950/70 border border-sky-600/50 text-sky-200 text-[11px] font-bold">
                            <ScanFace className="w-3 h-3 text-sky-400 shrink-0" />
                            <span>
                              {row.faceInTime || '--:--'} - {row.faceOutTime || '--:--'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 hover:text-sky-300">
                            — + Mặt
                          </span>
                        )}
                      </td>

                      {/* --- KẾT QUẢ ĐỐI SOÁT (STATUS BADGE) --- */}
                      <td className="py-2 px-2 text-center border-r border-slate-800 whitespace-nowrap">
                        {isMatch && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Khớp chuẩn</span>
                          </span>
                        )}
                        {isMissingIn && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-600 text-[10px] font-bold">
                            <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>Thiếu giờ vào</span>
                          </span>
                        )}
                        {isMissingOut && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-950 text-orange-300 border border-orange-600 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0" />
                            <span>Thiếu giờ ra</span>
                          </span>
                        )}
                        {isMissingBoth && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-700 text-[10px] font-bold">
                            <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                            <span>{row.discrepancyLabel}</span>
                          </span>
                        )}
                        {row.discrepancyType === 'LATE_IN' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600 text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Đi muộn</span>
                          </span>
                        )}
                        {row.discrepancyType === 'EARLY_OUT' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-950 text-orange-300 border border-orange-600 text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-orange-400 shrink-0" />
                            <span>Về sớm</span>
                          </span>
                        )}
                        {row.discrepancyType === 'LATE_AND_EARLY' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600 text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Muộn &amp; Về sớm</span>
                          </span>
                        )}
                        {isOtMismatch && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-600 text-[10px] font-bold">
                            <Timer className="w-3 h-3 text-purple-400 shrink-0" />
                            <span>Lệch tăng ca</span>
                          </span>
                        )}
                        {row.discrepancyType === 'OFF_DAY_MATCH' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 text-[10px]">
                            <span>{row.discrepancyLabel}</span>
                          </span>
                        )}
                        {row.discrepancyType === 'UNSCHEDULED_SWIPE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-600 text-[10px] font-bold">
                            <AlertCircle className="w-3 h-3 text-fuchsia-400 shrink-0" />
                            <span>{row.discrepancyLabel}</span>
                          </span>
                        )}
                      </td>

                      {/* --- CHI TIẾT PHÂN TÍCH SAI LỆCH --- */}
                      <td className="py-2 px-4 border-r border-slate-800 text-xs whitespace-nowrap">
                        <span
                          className={`whitespace-nowrap ${
                            isMissingIn || isMissingOut || isMissingBoth
                              ? 'text-rose-300 font-medium'
                              : isLateOrEarly
                              ? 'text-amber-300'
                              : isOtMismatch
                              ? 'text-purple-300'
                              : isMatch
                              ? 'text-emerald-400/90'
                              : 'text-slate-400'
                          }`}
                          title={row.discrepancyDetail}
                        >
                          {row.discrepancyDetail}
                        </span>
                      </td>

                      {/* --- THAO TÁC (SỬA BC / SỬA MQT / GIẢI TRÌNH) --- */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditBcModal(row)}
                            className="inline-flex items-center gap-1 px-1.5 py-1 rounded bg-amber-950/80 hover:bg-amber-600 text-amber-300 hover:text-slate-950 border border-amber-700/60 text-[10px] font-bold cursor-pointer transition-colors"
                            title="Sửa giờ trong Bảng chấm công (đồng bộ sang Bảng công & Phiếu lương)"
                          >
                            <CalendarClock className="w-3 h-3" />
                            <span>Sửa BC</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingSourceOverride(null);
                              setEditingRow(row);
                              setEditInTime(row.rawInTime || row.mqtInTime || '');
                              setEditOutTime(row.rawOutTime || row.mqtOutTime || '');
                              setEditNote(row.rawNote || '');
                            }}
                            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                              punchSource === 'FACE'
                                ? 'bg-sky-950/70 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-700/50'
                                : punchSource === 'QR'
                                ? 'bg-emerald-950/70 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-700/50'
                                : 'bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white'
                            }`}
                            title={
                              punchSource === 'FACE'
                                ? 'Chỉnh sửa giờ Chấm công Khuôn mặt ngày này'
                                : punchSource === 'QR'
                                ? 'Chỉnh sửa giờ Chấm công QR ngày này'
                                : 'Chỉnh sửa giờ Máy quẹt thẻ ngày này'
                            }
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>
                              {punchSource === 'FACE' ? 'Mặt' : punchSource === 'QR' ? 'QR' : 'MQT'}
                            </span>
                          </button>

                          {(isMissingIn || isMissingOut || isMissingBoth || isLateOrEarly || isOtMismatch || row.discrepancyType === 'UNSCHEDULED_SWIPE') && (
                            <button
                              type="button"
                              onClick={() => setRequestModalRow(row)}
                              className="px-1.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 text-[10px] font-semibold cursor-pointer transition-colors"
                              title="Mở phiếu xác nhận chấm công bất thường (NPT-FM-008) & sửa giờ công"
                            >
                              Giải trình
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LỊCH SỬ TẤT CẢ NHÂN VIÊN ĐÃ XÁC NHẬN GIẢI TRÌNH CÔNG & ĐÃ IN (CHỈ XEM & IN LẠI) */}
      <AbnormalAttendanceHistorySection attendanceRequests={attendanceRequests} />

      {/* MODAL 1: CHỈNH SỬA THỦ CÔNG GIỜ QUẸT THẺ / QR / KHUÔN MẶT */}
      {editingRow && (() => {
        const modalSource = editingSourceOverride || punchSource;
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                    {modalSource === 'FACE' ? (
                      <ScanFace className="w-4 h-4 text-sky-400" />
                    ) : modalSource === 'QR' ? (
                      <QrCode className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Edit3 className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase">
                      {modalSource === 'FACE'
                        ? 'Cập Nhật Giờ Khuôn Mặt'
                        : modalSource === 'QR'
                        ? 'Cập Nhật Giờ Chấm Công QR'
                        : 'Cập Nhật Giờ Quẹt Thẻ'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ngày {editingRow.dateStr} ({editingRow.dayOfWeek}) · {editingRow.shiftLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRow(null);
                    setEditingSourceOverride(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
                <div className="text-slate-300">
                  Nhân viên: <strong className="text-white font-sans">{editingRow.staff.fullName}</strong> ({editingRow.staff.employeeId})
                </div>
                <div className="text-slate-400 text-[11px]">
                  Giờ bảng công (BC): <span className="text-amber-300 font-bold">{editingRow.bcInTime || '—'} - {editingRow.bcOutTime || '—'}</span> (Tăng ca: {editingRow.bcOtHours}h)
                </div>
              </div>

              <form onSubmit={handleSaveManualEdit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Giờ Vào Thực Tế
                    </label>
                    <input
                      type="time"
                      value={editInTime}
                      onChange={(e) => setEditInTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-center text-white text-sm focus:border-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Ca ngày &lt; 08:00 sẽ tính 08:00
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Giờ Ra Thực Tế
                    </label>
                    <input
                      type="time"
                      value={editOutTime}
                      onChange={(e) => setEditOutTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-center text-white text-sm focus:border-blue-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Ca ngày &gt; 20:00 sẽ tính 20:00
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Ghi Chú Bổ Sung</label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Lý do bổ sung (quên quẹt, được tổ trưởng xác nhận...)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRow(null);
                      setEditingSourceOverride(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                  >
                    {modalSource === 'FACE'
                      ? 'Lưu Giờ Khuôn Mặt'
                      : modalSource === 'QR'
                      ? 'Lưu Giờ QR'
                      : 'Lưu Giờ Quẹt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: PHIẾU XÁC NHẬN CHẤM CÔNG BẤT THƯỜNG (NPT-FM-008) GỘP TRONG NÚT GIẢI TRÌNH */}
      {requestModalRow && (
        <AbnormalAttendanceModal
          mode="explain"
          sourceContext={{
            staff: requestModalRow.staff,
            dateStr: requestModalRow.dateStr,
            dayOfWeek: requestModalRow.dayOfWeek,
            shift: requestModalRow.shift,
            bcInTime: requestModalRow.bcInTime,
            bcOutTime: requestModalRow.bcOutTime,
            bcOtHours: requestModalRow.bcOtHours,
            rawInTime: requestModalRow.rawInTime,
            rawOutTime: requestModalRow.rawOutTime,
            mqtInTime: requestModalRow.mqtInTime,
            mqtOutTime: requestModalRow.mqtOutTime,
            discrepancyType: requestModalRow.discrepancyType,
            discrepancyLabel: requestModalRow.discrepancyLabel,
            discrepancyDetail: requestModalRow.discrepancyDetail,
            sourceMode: punchSource,
          }}
          existingRequests={attendanceRequests}
          onClose={() => setRequestModalRow(null)}
          onSubmitExplanation={handleSubmitAbnormalExplanation}
        />
      )}

      {/* MODAL XEM / IN LẠI PHIẾU NPT-FM-008 TỪ LỊCH SỬ */}
      {viewingAbnormalRequest && (
        <AbnormalAttendanceModal
          mode="view"
          existingRequest={viewingAbnormalRequest}
          existingRequests={attendanceRequests}
          onClose={() => setViewingAbnormalRequest(null)}
        />
      )}

      {/* MODAL DANH SÁCH LỊCH SỬ PHIẾU NPT-FM-008 */}
      {showRequestsHistoryModal && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowRequestsHistoryModal(false)}
        >
          <div
            className="bg-[#080f1e] border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#050b16] border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-white uppercase">
                <FileText className="w-4 h-4 text-rose-400" />
                <span>Lịch Sử Phiếu Xác Nhận Chấm Công Bất Thường (NPT-FM-008)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestsHistoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar text-xs">
              {attendanceRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  Chưa có phiếu xác nhận chấm công bất thường nào được tạo.
                </div>
              ) : (
                <div className="space-y-2">
                  {attendanceRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white uppercase">{req.fullName}</span>
                          <span className="font-mono text-cyan-400">({req.employeeId})</span>
                          <span className="font-mono text-amber-300 font-semibold">
                            Ngày: {req.date}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              req.status === 'APPROVED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                                : 'bg-amber-950 text-amber-300 border border-amber-700/50'
                            }`}
                          >
                            {req.status === 'APPROVED' ? 'Đã xác nhận sửa' : req.status}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Vào: <strong className="text-slate-200">{req.inTime || '—'}</strong> · Ra:{' '}
                          <strong className="text-slate-200">{req.outTime || '—'}</strong> ·{' '}
                          {req.reasonCategory === 'SYSTEM' ? 'Lỗi hệ thống' : 'Lỗi cá nhân'}
                        </div>
                        <p className="text-slate-300">{req.reason}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewingAbnormalRequest(req)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <Printer className="w-3.5 h-3.5" />
                          <span>Xem / In NPT-FM-008</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CHỈNH SỬA GIỜ TRONG BẢNG CHẤM CÔNG (BC) */}
      {editingBcRow && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-700/50 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase">
                    Sửa Giờ Trong Bảng Chấm Công
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Ngày {editingBcRow.dateStr} ({editingBcRow.dayOfWeek}) ·{' '}
                    {editingBcRow.isHoliday
                      ? 'Ngày Lễ'
                      : editingBcRow.isSunday
                      ? 'Chủ Nhật'
                      : 'Ngày Thường'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBcRow(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reference Panel: BC vs MQT */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-300">
                  Nhân viên: <strong className="text-white">{editingBcRow.staff.fullName}</strong>{' '}
                  <span className="font-mono text-cyan-400">({editingBcRow.staff.employeeId})</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {editingBcRow.staff.position}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 border-t border-slate-800/80 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-amber-950/20 border border-amber-800/30">
                  <div className="text-[10px] font-sans text-amber-400 uppercase font-bold mb-0.5">
                    Bảng Công Hiện Tại
                  </div>
                  <div className="text-amber-200 font-bold">
                    {editingBcRow.bcInTime || '—'} → {editingBcRow.bcOutTime || '—'}
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    Chuẩn: {editingBcRow.bcRegularHours}h · Tăng ca: {editingBcRow.bcOtHours}h
                  </div>
                </div>

                <div
                  className={`p-2 rounded-lg border ${
                    punchSource === 'FACE'
                      ? 'bg-sky-950/20 border-sky-800/30'
                      : punchSource === 'QR'
                      ? 'bg-emerald-950/20 border-emerald-800/30'
                      : 'bg-blue-950/20 border-blue-800/30'
                  }`}
                >
                  <div
                    className={`text-[10px] font-sans uppercase font-bold mb-0.5 ${
                      punchSource === 'FACE'
                        ? 'text-sky-400'
                        : punchSource === 'QR'
                        ? 'text-emerald-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {punchSource === 'FACE'
                      ? 'Chấm Công Khuôn Mặt (Quy Chuẩn)'
                      : punchSource === 'QR'
                      ? 'Chấm Công QR (Quy Chuẩn)'
                      : 'Máy Quẹt Thẻ (Quy Chuẩn)'}
                  </div>
                  <div className="text-blue-200 font-bold">
                    {editingBcRow.mqtInTime || '—'} → {editingBcRow.mqtOutTime || '—'}
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    Tăng ca {punchSource === 'FACE' ? 'Khuôn mặt' : punchSource === 'QR' ? 'QR' : 'MQT'}: {editingBcRow.mqtOtHours}h
                  </div>
                </div>
              </div>

              {editingBcRow.hasMqtSwipe && (
                <button
                  type="button"
                  onClick={() =>
                    applyBcTimesAndRecalc(
                      editingBcRow.mqtInTime || bcEditInTime,
                      editingBcRow.mqtOutTime || bcEditOutTime,
                      bcEditShift,
                      editingBcRow
                    )
                  }
                  className="w-full py-1.5 px-3 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-700/60 font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Lấy theo giờ{' '}
                    {punchSource === 'FACE'
                      ? 'Khuôn mặt'
                      : punchSource === 'QR'
                      ? 'Chấm công QR'
                      : 'Máy quẹt thẻ'}{' '}
                    ({editingBcRow.mqtInTime || bcEditInTime || '--'} →{' '}
                    {editingBcRow.mqtOutTime || bcEditOutTime || '--'})
                  </span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveBcEdit} className="space-y-3 text-xs">
              {/* Time Inputs + Shift */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Giờ Vào (BC)</label>
                  <input
                    type="time"
                    value={bcEditInTime}
                    onChange={(e) =>
                      applyBcTimesAndRecalc(e.target.value, bcEditOutTime, bcEditShift, editingBcRow)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-center text-white text-sm focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Giờ Ra (BC)</label>
                  <input
                    type="time"
                    value={bcEditOutTime}
                    onChange={(e) =>
                      applyBcTimesAndRecalc(bcEditInTime, e.target.value, bcEditShift, editingBcRow)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-center text-white text-sm focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Ca Làm Việc</label>
                  <select
                    value={bcEditShift}
                    onChange={(e) =>
                      applyBcTimesAndRecalc(
                        bcEditInTime,
                        bcEditOutTime,
                        e.target.value as 'DAY' | 'NIGHT',
                        editingBcRow
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-semibold focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="DAY">Ca Ngày</option>
                    <option value="NIGHT">Ca Đêm</option>
                  </select>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Mẫu nhanh:</span>
                <button
                  type="button"
                  onClick={() => applyBcTimesAndRecalc('08:00', '17:00', 'DAY', editingBcRow)}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  Ca ngày 8h (08:00-17:00)
                </button>
                <button
                  type="button"
                  onClick={() => applyBcTimesAndRecalc('08:00', '20:00', 'DAY', editingBcRow)}
                  className="px-2 py-0.5 rounded text-[10px] bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/40 cursor-pointer"
                >
                  Ca ngày +3h TC (08:00-20:00)
                </button>
                <button
                  type="button"
                  onClick={() => applyBcTimesAndRecalc('20:00', '05:00', 'NIGHT', editingBcRow)}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-purple-200 cursor-pointer"
                >
                  Ca đêm 8h (20:00-05:00)
                </button>
                <button
                  type="button"
                  onClick={() => applyBcTimesAndRecalc('20:00', '08:00', 'NIGHT', editingBcRow)}
                  className="px-2 py-0.5 rounded text-[10px] bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800/40 cursor-pointer"
                >
                  Ca đêm +3h TC (20:00-08:00)
                </button>
                <button
                  type="button"
                  onClick={() => applyBcTimesAndRecalc('', '', bcEditShift, editingBcRow)}
                  className="px-2 py-0.5 rounded text-[10px] bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/40 cursor-pointer"
                >
                  Nghỉ ngày này
                </button>
              </div>

              {/* Regular Hours, OT Hours, Status */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Giờ Chuẩn (h)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={8}
                    step={0.1}
                    disabled={editingBcRow.isSunday || editingBcRow.isHoliday}
                    value={editingBcRow.isSunday || editingBcRow.isHoliday ? 0 : bcEditRegularHours}
                    onChange={(e) => setBcEditRegularHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-center text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-amber-300 font-medium mb-1">
                    {editingBcRow.isHoliday
                      ? 'Giờ Lễ (h)'
                      : editingBcRow.isSunday
                      ? 'Giờ Chủ Nhật (h)'
                      : 'Tăng Ca BC (h)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.1}
                    value={bcEditOtHours}
                    onChange={(e) => setBcEditOtHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-amber-700/60 rounded-lg p-2 font-mono text-center text-amber-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Trạng Thái</label>
                  <select
                    value={bcEditStatus}
                    onChange={(e) => setBcEditStatus(e.target.value as AttendanceStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-semibold"
                  >
                    <option value="Đúng giờ">Đúng giờ</option>
                    <option value="Đi muộn">Đi muộn</option>
                    <option value="Về sớm">Về sớm</option>
                    <option value="Nghỉ phép">Nghỉ phép</option>
                    <option value="Nghỉ ốm">Nghỉ ốm</option>
                    <option value="Nghỉ lễ">Nghỉ lễ</option>
                    <option value="Nghỉ chủ nhật">Nghỉ chủ nhật</option>
                    <option value="Vắng mặt">Vắng mặt</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-[11px] text-amber-200/90 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Thay đổi sẽ được lưu trực tiếp vào <strong>Bảng chấm công</strong> và tự động cập nhật sang <strong>Hồ sơ nhân viên</strong> &amp; <strong>Bảng lương</strong>.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBcRow(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow-md"
                >
                  Lưu Bảng Chấm Công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
