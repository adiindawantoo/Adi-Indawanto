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
  Calendar,
  ArrowUpDown
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

  const regionsList: TmiiRegionName[] = ['Wilayah Utara', 'Wilayah Selatan', 'Wilayah Barat', 'Wilayah Timur', 'Wilayah Pusat'];
  const [searchTerm, setSearchTerm] = useState('');
  const [healthFilter, setHealthFilter] = useState('Semua');
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Sorting & Pagination States
  const [sortColumn, setSortColumn] = useState<string>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<AnimalAsset | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formSpecies, setFormSpecies] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formHealthStatus, setFormHealthStatus] = useState<AnimalAsset['healthStatus']>('Sehat');
  const [formLastCheckup, setFormLastCheckup] = useState('');
  const [formNextCheckup, setFormNextCheckup] = useState('');
  const [formDiet, setFormDiet] = useState('');
  const [formMedicalHistory, setFormMedicalHistory] = useState('');

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, healthFilter, sortColumn, sortDirection]);

  const resetForm = () => {
    setEditingAnimal(null);
    setFormCode('');
    setFormName('');
    setFormSpecies('');
    setFormLocation('');
    setFormHealthStatus('Sehat');
    setFormLastCheckup('');
    setFormNextCheckup('');
    setFormDiet('');
    setFormMedicalHistory('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    const nextNum = String(animals.length + 1).padStart(3, '0');
    setFormCode(`TMII-STW-${nextNum}`);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (animal: AnimalAsset) => {
    setEditingAnimal(animal);
    setFormCode(animal.code);
    setFormName(animal.name);
    setFormSpecies(animal.species);
    setFormLocation(animal.location);
    setFormHealthStatus(animal.healthStatus);
    setFormLastCheckup(animal.lastCheckup || '');
    setFormNextCheckup(animal.nextCheckup || '');
    setFormDiet(animal.diet || '');
    setFormMedicalHistory(animal.medicalHistory || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim() || !formSpecies.trim()) {
      alert('Kode Satwa, Nama Satwa, dan Spesies wajib diisi.');
      return;
    }

    const animalPayload = {
      code: formCode,
      name: formName,
      species: formSpecies,
      location: formLocation,
      healthStatus: formHealthStatus,
      lastCheckup: formLastCheckup,
      nextCheckup: formNextCheckup,
      diet: formDiet,
      medicalHistory: formMedicalHistory
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
    if (window.confirm('Apakah Anda yakin ingin menghapus satwa ini dari database?')) {
      try {
        await onDeleteAnimal(id);
      } catch (err: any) {
        alert(`Gagal menghapus data satwa: ${err.message}`);
      }
    }
  };

  const handleExport = () => {
    const exportData = animals.map(a => ({
      'ID Satwa': a.id,
      'Kode Satwa': a.code,
      'Nama Satwa': a.name,
      'Spesies': a.species,
      'Lokasi Kandang': a.location,
      'Status Kesehatan': a.healthStatus,
      'Nutrisi & Pola Makan': a.diet || '',
      'Pemeriksaan Terakhir': a.lastCheckup || '',
      'Pemeriksaan Berikutnya': a.nextCheckup || '',
      'Histori Perawatan Medis': a.medicalHistory || '',
      'Tanggal Registrasi': a.createdAt
    }));
    exportToExcel(exportData, 'Database_Satwa_TMII', 'Satwa');
  };

  // Filter Satwa
  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = 
      animal.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesHealth = healthFilter === 'Semua' || animal.healthStatus === healthFilter;

    return matchesSearch && matchesHealth;
  });

  // Sort Satwa
  const sortedAnimals = [...filteredAnimals].sort((a, b) => {
    let valA = a[sortColumn as keyof AnimalAsset] || '';
    let valB = b[sortColumn as keyof AnimalAsset] || '';

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
    <div className="space-y-6" id="animals-module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="animals-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Database Satwa Wahana</h1>
          <p className="text-sm text-gray-500">Rekam medis, jadwal kontrol kesehatan rutin, dan pengelolaan nutrisi satwa TMII</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <button 
              onClick={() => setIsImportOpen(!isImportOpen)}
              className={`inline-flex items-center gap-2 font-semibold py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer border border-transparent ${
                isImportOpen 
                  ? 'text-white' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 shadow-sm'
              }`}
              style={{ backgroundColor: isImportOpen ? theme.primaryColor : undefined }}
              id="btn-import-animals-toggle"
            >
              <FileSpreadsheet size={18} className={isImportOpen ? 'text-white' : 'text-slate-500'} />
              <span>Import Excel/CSV</span>
            </button>
          )}
          <button 
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
            id="btn-export-animals"
          >
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
          {isAdmin && (
            <button 
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-colors cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
              id="btn-add-animal"
            >
              <Plus size={18} />
              <span>Registrasi Satwa</span>
            </button>
          )}
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

      {/* Mini Dashboard Pelaporan - completely borderless */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" id="animals-mini-dashboard">
        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Populasi Satwa</span>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{totalCount} Ekor terdaftar</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Heart size={22} className="fill-emerald-500 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Isu Kesehatan</span>
            <p className="text-xl font-extrabold text-rose-600 mt-1">
              {sickCount} Satwa Sakit / Rawat
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Activity size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Kondisi Sehat Prima</span>
            <p className="text-xl font-extrabold text-teal-600 mt-1">
              {totalCount - sickCount} Ekor ({totalCount ? Math.round(((totalCount - sickCount) / totalCount) * 100) : 100}%)
            </p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <ShieldCheck size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Panel - completely borderless */}
      <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4" id="animals-filter-panel">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          <div className="relative md:col-span-4">
            <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari kode, nama satwa, spesies..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <select 
              value={healthFilter}
              onChange={e => setHealthFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            >
              <option value="Semua">Semua Status Kesehatan</option>
              <option value="Sehat">Sehat</option>
              <option value="Dalam Perawatan">Dalam Perawatan</option>
              <option value="Sakit">Sakit</option>
              <option value="Karantina">Karantina</option>
            </select>
          </div>

          <div className="md:col-span-5 flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 shrink-0 uppercase tracking-wider">Urutkan:</span>
            <select 
              value={sortColumn}
              onChange={e => setSortColumn(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            >
              <option value="code">Kode Satwa</option>
              <option value="name">Nama Satwa</option>
              <option value="species">Spesies / Jenis</option>
              <option value="location">Lokasi Kandang</option>
              <option value="healthStatus">Status Kesehatan</option>
            </select>
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-gray-500"
              title="Balikkan Arah Urutan"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

        </div>
      </div>

      {/* Asset Table - completely borderless wrapper */}
      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.015)] overflow-hidden" id="animals-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Kode & Nama Satwa</th>
                <th className="py-4 px-6">Spesies & Kandang</th>
                <th className="py-4 px-6">Diet / Pola Nutrisi</th>
                <th className="py-4 px-6">Status Kesehatan</th>
                <th className="py-4 px-6">Kontrol Medis (Dokter)</th>
                <th className="py-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {paginatedAnimals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    Tidak ada data satwa yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedAnimals.map(animal => (
                  <tr key={animal.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div 
                          className="font-mono text-xs font-bold inline-block px-2 py-0.5 rounded-md mb-1"
                          style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}
                        >
                          {animal.code}
                        </div>
                        <div className="font-semibold text-gray-900">{animal.name}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-600">
                      <div className="font-medium text-gray-800">{animal.species}</div>
                      <div className="text-gray-500 mt-1 flex items-center gap-1">
                        <Stethoscope size={11} className="text-slate-400" />
                        <span>Kandang: {animal.location || 'Tidak spesifik'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-600">
                      <div className="max-w-[240px] truncate" title={animal.diet}>
                        {animal.diet ? (
                          <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-700 font-medium">{animal.diet}</span>
                        ) : (
                          <span className="text-gray-400">Diet belum diinput</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        animal.healthStatus === 'Sehat' ? 'bg-emerald-50 text-emerald-700' :
                        animal.healthStatus === 'Dalam Perawatan' ? 'bg-amber-50 text-amber-700' :
                        animal.healthStatus === 'Karantina' ? 'bg-blue-50 text-blue-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          animal.healthStatus === 'Sehat' ? 'bg-emerald-500' :
                          animal.healthStatus === 'Dalam Perawatan' ? 'bg-amber-500' :
                          animal.healthStatus === 'Karantina' ? 'bg-blue-500' :
                          'bg-red-500'
                        }`} />
                        {animal.healthStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-600">
                      <div className="flex items-center gap-1 text-gray-400">
                        <Calendar size={12} />
                        <span>Pengecekan: {animal.lastCheckup || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 font-semibold text-rose-700">
                        <Stethoscope size={12} />
                        <span>Kontrol: {animal.nextCheckup || '-'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
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
            <div className="p-6 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">
                {editingAnimal ? (isAdmin ? 'Perbarui Data Rekam Medis Satwa' : 'Detail Rekam Medis Satwa') : 'Registrasi Satwa Baru'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <fieldset disabled={!isAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Kode Satwa / Register *</label>
                  <input 
                    type="text" 
                    required
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    placeholder="Contoh: TMII-STW-001"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nama Satwa *</label>
                  <input 
                    type="text" 
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Contoh: Rambo / Koko"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Spesies / Jenis Satwa *</label>
                  <input 
                    type="text" 
                    required
                    value={formSpecies}
                    onChange={e => setFormSpecies(e.target.value)}
                    placeholder="Contoh: Burung Elang Bondol"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Lokasi Wahana / Kandang <span className="normal-case font-normal text-[11px] text-amber-800">(Fitur Auto-fill Ketik / Pilih)</span>
                  </label>
                  <LocationAutoComplete
                    value={formLocation}
                    onChange={(val) => setFormLocation(val)}
                    locations={configuredLocations}
                    placeholder="Ketik atau pilih lokasi kandang satwa..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Status Kesehatan *</label>
                  <select 
                    value={formHealthStatus}
                    onChange={e => setFormHealthStatus(e.target.value as AnimalAsset['healthStatus'])}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="Sehat">Sehat</option>
                    <option value="Dalam Perawatan">Dalam Perawatan</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Karantina">Karantina</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Diet / Pola Nutrisi</label>
                  <input 
                    type="text" 
                    value={formDiet}
                    onChange={e => setFormDiet(e.target.value)}
                    placeholder="Contoh: Ikan segar 1kg, 2x sehari"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tanggal Cek Medis Terakhir</label>
                  <input 
                    type="date" 
                    value={formLastCheckup}
                    onChange={e => setFormLastCheckup(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tanggal Kontrol Berikutnya</label>
                  <input 
                    type="date" 
                    value={formNextCheckup}
                    onChange={e => setFormNextCheckup(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Histori Perawatan / Riwayat Medis</label>
                  <textarea 
                    rows={4}
                    value={formMedicalHistory}
                    onChange={e => setFormMedicalHistory(e.target.value)}
                    placeholder="Keterangan keluhan sakit, obat yang diberikan, vitamin tambahan, catatan dokter hewan..."
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>
              </div>

              </fieldset>

              {/* Footer */}
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  {isAdmin ? 'Batal' : 'Tutup'}
                </button>
                {isAdmin && (
                  <button 
                    type="submit"
                    className="px-5 py-2 text-white font-semibold rounded-xl text-sm shadow-md transition-colors cursor-pointer"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {editingAnimal ? 'Simpan Rekam Medis' : 'Registrasi Satwa'}
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
