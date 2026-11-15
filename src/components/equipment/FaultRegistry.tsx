import React, { useState } from 'react';
import { FaultRecord, Language } from '../../types';
import { Siren, Plus, Trash2 } from 'lucide-react';

export const FaultRegistry: React.FC<{
  data: FaultRecord[];
  onUpdate: (data: FaultRecord[]) => void;
  language?: Language;
}> = ({ data, onUpdate }) => {
  const [errorName, setErrorName] = useState('');
  const [cause, setCause] = useState('');
  const [solution, setSolution] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!errorName) return;
    onUpdate([...data, {
      id: Date.now(),
      errorName,
      cause,
      solution
    }]);
    setErrorName('');
    setCause('');
    setSolution('');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Siren className="w-5 h-5 text-red-400" />
          <span>Danh Mục Mã Lỗi & Hướng Dẫn Xử Lý (Troubleshooting)</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <form onSubmit={handleAdd} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
          <div className="font-bold text-white">Thêm Mã Lỗi Mới</div>
          <div>
            <label className="block text-slate-300 mb-1">Tên lỗi</label>
            <input
              type="text"
              value={errorName}
              onChange={e => setErrorName(e.target.value)}
              placeholder="VD: Lỗi áp suất khí thấp"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Nguyên nhân</label>
            <input
              type="text"
              value={cause}
              onChange={e => setCause(e.target.value)}
              placeholder="Rò rỉ ống dẫn khí..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Biện pháp xử lý</label>
            <input
              type="text"
              value={solution}
              onChange={e => setSolution(e.target.value)}
              placeholder="Siết lại cút nối, thay van..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              required
            />
          </div>
          <button type="submit" className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg cursor-pointer">
            Lưu Mã Lỗi
          </button>
        </form>

        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs">
          <div className="font-bold text-white mb-3">Danh Mục Sự Cố Chuẩn ({data.length})</div>
          <div className="divide-y divide-slate-800">
            {data.map(f => (
              <div key={f.id} className="py-2.5 space-y-1 text-slate-300">
                <div className="font-bold text-red-300">{f.errorName}</div>
                <div className="text-slate-400">Nguyên nhân: {f.cause}</div>
                <div className="text-emerald-400">Khắc phục: {f.solution}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
