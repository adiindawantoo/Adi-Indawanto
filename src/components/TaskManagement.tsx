import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Paperclip,
  Upload,
  Loader2,
  ExternalLink,
  ArrowUpDown,
  Tag
} from 'lucide-react';
import { UserTask, AppTheme } from '../types';
import { exportToExcel } from '../lib/excel';
import ImportDataPanel from './ImportDataPanel';

interface TaskManagementProps {
  tasks: UserTask[];
  onAddTask: (task: Omit<UserTask, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateTask: (id: string, task: Partial<UserTask>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  isAdmin?: boolean;
  googleAccessToken: string | null;
  theme: AppTheme;
}

export default function TaskManagement({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  isAdmin = true,
  googleAccessToken,
  theme
}: TaskManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [priorityFilter, setPriorityFilter] = useState('Semua');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Sorting & Pagination States
  const [sortColumn, setSortColumn] = useState<string>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
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
    
    const matchesStatus = statusFilter === 'Semua' || task.status === statusFilter;
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
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            >
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
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
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
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
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
              className="w-full py-2 px-3 bg-slate-50 text-gray-700 rounded-xl text-sm focus:outline-none"
            >
              <option value="title">Judul Tugas</option>
              <option value="category">Kategori</option>
              <option value="priority">Prioritas</option>
              <option value="status">Status</option>
              <option value="dueDate">Due Date</option>
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

      {/* Task List/Table - completely borderless wrapper */}
      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.015)] overflow-hidden" id="tasks-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Tugas / Kategori</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Prioritas</th>
                <th className="py-4 px-6">Penanggung Jawab</th>
                <th className="py-4 px-6">Tenggat Waktu</th>
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
                        <div className="font-semibold text-gray-900 text-sm">{task.title}</div>
                        <div className="text-xs text-gray-400 mt-1 line-clamp-1">{task.description || 'Tidak ada deskripsi'}</div>
                        <div className="mt-2 flex items-center gap-1">
                          <Tag size={12} className="text-gray-400" />
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {task.category}
                          </span>
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
    </div>
  );
}
