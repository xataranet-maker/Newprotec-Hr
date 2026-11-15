import React, { useState } from 'react';
import { StaffRecord, AttendanceRecord, AttendanceStatus } from '../../types';
import { 
  StickyNote, Calendar, Clock, AlertTriangle, CheckCircle2, 
  Search, Users, Filter, Check, Save
} from 'lucide-react';

export const HRAttendanceDiary: React.FC<{
  allStaff: StaffRecord[];
  attendanceHistory?: AttendanceRecord[];
  onUpdateHistory?: (h: AttendanceRecord[]) => void;
}> = ({ allStaff, attendanceHistory = [], onUpdateHistory }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('vi-VN'));
  const [selectedShift, setSelectedShift] = useState<'DAY' | 'NIGHT'>('DAY');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Local state for today's diary attendance marks
  const [diaryRecords, setDiaryRecords] = useState<Record<string, {
    status: AttendanceStatus;
    lateMinutes?: number;
    lateIn?: string;
    earlyMinutes?: number;
    earlyOut?: string;
    note?: string;
  }>>(() => {
    const initial: Record<string, any> = {};
    allStaff.forEach(s => {
      initial[s.employeeId] = {
        status: s.attendance || 'Đúng giờ',
        lateMinutes: s.lateMinutes || (s.attendance === 'Đi muộn' ? 30 : undefined),
        lateIn: s.lateIn || (s.attendance === 'Đi muộn' ? '08:30' : undefined),
        earlyMinutes: s.earlyMinutes || (s.attendance === 'Về sớm' ? 30 : undefined),
        earlyOut: s.earlyOut || (s.attendance === 'Về sớm' ? '16:30' : undefined),
        note: s.note || ''
      };
    });
    return initial;
  });

  const filteredStaff = allStaff.filter(s => {
    const matchDept = filterDept === 'ALL' || s.department === filterDept;
    const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchDept && matchSearch;
  });

  const handleUpdateStatus = (empId: string, status: AttendanceStatus) => {
    setDiaryRecords(prev => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {}),
        status,
        lateMinutes: status === 'Đi muộn' ? (prev[empId]?.lateMinutes || 30) : undefined,
        lateIn: status === 'Đi muộn' ? (prev[empId]?.lateIn || '08:30') : undefined,
        earlyMinutes: status === 'Về sớm' ? (prev[empId]?.earlyMinutes || 30) : undefined,
        earlyOut: status === 'Về sớm' ? (prev[empId]?.earlyOut || '16:30') : undefined
      }
    }));
  };

  const handleUpdateField = (empId: string, field: string, value: any) => {
    setDiaryRecords(prev => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || { status: 'Đúng giờ' }),
        [field]: value
      }
    }));
  };

  const handleSaveDiary = () => {
    if (!onUpdateHistory) {
      setSaveToast('Đã lưu nhật ký điểm danh vào bộ nhớ ca trực thành công!');
      setTimeout(() => setSaveToast(null), 3000);
      return;
    }

    const newHistoryRecords: AttendanceRecord[] = filteredStaff.map(s => {
      const entry = diaryRecords[s.employeeId] || { status: 'Đúng giờ' };
      return {
        id: `${s.employeeId}_${selectedDate}_${selectedShift}`,
        date: selectedDate,
        employeeId: s.employeeId,
        shift: selectedShift,
        status: entry.status,
        overtime: 0,
        lateMinutes: entry.lateMinutes,
        lateIn: entry.lateIn,
        earlyMinutes: entry.earlyMinutes,
        earlyOut: entry.earlyOut,
        note: entry.note
      };
    });

    onUpdateHistory([...newHistoryRecords, ...attendanceHistory]);
    setSaveToast(`Đã lưu nhật ký điểm danh ngày ${selectedDate} (${selectedShift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}) thành công!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Stats calculation
  const total = filteredStaff.length;
  const onTime = filteredStaff.filter(s => (diaryRecords[s.employeeId]?.status || s.attendance) === 'Đúng giờ').length;
  const late = filteredStaff.filter(s => (diaryRecords[s.employeeId]?.status || s.attendance) === 'Đi muộn');
  const early = filteredStaff.filter(s => (diaryRecords[s.employeeId]?.status || s.attendance) === 'Về sớm');
  const totalLateMins = late.reduce((sum, s) => sum + (diaryRecords[s.employeeId]?.lateMinutes || 30), 0);
  const totalEarlyMins = early.reduce((sum, s) => sum + (diaryRecords[s.employeeId]?.earlyMinutes || 30), 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-purple-400" />
            <span>Nhật Ký Điểm Danh & Quân Số Hàng Ngày</span>
          </h2>
          <p className="text-xs text-slate-400">
            Ghi nhận điểm danh thực tế theo ca, nhập thời gian đi muộn / về sớm và lưu nhật ký điểm danh toàn nhà máy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-200 font-mono w-24 focus:outline-hidden"
              placeholder="DD/MM/YYYY"
            />
          </div>

          <select
            value={selectedShift}
            onChange={e => setSelectedShift(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="DAY">Ca Ngày (08:00 - 20:00)</option>
            <option value="NIGHT">Ca Đêm (20:00 - 08:00)</option>
          </select>

          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="ALL">Tất cả bộ phận</option>
            <option value="MULTI">Multi Auto</option>
            <option value="STIFF">Stiff</option>
            <option value="STAMPING">Dập Tự Động</option>
            <option value="MOLD">Khuôn & Jig</option>
            <option value="EQUIPMENT">Thiết Bị</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm mã / tên NV..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-hidden"
            />
          </div>

          <button
            onClick={handleSaveDiary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Nhật Ký</span>
          </button>
        </div>
      </div>

      {saveToast && (
        <div className="bg-emerald-950/80 border border-emerald-700/80 p-3 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Tổng Quân Số Ca</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{selectedShift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}</div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl">
          <div className="text-[10px] text-emerald-300 uppercase font-semibold flex items-center justify-between">
            <span>Đúng Giờ</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{onTime}</div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">
            {total > 0 ? `${Math.round((onTime / total) * 100)}% quân số` : '0%'}
          </div>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl">
          <div className="text-[10px] text-amber-300 uppercase font-semibold flex items-center justify-between">
            <span>Đi Muộn</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{late.length}</div>
          <div className="text-[10px] text-amber-400/80 mt-0.5 font-mono">
            Tổng trễ: {totalLateMins} phút
          </div>
        </div>

        <div className="bg-orange-950/30 border border-orange-800/40 p-3 rounded-xl">
          <div className="text-[10px] text-orange-300 uppercase font-semibold flex items-center justify-between">
            <span>Về Sớm</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-xl font-bold font-mono text-orange-400 mt-1">{early.length}</div>
          <div className="text-[10px] text-orange-400/80 mt-0.5 font-mono">
            Tổng sớm: {totalEarlyMins} phút
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Mã NV</th>
                <th className="py-2.5 px-3">Họ và Tên</th>
                <th className="py-2.5 px-3">Bộ Phận</th>
                <th className="py-2.5 px-3">Vị Trí</th>
                <th className="py-2.5 px-3">Trạng Thái Điểm Danh</th>
                <th className="py-2.5 px-3">Thời Gian Đi Muộn</th>
                <th className="py-2.5 px-3">Thời Gian Về Sớm</th>
                <th className="py-2.5 px-3">Ghi Chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredStaff.map(staff => {
                const entry = diaryRecords[staff.employeeId] || { status: staff.attendance || 'Đúng giờ' };
                const isLate = entry.status === 'Đi muộn';
                const isEarly = entry.status === 'Về sớm';

                return (
                  <tr key={staff.employeeId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-cyan-400 font-semibold">{staff.employeeId}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{staff.fullName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {staff.department || 'MULTI'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{staff.position}</td>
                    <td className="py-2.5 px-3">
                      <select
                        value={entry.status}
                        onChange={e => handleUpdateStatus(staff.employeeId, e.target.value as AttendanceStatus)}
                        className={`font-semibold rounded px-2 py-1 text-xs border cursor-pointer ${
                          entry.status === 'Đúng giờ'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                            : entry.status === 'Đi muộn'
                            ? 'bg-amber-950/70 text-amber-300 border-amber-600'
                            : entry.status === 'Về sớm'
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
                    </td>

                    {/* CONDITIONAL: NẾU CHỌN ĐI MUỘN -> XUẤT HIỆN THỜI GIAN ĐI MUỘN */}
                    <td className="py-2.5 px-3">
                      {isLate ? (
                        <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/50 px-2 py-1 rounded-md animate-in fade-in">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <input
                            type="number"
                            min="1"
                            max="480"
                            value={entry.lateMinutes || ''}
                            onChange={e => handleUpdateField(staff.employeeId, 'lateMinutes', parseInt(e.target.value) || 0)}
                            placeholder="Phút"
                            className="w-14 bg-slate-900 border border-amber-700/60 rounded px-1.5 py-0.5 text-xs text-amber-200 font-mono text-center"
                          />
                          <span className="text-[10px] text-amber-300">phút</span>
                          <input
                            type="time"
                            value={entry.lateIn || ''}
                            onChange={e => handleUpdateField(staff.employeeId, 'lateIn', e.target.value)}
                            className="w-18 bg-slate-900 border border-amber-700/60 rounded px-1.5 py-0.5 text-xs text-amber-200 font-mono text-center ml-1"
                            title="Giờ vào thực tế"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs italic">—</span>
                      )}
                    </td>

                    {/* CONDITIONAL: NẾU CHỌN VỀ SỚM -> XUẤT HIỆN THỜI GIAN VỀ SỚM */}
                    <td className="py-2.5 px-3">
                      {isEarly ? (
                        <div className="flex items-center gap-1.5 bg-orange-950/40 border border-orange-800/50 px-2 py-1 rounded-md animate-in fade-in">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <input
                            type="number"
                            min="1"
                            max="480"
                            value={entry.earlyMinutes || ''}
                            onChange={e => handleUpdateField(staff.employeeId, 'earlyMinutes', parseInt(e.target.value) || 0)}
                            placeholder="Phút"
                            className="w-14 bg-slate-900 border border-orange-700/60 rounded px-1.5 py-0.5 text-xs text-orange-200 font-mono text-center"
                          />
                          <span className="text-[10px] text-orange-300">phút</span>
                          <input
                            type="time"
                            value={entry.earlyOut || ''}
                            onChange={e => handleUpdateField(staff.employeeId, 'earlyOut', e.target.value)}
                            className="w-18 bg-slate-900 border border-orange-700/60 rounded px-1.5 py-0.5 text-xs text-orange-200 font-mono text-center ml-1"
                            title="Giờ về thực tế"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs italic">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={entry.note || ''}
                        onChange={e => handleUpdateField(staff.employeeId, 'note', e.target.value)}
                        placeholder="Lý do, ghi chú..."
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:border-cyan-500 focus:outline-hidden"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
