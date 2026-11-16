import React, { useState, useEffect, useMemo } from 'react';
import {
  AttendanceConfirmationRecord,
  StaffRecord,
  UserRole,
} from '../../types';
import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  RotateCcw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  MATRIX_UPDATED_EVENT,
  getEmployeeProfileMatrixData,
} from '../../lib/matrixTimekeeping';

interface HRAttendanceConfirmationProps {
  allStaff: StaffRecord[];
  attendanceConfirmations: AttendanceConfirmationRecord[];
  onUpdateAttendanceConfirmation: (list: AttendanceConfirmationRecord[]) => void;
  onViewProfile?: (staff: StaffRecord) => void;
  userRole?: UserRole;
}

interface EmployeeConfirmationSummaryRow {
  staff: StaffRecord;
  workDaysCount: number;
  regularDayHours: number;
  regularNightHours: number;
  otDayHours: number;
  otNightHours: number;
  otSundayDayHours: number;
  otSundayNightHours: number;
  otHolidayDayHours: number;
  otHolidayNightHours: number;
  confirmation?: AttendanceConfirmationRecord;
  isConfirmed: boolean;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

export const HRAttendanceConfirmation: React.FC<HRAttendanceConfirmationProps> = ({
  allStaff,
  attendanceConfirmations,
  onUpdateAttendanceConfirmation,
  onViewProfile,
  userRole,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CONFIRMED' | 'UNCONFIRMED'>('ALL');
  const [matrixTick, setMatrixTick] = useState<number>(0);

  // Listen for live updates from MultiAuto / HC&NS Timekeeping Matrix
  useEffect(() => {
    const onMatrixUpdated = () => setMatrixTick((v) => v + 1);
    const onStorage = (e: StorageEvent) => {
      if (
        e.key &&
        (e.key.startsWith('app_matrix_timekeeping_') ||
          e.key.startsWith('app_matrix_holidays_') ||
          e.key.startsWith('app_matrix_meta_'))
      ) {
        setMatrixTick((v) => v + 1);
      }
    };
    window.addEventListener(MATRIX_UPDATED_EVENT, onMatrixUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(MATRIX_UPDATED_EVENT, onMatrixUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const daysInMonth = useMemo(
    () => new Date(selectedYear, selectedMonth, 0).getDate(),
    [selectedYear, selectedMonth]
  );

  const departments = useMemo(() => {
    const set = new Set<string>();
    allStaff.forEach((s) => {
      if (s.department) set.add(s.department.toUpperCase());
    });
    return Array.from(set);
  }, [allStaff]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Compute monthly totals per employee from live Matrix Timekeeping + match confirmation status
  const employeeRows = useMemo<EmployeeConfirmationSummaryRow[]>(() => {
    return allStaff.map((staff) => {
      const { days } = getEmployeeProfileMatrixData(
        staff.employeeId,
        staff.department || 'MULTI',
        selectedYear,
        selectedMonth,
        staff
      );

      let workDaysCount = 0;
      let regularDayHours = 0;
      let regularNightHours = 0;
      let otDayHours = 0;
      let otNightHours = 0;
      let otSundayDayHours = 0;
      let otSundayNightHours = 0;
      let otHolidayDayHours = 0;
      let otHolidayNightHours = 0;

      for (let day = 1; day <= daysInMonth; day += 1) {
        const entry = days[day];
        if (!entry) continue;

        const reg = entry.regularHours || 0;
        const otDay = entry.otDayHours || 0;
        const otNight = entry.otNightHours || 0;
        const otSunDay = entry.otSundayHours || 0;
        const otSunNight = entry.otSundayNightHours || 0;
        const otHolDay = entry.otHolidayHours || 0;
        const otHolNight = entry.otHolidayNightHours || 0;

        const dayTotal = reg + otDay + otNight + otSunDay + otSunNight + otHolDay + otHolNight;
        if (dayTotal > 0 || (entry.inTime && entry.outTime)) {
          workDaysCount += 1;
        }

        const effectiveShift = entry.shift || staff.shift || 'DAY';
        if (effectiveShift === 'NIGHT') {
          regularNightHours += reg;
        } else {
          regularDayHours += reg;
        }

        otDayHours += otDay;
        otNightHours += otNight;
        otSundayDayHours += otSunDay;
        otSundayNightHours += otSunNight;
        otHolidayDayHours += otHolDay;
        otHolidayNightHours += otHolNight;
      }

      const normalizedEmpId = staff.employeeId.trim().toLowerCase();
      const confirmation = attendanceConfirmations.find(
        (c) =>
          c.month === monthKey &&
          c.employeeId.trim().toLowerCase() === normalizedEmpId &&
          c.isConfirmed
      );

      return {
        staff,
        workDaysCount,
        regularDayHours: round1(regularDayHours),
        regularNightHours: round1(regularNightHours),
        otDayHours: round1(otDayHours),
        otNightHours: round1(otNightHours),
        otSundayDayHours: round1(otSundayDayHours),
        otSundayNightHours: round1(otSundayNightHours),
        otHolidayDayHours: round1(otHolidayDayHours),
        otHolidayNightHours: round1(otHolidayNightHours),
        confirmation,
        isConfirmed: Boolean(confirmation?.isConfirmed),
      };
    });
  }, [allStaff, attendanceConfirmations, selectedYear, selectedMonth, daysInMonth, monthKey, matrixTick]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return employeeRows.filter((row) => {
      const matchSearch =
        !q ||
        row.staff.fullName.toLowerCase().includes(q) ||
        row.staff.employeeId.toLowerCase().includes(q) ||
        row.staff.position.toLowerCase().includes(q);
      const matchDept =
        filterDept === 'ALL' || (row.staff.department || '').toUpperCase() === filterDept;
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'CONFIRMED' && row.isConfirmed) ||
        (filterStatus === 'UNCONFIRMED' && !row.isConfirmed);
      return matchSearch && matchDept && matchStatus;
    });
  }, [employeeRows, searchTerm, filterDept, filterStatus]);

  const totals = useMemo(() => {
    let confirmedCount = 0;
    let workDays = 0;
    let regDay = 0;
    let regNight = 0;
    let otDay = 0;
    let otNight = 0;
    let otSunDay = 0;
    let otSunNight = 0;
    let otHolDay = 0;
    let otHolNight = 0;

    filteredRows.forEach((r) => {
      if (r.isConfirmed) confirmedCount += 1;
      workDays += r.workDaysCount;
      regDay += r.regularDayHours;
      regNight += r.regularNightHours;
      otDay += r.otDayHours;
      otNight += r.otNightHours;
      otSunDay += r.otSundayDayHours;
      otSunNight += r.otSundayNightHours;
      otHolDay += r.otHolidayDayHours;
      otHolNight += r.otHolidayNightHours;
    });

    return {
      confirmedCount,
      unconfirmedCount: filteredRows.length - confirmedCount,
      workDays,
      regDay: round1(regDay),
      regNight: round1(regNight),
      otDay: round1(otDay),
      otNight: round1(otNight),
      otSunDay: round1(otSunDay),
      otSunNight: round1(otSunNight),
      otHolDay: round1(otHolDay),
      otHolNight: round1(otHolNight),
      totalRegular: round1(regDay + regNight),
      totalOt: round1(otDay + otNight + otSunDay + otSunNight + otHolDay + otHolNight),
    };
  }, [filteredRows]);

  const canManageStatus = userRole === 'admin' || userRole === 'hr';

  const handleResetConfirmation = (empId: string) => {
    const target = empId.trim().toLowerCase();
    const next = attendanceConfirmations.filter(
      (c) => !(c.month === monthKey && c.employeeId.trim().toLowerCase() === target)
    );
    onUpdateAttendanceConfirmation(next);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const headers = [
      'STT',
      'Mã Nhân Viên',
      'Họ và Tên Nhân Viên',
      'Bộ Phận',
      'Ca Mặc Định',
      'Tổng Ngày Công',
      'Tổng Giờ Công Ngày (h)',
      'Tổng Giờ Công Đêm (h)',
      'Tổng Tăng Ca Ngày (h)',
      'Tổng Tăng Ca Đêm (h)',
      'Tổng Tăng Ca Ngày Chủ Nhật (h)',
      'Tổng Tăng Ca Đêm Chủ Nhật (h)',
      'Tổng Tăng Ca Ngày Lễ (h)',
      'Tổng Tăng Ca Đêm Lễ (h)',
      'Trạng Thái Xác Nhận',
      'Thời Gian Xác Nhận',
    ];

    const data = filteredRows.map((r, idx) => [
      idx + 1,
      r.staff.employeeId,
      r.staff.fullName,
      r.staff.department || 'MULTI',
      r.staff.shift === 'NIGHT' ? 'Ca Đêm' : 'Ca Ngày',
      r.workDaysCount,
      r.regularDayHours,
      r.regularNightHours,
      r.otDayHours,
      r.otNightHours,
      r.otSundayDayHours,
      r.otSundayNightHours,
      r.otHolidayDayHours,
      r.otHolidayNightHours,
      r.isConfirmed ? 'Đã xác nhận đủ công' : 'Chưa xác nhận',
      r.confirmation?.confirmedAt || '',
    ]);

    const summaryRow = [
      '',
      '',
      'TỔNG CỘNG',
      '',
      '',
      totals.workDays,
      totals.regDay,
      totals.regNight,
      totals.otDay,
      totals.otNight,
      totals.otSunDay,
      totals.otSunNight,
      totals.otHolDay,
      totals.otHolNight,
      `${totals.confirmedCount}/${filteredRows.length} đã xác nhận`,
      '',
    ];

    const ws = XLSX.utils.aoa_to_sheet([
      [`BẢNG TỔNG HỢP XÁC NHẬN CÔNG NHÂN VIÊN - THÁNG ${selectedMonth}/${selectedYear}`],
      [],
      headers,
      ...data,
      summaryRow,
    ]);

    XLSX.utils.book_append_sheet(wb, ws, `Xac_Nhan_Cong_T${selectedMonth}_${selectedYear}`);
    XLSX.writeFile(wb, `Xac_Nhan_Cong_Nhan_Vien_T${selectedMonth}_${selectedYear}.xlsx`);
  };

  return (
    <div className="p-3 sm:p-6 max-w-[100vw] space-y-4">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center gap-2 uppercase tracking-wide">
              <span>Xác Nhận Công — Danh Sách Tất Cả Nhân Viên</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                T{selectedMonth}/{selectedYear}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Tổng hợp ngày công, giờ công ngày/đêm, tăng ca ngày/đêm/Chủ Nhật/ngày lễ &amp; đồng bộ trạng thái xác nhận từ Hồ sơ nhân viên.
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
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
              onClick={handleNextMonth}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên, mã NV..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 w-44 focus:border-cyan-500 focus:outline-hidden"
            />
          </div>

          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-hidden"
          >
            <option value="ALL">Tất cả bộ phận</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'CONFIRMED' | 'UNCONFIRMED')}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-hidden"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CONFIRMED">Đã xác nhận đủ công</option>
            <option value="UNCONFIRMED">Chưa xác nhận</option>
          </select>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
            <span>Danh Sách Nhân Viên</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {filteredRows.length}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">nhân viên</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Tổng {totals.workDays} ngày công
          </div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-700/50 p-3.5 rounded-xl">
          <div className="text-[10px] text-emerald-300 uppercase font-semibold flex items-center justify-between">
            <span>Đã Xác Nhận Đủ Công</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {totals.confirmedCount}
            <span className="text-xs font-sans font-normal text-emerald-300/80 ml-1">
              / {filteredRows.length} NV
            </span>
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">
            Cập nhật từ Hồ sơ nhân viên
          </div>
        </div>

        <div className="bg-amber-950/25 border border-amber-700/50 p-3.5 rounded-xl">
          <div className="text-[10px] text-amber-300 uppercase font-semibold flex items-center justify-between">
            <span>Chưa Xác Nhận</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {totals.unconfirmedCount}
            <span className="text-xs font-sans font-normal text-amber-300/80 ml-1">NV</span>
          </div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">
            Đang chờ nhân viên xác nhận
          </div>
        </div>

        <div className="bg-cyan-950/25 border border-cyan-700/50 p-3.5 rounded-xl">
          <div className="text-[10px] text-cyan-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng Giờ Công &amp; Tăng Ca</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
            {round1(totals.totalRegular + totals.totalOt)}h
          </div>
          <div className="text-[10px] text-cyan-400/80 mt-0.5 font-mono">
            Công: {totals.totalRegular}h · TC: {totals.totalOt}h
          </div>
        </div>
      </div>

      {/* Main Confirmation Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="w-full overflow-x-auto overflow-y-auto custom-scrollbar max-h-[68vh]">
          <table className="w-full min-w-[1280px] text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-300 uppercase text-[10px] tracking-wider sticky top-0 z-20 shadow-md">
              <tr className="border-b border-slate-800">
                <th className="py-3 px-2.5 text-center border-r border-slate-800 w-[46px] sm:sticky sm:left-0 sm:z-30 bg-slate-950">
                  STT
                </th>
                <th className="py-3 px-3 border-r border-slate-800 min-w-[210px] sm:sticky sm:left-[46px] sm:z-30 bg-slate-950">
                  Danh Sách Tất Cả Nhân Viên
                </th>
                <th className="py-3 px-2.5 text-center border-r border-slate-800 text-white font-bold whitespace-nowrap">
                  Tổng Ngày Công
                </th>
                <th className="py-3 px-2.5 text-center border-r border-slate-800 text-emerald-400 font-bold whitespace-nowrap">
                  Tổng Giờ Công Ngày
                </th>
                <th className="py-3 px-2.5 text-center border-r border-slate-800 text-teal-300 font-bold whitespace-nowrap">
                  Tổng Giờ Công Đêm
                </th>
                <th className="py-3 px-2.5 text-center border-r border-slate-800 text-amber-400 font-bold whitespace-nowrap">
                  Tổng Tăng Ca Ngày
                </th>
                <th className="py-3 px-2.5 text-center border-r border-slate-800 text-purple-300 font-bold whitespace-nowrap">
                  Tổng Tăng Ca Đêm
                </th>
                <th className="py-3 px-2.5 text-center border-r border-slate-800 text-pink-400 font-bold whitespace-nowrap">
                  Tổng TC Ngày Chủ Nhật
                </th>
                <th className="py-3 px-2.5 text-center border-r border-slate-800 text-fuchsia-300 font-bold whitespace-nowrap">
                  Tổng TC Đêm Chủ Nhật
                </th>
                <th className="py-3 px-2.5 text-center border-r border-slate-800 text-red-400 font-bold whitespace-nowrap">
                  Tổng TC Ngày Lễ
                </th>
                <th className="py-3 px-2.5 text-center border-r border-slate-800 text-orange-400 font-bold whitespace-nowrap">
                  Tổng TC Đêm Lễ
                </th>
                <th className="py-3 px-3 text-center min-w-[195px] bg-slate-950 text-cyan-300 font-bold whitespace-nowrap">
                  Trạng Thái
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70 text-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    Không có nhân viên phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr
                    key={row.staff.employeeId}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-2.5 px-2.5 text-center font-mono text-slate-400 border-r border-slate-800 sm:sticky sm:left-0 sm:z-10 bg-slate-950 group-hover:bg-slate-900">
                      {idx + 1}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-800 sm:sticky sm:left-[46px] sm:z-10 bg-slate-950 group-hover:bg-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onViewProfile?.(row.staff)}
                            className="font-bold text-cyan-300 hover:text-cyan-200 hover:underline text-xs text-left truncate block max-w-[165px] cursor-pointer"
                            title="Nhấn để mở Hồ sơ nhân viên"
                          >
                            {row.staff.fullName}
                          </button>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span className="text-slate-300">{row.staff.employeeId}</span>
                            <span>·</span>
                            <span>{row.staff.department}</span>
                            <span>·</span>
                            <span className={row.staff.shift === 'NIGHT' ? 'text-purple-400' : 'text-amber-400'}>
                              {row.staff.shift === 'NIGHT' ? 'Ca Đêm' : 'Ca Ngày'}
                            </span>
                          </div>
                        </div>
                        {onViewProfile && (
                          <button
                            type="button"
                            onClick={() => onViewProfile(row.staff)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-300 cursor-pointer shrink-0"
                            title="Xem hồ sơ nhân viên"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-white border-r border-slate-800">
                      {row.workDaysCount} ngày
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-emerald-400 bg-emerald-950/15 border-r border-slate-800">
                      {row.regularDayHours > 0 ? `${row.regularDayHours}h` : '—'}
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-teal-300 bg-teal-950/15 border-r border-slate-800">
                      {row.regularNightHours > 0 ? `${row.regularNightHours}h` : '—'}
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-amber-400 bg-amber-950/10 border-r border-slate-800">
                      {row.otDayHours > 0 ? `${row.otDayHours}h` : '—'}
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-purple-300 bg-purple-950/10 border-r border-slate-800">
                      {row.otNightHours > 0 ? `${row.otNightHours}h` : '—'}
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-pink-400 bg-pink-950/10 border-r border-slate-800">
                      {row.otSundayDayHours > 0 ? `${row.otSundayDayHours}h` : '—'}
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-fuchsia-300 bg-fuchsia-950/10 border-r border-slate-800">
                      {row.otSundayNightHours > 0 ? `${row.otSundayNightHours}h` : '—'}
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-red-400 bg-red-950/10 border-r border-slate-800">
                      {row.otHolidayDayHours > 0 ? `${row.otHolidayDayHours}h` : '—'}
                    </td>

                    <td className="py-2.5 px-2.5 text-center font-mono font-bold text-orange-400 bg-orange-950/10 border-r border-slate-800">
                      {row.otHolidayNightHours > 0 ? `${row.otHolidayNightHours}h` : '—'}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {row.isConfirmed ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/75 text-emerald-300 border border-emerald-500/50 text-[11px] font-bold whitespace-nowrap">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Đã xác nhận đủ công</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            {row.confirmation?.confirmedAt && (
                              <span>{row.confirmation.confirmedAt}</span>
                            )}
                            {canManageStatus && (
                              <button
                                type="button"
                                onClick={() => handleResetConfirmation(row.staff.employeeId)}
                                className="text-slate-400 hover:text-amber-300 inline-flex items-center gap-0.5 underline cursor-pointer"
                                title="Đặt lại về Chưa xác nhận"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Đặt lại</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/50 text-amber-300 border border-amber-500/40 text-[11px] font-semibold whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Chưa xác nhận</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot className="bg-slate-950 border-t-2 border-slate-700 font-mono text-xs sticky bottom-0 z-20">
              <tr>
                <td
                  colSpan={2}
                  className="py-2.5 px-3 font-sans font-bold text-cyan-300 uppercase border-r border-slate-800 sm:sticky sm:left-0 sm:z-30 bg-slate-950"
                >
                  Tổng Hợp ({filteredRows.length} Nhân Viên)
                </td>
                <td className="py-2.5 px-2.5 text-center font-bold text-white border-r border-slate-800">
                  {totals.workDays} ngày
                </td>
                <td className="py-2.5 px-2.5 text-center font-bold text-emerald-400 border-r border-slate-800">
                  {totals.regDay}h
                </td>
                <td className="py-2.5 px-2.5 text-center font-bold text-teal-300 border-r border-slate-800">
                  {totals.regNight}h
                </td>
                <td className="py-2.5 px-2.5 text-center font-bold text-amber-400 border-r border-slate-800">
                  {totals.otDay}h
                </td>
                <td className="py-2.5 px-2.5 text-center font-bold text-purple-300 border-r border-slate-800">
                  {totals.otNight}h
                </td>
                <td className="py-2.5 px-2.5 text-center font-bold text-pink-400 border-r border-slate-800">
                  {totals.otSunDay}h
                </td>
                <td className="py-2.5 px-2.5 text-center font-bold text-fuchsia-300 border-r border-slate-800">
                  {totals.otSunNight}h
                </td>
                <td className="py-2.5 px-2.5 text-center font-bold text-red-400 border-r border-slate-800">
                  {totals.otHolDay}h
                </td>
                <td className="py-2.5 px-2.5 text-center font-bold text-orange-400 border-r border-slate-800">
                  {totals.otHolNight}h
                </td>
                <td className="py-2.5 px-3 text-center font-sans text-[11px] font-bold">
                  <span className="text-emerald-400">{totals.confirmedCount} đã xác nhận</span>
                  <span className="text-slate-500 mx-1">·</span>
                  <span className="text-amber-400">{totals.unconfirmedCount} chưa XN</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
