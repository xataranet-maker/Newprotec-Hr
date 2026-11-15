import React, { useState } from 'react';
import { ImportRecord, MachineSetup, AccessoryRecord, NetDataRecord, FaultRecord, ExportRecord } from '../../types';
import { Factory, Play, Pause, CheckCircle2, Search } from 'lucide-react';

interface StampingProductionProps {
  data: ImportRecord[];
  onUpdateStatus: (id: number, status: any, stopReason?: string, stage?: string, extra?: any) => void;
  onUpdateMachine: (id: number, machine: string, stage?: string, mold?: string) => void;
  onLinkAccessory?: () => void;
  onUpdateMpsBatch?: (batch: any[]) => void;
  machineStatuses: MachineSetup[];
  accessoriesData: AccessoryRecord[];
  netData: NetDataRecord[];
  language?: any;
  faultRecords?: FaultRecord[];
  moldImportRecords?: ImportRecord[];
  exportData?: ExportRecord[];
}

export const StampingProduction: React.FC<StampingProductionProps> = ({
  data,
  onUpdateStatus,
  onUpdateMachine,
  machineStatuses,
  moldImportRecords = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = data.filter(r =>
    r.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.lotNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Factory className="w-5 h-5 text-purple-400" />
            <span>Trạm Sản Xuất Dập Tự Động (Lên Cuộn & Gá Khuôn)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Điều phối máy dập, gá lắp khuôn dập tương ứng và theo dõi chu kỳ dập tự động.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm Model, Lot cuộn..."
            className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(r => {
          const isRunning = r.productionStatus === 'RUNNING';

          return (
            <div key={r.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-white text-sm">{r.model}</div>
                  <div className="text-[11px] text-cyan-400 font-mono">LOT: {r.lotNo}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  isRunning ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {r.productionStatus || 'PENDING'}
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Độ Dài Cuộn:</span>
                  <span className="font-mono font-bold text-white">{r.quantity.toLocaleString()} Mét</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Máy Dập:</span>
                  <span className="font-semibold text-purple-300">{r.moldNo || 'Chưa gán máy'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <select
                  value={r.moldNo || ''}
                  onChange={e => onUpdateMachine(r.id, e.target.value, r.stage, e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200"
                >
                  <option value="">-- Chọn Máy Dập --</option>
                  {machineStatuses.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-1 border-t border-slate-800">
                <button
                  onClick={() => onUpdateStatus(r.id, isRunning ? 'STOPPED' : 'RUNNING', undefined, r.stage)}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                    isRunning ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {isRunning ? 'Tạm Dừng' : 'Bắt Đầu Dập'}
                </button>
                <button
                  onClick={() => onUpdateStatus(r.id, 'COMPLETED', undefined, r.stage)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  Xong
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
