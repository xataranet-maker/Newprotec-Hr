import React, { useState } from 'react';
import { StaffRecord, AttendanceRecord, OvertimeRecord, AttendanceStatus, StaffLockType } from '../../types';
import { 
  Users, Plus, Search, CheckCircle2, Clock, Phone, 
  AlertTriangle, ArrowRight, LayoutGrid, Table, Calendar, Check, X,
  QrCode, ShieldCheck, ShieldOff, Lock, Unlock
} from 'lucide-react';
import { formatDateDDMMYYYY, resolveStaffLockType, syncStaffLockToMatrices } from '../../lib/matrixTimekeeping';
import { isStaffQrEnabled, generateStaffQrToken, getStaffQrToken } from '../../lib/staffQr';
import { EmployeeQRModal } from '../common/EmployeeQRModal';
import { EmployeeLockModal } from '../common/EmployeeLockModal';

const getTodayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

interface MultiAutoStaffProps {
  data: StaffRecord[];
  onUpdate: (staff: StaffRecord[]) => void;
  attendanceHistory?: AttendanceRecord[];
  onUpdateAttendanceHistory?: (att: AttendanceRecord[]) => void;
  overtimeRecords?: OvertimeRecord[];
  onUpdateOvertime?: (ot: OvertimeRecord[]) => void;
  onViewProfile?: (staff: StaffRecord) => void;
}

export const MultiAutoStaff: React.FC<MultiAutoStaffProps> = ({
  data,
  onUpdate,
  overtimeRecords = [],
  onUpdateOvertime,
  onViewProfile
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showOtModal, setShowOtModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffRecord | null>(null);
  const [qrModalStaff, setQrModalStaff] = useState<StaffRecord | null>(null);
  const [lockModalStaff, setLockModalStaff] = useState<StaffRecord | null>(null);
  const [otHours, setOtHours] = useState(2);
  const [otReason, setOtReason] = useState('Tăng ca hỗ trợ đơn hàng gấp');

  // Form State for Add Staff
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [position, setPosition] = useState('Vận hành máy Multi Auto');
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState<'DAY' | 'NIGHT'>('DAY');
  const [joinDateIso, setJoinDateIso] = useState<string>(getTodayIso);
  const [newAttendance, setNewAttendance] = useState<AttendanceStatus>('Đúng giờ');
  const [newLateMinutes, setNewLateMinutes] = useState<number>(30);
  const [newLateIn, setNewLateIn] = useState<string>('08:30');
  const [newEarlyMinutes, setNewEarlyMinutes] = useState<number>(30);
  const [newEarlyOut, setNewEarlyOut] = useState<string>('16:30');
  const [newQrEnabled, setNewQrEnabled] = useState<boolean>(true);

  const filtered = data.filter(s => {
    const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchShift = filterShift === 'ALL' || s.shift === filterShift;
    const matchStatus = filterStatus === 'ALL' || s.attendance === filterStatus;
    return matchSearch && matchShift && matchStatus;
  });

  // Calculate Attendance Stats
  const totalStaff = data.length;
  const onTimeCount = data.filter(s => s.attendance === 'Đúng giờ' || s.attendance === 'PRESENT' || s.attendance === 'Đủ công').length;
  const lateStaff = data.filter(s => s.attendance === 'Đi muộn');
  const earlyStaff = data.filter(s => s.attendance === 'Về sớm');
  const totalLateMinutes = lateStaff.reduce((sum, s) => sum + (s.lateMinutes || 30), 0);
  const totalEarlyMinutes = earlyStaff.reduce((sum, s) => sum + (s.earlyMinutes || 30), 0);
  const leaveCount = data.filter(s => s.attendance === 'Nghỉ phép' || s.attendance === 'Nghỉ ốm' || s.attendance === 'Vắng mặt').length;

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !employeeId) return;

    const cleanId = employeeId.trim().toUpperCase();
    let formattedJoin = formatDateDDMMYYYY(new Date());
    if (joinDateIso && joinDateIso.includes('-')) {
      const [y, m, d] = joinDateIso.split('-');
      if (y && m && d) {
        formattedJoin = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      }
    }

    const newStaff: StaffRecord = {
      id: Date.now(),
      fullName: fullName.trim(),
      employeeId: cleanId,
      position,
      phone,
      shift,
      attendance: newAttendance,
      lateMinutes: newAttendance === 'Đi muộn' ? newLateMinutes : undefined,
      lateIn: newAttendance === 'Đi muộn' ? newLateIn : undefined,
      earlyMinutes: newAttendance === 'Về sớm' ? newEarlyMinutes : undefined,
      earlyOut: newAttendance === 'Về sớm' ? newEarlyOut : undefined,
      dateJoined: formattedJoin,
      dob: '01/01/1998',
      hometown: 'Việt Nam',
      department: 'MULTI',
      qrAccessEnabled: newQrEnabled,
      qrAccessToken: generateStaffQrToken(cleanId),
    };

    onUpdate([...data, newStaff]);
    setShowAddModal(false);
    setFullName('');
    setEmployeeId('');
    setJoinDateIso(getTodayIso());
    setNewAttendance('Đúng giờ');
    setNewQrEnabled(true);
    setQrModalStaff(newStaff);
  };

  const handleToggleQrAccess = (staff: StaffRecord, enabled: boolean) => {
    onUpdate(
      data.map(s =>
        s.employeeId === staff.employeeId
          ? {
              ...s,
              qrAccessEnabled: enabled,
              qrAccessToken: getStaffQrToken(s),
            }
          : s
      )
    );
  };

  const handleRegenerateQrToken = (staff: StaffRecord) => {
    const newToken = generateStaffQrToken(staff.employeeId);
    onUpdate(
      data.map(s =>
        s.employeeId === staff.employeeId
          ? {
              ...s,
              qrAccessToken: newToken,
            }
          : s
      )
    );
  };

  const handleApplyStaffLock = (
    staff: StaffRecord,
    shouldLock: boolean,
    lockType: StaffLockType,
    lockedDay: number
  ) => {
    onUpdate(
      data.map(item =>
        item.employeeId === staff.employeeId
          ? {
              ...item,
              isLocked: shouldLock,
              lockType: shouldLock ? lockType : undefined,
              lockedDay: shouldLock ? lockedDay : undefined,
              attendance: shouldLock
                ? lockType === 'REGIME_LEAVE'
                  ? ('Nghỉ chế độ' as AttendanceStatus)
                  : ('Đã nghỉ việc' as AttendanceStatus)
                : item.attendance === 'Đã nghỉ việc' ||
                  (item.attendance as string) === 'Đã thôi việc' ||
                  (item.attendance as string) === 'Nghỉ chế độ'
                ? ('Đúng giờ' as AttendanceStatus)
                : item.attendance,
            }
          : item
      )
    );

    const now = new Date();
    syncStaffLockToMatrices(
      staff,
      shouldLock,
      lockType,
      lockedDay,
      now.getFullYear(),
      now.getMonth() + 1
    );

    setLockModalStaff(null);
  };

  const handleUpdateAttendance = (id: number, status: AttendanceStatus) => {
    const isLockStatus =
      status === 'Đã nghỉ việc' || (status as string) === 'Đã thôi việc' || (status as string) === 'Nghỉ chế độ';
    const nextLockType: StaffLockType | undefined =
      (status as string) === 'Nghỉ chế độ'
        ? 'REGIME_LEAVE'
        : status === 'Đã nghỉ việc' || (status as string) === 'Đã thôi việc'
        ? 'RESIGNED'
        : undefined;

    onUpdate(data.map(s => {
      if (s.id === id) {
        return {
          ...s,
          attendance: status,
          isLocked: isLockStatus ? true : false,
          lockType: nextLockType,
          lockedDay: isLockStatus ? (s.lockedDay || new Date().getDate()) : undefined,
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
    onUpdate(data.map(s => {
      if (s.id === id) {
        return { ...s, [field]: val };
      }
      return s;
    }));
  };

  const handleSaveOt = () => {
    if (!selectedStaff || !onUpdateOvertime) return;

    const newOt: OvertimeRecord = {
      id: Date.now(),
      staffId: selectedStaff.id,
      staffName: selectedStaff.fullName,
      employeeId: selectedStaff.employeeId,
      department: 'MULTI',
      date: new Date().toLocaleDateString('vi-VN'),
      hours: otHours,
      shift: selectedStaff.shift,
      reason: otReason,
      timestamp: new Date().toLocaleTimeString('vi-VN')
    };

    onUpdateOvertime([newOt, ...overtimeRecords]);
    setShowOtModal(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="w-full lg:w-auto px-7 sm:px-4 lg:px-0 text-center lg:text-left">
          <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center lg:justify-start gap-2">
            <Users className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>Quản Lý Nhân Viên &amp; Điểm Danh (Multi Auto)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 text-center lg:text-left">
            Theo dõi trạng thái có mặt, ghi nhận thời gian đi muộn / về sớm và đăng ký tăng ca cho công nhân viên.
          </p>
        </div>

        <div className="w-full max-w-md mx-auto lg:max-w-none lg:w-auto lg:mx-0 flex flex-col sm:flex-row sm:flex-wrap items-center justify-center lg:justify-end gap-2">
          <div className="w-full sm:w-auto grid grid-cols-[auto_minmax(0,1fr)] sm:flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shrink-0">
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

            <div className="relative min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm tên, mã NV..."
                className="w-full sm:w-44 bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-2">
            <select
              value={filterShift}
              onChange={e => setFilterShift(e.target.value as any)}
              className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
            >
              <option value="ALL">Tất cả ca</option>
              <option value="DAY">Ca Ngày</option>
              <option value="NIGHT">Ca Đêm</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Đúng giờ">Đúng giờ</option>
              <option value="Đi muộn">Đi muộn</option>
              <option value="Về sớm">Về sớm</option>
              <option value="Nghỉ phép">Nghỉ phép</option>
              <option value="Nghỉ ốm">Nghỉ ốm</option>
              <option value="Vắng mặt">Vắng mặt</option>
              <option value="Nghỉ chế độ">Nghỉ chế độ</option>
              <option value="Đã nghỉ việc">Đã nghỉ việc (Thôi việc)</option>
            </select>
          </div>

          <div className="w-full sm:w-auto flex justify-center">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Nhân Viên</span>
            </button>
          </div>
        </div>
      </div>

      {/* Attendance KPI Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tổng Quân Số</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{totalStaff}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Phân xưởng Multi</div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl">
          <div className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Đúng Giờ</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{onTimeCount}</div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">
            {totalStaff > 0 ? `${Math.round((onTimeCount / totalStaff) * 100)}% quân số` : '0%'}
          </div>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl">
          <div className="text-[10px] text-amber-300 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Đi Muộn</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{lateStaff.length}</div>
          <div className="text-[10px] text-amber-400/80 mt-0.5 font-mono">
            Tổng: {totalLateMinutes} phút trễ
          </div>
        </div>

        <div className="bg-orange-950/30 border border-orange-800/40 p-3 rounded-xl">
          <div className="text-[10px] text-orange-300 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Về Sớm</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-xl font-bold font-mono text-orange-400 mt-1">{earlyStaff.length}</div>
          <div className="text-[10px] text-orange-400/80 mt-0.5 font-mono">
            Tổng: {totalEarlyMinutes} phút sớm
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Nghỉ Phép / Vắng</div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">{leaveCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Vắng có/không phép</div>
        </div>
      </div>

      {/* Main Staff View */}
      {viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(staff => {
            const isLate = staff.attendance === 'Đi muộn';
            const isEarly = staff.attendance === 'Về sớm';

            return (
              <div
                key={staff.id}
                onClick={() => onViewProfile?.(staff)}
                title="Nhấn để xem hồ sơ nhân viên"
                className={`bg-slate-900/90 border rounded-xl p-4 space-y-3 text-xs transition-all cursor-pointer hover:border-cyan-500/50 ${
                  isLate
                    ? 'border-amber-700/60 shadow-xs shadow-amber-950/30'
                    : isEarly
                    ? 'border-orange-700/60 shadow-xs shadow-orange-950/30'
                    : 'border-slate-800'
                }`}
              >
                {/* Card Top */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                      {staff.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm hover:text-cyan-300 transition-colors">{staff.fullName}</div>
                      <div className="text-[10px] text-cyan-400 font-mono">Mã: {staff.employeeId}</div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    staff.shift === 'DAY' ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40' : 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/40'
                  }`}>
                    {staff.shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}
                  </span>
                </div>

                {/* Info Box */}
                <div className="space-y-1.5 text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vị trí:</span>
                    <span className="font-medium text-slate-200">{staff.position}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số ĐT:</span>
                    <span className="font-mono text-slate-300">{staff.phone || '0987-xxx-xxx'}</span>
                  </div>

                  {/* Attendance Selector */}
                  <div
                    onClick={e => e.stopPropagation()}
                    className="flex justify-between items-center pt-1 border-t border-slate-800/60"
                  >
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <span>Điểm danh:</span>
                    </span>
                    <select
                      value={staff.attendance}
                      onChange={e => handleUpdateAttendance(staff.id, e.target.value as AttendanceStatus)}
                      className={`font-semibold rounded px-2 py-1 text-xs border cursor-pointer ${
                        staff.attendance === 'Đúng giờ'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                          : staff.attendance === 'Đi muộn'
                          ? 'bg-amber-950/70 text-amber-300 border-amber-600'
                          : staff.attendance === 'Về sớm'
                          ? 'bg-orange-950/70 text-orange-300 border-orange-600'
                          : (staff.attendance as string) === 'Nghỉ chế độ'
                          ? 'bg-indigo-950/80 text-indigo-300 border-indigo-600'
                          : staff.attendance === 'Đã nghỉ việc'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-600'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      <option value="Đúng giờ">Đúng giờ</option>
                      <option value="Đi muộn">Đi muộn (Muộn giờ)</option>
                      <option value="Về sớm">Về sớm (Sớm giờ)</option>
                      <option value="Nghỉ phép">Nghỉ phép</option>
                      <option value="Nghỉ ốm">Nghỉ ốm</option>
                      <option value="Vắng mặt">Vắng mặt</option>
                      <option value="Nghỉ chế độ">Nghỉ chế độ</option>
                      <option value="Đã nghỉ việc">Đã nghỉ việc (Thôi việc)</option>
                    </select>
                  </div>

                  {/* CONDITIONAL: NẾU CHỌN ĐI MUỘN -> XUẤT HIỆN THỜI GIAN ĐI MUỘN */}
                  {isLate && (
                    <div
                      onClick={e => e.stopPropagation()}
                      className="mt-2 pt-2 border-t border-amber-800/50 bg-amber-950/40 p-2.5 rounded-lg space-y-2 animate-in fade-in"
                    >
                      <div className="flex items-center justify-between text-amber-300 font-semibold text-[11px]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Thời gian đi muộn:</span>
                        </span>
                        <span className="text-amber-300 font-mono font-bold">
                          {staff.lateMinutes ? `${staff.lateMinutes} phút` : ''} 
                          {staff.lateIn ? ` (vào ${staff.lateIn})` : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-amber-200/80 block mb-0.5">Số phút muộn:</label>
                          <input
                            type="number"
                            min="1"
                            max="480"
                            value={staff.lateMinutes || ''}
                            onChange={e => handleUpdateLateEarly(staff.id, 'lateMinutes', parseInt(e.target.value) || 0)}
                            placeholder="VD: 30"
                            className="w-full bg-slate-900 border border-amber-700 rounded px-2 py-1 text-xs text-amber-200 font-mono focus:border-amber-400 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-amber-200/80 block mb-0.5">Giờ vào thực tế:</label>
                          <input
                            type="time"
                            value={staff.lateIn || ''}
                            onChange={e => handleUpdateLateEarly(staff.id, 'lateIn', e.target.value)}
                            className="w-full bg-slate-900 border border-amber-700 rounded px-2 py-1 text-xs text-amber-200 font-mono focus:border-amber-400 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Quick Preset Buttons */}
                      <div className="flex items-center gap-1 pt-0.5">
                        <span className="text-[9px] text-slate-400">Chọn nhanh:</span>
                        {[15, 30, 45, 60, 90].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              handleUpdateLateEarly(staff.id, 'lateMinutes', mins);
                              // Auto set approximate check-in time for 08:00 start
                              const h = Math.floor((480 + mins) / 60);
                              const m = (480 + mins) % 60;
                              handleUpdateLateEarly(staff.id, 'lateIn', `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono cursor-pointer transition-colors ${
                              staff.lateMinutes === mins
                                ? 'bg-amber-400 text-black font-bold'
                                : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                            }`}
                          >
                            {mins}p
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CONDITIONAL: NẾU CHỌN VỀ SỚM -> XUẤT HIỆN THỜI GIAN VỀ SỚM */}
                  {isEarly && (
                    <div
                      onClick={e => e.stopPropagation()}
                      className="mt-2 pt-2 border-t border-orange-800/50 bg-orange-950/40 p-2.5 rounded-lg space-y-2 animate-in fade-in"
                    >
                      <div className="flex items-center justify-between text-orange-300 font-semibold text-[11px]">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                          <span>Thời gian về sớm:</span>
                        </span>
                        <span className="text-orange-300 font-mono font-bold">
                          {staff.earlyMinutes ? `${staff.earlyMinutes} phút` : ''} 
                          {staff.earlyOut ? ` (về ${staff.earlyOut})` : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-orange-200/80 block mb-0.5">Số phút về sớm:</label>
                          <input
                            type="number"
                            min="1"
                            max="480"
                            value={staff.earlyMinutes || ''}
                            onChange={e => handleUpdateLateEarly(staff.id, 'earlyMinutes', parseInt(e.target.value) || 0)}
                            placeholder="VD: 30"
                            className="w-full bg-slate-900 border border-orange-700 rounded px-2 py-1 text-xs text-orange-200 font-mono focus:border-orange-400 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-orange-200/80 block mb-0.5">Giờ về thực tế:</label>
                          <input
                            type="time"
                            value={staff.earlyOut || ''}
                            onChange={e => handleUpdateLateEarly(staff.id, 'earlyOut', e.target.value)}
                            className="w-full bg-slate-900 border border-orange-700 rounded px-2 py-1 text-xs text-orange-200 font-mono focus:border-orange-400 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Quick Preset Buttons */}
                      <div className="flex items-center gap-1 pt-0.5">
                        <span className="text-[9px] text-slate-400">Chọn nhanh:</span>
                        {[15, 30, 45, 60, 120].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              handleUpdateLateEarly(staff.id, 'earlyMinutes', mins);
                              // Auto set leave time for 20:00 shift end
                              const totalMins = 1200 - mins;
                              const h = Math.floor(totalMins / 60);
                              const m = totalMins % 60;
                              handleUpdateLateEarly(staff.id, 'earlyOut', `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono cursor-pointer transition-colors ${
                              staff.earlyMinutes === mins
                                ? 'bg-orange-400 text-black font-bold'
                                : 'bg-slate-800 text-orange-300 hover:bg-slate-700'
                            }`}
                          >
                            {mins}p
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  {(() => {
                    const staffLocked = Boolean(
                      staff.isLocked ||
                        staff.attendance === 'Đã nghỉ việc' ||
                        (staff.attendance as string) === 'Đã thôi việc' ||
                        (staff.attendance as string) === 'Nghỉ chế độ'
                    );
                    const isRegime = resolveStaffLockType(staff) === 'REGIME_LEAVE';
                    return (
                      <button
                        type="button"
                        onClick={() => setLockModalStaff(staff)}
                        title={
                          staffLocked
                            ? isRegime
                              ? 'Đang khóa nghỉ chế độ — nhấn để cấu hình hoặc mở khóa'
                              : 'Đang khóa thôi việc — nhấn để cấu hình hoặc mở khóa'
                            : 'Khóa nhân viên (Nghỉ chế độ / Thôi việc)'
                        }
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                          staffLocked
                            ? isRegime
                              ? 'bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border-indigo-600/70'
                              : 'bg-amber-950/70 hover:bg-amber-900 text-amber-300 border-amber-600/70'
                            : 'bg-slate-800 hover:bg-amber-950/60 text-slate-300 hover:text-amber-300 border-slate-700'
                        }`}
                      >
                        {staffLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{staffLocked ? (isRegime ? 'Nghỉ chế độ' : 'Thôi việc') : 'Khóa'}</span>
                      </button>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => handleToggleQrAccess(staff, !isStaffQrEnabled(staff))}
                    title={isStaffQrEnabled(staff) ? 'Nhấn để khóa quyền QR' : 'Nhấn để cấp quyền QR'}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      isStaffQrEnabled(staff)
                        ? 'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border-emerald-700/60'
                        : 'bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border-rose-700/60'
                    }`}
                  >
                    {isStaffQrEnabled(staff) ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Cấp QR</span>
                      </>
                    ) : (
                      <>
                        <ShieldOff className="w-3.5 h-3.5" />
                        <span>Khóa QR</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrModalStaff(staff)}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-700/60 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Xem & Tải mã QR hồ sơ"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QR</span>
                  </button>
                  <button
                    onClick={() => { setSelectedStaff(staff); setShowOtModal(true); }}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-semibold cursor-pointer transition-colors whitespace-nowrap"
                  >
                    + Tăng Ca
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW FOR ATTENDANCE MANAGEMENT */
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Mã NV</th>
                  <th className="py-2.5 px-3">Họ và Tên</th>
                  <th className="py-2.5 px-3">Vị Trí</th>
                  <th className="py-2.5 px-3">Ca Làm Việc</th>
                  <th className="py-2.5 px-3">Điểm Danh</th>
                  <th className="py-2.5 px-3">Thời Gian Đi Muộn</th>
                  <th className="py-2.5 px-3">Thời Gian Về Sớm</th>
                  <th className="py-2.5 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filtered.map(staff => {
                  const isLate = staff.attendance === 'Đi muộn';
                  const isEarly = staff.attendance === 'Về sớm';

                  return (
                    <tr
                      key={staff.id}
                      onClick={() => onViewProfile?.(staff)}
                      title="Nhấn để xem hồ sơ nhân viên"
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-mono text-cyan-400 font-semibold">{staff.employeeId}</td>
                      <td className="py-2.5 px-3 font-bold text-white hover:text-cyan-300">{staff.fullName}</td>
                      <td className="py-2.5 px-3 text-slate-300">{staff.position}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${staff.shift === 'DAY' ? 'bg-amber-950/60 text-amber-300' : 'bg-indigo-950/60 text-indigo-300'}`}>
                          {staff.shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                        <select
                          value={staff.attendance}
                          onChange={e => handleUpdateAttendance(staff.id, e.target.value as AttendanceStatus)}
                          className={`font-semibold rounded px-2 py-1 text-xs border cursor-pointer ${
                            staff.attendance === 'Đúng giờ'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                              : staff.attendance === 'Đi muộn'
                              ? 'bg-amber-950/70 text-amber-300 border-amber-600'
                              : staff.attendance === 'Về sớm'
                              ? 'bg-orange-950/70 text-orange-300 border-orange-600'
                              : (staff.attendance as string) === 'Nghỉ chế độ'
                              ? 'bg-indigo-950/80 text-indigo-300 border-indigo-600'
                              : staff.attendance === 'Đã nghỉ việc'
                              ? 'bg-rose-950/80 text-rose-300 border-rose-600'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          <option value="Đúng giờ">Đúng giờ</option>
                          <option value="Đi muộn">Đi muộn</option>
                          <option value="Về sớm">Về sớm</option>
                          <option value="Nghỉ phép">Nghỉ phép</option>
                          <option value="Nghỉ ốm">Nghỉ ốm</option>
                          <option value="Vắng mặt">Vắng mặt</option>
                          <option value="Nghỉ chế độ">Nghỉ chế độ</option>
                          <option value="Đã nghỉ việc">Đã nghỉ việc (Thôi việc)</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                        {isLate ? (
                          <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/40 px-2 py-1 rounded-md">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <input
                              type="number"
                              min="1"
                              max="480"
                              value={staff.lateMinutes || ''}
                              onChange={e => handleUpdateLateEarly(staff.id, 'lateMinutes', parseInt(e.target.value) || 0)}
                              placeholder="Phút"
                              className="w-14 bg-slate-900 border border-amber-700/60 rounded px-1.5 py-0.5 text-xs text-amber-200 font-mono text-center"
                            />
                            <span className="text-[10px] text-amber-300">phút</span>
                            <input
                              type="time"
                              value={staff.lateIn || ''}
                              onChange={e => handleUpdateLateEarly(staff.id, 'lateIn', e.target.value)}
                              className="w-18 bg-slate-900 border border-amber-700/60 rounded px-1.5 py-0.5 text-xs text-amber-200 font-mono text-center ml-1"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                        {isEarly ? (
                          <div className="flex items-center gap-1.5 bg-orange-950/40 border border-orange-800/40 px-2 py-1 rounded-md">
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            <input
                              type="number"
                              min="1"
                              max="480"
                              value={staff.earlyMinutes || ''}
                              onChange={e => handleUpdateLateEarly(staff.id, 'earlyMinutes', parseInt(e.target.value) || 0)}
                              placeholder="Phút"
                              className="w-14 bg-slate-900 border border-orange-700/60 rounded px-1.5 py-0.5 text-xs text-orange-200 font-mono text-center"
                            />
                            <span className="text-[10px] text-orange-300">phút</span>
                            <input
                              type="time"
                              value={staff.earlyOut || ''}
                              onChange={e => handleUpdateLateEarly(staff.id, 'earlyOut', e.target.value)}
                              className="w-18 bg-slate-900 border border-orange-700/60 rounded px-1.5 py-0.5 text-xs text-orange-200 font-mono text-center ml-1"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          {(() => {
                            const staffLocked = Boolean(
                              staff.isLocked ||
                                staff.attendance === 'Đã nghỉ việc' ||
                                (staff.attendance as string) === 'Đã thôi việc' ||
                                (staff.attendance as string) === 'Nghỉ chế độ'
                            );
                            const isRegime = resolveStaffLockType(staff) === 'REGIME_LEAVE';
                            return (
                              <button
                                type="button"
                                onClick={() => setLockModalStaff(staff)}
                                title={
                                  staffLocked
                                    ? isRegime
                                      ? 'Đang khóa nghỉ chế độ — nhấn để cấu hình hoặc mở khóa'
                                      : 'Đang khóa thôi việc — nhấn để cấu hình hoặc mở khóa'
                                    : 'Khóa nhân viên (Nghỉ chế độ / Thôi việc)'
                                }
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border cursor-pointer transition-colors ${
                                  staffLocked
                                    ? isRegime
                                      ? 'bg-indigo-950/70 text-indigo-300 border-indigo-600/70'
                                      : 'bg-amber-950/70 text-amber-300 border-amber-600/70'
                                    : 'bg-slate-800 hover:bg-amber-950/60 text-slate-300 hover:text-amber-300 border-slate-700'
                                }`}
                              >
                                {staffLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                <span>{staffLocked ? (isRegime ? 'Nghỉ chế độ' : 'Thôi việc') : 'Khóa'}</span>
                              </button>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={() => handleToggleQrAccess(staff, !isStaffQrEnabled(staff))}
                            title={isStaffQrEnabled(staff) ? 'Khóa quyền QR' : 'Cấp quyền QR'}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border cursor-pointer transition-colors ${
                              isStaffQrEnabled(staff)
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                                : 'bg-rose-950/60 text-rose-300 border-rose-700/60'
                            }`}
                          >
                            {isStaffQrEnabled(staff) ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setQrModalStaff(staff)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-cyan-950/50 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-700/60 text-[11px] font-semibold cursor-pointer transition-colors"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>QR</span>
                          </button>
                          <button
                            onClick={() => { setSelectedStaff(staff); setShowOtModal(true); }}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            + Tăng ca
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Thêm Nhân Viên Mới */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 text-xs shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Thêm Nhân Viên Multi Auto Mới</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Họ Và Tên</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Quân"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:border-cyan-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Mã Nhân Viên</label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    placeholder="VD: NV012"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:border-cyan-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Số Điện Thoại</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="VD: 0987-xxx-xxx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Vị Trí Công Việc</label>
                  <input
                    type="text"
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Ca Làm Việc</label>
                  <select
                    value={shift}
                    onChange={e => setShift(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    <option value="DAY">Ca Ngày (08:00 - 20:00)</option>
                    <option value="NIGHT">Ca Đêm (20:00 - 08:00)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Ngày Vào Làm (Ngày Tạo)</label>
                <input
                  type="date"
                  value={joinDateIso}
                  onChange={e => setJoinDateIso(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                  required
                />
              </div>

              {/* Attendance Selection in Modal */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-slate-300 font-medium mb-1">Trạng Thái Điểm Danh Ban Đầu</label>
                <select
                  value={newAttendance}
                  onChange={e => setNewAttendance(e.target.value as AttendanceStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-semibold"
                >
                  <option value="Đúng giờ">Đúng giờ</option>
                  <option value="Đi muộn">Đi muộn (Muộn giờ)</option>
                  <option value="Về sớm">Về sớm (Sớm giờ)</option>
                  <option value="Nghỉ phép">Nghỉ phép</option>
                  <option value="Nghỉ ốm">Nghỉ ốm</option>
                  <option value="Vắng mặt">Vắng mặt</option>
                </select>
              </div>

              {/* CONDITIONAL: NẾU CHỌN ĐI MUỘN TRONG MODAL */}
              {newAttendance === 'Đi muộn' && (
                <div className="bg-amber-950/40 border border-amber-800/60 p-3 rounded-lg space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Thời gian đi muộn:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-amber-200/80 block mb-0.5">Số phút muộn:</label>
                      <input
                        type="number"
                        min="1"
                        max="480"
                        value={newLateMinutes}
                        onChange={e => setNewLateMinutes(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-amber-700 rounded p-1.5 text-xs text-amber-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-amber-200/80 block mb-0.5">Giờ vào thực tế:</label>
                      <input
                        type="time"
                        value={newLateIn}
                        onChange={e => setNewLateIn(e.target.value)}
                        className="w-full bg-slate-900 border border-amber-700 rounded p-1.5 text-xs text-amber-200 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CONDITIONAL: NẾU CHỌN VỀ SỚM TRONG MODAL */}
              {newAttendance === 'Về sớm' && (
                <div className="bg-orange-950/40 border border-orange-800/60 p-3 rounded-lg space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-orange-300 font-semibold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                    <span>Thời gian về sớm:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-orange-200/80 block mb-0.5">Số phút về sớm:</label>
                      <input
                        type="number"
                        min="1"
                        max="480"
                        value={newEarlyMinutes}
                        onChange={e => setNewEarlyMinutes(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-orange-700 rounded p-1.5 text-xs text-orange-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-orange-200/80 block mb-0.5">Giờ về thực tế:</label>
                      <input
                        type="time"
                        value={newEarlyOut}
                        onChange={e => setNewEarlyOut(e.target.value)}
                        className="w-full bg-slate-900 border border-orange-700 rounded p-1.5 text-xs text-orange-200 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newQrEnabled}
                    onChange={e => setNewQrEnabled(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                  <span className="text-slate-200 font-medium">
                    Tự động tạo &amp; cấp quyền Mã QR truy cập nhanh hồ sơ
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
                >
                  Lưu Nhân Viên &amp; Tạo QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đăng Ký Tăng Ca */}
      {showOtModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-4 text-xs shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Đăng Ký Tăng Ca: {selectedStaff.fullName}</span>
            </h3>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Số giờ tăng ca</label>
              <input
                type="number"
                value={otHours}
                onChange={e => setOtHours(Number(e.target.value))}
                min={0.5}
                max={12}
                step={0.5}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Lý do tăng ca</label>
              <input
                type="text"
                value={otReason}
                onChange={e => setOtReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowOtModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveOt}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
              >
                Xác Nhận Tăng Ca
              </button>
            </div>
          </div>
        </div>
      )}
      <EmployeeQRModal
        staff={
          qrModalStaff
            ? data.find(st => st.employeeId === qrModalStaff.employeeId) || qrModalStaff
            : null
        }
        onClose={() => setQrModalStaff(null)}
        canManage={true}
        onToggleQrAccess={handleToggleQrAccess}
        onRegenerateQrToken={handleRegenerateQrToken}
      />
      {(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const daysInCurrentMonth = new Date(year, month, 0).getDate();
        const activeStaff = lockModalStaff
          ? data.find(st => st.employeeId === lockModalStaff.employeeId) || lockModalStaff
          : null;
        const activeLocked = Boolean(
          activeStaff &&
            (activeStaff.isLocked ||
              activeStaff.attendance === 'Đã nghỉ việc' ||
              (activeStaff.attendance as string) === 'Đã thôi việc' ||
              (activeStaff.attendance as string) === 'Nghỉ chế độ')
        );
        return (
          <EmployeeLockModal
            isOpen={Boolean(activeStaff)}
            staff={activeStaff}
            initialLocked={activeLocked}
            initialLockType={resolveStaffLockType(activeStaff || undefined)}
            initialLockedDay={activeStaff?.lockedDay || now.getDate()}
            selectedMonth={month}
            selectedYear={year}
            daysInMonth={daysInCurrentMonth}
            departmentTitle="Multi Auto"
            onClose={() => setLockModalStaff(null)}
            onConfirm={(shouldLock, chosenType, chosenDay) => {
              if (lockModalStaff) {
                handleApplyStaffLock(lockModalStaff, shouldLock, chosenType, chosenDay);
              }
            }}
          />
        );
      })()}
    </div>
  );
};
