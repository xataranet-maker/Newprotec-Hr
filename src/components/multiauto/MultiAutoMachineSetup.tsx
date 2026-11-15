import React, { useState } from 'react';
import { MachineSetup, StaffRecord, FaultRecord, MachineNoteType } from '../../types';
import { Settings, Plus, Trash2, Edit2, CheckCircle2, User, Wrench } from 'lucide-react';

interface MultiAutoMachineSetupProps {
  machines: MachineSetup[];
  onUpdate: (machines: MachineSetup[]) => void;
  staffData: StaffRecord[];
  faultRecords?: FaultRecord[];
}

export const MultiAutoMachineSetup: React.FC<MultiAutoMachineSetupProps> = ({
  machines,
  onUpdate,
  staffData
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState<MachineNoteType>('NORMAL');
  const [staffDay, setStaffDay] = useState('');
  const [staffNight, setStaffNight] = useState('');
  const [description, setDescription] = useState('');

  const handleEdit = (m: MachineSetup) => {
    setEditingId(m.id);
    setName(m.name);
    setNote(m.note);
    setStaffDay(m.staffDay || '');
    setStaffNight(m.staffNight || '');
    setDescription(m.description || '');
  };

  const handleSave = (id: number) => {
    onUpdate(machines.map(m => m.id === id ? {
      ...m,
      name,
      note,
      staffDay,
      staffNight,
      description,
      updatedAt: new Date().toLocaleTimeString('vi-VN')
    } : m));
    setEditingId(null);
  };

  const handleAddMachine = () => {
    const nextNum = machines.length + 1;
    const newMachine: MachineSetup = {
      id: Date.now(),
      name: `Multi ${String(nextNum).padStart(2, '0')}`,
      description: 'Máy dán ép tự động',
      note: 'NORMAL',
      updatedAt: new Date().toLocaleTimeString('vi-VN'),
      staffDay: staffData[0]?.fullName || '',
      staffNight: staffData[1]?.fullName || ''
    };
    onUpdate([...machines, newMachine]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" />
            <span>Đăng Ký & Cấu Hình Máy (DK Máy Multi Auto)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Quản lý danh sách máy, trạng thái sẵn sàng và phân công kỹ thuật viên phụ trách theo ca.
          </p>
        </div>

        <button
          onClick={handleAddMachine}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Máy Mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {machines.map(m => {
          const isEditing = editingId === m.id;

          return (
            <div
              key={m.id}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="bg-slate-950 border border-cyan-500 rounded px-2 py-1 text-white font-bold"
                  />
                ) : (
                  <span className="font-bold text-white text-sm">{m.name}</span>
                )}

                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  m.note === 'NORMAL' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' :
                  m.note === 'BROKEN' ? 'bg-red-950 text-red-400 border border-red-800/40' :
                  'bg-amber-950 text-amber-400 border border-amber-800/40'
                }`}>
                  {m.note}
                </span>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-slate-400 text-[10px] block">Trạng thái:</label>
                    <select
                      value={note}
                      onChange={e => setNote(e.target.value as MachineNoteType)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200"
                    >
                      <option value="NORMAL">NORMAL (Bình thường)</option>
                      <option value="BROKEN">BROKEN (Hỏng hóc)</option>
                      <option value="WAITING_MATERIAL">WAITING_MATERIAL (Chờ liệu)</option>
                      <option value="NO_STOCK">NO_STOCK (Hết đơn)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block">Trực Ca Ngày:</label>
                    <select
                      value={staffDay}
                      onChange={e => setStaffDay(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200"
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {staffData.map(s => (
                        <option key={s.id} value={s.fullName}>{s.fullName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block">Trực Ca Đêm:</label>
                    <select
                      value={staffNight}
                      onChange={e => setStaffNight(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200"
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {staffData.map(s => (
                        <option key={s.id} value={s.fullName}>{s.fullName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-1.5 pt-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => handleSave(m.id)}
                      className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ca Ngày:</span>
                    <span className="font-semibold text-slate-200">{m.staffDay || 'Chưa gán'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ca Đêm:</span>
                    <span className="font-semibold text-slate-200">{m.staffNight || 'Chưa gán'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    Cập nhật: {m.updatedAt || '08:00:00'}
                  </div>

                  <button
                    onClick={() => handleEdit(m)}
                    className="w-full py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 text-xs font-medium cursor-pointer transition-colors mt-2"
                  >
                    Chỉnh Sửa Phân Công
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
