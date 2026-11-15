import React from 'react';
import { ImportRecord } from '../../types';
import { History } from 'lucide-react';

export const MoldImportLedger: React.FC<{ data: ImportRecord[] }> = ({ data }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" />
          <span>Nhật Ký Nhập & Đăng Ký Khuôn / Jig</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        <div className="divide-y divide-slate-800">
          {data.map(m => (
            <div key={m.id} className="py-2.5 flex justify-between text-slate-300">
              <div>
                <span className="font-bold text-white">{m.moldNo || m.lotNo}</span> · <span className="text-cyan-400">{m.model}</span>
              </div>
              <div className="text-slate-400 font-mono">{m.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
