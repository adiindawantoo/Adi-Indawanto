import * as XLSX from 'xlsx';
import { ConfiguredLocation, FixedAsset, DEFAULT_ASSET_LOCATIONS } from '../types';
import { getGoogleMapsUrl, getGoogleDirectionsUrl } from './geoUtils';
import { resolveLocationAreaCode } from './assetCodeGenerator';

export interface LocationExportRow {
  'No': number;
  'Nama Lokasi': string;
  'Wilayah': string;
  'Zona': string;
  'Kategori Area': string;
  'Kode Area': string;
  'Deskripsi / Keterangan': string;
  'Titik Koordinat': string;
  'Latitude (Lintang)': number | string;
  'Longitude (Bujur)': number | string;
  'Status Koordinat': string;
  'Tautan Google Maps': string;
  'Tautan Navigasi': string;
  'Nama Lain / Alias': string;
  'Jumlah Aset Terkait': number;
  'Total Nilai Perolehan (IDR)': number;
  'Nilai Perolehan (Terformat)': string;
  'Sumber Konfigurasi': string;
  'ID Dokumen': string;
  'Tanggal Konfigurasi': string;
}

/**
 * Format angka mata uang Rupiah
 */
function formatRupiah(val: number): string {
  if (!val || isNaN(val)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
}

/**
 * Memetakan daftar lokasi terkonfigurasi ke dalam baris export dengan kolom lengkap dan terisi
 */
export function prepareConfiguredLocationsExportData(
  locations: ConfiguredLocation[],
  assets: FixedAsset[] = []
): LocationExportRow[] {
  if (!locations || locations.length === 0) return [];

  // Hitung agregasi aset per lokasi terlebih dahulu untuk performa O(N + M)
  const assetCountMap: Record<string, number> = {};
  const assetValueMap: Record<string, number> = {};

  assets.forEach(ast => {
    if (!ast) return;
    const locName = (ast.location || '').trim().toLowerCase();
    if (!locName) return;

    const cost = Number(ast.acquisitionCost) || 0;
    assetCountMap[locName] = (assetCountMap[locName] || 0) + 1;
    assetValueMap[locName] = (assetValueMap[locName] || 0) + cost;
  });

  return locations.map((loc, idx) => {
    const cleanName = (loc.name || '').trim();
    const lowerName = cleanName.toLowerCase();

    // Cari referensi master default TMII untuk melengkapi alias atau koordinat fallback jika belum terisi
    const defaultRef = DEFAULT_ASSET_LOCATIONS.find(d => 
      d.name.toLowerCase() === lowerName || 
      d.aliases?.some(a => a.toLowerCase() === lowerName)
    );

    // Ambil koordinat
    const lat = typeof loc.latitude === 'number' && !isNaN(loc.latitude) && loc.latitude !== 0 
      ? loc.latitude 
      : defaultRef?.latitude;
    const lng = typeof loc.longitude === 'number' && !isNaN(loc.longitude) && loc.longitude !== 0 
      ? loc.longitude 
      : defaultRef?.longitude;

    const hasValidCoords = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);

    // Format string koordinat siap pakai
    const coordString = hasValidCoords ? `${lat!.toFixed(6)}, ${lng!.toFixed(6)}` : '-';

    // Google Maps & Directions URL
    const gmapsUrl = hasValidCoords
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : getGoogleMapsUrl(cleanName);
    const navUrl = hasValidCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : getGoogleDirectionsUrl(cleanName);

    // Resolusi kode area
    const categoryName = loc.category || defaultRef?.category || 'Area Makro TMII';
    const areaCodeObj = resolveLocationAreaCode(categoryName, locations);

    // Hitung aset yang berada di lokasi ini (exact atau contains)
    let assetCount = assetCountMap[lowerName] || 0;
    let assetValue = assetValueMap[lowerName] || 0;

    // Jika belum cocok exact, cek partial matching
    if (assetCount === 0) {
      assets.forEach(ast => {
        const aLoc = (ast.location || '').toLowerCase();
        if (aLoc && (aLoc.includes(lowerName) || lowerName.includes(aLoc))) {
          assetCount += 1;
          assetValue += (Number(ast.acquisitionCost) || 0);
        }
      });
    }

    // Identifikasi apakah ini default atau kustom Firestore
    const isCustom = loc.id && !loc.id.startsWith('default-');
    const sourceLabel = isCustom ? 'Kustom Database Firestore' : 'Master Database TMII';

    // Format tanggal
    let formattedDate = '-';
    if (loc.createdAt) {
      try {
        const d = new Date(loc.createdAt);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch {
        formattedDate = loc.createdAt;
      }
    }

    const aliasesText = defaultRef?.aliases && defaultRef.aliases.length > 0 
      ? defaultRef.aliases.join(', ') 
      : '-';

    const shortZone = (loc.region || '')
      .replace('Wilayah ', '')
      .trim();

    return {
      'No': idx + 1,
      'Nama Lokasi': cleanName,
      'Wilayah': loc.region || 'Wilayah TMII',
      'Zona': shortZone || 'Pusat',
      'Kategori Area': categoryName,
      'Kode Area': `[${areaCodeObj.code}] ${areaCodeObj.label}`,
      'Deskripsi / Keterangan': loc.description || defaultRef?.description || '-',
      'Titik Koordinat': coordString,
      'Latitude (Lintang)': hasValidCoords ? lat! : '-',
      'Longitude (Bujur)': hasValidCoords ? lng! : '-',
      'Status Koordinat': hasValidCoords ? 'Tersedia (Presisi GPS)' : 'Belum Ditetapkan',
      'Tautan Google Maps': gmapsUrl,
      'Tautan Navigasi': navUrl,
      'Nama Lain / Alias': aliasesText,
      'Jumlah Aset Terkait': assetCount,
      'Total Nilai Perolehan (IDR)': assetValue,
      'Nilai Perolehan (Terformat)': formatRupiah(assetValue),
      'Sumber Konfigurasi': sourceLabel,
      'ID Dokumen': loc.id || `loc-${idx + 1}`,
      'Tanggal Konfigurasi': formattedDate
    };
  });
}

/**
 * Ekspor daftar lokasi terkonfigurasi ke file Excel (.xlsx) atau CSV (.csv)
 */
export function exportConfiguredLocations(
  locations: ConfiguredLocation[],
  options: {
    format?: 'xlsx' | 'csv';
    fileName?: string;
    assets?: FixedAsset[];
    sheetTitle?: string;
  } = {}
) {
  const {
    format = 'xlsx',
    fileName = `Daftar_Lokasi_Terkonfigurasi_TMII_${new Date().toISOString().split('T')[0]}`,
    assets = [],
    sheetTitle = 'Daftar Lokasi'
  } = options;

  const exportData = prepareConfiguredLocationsExportData(locations, assets);
  if (exportData.length === 0) {
    throw new Error('Tidak ada data lokasi untuk diunduh.');
  }

  // Buat worksheet dari JSON data
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Atur lebar kolom otomatis agar rapi dan tidak terpotong
  const colKeys = Object.keys(exportData[0]) as (keyof LocationExportRow)[];
  const colWidths = colKeys.map(key => {
    let maxLen = key.length;
    for (const row of exportData) {
      const val = row[key];
      if (val !== undefined && val !== null) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    }
    // Batasi lebar kolom minimum 10 dan maksimum 65 karakter
    return { wch: Math.min(Math.max(maxLen + 3, 10), 65) };
  });
  ws['!cols'] = colWidths;

  // Buat workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle.substring(0, 31));

  if (format === 'csv') {
    // Generate CSV dengan UTF-8 BOM agar terbaca sempurna di Excel / Spreadsheet
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Simpan file Excel (.xlsx)
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }
}
