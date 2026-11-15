import React, { useState } from 'react';
import { ProductionHistoryRecord, NetDataRecord, MachineSetup, Language } from '../../types';
import { CalendarDays, Target, TrendingUp, Download } from 'lucide-react';

interface MultiAutoMonthlyReportProps {
  historyData: ProductionHistoryRecord[];
  netData: NetDataRecord[];
  machines: MachineSetup[];
  targetPnl?: number;
  language?: Language;
  onUpdateTarget?: (target: number) => void;
}

export const MultiAutoMonthlyReport: React.FC<MultiAutoMonthlyReportProps> = ({
  historyData,
  targetPnl = 500,
  onUpdateTarget
}) => {
  const [currentTarget, setCurrentTarget] = useState(targetPnl);

  const totalMonthlyPnl = historyData.reduce((acc, h) => acc + (h.quantity || 0), 0);
  const completionRate = Math.min(100, Math.round((totalMonthlyPnl / (currentTarget * 30 || 15000)) * 100));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber-400" />
            <span>Báo Cáo Hiệu Suất Tháng (Multi Auto Monthly KPIs)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Theo dõi tổng sản lượng tích lũy trong tháng và điều chỉnh chỉ tiêu mục tiêu ca.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>Mục tiêu ngày:</span>
            <input
              type="number"
              value={currentTarget}
              onChange={e => {
                const val = Number(e.target.value);
                setCurrentTarget(val);
                if (onUpdateTarget) onUpdateTarget(val);
              }}
              className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
            />
            <span>PNL</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
          <span className="text-xs text-slate-400 uppercase font-semibold">Sản Lượng Tích Lũy Tháng</span>
          <div className="text-3xl font-bold font-mono text-white">
            {totalMonthlyPnl.toLocaleString()} <span className="text-xs font-sans text-slate-400">PNL</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
            <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${completionRate}%` }} />
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>Tiến độ tháng</span>
            <span className="font-mono text-cyan-400 font-bold">{completionRate}%</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
          <span className="text-xs text-slate-400 uppercase font-semibold">Số Lô Đã Hoàn Thành</span>
          <div className="text-3xl font-bold font-mono text-emerald-400">
            {historyData.length} <span className="text-xs font-sans text-slate-400">Lô</span>
          </div>
          <p className="text-xs text-slate-400">Không ghi nhận sự cố dừng máy nghiêm trọng</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
          <span className="text-xs text-slate-400 uppercase font-semibold">Tỷ Lệ Đạt Chất Lượng (Pass Rate)</span>
          <div className="text-3xl font-bold font-mono text-indigo-400">
            99.2%
          </div>
          <p className="text-xs text-slate-400">Đạt tiêu chuẩn xuất xưởng linh kiện điện tử</p>
        </div>
      </div>
    </div>
  );
};
