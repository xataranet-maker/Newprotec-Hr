import React from 'react';
import { RepairRecord } from '../../types';
import { ScrollText } from 'lucide-react';

export const RepairHistoryViewer: React.FC<{ data: RepairRecord[] }> = ({ data }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-emerald-400" />
          <span>Lịch Sử Sửa Chữa & Bảo Trì Thiết Bị</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        {data.length === 0 ? (
          <div className="py-8 text-center text-slate-500">Chưa có lịch sử sửa chữa nào được tạo.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {data.map(r => (
              <div key={r.id} className="py-2.5 flex justify-between text-slate-300">
                <div>
                  <span className="font-bold text-white">{r.machineName} ({r.department})</span> · <span>{r.content}</span>
                  {r.replacementPart && <div className="text-[11px] text-cyan-400">Thay thế: {r.replacementPart} (x{r.replacedQuantity})</div>}
                </div>
                <div className="font-mono text-slate-400">{r.date} ({r.technician})</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
