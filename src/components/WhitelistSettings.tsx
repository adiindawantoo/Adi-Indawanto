import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  UserCheck, 
  Mail, 
  ShieldCheck, 
  AlertTriangle,
  X,
  Check,
  AlertCircle,
  HelpCircle,
  MapPin,
  Building,
  Compass,
  Search,
  Filter,
  RotateCcw,
  Map as MapIcon,
  Database,
  Info,
  Pencil,
  RefreshCw,
  FolderTree,
  Tag,
  Layers
} from 'lucide-react';
import { AllowedEmail, ConfiguredLocation, ConfiguredCategory, TmiiRegionName, DEFAULT_ASSET_LOCATIONS, DEFAULT_ASSET_CATEGORIES, LOCATION_AREA_CATEGORIES } from '../types';

interface WhitelistSettingsProps {
  emails: AllowedEmail[];
  onAddEmail: (email: string, role: 'admin' | 'viewer') => Promise<void>;
  onDeleteEmail: (id: string) => Promise<void>;
  locations?: ConfiguredLocation[];
  onAddLocation?: (name: string, region: TmiiRegionName, category: string, description?: string) => Promise<void>;
  onUpdateLocation?: (id: string, name: string, region: TmiiRegionName, category: string, description?: string) => Promise<void>;
  onDeleteLocation?: (id: string) => Promise<void>;
  onSeedLocations?: () => Promise<void>;
  categories?: ConfiguredCategory[];
  onAddCategory?: (categoryName: string, types: string[]) => Promise<void>;
  onUpdateCategory?: (id: string, categoryName: string, types: string[]) => Promise<void>;
  onDeleteCategory?: (id: string) => Promise<void>;
  onSeedCategories?: () => Promise<void>;
  currentUserEmail: string | null;
  onClearCollection?: (collectionName: 'task' | 'fixed_asset' | 'animal' | 'cctv' | 'mep' | 'museum_collection') => Promise<void>;
  stats?: {
    tasks: number;
    fixedAssets: number;
    animals: number;
    cctvs: number;
    meps: number;
    museumCollections: number;
  };
}

export default function WhitelistSettings({
  emails,
  onAddEmail,
  onDeleteEmail,
  locations = [],
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation,
  onSeedLocations,
  categories = [],
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSeedCategories,
  currentUserEmail,
  onClearCollection,
  stats = { tasks: 0, fixedAssets: 0, animals: 0, cctvs: 0, meps: 0, museumCollections: 0 }
}: WhitelistSettingsProps) {
  // Navigation active setting section
  const [activeTab, setActiveTab] = useState<'categories' | 'locations' | 'whitelist' | 'database'>('categories');

  // Whitelist Form states
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'viewer'>('viewer');
  const [submittingEmail, setSubmittingEmail] = useState(false);

  // Location Form states
  const [locName, setLocName] = useState('');
  const [locRegion, setLocRegion] = useState<TmiiRegionName>('Wilayah Utara');
  const [locCategory, setLocCategory] = useState<string>('Area Makro TMII');
  const [locDescription, setLocDescription] = useState('');
  const [submittingLoc, setSubmittingLoc] = useState(false);
  
  // Location Filters
  const [locFilterRegion, setLocFilterRegion] = useState<string>('Semua');
  const [locFilterCategory, setLocFilterCategory] = useState<string>('Semua');
  const [locSearchTerm, setLocSearchTerm] = useState('');

  // Location Edit Modal state
  const [editingLocation, setEditingLocation] = useState<ConfiguredLocation | null>(null);
  const [editLocName, setEditLocName] = useState('');
  const [editLocRegion, setEditLocRegion] = useState<TmiiRegionName>('Wilayah Utara');
  const [editLocCategory, setEditLocCategory] = useState<string>('Area Makro TMII');
  const [editLocDescription, setEditLocDescription] = useState('');
  const [savingEditLoc, setSavingEditLoc] = useState(false);

  // Category Form & Search states
  const [catSearchTerm, setCatSearchTerm] = useState('');
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatTypesInput, setNewCatTypesInput] = useState('');
  const [submittingCat, setSubmittingCat] = useState(false);

  // Category Edit Modal state
  const [editingCategory, setEditingCategory] = useState<ConfiguredCategory | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatTypesInput, setEditCatTypesInput] = useState('');
  const [savingEditCat, setSavingEditCat] = useState(false);

  const [clearing, setClearing] = useState<string | null>(null);

  // Custom modal for confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'clear_db' | 'delete_email' | 'delete_location' | 'seed_locations' | 'delete_category' | 'seed_categories' | null;
    targetKey: string;
    displayName: string;
    extraData?: any;
  }>({
    isOpen: false,
    type: null,
    targetKey: '',
    displayName: ''
  });

  // Toast notification
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({
    show: false,
    type: 'info',
    message: ''
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification(prev => prev.message === message ? { ...prev, show: false } : prev);
    }, 4000);
  };

  // Submit email
  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      showToast('Format email tidak valid.', 'error');
      return;
    }

    const exists = emails.some(e => e.email.toLowerCase() === cleanEmail);
    if (exists || cleanEmail === 'adi.indawanto@gmail.com') {
      showToast('Email ini sudah ada dalam daftar whitelist.', 'error');
      return;
    }

    setSubmittingEmail(true);
    try {
      await onAddEmail(cleanEmail, newRole);
      setNewEmail('');
      setNewRole('viewer');
      showToast('Email berhasil ditambahkan ke whitelist.', 'success');
    } catch (err: any) {
      showToast(`Gagal menambahkan email: ${err.message}`, 'error');
    } finally {
      setSubmittingEmail(false);
    }
  };

  // Active locations list with default fallback
  const displayLocations = useMemo(() => {
    if (locations && locations.length > 0) {
      return locations;
    }
    return DEFAULT_ASSET_LOCATIONS.map((loc, idx) => ({
      id: `default-${idx}`,
      name: loc.name,
      region: loc.region,
      category: loc.category,
      description: loc.description,
      createdAt: ''
    }));
  }, [locations]);

  // Submit location
  const handleSubmitLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = locName.trim();
    if (!cleanName) {
      showToast('Mohon isi nama lokasi penempatan aset.', 'error');
      return;
    }

    if (!onAddLocation) {
      showToast('Fungsi penambahan lokasi belum tersedia.', 'error');
      return;
    }

    // Check duplicate name
    const isDuplicate = displayLocations.some(l => l.name.toLowerCase() === cleanName.toLowerCase());
    if (isDuplicate) {
      showToast(`Lokasi "${cleanName}" sudah terdaftar sebelumnya.`, 'error');
      return;
    }

    setSubmittingLoc(true);
    try {
      await onAddLocation(cleanName, locRegion, locCategory, locDescription.trim());
      setLocName('');
      setLocDescription('');
      showToast(`Lokasi "${cleanName}" (${locCategory}) di ${locRegion} berhasil disimpan!`, 'success');
    } catch (err: any) {
      showToast(`Gagal menambahkan lokasi: ${err.message}`, 'error');
    } finally {
      setSubmittingLoc(false);
    }
  };

  // Open edit modal
  const handleOpenEditLocation = (loc: ConfiguredLocation) => {
    setEditingLocation(loc);
    setEditLocName(loc.name);
    setEditLocRegion(loc.region);
    setEditLocCategory(loc.category || 'Area Makro TMII');
    setEditLocDescription(loc.description || '');
  };

  // Save edit location
  const handleSaveEditLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;
    const cleanName = editLocName.trim();
    if (!cleanName) {
      showToast('Mohon isi nama lokasi.', 'error');
      return;
    }

    setSavingEditLoc(true);
    try {
      if (onUpdateLocation) {
        await onUpdateLocation(editingLocation.id, cleanName, editLocRegion, editLocCategory, editLocDescription.trim());
      } else if (onAddLocation) {
        await onAddLocation(cleanName, editLocRegion, editLocCategory, editLocDescription.trim());
      }
      showToast(`Lokasi "${cleanName}" berhasil diperbarui.`, 'success');
      setEditingLocation(null);
    } catch (err: any) {
      showToast(`Gagal memperbarui lokasi: ${err.message}`, 'error');
    } finally {
      setSavingEditLoc(false);
    }
  };

  // Handle delete location prompt
  const handleDeleteLocationPrompt = (loc: ConfiguredLocation) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete_location',
      targetKey: loc.id,
      displayName: `${loc.name} (${loc.region})`
    });
  };

  // Handle seed location prompt
  const handleSeedLocationsPrompt = () => {
    setConfirmModal({
      isOpen: true,
      type: 'seed_locations',
      targetKey: 'all',
      displayName: 'Restorasi 5 Wilayah Default TMII'
    });
  };

  const handleDeleteEmailPrompt = (item: AllowedEmail) => {
    if (item.email === 'adi.indawanto@gmail.com') {
      showToast('Email administrator utama (adi.indawanto@gmail.com) tidak dapat dihapus.', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'delete_email',
      targetKey: item.id,
      displayName: item.email
    });
  };

  const handleClearCollectionPrompt = (collectionName: 'task' | 'fixed_asset' | 'animal' | 'cctv' | 'mep' | 'museum_collection', displayName: string) => {
    if (!onClearCollection) return;
    setConfirmModal({
      isOpen: true,
      type: 'clear_db',
      targetKey: collectionName,
      displayName: displayName
    });
  };

  // Execution functions after modal confirmation
  const executeDeleteEmail = async (id: string, email: string) => {
    try {
      await onDeleteEmail(id);
      showToast(`Akses masuk untuk email ${email} berhasil dicabut.`, 'success');
    } catch (err: any) {
      showToast(`Gagal menghapus email whitelist: ${err.message}`, 'error');
    }
  };

  const executeDeleteLocation = async (id: string, name: string) => {
    if (!onDeleteLocation) return;
    try {
      await onDeleteLocation(id);
      showToast(`Lokasi ${name} berhasil dihapus dari pengaturan database.`, 'success');
    } catch (err: any) {
      showToast(`Gagal menghapus lokasi: ${err.message}`, 'error');
    }
  };

  const executeSeedLocations = async () => {
    if (!onSeedLocations) return;
    try {
      await onSeedLocations();
      showToast('Seluruh lokasi default 5 wilayah TMII berhasil direstorasi ke database.', 'success');
    } catch (err: any) {
      showToast(`Gagal merestorasi lokasi default: ${err.message}`, 'error');
    }
  };

  const executeDeleteCategory = async (id: string, name: string) => {
    if (!onDeleteCategory) return;
    try {
      await onDeleteCategory(id);
      showToast(`Kategori ${name} berhasil dihapus dari pengaturan database.`, 'success');
    } catch (err: any) {
      showToast(`Gagal menghapus kategori: ${err.message}`, 'error');
    }
  };

  const executeSeedCategories = async () => {
    if (!onSeedCategories) return;
    try {
      await onSeedCategories();
      showToast('Seluruh kategori dan jenis aset default spreadsheet berhasil direstorasi.', 'success');
    } catch (err: any) {
      showToast(`Gagal merestorasi kategori default: ${err.message}`, 'error');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !onAddCategory) return;
    setSubmittingCat(true);
    try {
      const typesList = newCatTypesInput
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
      await onAddCategory(newCatName, typesList);
      showToast(`Kategori "${newCatName.trim()}" berhasil ditambahkan dengan ${typesList.length} jenis aset.`, 'success');
      setNewCatName('');
      setNewCatTypesInput('');
      setIsAddCatModalOpen(false);
    } catch (err: any) {
      showToast(`Gagal menambah kategori: ${err.message}`, 'error');
    } finally {
      setSubmittingCat(false);
    }
  };

  const handleOpenEditCategory = (cat: ConfiguredCategory) => {
    setEditingCategory(cat);
    setEditCatName(cat.category);
    setEditCatTypesInput(cat.types.join('\n'));
  };

  const handleSaveCategoryEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim() || !onUpdateCategory) return;
    setSavingEditCat(true);
    try {
      const typesList = editCatTypesInput
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
      await onUpdateCategory(editingCategory.id, editCatName, typesList);
      showToast(`Kategori "${editCatName.trim()}" berhasil diperbarui.`, 'success');
      setEditingCategory(null);
    } catch (err: any) {
      showToast(`Gagal memperbarui kategori: ${err.message}`, 'error');
    } finally {
      setSavingEditCat(false);
    }
  };

  // Active categories list
  const displayCategories: ConfiguredCategory[] = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories;
    }
    return DEFAULT_ASSET_CATEGORIES.map((c, idx) => ({
      id: `default-${idx}`,
      category: c.category,
      types: c.types
    }));
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return displayCategories.filter(item => {
      if (!catSearchTerm.trim()) return true;
      const term = catSearchTerm.toLowerCase();
      const matchCat = item.category.toLowerCase().includes(term);
      const matchType = item.types.some(t => t.toLowerCase().includes(term));
      return matchCat || matchType;
    });
  }, [displayCategories, catSearchTerm]);

  const executeClearCollection = async (collectionName: 'task' | 'fixed_asset' | 'animal' | 'cctv' | 'mep' | 'museum_collection', displayName: string) => {
    if (!onClearCollection) return;
    setClearing(collectionName);
    try {
      await onClearCollection(collectionName);
      showToast(`Seluruh data ${displayName} berhasil dikosongkan ke angka 0.`, 'success');
    } catch (err: any) {
      showToast(`Gagal mengosongkan data: ${err.message}`, 'error');
    } finally {
      setClearing(null);
    }
  };

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return displayLocations.filter(loc => {
      if (locFilterRegion !== 'Semua' && loc.region !== locFilterRegion) {
        return false;
      }
      if (locFilterCategory !== 'Semua' && (loc.category || 'Lainnya') !== locFilterCategory) {
        return false;
      }
      if (locSearchTerm.trim() !== '') {
        const term = locSearchTerm.toLowerCase();
        return loc.name.toLowerCase().includes(term) || 
               loc.region.toLowerCase().includes(term) || 
               (loc.category || '').toLowerCase().includes(term) ||
               (loc.description || '').toLowerCase().includes(term);
      }
      return true;
    });
  }, [displayLocations, locFilterRegion, locFilterCategory, locSearchTerm]);

  // Helper badge class per region
  const getRegionBadgeStyle = (region: TmiiRegionName) => {
    switch (region) {
      case 'Wilayah Utara':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Wilayah Selatan':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Wilayah Barat':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Wilayah Timur':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Wilayah Pusat':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 pb-12" id="whitelist-module">
      
      {/* Page Title */}
      <div className="pt-4 pb-2 px-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Pengaturan Sistem & Database Terpadu
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            Kelola otorisasi email staf, konfigurasi lokasi aset 5 wilayah TMII, dan pemeliharaan basis data.
          </p>
        </div>

        {/* Tab Navigation Pill Header */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/80 p-1.5 rounded-2xl border border-slate-300/60 shadow-inner">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FolderTree size={15} />
            <span>Kategori & Jenis Aset</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-900 text-white font-bold">
              {displayCategories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'locations'
                ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <MapPin size={15} />
            <span>Setting Lokasi Aset</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-900 text-white font-bold">
              {locations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('whitelist')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'whitelist'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <UserCheck size={15} />
            <span>Otorisasi Email</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-600 text-white font-bold">
              {emails.length + 1}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Database size={15} />
            <span>Reset Data</span>
          </button>
        </div>
      </div>

      {/* 0. SETTING KATEGORI & JENIS ASET TAB */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Header Action Banner */}
          <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0">
                <FolderTree size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Pengaturan Kategori & Jenis Aset Terpadu
                </h2>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Aturan master data kategori dan jenis aset turunan yang terintegrasi langsung dengan formulir input aset.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              {onSeedCategories && (
                <button
                  type="button"
                  onClick={() => setConfirmModal({
                    isOpen: true,
                    type: 'seed_categories',
                    targetKey: 'all',
                    displayName: 'Kategori Default TMII'
                  })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <RotateCcw size={14} className="text-amber-600" />
                  <span>Restorasi Default Spreadsheet</span>
                </button>
              )}

              {onAddCategory && (
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition-all shadow-md cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Tambah Kategori</span>
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                value={catSearchTerm}
                onChange={e => setCatSearchTerm(e.target.value)}
                placeholder="Cari nama kategori atau jenis aset..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {catSearchTerm && (
                <button 
                  onClick={() => setCatSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Layers size={15} className="text-amber-600" />
              <span>Total Kategori: <strong className="text-slate-900">{filteredCategories.length}</strong></span>
              <span className="mx-1">•</span>
              <span>Total Jenis Aset: <strong className="text-slate-900">{filteredCategories.reduce((acc, c) => acc + c.types.length, 0)}</strong></span>
            </div>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCategories.map((cat) => (
              <div 
                key={cat.id || cat.category}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <FolderTree size={16} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                          {cat.category}
                        </h3>
                        <p className="text-[10px] font-bold text-amber-700 mt-0.5">
                          {cat.types.length} Jenis Aset Turunan
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onUpdateCategory && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          title="Edit Kategori & Jenis"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {onDeleteCategory && (
                        <button
                          type="button"
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            type: 'delete_category',
                            targetKey: cat.id,
                            displayName: cat.category
                          })}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Hapus Kategori"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Tag size={12} />
                      <span>Daftar Sub-Jenis:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {cat.types.map((type, tIdx) => (
                        <span 
                          key={tIdx}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-medium border border-slate-200/60"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <FolderTree size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">Tidak ada kategori yang cocok dengan pencarian</p>
              <button 
                onClick={() => setCatSearchTerm('')}
                className="text-xs text-amber-600 font-bold hover:underline cursor-pointer"
              >
                Reset kata kunci pencarian
              </button>
            </div>
          )}
        </div>
      )}

      {/* 1. SETTING LOKASI ASET TAB */}
      {activeTab === 'locations' && (
        <div className="space-y-6">
          
          {/* Header Action Banner */}
          <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-xs">
                <Compass size={22} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Pengaturan Lokasi Aset 5 Wilayah TMII</h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Lokasi yang didaftarkan di sini akan langsung terintegrasi secara otomatis saat registrasi maupun mutasi aset tetap.
                </p>
              </div>
            </div>

            <button
              onClick={handleSeedLocationsPrompt}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-amber-100 text-slate-900 border border-amber-300 font-extrabold text-xs transition-all shadow-xs cursor-pointer shrink-0"
            >
              <RotateCcw size={15} className="text-amber-700" />
              <span>Restorasi 5 Wilayah Default</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Form: Add Location */}
            <div className="lg:col-span-5 bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-xs h-fit space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 bg-amber-500/10 text-amber-800 rounded-2xl flex items-center justify-center font-black">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Tambah Lokasi Penempatan</h3>
                  <p className="text-xs text-slate-400 font-medium">Lengkapi form di bawah untuk mendaftarkan titik lokasi baru</p>
                </div>
              </div>

              <form onSubmit={handleSubmitLocation} className="space-y-4">
                {/* Region Select */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Pilih Wilayah TMII *
                  </label>
                  <select
                    value={locRegion}
                    onChange={e => setLocRegion(e.target.value as TmiiRegionName)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
                  >
                    <option value="Wilayah Utara">Wilayah Utara</option>
                    <option value="Wilayah Selatan">Wilayah Selatan</option>
                    <option value="Wilayah Barat">Wilayah Barat</option>
                    <option value="Wilayah Timur">Wilayah Timur</option>
                    <option value="Wilayah Pusat">Wilayah Pusat</option>
                  </select>
                </div>

                {/* Category Area Select */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Kategori Area / Zona *
                  </label>
                  <select
                    value={locCategory}
                    onChange={e => setLocCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
                  >
                    {LOCATION_AREA_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Location Name Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Nama Lokasi / Anjungan / Gedung *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Anjungan Sumatera Utara"
                    value={locName}
                    onChange={e => setLocName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                {/* Description Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Keterangan Tambahan (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Catatan detail lokasi, nomor ruangan, atau penanggung jawab area..."
                    value={locDescription}
                    onChange={e => setLocDescription(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingLoc}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-4 rounded-2xl text-xs transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>{submittingLoc ? 'Menyimpan...' : 'Simpan Lokasi Aset'}</span>
                </button>
              </form>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 leading-relaxed space-y-1">
                <span className="font-extrabold text-slate-900 block flex items-center gap-1.5">
                  <Info size={14} className="text-amber-600" />
                  Aturan Integrasi Lokasi:
                </span>
                <p className="text-[11px] font-medium text-slate-500">
                  Seluruh lokasi terdaftar langsung tersinkronisasi ke formulir penambahan & mutasi aset di seluruh modul database.
                </p>
              </div>
            </div>

            {/* Right List: Configured Locations */}
            <div className="lg:col-span-7 bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-xs space-y-5">
              
              {/* Header & Region / Category Filters */}
              <div className="space-y-3 border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Daftar Lokasi Terkonfigurasi</h3>
                    <p className="text-xs text-slate-400 font-medium">Total <strong className="text-slate-900">{filteredLocations.length}</strong> lokasi terdaftar</p>
                  </div>

                  {/* Search box */}
                  <div className="relative w-full sm:w-52">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari lokasi..."
                      value={locSearchTerm}
                      onChange={e => setLocSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Region Filter */}
                  <div className="flex flex-wrap items-center gap-1">
                    {['Semua', 'Wilayah Utara', 'Wilayah Selatan', 'Wilayah Barat', 'Wilayah Timur', 'Wilayah Pusat'].map((reg) => (
                      <button
                        key={reg}
                        onClick={() => setLocFilterRegion(reg)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${
                          locFilterRegion === reg
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {reg === 'Semua' ? 'Semua Wilayah' : reg.replace('Wilayah ', '')}
                      </button>
                    ))}
                  </div>

                  {/* Category Filter Dropdown */}
                  <div className="ml-auto flex items-center gap-1">
                    <Filter size={12} className="text-slate-400" />
                    <select
                      value={locFilterCategory}
                      onChange={e => setLocFilterCategory(e.target.value)}
                      className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="Semua">Semua Kategori Area</option>
                      {LOCATION_AREA_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* List Cards */}
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredLocations.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Belum ada lokasi untuk kriteria ini. Gunakan panel di sebelah kiri untuk menambah, atau tekan tombol Restorasi Default.
                  </div>
                ) : (
                  filteredLocations.map(loc => (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/80 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl mt-0.5">
                          <MapPin size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-slate-900 text-xs">{loc.name}</h4>
                            {loc.category && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {loc.category}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${getRegionBadgeStyle(loc.region)}`}>
                              {loc.region}
                            </span>
                          </div>
                          {loc.description && (
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                              {loc.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditLocation(loc)}
                          className="p-2 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                          title="Edit Lokasi"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteLocationPrompt(loc)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Hapus Lokasi"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. WHITELIST EMAIL TAB */}
      {activeTab === 'whitelist' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="whitelist-layout">
          
          {/* Left Form Panel */}
          <div className="lg:col-span-5 bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-xs h-fit space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 bg-[#007AFF]/10 text-[#007AFF] rounded-2xl flex items-center justify-center">
                <UserCheck size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Tambah Otorisasi Access</h3>
                <p className="text-xs text-slate-400 font-medium">Masukkan alamat email berizin</p>
              </div>
            </div>

            <form onSubmit={handleSubmitEmail} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Alamat Email Google</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-slate-400" size={16} />
                  <input 
                    type="email" 
                    required
                    placeholder="contoh@gmail.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Peran / Otoritas Akses</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as 'admin' | 'viewer')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 cursor-pointer"
                >
                  <option value="viewer">Viewer (Hanya Melihat & Baca)</option>
                  <option value="admin">Administrator (Bisa Tambah, Edit & Hapus)</option>
                </select>
              </div>

              <button 
                type="submit"
                disabled={submittingEmail}
                className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white font-black py-2.5 px-4 rounded-2xl text-xs transition-all shadow-md shadow-[#007AFF]/10 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={16} />
                <span>{submittingEmail ? 'Menyimpan...' : 'Berikan Izin Akses'}</span>
              </button>
            </form>

            <div className="border border-amber-200 bg-amber-50 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-900 leading-relaxed font-medium">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span className="font-extrabold block text-amber-950 mb-0.5">Sistem Pengaman Utama</span> 
                Email administrator utama <span className="underline font-bold">adi.indawanto@gmail.com</span> terproteksi penuh secara bawaan dan tidak dapat dihapus.
              </div>
            </div>
          </div>

          {/* Right Whitelisted Emails List */}
          <div className="lg:col-span-7 bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Daftar Akun Berizin</h3>
                <p className="text-xs text-slate-400 font-medium">Total email yang memiliki akses saat ini</p>
              </div>
              <span className="text-xs font-extrabold text-[#007AFF] bg-[#007AFF]/10 px-3 py-1.5 rounded-full">
                {emails.length + 1} Pengguna Terdaftar
              </span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1" id="whitelist-list">
              {/* Master Admin Entry */}
              <div className="flex items-center justify-between p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2 flex-wrap">
                      <span>adi.indawanto@gmail.com</span>
                      <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase">
                        Developer / Admin
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Sistem Administrator Terproteksi</p>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-800 font-extrabold px-2.5 py-1 bg-emerald-100 rounded-full">Permanen</span>
              </div>

              {/* Dynamic emails from DB */}
              {emails.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Belum ada staf tambahan yang didaftarkan. Gunakan panel kiri untuk menambahkan.
                </div>
              ) : (
                emails.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/80 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-100 text-slate-500 rounded-xl">
                        <Mail size={18} />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2 flex-wrap">
                          <span>{item.email}</span>
                          {(item.role === 'admin' || !item.role) ? (
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                              Admin
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                              Viewer
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Diberikan oleh: {item.addedBy || 'Sistem'} &bull; {item.addedAt}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeleteEmailPrompt(item)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Cabut Akses"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. DATABASE RESET TAB */}
      {activeTab === 'database' && (
        <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-black">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Pemeliharaan Basis Data TMII</h3>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">
                Fungsi administrator khusus untuk mengosongkan/mereset basis data setiap modul aset kembali ke angka 0.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Fixed Assets Clear */}
            <div className="p-5 border border-slate-200/80 rounded-2xl bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Fixed Assets</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {stats.fixedAssets} <span className="text-xs font-bold text-slate-400">Data</span>
                </span>
              </div>
              <button
                onClick={() => handleClearCollectionPrompt('fixed_asset', 'Fixed Assets')}
                disabled={clearing !== null}
                className="w-full text-center py-2.5 px-4 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {clearing === 'fixed_asset' ? 'Membersihkan...' : 'Kosongkan Fixed Assets'}
              </button>
            </div>

            {/* CCTV Clear */}
            <div className="p-5 border border-slate-200/80 rounded-2xl bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sistem CCTV</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {stats.cctvs} <span className="text-xs font-bold text-slate-400">Data</span>
                </span>
              </div>
              <button
                onClick={() => handleClearCollectionPrompt('cctv', 'Sistem CCTV')}
                disabled={clearing !== null}
                className="w-full text-center py-2.5 px-4 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {clearing === 'cctv' ? 'Membersihkan...' : 'Kosongkan Data CCTV'}
              </button>
            </div>

            {/* Animal Assets Clear */}
            <div className="p-5 border border-slate-200/80 rounded-2xl bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Aset Satwa</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {stats.animals} <span className="text-xs font-bold text-slate-400">Data</span>
                </span>
              </div>
              <button
                onClick={() => handleClearCollectionPrompt('animal', 'Aset Satwa')}
                disabled={clearing !== null}
                className="w-full text-center py-2.5 px-4 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {clearing === 'animal' ? 'Membersihkan...' : 'Kosongkan Aset Satwa'}
              </button>
            </div>

            {/* MEP Clear */}
            <div className="p-5 border border-slate-200/80 rounded-2xl bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sistem MEP</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {stats.meps} <span className="text-xs font-bold text-slate-400">Data</span>
                </span>
              </div>
              <button
                onClick={() => handleClearCollectionPrompt('mep', 'Sistem MEP')}
                disabled={clearing !== null}
                className="w-full text-center py-2.5 px-4 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {clearing === 'mep' ? 'Membersihkan...' : 'Kosongkan Data MEP'}
              </button>
            </div>

            {/* Museum Clear */}
            <div className="p-5 border border-slate-200/80 rounded-2xl bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Koleksi Museum</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {stats.museumCollections} <span className="text-xs font-bold text-slate-400">Data</span>
                </span>
              </div>
              <button
                onClick={() => handleClearCollectionPrompt('museum_collection', 'Koleksi Museum')}
                disabled={clearing !== null}
                className="w-full text-center py-2.5 px-4 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {clearing === 'museum_collection' ? 'Membersihkan...' : 'Kosongkan Koleksi Museum'}
              </button>
            </div>

            {/* Tasks Clear */}
            <div className="p-5 border border-slate-200/80 rounded-2xl bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tugas & Pekerjaan</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {stats.tasks} <span className="text-xs font-bold text-slate-400">Data</span>
                </span>
              </div>
              <button
                onClick={() => handleClearCollectionPrompt('task', 'Tugas & Pekerjaan')}
                disabled={clearing !== null}
                className="w-full text-center py-2.5 px-4 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {clearing === 'task' ? 'Membersihkan...' : 'Kosongkan Tugas & Pekerjaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      <AnimatePresence>
        {editingLocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingLocation(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                    <Pencil size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Edit Data Lokasi Aset</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Perbarui informasi lokasi penempatan</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingLocation(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditLocation} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Nama Lokasi / Anjungan *
                  </label>
                  <input
                    type="text"
                    required
                    value={editLocName}
                    onChange={e => setEditLocName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Wilayah TMII *
                    </label>
                    <select
                      value={editLocRegion}
                      onChange={e => setEditLocRegion(e.target.value as TmiiRegionName)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="Wilayah Utara">Wilayah Utara</option>
                      <option value="Wilayah Selatan">Wilayah Selatan</option>
                      <option value="Wilayah Barat">Wilayah Barat</option>
                      <option value="Wilayah Timur">Wilayah Timur</option>
                      <option value="Wilayah Pusat">Wilayah Pusat</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Kategori Area *
                    </label>
                    <select
                      value={editLocCategory}
                      onChange={e => setEditLocCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      {LOCATION_AREA_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Keterangan Tambahan
                  </label>
                  <textarea
                    rows={2}
                    value={editLocDescription}
                    onChange={e => setEditLocDescription(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingLocation(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingEditLoc}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {savingEditLoc && <RefreshCw size={12} className="animate-spin" />}
                    <span>{savingEditLoc ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Toast Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 max-w-sm w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex items-start gap-3.5"
          >
            <div className={`p-2 rounded-xl shrink-0 ${
              notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
              notification.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {notification.type === 'success' && <Check size={18} />}
              {notification.type === 'error' && <AlertCircle size={18} />}
              {notification.type === 'info' && <HelpCircle size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 text-xs font-extrabold">
                {notification.type === 'success' ? 'Berhasil' :
                 notification.type === 'error' ? 'Kesalahan' : 'Informasi'}
              </p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed font-medium">
                {notification.message}
              </p>
            </div>
            <button 
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>      {/* Add Category Modal */}
      <AnimatePresence>
        {isAddCatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddCatModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                    <FolderTree size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Tambah Kategori & Jenis Aset Baru</h3>
                    <p className="text-[11px] font-medium text-slate-500">Master aturan kategori untuk form input aset TMII</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Nama Kategori Aset *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Contoh: Kendaraan & Transportasi"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Daftar Jenis Aset (Sub-Turunan) *
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Masukkan nama jenis aset dipisahkan koma atau baris baru.
                  </p>
                  <textarea
                    rows={4}
                    required
                    value={newCatTypesInput}
                    onChange={e => setNewCatTypesInput(e.target.value)}
                    placeholder="Contoh: Golf Car, Shuttle Bus, Sepeda Listrik, Mobil Operasional"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddCatModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCat}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submittingCat && <RefreshCw size={12} className="animate-spin" />}
                    <span>{submittingCat ? 'Menyimpan...' : 'Tambah Kategori'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Category Modal */}
      <AnimatePresence>
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCategory(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                    <Pencil size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Edit Kategori & Jenis Aset</h3>
                    <p className="text-[11px] font-medium text-slate-500">Perbarui nama kategori dan jenis aset turunan</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveCategoryEdit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Nama Kategori Aset *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCatName}
                    onChange={e => setEditCatName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Daftar Jenis Aset (Sub-Turunan) *
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Pisahkan nama jenis aset menggunakan koma atau baris baru.
                  </p>
                  <textarea
                    rows={6}
                    required
                    value={editCatTypesInput}
                    onChange={e => setEditCatTypesInput(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingEditCat}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {savingEditCat && <RefreshCw size={12} className="animate-spin" />}
                    <span>{savingEditCat ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md z-10 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmModal.type === 'clear_db' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-600'
                }`}>
                  {confirmModal.type === 'clear_db' ? <Trash2 size={22} /> : <AlertTriangle size={22} />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                    {confirmModal.type === 'clear_db' && 'Kosongkan Basis Data?'}
                    {confirmModal.type === 'delete_email' && 'Cabut Otorisasi Akses?'}
                    {confirmModal.type === 'delete_location' && 'Hapus Lokasi Aset?'}
                    {confirmModal.type === 'seed_locations' && 'Restorasi Lokasi Default TMII?'}
                    {confirmModal.type === 'delete_category' && 'Hapus Kategori Aset?'}
                    {confirmModal.type === 'seed_categories' && 'Restorasi Kategori Default Spreadsheet?'}
                  </h3>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-medium">
                    {confirmModal.type === 'clear_db' && (
                      <>Apakah Anda yakin ingin menghapus seluruh data <span className="font-bold text-slate-900">{confirmModal.displayName}</span>? Tindakan ini permanen.</>
                    )}
                    {confirmModal.type === 'delete_email' && (
                      <>Apakah Anda yakin ingin mencabut hak akses masuk untuk email <span className="font-bold text-slate-900">{confirmModal.displayName}</span>?</>
                    )}
                    {confirmModal.type === 'delete_location' && (
                      <>Apakah Anda yakin ingin menghapus lokasi <span className="font-bold text-slate-900">{confirmModal.displayName}</span> dari pilihan sistem?</>
                    )}
                    {confirmModal.type === 'seed_locations' && (
                      <>Ini akan merestorasi seluruh daftar lokasi bawaan 5 wilayah TMII (Utara, Selatan, Barat, Timur, Pusat) ke dalam database.</>
                    )}
                    {confirmModal.type === 'delete_category' && (
                      <>Apakah Anda yakin ingin menghapus kategori <span className="font-bold text-slate-900">{confirmModal.displayName}</span> dari database?</>
                    )}
                    {confirmModal.type === 'seed_categories' && (
                      <>Ini akan merestorasi seluruh kategori dan jenis aset turunan sesuai master spreadsheet TMII ke dalam database.</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { type, targetKey, displayName } = confirmModal;
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    if (type === 'clear_db') {
                      await executeClearCollection(targetKey as any, displayName);
                    } else if (type === 'delete_email') {
                      await executeDeleteEmail(targetKey, displayName);
                    } else if (type === 'delete_location') {
                      await executeDeleteLocation(targetKey, displayName);
                    } else if (type === 'seed_locations') {
                      await executeSeedLocations();
                    } else if (type === 'delete_category') {
                      await executeDeleteCategory(targetKey, displayName);
                    } else if (type === 'seed_categories') {
                      await executeSeedCategories();
                    }
                  }}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    confirmModal.type === 'clear_db' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black'
                  }`}
                >
                  {confirmModal.type === 'clear_db' && 'Ya, Kosongkan'}
                  {confirmModal.type === 'delete_email' && 'Ya, Cabut Akses'}
                  {confirmModal.type === 'delete_location' && 'Ya, Hapus Lokasi'}
                  {confirmModal.type === 'seed_locations' && 'Ya, Restorasi Sekarang'}
                  {confirmModal.type === 'delete_category' && 'Ya, Hapus Kategori'}
                  {confirmModal.type === 'seed_categories' && 'Ya, Restorasi Sekarang'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
