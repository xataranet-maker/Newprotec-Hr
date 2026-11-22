import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { SecurityGateLogRecord, StaffRecord } from '../../types';
import {
  getStaffQrToken,
  isStaffQrEnabled,
  parseStaffQrPayload,
} from '../../lib/staffQr';
import { EmployeeIdCard } from '../common/EmployeeIdCard';
import {
  Camera,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  LogIn,
  LogOut,
  X,
  SwitchCamera,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface SecurityQRScannerModalProps {
  isOpen: boolean;
  allStaff: StaffRecord[];
  initialDirection?: 'IN' | 'OUT';
  onClose: () => void;
  onRecordScan: (staff: StaffRecord, direction: 'IN' | 'OUT') => SecurityGateLogRecord;
  onUpdateDirection?: (logId: number, direction: 'IN' | 'OUT') => void;
}

export const SecurityQRScannerModal: React.FC<SecurityQRScannerModalProps> = ({
  isOpen,
  allStaff,
  initialDirection = 'IN',
  onClose,
  onRecordScan,
  onUpdateDirection,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastInvalidScanRef = useRef<{ text: string; ts: number }>({ text: '', ts: 0 });
  const successLockedRef = useRef(false);

  const [direction, setDirection] = useState<'IN' | 'OUT'>(initialDirection);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraState, setCameraState] = useState<'starting' | 'active' | 'error'>('starting');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [scannedStaff, setScannedStaff] = useState<StaffRecord | null>(null);
  const [scannedLog, setScannedLog] = useState<SecurityGateLogRecord | null>(null);

  const directionRef = useRef(direction);
  directionRef.current = direction;

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
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

  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      stopCameraStream();
      setCameraState('starting');
      setCameraError(null);

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraState('error');
        setCameraError(
          'Trình duyệt hiện tại không hỗ trợ truy cập camera trực tiếp để quét mã QR thẻ nhân viên.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
        }
        setCameraState('active');
      } catch (err: any) {
        stopCameraStream();
        setCameraState('error');
        const errName = err?.name || '';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setCameraError(
            'Bạn đã từ chối quyền Camera. Vui lòng cấp quyền sử dụng camera trên trình duyệt để quét thẻ nhân viên.'
          );
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setCameraError('Không tìm thấy thiết bị Camera khả dụng.');
        } else {
          setCameraError('Không thể khởi động Camera. Vui lòng thử lại.');
        }
      }
    },
    [stopCameraStream]
  );

  const handleDecodedPayload = useCallback(
    (rawText: string) => {
      if (successLockedRef.current) return;

      const parsed = parseStaffQrPayload(rawText);
      if (parsed.type !== 'STAFF_QR') {
        const now = Date.now();
        if (
          lastInvalidScanRef.current.text !== rawText ||
          now - lastInvalidScanRef.current.ts > 2000
        ) {
          lastInvalidScanRef.current = { text: rawText, ts: now };
          setScanError(
            parsed.type === 'APP_URL'
              ? 'Đây là QR mở trang chủ, vui lòng quét Mã QR trên Thẻ Nhân Viên.'
              : 'Mã QR không hợp lệ hoặc không phải Thẻ Nhân Viên Newprotec.'
          );
        }
        return;
      }

      const normEmp = parsed.employeeId.trim().toLowerCase();
      const matchedStaff =
        allStaff.find((s) => s.employeeId.trim().toLowerCase() === normEmp) || null;

      if (!matchedStaff) {
        setScanError(`Không tìm thấy nhân viên có mã "${parsed.employeeId}" trong hệ thống.`);
        return;
      }

      if (!isStaffQrEnabled(matchedStaff)) {
        setScanError(
          `Thẻ QR của ${matchedStaff.fullName} (${matchedStaff.employeeId}) hiện đang bị KHÓA bởi HC & NS.`
        );
        return;
      }

      if (getStaffQrToken(matchedStaff) !== parsed.token) {
        setScanError(
          `Mã QR trên thẻ của ${matchedStaff.fullName} (${matchedStaff.employeeId}) đã hết hạn hoặc bị thu hồi.`
        );
        return;
      }

      // Valid Employee Badge QR!
      successLockedRef.current = true;
      setScanError(null);
      stopCameraStream();

      const recorded = onRecordScan(matchedStaff, directionRef.current);
      setScannedStaff(matchedStaff);
      setScannedLog(recorded);
    },
    [allStaff, onRecordScan, stopCameraStream]
  );

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      successLockedRef.current = false;
      setScannedStaff(null);
      setScannedLog(null);
      setScanError(null);
      return;
    }

    successLockedRef.current = false;
    setScannedStaff(null);
    setScannedLog(null);
    setScanError(null);
    setDirection(initialDirection);
    startCamera(facingMode);

    return () => {
      stopCameraStream();
    };
  }, [isOpen, initialDirection, facingMode, startCamera, stopCameraStream]);

  // Continuous QR frame scanning
  useEffect(() => {
    if (!isOpen || cameraState !== 'active' || scannedStaff) return;

    const timer = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState < video.HAVE_ENOUGH_DATA) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      const maxDim = 960;
      const scale = Math.min(1, maxDim / Math.max(vw, vh));
      const tw = Math.max(1, Math.round(vw * scale));
      const th = Math.max(1, Math.round(vh * scale));

      if (canvas.width !== tw) canvas.width = tw;
      if (canvas.height !== th) canvas.height = th;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, tw, th);
      const imageData = ctx.getImageData(0, 0, tw, th);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code?.data) {
        handleDecodedPayload(code.data);
      }
    }, 140);

    return () => window.clearInterval(timer);
  }, [isOpen, cameraState, scannedStaff, handleDecodedPayload]);

  const handleSelectDirection = (nextDir: 'IN' | 'OUT') => {
    setDirection(nextDir);
    if (scannedLog && scannedStaff && scannedLog.direction !== nextDir) {
      if (onUpdateDirection) {
        onUpdateDirection(scannedLog.id, nextDir);
      }
      setScannedLog((prev) => (prev ? { ...prev, direction: nextDir } : prev));
    }
  };

  const handleScanNext = () => {
    successLockedRef.current = false;
    setScannedStaff(null);
    setScannedLog(null);
    setScanError(null);
    startCamera(facingMode);
  };

  if (!isOpen) return null;

  const liveStaff = scannedStaff
    ? allStaff.find(
        (s) => s.employeeId.trim().toLowerCase() === scannedStaff.employeeId.trim().toLowerCase()
      ) || scannedStaff
    : null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-4 sm:p-5 shadow-2xl text-slate-100 space-y-4 max-h-[94dvh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {liveStaff ? 'Thông Tin Thẻ Nhân Viên' : 'Quét Mã QR Nhân Viên'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {liveStaff
                  ? 'Chỉ hiển thị thẻ và trạng thái ra / vào cổng'
                  : 'Chọn trạng thái VÀO hoặc RA trước hoặc sau khi quét thẻ'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector buttons: VÀO / RA */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => handleSelectDirection('IN')}
            className={`py-2.5 px-3 rounded-lg text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              direction === 'IN'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Cập Nhật VÀO</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectDirection('OUT')}
            className={`py-2.5 px-3 rounded-lg text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              direction === 'OUT'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Cập Nhật RA</span>
          </button>
        </div>

        {/* Either Scanned Employee ID Card ONLY OR Camera Viewport */}
        {liveStaff && scannedLog ? (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div
              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                scannedLog.direction === 'IN'
                  ? 'bg-emerald-950/50 border-emerald-600/60 text-emerald-200'
                  : 'bg-amber-950/50 border-amber-600/60 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Đã ghi nhận: {scannedLog.direction === 'IN' ? 'VÀO CỔNG' : 'RA CỔNG'}
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono font-bold text-[11px] tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                <span>{scannedLog.timeStr}</span>
              </div>
            </div>

            {/* ONLY display the framed Employee ID Card & its card info */}
            <EmployeeIdCard
              staff={liveStaff}
              highlightBadge={scannedLog.direction === 'IN' ? 'VÀO CỔNG' : 'RA CỔNG'}
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleScanNext}
                className="py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <ScanLine className="w-4 h-4" />
                <span>Quét Tiếp</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Hoàn Tất &amp; Đóng
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Camera Viewport */}
            <div className="relative w-full aspect-square max-h-[320px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover ${
                  cameraState === 'active' ? 'opacity-100' : 'opacity-0'
                } transition-opacity duration-200`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {cameraState === 'active' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative w-56 h-56 sm:w-60 sm:h-60">
                    <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl" />
                    <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl" />
                    <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl" />
                    <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-cyan-400 rounded-br-xl" />
                    <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
                  </div>
                </div>
              )}

              {cameraState === 'starting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300 text-xs p-4 text-center">
                  <Camera className="w-8 h-8 text-cyan-400 animate-pulse" />
                  <span className="font-semibold">Đang mở Camera quét thẻ nhân viên...</span>
                </div>
              )}

              {cameraState === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center bg-slate-950/95">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Thử mở lại Camera</span>
                  </button>
                </div>
              )}
            </div>

            {scanError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-700/70 text-rose-200 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
              }
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <SwitchCamera className="w-4 h-4 text-cyan-400" />
              <span>
                Đang dùng {facingMode === 'environment' ? 'Camera Sau' : 'Camera Trước'} (Nhấn để đổi)
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
