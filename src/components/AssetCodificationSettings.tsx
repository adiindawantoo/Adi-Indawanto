import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Hash, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  MapPin, 
  FolderTree, 
  Calendar, 
  Copy, 
  Check, 
  ArrowRight, 
  Info, 
  Layers, 
  SlidersHorizontal,
  ExternalLink,
  ShieldCheck,
  Zap,
  HelpCircle,
  RefreshCw,
  FileCode2,
  Database,
  FileDown,
  Download,
  Loader2,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { 
  FixedAsset, 
  ConfiguredLocation, 
  ConfiguredCategory, 
  AppTheme 
} from '../types';
import { 
  ASSET_OWNERSHIP_RULES, 
  ASSET_LOCATION_AREA_RULES, 
  ASSET_CATEGORY_RULES, 
  generateNextAssetCode, 
  parseAssetCode, 
  resolveLocationAreaCode,
  resolveOwnershipCode,
  resolveCategoryCode,
  resolveTypeCode,
  generateBatchAssetCodes
} from '../lib/assetCodeGenerator';
import { generateAssetCodificationPdf } from '../lib/assetCodificationPdf';
import { exportToExcel } from '../lib/excel';

interface AssetCodificationSettingsProps {
  fixedAssets: FixedAsset[];
  configuredLocations: ConfiguredLocation[];
  configuredCategories: ConfiguredCategory[];
  theme: AppTheme;
}

export default function AssetCodificationSettings({
  fixedAssets,
  configuredLocations,
  configuredCategories,
  theme
}: AssetCodificationSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'simulator' | 'parser' | 'batch'>('rules');

  // Simulator State
  const [simOwnership, setSimOwnership] = useState('BMN');
  const [simLocationCategory, setSimLocationCategory] = useState('03'); // Gate
  const [simCategory, setSimCategory] = useState('INF'); // Infrastruktur
  const [simType, setSimType] = useState('04'); // Gerbang
  const [simYear, setSimYear] = useState('2026');
  const [copiedCode, setCopiedCode] = useState(false);

  // Parser State
  const [parseInput, setParseInput] = useState('BMN03.INF04.26-001');

  // Batch Generator & List State
  const [batchMode, setBatchMode] = useState<'non_standard_only' | 'all_assets'>('non_standard_only');
  const [batchSearchTerm, setBatchSearchTerm] = useState('');
  const [batchFilterTab, setBatchFilterTab] = useState<'all' | 'need_change' | 'already_standard'>('all');
  const [batchCopied, setBatchCopied] = useState(false);

  const batchResult = useMemo(() => {
    return generateBatchAssetCodes(fixedAssets, {
      mode: batchMode,
      configuredLocations,
      configuredCategories
    });
  }, [fixedAssets, batchMode, configuredLocations, configuredCategories]);

  const filteredBatchItems = useMemo(() => {
    return batchResult.items.filter(item => {
      if (batchFilterTab === 'need_change' && !item.hasChanged) return false;
      if (batchFilterTab === 'already_standard' && item.hasChanged) return false;

      if (!batchSearchTerm.trim()) return true;
      const q = batchSearchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        item.currentCode.toLowerCase().includes(q) ||
        item.generatedCode.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    });
  }, [batchResult.items, batchFilterTab, batchSearchTerm]);

  const handleCopyAllBatchCodes = async () => {
    const lines = [
      'No\tID Aset\tNama Barang\tKode Lama\tKode Baru Standar TMII\tLokasi\tKategori',
      ...filteredBatchItems.map((item, idx) => 
        `${idx + 1}\t${item.id}\t${item.name}\t${item.currentCode}\t${item.generatedCode}\t${item.location}\t${item.category || '-'}`
      )
    ].join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      setBatchCopied(true);
      setTimeout(() => setBatchCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleExportBatchExcel = () => {
    const data = filteredBatchItems.map((item, idx) => ({
      'No': idx + 1,
      'ID Aset': item.id,
      'Nama Barang': item.name,
      'Merek': item.brand || '-',
      'Kepemilikan': item.ownership || '-',
      'Lokasi': item.location,
      'Kategori': item.category || '-',
      'Tipe': item.type || '-',
      'Tanggal Perolehan': item.acquisitionDate || '-',
      'Kode Lama': item.currentCode,
      'Status Format Lama': item.isCurrentCodeValid ? 'Standar' : 'Non-Standar',
      'Kode Baru Standar TMII': item.generatedCode,
      'Status Perubahan': item.hasChanged ? 'Akan Berubah' : 'Sudah Standar',
      'Prefix TMII': item.prefix,
      'Nomor Urut': item.sequenceNumber
    }));

    exportToExcel(data, `Semua_Kode_Aset_TMII_${new Date().toISOString().split('T')[0]}`);
  };

  // PDF Export State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await generateAssetCodificationPdf({
        configuredLocations,
        configuredCategories,
        generatedBy: 'Asset Management Department - Taman Mini Indonesia Indah'
      });
    } catch (err) {
      console.error('Error generating codification PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Category view filter in rules
  const [selectedCatRuleCode, setSelectedCatRuleCode] = useState<string>('INF');
  const [searchTermRule, setSearchTermRule] = useState('');

  // Generated code result from simulator
  const simulatedResult = useMemo(() => {
    return generateNextAssetCode(
      {
        ownership: simOwnership,
        locationNameOrCategory: simLocationCategory,
        category: simCategory,
        type: simType,
        acquisitionYearOrDate: simYear
      },
      fixedAssets,
      configuredLocations,
      configuredCategories
    );
  }, [simOwnership, simLocationCategory, simCategory, simType, simYear, fixedAssets, configuredLocations, configuredCategories]);

  // Parsed code result
  const parsedResult = useMemo(() => {
    return parseAssetCode(parseInput);
  }, [parseInput]);

  // Check if parsed code exists in database
  const isParsedCodeRegistered = useMemo(() => {
    if (!parsedResult.isValid || !parsedResult.rawCode) return false;
    const clean = parsedResult.rawCode.trim().toUpperCase();
    return fixedAssets.some(a => a.code && a.code.trim().toUpperCase() === clean);
  }, [parsedResult, fixedAssets]);

  const matchedRegisteredAsset = useMemo(() => {
    if (!isParsedCodeRegistered || !parsedResult.rawCode) return null;
    const clean = parsedResult.rawCode.trim().toUpperCase();
    return fixedAssets.find(a => a.code && a.code.trim().toUpperCase() === clean);
  }, [isParsedCodeRegistered, parsedResult, fixedAssets]);

  // Helper copy
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Get active category rule
  const currentCategoryRule = useMemo(() => {
    return ASSET_CATEGORY_RULES.find(c => c.code === selectedCatRuleCode) || ASSET_CATEGORY_RULES[0];
  }, [selectedCatRuleCode]);

  // Filtered types for the current category rule
  const filteredTypes = useMemo(() => {
    if (!searchTermRule.trim()) return currentCategoryRule.types;
    const q = searchTermRule.toLowerCase();
    return currentCategoryRule.types.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.code.includes(q)
    );
  }, [currentCategoryRule, searchTermRule]);

  return (
    <div className="space-y-3.5 sm:space-y-6" id="asset-codification-settings">
      {/* Top Banner: Formula Standard TMII */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 text-white shadow-lg border border-blue-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 sm:gap-6 relative z-10">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-blue-500/20 text-blue-300 rounded-full text-[10px] sm:text-xs font-bold tracking-wide border border-blue-400/30">
              <Sparkles size={12} />
              <span>Standar Kodefikasi Resmi Aset Tetap TMII</span>
            </div>
            <h2 className="text-base sm:text-2xl font-black tracking-tight text-white font-display leading-snug">
              Struktur & Otomatisasi Kode Aset
            </h2>
            <p className="text-slate-300 text-[11px] sm:text-sm max-w-2xl leading-snug sm:leading-relaxed">
              Format standar pengkodean hierarkis terpadu untuk memastikan setiap barang inventaris terdaftar secara unik, runtut, dan mudah diidentifikasi di lapangan.
            </p>
          </div>

          {/* Formula Display Box */}
          <div className="bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-white/15 max-w-md w-full">
            <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-1.5 sm:mb-2 flex items-center justify-between">
              <span>Formula Segmentasi Kode</span>
              <span className="text-amber-400 font-mono">6 Segmen</span>
            </div>
            <div className="font-mono text-sm md:text-lg font-black tracking-wider text-white bg-black/40 p-2 sm:p-2.5 rounded-lg text-center border border-white/10 flex items-center justify-center gap-1 overflow-x-auto">
              <span className="text-amber-400" title="Kode 1: Kepemilikan (3 char)">[K1]</span>
              <span className="text-blue-400" title="Kode 2: Lokasi Kawasan (2 digit)">[K2]</span>
              <span className="text-slate-400">.</span>
              <span className="text-emerald-400" title="Kode 3: Kategori (3 char)">[K3]</span>
              <span className="text-purple-400" title="Kode 4: Tipe Aset (2 digit)">[K4]</span>
              <span className="text-slate-400">.</span>
              <span className="text-cyan-400" title="Kode 5: Tahun Perolehan (2 digit)">[K5]</span>
              <span className="text-slate-400">-</span>
              <span className="text-rose-400" title="Kode 6: Nomor Urut (3 digit)">[K6]</span>
            </div>
            <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-slate-300 leading-snug">
              <span className="font-semibold text-white">Contoh: </span>
              <code className="text-amber-300 font-bold font-mono">BMN03.INF04.26-001</code>
              <span className="text-slate-400 block mt-0.5">
                (Aset BMN, Gate, Kategori Infrastruktur, Jenis Gerbang, Tahun 2026, Urutan 001)
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Nav */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/10 flex-wrap">
          <div className="grid grid-cols-2 sm:flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={() => setActiveSubTab('rules')}
              className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 ${
                activeSubTab === 'rules'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <FolderTree size={14} className="shrink-0" />
              <span className="truncate">Kamus Aturan</span>
            </button>

            <button
              onClick={() => setActiveSubTab('simulator')}
              className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 ${
                activeSubTab === 'simulator'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <Sparkles size={14} className="shrink-0" />
              <span className="truncate">Simulator Kode</span>
            </button>

            <button
              onClick={() => setActiveSubTab('parser')}
              className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 ${
                activeSubTab === 'parser'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <FileCode2 size={14} className="shrink-0" />
              <span className="truncate">Urai & Cek Kode</span>
            </button>

            <button
              onClick={() => setActiveSubTab('batch')}
              className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 ${
                activeSubTab === 'batch'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <Database size={15} />
              <span>Daftar Semua Kode Aset ({fixedAssets.length})</span>
            </button>
          </div>

          <button
            id="btn-download-codification-pdf-nav"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-60"
            title="Download PDF Buku Pedoman & Kamus Master Kodefikasi"
          >
            {isGeneratingPdf ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <FileDown size={15} />
            )}
            <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download PDF Kamus Aturan'}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SUB-TAB 1: KAMUS MASTER ATURAN KODE (KODE 1 s/d KODE 6) */}
      {/* ==================================================================== */}
      {activeSubTab === 'rules' && (
        <div className="space-y-6">
          {/* Action Download Banner */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200/80 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileDown size={22} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm md:text-base">
                  Buku Pedoman Standar Kodefikasi Aset (Kamus Master)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Unduh dokumen resmi PDF format A4 lengkap berisi seluruh tabel regulasi Kode 1 s/d Kode 6, formula segmentasi, dan panduan penomoran.
                </p>
              </div>
            </div>
            <button
              id="btn-download-codification-pdf-banner"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="w-full md:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-60 shrink-0"
            >
              {isGeneratingPdf ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span>{isGeneratingPdf ? 'Memproses Dokumen...' : 'Unduh Kamus Master (PDF)'}</span>
            </button>
          </div>

          {/* Quick Overview Cards of the 6 Segments */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Kode 1</span>
                <span className="text-[11px] font-mono font-bold bg-amber-200/60 px-1.5 py-0.5 rounded">3 Char</span>
              </div>
              <div className="text-xs font-black text-slate-900">Kepemilikan</div>
              <p className="text-[11px] text-slate-600 mt-1">BMN, TWC, BHV, KEM, PRV</p>
            </div>

            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Kode 2</span>
                <span className="text-[11px] font-mono font-bold bg-blue-200/60 px-1.5 py-0.5 rounded">2 Digit</span>
              </div>
              <div className="text-xs font-black text-slate-900">Lokasi Kawasan</div>
              <p className="text-[11px] text-slate-600 mt-1">01 Makro s/d 11 Anjungan</p>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Kode 3</span>
                <span className="text-[11px] font-mono font-bold bg-emerald-200/60 px-1.5 py-0.5 rounded">3 Char</span>
              </div>
              <div className="text-xs font-black text-slate-900">Kategori Aset</div>
              <p className="text-[11px] text-slate-600 mt-1">TNH, BNG, INF, KND, PRM, ITT, FRI</p>
            </div>

            <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-purple-700 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Kode 4</span>
                <span className="text-[11px] font-mono font-bold bg-purple-200/60 px-1.5 py-0.5 rounded">2 Digit</span>
              </div>
              <div className="text-xs font-black text-slate-900">Tipe / Jenis</div>
              <p className="text-[11px] text-slate-600 mt-1">01 s/d 15 sub-tipe aset</p>
            </div>

            <div className="bg-cyan-50/70 border border-cyan-200/80 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-cyan-700 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Kode 5</span>
                <span className="text-[11px] font-mono font-bold bg-cyan-200/60 px-1.5 py-0.5 rounded">2 Digit</span>
              </div>
              <div className="text-xs font-black text-slate-900">Tahun Perolehan</div>
              <p className="text-[11px] text-slate-600 mt-1">2 digit tahun (2026 → 26)</p>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-rose-700 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Kode 6</span>
                <span className="text-[11px] font-mono font-bold bg-rose-200/60 px-1.5 py-0.5 rounded">3 Digit</span>
              </div>
              <div className="text-xs font-black text-slate-900">Nomor Urut</div>
              <p className="text-[11px] text-slate-600 mt-1">001, 002... berbasis prefix</p>
            </div>
          </div>

          {/* Section 1 & 2: Kepemilikan & Lokasi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Table Kode 1: Kepemilikan */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Kode 1 — Entitas Kepemilikan Aset</h3>
                    <p className="text-xs text-slate-500">Standar 3 karakter entitas kepemilikan aset di kawasan TMII</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Kode</th>
                        <th className="py-2.5 px-3">Entitas Pemilik</th>
                        <th className="py-2.5 px-3">Deskripsi Kewenangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {ASSET_OWNERSHIP_RULES.map((own) => (
                        <tr key={own.code} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-black text-amber-800 bg-amber-50/40 rounded">
                            {own.code}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{own.name}</td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">{own.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                <Info size={14} className="text-blue-600 shrink-0" />
                <span>Terintegrasi otomatis di kolom <b>Kepemilikan</b> pada modal tambah aset.</span>
              </div>
            </div>

            {/* Table Kode 2: Lokasi Kawasan */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Kode 2 — Kategori Lokasi Kawasan TMII</h3>
                    <p className="text-xs text-slate-500">Standar 2 digit numerik hierarki zona penempatan fisik aset</p>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-3">Kode</th>
                        <th className="py-2 px-3">Kategori Lokasi</th>
                        <th className="py-2 px-3">Contoh Area di TMII</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {ASSET_LOCATION_AREA_RULES.map((loc) => {
                        // Count how many configured locations map to this category
                        const linkedCount = configuredLocations.filter(cl => {
                          const res = resolveLocationAreaCode(cl.category || cl.name, configuredLocations);
                          return res.code === loc.code;
                        }).length;

                        return (
                          <tr key={loc.code} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2 px-3 font-mono font-black text-blue-700 bg-blue-50/40 rounded">
                              {loc.code}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {loc.name}
                              {linkedCount > 0 && (
                                <span className="ml-2 text-[10px] font-normal text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">
                                  {linkedCount} titik
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">{loc.description}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                <Info size={14} className="text-blue-600 shrink-0" />
                <span>Terhubung dengan <b>Setting Lokasi Aset</b> di menu pengaturan.</span>
              </div>
            </div>
          </div>

          {/* Section 3 & 4: Kategori & Tipe Aset */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <FolderTree size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Kode 3 & Kode 4 — Kategori & Jenis/Tipe Aset</h3>
                  <p className="text-xs text-slate-500">
                    Pilih kategori di bawah untuk melihat rincian 2 digit kode tipe/jenis aset sesuai regulasi
                  </p>
                </div>
              </div>

              <div className="relative w-full md:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari jenis aset..."
                  value={searchTermRule}
                  onChange={(e) => setSearchTermRule(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Category Selector Pills (Kode 3) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4">
              {ASSET_CATEGORY_RULES.map((cat) => {
                const isSelected = selectedCatRuleCode === cat.code;
                return (
                  <button
                    key={cat.code}
                    onClick={() => {
                      setSelectedCatRuleCode(cat.code);
                      setSearchTermRule('');
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                      isSelected ? 'bg-emerald-900/40 text-white' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {cat.code}
                    </span>
                    <span>{cat.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {cat.types.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Types Table for Selected Category (Kode 4) */}
            <div className="bg-slate-50/70 rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <span>Kategori:</span>
                  <span className="font-mono font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                    {currentCategoryRule.code}
                  </span>
                  <span className="text-slate-900 font-semibold">{currentCategoryRule.name}</span>
                </div>
                <span className="text-slate-500 text-[11px]">
                  Menampilkan {filteredTypes.length} dari {currentCategoryRule.types.length} jenis
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                {filteredTypes.map((type) => (
                  <div 
                    key={type.code}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between shadow-2xs hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="font-mono font-black text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-100 shrink-0">
                        {type.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate" title={type.name}>
                        {type.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {currentCategoryRule.code}{type.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 2: SIMULATOR GENERATOR KODE OTOMATIS */}
      {/* ==================================================================== */}
      {activeSubTab === 'simulator' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                <span>Simulator Auto-Generate Kode Aset</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Uji coba kombinasi 5 parameter aset untuk melihat kode otomatis yang dihasilkan dan nomor urut selanjutnya.
              </p>
            </div>

            <button
              onClick={() => {
                setSimOwnership('BMN');
                setSimLocationCategory('03');
                setSimCategory('INF');
                setSimType('04');
                setSimYear('2026');
              }}
              className="text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Reset Contoh Dokumen</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Controls */}
            <div className="lg:col-span-7 space-y-4">
              {/* Segmen 1: Kepemilikan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>1. Entitas Kepemilikan (Kode 1)</span>
                  <span className="font-mono text-[11px] text-amber-700 bg-amber-50 px-1.5 rounded">3 Karakter</span>
                </label>
                <select
                  value={simOwnership}
                  onChange={(e) => setSimOwnership(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {ASSET_OWNERSHIP_RULES.map((own) => (
                    <option key={own.code} value={own.code}>
                      {own.code} - {own.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Segmen 2: Lokasi Kawasan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>2. Kategori Lokasi Kawasan (Kode 2)</span>
                  <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-1.5 rounded">2 Digit</span>
                </label>
                <select
                  value={simLocationCategory}
                  onChange={(e) => setSimLocationCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {ASSET_LOCATION_AREA_RULES.map((loc) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Segmen 3: Kategori Aset */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>3. Kategori Aset (Kode 3)</span>
                  <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-1.5 rounded">3 Karakter</span>
                </label>
                <select
                  value={simCategory}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setSimCategory(newCat);
                    const catRule = ASSET_CATEGORY_RULES.find(c => c.code === newCat);
                    if (catRule && catRule.types.length > 0) {
                      setSimType(catRule.types[0].code);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {ASSET_CATEGORY_RULES.map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {cat.code} - {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Segmen 4: Tipe Aset */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>4. Jenis / Tipe Aset (Kode 4)</span>
                  <span className="font-mono text-[11px] text-purple-700 bg-purple-50 px-1.5 rounded">2 Digit</span>
                </label>
                <select
                  value={simType}
                  onChange={(e) => setSimType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {(ASSET_CATEGORY_RULES.find(c => c.code === simCategory)?.types || []).map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.code} - {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Segmen 5: Tahun Perolehan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>5. Tahun Perolehan (Kode 5)</span>
                  <span className="font-mono text-[11px] text-cyan-700 bg-cyan-50 px-1.5 rounded">2 Digit Terakhir</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1970"
                    max="2099"
                    value={simYear}
                    onChange={(e) => setSimYear(e.target.value)}
                    placeholder="Contoh: 2026"
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex items-center px-3 bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-xl text-xs font-bold font-mono">
                    Kode 5: {simulatedResult.kode5.code}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Result Card */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-br from-slate-900 to-blue-950 p-5 rounded-2xl text-white border border-slate-800 shadow-md">
              <div>
                <div className="flex items-center justify-between text-xs text-blue-300 font-bold mb-3">
                  <span>HASIL GENERATE OTOMATIS</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px]">
                    Siap Digunakan
                  </span>
                </div>

                {/* Big Code Output */}
                <div className="bg-black/50 p-4 rounded-xl border border-white/10 text-center relative group">
                  <div className="text-2xl md:text-3xl font-black font-mono tracking-wider text-amber-300 select-all">
                    {simulatedResult.fullCode}
                  </div>

                  <button
                    onClick={() => handleCopy(simulatedResult.fullCode)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedCode ? 'Tersalin ke Clipboard!' : 'Salin Kode Aset'}</span>
                  </button>
                </div>

                {/* Breakdown of Segments */}
                <div className="mt-4 space-y-2 text-xs divide-y divide-white/10">
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Prefix Identifikasi:</span>
                    <span className="font-mono font-bold text-white">{simulatedResult.prefix}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Kepemilikan:</span>
                    <span className="font-semibold text-amber-300">{simulatedResult.kode1.label} ({simulatedResult.kode1.code})</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Lokasi Kawasan:</span>
                    <span className="font-semibold text-blue-300">{simulatedResult.kode2.label} ({simulatedResult.kode2.code})</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Kategori & Jenis:</span>
                    <span className="font-semibold text-emerald-300">
                      {simulatedResult.kode3.label} &bull; {simulatedResult.kode4.label}
                    </span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Tahun Perolehan:</span>
                    <span className="font-semibold text-cyan-300">{simulatedResult.kode5.fullYear} (Kode: {simulatedResult.kode5.code})</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Nomor Urut Berjalan:</span>
                    <span className="font-mono font-black text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                      {simulatedResult.kode6.sequenceStr}
                    </span>
                  </div>
                </div>
              </div>

              {/* Database Context */}
              <div className="mt-5 p-3 bg-white/5 border border-white/10 rounded-xl text-[11px] text-slate-300">
                <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                  <Info size={13} className="text-blue-400" />
                  <span>Validasi Database Real-time:</span>
                </div>
                {simulatedResult.isExistingMatch ? (
                  <p>
                    Ditemukan <b>{simulatedResult.totalMatchingAssetsCount} aset</b> dengan prefix yang sama di database. Sistem otomatis memberikan nomor urut berikutnya yaitu <b>{simulatedResult.kode6.sequenceStr}</b>.
                  </p>
                ) : (
                  <p>
                    Belum ada aset dengan prefix ini di database. Sistem memulai dengan nomor urut <b>001</b>.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 3: CODE PARSER (URAI & CEK KODE ASET) */}
      {/* ==================================================================== */}
      {activeSubTab === 'parser' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCode2 size={18} className="text-indigo-600" />
              <span>Inspector & Parser Kode Aset TMII</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ketikkan kode aset apa saja untuk mengurai arti dan validitas struktur 6 segmennya.
            </p>
          </div>

          <div className="max-w-2xl">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Masukkan Kode Aset untuk Diurai:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={parseInput}
                onChange={(e) => setParseInput(e.target.value)}
                placeholder="Contoh: BMN03.INF04.26-001"
                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              />
              <button
                onClick={() => setParseInput('BMN03.INF04.26-001')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                Contoh Dokumen
              </button>
            </div>
          </div>

          {/* Parser Result Card */}
          {parsedResult.isValid ? (
            <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-200/70 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-mono text-lg font-black text-emerald-950">
                      {parsedResult.rawCode}
                    </div>
                    <span className="text-xs font-semibold text-emerald-700">
                      Format Valid Sesuai Regulasi Kodefikasi TMII
                    </span>
                  </div>
                </div>

                {/* Registered in Database Badge */}
                {isParsedCodeRegistered ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-xs font-bold">
                    <Database size={13} />
                    <span>Terdaftar di Database Aset Tetap</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-bold">
                    <Info size={13} />
                    <span>Kode Baru (Belum Terdaftar)</span>
                  </div>
                )}
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Kode 1: Pemilik</span>
                  <span className="text-sm font-mono font-black text-amber-700">{parsedResult.kode1?.code}</span>
                  <span className="text-xs text-slate-800 font-semibold block truncate mt-0.5" title={parsedResult.kode1?.label}>
                    {parsedResult.kode1?.label}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Kode 2: Lokasi</span>
                  <span className="text-sm font-mono font-black text-blue-700">{parsedResult.kode2?.code}</span>
                  <span className="text-xs text-slate-800 font-semibold block truncate mt-0.5" title={parsedResult.kode2?.label}>
                    {parsedResult.kode2?.label}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Kode 3: Kategori</span>
                  <span className="text-sm font-mono font-black text-emerald-700">{parsedResult.kode3?.code}</span>
                  <span className="text-xs text-slate-800 font-semibold block truncate mt-0.5" title={parsedResult.kode3?.label}>
                    {parsedResult.kode3?.label}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Kode 4: Tipe</span>
                  <span className="text-sm font-mono font-black text-purple-700">{parsedResult.kode4?.code}</span>
                  <span className="text-xs text-slate-800 font-semibold block truncate mt-0.5" title={parsedResult.kode4?.label}>
                    {parsedResult.kode4?.label}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Kode 5: Tahun</span>
                  <span className="text-sm font-mono font-black text-cyan-700">{parsedResult.kode5?.code}</span>
                  <span className="text-xs text-slate-800 font-semibold block truncate mt-0.5">
                    Tahun {parsedResult.kode5?.fullYear}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Kode 6: Urutan</span>
                  <span className="text-sm font-mono font-black text-rose-700">{parsedResult.kode6?.sequenceStr}</span>
                  <span className="text-xs text-slate-800 font-semibold block truncate mt-0.5">
                    Unit Ke-{parsedResult.kode6?.sequenceNumber}
                  </span>
                </div>
              </div>

              {/* Narrative explanation */}
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 text-xs text-slate-700">
                <span className="font-bold text-slate-900 block mb-1">Uraian Resmi:</span>
                <p className="leading-relaxed">{parsedResult.explanation}</p>
              </div>

              {/* Matched Asset Info if registered */}
              {matchedRegisteredAsset && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900">
                  <span className="font-bold block mb-1">Detail Aset Terdaftar di Database:</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                    <div><b>Nama Aset:</b> {matchedRegisteredAsset.name}</div>
                    <div><b>Lokasi Fisik:</b> {matchedRegisteredAsset.location} ({matchedRegisteredAsset.area || '-'})</div>
                    <div><b>Kondisi:</b> {matchedRegisteredAsset.condition} &bull; Status: {matchedRegisteredAsset.status}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-red-200 bg-red-50/50 rounded-2xl p-5 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-red-950">Format Tidak Valid</div>
                <p className="text-xs text-red-700 mt-1">{parsedResult.errorMessage}</p>
                <div className="mt-2 text-[11px] text-red-600">
                  Pola yang benar: <b>[Kode1:3][Kode2:2].[Kode3:3][Kode4:2].[Kode5:2]-[Kode6:3]</b>
                  <br />Contoh: <code className="font-bold">BMN03.INF04.26-001</code>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. DAFTAR SEMUA KODE ASET STANDAR TMII */}
      {activeSubTab === 'batch' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-400/30">
                  <Database size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">Daftar Kodefikasi Lengkap Portofolio Aset</h2>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-400/20 border border-indigo-300/30 text-indigo-200 font-mono font-bold">
                      K1K2.K3K4.K5-K6
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Monitoring dan referensi kodefikasi standar resmi TMII untuk seluruh unit aset tetap terdata.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyAllBatchCodes}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Salin seluruh baris kode ke clipboard"
                >
                  {batchCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{batchCopied ? 'Tersalin!' : 'Salin Kode'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportBatchExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Unduh seluruh daftar kode ke Excel"
                >
                  <FileSpreadsheet size={14} />
                  <span>Ekspor Excel</span>
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10 text-xs">
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Aset</span>
                <span className="text-base font-extrabold text-white mt-0.5 block">{batchResult.totalAssets} Unit</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                <span className="text-emerald-300 block text-[10px] uppercase font-bold">Format Standar</span>
                <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">{batchResult.validStandardCount} Unit</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                <span className="text-amber-300 block text-[10px] uppercase font-bold">Perlu Standardisasi</span>
                <span className="text-base font-extrabold text-amber-400 mt-0.5 block">{batchResult.nonStandardCount} Unit</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                <span className="text-indigo-300 block text-[10px] uppercase font-bold">Kelompok Prefix</span>
                <span className="text-base font-extrabold text-indigo-300 mt-0.5 block">{batchResult.prefixGroupsCount} Prefix</span>
              </div>
            </div>
          </div>

          {/* Search & Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full max-w-md">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={batchSearchTerm}
                  onChange={e => setBatchSearchTerm(e.target.value)}
                  placeholder="Cari nama aset, kode, lokasi, kategori..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setBatchFilterTab('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    batchFilterTab === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({batchResult.totalAssets})
                </button>
                <button
                  type="button"
                  onClick={() => setBatchFilterTab('need_change')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    batchFilterTab === 'need_change'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Perlu Penyesuaian ({batchResult.changedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBatchFilterTab('already_standard')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    batchFilterTab === 'already_standard'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Sudah Standar ({batchResult.totalAssets - batchResult.changedCount})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-4 min-w-[180px]">Nama Barang</th>
                    <th className="py-2.5 px-4 min-w-[130px]">Kategori / Tipe</th>
                    <th className="py-2.5 px-4 min-w-[130px]">Lokasi</th>
                    <th className="py-2.5 px-4 min-w-[160px]">Kode Saat Ini</th>
                    <th className="py-2.5 px-2 w-6 text-center"></th>
                    <th className="py-2.5 px-4 min-w-[180px]">Kode Standar TMII</th>
                    <th className="py-2.5 px-3 min-w-[100px] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredBatchItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Tidak ada aset yang sesuai kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredBatchItems.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{item.brand || 'Tanpa Merek'}</p>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-slate-800 block">{item.category || '-'}</span>
                          <span className="text-[10px] text-slate-500 block">{item.type || '-'}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-slate-800 block truncate max-w-[150px]" title={item.location}>
                            {item.location}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Thn {item.breakdown.k5.fullYear}</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                            {item.currentCode || '(Kosong)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-400">
                          <ArrowRight size={13} className={item.hasChanged ? 'text-indigo-600' : 'text-slate-300'} />
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${
                            item.hasChanged 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            {item.generatedCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.hasChanged ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle size={9} />
                              <span>Perlu Standarisasi</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={9} />
                              <span>Sesuai</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
