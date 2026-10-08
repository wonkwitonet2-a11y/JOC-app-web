import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, TkuItem, DailySalesRecord, VariantCode, ArchiveRecord, ArchiveRow, SupabaseConfig } from './types';
import { 
  loadAppState, 
  saveAppState, 
  exportStateToJson, 
  getDefaultState, 
  loadStateFromSupabase, 
  saveStateToSupabase,
  hasUnsyncedChanges,
  getLatestSalesDay,
  getTanggalUpdate,
  computeActiveDate,
  getPeriodInfo,
  saveSupabaseConfigToVault,
  synchronizeAppState,
  switchWorkingPeriod,
  saveMonthBackupToSupabase,
  getDaysInMonthOfKey,
  round2,
  recordSessionActivity,
  clearAppSession,
  saveAppSession,
  isSessionExpired,
  INACTIVITY_TIMEOUT_MS,
  SESSION_EXPIRED_FLAG_KEY
} from './services/storage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ToastContainer, ToastMessage } from './components/Toast';

import { PanelLeft } from 'lucide-react';

// Views
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { PenjualanHarianView } from './views/PenjualanHarianView';
import { EvaluasiView } from './views/EvaluasiView';
import { BreakdownRealisasiView } from './views/BreakdownRealisasiView';
import { TargetView } from './views/TargetView';
import { ProfilTkuView } from './views/ProfilTkuView';
import { ArsipView } from './views/ArsipView';
import { INITIAL_ARCHIVES } from './data/initialData';
import { PengaturanView } from './views/PengaturanView';
import { TkuInputView } from './views/TkuInputView';

// Susun arsip satu bulan dari angka kerja saat ini.
function buildArchiveFromState(state: AppState): ArchiveRecord {
  const curP = getPeriodInfo(state);
  const currentKey = curP.key;
  const divider = state.pembagiHari || state.currentDayNum || 1;

  const rows: ArchiveRow[] = state.tkus.filter(t => t.aktif).map((t) => {
    const idx = state.tkus.indexOf(t);
    const sold = t.penjualanAkm.reduce((a, b) => a + b, 0);
    const akmBb = (t.bbAkm || [0, 0, 0, 0]).reduce((a, b) => a + (Number(b) || 0), 0);
    const targetHarian = t.targetHarian || 0;
    const bulanLalu = state.targetBulanLalu[idx] || 0;
    const tahunLalu = state.targetTahunLalu[idx] || 0;
    const rataHarian = divider > 0 ? round2(sold / divider) : 0;
    const vsTargetPct = targetHarian > 0 ? rataHarian / targetHarian : 1;
    const vsLmPct = bulanLalu > 0 ? rataHarian / bulanLalu : 1;
    const vsLyPct = tahunLalu > 0 ? rataHarian / tahunLalu : 1;
    const akmBbPct = (sold + akmBb) > 0 ? akmBb / (sold + akmBb) : 0;
    const akmJwp = t.akmJwp || 0;
    const sYl = akmJwp > 0 ? Math.round(sold / akmJwp) : 0;
    const absenYl = t.absenYl || 0;
    const frekuensiAbsen = t.frekuensiAbsen || 0;
    const jumlahYl = t.jumlahYl || 0;
    const jumlahArea = t.jumlahArea || 0;
    const coverageArea = jumlahArea > 0 ? jumlahYl / jumlahArea : 1;
    const rataVarian: [number, number, number, number] = [
      divider > 0 ? round2(t.penjualanAkm[0] / divider) : 0,
      divider > 0 ? round2(t.penjualanAkm[1] / divider) : 0,
      divider > 0 ? round2(t.penjualanAkm[2] / divider) : 0,
      divider > 0 ? round2(t.penjualanAkm[3] / divider) : 0
    ];

    return {
      nama: t.nama,
      rayon: t.rayon,
      varian: [...t.penjualanAkm] as [number, number, number, number],
      total: sold,
      targetHarian,
      vsTargetPct,
      bulanLalu,
      vsLmPct,
      tahunLalu,
      vsLyPct,
      akmBb,
      akmBbPct,
      akmJwp,
      sYl,
      absenYl,
      frekuensiAbsen,
      jumlahYl,
      jumlahArea,
      coverageArea,
      l250: t.l250 || 0,
      l300: t.l300 || 0,
      rataVarian,
      rataHarian
    };
  });

  return {
    periode: currentKey,
    namaBulan: curP.label,
    d: state.currentDayNum,
    terkunci: true,
    rows
  };
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // Status sinkronisasi cloud
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Drawer menu (mode HP saja). Di mode tablet/desktop, Sidebar selalu tampil
  // sendiri lewat breakpoint md:, jadi state ini tidak berpengaruh di sana.
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Sidebar statis mode tablet/desktop: bisa disembunyikan lewat tombol X di
  // sidebar itu sendiri, atau tombol hamburger di Navbar, agar konten terlihat
  // penuh tanpa menu. Tidak berpengaruh di mode HP (drawer terpisah di atas).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Sub-menu aktif untuk akun operator TKU: Ringkasan di depan, menu kedua Input Penjualan
  const [tkuSubMenu, setTkuSubMenu] = useState<'ringkasan' | 'input' | 'breakdown' | 'realisasi'>('ringkasan');

  // Automatically save state to localStorage whenever it changes (cache instan/offline)
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // Beri tahu aplikasi pembungkus (APK/webview) apakah akun sedang masuk atau keluar,
  // supaya ikon gerigi link hanya tampil di layar login.
  useEffect(() => {
    const kirimStatus = () => {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'yk-auth', loggedIn: !!state.role }, '*');
        }
      } catch (_) {}
    };
    kirimStatus();
    const onPesan = (e: MessageEvent) => {
      if (e.data && e.data.type === 'yk-ping') kirimStatus();
    };
    window.addEventListener('message', onPesan);
    return () => window.removeEventListener('message', onPesan);
  }, [state.role]);

  // Jembatan kredensial Supabase dengan aplikasi pembungkus (APK).
  // Di dalam APK, penyimpanan halaman web bisa terpisah/hilang, jadi URL & API key
  // juga dititipkan ke APK dan diminta kembali setiap aplikasi dibuka.
  const adaKredRef = useRef(false);
  useEffect(() => {
    const { u, k, locked } = state.supabaseConfig;
    try {
      if (!window.parent || window.parent === window) return;
      if (u && k) {
        adaKredRef.current = true;
        window.parent.postMessage({ type: 'yk-cred-set', u, k, locked: !!locked }, '*');
      } else if (adaKredRef.current) {
        adaKredRef.current = false;
        window.parent.postMessage({ type: 'yk-cred-clear' }, '*');
      }
    } catch (_) {}
  }, [state.supabaseConfig.u, state.supabaseConfig.k, state.supabaseConfig.locked]);

  useEffect(() => {
    const onKred = (e: MessageEvent) => {
      if (e.source !== window.parent) return;
      const d = e.data;
      if (!d || d.type !== 'yk-cred') return;
      if (typeof d.u !== 'string' || typeof d.k !== 'string' || !d.u.trim() || !d.k.trim()) return;
      setState(prev => {
        if (prev.supabaseConfig.u && prev.supabaseConfig.k) return prev;
        const cfg: SupabaseConfig = { u: d.u.trim(), k: d.k.trim(), locked: Boolean(d.locked) };
        saveSupabaseConfigToVault(cfg);
        return { ...prev, supabaseConfig: cfg };
      });
    };
    window.addEventListener('message', onKred);
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'yk-cred-get' }, '*');
      }
    } catch (_) {}
    return () => window.removeEventListener('message', onKred);
  }, []);

  // Fungsi sinkronisasi data menyeluruh (lokal & cloud Supabase jika terhubung)
  const refreshFromCloud = useCallback(async (isManual = false) => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      if (state.supabaseConfig.u && state.supabaseConfig.k) {
        const result = await loadStateFromSupabase(state.supabaseConfig);
        if (result === 'unchanged') {
          setSyncStatus('synced');
          setState(prev => synchronizeAppState(prev));
          if (isManual) showToast('Sinkronisasi selesai! Data lokal & cloud sudah mutakhir dan serasi.', 'success');
        } else if (result && result.state) {
          const synchronized = synchronizeAppState({
            ...result.state,
            role: state.role,
            activeTkuId: state.activeTkuId,
            currentMenu: state.currentMenu,
            selectedRayon: state.selectedRayon,
            theme: state.theme,
            supabaseConfig: state.supabaseConfig
          });
          setState(synchronized);
          setSyncStatus('synced');
          if (isManual) showToast('Sinkronisasi cloud berhasil! Seluruh data dan metrik telah disesuaikan.', 'success');
        } else {
          setState(prev => synchronizeAppState(prev));
          setSyncStatus('idle');
          if (isManual) showToast('Rekonsiliasi & sinkronisasi data lokal selesai!', 'success');
        }
      } else {
        setState(prev => synchronizeAppState(prev));
        setSyncStatus('idle');
        if (isManual) showToast('Rekonsiliasi & sinkronisasi data lokal selesai!', 'success');
      }
    } catch {
      setState(prev => synchronizeAppState(prev));
      setSyncStatus('error');
      if (isManual) showToast('Sinkronisasi lokal selesai (koneksi cloud offline)', 'info');
    } finally {
      setIsSyncing(false);
    }
  }, [state.supabaseConfig, state.role, state.activeTkuId, state.currentMenu, state.selectedRayon, state.theme]);

  // Tarik data cloud: saat pertama buka, saat kembali ke tab browser, dan periodik hemat (tiap 2.5 menit)
  const supabaseSig = state.supabaseConfig.u + '|' + state.supabaseConfig.k;
  useEffect(() => {
    if (!state.supabaseConfig.u || !state.supabaseConfig.k) return;
    refreshFromCloud(false);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshFromCloud(false);
      }
    };

    const periodicTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshFromCloud(false);
      }
    }, 150000); // 2.5 menit

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    return () => {
      clearInterval(periodicTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, [supabaseSig, refreshFromCloud]);

  // Deteksi otomatis saat tanggal kalender berganti hari (misal lewat tengah malam / buka aplikasi di hari baru)
  useEffect(() => {
    const checkDateTransition = () => {
      setState(prev => {
        const act = computeActiveDate(prev.activePeriod);
        if (act.date !== prev.activeDate || act.day !== prev.currentDayNum) {
          const activePjd = prev.pjd?.[act.date] || {};
          const cleanInputs: Record<number, DailySalesRecord> = {};
          prev.tkus.forEach((_, idx) => {
            if (activePjd[idx]) {
              cleanInputs[idx] = { ...activePjd[idx] };
            } else {
              cleanInputs[idx] = {
                v: [0, 0, 0, 0],
                b: [0, 0, 0, 0],
                sold: 0,
                bb: 0,
                pdmV: [0, 0, 0, 0],
                pdm: 0,
                yl: prev.tkus[idx]?.jumlahYl || 10,
                ar: prev.tkus[idx]?.jumlahArea || 10,
                jwp: (prev.tkus[idx]?.jumlahYl || 10) * act.day,
              };
            }
          });
          return synchronizeAppState({
            ...prev,
            activeDate: act.date,
            currentDayNum: act.day,
            pembagiHari: act.day,
            todayInputs: cleanInputs
          });
        }
        return prev;
      });
    };

    const dateTimer = setInterval(checkDateTransition, 60000);
    document.addEventListener('visibilitychange', checkDateTransition);
    window.addEventListener('focus', checkDateTransition);

    return () => {
      clearInterval(dateTimer);
      document.removeEventListener('visibilitychange', checkDateTransition);
      window.removeEventListener('focus', checkDateTransition);
    };
  }, []);

  // Dorong perubahan ke Supabase, di-debounce 2.5 detik supaya tidak menulis ke cloud di
  // setiap ketikan/klik (sangat hemat egress), dan dilewati jika data riil tidak berubah.
  const supabasePushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.supabaseConfig.u || !state.supabaseConfig.k) return;
    if (!hasUnsyncedChanges(state)) return; // Lewati jika tidak ada perubahan data riil
    if (supabasePushTimer.current) clearTimeout(supabasePushTimer.current);
    supabasePushTimer.current = setTimeout(async () => {
      setIsSyncing(true);
      setSyncStatus('syncing');
      const ok = await saveStateToSupabase(state);
      setIsSyncing(false);
      setSyncStatus(ok ? 'synced' : 'error');
    }, 2500);
    return () => {
      if (supabasePushTimer.current) clearTimeout(supabasePushTimer.current);
    };
  }, [state]);

  // Handle dark mode theme class on root element
  useEffect(() => {
    // Pilihan di aplikasi menang atas default HP. 'system' diperlakukan sebagai terang.
    const isDark = state.theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  // Sinkronkan tanggal aktif dengan kalender (tanpa cut-off).
  // Hari ini ikut dihitung walau datanya belum disimpan; jika kalender sudah lewat bulan kerja
  // dan belum disimpan, tanggal berhenti di tanggal terakhir bulan kerja tersebut.
  useEffect(() => {
    const sync = () => {
      setState(prev => {
        const act = computeActiveDate(prev.activePeriod);
        if (prev.activeDate === act.date && prev.currentDayNum === act.day && prev.pembagiHari === act.day) return prev;
        return { ...prev, activeDate: act.date, currentDayNum: act.day, pembagiHari: act.day, pembagiHariMode: 'tanggal' };
      });
    };
    sync();
    const timer = setInterval(sync, 60000);
    window.addEventListener('focus', sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', sync);
    };
  }, []);

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Pelacak waktu aktif terakhir untuk auto logout jika aplikasi ditutup / ditinggal > 10 menit
  const lastActiveRef = useRef<number>(Date.now());

  // Notifikasi jika sesi sebelumnya kedaluwarsa saat aplikasi dibuka kembali
  useEffect(() => {
    try {
      const wasExpired = localStorage.getItem(SESSION_EXPIRED_FLAG_KEY);
      if (wasExpired === '1') {
        localStorage.removeItem(SESSION_EXPIRED_FLAG_KEY);
        showToast('Sesi Anda telah berakhir otomatis karena aplikasi ditutup lebih dari 10 menit. Silakan login kembali.', 'info');
      }
    } catch (_) {}
  }, []);

  // Monitor inaktivitas & deteksi saat aplikasi dibuka kembali setelah diminimalkan / ditutup > 10 menit
  useEffect(() => {
    if (!state.role) return;

    let lastPersisted = Date.now();
    const onUserActivity = () => {
      const now = Date.now();
      lastActiveRef.current = now;
      // Simpan stempel waktu aktif ke storage berkala (setiap 5 detik)
      if (now - lastPersisted > 5000) {
        lastPersisted = now;
        recordSessionActivity();
      }
    };

    const checkInactivity = () => {
      if (!state.role) return;
      const now = Date.now();
      const elapsed = now - lastActiveRef.current;
      if (elapsed > INACTIVITY_TIMEOUT_MS || isSessionExpired()) {
        clearAppSession();
        setState(prev => ({ ...prev, role: null }));
        showToast('Sesi telah berakhir karena aplikasi ditutup / tidak aktif lebih dari 10 menit. Silakan login kembali.', 'info');
      }
    };

    // Saat aplikasi diminimalkan / tab disembunyikan / ditutup
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Catat waktu tepat saat aplikasi ditutup / diminimalkan
        lastActiveRef.current = Date.now();
        recordSessionActivity();
      } else if (document.visibilityState === 'visible') {
        // Pengguna membuka kembali aplikasi: periksa apakah sudah > 10 menit
        checkInactivity();
      }
    };

    const onWindowFocus = () => {
      checkInactivity();
    };

    const onPageHide = () => {
      recordSessionActivity();
    };

    // Pengecekan berkala (misal jika perangkat dibiarkan menyala tanpa aktivitas)
    const idleCheckInterval = setInterval(checkInactivity, 15000);

    const activityEvents: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, onUserActivity, { passive: true });
    });

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);

    return () => {
      clearInterval(idleCheckInterval);
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, onUserActivity);
      });
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
    };
  }, [state.role]);

  // Auth Handlers
  const handleLogin = (role: 'a' | 't', tkuId: number) => {
    lastActiveRef.current = Date.now();
    saveAppSession(role, tkuId);
    setState(prev => ({
      ...prev,
      role,
      activeTkuId: tkuId,
      currentMenu: 'Dashboard'
    }));
  };

  const handleLogout = (customMsg?: string) => {
    clearAppSession();
    setState(prev => ({
      ...prev,
      role: null
    }));
    showToast(customMsg || 'Berhasil keluar dari akun.', 'info');
  };

  const handleToggleTheme = () => {
    setState(prev => {
      const nextTheme: 'light' | 'dark' = prev.theme === 'dark' ? 'light' : 'dark';
      return { ...prev, theme: nextTheme };
    });
  };

  // Menu and Rayon Selectors
  const handleSelectMenu = (menu: string) => {
    setState(prev => ({ ...prev, currentMenu: menu }));
    setDrawerOpen(false); // di mode HP, memilih menu langsung menutup drawer
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateRayon = (rayon: number) => {
    setState(prev => ({ ...prev, selectedRayon: rayon }));
  };

  // Pembagi hari: tanpa cut-off. Fungsi ini dipertahankan hanya agar tampilan lama tetap kompatibel;
  // pembagi SELALU = tanggal update (maks. tanggal terakhir bulan kerja).
  const handleUpdatePembagiHari = () => {
    setState(prev => ({ ...prev, pembagiHariMode: 'tanggal', pembagiHari: getTanggalUpdate(prev) }));
  };

  // Tanggal aktif mengikuti kalender. Saat tanggal berganti, data input form harian otomatis kosong
  // (atau memuat data tersimpan jika tanggal tersebut sudah pernah disimpan).
  const handleUpdateActiveDay = (newDay?: number) => {
    setState(prev => {
      const act = computeActiveDate(prev.activePeriod);
      const targetDay = newDay || act.day;
      const targetDate = `${prev.activePeriod.slice(0, 8)}${String(targetDay).padStart(2, '0')}`;
      
      const nextTodayInputs: Record<number, DailySalesRecord> = {};
      prev.tkus.forEach((t, idx) => {
        const savedRec = prev.pjd[targetDate]?.[idx];
        if (savedRec) {
          nextTodayInputs[idx] = savedRec;
        } else {
          nextTodayInputs[idx] = {
            v: [0, 0, 0, 0],
            b: [0, 0, 0, 0],
            sold: 0,
            bb: 0,
            pdmV: [0, 0, 0, 0],
            pdm: 0,
            yl: t.jumlahYl || 10,
            ar: t.jumlahArea || 10,
            jwp: (t.jumlahYl || 10) * targetDay,
          };
        }
      });

      return synchronizeAppState({
        ...prev,
        currentDayNum: targetDay,
        activeDate: targetDate,
        pembagiHari: targetDay,
        todayInputs: nextTodayInputs
      });
    });
  };

  const handleUpdatePembagiKhususTku = (tkuIdx: number, val: number | null) => {
    setState(prev => {
      const nextMap = { ...(prev.pembagiKhususTku || {}) };
      if (val === null || val <= 0) {
        delete nextMap[tkuIdx];
      } else {
        nextMap[tkuIdx] = val;
      }
      return { ...prev, pembagiKhususTku: nextMap };
    });
    showToast(
      val === null || val <= 0
        ? `Pembagi khusus ${state.tkus[tkuIdx]?.nama} direset mengikuti pembagi umum (${state.pembagiHari || state.currentDayNum} hari)`
        : `Pembagi khusus ${state.tkus[tkuIdx]?.nama} disetel ke ${val} hari`,
      'success'
    );
  };

  // Target Updates
  const handleUpdateTargetHarian = (tkuIdx: number, newTg: number) => {
    setState(prev => {
      const nextTkus = [...prev.tkus];
      nextTkus[tkuIdx] = { ...nextTkus[tkuIdx], targetHarian: newTg };
      return { ...prev, tkus: nextTkus };
    });
  };

  const handleUpdateTargetBl = (tkuIdx: number, newBl: number) => {
    setState(prev => {
      const nextBl = [...prev.targetBulanLalu];
      nextBl[tkuIdx] = newBl;
      return { ...prev, targetBulanLalu: nextBl };
    });
  };

  const handleUpdateTargetTy = (tkuIdx: number, newTy: number) => {
    setState(prev => {
      const nextTy = [...prev.targetTahunLalu];
      nextTy[tkuIdx] = newTy;
      return { ...prev, targetTahunLalu: nextTy };
    });
  };

  const handleUpdateVariantTarget = (variant: VariantCode, tkuIdx: number, field: 'tg' | 'bl' | 'ty', val: number) => {
    setState(prev => {
      const nextMap = { ...prev.targetPerVariant };
      const varMap = { ...(nextMap[variant] || {}) };
      varMap[tkuIdx] = { ...(varMap[tkuIdx] || {}), [field]: val };
      nextMap[variant] = varMap;

      // Auto sum across all 4 variants for this tku
      const totalTgForTku = (['YO', 'OM', 'OS', 'YT'] as VariantCode[]).reduce((sum, v) => {
        const item = v === variant ? varMap[tkuIdx] : nextMap[v]?.[tkuIdx];
        return sum + (item?.tg || 0);
      }, 0);

      const totalBlForTku = (['YO', 'OM', 'OS', 'YT'] as VariantCode[]).reduce((sum, v) => {
        const item = v === variant ? varMap[tkuIdx] : nextMap[v]?.[tkuIdx];
        return sum + (item?.bl || 0);
      }, 0);

      const totalTyForTku = (['YO', 'OM', 'OS', 'YT'] as VariantCode[]).reduce((sum, v) => {
        const item = v === variant ? varMap[tkuIdx] : nextMap[v]?.[tkuIdx];
        return sum + (item?.ty || 0);
      }, 0);

      const nextTkus = [...prev.tkus];
      if (field === 'tg' && totalTgForTku > 0) {
        nextTkus[tkuIdx] = { ...nextTkus[tkuIdx], targetHarian: totalTgForTku };
      }

      const nextBl = [...prev.targetBulanLalu];
      if (field === 'bl' && totalBlForTku > 0) {
        nextBl[tkuIdx] = totalBlForTku;
      }

      const nextTy = [...prev.targetTahunLalu];
      if (field === 'ty' && totalTyForTku > 0) {
        nextTy[tkuIdx] = totalTyForTku;
      }

      return {
        ...prev,
        targetPerVariant: nextMap,
        tkus: nextTkus,
        targetBulanLalu: nextBl,
        targetTahunLalu: nextTy
      };
    });
  };

  // Pull Targets from Archives
  // Menarik rata-rata penjualan PER VARIAN (ORI/OM/OS/YT) dari arsip:
  //  - Bulan lalu  = arsip satu bulan sebelum bulan kerja aktif
  //  - Tahun lalu  = arsip bulan yang sama di tahun sebelumnya (jika ada)
  // Poin 6: Jika arsip tidak ditemukan, data dikosongkan (di-set 0) agar bisa diisi manual.
  const handleTarikDariArsip = () => {
    const curP = getPeriodInfo(state);
    const pad = (n: number) => String(n).padStart(2, '0');
    const prevDate = new Date(curP.year, curP.monthIndex - 1, 1);
    const blKey = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`;
    const tyKey = `${curP.year - 1}-${pad(curP.monthIndex + 1)}`;
    const arcBl = state.archives[blKey];
    const arcTy = state.archives[tyKey];

    const VCODES: VariantCode[] = ['YO', 'OM', 'OS', 'YT'];
    // Rata-rata per hari tiap varian dari satu baris arsip (dibulatkan ke bawah)
    const avgPerVariant = (row: ArchiveRow, days: number): [number, number, number, number] => {
      if (row.rataVarian && row.rataVarian.length === 4) {
        return row.rataVarian.map(v => Math.floor(Number(v) || 0)) as [number, number, number, number];
      }
      const d = days > 0 ? days : 1;
      return [0, 1, 2, 3].map(i => Math.floor((Number(row.varian?.[i]) || 0) / d)) as [number, number, number, number];
    };

    let filledBl = 0;
    let filledTy = 0;

    setState(prev => {
      const nextMap = {
        YO: { ...(prev.targetPerVariant?.YO || {}) },
        OM: { ...(prev.targetPerVariant?.OM || {}) },
        OS: { ...(prev.targetPerVariant?.OS || {}) },
        YT: { ...(prev.targetPerVariant?.YT || {}) }
      };
      // Jika arsip tidak ada, kosongkan (0) agar diisi manual sesuai Poin 6
      const nextBl = arcBl ? [...prev.targetBulanLalu] : prev.tkus.map(() => 0);
      const nextTy = arcTy ? [...prev.targetTahunLalu] : prev.tkus.map(() => 0);

      prev.tkus.forEach((t, idx) => {
        const nama = t.nama.toLowerCase();
        if (arcBl) {
          const row = arcBl.rows.find(r => r.nama.toLowerCase() === nama);
          if (row) {
            const avg = avgPerVariant(row, arcBl.d);
            VCODES.forEach((v, i) => {
              nextMap[v][idx] = { ...(nextMap[v][idx] || {}), bl: avg[i] } as any;
            });
            nextBl[idx] = avg.reduce((a, b) => a + b, 0);
            filledBl++;
          } else {
            VCODES.forEach((v) => {
              nextMap[v][idx] = { ...(nextMap[v][idx] || {}), bl: 0 } as any;
            });
            nextBl[idx] = 0;
          }
        } else {
          VCODES.forEach((v) => {
            nextMap[v][idx] = { ...(nextMap[v][idx] || {}), bl: 0 } as any;
          });
        }

        if (arcTy) {
          const row = arcTy.rows.find(r => r.nama.toLowerCase() === nama);
          if (row) {
            const avg = avgPerVariant(row, arcTy.d);
            VCODES.forEach((v, i) => {
              nextMap[v][idx] = { ...(nextMap[v][idx] || {}), ty: avg[i] } as any;
            });
            nextTy[idx] = avg.reduce((a, b) => a + b, 0);
            filledTy++;
          } else {
            VCODES.forEach((v) => {
              nextMap[v][idx] = { ...(nextMap[v][idx] || {}), ty: 0 } as any;
            });
            nextTy[idx] = 0;
          }
        } else {
          VCODES.forEach((v) => {
            nextMap[v][idx] = { ...(nextMap[v][idx] || {}), ty: 0 } as any;
          });
        }
      });

      return {
        ...prev,
        targetPerVariant: nextMap,
        targetBulanLalu: nextBl,
        targetTahunLalu: nextTy
      };
    });

    const parts: string[] = [];
    parts.push(arcBl ? `bulan lalu (${curP.bulanLaluLabel}) terisi` : `bulan lalu (${curP.bulanLaluLabel}) dikosongkan (silakan isi manual)`);
    parts.push(arcTy ? `tahun lalu (${curP.tahunLaluLabel}) terisi` : `tahun lalu (${curP.tahunLaluLabel}) dikosongkan (silakan isi manual)`);
    showToast(`Tarik dari arsip: ${parts.join('; ')}.`, 'info');
  };

  // Daily Data & TKU Input
  const handleSaveDailyData = (date: string, tkuIdx: number, record: DailySalesRecord) => {
    setState(prev => {
      const nextPjd = { ...prev.pjd };
      if (!nextPjd[date]) {
        nextPjd[date] = {};
      }
      nextPjd[date][tkuIdx] = record;

      const nextInputs = date === prev.activeDate ? { ...prev.todayInputs, [tkuIdx]: record } : prev.todayInputs;

      return synchronizeAppState({
        ...prev,
        todayInputs: nextInputs,
        pjd: nextPjd
      });
    });
  };

  // Revisi data harian (dari sub-menu Realisasi akun TKU): ganti catatan pada tanggal tertentu,
  // lalu sesuaikan akumulasi TKU berdasarkan selisih dari catatan lama supaya angka dasar tidak bergeser.
  const handleReviseDailyData = (date: string, tkuIdx: number, record: DailySalesRecord) => {
    setState(prev => {
      const nextPjd = { ...prev.pjd, [date]: { ...(prev.pjd[date] || {}), [tkuIdx]: record } };
      const nextInputs = date === prev.activeDate ? { ...prev.todayInputs, [tkuIdx]: record } : prev.todayInputs;

      return synchronizeAppState({
        ...prev,
        pjd: nextPjd,
        todayInputs: nextInputs
      });
    });
  };

  const handleSaveTkuInput = (tkuIdx: number, record: DailySalesRecord) => {
    setState(prev => {
      const nextInputs = { ...prev.todayInputs, [tkuIdx]: record };
      const nextPjd = { ...prev.pjd };
      if (!nextPjd[prev.activeDate]) {
        nextPjd[prev.activeDate] = {};
      }
      nextPjd[prev.activeDate][tkuIdx] = record;

      return synchronizeAppState({
        ...prev,
        todayInputs: nextInputs,
        pjd: nextPjd
      });
    });
  };

  const handleUpdateBreakdownDay = (tkuIdx: number, variant: 'ALL' | VariantCode, dayIdx: number, val: number) => {
    setState(prev => {
      const nextBd = { ...prev.breakdown };
      const arrAll = [...(nextBd[tkuIdx] || Array(31).fill(0))];

      if (variant === 'ALL') {
        arrAll[dayIdx] = val;
        nextBd[tkuIdx] = arrAll;
        return { ...prev, breakdown: nextBd };
      } else {
        const nextBdV = {
          YO: { ...(prev.breakdownPerVariant?.YO || {}) },
          OM: { ...(prev.breakdownPerVariant?.OM || {}) },
          OS: { ...(prev.breakdownPerVariant?.OS || {}) },
          YT: { ...(prev.breakdownPerVariant?.YT || {}) }
        };
        const varMap = { ...(nextBdV[variant] || {}) };
        const arrV = [...(varMap[tkuIdx] || Array(31).fill(0))];
        arrV[dayIdx] = val;
        varMap[tkuIdx] = arrV;
        nextBdV[variant] = varMap;

        // Recalculate ALL total for this dayIdx
        const yoVal = variant === 'YO' ? val : (nextBdV.YO[tkuIdx]?.[dayIdx] || 0);
        const omVal = variant === 'OM' ? val : (nextBdV.OM[tkuIdx]?.[dayIdx] || 0);
        const osVal = variant === 'OS' ? val : (nextBdV.OS[tkuIdx]?.[dayIdx] || 0);
        const ytVal = variant === 'YT' ? val : (nextBdV.YT[tkuIdx]?.[dayIdx] || 0);
        arrAll[dayIdx] = yoVal + omVal + osVal + ytVal;
        nextBd[tkuIdx] = arrAll;

        return { ...prev, breakdown: nextBd, breakdownPerVariant: nextBdV };
      }
    });
  };

  const handleBatchUpdateBreakdown = (
    tkuIdx: number, 
    updates: { variant: VariantCode | 'ALL'; dayIdx: number; val: number }[]
  ) => {
    if (!updates || updates.length === 0) return;
    setState(prev => {
      const nextBd = { ...prev.breakdown };
      const arrAll = [...(nextBd[tkuIdx] || Array(31).fill(0))];
      const nextBdV = {
        YO: { ...(prev.breakdownPerVariant?.YO || {}) },
        OM: { ...(prev.breakdownPerVariant?.OM || {}) },
        OS: { ...(prev.breakdownPerVariant?.OS || {}) },
        YT: { ...(prev.breakdownPerVariant?.YT || {}) }
      };

      const arrYO = [...(nextBdV.YO[tkuIdx] || Array(31).fill(0))];
      const arrOM = [...(nextBdV.OM[tkuIdx] || Array(31).fill(0))];
      const arrOS = [...(nextBdV.OS[tkuIdx] || Array(31).fill(0))];
      const arrYT = [...(nextBdV.YT[tkuIdx] || Array(31).fill(0))];

      const vArrays: Record<VariantCode, number[]> = {
        YO: arrYO,
        OM: arrOM,
        OS: arrOS,
        YT: arrYT
      };

      const daysToRecalc = new Set<number>();

      updates.forEach(u => {
        if (u.variant === 'ALL') {
          arrAll[u.dayIdx] = u.val;
        } else {
          vArrays[u.variant][u.dayIdx] = u.val;
          daysToRecalc.add(u.dayIdx);
        }
      });

      daysToRecalc.forEach(dayIdx => {
        arrAll[dayIdx] = (arrYO[dayIdx] || 0) + (arrOM[dayIdx] || 0) + (arrOS[dayIdx] || 0) + (arrYT[dayIdx] || 0);
      });

      nextBd[tkuIdx] = arrAll;
      nextBdV.YO[tkuIdx] = arrYO;
      nextBdV.OM[tkuIdx] = arrOM;
      nextBdV.OS[tkuIdx] = arrOS;
      nextBdV.YT[tkuIdx] = arrYT;

      return {
        ...prev,
        breakdown: nextBd,
        breakdownPerVariant: nextBdV
      };
    });
  };

  // TKU Management
  const handleUpdateTkuProfile = (index: number, field: keyof TkuItem, value: any) => {
    setState(prev => {
      const nextTkus = [...prev.tkus];
      const oldNama = (nextTkus[index]?.nama || '').trim();
      nextTkus[index] = { ...nextTkus[index], [field]: value };

      // Ganti nama TKU -> ikut mengganti nama di SEMUA arsip (tersimpan juga ke Supabase
      // karena arsip bagian dari state). Field lain (PIC, alamat, HP, dll) hanya ada di
      // data TKU, jadi otomatis ikut di semua tampilan.
      if (field === 'nama') {
        const newNama = String(value || '').trim();
        const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
        if (newNama && oldNama && !sameName(oldNama, newNama)) {
          const nextArchives: typeof prev.archives = {};
          Object.keys(prev.archives || {}).forEach(k => {
            const arc = prev.archives[k];
            nextArchives[k] = arc?.rows?.some(r => sameName(r.nama, oldNama))
              ? { ...arc, rows: arc.rows.map(r => (sameName(r.nama, oldNama) ? { ...r, nama: newNama } : r)) }
              : arc;
          });
          return { ...prev, tkus: nextTkus, archives: nextArchives };
        }
      }
      return { ...prev, tkus: nextTkus };
    });
  };

  const handleToggleTkuActive = (index: number) => {
    setState(prev => {
      const nextTkus = [...prev.tkus];
      nextTkus[index] = { ...nextTkus[index], aktif: !nextTkus[index].aktif };
      return { ...prev, tkus: nextTkus };
    });
  };

  const handleDeleteTku = (index: number) => {
    setState(prev => {
      const nextTkus = prev.tkus.filter((_, i) => i !== index);
      const nextBl = prev.targetBulanLalu.filter((_, i) => i !== index);
      const nextTy = prev.targetTahunLalu.filter((_, i) => i !== index);
      return {
        ...prev,
        tkus: nextTkus,
        targetBulanLalu: nextBl,
        targetTahunLalu: nextTy
      };
    });
  };

  const handleAddTku = (newTkuData: Omit<TkuItem, 'id' | 'penjualanAkm'>) => {
    setState(prev => {
      const nextId = (Math.max(0, ...prev.tkus.map(t => t.id)) || 0) + 1;
      const newTku: TkuItem = {
        ...newTkuData,
        id: nextId,
        penjualanAkm: [0, 0, 0, 0]
      };
      const nextTkus = [...prev.tkus, newTku];
      const nextBl = [...prev.targetBulanLalu, round2(newTkuData.targetHarian * 0.95)];
      const nextTy = [...prev.targetTahunLalu, round2(newTkuData.targetHarian * 0.98)];
      const nextBd = { ...prev.breakdown, [nextTkus.length - 1]: Array(31).fill(newTkuData.targetHarian) };

      return {
        ...prev,
        tkus: nextTkus,
        targetBulanLalu: nextBl,
        targetTahunLalu: nextTy,
        breakdown: nextBd
      };
    });
  };

  // Archives Operations
  const handleSaveCurrentMonthArchive = async () => {
    const curP = getPeriodInfo(state);
    const currentKey = curP.key;
    const newArchive = buildArchiveFromState(state);

    const nextArchives = { ...state.archives, [currentKey]: newArchive };
    const nextState: AppState = {
      ...state,
      archives: nextArchives,
      activeArchiveKey: currentKey
    };

    setState(nextState);

    // Langsung simpan ke Supabase jika sudah terhubung
    if (state.supabaseConfig.u && state.supabaseConfig.k) {
      setIsSyncing(true);
      setSyncStatus('syncing');
      const ok = await saveStateToSupabase(nextState, true);
      if (ok) await saveMonthBackupToSupabase(nextState, currentKey);
      setIsSyncing(false);
      setSyncStatus(ok ? 'synced' : 'error');
      if (ok) {
        showToast(`Bulan ${curP.label} berhasil diarsipkan & disimpan langsung ke Supabase!`, 'success');
      } else {
        showToast(`Bulan ${curP.label} tersimpan di arsip lokal.`, 'info');
      }
    } else {
      showToast(`Bulan ${curP.label} berhasil diarsipkan!`, 'success');
    }
  };

  // Pindah bulan kerja (dipakai pilihan bulan di Pengaturan).
  // Bulan lama disimpan utuh (memori perangkat + Supabase), bulan baru dibuka kosong.
  const handleSwitchPeriod = async (newKey: string) => {
    const curKey = getPeriodInfo(state).key;
    if (!newKey || newKey === curKey) return;
    const now = new Date();
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Bulan lama yang sudah lewat otomatis diarsipkan (atau arsip parsialnya disempurnakan).
    let base: AppState = state;
    if (curKey < nowKey) {
      const existing = base.archives[curKey];
      if (!existing || existing.d < getDaysInMonthOfKey(curKey)) {
        base = { ...base, archives: { ...base.archives, [curKey]: buildArchiveFromState(base) } };
      }
    }

    const next = switchWorkingPeriod(base, newKey);
    setState(next);
    saveAppState(next);
    const nextLabel = getPeriodInfo(next).label;
    const oldLabel = getPeriodInfo(base).label;

    if (state.supabaseConfig.u && state.supabaseConfig.k) {
      setIsSyncing(true);
      setSyncStatus('syncing');
      const ok = await saveStateToSupabase(next, true);
      const okBackup = ok ? await saveMonthBackupToSupabase(next, curKey) : false;
      setIsSyncing(false);
      setSyncStatus(ok ? 'synced' : 'error');
      if (ok && okBackup) {
        showToast(`Pindah ke ${nextLabel}. Data ${oldLabel} sudah aman di perangkat dan di Supabase.`, 'success');
      } else if (ok) {
        showToast(`Pindah ke ${nextLabel}. Data utama tersimpan di Supabase, tetapi cadangan ${oldLabel} belum masuk. Coba "Cadangkan Sekarang".`, 'info');
      } else {
        showToast(`Pindah ke ${nextLabel}. Data ${oldLabel} aman di perangkat ini, tetapi GAGAL terkirim ke Supabase. Cek koneksi lalu tekan "Cadangkan Sekarang".`, 'error');
      }
    } else {
      showToast(`Pindah ke ${nextLabel}. Data ${oldLabel} tersimpan di perangkat ini (Supabase belum dikonfigurasi).`, 'info');
    }
  };

  // Kirim paksa data ke Supabase + salinan terpisah untuk bulan kerja yang sedang aktif.
  const handleBackupNow = async (): Promise<boolean> => {
    if (!state.supabaseConfig.u || !state.supabaseConfig.k) {
      showToast('Supabase belum dikonfigurasi. Masukkan URL & Key di Pengaturan.', 'error');
      return false;
    }
    setIsSyncing(true);
    setSyncStatus('syncing');
    const ok = await saveStateToSupabase(state, true);
    const okBackup = ok ? await saveMonthBackupToSupabase(state, getPeriodInfo(state).key) : false;
    setIsSyncing(false);
    setSyncStatus(ok ? 'synced' : 'error');
    if (ok && okBackup) {
      showToast(`Data ${getPeriodInfo(state).label} berhasil dicadangkan ke Supabase.`, 'success');
      return true;
    }
    showToast('Gagal mencadangkan ke Supabase. Periksa jaringan atau kredensial database.', 'error');
    return false;
  };

  const handleUnlockArchive = async (archiveKey: string) => {
    const arc = state.archives[archiveKey];
    if (!arc) return;
    const nextState: AppState = {
      ...state,
      archives: {
        ...state.archives,
        [archiveKey]: { ...arc, terkunci: !arc.terkunci }
      }
    };
    setState(nextState);
    if (state.supabaseConfig.u && state.supabaseConfig.k) {
      saveStateToSupabase(nextState, true);
    }
  };

  const handleSelectArchive = (archiveKey: string) => {
    setState(prev => ({ ...prev, activeArchiveKey: archiveKey }));
  };

  // Hapus arsip satu bulan (misal salah klik "Simpan Bulan Ini"). Data kerja bulan tersebut
  // (penjualan harian, dll) TIDAK ikut terhapus — hanya catatan arsipnya.
  const handleDeleteArchive = async (archiveKey: string) => {
    if (!state.archives[archiveKey]) return;
    if (INITIAL_ARCHIVES[archiveKey]) {
      showToast('Arsip bawaan (data resmi Jan–Agu 2026) tidak bisa dihapus.', 'error');
      return;
    }
    const remaining = { ...state.archives };
    delete remaining[archiveKey];
    const remainingKeys = Object.keys(remaining).sort((a, b) => b.localeCompare(a));
    const nextActive = state.activeArchiveKey && state.activeArchiveKey !== archiveKey && remaining[state.activeArchiveKey]
      ? state.activeArchiveKey
      : (remainingKeys[0] || null);
    const nextState: AppState = {
      ...state,
      archives: remaining,
      activeArchiveKey: nextActive
    };
    setState(nextState);
    saveAppState(nextState);

    if (state.supabaseConfig.u && state.supabaseConfig.k) {
      setIsSyncing(true);
      setSyncStatus('syncing');
      const ok = await saveStateToSupabase(nextState, true);
      setIsSyncing(false);
      setSyncStatus(ok ? 'synced' : 'error');
      showToast(
        ok
          ? `Arsip ${archiveKey} berhasil dihapus (lokal & Supabase).`
          : `Arsip ${archiveKey} dihapus di perangkat ini, tapi GAGAL dikirim ke Supabase. Cek koneksi lalu tekan simpan/sinkron.`,
        ok ? 'success' : 'error'
      );
    } else {
      showToast(`Arsip ${archiveKey} berhasil dihapus.`, 'success');
    }
  };

  const handleForcePushArchive = async () => {
    if (!state.supabaseConfig.u || !state.supabaseConfig.k) {
      showToast('Supabase belum dikonfigurasi. Masukkan URL & Key di menu Pengaturan.', 'error');
      return;
    }
    setIsSyncing(true);
    setSyncStatus('syncing');
    const ok = await saveStateToSupabase(state, true);
    setIsSyncing(false);
    setSyncStatus(ok ? 'synced' : 'error');
    if (ok) {
      showToast('Seluruh arsip berhasil disimpan & disinkronkan ke database Supabase!', 'success');
    } else {
      showToast('Gagal menyimpan ke Supabase. Periksa jaringan atau kredensial database.', 'error');
    }
  };

  const handleImportCsvArchive = async (csvText: string) => {
    try {
      const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
      let importedCount = 0;
      const detectedPeriods = new Set<string>();

      lines.forEach(line => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 4) {
          const date = parts[0];
          if (date && date.includes('-')) {
            detectedPeriods.add(date.substring(0, 7));
            importedCount++;
          }
        }
      });

      if (detectedPeriods.size === 0) {
        showToast('Format CSV tidak dikenali. Gunakan: tanggal,nama_tku,varian,botol,bb', 'error');
        return;
      }

      const period = Array.from(detectedPeriods)[0];
      const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const [yearStr, monthStr] = period.split('-');
      const monthLabel = `${monthNames[Number(monthStr)] || monthStr} ${yearStr}`;

      // Build rows for imported month
      const rows = state.tkus.map(t => ({
        nama: t.nama,
        rayon: t.rayon,
        varian: [
          Math.round(t.penjualanAkm[0] * 0.95),
          Math.round(t.penjualanAkm[1] * 0.95),
          Math.round(t.penjualanAkm[2] * 0.95),
          Math.round(t.penjualanAkm[3] * 0.95)
        ] as [number, number, number, number],
        total: Math.round(t.penjualanAkm.reduce((a, b) => a + b, 0) * 0.95)
      }));

      const nextState: AppState = {
        ...state,
        archives: {
          ...state.archives,
          [period]: {
            periode: period,
            namaBulan: monthLabel,
            d: 30,
            terkunci: true,
            rows
          }
        },
        activeArchiveKey: period
      };

      setState(nextState);

      if (state.supabaseConfig.u && state.supabaseConfig.k) {
        saveStateToSupabase(nextState, true);
      }

      showToast(`Berhasil mengimpor ${importedCount} data untuk arsip ${monthLabel}!`, 'success');
    } catch (err) {
      showToast('Gagal memproses impor CSV', 'error');
    }
  };



  // Settings: Supabase & PINs & State Restore
  const handleUpdateSupabase = (u: string, k: string, locked?: boolean) => {
    const nextCfg: SupabaseConfig = {
      u: u.trim(),
      k: k.trim(),
      locked: locked !== undefined ? locked : (state.supabaseConfig?.locked ?? false)
    };
    saveSupabaseConfigToVault(nextCfg);
    setState(prev => ({
      ...prev,
      supabaseConfig: nextCfg
    }));
  };

  const handleExportJson = () => {
    exportStateToJson(state);
    showToast('File cadangan JSON berhasil diunduh.', 'success');
  };

  const handleImportJson = (jsonState: AppState) => {
    const nextCfg = (jsonState.supabaseConfig && jsonState.supabaseConfig.u) ? jsonState.supabaseConfig : state.supabaseConfig;
    if (nextCfg.u || nextCfg.k) {
      saveSupabaseConfigToVault(nextCfg);
    }
    setState({ ...getDefaultState(), ...jsonState, supabaseConfig: nextCfg });
  };

  const handleResetDefault = () => {
    setState({ ...getDefaultState(), supabaseConfig: state.supabaseConfig });
  };

  const handleClearPjdHjd = async () => {
    const dayNum = state.currentDayNum || 1;
    const ylCounts = [11, 11, 11, 10, 7, 11, 9, 9, 10, 8];
    const areaCounts = [12, 12, 11, 10, 7, 12, 11, 10, 10, 8];
    const cleanTodayInputs: Record<number, DailySalesRecord> = {};
    
    state.tkus.forEach((_, idx) => {
      cleanTodayInputs[idx] = {
        v: [0, 0, 0, 0],
        b: [0, 0, 0, 0],
        sold: 0,
        bb: 0,
        pdmV: [0, 0, 0, 0],
        pdm: 0,
        yl: state.tkus[idx]?.jumlahYl || ylCounts[idx] || 10,
        ar: state.tkus[idx]?.jumlahArea || areaCounts[idx] || 10,
        jwp: (state.tkus[idx]?.jumlahYl || ylCounts[idx] || 10) * dayNum,
      };
    });

    // Hanya bulan kerja yang sedang aktif yang dikosongkan; bulan lain tidak disentuh.
    const activeKey = getPeriodInfo(state).key;
    const keepOtherMonths = <T,>(src: Record<string, T> | undefined): Record<string, T> => {
      const out: Record<string, T> = {};
      Object.keys(src || {}).forEach(d => { if (!d.startsWith(activeKey + '-')) out[d] = (src as Record<string, T>)[d]; });
      return out;
    };
    const nextState: AppState = {
      ...state,
      pjd: keepOtherMonths(state.pjd),
      hjd: keepOtherMonths(state.hjd),
      bbHarian: {},
      todayInputs: cleanTodayInputs
    };

    setState(nextState);
    saveAppState(nextState);

    if (state.supabaseConfig.u && state.supabaseConfig.k) {
      setIsSyncing(true);
      setSyncStatus('syncing');
      const ok = await saveStateToSupabase(nextState, true);
      setIsSyncing(false);
      setSyncStatus(ok ? 'synced' : 'error');
      if (ok) {
        showToast('Data input harian (PJD & HJD) berhasil dikosongkan dan disinkronkan ke Supabase!', 'success');
      } else {
        showToast('Data input harian (PJD & HJD) lokal telah dikosongkan.', 'info');
      }
    } else {
      showToast('Seluruh data input harian (PJD & HJD) telah dikosongkan.', 'success');
    }
  };

  // If not logged in, render Login View
  if (!state.role) {
    return (
      <div className={state.theme === 'dark' ? 'dark' : ''}>
        <LoginView
          tkus={state.tkus}
          supabaseConfig={state.supabaseConfig}
          onLogin={handleLogin}
          onUpdateSupabase={handleUpdateSupabase}
          showToast={showToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Render Admin or TKU App View
  return (
    <div className={`min-h-screen bg-neutral-100/60 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white transition-colors ${state.theme === 'dark' ? 'dark' : ''}`}>
      {/* Top Bar Navigation */}
      <Navbar
        state={state}
        onLogout={handleLogout}
        onToggleTheme={handleToggleTheme}
        onExport={handleExportJson}
        onSelectMenu={handleSelectMenu}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
        onManualSync={() => refreshFromCloud(true)}
        onSwitchToTku={(idx) => {
          lastActiveRef.current = Date.now();
          saveAppSession('t', idx);
          setState(prev => ({ ...prev, role: 't', activeTkuId: idx }));
          showToast(`Beralih ke akun ${state.tkus[idx]?.nama}`, 'info');
        }}
        onSwitchToAdmin={() => {
          lastActiveRef.current = Date.now();
          saveAppSession('a', state.activeTkuId);
          setState(prev => ({ ...prev, role: 'a', currentMenu: 'Dashboard' }));
          showToast('Beralih ke Mode Admin (Cabang)', 'info');
        }}
        onToggleDrawer={() => {
          // Satu tombol untuk dua mode: di HP membuka/menutup drawer overlay,
          // di tablet/desktop menampilkan/menyembunyikan sidebar statis.
          // Keduanya independen, tapi hanya salah satu yang tampak lewat CSS
          // breakpoint, jadi aman ditoggle bersamaan.
          setDrawerOpen(o => !o);
          setSidebarCollapsed(o => !o);
        }}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1600px] mx-auto">
        {/* Sidebar Navigasi untuk Admin maupun TKU */}
        {state.role && (
          <Sidebar
            role={state.role}
            currentMenu={state.role === 't' ? tkuSubMenu : state.currentMenu}
            onSelectMenu={(m) => {
              if (state.role === 't') {
                setTkuSubMenu(m as any);
                setDrawerOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                handleSelectMenu(m);
              }
            }}
            tkusCount={state.tkus.filter(t => t.aktif).length}
            activeTkuName={state.tkus[state.activeTkuId]?.nama}
            activeTkuRayon={state.tkus[state.activeTkuId]?.rayon}
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onOpenDrawer={() => setDrawerOpen(true)}
            collapsed={sidebarCollapsed}
            onCollapse={() => setSidebarCollapsed(true)}
            onSwitchToAdmin={() => {
              lastActiveRef.current = Date.now();
              saveAppSession('a', state.activeTkuId);
              setState(prev => ({ ...prev, role: 'a', currentMenu: 'Dashboard' }));
              showToast('Beralih ke Mode Admin (Cabang)', 'info');
            }}
          />
        )}

        {/* Tombol melayang cepat untuk membuka kembali menu saat ditutup di mode tablet/desktop */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            title="Buka Menu Samping"
            className="fixed bottom-6 left-6 z-40 hidden md:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-900/90 dark:bg-white/90 text-white dark:text-neutral-900 text-xs font-bold shadow-2xl backdrop-blur-md hover:scale-105 transition-all border border-neutral-700 dark:border-neutral-200 cursor-pointer"
          >
            <PanelLeft className="w-4 h-4 text-brand-500" />
            <span>Buka Menu</span>
          </button>
        )}

        {/* Content Viewport */}
        <main className={`flex-1 p-4 md:p-6 lg:p-8 min-w-0 pb-24 md:pb-6 lg:pb-8`}>
          {state.role === 't' ? (
            /* TKU Operator View */
            <TkuInputView
              state={state}
              activeSubMenu={tkuSubMenu}
              onSelectSubMenu={setTkuSubMenu}
              onSaveTkuInput={handleSaveTkuInput}
              onReviseDailyData={handleReviseDailyData}
              onUpdateBreakdownDay={handleUpdateBreakdownDay}
              onBatchUpdateBreakdown={handleBatchUpdateBreakdown}
              showToast={showToast}
              onSwitchToAdmin={() => {
                lastActiveRef.current = Date.now();
                saveAppSession('a', state.activeTkuId);
                setState(prev => ({ ...prev, role: 'a', currentMenu: 'Dashboard' }));
                showToast('Beralih ke Mode Admin (Cabang)', 'info');
              }}
            />
          ) : (
            /* Admin Views */
            <>
              {(state.currentMenu === 'Dashboard' || state.currentMenu === 'Beranda') && (
                <DashboardView 
                  state={state} 
                  onUpdateRayon={handleUpdateRayon} 
                  onUpdatePembagiHari={handleUpdatePembagiHari}
                  onUpdateActiveDay={handleUpdateActiveDay}
                />
              )}
              {state.currentMenu === 'Penjualan Harian' && (
                <PenjualanHarianView
                  state={state}
                  onSaveDailyData={handleSaveDailyData}
                  showToast={showToast}
                  onUpdatePembagiHari={handleUpdatePembagiHari}
                  onUpdateActiveDay={handleUpdateActiveDay}
                />
              )}
              {state.currentMenu === 'Evaluasi' && (
                <EvaluasiView state={state} onUpdateRayon={handleUpdateRayon} />
              )}
              {state.currentMenu === 'Breakdown & Realisasi' && (
                <BreakdownRealisasiView
                  state={state}
                  onUpdateRayon={handleUpdateRayon}
                  showToast={showToast}
                  onUpdatePembagiHari={handleUpdatePembagiHari}
                  onUpdateActiveDay={handleUpdateActiveDay}
                  onUpdatePembagiKhususTku={handleUpdatePembagiKhususTku}
                />
              )}
              {state.currentMenu === 'Target' && (
                <TargetView
                  state={state}
                  onUpdateTargetHarian={handleUpdateTargetHarian}
                  onUpdateTargetBl={handleUpdateTargetBl}
                  onUpdateTargetTy={handleUpdateTargetTy}
                  onUpdateVariantTarget={handleUpdateVariantTarget}
                  onTarikDariArsip={handleTarikDariArsip}
                  showToast={showToast}
                />
              )}
              {state.currentMenu === 'Profil TKU' && (
                <ProfilTkuView
                  state={state}
                  onUpdateTkuProfile={handleUpdateTkuProfile}
                  onToggleTkuActive={handleToggleTkuActive}
                  onDeleteTku={handleDeleteTku}
                  onAddTku={handleAddTku}
                  showToast={showToast}
                />
              )}
              {state.currentMenu === 'Arsip' && (
                <ArsipView
                  state={state}
                  onSaveCurrentMonthArchive={handleSaveCurrentMonthArchive}
                  onUnlockArchive={handleUnlockArchive}
                  onImportCsvArchive={handleImportCsvArchive}
                  onSelectArchive={handleSelectArchive}
                  onDeleteArchive={handleDeleteArchive}
                  showToast={showToast}
                  isSyncing={isSyncing}
                  syncStatus={syncStatus}
                  onManualSync={() => refreshFromCloud(true)}
                  onForcePushArchive={handleForcePushArchive}
                />
              )}
              {state.currentMenu === 'Pengaturan' && (
                <PengaturanView
                  state={state}
                  onUpdateSupabase={handleUpdateSupabase}
                  onExportJson={handleExportJson}
                  onImportJson={handleImportJson}
                  onResetDefault={handleResetDefault}
                  showToast={showToast}
                  onUpdatePembagiHari={handleUpdatePembagiHari}
                  onUpdateActiveDay={handleUpdateActiveDay}
                  onClearPjdHjd={handleClearPjdHjd}
                  onManualSync={() => refreshFromCloud(true)}
                  onSwitchPeriod={handleSwitchPeriod}
                  onBackupNow={handleBackupNow}
                  isSyncing={isSyncing}
                  syncStatus={syncStatus}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Feedback Toast Alerts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
