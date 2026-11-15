import React from 'react';
import { ImportRecord, ProductionHistoryRecord, NetDataRecord, MachineSetup, Language } from '../../types';
import { Activity, Clock, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';

interface MultiAutoPerformanceReportProps {
  importData: ImportRecord[];
  historyData: ProductionHistoryRecord[];
  netData: NetDataRecord[];
  machineStatuses: MachineSetup[];
  targetPnl?: number;
  language?: Language;
}

export const MultiAutoPerformanceReport: React.FC<MultiAutoPerformanceReportProps> = ({
  importData,
  historyData,
  machineStatuses,
  targetPnl = 500
}) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <span>Giám Sát Hiệu Suất Máy Live (Multi Auto OEE)</span>
        </h2>
        <p className="text-xs text-slate-400">
          Theo dõi trực tiếp tải làm việc, trạng thái hoạt động và sản lượng tức thời của từng máy dán ép tự động.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {machineStatuses.map(machine => {
          // Find currently running job on this machine
          const activeJob = importData.find(r => 
            r.productionProgress && Object.values(r.productionProgress).some((p: any) => p.machine === machine.name && p.status === 'RUNNING')
          );

          const completedCount = historyData.filter(h => h.machine === machine.name).reduce((acc, h) => acc + (h.quantity || 0), 0);
          const isRunning = !!activeJob;

          return (
            <div
              key={machine.id}
              className={`p-4 rounded-xl border space-y-3 transition-all ${
                isRunning
                  ? 'bg-slate-900/90 border-cyan-500/50 shadow-lg shadow-cyan-950/20'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{machine.name}</span>
                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  isRunning
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  {isRunning ? 'RUNNING' : 'STANDBY'}
                </span>
              </div>

              {activeJob ? (
                <div className="space-y-1.5 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 text-xs">
                  <div className="font-bold text-cyan-300 font-mono truncate">{activeJob.model}</div>
                  <div className="text-[11px] text-slate-400 font-mono">LOT: {activeJob.lotNo}</div>
                  <div className="text-emerald-400 font-mono font-semibold">
                    Đang chạy: {activeJob.quantity.toLocaleString()} PNL
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-slate-500 text-xs bg-slate-950/40 rounded-lg border border-slate-800/40">
                  Máy đang ở chế độ chờ việc
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-400 font-mono">
                <span>Tổng xong hôm nay:</span>
                <span className="font-bold text-white">{completedCount.toLocaleString()} PNL</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
