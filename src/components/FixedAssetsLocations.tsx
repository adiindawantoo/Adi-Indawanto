import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Search, 
  Filter, 
  Layers, 
  Eye, 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Maximize2, 
  X, 
  Compass, 
  ChevronRight, 
  Coins, 
  Calendar, 
  Tag, 
  Building, 
  FileText, 
  ExternalLink,
  ShieldAlert,
  Info,
  Map as MapIcon,
  Grid,
  List,
  Navigation,
  FileSpreadsheet
} from 'lucide-react';
import { FixedAsset, AppTheme, ConfiguredLocation, DEFAULT_ASSET_LOCATIONS } from '../types';
import { 
  getGoogleMapsUrl, 
  getGoogleDirectionsUrl, 
  isValidLatLng, 
  formatCoordinates 
} from '../lib/geoUtils';
import { exportConfiguredLocations } from '../lib/locationExporter';

interface FixedAssetsLocationsProps {
  assets: FixedAsset[];
  configuredLocations?: ConfiguredLocation[];
  onUpdateAsset?: (id: string, asset: Partial<FixedAsset>) => Promise<void>;
  theme: AppTheme;
  isAdmin?: boolean;
}

export type RegionId = 'semua' | 'utara' | 'selatan' | 'barat' | 'timur' | 'pusat';

export interface RegionInfo {
  id: RegionId;
  name: string;
  shortName: string;
  colorClass: string;
  bgLightClass: string;
  badgeClass: string;
  borderClass: string;
  accentHex: string;
  description: string;
  keyLocations: string[];
}

export const TMII_REGIONS: RegionInfo[] = [
  {
    id: 'utara',
    name: 'Wilayah Utara (North Zone)',
    shortName: 'Utara',
    colorClass: 'text-emerald-700',
    bgLightClass: 'bg-emerald-50 text-emerald-800',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderClass: 'border-emerald-500',
    accentHex: '#059669',
    description: 'Anjungan Sumatera & Kalimantan, Sky World, Museum Pemadam Kebakaran, Ganara Art, Food Court, Gedung Parkir, Pintu 2.',
    keyLocations: [
      'Anjungan Sumatera (Aceh, Sumut, Sumbar, Riau, Jambi, Sumsel, Bengkulu, Lampung, Babel)',
      'Anjungan Kalimantan (Kalbar, Kalteng, Kaltim, Kaltara, Kalsel)',
      'Sky World TMII',
      'Museum Pemadam Kebakaran',
      'Ganara Art & Community Center',
      'Food Court Utara & Gedung Parkir',
      'Area Pintu Masuk 2'
    ]
  },
  {
    id: 'selatan',
    name: 'Wilayah Selatan (South Zone)',
    shortName: 'Selatan',
    colorClass: 'text-amber-700',
    bgLightClass: 'bg-amber-50 text-amber-800',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    borderClass: 'border-amber-500',
    accentHex: '#D97706',
    description: 'Anjungan Jawa & Bali & Nusa Tenggara, Museum Pusaka, Museum Transportasi, Museum Serangga, Museum Batik, Dunia Air Tawar.',
    keyLocations: [
      'Anjungan Jawa (DKI, Jabar, Jateng, DIY, Jatim)',
      'Anjungan Bali, NTB & NTT',
      'Museum Pusaka & Museum Keprajuritan',
      'Museum Transportasi',
      'Museum Serangga & Taman Kupu-kupu',
      'Museum Batik & Museum Komodo',
      'Dunia Air Tawar & Taman Kebun'
    ]
  },
  {
    id: 'barat',
    name: 'Wilayah Barat (West Zone)',
    shortName: 'Barat',
    colorClass: 'text-indigo-700',
    bgLightClass: 'bg-indigo-50 text-indigo-800',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    borderClass: 'border-indigo-500',
    accentHex: '#4F46E5',
    description: 'Pintu 1 & 3, Tugu Api Pancasila, Sasono Utomo, Sasono Langen Budoyo, Teater IMAX Keong Emas, Taman Legenda, Museum Asmat, Klenteng, Bayt Al-Quran.',
    keyLocations: [
      'Tugu Api Pancasila & Plaza Utomo',
      'Sasono Utomo & Sasono Langen Budoyo',
      'Sasono Adiguna & Contemporary Art Gallery',
      'Teater IMAX Keong Emas',
      'Taman Legenda Keong Emas & Museum Asmat',
      'Bayt Al-Quran & Museum Istiqlal',
      'Kompleks Rumah Ibadah (Masjid, Gereja, Pura, Vihara, Klenteng)',
      'Area Pintu Utama 1 & Pintu 3'
    ]
  },
  {
    id: 'timur',
    name: 'Wilayah Timur (East Zone)',
    shortName: 'Timur',
    colorClass: 'text-purple-700',
    bgLightClass: 'bg-purple-50 text-purple-800',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    borderClass: 'border-purple-500',
    accentHex: '#7C3AED',
    description: 'Anjungan Sulawesi, Maluku & Papua, Taman Burung, Museum Timor Timur, Museum Listrik, Istana Anak-Anak, Science Center, Museum Hakka, Pintu 4.',
    keyLocations: [
      'Anjungan Sulawesi (Sulut, Sulteng, Sulsel, Sultra, Sulbar, Gorontalo)',
      'Anjungan Maluku & Maluku Utara',
      'Anjungan Papua & Papua Barat',
      'Taman Burung & Konservasi Avifauna',
      'Museum Timor Timur & Museum Listrik',
      'Istana Anak-Anak Indonesia',
      'Science Center (PP-IPTEK) & Museum Hakka',
      'Area Pintu Masuk 4'
    ]
  },
  {
    id: 'pusat',
    name: 'Wilayah Pusat (Central / Archipelago)',
    shortName: 'Pusat',
    colorClass: 'text-sky-700',
    bgLightClass: 'bg-sky-50 text-sky-800',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    borderClass: 'border-sky-500',
    accentHex: '#0284C7',
    description: 'Danau Archipelago (Miniatur Kepulauan Indonesia), Plaza Promenade, Amphiteater Jawadwipa, Air Mancur Menari, Menara Saujana, Stasiun Trem.',
    keyLocations: [
      'Danau Archipelago (Miniatur Kepulauan Indonesia)',
      'Plaza Promenade & Plaza Arsitektur',
      'Amphiteater Jawadwipa & Dancing Fountain',
      'Menara Saujana & Trem Station',
      'Stasiun Kereta Gantung / Skyride H1-H15',
      'Community Center & Central Plaza'
    ]
  }
];

export interface HotspotPoint {
  id: string;
  name: string;
  region: 'utara' | 'selatan' | 'barat' | 'timur' | 'pusat';
  x: number; // percentage position 0 - 100
  y: number; // percentage position 0 - 100
  category: string;
  iconType: string;
  subLocations: string[];
}

export const TMII_HOTSPOTS: HotspotPoint[] = [
  // UTARA
  {
    id: 'anjungan-sumatera',
    name: 'Kompleks Anjungan Sumatera',
    region: 'utara',
    x: 35,
    y: 22,
    category: 'Anjungan Kebudayaan',
    iconType: 'building',
    subLocations: ['Aceh', 'Sumut', 'Sumbar', 'Riau', 'Jambi', 'Sumsel', 'Bengkulu', 'Babel', 'Banten']
  },
  {
    id: 'anjungan-kalimantan',
    name: 'Kompleks Anjungan Kalimantan',
    region: 'utara',
    x: 58,
    y: 20,
    category: 'Anjungan Kebudayaan',
    iconType: 'building',
    subLocations: ['Kalbar', 'Kalteng', 'Kaltim', 'Kaltara', 'Kalsel']
  },
  {
    id: 'sky-world',
    name: 'Sky World & Museum Pemadam',
    region: 'utara',
    x: 42,
    y: 12,
    category: 'Wahana / Museum',
    iconType: 'sparkles',
    subLocations: ['Sky World', 'Museum Pemadam Kebakaran', 'Ganara Art', 'Food Court Utara']
  },
  {
    id: 'pintu-2',
    name: 'Gedung Parkir & Pintu 2',
    region: 'utara',
    x: 22,
    y: 12,
    category: 'Fasilitas & Infras',
    iconType: 'pin',
    subLocations: ['Gedung Parkir Utara', 'Pintu Masuk 2', 'Monumen Penerangan']
  },

  // BARAT
  {
    id: 'pintu-1-tugu-api',
    name: 'Pintu 1 & Tugu Api Pancasila',
    region: 'barat',
    x: 12,
    y: 48,
    category: 'Ikon & Gerbang Utama',
    iconType: 'pin',
    subLocations: ['Tugu Api Pancasila', 'Pintu 1', 'Plaza Gajah Mada', 'Sasana Kriya']
  },
  {
    id: 'sasono-utomo',
    name: 'Sasono Utomo & Langen Budoyo',
    region: 'barat',
    x: 20,
    y: 42,
    category: 'Gedung / Balai',
    iconType: 'building',
    subLocations: ['Sasono Utomo', 'Sasono Langen Budoyo', 'Sasono Adiguna', 'Museum Indonesia']
  },
  {
    id: 'keong-emas',
    name: 'Teater Keong Emas & Taman Legenda',
    region: 'barat',
    x: 18,
    y: 75,
    category: 'Wahana Rekreasi',
    iconType: 'sparkles',
    subLocations: ['Teater IMAX Keong Emas', 'Taman Legenda Keong Emas', 'Museum Asmat']
  },
  {
    id: 'bayt-alquran',
    name: 'Bayt Al-Quran & Rumah Ibadah',
    region: 'barat',
    x: 8,
    y: 65,
    category: 'Cagar / Museum',
    iconType: 'building',
    subLocations: ['Bayt Al-Quran & Museum Istiqlal', 'Masjid', 'Gereja Katolik', 'Gereja Protestan', 'Pura', 'Vihara', 'Klenteng']
  },

  // PUSAT
  {
    id: 'danau-archipelago',
    name: 'Danau Archipelago (Miniatur Indonesia)',
    region: 'pusat',
    x: 48,
    y: 45,
    category: 'Lansekap Danau',
    iconType: 'compass',
    subLocations: ['Pulau Sumatera', 'Pulau Jawa', 'Pulau Kalimantan', 'Pulau Sulawesi', 'Pulau Papua', 'Pulau Maluku & Nusa Tenggara']
  },
  {
    id: 'plaza-promenade',
    name: 'Plaza Promenade & Menara Saujana',
    region: 'pusat',
    x: 38,
    y: 46,
    category: 'Plaza & Stasiun',
    iconType: 'sparkles',
    subLocations: ['Plaza Promenade', 'Menara Saujana', 'Stasiun Trem', 'Amphiteater Jawadwipa', 'Air Mancur Menari']
  },

  // SELATAN
  {
    id: 'anjungan-jawa',
    name: 'Kompleks Anjungan Jawa & Bali',
    region: 'selatan',
    x: 42,
    y: 58,
    category: 'Anjungan Kebudayaan',
    iconType: 'building',
    subLocations: ['DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Bali', 'NTB', 'NTT']
  },
  {
    id: 'museum-transportasi',
    name: 'Kompleks Museum Selatan',
    region: 'selatan',
    x: 55,
    y: 78,
    category: 'Museum & Cagar',
    iconType: 'building',
    subLocations: ['Museum Transportasi', 'Museum Pusaka', 'Museum Keprajuritan', 'Museum Serangga', 'Museum Batik', 'Dunia Air Tawar']
  },

  // TIMUR
  {
    id: 'anjungan-sulawesi-papua',
    name: 'Anjungan Sulawesi, Maluku & Papua',
    region: 'timur',
    x: 72,
    y: 25,
    category: 'Anjungan Kebudayaan',
    iconType: 'building',
    subLocations: ['Sulawesi Utara', 'Sulawesi Selatan', 'Sulawesi Tengah', 'Gorontalo', 'Maluku', 'Papua', 'Papua Barat']
  },
  {
    id: 'taman-burung',
    name: 'Taman Burung & Istana Anak',
    region: 'timur',
    x: 75,
    y: 42,
    category: 'Konservasi & Wahana',
    iconType: 'sparkles',
    subLocations: ['Taman Burung', 'Konservasi Avifauna', 'Istana Anak-Anak Indonesia', 'Museum Timor Timur']
  },
  {
    id: 'science-center',
    name: 'Science Center & Museum Hakka',
    region: 'timur',
    x: 85,
    y: 55,
    category: 'Edukasi / Museum',
    iconType: 'building',
    subLocations: ['Science Center (PP-IPTEK)', 'Museum Hakka', 'Museum Minyak & Gas', 'Pintu Masuk 4', 'Museum Listrik']
  }
];

// Fallback sample assets if database assets are empty or small
const SAMPLE_LOCATION_ASSETS: FixedAsset[] = [
  {
    id: 'loc-fa-001',
    code: 'TMII-FA-UT-001',
    name: 'Gamelan Pelog Anjungan Sumatera Barat',
    brand: 'Pengrajin Kuno Solo',
    area: 'Wilayah Utara',
    location: 'Anjungan Sumatera Barat',
    category: 'Peralatan Seni & Budaya',
    type: 'Alat Musik Tradisional',
    classification: 'Aset',
    acquisitionDate: '2021-03-15',
    acquisitionCost: 185000000,
    usefulLife: '15 Tahun',
    condition: 'Baik',
    status: 'Aktif',
    photoUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    notes: 'Dipelihara secara rutin oleh pengelola Anjungan Sumbar.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'loc-fa-002',
    code: 'TMII-FA-UT-002',
    name: 'Teleskop Observatorium Planetarium Sky World',
    brand: 'Celestron CPC 1100 GPS',
    area: 'Wilayah Utara',
    location: 'Sky World TMII',
    category: 'Peralatan Edukasi & Wahana',
    type: 'Optik & Astronomi',
    classification: 'Aset',
    acquisitionDate: '2022-08-10',
    acquisitionCost: 320000000,
    usefulLife: '10 Tahun',
    condition: 'Baik',
    status: 'Aktif',
    notes: 'Terintegrasi dengan komputer pelacak bintang.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'loc-fa-003',
    code: 'TMII-FA-SL-001',
    name: 'Replika Pendopo Ageng Rumah Adat Jawa Tengah',
    brand: 'Kayu Jati Ukir Jepara Klasik',
    area: 'Wilayah Selatan',
    location: 'Anjungan Jawa Tengah',
    category: 'Bangunan Adat',
    type: 'Infrastruktur Budaya',
    classification: 'Aset',
    acquisitionDate: '2019-01-20',
    acquisitionCost: 1450000000,
    usefulLife: '30 Tahun',
    condition: 'Baik',
    status: 'Aktif',
    notes: 'Pemeliharaan cat plitur setiap 2 tahun.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'loc-fa-004',
    code: 'TMII-FA-SL-002',
    name: 'Lokomotif Uap Kuno B2504 Museum Transportasi',
    brand: 'Maschinenfabrik Esslingen (1902)',
    area: 'Wilayah Selatan',
    location: 'Museum Transportasi',
    category: 'Koleksi Transportasi Historic',
    type: 'Kereta Api Sejarah',
    classification: 'Aset',
    acquisitionDate: '2018-05-12',
    acquisitionCost: 890000000,
    usefulLife: '50 Tahun',
    condition: 'Baik',
    status: 'Aktif',
    notes: 'Koleksi bernilai sejarah tinggi milik Kereta Api Indonesia.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'loc-fa-005',
    code: 'TMII-FA-BR-001',
    name: 'Sistem Proyektor IMAX Dome Keong Emas 70mm',
    brand: 'IMAX Corporation Canada',
    area: 'Wilayah Barat',
    location: 'Teater IMAX Keong Emas',
    category: 'Peralatan Multimedia Teater',
    type: 'Proyektor Bioskop',
    classification: 'Aset',
    acquisitionDate: '2020-11-04',
    acquisitionCost: 2400000000,
    usefulLife: '12 Tahun',
    condition: 'Rusak Ringan',
    status: 'Diperbaiki',
    notes: 'Sedang penjadwalan penggantian lensa dan kalibrasi sistem optik.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'loc-fa-006',
    code: 'TMII-FA-BR-002',
    name: 'Lampu Sorot LED Tugu Api Pancasila 2000W',
    brand: 'Philips ArenaVision LED',
    area: 'Wilayah Barat',
    location: 'Tugu Api Pancasila',
    category: 'Peralatan Penerangan',
    type: 'Penerangan Luar',
    classification: 'Aset',
    acquisitionDate: '2023-02-18',
    acquisitionCost: 175000000,
    usefulLife: '8 Tahun',
    condition: 'Baik',
    status: 'Aktif',
    createdAt: new Date().toISOString()
  },
  {
    id: 'loc-fa-007',
    code: 'TMII-FA-TM-001',
    name: 'Kubah Avia Kompleks Kubah Taman Burung',
    brand: 'Struktur Baja Galvanis & Jaring Khusus',
    area: 'Wilayah Timur',
    location: 'Taman Burung',
    category: 'Bangunan Wahana',
    type: 'Kubah Konservasi',
    classification: 'Aset',
    acquisitionDate: '2021-06-25',
    acquisitionCost: 1950000000,
    usefulLife: '20 Tahun',
    condition: 'Baik',
    status: 'Aktif',
    notes: 'Kubah terbesar penangkaran burung spesies endemik Indonesia.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'loc-fa-008',
    code: 'TMII-FA-TM-002',
    name: 'Pembangkit Listrik Surya Demo PP-IPTEK',
    brand: 'Solar World 50kWp',
    area: 'Wilayah Timur',
    location: 'Science Center (PP-IPTEK)',
    category: 'Peralatan MEP & Edukasi',
    type: 'Panel Surya',
    classification: 'Aset',
    acquisitionDate: '2022-04-14',
    acquisitionCost: 550000000,
    usefulLife: '15 Tahun',
    condition: 'Baik',
    status: 'Aktif',
    createdAt: new Date().toISOString()
  },
  {
    id: 'loc-fa-009',
    code: 'TMII-FA-PS-001',
    name: 'Sistem Pompa & Nozzle Air Mancur Menari Jawadwipa',
    brand: 'Oase Living Water Germany',
    area: 'Wilayah Pusat',
    location: 'Dancing Fountain Danau Archipelago',
    category: 'Peralatan Air Mancur',
    type: 'Sistem Pertunjukan Air',
    classification: 'Aset',
    acquisitionDate: '2022-12-01',
    acquisitionCost: 1650000000,
    usefulLife: '10 Tahun',
    condition: 'Baik',
    status: 'Aktif',
    notes: 'Menyajikan pertunjukan lampu dan sinergi musik laser setiap akhir pekan.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'loc-fa-010',
    code: 'TMII-FA-PS-002',
    name: 'Armada Tram Listrik Pengangkut Pengunjung',
    brand: 'EV Tram Shuttle Indonesia 30-Seater',
    area: 'Wilayah Pusat',
    location: 'Stasiun Trem Pusat',
    category: 'Kendaraan Operasional',
    type: 'EV Shuttle Bus',
    classification: 'Aset',
    acquisitionDate: '2023-05-10',
    acquisitionCost: 780000000,
    usefulLife: '8 Tahun',
    condition: 'Baik',
    status: 'Aktif',
    createdAt: new Date().toISOString()
  }
];

export default function FixedAssetsLocations({
  assets = [],
  configuredLocations = [],
  onUpdateAsset,
  theme,
  isAdmin = true
}: FixedAssetsLocationsProps) {
  // Region selection
  const [selectedRegion, setSelectedRegion] = useState<RegionId>('semua');
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotPoint | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [conditionFilter, setConditionFilter] = useState<string>('Semua');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [activeViewMode, setActiveViewMode] = useState<'map' | 'grid' | 'table'>('map');

  // Interactive Map controls
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapMode, setMapMode] = useState<'detailed' | 'dark' | 'hybrid'>('detailed');

  // Master Map Lightbox Modal
  const [isMasterMapOpen, setIsMasterMapOpen] = useState(false);

  // Combine props assets with fallback if database is light
  const allAssets = useMemo(() => {
    if (assets && assets.length > 0) {
      return assets;
    }
    return SAMPLE_LOCATION_ASSETS;
  }, [assets]);

  // Helper to find location coordinates from location name
  const getLocationCoordinates = (locName: string): { latitude: number; longitude: number } | null => {
    if (!locName) return null;
    const clean = locName.trim().toLowerCase();
    
    // 1. Check in configuredLocations (exact)
    if (configuredLocations && configuredLocations.length > 0) {
      const matched = configuredLocations.find(l => l.name.trim().toLowerCase() === clean);
      if (matched && typeof matched.latitude === 'number' && typeof matched.longitude === 'number') {
        return { latitude: matched.latitude, longitude: matched.longitude };
      }
      // Partial in configuredLocations
      const partialConfigured = configuredLocations.find(l => clean.includes(l.name.toLowerCase()) || l.name.toLowerCase().includes(clean));
      if (partialConfigured && typeof partialConfigured.latitude === 'number' && typeof partialConfigured.longitude === 'number') {
        return { latitude: partialConfigured.latitude, longitude: partialConfigured.longitude };
      }
    }
    
    // 2. Check in DEFAULT_ASSET_LOCATIONS exact match
    const defaultMatched = DEFAULT_ASSET_LOCATIONS.find(l => l.name.trim().toLowerCase() === clean);
    if (defaultMatched && typeof defaultMatched.latitude === 'number' && typeof defaultMatched.longitude === 'number') {
      return { latitude: defaultMatched.latitude, longitude: defaultMatched.longitude };
    }

    // 3. Check aliases in DEFAULT_ASSET_LOCATIONS
    const aliasMatched = DEFAULT_ASSET_LOCATIONS.find(l => 
      l.aliases?.some(alias => alias.toLowerCase() === clean || clean.includes(alias.toLowerCase()) || alias.toLowerCase().includes(clean))
    );
    if (aliasMatched && typeof aliasMatched.latitude === 'number' && typeof aliasMatched.longitude === 'number') {
      return { latitude: aliasMatched.latitude, longitude: aliasMatched.longitude };
    }

    // 4. Partial check in DEFAULT_ASSET_LOCATIONS
    const partialMatch = DEFAULT_ASSET_LOCATIONS.find(l => clean.includes(l.name.toLowerCase()) || l.name.toLowerCase().includes(clean));
    if (partialMatch && typeof partialMatch.latitude === 'number' && typeof partialMatch.longitude === 'number') {
      return { latitude: partialMatch.latitude, longitude: partialMatch.longitude };
    }
    
    return null;
  };

  // Helper to determine asset region from area or location
  const getAssetRegionKey = (asset: FixedAsset): 'utara' | 'selatan' | 'barat' | 'timur' | 'pusat' => {
    const areaLower = (asset.area || '').toLowerCase();
    const locLower = (asset.location || '').toLowerCase();
    const nameLower = (asset.name || '').toLowerCase();
    const fullText = `${areaLower} ${locLower} ${nameLower}`;

    if (fullText.includes('utara') || fullText.includes('sumatera') || fullText.includes('kalimantan') || fullText.includes('sky world') || fullText.includes('pemadam') || fullText.includes('pintu 2')) {
      return 'utara';
    }
    if (fullText.includes('selatan') || fullText.includes('jawa') || fullText.includes('bali') || fullText.includes('pusaka') || fullText.includes('transportasi') || fullText.includes('serangga') || fullText.includes('batik') || fullText.includes('air tawar')) {
      return 'selatan';
    }
    if (fullText.includes('barat') || fullText.includes('pintu 1') || fullText.includes('pintu 3') || fullText.includes('tugu api') || fullText.includes('sasono') || fullText.includes('keong emas') || fullText.includes('asmat') || fullText.includes('bayt') || fullText.includes('istiqlal')) {
      return 'barat';
    }
    if (fullText.includes('timur') || fullText.includes('sulawesi') || fullText.includes('maluku') || fullText.includes('papua') || fullText.includes('burung') || fullText.includes('timor') || fullText.includes('listrik') || fullText.includes('istana anak') || fullText.includes('science') || fullText.includes('pp-iptek') || fullText.includes('hakka') || fullText.includes('pintu 4')) {
      return 'timur';
    }
    if (fullText.includes('pusat') || fullText.includes('archipelago') || fullText.includes('danau') || fullText.includes('promenade') || fullText.includes('jawadwipa') || fullText.includes('fountain') || fullText.includes('saujana') || fullText.includes('trem') || fullText.includes('skyride')) {
      return 'pusat';
    }

    return 'pusat';
  };

  // Grouped stats per region
  const regionStats = useMemo(() => {
    const stats: Record<RegionId, { count: number; totalCost: number; goodCount: number; damageCount: number }> = {
      semua: { count: 0, totalCost: 0, goodCount: 0, damageCount: 0 },
      utara: { count: 0, totalCost: 0, goodCount: 0, damageCount: 0 },
      selatan: { count: 0, totalCost: 0, goodCount: 0, damageCount: 0 },
      barat: { count: 0, totalCost: 0, goodCount: 0, damageCount: 0 },
      timur: { count: 0, totalCost: 0, goodCount: 0, damageCount: 0 },
      pusat: { count: 0, totalCost: 0, goodCount: 0, damageCount: 0 }
    };

    allAssets.forEach(ast => {
      const reg = getAssetRegionKey(ast);
      const cost = Number(ast.acquisitionCost) || 0;
      const isGood = ast.condition === 'Baik';

      // Increment total
      stats.semua.count += 1;
      stats.semua.totalCost += cost;
      if (isGood) stats.semua.goodCount += 1; else stats.semua.damageCount += 1;

      // Increment region
      stats[reg].count += 1;
      stats[reg].totalCost += cost;
      if (isGood) stats[reg].goodCount += 1; else stats[reg].damageCount += 1;
    });

    return stats;
  }, [allAssets]);

  // Filtered Assets list
  const filteredAssets = useMemo(() => {
    return allAssets.filter(ast => {
      // Region filter
      if (selectedRegion !== 'semua') {
        const reg = getAssetRegionKey(ast);
        if (reg !== selectedRegion) return false;
      }

      // Hotspot filter if active
      if (selectedHotspot) {
        const locText = `${ast.location} ${ast.name} ${ast.area}`.toLowerCase();
        const matchesHotspot = selectedHotspot.subLocations.some(sub => 
          locText.includes(sub.toLowerCase())
        ) || locText.includes(selectedHotspot.name.toLowerCase());
        if (!matchesHotspot) return false;
      }

      // Condition filter
      if (conditionFilter !== 'Semua' && ast.condition !== conditionFilter) return false;

      // Status filter
      if (statusFilter !== 'Semua' && ast.status !== statusFilter) return false;

      // Search term filter
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const code = (ast.code || '').toLowerCase();
        const name = (ast.name || '').toLowerCase();
        const loc = (ast.location || '').toLowerCase();
        const area = (ast.area || '').toLowerCase();
        const brand = (ast.brand || '').toLowerCase();
        return code.includes(term) || name.includes(term) || loc.includes(term) || area.includes(term) || brand.includes(term);
      }

      return true;
    });
  }, [allAssets, selectedRegion, selectedHotspot, conditionFilter, statusFilter, searchTerm]);

  // Helper formatting currency IDR
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Download configured locations in complete format
  const [downloadingLocs, setDownloadingLocs] = useState(false);
  const handleDownloadLocations = () => {
    try {
      setDownloadingLocs(true);
      const locsToExport: ConfiguredLocation[] = (configuredLocations && configuredLocations.length > 0)
        ? configuredLocations
        : DEFAULT_ASSET_LOCATIONS.map((loc, idx) => ({
            id: `default-${idx}`,
            name: loc.name,
            region: loc.region,
            category: loc.category,
            description: loc.description,
            latitude: loc.latitude,
            longitude: loc.longitude,
            createdAt: ''
          }));

      const dateStr = new Date().toISOString().split('T')[0];
      exportConfiguredLocations(locsToExport, {
        format: 'xlsx',
        fileName: `Daftar_Lokasi_Terkonfigurasi_TMII_${dateStr}`,
        assets: allAssets,
        sheetTitle: 'Lokasi Terkonfigurasi'
      });
    } catch (err: any) {
      console.error('Error downloading locations:', err);
    } finally {
      setDownloadingLocs(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. TOP HEADER & SEARCH BAR */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl text-white shadow-xs" style={{ backgroundColor: theme.primaryColor }}>
              <Compass size={20} />
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Peta & Lokasi Aset Terpadu TMII</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Sistem pemetaan spasial interaktif aset tetap berdasarkan 5 wilayah utama Taman Mini Indonesia Indah.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <button
            onClick={handleDownloadLocations}
            disabled={downloadingLocs}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Unduh seluruh kolom daftar lokasi terkonfigurasi dalam format Excel (.xlsx)"
          >
            <FileSpreadsheet size={16} className="text-emerald-200" />
            <span>{downloadingLocs ? 'Mengunduh...' : 'Download Daftar Lokasi (.xlsx)'}</span>
          </button>

          <button
            onClick={() => setIsMasterMapOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-all cursor-pointer shadow-xs"
          >
            <MapIcon size={16} className="text-amber-700" />
            <span>Lihat Master Map Reference TMII</span>
          </button>
        </div>
      </div>

      {/* 2. REGION TABS (UTARA, SELATAN, BARAT, TIMUR, PUSAT) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* SEMUA REGION BUTTON */}
        <button
          onClick={() => {
            setSelectedRegion('semua');
            setSelectedHotspot(null);
          }}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between relative overflow-hidden ${
            selectedRegion === 'semua'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-400/20'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Semua Area</span>
            <Building2 size={16} className={selectedRegion === 'semua' ? 'text-amber-400' : 'text-slate-400'} />
          </div>
          <div>
            <div className="text-lg font-black">{regionStats.semua.count} <span className="text-xs font-semibold opacity-70">Aset</span></div>
            <div className="text-[10px] font-semibold opacity-80 mt-0.5 truncate">{formatRupiah(regionStats.semua.totalCost)}</div>
          </div>
        </button>

        {/* 5 WILAYAH BUTTONS */}
        {TMII_REGIONS.map(reg => {
          const isActive = selectedRegion === reg.id;
          const stat = regionStats[reg.id];

          return (
            <button
              key={reg.id}
              onClick={() => {
                setSelectedRegion(reg.id);
                setSelectedHotspot(null);
              }}
              className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                isActive
                  ? `${reg.bgLightClass} ${reg.borderClass} shadow-md ring-2 ring-amber-500/20`
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
              }`}
            >
              {/* Top Accent line */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: reg.accentHex }}
              />

              <div className="flex items-center justify-between mb-2 mt-1">
                <span className="text-[11px] font-black uppercase tracking-wider">{reg.shortName}</span>
                <span 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: reg.accentHex }}
                />
              </div>

              <div>
                <div className="text-lg font-black text-slate-900">
                  {stat.count} <span className="text-xs font-semibold text-slate-500">Aset</span>
                </div>
                <div className="text-[10px] font-bold text-slate-600 mt-0.5 truncate">
                  {formatRupiah(stat.totalCost)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. INTERACTIVE MAP VIEW & HOTSPOTS CANVAS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                Visual Spasial TMII
              </span>
              <h3 className="text-base font-extrabold text-slate-900">Peta Digital Interaktif</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Klik pada simpul / titik lokasi di bawah ini untuk menyaring dan melihat daftar aset di lokasi tersebut.
            </p>
          </div>

          {/* View mode buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Compass size={14} />
              <span>Peta Canvas</span>
            </button>
            <button
              onClick={() => setActiveViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid size={14} />
              <span>Grid Kartu</span>
            </button>
            <button
              onClick={() => setActiveViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List size={14} />
              <span>Tabel Aset</span>
            </button>
          </div>
        </div>

        {/* MAP CANVAS DISPLAY */}
        {activeViewMode === 'map' && (
          <div className="relative w-full h-[520px] md:h-[600px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group select-none flex flex-col justify-between">
            
            {/* Top Canvas Controls Bar */}
            <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-lg text-white">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border-r border-slate-700/80 pr-2">
                <button
                  onClick={() => setMapZoom(prev => Math.min(prev + 0.25, 2.0))}
                  className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 flex items-center justify-center font-black text-sm cursor-pointer transition-colors"
                  title="Perbesar Peta"
                >
                  +
                </button>
                <span className="text-[10px] font-extrabold px-1 text-slate-300 font-mono w-10 text-center">
                  {Math.round(mapZoom * 100)}%
                </span>
                <button
                  onClick={() => setMapZoom(prev => Math.max(prev - 0.25, 1.0))}
                  className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 flex items-center justify-center font-black text-sm cursor-pointer transition-colors"
                  title="Perkecil Peta"
                >
                  -
                </button>
                {mapZoom !== 1 && (
                  <button
                    onClick={() => setMapZoom(1)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-extrabold text-amber-400 cursor-pointer transition-colors"
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Map Mode Switcher */}
              <div className="flex items-center gap-1 pl-1">
                <button
                  onClick={() => setMapMode('detailed')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                    mapMode === 'detailed'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Peta Detail TMII
                </button>
                <button
                  onClick={() => setMapMode('dark')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                    mapMode === 'dark'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Modus Gelap
                </button>
                <button
                  onClick={() => setMapMode('hybrid')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                    mapMode === 'hybrid'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Hybrid
                </button>
              </div>
            </div>

            {/* Quick Master Map Modal Trigger Badge */}
            <div className="absolute top-4 right-4 z-30">
              <button
                onClick={() => setIsMasterMapOpen(true)}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-2 rounded-2xl shadow-xl border border-amber-300/80 transition-all cursor-pointer"
              >
                <Maximize2 size={14} />
                <span>Buka Master Reference HD</span>
              </button>
            </div>

            {/* MAP IMAGE & OVERLAY CONTAINER WITH ZOOM TRANSFORM */}
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-slate-950">
              <div
                className="relative w-full h-full transition-transform duration-300 ease-out flex items-center justify-center"
                style={{ transform: `scale(${mapZoom})`, transformOrigin: 'center center' }}
              >
                {/* Reference Map Image Background */}
                <img
                  src="https://ais-dev-vhjo5icyvy4gsiorogafbb-437283271918.asia-southeast1.run.app/user_content_1774257139/21.png"
                  alt="Peta Spasial TMII"
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    mapMode === 'dark'
                      ? 'filter brightness-75 contrast-125 invert-0 opacity-80'
                      : mapMode === 'hybrid'
                      ? 'filter brightness-90 contrast-110 saturate-150'
                      : 'filter brightness-100 contrast-100'
                  }`}
                  onError={(e) => {
                    // Fallback background image if offline
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1200&auto=format&fit=crop&q=80';
                  }}
                />

                {/* Ambient Dark Gradient Vignette Overlay for Pin Visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/40 pointer-events-none" />

                {/* Region Tint Polygon Highlights when Region Filter Active */}
                {selectedRegion !== 'semua' && (
                  <div className="absolute inset-0 pointer-events-none transition-all duration-300">
                    {selectedRegion === 'utara' && (
                      <div className="absolute top-0 inset-x-0 h-[38%] bg-emerald-500/20 border-b-2 border-emerald-400/60 backdrop-blur-[1px] flex items-start justify-center pt-16">
                        <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 px-3 py-1 rounded-full text-xs font-black shadow-lg">
                          WILAYAH UTARA (Sumatera & Kalimantan)
                        </span>
                      </div>
                    )}
                    {selectedRegion === 'selatan' && (
                      <div className="absolute bottom-0 inset-x-0 h-[42%] bg-amber-500/20 border-t-2 border-amber-400/60 backdrop-blur-[1px] flex items-end justify-center pb-12">
                        <span className="bg-amber-950/90 text-amber-300 border border-amber-500/50 px-3 py-1 rounded-full text-xs font-black shadow-lg">
                          WILAYAH SELATAN (Jawa, Bali, Museum)
                        </span>
                      </div>
                    )}
                    {selectedRegion === 'barat' && (
                      <div className="absolute left-0 inset-y-0 w-[35%] bg-indigo-500/20 border-r-2 border-indigo-400/60 backdrop-blur-[1px] flex items-center justify-start pl-6">
                        <span className="bg-indigo-950/90 text-indigo-300 border border-indigo-500/50 px-3 py-1 rounded-full text-xs font-black shadow-lg -rotate-90">
                          WILAYAH BARAT (Keong Emas)
                        </span>
                      </div>
                    )}
                    {selectedRegion === 'timur' && (
                      <div className="absolute right-0 inset-y-0 w-[38%] bg-purple-500/20 border-l-2 border-purple-400/60 backdrop-blur-[1px] flex items-center justify-end pr-6">
                        <span className="bg-purple-950/90 text-purple-300 border border-purple-500/50 px-3 py-1 rounded-full text-xs font-black shadow-lg rotate-90">
                          WILAYAH TIMUR (Papua & Birds)
                        </span>
                      </div>
                    )}
                    {selectedRegion === 'pusat' && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45%] h-[40%] rounded-full bg-sky-500/20 border-2 border-sky-400/60 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="bg-sky-950/90 text-sky-300 border border-sky-500/50 px-3 py-1 rounded-full text-xs font-black shadow-lg">
                          PUSAT (Danau Archipelago)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* HOTSPOT PINS RENDER */}
                {TMII_HOTSPOTS.map((spot) => {
                  // Check if hotspot is filtered out by selected region
                  const isRegionMatched = selectedRegion === 'semua' || selectedRegion === spot.region;
                  const isSelected = selectedHotspot?.id === spot.id;

                  // Calculate assets count for this spot
                  const spotAssetCount = allAssets.filter(ast => {
                    const locText = `${ast.location} ${ast.name} ${ast.area}`.toLowerCase();
                    return spot.subLocations.some(sub => locText.includes(sub.toLowerCase())) || locText.includes(spot.name.toLowerCase());
                  }).length;

                  const regInfo = TMII_REGIONS.find(r => r.id === spot.region);
                  const pinColorClass = regInfo ? regInfo.accentHex : '#0284C7';

                  return (
                    <div
                      key={spot.id}
                      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-300 ${
                        isRegionMatched ? 'opacity-100 scale-100' : 'opacity-35 scale-75'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setSelectedHotspot(isSelected ? null : spot);
                          setSelectedRegion(spot.region);
                        }}
                        className={`relative group cursor-pointer flex flex-col items-center focus:outline-none`}
                      >
                        {/* Ripple animation when selected */}
                        {isSelected && (
                          <span 
                            className="absolute w-12 h-12 rounded-full animate-ping opacity-40"
                            style={{ backgroundColor: pinColorClass }}
                          />
                        )}

                        {/* Pin Head Icon */}
                        <div 
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-black shadow-2xl border-2 transition-all duration-200 transform group-hover:scale-115 ${
                            isSelected 
                              ? 'border-white ring-4 ring-amber-400 scale-125 z-30' 
                              : 'border-white/90'
                          }`}
                          style={{ backgroundColor: pinColorClass }}
                        >
                          <MapPin size={18} />
                        </div>

                        {/* Asset Count Pill */}
                        <span className="mt-1 bg-slate-950/90 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full border border-slate-700/80 shadow-xl whitespace-nowrap flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {spotAssetCount} Aset
                        </span>

                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-40 pointer-events-none">
                          <div className="bg-slate-950/95 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 shadow-2xl whitespace-nowrap flex flex-col items-center backdrop-blur-md">
                            <span className="text-amber-400 font-black">{spot.name}</span>
                            <span className="text-[10px] text-slate-300 font-medium mt-0.5">{spot.category} • {spotAssetCount} Aset Terdaftar</span>
                          </div>
                          <div className="w-2.5 h-2.5 bg-slate-950 rotate-45 -mt-1.5 border-r border-b border-slate-700" />
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Map Legend Overlay at Bottom Left */}
            <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700/80 text-white text-[10px] space-y-1.5 shadow-xl max-w-[240px]">
              <div className="font-extrabold text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Compass size={12} /> Pembagian 5 Wilayah TMII</span>
              </div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> <span>Utara: Anjungan Sumatera & Kalimantan</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" /> <span>Selatan: Anjungan Jawa, Bali, Museum</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" /> <span>Barat: Keong Emas & Pintu 1 Utama</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" /> <span>Timur: Sulawesi, Papua & Birds Park</span></div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" /> <span>Pusat: Danau Archipelago & Promenade</span></div>
            </div>

          </div>
        )}

        {/* SELECTED HOTSPOT OR REGION INFO BAR */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white border border-slate-200 text-amber-700 shadow-2xs">
              <Compass size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">
                  {selectedHotspot ? `Lokasi Terpilih: ${selectedHotspot.name}` : `Wilayah: ${selectedRegion === 'semua' ? 'Semua Wilayah TMII' : TMII_REGIONS.find(r => r.id === selectedRegion)?.name}`}
                </span>
                {selectedHotspot && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedHotspot(null)}
                      className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      (Reset Lokasi)
                    </button>
                    {(() => {
                      const spotCoords = getLocationCoordinates(selectedHotspot.name);
                      return (
                        <a
                          href={spotCoords ? getGoogleMapsUrl(selectedHotspot.name, spotCoords.latitude, spotCoords.longitude) : getGoogleMapsUrl(selectedHotspot.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                          title="Buka titik lokasi hotspot di Google Maps"
                        >
                          <Compass size={11} className="text-blue-600" />
                          <span>Google Maps</span>
                          <ExternalLink size={9} />
                        </a>
                      );
                    })()}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Menampilkan <strong className="text-slate-900">{filteredAssets.length}</strong> aset tetap terdaftar pada filter ini.
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, kode, lokasi..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            {/* Condition Filter */}
            <select
              value={conditionFilter}
              onChange={e => setConditionFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
            >
              <option value="Semua">Semua Kondisi</option>
              <option value="Baik">Kondisi Baik</option>
              <option value="Rusak Ringan">Rusak Ringan</option>
              <option value="Rusak Berat">Rusak Berat</option>
            </select>
          </div>
        </div>

        {/* 4. ASSETS LISTING (GRID OR TABLE) */}
        {filteredAssets.length === 0 ? (
          <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
              <Info size={24} />
            </div>
            <h4 className="text-sm font-black text-slate-800">Tidak Ada Aset Ditemukan</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Coba sesuaikan pencarian atau pilihan wilayah untuk melihat aset lainnya.
            </p>
          </div>
        ) : activeViewMode === 'table' ? (
          /* TABLE VIEW */
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Kode Aset</th>
                  <th className="p-3">Nama Aset</th>
                  <th className="p-3">Wilayah</th>
                  <th className="p-3">Lokasi Detail</th>
                  <th className="p-3">Nilai Perolehan</th>
                  <th className="p-3">Kondisi</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredAssets.map(ast => {
                  const regKey = getAssetRegionKey(ast);
                  const regInfo = TMII_REGIONS.find(r => r.id === regKey);

                  return (
                    <tr key={ast.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">{ast.code}</td>
                      <td className="p-3 font-extrabold text-slate-800">{ast.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${regInfo?.badgeClass || 'bg-slate-100'}`}>
                          {regInfo?.shortName || 'Pusat'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">{ast.location}</td>
                      <td className="p-3 font-extrabold text-slate-900">{formatRupiah(Number(ast.acquisitionCost) || 0)}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          ast.condition === 'Baik' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ast.condition}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-600">{ast.status}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedAsset(ast)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-900 font-bold text-[11px] transition-all cursor-pointer"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* GRID VIEW / CARD DISPLAY */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map(ast => {
              const regKey = getAssetRegionKey(ast);
              const regInfo = TMII_REGIONS.find(r => r.id === regKey);

              return (
                <div
                  key={ast.id}
                  onClick={() => setSelectedAsset(ast)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {ast.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${regInfo?.badgeClass || 'bg-slate-100'}`}>
                        {regInfo?.shortName || 'Pusat'}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-2">
                      {ast.name}
                    </h4>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                      <MapPin size={13} className="text-amber-600 shrink-0" />
                      <span className="truncate">{ast.location}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Nilai Perolehan</div>
                      <div className="font-extrabold text-slate-900">{formatRupiah(Number(ast.acquisitionCost) || 0)}</div>
                    </div>

                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      ast.condition === 'Baik' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {ast.condition}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MASTER MAP REFERENCE LIGHTBOX MODAL */}
      <AnimatePresence>
        {isMasterMapOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-slate-900 text-white rounded-3xl overflow-hidden border border-slate-700 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
                    <MapIcon size={20} />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-white">Master Map Referensi Terupdate TMII</h3>
                    <p className="text-xs text-slate-400 font-medium">Pembagian 5 Wilayah Spasial: Utara, Selatan, Barat, Timur & Pusat</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMasterMapOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Map Image View Body */}
              <div className="flex-1 overflow-auto p-4 bg-slate-950 flex items-center justify-center min-h-[400px]">
                <img
                  src="https://ais-dev-vhjo5icyvy4gsiorogafbb-437283271918.asia-southeast1.run.app/user_content_1774257139/21.png"
                  alt="Master Peta TMII Terupdate"
                  className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl border border-slate-800"
                  onError={(e) => {
                    // Fallback to local image reference or direct static path if URL fails
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1200&auto=format&fit=crop&q=80';
                  }}
                />
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-900 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Utara: Anjungan Sumatera & Kalimantan</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Selatan: Anjungan Jawa & Museum</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Barat: Keong Emas & Pintu 1</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Timur: Sulawesi, Papua & Bird Park</span>
                </div>

                <button
                  onClick={() => setIsMasterMapOpen(false)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Tutup Peta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. ASSET DETAIL MODAL */}
      <AnimatePresence>
        {selectedAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl w-full max-w-xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="font-mono text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md">
                    {selectedAsset.code}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-2">{selectedAsset.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Wilayah / Area</span>
                  <div className="font-black text-slate-900">{selectedAsset.area || 'Wilayah TMII'}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Lokasi Spesifik</span>
                  <div className="font-black text-slate-900">{selectedAsset.location}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Nilai Perolehan</span>
                  <div className="font-black text-slate-900">{formatRupiah(Number(selectedAsset.acquisitionCost) || 0)}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Kondisi Fisik</span>
                  <div className="font-black text-slate-900">{selectedAsset.condition}</div>
                </div>
              </div>

              {selectedAsset.notes && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <span className="font-bold">Catatan Khusus:</span>
                  <p>{selectedAsset.notes}</p>
                </div>
              )}

              {/* Google Maps Coordinates Card */}
              {(() => {
                const coords = getLocationCoordinates(selectedAsset.location);
                return (
                  <div className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-blue-950">
                        <Compass size={16} className="text-blue-600" />
                        <span>Titik Lokasi Google Maps</span>
                      </div>
                      {coords ? (
                        <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-lg border border-blue-200/80">
                          {formatCoordinates(coords.latitude, coords.longitude, 'decimal')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md">
                          Pencarian Otomatis
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-blue-900/80 font-medium leading-relaxed">
                      {coords
                        ? `Lokasi "${selectedAsset.location}" telah terhubung dengan koordinat spasial GPS di area TMII.`
                        : `Buka titik lokasi dan petunjuk arah menuju "${selectedAsset.location}" melalui Google Maps.`}
                    </p>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <a
                        href={coords ? getGoogleMapsUrl(selectedAsset.location, coords.latitude, coords.longitude) : getGoogleMapsUrl(selectedAsset.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                      >
                        <MapPin size={13} />
                        <span>Buka di Google Maps</span>
                        <ExternalLink size={11} />
                      </a>

                      <a
                        href={coords ? getGoogleDirectionsUrl(selectedAsset.location, coords.latitude, coords.longitude) : getGoogleDirectionsUrl(selectedAsset.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-blue-800 border border-blue-200 shadow-2xs transition-colors"
                      >
                        <Navigation size={13} className="text-emerald-600" />
                        <span>Petunjuk Rute</span>
                      </a>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
