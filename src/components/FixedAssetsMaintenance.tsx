import React, { useState, useEffect, useMemo } from 'react';
import { FixedAsset, AppTheme, AssetMaintenance } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  Wrench, 
  Plus, 
  Search, 
  Calendar, 
  DollarSign, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Download, 
  Trash2, 
  Edit3, 
  X, 
  RefreshCw, 
  Building2, 
  Tag, 
  MapPin, 
  TrendingUp, 
  Layers, 
  Filter, 
  ChevronRight, 
  Eye, 
  Calculator,
  Printer,
  Sparkles
} from 'lucide-react';
import { exportToExcel } from '../lib/excel';
import { motion, AnimatePresence } from 'framer-motion';

interface FixedAssetsMaintenanceProps {
  assets: FixedAsset[];
  theme: AppTheme;
  onUpdateAsset?: (id: string, asset: Partial<FixedAsset>) => Promise<void>;
  currentUserDisplayName?: string | null;
  isAdmin?: boolean;
}

export default function FixedAssetsMaintenance({
  assets,
  theme,
  onUpdateAsset,
  currentUserDisplayName,
  isAdmin = true
}: FixedAssetsMaintenanceProps) {
  // Real-time maintenance logs state
  const [maintenances, setMaintenances] = useState<AssetMaintenance[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'summary' (Akumulasi per Aset) or 'logs' (Riwayat Pemeliharaan)
  const [activeTab, setActiveTab] = useState<'summary' | 'logs'>('summary');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<AssetMaintenance | null>(null);
  const [detailAsset, setDetailAsset] = useState<FixedAsset | null>(null);
  const [deletingLog, setDeletingLog] = useState<AssetMaintenance | null>(null);

  // Form States
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [costInput, setCostInput] = useState<string>('');
  const [vendorTechnician, setVendorTechnician] = useState('');
  const [status, setStatus] = useState<'Selesai' | 'Dalam Proses' | 'Dijadwalkan'>('Selesai');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast Auto-hide
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Subscribe to Firestore asset_maintenance collection
  useEffect(() => {
    const q = query(collection(db, 'asset_maintenance'), orderBy('maintenanceDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as AssetMaintenance[];
      setMaintenances(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching maintenance records:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Format currency helpers
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Map of total maintenance cost accumulated per assetId
  const assetMaintenanceSummaryMap = useMemo(() => {
    const map: Record<string, { totalCost: number; count: number; lastDate: string; logs: AssetMaintenance[] }> = {};
    maintenances.forEach(item => {
      if (!map[item.assetId]) {
        map[item.assetId] = { totalCost: 0, count: 0, lastDate: '', logs: [] };
      }
      map[item.assetId].totalCost += item.cost || 0;
      map[item.assetId].count += 1;
      map[item.assetId].logs.push(item);
      if (!map[item.assetId].lastDate || item.maintenanceDate > map[item.assetId].lastDate) {
        map[item.assetId].lastDate = item.maintenanceDate;
      }
    });
    return map;
  }, [maintenances]);

  // Categories list derived from assets
  const categoriesList = useMemo(() => {
    const setCat = new Set<string>();
    assets.forEach(a => {
      if (a.category) setCat.add(a.category);
    });
    return ['Semua', ...Array.from(setCat)];
  }, [assets]);

  // Filtered Assets for Tab 1 (Summary per asset)
  const filteredAssetSummaries = useMemo(() => {
    return assets.filter(asset => {
      const matchSearch = 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.location && asset.location.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = selectedCategory === 'Semua' || asset.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [assets, searchTerm, selectedCategory]);

  // Filtered Logs for Tab 2 (Seluruh Log Pemeliharaan)
  const filteredLogs = useMemo(() => {
    return maintenances.filter(log => {
      const matchSearch = 
        log.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.vendorTechnician && log.vendorTechnician.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = selectedCategory === 'Semua' || log.assetCategory === selectedCategory;
      const matchStatus = selectedStatus === 'Semua' || log.status === selectedStatus;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [maintenances, searchTerm, selectedCategory, selectedStatus]);

  // Total Metrics Calculations
  const metrics = useMemo(() => {
    const totalCostAll = maintenances.reduce((acc, curr) => acc + (curr.cost || 0), 0);
    const totalCount = maintenances.length;
    const assetsWithMaintenanceCount = Object.keys(assetMaintenanceSummaryMap).length;
    const avgCostPerService = totalCount > 0 ? Math.round(totalCostAll / totalCount) : 0;
    return {
      totalCostAll,
      totalCount,
      assetsWithMaintenanceCount,
      avgCostPerService
    };
  }, [maintenances, assetMaintenanceSummaryMap]);

  // Asset selected in form
  const currentFormAsset = useMemo(() => {
    return assets.find(a => a.id === selectedAssetId) || null;
  }, [assets, selectedAssetId]);

  // Filtered assets for dropdown in modal
  const dropdownFilteredAssets = useMemo(() => {
    if (!assetSearchQuery.trim()) return assets.slice(0, 30);
    const query = assetSearchQuery.toLowerCase();
    return assets.filter(a => 
      a.name.toLowerCase().includes(query) || 
      a.code.toLowerCase().includes(query) ||
      a.location.toLowerCase().includes(query)
    ).slice(0, 30);
  }, [assets, assetSearchQuery]);

  // Open add modal pre-filled
  const handleOpenAddModal = (preselectedAsset?: FixedAsset) => {
    if (preselectedAsset) {
      setSelectedAssetId(preselectedAsset.id);
    } else {
      setSelectedAssetId('');
    }
    setAssetSearchQuery('');
    setMaintenanceDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setCostInput('');
    setVendorTechnician('');
    setStatus('Selesai');
    setNotes('');
    setEditingLog(null);
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (log: AssetMaintenance) => {
    setEditingLog(log);
    setSelectedAssetId(log.assetId);
    setMaintenanceDate(log.maintenanceDate);
    setDescription(log.description);
    setCostInput(String(log.cost));
    setVendorTechnician(log.vendorTechnician || '');
    setStatus(log.status);
    setNotes(log.notes || '');
    setIsAddModalOpen(true);
  };

  // Submit Handler
  const handleSubmitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      setToastMessage('Pilih aset terlebih dahulu!');
      return;
    }
    const costNum = parseFloat(costInput.replace(/[^0-9]/g, '')) || 0;
    if (costNum < 0) {
      setToastMessage('Biaya maintenance harus berupa angka positif!');
      return;
    }

    const targetAsset = assets.find(a => a.id === selectedAssetId);
    if (!targetAsset) return;

    setIsSubmitting(true);
    try {
      if (editingLog) {
        // Update existing log
        await updateDoc(doc(db, 'asset_maintenance', editingLog.id), {
          assetId: targetAsset.id,
          assetCode: targetAsset.code,
          assetName: targetAsset.name,
          assetCategory: targetAsset.category || 'Lainnya',
          assetLocation: targetAsset.location,
          maintenanceDate,
          description,
          cost: costNum,
          vendorTechnician,
          status,
          notes,
          createdByName: currentUserDisplayName || 'Staff TMII'
        });
        setToastMessage(`Catatan pemeliharaan aset ${targetAsset.code} berhasil diperbarui.`);
      } else {
        // Add new log
        await addDoc(collection(db, 'asset_maintenance'), {
          assetId: targetAsset.id,
          assetCode: targetAsset.code,
          assetName: targetAsset.name,
          assetCategory: targetAsset.category || 'Lainnya',
          assetLocation: targetAsset.location,
          maintenanceDate,
          description,
          cost: costNum,
          vendorTechnician,
          status,
          notes,
          createdByName: currentUserDisplayName || 'Staff TMII',
          createdAt: new Date().toISOString()
        });

        // Optionally update asset lastMaintenance field if applicable
        if (onUpdateAsset) {
          await onUpdateAsset(targetAsset.id, {
            lastMaintenance: maintenanceDate,
            status: status === 'Dalam Proses' ? 'Diperbaiki' : targetAsset.status
          });
        }
        setToastMessage(`Berhasil mencatat pemeliharaan untuk aset ${targetAsset.code} (${targetAsset.name}).`);
      }

      setIsAddModalOpen(false);
      setEditingLog(null);
    } catch (err: any) {
      console.error('Error saving maintenance:', err);
      setToastMessage(`Gagal menyimpan catatan: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Log Handler
  const handleDeleteLog = async () => {
    if (!deletingLog) return;
    try {
      await deleteDoc(doc(db, 'asset_maintenance', deletingLog.id));
      setToastMessage(`Catatan pemeliharaan tanggal ${deletingLog.maintenanceDate} dihapus.`);
      setDeletingLog(null);
    } catch (err: any) {
      console.error('Error deleting maintenance record:', err);
      setToastMessage(`Gagal menghapus catatan: ${err.message}`);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (activeTab === 'summary') {
      const exportData = filteredAssetSummaries.map((asset, idx) => {
        const stats = assetMaintenanceSummaryMap[asset.id] || { totalCost: 0, count: 0, lastDate: '-' };
        const totalInvest = (asset.acquisitionCost || 0) + stats.totalCost;
        const ratio = asset.acquisitionCost > 0 ? ((stats.totalCost / asset.acquisitionCost) * 100).toFixed(1) + '%' : '0%';
        return {
          No: idx + 1,
          'Kode Aset': asset.code,
          'Nama Aset': asset.name,
          Kategori: asset.category || '-',
          Lokasi: asset.location,
          Kondisi: asset.condition,
          'Nilai Perolehan (Rp)': asset.acquisitionCost || 0,
          'Total Akumulasi Maintenance (Rp)': stats.totalCost,
          'Total Nilai Investasi Aset (Rp)': totalInvest,
          'Rasio Biaya Maintenance (%)': ratio,
          'Frekuensi Servis': stats.count,
          'Pemeliharaan Terakhir': stats.lastDate || '-'
        };
      });
      exportToExcel(exportData, `Ringkasan_Amortisasi_Biaya_Maintenance_${new Date().toISOString().split('T')[0]}`, 'Ringkasan Maintenance');
    } else {
      const exportData = filteredLogs.map((log, idx) => ({
        No: idx + 1,
        'Tanggal Maintenance': log.maintenanceDate,
        'Kode Aset': log.assetCode,
        'Nama Aset': log.assetName,
        Kategori: log.assetCategory || '-',
        Lokasi: log.assetLocation || '-',
        'Keterangan Pemeliharaan': log.description,
        'Biaya Pemeliharaan (Rp)': log.cost,
        Status: log.status,
        'Teknisi / Vendor': log.vendorTechnician || '-',
        'Catatan / Garansi': log.notes || '-',
        'Petugas Input': log.createdByName || '-'
      }));
      exportToExcel(exportData, `Log_Pemeliharaan_Aset_TMII_${new Date().toISOString().split('T')[0]}`, 'Log Maintenance');
    }
    setToastMessage('Laporan Excel berhasil diunduh.');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-bold"
          >
            <Sparkles size={16} className="text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER BANNER */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <Wrench size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Pemeliharaan & Servis Aset Tetap
              </h1>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Maintenance DB
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-2xl">
              Modul pengisian riwayat perawatan, servis berkala, biaya perbaikan, serta kalkulasi amortisasi dan akumulasi pengeluaran pemeliharaan per aset secara terpadu.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer border border-slate-200"
          >
            <Download size={15} />
            <span>Ekspor Excel</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-extrabold transition-all shadow-md cursor-pointer transform hover:-translate-y-0.5"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <Plus size={16} />
            <span>Catat Pemeliharaan Baru</span>
          </button>
        </div>
      </div>

      {/* METRICS STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Akumulasi Biaya</p>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              {formatRupiah(metrics.totalCostAll)}
            </h3>
            <p className="text-[10px] text-amber-700 font-bold mt-1">Seluruh Riwayat Pemeliharaan</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Transaksi Servis</p>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              {metrics.totalCount} Kali
            </h3>
            <p className="text-[10px] text-emerald-700 font-bold mt-1">Catatan Terverifikasi DB</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Aset Pernah Dirawat</p>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              {metrics.assetsWithMaintenanceCount} / {assets.length} Aset
            </h3>
            <p className="text-[10px] text-indigo-700 font-bold mt-1">
              {assets.length > 0 ? ((metrics.assetsWithMaintenanceCount / assets.length) * 100).toFixed(0) : 0}% dari Total Aset Tetap
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-800 border border-indigo-200/60 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rata-Rata Biaya Servis</p>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              {formatRupiah(metrics.avgCostPerService)}
            </h3>
            <p className="text-[10px] text-sky-700 font-bold mt-1">Per Satu Kali Maintenance</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-800 border border-sky-200/60 flex items-center justify-center shrink-0">
            <Calculator size={20} />
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS & FILTER BAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          {/* View Mode Switcher Pills */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Calculator size={14} />
              <span>Ringkasan Amortisasi Biaya per Aset</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Layers size={14} />
              <span>Seluruh Riwayat Log Maintenance ({filteredLogs.length})</span>
            </button>
          </div>

          <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
            <Clock size={14} className="text-amber-600" />
            <span>Diperbarui real-time dari Firestore</span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'summary' ? "Cari nama aset, kode aset, lokasi..." : "Cari nama aset, keterangan maintenance, vendor..."}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Filter size={13} className="text-slate-400" />
              <span className="font-bold text-slate-600">Kategori:</span>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-transparent font-extrabold text-slate-900 focus:outline-none cursor-pointer"
              >
                {categoriesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {activeTab === 'logs' && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-600">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="bg-transparent font-extrabold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Dalam Proses">Dalam Proses</option>
                  <option value="Dijadwalkan">Dijadwalkan</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN VIEW CONTENT AREA */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-amber-600 mx-auto" />
          <p className="text-xs font-bold text-slate-600">Memuat data pemeliharaan aset dari database...</p>
        </div>
      ) : activeTab === 'summary' ? (
        /* TAB 1: SUMMARY AMORTISASI BIAYA PER ASET */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-extrabold uppercase tracking-wider">
                  <th className="p-4">Kode & Nama Aset</th>
                  <th className="p-4">Kategori & Lokasi</th>
                  <th className="p-4 text-right">Nilai Perolehan Aset</th>
                  <th className="p-4 text-right">Akumulasi Maintenance</th>
                  <th className="p-4 text-right">Total Investasi Aset</th>
                  <th className="p-4 text-center">Frekuensi Servis</th>
                  <th className="p-4 text-center">Servis Terakhir</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredAssetSummaries.map((asset) => {
                  const summary = assetMaintenanceSummaryMap[asset.id] || { totalCost: 0, count: 0, lastDate: '-' };
                  const acquisitionCost = asset.acquisitionCost || 0;
                  const totalInvestment = acquisitionCost + summary.totalCost;
                  const costRatioPercent = acquisitionCost > 0 ? ((summary.totalCost / acquisitionCost) * 100) : 0;

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black tracking-wide shrink-0">
                            {asset.code}
                          </span>
                          <div>
                            <span className="font-extrabold text-slate-900 text-xs block leading-tight">
                              {asset.name}
                            </span>
                            {asset.brand && (
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                Merk: {asset.brand}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="inline-block text-[11px] font-bold text-slate-700">
                            {asset.category || 'Tanpa Kategori'}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <MapPin size={11} className="text-amber-600 shrink-0" />
                            <span className="truncate max-w-[160px]">{asset.location}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-right font-bold text-slate-700">
                        {formatRupiah(acquisitionCost)}
                      </td>

                      <td className="p-4 text-right">
                        <div className="font-black text-amber-900">
                          {formatRupiah(summary.totalCost)}
                        </div>
                        {acquisitionCost > 0 && summary.totalCost > 0 && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {costRatioPercent.toFixed(1)}% Nilai Aset
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right font-black text-emerald-800">
                        {formatRupiah(totalInvestment)}
                      </td>

                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                          summary.count > 0 
                            ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' 
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {summary.count} Servis
                        </span>
                      </td>

                      <td className="p-4 text-center text-xs font-semibold text-slate-600 whitespace-nowrap">
                        {summary.lastDate || '-'}
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenAddModal(asset)}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Tambah Maintenance"
                          >
                            <Plus size={12} />
                            <span>Servis</span>
                          </button>

                          {summary.count > 0 && (
                            <button
                              type="button"
                              onClick={() => setDetailAsset(asset)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-[10px] font-bold transition-all border border-amber-200 flex items-center gap-1 cursor-pointer"
                              title="Lihat Riwayat Aset Ini"
                            >
                              <Eye size={12} />
                              <span>Riwayat</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredAssetSummaries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-500 font-bold">
                      Tidak ada aset yang sesuai dengan kriteria pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 2: SELURUH LOG PEMELIHARAAN */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-extrabold uppercase tracking-wider">
                  <th className="p-4">Tanggal Maintenance</th>
                  <th className="p-4">Kode & Nama Aset</th>
                  <th className="p-4">Keterangan Pemeliharaan</th>
                  <th className="p-4 text-right">Biaya (Rp)</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4">Teknisi / Vendor</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Calendar size={13} className="text-amber-600 shrink-0" />
                        <span>{log.maintenanceDate}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div>
                        <span className="font-extrabold text-slate-900 text-xs block leading-snug">
                          {log.assetName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-mono font-bold">
                            {log.assetCode}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {log.assetLocation || '-'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 max-w-xs">
                      <p className="text-slate-800 leading-relaxed line-clamp-2 text-xs font-semibold">
                        {log.description}
                      </p>
                      {log.notes && (
                        <p className="text-[10px] text-slate-500 italic mt-0.5">
                          Garansi/Catatan: {log.notes}
                        </p>
                      )}
                    </td>

                    <td className="p-4 text-right font-black text-amber-900 whitespace-nowrap">
                      {formatRupiah(log.cost)}
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        log.status === 'Selesai'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          : log.status === 'Dalam Proses'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                      }`}>
                        {log.status === 'Selesai' && <CheckCircle2 size={12} />}
                        {log.status === 'Dalam Proses' && <RefreshCw size={12} className="animate-spin" />}
                        {log.status === 'Dijadwalkan' && <Clock size={12} />}
                        <span>{log.status}</span>
                      </span>
                    </td>

                    <td className="p-4 text-xs font-semibold text-slate-700">
                      {log.vendorTechnician || '-'}
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(log)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Edit Catatan"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingLog(log)}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Hapus Catatan"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 font-bold">
                      Belum ada catatan pemeliharaan yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL INPUT / EDIT MAINTENANCE */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-xl z-10 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <Wrench size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {editingLog ? 'Edit Catatan Pemeliharaan' : 'Catat Pemeliharaan / Servis Aset Baru'}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-500">
                      Input rincian tanggal, deskripsi pekerjaan, serta biaya yang dikeluarkan atas aset
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmitMaintenance} className="space-y-4">
                {/* Searchable Asset Selector */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Pilih Aset Tetap *
                  </label>
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={currentFormAsset ? `${currentFormAsset.code} - ${currentFormAsset.name}` : assetSearchQuery}
                      onChange={e => {
                        setSelectedAssetId('');
                        setAssetSearchQuery(e.target.value);
                        setIsAssetDropdownOpen(true);
                      }}
                      onFocus={() => setIsAssetDropdownOpen(true)}
                      placeholder="Cari & pilih aset dari database..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    {currentFormAsset && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssetId('');
                          setAssetSearchQuery('');
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        Ganti Aset
                      </button>
                    )}

                    {isAssetDropdownOpen && !currentFormAsset && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {dropdownFilteredAssets.map((asset) => (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => {
                              setSelectedAssetId(asset.id);
                              setIsAssetDropdownOpen(false);
                            }}
                            className="w-full p-3 text-left hover:bg-amber-50 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[9px] font-mono font-bold">
                                  {asset.code}
                                </span>
                                <span className="font-extrabold text-slate-900 text-xs">
                                  {asset.name}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Kategori: {asset.category || '-'} | Lokasi: {asset.location}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 shrink-0">
                              {formatRupiah(asset.acquisitionCost || 0)}
                            </span>
                          </button>
                        ))}
                        {dropdownFilteredAssets.length === 0 && (
                          <div className="p-4 text-center text-xs text-slate-400 font-medium">
                            Aset tidak ditemukan.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Preview Selected Asset Info Card */}
                  {currentFormAsset && (
                    <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 flex items-center justify-between gap-3 mt-2">
                      <div className="space-y-0.5">
                        <div className="text-xs font-extrabold text-slate-900">
                          {currentFormAsset.name} ({currentFormAsset.code})
                        </div>
                        <div className="text-[10px] font-semibold text-slate-600">
                          Lokasi: {currentFormAsset.location} | Kondisi: <strong className="text-amber-800">{currentFormAsset.condition}</strong>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-500 font-medium">Harga Perolehan:</div>
                        <div className="text-xs font-extrabold text-slate-900">
                          {formatRupiah(currentFormAsset.acquisitionCost || 0)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tanggal & Biaya Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Tanggal Pemeliharaan *
                    </label>
                    <input
                      type="date"
                      required
                      value={maintenanceDate}
                      onChange={e => setMaintenanceDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Biaya Pemeliharaan (Rp) *
                    </label>
                    <input
                      type="text"
                      required
                      value={costInput}
                      onChange={e => setCostInput(e.target.value)}
                      placeholder="Contoh: 1500000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Description Textarea */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Keterangan Pekerjaan Pemeliharaan *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Jelaskan detail perbaikan, misal: Penggantian oli mesin, ganti bearing, service berkala..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* Vendor / Status Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Teknisi / Vendor / Tim Pemelihara
                    </label>
                    <input
                      type="text"
                      value={vendorTechnician}
                      onChange={e => setVendorTechnician(e.target.value)}
                      placeholder="Contoh: PT Servis Utama / Budi (Tim MEP)"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Status Pekerjaan *
                    </label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                    >
                      <option value="Selesai">Selesai</option>
                      <option value="Dalam Proses">Dalam Proses</option>
                      <option value="Dijadwalkan">Dijadwalkan</option>
                    </select>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Catatan Tambahan / Garansi (Opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Contoh: Garansi sparepart 6 bulan sampai Desember 2026"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedAssetId}
                    className="px-6 py-2.5 text-white text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                    <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Catatan Pemeliharaan'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL RIWAYAT MAINTENANCE SPESIFIK ASET */}
      <AnimatePresence>
        {detailAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailAsset(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-2xl z-10 space-y-5 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                    <Wrench size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Riwayat Pemeliharaan: {detailAsset.name}
                    </h3>
                    <p className="text-[11px] font-mono font-bold text-amber-800">
                      Kode: {detailAsset.code} | Lokasi: {detailAsset.location}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailAsset(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Asset Metric Card */}
              {(() => {
                const logs = assetMaintenanceSummaryMap[detailAsset.id]?.logs || [];
                const totalCost = logs.reduce((acc, c) => acc + c.cost, 0);
                return (
                  <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Harga Perolehan</div>
                      <div className="text-xs font-black text-slate-900 mt-0.5">
                        {formatRupiah(detailAsset.acquisitionCost || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-amber-800 uppercase">Total Maintenance</div>
                      <div className="text-xs font-black text-amber-900 mt-0.5">
                        {formatRupiah(totalCost)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">Total Investasi Aset</div>
                      <div className="text-xs font-black text-emerald-900 mt-0.5">
                        {formatRupiah((detailAsset.acquisitionCost || 0) + totalCost)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* History Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-amber-600" />
                  <span>Daftar Transaksi Perbaikan / Servis ({assetMaintenanceSummaryMap[detailAsset.id]?.count || 0})</span>
                </h4>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {(assetMaintenanceSummaryMap[detailAsset.id]?.logs || []).map((log) => (
                    <div key={log.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">{log.maintenanceDate}</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[9px] rounded-full">
                            {log.status}
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {log.description}
                        </p>
                        {log.vendorTechnician && (
                          <div className="text-[10px] text-slate-500 font-semibold">
                            Teknisi: {log.vendorTechnician}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-amber-900 text-xs">
                          {formatRupiah(log.cost)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(assetMaintenanceSummaryMap[detailAsset.id]?.logs || []).length === 0 && (
                    <div className="p-8 text-center text-xs font-bold text-slate-400">
                      Belum ada catatan pemeliharaan untuk aset ini.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const target = detailAsset;
                    setDetailAsset(null);
                    handleOpenAddModal(target);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Tambah Servis Baru</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {deletingLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingLog(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm z-10 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <AlertCircle size={24} />
              </div>

              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Hapus Catatan Pemeliharaan?</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Catatan maintenance aset <strong className="text-slate-900">{deletingLog.assetName}</strong> tanggal {deletingLog.maintenanceDate} akan dihapus secara permanen dari database.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingLog(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteLog}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
                >
                  Ya, Hapus Catatan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
