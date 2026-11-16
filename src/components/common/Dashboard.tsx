import React, { useState } from 'react';
import {
  StaffRecord,
  AttendanceRecord,
  OvertimeRecord,
  HRAnnouncement,
  UserAccount,
} from '../../types';
import {
  Factory,
  Users,
  ArrowUpRight,
  Megaphone,
  CalendarDays,
  Plus,
  ClipboardCheck,
  Banknote,
  ShieldAlert,
} from 'lucide-react';

interface DashboardProps {
  multiStaff: StaffRecord[];
  hrStaff: StaffRecord[];
  allStaffData: StaffRecord[];
  attendanceHistory: AttendanceRecord[];
  overtimeRecords: OvertimeRecord[];
  announcements: HRAnnouncement[];
  onNavigate: (id: string) => void;
  onAddPlan: (p: any) => void;
  currentUser: UserAccount;
}

export const Dashboard: React.FC<DashboardProps> = ({
  multiStaff,
  hrStaff,
  allStaffData,
  overtimeRecords,
  announcements,
  onNavigate,
  onAddPlan,
  currentUser,
}) => {
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [targetDept, setTargetDept] = useState('Multi Auto');
  const [model, setModel] = useState('');
  const [content, setContent] = useState('');

  const onTimeCount = allStaffData.filter(
    (s) => s.attendance === 'Đúng giờ' || s.attendance === 'PRESENT' || s.attendance === 'Đủ công'
  ).length;
  const totalOtHours = overtimeRecords.reduce((sum, r) => sum + (r.hours || 0), 0);

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim() || !content.trim()) return;
    onAddPlan({
      id: Date.now(),
      targetDept,
      model,
      content,
      status: 'PENDING',
      timestamp: new Date().toLocaleString('vi-VN'),
      sender: currentUser.fullName,
    });
    setModel('');
    setContent('');
    setShowPlanModal(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>TRUNG TÂM QUẢN LÝ NHÂN SỰ & CHẤM CÔNG</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              NEWPROTEC VINA
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tổng quan quân số, chấm công ma trận, hành chính nhân sự và phân quyền hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPlanModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Kế Hoạch Mới</span>
          </button>
          <button
            onClick={() => onNavigate('multi_matrix_timekeeping')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
          >
            <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
            <span>Chấm Công Multi Auto</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('multi_staff')}
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Multi Auto</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Factory className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {multiStaff.length} <span className="text-xs text-slate-400 font-sans">Nhân viên</span>
            </div>
            <span className="text-xs text-emerald-400 font-mono">
              {multiStaff.filter((s) => s.shift === 'DAY').length} Ngày / {multiStaff.filter((s) => s.shift === 'NIGHT').length} Đêm
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
            <span>Nhân sự & Chấm công</span>
            <span className="text-cyan-400 group-hover:underline flex items-center gap-0.5">
              Chi tiết <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('staff_list')}
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">HC & Nhân Sự</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {allStaffData.length} <span className="text-xs text-slate-400 font-sans">Tổng NV</span>
            </div>
            <span className="text-xs text-cyan-400 font-mono">
              {hrStaff.length} HC-NS
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
            <span>Đúng giờ: {onTimeCount}/{allStaffData.length}</span>
            <span className="text-emerald-400 group-hover:underline flex items-center gap-0.5">
              Hồ sơ <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('hr_matrix_timekeeping')}
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bảng Công Ma Trận</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {totalOtHours}h <span className="text-xs text-slate-400 font-sans">Tăng ca</span>
            </div>
            <span className="text-xs text-amber-400 font-mono">Theo tháng</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
            <span>Ngày thường, CN & Lễ</span>
            <span className="text-amber-400 group-hover:underline flex items-center gap-0.5">
              Mở bảng <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('hr_payroll')}
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bảng Công & Lương</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-white tabular-nums">HC-NS</div>
            <span className="text-xs text-indigo-400 font-mono">Payroll</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
            <span>Bảng công & Phiếu lương</span>
            <span className="text-indigo-400 group-hover:underline flex items-center gap-0.5">
              Truy cập <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Shortcuts + Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-400" />
            <span>Truy Cập Nhanh Phân Hệ</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => onNavigate('multi_staff')}
              className="p-3.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-cyan-300">Nhân Viên Multi Auto</div>
              <div className="text-[10px] text-slate-500 mt-1">Điểm danh & Đăng ký tăng ca</div>
            </button>

            <button
              onClick={() => onNavigate('multi_matrix_timekeeping')}
              className="p-3.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-amber-300">Bảng Chấm Công Multi</div>
              <div className="text-[10px] text-slate-500 mt-1">Ma trận giờ vào/ra, CN & Lễ</div>
            </button>

            <button
              onClick={() => onNavigate('staff_list')}
              className="p-3.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-emerald-300">DS Nhân Viên (HC & NS)</div>
              <div className="text-[10px] text-slate-500 mt-1">Quản lý hồ sơ toàn công ty</div>
            </button>

            <button
              onClick={() => onNavigate('hr_matrix_timekeeping')}
              className="p-3.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-blue-300">Bảng Công Ma Trận HC-NS</div>
              <div className="text-[10px] text-slate-500 mt-1">Tổng hợp công toàn nhà máy</div>
            </button>

            <button
              onClick={() => onNavigate('hr_salary_slip')}
              className="p-3.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-indigo-300">Phiếu Lương</div>
              <div className="text-[10px] text-slate-500 mt-1">Phát hành & tra cứu lương</div>
            </button>

            {currentUser.role === 'admin' && currentUser.username.toLowerCase() !== 'admin' && (
              <button
                onClick={() => onNavigate('users')}
                className="p-3.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-semibold text-rose-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Quản Trị Tài Khoản</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Phân quyền người dùng</div>
              </button>
            )}
          </div>
        </div>

        {/* Announcements */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-red-400" />
              <span>Thông Báo</span>
            </h2>
            <button
              onClick={() => onNavigate('home_announcements')}
              className="text-xs text-cyan-400 hover:underline cursor-pointer"
            >
              Xem tất cả &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {announcements.slice(0, 3).map((ann) => (
              <div key={ann.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-left">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-200 truncate pr-2">{ann.title}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 ${
                      ann.priority === 'URGENT' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {ann.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{ann.content}</p>
                <div className="mt-2 text-[10px] text-slate-500 font-mono flex justify-between">
                  <span>{ann.sender || 'BQL'}</span>
                  <span>{ann.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Tạo Kế Hoạch */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Tạo Kế Hoạch Mới</h3>
            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Phòng Ban Tiếp Nhận</label>
                <select
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                >
                  <option value="Multi Auto">Multi Auto</option>
                  <option value="HC & NS">HC & NS</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tiêu Đề / Mã Kế Hoạch</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ví dụ: Kế hoạch nhân sự tháng 11"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nội Dung Chỉ Thị</label>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nội dung điều phối, thời hạn, yêu cầu..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold cursor-pointer"
                >
                  Gửi Kế Hoạch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
