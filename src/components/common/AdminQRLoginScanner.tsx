import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  ScanLine,
  SwitchCamera,
  Upload,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  LogIn,
  LogOut,
  Camera,
  CameraOff,
  KeyRound,
  Sparkles,
  Link2,
  Copy,
  Check,
} from 'lucide-react';
import { UserAccount } from '../../types';
import {
  approveRemoteQrLoginSession,
  getDedicatedQrcodeStationUrl,
  parseAdminQrLoginPayload,
  QrLoginTargetAction,
} from '../../lib/qrLogin';
import { playSuccessChime } from '../../lib/attendanceQr';

interface AdminQRLoginScannerProps {
  currentUser: UserAccount;
}

type ScannerModeOption = 'AUTO' | QrLoginTargetAction;

export const AdminQRLoginScanner: React.FC<AdminQRLoginScannerProps> = ({ currentUser }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastInvalidRef = useRef<{ text: string; ts: number }>({ text: '', ts: 0 });
  const processingLockRef = useRef(false);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraState, setCameraState] = useState<'starting' | 'active' | 'stopped' | 'error'>(
    'starting'
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScannerModeOption>('AUTO');
  const [manualCode, setManualCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [approvedSummary, setApprovedSummary] = useState<{
    sessionId: string;
    targetAction: QrLoginTargetAction;
    approvedAt: string;
  } | null>(null);

  const dedicatedQrcodeUrl = getDedicatedQrcodeStationUrl();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleDecodedPayload = useCallback(
    async (rawText: string) => {
      if (processingLockRef.current || approvedSummary) return;

      const parsed = parseAdminQrLoginPayload(rawText);
      if (!parsed.valid || !parsed.sessionId) {
        const nowTs = Date.now();
        if (lastInvalidRef.current.text !== rawText || nowTs - lastInvalidRef.current.ts > 2000) {
          lastInvalidRef.current = { text: rawText, ts: nowTs };
          setScanError('Mã QR không phải Mã QR Đăng Nhập / Thoát Trạm QRCODE.');
        }
        return;
      }

      const resolvedAction: QrLoginTargetAction =
        scanMode === 'AUTO' ? parsed.intent || 'LOGIN_QRCODE' : scanMode;

      processingLockRef.current = true;
      setIsSubmitting(true);
      setScanError(null);

      try {
        const res = await approveRemoteQrLoginSession({
          sessionId: parsed.sessionId,
          targetAction: resolvedAction,
          adminUser: currentUser,
        });

        if (!res.ok) {
          setScanError(res.error || 'Không thể xác thực mã QR này.');
          processingLockRef.current = false;
          return;
        }

        playSuccessChime();
        stopCamera();
        setCameraState('stopped');
        setApprovedSummary({
          sessionId: parsed.sessionId,
          targetAction: resolvedAction,
          approvedAt: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [approvedSummary, currentUser, scanMode, stopCamera]
  );

  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      stopCamera();
      setCameraState('starting');
      setCameraError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('error');
        setCameraError(
          'Trình duyệt không hỗ trợ camera trực tiếp. Có thể quét từ ảnh hoặc nhập mã phiên.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState('active');
      } catch {
        setCameraState('error');
        setCameraError(
          'Không thể mở camera thiết bị (chưa cấp quyền hoặc không tìm thấy camera).'
        );
      }
    },
    [stopCamera]
  );

  useEffect(() => {
    if (approvedSummary) return;
    processingLockRef.current = false;
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [facingMode, approvedSummary, startCamera, stopCamera]);

  // Continuous jsQR frame scan
  useEffect(() => {
    if (cameraState !== 'active' || approvedSummary) return;

    let rafId = 0;
    let lastDecodeTs = 0;

    const tick = (now: number) => {
      if (now - lastDecodeTs >= 180) {
        lastDecodeTs = now;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          const w = video.videoWidth;
          const h = video.videoHeight;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const imgData = ctx.getImageData(0, 0, w, h);
            const code = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code && code.data) {
              handleDecodedPayload(code.data);
            }
          }
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [cameraState, approvedSummary, handleDecodedPayload]);

  const handleUploadQrImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (code?.data) {
        handleDecodedPayload(code.data);
      } else {
        setScanError('Không đọc được mã QR từ ảnh đã chọn.');
      }
    };
    img.src = dataUrl;
  };

  const handleCopyDedicatedLink = async () => {
    try {
      await navigator.clipboard.writeText(dedicatedQrcodeUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const resetScanner = () => {
    processingLockRef.current = false;
    setScanError(null);
    setApprovedSummary(null);
  };

  return (
    <div className="min-h-full bg-[#020617] text-slate-100 p-4 sm:p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-4">
        {/* Header Card */}
        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <ScanLine className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wide">
                Quét QR Mở / Thoát Trạm QRCODE Chấm Công
              </h2>
              <p className="text-xs text-slate-400">
                Admin <strong className="text-cyan-300">{currentUser.fullName}</strong> · Quét mã QR trên thiết bị kia để tự động mở hoặc thoát <strong className="text-emerald-300">tab QRCODE</strong> (không đăng nhập Admin lên thiết bị đó)
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Quyền Quản Trị Viên</span>
          </div>
        </div>

        {/* Action Mode Choice */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Chế độ thực thi sau khi quét mã QR:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setScanMode('AUTO')}
              className={`p-3 rounded-xl border text-left flex items-start gap-2.5 cursor-pointer transition-all ${
                scanMode === 'AUTO'
                  ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  scanMode === 'AUTO' ? 'text-emerald-400' : 'text-slate-500'
                }`}
              />
              <div>
                <div className="text-xs font-bold">Tự động theo mã QR</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tự nhận biết mở Trạm QRCODE (?qrcode=1) hoặc Thoát Trạm
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScanMode('LOGIN_QRCODE')}
              className={`p-3 rounded-xl border text-left flex items-start gap-2.5 cursor-pointer transition-all ${
                scanMode === 'LOGIN_QRCODE'
                  ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  scanMode === 'LOGIN_QRCODE' ? 'text-cyan-400' : 'text-slate-500'
                }`}
              />
              <div>
                <div className="text-xs font-bold">Đăng nhập Trạm QRCODE</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tự động mở tab QRCODE chấm công trên thiết bị kia (giống Zalo)
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScanMode('LOGOUT_TO_LOGIN')}
              className={`p-3 rounded-xl border text-left flex items-start gap-2.5 cursor-pointer transition-all ${
                scanMode === 'LOGOUT_TO_LOGIN'
                  ? 'bg-amber-500/15 border-amber-400 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogOut
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  scanMode === 'LOGOUT_TO_LOGIN' ? 'text-amber-400' : 'text-slate-500'
                }`}
              />
              <div>
                <div className="text-xs font-bold">Thoát Trạm QRCODE</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Thoát khỏi trạm chấm công và đưa thiết bị về màn hình Đăng nhập
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Scanner Area or Success Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left: Live Camera */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                <span>Camera Quét Mã QR</span>
              </span>

              <div className="flex items-center gap-2">
                {cameraState === 'active' ? (
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setCameraState('stopped');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Tắt Cam</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setApprovedSummary(null);
                      processingLockRef.current = false;
                      startCamera(facingMode);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Bật Cam</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Đổi Cam</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadQrImage}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quét Ảnh</span>
                </button>
              </div>
            </div>

            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover ${
                  cameraState === 'active' ? 'block' : 'hidden'
                } ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {cameraState === 'active' && !approvedSummary && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-52 h-52 sm:w-60 sm:h-60 relative">
                    <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                    <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                    <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                    <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />
                  </div>
                </div>
              )}

              {approvedSummary && (
                <div className="p-6 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-white">
                      {approvedSummary.targetAction === 'LOGOUT_TO_LOGIN'
                        ? 'Đã Thoát Trạm QRCODE Thành Công!'
                        : 'Đã Mở Trạm Chấm Công QRCODE Thành Công!'}
                    </h3>
                    <p className="text-xs text-emerald-300">
                      Thiết bị kia đã nhận xác thực từ{' '}
                      <strong className="text-white">{currentUser.fullName}</strong> lúc{' '}
                      {approvedSummary.approvedAt}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetScanner}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Quét Thiết Bị Khác</span>
                  </button>
                </div>
              )}

              {cameraState !== 'active' && !approvedSummary && (
                <div className="p-6 text-center space-y-2.5 max-w-xs">
                  <CameraOff className="w-10 h-10 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">{cameraError || 'Camera đang tạm tắt.'}</p>
                </div>
              )}
            </div>

            {scanError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-700/60 text-rose-200 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}
          </div>

          {/* Right: Dedicated QRCODE Station Link + Manual Session Code + Instructions */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900/90 border border-emerald-500/35 rounded-2xl p-4 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Link2 className="w-4 h-4" />
                <span>Đường Link Riêng Cho Trạm QRCODE</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Mở link này trên máy chấm công tại xưởng để hiện sẵn mã QR chờ Admin quét đăng nhập vào tab QRCODE:
              </p>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                <span className="text-[11px] font-mono text-cyan-300 truncate flex-1">
                  {dedicatedQrcodeUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyDedicatedLink}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLink ? 'Đã chép' : 'Chép Link'}</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                <span>Hoặc Nhập Mã Phiên Thủ Công</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Nếu thiết bị này không có camera, sao chép chuỗi mã phiên bên dưới mã QR trên màn hình Trạm QRCODE (dạng <code className="text-cyan-300">qrl_...</code>) và dán vào đây.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Dán mã phiên qrl_..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  disabled={!manualCode.trim() || isSubmitting}
                  onClick={() => handleDecodedPayload(manualCode)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  Xác Nhận
                </button>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
              <div className="font-bold text-white uppercase text-[11px] tracking-wider">
                Quy Trình Hoạt Động
              </div>
              <div className="space-y-1.5 text-[11px] leading-relaxed text-slate-300">
                <p>
                  1. <strong className="text-emerald-300">Vào Trạm QRCODE:</strong> Trên máy chấm công mở nút <em>Đăng Nhập Trạm QRCODE</em> hoặc link <code className="text-cyan-300">?qrcode=1</code> → Dùng máy Admin quét QR đó để tự động mở tab chấm công QRCODE.
                </p>
                <p>
                  2. <strong className="text-amber-300">Thoát Trạm QRCODE:</strong> Nhấn nút <em>QR Thoát Trạm</em> trong màn hình chấm công → Dùng máy Admin quét QR để thoát trạm về màn hình đăng nhập.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
