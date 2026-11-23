import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AttendanceRecord,
  AttendanceStatus,
  Language,
  LeaveRegistrationRecord,
  LeaveRegistrationType,
  StaffRecord,
} from '../../types';
import {
  exportFlatAttendanceBackupRows,
  getAllStoredMatrixSnapshots,
  parseBackupDateToIso,
  restoreFlatAttendanceBackupRows,
  restoreStoredMatrixSnapshots,
  syncLeaveRegistrationToMatrices,
} from '../../lib/matrixTimekeeping';
import {
  OVT_FORMULA_STORAGE_KEY,
  loadOvtFormulaFields,
} from '../../lib/salaryConfig';
import { normalizeLegacyLeaveType } from '../hr/LeaveFormNPTFM007';
import {
  HardDriveDownload,
  HardDriveUpload,
  FileSpreadsheet,
  FileJson,
  CheckCircle,
  AlertCircle,
  FileUp,
  Table2,
  Users,
  CalendarCheck,
  Plane,
  FileText,
  Clock,
  CalendarCheck2,
  Timer,
  Banknote,
  Package,
  ScrollText,
  GraduationCap,
  Megaphone,
  Layers,
  CheckSquare,
  Square,
  Download,
} from 'lucide-react';

export const STAFF_BACKUP_HEADERS = [
  'hometown',
  'workUnit',
  'id',
  'position',
  'dateJoined',
  'attendance',
  'phone',
  'shift',
  'fullName',
  'department',
  'dob',
  'employeeId',
  'avatarUrl',
  'isLocked',
  'lockType',
  'lockedDay',
  'annualLeaveQuota',
  'qrAccessEnabled',
  'qrAccessToken',
  'faceAccessEnabled',
  'facePhotoUrl',
  'faceUpdatedAt',
  'faceDescriptor',
  'badgeIssued',
  'badgeIssuedAt',
  'badgeIssuedBy',
  'securityPin',
  'note',
] as const;

export const ATTENDANCE_BACKUP_HEADERS = [
  'employeeId',
  'note',
  'shift',
  'date',
  'id',
  'status',
  'overtime',
  'lateIn',
  'manualOut',
  'earlyIn',
  'manualIn',
  'sundayNightOT',
  'sundayDayOT',
  'earlyOut',
] as const;

export const LEAVE_BACKUP_HEADERS = [
  'fullName',
  'department',
  'totalDays',
  'status',
  'position',
  'id',
  'toTime',
  'reason',
  'fromTime',
  'toDate',
  'createdAt',
  'leaveType',
  'employeeId',
  'fromDate',
] as const;

interface BackupRestoreProps {
  moduleName?: string;
  language?: Language;
  staffRecords?: StaffRecord[];
  hrStaff?: StaffRecord[];
  onRestoreStaff?: (multiStaff: StaffRecord[], hrStaff: StaffRecord[]) => void;
  attendanceHistory?: AttendanceRecord[];
  onRestoreAttendance?: (records: AttendanceRecord[]) => void;
  leaveRecords?: LeaveRegistrationRecord[];
  onRestoreLeaves?: (records: LeaveRegistrationRecord[]) => void;
  customData?: Record<string, { data: any[]; setter: (d: any[]) => void }>;
}

type HrBackupCategoryId =
  | 'STAFF'
  | 'ATTENDANCE'
  | 'TIMEKEEPING'
  | 'MATRIX'
  | 'ATT_CONFIRM'
  | 'OVERTIME'
  | 'LEAVES'
  | 'CONTRACTS'
  | 'PAYROLL_SALARY'
  | 'ASSETS'
  | 'DOCS'
  | 'TRAINING'
  | 'ANNOUNCEMENTS';

const ALL_CATEGORY_IDS: HrBackupCategoryId[] = [
  'STAFF',
  'ATTENDANCE',
  'TIMEKEEPING',
  'MATRIX',
  'ATT_CONFIRM',
  'OVERTIME',
  'LEAVES',
  'CONTRACTS',
  'PAYROLL_SALARY',
  'ASSETS',
  'DOCS',
  'TRAINING',
  'ANNOUNCEMENTS',
];

const JSON_CELL_PREFIX = '__JSON__:';
const EXCEL_CELL_CHUNK_LIMIT = 30000;

function encodeExcelCellValue(val: any): any {
  if (val === undefined || val === null) return '';
  if (typeof val === 'object') {
    const serialized = `${JSON_CELL_PREFIX}${JSON.stringify(val)}`;
    return serialized.length <= 32700 ? serialized : serialized.slice(0, 32700);
  }
  return val;
}

function decodeExcelCellValue(val: any, fieldKey?: string): any {
  if (typeof val !== 'string') return val;
  if (val.startsWith(JSON_CELL_PREFIX)) {
    try {
      return JSON.parse(val.slice(JSON_CELL_PREFIX.length));
    } catch {
      return val;
    }
  }
  // Fallback for JSON array/object columns without prefix
  const jsonLikelyKeys = new Set([
    'days',
    'sharedwith',
    'feedback',
    'recipients',
    'attendancesummary',
    'salaryconfig',
    'facedescriptor',
  ]);
  const trimmed = val.trim();
  if (
    fieldKey &&
    jsonLikelyKeys.has(fieldKey.toLowerCase()) &&
    ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']')))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return val;
    }
  }
  return val;
}

function serializeRowsForExcel(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map((row) => {
    const out: Record<string, any> = {};
    Object.entries(row).forEach(([k, v]) => {
      out[k] = encodeExcelCellValue(v);
    });
    return out;
  });
}

function deserializeRowsFromExcel(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map((row) => {
    const out: Record<string, any> = {};
    Object.entries(row).forEach(([k, v]) => {
      out[k] = decodeExcelCellValue(v, k);
    });
    return out;
  });
}

function buildMatrixSnapshotExcelRows(
  snapshots: Record<string, string>
): Array<{ key: string; partIndex: number; totalParts: number; value: string }> {
  const rows: Array<{ key: string; partIndex: number; totalParts: number; value: string }> = [];
  Object.entries(snapshots).forEach(([key, val]) => {
    if (typeof val !== 'string') return;
    const totalParts = Math.max(1, Math.ceil(val.length / EXCEL_CELL_CHUNK_LIMIT));
    for (let i = 0; i < totalParts; i += 1) {
      rows.push({
        key,
        partIndex: i,
        totalParts,
        value: val.slice(i * EXCEL_CELL_CHUNK_LIMIT, (i + 1) * EXCEL_CELL_CHUNK_LIMIT),
      });
    }
  });
  return rows;
}

function parseMatrixSnapshotExcelRows(rows: Record<string, any>[]): Record<string, string> {
  const buckets = new Map<string, Array<{ partIndex: number; value: string }>>();
  rows.forEach((raw) => {
    const key = String(raw.key || '').trim();
    const val = raw.value !== undefined && raw.value !== null ? String(raw.value) : '';
    const partIndex = Number(raw.partIndex) || 0;
    if (!key) return;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push({ partIndex, value: val });
  });

  const out: Record<string, string> = {};
  buckets.forEach((parts, key) => {
    parts.sort((a, b) => a.partIndex - b.partIndex);
    out[key] = parts.map((p) => p.value).join('');
  });
  return out;
}

function normalizeRowKeys(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  Object.entries(row).forEach(([k, v]) => {
    out[k.trim().toLowerCase()] = v;
  });
  return out;
}

function pickField(normRow: Record<string, any>, ...keys: string[]): any {
  for (const k of keys) {
    const val = normRow[k.toLowerCase()];
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return '';
}

function parseBooleanOptional(val: any): boolean | undefined {
  if (val === '' || val === undefined || val === null) return undefined;
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toUpperCase();
  if (s === 'TRUE' || s === '1' || s === 'YES' || s === 'ĐÃ KHÓA' || s === 'NGHỈ VIỆC') return true;
  if (s === 'FALSE' || s === '0' || s === 'NO') return false;
  return undefined;
}

function parseNumericId(raw: any, fallback: number, usedIds: Set<number>): number {
  let num = NaN;
  if (typeof raw === 'number') {
    num = raw;
  } else if (raw !== undefined && raw !== null && raw !== '') {
    const cleaned = String(raw).trim().replace(',', '.');
    num = Number(cleaned);
  }
  if (!Number.isFinite(num) || num <= 0) {
    num = fallback;
  }
  let candidate = Math.round(num);
  while (usedIds.has(candidate)) {
    candidate += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function parsePhoneString(raw: any): string {
  if (raw === undefined || raw === null || raw === '') return '';
  if (typeof raw === 'number') {
    const digits = String(Math.trunc(raw));
    if (digits.length === 9 && /^[35789]/.test(digits)) {
      return `0${digits}`;
    }
    return digits;
  }
  return String(raw).trim().replace(/^'+/, '');
}

function normalizeStaffRowsForRestore(rawRows: Record<string, any>[]): {
  multiStaff: StaffRecord[];
  hrStaff: StaffRecord[];
} {
  const multiStaff: StaffRecord[] = [];
  const hrStaff: StaffRecord[] = [];
  const usedIds = new Set<number>();
  const seenEmpIds = new Set<string>();
  const baseTs = Date.now();

  rawRows.forEach((raw, idx) => {
    const norm = normalizeRowKeys(raw);
    const employeeId = String(pickField(norm, 'employeeid', 'mã nv', 'ma nv', 'manv')).trim();
    const fullName = String(pickField(norm, 'fullname', 'họ tên', 'ho ten', 'họ và tên', 'ten')).trim();
    if (!employeeId && !fullName) return;

    const dedupKey = (employeeId || fullName).toLowerCase();
    if (seenEmpIds.has(dedupKey)) return;
    seenEmpIds.add(dedupKey);

    const departmentRaw = String(pickField(norm, 'department', 'bộ phận', 'bo phan', 'workunit') || 'MULTI').trim();
    const workUnitRaw = String(pickField(norm, 'workunit', 'đơn vị', 'don vi') || departmentRaw || 'MULTI').trim();
    const shiftRaw = String(pickField(norm, 'shift', 'ca') || 'DAY')
      .trim()
      .toUpperCase();
    const shift: 'DAY' | 'NIGHT' =
      shiftRaw === 'NIGHT' || shiftRaw === 'ĐÊM' || shiftRaw === 'CA ĐÊM' ? 'NIGHT' : 'DAY';

    const parsedDate = parseBackupDateToIso(pickField(norm, 'datejoined', 'ngày vào', 'ngay vao'));
    const rawDateJoined = String(pickField(norm, 'datejoined', 'ngày vào', 'ngay vao') || '').trim();
    const dateJoined = parsedDate ? parsedDate.iso : rawDateJoined || new Date().toISOString().split('T')[0];

    const parsedDob = parseBackupDateToIso(pickField(norm, 'dob', 'ngày sinh', 'ngay sinh'));
    const rawDob = String(pickField(norm, 'dob', 'ngày sinh', 'ngay sinh') || '').trim();
    const dob = parsedDob ? parsedDob.iso : rawDob;

    const attendanceRaw = String(pickField(norm, 'attendance', 'trạng thái') || 'UNMARKED').trim();
    const isLocked = parseBooleanOptional(norm['islocked']);
    const rawLockType = String(pickField(norm, 'locktype') || '').trim().toUpperCase();
    const lockType =
      rawLockType === 'REGIME_LEAVE' || rawLockType === 'RESIGNED'
        ? rawLockType
        : attendanceRaw === 'Nghỉ chế độ'
        ? 'REGIME_LEAVE'
        : undefined;
    const rawLockedDay = Number(pickField(norm, 'lockedday'));
    const lockedDay =
      Number.isFinite(rawLockedDay) && rawLockedDay >= 1 && rawLockedDay <= 31
        ? Math.trunc(rawLockedDay)
        : undefined;

    const rawQuota = Number(pickField(norm, 'annualleavequota'));
    const annualLeaveQuota =
      Number.isFinite(rawQuota) && rawQuota >= 0 ? rawQuota : undefined;
    const qrAccessEnabled = parseBooleanOptional(norm['qraccessenabled']);
    const qrAccessToken = String(pickField(norm, 'qraccesstoken') || '').trim() || undefined;
    const faceAccessEnabled = parseBooleanOptional(norm['faceaccessenabled']);
    const facePhotoUrl = String(pickField(norm, 'facephotourl') || '').trim() || undefined;
    const faceUpdatedAt = String(pickField(norm, 'faceupdatedat') || '').trim() || undefined;
    const rawFaceDescriptor = pickField(norm, 'facedescriptor');
    const faceDescriptor =
      Array.isArray(rawFaceDescriptor) && rawFaceDescriptor.every((n) => typeof n === 'number')
        ? (rawFaceDescriptor as number[])
        : undefined;
    const badgeIssued = parseBooleanOptional(norm['badgeissued']);
    const badgeIssuedAt = String(pickField(norm, 'badgeissuedat') || '').trim() || undefined;
    const badgeIssuedBy = String(pickField(norm, 'badgeissuedby') || '').trim() || undefined;
    const securityPin = String(pickField(norm, 'securitypin', 'mã bảo mật', 'ma bao mat') || '').trim() || undefined;
    const note = String(pickField(norm, 'note', 'ghi chú') || '').trim() || undefined;

    const staffItem: StaffRecord = {
      id: parseNumericId(norm['id'], baseTs + idx, usedIds),
      employeeId: employeeId || `NV_${baseTs + idx}`,
      fullName: fullName || employeeId,
      position: String(pickField(norm, 'position', 'chức vụ', 'chuc vu') || 'OP').trim(),
      dateJoined,
      dob,
      hometown: String(pickField(norm, 'hometown', 'quê quán', 'que quan') || '').trim(),
      phone: parsePhoneString(pickField(norm, 'phone', 'sđt', 'sdt', 'điện thoại')),
      attendance: (attendanceRaw || 'UNMARKED') as AttendanceStatus,
      shift,
      department: departmentRaw || 'MULTI',
      workUnit: workUnitRaw || departmentRaw || 'MULTI',
      avatarUrl: String(pickField(norm, 'avatarurl') || '').trim(),
      ...(isLocked !== undefined ? { isLocked } : {}),
      ...(lockType ? { lockType } : {}),
      ...(lockedDay !== undefined ? { lockedDay } : {}),
      ...(annualLeaveQuota !== undefined ? { annualLeaveQuota } : {}),
      ...(qrAccessEnabled !== undefined ? { qrAccessEnabled } : {}),
      ...(qrAccessToken ? { qrAccessToken } : {}),
      ...(faceAccessEnabled !== undefined ? { faceAccessEnabled } : {}),
      ...(faceDescriptor ? { faceDescriptor } : {}),
      ...(facePhotoUrl ? { facePhotoUrl } : {}),
      ...(faceUpdatedAt ? { faceUpdatedAt } : {}),
      ...(badgeIssued !== undefined ? { badgeIssued } : {}),
      ...(badgeIssuedAt ? { badgeIssuedAt } : {}),
      ...(badgeIssuedBy ? { badgeIssuedBy } : {}),
      ...(securityPin ? { securityPin } : {}),
      ...(note ? { note } : {}),
    };

    if ((staffItem.department || '').toUpperCase() === 'HR') {
      hrStaff.push(staffItem);
    } else {
      multiStaff.push(staffItem);
    }
  });

  return { multiStaff, hrStaff };
}

function buildStaffExportRows(allStaff: StaffRecord[]): Record<string, any>[] {
  return allStaff.map((s) => {
    const parsedJoin = parseBackupDateToIso(s.dateJoined);
    const parsedDob = parseBackupDateToIso(s.dob);
    return {
      hometown: s.hometown || '',
      workUnit: s.workUnit || s.department || 'MULTI',
      id: s.id,
      position: s.position || '',
      dateJoined: parsedJoin ? parsedJoin.iso : s.dateJoined || '',
      attendance: s.attendance || 'UNMARKED',
      phone: s.phone || '',
      shift: s.shift || 'DAY',
      fullName: s.fullName || '',
      department: s.department || s.workUnit || 'MULTI',
      dob: parsedDob ? parsedDob.iso : s.dob || '',
      employeeId: s.employeeId || '',
      avatarUrl: s.avatarUrl || '',
      isLocked: s.isLocked === undefined ? '' : s.isLocked,
      lockType: s.lockType || '',
      lockedDay: s.lockedDay === undefined ? '' : s.lockedDay,
      annualLeaveQuota: s.annualLeaveQuota === undefined ? '' : s.annualLeaveQuota,
      qrAccessEnabled: s.qrAccessEnabled === undefined ? '' : s.qrAccessEnabled,
      qrAccessToken: s.qrAccessToken || '',
      faceAccessEnabled: s.faceAccessEnabled === undefined ? '' : s.faceAccessEnabled,
      facePhotoUrl: s.facePhotoUrl || '',
      faceUpdatedAt: s.faceUpdatedAt || '',
      faceDescriptor: Array.isArray(s.faceDescriptor) ? s.faceDescriptor : '',
      badgeIssued: s.badgeIssued === undefined ? '' : s.badgeIssued,
      badgeIssuedAt: s.badgeIssuedAt || '',
      badgeIssuedBy: s.badgeIssuedBy || '',
      securityPin: s.securityPin || '123',
      note: s.note || '',
    };
  });
}

function isStaffSheetHeaders(normHeaders: Set<string>, sheetNameUpper: string): boolean {
  if (
    sheetNameUpper === 'NHAN_VIEN' ||
    sheetNameUpper === 'NHANVIEN' ||
    sheetNameUpper === 'STAFF' ||
    sheetNameUpper === 'MULTI_STAFF' ||
    sheetNameUpper === 'HR_STAFF'
  ) {
    return true;
  }
  return (
    normHeaders.has('employeeid') &&
    normHeaders.has('fullname') &&
    normHeaders.has('datejoined') &&
    !normHeaders.has('fromdate')
  );
}

function isAttendanceSheetHeaders(normHeaders: Set<string>, sheetNameUpper: string): boolean {
  if (
    sheetNameUpper === 'CHAM_CONG' ||
    sheetNameUpper === 'CHAMCONG' ||
    sheetNameUpper === 'ATTENDANCE'
  ) {
    return true;
  }
  return (
    normHeaders.has('employeeid') &&
    normHeaders.has('date') &&
    (normHeaders.has('status') ||
      normHeaders.has('overtime') ||
      normHeaders.has('sundaydayot') ||
      normHeaders.has('manualin') ||
      normHeaders.has('latein')) &&
    !normHeaders.has('attendancestatus')
  );
}

function isLeaveSheetHeaders(normHeaders: Set<string>, sheetNameUpper: string): boolean {
  if (
    sheetNameUpper === 'NGHI_PHEP' ||
    sheetNameUpper === 'NGHIPHEP' ||
    sheetNameUpper === 'HR_LEAVES' ||
    sheetNameUpper === 'LEAVES' ||
    sheetNameUpper === 'DANH_SACH_NGHI_PHEP'
  ) {
    return true;
  }
  return (
    normHeaders.has('employeeid') &&
    (normHeaders.has('fromdate') ||
      normHeaders.has('todate') ||
      normHeaders.has('leavetype') ||
      normHeaders.has('totaldays'))
  );
}

function parseLeaveTimeString(raw: any, fallback: string): string {
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (typeof raw === 'number' && raw >= 0 && raw < 1.5) {
    const frac = raw % 1;
    const totalMins = Math.round(frac * 24 * 60);
    const hh = Math.floor(totalMins / 60) % 24;
    const mm = totalMins % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  const s = String(raw).trim().replace(/^'+/, '');
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) {
    const hh = Math.min(23, Math.max(0, Number(m[1])));
    const mm = Math.min(59, Math.max(0, Number(m[2])));
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  return fallback;
}

function parseLeaveNumericId(raw: any, fallback: number, usedIds: Set<number>): number {
  if (typeof raw === 'string') {
    const stripped = raw.trim().replace(/^LEAVE_/i, '');
    return parseNumericId(stripped, fallback, usedIds);
  }
  return parseNumericId(raw, fallback, usedIds);
}

function parseCreatedAtValue(raw: any): string {
  if (raw === undefined || raw === null || raw === '') {
    return new Date().toLocaleString('vi-VN');
  }
  if (typeof raw === 'number' && raw > 1000) {
    const dt = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return isNaN(dt.getTime()) ? String(raw) : dt.toLocaleString('vi-VN');
  }
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw.toLocaleString('vi-VN');
  }
  return String(raw).trim();
}

function normalizeLeaveTypeExact(raw: any): LeaveRegistrationType {
  const s = String(raw || '').trim();
  const valid: LeaveRegistrationType[] = [
    'Nghỉ phép',
    'Nghỉ nửa phép',
    'Nghỉ việc riêng',
    'Nghỉ cưới',
    'Về sớm',
    'Nghỉ ốm',
  ];
  const exact = valid.find((v) => v.toLowerCase() === s.toLowerCase());
  if (exact) return exact;
  return normalizeLegacyLeaveType(s);
}

function buildLeaveExportRows(leaveRecords: LeaveRegistrationRecord[]): Record<string, any>[] {
  return leaveRecords.map((r) => {
    const parsedFrom = parseBackupDateToIso(r.fromDate);
    const parsedTo = parseBackupDateToIso(r.toDate || r.fromDate);
    const rawIdStr = String(r.id ?? '').trim();
    const formattedId = rawIdStr.toUpperCase().startsWith('LEAVE_')
      ? rawIdStr
      : `LEAVE_${rawIdStr || Date.now()}`;
    return {
      fullName: r.fullName || '',
      department: r.department || 'MULTI',
      totalDays: Number(r.days) > 0 ? Number(r.days) : r.leaveType === 'Nghỉ nửa phép' ? 0.5 : 1,
      status: r.status || 'APPROVED',
      position: r.position || 'Nhân viên',
      id: formattedId,
      toTime: r.toTime || '17:00',
      reason: r.reason || '',
      fromTime: r.fromTime || '08:00',
      toDate: parsedTo ? parsedTo.iso : r.toDate || r.fromDate || '',
      createdAt: r.createdAt || '',
      leaveType: r.leaveType || 'Nghỉ phép',
      employeeId: r.employeeId || '',
      fromDate: parsedFrom ? parsedFrom.iso : r.fromDate || '',
    };
  });
}

function normalizeLeaveRowsForRestore(
  rawRows: Record<string, any>[],
  staffList: StaffRecord[]
): LeaveRegistrationRecord[] {
  const usedIds = new Set<number>();
  const staffMap = new Map<string, StaffRecord>();
  staffList.forEach((s) => staffMap.set(s.employeeId.trim().toLowerCase(), s));

  const baseTs = Date.now();
  const restored: LeaveRegistrationRecord[] = [];

  rawRows.forEach((raw, idx) => {
    const norm = normalizeRowKeys(raw);
    const empIdRaw = String(pickField(norm, 'employeeid', 'mã nv', 'ma nv', 'manv')).trim();
    const fullNameRaw = String(pickField(norm, 'fullname', 'họ tên', 'ho ten', 'họ và tên')).trim();
    if (!empIdRaw && !fullNameRaw) return;

    const matchedStaff =
      (empIdRaw && staffMap.get(empIdRaw.toLowerCase())) ||
      staffList.find((s) => s.fullName.trim().toLowerCase() === fullNameRaw.toLowerCase());

    const employeeId = empIdRaw || matchedStaff?.employeeId || '';
    const fullName = fullNameRaw || matchedStaff?.fullName || employeeId;
    if (!employeeId) return;

    const leaveType = normalizeLeaveTypeExact(
      pickField(norm, 'leavetype', 'loại phép', 'loai phep', 'hình thức nghỉ')
    );

    const parsedFrom = parseBackupDateToIso(
      pickField(norm, 'fromdate', 'từ ngày', 'tu ngay', 'startdate', 'date')
    );
    const parsedTo = parseBackupDateToIso(
      pickField(norm, 'todate', 'đến ngày', 'den ngay', 'enddate')
    );
    const fallbackToday = new Date().toISOString().split('T')[0];
    const fromDate = parsedFrom ? parsedFrom.iso : parsedTo ? parsedTo.iso : fallbackToday;
    const toDate = parsedTo ? parsedTo.iso : fromDate;

    const shiftDefaultIn = matchedStaff?.shift === 'NIGHT' ? '20:00' : '08:00';
    const shiftDefaultOut = matchedStaff?.shift === 'NIGHT' ? '05:00' : '17:00';
    const fromTime = parseLeaveTimeString(pickField(norm, 'fromtime', 'từ giờ', 'tu gio'), shiftDefaultIn);
    const toTime = parseLeaveTimeString(pickField(norm, 'totime', 'đến giờ', 'den gio'), shiftDefaultOut);

    const rawDays = pickField(norm, 'totaldays', 'days', 'số ngày', 'so ngay');
    const numDays = Number(String(rawDays ?? '').replace(',', '.'));
    const days =
      Number.isFinite(numDays) && numDays > 0
        ? numDays
        : leaveType === 'Nghỉ nửa phép'
        ? 0.5
        : 1;

    const statusRaw = String(pickField(norm, 'status', 'trạng thái', 'trang thai') || 'APPROVED')
      .trim()
      .toUpperCase();
    const status: LeaveRegistrationRecord['status'] =
      statusRaw === 'PENDING'
        ? 'PENDING'
        : statusRaw === 'REGISTERED'
        ? 'REGISTERED'
        : 'APPROVED';

    restored.push({
      id: parseLeaveNumericId(norm['id'], baseTs + idx, usedIds),
      employeeId,
      fullName,
      department: String(
        pickField(norm, 'department', 'bộ phận', 'bo phan') || matchedStaff?.department || 'MULTI'
      ).trim(),
      position: String(
        pickField(norm, 'position', 'chức vụ', 'chuc vu') || matchedStaff?.position || 'Nhân viên'
      ).trim(),
      leaveType,
      fromDate,
      toDate,
      fromTime,
      toTime,
      days,
      reason: String(pickField(norm, 'reason', 'lý do', 'ly do') || leaveType).trim(),
      status,
      createdAt: parseCreatedAtValue(pickField(norm, 'createdat', 'ngày tạo', 'ngay tao')),
      createdBy: String(pickField(norm, 'createdby', 'người tạo') || 'Khôi phục Backup').trim(),
    });
  });

  return restored;
}

export const BackupRestore: React.FC<BackupRestoreProps> = ({
  moduleName = 'HC & NS',
  staffRecords = [],
  hrStaff = [],
  onRestoreStaff,
  attendanceHistory = [],
  onRestoreAttendance,
  leaveRecords,
  onRestoreLeaves,
  customData,
}) => {
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<HrBackupCategoryId>>(
    () => new Set(ALL_CATEGORY_IDS)
  );

  const combinedStaff = useMemo(() => [...staffRecords, ...hrStaff], [staffRecords, hrStaff]);

  const resolvedLeaveRecords = useMemo<LeaveRegistrationRecord[]>(
    () => leaveRecords ?? (customData?.HR_LEAVES?.data as LeaveRegistrationRecord[]) ?? [],
    [leaveRecords, customData]
  );

  const flatAttendancePreviewCount = useMemo(
    () => exportFlatAttendanceBackupRows(combinedStaff, attendanceHistory).length,
    [combinedStaff, attendanceHistory]
  );

  const matrixSnapshots = useMemo(() => getAllStoredMatrixSnapshots(), [attendanceHistory, resolvedLeaveRecords, combinedStaff]);
  const matrixSnapshotCount = useMemo(() => Object.keys(matrixSnapshots).length, [matrixSnapshots]);

  const countOf = (key: string) => customData?.[key]?.data?.length || 0;

  // Map every HC & NS category to tabs, datasets & display metadata
  const hrCategories = useMemo(
    () => [
      {
        id: 'STAFF' as HrBackupCategoryId,
        tabLabel: 'DS Nhân Viên & Thêm Mới',
        sheetKeys: ['NHAN_VIEN'],
        countText: `${combinedStaff.length} nhân viên`,
        description: 'Hồ sơ nhân sự, khóa nghỉ chế độ/thôi việc, phép năm & QR cá nhân',
        icon: Users,
        accent: 'text-cyan-300 border-cyan-800/50 bg-cyan-950/20',
      },
      {
        id: 'ATTENDANCE' as HrBackupCategoryId,
        tabLabel: 'Nhật Ký Đ.Danh & Bảng Công',
        sheetKeys: ['CHAM_CONG'],
        countText: `${flatAttendancePreviewCount} dòng công`,
        description: 'Lịch sử chấm công hằng ngày, tăng ca & nhật ký điểm danh',
        icon: CalendarCheck,
        accent: 'text-emerald-300 border-emerald-800/50 bg-emerald-950/20',
      },
      {
        id: 'TIMEKEEPING' as HrBackupCategoryId,
        tabLabel: 'Dữ Liệu Công & Đơn Bất Thường',
        sheetKeys: ['HR_TIMEKEEPING', 'HR_ATT_REQ'],
        countText: `${countOf('HR_TIMEKEEPING')} máy CC · ${countOf('HR_ATT_REQ')} đơn`,
        description: 'Dữ liệu máy chấm công & đơn xác nhận bất thường NPT-FM-008',
        icon: Clock,
        accent: 'text-blue-300 border-blue-800/50 bg-blue-950/20',
      },
      {
        id: 'MATRIX' as HrBackupCategoryId,
        tabLabel: 'Bảng Công Ma Trận & Ngày Lễ',
        sheetKeys: ['MATRIX_SNAPSHOTS'],
        countText: `${matrixSnapshotCount} bảng dữ liệu`,
        description: 'Toàn bộ ma trận công chi tiết các tháng, ngày lễ & quẹt thẻ gốc',
        icon: Layers,
        accent: 'text-amber-300 border-amber-800/50 bg-amber-950/20',
      },
      {
        id: 'ATT_CONFIRM' as HrBackupCategoryId,
        tabLabel: 'Xác Nhận Công',
        sheetKeys: ['HR_ATT_CONFIRM'],
        countText: `${countOf('HR_ATT_CONFIRM')} phiếu`,
        description: 'Phiếu xác nhận giờ công & tăng ca hàng tháng của nhân viên',
        icon: CalendarCheck2,
        accent: 'text-cyan-300 border-cyan-800/50 bg-cyan-950/20',
      },
      {
        id: 'OVERTIME' as HrBackupCategoryId,
        tabLabel: 'Đăng Ký Tăng Ca',
        sheetKeys: ['HR_OVERTIME'],
        countText: `${countOf('HR_OVERTIME')} bản ghi`,
        description: 'Danh sách đăng ký làm thêm giờ theo ca & bộ phận',
        icon: Timer,
        accent: 'text-orange-300 border-orange-800/50 bg-orange-950/20',
      },
      {
        id: 'LEAVES' as HrBackupCategoryId,
        tabLabel: 'Đăng Ký Phép & Nghỉ Phép',
        sheetKeys: ['NGHI_PHEP'],
        countText: `${resolvedLeaveRecords.length} đơn phép`,
        description: 'Đơn đăng ký nghỉ phép NPT-FM-007 & danh sách nghỉ phép',
        icon: Plane,
        accent: 'text-amber-300 border-amber-800/50 bg-amber-950/20',
      },
      {
        id: 'CONTRACTS' as HrBackupCategoryId,
        tabLabel: 'Hợp Đồng Lao Động',
        sheetKeys: ['HR_CONTRACTS'],
        countText: `${countOf('HR_CONTRACTS')} hợp đồng`,
        description: 'Danh sách hợp đồng lao động & tệp đính kèm nhân sự',
        icon: FileText,
        accent: 'text-indigo-300 border-indigo-800/50 bg-indigo-950/20',
      },
      {
        id: 'PAYROLL_SALARY' as HrBackupCategoryId,
        tabLabel: 'Bảng Công, Bảng Lương & Phiếu Lương',
        sheetKeys: ['HR_PAYROLLS', 'HR_SALARY_CONFIGS', 'HR_SLIPS', 'OVT_FORMULA'],
        countText: `${countOf('HR_SALARY_CONFIGS')} cấu hình · ${countOf('HR_SLIPS')} phiếu`,
        description: 'Cấu hình lương/phụ cấp, công thức OVT & BH, phiếu lương đã phát hành',
        icon: Banknote,
        accent: 'text-emerald-300 border-emerald-800/50 bg-emerald-950/20',
      },
      {
        id: 'ASSETS' as HrBackupCategoryId,
        tabLabel: 'Tài Sản Hành Chính',
        sheetKeys: ['HR_ASSETS'],
        countText: `${countOf('HR_ASSETS')} tài sản`,
        description: 'Danh mục tài sản, thiết bị & tình trạng bàn giao sử dụng',
        icon: Package,
        accent: 'text-amber-300 border-amber-800/50 bg-amber-950/20',
      },
      {
        id: 'DOCS' as HrBackupCategoryId,
        tabLabel: 'Công Văn & Tài Liệu',
        sheetKeys: ['HR_DOCS'],
        countText: `${countOf('HR_DOCS')} công văn`,
        description: 'Công văn, quyết định & văn bản hành chính nội bộ',
        icon: ScrollText,
        accent: 'text-teal-300 border-teal-800/50 bg-teal-950/20',
      },
      {
        id: 'TRAINING' as HrBackupCategoryId,
        tabLabel: 'Đào Tạo Nhân Sự',
        sheetKeys: ['HR_TRAINING'],
        countText: `${countOf('HR_TRAINING')} khóa`,
        description: 'Hồ sơ và tài liệu đào tạo nội bộ các bộ phận',
        icon: GraduationCap,
        accent: 'text-blue-300 border-blue-800/50 bg-blue-950/20',
      },
      {
        id: 'ANNOUNCEMENTS' as HrBackupCategoryId,
        tabLabel: 'Thông Báo HC & NS',
        sheetKeys: ['HR_ANN_GRP'],
        countText: `${countOf('HR_ANN_GRP')} thông báo`,
        description: 'Thông báo chung & thông báo cá nhân do HC & NS phát hành',
        icon: Megaphone,
        accent: 'text-rose-300 border-rose-800/50 bg-rose-950/20',
      },
    ],
    [combinedStaff.length, flatAttendancePreviewCount, matrixSnapshotCount, resolvedLeaveRecords.length, customData]
  );

  const toggleCategory = (id: HrBackupCategoryId) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCategories = () => setSelectedCategories(new Set(ALL_CATEGORY_IDS));
  const clearAllCategories = () => setSelectedCategories(new Set());

  const getCustomEntriesForSelected = (cats: Set<HrBackupCategoryId>) => {
    if (!customData) return [];
    const allowedKeys = new Set<string>();
    if (cats.has('TIMEKEEPING')) {
      allowedKeys.add('HR_TIMEKEEPING');
      allowedKeys.add('HR_ATT_REQ');
    }
    if (cats.has('ATT_CONFIRM')) allowedKeys.add('HR_ATT_CONFIRM');
    if (cats.has('OVERTIME')) allowedKeys.add('HR_OVERTIME');
    if (cats.has('CONTRACTS')) allowedKeys.add('HR_CONTRACTS');
    if (cats.has('PAYROLL_SALARY')) {
      allowedKeys.add('HR_PAYROLLS');
      allowedKeys.add('HR_SALARY_CONFIGS');
      allowedKeys.add('HR_SLIPS');
    }
    if (cats.has('ASSETS')) allowedKeys.add('HR_ASSETS');
    if (cats.has('DOCS')) allowedKeys.add('HR_DOCS');
    if (cats.has('TRAINING')) allowedKeys.add('HR_TRAINING');
    if (cats.has('ANNOUNCEMENTS')) allowedKeys.add('HR_ANN_GRP');

    return Object.entries(customData).filter(([key]) => allowedKeys.has(key));
  };

  const applyRestoredLeaves = (
    restoredLeaves: LeaveRegistrationRecord[],
    staffList: StaffRecord[]
  ) => {
    if (onRestoreLeaves) {
      onRestoreLeaves(restoredLeaves);
    } else if (customData?.HR_LEAVES) {
      customData.HR_LEAVES.setter(restoredLeaves);
    }
    restoredLeaves.forEach((rec) => {
      syncLeaveRegistrationToMatrices(rec, staffList);
    });
  };

  const exportCategoriesToExcel = (cats: Set<HrBackupCategoryId>, customFilePrefix?: string) => {
    if (cats.size === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng chọn ít nhất 1 danh mục tab HC & NS để sao lưu.',
      });
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const exportedSheetsSummary: string[] = [];

      // 1. NHAN_VIEN
      if (cats.has('STAFF')) {
        const staffExportRows = buildStaffExportRows(combinedStaff);
        const wsStaff = XLSX.utils.json_to_sheet(staffExportRows, {
          header: [...STAFF_BACKUP_HEADERS],
        });
        XLSX.utils.book_append_sheet(wb, wsStaff, 'NHAN_VIEN');
        exportedSheetsSummary.push(`NHAN_VIEN (${staffExportRows.length})`);
      }

      // 2. CHAM_CONG
      if (cats.has('ATTENDANCE')) {
        const attendanceExportRows = exportFlatAttendanceBackupRows(combinedStaff, attendanceHistory);
        const wsAttendance = XLSX.utils.json_to_sheet(attendanceExportRows, {
          header: [...ATTENDANCE_BACKUP_HEADERS],
        });
        XLSX.utils.book_append_sheet(wb, wsAttendance, 'CHAM_CONG');
        exportedSheetsSummary.push(`CHAM_CONG (${attendanceExportRows.length})`);
      }

      // 3. NGHI_PHEP
      if (cats.has('LEAVES')) {
        const leaveExportRows = buildLeaveExportRows(resolvedLeaveRecords);
        const wsLeaves = XLSX.utils.json_to_sheet(leaveExportRows, {
          header: [...LEAVE_BACKUP_HEADERS],
        });
        XLSX.utils.book_append_sheet(wb, wsLeaves, 'NGHI_PHEP');
        exportedSheetsSummary.push(`NGHI_PHEP (${leaveExportRows.length})`);
      }

      // 4. Các sheet dữ liệu của các tab HC & NS
      const selectedCustomEntries = getCustomEntriesForSelected(cats);
      selectedCustomEntries.forEach(([sheetName, item]) => {
        const rows = Array.isArray(item.data) ? item.data : [];
        if (rows.length > 0) {
          const safeRows = serializeRowsForExcel(rows);
          const ws = XLSX.utils.json_to_sheet(safeRows);
          XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
          exportedSheetsSummary.push(`${sheetName} (${rows.length})`);
        }
      });

      // 5. MATRIX_SNAPSHOTS (Ma trận công, ngày lễ, dữ liệu quẹt thẻ gốc)
      if (cats.has('MATRIX')) {
        const liveSnapshots = getAllStoredMatrixSnapshots();
        const matrixRows = buildMatrixSnapshotExcelRows(liveSnapshots);
        if (matrixRows.length > 0) {
          const wsMatrix = XLSX.utils.json_to_sheet(matrixRows, {
            header: ['key', 'partIndex', 'totalParts', 'value'],
          });
          XLSX.utils.book_append_sheet(wb, wsMatrix, 'MATRIX_SNAPSHOTS');
          exportedSheetsSummary.push(
            `MATRIX_SNAPSHOTS (${Object.keys(liveSnapshots).length} bảng)`
          );
        }
      }

      // 6. OVT_FORMULA (Công thức tính OVT & BH)
      if (cats.has('PAYROLL_SALARY')) {
        const formulaFields = loadOvtFormulaFields();
        const wsFormula = XLSX.utils.json_to_sheet(
          formulaFields.map((fieldKey, idx) => ({ order: idx + 1, fieldKey }))
        );
        XLSX.utils.book_append_sheet(wb, wsFormula, 'OVT_FORMULA');
        exportedSheetsSummary.push(`OVT_FORMULA (${formulaFields.length} mục)`);
      }

      // 7. BACKUP_MANIFEST (Tổng hợp toàn bộ danh mục HC & NS được sao lưu)
      const manifestRows = hrCategories
        .filter((c) => cats.has(c.id))
        .map((c) => ({
          Tab_HC_NS: c.tabLabel,
          Ma_Sheet: c.sheetKeys.join(', '),
          So_Luong_Du_Lieu: c.countText,
          Thoi_Gian_Sao_Luu: new Date().toLocaleString('vi-VN'),
        }));
      const wsManifest = XLSX.utils.json_to_sheet(manifestRows);
      XLSX.utils.book_append_sheet(wb, wsManifest, 'TONG_HOP_SAO_LUU');

      const todayStr = new Date().toISOString().split('T')[0];
      const fileName = customFilePrefix
        ? `${customFilePrefix}_${todayStr}.xlsx`
        : cats.size === ALL_CATEGORY_IDS.length
        ? `BACKUP_TOAN_BO_HCNS_${todayStr}.xlsx`
        : `BACKUP_HCNS_TUY_CHON_${todayStr}.xlsx`;

      XLSX.writeFile(wb, fileName);
      setStatusMessage({
        type: 'success',
        text: `Đã xuất file sao lưu Excel thành công: ${fileName} (${exportedSheetsSummary.length} sheet dữ liệu: ${exportedSheetsSummary.join(', ')}).`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Lỗi xuất file Excel: ${err.message}` });
    }
  };

  const handleExportExcel = () => {
    exportCategoriesToExcel(selectedCategories);
  };

  const handleExportAllExcel = () => {
    const all = new Set<HrBackupCategoryId>(ALL_CATEGORY_IDS);
    setSelectedCategories(all);
    exportCategoriesToExcel(all, 'BACKUP_TOAN_BO_HCNS');
  };

  const handleExportLeaveOnlyExcel = () => {
    exportCategoriesToExcel(new Set<HrBackupCategoryId>(['LEAVES']), 'DANH_SACH_NGHI_PHEP');
  };

  const handleExportJson = () => {
    if (selectedCategories.size === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng chọn ít nhất 1 danh mục tab HC & NS để xuất JSON.',
      });
      return;
    }

    try {
      const cats = selectedCategories;
      const staffExportRows = cats.has('STAFF') ? buildStaffExportRows(combinedStaff) : undefined;
      const attendanceExportRows = cats.has('ATTENDANCE')
        ? exportFlatAttendanceBackupRows(combinedStaff, attendanceHistory)
        : undefined;
      const leaveExportRows = cats.has('LEAVES')
        ? buildLeaveExportRows(resolvedLeaveRecords)
        : undefined;
      const selectedCustomEntries = getCustomEntriesForSelected(cats);

      const backupObj: Record<string, any> = {
        moduleName,
        version: 4,
        exportDate: new Date().toISOString(),
        includedCategories: Array.from(cats),
        ...(staffExportRows !== undefined ? { NHAN_VIEN: staffExportRows } : {}),
        ...(attendanceExportRows !== undefined ? { CHAM_CONG: attendanceExportRows } : {}),
        ...(leaveExportRows !== undefined ? { NGHI_PHEP: leaveExportRows } : {}),
        ...(cats.has('MATRIX') ? { matrixSnapshots: getAllStoredMatrixSnapshots() } : {}),
        ...(cats.has('PAYROLL_SALARY') ? { ovtFormulaFields: loadOvtFormulaFields() } : {}),
        custom: {
          ...Object.fromEntries(selectedCustomEntries.map(([k, v]) => [k, v.data])),
          ...(cats.has('STAFF')
            ? {
                MULTI_STAFF: staffRecords,
                HR_STAFF: hrStaff,
              }
            : {}),
        },
      };

      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      const todayStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute(
        'download',
        cats.size === ALL_CATEGORY_IDS.length
          ? `BACKUP_TOAN_BO_HCNS_${todayStr}.json`
          : `BACKUP_HCNS_TUY_CHON_${todayStr}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setStatusMessage({
        type: 'success',
        text: `Đã xuất file sao lưu JSON đầy đủ (${cats.size}/${ALL_CATEGORY_IDS.length} nhóm dữ liệu HC & NS: ${
          staffExportRows ? `${staffExportRows.length} nhân viên, ` : ''
        }${attendanceExportRows ? `${attendanceExportRows.length} dòng chấm công, ` : ''}${
          leaveExportRows ? `${leaveExportRows.length} đơn nghỉ phép, ` : ''
        }${selectedCustomEntries.length} danh mục chi tiết).`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Lỗi xuất JSON: ${err.message}` });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage(null);

    const reader = new FileReader();

    if (file.name.toLowerCase().endsWith('.json')) {
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          const restoredParts: string[] = [];

          let latestCombinedStaff = combinedStaff;

          // 1. Khôi phục nhân viên
          if (Array.isArray(parsed.NHAN_VIEN) && onRestoreStaff) {
            const { multiStaff, hrStaff: restoredHr } = normalizeStaffRowsForRestore(parsed.NHAN_VIEN);
            onRestoreStaff(multiStaff, restoredHr);
            latestCombinedStaff = [...multiStaff, ...restoredHr];
            restoredParts.push(`NHAN_VIEN (${latestCombinedStaff.length})`);
          } else if (parsed.custom && onRestoreStaff) {
            const legacyMulti = Array.isArray(parsed.custom.MULTI_STAFF) ? parsed.custom.MULTI_STAFF : null;
            const legacyHr = Array.isArray(parsed.custom.HR_STAFF) ? parsed.custom.HR_STAFF : null;
            if (legacyMulti || legacyHr) {
              const normMulti = legacyMulti ? normalizeStaffRowsForRestore(legacyMulti).multiStaff : staffRecords;
              const normHr = legacyHr ? normalizeStaffRowsForRestore(legacyHr).hrStaff : hrStaff;
              onRestoreStaff(normMulti, normHr);
              latestCombinedStaff = [...normMulti, ...normHr];
              restoredParts.push(`NHAN_VIEN (${latestCombinedStaff.length})`);
            }
          }

          // 2. Khôi phục snapshot ma trận & máy chấm công
          if (parsed.matrixSnapshots && typeof parsed.matrixSnapshots === 'object') {
            restoreStoredMatrixSnapshots(parsed.matrixSnapshots);
            restoredParts.push(
              `MATRIX_SNAPSHOTS (${Object.keys(parsed.matrixSnapshots).length})`
            );
          }

          // 3. Khôi phục công thức OVT & BH
          if (Array.isArray(parsed.ovtFormulaFields) && parsed.ovtFormulaFields.length > 0) {
            localStorage.setItem(
              OVT_FORMULA_STORAGE_KEY,
              JSON.stringify(parsed.ovtFormulaFields)
            );
            restoredParts.push(`OVT_FORMULA (${parsed.ovtFormulaFields.length})`);
          }

          // 4. Khôi phục dữ liệu chấm công phẳng (CHAM_CONG) & đồng bộ lên Bảng công ma trận
          if (Array.isArray(parsed.CHAM_CONG)) {
            const attResult = restoreFlatAttendanceBackupRows(parsed.CHAM_CONG, latestCombinedStaff);
            if (onRestoreAttendance) {
              onRestoreAttendance(attResult.attendanceHistory);
            }
            restoredParts.push(`CHAM_CONG (${attResult.restoredCount})`);
          }

          // 5. Khôi phục danh sách nghỉ phép (NGHI_PHEP)
          const jsonLeavesRaw = Array.isArray(parsed.NGHI_PHEP)
            ? parsed.NGHI_PHEP
            : Array.isArray(parsed.custom?.HR_LEAVES)
            ? parsed.custom.HR_LEAVES
            : null;
          if (jsonLeavesRaw) {
            const normalizedLeaves = normalizeLeaveRowsForRestore(jsonLeavesRaw, latestCombinedStaff);
            applyRestoredLeaves(normalizedLeaves, latestCombinedStaff);
            restoredParts.push(`NGHI_PHEP (${normalizedLeaves.length})`);
          }

          // 6. Khôi phục toàn bộ các danh mục HC&NS khác
          if (parsed.custom && customData) {
            Object.entries(parsed.custom).forEach(([key, val]) => {
              if (onRestoreStaff && (key === 'MULTI_STAFF' || key === 'HR_STAFF')) return;
              if (key === 'HR_LEAVES') return;
              if (customData[key] && Array.isArray(val)) {
                customData[key].setter(val);
                restoredParts.push(`${key} (${val.length})`);
              }
            });
          }

          setStatusMessage({
            type: 'success',
            text: `Khôi phục thành công từ file JSON: ${restoredParts.join(' | ') || '0 danh mục'}.`,
          });
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: `Lỗi đọc file JSON: ${err.message}` });
        } finally {
          setIsProcessing(false);
          e.target.value = '';
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          const staffRawBuckets: Record<string, any>[] = [];
          const attendanceRawBuckets: Record<string, any>[] = [];
          const leaveRawBuckets: Record<string, any>[] = [];
          const matrixRawBuckets: Record<string, any>[] = [];
          const formulaRawBuckets: Record<string, any>[] = [];
          const otherSheets: { normSheet: string; rows: Record<string, any>[] }[] = [];

          workbook.SheetNames.forEach((sheetName) => {
            const normSheet = sheetName.toUpperCase().trim();
            if (normSheet === 'TONG_HOP_SAO_LUU' || normSheet === 'BACKUP_MANIFEST') return;

            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
              defval: '',
              raw: true,
            });
            if (!jsonData || jsonData.length === 0) return;

            const normHeaders = new Set<string>();
            jsonData.slice(0, 5).forEach((row) => {
              Object.keys(row).forEach((k) => normHeaders.add(k.trim().toLowerCase()));
            });

            if (normSheet === 'MATRIX_SNAPSHOTS') {
              matrixRawBuckets.push(...jsonData);
            } else if (normSheet === 'OVT_FORMULA') {
              formulaRawBuckets.push(...jsonData);
            } else if (isLeaveSheetHeaders(normHeaders, normSheet)) {
              leaveRawBuckets.push(...jsonData);
            } else if (isAttendanceSheetHeaders(normHeaders, normSheet)) {
              attendanceRawBuckets.push(...jsonData);
            } else if (isStaffSheetHeaders(normHeaders, normSheet)) {
              staffRawBuckets.push(...jsonData);
            } else {
              otherSheets.push({ normSheet, rows: deserializeRowsFromExcel(jsonData) });
            }
          });

          const restoredSummary: string[] = [];
          let latestCombinedStaff = combinedStaff;

          // Bước 1: Khôi phục nhân viên
          if (staffRawBuckets.length > 0 && onRestoreStaff) {
            const { multiStaff, hrStaff: restoredHr } = normalizeStaffRowsForRestore(staffRawBuckets);
            onRestoreStaff(multiStaff, restoredHr);
            latestCombinedStaff = [...multiStaff, ...restoredHr];
            restoredSummary.push(`NHAN_VIEN (${latestCombinedStaff.length} NV)`);
          } else if (staffRawBuckets.length > 0 && customData) {
            const { multiStaff, hrStaff: restoredHr } = normalizeStaffRowsForRestore(staffRawBuckets);
            if (customData.MULTI_STAFF) customData.MULTI_STAFF.setter(multiStaff);
            if (customData.HR_STAFF) customData.HR_STAFF.setter(restoredHr);
            latestCombinedStaff = [...multiStaff, ...restoredHr];
            restoredSummary.push(`NHAN_VIEN (${latestCombinedStaff.length} NV)`);
          }

          // Bước 2: Khôi phục MATRIX_SNAPSHOTS trước (nếu có)
          if (matrixRawBuckets.length > 0) {
            const restoredSnapshots = parseMatrixSnapshotExcelRows(matrixRawBuckets);
            if (Object.keys(restoredSnapshots).length > 0) {
              restoreStoredMatrixSnapshots(restoredSnapshots);
              restoredSummary.push(
                `MATRIX_SNAPSHOTS (${Object.keys(restoredSnapshots).length} bảng)`
              );
            }
          }

          // Bước 3: Khôi phục OVT_FORMULA
          if (formulaRawBuckets.length > 0) {
            const fields = formulaRawBuckets
              .map((r) => String(r.fieldKey || '').trim())
              .filter(Boolean);
            if (fields.length > 0) {
              localStorage.setItem(OVT_FORMULA_STORAGE_KEY, JSON.stringify(fields));
              restoredSummary.push(`OVT_FORMULA (${fields.length} mục)`);
            }
          }

          // Bước 4: Khôi phục CHAM_CONG
          if (attendanceRawBuckets.length > 0) {
            const attResult = restoreFlatAttendanceBackupRows(attendanceRawBuckets, latestCombinedStaff);
            if (onRestoreAttendance) {
              onRestoreAttendance(attResult.attendanceHistory);
            }
            const monthLabel =
              attResult.restoredMonths.length > 0 ? ` — Tháng ${attResult.restoredMonths.join(', ')}` : '';
            restoredSummary.push(`CHAM_CONG (${attResult.restoredCount} dòng${monthLabel})`);
          }

          // Bước 5: Khôi phục NGHI_PHEP
          if (leaveRawBuckets.length > 0) {
            const normalizedLeaves = normalizeLeaveRowsForRestore(leaveRawBuckets, latestCombinedStaff);
            applyRestoredLeaves(normalizedLeaves, latestCombinedStaff);
            restoredSummary.push(`NGHI_PHEP (${normalizedLeaves.length} đơn)`);
          }

          // Bước 6: Khôi phục toàn bộ các sheet HC&NS bổ sung
          otherSheets.forEach(({ normSheet, rows }) => {
            if (customData && customData[normSheet]) {
              customData[normSheet].setter(rows);
              restoredSummary.push(`${normSheet} (${rows.length})`);
            }
          });

          if (restoredSummary.length === 0) {
            setStatusMessage({
              type: 'error',
              text: 'Không tìm thấy sheet dữ liệu hợp lệ của phòng HC & NS trong file.',
            });
          } else {
            setStatusMessage({
              type: 'success',
              text: `Khôi phục thành công từ Excel: ${restoredSummary.join(' | ')}. Toàn bộ dữ liệu các tab HC & NS đã được đồng bộ.`,
            });
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: `Lỗi xử lý file Excel: ${err.message}` });
        } finally {
          setIsProcessing(false);
          e.target.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800 px-7 sm:px-0 text-center sm:text-left">
        <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <HardDriveDownload className="w-5 h-5 text-teal-400 shrink-0" />
          <span>Sao Lưu &amp; Khôi Phục Toàn Bộ Dữ Liệu ({moduleName})</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Cho phép sao lưu toàn bộ dữ liệu tất cả các tab của Phòng HC &amp; NS (Nhân viên, Dữ liệu công, Bảng công ma trận, Xác nhận công, Tăng ca, Nghỉ phép, Hợp đồng, Bảng lương/Phiếu lương, Tài sản, Công văn, Đào tạo, Thông báo) qua Excel (.xlsx) hoặc JSON.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-red-950/40 border-red-800 text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Danh sách toàn bộ các tab của phòng HC & NS */}
      <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Danh Mục Dữ Liệu Các Tab Phòng HC &amp; NS ({selectedCategories.size}/{hrCategories.length} đã chọn)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Mặc định chọn tất cả để sao lưu trọn vẹn toàn bộ phòng HC &amp; NS, hoặc tích chọn riêng từng tab cần xuất.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllCategories}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold cursor-pointer transition-colors"
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={clearAllCategories}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer transition-colors"
            >
              Bỏ chọn
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {hrCategories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategories.has(cat.id);
            return (
              <div
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`rounded-xl border p-3 transition-all cursor-pointer select-none flex flex-col justify-between gap-2 ${
                  isSelected
                    ? `${cat.accent} ring-1 ring-emerald-500/40`
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 opacity-65 hover:opacity-90'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold text-white truncate">
                      {cat.tabLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportCategoriesToExcel(
                        new Set<HrBackupCategoryId>([cat.id]),
                        `BACKUP_${cat.id}`
                      );
                    }}
                    title={`Xuất riêng file Excel cho mục ${cat.tabLabel}`}
                    className="p-1 rounded bg-slate-950/80 hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-white shrink-0 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                  {cat.description}
                </p>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/50 text-[10px] font-mono">
                  <span className="text-slate-400 truncate">{cat.sheetKeys.join(' + ')}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-200 font-semibold shrink-0">
                    {cat.countText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Xuất & Khôi phục */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <HardDriveUpload className="w-4 h-4 text-cyan-400" />
            <span>1. Xuất Dữ Liệu Sao Lưu (Backup)</span>
          </div>
          <p className="text-xs text-slate-400">
            Xuất toàn bộ các tab Phòng HC &amp; NS hoặc theo danh mục đã chọn ra file Excel (.xlsx) đa sheet và JSON (.json).
          </p>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleExportAllExcel}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-600/60 text-emerald-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Sao Lưu Toàn Bộ Dữ Liệu HC &amp; NS (.xlsx)</span>
              </div>
              <span className="text-[10px] text-emerald-300/80 font-mono">Tất cả 13 nhóm tab</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                <span>Xuất Excel Theo Danh Mục Đã Chọn (.xlsx)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedCategories.size}/{hrCategories.length} mục đã chọn
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportLeaveOnlyExcel}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-amber-800/40 text-amber-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Plane className="w-4 h-4 text-amber-400" />
                <span>Xuất Riêng Danh Sách Nghỉ Phép (.xlsx)</span>
              </div>
              <span className="text-[10px] text-amber-400/70 font-mono">
                Sheet NGHI_PHEP ({resolvedLeaveRecords.length} dòng)
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileJson className="w-4 h-4 text-amber-400" />
                <span>Xuất File Backup Đầy Đủ JSON (.json)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Giữ nguyên 100% cấu trúc
              </span>
            </button>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <HardDriveDownload className="w-4 h-4 text-teal-400" />
            <span>2. Khôi Phục Dữ Liệu Từ File (Restore)</span>
          </div>
          <p className="text-xs text-slate-400">
            Tự động nhận diện và khôi phục dữ liệu cho toàn bộ các tab HC &amp; NS từ file Excel (.xlsx/.xls) hoặc file Backup JSON (.json).
          </p>

          <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-950/40">
            <FileUp className="w-8 h-8 text-cyan-400" />
            <div className="text-xs font-semibold text-slate-200 text-center">
              Bấm vào đây để chọn file backup (.xlsx, .xls hoặc .json)
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 text-center">
              <Table2 className="w-3.5 h-3.5 shrink-0" />
              <span>
                Tự động đồng bộ: Nhân sự, Bảng công ma trận, Xác nhận công, Tăng ca, Nghỉ phép, Hợp đồng, Bảng/Phiếu lương &amp; Hành chính
              </span>
            </div>
            <input
              type="file"
              accept=".xlsx, .xls, .json"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
