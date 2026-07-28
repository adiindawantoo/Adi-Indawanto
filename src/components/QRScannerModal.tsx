import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { Camera, X, RefreshCw, Upload, Sparkles, CheckCircle2, AlertTriangle, SwitchCamera, Zap } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (scannedText: string) => void;
  title?: string;
  subtitle?: string;
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onScanResult,
  title = 'Scan QR / Barcode Aset',
  subtitle = 'Arahkan kamera ke QR Code / Barcode yang tertera pada label aset fisik TMII'
}: QRScannerModalProps) {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [continuousMode, setContinuousMode] = useState<boolean>(true);
  const [scanHistoryCount, setScanHistoryCount] = useState<number>(0);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Initialize scanner when modal opens
    setScannerError(null);
    setLastScanned(null);
    setScanHistoryCount(0);

    // Get available cameras first
    Html5Qrcode.getCameras()
      .then((cameraList) => {
        if (cameraList && cameraList.length > 0) {
          setCameras(cameraList);
          // Prefer back/environment camera if available
          const backCam = cameraList.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment'));
          const camToUse = backCam ? backCam.id : cameraList[0].id;
          setSelectedCameraId(camToUse);
          startScanner(camToUse);
        } else {
          // Fallback to environment facingMode
          startScannerWithFacingMode();
        }
      })
      .catch((err) => {
        console.warn('Get cameras failed, trying facingMode environment:', err);
        startScannerWithFacingMode();
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const playSuccessBeep = () => {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio context might be restricted before user interaction
    }
  };

  const handleDecodedText = (decodedText: string) => {
    const now = Date.now();
    // Debounce duplicate scans within 1.5 seconds if continuous
    if (now - lastScanTimeRef.current < 1500 && lastScanned === decodedText) {
      return;
    }
    lastScanTimeRef.current = now;

    // Extract asset code intelligently if decodedText is JSON or URL or raw code
    let cleanedCode = decodedText.trim();
    if (cleanedCode.startsWith('{') && cleanedCode.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanedCode);
        cleanedCode = parsed.code || parsed.assetCode || parsed.id || cleanedCode;
      } catch (e) {
        // use raw
      }
    } else if (cleanedCode.includes('http://') || cleanedCode.includes('https://')) {
      try {
        const url = new URL(cleanedCode);
        const codeParam = url.searchParams.get('code') || url.searchParams.get('assetCode') || url.searchParams.get('id');
        if (codeParam) cleanedCode = codeParam;
      } catch (e) {
        // use raw
      }
    }

    setLastScanned(cleanedCode);
    setScanHistoryCount(prev => prev + 1);
    playSuccessBeep();

    onScanResult(cleanedCode);

    if (!continuousMode) {
      stopScanner();
      onClose();
    }
  };

  const startScanner = (cameraId: string) => {
    stopScanner().then(() => {
      const html5QrCode = new Html5Qrcode('qr-reader-viewport');
      scannerRef.current = html5QrCode;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minDim * 0.75),
            height: Math.floor(minDim * 0.75)
          };
        },
        aspectRatio: 1.0
      };

      setIsScanning(true);
      setScannerError(null);

      html5QrCode.start(
        cameraId,
        config,
        (decodedText) => handleDecodedText(decodedText),
        () => {
          // Ignore frame decode failures
        }
      ).catch((err) => {
        console.error('Camera start error:', err);
        setIsScanning(false);
        setScannerError('Gagal membuka kamera. Pastikan izin kamera telah diberikan di browser/aplikasi Anda.');
      });
    });
  };

  const startScannerWithFacingMode = () => {
    stopScanner().then(() => {
      const html5QrCode = new Html5Qrcode('qr-reader-viewport');
      scannerRef.current = html5QrCode;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minDim * 0.75),
            height: Math.floor(minDim * 0.75)
          };
        },
        aspectRatio: 1.0
      };

      setIsScanning(true);
      setScannerError(null);

      html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => handleDecodedText(decodedText),
        () => {
          // Ignore frame decode failures
        }
      ).catch((err) => {
        console.error('Camera facingMode error:', err);
        setIsScanning(false);
        setScannerError('Tidak dapat mengakses kamera belakang. Silakan periksa izin kamera pada perangkat/browser Anda.');
      });
    });
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode('qr-reader-viewport-file');
    html5QrCode.scanFile(file, true)
      .then((decodedText) => {
        handleDecodedText(decodedText);
      })
      .catch((err) => {
        alert('Tidak dapat mendeteksi QR Code dari file gambar ini. Pastikan gambar cukup jelas.');
      });
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCamId = e.target.value;
    setSelectedCameraId(newCamId);
    startScanner(newCamId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium line-clamp-1">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
            {/* Camera dropdown selector if multiple cameras exist */}
            {cameras.length > 1 ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <SwitchCamera size={14} className="text-amber-400 shrink-0" />
                <select
                  value={selectedCameraId}
                  onChange={handleCameraChange}
                  className="bg-slate-900 text-slate-200 text-xs font-bold py-1 px-2 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400 w-full truncate cursor-pointer"
                >
                  {cameras.map(c => (
                    <option key={c.id} value={c.id}>{c.label || `Kamera ${c.id}`}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 px-1">
                <Zap size={14} className="text-amber-400" />
                <span>Kamera Aktif</span>
              </div>
            )}

            {/* Continuous scan mode toggle */}
            <label className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={e => setContinuousMode(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-500"
              />
              <span className="text-[11px] font-bold text-amber-300">Scan Kontinu</span>
            </label>
          </div>

          {/* Camera Viewport Container */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex flex-col items-center justify-center min-h-[260px]">
            {/* html5-qrcode target div */}
            <div id="qr-reader-viewport" className="w-full h-full min-h-[260px] max-h-[320px] overflow-hidden" />
            <div id="qr-reader-viewport-file" className="hidden" />

            {/* Scanning Overlay graphic if scanning active */}
            {isScanning && !scannerError && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                <div className="w-full flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/80 text-slate-950 px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 shadow-xs">
                    <Sparkles size={11} /> Live Camera
                  </span>
                  {scanHistoryCount > 0 && (
                    <span className="text-[10px] font-black bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                      {scanHistoryCount} Ter-scan
                    </span>
                  )}
                </div>

                <div className="text-center bg-slate-950/70 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-xs">
                  Posisikan QR Code di dalam kotak
                </div>
              </div>
            )}

            {/* Error view */}
            {scannerError && (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
                  <AlertTriangle size={24} />
                </div>
                <p className="text-xs text-red-300 font-semibold max-w-xs mx-auto">
                  {scannerError}
                </p>
                <button
                  onClick={() => {
                    if (selectedCameraId) startScanner(selectedCameraId);
                    else startScannerWithFacingMode();
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 mx-auto cursor-pointer transition-colors"
                >
                  <RefreshCw size={14} />
                  <span>Coba Lagi Kamera</span>
                </button>
              </div>
            )}
          </div>

          {/* Last Scanned Result Banner */}
          {lastScanned && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Terakhir Terdeteksi:</div>
                  <div className="text-xs font-black text-white font-mono truncate">{lastScanned}</div>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-lg shrink-0">
                Cocok!
              </span>
            </div>
          )}

          {/* File Upload Alternative */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold">
              Kamera tidak berfungsi?
            </span>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
            >
              <Upload size={13} />
              <span>Upload Gambar QR</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            Selesai Scanning
          </button>
        </div>
      </div>
    </div>
  );
}
