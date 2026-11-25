import React, { useState } from 'react';
import { StaffRecord } from '../../types';
import { UserPlus, CheckCircle, QrCode, ShieldCheck, ShieldOff } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../lib/matrixTimekeeping';
import { buildStaffQrUrl, generateStaffQrToken } from '../../lib/staffQr';
import { EmployeeQRCodeSvg, EmployeeQRModal } from '../common/EmployeeQRModal';

interface HRAddStaffProps {
  multiStaff: StaffRecord[];
  setMultiStaff: (s: StaffRecord[]) => void;
  hrStaff: StaffRecord[];
  setHrStaff: (s: StaffRecord[]) => void;
}

const getTodayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const HRAddStaff: React.FC<HRAddStaffProps> = ({
  multiStaff,
  setMultiStaff,
  hrStaff,
  setHrStaff,
}) => {
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('MULTI');
  const [position, setPosition] = useState('Công nhân vận hành');
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState<'DAY' | 'NIGHT'>('DAY');
  const [joinDateIso, setJoinDateIso] = useState<string>(getTodayIso);
  const [qrAccessEnabled, setQrAccessEnabled] = useState<boolean>(true);
  const [success, setSuccess] = useState(false);
  const [createdStaff, setCreatedStaff] = useState<StaffRecord | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !employeeId) return;

    let formattedJoin = formatDateDDMMYYYY(new Date());
    if (joinDateIso && joinDateIso.includes('-')) {
      const [y, m, d] = joinDateIso.split('-');
      if (y && m && d) {
        formattedJoin = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      }
    }

    const cleanEmpId = employeeId.trim().toUpperCase();
    const newStaff: StaffRecord = {
      id: Date.now(),
      fullName: fullName.trim(),
      employeeId: cleanEmpId,
      position,
      dateJoined: formattedJoin,
      dob: '01/01/1998',
      hometown: 'Việt Nam',
      phone: phone || '0987-xxx-xxx',
      attendance: 'Đúng giờ',
      shift,
      department,
      qrAccessEnabled,
      qrAccessToken: generateStaffQrToken(cleanEmpId),
      securityPin: '123',
      mustChangePin: true,
      pinUpdatedAt: new Date().toLocaleString('vi-VN'),
      pinUpdatedBy: 'Khởi tạo hồ sơ (HC & NS)',
    };

    if (department === 'MULTI') setMultiStaff([...multiStaff, newStaff]);
    else if (department === 'HR') setHrStaff([...hrStaff, newStaff]);

    setCreatedStaff(newStaff);
    setSuccess(true);
    setFullName('');
    setEmployeeId('');
    setPhone('');
    setJoinDateIso(getTodayIso());
    setTimeout(() => setSuccess(false), 5000);
  };

  const handleToggleCreatedQr = (target: StaffRecord, enabled: boolean) => {
    const updated = { ...target, qrAccessEnabled: enabled };
    setCreatedStaff(updated);
    if (target.department === 'MULTI') {
      setMultiStaff(multiStaff.map((s) => (s.employeeId === target.employeeId ? updated : s)));
    } else if (target.department === 'HR') {
      setHrStaff(hrStaff.map((s) => (s.employeeId === target.employeeId ? updated : s)));
    }
  };

  const handleRegenerateCreatedQr = (target: StaffRecord) => {
    const updated = { ...target, qrAccessToken: generateStaffQrToken(target.employeeId) };
    setCreatedStaff(updated);
    if (target.department === 'MULTI') {
      setMultiStaff(multiStaff.map((s) => (s.employeeId === target.employeeId ? updated : s)));
    } else if (target.department === 'HR') {
      setHrStaff(hrStaff.map((s) => (s.employeeId === target.employeeId ? updated : s)));
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800 px-7 sm:px-0 text-center sm:text-left">
        <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <UserPlus className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Thêm Nhân Viên Mới Vào Nhà Máy</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Tạo hồ sơ, gán phân xưởng và hệ thống tự động sinh Mã QR truy cập nhanh hồ sơ nhân viên.
        </p>
      </div>

      {success && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Đã tạo hồ sơ nhân viên &amp; tự động khởi tạo Mã QR cá nhân thành công!</span>
        </div>
      )}

      {createdStaff && (
        <div className="bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-xl">
          <div className="bg-white p-2 rounded-xl shrink-0">
            <EmployeeQRCodeSvg
              staff={createdStaff}
              value={buildStaffQrUrl(createdStaff)}
              size={128}
            />
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2 text-xs">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Mã QR Tự Động Cho Nhân Viên Mới
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {createdStaff.fullName} ({createdStaff.employeeId})
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Trạng thái:{' '}
                <span
                  className={
                    createdStaff.qrAccessEnabled !== false
                      ? 'text-emerald-400 font-semibold'
                      : 'text-rose-400 font-semibold'
                  }
                >
                  {createdStaff.qrAccessEnabled !== false
                    ? 'Đã cấp quyền quét vào thẳng hồ sơ'
                    : 'Đang khóa truy cập QR'}
                </span>
              </div>
              <div className="text-[11px] text-amber-300 mt-0.5">
                Mã PIN đăng nhập &amp; QR mặc định: <strong className="font-mono">123</strong> (yêu cầu đổi ở lần đầu).
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Xem &amp; Tải Thẻ QR</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleToggleCreatedQr(createdStaff, createdStaff.qrAccessEnabled === false)
                }
                className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer flex items-center gap-1 ${
                  createdStaff.qrAccessEnabled !== false
                    ? 'bg-rose-950/50 border-rose-700/60 text-rose-300 hover:bg-rose-900/60'
                    : 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                }`}
              >
                {createdStaff.qrAccessEnabled !== false ? (
                  <>
                    <ShieldOff className="w-3.5 h-3.5" />
                    <span>Khóa QR</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Cấp Quyền QR</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 mb-1">Phòng Ban / Phân Xưởng</label>
          <select
            value={department}
            onChange={e => setDepartment(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
          >
            <option value="MULTI">Multi Auto</option>
            <option value="HR">HC &amp; NS</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-300 mb-1">Họ Và Tên</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="VD: Trần Văn Nam"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 mb-1">Mã Nhân Viên</label>
            <input
              type="text"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              placeholder="VD: NV025"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Ngày Vào Làm (Ngày Tạo)</label>
            <input
              type="date"
              value={joinDateIso}
              onChange={e => setJoinDateIso(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 mb-1">Chức Vụ</label>
            <input
              type="text"
              value={position}
              onChange={e => setPosition(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Ca Làm Việc</label>
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
          <label className="block text-slate-300 mb-1">Số Điện Thoại</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="VD: 0987123456"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
          />
        </div>

        {/* Auto QR Access Toggle */}
        <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-200">
                Tự động tạo &amp; cấp quyền Mã QR hồ sơ
              </div>
              <div className="text-[11px] text-slate-400">
                Cho phép quét mã QR để vào thẳng hồ sơ nhân viên không cần đăng nhập
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={qrAccessEnabled}
            onChange={(e) => setQrAccessEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer"
          />
        </label>

        <button
          type="submit"
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer shadow-md"
        >
          Lưu Nhân Viên Mới &amp; Tạo Mã QR
        </button>
      </form>

      <EmployeeQRModal
        staff={showQrModal ? createdStaff : null}
        onClose={() => setShowQrModal(false)}
        canManage={true}
        onToggleQrAccess={handleToggleCreatedQr}
        onRegenerateQrToken={handleRegenerateCreatedQr}
      />
    </div>
  );
};
