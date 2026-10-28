import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  ArrowLeft, 
  Camera, 
  CheckCircle2, 
  Clock, 
  FileText, 
  HelpCircle, 
  Image as ImageIcon, 
  Loader2, 
  MapPin, 
  MoveRight, 
  Phone, 
  QrCode, 
  Send, 
  ShieldCheck, 
  Tag, 
  User, 
  X,
  Copy,
  Check,
  Wrench,
  Truck,
  Sparkles,
  Search
} from 'lucide-react';
import { collection, addDoc, query, onSnapshot, orderBy, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ConfiguredLocation, DEFAULT_ASSET_LOCATIONS } from '../types';
import TmiiLogo from './TmiiLogo';
import QRScannerModal from './QRScannerModal';

interface GuestReportPortalProps {
  onBackToLogin?: () => void;
  configuredLocations?: ConfiguredLocation[];
}

export default function GuestReportPortal({ onBackToLogin, configuredLocations = [] }: GuestReportPortalProps) {
  // Live sync locations from Firestore collection 'asset_location'
  const [liveLocations, setLiveLocations] = useState<ConfiguredLocation[]>([]);

  useEffect(() => {
    const locQuery = query(collection(db, 'asset_location'), orderBy('region', 'asc'));
    const unsubscribe = onSnapshot(locQuery, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ConfiguredLocation[];
        setLiveLocations(data);
      }
    }, (err) => {
      console.warn('Real-time location sync notice (fallback to defaults):', err);
    });
    return () => unsubscribe();
  }, []);

  // Compute active locations from Firestore, props, or defaults (115 locations)
  const activeLocations: ConfiguredLocation[] = useMemo(() => {
    if (liveLocations && liveLocations.length > 0) {
      return liveLocations;
    }
    if (configuredLocations && configuredLocations.length > 0) {
      return configuredLocations;
    }
    return DEFAULT_ASSET_LOCATIONS.map((loc, idx) => ({
      id: `default-${idx}`,
      name: loc.name,
      region: loc.region,
      category: loc.category,
      description: loc.description,
      latitude: loc.latitude,
      longitude: loc.longitude,
      createdAt: ''
    }));
  }, [liveLocations, configuredLocations]);

  // Form fields
  const [reportType, setReportType] = useState<'Kerusakan' | 'Pemindahan' | 'Lainnya'>('Kerusakan');
  const [isUntagged, setIsUntagged] = useState(false);
  const [assetCode, setAssetCode] = useState('');
  const [assetName, setAssetName] = useState('');
  const [locationArea, setLocationArea] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [locationDetail, setLocationDetail] = useState('');
  const [priority, setPriority] = useState<'Rendah' | 'Sedang' | 'Tinggi' | 'Urgent'>('Sedang');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');

  // Filter and group locations by region
  const filteredLocations = useMemo(() => {
    if (!locationSearch.trim()) return activeLocations;
    const term = locationSearch.toLowerCase().trim();
    return activeLocations.filter(loc => 
      loc.name.toLowerCase().includes(term) ||
      loc.region.toLowerCase().includes(term) ||
      (loc.category && loc.category.toLowerCase().includes(term)) ||
      (loc.description && loc.description.toLowerCase().includes(term))
    );
  }, [activeLocations, locationSearch]);

  const groupedLocations = useMemo<Record<string, ConfiguredLocation[]>>(() => {
    const groups: Record<string, ConfiguredLocation[]> = {};
    filteredLocations.forEach(loc => {
      const reg = loc.region || 'Lainnya';
      if (!groups[reg]) groups[reg] = [];
      groups[reg].push(loc);
    });
    // Sort locations alphabetically within each region
    Object.keys(groups).forEach(reg => {
      groups[reg].sort((a, b) => a.name.localeCompare(b.name, 'id'));
    });
    return groups;
  }, [filteredLocations]);
  
  // Photo upload
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // QR Code Scanner State
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const handleQRScanResult = async (scannedText: string) => {
    let cleanedCode = scannedText.trim();
    let parsedName = '';
    let parsedLocation = '';

    // If QR code is JSON format
    if (cleanedCode.startsWith('{') && cleanedCode.endsWith('}')) {
      try {
        const obj = JSON.parse(cleanedCode);
        if (obj.code || obj.assetCode || obj.id) {
          cleanedCode = String(obj.code || obj.assetCode || obj.id).trim();
        }
        if (obj.name || obj.assetName) {
          parsedName = String(obj.name || obj.assetName).trim();
        }
        if (obj.location || obj.locationArea) {
          parsedLocation = String(obj.location || obj.locationArea).trim();
        }
      } catch {
        // use raw
      }
    } else if (cleanedCode.includes('http://') || cleanedCode.includes('https://')) {
      // If QR code contains a URL
      try {
        const url = new URL(cleanedCode);
        const codeParam = url.searchParams.get('code') || url.searchParams.get('assetCode') || url.searchParams.get('id');
        if (codeParam) {
          cleanedCode = codeParam.trim();
        } else {
          const parts = url.pathname.split('/').filter(Boolean);
          if (parts.length > 0) {
            cleanedCode = parts[parts.length - 1];
          }
        }
      } catch {
        // use raw
      }
    }

    setAssetCode(cleanedCode);
    setIsUntagged(false);

    if (parsedName) setAssetName(parsedName);
    if (parsedLocation) setLocationArea(parsedLocation);

    // Try looking up the asset in Firestore to auto-fill asset details
    try {
      const qCode = query(collection(db, 'fixed_asset'), where('code', '==', cleanedCode));
      const snap = await getDocs(qCode);
      if (!snap.empty) {
        const assetData = snap.docs[0].data();
        if (assetData.name && !parsedName) {
          setAssetName(assetData.name);
        }
        if (assetData.location && !parsedLocation) {
          // If the location matches one of our locations or can be set directly
          setLocationArea(assetData.location);
        }
        setScanFeedback({
          type: 'success',
          message: `QR Valid! Aset: "${assetData.name || cleanedCode}"${assetData.location ? ` di ${assetData.location}` : ''}`
        });
        return;
      }
    } catch (err) {
      console.warn('Asset lookup note:', err);
    }

    setScanFeedback({
      type: 'success',
      message: `Kode QR "${cleanedCode}" berhasil dipindai!`
    });
  };

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketNumber: string;
    createdAt: string;
    reportType: string;
    assetName: string;
    location: string;
  } | null>(null);
  const [copiedTicket, setCopiedTicket] = useState(false);

  // Compress and convert image to lightweight base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Berkas yang diunggah harus berupa gambar (JPG/PNG/WEBP).');
      return;
    }

    setPhotoName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDimension = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG quality 0.72 (~80-150KB)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          setPhotoBase64(dataUrl);
          setErrorMessage(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoBase64(null);
    setPhotoName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateTicketNumber = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return `LAP-${dateStr}-${randomSuffix}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic validations
    if (!reporterName.trim()) {
      setErrorMessage('Mohon cantumkan nama pelapor untuk konfirmasi.');
      return;
    }
    if (!reporterContact.trim()) {
      setErrorMessage('Mohon cantumkan nomor WhatsApp / kontak pelapor.');
      return;
    }
    if (!locationArea.trim()) {
      setErrorMessage('Mohon pilih titik lokasi atau kawasan TMII.');
      return;
    }
    if (!assetName.trim()) {
      setErrorMessage('Mohon isi nama atau jenis aset yang dilaporkan.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Mohon jelaskan secara ringkas kendala atau detail laporan.');
      return;
    }

    setIsSubmitting(true);

    try {
      const ticketNumber = generateTicketNumber();
      const currentIso = new Date().toISOString();
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (priority === 'Urgent' ? 1 : priority === 'Tinggi' ? 2 : 5));
      const dueDateStr = targetDate.toISOString().split('T')[0];

      const reportTitle = `[LAPORAN TAMU: ${reportType}] ${assetName.trim()}${assetCode ? ` (${assetCode.trim()})` : ''}`;

      const payload = {
        title: reportTitle,
        description: description.trim(),
        status: 'Belum Dimulai' as const,
        priority: priority,
        category: 'Fixed Asset' as const,
        assignee: 'Unassigned / Tim Pengawas Aset',
        startDate: currentIso.split('T')[0],
        dueDate: dueDateStr,
        createdAt: currentIso,
        notes: `Pelapor: ${reporterName.trim()} | Kontak: ${reporterContact.trim()} | Lokasi: ${locationArea}${locationDetail ? ` - ${locationDetail.trim()}` : ''}${isUntagged ? ' [STATUS: ASET BELUM DITAGGING/MANUAL]' : ''}`,
        source: 'guest' as const,
        reporterName: reporterName.trim(),
        reporterContact: reporterContact.trim(),
        ticketNumber: ticketNumber,
        reportType: reportType,
        assetCode: isUntagged ? 'BELUM_DITAGGING' : (assetCode.trim() || '-'),
        assetName: assetName.trim(),
        locationArea: locationArea,
        locationDetail: locationDetail.trim(),
        isUntagged: isUntagged,
        photoUrl: photoBase64 || ''
      };

      await addDoc(collection(db, 'task'), payload);

      setSubmittedTicket({
        ticketNumber,
        createdAt: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
        reportType,
        assetName: assetName.trim(),
        location: `${locationArea}${locationDetail ? ` - ${locationDetail.trim()}` : ''}`
      });

    } catch (err: any) {
      console.error('Failed to submit guest report:', err);
      setErrorMessage('Terjadi kendala saat mengirim laporan ke server. Silakan coba kembali atau hubungi Call Center TMII.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedTicket(null);
    setReportType('Kerusakan');
    setIsUntagged(false);
    setAssetCode('');
    setAssetName('');
    setLocationArea('');
    setLocationSearch('');
    setLocationDetail('');
    setPriority('Sedang');
    setDescription('');
    setPhotoBase64(null);
    setPhotoName('');
    setErrorMessage(null);
    setScanFeedback(null);
    setIsQRScannerOpen(false);
  };

  const handleCopyTicket = () => {
    if (!submittedTicket) return;
    navigator.clipboard.writeText(submittedTicket.ticketNumber);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between" id="guest-portal">
      {/* Top Header Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TmiiLogo height="2.4rem" color="#0B6B5D" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 leading-tight">
                  Portal Pengaduan & Laporan Aset
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Akses Tamu
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Taman Mini Indonesia Indah</p>
            </div>
          </div>

          {onBackToLogin && (
            <button
              onClick={onBackToLogin}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Login Petugas</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Form Area */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {submittedTicket ? (
          /* Success Screen with Digital Ticket */
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-lg text-center max-w-xl mx-auto animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={36} />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Laporan Berhasil Diterima!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Terima kasih atas kepedulian Anda menjaga fasilitas dan aset Taman Mini Indonesia Indah. Laporan ini telah otomatis masuk ke sistem <strong>Task Monitoring</strong> petugas kami.
            </p>

            {/* Ticket Card */}
            <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nomor Tiket Laporan</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                  Menunggu Review Petugas
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-lg sm:text-xl font-black text-emerald-700 tracking-wider">
                  {submittedTicket.ticketNumber}
                </span>
                <button
                  onClick={handleCopyTicket}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedTicket ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedTicket ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-400">Jenis Laporan:</span>
                  <span className="font-bold text-slate-800">{submittedTicket.reportType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Aset:</span>
                  <span className="font-bold text-slate-800 text-right line-clamp-1">{submittedTicket.assetName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lokasi:</span>
                  <span className="font-medium text-slate-700 text-right line-clamp-1">{submittedTicket.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Waktu Terkirim:</span>
                  <span className="font-medium text-slate-700">{submittedTicket.createdAt} WIB</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleResetForm}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Sparkles size={15} />
                <span>Kirim Laporan Lainnya</span>
              </button>

              {onBackToLogin && (
                <button
                  onClick={onBackToLogin}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={15} />
                  <span>Kembali ke Halaman Masuk</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Form Entry Screen */
          <div className="space-y-6">
            {/* Introductory Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-[#0B6B5D] to-[#043329] text-white p-6 rounded-3xl shadow-md relative overflow-hidden">
              <div className="relative z-10 max-w-2xl space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 text-emerald-200 border border-white/20 text-[10px] font-extrabold uppercase tracking-widest rounded-full backdrop-blur-md">
                  <ShieldCheck size={13} />
                  Partisipasi Pengawasan Aset
                </span>
                <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white leading-tight">
                  Laporkan Kerusakan atau Pemindahan Aset TMII
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
                  Ditemukan fasilitas rusak, tidak berfungsi, atau berpindah tempat? Laporkan di sini secara cepat.
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
                <AlertTriangle size={18} className="shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-7">
              
              {/* SECTION 1: Jenis Laporan */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={15} className="text-emerald-600" />
                  <span>1. Jenis Laporan</span>
                  <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setReportType('Kerusakan')}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      reportType === 'Kerusakan'
                        ? 'border-red-500 bg-red-50/60 ring-2 ring-red-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${reportType === 'Kerusakan' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Wrench size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Kerusakan Aset</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Fisik patah, bocor, mati, retak, atau malfungsi</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportType('Pemindahan')}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      reportType === 'Pemindahan'
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${reportType === 'Pemindahan' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Truck size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Pemindahan Aset</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Aset berpindah posisi, relokasi, atau salah tempat</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportType('Lainnya')}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      reportType === 'Lainnya'
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${reportType === 'Lainnya' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <HelpCircle size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Laporan Lainnya</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Pembersihan mendesak, inspeksi berkala, dsb.</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* SECTION 2: Informasi Aset & Opsi Manual Untagged */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag size={15} className="text-emerald-600" />
                    <span>2. Identifikasi Aset</span>
                    <span className="text-red-500">*</span>
                  </label>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Primary QR Scanner Action Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUntagged(false);
                        setIsQRScannerOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer"
                    >
                      <Camera size={14} />
                      <span>Scan QR Code (Kamera HP)</span>
                    </button>

                    {/* Toggle Checkbox: Aset Belum Di-tagging (Opsional Sesuai Permintaan User) */}
                    <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={isUntagged}
                        onChange={(e) => {
                          setIsUntagged(e.target.checked);
                          if (e.target.checked) {
                            setAssetCode('');
                            setScanFeedback(null);
                          }
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        Aset Belum Di-tagging / Tanpa QR
                      </span>
                    </label>
                  </div>
                </div>

                {isUntagged ? (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <HelpCircle size={14} className="text-amber-600" />
                      Mode Input Manual (Aset Belum Di-tagging)
                    </p>
                    <p className="text-[11px] text-amber-800/90 leading-relaxed">
                      Silakan ketik nama barang/fasilitas dan deskripsikan ciri fisiknya. Tim inventaris TMII akan melakukan verifikasi fisik dan menempelkan barcode/QR code resmi.
                    </p>
                  </div>
                ) : null}

                {/* Scan Feedback Banner */}
                {scanFeedback && !isUntagged && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span className="font-semibold">{scanFeedback.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScanFeedback(null)}
                      className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-0.5 rounded cursor-pointer"
                      title="Tutup pesan"
                    >
                      &times;
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nama Aset / Fasilitas <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                      placeholder={isUntagged ? "Contoh: Kursi Taman Besi / Lampu Sorot Panggung" : "Contoh: Tiang Lampu Solar Pintu 1 / Paving Track Danau"}
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Kode Aset (Dari Stiker / Label QR)
                      </label>
                      {!isUntagged && (
                        <button
                          type="button"
                          onClick={() => setIsQRScannerOpen(true)}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Camera size={13} />
                          <span>Buka Kamera</span>
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        disabled={isUntagged}
                        value={assetCode}
                        onChange={(e) => setAssetCode(e.target.value)}
                        placeholder={isUntagged ? "(Aset belum memiliki kode)" : "Contoh: BMN03.INF04.26-001"}
                        className="w-full text-xs sm:text-sm pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-mono uppercase disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      {!isUntagged && (
                        <button
                          type="button"
                          onClick={() => setIsQRScannerOpen(true)}
                          title="Klik untuk Scan QR Code Menggunakan Kamera"
                          className="absolute right-2 top-2 p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <QrCode size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Lokasi Aset (Terintegrasi 115 Lokasi Pengaturan) */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={15} className="text-emerald-600" />
                    <span>3. Lokasi & Wilayah Kawasan</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                    {activeLocations.length} Lokasi Terdaftar
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Titik Lokasi / Anjungan / Fasilitas TMII <span className="text-red-500">*</span>
                    </label>

                    {/* Quick Search Box for finding among 115 locations */}
                    <div className="relative mb-2">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        placeholder="Cari lokasi (contoh: Jawa Tengah, Pintu 1, Museum)..."
                        className="w-full text-xs pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
                      />
                      {locationSearch && (
                        <button
                          type="button"
                          onClick={() => setLocationSearch('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 text-xs font-bold cursor-pointer"
                          title="Hapus pencarian"
                        >
                          &times;
                        </button>
                      )}
                    </div>

                    <select
                      required
                      value={locationArea}
                      onChange={(e) => setLocationArea(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer font-medium"
                    >
                      <option value="" disabled>-- Pilih dari {activeLocations.length} Lokasi Kawasan TMII --</option>
                      {Object.keys(groupedLocations).length === 0 ? (
                        <option value="" disabled>Tidak ada lokasi yang cocok dengan "{locationSearch}"</option>
                      ) : (
                        (Object.entries(groupedLocations) as [string, ConfiguredLocation[]][]).map(([region, locs]) => (
                          <optgroup key={region} label={`${region} (${locs.length} Lokasi)`}>
                            {locs.map((loc) => (
                              <option key={loc.id || loc.name} value={loc.name}>
                                {loc.name} {loc.category ? `• ${loc.category}` : ''}
                              </option>
                            ))}
                          </optgroup>
                        ))
                      )}
                    </select>
                    {locationArea && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <Check size={12} className="text-emerald-600 shrink-0" />
                        <span>Terpilih: <strong>{locationArea}</strong></span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Detail Lokasi Spesifik / Patokan
                    </label>
                    <input
                      type="text"
                      value={locationDetail}
                      onChange={(e) => setLocationDetail(e.target.value)}
                      placeholder="Contoh: Depan Toilet / Samping Pintu Masuk / Lantai 2"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                    />
                    <span className="text-[11px] text-slate-400 mt-1.5 block">
                      Bantu petugas menemukan titik presisi aset di lapangan
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Detail Kendala & Urgensi */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={15} className="text-emerald-600" />
                    <span>4. Deskripsi & Tingkat Urgensi</span>
                    <span className="text-red-500">*</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400">Prioritas:</span>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                        priority === 'Urgent' ? 'bg-red-50 text-red-700 border-red-300' :
                        priority === 'Tinggi' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <option value="Rendah">Rendah (Normal)</option>
                      <option value="Sedang">Sedang (Perlu Dicek)</option>
                      <option value="Tinggi">Tinggi (Penting)</option>
                      <option value="Urgent">Urgent (Bahaya / Mendesak)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Jelaskan kendala secara terperinci. Contoh: Tiang lampu miring dan kabel terbuka di area pejalan kaki, berisiko terhadap keselamatan pengunjung saat hujan..."
                    className="w-full text-xs sm:text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all resize-y"
                  ></textarea>
                </div>
              </div>

              {/* SECTION 5: Foto Bukti Kerusakan / Kondisi */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera size={15} className="text-emerald-600" />
                  <span>5. Lampiran Foto Kondisi Aset</span>
                  <span className="text-[11px] font-normal text-slate-400 normal-case">(Opsional namun sangat disarankan)</span>
                </label>

                {photoBase64 ? (
                  <div className="relative inline-block border-2 border-emerald-500 rounded-2xl overflow-hidden shadow-sm">
                    <img
                      src={photoBase64}
                      alt="Bukti Kerusakan"
                      className="max-h-56 max-w-full object-contain bg-slate-900/5"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md cursor-pointer transition-colors"
                      title="Hapus Foto"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-white text-[10px] py-1 px-2.5 truncate">
                      {photoName || 'Foto Terlampir'}
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Camera size={20} />
                    </div>
                    <div className="text-xs font-bold text-slate-700">
                      Ambil Foto dengan Kamera atau Pilih Berkas Gambar
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Mendukung format JPG, PNG, atau WEBP
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* SECTION 6: Identitas Pelapor */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={15} className="text-emerald-600" />
                  <span>6. Kontak Pelapor (Untuk Konfirmasi Petugas)</span>
                  <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nama Lengkap Pelapor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder="Nama Anda"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nomor WhatsApp / Telepon <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={reporterContact}
                        onChange={(e) => setReporterContact(e.target.value)}
                        placeholder="0812xxxxxxx"
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                        <Phone size={16} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button Bar */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[11px] text-slate-400 text-center sm:text-left">
                  Laporan akan langsung diteruskan ke tim pengawas aset & operasional TMII.
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-md shadow-emerald-700/20 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Mengirimkan Laporan...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Kirim Laporan Sekarang</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        <p>&copy; 2026 PT Bhumi Visatanda Indonesia — Taman Mini Indonesia Indah</p>
      </footer>

      {/* QR Scanner Camera Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanResult={handleQRScanResult}
        title="Scan QR Code Aset TMII"
        subtitle="Arahkan kamera HP ke label/stiker QR Code pada aset fisik TMII"
        defaultContinuousMode={false}
      />
    </div>
  );
}
