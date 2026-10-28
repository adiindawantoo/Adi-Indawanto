import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserTask } from '../types';

export interface TaskReportPdfOptions {
  tasks: UserTask[];
  startDate?: string;
  endDate?: string;
  dateFilterType?: string;
  categoryFilter?: string;
  statusFilter?: string;
  priorityFilter?: string;
  assigneeFilter?: string;
  generatedBy?: string;
  notes?: string;
}

/**
 * Format date string YYYY-MM-DD to DD MMMM YYYY (Indonesian)
 */
export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
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
 * Generates and downloads a high-quality PDF report for Task Monitoring.
 */
export async function generateTaskReportPdf(options: TaskReportPdfOptions): Promise<void> {
  const {
    tasks,
    startDate,
    endDate,
    dateFilterType = 'Rentang Waktu Pelaksanaan',
    categoryFilter = 'Semua',
    statusFilter = 'Semua',
    priorityFilter = 'Semua',
    assigneeFilter = 'Semua',
    generatedBy = 'Administrator Asset Management'
  } = options;

  // Preload logo image
  const logoImg = await loadImage('/logo.png');

  // Initialize PDF in Landscape A4 (297 x 210 mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Color palette
  const primaryColor: [number, number, number] = [15, 37, 55]; // Deep Navy
  const accentColor: [number, number, number] = [13, 148, 136]; // Teal
  const grayDark: [number, number, number] = [51, 65, 85];
  const grayLight: [number, number, number] = [241, 245, 249];

  // 1. Top Decorative Bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 5, pageWidth, 1.5, 'F');

  // 2. Organization & Report Header
  let currentY = 14;

  // Header Titles (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PT BHUMI VISATANDA INDONESIA', 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2]);
  doc.text('Asset Management Department', 14, currentY + 5);
  doc.text('Jl. Raya Taman Mini, Jakarta Timur, DKI Jakarta 13560', 14, currentY + 9);

  // Top Right: TMII Logo
  if (logoImg) {
    try {
      const maxLogoHeight = 15; // mm
      const aspectRatio = (logoImg.naturalWidth && logoImg.naturalHeight) 
        ? logoImg.naturalWidth / logoImg.naturalHeight 
        : 1;
      const logoWidth = Math.min(maxLogoHeight * aspectRatio, 35);
      const logoHeight = logoWidth / (aspectRatio || 1);
      const logoX = pageWidth - 14 - logoWidth;
      const logoY = 8.5;

      doc.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch {
      // Fallback silently if image rendering fails
    }
  }

  // Document Title Banner (Right or Full Width)
  currentY += 15;
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.5);
  doc.line(14, currentY, pageWidth - 14, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('LAPORAN MONITORING PEKERJAAN & TUGAS OPERASIONAL', 14, currentY);

  // 3. Metadata & Filter Period Block
  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const periodeText = (startDate || endDate) 
    ? `${formatIndonesianDate(startDate)}  s/d  ${formatIndonesianDate(endDate)}`
    : 'Semua Periode (Seluruh Data)';

  const now = new Date();
  const printDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

  // Left Column Info
  doc.text(`Periode Tanggal   : ${periodeText} (${dateFilterType})`, 14, currentY + 4);
  doc.text(`Filter Kategori    : ${categoryFilter} | Status: ${statusFilter} | Prioritas: ${priorityFilter}`, 14, currentY + 8);

  // Right Column Info
  const rightX = pageWidth - 100;
  doc.text(`Tanggal Cetak     : ${printDate}`, rightX, currentY + 4);
  doc.text(`Dicetak Oleh       : ${generatedBy}`, rightX, currentY + 8);

  // 4. Executive Summary Stats Box
  currentY += 13;
  const totalTasks = tasks.length;
  const selesaiCount = tasks.filter(t => t.status === 'Selesai').length;
  const berjalanCount = tasks.filter(t => t.status === 'Sedang Berjalan').length;
  const belumCount = tasks.filter(t => t.status === 'Belum Dimulai').length;
  const ditundaCount = tasks.filter(t => t.status === 'Ditunda').length;
  const urgentCount = tasks.filter(t => t.priority === 'Urgent' || t.priority === 'Tinggi').length;
  const completionRate = totalTasks > 0 ? Math.round((selesaiCount / totalTasks) * 100) : 0;

  // Box background
  doc.setFillColor(grayLight[0], grayLight[1], grayLight[2]);
  doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'S');

  // Stats Text in 5 Columns
  const colWidth = (pageWidth - 28) / 5;
  const statsData = [
    { label: 'TOTAL TUGAS', val: `${totalTasks} Item`, color: [15, 23, 42] },
    { label: 'SELESAI', val: `${selesaiCount} (${completionRate}%)`, color: [16, 185, 129] },
    { label: 'SEDANG BERJALAN', val: `${berjalanCount} Item`, color: [2, 132, 199] },
    { label: 'BELUM / TERTUNDA', val: `${belumCount + ditundaCount} Item`, color: [234, 88, 12] },
    { label: 'PRIORITAS TINGGI/URGENT', val: `${urgentCount} Item`, color: [225, 29, 72] }
  ];

  statsData.forEach((stat, index) => {
    const xPos = 14 + (index * colWidth) + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(stat.label, xPos, currentY + 5);

    doc.setFontSize(9.5);
    doc.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
    doc.text(stat.val, xPos, currentY + 10.5);
  });

  // 5. Data Table using AutoTable
  currentY += 17;

  const tableRows = tasks.map((t, idx) => {
    return [
      String(idx + 1),
      t.title + (t.description ? `\n${t.description}` : ''),
      t.category || 'Umum',
      t.assignee || '-',
      t.startDate ? formatIndonesianDate(t.startDate) : '-',
      t.dueDate ? formatIndonesianDate(t.dueDate) : '-',
      t.priority || 'Sedang',
      t.status || 'Belum Dimulai',
      t.notes ? t.notes : '-'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [[
      'No',
      'Judul Tugas & Uraian Pekerjaan',
      'Kategori',
      'Penanggung Jawab (PIC)',
      'Tgl Mulai',
      'Batas Waktu',
      'Prioritas',
      'Status',
      'Catatan Progres / Hasil'
    ]],
    body: tableRows.length > 0 ? tableRows : [['-', 'Tidak ada tugas yang sesuai dengan kriteria filter.', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: [51, 65, 85],
      font: 'helvetica',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [15, 37, 55],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 }, // No
      1: { cellWidth: 70 }, // Judul & Uraian
      2: { halign: 'center', cellWidth: 20 }, // Kategori
      3: { halign: 'left', cellWidth: 28 }, // PIC
      4: { halign: 'center', cellWidth: 22 }, // Tgl Mulai
      5: { halign: 'center', cellWidth: 22 }, // Batas Waktu
      6: { halign: 'center', cellWidth: 18 }, // Prioritas
      7: { halign: 'center', cellWidth: 24 }, // Status
      8: { cellWidth: 'auto' } // Catatan
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didParseCell: function (data) {
      // Color-code Status column (index 7)
      if (data.section === 'body' && data.column.index === 7) {
        const text = String(data.cell.raw);
        if (text === 'Selesai') {
          data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'Sedang Berjalan') {
          data.cell.styles.textColor = [2, 132, 199];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'Ditunda') {
          data.cell.styles.textColor = [225, 29, 72];
        } else {
          data.cell.styles.textColor = [100, 116, 139];
        }
      }
      // Color-code Priority column (index 6)
      if (data.section === 'body' && data.column.index === 6) {
        const text = String(data.cell.raw);
        if (text === 'Urgent') {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'Tinggi') {
          data.cell.styles.textColor = [234, 88, 12];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 25 },
    didDrawPage: function (data) {
      // Header for page 2 and onwards
      const pageNum = doc.getNumberOfPages();
      if (pageNum > 1) {
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 3, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Laporan Monitoring Pekerjaan & Tugas - Periode: ${periodeText}`, 14, 8);
      }

      // Footer on every page
      const footerY = pageHeight - 8;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, footerY - 3, pageWidth - 14, footerY - 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('PT Bhumi Visatanda Indonesia - Asset Management Department', 14, footerY);
      doc.text(`Halaman ${pageNum}`, pageWidth - 14, footerY, { align: 'right' });
    }
  });

  // 7. Output / Save PDF
  const safeStartDate = startDate || 'Awal';
  const safeEndDate = endDate || 'Akhir';
  const filename = `Laporan_Monitoring_Tugas_BVI_${safeStartDate}_sd_${safeEndDate}.pdf`.replace(/\s+/g, '_');
  doc.save(filename);
}
