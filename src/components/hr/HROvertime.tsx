import React from 'react';
import { OvertimeRecord, StaffRecord } from '../../types';
import { Timer } from 'lucide-react';

export const HROvertime: React.FC<{
  allStaff: StaffRecord[];
  overtimeRecords: OvertimeRecord[];
  onUpdateOvertime: (ot: OvertimeRecord[]) => void;
}> = ({ overtimeRecords }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800 px-7 sm:px-0 text-center sm:text-left">
        <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <Timer className="w-5 h-5 text-orange-400 shrink-0" />
          <span>Quản Lý Đăng Ký Giờ Tăng Ca (Overtime)</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        {overtimeRecords.length === 0 ? (
          <div className="py-8 text-center text-slate-500">Chưa có bản ghi tăng ca nào.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {overtimeRecords.map(o => (
              <div key={o.id} className="py-2.5 flex justify-between text-slate-300">
                <div>
                  <span className="font-bold text-white">{o.staffName}</span> ({o.employeeId}) · <span className="text-slate-400">{o.reason}</span>
                </div>
                <div className="font-mono text-cyan-400 font-bold">+{o.hours} Giờ ({o.date})</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
