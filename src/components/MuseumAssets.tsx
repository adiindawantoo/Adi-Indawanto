import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  FileSpreadsheet,
  BookOpen,
  Compass,
  Sparkles,
  MapPin,
  FileText,
  CalendarDays,
  ArrowUpDown,
  UserCheck,
  Clock
} from 'lucide-react';
import { MuseumCollection, AppTheme } from '../types';
import { exportToExcel } from '../lib/excel';
import ImportDataPanel from './ImportDataPanel';

interface MuseumAssetsProps {
  collections: MuseumCollection[];
  onAddCollection: (collection: Omit<MuseumCollection, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateCollection: (id: string, collection: Partial<MuseumCollection>) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  isAdmin?: boolean;
  theme: AppTheme;
}

export default function MuseumAssets({
  collections,
  onAddCollection,
  onUpdateCollection,
  onDeleteCollection,
  isAdmin = true,
  theme
}: MuseumAssetsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [museumFilter, setMuseumFilter] = useState('Semua');
  const [conditionFilter, setConditionFilter] = useState('Semua');
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Sorting & Pagination States
  const [sortColumn, setSortColumn] = useState<string>('registerNo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<MuseumCollection | null>(null);

  const [formRegisterNo, setFormRegisterNo] = useState('');
  const [formName, setFormName] = useState('');
  const [formMuseumName, setFormMuseumName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formOrigin, setFormOrigin] = useState('');
  const [formMaterial, setFormMaterial] = useState('');
  const [formDimension, setFormDimension] = useState('');
  const [formCondition, setFormCondition] = useState<MuseumCollection['condition']>('Utuh');
  const [formDescription, setFormDescription] = useState('');
  const [formDriveFileUrl, setFormDriveFileUrl] = useState('');

  // Reset page on filter or sorting updates
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, museumFilter, conditionFilter, sortColumn, sortDirection]);

  const resetForm = () => {
    setEditingCollection(null);
    setFormRegisterNo('');
    setFormName('');
    setFormMuseumName('');
    setFormCategory('');
    setFormOrigin('');
    setFormMaterial('');
    setFormDimension('');
    setFormCondition('Utuh');
    setFormDescription('');
    setFormDriveFileUrl('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    const nextNum = String(collections.length + 1).padStart(3, '0');
    setFormRegisterNo(`REG-MUSEUM-${nextNum}`);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (collection: MuseumCollection) => {
    setEditingCollection(collection);
    setFormRegisterNo(collection.registerNo);
    setFormName(collection.name);
    setFormMuseumName(collection.museumName);
    setFormCategory(collection.category || '');
    setFormOrigin(collection.origin || '');
    setFormMaterial(collection.material || '');
    setFormDimension(collection.dimension || '');
    setFormCondition(collection.condition);
    setFormDescription(collection.description || '');
    setFormDriveFileUrl(collection.driveFileUrl || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRegisterNo.trim() || !formName.trim() || !formMuseumName.trim()) {
      alert('Nomor Register, Nama Koleksi, dan Museum wajib diisi.');
      return;
    }

    const payload = {
      registerNo: formRegisterNo,
      name: formName,
      museumName: formMuseumName,
      category: formCategory,
      origin: formOrigin,
      material: formMaterial,
      dimension: formDimension,
      condition: formCondition,
      description: formDescription,
      driveFileUrl: formDriveFileUrl
    };

    try {
      if (editingCollection) {
        await onUpdateCollection(editingCollection.id, payload);
      } else {
        await onAddCollection(payload);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(`Gagal menyimpan koleksi museum: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus koleksi museum ini?')) {
      try {
        await onDeleteCollection(id);
      } catch (err: any) {
        alert(`Gagal menghapus koleksi: ${err.message}`);
      }
    }
  };

  const handleExport = () => {
    const exportData = collections.map(c => ({
      'ID Koleksi': c.id,
      'No Register': c.registerNo,
      'Nama Objek': c.name,
      'Museum': c.museumName,
      'Kategori': c.category || '',
      'Asal-Usul / Tahun': c.origin || '',
      'Bahan': c.material || '',
      'Ukuran': c.dimension || '',
      'Kondisi': c.condition,
      'Tautan Drive': c.driveFileUrl || '',
      'Deskripsi / Sejarah': c.description || '',
      'Tanggal Input': c.createdAt
    }));
    exportToExcel(exportData, 'Database_Koleksi_Museum_TMII', 'Koleksi_Museum');
  };

  // Filter Koleksi
  const filteredCollections = collections.filter(collection => {
    const matchesSearch = 
      collection.registerNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collection.category && collection.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (collection.origin && collection.origin.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMuseum = museumFilter === 'Semua' || collection.museumName === museumFilter;
    const matchesCondition = conditionFilter === 'Semua' || collection.condition === conditionFilter;

    return matchesSearch && matchesMuseum && matchesCondition;
  });

  // Sort Koleksi
  const sortedCollections = [...filteredCollections].sort((a, b) => {
    let valA = a[sortColumn as keyof MuseumCollection] || '';
    let valB = b[sortColumn as keyof MuseumCollection] || '';

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination Slice
  const totalPages = Math.ceil(sortedCollections.length / itemsPerPage) || 1;
  const paginatedCollections = sortedCollections.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalCount = collections.length;
  const utuhCount = collections.filter(c => c.condition === 'Utuh').length;

  return (
    <div className="space-y-6" id="museum-module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="museum-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Katalog Koleksi Museum TMII</h1>
          <p className="text-sm text-gray-500">Registrasi, asal-usul sejarah, dan status konservasi artefak budaya bernilai tinggi</p>
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
              id="btn-import-museums-toggle"
            >
              <FileSpreadsheet size={18} className={isImportOpen ? 'text-white' : 'text-slate-500'} />
              <span>Import Excel/CSV</span>
            </button>
          )}
          <button 
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
            id="btn-export-museum"
          >
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-colors cursor-pointer"
            style={{ backgroundColor: theme.primaryColor }}
            id="btn-add-museum-coll"
          >
            <Plus size={18} />
            <span>Daftarkan Artefak</span>
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
              type="museum"
              onImport={async (parsedRows) => {
                for (const row of parsedRows) {
                  await onAddCollection(row);
                }
                setIsImportOpen(false);
              }}
              onClose={() => setIsImportOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini dashboard - completely borderless */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" id="museum-summary">
        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Jumlah Artefak Terkatalog</span>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{totalCount} Koleksi Budaya</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <BookOpen size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Kondisi Fisik Utuh</span>
            <p className="text-xl font-extrabold text-emerald-600 mt-1">{utuhCount} Koleksi Prima</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Sparkles size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Butuh Restorasi / Rusak</span>
            <p className="text-xl font-extrabold text-rose-600 mt-1">{totalCount - utuhCount} Koleksi Ringan/Berat</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Compass size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Panel - completely borderless */}
      <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4" id="museum-filter-panel">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          <div className="relative md:col-span-4">
            <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari register, nama objek, asal..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <select 
              value={museumFilter}
              onChange={e => setMuseumFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            >
              <option value="Semua">Semua Museum</option>
              <option value="Museum Indonesia">Museum Indonesia</option>
              <option value="Museum Pusaka">Museum Pusaka</option>
              <option value="Museum Transportasi">Museum Transportasi</option>
              <option value="Museum Komodo dan Taman Reptil">Museum Komodo</option>
              <option value="Museum Keprajuritan">Museum Keprajuritan</option>
              <option value="Museum Penerangan">Museum Penerangan</option>
              <option value="Museum Serangga">Museum Serangga</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select 
              value={conditionFilter}
              onChange={e => setConditionFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            >
              <option value="Semua">Semua Kondisi</option>
              <option value="Utuh">Utuh</option>
              <option value="Rusak Sebagian">Rusak Sebagian</option>
              <option value="Rusak Parah">Rusak Parah</option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 shrink-0 uppercase tracking-wider">Urutkan:</span>
            <select 
              value={sortColumn}
              onChange={e => setSortColumn(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            >
              <option value="registerNo">Nomor Register</option>
              <option value="name">Nama Objek</option>
              <option value="museumName">Museum</option>
              <option value="category">Kategori</option>
              <option value="condition">Kondisi</option>
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

      {/* Museum Table - completely borderless wrapper */}
      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.015)] overflow-hidden" id="museum-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Identitas Koleksi</th>
                <th className="py-4 px-6">Nama Objek</th>
                <th className="py-4 px-6">TMII Museum</th>
                <th className="py-4 px-6">Asal-Usul & Bahan</th>
                <th className="py-4 px-6">Dimensi Fisik</th>
                <th className="py-4 px-6">Kondisi Fisik</th>
                <th className="py-4 px-6">Log Registrasi</th>
                <th className="py-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {paginatedCollections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Tidak ada koleksi museum yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedCollections.map(collection => (
                  <tr key={collection.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div 
                        className="font-mono text-xs font-bold inline-block px-2 py-0.5 rounded-md mb-1"
                        style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}
                      >
                        {collection.registerNo}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 font-medium">Kategori: {collection.category || 'Belum diatur'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-900">{collection.name}</div>
                      {collection.driveFileUrl && (
                        <a 
                          href={collection.driveFileUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-1 mt-0.5"
                        >
                          <FileText size={10} />
                          <span>Tautan Foto GDrive</span>
                        </a>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-800 font-semibold">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} className="text-gray-400" />
                        <span>{collection.museumName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-600">
                      <div className="font-medium text-gray-800">{collection.origin || 'Asal-usul belum terinci'}</div>
                      <div className="text-gray-400 mt-1">Bahan: {collection.material || '-'}</div>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-600 font-medium">
                      {collection.dimension || 'Tanpa deskripsi dimensi'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        collection.condition === 'Utuh' ? 'bg-emerald-50 text-emerald-700' :
                        collection.condition === 'Rusak Sebagian' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {collection.condition}
                      </span>
                    </td>
                    {/* Log Registrasi */}
                    <td className="py-4 px-6 text-xs">
                      <div className="font-semibold text-slate-800 truncate" title={collection.createdByName || collection.createdBy || 'Staf TMII'}>
                        {collection.createdByName || (collection.createdBy ? collection.createdBy.split('@')[0] : 'Staf TMII')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {collection.createdAt ? new Date(collection.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(collection)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title={isAdmin ? "Edit Koleksi" : "Lihat Detail"}
                        >
                          <Edit size={16} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(collection.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Koleksi"
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
              Menampilkan {Math.min(sortedCollections.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(sortedCollections.length, currentPage * itemsPerPage)} dari {sortedCollections.length} data
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

      {/* Add / Edit Museum Collection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs" id="museum-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="p-6 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCollection ? (isAdmin ? 'Perbarui Data Koleksi Museum' : 'Detail Data Koleksi Museum') : 'Registrasi Koleksi Museum Baru'}
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
              {editingCollection && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <UserCheck size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Diregistrasi oleh: <span className="text-blue-700 font-extrabold">{editingCollection.createdByName || editingCollection.createdBy || 'Staf TMII'}</span>
                        </span>
                        {editingCollection.createdBy && editingCollection.createdByName && (
                          <span className="text-[11px] text-slate-500 font-mono">({editingCollection.createdBy})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5 font-medium">
                        <Clock size={12} className="text-slate-400" />
                        <span>Waktu Registrasi: {editingCollection.createdAt ? new Date(editingCollection.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Tidak tercatat'}</span>
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    Log Sistem
                  </span>
                </div>
              )}
              <fieldset disabled={editingCollection !== null && !isAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nomor Register Koleksi *</label>
                  <input 
                    type="text" 
                    required
                    value={formRegisterNo}
                    onChange={e => setFormRegisterNo(e.target.value)}
                    placeholder="Contoh: REG-MUSEUM-001"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nama Koleksi (Nama Objek) *</label>
                  <input 
                    type="text" 
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Contoh: Keris Pusaka Nogososro"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nama Museum TMII *</label>
                  <select 
                    value={formMuseumName}
                    onChange={e => setFormMuseumName(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="">-- Pilih Museum --</option>
                    <option value="Museum Indonesia">Museum Indonesia</option>
                    <option value="Museum Pusaka">Museum Pusaka</option>
                    <option value="Museum Transportasi">Museum Transportasi</option>
                    <option value="Museum Komodo dan Taman Reptil">Museum Komodo dan Taman Reptil</option>
                    <option value="Museum Keprajuritan">Museum Keprajuritan</option>
                    <option value="Museum Penerangan">Museum Penerangan</option>
                    <option value="Museum Serangga">Museum Serangga</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Kategori Koleksi</label>
                  <input 
                    type="text" 
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    placeholder="Contoh: Arkeologika / Historika / Etnografika"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Asal-Usul / Tahun Pembuatan</label>
                  <input 
                    type="text" 
                    value={formOrigin}
                    onChange={e => setFormOrigin(e.target.value)}
                    placeholder="Contoh: Jawa Tengah, Abad ke-14"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Bahan / Material Utama</label>
                  <input 
                    type="text" 
                    value={formMaterial}
                    onChange={e => setFormMaterial(e.target.value)}
                    placeholder="Contoh: Logam Besi, Pamor Perak"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Dimensi / Ukuran</label>
                  <input 
                    type="text" 
                    value={formDimension}
                    onChange={e => setFormDimension(e.target.value)}
                    placeholder="Contoh: Panjang 45cm, Lebar 12cm"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Kondisi Koleksi</label>
                  <select 
                    value={formCondition}
                    onChange={e => setFormCondition(e.target.value as MuseumCollection['condition'])}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="Utuh">Utuh</option>
                    <option value="Rusak Sebagian">Rusak Sebagian</option>
                    <option value="Rusak Parah">Rusak Parah</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">URL Foto Koleksi / Gambar GDrive</label>
                  <input 
                    type="text" 
                    value={formDriveFileUrl}
                    onChange={e => setFormDriveFileUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Sejarah Singkat / Keterangan</label>
                  <textarea 
                    rows={4}
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Ceritakan latar belakang sejarah, kegunaan di masa lalu, atau catatan restorasi..."
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
                  {(!editingCollection || isAdmin) ? 'Batal' : 'Tutup'}
                </button>
                {(!editingCollection || isAdmin) && (
                  <button 
                    type="submit"
                    className="px-5 py-2 text-white font-semibold rounded-xl text-sm shadow-md transition-colors cursor-pointer"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {editingCollection ? 'Simpan Perubahan' : 'Registrasi Aset'}
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
