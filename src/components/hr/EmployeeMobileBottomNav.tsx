import React from 'react';
import {
  Home,
  CalendarCheck,
  CalendarPlus,
  Banknote,
  Timer,
  FileText,
} from 'lucide-react';

export type EmployeeProfileTabId =
  | 'overview'
  | 'confirm'
  | 'leave'
  | 'salary'
  | 'overtime'
  | 'contract';

interface EmployeeMobileBottomNavProps {
  activeTab: EmployeeProfileTabId;
  onSelectTab: (tab: EmployeeProfileTabId) => void;
  onOpenQr?: () => void;
}

interface MobileNavTabConfig {
  id: EmployeeProfileTabId;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const MOBILE_NAV_TABS: MobileNavTabConfig[] = [
  { id: 'overview', label: 'Tổng quan', Icon: Home },
  { id: 'confirm', label: 'Xác nhận', Icon: CalendarCheck },
  { id: 'leave', label: 'ĐK Phép', Icon: CalendarPlus },
  { id: 'salary', label: 'Lương', Icon: Banknote },
  { id: 'overtime', label: 'Tăng ca', Icon: Timer },
  { id: 'contract', label: 'Hợp đồng', Icon: FileText },
];

export const EmployeeMobileBottomNav: React.FC<EmployeeMobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const activeIndex = Math.max(
    0,
    MOBILE_NAV_TABS.findIndex((t) => t.id === activeTab)
  );
  const ActiveTabConfig = MOBILE_NAV_TABS[activeIndex] || MOBILE_NAV_TABS[0];
  const ActiveIcon = ActiveTabConfig.Icon;

  // Inner grid has px-[28px] (56px total horizontal inset).
  // Ratio across 6 equal columns: (activeIndex + 0.5) / 6
  const ratio = (activeIndex + 0.5) / MOBILE_NAV_TABS.length;
  const centerExpr = `calc(28px + (100% - 56px) * ${ratio})`;
  // Notch SVG is 72px wide (half = 36px) -> left wing width = centerExpr - 36px
  const leftWingWidth = `calc((100% - 56px) * ${ratio} - 8px)`;

  return (
    <div className="fixed bottom-3 inset-x-2.5 z-50 md:hidden pointer-events-none flex justify-center">
      <div className="relative w-full max-w-[430px] pt-[20px] pointer-events-auto select-none">
        {/* Pill Backdrop with Sliding Center Curved Notch */}
        <div className="relative h-[64px] w-full flex items-stretch drop-shadow-[0_10px_28px_rgba(0,0,0,0.68)]">
          {/* Left wing smoothly resizes to active tab */}
          <div
            style={{ width: leftWingWidth }}
            className="h-[64px] shrink-0 rounded-l-2xl bg-[#0d2426]/[0.95] border-y border-l border-teal-200/[0.28] backdrop-blur-xl transition-[width] duration-300 ease-out"
          />

          {/* Curved Notch SVG Bridge (72px wide, moves along with active tab) */}
          <svg
            viewBox="0 0 72 64"
            className="w-[72px] h-[64px] shrink-0 overflow-visible"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 0,0.5 L 2,0.5 C 10,0.5 8,34 36,34 C 64,34 62,0.5 70,0.5 L 72,0.5 L 72,63.5 L 0,63.5 Z"
              fill="rgba(13, 36, 38, 0.95)"
            />
            <path
              d="M 0,0.5 L 2,0.5 C 10,0.5 8,34 36,34 C 64,34 62,0.5 70,0.5 L 72,0.5"
              fill="none"
              stroke="rgba(153, 246, 228, 0.28)"
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="63.5"
              x2="72"
              y2="63.5"
              stroke="rgba(153, 246, 228, 0.28)"
              strokeWidth="1"
            />
          </svg>

          {/* Right wing fills remaining width */}
          <div className="flex-1 min-w-[14px] h-[64px] rounded-r-2xl bg-[#0d2426]/[0.95] border-y border-r border-teal-200/[0.28] backdrop-blur-xl transition-all duration-300 ease-out" />

          {/* Sliding Raised Glowing Circular Button displaying the active tab's icon */}
          <div
            style={{ left: centerExpr }}
            className="absolute -top-[18px] -translate-x-1/2 w-[48px] h-[48px] rounded-full flex items-center justify-center bg-gradient-to-br from-teal-300 via-teal-500 to-emerald-700 border border-teal-200/75 shadow-[0_0_24px_rgba(45,212,191,0.72)] transition-[left] duration-300 ease-out pointer-events-none z-20"
          >
            <div className="w-[34px] h-[34px] rounded-full border-2 border-white/85 flex items-center justify-center bg-teal-400/15">
              <ActiveIcon className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
            </div>
          </div>

          {/* 6 Tab Slots matching all EmployeeProfile tabs */}
          <div className="absolute inset-0 grid grid-cols-6 items-center px-[28px] z-10">
            {MOBILE_NAV_TABS.map((tab) => {
              const Icon = tab.Icon;
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className="flex flex-col items-center justify-end pb-2 h-full cursor-pointer transition-colors"
                >
                  <div
                    className={`mb-1 transition-all duration-200 ${
                      isActive
                        ? 'opacity-0 scale-50 pointer-events-none'
                        : 'opacity-100 scale-100 text-slate-300/85 hover:text-white'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                  </div>
                  <span
                    className={`text-[9.5px] leading-none tracking-tight whitespace-nowrap transition-colors ${
                      isActive
                        ? 'font-extrabold text-teal-300'
                        : 'font-medium text-slate-300/80'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
