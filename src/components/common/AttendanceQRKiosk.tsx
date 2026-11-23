import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ScanFace,
  Camera,
  CameraOff,
  RefreshCw,
  Upload,
  Users,
  AlertCircle,
} from 'lucide-react';
import { MachineSwipeRecord, StaffRecord } from '../../types';
import {
  ATTENDANCE_QR_PAYLOAD,
  AttendancePunchResult,
  loadFacePunchMap,
  recordEmployeeFacePunch,
} from '../../lib/attendanceQr';
import {
  FaceBoundingBox,
  extractFaceFromImageUrl,
  extractFaceFromMediaSource,
  isStaffFaceEnabled,
  matchFaceDescriptorAgainstStaff,
} from '../../lib/faceRecognition';
import { MATRIX_UPDATED_EVENT } from '../../lib/matrixTimekeeping';
import { getDefaultAvatarForEmployee } from '../../lib/avatarUtils';

interface AttendanceQRKioskProps {
  isStandaloneAccount?: boolean;
  onLogout?: () => void;
  allStaff?: StaffRecord[];
}

type KioskMode = 'QR' | 'FACE';
type FacePunchModeOption = 'AUTO' | 'IN' | 'OUT';

interface RecognizedBannerState {
  staff: StaffRecord;
  punch: AttendancePunchResult;
  capturedPhotoUrl: string;
  confidencePercent: number;
  recordedAtText: string;
}

export const AttendanceQRKiosk: React.FC<AttendanceQRKioskProps> = ({
  isStandaloneAccount = false,
  onLogout,
  allStaff = [],
}) => {
  const [kioskMode, setKioskMode] = useState<KioskMode>('QR');
  const [now, setNow] = useState<Date>(() => new Date());
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Face terminal states
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [faceCameraError, setFaceCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [facePunchMode, setFacePunchMode] = useState<FacePunchModeOption>('AUTO');
  const [trackedBox, setTrackedBox] = useState<{
    box: FaceBoundingBox;
    frameW: number;
    frameH: number;
    matched: boolean;
  } | null>(null);
  const [recognizedState, setRecognizedState] = useState<RecognizedBannerState | null>(null);
  const [faceScanHint, setFaceScanHint] = useState<string>(
    'Đang chờ nhận diện khuôn mặt...'
  );
  const [todayFacePunches, setTodayFacePunches] = useState<MachineSwipeRecord[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cooldownMapRef = useRef<Map<string, number>>(new Map());
  const isAnalyzingRef = useRef(false);

  const enrolledFaceStaff = useMemo(
    () => allStaff.filter((s) => isStaffFaceEnabled(s)),
    [allStaff]
  );

  const refreshTodayFacePunches = useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const daySuffix = `_${day}`;
    const map = loadFacePunchMap(year, month);
    const list = Object.values(map)
      .filter((r) => r && (r.id.endsWith(daySuffix) || (r.rawInTime || r.rawOutTime)))
      .filter((r) => {
        const dStr = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        return r.date === dStr;
      })
      .reverse();
    setTodayFacePunches(list);
  }, []);

  useEffect(() => {
    refreshTodayFacePunches();
    const handler = () => refreshTodayFacePunches();
    window.addEventListener(MATRIX_UPDATED_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(MATRIX_UPDATED_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, [refreshTodayFacePunches]);

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

  const stopFaceCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setFaceCameraActive(false);
    setTrackedBox(null);
  }, []);

  const startFaceCamera = useCallback(
    async (mode: 'user' | 'environment' = facingMode) => {
      stopFaceCamera();
      setFaceCameraError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setFaceCameraError('Trình duyệt không hỗ trợ camera. Có thể dùng ảnh để kiểm tra nhanh.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 640 },
            height: { ideal: 800 },
          },
          audio: false,
        });
        streamRef.current = stream;
        setFaceCameraActive(true);
        setFaceScanHint(
          enrolledFaceStaff.length > 0
            ? 'Đưa khuôn mặt vào khung hình để tự động chấm công'
            : 'Chưa có nhân viên nào được cài đặt khuôn mặt trong Danh sách nhân viên'
        );
        window.setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }, 60);
      } catch {
        setFaceCameraError(
          'Không thể mở camera thiết bị (chưa cấp quyền hoặc không tìm thấy camera).'
        );
        setFaceCameraActive(false);
      }
    },
    [facingMode, stopFaceCamera, enrolledFaceStaff.length]
  );

  // Stop camera automatically when switching back to QR tab or unmounting
  useEffect(() => {
    if (kioskMode === 'FACE') {
      startFaceCamera(facingMode);
    } else {
      stopFaceCamera();
    }
    return () => {
      stopFaceCamera();
    };
  }, [kioskMode, facingMode, startFaceCamera, stopFaceCamera]);

  const applyMatchedEmployeePunch = useCallback(
    (
      matchedStaff: StaffRecord,
      confidencePercent: number,
      capturedPhotoUrl: string,
      forceNoCooldown = false
    ) => {
      const nowMs = Date.now();
      const empKey = matchedStaff.employeeId.trim().toLowerCase();
      const lastMs = cooldownMapRef.current.get(empKey) || 0;
      if (!forceNoCooldown && nowMs - lastMs < 7000) {
        setFaceScanHint(
          `Đã ghi nhận ${matchedStaff.fullName} — Vui lòng đợi vài giây trước lần quét kế tiếp`
        );
        return;
      }

      const result = recordEmployeeFacePunch({
        staff: matchedStaff,
        allStaff,
        mode: facePunchMode,
      });

      if (result.ok) {
        cooldownMapRef.current.set(empKey, nowMs);
        const nowStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
        setRecognizedState({
          staff: matchedStaff,
          punch: result,
          capturedPhotoUrl,
          confidencePercent,
          recordedAtText: nowStr,
        });
        setFaceScanHint(
          `Chấm công khuôn mặt thành công: ${matchedStaff.fullName} (${
            result.mode === 'IN' ? 'Giờ Vào' : 'Giờ Ra'
          } ${result.mode === 'IN' ? result.inTime : result.outTime})`
        );
        refreshTodayFacePunches();
      }
    },
    [allStaff, facePunchMode, refreshTodayFacePunches]
  );

  // Live face tracking & matching loop
  useEffect(() => {
    if (kioskMode !== 'FACE' || !faceCameraActive) return;

    const timer = window.setInterval(async () => {
      if (isAnalyzingRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth < 32) return;

      isAnalyzingRef.current = true;
      try {
        const extraction = await extractFaceFromMediaSource(video, {
          requireDetectedFace: false,
        });

        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
        const frameW = Math.max(48, Math.round(video.videoWidth * scale));
        const frameH = Math.max(48, Math.round(video.videoHeight * scale));

        if (!extraction.hasFace) {
          setTrackedBox(null);
          setFaceScanHint(
            enrolledFaceStaff.length > 0
              ? 'Đưa khuôn mặt vào chính giữa khung camera...'
              : 'Chưa có nhân viên nào cài đặt khuôn mặt.'
          );
          return;
        }

        const match = matchFaceDescriptorAgainstStaff(
          extraction.descriptor,
          extraction.box,
          extraction.photoDataUrl,
          enrolledFaceStaff
        );

        setTrackedBox({
          box: extraction.box,
          frameW,
          frameH,
          matched: Boolean(match),
        });

        if (match) {
          applyMatchedEmployeePunch(
            match.staff,
            match.confidencePercent,
            match.capturedPhotoUrl || match.staff.facePhotoUrl || ''
          );
        } else {
          setFaceScanHint(
            enrolledFaceStaff.length > 0
              ? 'Đã phát hiện khuôn mặt — Đang đối chiếu với danh sách nhân viên...'
              : 'Vui lòng cài đặt khuôn mặt cho nhân viên trong tab Danh sách nhân viên.'
          );
        }
      } finally {
        isAnalyzingRef.current = false;
      }
    }, 450);

    return () => window.clearInterval(timer);
  }, [
    kioskMode,
    faceCameraActive,
    enrolledFaceStaff,
    applyMatchedEmployeePunch,
  ]);

  const handleFacePhotoUploadCheck = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const extraction = await extractFaceFromImageUrl(dataUrl);
    if (extraction.descriptor.length < 32) {
      setFaceScanHint('Không thể đọc đặc trưng khuôn mặt từ ảnh đã chọn.');
      return;
    }

    const match = matchFaceDescriptorAgainstStaff(
      extraction.descriptor,
      extraction.box,
      extraction.photoDataUrl || dataUrl,
      enrolledFaceStaff,
      0.74
    );

    if (match) {
      applyMatchedEmployeePunch(
        match.staff,
        match.confidencePercent,
        match.capturedPhotoUrl || dataUrl,
        true
      );
    } else {
      setFaceScanHint('Không khớp với nhân viên nào đã cài đặt khuôn mặt.');
    }
  };

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
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.write(`
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
        </body>
      </html>
    `);
    doc.close();
    window.setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  const timeString = now.toLocaleTimeString('vi-VN', { hour12: false });
  const isoDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')}`;
  const dateString = now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const hour = now.getHours();
  const isDayShift = hour >= 8 && hour < 20;

  // Compute proportional corner-bracket percentages inside mirrored/unmirrored viewport
  const bracketStyle = useMemo(() => {
    if (!trackedBox || !trackedBox.frameW || !trackedBox.frameH) return null;
    const { box, frameW, frameH } = trackedBox;
    const leftPct =
      facingMode === 'user'
        ? Math.max(4, Math.min(82, ((frameW - (box.x + box.width)) / frameW) * 100))
        : Math.max(4, Math.min(82, (box.x / frameW) * 100));
    const topPct = Math.max(4, Math.min(72, (box.y / frameH) * 100));
    const widthPct = Math.max(18, Math.min(76, (box.width / frameW) * 100));
    const heightPct = Math.max(20, Math.min(70, (box.height / frameH) * 100));
    return {
      left: `${leftPct}%`,
      top: `${topPct}%`,
      width: `${widthPct}%`,
      height: `${heightPct}%`,
      matched: trackedBox.matched,
    };
  }, [trackedBox, facingMode]);

  const activeBadgeAvatar = recognizedState
    ? recognizedState.capturedPhotoUrl ||
      recognizedState.staff.facePhotoUrl ||
      recognizedState.staff.avatarUrl ||
      getDefaultAvatarForEmployee(
        recognizedState.staff.employeeId,
        recognizedState.staff.fullName
      )
    : '';

  return (
    <div className="min-h-full bg-[#020617] text-slate-100 p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle radial glow backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_55%)]" />

      <div className="relative z-10 w-full max-w-6xl space-y-4">
        {/* Top Kiosk Header Bar with Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                kioskMode === 'FACE'
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
              }`}
            >
              {kioskMode === 'FACE' ? (
                <ScanFace className="w-5 h-5" />
              ) : (
                <QrCode className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-white tracking-wider uppercase">
                {kioskMode === 'FACE'
                  ? 'NEWPROTEC VINA · CHẤM CÔNG KHUÔN MẶT'
                  : 'NEWPROTEC VINA · TRẠM QR CHẤM CÔNG'}
              </div>
              <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {kioskMode === 'FACE'
                    ? `Đã đồng bộ ${enrolledFaceStaff.length}/${allStaff.length} khuôn mặt nhân viên`
                    : 'Tài khoản điểm chấm công: QRCODE'}
                </span>
              </div>
            </div>
          </div>

          {/* Mode Toggle Segmented Switch */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setKioskMode('QR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                kioskMode === 'QR'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Mã QR Chấm Công</span>
            </button>
            <button
              type="button"
              onClick={() => setKioskMode('FACE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                kioskMode === 'FACE'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ScanFace className="w-3.5 h-3.5" />
              <span>Chấm Công Khuôn Mặt</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {kioskMode === 'QR' && (
              <>
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
              </>
            )}

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

        {/* MODE 1: QR CODE KIOSK VIEW */}
        {kioskMode === 'QR' && (
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-5 flex flex-col items-center">
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
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                <ScanLine className="w-3.5 h-3.5 shrink-0" />
                <span>Quét Mã Này Để Chấm Công Vào / Ra</span>
              </div>
            </div>

            <div className="md:col-span-7 space-y-5 min-w-0">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-between gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 uppercase font-bold tracking-wider text-cyan-300 whitespace-nowrap shrink-0">
                    <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Giờ Hệ Thống Hiện Tại</span>
                  </span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${
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
                    <strong className="text-white">Giờ Ra</strong> (lần quét tiếp theo) vào mục{' '}
                    <strong className="text-emerald-300">Chấm công QR</strong> theo phòng ban để đối chiếu với bảng chấm công.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: FACE ATTENDANCE TERMINAL VIEW */}
        {kioskMode === 'FACE' && (
          <div className="bg-slate-900/95 border border-sky-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Portrait Face Terminal Screen (styled cleanly after reference terminal) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-[360px] aspect-[3/4] rounded-2xl overflow-hidden bg-slate-950 border-[6px] border-slate-800 shadow-[0_0_45px_rgba(14,165,233,0.22)]">
                {faceCameraActive ? (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-cover ${
                      facingMode === 'user' ? 'scale-x-[-1]' : ''
                    }`}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-slate-950">
                    <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <CameraOff className="w-8 h-8" />
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {faceCameraError || 'Camera nhận diện khuôn mặt đang tạm dừng.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => startFaceCamera(facingMode)}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Bật Camera Chấm Công</span>
                    </button>
                  </div>
                )}

                {/* Dynamic Face Tracking Corner Brackets */}
                {faceCameraActive && bracketStyle && (
                  <div
                    className="pointer-events-none absolute transition-all duration-150"
                    style={{
                      left: bracketStyle.left,
                      top: bracketStyle.top,
                      width: bracketStyle.width,
                      height: bracketStyle.height,
                    }}
                  >
                    <span
                      className={`absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] ${
                        bracketStyle.matched ? 'border-emerald-400' : 'border-rose-400'
                      }`}
                    />
                    <span
                      className={`absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] ${
                        bracketStyle.matched ? 'border-emerald-400' : 'border-rose-400'
                      }`}
                    />
                    <span
                      className={`absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] ${
                        bracketStyle.matched ? 'border-emerald-400' : 'border-rose-400'
                      }`}
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] ${
                        bracketStyle.matched ? 'border-emerald-400' : 'border-rose-400'
                      }`}
                    />
                  </div>
                )}

                {/* Fallback Static Center Guide when waiting */}
                {faceCameraActive && !bracketStyle && (
                  <div className="pointer-events-none absolute inset-x-[24%] top-[18%] bottom-[34%] opacity-70">
                    <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-rose-400/90" />
                    <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-rose-400/90" />
                    <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-rose-400/90" />
                    <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-rose-400/90" />
                  </div>
                )}

                {/* Bottom Blue Terminal Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-[110px] bg-gradient-to-r from-sky-700/95 via-sky-600/95 to-blue-700/95 backdrop-blur-md border-t border-sky-300/35 px-4 py-2.5 flex items-center justify-between gap-3">
                  {/* Left: Time + Date Pill + Info */}
                  <div className="space-y-1 min-w-0">
                    <div className="inline-flex flex-col px-3.5 py-1.5 rounded-xl bg-sky-500/45 border border-sky-300/30 shadow-inner">
                      <span className="text-2xl font-black font-mono text-white tracking-wider leading-none tabular-nums">
                        {timeString}
                      </span>
                      <span className="text-xs font-mono font-semibold text-sky-100 mt-1 tabular-nums">
                        {isoDateString}
                      </span>
                    </div>
                    <div className="text-[10px] font-semibold text-sky-100/90 truncate pl-1">
                      {recognizedState
                        ? `${recognizedState.staff.fullName} · ${recognizedState.staff.employeeId}`
                        : isDayShift
                        ? 'Ca Ngày (08:00 - 17:00)'
                        : 'Ca Đêm (20:00 - 05:00)'}
                    </div>
                  </div>

                  {/* Right: Circular Recognized Portrait Badge + Green Checkmark */}
                  <div className="relative shrink-0 mr-1">
                    {recognizedState ? (
                      <>
                        <img
                          src={activeBadgeAvatar}
                          alt={recognizedState.staff.fullName}
                          className="w-20 h-20 rounded-full object-cover border-[3px] border-white shadow-xl bg-slate-900"
                        />
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center">
                          <svg
                            viewBox="0 0 24 24"
                            className="w-5 h-5 text-white stroke-[3.5] fill-none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      </>
                    ) : (
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-sky-200/70 bg-sky-900/50 flex flex-col items-center justify-center text-sky-100">
                        <ScanFace className="w-7 h-7 opacity-85" />
                        <span className="text-[9px] font-bold uppercase mt-0.5">Chờ mặt</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status hint below camera */}
              <div className="mt-3 w-full max-w-[360px] px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-center text-sky-300 font-medium">
                {faceScanHint}
              </div>
            </div>

            {/* Right: Terminal Controls, Matched Employee Card & Today's Face Logs */}
            <div className="lg:col-span-7 space-y-4 min-w-0">
              {/* Controls Bar */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                    <ScanFace className="w-4 h-4" />
                    <span>Điều Khiển Thiết Bị Khuôn Mặt</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        faceCameraActive ? stopFaceCamera() : startFaceCamera(facingMode)
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer ${
                        faceCameraActive
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                          : 'bg-sky-600 border-sky-500 text-white hover:bg-sky-500'
                      }`}
                    >
                      {faceCameraActive ? (
                        <>
                          <CameraOff className="w-3.5 h-3.5" />
                          <span>Tắt Camera</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5" />
                          <span>Bật Camera</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Đổi Cam</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFacePhotoUploadCheck}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      title="Quét thử từ tệp ảnh nếu thiết bị không có camera"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Quét Bằng Ảnh</span>
                    </button>
                  </div>
                </div>

                {/* Punch Mode Switch */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Chế độ ghi nhận khi nhận diện:
                  </span>
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    {(
                      [
                        { id: 'AUTO', label: 'Tự động Vào/Ra' },
                        { id: 'IN', label: 'Chỉ Giờ Vào' },
                        { id: 'OUT', label: 'Chỉ Giờ Ra' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFacePunchMode(opt.id)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                          facePunchMode === opt.id
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Manual Employee Select Override (for difficult lighting/recognition) */}
                <div className="pt-2 border-t border-slate-800/80">
                  <select
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) return;
                      const st = allStaff.find((s) => s.employeeId === id);
                      if (st) {
                        applyMatchedEmployeePunch(st, 98, st.facePhotoUrl || st.avatarUrl || '');
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 cursor-pointer"
                  >
                    <option value="" disabled>
                      Hoặc chọn nhanh nhân viên chấm công khuôn mặt thủ công...
                    </option>
                    {allStaff.map((st) => (
                      <option key={st.employeeId} value={st.employeeId}>
                        {st.fullName} ({st.employeeId}) - {st.department || 'MULTI'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Latest Recognized Result Card */}
              {recognizedState ? (
                <div className="p-4 rounded-2xl bg-emerald-950/35 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={activeBadgeAvatar}
                      alt={recognizedState.staff.fullName}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-400/70 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-extrabold text-white truncate">
                          {recognizedState.staff.fullName}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                          Khớp {recognizedState.confidencePercent}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5 font-mono">
                        {recognizedState.staff.employeeId} · Bộ phận{' '}
                        <span className="text-cyan-300 font-bold">
                          {recognizedState.punch.departmentLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-300 mt-1 flex items-center gap-2 font-mono">
                        <span>
                          Vào: <strong>{recognizedState.punch.inTime || '--:--'}</strong>
                        </span>
                        <span>|</span>
                        <span>
                          Ra: <strong>{recognizedState.punch.outTime || '--:--'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-extrabold uppercase">
                      {recognizedState.punch.mode === 'IN' ? 'ĐÃ GHI GIỜ VÀO' : 'ĐÃ GHI GIỜ RA'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1">
                      Lúc {recognizedState.recordedAtText}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
                  <Users className="w-5 h-5 text-sky-400 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-200">
                      {enrolledFaceStaff.length > 0
                        ? `Sẵn sàng nhận diện ${enrolledFaceStaff.length} nhân viên đã đồng bộ.`
                        : 'Chưa có nhân viên nào cài đặt khuôn mặt.'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Cài đặt khuôn mặt từng nhân viên tại mục{' '}
                      <strong className="text-cyan-300">Danh sách nhân viên → Cài đặt khuôn mặt</strong>.
                      Giờ Vào / Ra sẽ tự động cập nhật vào cột Khuôn mặt trong Dữ liệu công.
                    </div>
                  </div>
                </div>
              )}

              {enrolledFaceStaff.length === 0 && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Hiện chưa có mẫu khuôn mặt nào trong hệ thống. Quản trị / HC&amp;NS vui lòng vào Danh sách nhân viên để chụp hoặc tải ảnh cài đặt khuôn mặt cho từng nhân viên.
                  </span>
                </div>
              )}

              {/* Today's Recent Face Punches Feed */}
              <div className="rounded-2xl bg-slate-950/75 border border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Lịch Sử Chấm Công Khuôn Mặt Hôm Nay ({todayFacePunches.length})
                  </span>
                  <span className="text-[11px] font-mono text-sky-400">{isoDateString}</span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/70">
                  {todayFacePunches.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Chưa có lượt chấm công khuôn mặt nào hôm nay.
                    </div>
                  ) : (
                    todayFacePunches.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-900/50"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-100 truncate">
                            {item.fullName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {item.employeeId} · {item.department}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 font-mono shrink-0">
                          <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/40 text-emerald-300">
                            Vào: {item.rawInTime || '--:--'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-700/40 text-cyan-300">
                            Ra: {item.rawOutTime || '--:--'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
