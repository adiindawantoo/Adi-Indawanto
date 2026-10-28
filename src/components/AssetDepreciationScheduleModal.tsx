import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calculator, 
  Calendar, 
  FileSpreadsheet, 
  Printer, 
  Building2, 
  MapPin, 
  Tag, 
  Coins, 
  Clock, 
  Sparkles,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Search,
  Filter
} from 'lucide-react';
import { FixedAsset, AppTheme } from '../types';
import { 
  calculateAssetDepreciationForMonth, 
  generateAssetMonthlySchedule, 
  formatYearMonthIndonesian, 
  formatRupiah,
  MonthlyScheduleRow
} from '../lib/depreciation';
import { exportToExcel } from '../lib/excel';

interface AssetDepreciationScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: FixedAsset | null;
  targetYearMonth: string;
  theme: AppTheme;
}

export default function AssetDepreciationScheduleModal({
  isOpen,
  onClose,
  asset,
  targetYearMonth,
  theme
}: AssetDepreciationScheduleModalProps) {
  const [scheduleFilterYear, setScheduleFilterYear] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState('');

  // Perhitungan ringkasan untuk bulan yang dipilih
  const deprSummary = useMemo(() => {
    if (!asset) return null;
    return calculateAssetDepreciationForMonth(asset, targetYearMonth);
  }, [asset, targetYearMonth]);

  // Skedul bulanan lengkap dari awal perolehan s/d akhir masa manfaat
  const fullSchedule = useMemo(() => {
    if (!asset) return [];
    return generateAssetMonthlySchedule(asset, targetYearMonth);
  }, [asset, targetYearMonth]);

  // List tahun yang ada di skedul untuk opsi filter
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    fullSchedule.forEach(row => {
      const y = row.yearMonth.split('-')[0];
      if (y) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort();
  }, [fullSchedule]);

  // Filter baris skedul
  const filteredSchedule = useMemo(() => {
    return fullSchedule.filter(row => {
      const matchesYear = scheduleFilterYear === 'Semua' || row.yearMonth.startsWith(scheduleFilterYear);
      const matchesSearch = !searchTerm || 
        row.periodLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(row.monthIndex).includes(searchTerm);
      return matchesYear && matchesSearch;
    });
  }, [fullSchedule, scheduleFilterYear, searchTerm]);

  if (!isOpen || !asset || !deprSummary) return null;

  const handleExportSchedule = () => {
    const exportRows = fullSchedule.map(row => ({
      'Bulan Ke': row.monthIndex,
      'Periode': row.periodLabel,
      'Kode Bulan': row.yearMonth,
      'Nilai Buku Awal (IDR)': row.beginningBookValue,
      'Beban Depresiasi (IDR)': row.depreciationExpense,
      'Akumulasi Depresiasi (IDR)': row.accumulatedDepreciation,
      'Nilai Buku Akhir (IDR)': row.endingBookValue,
      'Status': row.isTargetMonth ? 'BULAN DIPILIH' : (row.isPast ? 'Lewat' : 'Mendatang')
    }));

    exportToExcel(
      exportRows, 
      `Skedul_Depresiasi_${asset.code.replace(/[^a-zA-Z0-9]/g, '_')}_${targetYearMonth}`, 
      'Jadwal_Depresiasi'
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-400">
              <Calculator size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-white/10 text-emerald-300 rounded-md tracking-wider">
                  {asset.code}
                </span>
                <span className="text-[11px] px-2 py-0.5 bg-emerald-500/30 text-emerald-200 font-semibold rounded-full">
                  {deprSummary.status}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                {asset.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSchedule}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-white/10"
              title="Ekspor Skedul ke Excel"
            >
              <FileSpreadsheet size={15} className="text-emerald-400" />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-white/10"
              title="Cetak Jadwal Depresiasi"
            >
              <Printer size={15} />
              <span>Cetak</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer ml-2"
              title="Tutup"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Top Asset Identity Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Kategori & Lokasi</span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5 truncate">
                <Building2 size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{asset.category || 'Umum'}</span>
              </p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                <MapPin size={11} className="text-slate-400 shrink-0" />
                <span className="truncate">{asset.location || 'Kawasan TMII'}</span>
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Perolehan</span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <span>{deprSummary.acquisitionDate}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mulai disusutkan: {formatYearMonthIndonesian(deprSummary.acquisitionDate.slice(0, 7))}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Masa Manfaat</span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400 shrink-0" />
                <span>{deprSummary.usefulLifeLabel}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total: {deprSummary.usefulLifeMonths} Periode Bulan
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Metode Depresiasi</span>
              <p className="text-xs sm:text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-500 shrink-0" />
                <span>{deprSummary.depreciationMethod}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Nilai Residu: {formatRupiah(deprSummary.salvageValue)}
              </p>
            </div>
          </div>

          {/* Highlight Panel: Posisi Pada Bulan yang Dipilih */}
          <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-950 text-white p-5 rounded-3xl shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/15 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                  Target Evaluasi Akuntansi
                </span>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
                  <span>Posisi Per {formatYearMonthIndonesian(targetYearMonth)}</span>
                  <span className="text-xs px-2 py-0.5 bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 rounded-full font-mono">
                    {deprSummary.isNonDepreciable 
                      ? '🌱 Tanah Non-Depresiasi' 
                      : `Bulan ke-${deprSummary.elapsedMonths} dari ${deprSummary.usefulLifeMonths}`}
                  </span>
                </h3>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[11px] text-emerald-200">Sisa Masa Manfaat</span>
                <p className="text-sm sm:text-base font-black text-white">
                  {deprSummary.isNonDepreciable ? 'Tak Terbatas' : `${deprSummary.remainingMonths} Bulan Lagi`}
                </p>
              </div>
            </div>

            {/* 4 Core Financial Metrics on Target Month */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider block">Nilai Perolehan Awal</span>
                <p className="text-sm sm:text-base font-black text-white mt-1">
                  {formatRupiah(deprSummary.acquisitionCost)}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider block">Beban Depresiasi Bulan Ini</span>
                <p className="text-sm sm:text-base font-black text-amber-300 mt-1">
                  {deprSummary.isNonDepreciable ? 'Rp 0' : formatRupiah(deprSummary.monthlyDepreciationSelectedMonth)}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10">
                <span className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider block">Akumulasi Depresiasi</span>
                <p className="text-sm sm:text-base font-black text-white mt-1">
                  {deprSummary.isNonDepreciable ? 'Rp 0' : formatRupiah(deprSummary.accumulatedDepreciation)}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10">
                <span className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider block">Nilai Buku Bersih (NBV)</span>
                <p className="text-sm sm:text-base font-black text-emerald-200 mt-1">
                  {formatRupiah(deprSummary.bookValue)}
                </p>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-emerald-100">
                <span>Rasio Penyusutan Aset: <strong>{deprSummary.depreciationPercentage}%</strong></span>
                <span>Nilai Buku: <strong>{formatRupiah(deprSummary.bookValue)}</strong> {deprSummary.isNonDepreciable && '(100% Utuh)'}</span>
              </div>
              <div className="w-full h-3 bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/20">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-amber-300 rounded-full transition-all duration-500"
                  style={{ width: `${deprSummary.depreciationPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Schedule Table Section */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            {deprSummary.isNonDepreciable && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-start gap-3">
                <span className="text-2xl shrink-0">🌱</span>
                <div>
                  <h5 className="text-xs font-bold text-teal-950 uppercase tracking-wide">
                    Karakteristik Aset Tetap Tanah (PSAK 16)
                  </h5>
                  <p className="text-xs text-teal-800 mt-1 leading-relaxed">
                    Sesuai Pernyataan Standar Akuntansi Keuangan (PSAK 16), tanah memiliki masa manfaat tidak terbatas dan <strong>tidak disusutkan</strong>. Nilai buku aset tanah tetap sama dengan nilai perolehannya (<strong>{formatRupiah(deprSummary.acquisitionCost)}</strong>) tanpa beban penyusutan periodik.
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <TrendingDown size={16} className="text-emerald-600" />
                  <span>Jadwal Lengkap Amortisasi / Depresiasi Tiap Bulan</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rincian nilai buku awal, beban penyusutan, dan nilai buku akhir dari bulan pertama s/d habis masa manfaat
                </p>
              </div>

              {/* Table Filter Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Cari bulan/periode..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl">
                  <Filter size={13} className="text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-500">Tahun:</span>
                  <select
                    value={scheduleFilterYear}
                    onChange={e => setScheduleFilterYear(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="Semua">Semua Tahun</option>
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* The Monthly Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-16">Bulan Ke</th>
                    <th className="py-2.5 px-3">Periode</th>
                    <th className="py-2.5 px-3 text-right">Nilai Buku Awal</th>
                    <th className="py-2.5 px-3 text-right">Beban Depresiasi</th>
                    <th className="py-2.5 px-3 text-right">Akumulasi Depresiasi</th>
                    <th className="py-2.5 px-3 text-right">Nilai Buku Akhir</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchedule.map(row => {
                    const isSelected = row.isTargetMonth;
                    return (
                      <tr 
                        key={row.yearMonth}
                        className={`transition-colors ${
                          isSelected 
                            ? 'bg-emerald-50 font-bold text-emerald-950 border-y-2 border-emerald-500' 
                            : row.isPast 
                              ? 'hover:bg-slate-50/80 text-slate-600' 
                              : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          #{row.monthIndex}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{row.periodLabel}</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-black uppercase tracking-wider">
                                Terpilih
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatRupiah(row.beginningBookValue)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono ${isSelected ? 'text-amber-700 font-black' : 'text-slate-700'}`}>
                          {formatRupiah(row.depreciationExpense)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatRupiah(row.accumulatedDepreciation)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono font-bold ${isSelected ? 'text-emerald-800 font-black text-sm' : 'text-slate-900'}`}>
                          {formatRupiah(row.endingBookValue)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                              <CheckCircle2 size={11} />
                              <span>Bulan Ini</span>
                            </span>
                          ) : row.isPast ? (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px]">
                              Terlewati
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px]">
                              Rencana
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSchedule.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Tidak ada baris jadwal yang cocok dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Perhitungan berdasarkan PSAK 16 & Regulasi Perpajakan (Straight-Line Method).
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
