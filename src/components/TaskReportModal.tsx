import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X,
  Printer,
  ChevronRight,
  User,
  Layers,
  Sparkles
} from 'lucide-react';
import { UserTask, AppTheme } from '../types';
import { generateTaskReportPdf, formatIndonesianDate } from '../lib/taskReportPdf';
import { exportToExcel } from '../lib/excel';

interface TaskReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: UserTask[];
  theme: AppTheme;
  userEmail?: string | null;
}

export default function TaskReportModal({
  isOpen,
  onClose,
  tasks,
  theme,
  userEmail
}: TaskReportModalProps) {
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateBasis, setDateBasis] = useState<'executionRange' | 'dueDate' | 'startDate' | 'createdAt'>('executionRange');
  
  // Secondary Filters
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [priorityFilter, setPriorityFilter] = useState('Semua');
  const [assigneeFilter, setAssigneeFilter] = useState('Semua');
  
  // Custom Signatory / Reporter Name
  const [reporterName, setReporterName] = useState(userEmail || 'Petugas Asset Management');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // List of unique assignees
  const uniqueAssignees = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      if (t.assignee && t.assignee.trim()) {
        set.add(t.assignee.trim());
      }
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Quick Preset Helper
  const applyPreset = (preset: 'all' | 'today' | 'last7' | 'thisMonth' | 'lastMonth' | 'thisYear') => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
      return;
    }

    if (preset === 'last7') {
      const past7 = new Date();
      past7.setDate(today.getDate() - 7);
      const pastYyyy = past7.getFullYear();
      const pastMm = String(past7.getMonth() + 1).padStart(2, '0');
      const pastDd = String(past7.getDate()).padStart(2, '0');
      setStartDate(`${pastYyyy}-${pastMm}-${pastDd}`);
      setEndDate(todayStr);
      return;
    }

    if (preset === 'thisMonth') {
      const firstDay = `${yyyy}-${mm}-01`;
      const lastDayObj = new Date(yyyy, today.getMonth() + 1, 0);
      const lastDay = `${yyyy}-${mm}-${String(lastDayObj.getDate()).padStart(2, '0')}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
      return;
    }

    if (preset === 'lastMonth') {
      const lastMonthDate = new Date(yyyy, today.getMonth() - 1, 1);
      const lastMonthYyyy = lastMonthDate.getFullYear();
      const lastMonthMm = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
      const lastMonthFirstDay = `${lastMonthYyyy}-${lastMonthMm}-01`;
      const lastMonthEndObj = new Date(lastMonthYyyy, lastMonthDate.getMonth() + 1, 0);
      const lastMonthLastDay = `${lastMonthYyyy}-${lastMonthMm}-${String(lastMonthEndObj.getDate()).padStart(2, '0')}`;
      setStartDate(lastMonthFirstDay);
      setEndDate(lastMonthLastDay);
      return;
    }

    if (preset === 'thisYear') {
      setStartDate(`${yyyy}-01-01`);
      setEndDate(`${yyyy}-12-31`);
      return;
    }
  };

  // Filter Tasks based on selections
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Date filter
      if (startDate || endDate) {
        if (dateBasis === 'executionRange') {
          // If task has startDate or dueDate, check if it overlaps with selected range
          const taskStart = task.startDate || task.createdAt?.split('T')[0] || '';
          const taskDue = task.dueDate || taskStart;
          
          if (startDate && taskDue && taskDue < startDate) return false;
          if (endDate && taskStart && taskStart > endDate) return false;
        } else if (dateBasis === 'dueDate') {
          if (!task.dueDate) return false;
          if (startDate && task.dueDate < startDate) return false;
          if (endDate && task.dueDate > endDate) return false;
        } else if (dateBasis === 'startDate') {
          if (!task.startDate) return false;
          if (startDate && task.startDate < startDate) return false;
          if (endDate && task.startDate > endDate) return false;
        } else if (dateBasis === 'createdAt') {
          const created = task.createdAt?.split('T')[0] || '';
          if (!created) return false;
          if (startDate && created < startDate) return false;
          if (endDate && created > endDate) return false;
        }
      }

      // 2. Category
      if (categoryFilter !== 'Semua' && task.category !== categoryFilter) {
        return false;
      }

      // 3. Status
      if (statusFilter !== 'Semua') {
        if (statusFilter === 'Belum Selesai') {
          if (task.status === 'Selesai') return false;
        } else if (task.status !== statusFilter) {
          return false;
        }
      }

      // 4. Priority
      if (priorityFilter !== 'Semua' && task.priority !== priorityFilter) {
        return false;
      }

      // 5. Assignee
      if (assigneeFilter !== 'Semua' && task.assignee !== assigneeFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, startDate, endDate, dateBasis, categoryFilter, statusFilter, priorityFilter, assigneeFilter]);

  // Statistics
  const totalCount = filteredTasks.length;
  const selesaiCount = filteredTasks.filter(t => t.status === 'Selesai').length;
  const berjalanCount = filteredTasks.filter(t => t.status === 'Sedang Berjalan').length;
  const belumCount = filteredTasks.filter(t => t.status === 'Belum Dimulai').length;
  const ditundaCount = filteredTasks.filter(t => t.status === 'Ditunda').length;
  const urgentCount = filteredTasks.filter(t => t.priority === 'Urgent' || t.priority === 'Tinggi').length;
  const completionRate = totalCount > 0 ? Math.round((selesaiCount / totalCount) * 100) : 0;

  const handleDownloadPdf = async () => {
    if (filteredTasks.length === 0) {
      alert('Tidak ada data tugas yang sesuai dengan kriteria filter untuk dicetak.');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const dateBasisLabels: Record<string, string> = {
        executionRange: 'Rentang Waktu Pelaksanaan',
        dueDate: 'Batas Waktu (Due Date)',
        startDate: 'Tanggal Mulai',
        createdAt: 'Tanggal Input Sistem'
      };

      await generateTaskReportPdf({
        tasks: filteredTasks,
        startDate,
        endDate,
        dateFilterType: dateBasisLabels[dateBasis] || 'Rentang Waktu',
        categoryFilter,
        statusFilter,
        priorityFilter,
        assigneeFilter,
        generatedBy: reporterName.trim() || 'Petugas Asset Management'
      });
    } catch (err) {
      console.error('Error generating PDF report:', err);
      alert('Terjadi kesalahan saat membuat file PDF laporan. Silakan coba lagi.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredTasks.length === 0) {
      alert('Tidak ada data tugas yang sesuai dengan kriteria filter.');
      return;
    }

    const exportData = filteredTasks.map((t, idx) => ({
      'No': idx + 1,
      'Judul Tugas': t.title,
      'Deskripsi / Uraian': t.description,
      'Kategori Aset': t.category,
      'Penanggung Jawab (PIC)': t.assignee,
      'Tanggal Mulai': t.startDate || '-',
      'Batas Waktu': t.dueDate || '-',
      'Prioritas': t.priority,
      'Status Pekerjaan': t.status,
      'Catatan Progres': t.notes || '-',
      'Link Lampiran': t.driveFileUrl || '-',
      'Tanggal Dibuat': t.createdAt
    }));

    const safeStart = startDate || 'Awal';
    const safeEnd = endDate || 'Akhir';
    exportToExcel(exportData, `Laporan_Tugas_TMII_${safeStart}_sd_${safeEnd}`, 'Laporan Tugas');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto border border-slate-100"
        id="task-report-modal"
      >
        {/* Modal Header */}
        <div 
          className="p-5 sm:p-6 text-white relative flex items-center justify-between"
          style={{
            background: `linear-gradient(135deg, ${theme.darkAccent} 0%, ${theme.primaryColor} 100%)`
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md shadow-inner">
              <FileText size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Generate Laporan Pekerjaan & Tugas
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                Filter periode tanggal pelaksanaan, sesuaikan parameter, dan unduh dokumen resmi format PDF/Excel.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">
          
          {/* 1. Date Range Section */}
          <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/70 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={15} className="text-teal-600" />
                Pilihan Rentang Tanggal Pekerjaan
              </label>
              
              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    !startDate && !endDate ? 'bg-teal-700 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('thisMonth')}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('lastMonth')}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  Bulan Lalu
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('last7')}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  7 Hari Terakhir
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('thisYear')}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  Tahun Ini
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Start Date */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">Dari Tanggal:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                />
              </div>

              {/* End Date */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">Sampai Tanggal:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                />
              </div>

              {/* Basis Tanggal */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">Dasar Acuan Tanggal:</span>
                <select
                  value={dateBasis}
                  onChange={e => setDateBasis(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                >
                  <option value="executionRange">Periode Pelaksanaan (Mulai s.d. Batas Waktu)</option>
                  <option value="dueDate">Batas Waktu (Due Date)</option>
                  <option value="startDate">Tanggal Mulai Pekerjaan</option>
                  <option value="createdAt">Tanggal Input Sistem</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Additional Filters Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Kategori */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Kategori Aset
              </label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="Umum">Umum</option>
                <option value="Fixed Asset">Fixed Asset</option>
                <option value="Satwa">Satwa</option>
                <option value="CCTV">CCTV</option>
                <option value="MEP">MEP</option>
                <option value="Museum">Museum</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status Pekerjaan
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Semua">Semua Status</option>
                <option value="Belum Selesai">Belum Selesai (Aktif)</option>
                <option value="Selesai">Selesai</option>
                <option value="Sedang Berjalan">Sedang Berjalan</option>
                <option value="Belum Dimulai">Belum Dimulai</option>
                <option value="Ditunda">Ditunda</option>
              </select>
            </div>

            {/* Prioritas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tingkat Prioritas
              </label>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Semua">Semua Prioritas</option>
                <option value="Urgent">Urgent</option>
                <option value="Tinggi">Tinggi</option>
                <option value="Sedang">Sedang</option>
                <option value="Rendah">Rendah</option>
              </select>
            </div>

            {/* Penanggung Jawab */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Penanggung Jawab (PIC)
              </label>
              <select
                value={assigneeFilter}
                onChange={e => setAssigneeFilter(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Semua">Semua PIC</option>
                {uniqueAssignees.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Nama Petugas / Admin Pencetak */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User size={16} className="text-teal-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Dicetak Oleh:</span>
                <span className="text-[11px] text-slate-500">Nama petugas yang tertera pada informasi header dokumen</span>
              </div>
            </div>
            <input
              type="text"
              value={reporterName}
              onChange={e => setReporterName(e.target.value)}
              placeholder="Contoh: Adi Indawanto (Staff Asset)"
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 sm:w-64"
            />
          </div>

          {/* 4. Live Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-teal-600" />
                Ringkasan Data Laporan Terfilter
              </span>
              <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                {totalCount} Pekerjaan Terpilih
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tingkat Penyelesaian</span>
                <span className="text-lg font-black text-emerald-600">{completionRate}%</span>
                <span className="text-[10px] text-slate-500 block">{selesaiCount} dari {totalCount} selesai</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sedang Berjalan</span>
                <span className="text-lg font-black text-sky-600">{berjalanCount}</span>
                <span className="text-[10px] text-slate-500 block">Dalam pengerjaan tim</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Belum / Tertunda</span>
                <span className="text-lg font-black text-amber-600">{belumCount + ditundaCount}</span>
                <span className="text-[10px] text-slate-500 block">{belumCount} antrean, {ditundaCount} ditunda</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Prioritas Urgent/High</span>
                <span className="text-lg font-black text-rose-600">{urgentCount}</span>
                <span className="text-[10px] text-slate-500 block">Perlu atensi khusus</span>
              </div>
            </div>

            {/* Quick Preview Table of First 3 Items */}
            {filteredTasks.length > 0 ? (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-semibold">
                      <th className="py-2 px-3 rounded-l-lg">Judul Tugas</th>
                      <th className="py-2 px-2">Kategori</th>
                      <th className="py-2 px-2">PIC</th>
                      <th className="py-2 px-2">Batas Waktu</th>
                      <th className="py-2 px-3 rounded-r-lg">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTasks.slice(0, 3).map(task => (
                      <tr key={task.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900 max-w-[240px] truncate">
                          {task.title}
                        </td>
                        <td className="py-2 px-2 text-slate-600">{task.category}</td>
                        <td className="py-2 px-2 text-slate-600">{task.assignee || '-'}</td>
                        <td className="py-2 px-2 text-slate-600">{task.dueDate ? formatIndonesianDate(task.dueDate) : '-'}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            task.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                            task.status === 'Sedang Berjalan' ? 'bg-sky-100 text-sky-800' :
                            task.status === 'Ditunda' ? 'bg-rose-100 text-rose-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTasks.length > 3 && (
                  <p className="text-[11px] text-slate-400 italic text-center mt-2">
                    ... dan {filteredTasks.length - 3} tugas lainnya akan dicetak lengkap dalam dokumen PDF
                  </p>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Tidak ada tugas yang sesuai dengan kriteria penyaringan di atas.
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Format Dokumen: <span className="font-bold text-slate-800">A4 Landscape Resmi PT Bhumi Visatanda Indonesia</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredTasks.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-xl text-xs border border-emerald-200/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={15} />
              <span>Ekspor Excel</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={filteredTasks.length === 0 || isGeneratingPdf}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Download size={15} className={isGeneratingPdf ? 'animate-bounce' : ''} />
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download PDF Laporan'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
