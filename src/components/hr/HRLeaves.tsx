import React from 'react';
import { StaffRecord } from '../../types';
import { Plane } from 'lucide-react';

export const HRLeaves: React.FC<{ allStaff: StaffRecord[] }> = ({ allStaff }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800 px-7 sm:px-0 text-center sm:text-left">
        <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <Plane className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>Quản Lý Nghỉ Phép &amp; Nghỉ Việc Riêng</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        <div className="divide-y divide-slate-800">
          {allStaff.map(s => (
            <div key={s.id} className="py-2.5 flex justify-between text-slate-300">
              <span className="font-bold text-white">{s.fullName} ({s.employeeId})</span>
              <span className="font-mono text-cyan-400">Phép năm còn: 12 ngày</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
