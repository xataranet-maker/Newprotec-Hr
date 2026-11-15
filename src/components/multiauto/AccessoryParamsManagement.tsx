import React, { useState } from 'react';
import { AccessoryParameter, NetDataRecord } from '../../types';
import { Ruler, Plus, Trash2, Edit2, Search } from 'lucide-react';

interface AccessoryParamsManagementProps {
  data: AccessoryParameter[];
  onUpdate: (params: AccessoryParameter[]) => void;
  netData: NetDataRecord[];
}

export const AccessoryParamsManagement: React.FC<AccessoryParamsManagementProps> = ({
  data,
  onUpdate,
  netData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [model, setModel] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState('1L-1');
  const [thickness, setThickness] = useState('0.05mm');
  const [width, setWidth] = useState(45);
  const [length, setLength] = useState(150);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model) return;

    const newParam: AccessoryParameter = {
      id: Date.now(),
      model,
      code,
      stage,
      thickness,
      width,
      length,
      capableMachines: [1, 2, 3],
      updatedAt: new Date().toLocaleDateString('vi-VN')
    };

    onUpdate([...data, newParam]);
    setShowAdd(false);
  };

  const filtered = data.filter(p =>
    p.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Ruler className="w-5 h-5 text-amber-400" />
            <span>Quản Lý Thông Số Kỹ Thuật Phụ Liệu (Tape/Film Specs)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Quy định kích thước độ dày, bản rộng, chiều dài cắt và danh sách các máy tương thích.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Quy Cách Mới</span>
        </button>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase">
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Mã Hàng</th>
                <th className="py-2.5 px-3">Công Đoạn</th>
                <th className="py-2.5 px-3">Độ Dày</th>
                <th className="py-2.5 px-3 text-right">Bản Rộng (mm)</th>
                <th className="py-2.5 px-3 text-right">Chiều Dài (mm)</th>
                <th className="py-2.5 px-3">Máy Tương Thích</th>
                <th className="py-2.5 px-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-bold text-white font-mono">{p.model}</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-400">{p.code}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">{p.stage}</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400">{p.thickness}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{p.width} mm</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{p.length} mm</td>
                  <td className="py-2.5 px-3 font-mono text-purple-300">Máy {p.capableMachines.join(', ')}</td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => onUpdate(data.filter(i => i.id !== p.id))}
                      className="p-1 rounded text-red-400 hover:bg-red-950/40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white">Thêm Quy Cách Phụ Liệu</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Model</label>
                <select
                  value={model}
                  onChange={e => {
                    setModel(e.target.value);
                    const m = netData.find(n => n.model === e.target.value);
                    if (m) setCode(m.code);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  required
                >
                  <option value="">-- Chọn Model --</option>
                  {netData.map(n => <option key={n.id} value={n.model}>{n.model}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Độ dày</label>
                <input
                  type="text"
                  value={thickness}
                  onChange={e => setThickness(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Rộng (mm)</label>
                  <input
                    type="number"
                    value={width}
                    onChange={e => setWidth(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Dài (mm)</label>
                  <input
                    type="number"
                    value={length}
                    onChange={e => setLength(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white font-bold"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
