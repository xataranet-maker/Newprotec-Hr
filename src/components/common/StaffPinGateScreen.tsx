import React, { useState } from 'react';
import { Key, ShieldCheck, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { StaffRecord } from '../../types';
import { DEFAULT_STAFF_PIN, getEffectiveStaffPin, validateNewStaffPin } from '../../lib/staffPin';

interface StaffPinGateScreenProps {
  staff: StaffRecord;
  mode: 'force_change' | 'verify';
  contextLabel?: string;
  onSuccessChangePin: (newPin: string) => void;
  onSuccessVerify?: () => void;
  onBackToLogin: () => void;
}

export const StaffPinGateScreen: React.FC<StaffPinGateScreenProps> = ({
  staff,
  mode,
  contextLabel,
  onSuccessChangePin,
  onSuccessVerify,
  onBackToLogin,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [error, setError] = useState('');

  const currentPin = getEffectiveStaffPin(staff);
  const isReissuedTemp = Boolean(staff.mustChangePin && currentPin !== DEFAULT_STAFF_PIN);

  const handleChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateNewStaffPin(
      newPinInput,
      confirmPinInput,
      isReissuedTemp ? currentPin : undefined
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError('');
    setNewPinInput('');
    setConfirmPinInput('');
    onSuccessChangePin(res.pin);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = pinInput.trim();
    if (!entered) {
      setError('Vui lòng nhập mã PIN của bạn.');
      return;
    }
    if (entered !== currentPin) {
      setError('Mã PIN không chính xác. Nếu quên mã PIN, vui lòng liên hệ phòng HC & NS để được cấp lại.');
      return;
    }
    setError('');
    setPinInput('');
    onSuccessVerify?.();
  };

  return (
    <div className="min-h-dvh bg-[#020617] text-slate-100 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
          {mode === 'force_change' ? <ShieldCheck className="w-6 h-6" /> : <Key className="w-6 h-6" />}
        </div>

        <div className="text-center space-y-1.5">
          {contextLabel && (
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
              {contextLabel}
            </div>
          )}
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            {mode === 'force_change'
              ? isReissuedTemp
                ? 'Đổi Mã PIN Được Cấp Lại'
                : 'Đổi Mã PIN Lần Đầu'
              : 'Xác Thực Mã PIN Nhân Viên'}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {mode === 'force_change'
              ? isReissuedTemp
                ? `Hồ sơ ${staff.fullName} (${staff.employeeId}) vừa được phòng HC & NS cấp lại PIN. Vui lòng đặt mã PIN cá nhân mới để tiếp tục.`
                : `Đăng nhập lần đầu cho ${staff.fullName} (${staff.employeeId}). Vui lòng thiết lập mã PIN cá nhân mới để bảo vệ tài khoản.`
              : `Nhập mã PIN dùng chung (Mã NV & Quét QR) cho ${staff.fullName} (${staff.employeeId}).`}
          </p>
        </div>

        {mode === 'force_change' ? (
          <form onSubmit={handleChangeSubmit} className="space-y-3 pt-1">
            <div className="rounded-xl bg-cyan-950/30 border border-cyan-800/50 px-3 py-2 text-[11px] text-cyan-200/90 leading-relaxed">
              Mã PIN mới sẽ dùng chung cho cả <strong>Đăng nhập Mã nhân viên</strong> &amp; <strong>Quét Mã QR</strong>, đồng thời được lưu trên hệ thống quản lý của phòng <strong>HC &amp; NS</strong>.
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Mã PIN mới (từ 4 ký tự)
              </label>
              <div className="relative">
                <input
                  type={showPinText ? 'text' : 'password'}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="Nhập mã PIN mới"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPinText((v) => !v)}
                  className="absolute inset-y-0 right-0 px-2.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  title={showPinText ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
                >
                  {showPinText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Xác nhận mã PIN mới
              </label>
              <input
                type={showPinText ? 'text' : 'password'}
                value={confirmPinInput}
                onChange={(e) => setConfirmPinInput(e.target.value)}
                placeholder="Nhập lại mã PIN mới"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {error && (
              <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-800/60 p-2 rounded-lg text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg"
            >
              <Key className="w-4 h-4" />
              <span>Lưu Mã PIN &amp; Đăng Nhập</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifySubmit} className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Mã PIN cá nhân
              </label>
              <div className="relative">
                <input
                  type={showPinText ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Nhập mã PIN của bạn"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPinText((v) => !v)}
                  className="absolute inset-y-0 right-0 px-2.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  title={showPinText ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
                >
                  {showPinText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-800/60 p-2 rounded-lg text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg"
            >
              <Key className="w-4 h-4" />
              <span>Xác Thực &amp; Mở Hồ Sơ</span>
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay Về Đăng Nhập</span>
        </button>
      </div>
    </div>
  );
};
