import React, { useState } from 'react';
import { StaffRecord, AttendanceRecord, OvertimeRecord, AttendanceStatus } from '../../types';
import { 
  Users, Search, Filter, Phone, Building, Clock, 
  AlertTriangle, CheckCircle2, LayoutGrid, Table 
} from 'lucide-react';

interface HRStaffManagementProps {
  multiStaff: StaffRecord[];
  setMultiStaff: (s: StaffRecord[]) => void;
  stiffStaff: StaffRecord[];
  setStiffStaff: (s: StaffRecord[]) => void;
  moldStaff: StaffRecord[];
  setMoldStaff: (s: StaffRecord[]) => void;
  stampingStaff: StaffRecord[];
  setStampingStaff: (s: StaffRecord[]) => void;
  qualityStaff?: StaffRecord[];
  setQualityStaff?: (s: StaffRecord[]) => void;
  equipmentStaff: StaffRecord[];
  setEquipmentStaff: (s: StaffRecord[]) => void;
  attendanceHistory?: AttendanceRecord[];
  onUpdateAttendanceHistory?: (att: AttendanceRecord[]) => void;
  overtimeRecords?: OvertimeRecord[];
  onUpdateOvertime?: (ot: OvertimeRecord[]) => void;
  contracts?: any[];
  salarySlips?: any[];
  payrollRecords?: any[];
  announcements?: any[];
  timekeepingRecords?: any[];
  attendanceRequests?: any[];
  onRequestCorrection?: (r: any) => void;
  attendanceConfirmations?: any[];
  onUpdateAttendanceConfirmation?: (c: any) => void;
}

export const HRStaffManagement: React.FC<HRStaffManagementProps> = ({
  multiStaff,
  setMultiStaff,
  stiffStaff,
  setStiffStaff,
  moldStaff,
  setMoldStaff,
  stampingStaff,
  setStampingStaff,
  equipmentStaff,
  setEquipmentStaff
}) => {
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  const allStaff = [
    ...multiStaff.map(s => ({ ...s, dept: 'Multi Auto', deptKey: 'MULTI' })),
    ...stiffStaff.map(s => ({ ...s, dept: 'Stiff', deptKey: 'STIFF' })),
    ...stampingStaff.map(s => ({ ...s, dept: 'Dập Tự Động', deptKey: 'STAMPING' })),
    ...moldStaff.map(s => ({ ...s, dept: 'Khuôn & Jig', deptKey: 'MOLD' })),
    ...equipmentStaff.map(s => ({ ...s, dept: 'Thiết Bị', deptKey: 'EQUIPMENT' }))
  ];

  const filtered = allStaff.filter(s => {
    const matchDept = filterDept === 'ALL' || s.dept === filterDept;
    const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || s.attendance === filterStatus;
    return matchDept && matchSearch && matchStatus;
  });

  const handleUpdateStaffAttendance = (employeeId: string, deptKey: string, status: AttendanceStatus) => {
    const updater = (prev: StaffRecord[]) => prev.map(s => {
      if (s.employeeId === employeeId) {
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
    });

    if (deptKey === 'MULTI') setMultiStaff(updater(multiStaff));
    else if (deptKey === 'STIFF') setStiffStaff(updater(stiffStaff));
    else if (deptKey === 'STAMPING') setStampingStaff(updater(stampingStaff));
    else if (deptKey === 'MOLD') setMoldStaff(updater(moldStaff));
    else if (deptKey === 'EQUIPMENT') setEquipmentStaff(updater(equipmentStaff));
  };

  const handleUpdateLateEarly = (employeeId: string, deptKey: string, field: 'lateMinutes' | 'lateIn' | 'earlyMinutes' | 'earlyOut', val: any) => {
    const updater = (prev: StaffRecord[]) => prev.map(s => s.employeeId === employeeId ? { ...s, [field]: val } : s);

    if (deptKey === 'MULTI') setMultiStaff(updater(multiStaff));
    else if (deptKey === 'STIFF') setStiffStaff(updater(stiffStaff));
    else if (deptKey === 'STAMPING') setStampingStaff(updater(stampingStaff));
    else if (deptKey === 'MOLD') setMoldStaff(updater(moldStaff));
    else if (deptKey === 'EQUIPMENT') setEquipmentStaff(updater(equipmentStaff));
  };

  const onTimeCount = allStaff.filter(s => s.attendance === 'Đúng giờ' || s.attendance === 'PRESENT' || s.attendance === 'Đủ công').length;
  const lateCount = allStaff.filter(s => s.attendance === 'Đi muộn').length;
  const earlyCount = allStaff.filter(s => s.attendance === 'Về sớm').length;
  const totalLateMinutes = allStaff.filter(s => s.attendance === 'Đi muộn').reduce((sum, s) => sum + (s.lateMinutes || 30), 0);
  const totalEarlyMinutes = allStaff.filter(s => s.attendance === 'Về sớm').reduce((sum, s) => sum + (s.earlyMinutes || 30), 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Quản Lý Nhân Viên & Điểm Danh Toàn Nhà Máy ({allStaff.length} Nhân Viên)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Tổng hợp hồ sơ nhân sự và theo dõi điểm danh, thời gian đi muộn / về sớm tại các phân xưởng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('CARDS')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'CARDS' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
              title="Dạng thẻ"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'TABLE' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`}
              title="Dạng bảng điểm danh"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên, mã NV..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-hidden"
            />
          </div>

          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="ALL">Tất cả phòng ban</option>
            <option value="Multi Auto">Multi Auto</option>
            <option value="Stiff">Stiff</option>
            <option value="Dập Tự Động">Dập Tự Động</option>
            <option value="Khuôn & Jig">Khuôn & Jig</option>
            <option value="Thiết Bị">Thiết Bị</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Đúng giờ">Đúng giờ</option>
            <option value="Đi muộn">Đi muộn</option>
            <option value="Về sớm">Về sớm</option>
            <option value="Nghỉ phép">Nghỉ phép</option>
            <option value="Nghỉ ốm">Nghỉ ốm</option>
            <option value="Vắng mặt">Vắng mặt</option>
          </select>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Tổng Quân Số</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{allStaff.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Toàn nhà máy</div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl">
          <div className="text-[10px] text-emerald-300 uppercase font-semibold flex items-center justify-between">
            <span>Đúng Giờ</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{onTimeCount}</div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">
            {allStaff.length > 0 ? `${Math.round((onTimeCount / allStaff.length) * 100)}%` : '0%'}
          </div>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl">
          <div className="text-[10px] text-amber-300 uppercase font-semibold flex items-center justify-between">
            <span>Đi Muộn</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{lateCount}</div>
          <div className="text-[10px] text-amber-400/80 mt-0.5 font-mono">
            Tổng trễ: {totalLateMinutes}p
          </div>
        </div>

        <div className="bg-orange-950/30 border border-orange-800/40 p-3 rounded-xl">
          <div className="text-[10px] text-orange-300 uppercase font-semibold flex items-center justify-between">
            <span>Về Sớm</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-xl font-bold font-mono text-orange-400 mt-1">{earlyCount}</div>
          <div className="text-[10px] text-orange-400/80 mt-0.5 font-mono">
            Tổng sớm: {totalEarlyMinutes}p
          </div>
        </div>
      </div>

      {/* Main Staff View */}
      {viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const isLate = s.attendance === 'Đi muộn';
            const isEarly = s.attendance === 'Về sớm';

            return (
              <div 
                key={`${s.deptKey}_${s.employeeId}`} 
                className={`bg-slate-900/90 border rounded-xl p-4 text-xs space-y-2.5 transition-all ${
                  isLate
                    ? 'border-amber-700/60 shadow-xs'
                    : isEarly
                    ? 'border-orange-700/60 shadow-xs'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                      {s.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{s.fullName}</div>
                      <div className="text-[10px] text-cyan-400 font-mono">Mã: {s.employeeId}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700/50">
                    {s.dept}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-slate-300 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chức vụ:</span>
                    <span className="font-medium text-slate-200">{s.position}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số ĐT:</span>
                    <span className="font-mono">{s.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ca:</span>
                    <span className="font-semibold text-amber-300">{s.shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}</span>
                  </div>

                  {/* Attendance Selector */}
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/60">
                    <span className="text-slate-400 font-semibold">Điểm danh:</span>
                    <select
                      value={s.attendance}
                      onChange={e => handleUpdateStaffAttendance(s.employeeId, s.deptKey, e.target.value as AttendanceStatus)}
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

                  {/* CONDITIONAL: NẾU CHỌN ĐI MUỘN */}
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
                            onChange={e => handleUpdateLateEarly(s.employeeId, s.deptKey, 'lateMinutes', parseInt(e.target.value) || 0)}
                            placeholder="VD: 30"
                            className="w-full bg-slate-900 border border-amber-700 rounded px-2 py-1 text-xs text-amber-200 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-amber-200/80 block mb-0.5">Giờ vào thực tế:</label>
                          <input
                            type="time"
                            value={s.lateIn || ''}
                            onChange={e => handleUpdateLateEarly(s.employeeId, s.deptKey, 'lateIn', e.target.value)}
                            className="w-full bg-slate-900 border border-amber-700 rounded px-2 py-1 text-xs text-amber-200 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CONDITIONAL: NẾU CHỌN VỀ SỚM */}
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
                            onChange={e => handleUpdateLateEarly(s.employeeId, s.deptKey, 'earlyMinutes', parseInt(e.target.value) || 0)}
                            placeholder="VD: 30"
                            className="w-full bg-slate-900 border border-orange-700 rounded px-2 py-1 text-xs text-orange-200 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-orange-200/80 block mb-0.5">Giờ về thực tế:</label>
                          <input
                            type="time"
                            value={s.earlyOut || ''}
                            onChange={e => handleUpdateLateEarly(s.employeeId, s.deptKey, 'earlyOut', e.target.value)}
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
      ) : (
        /* TABLE VIEW */
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Mã NV</th>
                  <th className="py-2.5 px-3">Họ và Tên</th>
                  <th className="py-2.5 px-3">Phòng Ban</th>
                  <th className="py-2.5 px-3">Vị Trí</th>
                  <th className="py-2.5 px-3">Ca Làm</th>
                  <th className="py-2.5 px-3">Điểm Danh</th>
                  <th className="py-2.5 px-3">Thời Gian Đi Muộn</th>
                  <th className="py-2.5 px-3">Thời Gian Về Sớm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filtered.map(s => {
                  const isLate = s.attendance === 'Đi muộn';
                  const isEarly = s.attendance === 'Về sớm';

                  return (
                    <tr key={`${s.deptKey}_${s.employeeId}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-cyan-400 font-semibold">{s.employeeId}</td>
                      <td className="py-2.5 px-3 font-bold text-white">{s.fullName}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          {s.dept}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{s.position}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${s.shift === 'DAY' ? 'bg-amber-950/60 text-amber-300' : 'bg-indigo-950/60 text-indigo-300'}`}>
                          {s.shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={s.attendance}
                          onChange={e => handleUpdateStaffAttendance(s.employeeId, s.deptKey, e.target.value as AttendanceStatus)}
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
                          <option value="Đi muộn">Đi muộn</option>
                          <option value="Về sớm">Về sớm</option>
                          <option value="Nghỉ phép">Nghỉ phép</option>
                          <option value="Nghỉ ốm">Nghỉ ốm</option>
                          <option value="Vắng mặt">Vắng mặt</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        {isLate ? (
                          <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/40 px-2 py-1 rounded-md">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <input
                              type="number"
                              min="1"
                              max="480"
                              value={s.lateMinutes || ''}
                              onChange={e => handleUpdateLateEarly(s.employeeId, s.deptKey, 'lateMinutes', parseInt(e.target.value) || 0)}
                              placeholder="Phút"
                              className="w-14 bg-slate-900 border border-amber-700/60 rounded px-1.5 py-0.5 text-xs text-amber-200 font-mono text-center"
                            />
                            <span className="text-[10px] text-amber-300">phút</span>
                            <input
                              type="time"
                              value={s.lateIn || ''}
                              onChange={e => handleUpdateLateEarly(s.employeeId, s.deptKey, 'lateIn', e.target.value)}
                              className="w-18 bg-slate-900 border border-amber-700/60 rounded px-1.5 py-0.5 text-xs text-amber-200 font-mono text-center ml-1"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {isEarly ? (
                          <div className="flex items-center gap-1.5 bg-orange-950/40 border border-orange-800/40 px-2 py-1 rounded-md">
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            <input
                              type="number"
                              min="1"
                              max="480"
                              value={s.earlyMinutes || ''}
                              onChange={e => handleUpdateLateEarly(s.employeeId, s.deptKey, 'earlyMinutes', parseInt(e.target.value) || 0)}
                              placeholder="Phút"
                              className="w-14 bg-slate-900 border border-orange-700/60 rounded px-1.5 py-0.5 text-xs text-orange-200 font-mono text-center"
                            />
                            <span className="text-[10px] text-orange-300">phút</span>
                            <input
                              type="time"
                              value={s.earlyOut || ''}
                              onChange={e => handleUpdateLateEarly(s.employeeId, s.deptKey, 'earlyOut', e.target.value)}
                              className="w-18 bg-slate-900 border border-orange-700/60 rounded px-1.5 py-0.5 text-xs text-orange-200 font-mono text-center ml-1"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
