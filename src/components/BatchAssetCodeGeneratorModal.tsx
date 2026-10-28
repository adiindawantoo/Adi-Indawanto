import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Check, 
  Copy, 
  FileSpreadsheet, 
  X, 
  Search, 
  ArrowRight, 
  SlidersHorizontal,
  Loader2,
  Database,
  RefreshCw,
  Info,
  ShieldCheck,
  Building2,
  MapPin
} from 'lucide-react';
import { FixedAsset, ConfiguredLocation, ConfiguredCategory, AppTheme } from '../types';
import { 
  generateBatchAssetCodes, 
  BatchAssetCodeItem, 
  BatchGenerateOptions 
} from '../lib/assetCodeGenerator';
import { exportToExcel } from '../lib/excel';

interface BatchAssetCodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: FixedAsset[];
  configuredLocations: ConfiguredLocation[];
  configuredCategories: ConfiguredCategory[];
  onUpdateAsset: (id: string, asset: Partial<FixedAsset>) => Promise<void>;
  theme: AppTheme;
}

export default function BatchAssetCodeGeneratorModal({
  isOpen,
  onClose,
  assets,
  configuredLocations,
  configuredCategories,
  onUpdateAsset,
  theme
}: BatchAssetCodeGeneratorModalProps) {
  const [mode, setMode] = useState<'non_standard_only' | 'all_assets'>('non_standard_only');
  const [filterTab, setFilterTab] = useState<'all' | 'need_change' | 'already_standard'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState<{ current: number; total: number } | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Compute batch code generation results
  const batchResult = useMemo(() => {
    return generateBatchAssetCodes(assets, {
      mode,
      configuredLocations,
      configuredCategories
    });
  }, [assets, mode, configuredLocations, configuredCategories]);

  // Initial selection: auto-select assets that need change
  React.useEffect(() => {
    if (isOpen) {
      const needChangeIds = new Set(
        batchResult.items.filter(item => item.hasChanged).map(i => i.id)
      );
      setSelectedIds(needChangeIds);
      setSuccessMessage(null);
    }
  }, [isOpen, batchResult.items]);

  // Filtered items based on search and tab
  const filteredItems = useMemo(() => {
    return batchResult.items.filter(item => {
      // Tab filter
      if (filterTab === 'need_change' && !item.hasChanged) return false;
      if (filterTab === 'already_standard' && item.hasChanged) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        item.currentCode.toLowerCase().includes(q) ||
        item.generatedCode.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    });
  }, [batchResult.items, filterTab, searchQuery]);

  // Checkbox handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredItems.forEach(i => next.add(i.id));
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredItems.forEach(i => next.delete(i.id));
      return next;
    });
  };

  // Copy all generated codes to clipboard
  const handleCopyCodes = async () => {
    const lines = [
      'No\tID Aset\tNama Barang\tKode Lama\tKode Baru Standar TMII\tLokasi\tKategori',
      ...filteredItems.map((item, idx) => 
        `${idx + 1}\t${item.id}\t${item.name}\t${item.currentCode}\t${item.generatedCode}\t${item.location}\t${item.category || '-'}`
      )
    ].join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredItems.map((item, idx) => ({
      'No': idx + 1,
      'ID Aset': item.id,
      'Nama Barang': item.name,
      'Merk/Tipe': item.brand || '-',
      'Kepemilikan': item.ownership || '-',
      'Lokasi': item.location,
      'Kategori': item.category || '-',
      'Jenis/Tipe': item.type || '-',
      'Tanggal Perolehan': item.acquisitionDate || '-',
      'Kode Lama': item.currentCode,
      'Status Kode Lama': item.isCurrentCodeValid ? 'Standar TMII' : 'Non-Standar / Kosong',
      'Kode Baru (Standar TMII)': item.generatedCode,
      'Status Perubahan': item.hasChanged ? 'Akan Diperbarui' : 'Sudah Sesuai',
      'Prefix TMII': item.prefix,
      'Nomor Urut': item.sequenceNumber
    }));

    exportToExcel(exportData, `Daftar_Kodefikasi_Aset_TMII_${new Date().toISOString().split('T')[0]}`);
  };

  // Commit updates to database
  const handleApplyToDatabase = async () => {
    const itemsToUpdate = batchResult.items.filter(
      item => selectedIds.has(item.id) && item.hasChanged
    );

    if (itemsToUpdate.length === 0) {
      alert('Tidak ada aset terpilih yang memerlukan perubahan kode.');
      return;
    }

    const confirmMsg = `Anda akan memperbarui kode aset untuk ${itemsToUpdate.length} unit ke format standar TMII.\n\nTindakan ini akan langsung menyinkronkan data ke database Firestore. Lanjutkan?`;
    if (!window.confirm(confirmMsg)) return;

    setIsApplying(true);
    setApplyProgress({ current: 0, total: itemsToUpdate.length });

    let successCount = 0;
    try {
      for (let i = 0; i < itemsToUpdate.length; i++) {
        const item = itemsToUpdate[i];
        await onUpdateAsset(item.id, {
          code: item.generatedCode
        });
        successCount++;
        setApplyProgress({ current: i + 1, total: itemsToUpdate.length });
      }

      setSuccessMessage(`Berhasil memperbarui ${successCount} kode aset ke format standar resmi TMII!`);
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error('Error batch updating asset codes:', err);
      alert(`Terjadi kendala saat memperbarui aset: ${err.message}`);
    } finally {
      setIsApplying(false);
      setApplyProgress(null);
    }
  };

  if (!isOpen) return null;

  const selectedCountInFiltered = filteredItems.filter(i => selectedIds.has(i.id)).length;
  const totalSelectedCount = selectedIds.size;
  const selectedChangeCount = batchResult.items.filter(i => selectedIds.has(i.id) && i.hasChanged).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        className="bg-white w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-400/30">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Standardisasi & Generator Semua Kode Aset</h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-400/20 border border-indigo-300/30 text-indigo-200 font-mono font-bold">
                  Standar TMII: K1K2.K3K4.K5-K6
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Generate kodefikasi resmi terpadu untuk seluruh portofolio aset tetap dengan penomoran urut sekuensial bebas tabrakan.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Aset Terdata</span>
              <span className="text-base font-extrabold text-white mt-0.5 block">{batchResult.totalAssets} Unit</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
              <span className="text-emerald-300 block text-[10px] uppercase font-bold">Sudah Format Standar</span>
              <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">{batchResult.validStandardCount} Unit</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
              <span className="text-amber-300 block text-[10px] uppercase font-bold">Perlu Standardisasi</span>
              <span className="text-base font-extrabold text-amber-400 mt-0.5 block">{batchResult.nonStandardCount} Unit</span>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
              <span className="text-indigo-300 block text-[10px] uppercase font-bold">Grup Prefix Terdaftar</span>
              <span className="text-base font-extrabold text-indigo-300 mt-0.5 block">{batchResult.prefixGroupsCount} Kelompok</span>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex items-center justify-between text-emerald-800 text-xs font-semibold"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button 
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar & Options */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Mode Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mode Generator:</span>
              <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => setMode('non_standard_only')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    mode === 'non_standard_only'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚡ Perbarui Hanya Non-Standar / Kosong
                </button>
                <button
                  type="button"
                  onClick={() => setMode('all_assets')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    mode === 'all_assets'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔄 Standarisasi Total (Semua Aset)
                </button>
              </div>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                {mode === 'non_standard_only'
                  ? '(Mempertahankan aset yang sudah berformat standar TMII)'
                  : '(Menata ulang urutan 001, 002... secara kronologis)'}
              </span>
            </div>

            {/* Export & Copy Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCodes}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Salin semua baris kode ke clipboard"
              >
                {copiedNotification ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedNotification ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-emerald-700 rounded-xl border border-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Unduh tabel perbandingan ke file Excel"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span>Ekspor Excel</span>
              </button>
            </div>
          </div>

          {/* Search, Filter Tabs, and Bulk Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama barang, kode lama, lokasi, kategori..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  filterTab === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Semua ({batchResult.totalAssets})
              </button>
              <button
                onClick={() => setFilterTab('need_change')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  filterTab === 'need_change'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-amber-700 border border-slate-200 hover:bg-amber-50'
                }`}
              >
                Perlu Perubahan ({batchResult.changedCount})
              </button>
              <button
                onClick={() => setFilterTab('already_standard')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  filterTab === 'already_standard'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-emerald-700 border border-slate-200 hover:bg-emerald-50'
                }`}
              >
                Sudah Sesuai ({batchResult.totalAssets - batchResult.changedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Bulk Selection Header */}
          <div className="flex items-center justify-between mb-3 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={filteredItems.length > 0 && selectedCountInFiltered === filteredItems.length}
                  onChange={e => {
                    if (e.target.checked) {
                      handleSelectAllFiltered();
                    } else {
                      handleDeselectAllFiltered();
                    }
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span>Pilih Semua Tampilan ({selectedCountInFiltered}/{filteredItems.length})</span>
              </label>
              {totalSelectedCount > 0 && (
                <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {totalSelectedCount} unit terpilih ({selectedChangeCount} akan berubah)
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 hidden sm:block">
              Format: <strong>[K1: Milik][K2: Zona].[K3: Kat][K4: Tipe].[K5: Thn]-[K6: NoUrut]</strong>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3 w-10 text-center">Pilih</th>
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th className="py-3 px-4 min-w-[200px]">Nama Barang & Merek</th>
                  <th className="py-3 px-4 min-w-[140px]">Kategori & Tipe</th>
                  <th className="py-3 px-4 min-w-[140px]">Lokasi & Thn</th>
                  <th className="py-3 px-4 min-w-[180px]">Kode Saat Ini</th>
                  <th className="py-3 px-2 w-8 text-center"></th>
                  <th className="py-3 px-4 min-w-[200px]">Kode Baru Standar TMII</th>
                  <th className="py-3 px-3 min-w-[110px] text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Tidak ada aset yang sesuai kriteria filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <tr 
                        key={item.id}
                        className={`transition-colors hover:bg-indigo-50/30 ${
                          isSelected ? 'bg-indigo-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 leading-snug">{item.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.brand || 'Tanpa Merek'}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">{item.category || '-'}</span>
                          <span className="text-[10px] text-slate-500 block">{item.type || '-'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block truncate max-w-[160px]" title={item.location}>
                            {item.location}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            Thn {item.breakdown.k5.fullYear}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {item.currentCode || '(Kosong)'}
                            </span>
                            {item.isCurrentCodeValid ? (
                              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold whitespace-nowrap">
                                Standar
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold whitespace-nowrap">
                                Non-Standar
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-slate-400">
                          <ArrowRight size={14} className={item.hasChanged ? 'text-indigo-600' : 'text-slate-300'} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg border ${
                                item.hasChanged 
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold' 
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}>
                                {item.generatedCode}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
                              <span title={`Kepemilikan: ${item.breakdown.k1.label}`}>
                                {item.breakdown.k1.code}
                              </span>
                              <span>•</span>
                              <span title={`Zona: ${item.breakdown.k2.label}`}>
                                {item.breakdown.k2.code}
                              </span>
                              <span>•</span>
                              <span title={`Kategori: ${item.breakdown.k3.label}`}>
                                {item.breakdown.k3.code}
                              </span>
                              <span title={`Tipe: ${item.breakdown.k4.label}`}>
                                {item.breakdown.k4.code}
                              </span>
                              <span>•</span>
                              <span title={`Tahun: ${item.breakdown.k5.fullYear}`}>
                                {item.breakdown.k5.code}
                              </span>
                              <span>•</span>
                              <span title={`Nomor Urut: #${item.breakdown.k6.sequenceStr}`}>
                                #{item.breakdown.k6.sequenceStr}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.hasChanged ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle size={10} />
                              <span>Akan Berubah</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={10} />
                              <span>Tetap</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer / Action Bar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            {isApplying && applyProgress ? (
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
                <span className="font-semibold text-slate-800">
                  Menyimpan ke database: {applyProgress.current} dari {applyProgress.total} aset...
                </span>
              </div>
            ) : (
              <div>
                <span>Terpilih: <strong>{totalSelectedCount} aset</strong> ({selectedChangeCount} perlu pembaruan kode).</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Setiap kode yang diperbarui akan otomatis tersinkronisasi ke seluruh modul sistem TMII.
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApplyToDatabase}
              disabled={isApplying || selectedChangeCount === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {isApplying ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Memperbarui Database...</span>
                </>
              ) : (
                <>
                  <Database size={16} />
                  <span>Terapkan Kode ke Database ({selectedChangeCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
