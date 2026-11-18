import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StaffRecord,
  AttendanceRecord,
  OvertimeRecord,
  AttendanceStatus,
  MatrixDayTimeEntry,
  MatrixEmployeeTimekeeping,
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
  AlertTriangle,
  CalendarHeart,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getHolidayStorageKey,
  getMatrixEntryTotalHours,
  getMatrixStorageKey,
  isMatrixEntryWorking,
  loadOrInitDepartmentMatrix,
  recalculateStaffTotals,
  saveDepartmentMatrix,
  isDayBeforeJoinDate,
  applyJoinDateAndLockRules,
  hasMatrixRealData,
  MATRIX_UPDATED_EVENT,
} from '../../lib/matrixTimekeeping';

interface DepartmentTimekeepingMatrixProps {
  department: string;
  departmentTitle: string;
  staffList: StaffRecord[];
  allStaff?: StaffRecord[];
  attendanceHistory?: AttendanceRecord[];
  overtimeRecords?: OvertimeRecord[];
  userRole?: string;
  onViewProfile?: (staff: StaffRecord) => void;
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
  onViewProfile,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterShift, setFilterShift] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Storage keys
  const storageKey = getMatrixStorageKey(department, selectedYear, selectedMonth);
  const holidayStorageKey = getHolidayStorageKey(department, selectedYear, selectedMonth);

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

  // Modal Khóa Nhân Viên Nghỉ Việc
  const [lockModal, setLockModal] = useState<{
    staff: StaffRecord;
    isLocked: boolean;
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

  // Initialize / Load matrix data on month/year/staff change
  useEffect(() => {
    const { matrix, holidays } = loadOrInitDepartmentMatrix(
      department,
      selectedYear,
      selectedMonth,
      targetStaff,
      true
    );
    setHolidayDays(holidays);
    setMatrixData(matrix);
  }, [storageKey, targetStaff, selectedYear, selectedMonth, department]);

  // Reload if updated externally (e.g. edited from HRTimekeeping or restored from cloud sync)
  useEffect(() => {
    const onExternalMatrixUpdate = (ev: Event) => {
      if (skipNextMatrixEventRef.current) {
        skipNextMatrixEventRef.current = false;
        return;
      }
      const detail = (ev as CustomEvent<{ department?: string; year?: number; month?: number }>)?.detail;
      if (
        detail &&
        detail.year === selectedYear &&
        detail.month === selectedMonth &&
        (!detail.department ||
          detail.department.toLowerCase() === department.toLowerCase() ||
          detail.department.toLowerCase() === 'multi')
      ) {
        const { matrix, holidays } = loadOrInitDepartmentMatrix(
          department,
          selectedYear,
          selectedMonth,
          targetStaff,
          false
        );
        setHolidayDays(holidays);
        setMatrixData(matrix);
      }
    };
    window.addEventListener(MATRIX_UPDATED_EVENT, onExternalMatrixUpdate);
    return () => window.removeEventListener(MATRIX_UPDATED_EVENT, onExternalMatrixUpdate);
  }, [department, selectedYear, selectedMonth, targetStaff]);

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
        current.lockedDay
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
  const openLockModal = (staff: StaffRecord) => {
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
      current.lockedDay ||
      (selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth() + 1
        ? currentDate.getDate()
        : 12);

    setLockModal({
      staff,
      isLocked: Boolean(current.isLocked),
      lockedDay: Math.min(daysInMonth, Math.max(1, defaultDay)),
    });
  };

  // Apply or Remove Lock for Resigned Staff
  const handleApplyLock = (staff: StaffRecord, shouldLock: boolean, dayNumber: number) => {
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
      targetDay
    );
    const totals = recalculateStaffTotals(appliedDays);

    const nextMatrix = {
      ...matrixData,
      [staff.employeeId]: {
        ...current,
        isLocked: shouldLock,
        lockedDay: targetDay,
        days: appliedDays,
        ...totals,
      },
    };

    setMatrixData(nextMatrix);
    persistMatrixAndHolidays(nextMatrix, holidayDays);
    setLockModal(null);
    showToast(
      shouldLock
        ? `Đã khóa nhân viên ${staff.fullName} (nghỉ việc từ ngày ${targetDay}) thành công!`
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

      if (current.isLocked && current.lockedDay === undefined) return;

      const days = { ...current.days };
      monthDaysMeta.forEach(({ day, isSunday, isHoliday }) => {
        if (
          isDayBeforeJoinDate(selectedYear, selectedMonth, day, staff.dateJoined) &&
          !hasMatrixRealData(days[day])
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
          };
        }
      });

      const appliedDays = applyJoinDateAndLockRules(
        days,
        staff,
        selectedYear,
        selectedMonth,
        current.isLocked,
        current.lockedDay
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
    showToast('Đã tự động điền giờ công chuẩn (8h/ngày) cho nhân sự chưa khóa!');
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
      if (record.lockedDay !== undefined) {
        if (meta.day >= record.lockedDay) {
          showToast(`Nhân viên ${staff.fullName} đã nghỉ việc từ ngày ${record.lockedDay}. Không thể chấm công.`);
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
          cur.lockedDay
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const isResigned = Boolean(
          (record?.isLocked && record?.lockedDay !== undefined && m.day >= record.lockedDay) ||
          d?.status === 'Đã nghỉ việc' ||
          (d?.status as string) === 'Đã thôi việc'
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
        const hasWorkingData = !hideAsBeforeJoin && !isResigned && (hasInTime || hasOutTime || totalHours > 0);

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

          dayColMap.forEach(({ colIdx, dayNum }) => {
            const caVal = String(caRow[colIdx] || '').trim();
            const vaoVal = String(vaoRow[colIdx] || '').trim();
            const raVal = String((raRow && raRow[colIdx]) || '').trim();
            const caLower = caVal.toLowerCase();
            const vaoLower = vaoVal.toLowerCase();
            const vaoTime = normalizeTime(vaoVal);
            const raTime = normalizeTime(raVal);
            const hasTime = vaoTime.includes(':') || raTime.includes(':');

            const isResigned =
              caLower.includes('đã thôi việc') ||
              caLower.includes('đã nghỉ việc') ||
              caLower.includes('thôi việc') ||
              vaoLower.includes('thôi việc') ||
              vaoLower.includes('nghỉ việc');

            if (isResigned) {
              if (minResignedDay === undefined || dayNum < minResignedDay) {
                minResignedDay = dayNum;
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

            if (isResigned) {
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
          const appliedDays = applyJoinDateAndLockRules(
            days,
            matchedStaff,
            selectedYear,
            selectedMonth,
            isLocked,
            lockedDay
          );
          const totals = recalculateStaffTotals(appliedDays);
          nextMatrix[matchedStaff.employeeId] = {
            ...currentRec,
            isLocked,
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

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="hidden"
            />
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
          </div>
        </div>
      </div>

      {saveToast && (
        <div className="bg-emerald-950/80 border border-emerald-700/80 p-3 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLockModal(staff);
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-amber-300 text-[9px] font-bold cursor-pointer transition-colors shadow-xs shrink-0"
                            title={`Nhân viên đã nghỉ việc từ ngày ${record.lockedDay || 1}. Nhấn để cấu hình hoặc mở khóa.`}
                          >
                            <Lock className="w-2.5 h-2.5 text-amber-400" />
                            <span>Nghỉ việc (N{record.lockedDay || 1})</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLockModal(staff);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                            title="Nhấn để khóa nhân viên nghỉ việc"
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
                      const isResigned = Boolean(
                        !hideAsBeforeJoin &&
                          ((record?.isLocked &&
                            record?.lockedDay !== undefined &&
                            m.day >= record.lockedDay) ||
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
                        status: (hideAsBeforeJoin || isResigned
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
                              : isResigned
                              ? `${staff.fullName} - Đã nghỉ việc từ ngày ${record?.lockedDay || m.day}`
                              : `Kích để sửa: ${staff.fullName} - Ngày ${m.day}/${selectedMonth} (${
                                  isHolidayCell ? 'Ngày Lễ' : m.dayOfWeek
                                })`
                          }
                        >
                          {hideAsBeforeJoin ? (
                            <div className="text-[10px] font-mono py-1 select-none">&nbsp;</div>
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

              {/* Check-in & Check-out Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thời Gian Vào (In)</label>
                  <input
                    type="time"
                    value={editingCell.entry.inTime || ''}
                    onChange={(e) =>
                      setEditingCell({
                        ...editingCell,
                        entry: { ...editingCell.entry, inTime: e.target.value },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-sm focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thời Gian Ra (Out)</label>
                  <input
                    type="time"
                    value={editingCell.entry.outTime || ''}
                    onChange={(e) =>
                      setEditingCell({
                        ...editingCell,
                        entry: { ...editingCell.entry, outTime: e.target.value },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-sm focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Ca làm việc & Giờ làm chuẩn */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Ca Làm Việc</label>
                  <select
                    value={editingCell.entry.shift || editingCell.staff.shift}
                    onChange={(e) =>
                      setEditingCell({
                        ...editingCell,
                        entry: { ...editingCell.entry, shift: e.target.value as 'DAY' | 'NIGHT' },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    <option value="DAY">Ca Ngày (08:00 - 20:00)</option>
                    <option value="NIGHT">Ca Đêm (20:00 - 08:00)</option>
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
                      setEditingCell({
                        ...editingCell,
                        entry: {
                          ...editingCell.entry,
                          isHoliday: false,
                          inTime: '08:00',
                          outTime: '17:00',
                          regularHours: 8,
                          otDayHours: 0,
                          otNightHours: 0,
                          otSundayHours: 0,
                          otSundayNightHours: 0,
                          otHolidayHours: 0,
                          otHolidayNightHours: 0,
                          status: 'Đúng giờ',
                        },
                      })
                    }
                    className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    Ca chuẩn 8h
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingCell({
                        ...editingCell,
                        entry: {
                          ...editingCell.entry,
                          isHoliday: false,
                          inTime: '08:00',
                          outTime: '20:00',
                          regularHours: 8,
                          otDayHours: 3,
                          otNightHours: 0,
                          otSundayHours: 0,
                          otSundayNightHours: 0,
                          otHolidayHours: 0,
                          otHolidayNightHours: 0,
                          status: 'Đúng giờ',
                        },
                      })
                    }
                    className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/40 cursor-pointer"
                  >
                    +3h TC ngày
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
                          regularHours: 8,
                          otDayHours: 0,
                          otNightHours: 3,
                          otSundayHours: 0,
                          otSundayNightHours: 0,
                          otHolidayHours: 0,
                          otHolidayNightHours: 0,
                          status: 'Đúng giờ',
                        },
                      })
                    }
                    className="px-1.5 py-0.5 rounded text-[9px] bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800/40 cursor-pointer"
                  >
                    +3h TC đêm
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
                      handleApplyLock(editingCell.staff, true, editingCell.day);
                      setEditingCell(null);
                    }}
                    className="px-2 py-0.5 rounded text-[9px] bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-600/70 font-bold flex items-center gap-1 cursor-pointer"
                    title="Khóa toàn bộ ngày công từ ngày này trở đi (đánh dấu nghỉ việc)"
                  >
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>Khóa nghỉ việc từ N{editingCell.day}</span>
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

      {/* Modal Cấu Hình Khóa Nhân Viên Nghỉ Việc */}
      {lockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    lockModal.isLocked
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  }`}
                >
                  {lockModal.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    Khóa Nhân Viên &amp; Trạng Thái Nghỉ Việc
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tháng {selectedMonth}/{selectedYear} · {departmentTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLockModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thông tin nhân viên */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Họ và tên:</span>
                <span className="font-bold text-cyan-300 text-sm">{lockModal.staff.fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Mã nhân viên:</span>
                <span className="font-mono text-slate-200">{lockModal.staff.employeeId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Vị trí · Ca:</span>
                <span className="text-slate-300">
                  {lockModal.staff.position} · {lockModal.staff.shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Ngày vào làm:</span>
                <span className="font-mono text-slate-300">{lockModal.staff.dateJoined || 'Chưa ghi nhận'}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 font-medium">Trạng thái hiện tại:</span>
                {lockModal.isLocked ? (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[10px]">
                    ĐANG KHÓA (Nghỉ việc từ N{lockModal.lockedDay})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
                    Đang làm việc bình thường
                  </span>
                )}
              </div>
            </div>

            {/* Chọn hình thức */}
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-amber-400" />
                  <span>Chọn ngày bắt đầu nghỉ việc / khóa (1 đến {daysInMonth}):</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={daysInMonth}
                    value={lockModal.lockedDay}
                    onChange={(e) =>
                      setLockModal({
                        ...lockModal,
                        lockedDay: Math.min(daysInMonth, Math.max(1, Number(e.target.value) || 1)),
                      })
                    }
                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-center text-white font-bold text-base focus:border-amber-500 focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-400">
                    tháng {selectedMonth}/{selectedYear}
                  </span>
                </div>

                {/* Nút chọn nhanh */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 self-center">Chọn nhanh:</span>
                  {[
                    { label: 'Ngày 1', val: 1 },
                    { label: 'Ngày 10', val: 10 },
                    { label: 'Ngày 12', val: 12 },
                    { label: 'Ngày 15', val: 15 },
                    { label: 'Ngày 20', val: 20 },
                    {
                      label: `Hôm nay (N${new Date().getDate()})`,
                      val: Math.min(daysInMonth, new Date().getDate()),
                    },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setLockModal({ ...lockModal, lockedDay: preset.val })}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer transition-colors ${
                        lockModal.lockedDay === preset.val
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hộp quy tắc nghiệp vụ */}
              <div className="bg-amber-950/30 border border-amber-800/50 p-3 rounded-xl text-[11px] text-amber-200/90 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Quy tắc hiển thị &amp; bảo lưu công:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1">
                  <li>
                    <span className="text-amber-300 font-semibold">
                      Từ ngày {lockModal.lockedDay} đến hết tháng:
                    </span>{' '}
                    Khóa không cho chấm công, ngày thường hiển thị <strong>'Đã thôi việc'</strong>, Chủ Nhật để
                    trống trạng thái, không hiển thị giờ vào/ra.
                  </li>
                  <li>
                    <span className="text-emerald-300 font-semibold">Trước ngày {lockModal.lockedDay}:</span>{' '}
                    Giữ nguyên toàn bộ ngày công và giờ tăng ca thực tế đã làm.
                  </li>
                </ul>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-800">
              {lockModal.isLocked ? (
                <button
                  type="button"
                  onClick={() => handleApplyLock(lockModal.staff, false, lockModal.lockedDay)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Mở Khóa Nhân Viên</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setLockModal(null)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyLock(lockModal.staff, true, lockModal.lockedDay)}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{lockModal.isLocked ? 'Cập Nhật Ngày Khóa' : 'Khóa Nghỉ Việc'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
