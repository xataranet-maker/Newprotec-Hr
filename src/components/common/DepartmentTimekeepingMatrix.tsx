import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StaffRecord,
  AttendanceRecord,
  OvertimeRecord,
  AttendanceStatus,
  MatrixDayTimeEntry,
  MatrixEmployeeTimekeeping,
  LeaveRegistrationRecord,
  StaffLockType,
  MachineSwipeRecord,
} from '../../types';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  Users,
  Save,
  Check,
  Sun,
  Moon,
  Sparkles,
  FileSpreadsheet,
  Upload,
  X,
  Lock,
  Unlock,
  CalendarHeart,
  QrCode,
  ScanFace,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getHolidayStorageKey,
  getMatrixEntryTotalHours,
  getMatrixStorageKey,
  getQrPunchStorageKey,
  getFacePunchStorageKey,
  isMatrixEntryWorking,
  loadOrInitDepartmentMatrix,
  recalculateStaffTotals,
  saveDepartmentMatrix,
  isDayBeforeJoinDate,
  applyJoinDateAndLockRules,
  hasMatrixRealData,
  isFutureCalendarDay,
  isLeaveMatrixStatus,
  isStaffLockedFromMatrix,
  resolveStaffLockType,
  MATRIX_UPDATED_EVENT,
  calculateMatrixDayHoursFromTimes,
} from '../../lib/matrixTimekeeping';
import { loadQrPunchMap, loadFacePunchMap } from '../../lib/attendanceQr';
import {
  getMachineSwipeStorageKey,
  buildComparisonRowForEmployeeDay,
  ComparisonRow,
  importMachineSwipesFromArrayBuffer,
  normalizeTimeString,
} from '../hr/HRTimekeeping';
import { EmployeeLockModal } from './EmployeeLockModal';

interface DepartmentTimekeepingMatrixProps {
  department: string;
  departmentTitle: string;
  staffList: StaffRecord[];
  allStaff?: StaffRecord[];
  attendanceHistory?: AttendanceRecord[];
  overtimeRecords?: OvertimeRecord[];
  leaveRecords?: LeaveRegistrationRecord[];
  userRole?: string;
  onViewProfile?: (staff: StaffRecord) => void;
  onUpdateStaffLock?: (
    staff: StaffRecord,
    shouldLock: boolean,
    lockType: StaffLockType,
    lockedDay?: number
  ) => void;
}

interface DayHeaderMeta {
  day: number;
  dayOfWeek: string;
  isSunday: boolean;
  isSaturday: boolean;
  isHoliday: boolean;
  fullDateStr: string;
}

const VI_DAYS_OF_WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const isEntryWorking = isMatrixEntryWorking;
const getEntryTotalHours = getMatrixEntryTotalHours;

export const DepartmentTimekeepingMatrix: React.FC<DepartmentTimekeepingMatrixProps> = ({
  department,
  departmentTitle,
  staffList,
  allStaff = [],
  leaveRecords,
  onViewProfile,
  onUpdateStaffLock,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterShift, setFilterShift] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [viewMode, setViewMode] = useState<'MATRIX' | 'COMPARE'>('MATRIX');
  const [compareDayFilter, setCompareDayFilter] = useState<string>('ALL');
  const [compareStatusFilter, setCompareStatusFilter] = useState<'ALL' | 'ERRORS_ONLY' | 'MATCH'>('ALL');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Storage keys
  const storageKey = getMatrixStorageKey(department, selectedYear, selectedMonth);
  const holidayStorageKey = getHolidayStorageKey(department, selectedYear, selectedMonth);
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
  const hasManualCompareSourceRef = useRef(false);
  const [compareSource, setCompareSource] = useState<'MQT' | 'QR' | 'FACE'>(() => {
    if (Object.keys(qrPunchRecords).length > 0 && Object.keys(swipeRecords).length === 0) return 'QR';
    if (
      Object.keys(facePunchRecords).length > 0 &&
      Object.keys(swipeRecords).length === 0 &&
      Object.keys(qrPunchRecords).length === 0
    ) {
      return 'FACE';
    }
    return 'MQT';
  });

  // Holiday dates map: day (1..31) -> boolean
  const [holidayDays, setHolidayDays] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(holidayStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading holiday storage', e);
    }
    return {};
  });

  // Day Header Type Selection Modal (Ngày Lễ / Ngày Thường)
  const [dayTypeModal, setDayTypeModal] = useState<DayHeaderMeta | null>(null);

  // Cell Quick Edit Modal
  const [editingCell, setEditingCell] = useState<{
    staff: StaffRecord;
    day: number;
    dateStr: string;
    dayOfWeek: string;
    isSunday: boolean;
    applyDayTypeToColumn: boolean;
    entry: MatrixDayTimeEntry;
  } | null>(null);

  // Modal Khóa Nhân Viên (Nghỉ Chế Độ / Thôi Việc)
  const [lockModal, setLockModal] = useState<{
    staff: StaffRecord;
    isLocked: boolean;
    lockType: StaffLockType;
    lockedDay: number;
  } | null>(null);

  // Days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Reload holidayDays when month/year/dept changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(holidayStorageKey);
      if (saved) {
        setHolidayDays(JSON.parse(saved));
        return;
      }
    } catch (e) {
      console.error('Error loading holiday storage', e);
    }
    setHolidayDays({});
  }, [holidayStorageKey]);

  // Day metadata list
  const monthDaysMeta = useMemo<DayHeaderMeta[]>(() => {
    return daysArray.map((day) => {
      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
      const dayNum = dateObj.getDay();
      const dayOfWeek = VI_DAYS_OF_WEEK[dayNum];
      const isSunday = dayNum === 0;
      const isSaturday = dayNum === 6;
      const isHoliday = Boolean(holidayDays[day]);
      const fullDateStr = `${String(day).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${selectedYear}`;
      return { day, dayOfWeek, isSunday, isSaturday, isHoliday, fullDateStr };
    });
  }, [daysArray, selectedYear, selectedMonth, holidayDays]);

  // Target staff
  const targetStaff = useMemo(() => {
    return department === 'ALL' || department === 'HC_NS'
      ? allStaff.length > 0
        ? allStaff
        : staffList
      : staffList;
  }, [department, staffList, allStaff]);

  // Matrix data
  const [matrixData, setMatrixData] = useState<Record<string, MatrixEmployeeTimekeeping>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading matrix storage', e);
    }
    return {};
  });

  const skipNextMatrixEventRef = useRef(false);

  // Initialize / Load matrix data on month/year/staff/leave change
  useEffect(() => {
    const { matrix, holidays } = loadOrInitDepartmentMatrix(
      department,
      selectedYear,
      selectedMonth,
      targetStaff,
      true,
      leaveRecords
    );
    setHolidayDays(holidays);
    setMatrixData(matrix);
  }, [storageKey, targetStaff, selectedYear, selectedMonth, department, leaveRecords]);

  // Reload swipe, QR & Face punch maps on month/year change
  useEffect(() => {
    let nextSwipe: Record<string, MachineSwipeRecord> = {};
    try {
      const saved = localStorage.getItem(swipeStorageKey);
      nextSwipe = saved ? JSON.parse(saved) : {};
    } catch {
      nextSwipe = {};
    }
    const nextQr = loadQrPunchMap(selectedYear, selectedMonth);
    const nextFace = loadFacePunchMap(selectedYear, selectedMonth);
    setSwipeRecords(nextSwipe);
    setQrPunchRecords(nextQr);
    setFacePunchRecords(nextFace);
    if (!hasManualCompareSourceRef.current) {
      if (Object.keys(nextQr).length > 0 && Object.keys(nextSwipe).length === 0) {
        setCompareSource('QR');
      } else if (
        Object.keys(nextFace).length > 0 &&
        Object.keys(nextSwipe).length === 0 &&
        Object.keys(nextQr).length === 0
      ) {
        setCompareSource('FACE');
      } else if (Object.keys(nextSwipe).length > 0 && Object.keys(nextQr).length === 0 && Object.keys(nextFace).length === 0) {
        setCompareSource('MQT');
      }
    }
  }, [swipeStorageKey, qrStorageKey, faceStorageKey, selectedYear, selectedMonth]);

  // Reload if updated externally (e.g. edited from HRTimekeeping, Leave registration, QR/Face scan, or sibling matrix)
  useEffect(() => {
    const refreshPunches = () => {
      let nextSwipe: Record<string, MachineSwipeRecord> = {};
      try {
        const saved = localStorage.getItem(swipeStorageKey);
        nextSwipe = saved ? JSON.parse(saved) : {};
        setSwipeRecords(nextSwipe);
      } catch {
        // ignore
      }
      const nextQr = loadQrPunchMap(selectedYear, selectedMonth);
      const nextFace = loadFacePunchMap(selectedYear, selectedMonth);
      setQrPunchRecords(nextQr);
      setFacePunchRecords(nextFace);
      if (!hasManualCompareSourceRef.current) {
        if (Object.keys(nextQr).length > 0 && Object.keys(nextSwipe).length === 0) {
          setCompareSource('QR');
        } else if (
          Object.keys(nextFace).length > 0 &&
          Object.keys(nextSwipe).length === 0 &&
          Object.keys(nextQr).length === 0
        ) {
          setCompareSource('FACE');
        } else if (Object.keys(nextSwipe).length > 0 && Object.keys(nextQr).length === 0 && Object.keys(nextFace).length === 0) {
          setCompareSource('MQT');
        }
      }
    };

    const onExternalMatrixUpdate = (ev: Event) => {
      refreshPunches();
      if (skipNextMatrixEventRef.current) {
        skipNextMatrixEventRef.current = false;
        return;
      }
      const detail = (ev as CustomEvent<{ department?: string; year?: number; month?: number }>)?.detail;
      const evDept = (detail?.department || '').toLowerCase();
      const selfDept = department.toLowerCase();
      if (
        detail &&
        detail.year === selectedYear &&
        detail.month === selectedMonth &&
        (!evDept ||
          evDept === selfDept ||
          ((selfDept === 'multi' || selfDept === 'all') && (evDept === 'multi' || evDept === 'all')))
      ) {
        const { matrix, holidays } = loadOrInitDepartmentMatrix(
          department,
          selectedYear,
          selectedMonth,
          targetStaff,
          false,
          leaveRecords
        );
        setHolidayDays(holidays);
        setMatrixData(matrix);
      }
    };
    window.addEventListener(MATRIX_UPDATED_EVENT, onExternalMatrixUpdate);
    window.addEventListener('storage', refreshPunches);
    return () => {
      window.removeEventListener(MATRIX_UPDATED_EVENT, onExternalMatrixUpdate);
      window.removeEventListener('storage', refreshPunches);
    };
  }, [department, selectedYear, selectedMonth, targetStaff, leaveRecords, swipeStorageKey, qrStorageKey]);

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3200);
  };

  // Persist matrix + holidays and notify EmployeeProfile listeners
  const persistMatrixAndHolidays = (
    nextMatrix: Record<string, MatrixEmployeeTimekeeping>,
    nextHolidays: Record<number, boolean>
  ) => {
    skipNextMatrixEventRef.current = true;
    saveDepartmentMatrix(department, selectedYear, selectedMonth, nextMatrix, nextHolidays, true);
  };

  const handleSaveMatrix = () => {
    persistMatrixAndHolidays(matrixData, holidayDays);
    showToast(`Đã lưu bảng chấm công ma trận tháng ${selectedMonth}/${selectedYear} thành công!`);
  };

  // Toggle Day Column between Ngày Lễ & Ngày Thường
  const applyDayClassificationToColumn = (day: number, isSunday: boolean, makeHoliday: boolean) => {
    const nextHolidays = { ...holidayDays };
    if (makeHoliday) {
      nextHolidays[day] = true;
    } else {
      delete nextHolidays[day];
    }

    const nextMatrix: Record<string, MatrixEmployeeTimekeeping> = { ...matrixData };

    targetStaff.forEach((staff) => {
      const current = nextMatrix[staff.employeeId] || {
        employeeId: staff.employeeId,
        fullName: staff.fullName,
        department: staff.department || department,
        position: staff.position || 'Công nhân vận hành',
        shift: staff.shift,
        isLocked: false,
        days: {},
        totalWorkHours: 0,
        totalDayOt: 0,
        totalNightOt: 0,
        totalSundayOt: 0,
        totalSundayDayHours: 0,
        totalSundayNightHours: 0,
        totalHolidayDayHours: 0,
        totalHolidayNightHours: 0,
        totalHolidayOt: 0,
      };

      const existingEntry: MatrixDayTimeEntry = current.days[day] || {
        day,
        shift: staff.shift,
        regularHours: 0,
        otDayHours: 0,
        otNightHours: 0,
        otSundayHours: 0,
        otSundayNightHours: 0,
        otHolidayHours: 0,
        otHolidayNightHours: 0,
        isHoliday: false,
        status: isSunday ? 'Nghỉ chủ nhật' : 'Đúng giờ',
      };

      const shiftType = existingEntry.shift || staff.shift;
      const totalWorked = getEntryTotalHours(existingEntry);

      let updatedEntry: MatrixDayTimeEntry;

      if (makeHoliday) {
        if (totalWorked > 0) {
          const roundedWorked = Math.round(totalWorked * 10) / 10;
          updatedEntry = {
            ...existingEntry,
            isHoliday: true,
            regularHours: 0,
            otDayHours: 0,
            otNightHours: 0,
            otSundayHours: 0,
            otSundayNightHours: 0,
            otHolidayHours: shiftType === 'DAY' ? roundedWorked : 0,
            otHolidayNightHours: shiftType === 'NIGHT' ? roundedWorked : 0,
            status:
              existingEntry.status === 'Nghỉ chủ nhật' || existingEntry.status === 'Nghỉ phép'
                ? 'Đúng giờ'
                : existingEntry.status || 'Đúng giờ',
          };
        } else {
          updatedEntry = {
            ...existingEntry,
            isHoliday: true,
            regularHours: 0,
            otDayHours: 0,
            otNightHours: 0,
            otSundayHours: 0,
            otSundayNightHours: 0,
            otHolidayHours: 0,
            otHolidayNightHours: 0,
            status: 'Nghỉ lễ',
          };
        }
      } else {
        // Revert to Ngày Thường
        if (totalWorked > 0) {
          if (isSunday) {
            updatedEntry = {
              ...existingEntry,
              isHoliday: false,
              regularHours: 0,
              otDayHours: 0,
              otNightHours: 0,
              otSundayHours: shiftType === 'DAY' ? Math.round(totalWorked * 10) / 10 : 0,
              otSundayNightHours: shiftType === 'NIGHT' ? Math.round(totalWorked * 10) / 10 : 0,
              otHolidayHours: 0,
              otHolidayNightHours: 0,
              status: existingEntry.status === 'Nghỉ lễ' ? 'Đúng giờ' : existingEntry.status || 'Đúng giờ',
            };
          } else {
            const reg = Math.min(8, totalWorked);
            const ot = Math.max(0, Math.round((totalWorked - reg) * 10) / 10);
            updatedEntry = {
              ...existingEntry,
              isHoliday: false,
              regularHours: reg,
              otDayHours: shiftType === 'DAY' ? ot : 0,
              otNightHours: shiftType === 'NIGHT' ? ot : 0,
              otSundayHours: 0,
              otSundayNightHours: 0,
              otHolidayHours: 0,
              otHolidayNightHours: 0,
              status: existingEntry.status === 'Nghỉ lễ' ? 'Đúng giờ' : existingEntry.status || 'Đúng giờ',
            };
          }
        } else {
          updatedEntry = {
            ...existingEntry,
            isHoliday: false,
            regularHours: 0,
            otDayHours: 0,
            otNightHours: 0,
            otSundayHours: 0,
            otSundayNightHours: 0,
            otHolidayHours: 0,
            otHolidayNightHours: 0,
            status: isSunday ? 'Nghỉ chủ nhật' : existingEntry.status === 'Nghỉ lễ' ? 'Nghỉ phép' : existingEntry.status || 'Đúng giờ',
          };
        }
      }

      const rawUpdatedDays = { ...current.days, [day]: updatedEntry };
      const updatedDays = applyJoinDateAndLockRules(
        rawUpdatedDays,
        staff,
        selectedYear,
        selectedMonth,
        current.isLocked,
        current.lockedDay,
        nextHolidays,
        leaveRecords
      );
      const totals = recalculateStaffTotals(updatedDays);
      nextMatrix[staff.employeeId] = {
        ...current,
        days: updatedDays,
        ...totals,
      };
    });

    setHolidayDays(nextHolidays);
    setMatrixData(nextMatrix);
    persistMatrixAndHolidays(nextMatrix, nextHolidays);
    setDayTypeModal(null);
    showToast(
      makeHoliday
        ? `Đã đặt Ngày ${day}/${selectedMonth}/${selectedYear} là NGÀY LỄ (tự động phân loại Ngày Lễ / TC Đêm Lễ theo ca làm).`
        : `Đã đặt Ngày ${day}/${selectedMonth}/${selectedYear} là NGÀY THƯỜNG.`
    );
  };

  // Open Lock Employee Modal
  const openLockModal = (staff: StaffRecord, overrideDay?: number) => {
    const current = matrixData[staff.employeeId] || {
      employeeId: staff.employeeId,
      fullName: staff.fullName,
      department: staff.department || department,
      position: staff.position,
      shift: staff.shift,
      isLocked: false,
      days: {},
    };
    const defaultDay =
      overrideDay ||
      current.lockedDay ||
      (selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth() + 1
        ? currentDate.getDate()
        : 12);

    const detectedLockType = resolveStaffLockType(staff, current);

    setLockModal({
      staff,
      isLocked: Boolean(current.isLocked),
      lockType: detectedLockType,
      lockedDay: Math.min(daysInMonth, Math.max(1, defaultDay)),
    });
  };

  // Apply or Remove Lock for Staff (Regime Leave or Resigned)
  const handleApplyLock = (
    staff: StaffRecord,
    shouldLock: boolean,
    lockType: StaffLockType,
    dayNumber: number
  ) => {
    const current = matrixData[staff.employeeId] || {
      employeeId: staff.employeeId,
      fullName: staff.fullName,
      department: staff.department || department,
      position: staff.position,
      shift: staff.shift,
      isLocked: false,
      days: {},
    };

    const targetDay = shouldLock ? Math.min(daysInMonth, Math.max(1, dayNumber)) : undefined;
    const appliedDays = applyJoinDateAndLockRules(
      current.days || {},
      staff,
      selectedYear,
      selectedMonth,
      shouldLock,
      targetDay,
      holidayDays,
      leaveRecords,
      shouldLock ? lockType : undefined
    );
    const totals = recalculateStaffTotals(appliedDays);

    const nextMatrix = {
      ...matrixData,
      [staff.employeeId]: {
        ...current,
        isLocked: shouldLock,
        lockType: shouldLock ? lockType : undefined,
        lockedDay: targetDay,
        manualUnlocked: !shouldLock,
        days: appliedDays,
        ...totals,
      },
    };

    setMatrixData(nextMatrix);
    persistMatrixAndHolidays(nextMatrix, holidayDays);

    const isCurrentMonthView =
      selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth() + 1;
    if (isCurrentMonthView || !shouldLock) {
      onUpdateStaffLock?.(staff, shouldLock, lockType, targetDay);
    }

    setLockModal(null);
    showToast(
      shouldLock
        ? lockType === 'REGIME_LEAVE'
          ? `Đã khóa nghỉ chế độ cho nhân viên ${staff.fullName} từ ngày ${targetDay} thành công!`
          : `Đã khóa thôi việc cho nhân viên ${staff.fullName} từ ngày ${targetDay} thành công!`
        : `Đã mở khóa nhân viên ${staff.fullName} thành công!`
    );
  };

  // Auto fill standard 8h/day (respecting holidays & Sundays)
  const handleAutoFillStandard = () => {
    const updated = { ...matrixData };
    targetStaff.forEach((staff) => {
      const current = updated[staff.employeeId] || {
        employeeId: staff.employeeId,
        fullName: staff.fullName,
        department: staff.department || department,
        position: staff.position,
        shift: staff.shift,
        isLocked: false,
        days: {},
        totalWorkHours: 0,
        totalDayOt: 0,
        totalNightOt: 0,
        totalSundayOt: 0,
        totalSundayDayHours: 0,
        totalSundayNightHours: 0,
        totalHolidayDayHours: 0,
        totalHolidayNightHours: 0,
        totalHolidayOt: 0,
      };

      if (isStaffLockedFromMatrix(staff, current)) return;

      const days = { ...current.days };
      monthDaysMeta.forEach(({ day, isSunday, isHoliday }) => {
        // Không điền giờ làm cho các ngày tương lai (> ngày hiện tại)
        if (isFutureCalendarDay(selectedYear, selectedMonth, day)) {
          return;
        }
        if (
          isDayBeforeJoinDate(selectedYear, selectedMonth, day, staff.dateJoined) &&
          !hasMatrixRealData(days[day])
        ) {
          return;
        }
        // Giữ nguyên ngày đã đăng ký phép
        const existingDay = days[day];
        if (
          existingDay &&
          (isLeaveMatrixStatus(existingDay.status) || existingDay.leaveRecordId !== undefined)
        ) {
          return;
        }
        if (isHoliday) {
          days[day] = {
            day,
            inTime: staff.shift === 'NIGHT' ? '20:00' : '08:00',
            outTime: staff.shift === 'NIGHT' ? '05:00' : '17:00',
            shift: staff.shift,
            regularHours: 0,
            otDayHours: 0,
            otNightHours: 0,
            otSundayHours: 0,
            otSundayNightHours: 0,
            otHolidayHours: staff.shift === 'DAY' ? 8 : 0,
            otHolidayNightHours: staff.shift === 'NIGHT' ? 8 : 0,
            isHoliday: true,
            status: 'Đúng giờ',
            isAutoDefault: false,
            isManual: true,
          };
        } else if (!isSunday) {
          days[day] = {
            day,
            inTime: staff.shift === 'NIGHT' ? '20:00' : '08:00',
            outTime: staff.shift === 'NIGHT' ? '05:00' : '17:00',
            shift: staff.shift,
            regularHours: 8,
            otDayHours: 0,
            otNightHours: 0,
            otSundayHours: 0,
            otSundayNightHours: 0,
            otHolidayHours: 0,
            otHolidayNightHours: 0,
            isHoliday: false,
            status: 'Đúng giờ',
            isAutoDefault: false,
            isManual: true,
          };
        } else {
          days[day] = {
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
        }
      });

      const appliedDays = applyJoinDateAndLockRules(
        days,
        staff,
        selectedYear,
        selectedMonth,
        current.isLocked,
        current.lockedDay,
        holidayDays,
        leaveRecords,
        resolveStaffLockType(staff, current)
      );
      const totals = recalculateStaffTotals(appliedDays);
      updated[staff.employeeId] = {
        ...current,
        days: appliedDays,
        ...totals,
      };
    });

    setMatrixData(updated);
    persistMatrixAndHolidays(updated, holidayDays);
    showToast('Đã tự động điền giờ công chuẩn (8h/ngày) đến ngày hiện tại cho nhân sự chưa khóa!');
  };

  // Open cell editor
  const openEditCell = (staff: StaffRecord, meta: DayHeaderMeta) => {
    const record = matrixData[staff.employeeId];
    const existingForDay = record?.days?.[meta.day];
    if (isDayBeforeJoinDate(selectedYear, selectedMonth, meta.day, staff.dateJoined) && !hasMatrixRealData(existingForDay)) {
      showToast(`Nhân viên ${staff.fullName} chưa vào làm vào ngày ${meta.day} (${staff.dateJoined}).`);
      return;
    }
    if (record?.isLocked) {
      const recLockType = resolveStaffLockType(staff, record);
      if (record.lockedDay !== undefined) {
        if (meta.day >= record.lockedDay) {
          showToast(
            recLockType === 'REGIME_LEAVE'
              ? `Nhân viên ${staff.fullName} đang khóa nghỉ chế độ từ ngày ${record.lockedDay}. Không thể chấm công.`
              : `Nhân viên ${staff.fullName} đã thôi việc từ ngày ${record.lockedDay}. Không thể chấm công.`
          );
          return;
        }
      } else {
        showToast(`Hàng của ${staff.fullName} đang khóa hoàn toàn. Nhấn biểu tượng ổ khóa bên cạnh tên để mở khóa.`);
        return;
      }
    }

    const existing: MatrixDayTimeEntry = record?.days?.[meta.day] || {
      day: meta.day,
      shift: staff.shift,
      regularHours: 0,
      otDayHours: 0,
      otNightHours: 0,
      otSundayHours: 0,
      otSundayNightHours: 0,
      otHolidayHours: 0,
      otHolidayNightHours: 0,
      isHoliday: meta.isHoliday,
      status: meta.isHoliday ? 'Nghỉ lễ' : meta.isSunday ? 'Nghỉ chủ nhật' : 'Đúng giờ',
    };

    setEditingCell({
      staff,
      day: meta.day,
      dateStr: meta.fullDateStr,
      dayOfWeek: meta.dayOfWeek,
      isSunday: meta.isSunday,
      applyDayTypeToColumn: true,
      entry: {
        ...existing,
        isHoliday: existing.isHoliday ?? meta.isHoliday,
      },
    });
  };

  const handleTimeOrShiftChange = (
    patch: Partial<MatrixDayTimeEntry> & { presetKey?: string }
  ) => {
    if (!editingCell) return;

    let nextInTime =
      patch.inTime !== undefined ? patch.inTime : (editingCell.entry.inTime || '');
    let nextOutTime =
      patch.outTime !== undefined ? patch.outTime : (editingCell.entry.outTime || '');
    let nextShift =
      patch.shift !== undefined
        ? patch.shift
        : (editingCell.entry.shift || editingCell.staff.shift);

    // 1. Nếu chọn khung giờ ca hoặc thay đổi ca làm việc trực tiếp
    if (patch.presetKey) {
      if (patch.presetKey === 'NIGHT_OT' || patch.presetKey === 'NIGHT') {
        nextShift = 'NIGHT';
        nextInTime = '20:00';
        nextOutTime = '08:00';
      } else if (patch.presetKey === 'NIGHT_NORMAL') {
        nextShift = 'NIGHT';
        nextInTime = '20:00';
        nextOutTime = '05:00';
      } else if (patch.presetKey === 'DAY_OT') {
        nextShift = 'DAY';
        nextInTime = '08:00';
        nextOutTime = '20:00';
      } else if (patch.presetKey === 'DAY_NORMAL' || patch.presetKey === 'DAY') {
        nextShift = 'DAY';
        nextInTime = '08:00';
        nextOutTime = '17:00';
      }
    } else if (patch.shift !== undefined) {
      if (patch.shift === 'NIGHT') {
        nextShift = 'NIGHT';
        nextInTime = '20:00';
        // Khi chọn ca đêm (20:00 - 08:00), tự động điền giờ vào 20:00 và giờ ra 08:00 (+3h TC đêm)
        nextOutTime = '08:00';
      } else {
        nextShift = 'DAY';
        nextInTime = '08:00';
        nextOutTime =
          editingCell.entry.otNightHours && editingCell.entry.otNightHours > 0
            ? '20:00'
            : '17:00';
      }
    }

    // 2. Tự động đồng bộ khi người dùng nhập/chọn giờ ra (OutTime)
    if (patch.outTime !== undefined) {
      const trimmedOut = patch.outTime.trim();
      // Nếu chọn giờ ra là 8 giờ (08:00) -> ca đêm có tăng ca 3 tiếng
      if (trimmedOut === '08:00' || trimmedOut === '08:0' || trimmedOut === '8:00') {
        nextShift = 'NIGHT';
        if (!nextInTime || nextInTime === '08:00' || nextInTime.startsWith('08')) {
          nextInTime = '20:00';
        }
        nextOutTime = '08:00';
      } else if (trimmedOut === '20:00' || trimmedOut === '20:0') {
        // Điền vào giờ ra là 20 giờ -> ca ngày có tăng ca 3 tiếng
        nextShift = 'DAY';
        if (!nextInTime || nextInTime === '20:00' || nextInTime.startsWith('20')) {
          nextInTime = '08:00';
        }
        nextOutTime = '20:00';
      } else if (trimmedOut === '17:00' || trimmedOut === '17:0') {
        // Khung giờ ca ngày từ 8 giờ đến 17 giờ -> ca ngày chuẩn 8h
        nextShift = 'DAY';
        if (!nextInTime || nextInTime === '20:00' || nextInTime.startsWith('20')) {
          nextInTime = '08:00';
        }
        nextOutTime = '17:00';
      } else if (trimmedOut === '05:00' || trimmedOut === '05:0' || trimmedOut === '5:00') {
        // Khung ca đêm chuẩn 8h
        nextShift = 'NIGHT';
        if (!nextInTime || nextInTime === '08:00' || nextInTime.startsWith('08')) {
          nextInTime = '20:00';
        }
        nextOutTime = '05:00';
      }
    }

    // 3. Tự động đồng bộ ca khi nhập giờ vào (InTime)
    if (patch.inTime !== undefined) {
      const trimmedIn = patch.inTime.trim();
      if (
        trimmedIn === '20:00' ||
        trimmedIn.startsWith('20:') ||
        trimmedIn.startsWith('21:') ||
        trimmedIn.startsWith('19:')
      ) {
        nextShift = 'NIGHT';
        if (nextOutTime === '17:00') {
          nextOutTime = '05:00';
        }
      } else if (
        trimmedIn === '08:00' ||
        trimmedIn.startsWith('08:') ||
        trimmedIn.startsWith('07:') ||
        trimmedIn.startsWith('09:')
      ) {
        nextShift = 'DAY';
        if (nextOutTime === '05:00') {
          nextOutTime = '17:00';
        }
      }
    }

    const isHol =
      patch.isHoliday !== undefined
        ? Boolean(patch.isHoliday)
        : Boolean(editingCell.entry.isHoliday);
    const isSun = editingCell.isSunday;

    const calc = calculateMatrixDayHoursFromTimes(
      nextInTime,
      nextOutTime,
      nextShift,
      isSun,
      isHol
    );

    setEditingCell({
      ...editingCell,
      entry: {
        ...editingCell.entry,
        ...patch,
        inTime: nextInTime,
        outTime: nextOutTime,
        shift: nextShift,
        regularHours: calc.regularHours,
        otDayHours: calc.otDayHours,
        otNightHours: calc.otNightHours,
        otSundayHours: calc.otSundayHours,
        otSundayNightHours: calc.otSundayNightHours,
        otHolidayHours: calc.otHolidayHours,
        otHolidayNightHours: calc.otHolidayNightHours,
        status:
          patch.status !== undefined
            ? patch.status
            : editingCell.entry.status &&
              editingCell.entry.status !== 'Đúng giờ' &&
              editingCell.entry.status !== 'Đi muộn' &&
              editingCell.entry.status !== 'Về sớm'
            ? editingCell.entry.status
            : calc.suggestedStatus,
      },
    });
  };

  // Quick attendance button on employee row
  const handleQuickTimekeepingClick = (staff: StaffRecord) => {
    const defaultDay =
      selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth() + 1
        ? currentDate.getDate()
        : 1;
    const meta = monthDaysMeta.find((m) => m.day === defaultDay) || monthDaysMeta[0];
    if (meta) openEditCell(staff, meta);
  };

  // Toggle Day Type inside Cell Modal (Ngày Lễ vs Ngày Thường)
  const handleCellModalDayTypeChange = (makeHoliday: boolean) => {
    if (!editingCell) return;
    const { entry, staff, isSunday } = editingCell;
    const shiftType = entry.shift || staff.shift;
    const totalWorked = getEntryTotalHours(entry);

    let nextEntry: MatrixDayTimeEntry;
    if (makeHoliday) {
      const roundedTotal = Math.round(totalWorked * 10) / 10;
      nextEntry = {
        ...entry,
        isHoliday: true,
        regularHours: 0,
        otDayHours: 0,
        otNightHours: 0,
        otSundayHours: 0,
        otSundayNightHours: 0,
        otHolidayHours:
          shiftType === 'DAY' ? (totalWorked > 0 ? roundedTotal : entry.otHolidayHours || 0) : 0,
        otHolidayNightHours:
          shiftType === 'NIGHT' ? (totalWorked > 0 ? roundedTotal : entry.otHolidayNightHours || 0) : 0,
        status: totalWorked > 0 ? (entry.status === 'Nghỉ chủ nhật' ? 'Đúng giờ' : entry.status || 'Đúng giờ') : 'Nghỉ lễ',
      };
    } else {
      if (totalWorked > 0) {
        if (isSunday) {
          nextEntry = {
            ...entry,
            isHoliday: false,
            regularHours: 0,
            otDayHours: 0,
            otNightHours: 0,
            otSundayHours: shiftType === 'DAY' ? Math.round(totalWorked * 10) / 10 : 0,
            otSundayNightHours: shiftType === 'NIGHT' ? Math.round(totalWorked * 10) / 10 : 0,
            otHolidayHours: 0,
            otHolidayNightHours: 0,
            status: entry.status === 'Nghỉ lễ' ? 'Đúng giờ' : entry.status || 'Đúng giờ',
          };
        } else {
          const reg = Math.min(8, totalWorked);
          const ot = Math.max(0, Math.round((totalWorked - reg) * 10) / 10);
          nextEntry = {
            ...entry,
            isHoliday: false,
            regularHours: reg,
            otDayHours: shiftType === 'DAY' ? ot : 0,
            otNightHours: shiftType === 'NIGHT' ? ot : 0,
            otSundayHours: 0,
            otSundayNightHours: 0,
            otHolidayHours: 0,
            otHolidayNightHours: 0,
            status: entry.status === 'Nghỉ lễ' ? 'Đúng giờ' : entry.status || 'Đúng giờ',
          };
        }
      } else {
        nextEntry = {
          ...entry,
          isHoliday: false,
          regularHours: 0,
          otDayHours: 0,
          otNightHours: 0,
          otSundayHours: 0,
          otSundayNightHours: 0,
          otHolidayHours: 0,
          otHolidayNightHours: 0,
          status: isSunday ? 'Nghỉ chủ nhật' : entry.status === 'Nghỉ lễ' ? 'Đúng giờ' : entry.status || 'Đúng giờ',
        };
      }
    }

    setEditingCell({ ...editingCell, entry: nextEntry });
  };

  // Save modal edit
  const handleSaveModalEdit = (updatedEntry: MatrixDayTimeEntry) => {
    if (!editingCell) return;
    const { staff, day, isSunday, applyDayTypeToColumn } = editingCell;
    const isHolidayTarget = Boolean(updatedEntry.isHoliday);
    const columnHolidayChanged = Boolean(holidayDays[day]) !== isHolidayTarget;

    let nextHolidays = { ...holidayDays };
    let workingMatrix = { ...matrixData };

    if (applyDayTypeToColumn && columnHolidayChanged) {
      if (isHolidayTarget) nextHolidays[day] = true;
      else delete nextHolidays[day];

      // Convert all other employees on that day column first
      targetStaff.forEach((other) => {
        if (other.employeeId === staff.employeeId) return;
        const cur = workingMatrix[other.employeeId];
        if (!cur) return;
        const otherEntry = cur.days?.[day];
        if (!otherEntry) return;
        const otherTotal = getEntryTotalHours(otherEntry);
        const otherShift = otherEntry.shift || other.shift;
        let converted: MatrixDayTimeEntry;
        if (isHolidayTarget) {
          const roundedOther = otherTotal > 0 ? Math.round(otherTotal * 10) / 10 : 0;
          converted = {
            ...otherEntry,
            isHoliday: true,
            regularHours: 0,
            otDayHours: 0,
            otNightHours: 0,
            otSundayHours: 0,
            otSundayNightHours: 0,
            otHolidayHours: otherShift === 'DAY' ? roundedOther : 0,
            otHolidayNightHours: otherShift === 'NIGHT' ? roundedOther : 0,
            status: otherTotal > 0 ? (otherEntry.status === 'Nghỉ chủ nhật' ? 'Đúng giờ' : otherEntry.status) : 'Nghỉ lễ',
          };
        } else {
          if (otherTotal > 0) {
            if (isSunday) {
              converted = {
                ...otherEntry,
                isHoliday: false,
                regularHours: 0,
                otDayHours: 0,
                otNightHours: 0,
                otSundayHours: otherShift === 'DAY' ? otherTotal : 0,
                otSundayNightHours: otherShift === 'NIGHT' ? otherTotal : 0,
                otHolidayHours: 0,
                otHolidayNightHours: 0,
                status: otherEntry.status === 'Nghỉ lễ' ? 'Đúng giờ' : otherEntry.status,
              };
            } else {
              const reg = Math.min(8, otherTotal);
              const ot = Math.max(0, Math.round((otherTotal - reg) * 10) / 10);
              converted = {
                ...otherEntry,
                isHoliday: false,
                regularHours: reg,
                otDayHours: otherShift === 'DAY' ? ot : 0,
                otNightHours: otherShift === 'NIGHT' ? ot : 0,
                otSundayHours: 0,
                otSundayNightHours: 0,
                otHolidayHours: 0,
                otHolidayNightHours: 0,
                status: otherEntry.status === 'Nghỉ lễ' ? 'Đúng giờ' : otherEntry.status,
              };
            }
          } else {
            converted = {
              ...otherEntry,
              isHoliday: false,
              otHolidayHours: 0,
              otHolidayNightHours: 0,
              status: isSunday ? 'Nghỉ chủ nhật' : otherEntry.status === 'Nghỉ lễ' ? 'Nghỉ phép' : otherEntry.status,
            };
          }
        }
        const rawNextDays = { ...cur.days, [day]: converted };
        const nextDays = applyJoinDateAndLockRules(
          rawNextDays,
          other,
          selectedYear,
          selectedMonth,
          cur.isLocked,
          cur.lockedDay,
          nextHolidays,
          leaveRecords
        );
        workingMatrix[other.employeeId] = {
          ...cur,
          days: nextDays,
          ...recalculateStaffTotals(nextDays),
        };
      });
    }

    const currentStaffData = workingMatrix[staff.employeeId] || {
      employeeId: staff.employeeId,
      fullName: staff.fullName,
      department: staff.department || department,
      position: staff.position,
      shift: staff.shift,
      isLocked: false,
      days: {},
      totalWorkHours: 0,
      totalDayOt: 0,
      totalNightOt: 0,
      totalSundayOt: 0,
      totalSundayDayHours: 0,
      totalSundayNightHours: 0,
      totalHolidayDayHours: 0,
      totalHolidayNightHours: 0,
      totalHolidayOt: 0,
    };

    const updatedDays = {
      ...currentStaffData.days,
      [day]: {
        ...updatedEntry,
        leaveRecordId: undefined,
        isManual: true,
        isAutoDefault: false,
      },
    };

    const totals = recalculateStaffTotals(updatedDays);

    workingMatrix[staff.employeeId] = {
      ...currentStaffData,
      days: updatedDays,
      ...totals,
    };

    setHolidayDays(nextHolidays);
    setMatrixData(workingMatrix);
    persistMatrixAndHolidays(workingMatrix, nextHolidays);
    setEditingCell(null);
  };

  // Filtered staff
  const displayedStaff = useMemo(() => {
    return targetStaff.filter((s) => {
      const matchSearch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchShift = filterShift === 'ALL' || s.shift === filterShift;
      return matchSearch && matchShift;
    });
  }, [targetStaff, searchTerm, filterShift]);

  // Overall Department Totals (8 KPI Cards)
  const deptSummary = useMemo(() => {
    let grandWorkHours = 0;
    let grandDayOt = 0;
    let grandNightOt = 0;
    let grandSundayDayHours = 0;
    let grandSundayNightHours = 0;
    let grandHolidayDayHours = 0;
    let grandHolidayNightHours = 0;

    displayedStaff.forEach((s) => {
      const r = matrixData[s.employeeId];
      if (r) {
        grandWorkHours += r.totalWorkHours || 0;
        grandDayOt += r.totalDayOt || 0;
        grandNightOt += r.totalNightOt || 0;
        grandSundayDayHours += r.totalSundayDayHours ?? r.totalSundayOt ?? 0;
        grandSundayNightHours += r.totalSundayNightHours || 0;
        grandHolidayDayHours += r.totalHolidayDayHours ?? (r.shift === 'NIGHT' ? 0 : r.totalHolidayOt ?? 0);
        grandHolidayNightHours += r.totalHolidayNightHours ?? (r.shift === 'NIGHT' ? r.totalHolidayOt ?? 0 : 0);
      }
    });

    return {
      grandWorkHours: Math.round(grandWorkHours * 10) / 10,
      grandDayOt: Math.round(grandDayOt * 10) / 10,
      grandNightOt: Math.round(grandNightOt * 10) / 10,
      grandSundayDayHours: Math.round(grandSundayDayHours * 10) / 10,
      grandSundayNightHours: Math.round(grandSundayNightHours * 10) / 10,
      grandHolidayDayHours: Math.round(grandHolidayDayHours * 10) / 10,
      grandHolidayNightHours: Math.round(grandHolidayNightHours * 10) / 10,
    };
  }, [displayedStaff, matrixData]);

  // Daily Shift Attendance Counts for the 3 Footer Rows
  const dailyHeadcount = useMemo(() => {
    const map: Record<number, { dayCount: number; nightCount: number; totalCount: number }> = {};
    monthDaysMeta.forEach((m) => {
      let dayCount = 0;
      let nightCount = 0;
      displayedStaff.forEach((staff) => {
        const entry = matrixData[staff.employeeId]?.days?.[m.day];
        if (isEntryWorking(entry)) {
          const shiftType = entry?.shift || staff.shift;
          if (shiftType === 'NIGHT') nightCount += 1;
          else dayCount += 1;
        }
      });
      map[m.day] = { dayCount, nightCount, totalCount: dayCount + nightCount };
    });
    return map;
  }, [monthDaysMeta, displayedStaff, matrixData]);

  const deptComparisonRows = useMemo<ComparisonRow[]>(() => {
    const rows: ComparisonRow[] = [];
    const activeMap =
      compareSource === 'QR'
        ? qrPunchRecords
        : compareSource === 'FACE'
        ? facePunchRecords
        : swipeRecords;
    displayedStaff.forEach((staff) => {
      const daysMap = matrixData[staff.employeeId]?.days || {};
      monthDaysMeta.forEach((m) => {
        const key = `${staff.employeeId.trim().toLowerCase()}_${m.day}`;
        rows.push(
          buildComparisonRowForEmployeeDay({
            staff,
            day: m.day,
            selectedYear,
            selectedMonth,
            bcEntry: daysMap[m.day],
            holidayMap: holidayDays,
            swipeRecord: activeMap[key],
            compareSource,
          })
        );
      });
    });
    return rows;
  }, [
    displayedStaff,
    matrixData,
    monthDaysMeta,
    selectedYear,
    selectedMonth,
    holidayDays,
    swipeRecords,
    qrPunchRecords,
    facePunchRecords,
    compareSource,
  ]);

  const filteredDeptComparisonRows = useMemo(() => {
    return deptComparisonRows.filter((r) => {
      if (compareDayFilter !== 'ALL' && r.day !== Number(compareDayFilter)) return false;
      if (compareStatusFilter === 'ERRORS_ONLY') {
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
      if (compareStatusFilter === 'MATCH') return r.discrepancyType === 'MATCH';
      return true;
    });
  }, [deptComparisonRows, compareDayFilter, compareStatusFilter]);

  const deptCompareStats = useMemo(() => {
    let workDays = 0;
    let matchCount = 0;
    let missingCount = 0;
    let mismatchCount = 0;
    deptComparisonRows.forEach((r) => {
      if (r.hasBcWork) {
        workDays++;
        if (r.discrepancyType === 'MATCH') matchCount++;
        else if (
          r.discrepancyType === 'MISSING_IN' ||
          r.discrepancyType === 'MISSING_OUT' ||
          r.discrepancyType === 'MISSING_BOTH'
        ) {
          missingCount++;
        } else {
          mismatchCount++;
        }
      }
    });
    return { workDays, matchCount, missingCount, mismatchCount };
  }, [deptComparisonRows]);

  const deptSourceCounts = useMemo(() => {
    let mqtCount = 0;
    let qrCount = 0;
    let faceCount = 0;
    displayedStaff.forEach((staff) => {
      const prefix = `${staff.employeeId.trim().toLowerCase()}_`;
      monthDaysMeta.forEach((m) => {
        const key = `${prefix}${m.day}`;
        if (swipeRecords[key]) mqtCount++;
        if (qrPunchRecords[key]) qrCount++;
        if (facePunchRecords[key]) faceCount++;
      });
    });
    return { mqtCount, qrCount, faceCount };
  }, [displayedStaff, monthDaysMeta, swipeRecords, qrPunchRecords, facePunchRecords]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const swipeFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportSwipeExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const staffPool = allStaff.length > 0 ? allStaff : targetStaff;
        const res = importMachineSwipesFromArrayBuffer(
          buffer,
          staffPool,
          selectedYear,
          selectedMonth,
          department
        );
        if (res.errorMsg) {
          showToast(res.errorMsg);
          return;
        }
        if (res.success) {
          const curKey = `${selectedYear}_${selectedMonth}`;
          if (res.monthlyUpdates.has(curKey)) {
            setSwipeRecords({ ...res.monthlyUpdates.get(curKey)! });
          } else {
            const best = [...res.monthCounts].sort((a, b) => b.count - a.count)[0];
            setSelectedYear(best.year);
            setSelectedMonth(best.month);
            setSwipeRecords({ ...(res.monthlyUpdates.get(`${best.year}_${best.month}`) || {}) });
          }
          showToast(
            `Đã nạp ${res.rawPunchesParsed} dòng máy quẹt thẻ cho ${res.matchedEmployees.length} nhân viên để đối chiếu!`
          );
        } else {
          showToast('Không tìm thấy dữ liệu nhân viên hợp lệ trong file máy quẹt thẻ.');
        }
      } catch (err) {
        console.error('Import machine swipe error', err);
        showToast('Lỗi khi đọc file Excel máy quẹt thẻ.');
      } finally {
        if (swipeFileInputRef.current) swipeFileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Export to Excel matching the exact expected layout in user image
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const headerRow1 = [
      selectedYear,
      selectedMonth,
      ...monthDaysMeta.map((m) => m.dayOfWeek),
    ];

    const headerRow2 = [
      'Họ và Tên',
      'Hạng Mục',
      ...monthDaysMeta.map((m) => `${String(m.day).padStart(2, '0')}-${String(selectedMonth).padStart(2, '0')}`),
    ];

    const aoa: any[][] = [headerRow1, headerRow2];

    displayedStaff.forEach((staff) => {
      const record = matrixData[staff.employeeId];
      const days = record?.days || {};

      const caRow: any[] = [staff.fullName, 'Ca'];
      const vaoRow: any[] = [staff.employeeId, 'Vào'];
      const raRow: any[] = ['', 'Ra'];

      monthDaysMeta.forEach((m) => {
        const d = days[m.day];
        const isBeforeJoin = isDayBeforeJoinDate(selectedYear, selectedMonth, m.day, staff.dateJoined);
        const recLockType = resolveStaffLockType(staff, record);
        const isAfterLockedDay = Boolean(
          record?.isLocked && record?.lockedDay !== undefined && m.day >= record.lockedDay
        );
        const isRegimeLeave = Boolean(
          (isAfterLockedDay && recLockType === 'REGIME_LEAVE') ||
            (d?.status as string) === 'Nghỉ chế độ'
        );
        const isResigned = Boolean(
          !isRegimeLeave &&
            ((isAfterLockedDay && recLockType !== 'REGIME_LEAVE') ||
              d?.status === 'Đã nghỉ việc' ||
              (d?.status as string) === 'Đã thôi việc')
        );

        // Check if there is actual timekeeping data / working time
        const hasInTime = Boolean(d?.inTime && d.inTime.trim() && d.inTime.includes(':'));
        const hasOutTime = Boolean(d?.outTime && d.outTime.trim() && d.outTime.includes(':'));
        const totalHours =
          (d?.regularHours || 0) +
          (d?.otDayHours || 0) +
          (d?.otNightHours || 0) +
          (d?.otSundayHours || 0) +
          (d?.otSundayNightHours || 0) +
          (d?.otHolidayHours || 0) +
          (d?.otHolidayNightHours || 0);

        const hideAsBeforeJoin = isBeforeJoin && !hasMatrixRealData(d);
        const hasWorkingData =
          !hideAsBeforeJoin && !isResigned && !isRegimeLeave && (hasInTime || hasOutTime || totalHours > 0);

        // Determine night shift vs day shift
        const isNight =
          d?.shift === 'NIGHT' ||
          (d?.otNightHours || 0) > 0 ||
          (d?.otSundayNightHours || 0) > 0 ||
          (d?.otHolidayNightHours || 0) > 0 ||
          (d?.inTime &&
            (d.inTime.startsWith('20') ||
              d.inTime.startsWith('21') ||
              d.inTime.startsWith('19') ||
              d.inTime.startsWith('22')));

        const shiftText = isNight ? 'Đêm' : 'Ngày';
        const defaultInTime = isNight ? '20:00' : '08:00';
        const defaultOutTime = isNight ? '08:00' : '20:00';

        let caCell = '';
        let vaoCell = '';
        let raCell = '';

        if (isBeforeJoin) {
          caCell = '';
          vaoCell = '';
          raCell = '';
        } else if (isRegimeLeave) {
          if (m.isSunday) {
            caCell = '';
            vaoCell = '';
            raCell = '';
          } else {
            caCell = 'Nghỉ chế độ';
            vaoCell = '';
            raCell = '';
          }
        } else if (isResigned) {
          if (m.isSunday) {
            caCell = '';
            vaoCell = '';
            raCell = '';
          } else {
            caCell = 'Đã thôi việc';
            vaoCell = '';
            raCell = '';
          }
        } else if (d?.status === 'Nghỉ phép') {
          caCell = 'Nghỉ phép';
          vaoCell = '';
          raCell = '';
        } else if (d?.status === 'Nghỉ KL') {
          caCell = 'Nghỉ KL';
          vaoCell = '';
          raCell = '';
        } else if (d?.status === 'Nghỉ ốm' || d?.status === 'Nghỉ cưới' || d?.status === 'Nghỉ tang') {
          caCell = d.status;
          vaoCell = '';
          raCell = '';
        } else if (m.isHoliday || d?.isHoliday) {
          if (hasWorkingData) {
            caCell = shiftText;
            vaoCell = d?.inTime || defaultInTime;
            raCell = d?.outTime || defaultOutTime;
          } else {
            caCell = 'Nghỉ lễ';
            vaoCell = '';
            raCell = '';
          }
        } else if (m.isSunday) {
          if (hasWorkingData) {
            caCell = shiftText;
            vaoCell = d?.inTime || defaultInTime;
            raCell = d?.outTime || defaultOutTime;
          } else {
            caCell = 'CN';
            vaoCell = '';
            raCell = '';
          }
        } else {
          if (hasWorkingData) {
            caCell = shiftText;
            vaoCell = d?.inTime || defaultInTime;
            raCell = d?.outTime || defaultOutTime;
          } else {
            caCell = '';
            vaoCell = '';
            raCell = '';
          }
        }

        caRow.push(caCell);
        vaoRow.push(vaoCell);
        raRow.push(raCell);
      });

      aoa.push(caRow);
      aoa.push(vaoRow);
      aoa.push(raRow);
    });

    const totalDayAllMonth = monthDaysMeta.reduce((sum, m) => sum + (dailyHeadcount[m.day]?.dayCount || 0), 0);
    const totalNightAllMonth = monthDaysMeta.reduce((sum, m) => sum + (dailyHeadcount[m.day]?.nightCount || 0), 0);
    const totalAllMonth = totalDayAllMonth + totalNightAllMonth;

    const summaryCaRow = [
      '',
      `Số NV đi làm Ca Ngày   Tổng: ${totalDayAllMonth}`,
      ...monthDaysMeta.map((m) => dailyHeadcount[m.day]?.dayCount || 0),
    ];
    const summaryVaoRow = [
      '',
      `Số NV đi làm Ca Đêm   Tổng: ${totalNightAllMonth}`,
      ...monthDaysMeta.map((m) => dailyHeadcount[m.day]?.nightCount || 0),
    ];
    const summaryRaRow = [
      '',
      `Tổng NV đi làm trong ngày   Tổng: ${totalAllMonth}`,
      ...monthDaysMeta.map((m) => dailyHeadcount[m.day]?.totalCount || 0),
    ];

    aoa.push([]);
    aoa.push(summaryCaRow);
    aoa.push(summaryVaoRow);
    aoa.push(summaryRaRow);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, `Thang_${selectedMonth}_${selectedYear}`);
    XLSX.writeFile(wb, `Bang_Cham_Cong_Ma_Tran_${department}_T${selectedMonth}_${selectedYear}.xlsx`);
    showToast('Đã xuất file Excel bảng chấm công thành công!');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!rows || rows.length < 3) {
          showToast('File Excel không đúng định dạng bảng chấm công.');
          return;
        }

        let dayColMap: { colIdx: number; dayNum: number }[] = [];
        const headerRow2 = rows[1] || rows[0];
        headerRow2.forEach((cellVal, colIdx) => {
          const s = String(cellVal || '').trim();
          const matchDate = s.match(/^(\d{1,2})-(\d{1,2})$/);
          if (matchDate) {
            const dNum = Number(matchDate[1]);
            if (dNum >= 1 && dNum <= 31) {
              dayColMap.push({ colIdx, dayNum: dNum });
            }
          } else {
            const n = Number(s);
            if (n >= 1 && n <= 31) {
              dayColMap.push({ colIdx, dayNum: n });
            }
          }
        });

        if (dayColMap.length === 0) {
          for (let d = 1; d <= daysInMonth; d++) {
            dayColMap.push({ colIdx: d + 1, dayNum: d });
          }
        }

        const normalizeTime = (val: any): string => {
          if (val === null || val === undefined) return '';
          const s = String(val).trim();
          if (!s) return '';
          if (s.includes(':')) {
            const parts = s.split(':');
            const h = parts[0].padStart(2, '0');
            const m = (parts[1] || '00').slice(0, 2).padStart(2, '0');
            return `${h}:${m}`;
          }
          const n = Number(s);
          if (!isNaN(n) && n > 0 && n < 1) {
            const totalMins = Math.round(n * 24 * 60);
            const h = String(Math.floor(totalMins / 60)).padStart(2, '0');
            const m = String(totalMins % 60).padStart(2, '0');
            return `${h}:${m}`;
          }
          return s;
        };

        const nextMatrix = { ...matrixData };
        let updatedCount = 0;

        for (let r = 2; r < rows.length; r += 3) {
          const caRow = rows[r];
          const vaoRow = rows[r + 1];
          const raRow = rows[r + 2];

          if (!caRow || !vaoRow) continue;

          const empIdOrName = String(vaoRow[0] || caRow[0] || '').trim();
          if (!empIdOrName) continue;

          const matchedStaff = targetStaff.find(
            (st) =>
              st.employeeId.trim().toLowerCase() === empIdOrName.toLowerCase() ||
              st.fullName.trim().toLowerCase() === String(caRow[0] || '').trim().toLowerCase() ||
              st.fullName.trim().toLowerCase() === empIdOrName.toLowerCase()
          );
          if (!matchedStaff) continue;

          const currentRec = nextMatrix[matchedStaff.employeeId] || {
            employeeId: matchedStaff.employeeId,
            fullName: matchedStaff.fullName,
            department: matchedStaff.department || department,
            position: matchedStaff.position,
            shift: matchedStaff.shift,
            isLocked: false,
            days: {},
          };

          const days = { ...currentRec.days };
          let minResignedDay: number | undefined = undefined;
          let importedLockType: StaffLockType | undefined = undefined;

          dayColMap.forEach(({ colIdx, dayNum }) => {
            const caVal = String(caRow[colIdx] || '').trim();
            const vaoVal = String(vaoRow[colIdx] || '').trim();
            const raVal = String((raRow && raRow[colIdx]) || '').trim();
            const caLower = caVal.toLowerCase();
            const vaoLower = vaoVal.toLowerCase();
            const vaoTime = normalizeTime(vaoVal);
            const raTime = normalizeTime(raVal);
            const hasTime = vaoTime.includes(':') || raTime.includes(':');

            const isRegime =
              caLower.includes('nghỉ chế độ') || vaoLower.includes('nghỉ chế độ');
            const isResigned =
              !isRegime &&
              (caLower.includes('đã thôi việc') ||
                caLower.includes('đã nghỉ việc') ||
                caLower.includes('thôi việc') ||
                vaoLower.includes('thôi việc') ||
                vaoLower.includes('nghỉ việc'));

            if (isRegime || isResigned) {
              if (minResignedDay === undefined || dayNum < minResignedDay) {
                minResignedDay = dayNum;
                importedLockType = isRegime ? 'REGIME_LEAVE' : 'RESIGNED';
              }
            }

            const isSun = new Date(selectedYear, selectedMonth - 1, dayNum).getDay() === 0;
            const isHol = Boolean(holidayDays[dayNum]) || caLower.includes('lễ');

            let shift: 'DAY' | 'NIGHT' = matchedStaff.shift;
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

            if (isRegime) {
              status = 'Nghỉ chế độ';
            } else if (isResigned) {
              status = 'Đã nghỉ việc';
            } else if (caLower.includes('nghỉ phép') || vaoVal.includes('Nghỉ phép')) {
              status = 'Nghỉ phép';
            } else if (caLower.includes('nghỉ kl') || vaoVal.includes('Nghỉ KL')) {
              status = 'Nghỉ KL';
            } else if (caLower.includes('nghỉ ốm')) {
              status = 'Nghỉ ốm';
            } else if (caLower.includes('nghỉ cưới')) {
              status = 'Nghỉ cưới';
            } else if (caLower.includes('nghỉ tang')) {
              status = 'Nghỉ tang';
            } else if (
              caLower.includes('nghỉ cn') ||
              caLower === 'cn' ||
              (isSun && !hasTime && !caLower.includes('ngày') && !caLower.includes('đêm'))
            ) {
              status = 'Nghỉ chủ nhật';
            } else if (
              caLower.includes('nghỉ lễ') ||
              (isHol && !hasTime && !caLower.includes('ngày') && !caLower.includes('đêm'))
            ) {
              status = 'Nghỉ lễ';
            } else if (
              caLower.includes('đêm') ||
              vaoTime.startsWith('20') ||
              vaoTime.startsWith('21') ||
              vaoTime.startsWith('19') ||
              (!caVal && matchedStaff.shift === 'NIGHT' && hasTime)
            ) {
              shift = 'NIGHT';
              inTime = vaoTime || '20:00';
              outTime = raTime || '08:00';
              status = 'Đúng giờ';
              if (isHol) {
                otHolidayNightHours = 11;
              } else if (isSun) {
                otSundayNightHours = 11;
              } else {
                regularHours = 8;
                otNightHours = 3;
              }
            } else if (
              caLower.includes('ngày') ||
              vaoTime.startsWith('08') ||
              vaoTime.startsWith('07') ||
              hasTime
            ) {
              shift = 'DAY';
              inTime = vaoTime || '08:00';
              outTime = raTime || '20:00';
              status = 'Đúng giờ';
              if (isHol) {
                otHolidayHours = 11;
              } else if (isSun) {
                otSundayHours = 11;
              } else {
                regularHours = 8;
                otDayHours = 3;
              }
            } else {
              inTime = '';
              outTime = '';
              status = isHol ? 'Nghỉ lễ' : isSun ? 'Nghỉ chủ nhật' : 'Đúng giờ';
            }

            days[dayNum] = {
              day: dayNum,
              shift,
              inTime,
              outTime,
              regularHours,
              otDayHours,
              otNightHours,
              otSundayHours,
              otSundayNightHours,
              otHolidayHours,
              otHolidayNightHours,
              isHoliday: isHol,
              status,
              isManual: true,
              isAutoDefault: false,
            };
          });

          const isLocked = minResignedDay !== undefined ? true : Boolean(currentRec.isLocked);
          const lockedDay = minResignedDay !== undefined ? minResignedDay : currentRec.lockedDay;
          const resolvedLockType = isLocked
            ? importedLockType || resolveStaffLockType(matchedStaff, currentRec)
            : undefined;
          const appliedDays = applyJoinDateAndLockRules(
            days,
            matchedStaff,
            selectedYear,
            selectedMonth,
            isLocked,
            lockedDay,
            holidayDays,
            leaveRecords,
            resolvedLockType
          );
          const totals = recalculateStaffTotals(appliedDays);
          nextMatrix[matchedStaff.employeeId] = {
            ...currentRec,
            isLocked,
            lockType: resolvedLockType,
            lockedDay,
            days: appliedDays,
            ...totals,
          };
          updatedCount += 1;
        }

        if (updatedCount > 0) {
          setMatrixData(nextMatrix);
          persistMatrixAndHolidays(nextMatrix, holidayDays);
          showToast(`Đã cập nhật bảng chấm công cho ${updatedCount} nhân viên từ Excel thành công!`);
        } else {
          showToast('Không tìm thấy dữ liệu mã nhân viên hợp lệ trong file Excel.');
        }
      } catch (err) {
        console.error('Excel import error:', err);
        showToast('Lỗi khi đọc file Excel bảng chấm công.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-3 sm:p-6 max-w-[100vw] space-y-4">
      {/* Top Header Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="w-full xl:w-auto px-7 sm:px-4 xl:px-0">
          <div className="flex flex-col sm:flex-row items-center justify-center xl:justify-start gap-2.5 text-center sm:text-left">
            <div className="w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-white flex flex-wrap items-center justify-center sm:justify-start gap-2 uppercase tracking-wide">
                <span>Bảng Chấm Công Ma Trận ({departmentTitle})</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  T{selectedMonth}/{selectedYear}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 sm:mt-0.5 text-center sm:text-left">
                Lưới ma trận chi tiết từ ngày 1 đến ngày {daysInMonth} theo năm {selectedYear} · Giờ vào, giờ ra, tăng ca ngày, đêm, chủ nhật & ngày lễ.
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="w-full max-w-md mx-auto xl:max-w-none xl:w-auto xl:mx-0 flex flex-col sm:flex-row sm:flex-wrap items-center justify-center xl:justify-end gap-2">
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => {
                if (selectedMonth === 1) {
                  setSelectedMonth(12);
                  setSelectedYear((y) => y - 1);
                } else {
                  setSelectedMonth((m) => m - 1);
                }
              }}
              className="p-1.5 sm:p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1 px-2 font-mono font-bold text-slate-200">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-cyan-400 font-bold focus:outline-hidden cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    Tháng {m}
                  </option>
                ))}
              </select>
              <span className="text-slate-600">/</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-hidden cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                if (selectedMonth === 12) {
                  setSelectedMonth(1);
                  setSelectedYear((y) => y + 1);
                } else {
                  setSelectedMonth((m) => m + 1);
                }
              }}
              className="p-1.5 sm:p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full sm:w-auto grid grid-cols-[minmax(0,1fr)_auto] sm:flex items-center gap-2">
            <div className="relative min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên, mã NV..."
                className="w-full sm:w-48 bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>

            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value as 'ALL' | 'DAY' | 'NIGHT')}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 cursor-pointer shrink-0"
            >
              <option value="ALL">Tất cả ca</option>
              <option value="DAY">Ca Ngày</option>
              <option value="NIGHT">Ca Đêm</option>
            </select>
          </div>

          <div className="w-full sm:w-auto flex flex-wrap items-center justify-center gap-2">
            {/* Chuyển chế độ: Bảng Công Thường vs Đối Chiếu Quẹt Thẻ / QR */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-700/80">
              <button
                type="button"
                onClick={() => setViewMode('MATRIX')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'MATRIX'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Bảng Công Thường
              </button>
              <button
                type="button"
                onClick={() => setViewMode('COMPARE')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'COMPARE'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3 h-3" />
                <span>Đối Chiếu MQT / QR</span>
              </button>
            </div>

            {viewMode === 'MATRIX' && (
              <>
                <button
                  onClick={handleAutoFillStandard}
                  className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-700/60 text-[11px] sm:text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
                  title="Điền tự động công chuẩn 8h cho các ngày trong tuần"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Điền Chuẩn</span>
                </button>

                <button
                  onClick={handleSaveMatrix}
                  className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] sm:text-xs font-bold shadow-md cursor-pointer transition-colors whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  <span>Lưu Bảng Công</span>
                </button>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="hidden"
            />
            <input
              ref={swipeFileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportSwipeExcel}
              className="hidden"
            />

            {viewMode === 'MATRIX' ? (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] sm:text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
                  title="Nhập bảng chấm công từ Excel"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Nhập Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md cursor-pointer transition-colors whitespace-nowrap"
                  title="Xuất ma trận chấm công ra Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  <span>Xuất Excel</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => swipeFileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] sm:text-xs font-bold shadow-md cursor-pointer transition-colors whitespace-nowrap"
                title="Tải file Excel Máy quẹt thẻ để đối chiếu"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>Nạp File Máy Quẹt</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {saveToast && (
        <div className="bg-emerald-950/80 border border-emerald-700/80 p-3 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {viewMode === 'COMPARE' ? (
        <div className="space-y-4">
          {/* Sub-controls + Info banner for Đối chiếu QR / Quẹt thẻ vs Chấm công thường */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-slate-300 space-y-0.5">
                <div>
                  <strong className="text-white">
                    Đối Chiếu Dữ Liệu{' '}
                    {compareSource === 'QR'
                      ? 'Quét QR'
                      : compareSource === 'FACE'
                      ? 'Chấm Công Khuôn Mặt'
                      : 'Máy Quẹt Thẻ'}{' '}
                    vs Chấm Công Thường (BC)
                  </strong>{' '}
                  — Phòng <strong className="text-cyan-300">{departmentTitle}</strong>
                </div>
                <p className="text-[11px] text-slate-400">
                  Khi nhân viên quét mã QR hoặc chấm công Khuôn mặt, giờ vào/ra được lưu riêng (không ghi đè ô chấm công thường). Chuyển nhanh giữa{' '}
                  <strong className="text-blue-300">Quẹt thẻ</strong>, <strong className="text-cyan-300">QR</strong> và{' '}
                  <strong className="text-sky-300">Khuôn mặt</strong> ngay tại tiêu đề cột nhóm 2 để đối chiếu với bảng chấm công thường.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    hasManualCompareSourceRef.current = true;
                    setCompareSource('MQT');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    compareSource === 'MQT'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Quẹt thẻ ({deptSourceCounts.mqtCount})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hasManualCompareSourceRef.current = true;
                    setCompareSource('QR');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                    compareSource === 'QR'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR ({deptSourceCounts.qrCount})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hasManualCompareSourceRef.current = true;
                    setCompareSource('FACE');
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                    compareSource === 'FACE'
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ScanFace className="w-3.5 h-3.5" />
                  Khuôn mặt ({deptSourceCounts.faceCount})
                </button>
              </div>

              <select
                value={compareDayFilter}
                onChange={(e) => setCompareDayFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer"
              >
                <option value="ALL">Tất cả ngày ({daysInMonth} ngày)</option>
                {monthDaysMeta.map((m) => (
                  <option key={m.day} value={String(m.day)}>
                    Ngày {String(m.day).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')} ({m.dayOfWeek})
                  </option>
                ))}
              </select>

              <select
                value={compareStatusFilter}
                onChange={(e) =>
                  setCompareStatusFilter(e.target.value as 'ALL' | 'ERRORS_ONLY' | 'MATCH')
                }
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ERRORS_ONLY">Chỉ ngày lệch / thiếu giờ</option>
                <option value="MATCH">Khớp chuẩn</option>
              </select>
            </div>
          </div>

          {/* Summary KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Ngày Có Lịch BC</div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">{deptCompareStats.workDays}</div>
            </div>
            <div className="bg-emerald-950/30 border border-emerald-700/50 p-3 rounded-xl">
              <div className="text-[10px] text-emerald-300 uppercase font-semibold">Khớp Chuẩn</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{deptCompareStats.matchCount}</div>
            </div>
            <div className="bg-rose-950/30 border border-rose-700/50 p-3 rounded-xl">
              <div className="text-[10px] text-rose-300 uppercase font-semibold">
                {compareSource === 'QR'
                  ? 'Thiếu Giờ Quét QR'
                  : compareSource === 'FACE'
                  ? 'Thiếu Giờ Khuôn Mặt'
                  : 'Thiếu Giờ Quẹt Thẻ'}
              </div>
              <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">{deptCompareStats.missingCount}</div>
            </div>
            <div className="bg-amber-950/30 border border-amber-700/50 p-3 rounded-xl">
              <div className="text-[10px] text-amber-300 uppercase font-semibold">Muộn / Sớm / Lệch TC</div>
              <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">{deptCompareStats.mismatchCount}</div>
            </div>
          </div>

          {/* Comparison Table with [Quẹt thẻ | QR | Khuôn mặt] inside Group 2 header */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-auto custom-scrollbar max-h-[68vh]">
              <table className="w-full min-w-[1440px] text-left border-collapse text-xs whitespace-nowrap">
                <thead className="bg-slate-950 text-[10px] uppercase tracking-wider text-slate-300 font-semibold sticky top-0 z-30">
                  <tr className="border-b border-slate-800">
                    <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-800 min-w-[190px] sticky left-0 z-40 bg-slate-950">
                      Nhân Viên
                    </th>
                    <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-slate-800 min-w-[95px]">
                      Ngày / Thứ
                    </th>
                    <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-slate-800 min-w-[85px]">
                      Ca
                    </th>
                    <th
                      colSpan={3}
                      className="py-1.5 px-3 text-center border-r border-slate-800 bg-amber-950/35 text-amber-300 font-bold border-b border-amber-800/40"
                    >
                      1. CHẤM CÔNG THƯỜNG (BC)
                    </th>
                    <th
                      colSpan={3}
                      className={`py-1.5 px-3 text-center border-r border-slate-800 font-bold border-b ${
                        compareSource === 'QR'
                          ? 'bg-cyan-950/35 text-cyan-300 border-cyan-800/40'
                          : compareSource === 'FACE'
                          ? 'bg-sky-950/35 text-sky-300 border-sky-800/40'
                          : 'bg-blue-950/35 text-blue-300 border-blue-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span>
                          {compareSource === 'QR'
                            ? '2. CHẤM CÔNG BẰNG MÃ QR'
                            : compareSource === 'FACE'
                            ? '2. CHẤM CÔNG KHUÔN MẶT'
                            : '2. MÁY QUẸT THẺ (MQT)'}
                        </span>
                        <span className="inline-flex items-center p-0.5 rounded bg-slate-950/90 border border-slate-700/80">
                          <button
                            type="button"
                            onClick={() => {
                              hasManualCompareSourceRef.current = true;
                              setCompareSource('MQT');
                            }}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                              compareSource === 'MQT'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Quẹt thẻ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              hasManualCompareSourceRef.current = true;
                              setCompareSource('QR');
                            }}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                              compareSource === 'QR'
                                ? 'bg-cyan-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            QR
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              hasManualCompareSourceRef.current = true;
                              setCompareSource('FACE');
                            }}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                              compareSource === 'FACE'
                                ? 'bg-sky-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Khuôn mặt
                          </button>
                        </span>
                      </div>
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-800 min-w-[130px] text-white font-bold">
                      Trạng Thái
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-800 min-w-[300px] text-white font-bold">
                      Chi Tiết Đối Chiếu ({compareSource === 'QR' ? 'QR vs BC' : compareSource === 'FACE' ? 'Khuôn Mặt vs BC' : 'MQT vs BC'})
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 text-right min-w-[105px]">
                      Thao Tác
                    </th>
                  </tr>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400">
                    <th className="py-2 px-2.5 text-center border-r border-slate-800 bg-amber-950/15 text-amber-300">
                      Giờ Vào (BC)
                    </th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-800 bg-amber-950/15 text-amber-300">
                      Giờ Ra (BC)
                    </th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-800 bg-amber-950/15 text-amber-400 font-bold">
                      Tăng Ca (BC)
                    </th>
                    <th
                      className={`py-2 px-2.5 text-center border-r border-slate-800 ${
                        compareSource === 'QR'
                          ? 'bg-cyan-950/15 text-cyan-300'
                          : compareSource === 'FACE'
                          ? 'bg-sky-950/15 text-sky-300'
                          : 'bg-blue-950/15 text-blue-300'
                      }`}
                    >
                      {compareSource === 'QR'
                        ? 'Giờ Vào (QR)'
                        : compareSource === 'FACE'
                        ? 'Giờ Vào (Khuôn Mặt)'
                        : 'Giờ Vào (MQT)'}
                    </th>
                    <th
                      className={`py-2 px-2.5 text-center border-r border-slate-800 ${
                        compareSource === 'QR'
                          ? 'bg-cyan-950/15 text-cyan-300'
                          : compareSource === 'FACE'
                          ? 'bg-sky-950/15 text-sky-300'
                          : 'bg-blue-950/15 text-blue-300'
                      }`}
                    >
                      {compareSource === 'QR'
                        ? 'Giờ Ra (QR)'
                        : compareSource === 'FACE'
                        ? 'Giờ Ra (Khuôn Mặt)'
                        : 'Giờ Ra (MQT)'}
                    </th>
                    <th className="py-2 px-2.5 text-center border-r border-slate-800 bg-blue-950/15 text-cyan-300 font-bold">
                      {compareSource === 'QR'
                        ? 'Tăng Ca (QR)'
                        : compareSource === 'FACE'
                        ? 'Tăng Ca (Khuôn Mặt)'
                        : 'Tăng Ca (MQT)'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredDeptComparisonRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-slate-500">
                        Không có dữ liệu đối chiếu phù hợp với bộ lọc đang chọn.
                      </td>
                    </tr>
                  ) : (
                    filteredDeptComparisonRows.map((row) => {
                      const t = row.discrepancyType;
                      let badgeCls = 'bg-slate-900 text-slate-300 border-slate-700';
                      if (t === 'MATCH') badgeCls = 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40';
                      else if (t === 'MISSING_IN' || t === 'MISSING_BOTH')
                        badgeCls = 'bg-rose-950/80 text-rose-300 border-rose-500/50';
                      else if (t === 'MISSING_OUT' || t === 'LATE_IN' || t === 'EARLY_OUT')
                        badgeCls = 'bg-amber-950/80 text-amber-300 border-amber-500/50';
                      else if (t === 'LATE_AND_EARLY')
                        badgeCls = 'bg-rose-950/70 text-rose-300 border-rose-500/40';
                      else if (t === 'OT_MISMATCH')
                        badgeCls = 'bg-purple-950/70 text-purple-300 border-purple-500/40';
                      else if (t === 'UNSCHEDULED_SWIPE')
                        badgeCls = 'bg-sky-950/70 text-sky-300 border-sky-500/40';

                      const dayMeta = monthDaysMeta.find((m) => m.day === row.day);

                      return (
                        <tr key={row.rowId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-3 border-r border-slate-800 sticky left-0 z-20 bg-slate-900">
                            <div className="font-semibold text-white truncate max-w-[170px]">{row.staff.fullName}</div>
                            <div className="text-[10px] font-mono text-cyan-400">{row.staff.employeeId}</div>
                          </td>
                          <td className="py-2 px-2.5 text-center border-r border-slate-800 font-mono">
                            <span className="font-bold text-slate-200">{row.dateStr}</span>{' '}
                            <span className={row.isSunday ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                              ({row.dayOfWeek})
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-center border-r border-slate-800">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.shift === 'NIGHT'
                                  ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                                  : 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {row.shift === 'NIGHT' ? 'Ca Đêm' : 'Ca Ngày'}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono border-r border-slate-800 bg-amber-950/5">
                            {row.bcInTime ? (
                              <span className="font-semibold text-amber-200">{row.bcInTime}</span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono border-r border-slate-800 bg-amber-950/5">
                            {row.bcOutTime ? (
                              <span className="font-semibold text-amber-200">{row.bcOutTime}</span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono border-r border-slate-800 bg-amber-950/10">
                            <strong className={row.bcOtHours > 0 ? 'text-amber-300' : 'text-slate-500'}>
                              {row.bcOtHours > 0 ? `+${row.bcOtHours}h` : '0h'}
                            </strong>
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono border-r border-slate-800 bg-blue-950/5">
                            {row.mqtInTime ? (
                              <span className={row.isClampedIn ? 'text-cyan-300 font-semibold' : 'text-emerald-400 font-semibold'}>
                                {row.mqtInTime}
                              </span>
                            ) : row.hasBcWork ? (
                              <span className="text-[10px] text-rose-400 font-sans font-bold">
                                {compareSource === 'QR'
                                  ? 'Chưa quét'
                                  : compareSource === 'FACE'
                                  ? 'Chưa chấm'
                                  : 'Thiếu vào'}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono border-r border-slate-800 bg-blue-950/5">
                            {row.mqtOutTime ? (
                              <span className={row.isClampedOut ? 'text-cyan-300 font-semibold' : 'text-emerald-400 font-semibold'}>
                                {row.mqtOutTime}
                              </span>
                            ) : row.hasBcWork ? (
                              <span className="text-[10px] text-amber-400 font-sans font-bold">
                                {compareSource === 'QR'
                                  ? 'Chưa quét'
                                  : compareSource === 'FACE'
                                  ? 'Chưa chấm'
                                  : 'Thiếu ra'}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono border-r border-slate-800 bg-blue-950/10">
                            <strong className={row.mqtOtHours > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                              {row.mqtOtHours > 0 ? `+${row.mqtOtHours}h` : '0h'}
                            </strong>
                          </td>
                          <td className="py-2 px-3 text-center border-r border-slate-800">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${badgeCls}`}>
                              {row.discrepancyLabel}
                            </span>
                          </td>
                          <td className="py-2 px-3 border-r border-slate-800 text-[11px] text-slate-300 font-sans">
                            {row.discrepancyDetail}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {dayMeta && (
                              <button
                                type="button"
                                onClick={() => openEditCell(row.staff, dayMeta)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-[11px] font-semibold cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Sửa BC</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>

      {/* 8 Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Quân Số Đang Xem</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {displayedStaff.length} <span className="text-xs font-sans font-normal text-slate-300">nhân viên</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 uppercase">{departmentTitle}</div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-700/50 p-3 rounded-xl">
          <div className="text-[10px] text-emerald-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng Giờ Làm Tháng</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{deptSummary.grandWorkHours}h</div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">Bao gồm công + tăng ca</div>
        </div>

        <div className="bg-amber-950/25 border border-amber-700/50 p-3 rounded-xl">
          <div className="text-[10px] text-amber-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng Tăng Ca Ngày</span>
            <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{deptSummary.grandDayOt}h</div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">T2 - T7 ban ngày</div>
        </div>

        <div className="bg-purple-950/25 border border-purple-700/50 p-3 rounded-xl">
          <div className="text-[10px] text-purple-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng Tăng Ca Đêm</span>
            <Moon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1">{deptSummary.grandNightOt}h</div>
          <div className="text-[10px] text-purple-400/80 mt-0.5">Sau 22:00 hoặc ca đêm</div>
        </div>

        <div className="bg-pink-950/25 border border-pink-700/50 p-3 rounded-xl">
          <div className="text-[10px] text-pink-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng Ngày Chủ Nhật</span>
            <Sun className="w-3.5 h-3.5 text-pink-400 shrink-0" />
          </div>
          <div className="text-xl font-bold font-mono text-pink-400 mt-1">{deptSummary.grandSundayDayHours}h</div>
          <div className="text-[10px] text-pink-400/80 mt-0.5">Ca ngày Chủ Nhật</div>
        </div>

        <div className="bg-fuchsia-950/25 border border-fuchsia-700/50 p-3 rounded-xl">
          <div className="text-[10px] text-fuchsia-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng Đêm Chủ Nhật</span>
            <Moon className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
          </div>
          <div className="text-xl font-bold font-mono text-fuchsia-400 mt-1">{deptSummary.grandSundayNightHours}h</div>
          <div className="text-[10px] text-fuchsia-400/80 mt-0.5">Ca đêm Chủ Nhật</div>
        </div>

        <div className="bg-red-950/30 border border-red-700/50 p-3 rounded-xl">
          <div className="text-[10px] text-red-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng Ngày Lễ</span>
            <Sun className="w-3.5 h-3.5 text-red-400 shrink-0" />
          </div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">{deptSummary.grandHolidayDayHours}h</div>
          <div className="text-[10px] text-red-400/80 mt-0.5">Ca ngày Ngày Lễ</div>
        </div>

        <div className="bg-orange-950/30 border border-orange-700/50 p-3 rounded-xl">
          <div className="text-[10px] text-orange-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng TC Đêm Lễ</span>
            <Moon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          </div>
          <div className="text-xl font-bold font-mono text-orange-400 mt-1">{deptSummary.grandHolidayNightHours}h</div>
          <div className="text-[10px] text-orange-400/80 mt-0.5">Ca đêm Ngày Lễ</div>
        </div>
      </div>

      {/* Main Matrix Table Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-auto custom-scrollbar max-h-[72vh]">
          <table className="w-full text-left text-xs border-collapse">
            {/* Header: 2 Rows */}
            <thead className="bg-slate-950 text-slate-300 uppercase text-[10px] tracking-wider sticky top-0 z-30 shadow-md">
              {/* Row 1 */}
              <tr className="border-b border-slate-800">
                <th className="py-2.5 px-2 sm:px-3 bg-slate-950 sticky left-0 z-40 w-[144px] min-w-[144px] max-w-[144px] sm:w-[210px] sm:min-w-[210px] sm:max-w-[210px] border-r border-slate-700 shadow-[4px_0_12px_rgba(0,0,0,0.75)]">
                  Tên Nhân Viên
                </th>
                <th className="py-2.5 px-2 bg-slate-950 min-w-[44px] w-[44px] text-center border-r border-slate-800">
                  STT
                </th>
                <th className="py-2.5 px-2.5 bg-slate-950 min-w-[85px] w-[85px] border-r border-slate-800">
                  Mã NV
                </th>
                <th className="py-2.5 px-2 bg-slate-950 text-center min-w-[78px] border-r border-slate-800 text-emerald-400 font-bold">
                  Tổng Giờ Làm
                </th>
                <th className="py-2.5 px-2 bg-slate-950 text-center min-w-[66px] border-r border-slate-800 text-amber-400 font-bold">
                  TC Ngày
                </th>
                <th className="py-2.5 px-2 bg-slate-950 text-center min-w-[66px] border-r border-slate-800 text-purple-400 font-bold">
                  TC Đêm
                </th>
                <th className="py-2.5 px-2 bg-slate-950 text-center min-w-[68px] border-r border-slate-800 text-pink-400 font-bold">
                  Ngày CN
                </th>
                <th className="py-2.5 px-2 bg-slate-950 text-center min-w-[68px] border-r border-slate-800 text-fuchsia-400 font-bold">
                  Đêm CN
                </th>
                <th className="py-2.5 px-2 bg-slate-950 text-center min-w-[68px] border-r border-slate-800 text-red-400 font-bold">
                  Ngày Lễ
                </th>
                <th className="py-2.5 px-2 bg-slate-950 text-center min-w-[72px] border-r border-slate-700 text-orange-400 font-bold">
                  TC Đêm Lễ
                </th>

                {/* Day 1 to Day 30/31 Clickable Headers */}
                {monthDaysMeta.map((m) => (
                  <th
                    key={m.day}
                    onClick={() => setDayTypeModal(m)}
                    className={`py-1.5 px-2 text-center min-w-[104px] border-r border-slate-800 select-none cursor-pointer transition-colors group/hdr ${
                      m.isHoliday
                        ? 'bg-red-950/80 text-red-200 hover:bg-red-900/80 border-b-2 border-b-red-500'
                        : m.isSunday
                        ? 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60'
                        : m.isSaturday
                        ? 'bg-slate-900 text-amber-300 hover:bg-slate-800'
                        : 'bg-slate-950/90 text-slate-300 hover:bg-slate-800/90'
                    }`}
                    title={`Kích để chọn Ngày Lễ / Ngày Thường cho Ngày ${m.day}/${selectedMonth}/${selectedYear}`}
                  >
                    <div className="font-bold text-xs font-mono flex items-center justify-center gap-1">
                      <span>Ngày {m.day}</span>
                      {m.isHoliday && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-red-500 text-white font-bold">LỄ</span>
                      )}
                    </div>
                    <div
                      className={`text-[9px] font-bold ${
                        m.isHoliday
                          ? 'text-red-300'
                          : m.isSunday
                          ? 'text-rose-400'
                          : m.isSaturday
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {m.isHoliday ? `NGÀY LỄ (${m.dayOfWeek})` : m.isSunday ? `${m.dayOfWeek} (CHỦ NHẬT)` : m.dayOfWeek}
                    </div>
                  </th>
                ))}
              </tr>

              {/* Row 2: Sub-labels */}
              <tr className="border-b border-slate-800 bg-slate-950/95 text-[9px] text-slate-400 font-mono">
                <th
                  colSpan={1}
                  className="py-1 px-2 sm:px-3 sticky left-0 z-40 bg-slate-950 border-r border-slate-700 shadow-[4px_0_12px_rgba(0,0,0,0.75)] text-slate-400"
                >
                  HỌ TÊN · CHẤM CÔNG
                </th>
                <th colSpan={2} className="py-1 px-2 text-center bg-slate-950 border-r border-slate-800 text-slate-400">
                  STT · MÃ NV
                </th>
                <th colSpan={7} className="py-1 px-2 text-center border-r border-slate-700 bg-slate-950 text-cyan-300">
                  TỔNG HỢP CÔNG & TĂNG CA CẢ THÁNG
                </th>
                {monthDaysMeta.map((m) => (
                  <th
                    key={`sub_${m.day}`}
                    onClick={() => setDayTypeModal(m)}
                    className={`py-1 px-1 text-center border-r border-slate-800 text-[9px] cursor-pointer ${
                      m.isHoliday
                        ? 'bg-red-950/50 text-red-300'
                        : m.isSunday
                        ? 'bg-rose-950/40 text-rose-400'
                        : 'bg-slate-950 text-slate-400 hover:text-cyan-300'
                    }`}
                  >
                    {m.isHoliday ? 'Lễ · Vào · Ra' : 'Vào · Ra · Tăng Ca'}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {displayedStaff.map((staff, idx) => {
                const record = matrixData[staff.employeeId] || {
                  employeeId: staff.employeeId,
                  fullName: staff.fullName,
                  department: staff.department || department,
                  position: staff.position,
                  shift: staff.shift,
                  isLocked: false,
                  days: {},
                  totalWorkHours: 0,
                  totalDayOt: 0,
                  totalNightOt: 0,
                  totalSundayOt: 0,
                  totalSundayDayHours: 0,
                  totalSundayNightHours: 0,
                  totalHolidayDayHours: 0,
                  totalHolidayNightHours: 0,
                  totalHolidayOt: 0,
                };

                const days = record.days || {};

                return (
                  <tr key={staff.employeeId} className="hover:bg-slate-800/40 transition-colors group">
                    {/* Tên Nhân Viên + Lock + Chấm công button (ONLY sticky left column) */}
                    <td className="py-2 px-2 sm:px-3 sticky left-0 z-20 bg-slate-950 group-hover:bg-slate-900 border-r border-slate-700 shadow-[4px_0_12px_rgba(0,0,0,0.75)] w-[144px] min-w-[144px] max-w-[144px] sm:w-[210px] sm:min-w-[210px] sm:max-w-[210px]">
                      <div className="flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => onViewProfile?.(staff)}
                          title="Nhấn để xem hồ sơ nhân viên"
                          className="font-bold text-cyan-300 hover:text-cyan-200 hover:underline text-[11px] sm:text-xs truncate flex-1 min-w-0 text-left cursor-pointer"
                        >
                          {staff.fullName}
                        </button>
                        {record.isLocked ? (
                          (() => {
                            const recLockType = resolveStaffLockType(staff, record);
                            const isRegime = recLockType === 'REGIME_LEAVE';
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLockModal(staff);
                                }}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold cursor-pointer transition-colors shadow-xs shrink-0 ${
                                  isRegime
                                    ? 'bg-indigo-950/80 hover:bg-indigo-900 border-indigo-600/70 text-indigo-300'
                                    : 'bg-amber-950/80 hover:bg-amber-900 border-amber-600/70 text-amber-300'
                                }`}
                                title={
                                  isRegime
                                    ? `Nhân viên đang khóa nghỉ chế độ từ ngày ${record.lockedDay || 1}. Nhấn để cấu hình hoặc mở khóa.`
                                    : `Nhân viên đã thôi việc từ ngày ${record.lockedDay || 1}. Nhấn để cấu hình hoặc mở khóa.`
                                }
                              >
                                <Lock
                                  className={`w-2.5 h-2.5 ${isRegime ? 'text-indigo-400' : 'text-amber-400'}`}
                                />
                                <span>
                                  {isRegime
                                    ? `Nghỉ chế độ (N${record.lockedDay || 1})`
                                    : `Thôi việc (N${record.lockedDay || 1})`}
                                </span>
                              </button>
                            );
                          })()
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLockModal(staff);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                            title="Nhấn để khóa nhân viên (nghỉ chế độ / thôi việc)"
                          >
                            <Unlock className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-1">
                        <div className="text-[9px] sm:text-[10px] text-slate-400 truncate flex-1 min-w-0">
                          <span className="hidden sm:inline">{staff.position} · </span>
                          <span className={staff.shift === 'DAY' ? 'text-amber-400 font-semibold' : 'text-purple-400 font-semibold'}>
                            {staff.shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickTimekeepingClick(staff);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-teal-950/70 hover:bg-teal-900/80 text-teal-300 border border-teal-700/60 text-[9px] sm:text-[10px] font-semibold cursor-pointer transition-colors shrink-0"
                        >
                          <Clock className="w-2.5 h-2.5" />
                          <span>Chấm công</span>
                        </button>
                      </div>
                    </td>

                    {/* STT (scrolls under Tên Nhân Viên) */}
                    <td className="py-2.5 px-2 border-r border-slate-800 text-center font-mono text-slate-400 text-xs">
                      {idx + 1}
                    </td>

                    {/* Mã NV (scrolls under Tên Nhân Viên) */}
                    <td
                      onClick={() => onViewProfile?.(staff)}
                      title="Nhấn để xem hồ sơ nhân viên"
                      className="py-2.5 px-2.5 border-r border-slate-800 font-mono text-cyan-400 hover:text-cyan-200 hover:underline font-semibold text-xs cursor-pointer whitespace-nowrap"
                    >
                      {staff.employeeId}
                    </td>

                    {/* Tổng Giờ Làm */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-800 font-mono font-bold text-emerald-400 bg-emerald-950/20 text-xs">
                      {record.totalWorkHours}h
                    </td>

                    {/* TC Ngày */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-800 font-mono font-bold text-amber-400 bg-amber-950/15 text-xs">
                      {record.totalDayOt > 0 ? `${record.totalDayOt}h` : '—'}
                    </td>

                    {/* TC Đêm */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-800 font-mono font-bold text-purple-400 bg-purple-950/15 text-xs">
                      {record.totalNightOt > 0 ? `${record.totalNightOt}h` : '—'}
                    </td>

                    {/* Ngày CN */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-800 font-mono font-bold text-pink-400 bg-pink-950/15 text-xs">
                      {(record.totalSundayDayHours ?? record.totalSundayOt ?? 0) > 0
                        ? `${record.totalSundayDayHours ?? record.totalSundayOt}h`
                        : '—'}
                    </td>

                    {/* Đêm CN */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-800 font-mono font-bold text-fuchsia-400 bg-fuchsia-950/15 text-xs">
                      {(record.totalSundayNightHours || 0) > 0 ? `${record.totalSundayNightHours}h` : '—'}
                    </td>

                    {/* Ngày Lễ */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-800 font-mono font-bold text-red-400 bg-red-950/20 text-xs">
                      {(record.totalHolidayDayHours ?? (staff.shift === 'NIGHT' ? 0 : record.totalHolidayOt ?? 0)) > 0
                        ? `${record.totalHolidayDayHours ?? record.totalHolidayOt}h`
                        : '—'}
                    </td>

                    {/* TC Đêm Lễ */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-700 font-mono font-bold text-orange-400 bg-orange-950/20 text-xs">
                      {(record.totalHolidayNightHours ?? (staff.shift === 'NIGHT' ? record.totalHolidayOt ?? 0 : 0)) > 0
                        ? `${record.totalHolidayNightHours ?? record.totalHolidayOt}h`
                        : '—'}
                    </td>

                    {/* Day Cells */}
                    {monthDaysMeta.map((m) => {
                      const rawEntry = days[m.day];
                      const isBeforeJoin = isDayBeforeJoinDate(
                        selectedYear,
                        selectedMonth,
                        m.day,
                        staff.dateJoined
                      );
                      const hideAsBeforeJoin = isBeforeJoin && !hasMatrixRealData(rawEntry);
                      const recLockType = resolveStaffLockType(staff, record);
                      const isAfterLockedDay = Boolean(
                        record?.isLocked && record?.lockedDay !== undefined && m.day >= record.lockedDay
                      );
                      const isRegimeLeave = Boolean(
                        !hideAsBeforeJoin &&
                          ((isAfterLockedDay && recLockType === 'REGIME_LEAVE') ||
                            (rawEntry?.status as string) === 'Nghỉ chế độ')
                      );
                      const isResigned = Boolean(
                        !hideAsBeforeJoin &&
                          !isRegimeLeave &&
                          ((isAfterLockedDay && recLockType !== 'REGIME_LEAVE') ||
                            rawEntry?.status === 'Đã nghỉ việc' ||
                            (rawEntry?.status as string) === 'Đã thôi việc')
                      );

                      const entry: MatrixDayTimeEntry = rawEntry || {
                        day: m.day,
                        shift: staff.shift,
                        regularHours: 0,
                        otDayHours: 0,
                        otNightHours: 0,
                        otSundayHours: 0,
                        otSundayNightHours: 0,
                        otHolidayHours: 0,
                        otHolidayNightHours: 0,
                        isHoliday: m.isHoliday,
                        status: (hideAsBeforeJoin || isResigned || isRegimeLeave
                          ? ''
                          : m.isHoliday
                          ? 'Nghỉ lễ'
                          : m.isSunday
                          ? 'Nghỉ chủ nhật'
                          : 'Đúng giờ') as AttendanceStatus,
                      };

                      const isHolidayCell = Boolean(m.isHoliday || entry.isHoliday);
                      const isSunday = m.isSunday;
                      const otDay = entry.otDayHours || 0;
                      const otNight = entry.otNightHours || 0;
                      const sunDay = entry.otSundayHours || 0;
                      const sunNight = entry.otSundayNightHours || 0;
                      const holDay = entry.otHolidayHours || 0;
                      const holNight = entry.otHolidayNightHours || 0;
                      const totalHours = getEntryTotalHours(entry);
                      const isLeave =
                        entry.status === 'Nghỉ phép' ||
                        entry.status === 'Nghỉ cưới' ||
                        entry.status === 'Nghỉ tang' ||
                        entry.status === 'FAMILY' ||
                        entry.status === 'Nghỉ ốm' ||
                        entry.status === 'Vắng mặt' ||
                        entry.status === 'Nghỉ KL';

                      return (
                        <td
                          key={m.day}
                          onClick={() => openEditCell(staff, m)}
                          className={`py-1.5 px-1.5 text-center border-r border-slate-800/80 cursor-pointer transition-colors relative hover:ring-1 hover:ring-cyan-400 ${
                            hideAsBeforeJoin
                              ? 'bg-slate-950/70 hover:bg-slate-900/60'
                              : isRegimeLeave
                              ? 'bg-indigo-950/30 hover:bg-indigo-900/40'
                              : isResigned
                              ? 'bg-slate-950/60 hover:bg-slate-900/60'
                              : isHolidayCell
                              ? 'bg-red-950/25 hover:bg-red-950/45'
                              : isSunday
                              ? 'bg-rose-950/20 hover:bg-rose-950/40'
                              : m.isSaturday
                              ? 'bg-amber-950/10 hover:bg-amber-950/30'
                              : 'hover:bg-slate-800'
                          }`}
                          title={
                            hideAsBeforeJoin
                              ? `${staff.fullName} - Chưa vào làm (vào làm từ ${staff.dateJoined})`
                              : isRegimeLeave
                              ? `${staff.fullName} - Nghỉ chế độ từ ngày ${record?.lockedDay || m.day}`
                              : isResigned
                              ? `${staff.fullName} - Đã thôi việc từ ngày ${record?.lockedDay || m.day}`
                              : `Kích để sửa: ${staff.fullName} - Ngày ${m.day}/${selectedMonth} (${
                                  isHolidayCell ? 'Ngày Lễ' : m.dayOfWeek
                                })`
                          }
                        >
                          {hideAsBeforeJoin ? (
                            <div className="text-[10px] font-mono py-1 select-none">&nbsp;</div>
                          ) : isRegimeLeave ? (
                            isSunday || isHolidayCell ? (
                              <div className="text-[10px] font-mono py-1 select-none">&nbsp;</div>
                            ) : (
                              <div className="py-0.5">
                                <span className="px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-600/50 font-mono text-[9px] font-semibold whitespace-nowrap">
                                  Nghỉ chế độ
                                </span>
                              </div>
                            )
                          ) : isResigned ? (
                            isSunday || isHolidayCell ? (
                              <div className="text-[10px] font-mono py-1 select-none">&nbsp;</div>
                            ) : (
                              <div className="py-0.5">
                                <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-700/50 font-mono text-[9px] font-semibold whitespace-nowrap">
                                  Đã thôi việc
                                </span>
                              </div>
                            )
                          ) : isLeave && totalHours === 0 ? (
                            <div className="space-y-0.5">
                              <div className="font-mono text-[10px] text-sky-400 font-bold">
                                {entry.status === 'Nghỉ phép'
                                  ? 'Phép'
                                  : entry.status === 'Nghỉ cưới'
                                  ? 'Cưới'
                                  : entry.status === 'Nghỉ tang'
                                  ? 'Tang'
                                  : entry.status}
                              </div>
                              <div className="flex justify-center">
                                <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono text-[9px] font-semibold">
                                  {entry.status === 'FAMILY' ? 'Hiếu hỷ' : entry.status}
                                </span>
                              </div>
                            </div>
                          ) : entry.inTime || entry.outTime || totalHours > 0 ? (
                            <div className="space-y-0.5">
                              {/* Top Line */}
                              {isHolidayCell ? (
                                <div className="font-mono text-[10px] text-red-300 font-bold">
                                  {entry.inTime && entry.outTime ? `${entry.inTime} - ${entry.outTime}` : 'NGÀY LỄ'}
                                </div>
                              ) : isSunday ? (
                                entry.inTime || entry.outTime ? (
                                  <div className="font-mono text-[10px] text-slate-200 font-medium">
                                    <span className={entry.status === 'Đi muộn' ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                                      {entry.inTime || '--:--'}
                                    </span>
                                    <span className="text-slate-500 mx-0.5">-</span>
                                    <span className={entry.status === 'Về sớm' ? 'text-teal-300 font-bold' : 'text-slate-200'}>
                                      {entry.outTime || '--:--'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="font-mono text-[10px] text-rose-400 font-bold">CN</div>
                                )
                              ) : (
                                <div className="font-mono text-[10px] text-slate-200 font-medium">
                                  <span className={entry.status === 'Đi muộn' ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                                    {entry.inTime || '--:--'}
                                  </span>
                                  <span className="text-slate-500 mx-0.5">-</span>
                                  <span className={entry.status === 'Về sớm' ? 'text-teal-300 font-bold' : 'text-slate-200'}>
                                    {entry.outTime || '--:--'}
                                  </span>
                                </div>
                              )}

                              {/* Bottom Tag */}
                              <div className="flex items-center justify-center flex-wrap gap-1 font-mono text-[9px]">
                                {holDay > 0 || holNight > 0 ? (
                                  <>
                                    {holDay > 0 && (
                                      <span className="px-1.5 rounded font-bold bg-red-500/30 text-red-200 border border-red-500/50">
                                        +{holDay}h Ngày Lễ
                                      </span>
                                    )}
                                    {holNight > 0 && (
                                      <span className="px-1.5 rounded font-bold bg-orange-500/30 text-orange-200 border border-orange-500/50">
                                        +{holNight}h Đêm Lễ
                                      </span>
                                    )}
                                  </>
                                ) : entry.status === 'Đi muộn' && entry.inTime ? (
                                  <span className="px-1.5 rounded font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40">
                                    Vào: {entry.inTime}
                                  </span>
                                ) : entry.status === 'Về sớm' && entry.inTime ? (
                                  <span className="px-1.5 rounded font-bold bg-teal-500/25 text-teal-300 border border-teal-500/40">
                                    SỚM: {entry.inTime}
                                  </span>
                                ) : sunDay > 0 ? (
                                  <span className="px-1.5 rounded font-bold bg-pink-500/25 text-pink-200 border border-pink-500/40">
                                    +{sunDay}h Ngày CN
                                  </span>
                                ) : sunNight > 0 ? (
                                  <span className="px-1.5 rounded font-bold bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-500/40">
                                    +{sunNight}h Đêm CN
                                  </span>
                                ) : otNight > 0 ? (
                                  <span className="px-1.5 rounded font-bold bg-purple-500/30 text-purple-200 border border-purple-500/40">
                                    +{otNight}h TC Đêm
                                  </span>
                                ) : otDay > 0 ? (
                                  <span className="px-1.5 rounded font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40">
                                    +{otDay}h TC
                                  </span>
                                ) : entry.status === 'Nghỉ phép' ? (
                                  <span className="px-1.5 rounded font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                                    Nửa phép · {entry.regularHours || 4}h
                                  </span>
                                ) : (
                                  <span className="px-1.5 rounded font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                                    {entry.regularHours || 8}h công
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500 font-mono py-1">
                              {isHolidayCell ? (
                                <div className="space-y-0.5">
                                  <div className="text-red-400 font-bold">Nghỉ lễ</div>
                                  <div className="text-[9px] text-slate-500">-</div>
                                </div>
                              ) : isSunday ? (
                                <div className="space-y-0.5">
                                  <div className="text-rose-400 font-bold">CN</div>
                                </div>
                              ) : (
                                '·'
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>

            {/* 3 Footer Summary Rows: Day Shift / Night Shift / Total Working Staff per Day */}
            <tfoot className="sticky bottom-0 z-30 bg-slate-950 border-t-2 border-slate-700 font-mono text-xs shadow-2xl">
              {/* Row 1: SỐ NV ĐI LÀM CA NGÀY */}
              <tr className="border-b border-slate-800/80 bg-slate-950">
                <td
                  colSpan={1}
                  className="py-2 px-2 sm:px-3 sticky left-0 z-40 bg-slate-950 border-r border-slate-700 shadow-[4px_0_12px_rgba(0,0,0,0.75)] font-sans font-bold text-[10px] sm:text-[11px] text-amber-300 uppercase"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="leading-tight">Số NV Đi Làm Ca Ngày</span>
                  </div>
                </td>
                <td colSpan={9} className="py-2 px-2 bg-slate-950 border-r border-slate-700 text-center text-[10px] text-slate-500">
                  Ca Ngày / ngày
                </td>
                {monthDaysMeta.map((m) => {
                  const cnt = dailyHeadcount[m.day]?.dayCount || 0;
                  return (
                    <td
                      key={`cnt_day_${m.day}`}
                      className={`py-2 px-1 text-center border-r border-slate-800 font-bold ${
                        m.isHoliday ? 'bg-red-950/30' : m.isSunday ? 'bg-rose-950/20' : 'bg-slate-950'
                      } ${cnt > 0 ? 'text-amber-400' : 'text-slate-600'}`}
                    >
                      {cnt > 0 ? cnt : '-'}
                    </td>
                  );
                })}
              </tr>

              {/* Row 2: SỐ NV ĐI LÀM CA ĐÊM */}
              <tr className="border-b border-slate-800/80 bg-slate-950">
                <td
                  colSpan={1}
                  className="py-2 px-2 sm:px-3 sticky left-0 z-40 bg-slate-950 border-r border-slate-700 shadow-[4px_0_12px_rgba(0,0,0,0.75)] font-sans font-bold text-[10px] sm:text-[11px] text-purple-300 uppercase"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Moon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="leading-tight">Số NV Đi Làm Ca Đêm</span>
                  </div>
                </td>
                <td colSpan={9} className="py-2 px-2 bg-slate-950 border-r border-slate-700 text-center text-[10px] text-slate-500">
                  Ca Đêm / ngày
                </td>
                {monthDaysMeta.map((m) => {
                  const cnt = dailyHeadcount[m.day]?.nightCount || 0;
                  return (
                    <td
                      key={`cnt_night_${m.day}`}
                      className={`py-2 px-1 text-center border-r border-slate-800 font-bold ${
                        m.isHoliday ? 'bg-red-950/30' : m.isSunday ? 'bg-rose-950/20' : 'bg-slate-950'
                      } ${cnt > 0 ? 'text-purple-400' : 'text-slate-600'}`}
                    >
                      {cnt > 0 ? cnt : '-'}
                    </td>
                  );
                })}
              </tr>

              {/* Row 3: TỔNG NV ĐI LÀM TRONG NGÀY */}
              <tr className="bg-slate-950">
                <td
                  colSpan={1}
                  className="py-2.5 px-2 sm:px-3 sticky left-0 z-40 bg-slate-950 border-r border-slate-700 shadow-[4px_0_12px_rgba(0,0,0,0.75)] font-sans font-bold text-[10px] sm:text-[11px] text-teal-300 uppercase"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Users className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="leading-tight">
                      <span className="sm:hidden">Tổng NV Đi Làm</span>
                      <span className="hidden sm:inline">Tổng NV Đi Làm Trong Ngày</span>
                    </span>
                  </div>
                </td>
                <td colSpan={9} className="py-2.5 px-2 bg-slate-950 border-r border-slate-700 text-center text-[10px] text-teal-400/80 font-bold">
                  Tổng quân số
                </td>
                {monthDaysMeta.map((m) => {
                  const total = dailyHeadcount[m.day]?.totalCount || 0;
                  return (
                    <td
                      key={`cnt_total_${m.day}`}
                      className={`py-2 px-1 text-center border-r border-slate-800 ${
                        m.isHoliday ? 'bg-red-950/30' : m.isSunday ? 'bg-rose-950/20' : 'bg-slate-950'
                      }`}
                    >
                      {total > 0 ? (
                        <span className="inline-block min-w-[26px] px-1.5 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-600/60 font-bold text-xs">
                          {total}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend & Instructions Footer */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Chú Thích Màu:</span>
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
            <span>Giờ công chuẩn (8h)</span>
          </span>
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Tăng ca ngày (Thứ 2 - Thứ 7)</span>
          </span>
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            <span>Tăng ca đêm (Ca Đêm / sau 22h)</span>
          </span>
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
            <span>Tăng ca Chủ Nhật (CN)</span>
          </span>
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-red-300 font-medium">Ngày Lễ</span>
          </span>
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
            <span className="text-orange-300 font-medium">TC Đêm Lễ</span>
          </span>
        </div>

        <div className="text-[11px] text-cyan-400 font-medium italic">
          * Kích chuột vào tiêu đề ngày (NGÀY 1..{daysInMonth}) để chọn/hủy Ngày Lễ · Kích vào ô ngày để sửa giờ vào/ra & tăng ca.
        </div>
      </div>
        </>
      )}

      {/* Day Header Modal: Chọn Ngày Lễ / Ngày Thường */}
      {dayTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-4 sm:p-5 space-y-4 text-xs shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center font-bold font-mono text-sm ${
                    dayTypeModal.isHoliday
                      ? 'bg-red-600/20 border-red-500/50 text-red-300'
                      : 'bg-cyan-600/20 border-cyan-500/40 text-cyan-300'
                  }`}
                >
                  {dayTypeModal.day}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Phân Loại Ngày {dayTypeModal.fullDateStr}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    Thứ: {dayTypeModal.dayOfWeek} · Hiện tại:{' '}
                    <span className={dayTypeModal.isHoliday ? 'text-red-400 font-bold' : 'text-cyan-400 font-bold'}>
                      {dayTypeModal.isHoliday ? 'NGÀY LỄ' : dayTypeModal.isSunday ? 'CHỦ NHẬT (NGÀY THƯỜNG)' : 'NGÀY THƯỜNG'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setDayTypeModal(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Chọn chế độ cho <strong className="text-white">Ngày {dayTypeModal.day}/{selectedMonth}/{selectedYear}</strong>:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => applyDayClassificationToColumn(dayTypeModal.day, dayTypeModal.isSunday, false)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  !dayTypeModal.isHoliday
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-cyan-400" />
                  <span>Ngày Thường</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Tính giờ công chuẩn, TC ngày/đêm hoặc Chủ Nhật bình thường.
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyDayClassificationToColumn(dayTypeModal.day, dayTypeModal.isSunday, true)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  dayTypeModal.isHoliday
                    ? 'bg-red-950/70 border-red-500 text-red-200 ring-1 ring-red-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-red-700/70'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5 text-red-300">
                  <CalendarHeart className="w-4 h-4 text-red-400" />
                  <span>Ngày Lễ</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Tự động phân loại ca ngày vào <span className="text-red-300 font-semibold">Ngày Lễ</span> &amp; ca đêm vào{' '}
                  <span className="text-orange-300 font-semibold">TC Đêm Lễ</span>.
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDayTypeModal(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Cell Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-4 sm:p-5 space-y-4 text-xs shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center font-bold font-mono ${
                    editingCell.entry.isHoliday
                      ? 'bg-red-600/20 border-red-500/40 text-red-300'
                      : 'bg-cyan-600/20 border-cyan-500/40 text-cyan-400'
                  }`}
                >
                  {editingCell.day}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{editingCell.staff.fullName}</h3>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Ngày {editingCell.dateStr} ({editingCell.dayOfWeek}) · Mã: {editingCell.staff.employeeId}
                  </div>
                </div>
              </div>
              <button onClick={() => setEditingCell(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveModalEdit(editingCell.entry);
              }}
              className="space-y-3.5"
            >
              {/* Day Classification Selector: Ngày Thường vs Ngày Lễ */}
              <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200">Loại Ngày (Ngày Thường / Ngày Lễ):</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      editingCell.entry.isHoliday
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {editingCell.entry.isHoliday ? 'Đang chọn: NGÀY LỄ' : 'Đang chọn: NGÀY THƯỜNG'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCellModalDayTypeChange(false)}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      !editingCell.entry.isHoliday
                        ? 'bg-cyan-600/25 border-cyan-500 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Ngày Thường</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCellModalDayTypeChange(true)}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      editingCell.entry.isHoliday
                        ? 'bg-red-600/30 border-red-500 text-red-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-red-300'
                    }`}
                  >
                    <CalendarHeart className="w-3.5 h-3.5" />
                    <span>Ngày Lễ</span>
                  </button>
                </div>

                <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={editingCell.applyDayTypeToColumn}
                    onChange={(e) =>
                      setEditingCell({ ...editingCell, applyDayTypeToColumn: e.target.checked })
                    }
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500"
                  />
                  <span>Áp dụng loại ngày (Ngày Lễ / Ngày Thường) cho toàn bộ Ngày {editingCell.day}/{selectedMonth}</span>
                </label>
              </div>

              {/* Dữ liệu tham chiếu từ Máy Quẹt Thẻ, Quét QR & Khuôn Mặt (nếu có) */}
              {(() => {
                const punchKey = `${editingCell.staff.employeeId.trim().toLowerCase()}_${editingCell.day}`;
                const qrRec = qrPunchRecords[punchKey];
                const faceRec = facePunchRecords[punchKey];
                const mqtRec = swipeRecords[punchKey];
                if (!qrRec && !faceRec && !mqtRec) return null;
                return (
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-[11px]">
                    <div className="text-[10px] font-bold uppercase text-slate-400">
                      Dữ liệu ghi nhận để đối chiếu / áp dụng nhanh:
                    </div>
                    {qrRec && (qrRec.rawInTime || qrRec.rawOutTime) && (
                      <button
                        type="button"
                        onClick={() => {
                          const defIn = editingCell.entry.shift === 'NIGHT' ? '20:00' : '08:00';
                          const defOut = editingCell.entry.shift === 'NIGHT' ? '05:00' : '17:00';
                          handleTimeOrShiftChange({
                            inTime: normalizeTimeString(qrRec.rawInTime) || defIn,
                            outTime: normalizeTimeString(qrRec.rawOutTime) || defOut,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-600/40 text-cyan-300 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                          <span>
                            <strong>Giờ Quét QR:</strong>{' '}
                            <span className="font-mono">{qrRec.rawInTime || '--:--'} - {qrRec.rawOutTime || '--:--'}</span>
                          </span>
                        </span>
                        <span className="text-[10px] underline">Lấy vào BC</span>
                      </button>
                    )}
                    {faceRec && (faceRec.rawInTime || faceRec.rawOutTime) && (
                      <button
                        type="button"
                        onClick={() => {
                          const defIn = editingCell.entry.shift === 'NIGHT' ? '20:00' : '08:00';
                          const defOut = editingCell.entry.shift === 'NIGHT' ? '05:00' : '17:00';
                          handleTimeOrShiftChange({
                            inTime: normalizeTimeString(faceRec.rawInTime) || defIn,
                            outTime: normalizeTimeString(faceRec.rawOutTime) || defOut,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-sky-950/40 hover:bg-sky-950/80 border border-sky-600/40 text-sky-300 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <ScanFace className="w-3.5 h-3.5 text-sky-400" />
                          <span>
                            <strong>Giờ Khuôn Mặt:</strong>{' '}
                            <span className="font-mono">{faceRec.rawInTime || '--:--'} - {faceRec.rawOutTime || '--:--'}</span>
                          </span>
                        </span>
                        <span className="text-[10px] underline">Lấy vào BC</span>
                      </button>
                    )}
                    {mqtRec && (mqtRec.rawInTime || mqtRec.rawOutTime) && (
                      <button
                        type="button"
                        onClick={() => {
                          const defIn = editingCell.entry.shift === 'NIGHT' ? '20:00' : '08:00';
                          const defOut = editingCell.entry.shift === 'NIGHT' ? '05:00' : '17:00';
                          handleTimeOrShiftChange({
                            inTime: normalizeTimeString(mqtRec.rawInTime) || defIn,
                            outTime: normalizeTimeString(mqtRec.rawOutTime) || defOut,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-blue-950/40 hover:bg-blue-950/80 border border-blue-600/40 text-blue-300 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span>
                          <strong>Máy Quẹt Thẻ:</strong>{' '}
                          <span className="font-mono">{mqtRec.rawInTime || '--:--'} - {mqtRec.rawOutTime || '--:--'}</span>
                        </span>
                        <span className="text-[10px] underline">Lấy vào BC</span>
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Check-in & Check-out Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thời Gian Vào (In)</label>
                  <input
                    type="time"
                    value={editingCell.entry.inTime || ''}
                    onChange={(e) => handleTimeOrShiftChange({ inTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-sm focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thời Gian Ra (Out)</label>
                  <input
                    type="time"
                    value={editingCell.entry.outTime || ''}
                    onChange={(e) => handleTimeOrShiftChange({ outTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-sm focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Ca làm việc & Giờ làm chuẩn */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Ca Làm Việc</label>
                  <select
                    value={
                      (editingCell.entry.shift || editingCell.staff.shift) === 'NIGHT'
                        ? editingCell.entry.outTime === '05:00' && (editingCell.entry.otNightHours || 0) === 0
                          ? 'NIGHT_NORMAL'
                          : 'NIGHT_OT'
                        : editingCell.entry.outTime === '20:00' || (editingCell.entry.otDayHours || 0) > 0
                        ? 'DAY_OT'
                        : 'DAY_NORMAL'
                    }
                    onChange={(e) =>
                      handleTimeOrShiftChange({ presetKey: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-semibold focus:border-cyan-500 focus:outline-hidden"
                  >
                    <option value="DAY_NORMAL">Ca ngày (8:00~17:00)</option>
                    <option value="DAY_OT">Ca ngày (8:00~20:00)+3h</option>
                    <option value="NIGHT_NORMAL">Ca đêm (20:00~5:00)</option>
                    <option value="NIGHT_OT">Ca đêm (20:00~8:00)+3h</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Giờ Làm Chuẩn (Tối đa 8h)</label>
                  <input
                    type="number"
                    min={0}
                    max={8}
                    step={0.5}
                    value={editingCell.entry.regularHours ?? 0}
                    onChange={(e) =>
                      setEditingCell({
                        ...editingCell,
                        entry: { ...editingCell.entry, regularHours: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Breakdown Overtime Inputs: TC Ngày, TC Đêm, Ngày CN, Đêm CN, Ngày Lễ, TC Đêm Lễ */}
              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg space-y-2.5">
                <div className="text-[11px] font-bold text-cyan-300 flex items-center justify-between">
                  <span>Phân Loại Giờ Tăng Ca / Chủ Nhật / Ngày Lễ:</span>
                  {editingCell.dayOfWeek === 'CN' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                      Chủ Nhật
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <div>
                    <label className="text-[10px] text-amber-300 block mb-0.5">TC Ngày:</label>
                    <input
                      type="number"
                      min={0}
                      max={16}
                      step={0.5}
                      value={editingCell.entry.otDayHours || ''}
                      onChange={(e) =>
                        setEditingCell({
                          ...editingCell,
                          entry: { ...editingCell.entry, otDayHours: Number(e.target.value) },
                        })
                      }
                      placeholder="0"
                      className="w-full bg-slate-900 border border-amber-700/60 rounded p-1.5 text-xs text-amber-200 font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-purple-300 block mb-0.5">TC Đêm:</label>
                    <input
                      type="number"
                      min={0}
                      max={16}
                      step={0.5}
                      value={editingCell.entry.otNightHours || ''}
                      onChange={(e) =>
                        setEditingCell({
                          ...editingCell,
                          entry: { ...editingCell.entry, otNightHours: Number(e.target.value) },
                        })
                      }
                      placeholder="0"
                      className="w-full bg-slate-900 border border-purple-700/60 rounded p-1.5 text-xs text-purple-200 font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-pink-300 block mb-0.5">Ngày CN:</label>
                    <input
                      type="number"
                      min={0}
                      max={16}
                      step={0.5}
                      value={editingCell.entry.otSundayHours || ''}
                      onChange={(e) =>
                        setEditingCell({
                          ...editingCell,
                          entry: { ...editingCell.entry, otSundayHours: Number(e.target.value) },
                        })
                      }
                      placeholder="0"
                      className="w-full bg-slate-900 border border-pink-700/60 rounded p-1.5 text-xs text-pink-200 font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-fuchsia-300 block mb-0.5">Đêm CN:</label>
                    <input
                      type="number"
                      min={0}
                      max={16}
                      step={0.5}
                      value={editingCell.entry.otSundayNightHours || ''}
                      onChange={(e) =>
                        setEditingCell({
                          ...editingCell,
                          entry: { ...editingCell.entry, otSundayNightHours: Number(e.target.value) },
                        })
                      }
                      placeholder="0"
                      className="w-full bg-slate-900 border border-fuchsia-700/60 rounded p-1.5 text-xs text-fuchsia-200 font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-red-300 block mb-0.5 font-bold">Ngày Lễ:</label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={editingCell.entry.otHolidayHours || ''}
                      onChange={(e) =>
                        setEditingCell({
                          ...editingCell,
                          entry: { ...editingCell.entry, otHolidayHours: Number(e.target.value) },
                        })
                      }
                      placeholder="0"
                      className="w-full bg-slate-900 border border-red-700/60 rounded p-1.5 text-xs text-red-200 font-mono text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-orange-300 block mb-0.5 font-bold">Đêm Lễ:</label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={editingCell.entry.otHolidayNightHours || ''}
                      onChange={(e) =>
                        setEditingCell({
                          ...editingCell,
                          entry: { ...editingCell.entry, otHolidayNightHours: Number(e.target.value) },
                        })
                      }
                      placeholder="0"
                      className="w-full bg-slate-900 border border-orange-700/60 rounded p-1.5 text-xs text-orange-200 font-mono text-center font-bold"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[9px] text-slate-400">Chọn nhanh:</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleTimeOrShiftChange({
                        isHoliday: false,
                        inTime: '08:00',
                        outTime: '17:00',
                        shift: 'DAY',
                        status: 'Đúng giờ',
                      })
                    }
                    className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    Ca ngày (8:00~17:00)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleTimeOrShiftChange({
                        isHoliday: false,
                        inTime: '08:00',
                        outTime: '20:00',
                        shift: 'DAY',
                        status: 'Đúng giờ',
                      })
                    }
                    className="px-2 py-0.5 rounded text-[9px] font-semibold bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/40 cursor-pointer"
                  >
                    Ca ngày (8:00~20:00)+3h
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleTimeOrShiftChange({
                        isHoliday: false,
                        inTime: '20:00',
                        outTime: '05:00',
                        shift: 'NIGHT',
                        status: 'Đúng giờ',
                      })
                    }
                    className="px-2 py-0.5 rounded text-[9px] font-semibold bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/40 cursor-pointer"
                  >
                    Ca đêm (20:00~5:00)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleTimeOrShiftChange({
                        isHoliday: false,
                        inTime: '20:00',
                        outTime: '08:00',
                        shift: 'NIGHT',
                        status: 'Đúng giờ',
                      })
                    }
                    className="px-2 py-0.5 rounded text-[9px] font-semibold bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800/40 cursor-pointer"
                  >
                    Ca đêm (20:00~8:00)+3h
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingCell({
                        ...editingCell,
                        entry: {
                          ...editingCell.entry,
                          isHoliday: false,
                          shift: 'DAY',
                          inTime: '08:00',
                          outTime: '20:00',
                          regularHours: 0,
                          otDayHours: 0,
                          otNightHours: 0,
                          otSundayHours: 11,
                          otSundayNightHours: 0,
                          otHolidayHours: 0,
                          otHolidayNightHours: 0,
                          status: 'Đúng giờ',
                        },
                      })
                    }
                    className="px-1.5 py-0.5 rounded text-[9px] bg-pink-950 hover:bg-pink-900 text-pink-300 border border-pink-800/40 cursor-pointer"
                  >
                    +11h Ngày CN
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingCell({
                        ...editingCell,
                        entry: {
                          ...editingCell.entry,
                          isHoliday: false,
                          shift: 'NIGHT',
                          inTime: '20:00',
                          outTime: '08:00',
                          regularHours: 0,
                          otDayHours: 0,
                          otNightHours: 0,
                          otSundayHours: 0,
                          otSundayNightHours: 11,
                          otHolidayHours: 0,
                          otHolidayNightHours: 0,
                          status: 'Đúng giờ',
                        },
                      })
                    }
                    className="px-1.5 py-0.5 rounded text-[9px] bg-fuchsia-950 hover:bg-fuchsia-900 text-fuchsia-300 border border-fuchsia-800/40 cursor-pointer"
                  >
                    +11h Đêm CN
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingCell({
                        ...editingCell,
                        entry: {
                          ...editingCell.entry,
                          isHoliday: true,
                          shift: 'DAY',
                          inTime: '08:00',
                          outTime: '20:00',
                          regularHours: 0,
                          otDayHours: 0,
                          otNightHours: 0,
                          otSundayHours: 0,
                          otSundayNightHours: 0,
                          otHolidayHours: 11,
                          otHolidayNightHours: 0,
                          status: 'Đúng giờ',
                        },
                      })
                    }
                    className="px-1.5 py-0.5 rounded text-[9px] bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/50 cursor-pointer"
                  >
                    +11h Ngày Lễ
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingCell({
                        ...editingCell,
                        entry: {
                          ...editingCell.entry,
                          isHoliday: true,
                          shift: 'NIGHT',
                          inTime: '20:00',
                          outTime: '08:00',
                          regularHours: 0,
                          otDayHours: 0,
                          otNightHours: 0,
                          otSundayHours: 0,
                          otSundayNightHours: 0,
                          otHolidayHours: 0,
                          otHolidayNightHours: 11,
                          status: 'Đúng giờ',
                        },
                      })
                    }
                    className="px-1.5 py-0.5 rounded text-[9px] bg-orange-950 hover:bg-orange-900 text-orange-300 border border-orange-800/50 cursor-pointer"
                  >
                    +11h Đêm Lễ
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingCell({
                        ...editingCell,
                        entry: {
                          ...editingCell.entry,
                          inTime: '',
                          outTime: '',
                          regularHours: 0,
                          otDayHours: 0,
                          otNightHours: 0,
                          otSundayHours: 0,
                          otSundayNightHours: 0,
                          otHolidayHours: 0,
                          otHolidayNightHours: 0,
                          status: editingCell.entry.isHoliday
                            ? 'Nghỉ lễ'
                            : editingCell.dayOfWeek === 'CN'
                            ? 'Nghỉ chủ nhật'
                            : 'Nghỉ phép',
                        },
                      })
                    }
                    className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 hover:bg-slate-700 text-rose-300 cursor-pointer"
                  >
                    Nghỉ ngày này
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const st = editingCell.staff;
                      const d = editingCell.day;
                      setEditingCell(null);
                      openLockModal(st, d);
                    }}
                    className="px-2 py-0.5 rounded text-[9px] bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-600/70 font-bold flex items-center gap-1 cursor-pointer"
                    title="Mở hộp thoại chọn Khóa nghỉ chế độ hoặc Khóa thôi việc từ ngày này"
                  >
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>Khóa nhân viên từ N{editingCell.day}</span>
                  </button>
                </div>
              </div>

              {/* Attendance Status */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Trạng Thái Điểm Danh</label>
                <select
                  value={editingCell.entry.status || 'Đúng giờ'}
                  onChange={(e) =>
                    setEditingCell({
                      ...editingCell,
                      entry: { ...editingCell.entry, status: e.target.value as AttendanceStatus },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-semibold"
                >
                  <option value="Đúng giờ">Đúng giờ</option>
                  <option value="Đi muộn">Đi muộn</option>
                  <option value="Về sớm">Về sớm</option>
                  <option value="Nghỉ phép">Nghỉ phép</option>
                  <option value="Nghỉ cưới">Nghỉ phép cưới (Hiếu hỷ)</option>
                  <option value="Nghỉ tang">Nghỉ tang / Người nhà mất (Hiếu hỷ)</option>
                  <option value="Nghỉ ốm">Nghỉ ốm</option>
                  <option value="Nghỉ lễ">Nghỉ lễ</option>
                  <option value="Nghỉ chủ nhật">Nghỉ chủ nhật</option>
                  <option value="Vắng mặt">Vắng mặt</option>
                  <option value="Nghỉ chế độ">Nghỉ chế độ</option>
                  <option value="Đã nghỉ việc">Đã thôi việc (Nghỉ việc)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
                >
                  Lưu Ngày Này
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cấu Hình Khóa Nhân Viên (Nghỉ Chế Độ / Thôi Việc) */}
      <EmployeeLockModal
        isOpen={Boolean(lockModal)}
        staff={lockModal?.staff || null}
        initialLocked={Boolean(lockModal?.isLocked)}
        initialLockType={lockModal?.lockType || 'RESIGNED'}
        initialLockedDay={lockModal?.lockedDay || 1}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        daysInMonth={daysInMonth}
        departmentTitle={departmentTitle}
        onClose={() => setLockModal(null)}
        onConfirm={(shouldLock, chosenType, chosenDay) => {
          if (lockModal) {
            handleApplyLock(lockModal.staff, shouldLock, chosenType, chosenDay);
          }
        }}
      />
    </div>
  );
};
