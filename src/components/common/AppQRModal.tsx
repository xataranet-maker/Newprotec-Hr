import React, { useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  X,
  Download,
  Copy,
  Check,
  Smartphone,
  Sparkles,
  Image as ImageIcon,
  Link2,
} from 'lucide-react';

export type QRTheme = 'newprotec' | 'classic' | 'industrial';

interface AppQRCodeSvgProps {
  value: string;
  size?: number;
  theme?: QRTheme;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

const SHARED_APP_URL =
  'https://ais-pre-pd7mefhivzxrv2ypqhd7yd-389586521748.asia-southeast1.run.app';

export const AppQRCodeSvg: React.FC<AppQRCodeSvgProps> = ({
  value,
  size = 280,
  theme = 'newprotec',
  svgRef,
}) => {
  const qrMatrix = useMemo(() => {
    const safeVal = value.trim() || SHARED_APP_URL;
    const qr = QRCode.create(safeVal, {
      errorCorrectionLevel: 'H',
    });
    return qr.modules;
  }, [value]);

  const moduleCount = qrMatrix.size;
  const quietZone = 3;
  const totalUnits = moduleCount + quietZone * 2;

  // Center logo cutout zone (~22% width, well inside 30% Error Correction H tolerance)
  const logoRadiusUnits = Math.max(3.6, moduleCount * 0.135);
  const centerUnit = totalUnits / 2;

  const isFinderRegion = (r: number, c: number) => {
    const inTopLeft = r < 7 && c < 7;
    const inTopRight = r < 7 && c >= moduleCount - 7;
    const inBottomLeft = r >= moduleCount - 7 && c < 7;
    return inTopLeft || inTopRight || inBottomLeft;
  };

  const isInsideLogoCutout = (r: number, c: number) => {
    const cx = c + quietZone + 0.5;
    const cy = r + quietZone + 0.5;
    // Rounded-square cutout matching Newprotec icon silhouette
    const dx = Math.abs(cx - centerUnit);
    const dy = Math.abs(cy - centerUnit);
    return dx < logoRadiusUnits && dy < logoRadiusUnits;
  };

  // Alignment pattern helper for subtle distinct accent in Newprotec theme
  const isTimingPattern = (r: number, c: number) => {
    return (r === 6 && c >= 8 && c <= moduleCount - 9) || (c === 6 && r >= 8 && r <= moduleCount - 9);
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
        logoStroke: '#ffffff',
        logoDot: '#ffffff',
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
        logoStroke: '#38bdf8',
        logoDot: '#22d3ee',
      };
    }
    // Default: 'newprotec' signature
    return {
      bg: '#ffffff',
      dot: '#020617',
      dotAlt: '#0369a1',
      finderOuter: '#020617',
      finderInner: '#0891b2',
      badgeBg: '#020617',
      badgeBorder: '#06b6d4',
      logoStroke: 'url(#npQrLogoGrad)',
      logoDot: '#06b6d4',
    };
  }, [theme]);

  const dots: React.ReactNode[] = [];
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!qrMatrix.get(r, c)) continue;
      if (isFinderRegion(r, c)) continue;
      if (isInsideLogoCutout(r, c)) continue;

      const cx = c + quietZone + 0.5;
      const cy = r + quietZone + 0.5;
      const isTiming = isTimingPattern(r, c);
      const fill = isTiming && theme !== 'classic' ? palette.dotAlt : palette.dot;
      // Distinct circular dot modules (like reference Chrome QR) with slight crisp radius
      const radius = isTiming && theme === 'newprotec' ? 0.38 : 0.42;

      dots.push(
        <circle
          key={`d-${r}-${c}`}
          cx={cx}
          cy={cy}
          r={radius}
          fill={fill}
        />
      );
    }
  }

  const renderFinderEye = (originX: number, originY: number, key: string) => {
    const x = originX + quietZone;
    const y = originY + quietZone;
    return (
      <g key={key}>
        {/* Outer rounded square ring */}
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
        {/* Inner solid rounded square */}
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

  // Logo sizing inside the cleared center square
  const badgeHalf = logoRadiusUnits - 0.65;
  const badgeSize = badgeHalf * 2;
  const badgeX = centerUnit - badgeHalf;
  const badgeY = centerUnit - badgeHalf;

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${totalUnits} ${totalUnits}`}
      width={size}
      height={size}
      className="block select-none"
      role="img"
      aria-label={`Mã QR ứng dụng Newprotec Vina cho ${value}`}
    >
      <defs>
        <linearGradient id="npQrLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* Clean White Background */}
      <rect x={0} y={0} width={totalUnits} height={totalUnits} rx={2.2} fill={palette.bg} />

      {/* Three Custom Rounded Finder Patterns */}
      {renderFinderEye(0, 0, 'finder-tl')}
      {renderFinderEye(moduleCount - 7, 0, 'finder-tr')}
      {renderFinderEye(0, moduleCount - 7, 'finder-bl')}

      {/* Circular Data Dots */}
      <g>{dots}</g>

      {/* White Halo behind App Logo */}
      <rect
        x={centerUnit - logoRadiusUnits}
        y={centerUnit - logoRadiusUnits}
        width={logoRadiusUnits * 2}
        height={logoRadiusUnits * 2}
        rx={logoRadiusUnits * 0.42}
        fill={palette.bg}
      />

      {/* Center Newprotec Vina App Logo (replaces center animal) */}
      <g transform={`translate(${badgeX}, ${badgeY}) scale(${badgeSize / 512})`}>
        <rect width="512" height="512" rx="112" fill={palette.badgeBg} />
        {theme !== 'classic' && (
          <rect
            x="22"
            y="22"
            width="468"
            height="468"
            rx="94"
            fill="none"
            stroke={palette.badgeBorder}
            strokeWidth="12"
            strokeDasharray="28 14"
            strokeOpacity="0.85"
          />
        )}
        {/* Newprotec Vina Letter N Logo */}
        <path
          d="M156 370 V142 L356 370 V142"
          fill="none"
          stroke={palette.logoStroke}
          strokeWidth="56"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

interface AppQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppQRModal: React.FC<AppQRModalProps> = ({ isOpen, onClose }) => {
  const defaultOrigin =
    typeof window !== 'undefined' &&
    window.location.origin &&
    !window.location.origin.includes('localhost')
      ? window.location.origin
      : SHARED_APP_URL;

  const [qrUrl, setQrUrl] = useState<string>(defaultOrigin);
  const [theme, setTheme] = useState<QRTheme>('newprotec');
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (!isOpen) return null;

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : SHARED_APP_URL;

  const handleCopyLink = async () => {
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
    a.download = `newprotec-vina-qr-${theme}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = (withCardFrame: boolean) => {
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

      if (withCardFrame) {
        canvas.width = 1080;
        canvas.height = 1320;
        // Dark slate card background
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subtle cyan accent border
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.roundRect(28, 28, canvas.width - 56, canvas.height - 56, 48);
        ctx.stroke();

        // Title header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 46px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NEWPROTEC VINA V2.0', canvas.width / 2, 118);

        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 24px monospace';
        ctx.fillText('SMART MES & HR SYSTEM', canvas.width / 2, 162);

        // White QR container
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(120, 210, 840, 840, 44);
        ctx.fill();

        ctx.drawImage(img, 140, 230, 800, 800);

        // Footer hint
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 28px sans-serif';
        ctx.fillText('Quét mã QR để mở nhanh ứng dụng trên điện thoại', canvas.width / 2, 1140);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px monospace';
        const displayUrl = qrUrl.length > 58 ? `${qrUrl.slice(0, 55)}...` : qrUrl;
        ctx.fillText(displayUrl, canvas.width / 2, 1200);
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
      a.download = withCardFrame
        ? `newprotec-vina-poster-qr-${theme}.png`
        : `newprotec-vina-qr-${theme}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl text-slate-100 space-y-5 max-h-[92dvh] overflow-y-auto custom-scrollbar"
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
                <span>Mã QR Truy Cập Ứng Dụng</span>
              </h3>
              <p className="text-xs text-slate-400">
                Thiết kế chấm tròn đặc trưng &amp; Logo Newprotec Vina ở tâm
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

        {/* QR Code Showcase */}
        <div className="flex flex-col items-center">
          <div className="relative p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 shadow-xl shadow-cyan-950/30">
            <div className="bg-white p-3 rounded-xl shadow-inner">
              <AppQRCodeSvg value={qrUrl} size={248} theme={theme} svgRef={svgRef} />
            </div>
            <div className="mt-3 text-center">
              <div className="text-xs font-bold tracking-wider text-white uppercase">
                NEWPROTEC VINA V2.0
              </div>
              <div className="text-[10px] text-cyan-400 font-mono mt-0.5 flex items-center justify-center gap-1">
                <Smartphone className="w-3 h-3" />
                <span>Mở Camera điện thoại hoặc Zalo để quét</span>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Phong cách nhận diện QR:</span>
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTheme('newprotec')}
              className={`p-2 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                theme === 'newprotec'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div>Newprotec</div>
              <div className="text-[10px] font-normal opacity-75">Navy &amp; Cyan</div>
            </button>
            <button
              type="button"
              onClick={() => setTheme('classic')}
              className={`p-2 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                theme === 'classic'
                  ? 'bg-slate-100 text-slate-950 border-white shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div>Đen Trắng</div>
              <div className="text-[10px] font-normal opacity-75">Tối giản chuẩn</div>
            </button>
            <button
              type="button"
              onClick={() => setTheme('industrial')}
              className={`p-2 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                theme === 'industrial'
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div>Công Nghiệp</div>
              <div className="text-[10px] font-normal opacity-75">Deep Blue</div>
            </button>
          </div>
        </div>

        {/* Target URL Input & Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Đường dẫn mã hóa trong QR:</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQrUrl(SHARED_APP_URL)}
                className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer transition-colors ${
                  qrUrl === SHARED_APP_URL
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Link Chính Thức
              </button>
              <button
                type="button"
                onClick={() => setQrUrl(`${currentOrigin}?catalog=1`)}
                className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer transition-colors ${
                  qrUrl === `${currentOrigin}?catalog=1`
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Link Catalog Công Khai
              </button>
              {currentOrigin !== SHARED_APP_URL && (
                <button
                  type="button"
                  onClick={() => setQrUrl(currentOrigin)}
                  className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer transition-colors ${
                    qrUrl === currentOrigin
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Link Hiện Tại
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Sao chép đường dẫn"
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
            <span>Tải Thẻ In (PNG)</span>
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
