import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  ShieldCheck,
  RefreshCw,
  X,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Smartphone,
} from 'lucide-react';
import {
  buildAdminQrLoginPayload,
  consumeRemoteQrLoginSession,
  createRemoteQrLoginSession,
  generateQrLoginSessionId,
  QR_LOGIN_TTL_MS,
  QrLoginSessionDoc,
  QrLoginTargetAction,
  subscribeRemoteQrLoginSession,
} from '../../lib/qrLogin';
import { playSuccessChime } from '../../lib/attendanceQr';

interface KioskRemoteLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApproved: (action: QrLoginTargetAction, approvedByName?: string) => void;
  intent?: QrLoginTargetAction;
}

export const KioskRemoteLoginModal: React.FC<KioskRemoteLoginModalProps> = ({
  isOpen,
  onClose,
  onApproved,
  intent = 'LOGOUT_TO_LOGIN',
}) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(Math.floor(QR_LOGIN_TTL_MS / 1000));
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'EXPIRED'>('PENDING');
  const [approvedInfo, setApprovedInfo] = useState<QrLoginSessionDoc | null>(null);
  const [copied, setCopied] = useState(false);

  const initNewSession = useCallback(async () => {
    const newId = generateQrLoginSessionId();
    setSessionId(newId);
    setStatus('PENDING');
    setApprovedInfo(null);
    setSecondsLeft(Math.floor(QR_LOGIN_TTL_MS / 1000));

    const payload = buildAdminQrLoginPayload(newId, 'QRCODE_KIOSK', intent);
    try {
      const url = await QRCode.toDataURL(payload, {
        width: 420,
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

    await createRemoteQrLoginSession(
      newId,
      intent === 'LOGOUT_TO_LOGIN' ? 'Yêu cầu Thoát Trạm QRCODE' : 'Trạm QR Chấm Công (QRCODE)'
    );
  }, [intent]);

  useEffect(() => {
    if (!isOpen) return;
    initNewSession();
  }, [isOpen, initNewSession]);

  useEffect(() => {
    if (!isOpen || !sessionId || status !== 'PENDING') return;

    const unsubscribe = subscribeRemoteQrLoginSession(sessionId, (docData) => {
      if (docData.status === 'APPROVED') {
        setStatus('APPROVED');
        setApprovedInfo(docData);
        playSuccessChime();
        consumeRemoteQrLoginSession(sessionId);

        const targetAction: QrLoginTargetAction = docData.targetAction || intent;
        const approverName = docData.approvedBy?.fullName || docData.approvedBy?.username;

        window.setTimeout(() => {
          onApproved(targetAction, approverName);
        }, 650);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, sessionId, status, onApproved, intent]);

  useEffect(() => {
    if (!isOpen || status !== 'PENDING') return;
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
  }, [isOpen, status]);

  if (!isOpen) return null;

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const handleCopyCode = async () => {
    if (!sessionId) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wide">
                QR Thoát Trạm QRCODE
              </h3>
              <p className="text-[11px] text-cyan-300">
                Quản trị viên quét từ thiết bị khác để thoát trang chấm công
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Display Box */}
        <div className="flex flex-col items-center">
          <div className="relative p-3.5 rounded-2xl bg-white border-4 border-cyan-400/60 shadow-[0_0_32px_rgba(34,211,238,0.22)]">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Mã QR Thoát Trạm QRCODE"
                className={`w-52 h-52 sm:w-56 sm:h-56 object-contain select-none ${
                  status === 'EXPIRED' ? 'opacity-25 blur-[2px]' : ''
                }`}
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-slate-500 text-xs">
                Đang tạo mã QR...
              </div>
            )}

            {status === 'EXPIRED' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 rounded-xl p-4 text-center gap-2">
                <span className="text-xs font-bold text-amber-300">Mã QR đã hết hạn</span>
                <button
                  type="button"
                  onClick={initNewSession}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tạo Mã QR Mới</span>
                </button>
              </div>
            )}

            {status === 'APPROVED' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/90 rounded-xl p-4 text-center gap-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                <div className="text-sm font-extrabold text-white">Xác Thực Thành Công!</div>
                <div className="text-xs text-emerald-200">
                  {approvedInfo?.targetAction === 'LOGOUT_TO_LOGIN'
                    ? 'Đang thoát trang QRCODE về màn hình đăng nhập...'
                    : 'Đã xác nhận giữ nguyên Trạm QRCODE...'}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-mono font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Hiệu lực: {mins}:{secs}</span>
            </span>
            <button
              type="button"
              onClick={initNewSession}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              title="Làm mới mã QR"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs text-slate-300">
          <div className="font-bold text-cyan-300 flex items-center gap-1.5 uppercase text-[11px]">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Hướng Dẫn Quản Trị Viên Quét Thoát Trạm</span>
          </div>
          <ol className="space-y-1.5 list-decimal list-inside text-[11px] leading-relaxed text-slate-300">
            <li>
              Trên thiết bị khác, đăng nhập bằng tài khoản <strong className="text-white">Quản trị viên (Admin)</strong>.
            </li>
            <li>
              Vào tab <strong className="text-cyan-300">HOME → QUÉT ĐĂNG NHẬP</strong>.
            </li>
            <li>
              Quét mã QR ở trên để <strong className="text-amber-300">thoát khỏi Trạm QRCODE</strong> về màn hình đăng nhập.
            </li>
          </ol>

          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-slate-400 truncate">
              Mã phiên: {sessionId}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-cyan-300 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Đã chép' : 'Chép mã'}</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span>Quay Lại Màn Hình Chấm Công</span>
        </button>
      </div>
    </div>
  );
};
