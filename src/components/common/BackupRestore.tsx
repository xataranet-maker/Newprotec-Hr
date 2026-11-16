import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Language } from '../../types';
import {
  HardDriveDownload,
  HardDriveUpload,
  FileSpreadsheet,
  FileJson,
  CheckCircle,
  AlertCircle,
  FileUp,
} from 'lucide-react';

interface BackupRestoreProps {
  moduleName?: string;
  language?: Language;
  customData?: Record<string, { data: any[]; setter: (d: any[]) => void }>;
}

export const BackupRestore: React.FC<BackupRestoreProps> = ({
  moduleName = 'HC & NS',
  customData,
}) => {
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      let sheetCount = 0;

      if (customData) {
        Object.entries(customData).forEach(([sheetName, item]) => {
          if (item.data && item.data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(item.data);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            sheetCount++;
          }
        });
      }

      if (sheetCount === 0) {
        const ws = XLSX.utils.json_to_sheet([{ Note: 'Chưa có dữ liệu phát sinh' }]);
        XLSX.utils.book_append_sheet(wb, ws, 'INFO');
      }

      const fileName = `BACKUP_${moduleName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setStatusMessage({ type: 'success', text: `Đã xuất file sao lưu Excel thành công: ${fileName}` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Lỗi xuất file Excel: ${err.message}` });
    }
  };

  const handleExportJson = () => {
    try {
      const backupObj = {
        moduleName,
        exportDate: new Date().toISOString(),
        custom: customData ? Object.fromEntries(Object.entries(customData).map(([k, v]) => [k, v.data])) : undefined,
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

          if (parsed.custom && customData) {
            Object.entries(parsed.custom).forEach(([key, val]) => {
              if (customData[key] && Array.isArray(val)) {
                customData[key].setter(val);
                restoredCount++;
              }
            });
          }

          setStatusMessage({ type: 'success', text: `Khôi phục thành công từ file JSON (${restoredCount} danh mục dữ liệu).` });
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
          const restoredSheets: string[] = [];

          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            const normSheet = sheetName.toUpperCase().trim();
            if (customData && customData[normSheet]) {
              customData[normSheet].setter(jsonData);
              restoredSheets.push(normSheet);
            }
          });

          setStatusMessage({
            type: 'success',
            text: `Khôi phục thành công ${restoredSheets.length} bảng dữ liệu từ file Excel.`,
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800 px-7 sm:px-0 text-center sm:text-left">
        <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <HardDriveDownload className="w-5 h-5 text-teal-400 shrink-0" />
          <span>Sao Lưu &amp; Khôi Phục Dữ Liệu ({moduleName})</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Xuất và nạp lại dữ liệu nhân sự, bảng công, hợp đồng, phiếu lương và hành chính qua Excel (.xlsx) hoặc JSON.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <HardDriveUpload className="w-4 h-4 text-cyan-400" />
            <span>1. Xuất Dữ Liệu Sao Lưu (Backup)</span>
          </div>
          <p className="text-xs text-slate-400">
            Tải về các bảng dữ liệu hiện tại để lưu trữ an toàn hoặc chuyển sang thiết bị khác.
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

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <HardDriveDownload className="w-4 h-4 text-teal-400" />
            <span>2. Khôi Phục Dữ Liệu Từ File (Restore)</span>
          </div>
          <p className="text-xs text-slate-400">
            Chọn file sao lưu Excel (.xlsx) hoặc JSON để nạp lại dữ liệu vào ứng dụng.
          </p>

          <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-950/40">
            <FileUp className="w-8 h-8 text-cyan-400" />
            <div className="text-xs font-semibold text-slate-200 text-center">
              Bấm vào đây để chọn file backup (.xlsx hoặc .json)
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
