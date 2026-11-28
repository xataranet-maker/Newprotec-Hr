import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Sparkles, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { getConfiguredApiBaseUrl, isPackagedAppShell } from '../../lib/apiBase';
import { InstallerDownloadLinks, normalizeInstallerLinks } from '../../lib/installerLinks';
import { AppDownloadModal } from './AppDownloadModal';

interface AppVersionManifest {
  version?: string;
  buildId?: string;
  builtAt?: string;
}

interface AppUpdateNotifierProps {
  installerLinks?: InstallerDownloadLinks | null;
}

const DISMISSED_KEY = 'newprotec_dismissed_update_id';
const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

function parseSemverParts(raw: string): number[] {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^v/i, '')
    .split(/[-+]/)[0];
  if (!cleaned) return [];
  const parts = cleaned.split('.').map((part) => {
    const n = parseInt(part, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  });
  return parts;
}

function compareSemver(a: string, b: string): number {
  const pa = parseSemverParts(a);
  const pb = parseSemverParts(b);
  if (pa.length === 0 || pb.length === 0) return 0;
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

function getDismissedUpdateId(): string {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) || '';
  } catch {
    return '';
  }
}

function setDismissedUpdateId(id: string) {
  try {
    if (id) {
      window.sessionStorage.setItem(DISMISSED_KEY, id);
    }
  } catch {
    // ignore storage errors
  }
}

export const AppUpdateNotifier: React.FC<AppUpdateNotifierProps> = ({ installerLinks }) => {
  const packagedShell = isPackagedAppShell();
  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.2.0';
  const currentBuildId = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : currentVersion;

  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [remoteWebUpdate, setRemoteWebUpdate] = useState<AppVersionManifest | null>(null);
  const [nativeReleaseUpdate, setNativeReleaseUpdate] = useState<string | null>(null);
  const [dismissedId, setDismissedId] = useState<string>(() =>
    typeof window !== 'undefined' ? getDismissedUpdateId() : ''
  );
  const [isApplying, setIsApplying] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const {
    needRefresh: [swNeedRefresh, setSwNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        swRegistrationRef.current = registration;
      }
    },
    onRegisterError() {
      // Ignore SW registration issues in restricted contexts
    },
  });

  const checkRemoteVersion = useCallback(async () => {
    if (import.meta.env.DEV) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    // 1. Trigger browser SW update check when running Web / PWA
    if (!packagedShell && swRegistrationRef.current) {
      try {
        await swRegistrationRef.current.update();
      } catch {
        // ignore transient network failures
      }
    }

    // 2. Fetch uncached app-version.json (local origin on Web/PWA, configured API base on packaged apps)
    const apiBase = getConfiguredApiBaseUrl();
    const versionUrl = packagedShell
      ? apiBase
        ? `${apiBase}/app-version.json`
        : ''
      : '/app-version.json';

    if (!versionUrl) return;

    try {
      const separator = versionUrl.includes('?') ? '&' : '?';
      const resp = await fetch(`${versionUrl}${separator}t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (!resp.ok) return;
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const data = (await resp.json()) as AppVersionManifest;

      if (!packagedShell) {
        if (data?.buildId && data.buildId !== currentBuildId) {
          setRemoteWebUpdate(data);
        }
      } else if (data?.version && compareSemver(data.version, currentVersion) > 0) {
        setNativeReleaseUpdate((prev) => {
          if (prev && compareSemver(prev, data.version!) >= 0) return prev;
          return data.version!;
        });
      }
    } catch {
      // ignore offline/CORS transient errors
    }
  }, [currentBuildId, currentVersion, packagedShell]);

  // Check native installerLinks.releaseVersion synced from Cloud DB
  useEffect(() => {
    if (!packagedShell || !installerLinks) return;
    const resolved = normalizeInstallerLinks(installerLinks);
    if (resolved.releaseVersion && compareSemver(resolved.releaseVersion, currentVersion) > 0) {
      setNativeReleaseUpdate((prev) => {
        if (prev && compareSemver(prev, resolved.releaseVersion!) >= 0) return prev;
        return resolved.releaseVersion!;
      });
    }
  }, [currentVersion, installerLinks, packagedShell]);

  // Initial check + periodic polling + check when tab regains visibility/focus
  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void checkRemoteVersion();
    }, 3500);

    const interval = window.setInterval(() => {
      void checkRemoteVersion();
    }, POLL_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void checkRemoteVersion();
      }
    };

    const handleOnline = () => {
      void checkRemoteVersion();
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [checkRemoteVersion]);

  const activeUpdateId = packagedShell
    ? nativeReleaseUpdate
      ? `native:${nativeReleaseUpdate}`
      : ''
    : swNeedRefresh
    ? `sw:${remoteWebUpdate?.buildId || 'pending'}`
    : remoteWebUpdate?.buildId
    ? `web:${remoteWebUpdate.buildId}`
    : '';

  const isUpdateAvailable = Boolean(activeUpdateId) && dismissedId !== activeUpdateId;

  const handleApplyWebUpdate = async () => {
    if (isApplying) return;
    setIsApplying(true);

    try {
      if (swRegistrationRef.current) {
        await swRegistrationRef.current.update().catch(() => {});
      }
      if (swNeedRefresh) {
        await updateServiceWorker(true);
      } else if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }
    } catch {
      // ignore and force reload below
    }

    window.setTimeout(() => {
      window.location.reload();
    }, 900);
  };

  const handleDismiss = () => {
    if (!activeUpdateId) return;
    setDismissedUpdateId(activeUpdateId);
    setDismissedId(activeUpdateId);
    if (swNeedRefresh) {
      setSwNeedRefresh(false);
    }
  };

  const displayVersion = packagedShell
    ? nativeReleaseUpdate || currentVersion
    : remoteWebUpdate?.version || currentVersion;

  return (
    <>
      {isUpdateAvailable && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-3 right-3 left-3 sm:left-auto sm:top-16 sm:right-5 z-[120] sm:max-w-sm bg-slate-900/95 backdrop-blur-md border border-emerald-500/45 p-3.5 sm:p-4 rounded-2xl shadow-2xl shadow-emerald-950/50 flex flex-col gap-3 text-xs text-slate-200 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-start gap-3">
            <img
              src="/app-logo.png"
              alt="Newprotec Smart MES V2.0"
              className="w-10 h-10 object-contain drop-shadow-md shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-white text-sm flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Có Bản Cập Nhật Mới</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 text-[10px] font-mono font-semibold">
                  v{displayVersion.replace(/^v/i, '')}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] mt-1 leading-snug">
                {packagedShell
                  ? 'Hệ thống vừa phát hành phiên bản mới. Tải bản cài đặt mới nhất để đồng bộ tính năng và tối ưu hiệu năng.'
                  : 'Ứng dụng vừa được nâng cấp tính năng mới. Nhấn cập nhật để tải lại phiên bản mới nhất ngay.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Để sau"
              aria-label="Đóng thông báo cập nhật"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
            >
              Để sau
            </button>
            {packagedShell ? (
              <button
                type="button"
                onClick={() => setShowDownloadModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Bản Cập Nhật</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplyWebUpdate}
                disabled={isApplying}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-70 text-white font-semibold shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isApplying ? 'animate-spin' : ''}`} />
                <span>{isApplying ? 'Đang cập nhật...' : 'Cập Nhật Ngay'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <AppDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        links={installerLinks}
      />
    </>
  );
};
