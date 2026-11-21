import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PayrollRecord, StaffRecord } from '../../types';
import {
  ClipboardCheck,
  Search,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Users,
  Clock,
  Sun,
  CalendarHeart,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getEmployeeProfileMatrixData,
  MATRIX_UPDATED_EVENT,
} from '../../lib/matrixTimekeeping';

interface HRPayrollProps {
  payrollRecords: PayrollRecord[];
  setPayrollRecords: (p: PayrollRecord[]) => void;
  allStaff: StaffRecord[];
  onViewProfile?: (staff: StaffRecord) => void;
}

interface MonthlySummaryStats {
  month: number;
  workDays: number;
  otDayHours: number;
  otNightHours: number;
  sundayDayHours: number;
  sundayNightHours: number;
  holidayDayHours: number;
  holidayNightHours: number;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

const formatMetric = (val: number, suffix = '') => {
  if (!val || val === 0) return '—';
  const rounded = round1(val);
  return `${rounded}${suffix}`;
};

export const HRPayroll: React.FC<HRPayrollProps> = ({
  allStaff,
  onViewProfile,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterShift, setFilterShift] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [focusedMonth, setFocusedMonth] = useState<number | 'ALL'>('ALL');
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const monthHeaderRefs = useRef<Record<number, HTMLTableCellElement | null>>({});

  useEffect(() => {
    const handleSync = () => setRefreshTick((t) => t + 1);
    window.addEventListener(MATRIX_UPDATED_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(MATRIX_UPDATED_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const departments = useMemo(() => {
    const set = new Set<string>();
    allStaff.forEach((s) => {
      if (s.department) set.add(s.department.toUpperCase());
    });
    return Array.from(set);
  }, [allStaff]);

  const filteredStaff = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allStaff.filter((s) => {
      const matchSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.employeeId.toLowerCase().includes(q);
      const matchDept =
        filterDept === 'ALL' ||
        (s.department || 'MULTI').toUpperCase() === filterDept.toUpperCase();
      const matchShift = filterShift === 'ALL' || (s.shift || 'DAY') === filterShift;
      return matchSearch && matchDept && matchShift;
    });
  }, [allStaff, searchTerm, filterDept, filterShift]);

  const displayedMonths = useMemo(() => {
    if (focusedMonth === 'ALL') return [...MONTHS];
    return [focusedMonth];
  }, [focusedMonth]);

  // Compute monthly totals (months 1..12) for every filtered employee
  const staffYearRows = useMemo(() => {
    return filteredStaff.map((staff) => {
      const monthsMap: Record<number, MonthlySummaryStats> = {};
      let yearWorkDays = 0;
      let yearOtHours = 0;
      let yearSundayHours = 0;
      let yearHolidayHours = 0;

      MONTHS.forEach((m) => {
        const daysInMonth = new Date(selectedYear, m, 0).getDate();
        const { days } = getEmployeeProfileMatrixData(
          staff.employeeId,
          staff.department || 'MULTI',
          selectedYear,
          m,
          staff
        );

        let workDays = 0;
        let otDayHours = 0;
        let otNightHours = 0;
        let sundayDayHours = 0;
        let sundayNightHours = 0;
        let holidayDayHours = 0;
        let holidayNightHours = 0;

        for (let d = 1; d <= daysInMonth; d += 1) {
          const entry = days[d];
          if (!entry) continue;

          const reg = entry.regularHours || 0;
          const otD = entry.otDayHours || 0;
          const otN = entry.otNightHours || 0;
          const sunD = entry.otSundayHours || 0;
          const sunN = entry.otSundayNightHours || 0;
          const holD = entry.otHolidayHours || 0;
          const holN = entry.otHolidayNightHours || 0;

          const totalHrs = reg + otD + otN + sunD + sunN + holD + holN;
          if (totalHrs > 0 || (entry.inTime && entry.outTime)) {
            workDays += 1;
          }

          otDayHours += otD;
          otNightHours += otN;
          sundayDayHours += sunD;
          sundayNightHours += sunN;
          holidayDayHours += holD;
          holidayNightHours += holN;
        }

        const stats: MonthlySummaryStats = {
          month: m,
          workDays,
          otDayHours: round1(otDayHours),
          otNightHours: round1(otNightHours),
          sundayDayHours: round1(sundayDayHours),
          sundayNightHours: round1(sundayNightHours),
          holidayDayHours: round1(holidayDayHours),
          holidayNightHours: round1(holidayNightHours),
        };
        monthsMap[m] = stats;

        yearWorkDays += workDays;
        yearOtHours += stats.otDayHours + stats.otNightHours;
        yearSundayHours += stats.sundayDayHours + stats.sundayNightHours;
        yearHolidayHours += stats.holidayDayHours + stats.holidayNightHours;
      });

      return {
        staff,
        months: monthsMap,
        yearWorkDays,
        yearOtHours: round1(yearOtHours),
        yearSundayHours: round1(yearSundayHours),
        yearHolidayHours: round1(yearHolidayHours),
      };
    });
  }, [filteredStaff, selectedYear, refreshTick]);

  // Grand totals per month (across displayed staff)
  const monthlyGrandTotals = useMemo(() => {
    const totals: Record<number, MonthlySummaryStats> = {};
    MONTHS.forEach((m) => {
      totals[m] = {
        month: m,
        workDays: 0,
        otDayHours: 0,
        otNightHours: 0,
        sundayDayHours: 0,
        sundayNightHours: 0,
        holidayDayHours: 0,
        holidayNightHours: 0,
      };
    });

    staffYearRows.forEach((row) => {
      MONTHS.forEach((m) => {
        const s = row.months[m];
        totals[m].workDays += s.workDays;
        totals[m].otDayHours = round1(totals[m].otDayHours + s.otDayHours);
        totals[m].otNightHours = round1(totals[m].otNightHours + s.otNightHours);
        totals[m].sundayDayHours = round1(totals[m].sundayDayHours + s.sundayDayHours);
        totals[m].sundayNightHours = round1(totals[m].sundayNightHours + s.sundayNightHours);
        totals[m].holidayDayHours = round1(totals[m].holidayDayHours + s.holidayDayHours);
        totals[m].holidayNightHours = round1(totals[m].holidayNightHours + s.holidayNightHours);
      });
    });

    return totals;
  }, [staffYearRows]);

  const kpiSummary = useMemo(() => {
    return displayedMonths.reduce(
      (acc, m) => {
        const t = monthlyGrandTotals[m];
        return {
          workDays: acc.workDays + t.workDays,
          otHours: round1(acc.otHours + t.otDayHours + t.otNightHours),
          sundayHours: round1(acc.sundayHours + t.sundayDayHours + t.sundayNightHours),
          holidayHours: round1(acc.holidayHours + t.holidayDayHours + t.holidayNightHours),
        };
      },
      { workDays: 0, otHours: 0, sundayHours: 0, holidayHours: 0 }
    );
  }, [displayedMonths, monthlyGrandTotals]);

  const handleSelectMonthFocus = (m: number | 'ALL') => {
    setFocusedMonth(m);
    if (m !== 'ALL') {
      // Wait next frame if needed, or scroll if returning to ALL
      return;
    }
  };

  const handleJumpToMonthScroll = (m: number) => {
    if (focusedMonth !== 'ALL') {
      setFocusedMonth('ALL');
      setTimeout(() => {
        const el = monthHeaderRefs.current[m];
        const container = tableScrollRef.current;
        if (el && container) {
          container.scrollTo({
            left: Math.max(0, el.offsetLeft - 270),
            behavior: 'smooth',
          });
        }
      }, 60);
      return;
    }
    const el = monthHeaderRefs.current[m];
    const container = tableScrollRef.current;
    if (el && container) {
      container.scrollTo({
        left: Math.max(0, el.offsetLeft - 270),
        behavior: 'smooth',
      });
    }
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const headerRow1: (string | number)[] = ['Họ Tên Nhân Viên', 'Mã Nhân Viên'];
    const headerRow2: string[] = ['', ''];
    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
    ];

    let colCursor = 2;
    displayedMonths.forEach((m) => {
      headerRow1.push(`Tháng ${m}/${selectedYear}`, '', '', '', '', '', '');
      headerRow2.push(
        'Ngày công',
        'TC Ngày',
        'TC Đêm',
        'CN Ngày',
        'CN Đêm',
        'Ngày Lễ',
        'Đêm Lễ'
      );
      merges.push({
        s: { r: 0, c: colCursor },
        e: { r: 0, c: colCursor + 6 },
      });
      colCursor += 7;
    });

    const aoa: (string | number)[][] = [headerRow1, headerRow2];

    staffYearRows.forEach((row) => {
      const dataRow: (string | number)[] = [row.staff.fullName, row.staff.employeeId];
      displayedMonths.forEach((m) => {
        const s = row.months[m];
        dataRow.push(
          s.workDays,
          s.otDayHours,
          s.otNightHours,
          s.sundayDayHours,
          s.sundayNightHours,
          s.holidayDayHours,
          s.holidayNightHours
        );
      });
      aoa.push(dataRow);
    });

    // Totals row
    const totalRow: (string | number)[] = [`TỔNG CỘNG (${staffYearRows.length} NV)`, ''];
    displayedMonths.forEach((m) => {
      const t = monthlyGrandTotals[m];
      totalRow.push(
        t.workDays,
        t.otDayHours,
        t.otNightHours,
        t.sundayDayHours,
        t.sundayNightHours,
        t.holidayDayHours,
        t.holidayNightHours
      );
    });
    aoa.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 24 },
      { wch: 14 },
      ...displayedMonths.flatMap(() => [
        { wch: 10 },
        { wch: 9 },
        { wch: 9 },
        { wch: 9 },
        { wch: 9 },
        { wch: 9 },
        { wch: 9 },
      ]),
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Bang_Cong_${selectedYear}`);
    XLSX.writeFile(wb, `Bang_Cong_Tong_Hop_HCNS_${selectedYear}.xlsx`);
    setToastMsg(`Đã xuất file Excel Bảng công tổng hợp năm ${selectedYear} thành công!`);
    window.setTimeout(() => setToastMsg(null), 3500);
  };

  const currentCalendarYear = now.getFullYear();
  const currentCalendarMonth = now.getMonth() + 1;

  return (
    <div className="p-4 sm:p-6 max-w-[1680px] mx-auto space-y-5 text-xs">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="px-7 sm:px-0 text-center lg:text-left">
          <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center lg:justify-start gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>BẢNG CHẤM CÔNG TỔNG HỢP 12 THÁNG (HC &amp; NS)</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-xs">
              NĂM {selectedYear}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tổng hợp số ngày công, giờ tăng ca ngày/đêm, chủ nhật ngày/đêm và ngày lễ/đêm lễ theo từng tháng từ Tháng 1 đến Tháng 12.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2">
          {/* Year Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Năm trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-white font-bold font-mono focus:outline-hidden cursor-pointer px-1"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y} className="bg-slate-900 text-white">
                  Năm {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Năm sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel ({selectedYear})</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 text-xs font-medium">
          {toastMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
            <span>Nhân Sự Hiển Thị</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
            {staffYearRows.length} <span className="text-xs font-normal text-slate-400">người</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {focusedMonth === 'ALL' ? `Tháng 1 → Tháng 12/${selectedYear}` : `Đang lọc Tháng ${focusedMonth}/${selectedYear}`}
          </div>
        </div>

        <div className="bg-emerald-950/25 border border-emerald-800/40 p-3.5 rounded-xl">
          <div className="text-[10px] text-emerald-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng Ngày Công</span>
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {kpiSummary.workDays.toLocaleString('vi-VN')} <span className="text-xs font-normal text-emerald-300/80">công</span>
          </div>
          <div className="text-[10px] text-emerald-400/75 mt-0.5">Tổng hợp ngày có chấm công</div>
        </div>

        <div className="bg-amber-950/25 border border-amber-800/40 p-3.5 rounded-xl">
          <div className="text-[10px] text-amber-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng Tăng Ca (Ngày + Đêm)</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            {kpiSummary.otHours.toLocaleString('vi-VN')}h
          </div>
          <div className="text-[10px] text-amber-400/75 mt-0.5">TC ngày thường &amp; TC ca đêm</div>
        </div>

        <div className="bg-fuchsia-950/25 border border-fuchsia-800/40 p-3.5 rounded-xl">
          <div className="text-[10px] text-fuchsia-300 uppercase font-semibold flex items-center justify-between">
            <span>Tổng CN &amp; Ngày Lễ</span>
            <CalendarHeart className="w-3.5 h-3.5 text-fuchsia-400" />
          </div>
          <div className="text-xl font-bold font-mono text-fuchsia-300 mt-1 tabular-nums">
            {round1(kpiSummary.sundayHours + kpiSummary.holidayHours).toLocaleString('vi-VN')}h
          </div>
          <div className="text-[10px] text-fuchsia-300/75 mt-0.5">
            CN: {kpiSummary.sundayHours}h · Lễ: {kpiSummary.holidayHours}h
          </div>
        </div>
      </div>

      {/* Filters & Month Quick Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm họ tên, mã NV..."
                className="w-full sm:w-56 bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 cursor-pointer"
            >
              <option value="ALL">Tất cả bộ phận</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value as 'ALL' | 'DAY' | 'NIGHT')}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 cursor-pointer"
            >
              <option value="ALL">Tất cả ca</option>
              <option value="DAY">Ca Ngày</option>
              <option value="NIGHT">Ca Đêm</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Nhấn vào tên nhân viên để xem hồ sơ chi tiết · Cuộn ngang để xem Tháng 1 → 12</span>
          </div>
        </div>

        {/* Month filter & quick scroll bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/70">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mr-1">
            Hiển thị:
          </span>
          <button
            type="button"
            onClick={() => handleSelectMonthFocus('ALL')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
              focusedMonth === 'ALL'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            Tất cả T1–T12
          </button>

          {MONTHS.map((m) => {
            const isCurrent = selectedYear === currentCalendarYear && m === currentCalendarMonth;
            const isFocused = focusedMonth === m;
            return (
              <div key={m} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() =>
                    focusedMonth === 'ALL' ? handleJumpToMonthScroll(m) : setFocusedMonth(m)
                  }
                  onDoubleClick={() => setFocusedMonth(isFocused ? 'ALL' : m)}
                  title={
                    focusedMonth === 'ALL'
                      ? `Cuộn tới cột Tháng ${m} (nhấn đúp để lọc riêng Tháng ${m})`
                      : `Xem riêng Tháng ${m}`
                  }
                  className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors cursor-pointer ${
                    isFocused
                      ? 'bg-cyan-600 text-white border-cyan-500'
                      : isCurrent
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/70 hover:bg-emerald-900/70'
                      : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  T{m}
                </button>
              </div>
            );
          })}

          {focusedMonth === 'ALL' && (
            <button
              type="button"
              onClick={() => handleJumpToMonthScroll(currentCalendarMonth)}
              className="ml-auto px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-700/60 cursor-pointer transition-colors"
            >
              Cuộn tới tháng hiện tại (T{currentCalendarMonth})
            </button>
          )}
        </div>
      </div>

      {/* Main 12-Month Timekeeping Summary Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div
          ref={tableScrollRef}
          className="overflow-auto custom-scrollbar max-h-[70vh] relative"
        >
          <table className="w-full border-collapse text-left text-[11px]">
            <thead className="sticky top-0 z-20 bg-slate-950">
              {/* Row 1: Left Sticky Info + Month 1..12 Group Headers */}
              <tr className="border-b border-slate-800 text-slate-200 uppercase text-[10px] tracking-wider">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-30 bg-slate-950 py-3 px-3 border-r border-slate-800 w-[180px] min-w-[180px] max-w-[180px] font-bold text-white align-middle"
                >
                  Họ Tên Nhân Viên
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-[180px] z-30 bg-slate-950 py-3 px-2.5 border-r border-slate-700 w-[104px] min-w-[104px] max-w-[104px] font-bold text-cyan-300 align-middle shadow-[4px_0_12px_rgba(0,0,0,0.65)]"
                >
                  Mã Nhân Viên
                </th>

                {displayedMonths.map((m) => {
                  const isCurrent =
                    selectedYear === currentCalendarYear && m === currentCalendarMonth;
                  return (
                    <th
                      key={m}
                      ref={(el) => {
                        monthHeaderRefs.current[m] = el;
                      }}
                      colSpan={7}
                      className={`py-2 px-2 text-center border-r border-slate-700 font-extrabold text-xs ${
                        isCurrent
                          ? 'bg-emerald-950/60 text-emerald-300'
                          : m % 2 === 1
                          ? 'bg-slate-900/95 text-cyan-300'
                          : 'bg-slate-950 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Tháng {m}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">
                            Hiện tại
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* Row 2: 7 Sub-columns under each Month */}
              <tr className="border-b border-slate-700 text-[10px] font-bold uppercase tracking-tight">
                {displayedMonths.map((m) => {
                  const bgAlt = m % 2 === 1 ? 'bg-slate-900/90' : 'bg-slate-950';
                  return (
                    <React.Fragment key={`sub-${m}`}>
                      <th
                        className={`py-2 px-2 text-center border-r border-slate-800 text-emerald-300 whitespace-nowrap min-w-[68px] ${bgAlt}`}
                        title="Số ngày công trong tháng"
                      >
                        Ngày công
                      </th>
                      <th
                        className={`py-2 px-2 text-center border-r border-slate-800 text-amber-300 whitespace-nowrap min-w-[64px] ${bgAlt}`}
                        title="Giờ tăng ca ngày"
                      >
                        TC Ngày
                      </th>
                      <th
                        className={`py-2 px-2 text-center border-r border-slate-800 text-purple-300 whitespace-nowrap min-w-[64px] ${bgAlt}`}
                        title="Giờ tăng ca đêm"
                      >
                        TC Đêm
                      </th>
                      <th
                        className={`py-2 px-2 text-center border-r border-slate-800 text-pink-300 whitespace-nowrap min-w-[66px] ${bgAlt}`}
                        title="Tăng ca Chủ Nhật ca ngày"
                      >
                        CN Ngày
                      </th>
                      <th
                        className={`py-2 px-2 text-center border-r border-slate-800 text-fuchsia-300 whitespace-nowrap min-w-[66px] ${bgAlt}`}
                        title="Tăng ca Chủ Nhật ca đêm"
                      >
                        CN Đêm
                      </th>
                      <th
                        className={`py-2 px-2 text-center border-r border-slate-800 text-rose-300 whitespace-nowrap min-w-[66px] ${bgAlt}`}
                        title="Giờ làm Ngày Lễ"
                      >
                        Ngày Lễ
                      </th>
                      <th
                        className={`py-2 px-2 text-center border-r border-slate-700 text-orange-300 whitespace-nowrap min-w-[66px] ${bgAlt}`}
                        title="Giờ làm Đêm Lễ"
                      >
                        Đêm Lễ
                      </th>
                    </React.Fragment>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70">
              {staffYearRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + displayedMonths.length * 7}
                    className="py-12 text-center text-slate-500 text-xs"
                  >
                    Không tìm thấy nhân viên phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                staffYearRows.map(({ staff, months }) => (
                  <tr
                    key={staff.employeeId}
                    className="hover:bg-slate-800/45 transition-colors group"
                  >
                    {/* Sticky Họ Tên */}
                    <td className="sticky left-0 z-10 bg-slate-950 group-hover:bg-slate-900 py-2.5 px-3 border-r border-slate-800 w-[180px] min-w-[180px] max-w-[180px]">
                      <button
                        type="button"
                        onClick={() => onViewProfile?.(staff)}
                        title="Nhấn để xem hồ sơ nhân viên"
                        className="font-bold text-slate-100 group-hover:text-cyan-300 hover:underline text-left truncate block w-full cursor-pointer"
                      >
                        {staff.fullName}
                      </button>
                      <div className="text-[10px] text-slate-400 truncate">
                        {staff.department || 'MULTI'} ·{' '}
                        <span className={staff.shift === 'NIGHT' ? 'text-purple-400' : 'text-amber-400'}>
                          {staff.shift === 'NIGHT' ? 'Ca Đêm' : 'Ca Ngày'}
                        </span>
                      </div>
                    </td>

                    {/* Sticky Mã NV */}
                    <td
                      onClick={() => onViewProfile?.(staff)}
                      title="Nhấn để xem hồ sơ nhân viên"
                      className="sticky left-[180px] z-10 bg-slate-950 group-hover:bg-slate-900 py-2.5 px-2.5 border-r border-slate-700 w-[104px] min-w-[104px] max-w-[104px] font-mono font-bold text-cyan-400 hover:text-cyan-200 cursor-pointer whitespace-nowrap shadow-[4px_0_12px_rgba(0,0,0,0.65)]"
                    >
                      {staff.employeeId}
                    </td>

                    {/* Months 1..12 Data Cells */}
                    {displayedMonths.map((m) => {
                      const s = months[m];
                      const altShade = m % 2 === 1 ? 'bg-slate-900/35' : '';
                      return (
                        <React.Fragment key={`${staff.employeeId}-m${m}`}>
                          <td
                            className={`py-2 px-2 text-center border-r border-slate-800/80 font-mono font-bold tabular-nums ${
                              s.workDays > 0 ? 'text-emerald-400' : 'text-slate-600'
                            } ${altShade}`}
                          >
                            {s.workDays > 0 ? s.workDays : '—'}
                          </td>
                          <td
                            className={`py-2 px-2 text-center border-r border-slate-800/80 font-mono tabular-nums ${
                              s.otDayHours > 0 ? 'text-amber-400 font-semibold' : 'text-slate-600'
                            } ${altShade}`}
                          >
                            {formatMetric(s.otDayHours, 'h')}
                          </td>
                          <td
                            className={`py-2 px-2 text-center border-r border-slate-800/80 font-mono tabular-nums ${
                              s.otNightHours > 0 ? 'text-purple-400 font-semibold' : 'text-slate-600'
                            } ${altShade}`}
                          >
                            {formatMetric(s.otNightHours, 'h')}
                          </td>
                          <td
                            className={`py-2 px-2 text-center border-r border-slate-800/80 font-mono tabular-nums ${
                              s.sundayDayHours > 0 ? 'text-pink-400 font-semibold' : 'text-slate-600'
                            } ${altShade}`}
                          >
                            {formatMetric(s.sundayDayHours, 'h')}
                          </td>
                          <td
                            className={`py-2 px-2 text-center border-r border-slate-800/80 font-mono tabular-nums ${
                              s.sundayNightHours > 0 ? 'text-fuchsia-400 font-semibold' : 'text-slate-600'
                            } ${altShade}`}
                          >
                            {formatMetric(s.sundayNightHours, 'h')}
                          </td>
                          <td
                            className={`py-2 px-2 text-center border-r border-slate-800/80 font-mono tabular-nums ${
                              s.holidayDayHours > 0 ? 'text-rose-400 font-semibold' : 'text-slate-600'
                            } ${altShade}`}
                          >
                            {formatMetric(s.holidayDayHours, 'h')}
                          </td>
                          <td
                            className={`py-2 px-2 text-center border-r border-slate-700 font-mono tabular-nums ${
                              s.holidayNightHours > 0 ? 'text-orange-400 font-semibold' : 'text-slate-600'
                            } ${altShade}`}
                          >
                            {formatMetric(s.holidayNightHours, 'h')}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>

            {/* Footer Totals Row */}
            {staffYearRows.length > 0 && (
              <tfoot className="sticky bottom-0 z-20 bg-slate-950 border-t-2 border-slate-700">
                <tr className="font-mono font-bold text-[11px]">
                  <td className="sticky left-0 z-30 bg-slate-950 py-2.5 px-3 border-r border-slate-800 text-white font-sans uppercase text-[10px] tracking-wider">
                    Tổng Cộng ({staffYearRows.length} NV)
                  </td>
                  <td className="sticky left-[180px] z-30 bg-slate-950 py-2.5 px-2.5 border-r border-slate-700 text-cyan-400 text-[10px] shadow-[4px_0_12px_rgba(0,0,0,0.65)]">
                    Năm {selectedYear}
                  </td>

                  {displayedMonths.map((m) => {
                    const t = monthlyGrandTotals[m];
                    return (
                      <React.Fragment key={`total-${m}`}>
                        <td className="py-2.5 px-2 text-center border-r border-slate-800 text-emerald-400 tabular-nums">
                          {t.workDays > 0 ? t.workDays : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-center border-r border-slate-800 text-amber-400 tabular-nums">
                          {formatMetric(t.otDayHours, 'h')}
                        </td>
                        <td className="py-2.5 px-2 text-center border-r border-slate-800 text-purple-400 tabular-nums">
                          {formatMetric(t.otNightHours, 'h')}
                        </td>
                        <td className="py-2.5 px-2 text-center border-r border-slate-800 text-pink-400 tabular-nums">
                          {formatMetric(t.sundayDayHours, 'h')}
                        </td>
                        <td className="py-2.5 px-2 text-center border-r border-slate-800 text-fuchsia-400 tabular-nums">
                          {formatMetric(t.sundayNightHours, 'h')}
                        </td>
                        <td className="py-2.5 px-2 text-center border-r border-slate-800 text-rose-400 tabular-nums">
                          {formatMetric(t.holidayDayHours, 'h')}
                        </td>
                        <td className="py-2.5 px-2 text-center border-r border-slate-700 text-orange-400 tabular-nums">
                          {formatMetric(t.holidayNightHours, 'h')}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
