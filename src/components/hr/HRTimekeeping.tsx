import React from 'react';
import { TimekeepingRecord, StaffRecord, AttendanceCorrectionRequest, AttendanceRecord } from '../../types';
import { Clock } from 'lucide-react';

export const HRTimekeeping: React.FC<{
  data: TimekeepingRecord[];
  allStaff: StaffRecord[];
  onUpdate: (data: TimekeepingRecord[]) => void;
  attendanceRequests?: AttendanceCorrectionRequest[];
  onUpdateRequest?: (r: AttendanceCorrectionRequest[]) => void;
  attendanceHistory?: AttendanceRecord[];
}> = ({ data, allStaff }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <span>Dữ Liệu Quẹt Thẻ Chấm Công Tự Động</span>
        </h2>
        <p className="text-xs text-slate-400">Kết nối máy quẹt thẻ vân tay / khuôn mặt tại các cổng bảo vệ nhà xưởng.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
        {data.length === 0 ? (
          <div className="py-8 text-center text-slate-500">Chưa có bản ghi quẹt thẻ nào trong hệ thống.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {data.map(t => (
              <div key={t.id} className="py-2.5 flex justify-between text-slate-300">
                <div>
                  <span className="font-bold text-white">{t.fullName}</span> ({t.employeeId}) · <span className="text-slate-400">{t.department}</span>
                </div>
                <div className="font-mono text-cyan-400">{t.date} {t.time} ({t.attendanceStatus})</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
