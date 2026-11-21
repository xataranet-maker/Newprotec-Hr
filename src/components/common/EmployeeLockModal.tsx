import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  X,
  CalendarDays,
  AlertTriangle,
  CalendarHeart,
  UserX,
  CheckCircle2,
} from 'lucide-react';
import { StaffLockType, StaffRecord } from '../../types';

interface EmployeeLockModalProps {
  isOpen: boolean;
  staff: StaffRecord | null;
  initialLocked: boolean;
  initialLockType: StaffLockType;
  initialLockedDay: number;
  selectedMonth: number;
  selectedYear: number;
  daysInMonth: number;
  departmentTitle?: string;
  onClose: () => void;
  onConfirm: (shouldLock: boolean, lockType: StaffLockType, lockedDay: number) => void;
}

export const EmployeeLockModal: React.FC<EmployeeLockModalProps> = ({
  isOpen,
  staff,
  initialLocked,
  initialLockType,
  initialLockedDay,
  selectedMonth,
  selectedYear,
  daysInMonth,
  departmentTitle,
  onClose,
  onConfirm,
}) => {
  const [lockType, setLockType] = useState<StaffLockType>(initialLockType || 'RESIGNED');
  const [lockedDay, setLockedDay] = useState<number>(initialLockedDay || 1);

  useEffect(() => {
    if (isOpen) {
      setLockType(initialLockType || 'RESIGNED');
      setLockedDay(Math.min(daysInMonth, Math.max(1, initialLockedDay || 1)));
    }
  }, [isOpen, initialLockType, initialLockedDay, daysInMonth, staff?.employeeId]);

  if (!isOpen || !staff) return null;

  const isRegime = lockType === 'REGIME_LEAVE';
  const currentStatusLabel =
    initialLocked
      ? initialLockType === 'REGIME_LEAVE'
        ? `ĐANG KHÓA (Nghỉ chế độ từ N${initialLockedDay})`
        : `ĐANG KHÓA (Thôi việc từ N${initialLockedDay})`
      : 'Đang làm việc bình thường';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                initialLocked
                  ? initialLockType === 'REGIME_LEAVE'
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              }`}
            >
              {initialLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                Khóa Nhân Viên
              </h3>
              <p className="text-xs text-slate-400">
                Tháng {selectedMonth}/{selectedYear}
                {departmentTitle ? ` · ${departmentTitle}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thông tin nhân viên */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Họ và tên:</span>
            <span className="font-bold text-cyan-300 text-sm">{staff.fullName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Mã nhân viên:</span>
            <span className="font-mono text-slate-200">{staff.employeeId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Vị trí · Ca:</span>
            <span className="text-slate-300">
              {staff.position} · {staff.shift === 'DAY' ? 'Ca Ngày' : 'Ca Đêm'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Ngày vào làm:</span>
            <span className="font-mono text-slate-300">{staff.dateJoined || 'Chưa ghi nhận'}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 font-medium">Trạng thái hiện tại:</span>
            {initialLocked ? (
              <span
                className={`px-2 py-0.5 rounded border font-bold text-[10px] ${
                  initialLockType === 'REGIME_LEAVE'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {currentStatusLabel}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
                {currentStatusLabel}
              </span>
            )}
          </div>
        </div>

        {/* 2 Lựa Chọn Hình Thức Khóa */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
            <span>Chọn hình thức khóa nhân viên:</span>
            <span className="text-[10px] text-slate-400 font-normal">Bắt buộc chọn 1 trong 2</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Lựa chọn 1: Khóa Nghỉ Chế Độ */}
            <button
              type="button"
              onClick={() => setLockType('REGIME_LEAVE')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                isRegime
                  ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-950/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isRegime
                        ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/50'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <CalendarHeart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`font-bold text-xs ${isRegime ? 'text-indigo-200' : 'text-slate-200'}`}>
                      Khóa Nghỉ Chế Độ
                    </div>
                    <div className="text-[10px] text-slate-400">Thai sản / ốm dài ngày</div>
                  </div>
                </div>
                {isRegime && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                Khóa chấm công và hiển thị <strong className="text-indigo-300">Nghỉ chế độ</strong>, bảo lưu hồ sơ nhân viên.
              </p>
            </button>

            {/* Lựa chọn 2: Khóa Thôi Việc */}
            <button
              type="button"
              onClick={() => setLockType('RESIGNED')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                !isRegime
                  ? 'bg-amber-950/50 border-amber-500 ring-1 ring-amber-500/50 shadow-lg shadow-amber-950/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      !isRegime
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <UserX className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`font-bold text-xs ${!isRegime ? 'text-amber-200' : 'text-slate-200'}`}>
                      Khóa Thôi Việc
                    </div>
                    <div className="text-[10px] text-slate-400">Nghỉ việc / Thôi việc</div>
                  </div>
                </div>
                {!isRegime && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                Khóa chấm công và đánh dấu <strong className="text-amber-300">Đã thôi việc</strong> trên bảng công.
              </p>
            </button>
          </div>
        </div>

        {/* Chọn ngày áp dụng */}
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <CalendarDays className={`w-4 h-4 ${isRegime ? 'text-indigo-400' : 'text-amber-400'}`} />
              <span>
                Chọn ngày bắt đầu {isRegime ? 'nghỉ chế độ' : 'thôi việc'} / khóa (1 đến {daysInMonth}):
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={daysInMonth}
                value={lockedDay}
                onChange={(e) =>
                  setLockedDay(Math.min(daysInMonth, Math.max(1, Number(e.target.value) || 1)))
                }
                className={`w-24 bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-center text-white font-bold text-base focus:outline-hidden ${
                  isRegime ? 'focus:border-indigo-500' : 'focus:border-amber-500'
                }`}
              />
              <span className="text-xs text-slate-400">
                tháng {selectedMonth}/{selectedYear}
              </span>
            </div>

            {/* Nút chọn nhanh */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 self-center">Chọn nhanh:</span>
              {[
                { label: 'Ngày 1', val: 1 },
                { label: 'Ngày 10', val: 10 },
                { label: 'Ngày 12', val: 12 },
                { label: 'Ngày 15', val: 15 },
                { label: 'Ngày 20', val: 20 },
                {
                  label: `Hôm nay (N${new Date().getDate()})`,
                  val: Math.min(daysInMonth, new Date().getDate()),
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setLockedDay(preset.val)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer transition-colors ${
                    lockedDay === preset.val
                      ? isRegime
                        ? 'bg-indigo-500 text-white border-indigo-400 font-bold'
                        : 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hộp quy tắc nghiệp vụ */}
          <div
            className={`p-3 rounded-xl text-[11px] space-y-1 border ${
              isRegime
                ? 'bg-indigo-950/30 border-indigo-800/50 text-indigo-200/90'
                : 'bg-amber-950/30 border-amber-800/50 text-amber-200/90'
            }`}
          >
            <div
              className={`font-bold flex items-center gap-1.5 ${
                isRegime ? 'text-indigo-300' : 'text-amber-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Quy tắc hiển thị &amp; bảo lưu công:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1">
              <li>
                <span className={`font-semibold ${isRegime ? 'text-indigo-300' : 'text-amber-300'}`}>
                  Từ ngày {lockedDay} đến hết tháng:
                </span>{' '}
                Khóa không cho chấm công, ngày thường hiển thị{' '}
                <strong>{isRegime ? "'Nghỉ chế độ'" : "'Đã thôi việc'"}</strong>, Chủ Nhật để trống trạng
                thái, không hiển thị giờ vào/ra.
              </li>
              <li>
                <span className="text-emerald-300 font-semibold">Trước ngày {lockedDay}:</span> Giữ
                nguyên toàn bộ ngày công và giờ tăng ca thực tế đã làm.
              </li>
            </ul>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-800">
          {initialLocked ? (
            <button
              type="button"
              onClick={() => onConfirm(false, lockType, lockedDay)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Mở Khóa Nhân Viên</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => onConfirm(true, lockType, lockedDay)}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                isRegime
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-slate-950'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>
                {initialLocked
                  ? isRegime
                    ? 'Cập Nhật Khóa Nghỉ Chế Độ'
                    : 'Cập Nhật Khóa Thôi Việc'
                  : isRegime
                  ? 'Khóa Nghỉ Chế Độ'
                  : 'Khóa Thôi Việc'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
