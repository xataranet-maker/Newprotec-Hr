import React from 'react';
import { ImportRecord, NetDataRecord } from '../../types';
import { Cpu } from 'lucide-react';

export const JigStockInventory: React.FC<{
  imports: ImportRecord[];
  netData?: NetDataRecord[];
  language?: any;
  onScrap?: (item: ImportRecord, type: any, reason: string) => void;
  onUpdateTool?: (item: ImportRecord) => void;
}> = ({ imports, onScrap }) => {
  const jigs = imports.filter(i => i.note === 'JIG_ASSET_IMPORT' || i.stage === 'JIG GÁ');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span>Kho Jig Gá (Jig Stock Inventory)</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {jigs.map(j => (
          <div key={j.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-bold text-white text-sm">{j.moldNo || j.lotNo}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400">
                {j.status || 'GOOD'}
              </span>
            </div>
            <div className="text-slate-300">Model: <span className="font-bold text-cyan-400">{j.model}</span></div>
            {onScrap && (
              <button
                onClick={() => onScrap(j, 'SCRAP', 'Lỗi kẹp gá')}
                className="w-full py-1 rounded bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-[11px] font-semibold cursor-pointer"
              >
                Báo Phế Jig
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
