import React from 'react';
import { NetDataRecord } from '../../types';
import { Database } from 'lucide-react';

interface StampingNetDataProps {
  data: NetDataRecord[];
  onDataUpdate: (data: NetDataRecord[]) => void;
}

export const StampingNetData: React.FC<StampingNetDataProps> = ({ data }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400" />
          <span>Data Net Dập Tự Động (Bước Tiến Pitch & Pcs/Nhát Dập)</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-[11px] uppercase">
              <th className="py-2.5 px-3">Model</th>
              <th className="py-2.5 px-3">Mã Hàng</th>
              <th className="py-2.5 px-3 text-right">Bước Dập Pitch (mm)</th>
              <th className="py-2.5 px-3 text-right">Số Pcs / Nhát</th>
              <th className="py-2.5 px-3 text-right">Tốc Độ (SPM)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {data.map(n => (
              <tr key={n.id}>
                <td className="py-2.5 px-3 font-bold text-white font-mono">{n.model}</td>
                <td className="py-2.5 px-3 font-mono text-cyan-400">{n.code}</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{n.pitchDistance || 25.4} mm</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-400">{n.pcsPerStroke || 4}</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-400">120 SPM</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
