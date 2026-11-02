import React, { useState, useMemo, useEffect } from 'react';
import { FixedAsset, AppTheme } from '../types';
import { Search, Printer, CheckSquare, Square, Check, Eye, EyeOff, LayoutGrid, Download, ExternalLink, X, AlertCircle } from 'lucide-react';
import TmiiLogo from './TmiiLogo';
import { 
  LabelPaperSize, 
  generateAssetTagPDF, 
  generatePrintableHtml, 
  generateQrDataUrl 
} from '../lib/tagPdfGenerator';

export type { LabelPaperSize };

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
  const [paperSize, setPaperSize] = useState<LabelPaperSize>('60x30');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [qrCodeMap, setQrCodeMap] = useState<Record<string, string>>({});

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
      setSelectedIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const union = new Set([...prev, ...currentFilteredIds]);
        return Array.from(union);
      });
    }
  };

  const selectedAssets = useMemo(() => {
    return assets.filter(a => selectedIds.includes(a.id));
  }, [assets, selectedIds]);

  // Pre-generate QR data URLs for selected assets to ensure instant, sharp preview
  useEffect(() => {
    let isCancelled = false;
    const generateQrs = async () => {
      const newMap: Record<string, string> = { ...qrCodeMap };
      for (const asset of selectedAssets) {
        if (!newMap[asset.code]) {
          const dataUrl = await generateQrDataUrl(asset.code);
          if (!isCancelled && dataUrl) {
            newMap[asset.code] = dataUrl;
          }
        }
      }
      if (!isCancelled) {
        setQrCodeMap(newMap);
      }
    };

    if (selectedAssets.length > 0) {
      generateQrs();
    }

    return () => {
      isCancelled = true;
    };
  }, [selectedAssets]);

  // High-fidelity Isolated Iframe Print & Fallback
  const handlePrint = async () => {
    if (selectedAssets.length === 0) return;

    try {
      // 1. Generate clean isolated print HTML for thermal label printer
      const printableHtml = await generatePrintableHtml(selectedAssets, paperSize);

      // 2. Remove existing print iframe if any
      const existingIframe = document.getElementById('thermal-label-print-frame');
      if (existingIframe) {
        existingIframe.remove();
      }

      // 3. Create invisible isolated print iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'thermal-label-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(printableHtml);
        frameDoc.close();

        // Allow images & styles to render then invoke print dialog
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (err) {
            console.warn("Iframe print triggered fallback:", err);
            window.focus();
            window.print();
          }
        }, 300);
      } else {
        window.focus();
        window.print();
      }

      // Also open print assistant modal to guide user if browser blocks dialog
      setShowPrintModal(true);
    } catch (error) {
      console.error("Error initiating print:", error);
      window.focus();
      window.print();
      setShowPrintModal(true);
    }
  };

  // Open standalone print page in new tab (bypasses all iframe print blocks)
  const openPrintInNewTab = async () => {
    if (selectedAssets.length === 0) return;
    try {
      const printableHtml = await generatePrintableHtml(selectedAssets, paperSize);
      const blob = new Blob([printableHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const newWin = window.open(url, '_blank');
      if (newWin) {
        newWin.focus();
      } else {
        alert("Browser memblokir pembukaan tab baru. Izinkan pop-up untuk situs ini atau gunakan opsi Unduh PDF.");
      }
    } catch (error) {
      console.error("Gagal membuka halaman cetak:", error);
    }
  };

  // Vector-sharp PDF download for single asset tag
  const downloadSingleTagPDF = async (asset: FixedAsset) => {
    try {
      setIsGeneratingPdf(true);
      const pdf = await generateAssetTagPDF([asset], paperSize);
      pdf.save(`Label_${paperSize}_${asset.code}_${asset.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (error) {
      console.error("Gagal mengunduh PDF label:", error);
      alert("Gagal mengunduh PDF label. Silakan coba kembali.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Vector-sharp PDF download for all selected asset tags
  const downloadAllTagsPDF = async () => {
    if (selectedAssets.length === 0) return;
    try {
      setIsGeneratingPdf(true);
      const pdf = await generateAssetTagPDF(selectedAssets, paperSize);
      pdf.save(`Label_Tagging_${paperSize}_${selectedAssets.length}_pcs.pdf`);
    } catch (error) {
      console.error("Gagal mengunduh semua PDF label:", error);
      alert("Gagal mengunduh semua PDF label. Silakan coba kembali.");
    } finally {
      setIsGeneratingPdf(false);
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
              Pilih satu atau beberapa aset tetap untuk dicetak label tagging fisiknya. Mendukung ukuran <strong className="text-slate-700 font-semibold">60x30mm (Standar)</strong> dan <strong className="text-slate-700 font-semibold">50x20mm (Kompak/Mini Roll)</strong>.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {/* Paper Size Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
                <span className="text-[10px] font-black uppercase text-slate-500 px-2 tracking-wider">Ukuran Label:</span>
                <button
                  type="button"
                  onClick={() => setPaperSize('60x30')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    paperSize === '60x30'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  60 x 30 mm <span className="text-[10px] opacity-70 font-normal">(Standar)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize('50x20')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    paperSize === '50x20'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  50 x 20 mm <span className="text-[10px] opacity-70 font-normal">(Kompak)</span>
                </button>
              </div>

              <div className="text-[10px] bg-amber-50 text-amber-800 px-3 py-1 rounded-lg border border-amber-100 font-medium inline-block">
                Tip: Thermal printer akan mencetak pas sesuai ukuran roll terpilih (<strong>{paperSize === '50x20' ? '50 x 20 mm' : '60 x 30 mm'}</strong>).
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={downloadAllTagsPDF}
              disabled={selectedAssets.length === 0 || isGeneratingPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title={`Unduh semua label (${paperSize}) sebagai dokumen PDF`}
            >
              <Download size={14} />
              <span>{isGeneratingPdf ? 'Membuat PDF...' : `Unduh PDF (${paperSize}) (${selectedAssets.length})`}</span>
            </button>
            <button
              onClick={openPrintInNewTab}
              disabled={selectedAssets.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Buka halaman cetak di tab baru browser (bebas dari pembatasan iframe)"
            >
              <ExternalLink size={14} />
              <span>Buka di Tab Baru</span>
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showPreview ? 'Sembunyikan' : 'Preview'}</span>
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
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <LayoutGrid size={14} />
                    Pratinjau Label Tagging ({selectedAssets.length})
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaperSize('60x30')}
                      className={`text-[9px] px-2.5 py-1 rounded-full font-extrabold transition-all cursor-pointer ${
                        paperSize === '60x30'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-200/80 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      60 x 30 mm
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperSize('50x20')}
                      className={`text-[9px] px-2.5 py-1 rounded-full font-extrabold transition-all cursor-pointer ${
                        paperSize === '50x20'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-200/80 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      50 x 20 mm
                    </button>
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full border border-indigo-100">
                      Thermal Silver ({paperSize === '50x20' ? '50×20mm' : '60×30mm'})
                    </span>
                  </div>
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

                      const is50x20 = paperSize === '50x20';
                      const qrSrc = qrCodeMap[asset.code] || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(asset.code)}`;

                      return (
                        <div
                          key={asset.id}
                          className="flex flex-col items-center bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md"
                        >
                          {/* Physical Sticker Representation */}
                          <div
                            id={`preview-tag-${asset.id}`}
                            className="relative overflow-hidden flex bg-white select-none shrink-0"
                            style={{
                              width: is50x20 ? '50mm' : '60mm',
                              height: is50x20 ? '20mm' : '30mm',
                              minWidth: is50x20 ? '50mm' : '60mm',
                              minHeight: is50x20 ? '20mm' : '30mm',
                              maxWidth: is50x20 ? '50mm' : '60mm',
                              maxHeight: is50x20 ? '20mm' : '30mm',
                              padding: is50x20 ? '1.2mm 1.6mm' : '2mm 2.5mm',
                              boxSizing: 'border-box',
                              border: '1px dashed #cbd5e1',
                              borderRadius: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: is50x20 ? '1.8mm' : '2.5mm',
                              backgroundColor: '#ffffff',
                              color: '#000000'
                            }}
                          >
                            {/* 1. QR Code (Left Column) */}
                            <div 
                              className="shrink-0 flex items-center justify-center" 
                              style={{ 
                                width: is50x20 ? '14.8mm' : '22.8mm', 
                                height: is50x20 ? '14.8mm' : '22.8mm' 
                              }}
                            >
                              <img
                                src={qrSrc}
                                alt={`QR ${asset.code}`}
                                className="object-contain pointer-events-none"
                                style={{ 
                                  width: is50x20 ? '14.8mm' : '22.8mm', 
                                  height: is50x20 ? '14.8mm' : '22.8mm' 
                                }}
                                referrerPolicy="no-referrer"
                              />
                            </div>

                            {/* 2. Metadata Details (Right Column) */}
                            <div 
                              className="flex-1 flex flex-col justify-between min-w-0 pr-0.5 text-black font-sans"
                              style={{ height: is50x20 ? '16.5mm' : '25.5mm' }}
                            >
                              {/* Top part: Logo, Code, Name */}
                              <div className="flex flex-col min-w-0">
                                {/* TMII Logo */}
                                <div className="mb-0.5">
                                  <TmiiLogo height={is50x20 ? '0.62rem' : '0.85rem'} color="#000000" />
                                </div>

                                {/* Asset Code */}
                                <div 
                                  className={`font-black text-black leading-tight tracking-tight break-all ${
                                    is50x20 ? 'text-[7.5px]' : 'text-[9.5px]'
                                  }`}
                                >
                                  {asset.code}
                                </div>

                                {/* Asset Name (Plain Block with clean line-height and max-height) */}
                                <div 
                                  style={{
                                    fontSize: is50x20 ? '6.5px' : '7.5px',
                                    lineHeight: '1.15',
                                    maxHeight: is50x20 ? '5.4mm' : '8.5mm',
                                    overflow: 'hidden',
                                    wordBreak: 'break-word',
                                    fontWeight: 500,
                                    color: '#000000',
                                    marginTop: '0.5px'
                                  }}
                                  title={asset.name}
                                >
                                  {asset.name}
                                </div>
                              </div>

                              {/* Bottom part: Line & Location */}
                              <div className="min-w-0 pt-0.5">
                                <div className={`border-black w-full ${is50x20 ? 'border-b-[1px] mb-0.5' : 'border-b-[1.5px] mb-1'}`}></div>
                                <div 
                                  style={{
                                    fontSize: is50x20 ? '6.8px' : '8.5px',
                                    fontWeight: 800,
                                    lineHeight: '1.1',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    color: '#000000'
                                  }}
                                >
                                  {displayLocation}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Footer action: External Download Button (Never gets captured inside sticker) */}
                          <div className="flex items-center justify-between w-full mt-2.5 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-mono font-bold text-slate-400">{asset.code}</span>
                            <button
                              onClick={() => downloadSingleTagPDF(asset)}
                              disabled={isGeneratingPdf}
                              className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                              title={`Unduh PDF siap cetak (${paperSize})`}
                            >
                              <Download size={11} />
                              <span>Unduh PDF ({paperSize})</span>
                            </button>
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

      {/* PRINT-ONLY AREA (Clean CSS for direct native print) */}
      <div id="print-tags-container" style={{ display: 'none' }}>
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
              display: flex !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 1mm !important;
              flex-wrap: wrap !important;
              gap: 2mm !important;
              justify-content: flex-start !important;
            }
            @page {
              size: ${paperSize === '50x20' ? '50mm 20mm' : '60mm 30mm'};
              margin: 0mm;
            }
            .silver-matte-print-sticker {
              width: ${paperSize === '50x20' ? '50mm' : '60mm'} !important;
              height: ${paperSize === '50x20' ? '20mm' : '30mm'} !important;
              min-width: ${paperSize === '50x20' ? '50mm' : '60mm'} !important;
              min-height: ${paperSize === '50x20' ? '20mm' : '30mm'} !important;
              max-width: ${paperSize === '50x20' ? '50mm' : '60mm'} !important;
              max-height: ${paperSize === '50x20' ? '20mm' : '30mm'} !important;
              padding: ${paperSize === '50x20' ? '1.2mm 1.6mm' : '2mm 2.5mm'} !important;
              box-sizing: border-box !important;
              border: none !important;
              background: #ffffff !important;
              border-radius: 2px !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              display: flex !important;
              align-items: center !important;
              gap: ${paperSize === '50x20' ? '1.8mm' : '2.5mm'} !important;
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

          const is50x20 = paperSize === '50x20';
          const qrSrc = qrCodeMap[asset.code] || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(asset.code)}`;

          return (
            <div
              key={asset.id}
              className="silver-matte-print-sticker"
            >
              <div 
                className="shrink-0 flex items-center justify-center" 
                style={{ 
                  width: is50x20 ? '14.8mm' : '22.8mm', 
                  height: is50x20 ? '14.8mm' : '22.8mm' 
                }}
              >
                <img
                  src={qrSrc}
                  alt={`QR ${asset.code}`}
                  style={{ 
                    width: is50x20 ? '14.8mm' : '22.8mm', 
                    height: is50x20 ? '14.8mm' : '22.8mm' 
                  }}
                  className="object-contain"
                />
              </div>

              <div 
                className="flex-1 flex flex-col justify-between min-w-0 pr-0.5 text-black font-sans"
                style={{ height: is50x20 ? '16.5mm' : '25.5mm' }}
              >
                <div className="flex flex-col min-w-0">
                  <div className="mb-0.5">
                    <TmiiLogo height={is50x20 ? '0.62rem' : '0.85rem'} color="#000000" />
                  </div>

                  <div 
                    className={`font-black text-black leading-tight tracking-tight break-all ${
                      is50x20 ? 'text-[7.5px]' : 'text-[9.5px]'
                    }`}
                  >
                    {asset.code}
                  </div>

                  <div 
                    style={{
                      fontSize: is50x20 ? '6.5px' : '7.5px',
                      lineHeight: '1.15',
                      maxHeight: is50x20 ? '5.4mm' : '8.5mm',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      fontWeight: 500
                    }}
                  >
                    {asset.name}
                  </div>
                </div>

                <div className="min-w-0 pt-0.5">
                  <div className={`border-black w-full ${is50x20 ? 'border-b-[1px] mb-0.5' : 'border-b-[1.5px] mb-1'}`}></div>
                  <div 
                    style={{
                      fontSize: is50x20 ? '6.8px' : '8.5px',
                      fontWeight: 800,
                      lineHeight: '1.1',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {displayLocation}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PRINT ASSISTANT MODAL (Shown when clicking Cetak Tagging to ensure successful printing in all browser environments) */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center" style={{ color: theme.primaryColor }}>
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Pengaturan & Cetak Label Tagging
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ukuran kertas aktif: <strong className="text-slate-800 font-semibold">{paperSize === '50x20' ? '50 x 20 mm (Kompak)' : '60 x 30 mm (Standar)'}</strong> ({selectedAssets.length} aset)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertCircle size={16} />
                <span>Status Perintah Cetak Printer:</span>
              </div>
              <p className="leading-relaxed">
                Perintah cetak thermal sudah dikirim ke browser. Pada beberapa browser (terutama saat aplikasi berada di dalam iframe preview), dialog cetak dapat terhambat oleh kebijakan keamanan browser.
              </p>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="text-xs font-bold text-slate-700">Pilih metode cetak yang paling praktis untuk Anda:</div>
              
              {/* Option 1: PDF Download */}
              <button
                onClick={() => {
                  downloadAllTagsPDF();
                  setShowPrintModal(false);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-indigo-100 text-slate-700 group-hover:text-indigo-700 flex items-center justify-center transition-colors">
                    <Download size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Unduh Dokumen PDF Siap Cetak (Disarankan)</div>
                    <div className="text-[11px] text-slate-500">File PDF berukuran tepat {paperSize === '50x20' ? '50mm x 20mm' : '60mm x 30mm'} per halaman vektor tajam.</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  Rekomendasi
                </span>
              </button>

              {/* Option 2: Open in New Tab */}
              <button
                onClick={() => {
                  openPrintInNewTab();
                  setShowPrintModal(false);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors">
                    <ExternalLink size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Buka di Tab Baru Browser</div>
                    <div className="text-[11px] text-slate-500">Bebas dari pembatasan iframe. Tekan Ctrl+P di tab baru untuk mencetak langsung.</div>
                  </div>
                </div>
              </button>

              {/* Option 3: Retry Direct Print */}
              <button
                onClick={() => {
                  window.focus();
                  window.print();
                }}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors">
                  <Printer size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Kirim Ulang ke Dialog Print Browser</div>
                  <div className="text-[11px] text-slate-500">Coba picu kembali dialog cetak bawaan browser.</div>
                </div>
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
