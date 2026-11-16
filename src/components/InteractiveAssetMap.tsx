import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Layers, 
  Search, 
  Compass, 
  ExternalLink, 
  Navigation, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  X, 
  Building2, 
  Maximize2, 
  Minimize2, 
  Crosshair, 
  Eye, 
  Info,
  ChevronRight,
  Filter,
  Check,
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import { 
  FixedAsset, 
  ConfiguredLocation, 
  AppTheme, 
  DEFAULT_ASSET_LOCATIONS 
} from '../types';
import { 
  getGoogleMapsUrl, 
  getGoogleDirectionsUrl, 
  formatCoordinates, 
  getCurrentGpsCoordinates, 
  TMII_CENTER_COORDINATES 
} from '../lib/geoUtils';
import { exportConfiguredLocations } from '../lib/locationExporter';

export interface InteractiveAssetMapProps {
  fixedAssets?: FixedAsset[];
  configuredLocations?: ConfiguredLocation[];
  theme: AppTheme;
  currentUserDisplayName?: string;
  onNavigateToAsset?: (domain: string, assetId: string) => void;
}

// Unified Asset item representing fixed asset stationed at a location
export interface UnifiedLocationAsset {
  id: string;
  code: string;
  name: string;
  domain: 'fixed';
  domainLabel: string;
  category: string;
  brandOrType?: string;
  condition: 'Baik' | 'Perlu Perbaikan' | 'Rusak' | 'Normal' | 'Mati Total';
  status?: string;
  locationName: string;
  areaOrRegion?: string;
  cost?: number;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

// Aggregated Location Point for GIS Pin
export interface GisLocationCluster {
  id: string;
  name: string;
  region: string;
  category?: string;
  latitude: number;
  longitude: number;
  assets: UnifiedLocationAsset[];
  hasIssue: boolean;
  totalCost: number;
  categoryCounts: Record<string, number>;
}

export type TileLayerType = 'satellite' | 'satellite-esri' | 'osm';

export default function InteractiveAssetMap({
  fixedAssets = [],
  configuredLocations = [],
  theme,
  currentUserDisplayName,
  onNavigateToAsset
}: InteractiveAssetMapProps) {
  // Map container reference and Leaflet instance
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);

  // UI States
  const [selectedCluster, setSelectedCluster] = useState<GisLocationCluster | null>(null);
  const [activeTileLayer, setActiveTileLayer] = useState<TileLayerType>('satellite');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('semua');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('semua');
  const [selectedConditionFilter, setSelectedConditionFilter] = useState<string>('semua');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGpsLocating, setIsGpsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);

  // Dynamic available categories from fixed assets
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    fixedAssets.forEach(fa => {
      if (fa.category && fa.category.trim()) cats.add(fa.category.trim());
    });
    return Array.from(cats).sort();
  }, [fixedAssets]);

  // 1. Helper function to find coordinates for a location string
  const findCoordinatesForLocation = (locName: string): { latitude: number; longitude: number; region?: string; category?: string } | null => {
    if (!locName || !locName.trim()) return null;
    const clean = locName.trim().toLowerCase();

    // Check configuredLocations (user overrides)
    if (configuredLocations && configuredLocations.length > 0) {
      const match = configuredLocations.find(l => l.name.trim().toLowerCase() === clean);
      if (match && typeof match.latitude === 'number' && typeof match.longitude === 'number') {
        return { latitude: match.latitude, longitude: match.longitude, region: match.region, category: match.category };
      }
      // Partial match in configuredLocations
      const partialConfigured = configuredLocations.find(l => clean.includes(l.name.toLowerCase()) || l.name.toLowerCase().includes(clean));
      if (partialConfigured && typeof partialConfigured.latitude === 'number' && typeof partialConfigured.longitude === 'number') {
        return { latitude: partialConfigured.latitude, longitude: partialConfigured.longitude, region: partialConfigured.region, category: partialConfigured.category };
      }
    }

    // Check DEFAULT_ASSET_LOCATIONS exact match
    const defaultMatch = DEFAULT_ASSET_LOCATIONS.find(l => l.name.trim().toLowerCase() === clean);
    if (defaultMatch && typeof defaultMatch.latitude === 'number' && typeof defaultMatch.longitude === 'number') {
      return { latitude: defaultMatch.latitude, longitude: defaultMatch.longitude, region: defaultMatch.region, category: defaultMatch.category };
    }

    // Check aliases in DEFAULT_ASSET_LOCATIONS
    const aliasMatch = DEFAULT_ASSET_LOCATIONS.find(l => 
      l.aliases?.some(alias => alias.toLowerCase() === clean || clean.includes(alias.toLowerCase()) || alias.toLowerCase().includes(clean))
    );
    if (aliasMatch && typeof aliasMatch.latitude === 'number' && typeof aliasMatch.longitude === 'number') {
      return { latitude: aliasMatch.latitude, longitude: aliasMatch.longitude, region: aliasMatch.region, category: aliasMatch.category };
    }

    // Partial/Fuzzy lookup (e.g. if asset location is "Anjungan Papua", match "Papua")
    const partialMatch = DEFAULT_ASSET_LOCATIONS.find(l => clean.includes(l.name.toLowerCase()) || l.name.toLowerCase().includes(clean));
    if (partialMatch && typeof partialMatch.latitude === 'number' && typeof partialMatch.longitude === 'number') {
      return { latitude: partialMatch.latitude, longitude: partialMatch.longitude, region: partialMatch.region, category: partialMatch.category };
    }

    return null;
  };

  // 2. Aggregate assets into unified list (Fixed Assets, CCTV, Museum Collections - MEP & Satwa excluded)
  const unifiedAssets: UnifiedLocationAsset[] = useMemo(() => {
    const list: UnifiedLocationAsset[] = [];

    // Fixed Assets exclusively
    fixedAssets.forEach(fa => {
      const coords = findCoordinatesForLocation(fa.location);
      list.push({
        id: fa.id,
        code: fa.code,
        name: fa.name,
        domain: 'fixed',
        domainLabel: 'Aset Tetap',
        category: fa.category || 'Aset Tetap',
        brandOrType: fa.brand || fa.type,
        condition: (fa.condition as any) || 'Baik',
        status: fa.status,
        locationName: fa.location,
        areaOrRegion: fa.area || coords?.region,
        cost: Number(fa.acquisitionCost) || 0,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        notes: fa.notes
      });
    });

    return list;
  }, [fixedAssets, configuredLocations]);

  // 3. Group unified assets by geographic location cluster (Only locations with active assets)
  const clusters: GisLocationCluster[] = useMemo(() => {
    const map = new Map<string, GisLocationCluster>();

    // Only group fixed assets that actually have coordinates and active data
    unifiedAssets.forEach(ast => {
      if (typeof ast.latitude === 'number' && typeof ast.longitude === 'number') {
        const key = `${ast.latitude.toFixed(5)},${ast.longitude.toFixed(5)}`;
        let cluster = map.get(key);
        if (!cluster) {
          cluster = {
            id: key,
            name: ast.locationName,
            region: ast.areaOrRegion || 'Wilayah TMII',
            latitude: ast.latitude,
            longitude: ast.longitude,
            assets: [],
            hasIssue: false,
            totalCost: 0,
            categoryCounts: {}
          };
          map.set(key, cluster);
        }

        cluster.assets.push(ast);
        cluster.totalCost += ast.cost || 0;
        const cat = ast.category || 'Lainnya';
        cluster.categoryCounts[cat] = (cluster.categoryCounts[cat] || 0) + 1;

        if (ast.condition === 'Rusak' || ast.condition === 'Perlu Perbaikan' || ast.condition === 'Mati Total') {
          cluster.hasIssue = true;
        }
      }
    });

    // Strictly return only clusters that have at least 1 asset (eliminates points without numbers)
    return Array.from(map.values()).filter(c => c.assets.length > 0);
  }, [unifiedAssets]);

  // 4. Filter clusters according to search query, region, category, and condition
  const filteredClusters = useMemo(() => {
    return clusters.filter(cl => {
      // Region filter
      if (selectedRegionFilter !== 'semua') {
        const clReg = (cl.region || '').toLowerCase();
        if (!clReg.includes(selectedRegionFilter.toLowerCase())) return false;
      }

      // Category filter (Fixed Assets category)
      if (selectedCategoryFilter !== 'semua') {
        const hasCategory = cl.assets.some(a => a.category.toLowerCase() === selectedCategoryFilter.toLowerCase());
        if (!hasCategory) return false;
      }

      // Condition filter
      if (selectedConditionFilter === 'baik') {
        const hasGood = cl.assets.some(a => a.condition === 'Baik' || a.condition === 'Normal');
        if (!hasGood && cl.assets.length > 0) return false;
      } else if (selectedConditionFilter === 'rusak') {
        if (!cl.hasIssue) return false;
      }

      // Search query filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = cl.name.toLowerCase().includes(q);
        const matchRegion = (cl.region || '').toLowerCase().includes(q);
        const matchAsset = cl.assets.some(a => 
          a.name.toLowerCase().includes(q) || 
          a.code.toLowerCase().includes(q) ||
          (a.brandOrType || '').toLowerCase().includes(q) ||
          (a.category || '').toLowerCase().includes(q)
        );
        if (!matchName && !matchRegion && !matchAsset) return false;
      }

      return true;
    });
  }, [clusters, selectedRegionFilter, selectedCategoryFilter, selectedConditionFilter, searchQuery]);

  // Quick statistics
  const stats = useMemo(() => {
    const totalLocationsWithAssets = clusters.filter(c => c.assets.length > 0).length;
    const totalMappedAssets = unifiedAssets.filter(a => typeof a.latitude === 'number').length;
    const totalIssues = unifiedAssets.filter(a => a.condition === 'Rusak' || a.condition === 'Perlu Perbaikan' || a.condition === 'Mati Total').length;
    const healthyPercentage = totalMappedAssets > 0 ? Math.round(((totalMappedAssets - totalIssues) / totalMappedAssets) * 100) : 100;
    const totalValuation = unifiedAssets.reduce((acc, a) => acc + (a.cost || 0), 0);

    return {
      totalLocations: clusters.length,
      locationsWithAssets: totalLocationsWithAssets,
      mappedAssets: totalMappedAssets,
      unmappedAssets: unifiedAssets.length - totalMappedAssets,
      healthyPercentage,
      totalIssues,
      totalValuation
    };
  }, [clusters, unifiedAssets]);

  // 5. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up any stale map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [TMII_CENTER_COORDINATES.latitude, TMII_CENTER_COORDINATES.longitude],
      zoom: 15,
      minZoom: 13,
      maxZoom: 19,
      zoomControl: false
    });

    // Add Zoom controls to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Markers layer group
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    mapInstanceRef.current = map;

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 6. Handle Tile Layer changes (Satellite Hybrid, Pure Satellite Esri, OSM)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing tile layer if present
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let tileUrl = 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    let attribution = '&copy; Google Satellite Maps';
    let maxZoom = 20;
    let subdomains: string | string[] = ['mt0', 'mt1', 'mt2', 'mt3'];

    if (activeTileLayer === 'satellite') {
      // Google Hybrid: Citra satelit jernih dengan label jalan & gedung TMII
      tileUrl = 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Satellite Maps';
      subdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
      maxZoom = 20;
    } else if (activeTileLayer === 'satellite-esri') {
      // Esri World Imagery: Citra satelit alam murni tanpa teks/label
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP';
      subdomains = 'abc';
      maxZoom = 19;
    } else if (activeTileLayer === 'osm') {
      // OpenStreetMap: Peta jalan vektor standar
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      subdomains = 'abc';
      maxZoom = 19;
    }

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom,
      subdomains
    }).addTo(map);
  }, [activeTileLayer]);

  // 7. Update Markers whenever filtered clusters change
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    const map = mapInstanceRef.current;
    if (!markersLayer || !map) return;

    markersLayer.clearLayers();

    filteredClusters.forEach((cluster) => {
      const assetCount = cluster.assets.length;
      if (assetCount <= 0) return; // Skip any marker without active asset data
      const isSelected = selectedCluster?.id === cluster.id;
      const hasIssue = cluster.hasIssue;

      // Color scheme based on region or issue alert
      let pinColor = '#2563EB'; // default blue
      const reg = (cluster.region || '').toLowerCase();
      if (reg.includes('utara')) pinColor = '#059669'; // emerald
      else if (reg.includes('selatan')) pinColor = '#D97706'; // amber
      else if (reg.includes('barat')) pinColor = '#0891B2'; // cyan
      else if (reg.includes('timur')) pinColor = '#EA580C'; // orange
      else if (reg.includes('pusat')) pinColor = '#4F46E5'; // indigo

      if (hasIssue) {
        pinColor = '#DC2626'; // red alert
      }

      // Create rich HTML marker with asset count number
      const markerHtml = `
        <div class="relative flex items-center justify-center group cursor-pointer transition-transform duration-200 hover:scale-115 ${isSelected ? 'scale-125 z-50' : 'z-20'}">
          ${isSelected ? `<div class="absolute -inset-2.5 rounded-full bg-blue-500/30 animate-ping"></div>` : ''}
          ${hasIssue ? `<div class="absolute -inset-1.5 rounded-full bg-red-500/30 animate-pulse"></div>` : ''}
          
          <div 
            class="relative flex items-center justify-center min-w-8 h-8 px-1.5 rounded-2xl shadow-lg border-2 border-white text-white font-black text-[11px] transition-all"
            style="background-color: ${pinColor};"
          >
            ${assetCount}
          </div>

          ${hasIssue ? `
            <span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black text-white">!</span>
          ` : ''}

          <!-- Pin Pointer Arrow -->
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rotate-45 border-r border-b border-white" style="background-color: ${pinColor};"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-gis-pin',
        iconSize: [32, 36],
        iconAnchor: [16, 36],
        popupAnchor: [0, -36]
      });

      const marker = L.marker([cluster.latitude, cluster.longitude], { icon: customIcon });

      // Interactive Popup
      const popupHtml = `
        <div class="p-1 min-w-[200px] text-slate-800 font-sans">
          <div class="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-600 mb-0.5">
            <span>${cluster.region || 'TMII'}</span>
            ${cluster.category ? `• <span>${cluster.category}</span>` : ''}
          </div>
          <div class="text-sm font-black text-slate-900 leading-tight">${cluster.name}</div>
          <div class="text-[11px] text-slate-500 font-medium mt-1">
            ${assetCount > 0 ? `<strong>${assetCount} unit</strong> aset terpasang` : 'Belum ada aset terdaftar'}
          </div>
          ${hasIssue ? `
            <div class="mt-1.5 px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-bold border border-red-200 inline-block">
              Perlu Perhatian / Kendala
            </div>
          ` : ''}
          <div class="mt-2 text-[10px] font-bold text-blue-700 underline cursor-pointer">
            Klik pin untuk membuka daftar aset & rute
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { closeButton: false, offset: [0, -10] });

      marker.on('click', () => {
        setSelectedCluster(cluster);
        map.flyTo([cluster.latitude, cluster.longitude], 17, { duration: 0.8 });
      });

      markersLayer.addLayer(marker);
    });
  }, [filteredClusters, selectedCluster]);

  // 8. GPS Live Tracking Handler
  const handleLocateUser = async () => {
    setIsGpsLocating(true);
    setGpsError(null);

    try {
      const pos = await getCurrentGpsCoordinates();
      setUserLocation(pos);

      const map = mapInstanceRef.current;
      if (map) {
        // Remove previous user marker
        if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
        if (userCircleRef.current) map.removeLayer(userCircleRef.current);

        // Add user marker
        const userHtml = `
          <div class="relative flex items-center justify-center w-6 h-6">
            <div class="absolute -inset-2 rounded-full bg-blue-500/30 animate-ping"></div>
            <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
          </div>
        `;
        const userIcon = L.divIcon({
          html: userHtml,
          className: 'user-gps-pin',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        userMarkerRef.current = L.marker([pos.latitude, pos.longitude], { icon: userIcon }).addTo(map);
        userCircleRef.current = L.circle([pos.latitude, pos.longitude], {
          radius: pos.accuracy || 20,
          color: '#3B82F6',
          fillColor: '#60A5FA',
          fillOpacity: 0.15,
          weight: 1
        }).addTo(map);

        userMarkerRef.current.bindPopup(`
          <div class="text-xs font-bold p-1">
            <div class="text-blue-600">Posisi Anda Saat Ini</div>
            <div class="text-[10px] text-slate-500 font-mono mt-0.5">${formatCoordinates(pos.latitude, pos.longitude, 'decimal')}</div>
            <div class="text-[9px] text-slate-400">Akurasi: ±${Math.round(pos.accuracy)} meter</div>
          </div>
        `).openPopup();

        map.flyTo([pos.latitude, pos.longitude], 17, { duration: 1.2 });
      }
    } catch (err: any) {
      setGpsError(err.message || 'Gagal mendeteksi lokasi GPS');
    } finally {
      setIsGpsLocating(false);
    }
  };

  // 9. Reset map view to TMII center
  const handleResetView = () => {
    setSelectedCluster(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [TMII_CENTER_COORDINATES.latitude, TMII_CENTER_COORDINATES.longitude],
        15,
        { duration: 1 }
      );
    }
  };

  // 10. Handle download configured locations
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
        assets: fixedAssets,
        sheetTitle: 'Lokasi Terkonfigurasi'
      });
    } catch (err: any) {
      console.error('Error downloading locations:', err);
    } finally {
      setDownloadingLocs(false);
    }
  };

  // Format currency
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className={`space-y-3 sm:space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 p-3 sm:p-4' : ''}`}>
      
      {/* 1. TOP HEADER & STATISTICS STRIP */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2.5 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-white shadow-xs shrink-0" style={{ backgroundColor: theme.primaryColor }}>
              <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-snug">Peta Interaktif Sebaran Titik Aset TMII</h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 sm:mt-1 leading-snug">
            Visualisasi spasial GIS sebaran Aset Tetap di seluruh anjungan, gedung, dan wahana TMII.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[11px] sm:text-xs">
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-100 rounded-lg sm:rounded-xl border border-slate-200 flex items-center gap-1.5 sm:gap-2">
            <MapPin size={13} className="text-blue-600 shrink-0" />
            <span className="font-bold text-slate-700">{stats.locationsWithAssets} Lokasi Aktif</span>
          </div>

          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-emerald-50 rounded-lg sm:rounded-xl border border-emerald-200 flex items-center gap-1.5 sm:gap-2">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span className="font-bold text-emerald-800">{stats.mappedAssets} Unit ({stats.healthyPercentage}% Prima)</span>
          </div>

          {stats.totalIssues > 0 && (
            <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-rose-50 rounded-lg sm:rounded-xl border border-rose-200 flex items-center gap-1.5 sm:gap-2">
              <AlertTriangle size={13} className="text-rose-600 shrink-0" />
              <span className="font-bold text-rose-800">{stats.totalIssues} Perlu Perhatian</span>
            </div>
          )}

          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-amber-50 rounded-lg sm:rounded-xl border border-amber-200 flex items-center gap-1 sm:gap-1.5">
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-amber-700">Nilai:</span>
            <span className="font-black text-amber-900">{formatRupiah(stats.totalValuation)}</span>
          </div>
        </div>
      </div>

      {/* 2. MAP FILTER & SEARCH HUD BAR */}
      <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs space-y-2.5 sm:space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama wahana, anjungan, atau kode aset..."
              className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick HUD Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            {/* Tile Layer Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setActiveTileLayer('satellite')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTileLayer === 'satellite' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Citra Satelit Google dengan Label Jalan & Anjungan TMII"
              >
                Satelit (Hybrid)
              </button>
              <button
                onClick={() => setActiveTileLayer('satellite-esri')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTileLayer === 'satellite-esri' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Citra Satelit Alam Esri World Imagery"
              >
                Satelit Murni
              </button>
              <button
                onClick={() => setActiveTileLayer('osm')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTileLayer === 'osm' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Peta Vektor Jalan OpenStreetMap"
              >
                Peta Jalan
              </button>
            </div>

            {/* GPS Lokasi Saya */}
            <button
              onClick={handleLocateUser}
              disabled={isGpsLocating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Deteksi Posisi GPS Anda di Kawasan TMII"
            >
              <Crosshair size={14} className={isGpsLocating ? "animate-spin text-blue-600" : "text-blue-600"} />
              <span>{isGpsLocating ? 'Mencari...' : 'Lokasi Saya'}</span>
            </button>

            {/* Download Daftar Lokasi Button */}
            <button
              onClick={handleDownloadLocations}
              disabled={downloadingLocs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Unduh Daftar Lengkap Seluruh Lokasi Terkonfigurasi (.xlsx)"
            >
              <FileSpreadsheet size={14} className="text-emerald-200" />
              <span>{downloadingLocs ? 'Mengunduh...' : 'Unduh Lokasi (.xlsx)'}</span>
            </button>

            {/* Reset View Button */}
            <button
              onClick={handleResetView}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Pusatkan Peta ke TMII"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Filters Row (Region, Domain, Condition) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter size={12} />
            <span>Filter:</span>
          </span>

          {/* Region Filter Buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { id: 'semua', label: 'Semua Wilayah' },
              { id: 'utara', label: 'Utara' },
              { id: 'selatan', label: 'Selatan' },
              { id: 'barat', label: 'Barat' },
              { id: 'timur', label: 'Timur' },
              { id: 'pusat', label: 'Pusat' }
            ].map(r => {
              const isActive = selectedRegionFilter === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRegionFilter(r.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* Fixed Asset Category Filter */}
          {availableCategories.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold text-[10px]">Kategori:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="semua">Semua Kategori Aset</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* Condition Filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedConditionFilter('semua')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedConditionFilter === 'semua' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Semua Kondisi
            </button>
            <button
              onClick={() => setSelectedConditionFilter('rusak')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedConditionFilter === 'rusak' ? 'bg-red-600 text-white shadow-xs' : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              <AlertTriangle size={12} />
              <span>Perlu Perbaikan</span>
            </button>
          </div>
        </div>

        {/* GPS Error alert if any */}
        {gpsError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{gpsError}</span>
            </div>
            <button onClick={() => setGpsError(null)} className="text-rose-500 hover:text-rose-700 font-bold text-xs">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 3. MAIN MAP WORKSPACE WITH SIDEBAR DRAWER */}
      <div className="relative w-full h-[620px] rounded-3xl overflow-hidden border border-slate-200 shadow-xl flex bg-slate-900">
        
        {/* Leaflet Canvas Container */}
        <div 
          ref={mapContainerRef} 
          className="w-full h-full z-0 cursor-grab active:cursor-grabbing" 
          id="gis-leaflet-canvas"
        />

        {/* Floating Map Legend (Bottom-Left) */}
        <div className="absolute bottom-4 left-4 z-30 bg-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200/80 shadow-lg text-[11px] space-y-1.5 pointer-events-auto max-w-xs">
          <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
            <MapPin size={13} className="text-blue-600" />
            <span>Legenda Wilayah TMII</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-600 font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0"></span>
              <span>Utara</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0"></span>
              <span>Selatan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 shrink-0"></span>
              <span>Barat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-600 shrink-0"></span>
              <span>Timur</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"></span>
              <span>Pusat</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-600 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0 animate-pulse"></span>
              <span>Kendala / Rusak</span>
            </div>
          </div>
        </div>

        {/* 4. SLIDE-OVER DETAIL DRAWER FOR SELECTED LOCATION */}
        <AnimatePresence>
          {selectedCluster && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute top-0 right-0 bottom-0 w-full sm:w-[420px] bg-white z-40 shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden"
              id="location-detail-drawer"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                      {selectedCluster.region || 'Kawasan TMII'}
                    </span>
                    {selectedCluster.category && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700">
                        {selectedCluster.category}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    {selectedCluster.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-1">
                    <Compass size={13} className="text-slate-400" />
                    <span>{formatCoordinates(selectedCluster.latitude, selectedCluster.longitude, 'decimal')}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCluster(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Action Buttons to Google Maps */}
              <div className="p-4 bg-blue-50/60 border-b border-blue-100 flex items-center gap-2">
                <a
                  href={getGoogleMapsUrl(selectedCluster.name, selectedCluster.latitude, selectedCluster.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                >
                  <MapPin size={14} />
                  <span>Buka Google Maps</span>
                  <ExternalLink size={12} />
                </a>

                <a
                  href={getGoogleDirectionsUrl(selectedCluster.name, selectedCluster.latitude, selectedCluster.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
                  title="Petunjuk Rute / Navigasi"
                >
                  <Navigation size={14} className="text-emerald-600" />
                  <span>Rute</span>
                </a>
              </div>

              {/* Asset Breakdown Tabs / Header */}
              <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between">
                <div className="text-xs font-extrabold text-slate-900">
                  Daftar Aset di Lokasi Ini ({selectedCluster.assets.length})
                </div>
                {selectedCluster.totalCost > 0 && (
                  <div className="text-[11px] font-bold text-slate-500">
                    Nilai: {formatRupiah(selectedCluster.totalCost)}
                  </div>
                )}
              </div>

              {/* Assets Scrollable List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {selectedCluster.assets.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Building2 size={36} className="mx-auto opacity-30" />
                    <p className="text-xs font-semibold">Belum ada unit aset yang didaftarkan pada titik lokasi ini.</p>
                    <p className="text-[11px] text-slate-400">Pilih lokasi ini saat menambahkan aset tetap, MEP, atau CCTV.</p>
                  </div>
                ) : (
                  selectedCluster.assets.map((asset) => {
                    const isIssue = asset.condition === 'Rusak' || asset.condition === 'Perlu Perbaikan' || asset.condition === 'Mati Total' || asset.condition === 'Sakit';

                    return (
                      <div
                        key={`${asset.domain}-${asset.id}`}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isIssue 
                            ? 'bg-rose-50/40 border-rose-200 hover:border-rose-400' 
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {asset.domainLabel}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                {asset.code}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 leading-tight">
                              {asset.name}
                            </h4>
                          </div>

                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                            isIssue 
                              ? 'bg-rose-100 text-rose-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {asset.condition}
                          </span>
                        </div>

                        <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                          {asset.category && (
                            <div>Kategori: <span className="font-semibold text-slate-700">{asset.category}</span></div>
                          )}
                          {asset.brandOrType && (
                            <div>Tipe / Merek: <span className="font-semibold text-slate-700">{asset.brandOrType}</span></div>
                          )}
                          {asset.cost ? (
                            <div>Nilai Perolehan: <span className="font-bold text-slate-800">{formatRupiah(asset.cost)}</span></div>
                          ) : null}
                          {asset.notes && (
                            <div className="text-[10px] text-slate-400 italic line-clamp-2 mt-1">"{asset.notes}"</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Sistem Geografis Terpadu TMII</span>
                <button
                  onClick={() => setSelectedCluster(null)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}
