import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  FileSpreadsheet,
  Heart,
  Activity,
  ShieldCheck,
  Stethoscope,
  Info,
  MapPin,
  Tag,
  ArrowUpDown,
  UserCheck,
  Clock
} from 'lucide-react';
import { AnimalAsset, AppTheme, ConfiguredLocation, DEFAULT_ASSET_LOCATIONS, TmiiRegionName } from '../types';
import { exportToExcel } from '../lib/excel';
import ImportDataPanel from './ImportDataPanel';
import LocationAutoComplete from './LocationAutoComplete';

interface AnimalAssetsProps {
  animals: AnimalAsset[];
  onAddAnimal: (animal: Omit<AnimalAsset, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateAnimal: (id: string, animal: Partial<AnimalAsset>) => Promise<void>;
  onDeleteAnimal: (id: string) => Promise<void>;
  configuredLocations?: ConfiguredLocation[];
  isAdmin?: boolean;
  theme: AppTheme;
}

export default function AnimalAssets({
  animals,
  onAddAnimal,
  onUpdateAnimal,
  onDeleteAnimal,
  configuredLocations = [],
  isAdmin = true,
  theme
}: AnimalAssetsProps) {
  const activeLocationsList = React.useMemo(() => {
    if (configuredLocations && configuredLocations.length > 0) {
      return configuredLocations;
    }
    return DEFAULT_ASSET_LOCATIONS.map((loc, idx) => ({
      id: `default-${idx}`,
      name: loc.name,
      region: loc.region,
      description: loc.description,
      createdAt: ''
    }));
  }, [configuredLocations]);

  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('Semua');
  const [typeFilter, setTypeFilter] = useState('Semua');
  const [healthFilter, setHealthFilter] = useState('Semua');
  const [genderFilter, setGenderFilter] = useState('Semua');
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Sorting & Pagination States
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<AnimalAsset | null>(null);

  // Requested fields
  const [formName, setFormName] = useState(''); // Nama Satwa (Mandatory)
  const [formLatinName, setFormLatinName] = useState(''); // Nama Latin (Mandatory)
  const [formType, setFormType] = useState<AnimalAsset['type']>('Aves'); // Jenis (Aves, Reptil, Pisces, Amfibi, Mamalia) (Mandatory)
  const [formLocation, setFormLocation] = useState(''); // Lokasi (Mandatory)
  const [formLocationDetail, setFormLocationDetail] = useState(''); // Detail Lokasi
  const [formGender, setFormGender] = useState<NonNullable<AnimalAsset['gender']>>('Belum Teridentifikasi'); // Jenis Kelamin
  const [formHealthStatus, setFormHealthStatus] = useState<string>('Sehat'); // Kondisi Kesehatan
  const [formNicknameOrCode, setFormNicknameOrCode] = useState(''); // Nama Panggilan / Kode Khusus
  const [formNotes, setFormNotes] = useState(''); // Keterangan

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, locationFilter, typeFilter, healthFilter, genderFilter, sortColumn, sortDirection]);

  const resetForm = () => {
    setEditingAnimal(null);
    setFormName('');
    setFormLatinName('');
    setFormType('Aves');
    setFormLocation('');
    setFormLocationDetail('');
    setFormGender('Belum Teridentifikasi');
    setFormHealthStatus('Sehat');
    setFormNicknameOrCode('');
    setFormNotes('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (animal: AnimalAsset) => {
    setEditingAnimal(animal);
    setFormName(animal.name || '');
    setFormLatinName(animal.latinName || animal.species || '');
    setFormType(animal.type || 'Aves');
    setFormLocation(animal.location || '');
    setFormLocationDetail(animal.locationDetail || '');
    setFormGender(animal.gender || 'Belum Teridentifikasi');
    setFormHealthStatus(animal.healthStatus || 'Sehat');
    setFormNicknameOrCode(animal.nicknameOrCode || animal.code || '');
    setFormNotes(animal.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formLatinName.trim() || !formType || !formLocation.trim()) {
      alert('Mohon lengkapi field wajib (*): Nama Satwa, Nama Latin, Jenis Satwa, dan Lokasi.');
      return;
    }

    const animalPayload = {
      name: formName.trim(),
      latinName: formLatinName.trim(),
      type: formType,
      location: formLocation.trim(),
      locationDetail: formLocationDetail.trim(),
      gender: formGender,
      healthStatus: formHealthStatus.trim() || 'Sehat',
      nicknameOrCode: formNicknameOrCode.trim(),
      notes: formNotes.trim(),
      code: formNicknameOrCode.trim() || editingAnimal?.code || `STW-${String(animals.length + 1).padStart(3, '0')}`,
      species: formLatinName.trim()
    };

    try {
      if (editingAnimal) {
        await onUpdateAnimal(editingAnimal.id, animalPayload);
      } else {
        await onAddAnimal(animalPayload);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(`Gagal menyimpan data satwa: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data satwa ini dari database?')) {
      try {
        await onDeleteAnimal(id);
      } catch (err: any) {
        alert(`Gagal menghapus data satwa: ${err.message}`);
      }
    }
  };

  const handleExport = () => {
    const exportData = animals.map(a => ({
      'Nama Satwa': a.name || '',
      'Nama Latin': a.latinName || a.species || '',
      'Jenis': a.type || 'Aves',
      'Lokasi': a.location || '',
      'Detail Lokasi': a.locationDetail || '',
      'Jenis Kelamin': a.gender || 'Belum Teridentifikasi',
      'Kondisi Kesehatan': a.healthStatus || 'Sehat',
      'Nama Panggilan / Kode Khusus': a.nicknameOrCode || a.code || '',
      'Keterangan': a.notes || '',
      'Tanggal Input': a.createdAt || ''
    }));
    exportToExcel(exportData, 'Database_Satwa_TMII', 'Satwa');
  };

  // Calculate location statistics
  const locationStats = React.useMemo(() => {
    const map: Record<string, { total: number; healthy: number; sick: number; types: Record<string, number> }> = {};
    
    animals.forEach(animal => {
      const loc = animal.location?.trim() || 'Tanpa Lokasi';
      if (!map[loc]) {
        map[loc] = { total: 0, healthy: 0, sick: 0, types: {} };
      }
      map[loc].total += 1;
      if (animal.healthStatus === 'Sakit' || animal.healthStatus === 'Dalam Perawatan' || animal.healthStatus === 'Karantina') {
        map[loc].sick += 1;
      } else {
        map[loc].healthy += 1;
      }
      const t = animal.type || 'Lainnya';
      map[loc].types[t] = (map[loc].types[t] || 0) + 1;
    });

    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [animals]);

  const uniqueLocationsList = React.useMemo(() => {
    const set = new Set<string>();
    animals.forEach(a => {
      if (a.location?.trim()) set.add(a.location.trim());
    });
    activeLocationsList.forEach(loc => {
      if (loc.name) set.add(loc.name);
    });
    return Array.from(set).sort();
  }, [animals, activeLocationsList]);

  // Filter Satwa
  const filteredAnimals = animals.filter(animal => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (animal.name || '').toLowerCase().includes(searchLower) ||
      (animal.latinName || animal.species || '').toLowerCase().includes(searchLower) ||
      (animal.type || '').toLowerCase().includes(searchLower) ||
      (animal.location || '').toLowerCase().includes(searchLower) ||
      (animal.locationDetail || '').toLowerCase().includes(searchLower) ||
      (animal.nicknameOrCode || animal.code || '').toLowerCase().includes(searchLower) ||
      (animal.notes || '').toLowerCase().includes(searchLower);

    const matchesLocation = locationFilter === 'Semua' || animal.location === locationFilter;
    const matchesType = typeFilter === 'Semua' || animal.type === typeFilter;
    const matchesGender = genderFilter === 'Semua' || animal.gender === genderFilter;
    const matchesHealth = healthFilter === 'Semua' || animal.healthStatus === healthFilter;

    return matchesSearch && matchesLocation && matchesType && matchesGender && matchesHealth;
  });

  // Sort Satwa
  const sortedAnimals = [...filteredAnimals].sort((a, b) => {
    let valA = (a[sortColumn as keyof AnimalAsset] || '') as string;
    let valB = (b[sortColumn as keyof AnimalAsset] || '') as string;

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination Slice
  const totalPages = Math.ceil(sortedAnimals.length / itemsPerPage) || 1;
  const paginatedAnimals = sortedAnimals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Health summary counters
  const totalCount = animals.length;
  const sickCount = animals.filter(a => a.healthStatus === 'Sakit' || a.healthStatus === 'Dalam Perawatan').length;

  return (
    <div className="space-y-3.5 sm:space-y-6" id="animals-module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4" id="animals-header">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight leading-snug">Database Satwa Wahana</h1>
          <p className="text-[11px] sm:text-sm text-gray-500 mt-0.5 leading-snug">Pendataan dan inventarisasi koleksi satwa TMII (Nama Satwa, Latin, Jenis, Lokasi, Kesehatan)</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
          {isAdmin && (
            <button 
              onClick={() => setIsImportOpen(!isImportOpen)}
              className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 font-semibold text-[11px] sm:text-sm py-2 px-2.5 sm:py-2 sm:px-4 rounded-lg sm:rounded-xl shadow-xs transition-colors cursor-pointer border border-transparent ${
                isImportOpen 
                  ? 'text-white' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 shadow-sm'
              }`}
              style={{ backgroundColor: isImportOpen ? theme.primaryColor : undefined }}
              id="btn-import-animals-toggle"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] shrink-0 ${isImportOpen ? 'text-white' : 'text-slate-500'}`} />
              <span className="truncate">Import Excel/CSV</span>
            </button>
          )}
          <button 
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-[11px] sm:text-sm py-2 px-2.5 sm:py-2 sm:px-4 rounded-lg sm:rounded-xl shadow-xs transition-colors cursor-pointer"
            id="btn-export-animals"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-emerald-600 shrink-0" />
            <span className="truncate">Ekspor Excel</span>
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 text-white font-semibold text-xs sm:text-sm py-2 px-3 sm:py-2 sm:px-4 rounded-lg sm:rounded-xl shadow-md transition-colors cursor-pointer"
            style={{ backgroundColor: theme.primaryColor }}
            id="btn-add-animal"
          >
            <Plus className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0" />
            <span>Registrasi Satwa</span>
          </button>
        </div>
      </div>

      {/* Import Panel Drawer */}
      <AnimatePresence>
        {isImportOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ImportDataPanel 
              type="animals"
              onImport={async (parsedRows) => {
                for (const row of parsedRows) {
                  await onAddAnimal(row);
                }
                setIsImportOpen(false);
              }}
              onClose={() => setIsImportOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Dashboard Pelaporan */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-6" id="animals-mini-dashboard">
        <div className="col-span-2 sm:col-span-1 bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Populasi Satwa</span>
            <p className="text-sm sm:text-xl font-extrabold text-slate-900 mt-0.5 sm:mt-1 truncate">{totalCount} Ekor terdaftar</p>
          </div>
          <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl shrink-0">
            <Heart className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] fill-emerald-500 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Isu Kesehatan</span>
            <p className="text-sm sm:text-xl font-extrabold text-rose-600 mt-0.5 sm:mt-1 truncate">
              {sickCount} Sakit/Rawat
            </p>
          </div>
          <div className="p-2 sm:p-3 bg-rose-50 text-rose-600 rounded-lg sm:rounded-xl shrink-0">
            <Activity className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Sehat Prima</span>
            <p className="text-sm sm:text-xl font-extrabold text-teal-600 mt-0.5 sm:mt-1 truncate">
              {totalCount - sickCount} ({totalCount ? Math.round(((totalCount - sickCount) / totalCount) * 100) : 100}%)
            </p>
          </div>
          <div className="p-2 sm:p-3 bg-teal-50 text-teal-600 rounded-lg sm:rounded-xl shrink-0">
            <ShieldCheck className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" />
          </div>
        </div>
      </div>

      {/* Rekapitulasi Total Satwa per Lokasi Wahana */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-2.5 sm:space-y-4" id="animals-location-summary">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border-b border-slate-100 pb-2.5 sm:pb-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-teal-50 text-teal-700 rounded-lg sm:rounded-xl shrink-0">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">Total Satwa per Lokasi Wahana</h3>
              <p className="text-[11px] sm:text-xs text-gray-500">Sebaran populasi koleksi satwa di {locationStats.length} lokasi TMII. Klik lokasi untuk memfilter tabel.</p>
            </div>
          </div>
          {locationFilter !== 'Semua' && (
            <button
              onClick={() => setLocationFilter('Semua')}
              className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
            >
              Reset Filter Lokasi ({locationFilter}) &times;
            </button>
          )}
        </div>

        {locationStats.length === 0 ? (
          <div className="text-xs text-gray-400 py-4 text-center">Belum ada data sebaran lokasi satwa.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3.5">
            {locationStats.map(([locName, stats]) => {
              const isSelected = locationFilter === locName;
              return (
                <div
                  key={locName}
                  onClick={() => setLocationFilter(isSelected ? 'Semua' : locName)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected 
                      ? 'border-teal-600 bg-teal-50/50 shadow-sm ring-2 ring-teal-500/20' 
                      : 'border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-sm text-gray-900 line-clamp-1" title={locName}>
                      {locName}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold shrink-0 ${
                      isSelected ? 'bg-teal-700 text-white' : 'bg-slate-900 text-white'
                    }`}>
                      {stats.total} Ekor
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-600 space-y-1">
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-emerald-700">✓ {stats.healthy} Sehat</span>
                      {stats.sick > 0 && (
                        <span className="text-rose-600 font-bold">! {stats.sick} Perawatan</span>
                      )}
                    </div>

                    {/* Breakdown by Type */}
                    <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-200/60 mt-1.5">
                      {Object.entries(stats.types).map(([typeName, count]) => (
                        <span key={typeName} className="px-1.5 py-0.5 bg-white text-slate-700 rounded border border-slate-200 text-[10px] font-semibold">
                          {typeName}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4" id="animals-filter-panel">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center">
          
          <div className="relative sm:col-span-2 md:col-span-3">
            <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari nama, latin, panggilan..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none border border-slate-200/60"
            />
          </div>

          <div className="md:col-span-2">
            <select 
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none border border-slate-200/60 font-medium"
            >
              <option value="Semua">Semua Lokasi</option>
              {uniqueLocationsList.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select 
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none border border-slate-200/60 font-medium"
            >
              <option value="Semua">Semua Jenis</option>
              <option value="Aves">Aves (Burung)</option>
              <option value="Reptil">Reptil</option>
              <option value="Pisces">Pisces (Ikan)</option>
              <option value="Amfibi">Amfibi</option>
              <option value="Mamalia">Mamalia</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select 
              value={genderFilter}
              onChange={e => setGenderFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none border border-slate-200/60 font-medium"
            >
              <option value="Semua">Semua Gender</option>
              <option value="Jantan">Jantan</option>
              <option value="Betina">Betina</option>
              <option value="Belum Teridentifikasi">Belum Teridentifikasi</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select 
              value={healthFilter}
              onChange={e => setHealthFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none border border-slate-200/60 font-medium"
            >
              <option value="Semua">Semua Kesehatan</option>
              <option value="Sehat">Sehat</option>
              <option value="Dalam Perawatan">Dalam Perawatan</option>
              <option value="Sakit">Sakit</option>
              <option value="Karantina">Karantina</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <select 
              value={sortColumn}
              onChange={e => setSortColumn(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none border border-slate-200/60 font-medium"
            >
              <option value="name">Urut: Nama Satwa</option>
              <option value="latinName">Urut: Nama Latin</option>
              <option value="type">Urut: Jenis</option>
              <option value="location">Urut: Lokasi</option>
              <option value="healthStatus">Urut: Kondisi Kesehatan</option>
            </select>
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-gray-500 border border-slate-200/60 shrink-0"
              title="Balikkan Arah Urutan"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.015)] overflow-hidden" id="animals-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th 
                  className="py-4 px-5 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                  onClick={() => {
                    if (sortColumn === 'name') setSortDirection(p => p === 'asc' ? 'desc' : 'asc');
                    else { setSortColumn('name'); setSortDirection('asc'); }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    Nama Satwa
                    <ArrowUpDown size={13} className={sortColumn === 'name' ? 'text-teal-600 font-bold' : 'text-gray-300'} />
                  </div>
                </th>
                <th 
                  className="py-4 px-5 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                  onClick={() => {
                    if (sortColumn === 'latinName') setSortDirection(p => p === 'asc' ? 'desc' : 'asc');
                    else { setSortColumn('latinName'); setSortDirection('asc'); }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    Nama Latin
                    <ArrowUpDown size={13} className={sortColumn === 'latinName' ? 'text-teal-600 font-bold' : 'text-gray-300'} />
                  </div>
                </th>
                <th 
                  className="py-4 px-5 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                  onClick={() => {
                    if (sortColumn === 'type') setSortDirection(p => p === 'asc' ? 'desc' : 'asc');
                    else { setSortColumn('type'); setSortDirection('asc'); }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    Jenis
                    <ArrowUpDown size={13} className={sortColumn === 'type' ? 'text-teal-600 font-bold' : 'text-gray-300'} />
                  </div>
                </th>
                <th 
                  className="py-4 px-5 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                  onClick={() => {
                    if (sortColumn === 'location') setSortDirection(p => p === 'asc' ? 'desc' : 'asc');
                    else { setSortColumn('location'); setSortDirection('asc'); }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    Lokasi & Detail
                    <ArrowUpDown size={13} className={sortColumn === 'location' ? 'text-teal-600 font-bold' : 'text-gray-300'} />
                  </div>
                </th>
                <th className="py-4 px-5">Jenis Kelamin</th>
                <th className="py-4 px-5">Kondisi Kesehatan</th>
                <th className="py-4 px-5">Panggilan / Kode Khusus</th>
                <th className="py-4 px-5">Keterangan</th>
                <th className="py-4 px-5">Log Registrasi</th>
                <th className="py-4 px-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {paginatedAnimals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    Tidak ada data satwa yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedAnimals.map(animal => (
                  <tr key={animal.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* 1. Nama Satwa */}
                    <td className="py-4 px-5">
                      <div className="font-bold text-gray-900">{animal.name}</div>
                    </td>

                    {/* 2. Nama Latin */}
                    <td className="py-4 px-5 text-xs">
                      <span className="italic font-medium text-slate-700">{animal.latinName || animal.species || '-'}</span>
                    </td>

                    {/* 3. Jenis */}
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                        animal.type === 'Aves' ? 'bg-amber-50 text-amber-800 border border-amber-200/60' :
                        animal.type === 'Reptil' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' :
                        animal.type === 'Pisces' ? 'bg-cyan-50 text-cyan-800 border border-cyan-200/60' :
                        animal.type === 'Amfibi' ? 'bg-teal-50 text-teal-800 border border-teal-200/60' :
                        'bg-purple-50 text-purple-800 border border-purple-200/60'
                      }`}>
                        {animal.type || 'Aves'}
                      </span>
                    </td>

                    {/* 4. Lokasi & Detail */}
                    <td className="py-4 px-5 text-xs">
                      <div className="font-semibold text-gray-800 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span>{animal.location || '-'}</span>
                      </div>
                      {animal.locationDetail && (
                        <div className="text-gray-500 text-[11px] mt-0.5 pl-4">
                          {animal.locationDetail}
                        </div>
                      )}
                    </td>

                    {/* 5. Jenis Kelamin */}
                    <td className="py-4 px-5 text-xs font-medium text-gray-700">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                        animal.gender === 'Jantan' ? 'bg-blue-50 text-blue-700 font-semibold' :
                        animal.gender === 'Betina' ? 'bg-pink-50 text-pink-700 font-semibold' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {animal.gender || 'Belum Teridentifikasi'}
                      </span>
                    </td>

                    {/* 6. Kondisi Kesehatan */}
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        (animal.healthStatus || 'Sehat') === 'Sehat' ? 'bg-emerald-50 text-emerald-700' :
                        animal.healthStatus === 'Dalam Perawatan' ? 'bg-amber-50 text-amber-700' :
                        animal.healthStatus === 'Karantina' ? 'bg-blue-50 text-blue-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          (animal.healthStatus || 'Sehat') === 'Sehat' ? 'bg-emerald-500' :
                          animal.healthStatus === 'Dalam Perawatan' ? 'bg-amber-500' :
                          animal.healthStatus === 'Karantina' ? 'bg-blue-500' :
                          'bg-rose-500'
                        }`} />
                        {animal.healthStatus || 'Sehat'}
                      </span>
                    </td>

                    {/* 7. Nama Panggilan / Kode Khusus */}
                    <td className="py-4 px-5 text-xs">
                      {animal.nicknameOrCode || animal.code ? (
                        <span className="font-mono bg-slate-100 text-slate-800 px-2 py-1 rounded font-semibold">
                          {animal.nicknameOrCode || animal.code}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal">-</span>
                      )}
                    </td>

                    {/* 8. Keterangan */}
                    <td className="py-4 px-5 text-xs text-gray-600 max-w-[200px]">
                      <div className="truncate" title={animal.notes}>
                        {animal.notes || <span className="text-gray-400 italic">Tidak ada</span>}
                      </div>
                    </td>

                    {/* Log Registrasi */}
                    <td className="py-4 px-5 text-xs">
                      <div className="font-semibold text-slate-800 truncate" title={animal.createdByName || animal.createdBy || 'Staf TMII'}>
                        {animal.createdByName || (animal.createdBy ? animal.createdBy.split('@')[0] : 'Staf TMII')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {animal.createdAt ? new Date(animal.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                    </td>

                    {/* 9. Aksi */}
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(animal)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title={isAdmin ? "Edit Satwa" : "Lihat Detail"}
                        >
                          <Edit size={16} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(animal.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Satwa"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50">
            <div className="text-xs text-gray-500 font-medium">
              Menampilkan {Math.min(sortedAnimals.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(sortedAnimals.length, currentPage * itemsPerPage)} dari {sortedAnimals.length} data
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-semibold bg-white rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Sebelumnya
              </button>
              <span className="text-xs font-semibold text-gray-700">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-semibold bg-white rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Animal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs" id="animal-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="p-6 flex justify-between items-center bg-gray-50/50 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingAnimal ? (isAdmin ? 'Edit Data Satwa Wahana' : 'Detail Data Satwa') : 'Registrasi Satwa Baru'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Field bertanda <span className="text-red-500 font-bold">*</span> wajib diisi</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Registration Log Banner */}
              {editingAnimal && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <UserCheck size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Diregistrasi oleh: <span className="text-blue-700 font-extrabold">{editingAnimal.createdByName || editingAnimal.createdBy || 'Staf TMII'}</span>
                        </span>
                        {editingAnimal.createdBy && editingAnimal.createdByName && (
                          <span className="text-[11px] text-slate-500 font-mono">({editingAnimal.createdBy})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5 font-medium">
                        <Clock size={12} className="text-slate-400" />
                        <span>Waktu Registrasi: {editingAnimal.createdAt ? new Date(editingAnimal.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Tidak tercatat'}</span>
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    Log Sistem
                  </span>
                </div>
              )}
              <fieldset disabled={editingAnimal !== null && !isAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Nama Satwa (Mandatory) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Nama Satwa <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Contoh: Elang Bondol / Gajah Sumatera"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                  />
                </div>

                {/* 2. Nama Latin (Mandatory) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Nama Latin <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formLatinName}
                    onChange={e => setFormLatinName(e.target.value)}
                    placeholder="Contoh: Haliastur indus"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium italic"
                  />
                </div>

                {/* 3. Jenis (Mandatory: Aves, Reptil, Pisces, Amfibi, Mamalia) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Jenis <span className="text-red-500">*</span>
                  </label>
                  <select 
                    required
                    value={formType}
                    onChange={e => setFormType(e.target.value as AnimalAsset['type'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                  >
                    <option value="Aves">Aves (Burung / Unggas)</option>
                    <option value="Reptil">Reptil</option>
                    <option value="Pisces">Pisces (Ikan)</option>
                    <option value="Amfibi">Amfibi</option>
                    <option value="Mamalia">Mamalia</option>
                  </select>
                </div>

                {/* 4. Lokasi (Mandatory) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Lokasi <span className="text-red-500">*</span>
                  </label>
                  <LocationAutoComplete
                    value={formLocation}
                    onChange={(val) => setFormLocation(val)}
                    locations={configuredLocations}
                    placeholder="Contoh: Taman Burung / Taman Satwa"
                  />
                </div>

                {/* 5. Detail Lokasi (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Detail Lokasi <span className="text-gray-400 font-normal lowercase">(opsional)</span>
                  </label>
                  <input 
                    type="text" 
                    value={formLocationDetail}
                    onChange={e => setFormLocationDetail(e.target.value)}
                    placeholder="Contoh: Kandang Kubah Barat, Paddock 2"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>

                {/* 6. Jenis Kelamin (Optional: Jantan, Betina, Belum Teridentifikasi) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Jenis Kelamin <span className="text-gray-400 font-normal lowercase">(opsional)</span>
                  </label>
                  <select 
                    value={formGender}
                    onChange={e => setFormGender(e.target.value as NonNullable<AnimalAsset['gender']>)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                  >
                    <option value="Jantan">Jantan</option>
                    <option value="Betina">Betina</option>
                    <option value="Belum Teridentifikasi">Belum Teridentifikasi</option>
                  </select>
                </div>

                {/* 7. Kondisi Kesehatan (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Kondisi Kesehatan <span className="text-gray-400 font-normal lowercase">(opsional)</span>
                  </label>
                  <select 
                    value={formHealthStatus}
                    onChange={e => setFormHealthStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                  >
                    <option value="Sehat">Sehat</option>
                    <option value="Dalam Perawatan">Dalam Perawatan</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Karantina">Karantina</option>
                  </select>
                </div>

                {/* 8. Nama Panggilan / Kode Khusus (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Nama Panggilan / Kode Khusus <span className="text-gray-400 font-normal lowercase">(opsional)</span>
                  </label>
                  <input 
                    type="text" 
                    value={formNicknameOrCode}
                    onChange={e => setFormNicknameOrCode(e.target.value)}
                    placeholder="Contoh: Bimo / EB-001"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>

                {/* 9. Keterangan (Optional) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Keterangan <span className="text-gray-400 font-normal lowercase">(opsional)</span>
                  </label>
                  <textarea 
                    rows={3}
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Catatan tambahan mengenai perilaku, instruksi perawatan khusus, dsb."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
              </div>

              </fieldset>

              {/* Footer */}
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  {(!editingAnimal || isAdmin) ? 'Batal' : 'Tutup'}
                </button>
                {(!editingAnimal || isAdmin) && (
                  <button 
                    type="submit"
                    className="px-5 py-2 text-white font-semibold rounded-xl text-sm shadow-md transition-colors cursor-pointer"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {editingAnimal ? 'Simpan Perubahan' : 'Registrasi Satwa'}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
