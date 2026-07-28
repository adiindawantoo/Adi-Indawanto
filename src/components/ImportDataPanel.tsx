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
        'Merk dan Tipe',
        'Kepemilikan',
        'Area',
        'Lokasi',
        'Kategori',
        'Jenis',
        'Tanggal Perolehan',
        'Nilai Perolehan',
        'Masa Manfaat',
        'Kondisi',
        'Status',
        'Terakhir Pemeliharaan',
        'Pemeliharaan Berikutnya',
        'Catatan'
      ],
      mapping: {
        'Kode Aset': 'code',
        'Nama Barang': 'name',
        'Aset / LVA': 'classification',
        'Merk dan Tipe': 'brand',
        'Kepemilikan': 'ownership',
        'Area': 'area',
        'Lokasi': 'location',
        'Kategori': 'category',
        'Jenis': 'type',
        'Tanggal Perolehan': 'acquisitionDate',
        'Nilai Perolehan': 'acquisitionCost',
        'Masa Manfaat': 'usefulLife',
        'Kondisi': 'condition',
        'Status': 'status',
        'Terakhir Pemeliharaan': 'lastMaintenance',
        'Pemeliharaan Berikutnya': 'nextMaintenance',
        'Catatan': 'notes'
      } as Record<string, string>,
      defaults: {
        classification: 'Aset',
        condition: 'Baik',
        status: 'Aktif',
        brand: '-',
        ownership: '-',
        area: '-',
        location: '-',
        category: '-',
        type: '-',
        usefulLife: '-',
        acquisitionDate: new Date().toISOString().split('T')[0],
        acquisitionCost: 0
      },
      required: ['Kode Aset', 'Nama Barang'],
      sample: [
        {
          'Kode Aset': 'TMII-FA-101',
          'Nama Barang': 'Sofa VIP Lounge',
          'Aset / LVA': 'Aset',
          'Merk dan Tipe': 'Informa',
          'Kepemilikan': 'PT. Taman Wisata Candi',
          'Area': 'Sasono Utomo',
          'Lokasi': 'Lobby',
          'Kategori': 'Peralatan',
          'Jenis': 'Mebel',
          'Tanggal Perolehan': '2025-02-14',
          'Nilai Perolehan': 12500000,
          'Masa Manfaat': '5 Tahun',
          'Kondisi': 'Baik',
          'Status': 'Aktif',
          'Terakhir Pemeliharaan': '2026-01-15',
          'Pemeliharaan Berikutnya': '2026-07-15',
          'Catatan': 'Bahan kulit premium warna cokelat'
        },
        {
          'Kode Aset': 'TMII-FA-102',
          'Nama Barang': 'Gamelan Pelog Gangsa',
          'Aset / LVA': 'Aset',
          'Merk dan Tipe': 'Pengrajin Surakarta',
          'Kepemilikan': 'Milik Sendiri',
          'Area': 'Anjungan Jawa Tengah',
          'Lokasi': 'Pendopo Utama',
          'Kategori': 'Seni Budaya',
          'Jenis': 'Alat Musik',
          'Tanggal Perolehan': '2020-05-10',
          'Nilai Perolehan': 45000000,
          'Masa Manfaat': '10 Tahun',
          'Kondisi': 'Baik',
          'Status': 'Aktif',
          'Terakhir Pemeliharaan': '2026-05-01',
          'Pemeliharaan Berikutnya': '2026-11-01',
          'Catatan': 'Rawat berkala kuningan perunggu'
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
      headers: ['Kode', 'Nama Panggilan', 'Spesies', 'Lokasi', 'Status Kesehatan', 'Terakhir Pemeriksaan', 'Pemeriksaan Berikutnya', 'Pola Makan', 'Riwayat Medis'],
      mapping: {
        'Kode': 'code',
        'Nama Panggilan': 'name',
        'Spesies': 'species',
        'Lokasi': 'location',
        'Status Kesehatan': 'healthStatus',
        'Terakhir Pemeriksaan': 'lastCheckup',
        'Pemeriksaan Berikutnya': 'nextCheckup',
        'Pola Makan': 'diet',
        'Riwayat Medis': 'medicalHistory'
      } as Record<string, string>,
      defaults: {
        healthStatus: 'Sehat',
        location: 'Taman Burung',
        species: 'Burung',
        lastCheckup: '',
        nextCheckup: '',
        diet: 'Biji-bijian',
        medicalHistory: ''
      },
      required: ['Kode', 'Nama Panggilan', 'Spesies'],
      sample: [
        {
          'Kode': 'TMII-AN-015',
          'Nama Panggilan': 'Bimo',
          'Spesies': 'Gajah Sumatera (Elephas maximus)',
          'Lokasi': 'Taman Satwa Puspa Iptek',
          'Status Kesehatan': 'Sehat',
          'Terakhir Pemeriksaan': '2026-06-10',
          'Pemeriksaan Berikutnya': '2026-12-10',
          'Pola Makan': 'Rumput Gajah, Wortel, Buah-buahan 150kg/hari',
          'Riwayat Medis': 'Pernah luka ringan di gading kiri (2024), sudah sembuh total'
        },
        {
          'Kode': 'TMII-AN-016',
          'Nama Panggilan': 'Sari',
          'Spesies': 'Merak Hijau (Pavo muticus)',
          'Lokasi': 'Kubah Barat Taman Burung',
          'Status Kesehatan': 'Dalam Perawatan',
          'Terakhir Pemeriksaan': '2026-07-14',
          'Pemeriksaan Berikutnya': '2026-07-28',
          'Pola Makan': 'Biji-bijian, Pelet khusus, Jangkrik',
          'Riwayat Medis': 'Bulu sayap rontok tidak normal, sedang terapi vitamin kulit'
        }
      ]
    },
    'cctv': {
      title: 'Kamera CCTV',
      headers: ['Kode', 'Nama Kamera', 'Lokasi', 'Merek', 'Status', 'IP Address', 'Terakhir Pemeliharaan', 'Catatan'],
      mapping: {
        'Kode': 'code',
        'Nama Kamera': 'name',
        'Lokasi': 'location',
        'Merek': 'brand',
        'Status': 'status',
        'IP Address': 'ipAddress',
        'Terakhir Pemeliharaan': 'lastMaintenance',
        'Catatan': 'notes'
      } as Record<string, string>,
      defaults: {
        status: 'Aktif',
        brand: 'HikVision',
        location: 'Kawasan',
        ipAddress: '192.168.1.1',
        lastMaintenance: ''
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
          'Catatan': 'Motor penggerak PTZ macet, menunggu suku cadang pengganti'
        }
      ]
    },
    'mep': {
      title: 'Sistem MEP',
      headers: ['Kode', 'Nama Peralatan', 'Kategori', 'Lokasi', 'Merek', 'Kapasitas', 'Status', 'Frekuensi Pemeliharaan', 'Terakhir Servis', 'Servis Berikutnya', 'Catatan'],
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
        nextMaintenance: ''
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
          'Catatan': 'Terdengar suara getaran tidak biasa di bearing motor'
        }
      ]
    },
    'museum': {
      title: 'Koleksi Museum',
      headers: ['No Registrasi', 'Nama Koleksi', 'Kategori', 'Nama Museum', 'Asal Daerah', 'Bahan', 'Dimensi', 'Kondisi', 'Deskripsi'],
      mapping: {
        'No Registrasi': 'registerNo',
        'Nama Koleksi': 'name',
        'Kategori': 'category',
        'Nama Museum': 'museumName',
        'Asal Daerah': 'origin',
        'Bahan': 'material',
        'Dimensi': 'dimension',
        'Kondisi': 'condition',
        'Deskripsi': 'description'
      } as Record<string, string>,
      defaults: {
        condition: 'Utuh',
        category: 'Etnografi',
        museumName: 'Museum Indonesia',
        origin: 'Nusantara',
        material: 'Kayu',
        dimension: 'Sedang',
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
    const maxLens = currentConfig.headers.map(h => h.length + 5);
    ws['!cols'] = maxLens.map(l => ({ wch: l }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Template_${currentConfig.title}`);
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
        const missingRequiredHeaders = currentConfig.headers.filter(h => !parsedHeaders.includes(h));
        
        // If critical required headers are missing, list them
        const missingCritical = currentConfig.required.filter(req => !parsedHeaders.includes(req));
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
          Object.entries(currentConfig.mapping).forEach(([excelHeader, dbKey]) => {
            const rawVal = rawRow[excelHeader];
            
            // Format dates neatly to ISO Date string if they are parsed as Date objects
            if (rawVal instanceof Date) {
              mappedRow[dbKey] = rawVal.toISOString().split('T')[0];
            } else if (rawVal !== undefined && rawVal !== null) {
              // Convert clean string, numbers to numbers if necessary
              if (dbKey === 'acquisitionCost') {
                mappedRow[dbKey] = Number(rawVal) || 0;
              } else {
                mappedRow[dbKey] = String(rawVal).trim();
              }
            } else {
              mappedRow[dbKey] = undefined;
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
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50 text-xs text-slate-600 space-y-2 overflow-hidden"
                >
                  <p className="font-bold text-slate-800">Format Kolom yang Diperlukan:</p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] font-medium">
                    <li><span className="font-bold">Kolom Wajib:</span> {currentConfig.required.join(', ')}</li>
                    <li><span className="font-bold">Kolom Lainnya:</span> {currentConfig.headers.filter(h => !currentConfig.required.includes(h)).join(', ')}</li>
                    <li>Pastikan nama kolom di baris pertama Excel/CSV sama persis seperti contoh.</li>
                    <li>Sistem otomatis memberikan nilai bawaan jika kolom opsional dikosongkan.</li>
                  </ul>
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
                        {Object.keys(currentConfig.mapping).slice(0, 4).map((h, i) => (
                          <th key={i} className="px-3 py-2">{h}</th>
                        ))}
                        {Object.keys(currentConfig.mapping).length > 4 && <th className="px-3 py-2">dll.</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          {Object.values(currentConfig.mapping).slice(0, 4).map((key, i) => (
                            <td key={i} className="px-3 py-2 truncate max-w-[120px]">
                              {row[key] !== undefined ? String(row[key]) : '-'}
                            </td>
                          ))}
                          {Object.keys(currentConfig.mapping).length > 4 && (
                            <td className="px-3 py-2 text-slate-400 italic">...</td>
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
