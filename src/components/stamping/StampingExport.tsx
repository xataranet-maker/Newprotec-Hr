import React, { useState } from 'react';
import { ExportRecord, NetDataRecord, ImportRecord, ProductionHistoryRecord } from '../../types';
import { Upload, Plus, Search } from 'lucide-react';

interface StampingExportProps {
  onAddBatch: (records: any[]) => void;
  recentRecords: ExportRecord[];
  netData: NetDataRecord[];
  importData?: ImportRecord[];
  exportData?: ExportRecord[];
  historyData?: ProductionHistoryRecord[];
}

export const StampingExport: React.FC<StampingExportProps> = ({
  onAddBatch,
  recentRecords,
  netData
}) => {
  const [model, setModel] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [quantity, setQuantity] = useState<number>(5000);

  const handleExport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !lotNo) return;
    onAddBatch([{
      model,
      code: `ST-${model}`,
      lotNo,
      quantity,
      stage: 'XUẤT PCS'
    }]);
    setLotNo('');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-400" />
          <span>Xuất Kho Thành Phẩm Dập (Pcs)</span>
        </h2>
        <p className="text-xs text-slate-400">Xuất các dải linh kiện sau khi dập xong sang đóng gói hoặc giao hàng.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleExport} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div className="font-bold text-sm text-white">Xuất Lô Dập Mới</div>
          <div>
            <label className="block text-slate-300 mb-1">Model</label>
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
            <label className="block text-slate-300 mb-1">Mã Lô</label>
            <input
              type="text"
              value={lotNo}
              onChange={e => setLotNo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Số Lượng (Pcs)</label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>

          <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer">
            Xuất Hàng
          </button>
        </form>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs">
          <div className="font-bold text-white mb-3">Lịch Sử Xuất Kho Dập</div>
          <div className="divide-y divide-slate-800">
            {recentRecords.map(r => (
              <div key={r.id} className="py-2.5 flex justify-between">
                <div>
                  <span className="font-bold text-white">{r.model}</span> · <span className="font-mono text-cyan-400">{r.lotNo}</span>
                </div>
                <div className="font-mono text-blue-400 font-bold">{r.quantity.toLocaleString()} Pcs</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
