import React, { useState, useEffect, useMemo } from 'react';
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
  X,
  Lock,
  Unlock,
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

  const showToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3200);
  };

  // Persist matrix + holidays and notify EmployeeProfile listeners
  const persistMatrixAndHolidays = (
    nextMatrix: Record<string, MatrixEmployeeTimekeeping>,
    nextHolidays: Record<number, boolean>
  ) => {
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
        isHoliday: false,
        status: isSunday ? 'Nghỉ chủ nhật' : 'Đúng giờ',
      };

      const shiftType = existingEntry.shift || staff.shift;
      const totalWorked = getEntryTotalHours(existingEntry);

      let updatedEntry: MatrixDayTimeEntry;

      if (makeHoliday) {
        if (totalWorked > 0) {
          updatedEntry = {
            ...existingEntry,
            isHoliday: true,
            regularHours: 0,
            otDayHours: 0,
            otNightHours: 0,
            otSundayHours: 0,
            otSundayNightHours: 0,
            otHolidayHours: Math.round(totalWorked * 10) / 10,
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
            status: isSunday ? 'Nghỉ chủ nhật' : existingEntry.status === 'Nghỉ lễ' ? 'Nghỉ phép' : existingEntry.status || 'Đúng giờ',
          };
        }
      }

      const updatedDays = { ...current.days, [day]: updatedEntry };
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
        ? `Đã đặt Ngày ${day}/${selectedMonth}/${selectedYear} là NGÀY LỄ (toàn bộ giờ làm tính vào TC Ngày Lễ).`
        : `Đã đặt Ngày ${day}/${selectedMonth}/${selectedYear} là NGÀY THƯỜNG.`
    );
  };

  // Toggle row lock
  const handleToggleLockRow = (staff: StaffRecord) => {
    const current = matrixData[staff.employeeId];
    if (!current) return;
    const nextLocked = !current.isLocked;
    const nextMatrix = {
      ...matrixData,
      [staff.employeeId]: {
        ...current,
        isLocked: nextLocked,
      },
    };
    setMatrixData(nextMatrix);
    persistMatrixAndHolidays(nextMatrix, holidayDays);
    showToast(nextLocked ? `Đã khóa bảng công của ${staff.fullName}` : `Đã mở khóa bảng công của ${staff.fullName}`);
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
        totalHolidayOt: 0,
      };

      if (current.isLocked) return;

      const days = { ...current.days };
      monthDaysMeta.forEach(({ day, isSunday, isHoliday }) => {
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
            otHolidayHours: 8,
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
            isHoliday: false,
            status: 'Nghỉ chủ nhật',
          };
        }
      });

      const totals = recalculateStaffTotals(days);
      updated[staff.employeeId] = {
        ...current,
        days,
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
    if (record?.isLocked) {
      showToast(`Hàng của ${staff.fullName} đang khóa. Nhấn biểu tượng ổ khóa bên cạnh tên để mở khóa.`);
      return;
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
      nextEntry = {
        ...entry,
        isHoliday: true,
        regularHours: 0,
        otDayHours: 0,
        otNightHours: 0,
        otSundayHours: 0,
        otSundayNightHours: 0,
        otHolidayHours: totalWorked > 0 ? Math.round(totalWorked * 10) / 10 : entry.otHolidayHours || 0,
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
          converted = {
            ...otherEntry,
            isHoliday: true,
            regularHours: 0,
            otDayHours: 0,
            otNightHours: 0,
            otSundayHours: 0,
            otSundayNightHours: 0,
            otHolidayHours: otherTotal > 0 ? Math.round(otherTotal * 10) / 10 : 0,
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
                status: otherEntry.status === 'Nghỉ lễ' ? 'Đúng giờ' : otherEntry.status,
              };
            }
          } else {
            converted = {
              ...otherEntry,
              isHoliday: false,
              otHolidayHours: 0,
              status: isSunday ? 'Nghỉ chủ nhật' : otherEntry.status === 'Nghỉ lễ' ? 'Nghỉ phép' : otherEntry.status,
            };
          }
        }
        const nextDays = { ...cur.days, [day]: converted };
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
      totalHolidayOt: 0,
    };

    const updatedDays = {
      ...currentStaffData.days,
      [day]: updatedEntry,
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

  // Overall Department Totals (7 KPI Cards)
  const deptSummary = useMemo(() => {
    let grandWorkHours = 0;
    let grandDayOt = 0;
    let grandNightOt = 0;
    let grandSundayDayHours = 0;
    let grandSundayNightHours = 0;
    let grandHolidayOt = 0;

    displayedStaff.forEach((s) => {
      const r = matrixData[s.employeeId];
      if (r) {
        grandWorkHours += r.totalWorkHours || 0;
        grandDayOt += r.totalDayOt || 0;
        grandNightOt += r.totalNightOt || 0;
        grandSundayDayHours += r.totalSundayDayHours ?? r.totalSundayOt ?? 0;
        grandSundayNightHours += r.totalSundayNightHours || 0;
        grandHolidayOt += r.totalHolidayOt || 0;
      }
    });

    return {
      grandWorkHours: Math.round(grandWorkHours * 10) / 10,
      grandDayOt: Math.round(grandDayOt * 10) / 10,
      grandNightOt: Math.round(grandNightOt * 10) / 10,
      grandSundayDayHours: Math.round(grandSundayDayHours * 10) / 10,
      grandSundayNightHours: Math.round(grandSundayNightHours * 10) / 10,
      grandHolidayOt: Math.round(grandHolidayOt * 10) / 10,
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

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const headerRow1 = [
      'STT',
      'Họ và Tên Nhân Viên',
      'Mã Nhân Viên',
      'Vị Trí / Chức Vụ',
      'Ca Trực',
      'Tổng Giờ Làm (h)',
      'Tổng TC Ngày (h)',
      'Tổng TC Đêm (h)',
      'Tổng Ngày CN (h)',
      'Tổng Đêm CN (h)',
      'Tổng TC Ngày Lễ (h)',
      ...monthDaysMeta.flatMap((m) => {
        const dayTag = m.isHoliday ? `${m.dayOfWeek} - NGÀY LỄ` : m.dayOfWeek;
        return [`Ngày ${m.day} (${dayTag}) - Vào`, `Ngày ${m.day} - Ra`, `Ngày ${m.day} - Giờ/TC`];
      }),
    ];

    const dataRows = displayedStaff.map((staff, idx) => {
      const record = matrixData[staff.employeeId];
      const days = record?.days || {};

      const daysCols: (string | number)[] = [];
      monthDaysMeta.forEach((m) => {
        const d = days[m.day];
        daysCols.push(d?.inTime || '');
        daysCols.push(d?.outTime || '');
        const total = getEntryTotalHours(d);
        if (d?.otHolidayHours && d.otHolidayHours > 0) {
          daysCols.push(`${d.otHolidayHours}h Lễ`);
        } else if (m.isSunday && ((d?.otSundayHours || 0) + (d?.otSundayNightHours || 0) > 0)) {
          daysCols.push(`${(d?.otSundayHours || 0) + (d?.otSundayNightHours || 0)}h CN`);
        } else if ((d?.otDayHours || 0) + (d?.otNightHours || 0) > 0) {
          daysCols.push(`+${(d?.otDayHours || 0) + (d?.otNightHours || 0)}h TC`);
        } else if (total > 0) {
          daysCols.push(`${total}h`);
        } else {
          daysCols.push(d?.status === 'Nghỉ chủ nhật' ? 'CN' : d?.status === 'Nghỉ lễ' ? 'Lễ' : d?.status || '');
        }
      });

      return [
        idx + 1,
        staff.fullName,
        staff.employeeId,
        staff.position,
        staff.shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm',
        record?.totalWorkHours || 0,
        record?.totalDayOt || 0,
        record?.totalNightOt || 0,
        record?.totalSundayDayHours ?? record?.totalSundayOt ?? 0,
        record?.totalSundayNightHours || 0,
        record?.totalHolidayOt || 0,
        ...daysCols,
      ];
    });

    const summaryPrefix = ['', '', '', '', '', '', '', '', '', '', ''];
    const rowDayCount = [
      '',
      'SỐ NV ĐI LÀM CA NGÀY',
      ...summaryPrefix.slice(2),
      ...monthDaysMeta.flatMap((m) => [dailyHeadcount[m.day]?.dayCount || 0, '', '']),
    ];
    const rowNightCount = [
      '',
      'SỐ NV ĐI LÀM CA ĐÊM',
      ...summaryPrefix.slice(2),
      ...monthDaysMeta.flatMap((m) => [dailyHeadcount[m.day]?.nightCount || 0, '', '']),
    ];
    const rowTotalCount = [
      '',
      'TỔNG NV ĐI LÀM TRONG NGÀY',
      ...summaryPrefix.slice(2),
      ...monthDaysMeta.flatMap((m) => [dailyHeadcount[m.day]?.totalCount || 0, '', '']),
    ];

    const ws = XLSX.utils.aoa_to_sheet([
      [`BẢNG CHẤM CÔNG MA TRẬN - BỘ PHẬN ${departmentTitle.toUpperCase()} - THÁNG ${selectedMonth}/${selectedYear}`],
      [],
      headerRow1,
      ...dataRows,
      [],
      rowDayCount,
      rowNightCount,
      rowTotalCount,
    ]);

    XLSX.utils.book_append_sheet(wb, ws, `Thang_${selectedMonth}_${selectedYear}`);
    XLSX.writeFile(wb, `Bang_Cham_Cong_Ma_Tran_${department}_T${selectedMonth}_${selectedYear}.xlsx`);
  };

  return (
    <div className="p-3 sm:p-6 max-w-[100vw] space-y-4">
      {/* Top Header Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                <span>Bảng Chấm Công Ma Trận ({departmentTitle})</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  T{selectedMonth}/{selectedYear}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Lưới ma trận chi tiết từ ngày 1 đến ngày {daysInMonth} theo năm {selectedYear} · Giờ vào, giờ ra, tăng ca ngày, đêm, chủ nhật & ngày lễ.
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => {
                if (selectedMonth === 1) {
                  setSelectedMonth(12);
                  setSelectedYear((y) => y - 1);
                } else {
                  setSelectedMonth((m) => m - 1);
                }
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 px-2 font-mono font-bold text-slate-200">
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
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên, mã NV..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-hidden w-40 sm:w-48"
            />
          </div>

          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value as 'ALL' | 'DAY' | 'NIGHT')}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 cursor-pointer"
          >
            <option value="ALL">Tất cả ca</option>
            <option value="DAY">Ca Ngày</option>
            <option value="NIGHT">Ca Đêm</option>
          </select>

          <button
            onClick={handleAutoFillStandard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-700/60 text-xs font-semibold cursor-pointer transition-colors"
            title="Điền tự động công chuẩn 8h cho các ngày trong tuần"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Điền Chuẩn</span>
          </button>

          <button
            onClick={handleSaveMatrix}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu Bảng Công</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
            title="Xuất ma trận chấm công ra Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {saveToast && (
        <div className="bg-emerald-950/80 border border-emerald-700/80 p-3 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* 7 Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
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
            <span>Tổng TC Ngày Lễ</span>
            <Sparkles className="w-3.5 h-3.5 text-red-400 shrink-0" />
          </div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">{deptSummary.grandHolidayOt}h</div>
          <div className="text-[10px] text-red-400/80 mt-0.5">Toàn bộ công làm ngày lễ</div>
        </div>
      </div>

      {/* Main Matrix Table Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar max-h-[72vh]">
          <table className="w-full text-left text-xs border-collapse">
            {/* Header: 2 Rows */}
            <thead className="bg-slate-950 text-slate-300 uppercase text-[10px] tracking-wider sticky top-0 z-30 shadow-md">
              {/* Row 1 */}
              <tr className="border-b border-slate-800">
                <th className="py-2.5 px-2 bg-slate-950 sticky left-0 z-40 min-w-[40px] w-[40px] text-center border-r border-slate-800">
                  STT
                </th>
                <th className="py-2.5 px-3 bg-slate-950 sticky left-[40px] z-40 min-w-[190px] w-[190px] border-r border-slate-800">
                  Tên Nhân Viên
                </th>
                <th className="py-2.5 px-2.5 bg-slate-950 sticky left-[230px] z-40 min-w-[85px] w-[85px] border-r border-slate-800">
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
                <th className="py-2.5 px-2 bg-slate-950 text-center min-w-[72px] border-r border-slate-700 text-red-400 font-bold">
                  TC Ngày Lễ
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
                <th colSpan={3} className="py-1 px-2.5 sticky left-0 z-40 bg-slate-950 border-r border-slate-800 text-slate-400">
                  THÔNG TIN NHÂN SỰ
                </th>
                <th colSpan={6} className="py-1 px-2 text-center border-r border-slate-700 bg-slate-950 text-cyan-300">
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
                  totalHolidayOt: 0,
                };

                const days = record.days || {};

                return (
                  <tr key={staff.employeeId} className="hover:bg-slate-800/40 transition-colors group">
                    {/* STT */}
                    <td className="py-2.5 px-2 sticky left-0 z-20 bg-slate-950 group-hover:bg-slate-900 border-r border-slate-800 text-center font-mono text-slate-400 text-xs">
                      {idx + 1}
                    </td>

                    {/* Tên Nhân Viên + Lock + Chấm công button */}
                    <td className="py-2 px-3 sticky left-[40px] z-20 bg-slate-950 group-hover:bg-slate-900 border-r border-slate-800">
                      <div className="flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewProfile?.(staff)}
                          title="Nhấn để xem hồ sơ nhân viên"
                          className="font-bold text-cyan-300 hover:text-cyan-200 hover:underline text-xs truncate max-w-[140px] text-left cursor-pointer"
                        >
                          {staff.fullName}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLockRow(staff);
                          }}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            record.isLocked
                              ? 'text-amber-400 bg-amber-950/50 hover:bg-amber-900/60'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                          title={record.isLocked ? 'Nhấn để mở khóa chỉnh sửa' : 'Nhấn để khóa hàng nhân viên'}
                        >
                          {record.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 mt-1">
                        <div className="text-[10px] text-slate-400 truncate max-w-[95px]">
                          {staff.position} ·{' '}
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
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-950/70 hover:bg-teal-900/80 text-teal-300 border border-teal-700/60 text-[10px] font-semibold cursor-pointer transition-colors shrink-0"
                        >
                          <Clock className="w-2.5 h-2.5" />
                          <span>Chấm công</span>
                        </button>
                      </div>
                    </td>

                    {/* Mã NV */}
                    <td
                      onClick={() => onViewProfile?.(staff)}
                      title="Nhấn để xem hồ sơ nhân viên"
                      className="py-2.5 px-2.5 sticky left-[230px] z-20 bg-slate-950 group-hover:bg-slate-900 border-r border-slate-800 font-mono text-cyan-400 hover:text-cyan-200 hover:underline font-semibold text-xs cursor-pointer"
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

                    {/* TC Ngày Lễ */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-700 font-mono font-bold text-red-400 bg-red-950/20 text-xs">
                      {(record.totalHolidayOt || 0) > 0 ? `${record.totalHolidayOt}h` : '—'}
                    </td>

                    {/* Day Cells */}
                    {monthDaysMeta.map((m) => {
                      const entry: MatrixDayTimeEntry = days[m.day] || {
                        day: m.day,
                        shift: staff.shift,
                        regularHours: 0,
                        otDayHours: 0,
                        otNightHours: 0,
                        otSundayHours: 0,
                        otSundayNightHours: 0,
                        otHolidayHours: 0,
                        isHoliday: m.isHoliday,
                        status: m.isHoliday ? 'Nghỉ lễ' : m.isSunday ? 'Nghỉ chủ nhật' : 'Đúng giờ',
                      };

                      const isHolidayCell = Boolean(m.isHoliday || entry.isHoliday);
                      const isSunday = m.isSunday;
                      const otDay = entry.otDayHours || 0;
                      const otNight = entry.otNightHours || 0;
                      const sunDay = entry.otSundayHours || 0;
                      const sunNight = entry.otSundayNightHours || 0;
                      const holOt = entry.otHolidayHours || 0;
                      const totalHours = getEntryTotalHours(entry);
                      const isLeave =
                        entry.status === 'Nghỉ phép' ||
                        entry.status === 'Nghỉ ốm' ||
                        entry.status === 'Vắng mặt' ||
                        entry.status === 'Nghỉ KL';

                      return (
                        <td
                          key={m.day}
                          onClick={() => openEditCell(staff, m)}
                          className={`py-1.5 px-1.5 text-center border-r border-slate-800/80 cursor-pointer transition-colors relative hover:ring-1 hover:ring-cyan-400 ${
                            isHolidayCell
                              ? 'bg-red-950/25 hover:bg-red-950/45'
                              : isSunday
                              ? 'bg-rose-950/20 hover:bg-rose-950/40'
                              : m.isSaturday
                              ? 'bg-amber-950/10 hover:bg-amber-950/30'
                              : 'hover:bg-slate-800'
                          }`}
                          title={`Kích để sửa: ${staff.fullName} - Ngày ${m.day}/${selectedMonth} (${
                            isHolidayCell ? 'Ngày Lễ' : m.dayOfWeek
                          })`}
                        >
                          {isLeave && totalHours === 0 ? (
                            <div className="space-y-0.5">
                              <div className="font-mono text-[10px] text-sky-400 font-bold">
                                {entry.status === 'Nghỉ phép' ? 'Phép' : entry.status}
                              </div>
                              <div className="flex justify-center">
                                <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono text-[9px] font-semibold">
                                  {entry.status}
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
                                entry.status === 'Về sớm' ? (
                                  <div className="font-mono text-[10px] text-slate-200 font-medium">
                                    {entry.inTime || '--:--'} - {entry.outTime || '--:--'}
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
                              <div className="flex items-center justify-center gap-1 font-mono text-[9px]">
                                {isHolidayCell && holOt > 0 ? (
                                  <span className="px-1.5 rounded font-bold bg-red-500/30 text-red-200 border border-red-500/50">
                                    +{holOt}h Lễ
                                  </span>
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
                                  <div className="text-red-400 font-bold">Lễ</div>
                                  <div className="text-[9px] text-slate-500">-</div>
                                </div>
                              ) : isSunday ? (
                                <div className="space-y-0.5">
                                  <div className="text-rose-400 font-bold">CN</div>
                                  <div className="text-[9px] text-slate-500">-</div>
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
                  colSpan={3}
                  className="py-2 px-3 sticky left-0 z-40 bg-slate-950 border-r border-slate-800 font-sans font-bold text-[11px] text-amber-300 uppercase"
                >
                  <div className="flex items-center gap-2">
                    <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Số NV Đi Làm Ca Ngày</span>
                  </div>
                </td>
                <td colSpan={6} className="py-2 px-2 bg-slate-950 border-r border-slate-700 text-center text-[10px] text-slate-500">
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
                  colSpan={3}
                  className="py-2 px-3 sticky left-0 z-40 bg-slate-950 border-r border-slate-800 font-sans font-bold text-[11px] text-purple-300 uppercase"
                >
                  <div className="flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Số NV Đi Làm Ca Đêm</span>
                  </div>
                </td>
                <td colSpan={6} className="py-2 px-2 bg-slate-950 border-r border-slate-700 text-center text-[10px] text-slate-500">
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
                  colSpan={3}
                  className="py-2.5 px-3 sticky left-0 z-40 bg-slate-950 border-r border-slate-800 font-sans font-bold text-[11px] text-teal-300 uppercase"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Tổng NV Đi Làm Trong Ngày</span>
                  </div>
                </td>
                <td colSpan={6} className="py-2.5 px-2 bg-slate-950 border-r border-slate-700 text-center text-[10px] text-teal-400/80 font-bold">
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
            <span className="text-red-300 font-medium">Làm Ngày Lễ (TC Ngày Lễ)</span>
          </span>
        </div>

        <div className="text-[11px] text-cyan-400 font-medium italic">
          * Kích chuột vào tiêu đề ngày (NGÀY 1..{daysInMonth}) để chọn/hủy Ngày Lễ · Kích vào ô ngày để sửa giờ vào/ra & tăng ca.
        </div>
      </div>

      {/* Day Header Modal: Chọn Ngày Lễ / Ngày Thường */}
      {dayTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-5 space-y-4 text-xs shadow-2xl">
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
                  Toàn bộ giờ đi làm trong ngày này tính vào <span className="text-red-300 font-semibold">TC Ngày Lễ</span>.
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 text-xs shadow-2xl">
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

              {/* Breakdown Overtime Inputs: TC Ngày, TC Đêm, Ngày CN, Đêm CN, TC Ngày Lễ */}
              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg space-y-2.5">
                <div className="text-[11px] font-bold text-cyan-300 flex items-center justify-between">
                  <span>Phân Loại Giờ Tăng Ca / Chủ Nhật / Ngày Lễ:</span>
                  {editingCell.dayOfWeek === 'CN' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                      Chủ Nhật
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-2">
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
                    <label className="text-[10px] text-red-300 block mb-0.5 font-bold">TC Lễ:</label>
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
                          inTime: editingCell.staff.shift === 'NIGHT' ? '20:00' : '08:00',
                          outTime: editingCell.staff.shift === 'NIGHT' ? '08:00' : '20:00',
                          regularHours: 0,
                          otDayHours: 0,
                          otNightHours: 0,
                          otSundayHours: 0,
                          otSundayNightHours: 0,
                          otHolidayHours: 11,
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
                          inTime: '',
                          outTime: '',
                          regularHours: 0,
                          otDayHours: 0,
                          otNightHours: 0,
                          otSundayHours: 0,
                          otSundayNightHours: 0,
                          otHolidayHours: 0,
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
                  <option value="Nghỉ ốm">Nghỉ ốm</option>
                  <option value="Nghỉ lễ">Nghỉ lễ</option>
                  <option value="Nghỉ chủ nhật">Nghỉ chủ nhật</option>
                  <option value="Vắng mặt">Vắng mặt</option>
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
    </div>
  );
};
