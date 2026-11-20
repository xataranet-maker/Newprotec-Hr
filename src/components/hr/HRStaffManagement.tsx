import React, { useState } from 'react';
import { StaffRecord, AttendanceRecord, OvertimeRecord, AttendanceStatus } from '../../types';
import { 
  Users, Search, Filter, Phone, Building, Clock, 
  AlertTriangle, CheckCircle2, LayoutGrid, Table, Trash2, X,
  QrCode, ShieldCheck, ShieldOff
} from 'lucide-react';
import { isStaffQrEnabled, generateStaffQrToken, getStaffQrToken } from '../../lib/staffQr';
import { EmployeeQRModal } from '../common/EmployeeQRModal';

interface HRStaffManagementProps {
  multiStaff: StaffRecord[];
  setMultiStaff: (s: StaffRecord[]) => void;
  hrStaff: StaffRecord[];
  setHrStaff: (s: StaffRecord[]) => void;
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
  onViewProfile?: (staff: StaffRecord) => void;
  onDeleteStaff?: (staff: StaffRecord) => void;
}

export const HRStaffManagement: React.FC<HRStaffManagementProps> = ({
  multiStaff,
  setMultiStaff,
  hrStaff,
  setHrStaff,
  onViewProfile,
  onDeleteStaff,
}) => {
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterQr, setFilterQr] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [confirmDeleteStaff, setConfirmDeleteStaff] = useState<(StaffRecord & { dept?: string }) | null>(null);
  const [qrModalStaff, setQrModalStaff] = useState<(StaffRecord & { dept?: string; deptKey?: string }) | null>(null);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  const handleConfirmDelete = () => {
    if (!confirmDeleteStaff || !onDeleteStaff) return;
    const deletedName = confirmDeleteStaff.fullName;
    const deletedId = confirmDeleteStaff.employeeId;
    onDeleteStaff(confirmDeleteStaff);
    setConfirmDeleteStaff(null);
    setDeleteToast(`Đã xóa vĩnh viễn nhân viên ${deletedName} (${deletedId}) và toàn bộ dữ liệu liên quan.`);
    window.setTimeout(() => setDeleteToast(null), 4000);
  };

  const allStaff = [
    ...multiStaff.map(s => ({ ...s, dept: 'Multi Auto', deptKey: 'MULTI' })),
    ...hrStaff.map(s => ({ ...s, dept: 'HC & NS', deptKey: 'HR' })),
  ];

  const handleToggleQrAccess = (staff: StaffRecord & { deptKey?: string }, enabled: boolean) => {
    const resolvedDept = staff.deptKey || (staff.department === 'HR' ? 'HR' : 'MULTI');
    const updater = (prev: StaffRecord[]) =>
      prev.map(item =>
        item.employeeId === staff.employeeId
          ? {
              ...item,
              qrAccessEnabled: enabled,
              qrAccessToken: getStaffQrToken(item),
            }
          : item
      );

    if (resolvedDept === 'MULTI') setMultiStaff(updater(multiStaff));
    else if (resolvedDept === 'HR') setHrStaff(updater(hrStaff));
  };

  const handleRegenerateQrToken = (staff: StaffRecord & { deptKey?: string }) => {
    const resolvedDept = staff.deptKey || (staff.department === 'HR' ? 'HR' : 'MULTI');
    const newToken = generateStaffQrToken(staff.employeeId);
    const updater = (prev: StaffRecord[]) =>
      prev.map(item =>
        item.employeeId === staff.employeeId
          ? {
              ...item,
              qrAccessToken: newToken,
            }
          : item
      );

    if (resolvedDept === 'MULTI') setMultiStaff(updater(multiStaff));
    else if (resolvedDept === 'HR') setHrStaff(updater(hrStaff));
  };

  const filtered = allStaff.filter(s => {
    const matchDept = filterDept === 'ALL' || s.dept === filterDept;
    const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || s.attendance === filterStatus;
    const qrOn = isStaffQrEnabled(s);
    const matchQr = filterQr === 'ALL' || (filterQr === 'ENABLED' ? qrOn : !qrOn);
    return matchDept && matchSearch && matchStatus && matchQr;
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
    else if (deptKey === 'HR') setHrStaff(updater(hrStaff));
  };

  const handleUpdateLateEarly = (employeeId: string, deptKey: string, field: 'lateMinutes' | 'lateIn' | 'earlyMinutes' | 'earlyOut', val: any) => {
    const updater = (prev: StaffRecord[]) => prev.map(s => s.employeeId === employeeId ? { ...s, [field]: val } : s);

    if (deptKey === 'MULTI') setMultiStaff(updater(multiStaff));
    else if (deptKey === 'HR') setHrStaff(updater(hrStaff));
  };

  const onTimeCount = allStaff.filter(s => s.attendance === 'Đúng giờ' || s.attendance === 'PRESENT' || s.attendance === 'Đủ công').length;
  const lateCount = allStaff.filter(s => s.attendance === 'Đi muộn').length;
  const earlyCount = allStaff.filter(s => s.attendance === 'Về sớm').length;
  const totalLateMinutes = allStaff.filter(s => s.attendance === 'Đi muộn').reduce((sum, s) => sum + (s.lateMinutes || 30), 0);
  const totalEarlyMinutes = allStaff.filter(s => s.attendance === 'Về sớm').reduce((sum, s) => sum + (s.earlyMinutes || 30), 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="w-full lg:w-auto px-7 sm:px-4 lg:px-0 text-center sm:text-left">
          <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center lg:justify-start gap-2">
            <Users className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>Quản Lý Nhân Viên &amp; Điểm Danh Toàn Nhà Máy ({allStaff.length} Nhân Viên)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 text-center lg:text-left">
            Tổng hợp hồ sơ nhân sự và theo dõi điểm danh, thời gian đi muộn / về sớm tại các phân xưởng.
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
                placeholder="Tìm theo tên, mã NV..."
                className="w-full sm:w-44 bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-2">
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
            >
              <option value="ALL">Tất cả phòng ban</option>
              <option value="Multi Auto">Multi Auto</option>
              <option value="HC & NS">HC &amp; NS</option>
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
            </select>

            <select
              value={filterQr}
              onChange={e => setFilterQr(e.target.value as 'ALL' | 'ENABLED' | 'DISABLED')}
              className="col-span-2 sm:col-span-1 w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
            >
              <option value="ALL">Quyền QR: Tất cả</option>
              <option value="ENABLED">QR: Đang cấp quyền</option>
              <option value="DISABLED">QR: Đã khóa quyền</option>
            </select>
          </div>
        </div>
      </div>

      {deleteToast && (
        <div className="p-3.5 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{deleteToast}</span>
          </div>
          <button
            onClick={() => setDeleteToast(null)}
            className="text-emerald-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                onClick={() => onViewProfile?.(s)}
                title="Nhấn để xem hồ sơ nhân viên"
                className={`bg-slate-900/90 border rounded-xl p-4 text-xs space-y-2.5 transition-all cursor-pointer hover:border-cyan-500/50 ${
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
                      <div className="font-bold text-white text-sm hover:text-cyan-300 transition-colors">{s.fullName}</div>
                      <div className="text-[10px] text-cyan-400 font-mono">Mã: {s.employeeId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700/50">
                      {s.dept}
                    </span>
                    {onDeleteStaff && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteStaff(s)}
                        title={`Xóa nhân viên ${s.fullName}`}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-800/60 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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
                  <div
                    onClick={e => e.stopPropagation()}
                    className="flex justify-between items-center pt-1.5 border-t border-slate-800/60"
                  >
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
                          : s.attendance === 'Đã nghỉ việc'
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
                      <option value="Đã nghỉ việc">Đã nghỉ việc (Thôi việc)</option>
                    </select>
                  </div>

                  {/* CONDITIONAL: NẾU CHỌN ĐI MUỘN */}
                  {isLate && (
                    <div
                      onClick={e => e.stopPropagation()}
                      className="mt-2 pt-2 border-t border-amber-800/50 bg-amber-950/40 p-2 rounded-lg space-y-1.5 animate-in fade-in"
                    >
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
                    <div
                      onClick={e => e.stopPropagation()}
                      className="mt-2 pt-2 border-t border-orange-800/50 bg-orange-950/40 p-2 rounded-lg space-y-1.5 animate-in fade-in"
                    >
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
                  {/* QR Quick Access Management Row */}
                  <div
                    onClick={e => e.stopPropagation()}
                    className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleQrAccess(s, !isStaffQrEnabled(s))}
                      title={
                        isStaffQrEnabled(s)
                          ? 'Nhấn để tắt quyền truy cập nhanh bằng mã QR'
                          : 'Nhấn để cấp quyền truy cập nhanh bằng mã QR'
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                        isStaffQrEnabled(s)
                          ? 'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border-emerald-700/60'
                          : 'bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border-rose-700/60'
                      }`}
                    >
                      {isStaffQrEnabled(s) ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>QR: Đã Cấp Quyền</span>
                        </>
                      ) : (
                        <>
                          <ShieldOff className="w-3.5 h-3.5 text-rose-400" />
                          <span>QR: Đã Khóa</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrModalStaff(s)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/50 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-700/60 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Mã QR</span>
                    </button>
                  </div>
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
                  <th className="py-2.5 px-3 text-center">Mã QR &amp; Quyền</th>
                  {onDeleteStaff && <th className="py-2.5 px-3 text-center">Thao Tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filtered.map(s => {
                  const isLate = s.attendance === 'Đi muộn';
                  const isEarly = s.attendance === 'Về sớm';

                  return (
                    <tr
                      key={`${s.deptKey}_${s.employeeId}`}
                      onClick={() => onViewProfile?.(s)}
                      title="Nhấn để xem hồ sơ nhân viên"
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-mono text-cyan-400 font-semibold">{s.employeeId}</td>
                      <td className="py-2.5 px-3 font-bold text-white hover:text-cyan-300">{s.fullName}</td>
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
                      <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
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
                              : s.attendance === 'Đã nghỉ việc'
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
                      <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
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
                      <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleQrAccess(s, !isStaffQrEnabled(s))}
                            title={isStaffQrEnabled(s) ? 'Khóa quyền QR' : 'Cấp quyền QR'}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                              isStaffQrEnabled(s)
                                ? 'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border-emerald-700/60'
                                : 'bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border-rose-700/60'
                            }`}
                          >
                            {isStaffQrEnabled(s) ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Cấp</span>
                              </>
                            ) : (
                              <>
                                <ShieldOff className="w-3.5 h-3.5" />
                                <span>Khóa</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setQrModalStaff(s)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-950/50 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-700/60 text-[11px] font-semibold cursor-pointer transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>QR</span>
                          </button>
                        </div>
                      </td>
                      {onDeleteStaff && (
                        <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteStaff(s)}
                            title={`Xóa nhân viên ${s.fullName}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/60 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Nhân Viên */}
      {confirmDeleteStaff && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmDeleteStaff(null)}
        >
          <div
            className="bg-slate-900 border border-rose-800/70 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-700/70 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Xác Nhận Xóa Nhân Viên</h3>
                  <p className="text-[11px] text-rose-300">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteStaff(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Họ và tên:</span>
                <span className="font-bold text-white">{confirmDeleteStaff.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mã nhân viên:</span>
                <span className="font-mono text-cyan-400 font-semibold">{confirmDeleteStaff.employeeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phòng ban / Chức vụ:</span>
                <span className="text-slate-200">{confirmDeleteStaff.dept} — {confirmDeleteStaff.position}</span>
              </div>
            </div>

            <div className="bg-rose-950/30 border border-rose-900/60 rounded-xl p-3 text-[11px] text-rose-200 space-y-1">
              <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Toàn bộ dữ liệu sau sẽ bị xóa vĩnh viễn:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-rose-200/90">
                <li>Hồ sơ nhân viên &amp; tài khoản đăng nhập liên kết</li>
                <li>Toàn bộ bảng chấm công, dữ liệu quẹt thẻ &amp; nhật ký công</li>
                <li>Dữ liệu tăng ca, xác nhận công &amp; yêu cầu chỉnh công</li>
                <li>Hợp đồng lao động, cấu hình lương &amp; phiếu lương</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteStaff(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa toàn bộ dữ liệu</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <EmployeeQRModal
        staff={
          qrModalStaff
            ? allStaff.find(st => st.employeeId === qrModalStaff.employeeId) || qrModalStaff
            : null
        }
        onClose={() => setQrModalStaff(null)}
        canManage={true}
        onToggleQrAccess={handleToggleQrAccess}
        onRegenerateQrToken={handleRegenerateQrToken}
      />
    </div>
  );
};
