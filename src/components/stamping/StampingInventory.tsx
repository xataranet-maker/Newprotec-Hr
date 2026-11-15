import React from 'react';
import { ImportRecord, ExportRecord, ProductionHistoryRecord, NetDataRecord } from '../../types';
import { Package } from 'lucide-react';

export const StampingInventory: React.FC<{
  imports: ImportRecord[];
  exports: ExportRecord[];
  historyData: ProductionHistoryRecord[];
  netData: NetDataRecord[];
}> = ({ imports, exports }) => {
  const totalMeters = imports.reduce((acc, r) => acc + (r.quantity || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-400" />
          <span>Tồn Kho Cuộn Phôi Kim Loại (Mét)</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        <div className="text-slate-400">Tổng mét cuộn trong kho: <span className="font-mono text-white font-bold">{totalMeters.toLocaleString()} Mét</span></div>
        <div className="divide-y divide-slate-800 mt-3">
          {imports.map(i => (
            <div key={i.id} className="py-2 flex justify-between text-slate-300">
              <span className="font-bold text-white">{i.model}</span>
              <span className="font-mono text-cyan-400">{i.lotNo}</span>
              <span className="font-mono text-emerald-400 font-bold">{i.quantity.toLocaleString()} Mét</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
