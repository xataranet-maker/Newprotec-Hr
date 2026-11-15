import React, { useState } from 'react';
import { ToolRecord } from '../../types';
import { Hammer, Plus, Trash2 } from 'lucide-react';

export const DeviceToolManagement: React.FC<{
  data: ToolRecord[];
  onUpdate: (data: ToolRecord[]) => void;
}> = ({ data, onUpdate }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('Dụng cụ cầm tay');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    onUpdate([...data, {
      id: Date.now(),
      name,
      code,
      type,
      quantity: 1,
      status: 'GOOD',
      importDate: new Date().toLocaleDateString('vi-VN')
    }]);
    setName('');
    setCode('');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Hammer className="w-5 h-5 text-orange-400" />
          <span>Đăng Ký & Quản Lý Công Cụ Thiết Bị (Tool Registry)</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <form onSubmit={handleAdd} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div className="font-bold text-white">Thêm Công Cụ Mới</div>
          <div>
            <label className="block text-slate-300 mb-1">Tên công cụ</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="VD: Cờ lê lực..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Mã định danh</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="VD: TL-01"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>
          <button type="submit" className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg cursor-pointer">
            Đăng Ký Công Cụ
          </button>
        </form>

        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs">
          <div className="font-bold text-white mb-3">Danh Sách Công Cụ Hiện Có ({data.length})</div>
          <div className="divide-y divide-slate-800">
            {data.map(t => (
              <div key={t.id} className="py-2.5 flex justify-between">
                <div>
                  <span className="font-bold text-white">{t.name}</span> · <span className="font-mono text-cyan-400">{t.code}</span>
                  <div className="text-[10px] text-slate-500">{t.type}</div>
                </div>
                <div className="text-emerald-400 font-mono">{t.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
