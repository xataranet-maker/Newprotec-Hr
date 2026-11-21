import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  EmployeeSalaryConfig,
  SalarySecurityConfig,
  SalarySlipRecord,
  StaffRecord,
  UserAccount,
} from '../../types';
import {
  TableProperties,
  CalendarDays,
  Search,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Users,
  Banknote,
  Wallet,
  ReceiptText,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  MATRIX_UPDATED_EVENT,
  getEmployeeProfileMatrixData,
} from '../../lib/matrixTimekeeping';
import {
  ComputedSalarySlipData,
  canUserAccessSalarySlip,
  computeMonthlySalarySlipDetails,
  createEmptySalaryConfig,
  formatVnd,
  loadOvtFormulaFields,
  recomputeSalaryConfig,
} from '../../lib/salaryConfig';
import { SalarySlipModal } from './SalarySlipModal';

interface HRSalaryTableProps {
  salarySlips: SalarySlipRecord[];
  allStaff: StaffRecord[];
  salaryConfigs: EmployeeSalaryConfig[];
  currentUser?: UserAccount | null;
  salarySecurity?: SalarySecurityConfig;
  onViewProfile?: (staff: StaffRecord) => void;
}

type SalaryViewMode = 'OVERVIEW' | 'DETAIL';

interface DetailColumnDef {
  id: string;
  key: keyof ComputedSalarySlipData;
  qtyKey?: keyof ComputedSalarySlipData;
  qtyUnit?: string;
  label: string;
  groupId: string;
  groupLabel: string;
  type: 'text' | 'qty' | 'currency' | 'paired';
  emphasize?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'white';
  minWidth?: string;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const DETAIL_COLUMNS: DetailColumnDef[] = [
  // Thông tin & Lương cơ sở
  { id: 'shiftLabel', key: 'shiftLabel', label: 'Bộ phận / Ca làm', groupId: 'info', groupLabel: 'Thông Tin & Lương Cơ Sở', type: 'text', minWidth: 'min-w-[125px]' },
  { id: 'totalSalary', key: 'totalSalary', label: 'Tổng lương chính', groupId: 'info', groupLabel: 'Thông Tin & Lương Cơ Sở', type: 'currency', emphasize: 'cyan', minWidth: 'min-w-[120px]' },
  { id: 'ovtInsuranceBase', key: 'ovtInsuranceBase', label: 'Lương tính BH & OVT', groupId: 'info', groupLabel: 'Thông Tin & Lương Cơ Sở', type: 'currency', emphasize: 'amber', minWidth: 'min-w-[125px]' },

  // I.1 Thu nhập theo HĐLĐ
  { id: 'workDaySalary', key: 'workDaySalaryAmount', qtyKey: 'workDaysCount', qtyUnit: 'ngày', label: 'Lương ngày công', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'paired', emphasize: 'emerald', minWidth: 'min-w-[118px]' },
  { id: 'leave70Day', key: 'leave70DayAmount', qtyKey: 'leave70DayCount', qtyUnit: 'ngày', label: 'Lương ngày nghỉ 70%', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'paired', minWidth: 'min-w-[118px]' },
  { id: 'attendanceAllowanceAmount', key: 'attendanceAllowanceAmount', label: 'Trợ cấp chuyên cần', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'currency', minWidth: 'min-w-[115px]' },
  { id: 'housingAllowanceAmount', key: 'housingAllowanceAmount', label: 'Phụ cấp nhà ở', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'currency', minWidth: 'min-w-[110px]' },
  { id: 'livingAllowanceAmount', key: 'livingAllowanceAmount', label: 'Phụ cấp đời sống', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'currency', minWidth: 'min-w-[112px]' },
  { id: 'languageAllowanceAmount', key: 'languageAllowanceAmount', label: 'Phụ cấp ngôn ngữ', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'currency', minWidth: 'min-w-[115px]' },
  { id: 'positionAllowanceAmount', key: 'positionAllowanceAmount', label: 'Phụ cấp chức vụ', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'currency', minWidth: 'min-w-[112px]' },
  { id: 'seniorityAllowanceAmount', key: 'seniorityAllowanceAmount', label: 'Phụ cấp thâm niên', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'currency', minWidth: 'min-w-[115px]' },
  { id: 'processAllowanceAmount', key: 'processAllowanceAmount', label: 'Trợ cấp công đoạn', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'currency', minWidth: 'min-w-[115px]' },
  { id: 'attractionAllowanceAmount', key: 'attractionAllowanceAmount', label: 'Trợ cấp thu hút', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'currency', minWidth: 'min-w-[110px]' },
  { id: 'cleanroomAllowanceAmount', key: 'cleanroomAllowanceAmount', label: 'Trợ cấp phòng sạch', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'currency', minWidth: 'min-w-[115px]' },
  { id: 'phoneAllowanceAmount', key: 'phoneAllowanceAmount', label: 'Trợ cấp điện thoại', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'currency', minWidth: 'min-w-[115px]' },
  { id: 'paidLeave', key: 'paidLeaveAmount', qtyKey: 'paidLeaveDays', qtyUnit: 'ngày', label: 'Nghỉ nguyên lương', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'paired', minWidth: 'min-w-[118px]' },
  { id: 'remainingLeaveDays', key: 'remainingLeaveDays', qtyUnit: 'ngày', label: 'Phép còn lại', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'qty', minWidth: 'min-w-[92px]' },
  { id: 'unpaidLeaveDays', key: 'unpaidLeaveDays', qtyUnit: 'ngày', label: 'Nghỉ không lương', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'qty', minWidth: 'min-w-[100px]' },
  { id: 'unusedLeaveSettlementAmount', key: 'unusedLeaveSettlementAmount', label: 'Thanh toán phép tồn', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'currency', minWidth: 'min-w-[118px]' },
  { id: 'section1Total', key: 'section1Total', label: 'Tổng (1) Thu nhập HĐLĐ', groupId: 'sec1', groupLabel: '1. Thu Nhập Theo Hợp Đồng Lao Động', type: 'currency', emphasize: 'emerald', minWidth: 'min-w-[130px]' },

  // I.2 Tăng ca + PC ca đêm
  { id: 'leave70Hours', key: 'leave70HoursAmount', qtyKey: 'leave70Hours', qtyUnit: 'giờ', label: 'Nghỉ 70% lương', groupId: 'sec2', groupLabel: '2. Tăng Ca + Phụ Cấp Ca Đêm', type: 'paired', minWidth: 'min-w-[115px]' },
  { id: 'nightShift30', key: 'nightShift30Amount', qtyKey: 'regularNightHours', qtyUnit: 'giờ', label: 'PC ca đêm 30%', groupId: 'sec2', groupLabel: '2. Tăng Ca + Phụ Cấp Ca Đêm', type: 'paired', minWidth: 'min-w-[115px]' },
  { id: 'otNight195', key: 'otNight195Amount', qtyKey: 'otNight195Hours', qtyUnit: 'giờ', label: 'Tăng ca đêm 195%', groupId: 'sec2', groupLabel: '2. Tăng Ca + Phụ Cấp Ca Đêm', type: 'paired', minWidth: 'min-w-[118px]' },
  { id: 'otNight215', key: 'otNight215Amount', qtyKey: 'otNightHours', qtyUnit: 'giờ', label: 'Tăng ca đêm 215%', groupId: 'sec2', groupLabel: '2. Tăng Ca + Phụ Cấp Ca Đêm', type: 'paired', minWidth: 'min-w-[118px]' },
  { id: 'otDay150', key: 'otDay150Amount', qtyKey: 'otDayHours', qtyUnit: 'giờ', label: 'Tăng ca ngày 150%', groupId: 'sec2', groupLabel: '2. Tăng Ca + Phụ Cấp Ca Đêm', type: 'paired', minWidth: 'min-w-[118px]' },
  { id: 'otSundayDay200', key: 'otSundayDay200Amount', qtyKey: 'otSundayDayHours', qtyUnit: 'giờ', label: 'Tăng ca CN ngày 200%', groupId: 'sec2', groupLabel: '2. Tăng Ca + Phụ Cấp Ca Đêm', type: 'paired', minWidth: 'min-w-[125px]' },
  { id: 'otSundayNight270', key: 'otSundayNight270Amount', qtyKey: 'otSundayNightHours', qtyUnit: 'giờ', label: 'Tăng ca CN đêm 270%', groupId: 'sec2', groupLabel: '2. Tăng Ca + Phụ Cấp Ca Đêm', type: 'paired', minWidth: 'min-w-[125px]' },
  { id: 'otHolidayDay300', key: 'otHolidayDay300Amount', qtyKey: 'otHolidayDayHours', qtyUnit: 'giờ', label: 'Tăng ca Lễ ngày 300%', groupId: 'sec2', groupLabel: '2. Tăng Ca + Phụ Cấp Ca Đêm', type: 'paired', minWidth: 'min-w-[125px]' },
  { id: 'otHolidayNight390', key: 'otHolidayNight390Amount', qtyKey: 'otHolidayNightHours', qtyUnit: 'giờ', label: 'Tăng ca Lễ đêm 390%', groupId: 'sec2', groupLabel: '2. Tăng Ca + Phụ Cấp Ca Đêm', type: 'paired', minWidth: 'min-w-[125px]' },
  { id: 'section2Total', key: 'section2Total', label: 'Tổng (2) Tăng ca + PC đêm', groupId: 'sec2', groupLabel: '2. Tăng Ca + Phụ Cấp Ca Đêm', type: 'currency', emphasize: 'amber', minWidth: 'min-w-[132px]' },

  // I.3 Ngoài HĐLĐ
  { id: 'otMealAllowance', key: 'otMealAllowanceAmount', qtyKey: 'otMealDays', qtyUnit: 'buổi', label: 'Tiền ăn tăng ca (>6h)', groupId: 'sec3', groupLabel: '3. Thu Nhập Ngoài HĐLĐ', type: 'paired', minWidth: 'min-w-[125px]' },
  { id: 'bereavementWedding', key: 'bereavementWeddingAmount', qtyKey: 'bereavementWeddingDays', qtyUnit: 'ngày', label: 'Phụ cấp hiếu hỷ', groupId: 'sec3', groupLabel: '3. Thu Nhập Ngoài HĐLĐ', type: 'paired', minWidth: 'min-w-[115px]' },
  { id: 'childcareAllowanceAmount', key: 'childcareAllowanceAmount', label: 'Trợ cấp con nhỏ', groupId: 'sec3', groupLabel: '3. Thu Nhập Ngoài HĐLĐ', type: 'currency', minWidth: 'min-w-[110px]' },
  { id: 'productivityBonusAmount', key: 'productivityBonusAmount', label: 'Thưởng năng suất, CT', groupId: 'sec3', groupLabel: '3. Thu Nhập Ngoài HĐLĐ', type: 'currency', minWidth: 'min-w-[118px]' },
  { id: 'scopeSettingAllowanceAmount', key: 'scopeSettingAllowanceAmount', label: 'TC soi kính & setting', groupId: 'sec3', groupLabel: '3. Thu Nhập Ngoài HĐLĐ', type: 'currency', minWidth: 'min-w-[118px]' },
  { id: 'section3Total', key: 'section3Total', label: 'Tổng (3) Ngoài HĐLĐ', groupId: 'sec3', groupLabel: '3. Thu Nhập Ngoài HĐLĐ', type: 'currency', emphasize: 'cyan', minWidth: 'min-w-[125px]' },

  // I. Tổng thu nhập
  { id: 'sectionITotal', key: 'sectionITotal', label: 'I/ Tổng Thu Nhập (1+2+3)', groupId: 'secI', groupLabel: 'I. Tổng Thu Nhập', type: 'currency', emphasize: 'white', minWidth: 'min-w-[138px]' },

  // II. Bảo hiểm & Công đoàn
  { id: 'socialInsuranceAmount', key: 'socialInsuranceAmount', label: 'BHXH+BHYT+BHTN (10.5%)', groupId: 'secII', groupLabel: 'II. Bảo Hiểm & Công Đoàn', type: 'currency', minWidth: 'min-w-[125px]' },
  { id: 'unionFeeAmount', key: 'unionFeeAmount', label: 'Công đoàn phí', groupId: 'secII', groupLabel: 'II. Bảo Hiểm & Công Đoàn', type: 'currency', minWidth: 'min-w-[108px]' },
  { id: 'sectionIITotal', key: 'sectionIITotal', label: 'Tổng (II) BH & CĐ', groupId: 'secII', groupLabel: 'II. Bảo Hiểm & Công Đoàn', type: 'currency', emphasize: 'rose', minWidth: 'min-w-[122px]' },

  // III. Thuế TNCN
  { id: 'personalIncomeTaxAmount', key: 'personalIncomeTaxAmount', label: 'III. Thuế TNCN (10%)', groupId: 'secIII', groupLabel: 'III. Thuế TNCN', type: 'currency', emphasize: 'rose', minWidth: 'min-w-[120px]' },

  // IV. Các khoản trừ
  { id: 'lateEarly', key: 'lateEarlyAmount', qtyKey: 'lateEarlyHours', qtyUnit: 'giờ', label: 'Trừ đi muộn/về sớm', groupId: 'secIV', groupLabel: 'IV. Các Khoản Trừ', type: 'paired', minWidth: 'min-w-[120px]' },
  { id: 'unexcusedFine', key: 'unexcusedFineAmount', qtyKey: 'unexcusedFineHours', qtyUnit: 'giờ', label: 'Phạt nghỉ không phép', groupId: 'secIV', groupLabel: 'IV. Các Khoản Trừ', type: 'paired', minWidth: 'min-w-[122px]' },
  { id: 'uniformDeductionAmount', key: 'uniformDeductionAmount', label: 'Mất, rách đồng phục', groupId: 'secIV', groupLabel: 'IV. Các Khoản Trừ', type: 'currency', minWidth: 'min-w-[118px]' },
  { id: 'contractViolationAmount', key: 'contractViolationAmount', label: 'Vi phạm hợp đồng', groupId: 'secIV', groupLabel: 'IV. Các Khoản Trừ', type: 'currency', minWidth: 'min-w-[115px]' },
  { id: 'sectionIVTotal', key: 'sectionIVTotal', label: 'Tổng (IV) Các khoản trừ', groupId: 'secIV', groupLabel: 'IV. Các Khoản Trừ', type: 'currency', emphasize: 'rose', minWidth: 'min-w-[128px]' },

  // V. Thực lĩnh & Công tác
  { id: 'netSalaryAmount', key: 'netSalaryAmount', label: 'V/ THỰC LĨNH (I-II-III-IV)', groupId: 'secV', groupLabel: 'V. Thực Lĩnh & Công Tác', type: 'currency', emphasize: 'emerald', minWidth: 'min-w-[148px]' },
  { id: 'businessTripAmount', key: 'businessTripAmount', label: 'Công tác', groupId: 'secV', groupLabel: 'V. Thực Lĩnh & Công Tác', type: 'currency', minWidth: 'min-w-[105px]' },
];

const DETAIL_GROUPS = (() => {
  const groups: Array<{ id: string; label: string; colSpan: number }> = [];
  DETAIL_COLUMNS.forEach((col) => {
    const last = groups[groups.length - 1];
    if (last && last.id === col.groupId) {
      last.colSpan += 1;
    } else {
      groups.push({ id: col.groupId, label: col.groupLabel, colSpan: 1 });
    }
  });
  return groups;
})();

const round1 = (n: number) => Math.round(n * 10) / 10;

const formatQtyValue = (
  val: string | number | boolean,
  unit: string | undefined,
  masked: boolean
): string => {
  if (masked) return '••';
  const num = round1(Number(val) || 0);
  if (num === 0) return '—';
  return unit ? `${num} ${unit}` : String(num);
};

const formatCurrencyValue = (
  val: string | number | boolean,
  masked: boolean
): string => {
  if (masked) return '••••••';
  const num = Number(val) || 0;
  if (num === 0) return '—';
  return formatVnd(num);
};

export const HRSalaryTable: React.FC<HRSalaryTableProps> = ({
  salarySlips,
  allStaff,
  salaryConfigs,
  currentUser,
  salarySecurity,
  onViewProfile,
}) => {
  const now = new Date();
  const [viewMode, setViewMode] = useState<SalaryViewMode>('OVERVIEW');
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [focusedMonth, setFocusedMonth] = useState<number | 'ALL'>('ALL');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterShift, setFilterShift] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [formulaFields] = useState(loadOvtFormulaFields);
  const [refreshTick, setRefreshTick] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [viewingSlipData, setViewingSlipData] = useState<ComputedSalarySlipData | null>(null);
  const [hoveredEmpId, setHoveredEmpId] = useState<string | null>(null);

  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const monthHeaderRefs = useRef<Record<number, HTMLTableCellElement | null>>({});

  // Salary security checks
  const hasSalaryAccess = currentUser
    ? canUserAccessSalarySlip(currentUser, salarySecurity)
    : false;
  const requiresPin = Boolean(
    salarySecurity?.enabled &&
      salarySecurity?.requirePasscode &&
      salarySecurity?.passcode?.trim()
  );
  const unlockStorageKey = `app_salary_unlocked_${currentUser?.username || 'guest'}_${
    salarySecurity?.passcode || ''
  }`;

  const [isPinUnlocked, setIsPinUnlocked] = useState<boolean>(() => {
    if (!requiresPin) return true;
    try {
      return sessionStorage.getItem(unlockStorageKey) === '1';
    } catch {
      return false;
    }
  });
  const [pinInput, setPinInput] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isAmountMasked, setIsAmountMasked] = useState<boolean>(
    Boolean(salarySecurity?.maskValuesByDefault)
  );

  useEffect(() => {
    if (!requiresPin) {
      setIsPinUnlocked(true);
      return;
    }
    try {
      setIsPinUnlocked(sessionStorage.getItem(unlockStorageKey) === '1');
    } catch {
      setIsPinUnlocked(false);
    }
  }, [requiresPin, unlockStorageKey]);

  useEffect(() => {
    setIsAmountMasked(Boolean(salarySecurity?.maskValuesByDefault));
  }, [salarySecurity?.maskValuesByDefault]);

  useEffect(() => {
    const handleSync = () => setRefreshTick((t) => t + 1);
    window.addEventListener(MATRIX_UPDATED_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(MATRIX_UPDATED_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  const departments = useMemo(() => {
    const set = new Set<string>();
    allStaff.forEach((s) => {
      if (s.department) set.add(s.department.toUpperCase());
    });
    return Array.from(set);
  }, [allStaff]);

  const configMap = useMemo(() => {
    const map = new Map<string, EmployeeSalaryConfig>();
    salaryConfigs.forEach((c) => {
      map.set(c.employeeId.trim().toLowerCase(), c);
    });
    return map;
  }, [salaryConfigs]);

  const issuedSlipMap = useMemo(() => {
    const map = new Map<string, SalarySlipRecord>();
    salarySlips.forEach((s) => {
      const key = `${s.employeeId.trim().toLowerCase()}__${s.month}`;
      map.set(key, s);
    });
    return map;
  }, [salarySlips]);

  const filteredStaff = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allStaff.filter((s) => {
      const matchSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.employeeId.toLowerCase().includes(q) ||
        (s.position || '').toLowerCase().includes(q);
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

  // Compute salary slip data for a staff member and a given month
  const computeSlipForStaffMonth = (
    staff: StaffRecord,
    year: number,
    month: number
  ): { slipData: ComputedSalarySlipData; isIssued: boolean } => {
    const empKey = staff.employeeId.trim().toLowerCase();
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const issued = issuedSlipMap.get(`${empKey}__${monthKey}`);

    const baseCfg =
      issued?.salaryConfig ||
      configMap.get(empKey) ||
      createEmptySalaryConfig(staff);
    const resolvedConfig = recomputeSalaryConfig(
      { ...createEmptySalaryConfig(staff), ...baseCfg, fullName: staff.fullName },
      formulaFields
    );

    const { days } = getEmployeeProfileMatrixData(
      staff.employeeId,
      staff.department || 'MULTI',
      year,
      month,
      staff
    );

    const slipData = computeMonthlySalarySlipDetails({
      staff,
      salaryConfig: resolvedConfig,
      year,
      month,
      matrixDays: days,
      attendanceSummary: issued?.attendanceSummary,
    });

    return { slipData, isIssued: Boolean(issued) };
  };

  // Overview Mode: compute 12 months for all filtered staff
  const overviewRows = useMemo(() => {
    if (viewMode !== 'OVERVIEW') return [];
    return filteredStaff.map((staff) => {
      const monthsData: Record<
        number,
        { slipData: ComputedSalarySlipData; isIssued: boolean }
      > = {};
      let yearTotalNet = 0;

      MONTHS.forEach((m) => {
        const res = computeSlipForStaffMonth(staff, selectedYear, m);
        monthsData[m] = res;
        yearTotalNet += res.slipData.netSalaryAmount || 0;
      });

      return {
        staff,
        monthsData,
        yearTotalNet,
      };
    });
  }, [
    viewMode,
    filteredStaff,
    selectedYear,
    configMap,
    issuedSlipMap,
    formulaFields,
    refreshTick,
  ]);

  // Monthly totals for Overview Mode footer
  const overviewMonthlyTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    MONTHS.forEach((m) => {
      totals[m] = 0;
    });
    overviewRows.forEach((row) => {
      MONTHS.forEach((m) => {
        totals[m] += row.monthsData[m]?.slipData.netSalaryAmount || 0;
      });
    });
    return totals;
  }, [overviewRows]);

  // Detail Mode: compute selectedMonth details for all filtered staff
  const detailRows = useMemo(() => {
    if (viewMode !== 'DETAIL') return [];
    return filteredStaff.map((staff) => ({
      staff,
      ...computeSlipForStaffMonth(staff, selectedYear, selectedMonth),
    }));
  }, [
    viewMode,
    filteredStaff,
    selectedYear,
    selectedMonth,
    configMap,
    issuedSlipMap,
    formulaFields,
    refreshTick,
  ]);

  // Column totals for Detail Mode footer (both qty & amount keys)
  const detailTotals = useMemo(() => {
    const sums: Record<string, number> = {};
    DETAIL_COLUMNS.forEach((col) => {
      if (col.type !== 'text') sums[col.key] = 0;
      if (col.qtyKey) sums[col.qtyKey] = 0;
    });
    detailRows.forEach(({ slipData }) => {
      DETAIL_COLUMNS.forEach((col) => {
        if (col.type !== 'text') {
          sums[col.key] += Number(slipData[col.key]) || 0;
        }
        if (col.qtyKey) {
          sums[col.qtyKey] += Number(slipData[col.qtyKey]) || 0;
        }
      });
    });
    return sums;
  }, [detailRows]);

  // KPI summary values
  const kpiSummary = useMemo(() => {
    if (viewMode === 'OVERVIEW') {
      const totalNet = displayedMonths.reduce(
        (sum, m) => sum + (overviewMonthlyTotals[m] || 0),
        0
      );
      const currentM =
        selectedYear === now.getFullYear() ? now.getMonth() + 1 : 12;
      const currentMonthTotal = overviewMonthlyTotals[currentM] || 0;
      let issuedCount = 0;
      overviewRows.forEach((r) => {
        displayedMonths.forEach((m) => {
          if (r.monthsData[m]?.isIssued) issuedCount += 1;
        });
      });
      return {
        staffCount: overviewRows.length,
        primaryNet: totalNet,
        secondaryNet: currentMonthTotal,
        secondaryMonth: currentM,
        issuedCount,
      };
    }

    const totalNet = detailTotals.netSalaryAmount || 0;
    const totalGross = detailTotals.sectionITotal || 0;
    const issuedCount = detailRows.filter((r) => r.isIssued).length;
    return {
      staffCount: detailRows.length,
      primaryNet: totalNet,
      secondaryNet: totalGross,
      secondaryMonth: selectedMonth,
      issuedCount,
    };
  }, [
    viewMode,
    displayedMonths,
    overviewMonthlyTotals,
    overviewRows,
    detailTotals,
    detailRows,
    selectedYear,
    selectedMonth,
  ]);

  const handleOpenSlipModal = (slipData: ComputedSalarySlipData) => {
    if (isAmountMasked) {
      showToast(
        'Đang bật chế độ che số liệu — vui lòng nhấn "Hiện số liệu" để xem chi tiết phiếu lương!'
      );
      return;
    }
    setViewingSlipData(slipData);
  };

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

  const handleJumpToMonthScroll = (m: number) => {
    if (focusedMonth !== 'ALL') {
      setFocusedMonth('ALL');
      setTimeout(() => {
        const el = monthHeaderRefs.current[m];
        const container = tableScrollRef.current;
        if (el && container) {
          container.scrollTo({
            left: Math.max(0, el.offsetLeft - 280),
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
        left: Math.max(0, el.offsetLeft - 280),
        behavior: 'smooth',
      });
    }
  };

  const handleExportExcel = () => {
    if (isAmountMasked) {
      showToast(
        'Đang bật chế độ che số liệu — vui lòng nhấn "Hiện số liệu" trước khi xuất Excel!'
      );
      return;
    }

    const wb = XLSX.utils.book_new();

    if (viewMode === 'OVERVIEW') {
      const headerRow: string[] = [
        'Họ Tên Nhân Viên',
        'Mã Nhân Viên',
        ...displayedMonths.map((m) => `Tháng ${m}/${selectedYear} (Thực lĩnh)`),
        ...(displayedMonths.length > 1 ? [`Tổng Thực Lĩnh ${selectedYear}`] : []),
      ];

      const dataRows = overviewRows.map((row) => {
        const monthVals = displayedMonths.map(
          (m) => row.monthsData[m]?.slipData.netSalaryAmount || 0
        );
        return [
          row.staff.fullName,
          row.staff.employeeId,
          ...monthVals,
          ...(displayedMonths.length > 1 ? [row.yearTotalNet] : []),
        ];
      });

      const totalNetAllMonths = displayedMonths.reduce(
        (acc, m) => acc + (overviewMonthlyTotals[m] || 0),
        0
      );
      const totalRow: (string | number)[] = [
        `TỔNG CỘNG (${overviewRows.length} NV)`,
        '',
        ...displayedMonths.map((m) => overviewMonthlyTotals[m] || 0),
        ...(displayedMonths.length > 1 ? [totalNetAllMonths] : []),
      ];

      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows, totalRow]);
      ws['!cols'] = [
        { wch: 24 },
        { wch: 14 },
        ...displayedMonths.map(() => ({ wch: 18 })),
        ...(displayedMonths.length > 1 ? [{ wch: 20 }] : []),
      ];
      XLSX.utils.book_append_sheet(wb, ws, `Bang_Luong_${selectedYear}`);
      XLSX.writeFile(wb, `Bang_Luong_12_Thang_HCNS_${selectedYear}.xlsx`);
      showToast(`Đã xuất Excel Bảng lương 12 tháng năm ${selectedYear} thành công!`);
      return;
    }

    // DETAIL mode export: exact horizontal columns as shown on screen
    const headerRow1: string[] = ['Họ Tên Nhân Viên', 'Mã Nhân Viên'];
    const headerRow2: string[] = ['', ''];
    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
    ];

    let colCursor = 2;
    DETAIL_GROUPS.forEach((grp) => {
      headerRow1.push(grp.label);
      for (let i = 1; i < grp.colSpan; i += 1) {
        headerRow1.push('');
      }
      if (grp.colSpan > 1) {
        merges.push({
          s: { r: 0, c: colCursor },
          e: { r: 0, c: colCursor + grp.colSpan - 1 },
        });
      }
      colCursor += grp.colSpan;
    });

    DETAIL_COLUMNS.forEach((col) => {
      headerRow2.push(col.label);
    });

    const dataRows: (string | number)[][] = [];
    let excelRowIndex = 2;

    detailRows.forEach(({ staff, slipData }) => {
      merges.push(
        { s: { r: excelRowIndex, c: 0 }, e: { r: excelRowIndex + 1, c: 0 } },
        { s: { r: excelRowIndex, c: 1 }, e: { r: excelRowIndex + 1, c: 1 } }
      );

      const topRow: (string | number)[] = [staff.fullName, staff.employeeId];
      const bottomRow: (string | number)[] = ['', ''];

      DETAIL_COLUMNS.forEach((col, colOffset) => {
        const cIdx = 2 + colOffset;
        if (col.type === 'paired' && col.qtyKey) {
          const qVal = round1(Number(slipData[col.qtyKey]) || 0);
          const amtVal = Math.round(Number(slipData[col.key]) || 0);
          topRow.push(qVal > 0 ? `${qVal}${col.qtyUnit ? ` ${col.qtyUnit}` : ''}` : '—');
          bottomRow.push(amtVal);
        } else {
          merges.push({
            s: { r: excelRowIndex, c: cIdx },
            e: { r: excelRowIndex + 1, c: cIdx },
          });
          const v = slipData[col.key];
          if (col.type === 'text') {
            topRow.push(String(v || ''));
          } else if (col.type === 'qty') {
            const qVal = round1(Number(v) || 0);
            topRow.push(qVal > 0 ? `${qVal}${col.qtyUnit ? ` ${col.qtyUnit}` : ''}` : '—');
          } else {
            topRow.push(Math.round(Number(v) || 0));
          }
          bottomRow.push('');
        }
      });

      dataRows.push(topRow, bottomRow);
      excelRowIndex += 2;
    });

    merges.push(
      { s: { r: excelRowIndex, c: 0 }, e: { r: excelRowIndex + 1, c: 0 } },
      { s: { r: excelRowIndex, c: 1 }, e: { r: excelRowIndex + 1, c: 1 } }
    );

    const totalTopRow: (string | number)[] = [
      `TỔNG CỘNG (${detailRows.length} NV)`,
      `Tháng ${selectedMonth}/${selectedYear}`,
    ];
    const totalBottomRow: (string | number)[] = ['', ''];

    DETAIL_COLUMNS.forEach((col, colOffset) => {
      const cIdx = 2 + colOffset;
      if (col.type === 'paired' && col.qtyKey) {
        const totQ = round1(detailTotals[col.qtyKey] || 0);
        const totAmt = Math.round(detailTotals[col.key] || 0);
        totalTopRow.push(totQ > 0 ? `${totQ}${col.qtyUnit ? ` ${col.qtyUnit}` : ''}` : '—');
        totalBottomRow.push(totAmt);
      } else {
        merges.push({
          s: { r: excelRowIndex, c: cIdx },
          e: { r: excelRowIndex + 1, c: cIdx },
        });
        if (col.type === 'text') {
          totalTopRow.push('');
        } else if (col.type === 'qty') {
          const totQ = round1(detailTotals[col.key] || 0);
          totalTopRow.push(totQ > 0 ? `${totQ}${col.qtyUnit ? ` ${col.qtyUnit}` : ''}` : '—');
        } else {
          totalTopRow.push(Math.round(detailTotals[col.key] || 0));
        }
        totalBottomRow.push('');
      }
    });

    const ws = XLSX.utils.aoa_to_sheet([
      headerRow1,
      headerRow2,
      ...dataRows,
      totalTopRow,
      totalBottomRow,
    ]);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 24 },
      { wch: 14 },
      ...DETAIL_COLUMNS.map((col) => ({
        wch: col.type === 'text' ? 18 : col.type === 'qty' ? 14 : 18,
      })),
    ];

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      `Chi_Tiet_T${selectedMonth}_${selectedYear}`
    );
    XLSX.writeFile(
      wb,
      `Bang_Luong_Chi_Tiet_T${String(selectedMonth).padStart(2, '0')}_${selectedYear}.xlsx`
    );
    showToast(
      `Đã xuất Excel Bảng lương chi tiết Tháng ${selectedMonth}/${selectedYear} thành công!`
    );
  };

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === (salarySecurity?.passcode || '').trim()) {
      setPinError(null);
      setPinInput('');
      setIsPinUnlocked(true);
      try {
        sessionStorage.setItem(unlockStorageKey, '1');
      } catch {
        // ignore storage errors
      }
    } else {
      setPinError('Mã PIN bảo mật không chính xác. Vui lòng thử lại!');
    }
  };

  const handleLockNow = () => {
    setIsPinUnlocked(false);
    setPinInput('');
    setPinError(null);
    setViewingSlipData(null);
    try {
      sessionStorage.removeItem(unlockStorageKey);
    } catch {
      // ignore storage errors
    }
  };

  if (!hasSalaryAccess) {
    return (
      <div className="p-6 max-w-2xl mx-auto my-10">
        <div className="bg-slate-900 border border-rose-800/60 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-700/50 flex items-center justify-center mx-auto text-rose-400">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">
              Khu Vực Bảng Lương Được Bảo Mật
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Tài khoản{' '}
              <span className="font-mono font-bold text-cyan-300">
                @{currentUser?.username || 'khách'}
              </span>{' '}
              chưa được cấp thẩm quyền truy cập{' '}
              <span className="font-semibold text-white">Tab Bảng Lương</span>.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Để đảm bảo tính bí mật thu nhập nhân viên, vui lòng liên hệ Quản trị viên để được cấp quyền trong mục{' '}
              <span className="text-emerald-300 font-semibold">
                ADMIN &rarr; Bảo Mật Lương
              </span>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (requiresPin && !isPinUnlocked) {
    return (
      <div className="p-6 max-w-md mx-auto my-10">
        <form
          onSubmit={handleUnlockPin}
          className="bg-slate-900 border border-amber-700/60 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xl"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-950/70 border border-amber-600/50 flex items-center justify-center mx-auto text-amber-400">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-white uppercase tracking-wide">
              Xác Thực Mã PIN Bảng Lương
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nhập mã PIN bảo mật lớp 2 để mở khóa thông tin bảng lương nhân viên.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Mã PIN bảo mật
            </label>
            <div className="relative flex items-center">
              <input
                type={showPinInput ? 'text' : 'password'}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (pinError) setPinError(null);
                }}
                placeholder="Nhập mã PIN..."
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-mono text-white focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPinInput((v) => !v)}
                className="absolute right-3 text-slate-400 hover:text-white cursor-pointer"
                title={showPinInput ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
              >
                {showPinInput ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {pinError && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-semibold pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg cursor-pointer transition-colors"
          >
            Mở Khóa Tab Bảng Lương
          </button>
        </form>
      </div>
    );
  }

  const currentCalendarYear = now.getFullYear();
  const currentCalendarMonth = now.getMonth() + 1;

  return (
    <div className="p-3 sm:p-6 max-w-[1680px] mx-auto space-y-4 text-xs">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="px-7 sm:px-0 text-center xl:text-left">
          <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center xl:justify-start gap-2 uppercase tracking-wide">
            <Wallet className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>BẢNG LƯƠNG NHÂN VIÊN (HC &amp; NS)</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-xs">
              {viewMode === 'OVERVIEW'
                ? `NĂM ${selectedYear}`
                : `THÁNG ${selectedMonth}/${selectedYear}`}
            </span>
            {salarySecurity?.enabled && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-700/50 text-cyan-300 font-semibold normal-case">
                <ShieldCheck className="w-3 h-3" />
                <span>Bảo mật đang bật</span>
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {viewMode === 'OVERVIEW'
              ? 'Bảng lương tổng hợp 12 tháng — di chuột vào từng ô tháng để hiện nút "Xem" và mở nhanh phiếu lương của nhân viên.'
              : `Chế độ xem chi tiết Tháng ${selectedMonth}/${selectedYear} — mỗi nhân viên gồm 2 hàng ngang: hàng trên là số ngày/giờ làm, hàng dưới là số tiền tương ứng.`}
          </p>
        </div>

        {/* Mode Switcher + Time + Privacy + Export */}
        <div className="flex flex-wrap items-center justify-center xl:justify-end gap-2">
          {/* 2 View Modes */}
          <div className="grid grid-cols-2 sm:flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('OVERVIEW')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'OVERVIEW'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Bảng Lương 12 Tháng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('DETAIL')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'DETAIL'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Xem Chi Tiết</span>
            </button>
          </div>

          {/* Year or Month/Year Switcher */}
          {viewMode === 'OVERVIEW' ? (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
              <button
                type="button"
                onClick={() => setSelectedYear((y) => y - 1)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                title="Năm trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
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
          ) : (
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 font-mono font-bold text-slate-200">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2">
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
          )}

          {/* Mask / Unmask */}
          <button
            type="button"
            onClick={() => setIsAmountMasked((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
              isAmountMasked
                ? 'bg-amber-950/60 border-amber-600/50 text-amber-300 hover:bg-amber-900/60'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-cyan-500/50'
            }`}
          >
            {isAmountMasked ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            <span>{isAmountMasked ? 'Hiện số liệu' : 'Che số liệu'}</span>
          </button>

          {requiresPin && (
            <button
              type="button"
              onClick={handleLockNow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-700/50 text-rose-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Khóa Ngay</span>
            </button>
          )}

          {/* Export Excel matching active view mode */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>
              Xuất Excel (
              {viewMode === 'OVERVIEW'
                ? `12 Tháng ${selectedYear}`
                : `Chi tiết T${selectedMonth}/${selectedYear}`}
              )
            </span>
          </button>
        </div>
      </div>

      {isAmountMasked && (
        <div className="bg-amber-950/40 border border-amber-700/50 text-amber-200 px-4 py-2 rounded-xl text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Đang bật chế độ che số liệu lương trên màn hình. Nhấn{' '}
              <span className="font-bold text-white">&quot;Hiện số liệu&quot;</span> để xem hoặc mở phiếu lương.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsAmountMasked(false)}
            className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] shrink-0 cursor-pointer"
          >
            Hiện ngay
          </button>
        </div>
      )}

      {toastMsg && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              Nhân Sự Hiển Thị
            </div>
            <div className="text-xl font-bold font-mono text-white mt-0.5 tabular-nums">
              {kpiSummary.staffCount}{' '}
              <span className="text-xs font-sans font-normal text-slate-400">
                nhân viên
              </span>
            </div>
          </div>
          <Users className="w-5 h-5 text-cyan-400" />
        </div>

        <div className="bg-emerald-950/25 border border-emerald-800/40 p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-emerald-300 uppercase font-semibold">
              {viewMode === 'OVERVIEW'
                ? `Tổng Thực Lĩnh (${focusedMonth === 'ALL' ? `Năm ${selectedYear}` : `Tháng ${focusedMonth}/${selectedYear}`})`
                : `Tổng Thực Lĩnh (Tháng ${selectedMonth}/${selectedYear})`}
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5 tabular-nums">
              {isAmountMasked ? '••••••' : formatVnd(kpiSummary.primaryNet)}{' '}
              <span className="text-xs font-sans font-normal text-emerald-300/80">
                VNĐ
              </span>
            </div>
          </div>
          <Banknote className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="bg-cyan-950/25 border border-cyan-800/40 p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] text-cyan-300 uppercase font-semibold">
              {viewMode === 'OVERVIEW'
                ? `Thực Lĩnh Tháng ${kpiSummary.secondaryMonth}/${selectedYear}`
                : `Tổng Thu Nhập (Mục I · T${selectedMonth}/${selectedYear})`}
            </div>
            <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5 tabular-nums">
              {isAmountMasked ? '••••••' : formatVnd(kpiSummary.secondaryNet)}{' '}
              <span className="text-xs font-sans font-normal text-cyan-300/80">
                VNĐ
              </span>
            </div>
          </div>
          <ReceiptText className="w-5 h-5 text-cyan-400" />
        </div>
      </div>

      {/* Filters & Month Bar */}
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
              onChange={(e) =>
                setFilterShift(e.target.value as 'ALL' | 'DAY' | 'NIGHT')
              }
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 cursor-pointer"
            >
              <option value="ALL">Tất cả ca</option>
              <option value="DAY">Ca Ngày</option>
              <option value="NIGHT">Ca Đêm</option>
            </select>
          </div>

          <div className="text-[11px] text-slate-400">
            {viewMode === 'OVERVIEW'
              ? 'Di chuột vào ô từng tháng để hiện nút "Xem" và mở phiếu lương chi tiết.'
              : 'Mỗi nhân viên hiển thị 2 hàng ngang (trên: ngày/giờ, dưới: tiền) — cuộn ngang để xem toàn bộ phiếu lương.'}
          </div>
        </div>

        {/* Month bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/70">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mr-1">
            {viewMode === 'OVERVIEW' ? 'Tháng hiển thị:' : 'Chọn tháng chi tiết:'}
          </span>

          {viewMode === 'OVERVIEW' && (
            <button
              type="button"
              onClick={() => setFocusedMonth('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                focusedMonth === 'ALL'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              Tất cả T1–T12
            </button>
          )}

          {MONTHS.map((m) => {
            const isCurrent =
              selectedYear === currentCalendarYear && m === currentCalendarMonth;
            const isActive =
              viewMode === 'DETAIL'
                ? selectedMonth === m
                : focusedMonth === m;

            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  if (viewMode === 'DETAIL') {
                    setSelectedMonth(m);
                  } else if (focusedMonth === 'ALL') {
                    handleJumpToMonthScroll(m);
                  } else {
                    setFocusedMonth(m);
                  }
                }}
                onDoubleClick={() => {
                  if (viewMode === 'OVERVIEW') {
                    setFocusedMonth(focusedMonth === m ? 'ALL' : m);
                  }
                }}
                title={
                  viewMode === 'OVERVIEW'
                    ? `Cuộn tới Tháng ${m} (nhấn đúp để lọc riêng Tháng ${m})`
                    : `Xem bảng lương chi tiết Tháng ${m}/${selectedYear}`
                }
                className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-white border-cyan-500'
                    : isCurrent
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/70 hover:bg-emerald-900/70'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border-slate-800'
                }`}
              >
                T{m}
              </button>
            );
          })}

          {viewMode === 'OVERVIEW' && focusedMonth === 'ALL' && (
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

      {/* MODE 1: OVERVIEW 12 MONTHS TABLE */}
      {viewMode === 'OVERVIEW' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div
            ref={tableScrollRef}
            className="overflow-auto custom-scrollbar max-h-[68vh] relative"
          >
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-20 bg-slate-950">
                <tr className="border-b border-slate-700 text-slate-200 uppercase text-[10px] tracking-wider">
                  <th className="sticky left-0 z-30 bg-slate-950 py-3 px-3 border-r border-slate-800 w-[185px] min-w-[185px] max-w-[185px] font-bold text-white">
                    Họ Tên Nhân Viên
                  </th>
                  <th className="sticky left-[185px] z-30 bg-slate-950 py-3 px-2.5 border-r border-slate-700 w-[108px] min-w-[108px] max-w-[108px] font-bold text-cyan-300 shadow-[4px_0_12px_rgba(0,0,0,0.65)]">
                    Mã Nhân Viên
                  </th>

                  {displayedMonths.map((m) => {
                    const isCurrent =
                      selectedYear === currentCalendarYear &&
                      m === currentCalendarMonth;
                    return (
                      <th
                        key={m}
                        ref={(el) => {
                          monthHeaderRefs.current[m] = el;
                        }}
                        className={`py-2.5 px-2.5 text-center border-r border-slate-800 min-w-[140px] font-extrabold text-xs ${
                          isCurrent
                            ? 'bg-emerald-950/70 text-emerald-300'
                            : m % 2 === 1
                            ? 'bg-slate-900/95 text-cyan-300'
                            : 'bg-slate-950 text-slate-200'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span>Tháng {m}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">
                                Hiện tại
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] font-normal text-slate-400 normal-case">
                            Phiếu lương T{m}/{selectedYear}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/70">
                {overviewRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2 + displayedMonths.length}
                      className="py-12 text-center text-slate-500 text-xs"
                    >
                      Không tìm thấy nhân viên phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  overviewRows.map(({ staff, monthsData }) => (
                    <tr
                      key={staff.employeeId}
                      className="hover:bg-slate-800/35 transition-colors group"
                    >
                      {/* Sticky Name */}
                      <td className="sticky left-0 z-10 bg-slate-950 group-hover:bg-slate-900 py-2.5 px-3 border-r border-slate-800 w-[185px] min-w-[185px] max-w-[185px]">
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
                          <span
                            className={
                              staff.shift === 'NIGHT'
                                ? 'text-purple-400'
                                : 'text-amber-400'
                            }
                          >
                            {staff.shift === 'NIGHT' ? 'Ca Đêm' : 'Ca Ngày'}
                          </span>
                        </div>
                      </td>

                      {/* Sticky Emp ID */}
                      <td
                        onClick={() => onViewProfile?.(staff)}
                        title="Nhấn để xem hồ sơ nhân viên"
                        className="sticky left-[185px] z-10 bg-slate-950 group-hover:bg-slate-900 py-2.5 px-2.5 border-r border-slate-700 w-[108px] min-w-[108px] max-w-[108px] font-mono font-bold text-cyan-400 hover:text-cyan-200 cursor-pointer whitespace-nowrap shadow-[4px_0_12px_rgba(0,0,0,0.65)]"
                      >
                        {staff.employeeId}
                      </td>

                      {/* Month 1..12 Salary Slip Cells */}
                      {displayedMonths.map((m) => {
                        const cell = monthsData[m];
                        const slip = cell.slipData;
                        const hasActivity =
                          slip.workDaysCount > 0 ||
                          slip.netSalaryAmount > 0 ||
                          cell.isIssued;

                        return (
                          <td
                            key={`${staff.employeeId}-m${m}`}
                            className={`p-1.5 border-r border-slate-800/80 align-middle ${
                              m % 2 === 1 ? 'bg-slate-900/25' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenSlipModal(slip)}
                              className={`group/cell relative w-full rounded-lg border px-2.5 py-2 text-left transition-all cursor-pointer overflow-hidden ${
                                hasActivity
                                  ? 'bg-slate-950/90 border-slate-800 hover:border-cyan-500/70 hover:bg-slate-900'
                                  : 'bg-slate-950/40 border-slate-800/50 hover:border-slate-600'
                              }`}
                            >
                              {/* Slip mini summary inside cell */}
                              <div className="transition-opacity duration-150 group-hover/cell:opacity-20">
                                <div className="flex items-center justify-between gap-1 text-[9px] text-slate-400">
                                  <span className="font-medium">
                                    Phiếu lương T{m}
                                  </span>
                                  {cell.isIssued && (
                                    <span className="px-1 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                                      Đã phát
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`font-mono font-bold text-[11px] mt-0.5 tabular-nums truncate ${
                                    isAmountMasked
                                      ? 'text-slate-400'
                                      : slip.netSalaryAmount > 0
                                      ? 'text-emerald-400'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {isAmountMasked
                                    ? '••••••'
                                    : slip.netSalaryAmount > 0
                                    ? `${formatVnd(slip.netSalaryAmount)}đ`
                                    : '—'}
                                </div>
                                <div className="text-[9px] font-mono text-slate-400 mt-0.5 truncate">
                                  {slip.workDaysCount > 0
                                    ? `${slip.workDaysCount} công`
                                    : 'Chưa có công'}
                                </div>
                              </div>

                              {/* Hover "Xem" overlay */}
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150 bg-slate-950/65 backdrop-blur-[1px]">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-600 text-white font-bold text-[11px] shadow-lg">
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Xem</span>
                                </span>
                              </div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>

              {overviewRows.length > 0 && (
                <tfoot className="sticky bottom-0 z-20 bg-slate-950 border-t-2 border-slate-700">
                  <tr className="font-mono font-bold text-[11px]">
                    <td className="sticky left-0 z-30 bg-slate-950 py-2.5 px-3 border-r border-slate-800 text-white font-sans uppercase text-[10px] tracking-wider">
                      Tổng Cộng ({overviewRows.length} NV)
                    </td>
                    <td className="sticky left-[185px] z-30 bg-slate-950 py-2.5 px-2.5 border-r border-slate-700 text-cyan-400 text-[10px] shadow-[4px_0_12px_rgba(0,0,0,0.65)]">
                      Năm {selectedYear}
                    </td>

                    {displayedMonths.map((m) => {
                      const sumNet = overviewMonthlyTotals[m] || 0;
                      return (
                        <td
                          key={`ov-total-${m}`}
                          className="py-2.5 px-2.5 text-center border-r border-slate-800 text-emerald-400 tabular-nums"
                        >
                          {isAmountMasked
                            ? '••••••'
                            : sumNet > 0
                            ? `${formatVnd(sumNet)}đ`
                            : '—'}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        /* MODE 2: DETAILED HORIZONTAL SALARY SLIP TABLE */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-auto custom-scrollbar max-h-[68vh] relative">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 z-20 bg-slate-950">
                {/* Row 1: Group Sections */}
                <tr className="border-b border-slate-800 text-slate-200 uppercase text-[10px] tracking-wider">
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-30 bg-slate-950 py-3 px-3 border-r border-slate-800 w-[185px] min-w-[185px] max-w-[185px] font-bold text-white align-middle"
                  >
                    Họ Tên Nhân Viên
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky left-[185px] z-30 bg-slate-950 py-3 px-2.5 border-r border-slate-700 w-[108px] min-w-[108px] max-w-[108px] font-bold text-cyan-300 align-middle shadow-[4px_0_12px_rgba(0,0,0,0.65)]"
                  >
                    Mã Nhân Viên
                  </th>

                  {DETAIL_GROUPS.map((grp) => (
                    <th
                      key={grp.id}
                      colSpan={grp.colSpan}
                      className={`py-2 px-2 text-center border-r border-slate-700 font-extrabold text-[11px] ${
                        grp.id === 'secV'
                          ? 'bg-emerald-950/75 text-emerald-300'
                          : grp.id === 'secI'
                          ? 'bg-cyan-950/60 text-cyan-300'
                          : grp.id === 'secII' ||
                            grp.id === 'secIII' ||
                            grp.id === 'secIV'
                          ? 'bg-rose-950/40 text-rose-200'
                          : 'bg-slate-900/95 text-slate-200'
                      }`}
                    >
                      {grp.label}
                    </th>
                  ))}

                  <th
                    rowSpan={2}
                    className="py-3 px-3 text-center border-l border-slate-700 bg-slate-950 text-cyan-300 font-bold min-w-[105px] align-middle"
                  >
                    Phiếu Lương
                  </th>
                </tr>

                {/* Row 2: Horizontal Salary Slip Item Headings */}
                <tr className="border-b border-slate-700 text-[10px] font-bold">
                  {DETAIL_COLUMNS.map((col) => (
                    <th
                      key={col.id}
                      className={`py-2 px-2 text-center border-r border-slate-800 whitespace-nowrap ${
                        col.minWidth || 'min-w-[110px]'
                      } ${
                        col.key === 'netSalaryAmount'
                          ? 'bg-emerald-950/60 text-emerald-300'
                          : col.emphasize === 'rose'
                          ? 'bg-rose-950/30 text-rose-300'
                          : col.emphasize === 'amber'
                          ? 'bg-amber-950/25 text-amber-300'
                          : col.emphasize === 'cyan'
                          ? 'bg-cyan-950/25 text-cyan-300'
                          : 'bg-slate-950 text-slate-300'
                      }`}
                    >
                      <div>{col.label}</div>
                      {col.type === 'paired' && (
                        <div className="text-[8.5px] font-normal text-slate-400 normal-case mt-0.5">
                          Trên: {col.qtyUnit} · Dưới: VNĐ
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {detailRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3 + DETAIL_COLUMNS.length}
                      className="py-12 text-center text-slate-500 text-xs"
                    >
                      Không tìm thấy nhân viên phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  detailRows.map(({ staff, slipData, isIssued }, empIdx) => {
                    const isHovered = hoveredEmpId === staff.employeeId;
                    const rowStripeBg = isHovered
                      ? 'bg-slate-800/45'
                      : empIdx % 2 === 1
                      ? 'bg-slate-900/30'
                      : '';
                    const stickyCellBg = isHovered
                      ? 'bg-slate-900'
                      : empIdx % 2 === 1
                      ? 'bg-[#091122]'
                      : 'bg-slate-950';

                    const getAmountTextClass = (
                      col: DetailColumnDef,
                      numVal: number
                    ) => {
                      if (numVal === 0 || isAmountMasked) return 'text-slate-600';
                      if (col.key === 'netSalaryAmount')
                        return 'text-emerald-400 font-extrabold';
                      if (col.emphasize === 'emerald')
                        return 'text-emerald-300 font-bold';
                      if (col.emphasize === 'cyan')
                        return 'text-cyan-300 font-bold';
                      if (col.emphasize === 'amber')
                        return 'text-amber-300 font-bold';
                      if (col.emphasize === 'rose')
                        return 'text-rose-300 font-bold';
                      if (col.emphasize === 'white')
                        return 'text-white font-bold';
                      return 'text-slate-200';
                    };

                    return (
                      <React.Fragment key={staff.employeeId}>
                        {/* ROW 1: Sticky identity (rowSpan=2) + Top row (Days / Hours) + Single-value columns (rowSpan=2) */}
                        <tr
                          onMouseEnter={() => setHoveredEmpId(staff.employeeId)}
                          onMouseLeave={() => setHoveredEmpId(null)}
                          className={`transition-colors ${rowStripeBg}`}
                        >
                          {/* Sticky Left Name */}
                          <td
                            rowSpan={2}
                            className={`sticky left-0 z-10 ${stickyCellBg} py-2.5 px-3 border-r border-b-2 border-slate-800 w-[185px] min-w-[185px] max-w-[185px] align-middle transition-colors`}
                          >
                            <button
                              type="button"
                              onClick={() => onViewProfile?.(staff)}
                              title="Nhấn để xem hồ sơ nhân viên"
                              className={`font-bold ${
                                isHovered ? 'text-cyan-300' : 'text-slate-100'
                              } hover:underline text-left truncate block w-full cursor-pointer`}
                            >
                              {staff.fullName}
                            </button>
                            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                              <span>{staff.department || 'MULTI'}</span>
                              {isIssued && (
                                <span className="px-1 rounded bg-emerald-500/15 text-emerald-300 text-[9px]">
                                  Đã phát
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Sticky Left Emp ID */}
                          <td
                            rowSpan={2}
                            onClick={() => onViewProfile?.(staff)}
                            title="Nhấn để xem hồ sơ nhân viên"
                            className={`sticky left-[185px] z-10 ${stickyCellBg} py-2.5 px-2.5 border-r border-b-2 border-slate-700 w-[108px] min-w-[108px] max-w-[108px] font-mono font-bold text-cyan-400 hover:text-cyan-200 cursor-pointer whitespace-nowrap align-middle shadow-[4px_0_12px_rgba(0,0,0,0.65)] transition-colors`}
                          >
                            {staff.employeeId}
                          </td>

                          {/* Columns for Row 1 */}
                          {DETAIL_COLUMNS.map((col) => {
                            if (col.type === 'paired' && col.qtyKey) {
                              const rawQty = slipData[col.qtyKey];
                              const numQty = round1(Number(rawQty) || 0);
                              const formattedQty = formatQtyValue(
                                rawQty,
                                col.qtyUnit,
                                isAmountMasked
                              );
                              return (
                                <td
                                  key={`${staff.employeeId}-${col.id}-qty`}
                                  className={`py-1 px-2 border-r border-b border-dashed border-slate-800/80 text-center font-mono text-[10.5px] whitespace-nowrap tabular-nums ${
                                    isAmountMasked || numQty === 0
                                      ? 'text-slate-600'
                                      : col.groupId === 'secIV'
                                      ? 'text-rose-300 font-semibold'
                                      : col.groupId === 'sec2'
                                      ? 'text-amber-300 font-semibold'
                                      : 'text-cyan-300 font-semibold'
                                  }`}
                                >
                                  {formattedQty}
                                </td>
                              );
                            }

                            const rawVal = slipData[col.key];
                            const numVal = Number(rawVal) || 0;

                            if (col.type === 'text') {
                              return (
                                <td
                                  key={`${staff.employeeId}-${col.id}`}
                                  rowSpan={2}
                                  className="py-2 px-2.5 border-r border-b-2 border-slate-800/80 text-center text-slate-300 whitespace-nowrap align-middle"
                                >
                                  {String(rawVal || '—')}
                                </td>
                              );
                            }

                            if (col.type === 'qty') {
                              return (
                                <td
                                  key={`${staff.employeeId}-${col.id}`}
                                  rowSpan={2}
                                  className={`py-2 px-2.5 border-r border-b-2 border-slate-800/80 text-center font-mono whitespace-nowrap tabular-nums align-middle ${
                                    isAmountMasked || numVal === 0
                                      ? 'text-slate-600'
                                      : 'text-slate-200 font-semibold'
                                  }`}
                                >
                                  {formatQtyValue(rawVal, col.qtyUnit, isAmountMasked)}
                                </td>
                              );
                            }

                            return (
                              <td
                                key={`${staff.employeeId}-${col.id}`}
                                rowSpan={2}
                                className={`py-2 px-2.5 border-r border-b-2 border-slate-800/80 text-right font-mono whitespace-nowrap tabular-nums align-middle ${
                                  col.key === 'netSalaryAmount'
                                    ? 'bg-emerald-950/20'
                                    : ''
                                } ${getAmountTextClass(col, numVal)}`}
                              >
                                {formatCurrencyValue(rawVal, isAmountMasked)}
                              </td>
                            );
                          })}

                          {/* Open Slip Button (rowSpan=2) */}
                          <td
                            rowSpan={2}
                            className="py-1.5 px-2.5 text-center border-l border-b-2 border-slate-800 align-middle"
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenSlipModal(slipData)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Xem</span>
                            </button>
                          </td>
                        </tr>

                        {/* ROW 2: Bottom row (Amount in VNĐ for paired columns) */}
                        <tr
                          onMouseEnter={() => setHoveredEmpId(staff.employeeId)}
                          onMouseLeave={() => setHoveredEmpId(null)}
                          className={`transition-colors ${rowStripeBg}`}
                        >
                          {DETAIL_COLUMNS.filter(
                            (col) => col.type === 'paired' && col.qtyKey
                          ).map((col) => {
                            const rawAmt = slipData[col.key];
                            const numAmt = Number(rawAmt) || 0;
                            return (
                              <td
                                key={`${staff.employeeId}-${col.id}-amt`}
                                className={`py-1 px-2.5 border-r border-b-2 border-slate-800/80 text-right font-mono text-[11px] whitespace-nowrap tabular-nums ${getAmountTextClass(
                                  col,
                                  numAmt
                                )}`}
                              >
                                {formatCurrencyValue(rawAmt, isAmountMasked)}
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>

              {detailRows.length > 0 && (
                <tfoot className="sticky bottom-0 z-20 bg-slate-950 border-t-2 border-slate-700">
                  {/* Footer Row 1: Totals for single columns + Top totals (days/hours) for paired columns */}
                  <tr className="font-mono font-bold text-[11px]">
                    <td
                      rowSpan={2}
                      className="sticky left-0 z-30 bg-slate-950 py-2 px-3 border-r border-slate-800 text-white font-sans uppercase text-[10px] tracking-wider align-middle"
                    >
                      Tổng Cộng ({detailRows.length} NV)
                    </td>
                    <td
                      rowSpan={2}
                      className="sticky left-[185px] z-30 bg-slate-950 py-2 px-2.5 border-r border-slate-700 text-cyan-400 text-[10px] align-middle shadow-[4px_0_12px_rgba(0,0,0,0.65)]"
                    >
                      T{selectedMonth}/{selectedYear}
                    </td>

                    {DETAIL_COLUMNS.map((col) => {
                      if (col.type === 'paired' && col.qtyKey) {
                        const totQty = detailTotals[col.qtyKey] || 0;
                        return (
                          <td
                            key={`tot-${col.id}-qty`}
                            className={`py-1 px-2 text-center border-r border-b border-dashed border-slate-800/80 text-[10px] whitespace-nowrap tabular-nums ${
                              isAmountMasked || round1(totQty) === 0
                                ? 'text-slate-600'
                                : col.groupId === 'secIV'
                                ? 'text-rose-300'
                                : col.groupId === 'sec2'
                                ? 'text-amber-300'
                                : 'text-cyan-300'
                            }`}
                          >
                            {formatQtyValue(totQty, col.qtyUnit, isAmountMasked)}
                          </td>
                        );
                      }

                      if (col.type === 'text') {
                        return (
                          <td
                            key={`tot-${col.id}`}
                            rowSpan={2}
                            className="py-2 px-2 text-center border-r border-slate-800 text-slate-500 align-middle"
                          >
                            —
                          </td>
                        );
                      }

                      if (col.type === 'qty') {
                        const totQ = detailTotals[col.key] || 0;
                        return (
                          <td
                            key={`tot-${col.id}`}
                            rowSpan={2}
                            className="py-2 px-2.5 text-center border-r border-slate-800 text-slate-200 whitespace-nowrap tabular-nums align-middle"
                          >
                            {formatQtyValue(totQ, col.qtyUnit, isAmountMasked)}
                          </td>
                        );
                      }

                      const totalVal = detailTotals[col.key] || 0;
                      return (
                        <td
                          key={`tot-${col.id}`}
                          rowSpan={2}
                          className={`py-2 px-2.5 border-r border-slate-800 text-right tabular-nums whitespace-nowrap align-middle ${
                            col.key === 'netSalaryAmount'
                              ? 'text-emerald-400 bg-emerald-950/30'
                              : col.emphasize === 'rose'
                              ? 'text-rose-300'
                              : col.emphasize === 'amber'
                              ? 'text-amber-300'
                              : col.emphasize === 'cyan'
                              ? 'text-cyan-300'
                              : 'text-slate-200'
                          }`}
                        >
                          {formatCurrencyValue(totalVal, isAmountMasked)}
                        </td>
                      );
                    })}

                    <td rowSpan={2} className="py-2 px-2 border-l border-slate-800" />
                  </tr>

                  {/* Footer Row 2: Total VND amounts for paired columns */}
                  <tr className="font-mono font-bold text-[11px]">
                    {DETAIL_COLUMNS.filter(
                      (col) => col.type === 'paired' && col.qtyKey
                    ).map((col) => {
                      const totAmt = detailTotals[col.key] || 0;
                      return (
                        <td
                          key={`tot-${col.id}-amt`}
                          className={`py-1 px-2.5 border-r border-slate-800 text-right tabular-nums whitespace-nowrap ${
                            col.emphasize === 'rose'
                              ? 'text-rose-300'
                              : col.emphasize === 'emerald'
                              ? 'text-emerald-300'
                              : 'text-slate-200'
                          }`}
                        >
                          {formatCurrencyValue(totAmt, isAmountMasked)}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Salary Slip Detail Modal */}
      {viewingSlipData && (
        <SalarySlipModal
          data={viewingSlipData}
          onClose={() => setViewingSlipData(null)}
        />
      )}
    </div>
  );
};
