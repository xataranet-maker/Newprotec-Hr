import React from 'react';
import * as XLSX from 'xlsx';
import { ImportRecord, ExportRecord, ProductionHistoryRecord, MachineSetup, StaffRecord, NetDataRecord } from '../../types';
import { LineChart, Download, Layers } from 'lucide-react';

interface StampingSummaryReportProps {
  importData: ImportRecord[];
  exportData: ExportRecord[];
  historyData: ProductionHistoryRecord[];
  machineData: MachineSetup[];
  staffData: StaffRecord[];
  netData: NetDataRecord[];
  targetPnl?: number;
}

export const StampingSummaryReport: React.FC<StampingSummaryReportProps> = ({
  importData,
  exportData,
  historyData,
  targetPnl = 500
}) => {
  const totalMeters = importData.reduce((acc, r) => acc + (r.quantity || 0), 0);
  const totalPcs = historyData.reduce((acc, h) => acc + (h.totalPcs || h.quantity * 4 || 0), 0);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(historyData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BAO_CAO_DAP');
    XLSX.writeFile(wb, `BAO_CAO_DAP_TU_DONG_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LineChart className="w-5 h-5 text-emerald-400" />
            <span>Báo Cáo Tổng Hợp Sản Lượng Dập Tự Động</span>
          </h2>
          <p className="text-xs text-slate-400">Thống kê số mét cuộn đã nạp và sản lượng dập (Pcs) hoàn thành.</p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Xuất Báo Cáo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-semibold">Tổng Cuộn Nhập (Mét)</span>
          <div className="text-2xl font-bold font-mono text-white mt-2">{totalMeters.toLocaleString()} M</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-semibold">Sản Lượng Dập Hoàn Tất (Pcs)</span>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-2">{totalPcs.toLocaleString()} Pcs</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-semibold">Số Lô Hoàn Thành</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">{historyData.length} Lô</div>
        </div>
      </div>
    </div>
  );
};
