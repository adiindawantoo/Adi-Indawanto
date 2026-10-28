import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ClipboardList, 
  Camera, 
  Settings2, 
  Activity, 
  Archive,
  AlertTriangle,
  CheckCircle,
  Database,
  Heart,
  ShieldCheck,
  TrendingUp,
  QrCode,
  FileText,
  Layers,
  Zap,
  Wrench,
  Plus,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
  BarChart3,
  Cpu,
  Stethoscope,
  MapPin,
  Maximize2
} from 'lucide-react';
import { UserTask, FixedAsset, AnimalAsset, CctvAsset, MepAsset, MuseumCollection, AppTheme } from '../types';

interface DashboardProps {
  tasks: UserTask[];
  fixedAssets: FixedAsset[];
  animals: AnimalAsset[];
  cctvs: CctvAsset[];
  meps: MepAsset[];
  museumCollections: MuseumCollection[];
  setActiveTab: (tab: string) => void;
  theme: AppTheme;
}

export default function Dashboard({
  tasks,
  fixedAssets,
  animals,
  cctvs,
  meps,
  museumCollections,
  setActiveTab,
  theme
}: DashboardProps) {
  const [dashboardView, setDashboardView] = useState<'bento' | 'analytics'>('bento');
  const [activeDepartment, setActiveDepartment] = useState<string>('semua');

  // Calculations for Task Stats
  const completedTasks = tasks.filter(t => t.status === 'Selesai').length;
  const pendingTasks = tasks.length - completedTasks;
  const taskProgress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  // Asset Condition Stats
  const goodConditionAssets = fixedAssets.filter(a => a.condition === 'Baik').length;
  const assetProgress = fixedAssets.length ? Math.round((goodConditionAssets / fixedAssets.length) * 100) : 0;

  // Animal Health Stats
  const healthyAnimals = animals.filter(a => a.healthStatus === 'Sehat').length;
  const animalProgress = animals.length ? Math.round((healthyAnimals / animals.length) * 100) : 0;

  // CCTV Status
  const activeCctvs = cctvs.filter(c => c.status === 'Aktif').length;
  const cctvProgress = cctvs.length ? Math.round((activeCctvs / cctvs.length) * 100) : 0;

  // MEP Status
  const normalMeps = meps.filter(m => m.status === 'Normal').length;
  const mepProgress = meps.length ? Math.round((normalMeps / meps.length) * 100) : 0;

  // Museum Condition
  const intactMuseum = museumCollections.filter(m => m.condition === 'Utuh').length;
  const museumProgress = museumCollections.length ? Math.round((intactMuseum / museumCollections.length) * 100) : 0;

  // Urgent Issues across domains
  const urgentTasks = tasks.filter(t => t.priority === 'Urgent' && t.status !== 'Selesai');
  const sickAnimals = animals.filter(a => a.healthStatus === 'Sakit' || a.healthStatus === 'Dalam Perawatan');
  const brokenCctvs = cctvs.filter(c => c.status === 'Rusak' || c.status === 'Mati');
  const problemMeps = meps.filter(m => m.status === 'Bermasalah' || m.status === 'Mati Total');

  const totalUrgentCount = urgentTasks.length + sickAnimals.length + brokenCctvs.length + problemMeps.length;

  // Recent Activity Feed
  const recentTasks = tasks
    .filter(t => t.status !== 'Selesai')
    .slice(0, 5);

  const isDarkMode = theme?.id === 'dark';

  // Styling helpers
  const cardBg = isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-900 shadow-xs';
  const subCardBg = isDarkMode ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-50/80 border-slate-200/60';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const subHeader = isDarkMode ? 'text-slate-300' : 'text-slate-700';

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* HEADER SECTION WITH VIEW SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Pusat Kendali Utama
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            Integrated Dashboard
          </h1>
          <p className="text-xs text-slate-300 max-w-xl">
            Sistem terintegrasi pengawasan aset, pemeliharaan satwa, CCTV, utilitas MEP, dan koleksi museum kawasan.
          </p>
        </div>

        {/* View Variant Toggle Buttons */}
        <div className="flex items-center bg-slate-900/80 p-1.5 rounded-xl border border-slate-700/80 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setDashboardView('bento')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              dashboardView === 'bento'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers size={14} />
            <span>General</span>
          </button>

          <button
            onClick={() => setDashboardView('analytics')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              dashboardView === 'analytics'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 size={14} />
            <span>Analitik & Grafik</span>
          </button>
        </div>
      </div>

      {/* RENDER VIEW VARIANT 1: BENTO HUB (DEFAULT EXECUTIVE GRID) */}
      {dashboardView === 'bento' && (
        <motion.div 
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* TOP SUMMARY CARDS (DOMAIN OVERVIEW) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* Task Card */}
            <div 
              onClick={() => setActiveTab('tasks')}
              className={`${cardBg} p-4 rounded-2xl border hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Tugas</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <ClipboardList size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight">{pendingTasks}</div>
                <div className={`text-[11px] font-medium ${textMuted} mt-0.5`}>Pending dari {tasks.length}</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                <span className={textMuted}>Selesai</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{taskProgress}%</span>
              </div>
            </div>

            {/* Fixed Asset Card */}
            <div 
              onClick={() => setActiveTab('fixed-assets')}
              className={`${cardBg} p-4 rounded-2xl border hover:border-blue-500/50 transition-all cursor-pointer group flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Aset Tetap</span>
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Database size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight">{goodConditionAssets}</div>
                <div className={`text-[11px] font-medium ${textMuted} mt-0.5`}>Kondisi Baik dari {fixedAssets.length}</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                <span className={textMuted}>Kondisi Baik</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{assetProgress}%</span>
              </div>
            </div>

            {/* Animal Card */}
            <div 
              onClick={() => setActiveTab('animals')}
              className={`${cardBg} p-4 rounded-2xl border hover:border-rose-500/50 transition-all cursor-pointer group flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Satwa</span>
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 group-hover:scale-110 transition-transform">
                  <Heart size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight">{healthyAnimals}</div>
                <div className={`text-[11px] font-medium ${textMuted} mt-0.5`}>Sehat dari {animals.length} ekor</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                <span className={textMuted}>Kesehatan</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{animalProgress}%</span>
              </div>
            </div>

            {/* CCTV Card */}
            <div 
              onClick={() => setActiveTab('cctv')}
              className={`${cardBg} p-4 rounded-2xl border hover:border-amber-500/50 transition-all cursor-pointer group flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>CCTV Live</span>
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <Camera size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight">{activeCctvs}</div>
                <div className={`text-[11px] font-medium ${textMuted} mt-0.5`}>Aktif dari {cctvs.length} titik</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                <span className={textMuted}>Sistem Online</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{cctvProgress}%</span>
              </div>
            </div>

            {/* MEP Card */}
            <div 
              onClick={() => setActiveTab('mep')}
              className={`${cardBg} p-4 rounded-2xl border hover:border-violet-500/50 transition-all cursor-pointer group flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Utilitas MEP</span>
                <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400 group-hover:scale-110 transition-transform">
                  <Settings2 size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight">{normalMeps}</div>
                <div className={`text-[11px] font-medium ${textMuted} mt-0.5`}>Normal dari {meps.length} unit</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                <span className={textMuted}>Keandalan</span>
                <span className="font-bold text-violet-600 dark:text-violet-400">{mepProgress}%</span>
              </div>
            </div>

            {/* Museum Card */}
            <div 
              onClick={() => setActiveTab('museum')}
              className={`${cardBg} p-4 rounded-2xl border hover:border-cyan-500/50 transition-all cursor-pointer group flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>Museum</span>
                <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                  <Archive size={16} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight">{museumCollections.length}</div>
                <div className={`text-[11px] font-medium ${textMuted} mt-0.5`}>{intactMuseum} koleksi utuh</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                <span className={textMuted}>Terawat</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">{museumProgress}%</span>
              </div>
            </div>

          </div>

          {/* BENTO GRID CONTENT SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* MAIN LEFT COLUMN (8 COLS) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* URGENT ATENTION / ALERTS HUB */}
              <div className={`${cardBg} p-5 rounded-2xl border`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm tracking-tight">Atensi & Perhatian Operasional</h3>
                      <p className={`text-[11px] ${textMuted}`}>Item kritis yang membutuhkan tindakan penanganan segera</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20">
                    {totalUrgentCount} Isu Aktif
                  </span>
                </div>

                {totalUrgentCount > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    {urgentTasks.length > 0 && (
                      <div 
                        onClick={() => setActiveTab('tasks')}
                        className={`p-3.5 rounded-xl border cursor-pointer hover:border-amber-500/40 transition-all ${subCardBg}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-rose-500 uppercase">Tugas Priority Urgent</span>
                          <span className="text-xs font-black">{urgentTasks.length}</span>
                        </div>
                        <p className={`text-xs font-medium truncate ${subHeader}`}>{urgentTasks[0].title}</p>
                        <span className={`text-[10px] ${textMuted} block mt-1`}>PIC: {urgentTasks[0].assignee || 'Belum ditugaskan'}</span>
                      </div>
                    )}

                    {sickAnimals.length > 0 && (
                      <div 
                        onClick={() => setActiveTab('animals')}
                        className={`p-3.5 rounded-xl border cursor-pointer hover:border-amber-500/40 transition-all ${subCardBg}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-rose-500 uppercase">Satwa Sakit / Perawatan</span>
                          <span className="text-xs font-black">{sickAnimals.length}</span>
                        </div>
                        <p className={`text-xs font-medium truncate ${subHeader}`}>{sickAnimals[0].name} ({sickAnimals[0].species})</p>
                        <span className={`text-[10px] ${textMuted} block mt-1`}>Status: {sickAnimals[0].healthStatus}</span>
                      </div>
                    )}

                    {brokenCctvs.length > 0 && (
                      <div 
                        onClick={() => setActiveTab('cctv')}
                        className={`p-3.5 rounded-xl border cursor-pointer hover:border-amber-500/40 transition-all ${subCardBg}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-amber-500 uppercase">CCTV Offline / Rusak</span>
                          <span className="text-xs font-black">{brokenCctvs.length}</span>
                        </div>
                        <p className={`text-xs font-medium truncate ${subHeader}`}>{brokenCctvs[0].name}</p>
                        <span className={`text-[10px] ${textMuted} block mt-1`}>Lokasi: {brokenCctvs[0].location}</span>
                      </div>
                    )}

                    {problemMeps.length > 0 && (
                      <div 
                        onClick={() => setActiveTab('mep')}
                        className={`p-3.5 rounded-xl border cursor-pointer hover:border-amber-500/40 transition-all ${subCardBg}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-amber-500 uppercase">Utilitas MEP Bermasalah</span>
                          <span className="text-xs font-black">{problemMeps.length}</span>
                        </div>
                        <p className={`text-xs font-medium truncate ${subHeader}`}>{problemMeps[0].name}</p>
                        <span className={`text-[10px] ${textMuted} block mt-1`}>Lokasi: {problemMeps[0].location}</span>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className={`p-6 rounded-xl border text-center ${subCardBg}`}>
                    <CheckCircle className="mx-auto text-emerald-500 mb-2" size={24} />
                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Seluruh Aset & Sistem Normal</h4>
                    <p className={`text-[11px] ${textMuted} mt-0.5`}>Tidak ada isu kritis atau kerusakan mendesak yang terdeteksi saat ini.</p>
                  </div>
                )}
              </div>

              {/* RECENT TASKS & MAINTENANCE FEED */}
              <div className={`${cardBg} p-5 rounded-2xl border`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-black text-sm tracking-tight">Status Penugasan & Pemeliharaan Terbaru</h3>
                    <p className={`text-[11px] ${textMuted}`}>Daftar tugas pemeliharaan lapangan terkini</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('tasks')}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Lihat Semua</span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {recentTasks.map(task => (
                    <div 
                      key={task.id}
                      onClick={() => setActiveTab('tasks')}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${subCardBg}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                            task.priority === 'Urgent' ? 'bg-rose-500/20 text-rose-500' :
                            task.priority === 'Tinggi' ? 'bg-amber-500/20 text-amber-500' :
                            'bg-slate-500/20 text-slate-500'
                          }`}>
                            {task.priority}
                          </span>
                          <span className={`text-[11px] font-semibold truncate ${subHeader}`}>{task.title}</span>
                        </div>
                        <div className={`text-[10px] ${textMuted} mt-1 flex items-center gap-3`}>
                          <span>Kategori: {task.category}</span>
                          <span>•</span>
                          <span>Petugas: {task.assignee || 'Unassigned'}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          task.status === 'Sedang Berjalan' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-500'
                        }`}>
                          {task.status}
                        </span>
                        <span className={`text-[10px] ${textMuted} block mt-1`}>{task.dueDate ? `Tenggat: ${task.dueDate}` : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT SIDEBAR COLUMN (4 COLS) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* QUICK FEATURE LAUNCHPAD */}
              <div className={`${cardBg} p-5 rounded-2xl border space-y-3`}>
                <h3 className="font-black text-sm tracking-tight flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" />
                  <span>Akses Modul Aset Tetap</span>
                </h3>

                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('fixed-assets-locations')}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer ${subCardBg} border-blue-500/30 bg-blue-50/20`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-blue-900 dark:text-blue-300">Peta Interaktif Sebaran Aset</div>
                        <div className={`text-[10px] ${textMuted}`}>Visualisasi GIS titik koordinat & GPS TMII</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className={textMuted} />
                  </button>

                  <button
                    onClick={() => setActiveTab('fixed-assets-tagging')}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer ${subCardBg}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <QrCode size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Cetak Label Tagging QR</div>
                        <div className={`text-[10px] ${textMuted}`}>Generate sticker barcode & QR code</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className={textMuted} />
                  </button>

                  <button
                    onClick={() => setActiveTab('fixed-assets-mutation')}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer ${subCardBg}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                        <FileText size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Dokumen Mutasi BAST Aset</div>
                        <div className={`text-[10px] ${textMuted}`}>Berita acara serah terima & perindahan</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className={textMuted} />
                  </button>

                  <button
                    onClick={() => setActiveTab('fixed-assets-opname')}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer ${subCardBg}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                        <Layers size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Stock Opname Inventaris</div>
                        <div className={`text-[10px] ${textMuted}`}>Audit fisik & rekonsiliasi data aset</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className={textMuted} />
                  </button>
                </div>
              </div>

              {/* OVERALL READINESS INDEX CARD */}
              <div className={`${cardBg} p-5 rounded-2xl border space-y-4`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm tracking-tight">Indeks Kesiapan Kawasan</h3>
                  <ShieldCheck size={18} className="text-emerald-500" />
                </div>

                <div className="space-y-3">
                  {/* Readiness Progress Bar */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className={textMuted}>Rata-rata Kondisi Sistem</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {Math.round((assetProgress + animalProgress + cctvProgress + mepProgress + museumProgress) / 5)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((assetProgress + animalProgress + cctvProgress + mepProgress + museumProgress) / 5)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                    <div className={`p-2 rounded-lg border ${subCardBg}`}>
                      <span className={`${textMuted} block`}>Total Unit Aset</span>
                      <span className="font-bold text-xs">{fixedAssets.length + animals.length + cctvs.length + meps.length + museumCollections.length} Item</span>
                    </div>
                    <div className={`p-2 rounded-lg border ${subCardBg}`}>
                      <span className={`${textMuted} block`}>Pekerjaan Selesai</span>
                      <span className="font-bold text-xs text-emerald-500">{completedTasks} Tugas</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </motion.div>
      )}

      {/* RENDER VIEW VARIANT 2: ANALYTICS & INSIGHTS (Charts & Ratio Analysis) */}
      {dashboardView === 'analytics' && (
        <motion.div 
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Condition Distribution Chart Card */}
            <div className={`${cardBg} p-6 rounded-2xl border space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm tracking-tight">Distribusi Kondisi Aset Tetap</h3>
                  <p className={`text-[11px] ${textMuted}`}>Persentase kondisi fisik inventaris sarana kawasan</p>
                </div>
                <BarChart3 size={18} className="text-blue-500" />
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Kondisi Baik</span>
                    <span className="text-emerald-500">{goodConditionAssets} Unit ({assetProgress}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: `${assetProgress}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Kondisi Rusak Ringan</span>
                    <span className="text-amber-500">
                      {fixedAssets.filter(a => a.condition === 'Rusak Ringan').length} Unit
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full" 
                      style={{ width: `${fixedAssets.length ? (fixedAssets.filter(a => a.condition === 'Rusak Ringan').length / fixedAssets.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Kondisi Rusak Berat</span>
                    <span className="text-rose-500">
                      {fixedAssets.filter(a => a.condition === 'Rusak Berat').length} Unit
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full" 
                      style={{ width: `${fixedAssets.length ? (fixedAssets.filter(a => a.condition === 'Rusak Berat').length / fixedAssets.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Kondisi Demolished</span>
                    <span className="text-slate-500">
                      {fixedAssets.filter(a => a.condition === 'Demolished').length} Unit
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-slate-500 h-full" 
                      style={{ width: `${fixedAssets.length ? (fixedAssets.filter(a => a.condition === 'Demolished').length / fixedAssets.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Health & Infrastructure Health Matrix */}
            <div className={`${cardBg} p-6 rounded-2xl border space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm tracking-tight">Kesehatan Satwa & Infrastruktur MEP</h3>
                  <p className={`text-[11px] ${textMuted}`}>Indikator stabilitas wahana fauna dan jaringan energi</p>
                </div>
                <Activity size={18} className="text-rose-500" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className={`p-4 rounded-xl border ${subCardBg} space-y-2`}>
                  <div className="text-[10px] uppercase font-bold text-rose-500">Kesehatan Satwa</div>
                  <div className="text-2xl font-black">{animalProgress}%</div>
                  <div className={`text-[11px] ${textMuted}`}>{healthyAnimals} dari {animals.length} ekor sehat</div>
                </div>

                <div className={`p-4 rounded-xl border ${subCardBg} space-y-2`}>
                  <div className="text-[10px] uppercase font-bold text-violet-500">Keandalan MEP</div>
                  <div className="text-2xl font-black">{mepProgress}%</div>
                  <div className={`text-[11px] ${textMuted}`}>{normalMeps} dari {meps.length} sistem normal</div>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      )}

    </div>
  );
}
