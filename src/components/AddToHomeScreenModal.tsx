import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  X, 
  ExternalLink, 
  Download, 
  MoreVertical, 
  Share2, 
  PlusSquare, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle,
  Chrome,
  Compass,
  ArrowUpRight
} from 'lucide-react';

interface AddToHomeScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddToHomeScreenModal({ isOpen, onClose }: AddToHomeScreenModalProps) {
  const [activeOS, setActiveOS] = useState<'android' | 'ios'>('android');
  const [isInIframe, setIsInIframe] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if inside iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }

    // Check if running standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Detect user OS
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      setActiveOS('ios');
    } else {
      setActiveOS('android');
    }

    // Capture PWA install prompt event for Chrome/Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      // If no prompt available (e.g., inside iframe or iOS Safari), open direct URL in new tab
      window.open(window.location.href, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <img
              src="/icon-192.png?v=3"
              alt="TMII App Logo"
              className="w-11 h-11 rounded-2xl shadow-md border border-amber-500/30 object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Tambahkan ke Layar Utama (PWA)
                <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-md">
                  App
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Akses cepat seperti aplikasi native di HP Android / iPhone
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Iframe Warning Alert if user is viewing inside AI Studio iframe */}
          {isInIframe && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="text-xs font-bold text-amber-300">
                  Penting: Buka di Tab Baru Browser
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Fitur <b>"Tambahkan ke Layar Utama"</b> hanya aktif ketika aplikasi dibuka langsung di browser HP (Chrome / Safari), bukan di dalam jendela pratinjau editor.
                </p>
                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                  <ExternalLink size={13} />
                  <span>Buka Aplikasi di Tab Baru Browser</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Install Action Button if browser supports 1-tap prompt */}
          {deferredPrompt && (
            <div className="p-4 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black text-amber-300 flex items-center gap-1">
                  <Sparkles size={14} /> Instal Aplikasi Langsung
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  Browser Anda mendukung pemasangan 1-klik
                </div>
              </div>
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Download size={14} />
                <span>Instal Sekarang</span>
              </button>
            </div>
          )}

          {/* Already installed banner */}
          {isInstalled && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-300 text-xs font-bold">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>Aplikasi sudah terpasang di Layar Utama HP Anda!</span>
            </div>
          )}

          {/* OS Selector Tabs */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Panduan Cara Pasang Manual per Perangkat:
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveOS('android')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeOS === 'android'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Chrome size={15} />
                <span>Android (Chrome)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveOS('ios')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeOS === 'ios'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Compass size={15} />
                <span>iPhone / iPad (Safari)</span>
              </button>
            </div>
          </div>

          {/* Android Steps */}
          {activeOS === 'android' && (
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                <Chrome size={16} />
                <span>Langkah di Android (Google Chrome / Edge / Samsung Internet):</span>
              </div>

              <ol className="space-y-2.5 text-xs text-slate-300 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Buka alamat aplikasi di <b>Google Chrome</b> HP Anda.
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    Tekan ikon <b>Titik Tiga Menu (⋮)</b> di pojok kanan atas browser.
                    <div className="mt-1 p-2 bg-slate-900 rounded-xl border border-slate-800 inline-flex items-center gap-2 text-[11px] text-slate-200">
                      <MoreVertical size={14} className="text-amber-400" />
                      <span>Menu Browser (Titik Tiga)</span>
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    Pilih menu <b>"Tambahkan ke Layar Utama"</b> atau <b>"Instal aplikasi"</b> (Add to Home screen).
                    <div className="mt-1 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl inline-flex items-center gap-2 text-[11px] text-amber-300 font-bold">
                      <PlusSquare size={14} />
                      <span>Tambahkan ke Layar Utama</span>
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    Tekan <b>"Tambah" / "Instal"</b>. Ikon TMII Asset Management akan langsung muncul di halaman depan HP Anda.
                  </span>
                </li>
              </ol>
            </div>
          )}

          {/* iOS Steps */}
          {activeOS === 'ios' && (
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                <Compass size={16} />
                <span>Langkah di iPhone / iPad (Safari):</span>
              </div>

              <ol className="space-y-2.5 text-xs text-slate-300 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Buka alamat aplikasi di browser <b>Safari</b> di iPhone/iPad Anda.
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    Tekan tombol <b>Bagikan (Share)</b> di bagian bawah layar Safari (ikon kotak dengan panah ke atas).
                    <div className="mt-1 p-2 bg-slate-900 rounded-xl border border-slate-800 inline-flex items-center gap-2 text-[11px] text-slate-200">
                      <Share2 size={14} className="text-amber-400" />
                      <span>Tombol Bagikan (Share Safari)</span>
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    Gulir menu ke bawah dan pilih <b>"Tambah ke Layar Utama"</b> (Add to Home Screen).
                    <div className="mt-1 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl inline-flex items-center gap-2 text-[11px] text-amber-300 font-bold">
                      <PlusSquare size={14} />
                      <span>Tambah ke Layar Utama</span>
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    Tekan <b>"Tambah"</b> di sudut kanan atas.
                  </span>
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.open(window.location.href, '_blank')}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Buka Link Langsung</span>
            <ArrowUpRight size={14} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer transition-colors shadow-sm"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
