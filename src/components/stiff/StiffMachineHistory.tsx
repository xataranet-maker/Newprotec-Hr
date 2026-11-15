import React from 'react';
import { MachineActivityLog, MachineSetup } from '../../types';
import { History } from 'lucide-react';

interface StiffMachineHistoryProps {
  logs: MachineActivityLog[];
  machineStatuses?: MachineSetup[];
}

export const StiffMachineHistory: React.FC<StiffMachineHistoryProps> = ({ logs }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-orange-400" />
          <span>Nhật Ký Máy Stiff</span>
        </h2>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        <div className="divide-y divide-slate-800">
          {logs.map(l => (
            <div key={l.id} className="py-2 flex justify-between text-slate-300">
              <span className="font-mono text-slate-400">{l.timestamp}</span>
              <span className="font-bold text-white">{l.machineName}</span>
              <span className="text-cyan-400">{l.eventType}</span>
              <span>{l.model}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
