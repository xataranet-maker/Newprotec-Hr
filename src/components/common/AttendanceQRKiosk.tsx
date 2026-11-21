import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Clock,
  CalendarDays,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ScanLine,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { ATTENDANCE_QR_PAYLOAD } from '../../lib/attendanceQr';

interface AttendanceQRKioskProps {
  isStandaloneAccount?: boolean;
  onLogout?: () => void;
}

export const AttendanceQRKiosk: React.FC<AttendanceQRKioskProps> = ({
  isStandaloneAccount = false,
  onLogout,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    QRCode.toDataURL(ATTENDANCE_QR_PAYLOAD, {
      width: 520,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Attendance QR generation error:', err));
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore if fullscreen blocked by browser/iframe
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const canvas = document.createElement('canvas');
    const w = 680;
    const h = 820;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#070e1c';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 0, w, 10);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEWPROTEC VINA', w / 2, 64);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('MÃ QR CHẤM CÔNG NHÂN VIÊN', w / 2, 100);

    const img = new window.Image();
    img.onload = () => {
      const boxSize = 480;
      const boxX = (w - boxSize) / 2;
      const boxY = 135;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxSize, boxSize, 24);
      ctx.fill();
      ctx.drawImage(img, boxX + 20, boxY + 20, boxSize - 40, boxSize - 40);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('Quét mã bằng nút "CHẤM CÔNG QR" trong Hồ Sơ Nhân Viên', w / 2, 668);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px monospace';
      ctx.fillText('Tự động ghi Giờ Vào / Giờ Ra vào Bảng Chấm Công phòng ban', w / 2, 704);

      const link = document.createElement('a');
      link.download = 'Ma_QR_Cham_Cong_Newprotec.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = qrDataUrl;
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;
    const printWin = window.open('', '_blank', 'width=720,height=860');
    if (!printWin) return;
    printWin.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Mã QR Chấm Công - Newprotec Vina</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff; color: #0f172a; }
            .card { text-align: center; border: 2px solid #0f172a; border-radius: 20px; padding: 36px 40px; max-width: 460px; }
            h1 { margin: 0 0 6px; font-size: 24px; letter-spacing: 0.04em; }
            h2 { margin: 0 0 20px; font-size: 16px; color: #059669; text-transform: uppercase; }
            img { width: 340px; height: 340px; display: block; margin: 0 auto 18px; }
            p { font-size: 13px; color: #334155; line-height: 1.5; margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>NEWPROTEC VINA</h1>
            <h2>Mã QR Chấm Công Nhân Viên</h2>
            <img src="${qrDataUrl}" alt="QR Chấm Công" />
            <p><strong>Hướng dẫn:</strong> Đăng nhập bằng Mã Nhân Viên → Hồ Sơ → Nhấn <strong>Chấm Công QR</strong> để quét mã này.</p>
            <p>Hệ thống sẽ tự động ghi Giờ Vào / Giờ Ra theo phòng ban của bạn.</p>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const timeString = now.toLocaleTimeString('vi-VN', { hour12: false });
  const dateString = now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const hour = now.getHours();
  const isDayShift = hour >= 8 && hour < 20;

  return (
    <div className="min-h-full bg-[#020617] text-slate-100 p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle radial glow backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_55%)]" />

      <div className="relative z-10 w-full max-w-3xl space-y-5">
        {/* Top Kiosk Header Bar (shown prominently for standalone QRCODE login or compact controls) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-white tracking-wider uppercase">
                NEWPROTEC VINA · TRẠM QR CHẤM CÔNG
              </div>
              <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Tài khoản điểm chấm công: QRCODE</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Tải ảnh Mã QR chấm công"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Tải QR</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!qrDataUrl}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="In áp phích QR chấm công"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">In QR</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title={isFullscreen ? 'Thu nhỏ màn hình' : 'Phóng to toàn màn hình'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="hidden sm:inline">
                {isFullscreen ? 'Thoát Full' : 'Toàn màn hình'}
              </span>
            </button>

            {isStandaloneAccount && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Đăng xuất tài khoản QRCODE"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Kiosk Display Card */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left/Top QR Code Box */}
          <div className="md:col-span-6 flex flex-col items-center">
            <div className="p-4 sm:p-5 rounded-3xl bg-white shadow-[0_0_40px_rgba(16,185,129,0.2)] border-4 border-emerald-400/50">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Mã QR Chấm Công Newprotec"
                  className="w-56 h-56 sm:w-72 sm:h-72 object-contain select-none"
                />
              ) : (
                <div className="w-56 h-56 sm:w-72 sm:h-72 flex items-center justify-center text-slate-500 text-xs">
                  Đang tạo mã QR...
                </div>
              )}
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
              <ScanLine className="w-3.5 h-3.5" />
              <span>Quét Mã Này Để Chấm Công Vào / Ra</span>
            </div>
          </div>

          {/* Right: Live Time, Shift & Instructions */}
          <div className="md:col-span-6 space-y-5">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-between gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 uppercase font-bold tracking-wider text-cyan-300">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Giờ Hệ Thống Hiện Tại</span>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    isDayShift
                      ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                      : 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40'
                  }`}
                >
                  {isDayShift ? 'CA NGÀY (08:00 - 17:00)' : 'CA ĐÊM (20:00 - 05:00)'}
                </span>
              </div>

              <div className="text-4xl sm:text-5xl font-black font-mono tracking-wider text-white tabular-nums pt-1">
                {timeString}
              </div>

              <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs text-slate-300 font-medium capitalize">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                <span>{dateString}</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Quy Trình Chấm Công Bằng QR
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                  1
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Nhân viên đăng nhập vào hệ thống bằng <strong className="text-white">Mã Nhân Viên</strong> hoặc <strong className="text-white">QR Hồ Sơ</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                  2
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Tại thẻ <strong className="text-cyan-300">MÃ QR HỒ SƠ</strong>, nhấn nút{' '}
                  <strong className="text-emerald-300">CHẤM CÔNG QR</strong> và hướng camera vào mã QR bên cạnh.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 leading-relaxed">
                  Hệ thống tự động ghi nhận <strong className="text-white">Giờ Vào</strong> (lần quét đầu) hoặc{' '}
                  <strong className="text-white">Giờ Ra</strong> (lần quét tiếp theo) vào đúng bảng chấm công phòng ban của bạn.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
