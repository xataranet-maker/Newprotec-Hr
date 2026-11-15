import React, { useState, useEffect } from 'react';
import { RibbonTab, Language, UserRole } from '../../types';
import { translations } from '../../data/locales';
import { 
  ChevronRight, ChevronLeft, X, LayoutGrid, Settings, 
  Home, Factory, Zap, Cpu, Hammer, Users, ShieldAlert,
  Pin, PinOff, Sparkles
} from 'lucide-react';

export interface SidebarProps {
  tabs: RibbonTab[];
  activeTabId: string;
  activeItemId: string;
  onTabChange: (id: string) => void;
  onItemClick: (id: string) => void;
  language: Language;
  userRole?: UserRole;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  autoHide?: boolean;
  setAutoHide?: (v: boolean) => void;
  isPinned?: boolean;
  setIsPinned?: (v: boolean) => void;
  // Backward compatibility
  isCollapsed?: boolean;
  setCollapsed?: (v: boolean) => void;
  isDrawerOpen?: boolean;
  setDrawerOpen?: (v: boolean) => void;
}

const TAB_ICONS: Record<string, any> = {
  home: Home,
  Multi: Factory,
  stiff: Zap,
  auto_stamping: LayersIcon,
  mold_jig: Cpu,
  equipment_dept: Hammer,
  hr_admin: Users,
  admin: ShieldAlert
};

function LayersIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({
  tabs,
  activeTabId,
  activeItemId,
  onTabChange,
  onItemClick,
  language,
  isOpen,
  setIsOpen,
  autoHide = true,
  setAutoHide,
  isPinned = false,
  setIsPinned
}) => {
  // Tab being hovered / inspected inside the menu
  const [selectedMenuTabId, setSelectedMenuTabId] = useState<string>(activeTabId);

  useEffect(() => {
    setSelectedMenuTabId(activeTabId);
  }, [activeTabId]);

  const tr = translations[language] || translations.vi;
  const currentTab = tabs.find(t => t.id === selectedMenuTabId) || tabs.find(t => t.id === activeTabId) || tabs[0];

  const handleTabClick = (tab: RibbonTab) => {
    onTabChange(tab.id);
    setSelectedMenuTabId(tab.id);
    if (tab.groups.length > 0 && tab.groups[0].items.length > 0) {
      onItemClick(tab.groups[0].items[0].id);
    }
    // Tự động ẩn menu sang trái khi kích vào tab để mở rộng không gian trang
    if (autoHide && !isPinned) {
      setIsOpen(false);
    }
  };

  const handleItemClick = (itemId: string, tabId: string) => {
    onTabChange(tabId);
    onItemClick(itemId);
    // Tự động ẩn menu sang trái khi kích vào chức năng
    if (autoHide && !isPinned) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* 1. Floating Left-Edge Handle when Menu is collapsed/hidden */}
      {!isOpen && !isPinned && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed left-0 top-20 z-40 flex items-center gap-1.5 py-3 px-1.5 rounded-r-lg bg-slate-900/90 hover:bg-cyan-600/30 border-y border-r border-slate-700/80 text-slate-300 hover:text-cyan-300 shadow-2xl backdrop-blur-md transition-all cursor-pointer group hover:pl-2"
          title="Mở Menu chọn Tab (phím M)"
        >
          <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          <span className="text-[10px] font-bold tracking-widest [writing-mode:vertical-lr] uppercase text-slate-400 group-hover:text-cyan-300 select-none">
            MENU
          </span>
        </button>
      )}

      {/* 2. Backdrop Overlay when Menu is open (non-pinned mode) */}
      {isOpen && !isPinned && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 3. Main Slide-out Menu Panel (Slides out to the left) */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 flex h-full bg-slate-950 border-r border-slate-800 shadow-2xl shadow-black/80 transition-transform duration-300 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isPinned ? 'static z-20 shrink-0' : ''}`}
        style={{ width: 'min(92vw, 560px)' }}
      >
        {/* Left Sub-Column: Tabs List */}
        <div className="w-48 sm:w-56 h-full flex flex-col border-r border-slate-800/80 bg-slate-950 shrink-0">
          {/* Header */}
          <div className="h-14 flex items-center px-3.5 border-b border-slate-800/80 justify-between shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-400 font-black text-xs">
                NP
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-slate-100 text-xs tracking-tight truncate">
                  NEWPROTEC VINA
                </span>
                <span className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase">
                  MES V2.0
                </span>
              </div>
            </div>
          </div>

          {/* Tab Selection List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
              <span>HỆ THỐNG PHÂN HỆ</span>
              <span className="text-[9px] text-cyan-400 font-mono">{tabs.length} TABS</span>
            </div>
            {tabs.map(tab => {
              const Icon = TAB_ICONS[tab.id] || LayoutGrid;
              const isCurrentActive = tab.id === activeTabId;
              const isInspected = tab.id === selectedMenuTabId;
              const label = tr[tab.label] || tab.label;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  onMouseEnter={() => setSelectedMenuTabId(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left ${
                    isInspected
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm'
                      : isCurrentActive
                      ? 'bg-slate-900 text-cyan-400 border border-slate-700/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                  title={`${label} (Kích để vào phân hệ và tự động ẩn menu sang trái)`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isInspected || isCurrentActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="truncate flex-1 font-semibold tracking-wide">
                    {label}
                  </span>
                  {isCurrentActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Tab đang hoạt động" />
                  )}
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isInspected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="p-3 border-t border-slate-800/80 text-[10px] space-y-2 bg-slate-950/80">
            {/* Auto-hide toggle badge */}
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Tự động ẩn:</span>
              </span>
              {setAutoHide && (
                <button
                  onClick={() => setAutoHide(!autoHide)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                    autoHide ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'
                  }`}
                  title="Tự động ẩn menu sang trái khi kích chọn tab"
                >
                  {autoHide ? 'BẬT' : 'TẮT'}
                </button>
              )}
            </div>

            {/* Pin menu toggle */}
            {setIsPinned && (
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1">
                  {isPinned ? <Pin className="w-3 h-3 text-amber-400" /> : <PinOff className="w-3 h-3 text-slate-400" />}
                  <span>Ghim menu:</span>
                </span>
                <button
                  onClick={() => setIsPinned(!isPinned)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                    isPinned ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                  }`}
                  title={isPinned ? 'Bỏ ghim menu' : 'Ghim cố định menu'}
                >
                  {isPinned ? 'ĐÃ GHIM' : 'CHƯA GHIM'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sub-Column: Feature Groups & Items of Selected Tab */}
        <div className="flex-1 h-full flex flex-col bg-slate-900/95 overflow-hidden">
          {/* Top action bar */}
          <div className="h-14 px-3 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider truncate">
                {tr[currentTab?.label || ''] || currentTab?.label || 'CHỨC NĂNG'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                ({currentTab?.groups.reduce((acc, g) => acc + g.items.length, 0) || 0} chức năng)
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Button to collapse to the left */}
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
                title="Ẩn menu sang trái (Esc)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Ẩn menu</span>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer sm:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Notice banner */}
          <div className="px-3 py-1.5 bg-cyan-950/30 border-b border-cyan-800/30 text-[11px] text-cyan-300/80 flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Kích vào bất kỳ mục nào để chuyển trang & tự động mở rộng màn hình</span>
          </div>

          {/* Items List grouped by Categories */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
            {currentTab?.groups.map(group => (
              <div key={group.id} className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 border-b border-slate-800/60">
                  {tr[group.label] || group.label}
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {group.items.map(item => {
                    const ItemIcon = item.icon || Settings;
                    const isItemActive = item.id === activeItemId && currentTab.id === activeTabId;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id, currentTab.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                          isItemActive
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ItemIcon className={`w-4 h-4 shrink-0 ${item.color || 'text-slate-400'}`} />
                          <span className="truncate text-left font-medium">
                            {tr[item.label] || item.label}
                          </span>
                        </div>
                        {isItemActive ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-300 font-mono shrink-0">
                            ĐANG MỞ
                          </span>
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Tab Action Button */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/50 shrink-0 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Vào thẳng trang tổng hợp:
            </span>
            <button
              onClick={() => handleTabClick(currentTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
            >
              <span>Mở {tr[currentTab?.label || ''] || currentTab?.label}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
