import {
  EmployeeSalaryConfig,
  MatrixDayTimeEntry,
  SalarySecurityConfig,
  StaffRecord,
  UserAccount,
} from '../types';

export const SALARY_SECURITY_STORAGE_KEY = 'app_salary_security_config';

export const DEFAULT_SALARY_SECURITY_CONFIG: SalarySecurityConfig = {
  enabled: true,
  allowedUsernames: ['Newprotec', 'hr'],
  allowedRoles: [],
  requirePasscode: false,
  passcode: '',
  maskValuesByDefault: false,
};

export const normalizeSalarySecurityConfig = (
  raw?: Partial<SalarySecurityConfig> | null
): SalarySecurityConfig => {
  const allowedUsernames = Array.isArray(raw?.allowedUsernames)
    ? Array.from(new Set(raw.allowedUsernames.map((u) => String(u).trim()).filter(Boolean)))
    : [...DEFAULT_SALARY_SECURITY_CONFIG.allowedUsernames];

  if (!allowedUsernames.some((u) => u.toLowerCase() === 'newprotec')) {
    allowedUsernames.unshift('Newprotec');
  }

  return {
    enabled: raw?.enabled ?? DEFAULT_SALARY_SECURITY_CONFIG.enabled,
    allowedUsernames,
    allowedRoles: Array.isArray(raw?.allowedRoles) ? raw.allowedRoles : [],
    requirePasscode: Boolean(raw?.requirePasscode),
    passcode: typeof raw?.passcode === 'string' ? raw.passcode : '',
    maskValuesByDefault: Boolean(raw?.maskValuesByDefault),
    updatedAt: raw?.updatedAt,
    updatedBy: raw?.updatedBy,
  };
};

export const canUserAccessSalarySlip = (
  user: UserAccount | null | undefined,
  security?: SalarySecurityConfig | null
): boolean => {
  if (!user) return false;
  const normalized = normalizeSalarySecurityConfig(security);
  if (!normalized.enabled) return true;

  const uLower = user.username.trim().toLowerCase();
  if (uLower === 'newprotec') return true;

  if (normalized.allowedUsernames.some((u) => u.trim().toLowerCase() === uLower)) {
    return true;
  }

  if (normalized.allowedRoles.includes(user.role)) {
    return true;
  }

  return false;
};

export type SalaryNumericFieldKey =
  | 'basicSalary'
  | 'housingAllowance'
  | 'livingAllowance'
  | 'koreanAllowance'
  | 'positionAllowance'
  | 'seniorityAllowance'
  | 'processAllowance'
  | 'attendanceAllowance'
  | 'attractionAllowance'
  | 'productivityBonus'
  | 'cleanroomAllowance'
  | 'bereavementWeddingAllowance'
  | 'mealAllowance'
  | 'childcareAllowance'
  | 'phoneAllowance';

export interface SalaryFieldMeta {
  key: SalaryNumericFieldKey;
  label: string;
  shortLabel: string;
  defaultInOvtBase: boolean;
}

export const SALARY_NUMERIC_FIELDS: SalaryFieldMeta[] = [
  { key: 'basicSalary', label: 'Mức lương cơ bản', shortLabel: 'Lương CB', defaultInOvtBase: true },
  { key: 'housingAllowance', label: 'Phụ cấp nhà ở', shortLabel: 'PC Nhà ở', defaultInOvtBase: false },
  { key: 'livingAllowance', label: 'Phụ cấp đời sống', shortLabel: 'PC Đời sống', defaultInOvtBase: false },
  { key: 'koreanAllowance', label: 'Phụ cấp ngôn ngữ', shortLabel: 'PC Ngôn ngữ', defaultInOvtBase: true },
  { key: 'positionAllowance', label: 'Phụ cấp chức vụ', shortLabel: 'PC Chức vụ', defaultInOvtBase: true },
  { key: 'seniorityAllowance', label: 'Phụ cấp thâm niên', shortLabel: 'PC Thâm niên', defaultInOvtBase: true },
  { key: 'processAllowance', label: 'Trợ cấp công đoạn', shortLabel: 'TC Công đoạn', defaultInOvtBase: true },
  { key: 'attendanceAllowance', label: 'Trợ cấp chuyên cần', shortLabel: 'TC Chuyên cần', defaultInOvtBase: false },
  { key: 'attractionAllowance', label: 'Trợ cấp thu hút', shortLabel: 'TC Thu hút', defaultInOvtBase: true },
  { key: 'productivityBonus', label: 'Thưởng năng suất, cải tiến', shortLabel: 'Thưởng NS, CT', defaultInOvtBase: false },
  { key: 'cleanroomAllowance', label: 'Trợ cấp phòng sạch', shortLabel: 'TC Phòng sạch', defaultInOvtBase: true },
  { key: 'bereavementWeddingAllowance', label: 'Hiếu Hỷ', shortLabel: 'Hiếu Hỷ', defaultInOvtBase: false },
  { key: 'mealAllowance', label: 'Phụ cấp tiền ăn', shortLabel: 'PC Tiền ăn', defaultInOvtBase: false },
  { key: 'childcareAllowance', label: 'Trợ cấp con Nhỏ', shortLabel: 'TC Con nhỏ', defaultInOvtBase: false },
  { key: 'phoneAllowance', label: 'Trợ cấp điện thoại', shortLabel: 'TC Điện thoại', defaultInOvtBase: false },
];

export const DEFAULT_OVT_BASE_FIELDS: SalaryNumericFieldKey[] = SALARY_NUMERIC_FIELDS.filter(
  (f) => f.defaultInOvtBase
).map((f) => f.key);

export const OVT_FORMULA_STORAGE_KEY = 'app_salary_ovt_formula_fields';

export const loadOvtFormulaFields = (): SalaryNumericFieldKey[] => {
  try {
    const raw = localStorage.getItem(OVT_FORMULA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading OVT formula fields', e);
  }
  return DEFAULT_OVT_BASE_FIELDS;
};

export const createEmptySalaryConfig = (staff: {
  employeeId: string;
  fullName: string;
}): EmployeeSalaryConfig => ({
  employeeId: staff.employeeId,
  fullName: staff.fullName,
  basicSalary: 0,
  housingAllowance: 0,
  livingAllowance: 0,
  koreanAllowance: 0,
  positionAllowance: 0,
  seniorityAllowance: 0,
  processAllowance: 0,
  attendanceAllowance: 0,
  attractionAllowance: 0,
  productivityBonus: 0,
  cleanroomAllowance: 0,
  bereavementWeddingAllowance: 0,
  mealAllowance: 0,
  childcareAllowance: 0,
  phoneAllowance: 0,
  unionFee: 0,
  personalIncomeTax: 0,
  ovtInsuranceBase: 0,
  ovtInsuranceManual: false,
  totalSalary: 0,
});

/**
 * Tính Thuế TNCN 10% trên phần thu nhập vượt ngưỡng cấu hình.
 * Nếu ngưỡng <= 0 hoặc thu nhập <= ngưỡng thì không khấu trừ (0đ).
 */
export const calculatePitAboveThreshold = (income: number, threshold?: number): number => {
  const numericThreshold = Number(threshold) || 0;
  if (numericThreshold <= 0) return 0;
  const numericIncome = Number(income) || 0;
  if (numericIncome <= numericThreshold) return 0;
  return Math.round((numericIncome - numericThreshold) * 0.1);
};

export const OUTSIDE_MAIN_SALARY_FIELDS: SalaryNumericFieldKey[] = [
  'bereavementWeddingAllowance',
  'mealAllowance',
];

export const calculateTotalSalary = (cfg: EmployeeSalaryConfig): number =>
  SALARY_NUMERIC_FIELDS.filter(
    (f) => !OUTSIDE_MAIN_SALARY_FIELDS.includes(f.key)
  ).reduce((sum, f) => sum + (Number(cfg[f.key]) || 0), 0);

export const calculateOvtInsuranceBase = (
  cfg: EmployeeSalaryConfig,
  formulaFields: SalaryNumericFieldKey[] = DEFAULT_OVT_BASE_FIELDS
): number =>
  formulaFields.reduce((sum, key) => sum + (Number(cfg[key]) || 0), 0);

export const recomputeSalaryConfig = (
  cfg: EmployeeSalaryConfig,
  formulaFields: SalaryNumericFieldKey[]
): EmployeeSalaryConfig => {
  const totalSalary = calculateTotalSalary(cfg);
  const ovtInsuranceBase = cfg.ovtInsuranceManual
    ? Number(cfg.ovtInsuranceBase) || 0
    : calculateOvtInsuranceBase(cfg, formulaFields);
  return {
    ...cfg,
    ovtInsuranceBase,
    totalSalary,
  };
};

export const formatVnd = (value?: number): string => {
  const num = Number(value) || 0;
  return num.toLocaleString('vi-VN');
};

const parseTimeToMinutes = (timeStr?: string): number | null => {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return h * 60 + m;
};

/**
 * Kiểm tra buổi tăng ca ra sau 6 giờ:
 * - Ca ngày: giờ ra > 18:00 (hoặc qua đêm 00:00–12:00)
 * - Ca đêm: giờ ra > 06:00 sáng (06:01–14:00)
 * - Trường hợp không ghi giờ ra: số giờ tăng ca > 1h (tức quá mốc 6 giờ)
 */
export const isOvertimeAfterSix = (
  entry: MatrixDayTimeEntry | undefined,
  defaultShift: 'DAY' | 'NIGHT' = 'DAY'
): boolean => {
  if (!entry) return false;
  const totalOtDay =
    (entry.otDayHours || 0) +
    (entry.otNightHours || 0) +
    (entry.otSundayHours || 0) +
    (entry.otSundayNightHours || 0) +
    (entry.otHolidayHours || 0) +
    (entry.otHolidayNightHours || 0);

  if (totalOtDay <= 0) return false;

  const effectiveShift = entry.shift || defaultShift;
  const outMins = parseTimeToMinutes(entry.outTime);
  const inMins = parseTimeToMinutes(entry.inTime);

  if (outMins !== null) {
    if (effectiveShift === 'NIGHT') {
      return outMins > 6 * 60 && outMins <= 14 * 60;
    }
    if (outMins > 18 * 60) return true;
    if (inMins !== null && outMins < inMins && outMins <= 12 * 60) return true;
    return false;
  }

  return totalOtDay > 1;
};

export const isBereavementOrWeddingStatus = (status?: string): boolean =>
  status === 'Nghỉ cưới' || status === 'Nghỉ tang' || status === 'FAMILY';

const getBereavementWeddingLeaveRequestsInMonth = (
  employeeId: string,
  year: number,
  month: number
): { days: number; labels: string[] } => {
  if (typeof window === 'undefined' || !employeeId) return { days: 0, labels: [] };
  try {
    const raw = localStorage.getItem(`app_employee_leaves_${employeeId}`);
    if (!raw) return { days: 0, labels: [] };
    const list = JSON.parse(raw) as Array<{
      leaveType?: string;
      startDate?: string;
      days?: number;
    }>;
    if (!Array.isArray(list)) return { days: 0, labels: [] };

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    let totalDays = 0;
    const labelSet = new Set<string>();

    list.forEach((item) => {
      if (
        item.leaveType !== 'Nghỉ cưới' &&
        item.leaveType !== 'Nghỉ tang (Người nhà mất)'
      ) {
        return;
      }
      if (!item.startDate) return;
      const [yStr, mStr, dStr] = item.startDate.split('-');
      const sy = Number(yStr);
      const sm = Number(mStr);
      const sd = Number(dStr);
      if (!sy || !sm || !sd) return;

      const start = new Date(sy, sm - 1, sd);
      const durationDays = Math.max(1, Math.ceil(Number(item.days) || 1));
      const end = new Date(sy, sm - 1, sd + durationDays - 1);

      if (end >= monthStart && start <= monthEnd) {
        const overlapStart = start > monthStart ? start : monthStart;
        const overlapEnd = end < monthEnd ? end : monthEnd;
        const overlapDays =
          Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;
        totalDays += Math.max(1, overlapDays);
        labelSet.add(item.leaveType);
      }
    });

    return { days: totalDays, labels: Array.from(labelSet) };
  } catch {
    return { days: 0, labels: [] };
  }
};

export interface ComputedSalarySlipData {
  month: number;
  year: number;
  fullName: string;
  employeeId: string;
  departmentLabel: string;
  shiftLabel: string;
  totalSalary: number;
  ovtInsuranceBase: number;
  standardWorkDays: number;
  workDaysCount: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  remainingLeaveDays: number;
  otMealDays: number;
  otMealUnitRate: number;
  bereavementWeddingDays: number;
  hasBereavementOrWeddingCase: boolean;
  bereavementWeddingConfiguredAmount: number;
  bereavementWeddingCaseLabel: string;
  regularNightHours: number;
  otDayHours: number;
  otNightHours: number;
  otSundayDayHours: number;
  otSundayNightHours: number;
  otHolidayDayHours: number;
  otHolidayNightHours: number;
  lateEarlyHours: number;
  isDiligentAchieved: boolean;
  // Section 1 amounts
  workDaySalaryAmount: number;
  leave70DayCount: number;
  leave70DayAmount: number;
  attendanceAllowanceAmount: number;
  housingAllowanceAmount: number;
  livingAllowanceAmount: number;
  languageAllowanceAmount: number;
  positionAllowanceAmount: number;
  seniorityAllowanceAmount: number;
  processAllowanceAmount: number;
  attractionAllowanceAmount: number;
  cleanroomAllowanceAmount: number;
  phoneAllowanceAmount: number;
  paidLeaveAmount: number;
  unusedLeaveSettlementAmount: number;
  section1Total: number;
  // Section 2 amounts
  leave70Hours: number;
  leave70HoursAmount: number;
  nightShift30Amount: number;
  otNight195Hours: number;
  otNight195Amount: number;
  otNight215Amount: number;
  otDay150Amount: number;
  otSundayDay200Amount: number;
  otSundayNight270Amount: number;
  otHolidayDay300Amount: number;
  otHolidayNight390Amount: number;
  section2Total: number;
  // Section 3 amounts (Thu nhập ngoài hợp đồng lao động / ngoài lương chính)
  otMealAllowanceAmount: number;
  bereavementWeddingAmount: number;
  childcareAllowanceAmount: number;
  productivityBonusAmount: number;
  scopeSettingAllowanceAmount: number;
  section3Total: number;
  // Section I Total
  sectionITotal: number;
  // Section II
  socialInsuranceAmount: number;
  unionFeeAmount: number;
  sectionIITotal: number;
  // Section III
  personalIncomeTaxAmount: number;
  pitThreshold: number;
  // Section IV
  lateEarlyAmount: number;
  unexcusedFineHours: number;
  unexcusedFineAmount: number;
  uniformDeductionAmount: number;
  contractViolationAmount: number;
  sectionIVTotal: number;
  // Section V & Footer
  netSalaryAmount: number;
  businessTripAmount: number;
  deadlineDateText: string;
}

export interface ComputeSalarySlipParams {
  staff: Pick<StaffRecord, 'employeeId' | 'fullName' | 'department' | 'shift'> & {
    lateMinutes?: number;
    earlyMinutes?: number;
  };
  salaryConfig: EmployeeSalaryConfig;
  year: number;
  month: number;
  matrixDays?: Record<number, MatrixDayTimeEntry>;
  attendanceSummary?: {
    workDaysCount: number;
    regularDayHours: number;
    regularNightHours: number;
    otDayHours: number;
    otNightHours: number;
    otSundayDayHours: number;
    otSundayNightHours: number;
    otHolidayDayHours: number;
    otHolidayNightHours: number;
    otMealDays?: number;
    bereavementWeddingDays?: number;
  };
}

export const computeMonthlySalarySlipDetails = ({
  staff,
  salaryConfig,
  year,
  month,
  matrixDays,
  attendanceSummary,
}: ComputeSalarySlipParams): ComputedSalarySlipData => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const standardWorkDays = 26;

  let workDaysCount = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let otMealDays = 0;
  let matrixBereavementWeddingDays = 0;
  const matrixCaseLabels = new Set<string>();
  let regularNightHours = 0;
  let otDayHours = 0;
  let otNightHours = 0;
  let otSundayDayHours = 0;
  let otSundayNightHours = 0;
  let otHolidayDayHours = 0;
  let otHolidayNightHours = 0;

  if (matrixDays && Object.keys(matrixDays).length > 0) {
    for (let d = 1; d <= daysInMonth; d += 1) {
      const entry = matrixDays[d];
      if (!entry) continue;

      const reg = entry.regularHours || 0;
      const otD = entry.otDayHours || 0;
      const otN = entry.otNightHours || 0;
      const otSD = entry.otSundayHours || 0;
      const otSN = entry.otSundayNightHours || 0;
      const otHD = entry.otHolidayHours || 0;
      const otHN = entry.otHolidayNightHours || 0;
      const dayTotal = reg + otD + otN + otSD + otSN + otHD + otHN;

      if (dayTotal > 0 || (entry.inTime && entry.outTime)) {
        workDaysCount += 1;
      } else if (
        entry.status === 'Nghỉ phép' ||
        entry.status === 'LEAVE' ||
        entry.status === 'Nghỉ lễ' ||
        isBereavementOrWeddingStatus(entry.status)
      ) {
        paidLeaveDays += 1;
      } else if (entry.status === 'Nghỉ KL' || entry.status === 'Vắng mặt') {
        unpaidLeaveDays += 1;
      }

      if (isBereavementOrWeddingStatus(entry.status)) {
        matrixBereavementWeddingDays += 1;
        if (entry.status === 'Nghỉ cưới') matrixCaseLabels.add('Nghỉ cưới');
        else if (entry.status === 'Nghỉ tang') matrixCaseLabels.add('Người nhà mất');
        else matrixCaseLabels.add('Hiếu hỷ');
      }

      if (isOvertimeAfterSix(entry, staff.shift || 'DAY')) {
        otMealDays += 1;
      }

      const effectiveShift = entry.shift || staff.shift || 'DAY';
      if (effectiveShift === 'NIGHT') {
        regularNightHours += reg;
      }

      otDayHours += otD;
      otNightHours += otN;
      otSundayDayHours += otSD;
      otSundayNightHours += otSN;
      otHolidayDayHours += otHD;
      otHolidayNightHours += otHN;
    }
  } else if (attendanceSummary) {
    workDaysCount = attendanceSummary.workDaysCount || 0;
    regularNightHours = attendanceSummary.regularNightHours || 0;
    otDayHours = attendanceSummary.otDayHours || 0;
    otNightHours = attendanceSummary.otNightHours || 0;
    otSundayDayHours = attendanceSummary.otSundayDayHours || 0;
    otSundayNightHours = attendanceSummary.otSundayNightHours || 0;
    otHolidayDayHours = attendanceSummary.otHolidayDayHours || 0;
    otHolidayNightHours = attendanceSummary.otHolidayNightHours || 0;
    otMealDays = attendanceSummary.otMealDays || 0;
    matrixBereavementWeddingDays = attendanceSummary.bereavementWeddingDays || 0;
  }

  const leaveRequestCases = getBereavementWeddingLeaveRequestsInMonth(
    staff.employeeId,
    year,
    month
  );
  const bereavementWeddingDays = Math.max(
    matrixBereavementWeddingDays,
    leaveRequestCases.days
  );
  const hasBereavementOrWeddingCase = bereavementWeddingDays > 0;
  const combinedCaseLabels = Array.from(
    new Set([...Array.from(matrixCaseLabels), ...leaveRequestCases.labels])
  );
  const bereavementWeddingCaseLabel =
    combinedCaseLabels.length > 0 ? combinedCaseLabels.join(', ') : 'Nghỉ cưới / Người nhà mất';

  const r1 = (v: number) => Math.round(v * 10) / 10;
  regularNightHours = r1(regularNightHours);
  otDayHours = r1(otDayHours);
  otNightHours = r1(otNightHours);
  otSundayDayHours = r1(otSundayDayHours);
  otSundayNightHours = r1(otSundayNightHours);
  otHolidayDayHours = r1(otHolidayDayHours);
  otHolidayNightHours = r1(otHolidayNightHours);

  const basicSalary = Number(salaryConfig.basicSalary) || 0;
  const ovtInsuranceBase = Number(salaryConfig.ovtInsuranceBase) || 0;
  const totalSalary = calculateTotalSalary(salaryConfig);

  // Proration factor based on standard 26 working days
  const workRatio = standardWorkDays > 0 ? workDaysCount / standardWorkDays : 0;
  const cappedWorkDays = Math.min(workDaysCount, standardWorkDays);
  const cappedRatio = standardWorkDays > 0 ? cappedWorkDays / standardWorkDays : 0;

  const isDiligentAchieved = workDaysCount > 0 && unpaidLeaveDays === 0;
  const workDaySalaryAmount = Math.round(basicSalary * workRatio);
  const leave70DayCount = 0;
  const leave70DayAmount = 0;
  const attendanceAllowanceAmount = isDiligentAchieved
    ? Number(salaryConfig.attendanceAllowance) || 0
    : 0;
  const housingAllowanceAmount = Math.round((Number(salaryConfig.housingAllowance) || 0) * cappedRatio);
  const livingAllowanceAmount = Math.round((Number(salaryConfig.livingAllowance) || 0) * cappedRatio);
  const languageAllowanceAmount = Math.round((Number(salaryConfig.koreanAllowance) || 0) * cappedRatio);
  const positionAllowanceAmount = Math.round((Number(salaryConfig.positionAllowance) || 0) * cappedRatio);
  const seniorityAllowanceAmount = Math.round((Number(salaryConfig.seniorityAllowance) || 0) * cappedRatio);
  const processAllowanceAmount = Math.round((Number(salaryConfig.processAllowance) || 0) * cappedRatio);
  const attractionAllowanceAmount = Math.round((Number(salaryConfig.attractionAllowance) || 0) * cappedRatio);
  const cleanroomAllowanceAmount = Math.round((Number(salaryConfig.cleanroomAllowance) || 0) * cappedRatio);
  const phoneAllowanceAmount = Math.round((Number(salaryConfig.phoneAllowance) || 0) * cappedRatio);
  const paidLeaveAmount = Math.round((basicSalary / standardWorkDays) * paidLeaveDays);
  const unusedLeaveSettlementAmount = 0;

  const section1Total =
    workDaySalaryAmount +
    leave70DayAmount +
    attendanceAllowanceAmount +
    housingAllowanceAmount +
    livingAllowanceAmount +
    languageAllowanceAmount +
    positionAllowanceAmount +
    seniorityAllowanceAmount +
    processAllowanceAmount +
    attractionAllowanceAmount +
    cleanroomAllowanceAmount +
    phoneAllowanceAmount +
    paidLeaveAmount +
    unusedLeaveSettlementAmount;

  // Section 2: OT & Night shift allowance (base hourly rate = ovtInsuranceBase / 26 / 8)
  const hourlyOvtRate = ovtInsuranceBase / standardWorkDays / 8;
  const leave70Hours = 0;
  const leave70HoursAmount = 0;
  const nightShift30Amount = Math.round(hourlyOvtRate * 0.3 * regularNightHours);
  const otNight195Hours = 0;
  const otNight195Amount = 0;
  const otNight215Amount = Math.round(hourlyOvtRate * 2.15 * otNightHours);
  const otDay150Amount = Math.round(hourlyOvtRate * 1.5 * otDayHours);
  const otSundayDay200Amount = Math.round(hourlyOvtRate * 2.0 * otSundayDayHours);
  const otSundayNight270Amount = Math.round(hourlyOvtRate * 2.7 * otSundayNightHours);
  const otHolidayDay300Amount = Math.round(hourlyOvtRate * 3.0 * otHolidayDayHours);
  const otHolidayNight390Amount = Math.round(hourlyOvtRate * 3.9 * otHolidayNightHours);

  const section2Total =
    leave70HoursAmount +
    nightShift30Amount +
    otNight195Amount +
    otNight215Amount +
    otDay150Amount +
    otSundayDay200Amount +
    otSundayNight270Amount +
    otHolidayDay300Amount +
    otHolidayNight390Amount;

  // Section 3: Ngoài lương chính / Thu nhập ngoài hợp đồng lao động
  // - Trợ cấp tiền ăn tăng ca: Số buổi tăng ca ra sau 6h × đơn giá cấu hình ở cột Phụ cấp tiền ăn
  // - Phụ cấp hiếu hỷ: chỉ cộng ngoài lương khi phát sinh trường hợp nghỉ phép cưới / người nhà mất
  const otMealUnitRate = Number(salaryConfig.mealAllowance) || 0;
  const otMealAllowanceAmount = otMealDays * otMealUnitRate;
  const bereavementWeddingConfiguredAmount = Number(salaryConfig.bereavementWeddingAllowance) || 0;
  const bereavementWeddingAmount = hasBereavementOrWeddingCase
    ? bereavementWeddingConfiguredAmount
    : 0;
  const childcareAllowanceAmount = Number(salaryConfig.childcareAllowance) || 0;
  const productivityBonusAmount = Number(salaryConfig.productivityBonus) || 0;
  const scopeSettingAllowanceAmount = 0;
  const section3Total =
    otMealAllowanceAmount +
    bereavementWeddingAmount +
    childcareAllowanceAmount +
    productivityBonusAmount +
    scopeSettingAllowanceAmount;

  const sectionITotal = section1Total + section2Total + section3Total;

  // Section II: Social Insurance 10.5% + Union fee
  const socialInsuranceAmount = Math.round(ovtInsuranceBase * 0.105);
  const unionFeeAmount = Number(salaryConfig.unionFee) || 0;
  const sectionIITotal = socialInsuranceAmount + unionFeeAmount;

  // Section III: Personal Income Tax
  // Tính 10% trên phần thu nhập vượt ngưỡng cấu hình (personalIncomeTax)
  const pitThreshold = Number(salaryConfig.personalIncomeTax) || 0;
  const personalIncomeTaxAmount = calculatePitAboveThreshold(sectionITotal, pitThreshold);

  // Section IV: Deductions
  const totalLateEarlyMinutes = (staff.lateMinutes || 0) + (staff.earlyMinutes || 0);
  const lateEarlyHours = r1(totalLateEarlyMinutes / 60);
  const lateEarlyAmount = Math.round(hourlyOvtRate * lateEarlyHours);
  const unexcusedFineHours = 0;
  const unexcusedFineAmount = 0;
  const uniformDeductionAmount = 0;
  const contractViolationAmount = 0;
  const sectionIVTotal =
    lateEarlyAmount + unexcusedFineAmount + uniformDeductionAmount + contractViolationAmount;

  const netSalaryAmount = Math.max(
    0,
    sectionITotal - sectionIITotal - personalIncomeTaxAmount - sectionIVTotal
  );
  const businessTripAmount = 0;

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const deadlineDateText = `10/${String(nextMonth).padStart(2, '0')}/${nextYear}`;

  const dept = (staff.department || 'MULTI').toUpperCase();
  const shiftLabel = staff.shift === 'NIGHT' ? `${dept} - Ca Đêm` : `${dept} - HC`;

  return {
    month,
    year,
    fullName: staff.fullName,
    employeeId: staff.employeeId,
    departmentLabel: `Sản xuất - ${dept}`,
    shiftLabel,
    totalSalary,
    ovtInsuranceBase,
    standardWorkDays,
    workDaysCount,
    paidLeaveDays,
    unpaidLeaveDays,
    remainingLeaveDays: Math.max(0, 12 - paidLeaveDays),
    otMealDays,
    otMealUnitRate,
    bereavementWeddingDays,
    hasBereavementOrWeddingCase,
    bereavementWeddingConfiguredAmount,
    bereavementWeddingCaseLabel,
    regularNightHours,
    otDayHours,
    otNightHours,
    otSundayDayHours,
    otSundayNightHours,
    otHolidayDayHours,
    otHolidayNightHours,
    lateEarlyHours,
    isDiligentAchieved,
    workDaySalaryAmount,
    leave70DayCount,
    leave70DayAmount,
    attendanceAllowanceAmount,
    housingAllowanceAmount,
    livingAllowanceAmount,
    languageAllowanceAmount,
    positionAllowanceAmount,
    seniorityAllowanceAmount,
    processAllowanceAmount,
    attractionAllowanceAmount,
    cleanroomAllowanceAmount,
    phoneAllowanceAmount,
    paidLeaveAmount,
    unusedLeaveSettlementAmount,
    section1Total,
    leave70Hours,
    leave70HoursAmount,
    nightShift30Amount,
    otNight195Hours,
    otNight195Amount,
    otNight215Amount,
    otDay150Amount,
    otSundayDay200Amount,
    otSundayNight270Amount,
    otHolidayDay300Amount,
    otHolidayNight390Amount,
    section2Total,
    otMealAllowanceAmount,
    bereavementWeddingAmount,
    childcareAllowanceAmount,
    productivityBonusAmount,
    scopeSettingAllowanceAmount,
    section3Total,
    sectionITotal,
    socialInsuranceAmount,
    unionFeeAmount,
    sectionIITotal,
    personalIncomeTaxAmount,
    pitThreshold,
    lateEarlyAmount,
    unexcusedFineHours,
    unexcusedFineAmount,
    uniformDeductionAmount,
    contractViolationAmount,
    sectionIVTotal,
    netSalaryAmount,
    businessTripAmount,
    deadlineDateText,
  };
};
