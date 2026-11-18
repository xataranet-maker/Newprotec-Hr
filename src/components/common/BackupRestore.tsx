import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AttendanceRecord, AttendanceStatus, Language, StaffRecord } from '../../types';
import {
  exportFlatAttendanceBackupRows,
  getAllStoredMatrixSnapshots,
  parseBackupDateToIso,
  restoreFlatAttendanceBackupRows,
  restoreStoredMatrixSnapshots,
} from '../../lib/matrixTimekeeping';
import {
  HardDriveDownload,
  HardDriveUpload,
  FileSpreadsheet,
  FileJson,
  CheckCircle,
  AlertCircle,
  FileUp,
  Table2,
  Users,
  CalendarCheck,
} from 'lucide-react';

export const STAFF_BACKUP_HEADERS = [
  'hometown',
  'workUnit',
  'id',
  'position',
  'dateJoined',
  'attendance',
  'phone',
  'shift',
  'fullName',
  'department',
  'dob',
  'employeeId',
  'avatarUrl',
  'isLocked',
] as const;

export const ATTENDANCE_BACKUP_HEADERS = [
  'employeeId',
  'note',
  'shift',
  'date',
  'id',
  'status',
  'overtime',
  'lateIn',
  'manualOut',
  'earlyIn',
  'manualIn',
  'sundayNightOT',
  'sundayDayOT',
  'earlyOut',
] as const;

interface BackupRestoreProps {
  moduleName?: string;
  language?: Language;
  staffRecords?: StaffRecord[];
  hrStaff?: StaffRecord[];
  onRestoreStaff?: (multiStaff: StaffRecord[], hrStaff: StaffRecord[]) => void;
  attendanceHistory?: AttendanceRecord[];
  onRestoreAttendance?: (records: AttendanceRecord[]) => void;
  customData?: Record<string, { data: any[]; setter: (d: any[]) => void }>;
}

function normalizeRowKeys(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  Object.entries(row).forEach(([k, v]) => {
    out[k.trim().toLowerCase()] = v;
  });
  return out;
}

function pickField(normRow: Record<string, any>, ...keys: string[]): any {
  for (const k of keys) {
    const val = normRow[k.toLowerCase()];
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return '';
}

function parseBooleanLock(val: any): boolean | undefined {
  if (val === '' || val === undefined || val === null) return undefined;
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toUpperCase();
  if (s === 'TRUE' || s === '1' || s === 'YES' || s === 'ĐÃ KHÓA' || s === 'NGHỈ VIỆC') return true;
  if (s === 'FALSE' || s === '0' || s === 'NO') return false;
  return undefined;
}

function parseNumericId(raw: any, fallback: number, usedIds: Set<number>): number {
  let num = NaN;
  if (typeof raw === 'number') {
    num = raw;
  } else if (raw !== undefined && raw !== null && raw !== '') {
    const cleaned = String(raw).trim().replace(',', '.');
    num = Number(cleaned);
  }
  if (!Number.isFinite(num) || num <= 0) {
    num = fallback;
  }
  let candidate = Math.round(num);
  while (usedIds.has(candidate)) {
    candidate += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function parsePhoneString(raw: any): string {
  if (raw === undefined || raw === null || raw === '') return '';
  if (typeof raw === 'number') {
    const digits = String(Math.trunc(raw));
    if (digits.length === 9 && /^[35789]/.test(digits)) {
      return `0${digits}`;
    }
    return digits;
  }
  return String(raw).trim().replace(/^'+/, '');
}

function normalizeStaffRowsForRestore(rawRows: Record<string, any>[]): {
  multiStaff: StaffRecord[];
  hrStaff: StaffRecord[];
} {
  const multiStaff: StaffRecord[] = [];
  const hrStaff: StaffRecord[] = [];
  const usedIds = new Set<number>();
  const seenEmpIds = new Set<string>();
  const baseTs = Date.now();

  rawRows.forEach((raw, idx) => {
    const norm = normalizeRowKeys(raw);
    const employeeId = String(pickField(norm, 'employeeid', 'mã nv', 'ma nv', 'manv')).trim();
    const fullName = String(pickField(norm, 'fullname', 'họ tên', 'ho ten', 'họ và tên', 'ten')).trim();
    if (!employeeId && !fullName) return;

    const dedupKey = (employeeId || fullName).toLowerCase();
    if (seenEmpIds.has(dedupKey)) return;
    seenEmpIds.add(dedupKey);

    const departmentRaw = String(pickField(norm, 'department', 'bộ phận', 'bo phan', 'workunit') || 'MULTI').trim();
    const workUnitRaw = String(pickField(norm, 'workunit', 'đơn vị', 'don vi') || departmentRaw || 'MULTI').trim();
    const shiftRaw = String(pickField(norm, 'shift', 'ca') || 'DAY')
      .trim()
      .toUpperCase();
    const shift: 'DAY' | 'NIGHT' =
      shiftRaw === 'NIGHT' || shiftRaw === 'ĐÊM' || shiftRaw === 'CA ĐÊM' ? 'NIGHT' : 'DAY';

    const parsedDate = parseBackupDateToIso(pickField(norm, 'datejoined', 'ngày vào', 'ngay vao'));
    const rawDateJoined = String(pickField(norm, 'datejoined', 'ngày vào', 'ngay vao') || '').trim();
    const dateJoined = parsedDate ? parsedDate.iso : rawDateJoined || new Date().toISOString().split('T')[0];

    const parsedDob = parseBackupDateToIso(pickField(norm, 'dob', 'ngày sinh', 'ngay sinh'));
    const rawDob = String(pickField(norm, 'dob', 'ngày sinh', 'ngay sinh') || '').trim();
    const dob = parsedDob ? parsedDob.iso : rawDob;

    const attendanceRaw = String(pickField(norm, 'attendance', 'trạng thái') || 'UNMARKED').trim();
    const isLocked = parseBooleanLock(norm['islocked']);

    const staffItem: StaffRecord = {
      id: parseNumericId(norm['id'], baseTs + idx, usedIds),
      employeeId: employeeId || `NV_${baseTs + idx}`,
      fullName: fullName || employeeId,
      position: String(pickField(norm, 'position', 'chức vụ', 'chuc vu') || 'OP').trim(),
      dateJoined,
      dob,
      hometown: String(pickField(norm, 'hometown', 'quê quán', 'que quan') || '').trim(),
      phone: parsePhoneString(pickField(norm, 'phone', 'sđt', 'sdt', 'điện thoại')),
      attendance: (attendanceRaw || 'UNMARKED') as AttendanceStatus,
      shift,
      department: departmentRaw || 'MULTI',
      workUnit: workUnitRaw || departmentRaw || 'MULTI',
      avatarUrl: String(pickField(norm, 'avatarurl') || '').trim(),
      ...(isLocked !== undefined ? { isLocked } : {}),
    };

    if ((staffItem.department || '').toUpperCase() === 'HR') {
      hrStaff.push(staffItem);
    } else {
      multiStaff.push(staffItem);
    }
  });

  return { multiStaff, hrStaff };
}

function buildStaffExportRows(allStaff: StaffRecord[]): Record<string, any>[] {
  return allStaff.map((s) => {
    const parsedJoin = parseBackupDateToIso(s.dateJoined);
    const parsedDob = parseBackupDateToIso(s.dob);
    return {
      hometown: s.hometown || '',
      workUnit: s.workUnit || s.department || 'MULTI',
      id: s.id,
      position: s.position || '',
      dateJoined: parsedJoin ? parsedJoin.iso : s.dateJoined || '',
      attendance: s.attendance || 'UNMARKED',
      phone: s.phone || '',
      shift: s.shift || 'DAY',
      fullName: s.fullName || '',
      department: s.department || s.workUnit || 'MULTI',
      dob: parsedDob ? parsedDob.iso : s.dob || '',
      employeeId: s.employeeId || '',
      avatarUrl: s.avatarUrl || '',
      isLocked: s.isLocked === undefined ? '' : s.isLocked,
    };
  });
}

function isStaffSheetHeaders(normHeaders: Set<string>, sheetNameUpper: string): boolean {
  if (normHeaders.has('employeeid') && normHeaders.has('fullname')) return true;
  return (
    sheetNameUpper === 'NHAN_VIEN' ||
    sheetNameUpper === 'NHANVIEN' ||
    sheetNameUpper === 'STAFF' ||
    sheetNameUpper === 'MULTI_STAFF' ||
    sheetNameUpper === 'HR_STAFF'
  );
}

function isAttendanceSheetHeaders(normHeaders: Set<string>, sheetNameUpper: string): boolean {
  if (
    normHeaders.has('employeeid') &&
    normHeaders.has('date') &&
    (normHeaders.has('status') ||
      normHeaders.has('overtime') ||
      normHeaders.has('sundaydayot') ||
      normHeaders.has('manualin') ||
      normHeaders.has('latein'))
  ) {
    return true;
  }
  return sheetNameUpper === 'CHAM_CONG' || sheetNameUpper === 'CHAMCONG' || sheetNameUpper === 'ATTENDANCE';
}

export const BackupRestore: React.FC<BackupRestoreProps> = ({
  moduleName = 'HC & NS',
  staffRecords = [],
  hrStaff = [],
  onRestoreStaff,
  attendanceHistory = [],
  onRestoreAttendance,
  customData,
}) => {
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const combinedStaff = useMemo(() => [...staffRecords, ...hrStaff], [staffRecords, hrStaff]);

  const flatAttendancePreviewCount = useMemo(
    () => exportFlatAttendanceBackupRows(combinedStaff, attendanceHistory).length,
    [combinedStaff, attendanceHistory]
  );

  const extraCustomEntries = useMemo(() => {
    if (!customData) return [];
    const skipLegacyStaff = Boolean(onRestoreStaff);
    return Object.entries(customData).filter(([key]) => {
      if (skipLegacyStaff && (key === 'MULTI_STAFF' || key === 'HR_STAFF')) return false;
      return true;
    });
  }, [customData, onRestoreStaff]);

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      let sheetCount = 0;

      // Sheet 1: NHAN_VIEN (Ảnh 1)
      const staffExportRows = buildStaffExportRows(combinedStaff);
      const wsStaff = XLSX.utils.json_to_sheet(staffExportRows, {
        header: [...STAFF_BACKUP_HEADERS],
      });
      XLSX.utils.book_append_sheet(wb, wsStaff, 'NHAN_VIEN');
      sheetCount++;

      // Sheet 2: CHAM_CONG (Ảnh 2)
      const attendanceExportRows = exportFlatAttendanceBackupRows(combinedStaff, attendanceHistory);
      const wsAttendance = XLSX.utils.json_to_sheet(attendanceExportRows, {
        header: [...ATTENDANCE_BACKUP_HEADERS],
      });
      XLSX.utils.book_append_sheet(wb, wsAttendance, 'CHAM_CONG');
      sheetCount++;

      // Các sheet hành chính - nhân sự bổ sung
      extraCustomEntries.forEach(([sheetName, item]) => {
        if (item.data && item.data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(item.data);
          XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
          sheetCount++;
        }
      });

      const fileName = `BACKUP_${moduleName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setStatusMessage({
        type: 'success',
        text: `Đã xuất file sao lưu Excel thành công: ${fileName} (${sheetCount} sheet — Sheet 1: NHAN_VIEN [${staffExportRows.length} dòng], Sheet 2: CHAM_CONG [${attendanceExportRows.length} dòng]).`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Lỗi xuất file Excel: ${err.message}` });
    }
  };

  const handleExportJson = () => {
    try {
      const staffExportRows = buildStaffExportRows(combinedStaff);
      const attendanceExportRows = exportFlatAttendanceBackupRows(combinedStaff, attendanceHistory);

      const backupObj = {
        moduleName,
        version: 2,
        exportDate: new Date().toISOString(),
        NHAN_VIEN: staffExportRows,
        CHAM_CONG: attendanceExportRows,
        matrixSnapshots: getAllStoredMatrixSnapshots(),
        custom: Object.fromEntries(extraCustomEntries.map(([k, v]) => [k, v.data])),
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `BACKUP_${moduleName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setStatusMessage({
        type: 'success',
        text: `Đã xuất file sao lưu JSON thành công (${staffExportRows.length} nhân viên, ${attendanceExportRows.length} dòng chấm công).`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Lỗi xuất JSON: ${err.message}` });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage(null);

    const reader = new FileReader();

    if (file.name.toLowerCase().endsWith('.json')) {
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          const restoredParts: string[] = [];

          let latestCombinedStaff = combinedStaff;

          // 1. Khôi phục nhân viên (ưu tiên chuẩn NHAN_VIEN, hỗ trợ fallback legacy MULTI_STAFF / HR_STAFF)
          if (Array.isArray(parsed.NHAN_VIEN) && onRestoreStaff) {
            const { multiStaff, hrStaff: restoredHr } = normalizeStaffRowsForRestore(parsed.NHAN_VIEN);
            onRestoreStaff(multiStaff, restoredHr);
            latestCombinedStaff = [...multiStaff, ...restoredHr];
            restoredParts.push(`NHAN_VIEN (${latestCombinedStaff.length})`);
          } else if (parsed.custom && onRestoreStaff) {
            const legacyMulti = Array.isArray(parsed.custom.MULTI_STAFF) ? parsed.custom.MULTI_STAFF : null;
            const legacyHr = Array.isArray(parsed.custom.HR_STAFF) ? parsed.custom.HR_STAFF : null;
            if (legacyMulti || legacyHr) {
              const normMulti = legacyMulti ? normalizeStaffRowsForRestore(legacyMulti).multiStaff : staffRecords;
              const normHr = legacyHr ? normalizeStaffRowsForRestore(legacyHr).hrStaff : hrStaff;
              onRestoreStaff(normMulti, normHr);
              latestCombinedStaff = [...normMulti, ...normHr];
              restoredParts.push(`NHAN_VIEN (${latestCombinedStaff.length})`);
            }
          }

          // 2. Khôi phục snapshot ma trận gốc nếu có
          if (parsed.matrixSnapshots) {
            restoreStoredMatrixSnapshots(parsed.matrixSnapshots);
          }

          // 3. Khôi phục dữ liệu chấm công phẳng (CHAM_CONG) & đồng bộ lên Bảng công ma trận
          if (Array.isArray(parsed.CHAM_CONG)) {
            const attResult = restoreFlatAttendanceBackupRows(parsed.CHAM_CONG, latestCombinedStaff);
            if (onRestoreAttendance) {
              onRestoreAttendance(attResult.attendanceHistory);
            }
            restoredParts.push(`CHAM_CONG (${attResult.restoredCount})`);
          }

          // 4. Khôi phục các danh mục HC&NS khác
          if (parsed.custom && customData) {
            Object.entries(parsed.custom).forEach(([key, val]) => {
              if (onRestoreStaff && (key === 'MULTI_STAFF' || key === 'HR_STAFF')) return;
              if (customData[key] && Array.isArray(val)) {
                customData[key].setter(val);
                restoredParts.push(key);
              }
            });
          }

          setStatusMessage({
            type: 'success',
            text: `Khôi phục thành công từ file JSON: ${restoredParts.join(', ') || '0 danh mục'}.`,
          });
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: `Lỗi đọc file JSON: ${err.message}` });
        } finally {
          setIsProcessing(false);
          e.target.value = '';
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          const staffRawBuckets: Record<string, any>[] = [];
          const attendanceRawBuckets: Record<string, any>[] = [];
          const otherSheets: { normSheet: string; rows: Record<string, any>[] }[] = [];

          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
              defval: '',
              raw: true,
            });
            if (!jsonData || jsonData.length === 0) return;

            const normHeaders = new Set<string>();
            jsonData.slice(0, 5).forEach((row) => {
              Object.keys(row).forEach((k) => normHeaders.add(k.trim().toLowerCase()));
            });
            const normSheet = sheetName.toUpperCase().trim();

            if (isStaffSheetHeaders(normHeaders, normSheet)) {
              staffRawBuckets.push(...jsonData);
            } else if (isAttendanceSheetHeaders(normHeaders, normSheet)) {
              attendanceRawBuckets.push(...jsonData);
            } else {
              otherSheets.push({ normSheet, rows: jsonData });
            }
          });

          const restoredSummary: string[] = [];
          let latestCombinedStaff = combinedStaff;

          // Bước 1: Khôi phục Sheet nhân viên trước để lấy danh sách staff mới nhất
          if (staffRawBuckets.length > 0 && onRestoreStaff) {
            const { multiStaff, hrStaff: restoredHr } = normalizeStaffRowsForRestore(staffRawBuckets);
            onRestoreStaff(multiStaff, restoredHr);
            latestCombinedStaff = [...multiStaff, ...restoredHr];
            restoredSummary.push(`NHAN_VIEN (${latestCombinedStaff.length} NV)`);
          } else if (staffRawBuckets.length > 0 && customData) {
            const { multiStaff, hrStaff: restoredHr } = normalizeStaffRowsForRestore(staffRawBuckets);
            if (customData.MULTI_STAFF) customData.MULTI_STAFF.setter(multiStaff);
            if (customData.HR_STAFF) customData.HR_STAFF.setter(restoredHr);
            latestCombinedStaff = [...multiStaff, ...restoredHr];
            restoredSummary.push(`NHAN_VIEN (${latestCombinedStaff.length} NV)`);
          }

          // Bước 2: Khôi phục Sheet chấm công & đồng bộ trực tiếp vào Matrix + AttendanceHistory
          if (attendanceRawBuckets.length > 0) {
            const attResult = restoreFlatAttendanceBackupRows(attendanceRawBuckets, latestCombinedStaff);
            if (onRestoreAttendance) {
              onRestoreAttendance(attResult.attendanceHistory);
            }
            const monthLabel =
              attResult.restoredMonths.length > 0 ? ` — Tháng ${attResult.restoredMonths.join(', ')}` : '';
            restoredSummary.push(`CHAM_CONG (${attResult.restoredCount} dòng${monthLabel})`);
          }

          // Bước 3: Khôi phục các sheet HC&NS bổ sung khác
          otherSheets.forEach(({ normSheet, rows }) => {
            if (customData && customData[normSheet]) {
              customData[normSheet].setter(rows);
              restoredSummary.push(`${normSheet} (${rows.length})`);
            }
          });

          if (restoredSummary.length === 0) {
            setStatusMessage({
              type: 'error',
              text: 'Không tìm thấy sheet dữ liệu hợp lệ (cần sheet NHAN_VIEN / CHAM_CONG hoặc cột chuẩn tương ứng).',
            });
          } else {
            setStatusMessage({
              type: 'success',
              text: `Khôi phục thành công từ Excel: ${restoredSummary.join(' | ')}. Dữ liệu bảng công, hồ sơ và phiếu lương đã được đồng bộ.`,
            });
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: `Lỗi xử lý file Excel: ${err.message}` });
        } finally {
          setIsProcessing(false);
          e.target.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800 px-7 sm:px-0 text-center sm:text-left">
        <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <HardDriveDownload className="w-5 h-5 text-teal-400 shrink-0" />
          <span>Sao Lưu &amp; Khôi Phục Dữ Liệu ({moduleName})</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Xuất và nạp lại dữ liệu chuẩn 2 sheet: Sheet 1 (Dữ liệu nhân viên) &amp; Sheet 2 (Dữ liệu chấm công), kèm các bảng hợp đồng, phiếu lương và hành chính qua Excel (.xlsx) hoặc JSON.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-red-950/40 border-red-800 text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Cấu trúc 2 sheet chuẩn */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <Users className="w-4 h-4" />
              <span>Sheet 1: NHAN_VIEN (Dữ liệu nhân viên)</span>
            </div>
            <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
              {combinedStaff.length} nhân viên
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono leading-relaxed break-all bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
            {STAFF_BACKUP_HEADERS.join(' | ')}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
              <CalendarCheck className="w-4 h-4" />
              <span>Sheet 2: CHAM_CONG (Dữ liệu chấm công)</span>
            </div>
            <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
              {flatAttendancePreviewCount} dòng công
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono leading-relaxed break-all bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
            {ATTENDANCE_BACKUP_HEADERS.join(' | ')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <HardDriveUpload className="w-4 h-4 text-cyan-400" />
            <span>1. Xuất Dữ Liệu Sao Lưu (Backup)</span>
          </div>
          <p className="text-xs text-slate-400">
            Xuất file Excel gồm Sheet 1 (NHAN_VIEN), Sheet 2 (CHAM_CONG) đúng thứ tự cột chuẩn và các bảng dữ liệu nhân sự liên quan.
          </p>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleExportExcel}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Xuất File Excel Chuẩn (.xlsx)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">NHAN_VIEN + CHAM_CONG</span>
            </button>

            <button
              onClick={handleExportJson}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileJson className="w-4 h-4 text-amber-400" />
                <span>Xuất File Backup JSON (.json)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Bản sao lưu đầy đủ</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <HardDriveDownload className="w-4 h-4 text-teal-400" />
            <span>2. Khôi Phục Dữ Liệu Từ File (Restore)</span>
          </div>
          <p className="text-xs text-slate-400">
            Tự động nhận diện 2 sheet nhân viên &amp; chấm công từ file Excel (.xlsx/.xls) bất kể tên sheet (Sheet1/Sheet2 hoặc NHAN_VIEN/CHAM_CONG) hoặc file JSON.
          </p>

          <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-950/40">
            <FileUp className="w-8 h-8 text-cyan-400" />
            <div className="text-xs font-semibold text-slate-200 text-center">
              Bấm vào đây để chọn file backup (.xlsx, .xls hoặc .json)
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Table2 className="w-3.5 h-3.5" />
              <span>Tự động đồng bộ vào Bảng chấm công, Dữ liệu công &amp; Hồ sơ</span>
            </div>
            <input
              type="file"
              accept=".xlsx, .xls, .json"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
