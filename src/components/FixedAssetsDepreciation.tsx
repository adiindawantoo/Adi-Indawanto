import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Calendar, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  TrendingDown, 
  Coins, 
  Building2, 
  MapPin, 
  ArrowUpDown, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Eye,
  Info,
  Download,
  BarChart3,
  Layers
} from 'lucide-react';
import { FixedAsset, AppTheme, ConfiguredLocation, ConfiguredCategory } from '../types';
import { 
  calculatePortfolioDepreciation, 
  formatYearMonthIndonesian, 
  formatRupiah, 
  INDONESIAN_MONTHS, 
  AssetDepreciationSummary 
} from '../lib/depreciation';
import { exportToExcel } from '../lib/excel';
import AssetDepreciationScheduleModal from './AssetDepreciationScheduleModal';

interface FixedAssetsDepreciationProps {
  assets: FixedAsset[];
  configuredLocations?: ConfiguredLocation[];
  configuredCategories?: ConfiguredCategory[];
  theme: AppTheme;
  onUpdateAsset?: (id: string, asset: Partial<FixedAsset>) => Promise<void>;
  isAdmin?: boolean;
}

export default function FixedAssetsDepreciation({
  assets,
  configuredLocations = [],
  configuredCategories = [],
  theme,
  onUpdateAsset,
  isAdmin = true
}: FixedAssetsDepreciationProps) {
  // State target bulan dan tahun (default: bulan berjalan)
  const today = new Date();
  const defaultYear = today.getFullYear();
  const defaultMonth = String(today.getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);

  // String target 'YYYY-MM'
  const targetYearMonth = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth]);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [locationFilter, setLocationFilter] = useState('Semua');

  // Sorting
  const [sortField, setSortField] = useState<keyof AssetDepreciationSummary>('bookValue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modal Detail Skedul Individual
  const [selectedAssetForSchedule, setSelectedAssetForSchedule] = useState<FixedAsset | null>(null);

  // Perhitungan Depresiasi Portfolio untuk bulan yang dipilih
  const { summary, assetList } = useMemo(() => {
    return calculatePortfolioDepreciation(assets, targetYearMonth);
  }, [assets, targetYearMonth]);

  // Navigasi Bulan Cepat
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  const handleSetToEndOfYear = () => {
    setSelectedMonth(12);
  };

  // Filter aset yang ditampilkan
  const filteredAssets = useMemo(() => {
    return assetList.filter(item => {
      const matchesSearch = 
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = categoryFilter === 'Semua' || item.category === categoryFilter;
      const matchesLoc = locationFilter === 'Semua' || item.location === locationFilter;
      const matchesStat = statusFilter === 'Semua' || item.status === statusFilter;

      return matchesSearch && matchesCat && matchesLoc && matchesStat;
    });
  }, [assetList, searchTerm, categoryFilter, locationFilter, statusFilter]);

  // Sort aset
  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') valA = (valA as string).toLowerCase();
      if (typeof valB === 'string') valB = (valB as string).toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAssets, sortField, sortOrder]);

  // Pagination Slice
  const totalPages = Math.ceil(sortedAssets.length / itemsPerPage) || 1;
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAssets.slice(start, start + itemsPerPage);
  }, [sortedAssets, currentPage, itemsPerPage]);

  // Daftar Kategori Unik untuk Filter
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    assets.forEach(a => {
      if (a.category) cats.add(a.category);
    });
    return Array.from(cats).sort();
  }, [assets]);

  // Ekspor Rekap Bulanan ke Excel
  const handleExportExcel = () => {
    const exportData = sortedAssets.map((item, idx) => ({
      'No': idx + 1,
      'Kode Aset': item.code,
      'Nama Barang': item.name,
      'Merk & Tipe': item.brand,
      'Kategori': item.category,
      'Lokasi': item.location,
      'Tanggal Perolehan': item.acquisitionDate,
      'Masa Manfaat': item.usefulLifeLabel,
      'Total Bulan Manfaat': item.usefulLifeMonths,
      'Bulan Berjalan (Usia)': item.elapsedMonths,
      'Sisa Bulan Manfaat': item.remainingMonths,
      'Nilai Perolehan (IDR)': item.acquisitionCost,
      'Nilai Residu (IDR)': item.salvageValue,
      'Nilai Disusutkan (IDR)': item.depreciableBase,
      [`Beban Depresiasi ${summary.targetMonthLabel} (IDR)`]: item.monthlyDepreciationSelectedMonth,
      [`Akumulasi Depresiasi s/d ${summary.targetMonthLabel} (IDR)`]: item.accumulatedDepreciation,
      [`Nilai Buku Bersih (NBV) per ${summary.targetMonthLabel} (IDR)`]: item.bookValue,
      'Persentase Tersusutkan (%)': item.depreciationPercentage,
      'Status Akuntansi': item.status
    }));

    exportToExcel(
      exportData, 
      `Laporan_Depresiasi_Aset_TMII_${targetYearMonth}`, 
      `Depresiasi_${targetYearMonth}`
    );
  };

  return (
    <div className="space-y-6" id="assets-depreciation-module">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Calculator size={13} />
              <span>Modul Akuntansi & Valuasi Aset</span>
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Perhitungan Depresiasi & Nilai Buku Aset
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kalkulasi beban penyusutan berkala, akumulasi depresiasi, dan nilai buku bersih (Net Book Value) berdasarkan masa manfaat aset tetap TMII
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            <span>Ekspor Rekap Excel ({summary.targetMonthLabel})</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Cetak Laporan Depresiasi"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Target Month Controller Card - The Core Feature */}
      <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-100 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Target Month Title & Indicators */}
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl shrink-0">
              <Calendar size={24} />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Periode Evaluasi Depresiasi yang Dipilih
              </span>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {summary.targetMonthLabel}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-mono font-bold">
                  {targetYearMonth}
                </span>
                {targetYearMonth === `${defaultYear}-${defaultMonth}` && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                    Bulan Berjalan
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Month / Year Selectors & Step Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrevMonth}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors cursor-pointer"
              title="Mundur 1 Bulan"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Dropdown Bulan */}
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              {INDONESIAN_MONTHS.map((mName, idx) => (
                <option key={mName} value={idx + 1}>{mName}</option>
              ))}
            </select>

            {/* Dropdown Tahun */}
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              {Array.from({ length: 16 }, (_, i) => defaultYear - 5 + i).map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors cursor-pointer"
              title="Maju 1 Bulan"
            >
              <ChevronRight size={18} />
            </button>

            {/* Quick shortcuts */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={handleResetToCurrentMonth}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                onClick={handleSetToEndOfYear}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Akhir Tahun (Des)
              </button>
            </div>
          </div>

        </div>

        <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Info size={15} className="text-emerald-600 shrink-0" />
            <span>
              Menghitung posisi <strong>Akumulasi Depresiasi</strong> dan <strong>Nilai Buku Bersih (NBV)</strong> s/d akhir <strong>{summary.targetMonthLabel}</strong> berdasarkan metode Garis Lurus (Straight-Line) & Tanah Non-Depresiasi sesuai PSAK 16.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-slate-500 font-semibold text-[11px]">
            <span>Total {summary.totalAssets} Aset</span>
            <span>•</span>
            <span className="text-emerald-700">Aktif Menyusut: {summary.activeDepreciatingCount}</span>
            {summary.nonDepreciableCount > 0 && (
              <>
                <span>•</span>
                <span className="text-teal-800 font-bold">🌱 Tanah: {summary.nonDepreciableCount}</span>
              </>
            )}
            <span>•</span>
            <span className="text-purple-700">Lunas: {summary.fullyDepreciatedCount}</span>
          </div>
        </div>
      </div>

      {/* 4 Core Financial Metrics for Selected Month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Nilai Perolehan */}
        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Nilai Perolehan (CAPEX)
            </span>
            <p className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {formatRupiah(summary.totalAcquisitionCost)}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Modal aset tetap terdata
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
            <Building2 size={22} />
          </div>
        </div>

        {/* Card 2: Beban Depresiasi Bulan Terpilih */}
        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
              Beban Depresiasi {summary.targetMonthLabel}
            </span>
            <p className="text-lg sm:text-xl font-black text-amber-600 mt-1">
              {formatRupiah(summary.totalMonthlyExpense)}
              <span className="text-xs font-normal text-slate-400 ml-1">/ bln</span>
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Beban bulan {summary.targetMonthLabel}
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
            <TrendingDown size={22} />
          </div>
        </div>

        {/* Card 3: Total Akumulasi Depresiasi */}
        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Akumulasi Depresiasi s/d {summary.targetMonthLabel}
            </span>
            <p className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {formatRupiah(summary.totalAccumulatedDepreciation)}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Telah menyusut {summary.averageDepreciationRatio}%
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl shrink-0">
            <Clock size={22} />
          </div>
        </div>

        {/* Card 4: Nilai Buku Bersih (NBV) */}
        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Nilai Buku Bersih (NBV) {summary.targetMonthLabel}
            </span>
            <p className="text-lg sm:text-xl font-black text-emerald-700 mt-1">
              {formatRupiah(summary.totalBookValue)}
            </p>
            <span className="text-[11px] text-emerald-600/90 mt-0.5 block">
              Sisa nilai aset di neraca
            </span>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl shrink-0">
            <Coins size={22} />
          </div>
        </div>

      </div>

      {/* Category Breakdown Pill Cards */}
      <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-emerald-600" />
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Rekapitulasi Nilai Buku & Beban Bulanan per Kategori Aset ({summary.targetMonthLabel})
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {Object.keys(summary.categoryBreakdown).length} Kategori
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.keys(summary.categoryBreakdown).map(catKey => {
            const catData = summary.categoryBreakdown[catKey];
            return (
              <div 
                key={catKey}
                onClick={() => setCategoryFilter(categoryFilter === catData.category ? 'Semua' : catData.category)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  categoryFilter === catData.category
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate">{catData.category}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-bold">
                    {catData.count} Unit
                  </span>
                </div>
                <div className="mt-2 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Beban Bulan Ini:</span>
                    <span className="font-bold text-amber-700">{formatRupiah(catData.monthlyExpense)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Nilai Buku:</span>
                    <span className="font-bold text-emerald-800">{formatRupiah(catData.bookValue)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          
          {/* Search Bar */}
          <div className="sm:col-span-4 relative">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari kode, nama aset, merk, lokasi..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Filter Kategori */}
          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none"
            >
              <option value="Semua">Semua Kategori ({assets.length})</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Filter Status Akuntansi */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none"
            >
              <option value="Semua">Semua Status Depresiasi</option>
              <option value="Aktif Menyusut">Aktif Menyusut</option>
              <option value="Tidak Disusutkan">🌱 Tidak Disusutkan (Tanah)</option>
              <option value="Habis Masa Manfaat">Habis Masa Manfaat (Lunas)</option>
              <option value="Belum Mulai">Belum Mulai Susut</option>
              <option value="Non-Aktif">Non-Aktif / Dihapuskan</option>
            </select>
          </div>

          {/* Sort Column */}
          <div className="sm:col-span-2 flex items-center gap-1.5">
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none"
            >
              <option value="bookValue">Nilai Buku</option>
              <option value="monthlyDepreciationSelectedMonth">Beban Bulan Ini</option>
              <option value="acquisitionCost">Nilai Perolehan</option>
              <option value="accumulatedDepreciation">Akumulasi Depr</option>
              <option value="code">Kode Aset</option>
              <option value="remainingMonths">Sisa Bulan</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors cursor-pointer"
              title="Balikkan Urutan"
            >
              <ArrowUpDown size={15} />
            </button>
          </div>

        </div>

        {/* Quick Result Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>Menampilkan <strong>{sortedAssets.length}</strong> dari <strong>{assets.length}</strong> aset</span>
          <div className="flex items-center gap-2">
            <span>Tampilkan per halaman:</span>
            <select
              value={itemsPerPage}
              onChange={e => {
                setItemsPerPage(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="bg-slate-100 text-xs font-bold rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Assets Depreciation Table */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Kode & Nama Aset</th>
                <th className="py-3 px-4">Lokasi & Kategori</th>
                <th className="py-3 px-4">Tgl Perolehan</th>
                <th className="py-3 px-4 text-right">Nilai Perolehan</th>
                <th className="py-3 px-4 text-center">Masa Manfaat</th>
                <th className="py-3 px-4 text-center">Usia / Sisa</th>
                <th className="py-3 px-4 text-right bg-amber-50/60 text-amber-900 border-x border-amber-200/40">
                  Beban {summary.targetMonthLabel}
                </th>
                <th className="py-3 px-4 text-right">Akumulasi Depr</th>
                <th className="py-3 px-4 text-right bg-emerald-50/60 text-emerald-900 border-x border-emerald-200/40">
                  Nilai Buku ({summary.targetMonthLabel})
                </th>
                <th className="py-3 px-4 text-center">Rasio Depr</th>
                <th className="py-3 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedAssets.map((item, idx) => {
                const rowNo = (currentPage - 1) * itemsPerPage + idx + 1;
                const origAsset = assets.find(a => a.id === item.assetId);

                return (
                  <tr key={item.assetId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-400">
                      {rowNo}
                    </td>

                    {/* Kode & Nama */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] font-black text-emerald-800 tracking-wide">
                        {item.code}
                      </div>
                      <div className="font-bold text-slate-900 text-xs mt-0.5 line-clamp-1" title={item.name}>
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.brand}
                      </div>
                    </td>

                    {/* Lokasi & Kategori */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[130px]" title={item.location}>{item.location}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Building2 size={11} className="text-slate-400 shrink-0" />
                        <span>{item.category}</span>
                      </div>
                    </td>

                    {/* Tgl Perolehan */}
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {item.acquisitionDate}
                    </td>

                    {/* Nilai Perolehan */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(item.acquisitionCost)}
                    </td>

                    {/* Masa Manfaat */}
                    <td className="py-3 px-4 text-center">
                      {item.isNonDepreciable ? (
                        <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 font-bold rounded-lg text-[10px] whitespace-nowrap">
                          Tak Terbatas
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-[10px] whitespace-nowrap">
                          {item.usefulLifeLabel}
                        </span>
                      )}
                    </td>

                    {/* Usia Terpakai & Sisa Bulan */}
                    <td className="py-3 px-4 text-center">
                      {item.isNonDepreciable ? (
                        <div className="text-[10px] text-teal-700 font-bold">
                          Tidak Susut
                        </div>
                      ) : (
                        <>
                          <div className="text-[11px] font-bold text-slate-700">
                            {item.elapsedMonths} bln
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Sisa: {item.remainingMonths} bln
                          </div>
                        </>
                      )}
                    </td>

                    {/* Beban Depresiasi Bulan Terpilih (Featured) */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-700 bg-amber-50/40 border-x border-amber-200/30">
                      {item.isNonDepreciable ? (
                        <span className="text-slate-400 font-mono text-xs">Rp 0</span>
                      ) : (
                        formatRupiah(item.monthlyDepreciationSelectedMonth)
                      )}
                    </td>

                    {/* Akumulasi Depresiasi */}
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {item.isNonDepreciable ? (
                        <span className="text-slate-400 font-mono text-xs">Rp 0</span>
                      ) : (
                        formatRupiah(item.accumulatedDepreciation)
                      )}
                    </td>

                    {/* Nilai Buku Bersih (Featured) */}
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm bg-emerald-50/40 border-x border-emerald-200/30">
                      {formatRupiah(item.bookValue)}
                      {item.isNonDepreciable && (
                        <span className="block text-[9px] text-teal-700 font-bold">100% Utuh</span>
                      )}
                    </td>

                    {/* Rasio & Status */}
                    <td className="py-3 px-4 text-center">
                      <div className="w-16 mx-auto">
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 mb-0.5">
                          <span>{item.depreciationPercentage}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              item.isNonDepreciable
                                ? 'bg-teal-400'
                                : item.status === 'Habis Masa Manfaat' 
                                  ? 'bg-purple-500' 
                                  : item.status === 'Belum Mulai' 
                                    ? 'bg-slate-300' 
                                    : 'bg-emerald-500'
                            }`}
                            style={{ width: `${item.depreciationPercentage}%` }}
                          />
                        </div>
                        <span className={`inline-block text-[9px] font-bold mt-1 px-1.5 py-0.2 rounded-full ${
                          item.isNonDepreciable
                            ? 'bg-teal-100 text-teal-900 border border-teal-200'
                            : item.status === 'Aktif Menyusut'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Habis Masa Manfaat'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.isNonDepreciable ? '🌱 Tidak Disusutkan' : item.status}
                        </span>
                      </div>
                    </td>

                    {/* Aksi: Skedul Bulanan */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => origAsset && setSelectedAssetForSchedule(origAsset)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                        title="Lihat Skedul Lengkap Tiap Bulan"
                      >
                        <Eye size={13} />
                        <span>Skedul</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {paginatedAssets.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Tidak ada aset yang sesuai dengan filter pencarian pada periode {summary.targetMonthLabel}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Single Asset Detailed Schedule Modal */}
      {selectedAssetForSchedule && (
        <AssetDepreciationScheduleModal
          isOpen={Boolean(selectedAssetForSchedule)}
          onClose={() => setSelectedAssetForSchedule(null)}
          asset={selectedAssetForSchedule}
          targetYearMonth={targetYearMonth}
          theme={theme}
        />
      )}

    </div>
  );
}
