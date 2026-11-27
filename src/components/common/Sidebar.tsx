import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RibbonTab, Language, UserRole } from '../../types';
import { translations } from '../../data/locales';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  LayoutGrid,
  Settings,
  Home,
  Factory,
  Users,
  ShieldAlert,
  ShieldCheck,
  Download,
  LogOut,
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
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  onOpenDownload?: () => void;
  onLogout?: () => void;
}

const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  Multi: Factory,
  hr_admin: Users,
  security: ShieldCheck,
  admin: ShieldAlert,
};

const PRESERVE_UPPERCASE_TOKENS = new Set([
  'QR',
  'HC',
  'NS',
  'DS',
  'ĐK',
  'HR',
  'AI',
  'MES',
  'ADMIN',
  'PC',
  'PWA',
]);

function formatMenuLabel(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (trimmed === 'HC & NS') return 'HC & NS';
  if (trimmed === 'MULTI AUTO') return 'Multi Auto';
  if (trimmed === 'HR & ADMIN') return 'HR & Admin';

  const lettersOnly = trimmed.replace(/[^a-zA-ZÀ-ỹ]/g, '');
  const isAllCaps = lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase();
  if (!isAllCaps) return trimmed;

  const words = trimmed.toLowerCase().split(/\s+/);
  return words
    .map((word, index) => {
      const bare = word.replace(/[^a-zA-ZÀ-ỹ]/g, '').toUpperCase();
      if (PRESERVE_UPPERCASE_TOKENS.has(bare)) {
        return word.toUpperCase();
      }
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}

function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export const Sidebar: React.FC<SidebarProps> = ({
  tabs,
  activeTabId,
  activeItemId,
  onTabChange,
  onItemClick,
  language,
  userRole,
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed,
  onOpenDownload,
  onLogout,
}) => {
  const [expandedTabId, setExpandedTabId] = useState<string | null>(activeTabId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredPointer, setHoveredPointer] = useState<{ x: number; y: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (activeTabId) {
      setExpandedTabId(activeTabId);
    }
  }, [activeTabId]);

  const tr = translations[language] || translations.vi;
  const normalizedQuery = normalizeSearchText(searchQuery);
  const isSearching = normalizedQuery.length > 0;

  const filteredTabs = useMemo(() => {
    if (!isSearching) return tabs;
    return tabs
      .map((tab) => {
        const rawTabLabel = tr[tab.label] || tab.label;
        const tabMatches = normalizeSearchText(rawTabLabel).includes(normalizedQuery);
        const matchedGroups = tab.groups
          .map((grp) => {
            const rawGrpLabel = tr[grp.label] || grp.label;
            const grpMatches = normalizeSearchText(rawGrpLabel).includes(normalizedQuery);
            const matchedItems = grp.items.filter((item) => {
              const rawItemLabel = tr[item.label] || item.label;
              return (
                tabMatches ||
                grpMatches ||
                normalizeSearchText(rawItemLabel).includes(normalizedQuery)
              );
            });
            return { ...grp, items: matchedItems };
          })
          .filter((grp) => grp.items.length > 0);

        if (matchedGroups.length === 0) return null;
        return { ...tab, groups: matchedGroups };
      })
      .filter((t): t is RibbonTab => t !== null);
  }, [tabs, tr, isSearching, normalizedQuery]);

  const handleToggleTabDropdown = (tab: RibbonTab) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setExpandedTabId(tab.id);
      return;
    }
    setExpandedTabId((prev) => (prev === tab.id ? null : tab.id));
  };

  // Auto-hide sidebar cleanly when clicking any leaf destination item ("tab cuối")
  const handleSelectItem = (tabId: string, itemId: string) => {
    onTabChange(tabId);
    onItemClick(itemId);
    setExpandedTabId(tabId);
    if (isSearching) {
      setSearchQuery('');
    }
    setIsOpen(false);
    setIsCollapsed(true);
  };

  const handleCollapsedSearchClick = () => {
    setIsCollapsed(false);
    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 180);
  };

  const handleSidebarMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = asideRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredPointer({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const effectiveCollapsed = isCollapsed && !isOpen;

  return (
    <>
      {/* Mobile drawer backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-xs transition-opacity duration-300 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        ref={asideRef}
        onMouseMove={handleSidebarMouseMove}
        onMouseLeave={() => setHoveredPointer(null)}
        className={`fixed inset-y-0 left-0 z-50 md:static md:z-20 flex flex-col h-full bg-[#0b0f17] border-r border-slate-800/80 shadow-2xl md:shadow-none transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none select-none shrink-0 overflow-hidden relative ${
          isOpen ? 'translate-x-0 w-[264px]' : '-translate-x-full md:translate-x-0'
        } ${effectiveCollapsed ? 'md:w-[72px]' : 'md:w-[260px]'}`}
        style={{
          backgroundImage: hoveredPointer
            ? `radial-gradient(240px circle at ${hoveredPointer.x}px ${hoveredPointer.y}px, rgba(99, 102, 241, 0.14), transparent 70%), radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.09) 0%, rgba(11, 15, 23, 0) 48%)`
            : 'radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.10) 0%, rgba(11, 15, 23, 0) 48%)',
        }}
      >
        {/* Header: Brand + Collapse toggle */}
        <div
          className={`h-14 flex items-center shrink-0 border-b border-slate-800/70 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            effectiveCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsCollapsed(!effectiveCollapsed)}
            className="group flex items-center gap-2.5 min-w-0 cursor-pointer focus:outline-none"
            title={effectiveCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            <div className="w-8 h-8 rounded-full bg-white text-slate-950 flex items-center justify-center shrink-0 shadow-sm font-extrabold text-xs tracking-tighter transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-active:scale-95">
              NP
            </div>
            {!effectiveCollapsed && (
              <span className="font-bold text-slate-100 text-sm tracking-tight whitespace-nowrap truncate transition-transform duration-200 group-hover:translate-x-0.5">
                Newprotec
              </span>
            )}
          </button>

          {/* Desktop collapse button */}
          {!effectiveCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="hidden md:flex w-7 h-7 rounded-full bg-slate-800/90 hover:bg-indigo-500/25 border border-slate-700/70 hover:border-indigo-400/50 text-slate-300 hover:text-white items-center justify-center transition-all duration-200 hover:scale-105 active:scale-90 cursor-pointer shrink-0"
              title="Thu gọn menu (phím M)"
              aria-label="Thu gọn menu"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="md:hidden w-7 h-7 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-slate-700/70 text-slate-300 hover:text-white flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0"
            aria-label="Đóng menu"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expand button when collapsed on desktop */}
        {effectiveCollapsed && (
          <div className="hidden md:flex justify-center pt-2.5 pb-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="w-10 h-8 rounded-lg bg-slate-900/90 hover:bg-indigo-500/20 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-200 flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-[0_0_16px_rgba(99,102,241,0.22)] active:scale-95 cursor-pointer"
              title="Mở rộng menu (phím M)"
              aria-label="Mở rộng menu"
            >
              <ChevronRight className="w-4 h-4 transition-transform duration-200 hover:translate-x-0.5" />
            </button>
          </div>
        )}

        {/* Search Input */}
        <div
          className={`shrink-0 ${
            effectiveCollapsed ? 'px-3 py-2 flex justify-center' : 'px-3 pt-3 pb-2'
          }`}
        >
          {effectiveCollapsed ? (
            <button
              type="button"
              onClick={handleCollapsedSearchClick}
              className="w-10 h-10 rounded-lg bg-[#060911] hover:bg-indigo-500/15 border border-slate-800/90 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-200 flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-[0_0_14px_rgba(99,102,241,0.2)] active:scale-95 cursor-pointer"
              title="Tìm kiếm chức năng"
              aria-label="Tìm kiếm chức năng"
            >
              <Search className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#060911] border border-slate-800/90 focus-within:border-indigo-500/60 focus-within:shadow-[0_0_14px_rgba(99,102,241,0.16)] transition-all duration-200">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none min-w-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-500 hover:text-slate-200 transition-transform duration-150 hover:scale-110 active:scale-90 cursor-pointer shrink-0"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section Heading */}
        {!effectiveCollapsed && (
          <div className="px-4 pt-1.5 pb-1 text-[11px] font-medium text-slate-500 shrink-0">
            Menu
          </div>
        )}

        {/* Scrollable Accordion Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-1 space-y-1">
          {filteredTabs.length === 0 ? (
            !effectiveCollapsed && (
              <div className="px-3 py-6 text-center text-xs text-slate-500">
                Không tìm thấy chức năng phù hợp.
              </div>
            )
          ) : (
            filteredTabs.map((tab) => {
              const Icon = TAB_ICONS[tab.id] || LayoutGrid;
              const isTabActive = tab.id === activeTabId;
              const isDropdownOpen = !effectiveCollapsed && (isSearching || expandedTabId === tab.id);
              const tabLabel = formatMenuLabel(tr[tab.label] || tab.label);
              const hasMultipleGroups = tab.groups.length > 1;
              const highlightParentRow = isTabActive && (!isDropdownOpen || effectiveCollapsed);

              return (
                <div key={tab.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleToggleTabDropdown(tab)}
                    className={`group relative w-full min-h-[40px] flex items-center rounded-lg text-[13px] font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] cursor-pointer ${
                      effectiveCollapsed
                        ? 'justify-center px-2 py-2 hover:scale-105 hover:shadow-[0_0_16px_rgba(99,102,241,0.2)]'
                        : 'justify-between px-3 py-2'
                    } ${
                      highlightParentRow
                        ? 'bg-indigo-500/15 text-white shadow-[inset_0_0_0_1px_rgba(129,140,248,0.22)]'
                        : isDropdownOpen
                        ? 'bg-slate-800/55 text-slate-100'
                        : isTabActive
                        ? 'text-indigo-200 hover:bg-slate-800/50'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                    }`}
                    title={effectiveCollapsed ? tabLabel : undefined}
                    aria-expanded={!effectiveCollapsed ? isDropdownOpen : undefined}
                  >
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.85)] transition-all duration-200 ${
                        highlightParentRow ? 'h-5 opacity-100 scale-y-100' : 'h-3 opacity-0 scale-y-50 group-hover:opacity-45 group-hover:scale-y-75'
                      }`}
                      aria-hidden="true"
                    />

                    <span className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 ${
                          isTabActive || isDropdownOpen
                            ? 'text-indigo-400'
                            : 'text-slate-400 group-hover:text-indigo-300'
                        }`}
                      />
                      {!effectiveCollapsed && (
                        <span className="truncate whitespace-nowrap transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5">
                          {tabLabel}
                        </span>
                      )}
                    </span>

                    {!effectiveCollapsed && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isDropdownOpen
                            ? 'rotate-180 text-indigo-300'
                            : 'text-slate-500 group-hover:text-slate-200 group-hover:translate-y-0.5'
                        }`}
                      />
                    )}
                  </button>

                  {/* Smooth Accordion Dropdown per Tab */}
                  {!effectiveCollapsed && (
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                        isDropdownOpen
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="relative pl-4 pr-0.5 py-1 space-y-1">
                          <span
                            className="absolute left-[22px] top-1.5 bottom-1.5 w-px bg-slate-800/90"
                            aria-hidden="true"
                          />
                          {tab.groups.map((group) => (
                            <div key={group.id} className="space-y-0.5">
                              {hasMultipleGroups && (
                                <div className="pl-5 pr-2 pt-1.5 pb-0.5 text-[11px] font-medium text-slate-500 whitespace-nowrap truncate">
                                  {formatMenuLabel(tr[group.label] || group.label)}
                                </div>
                              )}
                              {group.items.map((item) => {
                                const ItemIcon = item.icon || Settings;
                                const isItemActive = item.id === activeItemId && isTabActive;
                                const itemLabel = formatMenuLabel(tr[item.label] || item.label);

                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleSelectItem(tab.id, item.id)}
                                    className={`group/item relative w-full min-h-[36px] flex items-center gap-2.5 pl-5 pr-2.5 py-1.5 rounded-lg text-[12.5px] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] cursor-pointer text-left ${
                                      isItemActive
                                        ? 'bg-indigo-500/15 text-white font-semibold shadow-[inset_0_0_0_1px_rgba(129,140,248,0.2)]'
                                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04] font-medium'
                                    }`}
                                    title={itemLabel}
                                  >
                                    <span
                                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.85)] transition-all duration-200 ${
                                        isItemActive
                                          ? 'h-4 opacity-100 scale-y-100'
                                          : 'h-2.5 opacity-0 scale-y-50 group-hover/item:opacity-50 group-hover/item:scale-y-75'
                                      }`}
                                      aria-hidden="true"
                                    />
                                    <ItemIcon
                                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/item:scale-110 ${
                                        isItemActive
                                          ? 'text-indigo-300'
                                          : item.color || 'text-slate-400'
                                      }`}
                                    />
                                    <span className="truncate whitespace-nowrap transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/item:translate-x-1">
                                      {itemLabel}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* Bottom Utility Actions */}
        {(onOpenDownload || (onLogout && userRole !== 'qrcode')) && (
          <div className="p-2.5 border-t border-slate-800/80 space-y-1 shrink-0 bg-[#090d14]">
            {onOpenDownload && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsCollapsed(true);
                  onOpenDownload();
                }}
                className={`group w-full min-h-[38px] flex items-center rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                  effectiveCollapsed ? 'justify-center px-2 hover:scale-105' : 'gap-3 px-3'
                }`}
                title="Tải ứng dụng (Windows / Android / Apple)"
              >
                <Download className="w-4 h-4 text-cyan-400 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-110" />
                {!effectiveCollapsed && (
                  <span className="truncate whitespace-nowrap transition-transform duration-200 group-hover:translate-x-0.5">
                    Tải ứng dụng
                  </span>
                )}
              </button>
            )}

            {onLogout && userRole !== 'qrcode' && (
              <button
                type="button"
                onClick={onLogout}
                className={`group w-full min-h-[38px] flex items-center rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/35 transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                  effectiveCollapsed ? 'justify-center px-2 hover:scale-105' : 'gap-3 px-3'
                }`}
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4 text-rose-400/90 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:scale-110" />
                {!effectiveCollapsed && (
                  <span className="truncate whitespace-nowrap transition-transform duration-200 group-hover:translate-x-0.5">
                    Đăng xuất
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
