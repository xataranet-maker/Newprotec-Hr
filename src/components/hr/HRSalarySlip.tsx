import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AttendanceConfirmationRecord,
  EmployeeSalaryConfig,
  SalarySecurityConfig,
  SalarySlipRecord,
  StaffRecord,
  UserAccount,
} from '../../types';
import {
  Banknote,
  Search,
  FileSpreadsheet,
  Upload,
  Save,
  Calculator,
  RotateCcw,
  CheckCircle2,
  Eye,
  EyeOff,
  Users,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  ShieldCheck,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  MATRIX_UPDATED_EVENT,
  getEmployeeProfileMatrixData,
} from '../../lib/matrixTimekeeping';
import {
  SALARY_NUMERIC_FIELDS,
  SalaryNumericFieldKey,
  OVT_FORMULA_STORAGE_KEY,
  loadOvtFormulaFields,
  createEmptySalaryConfig,
  calculateOvtInsuranceBase,
  calculateTotalSalary,
  recomputeSalaryConfig,
  formatVnd,
  ComputedSalarySlipData,
  computeMonthlySalarySlipDetails,
  calculatePitAboveThreshold,
  canUserAccessSalarySlip,
} from '../../lib/salaryConfig';
import { SalarySlipModal } from './SalarySlipModal';

interface HRSalarySlipProps {
  salarySlips: SalarySlipRecord[];
  setSalarySlips: (s: SalarySlipRecord[]) => void;
  allStaff: StaffRecord[];
  salaryConfigs: EmployeeSalaryConfig[];
  setSalaryConfigs: (configs: EmployeeSalaryConfig[]) => void;
  attendanceConfirmations?: AttendanceConfirmationRecord[];
  currentUser?: UserAccount | null;
  salarySecurity?: SalarySecurityConfig;
}

interface CurrencyInputCellProps {
  value: number;
  onChange: (val: number) => void;
  accentClass?: string;
  placeholder?: string;
  isManual?: boolean;
  onResetManual?: () => void;
  masked?: boolean;
}

const CurrencyInputCell: React.FC<CurrencyInputCellProps> = ({
  value,
  onChange,
  accentClass = 'text-slate-100',
  placeholder = '0',
  isManual,
  onResetManual,
  masked = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const handleFocus = () => {
    if (masked) return;
    setIsEditing(true);
    setDraft(value > 0 ? String(value) : '');
  };

  const handleBlur = () => {
    if (masked) return;
    setIsEditing(false);
    const cleaned = Number(draft.replace(/[^\d]/g, '')) || 0;
    if (cleaned !== value) {
      onChange(cleaned);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.currentTarget as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setDraft(value > 0 ? String(value) : '');
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  if (masked) {
    return (
      <div className="w-full min-w-[96px] bg-slate-950/70 border border-slate-800/70 rounded px-2 py-1 text-right font-mono text-[11px] text-slate-500 select-none">
        ••••••
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        value={isEditing ? draft : value > 0 ? value.toLocaleString('vi-VN') : ''}
        placeholder={placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        className={`w-full min-w-[96px] bg-slate-950/70 hover:bg-slate-900 focus:bg-slate-900 border ${
          isManual ? 'border-amber-500/60' : 'border-slate-800/90 focus:border-emerald-500'
        } rounded px-2 py-1 text-right font-mono text-[11px] focus:outline-hidden transition-colors ${accentClass}`}
      />
      {isManual && onResetManual && (
        <button
          type="button"
          onClick={onResetManual}
          title="Đang nhập tay — Nhấn để tính lại theo công thức OVT & BH"
          className="p-1 rounded text-amber-400 hover:text-amber-300 hover:bg-slate-800 shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export const HRSalarySlip: React.FC<HRSalarySlipProps> = ({
  salarySlips,
  allStaff,
  salaryConfigs,
  setSalaryConfigs,
  currentUser,
  salarySecurity,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [subTab, setSubTab] = useState<'CONFIG' | 'ISSUED'>('CONFIG');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [formulaFields, setFormulaFields] = useState<SalaryNumericFieldKey[]>(loadOvtFormulaFields);
  const [showFormulaBar, setShowFormulaBar] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [viewingSlipData, setViewingSlipData] = useState<ComputedSalarySlipData | null>(null);
  const [matrixTick, setMatrixTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Salary security states
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
    const onMatrixUpdated = () => setMatrixTick((v) => v + 1);
    window.addEventListener(MATRIX_UPDATED_EVENT, onMatrixUpdated);
    return () => window.removeEventListener(MATRIX_UPDATED_EVENT, onMatrixUpdated);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
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

  const handleOpenEmployeeSlip = (staff: StaffRecord, config: EmployeeSalaryConfig) => {
    if (isAmountMasked) {
      showToast('Đang bật chế độ che số liệu — vui lòng nhấn "Hiện số liệu" để xem chi tiết phiếu lương!');
      return;
    }
    const { days } = getEmployeeProfileMatrixData(
      staff.employeeId,
      staff.department || 'MULTI',
      selectedYear,
      selectedMonth,
      staff
    );
    const computed = computeMonthlySalarySlipDetails({
      staff,
      salaryConfig: config,
      year: selectedYear,
      month: selectedMonth,
      matrixDays: days,
    });
    setViewingSlipData(computed);
  };

  const handleOpenIssuedSlip = (slip: SalarySlipRecord) => {
    if (isAmountMasked) {
      showToast('Đang bật chế độ che số liệu — vui lòng nhấn "Hiện số liệu" để xem chi tiết phiếu lương!');
      return;
    }
    const [yStr, mStr] = slip.month.split('-');
    const slipYear = Number(yStr) || selectedYear;
    const slipMonth = Number(mStr) || selectedMonth;
    const matchedStaff =
      allStaff.find(
        (st) => st.employeeId.trim().toLowerCase() === slip.employeeId.trim().toLowerCase()
      ) ||
      ({
        employeeId: slip.employeeId,
        fullName: slip.attendanceSummary?.fullName || slip.salaryConfig?.fullName || slip.employeeId,
        department: slip.attendanceSummary?.department || slip.salaryConfig?.fullName || 'MULTI',
        shift: 'DAY',
      } as StaffRecord);

    const matchedRow = mergedRows.find(
      (r) => r.staff.employeeId.trim().toLowerCase() === slip.employeeId.trim().toLowerCase()
    );
    const resolvedConfig =
      slip.salaryConfig || matchedRow?.config || createEmptySalaryConfig(matchedStaff);

    const { days } = getEmployeeProfileMatrixData(
      matchedStaff.employeeId,
      matchedStaff.department || 'MULTI',
      slipYear,
      slipMonth,
      matchedStaff
    );

    const computed = computeMonthlySalarySlipDetails({
      staff: matchedStaff,
      salaryConfig: recomputeSalaryConfig(resolvedConfig, formulaFields),
      year: slipYear,
      month: slipMonth,
      matrixDays: days,
      attendanceSummary: slip.attendanceSummary,
    });
    setViewingSlipData(computed);
  };

  const departments = useMemo(() => {
    const set = new Set<string>();
    allStaff.forEach((s) => {
      if (s.department) set.add(s.department.toUpperCase());
    });
    return Array.from(set);
  }, [allStaff]);

  // Merge allStaff with stored salaryConfigs so every employee always has a row
  const mergedRows = useMemo(() => {
    const configMap = new Map<string, EmployeeSalaryConfig>();
    salaryConfigs.forEach((c) => {
      configMap.set(c.employeeId.trim().toLowerCase(), c);
    });

    return allStaff.map((staff) => {
      const key = staff.employeeId.trim().toLowerCase();
      const existing = configMap.get(key);
      const base = existing
        ? { ...createEmptySalaryConfig(staff), ...existing, fullName: staff.fullName }
        : createEmptySalaryConfig(staff);
      return {
        staff,
        config: recomputeSalaryConfig(base, formulaFields),
      };
    });
  }, [allStaff, salaryConfigs, formulaFields]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return mergedRows.filter(({ staff }) => {
      const matchSearch =
        !q ||
        staff.fullName.toLowerCase().includes(q) ||
        staff.employeeId.toLowerCase().includes(q) ||
        (staff.position || '').toLowerCase().includes(q);
      const matchDept =
        filterDept === 'ALL' || (staff.department || '').toUpperCase() === filterDept;
      return matchSearch && matchDept;
    });
  }, [mergedRows, searchTerm, filterDept]);

  // Totals for every numeric column in tfoot
  const columnTotals = useMemo(() => {
    const sums: Record<string, number> = {
      unionFee: 0,
      personalIncomeTax: 0,
      ovtInsuranceBase: 0,
      totalSalary: 0,
    };
    SALARY_NUMERIC_FIELDS.forEach((f) => {
      sums[f.key] = 0;
    });

    filteredRows.forEach(({ config }) => {
      SALARY_NUMERIC_FIELDS.forEach((f) => {
        sums[f.key] += Number(config[f.key]) || 0;
      });
      sums.unionFee += Number(config.unionFee) || 0;
      sums.personalIncomeTax += calculatePitAboveThreshold(
        config.totalSalary,
        config.personalIncomeTax
      );
      sums.ovtInsuranceBase += Number(config.ovtInsuranceBase) || 0;
      sums.totalSalary += Number(config.totalSalary) || 0;
    });

    return sums;
  }, [filteredRows]);

  const upsertEmployeeConfig = (updated: EmployeeSalaryConfig) => {
    const target = updated.employeeId.trim().toLowerCase();
    const withTimestamp: EmployeeSalaryConfig = {
      ...recomputeSalaryConfig(updated, formulaFields),
      updatedAt: new Date().toLocaleString('vi-VN'),
    };
    const exists = salaryConfigs.some((c) => c.employeeId.trim().toLowerCase() === target);
    const next = exists
      ? salaryConfigs.map((c) => (c.employeeId.trim().toLowerCase() === target ? withTimestamp : c))
      : [...salaryConfigs, withTimestamp];
    setSalaryConfigs(next);
  };

  const handleFieldChange = (
    currentConfig: EmployeeSalaryConfig,
    field: SalaryNumericFieldKey,
    value: number
  ) => {
    upsertEmployeeConfig({
      ...currentConfig,
      [field]: value,
    });
  };

  const handleOvtBaseManualChange = (currentConfig: EmployeeSalaryConfig, value: number) => {
    upsertEmployeeConfig({
      ...currentConfig,
      ovtInsuranceBase: value,
      ovtInsuranceManual: true,
    });
  };

  const handleResetOvtManual = (currentConfig: EmployeeSalaryConfig) => {
    upsertEmployeeConfig({
      ...currentConfig,
      ovtInsuranceManual: false,
    });
  };

  const handleUnionFeeChange = (currentConfig: EmployeeSalaryConfig, value: number) => {
    upsertEmployeeConfig({
      ...currentConfig,
      unionFee: value,
    });
  };

  const handlePitThresholdChange = (currentConfig: EmployeeSalaryConfig, value: number) => {
    upsertEmployeeConfig({
      ...currentConfig,
      personalIncomeTax: value,
    });
  };

  const toggleFormulaField = (fieldKey: SalaryNumericFieldKey) => {
    const next = formulaFields.includes(fieldKey)
      ? formulaFields.filter((k) => k !== fieldKey)
      : [...formulaFields, fieldKey];
    setFormulaFields(next);
    localStorage.setItem(OVT_FORMULA_STORAGE_KEY, JSON.stringify(next));
  };

  const handleRecalculateAllByFormula = () => {
    const next = mergedRows.map(({ config }) => ({
      ...config,
      ovtInsuranceManual: false,
      ovtInsuranceBase: calculateOvtInsuranceBase(config, formulaFields),
      totalSalary: calculateTotalSalary(config),
      updatedAt: new Date().toLocaleString('vi-VN'),
    }));
    setSalaryConfigs(next);
    showToast('Đã tính lại Tổng lương tính OVT và BH cho toàn bộ nhân viên theo công thức!');
  };

  const handleSaveAll = () => {
    const next = mergedRows.map(({ config }) => ({
      ...config,
      updatedAt: config.updatedAt || new Date().toLocaleString('vi-VN'),
    }));
    setSalaryConfigs(next);
    showToast(`Đã lưu cấu hình bảng lương cho ${next.length} nhân viên!`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const headers = [
      'Họ Tên Nhân Viên',
      'Mã Nhân Viên',
      ...SALARY_NUMERIC_FIELDS.map((f) => f.label),
      'Công đoàn phí',
      'Thuế TNCN 10% (Mức vượt)',
      'Tổng lương tính OVT và BH',
      'Tổng lương chính',
    ];

    const data = filteredRows.map(({ config }) => [
      config.fullName,
      config.employeeId,
      ...SALARY_NUMERIC_FIELDS.map((f) => Number(config[f.key]) || 0),
      Number(config.unionFee) || 0,
      Number(config.personalIncomeTax) || 0,
      Number(config.ovtInsuranceBase) || 0,
      Number(config.totalSalary) || 0,
    ]);

    const summaryRow = [
      `TỔNG CỘNG (${filteredRows.length} NV)`,
      '',
      ...SALARY_NUMERIC_FIELDS.map((f) => columnTotals[f.key] || 0),
      columnTotals.unionFee || 0,
      columnTotals.personalIncomeTax || 0,
      columnTotals.ovtInsuranceBase || 0,
      columnTotals.totalSalary || 0,
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data, summaryRow]);
    XLSX.utils.book_append_sheet(wb, ws, 'Cau_Hinh_Phieu_Luong');
    XLSX.writeFile(wb, 'Cau_Hinh_Phieu_Luong_Nhan_Vien.xlsx');
    showToast('Đã xuất file Excel cấu hình phiếu lương!');
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
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: 0 });

        const staffById = new Map<string, StaffRecord>();
        allStaff.forEach((s) => staffById.set(s.employeeId.trim().toLowerCase(), s));

        const existingMap = new Map<string, EmployeeSalaryConfig>();
        mergedRows.forEach(({ config }) =>
          existingMap.set(config.employeeId.trim().toLowerCase(), config)
        );

        let updatedCount = 0;
        const normalizeKey = (s: string) =>
          s
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');

        const parseAmount = (val: any): number => {
          if (typeof val === 'number') return Math.max(0, Math.round(val));
          const num = Number(String(val || '').replace(/[^\d.-]/g, ''));
          return Number.isFinite(num) && num > 0 ? Math.round(num) : 0;
        };

        rows.forEach((rawRow) => {
          const normalizedRow: Record<string, any> = {};
          Object.keys(rawRow).forEach((k) => {
            normalizedRow[normalizeKey(k)] = rawRow[k];
          });

          const rawEmpId = String(
            normalizedRow['manhanvien'] ||
              normalizedRow['manv'] ||
              normalizedRow['employeeid'] ||
              ''
          ).trim();
          if (!rawEmpId) return;

          const empKey = rawEmpId.toLowerCase();
          const matchedStaff = staffById.get(empKey);
          const base =
            existingMap.get(empKey) ||
            createEmptySalaryConfig(
              matchedStaff || {
                employeeId: rawEmpId,
                fullName: String(normalizedRow['hotennhanvien'] || rawEmpId),
              }
            );

          const updated: EmployeeSalaryConfig = { ...base };
          SALARY_NUMERIC_FIELDS.forEach((f) => {
            const targetKey = normalizeKey(f.label);
            if (normalizedRow[targetKey] !== undefined) {
              updated[f.key] = parseAmount(normalizedRow[targetKey]);
            } else if (f.key === 'koreanAllowance' && normalizedRow['phucaptienghan'] !== undefined) {
              updated[f.key] = parseAmount(normalizedRow['phucaptienghan']);
            }
          });

          // Import Công đoàn phí & Thuế TNCN (10%)
          if (normalizedRow['congdoanphi'] !== undefined) {
            updated.unionFee = parseAmount(normalizedRow['congdoanphi']);
          }
          const pitKey = Object.keys(normalizedRow).find(
            (k) =>
              k === 'thuetncn10' ||
              k === 'thuetncn' ||
              k.includes('mucvuot') ||
              k.includes('thuethunhapcanhan')
          );
          if (pitKey) {
            updated.personalIncomeTax = parseAmount(normalizedRow[pitKey]);
          }

          // Check optional manual OVT & BH column
          const ovtKey = Object.keys(normalizedRow).find(
            (k) => k.includes('tongluongtinhovt') || k.includes('ovtvabh')
          );
          if (ovtKey && parseAmount(normalizedRow[ovtKey]) > 0) {
            const importedOvt = parseAmount(normalizedRow[ovtKey]);
            const autoOvt = calculateOvtInsuranceBase(updated, formulaFields);
            updated.ovtInsuranceBase = importedOvt;
            updated.ovtInsuranceManual = importedOvt !== autoOvt;
          } else {
            updated.ovtInsuranceManual = false;
          }

          existingMap.set(empKey, {
            ...recomputeSalaryConfig(updated, formulaFields),
            updatedAt: new Date().toLocaleString('vi-VN'),
          });
          updatedCount += 1;
        });

        if (updatedCount > 0) {
          setSalaryConfigs(Array.from(existingMap.values()));
          showToast(`Đã nhập cấu hình lương cho ${updatedCount} nhân viên từ Excel!`);
        } else {
          showToast('Không tìm thấy cột Mã Nhân Viên hợp lệ trong file Excel.');
        }
      } catch (err) {
        console.error('Excel import error:', err);
        showToast('Lỗi khi đọc file Excel cấu hình lương.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredIssuedSlips = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return salarySlips.filter((s) => {
      if (!q) return true;
      const name = s.attendanceSummary?.fullName || s.salaryConfig?.fullName || '';
      return (
        s.employeeId.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        s.month.toLowerCase().includes(q)
      );
    });
  }, [salarySlips, searchTerm]);

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
              Khu Vực Lương Được Bảo Mật
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Tài khoản{' '}
              <span className="font-mono font-bold text-cyan-300">
                @{currentUser?.username || 'khách'}
              </span>{' '}
              chưa được cấp thẩm quyền truy cập <span className="font-semibold text-white">Tab Phiếu Lương</span>.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Để đảm bảo tính bí mật thu nhập nhân viên, vui lòng liên hệ Quản trị viên để được cấp quyền trong mục{' '}
              <span className="text-emerald-300 font-semibold">ADMIN &rarr; Bảo Mật Lương</span>.
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
              Xác Thực Mã PIN Phiếu Lương
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nhập mã PIN bảo mật lớp 2 để mở khóa thông tin lương của nhân viên.
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
                {showPinInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
            Mở Khóa Tab Phiếu Lương
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-[100vw] space-y-4">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="w-full xl:w-auto px-7 sm:px-4 xl:px-0">
          <div className="flex flex-col sm:flex-row items-center justify-center xl:justify-start gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-white flex flex-wrap items-center justify-center sm:justify-start gap-2 uppercase tracking-wide">
                <span>Cấu Hình Phiếu Lương &amp; Phụ Cấp Nhân Viên</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {allStaff.length} Nhân viên
                </span>
                {salarySecurity?.enabled && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-700/50 text-cyan-300 font-semibold normal-case">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Bảo mật đang bật</span>
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-1 sm:mt-0.5 text-center sm:text-left">
                Thiết lập lương cơ bản, các khoản phụ cấp, trợ cấp, thưởng và tổng lương tính OVT &amp; BH.
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector, Privacy Controls & Mode Switcher */}
        <div className="w-full max-w-md mx-auto xl:max-w-none xl:w-auto xl:mx-0 flex flex-col sm:flex-row sm:flex-wrap items-center justify-center xl:justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsAmountMasked((v) => !v)}
            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
              isAmountMasked
                ? 'bg-amber-950/60 border-amber-600/50 text-amber-300 hover:bg-amber-900/60'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-cyan-500/50'
            }`}
            title={isAmountMasked ? 'Hiện số tiền lương' : 'Che số tiền lương trên màn hình'}
          >
            {isAmountMasked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isAmountMasked ? 'Hiện số liệu' : 'Che số liệu'}</span>
          </button>

          {requiresPin && (
            <button
              type="button"
              onClick={handleLockNow}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-700/50 text-rose-300 text-xs font-semibold cursor-pointer transition-colors"
              title="Khóa ngay Tab Phiếu Lương"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Khóa Ngay</span>
            </button>
          )}

          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-200">
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

          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSubTab('CONFIG')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer text-center ${
                subTab === 'CONFIG'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cấu Hình Bảng Lương
            </button>
            <button
              type="button"
              onClick={() => setSubTab('ISSUED')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                subTab === 'ISSUED'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Phiếu Đã Phát Hành</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] font-mono">
                {salarySlips.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {isAmountMasked && (
        <div className="bg-amber-950/40 border border-amber-700/50 text-amber-200 px-4 py-2 rounded-xl text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Đang bật chế độ che số liệu lương trên màn hình. Nhấn{' '}
              <span className="font-bold text-white">&quot;Hiện số liệu&quot;</span> để xem chi tiết hoặc chỉnh sửa.
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

      {/* Search & Toolbar */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-3">
        <div className="w-full max-w-md mx-auto xl:max-w-none xl:w-auto xl:mx-0 grid grid-cols-[minmax(0,1fr)_auto] sm:flex items-center justify-center xl:justify-start gap-2">
          <div className="relative min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên, mã NV..."
              className="w-full sm:w-48 bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {subTab === 'CONFIG' && (
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-hidden shrink-0"
            >
              <option value="ALL">Tất cả bộ phận</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>

        {subTab === 'CONFIG' && (
          <div className="w-full max-w-md mx-auto xl:max-w-none xl:w-auto xl:mx-0 flex flex-wrap items-center justify-center xl:justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowFormulaBar((v) => !v)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] sm:text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                showFormulaBar
                  ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Công thức OVT &amp; BH ({formulaFields.length})</span>
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
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] sm:text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Nhập Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] sm:text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Xuất Excel</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md cursor-pointer transition-colors whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu Cấu Hình</span>
            </button>
          </div>
        )}
      </div>

      {/* Collapsible OVT & BH Formula Selector */}
      {subTab === 'CONFIG' && showFormulaBar && (
        <div className="bg-slate-900/95 border border-amber-500/40 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <Calculator className="w-4 h-4" />
              <span>
                Chọn các khoản tính vào &quot;Tổng lương tính OVT và BH&quot;
              </span>
            </div>
            <button
              type="button"
              onClick={handleRecalculateAllByFormula}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
            >
              Áp dụng công thức cho toàn bộ NV
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {SALARY_NUMERIC_FIELDS.map((field) => {
              const checked = formulaFields.includes(field.key);
              return (
                <label
                  key={field.key}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                    checked
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFormulaField(field.key)}
                    className="accent-emerald-500 rounded cursor-pointer"
                  />
                  <span className="truncate">{field.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'CONFIG' ? (
        <>
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  Nhân Viên Hiển Thị
                </div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">
                  {filteredRows.length} <span className="text-xs font-sans text-slate-400">NV</span>
                </div>
              </div>
              <Users className="w-5 h-5 text-cyan-400" />
            </div>

            <div className="bg-amber-950/25 border border-amber-700/50 p-3.5 rounded-xl">
              <div className="text-[10px] text-amber-300 uppercase font-semibold">
                Tổng Lương Tính OVT và BH
              </div>
              <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                {isAmountMasked ? '••••••' : formatVnd(columnTotals.ovtInsuranceBase)}{' '}
                <span className="text-xs font-sans font-normal text-amber-400/80">VNĐ</span>
              </div>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-700/50 p-3.5 rounded-xl">
              <div className="text-[10px] text-emerald-300 uppercase font-semibold">
                Tổng Lương Chính (Cấu Hình)
              </div>
              <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">
                {isAmountMasked ? '••••••' : formatVnd(columnTotals.totalSalary)}{' '}
                <span className="text-xs font-sans font-normal text-emerald-400/80">VNĐ</span>
              </div>
            </div>
          </div>

          {/* Rules Info Strip */}
          <div className="bg-cyan-950/25 border border-cyan-800/50 rounded-xl px-4 py-2.5 text-[11px] text-slate-300 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-cyan-300">Trợ cấp tiền ăn tăng ca:</span> Tự động tính ={' '}
              <span className="font-mono font-bold text-emerald-300">Số buổi tăng ca ra sau 6 giờ</span> (ca ngày &gt; 18:00, ca đêm &gt; 06:00) × đơn giá cấu hình ở cột{' '}
              <span className="font-semibold text-white">&quot;Phụ cấp tiền ăn&quot;</span> (cộng ngoài lương chính, cập nhật linh hoạt theo từng thời điểm).
            </div>
            <div>
              <span className="font-bold text-amber-300">Phụ cấp hiếu hỷ:</span> Cộng ngoài lương chính khi có ngày nghỉ phép cưới hoặc người nhà mất trong tháng.{' '}
              <span className="font-bold text-orange-300">Thuế TNCN 10%:</span> Nhập mức ngưỡng thu nhập để tính 10% trên số tiền vượt mức đó.
            </div>
          </div>

          {/* Salary Configuration Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="w-full overflow-x-auto overflow-y-auto custom-scrollbar max-h-[65vh]">
              <table className="w-full min-w-[2700px] text-left text-xs border-collapse">
                <thead className="bg-[#1b2e1e] text-emerald-100 text-[11px] sticky top-0 z-20 shadow-md">
                  <tr className="border-b border-emerald-800/70">
                    <th className="py-3 px-2 text-center border-r border-emerald-800/60 w-[44px] sm:sticky sm:left-0 sm:z-30 bg-[#1b2e1e] font-bold">
                      STT
                    </th>
                    <th className="py-3 px-3 text-left border-r border-emerald-800/60 min-w-[185px] sm:sticky sm:left-[44px] sm:z-30 bg-[#1b2e1e] font-bold">
                      Họ Tên Nhân Viên
                    </th>
                    <th className="py-3 px-2.5 text-center border-r border-emerald-800/60 min-w-[105px] sm:sticky sm:left-[229px] sm:z-30 bg-[#1b2e1e] font-bold">
                      Mã Nhân Viên
                    </th>
                    {SALARY_NUMERIC_FIELDS.map((field) => (
                      <th
                        key={field.key}
                        className="py-2.5 px-2.5 text-center border-r border-emerald-800/60 min-w-[118px] font-bold leading-tight"
                      >
                        <div>{field.label}</div>
                        {field.key === 'mealAllowance' && (
                          <div className="text-[9px] font-normal text-cyan-300 mt-0.5">
                            Ngoài lương · Đơn giá/buổi &gt;6h
                          </div>
                        )}
                        {field.key === 'bereavementWeddingAllowance' && (
                          <div className="text-[9px] font-normal text-amber-300 mt-0.5">
                            Ngoài lương · Cưới / Tang
                          </div>
                        )}
                      </th>
                    ))}
                    <th className="py-2.5 px-2.5 text-center border-r border-emerald-800/60 min-w-[125px] bg-[#2a2224] text-rose-200 font-bold leading-tight">
                      <div>Công đoàn phí</div>
                      <div className="text-[9px] font-normal text-rose-300/80 mt-0.5">
                        Khấu trừ cá nhân
                      </div>
                    </th>
                    <th className="py-2.5 px-2.5 text-center border-r border-emerald-800/60 min-w-[155px] bg-[#2b231e] text-orange-200 font-bold leading-tight">
                      <div>Thuế TNCN 10%</div>
                      <div className="text-[9px] font-normal text-orange-300/80 mt-0.5">
                        Mức tính phần vượt
                      </div>
                    </th>
                    <th className="py-2.5 px-2.5 text-center border-r border-emerald-800/60 min-w-[148px] bg-[#213824] text-amber-200 font-bold leading-tight">
                      <div>Tổng lương tính OVT và BH</div>
                    </th>
                    <th className="py-2.5 px-2.5 text-center border-r border-emerald-800/60 min-w-[138px] bg-[#244028] text-emerald-200 font-bold leading-tight">
                      <div>Tổng lương chính</div>
                      <div className="text-[9px] font-normal text-emerald-300/80 mt-0.5">
                        Ngoài Hiếu Hỷ &amp; Tiền ăn
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[155px] bg-[#1b2e1e] text-cyan-200 font-bold leading-tight whitespace-nowrap">
                      <div>Xem Phiếu Lương</div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={23} className="py-12 text-center text-slate-500">
                        Không có nhân viên phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map(({ staff, config }, idx) => (
                      <tr
                        key={staff.employeeId}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="py-2 px-2 text-center font-mono text-slate-400 border-r border-slate-800 sm:sticky sm:left-0 sm:z-10 bg-slate-950 group-hover:bg-slate-900">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-800 sm:sticky sm:left-[44px] sm:z-10 bg-slate-950 group-hover:bg-slate-900">
                          <div className="font-bold text-white truncate max-w-[165px]">
                            {staff.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {staff.department} · {staff.position}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-cyan-300 border-r border-slate-800 sm:sticky sm:left-[229px] sm:z-10 bg-slate-950 group-hover:bg-slate-900">
                          {staff.employeeId}
                        </td>

                        {SALARY_NUMERIC_FIELDS.map((field) => (
                          <td key={field.key} className="py-1.5 px-1.5 border-r border-slate-800">
                            <CurrencyInputCell
                              value={Number(config[field.key]) || 0}
                              onChange={(val) => handleFieldChange(config, field.key, val)}
                              masked={isAmountMasked}
                              accentClass={
                                field.key === 'basicSalary'
                                  ? 'text-cyan-200 font-bold'
                                  : 'text-slate-100'
                              }
                            />
                          </td>
                        ))}

                        <td className="py-1.5 px-1.5 border-r border-slate-800 bg-rose-950/10">
                          <CurrencyInputCell
                            value={Number(config.unionFee) || 0}
                            onChange={(val) => handleUnionFeeChange(config, val)}
                            masked={isAmountMasked}
                            accentClass="text-rose-300 font-semibold"
                          />
                        </td>

                        <td className="py-1.5 px-1.5 border-r border-slate-800 bg-orange-950/10">
                          <CurrencyInputCell
                            value={Number(config.personalIncomeTax) || 0}
                            onChange={(val) => handlePitThresholdChange(config, val)}
                            masked={isAmountMasked}
                            accentClass="text-orange-300 font-bold"
                          />
                          {!isAmountMasked && (Number(config.personalIncomeTax) || 0) > 0 && (
                            <div className="text-[9px] text-right font-mono text-orange-300/80 mt-0.5 pr-1">
                              {config.totalSalary > (Number(config.personalIncomeTax) || 0)
                                ? `10% vượt: ${formatVnd(
                                    calculatePitAboveThreshold(
                                      config.totalSalary,
                                      config.personalIncomeTax
                                    )
                                  )}đ`
                                : 'Chưa vượt mức'}
                            </div>
                          )}
                        </td>

                        <td className="py-1.5 px-1.5 border-r border-slate-800 bg-amber-950/10">
                          <CurrencyInputCell
                            value={Number(config.ovtInsuranceBase) || 0}
                            onChange={(val) => handleOvtBaseManualChange(config, val)}
                            masked={isAmountMasked}
                            accentClass="text-amber-300 font-bold"
                            isManual={Boolean(config.ovtInsuranceManual)}
                            onResetManual={() => handleResetOvtManual(config)}
                          />
                        </td>

                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-300 border-r border-slate-800 bg-emerald-950/15 whitespace-nowrap">
                          {isAmountMasked ? '•••••• ₫' : `${formatVnd(config.totalSalary)} ₫`}
                        </td>

                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenEmployeeSlip(staff, config)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold shadow-sm cursor-pointer transition-colors"
                            title={`Xem phiếu lương tháng ${selectedMonth}/${selectedYear} của ${staff.fullName}`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Xem phiếu lương</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                <tfoot className="bg-slate-950 border-t-2 border-emerald-700/60 font-mono text-[11px] sticky bottom-0 z-20">
                  <tr>
                    <td
                      colSpan={3}
                      className="py-2.5 px-3 font-sans font-bold text-emerald-300 uppercase border-r border-slate-800 sm:sticky sm:left-0 sm:z-30 bg-slate-950"
                    >
                      Tổng Cộng ({filteredRows.length} NV)
                    </td>
                    {SALARY_NUMERIC_FIELDS.map((field) => (
                      <td
                        key={field.key}
                        className="py-2.5 px-2 text-right font-bold text-slate-200 border-r border-slate-800 whitespace-nowrap"
                      >
                        {isAmountMasked ? '••••••' : formatVnd(columnTotals[field.key])}
                      </td>
                    ))}
                    <td className="py-2.5 px-2.5 text-right font-bold text-rose-300 border-r border-slate-800 whitespace-nowrap bg-rose-950/20">
                      {isAmountMasked ? '••••••' : formatVnd(columnTotals.unionFee)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-orange-300 border-r border-slate-800 whitespace-nowrap bg-orange-950/20">
                      {isAmountMasked ? '••••••' : formatVnd(columnTotals.personalIncomeTax)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-amber-300 border-r border-slate-800 whitespace-nowrap bg-amber-950/20">
                      {isAmountMasked ? '•••••• ₫' : `${formatVnd(columnTotals.ovtInsuranceBase)} ₫`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-300 border-r border-slate-800 whitespace-nowrap bg-emerald-950/25">
                      {isAmountMasked ? '•••••• ₫' : `${formatVnd(columnTotals.totalSalary)} ₫`}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans text-[10px] text-cyan-300">
                      T{selectedMonth}/{selectedYear}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Issued Salary Slips List */
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
          {filteredIssuedSlips.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              Chưa có phiếu lương nào được phát hành. Vui lòng xác nhận công và gửi phiếu lương từ tab{' '}
              <span className="text-cyan-400 font-semibold">Xác Nhận Công</span>.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredIssuedSlips.map((s) => (
                <div
                  key={s.id}
                  className="py-3 flex flex-wrap items-center justify-between gap-3 text-slate-300"
                >
                  <div>
                    <div className="font-bold text-white text-sm">
                      Tháng {s.month} ·{' '}
                      {s.attendanceSummary?.fullName || s.salaryConfig?.fullName || s.employeeId}{' '}
                      <span className="text-cyan-400 font-mono text-xs">({s.employeeId})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Cập nhật: {s.uploadDate}
                      {s.salaryConfig && (
                        <span className="text-emerald-400 ml-2">
                          · Tổng lương cấu hình:{' '}
                          {isAmountMasked ? '•••••• ₫' : `${formatVnd(s.salaryConfig.totalSalary)} ₫`}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenIssuedSlip(s)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem phiếu lương</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Official Monthly Salary Slip Modal */}
      {viewingSlipData && (
        <SalarySlipModal
          data={viewingSlipData}
          onClose={() => setViewingSlipData(null)}
        />
      )}
    </div>
  );
};
