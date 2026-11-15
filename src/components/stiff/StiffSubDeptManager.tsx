import React, { useState } from 'react';
import { 
  ImportRecord, ExportRecord, ProductionHistoryRecord, MachineSetup, 
  NetDataRecord, AccessoryRecord, AccessoryUsageRecord, RepairRecord, 
  FaultRecord, MachineActivityLog, StaffRecord, AttendanceRecord, 
  OvertimeRecord 
} from '../../types';
import { 
  Cpu, Zap, Disc, Play, Pause, CheckCircle2, Download, 
  Upload, Search, Plus, Layers, Filter 
} from 'lucide-react';

interface StiffSubDeptManagerProps {
  subDeptId: 'SUS AUTO' | 'SUS SEMI' | 'TAPE AUTO' | 'TAPE JIG';
  importData: ImportRecord[];
  exportData: ExportRecord[];
  historyData: ProductionHistoryRecord[];
  machineData: MachineSetup[];
  netData: NetDataRecord[];
  accessoryData: AccessoryRecord[];
  accessoryUsage: AccessoryUsageRecord[];
  repairHistory: RepairRecord[];
  faultRecords: FaultRecord[];
  machineActivityLogs: MachineActivityLog[];
  onAddMachineLog: (log: MachineActivityLog) => void;
  onAddImport: (records: any[]) => void;
  onAddAccessory: (records: any[]) => void;
  onAddExport: (records: any[]) => void;
  onUpdateStatus: (recordId: number, status: any, stopReason?: string, stage?: string) => void;
  onUpdateMachine: (recordId: number, machine: string, stage?: string, mold?: string) => void;
  onLinkAccessory: (recordId: number, lot: string, qty: number, stage?: string) => void;
  onUpdateMpsBatch?: (batch: any[]) => void;
  onConfirmImport?: (tpIds: number[], plIds: number[]) => void;
  onUpdateNetData?: (data: NetDataRecord[]) => void;
  onUpdateMachineSetup?: (machines: MachineSetup[]) => void;
  stiffStaff: StaffRecord[];
  setStiffStaff: (staff: StaffRecord[]) => void;
  attendanceHistory?: AttendanceRecord[];
  onUpdateAttendanceHistory?: (att: AttendanceRecord[]) => void;
  overtimeRecords?: OvertimeRecord[];
  onUpdateOvertime?: (ot: OvertimeRecord[]) => void;
  moldImportRecords?: ImportRecord[];
  targetPnl?: number;
}

export const StiffSubDeptManager: React.FC<StiffSubDeptManagerProps> = ({
  subDeptId,
  importData,
  exportData,
  historyData,
  machineData,
  netData,
  onAddImport,
  onUpdateStatus,
  onUpdateMachine
}) => {
  const [activeTab, setActiveTab] = useState<'production' | 'import' | 'history'>('production');
  const [model, setModel] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [quantity, setQuantity] = useState(1000);
  const [searchTerm, setSearchTerm] = useState('');

  // Machines assigned to this sub-dept
  const deptMachines = machineData.filter(m => m.name.includes(subDeptId) || m.description.includes(subDeptId));

  const deptImports = importData.filter(r => 
    r.stage === subDeptId || (r.model && r.model.includes('STIFF')) || true
  );

  const handleAddImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !lotNo) return;
    onAddImport([{
      model,
      code: `NP-${model}-ST`,
      lotNo,
      quantity,
      stage: subDeptId,
      department: 'STIFF',
      productionStatus: 'PENDING',
      isVerified: true
    }]);
    setLotNo('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>Khu Vực Sản Xuất Stiff: {subDeptId}</span>
          </h2>
          <p className="text-xs text-slate-400">
            Trạm quản lý dán tấm cứng (SUS/Tape) công đoạn {subDeptId} Newprotec Vina.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('production')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'production' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Trạm Vận Hành
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'import' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Nhập Phôi Mới
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'history' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Lịch Sử Đã Xong
          </button>
        </div>
      </div>

      {activeTab === 'production' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deptImports.map(record => {
              const stage = record.stage || subDeptId;
              const prog = record.productionProgress?.[stage] || { status: record.productionStatus || 'PENDING' };
              const isRunning = prog.status === 'RUNNING';

              return (
                <div key={record.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-white text-sm">{record.model}</div>
                      <div className="text-[11px] text-cyan-400 font-mono">LOT: {record.lotNo}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      isRunning ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {prog.status || 'PENDING'}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sản Lượng:</span>
                      <span className="font-mono font-bold text-white">{record.quantity.toLocaleString()} PNL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Khu vực:</span>
                      <span className="text-amber-400">{subDeptId}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={prog.machine || ''}
                      onChange={e => onUpdateMachine(record.id, e.target.value, stage)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-300 text-xs"
                    >
                      <option value="">-- Gán Máy {subDeptId} --</option>
                      {deptMachines.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-slate-800">
                    <button
                      onClick={() => onUpdateStatus(record.id, isRunning ? 'STOPPED' : 'RUNNING', undefined, stage)}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-xs cursor-pointer shadow-sm ${
                        isRunning ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      }`}
                    >
                      {isRunning ? 'Tạm Dừng' : 'Chạy Máy'}
                    </button>
                    <button
                      onClick={() => onUpdateStatus(record.id, 'COMPLETED', undefined, stage)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                    >
                      Xong
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'import' && (
        <form onSubmit={handleAddImport} className="max-w-md bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <h3 className="font-bold text-sm text-white pb-2 border-b border-slate-800">
            Đăng Ký Lô Phôi Stiff Mới ({subDeptId})
          </h3>
          <div>
            <label className="block text-slate-300 mb-1">Model Sản Phẩm</label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="VD: PIXEL-9PRO-STIFF"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Số Lô (Lot No)</label>
            <input
              type="text"
              value={lotNo}
              onChange={e => setLotNo(e.target.value)}
              placeholder="VD: ST-202611-001"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Số Lượng (PNL)</label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>
          <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer">
            Nhập Lô Vào Khu Vực {subDeptId}
          </button>
        </form>
      )}

      {activeTab === 'history' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs">
          <div className="font-bold text-slate-200 mb-2">Lịch Sử Hoàn Thành {subDeptId}</div>
          <div className="divide-y divide-slate-800">
            {historyData.map(h => (
              <div key={h.historyId || h.id} className="py-2 flex justify-between">
                <div>
                  <span className="font-bold text-white">{h.model}</span> · <span className="font-mono text-cyan-400">{h.lotNo}</span>
                </div>
                <div className="font-mono text-emerald-400 font-bold">{h.quantity} PNL</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
