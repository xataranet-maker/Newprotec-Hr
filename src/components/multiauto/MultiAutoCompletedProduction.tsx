import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { ProductionHistoryRecord, Language, NetDataRecord, ExportRecord } from '../../types';
import { FileCheck, Search, Download, Clock, CheckCircle2 } from 'lucide-react';

interface MultiAutoCompletedProductionProps {
  data: ProductionHistoryRecord[];
  language?: Language;
  netData?: NetDataRecord[];
  exportData?: ExportRecord[];
}

export const MultiAutoCompletedProduction: React.FC<MultiAutoCompletedProductionProps> = ({
  data,
  netData = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = data.filter(r =>
    r.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.lotNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.machine && r.machine.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LICH_SU_SX');
    XLSX.writeFile(wb, `LICH_SU_SX_MULTI_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalFinishedPnl = filtered.reduce((acc, r) => acc + (r.quantity || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-indigo-400" />
            <span>Lịch Sử Sản Xuất Đã Hoàn Thành (Multi Auto)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Tổng hợp các lô hàng đã hoàn tất gia công trên các máy, thời gian chạy và phụ liệu sử dụng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Đã xong:</span>
            <span className="font-mono font-bold text-indigo-400 text-sm">
              {totalFinishedPnl.toLocaleString()} PNL
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm Model, LOT, Máy..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200"
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase">
                <th className="py-2.5 px-3">Thời Gian Xong</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Mã Lô (Lot No)</th>
                <th className="py-2.5 px-3">Máy Chạy</th>
                <th className="py-2.5 px-3 text-right">Số Lượng</th>
                <th className="py-2.5 px-3">Lô Phụ Liệu</th>
                <th className="py-2.5 px-3 text-right">Tổng Thời Gian</th>
                <th className="py-2.5 px-3">Người Vận Hành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Chưa có lô sản xuất nào được ghi nhận hoàn thành.
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.historyId || r.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{r.completedAt}</td>
                    <td className="py-2.5 px-3 font-bold text-white font-mono">{r.model}</td>
                    <td className="py-2.5 px-3 font-mono text-cyan-400">{r.lotNo}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{r.machine || 'Multi 01'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {r.quantity.toLocaleString()} PNL
                    </td>
                    <td className="py-2.5 px-3 font-mono text-purple-300">{r.usedAccessoryLot || 'PL-DEFAULT'}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {r.totalDuration ? `${Math.floor(r.totalDuration / 60)}p ${r.totalDuration % 60}s` : '--'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{r.operator || 'Hệ thống Auto'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
