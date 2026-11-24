import React from 'react';
import { Power, QrCode, ScanFace, ScanLine, Clock, CalendarDays } from 'lucide-react';

interface KioskCircuitScreensaverProps {
  now: Date;
  activeMode: 'QR' | 'FACE';
  onDismiss: (targetMode?: 'QR' | 'FACE') => void;
}

const PCB_PATHS: Array<{
  d: string;
  color: string;
  animClass: string;
  delay?: string;
  width?: number;
}> = [
  // Top-Left quadrant traces radiating from center core (800, 450)
  {
    d: 'M 710 385 L 620 385 L 550 315 L 380 315 L 310 245 L 120 245 L 60 185',
    color: '#22d3ee',
    animClass: 'animate-pcb-flow',
    delay: '0s',
    width: 3,
  },
  {
    d: 'M 730 355 L 670 295 L 670 180 L 580 90 L 340 90 L 270 20',
    color: '#10b981',
    animClass: 'animate-pcb-flow-fast',
    delay: '0.6s',
    width: 2.5,
  },
  {
    d: 'M 695 425 L 520 425 L 450 355 L 250 355 L 190 415 L 40 415',
    color: '#38bdf8',
    animClass: 'animate-pcb-flow-reverse',
    delay: '1.1s',
    width: 3,
  },
  {
    d: 'M 760 340 L 760 220 L 700 160 L 700 40',
    color: '#a855f7',
    animClass: 'animate-pcb-flow',
    delay: '1.5s',
    width: 2.5,
  },

  // Top-Right quadrant traces
  {
    d: 'M 890 385 L 980 385 L 1050 315 L 1220 315 L 1290 245 L 1480 245 L 1540 185',
    color: '#10b981',
    animClass: 'animate-pcb-flow',
    delay: '0.3s',
    width: 3,
  },
  {
    d: 'M 870 355 L 930 295 L 930 180 L 1020 90 L 1260 90 L 1330 20',
    color: '#22d3ee',
    animClass: 'animate-pcb-flow-fast',
    delay: '0.9s',
    width: 2.5,
  },
  {
    d: 'M 905 425 L 1080 425 L 1150 355 L 1350 355 L 1410 415 L 1560 415',
    color: '#f59e0b',
    animClass: 'animate-pcb-flow-reverse',
    delay: '0.4s',
    width: 2.5,
  },
  {
    d: 'M 840 340 L 840 220 L 900 160 L 900 40',
    color: '#38bdf8',
    animClass: 'animate-pcb-flow',
    delay: '1.8s',
    width: 2.5,
  },

  // Bottom-Left quadrant traces
  {
    d: 'M 710 515 L 620 515 L 550 585 L 380 585 L 310 655 L 120 655 L 60 715',
    color: '#38bdf8',
    animClass: 'animate-pcb-flow-fast',
    delay: '0.5s',
    width: 3,
  },
  {
    d: 'M 730 545 L 670 605 L 670 720 L 580 810 L 340 810 L 270 880',
    color: '#a855f7',
    animClass: 'animate-pcb-flow',
    delay: '1.2s',
    width: 2.5,
  },
  {
    d: 'M 695 475 L 520 475 L 450 545 L 250 545 L 190 485 L 40 485',
    color: '#10b981',
    animClass: 'animate-pcb-flow-reverse',
    delay: '0.2s',
    width: 2.5,
  },
  {
    d: 'M 760 560 L 760 680 L 700 740 L 700 860',
    color: '#22d3ee',
    animClass: 'animate-pcb-flow',
    delay: '1.7s',
    width: 2.5,
  },

  // Bottom-Right quadrant traces
  {
    d: 'M 890 515 L 980 515 L 1050 585 L 1220 585 L 1290 655 L 1480 655 L 1540 715',
    color: '#22d3ee',
    animClass: 'animate-pcb-flow-fast',
    delay: '0.8s',
    width: 3,
  },
  {
    d: 'M 870 545 L 930 605 L 930 720 L 1020 810 L 1260 810 L 1330 880',
    color: '#10b981',
    animClass: 'animate-pcb-flow',
    delay: '1.4s',
    width: 2.5,
  },
  {
    d: 'M 905 475 L 1080 475 L 1150 545 L 1350 545 L 1410 485 L 1560 485',
    color: '#a855f7',
    animClass: 'animate-pcb-flow-reverse',
    delay: '0.7s',
    width: 2.5,
  },
  {
    d: 'M 840 560 L 840 680 L 900 740 L 900 860',
    color: '#f59e0b',
    animClass: 'animate-pcb-flow',
    delay: '1.9s',
    width: 2.5,
  },

  // Outer perimeter PCB bus lines
  {
    d: 'M 140 130 L 420 130 L 470 180 L 610 180',
    color: '#22d3ee',
    animClass: 'animate-pcb-flow',
    delay: '0.4s',
    width: 2,
  },
  {
    d: 'M 1460 130 L 1180 130 L 1130 180 L 990 180',
    color: '#10b981',
    animClass: 'animate-pcb-flow-reverse',
    delay: '1.0s',
    width: 2,
  },
  {
    d: 'M 140 770 L 420 770 L 470 720 L 610 720',
    color: '#f59e0b',
    animClass: 'animate-pcb-flow-fast',
    delay: '0.3s',
    width: 2,
  },
  {
    d: 'M 1460 770 L 1180 770 L 1130 720 L 990 720',
    color: '#38bdf8',
    animClass: 'animate-pcb-flow',
    delay: '1.3s',
    width: 2,
  },
];

const PCB_NODES: Array<{ cx: number; cy: number; r: number; color: string; delay: string }> = [
  { cx: 620, cy: 385, r: 5, color: '#22d3ee', delay: '0s' },
  { cx: 380, cy: 315, r: 6, color: '#22d3ee', delay: '0.4s' },
  { cx: 120, cy: 245, r: 7, color: '#22d3ee', delay: '0.8s' },
  { cx: 670, cy: 180, r: 5, color: '#10b981', delay: '0.2s' },
  { cx: 340, cy: 90, r: 6, color: '#10b981', delay: '0.9s' },
  { cx: 450, cy: 355, r: 5, color: '#38bdf8', delay: '0.5s' },
  { cx: 190, cy: 415, r: 6, color: '#38bdf8', delay: '1.1s' },
  { cx: 700, cy: 160, r: 5, color: '#a855f7', delay: '0.7s' },

  { cx: 980, cy: 385, r: 5, color: '#10b981', delay: '0.3s' },
  { cx: 1220, cy: 315, r: 6, color: '#10b981', delay: '0.7s' },
  { cx: 1480, cy: 245, r: 7, color: '#10b981', delay: '1.2s' },
  { cx: 930, cy: 180, r: 5, color: '#22d3ee', delay: '0.4s' },
  { cx: 1260, cy: 90, r: 6, color: '#22d3ee', delay: '1.0s' },
  { cx: 1150, cy: 355, r: 5, color: '#f59e0b', delay: '0.6s' },
  { cx: 1410, cy: 415, r: 6, color: '#f59e0b', delay: '1.3s' },
  { cx: 900, cy: 160, r: 5, color: '#38bdf8', delay: '0.9s' },

  { cx: 620, cy: 515, r: 5, color: '#38bdf8', delay: '0.2s' },
  { cx: 380, cy: 585, r: 6, color: '#38bdf8', delay: '0.8s' },
  { cx: 120, cy: 655, r: 7, color: '#38bdf8', delay: '1.4s' },
  { cx: 670, cy: 720, r: 5, color: '#a855f7', delay: '0.5s' },
  { cx: 340, cy: 810, r: 6, color: '#a855f7', delay: '1.1s' },
  { cx: 450, cy: 545, r: 5, color: '#10b981', delay: '0.3s' },
  { cx: 190, cy: 485, r: 6, color: '#10b981', delay: '1.0s' },
  { cx: 700, cy: 740, r: 5, color: '#22d3ee', delay: '0.7s' },

  { cx: 980, cy: 515, r: 5, color: '#22d3ee', delay: '0.4s' },
  { cx: 1220, cy: 585, r: 6, color: '#22d3ee', delay: '0.9s' },
  { cx: 1480, cy: 655, r: 7, color: '#22d3ee', delay: '1.3s' },
  { cx: 930, cy: 720, r: 5, color: '#10b981', delay: '0.6s' },
  { cx: 1260, cy: 810, r: 6, color: '#10b981', delay: '1.2s' },
  { cx: 1150, cy: 545, r: 5, color: '#a855f7', delay: '0.2s' },
  { cx: 1410, cy: 485, r: 6, color: '#a855f7', delay: '0.8s' },
  { cx: 900, cy: 740, r: 5, color: '#f59e0b', delay: '1.0s' },

  // Corner & bus IC pads
  { cx: 140, cy: 130, r: 6, color: '#22d3ee', delay: '0.2s' },
  { cx: 1460, cy: 130, r: 6, color: '#10b981', delay: '0.5s' },
  { cx: 140, cy: 770, r: 6, color: '#f59e0b', delay: '0.8s' },
  { cx: 1460, cy: 770, r: 6, color: '#38bdf8', delay: '1.1s' },
];

export const KioskCircuitScreensaver: React.FC<KioskCircuitScreensaverProps> = ({
  now,
  activeMode,
  onDismiss,
}) => {
  const timeString = now.toLocaleTimeString('vi-VN', { hour12: false });
  const dateString = now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const hour = now.getHours();
  const isDayShift = hour >= 8 && hour < 20;

  return (
    <div className="fixed inset-0 z-[100] bg-[#020617] text-slate-100 overflow-hidden select-none flex flex-col justify-between">
      {/* Ambient radial lighting + subtle technical PCB grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(rgba(34,211,238,0.22) 1px, transparent 1px), linear-gradient(to right, rgba(15,23,42,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.5) 1px, transparent 1px)',
          backgroundSize: '28px 28px, 56px 56px, 56px 56px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.16),rgba(16,185,129,0.08)_38%,rgba(2,6,23,0.92)_75%)]" />

      {/* Animated Electronic Circuit Board SVG Network */}
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <filter id="pcb-neon-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Decorative Corner Microchip Modules */}
        {[
          { x: 112, y: 102 },
          { x: 1432, y: 102 },
          { x: 112, y: 742 },
          { x: 1432, y: 742 },
        ].map((chip, idx) => (
          <g key={idx} opacity="0.72">
            <rect
              x={chip.x}
              y={chip.y}
              width="56"
              height="56"
              rx="10"
              fill="#071326"
              stroke="#0ea5e9"
              strokeOpacity="0.45"
              strokeWidth="2"
            />
            <rect
              x={chip.x + 14}
              y={chip.y + 14}
              width="28"
              height="28"
              rx="5"
              fill="#0f172a"
              stroke="#22d3ee"
              strokeOpacity="0.5"
              strokeWidth="1.5"
            />
            <circle cx={chip.x + 28} cy={chip.y + 28} r="4" fill="#22d3ee" opacity="0.85" />
          </g>
        ))}

        {/* Static Copper Base Circuit Tracks */}
        {PCB_PATHS.map((p, idx) => (
          <path
            key={`base-${idx}`}
            d={p.d}
            fill="none"
            stroke="rgba(30, 58, 138, 0.52)"
            strokeWidth={p.width || 2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Animated Neon Light Streams Flowing Along PCB Traces */}
        <g filter="url(#pcb-neon-glow)">
          {PCB_PATHS.map((p, idx) => (
            <path
              key={`glow-${idx}`}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={(p.width || 2.5) + 0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={p.animClass}
              style={{ animationDelay: p.delay || '0s' }}
            />
          ))}
        </g>

        {/* Illuminated Solder Pads & Junction Nodes */}
        <g filter="url(#pcb-neon-glow)">
          {PCB_NODES.map((node, idx) => (
            <g
              key={`node-${idx}`}
              className="animate-pcb-node-pulse"
              style={{ animationDelay: node.delay }}
            >
              <circle
                cx={node.cx}
                cy={node.cy}
                r={node.r + 4}
                fill="none"
                stroke={node.color}
                strokeOpacity="0.45"
                strokeWidth="1.5"
              />
              <circle cx={node.cx} cy={node.cy} r={node.r} fill="#020617" stroke={node.color} strokeWidth="2.5" />
              <circle cx={node.cx} cy={node.cy} r={Math.max(1.8, node.r * 0.42)} fill={node.color} />
            </g>
          ))}
        </g>
      </svg>

      {/* Top Status & Quick Dismiss Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8 pt-5">
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/35 backdrop-blur-md shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
          <span className="text-[11px] sm:text-xs font-bold tracking-widest uppercase text-cyan-200">
            Màn Hình Nghỉ · Chế Độ Chờ Tiết Kiệm
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/80 backdrop-blur-md text-xs font-mono text-slate-200">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold tabular-nums">{timeString}</span>
            <span className="text-slate-600">|</span>
            <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
            <span className="capitalize">{dateString}</span>
          </div>

          <button
            type="button"
            onClick={() => onDismiss()}
            className="px-3.5 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/50 text-rose-200 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md cursor-pointer transition-all shadow-lg"
            title="Tắt màn hình nghỉ để chấm công"
          >
            <Power className="w-3.5 h-3.5 text-rose-400" />
            <span>Tắt Màn Hình Nghỉ</span>
          </button>
        </div>
      </div>

      {/* Center Advertising Showcase: Company Processor Emblem & Branding */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="relative flex items-center justify-center">
          {/* Outer Rotating Cyber Halo */}
          <div className="pointer-events-none absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-dashed border-cyan-400/35 animate-pcb-spin-slow" />
          <div className="pointer-events-none absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-emerald-400/25" />

          {/* IC Pins extending from central chip */}
          <div className="pointer-events-none absolute -top-5 flex gap-3">
            {[0, 1, 2, 3, 4].map((pin) => (
              <span
                key={`t-${pin}`}
                className="w-2 h-5 rounded-t-sm bg-gradient-to-t from-cyan-400 to-emerald-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
              />
            ))}
          </div>
          <div className="pointer-events-none absolute -bottom-5 flex gap-3">
            {[0, 1, 2, 3, 4].map((pin) => (
              <span
                key={`b-${pin}`}
                className="w-2 h-5 rounded-b-sm bg-gradient-to-b from-cyan-400 to-sky-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
              />
            ))}
          </div>
          <div className="pointer-events-none absolute -left-5 flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((pin) => (
              <span
                key={`l-${pin}`}
                className="w-5 h-2 rounded-l-sm bg-gradient-to-l from-emerald-400 to-cyan-300 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
              />
            ))}
          </div>
          <div className="pointer-events-none absolute -right-5 flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((pin) => (
              <span
                key={`r-${pin}`}
                className="w-5 h-2 rounded-r-sm bg-gradient-to-r from-cyan-400 to-amber-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
              />
            ))}
          </div>

          {/* Central Company Logo Microchip Core */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-slate-950/90 border-2 border-cyan-400/75 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-pcb-core-glow">
            {/* Inner bevel frame */}
            <div className="absolute inset-2 rounded-2xl border border-emerald-400/30 pointer-events-none" />

            {/* Official Newprotec Vina Vector Emblem */}
            <svg
              viewBox="0 0 80 80"
              className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_0_16px_rgba(34,211,238,0.7)]"
            >
              <defs>
                <linearGradient id="npLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <rect
                x="6"
                y="6"
                width="68"
                height="68"
                rx="16"
                fill="#061224"
                stroke="url(#npLogoGrad)"
                strokeWidth="3"
              />
              <path
                d="M23 57 V23 L57 57 V23"
                fill="none"
                stroke="url(#npLogoGrad)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="23" cy="57" r="3.2" fill="#10b981" />
              <circle cx="23" cy="23" r="3.2" fill="#67e8f9" />
              <circle cx="57" cy="57" r="3.2" fill="#10b981" />
              <circle cx="57" cy="23" r="3.2" fill="#67e8f9" />
            </svg>

            <div className="mt-2 text-xs font-black tracking-[0.22em] text-cyan-300 uppercase">
              NEWPROTEC
            </div>
            <div className="text-[9px] font-mono tracking-[0.25em] text-emerald-300/90 uppercase">
              SMART MES V2.0
            </div>
          </div>
        </div>

        {/* Company Advertising Headline & Live Time */}
        <div className="mt-8 sm:mt-10 space-y-2 max-w-2xl">
          <h1 className="text-2xl sm:text-4xl font-black tracking-wider uppercase bg-gradient-to-r from-cyan-300 via-white to-emerald-300 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(34,211,238,0.35)]">
            CÔNG TY TNHH NEWPROTEC VINA
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-widest uppercase text-sky-200/90">
            Hệ Thống Chấm Công Thông Minh · Mã QR &amp; Nhận Diện Khuôn Mặt Tự Động
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <span className="px-4 py-1.5 rounded-2xl bg-slate-900/85 border border-cyan-500/35 text-2xl sm:text-3xl font-black font-mono text-white tracking-widest tabular-nums shadow-lg">
              {timeString}
            </span>
            <span
              className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold uppercase tracking-wider border ${
                isDayShift
                  ? 'bg-amber-950/70 border-amber-400/45 text-amber-200'
                  : 'bg-indigo-950/70 border-indigo-400/45 text-indigo-200'
              }`}
            >
              {isDayShift ? 'Ca Ngày (08:00 - 17:00)' : 'Ca Đêm (20:00 - 05:00)'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Wake / Turn-Off Screensaver Action Bar */}
      <div className="relative z-10 pb-6 sm:pb-8 px-4 flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onDismiss(activeMode)}
            className="group px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm sm:text-base tracking-wide uppercase flex items-center gap-2.5 shadow-[0_0_32px_rgba(34,211,238,0.45)] cursor-pointer transition-all active:scale-95"
          >
            <ScanLine className="w-5 h-5 stroke-[2.5]" />
            <span>Tắt Màn Hình Nghỉ · Quét Chấm Công</span>
          </button>

          <button
            type="button"
            onClick={() => onDismiss('QR')}
            className="px-4 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-emerald-400/50 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2 backdrop-blur-md cursor-pointer transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>Mở Mã QR</span>
          </button>

          <button
            type="button"
            onClick={() => onDismiss('FACE')}
            className="px-4 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-sky-400/50 text-sky-300 text-xs sm:text-sm font-bold flex items-center gap-2 backdrop-blur-md cursor-pointer transition-all"
          >
            <ScanFace className="w-4 h-4" />
            <span>Mở Quét Khuôn Mặt</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 font-medium">
          Nhấn nút <strong className="text-cyan-300">Tắt Màn Hình Nghỉ</strong> để kích hoạt lại trạm chấm công khi có nhân viên cần quét.
        </p>
      </div>
    </div>
  );
};
