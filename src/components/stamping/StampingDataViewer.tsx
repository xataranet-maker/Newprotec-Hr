import React from 'react';
import { ImportRecord } from '../../types';
import { FileSearch } from 'lucide-react';

export const StampingDataViewer: React.FC<{ data: ImportRecord[] }> = ({ data }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FileSearch className="w-5 h-5 text-cyan-400" />
          <span>Sổ Nhập Cuộn Dập Tự Động</span>
        </h2>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        <div className="divide-y divide-slate-800">
          {data.map(r => (
            <div key={r.id} className="py-2 flex justify-between text-slate-300">
              <span className="font-mono text-slate-400">{r.date}</span>
              <span className="font-bold text-white">{r.model}</span>
              <span className="font-mono text-cyan-400">{r.lotNo}</span>
              <span className="font-mono text-emerald-400">{r.quantity.toLocaleString()} Mét</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
