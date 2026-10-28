import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  AlertTriangle,
  FlameKindling,
  Wrench,
  Zap,
  Droplet,
  MapPin,
  CalendarDays,
  ArrowUpDown,
  UserCheck,
  Clock
} from 'lucide-react';
import { MepAsset, AppTheme, ConfiguredLocation, DEFAULT_ASSET_LOCATIONS, TmiiRegionName } from '../types';
import { exportToExcel } from '../lib/excel';
import ImportDataPanel from './ImportDataPanel';
import LocationAutoComplete from './LocationAutoComplete';

interface MepAssetsProps {
  meps: MepAsset[];
  onAddMep: (mep: Omit<MepAsset, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateMep: (id: string, mep: Partial<MepAsset>) => Promise<void>;
  onDeleteMep: (id: string) => Promise<void>;
  configuredLocations?: ConfiguredLocation[];
  isAdmin?: boolean;
  theme: AppTheme;
}

export default function MepAssets({
  meps,
  onAddMep,
  onUpdateMep,
  onDeleteMep,
  configuredLocations = [],
  isAdmin = true,
  theme
}: MepAssetsProps) {
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
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Sorting & Pagination States
  const [sortColumn, setSortColumn] = useState<string>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMep, setEditingMep] = useState<MepAsset | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<MepAsset['category']>('Mechanical');
  const [formBrand, setFormBrand] = useState('');
  const [formCapacity, setFormCapacity] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formStatus, setFormStatus] = useState<MepAsset['status']>('Normal');
  const [formLastMaintenance, setFormLastMaintenance] = useState('');
  const [formNextMaintenance, setFormNextMaintenance] = useState('');
  const [formMaintenanceFrequency, setFormMaintenanceFrequency] = useState<MepAsset['maintenanceFrequency']>('Bulanan');
  const [formNotes, setFormNotes] = useState('');

  // Reset page when filter or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, sortColumn, sortDirection]);

  const resetForm = () => {
    setEditingMep(null);
    setFormCode('');
    setFormName('');
    setFormCategory('Mechanical');
    setFormBrand('');
    setFormCapacity('');
    setFormLocation('');
    setFormStatus('Normal');
    setFormLastMaintenance('');
    setFormNextMaintenance('');
    setFormMaintenanceFrequency('Bulanan');
    setFormNotes('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    const nextNum = String(meps.length + 1).padStart(3, '0');
    setFormCode(`TMII-MEP-${nextNum}`);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (mep: MepAsset) => {
    setEditingMep(mep);
    setFormCode(mep.code);
    setFormName(mep.name);
    setFormCategory(mep.category);
    setFormBrand(mep.brand);
    setFormCapacity(mep.capacity);
    setFormLocation(mep.location);
    setFormStatus(mep.status);
    setFormLastMaintenance(mep.lastMaintenance || '');
    setFormNextMaintenance(mep.nextMaintenance || '');
    setFormMaintenanceFrequency(mep.maintenanceFrequency);
    setFormNotes(mep.notes || '');
    setIsModalOpen(true);
  };

  const handleLastMaintenanceChange = (val: string, freq: MepAsset['maintenanceFrequency']) => {
    setFormLastMaintenance(val);
    if (val) {
      const date = new Date(val);
      if (freq === 'Mingguan') {
        date.setDate(date.getDate() + 7);
      } else if (freq === 'Bulanan') {
        date.setMonth(date.getMonth() + 1);
      } else if (freq === 'Triwulanan') {
        date.setMonth(date.getMonth() + 3);
      } else {
        date.setFullYear(date.getFullYear() + 1);
      }
      setFormNextMaintenance(date.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim() || !formLocation.trim()) {
      alert('Kode MEP, Nama Perangkat, dan Lokasi wajib diisi.');
      return;
    }

    const mepPayload = {
      code: formCode,
      name: formName,
      category: formCategory,
      brand: formBrand,
      capacity: formCapacity,
      location: formLocation,
      status: formStatus,
      lastMaintenance: formLastMaintenance,
      nextMaintenance: formNextMaintenance,
      maintenanceFrequency: formMaintenanceFrequency,
      notes: formNotes
    };

    try {
      if (editingMep) {
        await onUpdateMep(editingMep.id, mepPayload);
      } else {
        await onAddMep(mepPayload);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(`Gagal menyimpan data MEP: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus perangkat MEP ini dari database?')) {
      try {
        await onDeleteMep(id);
      } catch (err: any) {
        alert(`Gagal menghapus perangkat MEP: ${err.message}`);
      }
    }
  };

  const handleExport = () => {
    const exportData = meps.map(m => ({
      'ID MEP': m.id,
      'Kode MEP': m.code,
      'Nama Perangkat': m.name,
      'Kategori': m.category,
      'Merek': m.brand,
      'Kapasitas': m.capacity,
      'Lokasi': m.location,
      'Status': m.status,
      'Pemeriksaan Terakhir': m.lastMaintenance || '',
      'Pemeriksaan Berikutnya': m.nextMaintenance || '',
      'Frekuensi Servis': m.maintenanceFrequency,
      'Catatan': m.notes || '',
      'Tanggal Input': m.createdAt
    }));
    exportToExcel(exportData, 'Database_MEP_TMII', 'MEP');
  };

  // Filter MEP
  const filteredMeps = meps.filter(mep => {
    const matchesSearch = 
      mep.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mep.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mep.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'Semua' || mep.category === categoryFilter;
    const matchesStatus = statusFilter === 'Semua' || mep.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort MEP
  const sortedMeps = [...filteredMeps].sort((a, b) => {
    let valA = a[sortColumn as keyof MepAsset] || '';
    let valB = b[sortColumn as keyof MepAsset] || '';

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination Slice
  const totalPages = Math.ceil(sortedMeps.length / itemsPerPage) || 1;
  const paginatedMeps = sortedMeps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalCount = meps.length;
  const troubleCount = meps.filter(m => m.status === 'Bermasalah' || m.status === 'Mati Total').length;

  return (
    <div className="space-y-6" id="mep-module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="mep-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Database Utilitas MEP</h1>
          <p className="text-sm text-gray-500">Kelola fasilitas Mechanical, Electrical, dan Plumbing di seluruh gedung/wahana TMII</p>
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
              id="btn-import-meps-toggle"
            >
              <FileSpreadsheet size={18} className={isImportOpen ? 'text-white' : 'text-slate-500'} />
              <span>Import Excel/CSV</span>
            </button>
          )}
          <button 
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
            id="btn-export-mep"
          >
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-colors cursor-pointer"
            style={{ backgroundColor: theme.primaryColor }}
            id="btn-add-mep"
          >
            <Plus size={18} />
            <span>Registrasi MEP</span>
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
              type="mep"
              onImport={async (parsedRows) => {
                for (const row of parsedRows) {
                  await onAddMep(row);
                }
                setIsImportOpen(false);
              }}
              onClose={() => setIsImportOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* MEP Summary Status Cards - completely borderless */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" id="mep-summary">
        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Unit Utilitas</span>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{totalCount} Perangkat aktif</p>
          </div>
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
            <Settings size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Unit Bermasalah</span>
            <p className="text-xl font-extrabold text-rose-600 mt-1">{troubleCount} Unit kendala</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Kondisi Normal</span>
            <p className="text-xl font-extrabold text-emerald-600 mt-1">
              {totalCount - troubleCount} Unit ({totalCount ? Math.round(((totalCount - troubleCount) / totalCount) * 100) : 100}%)
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Panel - completely borderless */}
      <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4" id="mep-filter-panel">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          <div className="relative md:col-span-4">
            <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari kode, nama, lokasi..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <select 
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Electrical">Electrical</option>
              <option value="Plumbing">Plumbing</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            >
              <option value="Semua">Semua Status</option>
              <option value="Normal">Normal</option>
              <option value="Bermasalah">Bermasalah</option>
              <option value="Mati Total">Mati Total</option>
              <option value="Service">Service</option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 shrink-0 uppercase tracking-wider">Urutkan:</span>
            <select 
              value={sortColumn}
              onChange={e => setSortColumn(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            >
              <option value="code">Kode MEP</option>
              <option value="name">Nama Perangkat</option>
              <option value="category">Kategori</option>
              <option value="brand">Merek</option>
              <option value="location">Lokasi</option>
              <option value="status">Status</option>
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

      {/* MEP Table - completely borderless wrapper */}
      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.015)] overflow-hidden" id="mep-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Identitas MEP</th>
                <th className="py-4 px-6">Kategori</th>
                <th className="py-4 px-6">Merk & Kapasitas</th>
                <th className="py-4 px-6">Lokasi / Gedung</th>
                <th className="py-4 px-6">Status Operasional</th>
                <th className="py-4 px-6">Jadwal Perawatan Berkala</th>
                <th className="py-4 px-6">Log Registrasi</th>
                <th className="py-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {paginatedMeps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Tidak ada perangkat MEP yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedMeps.map(mep => (
                  <tr key={mep.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div 
                          className="font-mono text-xs font-bold inline-block px-2 py-0.5 rounded-md mb-1"
                          style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}
                        >
                          {mep.code}
                        </div>
                        <div className="font-semibold text-gray-900">{mep.name}</div>
                        {mep.notes && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1 italic">Catatan: {mep.notes}</div>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        mep.category === 'Mechanical' ? 'bg-orange-50 text-orange-700' :
                        mep.category === 'Electrical' ? 'bg-blue-50 text-blue-700' :
                        'bg-teal-50 text-teal-700'
                      }`}>
                        {mep.category === 'Mechanical' && <Wrench size={12} />}
                        {mep.category === 'Electrical' && <Zap size={12} />}
                        {mep.category === 'Plumbing' && <Droplet size={12} />}
                        {mep.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-600">
                      <div className="font-semibold text-gray-800">{mep.brand || 'Tanpa Merk'}</div>
                      <div className="text-gray-500 mt-0.5 font-medium">Kapasitas: {mep.capacity || 'Tidak terinci'}</div>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} className="text-gray-400" />
                        <span>{mep.location}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        mep.status === 'Normal' ? 'bg-emerald-50 text-emerald-700' :
                        mep.status === 'Service' ? 'bg-blue-50 text-blue-700' :
                        mep.status === 'Bermasalah' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {mep.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-500">
                      <div>Servis terakhir: {mep.lastMaintenance || '-'}</div>
                      <div className="text-gray-900 font-semibold mt-1 text-[11px] flex items-center gap-1">
                        <CalendarDays size={12} style={{ color: theme.primaryColor }} />
                        <span>Berikutnya: {mep.nextMaintenance || '-'} ({mep.maintenanceFrequency})</span>
                      </div>
                    </td>
                    {/* Log Registrasi */}
                    <td className="py-4 px-6 text-xs">
                      <div className="font-semibold text-slate-800 truncate" title={mep.createdByName || mep.createdBy || 'Staf TMII'}>
                        {mep.createdByName || (mep.createdBy ? mep.createdBy.split('@')[0] : 'Staf TMII')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {mep.createdAt ? new Date(mep.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(mep)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title={isAdmin ? "Edit MEP" : "Lihat Detail"}
                        >
                          <Edit size={16} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(mep.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus MEP"
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
              Menampilkan {Math.min(sortedMeps.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(sortedMeps.length, currentPage * itemsPerPage)} dari {sortedMeps.length} data
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

      {/* Add / Edit MEP Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs" id="mep-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="p-6 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">
                {editingMep ? (isAdmin ? 'Perbarui Data MEP' : 'Detail Data MEP') : 'Registrasi Perangkat MEP Baru'}
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
              {/* Registration Log Banner */}
              {editingMep && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <UserCheck size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Diregistrasi oleh: <span className="text-blue-700 font-extrabold">{editingMep.createdByName || editingMep.createdBy || 'Staf TMII'}</span>
                        </span>
                        {editingMep.createdBy && editingMep.createdByName && (
                          <span className="text-[11px] text-slate-500 font-mono">({editingMep.createdBy})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5 font-medium">
                        <Clock size={12} className="text-slate-400" />
                        <span>Waktu Registrasi: {editingMep.createdAt ? new Date(editingMep.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Tidak tercatat'}</span>
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    Log Sistem
                  </span>
                </div>
              )}
              <fieldset disabled={editingMep !== null && !isAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Kode MEP *</label>
                  <input 
                    type="text" 
                    required
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    placeholder="Contoh: TMII-MEP-001"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nama Perangkat *</label>
                  <input 
                    type="text" 
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Contoh: AC Central Ruang Rapat"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Kategori MEP</label>
                  <select 
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as MepAsset['category'])}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Lokasi Gedung / Penempatan * <span className="normal-case font-normal text-[11px] text-amber-800">(Fitur Auto-fill Ketik / Pilih)</span>
                  </label>
                  <LocationAutoComplete
                    value={formLocation}
                    onChange={(val) => setFormLocation(val)}
                    locations={configuredLocations}
                    placeholder="Ketik atau pilih lokasi MEP..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Merk Perangkat</label>
                  <input 
                    type="text" 
                    value={formBrand}
                    onChange={e => setFormBrand(e.target.value)}
                    placeholder="Contoh: Daikin / Schneider"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Kapasitas Alat</label>
                  <input 
                    type="text" 
                    value={formCapacity}
                    onChange={e => setFormCapacity(e.target.value)}
                    placeholder="Contoh: 5 PK, 3 Phase, 220V"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Status Operasional</label>
                  <select 
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as MepAsset['status'])}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Bermasalah">Bermasalah</option>
                    <option value="Mati Total">Mati Total</option>
                    <option value="Service">Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Frekuensi Servis Berkala</label>
                  <select 
                    value={formMaintenanceFrequency}
                    onChange={e => setFormMaintenanceFrequency(e.target.value as MepAsset['maintenanceFrequency'])}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="Bulanan">Bulanan</option>
                    <option value="Tiga Bulanan">Tiga Bulanan</option>
                    <option value="Enam Bulanan">Enam Bulanan</option>
                    <option value="Tahunan">Tahunan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Pemeliharaan Terakhir (Manual)
                  </label>
                  <input 
                    type="date" 
                    value={formLastMaintenance}
                    onChange={e => handleLastMaintenanceChange(e.target.value, formMaintenanceFrequency)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Pemeliharaan Berikutnya (Otomatis Sesuai Frekuensi)
                  </label>
                  <input 
                    type="date" 
                    value={formNextMaintenance}
                    onChange={e => setFormNextMaintenance(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Catatan Tambahan & Hambatan</label>
                  <textarea 
                    rows={3}
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Contoh: Sering drop tegangan, memerlukan stabilizer tambahan..."
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
                  {(!editingMep || isAdmin) ? 'Batal' : 'Tutup'}
                </button>
                {(!editingMep || isAdmin) && (
                  <button 
                    type="submit"
                    className="px-5 py-2 text-white font-semibold rounded-xl text-sm shadow-md transition-colors cursor-pointer"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {editingMep ? 'Simpan Perubahan' : 'Registrasi MEP'}
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
