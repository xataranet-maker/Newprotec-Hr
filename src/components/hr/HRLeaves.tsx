import React from 'react';
import { LeaveRegistrationRecord, StaffRecord } from '../../types';
import { computeAnnualLeaveUsed } from './LeaveFormNPTFM007';
import { CalendarPlus, Plane } from 'lucide-react';

interface HRLeavesProps {
  allStaff: StaffRecord[];
  leaveRecords?: LeaveRegistrationRecord[];
  onNavigateToRegister?: () => void;
}

export const HRLeaves: React.FC<HRLeavesProps> = ({
  allStaff,
  leaveRecords = [],
  onNavigateToRegister,
}) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800 px-2 sm:px-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center gap-2">
          <Plane className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>Quản Lý Nghỉ Phép &amp; Quỹ Phép Năm</span>
        </h2>
        {onNavigateToRegister && (
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Mở Tab Đăng Ký Phép (NPT-FM-007)</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        <div className="divide-y divide-slate-800">
          {allStaff.map((s) => {
            const usedAnnual = computeAnnualLeaveUsed(leaveRecords, s.employeeId);
            const remaining = Math.max(0, 12 - usedAnnual);
            const totalRequests = leaveRecords.filter(
              (r) =>
                r.employeeId.trim().toLowerCase() ===
                s.employeeId.trim().toLowerCase()
            ).length;

            return (
              <div
                key={s.id}
                className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-slate-300"
              >
                <div>
                  <span className="font-bold text-white">{s.fullName}</span>{' '}
                  <span className="font-mono text-cyan-400">({s.employeeId})</span>
                  <span className="ml-2 text-slate-500">
                    {s.department || 'MULTI'} · {s.position || 'Nhân viên'}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-400">
                    Đã đk: <strong className="text-slate-200">{totalRequests}</strong> đơn
                  </span>
                  <span className="text-amber-300">
                    Đã dùng phép năm: <strong>{usedAnnual}</strong> ngày
                  </span>
                  <span className="text-cyan-400 font-bold">
                    Phép năm còn: {remaining} ngày
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
