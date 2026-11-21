import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { StaffRecord } from '../../types';
import {
  AttendancePunchResult,
  formatCurrentHhMm,
  formatIsoDate,
  getDateMatrixPunchState,
  parseAttendanceQrPayload,
  recordEmployeeAttendancePunch,
} from '../../lib/attendanceQr';
import { calculateMatrixDayHoursFromTimes } from '../../lib/matrixTimekeeping';
import {
  Camera,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  RefreshCw,
  Save,
  ScanLine,
  ShieldAlert,
  SkipForward,
  SwitchCamera,
  X,
} from 'lucide-react';

interface AttendanceQRScannerModalProps {
  isOpen: boolean;
  staff: StaffRecord;
  allStaff: StaffRecord[];
  onClose: () => void;
  onSuccess: (result: AttendancePunchResult) => void;
}

export const AttendanceQRScannerModal: React.FC<AttendanceQRScannerModalProps> = ({
  isOpen,
  staff,
  allStaff,
  onClose,
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastInvalidScanRef = useRef<{ text: string; ts: number }>({ text: '', ts: 0 });
  const successLockedRef = useRef(false);

  const [mode, setMode] = useState<'SCAN' | 'MANUAL'>('SCAN');
  const [scanActionChoice, setScanActionChoice] = useState<'AUTO' | 'IN' | 'OUT'>('AUTO');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraState, setCameraState] = useState<'starting' | 'active' | 'error'>('starting');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [punchResult, setPunchResult] = useState<AttendancePunchResult | null>(null);
  const [liveTime, setLiveTime] = useState<string>(() => formatCurrentHhMm());

  // Manual form state ("Bỏ qua" fallback)
  const [manualDate, setManualDate] = useState<string>(() => formatIsoDate());
  const [manualShift, setManualShift] = useState<'DAY' | 'NIGHT'>(
    staff.shift === 'NIGHT' ? 'NIGHT' : 'DAY'
  );
  const [manualInTime, setManualInTime] = useState<string>('');
  const [manualOutTime, setManualOutTime] = useState<string>('');
  const [manualError, setManualError] = useState<string | null>(null);

  const todayState = useMemo(() => {
    const now = new Date();
    return getDateMatrixPunchState(
      staff,
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );
  }, [staff, isOpen]);

  // Sync live clock & reset modal states on open
  useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    const state = getDateMatrixPunchState(
      staff,
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );
    setLiveTime(formatCurrentHhMm(now));
    setMode('SCAN');
    setScanActionChoice('AUTO');
    setScanError(null);
    setPunchResult(null);
    setManualError(null);
    setManualDate(formatIsoDate(now));
    setManualShift(state.existingShift);
    setManualInTime(
      state.existingInTime || (state.existingShift === 'NIGHT' ? '20:00' : '08:00')
    );
    setManualOutTime(
      state.existingOutTime || (state.existingShift === 'NIGHT' ? '05:00' : '17:00')
    );

    const timer = window.setInterval(() => {
      setLiveTime(formatCurrentHhMm(new Date()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, staff]);

  // Refresh manual fields when changing manual date
  useEffect(() => {
    if (!isOpen || mode !== 'MANUAL') return;
    const parts = manualDate.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return;
    const [y, m, d] = parts;
    const st = getDateMatrixPunchState(staff, y, m, d);
    setManualShift(st.existingShift);
    setManualInTime(st.existingInTime || (st.existingShift === 'NIGHT' ? '20:00' : '08:00'));
    setManualOutTime(st.existingOutTime || (st.existingShift === 'NIGHT' ? '05:00' : '17:00'));
  }, [manualDate, mode, isOpen, staff]);

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

  const resolvedScanAction: 'IN' | 'OUT' =
    scanActionChoice === 'AUTO' ? todayState.suggestedMode : scanActionChoice;

  const executeQrPunch = useCallback(
    (rawText: string) => {
      if (successLockedRef.current) return;

      const parsed = parseAttendanceQrPayload(rawText);
      if (parsed.type === 'STAFF_QR') {
        const nowTs = Date.now();
        if (
          lastInvalidScanRef.current.text !== rawText ||
          nowTs - lastInvalidScanRef.current.ts > 2000
        ) {
          lastInvalidScanRef.current = { text: rawText, ts: nowTs };
          setScanError(
            'Đây là Mã QR hồ sơ cá nhân. Vui lòng quét Mã QR Chấm Công hiển thị tại trạm QRCODE.'
          );
        }
        return;
      }

      if (parsed.type === 'APP_URL') {
        const nowTs = Date.now();
        if (
          lastInvalidScanRef.current.text !== rawText ||
          nowTs - lastInvalidScanRef.current.ts > 2000
        ) {
          lastInvalidScanRef.current = { text: rawText, ts: nowTs };
          setScanError(
            'Đây là Mã QR liên kết ứng dụng. Vui lòng quét Mã QR Chấm Công tại tài khoản QRCODE.'
          );
        }
        return;
      }

      if (parsed.type !== 'ATTENDANCE_QR') {
        const nowTs = Date.now();
        if (
          lastInvalidScanRef.current.text !== rawText ||
          nowTs - lastInvalidScanRef.current.ts > 2000
        ) {
          lastInvalidScanRef.current = { text: rawText, ts: nowTs };
          setScanError('Mã QR không phải Mã QR Chấm Công của hệ thống Newprotec.');
        }
        return;
      }

      const now = new Date();
      const timeNow = formatCurrentHhMm(now);
      const targetMode =
        scanActionChoice === 'AUTO'
          ? getDateMatrixPunchState(staff, now.getFullYear(), now.getMonth() + 1, now.getDate())
              .suggestedMode
          : scanActionChoice;

      const res = recordEmployeeAttendancePunch({
        staff,
        allStaff,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        mode: targetMode,
        inTime: targetMode === 'IN' ? timeNow : undefined,
        outTime: targetMode === 'OUT' ? timeNow : undefined,
        method: 'QR',
      });

      if (!res.ok) {
        setScanError(res.error || 'Không thể chấm công tự động.');
        return;
      }

      successLockedRef.current = true;
      setScanError(null);
      setPunchResult(res);
      stopCameraStream();

      window.setTimeout(() => {
        onSuccess(res);
      }, 950);
    },
    [allStaff, onSuccess, scanActionChoice, staff, stopCameraStream]
  );

  const startCamera = useCallback(
    async (camMode: 'environment' | 'user') => {
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
          'Trình duyệt không hỗ trợ Camera trực tiếp. Vui lòng dùng thiết bị có Camera để quét trực tiếp hoặc nhấn "Bỏ qua" để chấm công thủ công.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: camMode },
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
            'Bạn đã từ chối quyền Camera. Vui lòng cấp quyền Camera để quét mã QR trực tiếp hoặc nhấn "Bỏ qua" để tự điền giờ.'
          );
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setCameraError(
            'Không tìm thấy Camera trên thiết bị này. Vui lòng dùng thiết bị có Camera để quét trực tiếp hoặc nhấn "Bỏ qua" để tự điền giờ.'
          );
        } else {
          setCameraError(
            'Không thể mở Camera lúc này. Vui lòng thử lại hoặc nhấn "Bỏ qua" để chấm công thủ công.'
          );
        }
      }
    },
    [stopCameraStream]
  );

  useEffect(() => {
    if (!isOpen || mode !== 'SCAN') {
      stopCameraStream();
      successLockedRef.current = false;
      return;
    }

    successLockedRef.current = false;
    setScanError(null);
    startCamera(facingMode);

    return () => {
      stopCameraStream();
    };
  }, [isOpen, mode, facingMode, startCamera, stopCameraStream]);

  // Continuous QR frame scan
  useEffect(() => {
    if (!isOpen || mode !== 'SCAN' || cameraState !== 'active' || punchResult) return;

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
        executeQrPunch(code.data);
      }
    }, 140);

    return () => window.clearInterval(timer);
  }, [isOpen, mode, cameraState, punchResult, executeQrPunch]);

  const manualHoursPreview = useMemo(() => {
    const parts = manualDate.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [y, m, d] = parts;
    const st = getDateMatrixPunchState(staff, y, m, d);
    if (!manualInTime.trim() || !manualOutTime.trim()) return null;
    return calculateMatrixDayHoursFromTimes(
      manualInTime.trim(),
      manualOutTime.trim(),
      manualShift,
      st.isSunday,
      st.isHoliday
    );
  }, [manualDate, manualInTime, manualOutTime, manualShift, staff]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    const parts = manualDate.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      setManualError('Ngày chấm công không hợp lệ.');
      return;
    }
    const [y, m, d] = parts;
    const trimmedIn = manualInTime.trim();
    const trimmedOut = manualOutTime.trim();

    if (!trimmedIn && !trimmedOut) {
      setManualError('Vui lòng nhập Giờ Vào hoặc Giờ Ra.');
      return;
    }

    const res = recordEmployeeAttendancePunch({
      staff,
      allStaff,
      year: y,
      month: m,
      day: d,
      mode: 'BOTH',
      inTime: trimmedIn,
      outTime: trimmedOut,
      shift: manualShift,
      method: 'MANUAL',
    });

    if (!res.ok) {
      setManualError(res.error || 'Không thể lưu chấm công.');
      return;
    }

    onSuccess(res);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[125] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-4 sm:p-5 shadow-2xl text-slate-100 space-y-3.5 max-h-[94dvh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
              {mode === 'SCAN' ? (
                <ScanLine className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {mode === 'SCAN' ? 'Chấm Công Bằng Quét Mã QR' : 'Chấm Công Thủ Công'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {staff.fullName} · {staff.employeeId} ({staff.department || 'MULTI'})
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

        {/* Today Attendance Summary Strip */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 text-center">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Hôm Nay ({todayState.dateStr.slice(0, 5)})
            </div>
            <div className="text-xs font-mono font-bold text-cyan-300 mt-0.5">{liveTime}</div>
          </div>
          <div className="border-x border-slate-800">
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Giờ Vào Đã Ghi
            </div>
            <div className="text-xs font-mono font-bold text-white mt-0.5">
              {todayState.existingInTime || '--:--'}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Giờ Ra Đã Ghi
            </div>
            <div className="text-xs font-mono font-bold text-white mt-0.5">
              {todayState.existingOutTime || '--:--'}
            </div>
          </div>
        </div>

        {mode === 'SCAN' ? (
          <>
            {/* Punch Direction Toggle */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setScanActionChoice('AUTO')}
                className={`py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                  scanActionChoice === 'AUTO'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tự động ({todayState.suggestedMode === 'IN' ? 'Vào' : 'Ra'})
              </button>
              <button
                type="button"
                onClick={() => setScanActionChoice('IN')}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  scanActionChoice === 'IN'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3 h-3" />
                <span>Giờ Vào</span>
              </button>
              <button
                type="button"
                onClick={() => setScanActionChoice('OUT')}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  scanActionChoice === 'OUT'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogOut className="w-3 h-3" />
                <span>Giờ Ra</span>
              </button>
            </div>

            {/* Camera Viewport */}
            <div className="relative w-full aspect-square max-h-[300px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
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

              {cameraState === 'active' && !punchResult && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="relative w-52 h-52 sm:w-56 sm:h-56">
                    <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                    <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                    <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                    <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                    <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse" />
                  </div>
                  <span className="mt-2 px-2.5 py-0.5 rounded-full bg-black/70 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                    Sẽ ghi: {resolvedScanAction === 'IN' ? 'GIỜ VÀO' : 'GIỜ RA'} ({liveTime})
                  </span>
                </div>
              )}

              {cameraState === 'starting' && !punchResult && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300 text-xs p-4 text-center">
                  <Camera className="w-8 h-8 text-emerald-400 animate-pulse" />
                  <span className="font-semibold">Đang khởi động Camera chấm công...</span>
                </div>
              )}

              {cameraState === 'error' && !punchResult && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center bg-slate-950/95">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Camera className="w-5 h-5" />
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

              {punchResult && (
                <div className="absolute inset-0 bg-emerald-950/95 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-5 text-center animate-in fade-in duration-150">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="text-sm font-extrabold text-white uppercase tracking-wide">
                    {punchResult.mode === 'IN' ? 'Đã Chấm Giờ Vào!' : 'Đã Chấm Giờ Ra!'}
                  </div>
                  <div className="text-xs font-mono text-emerald-300">
                    Vào: {punchResult.inTime || '--:--'} · Ra: {punchResult.outTime || '--:--'}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Đã đồng bộ vào bảng chấm công bộ phận {punchResult.departmentLabel}
                  </div>
                </div>
              )}
            </div>

            {scanError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-700/70 text-rose-200 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}

            {/* Camera Switch Control (Live scan only - no saved photo upload allowed) */}
            <button
              type="button"
              onClick={() =>
                setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
              }
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <SwitchCamera className="w-4 h-4 text-cyan-400" />
              <span>
                Đổi Camera ({facingMode === 'environment' ? 'Đang dùng Camera Sau' : 'Đang dùng Camera Trước'})
              </span>
            </button>

            {/* Skip QR -> Normal Manual Time Entry */}
            <button
              type="button"
              onClick={() => setMode('MANUAL')}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <SkipForward className="w-4 h-4 text-amber-300" />
              <span>Bỏ qua quét QR (Chấm công điền thời gian thường)</span>
            </button>
          </>
        ) : (
          /* MANUAL ATTENDANCE ENTRY FORM ("Bỏ qua") */
          <form onSubmit={handleManualSubmit} className="space-y-3.5 text-xs">
            {manualError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-700/70 text-rose-200 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{manualError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Ngày chấm công
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Ca làm việc
                </label>
                <select
                  value={manualShift}
                  onChange={(e) => setManualShift(e.target.value as 'DAY' | 'NIGHT')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="DAY">Ca Ngày</option>
                  <option value="NIGHT">Ca Đêm</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-cyan-300">Giờ Vào (IN)</label>
                  <button
                    type="button"
                    onClick={() => setManualInTime(formatCurrentHhMm())}
                    className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    Giờ hiện tại
                  </button>
                </div>
                <input
                  type="time"
                  value={manualInTime}
                  onChange={(e) => setManualInTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-amber-300">Giờ Ra (OUT)</label>
                  <button
                    type="button"
                    onClick={() => setManualOutTime(formatCurrentHhMm())}
                    className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    Giờ hiện tại
                  </button>
                </div>
                <input
                  type="time"
                  value={manualOutTime}
                  onChange={(e) => setManualOutTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setManualShift('DAY');
                  setManualInTime('08:00');
                  setManualOutTime('17:00');
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-200 font-semibold cursor-pointer"
              >
                Ca Ngày 08:00 - 17:00
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualShift('NIGHT');
                  setManualInTime('20:00');
                  setManualOutTime('05:00');
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-200 font-semibold cursor-pointer"
              >
                Ca Đêm 20:00 - 05:00
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualInTime(formatCurrentHhMm());
                  setManualOutTime('');
                }}
                className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/50 text-[10px] text-cyan-200 font-semibold cursor-pointer"
              >
                Chỉ chấm Vào ({liveTime})
              </button>
            </div>

            {manualHoursPreview && (
              <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-700/40 flex items-center justify-between text-[11px]">
                <span className="text-slate-300">
                  Công chuẩn: <strong className="text-emerald-300">{manualHoursPreview.regularHours}h</strong> · Tăng ca:{' '}
                  <strong className="text-amber-300">{manualHoursPreview.totalOtHours}h</strong>
                </span>
                <span className="font-bold text-cyan-300">{manualHoursPreview.suggestedStatus}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMode('SCAN')}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <ScanLine className="w-4 h-4 text-emerald-400" />
                <span>Quay lại Quét QR</span>
              </button>

              <button
                type="submit"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-emerald-950/40"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Chấm Công</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
