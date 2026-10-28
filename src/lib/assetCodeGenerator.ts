/**
 * Modul Standarisasi & Generator Otomatis Kode Aset TMII
 * Berdasarkan Regulasi Aturan Kodefikasi Aset Tetap TMII
 * Format: [Kode1][Kode2].[Kode3][Kode4].[Kode5]-[Kode6]
 * Contoh: BMN03.INF04.26-001
 */

import { ConfiguredLocation, ConfiguredCategory } from '../types';

// ============================================================================
// 1. KODE 1: KEPEMILIKAN ASET
// ============================================================================
export interface OwnershipRule {
  code: string;
  name: string;
  description: string;
}

export const ASSET_OWNERSHIP_RULES: OwnershipRule[] = [
  { code: 'BMN', name: 'Barang Milik Negara', description: 'Aset milik Kementerian Sekretariat Negara / Negara RI' },
  { code: 'TWC', name: 'PT Taman Wisata Candi', description: 'Aset kepemilikan PT Taman Wisata Candi Borobudur, Prambanan & Ratu Boko' },
  { code: 'BHV', name: 'PT Bhumi Visatanda Indonesia', description: 'Aset kepemilikan PT Bhumi Visatanda Indonesia (Pengelola Operasional TMII)' },
  { code: 'KEM', name: 'Kementrian', description: 'Aset milik Kementerian / Lembaga mitra di kawasan TMII' },
  { code: 'PRV', name: 'Pemerintah Provinsi', description: 'Aset milik Pemerintah Daerah / Anjungan Daerah Provinsi' }
];

// ============================================================================
// 2. KODE 2: LOKASI ASET (ZONA / KATEGORI KAWASAN)
// ============================================================================
export interface LocationAreaRule {
  code: string; // 2 digit (01-11)
  name: string;
  description: string;
}

export const ASSET_LOCATION_AREA_RULES: LocationAreaRule[] = [
  { code: '01', name: 'Area Makro TMII', description: 'Kawasan umum terpadu, jalan utama makro, dan ruang terbuka makro' },
  { code: '02', name: 'Area Parkir', description: 'Gedung parkir terpadu, kantong parkir bus, dan lahan parkir kendaraan' },
  { code: '03', name: 'Gate', description: 'Pintu masuk utama (Pintu 1, 2, 3, 4) & pintu gerbang pedestrian kawasan' },
  { code: '04', name: 'Gedung Pengelola', description: 'Kantor manajemen TMII, gedung direksi, dan administrasi operasional' },
  { code: '05', name: 'Gedung Serbaguna', description: 'Sasono Utomo, Sasono Langen Budoyo, Sasono Adiguna & gedung serbaguna' },
  { code: '06', name: 'Gedung Operasional', description: 'Gedung workshop teknik, depo utilitas, dan pos logistik' },
  { code: '07', name: 'Museum', description: 'Kompleks museum sains, budaya, teknologi, dan sejarah di TMII' },
  { code: '08', name: 'Plaza', description: 'Plaza Tugu Api Pancasila, Plaza Keong Emas, Plaza Bhinneka, & amphiteater' },
  { code: '09', name: 'Rumah Ibadah', description: 'Kompleks kerukunan rumah ibadah 6 agama (Masjid, Gereja, Pura, Vihara, Klenteng)' },
  { code: '10', name: 'Wahana', description: 'Wahana wisata, kereta gantung, taman rekreasi air, bioskop IMAX, dan atraksi' },
  { code: '11', name: 'Wilayah Anjungan', description: 'Kompleks 34+ rumah adat & anjungan provinsi nusantara' }
];

// ============================================================================
// 3. KODE 3 & KODE 4: KATEGORI & TIPE ASET
// ============================================================================
export interface AssetTypeRule {
  code: string; // 2 digit (01-15)
  name: string;
}

export interface AssetCategoryRule {
  code: string; // 3 char (TNH, BNG, INF, KND, PRM, ITT, FRI)
  name: string;
  types: AssetTypeRule[];
}

export const ASSET_CATEGORY_RULES: AssetCategoryRule[] = [
  {
    code: 'TNH',
    name: 'Tanah',
    types: [
      { code: '01', name: 'Lahan Operasional' },
      { code: '02', name: 'Lahan Komersial' },
      { code: '03', name: 'Lahan Parkir' }
    ]
  },
  {
    code: 'BNG',
    name: 'Bangunan',
    types: [
      { code: '01', name: 'Gedung Administrasi' },
      { code: '02', name: 'Gedung Operasional' },
      { code: '03', name: 'Gedung Utilitas' },
      { code: '04', name: 'Museum' },
      { code: '05', name: 'Tempat Ibadah' },
      { code: '06', name: 'Theater' },
      { code: '07', name: 'Gudang' },
      { code: '08', name: 'Pos Keamanan' }
    ]
  },
  {
    code: 'INF',
    name: 'Infrastruktur & Landskap',
    types: [
      { code: '01', name: 'Trotoar & Pedestrian' },
      { code: '02', name: 'Drainase & Saluran Air' },
      { code: '03', name: 'Jembatan' },
      { code: '04', name: 'Gerbang / Gate Kawasan' },
      { code: '05', name: 'Pagar' },
      { code: '06', name: 'Area Parkir (Fisik Aspal/Paving)' },
      { code: '07', name: 'Tiang Lampu & Penerangan' },
      { code: '08', name: 'Jaringan Utilitas Kawasan' },
      { code: '09', name: 'Sistem Air Bersih & Limbah' },
      { code: '10', name: 'Pohon Koleksi & Tanaman' },
      { code: '11', name: 'Hardscape (Jalan Taman/Plaza)' },
      { code: '12', name: 'Kolam & Air Mancur' },
      { code: '13', name: 'Patung & Ornamen Budaya' },
      { code: '14', name: 'Gazebo / Shelter Istirahat' },
      { code: '15', name: 'Papan Informasi' }
    ]
  },
  {
    code: 'KND',
    name: 'Kendaraan',
    types: [
      { code: '01', name: 'Kendaraan Operasional' },
      { code: '02', name: 'Kendaraan Pengunjung' },
      { code: '03', name: 'Shuttle Wisata' },
      { code: '04', name: 'Kendaraan Teknik' },
      { code: '05', name: 'Kendaraan Listrik' },
      { code: '06', name: 'Kendaraan Kebersihan' }
    ]
  },
  {
    code: 'PRM',
    name: 'Peralatan & Mesin',
    types: [
      { code: '01', name: 'Genset' },
      { code: '02', name: 'Pompa' },
      { code: '03', name: 'Lift & Eskalator' },
      { code: '04', name: 'Mesin Workshop' },
      { code: '05', name: 'Mesin Kebersihan' },
      { code: '06', name: 'AC' },
      { code: '07', name: 'Kompressor' },
      { code: '08', name: 'Peralatan Event / Tenda Sarnafil / Sound System' },
      { code: '09', name: 'Peralatan Utilitas Kantor' },
      { code: '10', name: 'Alat Teknik Lapangan' }
    ]
  },
  {
    code: 'ITT',
    name: 'IT & Telekomunikasi',
    types: [
      { code: '01', name: 'PC / Desktop' },
      { code: '02', name: 'Laptop' },
      { code: '03', name: 'Printer & Scanner' },
      { code: '04', name: 'CCTV & Security System' },
      { code: '05', name: 'Access Control' },
      { code: '06', name: 'Router & Switch Jaringan' },
      { code: '07', name: 'Videotron' },
      { code: '08', name: 'Sistem Ticketing' },
      { code: '09', name: 'Perangkat Audio Visual' },
      { code: '10', name: 'Handy Talkie (HT)' },
      { code: '11', name: 'Perangkat Dokumentasi (Kamera/Drone)' }
    ]
  },
  {
    code: 'FRI',
    name: 'Furniture & Interior',
    types: [
      { code: '01', name: 'Meja' },
      { code: '02', name: 'Kursi' },
      { code: '03', name: 'Lemari' },
      { code: '04', name: 'Sofa' },
      { code: '05', name: 'Rak Display' },
      { code: '06', name: 'Interior Museum' },
      { code: '07', name: 'Partisi' },
      { code: '08', name: 'Podium' },
      { code: '09', name: 'Interior Auditorium' }
    ]
  }
];

// ============================================================================
// HELPER FUNCTIONS FOR CODE RESOLUTION
// ============================================================================

/**
 * Mendapatkan Kode 1 (Kepemilikan) dari nama atau kode langsung
 */
export function resolveOwnershipCode(input: string): string {
  if (!input) return 'BMN';
  const clean = input.trim().toUpperCase();
  
  // Jika sudah merupakan kode resmi
  const foundByCode = ASSET_OWNERSHIP_RULES.find(r => r.code === clean);
  if (foundByCode) return foundByCode.code;

  // Cek kecocokan nama
  const lower = input.toLowerCase();
  if (lower.includes('bmn') || lower.includes('barang milik negara') || lower.includes('negara')) return 'BMN';
  if (lower.includes('twc') || lower.includes('taman wisata candi')) return 'TWC';
  if (lower.includes('bhv') || lower.includes('bhumi visatanda')) return 'BHV';
  if (lower.includes('kem') || lower.includes('kementerian') || lower.includes('kementrian')) return 'KEM';
  if (lower.includes('prv') || lower.includes('provinsi') || lower.includes('daerah')) return 'PRV';

  return 'BMN'; // Default
}

/**
 * Mendapatkan Kode 2 (Lokasi Aset) dari nama lokasi atau kategori lokasi
 */
export function resolveLocationAreaCode(
  locationCategoryOrName: string,
  configuredLocations: ConfiguredLocation[] = []
): { code: string; label: string } {
  if (!locationCategoryOrName) return { code: '01', label: 'Area Makro TMII' };
  
  const raw = locationCategoryOrName.trim();

  // 1. Cek jika raw langsung cocok dengan kode 2 digit (01-11)
  const byDirectCode = ASSET_LOCATION_AREA_RULES.find(r => r.code === raw);
  if (byDirectCode) return { code: byDirectCode.code, label: byDirectCode.name };

  // 2. Cek apakah lokasi ini terdaftar di configuredLocations dan memiliki atribut category
  const matchedConfig = configuredLocations.find(l => 
    l.name.toLowerCase().trim() === raw.toLowerCase() ||
    (l.category && l.category.toLowerCase().trim() === raw.toLowerCase())
  );
  const candidateCategory = matchedConfig?.category || raw;

  // 3. Cocokkan dengan ASSET_LOCATION_AREA_RULES
  const lower = candidateCategory.toLowerCase();
  
  if (lower.includes('makro')) return { code: '01', label: 'Area Makro TMII' };
  if (lower.includes('parkir')) return { code: '02', label: 'Area Parkir' };
  if (lower.includes('gate') || lower.includes('pintu') || lower.includes('gerbang')) return { code: '03', label: 'Gate' };
  if (lower.includes('pengelola') || lower.includes('kantor pengelola') || lower.includes('manajemen')) return { code: '04', label: 'Gedung Pengelola' };
  if (lower.includes('serbaguna') || lower.includes('sasono')) return { code: '05', label: 'Gedung Serbaguna' };
  if (lower.includes('operasional') || lower.includes('workshop') || lower.includes('depo')) return { code: '06', label: 'Gedung Operasional' };
  if (lower.includes('museum')) return { code: '07', label: 'Museum' };
  if (lower.includes('plaza') || lower.includes('tugu api')) return { code: '08', label: 'Plaza' };
  if (lower.includes('ibadah') || lower.includes('masjid') || lower.includes('gereja') || lower.includes('pura') || lower.includes('vihara') || lower.includes('klenteng')) return { code: '09', label: 'Rumah Ibadah' };
  if (lower.includes('wahana') || lower.includes('atraksi') || lower.includes('dunia air') || lower.includes('sky world') || lower.includes('keong emas')) return { code: '10', label: 'Wahana' };
  if (lower.includes('anjungan')) return { code: '11', label: 'Wilayah Anjungan' };

  // Default fallback
  return { code: '01', label: 'Area Makro TMII' };
}

/**
 * Mendapatkan Kode 3 (Kategori Aset)
 */
export function resolveCategoryCode(categoryName: string, customCategories: ConfiguredCategory[] = []): { code: string; label: string } {
  if (!categoryName) return { code: 'INF', label: 'Infrastruktur & Landskap' };
  const clean = categoryName.trim();

  // 1. Cek apakah sudah merupakan kode 3 huruf
  const byCode = ASSET_CATEGORY_RULES.find(c => c.code.toUpperCase() === clean.toUpperCase());
  if (byCode) return { code: byCode.code, label: byCode.name };

  // 2. Cocokkan dengan nama kategori standar
  const lower = clean.toLowerCase();
  if (lower.includes('tanah')) return { code: 'TNH', label: 'Tanah' };
  if (lower.includes('bangunan') || lower.includes('gedung')) return { code: 'BNG', label: 'Bangunan' };
  if (lower.includes('infrastruktur') || lower.includes('landskap')) return { code: 'INF', label: 'Infrastruktur & Landskap' };
  if (lower.includes('kendaraan') || lower.includes('mobil') || lower.includes('motor') || lower.includes('shuttle')) return { code: 'KND', label: 'Kendaraan' };
  if (lower.includes('peralatan') || lower.includes('mesin') || lower.includes('mep') || lower.includes('mekanikal') || lower.includes('elektrikal')) return { code: 'PRM', label: 'Peralatan & Mesin' };
  if (lower.includes('it') || lower.includes('telekomunikasi') || lower.includes('komputer') || lower.includes('cctv')) return { code: 'ITT', label: 'IT & Telekomunikasi' };
  if (lower.includes('furniture') || lower.includes('interior') || lower.includes('mebel')) return { code: 'FRI', label: 'Furniture & Interior' };

  // 3. Cek custom categories jika ada
  const customMatch = customCategories.find(c => c.category.toLowerCase() === lower);
  if (customMatch) {
    // Generate 3 uppercase letters from first word or initials
    const genCode = customMatch.category.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
    return { code: genCode.padEnd(3, 'X'), label: customMatch.category };
  }

  return { code: 'INF', label: 'Infrastruktur & Landskap' };
}

/**
 * Mendapatkan Kode 4 (Tipe Aset) berdasarkan Kategori dan Nama Tipe
 */
export function resolveTypeCode(
  categoryName: string,
  typeName: string,
  customCategories: ConfiguredCategory[] = []
): { code: string; label: string } {
  const catRes = resolveCategoryCode(categoryName, customCategories);
  const catRule = ASSET_CATEGORY_RULES.find(c => c.code === catRes.code);

  if (!typeName) {
    // Default to first type
    const firstType = catRule?.types[0];
    return firstType ? { code: firstType.code, label: firstType.name } : { code: '01', label: 'Umum' };
  }

  const raw = typeName.trim();
  const lower = raw.toLowerCase();

  // 1. Cek langsung di aturan tipe kategori tersebut
  if (catRule) {
    // Cek direct code match (e.g. "04")
    const byDirectCode = catRule.types.find(t => t.code === raw);
    if (byDirectCode) return { code: byDirectCode.code, label: byDirectCode.name };

    // Cek name match
    const byName = catRule.types.find(t => 
      t.name.toLowerCase() === lower || 
      lower.includes(t.name.toLowerCase()) || 
      t.name.toLowerCase().includes(lower)
    );
    if (byName) return { code: byName.code, label: byName.name };
  }

  // 2. Cek di custom categories jika ada
  const customCat = customCategories.find(c => c.category.toLowerCase() === categoryName.toLowerCase());
  if (customCat && customCat.types.length > 0) {
    const idx = customCat.types.findIndex(t => t.toLowerCase() === lower);
    if (idx >= 0) {
      const numCode = String(idx + 1).padStart(2, '0');
      return { code: numCode, label: customCat.types[idx] };
    }
  }

  return { code: '01', label: typeName || 'Umum' };
}

/**
 * Mendapatkan Kode 5 (Tahun Beli / Perolehan) -> 2 digit tahun
 */
export function resolveYearCode(yearOrDate: string | number | undefined): { code: string; fullYear: string } {
  const now = new Date();
  let yearNum = now.getFullYear();

  if (typeof yearOrDate === 'number') {
    yearNum = yearOrDate;
  } else if (typeof yearOrDate === 'string' && yearOrDate.trim()) {
    const str = yearOrDate.trim();
    // Bisa format ISO "2026-05-14" atau 4 digit "2026"
    if (str.includes('-')) {
      const parts = str.split('-');
      const parsed = parseInt(parts[0], 10);
      if (!isNaN(parsed) && parsed > 1900 && parsed < 2100) yearNum = parsed;
    } else {
      const parsed = parseInt(str, 10);
      if (!isNaN(parsed) && parsed > 1900 && parsed < 2100) yearNum = parsed;
    }
  }

  const code = String(yearNum % 100).padStart(2, '0');
  return { code, fullYear: String(yearNum) };
}

// ============================================================================
// AUTO GENERATOR ENGINE
// ============================================================================

export interface AutoGenerateParams {
  ownership?: string; // Kode 1 (e.g. BMN, PT Taman Wisata Candi, etc.)
  locationNameOrCategory?: string; // Kode 2 (e.g. Pintu 1, Gate, etc.)
  category?: string; // Kode 3 (e.g. Bangunan, BNG, etc.)
  type?: string; // Kode 4 (e.g. Gedung Administrasi, 01, etc.)
  acquisitionYearOrDate?: string | number; // Kode 5 (e.g. 2026, 2026-01-01, etc.)
}

export interface GeneratedAssetCodeResult {
  fullCode: string;
  prefix: string; // [Kode1][Kode2].[Kode3][Kode4].[Kode5]-
  kode1: { code: string; label: string };
  kode2: { code: string; label: string };
  kode3: { code: string; label: string };
  kode4: { code: string; label: string };
  kode5: { code: string; fullYear: string };
  kode6: { sequenceNumber: number; sequenceStr: string };
  isExistingMatch: boolean;
  totalMatchingAssetsCount: number;
}

/**
 * Menghitung nomor urut selanjutnya dan men-generate kode aset resmi lengkap
 */
export function generateNextAssetCode(
  params: AutoGenerateParams,
  existingAssets: { code: string }[] = [],
  configuredLocations: ConfiguredLocation[] = [],
  customCategories: ConfiguredCategory[] = []
): GeneratedAssetCodeResult {
  const k1Code = resolveOwnershipCode(params.ownership || 'BMN');
  const k1Rule = ASSET_OWNERSHIP_RULES.find(r => r.code === k1Code);
  const kode1 = { code: k1Code, label: k1Rule?.name || k1Code };

  const kode2 = resolveLocationAreaCode(params.locationNameOrCategory || '', configuredLocations);
  const kode3 = resolveCategoryCode(params.category || '', customCategories);
  const kode4 = resolveTypeCode(params.category || kode3.label, params.type || '', customCategories);
  const kode5 = resolveYearCode(params.acquisitionYearOrDate);

  // Prefix format standar baru menggunakan pemisah titik: BMN03.INF04.26-
  const prefix = `${kode1.code}${kode2.code}.${kode3.code}${kode4.code}.${kode5.code}-`;
  const legacyPrefix = `${kode1.code}${kode2.code}.${kode3.code}${kode4.code}/${kode5.code}-`;

  // Cari semua aset di database yang memiliki awalan prefix ini
  const upperPrefix = prefix.toUpperCase();
  const upperLegacyPrefix = legacyPrefix.toUpperCase();
  let maxSeq = 0;
  let matchCount = 0;

  existingAssets.forEach(a => {
    if (a && a.code) {
      const c = a.code.trim().toUpperCase();
      if (c.startsWith(upperPrefix)) {
        matchCount++;
        const suffix = c.substring(upperPrefix.length);
        const seqNum = parseInt(suffix, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      } else if (c.startsWith(upperLegacyPrefix)) {
        matchCount++;
        const suffix = c.substring(upperLegacyPrefix.length);
        const seqNum = parseInt(suffix, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const sequenceStr = String(nextSeq).padStart(3, '0');
  const fullCode = `${prefix}${sequenceStr}`;

  return {
    fullCode,
    prefix,
    kode1,
    kode2,
    kode3,
    kode4,
    kode5,
    kode6: { sequenceNumber: nextSeq, sequenceStr },
    isExistingMatch: matchCount > 0,
    totalMatchingAssetsCount: matchCount
  };
}

// ============================================================================
// CODE PARSER (MENGURAI KODE ASET)
// ============================================================================

export interface ParsedAssetCodeResult {
  isValid: boolean;
  isValidFormat: boolean; // Alias untuk kompatibilitas tampilan
  rawCode: string;
  kode1?: { code: string; label: string };
  kode2?: { code: string; label: string };
  kode3?: { code: string; label: string };
  kode4?: { code: string; label: string };
  kode5?: { code: string; fullYear: string };
  kode6?: { sequenceStr: string; sequenceNumber: number };
  // Alias tambahan untuk kompatibilitas form & rincian
  ownership?: { code: string; name: string };
  locationArea?: { code: string; category: string };
  category?: { code: string; name: string };
  type?: { code: string; name: string };
  acquisitionYear?: string;
  sequenceNumber?: string;
  breakdownSummary?: string;
  explanation?: string;
  errorMessage?: string;
}

/**
 * Mem-parse kode aset (misal: BMN03.INF04.26-001 atau toleran variasi BMN03.INF04/26-001)
 * dan mengembalikan breakdown komponen-komponennya.
 */
export function parseAssetCode(codeStr: string): ParsedAssetCodeResult {
  if (!codeStr || !codeStr.trim()) {
    return { isValid: false, isValidFormat: false, rawCode: codeStr, errorMessage: 'Kode aset tidak boleh kosong' };
  }

  const clean = codeStr.trim().toUpperCase();
  
  // Format regex standar baru: [Kode1:3][Kode2:2].[Kode3:3][Kode4:2].[Kode5:2]-[Kode6:3] (toleransi '/' untuk kompatibilitas data lama)
  const regex = /^([A-Z]{3})(\d{2})\.([A-Z]{3})(\d{2})([.\/])(\d{2})-(\d{3,})$/;
  const match = clean.match(regex);

  if (!match) {
    return {
      isValid: false,
      isValidFormat: false,
      rawCode: codeStr,
      errorMessage: 'Format tidak sesuai aturan TMII [Kode1][Kode2].[Kode3][Kode4].[Kode5]-[Kode6] (Contoh: BMN03.INF04.26-001)'
    };
  }

  const [_, k1, k2, k3, k4, _separator, k5, k6] = match;

  // Kode 1
  const k1Rule = ASSET_OWNERSHIP_RULES.find(r => r.code === k1);
  const kode1 = { code: k1, label: k1Rule?.name || `Entitas ${k1}` };

  // Kode 2
  const k2Rule = ASSET_LOCATION_AREA_RULES.find(r => r.code === k2);
  const kode2 = { code: k2, label: k2Rule?.name || `Zona Lokasi ${k2}` };

  // Kode 3
  const k3Rule = ASSET_CATEGORY_RULES.find(r => r.code === k3);
  const kode3 = { code: k3, label: k3Rule?.name || `Kategori ${k3}` };

  // Kode 4
  const k4Rule = k3Rule?.types.find(t => t.code === k4);
  const kode4 = { code: k4, label: k4Rule?.name || `Jenis Tipe ${k4}` };

  // Kode 5
  const year2000 = 2000 + parseInt(k5, 10);
  const kode5 = { code: k5, fullYear: String(year2000) };

  // Kode 6
  const seqNum = parseInt(k6, 10);
  const kode6 = { sequenceStr: k6, sequenceNumber: seqNum };

  const breakdownSummary = `${kode1.code} • ${kode3.code}${kode4.code} • Thn ${kode5.fullYear} • #${k6}`;
  const explanation = `Aset ${kode1.label} (${k1}), lokasi di ${kode2.label} (${k2}), Kategori ${kode3.label} (${k3}), Jenis ${kode4.label} (${k4}), tahun perolehan ${kode5.fullYear}, nomor urut ${seqNum}.`;

  return {
    isValid: true,
    isValidFormat: true,
    rawCode: clean,
    kode1,
    kode2,
    kode3,
    kode4,
    kode5,
    kode6,
    ownership: { code: k1, name: kode1.label },
    locationArea: { code: k2, category: kode2.label },
    category: { code: k3, name: kode3.label },
    type: { code: k4, name: kode4.label },
    acquisitionYear: kode5.fullYear,
    sequenceNumber: k6,
    breakdownSummary,
    explanation
  };
}

// ============================================================================
// BATCH ASSET CODE GENERATOR (STANDARISASI MASSAL KODE ASET)
// ============================================================================

export interface BatchAssetCodeItem {
  id: string;
  name: string;
  brand?: string;
  ownership?: string;
  area?: string;
  location: string;
  category?: string;
  type?: string;
  acquisitionDate?: string;
  currentCode: string;
  isCurrentCodeValid: boolean;
  generatedCode: string;
  hasChanged: boolean;
  prefix: string;
  sequenceNumber: number;
  breakdown: {
    k1: { code: string; label: string };
    k2: { code: string; label: string };
    k3: { code: string; label: string };
    k4: { code: string; label: string };
    k5: { code: string; fullYear: string };
    k6: { sequenceStr: string; sequenceNumber: number };
  };
}

export interface BatchGenerateOptions {
  mode: 'non_standard_only' | 'all_assets';
  configuredLocations?: ConfiguredLocation[];
  configuredCategories?: ConfiguredCategory[];
}

export interface BatchGenerateSummary {
  items: BatchAssetCodeItem[];
  totalAssets: number;
  validStandardCount: number;
  nonStandardCount: number;
  changedCount: number;
  prefixGroupsCount: number;
}

/**
 * Menghasilkan kode standar TMII untuk seluruh koleksi aset secara massal,
 * dengan penomoran urut sekuensial bebas tabrakan (collision-free).
 */
export function generateBatchAssetCodes(
  assets: {
    id: string;
    code: string;
    name: string;
    brand?: string;
    ownership?: string;
    area?: string;
    location: string;
    category?: string;
    type?: string;
    acquisitionDate?: string;
  }[],
  options: BatchGenerateOptions = { mode: 'non_standard_only' }
): BatchGenerateSummary {
  const { mode = 'non_standard_only', configuredLocations = [], configuredCategories = [] } = options;

  // 1. Hitung prefix untuk setiap aset
  interface PreparedAsset {
    raw: (typeof assets)[0];
    parsedCurrent: ParsedAssetCodeResult;
    k1: { code: string; label: string };
    k2: { code: string; label: string };
    k3: { code: string; label: string };
    k4: { code: string; label: string };
    k5: { code: string; fullYear: string };
    prefix: string;
    sortKey: string;
  }

  const prepared: PreparedAsset[] = assets.map(asset => {
    const k1Code = resolveOwnershipCode(asset.ownership || 'BMN');
    const k1Rule = ASSET_OWNERSHIP_RULES.find(r => r.code === k1Code);
    const k1 = { code: k1Code, label: k1Rule?.name || k1Code };

    const k2 = resolveLocationAreaCode(asset.location || '', configuredLocations);
    const k3 = resolveCategoryCode(asset.category || '', configuredCategories);
    const k4 = resolveTypeCode(asset.category || k3.label, asset.type || '', configuredCategories);
    const k5 = resolveYearCode(asset.acquisitionDate);

    const prefix = `${k1.code}${k2.code}.${k3.code}${k4.code}.${k5.code}-`;
    const parsedCurrent = parseAssetCode(asset.code || '');

    // Urutan sort: tanggal perolehan asc, lalu nama barang
    const sortKey = `${asset.acquisitionDate || '9999-99-99'}_${(asset.name || '').toLowerCase()}_${asset.id}`;

    return {
      raw: asset,
      parsedCurrent,
      k1,
      k2,
      k3,
      k4,
      k5,
      prefix,
      sortKey
    };
  });

  // 2. Kelompokkan per prefix
  const groupsByPrefix = new Map<string, PreparedAsset[]>();
  prepared.forEach(item => {
    const list = groupsByPrefix.get(item.prefix) || [];
    list.push(item);
    groupsByPrefix.set(item.prefix, list);
  });

  const resultMap = new Map<string, BatchAssetCodeItem>();

  // 3. Proses tiap grup prefix
  groupsByPrefix.forEach((groupItems, prefix) => {
    if (mode === 'non_standard_only') {
      // Catat nomor urut aset yang sudah valid standar
      const usedSequences = new Set<number>();
      const needGeneration: PreparedAsset[] = [];

      groupItems.forEach(item => {
        // Jika format sudah valid standar TMII dan prefix-nya cocok
        const cleanCurrent = (item.raw.code || '').trim().toUpperCase();
        if (item.parsedCurrent.isValid && cleanCurrent.startsWith(prefix.toUpperCase())) {
          const seq = item.parsedCurrent.kode6?.sequenceNumber || 1;
          usedSequences.add(seq);

          const seqStr = String(seq).padStart(3, '0');
          resultMap.set(item.raw.id, {
            id: item.raw.id,
            name: item.raw.name,
            brand: item.raw.brand,
            ownership: item.raw.ownership,
            area: item.raw.area,
            location: item.raw.location,
            category: item.raw.category,
            type: item.raw.type,
            acquisitionDate: item.raw.acquisitionDate,
            currentCode: item.raw.code,
            isCurrentCodeValid: true,
            generatedCode: item.raw.code, // Tetap gunakan kode saat ini
            hasChanged: false,
            prefix,
            sequenceNumber: seq,
            breakdown: {
              k1: item.k1,
              k2: item.k2,
              k3: item.k3,
              k4: item.k4,
              k5: item.k5,
              k6: { sequenceStr: seqStr, sequenceNumber: seq }
            }
          });
        } else {
          needGeneration.push(item);
        }
      });

      // Urutkan aset yang butuh penomoran baru
      needGeneration.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

      let curSeq = 1;
      needGeneration.forEach(item => {
        while (usedSequences.has(curSeq)) {
          curSeq++;
        }
        usedSequences.add(curSeq);

        const seqStr = String(curSeq).padStart(3, '0');
        const genCode = `${prefix}${seqStr}`;

        resultMap.set(item.raw.id, {
          id: item.raw.id,
          name: item.raw.name,
          brand: item.raw.brand,
          ownership: item.raw.ownership,
          area: item.raw.area,
          location: item.raw.location,
          category: item.raw.category,
          type: item.raw.type,
          acquisitionDate: item.raw.acquisitionDate,
          currentCode: item.raw.code,
          isCurrentCodeValid: item.parsedCurrent.isValid,
          generatedCode: genCode,
          hasChanged: genCode !== (item.raw.code || '').trim(),
          prefix,
          sequenceNumber: curSeq,
          breakdown: {
            k1: item.k1,
            k2: item.k2,
            k3: item.k3,
            k4: item.k4,
            k5: item.k5,
            k6: { sequenceStr: seqStr, sequenceNumber: curSeq }
          }
        });
        curSeq++;
      });
    } else {
      // Mode 'all_assets': Urutkan semua aset dalam grup ini secara kronologis dan renumber dari 1
      groupItems.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

      groupItems.forEach((item, index) => {
        const seq = index + 1;
        const seqStr = String(seq).padStart(3, '0');
        const genCode = `${prefix}${seqStr}`;

        resultMap.set(item.raw.id, {
          id: item.raw.id,
          name: item.raw.name,
          brand: item.raw.brand,
          ownership: item.raw.ownership,
          area: item.raw.area,
          location: item.raw.location,
          category: item.raw.category,
          type: item.raw.type,
          acquisitionDate: item.raw.acquisitionDate,
          currentCode: item.raw.code,
          isCurrentCodeValid: item.parsedCurrent.isValid,
          generatedCode: genCode,
          hasChanged: genCode !== (item.raw.code || '').trim(),
          prefix,
          sequenceNumber: seq,
          breakdown: {
            k1: item.k1,
            k2: item.k2,
            k3: item.k3,
            k4: item.k4,
            k5: item.k5,
            k6: { sequenceStr: seqStr, sequenceNumber: seq }
          }
        });
      });
    }
  });

  // Pertahankan urutan awal aset
  const items: BatchAssetCodeItem[] = assets.map(a => resultMap.get(a.id)!);
  const totalAssets = items.length;
  const validStandardCount = items.filter(i => i.isCurrentCodeValid).length;
  const nonStandardCount = totalAssets - validStandardCount;
  const changedCount = items.filter(i => i.hasChanged).length;
  const prefixGroupsCount = groupsByPrefix.size;

  return {
    items,
    totalAssets,
    validStandardCount,
    nonStandardCount,
    changedCount,
    prefixGroupsCount
  };
}
