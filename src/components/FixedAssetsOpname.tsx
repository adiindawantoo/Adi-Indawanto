import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FixedAsset, AppTheme, StockOpnameSession, StockOpnameItem } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { 
  ClipboardCheck, Play, Save, Trash2, CheckCircle2, AlertTriangle, HelpCircle, 
  Search, RefreshCw, BarChart2, Plus, Calendar, ArrowRight, User, Check, X, MapPin, Map, FileSpreadsheet,
  Camera, QrCode, Sparkles
} from 'lucide-react';
import QRScannerModal from './QRScannerModal';

interface FixedAssetsOpnameProps {
  assets: FixedAsset[];
  theme: AppTheme;
  onUpdateAsset: (asset: FixedAsset) => Promise<void>;
  currentUserDisplayName?: string | null;
}

export default function FixedAssetsOpname({ assets, theme, onUpdateAsset, currentUserDisplayName }: FixedAssetsOpnameProps) {
  // Database history
  const [historySessions, setHistorySessions] = useState<StockOpnameSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Active Session states
  const [activeSession, setActiveSession] = useState<StockOpnameSession | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // New Session form
  const [isCreating, setIsCreating] = useState(false);
  const [formSessionName, setFormSessionName] = useState('');
  const [formLocationFilter, setFormLocationFilter] = useState('Semua');
  const [formCheckedBy, setFormCheckedBy] = useState(currentUserDisplayName || 'Pemeriksa TMII');

  // Selected session in history for deep preview modal
  const [selectedHistorySession, setSelectedHistorySession] = useState<StockOpnameSession | null>(null);
  const [autoCorrectLocations, setAutoCorrectLocations] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Get unique locations from assets for filtering
  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    assets.forEach(a => {
      if (a.location) locs.add(a.location);
    });
    return ['Semua', ...Array.from(locs)];
  }, [assets]);

  // Load past sessions from Firestore
  useEffect(() => {
    const q = query(collection(db, 'stock_opname_sessions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StockOpnameSession[];
      setHistorySessions(data);
      setLoadingHistory(false);
    }, (err) => {
      console.error('Error fetching stock opname history:', err);
      setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle Scan Submit
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !scanInput.trim()) return;

    const trimmedInput = scanInput.trim().toUpperCase();
    
    // Find item in current opname session
    const itemIndex = activeSession.items.findIndex(
      item => item.assetCode.toUpperCase() === trimmedInput || 
              item.assetName.toUpperCase().includes(trimmedInput)
    );

    if (itemIndex !== -1) {
      const foundItem = activeSession.items[itemIndex];
      
      // Update item status to "Sesuai"
      const updatedItems = [...activeSession.items];
      updatedItems[itemIndex] = {
        ...foundItem,
        status: 'Sesuai',
        checkedAt: new Date().toLocaleTimeString('id-ID'),
        notes: foundItem.notes || 'Hasil scan barcode/QR cepat'
      };

      setActiveSession({
        ...activeSession,
        items: updatedItems
      });

      setScanMessage({
        text: `Berhasil mencocokkan Aset: [${foundItem.assetCode}] ${foundItem.assetName}!`,
        type: 'success'
      });
      setScanInput('');
    } else {
      setScanMessage({
        text: `Kode Aset atau Nama "${trimmedInput}" tidak ditemukan dalam daftar periksa sesi ini.`,
        type: 'error'
      });
    }

    // Clear scanning toast message after 4s
    setTimeout(() => setScanMessage(null), 4000);
  };

  // Handle Camera QR Scan result
  const handleCameraScanResult = (scannedCode: string) => {
    if (!activeSession || !scannedCode.trim()) return;

    const trimmedInput = scannedCode.trim().toUpperCase();
    
    // Find item in current opname session
    const itemIndex = activeSession.items.findIndex(
      item => item.assetCode.toUpperCase() === trimmedInput || 
              item.assetName.toUpperCase().includes(trimmedInput) ||
              trimmedInput.includes(item.assetCode.toUpperCase())
    );

    if (itemIndex !== -1) {
      const foundItem = activeSession.items[itemIndex];
      
      const updatedItems = [...activeSession.items];
      updatedItems[itemIndex] = {
        ...foundItem,
        status: 'Sesuai',
        checkedAt: new Date().toLocaleTimeString('id-ID'),
        notes: foundItem.notes || 'Hasil Scan QR Kamera Mobile'
      };

      setActiveSession({
        ...activeSession,
        items: updatedItems
      });

      setScanMessage({
        text: `[BERHASIL SCAN KAMERA] Aset Terverifikasi: [${foundItem.assetCode}] ${foundItem.assetName}!`,
        type: 'success'
      });
    } else {
      setScanMessage({
        text: `[TIDAK DITEMUKAN] Kode QR "${trimmedInput}" tidak ada dalam daftar periksa lokasi sesi ini.`,
        type: 'error'
      });
    }

    setTimeout(() => setScanMessage(null), 5000);
  };

  // Quick action to change an individual asset's opname status
  const handleUpdateItemStatus = (assetId: string, status: 'Sesuai' | 'Tidak Sesuai' | 'Hilang' | 'Belum Diperiksa', actualLocation?: string) => {
    if (!activeSession) return;

    const updatedItems = activeSession.items.map(item => {
      if (item.assetId === assetId) {
        return {
          ...item,
          status,
          actualLocation: actualLocation || item.expectedLocation,
          checkedAt: new Date().toLocaleTimeString('id-ID')
        };
      }
      return item;
    });

    setActiveSession({
      ...activeSession,
      items: updatedItems
    });
  };

  // Inline update item note
  const handleUpdateItemNote = (assetId: string, notes: string) => {
    if (!activeSession) return;

    const updatedItems = activeSession.items.map(item => {
      if (item.assetId === assetId) {
        return { ...item, notes };
      }
      return item;
    });

    setActiveSession({
      ...activeSession,
      items: updatedItems
    });
  };

  // Start new Session
  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSessionName.trim()) return;

    // Filter which assets belong to this session
    const targetAssets = assets.filter(a => formLocationFilter === 'Semua' || a.location === formLocationFilter);

    if (targetAssets.length === 0) {
      alert(`Tidak ada aset fisik terdaftar di lokasi "${formLocationFilter}". Silakan pilih lokasi lain.`);
      return;
    }

    // Build items checklist
    const initialItems: StockOpnameItem[] = targetAssets.map(a => ({
      assetId: a.id,
      assetCode: a.code,
      assetName: a.name,
      expectedLocation: a.location || 'Tidak Terdefinisi',
      actualLocation: a.location || 'Tidak Terdefinisi',
      status: 'Belum Diperiksa',
      notes: ''
    }));

    const newSession: StockOpnameSession = {
      id: `session-temp-${Date.now()}`,
      sessionName: formSessionName,
      locationFilter: formLocationFilter,
      status: 'Berjalan',
      checkedBy: formCheckedBy,
      createdAt: new Date().toLocaleString('id-ID'),
      items: initialItems
    };

    setActiveSession(newSession);
    setIsCreating(false);
    setFormSessionName('');
    setScanInput('');
    setScanMessage(null);
  };

  // Complete and save Stock Opname Sesi
  const handleSaveSession = async () => {
    if (!activeSession) return;

    const uncheckedCount = activeSession.items.filter(i => i.status === 'Belum Diperiksa').length;
    if (uncheckedCount > 0) {
      const confirmSave = window.confirm(`Peringatan: Masih ada ${uncheckedCount} aset yang belum diperiksa di sesi ini. Anda yakin ingin menyimpannya?`);
      if (!confirmSave) return;
    }

    setIsSaving(true);
    try {
      const completedSessionData: Omit<StockOpnameSession, 'id'> = {
        sessionName: activeSession.sessionName,
        locationFilter: activeSession.locationFilter,
        status: 'Selesai',
        checkedBy: activeSession.checkedBy,
        createdAt: activeSession.createdAt,
        completedAt: new Date().toLocaleString('id-ID'),
        items: activeSession.items
      };

      // 1. Write the completed Stock Opname Session logs to Firestore
      await addDoc(collection(db, 'stock_opname_sessions'), completedSessionData);

      // 2. If Auto-Correct is checked, automatically update actual locations of mismatched assets in DB!
      if (autoCorrectLocations) {
        const mismatchedItems = activeSession.items.filter(i => i.status === 'Tidak Sesuai');
        for (const item of mismatchedItems) {
          const originalAsset = assets.find(a => a.id === item.assetId);
          if (originalAsset && item.actualLocation !== originalAsset.location) {
            await onUpdateAsset({
              ...originalAsset,
              location: item.actualLocation,
              notes: `${originalAsset.notes || ''} (Auto-update oleh Stock Opname "${activeSession.sessionName}")`.trim()
            });
          }
        }
      }

      alert('Berhasil menyimpan Sesi Stock Opname dan merujuk pembaruan basis data fisik.');
      setActiveSession(null);
    } catch (err) {
      console.error('Failed to save stock opname:', err);
      alert('Gagal menyimpan hasil Stock Opname. Coba lagi nanti.');
    } finally {
      setIsSaving(false);
    }
  };

  // Active progress stats
  const activeStats = useMemo(() => {
    if (!activeSession) return { total: 0, checked: 0, match: 0, mismatch: 0, missing: 0, remaining: 0, percent: 0 };
    const items = activeSession.items;
    const total = items.length;
    const match = items.filter(i => i.status === 'Sesuai').length;
    const mismatch = items.filter(i => i.status === 'Tidak Sesuai').length;
    const missing = items.filter(i => i.status === 'Hilang').length;
    const remaining = items.filter(i => i.status === 'Belum Diperiksa').length;
    const checked = total - remaining;
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

    return { total, checked, match, mismatch, missing, remaining, percent };
  }, [activeSession]);

  return (
    <div className="space-y-3.5 sm:space-y-6" id="assets-opname-container">
      {/* 1. SESSION ACTIVE INTERFACE */}
      {activeSession ? (
        <div className="space-y-3.5 sm:space-y-6">
          {/* Header Action Banner */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <span className="inline-block px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-50 text-amber-700 border border-amber-100 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg">
                Sesi Stock Opname Sedang Berjalan
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1 sm:mt-1.5 flex items-center gap-1.5 sm:gap-2">
                <ClipboardCheck className="text-amber-500 shrink-0" size={17} />
                <span className="truncate">{activeSession.sessionName}</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 font-semibold flex flex-wrap items-center gap-x-2 sm:gap-3">
                <span>Pemeriksa: <strong>{activeSession.checkedBy}</strong></span>
                <span>•</span>
                <span>Lokasi: <strong>{activeSession.locationFilter === 'Semua' ? 'Seluruh Area TMII' : activeSession.locationFilter}</strong></span>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsQRScannerOpen(true)}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] sm:text-xs font-black shadow-md hover:shadow-lg active:scale-98 transition-all cursor-pointer"
              >
                <Camera size={15} />
                <span>Scan QR Kamera (Mobile)</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Apakah Anda yakin ingin membatalkan sesi stock opname ini? Semua progress pemeriksaan aktif akan hilang.')) {
                    setActiveSession(null);
                  }
                }}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Batalkan</span>
              </button>

              <button
                onClick={handleSaveSession}
                disabled={isSaving}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl text-white text-[11px] sm:text-xs font-bold shadow-md transition-all cursor-pointer"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Save size={13} />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan & Selesai'}</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-4">
            {/* Checked progress */}
            <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.01)] col-span-2 md:col-span-1">
              <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Progress Terperiksa</div>
              <div className="text-base sm:text-xl font-black text-slate-800 mt-0.5 sm:mt-1">{activeStats.checked} / {activeStats.total}</div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 sm:mt-2 overflow-hidden">
                <div 
                  className="h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${activeStats.percent}%`, backgroundColor: theme.primaryColor }}
                />
              </div>
              <span className="text-[9px] font-bold text-slate-400 mt-1 block">{activeStats.percent}% Selesai</span>
            </div>

            {/* Sesuai */}
            <div className="bg-emerald-50/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-100 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
              <div className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-wider">Aset Sesuai</div>
              <div className="text-base sm:text-xl font-black text-emerald-700 mt-0.5 sm:mt-1">{activeStats.match}</div>
              <p className="text-[9px] text-emerald-500 font-semibold mt-0.5 sm:mt-1">Lokasi ekspektasi</p>
            </div>

            {/* Salah Lokasi */}
            <div className="bg-amber-50/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-100 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
              <div className="text-[9px] sm:text-[10px] font-black text-amber-600 uppercase tracking-wider">Salah Lokasi</div>
              <div className="text-base sm:text-xl font-black text-amber-700 mt-0.5 sm:mt-1">{activeStats.mismatch}</div>
              <p className="text-[9px] text-amber-500 font-semibold mt-0.5 sm:mt-1">Tempat berbeda</p>
            </div>

            {/* Hilang */}
            <div className="bg-red-50/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-red-100 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
              <div className="text-[9px] sm:text-[10px] font-black text-red-600 uppercase tracking-wider">Aset Hilang</div>
              <div className="text-base sm:text-xl font-black text-red-700 mt-0.5 sm:mt-1">{activeStats.missing}</div>
              <p className="text-[9px] text-red-500 font-semibold mt-0.5 sm:mt-1">Tidak ditemukan</p>
            </div>

            {/* Sisa */}
            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-150 shadow-[0_4px_12px_rgba(0,0,0,0.01)] col-span-2 sm:col-span-1">
              <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Belum Diperiksa</div>
              <div className="text-base sm:text-xl font-black text-slate-600 mt-0.5 sm:mt-1">{activeStats.remaining}</div>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5 sm:mt-1">Menunggu tinjauan</p>
            </div>
          </div>

          {/* Quick barcode & mobile camera scanner */}
          <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-[11px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <QrCode size={15} className="text-amber-400" />
                  Scanner Barcode / QR Code Aset
                </h4>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Scan QR aset langsung menggunakan kamera HP / Tablet atau ketik kode fisik
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsQRScannerOpen(true)}
                className="px-3.5 py-2 sm:px-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-lg sm:rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98 shrink-0"
              >
                <Camera size={15} />
                <span>Mulai Scan Kamera (Mobile)</span>
              </button>
            </div>
            
            <form onSubmit={handleScanSubmit} className="mt-2.5 sm:mt-3 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ketik Kode Aset / Nama, tekan Enter..."
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  className="w-full bg-slate-800 text-xs sm:text-sm font-bold p-2.5 sm:p-3 pr-22 sm:pr-24 rounded-lg sm:rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400 text-white placeholder-slate-500"
                />
                <button
                  type="submit"
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-[11px] sm:text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Cocokkan
                </button>
              </div>
            </form>

            {scanMessage && (
              <div className={`mt-2.5 sm:mt-3 p-2.5 sm:p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                scanMessage.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50' : 'bg-red-950/80 text-red-300 border border-red-800/50'
              }`}>
                {scanMessage.type === 'success' ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0" /> : <AlertTriangle size={15} className="text-red-400 shrink-0" />}
                <span>{scanMessage.text}</span>
              </div>
            )}
          </div>

          {/* Checklist Area Layout */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 border-b border-slate-100 pb-3 sm:pb-4 mb-3 sm:mb-4">
              <h4 className="text-[11px] sm:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <ClipboardCheck size={14} />
                Daftar Checklist Aset ({activeSession.items.length})
              </h4>

              {/* Automatic Correction Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoCorrectLocations}
                  onChange={e => setAutoCorrectLocations(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[11px] sm:text-xs font-bold text-slate-600">
                  Perbarui lokasi database otomatis jika aset ditemukan salah lokasi
                </span>
              </label>
            </div>

            {/* Checklist items list */}
            <div className="space-y-2.5 sm:space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {activeSession.items.map(item => {
                const isChecked = item.status !== 'Belum Diperiksa';
                return (
                  <div 
                    key={item.assetId} 
                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 ${
                      item.status === 'Sesuai' ? 'bg-emerald-50/20 border-emerald-100/50' :
                      item.status === 'Tidak Sesuai' ? 'bg-amber-50/20 border-amber-100/50' :
                      item.status === 'Hilang' ? 'bg-red-50/20 border-red-100/50' :
                      'bg-slate-50/30 border-slate-100 hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Left: Metadata details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-black text-slate-400 bg-white border border-slate-200/50 px-1.5 py-0.5 rounded">
                          {item.assetCode}
                        </span>
                        
                        {/* Checked At timestamp */}
                        {item.checkedAt && (
                          <span className="text-[8px] text-slate-400 font-bold bg-white px-1 py-0.5 rounded border">
                            Ditinjau pukul {item.checkedAt}
                          </span>
                        )}
                      </div>

                      <h5 className="text-xs font-bold text-slate-800 truncate mt-1.5" title={item.assetName}>
                        {item.assetName}
                      </h5>

                      <div className="flex items-center gap-2 mt-1.5 sm:mt-2 text-[10px]">
                        <span className="font-bold text-slate-400 uppercase tracking-wider">Ekspektasi:</span>
                        <span className="font-semibold text-slate-600 flex items-center gap-0.5">
                          <MapPin size={9} />
                          {item.expectedLocation}
                        </span>

                        {item.status === 'Tidak Sesuai' && (
                          <>
                            <span className="text-slate-300">|</span>
                            <span className="font-bold text-amber-500 uppercase tracking-wider">Aktual:</span>
                            <span className="font-bold text-amber-700 flex items-center gap-0.5">
                              <MapPin size={9} />
                              {item.actualLocation}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Middle: Notes */}
                    <div className="w-full md:w-56 shrink-0">
                      <input
                        type="text"
                        placeholder="Tambahkan catatan temuan..."
                        value={item.notes || ''}
                        onChange={e => handleUpdateItemNote(item.assetId, e.target.value)}
                        className="w-full p-2 bg-white rounded-lg focus:outline-none text-[10px] border border-slate-200 font-semibold text-gray-700"
                      />
                    </div>

                    {/* Right: Tactics buttons */}
                    <div className="flex gap-1.5 shrink-0 flex-wrap">
                      {/* Button Sesuai */}
                      <button
                        onClick={() => handleUpdateItemStatus(item.assetId, 'Sesuai')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                          item.status === 'Sesuai' 
                            ? 'bg-emerald-600 text-white shadow-sm' 
                            : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
                        }`}
                      >
                        <Check size={11} strokeWidth={3} />
                        <span>Sesuai</span>
                      </button>

                      {/* Button Mismatch */}
                      <div className="relative">
                        <select
                          value={item.status === 'Tidak Sesuai' ? item.actualLocation : ''}
                          onChange={e => {
                            if (e.target.value) {
                              handleUpdateItemStatus(item.assetId, 'Tidak Sesuai', e.target.value);
                            }
                          }}
                          className={`appearance-none px-3 py-1.5 pr-6 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer ${
                            item.status === 'Tidak Sesuai'
                              ? 'bg-amber-600 border-amber-600 text-white'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <option value="">Salah Lokasi?</option>
                          {uniqueLocations.filter(l => l !== 'Semua' && l !== item.expectedLocation).map(loc => (
                            <option key={loc} value={loc}>Ada di {loc}</option>
                          ))}
                        </select>
                        <MapPin size={9} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                          item.status === 'Tidak Sesuai' ? 'text-white' : 'text-slate-400'
                        }`} />
                      </div>

                      {/* Button Hilang */}
                      <button
                        onClick={() => handleUpdateItemStatus(item.assetId, 'Hilang')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                          item.status === 'Hilang' 
                            ? 'bg-red-600 text-white shadow-sm' 
                            : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
                        }`}
                      >
                        <X size={11} strokeWidth={3} />
                        <span>Hilang</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* 2. HISTORY LOGS & SESSION START INTERFACE */
        <div className="space-y-3.5 sm:space-y-6">
          {/* Dashboard Intro */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-6">
            {/* Create new Sesi Opname card */}
            <div className="md:col-span-5 bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] h-fit">
              <h4 className="text-[11px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-1.5">
                <Play size={14} className="text-emerald-500" />
                Mulai Sesi Stock Opname Baru
              </h4>

              <form onSubmit={handleStartSession} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nama Sesi Stock Opname *</label>
                  <input
                    type="text"
                    placeholder="e.g. Stock Opname - Gedung Pengelola Q3"
                    value={formSessionName}
                    onChange={e => setFormSessionName(e.target.value)}
                    required
                    className="w-full p-2 sm:p-2.5 bg-slate-50 rounded-lg sm:rounded-xl focus:outline-none text-xs border border-slate-100 font-semibold text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Pemeriksa / Penanggung Jawab</label>
                  <input
                    type="text"
                    value={formCheckedBy}
                    onChange={e => setFormCheckedBy(e.target.value)}
                    className="w-full p-2 sm:p-2.5 bg-slate-50 rounded-lg sm:rounded-xl focus:outline-none text-xs border border-slate-100 font-semibold text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Filter Wilayah / Lokasi pemeriksaan</label>
                  <select
                    value={formLocationFilter}
                    onChange={e => setFormLocationFilter(e.target.value)}
                    className="w-full p-2 sm:p-2.5 bg-slate-50 rounded-lg sm:rounded-xl focus:outline-none text-xs border border-slate-100 font-semibold text-gray-800"
                  >
                    <option value="Semua">Semua Lokasi (Seluruh Aset)</option>
                    {uniqueLocations.filter(l => l !== 'Semua').map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 italic font-semibold">
                    * Memulai sesi hanya akan memuat aset-aset yang terdaftar pada lokasi yang dipilih.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl text-white font-bold text-xs shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: theme.primaryColor, boxShadow: `0 4px 14px ${theme.primaryColor}30` }}
                >
                  <Play size={14} />
                  <span>Mulai Sesi Checklist</span>
                </button>
              </form>
            </div>

            {/* Past History Sesi Opname table */}
            <div className="md:col-span-7 bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
              <h4 className="text-[11px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2">
                <BarChart2 size={14} />
                Riwayat Sesi Stock Opname
              </h4>

              <div className="overflow-x-auto">
                {loadingHistory ? (
                  <div className="py-20 text-center text-slate-400 text-xs">
                    Memuat log riwayat...
                  </div>
                ) : historySessions.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
                    <ClipboardCheck size={32} className="text-slate-300" />
                    <span>Belum ada log stock opname yang tersimpan.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historySessions.map(session => {
                      const totalItems = session.items.length;
                      const match = session.items.filter(i => i.status === 'Sesuai').length;
                      const mismatch = session.items.filter(i => i.status === 'Tidak Sesuai').length;
                      const missing = session.items.filter(i => i.status === 'Hilang').length;
                      const matchPercent = totalItems > 0 ? Math.round((match / totalItems) * 100) : 0;

                      return (
                        <div
                          key={session.id}
                          onClick={() => setSelectedHistorySession(session)}
                          className="p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded">
                                {session.locationFilter === 'Semua' ? 'Semua Wilayah' : session.locationFilter}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold">{session.completedAt || session.createdAt}</span>
                            </div>
                            <h5 className="text-xs font-black text-slate-800 mt-1.5 truncate">{session.sessionName}</h5>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-bold">Pemeriksa: {session.checkedBy}</div>
                          </div>

                          {/* Stat summary dots */}
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-xs font-black text-slate-800">{match} / {totalItems}</div>
                                <div className="text-[9px] text-emerald-500 font-bold">Cocok ({matchPercent}%)</div>
                              </div>
                              {mismatch > 0 && (
                                <div className="text-right">
                                  <div className="text-xs font-black text-amber-600">{mismatch}</div>
                                  <div className="text-[9px] text-amber-500 font-bold">Salah Lokasi</div>
                                </div>
                              )}
                              {missing > 0 && (
                                <div className="text-right">
                                  <div className="text-xs font-black text-red-600">{missing}</div>
                                  <div className="text-[9px] text-red-500 font-bold">Hilang</div>
                                </div>
                              )}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0" style={{ color: theme.primaryColor, backgroundColor: `${theme.primaryColor}15` }}>
                              <ArrowRight size={14} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. PAST COMPLETED SESSION MODAL */}
      {selectedHistorySession && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col h-[85vh]">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900">{selectedHistorySession.sessionName}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                  Diselesaikan pada {selectedHistorySession.completedAt || selectedHistorySession.createdAt} oleh <strong>{selectedHistorySession.checkedBy}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedHistorySession(null)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* List detail */}
            <div className="flex-1 overflow-y-auto my-4 space-y-3.5 pr-1">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-1.5 border-b mb-1">
                Laporan Hasil Pemeriksaan Aset ({selectedHistorySession.items.length} Barang)
              </div>

              {selectedHistorySession.items.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    item.status === 'Sesuai' ? 'bg-emerald-50/20 border-emerald-100/50' :
                    item.status === 'Tidak Sesuai' ? 'bg-amber-50/20 border-amber-100/50' :
                    item.status === 'Hilang' ? 'bg-red-50/20 border-red-100/50' :
                    'bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border">{item.assetCode}</span>
                      <span className={`inline-block px-1.5 py-0.5 text-[8px] font-black rounded ${
                        item.status === 'Sesuai' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'Tidak Sesuai' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="font-bold text-slate-800 mt-1.5">{item.assetName}</div>
                    <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-2">
                      <span>Ekspektasi: <strong>{item.expectedLocation}</strong></span>
                      {item.status === 'Tidak Sesuai' && (
                        <span>• Aktual: <strong className="text-amber-600">{item.actualLocation}</strong></span>
                      )}
                    </div>
                  </div>

                  {item.notes && (
                    <div className="sm:text-right max-w-xs shrink-0">
                      <div className="text-[8px] text-slate-400 uppercase font-black">Catatan Pemeriksa</div>
                      <div className="text-[10px] text-slate-600 italic font-semibold mt-0.5">"{item.notes}"</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Close */}
            <div className="flex justify-end pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setSelectedHistorySession(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Tutup Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Camera Scanner Modal for Mobile Stock Opname */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanResult={handleCameraScanResult}
        title="Scan QR Code Aset (Stock Opname)"
        subtitle="Arahkan kamera HP ke label QR Code aset untuk pencocokan fisik otomatis"
      />
    </div>
  );
}
