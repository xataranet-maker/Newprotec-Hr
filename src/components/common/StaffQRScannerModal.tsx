import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { StaffRecord } from '../../types';
import {
  getStaffQrToken,
  isStaffQrEnabled,
  parseStaffQrPayload,
} from '../../lib/staffQr';
import {
  Camera,
  ImagePlus,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  CheckCircle2,
  X,
  SwitchCamera,
} from 'lucide-react';

interface StaffQRScannerModalProps {
  isOpen: boolean;
  allStaff: StaffRecord[];
  onClose: () => void;
  onSuccess: (params: { employeeId: string; token: string }, staff: StaffRecord) => void;
}

export const StaffQRScannerModal: React.FC<StaffQRScannerModalProps> = ({
  isOpen,
  allStaff,
  onClose,
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastInvalidScanRef = useRef<{ text: string; ts: number }>({ text: '', ts: 0 });
  const successLockedRef = useRef(false);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraState, setCameraState] = useState<'starting' | 'active' | 'error'>('starting');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [matchedPreview, setMatchedPreview] = useState<StaffRecord | null>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore track stop error
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleDecodedPayload = useCallback(
    (rawText: string) => {
      if (successLockedRef.current) return;

      const parsed = parseStaffQrPayload(rawText);
      if (parsed.type === 'APP_URL') {
        const now = Date.now();
        if (
          lastInvalidScanRef.current.text !== rawText ||
          now - lastInvalidScanRef.current.ts > 2000
        ) {
          lastInvalidScanRef.current = { text: rawText, ts: now };
          setScanError(
            'Đây là Mã QR mở trang web ứng dụng, không phải Mã QR hồ sơ nhân viên. Vui lòng quét Mã QR trên thẻ nhân viên.'
          );
        }
        return;
      }

      if (parsed.type === 'INVALID') {
        const now = Date.now();
        if (
          lastInvalidScanRef.current.text !== rawText ||
          now - lastInvalidScanRef.current.ts > 2000
        ) {
          lastInvalidScanRef.current = { text: rawText, ts: now };
          setScanError('Mã QR không hợp lệ hoặc không thuộc hệ thống Newprotec.');
        }
        return;
      }

      const normEmp = parsed.employeeId.trim().toLowerCase();
      const matchedStaff =
        allStaff.find((s) => s.employeeId.trim().toLowerCase() === normEmp) || null;

      if (!matchedStaff) {
        setScanError(
          `Không tìm thấy nhân viên có mã "${parsed.employeeId}" trong danh sách hệ thống.`
        );
        return;
      }

      if (!isStaffQrEnabled(matchedStaff)) {
        setScanError(
          `Quyền truy cập nhanh qua Mã QR của ${matchedStaff.fullName} (${matchedStaff.employeeId}) đang bị TẮT bởi HC & NS.`
        );
        return;
      }

      if (getStaffQrToken(matchedStaff) !== parsed.token) {
        setScanError(
          `Mã QR của ${matchedStaff.fullName} (${matchedStaff.employeeId}) đã hết hạn hoặc đã bị thu hồi để cấp mã mới.`
        );
        return;
      }

      // Valid Employee QR!
      successLockedRef.current = true;
      setScanError(null);
      setMatchedPreview(matchedStaff);
      stopCameraStream();

      window.setTimeout(() => {
        onSuccess(
          { employeeId: matchedStaff.employeeId, token: parsed.token },
          matchedStaff
        );
      }, 420);
    },
    [allStaff, onSuccess, stopCameraStream]
  );

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
          'Trình duyệt hiện tại không hỗ trợ truy cập camera trực tiếp. Vui lòng chọn ảnh Mã QR từ thiết bị.'
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
            'Bạn đã từ chối quyền sử dụng Camera. Vui lòng cấp quyền camera cho trình duyệt hoặc chọn ảnh Mã QR bên dưới.'
          );
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setCameraError(
            'Không tìm thấy thiết bị Camera trên máy này. Bạn có thể chọn ảnh Mã QR đã lưu để truy cập nhanh.'
          );
        } else {
          setCameraError(
            'Không thể khởi động Camera lúc này. Vui lòng thử lại hoặc tải lên ảnh Mã QR từ thiết bị.'
          );
        }
      }
    },
    [stopCameraStream]
  );

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      successLockedRef.current = false;
      setMatchedPreview(null);
      setScanError(null);
      return;
    }

    successLockedRef.current = false;
    setMatchedPreview(null);
    setScanError(null);
    startCamera(facingMode);

    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode, startCamera, stopCameraStream]);

  // Scan video frames continuously using jsQR
  useEffect(() => {
    if (!isOpen || cameraState !== 'active' || matchedPreview) return;

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
  }, [isOpen, cameraState, matchedPreview, handleDecodedPayload]);

  // Decode uploaded image file using jsQR (supports PNG/JPG QR images & Employee ID cards)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setScanError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const tryDecodeAtScale = (maxDim: number) => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return null;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          return jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
        };

        const result =
          tryDecodeAtScale(1200) ||
          tryDecodeAtScale(800) ||
          tryDecodeAtScale(1600);

        if (result?.data) {
          handleDecodedPayload(result.data);
        } else {
          setScanError(
            'Không nhận diện được Mã QR trong ảnh này. Vui lòng chọn ảnh rõ nét hơn hoặc đưa Mã QR vào khung Camera.'
          );
        }
      };
      img.onerror = () => {
        setScanError('Không thể đọc tệp hình ảnh đã chọn.');
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-4 sm:p-5 shadow-2xl text-slate-100 space-y-4 max-h-[94dvh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-400/40 flex items-center justify-center text-teal-300">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Quét Mã QR Truy Cập Nhanh
              </h3>
              <p className="text-[11px] text-slate-400">
                Đưa Mã QR hồ sơ nhân viên vào khung hình để vào thẳng hồ sơ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng trình quét QR"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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

          {/* Scanning Frame Overlay */}
          {cameraState === 'active' && !matchedPreview && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-56 h-56 sm:w-60 sm:h-60">
                <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-teal-400 rounded-tl-xl" />
                <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-teal-400 rounded-tr-xl" />
                <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-teal-400 rounded-bl-xl" />
                <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-teal-400 rounded-br-xl" />
                <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_rgba(45,212,191,0.9)] animate-pulse" />
              </div>
            </div>
          )}

          {/* Starting / Camera Error States */}
          {cameraState === 'starting' && !matchedPreview && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300 text-xs p-4 text-center">
              <Camera className="w-8 h-8 text-teal-400 animate-pulse" />
              <span className="font-semibold">Đang mở Camera quét mã QR...</span>
            </div>
          )}

          {cameraState === 'error' && !matchedPreview && (
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

          {/* Success State */}
          {matchedPreview && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-5 text-center animate-in fade-in duration-150">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="text-sm font-extrabold text-white uppercase tracking-wide">
                {matchedPreview.fullName}
              </div>
              <div className="text-xs font-mono text-emerald-300">
                {matchedPreview.employeeId} · Đang mở hồ sơ...
              </div>
            </div>
          )}
        </div>

        {/* Scan Error Feedback */}
        {scanError && (
          <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-700/70 text-rose-200 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{scanError}</span>
          </div>
        )}

        {/* Controls: Switch Camera + Upload QR Image */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() =>
              setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
            }
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <SwitchCamera className="w-4 h-4 text-cyan-400" />
            <span>{facingMode === 'environment' ? 'Camera Sau' : 'Camera Trước'}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3 rounded-xl bg-teal-600/20 hover:bg-teal-600/35 border border-teal-500/50 text-teal-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <ImagePlus className="w-4 h-4 text-teal-300" />
            <span>Chọn Ảnh Mã QR</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          Mẹo: Bạn có thể quét trực tiếp bằng camera hoặc chọn ảnh thẻ QR nhân viên đã lưu trên điện thoại / máy tính.
        </p>
      </div>
    </div>
  );
};
