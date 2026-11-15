import React, { useState } from 'react';
import { ImportRecord, NetDataRecord } from '../../types';
import { Plus, Inbox } from 'lucide-react';

export const MoldImport: React.FC<{
  onAddBatch: (records: any[]) => void;
  recentRecords: ImportRecord[];
  stampingNetData?: NetDataRecord[];
  stiffNetData?: NetDataRecord[];
}> = ({ onAddBatch, recentRecords }) => {
  const [model, setModel] = useState('');
  const [moldNo, setMoldNo] = useState('');
  const [type, setType] = useState<'MOLD' | 'JIG'>('MOLD');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !moldNo) return;
    onAddBatch([{
      model,
      code: `MD-${model}`,
      lotNo: moldNo,
      moldNo,
      quantity: 1,
      stage: type === 'MOLD' ? 'KHUÔN DẬP' : 'JIG GÁ',
      note: type === 'MOLD' ? 'MOLD_ASSET_IMPORT' : 'JIG_ASSET_IMPORT',
      department: 'MOLD',
      currentHits: 0,
      warrantyHits: 500000,
      status: 'GOOD'
    }]);
    setMoldNo('');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-orange-400" />
          <span>Đăng Ký Tài Sản Khuôn & Jig Mới</span>
        </h2>
        <p className="text-xs text-slate-400">Nhập mã định danh, số hit bảo hành và gán model cho bộ khuôn hoặc jig.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <form onSubmit={handleAdd} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div className="font-bold text-white">Đăng Ký Mới</div>
          <div>
            <label className="block text-slate-300 mb-1">Loại Tài Sản</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('MOLD')}
                className={`flex-1 py-1.5 rounded font-bold ${type === 'MOLD' ? 'bg-orange-600 text-white' : 'bg-slate-950 text-slate-400'}`}
              >
                Khuôn (Mold)
              </button>
              <button
                type="button"
                onClick={() => setType('JIG')}
                className={`flex-1 py-1.5 rounded font-bold ${type === 'JIG' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400'}`}
              >
                Jig Gá
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Model Ứng Dụng</label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="VD: SM-S928B"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Mã Số Khuôn/Jig (Mold No)</label>
            <input
              type="text"
              value={moldNo}
              onChange={e => setMoldNo(e.target.value)}
              placeholder="VD: MOLD-01-S928"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>

          <button type="submit" className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg cursor-pointer">
            Đăng Ký Tài Sản
          </button>
        </form>

        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs">
          <div className="font-bold text-white mb-3">Tài Sản Khuôn/Jig Mới Đăng Ký</div>
          <div className="divide-y divide-slate-800">
            {recentRecords.map(r => (
              <div key={r.id} className="py-2.5 flex justify-between">
                <div>
                  <span className="font-bold text-white">{r.model}</span> · <span className="font-mono text-orange-400">{r.moldNo}</span>
                  <div className="text-[10px] text-slate-500">{r.stage}</div>
                </div>
                <div className="text-emerald-400 font-mono">Bảo hành: {r.warrantyHits?.toLocaleString() || 500000} Hits</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
