import {
  AttendanceRecord,
  AttendanceStatus,
  LeaveRegistrationRecord,
  MatrixDayTimeEntry,
  MatrixEmployeeTimekeeping,
  StaffLockType,
  StaffRecord,
} from '../types';

export const MATRIX_UPDATED_EVENT = 'matrix-timekeeping-updated';
const LEAVE_REGISTRATIONS_STORAGE_KEY_NAME = 'app_leave_registrations';

export const getMatrixStorageKey = (department: string, year: number, month: number): string =>
  `app_matrix_timekeeping_${department.toLowerCase()}_${year}_${month}`;

export const getHolidayStorageKey = (department: string, year: number, month: number): string =>
  `app_matrix_holidays_${department.toLowerCase()}_${year}_${month}`;

export const getMatrixMetaStorageKey = (department: string, year: number, month: number): string =>
  `app_matrix_meta_${department.toLowerCase()}_${year}_${month}`;

export function isMatrixEntryWorking(entry: MatrixDayTimeEntry | undefined): boolean {
  if (!entry) return false;
  const totalHours = getMatrixEntryTotalHours(entry);
  if (totalHours > 0) return true;
  if (entry.inTime && entry.outTime) return true;
  return false;
}

export function isFutureCalendarDay(
  year: number,
  month: number,
  day: number,
  now: Date = new Date()
): boolean {
  const ny = now.getFullYear();
  const nm = now.getMonth() + 1;
  const nd = now.getDate();
  if (year > ny) return true;
  if (year < ny) return false;
  if (month > nm) return true;
  if (month < nm) return false;
  return day > nd;
}

export function isTodayCalendarDay(
  year: number,
  month: number,
  day: number,
  now: Date = new Date()
): boolean {
  return year === now.getFullYear() && month === now.getMonth() + 1 && day === now.getDate();
}

export function isLeaveMatrixStatus(status?: string): boolean {
  const st = String(status || '').trim();
  return (
    st === 'Nghỉ phép' ||
    st === 'Nghỉ cưới' ||
    st === 'Nghỉ tang' ||
    st === 'FAMILY' ||
    st === 'Nghỉ ốm' ||
    st === 'Vắng mặt' ||
    st === 'Nghỉ KL'
  );
}

export function resolveStaffLockType(
  staff?: StaffRecord,
  record?: Pick<MatrixEmployeeTimekeeping, 'lockType' | 'days'>
): StaffLockType {
  if (record?.lockType === 'REGIME_LEAVE' || record?.lockType === 'RESIGNED') {
    return record.lockType;
  }
  if (staff?.lockType === 'REGIME_LEAVE' || staff?.lockType === 'RESIGNED') {
    return staff.lockType;
  }
  if ((staff?.attendance as string) === 'Nghỉ chế độ') {
    return 'REGIME_LEAVE';
  }
  if (record?.days) {
    const hasRegimeDay = Object.values(record.days).some(
      (d) => (d?.status as string) === 'Nghỉ chế độ'
    );
    if (hasRegimeDay) return 'REGIME_LEAVE';
  }
  return 'RESIGNED';
}

export function isStaffLockedFromMatrix(
  staff?: StaffRecord,
  record?: Pick<MatrixEmployeeTimekeeping, 'isLocked' | 'manualUnlocked'> | boolean
): boolean {
  const recLocked = typeof record === 'boolean' ? record : record?.isLocked;
  const manualUnlocked = typeof record === 'boolean' ? false : Boolean(record?.manualUnlocked);
  if (recLocked === true) return true;
  if (manualUnlocked && recLocked === false) return false;
  if (
    staff?.attendance === 'Đã nghỉ việc' ||
    (staff?.attendance as string) === 'Đã thôi việc' ||
    (staff?.attendance as string) === 'Nghỉ chế độ'
  ) {
    return true;
  }
  if (!manualUnlocked && staff?.isLocked) return true;
  return false;
}

export function readStoredLeaveRegistrations(): LeaveRegistrationRecord[] {
  try {
    const raw = localStorage.getItem(LEAVE_REGISTRATIONS_STORAGE_KEY_NAME);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hasMatrixRealData(entry: MatrixDayTimeEntry | undefined): boolean {
  if (!entry) return false;
  if (entry.leaveRecordId !== undefined) return true;
  if (entry.isAutoDefault) return false;
  if (entry.isRestored || entry.isManual) return true;
  if (getMatrixEntryTotalHours(entry) > 0) return true;
  if (entry.inTime?.trim() || entry.outTime?.trim()) return true;
  const st = String(entry.status || '').trim();
  if (
    st === 'Nghỉ phép' ||
    st === 'Nghỉ cưới' ||
    st === 'Nghỉ tang' ||
    st === 'FAMILY' ||
    st === 'Nghỉ ốm' ||
    st === 'Vắng mặt' ||
    st === 'Nghỉ KL' ||
    st === 'Nghỉ lễ' ||
    st === 'Đi muộn' ||
    st === 'Về sớm' ||
    st === 'PRESENT' ||
    st === 'Đủ công' ||
    st === 'Đúng giờ'
  ) {
    return true;
  }
  return false;
}

export function getMatrixEntryTotalHours(entry: MatrixDayTimeEntry | undefined): number {
  if (!entry) return 0;
  return (
    (entry.regularHours || 0) +
    (entry.otDayHours || 0) +
    (entry.otNightHours || 0) +
    (entry.otSundayHours || 0) +
    (entry.otSundayNightHours || 0) +
    (entry.otHolidayHours || 0) +
    (entry.otHolidayNightHours || 0)
  );
}

export function recalculateStaffTotals(days: Record<number, MatrixDayTimeEntry>) {
  let totalWork = 0;
  let totalDayOt = 0;
  let totalNightOt = 0;
  let totalSundayDay = 0;
  let totalSundayNight = 0;
  let totalHolidayDay = 0;
  let totalHolidayNight = 0;

  Object.values(days).forEach((entry) => {
    const reg = entry.regularHours || 0;
    const otDay = entry.otDayHours || 0;
    const otNight = entry.otNightHours || 0;
    const otSunDay = entry.otSundayHours || 0;
    const otSunNight = entry.otSundayNightHours || 0;
    const otHolDay = entry.otHolidayHours || 0;
    const otHolNight = entry.otHolidayNightHours || 0;

    totalWork += reg + otDay + otNight + otSunDay + otSunNight + otHolDay + otHolNight;
    totalDayOt += otDay;
    totalNightOt += otNight;
    totalSundayDay += otSunDay;
    totalSundayNight += otSunNight;
    totalHolidayDay += otHolDay;
    totalHolidayNight += otHolNight;
  });

  return {
    totalWorkHours: Math.round(totalWork * 10) / 10,
    totalDayOt: Math.round(totalDayOt * 10) / 10,
    totalNightOt: Math.round(totalNightOt * 10) / 10,
    totalSundayDayHours: Math.round(totalSundayDay * 10) / 10,
    totalSundayNightHours: Math.round(totalSundayNight * 10) / 10,
    totalSundayOt: Math.round((totalSundayDay + totalSundayNight) * 10) / 10,
    totalHolidayDayHours: Math.round(totalHolidayDay * 10) / 10,
    totalHolidayNightHours: Math.round(totalHolidayNight * 10) / 10,
    totalHolidayOt: Math.round((totalHolidayDay + totalHolidayNight) * 10) / 10,
  };
}

export function buildStandardShiftEntry(
  staff: StaffRecord,
  day: number,
  isHoliday = false
): MatrixDayTimeEntry {
  const shift: 'DAY' | 'NIGHT' = staff.shift === 'NIGHT' ? 'NIGHT' : 'DAY';
  const inTime = shift === 'NIGHT' ? '20:00' : '08:00';
  const outTime = shift === 'NIGHT' ? '05:00' : '17:00';
  return {
    day,
    inTime,
    outTime,
    shift,
    regularHours: isHoliday ? 0 : 8,
    otDayHours: 0,
    otNightHours: 0,
    otSundayHours: 0,
    otSundayNightHours: 0,
    otHolidayHours: isHoliday && shift === 'DAY' ? 8 : 0,
    otHolidayNightHours: isHoliday && shift === 'NIGHT' ? 8 : 0,
    isHoliday,
    status: 'Đúng giờ',
    isAutoDefault: true,
  };
}

export function buildLeaveMatrixEntry(
  rec: LeaveRegistrationRecord,
  staff: StaffRecord,
  year: number,
  month: number,
  day: number,
  isHoliday: boolean
): MatrixDayTimeEntry {
  const shift: 'DAY' | 'NIGHT' = staff.shift === 'NIGHT' ? 'NIGHT' : 'DAY';
  const isSunday = new Date(year, month - 1, day).getDay() === 0;
  const noteLabel = rec.reason ? `[${rec.leaveType}] ${rec.reason}` : rec.leaveType;

  if (rec.leaveType === 'Nghỉ nửa phép') {
    const isAfternoonLeave =
      shift === 'DAY'
        ? (rec.fromTime || '').startsWith('13') || (rec.fromTime || '').startsWith('14')
        : (rec.fromTime || '').startsWith('01') || (rec.fromTime || '').startsWith('00');
    const inTime =
      shift === 'NIGHT'
        ? isAfternoonLeave
          ? '20:00'
          : '01:00'
        : isAfternoonLeave
        ? '08:00'
        : '13:00';
    const outTime =
      shift === 'NIGHT'
        ? isAfternoonLeave
          ? '00:00'
          : '05:00'
        : isAfternoonLeave
        ? '12:00'
        : '17:00';

    return {
      day,
      inTime,
      outTime,
      shift,
      regularHours: isHoliday || isSunday ? 0 : 4,
      otDayHours: 0,
      otNightHours: 0,
      otSundayHours: !isHoliday && isSunday && shift === 'DAY' ? 4 : 0,
      otSundayNightHours: !isHoliday && isSunday && shift === 'NIGHT' ? 4 : 0,
      otHolidayHours: isHoliday && shift === 'DAY' ? 4 : 0,
      otHolidayNightHours: isHoliday && shift === 'NIGHT' ? 4 : 0,
      isHoliday,
      status: 'Nghỉ phép',
      note: noteLabel,
      leaveRecordId: rec.id,
      isAutoDefault: false,
      isManual: false,
    };
  }

  if (rec.leaveType === 'Về sớm') {
    const inTime = shift === 'NIGHT' ? '20:00' : '08:00';
    const outTime = rec.toTime || (shift === 'NIGHT' ? '03:00' : '15:00');
    const calc = calculateMatrixDayHoursFromTimes(inTime, outTime, shift, isSunday, isHoliday);
    return {
      day,
      inTime,
      outTime,
      shift,
      regularHours: calc.regularHours,
      otDayHours: calc.otDayHours,
      otNightHours: calc.otNightHours,
      otSundayHours: calc.otSundayHours,
      otSundayNightHours: calc.otSundayNightHours,
      otHolidayHours: calc.otHolidayHours,
      otHolidayNightHours: calc.otHolidayNightHours,
      isHoliday,
      status: 'Về sớm',
      note: noteLabel,
      leaveRecordId: rec.id,
      isAutoDefault: false,
      isManual: false,
    };
  }

  const mappedStatus: AttendanceStatus =
    rec.leaveType === 'Nghỉ cưới'
      ? 'Nghỉ cưới'
      : rec.leaveType === 'Nghỉ ốm'
      ? 'Nghỉ ốm'
      : rec.leaveType === 'Nghỉ việc riêng'
      ? 'Nghỉ KL'
      : 'Nghỉ phép';

  return {
    day,
    inTime: '',
    outTime: '',
    shift,
    regularHours: 0,
    otDayHours: 0,
    otNightHours: 0,
    otSundayHours: 0,
    otSundayNightHours: 0,
    otHolidayHours: 0,
    otHolidayNightHours: 0,
    isHoliday,
    status: mappedStatus,
    note: noteLabel,
    leaveRecordId: rec.id,
    isAutoDefault: false,
    isManual: false,
  };
}

export function buildDefaultEmployeeMonthDays(
  staff: StaffRecord,
  year: number,
  month: number,
  holidayDays: Record<number, boolean> = {},
  isLocked = false
): Record<number, MatrixDayTimeEntry> {
  if (isStaffLockedFromMatrix(staff, isLocked)) {
    return {};
  }
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysRecord: Record<number, MatrixDayTimeEntry> = {};

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateObj = new Date(year, month - 1, day);
    const isSunday = dateObj.getDay() === 0;
    const isHoliday = Boolean(holidayDays[day]);
    const isFuture = isFutureCalendarDay(year, month, day);

    // Không tự động điền giờ làm việc cho các ngày tương lai (> ngày hiện tại)
    if (isFuture) {
      if (isHoliday || isSunday) {
        daysRecord[day] = {
          day,
          inTime: '',
          outTime: '',
          shift: staff.shift,
          regularHours: 0,
          otDayHours: 0,
          otNightHours: 0,
          otSundayHours: 0,
          otSundayNightHours: 0,
          otHolidayHours: 0,
          otHolidayNightHours: 0,
          isHoliday,
          status: (isHoliday ? 'Nghỉ lễ' : 'Nghỉ chủ nhật') as AttendanceStatus,
          isAutoDefault: true,
        };
      }
      continue;
    }

    if (isHoliday) {
      daysRecord[day] = {
        day,
        inTime: '',
        outTime: '',
        shift: staff.shift,
        regularHours: 0,
        otDayHours: 0,
        otNightHours: 0,
        otSundayHours: 0,
        otSundayNightHours: 0,
        otHolidayHours: 0,
        otHolidayNightHours: 0,
        isHoliday: true,
        status: 'Nghỉ lễ',
        isAutoDefault: true,
      };
    } else if (isSunday) {
      daysRecord[day] = {
        day,
        inTime: '',
        outTime: '',
        shift: staff.shift,
        regularHours: 0,
        otDayHours: 0,
        otNightHours: 0,
        otSundayHours: 0,
        otSundayNightHours: 0,
        otHolidayHours: 0,
        otHolidayNightHours: 0,
        isHoliday: false,
        status: 'Nghỉ chủ nhật',
        isAutoDefault: true,
      };
    } else {
      // Ngày làm việc tiêu chuẩn theo ca của từng nhân viên
      daysRecord[day] = buildStandardShiftEntry(staff, day, false);
    }
  }

  return daysRecord;
}

export function formatDateDDMMYYYY(date: Date = new Date()): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function parseDateJoined(dateJoinedStr?: string): Date | null {
  if (!dateJoinedStr) return null;
  const s = dateJoinedStr.trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      let d = Number(parts[0]);
      let m = Number(parts[1]);
      const y = Number(parts[2]);
      // Handle accidental MM/DD/YYYY format if month > 12
      if (m > 12 && d <= 12) {
        const tmp = d;
        d = m;
        m = tmp;
      }
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) return date;
    }
  }
  if (s.includes('-')) {
    const parts = s.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[2]);
        const date = new Date(y, m, d);
        if (!isNaN(date.getTime())) return date;
      } else {
        const d = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const y = Number(parts[2]);
        const date = new Date(y, m, d);
        if (!isNaN(date.getTime())) return date;
      }
    }
  }
  const date = new Date(s);
  if (!isNaN(date.getTime())) return date;
  return null;
}

export function isDayBeforeJoinDate(
  year: number,
  month: number,
  day: number,
  dateJoinedStr?: string
): boolean {
  const joinDate = parseDateJoined(dateJoinedStr);
  if (!joinDate) return false;
  const currentDayDate = new Date(year, month - 1, day);
  currentDayDate.setHours(0, 0, 0, 0);
  joinDate.setHours(0, 0, 0, 0);
  return currentDayDate < joinDate;
}

function getStaffLeaveMapForMonth(
  staff: StaffRecord,
  year: number,
  month: number,
  leaveRecords: LeaveRegistrationRecord[]
): {
  leaveByDay: Map<number, LeaveRegistrationRecord>;
  activeLeaveIds: Set<number>;
} {
  const empNorm = staff.employeeId.trim().toLowerCase();
  const empLeaves = leaveRecords.filter(
    (r) => r.employeeId && r.employeeId.trim().toLowerCase() === empNorm
  );
  const activeLeaveIds = new Set<number>(empLeaves.map((r) => r.id));
  const leaveByDay = new Map<number, LeaveRegistrationRecord>();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Sort oldest -> newest so newest registration wins if dates overlap
  const sorted = [...empLeaves].sort((a, b) => a.id - b.id);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSun = new Date(year, month - 1, day).getDay() === 0;
    for (const rec of sorted) {
      const from = rec.fromDate;
      const to = rec.toDate || rec.fromDate;
      if (!from || iso < from || iso > to) continue;
      // Multi-day leave skips Sunday so CN row isn't overwritten; single-day leave on Sunday still applies
      if (isSun && from !== to) continue;
      leaveByDay.set(day, rec);
    }
  }

  return { leaveByDay, activeLeaveIds };
}

export function applyJoinDateAndLockRules(
  days: Record<number, MatrixDayTimeEntry>,
  staff: StaffRecord,
  year: number,
  month: number,
  isLocked?: boolean,
  lockedDay?: number,
  holidayDays: Record<number, boolean> = {},
  leaveRecords?: LeaveRegistrationRecord[],
  lockType?: StaffLockType
): Record<number, MatrixDayTimeEntry> {
  const nextDays: Record<number, MatrixDayTimeEntry> = {};
  const daysInMonth = new Date(year, month, 0).getDate();
  const effectiveLeaves = leaveRecords ?? readStoredLeaveRegistrations();
  const { leaveByDay, activeLeaveIds } = getStaffLeaveMapForMonth(
    staff,
    year,
    month,
    effectiveLeaves
  );

  const effectiveLocked = isStaffLockedFromMatrix(staff, isLocked);
  const effectiveLockType: StaffLockType = lockType || resolveStaffLockType(staff);
  const lockedDayStatus: AttendanceStatus =
    effectiveLockType === 'REGIME_LEAVE' ? 'Nghỉ chế độ' : 'Đã nghỉ việc';

  for (let day = 1; day <= daysInMonth; day += 1) {
    let existing: MatrixDayTimeEntry | undefined = days[day];
    const isBeforeJoin = isDayBeforeJoinDate(year, month, day, staff.dateJoined);
    const isAfterLock = Boolean(effectiveLocked && lockedDay !== undefined && day >= lockedDay);
    const isFullLock = Boolean(effectiveLocked && lockedDay === undefined);
    const isSun = new Date(year, month - 1, day).getDay() === 0;
    const isHol = Boolean(holidayDays[day] || existing?.isHoliday);
    const isFuture = isFutureCalendarDay(year, month, day);
    const isToday = isTodayCalendarDay(year, month, day);

    if (isBeforeJoin) {
      // Giữ nguyên dữ liệu chấm công thực tế (từ file backup khôi phục, import hoặc chỉnh sửa thủ công)
      // Chỉ loại bỏ các ô tự sinh mặc định / Nghỉ chủ nhật tự sinh trước ngày vào làm
      if (existing && hasMatrixRealData(existing)) {
        nextDays[day] = existing;
      }
      continue;
    }

    if (isAfterLock) {
      nextDays[day] = {
        ...(existing || {
          day,
          shift: staff.shift,
        }),
        day,
        shift: existing?.shift || staff.shift,
        inTime: '',
        outTime: '',
        regularHours: 0,
        otDayHours: 0,
        otNightHours: 0,
        otSundayHours: 0,
        otSundayNightHours: 0,
        otHolidayHours: 0,
        otHolidayNightHours: 0,
        isHoliday: false,
        status: (isSun ? '' : lockedDayStatus) as AttendanceStatus,
        isAutoDefault: false,
      };
      continue;
    }

    // Nhân viên bị khóa thôi việc hoàn toàn (không có lockedDay cụ thể):
    // Không tự động điền giờ hay phép; chỉ giữ dữ liệu thực tế đã nhập/khôi phục, còn lại để trống.
    if (isFullLock) {
      if (
        existing &&
        !existing.isAutoDefault &&
        existing.leaveRecordId === undefined &&
        (existing.isManual || existing.isRestored || hasMatrixRealData(existing))
      ) {
        nextDays[day] = existing;
      }
      continue;
    }

    // If a synced leave record was deleted, clear that leave cell
    if (existing?.leaveRecordId !== undefined && !activeLeaveIds.has(existing.leaveRecordId)) {
      existing = undefined;
    }

    // 1. Auto-fill planned leave days (past, today, or future) — skip locked employees
    const plannedLeave = leaveByDay.get(day);
    if (plannedLeave && !isHol && !effectiveLocked) {
      if (
        !existing ||
        existing.isAutoDefault ||
        existing.leaveRecordId === plannedLeave.id ||
        (!existing.isManual && !existing.isRestored)
      ) {
        nextDays[day] = buildLeaveMatrixEntry(plannedLeave, staff, year, month, day, isHol);
        continue;
      }
    }

    // 2. Future days (> today): NEVER show auto-default working hours
    if (isFuture) {
      if (existing) {
        const keepAsReal =
          existing.leaveRecordId !== undefined ||
          isLeaveMatrixStatus(existing.status) ||
          Boolean(existing.isManual) ||
          Boolean(existing.isRestored);
        if (keepAsReal) {
          nextDays[day] = existing;
        } else if (isHol || isSun) {
          nextDays[day] = {
            day,
            shift: existing.shift || staff.shift,
            inTime: '',
            outTime: '',
            regularHours: 0,
            otDayHours: 0,
            otNightHours: 0,
            otSundayHours: 0,
            otSundayNightHours: 0,
            otHolidayHours: 0,
            otHolidayNightHours: 0,
            isHoliday: isHol,
            status: (isHol ? 'Nghỉ lễ' : 'Nghỉ chủ nhật') as AttendanceStatus,
            isAutoDefault: true,
          };
        }
      }
      continue;
    }

    // 3. Today ("ngày mới"): auto-fill standard shift check-in / check-out if cell is empty & staff is NOT locked
    if (isToday && !isSun && !isHol && !effectiveLocked) {
      const existingStatusStr = String(existing?.status || '').trim();
      const hasExistingWorkOrManual =
        existing &&
        (Boolean(existing.inTime?.trim()) ||
          Boolean(existing.outTime?.trim()) ||
          getMatrixEntryTotalHours(existing) > 0 ||
          isLeaveMatrixStatus(existing.status) ||
          existingStatusStr === 'Đã nghỉ việc' ||
          existingStatusStr === 'Đã thôi việc' ||
          existingStatusStr === 'Nghỉ chế độ' ||
          Boolean(existing.isManual) ||
          Boolean(existing.isRestored) ||
          existing.leaveRecordId !== undefined);

      if (!hasExistingWorkOrManual) {
        nextDays[day] = buildStandardShiftEntry(staff, day, false);
        continue;
      }
    }

    if (existing) {
      nextDays[day] = existing;
    }
  }

  return nextDays;
}

export function dispatchMatrixUpdatedEvent(department: string, year: number, month: number) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(MATRIX_UPDATED_EVENT, {
      detail: { department: department.toLowerCase(), year, month },
    })
  );
}

function readRawMatrixJson(
  dept: string,
  year: number,
  month: number
): Record<string, MatrixEmployeeTimekeeping> | null {
  try {
    const raw = localStorage.getItem(getMatrixStorageKey(dept, year, month));
    return raw ? (JSON.parse(raw) as Record<string, MatrixEmployeeTimekeeping>) : null;
  } catch {
    return null;
  }
}

function readRawHolidaysJson(
  dept: string,
  year: number,
  month: number
): Record<number, boolean> {
  try {
    const raw = localStorage.getItem(getHolidayStorageKey(dept, year, month));
    return raw ? (JSON.parse(raw) as Record<number, boolean>) || {} : {};
  } catch {
    return {};
  }
}

function countNonAutoDefaultRealDays(rec: MatrixEmployeeTimekeeping | undefined): number {
  if (!rec?.days) return 0;
  let count = 0;
  Object.values(rec.days).forEach((entry) => {
    if (!entry) return;
    if (!entry.isAutoDefault && (hasMatrixRealData(entry) || getMatrixEntryTotalHours(entry) > 0)) {
      count += 1;
    }
  });
  return count;
}

function hasFutureAutoDefaultWorkHours(
  rec: MatrixEmployeeTimekeeping | undefined,
  year: number,
  month: number
): boolean {
  if (!rec?.days) return false;
  return Object.values(rec.days).some(
    (entry) =>
      entry &&
      isFutureCalendarDay(year, month, entry.day) &&
      !entry.isManual &&
      !entry.isRestored &&
      entry.leaveRecordId === undefined &&
      !isLeaveMatrixStatus(entry.status) &&
      getMatrixEntryTotalHours(entry) > 0
  );
}

export function saveDepartmentMatrix(
  department: string,
  year: number,
  month: number,
  matrix: Record<string, MatrixEmployeeTimekeeping>,
  holidays: Record<number, boolean>,
  notify = true,
  syncSibling = true
) {
  try {
    const deptUpper = department.trim().toUpperCase();
    const ts = String(Date.now());
    localStorage.setItem(getMatrixStorageKey(deptUpper, year, month), JSON.stringify(matrix));
    localStorage.setItem(getHolidayStorageKey(deptUpper, year, month), JSON.stringify(holidays));
    localStorage.setItem(getMatrixMetaStorageKey(deptUpper, year, month), ts);

    // Keep MULTI and ALL (HC & NS) matrices 100% synchronized
    if (syncSibling && (deptUpper === 'MULTI' || deptUpper === 'ALL')) {
      const siblingDept = deptUpper === 'MULTI' ? 'ALL' : 'MULTI';
      const existingSibling = readRawMatrixJson(siblingDept, year, month) || {};
      const nextSibling: Record<string, MatrixEmployeeTimekeeping> = { ...existingSibling };

      if (deptUpper === 'MULTI') {
        Object.entries(matrix).forEach(([empKey, rec]) => {
          const matchedSiblingKey = findEmployeeKey(nextSibling, empKey) || empKey;
          nextSibling[matchedSiblingKey] = rec;
        });
      } else {
        Object.entries(matrix).forEach(([empKey, rec]) => {
          const recDept = (rec.department || 'MULTI').trim().toUpperCase();
          const matchedMultiKey = findEmployeeKey(nextSibling, empKey);
          if (matchedMultiKey || recDept === 'MULTI') {
            nextSibling[matchedMultiKey || empKey] = rec;
          }
        });
      }

      localStorage.setItem(
        getMatrixStorageKey(siblingDept, year, month),
        JSON.stringify(nextSibling)
      );
      localStorage.setItem(
        getHolidayStorageKey(siblingDept, year, month),
        JSON.stringify(holidays)
      );
      localStorage.setItem(getMatrixMetaStorageKey(siblingDept, year, month), ts);
    }

    if (notify) {
      dispatchMatrixUpdatedEvent(deptUpper, year, month);
    }
  } catch (e) {
    console.error('Error saving matrix/holidays', e);
  }
}

export function loadOrInitDepartmentMatrix(
  department: string,
  year: number,
  month: number,
  targetStaff: StaffRecord[],
  persistChanges = true,
  leaveRecords?: LeaveRegistrationRecord[]
): {
  matrix: Record<string, MatrixEmployeeTimekeeping>;
  holidays: Record<number, boolean>;
} {
  const deptUpper = department.trim().toUpperCase();
  const siblingDept = deptUpper === 'ALL' ? 'MULTI' : deptUpper === 'MULTI' ? 'ALL' : null;

  let holidays = readRawHolidaysJson(deptUpper, year, month);
  let parsedSaved = readRawMatrixJson(deptUpper, year, month);

  const selfMeta = Number(localStorage.getItem(getMatrixMetaStorageKey(deptUpper, year, month)) || '0') || 0;
  const siblingHolidays = siblingDept ? readRawHolidaysJson(siblingDept, year, month) : {};
  const siblingParsed = siblingDept ? readRawMatrixJson(siblingDept, year, month) : null;
  const siblingMeta = siblingDept
    ? Number(localStorage.getItem(getMatrixMetaStorageKey(siblingDept, year, month)) || '0') || 0
    : 0;

  if (Object.keys(holidays).length === 0 && Object.keys(siblingHolidays).length > 0) {
    holidays = { ...siblingHolidays };
  } else if (siblingDept === 'MULTI' && siblingMeta >= selfMeta && Object.keys(siblingHolidays).length > 0) {
    holidays = { ...siblingHolidays };
  }

  const normalized: Record<string, MatrixEmployeeTimekeeping> = {};
  let needsPersist = !parsedSaved && targetStaff.length > 0;

  const staffById = new Map<string, StaffRecord>();
  targetStaff.forEach((st) => staffById.set(st.employeeId.trim().toLowerCase(), st));

  if (parsedSaved) {
    Object.entries(parsedSaved).forEach(([empId, rec]) => {
      const matchedStaff = staffById.get(empId.trim().toLowerCase());
      let sourceRec = rec;

      // Reconcile MULTI <-> ALL so HC & NS and Multi Auto never diverge
      if (siblingParsed && siblingDept) {
        const sibKey = findEmployeeKey(siblingParsed, empId);
        const sibRec = sibKey ? siblingParsed[sibKey] : undefined;
        if (sibRec) {
          const selfHasStaleFuture = hasFutureAutoDefaultWorkHours(rec, year, month);
          const sibHasStaleFuture = hasFutureAutoDefaultWorkHours(sibRec, year, month);
          const selfReal = countNonAutoDefaultRealDays(rec);
          const sibReal = countNonAutoDefaultRealDays(sibRec);

          if (siblingDept === 'MULTI') {
            if (
              siblingMeta >= selfMeta ||
              (selfHasStaleFuture && !sibHasStaleFuture) ||
              sibReal > selfReal
            ) {
              sourceRec = sibRec;
              needsPersist = true;
            }
          } else if (siblingDept === 'ALL') {
            if (siblingMeta > selfMeta && !sibHasStaleFuture && sibReal >= selfReal) {
              sourceRec = sibRec;
              needsPersist = true;
            }
          }
        }
      }

      const resolvedLocked = matchedStaff
        ? isStaffLockedFromMatrix(matchedStaff, sourceRec)
        : Boolean(sourceRec.isLocked);
      const resolvedLockType = resolvedLocked
        ? resolveStaffLockType(matchedStaff, sourceRec)
        : undefined;
      const rawDays = sourceRec.days || {};
      const appliedDays = matchedStaff
        ? applyJoinDateAndLockRules(
            rawDays,
            matchedStaff,
            year,
            month,
            resolvedLocked,
            sourceRec.lockedDay,
            holidays,
            leaveRecords,
            resolvedLockType
          )
        : rawDays;
      const totals = recalculateStaffTotals(appliedDays);
      if (resolvedLocked !== Boolean(sourceRec.isLocked)) {
        needsPersist = true;
      }
      if (Object.keys(appliedDays).length !== Object.keys(rawDays).length) {
        needsPersist = true;
      } else {
        // Detect if today's standard hours, lock rules, or leave sync altered any day entry
        for (const k of Object.keys(appliedDays)) {
          const dayNum = Number(k);
          if (rawDays[dayNum] !== appliedDays[dayNum]) {
            needsPersist = true;
            break;
          }
        }
      }
      normalized[empId] = {
        ...sourceRec,
        isLocked: resolvedLocked,
        lockType: resolvedLockType,
        days: appliedDays,
        ...totals,
      };
    });
  }

  targetStaff.forEach((staff) => {
    const existingKey = findEmployeeKey(normalized, staff.employeeId);
    if (!existingKey) {
      // Check if sibling already has this employee before synthesizing defaults
      const sibKey = siblingParsed ? findEmployeeKey(siblingParsed, staff.employeeId) : undefined;
      const sibRec = sibKey && siblingParsed ? siblingParsed[sibKey] : undefined;

      const isSan = staff.employeeId === 'TV2610025';
      const initLocked = sibRec
        ? isStaffLockedFromMatrix(staff, sibRec)
        : isSan || isStaffLockedFromMatrix(staff);
      const initLockedDay = sibRec ? sibRec.lockedDay : isSan ? 12 : staff.lockedDay;
      const initLockType = initLocked ? resolveStaffLockType(staff, sibRec) : undefined;
      const rawDays = sibRec?.days
        ? sibRec.days
        : buildDefaultEmployeeMonthDays(staff, year, month, holidays, initLocked);
      const daysRecord = applyJoinDateAndLockRules(
        rawDays,
        staff,
        year,
        month,
        initLocked,
        initLockedDay,
        holidays,
        leaveRecords,
        initLockType
      );
      const totals = recalculateStaffTotals(daysRecord);
      normalized[staff.employeeId] = {
        employeeId: staff.employeeId,
        fullName: staff.fullName,
        department: staff.department || department,
        position: staff.position || 'Công nhân vận hành',
        shift: staff.shift,
        isLocked: initLocked,
        lockType: initLockType,
        lockedDay: initLockedDay,
        manualUnlocked: sibRec?.manualUnlocked,
        days: daysRecord,
        ...totals,
      };
      needsPersist = true;
    } else {
      const rec = normalized[existingKey];
      const resolvedLocked = isStaffLockedFromMatrix(staff, rec);
      const resolvedLockType = resolvedLocked ? resolveStaffLockType(staff, rec) : undefined;
      const resolvedLockedDay = rec.lockedDay ?? staff.lockedDay;
      const appliedDays = applyJoinDateAndLockRules(
        rec.days || {},
        staff,
        year,
        month,
        resolvedLocked,
        resolvedLockedDay,
        holidays,
        leaveRecords,
        resolvedLockType
      );
      const totals = recalculateStaffTotals(appliedDays);
      if (resolvedLocked !== Boolean(rec.isLocked)) {
        needsPersist = true;
      }
      if (existingKey !== staff.employeeId) {
        delete normalized[existingKey];
      }
      normalized[staff.employeeId] = {
        ...rec,
        employeeId: staff.employeeId,
        fullName: staff.fullName,
        department: staff.department || rec.department || department,
        position: staff.position || rec.position,
        shift: staff.shift,
        isLocked: resolvedLocked,
        lockType: resolvedLockType,
        lockedDay: resolvedLocked ? resolvedLockedDay : rec.lockedDay,
        days: appliedDays,
        ...totals,
      };
    }
  });

  if (needsPersist && persistChanges && targetStaff.length > 0) {
    saveDepartmentMatrix(deptUpper, year, month, normalized, holidays, false, true);
  }

  return { matrix: normalized, holidays };
}

function findEmployeeKey(
  record: Record<string, MatrixEmployeeTimekeeping>,
  empId: string
): string | undefined {
  if (record[empId]) return empId;
  const target = empId.trim().toLowerCase();
  return Object.keys(record).find((k) => k.trim().toLowerCase() === target);
}

export function getEmployeeProfileMatrixData(
  empId: string,
  empDept: string,
  year: number,
  month: number,
  staffInfo?: StaffRecord
): {
  days: Record<number, MatrixDayTimeEntry>;
  holidays: Record<number, boolean>;
  sourceDepartment: string;
} {
  const normalizedDept = (empDept || 'MULTI').trim().toLowerCase();
  // Always prioritize Multi Auto matrix ('multi') for Multi Auto employees,
  // or check multi first when present so updates from tab Chấm công Multi Auto sync cleanly.
  const deptCandidates =
    normalizedDept === 'multi'
      ? ['multi', 'all', 'hr']
      : Array.from(new Set(['multi', normalizedDept, 'all', 'hr']));

  let bestMatch: {
    days: Record<number, MatrixDayTimeEntry>;
    holidays: Record<number, boolean>;
    sourceDepartment: string;
    updatedAt: number;
  } | null = null;

  for (const deptKey of deptCandidates) {
    try {
      const raw = localStorage.getItem(getMatrixStorageKey(deptKey, year, month));
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Record<string, MatrixEmployeeTimekeeping>;
      const matchedKey = parsed ? findEmployeeKey(parsed, empId) : undefined;
      if (matchedKey && parsed[matchedKey]?.days) {
        let holidays: Record<number, boolean> = {};
        try {
          const hRaw = localStorage.getItem(getHolidayStorageKey(deptKey, year, month));
          if (hRaw) holidays = JSON.parse(hRaw) || {};
        } catch {
          // ignore
        }
        const metaTs = Number(localStorage.getItem(getMatrixMetaStorageKey(deptKey, year, month)) || '0') || 0;

        // If employee belongs to MULTI, prefer 'multi' immediately when found.
        if (normalizedDept === 'multi' && deptKey === 'multi') {
          const baseDays = parsed[matchedKey].days;
          const syncedDays = staffInfo
            ? applyJoinDateAndLockRules(
                baseDays,
                staffInfo,
                year,
                month,
                isStaffLockedFromMatrix(staffInfo, parsed[matchedKey]),
                parsed[matchedKey].lockedDay,
                holidays,
                undefined,
                resolveStaffLockType(staffInfo, parsed[matchedKey])
              )
            : baseDays;
          return {
            days: syncedDays,
            holidays,
            sourceDepartment: deptKey.toUpperCase(),
          };
        }

        if (!bestMatch || metaTs > bestMatch.updatedAt) {
          const baseDays = parsed[matchedKey].days;
          const syncedDays = staffInfo
            ? applyJoinDateAndLockRules(
                baseDays,
                staffInfo,
                year,
                month,
                isStaffLockedFromMatrix(staffInfo, parsed[matchedKey]),
                parsed[matchedKey].lockedDay,
                holidays,
                undefined,
                resolveStaffLockType(staffInfo, parsed[matchedKey])
              )
            : baseDays;
          bestMatch = {
            days: syncedDays,
            holidays,
            sourceDepartment: deptKey.toUpperCase(),
            updatedAt: metaTs,
          };
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  if (bestMatch) {
    return {
      days: bestMatch.days,
      holidays: bestMatch.holidays,
      sourceDepartment: bestMatch.sourceDepartment,
    };
  }

  // Fallback holidays if saved independently
  let fallbackHolidays: Record<number, boolean> = {};
  for (const deptKey of deptCandidates) {
    try {
      const hRaw = localStorage.getItem(getHolidayStorageKey(deptKey, year, month));
      if (hRaw) {
        const parsedH = JSON.parse(hRaw);
        if (parsedH && Object.keys(parsedH).length > 0) {
          fallbackHolidays = parsedH;
          break;
        }
      }
    } catch {
      // ignore
    }
  }

  // If no saved matrix exists in localStorage yet for this month, generate matching MultiAuto default schedule
  if (staffInfo) {
    const locked = isStaffLockedFromMatrix(staffInfo);
    const rawDays = buildDefaultEmployeeMonthDays(staffInfo, year, month, fallbackHolidays, locked);
    return {
      days: applyJoinDateAndLockRules(
        rawDays,
        staffInfo,
        year,
        month,
        locked,
        staffInfo.lockedDay,
        fallbackHolidays,
        undefined,
        resolveStaffLockType(staffInfo)
      ),
      holidays: fallbackHolidays,
      sourceDepartment: 'MULTI',
    };
  }

  return {
    days: {},
    holidays: fallbackHolidays,
    sourceDepartment: 'MULTI',
  };
}

export function syncLeaveRegistrationToMatrices(
  record: LeaveRegistrationRecord,
  allStaff: StaffRecord[]
) {
  const fromParts = (record.fromDate || '').split('-').map(Number);
  const toParts = (record.toDate || record.fromDate || '').split('-').map(Number);
  if (fromParts.length !== 3 || fromParts.some(isNaN)) return;

  const startDt = new Date(fromParts[0], fromParts[1] - 1, fromParts[2]);
  const endDt =
    toParts.length === 3 && !toParts.some(isNaN)
      ? new Date(toParts[0], toParts[1] - 1, toParts[2])
      : startDt;

  const staff = allStaff.find(
    (s) => s.employeeId.trim().toLowerCase() === record.employeeId.trim().toLowerCase()
  );
  if (!staff) return;

  const monthPairs = new Map<string, { year: number; month: number }>();
  const cursor = new Date(startDt);
  let guard = 0;
  while (cursor <= endDt && guard < 400) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + 1;
    monthPairs.set(`${y}_${m}`, { year: y, month: m });
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }

  const primaryDept =
    (staff.department || 'MULTI').trim().toUpperCase() === 'MULTI' ? 'MULTI' : 'ALL';

  monthPairs.forEach(({ year, month }) => {
    const deptStaff =
      primaryDept === 'MULTI'
        ? allStaff.filter((s) => (s.department || 'MULTI').trim().toUpperCase() === 'MULTI')
        : allStaff;

    const { matrix, holidays } = loadOrInitDepartmentMatrix(
      primaryDept,
      year,
      month,
      deptStaff,
      false
    );

    const empKey = findEmployeeKey(matrix, staff.employeeId) || staff.employeeId;
    const empRecord = matrix[empKey];
    if (!empRecord) return;

    const nextDays = { ...(empRecord.days || {}) };
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const fromIso = record.fromDate;
      const toIso = record.toDate || record.fromDate;
      if (iso < fromIso || iso > toIso) continue;
      if (isDayBeforeJoinDate(year, month, day, staff.dateJoined)) continue;
      if (
        isStaffLockedFromMatrix(staff, empRecord) &&
        (empRecord.lockedDay === undefined || day >= empRecord.lockedDay)
      ) {
        continue;
      }
      const isSun = new Date(year, month - 1, day).getDay() === 0;
      const isHol = Boolean(holidays[day] || nextDays[day]?.isHoliday);
      if (isHol) continue;
      if (isSun && fromIso !== toIso) continue;

      nextDays[day] = buildLeaveMatrixEntry(record, staff, year, month, day, isHol);
    }

    const totals = recalculateStaffTotals(nextDays);
    const nextMatrix = {
      ...matrix,
      [empKey]: {
        ...empRecord,
        days: nextDays,
        ...totals,
      },
    };
    saveDepartmentMatrix(primaryDept, year, month, nextMatrix, holidays, true, true);
  });
}

export function removeLeaveRegistrationFromMatrices(
  recordId: number,
  allStaff: StaffRecord[]
) {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith('app_matrix_timekeeping_')) keys.push(k);
    }
    const staffById = new Map<string, StaffRecord>();
    allStaff.forEach((s) => staffById.set(s.employeeId.trim().toLowerCase(), s));

    const updatedEvents: Array<{ dept: string; year: number; month: number }> = [];
    keys.forEach((key) => {
      const m = key.match(/^app_matrix_timekeeping_(.+)_(\d{4})_(\d{1,2})$/);
      if (!m) return;
      const dept = m[1].toUpperCase();
      const year = Number(m[2]);
      const month = Number(m[3]);
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, MatrixEmployeeTimekeeping>;
      if (!parsed || typeof parsed !== 'object') return;
      const holidays = readRawHolidaysJson(dept, year, month);
      let changed = false;

      Object.entries(parsed).forEach(([empKey, rec]) => {
        if (!rec?.days) return;
        let empChanged = false;
        const nextDays = { ...rec.days };
        Object.entries(nextDays).forEach(([dStr, entry]) => {
          if (entry && entry.leaveRecordId === recordId) {
            const dNum = Number(dStr);
            const matchedStaff = staffById.get(rec.employeeId.trim().toLowerCase());
            const isSun = new Date(year, month - 1, dNum).getDay() === 0;
            const isHol = Boolean(holidays[dNum]);
            if (isTodayCalendarDay(year, month, dNum) && !isSun && !isHol && matchedStaff) {
              nextDays[dNum] = buildStandardShiftEntry(matchedStaff, dNum, false);
            } else {
              delete nextDays[dNum];
            }
            empChanged = true;
          }
        });
        if (empChanged) {
          changed = true;
          const totals = recalculateStaffTotals(nextDays);
          parsed[empKey] = { ...rec, days: nextDays, ...totals };
        }
      });

      if (changed) {
        saveDepartmentMatrix(dept, year, month, parsed, holidays, false, false);
        updatedEvents.push({ dept, year, month });
      }
    });

    updatedEvents.forEach(({ dept, year, month }) =>
      dispatchMatrixUpdatedEvent(dept, year, month)
    );
  } catch (e) {
    console.error('Error removing leave registration from matrices', e);
  }
}

function parseHhMmToMins(t?: string): number | null {
  if (!t) return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (isNaN(h) || isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function calculateMatrixDayHoursFromTimes(
  inTime: string,
  outTime: string,
  shift: 'DAY' | 'NIGHT',
  isSunday: boolean,
  isHoliday: boolean
): {
  regularHours: number;
  otDayHours: number;
  otNightHours: number;
  otSundayHours: number;
  otSundayNightHours: number;
  otHolidayHours: number;
  otHolidayNightHours: number;
  totalOtHours: number;
  suggestedStatus: AttendanceStatus;
} {
  const inM = parseHhMmToMins(inTime);
  const outM = parseHhMmToMins(outTime);

  if (inM === null || outM === null) {
    return {
      regularHours: 0,
      otDayHours: 0,
      otNightHours: 0,
      otSundayHours: 0,
      otSundayNightHours: 0,
      otHolidayHours: 0,
      otHolidayNightHours: 0,
      totalOtHours: 0,
      suggestedStatus: isHoliday ? 'Nghỉ lễ' : isSunday ? 'Nghỉ chủ nhật' : 'Nghỉ phép',
    };
  }

  let workedMins = 0;
  if (shift === 'NIGHT') {
    const adjustedOut = outM <= inM ? outM + 24 * 60 : outM;
    const effectiveOut = adjustedOut > 29 * 60 && adjustedOut - 29 * 60 < 15 ? 29 * 60 : adjustedOut;
    let span = Math.max(0, effectiveOut - inM);
    // Trừ 60 phút nghỉ giữa ca đêm (20:00 -> 05:00 = 8h, 20:00 -> 08:00 = 11h)
    if (span >= 6 * 60 && inM <= 23 * 60 && effectiveOut >= 25 * 60) {
      span -= 60;
    }
    workedMins = Math.max(0, span);
  } else {
    const effectiveOut = outM > 17 * 60 && outM - 17 * 60 < 15 ? 17 * 60 : outM;
    let span = effectiveOut > inM ? effectiveOut - inM : 0;
    // Trừ 60 phút nghỉ trưa (12:00 - 13:00)
    if (inM < 12 * 60 && effectiveOut > 13 * 60) {
      span -= 60;
    }
    workedMins = Math.max(0, span);
  }

  const totalHours = Math.round((workedMins / 60) * 10) / 10;

  let regularHours = 0;
  let otDayHours = 0;
  let otNightHours = 0;
  let otSundayHours = 0;
  let otSundayNightHours = 0;
  let otHolidayHours = 0;
  let otHolidayNightHours = 0;

  if (isHoliday) {
    if (shift === 'NIGHT') otHolidayNightHours = totalHours;
    else otHolidayHours = totalHours;
  } else if (isSunday) {
    if (shift === 'NIGHT') otSundayNightHours = totalHours;
    else otSundayHours = totalHours;
  } else {
    regularHours = Math.min(8, totalHours);
    const ot = Math.max(0, Math.round((totalHours - regularHours) * 10) / 10);
    if (shift === 'NIGHT') otNightHours = ot;
    else otDayHours = ot;
  }

  let suggestedStatus: AttendanceStatus = 'Đúng giờ';
  if (shift === 'NIGHT') {
    const adjustedOut = outM <= inM ? outM + 24 * 60 : outM;
    if (inM > 20 * 60) suggestedStatus = 'Đi muộn';
    else if (adjustedOut < 29 * 60) suggestedStatus = 'Về sớm'; // < 05:00
  } else {
    if (inM > 8 * 60) suggestedStatus = 'Đi muộn';
    else if (outM < 17 * 60) suggestedStatus = 'Về sớm';
  }

  const totalOtHours = Math.round(
    (otDayHours +
      otNightHours +
      otSundayHours +
      otSundayNightHours +
      otHolidayHours +
      otHolidayNightHours) *
      10
  ) / 10;

  return {
    regularHours,
    otDayHours,
    otNightHours,
    otSundayHours,
    otSundayNightHours,
    otHolidayHours,
    otHolidayNightHours,
    totalOtHours,
    suggestedStatus,
  };
}

export function updateEmployeeMatrixDayEntry(params: {
  staff: StaffRecord;
  allStaff: StaffRecord[];
  year: number;
  month: number;
  day: number;
  entryPatch: Partial<MatrixDayTimeEntry>;
}): { ok: boolean; error?: string; sourceDepartment?: string } {
  const { staff, allStaff, year, month, day, entryPatch } = params;

  const normalizedDept = (staff.department || 'MULTI').trim().toLowerCase();
  const deptCandidates =
    normalizedDept === 'multi'
      ? ['multi', 'all', 'hr']
      : Array.from(new Set(['multi', normalizedDept, 'all', 'hr']));

  const existingDepts: string[] = [];
  for (const deptKey of deptCandidates) {
    try {
      const raw = localStorage.getItem(getMatrixStorageKey(deptKey, year, month));
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Record<string, MatrixEmployeeTimekeeping>;
      if (parsed && findEmployeeKey(parsed, staff.employeeId)) {
        existingDepts.push(deptKey);
      }
    } catch {
      // ignore
    }
  }

  const targetDepts =
    existingDepts.length > 0
      ? existingDepts
      : [normalizedDept === 'multi' ? 'multi' : 'all'];

  let blockedError: string | undefined;
  let updatedCount = 0;
  let lastSavedDept = '';

  targetDepts.forEach((deptKey) => {
    const deptUpper = deptKey.toUpperCase();
    const targetDeptStaff =
      deptUpper === 'MULTI'
        ? allStaff.filter((s) => (s.department || 'MULTI').trim().toUpperCase() === 'MULTI')
        : deptUpper === 'ALL' || deptUpper === 'HR'
        ? allStaff
        : allStaff.filter((s) => (s.department || '').trim().toUpperCase() === deptUpper);

    const effectiveStaffList =
      targetDeptStaff.some(
        (s) => s.employeeId.trim().toLowerCase() === staff.employeeId.trim().toLowerCase()
      )
        ? targetDeptStaff
        : [...targetDeptStaff, staff];

    const { matrix, holidays } = loadOrInitDepartmentMatrix(
      deptUpper,
      year,
      month,
      effectiveStaffList,
      false
    );

    const empKey = findEmployeeKey(matrix, staff.employeeId) || staff.employeeId;
    const empRecord = matrix[empKey];
    if (!empRecord) return;

    if (empRecord.isLocked) {
      if (empRecord.lockedDay === undefined || day >= empRecord.lockedDay) {
        blockedError =
          empRecord.lockedDay !== undefined
            ? `Nhân viên ${staff.fullName} đã nghỉ việc từ ngày ${empRecord.lockedDay}. Không thể sửa giờ bảng công.`
            : `Nhân viên ${staff.fullName} đang bị khóa chấm công trong tháng này.`;
        return;
      }
    }

    const isSunday = new Date(year, month - 1, day).getDay() === 0;
    const existingEntry: MatrixDayTimeEntry = empRecord.days?.[day] || {
      day,
      shift: staff.shift || 'DAY',
      regularHours: 0,
      otDayHours: 0,
      otNightHours: 0,
      otSundayHours: 0,
      otSundayNightHours: 0,
      otHolidayHours: 0,
      otHolidayNightHours: 0,
      isHoliday: Boolean(holidays[day]),
      status: holidays[day] ? 'Nghỉ lễ' : isSunday ? 'Nghỉ chủ nhật' : 'Đúng giờ',
    };

    const mergedEntry: MatrixDayTimeEntry = {
      ...existingEntry,
      ...entryPatch,
      day,
      isManual: true,
      isAutoDefault: false,
    };

    const rawDays = {
      ...(empRecord.days || {}),
      [day]: mergedEntry,
    };

    const appliedDays = applyJoinDateAndLockRules(
      rawDays,
      staff,
      year,
      month,
      empRecord.isLocked,
      empRecord.lockedDay,
      holidays
    );
    const totals = recalculateStaffTotals(appliedDays);

    const nextMatrix: Record<string, MatrixEmployeeTimekeeping> = {
      ...matrix,
      [empKey]: {
        ...empRecord,
        days: appliedDays,
        ...totals,
      },
    };

    saveDepartmentMatrix(deptUpper, year, month, nextMatrix, holidays, true);
    updatedCount += 1;
    lastSavedDept = deptUpper;
  });

  if (updatedCount === 0) {
    return {
      ok: false,
      error: blockedError || `Không tìm thấy dữ liệu bảng công của ${staff.fullName}.`,
    };
  }

  return { ok: true, sourceDepartment: lastSavedDept };
}

export function getAllStoredMatrixSnapshots(): Record<string, string> {
  const snapshots: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('app_matrix_timekeeping_') ||
          key.startsWith('app_matrix_holidays_') ||
          key.startsWith('app_matrix_meta_') ||
          key.startsWith('app_timekeeping_machine_swipes_'))
      ) {
        const val = localStorage.getItem(key);
        if (val !== null) snapshots[key] = val;
      }
    }
  } catch (e) {
    console.error('Error reading matrix snapshots', e);
  }
  return snapshots;
}

export function restoreStoredMatrixSnapshots(snapshots: Record<string, string> | undefined) {
  if (!snapshots || typeof snapshots !== 'object') return;
  try {
    Object.entries(snapshots).forEach(([key, val]) => {
      if (
        (key.startsWith('app_matrix_timekeeping_') ||
          key.startsWith('app_matrix_holidays_') ||
          key.startsWith('app_matrix_meta_') ||
          key.startsWith('app_timekeeping_machine_swipes_')) &&
        typeof val === 'string'
      ) {
        localStorage.setItem(key, val);
      }
    });
    if (typeof window !== 'undefined') {
      const now = new Date();
      dispatchMatrixUpdatedEvent('multi', now.getFullYear(), now.getMonth() + 1);
    }
  } catch (e) {
    console.error('Error restoring matrix snapshots', e);
  }
}

export function deleteEmployeeFromAllMatrixStorage(employeeId: string) {
  const target = employeeId.trim().toLowerCase();
  if (!target) return;

  const updatedEvents: Array<{ dept: string; year: number; month: number }> = [];

  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }

    keys.forEach((key) => {
      if (key.startsWith('app_matrix_timekeeping_')) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return;
          const parsed = JSON.parse(raw) as Record<string, MatrixEmployeeTimekeeping>;
          if (!parsed || typeof parsed !== 'object') return;

          let changed = false;
          const nextMatrix: Record<string, MatrixEmployeeTimekeeping> = {};
          Object.entries(parsed).forEach(([empKey, rec]) => {
            const matchKey = empKey.trim().toLowerCase() === target;
            const matchRec = rec?.employeeId?.trim().toLowerCase() === target;
            if (matchKey || matchRec) {
              changed = true;
            } else {
              nextMatrix[empKey] = rec;
            }
          });

          if (changed) {
            localStorage.setItem(key, JSON.stringify(nextMatrix));
            const m = key.match(/^app_matrix_timekeeping_(.+)_(\d{4})_(\d{1,2})$/);
            if (m) {
              const dept = m[1].toUpperCase();
              const year = Number(m[2]);
              const month = Number(m[3]);
              localStorage.setItem(getMatrixMetaStorageKey(dept, year, month), String(Date.now()));
              updatedEvents.push({ dept, year, month });
            }
          }
        } catch (err) {
          console.error('Error purging employee from matrix storage', key, err);
        }
      } else if (key.startsWith('app_timekeeping_machine_swipes_')) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return;
          const parsed = JSON.parse(raw) as Record<string, { employeeId?: string }>;
          if (!parsed || typeof parsed !== 'object') return;

          let changed = false;
          const nextSwipes: Record<string, unknown> = {};
          Object.entries(parsed).forEach(([swipeKey, rec]) => {
            const keyPrefixMatch = swipeKey.trim().toLowerCase().startsWith(`${target}_`);
            const empMatch = rec?.employeeId?.trim().toLowerCase() === target;
            if (keyPrefixMatch || empMatch) {
              changed = true;
            } else {
              nextSwipes[swipeKey] = rec;
            }
          });

          if (changed) {
            localStorage.setItem(key, JSON.stringify(nextSwipes));
          }
        } catch (err) {
          console.error('Error purging employee from swipe storage', key, err);
        }
      }
    });

    if (typeof window !== 'undefined') {
      if (updatedEvents.length > 0) {
        updatedEvents.forEach(({ dept, year, month }) => {
          dispatchMatrixUpdatedEvent(dept, year, month);
        });
      } else {
        const now = new Date();
        dispatchMatrixUpdatedEvent('multi', now.getFullYear(), now.getMonth() + 1);
      }
    }
  } catch (e) {
    console.error('Error deleting employee matrix storage', e);
  }
}

export interface FlatAttendanceBackupRow {
  employeeId: string;
  note: string;
  shift: 'DAY' | 'NIGHT';
  date: string; // YYYY-MM-DD
  id: string; // YYYY-MM-DD_employeeId
  status: string;
  overtime: number;
  lateIn: string;
  manualOut: string;
  earlyIn: string;
  manualIn: string;
  sundayNightOT: number | '';
  sundayDayOT: number | '';
  earlyOut: string;
}

export function parseBackupNumber(raw: any): number {
  if (raw === undefined || raw === null || raw === '') return 0;
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  const cleaned = String(raw).trim().replace(',', '.');
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseBackupDateToIso(raw: any): {
  iso: string;
  year: number;
  month: number;
  day: number;
} | null {
  if (raw === undefined || raw === null || raw === '') return null;

  const makeRes = (y: number, m: number, d: number) => {
    if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return {
      iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      year: y,
      month: m,
      day: d,
    };
  };

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return makeRes(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
  }

  if (typeof raw === 'number' && raw > 1000) {
    const utcDate = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return makeRes(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate());
  }

  const s = String(raw).trim().replace(/^'+/, '');
  if (!s) return null;

  // YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    return makeRes(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  // DD/MM/YYYY or MM/DD/YYYY (fallback when middle segment > 12)
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) {
    let p1 = Number(m[1]);
    let p2 = Number(m[2]);
    if (p2 > 12 && p1 <= 12) {
      const tmp = p1;
      p1 = p2;
      p2 = tmp;
    }
    return makeRes(Number(m[3]), p2, p1);
  }

  return null;
}

function addMinutesToHhMm(baseHhMm: string, addHours: number): string {
  const m = baseHhMm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return baseHhMm;
  const baseMins = Number(m[1]) * 60 + Number(m[2]);
  const totalMins = (baseMins + Math.round(addHours * 60)) % (24 * 60);
  const hh = Math.floor(totalMins / 60);
  const mm = totalMins % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function exportFlatAttendanceBackupRows(
  allStaff: StaffRecord[],
  attendanceHistory: AttendanceRecord[] = []
): FlatAttendanceBackupRow[] {
  const rowMap = new Map<string, FlatAttendanceBackupRow>();

  // 1. Seed from attendanceHistory first
  attendanceHistory.forEach((rec) => {
    const parsed = parseBackupDateToIso(rec.date);
    const empId = String(rec.employeeId || '').trim();
    if (!parsed || !empId) return;
    const key = `${parsed.iso}_${empId.toLowerCase()}`;
    rowMap.set(key, {
      employeeId: empId,
      note: rec.note || '',
      shift: rec.shift === 'NIGHT' ? 'NIGHT' : 'DAY',
      date: parsed.iso,
      id: `${parsed.iso}_${empId}`,
      status: String(rec.status || 'PRESENT'),
      overtime: Number(rec.overtime || 0),
      lateIn: rec.lateIn || '',
      manualOut: rec.manualOut || '',
      earlyIn: rec.earlyIn || '',
      manualIn: rec.manualIn || '',
      sundayNightOT: rec.sundayNightOT !== undefined ? rec.sundayNightOT : '',
      sundayDayOT: rec.sundayDayOT !== undefined ? rec.sundayDayOT : '',
      earlyOut: rec.earlyOut || '',
    });
  });

  // 2. Scan all stored matrix months (prefer 'multi', then 'all', then others)
  const matrixKeys: Array<{ key: string; dept: string; year: number; month: number }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('app_matrix_timekeeping_')) continue;
      const m = k.match(/^app_matrix_timekeeping_(.+)_(\d{4})_(\d{1,2})$/);
      if (m) {
        matrixKeys.push({
          key: k,
          dept: m[1].toLowerCase(),
          year: Number(m[2]),
          month: Number(m[3]),
        });
      }
    }
  } catch (e) {
    console.error('Scan matrix keys error', e);
  }

  // Sort so non-multi load first and multi overwrites with highest authority
  matrixKeys.sort((a, b) => {
    const rank = (d: string) => (d === 'multi' ? 3 : d === 'all' ? 2 : 1);
    return rank(a.dept) - rank(b.dept);
  });

  matrixKeys.forEach(({ key, year, month }) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const matrix = JSON.parse(raw) as Record<string, MatrixEmployeeTimekeeping>;
      if (!matrix || typeof matrix !== 'object') return;

      Object.values(matrix).forEach((empRec) => {
        const empId = String(empRec.employeeId || '').trim();
        if (!empId || !empRec.days) return;

        Object.values(empRec.days).forEach((entry) => {
          if (!entry || !entry.day) return;
          const statusStr = String(entry.status || '').trim();
          const hasHours = getMatrixEntryTotalHours(entry) > 0;
          if (!statusStr && !hasHours && !entry.inTime && !entry.outTime) return;

          const dateIso = `${year}-${String(month).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}`;
          const mapKey = `${dateIso}_${empId.toLowerCase()}`;
          const existing = rowMap.get(mapKey);

          const shift: 'DAY' | 'NIGHT' = entry.shift || empRec.shift || 'DAY';
          const isWorkingStatus =
            statusStr === 'Đúng giờ' ||
            statusStr === 'Đủ công' ||
            statusStr === 'PRESENT' ||
            (statusStr === '' && hasHours);

          const mappedStatus = isWorkingStatus ? 'PRESENT' : statusStr || 'PRESENT';
          const otRegular = Math.round(((entry.otDayHours || 0) + (entry.otNightHours || 0)) * 10) / 10;
          const otHol = Math.round(((entry.otHolidayHours || 0) + (entry.otHolidayNightHours || 0)) * 10) / 10;
          const sunDay = entry.otSundayHours ? Math.round(entry.otSundayHours * 10) / 10 : '';
          const sunNight = entry.otSundayNightHours ? Math.round(entry.otSundayNightHours * 10) / 10 : '';
          const totalOtField = Math.round((otRegular + otHol) * 10) / 10;

          rowMap.set(mapKey, {
            employeeId: empId,
            note: entry.note || existing?.note || '',
            shift,
            date: dateIso,
            id: `${dateIso}_${empId}`,
            status: mappedStatus,
            overtime: totalOtField || existing?.overtime || 0,
            lateIn: existing?.lateIn || (statusStr === 'Đi muộn' ? entry.inTime || '' : ''),
            manualOut: existing?.manualOut || entry.outTime || '',
            earlyIn: existing?.earlyIn || '',
            manualIn: existing?.manualIn || entry.inTime || '',
            sundayNightOT: sunNight !== '' ? sunNight : existing?.sundayNightOT ?? '',
            sundayDayOT: sunDay !== '' ? sunDay : existing?.sundayDayOT ?? '',
            earlyOut: existing?.earlyOut || (statusStr === 'Về sớm' ? entry.outTime || '' : ''),
          });
        });
      });
    } catch (e) {
      console.error('Export flat attendance read error', e);
    }
  });

  // Sort by employeeId and date descending/ascending cleanly
  const rows = Array.from(rowMap.values());
  const staffOrder = new Map<string, number>();
  allStaff.forEach((s, i) => staffOrder.set(s.employeeId.trim().toLowerCase(), i));

  rows.sort((a, b) => {
    const idxA = staffOrder.get(a.employeeId.trim().toLowerCase()) ?? 99999;
    const idxB = staffOrder.get(b.employeeId.trim().toLowerCase()) ?? 99999;
    if (idxA !== idxB) return idxA - idxB;
    return a.date.localeCompare(b.date);
  });

  return rows;
}

export function restoreFlatAttendanceBackupRows(
  rawRows: Record<string, any>[],
  staffList: StaffRecord[]
): {
  attendanceHistory: AttendanceRecord[];
  restoredMonths: string[];
  restoredCount: number;
} {
  const attendanceHistory: AttendanceRecord[] = [];
  const staffById = new Map<string, StaffRecord>();
  staffList.forEach((s) => staffById.set(s.employeeId.trim().toLowerCase(), s));

  // Group entries by `${year}_${month}` -> empId -> MatrixDayTimeEntry[]
  const byMonth = new Map<
    string,
    {
      year: number;
      month: number;
      empDays: Map<string, Map<number, MatrixDayTimeEntry>>;
    }
  >();

  rawRows.forEach((row) => {
    const empId = String(row.employeeId ?? row.EMPLOYEEID ?? row['Mã NV'] ?? '').trim();
    if (!empId) return;

    const parsedDate = parseBackupDateToIso(row.date ?? row.DATE ?? row['Ngày']);
    if (!parsedDate) return;

    const shiftRaw = String(row.shift ?? row.SHIFT ?? '').trim().toUpperCase();
    const matchedStaff = staffById.get(empId.toLowerCase());
    const shift: 'DAY' | 'NIGHT' =
      shiftRaw === 'NIGHT' || shiftRaw === 'ĐÊM' || shiftRaw === 'CA ĐÊM'
        ? 'NIGHT'
        : shiftRaw === 'DAY' || shiftRaw === 'NGÀY' || shiftRaw === 'CA NGÀY'
        ? 'DAY'
        : matchedStaff?.shift || 'DAY';

    const statusRaw = String(row.status ?? row.STATUS ?? 'PRESENT').trim();
    const overtime = parseBackupNumber(row.overtime ?? row.OVERTIME);
    const sundayDayOT = parseBackupNumber(row.sundayDayOT ?? row.SUNDAYDAYOT);
    const sundayNightOT = parseBackupNumber(row.sundayNightOT ?? row.SUNDAYNIGHTOT);
    const lateIn = String(row.lateIn ?? row.LATEIN ?? '').trim();
    const earlyOut = String(row.earlyOut ?? row.EARLYOUT ?? '').trim();
    const manualIn = String(row.manualIn ?? row.MANUALIN ?? '').trim();
    const manualOut = String(row.manualOut ?? row.MANUALOUT ?? '').trim();
    const earlyIn = String(row.earlyIn ?? row.EARLYIN ?? '').trim();
    const note = String(row.note ?? row.NOTE ?? '').trim();

    const attRecord: AttendanceRecord = {
      id: String(row.id || `${parsedDate.iso}_${empId}`),
      date: parsedDate.iso,
      employeeId: empId,
      shift,
      status: (statusRaw || 'PRESENT') as AttendanceStatus,
      overtime,
      lateIn: lateIn || undefined,
      earlyOut: earlyOut || undefined,
      manualIn: manualIn || undefined,
      manualOut: manualOut || undefined,
      earlyIn: earlyIn || undefined,
      sundayDayOT: row.sundayDayOT !== undefined && row.sundayDayOT !== '' ? sundayDayOT : undefined,
      sundayNightOT: row.sundayNightOT !== undefined && row.sundayNightOT !== '' ? sundayNightOT : undefined,
      note: note || undefined,
    };
    attendanceHistory.push(attRecord);

    // Map into MatrixDayTimeEntry
    const monthKey = `${parsedDate.year}_${parsedDate.month}`;
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, {
        year: parsedDate.year,
        month: parsedDate.month,
        empDays: new Map(),
      });
    }
    const bucket = byMonth.get(monthKey)!;
    const empKeyLower = empId.toLowerCase();
    if (!bucket.empDays.has(empKeyLower)) {
      bucket.empDays.set(empKeyLower, new Map());
    }

    const isSunday = new Date(parsedDate.year, parsedDate.month - 1, parsedDate.day).getDay() === 0;
    const normStatusUpper = statusRaw.toUpperCase();
    const isOffStatus =
      normStatusUpper === 'NGHỈ CHỦ NHẬT' ||
      normStatusUpper === 'NGHỈ KL' ||
      normStatusUpper === 'NGHỈ PHÉP' ||
      normStatusUpper === 'NGHỈ ỐM' ||
      normStatusUpper === 'NGHỈ LỄ' ||
      normStatusUpper === 'NGHỈ CƯỚI' ||
      normStatusUpper === 'NGHỈ TANG' ||
      normStatusUpper === 'VẮNG MẶT' ||
      normStatusUpper === 'ĐÃ NGHỈ VIỆC' ||
      normStatusUpper === 'ĐÃ THÔI VIỆC' ||
      normStatusUpper === 'NGHỈ CHẾ ĐỘ' ||
      normStatusUpper === 'LEAVE' ||
      normStatusUpper === 'SICK';

    let matrixStatus: AttendanceStatus = 'Đúng giờ';
    if (normStatusUpper === 'PRESENT' || normStatusUpper === 'ĐỦ CÔNG' || normStatusUpper === 'ĐÚNG GIỜ') {
      matrixStatus = lateIn ? 'Đi muộn' : earlyOut ? 'Về sớm' : 'Đúng giờ';
    } else if (normStatusUpper === 'ĐÃ THÔI VIỆC') {
      matrixStatus = 'Đã nghỉ việc';
    } else if (normStatusUpper === 'NGHỈ CHẾ ĐỘ') {
      matrixStatus = 'Nghỉ chế độ';
    } else if (statusRaw) {
      matrixStatus = statusRaw as AttendanceStatus;
    }

    let inTime = '';
    let outTime = '';
    let regularHours = 0;
    let otDayHours = 0;
    let otNightHours = 0;
    let otSundayHours = 0;
    let otSundayNightHours = 0;

    if (!isOffStatus) {
      if (isSunday || sundayDayOT > 0 || sundayNightOT > 0) {
        otSundayHours = sundayDayOT || (shift === 'DAY' ? overtime : 0);
        otSundayNightHours = sundayNightOT || (shift === 'NIGHT' ? overtime : 0);
        const sunTotal = otSundayHours + otSundayNightHours;
        inTime = manualIn || lateIn || (sunTotal > 0 ? (shift === 'NIGHT' ? '20:00' : '08:00') : '');
        outTime =
          manualOut ||
          earlyOut ||
          (sunTotal > 0 ? (shift === 'NIGHT' ? '08:00' : '20:00') : '');
      } else {
        regularHours = 8;
        if (shift === 'NIGHT') {
          otNightHours = overtime;
          inTime = manualIn || lateIn || '20:00';
          outTime = manualOut || earlyOut || addMinutesToHhMm('05:00', overtime);
        } else {
          otDayHours = overtime;
          inTime = manualIn || lateIn || '08:00';
          outTime = manualOut || earlyOut || addMinutesToHhMm('17:00', overtime);
        }
      }
    } else if (isSunday && (sundayDayOT > 0 || sundayNightOT > 0)) {
      otSundayHours = sundayDayOT;
      otSundayNightHours = sundayNightOT;
      matrixStatus = 'Đúng giờ';
      inTime = manualIn || (shift === 'NIGHT' ? '20:00' : '08:00');
      outTime = manualOut || (shift === 'NIGHT' ? '08:00' : '20:00');
    }

    bucket.empDays.get(empKeyLower)!.set(parsedDate.day, {
      day: parsedDate.day,
      inTime,
      outTime,
      shift,
      regularHours,
      otDayHours,
      otNightHours,
      otSundayHours,
      otSundayNightHours,
      otHolidayHours: 0,
      otHolidayNightHours: 0,
      isHoliday: normStatusUpper === 'NGHỈ LỄ',
      status: matrixStatus,
      note: note || undefined,
      isRestored: true,
      isAutoDefault: false,
    });
  });

  // Apply restored days into MULTI and ALL matrices
  const restoredMonths: string[] = [];
  byMonth.forEach(({ year, month, empDays }) => {
    ['MULTI', 'ALL'].forEach((dept) => {
      const { matrix, holidays } = loadOrInitDepartmentMatrix(dept, year, month, staffList, false);
      const nextMatrix: Record<string, MatrixEmployeeTimekeeping> = { ...matrix };

      empDays.forEach((daysMap, empLower) => {
        const matchedStaff = staffById.get(empLower);
        const existingKey = findEmployeeKey(nextMatrix, empLower) || matchedStaff?.employeeId || empLower.toUpperCase();
        const currentRec: MatrixEmployeeTimekeeping = nextMatrix[existingKey] || {
          employeeId: matchedStaff?.employeeId || existingKey,
          fullName: matchedStaff?.fullName || existingKey,
          department: matchedStaff?.department || dept,
          position: matchedStaff?.position || 'OP',
          shift: matchedStaff?.shift || 'DAY',
          isLocked: Boolean(matchedStaff?.isLocked),
          days: {},
          totalWorkHours: 0,
          totalDayOt: 0,
          totalNightOt: 0,
          totalSundayOt: 0,
        };

        const mergedDays: Record<number, MatrixDayTimeEntry> = { ...(currentRec.days || {}) };
        daysMap.forEach((entry, dayNum) => {
          mergedDays[dayNum] = entry;
        });

        const appliedDays = matchedStaff
          ? applyJoinDateAndLockRules(
              mergedDays,
              matchedStaff,
              year,
              month,
              currentRec.isLocked,
              currentRec.lockedDay,
              holidays
            )
          : mergedDays;
        const totals = recalculateStaffTotals(appliedDays);

        nextMatrix[existingKey] = {
          ...currentRec,
          isLocked: matchedStaff?.isLocked !== undefined ? matchedStaff.isLocked : currentRec.isLocked,
          days: appliedDays,
          ...totals,
        };
      });

      saveDepartmentMatrix(dept, year, month, nextMatrix, holidays, true);
    });
    restoredMonths.push(`${month}/${year}`);
  });

  return {
    attendanceHistory,
    restoredMonths,
    restoredCount: attendanceHistory.length,
  };
}

export function syncStaffLockToMatrices(
  staff: StaffRecord,
  shouldLock: boolean,
  lockType: StaffLockType,
  lockedDay?: number,
  targetYear?: number,
  targetMonth?: number
) {
  const now = new Date();
  const year = targetYear || now.getFullYear();
  const month = targetMonth || now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const effectiveDay = shouldLock
    ? Math.min(daysInMonth, Math.max(1, lockedDay || now.getDate()))
    : undefined;
  const primaryDept =
    (staff.department || 'MULTI').trim().toUpperCase() === 'MULTI' ? 'MULTI' : 'ALL';

  const updatedStaff: StaffRecord = {
    ...staff,
    isLocked: shouldLock,
    lockType: shouldLock ? lockType : undefined,
    lockedDay: effectiveDay,
    attendance: shouldLock
      ? lockType === 'REGIME_LEAVE'
        ? 'Nghỉ chế độ'
        : 'Đã nghỉ việc'
      : staff.attendance === 'Đã nghỉ việc' ||
        (staff.attendance as string) === 'Đã thôi việc' ||
        (staff.attendance as string) === 'Nghỉ chế độ'
      ? 'Đúng giờ'
      : staff.attendance,
  };

  const { matrix, holidays } = loadOrInitDepartmentMatrix(
    primaryDept,
    year,
    month,
    [updatedStaff],
    false
  );
  const empKey = findEmployeeKey(matrix, staff.employeeId) || staff.employeeId;
  const current: MatrixEmployeeTimekeeping = matrix[empKey] || {
    employeeId: staff.employeeId,
    fullName: staff.fullName,
    department: staff.department || primaryDept,
    position: staff.position || 'OP',
    shift: staff.shift,
    isLocked: false,
    days: {},
    totalWorkHours: 0,
    totalDayOt: 0,
    totalNightOt: 0,
    totalSundayOt: 0,
  };

  const appliedDays = applyJoinDateAndLockRules(
    current.days || {},
    updatedStaff,
    year,
    month,
    shouldLock,
    effectiveDay,
    holidays,
    undefined,
    shouldLock ? lockType : undefined
  );
  const totals = recalculateStaffTotals(appliedDays);
  const nextMatrix: Record<string, MatrixEmployeeTimekeeping> = {
    ...matrix,
    [empKey]: {
      ...current,
      isLocked: shouldLock,
      lockType: shouldLock ? lockType : undefined,
      lockedDay: effectiveDay,
      manualUnlocked: !shouldLock,
      days: appliedDays,
      ...totals,
    },
  };

  saveDepartmentMatrix(primaryDept, year, month, nextMatrix, holidays, true, true);
}


