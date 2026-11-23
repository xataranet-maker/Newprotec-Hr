import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { StaffRecord } from '../../types';
import {
  extractFaceFromImageUrl,
  extractFaceFromMediaSource,
  isStaffFaceEnrolled,
} from '../../lib/faceRecognition';
import { getDefaultAvatarForEmployee } from '../../lib/avatarUtils';

interface EmployeeFaceSettingsModalProps {
  staff: StaffRecord;
  onClose: () => void;
  onSave: (updatedStaff: StaffRecord) => void;
}

export const EmployeeFaceSettingsModal: React.FC<EmployeeFaceSettingsModalProps> = ({
  staff,
  onClose,
  onSave,
}) => {
  const [faceAccessEnabled, setFaceAccessEnabled] = useState<boolean>(
    staff.faceAccessEnabled !== false
  );
  const [faceDescriptor, setFaceDescriptor] = useState<number[]>(
    Array.isArray(staff.faceDescriptor) ? staff.faceDescriptor : []
  );
  const [facePhotoUrl, setFacePhotoUrl] = useState<string>(staff.facePhotoUrl || '');
  const [faceUpdatedAt, setFaceUpdatedAt] = useState<string>(staff.faceUpdatedAt || '');
  const [qualityScore, setQualityScore] = useState<number | null>(
    Array.isArray(staff.faceDescriptor) && staff.faceDescriptor.length >= 32 ? 92 : null
  );

  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    stopCamera();
    setCameraError(null);
    setStatusMessage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ truy cập camera. Vui lòng tải ảnh khuôn mặt.');
      return;
    }

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
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setCameraError('Không thể mở camera (chưa cấp quyền hoặc không có thiết bị camera).');
      setCameraActive(false);
    }
  };

  const handleCaptureFromCamera = async () => {
    if (!videoRef.current || processing) return;
    setProcessing(true);
    setStatusMessage(null);
    try {
      const result = await extractFaceFromMediaSource(videoRef.current, {
        requireDetectedFace: true,
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

      const nowStr = new Date().toLocaleString('vi-VN');
      setFaceDescriptor(result.descriptor);
      setFacePhotoUrl(result.photoDataUrl);
      setFaceUpdatedAt(nowStr);
      setFaceAccessEnabled(true);
      setQualityScore(result.qualityScore);
      setStatusMessage({
        type: 'success',
        text: `Đã trích xuất dữ liệu khuôn mặt thành công (Độ rõ ${result.qualityScore}%). Nhấn "Lưu & Đồng Bộ" để hoàn tất.`,
      });
      stopCamera();
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

      const nowStr = new Date().toLocaleString('vi-VN');
      setFaceDescriptor(result.descriptor);
      setFacePhotoUrl(result.photoDataUrl || dataUrl);
      setFaceUpdatedAt(nowStr);
      setFaceAccessEnabled(true);
      setQualityScore(result.qualityScore);
      setStatusMessage({
        type: 'success',
        text: result.hasFace
          ? `Đã tạo mẫu khuôn mặt từ ảnh tải lên (${result.qualityScore}%).`
          : 'Đã trích xuất vùng trung tâm ảnh làm mẫu nhận diện khuôn mặt.',
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
      setFaceDescriptor(result.descriptor);
      setFacePhotoUrl(result.photoDataUrl || staff.avatarUrl);
      setFaceUpdatedAt(nowStr);
      setFaceAccessEnabled(true);
      setQualityScore(result.qualityScore);
      setStatusMessage({
        type: 'success',
        text: 'Đã cài đặt mẫu khuôn mặt từ ảnh đại diện hồ sơ nhân viên.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleClearFaceData = () => {
    setFaceDescriptor([]);
    setFacePhotoUrl('');
    setFaceUpdatedAt('');
    setQualityScore(null);
    setStatusMessage({
      type: 'info',
      text: 'Đã xóa mẫu khuôn mặt tạm thời. Nhấn "Lưu & Đồng Bộ" để áp dụng.',
    });
  };

  const handleSaveSettings = () => {
    stopCamera();
    const updatedStaff: StaffRecord = {
      ...staff,
      faceAccessEnabled,
      faceDescriptor: faceDescriptor.length >= 32 ? faceDescriptor : undefined,
      facePhotoUrl: faceDescriptor.length >= 32 ? facePhotoUrl : undefined,
      faceUpdatedAt: faceDescriptor.length >= 32 ? faceUpdatedAt || new Date().toLocaleString('vi-VN') : undefined,
    };
    onSave(updatedStaff);
    onClose();
  };

  const enrolledNow = faceDescriptor.length >= 32;
  const hadEnrolled = isStaffFaceEnrolled(staff);
  const displayAvatar =
    facePhotoUrl ||
    staff.avatarUrl ||
    getDefaultAvatarForEmployee(staff.employeeId, staff.fullName);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
              <ScanFace className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                Cài Đặt Chấm Công Khuôn Mặt
              </h3>
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

        <div className="p-5 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Status + Access Toggle Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2.5">
              {enrolledNow ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đã cài đặt khuôn mặt</span>
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

          {/* Two-column setup workspace */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Left: Enrolled Avatar / Live Camera */}
            <div className="md:col-span-6 space-y-3">
              <div className="relative aspect-square w-full max-w-[290px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-inner flex items-center justify-center">
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
                    {/* Guide brackets */}
                    <div className="pointer-events-none absolute inset-10">
                      <span className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-sky-400 rounded-tl-md" />
                      <span className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-sky-400 rounded-tr-md" />
                      <span className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-sky-400 rounded-bl-md" />
                      <span className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-sky-400 rounded-br-md" />
                    </div>
                    <div className="pointer-events-none absolute bottom-2 inset-x-3 text-center">
                      <span className="inline-block px-2.5 py-1 rounded bg-slate-950/80 text-[11px] font-medium text-sky-300 border border-sky-500/30">
                        Đưa khuôn mặt vào chính giữa khung
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                    <img
                      src={displayAvatar}
                      alt={staff.fullName}
                      className="w-40 h-40 rounded-full object-cover border-4 border-slate-700 shadow-lg"
                    />
                    {enrolledNow && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>
                          Mẫu sinh trắc sẵn sàng
                          {qualityScore ? ` (${qualityScore}%)` : ''}
                        </span>
                      </div>
                    )}
                    {!enrolledNow && (
                      <p className="mt-3 text-[11px] text-slate-400 text-center">
                        Mở camera chụp trực tiếp hoặc tải ảnh chân dung rõ mặt.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-700/50 text-rose-200 text-xs">
                  {cameraError}
                </div>
              )}
            </div>

            {/* Right: Actions & Instructions */}
            <div className="md:col-span-6 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Chọn Phương Thức Cài Đặt
              </div>

              {!cameraActive ? (
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  disabled={processing}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-sky-900/30"
                >
                  <Camera className="w-4 h-4" />
                  <span>Mở Camera Chụp Khuôn Mặt</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleCaptureFromCamera}
                    disabled={processing}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ScanFace className="w-4 h-4" />
                    <span>{processing ? 'Đang phân tích...' : 'Chụp & Trích Xuất Khuôn Mặt'}</span>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextMode = facingMode === 'user' ? 'environment' : 'user';
                        setFacingMode(nextMode);
                        startCamera(nextMode);
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
                      Tắt Camera
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
                  <span>Xóa Mẫu Khuôn Mặt</span>
                </button>
              )}

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 space-y-1 leading-relaxed">
                <div className="font-bold text-slate-200">Lưu ý đồng bộ & chấm công:</div>
                <p>• Dữ liệu khuôn mặt sau khi lưu sẽ tự đồng bộ lên hệ thống để trạm QRCODE nhận diện.</p>
                <p>• Khi quét khuôn mặt thành công, giờ Vào / Ra tự động ghi vào cột Khuôn mặt.</p>
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
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-950/80 border-t border-slate-800">
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
            <span>Lưu & Đồng Bộ Hệ Thống</span>
          </button>
        </div>
      </div>
    </div>
  );
};
