import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [platform, setPlatform] = useState<'desktop' | 'android' | 'ios' | 'other'>('other');

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect device type & OS
    const ua = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);

    setIsIOS(isIOSDevice);
    if (isIOSDevice) {
      setPlatform('ios');
    } else if (isAndroidDevice) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check if user previously dismissed prompt in this session
    const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show banner on iOS or when install prompt might be supported
    if (!dismissed && !isStandalone) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    } else {
      // Fallback: show platform installation guide
      setShowGuideModal(true);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Floating Bottom PWA Banner */}
      {showBanner && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 p-4 rounded-2xl shadow-2xl shadow-cyan-950/50 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs max-w-md w-[calc(100vw-2.5rem)] text-slate-200 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 shrink-0">
            {platform === 'desktop' ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-sm flex items-center gap-1.5">
              <span>Cài Đặt App Newprotec V2.0</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                PWA App
              </span>
            </div>
            <div className="text-slate-300 text-[11px] mt-0.5 leading-snug">
              Cài đặt ứng dụng trực tiếp trên máy tính / điện thoại để truy cập nhanh, mượt mà không cần trình duyệt.
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
            <button
              onClick={handleInstallClick}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold cursor-pointer shadow-md shadow-cyan-900/30 transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Cài Đặt Ngay</span>
            </button>
            <button
              onClick={handleDismissBanner}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Hướng dẫn cài đặt trên iPhone / iPad</h3>
                <p className="text-xs text-slate-400">Trình duyệt Safari trên iOS</p>
              </div>
            </div>

            <div className="space-y-4 my-5 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0 font-bold">1</div>
                <div>
                  <p className="font-semibold text-white text-sm">Nhấn vào nút Chia sẻ (Share)</p>
                  <p className="text-slate-400 mt-0.5">Tìm biểu tượng chiếc hộp có mũi tên chỉ lên <Share className="w-3.5 h-3.5 inline text-blue-400 ml-1" /> ở thanh công cụ dưới cùng Safari.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0 font-bold">2</div>
                <div>
                  <p className="font-semibold text-white text-sm">Thêm vào Màn hình chính</p>
                  <p className="text-slate-400 mt-0.5">Cuộn xuống danh sách tùy chọn và chọn <strong className="text-cyan-300">"Thêm vào Màn hình chính" (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline text-cyan-400 ml-1" />.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 font-bold">3</div>
                <div>
                  <p className="font-semibold text-white text-sm">Xác nhận Thêm</p>
                  <p className="text-slate-400 mt-0.5">Nhấn nút <strong>"Thêm" (Add)</strong> góc trên bên phải để hoàn tất cài đặt ứng dụng.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition border border-slate-700 cursor-pointer"
            >
              Đã Hiểu
            </button>
          </div>
        </div>
      )}

      {/* General / Desktop / Android Fallback Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Hướng Dẫn Cài Đặt Ứng Dụng</h3>
                <p className="text-xs text-slate-400">Tất cả thiết bị Máy tính & Điện thoại</p>
              </div>
            </div>

            <div className="space-y-4 my-4 text-xs text-slate-300 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {/* Desktop Chrome / Edge */}
              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm">
                  <Monitor className="w-4 h-4" />
                  <span>Trên Máy Tính (Chrome / Microsoft Edge / Brave)</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  <li>Nhấp vào biểu tượng <strong>Cài đặt ứng dụng</strong> (hình máy tính / mũi tên tải xuống) trên thanh địa chỉ của trình duyệt.</li>
                  <li>Hoặc nhấp vào menu 3 chấm ở góc phải trên &gt; <strong>Cài đặt ứng dụng Newprotec V2.0</strong>.</li>
                </ul>
              </div>

              {/* Android */}
              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm">
                  <Smartphone className="w-4 h-4" />
                  <span>Trên Điện Thoại Android (Chrome)</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  <li>Nhấp nút <strong>"Cài Đặt Ngay"</strong> ở góc dưới ứng dụng.</li>
                  <li>Hoặc nhấp menu 3 chấm Chrome &gt; Chọn <strong>"Thêm vào Màn hình chính"</strong> hoặc <strong>"Cài đặt ứng dụng"</strong>.</li>
                </ul>
              </div>

              {/* iOS */}
              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm">
                  <Share className="w-4 h-4 text-blue-400" />
                  <span>Trên iPhone / iPad (Safari)</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  <li>Mở ứng dụng bằng trình duyệt <strong>Safari</strong>.</li>
                  <li>Nhấn nút <strong>Chia sẻ (Share)</strong> &gt; Chọn <strong>"Thêm vào Màn hình chính"</strong>.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-lg shadow-cyan-950/50 cursor-pointer"
            >
              Đã Rõ
            </button>
          </div>
        </div>
      )}
    </>
  );
};
