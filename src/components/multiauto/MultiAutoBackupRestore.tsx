import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  ImportRecord, ExportRecord, ProductionHistoryRecord, MachineSetup, 
  NetDataRecord, StaffRecord, AccessoryRecord, AccessoryUsageRecord, Language 
} from '../../types';
import { 
  HardDriveDownload, HardDriveUpload, FileSpreadsheet, FileJson, 
  CheckCircle, AlertCircle, RefreshCw, Database, FileUp, Sparkles 
} from 'lucide-react';
import { 
  INITIAL_IMPORT_RECORDS, INITIAL_ACCESSORY_RECORDS, 
  INITIAL_NET_DATA, INITIAL_STAFF 
} from '../../data/initialData';

interface MultiAutoBackupRestoreProps {
  moduleName?: string;
  language?: Language;
  importData?: ImportRecord[];
  exportData?: ExportRecord[];
  historyData?: ProductionHistoryRecord[];
  machineData?: MachineSetup[];
  netData?: NetDataRecord[];
  staffData?: StaffRecord[];
  accessoryData?: AccessoryRecord[];
  accessoryUsage?: AccessoryUsageRecord[];
  productReturns?: any[];
  accessoryReturns?: any[];
  setImportData?: (d: any) => void;
  setExportData?: (d: any) => void;
  setHistoryData?: (d: any) => void;
  setMachineData?: (d: any) => void;
  setNetData?: (d: any) => void;
  setStaffData?: (d: any) => void;
  setAccessoryData?: (d: any) => void;
  setAccessoryUsage?: (d: any) => void;
  setProductReturns?: (d: any) => void;
  setAccessoryReturns?: (d: any) => void;
  setSalarySlips?: (d: any) => void;
  customData?: Record<string, { data: any[]; setter: (d: any[]) => void }>;
}

export const MultiAutoBackupRestore: React.FC<MultiAutoBackupRestoreProps> = ({
  moduleName = 'Multi Auto',
  importData = [],
  exportData = [],
  historyData = [],
  machineData = [],
  netData = [],
  staffData = [],
  accessoryData = [],
  setImportData,
  setExportData,
  setHistoryData,
  setMachineData,
  setNetData,
  setStaffData,
  setAccessoryData,
  customData
}) => {
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Export to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      if (importData.length > 0) {
        const wsImport = XLSX.utils.json_to_sheet(importData);
        XLSX.utils.book_append_sheet(wb, wsImport, 'NHAP_TP');
      }

      if (exportData.length > 0) {
        const wsExport = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, wsExport, 'XUAT_KHO');
      }

      if (historyData.length > 0) {
        const wsHistory = XLSX.utils.json_to_sheet(historyData);
        XLSX.utils.book_append_sheet(wb, wsHistory, 'HOAN_THANH_SX');
      }

      if (netData.length > 0) {
        const wsNet = XLSX.utils.json_to_sheet(netData);
        XLSX.utils.book_append_sheet(wb, wsNet, 'DATA_NET');
      }

      if (accessoryData.length > 0) {
        const wsAcc = XLSX.utils.json_to_sheet(accessoryData);
        XLSX.utils.book_append_sheet(wb, wsAcc, 'PHU_LIEU');
      }

      if (staffData.length > 0) {
        const wsStaff = XLSX.utils.json_to_sheet(staffData);
        XLSX.utils.book_append_sheet(wb, wsStaff, 'NHAN_SU');
      }

      if (customData) {
        Object.entries(customData).forEach(([sheetName, item]) => {
          if (item.data && item.data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(item.data);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
          }
        });
      }

      const fileName = `BACKUP_${moduleName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setStatusMessage({ type: 'success', text: `Đã xuất file sao lưu Excel thành công: ${fileName}` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Lỗi xuất file Excel: ${err.message}` });
    }
  };

  // 2. Export to JSON
  const handleExportJson = () => {
    try {
      const backupObj = {
        moduleName,
        exportDate: new Date().toISOString(),
        importData,
        exportData,
        historyData,
        netData,
        staffData,
        accessoryData,
        machineData,
        custom: customData ? Object.fromEntries(Object.entries(customData).map(([k, v]) => [k, v.data])) : undefined
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `BACKUP_${moduleName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setStatusMessage({ type: 'success', text: 'Đã xuất file sao lưu JSON thành công.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Lỗi xuất JSON: ${err.message}` });
    }
  };

  // 3. Import & Restore from File (Excel or JSON)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage(null);

    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);

          let restoredCount = 0;
          if (parsed.importData && setImportData) { setImportData(parsed.importData); restoredCount++; }
          if (parsed.exportData && setExportData) { setExportData(parsed.exportData); restoredCount++; }
          if (parsed.historyData && setHistoryData) { setHistoryData(parsed.historyData); restoredCount++; }
          if (parsed.netData && setNetData) { setNetData(parsed.netData); restoredCount++; }
          if (parsed.staffData && setStaffData) { setStaffData(parsed.staffData); restoredCount++; }
          if (parsed.accessoryData && setAccessoryData) { setAccessoryData(parsed.accessoryData); restoredCount++; }
          if (parsed.machineData && setMachineData) { setMachineData(parsed.machineData); restoredCount++; }

          if (parsed.custom && customData) {
            Object.entries(parsed.custom).forEach(([key, val]) => {
              if (customData[key]) {
                customData[key].setter(val as any[]);
              }
            });
          }

          setStatusMessage({ type: 'success', text: `Khôi phục thành công từ file JSON! Đã nạp lại ${restoredCount} danh mục dữ liệu.` });
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: `Lỗi đọc file JSON: ${err.message}` });
        } finally {
          setIsProcessing(false);
          e.target.value = '';
        }
      };
      reader.readAsText(file);
    } else {
      // Excel File (.xlsx, .xls)
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          let restoredSheets: string[] = [];

          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            const normSheet = sheetName.toUpperCase().trim();

            if ((normSheet === 'NHAP_TP' || normSheet === 'NHAP_KHO' || normSheet === 'TP') && setImportData) {
              setImportData(jsonData);
              restoredSheets.push('Nhập TP');
            } else if ((normSheet === 'XUAT_KHO' || normSheet === 'XUAT_TP') && setExportData) {
              setExportData(jsonData);
              restoredSheets.push('Xuất kho');
            } else if ((normSheet === 'HOAN_THANH_SX' || normSheet === 'HOAN_THANH' || normSheet === 'LICH_SU') && setHistoryData) {
              setHistoryData(jsonData);
              restoredSheets.push('Lịch sử SX');
            } else if ((normSheet === 'DATA_NET' || normSheet === 'NET_DATA' || normSheet === 'DINH_MUC') && setNetData) {
              setNetData(jsonData);
              restoredSheets.push('Data Net');
            } else if ((normSheet === 'PHU_LIEU' || normSheet === 'NHAP_PL' || normSheet === 'ACC') && setAccessoryData) {
              setAccessoryData(jsonData);
              restoredSheets.push('Phụ liệu');
            } else if ((normSheet === 'NHAN_SU' || normSheet === 'NHAN_VIEN' || normSheet === 'STAFF') && setStaffData) {
              setStaffData(jsonData);
              restoredSheets.push('Nhân sự');
            } else if (customData && customData[normSheet]) {
              customData[normSheet].setter(jsonData);
              restoredSheets.push(normSheet);
            }
          });

          setStatusMessage({ 
            type: 'success', 
            text: `Khôi phục thành công ${restoredSheets.length} bảng dữ liệu từ file Excel: [${restoredSheets.join(', ')}]` 
          });
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

  // 4. One-click restore standard demo data
  const handleRestoreSampleData = () => {
    if (setImportData) setImportData(INITIAL_IMPORT_RECORDS);
    if (setAccessoryData) setAccessoryData(INITIAL_ACCESSORY_RECORDS);
    if (setNetData) setNetData(INITIAL_NET_DATA);
    if (setStaffData) setStaffData(INITIAL_STAFF);
    setStatusMessage({ type: 'success', text: 'Đã nạp lại bộ dữ liệu chuẩn của nhà máy thành công!' });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <HardDriveDownload className="w-5 h-5 text-teal-400" />
          <span>Sao Lưu & Khôi Phục Dữ Liệu ({moduleName})</span>
        </h2>
        <p className="text-xs text-slate-400">
          Xuất và nạp lại toàn bộ dữ liệu sản xuất, phụ liệu, định mức và nhân sự qua file Excel (.xlsx) hoặc JSON.
        </p>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' 
            : 'bg-red-950/40 border-red-800 text-red-300'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phần 1: Xuất dữ liệu sao lưu */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <HardDriveUpload className="w-4 h-4 text-cyan-400" />
            <span>1. Xuất Dữ Liệu Sao Lưu (Backup)</span>
          </div>
          <p className="text-xs text-slate-400">
            Tải về toàn bộ các bảng dữ liệu hiện tại để lưu trữ an toàn hoặc chuyển sang máy khác.
          </p>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleExportExcel}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Xuất File Excel Đầy Đủ (.xlsx)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Nhiều Sheet</span>
            </button>

            <button
              onClick={handleExportJson}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileJson className="w-4 h-4 text-amber-400" />
                <span>Xuất File Backup JSON (.json)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Bản sao lưu gốc</span>
            </button>
          </div>
        </div>

        {/* Phần 2: Khôi phục dữ liệu từ file */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <HardDriveDownload className="w-4 h-4 text-teal-400" />
            <span>2. Khôi Phục Dữ Liệu Từ File (Restore)</span>
          </div>
          <p className="text-xs text-slate-400">
            Chọn file sao lưu Excel (.xlsx) hoặc JSON để nạp đè dữ liệu vào ứng dụng.
          </p>

          <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-950/40">
            <FileUp className="w-8 h-8 text-cyan-400" />
            <div className="text-xs font-semibold text-slate-200 text-center">
              Bấm vào đây để chọn file backup (.xlsx hoặc .json)
            </div>
            <div className="text-[10px] text-slate-500">
              Hỗ trợ file Excel các sheet: NHAP_TP, XUAT_KHO, HOAN_THANH, DATA_NET, PHU_LIEU
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

      {/* Phần 3: Nạp nhanh dữ liệu chuẩn */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-600/20 text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white text-xs">Nạp Lại Dữ Liệu Mẫu Chuẩn Nhà Máy</div>
            <div className="text-[11px] text-slate-400">
              Khôi phục lại danh sách các model Samsung, Apple, Xiaomi và ca sản xuất mẫu.
            </div>
          </div>
        </div>

        <button
          onClick={handleRestoreSampleData}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
        >
          Nạp Dữ Liệu Chuẩn
        </button>
      </div>
    </div>
  );
};
