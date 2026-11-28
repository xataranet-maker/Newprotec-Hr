import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  UserAccount,
  StaffRecord,
  ContractRecord,
  SalarySlipRecord,
  PayrollRecord,
  OvertimeRecord,
  HRAnnouncement,
  TimekeepingRecord,
  AttendanceCorrectionRequest,
  AttendanceConfirmationRecord,
  EmployeeSalaryConfig,
  LeaveRegistrationRecord,
  MachineSwipeRecord,
  AttendanceStatus,
} from '../../types';
import {
  MATRIX_UPDATED_EVENT,
  getEmployeeProfileMatrixData,
  getQrPunchStorageKey,
  getFacePunchStorageKey,
  hasMatrixRealData,
  isDayBeforeJoinDate,
  updateEmployeeMatrixDayEntry,
  calculateMatrixDayHoursFromTimes,
  dispatchMatrixUpdatedEvent,
} from '../../lib/matrixTimekeeping';
import {
  loadQrPunchMap,
  saveQrPunchMap,
  loadFacePunchMap,
  saveFacePunchMap,
} from '../../lib/attendanceQr';
import {
  SALARY_NUMERIC_FIELDS,
  formatVnd,
  ComputedSalarySlipData,
  computeMonthlySalarySlipDetails,
  createEmptySalaryConfig,
  loadOvtFormulaFields,
  recomputeSalaryConfig,
  calculatePitAboveThreshold,
} from '../../lib/salaryConfig';
import { SalarySlipModal } from './SalarySlipModal';
import {
  LeaveRegistrationWorkbench,
  computeAnnualLeaveUsed,
} from './LeaveFormNPTFM007';
import {
  AbnormalAttendanceModal,
  getMonthKeyFromDate,
} from './AbnormalAttendanceFormNPTFM008';
import {
  getMachineSwipeStorageKey,
  calculateMachineTimes,
  ComparisonRow,
  DiscrepancyType,
  normalizeTimeString,
  timeToMinutes,
  formatMinutes,
  buildComparisonRowForEmployeeDay,
  VI_DAYS,
} from './HRTimekeeping';
import {
  Edit3,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
  CheckCircle2,
  Clock,
  Plane,
  Banknote,
  Timer,
  Send,
  Save,
  CalendarCheck,
  AlertCircle,
  AlertTriangle,
  Lock,
  Printer,
  Calendar,
  Check,
  RotateCcw,
  QrCode,
  ScanFace,
  ShieldCheck,
  ShieldOff,
  ScanLine,
  BadgeCheck,
} from 'lucide-react';
import {
  buildStaffQrUrl,
  generateStaffQrToken,
  getStaffQrToken,
  isStaffQrEnabled,
} from '../../lib/staffQr';
import { EmployeeQRModal } from '../common/EmployeeQRModal';
import { EmployeeIdCard, printEmployeeIdCard } from '../common/EmployeeIdCard';
import { EmployeeMobileBottomNav } from './EmployeeMobileBottomNav';
import { AttendanceQRScannerModal } from './AttendanceQRScannerModal';

export interface EmployeeProfileProps {
  currentUser: UserAccount;
  staffInfo?: StaffRecord;
  allStaff?: StaffRecord[];
  contracts: ContractRecord[];
  salarySlips: SalarySlipRecord[];
  payrollRecords: PayrollRecord[];
  overtimeRecords: OvertimeRecord[];
  announcements?: HRAnnouncement[];
  timekeepingRecords: TimekeepingRecord[];
  attendanceRequests: AttendanceCorrectionRequest[];
  onRequestCorrection: (req: AttendanceCorrectionRequest) => void;
  attendanceConfirmations: AttendanceConfirmationRecord[];
  onUpdateAttendanceConfirmation: (conf: AttendanceConfirmationRecord[]) => void;
  salaryConfigs?: EmployeeSalaryConfig[];
  leaveRecords?: LeaveRegistrationRecord[];
  onAddLeaveRecord?: (record: LeaveRegistrationRecord) => void;
  onDeleteLeaveRecord?: (id: number) => void;
  onUpdateStaffInfo: (st: StaffRecord) => void;
  onUpdateAvatar?: (url: string) => void;
  viewerHasSalaryAccess?: boolean;
  isModal?: boolean;
  onClose?: () => void;
  isQrDirectAccess?: boolean;
  canManageQr?: boolean;
  canManualAttendance?: boolean;
}

type ProfileTab = 'overview' | 'confirm' | 'leave' | 'salary' | 'overtime' | 'contract';

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: 'overview', label: 'TỔNG QUAN' },
  { id: 'confirm', label: 'XÁC NHẬN CÔNG' },
  { id: 'leave', label: 'ĐĂNG KÝ PHÉP' },
  { id: 'salary', label: 'LƯƠNG & PHIẾU' },
  { id: 'overtime', label: 'TĂNG CA' },
  { id: 'contract', label: 'HỢP ĐỒNG' },
];

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({
  currentUser,
  staffInfo,
  allStaff = [],
  contracts,
  salarySlips,
  payrollRecords,
  overtimeRecords,
  timekeepingRecords,
  attendanceRequests,
  onRequestCorrection,
  attendanceConfirmations,
  onUpdateAttendanceConfirmation,
  salaryConfigs = [],
  leaveRecords = [],
  onAddLeaveRecord,
  onDeleteLeaveRecord,
  onUpdateStaffInfo,
  onUpdateAvatar,
  viewerHasSalaryAccess = true,
  isModal = false,
  onClose,
  isQrDirectAccess = false,
  canManageQr,
  canManualAttendance,
}) => {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [viewingSlipModal, setViewingSlipModal] = useState<ComputedSalarySlipData | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAttendanceQrScanner, setShowAttendanceQrScanner] = useState(false);

  // Edit info state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: staffInfo?.fullName || currentUser.fullName || '',
    position: staffInfo?.position || 'Nhân viên',
    department: staffInfo?.department || currentUser.department || 'MULTI',
    phone: staffInfo?.phone || '',
    hometown: staffInfo?.hometown || '',
    dateJoined: staffInfo?.dateJoined || '',
    dob: staffInfo?.dob || '',
    shift: (staffInfo?.shift || 'DAY') as 'DAY' | 'NIGHT',
  });

  useEffect(() => {
    setEditForm({
      fullName: staffInfo?.fullName || currentUser.fullName || '',
      position: staffInfo?.position || 'Nhân viên',
      department: staffInfo?.department || currentUser.department || 'MULTI',
      phone: staffInfo?.phone || '',
      hometown: staffInfo?.hometown || '',
      dateJoined: staffInfo?.dateJoined || '',
      dob: staffInfo?.dob || '',
      shift: (staffInfo?.shift || 'DAY') as 'DAY' | 'NIGHT',
    });
  }, [staffInfo, currentUser]);

  // Attendance correction request state
  const [reqDate, setReqDate] = useState(now.toISOString().split('T')[0]);
  const [inTime, setInTime] = useState(staffInfo?.shift === 'NIGHT' ? '20:00' : '08:00');
  const [outTime, setOutTime] = useState(staffInfo?.shift === 'NIGHT' ? '05:00' : '17:00');
  const [reqCategory, setReqCategory] = useState<'PERSONAL' | 'SYSTEM'>('PERSONAL');
  const [reason, setReason] = useState('');
  const [viewingAbnormalReq, setViewingAbnormalReq] =
    useState<AttendanceCorrectionRequest | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Employee identity resolved for synchronized leave & attendance tabs
  const empId = staffInfo?.employeeId || currentUser.employeeId || currentUser.username || 'NV001';
  const empName = staffInfo?.fullName || currentUser.fullName || empId;
  const empDept = staffInfo?.department || currentUser.department || 'MULTI';
  const empPosition = staffInfo?.position || 'Nhân viên';

  const resolvedEmployeeForLeave: StaffRecord = useMemo(
    () =>
      staffInfo || {
        id: Date.now(),
        employeeId: empId,
        fullName: empName,
        department: empDept,
        position: empPosition,
        dateJoined: '',
        dob: '',
        hometown: '',
        phone: '',
        attendance: 'UNMARKED',
        shift: 'DAY',
      },
    [staffInfo, empId, empName, empDept, empPosition]
  );

  const resolvedStaff: StaffRecord = useMemo(() => {
    if (staffInfo) return staffInfo;
    if (allStaff && allStaff.length > 0) {
      const found = allStaff.find(
        (s) =>
          s.employeeId.trim().toLowerCase() === empId.trim().toLowerCase() ||
          s.fullName.trim().toLowerCase() === empName.trim().toLowerCase()
      );
      if (found) return found;
    }
    return resolvedEmployeeForLeave;
  }, [staffInfo, allStaff, empId, empName, resolvedEmployeeForLeave]);

  const qrEnabled = isStaffQrEnabled(resolvedStaff);
  const qrPreviewUrl = useMemo(() => buildStaffQrUrl(resolvedStaff), [resolvedStaff]);
  const allowManageQr = Boolean(canManageQr ?? (isModal && !isQrDirectAccess));
  const allowManualAttendance = Boolean(
    canManualAttendance ??
      (!isQrDirectAccess &&
        (currentUser.role === 'admin' ||
          currentUser.role === 'hr' ||
          currentUser.role === 'multiauto'))
  );
  const showEmployeeMobileMenu = !isModal && (currentUser.role === 'staff' || isQrDirectAccess);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);

  const handleToggleMyQrAccess = (st: StaffRecord, enabled: boolean) => {
    onUpdateStaffInfo({
      ...st,
      qrAccessEnabled: enabled,
      qrAccessToken: getStaffQrToken(st),
    });
    showToast(
      enabled
        ? `Đã cấp quyền truy cập nhanh qua Mã QR cho ${st.fullName}!`
        : `Đã tạm khóa quyền truy cập Mã QR của ${st.fullName}!`
    );
  };

  const handleRegenerateMyQrToken = (st: StaffRecord) => {
    onUpdateStaffInfo({
      ...st,
      qrAccessToken: generateStaffQrToken(st.employeeId),
    });
    showToast(`Đã tạo Mã QR mới cho ${st.fullName} (mã cũ đã bị hủy)!`);
  };

  const canManageBadge = Boolean(
    allowManageQr ||
      (!isQrDirectAccess &&
        (currentUser.role === 'admin' ||
          currentUser.role === 'hr' ||
          currentUser.role === 'multiauto'))
  );

  const handleToggleBadgeIssued = (st: StaffRecord) => {
    const nextIssued = !st.badgeIssued;
    onUpdateStaffInfo({
      ...st,
      badgeIssued: nextIssued,
      badgeIssuedAt: nextIssued ? new Date().toLocaleDateString('vi-VN') : undefined,
      badgeIssuedBy: nextIssued ? currentUser.fullName || currentUser.username : undefined,
      qrAccessEnabled: nextIssued ? true : st.qrAccessEnabled,
      qrAccessToken: getStaffQrToken(st),
    });
    showToast(
      nextIssued
        ? `Đã xác nhận cấp thẻ đeo cho ${st.fullName}!`
        : `Đã cập nhật trạng thái chưa cấp thẻ đeo cho ${st.fullName}.`
    );
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Escape key closes modal
  useEffect(() => {
    if (!isModal || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingInfo) setIsEditingInfo(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModal, onClose, isEditingInfo]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Live refresh tick when MultiAuto Timekeeping Matrix changes
  const [matrixRefreshTick, setMatrixRefreshTick] = useState(0);

  useEffect(() => {
    const handleMatrixUpdate = () => setMatrixRefreshTick((t) => t + 1);
    window.addEventListener(MATRIX_UPDATED_EVENT, handleMatrixUpdate);
    window.addEventListener('storage', handleMatrixUpdate);
    return () => {
      window.removeEventListener(MATRIX_UPDATED_EVENT, handleMatrixUpdate);
      window.removeEventListener('storage', handleMatrixUpdate);
    };
  }, []);

  // Read matrix timekeeping & holiday configuration for the selected month (synced with MultiAuto Timekeeping tab)
  const { empMatrixDays, holidayMap, sourceDepartment } = useMemo(() => {
    const result = getEmployeeProfileMatrixData(
      empId,
      empDept,
      selectedYear,
      selectedMonth,
      staffInfo
    );
    return {
      empMatrixDays: result.days,
      holidayMap: result.holidays,
      sourceDepartment: result.sourceDepartment,
    };
  }, [empDept, empId, selectedYear, selectedMonth, staffInfo, matrixRefreshTick]);

  const daysInMonth = useMemo(
    () => new Date(selectedYear, selectedMonth, 0).getDate(),
    [selectedYear, selectedMonth]
  );

  const normalizedEmpId = empId.trim().toLowerCase();
  const swipeStorageKey = getMachineSwipeStorageKey(selectedYear, selectedMonth);
  const qrStorageKey = getQrPunchStorageKey(selectedYear, selectedMonth);
  const faceStorageKey = getFacePunchStorageKey(selectedYear, selectedMonth);

  const [swipeRecords, setSwipeRecords] = useState<Record<string, MachineSwipeRecord>>(() => {
    try {
      const saved = localStorage.getItem(swipeStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [qrPunchRecords, setQrPunchRecords] = useState<Record<string, MachineSwipeRecord>>(() =>
    loadQrPunchMap(selectedYear, selectedMonth)
  );

  const [facePunchRecords, setFacePunchRecords] = useState<Record<string, MachineSwipeRecord>>(() =>
    loadFacePunchMap(selectedYear, selectedMonth)
  );

  const hasManualSourceChoiceRef = useRef(false);
  const [comparisonSource, setComparisonSource] = useState<'MQT' | 'QR' | 'FACE'>(() => {
    const initialQr = loadQrPunchMap(selectedYear, selectedMonth);
    const initialFace = loadFacePunchMap(selectedYear, selectedMonth);
    const hasEmpQr = Object.keys(initialQr).some((k) => k.startsWith(`${normalizedEmpId}_`));
    const hasEmpFace = Object.keys(initialFace).some((k) => k.startsWith(`${normalizedEmpId}_`));
    let hasEmpSwipe = false;
    try {
      const rawSwipes = localStorage.getItem(swipeStorageKey);
      if (rawSwipes) {
        const parsedSwipes = JSON.parse(rawSwipes) || {};
        hasEmpSwipe = Object.keys(parsedSwipes).some((k) => k.startsWith(`${normalizedEmpId}_`));
      }
    } catch {}
    if (hasEmpQr && !hasEmpSwipe) return 'QR';
    if (hasEmpFace && !hasEmpSwipe && !hasEmpQr) return 'FACE';
    if (Object.keys(initialQr).length > 0 && Object.keys(swipeRecords).length === 0) return 'QR';
    if (Object.keys(initialFace).length > 0 && Object.keys(swipeRecords).length === 0 && Object.keys(initialQr).length === 0) {
      return 'FACE';
    }
    return 'MQT';
  });

  useEffect(() => {
    let nextSwipes: Record<string, MachineSwipeRecord> = {};
    try {
      const saved = localStorage.getItem(swipeStorageKey);
      if (saved) {
        nextSwipes = JSON.parse(saved);
      }
    } catch {
      nextSwipes = {};
    }
    const nextQr = loadQrPunchMap(selectedYear, selectedMonth);
    const nextFace = loadFacePunchMap(selectedYear, selectedMonth);
    setSwipeRecords(nextSwipes);
    setQrPunchRecords(nextQr);
    setFacePunchRecords(nextFace);

    if (!hasManualSourceChoiceRef.current) {
      const hasEmpQr = Object.keys(nextQr).some((k) => k.startsWith(`${normalizedEmpId}_`));
      const hasEmpFace = Object.keys(nextFace).some((k) => k.startsWith(`${normalizedEmpId}_`));
      const hasEmpSwipe = Object.keys(nextSwipes).some((k) => k.startsWith(`${normalizedEmpId}_`));
      if ((hasEmpQr && !hasEmpSwipe) || (Object.keys(nextQr).length > 0 && Object.keys(nextSwipes).length === 0)) {
        setComparisonSource('QR');
      } else if (
        (hasEmpFace && !hasEmpSwipe && !hasEmpQr) ||
        (Object.keys(nextFace).length > 0 && Object.keys(nextSwipes).length === 0 && Object.keys(nextQr).length === 0)
      ) {
        setComparisonSource('FACE');
      } else if (hasEmpSwipe && !hasEmpQr && !hasEmpFace) {
        setComparisonSource('MQT');
      }
    }
  }, [swipeStorageKey, qrStorageKey, faceStorageKey, matrixRefreshTick, selectedYear, selectedMonth, normalizedEmpId]);

  // Build day-by-day rows + 7 KPI aggregates
  const { dayRows, stats } = useMemo(() => {
    let workDaysCount = 0;
    let totalRegularHours = 0;
    let totalWorkHours = 0;
    let totalDayOt = 0;
    let totalNightOt = 0;
    let totalSundayDay = 0;
    let totalSundayNight = 0;
    let totalHolidayDay = 0;
    let totalHolidayNight = 0;

    const rows = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
      const isSunday = dateObj.getDay() === 0;
      const dateIso = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entry = empMatrixDays[day];
      const isHoliday = Boolean(holidayMap[day] || entry?.isHoliday);

      const reg = entry?.regularHours || 0;
      const otDay = entry?.otDayHours || 0;
      const otNight = entry?.otNightHours || 0;
      const otSunDay = entry?.otSundayHours || 0;
      const otSunNight = entry?.otSundayNightHours || 0;
      const otHoliday = entry?.otHolidayHours || 0;
      const otHolidayNight = entry?.otHolidayNightHours || 0;

      const totalHrs = reg + otDay + otNight + otSunDay + otSunNight + otHoliday + otHolidayNight;
      const totalOtDayRow = otDay + otNight + otSunDay + otSunNight + otHoliday + otHolidayNight;

      if (totalHrs > 0 || (entry?.inTime && entry?.outTime)) {
        workDaysCount += 1;
      }

      totalRegularHours += reg;
      totalWorkHours += totalHrs;
      totalDayOt += otDay;
      totalNightOt += otNight;
      totalSundayDay += otSunDay;
      totalSundayNight += otSunNight;
      totalHolidayDay += otHoliday;
      totalHolidayNight += otHolidayNight;

      const isBeforeJoin = isDayBeforeJoinDate(
        selectedYear,
        selectedMonth,
        day,
        staffInfo?.dateJoined
      );
      const hideAsBeforeJoin = isBeforeJoin && !hasMatrixRealData(entry);
      const isRegimeLeave = (entry?.status as string) === 'Nghỉ chế độ';
      const isResigned =
        !isRegimeLeave &&
        (entry?.status === 'Đã nghỉ việc' || (entry?.status as string) === 'Đã thôi việc');

      let statusLabel = 'Chưa chấm công';
      let statusTone: 'ot' | 'full' | 'late' | 'early' | 'leave' | 'sunday' | 'holiday' | 'empty' = 'empty';

      if (hideAsBeforeJoin) {
        statusLabel = '';
        statusTone = 'empty';
      } else if (isRegimeLeave) {
        statusLabel = isSunday ? '' : 'Nghỉ chế độ';
        statusTone = isSunday ? 'empty' : 'leave';
      } else if (isResigned) {
        statusLabel = isSunday ? '' : 'Đã thôi việc';
        statusTone = 'empty';
      } else if (
        totalHrs === 0 &&
        !(entry?.inTime && entry?.outTime) &&
        (entry?.status === 'Nghỉ phép' ||
          entry?.status === 'Nghỉ cưới' ||
          entry?.status === 'Nghỉ tang' ||
          entry?.status === 'FAMILY' ||
          entry?.status === 'Nghỉ ốm' ||
          entry?.status === 'Vắng mặt' ||
          entry?.status === 'Nghỉ KL')
      ) {
        statusLabel =
          entry.status === 'FAMILY'
            ? 'Hiếu hỷ'
            : entry.status === 'Nghỉ KL'
            ? 'Nghỉ không lương'
            : entry.status;
        statusTone = 'leave';
      } else if (
        entry?.status === 'Nghỉ phép' &&
        totalHrs > 0 &&
        totalHrs <= 4 &&
        totalOtDayRow === 0 &&
        (entry.leaveRecordId !== undefined || String(entry.note || '').includes('Nghỉ nửa phép'))
      ) {
        statusLabel = 'Nghỉ nửa phép';
        statusTone = 'leave';
      } else if (totalOtDayRow > 0) {
        statusLabel = 'Có tăng ca';
        statusTone = 'ot';
      } else if (entry?.status === 'Đi muộn') {
        statusLabel = 'Đi muộn';
        statusTone = 'late';
      } else if (entry?.status === 'Về sớm') {
        statusLabel = 'Về sớm';
        statusTone = 'early';
      } else if (totalHrs > 0 || (entry?.inTime && entry?.outTime)) {
        statusLabel = 'Đủ công';
        statusTone = 'full';
      } else if (isHoliday || entry?.status === 'Nghỉ lễ') {
        statusLabel = 'Nghỉ lễ';
        statusTone = 'holiday';
      } else if (isSunday || entry?.status === 'Nghỉ chủ nhật') {
        statusLabel = 'CN';
        statusTone = 'sunday';
      }

      const qrRec = qrPunchRecords[`${normalizedEmpId}_${day}`];
      const qrInTime = hideAsBeforeJoin || isResigned ? '' : (qrRec?.rawInTime || '').trim();
      const qrOutTime = hideAsBeforeJoin || isResigned ? '' : (qrRec?.rawOutTime || '').trim();

      const faceRec = facePunchRecords[`${normalizedEmpId}_${day}`];
      const faceInTime = hideAsBeforeJoin || isResigned ? '' : (faceRec?.rawInTime || '').trim();
      const faceOutTime = hideAsBeforeJoin || isResigned ? '' : (faceRec?.rawOutTime || '').trim();

      return {
        day,
        dateIso,
        isSunday,
        isHoliday,
        shift: entry?.shift || staffInfo?.shift || 'DAY',
        inTime: hideAsBeforeJoin || isResigned ? '' : entry?.inTime || '--:--',
        outTime: hideAsBeforeJoin || isResigned ? '' : entry?.outTime || '--:--',
        qrInTime,
        qrOutTime,
        faceInTime,
        faceOutTime,
        regularHours: reg,
        totalHrs: Math.round(totalHrs * 10) / 10,
        totalOtDayRow: Math.round(totalOtDayRow * 10) / 10,
        otDay,
        otNight,
        otSunDay,
        otSunNight,
        otHoliday,
        otHolidayNight,
        statusLabel,
        statusTone,
      };
    });

    const round1 = (v: number) => Math.round(v * 10) / 10;
    const sumOt = round1(
      totalDayOt + totalNightOt + totalSundayDay + totalSundayNight + totalHolidayDay + totalHolidayNight
    );

    return {
      dayRows: rows,
      stats: {
        workDaysCount,
        totalRegularHours: round1(totalRegularHours),
        totalWorkHours: round1(totalWorkHours),
        totalDayOt: round1(totalDayOt),
        totalNightOt: round1(totalNightOt),
        totalSundayDay: round1(totalSundayDay),
        totalSundayNight: round1(totalSundayNight),
        totalHolidayDay: round1(totalHolidayDay),
        totalHolidayNight: round1(totalHolidayNight),
        totalHolidayOt: round1(totalHolidayDay + totalHolidayNight),
        sumOt,
      },
    };
  }, [daysInMonth, selectedYear, selectedMonth, empMatrixDays, holidayMap, staffInfo?.shift, qrPunchRecords, facePunchRecords, normalizedEmpId]);

  // Filtered employee records across HR modules
  const myTimekeeping = timekeepingRecords.filter((t) => t.employeeId === empId);
  const myOvertime = overtimeRecords.filter((o) => o.employeeId === empId);
  const myMatrixOvertimeDays = useMemo(() => dayRows.filter((r) => r.totalOtDayRow > 0), [dayRows]);
  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const mySalarySlips = salarySlips.filter(
    (s) => s.employeeId.trim().toLowerCase() === normalizedEmpId
  );
  const mySalaryConfig = salaryConfigs.find(
    (c) => c.employeeId.trim().toLowerCase() === normalizedEmpId
  );
  const openOfficialSlipModal = (slipMonthStr: string, slipConfig?: EmployeeSalaryConfig, summary?: SalarySlipRecord['attendanceSummary']) => {
    const [yStr, mStr] = slipMonthStr.split('-');
    const slipYear = Number(yStr) || selectedYear;
    const slipMonth = Number(mStr) || selectedMonth;
    const { days } = getEmployeeProfileMatrixData(
      empId,
      empDept || 'MULTI',
      slipYear,
      slipMonth,
      staffInfo
    );
    const baseCfg =
      slipConfig ||
      mySalaryConfig ||
      createEmptySalaryConfig({ employeeId: empId, fullName: empName });
    const computed = computeMonthlySalarySlipDetails({
      staff: {
        employeeId: empId,
        fullName: empName,
        department: empDept,
        shift: staffInfo?.shift || 'DAY',
        lateMinutes: staffInfo?.lateMinutes,
        earlyMinutes: staffInfo?.earlyMinutes,
      },
      salaryConfig: recomputeSalaryConfig(baseCfg, loadOvtFormulaFields()),
      year: slipYear,
      month: slipMonth,
      matrixDays: days,
      attendanceSummary: summary,
    });
    setViewingSlipModal(computed);
  };

  const issuedSlipForSelectedMonth = useMemo(
    () => mySalarySlips.find((s) => s.month === monthKey) || null,
    [mySalarySlips, monthKey]
  );

  const selectedMonthSlipPreview = useMemo(() => {
    const baseCfg =
      issuedSlipForSelectedMonth?.salaryConfig ||
      mySalaryConfig ||
      createEmptySalaryConfig({ employeeId: empId, fullName: empName });

    return computeMonthlySalarySlipDetails({
      staff: {
        employeeId: empId,
        fullName: empName,
        department: empDept,
        shift: staffInfo?.shift || 'DAY',
        lateMinutes: staffInfo?.lateMinutes,
        earlyMinutes: staffInfo?.earlyMinutes,
      },
      salaryConfig: recomputeSalaryConfig(baseCfg, loadOvtFormulaFields()),
      year: selectedYear,
      month: selectedMonth,
      matrixDays: empMatrixDays,
      attendanceSummary: issuedSlipForSelectedMonth?.attendanceSummary,
    });
  }, [
    issuedSlipForSelectedMonth,
    mySalaryConfig,
    empId,
    empName,
    empDept,
    staffInfo?.shift,
    staffInfo?.lateMinutes,
    staffInfo?.earlyMinutes,
    selectedYear,
    selectedMonth,
    empMatrixDays,
  ]);
  const isMonthConfirmed = attendanceConfirmations.some(
    (c) => c.employeeId.trim().toLowerCase() === normalizedEmpId && c.month === monthKey && c.isConfirmed
  );

  const myContracts = contracts.filter((c) => c.employeeId === empId);
  const myRequests = attendanceRequests.filter(
    (r) => r.employeeId.trim().toLowerCase() === normalizedEmpId
  );

  // Helpers to save machine swipes & QR punches for selectedYear / selectedMonth

  const saveSwipes = (next: Record<string, MachineSwipeRecord>) => {
    setSwipeRecords(next);
    try {
      localStorage.setItem(swipeStorageKey, JSON.stringify(next));
      dispatchMatrixUpdatedEvent(empDept, selectedYear, selectedMonth);
    } catch (e) {
      console.error('Save swipes error', e);
    }
  };

  const saveQrPunches = (next: Record<string, MachineSwipeRecord>) => {
    setQrPunchRecords(next);
    saveQrPunchMap(selectedYear, selectedMonth, next, empDept);
  };

  const saveFacePunches = (next: Record<string, MachineSwipeRecord>) => {
    setFacePunchRecords(next);
    saveFacePunchMap(selectedYear, selectedMonth, next, empDept);
  };

  // Day-by-day comparison rows between Bảng Chấm Công (BC) and MQT / QR / Khuôn Mặt
  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    const activeMap =
      comparisonSource === 'QR'
        ? qrPunchRecords
        : comparisonSource === 'FACE'
        ? facePunchRecords
        : swipeRecords;
    const rows: ComparisonRow[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const swipeKey = `${resolvedStaff.employeeId.trim().toLowerCase()}_${day}`;
      const swipeRec = activeMap[swipeKey];
      const bcEntry = empMatrixDays[day];

      const row = buildComparisonRowForEmployeeDay({
        staff: resolvedStaff,
        day,
        selectedYear,
        selectedMonth,
        bcEntry,
        holidayMap,
        swipeRecord: swipeRec,
        compareSource: comparisonSource,
      });
      rows.push(row);
    }
    return rows;
  }, [
    resolvedStaff,
    daysInMonth,
    selectedYear,
    selectedMonth,
    empMatrixDays,
    holidayMap,
    swipeRecords,
    qrPunchRecords,
    facePunchRecords,
    comparisonSource,
  ]);

  // Filter ONLY abnormal / missing days per user requirement:
  // "chỉ xuất hiện những ngày thiếu giờ vào hoặc giờ ra và sai dữ liệu giờ vào hoặc giờ ra của bảng chấm công"
  const abnormalComparisonDays = useMemo<ComparisonRow[]>(() => {
    return comparisonRows.filter((r) => {
      if (r.discrepancyType === 'MATCH' || r.discrepancyType === 'OFF_DAY_MATCH') {
        if (r.hasBcWork && (!r.bcInTime || !r.bcOutTime)) {
          return true;
        }
        return false;
      }
      return true;
    });
  }, [comparisonRows]);

  // State: Edit Bảng Chấm Công (BC)
  const [editingBcDay, setEditingBcDay] = useState<ComparisonRow | null>(null);
  const [editBcInTime, setEditBcInTime] = useState('');
  const [editBcOutTime, setEditBcOutTime] = useState('');
  const [editBcShift, setEditBcShift] = useState<'DAY' | 'NIGHT'>('DAY');
  const [editBcRegularHours, setEditBcRegularHours] = useState<number>(8);
  const [editBcOtHours, setEditBcOtHours] = useState<number>(0);
  const [editBcStatus, setEditBcStatus] = useState<AttendanceStatus>('Đúng giờ');

  // State: Explain modal (Phiếu NPT-FM-008)
  const [explainingRow, setExplainingRow] = useState<ComparisonRow | null>(null);
  const [showManualRequestForm, setShowManualRequestForm] = useState(false);

  const openEditBc = (row: ComparisonRow) => {
    setEditingBcDay(row);
    setEditBcInTime(row.bcInTime || '');
    setEditBcOutTime(row.bcOutTime || '');
    setEditBcShift(row.shift);
    setEditBcRegularHours(row.bcRegularHours || 0);
    setEditBcOtHours(row.bcOtHours || 0);
    setEditBcStatus(
      (row.bcStatus as AttendanceStatus) ||
        (row.isHoliday ? 'Nghỉ lễ' : row.isSunday ? 'Nghỉ chủ nhật' : 'Đúng giờ')
    );
  };

  const applyBcPreset = (
    inVal: string,
    outVal: string,
    shiftVal: 'DAY' | 'NIGHT'
  ) => {
    if (!editingBcDay) return;
    setEditBcInTime(inVal);
    setEditBcOutTime(outVal);
    setEditBcShift(shiftVal);
    const calc = calculateMatrixDayHoursFromTimes(
      normalizeTimeString(inVal),
      normalizeTimeString(outVal),
      shiftVal,
      editingBcDay.isSunday,
      editingBcDay.isHoliday
    );
    setEditBcRegularHours(calc.regularHours);
    setEditBcOtHours(calc.totalOtHours);
    setEditBcStatus(calc.suggestedStatus);
  };

  const handleBcTimeOrShiftChange = (patch: {
    inTime?: string;
    outTime?: string;
    shift?: 'DAY' | 'NIGHT';
    presetKey?: string;
  }) => {
    if (!editingBcDay) return;
    let nextInTime = patch.inTime !== undefined ? patch.inTime : editBcInTime;
    let nextOutTime = patch.outTime !== undefined ? patch.outTime : editBcOutTime;
    let nextShift = patch.shift !== undefined ? patch.shift : editBcShift;

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
        nextOutTime = '08:00';
      } else {
        nextShift = 'DAY';
        nextInTime = '08:00';
        nextOutTime = editBcOtHours > 0 ? '20:00' : '17:00';
      }
    }

    if (patch.outTime !== undefined) {
      const trimmedOut = patch.outTime.trim();
      if (trimmedOut === '08:00' || trimmedOut === '08:0' || trimmedOut === '8:00') {
        nextShift = 'NIGHT';
        if (!nextInTime || nextInTime === '08:00' || nextInTime.startsWith('08')) {
          nextInTime = '20:00';
        }
        nextOutTime = '08:00';
      } else if (trimmedOut === '20:00' || trimmedOut === '20:0') {
        nextShift = 'DAY';
        if (!nextInTime || nextInTime === '20:00' || nextInTime.startsWith('20')) {
          nextInTime = '08:00';
        }
        nextOutTime = '20:00';
      } else if (trimmedOut === '17:00' || trimmedOut === '17:0') {
        nextShift = 'DAY';
        if (!nextInTime || nextInTime === '20:00' || nextInTime.startsWith('20')) {
          nextInTime = '08:00';
        }
        nextOutTime = '17:00';
      } else if (trimmedOut === '05:00' || trimmedOut === '05:0' || trimmedOut === '5:00') {
        nextShift = 'NIGHT';
        if (!nextInTime || nextInTime === '08:00' || nextInTime.startsWith('08')) {
          nextInTime = '20:00';
        }
        nextOutTime = '05:00';
      }
    }

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

    setEditBcInTime(nextInTime);
    setEditBcOutTime(nextOutTime);
    setEditBcShift(nextShift);

    const calc = calculateMatrixDayHoursFromTimes(
      normalizeTimeString(nextInTime),
      normalizeTimeString(nextOutTime),
      nextShift,
      editingBcDay.isSunday,
      editingBcDay.isHoliday
    );
    setEditBcRegularHours(calc.regularHours);
    setEditBcOtHours(calc.totalOtHours);
    setEditBcStatus(calc.suggestedStatus);
  };

  const handleSaveBcEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBcDay || !allowManualAttendance) return;

    const normIn = normalizeTimeString(editBcInTime);
    const normOut = normalizeTimeString(editBcOutTime);
    const regHours = Math.max(0, Math.min(8, Number(editBcRegularHours) || 0));
    const otHours = Math.max(0, Math.round((Number(editBcOtHours) || 0) * 10) / 10);

    const res = updateEmployeeMatrixDayEntry({
      staff: resolvedStaff,
      allStaff: allStaff && allStaff.length > 0 ? allStaff : [resolvedStaff],
      year: selectedYear,
      month: selectedMonth,
      day: editingBcDay.day,
      entryPatch: {
        inTime: normIn,
        outTime: normOut,
        shift: editBcShift,
        regularHours: editingBcDay.isHoliday || editingBcDay.isSunday ? 0 : regHours,
        otDayHours: !editingBcDay.isHoliday && !editingBcDay.isSunday && editBcShift === 'DAY' ? otHours : 0,
        otNightHours: !editingBcDay.isHoliday && !editingBcDay.isSunday && editBcShift === 'NIGHT' ? otHours : 0,
        otSundayHours: !editingBcDay.isHoliday && editingBcDay.isSunday && editBcShift === 'DAY' ? otHours : 0,
        otSundayNightHours: !editingBcDay.isHoliday && editingBcDay.isSunday && editBcShift === 'NIGHT' ? otHours : 0,
        otHolidayHours: editingBcDay.isHoliday && editBcShift === 'DAY' ? otHours : 0,
        otHolidayNightHours: editingBcDay.isHoliday && editBcShift === 'NIGHT' ? otHours : 0,
        isHoliday: editingBcDay.isHoliday,
        status: editBcStatus,
      },
    });

    if (!res.ok) {
      showToast(res.error || 'Không thể cập nhật bảng chấm công.');
      return;
    }

    setMatrixRefreshTick((t) => t + 1);
    setEditingBcDay(null);
    showToast(
      `Đã cập nhật giờ Bảng công ngày ${editingBcDay.dateStr} (${normIn || '--:--'} - ${normOut || '--:--'}) thành công!`
    );
  };

  const findExistingRequest = (row: ComparisonRow) => {
    return myRequests.find((r) => {
      const matchEmp = r.employeeId.trim().toLowerCase() === normalizedEmpId;
      const matchDate = r.date === row.dateIso || r.date === row.dateStr;
      return matchEmp && matchDate;
    });
  };
  const handleConfirmMonthAttendance = () => {
    const existingIdx = attendanceConfirmations.findIndex(
      (c) => c.employeeId.trim().toLowerCase() === normalizedEmpId && c.month === monthKey
    );
    const confirmDays = dayRows.map((r) => ({
      day: r.day,
      n: r.regularHours,
      ot1: Math.round((r.otDay + r.otSunDay + r.otHoliday) * 10) / 10,
      d: r.inTime !== '--:--' ? `${r.inTime}-${r.outTime}` : r.statusLabel,
      ot2: Math.round((r.otNight + r.otSunNight + r.otHolidayNight) * 10) / 10,
    }));

    const leaveQuota = staffInfo?.annualLeaveQuota !== undefined ? staffInfo.annualLeaveQuota : 12;
    const newRecord: AttendanceConfirmationRecord = {
      id: Date.now(),
      month: monthKey,
      employeeId: empId,
      fullName: empName,
      shiftGroup: staffInfo?.shift === 'NIGHT' ? 'Ca Đêm' : 'Ca Ngày',
      department: empDept,
      days: confirmDays,
      unexcusedAbsence: 0,
      remainingLeave: Math.max(0, leaveQuota - computeAnnualLeaveUsed(leaveRecords, empId)),
      isConfirmed: true,
      confirmedAt: new Date().toLocaleString('vi-VN'),
      confirmedBy: empName,
    };

    const next = [...attendanceConfirmations];
    if (existingIdx >= 0) next[existingIdx] = newRecord;
    else next.unshift(newRecord);

    onUpdateAttendanceConfirmation(next);
    showToast(`Đã xác nhận đủ công tháng ${selectedMonth}/${selectedYear} thành công!`);
  };

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const monthKeyReq = getMonthKeyFromDate(reqDate);
    const monthCount =
      myRequests.filter((r) => getMonthKeyFromDate(r.date) === monthKeyReq).length + 1;

    onRequestCorrection({
      id: Date.now(),
      employeeId: empId,
      fullName: empName,
      department: empDept,
      date: reqDate,
      inTime,
      outTime,
      reason: reason.trim(),
      status: 'PENDING',
      requestDate: new Date().toLocaleDateString('vi-VN'),
      checkInChecked: Boolean(inTime),
      checkOutChecked: Boolean(outTime),
      reasonCategory: reqCategory,
      monthlyCount: monthCount,
    });

    setReason('');
    showToast('Đã gửi phiếu xác nhận chấm công bất thường (NPT-FM-008) tới HC & NS!');
  };

  const handleProfileAddLeave = (rec: LeaveRegistrationRecord) => {
    if (onAddLeaveRecord) {
      onAddLeaveRecord(rec);
    }
    showToast('Đã đăng ký & lưu đơn xin phép đồng bộ lên hệ thống HC & NS!');
  };

  const handleSaveStaffEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffInfo) {
      setIsEditingInfo(false);
      return;
    }
    onUpdateStaffInfo({
      ...staffInfo,
      fullName: editForm.fullName.trim() || staffInfo.fullName,
      position: editForm.position.trim() || staffInfo.position,
      department: editForm.department.trim() || staffInfo.department,
      phone: editForm.phone.trim(),
      hometown: editForm.hometown.trim(),
      dateJoined: editForm.dateJoined.trim() || staffInfo.dateJoined,
      dob: editForm.dob.trim() || staffInfo.dob,
      shift: editForm.shift,
    });
    setIsEditingInfo(false);
    showToast('Đã cập nhật thông tin hồ sơ nhân viên!');
  };

  const monthLabel = `THÁNG ${selectedMonth}/${selectedYear}`;

  const profileBody = (
    <div
      className={`bg-[#060b16] text-slate-100 rounded-2xl border border-slate-800/90 shadow-2xl flex flex-col lg:flex-row relative w-full min-w-0 ${
        isModal ? 'h-full overflow-y-auto overflow-x-hidden lg:overflow-hidden custom-scrollbar' : 'lg:overflow-hidden'
      }`}
    >
      {/* LEFT SIDEBAR: NEWPROTEC IDENTITY CARD (Visible on overview tab on mobile, always visible on desktop) */}
      <aside
        className={`w-full lg:w-[290px] shrink-0 bg-[#080f1e] border-b lg:border-b-0 lg:border-r border-slate-800/80 p-4 sm:p-5 ${
          activeTab === 'overview' ? 'flex' : 'hidden lg:flex'
        } flex-col justify-between gap-5 lg:overflow-y-auto custom-scrollbar`}
      >
        <div className="space-y-3.5">
          {/* THẺ NHÂN VIÊN ĐÓNG KHUNG RIÊNG + IN THẺ + CẤP THẺ ĐEO */}
          <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-cyan-500/35 shadow-lg space-y-2.5">
            <EmployeeIdCard
              staff={resolvedStaff}
              allowAvatarEdit={true}
              onUpdateAvatar={(avatarUrl) => {
                onUpdateStaffInfo({ ...resolvedStaff, avatarUrl });
                onUpdateAvatar?.(avatarUrl);
                showToast(`Đã cập nhật ảnh thẻ cho ${empName}!`);
              }}
              onClickQr={() => setShowQrModal(true)}
              compact={true}
            />

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => printEmployeeIdCard(resolvedStaff)}
                className="py-1.5 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="In thẻ nhân viên"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In thẻ</span>
              </button>

              {canManageBadge ? (
                <button
                  type="button"
                  onClick={() => handleToggleBadgeIssued(resolvedStaff)}
                  title={
                    resolvedStaff.badgeIssued
                      ? 'Đã cấp thẻ đeo (Nhấn để thu hồi)'
                      : 'Nhấn để xác nhận cấp thẻ đeo cho nhân viên'
                  }
                  className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    resolvedStaff.badgeIssued
                      ? 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border-emerald-600/60'
                      : 'bg-amber-600/20 hover:bg-amber-600/35 text-amber-200 border-amber-500/60'
                  }`}
                >
                  <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {resolvedStaff.badgeIssued ? 'Đã cấp thẻ' : 'Cấp thẻ đeo'}
                  </span>
                </button>
              ) : (
                <div
                  className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 ${
                    resolvedStaff.badgeIssued
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700'
                  }`}
                >
                  <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {resolvedStaff.badgeIssued ? 'Đã cấp thẻ' : 'Chưa cấp thẻ'}
                  </span>
                </div>
              )}
            </div>

            {resolvedStaff.badgeIssued && resolvedStaff.badgeIssuedAt && (
              <div className="text-[10px] font-mono text-emerald-300/90 text-center">
                Cấp thẻ đeo ngày {resolvedStaff.badgeIssuedAt}
              </div>
            )}

            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <QrCode className="w-3 h-3" />
                <span>Mở &amp; Tải QR</span>
              </button>

              {allowManageQr && (
                <button
                  type="button"
                  onClick={() => handleToggleMyQrAccess(resolvedStaff, !qrEnabled)}
                  title={qrEnabled ? 'Khóa quyền truy cập QR' : 'Cấp quyền truy cập QR'}
                  className={`py-1.5 px-2.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    qrEnabled
                      ? 'bg-emerald-950/60 hover:bg-rose-950/70 border-emerald-700/60 text-emerald-300 hover:text-rose-300'
                      : 'bg-rose-950/60 hover:bg-emerald-950/70 border-rose-700/60 text-rose-300 hover:text-emerald-300'
                  }`}
                >
                  {qrEnabled ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                  <span>{qrEnabled ? 'QR Mở' : 'QR Khóa'}</span>
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAttendanceQrScanner(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-200 hover:text-white text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-emerald-950/30"
            title="Mở camera quét mã QR chấm công hoặc điền thời gian thủ công"
          >
            <ScanLine className="w-3.5 h-3.5 text-emerald-300" />
            <span>CHẤM CÔNG QR</span>
          </button>

          {/* Sửa Thông Tin Button */}
          {staffInfo && (
            <button
              type="button"
              onClick={() => setIsEditingInfo(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>SỬA THÔNG TIN</span>
            </button>
          )}

        </div>

        {/* Bottom Identity Card Footer */}
        <div className="pt-3 border-t border-slate-800/70 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-8 h-1 rounded-full bg-cyan-400" />
            <span className="w-2.5 h-1 rounded-full bg-purple-400" />
            <span className="w-2.5 h-1 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[9px] font-mono tracking-[0.2em] text-slate-500 uppercase">
            NEWPROTEC IDENTITY CARD
          </span>
        </div>
      </aside>

      {/* RIGHT MAIN PANEL */}
      <div
        ref={rightPanelRef}
        className={`${
          activeTab !== 'overview' ? 'flex-1' : 'flex-none lg:flex-1'
        } flex flex-col min-w-0 lg:min-h-0 bg-[#050a14]`}
      >
        {/* Top Tab Navigation + Month Switcher */}
        <div className={`px-3 sm:px-5 pt-3 pb-2 lg:pb-0 border-b border-slate-800/90 flex flex-wrap items-center justify-center sm:justify-between gap-2 sm:gap-3 ${isModal ? 'pr-12 sm:pr-14' : ''}`}>
          <div className={`${showEmployeeMobileMenu ? 'hidden md:flex' : 'flex'} w-full sm:w-auto max-w-full min-w-0 items-center overflow-x-auto custom-scrollbar pb-1 lg:pb-0`}>
            <div className="flex items-center gap-1 sm:gap-2 mx-auto sm:mx-0">
              {PROFILE_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 sm:px-3 py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'border-blue-500 text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center mx-auto sm:mx-0 bg-slate-900 border border-slate-800 rounded-full px-2 py-1 mb-2 text-[11px] font-mono font-bold text-slate-200 shrink-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Tháng trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2.5 tracking-wider">{monthLabel}</span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Toast feedback */}
        {toastMsg && (
          <div className="mx-5 mt-4 p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="p-3 sm:p-5 space-y-5 min-w-0 lg:flex-1 lg:overflow-y-auto custom-scrollbar">
          {/* TAB 1: TỔNG QUAN */}
          {activeTab === 'overview' && (
            <>
              {/* 7 KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
                <div className="rounded-xl bg-slate-900/75 border border-slate-700/70 p-3.5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    TỔNG NGÀY CÔNG
                  </div>
                  <div className="text-xl font-extrabold font-mono text-white mt-1.5">
                    {stats.workDaysCount}
                  </div>
                  <div className="text-[10px] font-mono text-cyan-400 mt-0.5">
                    {stats.totalWorkHours}h tổng giờ làm
                  </div>
                </div>

                <div className="rounded-xl bg-amber-950/20 border border-amber-500/40 p-3.5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    TC NGÀY
                  </div>
                  <div className="text-xl font-extrabold font-mono text-amber-300 mt-1.5">
                    {stats.totalDayOt}h
                  </div>
                </div>

                <div className="rounded-xl bg-purple-950/25 border border-purple-500/40 p-3.5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                    TC ĐÊM
                  </div>
                  <div className="text-xl font-extrabold font-mono text-purple-300 mt-1.5">
                    {stats.totalNightOt}h
                  </div>
                </div>

                <div className="rounded-xl bg-rose-950/25 border border-rose-500/40 p-3.5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                    NGÀY CHỦ NHẬT
                  </div>
                  <div className="text-xl font-extrabold font-mono text-rose-300 mt-1.5">
                    {stats.totalSundayDay}h
                  </div>
                </div>

                <div className="rounded-xl bg-fuchsia-950/25 border border-fuchsia-500/40 p-3.5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-300">
                    ĐÊM CHỦ NHẬT
                  </div>
                  <div className="text-xl font-extrabold font-mono text-fuchsia-300 mt-1.5">
                    {stats.totalSundayNight}h
                  </div>
                </div>

                <div className="rounded-xl bg-red-950/25 border border-red-500/40 p-3.5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                    NGÀY LỄ
                  </div>
                  <div className="text-xl font-extrabold font-mono text-red-300 mt-1.5">
                    {stats.totalHolidayDay}h
                  </div>
                </div>

                <div className="rounded-xl bg-orange-950/25 border border-orange-500/40 p-3.5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                    TC ĐÊM LỄ
                  </div>
                  <div className="text-xl font-extrabold font-mono text-orange-300 mt-1.5">
                    {stats.totalHolidayNight}h
                  </div>
                </div>
              </div>

              {/* Detail Table */}
              <div className="rounded-xl bg-[#0a1222] border border-slate-800/90 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span>
                      CHI TIẾT CHẤM CÔNG THÁNG {String(selectedMonth).padStart(2, '0')}/{selectedYear} (VÀO - RA &amp; TĂNG CA)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-[9px] text-cyan-300 font-mono">
                      ĐỒNG BỘ {sourceDepartment === 'MULTI' ? 'MULTI AUTO' : sourceDepartment}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono font-bold shrink-0">
                    <span className="text-emerald-400">
                      Công chuẩn: {stats.totalRegularHours}h
                    </span>
                    <span className="text-cyan-400">
                      Tổng TC: {stats.sumOt}h
                    </span>
                  </div>
                </div>

                <div className="w-full overflow-x-auto overflow-y-auto custom-scrollbar max-h-[58vh] sm:max-h-[52vh]">
                  <table className="w-full min-w-[1100px] text-left text-xs border-collapse">
                    <thead className="bg-[#080f1d] text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800 sticky top-0 z-20 whitespace-nowrap">
                      <tr>
                        <th className="py-2.5 px-3 sticky left-0 z-30 bg-[#080f1d] border-r border-slate-800/80 shadow-[4px_0_10px_-4px_rgba(2,6,23,0.9)]">
                          NGÀY
                        </th>
                        <th className="py-2.5 px-3 text-center">GIỜ VÀO (BC)</th>
                        <th className="py-2.5 px-3 text-center">GIỜ RA (BC)</th>
                        <th className="py-2.5 px-3 text-center text-cyan-300">QUÉT QR (VÀO - RA)</th>
                        <th className="py-2.5 px-3 text-center text-sky-300">KHUÔN MẶT (VÀO - RA)</th>
                        <th className="py-2.5 px-3 text-center text-emerald-400">GIỜ CÔNG</th>
                        <th className="py-2.5 px-3 text-center text-amber-400">TC NGÀY</th>
                        <th className="py-2.5 px-3 text-center text-purple-300">TC ĐÊM</th>
                        <th className="py-2.5 px-3 text-center text-rose-400">NGÀY CHỦ NHẬT</th>
                        <th className="py-2.5 px-3 text-center text-fuchsia-300">ĐÊM CHỦ NHẬT</th>
                        <th className="py-2.5 px-3 text-center text-red-400">NGÀY LỄ</th>
                        <th className="py-2.5 px-3 text-center text-orange-400">TC ĐÊM LỄ</th>
                        <th className="py-2.5 px-3 text-center">TÌNH TRẠNG</th>
                        <th className="py-2.5 px-3 text-right">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {dayRows.map((row) => (
                        <tr
                          key={row.day}
                          className={`group hover:bg-slate-800/40 transition-colors ${
                            row.isHoliday ? 'bg-red-950/15' : row.isSunday ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          <td
                            className={`py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap sticky left-0 z-10 border-r border-slate-800/80 shadow-[4px_0_10px_-4px_rgba(2,6,23,0.9)] transition-colors ${
                              row.isHoliday
                                ? 'bg-[#1f1018]'
                                : row.isSunday
                                ? 'bg-[#19111c]'
                                : 'bg-[#0a1222]'
                            } group-hover:bg-[#1a2438]`}
                          >
                            <span>{row.dateIso}</span>
                            {row.isHoliday ? (
                              <span className="ml-1.5 text-[10px] text-red-400 font-bold">LỄ</span>
                            ) : row.isSunday ? (
                              <span className="ml-1.5 text-[10px] text-rose-400 font-bold">CN</span>
                            ) : null}
                          </td>
                          <td className="py-2.5 px-3 text-center text-amber-300 font-semibold">
                            {row.inTime}
                          </td>
                          <td className="py-2.5 px-3 text-center text-amber-300 font-semibold">
                            {row.outTime}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {row.qrInTime || row.qrOutTime ? (
                              <button
                                type="button"
                                onClick={() => {
                                  hasManualSourceChoiceRef.current = true;
                                  setComparisonSource('QR');
                                  setActiveTab('confirm');
                                }}
                                title="Xem đối chiếu Quét QR vs Chấm công thường"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-200 text-[10px] font-mono font-bold cursor-pointer transition-colors"
                              >
                                <QrCode className="w-3 h-3 text-cyan-400 shrink-0" />
                                <span>
                                  {row.qrInTime || '--:--'} / {row.qrOutTime || '--:--'}
                                </span>
                              </button>
                            ) : (
                              <span className="text-slate-600">--:--</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {row.faceInTime || row.faceOutTime ? (
                              <button
                                type="button"
                                onClick={() => {
                                  hasManualSourceChoiceRef.current = true;
                                  setComparisonSource('FACE');
                                  setActiveTab('confirm');
                                }}
                                title="Xem đối chiếu Chấm công Khuôn mặt vs Chấm công thường"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950/70 hover:bg-sky-900/80 border border-sky-500/40 text-sky-200 text-[10px] font-mono font-bold cursor-pointer transition-colors"
                              >
                                <ScanFace className="w-3 h-3 text-sky-400 shrink-0" />
                                <span>
                                  {row.faceInTime || '--:--'} / {row.faceOutTime || '--:--'}
                                </span>
                              </button>
                            ) : (
                              <span className="text-slate-600">--:--</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">
                            {row.regularHours > 0 ? `${row.regularHours}h` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center text-amber-400 font-bold">
                            {row.otDay > 0 ? `+${row.otDay}h` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center text-purple-300 font-bold">
                            {row.otNight > 0 ? `+${row.otNight}h` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center text-rose-400 font-bold">
                            {row.otSunDay > 0 ? `+${row.otSunDay}h` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center text-fuchsia-300 font-bold">
                            {row.otSunNight > 0 ? `+${row.otSunNight}h` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center text-red-400 font-bold">
                            {row.otHoliday > 0 ? `+${row.otHoliday}h` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center text-orange-400 font-bold">
                            {row.otHolidayNight > 0 ? `+${row.otHolidayNight}h` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${
                                row.statusTone === 'ot'
                                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                                  : row.statusTone === 'full'
                                  ? 'bg-teal-950/70 text-teal-300 border-teal-500/40'
                                  : row.statusTone === 'late'
                                  ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                                  : row.statusTone === 'early'
                                  ? 'bg-orange-950/70 text-orange-300 border-orange-500/40'
                                  : row.statusTone === 'leave'
                                  ? 'bg-sky-950/70 text-sky-300 border-sky-500/40'
                                  : row.statusTone === 'holiday'
                                  ? 'bg-red-950/60 text-red-300 border-red-500/40'
                                  : 'bg-slate-900 text-slate-400 border-slate-700'
                              }`}
                            >
                              {row.statusLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setReqDate(row.dateIso);
                                const defIn = staffInfo?.shift === 'NIGHT' ? '20:00' : '08:00';
                                const defOut = staffInfo?.shift === 'NIGHT' ? '05:00' : '17:00';
                                const missingIn = !row.inTime || row.inTime === '--:--';
                                const missingOut = !row.outTime || row.outTime === '--:--';
                                setInTime(missingIn ? defIn : missingOut ? '' : row.inTime);
                                setOutTime(missingOut ? defOut : missingIn ? '' : row.outTime);
                                setActiveTab('confirm');
                              }}
                              className="text-[10px] text-slate-400 hover:text-cyan-300 underline cursor-pointer whitespace-nowrap"
                            >
                              Giải trình
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: XÁC NHẬN CÔNG */}
          {activeTab === 'confirm' && (
            <div className="space-y-5 text-xs">
              <div className="p-4 rounded-xl bg-[#0a1222] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-cyan-400" />
                    <span>Xác Nhận Bảng Công Tháng {selectedMonth}/{selectedYear}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tổng ngày công: <strong className="text-white">{stats.workDaysCount} ngày</strong> · Tổng giờ làm:{' '}
                    <strong className="text-emerald-400">{stats.totalWorkHours}h</strong> (Chuẩn {stats.totalRegularHours}h + TC{' '}
                    <strong className="text-cyan-400">{stats.sumOt}h</strong>)
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    TC Ngày: {stats.totalDayOt}h · TC Đêm: {stats.totalNightOt}h · Ngày CN: {stats.totalSundayDay}h · Đêm CN: {stats.totalSundayNight}h · Ngày Lễ: {stats.totalHolidayDay}h · Đêm Lễ: {stats.totalHolidayNight}h
                  </p>
                </div>

                {isMonthConfirmed ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã Xác Nhận Đủ Công Tháng {selectedMonth}/{selectedYear}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmMonthAttendance}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer transition-colors shrink-0"
                  >
                    Xác Nhận Đủ Công Tháng {selectedMonth}/{selectedYear}
                  </button>
                )}
              </div>

              {/* BẢNG ĐỐI SOÁT CÔNG BẤT THƯỜNG / THIẾU GIỜ (ÁP DỤNG THEO TAB DỮ LIỆU CÔNG) */}
              <div className="bg-[#0a1222] border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>Bảng Đối Soát Công Bất Thường &amp; Thiếu Giờ (Tháng {selectedMonth}/{selectedYear})</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          abnormalComparisonDays.length > 0
                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                        }`}>
                          {abnormalComparisonDays.length} ngày phát sinh
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Đối chiếu giữa <strong className="text-amber-300">Chấm công thường (BC)</strong> và{' '}
                        <strong
                          className={
                            comparisonSource === 'QR'
                              ? 'text-cyan-300'
                              : comparisonSource === 'FACE'
                              ? 'text-sky-300'
                              : 'text-blue-300'
                          }
                        >
                          {comparisonSource === 'QR'
                            ? 'Chấm công Quét QR'
                            : comparisonSource === 'FACE'
                            ? 'Chấm công Khuôn Mặt'
                            : 'Máy quẹt thẻ (MQT)'}
                        </strong>
                        : chỉ xuất hiện những ngày thiếu giờ vào/ra hoặc sai lệch dữ liệu.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          hasManualSourceChoiceRef.current = true;
                          setComparisonSource('MQT');
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                          comparisonSource === 'MQT'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Quẹt thẻ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          hasManualSourceChoiceRef.current = true;
                          setComparisonSource('QR');
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                          comparisonSource === 'QR'
                            ? 'bg-cyan-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <QrCode className="w-3 h-3" />
                        <span>QR</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          hasManualSourceChoiceRef.current = true;
                          setComparisonSource('FACE');
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                          comparisonSource === 'FACE'
                            ? 'bg-sky-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <ScanFace className="w-3 h-3" />
                        <span>Khuôn mặt</span>
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Nhân viên: <strong className="text-white">{resolvedStaff.fullName}</strong> ({resolvedStaff.employeeId})
                    </span>
                  </div>
                </div>

                {abnormalComparisonDays.length === 0 ? (
                  <div className="p-8 rounded-xl bg-emerald-950/20 border border-emerald-600/40 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-900/60 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-300">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-emerald-300 uppercase">
                      Dữ Liệu Công Tháng {selectedMonth}/{selectedYear} Khớp Chuẩn 100%
                    </h4>
                    <p className="text-xs text-slate-300 max-w-lg mx-auto">
                      Không có ngày nào thiếu giờ vào/ra hoặc sai lệch dữ liệu giữa Bảng chấm công và{' '}
                      {comparisonSource === 'QR'
                        ? 'Chấm công Quét QR'
                        : comparisonSource === 'FACE'
                        ? 'Chấm công Khuôn Mặt'
                        : 'Máy quẹt thẻ'}
                      . Bạn có thể yên tâm bấm nút &quot;Xác Nhận Đủ Công&quot; phía trên.
                    </p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto custom-scrollbar rounded-lg border border-slate-800/80">
                    <table className="w-full min-w-[1560px] text-left border-collapse text-xs whitespace-nowrap">
                      <thead className="bg-slate-950/90 text-[10px] uppercase tracking-wider text-slate-300 font-semibold">
                        <tr className="border-b border-slate-800">
                          <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-800 min-w-[120px] whitespace-nowrap sticky left-0 z-30 bg-slate-950">
                            Ngày
                          </th>
                          <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-slate-800 min-w-[55px] whitespace-nowrap">
                            Thứ
                          </th>
                          <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-800 min-w-[95px] whitespace-nowrap">
                            Ca Làm Việc
                          </th>
                          <th
                            colSpan={3}
                            className="py-1.5 px-3 text-center border-r border-slate-800 bg-amber-950/35 text-amber-300 font-bold border-b border-amber-800/40 whitespace-nowrap"
                          >
                            1. BẢNG CHẤM CÔNG (BC)
                          </th>
                          <th
                            colSpan={3}
                            className={`py-1.5 px-3 text-center border-r border-slate-800 font-bold border-b whitespace-nowrap ${
                              comparisonSource === 'QR'
                                ? 'bg-cyan-950/35 text-cyan-300 border-cyan-800/40'
                                : comparisonSource === 'FACE'
                                ? 'bg-sky-950/35 text-sky-300 border-sky-800/40'
                                : 'bg-blue-950/35 text-blue-300 border-blue-800/40'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span>
                                {comparisonSource === 'QR'
                                  ? '2. CHẤM CÔNG QUÉT QR'
                                  : comparisonSource === 'FACE'
                                  ? '2. CHẤM CÔNG KHUÔN MẶT'
                                  : '2. MÁY QUẸT THẺ (MQT)'}
                              </span>
                              <span className="inline-flex items-center p-0.5 rounded bg-slate-950/80 border border-slate-700/80">
                                <button
                                  type="button"
                                  onClick={() => {
                                    hasManualSourceChoiceRef.current = true;
                                    setComparisonSource('MQT');
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                                    comparisonSource === 'MQT'
                                      ? 'bg-blue-600 text-white'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  Quẹt thẻ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    hasManualSourceChoiceRef.current = true;
                                    setComparisonSource('QR');
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                                    comparisonSource === 'QR'
                                      ? 'bg-cyan-600 text-white'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  QR
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    hasManualSourceChoiceRef.current = true;
                                    setComparisonSource('FACE');
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                                    comparisonSource === 'FACE'
                                      ? 'bg-sky-600 text-white'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  Khuôn mặt
                                </button>
                              </span>
                            </div>
                          </th>
                          <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-800 min-w-[140px] text-white font-bold whitespace-nowrap">
                            Trạng Thái Thiếu Giờ
                          </th>
                          <th rowSpan={2} className="py-2.5 px-4 border-r border-slate-800 min-w-[360px] text-white font-bold whitespace-nowrap">
                            Chi Tiết Sai Lệch
                          </th>
                          <th rowSpan={2} className="py-2.5 px-3 text-right min-w-[200px] whitespace-nowrap">
                            Thao Tác / Giải Trình
                          </th>
                        </tr>
                        <tr className="border-b border-slate-800 text-[10px] text-slate-400">
                          <th className="py-2 px-3 text-center border-r border-slate-800 bg-amber-950/15 text-amber-300 min-w-[95px] whitespace-nowrap">
                            Giờ Vào (BC)
                          </th>
                          <th className="py-2 px-3 text-center border-r border-slate-800 bg-amber-950/15 text-amber-300 min-w-[95px] whitespace-nowrap">
                            Giờ Ra (BC)
                          </th>
                          <th className="py-2 px-3 text-center border-r border-slate-800 bg-amber-950/15 text-amber-400 font-bold min-w-[95px] whitespace-nowrap">
                            Tăng Ca (BC)
                          </th>
                          <th
                            className={`py-2 px-3 text-center border-r border-slate-800 min-w-[145px] whitespace-nowrap ${
                              comparisonSource === 'QR'
                                ? 'bg-cyan-950/15 text-cyan-300'
                                : comparisonSource === 'FACE'
                                ? 'bg-sky-950/15 text-sky-300'
                                : 'bg-blue-950/15 text-blue-300'
                            }`}
                          >
                            {comparisonSource === 'QR'
                              ? 'Giờ Vào (QR)'
                              : comparisonSource === 'FACE'
                              ? 'Giờ Vào (Khuôn Mặt)'
                              : 'Giờ Vào (MQT)'}
                          </th>
                          <th
                            className={`py-2 px-3 text-center border-r border-slate-800 min-w-[145px] whitespace-nowrap ${
                              comparisonSource === 'QR'
                                ? 'bg-cyan-950/15 text-cyan-300'
                                : comparisonSource === 'FACE'
                                ? 'bg-sky-950/15 text-sky-300'
                                : 'bg-blue-950/15 text-blue-300'
                            }`}
                          >
                            {comparisonSource === 'QR'
                              ? 'Giờ Ra (QR)'
                              : comparisonSource === 'FACE'
                              ? 'Giờ Ra (Khuôn Mặt)'
                              : 'Giờ Ra (MQT)'}
                          </th>
                          <th className="py-2 px-3 text-center border-r border-slate-800 bg-blue-950/15 text-cyan-300 font-bold min-w-[100px] whitespace-nowrap">
                            {comparisonSource === 'QR'
                              ? 'Tăng Ca (QR)'
                              : comparisonSource === 'FACE'
                              ? 'Tăng Ca (Khuôn Mặt)'
                              : 'Tăng Ca (MQT)'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {abnormalComparisonDays.map((row) => {
                          const existingReq = findExistingRequest(row);
                          const isNight = row.shift === 'NIGHT';

                          const t = row.discrepancyType;
                          let badgeColor = 'bg-slate-900 text-slate-300 border-slate-700';
                          if (t === 'MISSING_IN') badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-500/50';
                          else if (t === 'MISSING_OUT') badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-500/50';
                          else if (t === 'MISSING_BOTH') badgeColor = 'bg-red-950/80 text-red-300 border-red-500/50';
                          else if (t === 'LATE_IN') badgeColor = 'bg-amber-950/70 text-amber-300 border-amber-500/40';
                          else if (t === 'EARLY_OUT') badgeColor = 'bg-orange-950/70 text-orange-300 border-orange-500/40';
                          else if (t === 'LATE_AND_EARLY') badgeColor = 'bg-rose-950/70 text-rose-300 border-rose-500/40';
                          else if (t === 'OT_MISMATCH') badgeColor = 'bg-purple-950/70 text-purple-300 border-purple-500/40';
                          else if (t === 'UNSCHEDULED_SWIPE') badgeColor = 'bg-sky-950/70 text-sky-300 border-sky-500/40';

                          return (
                            <tr key={row.rowId} className="hover:bg-slate-900/40 transition-colors">
                              {/* 1. Ngày */}
                              <td className="py-2.5 px-3 border-r border-slate-800/60 whitespace-nowrap sticky left-0 z-20 bg-[#0a1222]">
                                <div className="inline-flex items-center gap-1.5 font-bold text-white font-mono">
                                  <span>{row.dateStr}</span>
                                  {row.isHoliday && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/30 font-sans">
                                      Lễ
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 2. Thứ */}
                              <td className="py-2.5 px-2.5 text-center border-r border-slate-800/60 whitespace-nowrap">
                                <span
                                  className={`inline-block text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                    row.isSunday
                                      ? 'bg-red-950/80 text-red-300 border border-red-500/40'
                                      : 'text-slate-300'
                                  }`}
                                >
                                  {row.dayOfWeek}
                                </span>
                              </td>

                              {/* 3. Ca làm việc */}
                              <td className="py-2.5 px-3 text-center border-r border-slate-800/60 whitespace-nowrap">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    isNight
                                      ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                                      : 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                                  }`}
                                >
                                  {row.shiftLabel}
                                </span>
                              </td>

                              {/* 4. Giờ Vào (BC) */}
                              <td className="py-2.5 px-3 text-center font-mono border-r border-slate-800/60 bg-amber-950/5 whitespace-nowrap">
                                {row.bcInTime ? (
                                  <span className="font-semibold text-amber-200">{row.bcInTime}</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[10px] font-sans font-bold">
                                    Thiếu vào
                                  </span>
                                )}
                              </td>

                              {/* 5. Giờ Ra (BC) */}
                              <td className="py-2.5 px-3 text-center font-mono border-r border-slate-800/60 bg-amber-950/5 whitespace-nowrap">
                                {row.bcOutTime ? (
                                  <span className="font-semibold text-amber-200">{row.bcOutTime}</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-sans font-bold">
                                    Thiếu ra
                                  </span>
                                )}
                              </td>

                              {/* 6. Tăng Ca (BC) */}
                              <td className="py-2.5 px-3 text-center font-mono border-r border-slate-800/60 bg-amber-950/10 whitespace-nowrap">
                                <strong className={row.bcOtHours > 0 ? 'text-amber-300' : 'text-slate-500'}>
                                  {row.bcOtHours > 0 ? `+${row.bcOtHours}h` : '0h'}
                                </strong>
                              </td>

                              {/* 7. Giờ Vào (MQT) */}
                              <td className="py-2.5 px-3 text-center font-mono border-r border-slate-800/60 bg-blue-950/5 whitespace-nowrap">
                                {row.mqtInTime ? (
                                  <span className="inline-flex items-center gap-1">
                                    <span
                                      className={`font-semibold ${
                                        row.isClampedIn ? 'text-cyan-300' : 'text-emerald-400'
                                      }`}
                                    >
                                      {row.mqtInTime}
                                    </span>
                                    {row.isClampedIn && row.rawInTime && (
                                      <span className="text-[10px] text-slate-400 font-sans">
                                        (Gốc: <span className="font-mono text-slate-300">{row.rawInTime}</span>)
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[10px] font-sans font-bold">
                                    {comparisonSource === 'QR'
                                      ? 'Chưa quét QR vào'
                                      : comparisonSource === 'FACE'
                                      ? 'Chưa chấm khuôn mặt vào'
                                      : 'Chưa quẹt vào'}
                                  </span>
                                )}
                              </td>

                              {/* 8. Giờ Ra (MQT / QR / FACE) */}
                              <td className="py-2.5 px-3 text-center font-mono border-r border-slate-800/60 bg-blue-950/5 whitespace-nowrap">
                                {row.mqtOutTime ? (
                                  <span className="inline-flex items-center gap-1">
                                    <span
                                      className={`font-semibold ${
                                        row.isClampedOut ? 'text-cyan-300' : 'text-emerald-400'
                                      }`}
                                    >
                                      {row.mqtOutTime}
                                    </span>
                                    {row.isClampedOut && row.rawOutTime && (
                                      <span className="text-[10px] text-slate-400 font-sans">
                                        (Gốc: <span className="font-mono text-slate-300">{row.rawOutTime}</span>)
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-sans font-bold">
                                    {comparisonSource === 'QR'
                                      ? 'Chưa quét QR ra'
                                      : comparisonSource === 'FACE'
                                      ? 'Chưa chấm khuôn mặt ra'
                                      : 'Chưa quẹt ra'}
                                  </span>
                                )}
                              </td>

                              {/* 9. Tăng Ca (MQT) */}
                              <td className="py-2.5 px-3 text-center font-mono border-r border-slate-800/60 bg-blue-950/10 whitespace-nowrap">
                                <strong className={row.mqtOtHours > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                                  {row.mqtOtHours > 0 ? `+${row.mqtOtHours}h` : '0h'}
                                </strong>
                              </td>

                              {/* 10. Trạng thái thiếu giờ */}
                              <td className="py-2.5 px-3 text-center border-r border-slate-800/60 whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${badgeColor}`}>
                                  {row.discrepancyLabel}
                                </span>
                              </td>

                              {/* 11. Chi tiết sai lệch (trên 1 dòng) */}
                              <td className="py-2.5 px-4 border-r border-slate-800/60 whitespace-nowrap">
                                <span className="text-[11px] text-slate-300 font-sans">
                                  {row.discrepancyDetail}
                                </span>
                              </td>

                              {/* 12. Thao tác (trên 1 dòng) */}
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                                  {/* Sửa Bảng Công (Chỉ dành cho HC & NS, Admin, Trưởng ca bộ phận) */}
                                  {allowManualAttendance && (
                                    <button
                                      type="button"
                                      onClick={() => openEditBc(row)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 hover:text-cyan-200 text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap"
                                      title="Sửa giờ vào hoặc giờ ra của Bảng Chấm Công (Chỉ HC&NS / Admin / Trưởng ca)"
                                    >
                                      <Edit3 className="w-3 h-3 shrink-0" />
                                      <span>Sửa BC</span>
                                    </button>
                                  )}

                                  {/* Giải trình NPT-FM-008 hoặc Xem lại */}
                                  {existingReq ? (
                                    <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                                          existingReq.status === 'APPROVED'
                                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                                        }`}
                                      >
                                        {existingReq.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setViewingAbnormalReq(existingReq)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold cursor-pointer transition-colors whitespace-nowrap"
                                        title="Xem & in lại phiếu NPT-FM-008"
                                      >
                                        <Printer className="w-3 h-3 shrink-0" />
                                        <span>Xem / In lại</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setExplainingRow(row)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600/90 hover:bg-amber-500 border border-amber-400 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-sm whitespace-nowrap"
                                      title="Lập phiếu xác nhận công bất thường NPT-FM-008"
                                    >
                                      <FileText className="w-3 h-3 shrink-0" />
                                      <span>Giải trình</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* LỊCH SỬ PHIẾU GIẢI TRÌNH CÔNG BẤT THƯỜNG (MẪU NPT-FM-008) */}
              <div className="bg-[#0a1222] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-sm text-white">
                      Lịch Sử Giải Trình Chấm Công Bất Thường (Mẫu NPT-FM-008)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-mono">
                      {myRequests.length} phiếu
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualRequestForm(!showManualRequestForm)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    {showManualRequestForm ? 'Đóng form thủ công' : '+ Lập đơn giải trình ngày khác'}
                  </button>
                </div>

                {/* Form giải trình thủ công (cho ngày khác ngoài danh sách) */}
                {showManualRequestForm && (
                  <form
                    onSubmit={handleSendRequest}
                    className="p-3 rounded-lg bg-slate-950 border border-cyan-500/30 space-y-3 mb-3 animate-fade-in"
                  >
                    <div className="font-bold text-xs text-cyan-300">
                      Nộp phiếu giải trình thủ công (Ngày ngoài danh sách tự động)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Ngày cần giải trình</label>
                        <input
                          type="date"
                          value={reqDate}
                          onChange={(e) => setReqDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Giờ vào thực tế</label>
                        <input
                          type="time"
                          value={inTime}
                          onChange={(e) => setInTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Giờ ra thực tế</label>
                        <input
                          type="time"
                          value={outTime}
                          onChange={(e) => setOutTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Phân loại lỗi</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setReqCategory('PERSONAL')}
                            className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                              reqCategory === 'PERSONAL'
                                ? 'bg-cyan-600/80 border-cyan-400 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            Lỗi cá nhân
                          </button>
                          <button
                            type="button"
                            onClick={() => setReqCategory('SYSTEM')}
                            className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                              reqCategory === 'SYSTEM'
                                ? 'bg-amber-600/80 border-amber-400 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            Lỗi hệ thống
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Lý do giải trình</label>
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Ví dụ: Quên quẹt thẻ vào ca..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowManualRequestForm(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
                      >
                        Gửi Đơn Giải Trình
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                  {myRequests.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                      Chưa có đơn giải trình nào được nộp cho mã nhân viên {empId}.
                    </div>
                  ) : (
                    myRequests.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono">{r.date}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                r.status === 'APPROVED'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                              }`}
                            >
                              {r.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                              {r.reasonCategory === 'SYSTEM' ? 'Lỗi hệ thống' : 'Lỗi cá nhân'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Giờ xác nhận: <strong className="text-slate-200">Vào {r.inTime || '--:--'}</strong> · <strong className="text-slate-200">Ra {r.outTime || '--:--'}</strong>
                          </div>
                          <p className="text-xs text-slate-300">
                            <span className="text-slate-400">Lý do: </span>{r.reason}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setViewingAbnormalReq(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/40 text-cyan-300 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Xem / In lại Phiếu NPT-FM-008</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* MODAL SỬA GIỜ BẢNG CHẤM CÔNG (BC) */}
              {editingBcDay && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                  <div className="bg-[#0f172a] border border-cyan-500/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
                          <Edit3 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            Sửa Giờ Bảng Chấm Công (BC)
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Ngày {editingBcDay.dateStr} ({editingBcDay.dayOfWeek}) · {resolvedStaff.fullName} ({resolvedStaff.employeeId})
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingBcDay(null)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Quick presets */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                        Chọn nhanh thời gian làm việc:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => applyBcPreset('08:00', '17:00', 'DAY')}
                          className="px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] text-left cursor-pointer transition-colors"
                        >
                          <div className="font-bold text-cyan-300">Ca ngày (8:00~17:00)</div>
                          <div className="text-[10px] text-slate-400">08:00 - 17:00 · Chuẩn 8h công</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyBcPreset('08:00', '20:00', 'DAY')}
                          className="px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] text-left cursor-pointer transition-colors"
                        >
                          <div className="font-bold text-emerald-300">Ca ngày (8:00~20:00)+3h</div>
                          <div className="text-[10px] text-slate-400">08:00 - 20:00 · 8h + 3h tăng ca</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyBcPreset('20:00', '05:00', 'NIGHT')}
                          className="px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] text-left cursor-pointer transition-colors"
                        >
                          <div className="font-bold text-indigo-300">Ca đêm (20:00~5:00)</div>
                          <div className="text-[10px] text-slate-400">20:00 - 05:00 · Chuẩn 8h đêm</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyBcPreset('20:00', '08:00', 'NIGHT')}
                          className="px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] text-left cursor-pointer transition-colors"
                        >
                          <div className="font-bold text-amber-300">Ca đêm (20:00~8:00)+3h</div>
                          <div className="text-[10px] text-slate-400">20:00 - 08:00 · 8h + 3h tăng ca</div>
                        </button>
                      </div>

                      {(editingBcDay.mqtInTime || editingBcDay.mqtOutTime) && (
                        <button
                          type="button"
                          onClick={() => {
                            const defIn = editingBcDay.shift === 'NIGHT' ? '20:00' : '08:00';
                            const defOut = editingBcDay.shift === 'NIGHT' ? '05:00' : '17:00';
                            applyBcPreset(
                              editingBcDay.mqtInTime || defIn,
                              editingBcDay.mqtOutTime || defOut,
                              editingBcDay.shift
                            );
                          }}
                          className="w-full mt-2 px-2.5 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-600/40 text-cyan-300 text-[11px] text-left flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="font-bold">
                              {comparisonSource === 'QR'
                                ? 'Lấy theo giờ Quét QR: '
                                : comparisonSource === 'FACE'
                                ? 'Lấy theo giờ Khuôn Mặt: '
                                : 'Lấy theo giờ máy quẹt thẻ: '}
                            </span>
                            <span className="font-mono">{editingBcDay.mqtInTime || '--:--'} - {editingBcDay.mqtOutTime || '--:--'}</span>
                          </div>
                          <span className="text-[10px] text-cyan-400 underline">Áp dụng ngay &rarr;</span>
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleSaveBcEdit} className="space-y-3.5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Ca làm việc
                          </label>
                          <select
                            value={
                              editBcShift === 'NIGHT'
                                ? editBcOutTime === '05:00' && editBcOtHours === 0
                                  ? 'NIGHT_NORMAL'
                                  : 'NIGHT_OT'
                                : editBcOutTime === '20:00' || editBcOtHours > 0
                                ? 'DAY_OT'
                                : 'DAY_NORMAL'
                            }
                            onChange={(e) =>
                              handleBcTimeOrShiftChange({ presetKey: e.target.value })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs font-semibold focus:border-cyan-500"
                          >
                            <option value="DAY_NORMAL">Ca ngày (8:00~17:00)</option>
                            <option value="DAY_OT">Ca ngày (8:00~20:00)+3h</option>
                            <option value="NIGHT_NORMAL">Ca đêm (20:00~5:00)</option>
                            <option value="NIGHT_OT">Ca đêm (20:00~8:00)+3h</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Trạng thái đề xuất
                          </label>
                          <input
                            type="text"
                            value={editBcStatus}
                            onChange={(e) => setEditBcStatus(e.target.value as AttendanceStatus)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Giờ vào Bảng công (Check-in) *
                          </label>
                          <input
                            type="time"
                            value={editBcInTime}
                            onChange={(e) =>
                              handleBcTimeOrShiftChange({ inTime: e.target.value })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-xs focus:border-cyan-500 outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Giờ ra Bảng công (Check-out) *
                          </label>
                          <input
                            type="time"
                            value={editBcOutTime}
                            onChange={(e) =>
                              handleBcTimeOrShiftChange({ outTime: e.target.value })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-xs focus:border-cyan-500 outline-none"
                            required
                          />
                        </div>
                      </div>

                      {/* Live Calculation preview */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-400">Giờ chuẩn: </span>
                          <strong className="text-white font-mono">{editBcRegularHours}h</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Tăng ca: </span>
                          <strong className="text-cyan-400 font-mono">
                            {editBcOtHours > 0 ? `+${editBcOtHours}h` : '0h'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Tổng làm: </span>
                          <strong className="text-emerald-400 font-mono">
                            {Math.round((editBcRegularHours + editBcOtHours) * 10) / 10}h
                          </strong>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-relaxed italic">
                        * Khi lưu, hệ thống sẽ tự động cập nhật cả Bảng chấm công MultiAuto và Bảng chấm công Toàn nhà máy, tính lại tổng giờ và đồng bộ dữ liệu phiếu lương.
                      </p>

                      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setEditingBcDay(null)}
                          className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-600/30"
                        >
                          <Save className="w-4 h-4" />
                          <span>Lưu Bảng Chấm Công</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* MODAL GIẢI TRÌNH CHẤM CÔNG BẤT THƯỜNG (NPT-FM-008) CHO HÀNG PHÁT SINH */}
              {explainingRow && (
                <AbnormalAttendanceModal
                  mode="explain"
                  sourceContext={{
                    staff: resolvedStaff,
                    dateStr: explainingRow.dateStr,
                    dayOfWeek: explainingRow.dayOfWeek,
                    shift: explainingRow.shift,
                    bcInTime: explainingRow.bcInTime,
                    bcOutTime: explainingRow.bcOutTime,
                    bcOtHours: explainingRow.bcOtHours,
                    rawInTime: explainingRow.rawInTime,
                    rawOutTime: explainingRow.rawOutTime,
                    mqtInTime: explainingRow.mqtInTime,
                    mqtOutTime: explainingRow.mqtOutTime,
                    discrepancyType: explainingRow.discrepancyType,
                    discrepancyLabel: explainingRow.discrepancyLabel,
                    discrepancyDetail: explainingRow.discrepancyDetail,
                    sourceMode: comparisonSource,
                  }}
                  existingRequests={myRequests}
                  onClose={() => setExplainingRow(null)}
                  onSubmitExplanation={({
                    request,
                    applyFixToMachine,
                    confirmedInTime,
                    confirmedOutTime,
                  }) => {
                    onRequestCorrection(request);
                    if (applyFixToMachine && explainingRow) {
                      const key = `${resolvedStaff.employeeId.trim().toLowerCase()}_${explainingRow.day}`;
                      const targetMap =
                        comparisonSource === 'QR'
                          ? qrPunchRecords
                          : comparisonSource === 'FACE'
                          ? facePunchRecords
                          : swipeRecords;
                      const existingSwipe = targetMap[key];
                      const nextIn =
                        normalizeTimeString(confirmedInTime) ||
                        existingSwipe?.rawInTime ||
                        explainingRow.rawInTime ||
                        '';
                      const nextOut =
                        normalizeTimeString(confirmedOutTime) ||
                        existingSwipe?.rawOutTime ||
                        explainingRow.rawOutTime ||
                        '';

                      const nextMap = {
                        ...targetMap,
                        [key]: {
                          id: key,
                          employeeId: resolvedStaff.employeeId,
                          fullName: resolvedStaff.fullName,
                          department: resolvedStaff.department || 'MULTI',
                          date: explainingRow.dateStr,
                          rawInTime: nextIn,
                          rawOutTime: nextOut,
                          note: `Xác nhận NPT-FM-008 (${comparisonSource}): ${request.reason}`,
                        },
                      };
                      if (comparisonSource === 'QR') {
                        saveQrPunches(nextMap);
                      } else if (comparisonSource === 'FACE') {
                        saveFacePunches(nextMap);
                      } else {
                        saveSwipes(nextMap);
                      }
                    }
                    setExplainingRow(null);
                    showToast(
                      `Đã gửi giải trình chấm công bất thường ngày ${explainingRow.dateStr}!`
                    );
                  }}
                />
              )}

              {/* MODAL XEM / IN LẠI PHIẾU NPT-FM-008 */}
              {viewingAbnormalReq && (
                <AbnormalAttendanceModal
                  mode="view"
                  existingRequest={viewingAbnormalReq}
                  existingRequests={myRequests}
                  onClose={() => setViewingAbnormalReq(null)}
                />
              )}
            </div>
          )}

          {/* TAB 3: ĐĂNG KÝ PHÉP (ĐỒNG BỘ VỚI HC & NS - MẪU NPT-FM-007) */}
          {activeTab === 'leave' && (
            <LeaveRegistrationWorkbench
              allStaff={[resolvedEmployeeForLeave]}
              leaveRecords={leaveRecords}
              onAddLeaveRecord={handleProfileAddLeave}
              onDeleteLeaveRecord={onDeleteLeaveRecord}
              lockedEmployee={resolvedEmployeeForLeave}
              createdByLabel={currentUser.role === 'staff' ? 'Hồ sơ NV' : 'HC & NS'}
              compact
            />
          )}

          {/* TAB 4: LƯƠNG & PHIẾU */}
          {activeTab === 'salary' && (
            !viewerHasSalaryAccess ? (
              <div className="bg-[#0a1222] border border-rose-800/50 rounded-xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-700/50 flex items-center justify-center mx-auto text-rose-400">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  Thông Tin Lương Được Bảo Mật
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Thông tin lương và phụ cấp của nhân viên được bảo mật theo quy định công ty. Chỉ người có thẩm quyền được Admin cấp phép tại Tab{' '}
                  <span className="text-emerald-300 font-semibold">ADMIN &rarr; Bảo Mật Lương</span> mới có thể xem.
                </p>
              </div>
            ) : (
            <div className="space-y-4 text-xs">
              {/* Phiếu Lương Tháng Đang Chọn (Tính đồng bộ từ bảng công & cấu hình lương) */}
              <div className="bg-gradient-to-br from-[#0a1628] via-[#0a1222] to-emerald-950/20 border border-emerald-700/50 rounded-xl p-4 space-y-3 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/90">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>
                        Phiếu Lương Tháng {selectedMonth}/{selectedYear}
                      </span>
                      {issuedSlipForSelectedMonth ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold">
                          Đã phát hành
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 text-[10px] font-semibold">
                          Đồng bộ bảng công
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Chi tiết thu nhập, tăng ca, phụ cấp và các khoản khấu trừ của{' '}
                      <strong className="text-slate-200">{empName}</strong> ({empId}).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openOfficialSlipModal(
                        monthKey,
                        issuedSlipForSelectedMonth?.salaryConfig,
                        issuedSlipForSelectedMonth?.attendanceSummary
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Xem Phiếu Lương T{selectedMonth}/{selectedYear}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[10px] font-sans text-slate-400 uppercase">
                      Ngày công
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                      {selectedMonthSlipPreview.workDaysCount} ngày
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[10px] font-sans text-cyan-300 uppercase">
                      Tổng thu nhập (I)
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-cyan-300 mt-0.5">
                      {formatVnd(selectedMonthSlipPreview.sectionITotal)} ₫
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[10px] font-sans text-rose-300 uppercase">
                      Khấu trừ (II+III+IV)
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-rose-300 mt-0.5">
                      {formatVnd(
                        selectedMonthSlipPreview.sectionIITotal +
                          selectedMonthSlipPreview.personalIncomeTaxAmount +
                          selectedMonthSlipPreview.sectionIVTotal
                      )}{' '}
                      ₫
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/35 border border-emerald-600/50">
                    <div className="text-[10px] font-sans text-emerald-300 font-bold uppercase">
                      Thực lĩnh (V)
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-emerald-400 mt-0.5">
                      {formatVnd(selectedMonthSlipPreview.netSalaryAmount)} ₫
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0a1222] border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>Phiếu Lương Đã Phát Hành ({mySalarySlips.length})</span>
                </h3>
                {mySalarySlips.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    Chưa có phiếu lương nào được phát hành cho mã nhân viên {empId}.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mySalarySlips.map((s) => (
                      <div key={s.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm">Phiếu lương tháng {s.month}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {s.fileName} · Cập nhật: {s.uploadDate}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openOfficialSlipModal(s.month, s.salaryConfig, s.attendanceSummary)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Xem phiếu lương</span>
                            </button>
                            <span className="px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-700/40 font-mono text-[11px] font-semibold">
                              Đã phát hành
                            </span>
                          </div>
                        </div>

                        {s.attendanceSummary && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-800/80 font-mono text-[11px]">
                            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
                              <span className="text-[10px] text-slate-400 block font-sans">Tổng ngày công</span>
                              <span className="font-bold text-white">{s.attendanceSummary.workDaysCount} ngày</span>
                            </div>
                            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
                              <span className="text-[10px] text-emerald-300 block font-sans">Công ngày / đêm</span>
                              <span className="font-bold text-emerald-400">
                                {s.attendanceSummary.regularDayHours}h / {s.attendanceSummary.regularNightHours}h
                              </span>
                            </div>
                            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
                              <span className="text-[10px] text-amber-300 block font-sans">TC Ngày / Đêm</span>
                              <span className="font-bold text-amber-400">
                                {s.attendanceSummary.otDayHours}h / {s.attendanceSummary.otNightHours}h
                              </span>
                            </div>
                            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
                              <span className="text-[10px] text-pink-300 block font-sans">CN Ngày / Đêm</span>
                              <span className="font-bold text-pink-400">
                                {s.attendanceSummary.otSundayDayHours}h / {s.attendanceSummary.otSundayNightHours}h
                              </span>
                            </div>
                            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
                              <span className="text-[10px] text-red-300 block font-sans">Lễ Ngày / Đêm</span>
                              <span className="font-bold text-red-400">
                                {s.attendanceSummary.otHolidayDayHours}h / {s.attendanceSummary.otHolidayNightHours}h
                              </span>
                            </div>
                          </div>
                        )}
                        {s.salaryConfig && (
                          <div className="pt-2 border-t border-slate-800/80 space-y-2">
                            <div className="text-[11px] font-bold text-emerald-300 uppercase">
                              Chi Tiết Lương &amp; Phụ Cấp
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 text-[11px]">
                              {SALARY_NUMERIC_FIELDS.map((f) => (
                                <div
                                  key={f.key}
                                  className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900/90 border border-slate-800"
                                >
                                  <span className="text-slate-400">{f.label}</span>
                                  <span className="font-mono font-semibold text-white">
                                    {formatVnd(Number(s.salaryConfig?.[f.key]) || 0)} ₫
                                  </span>
                                </div>
                              ))}
                              <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-rose-950/25 border border-rose-800/50">
                                <span className="text-rose-300">Công đoàn phí</span>
                                <span className="font-mono font-semibold text-rose-300">
                                  {formatVnd(Number(s.salaryConfig?.unionFee) || 0)} ₫
                                </span>
                              </div>
                              <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-orange-950/25 border border-orange-800/50">
                                <span className="text-orange-300">
                                  {(Number(s.salaryConfig?.personalIncomeTax) || 0) > 0
                                    ? `Thuế TNCN (10% vượt ${formatVnd(Number(s.salaryConfig?.personalIncomeTax) || 0)})`
                                    : 'Thuế TNCN'}
                                </span>
                                <span className="font-mono font-semibold text-orange-300">
                                  {formatVnd(
                                    calculatePitAboveThreshold(
                                      s.salaryConfig?.totalSalary || 0,
                                      s.salaryConfig?.personalIncomeTax
                                    )
                                  )}{' '}
                                  ₫
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-700/50">
                                <span className="text-amber-300 font-semibold text-[11px]">
                                  Tổng lương tính OVT &amp; BH
                                </span>
                                <span className="font-mono font-bold text-amber-300">
                                  {formatVnd(s.salaryConfig.ovtInsuranceBase)} ₫
                                </span>
                              </div>
                              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-700/50">
                                <span className="text-emerald-300 font-bold text-[11px]">
                                  Tổng lương chính
                                </span>
                                <span className="font-mono font-bold text-emerald-300">
                                  {formatVnd(s.salaryConfig.totalSalary)} ₫
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {mySalaryConfig && (
                <div className="bg-[#0a1222] border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-cyan-400" />
                      <span>Cấu Hình Lương &amp; Phụ Cấp Hiện Tại</span>
                    </h3>
                    {mySalaryConfig.updatedAt && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Cập nhật: {mySalaryConfig.updatedAt}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                    {SALARY_NUMERIC_FIELDS.map((f) => (
                      <div
                        key={f.key}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800"
                      >
                        <span className="text-slate-400">{f.label}</span>
                        <span className="font-mono font-semibold text-white">
                          {formatVnd(Number(mySalaryConfig[f.key]) || 0)} ₫
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-rose-950/25 border border-rose-800/50">
                      <span className="text-rose-300">Công đoàn phí</span>
                      <span className="font-mono font-semibold text-rose-300">
                        {formatVnd(Number(mySalaryConfig.unionFee) || 0)} ₫
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-orange-950/25 border border-orange-800/50">
                      <span className="text-orange-300">
                        {(Number(mySalaryConfig.personalIncomeTax) || 0) > 0
                          ? `Thuế TNCN (10% vượt ${formatVnd(Number(mySalaryConfig.personalIncomeTax) || 0)})`
                          : 'Thuế TNCN'}
                      </span>
                      <span className="font-mono font-semibold text-orange-300">
                        {formatVnd(
                          calculatePitAboveThreshold(
                            mySalaryConfig.totalSalary || 0,
                            mySalaryConfig.personalIncomeTax
                          )
                        )}{' '}
                        ₫
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-700/50">
                      <span className="text-amber-300 font-semibold text-[11px]">
                        Tổng lương tính OVT &amp; BH
                      </span>
                      <span className="font-mono font-bold text-amber-300">
                        {formatVnd(mySalaryConfig.ovtInsuranceBase)} ₫
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-700/50">
                      <span className="text-emerald-300 font-bold text-[11px]">
                        Tổng lương chính
                      </span>
                      <span className="font-mono font-bold text-emerald-300">
                        {formatVnd(mySalaryConfig.totalSalary)} ₫
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-[#0a1222] border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-sm text-white pb-2 border-b border-slate-800">
                  Bảng Công Bộ Phận ({payrollRecords.length})
                </h3>
                {payrollRecords.length === 0 ? (
                  <div className="py-6 text-center text-slate-500">Chưa có bảng công tổng hợp nào được tải lên.</div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {payrollRecords.map((p) => (
                      <div key={p.id} className="py-2.5 flex justify-between text-slate-300">
                        <span className="font-semibold text-white">
                          {p.month} - {p.department} ({p.fileName})
                        </span>
                        <span className="font-mono text-slate-400">{p.uploadDate}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )
          )}

          {/* TAB 5: TĂNG CA */}
          {activeTab === 'overtime' && (
            <div className="bg-[#0a1222] border border-slate-800 rounded-xl p-4 space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Timer className="w-4 h-4 text-orange-400" />
                  <span>Tổng Hợp Tăng Ca Tháng {selectedMonth}/{selectedYear} (Từ Chấm Công Multi Auto)</span>
                </h3>
                <span className="font-mono font-bold text-cyan-400">
                  Tổng TC Tháng: {stats.sumOt}h ({myMatrixOvertimeDays.length} ngày)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-amber-500/30 text-center">
                  <div className="text-[10px] text-amber-300">TC Ngày</div>
                  <div className="text-base font-bold font-mono text-amber-400 mt-0.5">{stats.totalDayOt}h</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-purple-500/30 text-center">
                  <div className="text-[10px] text-purple-300">TC Đêm</div>
                  <div className="text-base font-bold font-mono text-purple-300 mt-0.5">{stats.totalNightOt}h</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-rose-500/30 text-center">
                  <div className="text-[10px] text-rose-300">Ngày CN</div>
                  <div className="text-base font-bold font-mono text-rose-400 mt-0.5">{stats.totalSundayDay}h</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-fuchsia-500/30 text-center">
                  <div className="text-[10px] text-fuchsia-300">Đêm CN</div>
                  <div className="text-base font-bold font-mono text-fuchsia-300 mt-0.5">{stats.totalSundayNight}h</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-red-500/30 text-center">
                  <div className="text-[10px] text-red-300">Ngày Lễ</div>
                  <div className="text-base font-bold font-mono text-red-400 mt-0.5">{stats.totalHolidayDay}h</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-orange-500/30 text-center">
                  <div className="text-[10px] text-orange-300">TC Đêm Lễ</div>
                  <div className="text-base font-bold font-mono text-orange-400 mt-0.5">{stats.totalHolidayNight}h</div>
                </div>
              </div>

              {/* Matrix OT Day-by-Day List */}
              <div>
                <h4 className="font-bold text-slate-200 mb-2">
                  Chi Tiết Các Ngày Làm Thêm Giờ Trong Bảng Chấm Công ({myMatrixOvertimeDays.length} ngày)
                </h4>
                {myMatrixOvertimeDays.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    Chưa có giờ tăng ca nào trong tháng {selectedMonth}/{selectedYear}.
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto overflow-y-auto custom-scrollbar max-h-72 rounded-lg border border-slate-800">
                    <table className="w-full min-w-[780px] text-left border-collapse font-mono text-[11px]">
                      <thead className="bg-slate-950 text-[10px] text-slate-400 uppercase border-b border-slate-800 sticky top-0 z-20 whitespace-nowrap">
                        <tr>
                          <th className="py-2 px-3 sticky left-0 z-30 bg-slate-950 border-r border-slate-800/80 whitespace-nowrap shadow-[4px_0_10px_-4px_rgba(2,6,23,0.9)]">
                            Ngày
                          </th>
                          <th className="py-2 px-3 text-center">Vào - Ra</th>
                          <th className="py-2 px-3 text-center text-amber-400">TC Ngày</th>
                          <th className="py-2 px-3 text-center text-purple-300">TC Đêm</th>
                          <th className="py-2 px-3 text-center text-rose-400">Ngày CN</th>
                          <th className="py-2 px-3 text-center text-fuchsia-300">Đêm CN</th>
                          <th className="py-2 px-3 text-center text-red-400">Ngày Lễ</th>
                          <th className="py-2 px-3 text-center text-orange-400">TC Đêm Lễ</th>
                          <th className="py-2 px-3 text-right text-cyan-300">Tổng TC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {myMatrixOvertimeDays.map((r) => (
                          <tr key={r.day} className="group hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-3 text-slate-200 font-semibold whitespace-nowrap sticky left-0 z-10 bg-slate-900 group-hover:bg-[#1a2438] border-r border-slate-800/80 shadow-[4px_0_10px_-4px_rgba(2,6,23,0.9)] transition-colors">
                              {r.dateIso}
                              {r.isHoliday && <span className="ml-1.5 text-[9px] text-red-400">LỄ</span>}
                              {!r.isHoliday && r.isSunday && <span className="ml-1.5 text-[9px] text-rose-400">CN</span>}
                            </td>
                            <td className="py-2 px-3 text-center text-cyan-400 whitespace-nowrap">
                              {r.inTime} - {r.outTime}
                            </td>
                            <td className="py-2 px-3 text-center text-amber-400 font-bold">
                              {r.otDay > 0 ? `+${r.otDay}h` : '-'}
                            </td>
                            <td className="py-2 px-3 text-center text-purple-300 font-bold">
                              {r.otNight > 0 ? `+${r.otNight}h` : '-'}
                            </td>
                            <td className="py-2 px-3 text-center text-rose-400 font-bold">
                              {r.otSunDay > 0 ? `+${r.otSunDay}h` : '-'}
                            </td>
                            <td className="py-2 px-3 text-center text-fuchsia-300 font-bold">
                              {r.otSunNight > 0 ? `+${r.otSunNight}h` : '-'}
                            </td>
                            <td className="py-2 px-3 text-center text-red-400 font-bold">
                              {r.otHoliday > 0 ? `+${r.otHoliday}h` : '-'}
                            </td>
                            <td className="py-2 px-3 text-center text-orange-400 font-bold">
                              {r.otHolidayNight > 0 ? `+${r.otHolidayNight}h` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right text-cyan-300 font-bold">
                              +{r.totalOtDayRow}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <h4 className="font-bold text-slate-300 pt-2">Phiếu Đăng Ký Tăng Ca Bổ Sung ({myOvertime.length})</h4>
              {myOvertime.length === 0 ? (
                <div className="py-4 text-center text-slate-500">Chưa có phiếu đăng ký tăng ca bổ sung.</div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {myOvertime.map((o) => (
                    <div key={o.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-white">{o.date}</div>
                        <div className="text-[11px] text-slate-400">{o.reason || 'Tăng ca theo phân công'}</div>
                      </div>
                      <span className="font-mono font-bold text-cyan-400">+{o.hours}h</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: HỢP ĐỒNG */}
          {activeTab === 'contract' && (
            <div className="bg-[#0a1222] border border-slate-800 rounded-xl p-4 space-y-4 text-xs">
              <h3 className="font-bold text-sm text-white pb-2 border-b border-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Hồ Sơ &amp; Hợp Đồng Lao Động</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div>
                  <span className="text-slate-400 block">Họ và tên:</span>
                  <span className="font-bold text-white">{empName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Mã nhân viên:</span>
                  <span className="font-mono font-bold text-cyan-400">{empId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Ngày vào làm:</span>
                  <span className="font-mono text-slate-200">{staffInfo?.dateJoined || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Ngày sinh:</span>
                  <span className="font-mono text-slate-200">{staffInfo?.dob || '--'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Ca làm việc:</span>
                  <span className="text-amber-300 font-semibold">
                    {staffInfo?.shift === 'NIGHT' ? 'Ca Đêm (20:00 - 08:00)' : 'Ca Ngày (08:00 - 20:00)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Đơn vị / Bộ phận:</span>
                  <span className="text-slate-200 font-semibold">{empDept}</span>
                </div>
              </div>

              {myContracts.length === 0 ? (
                <div className="py-6 text-center text-slate-500">
                  Chưa có tệp hợp đồng lao động điện tử nào được tải lên cho nhân viên này.
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {myContracts.map((c) => (
                    <div key={c.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{c.fileName}</div>
                        {c.note && <div className="text-[11px] text-slate-400">{c.note}</div>}
                      </div>
                      <span className="font-mono text-slate-400">{c.uploadDate}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-modal: Edit Employee Identity Info */}
      {isEditingInfo && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full max-h-[90dvh] overflow-y-auto custom-scrollbar p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <span>Sửa Thông Tin Nhân Viên ({empId})</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingInfo(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffEdit} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1">Họ Và Tên</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Chức Vụ</label>
                  <input
                    type="text"
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Ca Làm Việc</label>
                  <select
                    value={editForm.shift}
                    onChange={(e) => setEditForm({ ...editForm, shift: e.target.value as 'DAY' | 'NIGHT' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    <option value="DAY">Ca Ngày</option>
                    <option value="NIGHT">Ca Đêm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Số Điện Thoại</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="VD: 0987123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Quê Quán</label>
                  <input
                    type="text"
                    value={editForm.hometown}
                    onChange={(e) => setEditForm({ ...editForm, hometown: e.target.value })}
                    placeholder="VD: Bắc Ninh"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Ngày Vào Làm</label>
                  <input
                    type="text"
                    value={editForm.dateJoined}
                    onChange={(e) => setEditForm({ ...editForm, dateJoined: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Ngày Sinh</label>
                  <input
                    type="text"
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingInfo(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Thông Tin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingSlipModal && (
        <SalarySlipModal
          data={viewingSlipModal}
          onClose={() => setViewingSlipModal(null)}
        />
      )}

      <EmployeeQRModal
        staff={showQrModal ? resolvedStaff : null}
        onClose={() => setShowQrModal(false)}
        canManage={allowManageQr}
        onToggleQrAccess={handleToggleMyQrAccess}
        onRegenerateQrToken={handleRegenerateMyQrToken}
      />

      <AttendanceQRScannerModal
        isOpen={showAttendanceQrScanner}
        staff={resolvedStaff}
        allStaff={allStaff && allStaff.length > 0 ? allStaff : [resolvedStaff]}
        onClose={() => setShowAttendanceQrScanner(false)}
        onSuccess={(res) => {
          setShowAttendanceQrScanner(false);
          hasManualSourceChoiceRef.current = true;
          setComparisonSource('QR');
          const [pYear, pMonth] = res.dateIso.split('-').map(Number);
          if (pYear && pMonth) {
            setSelectedYear(pYear);
            setSelectedMonth(pMonth);
            setQrPunchRecords(loadQrPunchMap(pYear, pMonth));
          } else {
            setQrPunchRecords(loadQrPunchMap(selectedYear, selectedMonth));
          }
          setMatrixRefreshTick((t) => t + 1);
          const timeText =
            res.mode === 'IN'
              ? `Giờ Vào ${res.inTime}`
              : res.mode === 'OUT'
              ? `Giờ Ra ${res.outTime}`
              : `${res.inTime || '--:--'} - ${res.outTime || '--:--'}`;
          showToast(
            `Đã chấm công QR ngày ${res.dateStr} (${timeText}) vào cột Chấm công QR (bộ phận ${res.departmentLabel}) để đối chiếu với chấm công thường!`
          );
        }}
      />
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
      >
        <div className="relative w-full max-w-[1280px] h-[92dvh] sm:h-[90vh] max-h-[860px] flex min-w-0 min-h-0">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 z-40 w-8 h-8 rounded-full bg-slate-900/95 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-lg"
              title="Đóng hồ sơ (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {profileBody}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-2 sm:p-6 max-w-[1360px] w-full min-w-0 mx-auto min-h-[calc(100dvh-7rem)] flex ${
        showEmployeeMobileMenu ? 'pb-28 md:pb-6' : ''
      }`}
    >
      {profileBody}
      {showEmployeeMobileMenu && (
        <EmployeeMobileBottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            window.setTimeout(() => {
              if (tab === 'overview') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                rightPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 50);
          }}
          onOpenQr={() => setShowQrModal(true)}
        />
      )}
    </div>
  );
};
