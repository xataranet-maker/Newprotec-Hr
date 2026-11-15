import React, { useState, useEffect, useMemo } from 'react';
import { StaffRecord, AttendanceRecord, OvertimeRecord, AttendanceStatus, MatrixDayTimeEntry, MatrixEmployeeTimekeeping } from '../../types';
import { 
  CalendarDays, ChevronLeft, ChevronRight, Download, Clock, 
  Search, Users, Save, Check, RefreshCw, AlertTriangle, 
  Sun, Moon, Sparkles, Filter, FileSpreadsheet, Eye, X
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface DepartmentTimekeepingMatrixProps {
  department: string;
  departmentTitle: string;
  staffList: StaffRecord[];
  allStaff?: StaffRecord[];
  attendanceHistory?: AttendanceRecord[];
  overtimeRecords?: OvertimeRecord[];
  userRole?: string;
}

const VI_DAYS_OF_WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const DepartmentTimekeepingMatrix: React.FC<DepartmentTimekeepingMatrixProps> = ({
  department,
  departmentTitle,
  staffList,
  allStaff = [],
  attendanceHistory = [],
  overtimeRecords = []
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterShift, setFilterShift] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Modal quick edit state
  const [editingCell, setEditingCell] = useState<{
    staff: StaffRecord;
    day: number;
    dateStr: string;
    dayOfWeek: string;
    entry: MatrixDayTimeEntry;
  } | null>(null);

  // Compute days in the selected month & year (28, 29, 30, or 31)
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Compute day metadata: { day, dayOfWeek, isSunday, isSaturday, fullDateStr }
  const monthDaysMeta = useMemo(() => {
    return daysArray.map(day => {
      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
      const dayNum = dateObj.getDay();
      const dayOfWeek = VI_DAYS_OF_WEEK[dayNum];
      const isSunday = dayNum === 0;
      const isSaturday = dayNum === 6;
      const fullDateStr = `${String(day).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${selectedYear}`;
      return { day, dayOfWeek, isSunday, isSaturday, fullDateStr };
    });
  }, [daysArray, selectedYear, selectedMonth]);

  // Filter staff by department if not ALL
  const targetStaff = useMemo(() => {
    const list = department === 'ALL' || department === 'HC_NS' 
      ? (allStaff.length > 0 ? allStaff : staffList)
      : staffList;
    return list;
  }, [department, staffList, allStaff]);

  // Storage key for persistent matrix records
  const storageKey = `app_matrix_timekeeping_${department.toLowerCase()}_${selectedYear}_${selectedMonth}`;

  // Matrix records: employeeId -> MatrixEmployeeTimekeeping
  const [matrixData, setMatrixData] = useState<Record<string, MatrixEmployeeTimekeeping>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading matrix storage', e);
    }
    return {};
  });

  // Reload or initialize data whenever month, year, or staff changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setMatrixData(JSON.parse(saved));
        return;
      }
    } catch (e) {
      console.error('Error loading matrix storage', e);
    }

    // Default initialization: generate realistic factory schedule for each staff
    const initial: Record<string, MatrixEmployeeTimekeeping> = {};

    targetStaff.forEach(staff => {
      const daysRecord: Record<number, MatrixDayTimeEntry> = {};
      let totalWork = 0;
      let totalDayOt = 0;
      let totalNightOt = 0;
      let totalSundayOt = 0;

      daysArray.forEach(day => {
        const dateObj = new Date(selectedYear, selectedMonth - 1, day);
        const dayNum = dateObj.getDay();
        const isSunday = dayNum === 0;
        const isSaturday = dayNum === 6;

        let inTime = '';
        let outTime = '';
        let regularHours = 0;
        let otDayHours = 0;
        let otNightHours = 0;
        let otSundayHours = 0;
        let status: AttendanceStatus = 'Đúng giờ';

        if (isSunday) {
          // Sunday: default day-off, with occasional Sunday overtime
          if (day === 8 || day === 22) {
            inTime = '08:00';
            outTime = '16:30';
            otSundayHours = 8;
            totalSundayOt += 8;
            totalWork += 8;
            status = 'Đúng giờ';
          } else {
            status = 'Nghỉ chủ nhật';
          }
        } else {
          // Normal weekday or Saturday
          if (staff.shift === 'NIGHT') {
            inTime = '20:00';
            outTime = '08:00';
            regularHours = 8;
            otNightHours = 3.5;
            totalNightOt += 3.5;
            totalWork += 11.5;
          } else {
            // Day shift
            inTime = '08:00';
            // Even days have 2.5h overtime, odd days normal 8h
            if (day % 2 === 0 && !isSaturday) {
              outTime = '20:30';
              regularHours = 8;
              otDayHours = 2.5;
              totalDayOt += 2.5;
              totalWork += 10.5;
            } else if (isSaturday) {
              outTime = '17:00';
              regularHours = 8;
              totalWork += 8;
            } else {
              outTime = '17:00';
              regularHours = 8;
              totalWork += 8;
            }
          }

          // Check if employee had late/early recorded on staff
          if (day === 5 && staff.attendance === 'Đi muộn') {
            status = 'Đi muộn';
            inTime = staff.lateIn || '08:30';
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
          status
        };
      });

      initial[staff.employeeId] = {
        employeeId: staff.employeeId,
        fullName: staff.fullName,
        department: staff.department || department,
        position: staff.position || 'Công nhân vận hành',
        shift: staff.shift,
        days: daysRecord,
        totalWorkHours: Math.round(totalWork * 10) / 10,
        totalDayOt: Math.round(totalDayOt * 10) / 10,
        totalNightOt: Math.round(totalNightOt * 10) / 10,
        totalSundayOt: Math.round(totalSundayOt * 10) / 10
      };
    });

    setMatrixData(initial);
  }, [storageKey, targetStaff, daysArray, selectedYear, selectedMonth, department]);

  // Recalculate totals for a staff member whenever their days change
  const recalculateStaffTotals = (days: Record<number, MatrixDayTimeEntry>) => {
    let totalWork = 0;
    let totalDayOt = 0;
    let totalNightOt = 0;
    let totalSundayOt = 0;

    Object.values(days).forEach(entry => {
      const reg = entry.regularHours || 0;
      const otDay = entry.otDayHours || 0;
      const otNight = entry.otNightHours || 0;
      const otSun = entry.otSundayHours || 0;

      totalWork += (reg + otDay + otNight + otSun);
      totalDayOt += otDay;
      totalNightOt += otNight;
      totalSundayOt += otSun;
    });

    return {
      totalWorkHours: Math.round(totalWork * 10) / 10,
      totalDayOt: Math.round(totalDayOt * 10) / 10,
      totalNightOt: Math.round(totalNightOt * 10) / 10,
      totalSundayOt: Math.round(totalSundayOt * 10) / 10
    };
  };

  // Save changes to localStorage
  const handleSaveMatrix = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(matrixData));
      setSaveToast(`Đã lưu bảng chấm công ma trận tháng ${selectedMonth}/${selectedYear} thành công!`);
      setTimeout(() => setSaveToast(null), 3000);
    } catch (e) {
      console.error('Error saving matrix', e);
    }
  };

  // Auto fill standard 8h/day on all working days
  const handleAutoFillStandard = () => {
    const updated = { ...matrixData };
    targetStaff.forEach(staff => {
      const current = updated[staff.employeeId] || {
        employeeId: staff.employeeId,
        fullName: staff.fullName,
        department: staff.department || department,
        position: staff.position,
        shift: staff.shift,
        days: {},
        totalWorkHours: 0,
        totalDayOt: 0,
        totalNightOt: 0,
        totalSundayOt: 0
      };

      const days = { ...current.days };
      monthDaysMeta.forEach(({ day, isSunday }) => {
        if (!isSunday) {
          days[day] = {
            day,
            inTime: staff.shift === 'NIGHT' ? '20:00' : '08:00',
            outTime: staff.shift === 'NIGHT' ? '08:00' : '17:00',
            shift: staff.shift,
            regularHours: 8,
            otDayHours: 0,
            otNightHours: staff.shift === 'NIGHT' ? 2 : 0,
            otSundayHours: 0,
            status: 'Đúng giờ'
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
            status: 'Nghỉ chủ nhật'
          };
        }
      });

      const totals = recalculateStaffTotals(days);
      updated[staff.employeeId] = {
        ...current,
        days,
        ...totals
      };
    });

    setMatrixData(updated);
    setSaveToast('Đã tự động điền giờ công chuẩn (8h/ngày) cho toàn bộ nhân sự!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Save modal edit
  const handleSaveModalEdit = (updatedEntry: MatrixDayTimeEntry) => {
    if (!editingCell) return;
    const { staff, day } = editingCell;

    const currentStaffData = matrixData[staff.employeeId] || {
      employeeId: staff.employeeId,
      fullName: staff.fullName,
      department: staff.department || department,
      position: staff.position,
      shift: staff.shift,
      days: {},
      totalWorkHours: 0,
      totalDayOt: 0,
      totalNightOt: 0,
      totalSundayOt: 0
    };

    const updatedDays = {
      ...currentStaffData.days,
      [day]: updatedEntry
    };

    const totals = recalculateStaffTotals(updatedDays);

    const updatedMatrix = {
      ...matrixData,
      [staff.employeeId]: {
        ...currentStaffData,
        days: updatedDays,
        ...totals
      }
    };

    setMatrixData(updatedMatrix);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedMatrix));
    } catch (e) {
      console.error(e);
    }

    setEditingCell(null);
  };

  // Export to Excel (.xlsx) with full matrix format
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Headers Row 1: Titles
    const headerRow1 = [
      'STT',
      'Họ và Tên Nhân Viên',
      'Mã Nhân Viên',
      'Vị Trí / Chức Vụ',
      'Ca Trực',
      'Tổng Giờ Làm (h)',
      'Tổng TC Ngày (h)',
      'Tổng TC Đêm (h)',
      'Tổng TC Chủ Nhật (h)',
      ...monthDaysMeta.flatMap(m => [`Ngày ${m.day} (${m.dayOfWeek}) - Vào`, `Ngày ${m.day} - Ra`, `Ngày ${m.day} - Giờ TC`])
    ];

    // Data rows
    const dataRows = targetStaff.map((staff, idx) => {
      const record = matrixData[staff.employeeId];
      const days = record?.days || {};

      const daysCols: any[] = [];
      monthDaysMeta.forEach(m => {
        const d = days[m.day];
        daysCols.push(d?.inTime || '');
        daysCols.push(d?.outTime || '');
        const otTotal = (d?.otDayHours || 0) + (d?.otNightHours || 0) + (d?.otSundayHours || 0);
        daysCols.push(otTotal > 0 ? otTotal : (d?.status === 'Nghỉ chủ nhật' ? 'CN' : ''));
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
        record?.totalSundayOt || 0,
        ...daysCols
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([
      [`BẢNG CHẤM CÔNG MA TRẬN - BỘ PHẬN ${departmentTitle.toUpperCase()} - THÁNG ${selectedMonth}/${selectedYear}`],
      [],
      headerRow1,
      ...dataRows
    ]);

    XLSX.utils.book_append_sheet(wb, ws, `Thang_${selectedMonth}_${selectedYear}`);
    XLSX.writeFile(wb, `Bang_Cham_Cong_Ma_Tran_${department}_T${selectedMonth}_${selectedYear}.xlsx`);
  };

  // Filtered staff for display
  const displayedStaff = useMemo(() => {
    return targetStaff.filter(s => {
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchShift = filterShift === 'ALL' || s.shift === filterShift;
      return matchSearch && matchShift;
    });
  }, [targetStaff, searchTerm, filterShift]);

  // Overall Department Totals
  const deptSummary = useMemo(() => {
    let grandWorkHours = 0;
    let grandDayOt = 0;
    let grandNightOt = 0;
    let grandSundayOt = 0;

    displayedStaff.forEach(s => {
      const r = matrixData[s.employeeId];
      if (r) {
        grandWorkHours += r.totalWorkHours || 0;
        grandDayOt += r.totalDayOt || 0;
        grandNightOt += r.totalNightOt || 0;
        grandSundayOt += r.totalSundayOt || 0;
      }
    });

    return {
      grandWorkHours: Math.round(grandWorkHours * 10) / 10,
      grandDayOt: Math.round(grandDayOt * 10) / 10,
      grandNightOt: Math.round(grandNightOt * 10) / 10,
      grandSundayOt: Math.round(grandSundayOt * 10) / 10
    };
  }, [displayedStaff, matrixData]);

  return (
    <div className="p-3 sm:p-6 max-w-[100vw] space-y-4">
      {/* Top Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Bảng Chấm Công Ma Trận ({departmentTitle})</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  T{selectedMonth}/{selectedYear}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Lưới ma trận chi tiết từ ngày 1 đến ngày {daysInMonth} theo năm {selectedYear} · Giờ vào, giờ ra, giờ tăng ca ngày, đêm, chủ nhật.
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month / Year Navigator */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => {
                if (selectedMonth === 1) {
                  setSelectedMonth(12);
                  setSelectedYear(y => y - 1);
                } else {
                  setSelectedMonth(m => m - 1);
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
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-cyan-400 font-bold focus:outline-hidden cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m} className="bg-slate-900 text-white">Tháng {m}</option>
                ))}
              </select>
              <span className="text-slate-600">/</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-hidden cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y} className="bg-slate-900 text-white">{y}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                if (selectedMonth === 12) {
                  setSelectedMonth(1);
                  setSelectedYear(y => y + 1);
                } else {
                  setSelectedMonth(m => m + 1);
                }
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên, mã NV..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-hidden w-40 sm:w-48"
            />
          </div>

          {/* Shift Filter */}
          <select
            value={filterShift}
            onChange={e => setFilterShift(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 cursor-pointer"
          >
            <option value="ALL">Tất cả ca</option>
            <option value="DAY">Ca Ngày</option>
            <option value="NIGHT">Ca Đêm</option>
          </select>

          {/* Auto fill button */}
          <button
            onClick={handleAutoFillStandard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold cursor-pointer transition-colors"
            title="Điền tự động công chuẩn 8h cho các ngày trong tuần"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Điền Chuẩn</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveMatrix}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu Bảng Công</span>
          </button>

          {/* Export Excel Button */}
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
        <div className="bg-emerald-950/80 border border-emerald-700/80 p-3 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Quân Số Đang Xem</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{displayedStaff.length} nhân viên</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{departmentTitle}</div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl">
          <div className="text-[10px] text-emerald-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng Giờ Làm Tháng</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{deptSummary.grandWorkHours}h</div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">Bao gồm công + tăng ca</div>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl">
          <div className="text-[10px] text-amber-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng Tăng Ca Ngày</span>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{deptSummary.grandDayOt}h</div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">T2 - T7 ban ngày</div>
        </div>

        <div className="bg-indigo-950/30 border border-indigo-800/40 p-3 rounded-xl">
          <div className="text-[10px] text-indigo-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng Tăng Ca Đêm</span>
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-400 mt-1">{deptSummary.grandNightOt}h</div>
          <div className="text-[10px] text-indigo-400/80 mt-0.5">Sau 22:00 hoặc ca đêm</div>
        </div>

        <div className="bg-rose-950/30 border border-rose-800/40 p-3 rounded-xl">
          <div className="text-[10px] text-rose-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng TC Chủ Nhật</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">{deptSummary.grandSundayOt}h</div>
          <div className="text-[10px] text-rose-400/80 mt-0.5">Hệ số tính đặc biệt (CN)</div>
        </div>
      </div>

      {/* Main Matrix Table Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar max-h-[72vh]">
          <table className="w-full text-left text-xs border-collapse">
            {/* Header: 2 Rows */}
            <thead className="bg-slate-950 text-slate-300 uppercase text-[10px] tracking-wider sticky top-0 z-30 shadow-md">
              {/* Row 1: Fixed summary columns & Day Numbers 1..31 */}
              <tr className="border-b border-slate-800">
                <th className="py-2.5 px-2.5 bg-slate-950 sticky left-0 z-30 min-w-[40px] text-center border-r border-slate-800">
                  STT
                </th>
                <th className="py-2.5 px-3 bg-slate-950 sticky left-[40px] z-30 min-w-[160px] border-r border-slate-800">
                  Tên Nhân Viên
                </th>
                <th className="py-2.5 px-2.5 bg-slate-950 sticky left-[200px] z-30 min-w-[85px] border-r border-slate-800">
                  Mã NV
                </th>
                <th className="py-2.5 px-2.5 bg-slate-950 text-center min-w-[80px] border-r border-slate-800 text-emerald-400 font-bold">
                  Tổng Giờ Làm
                </th>
                <th className="py-2.5 px-2 bg-slate-950 text-center min-w-[70px] border-r border-slate-800 text-amber-400 font-bold">
                  TC Ngày
                </th>
                <th className="py-2.5 px-2 bg-slate-950 text-center min-w-[70px] border-r border-slate-800 text-indigo-400 font-bold">
                  TC Đêm
                </th>
                <th className="py-2.5 px-2 bg-slate-950 text-center min-w-[70px] border-r border-slate-700 text-rose-400 font-bold">
                  TC Chủ Nhật
                </th>

                {/* Day 1 to Day 31 Columns */}
                {monthDaysMeta.map(m => (
                  <th
                    key={m.day}
                    className={`py-1.5 px-2 text-center min-w-[96px] border-r border-slate-800 select-none ${
                      m.isSunday ? 'bg-rose-950/60 text-rose-300' : m.isSaturday ? 'bg-amber-950/40 text-amber-300' : 'bg-slate-950/90 text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs font-mono">Ngày {m.day}</div>
                    <div className={`text-[9px] font-bold ${m.isSunday ? 'text-rose-400' : m.isSaturday ? 'text-amber-400' : 'text-slate-400'}`}>
                      {m.dayOfWeek} {m.isSunday ? '(Chủ Nhật)' : ''}
                    </div>
                  </th>
                ))}
              </tr>

              {/* Row 2: Sub-labels for days (Vào | Ra | TC) */}
              <tr className="border-b border-slate-800 bg-slate-950/90 text-[9px] text-slate-400 font-mono">
                <th colSpan={3} className="py-1 px-2.5 sticky left-0 z-30 bg-slate-950 border-r border-slate-800 text-slate-400">
                  THÔNG TIN NHÂN SỰ
                </th>
                <th colSpan={4} className="py-1 px-2 text-center border-r border-slate-700 bg-slate-950 text-cyan-300">
                  TỔNG HỢP CÔNG & TĂNG CA CẢ THÁNG
                </th>
                {monthDaysMeta.map(m => (
                  <th
                    key={`sub_${m.day}`}
                    className={`py-1 px-1 text-center border-r border-slate-800 text-[9px] ${
                      m.isSunday ? 'bg-rose-950/40 text-rose-400' : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    Vào · Ra · Tăng Ca
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
                  days: {},
                  totalWorkHours: 0,
                  totalDayOt: 0,
                  totalNightOt: 0,
                  totalSundayOt: 0
                };

                const days = record.days || {};

                return (
                  <tr key={staff.employeeId} className="hover:bg-slate-800/40 transition-colors group">
                    {/* STT */}
                    <td className="py-2.5 px-2.5 sticky left-0 z-20 bg-slate-950 group-hover:bg-slate-900 border-r border-slate-800 text-center font-mono text-slate-400 text-xs">
                      {idx + 1}
                    </td>

                    {/* Tên Nhân Viên */}
                    <td className="py-2.5 px-3 sticky left-[40px] z-20 bg-slate-950 group-hover:bg-slate-900 border-r border-slate-800">
                      <div className="font-bold text-white text-xs truncate max-w-[150px]">
                        {staff.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        {staff.position} · {staff.shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}
                      </div>
                    </td>

                    {/* Mã NV */}
                    <td className="py-2.5 px-2.5 sticky left-[200px] z-20 bg-slate-950 group-hover:bg-slate-900 border-r border-slate-800 font-mono text-cyan-400 font-semibold text-xs">
                      {staff.employeeId}
                    </td>

                    {/* Tổng Giờ Làm */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-800 font-mono font-bold text-emerald-400 bg-emerald-950/20 text-xs">
                      {record.totalWorkHours}h
                    </td>

                    {/* Tổng TC Ngày */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-800 font-mono font-bold text-amber-400 bg-amber-950/20 text-xs">
                      {record.totalDayOt > 0 ? `${record.totalDayOt}h` : '—'}
                    </td>

                    {/* Tổng TC Đêm */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-800 font-mono font-bold text-indigo-400 bg-indigo-950/20 text-xs">
                      {record.totalNightOt > 0 ? `${record.totalNightOt}h` : '—'}
                    </td>

                    {/* Tổng TC Chủ Nhật */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-700 font-mono font-bold text-rose-400 bg-rose-950/20 text-xs">
                      {record.totalSundayOt > 0 ? `${record.totalSundayOt}h` : '—'}
                    </td>

                    {/* Day Cells (Day 1 to Day 31) */}
                    {monthDaysMeta.map(m => {
                      const entry: MatrixDayTimeEntry = days[m.day] || {
                        day: m.day,
                        regularHours: 0,
                        otDayHours: 0,
                        otNightHours: 0,
                        otSundayHours: 0,
                        status: m.isSunday ? 'Nghỉ chủ nhật' : 'Đúng giờ'
                      };

                      const ot = (entry.otDayHours || 0) + (entry.otNightHours || 0) + (entry.otSundayHours || 0);
                      const isSunday = m.isSunday;

                      return (
                        <td
                          key={m.day}
                          onClick={() => setEditingCell({
                            staff,
                            day: m.day,
                            dateStr: m.fullDateStr,
                            dayOfWeek: m.dayOfWeek,
                            entry: { ...entry }
                          })}
                          className={`py-1.5 px-1.5 text-center border-r border-slate-800/80 cursor-pointer transition-colors relative hover:ring-1 hover:ring-cyan-400 ${
                            isSunday 
                              ? 'bg-rose-950/20 hover:bg-rose-950/40' 
                              : m.isSaturday 
                              ? 'bg-amber-950/10 hover:bg-amber-950/30' 
                              : 'hover:bg-slate-800'
                          }`}
                          title={`Kích để chỉnh sửa: ${staff.fullName} - Ngày ${m.day}/${selectedMonth} (${m.dayOfWeek})`}
                        >
                          {entry.inTime || entry.outTime || ot > 0 ? (
                            <div className="space-y-0.5">
                              {/* In - Out Time */}
                              <div className="font-mono text-[10px] text-slate-300 font-medium">
                                <span className={entry.status === 'Đi muộn' ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                                  {entry.inTime || '--:--'}
                                </span>
                                <span className="text-slate-500 mx-0.5">-</span>
                                <span className={entry.status === 'Về sớm' ? 'text-orange-400 font-bold' : 'text-slate-200'}>
                                  {entry.outTime || '--:--'}
                                </span>
                              </div>

                              {/* Overtime & Status Tag */}
                              <div className="flex items-center justify-center gap-1 font-mono text-[9px]">
                                {ot > 0 ? (
                                  <span className={`px-1 rounded font-bold ${
                                    isSunday 
                                      ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50' 
                                      : entry.otNightHours > 0 
                                      ? 'bg-indigo-500/30 text-indigo-300' 
                                      : 'bg-amber-500/30 text-amber-300'
                                  }`}>
                                    +{ot}h TC
                                  </span>
                                ) : (
                                  <span className="text-emerald-400/80">8h công</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-600 font-mono py-1">
                              {isSunday ? <span className="text-rose-400/50 font-bold">CN</span> : '—'}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend & Instructions Footer */}
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Chú Thích Màu:</span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Giờ công chuẩn (8h)</span>
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Tăng ca ngày (Thứ 2 - Thứ 7)</span>
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <span>Tăng ca đêm (Ca Đêm / sau 22h)</span>
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span>Tăng ca Chủ Nhật (CN)</span>
          </span>
        </div>

        <div className="text-[11px] text-cyan-400 font-medium">
          * Kích chuột trực tiếp vào bất kỳ ô ngày nào trên bảng ma trận để cập nhật nhanh giờ vào, giờ ra và giờ tăng ca.
        </div>
      </div>

      {/* Quick Edit Cell Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 text-xs shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                  {editingCell.day}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {editingCell.staff.fullName}
                  </h3>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Ngày {editingCell.dateStr} ({editingCell.dayOfWeek}) · Mã: {editingCell.staff.employeeId}
                  </div>
                </div>
              </div>
              <button onClick={() => setEditingCell(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleSaveModalEdit(editingCell.entry);
              }}
              className="space-y-3.5"
            >
              {/* Check-in & Check-out Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thời Gian Vào (In)</label>
                  <input
                    type="time"
                    value={editingCell.entry.inTime || ''}
                    onChange={e => setEditingCell({
                      ...editingCell,
                      entry: { ...editingCell.entry, inTime: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-sm focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Thời Gian Ra (Out)</label>
                  <input
                    type="time"
                    value={editingCell.entry.outTime || ''}
                    onChange={e => setEditingCell({
                      ...editingCell,
                      entry: { ...editingCell.entry, outTime: e.target.value }
                    })}
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
                    onChange={e => setEditingCell({
                      ...editingCell,
                      entry: { ...editingCell.entry, shift: e.target.value as any }
                    })}
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
                    value={editingCell.entry.regularHours ?? 8}
                    onChange={e => setEditingCell({
                      ...editingCell,
                      entry: { ...editingCell.entry, regularHours: Number(e.target.value) }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Breakdown Overtime Inputs: Ngày, Đêm, Chủ Nhật */}
              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg space-y-2.5">
                <div className="text-[11px] font-bold text-cyan-300 flex items-center justify-between">
                  <span>Phân Loại Giờ Tăng Ca (Overtime):</span>
                  {editingCell.dayOfWeek === 'CN' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                      Hôm nay là Chủ Nhật
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-amber-300 block mb-0.5">TC Ngày (h):</label>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      step={0.5}
                      value={editingCell.entry.otDayHours || ''}
                      onChange={e => setEditingCell({
                        ...editingCell,
                        entry: { ...editingCell.entry, otDayHours: Number(e.target.value) }
                      })}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-amber-700/60 rounded p-1.5 text-xs text-amber-200 font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-indigo-300 block mb-0.5">TC Đêm (h):</label>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      step={0.5}
                      value={editingCell.entry.otNightHours || ''}
                      onChange={e => setEditingCell({
                        ...editingCell,
                        entry: { ...editingCell.entry, otNightHours: Number(e.target.value) }
                      })}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-indigo-700/60 rounded p-1.5 text-xs text-indigo-200 font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-rose-300 block mb-0.5">TC Chủ Nhật (h):</label>
                    <input
                      type="number"
                      min={0}
                      max={16}
                      step={0.5}
                      value={editingCell.entry.otSundayHours || ''}
                      onChange={e => setEditingCell({
                        ...editingCell,
                        entry: { ...editingCell.entry, otSundayHours: Number(e.target.value) }
                      })}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-rose-700/60 rounded p-1.5 text-xs text-rose-200 font-mono text-center font-bold"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[9px] text-slate-400">Chọn nhanh:</span>
                  <button
                    type="button"
                    onClick={() => setEditingCell({
                      ...editingCell,
                      entry: {
                        ...editingCell.entry,
                        inTime: '08:00',
                        outTime: '17:00',
                        regularHours: 8,
                        otDayHours: 0,
                        otNightHours: 0,
                        otSundayHours: 0,
                        status: 'Đúng giờ'
                      }
                    })}
                    className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    Ca chuẩn 8h
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingCell({
                      ...editingCell,
                      entry: {
                        ...editingCell.entry,
                        inTime: '08:00',
                        outTime: '20:30',
                        regularHours: 8,
                        otDayHours: 2.5,
                        otNightHours: 0,
                        otSundayHours: 0,
                        status: 'Đúng giờ'
                      }
                    })}
                    className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/40 cursor-pointer"
                  >
                    +2.5h TC ngày
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingCell({
                      ...editingCell,
                      entry: {
                        ...editingCell.entry,
                        inTime: '08:00',
                        outTime: '16:30',
                        regularHours: 0,
                        otDayHours: 0,
                        otNightHours: 0,
                        otSundayHours: 8,
                        status: 'Đúng giờ'
                      }
                    })}
                    className="px-1.5 py-0.5 rounded text-[9px] bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/40 cursor-pointer"
                  >
                    8h TC Chủ Nhật
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingCell({
                      ...editingCell,
                      entry: {
                        ...editingCell.entry,
                        inTime: '',
                        outTime: '',
                        regularHours: 0,
                        otDayHours: 0,
                        otNightHours: 0,
                        otSundayHours: 0,
                        status: editingCell.dayOfWeek === 'CN' ? 'Nghỉ chủ nhật' : 'Nghỉ phép'
                      }
                    })}
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
                  onChange={e => setEditingCell({
                    ...editingCell,
                    entry: { ...editingCell.entry, status: e.target.value as AttendanceStatus }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-semibold"
                >
                  <option value="Đúng giờ">Đúng giờ</option>
                  <option value="Đi muộn">Đi muộn</option>
                  <option value="Về sớm">Về sớm</option>
                  <option value="Nghỉ phép">Nghỉ phép</option>
                  <option value="Nghỉ ốm">Nghỉ ốm</option>
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
