import React, { useState } from 'react';
import { 
  ImportRecord, ExportRecord, MachineSetup, Language, RepairRecord, 
  QualityMetrics, NetDataRecord, ProductionHistoryRecord, StaffRecord, 
  AttendanceRecord, OvertimeRecord, HRAnnouncement, UserAccount 
} from '../../types';
import { translations } from '../../data/locales';
import { 
  Factory, Zap, Layers, Cpu, TrendingUp, AlertTriangle, 
  CheckCircle2, Clock, Users, ArrowUpRight, Megaphone, 
  Play, Calendar, Plus 
} from 'lucide-react';

interface DashboardProps {
  activeModule: string;
  multiAuto: { imports: ImportRecord[]; exports: ExportRecord[]; machineStatuses: MachineSetup[] };
  stiff: { imports: ImportRecord[]; exports: ExportRecord[]; machineStatuses: MachineSetup[] };
  mold: { imports: ImportRecord[]; exports: ExportRecord[]; machineStatuses: MachineSetup[] };
  stamping: { imports: ImportRecord[]; exports: ExportRecord[]; machineStatuses: MachineSetup[] };
  language: Language;
  repairHistory: RepairRecord[];
  qualityMetrics: QualityMetrics;
  onNavigate: (id: string) => void;
  deptTargets: Record<string, number>;
  allNetData: NetDataRecord[];
  allHistoryData: ProductionHistoryRecord[];
  allStaffData: StaffRecord[];
  attendanceHistory: AttendanceRecord[];
  overtimeRecords: OvertimeRecord[];
  announcements: HRAnnouncement[];
  onAddPlan: (p: any) => void;
  currentUser: UserAccount;
}

export const Dashboard: React.FC<DashboardProps> = ({
  multiAuto,
  stiff,
  mold,
  stamping,
  language,
  repairHistory,
  qualityMetrics,
  onNavigate,
  deptTargets,
  allHistoryData,
  allStaffData,
  announcements,
  onAddPlan,
  currentUser
}) => {
  const tr = translations[language] || translations.vi;
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [targetDept, setTargetDept] = useState('Multi Auto');
  const [model, setModel] = useState('');
  const [content, setContent] = useState('');

  // Calculate high-level KPIs
  const totalMultiOutput = multiAuto.imports.reduce((acc, r) => acc + (r.quantity || 0), 0);
  const totalStampingOutput = stamping.imports.reduce((acc, r) => acc + (r.quantity || 0), 0);
  const totalStiffOutput = stiff.imports.reduce((acc, r) => acc + (r.quantity || 0), 0);

  const runningMulti = multiAuto.imports.filter(r => r.productionStatus === 'RUNNING').length;
  const runningStamping = stamping.imports.filter(r => r.productionStatus === 'RUNNING').length;
  const runningStiff = stiff.imports.filter(r => r.productionStatus === 'RUNNING').length;

  const totalMachines = multiAuto.machineStatuses.length + stiff.machineStatuses.length + stamping.machineStatuses.length;
  const activeMachinesCount = runningMulti + runningStamping + runningStiff;

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
      sender: currentUser.fullName
    });
    setModel('');
    setContent('');
    setShowPlanModal(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>BẢNG ĐIỀU KHIỂN TRUNG TÂM SẢN XUẤT</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              REALTIME MES
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tổng quan hiệu suất vận hành, máy móc, định mức và luồng sản xuất các phân hệ Newprotec Vina.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPlanModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Kế Hoạch SX</span>
          </button>
          <button
            onClick={() => onNavigate('model_tracking')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-cyan-400" />
            <span>Theo Dõi Live</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Multi Auto */}
        <div 
          onClick={() => onNavigate('prod_report')} 
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
              {totalMultiOutput.toLocaleString()} <span className="text-xs text-slate-400 font-sans">PNL</span>
            </div>
            <span className="text-xs text-emerald-400 flex items-center font-mono">
              {runningMulti} máy chạy
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
            <span>Mục tiêu ca: {deptTargets['Multi Auto'] || 500} PNL</span>
            <span className="text-cyan-400 group-hover:underline flex items-center gap-0.5">
              Chi tiết <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Metric 2: Dập Tự Động */}
        <div 
          onClick={() => onNavigate('as_prod_rpt')} 
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dập Tự Động</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {totalStampingOutput.toLocaleString()} <span className="text-xs text-slate-400 font-sans">M/Pcs</span>
            </div>
            <span className="text-xs text-emerald-400 flex items-center font-mono">
              {runningStamping} máy chạy
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
            <span>Mục tiêu: {deptTargets['Dập Tự Động'] || 500}</span>
            <span className="text-purple-400 group-hover:underline flex items-center gap-0.5">
              Chi tiết <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Metric 3: Stiff */}
        <div 
          onClick={() => onNavigate('stiff_sus_auto')} 
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stiff (Dán Tấm Cứng)</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {totalStiffOutput.toLocaleString()} <span className="text-xs text-slate-400 font-sans">PNL</span>
            </div>
            <span className="text-xs text-emerald-400 flex items-center font-mono">
              {runningStiff} máy chạy
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
            <span>SUS/Tape: 4 khu vực</span>
            <span className="text-amber-400 group-hover:underline flex items-center gap-0.5">
              Chi tiết <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Metric 4: Nhân sự & Tỷ lệ hoàn thành */}
        <div 
          onClick={() => onNavigate('staff_list')} 
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Nhân Sự</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {allStaffData.length} <span className="text-xs text-slate-400 font-sans">Nhân viên</span>
            </div>
            <span className="text-xs text-cyan-400 font-mono">
              100% Điểm danh
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
            <span>Đang trực ca hiện tại</span>
            <span className="text-emerald-400 group-hover:underline flex items-center gap-0.5">
              Hồ sơ <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Grid: Machine Overview + Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine Statuses & Live Operations (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Trạng Thái Máy Móc Trực Tiếp ({activeMachinesCount}/{totalMachines} đang chạy)</span>
              </h2>
              <button 
                onClick={() => onNavigate('device_machine_setup')}
                className="text-xs text-cyan-400 hover:underline cursor-pointer"
              >
                Giám sát thiết bị &rarr;
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {multiAuto.machineStatuses.slice(0, 8).map(m => {
                const isRunning = multiAuto.imports.some(r => 
                  r.productionProgress && Object.values(r.productionProgress).some((p: any) => p.machine === m.name && p.status === 'RUNNING')
                );
                return (
                  <div 
                    key={m.id}
                    onClick={() => onNavigate('production')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isRunning 
                        ? 'bg-emerald-950/20 border-emerald-500/40 hover:bg-emerald-900/30' 
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-200">{m.name}</span>
                      <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 font-mono">
                      {isRunning ? 'RUNNING' : 'STANDBY'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Access Matrix */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Lối Tắt Vận Hành Nhanh</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button 
                onClick={() => onNavigate('import')}
                className="p-3 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-semibold text-slate-200">Nhập TP Multi</div>
                <div className="text-[10px] text-slate-500 mt-1">Đăng ký lô PNL mới</div>
              </button>
              <button 
                onClick={() => onNavigate('machine_book')}
                className="p-3 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-semibold text-slate-200">Nhập Phụ Liệu</div>
                <div className="text-[10px] text-slate-500 mt-1">Tape, Film, Cuộn</div>
              </button>
              <button 
                onClick={() => onNavigate('check_pl')}
                className="p-3 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-semibold text-slate-200">Check PL & Duyệt</div>
                <div className="text-[10px] text-slate-500 mt-1">Đối chiếu mã hàng</div>
              </button>
              <button 
                onClick={() => onNavigate('multi_backup')}
                className="p-3 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-semibold text-teal-300">Sao Lưu / Khôi Phục</div>
                <div className="text-[10px] text-slate-500 mt-1">Excel & Backup JSON</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Factory Announcements & Planning Feed */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-red-400" />
                <span>Thông Báo Xưởng</span>
              </h2>
              <button 
                onClick={() => onNavigate('home_announcements')}
                className="text-xs text-cyan-400 hover:underline cursor-pointer"
              >
                Xem tất cả &rarr;
              </button>
            </div>

            <div className="space-y-3">
              {announcements.slice(0, 3).map(ann => (
                <div key={ann.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-left">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-200 truncate pr-2">{ann.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 ${ann.priority === 'URGENT' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
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

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Tiến Độ Kế Hoạch Tuần</span>
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Multi Auto: Samsung SM-S928B</span>
                <span className="font-mono text-emerald-400 font-semibold">82%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: '82%' }} />
              </div>

              <div className="flex justify-between text-slate-300 pt-2">
                <span>Dập Tự Động: Xiaomi 15U</span>
                <span className="font-mono text-purple-400 font-semibold">65%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Tạo Kế Hoạch SX */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Tạo Kế Hoạch Sản Xuất Mới</h3>
            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Phòng Ban Tiếp Nhận</label>
                <select 
                  value={targetDept} 
                  onChange={e => setTargetDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                >
                  <option value="Multi Auto">Multi Auto</option>
                  <option value="Stiff">Stiff</option>
                  <option value="Dập Tự Động">Dập Tự Động</option>
                  <option value="Khuôn & Jig">Khuôn & Jig</option>
                  <option value="Thiết Bị">Thiết Bị</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Model / Mã Hàng</label>
                <input 
                  type="text" 
                  value={model} 
                  onChange={e => setModel(e.target.value)} 
                  placeholder="Ví dụ: SM-S928B" 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nội Dung Chỉ Thị & Số Lượng</label>
                <textarea 
                  rows={3} 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  placeholder="Nội dung điều phối, thời hạn ca, yêu cầu đặc biệt..." 
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
