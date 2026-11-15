import React, { useState } from 'react';
import { AccessoryRecord, NetDataRecord } from '../../types';
import { Layers, Plus, Trash2, Search, Package } from 'lucide-react';

interface MultiAutoAccessoriesImportProps {
  onAddBatch: (records: any[]) => void;
  recentRecords: AccessoryRecord[];
  netData: NetDataRecord[];
  onDelete?: (id: number) => void;
  onUpdate?: (record: AccessoryRecord) => void;
}

export const MultiAutoAccessoriesImport: React.FC<MultiAutoAccessoriesImportProps> = ({
  onAddBatch,
  recentRecords,
  netData,
  onDelete
}) => {
  const [model, setModel] = useState('');
  const [code, setCode] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [quantity, setQuantity] = useState<number>(2000);
  const [stage, setStage] = useState('1L-1');
  const [expirationDate, setExpirationDate] = useState('2027-12-31');
  const [searchTerm, setSearchTerm] = useState('');

  const handleModelChange = (m: string) => {
    setModel(m);
    const matched = netData.find(n => n.model === m);
    if (matched) {
      setCode(matched.code);
      setStage(matched.stage || '1L-1');
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !lotNo || quantity <= 0) return;

    onAddBatch([{
      model,
      code,
      lotNo,
      quantity,
      stage,
      expirationDate,
      isVerified: false
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
          <Layers className="w-5 h-5 text-blue-400" />
          <span>Nhập Phụ Liệu (Tape, Film, Cuộn Ép)</span>
        </h2>
        <p className="text-xs text-slate-400">
          Đăng ký lô cuộn phụ liệu đầu vào để chuẩn bị cấp phát cho các máy dán ép tự động.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleAdd} className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <div className="font-bold text-sm text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Plus className="w-4 h-4 text-blue-400" />
            <span>Đăng Ký Lô Phụ Liệu</span>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Model Sử Dụng</label>
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
            <label className="block text-slate-300 font-medium mb-1">Mã Phụ Liệu (Code)</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Số Lô Phụ Liệu (Lot PL)</label>
            <input
              type="text"
              value={lotNo}
              onChange={e => setLotNo(e.target.value)}
              placeholder="VD: PL-TAPE-092"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Số Lượng (Cuộn/Pcs)</label>
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
            <label className="block text-slate-300 font-medium mb-1">Hạn Sử Dụng (Expiration)</label>
            <input
              type="date"
              value={expirationDate}
              onChange={e => setExpirationDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors cursor-pointer shadow-md"
          >
            Nhập Lô Phụ Liệu
          </button>
        </form>

        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              <span>Sổ Nhập Phụ Liệu Gần Đây ({recentRecords.length})</span>
            </span>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm LOT PL, model..."
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
                  <th className="py-2 px-2.5">Lot PL</th>
                  <th className="py-2 px-2.5 text-right">Số Lượng</th>
                  <th className="py-2 px-2.5">Hạn Sử Dụng</th>
                  <th className="py-2 px-2.5">Kiểm Duyệt</th>
                  <th className="py-2 px-2.5 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Chưa có lô phụ liệu nào trong sổ.
                    </td>
                  </tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-2.5 font-mono text-slate-400">{r.timestamp || r.date}</td>
                      <td className="py-2 px-2.5 font-bold text-white">{r.model}</td>
                      <td className="py-2 px-2.5 font-mono text-purple-400 font-bold">{r.lotNo}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold">{r.quantity.toLocaleString()}</td>
                      <td className="py-2 px-2.5 font-mono text-slate-300">{r.expirationDate || 'N/A'}</td>
                      <td className="py-2 px-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          r.isVerified ? 'bg-emerald-950/60 text-emerald-400' : 'bg-amber-950/60 text-amber-400'
                        }`}>
                          {r.isVerified ? 'Đã duyệt' : 'Chờ kiểm'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        {onDelete && (
                          <button
                            onClick={() => onDelete(r.id)}
                            className="p-1 rounded text-red-400 hover:bg-red-950/40 cursor-pointer"
                            title="Xóa phụ liệu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
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
