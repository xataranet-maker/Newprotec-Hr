import React, { useState, useEffect } from 'react';
import { UserAccount } from '../../types';
import { 
  Menu, Cloud, CloudOff, RefreshCw, LogOut, 
  Clock, Shield, Lock, QrCode
} from 'lucide-react';

export type SyncStatusKind = 'idle' | 'turso' | 'local' | 'firestore' | 'error';

interface TopBarProps {
  currentUser: UserAccount | null;
  activeTabLabel: string;
  activeItemLabel: string;
  toggleSidebar: () => void;
  isSidebarOpen?: boolean;
  isSyncing: boolean;
  onSync: () => void;
  lastSyncTime: string | null;
  syncStatus?: SyncStatusKind;
  syncDetail?: string | null;
  onOpenQR?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  activeTabLabel,
  activeItemLabel,
  toggleSidebar,
  isSidebarOpen = false,
  isSyncing,
  onSync,
  lastSyncTime,
  syncStatus = 'idle',
  syncDetail = null,
  onOpenQR
}) => {
  const [time, setTime] = useState<string>('');
  const [currentShift, setCurrentShift] = useState<'Ca Ngày' | 'Ca Đêm'>('Ca Ngày');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('vi-VN', { hour12: false }));
      const hour = now.getHours();
      setCurrentShift(hour >= 8 && hour < 20 ? 'Ca Ngày' : 'Ca Đêm');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const isError = syncStatus === 'error';
  const isFallback = syncStatus === 'local' || syncStatus === 'firestore';
  const defaultTitle =
    syncDetail ||
    'Đồng bộ dữ liệu với Vercel Turso Database (database-newprotec)';

  return (
    <header className="h-14 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 flex items-center justify-between text-xs font-medium z-30 select-none shrink-0">
      {/* Zone 1: Mobile Menu Trigger & Context Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className={`md:hidden p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            isSidebarOpen
              ? 'bg-indigo-500/20 text-indigo-300'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
          }`}
          title="Mở menu"
          aria-label="Mở menu"
        >
          <Menu className="w-4 h-4 text-indigo-400" />
        </button>

        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-bold tracking-tight text-slate-100 text-sm hidden md:inline">
            NEWPROTEC <span className="text-cyan-400">V2.0</span>
          </span>
          <span className="text-slate-600 hidden md:inline">/</span>
          <button 
            onClick={toggleSidebar}
            className="text-slate-300 hover:text-cyan-400 uppercase tracking-wider font-semibold cursor-pointer truncate transition-colors"
            title="Kích để mở danh sách phân hệ"
          >
            {activeTabLabel || 'HOME'}
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-cyan-300 font-semibold uppercase truncate">
            {activeItemLabel || 'TỔNG HỢP'}
          </span>
        </div>
      </div>

      {/* Zone 2: Shift, Clock, Sync status */}
      <div className="hidden lg:flex items-center gap-4 text-slate-300">
        <div className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800">
          <span className={`w-2 h-2 rounded-full ${currentShift === 'Ca Ngày' ? 'bg-amber-400' : 'bg-indigo-400'}`} />
          <span className="font-semibold text-slate-200">{currentShift}</span>
          <span className="text-slate-500 text-[11px] font-mono">(08:00 - 20:00)</span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-slate-300 tabular-nums bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{time || '--:--:--'}</span>
        </div>

        <button
          onClick={onSync}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
            isError
              ? 'bg-rose-950/60 hover:bg-rose-900/60 border-rose-500/50 text-rose-300'
              : isFallback
              ? 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/40 text-amber-200'
              : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/60 text-slate-300 hover:text-cyan-300'
          }`}
          title={defaultTitle}
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          ) : isError ? (
            <CloudOff className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Cloud className={`w-3.5 h-3.5 ${isFallback ? 'text-amber-400' : 'text-cyan-400'}`} />
          )}
          <span>{isSyncing ? 'Đang lưu...' : isError ? 'Lỗi Cloud' : 'Lưu Cloud'}</span>
          {lastSyncTime && (
            <span className="text-[10px] text-slate-400 font-mono">({lastSyncTime})</span>
          )}
        </button>
      </div>

      {/* Zone 3: User Info & Actions */}
      <div className="flex items-center gap-2.5">
        {onOpenQR && (
          <button
            type="button"
            onClick={onOpenQR}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
            title="Hiển thị & tải Mã QR truy cập ứng dụng"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline font-semibold">Mã QR App</span>
          </button>
        )}

        <div className="flex items-center gap-2 pl-2.5 border-l border-slate-800">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
            {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden md:flex flex-col text-left leading-tight">
            <span className="font-semibold text-slate-200 text-xs truncate max-w-[140px]">
              {currentUser?.fullName || 'Người dùng'}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono uppercase">
              <Shield className="w-2.5 h-2.5 text-cyan-400" />
              {currentUser?.role || 'User'}
            </span>
          </div>
        </div>

        {currentUser?.role === 'qrcode' ? (
          <div
            className="px-2.5 py-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold flex items-center gap-1.5 ml-1"
            title="Trạm QRCODE đang được bảo vệ — Sử dụng nút QR Đăng Nhập / Thoát để Quản trị viên quét mở khóa"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Đã khóa trạm QR</span>
          </div>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-400 hover:text-red-300 border border-red-900/30 transition-colors cursor-pointer ml-1"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
