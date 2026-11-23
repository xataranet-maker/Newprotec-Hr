import React, { useState } from 'react';
import { UserAccount, StaffRecord, Language } from '../../types';
import { translations } from '../../data/locales';
import { Lock, User, Globe, ArrowRight, ShieldCheck, QrCode, ScanLine, FileText } from 'lucide-react';
import { AppQRModal } from './AppQRModal';
import { StaffQRScannerModal } from './StaffQRScannerModal';

interface LoginProps {
  users: UserAccount[];
  allStaff: StaffRecord[];
  onLogin: (user: UserAccount) => void;
  onQrQuickAccess?: (params: { employeeId: string; token: string }, staff: StaffRecord) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenCatalog?: () => void;
}

export const Login: React.FC<LoginProps> = ({
  users,
  allStaff,
  onLogin,
  onQrQuickAccess,
  language,
  onLanguageChange,
  onOpenCatalog,
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

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col justify-between p-4 sm:p-8 select-none text-slate-100">
      {/* Top Bar Language Selector */}
      <div className="flex justify-between items-center max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
            NP
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white">NEWPROTEC VINA</div>
            <div className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">
              SMART MES V2.0
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQRModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer"
            title="Mở & tải Mã QR của ứng dụng"
          >
            <QrCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mã QR App</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <button
              onClick={() => onLanguageChange('vi')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                language === 'vi' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              VI
            </button>
            <button
              onClick={() => onLanguageChange('ko')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                language === 'ko' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              한국어
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
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

            {/* Firebase Google Auth Button */}
            <button
              type="button"
              onClick={async () => {
                try {
                  const { signInWithPopup } = await import('firebase/auth');
                  const { auth, googleProvider } = await import('../../lib/firebase');
                  const result = await signInWithPopup(auth, googleProvider);
                  if (result.user) {
                    onLogin({
                      username: result.user.email || result.user.uid,
                      fullName: result.user.displayName || result.user.email || 'Google User',
                      role: 'admin',
                      employeeId: result.user.uid.slice(0, 8).toUpperCase()
                    });
                  }
                } catch (err: any) {
                  console.error('Firebase Auth Error:', err);
                  setError(`Lỗi đăng nhập Google Firebase: ${err.message}`);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Đăng nhập bằng Google (Firebase Auth)</span>
            </button>

            {onOpenCatalog && (
              <button
                type="button"
                onClick={onOpenCatalog}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-200 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-cyan-950/30"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>🌐 Xem Catalog Giới Thiệu Ứng Dụng (Không Cần Đăng Nhập)</span>
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-400 font-mono">
        NEWPROTEC VINA INDUSTRIAL SYSTEM · MES V2.0 PRODUCTION SYSTEM
      </div>

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
