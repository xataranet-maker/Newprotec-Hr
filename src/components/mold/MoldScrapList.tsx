import React from 'react';
import { ScrapRecord } from '../../types';
import { Trash2 } from 'lucide-react';

export const MoldScrapList: React.FC<{ data: ScrapRecord[] }> = ({ data }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-400" />
          <span>Danh Sách Phế Phẩm Khuôn & Jig</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        {data.length === 0 ? (
          <div className="py-8 text-center text-slate-500">Chưa có khuôn hoặc jig nào bị báo phế.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {data.map(s => (
              <div key={s.id} className="py-2.5 flex justify-between text-slate-300">
                <div>
                  <span className="font-bold text-white">{s.moldNo}</span> · <span className="text-red-400 font-semibold">{s.reason}</span>
                </div>
                <div className="font-mono text-slate-400">{s.date} ({s.operator})</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
