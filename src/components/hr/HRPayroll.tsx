import React from 'react';
import { PayrollRecord, StaffRecord } from '../../types';
import { ClipboardCheck } from 'lucide-react';

export const HRPayroll: React.FC<{
  payrollRecords: PayrollRecord[];
  setPayrollRecords: (p: PayrollRecord[]) => void;
  allStaff: StaffRecord[];
}> = ({ payrollRecords }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-emerald-400" />
          <span>Bảng Chấm Công Tổng Hợp Tháng</span>
        </h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        {payrollRecords.length === 0 ? (
          <div className="py-8 text-center text-slate-500">Chưa có bảng công tháng nào được tải lên.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {payrollRecords.map(p => (
              <div key={p.id} className="py-2.5 flex justify-between text-slate-300">
                <span className="font-bold text-white">{p.month} - {p.department}</span>
                <span className="font-mono text-slate-400">{p.uploadDate}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
