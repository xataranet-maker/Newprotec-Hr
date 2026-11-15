import React, { useState } from 'react';
import { ImportRecord, NetDataRecord } from '../../types';
import { Download, Plus, Search, Trash2 } from 'lucide-react';

interface StampingImportProps {
  onAddBatch: (records: any[]) => void;
  recentRecords: ImportRecord[];
  netData: NetDataRecord[];
}

export const StampingImport: React.FC<StampingImportProps> = ({
  onAddBatch,
  recentRecords,
  netData
}) => {
  const [model, setModel] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [quantity, setQuantity] = useState<number>(3000);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !lotNo) return;
    onAddBatch([{
      model,
      code: `ST-${model}`,
      lotNo,
      quantity,
      stage: 'DẬP CUỘN',
      department: 'STAMPING',
      productionStatus: 'PENDING',
      isVerified: true
    }]);
    setLotNo('');
  };

  const filtered = recentRecords.filter(r =>
    r.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.lotNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-400" />
          <span>Nhập Cuộn Nguyên Liệu Dập Tự Động</span>
        </h2>
        <p className="text-xs text-slate-400">Đăng ký cuộn tôn, phôi lá kim loại đầu vào theo mét chiều dài.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleAdd} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div className="font-bold text-sm text-white">Nhập Cuộn Mới</div>
          <div>
            <label className="block text-slate-300 mb-1">Model Dập</label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              required
            >
              <option value="">-- Chọn Model --</option>
              {netData.map(n => <option key={n.id} value={n.model}>{n.model}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Mã Lô Cuộn (Lot No)</label>
            <input
              type="text"
              value={lotNo}
              onChange={e => setLotNo(e.target.value)}
              placeholder="VD: CUON-202611-001"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Chiều Dài Cuộn (Mét)</label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>

          <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer">
            Nhập Cuộn
          </button>
        </form>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs">
          <div className="font-bold text-white mb-3">Sổ Nhập Cuộn Gần Đây</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2">Thời Gian</th>
                  <th className="py-2">Model</th>
                  <th className="py-2">Lot Cuộn</th>
                  <th className="py-2 text-right">Chiều Dài (M)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td className="py-2 font-mono text-slate-400">{r.date}</td>
                    <td className="py-2 font-bold text-white">{r.model}</td>
                    <td className="py-2 font-mono text-cyan-400">{r.lotNo}</td>
                    <td className="py-2 text-right font-mono text-emerald-400 font-bold">{r.quantity.toLocaleString()} M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
