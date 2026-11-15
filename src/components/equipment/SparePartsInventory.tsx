import React, { useState } from 'react';
import { SparePartRecord } from '../../types';
import { Nut, Plus, Search } from 'lucide-react';

export const SparePartsInventory: React.FC<{
  data: SparePartRecord[];
  onUpdate: (data: SparePartRecord[]) => void;
}> = ({ data, onUpdate }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [unit, setUnit] = useState('Cái');
  const [manufacturer, setManufacturer] = useState('SMC Japan');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    onUpdate([...data, {
      id: Date.now(),
      name,
      code,
      quantity,
      unit,
      manufacturer,
      importDate: new Date().toLocaleDateString('vi-VN'),
      compatibleMachines: ['Multi 01', 'Multi 02', 'Stamp 01'],
      minStock: 5
    }]);
    setName('');
    setCode('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Nut className="w-5 h-5 text-blue-400" />
          <span>Kho Phụ Tùng Thay Thế & Vật Tư Tiêu Hao (Spare Parts)</span>
        </h2>
        <p className="text-xs text-slate-400">Quản lý định mức tồn kho an toàn các linh kiện van khí, cảm biến, thanh nhiệt.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <form onSubmit={handleAdd} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div className="font-bold text-white">Nhập Thêm Phụ Tùng</div>
          <div>
            <label className="block text-slate-300 mb-1">Tên phụ tùng</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="VD: Xy lanh khí nén SMC..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Mã phụ tùng (Part Code)</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="VD: SP-SMC-01"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-300 mb-1">Số lượng</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Đơn vị</label>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer">
            Nhập Kho Phụ Tùng
          </button>
        </form>

        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs">
          <div className="font-bold text-white mb-3">Tồn Kho Phụ Tùng Hiện Tại ({data.length} Mã)</div>
          <div className="divide-y divide-slate-800">
            {data.map(p => (
              <div key={p.id} className="py-2.5 flex justify-between items-center text-slate-300">
                <div>
                  <div className="font-bold text-white">{p.name}</div>
                  <div className="text-[11px] text-cyan-400 font-mono">Mã: {p.code} · Hãng: {p.manufacturer}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-emerald-400 font-bold text-sm">{p.quantity} {p.unit}</div>
                  <div className="text-[10px] text-slate-500 font-mono">Tối thiểu: {p.minStock || 5}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
