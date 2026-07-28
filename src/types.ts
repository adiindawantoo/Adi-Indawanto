export interface UserTask {
  id: string;
  title: string;
  description: string;
  status: 'Belum Dimulai' | 'Sedang Berjalan' | 'Selesai' | 'Ditunda';
  assignee: string;
  startDate: string;
  dueDate: string;
  priority: 'Rendah' | 'Sedang' | 'Tinggi' | 'Urgent';
  category: 'Umum' | 'Fixed Asset' | 'Satwa' | 'CCTV' | 'MEP' | 'Museum';
  driveFileId?: string;
  driveFileUrl?: string;
  driveFileName?: string;
  createdAt: string;
  notes?: string;
}

export interface FixedAsset {
  id: string;
  code: string;
  name: string;
  brand: string; // Merk dan Tipe
  ownership?: string; // Kepemilikan
  area?: string; // Area
  location: string; // Lokasi
  category?: string; // Kategori
  type?: string; // Jenis (Jenis Aset)
  classification?: string; // Aset / LVA
  acquisitionDate: string; // Tanggal Perolehan
  acquisitionCost: number; // Nilai Perolehan
  usefulLife?: string; // Masa Manfaat (e.g. "5 Tahun")
  condition: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Demolished'; // Kondisi
  status: 'Aktif' | 'Non-Aktif' | 'Diperbaiki' | 'Dihapuskan'; // Status
  photoUrl?: string; // Foto Aset
  driveFileUrl?: string; // Lampiran Google Drive URL
  driveFileName?: string; // Lampiran Google Drive Name
  lastMaintenance?: string;
  nextMaintenance?: string;
  notes?: string;
  createdAt: string;
}

export interface AnimalAsset {
  id: string;
  code: string;
  name: string;
  species: string;
  location: string;
  healthStatus: 'Sehat' | 'Dalam Perawatan' | 'Sakit' | 'Karantina';
  lastCheckup?: string;
  nextCheckup?: string;
  diet?: string;
  medicalHistory?: string;
  createdAt: string;
}

export interface CctvAsset {
  id: string;
  code: string;
  name: string;
  location: string;
  brand: string;
  status: 'Aktif' | 'Mati' | 'Rusak' | 'Perbaikan';
  ipAddress?: string;
  lastMaintenance?: string;
  notes?: string;
  createdAt: string;
}

export interface MepAsset {
  id: string;
  code: string;
  name: string;
  category: 'Mechanical' | 'Electrical' | 'Plumbing';
  location: string;
  brand: string;
  capacity?: string;
  status: 'Normal' | 'Bermasalah' | 'Mati Total' | 'Service';
  maintenanceFrequency: 'Mingguan' | 'Bulanan' | 'Triwulanan' | 'Tahunan';
  lastMaintenance?: string;
  nextMaintenance?: string;
  notes?: string;
  createdAt: string;
}

export interface MuseumCollection {
  id: string;
  registerNo: string;
  name: string;
  category: string;
  museumName: string;
  origin?: string;
  material?: string;
  dimension?: string;
  condition: 'Utuh' | 'Rusak Sebagian' | 'Rusak Parah';
  description?: string;
  driveFileUrl?: string;
  createdAt: string;
}

export interface AllowedEmail {
  id: string;
  email: string;
  addedAt: string;
  addedBy: string;
  role?: 'admin' | 'viewer';
}

export type TmiiRegionName = 'Wilayah Utara' | 'Wilayah Selatan' | 'Wilayah Barat' | 'Wilayah Timur' | 'Wilayah Pusat';

export interface ConfiguredLocation {
  id: string;
  name: string;
  region: TmiiRegionName;
  category?: string;
  description?: string;
  createdAt: string;
}

export interface ConfiguredCategory {
  id: string;
  category: string;
  types: string[];
  createdAt?: string;
}

export const DEFAULT_ASSET_CATEGORIES: { category: string; types: string[] }[] = [
  {
    category: 'Tanah',
    types: ['Lahan Operasional', 'Lahan Komersial', 'Lahan Parkir']
  },
  {
    category: 'Bangunan',
    types: ['Gedung Administrasi', 'Gedung Operasional', 'Gedung Utilitas', 'Museum', 'Tempat Ibadah', 'Theater', 'Gudang', 'Pos Keamanan']
  },
  {
    category: 'Infrastruktur & Landskap',
    types: ['Trotoar & Pedestrian', 'Drainase & Saluran Air', 'Jembatan', 'Gerbang / Gate Kawasan', 'Pagar', 'Area Parkir (Fisik Aspal/Paving)', 'Tiang Lampu & Penerangan', 'Jaringan Utilitas Kawasan', 'Sistem Air Bersih & Limbah', 'Pohon Koleksi & Tanaman', 'Hardscape (Jalan Taman/Plaza)', 'Kolam & Air Mancur', 'Patung & Ornamen Budaya', 'Gazebo / Shelter Istirahat', 'Papan Informasi']
  },
  {
    category: 'Kendaraan',
    types: ['Kendaraan Operasional', 'Kendaraan Pengunjung', 'Shuttle Wisata', 'Kendaraan Teknik', 'Kendaraan Listrik', 'Kendaraan Kebersihan']
  },
  {
    category: 'Peralatan & Mesin',
    types: ['Genset', 'Pompa', 'Lift & Eskalator', 'Mesin Workshop', 'Mesin Kebersihan', 'AC', 'Kompressor', 'Peralatan Event / Tenda Sarnafil', 'Sound System', 'Peralatan Utilitas Kantor', 'Alat Teknik Lapangan']
  },
  {
    category: 'IT & Telekomunikasi',
    types: ['PC / Desktop', 'Laptop', 'Printer & Scanner', 'CCTV & Security System', 'Access Control', 'Router & Switch Jaringan', 'Videotron', 'Sistem Ticketing', 'Perangkat Audio Visual', 'Handy Talkie (HT)', 'Perangkat Dokumentasi (Kamera/Drone)']
  },
  {
    category: 'Furniture & Interior',
    types: ['Meja', 'Kursi', 'Lemari', 'Sofa', 'Rak Display', 'Interior Museum', 'Partisi', 'Podium', 'Interior Auditorium']
  }
];

export const LOCATION_AREA_CATEGORIES = [
  'Area Makro TMII',
  'Area Parkir',
  'Gate',
  'Gedung Pengelola',
  'Gedung Serbaguna',
  'Museum',
  'Plaza',
  'Rumah Ibadah',
  'Wahana Berbayar',
  'Wilayah Anjungan'
];

export const DEFAULT_ASSET_LOCATIONS: { name: string; region: TmiiRegionName; category: string; description?: string }[] = [
  // Wilayah Barat
  { name: 'Teater Tanah Airku', region: 'Wilayah Barat', category: 'Area Makro TMII' },
  { name: 'Tourist Information Center', region: 'Wilayah Barat', category: 'Area Makro TMII' },
  { name: 'Trem Station', region: 'Wilayah Barat', category: 'Area Makro TMII' },
  { name: 'Tugu Api Pancasila', region: 'Wilayah Barat', category: 'Area Makro TMII' },
  { name: 'Gedung Parkir Elevated', region: 'Wilayah Barat', category: 'Area Parkir' },
  { name: 'Pintu 1', region: 'Wilayah Barat', category: 'Gate' },
  { name: 'Pintu 3', region: 'Wilayah Barat', category: 'Gate' },
  { name: 'Pintu Pejalan Kaki', region: 'Wilayah Barat', category: 'Gate' },
  { name: 'Contemporary Art Gallery', region: 'Wilayah Barat', category: 'Gedung Pengelola' },
  { name: 'Merchandise', region: 'Wilayah Barat', category: 'Gedung Pengelola' },
  { name: 'Office Lantai 1', region: 'Wilayah Barat', category: 'Gedung Pengelola' },
  { name: 'Office Lantai 2', region: 'Wilayah Barat', category: 'Gedung Pengelola' },
  { name: 'Office Lantai 3', region: 'Wilayah Barat', category: 'Gedung Pengelola' },
  { name: 'Sasono Adiguna', region: 'Wilayah Barat', category: 'Gedung Serbaguna' },
  { name: 'Sasono Langen Budoyo', region: 'Wilayah Barat', category: 'Gedung Serbaguna' },
  { name: 'Sasono Utomo', region: 'Wilayah Barat', category: 'Gedung Serbaguna' },
  { name: 'Museum Indonesia', region: 'Wilayah Barat', category: 'Museum' },
  { name: 'Plaza Gajah Mada', region: 'Wilayah Barat', category: 'Plaza' },
  { name: 'Plaza Keong Mas', region: 'Wilayah Barat', category: 'Plaza' },
  { name: 'Plaza Kori', region: 'Wilayah Barat', category: 'Plaza' },
  { name: 'Plaza Lokomotif', region: 'Wilayah Barat', category: 'Plaza' },
  { name: 'Plaza Selatan', region: 'Wilayah Barat', category: 'Plaza' },
  { name: 'Plaza Utara', region: 'Wilayah Barat', category: 'Plaza' },
  { name: 'Prasasti APEC', region: 'Wilayah Barat', category: 'Plaza' },
  { name: 'Kereta Gantung A', region: 'Wilayah Barat', category: 'Wahana Berbayar' },
  { name: 'Kereta Gantung C', region: 'Wilayah Barat', category: 'Wahana Berbayar' },
  { name: 'Theater Keong Mas', region: 'Wilayah Barat', category: 'Wahana Berbayar' },
  { name: 'DKI Jakarta', region: 'Wilayah Barat', category: 'Wilayah Anjungan' },
  { name: 'Lampung', region: 'Wilayah Barat', category: 'Wilayah Anjungan' },

  // Wilayah Pusat
  { name: 'Ampiteater Jawadwipa', region: 'Wilayah Pusat', category: 'Area Makro TMII' },
  { name: 'Community Center', region: 'Wilayah Pusat', category: 'Area Makro TMII' },
  { name: 'Dancing Fountain', region: 'Wilayah Pusat', category: 'Area Makro TMII' },
  { name: 'Menara Saujana', region: 'Wilayah Pusat', category: 'Area Makro TMII' },
  { name: 'Panggung Budaya', region: 'Wilayah Pusat', category: 'Area Makro TMII' },
  { name: 'Caping Gunung', region: 'Wilayah Pusat', category: 'Gedung Serbaguna' },
  { name: 'Plaza Malaka', region: 'Wilayah Pusat', category: 'Plaza' },
  { name: 'Plaza Promenade', region: 'Wilayah Pusat', category: 'Plaza' },

  // Wilayah Selatan
  { name: 'Museum Keprajuritan', region: 'Wilayah Selatan', category: 'Museum' },
  { name: 'Museum Pusaka', region: 'Wilayah Selatan', category: 'Museum' },
  { name: 'Museum Serangga', region: 'Wilayah Selatan', category: 'Museum' },
  { name: 'Museum Transportasi', region: 'Wilayah Selatan', category: 'Museum' },
  { name: 'Gereja Katholik', region: 'Wilayah Selatan', category: 'Rumah Ibadah' },
  { name: 'Gereja Protestan', region: 'Wilayah Selatan', category: 'Rumah Ibadah' },
  { name: 'Klenteng Konghucu', region: 'Wilayah Selatan', category: 'Rumah Ibadah' },
  { name: 'Masjid', region: 'Wilayah Selatan', category: 'Rumah Ibadah' },
  { name: 'Pura', region: 'Wilayah Selatan', category: 'Rumah Ibadah' },
  { name: 'Sasana Adirasa', region: 'Wilayah Selatan', category: 'Rumah Ibadah' },
  { name: 'Wihara', region: 'Wilayah Selatan', category: 'Rumah Ibadah' },
  { name: 'Dunia Air Tawar', region: 'Wilayah Selatan', category: 'Wahana Berbayar' },
  { name: 'Museum Asmat', region: 'Wilayah Selatan', category: 'Wahana Berbayar' },
  { name: 'Taman Legenda', region: 'Wilayah Selatan', category: 'Wahana Berbayar' },
  { name: 'Bali', region: 'Wilayah Selatan', category: 'Wilayah Anjungan' },
  { name: 'DI Yogyakarta', region: 'Wilayah Selatan', category: 'Wilayah Anjungan' },
  { name: 'Jawa Barat', region: 'Wilayah Selatan', category: 'Wilayah Anjungan' },
  { name: 'Jawa Tengah', region: 'Wilayah Selatan', category: 'Wilayah Anjungan' },
  { name: 'Jawa Timur', region: 'Wilayah Selatan', category: 'Wilayah Anjungan' },
  { name: 'Nusa Tenggara Barat', region: 'Wilayah Selatan', category: 'Wilayah Anjungan' },
  { name: 'Nusa Tenggara Timur', region: 'Wilayah Selatan', category: 'Wilayah Anjungan' },
  { name: 'Sulawesi Selatan', region: 'Wilayah Selatan', category: 'Wilayah Anjungan' },
  { name: 'Sulawesi Tenggara', region: 'Wilayah Selatan', category: 'Wilayah Anjungan' },

  // Wilayah Timur
  { name: 'Hotel Desa Wisata', region: 'Wilayah Timur', category: 'Area Makro TMII' },
  { name: 'Kayu Gedhe', region: 'Wilayah Timur', category: 'Area Makro TMII' },
  { name: 'Pintu 4', region: 'Wilayah Timur', category: 'Gate' },
  { name: 'Istana Anak-Anak', region: 'Wilayah Timur', category: 'Museum' },
  { name: 'Museum Batik', region: 'Wilayah Timur', category: 'Museum' },
  { name: 'Museum Hakka', region: 'Wilayah Timur', category: 'Museum' },
  { name: 'Museum Listrik', region: 'Wilayah Timur', category: 'Museum' },
  { name: 'Museum Minyak & Gas Bumi', region: 'Wilayah Timur', category: 'Museum' },
  { name: 'Museum Perangko', region: 'Wilayah Timur', category: 'Museum' },
  { name: 'Taman Budaya Tionghoa', region: 'Wilayah Timur', category: 'Museum' },
  { name: 'Monumen Persahabatan KTT', region: 'Wilayah Timur', category: 'Plaza' },
  { name: 'Taman Piknik', region: 'Wilayah Timur', category: 'Plaza' },
  { name: 'Indonesia Science Center', region: 'Wilayah Timur', category: 'Wahana Berbayar' },
  { name: 'Kereta Gantung B', region: 'Wilayah Timur', category: 'Wahana Berbayar' },
  { name: 'Konservasi Burung', region: 'Wilayah Timur', category: 'Wahana Berbayar' },
  { name: 'Museum Komodo & Reptil', region: 'Wilayah Timur', category: 'Wahana Berbayar' },
  { name: 'Taman Burung', region: 'Wilayah Timur', category: 'Wahana Berbayar' },
  { name: 'Bangka Belitung', region: 'Wilayah Timur', category: 'Wilayah Anjungan' },
  { name: 'Banten', region: 'Wilayah Timur', category: 'Wilayah Anjungan' },
  { name: 'Maluku Utara', region: 'Wilayah Timur', category: 'Wilayah Anjungan' },
  { name: 'Papua Barat', region: 'Wilayah Timur', category: 'Wilayah Anjungan' },
  { name: 'Sulawesi Tengah', region: 'Wilayah Timur', category: 'Wilayah Anjungan' },
  { name: 'Sulawesi Utara', region: 'Wilayah Timur', category: 'Wilayah Anjungan' },
  { name: 'Timor Timur', region: 'Wilayah Timur', category: 'Wilayah Anjungan' },

  // Wilayah Utara
  { name: 'Food Court Pasar Nusantara', region: 'Wilayah Utara', category: 'Area Makro TMII' },
  { name: 'Ganara Art', region: 'Wilayah Utara', category: 'Area Makro TMII' },
  { name: 'Gedung Teknik', region: 'Wilayah Utara', category: 'Area Makro TMII' },
  { name: 'Taman Melati', region: 'Wilayah Utara', category: 'Area Makro TMII' },
  { name: 'Pintu 2', region: 'Wilayah Utara', category: 'Gate' },
  { name: 'Museum Monumen Penerangan', region: 'Wilayah Utara', category: 'Museum' },
  { name: 'Museum Pemadam Kebakaran', region: 'Wilayah Utara', category: 'Museum' },
  { name: 'Sky World', region: 'Wilayah Utara', category: 'Wahana Berbayar' },
  { name: 'Aceh', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Bengkulu', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Gorontalo', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Jambi', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Kalimantan Barat', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Kalimantan Selatan', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Kalimantan Tengah', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Kalimantan Timur', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Kep. Riau', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Maluku', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Papua', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Riau', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Sumatera Barat', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Sumatera Utara', region: 'Wilayah Utara', category: 'Wilayah Anjungan' },
  { name: 'Sumatra Selatan', region: 'Wilayah Utara', category: 'Wilayah Anjungan' }
];

export interface AppTheme {
  id: string;
  name: string;
  primaryColor: string;
  darkAccent: string;
  hoverBg: string;
  activeBgLight: string;
  textClass: string;
  bgLightClass: string;
  bgSolidClass: string;
  shadowClass: string;
  gradientClass: string;
}

export const APP_THEMES: AppTheme[] = [
  {
    id: 'sumatera',
    name: 'Sumatera (Songket Minang)',
    primaryColor: '#900C3F',
    darkAccent: '#581845',
    hoverBg: 'hover:bg-[#900C3F]/15',
    activeBgLight: 'bg-[#900C3F]/15 text-[#900C3F]',
    textClass: 'text-[#900C3F]',
    bgLightClass: 'bg-[#900C3F]/10',
    bgSolidClass: 'bg-[#900C3F]',
    shadowClass: 'shadow-[#900C3F]/20 hover:shadow-[#900C3F]/35',
    gradientClass: 'from-[#581845] via-[#900C3F] to-[#C0392B]'
  },
  {
    id: 'jawa',
    name: 'Jawa (Kawung Kraton)',
    primaryColor: '#0F2537',
    darkAccent: '#0B1924',
    hoverBg: 'hover:bg-[#0F2537]/15',
    activeBgLight: 'bg-[#0F2537]/15 text-[#0F2537]',
    textClass: 'text-[#0F2537]',
    bgLightClass: 'bg-[#0F2537]/10',
    bgSolidClass: 'bg-[#0F2537]',
    shadowClass: 'shadow-[#0F2537]/20 hover:shadow-[#0F2537]/35',
    gradientClass: 'from-[#0B1924] via-[#0F2537] to-[#1F4068]'
  },
  {
    id: 'kalimantan',
    name: 'Kalimantan (Ukir Dayak)',
    primaryColor: '#0B5345',
    darkAccent: '#073B31',
    hoverBg: 'hover:bg-[#0B5345]/15',
    activeBgLight: 'bg-[#0B5345]/15 text-[#0B5345]',
    textClass: 'text-[#0B5345]',
    bgLightClass: 'bg-[#0B5345]/10',
    bgSolidClass: 'bg-[#0B5345]',
    shadowClass: 'shadow-[#0B5345]/20 hover:shadow-[#0B5345]/35',
    gradientClass: 'from-[#073B31] via-[#0B5345] to-[#117A65]'
  },
  {
    id: 'sulawesi',
    name: 'Sulawesi (Ukir Toraja)',
    primaryColor: '#A04000',
    darkAccent: '#6E2C00',
    hoverBg: 'hover:bg-[#A04000]/15',
    activeBgLight: 'bg-[#A04000]/15 text-[#A04000]',
    textClass: 'text-[#A04000]',
    bgLightClass: 'bg-[#A04000]/10',
    bgSolidClass: 'bg-[#A04000]',
    shadowClass: 'shadow-[#A04000]/20 hover:shadow-[#A04000]/35',
    gradientClass: 'from-[#6E2C00] via-[#A04000] to-[#D35400]'
  },
  {
    id: 'papua',
    name: 'Papua (Seni Asmat)',
    primaryColor: '#512E5F',
    darkAccent: '#341840',
    hoverBg: 'hover:bg-[#512E5F]/15',
    activeBgLight: 'bg-[#512E5F]/15 text-[#512E5F]',
    textClass: 'text-[#512E5F]',
    bgLightClass: 'bg-[#512E5F]/10',
    bgSolidClass: 'bg-[#512E5F]',
    shadowClass: 'shadow-[#512E5F]/20 hover:shadow-[#512E5F]/35',
    gradientClass: 'from-[#341840] via-[#512E5F] to-[#7D3C98]'
  }
];

export interface AssetTransfer {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  originArea: string;
  originLocation: string;
  destinationArea: string;
  destinationLocation: string;
  transferDate: string;
  senderName: string; // yang menyerahkan
  receiverName: string; // yang menerima
  assetManagerName: string; // mengetahui dari asset management
  reason: string;
  documentNo: string; // Nomor BAST
  createdAt: string;
}

export interface StockOpnameItem {
  assetId: string;
  assetCode: string;
  assetName: string;
  expectedLocation: string;
  actualLocation: string;
  status: 'Sesuai' | 'Tidak Sesuai' | 'Hilang' | 'Belum Diperiksa';
  notes?: string;
  checkedAt?: string;
}

export interface StockOpnameSession {
  id: string;
  sessionName: string;
  locationFilter: string; // e.g. "Semua" or a specific Location
  status: 'Berjalan' | 'Selesai';
  checkedBy: string;
  createdAt: string;
  completedAt?: string;
  items: StockOpnameItem[];
}

export interface AssetMaintenance {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  assetCategory?: string;
  assetLocation?: string;
  maintenanceDate: string; // Tanggal Maintenance (YYYY-MM-DD)
  description: string; // Keterangan maintenance
  cost: number; // Biaya yang dikeluarkan (Rp)
  vendorTechnician?: string; // Teknisi / Vendor / Penanggung jawab
  status: 'Selesai' | 'Dalam Proses' | 'Dijadwalkan'; // Status
  notes?: string;
  createdByName?: string;
  createdAt: string;
}



