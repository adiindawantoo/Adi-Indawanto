import React, { useState, useMemo } from 'react';
import { FixedAsset, AppTheme } from '../types';
import { Search, Printer, CheckSquare, Square, Check, RefreshCw, Eye, EyeOff, LayoutGrid, Download } from 'lucide-react';
import TmiiLogo from './TmiiLogo';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface FixedAssetsTaggingProps {
  assets: FixedAsset[];
  theme: AppTheme;
}

export default function FixedAssetsTagging({ assets, theme }: FixedAssetsTaggingProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('Semua');
  const [classificationFilter, setClassificationFilter] = useState('Semua');
  const [showPreview, setShowPreview] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  // Available filters
  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    assets.forEach(a => {
      if (a.location) locs.add(a.location);
    });
    return ['Semua', ...Array.from(locs)];
  }, [assets]);

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = 
        asset.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.brand && asset.brand.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesLocation = locationFilter === 'Semua' || asset.location === locationFilter;
      const matchesClassification = classificationFilter === 'Semua' || asset.classification === classificationFilter;

      return matchesSearch && matchesLocation && matchesClassification;
    });
  }, [assets, searchTerm, locationFilter, classificationFilter]);

  // Handle select/deselect
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    const currentFilteredIds = filteredAssets.map(a => a.id);
    const allSelected = currentFilteredIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      // Deselect all filtered items
      setSelectedIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      // Select all filtered items
      setSelectedIds(prev => {
        const union = new Set([...prev, ...currentFilteredIds]);
        return Array.from(union);
      });
    }
  };

  const selectedAssets = useMemo(() => {
    return assets.filter(a => selectedIds.includes(a.id));
  }, [assets, selectedIds]);

  // Handle print action
  const handlePrint = () => {
    if (selectedAssets.length === 0) return;
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const downloadSingleTagPDF = async (asset: FixedAsset) => {
    try {
      const element = document.getElementById(`preview-tag-${asset.id}`);
      if (!element) {
        alert('Gagal mendeteksi pratinjau label. Pastikan pratinjau ditampilkan.');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 3, // High print resolution
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach((style) => {
            if (style.textContent && style.textContent.includes('oklch')) {
              style.textContent = style.textContent.replace(/oklch\([^)]+\)/g, '#000000');
            }
          });
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.style && htmlEl.style.cssText && htmlEl.style.cssText.includes('oklch')) {
              htmlEl.style.cssText = htmlEl.style.cssText.replace(/oklch\([^)]+\)/g, '#000000');
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [60, 30]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 60, 30);
      pdf.save(`Label_${asset.code}_${asset.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (error) {
      console.error("Gagal mengunduh PDF label:", error);
      alert("Gagal mengunduh PDF label. Silakan coba kembali.");
    }
  };

  const downloadAllTagsPDF = async () => {
    if (selectedAssets.length === 0) return;
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [60, 30]
      });

      for (let i = 0; i < selectedAssets.length; i++) {
        const asset = selectedAssets[i];
        const element = document.getElementById(`preview-tag-${asset.id}`);
        if (!element) continue;

        if (i > 0) {
          pdf.addPage([60, 30], 'landscape');
        }

        const canvas = await html2canvas(element, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            const styleTags = clonedDoc.querySelectorAll('style');
            styleTags.forEach((style) => {
              if (style.textContent && style.textContent.includes('oklch')) {
                style.textContent = style.textContent.replace(/oklch\([^)]+\)/g, '#000000');
              }
            });
            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              if (htmlEl.style && htmlEl.style.cssText && htmlEl.style.cssText.includes('oklch')) {
                htmlEl.style.cssText = htmlEl.style.cssText.replace(/oklch\([^)]+\)/g, '#000000');
              }
            });
          }
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, 60, 30);
      }

      pdf.save(`Label_Tagging_Aset_${selectedAssets.length}_pcs.pdf`);
    } catch (error) {
      console.error("Gagal mengunduh semua PDF label:", error);
      alert("Gagal mengunduh semua PDF label. Silakan coba kembali.");
    }
  };

  return (
    <div className="space-y-6" id="assets-tagging-container">
      {/* Hide elements on print using Tailwind's print: utilities */}
      <div className="print:hidden">
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Printer size={20} className="text-slate-500" style={{ color: theme.primaryColor }} />
              Cetak Tagging QR Code Aset
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Pilih satu atau beberapa aset tetap untuk dicetak label tagging fisiknya (BW/Hitam-Putih 60x30mm). Label memuat QR Code besar, Logo TMII, Nama Aset penuh, dan Lokasi.
            </p>
            <div className="mt-1.5 text-[10px] bg-amber-50 text-amber-800 px-3 py-1 rounded-lg border border-amber-100 font-medium max-w-xl inline-block">
              Tip: Jika pencetakan terhambat oleh frame browser, silakan klik tombol <strong>"Buka di Tab Baru"</strong> di kanan atas, atau gunakan fitur <strong>"Unduh Semua Label (PDF)"</strong> untuk mengunduh seluruh label sekaligus.
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={downloadAllTagsPDF}
              disabled={selectedAssets.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Unduh semua label sebagai dokumen PDF"
            >
              <Download size={14} />
              <span>Unduh Semua Label (PDF) ({selectedAssets.length})</span>
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showPreview ? 'Sembunyikan Preview' : 'Tampilkan Preview'}</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={selectedAssets.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{ 
                backgroundColor: theme.primaryColor,
                boxShadow: selectedAssets.length > 0 ? `0 4px 12px ${theme.primaryColor}30` : 'none'
              }}
            >
              <Printer size={14} />
              <span>Cetak Tagging ({selectedAssets.length})</span>
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left panel: Asset Selection */}
          <div className={`${showPreview ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
              {/* Filter controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari Kode atau Nama Aset..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl focus:outline-none text-xs border border-slate-100 font-semibold text-gray-800"
                  />
                </div>

                <select
                  value={locationFilter}
                  onChange={e => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl focus:outline-none text-xs border border-slate-100 font-semibold text-gray-800"
                >
                  <option value="Semua">Semua Lokasi</option>
                  {uniqueLocations.filter(l => l !== 'Semua').map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>

                <select
                  value={classificationFilter}
                  onChange={e => setClassificationFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl focus:outline-none text-xs border border-slate-100 font-semibold text-gray-800"
                >
                  <option value="Semua">Semua Klasifikasi</option>
                  <option value="Aset">Aset Tetap (FA)</option>
                  <option value="LVA">Low Value Asset (LVA)</option>
                </select>
              </div>

              {/* Toolbar and Select All */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100 mb-3">
                <button
                  onClick={handleToggleAll}
                  className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {filteredAssets.length > 0 && filteredAssets.every(id => selectedIds.includes(id.id)) ? (
                    <CheckSquare size={16} className="text-indigo-600" style={{ color: theme.primaryColor }} />
                  ) : (
                    <Square size={16} className="text-slate-400" />
                  )}
                  <span>Pilih Semua yang Terfilter ({filteredAssets.length})</span>
                </button>
                <div className="text-xs text-slate-400 font-semibold">
                  {selectedIds.length} Aset Terpilih
                </div>
              </div>

              {/* Scrollable list */}
              <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-50 pr-1">
                {filteredAssets.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada aset tetap yang ditemukan untuk dicetak.
                  </div>
                ) : (
                  filteredAssets.map(asset => {
                    const isSelected = selectedIds.includes(asset.id);
                    return (
                      <div
                        key={asset.id}
                        onClick={() => handleToggleSelect(asset.id)}
                        className={`flex items-center justify-between py-3 px-3 rounded-2xl transition-all cursor-pointer ${
                          isSelected ? 'bg-indigo-50/10 border border-indigo-100/50' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">
                            {isSelected ? (
                              <div className="w-5 h-5 rounded-md flex items-center justify-center text-white" style={{ backgroundColor: theme.primaryColor }}>
                                <Check size={12} strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-md border-2 border-slate-300" />
                            )}
                          </div>
                          <div>
                            <div className="font-mono text-[10px] font-black text-slate-500">{asset.code}</div>
                            <div className="text-xs font-bold text-slate-900 truncate max-w-[220px] md:max-w-[320px]">{asset.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-slate-400 font-bold">{asset.location || '-'}</span>
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                asset.classification === 'LVA' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>
                                {asset.classification || 'Aset'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-700">Rp {(asset.acquisitionCost || 0).toLocaleString('id-ID')}</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">{asset.condition}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Printable Tag Previews */}
          {showPreview && (
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-200/40 shadow-inner h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <LayoutGrid size={14} />
                    Pratinjau Label Tagging ({selectedAssets.length})
                  </h4>
                  {selectedAssets.length > 0 && (
                    <span className="text-[9px] bg-slate-200 text-slate-700 font-extrabold px-2 py-0.5 rounded-full">
                      Sticker Silver PET Matte (60x30mm)
                    </span>
                  )}
                </div>

                {selectedAssets.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Printer size={20} />
                    </div>
                    <div className="text-xs text-slate-400 font-semibold max-w-[200px]">
                      Silakan pilih aset tetap di sebelah kiri untuk melihat pratinjau label yang siap dicetak.
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto max-h-[550px] space-y-4 pr-1 flex flex-col items-center">
                    {selectedAssets.map(asset => {
                      const displayLocation = asset.location 
                        ? (asset.location.toLowerCase().startsWith('lokasi') ? asset.location : `Lokasi ${asset.location}`)
                        : 'Lokasi TMII';

                      return (
                        <div
                          key={asset.id}
                          id={`preview-tag-${asset.id}`}
                          className="relative overflow-hidden flex shadow-md shrink-0 bg-white"
                          style={{
                            width: '60mm',
                            height: '30mm',
                            minWidth: '60mm',
                            minHeight: '30mm',
                            padding: '2.5mm 3mm',
                            boxSizing: 'border-box',
                            border: '1.5px solid #000000',
                            borderRadius: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2.5mm',
                            backgroundColor: '#ffffff',
                            color: '#000000'
                          }}
                        >
                          {/* Download PDF button (Screen only) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadSingleTagPDF(asset);
                            }}
                            className="absolute top-1 right-1 p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded shadow-sm print:hidden transition-colors cursor-pointer z-10"
                            title="Unduh Label PDF"
                          >
                            <Download size={11} />
                          </button>

                          {/* 1. Large QR Code (Left Column) */}
                          <div className="shrink-0 flex items-center justify-center" style={{ width: '24mm', height: '24mm' }}>
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(asset.code)}`}
                              alt={`QR ${asset.code}`}
                              className="w-[24mm] h-[24mm] object-contain pointer-events-none"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          {/* 2. Metadata Details (Right Column) */}
                          <div className="flex-1 flex flex-col justify-between h-[25mm] min-w-0 pr-1 text-black font-sans">
                            {/* Top part: Logo, Code, Name */}
                            <div className="flex flex-col min-w-0">
                              {/* tmii Logo */}
                              <div className="mb-0.5">
                                <TmiiLogo height="0.85rem" color="#000000" />
                              </div>

                              {/* Asset Code */}
                              <div className="font-extrabold text-[9.5px] text-black leading-tight tracking-tight break-all">
                                {asset.code}
                              </div>

                              {/* Asset Name */}
                              <div 
                                className="font-medium text-[7.5px] text-black leading-[1.2] mt-0.5 break-words whitespace-normal line-clamp-3" 
                                title={asset.name}
                              >
                                {asset.name}
                              </div>
                            </div>

                            {/* Bottom part: Line & Location */}
                            <div className="min-w-0 pt-0.5">
                              <div className="border-b-[1.5px] border-black mb-1 w-full"></div>
                              <div className="font-extrabold text-[8.5px] text-black leading-tight truncate">
                                {displayLocation}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PRINT-ONLY AREA (This is hidden in screen view and only shown when printing) */}
      <div className="hidden print:block bg-white text-black p-0 m-0" id="print-tags-container">
        <style>{`
          @media print {
            body {
              visibility: hidden !important;
              background-color: white !important;
              background-image: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #print-tags-container, #print-tags-container * {
              visibility: visible !important;
            }
            #print-tags-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 2mm !important;
              display: flex !important;
              flex-wrap: wrap !important;
              gap: 3mm !important;
              justify-content: flex-start !important;
            }
            @page {
              size: auto;
              margin: 0mm;
            }
            .silver-matte-print-sticker {
              width: 60mm !important;
              height: 30mm !important;
              min-width: 60mm !important;
              min-height: 30mm !important;
              max-width: 60mm !important;
              max-height: 30mm !important;
              padding: 2.5mm 3mm !important;
              box-sizing: border-box !important;
              border: 1.5px solid #000000 !important;
              background: #ffffff !important; /* Pure black & white */
              border-radius: 2px !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              display: flex !important;
              align-items: center !important;
              gap: 2.5mm !important;
              position: relative !important;
              overflow: hidden !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>
        {selectedAssets.map(asset => {
          const displayLocation = asset.location 
            ? (asset.location.toLowerCase().startsWith('lokasi') ? asset.location : `Lokasi ${asset.location}`)
            : 'Lokasi TMII';

          return (
            <div
              key={asset.id}
              className="silver-matte-print-sticker"
            >
              {/* 1. Large QR Code (Left Column) */}
              <div className="shrink-0 flex items-center justify-center" style={{ width: '24mm', height: '24mm' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(asset.code)}`}
                  alt={`QR ${asset.code}`}
                  className="w-[24mm] h-[24mm] object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* 2. Metadata Details (Right Column) */}
              <div className="flex-1 flex flex-col justify-between h-[25mm] min-w-0 pr-1 text-black font-sans">
                {/* Top part: Logo, Code, Name */}
                <div className="flex flex-col min-w-0">
                  {/* tmii Logo */}
                  <div className="mb-0.5">
                    <TmiiLogo height="0.85rem" color="#000000" />
                  </div>

                  {/* Asset Code */}
                  <div className="font-extrabold text-[9.5px] text-black leading-tight tracking-tight break-all">
                    {asset.code}
                  </div>

                  {/* Asset Name */}
                  <div 
                    className="font-medium text-[7.5px] text-black leading-[1.2] mt-0.5 break-words whitespace-normal"
                  >
                    {asset.name}
                  </div>
                </div>

                {/* Bottom part: Line & Location */}
                <div className="min-w-0 pt-0.5">
                  <div className="border-b-[1.5px] border-black mb-1 w-full"></div>
                  <div className="font-extrabold text-[8.5px] text-black leading-tight truncate">
                    {displayLocation}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
