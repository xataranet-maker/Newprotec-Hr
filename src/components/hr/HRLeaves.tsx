import React, { useState } from 'react';
import { LeaveRegistrationRecord, StaffRecord } from '../../types';
import { computeAnnualLeaveUsed } from './LeaveFormNPTFM007';
import { CalendarPlus, Plane, Edit3, Save, X } from 'lucide-react';

interface HRLeavesProps {
  allStaff: StaffRecord[];
  leaveRecords?: LeaveRegistrationRecord[];
  onUpdateStaffInfo: (st: StaffRecord) => void;
  onNavigateToRegister?: () => void;
}

export const HRLeaves: React.FC<HRLeavesProps> = ({
  allStaff,
  leaveRecords = [],
  onUpdateStaffInfo,
  onNavigateToRegister,
}) => {
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [editQuota, setEditQuota] = useState<number>(12);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenEdit = (s: StaffRecord) => {
    setEditingStaff(s);
    setEditQuota(s.annualLeaveQuota !== undefined ? s.annualLeaveQuota : 12);
  };

  const handleSaveQuota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    const newQuota = Math.max(0, Number(editQuota) || 12);
    onUpdateStaffInfo({
      ...editingStaff,
      annualLeaveQuota: newQuota,
    });

    setEditingStaff(null);
    showToast(`Đã cập nhật quỹ phép năm cho ${editingStaff.fullName} thành ${newQuota} ngày!`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs">
      <div className="pb-4 border-b border-slate-800 px-2 sm:px-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-cyan-400 shrink-0" />
          <h2 className="text-base sm:text-lg font-bold text-white">
            Quản Lý Nghỉ Phép &amp; Quỹ Phép Năm (Cấu Hình Phép Còn Tồn)
          </h2>
        </div>
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

      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-semibold animate-fade-in">
          {toastMsg}
        </div>
      )}

      <div className="bg-[#0a1222] border border-slate-800 rounded-xl p-4 space-y-3">
        <p className="text-slate-400 text-xs">
          Danh sách nhân sự toàn công ty. Bạn có thể bấm nút <strong className="text-cyan-300">Sửa Phép</strong> để điều chỉnh tổng quỹ phép năm (mặc định 12 ngày) hoặc số ngày phép còn tồn cho từng nhân viên.
        </p>

        <div className="divide-y divide-slate-800/80">
          {allStaff.map((s) => {
            const usedAnnual = computeAnnualLeaveUsed(leaveRecords, s.employeeId);
            const quota = s.annualLeaveQuota !== undefined ? s.annualLeaveQuota : 12;
            const remaining = Math.max(0, quota - usedAnnual);
            const totalRequests = leaveRecords.filter(
              (r) =>
                r.employeeId.trim().toLowerCase() ===
                s.employeeId.trim().toLowerCase()
            ).length;

            return (
              <div
                key={s.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300 hover:bg-slate-900/30 px-2 rounded-lg transition-colors"
              >
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    <span>{s.fullName}</span>
                    <span className="font-mono text-cyan-400 font-normal">({s.employeeId})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {s.department || 'MULTI'} · {s.position || 'Nhân viên'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
                  <span className="text-slate-400">
                    Đã đk: <strong className="text-slate-200">{totalRequests}</strong> đơn
                  </span>
                  <span className="text-amber-300">
                    Đã dùng: <strong>{usedAnnual}</strong> ngày
                  </span>
                  <span className="text-cyan-400 font-bold">
                    Quỹ phép: <strong>{quota}</strong> ngày · Còn lại: <span className="text-emerald-400">{remaining} ngày</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(s)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa Phép</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Sửa Phép Năm */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f172a] border border-cyan-500/40 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <span>Điều Chỉnh Quỹ Phép Năm</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div>Nhân viên: <strong className="text-white">{editingStaff.fullName}</strong></div>
              <div>Mã NV: <strong className="text-cyan-400 font-mono">{editingStaff.employeeId}</strong></div>
              <div>Đã sử dụng: <strong className="text-amber-400">{computeAnnualLeaveUsed(leaveRecords, editingStaff.employeeId)} ngày</strong></div>
            </div>

            <form onSubmit={handleSaveQuota} className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Tổng quỹ phép năm (ngày) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="365"
                  value={editQuota}
                  onChange={(e) => setEditQuota(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-xs focus:border-cyan-500 outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Số ngày phép còn tồn sẽ tự động tính bằng: Tổng quỹ phép - Số ngày đã dùng.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
