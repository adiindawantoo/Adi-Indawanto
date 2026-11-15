import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  FileSpreadsheet,
  Settings,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Coins,
  MapPin,
  CalendarDays,
  ArrowUpDown,
  Paperclip,
  Upload,
  Loader2,
  ExternalLink,
  AlertCircle,
  Wrench,
  Printer,
  Download,
  History,
  ArrowRight,
  FileText,
  Calculator,
  Building2,
  CheckCircle2,
  X,
  FileCheck,
  Camera,
  QrCode,
  Sparkles,
  RefreshCw,
  FileCode2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Clock
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { db, getCachedDriveToken, requestGoogleDriveAccess } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { FixedAsset, AppTheme, ConfiguredLocation, ConfiguredCategory, DEFAULT_ASSET_LOCATIONS, DEFAULT_ASSET_CATEGORIES, TmiiRegionName, AssetMaintenance, AssetTransfer } from '../types';
import { exportToExcel } from '../lib/excel';
import ImportDataPanel from './ImportDataPanel';
import LocationAutoComplete from './LocationAutoComplete';
import TmiiLogo from './TmiiLogo';
import QRScannerModal from './QRScannerModal';
import AssetDepreciationScheduleModal from './AssetDepreciationScheduleModal';
import BatchAssetCodeGeneratorModal from './BatchAssetCodeGeneratorModal';
import { 
  TAX_DEPRECIATION_GROUPS, 
  parseUsefulLife, 
  formatRupiah, 
  calculateAssetDepreciationForMonth 
} from '../lib/depreciation';
import { 
  generateNextAssetCode, 
  parseAssetCode, 
  ASSET_OWNERSHIP_RULES, 
  ASSET_LOCATION_AREA_RULES,
  ASSET_CATEGORY_RULES 
} from '../lib/assetCodeGenerator';

interface FixedAssetsProps {
  assets: FixedAsset[];
  onAddAsset: (asset: Omit<FixedAsset, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateAsset: (id: string, asset: Partial<FixedAsset>) => Promise<void>;
  onDeleteAsset: (id: string) => Promise<void>;
  configuredLocations?: ConfiguredLocation[];
  configuredCategories?: ConfiguredCategory[];
  isAdmin?: boolean;
  googleAccessToken: string | null;
  theme: AppTheme;
  onNavigateToDepreciation?: () => void;
}

export default function FixedAssets({
  assets,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  configuredLocations = [],
  configuredCategories = [],
  isAdmin = true,
  googleAccessToken,
  theme,
  onNavigateToDepreciation
}: FixedAssetsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isBatchCodeModalOpen, setIsBatchCodeModalOpen] = useState(false);
  const [conditionFilter, setConditionFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [locationFilter, setLocationFilter] = useState('Semua');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isManualLocationInput, setIsManualLocationInput] = useState(false);

  // Active locations list from settings database or fallback
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

  // Active categories list from settings database or fallback
  const activeCategoriesList = React.useMemo(() => {
    if (configuredCategories && configuredCategories.length > 0) {
      return configuredCategories;
    }
    return DEFAULT_ASSET_CATEGORIES.map((cat, idx) => ({
      id: `default-${idx}`,
      category: cat.category,
      types: cat.types
    }));
  }, [configuredCategories]);

  // Sorting & Pagination States
  const [sortColumn, setSortColumn] = useState<string>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Resizable column widths (state in pixels)
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    code: 110,
    name: 200,
    classification: 110,
    brand: 130,
    ownership: 130,
    area: 120,
    location: 160,
    category: 120,
    type: 120,
    acquisitionDate: 120,
    acquisitionCost: 135,
    usefulLife: 100,
    condition: 110,
    status: 100,
    photoUrl: 100,
    registrationLog: 150
  });

  const startResize = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] || 120;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setColWidths(prev => ({
        ...prev,
        [colKey]: Math.max(50, startWidth + deltaX)
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  
  const [formCode, setFormCode] = useState('');
  const [isAutoGenerateCode, setIsAutoGenerateCode] = useState(true);
  const [isCustomOwnership, setIsCustomOwnership] = useState(false);
  const [showCodeRulesBreakdown, setShowCodeRulesBreakdown] = useState(false);
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formOwnership, setFormOwnership] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formType, setFormType] = useState('');
  const [formClassification, setFormClassification] = useState('Aset');
  const [formAcquisitionDate, setFormAcquisitionDate] = useState('');
  const [formAcquisitionCost, setFormAcquisitionCost] = useState<number>(0);
  const [formUsefulLife, setFormUsefulLife] = useState('');
  const [formSalvageValue, setFormSalvageValue] = useState<number>(0);
  const [formDepreciationMethod, setFormDepreciationMethod] = useState<'Garis Lurus' | 'Saldo Menurun' | 'Tidak Disusutkan'>('Garis Lurus');
  const [formTaxGroup, setFormTaxGroup] = useState<string>('');
  const [scheduleModalAsset, setScheduleModalAsset] = useState<FixedAsset | null>(null);
  const [formCondition, setFormCondition] = useState<FixedAsset['condition']>('Baik');
  const [formStatus, setFormStatus] = useState<FixedAsset['status']>('Aktif');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formLastMaintenance, setFormLastMaintenance] = useState('');
  const [formNextMaintenance, setFormNextMaintenance] = useState('');
  const [formNotes, setFormNotes] = useState('');
  
  const [driveFile, setDriveFile] = useState<{ id: string; name: string; url: string } | null>(null);
  const [manualDriveUrl, setManualDriveUrl] = useState('');
  const [manualDriveName, setManualDriveName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-calculated parsed code info for real-time validation badge
  const parsedCurrentFormCode = React.useMemo(() => {
    return parseAssetCode(formCode);
  }, [formCode]);

  // Compute next code automatically when auto-generate is active
  const handleTriggerAutoGenerate = React.useCallback(() => {
    const nextGen = generateNextAssetCode({
      ownership: formOwnership || 'Barang Milik Negara',
      locationNameOrCategory: formLocation || '01',
      category: formCategory || 'INF',
      type: formType || '',
      acquisitionYearOrDate: formAcquisitionDate || new Date().toISOString().split('T')[0]
    }, assets, configuredLocations, configuredCategories);
    setFormCode(nextGen.fullCode);
    return nextGen;
  }, [formOwnership, formLocation, formCategory, formType, formAcquisitionDate, assets, configuredLocations, configuredCategories]);

  // Synchronize generated code when dependencies change during add modal
  useEffect(() => {
    if (isModalOpen && !editingAsset && isAutoGenerateCode) {
      handleTriggerAutoGenerate();
    }
  }, [isModalOpen, editingAsset, isAutoGenerateCode, formOwnership, formLocation, formCategory, formType, formAcquisitionDate, handleTriggerAutoGenerate]);

  // Real-time Maintenance & Mutation Logs for Asset Detail & Summary Print
  const [maintenances, setMaintenances] = useState<AssetMaintenance[]>([]);
  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [summaryAssetToPrint, setSummaryAssetToPrint] = useState<FixedAsset | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Subscribe to Firestore asset_maintenance & fixed_asset_transfers
  useEffect(() => {
    const qMaint = query(collection(db, 'asset_maintenance'));
    const unsubMaint = onSnapshot(qMaint, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AssetMaintenance[];
      setMaintenances(docs);
    }, (err) => console.error('Error fetching maintenance:', err));

    const qTrans = query(collection(db, 'fixed_asset_transfers'));
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as AssetTransfer[];
      setTransfers(docs);
    }, (err) => console.error('Error fetching transfers:', err));

    return () => {
      unsubMaint();
      unsubTrans();
    };
  }, []);

  // Summary Maintenance Map by Asset ID or Asset Code
  const maintenanceSummaryMap = React.useMemo(() => {
    const map: Record<string, { totalCost: number; count: number; items: AssetMaintenance[] }> = {};
    maintenances.forEach(m => {
      const key = m.assetId || m.assetCode;
      if (!key) return;
      if (!map[key]) {
        map[key] = { totalCost: 0, count: 0, items: [] };
      }
      map[key].totalCost += (Number(m.cost) || 0);
      map[key].count += 1;
      map[key].items.push(m);
    });
    return map;
  }, [maintenances]);

  // Summary Mutation/Transfer Map by Asset ID or Asset Code
  const mutationSummaryMap = React.useMemo(() => {
    const map: Record<string, AssetTransfer[]> = {};
    transfers.forEach(t => {
      const key = t.assetId || t.assetCode;
      if (!key) return;
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(t);
    });
    return map;
  }, [transfers]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, conditionFilter, statusFilter, sortColumn, sortDirection]);

  const resetForm = () => {
    setEditingAsset(null);
    setFormCode('');
    setFormName('');
    setFormBrand('');
    setFormOwnership('');
    setFormArea('');
    setFormLocation('');
    setFormCategory('');
    setFormType('');
    setFormClassification('Aset');
    setFormAcquisitionDate('');
    setFormAcquisitionCost(0);
    setFormUsefulLife('');
    setFormSalvageValue(0);
    setFormDepreciationMethod('Garis Lurus');
    setFormTaxGroup('');
    setFormCondition('Baik');
    setFormStatus('Aktif');
    setFormPhotoUrl('');
    setFormLastMaintenance('');
    setFormNextMaintenance('');
    setFormNotes('');
    setDriveFile(null);
    setManualDriveUrl('');
    setManualDriveName('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAutoGenerateCode(true);
    setIsCustomOwnership(false);
    setShowCodeRulesBreakdown(false);

    const initialOwnership = 'Barang Milik Negara';
    const initialCategory = activeCategoriesList[0]?.category || 'Infrastruktur & Landskap';
    const initialType = activeCategoriesList[0]?.types[0] || 'Gerbang / Gate Kawasan';
    const initialDate = new Date().toISOString().split('T')[0];
    const initialLoc = activeLocationsList[0]?.name || 'Gate 1 (Utama)';
    const initialArea = activeLocationsList[0]?.region || 'Wilayah Utara';

    setFormOwnership(initialOwnership);
    setFormCategory(initialCategory);
    setFormType(initialType);
    setFormAcquisitionDate(initialDate);
    setFormLocation(initialLoc);
    setFormArea(initialArea);
    setFormUsefulLife('5 Tahun');
    setFormTaxGroup('kelompok_1');
    setFormDepreciationMethod('Garis Lurus');
    setFormSalvageValue(0);

    const generated = generateNextAssetCode({
      ownership: initialOwnership,
      locationNameOrCategory: initialLoc,
      category: initialCategory,
      type: initialType,
      acquisitionYearOrDate: initialDate
    }, assets, configuredLocations, configuredCategories);

    setFormCode(generated.fullCode);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset: FixedAsset) => {
    setEditingAsset(asset);
    setIsAutoGenerateCode(false);
    setShowCodeRulesBreakdown(false);
    // Check if ownership is standard or custom
    const standardOwnerships = ['Barang Milik Negara', 'PT Taman Wisata Candi', 'PT Bhumi Visatanda Indonesia', 'Kementrian', 'Pemerintah Provinsi'];
    setIsCustomOwnership(!standardOwnerships.includes(asset.ownership || ''));
    setFormCode(asset.code);
    setFormName(asset.name);
    setFormBrand(asset.brand || '');
    setFormOwnership(asset.ownership || '');
    setFormArea(asset.area || '');
    setFormLocation(asset.location || '');
    setFormCategory(asset.category || '');
    setFormType(asset.type || '');
    setFormClassification(asset.classification || 'Aset');
    setFormAcquisitionDate(asset.acquisitionDate || '');
    setFormAcquisitionCost(asset.acquisitionCost || 0);

    const isNonDepr = 
      asset.depreciationMethod === 'Tidak Disusutkan' || 
      asset.usefulLifeGroup === 'tanah_non_depresiasi' ||
      asset.usefulLife?.toLowerCase().includes('tidak disusutkan');

    setFormDepreciationMethod(isNonDepr ? 'Tidak Disusutkan' : (asset.depreciationMethod || 'Garis Lurus'));
    setFormTaxGroup(isNonDepr ? 'tanah_non_depresiasi' : (asset.usefulLifeGroup || ''));
    setFormUsefulLife(isNonDepr ? 'Tidak Disusutkan' : (asset.usefulLife || '5 Tahun'));
    setFormSalvageValue(asset.salvageValue || 0);
    setFormCondition(asset.condition || 'Baik');
    setFormStatus(asset.status || 'Aktif');
    setFormPhotoUrl(asset.photoUrl || '');
    setFormLastMaintenance(asset.lastMaintenance || '');
    setFormNextMaintenance(asset.nextMaintenance || '');
    setFormNotes(asset.notes || '');
    if (asset.driveFileUrl && asset.driveFileName) {
      setDriveFile({
        id: '',
        name: asset.driveFileName,
        url: asset.driveFileUrl
      });
      setManualDriveUrl(asset.driveFileUrl);
      setManualDriveName(asset.driveFileName);
    } else {
      setDriveFile(null);
      setManualDriveUrl('');
      setManualDriveName('');
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !googleAccessToken) return;

    setUploadingFile(true);
    try {
      const driveToken = getCachedDriveToken() || (await requestGoogleDriveAccess());
      if (!driveToken) {
        throw new Error('Izin akses Google Drive belum diberikan. Anda juga dapat menempelkan tautan Google Drive pada Opsi B.');
      }

      const metadata = {
        name: file.name,
        mimeType: file.type,
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${driveToken}`,
        },
        body: form,
      });

      if (!response.ok) {
        throw new Error('Gagal mengunggah ke Google Drive');
      }

      const resData = await response.json();
      
      // Update permissions so everyone with the link can view
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${resData.id}/permissions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${driveToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
          })
        });
      } catch (errPermission) {
        console.warn('Gagal mengatur visibilitas berkas Google Drive:', errPermission);
      }

      setDriveFile({
        id: resData.id,
        name: resData.name,
        url: resData.webViewLink
      });
      setManualDriveUrl(resData.webViewLink);
      setManualDriveName(resData.name);

      alert(`Sukses unggah "${file.name}" ke Google Drive!`);
    } catch (err: any) {
      alert(`Gagal upload: ${err.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleLastMaintenanceChange = (val: string) => {
    setFormLastMaintenance(val);
    if (val) {
      const date = new Date(val);
      date.setMonth(date.getMonth() + 6);
      const nextDateStr = date.toISOString().split('T')[0];
      setFormNextMaintenance(nextDateStr);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      alert('Kode Aset dan Nama Barang wajib diisi.');
      return;
    }

    const assetPayload = {
      code: formCode,
      name: formName,
      brand: formBrand,
      ownership: formOwnership,
      area: formArea,
      location: formLocation,
      category: formCategory,
      type: formType,
      classification: formClassification,
      acquisitionDate: formAcquisitionDate,
      acquisitionCost: Number(formAcquisitionCost) || 0,
      usefulLife: formUsefulLife,
      salvageValue: Number(formSalvageValue) || 0,
      depreciationMethod: formDepreciationMethod || 'Garis Lurus',
      usefulLifeGroup: formTaxGroup || '',
      condition: formCondition,
      status: formStatus,
      photoUrl: formPhotoUrl,
      driveFileUrl: manualDriveUrl.trim() || driveFile?.url || '',
      driveFileName: manualDriveName.trim() || driveFile?.name || (manualDriveUrl.trim() ? 'Lampiran Berkas' : ''),
      lastMaintenance: formLastMaintenance,
      nextMaintenance: formNextMaintenance,
      notes: formNotes
    };

    try {
      if (editingAsset) {
        await onUpdateAsset(editingAsset.id, assetPayload);
      } else {
        await onAddAsset(assetPayload);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(`Gagal menyimpan aset: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus aset ini dari database?')) {
      try {
        await onDeleteAsset(id);
      } catch (err: any) {
        alert(`Gagal menghapus aset: ${err.message}`);
      }
    }
  };

  const handleExport = () => {
    const exportData = assets.map(a => {
      const maintInfo = maintenanceSummaryMap[a.id] || maintenanceSummaryMap[a.code] || { totalCost: 0, count: 0 };
      const transList = mutationSummaryMap[a.id] || mutationSummaryMap[a.code] || [];
      return {
        'ID Aset': a.id,
        'Kode Aset': a.code,
        'Nama Barang': a.name,
        'Aset / LVA': a.classification || 'Aset',
        'Merk & Tipe': a.brand || '',
        'Kepemilikan': a.ownership || '',
        'Area': a.area || '',
        'Lokasi': a.location || '',
        'Kategori': a.category || '',
        'Jenis': a.type || '',
        'Tanggal Perolehan': a.acquisitionDate || '',
        'Nilai Perolehan (IDR)': a.acquisitionCost || 0,
        'Metode Depresiasi': a.depreciationMethod || 'Garis Lurus',
        'Golongan Pajak': a.usefulLifeGroup || '',
        'Masa Manfaat': a.usefulLife || '',
        'Nilai Residu (IDR)': a.salvageValue || 0,
        'Total Biaya Maintenance (IDR)': maintInfo.totalCost,
        'Frekuensi Maintenance': maintInfo.count,
        'Jumlah Riwayat Mutasi': transList.length,
        'Kondisi': a.condition || '',
        'Status': a.status || '',
        'Foto Aset': a.photoUrl || '',
        'Lampiran GDrive': a.driveFileUrl || '',
        'Terakhir Servis': a.lastMaintenance || '',
        'Prediksi Servis Berikutnya': a.nextMaintenance || '',
        'Keterangan': a.notes || '',
        'Tanggal Input': a.createdAt
      };
    });
    exportToExcel(exportData, 'Database_Fixed_Assets_TMII', 'Aset_Tetap');
  };

  // Filter Aset
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.brand && asset.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.location && asset.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.ownership && asset.ownership.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.area && asset.area.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.category && asset.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.classification && asset.classification.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.type && asset.type.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCondition = conditionFilter === 'Semua' || asset.condition === conditionFilter;
    const matchesStatus = statusFilter === 'Semua' || asset.status === statusFilter;

    return matchesSearch && matchesCondition && matchesStatus;
  });

  // Sort Aset
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    let valA = a[sortColumn as keyof FixedAsset] || '';
    let valB = b[sortColumn as keyof FixedAsset] || '';

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination Slice
  const totalPages = Math.ceil(sortedAssets.length / itemsPerPage) || 1;
  const paginatedAssets = sortedAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Mini summary
  const totalCost = assets.reduce((sum, current) => sum + (current.acquisitionCost || 0), 0);
  const brokenCount = assets.filter(a => a.condition === 'Rusak Berat').length;
  const maintenanceCount = assets.filter(a => a.status === 'Diperbaiki').length;

  return (
    <div className="space-y-6" id="assets-module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="assets-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Database Fixed Asset</h1>
          <p className="text-sm text-gray-500">Kelola aset fisik, kondisi terkini, dan jadwal pemeliharaan berkala</p>
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
              id="btn-import-assets-toggle"
            >
              <FileSpreadsheet size={18} className={isImportOpen ? 'text-white' : 'text-slate-500'} />
              <span>Import Excel/CSV</span>
            </button>
          )}
          {onNavigateToDepreciation && (
            <button 
              onClick={onNavigateToDepreciation}
              className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer border border-emerald-200/80"
              id="btn-navigate-depreciation"
            >
              <Calculator size={18} className="text-emerald-700" />
              <span>Depresiasi & Nilai Buku</span>
            </button>
          )}
          {isAdmin && (
            <button 
              type="button"
              onClick={() => setIsBatchCodeModalOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer border border-indigo-200/80"
              id="btn-batch-generate-codes"
              title="Generate dan Standarisasi Semua Kode Aset TMII"
            >
              <Sparkles size={18} className="text-indigo-600" />
              <span>Generate Semua Kode</span>
            </button>
          )}
          <button 
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
            id="btn-export-assets"
          >
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-colors cursor-pointer"
            style={{ backgroundColor: theme.primaryColor }}
            id="btn-add-asset"
          >
            <Plus size={18} />
            <span>Registrasi Aset</span>
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
              type="fixed-assets"
              onImport={async (parsedRows) => {
                for (const row of parsedRows) {
                  await onAddAsset(row);
                }
                setIsImportOpen(false);
              }}
              onClose={() => setIsImportOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Dashboard Pelaporan - completely borderless */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" id="assets-mini-dashboard">
        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Nilai Total Aset</span>
            <p className="text-xl font-extrabold text-slate-900 mt-1">
              Rp {totalCost.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Coins size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Isu Kerusakan</span>
            <p className="text-xl font-extrabold text-rose-600 mt-1">
              {brokenCount} Aset Rusak
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Sedang Perbaikan</span>
            <p className="text-xl font-extrabold text-amber-600 mt-1">
              {maintenanceCount} Unit
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Settings size={22} />
          </div>
        </div>
      </div>

      {/* Filter, Search, and Sorting Panel - completely borderless */}
      <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4" id="assets-filter-panel">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          <div className="relative md:col-span-4">
            <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari kode, nama, lokasi..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setIsQRScannerOpen(true)}
              className="absolute right-2 top-1.5 p-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
              title="Scan QR Code Aset (Kamera)"
            >
              <Camera size={14} />
              <span className="hidden sm:inline">Scan QR</span>
            </button>
          </div>

          <div className="md:col-span-2">
            <select 
              value={conditionFilter}
              onChange={e => setConditionFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            >
              <option value="Semua">Semua Kondisi</option>
              <option value="Baik">Baik</option>
              <option value="Rusak Ringan">Rusak Ringan</option>
              <option value="Rusak Berat">Rusak Berat</option>
              <option value="Demolished">Demolished</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Non-Aktif">Non-Aktif</option>
              <option value="Diperbaiki">Diperbaiki</option>
              <option value="Dihapuskan">Dihapuskan</option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 shrink-0 uppercase tracking-wider">Urutkan:</span>
            <select 
              value={sortColumn}
              onChange={e => setSortColumn(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            >
              <option value="code">Kode Aset</option>
              <option value="name">Nama Barang</option>
              <option value="brand">Merek/Tipe</option>
              <option value="location">Lokasi</option>
              <option value="acquisitionCost">Nilai Perolehan</option>
              <option value="condition">Kondisi</option>
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

      {/* Asset Table - completely borderless wrapper */}
      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.015)] overflow-hidden" id="assets-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/60 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th style={{ width: colWidths.code }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Kode Aset</span>
                    <div onMouseDown={(e) => startResize(e, 'code')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.name }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Nama Barang</span>
                    <div onMouseDown={(e) => startResize(e, 'name')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.brand }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Merk dan Tipe</span>
                    <div onMouseDown={(e) => startResize(e, 'brand')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.ownership }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Kepemilikan</span>
                    <div onMouseDown={(e) => startResize(e, 'ownership')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.area }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Area</span>
                    <div onMouseDown={(e) => startResize(e, 'area')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.location }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Lokasi</span>
                    <div onMouseDown={(e) => startResize(e, 'location')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.category }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Kategori</span>
                    <div onMouseDown={(e) => startResize(e, 'category')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.type }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Jenis</span>
                    <div onMouseDown={(e) => startResize(e, 'type')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.acquisitionDate }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Tanggal Perolehan</span>
                    <div onMouseDown={(e) => startResize(e, 'acquisitionDate')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.acquisitionCost }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Nilai Perolehan</span>
                    <div onMouseDown={(e) => startResize(e, 'acquisitionCost')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.usefulLife }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Masa Manfaat</span>
                    <div onMouseDown={(e) => startResize(e, 'usefulLife')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.condition }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Kondisi</span>
                    <div onMouseDown={(e) => startResize(e, 'condition')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.classification }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Aset / LVA</span>
                    <div onMouseDown={(e) => startResize(e, 'classification')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.status }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <div onMouseDown={(e) => startResize(e, 'status')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.photoUrl }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Foto Aset</span>
                    <div onMouseDown={(e) => startResize(e, 'photoUrl')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th style={{ width: colWidths.registrationLog }} className="py-3.5 px-4 whitespace-nowrap relative group select-none">
                  <div className="flex items-center justify-between">
                    <span>Log Registrasi</span>
                    <div onMouseDown={(e) => startResize(e, 'registrationLog')} className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-600 bg-transparent z-10" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {paginatedAssets.length === 0 ? (
                <tr>
                  <td colSpan={17} className="text-center py-12 text-gray-400">
                    Tidak ada aset tetap yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div style={{ width: colWidths.code }} className="truncate">
                        <div 
                          className="font-mono text-[10px] font-bold inline-block px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}
                        >
                          {asset.code}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      <div style={{ width: colWidths.name }} className="truncate" title={asset.name}>
                        {asset.name}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-800">
                      <div style={{ width: colWidths.brand }} className="truncate" title={asset.brand || '-'}>
                        {asset.brand || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div style={{ width: colWidths.ownership }} className="truncate" title={asset.ownership || '-'}>
                        {asset.ownership || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div style={{ width: colWidths.area }} className="truncate" title={asset.area || '-'}>
                        {asset.area || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">
                      <div style={{ width: colWidths.location }} className="truncate flex items-center gap-1" title={asset.location || '-'}>
                        <MapPin size={10} className="text-gray-400 shrink-0" />
                        <span className="truncate">{asset.location || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div style={{ width: colWidths.category }} className="truncate" title={asset.category || '-'}>
                        {asset.category || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div style={{ width: colWidths.type }} className="truncate" title={asset.type || '-'}>
                        {asset.type || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                      <div style={{ width: colWidths.acquisitionDate }} className="truncate" title={asset.acquisitionDate || '-'}>
                        {asset.acquisitionDate || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900 whitespace-nowrap">
                      <div style={{ width: colWidths.acquisitionCost }} className="truncate">
                        Rp {(asset.acquisitionCost || 0).toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div style={{ width: colWidths.usefulLife }} className="truncate" title={asset.usefulLife || '-'}>
                        {asset.usefulLife || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div style={{ width: colWidths.condition }}>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                          asset.condition === 'Baik' ? 'bg-emerald-50 text-emerald-700' :
                          asset.condition === 'Rusak Ringan' ? 'bg-amber-50 text-amber-700' :
                          asset.condition === 'Rusak Berat' ? 'bg-red-50 text-red-700' :
                          asset.condition === 'Demolished' ? 'bg-slate-200 text-slate-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {asset.condition === 'Baik' && <CheckCircle size={10} />}
                          {asset.condition === 'Rusak Ringan' && <AlertTriangle size={10} />}
                          {asset.condition === 'Rusak Berat' && <ShieldAlert size={10} />}
                          {asset.condition === 'Demolished' && <Trash2 size={10} />}
                          {asset.condition}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-700">
                      <div style={{ width: colWidths.classification }} className="truncate">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          asset.classification === 'LVA' 
                            ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {asset.classification || 'Aset'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div style={{ width: colWidths.status }}>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                          asset.status === 'Aktif' ? 'bg-green-100 text-green-800' :
                          asset.status === 'Diperbaiki' ? 'bg-amber-100 text-amber-800' :
                          asset.status === 'Dihapuskan' ? 'bg-gray-200 text-gray-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {asset.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div style={{ width: colWidths.photoUrl }} className="truncate">
                        <div className="flex flex-col gap-1">
                          {asset.photoUrl ? (
                            <a 
                              href={asset.photoUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-semibold"
                            >
                              <span>Lihat Foto</span>
                              <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-gray-400 text-[10px]">Tanpa Foto</span>
                          )}
                          {asset.driveFileUrl && (
                            <a 
                              href={asset.driveFileUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5 font-bold"
                              title={asset.driveFileName || "Lampiran GDrive"}
                            >
                              <Paperclip size={10} className="shrink-0" />
                              <span className="truncate max-w-[80px]">{asset.driveFileName || "GDrive"}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div style={{ width: colWidths.registrationLog }} className="truncate">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 truncate" title={asset.createdByName || asset.createdBy || 'Staf TMII'}>
                            {asset.createdByName || (asset.createdBy ? asset.createdBy.split('@')[0] : 'Staf TMII')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {asset.createdAt ? new Date(asset.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => setScheduleModalAsset(asset)}
                          className="p-1 text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          title="Perhitungan Depresiasi & Jadwal Nilai Buku"
                        >
                          <Calculator size={14} />
                        </button>
                        <button 
                          onClick={() => setSummaryAssetToPrint(asset)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          title="Cetak Summary Aset / Save PDF"
                        >
                          <Printer size={14} />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(asset)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title={isAdmin ? "Edit Aset" : "Lihat Detail"}
                        >
                          <Edit size={14} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(asset.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Hapus Aset"
                          >
                            <Trash2 size={14} />
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
              Menampilkan {Math.min(sortedAssets.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(sortedAssets.length, currentPage * itemsPerPage)} dari {sortedAssets.length} data
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

      {/* Add / Edit Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs" id="asset-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="p-6 flex justify-between items-center bg-gray-50/50 border-b border-slate-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingAsset ? (isAdmin ? 'Perbarui Registrasi Aset' : 'Detail Registrasi Aset') : 'Registrasi Aset Tetap Baru'}
              </h2>
              <div className="flex items-center gap-2">
                {editingAsset && (
                  <button
                    type="button"
                    onClick={() => setSummaryAssetToPrint(editingAsset)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Cetak Summary / PDF</span>
                  </button>
                )}
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Asset Registration Log Banner */}
              {editingAsset && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <UserCheck size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Diregistrasi oleh: <span className="text-blue-700 font-extrabold">{editingAsset.createdByName || editingAsset.createdBy || 'Staf TMII'}</span>
                        </span>
                        {editingAsset.createdBy && editingAsset.createdByName && (
                          <span className="text-[11px] text-slate-500 font-mono">({editingAsset.createdBy})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5 font-medium">
                        <Clock size={12} className="text-slate-400" />
                        <span>Waktu Registrasi: {editingAsset.createdAt ? new Date(editingAsset.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Tidak tercatat'}</span>
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    Log Sistem
                  </span>
                </div>
              )}
              <fieldset disabled={editingAsset !== null && !isAdmin} className="space-y-4">
              {/* Auto-Generate Code Assistant Banner */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-amber-50/50 border border-blue-200/80 rounded-2xl p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 tracking-tight">Auto-Generate Kode Aset TMII</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                          Standar 6 Segmen
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                        Format: <code className="font-mono font-bold text-blue-900 bg-blue-100/70 px-1 py-0.5 rounded">[K1][K2].[K3][K4]/[K5]-[K6]</code> (Otomatis berdasarkan lokasi, kategori, jenis, dan tahun).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setIsAutoGenerateCode(!isAutoGenerateCode)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isAutoGenerateCode 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                      title={isAutoGenerateCode ? 'Mode Auto-Generate Aktif' : 'Mode Manual Aktif'}
                    >
                      <SlidersHorizontal size={13} />
                      <span>{isAutoGenerateCode ? 'Auto-Gen: ON' : 'Auto-Gen: OFF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAutoGenerateCode(true);
                        handleTriggerAutoGenerate();
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 shadow-xs transition-all cursor-pointer flex items-center gap-1"
                      title="Generate Ulang Berdasarkan Form"
                    >
                      <RefreshCw size={13} className="text-blue-600" />
                      <span>Generate Ulang</span>
                    </button>
                  </div>
                </div>

                {/* Real-time Parsed Status / Breakdown */}
                {parsedCurrentFormCode && (
                  <div className="mt-3 pt-3 border-t border-blue-200/60">
                    {parsedCurrentFormCode.isValidFormat ? (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-extrabold text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            Format Sesuai Aturan:
                          </span>
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-white border border-emerald-300 text-emerald-950 shadow-xs">
                            {parsedCurrentFormCode.rawCode}
                          </span>
                          <span className="text-[10px] text-slate-500">•</span>
                          <span className="text-[11px] text-slate-700 font-semibold">
                            {parsedCurrentFormCode.breakdownSummary}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-slate-600">
                          <span className="px-1.5 py-0.5 bg-blue-100/80 rounded text-blue-900 font-bold" title="Kode 1: Kepemilikan">
                            K1: {parsedCurrentFormCode.ownership?.code} ({parsedCurrentFormCode.ownership?.name})
                          </span>
                          <span>+</span>
                          <span className="px-1.5 py-0.5 bg-emerald-100/80 rounded text-emerald-900 font-bold" title="Kode 2: Lokasi Kawasan">
                            K2: {parsedCurrentFormCode.locationArea?.code} ({parsedCurrentFormCode.locationArea?.category})
                          </span>
                          <span>.</span>
                          <span className="px-1.5 py-0.5 bg-amber-100/80 rounded text-amber-900 font-bold" title="Kode 3: Kategori Aset">
                            K3: {parsedCurrentFormCode.category?.code} ({parsedCurrentFormCode.category?.name})
                          </span>
                          <span>+</span>
                          <span className="px-1.5 py-0.5 bg-purple-100/80 rounded text-purple-900 font-bold" title="Kode 4: Jenis / Tipe Aset">
                            K4: {parsedCurrentFormCode.type?.code} ({parsedCurrentFormCode.type?.name})
                          </span>
                          <span>.</span>
                          <span className="px-1.5 py-0.5 bg-rose-100/80 rounded text-rose-900 font-bold" title="Kode 5: Tahun Perolehan">
                            K5: {parsedCurrentFormCode.acquisitionYear}
                          </span>
                          <span>-</span>
                          <span className="px-1.5 py-0.5 bg-cyan-100/80 rounded text-cyan-900 font-bold" title="Kode 6: Nomor Urut">
                            K6: {parsedCurrentFormCode.sequenceNumber}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 text-[11px] text-amber-800">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle size={14} className="text-amber-600 shrink-0" />
                          <span>Kode aset saat ini menggunakan format kustom / non-standar.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAutoGenerateCode(true);
                            handleTriggerAutoGenerate();
                          }}
                          className="text-[11px] font-bold text-blue-700 hover:underline shrink-0 cursor-pointer"
                        >
                          Terapkan Standar TMII
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Kode Aset *
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isAutoGenerateCode ? '(Auto-Sync Aktif)' : '(Manual)'}
                    </span>
                  </div>
                  <input 
                    type="text" 
                    required
                    value={formCode}
                    onChange={e => {
                      setFormCode(e.target.value);
                      if (isAutoGenerateCode) {
                        setIsAutoGenerateCode(false);
                      }
                    }}
                    placeholder="Contoh: BMN03.INF04.26-001"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm font-mono font-bold text-slate-900 border border-slate-200 focus:ring-2 focus:ring-blue-500/30"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Bisa diedit manual atau diisi otomatis oleh generator standar TMII.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nama Barang *</label>
                  <input 
                    type="text" 
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Contoh: Pompa Air Submersible Sektor 3"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm border border-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Klasifikasi Aset / LVA *</label>
                  <select 
                    value={formClassification}
                    onChange={e => setFormClassification(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm border border-slate-100 font-semibold text-gray-800"
                  >
                    <option value="Aset">Aset (Fixed Asset)</option>
                    <option value="LVA">LVA (Low Value Asset)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Merk / Tipe</label>
                  <input 
                    type="text" 
                    value={formBrand}
                    onChange={e => setFormBrand(e.target.value)}
                    placeholder="Contoh: Ebara 50 DL"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm border border-slate-100"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Kepemilikan (Kode 1) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomOwnership(!isCustomOwnership)}
                      className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {isCustomOwnership ? 'Pilih Opsi Standar' : 'Ketik Manual'}
                    </button>
                  </div>
                  {!isCustomOwnership ? (
                    <select
                      value={formOwnership}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '__custom__') {
                          setIsCustomOwnership(true);
                          setFormOwnership('');
                        } else {
                          setFormOwnership(val);
                        }
                      }}
                      className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm font-semibold text-slate-900 border border-slate-200 cursor-pointer"
                    >
                      <option value="">-- Pilih Entitas Kepemilikan (Standar TMII) --</option>
                      {ASSET_OWNERSHIP_RULES.map(own => (
                        <option key={own.code} value={own.name}>
                          [{own.code}] {own.name}
                        </option>
                      ))}
                      <option value="__custom__">+ Ketik Entitas Manual Lainnya</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={formOwnership}
                      onChange={e => setFormOwnership(e.target.value)}
                      placeholder="Contoh: PT. Taman Wisata Candi / Milik Sendiri"
                      className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm border border-slate-200"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Lokasi Penempatan * <span className="normal-case font-normal text-[11px] text-amber-800">(Terintegrasi Kode 2)</span>
                  </label>
                  <LocationAutoComplete
                    value={formLocation}
                    onChange={(val, matched) => {
                      setFormLocation(val);
                      if (matched) {
                        setFormArea(matched.region);
                      }
                    }}
                    locations={configuredLocations}
                    placeholder="Ketik atau pilih nama lokasi penempatan..."
                    required
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Kategori lokasi terhubung otomatis ke segmen Kode 2 (01-11).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Wilayah / Area *</label>
                  <select 
                    value={formArea}
                    onChange={e => setFormArea(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm border border-slate-200 font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="">-- Pilih Wilayah Area --</option>
                    <option value="Wilayah Utara">Wilayah Utara</option>
                    <option value="Wilayah Selatan">Wilayah Selatan</option>
                    <option value="Wilayah Barat">Wilayah Barat</option>
                    <option value="Wilayah Timur">Wilayah Timur</option>
                    <option value="Wilayah Pusat">Wilayah Pusat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Kategori Aset <span className="normal-case font-normal text-[11px] text-amber-800">(Terintegrasi Kode 3)</span>
                  </label>
                  <select 
                    value={formCategory}
                    onChange={e => {
                      const newCat = e.target.value;
                      setFormCategory(newCat);
                      const catObj = activeCategoriesList.find(c => c.category === newCat);
                      if (catObj && catObj.types.length > 0) {
                        if (!catObj.types.includes(formType)) {
                          setFormType(catObj.types[0]);
                        }
                      }
                      // Jika kategori tanah dipilih, otomatis set parameter depresiasi ke 'Tidak Disusutkan'
                      if (newCat.toLowerCase().includes('tanah')) {
                        setFormDepreciationMethod('Tidak Disusutkan');
                        setFormTaxGroup('tanah_non_depresiasi');
                        setFormUsefulLife('Tidak Disusutkan');
                        setFormSalvageValue(0);
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm font-semibold text-slate-900 border border-slate-200 cursor-pointer"
                  >
                    <option value="">-- Pilih Kategori Aset --</option>
                    {activeCategoriesList.map(cat => {
                      const matchedRule = ASSET_CATEGORY_RULES.find(r => r.name.toLowerCase() === cat.category.toLowerCase() || cat.category.toLowerCase().includes(r.name.toLowerCase()));
                      const codeBadge = matchedRule ? `[${matchedRule.code}] ` : '';
                      return (
                        <option key={cat.id || cat.category} value={cat.category}>
                          {codeBadge}{cat.category}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Jenis Aset <span className="normal-case font-normal text-[11px] text-purple-800">(Terintegrasi Kode 4)</span>
                  </label>
                  <select 
                    value={formType}
                    onChange={e => {
                      const selectedT = e.target.value;
                      setFormType(selectedT);
                      if (!formCategory && selectedT) {
                        const parentCat = activeCategoriesList.find(c => c.types.includes(selectedT));
                        if (parentCat) {
                          setFormCategory(parentCat.category);
                        }
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm font-semibold text-slate-900 border border-slate-200 cursor-pointer"
                  >
                    <option value="">-- Pilih Jenis Aset --</option>
                    {formCategory ? (
                      (activeCategoriesList.find(c => c.category === formCategory)?.types || []).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))
                    ) : (
                      activeCategoriesList.map(cat => (
                        <optgroup key={cat.id || cat.category} label={`=== ${cat.category} ===`}>
                          {cat.types.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </optgroup>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Tanggal Perolehan <span className="normal-case font-normal text-[11px] text-rose-800">(Tahun = Kode 5)</span>
                  </label>
                  <input 
                    type="date" 
                    value={formAcquisitionDate}
                    onChange={e => setFormAcquisitionDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm border border-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Nilai Perolehan (IDR)</label>
                  <input 
                    type="number" 
                    value={formAcquisitionCost}
                    onChange={e => setFormAcquisitionCost(Number(e.target.value))}
                    placeholder="Nilai perolehan barang"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm border border-slate-100"
                  />
                </div>

                {/* Depreciation & Useful Life Section */}
                <div className="sm:col-span-2 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator size={16} className="text-emerald-700" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                        Parameter Depresiasi & Masa Manfaat
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-200/60 text-emerald-800 rounded-full font-semibold">
                      PSAK 16
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Pilihan Metode Depresiasi */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Metode Depresiasi
                      </label>
                      <select
                        value={formDepreciationMethod}
                        onChange={e => {
                          const val = e.target.value as 'Garis Lurus' | 'Saldo Menurun' | 'Tidak Disusutkan';
                          setFormDepreciationMethod(val);
                          if (val === 'Tidak Disusutkan') {
                            setFormTaxGroup('tanah_non_depresiasi');
                            setFormUsefulLife('Tidak Disusutkan');
                            setFormSalvageValue(0);
                          } else if (formTaxGroup === 'tanah_non_depresiasi') {
                            setFormTaxGroup('kelompok_1');
                            setFormUsefulLife('4 Tahun');
                          }
                        }}
                        className="w-full p-2 bg-white rounded-xl text-xs font-semibold border border-emerald-200 focus:outline-none cursor-pointer"
                      >
                        <option value="Garis Lurus">Garis Lurus (Straight-Line)</option>
                        <option value="Tidak Disusutkan">🌱 Tidak Disusutkan (Tanah)</option>
                        <option value="Saldo Menurun">Saldo Menurun (Declining)</option>
                      </select>
                    </div>

                    {/* Golongan / Kelompok Pajak */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Golongan / Kelompok Pajak
                      </label>
                      <select
                        value={formTaxGroup}
                        onChange={e => {
                          const val = e.target.value;
                          setFormTaxGroup(val);
                          if (val === 'tanah_non_depresiasi') {
                            setFormDepreciationMethod('Tidak Disusutkan');
                            setFormUsefulLife('Tidak Disusutkan');
                            setFormSalvageValue(0);
                          } else {
                            const grp = TAX_DEPRECIATION_GROUPS.find(g => g.id === val);
                            if (grp) {
                              setFormUsefulLife(`${grp.years} Tahun`);
                              if (formDepreciationMethod === 'Tidak Disusutkan') {
                                setFormDepreciationMethod('Garis Lurus');
                              }
                            }
                          }
                        }}
                        className="w-full p-2 bg-white rounded-xl text-xs font-semibold border border-emerald-200 focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Pilih Golongan Standar --</option>
                        {TAX_DEPRECIATION_GROUPS.map(grp => (
                          <option key={grp.id} value={grp.id}>
                            {grp.name} {grp.ratePercent > 0 ? `(${grp.ratePercent}%/thn)` : '(0%)'}
                          </option>
                        ))}
                        <option value="custom">Kustom (Input Bebas)</option>
                      </select>
                    </div>

                    {/* Masa Manfaat */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Masa Manfaat
                      </label>
                      <input 
                        type="text" 
                        value={formUsefulLife}
                        onChange={e => setFormUsefulLife(e.target.value)}
                        disabled={formDepreciationMethod === 'Tidak Disusutkan'}
                        placeholder={formDepreciationMethod === 'Tidak Disusutkan' ? 'Masa Tak Terbatas (Tanah)' : 'Contoh: 5 Tahun / 48 Bulan'}
                        className={`w-full p-2 rounded-xl text-xs font-semibold border border-emerald-200 focus:outline-none ${
                          formDepreciationMethod === 'Tidak Disusutkan' 
                            ? 'bg-emerald-50/60 text-emerald-800 font-bold cursor-not-allowed' 
                            : 'bg-white text-slate-900'
                        }`}
                      />
                    </div>

                    {/* Nilai Residu */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Nilai Residu (IDR)
                      </label>
                      <input 
                        type="number" 
                        value={formSalvageValue}
                        onChange={e => setFormSalvageValue(Number(e.target.value))}
                        disabled={formDepreciationMethod === 'Tidak Disusutkan'}
                        placeholder={formDepreciationMethod === 'Tidak Disusutkan' ? '0 (Tanpa Residu)' : '0 (Bila habis tersusut)'}
                        className={`w-full p-2 rounded-xl text-xs font-semibold border border-emerald-200 focus:outline-none ${
                          formDepreciationMethod === 'Tidak Disusutkan' 
                            ? 'bg-emerald-50/60 text-emerald-800 font-bold cursor-not-allowed' 
                            : 'bg-white text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Live Interactive Depreciation Preview */}
                  {Number(formAcquisitionCost) > 0 && (
                    <div className="text-xs">
                      {formDepreciationMethod === 'Tidak Disusutkan' || formTaxGroup === 'tanah_non_depresiasi' || formUsefulLife.toLowerCase().includes('tidak disusutkan') ? (
                        <div className="bg-emerald-100/80 p-3 rounded-xl border border-emerald-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">🌱</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <strong className="text-emerald-950 font-bold">Aset Tanah (Tidak Disusutkan) — PSAK 16</strong>
                                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-extrabold rounded-md">
                                  Non-Depreciable
                                </span>
                              </div>
                              <p className="text-emerald-800 text-[11px] mt-0.5">
                                Tanah memiliki masa manfaat tidak terbatas. Beban depresiasi per bulan: <strong className="text-emerald-950">Rp 0</strong>. Nilai buku di neraca tetap 100% utuh sebesar <strong className="text-emerald-950">{formatRupiah(Number(formAcquisitionCost) || 0)}</strong>.
                              </p>
                            </div>
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <span className="inline-block text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 bg-emerald-200 text-emerald-900 rounded-lg">
                              Masa Manfaat Tak Terbatas
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-emerald-200/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          {(() => {
                            const cost = Number(formAcquisitionCost) || 0;
                            const salvage = Number(formSalvageValue) || 0;
                            const base = Math.max(0, cost - salvage);
                            const parsed = parseUsefulLife(formUsefulLife, formDepreciationMethod);
                            const monthly = Math.round(base / Math.max(1, parsed.months));
                            const annual = Math.round(monthly * 12);
                            return (
                              <>
                                <div className="flex items-center gap-2">
                                  <Sparkles size={14} className="text-emerald-600 shrink-0" />
                                  <div>
                                    <span className="text-slate-500">Estimasi Beban Depresiasi:</span>{' '}
                                    <strong className="text-amber-700 font-bold">{formatRupiah(monthly)} / bln</strong>{' '}
                                    <span className="text-slate-400">({formatRupiah(annual)} / thn)</span>
                                  </div>
                                </div>
                                <div className="text-[11px] text-emerald-800 font-bold">
                                  Masa: {parsed.months} Periode Bulan ({parsed.years} Thn) • {formDepreciationMethod}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Kondisi Aset</label>
                  <select 
                    value={formCondition}
                    onChange={e => setFormCondition(e.target.value as FixedAsset['condition'])}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm border border-slate-100"
                  >
                    <option value="Baik">Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                    <option value="Demolished">Demolished</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Status Operasional</label>
                  <select 
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as FixedAsset['status'])}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm border border-slate-100"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                    <option value="Diperbaiki">Diperbaiki</option>
                    <option value="Dihapuskan">Dihapuskan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Foto Aset (Link/URL)</label>
                  <input 
                    type="text" 
                    value={formPhotoUrl}
                    onChange={e => setFormPhotoUrl(e.target.value)}
                    placeholder="Contoh: https://domain.com/foto.jpg"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm border border-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Pemeliharaan Terakhir (Manual)
                  </label>
                  <input 
                    type="date" 
                    value={formLastMaintenance}
                    onChange={e => handleLastMaintenanceChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm border border-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Pemeliharaan Berikutnya (Otomatis +6 Bln)
                  </label>
                  <input 
                    type="date" 
                    value={formNextMaintenance}
                    onChange={e => setFormNextMaintenance(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm border border-slate-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Catatan Keterangan</label>
                  <textarea 
                    rows={2}
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Keterangan spesifikasi tambahan, nomor seri, dll..."
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm border border-slate-100"
                  />
                </div>

                {/* Upload Section to Google Drive */}
                <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <Paperclip size={18} style={{ color: theme.primaryColor }} />
                    <span>Lampiran Dokumen / Google Drive</span>
                  </div>

                  {/* Opsi A: Upload File (Memerlukan Login) */}
                  <div className="bg-white p-3.5 rounded-lg border border-slate-100 space-y-2">
                    <span className="text-xs font-bold text-gray-700 block uppercase tracking-wider">Opsi A: Unggah Otomatis dari Perangkat</span>
                    {googleAccessToken ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingFile}
                            className="inline-flex items-center gap-2 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            {uploadingFile ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            <span>{uploadingFile ? 'Mengunggah...' : 'Pilih & Unggah File'}</span>
                          </button>
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden" 
                          />
                          <span className="text-xs text-gray-500">File akan terupload ke Google Drive Anda secara otomatis</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50/60 p-2.5 rounded-lg">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>Masuk dengan Google (di header halaman) untuk mengaktifkan fitur unggah otomatis dari perangkat.</span>
                      </div>
                    )}
                  </div>

                  {/* Opsi B: Sisipkan Link Google Drive Secara Manual */}
                  <div className="bg-white p-3.5 rounded-lg border border-slate-100 space-y-3">
                    <span className="text-xs font-bold text-gray-700 block uppercase tracking-wider">Opsi B: Sisipkan Tautan Google Drive Secara Manual</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">URL / Tautan Google Drive</label>
                        <input 
                          type="text" 
                          value={manualDriveUrl}
                          onChange={e => {
                            const val = e.target.value;
                            setManualDriveUrl(val);
                            if (val && !manualDriveName) {
                              setManualDriveName('Lampiran Dokumen Google Drive');
                            }
                          }}
                          placeholder="Tempel link share Google Drive di sini..."
                          className="w-full p-2 bg-slate-50 rounded-lg text-xs focus:outline-none border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nama Tautan / Judul Dokumen</label>
                        <input 
                          type="text" 
                          value={manualDriveName}
                          onChange={e => setManualDriveName(e.target.value)}
                          placeholder="Contoh: Dokumen Spesifikasi Pompa Air"
                          className="w-full p-2 bg-slate-50 rounded-lg text-xs focus:outline-none border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tampilan Lampiran Terpilih */}
                  {(manualDriveUrl || driveFile) && (
                    <div className="bg-emerald-50 p-2.5 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <ExternalLink size={16} className="text-emerald-600 shrink-0" />
                        <span className="text-xs font-semibold text-emerald-800 truncate" title={manualDriveName || driveFile?.name}>
                          {manualDriveName || driveFile?.name || 'Tautan Google Drive Terpasang'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <a 
                          href={manualDriveUrl || driveFile?.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <span>Buka</span>
                          <ExternalLink size={12} />
                        </a>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setDriveFile(null);
                              setManualDriveUrl('');
                              setManualDriveName('');
                            }}
                            className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                            title="Hapus Lampiran"
                          >
                            <span>Hapus</span>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* INTEGRATED DATA FOR DETAIL VIEW: Total Biaya Maintenance & Riwayat Mutasi */}
              {editingAsset && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  {/* Total Biaya Maintenance Summary */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Wrench size={18} className="text-emerald-700 shrink-0" />
                        <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                          Total Biaya Pemeliharaan & Maintenance
                        </h4>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                        {(maintenanceSummaryMap[editingAsset.id] || maintenanceSummaryMap[editingAsset.code])?.count || 0} Kali Maintenance
                      </span>
                    </div>

                    <div className="text-2xl font-black text-emerald-800 tracking-tight">
                      Rp {((maintenanceSummaryMap[editingAsset.id] || maintenanceSummaryMap[editingAsset.code])?.totalCost || 0).toLocaleString('id-ID')}
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      *Data biaya terintegrasi otomatis dari menu Pemeliharaan / Maintenance.
                    </p>

                    {/* Maintenance Logs Sub-table */}
                    {((maintenanceSummaryMap[editingAsset.id] || maintenanceSummaryMap[editingAsset.code])?.items?.length || 0) > 0 ? (
                      <div className="mt-3 bg-white rounded-lg border border-emerald-100 overflow-hidden">
                        <div className="px-3 py-1.5 bg-emerald-100/60 text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex justify-between">
                          <span>Riwayat Servis</span>
                          <span>Biaya & Status</span>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                          {(maintenanceSummaryMap[editingAsset.id] || maintenanceSummaryMap[editingAsset.code])?.items.map((m, idx) => (
                            <div key={m.id || idx} className="p-2.5 text-xs flex justify-between items-start gap-2 hover:bg-slate-50">
                              <div>
                                <div className="font-semibold text-slate-800">{m.description}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>{m.maintenanceDate}</span>
                                  {m.vendorTechnician && <span>• {m.vendorTechnician}</span>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-bold text-emerald-700">Rp {(Number(m.cost) || 0).toLocaleString('id-ID')}</div>
                                <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  m.status === 'Selesai' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {m.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-slate-500 italic bg-white/70 p-2.5 rounded-lg border border-emerald-100/80 text-center">
                        Belum ada catatan biaya maintenance yang terdaftar untuk aset ini.
                      </div>
                    )}
                  </div>

                  {/* Riwayat Mutasi / Pemindahan BAST */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <History size={18} className="text-blue-700 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Riwayat Pemindahan / Mutasi Aset (BAST)
                        </h4>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                        {((mutationSummaryMap[editingAsset.id] || mutationSummaryMap[editingAsset.code])?.length || 0)} Mutasi
                      </span>
                    </div>

                    {((mutationSummaryMap[editingAsset.id] || mutationSummaryMap[editingAsset.code])?.length || 0) > 0 ? (
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {(mutationSummaryMap[editingAsset.id] || mutationSummaryMap[editingAsset.code])?.map((t, idx) => (
                          <div key={t.id || idx} className="p-3 text-xs space-y-1 hover:bg-slate-50">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-blue-700">{t.documentNo}</span>
                              <span className="text-[10px] text-slate-500">{t.transferDate}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-medium text-slate-800">
                              <span>{t.originLocation || 'Lokasi Awal'}</span>
                              <ArrowRight size={12} className="text-slate-400 shrink-0" />
                              <span className="font-bold text-emerald-700">{t.destinationLocation}</span>
                            </div>
                            {t.reason && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded mt-1">
                                Alasan: {t.reason}
                              </p>
                            )}
                            <div className="text-[10px] text-slate-400 flex justify-between pt-1">
                              <span>Pengirim: {t.senderName || '-'}</span>
                              <span>Penerima: {t.receiverName || '-'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                        Aset belum pernah mengalami riwayat pemindahan / mutasi lokasi.
                      </div>
                    )}
                  </div>
                </div>
              )}

              </fieldset>

              {/* Footer */}
              <div className="pt-4 flex justify-between items-center gap-3">
                {editingAsset && (
                  <button
                    type="button"
                    onClick={() => setSummaryAssetToPrint(editingAsset)}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-2 border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <Printer size={15} />
                    <span>Cetak Summary & History PDF</span>
                  </button>
                )}
                <div className="flex justify-end gap-3 ml-auto">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    {(!editingAsset || isAdmin) ? 'Batal' : 'Tutup'}
                  </button>
                  {(!editingAsset || isAdmin) && (
                    <button 
                      type="submit"
                      className="px-5 py-2 text-white font-semibold rounded-xl text-sm shadow-md transition-colors cursor-pointer"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {editingAsset ? 'Simpan Perubahan' : 'Registrasi Aset'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* PRINT / MANAGEMENT SUMMARY ASSET MODAL */}
      {summaryAssetToPrint && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto backdrop-blur-xs no-print-bg">
          {/* Print Style Injector */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-asset-summary-sheet, #printable-asset-summary-sheet * {
                visibility: visible !important;
              }
              #printable-asset-summary-sheet {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 15mm !important;
                background: white !important;
                box-shadow: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col my-auto">
            {/* Modal Top Action Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0 no-print">
              <div className="flex items-center gap-2">
                <FileCheck className="text-emerald-400" size={20} />
                <h3 className="font-bold text-sm sm:text-base">Pratinjau Summary Aset - Management Report</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.focus();
                    setTimeout(() => window.print(), 100);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak / Save as PDF (Print)</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const elem = document.getElementById('printable-asset-summary-sheet');
                    if (!elem) return;
                    try {
                      setIsGeneratingPDF(true);

                      const oklchToRgbString = (oklchStr: string): string => {
                        if (!oklchStr || typeof oklchStr !== 'string' || !oklchStr.includes('oklch')) {
                          return oklchStr;
                        }
                        return oklchStr.replace(/oklch\(\s*([\d.%]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/gi, (match, lRaw, cRaw, hRaw, aRaw) => {
                          let l = lRaw.endsWith('%') ? parseFloat(lRaw) / 100 : parseFloat(lRaw);
                          let c = parseFloat(cRaw);
                          let h = parseFloat(hRaw);
                          let alpha = aRaw ? (aRaw.endsWith('%') ? parseFloat(aRaw) / 100 : parseFloat(aRaw)) : 1;

                          const hRad = (h * Math.PI) / 180;
                          const aLab = c * Math.cos(hRad);
                          const bLab = c * Math.sin(hRad);

                          const l_ = l + 0.3963377774 * aLab + 0.2158037573 * bLab;
                          const m_ = l - 0.1055613458 * aLab - 0.0638541728 * bLab;
                          const s_ = l - 0.0894841775 * aLab - 1.2914855480 * bLab;

                          const l3 = l_ * l_ * l_;
                          const m3 = m_ * m_ * m_;
                          const s3 = s_ * s_ * s_;

                          let rLinear = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
                          let gLinear = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
                          let bLinear = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

                          const toSrgb = (x: number) => {
                            x = Math.max(0, Math.min(1, x));
                            return Math.round((x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055) * 255);
                          };

                          const r = toSrgb(rLinear);
                          const g = toSrgb(gLinear);
                          const b = toSrgb(bLinear);

                          if (alpha < 1) {
                            return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
                          }
                          return `rgb(${r}, ${g}, ${b})`;
                        });
                      };

                      const canvas = await html2canvas(elem, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff',
                        logging: false,
                        onclone: (clonedDoc) => {
                          clonedDoc.querySelectorAll('style').forEach((styleEl) => {
                            if (styleEl.textContent && styleEl.textContent.includes('oklch')) {
                              styleEl.textContent = oklchToRgbString(styleEl.textContent);
                            }
                          });

                          clonedDoc.querySelectorAll('*').forEach((el) => {
                            const htmlEl = el as HTMLElement;
                            if (htmlEl.style && htmlEl.style.cssText && htmlEl.style.cssText.includes('oklch')) {
                              htmlEl.style.cssText = oklchToRgbString(htmlEl.style.cssText);
                            }
                          });
                        }
                      });
                      const imgData = canvas.toDataURL('image/png');
                      const pdf = new jsPDF('p', 'mm', 'a4');
                      const pdfWidth = pdf.internal.pageSize.getWidth();
                      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                      pdf.save(`${summaryAssetToPrint.code}_Summary_Aset.pdf`);
                    } catch (err) {
                      console.error('Error pdf:', err);
                      window.print();
                    } finally {
                      setIsGeneratingPDF(false);
                    }
                  }}
                  disabled={isGeneratingPDF}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>Unduh PDF Langsung</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSummaryAssetToPrint(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 sm:p-8 overflow-y-auto bg-slate-100 space-y-6">
              <div 
                id="printable-asset-summary-sheet" 
                className="bg-white p-8 sm:p-10 rounded-xl shadow-md max-w-3xl mx-auto space-y-6 border border-slate-200 text-slate-900 font-sans"
              >
                {/* Document Header KOP */}
                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3">
                    <TmiiLogo className="w-14 h-14 shrink-0" />
                    <div>
                      <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-wider">
                        PT Bhumi Visatanda Indonesia
                      </h1>
                      <h2 className="text-xs sm:text-sm font-bold text-slate-700 tracking-wide mt-0.5">
                        Taman Mini Indonesia Indah
                      </h2>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Jl. Raya Taman Mini Indonesia Indah, Jakarta Timur 13560 | Website: tmii.co.id
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-mono font-bold text-slate-500">NO. DOKUMEN:</div>
                    <div className="text-xs font-mono font-bold text-slate-900">TMII/SUMMARY/{summaryAssetToPrint.code}</div>
                    <div className="text-[10px] text-slate-500 mt-1">Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Document Title Banner */}
                <div className="text-center py-2 bg-slate-900 text-white rounded-lg">
                  <h2 className="text-sm font-black uppercase tracking-widest">
                    LEMBAR SUMMARY REGISTRASI & RIWAYAT ASET TETAP
                  </h2>
                </div>

                {/* Section 1: Detail Spesifikasi & Registrasi */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                    I. IDENTITAS & SPESIFIKASI ASET
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Kode Aset</span>
                      <span className="font-mono font-black text-blue-700 text-sm">{summaryAssetToPrint.code}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Nama Barang</span>
                      <span className="font-bold text-slate-900">{summaryAssetToPrint.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Klasifikasi</span>
                      <span className="font-bold text-purple-700">{summaryAssetToPrint.classification || 'Aset Tetap'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Merk / Tipe</span>
                      <span className="font-medium text-slate-800">{summaryAssetToPrint.brand || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Kepemilikan</span>
                      <span className="font-medium text-slate-800">{summaryAssetToPrint.ownership || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Kondisi / Status</span>
                      <span className="font-bold text-slate-900">{summaryAssetToPrint.condition} ({summaryAssetToPrint.status})</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Wilayah / Area</span>
                      <span className="font-medium text-slate-800">{summaryAssetToPrint.area || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Lokasi Penempatan</span>
                      <span className="font-bold text-emerald-800">{summaryAssetToPrint.location}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Kategori / Jenis</span>
                      <span className="font-medium text-slate-800">{summaryAssetToPrint.category || '-'} / {summaryAssetToPrint.type || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Tanggal Perolehan</span>
                      <span className="font-medium text-slate-800">{summaryAssetToPrint.acquisitionDate || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Masa Manfaat</span>
                      <span className="font-medium text-slate-800">{summaryAssetToPrint.usefulLife || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Terakhir Servis</span>
                      <span className="font-medium text-slate-800">{summaryAssetToPrint.lastMaintenance || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Petugas Registrasi</span>
                      <span className="font-bold text-blue-700">{summaryAssetToPrint.createdByName || summaryAssetToPrint.createdBy || 'Staf TMII'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Waktu Registrasi</span>
                      <span className="font-medium text-slate-800">{summaryAssetToPrint.createdAt ? new Date(summaryAssetToPrint.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Ringkasan Nilai Keuangan Aset */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                    II. RINGKASAN NILAI KEUANGAN & PEMELIHARAAN
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Harga Perolehan Awal</div>
                      <div className="text-base font-black text-slate-800 mt-1">
                        Rp {(Number(summaryAssetToPrint.acquisitionCost) || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">Total Biaya Maintenance</div>
                      <div className="text-base font-black text-emerald-800 mt-1">
                        Rp {((maintenanceSummaryMap[summaryAssetToPrint.id] || maintenanceSummaryMap[summaryAssetToPrint.code])?.totalCost || 0).toLocaleString('id-ID')}
                      </div>
                      <div className="text-[9px] text-emerald-700 mt-0.5">
                        Frekuensi: {(maintenanceSummaryMap[summaryAssetToPrint.id] || maintenanceSummaryMap[summaryAssetToPrint.code])?.count || 0} kali
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="text-[10px] font-bold text-blue-800 uppercase">Total Akumulasi Investasi</div>
                      <div className="text-base font-black text-blue-900 mt-1">
                        Rp {((Number(summaryAssetToPrint.acquisitionCost) || 0) + ((maintenanceSummaryMap[summaryAssetToPrint.id] || maintenanceSummaryMap[summaryAssetToPrint.code])?.totalCost || 0)).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Detail Riwayat Pemeliharaan & Maintenance */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                    III. RIWAYAT PEMELIHARAAN & MAINTENANCE
                  </h3>
                  {((maintenanceSummaryMap[summaryAssetToPrint.id] || maintenanceSummaryMap[summaryAssetToPrint.code])?.items?.length || 0) > 0 ? (
                    <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2 border border-slate-200">Tgl Servis</th>
                          <th className="p-2 border border-slate-200">Deskripsi Pemeliharaan</th>
                          <th className="p-2 border border-slate-200">Teknisi / Vendor</th>
                          <th className="p-2 border border-slate-200 text-right">Biaya (IDR)</th>
                          <th className="p-2 border border-slate-200 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(maintenanceSummaryMap[summaryAssetToPrint.id] || maintenanceSummaryMap[summaryAssetToPrint.code])?.items.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 border border-slate-200 font-medium whitespace-nowrap">{m.maintenanceDate}</td>
                            <td className="p-2 border border-slate-200">{m.description}</td>
                            <td className="p-2 border border-slate-200">{m.vendorTechnician || '-'}</td>
                            <td className="p-2 border border-slate-200 text-right font-bold text-emerald-800">
                              Rp {(Number(m.cost) || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="p-2 border border-slate-200 text-center font-bold">{m.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                      Belum ada riwayat pemeliharaan yang tercatat untuk aset ini.
                    </p>
                  )}
                </div>

                {/* Section 4: Detail Riwayat Mutasi & Pemindahan BAST */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                    IV. RIWAYAT MUTASI & PEMINDAHAN LOKASI (BAST)
                  </h3>
                  {((mutationSummaryMap[summaryAssetToPrint.id] || mutationSummaryMap[summaryAssetToPrint.code])?.length || 0) > 0 ? (
                    <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2 border border-slate-200">No. BAST</th>
                          <th className="p-2 border border-slate-200">Tanggal</th>
                          <th className="p-2 border border-slate-200">Lokasi Asal</th>
                          <th className="p-2 border border-slate-200">Lokasi Tujuan</th>
                          <th className="p-2 border border-slate-200">Penanggung Jawab</th>
                          <th className="p-2 border border-slate-200">Alasan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(mutationSummaryMap[summaryAssetToPrint.id] || mutationSummaryMap[summaryAssetToPrint.code])?.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 border border-slate-200 font-bold text-blue-700 whitespace-nowrap">{t.documentNo}</td>
                            <td className="p-2 border border-slate-200 whitespace-nowrap">{t.transferDate}</td>
                            <td className="p-2 border border-slate-200">{t.originLocation}</td>
                            <td className="p-2 border border-slate-200 font-bold text-emerald-800">{t.destinationLocation}</td>
                            <td className="p-2 border border-slate-200 text-[11px]">{t.senderName} &rarr; {t.receiverName}</td>
                            <td className="p-2 border border-slate-200">{t.reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                      Aset ini belum pernah dipindahkan dari posisi registrasi awal.
                    </p>
                  )}
                </div>

                {/* Section 5: Catatan Tambahan */}
                {summaryAssetToPrint.notes && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 border-b border-slate-200 pb-1">
                      V. CATATAN KETERANGAN
                    </h3>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line">
                      {summaryAssetToPrint.notes}
                    </p>
                  </div>
                )}

                {/* Section 6: Lembar Pengesahan / Tanda Tangan */}
                <div className="pt-8 grid grid-cols-3 gap-4 text-center text-xs text-slate-800">
                  <div>
                    <p className="font-semibold text-[11px] text-slate-600">Dibuat Oleh,</p>
                    <p className="text-[10px] text-slate-400 mb-12">Asset Management Officer</p>
                    <p className="font-bold underline uppercase text-slate-900">Petugas Aset TMII</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[11px] text-slate-600">Diperiksa Oleh,</p>
                    <p className="text-[10px] text-slate-400 mb-12">Kepala Divisi Fasilitas & Aset</p>
                    <p className="font-bold underline uppercase text-slate-900">Kadiv Manajemen Aset</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[11px] text-slate-600">Disetujui Oleh,</p>
                    <p className="text-[10px] text-slate-400 mb-12">Direksi / Management TMII</p>
                    <p className="font-bold underline uppercase text-slate-900">Direksi TMII</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Asset Depreciation Schedule Modal */}
      {scheduleModalAsset && (
        <AssetDepreciationScheduleModal
          isOpen={Boolean(scheduleModalAsset)}
          onClose={() => setScheduleModalAsset(null)}
          asset={scheduleModalAsset}
          targetYearMonth={new Date().toISOString().slice(0, 7)}
          theme={theme}
        />
      )}

      {/* QR Camera Scanner Modal for Searching Assets */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanResult={(scannedCode) => {
          setSearchTerm(scannedCode);
          setIsQRScannerOpen(false);
        }}
        title="Scan QR Code Aset"
        subtitle="Arahkan kamera HP ke label QR Code aset untuk pencarian otomatis"
      />

      {/* Batch Asset Code Generator & Standardization Modal */}
      <BatchAssetCodeGeneratorModal
        isOpen={isBatchCodeModalOpen}
        onClose={() => setIsBatchCodeModalOpen(false)}
        assets={assets}
        configuredLocations={activeLocationsList}
        configuredCategories={configuredCategories}
        onUpdateAsset={onUpdateAsset}
        theme={theme}
      />
    </div>
  );
}
