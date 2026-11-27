import React, { useState, useMemo, useEffect } from 'react';
import {
  StaffRecord,
  AttendanceRecord,
  OvertimeRecord,
  HRAnnouncement,
  UserAccount,
  LeaveRegistrationRecord,
  AttendanceCorrectionRequest,
  MachineSwipeRecord,
} from '../../types';
import {
  getEmployeeProfileMatrixData,
  MATRIX_UPDATED_EVENT,
  parseBackupDateToIso,
} from '../../lib/matrixTimekeeping';
import {
  buildComparisonRowForEmployeeDay,
  getMachineSwipeStorageKey,
} from '../hr/HRTimekeeping';
import {
  Factory,
  Users,
  ArrowUpRight,
  Megaphone,
  CalendarDays,
  Plus,
  ClipboardCheck,
  Banknote,
  ShieldAlert,
  Sun,
  Moon,
  Timer,
  CheckCircle2,
  AlertTriangle,
  UserX,
  Award,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
} from 'lucide-react';

interface DashboardProps {
  multiStaff: StaffRecord[];
  hrStaff: StaffRecord[];
  allStaffData: StaffRecord[];
  attendanceHistory: AttendanceRecord[];
  overtimeRecords: OvertimeRecord[];
  leaveRecords?: LeaveRegistrationRecord[];
  attendanceRequests?: AttendanceCorrectionRequest[];
  announcements: HRAnnouncement[];
  onNavigate: (id: string) => void;
  onAddPlan: (p: any) => void;
  onViewProfile?: (staff: StaffRecord) => void;
  currentUser: UserAccount;
}

export const Dashboard: React.FC<DashboardProps> = ({
  multiStaff,
  hrStaff,
  allStaffData,
  overtimeRecords,
  leaveRecords = [],
  attendanceRequests = [],
  announcements,
  onNavigate,
  onAddPlan,
  onViewProfile,
  currentUser,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [targetDept, setTargetDept] = useState('Multi Auto');
  const [model, setModel] = useState('');
  const [content, setContent] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [highOtMode, setHighOtMode] = useState<'ABOVE_AVG' | 'ALL_POSITIVE'>('ALL_POSITIVE');
  const [lowOtOnlyWorked, setLowOtOnlyWorked] = useState<boolean>(true);

  useEffect(() => {
    const onUpdate = () => setRefreshTick((t) => t + 1);
    window.addEventListener(MATRIX_UPDATED_EVENT, onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener(MATRIX_UPDATED_EVENT, onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, []);

  // Manpower stats
  const totalStaffCount = allStaffData.length;
  const dayShiftCount = allStaffData.filter((s) => (s.shift || 'DAY') === 'DAY').length;
  const nightShiftCount = allStaffData.filter((s) => s.shift === 'NIGHT').length;

  // Compute attendance, OT, leave, and unexplained missing swipes per employee for selected month
  const staffAnalytics = useMemo(() => {
    const swipeStorageKey = getMachineSwipeStorageKey(selectedYear, selectedMonth);
    let swipeRecords: Record<string, MachineSwipeRecord> = {};
    try {
      const savedSwipes = localStorage.getItem(swipeStorageKey);
      if (savedSwipes) {
        swipeRecords = JSON.parse(savedSwipes) || {};
      }
    } catch {
      swipeRecords = {};
    }

    const hasAnyMachineSwipesInMonth = Object.keys(swipeRecords).length > 0;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const todayNow = new Date();
    const isFutureMonth =
      selectedYear > todayNow.getFullYear() ||
      (selectedYear === todayNow.getFullYear() && selectedMonth > todayNow.getMonth() + 1);
    const isCurrentMonth =
      selectedYear === todayNow.getFullYear() && selectedMonth === todayNow.getMonth() + 1;
    const maxCheckDay = isFutureMonth
      ? 0
      : isCurrentMonth
      ? todayNow.getDate()
      : daysInMonth;

    // Group abnormal attendance requests (NPT-FM-008) by normalized employeeId & ISO date
    const requestCoverageByEmp = new Map<
      string,
      Map<string, { inCovered: boolean; outCovered: boolean }>
    >();

    attendanceRequests.forEach((req) => {
      const empKey = (req.employeeId || '').trim().toLowerCase();
      if (!empKey) return;
      const parsedDate = parseBackupDateToIso(req.date);
      const dateIso = parsedDate ? parsedDate.iso : (req.date || '').trim();
      if (!dateIso) return;

      let empMap = requestCoverageByEmp.get(empKey);
      if (!empMap) {
        empMap = new Map();
        requestCoverageByEmp.set(empKey, empMap);
      }
      const prev = empMap.get(dateIso) || { inCovered: false, outCovered: false };
      const hasExplicitChecks =
        req.checkInChecked === true || req.checkOutChecked === true;
      const coversIn = hasExplicitChecks ? Boolean(req.checkInChecked) : true;
      const coversOut = hasExplicitChecks ? Boolean(req.checkOutChecked) : true;
      empMap.set(dateIso, {
        inCovered: prev.inCovered || coversIn,
        outCovered: prev.outCovered || coversOut,
      });
    });

    const map = new Map<
      string,
      {
        staff: StaffRecord;
        totalOt: number;
        totalLeaveDays: number;
        missingSwipeCount: number;
        explainedSwipeCount: number;
        missingDetails: Array<{ day: number; label: string }>;
        workedDays: number;
        isWorking: boolean;
        isResigned: boolean;
      }
    >();

    const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

    allStaffData.forEach((staff) => {
      const normEmpId = staff.employeeId.trim().toLowerCase();
      const dept = staff.department || 'MULTI';
      const matrixData = getEmployeeProfileMatrixData(
        staff.employeeId,
        dept,
        selectedYear,
        selectedMonth,
        staff
      );

      let staffOt = 0;
      let staffWorked = 0;
      let matrixLeaveDays = 0;
      let unexplainedMissingSwipes = 0;
      let explainedMissingSwipes = 0;
      const missingDetails: Array<{ day: number; label: string }> = [];

      const empReqMap = requestCoverageByEmp.get(normEmpId);
      const daysMap = matrixData.days || {};

      for (let day = 1; day <= daysInMonth; day++) {
        const entry = daysMap[day];
        if (entry) {
          const ot =
            (entry.otDayHours || 0) +
            (entry.otNightHours || 0) +
            (entry.otSundayHours || 0) +
            (entry.otSundayNightHours || 0) +
            (entry.otHolidayHours || 0) +
            (entry.otHolidayNightHours || 0);
          staffOt += ot;

          const totalHrsForLeave = (entry.regularHours || 0) + ot;
          const hasTimesForLeave = Boolean(
            entry.inTime &&
              entry.inTime.trim().includes(':') &&
              entry.outTime &&
              entry.outTime.trim().includes(':')
          );

          if ((entry.regularHours || 0) > 0 || ot > 0) {
            staffWorked += 1;
          }

          if (totalHrsForLeave === 0 && !hasTimesForLeave) {
            if (
              entry.status === 'Nghỉ phép' ||
              entry.status === 'Nghỉ ốm' ||
              entry.status === 'Nghỉ cưới' ||
              entry.status === 'Nghỉ tang' ||
              entry.status === 'FAMILY' ||
              entry.status === 'Vắng mặt' ||
              entry.status === 'Nghỉ KL'
            ) {
              matrixLeaveDays += 1;
            } else if ((entry.status as string) === 'Nghỉ nửa phép') {
              matrixLeaveDays += 0.5;
            }
          } else if (
            ((entry.status as string) === 'Nghỉ nửa phép' ||
              (entry.status === 'Nghỉ phép' &&
                totalHrsForLeave > 0 &&
                totalHrsForLeave <= 4 &&
                ot === 0 &&
                (entry.leaveRecordId !== undefined || String(entry.note || '').includes('Nghỉ nửa phép'))))
          ) {
            matrixLeaveDays += 0.5;
          }
        }

        const swipeRec = swipeRecords[`${normEmpId}_${day}`];
        if (day <= maxCheckDay || Boolean(swipeRec)) {
          const row = buildComparisonRowForEmployeeDay({
            staff,
            day,
            selectedYear,
            selectedMonth,
            bcEntry: entry,
            holidayMap: matrixData.holidays,
            swipeRecord: swipeRec,
          });

          if (row.hasBcWork) {
            let rawMissingIn = false;
            let rawMissingOut = false;

            if (hasAnyMachineSwipesInMonth) {
              rawMissingIn =
                row.discrepancyType === 'MISSING_IN' || row.discrepancyType === 'MISSING_BOTH';
              rawMissingOut =
                row.discrepancyType === 'MISSING_OUT' || row.discrepancyType === 'MISSING_BOTH';
            } else {
              // Fallback when no machine swipe log uploaded: count explicit incomplete BC punch days
              const hasOneSideOnly = Boolean(row.bcInTime) !== Boolean(row.bcOutTime);
              if (hasOneSideOnly || row.bcStatus === 'Thiếu giờ') {
                rawMissingIn = !row.bcInTime;
                rawMissingOut = !row.bcOutTime;
              }
            }

            if (rawMissingIn || rawMissingOut) {
              const reqCov = empReqMap?.get(row.dateIso);
              const unexpIn = rawMissingIn && !reqCov?.inCovered;
              const unexpOut = rawMissingOut && !reqCov?.outCovered;

              const expCount =
                (rawMissingIn && reqCov?.inCovered ? 1 : 0) +
                (rawMissingOut && reqCov?.outCovered ? 1 : 0);
              explainedMissingSwipes += expCount;

              if (unexpIn && unexpOut) {
                unexplainedMissingSwipes += 2;
                missingDetails.push({ day, label: `${day}/${selectedMonth} (thiếu vào & ra)` });
              } else if (unexpIn) {
                unexplainedMissingSwipes += 1;
                missingDetails.push({ day, label: `${day}/${selectedMonth} (thiếu vào)` });
              } else if (unexpOut) {
                unexplainedMissingSwipes += 1;
                missingDetails.push({ day, label: `${day}/${selectedMonth} (thiếu ra)` });
              }
            }
          }
        }
      }

      // Count leaves from leaveRecords for this employee in selectedMonth
      const empLeaves = leaveRecords.filter((r) => {
        const matchEmp =
          r.employeeId.trim().toLowerCase() === normEmpId ||
          r.fullName.trim().toLowerCase() === staff.fullName.trim().toLowerCase();
        if (!matchEmp) return false;
        const parsedFrom = parseBackupDateToIso(r.fromDate);
        const fromIso = parsedFrom ? parsedFrom.iso : r.fromDate || '';
        return fromIso.startsWith(monthPrefix);
      });

      const leaveFromRecords = empLeaves.reduce((sum, r) => sum + (Number(r.days) || 1), 0);
      const isLockedOrOff =
        staff.attendance === 'Đã nghỉ việc' ||
        (staff.attendance as string) === 'Đã thôi việc' ||
        (staff.attendance as string) === 'Nghỉ chế độ' ||
        Boolean(staff.isLocked);

      map.set(staff.employeeId, {
        staff,
        totalOt: Math.round(staffOt * 10) / 10,
        totalLeaveDays: Math.max(leaveFromRecords, matrixLeaveDays),
        missingSwipeCount: unexplainedMissingSwipes,
        explainedSwipeCount: explainedMissingSwipes,
        missingDetails,
        workedDays: staffWorked,
        isWorking:
          !isLockedOrOff &&
          (staffWorked > 0 || staff.attendance === 'Đúng giờ' || staff.attendance === 'PRESENT'),
        isResigned: isLockedOrOff,
      });
    });

    return Array.from(map.values());
  }, [allStaffData, selectedYear, selectedMonth, leaveRecords, attendanceRequests, refreshTick]);

  const presentCount = staffAnalytics.filter((s) => s.workedDays > 0 || s.isWorking).length;
  const leaveCount = totalStaffCount - presentCount;

  // Rankings & Lists
  const activeStaffAnalytics = useMemo(
    () => staffAnalytics.filter((s) => !s.isResigned),
    [staffAnalytics]
  );

  const positiveOtList = useMemo(
    () =>
      activeStaffAnalytics
        .filter((s) => s.totalOt > 0)
        .sort((a, b) => b.totalOt - a.totalOt),
    [activeStaffAnalytics]
  );

  const avgPositiveOt = useMemo(() => {
    if (positiveOtList.length === 0) return 0;
    const sum = positiveOtList.reduce((acc, s) => acc + s.totalOt, 0);
    return Math.round((sum / positiveOtList.length) * 10) / 10;
  }, [positiveOtList]);

  const highOtList = useMemo(() => {
    if (highOtMode === 'ALL_POSITIVE') return positiveOtList;
    return positiveOtList.filter((s) => s.totalOt >= avgPositiveOt);
  }, [positiveOtList, highOtMode, avgPositiveOt]);

  const lowOtList = useMemo(() => {
    const base = lowOtOnlyWorked
      ? activeStaffAnalytics.filter((s) => s.workedDays > 0)
      : activeStaffAnalytics;
    const threshold = avgPositiveOt > 0 ? avgPositiveOt : Infinity;
    const belowThreshold = base.filter((s) => s.totalOt < threshold);
    const list = belowThreshold.length > 0 ? belowThreshold : base;
    return [...list].sort((a, b) => a.totalOt - b.totalOt || b.workedDays - a.workedDays);
  }, [activeStaffAnalytics, lowOtOnlyWorked, avgPositiveOt]);

  const missingSwipeList = useMemo(
    () =>
      staffAnalytics
        .filter((s) => s.missingSwipeCount > 0)
        .sort((a, b) => b.missingSwipeCount - a.missingSwipeCount),
    [staffAnalytics]
  );

  const totalUnexplainedSwipes = useMemo(
    () => missingSwipeList.reduce((sum, s) => sum + s.missingSwipeCount, 0),
    [missingSwipeList]
  );

  const maxOtStaff = positiveOtList[0] || null;
  const minOtStaff = lowOtList[0] || null;

  // Most leave days
  const sortedByLeaveDesc = [...staffAnalytics]
    .filter((s) => s.totalLeaveDays > 0)
    .sort((a, b) => b.totalLeaveDays - a.totalLeaveDays);
  const maxLeaveStaff = sortedByLeaveDesc[0] || null;

  // Most unexplained missing swipes (excluding days with NPT-FM-008)
  const maxMissingStaff = missingSwipeList[0] || null;

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim() || !content.trim()) return;
    onAddPlan({
      id: Date.now(),
      targetDept,
      model,
      content,
      status: 'PENDING',
      timestamp: new Date().toLocaleString('vi-VN'),
      sender: currentUser.fullName,
    });
    setModel('');
    setContent('');
    setShowPlanModal(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-xs">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="w-full md:w-auto text-center md:text-left">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span>DASHBOARD HC &amp; NHÂN SỰ TOÀN NHÀ MÁY</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              THÁNG {selectedMonth}/{selectedYear}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Báo cáo tổng hợp nhân lực, ngày công, tăng ca và thống kê chuyên sâu nhân sự Newprotec Vina.
          </p>
        </div>

        <div className="w-full md:w-auto flex flex-wrap items-center justify-center md:justify-end gap-2.5">
          {/* Month / Year picker */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <CalendarDays className="w-4 h-4 text-cyan-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-white font-bold focus:outline-hidden cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  Tháng {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-cyan-300 font-bold focus:outline-hidden cursor-pointer ml-1"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-slate-900 text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowPlanModal(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Kế Hoạch Mới</span>
          </button>
        </div>
      </div>

      {/* 1. MANPOWER OVERVIEW STATS (NHÂN LỰC, ĐI LÀM, NGHỈ, CA NGÀY, CA ĐÊM) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Tổng nhân lực */}
        <div
          onClick={() => onNavigate('staff_list')}
          className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tổng Nhân Lực</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {totalStaffCount} <span className="text-xs text-slate-400 font-sans">NS</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
            <span>Toàn bộ nhà máy</span>
            <span className="text-cyan-400 group-hover:underline flex items-center gap-0.5">
              Hồ sơ <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Nhân lực ca ngày */}
        <div
          onClick={() => onNavigate('hr_matrix_timekeeping')}
          className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nhân Lực Ca Ngày</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Sun className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
              {dayShiftCount} <span className="text-xs text-slate-400 font-sans">NV</span>
            </div>
            <span className="text-[10px] text-amber-400 font-mono font-semibold">
              {Math.round((dayShiftCount / (totalStaffCount || 1)) * 100)}%
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
            <span>Ca HC & Ca sản xuất ngày</span>
            <span className="text-amber-400 group-hover:underline">Chi tiết</span>
          </div>
        </div>

        {/* Nhân lực ca đêm */}
        <div
          onClick={() => onNavigate('hr_matrix_timekeeping')}
          className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 hover:border-purple-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nhân Lực Ca Đêm</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Moon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-purple-300 tabular-nums">
              {nightShiftCount} <span className="text-xs text-slate-400 font-sans">NV</span>
            </div>
            <span className="text-[10px] text-purple-400 font-mono font-semibold">
              {Math.round((nightShiftCount / (totalStaffCount || 1)) * 100)}%
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
            <span>Ca trực đêm nhà máy</span>
            <span className="text-purple-400 group-hover:underline">Chi tiết</span>
          </div>
        </div>

        {/* Số nhân viên đi làm */}
        <div
          onClick={() => onNavigate('hr_matrix_timekeeping')}
          className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Số NV Đi Làm</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {presentCount} <span className="text-xs text-slate-400 font-sans">NV</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-semibold">
              {Math.round((presentCount / (totalStaffCount || 1)) * 100)}% có mặt
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
            <span>Có phát sinh công</span>
            <span className="text-emerald-400 group-hover:underline">Bảng công</span>
          </div>
        </div>

        {/* Số nhân viên nghỉ */}
        <div
          onClick={() => onNavigate('hr_leaves')}
          className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 hover:border-rose-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Số NV Nghỉ / Vắng</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
              {leaveCount} <span className="text-xs text-slate-400 font-sans">NV</span>
            </div>
            <span className="text-[10px] text-rose-400 font-mono font-semibold">
              Nghỉ phép / Không lương
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
            <span>Quản lý phép năm</span>
            <span className="text-rose-400 group-hover:underline">Đăng ký phép</span>
          </div>
        </div>
      </div>

      {/* 2. TOP INSIGHTS & RANKINGS (TĂNG CA NHIỀU/ÍT NHẤT, NGHỈ NHIỀU NHẤT, QUÊN QUẸT THẺ NHIỀU NHẤT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Top Tăng ca nhiều nhất */}
        <div className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-white uppercase tracking-wider text-xs">
                Tăng Ca Nhiều Nhất
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-mono font-bold">
              TOP 1
            </span>
          </div>

          {maxOtStaff ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{maxOtStaff.staff.fullName}</span>
                <span className="font-mono text-cyan-400 font-bold text-sm">+{maxOtStaff.totalOt}h</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between font-mono">
                <span>Mã NV: {maxOtStaff.staff.employeeId}</span>
                <span>Bộ phận: {maxOtStaff.staff.department || 'MULTI'}</span>
              </div>
              <p className="text-[10px] text-slate-400 italic pt-1">
                Nhân viên tích lũy số giờ tăng ca cao nhất trong tháng {selectedMonth}/{selectedYear}.
              </p>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-500">Chưa có dữ liệu tăng ca</div>
          )}
        </div>

        {/* Top Tăng ca ít nhất */}
        <div className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-950 text-amber-400 border border-amber-500/30">
                <TrendingDown className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-white uppercase tracking-wider text-xs">
                Tăng Ca Ít Nhất
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-mono font-bold">
              THẤP NHẤT
            </span>
          </div>

          {minOtStaff ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{minOtStaff.staff.fullName}</span>
                <span className="font-mono text-amber-400 font-bold text-sm">{minOtStaff.totalOt}h</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between font-mono">
                <span>Mã NV: {minOtStaff.staff.employeeId}</span>
                <span>Bộ phận: {minOtStaff.staff.department || 'MULTI'}</span>
              </div>
              <p className="text-[10px] text-slate-400 italic pt-1">
                Nhân viên có tổng giờ tăng ca thấp nhất (hoặc làm đủ giờ hành chính chuẩn).
              </p>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-500">Chưa có dữ liệu</div>
          )}
        </div>

        {/* Top Nghỉ nhiều nhất */}
        <div className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-950 text-rose-400 border border-rose-500/30">
                <UserX className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-white uppercase tracking-wider text-xs">
                Nghỉ / Phép Nhiều Nhất
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-mono font-bold">
              CẦN LƯU Ý
            </span>
          </div>

          {maxLeaveStaff ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{maxLeaveStaff.staff.fullName}</span>
                <span className="font-mono text-rose-400 font-bold text-sm">{maxLeaveStaff.totalLeaveDays} ngày</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between font-mono">
                <span>Mã NV: {maxLeaveStaff.staff.employeeId}</span>
                <span>Bộ phận: {maxLeaveStaff.staff.department || 'MULTI'}</span>
              </div>
              <p className="text-[10px] text-slate-400 italic pt-1">
                Nhân viên đăng ký nghỉ phép hoặc vắng mặt nhiều nhất trong tháng.
              </p>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-500">Không có nhân viên nghỉ phép</div>
          )}
        </div>

        {/* Top Quên quẹt thẻ nhiều nhất */}
        <div className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-950 text-purple-400 border border-purple-500/30">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-white uppercase tracking-wider text-xs">
                Quên Quẹt Thẻ Nhiều Nhất
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-mono font-bold">
              BẤT THƯỜNG
            </span>
          </div>

          {maxMissingStaff ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{maxMissingStaff.staff.fullName}</span>
                <span className="font-mono text-purple-400 font-bold text-sm">
                  {maxMissingStaff.missingSwipeCount} lần
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between font-mono">
                <span>Mã NV: {maxMissingStaff.staff.employeeId}</span>
                <span>Bộ phận: {maxMissingStaff.staff.department || 'MULTI'}</span>
              </div>
              <p className="text-[10px] text-slate-400 italic pt-1">
                Số lần quên quẹt vào/ra chưa làm đơn xác nhận bất thường NPT-FM-008 ({missingSwipeList.length} người quên quẹt).
              </p>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-500">
              Không có nhân viên quên quẹt thẻ chưa giải trình
            </div>
          )}
        </div>
      </div>

      {/* 2B. DANH SÁCH THỐNG KÊ CHI TIẾT: TC NHIỀU, TC ÍT, QUÊN QUẸT THẺ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Danh sách Tăng Ca Nhiều */}
        <div className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 flex flex-col space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/30 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-white uppercase tracking-wider text-xs truncate">
                  Danh Sách Tăng Ca Nhiều
                </h2>
                <div className="text-[10px] text-slate-400 font-mono">
                  {highOtList.length} người {avgPositiveOt > 0 ? `· TB nhóm TC: ${avgPositiveOt}h` : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[10px] shrink-0">
              <button
                type="button"
                onClick={() => setHighOtMode('ALL_POSITIVE')}
                className={`px-2 py-1 rounded font-semibold cursor-pointer transition-colors ${
                  highOtMode === 'ALL_POSITIVE'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tất cả ({positiveOtList.length})
              </button>
              <button
                type="button"
                onClick={() => setHighOtMode('ABOVE_AVG')}
                className={`px-2 py-1 rounded font-semibold cursor-pointer transition-colors ${
                  highOtMode === 'ABOVE_AVG'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ≥ TB
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {highOtList.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                Chưa có nhân viên phát sinh tăng ca trong tháng {selectedMonth}/{selectedYear}.
              </div>
            ) : (
              highOtList.map((item, idx) => (
                <div
                  key={item.staff.employeeId}
                  onClick={() => onViewProfile?.(item.staff)}
                  className={`p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/40 flex items-center justify-between gap-2 transition-colors ${
                    onViewProfile ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                        idx === 0
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-100 truncate">{item.staff.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {item.staff.employeeId} · {item.staff.department || 'MULTI'} · {item.workedDays} công
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-cyan-400 text-xs">
                      +{item.totalOt}h
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Danh sách Tăng Ca Ít */}
        <div className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 flex flex-col space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-amber-950 text-amber-400 border border-amber-500/30 shrink-0">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-white uppercase tracking-wider text-xs truncate">
                  Danh Sách Tăng Ca Ít
                </h2>
                <div className="text-[10px] text-slate-400 font-mono">
                  {lowOtList.length} người {avgPositiveOt > 0 ? `(< ${avgPositiveOt}h)` : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[10px] shrink-0">
              <button
                type="button"
                onClick={() => setLowOtOnlyWorked(true)}
                className={`px-2 py-1 rounded font-semibold cursor-pointer transition-colors ${
                  lowOtOnlyWorked
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Có đi làm
              </button>
              <button
                type="button"
                onClick={() => setLowOtOnlyWorked(false)}
                className={`px-2 py-1 rounded font-semibold cursor-pointer transition-colors ${
                  !lowOtOnlyWorked
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tất cả
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {lowOtList.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                Không có nhân viên trong danh sách tăng ca ít.
              </div>
            ) : (
              lowOtList.map((item, idx) => (
                <div
                  key={item.staff.employeeId}
                  onClick={() => onViewProfile?.(item.staff)}
                  className={`p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-amber-500/40 flex items-center justify-between gap-2 transition-colors ${
                    onViewProfile ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                        idx === 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-100 truncate">{item.staff.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {item.staff.employeeId} · {item.staff.department || 'MULTI'} · {item.workedDays} công
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      {item.totalOt}h
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Danh sách Quên Quẹt Thẻ (Chưa làm đơn NPT-FM-008) */}
        <div className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 flex flex-col space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-purple-950 text-purple-400 border border-purple-500/30 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-white uppercase tracking-wider text-xs truncate">
                  Danh Sách Quên Quẹt Thẻ
                </h2>
                <div className="text-[10px] text-slate-400 font-mono">
                  {missingSwipeList.length} người · Tổng {totalUnexplainedSwipes} lần chưa giải trình
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('timekeeping')}
              className="px-2 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 text-[10px] font-semibold cursor-pointer shrink-0 transition-colors"
            >
              Đối soát MQT
            </button>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {missingSwipeList.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                Không có nhân viên quên quẹt thẻ chưa làm đơn xác nhận bất thường trong tháng {selectedMonth}/{selectedYear}.
              </div>
            ) : (
              missingSwipeList.map((item, idx) => (
                <div
                  key={item.staff.employeeId}
                  onClick={() => onViewProfile?.(item.staff)}
                  className={`p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-purple-500/40 flex items-start justify-between gap-2 transition-colors ${
                    onViewProfile ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 mt-0.5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                        idx === 0
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-bold text-slate-100 truncate">{item.staff.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {item.staff.employeeId} · {item.staff.department || 'MULTI'}
                        {item.explainedSwipeCount > 0 && (
                          <span className="text-emerald-400"> · Đã giải trình {item.explainedSwipeCount} lần</span>
                        )}
                      </div>
                      {item.missingDetails.length > 0 && (
                        <div className="text-[10px] text-purple-300/85 truncate">
                          Ngày: {item.missingDetails.slice(0, 3).map((d) => d.label).join(', ')}
                          {item.missingDetails.length > 3 ? ` (+${item.missingDetails.length - 3})` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-purple-400 text-xs">
                      {item.missingSwipeCount} lần
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. QUICK NAVIGATION & ANNOUNCEMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-4 rounded-xl bg-[#0a1222] border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-400" />
            <span>Truy Cập Nhanh Phân Hệ HC &amp; NS</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onNavigate('staff_list')}
              className="p-3.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-emerald-300">Hồ Sơ Nhân Sự</div>
              <div className="text-[10px] text-slate-400 mt-1">Quản lý nhân viên toàn nhà máy</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('hr_matrix_timekeeping')}
              className="p-3.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-amber-300">Bảng Công Ma Trận HC-NS</div>
              <div className="text-[10px] text-slate-400 mt-1">Ma trận giờ công & quẹt thẻ</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('timekeeping_machine')}
              className="p-3.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-cyan-300">Dữ Liệu Công (MQT)</div>
              <div className="text-[10px] text-slate-400 mt-1">Đối soát máy quẹt thẻ vs bảng công</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('hr_leaves')}
              className="p-3.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-rose-300">Quản Lý Đăng Ký Phép</div>
              <div className="text-[10px] text-slate-400 mt-1">Đơn xin phép NPT-FM-007</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('hr_payroll')}
              className="p-3.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-indigo-300">Bảng Công &amp; Phiếu Lương</div>
              <div className="text-[10px] text-slate-400 mt-1">Tính lương & phát hành phiếu</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('hr_announcements')}
              className="p-3.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-purple-300">Thông Báo HC-NS</div>
              <div className="text-[10px] text-slate-400 mt-1">Bản tin & quy định công ty</div>
            </button>
          </div>
        </div>

        {/* Thông báo HC-NS */}
        <div className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-cyan-400" />
              <span>Thông Báo Nội Bộ</span>
            </h2>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-mono">
              {announcements.length} tin
            </span>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar">
            {announcements.length === 0 ? (
              <div className="py-8 text-center text-slate-500">Chưa có thông báo nào.</div>
            ) : (
              announcements.map((ann) => (
                <div key={ann.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs">{ann.title}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{ann.date}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{ann.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Tạo Kế Hoạch / Thông Báo */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f172a] border border-cyan-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Tạo Kế Hoạch / Thông Báo HC-NS Mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Bộ phận nhận</label>
                <select
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs"
                >
                  <option value="Multi Auto">Multi Auto</option>
                  <option value="Toàn nhà máy">Toàn nhà máy</option>
                  <option value="Phòng HC-NS">Phòng HC-NS</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tiêu đề kế hoạch / sự việc</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ví dụ: Kế hoạch tăng ca tháng tới..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nội dung chi tiết</label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập nội dung thông báo hoặc kế hoạch sản xuất/nhân sự..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
                >
                  Lưu &amp; Gửi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
