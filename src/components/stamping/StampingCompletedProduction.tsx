import React from 'react';
import { ProductionHistoryRecord } from '../../types';
import { FileCheck } from 'lucide-react';

export const StampingCompletedProduction: React.FC<{
  data: ProductionHistoryRecord[];
  language?: any;
  netData?: any;
  exportData?: any;
}> = ({ data }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-indigo-400" />
          <span>Lịch Sử Dập Tự Động Hoàn Thành</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        <div className="divide-y divide-slate-800">
          {data.map(h => (
            <div key={h.historyId || h.id} className="py-2.5 flex justify-between text-slate-300">
              <div>
                <span className="font-bold text-white">{h.model}</span> · <span className="font-mono text-cyan-400">{h.lotNo}</span> · <span className="text-slate-400">{h.machine || 'Stamp 01'}</span>
              </div>
              <div className="font-mono text-emerald-400 font-bold">
                {h.quantity.toLocaleString()} Mét ({((h.totalPcs || h.quantity * 4)).toLocaleString()} Pcs)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
