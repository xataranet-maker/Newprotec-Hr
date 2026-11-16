import React from 'react';
import { AssetRecord } from '../../types';
import { Package } from 'lucide-react';

export const HRAssets: React.FC<{
  data: AssetRecord[];
  onUpdate: (data: AssetRecord[]) => void;
}> = ({ data }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800 px-7 sm:px-0 text-center sm:text-left">
        <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <Package className="w-5 h-5 text-amber-400 shrink-0" />
          <span>Quản Lý Tài Sản &amp; Trang Thiết Bị Hành Chính</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        {data.length === 0 ? (
          <div className="py-8 text-center text-slate-500">Chưa có tài sản nào được đăng ký.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {data.map(a => (
              <div key={a.id} className="py-2.5 flex justify-between text-slate-300">
                <span className="font-bold text-white">{a.name} ({a.code})</span>
                <span className="font-mono text-cyan-400">{a.quantity} {a.unit}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
