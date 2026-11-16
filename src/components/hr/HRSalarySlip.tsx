import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AttendanceConfirmationRecord,
  EmployeeSalaryConfig,
  SalarySlipRecord,
  StaffRecord,
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
  Users,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  FileText,
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
} from '../../lib/salaryConfig';
import { SalarySlipModal } from './SalarySlipModal';

interface HRSalarySlipProps {
  salarySlips: SalarySlipRecord[];
  setSalarySlips: (s: SalarySlipRecord[]) => void;
  allStaff: StaffRecord[];
  salaryConfigs: EmployeeSalaryConfig[];
  setSalaryConfigs: (configs: EmployeeSalaryConfig[]) => void;
  attendanceConfirmations?: AttendanceConfirmationRecord[];
}

interface CurrencyInputCellProps {
  value: number;
  onChange: (val: number) => void;
  accentClass?: string;
  placeholder?: string;
  isManual?: boolean;
  onResetManual?: () => void;
}

const CurrencyInputCell: React.FC<CurrencyInputCellProps> = ({
  value,
  onChange,
  accentClass = 'text-slate-100',
  placeholder = '0',
  isManual,
  onResetManual,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const handleFocus = () => {
    setIsEditing(true);
    setDraft(value > 0 ? String(value) : '');
  };

  const handleBlur = () => {
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
      'Tổng lương tính OVT và BH',
      'Tổng lương',
    ];

    const data = filteredRows.map(({ config }) => [
      config.fullName,
      config.employeeId,
      ...SALARY_NUMERIC_FIELDS.map((f) => Number(config[f.key]) || 0),
      Number(config.ovtInsuranceBase) || 0,
      Number(config.totalSalary) || 0,
    ]);

    const summaryRow = [
      `TỔNG CỘNG (${filteredRows.length} NV)`,
      '',
      ...SALARY_NUMERIC_FIELDS.map((f) => columnTotals[f.key] || 0),
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

  return (
    <div className="p-3 sm:p-6 max-w-[100vw] space-y-4">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center gap-2 uppercase tracking-wide">
              <span>Cấu Hình Phiếu Lương &amp; Phụ Cấp Nhân Viên</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                {allStaff.length} Nhân viên
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Thiết lập lương cơ bản, các khoản phụ cấp, trợ cấp, thưởng và tổng lương tính OVT &amp; BH.
            </p>
          </div>
        </div>

        {/* Month Selector & Mode Switcher */}
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

          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSubTab('CONFIG')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
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

      {toastMsg && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Search & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên, mã NV..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 w-48 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {subTab === 'CONFIG' && (
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-hidden"
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFormulaBar((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Nhập Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Xuất Excel</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
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
                {formatVnd(columnTotals.ovtInsuranceBase)}{' '}
                <span className="text-xs font-sans font-normal text-amber-400/80">VNĐ</span>
              </div>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-700/50 p-3.5 rounded-xl">
              <div className="text-[10px] text-emerald-300 uppercase font-semibold">
                Tổng Lương
              </div>
              <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">
                {formatVnd(columnTotals.totalSalary)}{' '}
                <span className="text-xs font-sans font-normal text-emerald-400/80">VNĐ</span>
              </div>
            </div>
          </div>

          {/* 18-Column Salary Configuration Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="w-full overflow-x-auto overflow-y-auto custom-scrollbar max-h-[65vh]">
              <table className="w-full min-w-[2420px] text-left text-xs border-collapse">
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
                      </th>
                    ))}
                    <th className="py-2.5 px-2.5 text-center border-r border-emerald-800/60 min-w-[148px] bg-[#213824] text-amber-200 font-bold leading-tight">
                      <div>Tổng lương tính OVT và BH</div>
                    </th>
                    <th className="py-2.5 px-2.5 text-center border-r border-emerald-800/60 min-w-[138px] bg-[#244028] text-emerald-200 font-bold leading-tight">
                      <div>Tổng lương</div>
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[155px] bg-[#1b2e1e] text-cyan-200 font-bold leading-tight whitespace-nowrap">
                      <div>Xem Phiếu Lương</div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={21} className="py-12 text-center text-slate-500">
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
                              accentClass={
                                field.key === 'basicSalary'
                                  ? 'text-cyan-200 font-bold'
                                  : 'text-slate-100'
                              }
                            />
                          </td>
                        ))}

                        <td className="py-1.5 px-1.5 border-r border-slate-800 bg-amber-950/10">
                          <CurrencyInputCell
                            value={Number(config.ovtInsuranceBase) || 0}
                            onChange={(val) => handleOvtBaseManualChange(config, val)}
                            accentClass="text-amber-300 font-bold"
                            isManual={Boolean(config.ovtInsuranceManual)}
                            onResetManual={() => handleResetOvtManual(config)}
                          />
                        </td>

                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-300 border-r border-slate-800 bg-emerald-950/15 whitespace-nowrap">
                          {formatVnd(config.totalSalary)} ₫
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
                        {formatVnd(columnTotals[field.key])}
                      </td>
                    ))}
                    <td className="py-2.5 px-2.5 text-right font-bold text-amber-300 border-r border-slate-800 whitespace-nowrap bg-amber-950/20">
                      {formatVnd(columnTotals.ovtInsuranceBase)} ₫
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-300 border-r border-slate-800 whitespace-nowrap bg-emerald-950/25">
                      {formatVnd(columnTotals.totalSalary)} ₫
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
                          · Tổng lương cấu hình: {formatVnd(s.salaryConfig.totalSalary)} ₫
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
