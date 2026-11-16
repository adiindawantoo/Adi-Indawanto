import React, { useState, useEffect, useMemo } from 'react';
import { FixedAsset, AppTheme, AssetTransfer, ConfiguredLocation, DEFAULT_ASSET_LOCATIONS, TmiiRegionName } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { ArrowRight, FileText, Printer, Check, Search, Calendar, MapPin, User, Plus, X, History, RefreshCw, Trash2 } from 'lucide-react';
import TmiiLogo from './TmiiLogo';
import LocationAutoComplete from './LocationAutoComplete';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface FixedAssetsMutationProps {
  assets: FixedAsset[];
  theme: AppTheme;
  configuredLocations?: ConfiguredLocation[];
  onUpdateAsset: (asset: FixedAsset) => Promise<void>;
  currentUserDisplayName?: string | null;
}

export default function FixedAssetsMutation({ assets, theme, configuredLocations = [], onUpdateAsset, currentUserDisplayName }: FixedAssetsMutationProps) {
  // Real-time historical transfers list
  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);

  // Active locations list from settings
  const activeLocationsList = useMemo(() => {
    if (configuredLocations && configuredLocations.length > 0) {
      return configuredLocations;
    }
    return DEFAULT_ASSET_LOCATIONS.map((loc, idx) => ({
      id: `default-${idx}`,
      name: loc.name,
      region: loc.region,
      description: loc.description,
      createdAt: ''
    }));
  }, [configuredLocations]);

  const regionsList: TmiiRegionName[] = ['Wilayah Utara', 'Wilayah Selatan', 'Wilayah Barat', 'Wilayah Timur', 'Wilayah Pusat'];
  const [isManualDestination, setIsManualDestination] = useState(false);

  // Form states
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [destinationArea, setDestinationArea] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [senderName, setSenderName] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [assetManagerName, setAssetManagerName] = useState(currentUserDisplayName || 'Asset Management TMII');
  const [reason, setReason] = useState('');
  const [customDocumentNo, setCustomDocumentNo] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);

  // Selected transfer for BAST modal / print view
  const [previewTransfer, setPreviewTransfer] = useState<AssetTransfer | null>(null);
  const [transferToDelete, setTransferToDelete] = useState<AssetTransfer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search in dropdown asset selection
  const [assetSearch, setAssetSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Listen for real-time mutations from Firebase
  useEffect(() => {
    const transfersQuery = query(collection(db, 'fixed_asset_transfers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(transfersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AssetTransfer[];
      setTransfers(data);
      setLoadingTransfers(false);
    }, (err) => {
      console.error('Error fetching transfers:', err);
      setLoadingTransfers(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter assets based on search in form dropdown
  const filteredAssetsForDropdown = useMemo(() => {
    return assets.filter(a => {
      const nameMatch = a.name.toLowerCase().includes(assetSearch.toLowerCase());
      const codeMatch = a.code.toLowerCase().includes(assetSearch.toLowerCase());
      return nameMatch || codeMatch;
    });
  }, [assets, assetSearch]);

  const selectedAsset = useMemo(() => {
    return assets.find(a => a.id === selectedAssetId) || null;
  }, [assets, selectedAssetId]);

  // Generate a standard document number automatically
  useEffect(() => {
    if (selectedAsset) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setCustomDocumentNo(`BAST/TMII-FA/${year}/${month}/${randomSuffix}`);
    } else {
      setCustomDocumentNo('');
    }
  }, [selectedAsset]);

  const handleAssetSelect = (asset: FixedAsset) => {
    setSelectedAssetId(asset.id);
    setAssetSearch(`${asset.code} - ${asset.name}`);
    setIsDropdownOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    if (!destinationLocation || !senderName || !receiverName) {
      alert('Mohon lengkapi seluruh field yang bertanda bintang (*).');
      return;
    }

    setIsFormSubmitting(true);
    setSuccessMessage(null);

    try {
      const transferData: Omit<AssetTransfer, 'id'> = {
        assetId: selectedAsset.id,
        assetCode: selectedAsset.code,
        assetName: selectedAsset.name,
        originArea: selectedAsset.area || 'Tidak Ada Area',
        originLocation: selectedAsset.location || 'Tidak Ada Lokasi',
        destinationArea: destinationArea || '-',
        destinationLocation: destinationLocation,
        transferDate: transferDate,
        senderName: senderName,
        receiverName: receiverName,
        assetManagerName: assetManagerName,
        reason: reason || 'Mutasi asset operasional rutin',
        documentNo: customDocumentNo,
        createdAt: new Date().toISOString()
      };

      // 1. Save transfer record to Firestore
      const docRef = await addDoc(collection(db, 'fixed_asset_transfers'), transferData);
      
      // 2. Update physical asset location & area in Firestore
      const updatedAsset: FixedAsset = {
        ...selectedAsset,
        location: destinationLocation,
        area: destinationArea || selectedAsset.area || '-'
      };
      await onUpdateAsset(updatedAsset);

      const createdTransfer: AssetTransfer = {
        id: docRef.id,
        ...transferData
      };

      setSuccessMessage(`Aset "${selectedAsset.name}" berhasil dipindahkan ke lokasi "${destinationLocation}".`);
      
      // Open BAST modal for printing immediately!
      setPreviewTransfer(createdTransfer);

      // Reset form
      setSelectedAssetId('');
      setAssetSearch('');
      setDestinationArea('');
      setDestinationLocation('');
      setSenderName('');
      setReceiverName('');
      setReason('');
    } catch (err) {
      console.error('Failed to submit transfer:', err);
      alert('Gagal merekam mutasi aset. Silakan coba kembali.');
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handlePrintBAST = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const confirmDeleteTransfer = async () => {
    if (!transferToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'fixed_asset_transfers', transferToDelete.id));
      setSuccessMessage(`Riwayat mutasi BAST "${transferToDelete.documentNo}" telah berhasil dihapus.`);
      setTransferToDelete(null);
    } catch (err) {
      console.error('Failed to delete transfer:', err);
      alert('Gagal menghapus riwayat mutasi dari database.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper function to convert OKLCH color strings to RGB/RGBA strings
  const oklchToRgbString = (oklchStr: string): string => {
    if (!oklchStr || typeof oklchStr !== 'string' || !oklchStr.includes('oklch')) {
      return oklchStr;
    }
    return oklchStr.replace(/oklch\(\s*([\d.%]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/gi, (match, lRaw, cRaw, hRaw, aRaw) => {
      let l = lRaw.endsWith('%') ? parseFloat(lRaw) / 100 : parseFloat(lRaw);
      let c = parseFloat(cRaw);
      let h = parseFloat(hRaw);
      let alpha = aRaw ? (aRaw.endsWith('%') ? parseFloat(aRaw) / 100 : parseFloat(aRaw)) : 1;

      const hRad = (h * Math.PI) / 180;
      const aLab = c * Math.cos(hRad);
      const bLab = c * Math.sin(hRad);

      const l_ = l + 0.3963377774 * aLab + 0.2158037573 * bLab;
      const m_ = l - 0.1055613458 * aLab - 0.0638541728 * bLab;
      const s_ = l - 0.0894841775 * aLab - 1.2914855480 * bLab;

      const l3 = l_ * l_ * l_;
      const m3 = m_ * m_ * m_;
      const s3 = s_ * s_ * s_;

      let rLinear = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
      let gLinear = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
      let bLinear = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

      const toSrgb = (x: number) => {
        x = Math.max(0, Math.min(1, x));
        return Math.round((x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055) * 255);
      };

      const r = toSrgb(rLinear);
      const g = toSrgb(gLinear);
      const b = toSrgb(bLinear);

      if (alpha < 1) {
        return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
      }
      return `rgb(${r}, ${g}, ${b})`;
    });
  };

  const downloadBASTPDF = async (transfer: AssetTransfer) => {
    try {
      const element = document.getElementById('bast-document-preview');
      if (!element) {
        alert('Gagal mendeteksi pratinjau dokumen. Silakan buka pratinjau terlebih dahulu.');
        return;
      }
      
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // Convert all oklch in <style> tags to valid RGB
          clonedDoc.querySelectorAll('style').forEach((styleEl) => {
            if (styleEl.textContent && styleEl.textContent.includes('oklch')) {
              styleEl.textContent = oklchToRgbString(styleEl.textContent);
            }
          });

          // Convert all oklch in inline styles
          clonedDoc.querySelectorAll('*').forEach((el) => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.style && htmlEl.style.cssText && htmlEl.style.cssText.includes('oklch')) {
              htmlEl.style.cssText = oklchToRgbString(htmlEl.style.cssText);
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`BAST_${transfer.documentNo.replace(/[\/\\]/g, '_')}.pdf`);
    } catch (error) {
      console.error("Gagal mengunduh BAST PDF, mengalihkan ke Cetak/Save PDF Browser:", error);
      window.focus();
      setTimeout(() => window.print(), 100);
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-6" id="assets-mutation-container">
      {/* SCREEN-ONLY VIEW */}
      <div className="print:hidden space-y-3.5 sm:space-y-6">
        {/* Banner header */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-100">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowRight size={18} className="text-slate-500 shrink-0" style={{ color: theme.primaryColor }} />
            <span>Pemindahan / Mutasi Aset Tetap</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-snug">
            Gunakan modul ini untuk melakukan mutasi atau serah terima aset ke unit/lokasi lain. Sistem secara otomatis memperbarui lokasi aset fisik dan menghasilkan Dokumen Berita Acara Serah Terima (BAST) untuk dicetak.
          </p>
        </div>

        {/* Form and Quick History split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-6">
          {/* Transfer Form Panel */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
              <h4 className="text-[11px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2">
                <Plus size={14} />
                Form Mutasi Aset Baru
              </h4>

              {successMessage && (
                <div className="mb-4 p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <div className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Searchable Asset Select Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Aset yang Dipindahkan *</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari Kode / Nama Aset..."
                      value={assetSearch}
                      onChange={(e) => {
                        setAssetSearch(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full p-2.5 pl-3.5 pr-10 bg-slate-50 rounded-xl focus:outline-none text-xs border border-slate-100 font-semibold text-gray-800"
                    />
                    {selectedAssetId ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssetId('');
                          setAssetSearch('');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 max-h-48 overflow-y-auto z-20 p-1 divide-y divide-slate-50">
                      {filteredAssetsForDropdown.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">Tidak ada aset cocok.</div>
                      ) : (
                        filteredAssetsForDropdown.map(asset => (
                          <div
                            key={asset.id}
                            onClick={() => handleAssetSelect(asset)}
                            className="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs flex justify-between items-center"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-slate-800 truncate">{asset.name}</div>
                              <div className="font-mono text-[9px] text-slate-400 mt-0.5">{asset.code}</div>
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded shrink-0">{asset.location}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Original Details Display */}
                {selectedAsset && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100/60 text-[11px] text-slate-600 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400">Lokasi Saat Ini:</span>
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <MapPin size={11} /> {selectedAsset.location}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400">Area Asal:</span>
                      <span className="font-bold text-slate-700">{selectedAsset.area || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400">Kondisi Aset:</span>
                      <span className="font-bold text-slate-700">{selectedAsset.condition}</span>
                    </div>
                  </div>
                )}

                {/* Destination location & area */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Lokasi Tujuan Mutasi * <span className="normal-case font-normal text-[11px] text-amber-800">(Fitur Auto-fill Ketik / Pilih)</span>
                    </label>
                    <LocationAutoComplete
                      value={destinationLocation}
                      onChange={(val, matched) => {
                        setDestinationLocation(val);
                        if (matched) {
                          setDestinationArea(matched.region);
                        }
                      }}
                      locations={configuredLocations}
                      placeholder="Ketik atau pilih lokasi tujuan mutasi..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Area Tujuan *</label>
                    <select
                      value={destinationArea}
                      onChange={e => setDestinationArea(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-xs border border-slate-200 font-semibold text-gray-800 cursor-pointer"
                    >
                      <option value="">-- Pilih Wilayah Area Tujuan --</option>
                      <option value="Wilayah Utara">Wilayah Utara</option>
                      <option value="Wilayah Selatan">Wilayah Selatan</option>
                      <option value="Wilayah Barat">Wilayah Barat</option>
                      <option value="Wilayah Timur">Wilayah Timur</option>
                      <option value="Wilayah Pusat">Wilayah Pusat</option>
                    </select>
                  </div>
                </div>

                {/* Signees */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Yang Menyerahkan *</label>
                      <input
                        type="text"
                        placeholder="Nama Staff Penyerah"
                        value={senderName}
                        onChange={e => setSenderName(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-xs border border-slate-100 font-semibold text-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Yang Menerima *</label>
                      <input
                        type="text"
                        placeholder="Nama Staff Penerima"
                        value={receiverName}
                        onChange={e => setReceiverName(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-xs border border-slate-100 font-semibold text-gray-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Mengetahui (Asset Management)</label>
                    <input
                      type="text"
                      placeholder="Nama Asset Manager"
                      value={assetManagerName}
                      onChange={e => setAssetManagerName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-xs border border-slate-100 font-semibold text-gray-800"
                    />
                  </div>
                </div>

                {/* Transfer Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">No. BAST (Otomatis)</label>
                    <input
                      type="text"
                      value={customDocumentNo}
                      onChange={e => setCustomDocumentNo(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-[10px] font-mono border border-slate-100 font-bold text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tanggal Transfer</label>
                    <input
                      type="date"
                      value={transferDate}
                      onChange={e => setTransferDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-xs border border-slate-100 font-semibold text-gray-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Alasan Pemindahan / Catatan</label>
                  <textarea
                    placeholder="Contoh: Penataan ulang dekorasi Sasono Utomo menjelang upacara adat"
                    rows={2}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-xs border border-slate-100 font-semibold text-gray-800 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isFormSubmitting || !selectedAssetId}
                  className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs shadow-md hover:brightness-105 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ backgroundColor: theme.primaryColor, boxShadow: `0 4px 14px ${theme.primaryColor}30` }}
                >
                  {isFormSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      Merekam Mutasi...
                    </span>
                  ) : (
                    <span>Simpan & Cetak BAST</span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Transfer History Logs Table */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] h-full flex flex-col">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <History size={14} />
                Riwayat Mutasi & Cetak Ulang BAST
              </h4>

              <div className="flex-1 overflow-x-auto">
                {loadingTransfers ? (
                  <div className="py-20 text-center text-slate-400 text-xs">
                    Memuat riwayat pemindahan aset...
                  </div>
                ) : transfers.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
                    <FileText size={28} className="text-slate-300" />
                    <span>Belum ada transaksi mutasi/serah terima aset yang tercatat.</span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[550px] text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <th className="py-3 px-3">Tanggal</th>
                        <th className="py-3 px-3">No. BAST</th>
                        <th className="py-3 px-3">Kode/Nama Aset</th>
                        <th className="py-3 px-3">Alur Lokasi</th>
                        <th className="py-3 px-3 text-center">BAST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {transfers.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-3 text-slate-500 font-semibold">{t.transferDate}</td>
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-700">{t.documentNo}</td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-900">{t.assetName}</div>
                            <div className="font-mono text-[9px] text-slate-400 mt-0.5">{t.assetCode}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-500">{t.originLocation}</span>
                              <ArrowRight size={10} className="text-slate-300 shrink-0" />
                              <span className="font-bold text-indigo-600" style={{ color: theme.primaryColor }}>{t.destinationLocation}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{t.reason}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewTransfer(t);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
                                title="Cetak Berita Acara (BAST)"
                              >
                                <FileText size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransferToDelete(t);
                                }}
                                className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:text-red-700 hover:bg-red-50 transition-all cursor-pointer"
                                title="Hapus Riwayat Mutasi"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {transferToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-50 rounded-2xl">
                <Trash2 size={20} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Konfirmasi Hapus Riwayat Mutasi</h3>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Apakah Anda yakin ingin menghapus catatan mutasi BAST <strong className="text-slate-900">{transferToDelete.documentNo}</strong> untuk aset <strong className="text-slate-900">{transferToDelete.assetName}</strong>? Tindakan ini akan menghapus dokumen dari riwayat database secara permanen.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTransferToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteTransfer}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BAST MODAL (SCREEN) */}
      {previewTransfer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col h-[90vh]">
            {/* Header toolbar */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900">Dokumen BAST Siap Cetak</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Tinjau kesesuaian data sebelum mencetak dokumen fisik</p>
                <div className="mt-1 text-[8px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-100 font-medium max-w-xs">
                  Tip: Gunakan "Unduh BAST" jika tombol Cetak terhalang oleh frame editor browser.
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadBASTPDF(previewTransfer)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-bold shadow-sm transition-all cursor-pointer"
                  title="Unduh dokumen dalam format PDF"
                >
                  <FileText size={13} className="text-slate-500" />
                  <span>Unduh BAST (PDF)</span>
                </button>
                <button
                  onClick={handlePrintBAST}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md cursor-pointer"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <Printer size={13} />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  onClick={() => setPreviewTransfer(null)}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Simulated BAST document inside container */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 rounded-2xl border border-slate-200/50 shadow-inner">
              <div id="bast-document-preview" className="bg-white p-8 max-w-[21cm] mx-auto min-h-[29.7cm] shadow-sm border border-slate-250 font-serif text-slate-950 text-[11px] leading-relaxed relative">
                
                {/* Header letter */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-6">
                  <div className="flex items-center gap-3">
                    <TmiiLogo height="2.5rem" color={theme.primaryColor} />
                    <div className="text-left font-sans">
                      <div className="text-[13px] font-black tracking-wider text-slate-900">PT Bhumi Visatanda Indonesia</div>
                      <div className="text-[9.5px] font-bold text-slate-700 mt-0.5">Taman Mini Indonesia Indah</div>
                      <div className="text-[8px] text-slate-500 font-medium">Sistem Manajemen Aset Nusantara</div>
                    </div>
                  </div>
                  <div className="text-right text-[8px] font-mono text-slate-400">
                    TMII-FA-BAST-FORM
                  </div>
                </div>

                {/* BAST Title */}
                <div className="text-center space-y-1 mb-6 font-sans">
                  <h4 className="text-[12px] font-bold tracking-wider text-slate-900 uppercase">BERITA ACARA SERAH TERIMA (BAST)</h4>
                  <p className="text-[9px] font-bold text-slate-600">Nomor: {previewTransfer.documentNo}</p>
                </div>

                {/* Opening body text */}
                <p className="mb-4">
                  Pada hari ini, tanggal <strong>{previewTransfer.transferDate}</strong>, telah dilakukan serah terima fisik barang milik operasional Taman Mini Indonesia Indah sebagai bagian dari penataan dan mutasi berkala aset tetap nusantara. Para pihak yang terlibat di bawah ini sepakat melakukan serah terima dengan rincian sebagai berikut:
                </p>

                {/* Asset details table */}
                <table className="w-full text-left border-collapse border border-slate-900 my-4 text-[10px] font-sans">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-900 p-2 font-bold w-1/3">Informasi Parameter</th>
                      <th className="border border-slate-900 p-2 font-bold">Rincian Deskripsi Aset</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-900 p-2 font-bold">Kode Barang</td>
                      <td className="border border-slate-900 p-2 font-mono font-bold text-[11px]">{previewTransfer.assetCode}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-900 p-2 font-bold">Nama Barang</td>
                      <td className="border border-slate-900 p-2 font-semibold text-slate-900">{previewTransfer.assetName}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-900 p-2 font-bold">Area Asal</td>
                      <td className="border border-slate-900 p-2">{previewTransfer.originArea}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-900 p-2 font-bold">Lokasi Asal</td>
                      <td className="border border-slate-900 p-2 font-semibold">{previewTransfer.originLocation}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-900 p-2 font-bold font-semibold text-indigo-600" style={{ color: theme.primaryColor }}>Area Baru / Tujuan</td>
                      <td className="border border-slate-900 p-2 font-semibold text-slate-900">{previewTransfer.destinationArea}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-900 p-2 font-bold font-semibold text-indigo-600" style={{ color: theme.primaryColor }}>Lokasi Baru / Tujuan</td>
                      <td className="border border-slate-900 p-2 font-bold text-indigo-600" style={{ color: theme.primaryColor }}>{previewTransfer.destinationLocation}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-900 p-2 font-bold">Keterangan / Alasan</td>
                      <td className="border border-slate-900 p-2 italic text-slate-600">{previewTransfer.reason}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Closing text */}
                <p className="mb-8">
                  Demikian Berita Acara Serah Terima ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagai landasan administrasi data inventaris mutasi fisik aset secara sah. Sejak ditandatanganinya dokumen ini, maka kendali operasional, perawatan, dan pelaporan aset sepenuhnya dialihkan kepada lokasi baru.
                </p>

                {/* Signature grids */}
                <div className="grid grid-cols-3 gap-2 text-center mt-12 font-sans text-[10px]">
                  <div>
                    <div className="font-bold text-slate-800">Yang Menyerahkan,</div>
                    <div className="h-16 flex items-end justify-center">
                      <span className="text-[8px] text-slate-400 italic">tanda tangan fisik</span>
                    </div>
                    <div className="font-bold underline mt-2 text-slate-900">{previewTransfer.senderName}</div>
                    <div className="text-[8px] text-slate-400">Staff Unit Penyerah</div>
                  </div>

                  <div>
                    <div className="font-bold text-slate-800">Mengetahui,</div>
                    <div className="h-16 flex items-end justify-center">
                      <span className="text-[8px] text-slate-400 italic">approval system digital</span>
                    </div>
                    <div className="font-bold underline mt-2 text-slate-900">{previewTransfer.assetManagerName}</div>
                    <div className="text-[8px] text-slate-400">Asset Management Officer</div>
                  </div>

                  <div>
                    <div className="font-bold text-slate-800">Yang Menerima,</div>
                    <div className="h-16 flex items-end justify-center">
                      <span className="text-[8px] text-slate-400 italic">tanda tangan fisik</span>
                    </div>
                    <div className="font-bold underline mt-2 text-slate-900">{previewTransfer.receiverName}</div>
                    <div className="text-[8px] text-slate-400">Staff Unit Penerima</div>
                  </div>
                </div>

                <div className="absolute bottom-4 left-8 right-8 text-center text-[7px] text-slate-400 font-sans border-t border-slate-100 pt-2">
                  Dokumen ini sah dihasilkan secara sistem digital melalui Sistem Manajemen Aset Nusantara - TMII.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY AREA (This is absolutely visible only on printing BAST and handles fullscreen) */}
      {previewTransfer && (
        <div className="hidden print:block bg-white text-black p-0 m-0" id="print-bast-only">
          <style>{`
            @media print {
              body {
                visibility: hidden !important;
                background-color: white !important;
                background-image: none !important;
              }
              #print-bast-only, #print-bast-only * {
                visibility: visible !important;
              }
              #print-bast-only {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              @page {
                size: A4 portrait;
                margin: 20mm;
              }
            }
          `}</style>
          
          <div className="font-serif text-black text-xs leading-relaxed max-w-[21cm] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-8">
              <div className="flex items-center gap-3">
                <div className="text-left font-sans">
                  <div className="text-base font-black tracking-wider text-black">PT Bhumi Visatanda Indonesia</div>
                  <div className="text-xs font-bold text-gray-800 mt-0.5">Taman Mini Indonesia Indah</div>
                  <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wider">Sistem Manajemen Aset Nusantara</div>
                </div>
              </div>
              <div className="text-right text-[9px] font-mono text-gray-400">
                BAST-{previewTransfer.assetCode}
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-1 mb-8 font-sans">
              <h4 className="text-sm font-bold tracking-wider text-black uppercase">BERITA ACARA SERAH TERIMA (BAST) MUTASI</h4>
              <p className="text-[10px] font-bold">Nomor Dokumen: {previewTransfer.documentNo}</p>
            </div>

            {/* Opener */}
            <p className="mb-4 text-xs">
              Pada hari ini, tanggal <strong>{previewTransfer.transferDate}</strong>, telah dilakukan serah terima fisik barang milik operasional Taman Mini Indonesia Indah sebagai bagian dari penataan dan mutasi berkala aset tetap nusantara. Para pihak yang terlibat di bawah ini sepakat melakukan serah terima dengan rincian sebagai berikut:
            </p>

            {/* Table */}
            <table className="w-full text-left border-collapse border border-black my-6 text-xs font-sans">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2.5 font-bold w-1/3">Informasi Parameter</th>
                  <th className="border border-black p-2.5 font-bold">Rincian Deskripsi Aset</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-2.5 font-bold">Kode Barang</td>
                  <td className="border border-black p-2.5 font-mono font-bold">{previewTransfer.assetCode}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2.5 font-bold">Nama Barang</td>
                  <td className="border border-black p-2.5 font-bold">{previewTransfer.assetName}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2.5 font-bold">Area Asal</td>
                  <td className="border border-black p-2.5">{previewTransfer.originArea}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2.5 font-bold">Lokasi Asal</td>
                  <td className="border border-black p-2.5 font-semibold">{previewTransfer.originLocation}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2.5 font-bold">Area Baru / Tujuan</td>
                  <td className="border border-black p-2.5 font-bold">{previewTransfer.destinationArea}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2.5 font-bold">Lokasi Baru / Tujuan</td>
                  <td className="border border-black p-2.5 font-bold">{previewTransfer.destinationLocation}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2.5 font-bold">Keterangan / Alasan</td>
                  <td className="border border-black p-2.5 italic">{previewTransfer.reason}</td>
                </tr>
              </tbody>
            </table>

            {/* Closing text */}
            <p className="mb-10 text-xs">
              Demikian Berita Acara Serah Terima ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagai landasan administrasi data inventaris mutasi fisik aset secara sah. Sejak ditandatanganinya dokumen ini, maka kendali operasional, perawatan, dan pelaporan aset sepenuhnya dialihkan kepada lokasi baru.
            </p>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-3 text-center mt-16 font-sans text-xs">
              <div>
                <div className="font-bold">Yang Menyerahkan,</div>
                <div className="h-20 border-b border-dashed border-gray-300 flex items-end justify-center mb-2">
                  <span className="text-[9px] text-gray-300 italic mb-2">tanda tangan fisik</span>
                </div>
                <div className="font-bold underline">{previewTransfer.senderName}</div>
                <div className="text-[9px] text-gray-500">Staff Unit Penyerah</div>
              </div>

              <div>
                <div className="font-bold">Mengetahui,</div>
                <div className="h-20 border-b border-dashed border-gray-300 flex items-end justify-center mb-2">
                  <span className="text-[9px] text-gray-300 italic mb-2">tanda tangan / stempel digital</span>
                </div>
                <div className="font-bold underline">{previewTransfer.assetManagerName}</div>
                <div className="text-[9px] text-gray-500">Asset Management Officer</div>
              </div>

              <div>
                <div className="font-bold">Yang Menerima,</div>
                <div className="h-20 border-b border-dashed border-gray-300 flex items-end justify-center mb-2">
                  <span className="text-[9px] text-gray-300 italic mb-2">tanda tangan fisik</span>
                </div>
                <div className="font-bold underline">{previewTransfer.receiverName}</div>
                <div className="text-[9px] text-gray-500">Staff Unit Penerima</div>
              </div>
            </div>

            <div className="mt-20 text-center text-[9px] text-gray-400 font-sans border-t border-gray-200 pt-3">
              Dokumen ini sah dihasilkan secara sistem digital melalui Sistem Manajemen Aset Nusantara - TMII.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
