import React, { useMemo, useState } from 'react';
import { SecurityGateLogRecord, StaffRecord } from '../../types';
import { formatStaffDeptLabel, EmployeeIdCard } from '../common/EmployeeIdCard';
import { SecurityQRScannerModal } from './SecurityQRScannerModal';
import {
  ShieldCheck,
  ScanLine,
  Search,
  LogIn,
  LogOut,
  Clock,
  CreditCard,
  Calendar,
  X,
  ArrowLeftRight,
} from 'lucide-react';

interface SecurityGateControlProps {
  allStaff: StaffRecord[];
  logs: SecurityGateLogRecord[];
  onRecordScan: (staff: StaffRecord, direction: 'IN' | 'OUT') => SecurityGateLogRecord;
  onUpdateDirection: (logId: number, direction: 'IN' | 'OUT') => void;
  recordedByLabel?: string;
}

function getTodayIsoLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const SecurityGateControl: React.FC<SecurityGateControlProps> = ({
  allStaff,
  logs,
  onRecordScan,
  onUpdateDirection,
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [scannerInitialDir, setScannerInitialDir] = useState<'IN' | 'OUT'>('IN');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>(getTodayIsoLocal);
  const [dirFilter, setDirFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [inspectCardStaff, setInspectCardStaff] = useState<StaffRecord | null>(null);

  // Enrich each gate log with live info from allStaff (Thẻ nhân viên)
  const enrichedLogs = useMemo(() => {
    const staffById = new Map<string, StaffRecord>();
    allStaff.forEach((s) => {
      staffById.set(s.employeeId.trim().toLowerCase(), s);
    });

    return logs.map((log) => {
      const live = staffById.get(log.employeeId.trim().toLowerCase());
      return {
        ...log,
        liveFullName: live?.fullName || log.fullName,
        liveDepartment: formatStaffDeptLabel(live?.department || log.department),
        livePosition: live?.position || log.position || 'Nhân viên',
        liveAvatarUrl: live?.avatarUrl || '',
        liveBadgeIssued: live?.badgeIssued ?? log.badgeIssued,
        liveStaff: live || null,
      };
    });
  }, [logs, allStaff]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return enrichedLogs.filter((item) => {
      if (dateFilter && item.date !== dateFilter) return false;
      if (dirFilter !== 'ALL' && item.direction !== dirFilter) return false;
      if (q) {
        const match =
          item.liveFullName.toLowerCase().includes(q) ||
          item.employeeId.toLowerCase().includes(q) ||
          item.liveDepartment.toLowerCase().includes(q) ||
          item.livePosition.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [enrichedLogs, dateFilter, dirFilter, searchTerm]);

  const stats = useMemo(() => {
    const scope = dateFilter
      ? enrichedLogs.filter((l) => l.date === dateFilter)
      : enrichedLogs;
    const inCount = scope.filter((l) => l.direction === 'IN').length;
    const outCount = scope.filter((l) => l.direction === 'OUT').length;
    return {
      total: scope.length,
      inCount,
      outCount,
    };
  }, [enrichedLogs, dateFilter]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Action Bar with Scan Employee QR button right at top of the list */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>Kiểm Soát An Ninh — Danh Sách Nhân Viên Ra &amp; Vào</span>
          </h2>
          <p className="text-xs text-slate-400">
            Thông tin nhân viên được đồng bộ trực tiếp từ Thẻ Nhân Viên khi quét mã QR tại cổng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setScannerInitialDir('IN');
              setShowScanner(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ScanLine className="w-4 h-4" />
            <span>Quét Mã QR Nhân Viên</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Tổng Lượt {dateFilter ? 'Trong Ngày' : 'Tất Cả'}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
            {stats.total}
          </div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-800/50 p-3.5 rounded-xl">
          <div className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider flex items-center justify-between">
            <span>Lượt Vào Cổng</span>
            <LogIn className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
            {stats.inCount}
          </div>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/50 p-3.5 rounded-xl">
          <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider flex items-center justify-between">
            <span>Lượt Ra Cổng</span>
            <LogOut className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-1">
            {stats.outCount}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên nhân viên, mã NV, bộ phận..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-mono focus:outline-hidden"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold px-1.5 cursor-pointer"
                title="Hiển thị tất cả ngày"
              >
                Tất cả
              </button>
            )}
          </div>

          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setDirFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                dirFilter === 'ALL'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setDirFilter('IN')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                dirFilter === 'IN'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vào
            </button>
            <button
              type="button"
              onClick={() => setDirFilter('OUT')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                dirFilter === 'OUT'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ra
            </button>
          </div>
        </div>
      </div>

      {/* Employee In/Out List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-cyan-400">
              <ScanLine className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                Chưa có lượt nhân viên ra / vào {dateFilter ? `ngày ${dateFilter}` : ''}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Nhấn nút &quot;Quét Mã QR Nhân Viên&quot; phía trên để quét thẻ nhân viên và cập nhật thời gian ra / vào cổng.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              <ScanLine className="w-4 h-4" />
              <span>Quét Mã QR Ngay</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/90 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Nhân Viên (Từ Thẻ NV)</th>
                  <th className="py-3 px-3">Mã NV</th>
                  <th className="py-3 px-3">Bộ Phận</th>
                  <th className="py-3 px-3">Chức Vụ</th>
                  <th className="py-3 px-3 text-center">Trạng Thái</th>
                  <th className="py-3 px-3">Thời Gian Cập Nhật</th>
                  <th className="py-3 px-3 text-center">Thẻ Đeo</th>
                  <th className="py-3 px-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-200">
                {filteredLogs.map((item) => {
                  const isIn = item.direction === 'IN';
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        if (item.liveStaff) setInspectCardStaff(item.liveStaff);
                      }}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        item.liveStaff ? 'cursor-pointer' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          {item.liveAvatarUrl ? (
                            <img
                              src={item.liveAvatarUrl}
                              alt={item.liveFullName}
                              referrerPolicy="no-referrer"
                              className="w-8 h-10 rounded-md object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-10 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-300 font-bold text-xs shrink-0">
                              {item.liveFullName.charAt(0)}
                            </div>
                          )}
                          <span className="font-bold text-white uppercase tracking-wide">
                            {item.liveFullName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-300 tabular-nums">
                        {item.employeeId}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {item.liveDepartment}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{item.livePosition}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] uppercase ${
                            isIn ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {isIn ? (
                            <LogIn className="w-3.5 h-3.5" />
                          ) : (
                            <LogOut className="w-3.5 h-3.5" />
                          )}
                          <span>{isIn ? 'VÀO' : 'RA'}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-white font-semibold">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{item.timeStr}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-400 text-[11px]">{item.dateStr}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[11px] font-semibold ${
                            item.liveBadgeIssued ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {item.liveBadgeIssued ? 'Đã cấp thẻ' : 'Chưa cấp'}
                        </span>
                      </td>
                      <td
                        className="py-2.5 px-3.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateDirection(item.id, isIn ? 'OUT' : 'IN')
                            }
                            title={`Đổi trạng thái sang ${isIn ? 'RA' : 'VÀO'}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold cursor-pointer transition-colors"
                          >
                            <ArrowLeftRight className="w-3 h-3 text-cyan-400" />
                            <span>{isIn ? 'Đổi RA' : 'Đổi VÀO'}</span>
                          </button>

                          {item.liveStaff && (
                            <button
                              type="button"
                              onClick={() => setInspectCardStaff(item.liveStaff)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-600 border border-cyan-700/60 text-cyan-300 hover:text-white text-[11px] font-semibold cursor-pointer transition-colors"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Xem thẻ</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      <SecurityQRScannerModal
        isOpen={showScanner}
        allStaff={allStaff}
        initialDirection={scannerInitialDir}
        onClose={() => setShowScanner(false)}
        onRecordScan={onRecordScan}
        onUpdateDirection={onUpdateDirection}
      />

      {/* Read-only Employee Card Viewer (shows ONLY the card & card info) */}
      {inspectCardStaff && (
        <div
          className="fixed inset-0 z-[115] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setInspectCardStaff(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-sm p-4 sm:p-5 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                Thẻ Nhân Viên
              </h3>
              <button
                type="button"
                onClick={() => setInspectCardStaff(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <EmployeeIdCard staff={inspectCardStaff} />
          </div>
        </div>
      )}
    </div>
  );
};
