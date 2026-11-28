import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserAccount, StaffRecord, Language } from '../../types';
import {
  Lock,
  User,
  Globe,
  ArrowRight,
  QrCode,
  ScanLine,
  FileText,
  Users,
  Clock,
  Calculator,
  Download,
  Eye,
  EyeOff,
  RotateCw,
} from 'lucide-react';
import { AppQRModal } from './AppQRModal';
import { AppDownloadModal } from './AppDownloadModal';
import { StaffQRScannerModal } from './StaffQRScannerModal';
import { AdminContactFooter } from './AdminContactFooter';
import { getEffectiveStaffPin } from '../../lib/staffPin';
import { InstallerDownloadLinks } from '../../lib/installerLinks';
import { isPackagedAppShell } from '../../lib/apiBase';

const REMEMBER_USER_KEY = 'newprotec_remember_login_id';

interface LoginProps {
  users: UserAccount[];
  allStaff: StaffRecord[];
  onLogin: (user: UserAccount) => void;
  onQrQuickAccess?: (params: { employeeId: string; token: string }, staff: StaffRecord) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenCatalog?: () => void;
  onOpenQrcodeGate?: () => void;
  installerLinks?: InstallerDownloadLinks | null;
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
  installerLinks,
}) => {
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_USER_KEY) || '';
    } catch {
      return '';
    }
  });
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return Boolean(localStorage.getItem(REMEMBER_USER_KEY));
    } catch {
      return false;
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cardView, setCardView] = useState<'login' | 'tools'>('login');
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const showDownloadAction = !isPackagedAppShell();

  useEffect(() => {
    try {
      if (rememberMe && username.trim()) {
        localStorage.setItem(REMEMBER_USER_KEY, username.trim());
      } else if (!rememberMe) {
        localStorage.removeItem(REMEMBER_USER_KEY);
      }
    } catch {
      // ignore storage failure
    }
  }, [rememberMe, username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    try {
      if (rememberMe && trimmedUser) {
        localStorage.setItem(REMEMBER_USER_KEY, trimmedUser);
      }
    } catch {
      // ignore
    }

    // 1. Check non-staff manager / admin / station user accounts first
    const foundManager = users.find(
      (u) => (u.username || '').trim().toLowerCase() === trimmedUser.toLowerCase() && u.role !== 'staff'
    );

    if (foundManager) {
      const storedPass = (foundManager.password || '').trim();
      const isRootNewprotec = (foundManager.username || '').trim().toLowerCase() === 'newprotec';
      const isMatch =
        !storedPass ||
        storedPass === trimmedPass ||
        (isRootNewprotec &&
          storedPass === 'New123@' &&
          (trimmedPass === '123' || trimmedPass.toLowerCase() === 'new123@'));

      if (isMatch) {
        onLogin(foundManager);
        return;
      }
      setError('Tài khoản hoặc mật khẩu không chính xác.');
      return;
    }

    // 2. Check employee ID login (Dùng chung mã PIN với Quét Mã QR; mặc định lần đầu 123)
    const foundStaff = allStaff.find(
      (s) => (s.employeeId || '').trim().toLowerCase() === trimmedUser.toLowerCase()
    );

    if (foundStaff) {
      const matchedAccount = users.find(
        (u) => (u.username || '').trim().toLowerCase() === trimmedUser.toLowerCase() && u.role === 'staff'
      );
      const expectedPin = getEffectiveStaffPin(foundStaff, matchedAccount?.password);
      if (trimmedPass === expectedPin) {
        onLogin({
          username: foundStaff.employeeId,
          fullName: foundStaff.fullName,
          role: 'staff',
          employeeId: foundStaff.employeeId,
          department: foundStaff.department || 'MULTI',
        });
        return;
      }
      setError(
        'Mã PIN nhân viên không chính xác. Nếu quên, vui lòng liên hệ phòng HC & NS để cấp lại.'
      );
      return;
    }

    // 3. Check any remaining staff user account without StaffRecord
    const foundUser = users.find(
      (u) => (u.username || '').trim().toLowerCase() === trimmedUser.toLowerCase()
    );

    if (foundUser) {
      const storedUserPass = (foundUser.password || '').trim();
      if (!storedUserPass || storedUserPass === trimmedPass) {
        onLogin(foundUser);
        return;
      }
    }

    // 4. Fallback for demo ease if matching admin or newprotec
    if (
      trimmedUser.toLowerCase() === 'newprotec' &&
      (trimmedPass === 'New123@' || trimmedPass.toLowerCase() === 'new123@' || trimmedPass === '123')
    ) {
      onLogin({
        username: 'Newprotec',
        fullName: 'Ban Giám Đốc Newprotec',
        role: 'admin',
        employeeId: 'NP001',
        department: 'ADMIN',
      });
      return;
    }
    if (trimmedUser.toLowerCase() === 'admin' && trimmedPass === '123') {
      onLogin({
        username: 'admin',
        fullName: 'Root Admin',
        role: 'admin',
      });
      return;
    }
    if (trimmedUser.toLowerCase() === 'qrcode' && trimmedPass === '123') {
      onLogin({
        username: 'QRCODE',
        fullName: 'Trạm QR Chấm Công',
        role: 'qrcode',
        employeeId: 'QRCODE',
        department: 'ALL',
      });
      return;
    }
    if (
      (trimmedUser.toLowerCase() === 'an ninh' || trimmedUser.toLowerCase() === 'anninh') &&
      trimmedPass === '123'
    ) {
      onLogin({
        username: 'AN NINH',
        fullName: 'Bảo Vệ / An Ninh Cổng',
        role: 'security',
        employeeId: 'ANNINH',
        department: 'SECURITY',
      });
      return;
    }

    setError('Tài khoản hoặc mật khẩu không chính xác.');
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
    const py = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
    setTilt({
      rx: Math.max(-4, Math.min(4, -py * 7)),
      ry: Math.max(-4, Math.min(4, px * 7)),
    });
  };

  const resetCardTilt = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <div className="min-h-screen bg-[#020810] flex flex-col justify-between gap-6 p-4 sm:p-8 select-none text-slate-100 relative overflow-x-hidden">
      {/* Animated 3D Liquid-Metal Cyan Wave Backdrop (Matching Glassy Login V3) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_20%,rgba(14,116,144,0.34),transparent_60%),radial-gradient(ellipse_at_80%_78%,rgba(2,132,199,0.28),transparent_58%),linear-gradient(145deg,#020810_0%,#041522_45%,#020912_100%)]" />

        {/* Flowing Liquid Ribbon Layer A */}
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          className="absolute -inset-12 w-[112%] h-[112%] opacity-90 animate-glassy-wave-a"
        >
          <defs>
            <linearGradient id="ribbonCyanA" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#082f49" stopOpacity="0.15" />
              <stop offset="35%" stopColor="#0ea5e9" stopOpacity="0.48" />
              <stop offset="55%" stopColor="#67e8f9" stopOpacity="0.78" />
              <stop offset="80%" stopColor="#0284c7" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#041524" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="ribbonDeepA" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#04121f" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#0c4a6e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#030d18" stopOpacity="0.95" />
            </linearGradient>
            <filter id="waveSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="12" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d="M-120,260 C220,70 460,520 820,320 C1120,150 1320,380 1580,190 L1580,540 C1280,690 1010,360 720,560 C410,770 160,460 -120,620 Z"
            fill="url(#ribbonDeepA)"
          />
          <path
            d="M-140,340 C190,150 470,540 830,340 C1140,170 1330,410 1590,220"
            fill="none"
            stroke="url(#ribbonCyanA)"
            strokeWidth="26"
            filter="url(#waveSoftGlow)"
          />
          <path
            d="M-140,346 C190,156 470,546 830,346 C1140,176 1330,416 1590,226"
            fill="none"
            stroke="#a5f3fc"
            strokeOpacity="0.45"
            strokeWidth="3"
          />
        </svg>

        {/* Flowing Counter Ribbon Layer B */}
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          className="absolute -inset-10 w-[110%] h-[110%] opacity-85 animate-glassy-wave-b"
        >
          <defs>
            <linearGradient id="ribbonCyanB" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#031524" stopOpacity="0.1" />
              <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.42" />
              <stop offset="58%" stopColor="#38bdf8" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#082f49" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <path
            d="M-100,660 C240,420 580,820 960,550 C1220,370 1390,620 1560,460 L1560,920 L-100,920 Z"
            fill="#041524"
            fillOpacity="0.65"
          />
          <path
            d="M-120,620 C240,380 560,760 940,510 C1220,320 1380,580 1560,430"
            fill="none"
            stroke="url(#ribbonCyanB)"
            strokeWidth="20"
          />
          <path
            d="M-100,520 C260,720 620,280 980,540 C1240,710 1410,490 1580,590"
            fill="none"
            stroke="#22d3ee"
            strokeOpacity="0.28"
            strokeWidth="12"
          />
          <path
            d="M-120,622 C240,382 560,762 940,512 C1220,322 1380,582 1560,432"
            fill="none"
            stroke="#cffafe"
            strokeOpacity="0.38"
            strokeWidth="2.5"
          />
        </svg>

        {/* Ambient Refractor Glows Behind Card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-cyan-500/14 blur-[110px] animate-glassy-orb" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(2,6,15,0.72)_100%)]" />
      </div>

      {/* Slim Glass Header Bar */}
      <header className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-center gap-3 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="/app-logo.png"
              alt="Newprotec Smart MES V2.0"
              referrerPolicy="no-referrer"
              className="w-9 h-9 object-contain drop-shadow-[0_0_12px_rgba(34,211,238,0.45)] shrink-0"
            />
            <div className="whitespace-nowrap">
              <div className="font-bold text-sm tracking-tight text-white leading-tight">
                NEWPROTEC VINA
              </div>
              <div className="text-[10px] text-cyan-300 font-mono tracking-widest uppercase leading-tight">
                SMART MES V2.0
              </div>
            </div>
          </div>

          <div className="flex md:hidden items-center gap-0.5 bg-[#081320]/80 backdrop-blur-md border border-cyan-300/20 rounded-lg p-1 text-[11px] shrink-0">
            <Globe className="w-3 h-3 text-cyan-300/70 mx-1 shrink-0" />
            {(['vi', 'ko', 'en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguageChange(lang)}
                className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  language === lang ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {lang === 'vi' ? 'VI' : lang === 'ko' ? '한국어' : 'EN'}
              </button>
            ))}
          </div>
        </div>

        {/* Clean Single-Line Quick Actions + Desktop Language Switcher */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          {onOpenQrcodeGate && (
            <button
              type="button"
              onClick={onOpenQrcodeGate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#081523]/75 hover:bg-cyan-500/20 border border-cyan-300/25 text-emerald-200 text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trạm QRCODE</span>
            </button>
          )}
          {onOpenCatalog && (
            <button
              type="button"
              onClick={onOpenCatalog}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#081523]/75 hover:bg-cyan-500/20 border border-cyan-300/25 text-amber-200 text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Catalog App</span>
            </button>
          )}
          {showDownloadAction && (
            <button
              type="button"
              onClick={() => setShowDownloadModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#081523]/75 hover:bg-cyan-500/20 border border-cyan-300/25 text-sky-200 text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Tải App</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowQRModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#081523]/75 hover:bg-cyan-500/20 border border-cyan-300/25 text-cyan-200 text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <QrCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mã QR App</span>
          </button>

          <div className="flex items-center gap-1 bg-[#081320]/80 backdrop-blur-md border border-cyan-300/20 rounded-lg p-1 text-xs shrink-0">
            <Globe className="w-3.5 h-3.5 text-cyan-300/70 ml-1.5" />
            {(['vi', 'ko', 'en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguageChange(lang)}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  language === lang ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {lang === 'vi' ? 'VI' : lang === 'ko' ? '한국어' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main 3D Glassy Chamfered Card Focal Centerpiece */}
      <main
        className="relative z-10 w-full max-w-[460px] mx-auto my-auto"
        style={{ perspective: '1400px' }}
        onPointerMove={handleCardPointerMove}
        onPointerLeave={resetCardTilt}
      >
        <motion.div
          initial={{ opacity: 0, rotateY: -18, y: 18, scale: 0.96 }}
          animate={{
            opacity: 1,
            rotateX: tilt.rx,
            rotateY: tilt.ry,
            y: 0,
            scale: 1,
          }}
          transition={{
            opacity: { duration: 0.45 },
            y: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
            scale: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
            rotateX: { type: 'spring', stiffness: 220, damping: 24 },
            rotateY: { type: 'spring', stiffness: 220, damping: 24 },
          }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={cardView}
              initial={{ rotateY: cardView === 'tools' ? -90 : 90, opacity: 0.55, scale: 0.97 }}
              animate={{ rotateY: 0, opacity: 1, scale: 1 }}
              exit={{ rotateY: cardView === 'tools' ? 90 : -90, opacity: 0.55, scale: 0.97 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: 'preserve-3d' }}
              className="drop-shadow-[0_32px_70px_rgba(0,0,0,0.85)]"
            >
              {/* Outer Specular Rim Border (Glassy Chamfer Polygon) */}
              <div className="glassy-chamfer-clip p-[1.5px] bg-gradient-to-br from-cyan-300/80 via-slate-300/20 to-cyan-400/75">
                {/* Inner Frosted Glass Surface */}
                <div className="glassy-chamfer-clip relative bg-[#081320]/76 backdrop-blur-2xl px-6 py-8 sm:px-9 sm:py-9 overflow-hidden">
                  {/* Signature Beveled Corner Prism Triangles (Top-Left & Bottom-Right) */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-2.5 left-2.5 w-6 h-6 bg-gradient-to-br from-cyan-300/45 via-sky-400/20 to-transparent border-t border-l border-cyan-200/45"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-2.5 right-2.5 w-6 h-6 bg-gradient-to-tl from-cyan-300/45 via-sky-400/20 to-transparent border-b border-r border-cyan-200/45"
                    style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                  />

                  {/* Subtle Glossy Top Diagonal Reflection */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-24 -right-20 w-72 h-56 rounded-full bg-cyan-400/10 blur-2xl"
                  />

                  {cardView === 'login' ? (
                    <div className="relative z-10 space-y-5">
                      {/* Two-Tone Glass Header */}
                      <div className="text-center space-y-1.5">
                        <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight">
                          <span className="text-white">Đăng Nhập </span>
                          <span className="text-cyan-400 drop-shadow-[0_0_16px_rgba(34,211,238,0.45)]">
                            Hệ Thống
                          </span>
                        </h2>
                        <p className="text-xs text-slate-300/80">
                          Đăng nhập bằng tài khoản hoặc mã nhân viên Newprotec Vina
                        </p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                          <div className="p-2.5 rounded-xl bg-rose-950/65 border border-rose-500/45 text-rose-200 text-xs text-center">
                            {error}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-200/90 pl-1">
                            Tài khoản / Mã nhân viên
                          </label>
                          <div className="relative flex items-center bg-[#040b14]/75 border border-cyan-200/15 focus-within:border-cyan-400/75 focus-within:shadow-[0_0_22px_rgba(34,211,238,0.18)] rounded-xl transition-all">
                            <User className="w-4 h-4 text-slate-400 ml-3.5 shrink-0" />
                            <input
                              type="text"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="Nhập tài khoản hoặc mã nhân viên"
                              className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-slate-200/90 pl-1">
                            Mật khẩu / Mã PIN
                          </label>
                          <div className="relative flex items-center bg-[#040b14]/75 border border-cyan-200/15 focus-within:border-cyan-400/75 focus-within:shadow-[0_0_22px_rgba(34,211,238,0.18)] rounded-xl transition-all">
                            <Lock className="w-4 h-4 text-slate-400 ml-3.5 shrink-0" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Nhập mật khẩu hoặc mã PIN"
                              className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              className="p-2 mr-1 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Remember ID + Helper row */}
                        <div className="flex items-center justify-between gap-2 text-[11px] px-0.5">
                          <label className="inline-flex items-center gap-2 text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              className="w-3.5 h-3.5 rounded accent-cyan-400 cursor-pointer"
                            />
                            <span>Ghi nhớ tài khoản</span>
                          </label>
                          <span className="text-slate-400">Dùng chung PIN cho ID &amp; QR</span>
                        </div>

                        {/* Luminous Primary CTA Button with Sheen Sweep */}
                        <button
                          type="submit"
                          className="group relative overflow-hidden w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:via-sky-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-[0_8px_28px_rgba(6,182,212,0.35)] hover:shadow-[0_10px_34px_rgba(34,211,238,0.5)] active:scale-[0.99] transition-all cursor-pointer"
                        >
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-glassy-sheen"
                          />
                          <span className="relative z-10">Vào Hệ Thống</span>
                          <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-0.5 transition-transform" />
                        </button>

                        {/* Divider */}
                        <div className="relative flex items-center py-0.5">
                          <div className="flex-grow border-t border-cyan-200/15" />
                          <span className="shrink mx-3 text-[11px] font-medium text-slate-400">
                            Hoặc truy cập nhanh
                          </span>
                          <div className="flex-grow border-t border-cyan-200/15" />
                        </div>

                        {/* Symmetrical 2-Button Glass Row */}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setShowQRScanner(true)}
                            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#071525]/85 hover:bg-cyan-500/15 border border-cyan-300/25 hover:border-cyan-300/55 text-slate-100 text-xs font-semibold transition-all cursor-pointer"
                          >
                            <ScanLine className="w-4 h-4 text-cyan-300 shrink-0" />
                            <span className="whitespace-nowrap">Quét Mã QR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => (onOpenQrcodeGate ? onOpenQrcodeGate() : setShowQRModal(true))}
                            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#071525]/85 hover:bg-emerald-500/15 border border-cyan-300/25 hover:border-emerald-400/55 text-slate-100 text-xs font-semibold transition-all cursor-pointer"
                          >
                            <QrCode className="w-4 h-4 text-emerald-300 shrink-0" />
                            <span className="whitespace-nowrap">
                              {onOpenQrcodeGate ? 'Trạm QRCODE' : 'Mã QR App'}
                            </span>
                          </button>
                        </div>
                      </form>

                      {/* Bottom Flip Trigger */}
                      <div className="pt-1 text-center text-xs text-slate-400">
                        Tải ứng dụng, Catalog hoặc QR App?{' '}
                        <button
                          type="button"
                          onClick={() => setCardView('tools')}
                          className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 font-semibold underline-offset-4 hover:underline cursor-pointer"
                        >
                          <span>Mở Tiện Ích</span>
                          <RotateCw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Side 2: 3D Flipped Quick Tools & App Install View */
                    <div className="relative z-10 space-y-5">
                      <div className="text-center space-y-1.5">
                        <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight">
                          <span className="text-white">Tiện Ích </span>
                          <span className="text-cyan-400 drop-shadow-[0_0_16px_rgba(34,211,238,0.45)]">
                            Hệ Thống
                          </span>
                        </h2>
                        <p className="text-xs text-slate-300/80">
                          Truy cập nhanh Trạm QR, tải bộ cài đa nền tảng &amp; tài liệu HRM
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setShowQRScanner(true)}
                          className="p-3.5 rounded-xl bg-[#05101c]/85 hover:bg-cyan-500/15 border border-cyan-300/20 hover:border-cyan-300/60 text-left space-y-1.5 transition-all cursor-pointer"
                        >
                          <ScanLine className="w-5 h-5 text-cyan-300" />
                          <div className="text-xs font-bold text-white">Quét QR Cá Nhân</div>
                          <div className="text-[11px] text-slate-400">Vào nhanh hồ sơ bằng thẻ QR</div>
                        </button>

                        {onOpenQrcodeGate && (
                          <button
                            type="button"
                            onClick={onOpenQrcodeGate}
                            className="p-3.5 rounded-xl bg-[#05101c]/85 hover:bg-emerald-500/15 border border-cyan-300/20 hover:border-emerald-400/60 text-left space-y-1.5 transition-all cursor-pointer"
                          >
                            <QrCode className="w-5 h-5 text-emerald-400" />
                            <div className="text-xs font-bold text-white">Trạm QRCODE</div>
                            <div className="text-[11px] text-slate-400">Mở trạm điểm danh &amp; khuôn mặt</div>
                          </button>
                        )}

                        {showDownloadAction && (
                          <button
                            type="button"
                            onClick={() => setShowDownloadModal(true)}
                            className="p-3.5 rounded-xl bg-[#05101c]/85 hover:bg-sky-500/15 border border-cyan-300/20 hover:border-sky-400/60 text-left space-y-1.5 transition-all cursor-pointer"
                          >
                            <Download className="w-5 h-5 text-sky-400" />
                            <div className="text-xs font-bold text-white">Tải Bộ Cài App</div>
                            <div className="text-[11px] text-slate-400">Windows, Android &amp; iOS</div>
                          </button>
                        )}

                        {onOpenCatalog ? (
                          <button
                            type="button"
                            onClick={onOpenCatalog}
                            className="p-3.5 rounded-xl bg-[#05101c]/85 hover:bg-amber-500/15 border border-cyan-300/20 hover:border-amber-400/60 text-left space-y-1.5 transition-all cursor-pointer"
                          >
                            <FileText className="w-5 h-5 text-amber-400" />
                            <div className="text-xs font-bold text-white">Catalog Ứng Dụng</div>
                            <div className="text-[11px] text-slate-400">Giới thiệu tính năng MES/HRM</div>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowQRModal(true)}
                            className="p-3.5 rounded-xl bg-[#05101c]/85 hover:bg-cyan-500/15 border border-cyan-300/20 hover:border-cyan-400/60 text-left space-y-1.5 transition-all cursor-pointer"
                          >
                            <QrCode className="w-5 h-5 text-cyan-300" />
                            <div className="text-xs font-bold text-white">Mã QR Ứng Dụng</div>
                            <div className="text-[11px] text-slate-400">Quét chia sẻ link đăng nhập</div>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCardView('login')}
                        className="group relative overflow-hidden w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:via-sky-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-[0_8px_28px_rgba(6,182,212,0.35)] transition-all cursor-pointer"
                      >
                        <RotateCw className="w-4 h-4" />
                        <span>Quay Lại Đăng Nhập</span>
                      </button>

                      <div className="pt-1 text-center text-xs text-slate-400">
                        Hoặc mở nhanh{' '}
                        <button
                          type="button"
                          onClick={() => setShowQRModal(true)}
                          className="text-cyan-300 hover:text-cyan-200 font-semibold hover:underline cursor-pointer"
                        >
                          Mã QR Chia Sẻ App
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Semantic Enterprise HR/HRM & Smart Attendance Overview (SEO & Public Info) */}
      <section
        aria-label="Giải pháp Quản lý Nhân sự HRM và Chấm công thông minh"
        className="relative z-10 w-full max-w-5xl mx-auto mt-4 mb-2 pt-5 border-t border-cyan-200/10 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
              Giải Pháp Quản Lý Nhân Sự (HRM) &amp; Chấm Công Thông Minh Newprotec Vina
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Nền tảng HR/HRM hợp nhất dành cho doanh nghiệp &amp; nhà máy: tự động hóa chấm công QR Code, nhận diện khuôn mặt 3D đa góc, quản lý hồ sơ nhân sự, tăng ca và tính lương chính xác.
            </p>
          </div>
          {onOpenCatalog && (
            <button
              type="button"
              onClick={onOpenCatalog}
              className="shrink-0 self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#081523]/80 hover:bg-cyan-500/15 border border-cyan-300/20 text-cyan-300 text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Xem Tài Liệu HRM</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <article className="bg-[#081320]/70 backdrop-blur-md border border-cyan-200/12 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
              <Clock className="w-4 h-4 shrink-0" />
              <h2>Chấm Công QR &amp; Khuôn Mặt 3D</h2>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Quét mã QR động thời gian thực hoặc xác thực khuôn mặt 3D đa góc không tiếp xúc tại trạm Kiosk, đồng bộ trực tiếp lên bảng công.
            </p>
          </article>

          <article className="bg-[#081320]/70 backdrop-blur-md border border-cyan-200/12 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <Users className="w-4 h-4 shrink-0" />
              <h2>Quản Lý Nhân Sự &amp; Hợp Đồng HR</h2>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Số hóa toàn bộ hồ sơ nhân viên, thẻ QR cá nhân, hợp đồng lao động, cơ cấu phòng ban, đăng ký nghỉ phép và phê duyệt đơn từ trực tuyến.
            </p>
          </article>

          <article className="bg-[#081320]/70 backdrop-blur-md border border-cyan-200/12 rounded-xl p-3.5 space-y-1.5">
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
      <div className="relative z-10">
        <AdminContactFooter
          variant="centered"
          systemLabel="NEWPROTEC VINA INDUSTRIAL SYSTEM · MES V2.0 PRODUCTION SYSTEM"
        />
      </div>

      <AppQRModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} />

      <AppDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        links={installerLinks}
      />

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
