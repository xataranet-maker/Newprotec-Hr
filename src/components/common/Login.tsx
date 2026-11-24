import React, { useState } from 'react';
import { UserAccount, StaffRecord, Language } from '../../types';
import { translations } from '../../data/locales';
import { Lock, User, Globe, ArrowRight, ShieldCheck, QrCode, ScanLine, FileText, Users, Clock, Calculator } from 'lucide-react';
import { AppQRModal } from './AppQRModal';
import { StaffQRScannerModal } from './StaffQRScannerModal';
import { AdminContactFooter } from './AdminContactFooter';

interface LoginProps {
  users: UserAccount[];
  allStaff: StaffRecord[];
  onLogin: (user: UserAccount) => void;
  onQrQuickAccess?: (params: { employeeId: string; token: string }, staff: StaffRecord) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenCatalog?: () => void;
  onOpenQrcodeGate?: () => void;
}

export const Login: React.FC<LoginProps> = ({
  users,
  allStaff,
  onLogin,
  onQrQuickAccess,
  language,
  onLanguageChange,
  onOpenCatalog,
  onOpenQrcodeGate,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    // 1. Check employee ID login (Tài khoản là mã nhân viên, mật khẩu là 123)
    const foundStaff = allStaff.find(
      s => s.employeeId.toLowerCase() === trimmedUser.toLowerCase()
    );

    if (foundStaff) {
      const matchedAccount = users.find(
        u => u.username.toLowerCase() === trimmedUser.toLowerCase() && u.role === 'staff'
      );
      const expectedPassword = matchedAccount?.password || '123';
      if (trimmedPass === expectedPassword || trimmedPass === '123') {
        onLogin({
          username: foundStaff.employeeId,
          fullName: foundStaff.fullName,
          role: 'staff',
          employeeId: foundStaff.employeeId,
          department: foundStaff.department || 'MULTI'
        });
        return;
      }
      setError('Mật khẩu nhân viên không chính xác.');
      return;
    }

    // 2. Check manager / admin user accounts
    const foundUser = users.find(
      u => u.username.toLowerCase() === trimmedUser.toLowerCase()
    );

    if (foundUser) {
      if (!foundUser.password || foundUser.password === trimmedPass) {
        onLogin(foundUser);
        return;
      }
    }

    // 3. Fallback for demo ease if matching admin or newprotec
    if (trimmedUser.toLowerCase() === 'newprotec' && (trimmedPass === 'New123@' || trimmedPass === '123')) {
      onLogin({
        username: 'Newprotec',
        fullName: 'Newprotec Admin',
        role: 'admin'
      });
      return;
    }
    if (trimmedUser.toLowerCase() === 'admin' && trimmedPass === '123') {
      onLogin({
        username: 'admin',
        fullName: 'Root Admin',
        role: 'admin'
      });
      return;
    }
    if (trimmedUser.toLowerCase() === 'qrcode' && trimmedPass === '123') {
      onLogin({
        username: 'QRCODE',
        fullName: 'Trạm QR Chấm Công',
        role: 'qrcode',
        employeeId: 'QRCODE',
        department: 'ALL'
      });
      return;
    }
    if ((trimmedUser.toLowerCase() === 'an ninh' || trimmedUser.toLowerCase() === 'anninh') && trimmedPass === '123') {
      onLogin({
        username: 'AN NINH',
        fullName: 'Bảo Vệ / An Ninh Cổng',
        role: 'security',
        employeeId: 'ANNINH',
        department: 'SECURITY'
      });
      return;
    }

    setError('Tài khoản hoặc mật khẩu không chính xác.');
  };

  const actionCount = 1 + (onOpenQrcodeGate ? 1 : 0) + (onOpenCatalog ? 1 : 0);
  const mobileGridCols =
    actionCount >= 3 ? 'grid-cols-3' : actionCount === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col justify-between gap-6 p-4 sm:p-8 select-none text-slate-100">
      {/* Top Bar: Row 1 Brand + Mobile Language, Row 2 Symmetrical Action Cards */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 max-w-5xl mx-auto w-full">
        {/* Top Row: Company Logo & Name (left) + Compact Language Switcher (mobile right) */}
        <div className="flex items-center justify-between gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold shrink-0">
              NP
            </div>
            <div className="whitespace-nowrap">
              <div className="font-bold text-sm tracking-tight text-white leading-tight">
                NEWPROTEC VINA
              </div>
              <div className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase leading-tight">
                SMART MES V2.0
              </div>
            </div>
          </div>

          <div className="flex md:hidden items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-lg p-1 text-[11px] shrink-0">
            <Globe className="w-3 h-3 text-slate-400 mx-1 shrink-0" />
            <button
              type="button"
              onClick={() => onLanguageChange('vi')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                language === 'vi' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('ko')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                language === 'ko' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              한국어
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                language === 'en' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Action Cards Row: Equal-width symmetrical grid on mobile, inline flex on desktop */}
        <div className={`grid ${mobileGridCols} md:flex md:items-center gap-2 w-full md:w-auto`}>
          {onOpenQrcodeGate && (
            <button
              type="button"
              onClick={onOpenQrcodeGate}
              className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-2 md:py-1.5 rounded-xl md:rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 text-[11px] md:text-xs font-bold leading-tight text-center transition-colors cursor-pointer h-full"
              title="Mở trang Trạm Chấm Công QRCODE (Admin quét QR để tự động đăng nhập)"
            >
              <QrCode className="w-4 h-4 md:w-3.5 md:h-3.5 text-emerald-400 shrink-0" />
              <span>Trạm QRCODE</span>
            </button>
          )}

          {onOpenCatalog && (
            <button
              type="button"
              onClick={onOpenCatalog}
              className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-2 md:py-1.5 rounded-xl md:rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-amber-200 text-[11px] md:text-xs font-bold leading-tight text-center transition-colors cursor-pointer h-full"
              title="Xem Catalog giới thiệu ứng dụng không cần đăng nhập"
            >
              <FileText className="w-4 h-4 md:w-3.5 md:h-3.5 text-amber-400 shrink-0" />
              <span>Catalog App</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowQRModal(true)}
            className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-2 md:py-1.5 rounded-xl md:rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[11px] md:text-xs font-semibold leading-tight text-center transition-colors cursor-pointer h-full"
            title="Mở & tải Mã QR của ứng dụng"
          >
            <QrCode className="w-4 h-4 md:w-3.5 md:h-3.5 text-cyan-400 shrink-0" />
            <span>Mã QR App</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs shrink-0">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <button
              type="button"
              onClick={() => onLanguageChange('vi')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                language === 'vi' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('ko')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                language === 'ko' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              한국어
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                language === 'en' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Đăng Nhập Hệ Thống
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Hệ thống quản lý nhân sự &amp; sản xuất Newprotec Vina V2.0.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Tài khoản hoặc Mã nhân viên (Employee ID)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Nhập tài khoản hoặc mã nhân viên"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mật khẩu đăng nhập"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-900/20 transition-all cursor-pointer"
            >
              <span>Vào Hệ Thống</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="relative flex items-center py-0.5">
              <div className="flex-grow border-t border-slate-800" />
              <span className="shrink mx-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Hoặc truy cập nhanh
              </span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            {/* Scan Employee QR Code for Quick Access */}
            <button
              type="button"
              onClick={() => setShowQRScanner(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/50 text-teal-200 hover:text-white text-xs font-bold shadow-md shadow-teal-950/30 transition-all cursor-pointer"
            >
              <ScanLine className="w-4 h-4 text-teal-300" />
              <span>Quét Mã QR Truy Cập Nhanh</span>
            </button>
          </form>
        </div>
      </div>

      {/* Semantic Enterprise HR/HRM & Smart Attendance Overview (SEO & Public Info) */}
      <section
        aria-label="Giải pháp Quản lý Nhân sự HRM và Chấm công thông minh"
        className="w-full max-w-4xl mx-auto mt-6 mb-4 pt-5 border-t border-slate-800/70 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
              Giải Pháp Quản Lý Nhân Sự (HRM) &amp; Chấm Công Thông Minh Newprotec Vina
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Nền tảng HR/HRM hợp nhất dành cho doanh nghiệp &amp; nhà máy: tự động hóa chấm công QR Code, nhận diện khuôn mặt AI, quản lý hồ sơ nhân sự, tăng ca và tính lương chính xác.
            </p>
          </div>
          {onOpenCatalog && (
            <button
              type="button"
              onClick={onOpenCatalog}
              className="shrink-0 self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Xem Tài Liệu HRM</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <article className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
              <Clock className="w-4 h-4 shrink-0" />
              <h2>Chấm Công QR &amp; Khuôn Mặt AI</h2>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Quét mã QR động thời gian thực hoặc xác thực khuôn mặt không tiếp xúc tại trạm Kiosk, phát âm thanh xác nhận và đồng bộ trực tiếp lên bảng công.
            </p>
          </article>

          <article className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <Users className="w-4 h-4 shrink-0" />
              <h2>Quản Lý Nhân Sự &amp; Hợp Đồng HR</h2>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Số hóa toàn bộ hồ sơ nhân viên, thẻ QR cá nhân, hợp đồng lao động, cơ cấu phòng ban, đăng ký nghỉ phép và phê duyệt đơn từ trực tuyến.
            </p>
          </article>

          <article className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
              <Calculator className="w-4 h-4 shrink-0" />
              <h2>Bảng Công Ma Trận &amp; Tính Lương</h2>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tổng hợp công chuẩn, giờ tăng ca (OT), phụ cấp, xuất phiếu lương điện tử bảo mật và tích hợp điều hành sản xuất MES toàn diện.
            </p>
          </article>
        </div>
      </section>

      {/* Footer */}
      <AdminContactFooter
        variant="centered"
        systemLabel="NEWPROTEC VINA INDUSTRIAL SYSTEM · MES V2.0 PRODUCTION SYSTEM"
      />

      <AppQRModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} />

      <StaffQRScannerModal
        isOpen={showQRScanner}
        allStaff={allStaff}
        onClose={() => setShowQRScanner(false)}
        onSuccess={(params, staff) => {
          setShowQRScanner(false);
          if (onQrQuickAccess) {
            onQrQuickAccess(params, staff);
          } else {
            onLogin({
              username: staff.employeeId,
              fullName: staff.fullName,
              role: 'staff',
              employeeId: staff.employeeId,
              department: staff.department || 'MULTI',
            });
          }
        }}
      />
    </div>
  );
};
