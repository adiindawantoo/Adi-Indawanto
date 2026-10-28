import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ASSET_OWNERSHIP_RULES, 
  ASSET_LOCATION_AREA_RULES, 
  ASSET_CATEGORY_RULES,
  resolveCategoryCode,
  resolveLocationAreaCode
} from './assetCodeGenerator';
import { ConfiguredCategory, ConfiguredLocation } from '../types';

export interface CodificationPdfOptions {
  configuredLocations?: ConfiguredLocation[];
  configuredCategories?: ConfiguredCategory[];
  generatedBy?: string;
}

/**
 * Helper to safely load an image as an HTMLImageElement
 */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Format today's date in Indonesian
 */
function getIndonesianCurrentDate(): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Generates and downloads the Official TMII Asset Codification Master Dictionary PDF.
 */
export async function generateAssetCodificationPdf(options: CodificationPdfOptions = {}): Promise<void> {
  const {
    configuredLocations = [],
    configuredCategories = [],
    generatedBy = 'Administrator Asset Management TMII'
  } = options;

  // Preload logo image
  const logoImg = await loadImage('/logo.png');

  // Initialize PDF in Portrait A4 (210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Professional Color Palette
  const primaryColor: [number, number, number] = [15, 37, 55];    // Deep Navy #0F2537
  const accentColor: [number, number, number] = [13, 148, 136];   // Teal #0D9488
  const amberColor: [number, number, number] = [217, 119, 6];     // Amber #D97706
  const grayDark: [number, number, number] = [51, 65, 85];        // Slate 700
  const grayLight: [number, number, number] = [248, 250, 252];    // Slate 50

  const currentDateStr = getIndonesianCurrentDate();

  // 1. Top Decorative Bars
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 5, pageWidth, 1.5, 'F');

  let currentY = 14;

  // 2. Organization Header (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PT BHUMI VISATANDA INDONESIA', 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text('Asset Management Department - Taman Mini Indonesia Indah', 14, currentY + 4.5);
  doc.text('Jl. Raya Taman Mini, Jakarta Timur, DKI Jakarta 13560 | Sistem Informasi Manajemen Aset Tetap', 14, currentY + 8.5);

  // Top Right: Logo
  if (logoImg) {
    try {
      const maxLogoHeight = 14; // mm
      const aspectRatio = (logoImg.naturalWidth && logoImg.naturalHeight)
        ? logoImg.naturalWidth / logoImg.naturalHeight
        : 1;
      const logoWidth = Math.min(maxLogoHeight * aspectRatio, 32);
      const logoHeight = logoWidth / (aspectRatio || 1);
      const logoX = pageWidth - 14 - logoWidth;
      const logoY = 8;
      doc.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch {
      // Ignore if image fails
    }
  }

  // Divider Line
  currentY += 13;
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.5);
  doc.line(14, currentY, pageWidth - 14, currentY);

  // 3. Document Title Block
  currentY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('BUKU PEDOMAN STANDAR KODEFIKASI ASET TETAP', 14, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text('Kamus Master Aturan Penomoran Aset Standar TMII (Segmen Kode 1 s/d Kode 6)', 14, currentY);

  // 4. Metadata Box & Formula Highlight
  currentY += 5;
  const boxHeight = 24;
  doc.setFillColor(grayLight[0], grayLight[1], grayLight[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, boxHeight, 2, 2, 'FD');

  // Left Column of Box: Formula & Standard
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('FORMULA STRUKTUR STANDAR KODE ASET:', 18, currentY + 5.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 37, 55);
  doc.text('[Kode1][Kode2].[Kode3][Kode4].[Kode5]-[Kode6]', 18, currentY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text('Contoh Baku: ', 18, currentY + 17);
  doc.setFont('courier', 'bold');
  doc.setTextColor(amberColor[0], amberColor[1], amberColor[2]);
  doc.text('BMN03.INF04.26-001', 37, currentY + 17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('(Pemisah titik "." antar segmen, dan "-" sebelum nomor urut)', 68, currentY + 17);

  // Right Column of Box: Metadata (Printed date, user, status)
  const metaX = pageWidth - 65;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TANGGAL PENERBITAN:', metaX, currentY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(currentDateStr, metaX, currentY + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('DITERBITKAN OLEH:', metaX, currentY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text(generatedBy, metaX, currentY + 17.5);

  currentY += boxHeight + 6;

  // 5. Section 1: Ringkasan 6 Segmen Struktur Kode Aset
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('1. ANATOMI & DESKRIPSI 6 SEGMEN KODE ASET TETAP', 14, currentY);

  const anatomyRows = [
    [
      'Kode 1',
      'Kepemilikan Aset',
      '3 Karakter (Teks)',
      'BMN, TWC, BHV, KEM, PRV',
      'Menunjukkan entitas hukum atau pemilik sah hak kepemilikan aset di kawasan TMII.'
    ],
    [
      'Kode 2',
      'Lokasi Kawasan',
      '2 Digit (Numerik)',
      '01 s/d 11',
      'Kategori zona makro / fungsi penempatan aset (contoh 03 = Gate, 07 = Museum, 11 = Anjungan).'
    ],
    [
      'Kode 3',
      'Kategori Aset',
      '3 Karakter (Teks)',
      'TNH, BNG, INF, KND, PRM, ITT, FRI',
      'Klasifikasi kelompok besar jenis aktiva tetap sesuai regulasi standarisasi aset TMII.'
    ],
    [
      'Kode 4',
      'Tipe / Jenis Aset',
      '2 Digit (Numerik)',
      '01 s/d 15',
      'Sub-klasifikasi spesifik jenis barang di bawah kategori (contoh INF04 = Gerbang Kawasan).'
    ],
    [
      'Kode 5',
      'Tahun Perolehan',
      '2 Digit (Numerik)',
      '26 (Tahun 2026), 25, 24...',
      'Dua angka terakhir dari tahun pembelian / perolehan buku aset tetap.'
    ],
    [
      'Kode 6',
      'Nomor Registrasi',
      '3 Digit (Numerik)',
      '001, 002, 003...',
      'Nomor urut registrasi otomatis yang terisolasi per kombinasi unik segmen Kode 1 s/d Kode 5.'
    ]
  ];

  autoTable(doc, {
    startY: currentY + 2,
    head: [['Segmen', 'Nama Komponen', 'Panjang / Tipe', 'Nilai / Format', 'Fungsi & Ketentuan']],
    body: anatomyRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: [51, 65, 85],
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [15, 37, 55],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
      1: { fontStyle: 'bold', cellWidth: 32 },
      2: { halign: 'center', cellWidth: 26 },
      3: { fontStyle: 'bold', cellWidth: 35 },
      4: { cellWidth: 'auto' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14, bottom: 18 }
  });

  // 6. Section 2: Kamus Master Kode 1 - Entitas Kepemilikan
  currentY = (doc as any).lastAutoTable.finalY + 7;

  // Check if we need new page for Section 2
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('2. KAMUS MASTER KODE 1 — ENTITAS KEPEMILIKAN ASET (3 KARAKTER)', 14, currentY);

  const ownershipRows = ASSET_OWNERSHIP_RULES.map((rule) => [
    rule.code,
    rule.name,
    rule.description
  ]);

  autoTable(doc, {
    startY: currentY + 2,
    head: [['Kode', 'Nama Entitas Pemilik Aset', 'Deskripsi Kewenangan & Hak Pengelolaan']],
    body: ownershipRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: [51, 65, 85],
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [180, 83, 9], // Amber 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      1: { fontStyle: 'bold', cellWidth: 50 },
      2: { cellWidth: 'auto' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14, bottom: 18 }
  });

  // 7. Section 3: Kamus Master Kode 2 - Kategori Lokasi Kawasan
  currentY = (doc as any).lastAutoTable.finalY + 7;

  if (currentY > pageHeight - 80) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('3. KAMUS MASTER KODE 2 — KATEGORI LOKASI KAWASAN TMII (2 DIGIT)', 14, currentY);

  const locationRows = ASSET_LOCATION_AREA_RULES.map((loc) => {
    // Count linked locations if configuredLocations are passed
    const linkedCount = configuredLocations.filter((cl) => {
      const res = resolveLocationAreaCode(cl.category || cl.name, configuredLocations);
      return res.code === loc.code;
    }).length;

    const countLabel = linkedCount > 0 ? ` (${linkedCount} titik fisik terdaftar)` : '';

    return [
      loc.code,
      loc.name + countLabel,
      loc.description
    ];
  });

  autoTable(doc, {
    startY: currentY + 2,
    head: [['Kode', 'Kategori Area / Zona Kawasan', 'Cakupan Area & Contoh Lokasi Penempatan']],
    body: locationRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: [51, 65, 85],
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [3, 105, 161], // Sky 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      1: { fontStyle: 'bold', cellWidth: 50 },
      2: { cellWidth: 'auto' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14, bottom: 18 }
  });

  // 8. Section 4: Kamus Master Kode 3 & 4 - Kategori & Tipe/Jenis Aset
  // Always begin on a fresh page for maximum clarity and neat tabular presentation
  doc.addPage();
  currentY = 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('4. KAMUS MASTER KODE 3 & KODE 4 — KATEGORI & TIPE / JENIS ASET', 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Kode 3 (3 Karakter huruf kapital) + Kode 4 (2 Digit numerik spesifikasi jenis aset)', 14, currentY + 4);

  // Build combined Category & Types rows
  const catTypeRows: string[][] = [];

  ASSET_CATEGORY_RULES.forEach((cat) => {
    cat.types.forEach((t) => {
      catTypeRows.push([
        cat.code,
        cat.name,
        t.code,
        t.name,
        `${cat.code}${t.code}`
      ]);
    });
  });

  // Add any custom configured categories if provided
  if (configuredCategories && configuredCategories.length > 0) {
    configuredCategories.forEach((cc) => {
      const resolvedCat = resolveCategoryCode(cc.category, configuredCategories);
      // If category not already in standard list
      const isAlreadyInStandard = ASSET_CATEGORY_RULES.some(r => r.code === resolvedCat.code);
      if (!isAlreadyInStandard && cc.types && cc.types.length > 0) {
        cc.types.forEach((typeName, idx) => {
          const typeCode = String(idx + 1).padStart(2, '0');
          catTypeRows.push([
            resolvedCat.code,
            `${cc.category} (Khusus)`,
            typeCode,
            typeName,
            `${resolvedCat.code}${typeCode}`
          ]);
        });
      }
    });
  }

  autoTable(doc, {
    startY: currentY + 6,
    head: [['Kode 3', 'Kategori Aset', 'Kode 4', 'Nama Tipe / Jenis Aset', 'Kode Gabungan (K3.K4)']],
    body: catTypeRows,
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: [51, 65, 85],
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [5, 150, 105], // Emerald 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
      1: { cellWidth: 42 },
      2: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
      3: { cellWidth: 'auto' },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 32 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14, bottom: 20 }
  });

  // 9. Section 5 & 6: Ketentuan Kode 5 (Tahun) & Kode 6 (Nomor Urut)
  currentY = (doc as any).lastAutoTable.finalY + 7;

  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('5. ATURAN PENETAPAN KODE 5 (TAHUN) & KODE 6 (NOMOR URUT REGISTRASI)', 14, currentY);

  const rulesRows = [
    [
      'Kode 5',
      'Tahun Perolehan (2 Digit)',
      '2 Digit Numerik',
      'Diambil dari 2 angka belakang tahun perolehan/pembelian aset. Contoh: Tahun 2026 menjadi "26", Tahun 2024 menjadi "24". Apabila tanggal perolehan belum diketahui, menggunakan tahun berjalan saat pendataan.'
    ],
    [
      'Kode 6',
      'Nomor Urut Registrasi (3 Digit)',
      '3 Digit Numerik (atau lebih)',
      'Dimulai dari "001", "002", s/d "999" (dan otomatis bertambah ke 4 digit jika melebihi 999). Nomor urut dihitung secara spesifik berbasis kombinasi unik prefix: [K1][K2].[K3][K4].[K5]-'
    ],
    [
      'Pemisah',
      'Karakter Pemisah Segmen',
      'Titik (.) dan Strip (-)',
      'Pemisah antar entitas/lokasi dan kategori/tipe menggunakan tanda titik ".". Pemisah antara kategori/tipe dan tahun menggunakan tanda titik ".". Pemisah antara tahun dan nomor urut menggunakan tanda strip "-".'
    ]
  ];

  autoTable(doc, {
    startY: currentY + 2,
    head: [['Elemen', 'Definisi Komponen', 'Format Baku', 'Ketentuan & Mekanisme Otomatisasi']],
    body: rulesRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: [51, 65, 85],
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [109, 40, 217], // Purple 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
      1: { fontStyle: 'bold', cellWidth: 42 },
      2: { halign: 'center', cellWidth: 30 },
      3: { cellWidth: 'auto' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14, bottom: 20 }
  });

  // 10. Legal Notice & Signoff Box
  currentY = (doc as any).lastAutoTable.finalY + 6;

  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFillColor(grayLight[0], grayLight[1], grayLight[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('CATATAN PENGGUNAAN & KETENTUAN HUKUM:', 18, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text(
    '1. Seluruh pencatatan aset tetap baru di lingkungan TMII wajib tunduk pada format kodifikasi ini.',
    18,
    currentY + 9
  );
  doc.text(
    '2. Generator kode otomatis dalam sistem memastikan tidak ada duplikasi nomor urut pada kombinasi entitas, lokasi, dan jenis yang sama.',
    18,
    currentY + 13
  );
  doc.text(
    '3. Penambahan kategori/lokasi baru harus dikonsultasikan dan disetujui oleh Asset Management Department - Taman Mini Indonesia Indah.',
    18,
    currentY + 17
  );

  // 11. Running Headers & Footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Header on page 2+
    if (i > 1) {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 2.5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Pedoman Standar Kodefikasi Aset Tetap TMII — PT Bhumi Visatanda Indonesia',
        14,
        6
      );
      doc.text(`Kamus Master Aturan Penomoran`, pageWidth - 14, 6, { align: 'right' });
    }

    // Footer on all pages
    const footerY = pageHeight - 7;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, footerY - 2.5, pageWidth - 14, footerY - 2.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dicetak pada: ${currentDateStr} | Dokumen Resmi Sistem Manajemen Aset TMII`,
      14,
      footerY
    );
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - 14, footerY, { align: 'right' });
  }

  // 12. Save PDF
  const filename = `Kamus_Master_Kodefikasi_Aset_TMII_${new Date().getFullYear()}.pdf`;
  doc.save(filename);
}
