import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  FileSpreadsheet,
  Camera,
  Play,
  XOctagon,
  RefreshCw,
  Cpu,
  MapPin,
  ArrowUpDown,
  UserCheck,
  Clock
} from 'lucide-react';
import { CctvAsset, AppTheme, ConfiguredLocation, DEFAULT_ASSET_LOCATIONS, TmiiRegionName } from '../types';
import { exportToExcel } from '../lib/excel';
import ImportDataPanel from './ImportDataPanel';
import LocationAutoComplete from './LocationAutoComplete';

interface CctvAssetsProps {
  cctvs: CctvAsset[];
  onAddCctv: (cctv: Omit<CctvAsset, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateCctv: (id: string, cctv: Partial<CctvAsset>) => Promise<void>;
  onDeleteCctv: (id: string) => Promise<void>;
  configuredLocations?: ConfiguredLocation[];
  isAdmin?: boolean;
  theme: AppTheme;
}

export default function CctvAssets({
  cctvs,
  onAddCctv,
  onUpdateCctv,
  onDeleteCctv,
  configuredLocations = [],
  isAdmin = true,
  theme
}: CctvAssetsProps) {
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
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Sorting & Pagination States
  const [sortColumn, setSortColumn] = useState<string>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCctv, setEditingCctv] = useState<CctvAsset | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formStatus, setFormStatus] = useState<CctvAsset['status']>('Aktif');
  const [formIpAddress, setFormIpAddress] = useState('');
  const [formLastMaintenance, setFormLastMaintenance] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Reset page when filter or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortColumn, sortDirection]);

  const resetForm = () => {
    setEditingCctv(null);
    setFormCode('');
    setFormName('');
    setFormLocation('');
    setFormBrand('');
    setFormStatus('Aktif');
    setFormIpAddress('');
    setFormLastMaintenance('');
    setFormNotes('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    const nextNum = String(cctvs.length + 1).padStart(3, '0');
    setFormCode(`TMII-CCTV-${nextNum}`);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cctv: CctvAsset) => {
    setEditingCctv(cctv);
    setFormCode(cctv.code);
    setFormName(cctv.name);
    setFormLocation(cctv.location);
    setFormBrand(cctv.brand);
    setFormStatus(cctv.status);
    setFormIpAddress(cctv.ipAddress || '');
    setFormLastMaintenance(cctv.lastMaintenance || '');
    setFormNotes(cctv.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim() || !formLocation.trim()) {
      alert('Kode CCTV, Nama Kamera, dan Lokasi wajib diisi.');
      return;
    }

    const cctvPayload = {
      code: formCode,
      name: formName,
      location: formLocation,
      brand: formBrand,
      status: formStatus,
      ipAddress: formIpAddress,
      lastMaintenance: formLastMaintenance,
      notes: formNotes
    };

    try {
      if (editingCctv) {
        await onUpdateCctv(editingCctv.id, cctvPayload);
      } else {
        await onAddCctv(cctvPayload);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(`Gagal menyimpan data CCTV: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus kamera CCTV ini?')) {
      try {
        await onDeleteCctv(id);
      } catch (err: any) {
        alert(`Gagal menghapus CCTV: ${err.message}`);
      }
    }
  };

  const handleExport = () => {
    const exportData = cctvs.map(c => ({
      'ID CCTV': c.id,
      'Kode Kamera': c.code,
      'Nama Kamera / Zona': c.name,
      'Merek': c.brand,
      'Lokasi Pemasangan': c.location,
      'IP Address': c.ipAddress || '',
      'Status': c.status,
      'Pemeliharaan Terakhir': c.lastMaintenance || '',
      'Catatan': c.notes || '',
      'Tanggal Input': c.createdAt
    }));
    exportToExcel(exportData, 'Database_CCTV_TMII', 'CCTV');
  };

  // Filter CCTV
  const filteredCctvs = cctvs.filter(cctv => {
    const matchesSearch = 
      cctv.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cctv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cctv.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cctv.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'Semua' || cctv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort CCTV
  const sortedCctvs = [...filteredCctvs].sort((a, b) => {
    let valA = a[sortColumn as keyof CctvAsset] || '';
    let valB = b[sortColumn as keyof CctvAsset] || '';

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination Slice
  const totalPages = Math.ceil(sortedCctvs.length / itemsPerPage) || 1;
  const paginatedCctvs = sortedCctvs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalCount = cctvs.length;
  const onlineCount = cctvs.filter(c => c.status === 'Aktif').length;
  const brokenCount = cctvs.filter(c => c.status === 'Rusak' || c.status === 'Mati').length;

  return (
    <div className="space-y-3.5 sm:space-y-6" id="cctv-module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4" id="cctv-header">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight leading-snug">Database CCTV Terpadu</h1>
          <p className="text-[11px] sm:text-sm text-gray-500 mt-0.5 leading-snug">Monitor lokasi kamera, status keaktifan, dan rekam IP perangkat keamanan</p>
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
              id="btn-import-cctvs-toggle"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] shrink-0 ${isImportOpen ? 'text-white' : 'text-slate-500'}`} />
              <span className="truncate">Import Excel/CSV</span>
            </button>
          )}
          <button 
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-[11px] sm:text-sm py-2 px-2.5 sm:py-2 sm:px-4 rounded-lg sm:rounded-xl shadow-xs transition-colors cursor-pointer"
            id="btn-export-cctv"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-emerald-600 shrink-0" />
            <span className="truncate">Ekspor Excel</span>
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 text-white font-semibold text-xs sm:text-sm py-2 px-3 sm:py-2 sm:px-4 rounded-lg sm:rounded-xl shadow-md transition-colors cursor-pointer"
            style={{ backgroundColor: theme.primaryColor }}
            id="btn-add-cctv"
          >
            <Plus className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0" />
            <span>Daftarkan CCTV</span>
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
              type="cctv"
              onImport={async (parsedRows) => {
                for (const row of parsedRows) {
                  await onAddCctv(row);
                }
                setIsImportOpen(false);
              }}
              onClose={() => setIsImportOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* CCTV Status bar - completely borderless */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-6" id="cctv-monitor">
        <div className="col-span-2 sm:col-span-1 bg-slate-900 text-white p-3 sm:p-5 rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-md">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Jumlah Kamera Keamanan</span>
            <p className="text-base sm:text-2xl font-extrabold text-white mt-0.5 sm:mt-1 truncate">{totalCount} Kamera</p>
          </div>
          <div className="p-2 sm:p-3 bg-slate-800 text-blue-400 rounded-lg sm:rounded-xl shrink-0">
            <Camera className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Kamera Online</span>
            <p className="text-base sm:text-2xl font-extrabold text-emerald-600 mt-0.5 sm:mt-1 truncate">{onlineCount} Online</p>
          </div>
          <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl shrink-0">
            <Play className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] fill-emerald-500 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">Mati / Rusak</span>
            <p className="text-base sm:text-2xl font-extrabold text-rose-600 mt-0.5 sm:mt-1 truncate">{brokenCount} Offline</p>
          </div>
          <div className="p-2 sm:p-3 bg-rose-50 text-rose-600 rounded-lg sm:rounded-xl shrink-0">
            <XOctagon className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]" />
          </div>
        </div>
      </div>

      {/* Filter and Search Panel - completely borderless */}
      <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-2.5 sm:space-y-4" id="cctv-filter-panel">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-4 items-center">
          
          <div className="relative md:col-span-4">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input 
              type="text" 
              placeholder="Cari kode, nama, merk..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-slate-50 text-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full py-1.5 sm:py-2 px-2.5 sm:px-3 bg-slate-50 text-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm focus:outline-none"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Mati">Mati</option>
              <option value="Rusak">Rusak</option>
              <option value="Perbaikan">Perbaikan</option>
            </select>
          </div>

          <div className="md:col-span-5 flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs font-bold text-gray-400 shrink-0 uppercase tracking-wider">Urut:</span>
            <select 
              value={sortColumn}
              onChange={e => setSortColumn(e.target.value)}
              className="w-full py-1.5 sm:py-2 px-2.5 sm:px-3 bg-slate-50 text-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm focus:outline-none"
            >
              <option value="code">Kode Kamera</option>
              <option value="name">Nama Kamera / Zona</option>
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

      {/* CCTV Table - completely borderless wrapper */}
      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.015)] overflow-hidden" id="cctv-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Kode & Nama Kamera</th>
                <th className="py-4 px-6">Merek Perangkat</th>
                <th className="py-4 px-6">Lokasi Pemasangan</th>
                <th className="py-4 px-6">IP Address</th>
                <th className="py-4 px-6">Status Keaktifan</th>
                <th className="py-4 px-6">Pemeliharaan Terakhir</th>
                <th className="py-4 px-6">Log Registrasi</th>
                <th className="py-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {paginatedCctvs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Tidak ada kamera CCTV yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedCctvs.map(cctv => (
                  <tr key={cctv.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div 
                          className="font-mono text-xs font-bold inline-block px-2 py-0.5 rounded-md mb-1"
                          style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}
                        >
                          {cctv.code}
                        </div>
                        <div className="font-semibold text-gray-900">{cctv.name}</div>
                        {cctv.notes && <div className="text-xs text-gray-400 mt-0.5 italic">Catatan: {cctv.notes}</div>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-gray-800 font-semibold text-xs">
                        <Cpu size={14} className="text-gray-400" />
                        <span>{cctv.brand || 'Generic'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin size={14} className="text-gray-400" />
                        <span>{cctv.location}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-gray-600 font-medium">
                      {cctv.ipAddress || '192.168.1.XX'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        cctv.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700' :
                        cctv.status === 'Perbaikan' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          cctv.status === 'Aktif' ? 'bg-emerald-500' :
                          cctv.status === 'Perbaikan' ? 'bg-amber-500' :
                          'bg-red-500'
                        }`} />
                        {cctv.status === 'Aktif' ? 'Online' : cctv.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <RefreshCw size={12} className="text-gray-400" />
                        <span>{cctv.lastMaintenance || 'Belum di-servis'}</span>
                      </div>
                    </td>
                    {/* Log Registrasi */}
                    <td className="py-4 px-6 text-xs">
                      <div className="font-semibold text-slate-800 truncate" title={cctv.createdByName || cctv.createdBy || 'Staf TMII'}>
                        {cctv.createdByName || (cctv.createdBy ? cctv.createdBy.split('@')[0] : 'Staf TMII')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {cctv.createdAt ? new Date(cctv.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(cctv)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title={isAdmin ? "Edit Kamera" : "Lihat Detail"}
                        >
                          <Edit size={16} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(cctv.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Kamera"
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
              Menampilkan {Math.min(sortedCctvs.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(sortedCctvs.length, currentPage * itemsPerPage)} dari {sortedCctvs.length} data
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

      {/* Add / Edit CCTV Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs" id="cctv-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="p-6 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCctv ? (isAdmin ? 'Perbarui Konfigurasi Kamera' : 'Detail Konfigurasi Kamera') : 'Daftarkan Kamera CCTV Baru'}
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
              {editingCctv && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <UserCheck size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Diregistrasi oleh: <span className="text-blue-700 font-extrabold">{editingCctv.createdByName || editingCctv.createdBy || 'Staf TMII'}</span>
                        </span>
                        {editingCctv.createdBy && editingCctv.createdByName && (
                          <span className="text-[11px] text-slate-500 font-mono">({editingCctv.createdBy})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5 font-medium">
                        <Clock size={12} className="text-slate-400" />
                        <span>Waktu Registrasi: {editingCctv.createdAt ? new Date(editingCctv.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Tidak tercatat'}</span>
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    Log Sistem
                  </span>
                </div>
              )}
              <fieldset disabled={editingCctv !== null && !isAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Kode Kamera *</label>
                  <input 
                    type="text" 
                    required
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    placeholder="Contoh: TMII-CCTV-001"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nama Kamera / Zona *</label>
                  <input 
                    type="text" 
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Contoh: CCTV Gerbang Utama"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Merek Perangkat</label>
                  <input 
                    type="text" 
                    value={formBrand}
                    onChange={e => setFormBrand(e.target.value)}
                    placeholder="Contoh: Hikvision / Dahua"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Lokasi Pemasangan * <span className="normal-case font-normal text-[11px] text-amber-800">(Fitur Auto-fill Ketik / Pilih)</span>
                  </label>
                  <LocationAutoComplete
                    value={formLocation}
                    onChange={(val) => setFormLocation(val)}
                    locations={configuredLocations}
                    placeholder="Ketik atau pilih lokasi CCTV..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">IP Address Kamera</label>
                  <input 
                    type="text" 
                    value={formIpAddress}
                    onChange={e => setFormIpAddress(e.target.value)}
                    placeholder="Contoh: 192.168.10.25"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Status Keaktifan *</label>
                  <select 
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as CctvAsset['status'])}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="Aktif">Aktif / Online</option>
                    <option value="Mati">Mati / Offline</option>
                    <option value="Rusak">Rusak</option>
                    <option value="Perbaikan">Perbaikan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tanggal Pemeliharaan Terakhir</label>
                  <input 
                    type="date" 
                    value={formLastMaintenance}
                    onChange={e => setFormLastMaintenance(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Catatan Hambatan / Kerusakan</label>
                  <textarea 
                    rows={3}
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Tuliskan hambatan visual, status adaptor, riwayat penggantian kabel..."
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
                  {(!editingCctv || isAdmin) ? 'Batal' : 'Tutup'}
                </button>
                {(!editingCctv || isAdmin) && (
                  <button 
                    type="submit"
                    className="px-5 py-2 text-white font-semibold rounded-xl text-sm shadow-md transition-colors cursor-pointer"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {editingCctv ? 'Simpan Perubahan' : 'Daftarkan CCTV'}
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
