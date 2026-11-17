import {
  AttendanceStatus,
  MatrixDayTimeEntry,
  MatrixEmployeeTimekeeping,
  StaffRecord,
} from '../types';

export const MATRIX_UPDATED_EVENT = 'matrix-timekeeping-updated';

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

export function buildDefaultEmployeeMonthDays(
  staff: StaffRecord,
  year: number,
  month: number,
  holidayDays: Record<number, boolean> = {}
): Record<number, MatrixDayTimeEntry> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysRecord: Record<number, MatrixDayTimeEntry> = {};

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateObj = new Date(year, month - 1, day);
    const dayNum = dateObj.getDay();
    const isSunday = dayNum === 0;
    const isSaturday = dayNum === 6;
    const isHoliday = Boolean(holidayDays[day]);

    let inTime = '';
    let outTime = '';
    let regularHours = 0;
    let otDayHours = 0;
    let otNightHours = 0;
    let otSundayHours = 0;
    let otSundayNightHours = 0;
    let otHolidayHours = 0;
    let otHolidayNightHours = 0;
    let status: AttendanceStatus = 'Đúng giờ';

    if (isHoliday) {
      if (staff.shift === 'NIGHT') {
        inTime = '20:00';
        outTime = '08:00';
        otHolidayNightHours = 11;
      } else {
        inTime = '08:00';
        outTime = '20:00';
        otHolidayHours = 11;
      }
      status = 'Đúng giờ';
    } else if (isSunday) {
      const worksThisSunday =
        day === 1
          ? staff.employeeId !== 'V2311006'
          : day === 8
          ? ['V2610010', 'V2407038', 'TV2610225', 'V2408025', 'V2106026', 'V2502030', 'V2610004', 'V2303011'].includes(staff.employeeId) || staff.shift === 'NIGHT'
          : day === 15 || day === 22;

      if (worksThisSunday) {
        if (staff.shift === 'NIGHT') {
          inTime = '20:00';
          outTime = '08:00';
          otSundayNightHours = 11;
        } else {
          inTime = '08:00';
          outTime = '20:00';
          otSundayHours = 11;
        }
        status = 'Đúng giờ';
      } else {
        inTime = '';
        outTime = '';
        status = 'Nghỉ chủ nhật';
      }
    } else {
      if (staff.shift === 'NIGHT') {
        inTime = '20:00';
        if (day === 16) {
          outTime = '05:00';
          regularHours = 8;
        } else {
          outTime = '08:00';
          regularHours = 8;
          otNightHours = 3;
        }
      } else {
        inTime = '08:00';
        if (day === 16) {
          outTime = '17:00';
          regularHours = 8;
        } else if (day % 2 === 0 && !isSaturday) {
          outTime = '20:00';
          regularHours = 8;
          otDayHours = 3;
        } else {
          outTime = '20:00';
          regularHours = 8;
          otDayHours = 3;
        }
      }

      if (day === 5 && staff.attendance === 'Đi muộn') {
        status = 'Đi muộn';
        inTime = staff.lateIn || '10:00';
      } else if (day === 14 && staff.attendance === 'Về sớm') {
        status = 'Về sớm';
        outTime = staff.earlyOut || '16:30';
      }
    }

    daysRecord[day] = {
      day,
      inTime,
      outTime,
      shift: staff.shift,
      regularHours,
      otDayHours,
      otNightHours,
      otSundayHours,
      otSundayNightHours,
      otHolidayHours,
      otHolidayNightHours,
      isHoliday,
      status,
    };
  }

  return daysRecord;
}

export function parseDateJoined(dateJoinedStr?: string): Date | null {
  if (!dateJoinedStr) return null;
  const s = dateJoinedStr.trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const d = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const y = Number(parts[2]);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) return date;
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

export function applyJoinDateAndLockRules(
  days: Record<number, MatrixDayTimeEntry>,
  staff: StaffRecord,
  year: number,
  month: number,
  isLocked?: boolean,
  lockedDay?: number
): Record<number, MatrixDayTimeEntry> {
  const nextDays: Record<number, MatrixDayTimeEntry> = {};
  Object.entries(days).forEach(([dayStr, entry]) => {
    const day = Number(dayStr);
    const isBeforeJoin = isDayBeforeJoinDate(year, month, day, staff.dateJoined);
    const isAfterLock = Boolean(isLocked && lockedDay !== undefined && day >= lockedDay);

    if (isBeforeJoin) {
      nextDays[day] = {
        ...entry,
        inTime: '',
        outTime: '',
        regularHours: 0,
        otDayHours: 0,
        otNightHours: 0,
        otSundayHours: 0,
        otSundayNightHours: 0,
        otHolidayHours: 0,
        otHolidayNightHours: 0,
        status: '' as AttendanceStatus,
      };
    } else if (isAfterLock) {
      nextDays[day] = {
        ...entry,
        inTime: '',
        outTime: '',
        regularHours: 0,
        otDayHours: 0,
        otNightHours: 0,
        otSundayHours: 0,
        otSundayNightHours: 0,
        otHolidayHours: 0,
        otHolidayNightHours: 0,
        status: 'Đã nghỉ việc',
      };
    } else {
      nextDays[day] = entry;
    }
  });
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

export function saveDepartmentMatrix(
  department: string,
  year: number,
  month: number,
  matrix: Record<string, MatrixEmployeeTimekeeping>,
  holidays: Record<number, boolean>,
  notify = true
) {
  try {
    localStorage.setItem(getMatrixStorageKey(department, year, month), JSON.stringify(matrix));
    localStorage.setItem(getHolidayStorageKey(department, year, month), JSON.stringify(holidays));
    localStorage.setItem(getMatrixMetaStorageKey(department, year, month), String(Date.now()));
    if (notify) {
      dispatchMatrixUpdatedEvent(department, year, month);
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
  persistChanges = true
): {
  matrix: Record<string, MatrixEmployeeTimekeeping>;
  holidays: Record<number, boolean>;
} {
  let holidays: Record<number, boolean> = {};
  try {
    const hRaw = localStorage.getItem(getHolidayStorageKey(department, year, month));
    if (hRaw) holidays = JSON.parse(hRaw) || {};
  } catch (e) {
    console.error('Error loading holiday storage', e);
  }

  let parsedSaved: Record<string, MatrixEmployeeTimekeeping> | null = null;
  try {
    const raw = localStorage.getItem(getMatrixStorageKey(department, year, month));
    if (raw) parsedSaved = JSON.parse(raw) as Record<string, MatrixEmployeeTimekeeping>;
  } catch (e) {
    console.error('Error loading matrix storage', e);
  }

  const normalized: Record<string, MatrixEmployeeTimekeeping> = {};
  let needsPersist = !parsedSaved && targetStaff.length > 0;

  const staffById = new Map<string, StaffRecord>();
  targetStaff.forEach((st) => staffById.set(st.employeeId.trim().toLowerCase(), st));

  if (parsedSaved) {
    Object.entries(parsedSaved).forEach(([empId, rec]) => {
      const matchedStaff = staffById.get(empId.trim().toLowerCase());
      const rawDays = rec.days || {};
      const appliedDays = matchedStaff
        ? applyJoinDateAndLockRules(rawDays, matchedStaff, year, month, rec.isLocked, rec.lockedDay)
        : rawDays;
      const totals = recalculateStaffTotals(appliedDays);
      normalized[empId] = { ...rec, days: appliedDays, ...totals };
    });
  }

  targetStaff.forEach((staff) => {
    if (!normalized[staff.employeeId]) {
      const isSan = staff.employeeId === 'TV2610025';
      const initLocked = isSan;
      const initLockedDay = isSan ? 12 : undefined;
      const rawDays = buildDefaultEmployeeMonthDays(staff, year, month, holidays);
      const daysRecord = applyJoinDateAndLockRules(rawDays, staff, year, month, initLocked, initLockedDay);
      const totals = recalculateStaffTotals(daysRecord);
      normalized[staff.employeeId] = {
        employeeId: staff.employeeId,
        fullName: staff.fullName,
        department: staff.department || department,
        position: staff.position || 'Công nhân vận hành',
        shift: staff.shift,
        isLocked: initLocked,
        lockedDay: initLockedDay,
        days: daysRecord,
        ...totals,
      };
      needsPersist = true;
    } else {
      const rec = normalized[staff.employeeId];
      const appliedDays = applyJoinDateAndLockRules(rec.days || {}, staff, year, month, rec.isLocked, rec.lockedDay);
      const totals = recalculateStaffTotals(appliedDays);
      normalized[staff.employeeId] = {
        ...rec,
        fullName: staff.fullName,
        department: staff.department || rec.department || department,
        position: staff.position || rec.position,
        shift: staff.shift,
        days: appliedDays,
        ...totals,
      };
    }
  });

  if (needsPersist && persistChanges && targetStaff.length > 0) {
    saveDepartmentMatrix(department, year, month, normalized, holidays, false);
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
          return {
            days: parsed[matchedKey].days,
            holidays,
            sourceDepartment: deptKey.toUpperCase(),
          };
        }

        if (!bestMatch || metaTs > bestMatch.updatedAt) {
          bestMatch = {
            days: parsed[matchedKey].days,
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
    return {
      days: buildDefaultEmployeeMonthDays(staffInfo, year, month, fallbackHolidays),
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

export function getAllStoredMatrixSnapshots(): Record<string, string> {
  const snapshots: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('app_matrix_timekeeping_') ||
          key.startsWith('app_matrix_holidays_') ||
          key.startsWith('app_matrix_meta_'))
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
          key.startsWith('app_matrix_meta_')) &&
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
