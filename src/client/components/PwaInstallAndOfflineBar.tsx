import React, { useEffect, useState } from 'react';
import { Smartphone, WifiOff, X } from 'lucide-react';

export default function PwaInstallAndOfflineBar() {
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState<boolean>(
    () => localStorage.getItem('jk_pwa_banner_dismissed') === '1'
  );

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setShowIosGuide(true);
    }
  };

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  if (!isOffline && (isStandalone || dismissedBanner)) {
    return null;
  }

  return (
    <div className="w-full shrink-0">
      {isOffline && (
        <div className="bg-amber-900 text-amber-50 px-4 py-2 text-xs font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-300" />
          <span>
            <strong>Mode Offline Aktif:</strong> Koneksi internet terputus. Menampilkan data terakhir yang tersimpan di perangkat Anda.
          </span>
        </div>
      )}

      {!isStandalone && !dismissedBanner && (
        <div className="bg-emerald-950 text-emerald-50 px-4 lg:px-8 py-2 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="truncate">
              <strong>Aplikasi OpenHouse:</strong> Pasang ke layar utama untuk akses instan & hemat kuota.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition whitespace-nowrap"
            >
              Install Aplikasi
            </button>
            <button
              type="button"
              onClick={() => {
                setDismissedBanner(true);
                localStorage.setItem('jk_pwa_banner_dismissed', '1');
              }}
              aria-label="Tutup banner instalasi aplikasi"
              className="p-1 text-emerald-300 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">
                Cara Pasang Aplikasi (Android / iPhone / Desktop)
              </h3>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="p-1 text-stone-500 hover:text-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="text-xs text-stone-700 space-y-2 list-decimal list-inside">
              <li>
                <strong>Browser Chrome / Edge:</strong> Klik tombol{' '}
                <strong>Install</strong> pada kolom alamat (URL bar) di kanan atas.
              </li>
              <li>
                <strong>Android (Chrome):</strong> Ketuk menu titik tiga di pojok kanan atas, lalu pilih{' '}
                <strong>"Tambahkan ke Layar Utama" (Install App)</strong>.
              </li>
              <li>
                <strong>iPhone / iPad (Safari):</strong> Ketuk tombol{' '}
                <strong>Bagikan (Share)</strong> di bawah layar, lalu pilih{' '}
                <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-semibold"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
