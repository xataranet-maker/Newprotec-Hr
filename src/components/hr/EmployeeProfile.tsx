import React, { useState } from 'react';
import { 
  UserAccount, StaffRecord, ContractRecord, SalarySlipRecord, PayrollRecord, 
  OvertimeRecord, HRAnnouncement, TimekeepingRecord, AttendanceCorrectionRequest, 
  AttendanceConfirmationRecord 
} from '../../types';
import { 
  User, Calendar, Clock, DollarSign, FileText, Send, 
  CheckCircle2, AlertTriangle, Shield, Phone, Home, Briefcase 
} from 'lucide-react';

interface EmployeeProfileProps {
  currentUser: UserAccount;
  staffInfo?: StaffRecord;
  contracts: ContractRecord[];
  salarySlips: SalarySlipRecord[];
  payrollRecords: PayrollRecord[];
  overtimeRecords: OvertimeRecord[];
  announcements: HRAnnouncement[];
  timekeepingRecords: TimekeepingRecord[];
  attendanceRequests: AttendanceCorrectionRequest[];
  onRequestCorrection: (req: AttendanceCorrectionRequest) => void;
  attendanceConfirmations: AttendanceConfirmationRecord[];
  onUpdateAttendanceConfirmation: (conf: any) => void;
  onUpdateStaffInfo: (st: StaffRecord) => void;
  onUpdateAvatar: (url: string) => void;
}

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({
  currentUser,
  staffInfo,
  contracts,
  salarySlips,
  overtimeRecords,
  timekeepingRecords,
  attendanceRequests,
  onRequestCorrection,
  attendanceConfirmations,
  onUpdateAttendanceConfirmation,
  onUpdateStaffInfo
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'salary' | 'request'>('profile');
  const [reqDate, setReqDate] = useState(new Date().toISOString().split('T')[0]);
  const [inTime, setInTime] = useState('08:00');
  const [outTime, setOutTime] = useState('20:00');
  const [reason, setReason] = useState('');
  const [reqSuccess, setReqSuccess] = useState(false);

  const empId = currentUser.employeeId || staffInfo?.employeeId || 'NV001';
  const name = staffInfo?.fullName || currentUser.fullName;

  // Filter employee data
  const myTimekeeping = timekeepingRecords.filter(t => t.employeeId === empId);
  const myOvertime = overtimeRecords.filter(o => o.employeeId === empId);
  const mySalarySlips = salarySlips.filter(s => s.employeeId === empId);
  const myRequests = attendanceRequests.filter(r => r.employeeId === empId);

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    onRequestCorrection({
      id: Date.now(),
      employeeId: empId,
      fullName: name,
      date: reqDate,
      inTime,
      outTime,
      reason,
      status: 'PENDING',
      requestDate: new Date().toLocaleDateString('vi-VN')
    });

    setReason('');
    setReqSuccess(true);
    setTimeout(() => setReqSuccess(false), 3000);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Profile Badge */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">{name}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-mono border border-cyan-500/20 w-fit mx-auto sm:mx-0">
              Mã NV: {empId}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {staffInfo?.position || 'Nhân viên vận hành'} · Bộ phận: {staffInfo?.department || currentUser.department || 'Multi Auto'}
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              {staffInfo?.phone || '0987-xxx-xxx'}
            </span>
            <span className="flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-slate-500" />
              {staffInfo?.hometown || 'Việt Nam'}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Trạng thái: {staffInfo?.attendance || 'Đúng giờ'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-medium space-x-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Thông Tin Chung
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors cursor-pointer ${
            activeTab === 'attendance'
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Lịch Sử Điểm Danh & Tăng Ca
        </button>
        <button
          onClick={() => setActiveTab('salary')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors cursor-pointer ${
            activeTab === 'salary'
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Phiếu Lương & Hợp Đồng
        </button>
        <button
          onClick={() => setActiveTab('request')}
          className={`px-4 py-2.5 border-b-2 font-semibold transition-colors cursor-pointer ${
            activeTab === 'request'
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Yêu Cầu Giải Trình Công ({myRequests.length})
        </button>
      </div>

      {/* Tab 1: Profile Info */}
      {activeTab === 'profile' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <h3 className="font-bold text-sm text-white pb-2 border-b border-slate-800">
            Hồ Sơ Lý Lịch Nhân Sự
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-300">
            <div>
              <span className="text-slate-400 block mb-1">Họ và tên:</span>
              <span className="font-semibold text-white">{name}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Mã nhân viên:</span>
              <span className="font-mono text-cyan-400 font-semibold">{empId}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Ngày vào làm việc:</span>
              <span className="font-mono">{staffInfo?.dateJoined || '01/01/2023'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Ngày sinh:</span>
              <span className="font-mono">{staffInfo?.dob || '15/08/1995'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Quê quán:</span>
              <span>{staffInfo?.hometown || 'Bắc Ninh'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Ca làm việc mặc định:</span>
              <span className="font-semibold">{staffInfo?.shift === 'DAY' ? 'Ca Ngày (08:00 - 20:00)' : 'Ca Đêm (20:00 - 08:00)'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Attendance & Overtime */}
      {activeTab === 'attendance' && (
        <div className="space-y-4 text-xs">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <h3 className="font-bold text-sm text-white pb-2 border-b border-slate-800 mb-3">
              Lịch Sử Chấm Công Gần Nhất
            </h3>
            {myTimekeeping.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                Chưa có dữ liệu quẹt thẻ chấm công trong tháng này.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {myTimekeeping.map(t => (
                  <div key={t.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-200">{t.date}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Giờ quẹt: {t.time}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 font-mono">
                      {t.attendanceStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <h3 className="font-bold text-sm text-white pb-2 border-b border-slate-800 mb-3">
              Số Giờ Tăng Ca Đã Đăng Ký
            </h3>
            {myOvertime.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                Chưa có giờ tăng ca nào được ghi nhận.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {myOvertime.map(o => (
                  <div key={o.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-200">{o.date}</div>
                      <div className="text-[11px] text-slate-400">{o.reason || 'Tăng ca theo kế hoạch sản xuất'}</div>
                    </div>
                    <span className="font-mono text-cyan-400 font-bold">+{o.hours} Giờ</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Salary Slips */}
      {activeTab === 'salary' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 text-xs space-y-4">
          <h3 className="font-bold text-sm text-white pb-2 border-b border-slate-800">
            Phiếu Lương Điện Tử Hàng Tháng
          </h3>
          {mySalarySlips.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              Chưa có phiếu lương được phát hành cho mã nhân viên {empId}.
            </div>
          ) : (
            <div className="space-y-3">
              {mySalarySlips.map(s => (
                <div key={s.id} className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-200">Phiếu lương tháng {s.month}</div>
                    <div className="text-[11px] text-slate-400 font-mono">Cập nhật: {s.uploadDate}</div>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/40 transition-colors">
                    Xem Chi Tiết
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Correction Requests */}
      {activeTab === 'request' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <form onSubmit={handleSendRequest} className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-sm text-white pb-2 border-b border-slate-800">
              Gửi Giải Trình Quên Quẹt Thẻ / Sai Công
            </h3>

            {reqSuccess && (
              <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300">
                Đã gửi giải trình thành công tới phòng Nhân sự!
              </div>
            )}

            <div>
              <label className="block text-slate-400 mb-1">Ngày cần giải trình</label>
              <input
                type="date"
                value={reqDate}
                onChange={e => setReqDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Giờ vào thực tế</label>
                <input
                  type="time"
                  value={inTime}
                  onChange={e => setInTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Giờ ra thực tế</label>
                <input
                  type="time"
                  value={outTime}
                  onChange={e => setOutTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Lý do giải trình</label>
              <textarea
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ví dụ: Máy quẹt thẻ lỗi, đi công tác, trực máy liên tục..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold cursor-pointer shadow-md"
            >
              Gửi Đơn Giải Trình
            </button>
          </form>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-sm text-white pb-2 border-b border-slate-800">
              Danh Sách Đơn Đã Gửi ({myRequests.length})
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {myRequests.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  Chưa có đơn giải trình nào được tạo.
                </div>
              ) : (
                myRequests.map(r => (
                  <div key={r.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">{r.date}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        r.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="text-slate-400 font-mono text-[11px]">
                      Vào: {r.inTime} - Ra: {r.outTime}
                    </div>
                    <p className="text-slate-300">{r.reason}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
