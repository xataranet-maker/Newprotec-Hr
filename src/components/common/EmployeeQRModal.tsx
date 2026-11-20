import React, { useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { StaffRecord } from '../../types';
import {
  buildStaffQrUrl,
  getPreferredAppOrigin,
  getStaffQrToken,
  isStaffQrEnabled,
  SHARED_APP_BASE_URL,
} from '../../lib/staffQr';
import { QRTheme } from './AppQRModal';
import {
  QrCode,
  X,
  Download,
  Copy,
  Check,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Image as ImageIcon,
  Link2,
  Smartphone,
  Sparkles,
} from 'lucide-react';

interface EmployeeQRCodeSvgProps {
  staff: StaffRecord;
  value: string;
  size?: number;
  theme?: QRTheme;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

function splitEmployeeNameForBadge(rawName: string): string[] {
  const clean = (rawName || 'NHÂN VIÊN').trim().toUpperCase();
  if (clean.length <= 12) return [clean];
  const words = clean.split(/\s+/);
  if (words.length <= 1) return [clean];

  let bestIdx = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(' ');
    const line2 = words.slice(i).join(' ');
    const diff = Math.abs(line1.length - line2.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return [words.slice(0, bestIdx).join(' '), words.slice(bestIdx).join(' ')];
}

export const EmployeeQRCodeSvg: React.FC<EmployeeQRCodeSvgProps> = ({
  staff,
  value,
  size = 260,
  theme = 'newprotec',
  svgRef,
}) => {
  const qrMatrix = useMemo(() => {
    const qr = QRCode.create(value.trim() || buildStaffQrUrl(staff), {
      errorCorrectionLevel: 'H',
    });
    return qr.modules;
  }, [value, staff]);

  const moduleCount = qrMatrix.size;
  const quietZone = 3;
  const totalUnits = moduleCount + quietZone * 2;
  const centerUnit = totalUnits / 2;

  const nameLines = useMemo(() => splitEmployeeNameForBadge(staff.fullName), [staff.fullName]);
  const maxLineChars = Math.max(...nameLines.map((l) => l.length), 6);

  // Compact horizontal center badge (~8-10% total QR area, safely within 30% ECC Level H tolerance)
  const badgeHalfWidth = Math.min(moduleCount * 0.255, Math.max(moduleCount * 0.19, maxLineChars * 0.62 + 1.8));
  const badgeHalfHeight = nameLines.length > 1 ? 3.55 : 2.9;

  const isFinderRegion = (r: number, c: number) => {
    const inTopLeft = r < 7 && c < 7;
    const inTopRight = r < 7 && c >= moduleCount - 7;
    const inBottomLeft = r >= moduleCount - 7 && c < 7;
    return inTopLeft || inTopRight || inBottomLeft;
  };

  const isInsideNameCutout = (r: number, c: number) => {
    const cx = c + quietZone + 0.5;
    const cy = r + quietZone + 0.5;
    const dx = Math.abs(cx - centerUnit);
    const dy = Math.abs(cy - centerUnit);
    return dx < badgeHalfWidth + 0.55 && dy < badgeHalfHeight + 0.55;
  };

  const isTimingPattern = (r: number, c: number) => {
    return (
      (r === 6 && c >= 8 && c <= moduleCount - 9) ||
      (c === 6 && r >= 8 && r <= moduleCount - 9)
    );
  };

  const palette = useMemo(() => {
    if (theme === 'classic') {
      return {
        bg: '#ffffff',
        dot: '#000000',
        dotAlt: '#000000',
        finderOuter: '#000000',
        finderInner: '#000000',
        badgeBg: '#000000',
        badgeBorder: '#000000',
        textColor: '#ffffff',
      };
    }
    if (theme === 'industrial') {
      return {
        bg: '#ffffff',
        dot: '#0c4a6e',
        dotAlt: '#0369a1',
        finderOuter: '#020617',
        finderInner: '#0284c7',
        badgeBg: '#020617',
        badgeBorder: '#0ea5e9',
        textColor: '#e0f2fe',
      };
    }
    return {
      bg: '#ffffff',
      dot: '#020617',
      dotAlt: '#0369a1',
      finderOuter: '#020617',
      finderInner: '#0891b2',
      badgeBg: '#020617',
      badgeBorder: '#06b6d4',
      textColor: '#ffffff',
    };
  }, [theme]);

  const dots: React.ReactNode[] = [];
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!qrMatrix.get(r, c)) continue;
      if (isFinderRegion(r, c)) continue;
      if (isInsideNameCutout(r, c)) continue;

      const cx = c + quietZone + 0.5;
      const cy = r + quietZone + 0.5;
      const isTiming = isTimingPattern(r, c);
      const fill = isTiming && theme !== 'classic' ? palette.dotAlt : palette.dot;
      const radius = isTiming && theme === 'newprotec' ? 0.38 : 0.42;

      dots.push(<circle key={`d-${r}-${c}`} cx={cx} cy={cy} r={radius} fill={fill} />);
    }
  }

  const renderFinderEye = (originX: number, originY: number, key: string) => {
    const x = originX + quietZone;
    const y = originY + quietZone;
    return (
      <g key={key}>
        <rect
          x={x + 0.5}
          y={y + 0.5}
          width={6}
          height={6}
          rx={1.55}
          ry={1.55}
          fill="none"
          stroke={palette.finderOuter}
          strokeWidth={1}
        />
        <rect
          x={x + 2}
          y={y + 2}
          width={3}
          height={3}
          rx={0.85}
          ry={0.85}
          fill={palette.finderInner}
        />
      </g>
    );
  };

  // Auto-fit font size inside center badge
  const availableTextWidth = badgeHalfWidth * 2 - 2.2;
  const computedFontSize = Math.min(
    nameLines.length > 1 ? 1.85 : 2.25,
    availableTextWidth / Math.max(maxLineChars * 0.63, 1)
  );

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${totalUnits} ${totalUnits}`}
      width={size}
      height={size}
      className="block select-none"
      role="img"
      aria-label={`Mã QR hồ sơ nhân viên ${staff.fullName} (${staff.employeeId})`}
    >
      <rect x={0} y={0} width={totalUnits} height={totalUnits} rx={2.2} fill={palette.bg} />

      {renderFinderEye(0, 0, 'finder-tl')}
      {renderFinderEye(moduleCount - 7, 0, 'finder-tr')}
      {renderFinderEye(0, moduleCount - 7, 'finder-bl')}

      <g>{dots}</g>

      {/* Clean White Halo around Name Badge */}
      <rect
        x={centerUnit - badgeHalfWidth - 0.55}
        y={centerUnit - badgeHalfHeight - 0.55}
        width={(badgeHalfWidth + 0.55) * 2}
        height={(badgeHalfHeight + 0.55) * 2}
        rx={2.1}
        fill={palette.bg}
      />

      {/* Center Name Badge (Employee Full Name) */}
      <rect
        x={centerUnit - badgeHalfWidth}
        y={centerUnit - badgeHalfHeight}
        width={badgeHalfWidth * 2}
        height={badgeHalfHeight * 2}
        rx={1.65}
        fill={palette.badgeBg}
        stroke={palette.badgeBorder}
        strokeWidth={0.42}
      />

      {nameLines.length === 1 ? (
        <text
          x={centerUnit}
          y={centerUnit}
          textAnchor="middle"
          dominantBaseline="central"
          fill={palette.textColor}
          fontSize={computedFontSize}
          fontWeight="800"
          fontFamily="Plus Jakarta Sans, Arial, sans-serif"
          letterSpacing="0.04"
        >
          {nameLines[0]}
        </text>
      ) : (
        <>
          <text
            x={centerUnit}
            y={centerUnit - computedFontSize * 0.62}
            textAnchor="middle"
            dominantBaseline="central"
            fill={palette.textColor}
            fontSize={computedFontSize}
            fontWeight="800"
            fontFamily="Plus Jakarta Sans, Arial, sans-serif"
            letterSpacing="0.03"
          >
            {nameLines[0]}
          </text>
          <text
            x={centerUnit}
            y={centerUnit + computedFontSize * 0.66}
            textAnchor="middle"
            dominantBaseline="central"
            fill={palette.textColor}
            fontSize={computedFontSize}
            fontWeight="800"
            fontFamily="Plus Jakarta Sans, Arial, sans-serif"
            letterSpacing="0.03"
          >
            {nameLines[1]}
          </text>
        </>
      )}
    </svg>
  );
};

interface EmployeeQRModalProps {
  staff: StaffRecord | null;
  onClose: () => void;
  canManage?: boolean;
  onToggleQrAccess?: (staff: StaffRecord, enabled: boolean) => void;
  onRegenerateQrToken?: (staff: StaffRecord) => void;
}

export const EmployeeQRModal: React.FC<EmployeeQRModalProps> = ({
  staff,
  onClose,
  canManage = false,
  onToggleQrAccess,
  onRegenerateQrToken,
}) => {
  const [theme, setTheme] = useState<QRTheme>('newprotec');
  const [baseMode, setBaseMode] = useState<'AUTO' | 'SHARED'>('AUTO');
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (!staff) return null;

  const qrEnabled = isStaffQrEnabled(staff);
  const token = getStaffQrToken(staff);
  const targetOrigin =
    baseMode === 'SHARED' ? SHARED_APP_BASE_URL : getPreferredAppOrigin();
  const qrUrl = buildStaffQrUrl(staff, targetOrigin);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgRef.current);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-${staff.employeeId}-${staff.fullName.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = (withEmployeeCard: boolean) => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgRef.current);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (withEmployeeCard) {
        canvas.width = 1000;
        canvas.height = 1340;

        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.roundRect(28, 28, canvas.width - 56, canvas.height - 56, 44);
        ctx.stroke();

        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 26px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NEWPROTEC VINA · THẺ HỒ SƠ QR', canvas.width / 2, 95);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px sans-serif';
        ctx.fillText(staff.fullName.toUpperCase(), canvas.width / 2, 162);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 26px monospace';
        const deptLabel = staff.department === 'HR' ? 'HC & NS' : staff.department || 'MULTI AUTO';
        ctx.fillText(
          `MÃ NV: ${staff.employeeId}  ·  ${deptLabel}  ·  ${staff.shift === 'NIGHT' ? 'CA ĐÊM' : 'CA NGÀY'}`,
          canvas.width / 2,
          212
        );

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(100, 260, 800, 800, 42);
        ctx.fill();

        ctx.drawImage(img, 120, 280, 760, 760);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 28px sans-serif';
        ctx.fillText('Quét mã QR để xem hồ sơ & chấm công cá nhân', canvas.width / 2, 1150);

        ctx.fillStyle = qrEnabled ? '#34d399' : '#fb7185';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(
          qrEnabled ? 'TRẠNG THÁI: ĐANG CẤP QUYỀN TRUY CẬP' : 'TRẠNG THÁI: ĐÃ TẠM KHÓA QR',
          canvas.width / 2,
          1210
        );
      } else {
        canvas.width = 1024;
        canvas.height = 1024;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.drawImage(img, 0, 0, 1024, 1024);
      }

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = withEmployeeCard
        ? `The-QR-${staff.employeeId}-${staff.fullName.replace(/\s+/g, '_')}.png`
        : `QR-${staff.employeeId}-${staff.fullName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 max-h-[92dvh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Mã QR Hồ Sơ Nhân Viên</span>
              </h3>
              <p className="text-xs text-slate-400">
                <strong className="text-cyan-300">{staff.fullName}</strong> · Mã:{' '}
                <span className="font-mono">{staff.employeeId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission Status & Control */}
        <div
          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
            qrEnabled
              ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-700/60 text-rose-200'
          }`}
        >
          <div className="flex items-start sm:items-center gap-2">
            {qrEnabled ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <ShieldOff className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div>
              <div className="font-bold">
                {qrEnabled
                  ? 'Đang Cấp Quyền Truy Cập Nhanh (Không Cần Đăng Nhập)'
                  : 'Đã Tắt Quyền Truy Cập Bằng Mã QR'}
              </div>
              <div className="text-[11px] opacity-80">
                {qrEnabled
                  ? 'Quét mã để vào thẳng hồ sơ, bảng công & phiếu phép của nhân viên này.'
                  : 'Khi quét mã này, hệ thống sẽ từ chối truy cập cho tới khi được cấp lại quyền.'}
              </div>
            </div>
          </div>

          {canManage && onToggleQrAccess && (
            <button
              type="button"
              onClick={() => onToggleQrAccess(staff, !qrEnabled)}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] shrink-0 cursor-pointer transition-colors border ${
                qrEnabled
                  ? 'bg-rose-600/90 hover:bg-rose-500 text-white border-rose-500'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
              }`}
            >
              {qrEnabled ? 'Khóa Quyền QR' : 'Cấp Quyền QR'}
            </button>
          )}
        </div>

        {/* QR Code Preview */}
        <div className="flex flex-col items-center">
          <div
            className={`relative p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border shadow-xl ${
              qrEnabled ? 'border-cyan-500/35' : 'border-rose-600/40 opacity-85'
            }`}
          >
            <div className="bg-white p-3 rounded-xl shadow-inner relative">
              <EmployeeQRCodeSvg staff={staff} value={qrUrl} size={248} theme={theme} svgRef={svgRef} />
            </div>
            <div className="mt-3 text-center">
              <div className="text-xs font-bold tracking-wider text-white uppercase">
                {staff.fullName} · {staff.employeeId}
              </div>
              <div className="text-[10px] text-cyan-400 font-mono mt-0.5 flex items-center justify-center gap-1">
                <Smartphone className="w-3 h-3" />
                <span>Quét để vào thẳng hồ sơ nhân viên</span>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Kiểu hiển thị mã QR:</span>
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTheme('newprotec')}
              className={`p-2 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                theme === 'newprotec'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Newprotec
            </button>
            <button
              type="button"
              onClick={() => setTheme('classic')}
              className={`p-2 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                theme === 'classic'
                  ? 'bg-slate-100 text-slate-950 border-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Đen Trắng
            </button>
            <button
              type="button"
              onClick={() => setTheme('industrial')}
              className={`p-2 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                theme === 'industrial'
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Công Nghiệp
            </button>
          </div>
        </div>

        {/* Direct Link & Token Management */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Link truy cập thẳng hồ sơ:</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBaseMode('AUTO')}
                className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
                  baseMode === 'AUTO'
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Link Hiện Tại
              </button>
              <button
                type="button"
                onClick={() => setBaseMode('SHARED')}
                className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
                  baseMode === 'SHARED'
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Link Chia Sẻ
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={qrUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300 font-mono focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Mã xác thực QR: {token}</span>
            {canManage && onRegenerateQrToken && (
              <button
                type="button"
                onClick={() => onRegenerateQrToken(staff)}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-sans font-semibold"
                title="Tạo token QR mới và vô hiệu hóa tất cả mã QR đã in trước đó"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Cấp lại mã QR mới (hủy mã cũ)</span>
              </button>
            )}
          </div>
        </div>

        {/* Download Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => handleDownloadPng(false)}
            className="px-3 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950/40 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Tải QR (PNG)</span>
          </button>

          <button
            type="button"
            onClick={() => handleDownloadPng(true)}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <span>Tải Thẻ NV (PNG)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSvg}
            className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Tải Vector (SVG)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
