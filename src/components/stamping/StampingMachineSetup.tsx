import React from 'react';
import { MachineSetup, StaffRecord, FaultRecord } from '../../types';
import { Settings } from 'lucide-react';

export const StampingMachineSetup: React.FC<{
  machines: MachineSetup[];
  onUpdate: (m: MachineSetup[]) => void;
  staffData?: StaffRecord[];
  faultRecords?: FaultRecord[];
}> = ({ machines, onUpdate }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-400" />
          <span>Cài Đặt Máy Dập Tự Động (DK Máy Dập)</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {machines.map(m => (
          <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <div className="font-bold text-white text-sm">{m.name}</div>
            <div className="text-slate-400">{m.description || 'Máy dập liên hoàn'}</div>
            <div className="text-emerald-400 font-mono">Trạng thái: {m.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
