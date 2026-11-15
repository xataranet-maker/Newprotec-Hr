import React, { useState } from 'react';
import { NetDataRecord } from '../../types';
import { Database, Plus, Search, Trash2 } from 'lucide-react';

interface StiffNetDataProps {
  moduleName?: string;
  data: NetDataRecord[];
  onDataUpdate: (data: NetDataRecord[]) => void;
}

export const StiffNetData: React.FC<StiffNetDataProps> = ({
  moduleName = 'Stiff',
  data,
  onDataUpdate
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = data.filter(d =>
    d.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            <span>Data Net Stiff (Định Mức Kỹ Thuật Dán Tấm Cứng)</span>
          </h2>
          <p className="text-xs text-slate-400">Thông số kỹ thuật SUS AUTO, SUS SEMI, TAPE AUTO, TAPE JIG.</p>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase">
              <th className="py-2.5 px-3">Model</th>
              <th className="py-2.5 px-3">Mã Hàng</th>
              <th className="py-2.5 px-3">Công Đoạn</th>
              <th className="py-2.5 px-3 text-right">Số Điểm</th>
              <th className="py-2.5 px-3 text-right">Thời Gian (s)</th>
              <th className="py-2.5 px-3 text-center">Nhiệt Bàn / Pad</th>
              <th className="py-2.5 px-3 text-right">Áp Suất</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-800/40">
                <td className="py-2.5 px-3 font-bold text-white font-mono">{item.model}</td>
                <td className="py-2.5 px-3 font-mono text-cyan-400">{item.code}</td>
                <td className="py-2.5 px-3 text-slate-300">{item.stage}</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">{item.stage1Points}</td>
                <td className="py-2.5 px-3 text-right font-mono">{item.timePerPoint}s</td>
                <td className="py-2.5 px-3 text-center font-mono">{item.tableTemp || 140}° / {item.padTemp || 125}°</td>
                <td className="py-2.5 px-3 text-right font-mono">{item.airPressure || 0.5} MPa</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
