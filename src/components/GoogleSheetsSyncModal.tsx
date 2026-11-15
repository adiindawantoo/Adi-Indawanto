import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink, 
  Plus, 
  Link2, 
  AlertCircle, 
  X,
  FileCheck,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { FixedAsset, AppTheme } from '../types';
import { 
  getSavedSheetsConfig, 
  saveSheetsConfig, 
  createTmiiSpreadsheet, 
  syncFixedAssetsToSheet,
  GoogleSheetsConfig 
} from '../lib/googleSheetsService';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  fixedAssets: FixedAsset[];
  googleAccessToken: string | null;
  theme: AppTheme;
  onRefreshAuth?: () => Promise<string | null>;
}

export default function GoogleSheetsSyncModal({
  isOpen,
  onClose,
  fixedAssets,
  googleAccessToken,
  theme,
  onRefreshAuth,
}: GoogleSheetsSyncModalProps) {
  const [activeToken, setActiveToken] = useState<string | null>(googleAccessToken);
  const [config, setConfig] = useState<GoogleSheetsConfig>(getSavedSheetsConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [manualInputId, setManualInputId] = useState('');
  const [isManualInputMode, setIsManualInputMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    setActiveToken(googleAccessToken);
  }, [googleAccessToken]);

  useEffect(() => {
    if (isOpen) {
      setConfig(getSavedSheetsConfig());
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Ekstrak spreadsheet ID jika user paste link lengkap
  const parseSpreadsheetId = (input: string) => {
    const trimmed = input.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : trimmed;
  };

  const ensureToken = async (): Promise<string | null> => {
    if (activeToken) return activeToken;
    if (onRefreshAuth) {
      setIsAuthorizing(true);
      setStatusMessage({ text: 'Menghubungkan otorisasi Google...', type: 'info' });
      try {
        const token = await onRefreshAuth();
        if (token) {
          setActiveToken(token);
          setStatusMessage(null);
          return token;
        }
      } catch (err: any) {
        setStatusMessage({ text: 'Otorisasi Google tidak berhasil diselesaikan.', type: 'error' });
      } finally {
        setIsAuthorizing(false);
      }
    }
    return null;
  };

  // 1. Buat Spreadsheet Baru Otomatis
  const handleCreateNewSpreadsheet = async () => {
    const token = await ensureToken();
    if (!token) {
      setStatusMessage({
        text: 'Izin akun Google diperlukan untuk membuat file Spreadsheet. Harap lakukan otorisasi.',
        type: 'error',
      });
      return;
    }

    setIsCreating(true);
    setStatusMessage({ text: 'Sedang membuat spreadsheet baru di Google Drive Anda...', type: 'info' });

    try {
      const created = await createTmiiSpreadsheet(token);
      const newConfig = saveSheetsConfig({
        spreadsheetId: created.spreadsheetId,
        spreadsheetUrl: created.spreadsheetUrl,
        spreadsheetTitle: 'TMII - Database Terpadu Aset Tetap',
      });
      setConfig(newConfig);

      // Otomatis sinkronkan aset ke sheet yang baru dibuat
      setStatusMessage({ text: 'Spreadsheet berhasil dibuat! Mengunggah baris data aset...', type: 'info' });
      const syncResult = await syncFixedAssetsToSheet(created.spreadsheetId, fixedAssets, token);
      
      setConfig(saveSheetsConfig({
        lastSyncedAt: syncResult.timestamp,
        lastSyncedCount: syncResult.updatedRows,
      }));

      setStatusMessage({
        text: `Berhasil! Spreadsheet baru telah dibuat dan ${syncResult.updatedRows} aset tetap tersinkronisasi.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error creating spreadsheet:', err);
      setStatusMessage({
        text: err?.message || 'Gagal membuat Google Spreadsheet. Periksa koneksi atau izin Google akun Anda.',
        type: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // 2. Hubungkan Spreadsheet Manual via ID/URL
  const handleConnectManualSpreadsheet = async () => {
    const cleanId = parseSpreadsheetId(manualInputId);
    if (!cleanId) {
      setStatusMessage({ text: 'Masukkan ID atau Link Spreadsheet yang valid.', type: 'error' });
      return;
    }

    const token = await ensureToken();
    if (!token) {
      setStatusMessage({ text: 'Sesi Google Anda belum aktif. Harap otorisasi akun Google Anda.', type: 'error' });
      return;
    }

    setIsSyncing(true);
    setStatusMessage({ text: 'Menghubungkan ke spreadsheet dan mengunggah data...', type: 'info' });

    try {
      const syncResult = await syncFixedAssetsToSheet(cleanId, fixedAssets, token);
      const updated = saveSheetsConfig({
        spreadsheetId: cleanId,
        spreadsheetUrl: syncResult.spreadsheetUrl,
        lastSyncedAt: syncResult.timestamp,
        lastSyncedCount: syncResult.updatedRows,
      });
      setConfig(updated);
      setIsManualInputMode(false);
      setStatusMessage({
        text: `Berhasil terhubung! ${syncResult.updatedRows} aset telah tersinkronisasi ke Google Sheets.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error connecting manual sheet:', err);
      setStatusMessage({
        text: err?.message || 'Gagal menyinkronkan ke Spreadsheet tersebut. Pastikan ID benar dan akun Google Anda memiliki hak edit.',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Sinkronkan Ulang Sekarang (Manual Trigger)
  const handleSyncNow = async () => {
    if (!config.spreadsheetId) {
      setStatusMessage({ text: 'Belum ada Spreadsheet yang terhubung. Buat baru atau tautkan ID terlebih dahulu.', type: 'error' });
      return;
    }

    const token = await ensureToken();
    if (!token) {
      setStatusMessage({ text: 'Sesi Google Anda belum aktif. Harap otorisasi akun Google Anda.', type: 'error' });
      return;
    }

    // Explicit confirmation dialog as required by Workspace guidelines for mutating spreadsheet data
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin memperbarui Google Sheets dengan ${fixedAssets.length} data aset tetap saat ini? Seluruh baris di sheet 'Aset Tetap' akan diselaraskan.`
    );
    if (!confirmed) return;

    setIsSyncing(true);
    setStatusMessage({ text: `Menyinkronkan ${fixedAssets.length} data aset tetap ke Google Sheets...`, type: 'info' });

    try {
      const syncResult = await syncFixedAssetsToSheet(config.spreadsheetId, fixedAssets, token);
      const updated = saveSheetsConfig({
        lastSyncedAt: syncResult.timestamp,
        lastSyncedCount: syncResult.updatedRows,
      });
      setConfig(updated);
      setStatusMessage({
        text: `Sinkronisasi selesai! ${syncResult.updatedRows} baris aset tetap berhasil diperbarui di Google Sheets.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Error syncing to sheet:', err);
      setStatusMessage({
        text: err?.message || 'Gagal menyinkronkan data ke Google Sheets.',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-xl bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/80 overflow-hidden flex flex-col apple-liquid-rim"
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-xs">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 font-display">
                  Sinkronisasi Google Sheets
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live Cloud
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Pencadangan dan sinkronisasi database aset tetap ke Google Drive Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Status Message Alert */}
          <AnimatePresence>
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : statusMessage.type === 'error'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                {statusMessage.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
                {statusMessage.type === 'error' && <AlertCircle size={16} className="text-red-600 shrink-0" />}
                {statusMessage.type === 'info' && <RefreshCw size={16} className="text-blue-600 animate-spin shrink-0" />}
                <span>{statusMessage.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Authorization Notice if activeToken is missing */}
          {!activeToken && (
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-blue-900">Izin Akses Google Sheets</h5>
                  <p className="text-[11px] text-blue-700 font-medium">Hubungkan akun Google Anda untuk mengizinkan aplikasi menulis data ke Google Drive.</p>
                </div>
              </div>
              {onRefreshAuth && (
                <button
                  type="button"
                  onClick={async () => {
                    await ensureToken();
                  }}
                  disabled={isAuthorizing}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-60"
                >
                  {isAuthorizing ? 'Menghubungkan...' : 'Beri Izin Google'}
                </button>
              )}
            </div>
          )}

          {/* Current Connected Spreadsheet Card */}
          {config.spreadsheetId ? (
            <div className="apple-glass-card rounded-2xl p-4.5 border border-white/90 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-700">
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">
                      Spreadsheet Terhubung
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      {config.spreadsheetTitle}
                    </h4>
                  </div>
                </div>
                {config.spreadsheetUrl && (
                  <a
                    href={config.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    <span>Buka Sheet</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block text-[10px]">Terakhir Disinkron:</span>
                  <span className="font-bold text-slate-700">
                    {config.lastSyncedAt || 'Belum pernah'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[10px]">Baris Aset di Sheet:</span>
                  <span className="font-bold text-emerald-700">
                    {config.lastSyncedCount} Data Aset
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualInputMode(!isManualInputMode)}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  {isManualInputMode ? 'Batal Ganti' : 'Ganti Spreadsheet Target'}
                </button>
                <span className="text-[10px] text-slate-400 font-mono">
                  ID: {config.spreadsheetId.substring(0, 12)}...
                </span>
              </div>
            </div>
          ) : (
            /* Empty State: Not connected yet */
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Belum Ada Google Spreadsheet Tertaut
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Pilih salah satu cara di bawah untuk mulai menyimpan salinan data aset tetap Anda ke Google Drive secara aman.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCreateNewSpreadsheet}
                  disabled={isCreating}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  <Plus size={15} />
                  <span>{isCreating ? 'Membuat Spreadsheet...' : 'Buat Spreadsheet Otomatis'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualInputMode(!isManualInputMode)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl apple-glass-pill text-slate-700 text-xs font-bold flex items-center justify-center gap-2 border border-slate-200 hover:bg-white transition-all cursor-pointer"
                >
                  <Link2 size={15} />
                  <span>Tautkan File Eksisting</span>
                </button>
              </div>
            </div>
          )}

          {/* Manual Input Form */}
          {isManualInputMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
            >
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Masukkan ID atau URL Google Spreadsheet:
                </label>
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/1A2B3C.../edit"
                  value={manualInputId}
                  onChange={(e) => setManualInputId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tips: Anda bisa langsung copy paste URL dari address bar browser saat membuka spreadsheet Anda.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualInputMode(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConnectManualSpreadsheet}
                  disabled={isSyncing || !manualInputId.trim()}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSyncing ? 'Menghubungkan...' : 'Simpan & Sinkronkan'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Real-time sync summary */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck size={16} className="text-amber-700 shrink-0" />
              <span>Keamanan & Kemandirian Data</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Sinkronisasi ini langsung menulis ke Google Drive pribadi/organisasi Anda. Data aset di spreadsheet tersusun rapi per kolom lengkap dengan kode aset, nilai perolehan, depresiasi, dan lokasi, siap dicetak atau diunduh ke Excel kapan saja.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Total siap kirim: <strong className="text-slate-900 font-extrabold">{fixedAssets.length} Aset Tetap</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing || !config.spreadsheetId}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-2 shadow-md hover:scale-102 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Sedang Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
