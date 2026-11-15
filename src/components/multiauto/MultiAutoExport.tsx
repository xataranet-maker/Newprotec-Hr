import React, { useState } from 'react';
import { ExportRecord, NetDataRecord, ImportRecord, ProductionHistoryRecord } from '../../types';
import { Upload, Plus, Search, PackageCheck } from 'lucide-react';

interface MultiAutoExportProps {
  onAddBatch: (records: any[]) => void;
  recentRecords: ExportRecord[];
  netData: NetDataRecord[];
  importData?: ImportRecord[];
  exportData?: ExportRecord[];
  historyData?: ProductionHistoryRecord[];
}

export const MultiAutoExport: React.FC<MultiAutoExportProps> = ({
  onAddBatch,
  recentRecords,
  netData
}) => {
  const [model, setModel] = useState('');
  const [code, setCode] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [quantity, setQuantity] = useState<number>(500);
  const [stage, setStage] = useState('1L-1');
  const [note, setNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleModelChange = (m: string) => {
    setModel(m);
    const matched = netData.find(n => n.model === m);
    if (matched) {
      setCode(matched.code);
      setStage(matched.stage || '1L-1');
    }
  };

  const handleExport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !lotNo || quantity <= 0) return;

    onAddBatch([{
      model,
      code,
      lotNo,
      quantity,
      stage,
      note
    }]);

    setLotNo('');
    setNote('');
  };

  const filtered = recentRecords.filter(r =>
    r.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.lotNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-amber-500" />
          <span>Xuất Kho Thành Phẩm PNL (Multi Auto Export)</span>
        </h2>
        <p className="text-xs text-slate-400">
          Đăng ký phiếu xuất kho chuyển hàng sang công đoạn tiếp theo hoặc xuất giao khách hàng.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleExport} className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <div className="font-bold text-sm text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Plus className="w-4 h-4 text-amber-500" />
            <span>Tạo Phiếu Xuất Kho</span>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Model Sản Phẩm</label>
            <select
              value={model}
              onChange={e => handleModelChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              required
            >
              <option value="">-- Chọn Model --</option>
              {netData.map(n => (
                <option key={n.id} value={n.model}>{n.model} ({n.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Mã Sản Phẩm (Code)</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Mã Lô Xuất (Lot No)</label>
            <input
              type="text"
              value={lotNo}
              onChange={e => setLotNo(e.target.value)}
              placeholder="VD: LOT-202611-001"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Số Lượng Xuất (PNL)</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                min={1}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Công Đoạn</label>
              <input
                type="text"
                value={stage}
                onChange={e => setStage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Ghi Chú Xuất Hàng</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Giao phòng kiểm tra, khách hàng..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors cursor-pointer shadow-md"
          >
            Xác Nhận Xuất Hàng
          </button>
        </form>

        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-amber-400" />
              <span>Sổ Xuất Kho Gần Đây ({recentRecords.length})</span>
            </span>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm Model, Lot..."
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                  <th className="py-2 px-2.5">Thời Gian</th>
                  <th className="py-2 px-2.5">Model</th>
                  <th className="py-2 px-2.5">Lot No</th>
                  <th className="py-2 px-2.5 text-right">Số Lượng (PNL)</th>
                  <th className="py-2 px-2.5">Công Đoạn</th>
                  <th className="py-2 px-2.5">Ghi Chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Chưa có phiếu xuất kho nào.
                    </td>
                  </tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-2.5 font-mono text-slate-400">{r.timestamp || r.date}</td>
                      <td className="py-2 px-2.5 font-bold text-white font-mono">{r.model}</td>
                      <td className="py-2 px-2.5 font-mono text-cyan-400">{r.lotNo}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-400">
                        {r.quantity.toLocaleString()}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-slate-300">{r.stage}</td>
                      <td className="py-2 px-2.5 text-slate-400">{r.note || 'Xuất xưởng'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
