import React, { useState } from 'react';
import { StaffRecord, AttendanceRecord, AttendanceStatus } from '../../types';
import { Users, Clock, AlertTriangle, CheckCircle2, Search } from 'lucide-react';

export const StampingStaff: React.FC<{
  data: StaffRecord[];
  onUpdate: (data: StaffRecord[]) => void;
  attendanceHistory?: AttendanceRecord[];
  onUpdateAttendanceHistory?: (att: AttendanceRecord[]) => void;
}> = ({ data, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = data.filter(s =>
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdateAttendance = (id: number, status: AttendanceStatus) => {
    onUpdate(data.map(s => {
      if (s.id === id) {
        return {
          ...s,
          attendance: status,
          lateMinutes: status === 'Đi muộn' ? (s.lateMinutes || 30) : undefined,
          lateIn: status === 'Đi muộn' ? (s.lateIn || '08:30') : undefined,
          earlyMinutes: status === 'Về sớm' ? (s.earlyMinutes || 30) : undefined,
          earlyOut: status === 'Về sớm' ? (s.earlyOut || '16:30') : undefined
        };
      }
      return s;
    }));
  };

  const handleUpdateLateEarly = (id: number, field: 'lateMinutes' | 'lateIn' | 'earlyMinutes' | 'earlyOut', val: any) => {
    onUpdate(data.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Quản Lý Nhân Sự & Điểm Danh (Dập Tự Động)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Theo dõi trạng thái có mặt và ghi nhận thời gian đi muộn, về sớm của công nhân viên dập.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, mã NV..."
            className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => {
          const isLate = s.attendance === 'Đi muộn';
          const isEarly = s.attendance === 'Về sớm';

          return (
            <div 
              key={s.id} 
              className={`bg-slate-900/90 border rounded-xl p-4 text-xs space-y-2.5 text-slate-300 transition-all ${
                isLate ? 'border-amber-700/60' : isEarly ? 'border-orange-700/60' : 'border-slate-800'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-white text-sm">{s.fullName}</div>
                  <div className="text-cyan-400 font-mono text-[10px]">Mã: {s.employeeId}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${s.shift === 'DAY' ? 'bg-amber-950/60 text-amber-300' : 'bg-indigo-950/60 text-indigo-300'}`}>
                  {s.shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Vị trí:</span>
                  <span className="font-medium text-slate-200">{s.position}</span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400 font-semibold">Điểm danh:</span>
                  <select
                    value={s.attendance}
                    onChange={e => handleUpdateAttendance(s.id, e.target.value as AttendanceStatus)}
                    className={`font-semibold rounded px-2 py-1 text-xs border cursor-pointer ${
                      s.attendance === 'Đúng giờ'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                        : s.attendance === 'Đi muộn'
                        ? 'bg-amber-950/70 text-amber-300 border-amber-600'
                        : s.attendance === 'Về sớm'
                        ? 'bg-orange-950/70 text-orange-300 border-orange-600'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}
                  >
                    <option value="Đúng giờ">Đúng giờ</option>
                    <option value="Đi muộn">Đi muộn (Muộn giờ)</option>
                    <option value="Về sớm">Về sớm (Sớm giờ)</option>
                    <option value="Nghỉ phép">Nghỉ phép</option>
                    <option value="Nghỉ ốm">Nghỉ ốm</option>
                    <option value="Vắng mặt">Vắng mặt</option>
                  </select>
                </div>

                {/* Conditional late inputs */}
                {isLate && (
                  <div className="mt-2 pt-2 border-t border-amber-800/50 bg-amber-950/40 p-2 rounded-lg space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-amber-300 font-semibold text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Thời gian đi muộn:</span>
                      </span>
                      <span className="text-amber-300 font-mono font-bold">
                        {s.lateMinutes ? `${s.lateMinutes} phút` : ''} 
                        {s.lateIn ? ` (vào ${s.lateIn})` : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-amber-200/80 block mb-0.5">Số phút muộn:</label>
                        <input
                          type="number"
                          min="1"
                          max="480"
                          value={s.lateMinutes || ''}
                          onChange={e => handleUpdateLateEarly(s.id, 'lateMinutes', parseInt(e.target.value) || 0)}
                          placeholder="VD: 30"
                          className="w-full bg-slate-900 border border-amber-700 rounded px-2 py-1 text-xs text-amber-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-amber-200/80 block mb-0.5">Giờ vào thực tế:</label>
                        <input
                          type="time"
                          value={s.lateIn || ''}
                          onChange={e => handleUpdateLateEarly(s.id, 'lateIn', e.target.value)}
                          className="w-full bg-slate-900 border border-amber-700 rounded px-2 py-1 text-xs text-amber-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional early inputs */}
                {isEarly && (
                  <div className="mt-2 pt-2 border-t border-orange-800/50 bg-orange-950/40 p-2 rounded-lg space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-orange-300 font-semibold text-[11px]">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                        <span>Thời gian về sớm:</span>
                      </span>
                      <span className="text-orange-300 font-mono font-bold">
                        {s.earlyMinutes ? `${s.earlyMinutes} phút` : ''} 
                        {s.earlyOut ? ` (về ${s.earlyOut})` : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-orange-200/80 block mb-0.5">Số phút về sớm:</label>
                        <input
                          type="number"
                          min="1"
                          max="480"
                          value={s.earlyMinutes || ''}
                          onChange={e => handleUpdateLateEarly(s.id, 'earlyMinutes', parseInt(e.target.value) || 0)}
                          placeholder="VD: 30"
                          className="w-full bg-slate-900 border border-orange-700 rounded px-2 py-1 text-xs text-orange-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-orange-200/80 block mb-0.5">Giờ về thực tế:</label>
                        <input
                          type="time"
                          value={s.earlyOut || ''}
                          onChange={e => handleUpdateLateEarly(s.id, 'earlyOut', e.target.value)}
                          className="w-full bg-slate-900 border border-orange-700 rounded px-2 py-1 text-xs text-orange-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
