import React from 'react';
import {
  X,
  Download,
  Monitor,
  Smartphone,
  Laptop,
  Apple,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  InstallerDownloadLinks,
  normalizeInstallerLinks,
  sanitizeDownloadUrl,
} from '../../lib/installerLinks';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  links?: InstallerDownloadLinks | null;
  onTriggerPwaInstall?: () => void;
}

interface PlatformDownloadCard {
  id: 'windows' | 'android' | 'macos' | 'ios';
  title: string;
  subtitle: string;
  fileHint: string;
  installNote: string;
  url: string;
  accentClass: string;
  badgeClass: string;
  icon: React.ReactNode;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  isOpen,
  onClose,
  links,
  onTriggerPwaInstall,
}) => {
  if (!isOpen) return null;

  const resolved = normalizeInstallerLinks(links);

  const platforms: PlatformDownloadCard[] = [
    {
      id: 'windows',
      title: 'Windows (PC / Laptop)',
      subtitle: 'Windows 10 / 11 (64-bit)',
      fileHint: 'File .exe cài đặt & bản Portable (.zip)',
      installNote: 'Giải nén rồi chạy file Setup.exe để cài đặt hoặc mở bản chạy ngay.',
      url: sanitizeDownloadUrl(resolved.windowsUrl),
      accentClass: 'border-sky-500/35 bg-sky-950/20',
      badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      icon: <Monitor className="w-5 h-5 text-sky-400" />,
    },
    {
      id: 'android',
      title: 'Android (Điện thoại / Tablet)',
      subtitle: 'Android 8.0 trở lên',
      fileHint: 'File .apk / .zip cài đặt trực tiếp',
      installNote: 'Giải nén (nếu là .zip), chạm file .apk và cho phép "Cài đặt ứng dụng không rõ nguồn gốc".',
      url: sanitizeDownloadUrl(resolved.androidUrl),
      accentClass: 'border-emerald-500/35 bg-emerald-950/20',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      icon: <Smartphone className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'macos',
      title: 'Apple macOS (MacBook / iMac)',
      subtitle: 'Apple Silicon (M1–M4) & Intel',
      fileHint: 'File .dmg / .zip cho macOS',
      installNote: 'Mở file .dmg rồi kéo ứng dụng vào thư mục Applications (Ứng dụng).',
      url: sanitizeDownloadUrl(resolved.macosUrl),
      accentClass: 'border-indigo-500/35 bg-indigo-950/20',
      badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      icon: <Laptop className="w-5 h-5 text-indigo-400" />,
    },
    {
      id: 'ios',
      title: 'Apple iPhone / iPad (iOS)',
      subtitle: 'iOS / iPadOS',
      fileHint: 'Gói .ipa / PWA Safari',
      installNote: 'Nếu dùng file .ipa chưa ký cần cài qua AltStore/Sideloadly/MDM, hoặc cài nhanh bằng Safari PWA bên dưới.',
      url: sanitizeDownloadUrl(resolved.iosUrl),
      accentClass: 'border-amber-500/35 bg-amber-950/20',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      icon: <Apple className="w-5 h-5 text-amber-300" />,
    },
  ];

  const configuredCount = platforms.filter((p) => Boolean(p.url)).length;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/95">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  Tải Ứng Dụng Newprotec Vina HRM
                </h3>
                {resolved.releaseVersion && (
                  <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-semibold">
                    {resolved.releaseVersion}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Chọn phiên bản phù hợp cho Windows, Android hoặc thiết bị Apple của bạn.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          {configuredCount === 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/35 border border-amber-500/30 text-xs text-amber-200">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Quản trị viên chưa gắn link file cài đặt trực tiếp.</p>
                <p className="text-amber-300/80 text-[11px] mt-0.5">
                  Admin có thể đăng nhập → vào mục <strong>Quản Trị / Link Tải App</strong> để dán link GitHub Releases, Cloudflare R2 hoặc Google Drive. Hiện tại bạn vẫn có thể cài bản <strong>Web/PWA</strong> trực tiếp ngay bên dưới.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {platforms.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${item.accentClass}`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/70 shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium w-fit max-w-full truncate ${item.badgeClass}`}>
                    {item.fileHint}
                  </span>

                  <p className="text-[11px] text-slate-300/90 leading-relaxed">
                    {item.installNote}
                  </p>
                </div>

                <div className="pt-1">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-950/40 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải Xuống Ngay</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800/80 border border-slate-700/70 text-slate-400 text-[11px] font-medium">
                      <span>Chưa cập nhật link tải</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Instant PWA Install Option */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Cài Nhanh Trực Tiếp (Web App / PWA)</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Không cần tải bộ cài nặng, tự động cập nhật bản mới nhất cho Chrome, Edge và Safari iOS.
                </p>
              </div>
            </div>

            {onTriggerPwaInstall && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerPwaInstall();
                }}
                className="shrink-0 px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cài Bản Web/PWA
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
