import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Paperclip,
  Upload,
  Loader2,
  ExternalLink,
  ArrowUpDown,
  Tag,
  AlertTriangle,
  Share2,
  Copy,
  Check,
  Eye,
  Phone,
  Globe
} from 'lucide-react';
import { UserTask, AppTheme } from '../types';
import { exportToExcel } from '../lib/excel';
import ImportDataPanel from './ImportDataPanel';
import TaskReportModal from './TaskReportModal';

interface TaskManagementProps {
  tasks: UserTask[];
  onAddTask: (task: Omit<UserTask, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateTask: (id: string, task: Partial<UserTask>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  isAdmin?: boolean;
  googleAccessToken: string | null;
  theme: AppTheme;
  userEmail?: string | null;
}

export default function TaskManagement({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  isAdmin = true,
  googleAccessToken,
  theme,
  userEmail
}: TaskManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Belum Selesai');
  const [priorityFilter, setPriorityFilter] = useState('Semua');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Sorting & Pagination States (Default: Tanggal Terkini Descending)
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<UserTask | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<UserTask['category']>('Umum');
  const [formAssignee, setFormAssignee] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formPriority, setFormPriority] = useState<UserTask['priority']>('Sedang');
  const [formStatus, setFormStatus] = useState<UserTask['status']>('Belum Dimulai');
  const [formNotes, setFormNotes] = useState('');
  const [driveFile, setDriveFile] = useState<{ id: string; name: string; url: string } | null>(null);
  const [manualDriveUrl, setManualDriveUrl] = useState('');
  const [manualDriveName, setManualDriveName] = useState('');

  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guest portal link & photo lightbox states
  const [isGuestLinkModalOpen, setIsGuestLinkModalOpen] = useState(false);
  const [copiedGuestLink, setCopiedGuestLink] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Reset page when filter or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter, categoryFilter, sortColumn, sortDirection]);

  const resetForm = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Umum');
    setFormAssignee('');
    setFormStartDate('');
    setFormDueDate('');
    setFormPriority('Sedang');
    setFormStatus('Belum Dimulai');
    setFormNotes('');
    setDriveFile(null);
    setManualDriveUrl('');
    setManualDriveName('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: UserTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description);
    setFormCategory(task.category);
    setFormAssignee(task.assignee);
    setFormStartDate(task.startDate || '');
    setFormDueDate(task.dueDate || '');
    setFormPriority(task.priority);
    setFormStatus(task.status);
    setFormNotes(task.notes || '');
    if (task.driveFileUrl && task.driveFileName) {
      setDriveFile({
        id: '',
        name: task.driveFileName,
        url: task.driveFileUrl
      });
      setManualDriveUrl(task.driveFileUrl);
      setManualDriveName(task.driveFileName);
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
          Authorization: `Bearer ${googleAccessToken}`,
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
            Authorization: `Bearer ${googleAccessToken}`,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Judul Tugas wajib diisi.');
      return;
    }

    const taskPayload = {
      title: formTitle,
      description: formDescription,
      category: formCategory,
      assignee: formAssignee,
      startDate: formStartDate,
      dueDate: formDueDate,
      priority: formPriority,
      status: formStatus,
      notes: formNotes,
      driveFileUrl: manualDriveUrl.trim() || driveFile?.url || '',
      driveFileName: manualDriveName.trim() || driveFile?.name || (manualDriveUrl.trim() ? 'Lampiran Berkas' : '')
    };

    try {
      if (editingTask) {
        await onUpdateTask(editingTask.id, taskPayload);
      } else {
        await onAddTask(taskPayload);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(`Gagal menyimpan tugas: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
      try {
        await onDeleteTask(id);
      } catch (err: any) {
        alert(`Gagal menghapus tugas: ${err.message}`);
      }
    }
  };

  const handleExport = () => {
    const exportData = tasks.map(t => ({
      'ID Tugas': t.id,
      'Judul Tugas': t.title,
      'Deskripsi': t.description,
      'Kategori Aset': t.category,
      'Prioritas': t.priority,
      'Penanggung Jawab': t.assignee,
      'Tanggal Mulai': t.startDate,
      'Batas Waktu': t.dueDate,
      'Status': t.status,
      'Catatan Pekerjaan': t.notes || '',
      'Nama Lampiran': t.driveFileName || '',
      'Link Google Drive': t.driveFileUrl || '',
      'Tanggal Pembuatan': t.createdAt
    }));
    exportToExcel(exportData, 'Daftar_Tugas_TMII_Asset_Management', 'Tugas');
  };

  // Filtering logic
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assignee.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'Semua' ? true :
      statusFilter === 'Belum Selesai' ? task.status !== 'Selesai' :
      task.status === statusFilter;
    const matchesPriority = priorityFilter === 'Semua' || task.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'Semua' || task.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  // Sort Tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let valA = a[sortColumn as keyof UserTask] || '';
    let valB = b[sortColumn as keyof UserTask] || '';

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination Slice
  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage) || 1;
  const paginatedTasks = sortedTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6" id="tasks-module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="tasks-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Task & Pekerjaan tim Asset Management</h1>
          <p className="text-sm text-gray-500">Koordinasikan pekerjaan pemeliharaan dan audit aset TMII</p>
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
              id="btn-import-tasks-toggle"
            >
              <FileSpreadsheet size={18} className={isImportOpen ? 'text-white' : 'text-slate-500'} />
              <span>Import Excel/CSV</span>
            </button>
          )}
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-2 px-4 rounded-xl shadow-xs border border-slate-200/80 transition-all cursor-pointer hover:border-slate-300"
            id="btn-generate-task-report"
            title="Generate Laporan Pekerjaan & Download PDF"
          >
            <FileText size={18} className="text-rose-600" />
            <span>Generate Laporan & PDF</span>
          </button>
          <button 
            onClick={() => setIsGuestLinkModalOpen(true)}
            className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold py-2 px-4 rounded-xl shadow-xs border border-emerald-300/80 transition-all cursor-pointer"
            id="btn-guest-form-link"
            title="Bagikan Tautan Formulir Laporan Tamu"
          >
            <Globe size={18} className="text-emerald-700" />
            <span>Formulir Tamu</span>
          </button>
          <button 
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-xl shadow-xs transition-colors"
            id="btn-export-tasks"
          >
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
          {isAdmin && (
            <button 
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-colors cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
              id="btn-add-task"
            >
              <Plus size={18} />
              <span>Tugas Baru</span>
            </button>
          )}
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
              type="tasks"
              onImport={async (parsedRows) => {
                for (const row of parsedRows) {
                  await onAddTask(row);
                }
                setIsImportOpen(false);
              }}
              onClose={() => setIsImportOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters and Search - completely borderless */}
      <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4" id="tasks-filter-panel">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 items-center">
          
          <div className="relative md:col-span-3">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari tugas, deskripsi, staff..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none border border-slate-200/60 font-medium"
            >
              <option value="Belum Selesai">Belum Selesai (Aktif)</option>
              <option value="Semua">Semua Status</option>
              <option value="Belum Dimulai">Belum Dimulai</option>
              <option value="Sedang Berjalan">Sedang Berjalan</option>
              <option value="Selesai">Selesai</option>
              <option value="Ditunda">Ditunda</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select 
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none border border-slate-200/60 font-medium"
            >
              <option value="Semua">Semua Prioritas</option>
              <option value="Rendah">Rendah</option>
              <option value="Sedang">Sedang</option>
              <option value="Tinggi">Tinggi</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select 
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none border border-slate-200/60 font-medium"
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

          <div className="md:col-span-3 flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 shrink-0 uppercase tracking-wider">Urutkan:</span>
            <select 
              value={sortColumn}
              onChange={e => setSortColumn(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none border border-slate-200/60 font-medium"
            >
              <option value="createdAt">Tanggal Terkini (Dibuat)</option>
              <option value="dueDate">Batas Waktu (Due Date)</option>
              <option value="startDate">Tanggal Mulai</option>
              <option value="title">Judul Tugas</option>
              <option value="category">Kategori</option>
              <option value="priority">Prioritas</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-gray-500 border border-slate-200/60 shrink-0"
              title={sortDirection === 'desc' ? 'Urutan Terbaru → Terlama' : 'Urutan Terlama → Terbaru'}
            >
              <ArrowUpDown size={16} className={sortDirection === 'desc' ? 'text-teal-700 font-bold' : 'text-gray-500'} />
            </button>
          </div>

        </div>
      </div>

      {/* Task List/Table - completely borderless wrapper */}
      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.015)] overflow-hidden" id="tasks-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th 
                  className="py-4 px-6 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                  onClick={() => {
                    if (sortColumn === 'title') setSortDirection(p => p === 'asc' ? 'desc' : 'asc');
                    else { setSortColumn('title'); setSortDirection('asc'); }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    Tugas / Kategori
                    <ArrowUpDown size={13} className={sortColumn === 'title' ? 'text-teal-600 font-bold' : 'text-gray-300'} />
                  </div>
                </th>
                <th 
                  className="py-4 px-6 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                  onClick={() => {
                    if (sortColumn === 'status') setSortDirection(p => p === 'asc' ? 'desc' : 'asc');
                    else { setSortColumn('status'); setSortDirection('asc'); }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    Status
                    <ArrowUpDown size={13} className={sortColumn === 'status' ? 'text-teal-600 font-bold' : 'text-gray-300'} />
                  </div>
                </th>
                <th 
                  className="py-4 px-6 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                  onClick={() => {
                    if (sortColumn === 'priority') setSortDirection(p => p === 'asc' ? 'desc' : 'asc');
                    else { setSortColumn('priority'); setSortDirection('asc'); }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    Prioritas
                    <ArrowUpDown size={13} className={sortColumn === 'priority' ? 'text-teal-600 font-bold' : 'text-gray-300'} />
                  </div>
                </th>
                <th 
                  className="py-4 px-6 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                  onClick={() => {
                    if (sortColumn === 'assignee') setSortDirection(p => p === 'asc' ? 'desc' : 'asc');
                    else { setSortColumn('assignee'); setSortDirection('asc'); }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    Penanggung Jawab
                    <ArrowUpDown size={13} className={sortColumn === 'assignee' ? 'text-teal-600 font-bold' : 'text-gray-300'} />
                  </div>
                </th>
                <th 
                  className="py-4 px-6 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                  onClick={() => {
                    if (sortColumn === 'createdAt' || sortColumn === 'dueDate') {
                      setSortDirection(p => p === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortColumn('createdAt');
                      setSortDirection('desc');
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    Tenggat & Tanggal
                    <ArrowUpDown size={13} className={(sortColumn === 'createdAt' || sortColumn === 'dueDate') ? 'text-teal-600 font-bold' : 'text-gray-300'} />
                  </div>
                </th>
                <th className="py-4 px-6">Lampiran GDrive</th>
                <th className="py-4 px-6 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    Tidak ada tugas pekerjaan yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map(task => (
                  <tr key={task.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-900 text-sm">{task.title}</span>
                          {(task.source === 'guest' || task.ticketNumber) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertTriangle size={10} className="text-amber-600" />
                              Laporan Tamu {task.ticketNumber ? `(#${task.ticketNumber})` : ''}
                            </span>
                          )}
                          {task.isUntagged && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              Manual (Belum Tagging)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description || 'Tidak ada deskripsi'}</div>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Tag size={12} className="text-gray-400" />
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {task.category}
                            </span>
                          </div>
                          {task.reporterName && (
                            <span className="text-[11px] text-slate-600 bg-slate-100/70 px-2 py-0.5 rounded-md">
                              Pelapor: <strong className="text-slate-800">{task.reporterName}</strong>
                            </span>
                          )}
                          {task.photoUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoUrl(task.photoUrl || null)}
                              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors border border-emerald-200/60"
                              title="Lihat Foto Bukti"
                            >
                              <Eye size={11} />
                              <span>Foto Bukti</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        task.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700' :
                        task.status === 'Sedang Berjalan' ? 'bg-blue-50 text-blue-700' :
                        task.status === 'Ditunda' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {task.status === 'Selesai' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {task.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        task.priority === 'Urgent' ? 'bg-red-100 text-red-800 font-bold animate-pulse' :
                        task.priority === 'Tinggi' ? 'bg-orange-100 text-orange-800 font-medium' :
                        task.priority === 'Sedang' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      {task.assignee || 'Belum ditugaskan'}
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-500">
                      <div>Mulai: {task.startDate || '-'}</div>
                      <div className="text-red-700 font-semibold mt-1">Batas: {task.dueDate || '-'}</div>
                    </td>
                    <td className="py-4 px-6 text-xs">
                      {task.driveFileUrl ? (
                        <a 
                          href={task.driveFileUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-bold bg-emerald-50 px-2.5 py-1 rounded-lg"
                        >
                          <Paperclip size={12} />
                          <span className="max-w-[120px] truncate">{task.driveFileName || 'Unduh Berkas'}</span>
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-gray-400">Tidak ada lampiran</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(task)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title={isAdmin ? "Edit Tugas" : "Lihat Detail"}
                        >
                          <Edit size={16} />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDelete(task.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Tugas"
                          >
                            <Trash2 size={16} />
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
              Menampilkan {Math.min(sortedTasks.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(sortedTasks.length, currentPage * itemsPerPage)} dari {sortedTasks.length} data
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

      {/* Add / Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs" id="task-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="p-6 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">
                {editingTask ? (isAdmin ? 'Perbarui Konfigurasi Tugas' : 'Detail Konfigurasi Tugas') : 'Registrasi Tugas Baru'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Guest Report Banner if task originated from Guest Portal */}
              {editingTask && (editingTask.source === 'guest' || editingTask.ticketNumber || editingTask.reporterName) && (
                <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-amber-500 text-white rounded-lg">
                        <AlertTriangle size={14} />
                      </span>
                      <span className="font-extrabold text-amber-900 uppercase tracking-wider text-[11px]">
                        Laporan Pengaduan Tamu / Publik
                      </span>
                    </div>
                    {editingTask.ticketNumber && (
                      <span className="font-mono font-black text-emerald-700 bg-white px-2.5 py-0.5 rounded-md border border-amber-200">
                        Tiket: #{editingTask.ticketNumber}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Nama Pelapor:</span>
                      <span className="font-bold text-slate-900 text-sm">{editingTask.reporterName || '-'}</span>
                      {editingTask.reporterUnit && (
                        <span className="text-slate-500 text-[11px] block">Asal: {editingTask.reporterUnit}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Kontak Pelapor:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-slate-900">{editingTask.reporterContact || '-'}</span>
                        {editingTask.reporterContact && (
                          <a
                            href={`https://wa.me/${editingTask.reporterContact.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Phone size={10} />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Status Aset:</span>
                      <span className={`font-bold ${editingTask.isUntagged ? 'text-rose-700' : 'text-slate-900'}`}>
                        {editingTask.isUntagged 
                          ? '⚠️ Belum Di-tagging (Diinput Manual oleh Tamu)' 
                          : (editingTask.assetCode || 'Terdaftar')}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Lokasi Terlaporkan:</span>
                      <span className="font-semibold text-slate-800">
                        {editingTask.locationArea || '-'} {editingTask.locationDetail ? `(${editingTask.locationDetail})` : ''}
                      </span>
                    </div>
                  </div>

                  {editingTask.photoUrl && (
                    <div className="pt-2 border-t border-amber-200/60">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1.5">Foto Bukti Kerusakan dari Pelapor:</span>
                      <div className="relative inline-block border-2 border-amber-300 rounded-xl overflow-hidden group">
                        <img 
                          src={editingTask.photoUrl} 
                          alt="Foto Laporan Tamu" 
                          className="h-28 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewPhotoUrl(editingTask.photoUrl || null)}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoUrl(editingTask.photoUrl || null)}
                          className="absolute inset-0 bg-black/40 text-white flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold cursor-pointer"
                        >
                          <Eye size={14} />
                          <span>Perbesar Foto</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <fieldset disabled={!isAdmin} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Judul Pekerjaan / Tugas *</label>
                  <input 
                    type="text" 
                    required
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="Contoh: Perbaikan Pipa Sektor 4"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Deskripsi Detail Pekerjaan</label>
                  <textarea 
                    rows={3}
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Tuliskan keluhan atau petunjuk lengkap pengerjaan..."
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Kategori Pekerjaan</label>
                  <select 
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as UserTask['category'])}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="Umum">Umum</option>
                    <option value="Fixed Asset">Fixed Asset</option>
                    <option value="Satwa">Satwa</option>
                    <option value="CCTV">CCTV</option>
                    <option value="MEP">MEP</option>
                    <option value="Museum">Museum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Penanggung Jawab / Staff</label>
                  <input 
                    type="text" 
                    value={formAssignee}
                    onChange={e => setFormAssignee(e.target.value)}
                    placeholder="Nama / Email Staff"
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Tanggal Mulai</label>
                  <input 
                    type="date" 
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Batas Waktu (Due Date)</label>
                  <input 
                    type="date" 
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Prioritas Kerja</label>
                  <select 
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as UserTask['priority'])}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="Rendah">Rendah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Status Pekerjaan</label>
                  <select 
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as UserTask['status'])}
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
                  >
                    <option value="Belum Dimulai">Belum Dimulai</option>
                    <option value="Sedang Berjalan">Sedang Berjalan</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Ditunda">Ditunda</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Catatan Tambahan / Hasil Pekerjaan</label>
                  <textarea 
                    rows={2}
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Keterangan tindakan yang sudah dilakukan atau hambatan di lapangan..."
                    className="w-full p-2.5 bg-slate-50 rounded-xl focus:outline-none text-sm"
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

              </fieldset>

              {/* Modal Footer */}
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  {isAdmin ? 'Batal' : 'Tutup'}
                </button>
                {isAdmin && (
                  <button 
                    type="submit"
                    className="px-5 py-2 text-white font-semibold rounded-xl text-sm shadow-md transition-colors cursor-pointer"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {editingTask ? 'Perbarui Tugas' : 'Simpan Tugas'}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Task Report Generator & PDF Download Modal */}
      <TaskReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        tasks={tasks}
        theme={theme}
        userEmail={userEmail}
      />

      {/* Guest Report Public Link Modal */}
      {isGuestLinkModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Portal Pengaduan & Laporan Tamu</h3>
                  <p className="text-xs text-slate-500">Akses publik mandiri tanpa perlu login</p>
                </div>
              </div>
              <button
                onClick={() => setIsGuestLinkModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Tautan Akses Formulir Laporan Tamu:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/?mode=guest-report`}
                  className="w-full text-xs font-mono bg-white p-2.5 rounded-lg border border-slate-200 select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?mode=guest-report`);
                    setCopiedGuestLink(true);
                    setTimeout(() => setCopiedGuestLink(false), 2500);
                  }}
                  className="px-3 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedGuestLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedGuestLink ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800">Fitur & Ketentuan Akses Tamu:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-500 pl-1">
                <li>Tamu hanya dapat menginput laporan kerusakan, pemindahan, atau kendala fasilitas.</li>
                <li>Tamu tidak memiliki akses membaca data aset atau fitur sistem lainnya.</li>
                <li>Mendukung opsi <strong>Input Manual</strong> jika aset belum di-tagging / tanpa kode QR.</li>
                <li>Setiap laporan langsung otomatis tercatat di tabel <strong>Task Monitoring</strong> ini.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <a
                href="/?mode=guest-report"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
              >
                <ExternalLink size={13} />
                <span>Buka Formulir di Tab Baru</span>
              </a>

              <button
                onClick={() => setIsGuestLinkModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Photo Preview Lightbox */}
      {previewPhotoUrl && (
        <div 
          className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4 backdrop-blur-sm cursor-pointer"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-black rounded-2xl overflow-hidden shadow-2xl p-2" onClick={e => e.stopPropagation()}>
            <img 
              src={previewPhotoUrl} 
              alt="Bukti Foto Pelapor" 
              className="max-w-full max-h-[80vh] object-contain mx-auto rounded-lg"
            />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
