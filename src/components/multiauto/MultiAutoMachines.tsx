import React from 'react';
import { MachineSetup, ImportRecord } from '../../types';
import { Cpu, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface MultiAutoMachinesProps {
  data?: ImportRecord[];
  machineStatuses?: MachineSetup[];
}

export const MultiAutoMachines: React.FC<MultiAutoMachinesProps> = ({
  data = [],
  machineStatuses = []
}) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span>Giám Sát Trạng Thái Hệ Thống Máy Multi Auto</span>
        </h2>
        <p className="text-xs text-slate-400">
          Tổng quan trạng thái phần cứng, kết nối mạng và lịch sử bảo trì các máy dán ép tự động.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {machineStatuses.map(m => (
          <div key={m.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white text-sm">{m.name}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                m.note === 'NORMAL' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
              }`}>
                {m.note}
              </span>
            </div>

            <div className="text-slate-400 text-[11px]">
              {m.description || 'Máy dán ép tấm chuẩn phòng sạch'}
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex justify-between">
              <span>Trực ca ngày:</span>
              <span className="text-slate-300">{m.staffDay || 'Chưa gán'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
