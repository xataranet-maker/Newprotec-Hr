import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { AccessoryRecord } from '../../types';
import { GitCompare, Upload, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface AccessoryImportComparisonProps {
  accessoryData: AccessoryRecord[];
  onClearSystemData?: () => void;
}

export const AccessoryImportComparison: React.FC<AccessoryImportComparisonProps> = ({
  accessoryData,
  onClearSystemData
}) => {
  const [excelData, setExcelData] = useState<any[]>([]);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const b = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(b, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);
        setExcelData(json);
      } catch (err: any) {
        alert('Lỗi đọc file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-blue-400" />
            <span>Đối Chiếu Nhập Phụ Liệu (Hệ Thống vs File Excel Kho)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Tải lên file báo cáo từ thủ kho để so sánh số lượng cuộn thực nhận so với hệ thống MES.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <span>Tải Lên File Kho Excel</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
          </label>

          {onClearSystemData && (
            <button
              onClick={() => { if (confirm('Xóa dữ liệu đối chiếu?')) onClearSystemData(); }}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400"
              title="Xóa đối chiếu"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hệ thống */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="font-bold text-xs text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-800 flex justify-between">
            <span>Dữ Liệu Hệ Thống MES ({accessoryData.length} Lô)</span>
            <span className="text-cyan-400 font-mono">Trực Tiếp</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {accessoryData.map(a => (
              <div key={a.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs flex justify-between items-center">
                <div>
                  <div className="font-bold text-white font-mono">{a.model}</div>
                  <div className="text-[11px] text-purple-400 font-mono">LOT: {a.lotNo}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-white">{a.quantity.toLocaleString()} Cuộn</div>
                  <div className="text-[10px] text-slate-500">{a.stage}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* File Excel Đối Chiếu */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="font-bold text-xs text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-800 flex justify-between">
            <span>Dữ Liệu File Kho Excel ({excelData.length} Dòng)</span>
            <span className="text-emerald-400 font-mono">Đối Chứng</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {excelData.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                Vui lòng tải lên file Excel từ thủ kho để bắt đầu đối chiếu.
              </div>
            ) : (
              excelData.map((row, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white font-mono">{row.Model || row.model || 'N/A'}</div>
                    <div className="text-[11px] text-emerald-400 font-mono">LOT: {row.LotNo || row.lotNo || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-white">{(row.Quantity || row.quantity || 0).toLocaleString()} Cuộn</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
