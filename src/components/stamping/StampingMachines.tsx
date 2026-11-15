import React from 'react';
import { ImportRecord, MachineSetup, NetDataRecord, ProductionHistoryRecord } from '../../types';
import { Activity, Cpu } from 'lucide-react';

interface StampingMachinesProps {
  data: ImportRecord[];
  onUpdateStatus: (id: number, status: any, stopReason?: string, stage?: string) => void;
  machineStatuses: MachineSetup[];
  netData: NetDataRecord[];
  historyData: ProductionHistoryRecord[];
  targetPnl?: number;
}

export const StampingMachines: React.FC<StampingMachinesProps> = ({
  data,
  machineStatuses
}) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          <span>Giám Sát Máy Dập Tự Động Trực Tiếp (Live Stamp OEE)</span>
        </h2>
        <p className="text-xs text-slate-400">Trạng thái vận hành và tốc độ dập (Strokes/min) của các máy dập tự động.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {machineStatuses.map(m => {
          const isRunning = data.some(r => r.productionStatus === 'RUNNING' && r.moldNo === m.name);
          return (
            <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">{m.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  isRunning ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isRunning ? 'RUNNING' : 'STANDBY'}
                </span>
              </div>
              <div className="text-slate-400">{m.description || 'Máy dập cao tốc'}</div>
              <div className="text-[11px] text-slate-500 font-mono">Trực ca: {m.staffDay || 'KTV'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
