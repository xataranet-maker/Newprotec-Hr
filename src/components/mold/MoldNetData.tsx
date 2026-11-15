import React from 'react';
import { NetDataRecord } from '../../types';
import { Database } from 'lucide-react';

export const MoldNetData: React.FC<{
  data: NetDataRecord[];
  onDataUpdate: (data: NetDataRecord[]) => void;
}> = ({ data }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-slate-400" />
          <span>Định Mức Kỹ Thuật Khuôn & Jig</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-[11px] uppercase">
              <th className="py-2.5 px-3">Model</th>
              <th className="py-2.5 px-3">Mã Hàng</th>
              <th className="py-2.5 px-3">Công Đoạn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {data.map(m => (
              <tr key={m.id}>
                <td className="py-2.5 px-3 font-bold text-white font-mono">{m.model}</td>
                <td className="py-2.5 px-3 font-mono text-cyan-400">{m.code}</td>
                <td className="py-2.5 px-3 text-slate-400">{m.stage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
