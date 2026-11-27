import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Smartphone,
  ArrowLeft,
  Link2,
} from 'lucide-react';
import {
  buildAdminQrLoginPayload,
  consumeRemoteQrLoginSession,
  createRemoteQrLoginSession,
  generateQrLoginSessionId,
  getDedicatedQrcodeStationUrl,
  QR_LOGIN_TTL_MS,
  QrLoginSessionDoc,
  subscribeRemoteQrLoginSession,
} from '../../lib/qrLogin';
import { playSuccessChime } from '../../lib/attendanceQr';
import { AdminContactFooter } from './AdminContactFooter';

interface QrcodeStationLoginGateProps {
  onApprovedQrcodeLogin: (approvedByName?: string) => void;
  onBackToLogin: () => void;
}

export const QrcodeStationLoginGate: React.FC<QrcodeStationLoginGateProps> = ({
  onApprovedQrcodeLogin,
  onBackToLogin,
}) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(Math.floor(QR_LOGIN_TTL_MS / 1000));
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'EXPIRED'>('PENDING');
  const [approvedInfo, setApprovedInfo] = useState<QrLoginSessionDoc | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const dedicatedUrl = getDedicatedQrcodeStationUrl();

  const initNewSession = useCallback(async () => {
    const newId = generateQrLoginSessionId();
    setSessionId(newId);
    setStatus('PENDING');
    setApprovedInfo(null);
    setSecondsLeft(Math.floor(QR_LOGIN_TTL_MS / 1000));

    const payload = buildAdminQrLoginPayload(newId, 'QRCODE_GATE', 'LOGIN_QRCODE');
    try {
      const url = await QRCode.toDataURL(payload, {
        width: 440,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#020617',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
    } catch {
      setQrDataUrl('');
    }

    await createRemoteQrLoginSession(newId, 'Cổng Chờ Trạm QRCODE (?qrcode=1)');
  }, []);

  useEffect(() => {
    initNewSession();
  }, [initNewSession]);

  useEffect(() => {
    if (!sessionId || status !== 'PENDING') return;

    const unsubscribe = subscribeRemoteQrLoginSession(sessionId, (docData) => {
      if (docData.status === 'APPROVED') {
        setStatus('APPROVED');
        setApprovedInfo(docData);
        playSuccessChime();
        consumeRemoteQrLoginSession(sessionId);

        window.setTimeout(() => {
          onApprovedQrcodeLogin(docData.approvedBy?.fullName || docData.approvedBy?.username);
        }, 650);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [sessionId, status, onApprovedQrcodeLogin]);

  useEffect(() => {
    if (status !== 'PENDING') return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const handleCopyCode = async () => {
    if (!sessionId) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(dedicatedUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-dvh bg-[#020617] text-slate-100 flex flex-col justify-between p-4 sm:p-6 select-none relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_58%)]" />

      {/* Header */}
      <div className="relative z-10 max-w-5xl mx-auto w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/app-logo.png"
            alt="Newprotec Smart MES V2.0"
            className="w-9 h-9 object-contain drop-shadow-md shrink-0"
          />
          <div className="min-w-0">
            <div className="font-bold text-sm tracking-tight text-white">NEWPROTEC VINA</div>
            <div className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase truncate">
              TRẠM CHẤM CÔNG QRCODE · ĐĂNG NHẬP BẰNG QR
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-semibold cursor-pointer transition-colors"
            title="Sao chép đường link riêng cho Trạm QRCODE (?qrcode=1)"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Link2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            )}
            <span className="truncate">{copiedLink ? 'Đã chép Link' : 'Chép Link Riêng'}</span>
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Đăng nhập thường</span>
          </button>
        </div>
      </div>

      {/* Main Zalo-Style QR Login Card */}
      <div className="relative z-10 w-full max-w-lg mx-auto my-6 bg-slate-900/95 border border-emerald-500/35 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
            <QrCode className="w-3.5 h-3.5" />
            <span>Mở Trạm Chấm Công QRCODE</span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            Quét Mã QR Để Đăng Nhập Trang QRCODE
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Thiết bị này sẽ tự động mở thẳng vào <strong className="text-emerald-300">Tab Chấm Công QRCODE</strong> (không đăng nhập quyền Admin lên máy chấm công).
          </p>
        </div>

        {/* QR Code Box */}
        <div className="flex flex-col items-center">
          <div className="relative p-4 rounded-2xl bg-white border-4 border-emerald-400/60 shadow-[0_0_36px_rgba(16,185,129,0.22)]">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Mã QR Đăng Nhập Trạm QRCODE"
                className={`w-56 h-56 sm:w-64 sm:h-64 object-contain select-none ${
                  status === 'EXPIRED' ? 'opacity-25 blur-[2px]' : ''
                }`}
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-500 text-xs">
                Đang tạo mã QR...
              </div>
            )}

            {status === 'EXPIRED' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 rounded-xl p-4 text-center gap-2.5">
                <span className="text-xs font-bold text-amber-300">Mã QR phiên đã hết hạn</span>
                <button
                  type="button"
                  onClick={initNewSession}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tạo Mã QR Mới</span>
                </button>
              </div>
            )}

            {status === 'APPROVED' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/92 rounded-xl p-4 text-center gap-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                <div className="text-sm font-extrabold text-white">Xác Thực Admin Thành Công!</div>
                <div className="text-xs text-emerald-200">
                  {approvedInfo?.approvedBy?.fullName
                    ? `Admin ${approvedInfo.approvedBy.fullName} đã duyệt · `
                    : ''}
                  Đang mở trang Chấm Công QRCODE...
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 font-mono font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Hiệu lực: {mins}:{secs}</span>
            </span>
            <button
              type="button"
              onClick={initNewSession}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Làm mới QR</span>
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 rounded-2xl bg-slate-950/85 border border-slate-800 space-y-2.5 text-xs">
          <div className="font-bold text-cyan-300 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
            <Smartphone className="w-4 h-4" />
            <span>Hướng Dẫn Quét Từ Thiết Bị Quản Trị Viên</span>
          </div>
          <ol className="space-y-1.5 list-decimal list-inside text-[11px] leading-relaxed text-slate-300">
            <li>
              Trên điện thoại hoặc máy khác, đăng nhập bằng tài khoản <strong className="text-white">Quản trị viên (Admin)</strong>.
            </li>
            <li>
              Mở mục <strong className="text-cyan-300">HOME → QUÉT ĐĂNG NHẬP</strong>.
            </li>
            <li>
              Quét mã QR ở trên — thiết bị này sẽ <strong className="text-emerald-300">tự động vào thẳng tab QRCODE chấm công</strong>.
            </li>
          </ol>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500">Đường link riêng trang này:</div>
              <div className="text-[11px] font-mono text-cyan-300/90 truncate">{dedicatedUrl}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
                title="Sao chép mã phiên qrl_..."
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Đã chép mã' : 'Chép mã'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bảo mật: Chỉ mở quyền Trạm Chấm Công QRCODE, an toàn cho thiết bị đặt tại xưởng.</span>
        </div>
      </div>

      {/* Footer */}
      <AdminContactFooter
        variant="centered"
        systemLabel="NEWPROTEC VINA · DEDICATED QRCODE ATTENDANCE GATE"
      />
    </div>
  );
};
