import React from 'react';
import { SalarySlipRecord, StaffRecord } from '../../types';
import { Banknote } from 'lucide-react';

export const HRSalarySlip: React.FC<{
  salarySlips: SalarySlipRecord[];
  setSalarySlips: (s: SalarySlipRecord[]) => void;
  allStaff: StaffRecord[];
}> = ({ salarySlips }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Banknote className="w-5 h-5 text-emerald-400" />
          <span>Quản Lý Phiếu Lương Điện Tử (Salary Slips)</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        {salarySlips.length === 0 ? (
          <div className="py-8 text-center text-slate-500">Chưa có phiếu lương nào được phát hành.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {salarySlips.map(s => (
              <div key={s.id} className="py-2.5 flex justify-between text-slate-300">
                <span className="font-bold text-white">{s.month} - Mã NV: {s.employeeId}</span>
                <span className="font-mono text-slate-400">{s.uploadDate}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
