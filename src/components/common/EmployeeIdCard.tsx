import React, { useRef, useState } from 'react';
import QRCode from 'qrcode';
import { StaffRecord } from '../../types';
import {
  buildStaffQrUrl,
  isStaffQrEnabled,
} from '../../lib/staffQr';
import { compressAvatarImageFile } from '../../lib/avatarUtils';
import { EmployeeQRCodeSvg } from './EmployeeQRModal';
import {
  Camera,
  Printer,
  BadgeCheck,
  Download,
  X,
  QrCode,
  Loader2,
  User,
  Key,
} from 'lucide-react';

export function formatStaffDeptLabel(dept?: string): string {
  const clean = (dept || 'MULTI').trim().toUpperCase();
  if (clean === 'MULTI' || clean === 'MULTI AUTO') return 'MULTI AUTO';
  if (clean === 'HR' || clean === 'HC & NS' || clean === 'HC-NS') return 'HC & NS';
  return clean;
}

function escapeHtml(raw: string): string {
  return (raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildInitialsAvatarDataUrl(fullName: string): string {
  const letter = (fullName || 'N').trim().charAt(0).toUpperCase() || 'N';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300">
    <rect width="240" height="300" fill="#0f172a"/>
    <circle cx="120" cy="112" r="46" fill="#1e293b" stroke="#0891b2" stroke-width="3"/>
    <text x="120" y="128" text-anchor="middle" fill="#67e8f9" font-family="Arial, sans-serif" font-size="48" font-weight="800">${escapeHtml(letter)}</text>
    <path d="M52 252 C52 204 82 182 120 182 C158 182 188 204 188 252" fill="#1e293b" stroke="#0891b2" stroke-width="3"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const COMPANY_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="28" height="28">
  <rect width="64" height="64" rx="14" fill="#020617" stroke="#0891b2" stroke-width="3"/>
  <path d="M18 46 V18 L31 37 L44 18 V46" fill="none" stroke="#22d3ee" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="48" cy="46" r="3.5" fill="#22d3ee"/>
</svg>`;

export async function printEmployeeIdCard(staff: StaffRecord): Promise<void> {
  if (typeof document === 'undefined') return;

  const qrUrl = buildStaffQrUrl(staff);
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 320,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
    });
  } catch {
    qrDataUrl = '';
  }

  const avatarSrc = staff.avatarUrl?.trim()
    ? staff.avatarUrl
    : buildInitialsAvatarDataUrl(staff.fullName);
  const deptLabel = formatStaffDeptLabel(staff.department);
  const issuedBadgeText = staff.badgeIssued
    ? `ĐÃ CẤP THẺ ĐEO${staff.badgeIssuedAt ? ` · ${staff.badgeIssuedAt}` : ''}`
    : 'THẺ NHÂN VIÊN CHÍNH THỨC';

  let printRoot = document.getElementById('employee-id-card-print-root');
  if (!printRoot) {
    printRoot = document.createElement('div');
    printRoot.id = 'employee-id-card-print-root';
    document.body.appendChild(printRoot);
  }

  printRoot.innerHTML = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; display: flex; flex-direction: column; align-items: center; gap: 14px;">
      <div style="
        width: 310px;
        border: 2px solid #0e7490;
        border-radius: 16px;
        background: #ffffff;
        color: #0f172a;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(2,6,23,0.12);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      ">
        <!-- Lanyard punch hole guide -->
        <div style="display:flex; justify-content:center; padding-top:10px; background:#0f172a;">
          <div style="width:42px; height:8px; border-radius:999px; background:#ffffff; border:1px solid #475569;"></div>
        </div>

        <!-- Company Header -->
        <div style="display:flex; align-items:center; gap:8px; padding:10px 14px 10px; background:#0f172a; color:#ffffff; border-bottom:2px solid #06b6d4;">
          <div style="width:26px; height:26px; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
            ${COMPANY_LOGO_SVG}
          </div>
          <div style="min-width:0;">
            <div style="font-size:10px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#f8fafc; line-height:1.2;">
              CÔNG TY TNHH NEWPROTEC VINA
            </div>
            <div style="font-size:8px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#22d3ee; margin-top:1px;">
              THẺ NHÂN VIÊN · EMPLOYEE ID CARD
            </div>
          </div>
        </div>

        <!-- Middle 2 boxes: Left Avatar, Right QR -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:14px 14px 10px; align-items:stretch; background:#f8fafc;">
          <div style="aspect-ratio:3/4; border:1.5px solid #cbd5e1; border-radius:10px; overflow:hidden; background:#0f172a; display:flex; align-items:center; justify-content:center;">
            <img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(staff.fullName)}" style="width:100%; height:100%; object-fit:cover; display:block;" />
          </div>
          <div style="aspect-ratio:3/4; border:1.5px solid #cbd5e1; border-radius:10px; background:#ffffff; padding:6px; display:flex; flex-direction:column; align-items:center; justify-content:center;">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR ${escapeHtml(staff.employeeId)}" style="width:100%; height:auto; max-height:108px; object-fit:contain; display:block;" />` : ''}
            <div style="font-size:7.5px; font-family:monospace; font-weight:700; color:#334155; margin-top:4px; text-align:center;">
              QUÉT MÃ QR
            </div>
          </div>
        </div>

        <!-- Bottom Employee Info -->
        <div style="padding:10px 14px 12px; background:#ffffff; border-top:1px solid #e2e8f0; text-align:left;">
          <div style="font-size:15px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.02em; text-align:center; margin-bottom:8px;">
            ${escapeHtml(staff.fullName)}
          </div>
          <div style="display:flex; justify-content:space-between; font-size:10.5px; padding:3px 0; border-bottom:1px dashed #e2e8f0;">
            <span style="color:#64748b; font-weight:600;">Mã nhân viên:</span>
            <span style="font-family:monospace; font-weight:800; color:#0e7490;">${escapeHtml(staff.employeeId)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:10.5px; padding:3px 0; border-bottom:1px dashed #e2e8f0;">
            <span style="color:#64748b; font-weight:600;">Bộ phận:</span>
            <span style="font-weight:700; color:#0f172a;">${escapeHtml(deptLabel)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:10.5px; padding:3px 0;">
            <span style="color:#64748b; font-weight:600;">Chức vụ:</span>
            <span style="font-weight:700; color:#0f172a;">${escapeHtml(staff.position || 'Nhân viên')}</span>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#0f172a; color:#67e8f9; font-size:8px; font-family:monospace; font-weight:700; text-align:center; padding:6px 10px; letter-spacing:0.08em; text-transform:uppercase;">
          ${escapeHtml(issuedBadgeText)}
        </div>
      </div>
      <div style="font-size:10px; color:#64748b; font-family:monospace;">
        Cắt theo viền ngoài để lồng vào vỏ thẻ đeo nhân viên (CR80 / Thẻ đứng)
      </div>
    </div>
  `;

  const cleanup = () => {
    document.body.classList.remove('printing-employee-id-card');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  document.body.classList.add('printing-employee-id-card');

  window.setTimeout(() => {
    window.print();
    window.setTimeout(cleanup, 1200);
  }, 150);
}

export async function downloadEmployeeIdCardPng(staff: StaffRecord): Promise<void> {
  const qrUrl = buildStaffQrUrl(staff);
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 380,
    color: { dark: '#020617', light: '#ffffff' },
  });

  const canvas = document.createElement('canvas');
  canvas.width = 680;
  canvas.height = 1040;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background card
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(14, 14, canvas.width - 28, canvas.height - 28, 30);
  ctx.stroke();

  // Header band
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.roundRect(17, 17, canvas.width - 34, 130, [26, 26, 0, 0]);
  ctx.fill();

  // Lanyard slot
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(canvas.width / 2 - 48, 30, 96, 14, 7);
  ctx.fill();

  // Small NP Logo
  ctx.fillStyle = '#0891b2';
  ctx.beginPath();
  ctx.roundRect(42, 62, 54, 54, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NP', 69, 98);

  // Company Title (small clean typography)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText('CÔNG TY TNHH NEWPROTEC VINA', 112, 86);
  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('THẺ NHÂN VIÊN · EMPLOYEE CARD', 112, 114);

  // Divider line
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(17, 147, canvas.width - 34, 3);

  // Left box: Avatar
  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const leftX = 42;
  const boxY = 186;
  const boxW = 282;
  const boxH = 376;

  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(leftX, boxY, boxW, boxH, 18);
  ctx.fill();
  ctx.stroke();

  try {
    const avSrc = staff.avatarUrl?.trim()
      ? staff.avatarUrl
      : buildInitialsAvatarDataUrl(staff.fullName);
    const avImg = await loadImage(avSrc);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(leftX + 3, boxY + 3, boxW - 6, boxH - 6, 15);
    ctx.clip();
    const scale = Math.max((boxW - 6) / avImg.width, (boxH - 6) / avImg.height);
    const drawW = avImg.width * scale;
    const drawH = avImg.height * scale;
    ctx.drawImage(
      avImg,
      leftX + (boxW - drawW) / 2,
      boxY + (boxH - drawH) / 2,
      drawW,
      drawH
    );
    ctx.restore();
  } catch {
    ctx.fillStyle = '#67e8f9';
    ctx.font = 'bold 84px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(staff.fullName.charAt(0).toUpperCase(), leftX + boxW / 2, boxY + 210);
  }

  // Right box: QR
  const rightX = 356;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(rightX, boxY, boxW, boxH, 18);
  ctx.fill();

  try {
    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, rightX + 20, boxY + 52, boxW - 40, boxW - 40);
  } catch {
    // ignore
  }
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('MÃ QR NHÂN VIÊN', rightX + boxW / 2, boxY + boxH - 28);

  // Employee Name & Details Section
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(staff.fullName.toUpperCase(), canvas.width / 2, 636);

  const infoRows: [string, string][] = [
    ['MÃ NHÂN VIÊN', staff.employeeId],
    ['BỘ PHẬN', formatStaffDeptLabel(staff.department)],
    ['CHỨC VỤ', staff.position || 'Nhân viên'],
  ];

  let y = 696;
  infoRows.forEach(([label, val]) => {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(42, y - 34, canvas.width - 84, 54, 12);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(label, 64, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 21px monospace';
    ctx.fillText(val, canvas.width - 64, y);
    y += 72;
  });

  // Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = staff.badgeIssued ? '#34d399' : '#94a3b8';
  ctx.font = 'bold 17px monospace';
  ctx.fillText(
    staff.badgeIssued
      ? `ĐÃ CẤP THẺ ĐEO${staff.badgeIssuedAt ? ` (${staff.badgeIssuedAt})` : ''}`
      : 'THẺ NHÂN VIÊN NEWPROTEC VINA',
    canvas.width / 2,
    982
  );

  const pngUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = pngUrl;
  a.download = `The-Nhan-Vien-${staff.employeeId}-${staff.fullName.replace(/\s+/g, '_')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

interface EmployeeIdCardProps {
  staff: StaffRecord;
  allowAvatarEdit?: boolean;
  onUpdateAvatar?: (avatarDataUrl: string) => void;
  onClickQr?: () => void;
  compact?: boolean;
  highlightBadge?: string;
}

export const EmployeeIdCard: React.FC<EmployeeIdCardProps> = ({
  staff,
  allowAvatarEdit = false,
  onUpdateAvatar,
  onClickQr,
  compact = false,
  highlightBadge,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const qrUrl = buildStaffQrUrl(staff);
  const qrEnabled = isStaffQrEnabled(staff);
  const deptLabel = formatStaffDeptLabel(staff.department);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUpdateAvatar) return;

    setIsUploading(true);
    setAvatarError(false);
    try {
      const compressed = await compressAvatarImageFile(file);
      onUpdateAvatar(compressed);
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-cyan-500/45 bg-gradient-to-b from-slate-900 via-[#0a152a] to-slate-950 shadow-xl overflow-hidden text-slate-100 select-none">
      {/* Top: Logo công ty + tên công ty (chữ nhỏ) */}
      <div className="px-3 py-2 bg-slate-950/95 border-b border-cyan-500/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/icon.svg"
            alt="Logo Newprotec Vina"
            className="w-5 h-5 rounded object-contain shrink-0 bg-slate-900 border border-cyan-500/30"
          />
          <div className="min-w-0">
            <div className="text-[9px] font-extrabold tracking-wider text-white uppercase leading-tight truncate">
              CÔNG TY TNHH NEWPROTEC VINA
            </div>
            <div className="text-[8px] font-mono font-semibold text-cyan-400 tracking-widest uppercase leading-tight">
              THẺ NHÂN VIÊN
            </div>
          </div>
        </div>
        {highlightBadge ? (
          <span className="text-[9px] font-mono font-bold text-emerald-300 uppercase shrink-0">
            {highlightBadge}
          </span>
        ) : (
          <span
            className={`text-[8.5px] font-mono font-bold uppercase shrink-0 ${
              staff.badgeIssued ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            {staff.badgeIssued ? 'Đã cấp thẻ' : 'Chưa cấp'}
          </span>
        )}
      </div>

      {/* Middle: Chia làm 2 ô — Trái: Ảnh đại diện (cập nhật ảnh), Phải: Mã QR */}
      <div className={compact ? 'p-2.5 space-y-2.5' : 'p-3 space-y-3'}>
        <div className="grid grid-cols-2 gap-2.5 items-stretch">
          {/* Left Box: Avatar */}
          <div className="relative aspect-[3/4] rounded-lg border border-slate-700/90 bg-slate-900 overflow-hidden flex items-center justify-center group">
            {staff.avatarUrl && !avatarError ? (
              <img
                src={staff.avatarUrl}
                alt={`Ảnh thẻ ${staff.fullName}`}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-950 text-cyan-300 p-2">
                <div className="w-11 h-11 rounded-full bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-lg font-extrabold">
                  {staff.fullName?.trim().charAt(0)?.toUpperCase() || <User className="w-5 h-5" />}
                </div>
                <span className="mt-1.5 text-[9px] text-slate-400 font-medium text-center">
                  Ảnh 3x4
                </span>
              </div>
            )}

            {allowAvatarEdit && onUpdateAvatar && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute inset-x-0 bottom-0 py-1.5 px-2 bg-slate-950/85 hover:bg-cyan-700/90 border-t border-slate-700/80 text-[9px] font-bold text-cyan-200 hover:text-white flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Tải lên hoặc cập nhật ảnh đại diện trên thẻ"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Đang xử lý</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3 h-3 text-cyan-400" />
                      <span>Cập nhật ảnh</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </>
            )}
          </div>

          {/* Right Box: QR Code */}
          {onClickQr ? (
            <button
              type="button"
              onClick={onClickQr}
              title="Nhấn để phóng to hoặc quản lý mã QR"
              className={`aspect-[3/4] rounded-lg bg-white p-1.5 flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                qrEnabled
                  ? 'border-cyan-400/50 hover:ring-2 hover:ring-cyan-400'
                  : 'border-rose-400/60 opacity-85'
              }`}
            >
              <div className="w-full flex items-center justify-center">
                <EmployeeQRCodeSvg
                  staff={staff}
                  value={qrUrl}
                  size={compact ? 92 : 104}
                  theme="newprotec"
                />
              </div>
              <span className="text-[8px] font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-0.5">
                <QrCode className="w-2.5 h-2.5 text-cyan-700" />
                <span>{qrEnabled ? 'QR THẺ NV' : 'QR ĐÃ KHÓA'}</span>
              </span>
            </button>
          ) : (
            <div
              className={`aspect-[3/4] rounded-lg bg-white p-1.5 flex flex-col items-center justify-center gap-1 border ${
                qrEnabled ? 'border-cyan-400/50' : 'border-rose-400/60 opacity-85'
              }`}
            >
              <div className="w-full flex items-center justify-center">
                <EmployeeQRCodeSvg
                  staff={staff}
                  value={qrUrl}
                  size={compact ? 92 : 104}
                  theme="newprotec"
                />
              </div>
              <span className="text-[8px] font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-0.5">
                <QrCode className="w-2.5 h-2.5 text-cyan-700" />
                <span>{qrEnabled ? 'QR THẺ NV' : 'QR ĐÃ KHÓA'}</span>
              </span>
            </div>
          )}
        </div>

        {/* Bottom: Tên nhân viên, Mã nhân viên, Bộ phận, Chức vụ */}
        <div className="pt-2 border-t border-slate-800/90 space-y-1.5 text-xs">
          <div className="text-center">
            <div
              className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wide truncate"
              title={staff.fullName}
            >
              {staff.fullName}
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] bg-slate-950/75 border border-slate-800/80 rounded-lg px-2.5 py-2">
            <span className="text-slate-400 font-medium">Mã NV:</span>
            <span className="text-right font-mono font-bold text-cyan-300 tabular-nums">
              {staff.employeeId}
            </span>

            <span className="text-slate-400 font-medium">Bộ phận:</span>
            <span className="text-right font-bold text-slate-100 uppercase truncate">
              {deptLabel}
            </span>

            <span className="text-slate-400 font-medium">Chức vụ:</span>
            <span className="text-right font-semibold text-slate-200 truncate" title={staff.position}>
              {staff.position || 'Nhân viên'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EmployeeIdCardModalProps {
  staff: StaffRecord | null;
  onClose: () => void;
  allowAvatarEdit?: boolean;
  canManageBadge?: boolean;
  onUpdateStaff?: (updated: StaffRecord) => void;
  onOpenQrDetail?: (staff: StaffRecord) => void;
}

export const EmployeeIdCardModal: React.FC<EmployeeIdCardModalProps> = ({
  staff,
  onClose,
  allowAvatarEdit = false,
  canManageBadge = false,
  onUpdateStaff,
  onOpenQrDetail,
}) => {
  if (!staff) return null;

  const handleToggleIssued = () => {
    if (!onUpdateStaff) return;
    const nextIssued = !staff.badgeIssued;
    onUpdateStaff({
      ...staff,
      badgeIssued: nextIssued,
      badgeIssuedAt: nextIssued ? new Date().toLocaleDateString('vi-VN') : undefined,
      qrAccessEnabled: nextIssued ? true : staff.qrAccessEnabled,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[115] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-sm p-4 sm:p-5 shadow-2xl text-slate-100 space-y-4 max-h-[92dvh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              Thẻ Nhân Viên
            </h3>
            <p className="text-[11px] text-slate-400">
              {staff.fullName} · {staff.employeeId}
            </p>
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

        <EmployeeIdCard
          staff={staff}
          allowAvatarEdit={allowAvatarEdit && Boolean(onUpdateStaff)}
          onUpdateAvatar={(avatarUrl) => {
            if (onUpdateStaff) {
              onUpdateStaff({ ...staff, avatarUrl });
            }
          }}
          onClickQr={onOpenQrDetail ? () => onOpenQrDetail(staff) : undefined}
        />

        {staff.badgeIssued && (
          <div className="px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-700/50 text-emerald-200 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Đã cấp thẻ đeo</span>
            </span>
            {staff.badgeIssuedAt && (
              <span className="text-[11px] font-mono text-emerald-300">{staff.badgeIssuedAt}</span>
            )}
          </div>
        )}

        {/* Security PIN Management Section */}
        <SecurityPinManager staff={staff} onUpdateStaff={onUpdateStaff} />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => printEmployeeIdCard(staff)}
            className="py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In thẻ</span>
          </button>

          <button
            type="button"
            onClick={() => downloadEmployeeIdCardPng(staff)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tải PNG</span>
          </button>

          {canManageBadge && onUpdateStaff && (
            <button
              type="button"
              onClick={handleToggleIssued}
              className={`col-span-2 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                staff.badgeIssued
                  ? 'bg-emerald-950/60 hover:bg-emerald-900/70 border-emerald-600/60 text-emerald-300'
                  : 'bg-amber-600/20 hover:bg-amber-600/35 border-amber-500/60 text-amber-200'
              }`}
            >
              <BadgeCheck className="w-4 h-4" />
              <span>
                {staff.badgeIssued ? 'Đã cấp thẻ đeo (Nhấn để thu hồi)' : 'Xác nhận cấp thẻ đeo'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SecurityPinManager: React.FC<{ staff: StaffRecord; onUpdateStaff?: (updated: StaffRecord) => void }> = ({
  staff,
  onUpdateStaff,
}) => {
  const [pinValue, setPinValue] = useState(staff.securityPin || '123');
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [pinMsg, setPinMsg] = useState('');

  const currentPin = staff.securityPin || '123';

  return (
    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mã bảo mật quét QR (PIN)</span>
        </span>
        <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-700/50">
          {currentPin}
        </span>
      </div>
      <div className="text-[11px] text-slate-400">
        Dùng để xác thực khi quét mã QR trên thẻ nhân viên. Mặc định lần đầu là <strong className="text-white">123</strong>.
      </div>
      {isEditingPin ? (
        <div className="space-y-2 pt-1">
          <input
            type="text"
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value)}
            placeholder="Nhập mã PIN mới (VD: 4567)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const cleanPin = pinValue.trim();
                if (!cleanPin) {
                  setPinMsg('Mã PIN không được để trống.');
                  return;
                }
                if (onUpdateStaff) {
                  onUpdateStaff({ ...staff, securityPin: cleanPin });
                  setPinMsg('Đã lưu mã bảo mật mới!');
                  setIsEditingPin(false);
                }
              }}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => {
                setPinValue(currentPin);
                setIsEditingPin(false);
                setPinMsg('');
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
            >
              Hủy
            </button>
          </div>
          {pinMsg && <div className="text-[10px] text-cyan-400">{pinMsg}</div>}
        </div>
      ) : (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-cyan-400">{pinMsg || ''}</span>
          {onUpdateStaff && (
            <button
              type="button"
              onClick={() => {
                setPinValue(currentPin);
                setIsEditingPin(true);
                setPinMsg('');
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline"
            >
              Đổi mã bảo mật
            </button>
          )}
        </div>
      )}
    </div>
  );
};

