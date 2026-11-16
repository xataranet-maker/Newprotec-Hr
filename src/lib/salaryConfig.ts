import { EmployeeSalaryConfig, MatrixDayTimeEntry, StaffRecord } from '../types';

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
  ovtInsuranceBase: 0,
  ovtInsuranceManual: false,
  totalSalary: 0,
});

export const calculateTotalSalary = (cfg: EmployeeSalaryConfig): number =>
  SALARY_NUMERIC_FIELDS.reduce((sum, f) => sum + (Number(cfg[f.key]) || 0), 0);

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
  otMealAllowanceAmount: number;
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
  // Section 3 amounts
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
      const totalOtDay = otD + otN + otSD + otSN + otHD + otHN;

      if (dayTotal > 0 || (entry.inTime && entry.outTime)) {
        workDaysCount += 1;
      } else if (
        entry.status === 'Nghỉ phép' ||
        entry.status === 'LEAVE' ||
        entry.status === 'Nghỉ lễ' ||
        entry.status === 'FAMILY'
      ) {
        paidLeaveDays += 1;
      } else if (entry.status === 'Nghỉ KL' || entry.status === 'Vắng mặt') {
        unpaidLeaveDays += 1;
      }

      if (totalOtDay >= 1) {
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
  }

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
  const totalSalary = Number(salaryConfig.totalSalary) || 0;

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
  const otMealAllowanceAmount = Number(salaryConfig.mealAllowance) || 0;
  const cleanroomAllowanceAmount = Math.round((Number(salaryConfig.cleanroomAllowance) || 0) * cappedRatio);
  const phoneAllowanceAmount = Math.round((Number(salaryConfig.phoneAllowance) || 0) * cappedRatio);
  const paidLeaveAmount = Math.round(
    (basicSalary / standardWorkDays) * paidLeaveDays +
      (Number(salaryConfig.bereavementWeddingAllowance) || 0)
  );
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
    otMealAllowanceAmount +
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

  // Section 3: Non-contract income
  const childcareAllowanceAmount = Number(salaryConfig.childcareAllowance) || 0;
  const productivityBonusAmount = Number(salaryConfig.productivityBonus) || 0;
  const scopeSettingAllowanceAmount = 0;
  const section3Total =
    childcareAllowanceAmount + productivityBonusAmount + scopeSettingAllowanceAmount;

  const sectionITotal = section1Total + section2Total + section3Total;

  // Section II: Social Insurance 10.5% + Union fee
  const socialInsuranceAmount = Math.round(ovtInsuranceBase * 0.105);
  const unionFeeAmount = 0;
  const sectionIITotal = socialInsuranceAmount + unionFeeAmount;

  // Section III: Personal Income Tax
  const personalIncomeTaxAmount = 0;

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
    otMealAllowanceAmount,
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
    childcareAllowanceAmount,
    productivityBonusAmount,
    scopeSettingAllowanceAmount,
    section3Total,
    sectionITotal,
    socialInsuranceAmount,
    unionFeeAmount,
    sectionIITotal,
    personalIncomeTaxAmount,
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
