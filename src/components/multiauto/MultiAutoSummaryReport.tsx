import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  ImportRecord, ExportRecord, ProductionHistoryRecord, MachineSetup, 
  StaffRecord, NetDataRecord, AttendanceRecord, OvertimeRecord 
} from '../../types';
import { BarChart3, TrendingUp, Download, Calendar, ArrowUpRight } from 'lucide-react';

interface MultiAutoSummaryReportProps {
  importData: ImportRecord[];
  exportData: ExportRecord[];
  historyData: ProductionHistoryRecord[];
  machineData: MachineSetup[];
  staffData: StaffRecord[];
  netData: NetDataRecord[];
  productReturns?: any[];
  targetPnl?: number;
  attendanceHistory?: AttendanceRecord[];
  overtimeRecords?: OvertimeRecord[];
}

export const MultiAutoSummaryReport: React.FC<MultiAutoSummaryReportProps> = ({
  importData,
  exportData,
  historyData,
  machineData,
  staffData,
  targetPnl = 500
}) => {
  const [selectedShift, setSelectedShift] = useState('ALL');

  const totalImport = importData.reduce((acc, r) => acc + (r.quantity || 0), 0);
  const totalExport = exportData.reduce((acc, r) => acc + (r.quantity || 0), 0);
  const totalCompleted = historyData.reduce((acc, r) => acc + (r.quantity || 0), 0);
  const percentTarget = Math.round((totalCompleted / (targetPnl || 500)) * 100);

  // Group by model
  const modelStats = new Map<string, { model: string; imported: number; completed: number; exported: number }>();

  importData.forEach(r => {
    if (!modelStats.has(r.model)) modelStats.set(r.model, { model: r.model, imported: 0, completed: 0, exported: 0 });
    modelStats.get(r.model)!.imported += r.quantity;
  });

  historyData.forEach(r => {
    if (!modelStats.has(r.model)) modelStats.set(r.model, { model: r.model, imported: 0, completed: 0, exported: 0 });
    modelStats.get(r.model)!.completed += r.quantity;
  });

  exportData.forEach(r => {
    if (!modelStats.has(r.model)) modelStats.set(r.model, { model: r.model, imported: 0, completed: 0, exported: 0 });
    modelStats.get(r.model)!.exported += r.quantity;
  });

  const list = Array.from(modelStats.values());

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(list);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BAO_CAO_TONG_HOP');
    XLSX.writeFile(wb, `BAO_CAO_MULTI_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>Báo Cáo Tổng Hợp Sản Xuất (Multi Auto)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Tổng hợp sản lượng nhập phôi, sản xuất hoàn thành và xuất kho theo từng model và ca làm việc.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Xuất File Báo Cáo</span>
        </button>
      </div>

      {/* 4 Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-semibold">Tổng Phôi Nhập</span>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {totalImport.toLocaleString()} <span className="text-xs font-sans text-slate-400">PNL</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{importData.length} Lô tiếp nhận</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-semibold">Sản Xuất Hoàn Tất</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {totalCompleted.toLocaleString()} <span className="text-xs font-sans text-slate-400">PNL</span>
          </div>
          <div className="text-[11px] text-emerald-500 mt-1">Đạt {percentTarget}% mục tiêu ca</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-semibold">Đã Xuất Kho</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {totalExport.toLocaleString()} <span className="text-xs font-sans text-slate-400">PNL</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{exportData.length} Phiếu xuất</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 uppercase font-semibold">Máy Sẵn Sàng</span>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">
            {machineData.length} <span className="text-xs font-sans text-slate-400">Máy</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{staffData.length} Kỹ thuật viên trực</div>
        </div>
      </div>

      {/* Model Breakdown Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-200 uppercase tracking-wider">
          Phân Tích Chi Tiết Theo Từng Model Sản Phẩm
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase">
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3 text-right">Tổng Nhập (PNL)</th>
                <th className="py-2.5 px-3 text-right">Đã Sản Xuất Xong</th>
                <th className="py-2.5 px-3 text-right">Đã Xuất Xưởng</th>
                <th className="py-2.5 px-3 text-right">Tồn Chờ Xử Lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Chưa có số liệu tổng hợp trong hệ thống.
                  </td>
                </tr>
              ) : (
                list.map(item => (
                  <tr key={item.model} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-white font-mono">{item.model}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-cyan-400 font-bold">{item.imported.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">{item.completed.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-400 font-bold">{item.exported.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {(item.imported - item.completed).toLocaleString()}
                    </td>
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
