import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Upload,
  UserCheck,
  X,
  AlertCircle,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { FacePoseAngle, FacePoseSample, StaffRecord } from '../../types';
import {
  ensureFaceModelsLoaded,
  extractFaceFromImageUrl,
  extractFaceFromMediaSource,
  FACE_POSE_META,
  FACE_POSE_ORDER,
  getStaffPoseTemplates,
  HeadPoseInfo,
  isFaceModelsLoaded,
  isStaffFaceEnrolled,
} from '../../lib/faceRecognition';
import { getDefaultAvatarForEmployee } from '../../lib/avatarUtils';

interface EmployeeFaceSettingsModalProps {
  staff: StaffRecord;
  onClose: () => void;
  onSave: (updatedStaff: StaffRecord) => void;
}

function playScanBeep(isAllComplete = false) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    const now = ctx.currentTime;
    if (isAllComplete) {
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(990, now + 0.09);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.26);
    } else {
      osc.frequency.setValueAtTime(780, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.start(now);
      osc.stop(now + 0.12);
    }
    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 350);
  } catch {
    // ignore audio restrictions
  }
}

export const EmployeeFaceSettingsModal: React.FC<EmployeeFaceSettingsModalProps> = ({
  staff,
  onClose,
  onSave,
}) => {
  const initialTemplates = useMemo(() => {
    const map: Partial<Record<FacePoseAngle, FacePoseSample>> = {};
    getStaffPoseTemplates(staff).forEach((tpl) => {
      map[tpl.angle] = tpl;
    });
    return map;
  }, [staff]);

  const [faceAccessEnabled, setFaceAccessEnabled] = useState<boolean>(
    staff.faceAccessEnabled !== false
  );
  const [poseMap, setPoseMap] = useState<Partial<Record<FacePoseAngle, FacePoseSample>>>(
    initialTemplates
  );
  const [facePhotoUrl, setFacePhotoUrl] = useState<string>(staff.facePhotoUrl || '');
  const [faceUpdatedAt, setFaceUpdatedAt] = useState<string>(staff.faceUpdatedAt || '');

  const [cameraActive, setCameraActive] = useState(false);
  const [autoScanActive, setAutoScanActive] = useState(false);
  const [focusedAngle, setFocusedAngle] = useState<FacePoseAngle | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(!isFaceModelsLoaded());
  const [modelsReady, setModelsReady] = useState(isFaceModelsLoaded());
  const [processing, setProcessing] = useState(false);
  const [livePose, setLivePose] = useState<HeadPoseInfo | null>(null);
  const [liveQuality, setLiveQuality] = useState<number>(0);
  const [liveHint, setLiveHint] = useState<string>('Nhấn "Quét Khuôn Mặt 3D (Tự Động)" để bắt đầu');
  const [justCapturedAngle, setJustCapturedAngle] = useState<FacePoseAngle | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const poseMapRef = useRef(poseMap);
  const focusedAngleRef = useRef(focusedAngle);
  const isScanningFrameRef = useRef(false);
  const streakRef = useRef<{ angle: FacePoseAngle | null; count: number; lastCaptureMs: number }>({
    angle: null,
    count: 0,
    lastCaptureMs: 0,
  });

  useEffect(() => {
    poseMapRef.current = poseMap;
  }, [poseMap]);

  useEffect(() => {
    focusedAngleRef.current = focusedAngle;
  }, [focusedAngle]);

  useEffect(() => {
    let mounted = true;
    setModelsLoading(!isFaceModelsLoaded());
    ensureFaceModelsLoaded().then((ok) => {
      if (!mounted) return;
      setModelsReady(ok);
      setModelsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const capturedAngles = useMemo(
    () => FACE_POSE_ORDER.filter((ang) => Boolean(poseMap[ang]?.descriptor?.length)),
    [poseMap]
  );

  const nextMissingAngle = useMemo<FacePoseAngle | null>(() => {
    if (focusedAngle) return focusedAngle;
    return FACE_POSE_ORDER.find((ang) => !poseMap[ang]?.descriptor?.length) || null;
  }, [poseMap, focusedAngle]);

  const stopCamera = useCallback(() => {
    setAutoScanActive(false);
    setLivePose(null);
    setLiveQuality(0);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = async (
    mode: 'user' | 'environment' = facingMode,
    options?: { startAutoScan?: boolean; resetAll?: boolean; targetAngle?: FacePoseAngle | null }
  ) => {
    stopCamera();
    setCameraError(null);
    setStatusMessage(null);

    if (options?.resetAll) {
      setPoseMap({});
      poseMapRef.current = {};
    }
    setFocusedAngle(options?.targetAngle ?? null);
    focusedAngleRef.current = options?.targetAngle ?? null;
    streakRef.current = { angle: null, count: 0, lastCaptureMs: Date.now() };

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ truy cập camera. Vui lòng tải ảnh khuôn mặt.');
      return;
    }

    setModelsLoading(true);
    const aiOk = await ensureFaceModelsLoaded();
    setModelsReady(aiOk);
    setModelsLoading(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      const enableAuto = options?.startAutoScan ?? true;
      setAutoScanActive(enableAuto);
      setLiveHint(
        enableAuto
          ? 'Đưa khuôn mặt vào vòng tròn — Hệ thống sẽ tự động chụp từng góc quay'
          : 'Camera đã sẵn sàng'
      );
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setCameraError('Không thể mở camera (chưa cấp quyền hoặc không có thiết bị camera).');
      setCameraActive(false);
      setAutoScanActive(false);
    }
  };

  const commitCapturedSample = useCallback(
    (
      angle: FacePoseAngle,
      descriptor: number[],
      qualityScore: number,
      photoDataUrl: string,
      yaw?: number,
      pitch?: number
    ) => {
      const nowStr = new Date().toLocaleString('vi-VN');
      const nextSample: FacePoseSample = {
        angle,
        descriptor,
        qualityScore,
        yaw,
        pitch,
        capturedAt: nowStr,
      };
      const updatedMap: Partial<Record<FacePoseAngle, FacePoseSample>> = {
        ...poseMapRef.current,
        [angle]: nextSample,
      };
      poseMapRef.current = updatedMap;
      setPoseMap(updatedMap);
      setFaceUpdatedAt(nowStr);
      setFaceAccessEnabled(true);
      setJustCapturedAngle(angle);
      window.setTimeout(() => {
        setJustCapturedAngle((curr) => (curr === angle ? null : curr));
      }, 650);

      if (angle === 'FRONT' || !facePhotoUrl) {
        setFacePhotoUrl(photoDataUrl);
      }

      const completedCount = FACE_POSE_ORDER.filter((a) =>
        Boolean(updatedMap[a]?.descriptor?.length)
      ).length;
      const isComplete = completedCount >= FACE_POSE_ORDER.length;
      playScanBeep(isComplete);

      if (focusedAngleRef.current === angle) {
        setFocusedAngle(null);
        focusedAngleRef.current = null;
        setAutoScanActive(false);
        stopCamera();
        setStatusMessage({
          type: 'success',
          text: `Đã cập nhật góc "${FACE_POSE_META[angle].label}" (${qualityScore}%).`,
        });
        return;
      }

      if (isComplete) {
        setAutoScanActive(false);
        stopCamera();
        setStatusMessage({
          type: 'success',
          text: 'Hoàn tất quét khuôn mặt đa hướng 3D (5/5 hướng)! Nhấn "Lưu & Đồng Bộ Hệ Thống" để áp dụng ngay.',
        });
      }
    },
    [facePhotoUrl, stopCamera]
  );

  // Automatic 3D Multi-Angle Capture Loop
  useEffect(() => {
    if (!cameraActive || !autoScanActive) return;

    let cancelled = false;
    let timerId: number | null = null;

    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth >= 32 && !isScanningFrameRef.current) {
        isScanningFrameRef.current = true;
        try {
          const result = await extractFaceFromMediaSource(video, {
            requireDetectedFace: true,
            mirrored: facingMode === 'user',
          });

          if (cancelled) return;

          if (!result.hasFace || result.descriptor.length < 32) {
            setLivePose(null);
            setLiveQuality(0);
            setLiveHint(result.reason || 'Đưa khuôn mặt vào chính giữa vòng tròn...');
            streakRef.current.angle = null;
            streakRef.current.count = 0;
          } else {
            const detectedAngle: FacePoseAngle = result.pose?.angle || 'FRONT';
            setLivePose(result.pose || null);
            setLiveQuality(result.qualityScore);

            const targetSpecific = focusedAngleRef.current;
            const currentMap = poseMapRef.current;
            const missingList = FACE_POSE_ORDER.filter((a) => !currentMap[a]?.descriptor?.length);
            const recommended = targetSpecific || missingList[0] || null;
            const canCaptureDetected = targetSpecific
              ? detectedAngle === targetSpecific
              : !currentMap[detectedAngle]?.descriptor?.length;

            const nowMs = Date.now();
            const enoughCooldown = nowMs - streakRef.current.lastCaptureMs >= 520;
            const wellFramed = result.pose ? result.pose.isWellFramed : true;

            if (canCaptureDetected && result.qualityScore >= 58 && wellFramed && enoughCooldown) {
              if (streakRef.current.angle === detectedAngle) {
                streakRef.current.count += 1;
              } else {
                streakRef.current.angle = detectedAngle;
                streakRef.current.count = 1;
              }

              setLiveHint(`Đang khóa góc "${FACE_POSE_META[detectedAngle].label}"... giữ yên 1 nhịp`);

              // Lock after 2 steady matching frames (or 1 crisp frame on neural high confidence)
              const requiredFrames = result.engine === 'neural-3d' && result.qualityScore >= 82 ? 1 : 2;
              if (streakRef.current.count >= requiredFrames) {
                streakRef.current.lastCaptureMs = nowMs;
                streakRef.current.angle = null;
                streakRef.current.count = 0;
                commitCapturedSample(
                  detectedAngle,
                  result.descriptor,
                  result.qualityScore,
                  result.photoDataUrl,
                  result.pose?.yaw,
                  result.pose?.pitch
                );
              }
            } else if (!wellFramed) {
              streakRef.current.count = 0;
              setLiveHint('Đưa khuôn mặt lại gần & vào chính giữa vòng tròn');
            } else if (recommended) {
              streakRef.current.count = 0;
              setLiveHint(
                `${FACE_POSE_META[recommended].arrow} ${FACE_POSE_META[recommended].instruction}`
              );
            }
          }
        } finally {
          isScanningFrameRef.current = false;
        }
      }

      if (!cancelled) {
        timerId = window.setTimeout(tick, 130);
      }
    };

    timerId = window.setTimeout(tick, 160);

    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [cameraActive, autoScanActive, facingMode, commitCapturedSample]);

  const handleManualCaptureFromCamera = async () => {
    if (!videoRef.current || processing) return;
    setProcessing(true);
    setStatusMessage(null);
    try {
      const result = await extractFaceFromMediaSource(videoRef.current, {
        requireDetectedFace: true,
        mirrored: facingMode === 'user',
      });
      if (!result.hasFace || result.descriptor.length < 32) {
        setStatusMessage({
          type: 'error',
          text:
            result.reason ||
            'Chưa nhận diện rõ khuôn mặt. Hãy giữ khuôn mặt ở giữa khung sáng và thử lại.',
        });
        return;
      }

      const targetAngle: FacePoseAngle =
        focusedAngle || result.pose?.angle || nextMissingAngle || 'FRONT';
      commitCapturedSample(
        targetAngle,
        result.descriptor,
        result.qualityScore,
        result.photoDataUrl,
        result.pose?.yaw,
        result.pose?.pitch
      );
      setStatusMessage({
        type: 'success',
        text: `Đã chụp góc "${FACE_POSE_META[targetAngle].label}" (${result.qualityScore}%).`,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setProcessing(true);
    setStatusMessage(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await extractFaceFromImageUrl(dataUrl);
      if (result.descriptor.length < 32) {
        setStatusMessage({
          type: 'error',
          text: result.reason || 'Không thể phân tích khuôn mặt từ ảnh đã tải lên.',
        });
        return;
      }

      const angle: FacePoseAngle = result.pose?.angle || 'FRONT';
      const nowStr = new Date().toLocaleString('vi-VN');
      setPoseMap((prev) => ({
        ...prev,
        [angle]: {
          angle,
          descriptor: result.descriptor,
          qualityScore: result.qualityScore,
          yaw: result.pose?.yaw,
          pitch: result.pose?.pitch,
          capturedAt: nowStr,
        },
      }));
      setFacePhotoUrl(result.photoDataUrl || dataUrl);
      setFaceUpdatedAt(nowStr);
      setFaceAccessEnabled(true);
      setStatusMessage({
        type: 'success',
        text: `Đã tạo mẫu khuôn mặt từ ảnh tải lên (${FACE_POSE_META[angle].label} · ${result.qualityScore}%). Khuyên dùng Quét 3D để lấy đủ 5 hướng chính xác hơn.`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Lỗi đọc tệp ảnh khuôn mặt.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUseExistingAvatar = async () => {
    if (!staff.avatarUrl) return;
    setProcessing(true);
    setStatusMessage(null);
    try {
      const result = await extractFaceFromImageUrl(staff.avatarUrl);
      if (result.descriptor.length < 32) {
        setStatusMessage({
          type: 'error',
          text: result.reason || 'Không thể trích xuất đặc trưng khuôn mặt từ ảnh thẻ hiện tại.',
        });
        return;
      }
      const nowStr = new Date().toLocaleString('vi-VN');
      setPoseMap((prev) => ({
        ...prev,
        FRONT: {
          angle: 'FRONT',
          descriptor: result.descriptor,
          qualityScore: result.qualityScore,
          capturedAt: nowStr,
        },
      }));
      setFacePhotoUrl(result.photoDataUrl || staff.avatarUrl);
      setFaceUpdatedAt(nowStr);
      setFaceAccessEnabled(true);
      setStatusMessage({
        type: 'success',
        text: 'Đã lấy mẫu góc Thẳng từ ảnh đại diện hồ sơ. Có thể quét thêm 4 góc quay để tăng độ nhạy 3D.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleClearFaceData = () => {
    stopCamera();
    setPoseMap({});
    poseMapRef.current = {};
    setFacePhotoUrl('');
    setFaceUpdatedAt('');
    setStatusMessage({
      type: 'info',
      text: 'Đã xóa dữ liệu khuôn mặt tạm thời. Nhấn "Lưu & Đồng Bộ" để áp dụng.',
    });
  };

  const handleSaveSettings = () => {
    stopCamera();
    const templates: FacePoseSample[] = FACE_POSE_ORDER.map((ang) => poseMap[ang]).filter(
      (item): item is FacePoseSample => Boolean(item && item.descriptor.length >= 32)
    );
    const primaryDescriptor =
      templates.find((t) => t.angle === 'FRONT')?.descriptor || templates[0]?.descriptor;

    const hasAny = templates.length > 0 && Boolean(primaryDescriptor?.length);
    const updatedStaff: StaffRecord = {
      ...staff,
      faceAccessEnabled,
      faceDescriptor: hasAny ? primaryDescriptor : undefined,
      facePoseTemplates: hasAny ? templates : undefined,
      facePhotoUrl: hasAny ? facePhotoUrl || staff.facePhotoUrl : undefined,
      faceUpdatedAt: hasAny ? faceUpdatedAt || new Date().toLocaleString('vi-VN') : undefined,
    };
    onSave(updatedStaff);
    onClose();
  };

  const enrolledNow = capturedAngles.length > 0;
  const hadEnrolled = isStaffFaceEnrolled(staff);
  const averageQuality = useMemo(() => {
    if (capturedAngles.length === 0) return null;
    const sum = capturedAngles.reduce((acc, a) => acc + (poseMap[a]?.qualityScore || 85), 0);
    return Math.round(sum / capturedAngles.length);
  }, [capturedAngles, poseMap]);

  const displayAvatar =
    facePhotoUrl ||
    staff.avatarUrl ||
    getDefaultAvatarForEmployee(staff.employeeId, staff.fullName);

  // Build 40-segment FaceID radial ring around circular camera
  const radialTicks = useMemo(() => {
    const count = 40;
    return Array.from({ length: count }, (_, i) => {
      const deg = (i / count) * 360 - 90; // 0 = top (-90deg in SVG)
      // Map degree quadrants cleanly to angles:
      // Top (-135..-45) -> UP, Right (-45..45) -> RIGHT, Bottom (45..135) -> DOWN, Left (135..225) -> LEFT
      let sector: FacePoseAngle = 'UP';
      if (deg >= -135 && deg < -45) sector = 'UP';
      else if (deg >= -45 && deg < 45) sector = 'RIGHT';
      else if (deg >= 45 && deg < 135) sector = 'DOWN';
      else sector = 'LEFT';

      const captured = Boolean(poseMap[sector]?.descriptor?.length);
      const frontCaptured = Boolean(poseMap.FRONT?.descriptor?.length);
      const activeTarget = nextMissingAngle === sector || (nextMissingAngle === 'FRONT' && !frontCaptured);
      const rad = (deg * Math.PI) / 180;
      const r1 = 132;
      const r2 = captured ? 146 : activeTarget ? 144 : 139;
      return {
        i,
        x1: 150 + Math.cos(rad) * r1,
        y1: 150 + Math.sin(rad) * r1,
        x2: 150 + Math.cos(rad) * r2,
        y2: 150 + Math.sin(rad) * r2,
        captured,
        activeTarget,
        sector,
      };
    });
  }, [poseMap, nextMissingAngle]);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-slate-950/85 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
              <ScanFace className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  Quét Khuôn Mặt 3D Đa Hướng
                </h3>
                <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                  {modelsLoading ? 'Đang tải AI...' : modelsReady ? 'AI 3D Ready' : 'Chế độ chuẩn'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {staff.fullName} · <span className="font-mono text-cyan-300">{staff.employeeId}</span> ·{' '}
                {staff.department || 'MULTI'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Status + Access Toggle Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2.5 flex-wrap">
              {enrolledNow ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    Đã thu {capturedAngles.length}/5 góc khuôn mặt 3D
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chưa có dữ liệu khuôn mặt</span>
                </span>
              )}
              {faceUpdatedAt && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Cập nhật: {faceUpdatedAt}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setFaceAccessEnabled((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                faceAccessEnabled
                  ? 'bg-sky-600/20 border-sky-500/50 text-sky-300 hover:bg-sky-600/30'
                  : 'bg-rose-950/50 border-rose-600/40 text-rose-300 hover:bg-rose-900/40'
              }`}
            >
              {faceAccessEnabled ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Cho phép chấm công khuôn mặt</span>
                </>
              ) : (
                <>
                  <ShieldOff className="w-4 h-4 text-rose-400" />
                  <span>Đang tạm khóa nhận diện</span>
                </>
              )}
            </button>
          </div>

          {/* Two-column 3D FaceID workspace */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Left: 3D Circular Scanner Ring & 5 Direction Status Chips */}
            <div className="md:col-span-6 space-y-3">
              <div className="relative w-[300px] h-[300px] mx-auto flex items-center justify-center">
                {/* 3D FaceID Segmented SVG Ring */}
                <svg
                  viewBox="0 0 300 300"
                  className="pointer-events-none absolute inset-0 w-full h-full z-20"
                >
                  <circle
                    cx="150"
                    cy="150"
                    r="126"
                    fill="none"
                    stroke={poseMap.FRONT ? '#10b981' : '#38bdf8'}
                    strokeOpacity={cameraActive ? 0.5 : 0.22}
                    strokeWidth="2"
                  />
                  {radialTicks.map((t) => (
                    <line
                      key={t.i}
                      x1={t.x1}
                      y1={t.y1}
                      x2={t.x2}
                      y2={t.y2}
                      stroke={
                        t.captured
                          ? '#10b981'
                          : cameraActive && t.activeTarget
                          ? '#22d3ee'
                          : '#334155'
                      }
                      strokeWidth={t.captured ? 3.5 : t.activeTarget && cameraActive ? 3 : 2}
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  ))}
                </svg>

                {/* Circular Video / Portrait Viewport */}
                <div
                  className={`relative w-[244px] h-[244px] rounded-full overflow-hidden bg-slate-950 border-2 shadow-[0_0_40px_rgba(14,165,233,0.18)] flex items-center justify-center transition-colors ${
                    justCapturedAngle
                      ? 'border-emerald-400 shadow-[0_0_45px_rgba(16,185,129,0.5)]'
                      : cameraActive
                      ? 'border-cyan-500/50'
                      : 'border-slate-800'
                  }`}
                >
                  {cameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className={`w-full h-full object-cover ${
                          facingMode === 'user' ? 'scale-x-[-1]' : ''
                        }`}
                      />

                      {/* Live 3D Constellation Landmark Dots */}
                      {livePose?.meshPoints && livePose.meshPoints.length > 0 && (
                        <svg
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          className="pointer-events-none absolute inset-0 w-full h-full z-10"
                        >
                          {livePose.meshPoints.map((pt, idx) => (
                            <circle
                              key={idx}
                              cx={pt.x * 100}
                              cy={pt.y * 100}
                              r="1.15"
                              fill={liveQuality >= 65 ? '#34d399' : '#38bdf8'}
                              opacity="0.88"
                            />
                          ))}
                        </svg>
                      )}

                      {/* Target Direction Arrow Cue */}
                      {autoScanActive && nextMissingAngle && (
                        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-center gap-1 z-20">
                          <span className="px-2.5 py-1 rounded-full bg-slate-950/85 border border-cyan-500/40 text-cyan-200 text-[11px] font-bold shadow">
                            {FACE_POSE_META[nextMissingAngle].arrow}{' '}
                            {FACE_POSE_META[nextMissingAngle].label}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                      <img
                        src={displayAvatar}
                        alt={staff.fullName}
                        className="w-36 h-36 rounded-full object-cover border-4 border-slate-700 shadow-lg"
                      />
                      {enrolledNow && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                          <UserCheck className="w-3 h-3" />
                          <span>
                            {capturedAngles.length}/5 hướng
                            {averageQuality ? ` · ${averageQuality}%` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Guidance Box */}
              <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-center space-y-1">
                <div className="text-xs font-bold text-cyan-300">
                  {cameraActive
                    ? liveHint
                    : capturedAngles.length >= 5
                    ? 'Đã thu đủ 5 góc quay khuôn mặt 3D chuẩn xác!'
                    : 'Mở camera để tự động quét 5 hướng khuôn mặt (Thẳng, Trái, Phải, Lên, Xuống)'}
                </div>
                {cameraActive && livePose && (
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-center gap-3">
                    <span>Hướng hiện tại: <strong className="text-white">{livePose.labelVi}</strong></span>
                    <span>Yaw: {livePose.yaw}°</span>
                    <span>Pitch: {livePose.pitch}°</span>
                  </div>
                )}
              </div>

              {/* 5 Multi-Angle Progress Pills (Click any chip to capture/re-scan that angle) */}
              <div className="grid grid-cols-5 gap-1.5">
                {FACE_POSE_ORDER.map((ang) => {
                  const sample = poseMap[ang];
                  const isCaptured = Boolean(sample?.descriptor?.length);
                  const isTarget = cameraActive && nextMissingAngle === ang;
                  return (
                    <button
                      key={ang}
                      type="button"
                      onClick={() => {
                        if (!cameraActive) {
                          startCamera(facingMode, { startAutoScan: true, targetAngle: ang });
                        } else {
                          setFocusedAngle(ang);
                          focusedAngleRef.current = ang;
                          setAutoScanActive(true);
                          setLiveHint(FACE_POSE_META[ang].instruction);
                        }
                      }}
                      title={`Nhấn để quét riêng hướng ${FACE_POSE_META[ang].label}`}
                      className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                        isCaptured
                          ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                          : isTarget
                          ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black leading-none">
                        {isCaptured ? '✓' : FACE_POSE_META[ang].arrow}
                      </div>
                      <div className="text-[10px] font-bold mt-1 leading-tight">
                        {FACE_POSE_META[ang].shortLabel}
                      </div>
                    </button>
                  );
                })}
              </div>

              {cameraError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-700/50 text-rose-200 text-xs">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Right: Actions & 3D Instructions */}
            <div className="md:col-span-6 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Điều Khiển Quét Khuôn Mặt 3D
              </div>

              {!cameraActive ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      startCamera(facingMode, {
                        startAutoScan: true,
                        resetAll: capturedAngles.length >= 5,
                      })
                    }
                    disabled={processing}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-sky-900/40"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {capturedAngles.length >= 5
                        ? 'Quét Lại Khuôn Mặt 3D (Tự Động 5 Hướng)'
                        : capturedAngles.length > 0
                        ? `Tiếp Tục Quét Tự Động (${capturedAngles.length}/5 hướng)`
                        : 'Bắt Đầu Quét Khuôn Mặt 3D (Tự Động)'}
                    </span>
                  </button>

                  {capturedAngles.length > 0 && capturedAngles.length < 5 && (
                    <button
                      type="button"
                      onClick={() =>
                        startCamera(facingMode, { startAutoScan: true, resetAll: true })
                      }
                      disabled={processing}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Quét Mới Từ Đầu Cả 5 Hướng</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleManualCaptureFromCamera}
                    disabled={processing}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>
                      {processing
                        ? 'Đang trích xuất...'
                        : 'Chụp Ngay Hướng Hiện Tại (Thủ Công)'}
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextMode = facingMode === 'user' ? 'environment' : 'user';
                        setFacingMode(nextMode);
                        startCamera(nextMode, { startAutoScan: true });
                      }}
                      className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Đổi Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Tạm Dừng Camera
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadPhoto}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Tải Ảnh Chân Dung Từ Thiết Bị</span>
              </button>

              {staff.avatarUrl && (
                <button
                  type="button"
                  onClick={handleUseExistingAvatar}
                  disabled={processing}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-amber-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>Lấy Từ Ảnh Đại Diện Hồ Sơ</span>
                </button>
              )}

              {(enrolledNow || hadEnrolled) && (
                <button
                  type="button"
                  onClick={handleClearFaceData}
                  disabled={processing}
                  className="w-full py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Toàn Bộ Mẫu Khuôn Mặt</span>
                </button>
              )}

              <div className="p-3.5 rounded-xl bg-slate-950/75 border border-slate-800/90 text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
                <div className="font-bold text-slate-200">
                  Cơ chế quét 3D & nhận diện đa góc:
                </div>
                <p>
                  • Hệ thống AI tự động thu mẫu tại <strong className="text-cyan-300">5 hướng xoay</strong> (Thẳng, Trái, Phải, Lên, Xuống) khi bạn xoay nhẹ đầu trong khung tròn.
                </p>
                <p>
                  • Nhấn trực tiếp vào từng ô góc ở bên trái nếu muốn quét lại riêng góc đó.
                </p>
                <p>
                  • Khi đứng trước camera chấm công ở bất kỳ góc nhìn nghiêng hay thẳng nào, hệ thống đối chiếu toàn bộ kho mẫu 3D để nhận diện tức thì.
                </p>
              </div>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                  : 'bg-sky-950/60 border-sky-500/40 text-sky-200'
              }`}
            >
              {statusMessage.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-950/85 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={processing}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/30"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Lưu &amp; Đồng Bộ Hệ Thống
              {enrolledNow ? ` (${capturedAngles.length}/5 hướng)` : ''}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
