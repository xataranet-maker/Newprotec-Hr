import React from 'react';
import { ImportRecord, NetDataRecord } from '../../types';
import { Inbox, Trash2 } from 'lucide-react';

export const MoldStockInventory: React.FC<{
  imports: ImportRecord[];
  netData?: NetDataRecord[];
  language?: any;
  onScrap?: (item: ImportRecord, type: any, reason: string) => void;
  onUpdateTool?: (item: ImportRecord) => void;
}> = ({ imports, onScrap }) => {
  const molds = imports.filter(i => i.note === 'MOLD_ASSET_IMPORT' || i.stage === 'KHUÔN DẬP' || !i.note);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Inbox className="w-5 h-5 text-orange-400" />
          <span>Kho Khuôn Dập (Mold Stock Inventory)</span>
        </h2>
        <p className="text-xs text-slate-400">Theo dõi tuổi thọ, số hit đã dập và vị trí lưu trữ trong kho khuôn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {molds.map(m => (
          <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-bold text-white text-sm">{m.moldNo || m.lotNo}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400">
                {m.status || 'GOOD'}
              </span>
            </div>
            <div className="text-slate-300">Model: <span className="font-bold text-cyan-400">{m.model}</span></div>
            <div className="text-slate-400 font-mono text-[11px]">
              Đã dập: {(m.currentHits || 0).toLocaleString()} / {(m.warrantyHits || 500000).toLocaleString()} Hits
            </div>
            {onScrap && (
              <button
                onClick={() => onScrap(m, 'SCRAP', 'Hết tuổi thọ mòn dao')}
                className="w-full py-1 rounded bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-[11px] font-semibold cursor-pointer"
              >
                Báo Phế Khuôn
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
