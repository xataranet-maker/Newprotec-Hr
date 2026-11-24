import React from 'react';
import { Mail, Phone } from 'lucide-react';

interface AdminContactFooterProps {
  variant?: 'bar' | 'centered';
  systemLabel?: string;
  className?: string;
}

export const ADMIN_CONTACT_EMAIL = 'xatara.net@gmail.com';
export const ADMIN_CONTACT_PHONE_DISPLAY = '03.6446.8228';
export const ADMIN_CONTACT_PHONE_HREF = 'tel:0364468228';

export const AdminContactFooter: React.FC<AdminContactFooterProps> = ({
  variant = 'bar',
  systemLabel = 'NEWPROTEC VINA INDUSTRIAL SYSTEM · MES V2.0',
  className = '',
}) => {
  if (variant === 'centered') {
    return (
      <footer
        className={`relative z-10 w-full max-w-2xl mx-auto text-center space-y-1.5 text-[11px] text-slate-400 ${className}`}
      >
        <div className="font-mono text-slate-500 tracking-wide">{systemLabel}</div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-slate-300">
          <span className="text-slate-400 font-medium">Liên hệ Quản trị viên:</span>
          <a
            href={`mailto:${ADMIN_CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 transition-colors underline-offset-2 hover:underline"
          >
            <Mail className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
            <span>{ADMIN_CONTACT_EMAIL}</span>
          </a>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <a
            href={ADMIN_CONTACT_PHONE_HREF}
            className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 transition-colors font-mono underline-offset-2 hover:underline"
          >
            <Phone className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span>{ADMIN_CONTACT_PHONE_DISPLAY}</span>
          </a>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={`shrink-0 w-full bg-slate-950/95 border-t border-slate-800/80 px-3 sm:px-5 py-1.5 text-[11px] text-slate-400 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="font-mono text-[10px] text-slate-500 hidden md:inline">
          {systemLabel}
        </span>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1 w-full md:w-auto">
          <span className="text-slate-400 font-medium">Quản trị viên:</span>
          <a
            href={`mailto:${ADMIN_CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 transition-colors underline-offset-2 hover:underline"
          >
            <Mail className="w-3 h-3 shrink-0 text-cyan-400" />
            <span>{ADMIN_CONTACT_EMAIL}</span>
          </a>
          <span className="text-slate-700">|</span>
          <a
            href={ADMIN_CONTACT_PHONE_HREF}
            className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200 transition-colors font-mono underline-offset-2 hover:underline"
          >
            <Phone className="w-3 h-3 shrink-0 text-emerald-400" />
            <span>{ADMIN_CONTACT_PHONE_DISPLAY}</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
