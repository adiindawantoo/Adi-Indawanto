import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Check, 
  AlertCircle, 
  Trash2, 
  ArrowRight,
  Database,
  HelpCircle,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportDataPanelProps {
  type: 'tasks' | 'fixed-assets' | 'animals' | 'cctv' | 'mep' | 'museum';
  onImport: (parsedData: any[]) => Promise<void>;
  onClose?: () => void;
}

// Helper functions for Excel / CSV format conversion
const formatToIsoDate = (val: any): string => {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number' && val > 20000 && val < 65000) {
    // Excel serial date number
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [_, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    const [_, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return str;
};

const formatToNumber = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).replace(/Rp|\s/gi, '').trim();
  if (str.includes(',') && !str.includes('.')) {
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  const cleaned = str.replace(/,/g, '');
  return Number(cleaned) || 0;
};

const normalizeHeaderStr = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

export default function ImportDataPanel({ type, onImport, onClose }: ImportDataPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Define Friendly Headers, DB Mapping, Default Values, and Required Fields per module type
  const config = {
    'fixed-assets': {
      title: 'Fixed Assets',
      headers: [
        'Kode Aset',
        'Nama Barang',
        'Aset / LVA',
        'Merk & Tipe',
        'Kepemilikan',
        'Area',
        'Lokasi',
        'Kategori',
        'Jenis',
        'Tanggal Perolehan',
        'Nilai Perolehan (IDR)',
        'Metode Depresiasi',
        'Golongan Pajak',
        'Masa Manfaat',
        'Nilai Residu (IDR)',
        'Kondisi',
        'Status',
        'Terakhir Servis',
        'Prediksi Servis Berikutnya',
        'Foto Aset',
        'Lampiran GDrive',
        'Keterangan'
      ],
      mapping: {
        'Kode Aset': 'code',
        'Kode': 'code',
        'Asset Code': 'code',
        'ID Aset': 'code',
        'Nama Barang': 'name',
        'Nama Aset': 'name',
        'Nama': 'name',
        'Asset Name': 'name',
        'Aset / LVA': 'classification',
        'Aset/LVA': 'classification',
        'Klasifikasi': 'classification',
        'Classification': 'classification',
        'Merk & Tipe': 'brand',
        'Merk dan Tipe': 'brand',
        'Merk / Tipe': 'brand',
        'Merk': 'brand',
        'Merek': 'brand',
        'Brand': 'brand',
        'Kepemilikan': 'ownership',
        'Ownership': 'ownership',
        'Area': 'area',
        'Wilayah': 'area',
        'Wilayah / Area': 'area',
        'Lokasi': 'location',
        'Lokasi Penempatan': 'location',
        'Location': 'location',
        'Kategori': 'category',
        'Kategori Aset': 'category',
        'Category': 'category',
        'Jenis': 'type',
        'Jenis Aset': 'type',
        'Tipe': 'type',
        'Type': 'type',
        'Tanggal Perolehan': 'acquisitionDate',
        'Tanggal Beli': 'acquisitionDate',
        'Acquisition Date': 'acquisitionDate',
        'Nilai Perolehan (IDR)': 'acquisitionCost',
        'Nilai Perolehan': 'acquisitionCost',
        'Harga Perolehan': 'acquisitionCost',
        'Harga Beli': 'acquisitionCost',
        'Acquisition Cost': 'acquisitionCost',
        'Metode Depresiasi': 'depreciationMethod',
        'Metode Penyusutan': 'depreciationMethod',
        'Depreciation Method': 'depreciationMethod',
        'Golongan Pajak': 'usefulLifeGroup',
        'Kelompok Pajak': 'usefulLifeGroup',
        'Kelompok Masa Manfaat': 'usefulLifeGroup',
        'Tax Group': 'usefulLifeGroup',
        'Masa Manfaat': 'usefulLife',
        'Umur Ekonomis': 'usefulLife',
        'Useful Life': 'usefulLife',
        'Nilai Residu (IDR)': 'salvageValue',
        'Nilai Residu': 'salvageValue',
        'Nilai Sisa': 'salvageValue',
        'Salvage Value': 'salvageValue',
        'Kondisi': 'condition',
        'Kondisi Fisik': 'condition',
        'Condition': 'condition',
        'Status': 'status',
        'Status Operasional': 'status',
        'Status Aset': 'status',
        'Terakhir Servis': 'lastMaintenance',
        'Terakhir Pemeliharaan': 'lastMaintenance',
        'Tgl Servis Terakhir': 'lastMaintenance',
        'Last Maintenance': 'lastMaintenance',
        'Prediksi Servis Berikutnya': 'nextMaintenance',
        'Pemeliharaan Berikutnya': 'nextMaintenance',
        'Servis Berikutnya': 'nextMaintenance',
        'Next Maintenance': 'nextMaintenance',
        'Foto Aset': 'photoUrl',
        'URL Foto': 'photoUrl',
        'Link Foto': 'photoUrl',
        'Photo URL': 'photoUrl',
        'Lampiran GDrive': 'driveFileUrl',
        'Lampiran Drive': 'driveFileUrl',
        'Link GDrive': 'driveFileUrl',
        'Drive URL': 'driveFileUrl',
        'Drive File': 'driveFileUrl',
        'Keterangan': 'notes',
        'Catatan': 'notes',
        'Notes': 'notes'
      } as Record<string, string>,
      defaults: {
        classification: 'Aset',
        brand: '-',
        ownership: 'PT. Taman Wisata Candi',
        area: 'Wilayah Pusat',
        location: 'Kantor Pengelola TMII',
        category: 'Peralatan & Mesin',
        type: 'Alat Kantor',
        acquisitionDate: new Date().toISOString().split('T')[0],
        acquisitionCost: 0,
        depreciationMethod: 'Garis Lurus',
        usefulLifeGroup: 'Kelompok 1 (4 Tahun)',
        usefulLife: '4 Tahun',
        salvageValue: 0,
        condition: 'Baik',
        status: 'Aktif',
        lastMaintenance: '',
        nextMaintenance: '',
        photoUrl: '',
        driveFileUrl: '',
        notes: ''
      },
      required: ['Kode Aset', 'Nama Barang'],
      guidance: [
        { 'Nama Kolom': 'Kode Aset', 'Status': 'Wajib', 'Contoh': 'BMN03.INF04.26-001', 'Keterangan': 'Kode unik aset TMII (Kepemilikan.Lokasi.Kategori-Nomor)' },
        { 'Nama Kolom': 'Nama Barang', 'Status': 'Wajib', 'Contoh': 'Server Rack Data Center Dell', 'Keterangan': 'Nama jelas barang / aset' },
        { 'Nama Kolom': 'Aset / LVA', 'Status': 'Opsional', 'Contoh': 'Aset atau LVA', 'Keterangan': 'Klasifikasi: Aset (Fixed Asset) atau LVA (Low Value Asset). Default: Aset' },
        { 'Nama Kolom': 'Merk & Tipe', 'Status': 'Opsional', 'Contoh': 'Dell EMC PowerEdge R740', 'Keterangan': 'Merek dan tipe / spesifikasi pabrikan' },
        { 'Nama Kolom': 'Kepemilikan', 'Status': 'Opsional', 'Contoh': 'PT. Taman Wisata Candi / Milik Sendiri / Sekretariat Negara', 'Keterangan': 'Entitas pemilik aset sesuai kode 1 TMII' },
        { 'Nama Kolom': 'Area', 'Status': 'Opsional', 'Contoh': 'Wilayah Pusat / Wilayah Utara / Wilayah Selatan / Wilayah Barat / Wilayah Timur', 'Keterangan': 'Zona wilayah di kawasan TMII' },
        { 'Nama Kolom': 'Lokasi', 'Status': 'Opsional', 'Contoh': 'Gedung Pengelola Server Room', 'Keterangan': 'Nama gedung atau ruangan penempatan fisik aset' },
        { 'Nama Kolom': 'Kategori', 'Status': 'Opsional', 'Contoh': 'Peralatan & Mesin / Gedung & Bangunan / Tanah / Jalan, Irigasi & Jaringan', 'Keterangan': 'Kelompok kategori aset utama TMII' },
        { 'Nama Kolom': 'Jenis', 'Status': 'Opsional', 'Contoh': 'Komputer & IT / Mebel / Kendaraan / Bangunan Budaya', 'Keterangan': 'Sub-jenis aset spesifik' },
        { 'Nama Kolom': 'Tanggal Perolehan', 'Status': 'Opsional', 'Contoh': '2025-01-15', 'Keterangan': 'Tanggal perolehan aset (Format: YYYY-MM-DD)' },
        { 'Nama Kolom': 'Nilai Perolehan (IDR)', 'Status': 'Opsional', 'Contoh': '65000000', 'Keterangan': 'Harga beli aset dalam Rupiah (angka saja)' },
        { 'Nama Kolom': 'Metode Depresiasi', 'Status': 'Opsional', 'Contoh': 'Garis Lurus / Saldo Menurun / Tidak Disusutkan', 'Keterangan': 'Metode penyusutan PSAK 16. Pilih Tidak Disusutkan khusus Tanah. Default: Garis Lurus' },
        { 'Nama Kolom': 'Golongan Pajak', 'Status': 'Opsional', 'Contoh': 'Kelompok 1 (4 Tahun) / Kelompok 2 (8 Tahun) / Bangunan Permanen (20 Tahun) / tanah_non_depresiasi', 'Keterangan': 'Klasifikasi tarif penyusutan fiskal / pajak' },
        { 'Nama Kolom': 'Masa Manfaat', 'Status': 'Opsional', 'Contoh': '4 Tahun / 8 Tahun / 20 Tahun / Tidak Disusutkan', 'Keterangan': 'Estimasi umur ekonomis aset' },
        { 'Nama Kolom': 'Nilai Residu (IDR)', 'Status': 'Opsional', 'Contoh': '1000000', 'Keterangan': 'Estimasi nilai sisa aset setelah masa manfaat berakhir. Default: 0' },
        { 'Nama Kolom': 'Kondisi', 'Status': 'Opsional', 'Contoh': 'Baik / Rusak Ringan / Rusak Berat / Demolished', 'Keterangan': 'Kondisi fisik aset saat ini. Default: Baik' },
        { 'Nama Kolom': 'Status', 'Status': 'Opsional', 'Contoh': 'Aktif / Non-Aktif / Diperbaiki / Dihapuskan', 'Keterangan': 'Status operasional penggunaan aset. Default: Aktif' },
        { 'Nama Kolom': 'Terakhir Servis', 'Status': 'Opsional', 'Contoh': '2026-01-10', 'Keterangan': 'Tanggal servis atau perawatan berkala terakhir (YYYY-MM-DD)' },
        { 'Nama Kolom': 'Prediksi Servis Berikutnya', 'Status': 'Opsional', 'Contoh': '2026-07-10', 'Keterangan': 'Jadwal servis berkala berikutnya (YYYY-MM-DD)' },
        { 'Nama Kolom': 'Foto Aset', 'Status': 'Opsional', 'Contoh': 'https://images.unsplash.com/...', 'Keterangan': 'Tautan langsung foto dokumentasi aset' },
        { 'Nama Kolom': 'Lampiran GDrive', 'Status': 'Opsional', 'Contoh': 'https://drive.google.com/...', 'Keterangan': 'Tautan Google Drive dokumen pendukung (manual book / BAST)' },
        { 'Nama Kolom': 'Keterangan', 'Status': 'Opsional', 'Contoh': 'Server operasional sistem inventaris TMII', 'Keterangan': 'Catatan khusus, nomor seri, atau keterangan fisik lainnya' }
      ],
      sample: [
        {
          'Kode Aset': 'BMN03.INF04.26-001',
          'Nama Barang': 'Server Rack Data Center Dell PowerEdge',
          'Aset / LVA': 'Aset',
          'Merk & Tipe': 'Dell EMC PowerEdge R740',
          'Kepemilikan': 'PT. Taman Wisata Candi',
          'Area': 'Wilayah Pusat',
          'Lokasi': 'Gedung Pengelola Server Room',
          'Kategori': 'Peralatan & Mesin',
          'Jenis': 'Komputer & IT',
          'Tanggal Perolehan': '2025-01-15',
          'Nilai Perolehan (IDR)': 65000000,
          'Metode Depresiasi': 'Garis Lurus',
          'Golongan Pajak': 'Kelompok 1 (4 Tahun)',
          'Masa Manfaat': '4 Tahun',
          'Nilai Residu (IDR)': 1000000,
          'Kondisi': 'Baik',
          'Status': 'Aktif',
          'Terakhir Servis': '2026-01-10',
          'Prediksi Servis Berikutnya': '2026-07-10',
          'Foto Aset': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500',
          'Lampiran GDrive': '',
          'Keterangan': 'Server sentral basis data operasional TMII'
        },
        {
          'Kode Aset': 'TNH01.KWS01.20-001',
          'Nama Barang': 'Lahan Area Parkir Utara Keong Mas',
          'Aset / LVA': 'Aset',
          'Merk & Tipe': 'Sertifikat HPL No. 12',
          'Kepemilikan': 'Sekretariat Negara',
          'Area': 'Wilayah Barat',
          'Lokasi': 'Area Parkir Keong Mas',
          'Kategori': 'Tanah',
          'Jenis': 'Tanah Bangunan',
          'Tanggal Perolehan': '2020-01-01',
          'Nilai Perolehan (IDR)': 2500000000,
          'Metode Depresiasi': 'Tidak Disusutkan',
          'Golongan Pajak': 'tanah_non_depresiasi',
          'Masa Manfaat': 'Tidak Disusutkan',
          'Nilai Residu (IDR)': 0,
          'Kondisi': 'Baik',
          'Status': 'Aktif',
          'Terakhir Servis': '',
          'Prediksi Servis Berikutnya': '',
          'Foto Aset': '',
          'Lampiran GDrive': '',
          'Keterangan': 'Lahan parkir utama pengunjung zona barat TMII (PSAK 16 Non-Depresiasi)'
        },
        {
          'Kode Aset': 'GDG02.ANJ03.21-005',
          'Nama Barang': 'Pendopo Ageng Anjungan Jawa Tengah',
          'Aset / LVA': 'Aset',
          'Merk & Tipe': 'Struktur Kayu Jati Ukir Tradisional',
          'Kepemilikan': 'Pemerintah Daerah',
          'Area': 'Wilayah Timur',
          'Lokasi': 'Anjungan Jawa Tengah',
          'Kategori': 'Gedung & Bangunan',
          'Jenis': 'Bangunan Budaya',
          'Tanggal Perolehan': '2021-06-10',
          'Nilai Perolehan (IDR)': 850000000,
          'Metode Depresiasi': 'Garis Lurus',
          'Golongan Pajak': 'Bangunan Permanen (20 Tahun)',
          'Masa Manfaat': '20 Tahun',
          'Nilai Residu (IDR)': 50000000,
          'Kondisi': 'Baik',
          'Status': 'Aktif',
          'Terakhir Servis': '2026-03-01',
          'Prediksi Servis Berikutnya': '2026-09-01',
          'Foto Aset': '',
          'Lampiran GDrive': '',
          'Keterangan': 'Perawatan rutin vernis kayu jati dan atap sirap'
        }
      ]
    },
    'tasks': {
      title: 'Tugas & Pekerjaan',
      headers: ['Judul', 'Deskripsi', 'Status', 'Petugas', 'Tanggal Mulai', 'Tenggat Waktu', 'Prioritas', 'Kategori', 'Catatan'],
      mapping: {
        'Judul': 'title',
        'Deskripsi': 'description',
        'Status': 'status',
        'Petugas': 'assignee',
        'Tanggal Mulai': 'startDate',
        'Tenggat Waktu': 'dueDate',
        'Prioritas': 'priority',
        'Kategori': 'category',
        'Catatan': 'notes'
      } as Record<string, string>,
      defaults: {
        status: 'Belum Dimulai',
        priority: 'Sedang',
        category: 'Umum',
        assignee: 'Staf Lapangan',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        description: ''
      },
      required: ['Judul'],
      sample: [
        {
          'Judul': 'Pengecekan Filter MEP Air Mancur',
          'Deskripsi': 'Lakukan pembersihan filter air mancur utama di Istana Anak-Anak',
          'Status': 'Belum Dimulai',
          'Petugas': 'Budi Hermawan',
          'Tanggal Mulai': '2026-07-20',
          'Tenggat Waktu': '2026-07-22',
          'Prioritas': 'Tinggi',
          'Kategori': 'MEP',
          'Catatan': 'Koordinasikan dengan tim kelistrikan sebelum mematikan mesin'
        },
        {
          'Judul': 'Pemberian Vaksin Harimau Sumatera',
          'Deskripsi': 'Pemberian vaksinasi rabies dan vitamin tahunan',
          'Status': 'Sedang Berjalan',
          'Petugas': 'drh. Rini Amalia',
          'Tanggal Mulai': '2026-07-16',
          'Tenggat Waktu': '2026-07-18',
          'Prioritas': 'Urgent',
          'Kategori': 'Satwa',
          'Catatan': 'Pastikan tim pawang mendampingi penuh'
        }
      ]
    },
    'animals': {
      title: 'Aset Satwa',
      headers: ['Nama Satwa', 'Nama Latin', 'Jenis', 'Lokasi', 'Detail Lokasi', 'Jenis Kelamin', 'Kondisi Kesehatan', 'Nama Panggilan / Kode Khusus', 'Foto Satwa', 'Keterangan'],
      mapping: {
        'Nama Satwa': 'name',
        'Nama Latin': 'latinName',
        'Jenis': 'type',
        'Lokasi': 'location',
        'Detail Lokasi': 'locationDetail',
        'Jenis Kelamin': 'gender',
        'Kondisi Kesehatan': 'healthStatus',
        'Nama Panggilan / Kode Khusus': 'nicknameOrCode',
        'Foto Satwa': 'photoUrl',
        'Keterangan': 'notes'
      } as Record<string, string>,
      defaults: {
        latinName: '-',
        type: 'Aves',
        location: 'Taman Burung',
        locationDetail: '',
        gender: 'Belum Teridentifikasi',
        healthStatus: 'Sehat',
        nicknameOrCode: '',
        photoUrl: '',
        notes: ''
      },
      required: ['Nama Satwa', 'Nama Latin', 'Jenis', 'Lokasi'],
      sample: [
        {
          'Nama Satwa': 'Elang Bondol',
          'Nama Latin': 'Haliastur indus',
          'Jenis': 'Aves',
          'Lokasi': 'Taman Burung',
          'Detail Lokasi': 'Kandang Kubah Timur',
          'Jenis Kelamin': 'Jantan',
          'Kondisi Kesehatan': 'Sehat',
          'Nama Panggilan / Kode Khusus': 'EB-01',
          'Foto Satwa': '',
          'Keterangan': 'Aktif dan merespons pelatih'
        },
        {
          'Nama Satwa': 'Gajah Sumatera',
          'Nama Latin': 'Elephas maximus sumatranus',
          'Jenis': 'Mamalia',
          'Lokasi': 'Taman Satwa',
          'Detail Lokasi': 'Area Paddock Utama',
          'Jenis Kelamin': 'Betina',
          'Kondisi Kesehatan': 'Sehat',
          'Nama Panggilan / Kode Khusus': 'Bimo',
          'Foto Satwa': '',
          'Keterangan': 'Rutin diberi nutrisi serat tinggi'
        }
      ]
    },
    'cctv': {
      title: 'Kamera CCTV',
      headers: ['Kode', 'Nama Kamera', 'Lokasi', 'Merek', 'Status', 'IP Address', 'Terakhir Pemeliharaan', 'Foto CCTV', 'Catatan'],
      mapping: {
        'Kode': 'code',
        'Nama Kamera': 'name',
        'Lokasi': 'location',
        'Merek': 'brand',
        'Status': 'status',
        'IP Address': 'ipAddress',
        'Terakhir Pemeliharaan': 'lastMaintenance',
        'Foto CCTV': 'photoUrl',
        'Catatan': 'notes'
      } as Record<string, string>,
      defaults: {
        status: 'Aktif',
        brand: 'HikVision',
        location: 'Kawasan',
        ipAddress: '192.168.1.1',
        lastMaintenance: '',
        photoUrl: '',
        notes: ''
      },
      required: ['Kode', 'Nama Kamera'],
      sample: [
        {
          'Kode': 'TMII-CCTV-045',
          'Nama Kamera': 'Kamera Dome Gate 3 Masuk',
          'Lokasi': 'Pintu Masuk Utama Gate 3',
          'Merek': 'Dahua 4MP',
          'Status': 'Aktif',
          'IP Address': '10.20.14.45',
          'Terakhir Pemeliharaan': '2026-05-12',
          'Foto CCTV': '',
          'Catatan': 'Koneksi FO lancar, lensa sudah dibersihkan'
        },
        {
          'Kode': 'TMII-CCTV-046',
          'Nama Kamera': 'Kamera PTZ Parkir Keong Mas',
          'Lokasi': 'Area Parkir Barat Keong Mas',
          'Merek': 'HikVision PTZ 360',
          'Status': 'Rusak',
          'IP Address': '10.20.15.12',
          'Terakhir Pemeliharaan': '2026-04-10',
          'Foto CCTV': '',
          'Catatan': 'Motor penggerak PTZ macet, menunggu suku cadang pengganti'
        }
      ]
    },
    'mep': {
      title: 'Sistem MEP',
      headers: ['Kode', 'Nama Peralatan', 'Kategori', 'Lokasi', 'Merek', 'Kapasitas', 'Status', 'Frekuensi Pemeliharaan', 'Terakhir Servis', 'Servis Berikutnya', 'Foto Peralatan', 'Catatan'],
      mapping: {
        'Kode': 'code',
        'Nama Peralatan': 'name',
        'Kategori': 'category',
        'Lokasi': 'location',
        'Merek': 'brand',
        'Kapasitas': 'capacity',
        'Status': 'status',
        'Frekuensi Pemeliharaan': 'maintenanceFrequency',
        'Terakhir Servis': 'lastMaintenance',
        'Servis Berikutnya': 'nextMaintenance',
        'Foto Peralatan': 'photoUrl',
        'Catatan': 'notes'
      } as Record<string, string>,
      defaults: {
        category: 'Electrical',
        status: 'Normal',
        maintenanceFrequency: 'Bulanan',
        brand: 'Siemens',
        location: 'Kawasan',
        capacity: '-',
        lastMaintenance: '',
        nextMaintenance: '',
        photoUrl: '',
        notes: ''
      },
      required: ['Kode', 'Nama Peralatan', 'Kategori'],
      sample: [
        {
          'Kode': 'TMII-MEP-011',
          'Nama Peralatan': 'Genset Cadangan Utama 500kVA',
          'Kategori': 'Electrical',
          'Lokasi': 'Gedung Utilitas Sentral',
          'Merek': 'Cummins Power',
          'Kapasitas': '500 kVA',
          'Status': 'Normal',
          'Frekuensi Pemeliharaan': 'Bulanan',
          'Terakhir Servis': '2026-07-01',
          'Servis Berikutnya': '2026-08-01',
          'Foto Peralatan': '',
          'Catatan': 'Oli mesin dan filter solar baru diganti'
        },
        {
          'Kode': 'TMII-MEP-012',
          'Nama Peralatan': 'Pompa Distribusi Air Bersih',
          'Kategori': 'Plumbing',
          'Lokasi': 'Anjungan Barat Ground Tank',
          'Merek': 'Ebara Pump',
          'Kapasitas': '15 HP',
          'Status': 'Bermasalah',
          'Frekuensi Pemeliharaan': 'Triwulanan',
          'Terakhir Servis': '2026-05-10',
          'Servis Berikutnya': '2026-08-10',
          'Foto Peralatan': '',
          'Catatan': 'Terdengar suara getaran tidak biasa di bearing motor'
        }
      ]
    },
    'museum': {
      title: 'Koleksi Museum',
      headers: ['No Registrasi', 'Nama Koleksi', 'Kategori', 'Nama Museum', 'Asal Daerah', 'Bahan', 'Dimensi', 'Kondisi', 'Lampiran GDrive', 'Deskripsi'],
      mapping: {
        'No Registrasi': 'registerNo',
        'Nama Koleksi': 'name',
        'Kategori': 'category',
        'Nama Museum': 'museumName',
        'Asal Daerah': 'origin',
        'Bahan': 'material',
        'Dimensi': 'dimension',
        'Kondisi': 'condition',
        'Lampiran GDrive': 'driveFileUrl',
        'Deskripsi': 'description'
      } as Record<string, string>,
      defaults: {
        condition: 'Utuh',
        category: 'Etnografi',
        museumName: 'Museum Indonesia',
        origin: 'Nusantara',
        material: 'Kayu',
        dimension: 'Sedang',
        driveFileUrl: '',
        description: ''
      },
      required: ['No Registrasi', 'Nama Koleksi', 'Nama Museum'],
      sample: [
        {
          'No Registrasi': 'TMII-MUS-034',
          'Nama Koleksi': 'Keris Kuno Brojol Pamor Ron Genduru',
          'Kategori': 'Senjata Tradisional',
          'Nama Museum': 'Museum Pusaka TMII',
          'Asal Daerah': 'Surakarta, Jawa Tengah',
          'Bahan': 'Besi meteorit, nikel, kayu jati wulan',
          'Dimensi': 'Panjang bilah 37cm, total 48cm',
          'Kondisi': 'Utuh',
          'Lampiran GDrive': '',
          'Deskripsi': 'Warangka gayaman Surakarta jati kuno, terawat dilapisi minyak khusus keris'
        },
        {
          'No Registrasi': 'TMII-MUS-035',
          'Nama Koleksi': 'Archa Ganesha Batu Abad 14',
          'Kategori': 'Arkeologi',
          'Nama Museum': 'Museum Indonesia',
          'Asal Daerah': 'Trowulan, Jawa Timur',
          'Bahan': 'Batu andesit vulkanik',
          'Dimensi': 'Tinggi 65cm, Lebar 42cm',
          'Kondisi': 'Rusak Sebagian',
          'Lampiran GDrive': '',
          'Deskripsi': 'Bagian belalai bawah mengalami sedikit korosi termakan usia, terpajang di ruang pamer utama'
        }
      ]
    }
  };

  const currentConfig = config[type];

  // Helper: Trigger File Dialog
  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  // Helper: Generate and Download dynamic Excel Template
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(currentConfig.sample);
    
    // Auto fit column widths nicely
    const maxLens = currentConfig.headers.map(h => Math.max(h.length + 5, 14));
    ws['!cols'] = maxLens.map(l => ({ wch: l }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Template_${currentConfig.title.replace(/\s+/g, '_')}`);

    // If guidance exists, append Petunjuk_Kolom sheet
    if ((currentConfig as any).guidance) {
      const wsGuide = XLSX.utils.json_to_sheet((currentConfig as any).guidance);
      wsGuide['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 35 }, { wch: 55 }];
      XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk_Kolom');
    }

    XLSX.writeFile(wb, `Template_Import_${type}.xlsx`);
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop events
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Handle file selection from input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Reset file states
  const handleReset = () => {
    setFileName('');
    setParsedRows([]);
    setValidationErrors([]);
    setSuccessCount(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Process Excel/CSV File
  const processFile = (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      alert('Format file tidak didukung. Harap unggah file Excel (.xlsx, .xls) atau CSV (.csv).');
      return;
    }

    setFileName(file.name);
    setValidationErrors([]);
    setSuccessCount(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse sheet to JSON array
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];
        
        if (rawRows.length === 0) {
          setValidationErrors(['File kosong atau tidak memiliki baris data.']);
          return;
        }

        // Validate headers
        const parsedHeaders = Object.keys(rawRows[0]);
        
        // Build header to dbKey map using exact and normalized matching
        const cleanHeaderMap: Record<string, string> = {};
        parsedHeaders.forEach(ph => {
          const trimmed = ph.trim();
          if (currentConfig.mapping[trimmed]) {
            cleanHeaderMap[ph] = currentConfig.mapping[trimmed];
          } else {
            const normPh = normalizeHeaderStr(trimmed);
            for (const [mHeader, mKey] of Object.entries(currentConfig.mapping)) {
              if (normalizeHeaderStr(mHeader) === normPh) {
                cleanHeaderMap[ph] = mKey;
                break;
              }
            }
          }
        });

        // Check if required DB keys are present in mapped headers
        const presentDbKeys = new Set(Object.values(cleanHeaderMap));
        const missingCritical = currentConfig.required.filter(reqHeader => {
          const targetDbKey = currentConfig.mapping[reqHeader];
          return !presentDbKeys.has(targetDbKey);
        });

        if (missingCritical.length > 0) {
          setValidationErrors([
            `Kolom wajib tidak ditemukan: [${missingCritical.join(', ')}]. Harap sesuaikan template Excel yang benar.`
          ]);
          return;
        }

        // Map and validate rows
        const errorsList: string[] = [];
        const validMappedRows = rawRows.map((rawRow, index) => {
          const mappedRow: any = {};
          const rowNum = index + 2; // Row number in Excel sheet is 1-based, headers are row 1, so data starts on row 2

          // Apply mapping
          Object.entries(rawRow).forEach(([excelHeader, rawVal]) => {
            const dbKey = cleanHeaderMap[excelHeader];
            if (!dbKey) return;

            // Format numbers for cost, salvage value, etc.
            if (dbKey === 'acquisitionCost' || dbKey === 'salvageValue') {
              mappedRow[dbKey] = formatToNumber(rawVal);
            } else if (
              dbKey === 'acquisitionDate' ||
              dbKey === 'lastMaintenance' ||
              dbKey === 'nextMaintenance' ||
              dbKey === 'startDate' ||
              dbKey === 'dueDate'
            ) {
              mappedRow[dbKey] = formatToIsoDate(rawVal);
            } else if (rawVal instanceof Date) {
              mappedRow[dbKey] = formatToIsoDate(rawVal);
            } else if (rawVal !== undefined && rawVal !== null) {
              mappedRow[dbKey] = String(rawVal).trim();
            }
          });

          // Check required fields value
          currentConfig.required.forEach(reqHeader => {
            const dbKey = currentConfig.mapping[reqHeader];
            if (!mappedRow[dbKey]) {
              errorsList.push(`Baris ${rowNum}: Kolom wajib "${reqHeader}" kosong.`);
            }
          });

          // Enforce strict Enum conditions or fallbacks
          if (type === 'fixed-assets') {
            const conditionVal = mappedRow.condition;
            if (conditionVal && !['Baik', 'Rusak Ringan', 'Rusak Berat', 'Demolished'].includes(conditionVal)) {
              mappedRow.condition = 'Baik'; // fallback
            }
            const statusVal = mappedRow.status;
            if (statusVal && !['Aktif', 'Non-Aktif', 'Diperbaiki', 'Dihapuskan'].includes(statusVal)) {
              mappedRow.status = 'Aktif'; // fallback
            }
            const depVal = mappedRow.depreciationMethod;
            if (depVal && !['Garis Lurus', 'Saldo Menurun', 'Tidak Disusutkan'].includes(depVal)) {
              mappedRow.depreciationMethod = 'Garis Lurus'; // fallback
            }
            const classVal = mappedRow.classification;
            if (classVal && !['Aset', 'LVA'].includes(classVal)) {
              mappedRow.classification = 'Aset'; // fallback
            }
          }

          if (type === 'tasks') {
            const priorityVal = mappedRow.priority;
            if (priorityVal && !['Rendah', 'Sedang', 'Tinggi', 'Urgent'].includes(priorityVal)) {
              mappedRow.priority = 'Sedang'; // fallback
            }
            const statusVal = mappedRow.status;
            if (statusVal && !['Belum Dimulai', 'Sedang Berjalan', 'Selesai', 'Ditunda'].includes(statusVal)) {
              mappedRow.status = 'Belum Dimulai'; // fallback
            }
            const categoryVal = mappedRow.category;
            if (categoryVal && !['Umum', 'Fixed Asset', 'Satwa', 'CCTV', 'MEP', 'Museum'].includes(categoryVal)) {
              mappedRow.category = 'Umum'; // fallback
            }
          }

          if (type === 'animals') {
            const healthVal = mappedRow.healthStatus;
            if (healthVal && !['Sehat', 'Dalam Perawatan', 'Sakit', 'Karantina'].includes(healthVal)) {
              mappedRow.healthStatus = 'Sehat'; // fallback
            }
          }

          if (type === 'cctv') {
            const statusVal = mappedRow.status;
            if (statusVal && !['Aktif', 'Mati', 'Rusak', 'Perbaikan'].includes(statusVal)) {
              mappedRow.status = 'Aktif'; // fallback
            }
          }

          if (type === 'mep') {
            const catVal = mappedRow.category;
            if (catVal && !['Mechanical', 'Electrical', 'Plumbing'].includes(catVal)) {
              mappedRow.category = 'Electrical'; // fallback
            }
            const statusVal = mappedRow.status;
            if (statusVal && !['Normal', 'Bermasalah', 'Mati Total', 'Service'].includes(statusVal)) {
              mappedRow.status = 'Normal'; // fallback
            }
            const freqVal = mappedRow.maintenanceFrequency;
            if (freqVal && !['Mingguan', 'Bulanan', 'Triwulanan', 'Tahunan'].includes(freqVal)) {
              mappedRow.maintenanceFrequency = 'Bulanan'; // fallback
            }
          }

          if (type === 'museum') {
            const condVal = mappedRow.condition;
            if (condVal && !['Utuh', 'Rusak Sebagian', 'Rusak Parah'].includes(condVal)) {
              mappedRow.condition = 'Utuh'; // fallback
            }
          }

          // Merge defaults for omitted keys
          return {
            ...currentConfig.defaults,
            ...Object.fromEntries(Object.entries(mappedRow).filter(([_, v]) => v !== undefined && v !== ''))
          };
        });

        setValidationErrors(errorsList);
        setParsedRows(validMappedRows);
      } catch (err: any) {
        console.error(err);
        setValidationErrors([`Gagal mengurai file Excel: ${err.message}`]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Submit and Upload to Firestore
  const handleImportSubmit = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);

    try {
      await onImport(parsedRows);
      setSuccessCount(parsedRows.length);
      setParsedRows([]);
    } catch (err: any) {
      alert(`Terjadi kesalahan saat mengunggah data: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-[28px] border border-slate-200/60 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-6" id="import-data-panel">
      {/* Top Bar with Title */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#007AFF]/10 text-[#007AFF] rounded-2xl">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Import Data {currentConfig.title}</h3>
            <p className="text-xs text-slate-400">Unggah file Excel atau CSV untuk memasukkan data sekaligus</p>
          </div>
        </div>
        
        {onClose && (
          <button 
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        )}
      </div>

      {successCount !== null ? (
        /* Success Screen */
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-8 text-center space-y-4 max-w-md mx-auto"
        >
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Check size={28} className="stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-base">Berhasil Mengimpor Data!</h4>
            <p className="text-xs text-slate-500 font-medium">
              Sebanyak <span className="font-black text-emerald-600 text-sm">{successCount}</span> baris data aset berhasil ditambahkan ke database Firebase Firestore Anda.
            </p>
          </div>
          <button 
            onClick={handleReset}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Impor File Baru
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* File Upload Area (Col-span-5) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Template Download Block */}
            <div className="bg-[#F4F5FA] rounded-2xl p-4 border border-slate-150 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Langkah 1</span>
                <span className="text-xs font-bold text-slate-800 mt-1 block truncate">Unduh Template Excel</span>
              </div>
              <button 
                onClick={handleDownloadTemplate}
                className="bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Download size={14} />
                <span>Unduh</span>
              </button>
            </div>

            {/* Instruction toggle button */}
            <button 
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-xs text-[#007AFF] hover:underline font-bold flex items-center gap-1.5 px-1 cursor-pointer"
            >
              <HelpCircle size={14} />
              <span>{showInstructions ? 'Sembunyikan' : 'Lihat'} panduan format kolom</span>
            </button>

            {/* Collapsible Format Instructions */}
            <AnimatePresence>
              {showInstructions && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50 text-xs text-slate-600 space-y-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800">Format Kolom ({currentConfig.headers.length} Kolom Terintegrasi):</p>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                      Template Resmi TMII
                    </span>
                  </div>
                  
                  <div className="space-y-1.5 text-[11px]">
                    <div className="bg-red-50/70 border border-red-100 rounded-xl p-2.5">
                      <span className="font-bold text-red-800 block mb-1">Kolom Wajib Diisi:</span>
                      <div className="flex flex-wrap gap-1">
                        {currentConfig.required.map((req, i) => (
                          <span key={i} className="bg-white border border-red-200 text-red-700 font-bold px-2 py-0.5 rounded-md text-[10px]">
                            {req} *
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 space-y-1">
                      <span className="font-bold text-slate-700 block mb-1">Kolom Database Terhubung:</span>
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        {currentConfig.headers.join(', ')}
                      </p>
                    </div>

                    <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-500 font-medium">
                      <li>File template Excel sudah dilengkapi sheet <span className="font-bold text-slate-700">"Petunjuk_Kolom"</span> berisi keterangan dan contoh nilai setiap kolom.</li>
                      <li>Kolom opsional yang dikosongkan akan secara otomatis diisi nilai default yang valid oleh sistem.</li>
                      <li>Format tanggal yang didukung: <code className="bg-slate-200/70 px-1 py-0.5 rounded text-slate-800">YYYY-MM-DD</code> atau format kalender Excel.</li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Drag & Drop File Upload Stage */}
            {fileName ? (
              /* File Selected Preview State */
              <div className="p-5 border-2 border-[#007AFF] bg-[#007AFF]/5 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-[#007AFF]/10 text-[#007AFF] rounded-xl shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{fileName}</p>
                    <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5">FILE SIAP DIPROSES</p>
                  </div>
                </div>
                <button 
                  onClick={handleReset}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Hapus file"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              /* Drag & Drop Target Area */
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={handleSelectFileClick}
                className={`border-2 border-dashed rounded-[24px] p-8 text-center space-y-3 cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-[#007AFF] bg-[#007AFF]/5' 
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-300'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden" 
                />
                <div className="w-12 h-12 bg-white border border-slate-200 shadow-xs rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                  <Upload size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Tarik & lepas file Anda di sini</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Atau klik untuk memilih file Excel / CSV</p>
                </div>
              </div>
            )}

            {/* Validation Feedback */}
            {validationErrors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-700 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-red-900">
                  <AlertCircle size={16} className="text-red-600" />
                  <span>Kesalahan Validasi Data ({validationErrors.length})</span>
                </div>
                <div className="max-h-32 overflow-y-auto font-mono text-[10px] space-y-1 pr-1 leading-relaxed">
                  {validationErrors.map((err, i) => (
                    <div key={i}>&bull; {err}</div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Parsed Rows Preview Grid / Table (Col-span-7) */}
          <div className="lg:col-span-7 bg-slate-50/50 border border-slate-200/60 rounded-[24px] p-5 flex flex-col justify-between min-h-[300px]">
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Preview Baris Data ({parsedRows.length})</h4>
                <p className="text-[11px] text-slate-400 font-medium">Pratinjau data terurai sebelum disimpan ke database</p>
              </div>

              {parsedRows.length > 0 ? (
                /* Interactive Preview Table */
                <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[220px] my-3 border border-slate-150 rounded-xl bg-white">
                  <table className="w-full text-left border-collapse text-[11px] font-medium text-slate-700">
                    <thead className="bg-[#F4F5FA] border-b border-slate-200 font-bold text-slate-500 sticky top-0">
                      <tr>
                        {currentConfig.headers.slice(0, 6).map((h, i) => (
                          <th key={i} className="px-3 py-2 whitespace-nowrap">{h}</th>
                        ))}
                        {currentConfig.headers.length > 6 && (
                          <th className="px-3 py-2 whitespace-nowrap text-slate-400 font-medium">
                            +{currentConfig.headers.length - 6} kolom lainnya
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          {currentConfig.headers.slice(0, 6).map((h, i) => {
                            const dbKey = currentConfig.mapping[h];
                            const val = row[dbKey];
                            return (
                              <td key={i} className="px-3 py-2 truncate max-w-[140px]">
                                {val !== undefined && val !== '' ? (
                                  dbKey === 'acquisitionCost' || dbKey === 'salvageValue' ? (
                                    `Rp ${Number(val).toLocaleString('id-ID')}`
                                  ) : (
                                    String(val)
                                  )
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            );
                          })}
                          {currentConfig.headers.length > 6 && (
                            <td className="px-3 py-2 text-slate-400 italic text-[10px]">
                              Lengkap
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Empty Preview Stage */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 text-xs space-y-2">
                  <Database size={24} className="text-slate-300 stroke-[1.5]" />
                  <p className="font-bold">Pratinjau Kosong</p>
                  <p className="text-[10px] text-slate-400 max-w-xs font-medium">Unggah berkas Excel/CSV berformat valid untuk melihat pratinjau tabel.</p>
                </div>
              )}

              {/* Upload Trigger Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 bg-white lg:bg-transparent -mx-5 -mb-5 p-5 lg:p-0 rounded-b-[24px]">
                <button 
                  disabled={parsedRows.length === 0 || validationErrors.length > 0 || importing}
                  onClick={handleImportSubmit}
                  className="bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-bold px-6 py-2.5 rounded-xl disabled:opacity-40 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {importing ? 'Sedang Menyimpan...' : 'Simpan Data ke Database'}
                  <ArrowRight size={14} />
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
