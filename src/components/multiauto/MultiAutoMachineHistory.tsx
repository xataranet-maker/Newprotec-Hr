import React, { useState } from 'react';
import { MachineActivityLog, MachineSetup, Language } from '../../types';
import { History, Search, Play, Pause, CheckCircle2, RotateCw } from 'lucide-react';

interface MultiAutoMachineHistoryProps {
  logs: MachineActivityLog[];
  machineStatuses: MachineSetup[];
  language?: Language;
}

export const MultiAutoMachineHistory: React.FC<MultiAutoMachineHistoryProps> = ({
  logs,
  machineStatuses
}) => {
  const [selectedMachine, setSelectedMachine] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = logs.filter(l => {
    const matchMachine = selectedMachine === 'ALL' || l.machineName === selectedMachine;
    const matchSearch = l.model.toLowerCase().includes(searchTerm.toLowerCase()) || l.lotNo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchMachine && matchSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-orange-400" />
            <span>Nhật Ký Hoạt Động & Sự Kiện Máy (Machine Log)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Ghi nhận toàn bộ sự kiện Khởi động (START), Tạm dừng (STOP), Tiếp tục (RESUME) và Hoàn tất (FINISH).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm Model, Lot..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200"
            />
          </div>

          <select
            value={selectedMachine}
            onChange={e => setSelectedMachine(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="ALL">Tất cả máy</option>
            {machineStatuses.map(m => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase">
                <th className="py-2.5 px-3">Thời Gian</th>
                <th className="py-2.5 px-3">Tên Máy</th>
                <th className="py-2.5 px-3">Sự Kiện</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Lot No</th>
                <th className="py-2.5 px-3">Lý Do / Chi Tiết</th>
                <th className="py-2.5 px-3">Thời Lượng</th>
                <th className="py-2.5 px-3">Thao Tác Bởi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Chưa có sự kiện nào được ghi lại trong nhật ký máy.
                  </td>
                </tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{l.date} {l.timestamp}</td>
                    <td className="py-2.5 px-3 font-bold text-white font-mono">{l.machineName}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        l.eventType === 'START' ? 'bg-cyan-950 text-cyan-400' :
                        l.eventType === 'STOP' ? 'bg-amber-950 text-amber-400' :
                        l.eventType === 'RESUME' ? 'bg-blue-950 text-blue-400' :
                        'bg-emerald-950 text-emerald-400'
                      }`}>
                        {l.eventType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-cyan-300">{l.model}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{l.lotNo}</td>
                    <td className="py-2.5 px-3 text-slate-400">{l.reason || 'Bình thường'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {l.durationSeconds ? `${l.durationSeconds}s` : '--'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{l.operator || 'Hệ thống'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
