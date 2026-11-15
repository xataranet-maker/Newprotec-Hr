import React, { useState } from 'react';
import { MachineSetup, SparePartRecord, FaultRecord } from '../../types';
import { Monitor, Wrench, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DeviceMachineMonitorProps {
  multiMachines: MachineSetup[];
  setMultiMachines: (m: MachineSetup[]) => void;
  stiffMachines: MachineSetup[];
  setStiffMachines: (m: MachineSetup[]) => void;
  moldMachines: MachineSetup[];
  setMoldMachines: (m: MachineSetup[]) => void;
  stampingMachines: MachineSetup[];
  setStampingMachines: (m: MachineSetup[]) => void;
  spareParts: SparePartRecord[];
  onRepair: (machineId: number, dept: string, content: string, sparePartId: number, qty: number) => void;
  faultRecords?: FaultRecord[];
}

export const DeviceMachineMonitor: React.FC<DeviceMachineMonitorProps> = ({
  multiMachines,
  stiffMachines,
  stampingMachines,
  spareParts,
  onRepair
}) => {
  const [selectedMachine, setSelectedMachine] = useState<MachineSetup | null>(null);
  const [dept, setDept] = useState('MULTI');
  const [repairContent, setRepairContent] = useState('');
  const [selectedPartId, setSelectedPartId] = useState<number>(spareParts[0]?.id || 1);
  const [partQty, setPartQty] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const allSections = [
    { title: 'Multi Auto (Dán Ép Tự Động)', machines: multiMachines, dept: 'MULTI' },
    { title: 'Dập Tự Động (Stamping)', machines: stampingMachines, dept: 'STAMPING' },
    { title: 'Stiff (Dán Tấm Cứng)', machines: stiffMachines, dept: 'STIFF' }
  ];

  const handleOpenRepair = (m: MachineSetup, d: string) => {
    setSelectedMachine(m);
    setDept(d);
    setShowModal(true);
  };

  const handleConfirmRepair = () => {
    if (!selectedMachine || !repairContent) return;
    onRepair(selectedMachine.id, dept, repairContent, selectedPartId, partQty);
    setShowModal(false);
    setRepairContent('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Monitor className="w-5 h-5 text-blue-400" />
          <span>Giám Sát Tình Trạng Máy Móc Toàn Nhà Máy</span>
        </h2>
        <p className="text-xs text-slate-400">
          Theo dõi trạng thái vận hành, phát hiện sự cố và tạo lệnh bảo trì, thay thế phụ tùng.
        </p>
      </div>

      <div className="space-y-6">
        {allSections.map(sec => (
          <div key={sec.dept} className="space-y-3">
            <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">{sec.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {sec.machines.map(m => (
                <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm">{m.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      m.note === 'NORMAL' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                    }`}>
                      {m.note}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px]">{m.description || 'Hoạt động bình thường'}</div>
                  <button
                    onClick={() => handleOpenRepair(m, sec.dept)}
                    className="w-full py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Lập Phiếu Sửa Chữa</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedMachine && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white">
              Phiếu Sửa Chữa & Bảo Trì: {selectedMachine.name}
            </h3>

            <div>
              <label className="block text-slate-300 mb-1">Nội dung khắc phục sự cố</label>
              <input
                type="text"
                value={repairContent}
                onChange={e => setRepairContent(e.target.value)}
                placeholder="VD: Thay van khí nén, căn chỉnh hành trình..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Phụ tùng thay thế</label>
              <select
                value={selectedPartId}
                onChange={e => setSelectedPartId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              >
                {spareParts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Còn: {p.quantity})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Số lượng thay</label>
              <input
                type="number"
                value={partQty}
                onChange={e => setPartQty(Number(e.target.value))}
                min={1}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRepair}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white font-bold"
              >
                Lưu Phiếu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
