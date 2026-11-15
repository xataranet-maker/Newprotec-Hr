import React from 'react';
import { TrainingRecord } from '../../types';
import { GraduationCap } from 'lucide-react';

export const HRTraining: React.FC<{
  data: TrainingRecord[];
  onUpdate: (data: TrainingRecord[]) => void;
}> = ({ data }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-400" />
          <span>Hồ Sơ Đào Tạo An Toàn & Quy Trình Sản Xuất</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        {data.length === 0 ? (
          <div className="py-8 text-center text-slate-500">Chưa có khóa đào tạo nào được ghi nhận.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {data.map(t => (
              <div key={t.id} className="py-2.5 flex justify-between text-slate-300">
                <span className="font-bold text-white">{t.title}</span>
                <span className="font-mono text-slate-400">{t.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
