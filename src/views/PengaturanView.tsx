import { useConfirm } from '../components/ConfirmDialog';
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Sparkles, 
  Trash2, 
  Plus, 
  Database, 
  KeyRound, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  ShieldAlert, 
  Radio, 
  Unlink, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  RefreshCw,
  Link2,
  CalendarDays,
  X 
} from 'lucide-react';
import { AppState } from '../types';
import { buildInviteLink } from '../services/supabaseInvite';
import {
  testSupabaseConnection,
  getPeriodInfo,
  listSelectablePeriods,
  periodLabelOf,
  summarizePeriod,
  inspectCloudData,
  formatNumber,
  CloudInspectResult
} from '../services/storage';
import { DEFAULT_SUPABASE_CONFIG } from '../config/defaultSupabase';
import { PembagiHariControl } from '../components/PembagiHariControl';

interface PengaturanViewProps {
  state: AppState;
  onUpdateSupabase: (u: string, k: string, locked?: boolean) => void;
  onUpdatePins?: (adminPin: string, tkuPin: string) => void;
  onExportJson: () => void;
  onImportJson: (jsonState: AppState) => void;
  onResetDefault: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onUpdatePembagiHari?: () => void;
  onUpdateActiveDay?: (day: number) => void;
  onClearPjdHjd?: () => void;
  onManualSync?: () => void;
  onSwitchPeriod?: (periodKey: string) => void | Promise<void>;
  onBackupNow?: () => Promise<boolean>;
  isSyncing?: boolean;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({
  state,
  onUpdateSupabase,
  onUpdatePins,
  onExportJson,
  onImportJson,
  onResetDefault,
  showToast,
  onUpdatePembagiHari,
  onUpdateActiveDay,
  onClearPjdHjd,
  onManualSync,
  onSwitchPeriod,
  onBackupNow,
  isSyncing = false,
  syncStatus = 'idle'
}) => {
  const { ask, dialog } = useConfirm();
  const isLocked = Boolean(state.supabaseConfig?.locked);
  const [sbUrl, setSbUrl] = useState(state.supabaseConfig.u || '');
  const [sbKey, setSbKey] = useState(state.supabaseConfig.k || '');

  useEffect(() => {
    if (state.supabaseConfig?.u !== undefined) {
      setSbUrl(state.supabaseConfig.u);
    }
    if (state.supabaseConfig?.k !== undefined) {
      setSbKey(state.supabaseConfig.k);
    }
  }, [state.supabaseConfig?.u, state.supabaseConfig?.k]);
  const [isTestingSb, setIsTestingSb] = useState(false);
  const [sbTestResult, setSbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState(state.adminPin);
  const [tkuPinInput, setTkuPinInput] = useState(state.tkuPin);

  // ---- Bulan kerja ----
  const activePeriodKey = getPeriodInfo(state).key;
  const periodOptions = listSelectablePeriods(state);
  const [pickedPeriod, setPickedPeriod] = useState(activePeriodKey);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [cloudResult, setCloudResult] = useState<CloudInspectResult | null>(null);

  useEffect(() => {
    setPickedPeriod(activePeriodKey);
  }, [activePeriodKey]);

  // Konfirmasi pindah bulan memakai kotak di dalam aplikasi (bukan confirm() bawaan browser),
  // karena confirm() diblokir diam-diam di pratinjau/iframe sehingga tombol terasa "tidak bereaksi".
  const [switchConfirmMsg, setSwitchConfirmMsg] = useState<string | null>(null);

  const handleConfirmSwitch = () => {
    if (!onSwitchPeriod || pickedPeriod === activePeriodKey) return;
    const from = periodLabelOf(activePeriodKey);
    const to = periodLabelOf(pickedPeriod);
    const isKnown = (state.monthStore && state.monthStore[pickedPeriod]) || summarizePeriod(state, pickedPeriod).days > 0;
    const msg = isKnown
      ? `Pindah dari ${from} ke ${to}? Data ${from} disimpan dulu (perangkat + Supabase), lalu data ${to} dibuka kembali seperti terakhir disimpan.`
      : `Pindah dari ${from} ke ${to}? Data ${from} disimpan dulu (perangkat + Supabase). ${to} dibuka KOSONG: penjualan, BB, absen, JWP, dan input harian mulai dari 0. Target harian dibawa dari bulan sebelumnya dan bisa diubah di menu Target. Pindah ini berlaku untuk semua perangkat yang tersambung.`;
    setSwitchConfirmMsg(msg);
  };

  const handleRunSwitch = async () => {
    if (!onSwitchPeriod) return;
    setSwitchConfirmMsg(null);
    await onSwitchPeriod(pickedPeriod);
    setCloudResult(null);
  };

  const handleInspectCloud = async () => {
    setIsInspecting(true);
    const res = await inspectCloudData(state.supabaseConfig);
    setCloudResult(res);
    setIsInspecting(false);
  };

  const handleBackupAndInspect = async () => {
    if (!onBackupNow) return;
    setIsBackingUp(true);
    const ok = await onBackupNow();
    setIsBackingUp(false);
    if (ok) await handleInspectCloud();
  };

  const handleSaveSbAndLock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbUrl.trim() || !sbKey.trim()) {
      showToast('URL dan API Key tidak boleh kosong', 'error');
      return;
    }
    onUpdateSupabase(sbUrl.trim(), sbKey.trim(), true);
    setSbTestResult(null);
    showToast('Konfigurasi Supabase disimpan & DIKUNCI aman!', 'success');
  };

  const handleSaveSbUnlocked = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSupabase(sbUrl.trim(), sbKey.trim(), false);
    setSbTestResult(null);
    showToast('Konfigurasi Supabase berhasil disimpan (terbuka)', 'success');
  };

  const handleLockNow = () => {
    if (!state.supabaseConfig.u || !state.supabaseConfig.k) {
      showToast('Isi dan simpan kredensial terlebih dahulu sebelum mengunci', 'error');
      return;
    }
    onUpdateSupabase(state.supabaseConfig.u, state.supabaseConfig.k, true);
    showToast('Konfigurasi Supabase berhasil dikunci', 'success');
  };

  const handleUnlockWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockPin === state.adminPin) {
      onUpdateSupabase(state.supabaseConfig.u, state.supabaseConfig.k, false);
      setShowUnlockModal(false);
      setUnlockPin('');
      setUnlockError(false);
      showToast('Kunci konfigurasi Supabase berhasil dibuka', 'success');
    } else {
      setUnlockError(true);
      showToast('PIN Admin salah!', 'error');
    }
  };

  const handleClearSb = () => {
    if (isLocked) {
      showToast('Buka kunci konfigurasi terlebih dahulu untuk memutuskan cloud', 'error');
      return;
    }
    ask({
      title: 'Putuskan Database Cloud?',
      message: 'Apakah Anda yakin ingin menghapus konfigurasi Supabase dari perangkat ini?\nAplikasi akan beralih ke penyimpanan lokal (offline).',
      confirmLabel: 'Putuskan Cloud',
      tone: 'warning',
      onConfirm: () => {
        setSbUrl('');
        setSbKey('');
        setSbTestResult(null);
        onUpdateSupabase('', '', false);
        showToast('Konfigurasi Supabase dihapus (aplikasi memakai mode offline lokal)', 'info');
      }
    });
  };

  const handleTestSb = async () => {
    if (!sbUrl.trim() || !sbKey.trim()) {
      showToast('Masukkan Project URL dan Anon Key terlebih dahulu', 'error');
      return;
    }
    setIsTestingSb(true);
    setSbTestResult(null);
    const res = await testSupabaseConnection(sbUrl.trim(), sbKey.trim());
    setIsTestingSb(false);
    setSbTestResult(res);
    if (res.success) {
      showToast('Koneksi Supabase berhasil!', 'success');
    } else {
      showToast('Gagal terhubung ke Supabase', 'error');
    }
  };

  const handleSavePins = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPinInput.length < 4 || tkuPinInput.length < 4) {
      showToast('PIN minimal 4 digit angka', 'error');
      return;
    }
    if (onUpdatePins) {
      onUpdatePins(adminPinInput, tkuPinInput);
      showToast('PIN keamanan berhasil diperbarui', 'success');
    } else {
      showToast('Pengaturan PIN tidak aktif', 'info');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        onImportJson(parsed);
        showToast('Data aplikasi berhasil dipulihkan dari file cadangan!', 'success');
      } catch (err) {
        showToast('Format file JSON tidak valid', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Pengaturan
        </h1>
      </div>

      {/* Pengaturan Pembagi Hari & Tanggal Penjualan */}
      {/* 0. Bulan Kerja */}
      {onSwitchPeriod && (
        <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-brand-600" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Bulan Kerja</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={pickedPeriod}
              onChange={(e) => { setPickedPeriod(e.target.value); setSwitchConfirmMsg(null); }}
              className="w-full sm:w-72 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold"
            >
              {periodOptions.map(k => {
                const sum = summarizePeriod(state, k);
                const note = k === activePeriodKey ? 'aktif' : (sum.days > 0 ? `${sum.days} hari terisi` : 'kosong');
                return <option key={k} value={k}>{periodLabelOf(k)} ({note})</option>;
              })}
            </select>
            {pickedPeriod === activePeriodKey ? (
              <button
                onClick={handleBackupAndInspect}
                disabled={isBackingUp || isSyncing}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white transition-colors"
              >
                {isBackingUp ? 'Membackup...' : `Cadangkan Data ${periodLabelOf(pickedPeriod)}`}
              </button>
            ) : (
              <button
                onClick={handleConfirmSwitch}
                disabled={isSyncing}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white transition-colors"
              >
                Pindah ke {periodLabelOf(pickedPeriod)}
              </button>
            )}
          </div>
          {switchConfirmMsg && pickedPeriod !== activePeriodKey && (
            <div className="p-4 rounded-2xl border border-brand-200 dark:border-brand-900/50 bg-brand-50 dark:bg-brand-950/20 space-y-3">
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-relaxed">{switchConfirmMsg}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleRunSwitch}
                  disabled={isSyncing}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white transition-colors"
                >
                  Ya, pindah ke {periodLabelOf(pickedPeriod)}
                </button>
                <button
                  onClick={() => setSwitchConfirmMsg(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-neutral-300 dark:border-neutral-600 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
          {pickedPeriod === activePeriodKey && (
            <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-900/40 leading-relaxed">
              💡 <strong>Info Penting:</strong> Bulan {periodLabelOf(pickedPeriod)} adalah bulan kerja yang sedang <strong>aktif saat ini</strong> di aplikasi Anda. Anda tidak perlu pindah bulan kerja untuk mengelolanya.<br />
              - Untuk mencadangkan data bulan ini ke cloud Supabase, klik tombol <strong>"Cadangkan Data"</strong> di atas.<br />
              - Untuk menyimpan/mengarsipkan bulan September secara resmi sebagai arsip final bulanan, buka menu <strong>Arsip</strong> di sidebar kiri lalu klik tombol <strong>"Simpan Bulan Ini"</strong>.
            </div>
          )}

          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleInspectCloud}
                disabled={isInspecting}
                className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 text-xs font-semibold hover:bg-white dark:hover:bg-neutral-700 transition-colors"
              >
                {isInspecting ? 'Memeriksa...' : 'Cek isi Supabase'}
              </button>
              {onBackupNow && (
                <button
                  onClick={handleBackupAndInspect}
                  disabled={isBackingUp || isSyncing}
                  className="px-3 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  {isBackingUp ? 'Mengirim...' : 'Cadangkan sekarang'}
                </button>
              )}
            </div>

            {cloudResult && (
              cloudResult.ok ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-neutral-500">
                    Terakhir diperbarui di Supabase: {cloudResult.mainUpdatedAt ? new Date(cloudResult.mainUpdatedAt).toLocaleString('id-ID') : '-'}
                    {cloudResult.activePeriod ? ` · bulan kerja di cloud: ${periodLabelOf(cloudResult.activePeriod.slice(0, 7))}` : ''}
                  </p>
                  {cloudResult.months.length === 0 ? (
                    <p className="text-xs text-amber-700 dark:text-amber-300">Belum ada data harian bulan mana pun di Supabase.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-neutral-500">
                            <th className="py-1 pr-3 font-medium">Bulan</th>
                            <th className="py-1 pr-3 font-medium text-right">Hari terisi</th>
                            <th className="py-1 pr-3 font-medium text-right">Total botol</th>
                            <th className="py-1 pr-3 font-medium">Arsip</th>
                            <th className="py-1 font-medium">Cadangan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cloudResult.months.map(m => (
                            <tr key={m.key} className="border-t border-neutral-200 dark:border-neutral-700">
                              <td className="py-1 pr-3 font-semibold">{periodLabelOf(m.key)}</td>
                              <td className="py-1 pr-3 text-right">{m.days}</td>
                              <td className="py-1 pr-3 text-right">{formatNumber(m.total)}</td>
                              <td className="py-1 pr-3">{m.hasArchive ? 'ada' : 'belum'}</td>
                              <td className="py-1">{m.hasBackupRow ? 'ada' : 'belum'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-red-600 dark:text-red-400">{cloudResult.message}</p>
              )
            )}
          </div>
        </div>
      )}

      {onUpdatePembagiHari && (
        <PembagiHariControl
          state={state}
          onUpdatePembagiHari={onUpdatePembagiHari}
          onUpdateActiveDay={onUpdateActiveDay}
          variant="banner"
        />
      )}



      {/* 2. Security PIN Settings */}
      <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-brand-600" />
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            PIN Akses
          </h2>
        </div>

        <form onSubmit={handleSavePins} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              PIN Admin Cabang (Default: 0000)
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={adminPinInput}
              onChange={(e) => setAdminPinInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-mono font-bold tracking-widest"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              PIN Akun TKU (Default: 1111)
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={tkuPinInput}
              onChange={(e) => setTkuPinInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-mono font-bold tracking-widest"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Simpan Perubahan PIN
            </button>
          </div>
        </form>
      </div>

      {/* 3. External Supabase Database Sync */}
      <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-600" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Database Cloud
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isLocked && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Terkunci (Aman)
              </span>
            )}
            {state.supabaseConfig.u && state.supabaseConfig.k ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Terkoneksi Cloud
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                Mode Offline Lokal
              </span>
            )}
          </div>
        </div>
        
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Aplikasi otomatis menyimpan data di memori lokal perangkat. Menghubungkan Supabase memungkinkan 30 pengguna atau perangkat berbeda saling tersinkronisasi otomatis dengan hemat egress.
        </p>

        {/* Banner informasi jika terkunci */}
        {isLocked ? (
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Kredensial Supabase Terkunci</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">URL & API Key dilindungi PIN Admin agar tidak terlihat sembarangan atau diubah tanpa izin.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowUnlockModal(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Buka Kunci (PIN)</span>
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
              <Unlock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Mode Pengeditan Terbuka. Anda dapat memasukkan atau memperbarui URL & API Key lalu menguncinya.</span>
            </div>
            {state.supabaseConfig.u && state.supabaseConfig.k && (
              <button
                type="button"
                onClick={handleLockNow}
                className="px-3 py-1 rounded-xl text-xs font-semibold bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Lock className="w-3 h-3 text-neutral-500" />
                <span>Kunci Sekarang</span>
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSaveSbAndLock} className="space-y-3 max-w-xl text-xs">
          <div>
            <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Project URL
            </label>
            <input
              type="text"
              placeholder="https://xyz.supabase.co"
              value={isLocked ? (sbUrl ? sbUrl.replace(/(https:\/\/[^.]{3})[^.]+(\.supabase\.co.*)/, '$1••••$2') : '') : sbUrl}
              onChange={(e) => setSbUrl(e.target.value)}
              disabled={isLocked}
              className={`w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-mono ${
                isLocked ? 'bg-neutral-100 dark:bg-neutral-800/50 cursor-not-allowed text-neutral-500' : 'bg-white dark:bg-neutral-800'
              }`}
            />
          </div>

          <div>
            <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Anon Public API Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOi..."
              value={isLocked ? '••••••••••••••••••••••••••••••••••••••••' : sbKey}
              onChange={(e) => setSbKey(e.target.value)}
              disabled={isLocked}
              className={`w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-mono ${
                isLocked ? 'bg-neutral-100 dark:bg-neutral-800/50 cursor-not-allowed text-neutral-500' : 'bg-white dark:bg-neutral-800'
              }`}
            />
          </div>

          {/* Test connection result badge */}
          {sbTestResult && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              sbTestResult.success 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            }`}>
              {sbTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              )}
              <span>{sbTestResult.message}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!isLocked ? (
              <>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Simpan & Kunci</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSbUnlocked}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Simpan Saja
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowUnlockModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Buka Kunci untuk Edit</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleTestSb}
              disabled={isTestingSb || (!state.supabaseConfig.u && !sbUrl) || (!state.supabaseConfig.k && !sbKey)}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Radio className={`w-3.5 h-3.5 ${isTestingSb ? 'animate-spin text-brand-600' : ''}`} />
              <span>{isTestingSb ? 'Menguji...' : 'Tes Koneksi'}</span>
            </button>

            {state.supabaseConfig.u && state.supabaseConfig.k && (
              <button
                type="button"
                onClick={async () => {
                  const link = buildInviteLink(state.supabaseConfig);
                  try {
                    await navigator.clipboard.writeText(link);
                    showToast('Link undangan disalin! Kirim ke tim — saat dibuka di HP mana pun, aplikasinya OTOMATIS langsung terhubung ke Supabase.', 'success');
                  } catch {
                    window.prompt('Salin link undangan ini:', link);
                  }
                }}
                className="px-4 py-2 rounded-xl border border-brand-400 dark:border-brand-700 bg-brand-600 text-white font-semibold hover:bg-brand-700 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Salin link yang otomatis menghubungkan perangkat penerima ke database Supabase"
              >
                <Link2 className="w-4 h-4" />
                <span>Salin Link Undangan (Auto-Connect)</span>
              </button>
            )}

            {(state.supabaseConfig.u || state.supabaseConfig.k) ? (
              <button
                type="button"
                onClick={handleClearSb}
                disabled={isLocked}
                className="px-3.5 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold transition-colors flex items-center gap-1.5 ml-auto disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title={isLocked ? "Buka kunci terlebih dahulu" : "Putuskan Koneksi Supabase"}
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Putuskan Cloud</span>
              </button>
            ) : (
              DEFAULT_SUPABASE_CONFIG.u && (
                <button
                  type="button"
                  onClick={() => {
                    setSbUrl(DEFAULT_SUPABASE_CONFIG.u);
                    setSbKey(DEFAULT_SUPABASE_CONFIG.k);
                    onUpdateSupabase(DEFAULT_SUPABASE_CONFIG.u, DEFAULT_SUPABASE_CONFIG.k, true);
                    showToast('Berhasil terhubung kembali ke database Supabase!', 'success');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Hubungkan ke Supabase Utama</span>
                </button>
              )
            )}
          </div>
        </form>

        {/* Modal PIN untuk Membuka Kunci */}
        {showUnlockModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">Buka Kunci Supabase</h3>
                </div>
                <button
                  onClick={() => {
                    setShowUnlockModal(false);
                    setUnlockPin('');
                    setUnlockError(false);
                  }}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-neutral-500">
                Masukkan <strong>PIN Admin</strong> (default: <span className="font-mono font-bold">0000</span>) untuk membuka kunci konfigurasi database cloud Supabase:
              </p>

              <form onSubmit={handleUnlockWithPin} className="space-y-3">
                <input
                  type="password"
                  maxLength={6}
                  placeholder="PIN Admin"
                  value={unlockPin}
                  onChange={(e) => {
                    setUnlockPin(e.target.value);
                    setUnlockError(false);
                  }}
                  autoFocus
                  className={`w-full px-4 py-2.5 rounded-xl border text-center font-mono font-bold text-lg tracking-widest bg-neutral-50 dark:bg-neutral-800 ${
                    unlockError ? 'border-red-500 text-red-600' : 'border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white'
                  }`}
                />
                {unlockError && (
                  <p className="text-xs text-red-500 font-semibold text-center">PIN Admin tidak sesuai</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUnlockModal(false);
                      setUnlockPin('');
                      setUnlockError(false);
                    }}
                    className="flex-1 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    Buka Kunci
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Supabase table setup helper */}
        <details className="mt-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-xs">
          <summary className="cursor-pointer font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white select-none">
            Petunjuk Penyiapan Tabel Supabase (SQL)
          </summary>
          <div className="mt-2.5 space-y-2 text-neutral-600 dark:text-neutral-400">
            <p>Jalankan query SQL berikut di menu <strong>SQL Editor</strong> di dashboard Supabase Anda:</p>
            <pre className="p-2.5 rounded-lg bg-neutral-900 text-neutral-100 font-mono text-[11px] overflow-x-auto select-all">
{`create table if not exists app_store (
  key text primary key,
  value jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Izinkan akses baca/tulis publik anon
alter table app_store enable row level security;
create policy "Allow anon read write" on app_store for all using (true) with check (true);`}
            </pre>
          </div>
        </details>
      </div>

      {/* 5. Sinkronisasi & Rekonsiliasi Data */}
      <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-brand-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sinkronisasi Data</span>
            </h2>
          </div>

          {onManualSync && (
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 ${
                isSyncing
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data Sekarang'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 6. Backup & Restore Data */}
      <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
          Cadangan Data
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onExportJson}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Cadangan JSON</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-brand-600" />
            <span>Pulihkan dari File JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>

          {onClearPjdHjd && (
            <button
              onClick={() => {
                ask({
                  title: 'Hapus Input Harian Bulan Ini?',
                  message: `Konfirmasi: Hapus data input harian (PJD & HJD) bulan ${periodLabelOf(activePeriodKey)} saja?\nBulan lain, master profil TKU, target, dan arsip bulanan tetap aman.`,
                  confirmLabel: 'Ya, Hapus Input Harian',
                  tone: 'warning',
                  onConfirm: () => {
                    onClearPjdHjd();
                  }
                });
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Hapus Input Harian Bulan Ini (PJD & HJD)</span>
            </button>
          )}

          <button
            onClick={() => {
              ask({
                title: 'PERINGATAN: Reset Pabrik',
                message: 'SEMUA bulan (termasuk bulan yang sudah disimpan) akan dikembalikan ke data awal, dan perubahan ini bisa ikut terkirim ke Supabase.\n\nDisarankan mengunduh cadangan JSON terlebih dahulu. Lanjutkan reset?',
                confirmLabel: 'Ya, Reset Pabrik',
                tone: 'danger',
                onConfirm: () => {
                  onResetDefault();
                  showToast('Aplikasi direset ke data awal', 'info');
                }
              });
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Pengaturan Pabrik</span>
          </button>
        </div>
      </div>
    {dialog}
    </div>
  );
};
