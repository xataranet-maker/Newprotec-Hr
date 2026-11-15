import React from 'react';
import { MachineSetup, ImportRecord } from '../../types';
import { Cpu } from 'lucide-react';

interface StiffMachinesProps {
  data?: ImportRecord[];
  machineStatuses?: MachineSetup[];
}

export const StiffMachines: React.FC<StiffMachinesProps> = ({ machineStatuses = [] }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-amber-400" />
          <span>Danh Sách Máy Móc Phân Xưởng Stiff</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {machineStatuses.map(m => (
          <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <div className="font-bold text-white text-sm">{m.name}</div>
            <div className="text-slate-400">{m.description}</div>
            <div className="text-emerald-400 font-mono">Trạng thái: {m.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
