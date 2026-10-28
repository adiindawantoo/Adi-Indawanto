import { FixedAsset } from '../types';

export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export interface TaxDepreciationGroup {
  id: string;
  name: string;
  years: number;
  months: number;
  ratePercent: number;
  description: string;
  categoryHint: string;
}

export const TAX_DEPRECIATION_GROUPS: TaxDepreciationGroup[] = [
  {
    id: 'tanah_non_depresiasi',
    name: 'Tanah (Tidak Disusutkan)',
    years: 0,
    months: 0,
    ratePercent: 0,
    description: 'Aset Tetap Tanah: Memiliki masa manfaat tidak terbatas dan tidak disusutkan (PSAK 16 & Ketentuan Pajak)',
    categoryHint: 'TNH / LND'
  },
  {
    id: 'kelompok_1',
    name: 'Kelompok 1 (4 Tahun)',
    years: 4,
    months: 48,
    ratePercent: 25.0,
    description: 'Bukan Bangunan: Komputer, printer, alat komunikasi, perkakas, mebel rotan/kayu ringan',
    categoryHint: 'INF / TEK'
  },
  {
    id: 'kelompok_2',
    name: 'Kelompok 2 (8 Tahun)',
    years: 8,
    months: 96,
    ratePercent: 12.5,
    description: 'Bukan Bangunan: Mobil operasional, bus shuttle, AC, mebel logam, peralatan rekreasi ringan',
    categoryHint: 'KND / MES'
  },
  {
    id: 'kelompok_3',
    name: 'Kelompok 3 (16 Tahun)',
    years: 16,
    months: 192,
    ratePercent: 6.25,
    description: 'Bukan Bangunan: Mesin besar, instalasi kelistrikan utama, turbin, wahana mekanis',
    categoryHint: 'MEP / WAH'
  },
  {
    id: 'kelompok_4',
    name: 'Kelompok 4 (20 Tahun)',
    years: 20,
    months: 240,
    ratePercent: 5.0,
    description: 'Bukan Bangunan: Jalur rel kereta mini, instalasi perpipaan bawah tanah kawasan',
    categoryHint: 'INF / REL'
  },
  {
    id: 'bangunan_permanen',
    name: 'Bangunan Permanen (20 Tahun)',
    years: 20,
    months: 240,
    ratePercent: 5.0,
    description: 'Bangunan Permanen: Gedung museum, anjungan daerah, kantor manajemen, panggung utama',
    categoryHint: 'GDG / ANJ'
  },
  {
    id: 'bangunan_semi_permanen',
    name: 'Bangunan Semi Permanen (10 Tahun)',
    years: 10,
    months: 120,
    ratePercent: 10.0,
    description: 'Bangunan Semi Permanen: Kios UMKM, gazebo kayu, pos pantau terbuka, shelter tunggu',
    categoryHint: 'POS / KIO'
  }
];

export interface AssetDepreciationSummary {
  assetId: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  location: string;
  acquisitionDate: string;
  acquisitionCost: number;
  salvageValue: number;
  depreciableBase: number;
  usefulLifeYears: number;
  usefulLifeMonths: number;
  usefulLifeLabel: string;
  depreciationMethod: 'Garis Lurus' | 'Saldo Menurun' | 'Tidak Disusutkan';
  elapsedMonths: number;
  remainingMonths: number;
  monthlyDepreciation: number;
  monthlyDepreciationSelectedMonth: number;
  accumulatedDepreciation: number;
  bookValue: number;
  depreciationPercentage: number;
  status: 'Belum Mulai' | 'Aktif Menyusut' | 'Habis Masa Manfaat' | 'Tidak Disusutkan' | 'Non-Aktif';
}

export interface MonthlyScheduleRow {
  monthIndex: number;
  yearMonth: string;
  periodLabel: string;
  beginningBookValue: number;
  depreciationExpense: number;
  accumulatedDepreciation: number;
  endingBookValue: number;
  isTargetMonth: boolean;
  isPast: boolean;
  isCurrentOrFuture: boolean;
}

export interface PortfolioDepreciationSummary {
  targetYearMonth: string;
  targetMonthLabel: string;
  totalAssets: number;
  activeDepreciatingCount: number;
  fullyDepreciatedCount: number;
  notStartedCount: number;
  nonDepreciableCount: number;
  totalAcquisitionCost: number;
  totalSalvageValue: number;
  totalDepreciableBase: number;
  totalMonthlyExpense: number;
  totalAccumulatedDepreciation: number;
  totalBookValue: number;
  averageDepreciationRatio: number;
  categoryBreakdown: Record<string, {
    category: string;
    count: number;
    totalCost: number;
    monthlyExpense: number;
    accumulatedDepreciation: number;
    bookValue: number;
  }>;
}

/**
 * Format string 'YYYY-MM' menjadi format teks Indonesia 'September 2026'
 */
export function formatYearMonthIndonesian(yearMonth: string): string {
  if (!yearMonth) return '';
  const parts = yearMonth.split('-');
  if (parts.length < 2) return yearMonth;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthName = INDONESIAN_MONTHS[monthIdx] || parts[1];
  return `${monthName} ${year}`;
}

/**
 * Format angka ke format mata uang Rupiah
 */
export function formatRupiah(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

/**
 * Parsing masa manfaat dari string / number menjadi jumlah tahun dan bulan
 */
export function parseUsefulLife(
  usefulLife?: string | number,
  method?: string
): { years: number; months: number; label: string; isNonDepreciable: boolean } {
  if (method === 'Tidak Disusutkan') {
    return { years: 0, months: 0, label: 'Tidak Disusutkan (Masa Tak Terbatas)', isNonDepreciable: true };
  }

  if (usefulLife === undefined || usefulLife === null || usefulLife === '') {
    return { years: 5, months: 60, label: '5 Tahun (60 Bulan)', isNonDepreciable: false };
  }

  if (typeof usefulLife === 'number') {
    if (usefulLife <= 0) {
      return { years: 0, months: 0, label: 'Tidak Disusutkan (Masa Tak Terbatas)', isNonDepreciable: true };
    }
    const y = usefulLife;
    const m = Math.round(y * 12);
    return { years: y, months: m, label: `${y} Tahun (${m} Bulan)`, isNonDepreciable: false };
  }

  const str = String(usefulLife).trim().toLowerCase();

  // Cek kata tidak disusutkan / tanah / non-depresiasi / tak terbatas / 0 tahun
  if (
    str.includes('tidak disusutkan') || 
    str.includes('non-depresiasi') || 
    str.includes('tak terbatas') ||
    str === '0' ||
    str === '0 tahun' ||
    str === '0 bln' ||
    str === '0 bulan'
  ) {
    return { years: 0, months: 0, label: 'Tidak Disusutkan (Masa Tak Terbatas)', isNonDepreciable: true };
  }

  // Cek kata 'bulan' atau 'bln'
  const monthMatch = str.match(/(\d+)\s*(?:bln|bulan|month)/i);
  if (monthMatch) {
    const m = parseInt(monthMatch[1], 10);
    if (m <= 0) {
      return { years: 0, months: 0, label: 'Tidak Disusutkan (Masa Tak Terbatas)', isNonDepreciable: true };
    }
    const y = Number((m / 12).toFixed(1));
    return { years: y, months: m, label: `${m} Bulan (${y} Thn)`, isNonDepreciable: false };
  }

  // Cek angka tahun
  const yearMatch = str.match(/(\d+(?:\.\d+)?)/);
  if (yearMatch) {
    const y = parseFloat(yearMatch[1]);
    if (y <= 0) {
      return { years: 0, months: 0, label: 'Tidak Disusutkan (Masa Tak Terbatas)', isNonDepreciable: true };
    }
    const m = Math.round(y * 12);
    return { years: y, months: m, label: `${y} Tahun (${m} Bulan)`, isNonDepreciable: false };
  }

  return { years: 5, months: 60, label: '5 Tahun (60 Bulan)', isNonDepreciable: false };
}

/**
 * Mendapatkan tahun dan bulan dari tanggal perolehan
 */
export function parseDateYearMonth(dateStr: string): { year: number; month: number } {
  if (!dateStr) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const parts = dateStr.slice(0, 10).split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = parseInt(parts[1], 10) || 1;
  return { year, month };
}

/**
 * Menghitung selisih bulan antara dua 'YYYY-MM'
 * Hasil positif jika target >= start
 */
export function getElapsedMonths(startYearMonth: string, targetYearMonth: string): number {
  const start = parseDateYearMonth(startYearMonth);
  const target = parseDateYearMonth(targetYearMonth);
  
  const diffYears = target.year - start.year;
  const diffMonths = target.month - start.month;
  // +1 karena bulan perolehan dihitung sebagai bulan pertama pemakaian depresiasi
  return (diffYears * 12) + diffMonths + 1;
}

/**
 * Menghitung depresiasi aset individual untuk target bulan yang dipilih (YYYY-MM)
 */
export function calculateAssetDepreciationForMonth(
  asset: FixedAsset, 
  targetYearMonth: string
): AssetDepreciationSummary {
  const acqCost = Number(asset.acquisitionCost) || 0;
  const salvage = Number(asset.salvageValue) || 0;

  // Tanggal perolehan
  const acqDate = asset.acquisitionDate || asset.createdAt || new Date().toISOString().slice(0, 10);
  const acqYearMonth = acqDate.slice(0, 7);

  // Cek apakah aset Tidak Disusutkan (seperti Tanah menurut PSAK 16)
  const isNonDepreciable = 
    asset.depreciationMethod === 'Tidak Disusutkan' ||
    asset.usefulLifeGroup === 'tanah_non_depresiasi' ||
    String(asset.usefulLife).toLowerCase().includes('tidak disusutkan') ||
    String(asset.usefulLife).trim() === '0' ||
    String(asset.usefulLife).toLowerCase().includes('tak terbatas');

  if (isNonDepreciable) {
    let status: AssetDepreciationSummary['status'] = 'Tidak Disusutkan';
    if (asset.status === 'Non-Aktif' || asset.status === 'Dihapuskan') {
      status = 'Non-Aktif';
    }

    return {
      assetId: asset.id,
      code: asset.code,
      name: asset.name,
      brand: asset.brand || '-',
      category: asset.category || 'Tanah',
      location: asset.location || 'Kawasan TMII',
      acquisitionDate: acqDate,
      acquisitionCost: acqCost,
      salvageValue: salvage,
      depreciableBase: 0,
      usefulLifeYears: 0,
      usefulLifeMonths: 0,
      usefulLifeLabel: 'Tidak Disusutkan (Tanah)',
      depreciationMethod: 'Tidak Disusutkan',
      elapsedMonths: 0,
      remainingMonths: 0,
      monthlyDepreciation: 0,
      monthlyDepreciationSelectedMonth: 0,
      accumulatedDepreciation: 0,
      bookValue: acqCost, // Nilai buku tanah tetap 100% sebesar nilai perolehan
      depreciationPercentage: 0,
      status
    };
  }

  const depreciableBase = Math.max(0, acqCost - salvage);
  const method = asset.depreciationMethod || 'Garis Lurus';

  const usefulLifeParsed = parseUsefulLife(asset.usefulLife, method);
  const totalMonths = Math.max(1, usefulLifeParsed.months);
  const monthlyDepr = depreciableBase / totalMonths;

  // Selisih bulan dari perolehan s/d akhir target bulan
  const rawElapsed = getElapsedMonths(acqYearMonth, targetYearMonth);
  const effectiveElapsed = Math.min(Math.max(0, rawElapsed), totalMonths);
  const remainingMonths = Math.max(0, totalMonths - effectiveElapsed);

  let status: AssetDepreciationSummary['status'] = 'Aktif Menyusut';
  if (asset.status === 'Non-Aktif' || asset.status === 'Dihapuskan') {
    status = 'Non-Aktif';
  } else if (rawElapsed <= 0) {
    status = 'Belum Mulai';
  } else if (rawElapsed >= totalMonths) {
    status = 'Habis Masa Manfaat';
  }

  // Beban depresiasi untuk bulan spesifik yang dipilih
  let monthlyDepreciationSelectedMonth = 0;
  if (status === 'Aktif Menyusut' && rawElapsed >= 1 && rawElapsed <= totalMonths) {
    // Pada bulan terakhir masa manfaat, sesuaikan sisa saldo agar presisi
    if (rawElapsed === totalMonths) {
      monthlyDepreciationSelectedMonth = Math.max(0, depreciableBase - (monthlyDepr * (totalMonths - 1)));
    } else {
      monthlyDepreciationSelectedMonth = monthlyDepr;
    }
  }

  // Akumulasi depresiasi s/d target bulan
  let accumulatedDepreciation = 0;
  if (rawElapsed <= 0) {
    accumulatedDepreciation = 0;
  } else if (rawElapsed >= totalMonths) {
    accumulatedDepreciation = depreciableBase;
  } else {
    accumulatedDepreciation = Math.min(depreciableBase, monthlyDepr * effectiveElapsed);
  }

  // Nilai buku bersih (Net Book Value)
  const bookValue = Math.max(salvage, acqCost - accumulatedDepreciation);

  // Persentase tersusutkan
  const depreciationPercentage = depreciableBase > 0 
    ? Math.min(100, Math.max(0, (accumulatedDepreciation / depreciableBase) * 100))
    : 100;

  return {
    assetId: asset.id,
    code: asset.code,
    name: asset.name,
    brand: asset.brand || '-',
    category: asset.category || 'Umum',
    location: asset.location || 'Kawasan TMII',
    acquisitionDate: acqDate,
    acquisitionCost: acqCost,
    salvageValue: salvage,
    depreciableBase,
    usefulLifeYears: usefulLifeParsed.years,
    usefulLifeMonths: totalMonths,
    usefulLifeLabel: usefulLifeParsed.label,
    depreciationMethod: method,
    elapsedMonths: effectiveElapsed,
    remainingMonths,
    monthlyDepreciation: Math.round(monthlyDepr),
    monthlyDepreciationSelectedMonth: Math.round(monthlyDepreciationSelectedMonth),
    accumulatedDepreciation: Math.round(accumulatedDepreciation),
    bookValue: Math.round(bookValue),
    depreciationPercentage: Number(depreciationPercentage.toFixed(1)),
    status
  };
}

/**
 * Menghasilkan tabel skedul depresiasi bulanan lengkap dari bulan pertama s/d habis masa manfaat
 */
export function generateAssetMonthlySchedule(
  asset: FixedAsset,
  targetYearMonth?: string
): MonthlyScheduleRow[] {
  const acqCost = Number(asset.acquisitionCost) || 0;
  const salvage = Number(asset.salvageValue) || 0;

  const acqDate = asset.acquisitionDate || asset.createdAt || new Date().toISOString().slice(0, 10);
  const acqParsed = parseDateYearMonth(acqDate);
  const nowYM = new Date().toISOString().slice(0, 7);

  // Cek apakah aset Tidak Disusutkan (Tanah)
  const isNonDepreciable = 
    asset.depreciationMethod === 'Tidak Disusutkan' ||
    asset.usefulLifeGroup === 'tanah_non_depresiasi' ||
    String(asset.usefulLife).toLowerCase().includes('tidak disusutkan') ||
    String(asset.usefulLife).trim() === '0' ||
    String(asset.usefulLife).toLowerCase().includes('tak terbatas');

  if (isNonDepreciable) {
    const rows: MonthlyScheduleRow[] = [];
    const targetYM = targetYearMonth || nowYM;
    const targetParsed = parseDateYearMonth(targetYM);

    // Tampilkan tabel 12 bulan di sekitar tahun target untuk visualisasi konstan
    for (let m = 1; m <= 12; m++) {
      const yearMonthStr = `${targetParsed.year}-${String(m).padStart(2, '0')}`;
      rows.push({
        monthIndex: m,
        yearMonth: yearMonthStr,
        periodLabel: formatYearMonthIndonesian(yearMonthStr),
        beginningBookValue: acqCost,
        depreciationExpense: 0,
        accumulatedDepreciation: 0,
        endingBookValue: acqCost,
        isTargetMonth: yearMonthStr === targetYM,
        isPast: yearMonthStr < nowYM,
        isCurrentOrFuture: yearMonthStr >= nowYM
      });
    }
    return rows;
  }

  const depreciableBase = Math.max(0, acqCost - salvage);
  const usefulLifeParsed = parseUsefulLife(asset.usefulLife, asset.depreciationMethod);
  const totalMonths = Math.max(1, usefulLifeParsed.months);
  const monthlyDepr = depreciableBase / totalMonths;

  const rows: MonthlyScheduleRow[] = [];

  let currentBookValue = acqCost;
  let runningAccumDepr = 0;

  for (let m = 1; m <= totalMonths; m++) {
    // Hitung tahun dan bulan kalender untuk bulan ke-m
    // Bulan 1 adalah acqParsed.month
    const totalMonthOffset = (acqParsed.month - 1) + (m - 1);
    const calYear = acqParsed.year + Math.floor(totalMonthOffset / 12);
    const calMonth = (totalMonthOffset % 12) + 1;
    const yearMonthStr = `${calYear}-${String(calMonth).padStart(2, '0')}`;

    const beginningBookValue = currentBookValue;

    let expense = monthlyDepr;
    if (m === totalMonths) {
      // Pembulatan presisi di bulan terakhir agar pas dengan nilai residu
      expense = Math.max(0, beginningBookValue - salvage);
    } else {
      expense = Math.min(expense, Math.max(0, beginningBookValue - salvage));
    }

    runningAccumDepr += expense;
    currentBookValue = Math.max(salvage, acqCost - runningAccumDepr);

    const isTarget = targetYearMonth ? yearMonthStr === targetYearMonth : false;
    const isPast = yearMonthStr < nowYM;
    const isCurrentOrFuture = yearMonthStr >= nowYM;

    rows.push({
      monthIndex: m,
      yearMonth: yearMonthStr,
      periodLabel: formatYearMonthIndonesian(yearMonthStr),
      beginningBookValue: Math.round(beginningBookValue),
      depreciationExpense: Math.round(expense),
      accumulatedDepreciation: Math.round(runningAccumDepr),
      endingBookValue: Math.round(currentBookValue),
      isTargetMonth: isTarget,
      isPast,
      isCurrentOrFuture
    });
  }

  return rows;
}

/**
 * Menghitung rekapitulasi portofolio seluruh aset tetap pada target bulan tertentu
 */
export function calculatePortfolioDepreciation(
  assets: FixedAsset[],
  targetYearMonth: string
): {
  summary: PortfolioDepreciationSummary;
  assetList: AssetDepreciationSummary[];
} {
  const assetList = assets.map(a => calculateAssetDepreciationForMonth(a, targetYearMonth));

  let totalAcquisitionCost = 0;
  let totalSalvageValue = 0;
  let totalDepreciableBase = 0;
  let totalMonthlyExpense = 0;
  let totalAccumulatedDepreciation = 0;
  let totalBookValue = 0;
  let activeDepreciatingCount = 0;
  let fullyDepreciatedCount = 0;
  let notStartedCount = 0;
  let nonDepreciableCount = 0;

  const categoryBreakdown: PortfolioDepreciationSummary['categoryBreakdown'] = {};

  for (const item of assetList) {
    totalAcquisitionCost += item.acquisitionCost;
    totalSalvageValue += item.salvageValue;
    totalDepreciableBase += item.depreciableBase;
    totalMonthlyExpense += item.monthlyDepreciationSelectedMonth;
    totalAccumulatedDepreciation += item.accumulatedDepreciation;
    totalBookValue += item.bookValue;

    if (item.status === 'Aktif Menyusut') {
      activeDepreciatingCount++;
    } else if (item.status === 'Habis Masa Manfaat') {
      fullyDepreciatedCount++;
    } else if (item.status === 'Belum Mulai') {
      notStartedCount++;
    } else if (item.status === 'Tidak Disusutkan') {
      nonDepreciableCount++;
    }

    // Category grouping
    const cat = item.category || 'Lainnya';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = {
        category: cat,
        count: 0,
        totalCost: 0,
        monthlyExpense: 0,
        accumulatedDepreciation: 0,
        bookValue: 0
      };
    }
    categoryBreakdown[cat].count += 1;
    categoryBreakdown[cat].totalCost += item.acquisitionCost;
    categoryBreakdown[cat].monthlyExpense += item.monthlyDepreciationSelectedMonth;
    categoryBreakdown[cat].accumulatedDepreciation += item.accumulatedDepreciation;
    categoryBreakdown[cat].bookValue += item.bookValue;
  }

  const averageDepreciationRatio = totalDepreciableBase > 0
    ? Math.min(100, Math.max(0, (totalAccumulatedDepreciation / totalDepreciableBase) * 100))
    : 0;

  const summary: PortfolioDepreciationSummary = {
    targetYearMonth,
    targetMonthLabel: formatYearMonthIndonesian(targetYearMonth),
    totalAssets: assets.length,
    activeDepreciatingCount,
    fullyDepreciatedCount,
    notStartedCount,
    nonDepreciableCount,
    totalAcquisitionCost,
    totalSalvageValue,
    totalDepreciableBase,
    totalMonthlyExpense,
    totalAccumulatedDepreciation,
    totalBookValue,
    averageDepreciationRatio: Number(averageDepreciationRatio.toFixed(1)),
    categoryBreakdown
  };

  return { summary, assetList };
}
