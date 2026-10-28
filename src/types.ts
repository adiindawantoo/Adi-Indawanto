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
  // Guest Reporting Attributes
  source?: 'guest' | 'internal';
  reporterName?: string;
  reporterContact?: string;
  reporterUnit?: string;
  ticketNumber?: string;
  reportType?: 'Kerusakan' | 'Pemindahan' | 'Inspeksi' | 'Lainnya';
  assetCode?: string;
  assetName?: string;
  locationArea?: string;
  locationDetail?: string;
  isUntagged?: boolean;
  photoUrl?: string;
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
  usefulLife?: string; // Masa Manfaat (e.g. "5 Tahun" atau "60 Bulan")
  salvageValue?: number; // Nilai Residu / Sisa (Default: 0)
  depreciationMethod?: 'Garis Lurus' | 'Saldo Menurun' | 'Tidak Disusutkan'; // Metode Depresiasi (Default: 'Garis Lurus')
  usefulLifeGroup?: string; // Kelompok Pajak / Golongan Masa Manfaat (e.g. "Kelompok 1 (4 Tahun)")
  condition: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Demolished'; // Kondisi
  status: 'Aktif' | 'Non-Aktif' | 'Diperbaiki' | 'Dihapuskan'; // Status
  photoUrl?: string; // Foto Aset
  driveFileUrl?: string; // Lampiran Google Drive URL
  driveFileName?: string; // Lampiran Google Drive Name
  lastMaintenance?: string;
  nextMaintenance?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
}

export interface AnimalAsset {
  id: string;
  code?: string;
  name: string; // Nama Satwa (Mandatory)
  latinName: string; // Nama Latin (Mandatory)
  type: 'Aves' | 'Reptil' | 'Pisces' | 'Amfibi' | 'Mamalia'; // Jenis (Mandatory)
  location: string; // Lokasi (Mandatory)
  locationDetail?: string; // Detail Lokasi (Optional)
  gender?: 'Jantan' | 'Betina' | 'Belum Teridentifikasi'; // Jenis Kelamin (Optional)
  healthStatus?: string; // Kondisi Kesehatan (Optional)
  nicknameOrCode?: string; // Nama Panggilan / Kode Khusus (Optional)
  notes?: string; // Keterangan (Optional)
  // Backward compatibility fields
  species?: string;
  lastCheckup?: string;
  nextCheckup?: string;
  diet?: string;
  medicalHistory?: string;
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
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
  createdBy?: string;
  createdByName?: string;
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
  createdBy?: string;
  createdByName?: string;
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
  createdBy?: string;
  createdByName?: string;
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
  latitude?: number;
  longitude?: number;
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
  'Gedung Operasional',
  'Museum',
  'Plaza',
  'Rumah Ibadah',
  'Wahana',
  'Wahana Berbayar',
  'Wilayah Anjungan'
];

export interface DefaultAssetLocation {
  name: string;
  region: TmiiRegionName;
  category: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  aliases?: string[];
}

export const DEFAULT_ASSET_LOCATIONS: DefaultAssetLocation[] = [
  // ==========================================
  // WILAYAH BARAT
  // ==========================================
  {
    name: 'Pintu 1',
    region: 'Wilayah Barat',
    category: 'Gate',
    description: 'Pintu gerbang utama TMII sisi barat dari arah Jl. Raya Taman Mini',
    latitude: -6.29952,
    longitude: 106.88905,
    aliases: ['Gerbang Pintu 1', 'Pintu Masuk 1', 'Gerbang Utama Barat', 'Gate 1']
  },
  {
    name: 'Pintu Pejalan Kaki',
    region: 'Wilayah Barat',
    category: 'Gate',
    description: 'Akses khusus pejalan kaki (pedestrian gate) di sebelah Pintu 1 Barat',
    latitude: -6.29960,
    longitude: 106.88930,
    aliases: ['Pintu Masuk Pejalan Kaki', 'Pedestrian Gate', 'Pintu Pedestrian']
  },
  {
    name: 'Gedung Parkir Elevated',
    region: 'Wilayah Barat',
    category: 'Area Parkir',
    description: 'Gedung parkir mobil & motor bertingkat terpadu sisi barat',
    latitude: -6.29980,
    longitude: 106.88990,
    aliases: ['Parkir Elevated', 'Gedung Parkir Barat', 'Parkir Pintu 1']
  },
  {
    name: 'Pintu 3',
    region: 'Wilayah Barat',
    category: 'Gate',
    description: 'Pintu gerbang TMII sisi barat daya dekat akses Hankam / Mabes TNI',
    latitude: -6.30795,
    longitude: 106.89375,
    aliases: ['Gerbang Pintu 3', 'Pintu Masuk 3', 'Gate 3', 'Pintu Mabes TNI']
  },
  {
    name: 'Tourist Information Center',
    region: 'Wilayah Barat',
    category: 'Area Makro TMII',
    description: 'Pusat layanan informasi pengunjung dan registrasi tur wisata',
    latitude: -6.30010,
    longitude: 106.89180,
    aliases: ['TIC', 'Pusat Informasi', 'Pusat Informasi Wisata', 'Tourist Center']
  },
  {
    name: 'Contemporary Art Gallery',
    region: 'Wilayah Barat',
    category: 'Gedung Pengelola',
    description: 'Galeri seni rupa kontemporer TMII',
    latitude: -6.30110,
    longitude: 106.89190,
    aliases: ['CAG', 'Galeri Seni Kontemporer', 'Contemporary Art']
  },
  {
    name: 'Merchandise',
    region: 'Wilayah Barat',
    category: 'Gedung Pengelola',
    description: 'Toko cenderamata dan official merchandise resmi TMII',
    latitude: -6.30130,
    longitude: 106.89210,
    aliases: ['Toko Souvenir', 'Merchandise TMII', 'Store Merchandise']
  },
  {
    name: 'Office Lantai 1',
    region: 'Wilayah Barat',
    category: 'Gedung Pengelola',
    description: 'Kantor Pengelola TMII Lantai 1 (Operasional & Customer Service)',
    latitude: -6.30140,
    longitude: 106.89220,
    aliases: ['Gedung Pengelola Lt 1', 'Kantor Pengelola Lt 1', 'Office Lt 1']
  },
  {
    name: 'Office Lantai 2',
    region: 'Wilayah Barat',
    category: 'Gedung Pengelola',
    description: 'Kantor Pengelola TMII Lantai 2 (Administrasi & IT/Aset)',
    latitude: -6.30140,
    longitude: 106.89220,
    aliases: ['Gedung Pengelola Lt 2', 'Kantor Pengelola Lt 2', 'Office Lt 2']
  },
  {
    name: 'Office Lantai 3',
    region: 'Wilayah Barat',
    category: 'Gedung Pengelola',
    description: 'Kantor Pengelola TMII Lantai 3 (Direksi & Manajemen)',
    latitude: -6.30140,
    longitude: 106.89220,
    aliases: ['Gedung Pengelola Lt 3', 'Kantor Pengelola Lt 3', 'Office Lt 3']
  },
  {
    name: 'Sasono Adiguna',
    region: 'Wilayah Barat',
    category: 'Gedung Serbaguna',
    description: 'Gedung pertemuan dan resepsi serbaguna bergaya arsitektur Jawa',
    latitude: -6.30180,
    longitude: 106.89180,
    aliases: ['Gedung Sasono Adiguna', 'Sasono Adiguna Hall']
  },
  {
    name: 'Sasono Langen Budoyo',
    region: 'Wilayah Barat',
    category: 'Gedung Serbaguna',
    description: 'Gedung pementasan tari, teater, dan resepsi budaya',
    latitude: -6.30155,
    longitude: 106.89260,
    aliases: ['Gedung Sasono Langen Budoyo', 'Langen Budoyo']
  },
  {
    name: 'Sasono Utomo',
    region: 'Wilayah Barat',
    category: 'Gedung Serbaguna',
    description: 'Gedung pertemuan utama TMII dengan kapasitas ribuan pengunjung',
    latitude: -6.30190,
    longitude: 106.89320,
    aliases: ['Gedung Sasono Utomo', 'Sasono Utomo Grand Hall']
  },
  {
    name: 'Sasana Kriya',
    region: 'Wilayah Barat',
    category: 'Gedung Serbaguna',
    description: 'Gedung konvensi pameran dan resepsi terpadu Grand Sasana Kriya',
    latitude: -6.30120,
    longitude: 106.89380,
    aliases: ['Gedung Sasana Kriya', 'Grand Sasana Kriya']
  },
  {
    name: 'Teater Tanah Airku',
    region: 'Wilayah Barat',
    category: 'Area Makro TMII',
    description: 'Gedung pertunjukan teater berstandar internasional',
    latitude: -6.30080,
    longitude: 106.89250,
    aliases: ['Theater Tanah Airku', 'Gedung Pertunjukan Tanah Airku', 'Teater Tanah Air']
  },
  {
    name: 'Trem Station',
    region: 'Wilayah Barat',
    category: 'Area Makro TMII',
    description: 'Stasiun sentral kendaraan listrik & trem ramah lingkungan TMII',
    latitude: -6.30120,
    longitude: 106.89350,
    aliases: ['Stasiun Trem', 'Shelter Trem Stasiun Utama', 'Trem TMII', 'Stasiun EV']
  },
  {
    name: 'Tugu Api Pancasila',
    region: 'Wilayah Barat',
    category: 'Area Makro TMII',
    description: 'Monumen sentral lambang semangat falsafah Pancasila setinggi 45 meter',
    latitude: -6.30245,
    longitude: 106.89512,
    aliases: ['Tugu Api', 'Plaza Tugu Api', 'Monumen Tugu Api', 'Tugu Api Pancasila TMII']
  },
  {
    name: 'Plaza Gajah Mada',
    region: 'Wilayah Barat',
    category: 'Plaza',
    description: 'Plaza terbuka di dekat Tugu Api dan Tourist Information Center',
    latitude: -6.30195,
    longitude: 106.89480,
    aliases: ['Plaza Gajahmada']
  },
  {
    name: 'Plaza Kori',
    region: 'Wilayah Barat',
    category: 'Plaza',
    description: 'Plaza gerbang candi bentar menuju kompleks sentral',
    latitude: -6.30050,
    longitude: 106.89150,
    aliases: ['Plaza Kori Agung']
  },
  {
    name: 'Plaza Utara',
    region: 'Wilayah Barat',
    category: 'Plaza',
    description: 'Pelataran plaza koridor utara Tugu Api',
    latitude: -6.30080,
    longitude: 106.89490,
    aliases: ['Plaza Sisi Utara']
  },
  {
    name: 'Plaza Selatan',
    region: 'Wilayah Barat',
    category: 'Plaza',
    description: 'Pelataran plaza koridor selatan Tugu Api',
    latitude: -6.30400,
    longitude: 106.89500,
    aliases: ['Plaza Sisi Selatan']
  },
  {
    name: 'Prasasti APEC',
    region: 'Wilayah Barat',
    category: 'Plaza',
    description: 'Monumen prasasti peringatan Konferensi Tingkat Tinggi APEC 1994',
    latitude: -6.30210,
    longitude: 106.89550,
    aliases: ['Monumen APEC', 'Prasasti KTT APEC']
  },
  {
    name: 'Museum Indonesia',
    region: 'Wilayah Barat',
    category: 'Museum',
    description: 'Museum antropologi dan etnografi megah berbentuk bangunan Bali tiga lantai',
    latitude: -6.30130,
    longitude: 106.89430,
    aliases: ['Gedung Museum Indonesia', 'Balai Museum Indonesia']
  },
  {
    name: 'Kereta Gantung A',
    region: 'Wilayah Barat',
    category: 'Wahana Berbayar',
    description: 'Stasiun Kereta Gantung Stasiun A (Plaza Barat)',
    latitude: -6.30040,
    longitude: 106.89380,
    aliases: ['Stasiun Kereta Gantung A', 'Cable Car Station A', 'Stasiun A']
  },
  {
    name: 'Kereta Gantung C',
    region: 'Wilayah Barat',
    category: 'Wahana Berbayar',
    description: 'Stasiun Kereta Gantung Stasiun C (Dekat Keong Emas)',
    latitude: -6.30490,
    longitude: 106.89130,
    aliases: ['Stasiun Kereta Gantung C', 'Cable Car Station C', 'Stasiun C']
  },
  {
    name: 'Teater Keong Mas',
    region: 'Wilayah Barat',
    category: 'Wahana Berbayar',
    description: 'Teater IMAX berbentuk keong emas raksasa, ikon legendaris TMII sejak 1984',
    latitude: -6.30485,
    longitude: 106.89115,
    aliases: ['Teater IMAX Keong Emas', 'Theater Keong Mas', 'Keong Emas', 'Keong Mas', 'Teater Keong Emas', 'IMAX Keong Mas']
  },
  {
    name: 'Plaza Keong Mas',
    region: 'Wilayah Barat',
    category: 'Plaza',
    description: 'Plaza pelataran luas di depan Teater IMAX Keong Mas',
    latitude: -6.30460,
    longitude: 106.89140,
    aliases: ['Plaza Keong Emas']
  },
  {
    name: 'DKI Jakarta',
    region: 'Wilayah Barat',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi DKI Jakarta dengan arsitektur Rumah Kebaya Betawi',
    latitude: -6.30060,
    longitude: 106.89120,
    aliases: ['Anjungan DKI Jakarta', 'Anjungan Jakarta', 'DKI']
  },
  {
    name: 'Lampung',
    region: 'Wilayah Barat',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Lampung dengan rumah adat Nuwo Sesat',
    latitude: -6.30280,
    longitude: 106.89200,
    aliases: ['Anjungan Lampung']
  },
  {
    name: 'Banten',
    region: 'Wilayah Barat',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Banten dengan arsitektur Rumah Sulah Nyanda Suku Baduy',
    latitude: -6.30150,
    longitude: 106.89140,
    aliases: ['Anjungan Banten']
  },

  // ==========================================
  // WILAYAH PUSAT
  // ==========================================
  {
    name: 'Danau Archipelago',
    region: 'Wilayah Pusat',
    category: 'Area Makro TMII',
    description: 'Danau sentral miniatur kepulauan kepulauan Indonesia dari Sabang sampai Merauke',
    latitude: -6.30260,
    longitude: 106.89780,
    aliases: ['Danau Miniatur Indonesia', 'Danau Archipelago TMII', 'Danau TMII', 'Miniatur Kepulauan Indonesia']
  },
  {
    name: 'Dancing Fountain',
    region: 'Wilayah Pusat',
    category: 'Area Makro TMII',
    description: 'Pertunjukan atraksi air mancur menari Tirta Cerita di Danau Archipelago',
    latitude: -6.30250,
    longitude: 106.89850,
    aliases: ['Air Mancur Menari', 'Tirta Cerita', 'Dancing Fountain Danau']
  },
  {
    name: 'Ampiteater Jawadwipa',
    region: 'Wilayah Pusat',
    category: 'Area Makro TMII',
    description: 'Tribun penonton terbuka amfiteater tepi Danau Archipelago',
    latitude: -6.30230,
    longitude: 106.89850,
    aliases: ['Amphiteater Jawadwipa', 'Amphitheater Jawadwipa', 'Panggung Jawadwipa']
  },
  {
    name: 'Menara Saujana',
    region: 'Wilayah Pusat',
    category: 'Area Makro TMII',
    description: 'Menara observasi pandang panorama danau dan gugusan anjungan Nusantara',
    latitude: -6.30300,
    longitude: 106.89650,
    aliases: ['Viewing Tower', 'Menara Pandang Saujana', 'Menara Danau']
  },
  {
    name: 'Plaza Promenade',
    region: 'Wilayah Pusat',
    category: 'Plaza',
    description: 'Jalur pejalan kaki dan lintasan sepeda tepi Danau Archipelago',
    latitude: -6.30240,
    longitude: 106.89790,
    aliases: ['Promenade Danau', 'Promenade Archipelago']
  },
  {
    name: 'Plaza Malaka',
    region: 'Wilayah Pusat',
    category: 'Plaza',
    description: 'Plaza terbuka di sebelah barat miniatur pulau Sumatera',
    latitude: -6.30290,
    longitude: 106.89810,
    aliases: ['Plaza Selat Malaka']
  },
  {
    name: 'Community Center',
    region: 'Wilayah Pusat',
    category: 'Area Makro TMII',
    description: 'Gedung pusat aktivitas komunitas, lokakarya edukasi, dan pameran interaktif',
    latitude: -6.30350,
    longitude: 106.89720,
    aliases: ['Gedung Community Center', 'Balai Warga TMII']
  },
  {
    name: 'Panggung Budaya',
    region: 'Wilayah Pusat',
    category: 'Area Makro TMII',
    description: 'Panggung terapung pertunjukan seni tradisional di perairan danau',
    latitude: -6.30260,
    longitude: 106.89920,
    aliases: ['Panggung Apung', 'Panggung Terbuka Budaya']
  },
  {
    name: 'Caping Gunung',
    region: 'Wilayah Pusat',
    category: 'Gedung Serbaguna',
    description: 'Restoran dan gedung pertemuan beratap kerucut menyerupai caping petani',
    latitude: -6.30380,
    longitude: 106.89700,
    aliases: ['Gedung Caping Gunung', 'Resto Caping Gunung']
  },

  // ==========================================
  // WILAYAH SELATAN
  // ==========================================
  {
    name: 'Taman Legenda',
    region: 'Wilayah Selatan',
    category: 'Wahana Berbayar',
    description: 'Wahana rekreasi keluarga edukatif dinosaurus dan aneka wahana bermain',
    latitude: -6.30610,
    longitude: 106.89120,
    aliases: ['Taman Legenda Keong Emas', 'Wahana Taman Legenda']
  },
  {
    name: 'Masjid',
    region: 'Wilayah Selatan',
    category: 'Rumah Ibadah',
    description: 'Masjid Pangeran Diponegoro, tempat ibadah umat Islam kawasan TMII',
    latitude: -6.30580,
    longitude: 106.89510,
    aliases: ['Masjid Pangeran Diponegoro', 'Masjid TMII', 'Masjid Diponegoro']
  },
  {
    name: 'Gereja Katholik',
    region: 'Wilayah Selatan',
    category: 'Rumah Ibadah',
    description: 'Gereja Katolik Santa Catharina dengan arsitektur gereja klasik',
    latitude: -6.30620,
    longitude: 106.89550,
    aliases: ['Gereja Katolik Santa Catharina', 'Gereja Santa Catharina', 'Gereja Katolik']
  },
  {
    name: 'Gereja Protestan',
    region: 'Wilayah Selatan',
    category: 'Rumah Ibadah',
    description: 'Gereja Kristen Protestan Haleluya',
    latitude: -6.30640,
    longitude: 106.89580,
    aliases: ['Gereja Kristen Protestan Haleluya', 'Gereja Haleluya', 'Gereja Kristen']
  },
  {
    name: 'Pura',
    region: 'Wilayah Selatan',
    category: 'Rumah Ibadah',
    description: 'Pura Penataran Agung Kertabhumi tempat peribadatan umat Hindu',
    latitude: -6.30660,
    longitude: 106.89620,
    aliases: ['Pura Penataran Agung Kertabhumi', 'Pura Kertabhumi']
  },
  {
    name: 'Wihara',
    region: 'Wilayah Selatan',
    category: 'Rumah Ibadah',
    description: 'Wihara Arya Dwipa Arama tempat ibadah umat Buddha bergaya candi Borobudur',
    latitude: -6.30680,
    longitude: 106.89640,
    aliases: ['Wihara Arya Dwipa Arama', 'Vihara Arya Dwipa', 'Vihara']
  },
  {
    name: 'Klenteng Konghucu',
    region: 'Wilayah Selatan',
    category: 'Rumah Ibadah',
    description: 'Klenteng Kong Miao Da De Miao tempat ibadah penganut Konghucu',
    latitude: -6.30690,
    longitude: 106.89660,
    aliases: ['Klenteng Da De Miao', 'Klenteng Kong Miao', 'Klenteng']
  },
  {
    name: 'Sasana Adirasa',
    region: 'Wilayah Selatan',
    category: 'Rumah Ibadah',
    description: 'Sasana Adirasa Pangeran Sambernyawa balai penghayat kepercayaan',
    latitude: -6.30710,
    longitude: 106.89690,
    aliases: ['Sasana Adirasa Pangeran Sambernyawa', 'Balai Adirasa']
  },
  {
    name: 'Museum Pusaka',
    region: 'Wilayah Selatan',
    category: 'Museum',
    description: 'Museum koleksi ribuan bilah keris, rencong, mandau, dan senjata tradisional Nusantara',
    latitude: -6.30680,
    longitude: 106.90020,
    aliases: ['Museum Keris & Pusaka Nusantara', 'Museum Keris']
  },
  {
    name: 'Museum Keprajuritan',
    region: 'Wilayah Selatan',
    category: 'Museum',
    description: 'Museum berbentuk benteng segilima megah memamerkan diorama perjuangan pahlawan',
    latitude: -6.30745,
    longitude: 106.90150,
    aliases: ['Museum Keprajuritan Indonesia', 'Benteng Keprajuritan']
  },
  {
    name: 'Museum Transportasi',
    region: 'Wilayah Selatan',
    category: 'Museum',
    description: 'Museum transportasi darat, laut, dan udara koleksi lokomotif uap & pesawat kepresidenan',
    latitude: -6.30920,
    longitude: 106.90280,
    aliases: ['Museum Transportasi Darat Udara Laut']
  },
  {
    name: 'Plaza Lokomotif',
    region: 'Wilayah Selatan',
    category: 'Plaza',
    description: 'Plaza pelataran depan museum transportasi dengan pajangan lokomotif uap bersejarah',
    latitude: -6.30880,
    longitude: 106.90250,
    aliases: ['Plaza Lokomotif Uap', 'Stasiun Mini Transportasi']
  },
  {
    name: 'Dunia Air Tawar',
    region: 'Wilayah Selatan',
    category: 'Wahana Berbayar',
    description: 'Akuarium air tawar terbesar kedua di dunia dengan koleksi biota langka Nusantara',
    latitude: -6.30540,
    longitude: 106.90420,
    aliases: ['Dunia Air Tawar & Serangga', 'Museum Air Tawar', 'Akuarium Air Tawar']
  },
  {
    name: 'Museum Serangga',
    region: 'Wilayah Selatan',
    category: 'Museum',
    description: 'Taman Kupu-kupu dan museum ribuan spesies serangga endemik Indonesia',
    latitude: -6.30560,
    longitude: 106.90450,
    aliases: ['Taman Kupu-kupu & Serangga', 'Taman Kupu-kupu', 'Museum Serangga TMII']
  },
  {
    name: 'Museum Asmat',
    region: 'Wilayah Selatan',
    category: 'Wahana Berbayar',
    description: 'Museum seni ukir kayu magis dan rumah pohon tradisional suku Asmat Papua',
    latitude: -6.30760,
    longitude: 106.90410,
    aliases: ['Taman Budaya Asmat', 'Rumah Pohon Asmat']
  },
  {
    name: 'Jawa Barat',
    region: 'Wilayah Selatan',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Jawa Barat berarsitektur Keraton Kasepuhan dan Rumah Panggung',
    latitude: -6.30310,
    longitude: 106.89680,
    aliases: ['Anjungan Jawa Barat', 'Anjungan Jabar', 'Jabar']
  },
  {
    name: 'DI Yogyakarta',
    region: 'Wilayah Selatan',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Daerah Istimewa Yogyakarta replika Bangsal Kencono Keraton Ngayogyakarta',
    latitude: -6.30420,
    longitude: 106.89760,
    aliases: ['Anjungan DI Yogyakarta', 'Anjungan Yogyakarta', 'Anjungan DIY', 'Jogja', 'Yogyakarta']
  },
  {
    name: 'Jawa Tengah',
    region: 'Wilayah Selatan',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Jawa Tengah berarsitektur Pendopo Joglo Agung',
    latitude: -6.30510,
    longitude: 106.89840,
    aliases: ['Anjungan Jawa Tengah', 'Anjungan Jateng', 'Jateng']
  },
  {
    name: 'Jawa Timur',
    region: 'Wilayah Selatan',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Jawa Timur dengan replika Candi Penataran dan Rumah Situbondo',
    latitude: -6.30610,
    longitude: 106.89930,
    aliases: ['Anjungan Jawa Timur', 'Anjungan Jatim', 'Jatim']
  },
  {
    name: 'Bali',
    region: 'Wilayah Selatan',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Bali berarsitektur Puri Agung dengan Candi Bentar dan Bale Wantilan',
    latitude: -6.30670,
    longitude: 106.89720,
    aliases: ['Anjungan Bali']
  },
  {
    name: 'Nusa Tenggara Barat',
    region: 'Wilayah Selatan',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi NTB dengan arsitektur Rumah Adat Dalam Loka Samawa',
    latitude: -6.30720,
    longitude: 106.89850,
    aliases: ['Anjungan Nusa Tenggara Barat', 'Anjungan NTB', 'NTB']
  },
  {
    name: 'Nusa Tenggara Timur',
    region: 'Wilayah Selatan',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi NTT dengan arsitektur Rumah Adat Sao Ria Bekeka Suku Lio',
    latitude: -6.30750,
    longitude: 106.89900,
    aliases: ['Anjungan Nusa Tenggara Timur', 'Anjungan NTT', 'NTT']
  },

  // ==========================================
  // WILAYAH TIMUR
  // ==========================================
  {
    name: 'Istana Anak-Anak',
    region: 'Wilayah Timur',
    category: 'Museum',
    description: 'Istana megah bergaya dongeng khas Nusantara tempat aktivitas kreatif anak Indonesia',
    latitude: -6.30275,
    longitude: 106.90640,
    aliases: ['Istana Anak-Anak Indonesia', 'IAAI', 'Kastil Anak-Anak']
  },
  {
    name: 'Pintu 4',
    region: 'Wilayah Timur',
    category: 'Gate',
    description: 'Gerbang Pintu 4 TMII sisi timur dekat kawasan Hotel Desa Wisata',
    latitude: -6.30320,
    longitude: 106.90850,
    aliases: ['Gerbang Pintu 4', 'Pintu Masuk 4', 'Gate 4', 'Pintu Desa Wisata']
  },
  {
    name: 'Hotel Desa Wisata',
    region: 'Wilayah Timur',
    category: 'Area Makro TMII',
    description: 'Hotel dan penginapan bernuansa asri pedesaan kawasan timur TMII',
    latitude: -6.30820,
    longitude: 106.90880,
    aliases: ['Desa Wisata TMII', 'Penginapan Desa Wisata']
  },
  {
    name: 'Kayu Gedhe',
    region: 'Wilayah Timur',
    category: 'Area Makro TMII',
    description: 'Monumen fosil batang pohon purba raksasa berusia jutaan tahun',
    latitude: -6.30500,
    longitude: 106.90650,
    aliases: ['Fosil Kayu Gedhe', 'Monumen Kayu Gedhe']
  },
  {
    name: 'Museum Batik',
    region: 'Wilayah Timur',
    category: 'Museum',
    description: 'Museum koleksi mahakarya kain batik nusantara warisan budaya dunia UNESCO',
    latitude: -6.30420,
    longitude: 106.90550,
    aliases: ['Museum Batik Indonesia']
  },
  {
    name: 'Museum Perangko',
    region: 'Wilayah Timur',
    category: 'Museum',
    description: 'Museum filateli dan sejarah pos surat-menyurat Indonesia',
    latitude: -6.30320,
    longitude: 106.90580,
    aliases: ['Museum Prangko', 'Museum Filateli']
  },
  {
    name: 'Museum Listrik',
    region: 'Wilayah Timur',
    category: 'Museum',
    description: 'Museum Listrik dan Energi Baru dengan alat peraga interaktif kelistrikan',
    latitude: -6.30380,
    longitude: 106.90680,
    aliases: ['Museum Listrik & Energi Baru', 'Museum Listrik dan Energi Baru', 'MLEB']
  },
  {
    name: 'Museum Minyak & Gas Bumi',
    region: 'Wilayah Timur',
    category: 'Museum',
    description: 'Museum perminyakan berbentuk anjungan pengeboran minyak lepas pantai',
    latitude: -6.30480,
    longitude: 106.90750,
    aliases: ['Graha Rekayasa', 'Museum Migas', 'Museum Minyak dan Gas Bumi']
  },
  {
    name: 'Museum Hakka',
    region: 'Wilayah Timur',
    category: 'Museum',
    description: 'Museum Hakka Indonesia berbentuk bangunan bundar tradisional Tulou',
    latitude: -6.30620,
    longitude: 106.90920,
    aliases: ['Museum Hakka Indonesia', 'Museum Tionghoa']
  },
  {
    name: 'Taman Budaya Tionghoa',
    region: 'Wilayah Timur',
    category: 'Museum',
    description: 'Taman arsitektur Tionghoa Indonesia dengan jembatan batu dan danau teratai',
    latitude: -6.30600,
    longitude: 106.90900,
    aliases: ['Taman Tionghoa Indonesia', 'Pagoda Tionghoa']
  },
  {
    name: 'Monumen Persahabatan KTT',
    region: 'Wilayah Timur',
    category: 'Plaza',
    description: 'Monumen prasasti pohon persahabatan negara-negara Gerakan Non-Blok',
    latitude: -6.30300,
    longitude: 106.90500,
    aliases: ['Monumen KTT Non Blok']
  },
  {
    name: 'Taman Piknik',
    region: 'Wilayah Timur',
    category: 'Plaza',
    description: 'Ruang terbuka hijau asri untuk santai dan piknik keluarga',
    latitude: -6.30450,
    longitude: 106.90600,
    aliases: ['Taman Piknik TMII', 'Area Piknik Terbuka']
  },
  {
    name: 'Indonesia Science Center',
    region: 'Wilayah Timur',
    category: 'Wahana Berbayar',
    description: 'Pusat Peragaan Iptek (PP-IPTEK) dengan ratusan wahana sains interaktif',
    latitude: -6.30450,
    longitude: 106.90820,
    aliases: ['PP-IPTEK', 'Science Center', 'Pusat Peragaan Iptek']
  },
  {
    name: 'Kereta Gantung B',
    region: 'Wilayah Timur',
    category: 'Wahana Berbayar',
    description: 'Stasiun Kereta Gantung Stasiun B (Area Taman Burung / Science Center)',
    latitude: -6.30400,
    longitude: 106.90720,
    aliases: ['Stasiun Kereta Gantung B', 'Cable Car Station B', 'Stasiun B']
  },
  {
    name: 'Taman Burung',
    region: 'Wilayah Timur',
    category: 'Wahana Berbayar',
    description: 'Kubah aviari raksasa konservasi ratusan spesies burung langka Nusantara',
    latitude: -6.30650,
    longitude: 106.90780,
    aliases: ['Konservasi Burung', 'Kubah Burung', 'Taman Konservasi Burung']
  },
  {
    name: 'Konservasi Burung',
    region: 'Wilayah Timur',
    category: 'Wahana Berbayar',
    description: 'Kubah aviary sisi timur Taman Burung TMII',
    latitude: -6.30660,
    longitude: 106.90800,
    aliases: ['Taman Burung Kubah Timur']
  },
  {
    name: 'Museum Komodo & Reptil',
    region: 'Wilayah Timur',
    category: 'Wahana Berbayar',
    description: 'Museum berbentuk komodo raksasa dan taman konservasi reptil Nusantara',
    latitude: -6.30580,
    longitude: 106.90650,
    aliases: ['Museum Komodo', 'Taman Reptilia', 'Gedung Komodo']
  },
  {
    name: 'Sulawesi Selatan',
    region: 'Wilayah Timur',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Sulawesi Selatan Rumah Adat Tongkonan Toraja dan Bugis',
    latitude: -6.30550,
    longitude: 106.90480,
    aliases: ['Anjungan Sulawesi Selatan', 'Anjungan Sulsel', 'Sulsel']
  },
  {
    name: 'Sulawesi Tenggara',
    region: 'Wilayah Timur',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Sulawesi Tenggara arsitektur Istana Malige Buton',
    latitude: -6.30590,
    longitude: 106.90520,
    aliases: ['Anjungan Sulawesi Tenggara', 'Anjungan Sultra', 'Sultra']
  },
  {
    name: 'Sulawesi Tengah',
    region: 'Wilayah Timur',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Sulawesi Tengah arsitektur Rumah Adat Souraja Kaili',
    latitude: -6.30520,
    longitude: 106.90500,
    aliases: ['Anjungan Sulawesi Tengah', 'Anjungan Sulteng', 'Sulteng']
  },
  {
    name: 'Sulawesi Utara',
    region: 'Wilayah Timur',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Sulawesi Utara arsitektur Rumah Panggung Adat Minahasa',
    latitude: -6.30490,
    longitude: 106.90540,
    aliases: ['Anjungan Sulawesi Utara', 'Anjungan Sulut', 'Sulut']
  },
  {
    name: 'Gorontalo',
    region: 'Wilayah Timur',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Gorontalo arsitektur Rumah Adat Dulohupa',
    latitude: -6.30470,
    longitude: 106.90560,
    aliases: ['Anjungan Gorontalo']
  },
  {
    name: 'Maluku',
    region: 'Wilayah Timur',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Maluku arsitektur Rumah Adat Baileo',
    latitude: -6.30690,
    longitude: 106.90680,
    aliases: ['Anjungan Maluku']
  },
  {
    name: 'Maluku Utara',
    region: 'Wilayah Timur',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Maluku Utara arsitektur Kedaton Kesultanan Ternate',
    latitude: -6.30750,
    longitude: 106.90700,
    aliases: ['Anjungan Maluku Utara', 'Malut']
  },
  {
    name: 'Papua',
    region: 'Wilayah Timur',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Papua arsitektur Rumah Tradisional Honai dan Kariwari',
    latitude: -6.30710,
    longitude: 106.90580,
    aliases: ['Anjungan Papua', 'Papua Induk']
  },
  {
    name: 'Papua Barat',
    region: 'Wilayah Timur',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Papua Barat arsitektur Rumah Kaki Seribu suku Arfak',
    latitude: -6.30740,
    longitude: 106.90650,
    aliases: ['Anjungan Papua Barat']
  },
  {
    name: 'Timor Timur',
    region: 'Wilayah Timur',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Bersejarah arsitektur Uma Lulik khas Timor',
    latitude: -6.30680,
    longitude: 106.90600,
    aliases: ['Anjungan Timor Timur', 'Timor Leste']
  },

  // ==========================================
  // WILAYAH UTARA
  // ==========================================
  {
    name: 'Pintu 2',
    region: 'Wilayah Utara',
    category: 'Gate',
    description: 'Pintu gerbang TMII sisi utara (Gerbang Hankam / Ceger)',
    latitude: -6.29780,
    longitude: 106.89750,
    aliases: ['Gerbang Pintu 2', 'Pintu Hankam', 'Pintu Masuk 2', 'Gate 2']
  },
  {
    name: 'Sky World',
    region: 'Wilayah Utara',
    category: 'Wahana Berbayar',
    description: 'Wahana eduwisata antariksa, planetarium, dan teknologi ruang angkasa',
    latitude: -6.29850,
    longitude: 106.89950,
    aliases: ['Sky World TMII', 'Planetarium Sky World', 'Wahana Antariksa Sky World']
  },
  {
    name: 'Museum Pemadam Kebakaran',
    region: 'Wilayah Utara',
    category: 'Museum',
    description: 'Museum edukasi pencegahan kebakaran dan sejarah armada pemadam Indonesia',
    latitude: -6.29920,
    longitude: 106.90100,
    aliases: ['Museum Damkar', 'Museum Pemadam']
  },
  {
    name: 'Museum Monumen Penerangan',
    region: 'Wilayah Utara',
    category: 'Museum',
    description: 'Museum sejarah media komunikasi, radio, televisi, dan pers nasional',
    latitude: -6.29980,
    longitude: 106.90200,
    aliases: ['Monumen Penerangan', 'Museum Penerangan', 'Monpen']
  },
  {
    name: 'Food Court Pasar Nusantara',
    region: 'Wilayah Utara',
    category: 'Area Makro TMII',
    description: 'Pusat jajanan kuliner khas aneka provinsi di Indonesia',
    latitude: -6.29990,
    longitude: 106.89700,
    aliases: ['Pasar Nusantara', 'Food Court TMII', 'Kuliner Nusantara']
  },
  {
    name: 'Ganara Art',
    region: 'Wilayah Utara',
    category: 'Area Makro TMII',
    description: 'Ruang berkarya seni kreatif, pottery, melukis, dan galeri interaktif',
    latitude: -6.29970,
    longitude: 106.89650,
    aliases: ['Ganara Art Space', 'Studio Ganara Art']
  },
  {
    name: 'Gedung Teknik',
    region: 'Wilayah Utara',
    category: 'Area Makro TMII',
    description: 'Kantor dan workshop tim teknis pemeliharaan MEP & infrastruktur TMII',
    latitude: -6.29890,
    longitude: 106.89800,
    aliases: ['Workshop Teknik', 'Kantor Divisi Teknik TMII']
  },
  {
    name: 'Taman Melati',
    region: 'Wilayah Utara',
    category: 'Area Makro TMII',
    description: 'Taman asri bunga melati puspa bangsa di koridor utara',
    latitude: -6.29940,
    longitude: 106.89850,
    aliases: ['Plaza Melati', 'Taman Bunga Melati']
  },
  {
    name: 'Aceh',
    region: 'Wilayah Utara',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Aceh dengan arsitektur Rumoh Aceh dan Lonceng Cakra Donya',
    latitude: -6.30050,
    longitude: 106.89550,
    aliases: ['Anjungan Aceh', 'Anjungan NAD']
  },
  {
    name: 'Sumatera Utara',
    region: 'Wilayah Utara',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Sumatera Utara arsitektur Rumah Bolon Batak dan Nias',
    latitude: -6.30100,
    longitude: 106.89600,
    aliases: ['Anjungan Sumatera Utara', 'Anjungan Sumut', 'Sumut']
  },
  {
    name: 'Sumatera Barat',
    region: 'Wilayah Utara',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Sumatera Barat arsitektur Rumah Gadang Minangkabau bergonjong',
    latitude: -6.30150,
    longitude: 106.89650,
    aliases: ['Anjungan Sumatera Barat', 'Anjungan Sumbar', 'Sumbar']
  },
  {
    name: 'Riau',
    region: 'Wilayah Utara',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Riau arsitektur Selaso Jatuh Kembar Melayu',
    latitude: -6.30100,
    longitude: 106.89570,
    aliases: ['Anjungan Riau']
  },
  {
    name: 'Kep. Riau',
    region: 'Wilayah Utara',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Kepulauan Riau arsitektur Rumah Adat Belah Bubung',
    latitude: -6.30090,
    longitude: 106.89580,
    aliases: ['Anjungan Kepulauan Riau', 'Anjungan Kep. Riau', 'Kepri', 'Kepulauan Riau']
  },
  {
    name: 'Jambi',
    region: 'Wilayah Utara',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Jambi arsitektur Rumah Adat Kajang Lako',
    latitude: -6.30120,
    longitude: 106.89600,
    aliases: ['Anjungan Jambi']
  },
  {
    name: 'Sumatra Selatan',
    region: 'Wilayah Utara',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Sumatera Selatan arsitektur Rumah Limas Palembang',
    latitude: -6.30160,
    longitude: 106.89630,
    aliases: ['Anjungan Sumatera Selatan', 'Anjungan Sumsel', 'Sumsel', 'Sumatera Selatan']
  },
  {
    name: 'Bengkulu',
    region: 'Wilayah Utara',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Bengkulu arsitektur Rumah Bubungan Lima',
    latitude: -6.30180,
    longitude: 106.89620,
    aliases: ['Anjungan Bengkulu']
  },
  {
    name: 'Bangka Belitung',
    region: 'Wilayah Utara',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Bangka Belitung arsitektur Rumah Panggung Rakit Melayu',
    latitude: -6.30140,
    longitude: 106.89660,
    aliases: ['Anjungan Bangka Belitung', 'Anjungan Babel', 'Babel']
  },
  {
    name: 'Kalimantan Barat',
    region: 'Wilayah Utara',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Kalimantan Barat arsitektur Rumah Radakng Dayak',
    latitude: -6.30020,
    longitude: 106.89900,
    aliases: ['Anjungan Kalimantan Barat', 'Anjungan Kalbar', 'Kalbar']
  },
  {
    name: 'Kalimantan Tengah',
    region: 'Wilayah Utara',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Kalimantan Tengah arsitektur Rumah Betang Dayak Ngaju',
    latitude: -6.30050,
    longitude: 106.89920,
    aliases: ['Anjungan Kalimantan Tengah', 'Anjungan Kalteng', 'Kalteng']
  },
  {
    name: 'Kalimantan Selatan',
    region: 'Wilayah Utara',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Kalimantan Selatan arsitektur Rumah Bubungan Tinggi Banjar',
    latitude: -6.30080,
    longitude: 106.89950,
    aliases: ['Anjungan Kalimantan Selatan', 'Anjungan Kalsel', 'Kalsel']
  },
  {
    name: 'Kalimantan Timur',
    region: 'Wilayah Utara',
    category: 'Wilayah Anjungan',
    description: 'Anjungan Provinsi Kalimantan Timur arsitektur Rumah Lamin Dayak Kenyah',
    latitude: -6.30110,
    longitude: 106.89980,
    aliases: ['Anjungan Kalimantan Timur', 'Anjungan Kaltim', 'Kaltim']
  }
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



