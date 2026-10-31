import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Building2, 
  RotateCcw, 
  Users, 
  TrendingUp, 
  Target, 
  Save, 
  Sparkles,
  Calendar,
  Layers,
  BarChart3,
  CalendarRange,
  Edit3,
  PackageCheck,
  Info,
  SlidersHorizontal,
  Clock,
  MapPin,
  Phone,
  Copy,
  ArrowLeftRight,
  Pencil,
  Trash2
} from 'lucide-react';
import { AppState, VARIANTS, VariantCode, DailySalesRecord } from '../types';
import { TrendChart } from '../components/TrendChart';
import { EvaluasiPanel } from '../components/EvaluasiPanel';
import { 
  formatNumber, 
  formatDecimal, 
  formatPercent, 
  formatDiff, 
  getStatusClass, 
  getBbStatusClass, 
  formatDateIndo,
  getPembagiKhususTku,
  getJwpAsOf,
  truncFixed,
  getPeriodInfo,
  getCalendarPeriodKey,
  isPeriodBehindCalendar,
  periodLabelOf,
  SEED_PERIOD
} from '../services/storage';
import { useConfirm } from '../components/ConfirmDialog';
import { REAL_TKU_DAILY_SALES } from '../data/realSalesSeptember2026';
import { saveTkuInputDraft, loadTkuInputDraft, clearTkuInputDraft } from '../services/inputDraft';

interface TkuInputViewProps {
  state: AppState;
  activeSubMenu?: TkuSubMenu;
  onSelectSubMenu?: (sub: TkuSubMenu) => void;
  onSaveTkuInput: (tkuIdx: number, data: DailySalesRecord, targetDate?: string) => void;
  onReviseDailyData: (date: string, tkuIdx: number, data: DailySalesRecord) => void;
  onUpdateBreakdownDay: (tkuIdx: number, variant: 'ALL' | VariantCode, dayIdx: number, val: number) => void;
  onBatchUpdateBreakdown?: (tkuIdx: number, updates: { variant: VariantCode | 'ALL'; dayIdx: number; val: number }[]) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSwitchToAdmin?: () => void;
}

type TkuSubMenu = 'ringkasan' | 'input' | 'breakdown' | 'realisasi';

// Kolom angka yang bisa dihapus & diketik ulang dengan bebas (angka depan tidak "nyangkut").
// Nilai disimpan saat selesai mengetik (keluar dari kolom / tekan Enter), bukan tiap ketukan.
const OpsNumberField: React.FC<{
  value: number;
  min?: number;
  onCommit: (n: number) => void;
  className?: string;
  placeholder?: string;
}> = ({ value, min = 0, onCommit, className, placeholder }) => {
  const [draft, setDraft] = useState<string>(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = () => {
    const t = draft.trim();
    if (t === '' && min > 0) {
      setDraft(String(value)); // kolom wajib minimal 1: kosong = batal, kembalikan nilai lama
      return;
    }
    const n = Math.max(min, parseInt(t, 10) || 0);
    setDraft(String(n));
    if (n !== value) onCommit(n);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft}
      placeholder={placeholder}
      onFocus={(e) => { setFocused(true); e.target.select(); }}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={() => { setFocused(false); commit(); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className={className}
    />
  );
};

export const TkuInputView: React.FC<TkuInputViewProps> = ({
  state,
  activeSubMenu: activeSubMenuProp,
  onSelectSubMenu,
  onSaveTkuInput,
  onReviseDailyData,
  onUpdateBreakdownDay,
  onBatchUpdateBreakdown,
  showToast,
  onSwitchToAdmin
}) => {
  // Separated Sub-Menus:
  // 1. ringkasan: Ringkasan Informatif TKU (Dashboard TKU) - Di depan
  // 2. input: Input Penjualan Hari Ini - Menu kedua
  // 3. breakdown: Breakdown Rencana Target (Mingguan / Bulanan)
  // 4. realisasi: Realisasi Penjualan Aktual (Mingguan / Bulanan)
  const [internalSubMenu] = useState<TkuSubMenu>('ringkasan');
  const activeSubMenu = activeSubMenuProp !== undefined ? activeSubMenuProp : internalSubMenu;
  
  const tkuIdx = state.activeTkuId;
  const tku = state.tkus[tkuIdx] || state.tkus[0];
  const day = state.currentDayNum;
  const divider = getPembagiKhususTku(state, tkuIdx);
  const formatAkmDiffPair = (diff: number, days = divider) =>
    `${formatDiff(diff)}/${formatDiff(Math.trunc(diff / Math.max(1, days)))}`;
  // Info bulan kerja (tidak lagi di-hard-code September 2026)
  const period = getPeriodInfo(state);
  const { ask: askConfirm, dialog: confirmDialog } = useConfirm();
  const DIM = period.daysInMonth;
  const PY = period.year;
  const PM0 = period.monthIndex;

  // Tanggal input: default = tanggal update (hari ini), bisa dipilih mundur untuk mengisi tanggal yang terlewat
  const [inputDate, setInputDate] = useState<string>(() => {
    try {
      const savedDate = localStorage.getItem('yk_active_input_date');
      if (savedDate && savedDate >= `${period.key}-01` && savedDate <= state.activeDate) {
        return savedDate;
      }
    } catch (_) {}
    return state.activeDate;
  });
  useEffect(() => {
    // Sinkronkan hanya jika activeDate bertambah dan inputDate belum diatur manual
    if (!inputDate || inputDate > state.activeDate) {
      setInputDate(state.activeDate);
    }
  }, [state.activeDate]);

  // Handler perpindahan tanggal input:
  // Jika ada ketikan yang belum disimpan di tanggal lama, buang drafnya agar saat kembali
  // form menampilkan data resmi yang tersimpan di database.
  const handleDateChange = (newDate: string) => {
    if (!newDate || newDate === inputDate) return;
    clearTkuInputDraft(inputDate, tkuIdx);
    setInputDate(newDate);
    try {
      localStorage.setItem('yk_active_input_date', newDate);
    } catch (_) {}
  };

  // Deteksi perpindahan menu: jika operator keluar dari sub-menu 'input' (misal ke Ringkasan,
  // Breakdown, atau Realisasi), buang draf uncommitted agar saat kembali ke 'input',
  // form menampilkan data resmi yang sudah tersimpan di database.
  const prevSubMenuRef = useRef(activeSubMenu);
  useEffect(() => {
    if (prevSubMenuRef.current === 'input' && activeSubMenu !== 'input') {
      clearTkuInputDraft(inputDate, tkuIdx);
    }
    prevSubMenuRef.current = activeSubMenu;
  }, [activeSubMenu, inputDate, tkuIdx]);
  // Catatan: inputDate tidak di-reset saat ganti sub-menu agar operator yang sedang mengisi backdate tidak kehilangan konteks tanggalnya.
  const isBackdate = inputDate !== state.activeDate;
  const inputDay = Number(inputDate.slice(8, 10)) || day;
  const minInputDate = `${period.key}-01`;
  const maxInputDate = state.activeDate;
  const backdateExisting = isBackdate ? state.pjd[inputDate]?.[tkuIdx] : null;

  // Pengaman: kalau kalender HP sudah pindah bulan tetapi bulan kerja aplikasi belum, penjualan yang disimpan
  // akan masuk ke bulan kerja LAMA. Minta konfirmasi eksplisit sebelum menyimpan.
  const guardPeriodSave = (proceed: () => void) => {
    if (!isPeriodBehindCalendar(state)) {
      proceed();
      return;
    }
    const calLabel = periodLabelOf(getCalendarPeriodKey());
    askConfirm({
      title: `Bulan kerja masih ${period.label}`,
      message: `Kalender sudah ${calLabel}, tetapi bulan kerja aplikasi masih ${period.label}.\nData ini akan tersimpan ke tanggal ${formatDateIndo(inputDate)}, BUKAN ke ${calLabel}.\n\nKalau Anda mengisi penjualan hari ini, pilih Batal, lalu minta admin memindahkan bulan kerja dan tekan Sinkron.`,
      tone: 'danger',
      confirmLabel: `Tetap simpan ke ${period.label}`,
      cancelLabel: 'Batal',
      onConfirm: proceed
    });
  };

  // Form states for Input Penjualan: inisialisasi awal bersih [0,0,0,0]
  const [salesV, setSalesV] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [bbV, setBbV] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [pdmV, setPdmV] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [yl, setYl] = useState<number>(tku.jumlahYl || 10);
  const [ar, setAr] = useState<number>(tku.jumlahArea || 10);
  const [l250, setL250] = useState<number>(tku.l250 ?? 0);
  const [l300, setL300] = useState<number>(tku.l300 ?? 0);
  const [jwpCustom, setJwpCustom] = useState<number>(tku.akmJwp || 0);
  const [absen, setAbsen] = useState<number>(0);
  const [frek, setFrek] = useState<number>(0);
  // Kondisi TKU (absen, frek, <250, <300) disimpan lewat tombolnya sendiri (tidak otomatis).
  // opsDirty = ada perubahan yang belum disimpan; selama dirty, nilai ketikan tidak ditimpa saat data lain disimpan.
  const [opsDirty, setOpsDirty] = useState(false);
  const opsDirtyRef = useRef(false);
  opsDirtyRef.current = opsDirty;
  const opsKeyRef = useRef<string>('');

  // Breakdown Sub-Menu States
  const [selectedBreakdownPeriod, setSelectedBreakdownPeriod] = useState<'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'ALL'>('M1');
  // Tombol panah: tampilkan rencana breakdown ASLI pada tanggal yang sudah tertutup realisasi (hanya lihat, tidak bisa diedit)
  const [showOrigPlan, setShowOrigPlan] = useState<boolean>(false);
  // Mode Edit Rencana: membuka kunci tanggal yang sudah lewat supaya rencana breakdown-nya bisa dikoreksi / dihapus
  const [editPastPlan, setEditPastPlan] = useState<boolean>(false);
  const [clearBeforeDay, setClearBeforeDay] = useState<number>(27);
  const [clearAllTku, setClearAllTku] = useState<boolean>(false);
  // Seleksi rentang sel breakdown ala spreadsheet (seret mouse / Shift+klik / Shift+panah)
  const [selA, setSelA] = useState<{ d: number; v: number } | null>(null);
  const [selB, setSelB] = useState<{ d: number; v: number } | null>(null);
  const bdDragging = useRef(false);
  // Mode Pilih Sel (untuk HP / layar sentuh): ketuk sel awal, lalu ketuk sel akhir
  const [bdSelMode, setBdSelMode] = useState<boolean>(false);
  const bdClipRef = useRef<string>('');
  const bdWrapRef = useRef<HTMLDivElement | null>(null);
  const bdJustDraggedRef = useRef<number>(0);
  useEffect(() => {
    const up = () => { bdDragging.current = false; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  // Mode Pilih Sel di HP: tekan-tahan sebentar pada sel lalu geser jari untuk memilih rentang sel
  // (lewati banyak sel sekaligus). Geser cepat sebelum tahan = scroll biasa. Ketuk-ketuk tetap bisa.
  useEffect(() => {
    const el = bdWrapRef.current;
    if (!bdSelMode || !el) return;
    let timer: number | null = null;
    let armed = false;
    let sx = 0, sy = 0;
    const cellAt = (x: number, y: number) => {
      const t = document.elementFromPoint(x, y) as HTMLElement | null;
      const td = t?.closest('td[data-bd-d]') as HTMLElement | null;
      if (!td) return null;
      const d = parseInt(td.dataset.bdD || '0', 10);
      const v = parseInt(td.dataset.bdV || '0', 10);
      return d ? { d, v } : null;
    };
    const cancel = () => { if (timer !== null) { window.clearTimeout(timer); timer = null; } };
    const onStart = (e: TouchEvent) => {
      cancel(); armed = false;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY;
      const c = cellAt(sx, sy);
      if (!c) return;
      timer = window.setTimeout(() => {
        armed = true;
        setSelA(c); setSelB(c);
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch { /* abaikan */ } }
      }, 280);
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (!armed) {
        if (Math.abs(t.clientX - sx) > 8 || Math.abs(t.clientY - sy) > 8) cancel();
        return;
      }
      e.preventDefault(); // saat mode geser aktif, halaman tidak ikut ter-scroll
      // gulir otomatis bila jari dekat tepi atas/bawah layar
      if (t.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
      else if (t.clientY < 70) window.scrollBy(0, -14);
      const c = cellAt(t.clientX, t.clientY);
      if (c) setSelB(prev => (prev && prev.d === c.d && prev.v === c.v ? prev : c));
    };
    const onEnd = () => {
      cancel();
      if (armed) bdJustDraggedRef.current = Date.now();
      armed = false;
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      cancel();
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [bdSelMode]);

  // Realisasi Sub-Menu States (M1 s/d M5 & Satu Bulan)
  const [selectedRealisasiPeriod, setSelectedRealisasiPeriod] = useState<'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'ALL'>('ALL');
  const [inlineEditDay, setInlineEditDay] = useState<number | null>(null);
  const [inlineEditV, setInlineEditV] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [inlineEditBbV, setInlineEditBbV] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [inlineEditPdmV, setInlineEditPdmV] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [inlineEditAbsen, setInlineEditAbsen] = useState<number>(0);
  const [inlineEditFrek, setInlineEditFrek] = useState<number>(0);
  const [inlineEditL250, setInlineEditL250] = useState<number>(0);
  const [inlineEditL300, setInlineEditL300] = useState<number>(0);

  // Sync form jika TKU aktif / tanggal input berubah
  useEffect(() => {
    let input: DailySalesRecord | null | undefined;
    // Periksa apakah tanggal ini sudah pernah disimpan di database pjd atau todayInputs
    input = state.pjd[inputDate]?.[tkuIdx] || (inputDate === state.activeDate ? state.todayInputs[tkuIdx] : undefined);
    if (!input && period.key === SEED_PERIOD) {
      // Tanggal belum pernah direvisi khusus bulan data resmi: pakai angka dasar spreadsheet
      const seed = (REAL_TKU_DAILY_SALES[tkuIdx] || []).find(item => item.d === inputDay);
      if (seed) {
        input = {
          v: seed.v,
          b: [0, 0, 0, 0],
          sold: seed.sold,
          bb: 0
        };
      }
    }

    // Cek apakah ada draf ketikan yang belum sempat disimpan untuk tanggal dan TKU ini
    const draft = loadTkuInputDraft(inputDate, tkuIdx);

    // Tentukan apakah draf vs data resmi/seed yang memiliki angka penjualan nyata (> 0)
    const draftHasSales = Boolean(draft && Array.isArray(draft.v) && draft.v.some(x => x > 0));
    const inputHasSales = Boolean(input && Array.isArray(input.v) && input.v.some(x => x > 0));

    // Jika data tersimpan di pjd/todayInputs sudah ada, data tersimpan tersebut adalah acuan utama
    const hasSavedInput = Boolean(input && Array.isArray(input.v));
    const finalSalesV: [number, number, number, number] = hasSavedInput
      ? input!.v
      : (draftHasSales ? draft!.v : (inputHasSales ? input!.v : (draft?.v || [0, 0, 0, 0])));

    const draftHasBb = Boolean(draft && Array.isArray(draft.b) && draft.b.some(x => x > 0));
    const inputHasBb = Boolean(input && Array.isArray(input.b) && input.b.some(x => x > 0));
    const finalBbV: [number, number, number, number] = hasSavedInput
      ? input!.b
      : (draftHasBb ? draft!.b : (inputHasBb ? input!.b : (draft?.b || [0, 0, 0, 0])));

    const draftHasPdm = Boolean(draft && Array.isArray(draft.pdmV) && draft.pdmV.some(x => x > 0));
    const inputHasPdm = Boolean(input && ((Array.isArray(input?.pdmV) && input.pdmV.some(x => x > 0)) || Boolean(input?.pdm && input.pdm > 0)));
    const finalPdmV: [number, number, number, number] = hasSavedInput
      ? (input!.pdmV || [input!.pdm || 0, 0, 0, 0])
      : (draftHasPdm ? draft!.pdmV : (inputHasPdm ? (input!.pdmV || [input!.pdm || 0, 0, 0, 0]) : (draft?.pdmV || [0, 0, 0, 0])));

    setSalesV(finalSalesV);
    setBbV(finalBbV);
    setPdmV(finalPdmV);

    setYl(draft?.yl ?? input?.yl ?? tku.jumlahYl ?? 10);
    setAr(draft?.ar ?? input?.ar ?? tku.jumlahArea ?? 10);
    const opsKey = `${inputDate}_${tkuIdx}`;
    if (opsKeyRef.current !== opsKey) {
      opsKeyRef.current = opsKey;
      opsDirtyRef.current = false;
      setOpsDirty(false);
    }
    if (!opsDirtyRef.current) {
      setL250(input?.l250 ?? draft?.l250 ?? tku.l250 ?? 0);
      setL300(input?.l300 ?? draft?.l300 ?? tku.l300 ?? 0);
      setAbsen(input?.absen ?? draft?.absen ?? tku.absenYl ?? 0);
      setFrek(input?.frek ?? draft?.frek ?? tku.frekuensiAbsen ?? 0);
      // JWP diisi manual: tampilkan isian tanggal ini, atau nilai JWP TKU saat ini sebagai titik awal
      setJwpCustom(input?.jwpManual ?? tku.akmJwp ?? 0);
    }
  }, [tkuIdx, state.pjd, state.todayInputs, inputDate, tku, divider, activeSubMenu]);

  // Otomatis simpan draft ketikan ke memori perangkat agar aman jika halaman ter-refresh
  const lastAutosaveKeyRef = useRef<string>('');
  useEffect(() => {
    // Saat TKU/tanggal baru saja diganti, state form masih berisi data TKU/tanggal sebelumnya
    // (belum sempat dimuat ulang). Jangan simpan/hapus draf dulu agar data tidak tertukar atau hilang.
    const curKey = `${inputDate}_${tkuIdx}`;
    if (lastAutosaveKeyRef.current !== curKey) {
      lastAutosaveKeyRef.current = curKey;
      return;
    }
    saveTkuInputDraft(inputDate, tkuIdx, salesV, bbV, pdmV, {
      yl,
      ar,
      l250,
      l300,
      jwpCustom,
      absen,
      frek
    });
  }, [inputDate, tkuIdx, salesV, bbV, pdmV, yl, ar, l250, l300, jwpCustom, absen, frek]);

  // Real-time calculations for Input Penjualan
  const totalSoldToday = salesV.reduce((a, b) => a + b, 0);
  const totalBbToday = bbV.reduce((a, b) => a + b, 0);
  const totalPdmToday = pdmV.reduce((a, b) => a + b, 0);
  const totalCirculation = totalSoldToday + totalBbToday;
  const bbPct = totalCirculation > 0 ? totalBbToday / totalCirculation : 0;
  const pctL250 = yl > 0 ? l250 / yl : 0;
  const pctL300 = yl > 0 ? l300 / yl : 0;

  const effectiveJwp = tku.akmJwp || 0; // JWP diisi manual oleh TKU (nilai tersimpan terbaru)
  const tkuAkmTotal = tku.penjualanAkm.reduce((a, b) => a + b, 0);
  const tkuDailyAvg = divider > 0 ? tkuAkmTotal / divider : 0;
  const tkuTarget = tku.targetHarian;
  const diffVsTarget = tkuDailyAvg - tkuTarget;
  const syl = effectiveJwp > 0 ? tkuAkmTotal / effectiveJwp : null;

  // Handle Save Input Penjualan Hari Ini (Data tetap muncul dan tidak hilang dari form setelah disimpan)
  // Tombol ini HANYA menyimpan penjualan (PJL, BB, PDM). Kondisi TKU (absen, frek, <250, <300)
  // punya tombol simpan sendiri; nilainya yang sudah tersimpan dipertahankan apa adanya.
  const doSave = () => {
    const savedRec = state.pjd[inputDate]?.[tkuIdx] || (inputDate === state.activeDate ? state.todayInputs[tkuIdx] : undefined);
    const record: DailySalesRecord = {
      v: salesV,
      b: bbV,
      sold: totalSoldToday,
      bb: totalBbToday,
      pdmV: pdmV,
      pdm: totalPdmToday,
      yl: tku.jumlahYl || 10,
      ar: tku.jumlahArea || 10,
      ...(savedRec?.l250 !== undefined ? { l250: savedRec.l250 } : {}),
      ...(savedRec?.l300 !== undefined ? { l300: savedRec.l300 } : {}),
      ...(savedRec?.absen !== undefined ? { absen: savedRec.absen } : {}),
      ...(savedRec?.frek !== undefined ? { frek: savedRec.frek } : {}),
      ...(savedRec?.jwpManual !== undefined ? { jwpManual: savedRec.jwpManual } : {}),
      ...(savedRec?.jwp !== undefined ? { jwp: savedRec.jwp } : {}),
    };

    // Pastikan draf lokal juga menyimpan data terkini yang disimpan agar form tetap terisi
    saveTkuInputDraft(inputDate, tkuIdx, salesV, bbV, pdmV, {
      yl: tku.jumlahYl || 10,
      ar: tku.jumlahArea || 10,
      l250,
      l300,
      jwpCustom,
      absen,
      frek
    });

    // Simpan salinan permanen ke localStorage (lokal ledger anti-hilang)
    try {
      localStorage.setItem(`yk_local_backup_pjd_${inputDate}_${tkuIdx}`, JSON.stringify({
        record,
        savedAt: Date.now()
      }));
    } catch (_) {}

    if (isBackdate) {
      if (inputDate < minInputDate || inputDate > maxInputDate) {
        showToast('Tanggal di luar rentang bulan kerja / melewati tanggal update.', 'error');
        return;
      }
      onReviseDailyData(inputDate, tkuIdx, record);
      showToast(`Penjualan ${tku.nama} tanggal ${formatDateIndo(inputDate)} berhasil disimpan!`, 'success');
      return;
    }

    onSaveTkuInput(tkuIdx, record, inputDate);

    if (totalSoldToday >= tkuTarget) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore
      }
    }

    showToast(`Penjualan ${tku.nama} tanggal ${formatDateIndo(inputDate)} berhasil disimpan!`, 'success');
  };
  const handleSave = () => guardPeriodSave(doSave);

  // Helper: Retrieve actual daily sales for a specific date and variant (hanya membaca data yang sudah tersimpan di pjd)
  const getActualSalesForDay = (d: number, variant: 'ALL' | VariantCode): number => {
    const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
    const pjdRec = state.pjd[dStr]?.[tkuIdx];
    if (pjdRec) {
      if (variant === 'ALL') return pjdRec.sold || 0;
      const vIdx = VARIANTS.findIndex(v => v.code === variant);
      return pjdRec.v[vIdx] || 0;
    }
    const list = period.key === SEED_PERIOD ? (REAL_TKU_DAILY_SALES[tkuIdx] || []) : [];
    const found = list.find(item => item.d === d);
    if (found) {
      if (variant === 'ALL') return found.sold;
      const vIdx = VARIANTS.findIndex(v => v.code === variant);
      return found.v[vIdx] || 0;
    }
    return 0;
  };

  // Helper: Cek apakah pada tanggal d sudah tersimpan transaksi penjualan riil
  const hasActualSavedSalesForDay = (d: number): boolean => {
    const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
    const pjdRec = state.pjd[dStr]?.[tkuIdx];
    if (pjdRec && (pjdRec.sold > 0 || (pjdRec.v && pjdRec.v.some(x => x > 0)))) return true;
    if (period.key === SEED_PERIOD) {
      const list = REAL_TKU_DAILY_SALES[tkuIdx] || [];
      const found = list.find(item => item.d === d);
      if (found && found.sold > 0) return true;
    }
    return false;
  };

  // Tanggal yang sudah lewat (sampai tanggal update / pembagi) dianggap terkunci = realisasi
  const isPastDayLocked = (d: number): boolean => d <= divider;

  // Helper: Retrieve target or actual realized sales for a specific date and variant
  const getPlannedTargetForDay = (d: number, variant: 'ALL' | VariantCode): number => {
    // Tanggal yang SUDAH ADA simpan penjualan: Otomatis ambil dari Penjualan Riil!
    if (hasActualSavedSalesForDay(d)) {
      if (variant === 'ALL') {
        return getActualSalesForDay(d, 'YO') + getActualSalesForDay(d, 'OM') + getActualSalesForDay(d, 'OS') + getActualSalesForDay(d, 'YT');
      }
      return getActualSalesForDay(d, variant);
    }
    // Tanggal yang sudah lewat (<= tanggal update) tapi TKU ini tidak ada transaksi: ikut realisasi = 0,
    // bukan rencana (supaya sama dengan menu Realisasi).
    if (isPastDayLocked(d)) return 0;
    // Tanggal yang BELUM datang: rencana target breakdown tetap tampil.
    // Kecuali hari Minggu (libur, tidak ada transaksi): rencana selalu 0 seperti di Realisasi.
    if (new Date(PY, PM0, d).getDay() === 0) return 0;
    const dayIdx = d - 1;
    if (variant === 'ALL') {
      const arr = state.breakdown[tkuIdx];
      if (arr && arr[dayIdx] !== undefined) return arr[dayIdx];
      const isSun = new Date(PY, PM0, d).getDay() === 0;
      return isSun ? 0 : tku.targetHarian;
    } else {
      const varMap = state.breakdownPerVariant[variant];
      const arr = varMap ? varMap[tkuIdx] : undefined;
      if (arr && arr[dayIdx] !== undefined) return arr[dayIdx];
      const isSun = new Date(PY, PM0, d).getDay() === 0;
      const tg = state.targetPerVariant[variant]?.[tkuIdx]?.tg || Math.round(tku.targetHarian * 0.25);
      return isSun ? 0 : tg;
    }
  };

  // Rencana breakdown ASLI satu tanggal (tanpa digantikan realisasi). Hanya untuk dilihat.
  const getOriginalPlanForDay = (d: number, variant: VariantCode): number => {
    if (new Date(PY, PM0, d).getDay() === 0) return 0; // Minggu libur: rencana 0
    const dayIdx = d - 1;
    const arr = state.breakdownPerVariant?.[variant]?.[tkuIdx];
    if (arr && arr[dayIdx] !== undefined) return arr[dayIdx];
    const tot = state.breakdown?.[tkuIdx]?.[dayIdx];
    if (tot !== undefined) return Math.round(tot * ({ YO: 0.76, OM: 0.09, OS: 0.11, YT: 0.04 } as Record<VariantCode, number>)[variant]);
    return state.targetPerVariant[variant]?.[tkuIdx]?.tg || Math.round(tku.targetHarian * 0.25);
  };
  const getOriginalPlanAllVariants = (d: number) => {
    const yo = getOriginalPlanForDay(d, 'YO');
    const om = getOriginalPlanForDay(d, 'OM');
    const os = getOriginalPlanForDay(d, 'OS');
    const yt = getOriginalPlanForDay(d, 'YT');
    return { yo, om, os, yt, total: yo + om + os + yt };
  };

  // Helper: Retrieve daily BB and PDM
  const getDailyOpsForDay = (d: number) => {
    const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
    const pjdRec = state.pjd[dStr]?.[tkuIdx];
    return {
      bb: pjdRec?.bb ?? 0,
      pdm: pjdRec?.pdm ?? 0
    };
  };

  // In-cell Direct Editing & Excel Copy-Paste Handlers for Breakdown
  const VAR_CODES: VariantCode[] = useMemo(() => ['YO', 'OM', 'OS', 'YT'], []);

  // Definisi minggu dari kalender bulan kerja: minggu berakhir hari SABTU (sama dengan getWeeksOfMonth di admin).
  // Pembagi mingguan = tanggal hari Sabtu dalam minggu itu; jika minggu tsb tidak punya Sabtu
  // (minggu terakhir yang terpotong akhir bulan) = tanggal terakhir bulan.
  const WEEKS = useMemo(() => {
    const list: { id: number; label: string; start: number; end: number; saturdayDate: number; days: number[] }[] = [];
    let start = 1;
    for (let d = 1; d <= DIM; d++) {
      if (new Date(PY, PM0, d).getDay() === 6 || d === DIM) {
        const days = Array.from({ length: d - start + 1 }, (_, i) => start + i);
        const sat = days.find(x => new Date(PY, PM0, x).getDay() === 6);
        const id = list.length + 1;
        list.push({ id, label: `Minggu ${id}`, start, end: d, saturdayDate: sat ?? d, days });
        start = d + 1;
      }
    }
    return list;
  }, [PY, PM0, DIM]);

  const handleCellChange = (d: number, variant: VariantCode, val: number) => {
    const dayIdx = d - 1;
    onUpdateBreakdownDay(tkuIdx, variant, dayIdx, val);
  };

  // Hapus (jadikan 0) rencana breakdown tanggal 1 s/d (beforeDay - 1). Realisasi/penjualan riil TIDAK disentuh.
  const handleClearPlanBefore = (beforeDay: number, allTku: boolean) => {
    const last = Math.min(Math.max(1, Math.floor(beforeDay)) - 1, DIM);
    if (last < 1) {
      showToast('Tidak ada tanggal yang dihapus.', 'info');
      return;
    }
    const updates: { variant: VariantCode; dayIdx: number; val: number }[] = [];
    for (let d = 1; d <= last; d++) {
      VAR_CODES.forEach(v => updates.push({ variant: v, dayIdx: d - 1, val: 0 }));
    }
    const targets = allTku ? state.tkus.map((_, i) => i) : [tkuIdx];
    askConfirm({
      title: 'Hapus rencana breakdown?',
      message: `Rencana breakdown tgl 1 s/d ${last} untuk ${allTku ? `semua TKU (${targets.length})` : tku.nama} akan dijadikan 0. Data penjualan/realisasi tidak berubah.`,
      confirmLabel: 'Ya, Hapus',
      tone: 'danger',
      onConfirm: () => {
        targets.forEach(i => {
          if (onBatchUpdateBreakdown) onBatchUpdateBreakdown(i, updates);
          else updates.forEach(u => onUpdateBreakdownDay(i, u.variant, u.dayIdx, u.val));
        });
        showToast(`Rencana breakdown tgl 1–${last} berhasil dihapus.`, 'success');
      }
    });
  };

  // ---- Seleksi, salin, tempel, hapus rentang sel (seperti spreadsheet) ----
  const getBdRect = () => {
    if (!selA || !selB) return null;
    return {
      d1: Math.min(selA.d, selB.d), d2: Math.max(selA.d, selB.d),
      v1: Math.min(selA.v, selB.v), v2: Math.max(selA.v, selB.v)
    };
  };
  const isBdMulti = () => {
    const r = getBdRect();
    return !!r && (r.d1 !== r.d2 || r.v1 !== r.v2);
  };
  // Sel terkunci = tanggal tertutup realisasi (kecuali sedang Mode Edit Rencana; hari Minggu tetap terkunci)
  const isCellLocked = (d: number) => {
    const closed = hasActualSavedSalesForDay(d) || isPastDayLocked(d);
    const isSunday = new Date(PY, PM0, d).getDay() === 0;
    return closed && !(editPastPlan && !isSunday);
  };
  const applyBdUpdates = (updates: { variant: VariantCode; dayIdx: number; val: number }[]) => {
    if (updates.length === 0) return;
    if (onBatchUpdateBreakdown) onBatchUpdateBreakdown(tkuIdx, updates);
    else updates.forEach(u => onUpdateBreakdownDay(tkuIdx, u.variant, u.dayIdx, u.val));
  };
  const clearBdSelection = (): number => {
    const r = getBdRect();
    if (!r) return 0;
    const updates: { variant: VariantCode; dayIdx: number; val: number }[] = [];
    for (let d = r.d1; d <= r.d2; d++) {
      if (isCellLocked(d)) continue;
      for (let vi = r.v1; vi <= r.v2; vi++) updates.push({ variant: VAR_CODES[vi], dayIdx: d - 1, val: 0 });
    }
    applyBdUpdates(updates);
    return updates.length;
  };
  const buildBdText = (): string => {
    const r = getBdRect();
    if (!r) return '';
    const lines: string[] = [];
    for (let d = r.d1; d <= r.d2; d++) {
      const cells: string[] = [];
      for (let vi = r.v1; vi <= r.v2; vi++) {
        const el = document.getElementById(`bd-input-${d}-${VAR_CODES[vi]}`) as HTMLInputElement | null;
        cells.push(el?.value || '0');
      }
      lines.push(cells.join('\t'));
    }
    return lines.join('\n');
  };
  const writeClipboard = async (text: string) => {
    bdClipRef.current = text;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { /* buffer internal tetap tersedia */ }
    }
  };
  const handleBtnCopy = async () => {
    if (!getBdRect()) { showToast('Pilih sel dulu.', 'info'); return; }
    await writeClipboard(buildBdText());
    showToast('Sel breakdown disalin.', 'success');
  };
  const handleBtnCut = async () => {
    if (!getBdRect()) { showToast('Pilih sel dulu.', 'info'); return; }
    await writeClipboard(buildBdText());
    const n = clearBdSelection();
    showToast(n > 0 ? 'Sel breakdown dipotong.' : 'Sel terkunci tidak bisa dipotong.', n > 0 ? 'success' : 'info');
  };
  const handleBtnPaste = async () => {
    const r = getBdRect();
    if (!r) { showToast('Pilih sel tujuan dulu.', 'info'); return; }
    let text = '';
    try { text = await navigator.clipboard.readText(); } catch { text = ''; }
    if (!text) text = bdClipRef.current;
    if (!text) {
      // Browser HP sering memblokir pembacaan clipboard otomatis: minta tempel manual lewat kotak isian
      const manual = window.prompt('Clipboard tidak bisa dibaca otomatis. Tekan-tahan di kotak ini lalu pilih Tempel:', '');
      if (!manual) { showToast('Clipboard kosong. Salin dulu sel yang ingin ditempel.', 'info'); return; }
      text = manual;
    }
    pasteText(text, r.d1, VAR_CODES[r.v1]);
  };
  const handleBtnClear = () => {
    if (!getBdRect()) { showToast('Pilih sel dulu.', 'info'); return; }
    const n = clearBdSelection();
    showToast(n > 0 ? `${n} sel dikosongkan.` : 'Sel terkunci tidak bisa dihapus.', n > 0 ? 'success' : 'info');
  };
  // Mode Pilih Sel: ketuk 1 = sel awal, ketuk 2 = sel akhir (rentang). Ketuk lagi = mulai pilihan baru.
  const handleTableTapSelect = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!bdSelMode) return;
    if (Date.now() - bdJustDraggedRef.current < 500) { e.preventDefault(); return; }
    const td = (e.target as HTMLElement).closest('td[data-bd-d]') as HTMLElement | null;
    if (!td) return;
    e.preventDefault();
    const d = parseInt(td.dataset.bdD || '0', 10);
    const v = parseInt(td.dataset.bdV || '0', 10);
    if (!d) return;
    if (selA && selB && selA.d === selB.d && selA.v === selB.v && !(selA.d === d && selA.v === v)) {
      setSelB({ d, v });
    } else {
      setSelA({ d, v });
      setSelB({ d, v });
    }
  };

  const handleCellCopy = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!isBdMulti()) return; // satu sel: salin biasa
    e.preventDefault();
    e.clipboardData.setData('text/plain', buildBdText());
    showToast('Sel breakdown disalin. Tempel di sel mana pun atau di Excel/Sheets.', 'success');
  };
  const handleCellCut = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!isBdMulti()) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', buildBdText());
    const n = clearBdSelection();
    showToast(n > 0 ? 'Sel breakdown dipotong.' : 'Sel terkunci tidak bisa dipotong.', n > 0 ? 'success' : 'info');
  };

  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startDay: number,
    startVariant: VariantCode
  ) => {
    e.preventDefault();
    const clipData = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
    pasteText(clipData, startDay, startVariant);
  };

  const pasteText = (clipData: string, startDay: number, startVariant: VariantCode) => {
    if (!clipData) return;

    const rawRows = clipData.split(/\r\n|\n|\r/);
    while (rawRows.length > 1 && rawRows[rawRows.length - 1].trim() === '') rawRows.pop(); // baris kosong di akhir (khas Excel)
    if (rawRows.length === 0 || (rawRows.length === 1 && rawRows[0].trim() === '')) return;

    const grid = rawRows.map(rowStr => {
      let cells = rowStr.split('\t');
      if (cells.length === 1 && (rowStr.includes(';') || rowStr.includes(','))) cells = rowStr.split(/[;,]/);
      return cells.map(c => {
        const cleaned = c.trim().replace(/[^\d]/g, '');
        const n = cleaned === '' ? 0 : parseInt(cleaned, 10);
        return isNaN(n) ? 0 : Math.max(0, n);
      });
    });

    const r = getBdRect();
    const multi = isBdMulti();
    const startVarIdx = VAR_CODES.indexOf(startVariant);
    if (startVarIdx === -1) return;
    const s0 = multi && r ? { d: r.d1, v: r.v1 } : { d: startDay, v: startVarIdx };

    const batchUpdates: { variant: VariantCode; dayIdx: number; val: number }[] = [];
    let lockedSkipped = 0;
    const put = (day: number, vi: number, val: number) => {
      if (day < 1 || day > DIM || vi < 0 || vi >= VAR_CODES.length) return;
      if (isCellLocked(day)) { lockedSkipped++; return; }
      batchUpdates.push({ variant: VAR_CODES[vi], dayIdx: day - 1, val });
    };

    let endD = s0.d, endV = s0.v;
    if (multi && r && grid.length === 1 && grid[0].length === 1) {
      // Satu nilai ditempel ke rentang terpilih: isi semua sel terpilih (seperti spreadsheet)
      for (let d = r.d1; d <= r.d2; d++) for (let vi = r.v1; vi <= r.v2; vi++) put(d, vi, grid[0][0]);
      endD = r.d2; endV = r.v2;
    } else {
      grid.forEach((row, ro) => row.forEach((val, co) => {
        put(s0.d + ro, s0.v + co, val);
        endD = Math.max(endD, Math.min(DIM, s0.d + ro));
        endV = Math.max(endV, Math.min(VAR_CODES.length - 1, s0.v + co));
      }));
    }

    if (batchUpdates.length > 0) {
      applyBdUpdates(batchUpdates);
      setSelA({ d: s0.d, v: s0.v });
      setSelB({ d: endD, v: endV });
      showToast(
        `Berhasil menempel ${batchUpdates.length} sel rencana${lockedSkipped ? ` (${lockedSkipped} sel terkunci dilewati)` : ''}!`,
        'success'
      );
    } else if (lockedSkipped > 0) {
      showToast('Sel tujuan terkunci. Aktifkan Edit Rencana untuk tanggal yang sudah lewat.', 'info');
    }
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentDay: number,
    currentVariant: VariantCode
  ) => {
    const varIdx = VAR_CODES.indexOf(currentVariant);
    let nextId = '';

    // Shift + panah: perluas seleksi
    if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const b = selB || { d: currentDay, v: varIdx };
      const nd = Math.min(DIM, Math.max(1, b.d + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0)));
      const nv = Math.min(VAR_CODES.length - 1, Math.max(0, b.v + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0)));
      if (!selA) setSelA({ d: currentDay, v: varIdx });
      setSelB({ d: nd, v: nv });
      return;
    }
    // Delete / Backspace pada rentang: kosongkan sel terpilih
    if ((e.key === 'Delete' || e.key === 'Backspace') && isBdMulti()) {
      e.preventDefault();
      const n = clearBdSelection();
      if (n === 0) showToast('Sel terkunci tidak bisa dihapus.', 'info');
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      if (currentDay < DIM) {
        nextId = `bd-input-${currentDay + 1}-${currentVariant}`;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentDay > 1) {
        nextId = `bd-input-${currentDay - 1}-${currentVariant}`;
      }
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (input.selectionEnd === input.value.length && varIdx < VAR_CODES.length - 1) {
        nextId = `bd-input-${currentDay}-${VAR_CODES[varIdx + 1]}`;
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (input.selectionStart === 0 && varIdx > 0) {
        nextId = `bd-input-${currentDay}-${VAR_CODES[varIdx - 1]}`;
      }
    }

    if (nextId) {
      const el = document.getElementById(nextId) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    }
  };

  // Helper: Get target per variant and total for a day
  const getDayPlanAllVariants = (d: number) => {
    const yo = getPlannedTargetForDay(d, 'YO');
    const om = getPlannedTargetForDay(d, 'OM');
    const os = getPlannedTargetForDay(d, 'OS');
    const yt = getPlannedTargetForDay(d, 'YT');
    const total = yo + om + os + yt;
    return { yo, om, os, yt, total };
  };

  // Helper: Cumulative breakdown plan up to day d
  const getCumPlanUpToDay = (d: number) => {
    let cumYo = 0, cumOm = 0, cumOs = 0, cumYt = 0;
    for (let i = 1; i <= d; i++) {
      cumYo += getPlannedTargetForDay(i, 'YO');
      cumOm += getPlannedTargetForDay(i, 'OM');
      cumOs += getPlannedTargetForDay(i, 'OS');
      cumYt += getPlannedTargetForDay(i, 'YT');
    }
    const cumTotal = cumYo + cumOm + cumOs + cumYt;
    return { cumYo, cumOm, cumOs, cumYt, cumTotal };
  };

  // Helper: Get actual sales per variant and total for a day
  const getDayActualAllVariants = (d: number) => {
    const yo = getActualSalesForDay(d, 'YO');
    const om = getActualSalesForDay(d, 'OM');
    const os = getActualSalesForDay(d, 'OS');
    const yt = getActualSalesForDay(d, 'YT');
    const total = yo + om + os + yt;
    return { yo, om, os, yt, total };
  };

  // Helper: Cumulative actual sales up to day d
  const getCumActualUpToDay = (d: number) => {
    let cumYo = 0, cumOm = 0, cumOs = 0, cumYt = 0;
    for (let i = 1; i <= d; i++) {
      cumYo += getActualSalesForDay(i, 'YO');
      cumOm += getActualSalesForDay(i, 'OM');
      cumOs += getActualSalesForDay(i, 'OS');
      cumYt += getActualSalesForDay(i, 'YT');
    }
    const cumTotal = cumYo + cumOm + cumOs + cumYt;
    return { cumYo, cumOm, cumOs, cumYt, cumTotal };
  };

  const handleCopyAllRealisasi = () => {
    const lines = ['Tanggal\tHari\tYO\tOM\tOS\tYT\tTotal Realisasi\tAkumulasi\tRata-rata/hr\tvs Target\tvs LM\tvs LY\tBB YO\tBB OM\tBB OS\tBB YT\tTotal BB\t% BB\tPDM YO\tPDM OM\tPDM OS\tPDM YT\tTotal PDM\tAbsen\tFrek\tJWP\ts/YL'];
    for (let d = 1; d <= DIM; d++) {
      const dateObj = new Date(PY, PM0, d);
      const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
      const r = getDayActualAllVariants(d);
      const cum = getCumActualUpToDay(d);
      const opsD = getDailyOpsDetail(d);
      const avgDaily = d > 0 ? Math.floor(cum.cumTotal / d) : 0;
      const vsTg = targetHarian > 0 ? truncFixed(((avgDaily / targetHarian) * 100), 1) + '%' : '-';
      const vsLm = blHarian > 0 ? truncFixed(((avgDaily / blHarian) * 100), 1) + '%' : '-';
      const vsLy = tyHarian > 0 ? truncFixed(((avgDaily / tyHarian) * 100), 1) + '%' : '-';
      const pctBbStr = truncFixed((opsD.pctBb * 100), 1) + '%';
      const sylStr = opsD.sylDay !== null ? String(opsD.sylDay) : '—';
      lines.push(`${d}\t${dayName}\t${r.yo}\t${r.om}\t${r.os}\t${r.yt}\t${r.total}\t${cum.cumTotal}\t${avgDaily}\t${vsTg}\t${vsLm}\t${vsLy}\t${opsD.bbV[0]}\t${opsD.bbV[1]}\t${opsD.bbV[2]}\t${opsD.bbV[3]}\t${opsD.bb}\t${pctBbStr}\t${opsD.pdmV[0]}\t${opsD.pdmV[1]}\t${opsD.pdmV[2]}\t${opsD.pdmV[3]}\t${opsD.pdm}\t${opsD.absen}\t${opsD.frek}\t${opsD.cumJwp}\t${sylStr}`);
    }
    const tsv = lines.join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      showToast('Tabel realisasi penjualan lengkap dengan varian BB, PDM, JWP, dan s/YL berhasil disalin ke clipboard', 'success');
    }).catch(() => {
      showToast('Gagal menyalin ke clipboard', 'error');
    });
  };

  // ---- Inline Row Editing untuk Realisasi TKU ----
  const handleStartInlineEdit = (d: number) => {
    const rec = getStoredRecord(d);
    const actualV = getDayActualAllVariants(d);
    const opsD = getDailyOpsDetail(d);

    const v: [number, number, number, number] = rec?.v ? [...rec.v] : [actualV.yo, actualV.om, actualV.os, actualV.yt];
    const b: [number, number, number, number] = rec?.b ? [...rec.b] : [...opsD.bbV];
    const pdmArr: [number, number, number, number] = rec?.pdmV ? [...rec.pdmV] : [...opsD.pdmV];
    const absen = rec?.absen ?? opsD.absen;
    const frek = rec?.frek ?? opsD.frek;
    const l250Val = rec?.l250 ?? tku.l250 ?? 0;
    const l300Val = rec?.l300 ?? tku.l300 ?? 0;

    setInlineEditDay(d);
    setInlineEditV(v);
    setInlineEditBbV(b);
    setInlineEditPdmV(pdmArr);
    setInlineEditAbsen(absen);
    setInlineEditFrek(frek);
    setInlineEditL250(l250Val);
    setInlineEditL300(l300Val);
  };

  const handleCancelInlineEdit = () => {
    setInlineEditDay(null);
  };

  const handleSaveInlineEdit = (d: number) => {
    const base = getStoredRecord(d);
    const v = inlineEditV.map(x => Math.max(0, Number(x) || 0)) as [number, number, number, number];
    const b = inlineEditBbV.map(x => Math.max(0, Number(x) || 0)) as [number, number, number, number];
    const pdmV = inlineEditPdmV.map(x => Math.max(0, Number(x) || 0)) as [number, number, number, number];
    const soldTotal = v.reduce((a, c) => a + c, 0);
    const bbNum = b.reduce((a, c) => a + c, 0);
    const pdmNum = pdmV.reduce((a, c) => a + c, 0);

    const record: DailySalesRecord = {
      yl: tku.jumlahYl || 10,
      ar: tku.jumlahArea || 10,
      l250: Math.max(0, Number(inlineEditL250) || 0),
      l300: Math.max(0, Number(inlineEditL300) || 0),
      ...(base || {}),
      v,
      b,
      sold: soldTotal,
      bb: bbNum,
      pdmV,
      pdm: pdmNum,
      absen: Math.max(0, Number(inlineEditAbsen) || 0),
      frek: Math.max(0, Number(inlineEditFrek) || 0)
    };
    const revDate = revDateStr(d);
    clearTkuInputDraft(revDate, tkuIdx);
    try {
      localStorage.setItem(`yk_local_backup_pjd_${revDate}_${tkuIdx}`, JSON.stringify({
        record,
        savedAt: Date.now()
      }));
    } catch (_) {}
    onReviseDailyData(revDate, tkuIdx, record);
    showToast(`Data Tgl ${d} ${period.namaBulanPendek} untuk ${tku.nama} berhasil disimpan`, "success");
    setInlineEditDay(null);
  };

    const breakdownDaysToShow = useMemo(() => {
    if (selectedBreakdownPeriod === 'ALL') {
      return Array.from({ length: DIM }, (_, i) => i + 1);
    }
    const weekIdxMap: Record<string, number> = { M1: 0, M2: 1, M3: 2, M4: 3, M5: 4 };
    const wIdx = weekIdxMap[selectedBreakdownPeriod] ?? 0;
    const wObj = WEEKS[wIdx];
    return wObj ? wObj.days : [];
  }, [selectedBreakdownPeriod, DIM, WEEKS]);

  const breakdownPeriodTitle = useMemo(() => {
    if (selectedBreakdownPeriod === 'ALL') {
      return `Satu Bulan (Tgl 1–${DIM} ${period.label})`;
    }
    const weekIdxMap: Record<string, number> = { M1: 0, M2: 1, M3: 2, M4: 3, M5: 4 };
    const wIdx = weekIdxMap[selectedBreakdownPeriod] ?? 0;
    const wObj = WEEKS[wIdx];
    if (!wObj) return `Minggu ${wIdx + 1}`;
    return `Minggu ${wObj.id} (Tgl ${wObj.start}–${wObj.end} ${period.namaBulanPendek})`;
  }, [selectedBreakdownPeriod, DIM, period.label, period.namaBulanPendek, WEEKS]);

  const realisasiDaysToShow = useMemo(() => {
    if (selectedRealisasiPeriod === 'ALL') {
      return Array.from({ length: DIM }, (_, i) => i + 1);
    }
    const weekIdxMap: Record<string, number> = { M1: 0, M2: 1, M3: 2, M4: 3, M5: 4 };
    const wIdx = weekIdxMap[selectedRealisasiPeriod] ?? 0;
    const wObj = WEEKS[wIdx];
    return wObj ? wObj.days : [];
  }, [selectedRealisasiPeriod, DIM, WEEKS]);

  const realisasiPeriodTitle = useMemo(() => {
    if (selectedRealisasiPeriod === 'ALL') {
      return `Satu Bulan (Tgl 1–${DIM} ${period.label})`;
    }
    const weekIdxMap: Record<string, number> = { M1: 0, M2: 1, M3: 2, M4: 3, M5: 4 };
    const wIdx = weekIdxMap[selectedRealisasiPeriod] ?? 0;
    const wObj = WEEKS[wIdx];
    if (!wObj) return `Minggu ${wIdx + 1}`;
    return `Minggu ${wObj.id} (Tgl ${wObj.start}–${wObj.end} ${period.namaBulanPendek})`;
  }, [selectedRealisasiPeriod, DIM, period.label, period.namaBulanPendek, WEEKS]);

  const revDateStr = (d: number) => `${period.key}-${String(d).padStart(2, '0')}`;
  const getStoredRecord = (d: number): DailySalesRecord | null => {
    const dStr = revDateStr(d);
    if (state.pjd[dStr]?.[tkuIdx]) return state.pjd[dStr][tkuIdx];
    if (dStr === state.activeDate && state.todayInputs[tkuIdx]) return state.todayInputs[tkuIdx];
    return null;
  };



  // Accumulated Ops: Akm BB & Akm PDM up to current active day/cutoff (terupdate)
  const akmOps = useMemo(() => {
    let bbSum = 0;
    const baseTku = state.tkus[tkuIdx];
    let latestAbsenVal = baseTku?.absenYl ?? 0;
    let latestFrekVal = baseTku?.frekuensiAbsen ?? 0;
    for (let d = 1; d <= day; d++) {
      const dStr = `${period.key}-${String(d).padStart(2, "0")}`;
      const pjdRec = state.pjd[dStr]?.[tkuIdx];
      if (pjdRec) {
        bbSum += pjdRec.bb || 0;
        if (pjdRec.absen !== undefined) latestAbsenVal = Number(pjdRec.absen) || 0;
        if (pjdRec.frek !== undefined) latestFrekVal = Number(pjdRec.frek) || 0;
      } else if (d === day && state.todayInputs[tkuIdx]) {
        const todayRec = state.todayInputs[tkuIdx];
        bbSum += todayRec.bb || 0;
        if (todayRec.absen !== undefined) latestAbsenVal = Number(todayRec.absen) || 0;
        if (todayRec.frek !== undefined) latestFrekVal = Number(todayRec.frek) || 0;
      } else {
        const ops = getDailyOpsForDay(d);
        bbSum += ops.bb;
      }
    }
    const currentTku = state.tkus[tkuIdx];
    const isSeed = period.key === SEED_PERIOD;
    const baseBb = (isSeed && currentTku?.bbAkm) ? currentTku.bbAkm.reduce((a, b) => a + (Number(b) || 0), 0) : 0;
    const finalBb = Math.max(bbSum, baseBb);
    const finalAbsen = latestAbsenVal;
    const finalFrek = latestFrekVal;
    // Akm PDM = Penjualan Akm + BB Akm (input PDM harian hanya tampil di Laporan Harian)
    return { akmBb: finalBb, akmPdm: tkuAkmTotal + finalBb, akmAbsen: finalAbsen, akmFrek: finalFrek };
  }, [day, state.pjd, state.todayInputs, tkuIdx, tkuAkmTotal, state.tkus, period.key]);

  const akmBbRatio = (tkuAkmTotal + akmOps.akmBb) > 0 ? (akmOps.akmBb / (tkuAkmTotal + akmOps.akmBb)) : 0;

  // Operasional akumulatif per TKU untuk benchmark komparasi Rayon & Cabang
  const opsByTku = useMemo(() => {
    const isSeed = period.key === SEED_PERIOD;
    const map: Record<number, { bb: number; pdm: number; absen: number; frek: number; jwp: number; yl: number; area: number }> = {};
    state.tkus.forEach((t, idx) => {
      const o = { bb: 0, pdm: 0, absen: 0, frek: 0, jwp: 0, yl: t.jumlahYl || 0, area: t.jumlahArea || 0 };
      let last: DailySalesRecord | null = null;
      let seenAbsen = false;
      let seenFrek = false;
      for (let d = 1; d <= Math.min(day, DIM); d++) {
        const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
        const rec = state.pjd[dStr]?.[idx] || (dStr === state.activeDate ? state.todayInputs[idx] : null);
        if (!rec) continue;
        o.bb += rec.bb || 0;
        o.pdm += rec.pdm || (rec.pdmV ? rec.pdmV.reduce((a, b) => a + b, 0) : 0);
        if (rec.absen !== undefined) { o.absen = Number(rec.absen) || 0; seenAbsen = true; }
        if (rec.frek !== undefined) { o.frek = Number(rec.frek) || 0; seenFrek = true; }
        last = rec;
      }
      if (last) {
        if (last.yl) o.yl = last.yl;
        if (last.ar) o.area = last.ar;
      }
      const baseBb = (isSeed && t.bbAkm) ? t.bbAkm.reduce((a, b) => a + (Number(b) || 0), 0) : 0;
      o.bb = Math.max(o.bb, baseBb);
      if (!seenAbsen) o.absen = t.absenYl || 0;
      if (!seenFrek) o.frek = t.frekuensiAbsen || 0;
      // JWP diisi manual oleh TKU (t.akmJwp)
      o.jwp = t.akmJwp || 0;
      if (!t.aktif) { o.bb = 0; o.pdm = 0; o.absen = 0; o.frek = 0; o.jwp = 0; o.yl = 0; o.area = 0; }
      map[idx] = o;
    });
    return map;
  }, [state.tkus, state.pjd, state.todayInputs, state.activeDate, day, divider, DIM, period.key]);

  const opsOf = (idxs: number[], accSold: number) => {
    const o = { bb: 0, pdm: 0, absen: 0, frek: 0, jwp: 0, yl: 0, area: 0 };
    idxs.forEach(i => {
      const x = opsByTku[i];
      if (!x) return;
      o.bb += x.bb;
      o.absen += x.absen;
      o.frek += x.frek;
      o.jwp += x.jwp;
      o.yl += x.yl;
      o.area += x.area;
    });
    return {
      ...o,
      pdm: accSold + o.bb,
      pctBb: o.bb + accSold > 0 ? o.bb / (o.bb + accSold) : null,
      syl: o.jwp > 0 ? Math.floor(accSold / o.jwp) : null,
      cover: o.area > 0 ? o.yl / o.area : null
    };
  };

  const tkuOps = opsOf([tkuIdx], tkuAkmTotal);

  // Helper untuk detail operasional per tanggal d untuk TKU ini
  const getDailyOpsDetail = (d: number) => {
    const dStr = `${period.key}-${String(d).padStart(2, "0")}`;
    const pjdRec = state.pjd[dStr]?.[tkuIdx];
    const todayRec = d === day ? state.todayInputs[tkuIdx] : null;
    const rec = pjdRec || todayRec;
    const isPast = d <= day;

    const sold = isPast ? getActualSalesForDay(d, "ALL") : 0;
    const bbV: [number, number, number, number] = isPast
      ? (rec?.b ? [...rec.b] : [0, 0, 0, 0])
      : [0, 0, 0, 0];
    const bb = isPast ? (rec?.bb ?? (bbV.reduce((a, b) => a + b, 0) || getDailyOpsForDay(d).bb)) : 0;
    const pctBb = (sold + bb) > 0 ? bb / (sold + bb) : 0;

    // PDM per TKU di menu Realisasi (per varian dan total):
    // Diluruskan persis dengan tanggal PDM tsb (misal diinput tgl 30, maka sebaris di tgl 30)
    let dayPdmV: [number, number, number, number] = [0, 0, 0, 0];
    let dayPdm = 0;
    if (isPast) {
      if (rec?.pdmV && Array.isArray(rec.pdmV) && rec.pdmV.length === 4) {
        dayPdmV = [rec.pdmV[0] || 0, rec.pdmV[1] || 0, rec.pdmV[2] || 0, rec.pdmV[3] || 0];
      } else if (rec?.pdm !== undefined && rec.pdm !== null && rec.pdm > 0) {
        dayPdmV = [rec.pdm, 0, 0, 0];
      } else if (d === day && pdmV.some(x => x > 0)) {
        dayPdmV = [...pdmV];
      } else {
        dayPdmV = [0, 0, 0, 0];
      }
      dayPdm = dayPdmV.reduce((a, b) => a + b, 0);
    }

    const absen = isPast ? (rec?.absen ?? 0) : 0;
    const frek = isPast ? (rec?.frek ?? 0) : 0;

    const l250Val = isPast ? (rec?.l250 ?? tku.l250 ?? 0) : 0;
    const l300Val = isPast ? (rec?.l300 ?? tku.l300 ?? 0) : 0;

    // Kumulatif s/d tgl d
    const cum = isPast ? getCumActualUpToDay(d) : { cumTotal: 0 };
    let cumBb = 0;

    if (isPast) {
      for (let i = 1; i <= d; i++) {
        const sStr = `${period.key}-${String(i).padStart(2, "0")}`;
        const r = state.pjd[sStr]?.[tkuIdx] || (i === day ? state.todayInputs[tkuIdx] : null);
        cumBb += r?.bb ?? getDailyOpsForDay(i).bb;
      }
    }

    const cumPdm = cum.cumTotal + cumBb;
    const cumJwp = getJwpAsOf(state, tkuIdx, d, period.key !== SEED_PERIOD) ?? 0;
    const sylDay = cumJwp > 0 ? Math.floor(cum.cumTotal / cumJwp) : null;

    return {
      sold,
      bbV,
      bb,
      pctBb,
      pdmV: dayPdmV,
      pdm: dayPdm,
      absen,
      frek,
      l250: l250Val,
      l300: l300Val,
      cumBb,
      cumPdm,
      cumJwp,
      sylDay
    };
  };


  // Summary Metrics for TKU (Ringkasan / Dashboard TKU)
  const targetHarian = tku.targetHarian;
  const targetPct = targetHarian > 0 ? (tkuDailyAvg / targetHarian) : 0;
  const akmDiffVsTarget = tkuAkmTotal - targetHarian * divider;

  const blHarian = state.targetBulanLalu[tkuIdx] || 0;
  const blDiff = tkuDailyAvg - blHarian;
  const blPct = blHarian > 0 ? (tkuDailyAvg / blHarian) : 0;
  const akmDiffVsBl = tkuAkmTotal - blHarian * divider;

  const tyHarian = state.targetTahunLalu[tkuIdx] || 0;
  const tyDiff = tkuDailyAvg - tyHarian;
  const tyPct = tyHarian > 0 ? (tkuDailyAvg / tyHarian) : 0;
  const akmDiffVsTy = tkuAkmTotal - tyHarian * divider;

  // Sisa Target / LM / LY per hari kerja (sama dengan dashboard admin): rata-rata penjualan per hari
  // yang harus dicapai ke depan agar akumulasi akhir bulan sama dengan pembanding. Minggu tidak dihitung.
  let workLeft = 0;
  for (let d = Math.min(divider, DIM) + 1; d <= DIM; d++) {
    if (new Date(PY, PM0, d).getDay() !== 0) workLeft++;
  }
  const needPerDay = (perDay: number) => {
    const sisa = perDay * DIM - tkuAkmTotal;
    if (perDay <= 0) return { text: '-', done: false };
    if (sisa <= 0) return { text: 'Tercapai', done: true };
    if (workLeft <= 0) return { text: '-', done: false };
    return { text: formatNumber(Math.ceil(sisa / workLeft)), done: false };
  };
  const needTarget = needPerDay(targetHarian);
  const needBl = needPerDay(blHarian);
  const needTy = needPerDay(tyHarian);



  // Variant breakdown calculation for TKU
  const variantMetrics = VARIANTS.map((v, i) => {
    const akm = tku.penjualanAkm[i] || 0;
    const avg = divider > 0 ? akm / divider : 0;
    const share = tkuAkmTotal > 0 ? (akm / tkuAkmTotal) * 100 : 0;
    const vTg = state.targetPerVariant[v.code]?.[tkuIdx]?.tg || 0;
    const vBl = state.targetPerVariant[v.code]?.[tkuIdx]?.bl || 0;
    const vTy = state.targetPerVariant[v.code]?.[tkuIdx]?.ty || 0;
    const pctTg = vTg > 0 ? (avg / vTg) : 0;
    const pctBl = vBl > 0 ? (avg / vBl) : 0;
    const pctTy = vTy > 0 ? (avg / vTy) : 0;
    const diffTg = akm - vTg * divider;
    return {
      variant: v,
      akm,
      avg,
      share,
      vTg,
      vBl,
      vTy,
      pctTg,
      pctBl,
      pctTy,
      diffTg
    };
  });

  const activeYear = PY;
  const activeMonth = PM0;

  // Day Multiplier Calculation for TKU
  // For Monday or after 1 holiday/no transaction: multiplier counts consecutive non-transaction days + 1.
  // Looks back across the month boundary into previous month (e.g. Day 1 is Monday -> Sunday prev month was off -> multiplier is 2).
  const getTkuDayMultiplier = (d: number): number => {
    const curDate = new Date(activeYear, activeMonth, d);
    if (curDate.getDay() === 0) return 0; // Holiday (Sunday)

    let skipped = 0;
    for (let step = 1; step <= 7; step++) {
      const prevDate = new Date(activeYear, activeMonth, d - step);
      const prevIsSun = prevDate.getDay() === 0;

      if (d - step >= 1) {
        const prevD = d - step;
        const prevSold = getActualSalesForDay(prevD, 'ALL');
        if (prevIsSun || prevSold === 0) {
          skipped++;
        } else {
          break;
        }
      } else {
        // Across month boundary into previous month
        if (prevIsSun) {
          skipped++;
        } else {
          // Working day in previous month
          break;
        }
      }
    }
    return skipped + 1;
  };

  // Daily Trend Data (days 1 to Math.min(day, 30))
  const trendDays = useMemo(() => {
    const arr = [];
    const maxDay = Math.min(day, DIM);
    for (let d = 1; d <= maxDay; d++) {
      const isSun = new Date(activeYear, activeMonth, d).getDay() === 0;
      const sold = getActualSalesForDay(d, 'ALL');
      const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
      const pjdRec = state.pjd[dStr]?.[tkuIdx];
      const bbVal = pjdRec?.bb ?? (d === day && state.todayInputs[tkuIdx] ? (state.todayInputs[tkuIdx].bb || 0) : getDailyOpsForDay(d).bb);
      const mult = getTkuDayMultiplier(d);
      const effTarget = mult > 0 ? targetHarian * mult : 0;
      const effBL = mult > 0 ? blHarian * mult : 0;
      const effTY = mult > 0 ? tyHarian * mult : 0;
      const diff = sold - effTarget;
      arr.push({ 
        day: d, 
        sold, 
        bb: bbVal,
        isSun, 
        mult, 
        effTarget, 
        effBL, 
        effTY, 
        diff 
      });
    }
    return arr;
  }, [day, tkuIdx, targetHarian, blHarian, tyHarian, state.pjd, state.todayInputs, activeYear, activeMonth]);

  // Kondisi TKU: Jml YL & Area hanya tampilan (diedit di Profil TKU). JWP, Absen, Freq, <250, <300 diisi MANUAL lalu disimpan dengan tombol
  // "Simpan Kondisi TKU" (bukan otomatis), dan menimpa nilai lama (bukan akumulasi).
  const cYl = tku.jumlahYl || 10;
  const cAr = tku.jumlahArea || 10;

  const editOps = (patch: { absen?: number; frek?: number; l250?: number; l300?: number; jwp?: number }) => {
    if (patch.frek !== undefined) setFrek(patch.frek);
    if (patch.absen !== undefined) setAbsen(patch.absen);
    if (patch.l250 !== undefined) setL250(patch.l250);
    if (patch.l300 !== undefined) setL300(patch.l300);
    if (patch.jwp !== undefined) setJwpCustom(patch.jwp);
    setOpsDirty(true);
  };

  const doSaveOps = () => {
    if (isBackdate && (inputDate < minInputDate || inputDate > maxInputDate)) {
      showToast('Tanggal di luar rentang bulan kerja / melewati tanggal update.', 'error');
      return;
    }
    const saved = state.pjd[inputDate]?.[tkuIdx] || (inputDate === state.activeDate ? state.todayInputs[tkuIdx] : undefined);
    const formHasSales = salesV.some(x => x > 0);
    const currentSold = salesV.reduce((a, b) => a + b, 0);
    const currentBb = bbV.reduce((a, b) => a + b, 0);
    const currentPdm = pdmV.reduce((a, b) => a + b, 0);

    const base: DailySalesRecord = saved || {
      v: formHasSales ? salesV : [0, 0, 0, 0],
      b: bbV.some(x => x > 0) ? bbV : [0, 0, 0, 0],
      sold: formHasSales ? currentSold : 0,
      bb: bbV.some(x => x > 0) ? currentBb : 0,
      pdmV: pdmV.some(x => x > 0) ? pdmV : [0, 0, 0, 0],
      pdm: pdmV.some(x => x > 0) ? currentPdm : 0
    };

    const effectiveV = (saved?.sold || 0) > 0 ? saved!.v : (formHasSales ? salesV : base.v);
    const effectiveSold = (saved?.sold || 0) > 0 ? saved!.sold : (formHasSales ? currentSold : base.sold);
    const effectiveB = (saved?.bb || 0) > 0 ? saved!.b : (bbV.some(x => x > 0) ? bbV : base.b);
    const effectiveBb = (saved?.bb || 0) > 0 ? saved!.bb : (bbV.some(x => x > 0) ? currentBb : base.bb);
    const effectivePdmV = (saved?.pdm || 0) > 0 ? (saved!.pdmV || base.pdmV) : (pdmV.some(x => x > 0) ? pdmV : base.pdmV);
    const effectivePdm = (saved?.pdm || 0) > 0 ? saved!.pdm : (pdmV.some(x => x > 0) ? currentPdm : base.pdm);

    const rec: DailySalesRecord = {
      ...base,
      v: effectiveV,
      sold: effectiveSold,
      b: effectiveB,
      bb: effectiveBb,
      pdmV: effectivePdmV,
      pdm: effectivePdm,
      yl: cYl,
      ar: cAr,
      l250,
      l300,
      absen,
      frek,
      jwpManual: Math.max(0, Number(jwpCustom) || 0),
    };
    saveTkuInputDraft(inputDate, tkuIdx, effectiveV, effectiveB, effectivePdmV || [0, 0, 0, 0], { yl: cYl, ar: cAr, l250, l300, jwpCustom, absen, frek });

    try {
      localStorage.setItem(`yk_local_backup_pjd_${inputDate}_${tkuIdx}`, JSON.stringify({
        record: rec,
        savedAt: Date.now()
      }));
    } catch (_) {}

    if (isBackdate) {
      onReviseDailyData(inputDate, tkuIdx, rec);
    } else {
      onSaveTkuInput(tkuIdx, rec, inputDate);
    }
    setOpsDirty(false);
    showToast(`Kondisi ${tku.nama} tanggal ${formatDateIndo(inputDate)} berhasil disimpan!`, 'success');
  };
  const handleSaveOps = () => guardPeriodSave(doSaveOps);

  // Card Kondisi & Parameter Operasional (Dipindah dari menu Realisasi ke menu Input Penjualan Harian setelah PDM)
  // Disimpan lewat tombol "Simpan Kondisi TKU" sendiri (terpisah dari tombol simpan penjualan)
  const renderOpsCard = () => (
    <div className="p-4 md:p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-0.5">
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
          Kondisi TKU
          {opsDirty && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              belum disimpan
            </span>
          )}
        </h2>
      </div>
      
      {/* Bar Parameter Operasional */}
      <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-100 dark:border-neutral-800">
        {/* 1. Jml YL (Tampilan Saja) */}
        <div className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border-neutral-200/60 dark:border-neutral-700" title="Jumlah YL (diatur di menu Profil TKU)">
          <span className="text-neutral-500 font-medium">Jml YL:</span>
          <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{cYl}</span>
        </div>

        {/* 2. Area (Tampilan Saja) */}
        <div className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border-neutral-200/60 dark:border-neutral-700" title="Jumlah Area (diatur di menu Profil TKU)">
          <span className="text-neutral-500 font-medium">Area:</span>
          <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{cAr}</span>
        </div>

        {/* 3. JWP (diisi manual oleh TKU: total hari kerja semua YL sampai hari ini) */}
        <div className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs bg-sky-50/60 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-900/40" title="JWP diisi manual: akumulasi hari kerja semua YL sampai tanggal ini (YL lama × hari berjalan, YL baru × hari ia mulai berjualan)">
          <span className="text-sky-700 dark:text-sky-400 font-semibold">JWP:</span>
          <OpsNumberField
            value={jwpCustom}
            min={0}
            onCommit={(n) => editOps({ jwp: n })}
            className="w-16 px-1.5 py-0.5 rounded-lg border font-mono font-bold text-center text-xs bg-white dark:bg-neutral-900 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700 focus:ring-sky-500"
          />
        </div>

        {/* 4. Absen (Memperbarui nilai) */}
        <div className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs bg-purple-50/60 dark:bg-purple-950/30 border-purple-200/60 dark:border-purple-900/40">
          <span className="text-purple-700 dark:text-purple-400 font-semibold">Absen:</span>
          <OpsNumberField
            value={absen}
            min={0}
            onCommit={(n) => editOps({ absen: n })}
            className="w-14 px-1.5 py-0.5 rounded-lg border font-mono font-bold text-center text-xs bg-white dark:bg-neutral-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 focus:ring-purple-500"
          />
        </div>

        {/* 5. Freq Absen (Memperbarui nilai) */}
        <div className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200/60 dark:border-indigo-900/40">
          <span className="text-indigo-700 dark:text-indigo-400 font-semibold">Freq:</span>
          <OpsNumberField
            value={frek}
            min={0}
            onCommit={(n) => editOps({ frek: n })}
            className="w-14 px-1.5 py-0.5 rounded-lg border font-mono font-bold text-center text-xs bg-white dark:bg-neutral-900 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 focus:ring-indigo-500"
          />
        </div>

        {/* 6. YL < 250 (Memperbarui nilai) */}
        <div className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs bg-red-50/60 dark:bg-red-950/30 border-red-200/60 dark:border-red-900/40">
          <span className="text-red-700 dark:text-red-400 font-semibold">YL &lt; 250:</span>
          <OpsNumberField
            value={l250}
            min={0}
            onCommit={(n) => editOps({ l250: n })}
            className="w-14 px-1.5 py-0.5 rounded-lg border font-mono font-bold text-center text-xs bg-white dark:bg-neutral-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 focus:ring-red-500"
          />
        </div>

        {/* 7. YL < 300 (Memperbarui nilai) */}
        <div className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/40">
          <span className="text-amber-700 dark:text-amber-400 font-semibold">YL &lt; 300:</span>
          <OpsNumberField
            value={l300}
            min={0}
            onCommit={(n) => editOps({ l300: n })}
            className="w-14 px-1.5 py-0.5 rounded-lg border font-mono font-bold text-center text-xs bg-white dark:bg-neutral-900 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 focus:ring-amber-500"
          />
        </div>

        {/* 8. Tombol simpan kondisi TKU (terpisah dari simpan penjualan) */}
        <button
          type="button"
          onClick={handleSaveOps}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 ${opsDirty ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isBackdate ? `Simpan Kondisi Tgl ${inputDay}` : 'Simpan Kondisi TKU'}</span>
        </button>
      </div>
    </div>
  );

  // Render Tabel Realisasi Penjualan & Operasional TKU (Khusus tabel detail di menu Realisasi)
  const renderRealisasiSection = () => {
    let periodTotalYo = 0;
    let periodTotalOm = 0;
    let periodTotalOs = 0;
    let periodTotalYt = 0;
    let periodTotalSold = 0;
    let periodTotalBbV = [0, 0, 0, 0];
    let periodTotalBb = 0;
    let periodTotalPdmV = [0, 0, 0, 0];
    let periodTotalPdm = 0;

    realisasiDaysToShow.forEach(d => {
      if (d <= day) {
        const r = getDayActualAllVariants(d);
        const opsD = getDailyOpsDetail(d);
        periodTotalYo += r.yo;
        periodTotalOm += r.om;
        periodTotalOs += r.os;
        periodTotalYt += r.yt;
        periodTotalSold += r.total;

        periodTotalBbV[0] += opsD.bbV[0];
        periodTotalBbV[1] += opsD.bbV[1];
        periodTotalBbV[2] += opsD.bbV[2];
        periodTotalBbV[3] += opsD.bbV[3];
        periodTotalBb += opsD.bb;

        periodTotalPdmV[0] += opsD.pdmV[0];
        periodTotalPdmV[1] += opsD.pdmV[1];
        periodTotalPdmV[2] += opsD.pdmV[2];
        periodTotalPdmV[3] += opsD.pdmV[3];
        periodTotalPdm += opsD.pdm;
      }
    });

    // ---- Pembagi realisasi = tanggal update (sama dengan menu admin) ----
    const upd = Math.max(1, Math.min(divider, DIM));
    const akmReal = getCumActualUpToDay(upd).cumTotal;
    const avgReal = Math.floor(akmReal / upd);
    const realCards = [
      { label: 'VS TARGET', short: 'Tgt', base: targetHarian, accent: '#6366f1' },
      { label: 'VS BLN LALU', short: 'BL', base: blHarian, accent: '#06b6d4' },
      { label: 'VS THN LALU', short: 'TL', base: tyHarian, accent: '#f59e0b' }
    ].map(c => {
      const pct = c.base > 0 ? avgReal / c.base : 0;
      const diffTotal = akmReal - c.base * upd;
      const diffPerDay = Math.trunc(diffTotal / Math.max(1, upd));
      return { ...c, pct, diffTotal, diffPerDay };
    });

    const BAND_GREEN = 'bg-emerald-200 dark:bg-emerald-500/30';
    const BAND_RED = 'bg-red-200 dark:bg-red-500/30';
    const BAND_NEUTRAL = 'bg-neutral-300 dark:bg-neutral-500/35';
    const TOTAL_FRAME = 'border-x-[3px] border-neutral-700 dark:border-neutral-200';
    const OPS_COLS = 18; // BB(6) + PDM(5) + Abs/Frk(2) + JWP/s/YL(2) + YL<250/<300(2) + Aksi(1)

    // Baris ringkasan mingguan realisasi: rata-rata = akumulasi tgl 1 s/d (Sabtu, maks. tanggal update) ÷ tanggal itu.
    const weekRowsFor = (wk: { id: number; start: number; end: number }): React.ReactNode[] => {
      const wIdx = WEEKS.findIndex(w => w.id === wk.id);
      const started = wk.start <= upd;
      const cut = Math.min(wk.end, upd);
      let avgV: number[] = [0, 0, 0, 0];
      let avgT = 0;
      let akmT = 0;
      let wkInfo: React.ReactNode = <span className="text-neutral-400">vs mgg lalu: —</span>;
      if (started) {
        const cw = getCumActualUpToDay(cut);
        avgV = [cw.cumYo, cw.cumOm, cw.cumOs, cw.cumYt].map(x => Math.floor(x / cut));
        avgT = Math.floor(cw.cumTotal / cut);
        akmT = cw.cumTotal;
        const prevWk = wIdx > 0 ? WEEKS[wIdx - 1] : null;
        if (prevWk) {
          const pc = Math.min(prevWk.end, upd);
          const cp = getCumActualUpToDay(pc);
          const avgPrev = Math.floor(cp.cumTotal / Math.max(1, pc));
          if (avgPrev > 0) {
            const pct = avgT / avgPrev;
            const akmDiff = cw.cumTotal - avgPrev * cut;
            wkInfo = (
              <span className={akmDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'}>
                vs mgg lalu: {formatPercent(pct)} ({formatDiff(akmDiff)})
              </span>
            );
          }
        }
      }
      const dash = <span className="text-neutral-300 dark:text-neutral-600 font-normal">—</span>;
      return [
        <tr key={`wh${wk.id}`} className="bg-neutral-100 dark:bg-neutral-800 font-sans">
          <td colSpan={5} className="pt-2 pb-1 px-2.5 text-xs text-neutral-700 dark:text-neutral-200">
            <div className="flex flex-wrap items-center justify-between gap-x-3">
              <span><span className="font-bold">Minggu {wk.id}</span><span className="text-neutral-500 dark:text-neutral-400"> · Tgl {wk.start}–{wk.end}</span></span>
              <span className="text-xs">{wkInfo}</span>
            </div>
          </td>
          <td className={TOTAL_FRAME} />
          <td colSpan={OPS_COLS} />
        </tr>,
        <tr key={`wa${wk.id}`} className="bg-neutral-100 dark:bg-neutral-800 font-mono">
          <td className="pb-2 pt-0 px-2.5 text-xs leading-tight text-neutral-500 dark:text-neutral-400 font-sans whitespace-nowrap">
            Rata2<span className="block">÷ {started ? cut : '—'}</span>
          </td>
          {avgV.map((x, k) => (
            <td key={k} className="pb-2 pt-0 px-1 text-center font-bold" style={{ color: VARIANTS[k].color }}>{started ? formatNumber(x) : dash}</td>
          ))}
          <td className={`pb-2 pt-0 px-2.5 text-right font-bold text-neutral-900 dark:text-white ${TOTAL_FRAME}`}>
            {started ? formatNumber(avgT) : dash}
            {started && <span className="block text-xs font-normal font-sans text-neutral-500 dark:text-neutral-400">Akm {formatNumber(akmT)}</span>}
          </td>
          <td colSpan={OPS_COLS} />
        </tr>
      ];
    };

    return (
      <div className="space-y-3 animate-in fade-in duration-200">
        {/* Akumulasi & rata-rata realisasi (pembagi = tanggal update) */}
        <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-bold tracking-wide text-neutral-500 dark:text-neutral-400 block">AKM REALISASI {period.label.toUpperCase()}</span>
            <span className="text-lg font-mono font-bold text-neutral-900 dark:text-white">{formatNumber(akmReal)}</span>
            <span className="text-xs text-neutral-400 font-sans"> btl</span>
          </div>
          <div className="text-right min-w-0">
            <span className="text-xs font-bold tracking-wide text-neutral-500 dark:text-neutral-400 block">RATA2/HR (÷ {upd})</span>
            <span className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(avgReal)}</span>
            <span className="text-xs text-neutral-400 font-sans"> btl</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {realCards.map(c => (
            <div
              key={c.label}
              className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs min-w-0"
              style={{ borderLeft: `4px solid ${c.accent}` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-xs font-bold tracking-wide text-neutral-500 break-words">{c.label}</span>
                <span className={`text-xs font-mono font-bold px-1.5 py-px rounded ${c.diffPerDay >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'}`}>
                  {formatDiff(c.diffPerDay)}
                </span>
              </div>
              <div className={`text-base font-mono font-bold leading-tight ${c.pct >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                {c.base > 0 ? formatPercent(c.pct) : '—'}
              </div>
              <div className="text-xs text-neutral-500 font-mono break-words">
                {c.short}: {formatNumber(c.base)}/hr
              </div>
              <div className={`text-xs font-mono break-words ${c.diffTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                Selisih: {formatDiff(c.diffTotal)}
              </div>
            </div>
          ))}
        </div>

        {/* Tabel Realisasi Harian & Operasional */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
          <div className="px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-emerald-600" />
                Realisasi {period.label}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                Kolom Total vs pencapaian minggu lalu (hari sama):{' '}
                <span className="inline-block w-3 h-3 rounded-sm align-[-2px] mx-0.5 bg-red-300 dark:bg-red-500/50" />kurang,{' '}
                <span className="inline-block w-3 h-3 rounded-sm align-[-2px] mx-0.5 bg-emerald-300 dark:bg-emerald-500/50" />lebih,{' '}
                <span className="inline-block w-3 h-3 rounded-sm align-[-2px] mx-0.5 bg-neutral-400 dark:bg-neutral-500/60" />sama.
                {' '}Geser ke samping untuk BB, PDM, absen, dan lainnya.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyAllRealisasi}
              className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Salin seluruh tabel realisasi ke format Excel/Spreadsheet"
            >
              <Copy className="w-3.5 h-3.5 text-neutral-500" />
              <span>Salin Data</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[1500px]">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold">
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="py-2 px-2.5 sticky left-0 z-10 bg-neutral-100 dark:bg-neutral-800">Tgl</th>
                  <th className="py-2 px-1 text-center" style={{ color: VARIANTS[0].color }}>YO</th>
                  <th className="py-2 px-1 text-center" style={{ color: VARIANTS[1].color }}>OM</th>
                  <th className="py-2 px-1 text-center" style={{ color: VARIANTS[2].color }}>OS</th>
                  <th className="py-2 px-1 text-center" style={{ color: VARIANTS[3].color }}>YT</th>
                  <th className={`py-2 px-2.5 text-right font-bold text-neutral-900 dark:text-white border-t-[3px] ${TOTAL_FRAME}`}>Total</th>
                  
                  {/* BB per Varian & Total */}
                  <th className="py-2.5 px-1.5 text-right border-l border-neutral-200 dark:border-neutral-700 text-amber-600 font-bold" title="BB Yakult Original">BB YO</th>
                  <th className="py-2.5 px-1.5 text-right text-amber-600 font-bold" title="BB Original Mangga">BB OM</th>
                  <th className="py-2.5 px-1.5 text-right text-amber-600 font-bold" title="BB Original Stroberi">BB OS</th>
                  <th className="py-2.5 px-1.5 text-right text-amber-600 font-bold" title="BB Yakult Light">BB YT</th>
                  <th className="py-2.5 px-2 text-right text-amber-700 dark:text-amber-400 font-bold">Total BB</th>
                  <th className="py-2.5 px-2 text-right text-amber-600">% BB</th>
                  
                  {/* PDM per Varian & Total */}
                  <th className="py-2.5 px-1.5 text-right border-l border-neutral-200 dark:border-neutral-700 text-indigo-600 font-bold" title="PDM Yakult Original">PDM YO</th>
                  <th className="py-2.5 px-1.5 text-right text-indigo-600 font-bold" title="PDM Original Mangga">PDM OM</th>
                  <th className="py-2.5 px-1.5 text-right text-indigo-600 font-bold" title="PDM Original Stroberi">PDM OS</th>
                  <th className="py-2.5 px-1.5 text-right text-indigo-600 font-bold" title="PDM Yakult Light">PDM YT</th>
                  <th className="py-2.5 px-2.5 text-right text-indigo-700 dark:text-indigo-400 font-bold">Total PDM</th>

                  <th className="py-2.5 px-1.5 text-right border-l border-neutral-200 dark:border-neutral-700">Abs</th>
                  <th className="py-2.5 px-1.5 text-right">Frk</th>
                  <th className="py-2.5 px-2 text-right border-l border-neutral-200 dark:border-neutral-700 text-sky-600">JWP</th>
                  <th className="py-2.5 px-2.5 text-right font-bold text-brand-600">s/YL</th>
                  <th className="py-2.5 px-2 text-right font-bold text-red-600 border-l border-neutral-200 dark:border-neutral-700">YL &lt; 250</th>
                  <th className="py-2.5 px-2 text-right font-bold text-amber-600">YL &lt; 300</th>
                  <th className="py-2.5 px-3 text-center border-l border-neutral-200 dark:border-neutral-700 font-semibold text-neutral-900 dark:text-white">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                {realisasiDaysToShow.flatMap(d => {
                  const dateObj = new Date(PY, PM0, d);
                  const isSun = dateObj.getDay() === 0;
                  const isToday = d === day;
                  const isPast = d <= day;
                  const isEditing = inlineEditDay === d;

                  const r = isPast ? getDayActualAllVariants(d) : { yo: 0, om: 0, os: 0, yt: 0, total: 0 };
                  const opsD = getDailyOpsDetail(d);

                  const editTotalSold = inlineEditV[0] + inlineEditV[1] + inlineEditV[2] + inlineEditV[3];
                  const editTotalBb = inlineEditBbV[0] + inlineEditBbV[1] + inlineEditBbV[2] + inlineEditBbV[3];
                  const editTotalPdm = inlineEditPdmV[0] + inlineEditPdmV[1] + inlineEditPdmV[2] + inlineEditPdmV[3];
                  const editPctBb = (editTotalSold + editTotalBb) > 0 ? editTotalBb / (editTotalSold + editTotalBb) : 0;

                  // Bandingkan dengan pencapaian (realisasi) minggu lalu di hari yang sama (tanggal d-7)
                  const prevD = d - 7;
                  const prevTotal = prevD >= 1 && hasActualSavedSalesForDay(prevD) ? getDayActualAllVariants(prevD).total : null;
                  let totalBand = '';
                  let totalTip = 'Belum ada pembanding minggu lalu';
                  if (isPast && prevTotal !== null) {
                    if (r.total > prevTotal) { totalBand = BAND_GREEN; totalTip = `Lebih dari pencapaian minggu lalu (${formatNumber(prevTotal)})`; }
                    else if (r.total < prevTotal) { totalBand = BAND_RED; totalTip = `Kurang dari pencapaian minggu lalu (${formatNumber(prevTotal)})`; }
                    else { totalBand = BAND_NEUTRAL; totalTip = `Sama dengan pencapaian minggu lalu (${formatNumber(prevTotal)})`; }
                  }

                  const rowEl = (
                    <tr
                      key={d}
                      className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors ${isToday ? 'bg-emerald-50/30 dark:bg-emerald-950/20 font-medium' : isSun ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}
                    >
                      <td className={`py-1.5 px-2.5 font-sans whitespace-nowrap sticky left-0 z-[5] ${isToday ? 'bg-emerald-50 dark:bg-emerald-950' : isSun ? 'bg-amber-50 dark:bg-amber-950' : 'bg-white dark:bg-neutral-900'}`}>
                        <span className={`font-bold ${isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-neutral-100'}`}>Tgl {d}</span>
                        <span className={`block text-xs leading-none ${isSun ? 'text-amber-600 font-medium' : 'text-neutral-400'}`}>{dateObj.toLocaleDateString('id-ID', { weekday: 'short' })}{isSun ? ' · libur' : ''}</span>
                      </td>

                      {/* YO */}
                      <td className="py-1.5 px-0.5 text-center font-bold" style={{ color: VARIANTS[0].color }}>
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditV[0] || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditV([Math.max(0, Number(e.target.value)), inlineEditV[1], inlineEditV[2], inlineEditV[3]])}
                            className="w-16 px-1.5 py-1 text-right rounded-lg border border-red-400 bg-white dark:bg-neutral-900 font-mono font-bold text-xs focus:ring-2 focus:ring-red-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(r.yo)
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>
                        )}
                      </td>

                      {/* OM */}
                      <td className="py-1.5 px-0.5 text-center font-bold" style={{ color: VARIANTS[1].color }}>
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditV[1] || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditV([inlineEditV[0], Math.max(0, Number(e.target.value)), inlineEditV[2], inlineEditV[3]])}
                            className="w-16 px-1.5 py-1 text-right rounded-lg border border-sky-400 bg-white dark:bg-neutral-900 font-mono font-bold text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(r.om)
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>
                        )}
                      </td>

                      {/* OS */}
                      <td className="py-1.5 px-0.5 text-center font-bold" style={{ color: VARIANTS[2].color }}>
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditV[2] || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditV([inlineEditV[0], inlineEditV[1], Math.max(0, Number(e.target.value)), inlineEditV[3]])}
                            className="w-16 px-1.5 py-1 text-right rounded-lg border border-pink-400 bg-white dark:bg-neutral-900 font-mono font-bold text-xs focus:ring-2 focus:ring-pink-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(r.os)
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>
                        )}
                      </td>

                      {/* YT */}
                      <td className="py-1.5 px-0.5 text-center font-bold" style={{ color: VARIANTS[3].color }}>
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditV[3] || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditV([inlineEditV[0], inlineEditV[1], inlineEditV[2], Math.max(0, Number(e.target.value))])}
                            className="w-16 px-1.5 py-1 text-right rounded-lg border border-sky-400 bg-white dark:bg-neutral-900 font-mono font-bold text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(r.yt)
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>
                        )}
                      </td>

                      {/* Realisasi Harian Total */}
                      <td className={`py-2 px-2.5 text-right font-bold text-neutral-900 dark:text-neutral-50 ${(isPast && !isEditing) ? totalBand : ''} ${TOTAL_FRAME}`} title={totalTip}>
                        {isEditing ? (
                          <span className="text-emerald-600">{formatNumber(editTotalSold)}</span>
                        ) : isPast ? (
                          formatNumber(r.total)
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>
                        )}
                      </td>

                      {/* BB YO */}
                      <td className="py-1.5 px-1.5 text-right font-mono text-amber-600 border-l border-neutral-200 dark:border-neutral-700">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditBbV[0] || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditBbV([Math.max(0, Number(e.target.value)), inlineEditBbV[1], inlineEditBbV[2], inlineEditBbV[3]])}
                            className="w-12 px-1 py-1 text-right rounded-lg border border-amber-400 bg-white dark:bg-neutral-900 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(opsD.bbV[0])
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* BB OM */}
                      <td className="py-1.5 px-1.5 text-right font-mono text-amber-600">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditBbV[1] || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditBbV([inlineEditBbV[0], Math.max(0, Number(e.target.value)), inlineEditBbV[2], inlineEditBbV[3]])}
                            className="w-12 px-1 py-1 text-right rounded-lg border border-amber-400 bg-white dark:bg-neutral-900 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(opsD.bbV[1])
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* BB OS */}
                      <td className="py-1.5 px-1.5 text-right font-mono text-amber-600">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditBbV[2] || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditBbV([inlineEditBbV[0], inlineEditBbV[1], Math.max(0, Number(e.target.value)), inlineEditBbV[3]])}
                            className="w-12 px-1 py-1 text-right rounded-lg border border-amber-400 bg-white dark:bg-neutral-900 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(opsD.bbV[2])
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* BB YT */}
                      <td className="py-1.5 px-1.5 text-right font-mono text-amber-600">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditBbV[3] || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditBbV([inlineEditBbV[0], inlineEditBbV[1], inlineEditBbV[2], Math.max(0, Number(e.target.value))])}
                            className="w-12 px-1 py-1 text-right rounded-lg border border-amber-400 bg-white dark:bg-neutral-900 font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(opsD.bbV[3])
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Total BB */}
                      <td className="py-1.5 px-2 text-right font-bold text-amber-700 dark:text-amber-400">
                        {isEditing ? (
                          formatNumber(editTotalBb)
                        ) : isPast ? (
                          formatNumber(opsD.bb)
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>
                        )}
                      </td>

                      {/* % BB */}
                      <td className={`py-2 px-2 text-right ${isEditing ? getBbStatusClass(editPctBb) : isPast ? getBbStatusClass(opsD.pctBb) : 'text-neutral-300'}`}>
                        {isEditing ? (
                          formatPercent(editPctBb)
                        ) : isPast ? (
                          formatPercent(opsD.pctBb)
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>
                        )}
                      </td>

                      {/* PDM YO */}
                      <td className="py-1.5 px-1.5 text-right font-mono text-indigo-600 border-l border-neutral-200 dark:border-neutral-700">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditPdmV[0] || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditPdmV([Math.max(0, Number(e.target.value)), inlineEditPdmV[1], inlineEditPdmV[2], inlineEditPdmV[3]])}
                            className="w-12 px-1 py-1 text-right rounded-lg border border-indigo-400 bg-white dark:bg-neutral-900 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(opsD.pdmV[0])
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* PDM OM */}
                      <td className="py-1.5 px-1.5 text-right font-mono text-indigo-600">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditPdmV[1] || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditPdmV([inlineEditPdmV[0], Math.max(0, Number(e.target.value)), inlineEditPdmV[2], inlineEditPdmV[3]])}
                            className="w-12 px-1 py-1 text-right rounded-lg border border-indigo-400 bg-white dark:bg-neutral-900 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(opsD.pdmV[1])
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* PDM OS */}
                      <td className="py-1.5 px-1.5 text-right font-mono text-indigo-600">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditPdmV[2] || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditPdmV([inlineEditPdmV[0], inlineEditPdmV[1], Math.max(0, Number(e.target.value)), inlineEditPdmV[3]])}
                            className="w-12 px-1 py-1 text-right rounded-lg border border-indigo-400 bg-white dark:bg-neutral-900 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(opsD.pdmV[2])
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* PDM YT */}
                      <td className="py-1.5 px-1.5 text-right font-mono text-indigo-600">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditPdmV[3] || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditPdmV([inlineEditPdmV[0], inlineEditPdmV[1], inlineEditPdmV[2], Math.max(0, Number(e.target.value))])}
                            className="w-12 px-1 py-1 text-right rounded-lg border border-indigo-400 bg-white dark:bg-neutral-900 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(opsD.pdmV[3])
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Total PDM */}
                      <td className="py-2 px-2.5 text-right font-bold text-indigo-700 dark:text-indigo-400">
                        {isEditing ? (
                          formatNumber(editTotalPdm)
                        ) : (isPast && opsD.pdm > 0) ? (
                          formatNumber(opsD.pdm)
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>
                        )}
                      </td>

                      {/* Absen */}
                      <td className="py-1.5 px-1.5 text-right border-l border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditAbsen || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditAbsen(Math.max(0, Number(e.target.value)))}
                            className="w-12 px-1 py-1 text-right rounded-lg border border-neutral-400 bg-white dark:bg-neutral-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                          />
                        ) : (isPast && opsD.absen > 0) ? (
                          opsD.absen
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Frek */}
                      <td className="py-1.5 px-1.5 text-right text-neutral-600 dark:text-neutral-400">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditFrek || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditFrek(Math.max(0, Number(e.target.value)))}
                            className="w-12 px-1 py-1 text-right rounded-lg border border-neutral-400 bg-white dark:bg-neutral-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                          />
                        ) : (isPast && opsD.frek > 0) ? (
                          opsD.frek
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* JWP */}
                      <td className="py-2 px-2 text-right text-sky-600 border-l border-neutral-200 dark:border-neutral-700">
                        {isPast ? formatNumber(opsD.cumJwp) : <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>}
                      </td>

                      {/* s/YL */}
                      <td className="py-2 px-2.5 text-right font-bold text-brand-600">
                        {isPast && opsD.sylDay !== null ? formatNumber(opsD.sylDay) : '—'}
                      </td>

                      {/* YL < 250 */}
                      <td className="py-2 px-2 text-right font-bold text-red-600 border-l border-neutral-200 dark:border-neutral-700">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditL250 || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditL250(Math.max(0, Number(e.target.value)))}
                            className="w-12 px-1 py-1 text-right rounded-lg border border-red-400 bg-white dark:bg-neutral-900 font-mono font-bold text-xs focus:ring-2 focus:ring-red-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(opsD.l250)
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* YL < 300 */}
                      <td className="py-2 px-2 text-right font-bold text-amber-600">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={inlineEditL300 || ''}
                            placeholder="0"
                            onChange={(e) => setInlineEditL300(Math.max(0, Number(e.target.value)))}
                            className="w-12 px-1 py-1 text-right rounded-lg border border-amber-400 bg-white dark:bg-neutral-900 font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                          />
                        ) : isPast ? (
                          formatNumber(opsD.l300)
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-1.5 px-2.5 text-center border-l border-neutral-200 dark:border-neutral-700">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSaveInlineEdit(d)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                              title="Simpan perubahan"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Simpan</span>
                            </button>
                            <button
                              onClick={handleCancelInlineEdit}
                              className="px-2 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                              title="Batal edit"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartInlineEdit(d)}
                            disabled={d > day}
                            className={`p-1.5 px-2.5 rounded-lg border flex items-center gap-1 transition-colors ${
                              d > day
                                ? 'opacity-30 cursor-not-allowed border-neutral-200 dark:border-neutral-800 text-neutral-400'
                                : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                            }`}
                            title={d > day ? 'Belum dapat diedit' : `Edit data tanggal ${d}`}
                          >
                            <Edit3 className="w-3 h-3 text-emerald-600" />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                  const wkEnd = WEEKS.find(w => w.end === d);
                  return wkEnd ? [rowEl, ...weekRowsFor(wkEnd)] : [rowEl];
                })}
              </tbody>
              <tfoot className="bg-neutral-100 dark:bg-neutral-800 font-mono font-bold border-t-2 border-neutral-300 dark:border-neutral-700">
                <tr>
                  <td className="py-2.5 px-2.5 font-sans text-neutral-800 dark:text-neutral-200 sticky left-0 z-[5] bg-neutral-100 dark:bg-neutral-800">
                    Total
                  </td>
                  <td className="py-2.5 px-1 text-center" style={{ color: VARIANTS[0].color }}>{formatNumber(periodTotalYo)}</td>
                  <td className="py-2.5 px-1 text-center" style={{ color: VARIANTS[1].color }}>{formatNumber(periodTotalOm)}</td>
                  <td className="py-2.5 px-1 text-center" style={{ color: VARIANTS[2].color }}>{formatNumber(periodTotalOs)}</td>
                  <td className="py-2.5 px-1 text-center" style={{ color: VARIANTS[3].color }}>{formatNumber(periodTotalYt)}</td>
                  <td className={`py-2.5 px-2.5 text-right text-emerald-600 dark:text-emerald-400 text-sm border-b-[3px] ${TOTAL_FRAME}`}>
                    {formatNumber(periodTotalSold)}
                  </td>
                  {/* Total BB per varian & total */}
                  <td className="py-3 px-1.5 text-right text-amber-600 border-l border-neutral-200 dark:border-neutral-700">{formatNumber(periodTotalBbV[0])}</td>
                  <td className="py-3 px-1.5 text-right text-amber-600">{formatNumber(periodTotalBbV[1])}</td>
                  <td className="py-3 px-1.5 text-right text-amber-600">{formatNumber(periodTotalBbV[2])}</td>
                  <td className="py-3 px-1.5 text-right text-amber-600">{formatNumber(periodTotalBbV[3])}</td>
                  <td className="py-3 px-2 text-right text-amber-700 dark:text-amber-400">{formatNumber(periodTotalBb)}</td>
                  <td className={`py-3 px-2 text-right ${getBbStatusClass((periodTotalSold + periodTotalBb) > 0 ? periodTotalBb / (periodTotalSold + periodTotalBb) : 0)}`}>{formatPercent((periodTotalSold + periodTotalBb) > 0 ? periodTotalBb / (periodTotalSold + periodTotalBb) : 0)}</td>

                  {/* Total PDM per varian & total */}
                  <td className="py-3 px-1.5 text-right text-indigo-600 border-l border-neutral-200 dark:border-neutral-700">{formatNumber(periodTotalPdmV[0])}</td>
                  <td className="py-3 px-1.5 text-right text-indigo-600">{formatNumber(periodTotalPdmV[1])}</td>
                  <td className="py-3 px-1.5 text-right text-indigo-600">{formatNumber(periodTotalPdmV[2])}</td>
                  <td className="py-3 px-1.5 text-right text-indigo-600">{formatNumber(periodTotalPdmV[3])}</td>
                  <td className="py-3 px-2.5 text-right text-indigo-700 dark:text-indigo-400">{formatNumber(periodTotalPdm)}</td>

                  <td className="py-3 px-1.5 text-right border-l border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">{akmOps.akmAbsen}</td>
                  <td className="py-3 px-1.5 text-right text-neutral-600 dark:text-neutral-400">{akmOps.akmFrek}</td>
                  <td className="py-3 px-2 text-right text-sky-600 border-l border-neutral-200 dark:border-neutral-700">{formatNumber(tkuOps.jwp)}</td>
                  <td className="py-3 px-2.5 text-right text-brand-600 font-bold">{tkuOps.syl !== null ? formatNumber(tkuOps.syl) : '—'}</td>
                  <td className="py-3 px-2 text-right text-red-600 border-l border-neutral-200 dark:border-neutral-700 font-bold">{tku.l250 ?? l250 ?? 0}</td>
                  <td className="py-3 px-2 text-right text-amber-600 font-bold">{tku.l300 ?? l300 ?? 0}</td>
                  <td className="py-3 px-2.5 text-center border-l border-neutral-200 dark:border-neutral-700 text-xs text-neutral-400 font-sans font-normal">
                    {realisasiDaysToShow.length} Hari
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {confirmDialog}
      {activeSubMenu === 'ringkasan' && (
      <>
      {/* 1. Card Profil Informasi Unit TKU (Ringkas & Sub-card Kanan Kiri Atas Bawah 2x2) */}
      <div className="p-3.5 md:p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base leading-tight break-words font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  {tku.nama} (R{tku.rayon})
                </h1>
                <span className="text-xs font-semibold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {tku.aktif ? 'Aktif' : 'Non-Aktif'}
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                Unit Operasional Rayon {tku.rayon}
              </p>
            </div>
          </div>
        </div>

        {/* Informasi Ringkas: 2x2 Kanan Kiri Atas Bawah */}
        <div className="grid grid-cols-2 @xl:grid-cols-4 gap-2 text-xs">
          <div className="p-2 px-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs uppercase font-bold tracking-wide text-neutral-600 dark:text-neutral-300 block leading-tight">PIC</span>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate text-xs">{tku.pic || 'andriani w'}</p>
            </div>
          </div>

          <div className="p-2 px-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs uppercase font-bold tracking-wide text-neutral-600 dark:text-neutral-300 block leading-tight">HP</span>
              <p className="font-mono font-semibold text-neutral-800 dark:text-neutral-200 truncate text-xs">{tku.hp || '0812-3456-7890'}</p>
            </div>
          </div>

          <div className="p-2 px-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs uppercase font-bold tracking-wide text-neutral-600 dark:text-neutral-300 block leading-tight">Wilayah</span>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate text-xs">{tku.alamat || 'jember kota'}</p>
            </div>
          </div>

          <div className="p-2 px-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs uppercase font-bold tracking-wide text-neutral-600 dark:text-neutral-300 block leading-tight">Tgl Update</span>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate text-xs">
                {formatDateIndo(state.activeDate)}
              </p>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* ========================================================================= */}
      {/* SUB-MENU 1: INPUT PENJUALAN HARI INI                                     */}
      {/* ========================================================================= */}
      {activeSubMenu === 'input' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Pilih Tanggal Input */}
          <div className="p-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                <div>
                  <label htmlFor="tku-input-date" className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block">
                    Pilih Tanggal Input
                  </label>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Kelewatan input? Pilih tanggalnya, isi penjualan, lalu simpan.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="tku-input-date"
                  type="date"
                  min={minInputDate}
                  max={maxInputDate}
                  value={inputDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (val < minInputDate || val > maxInputDate) {
                      showToast('Tanggal harus di dalam bulan kerja dan tidak melewati tanggal update.', 'error');
                      return;
                    }
                    handleDateChange(val);
                  }}
                  className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-mono font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                {isBackdate && (
                  <button
                    type="button"
                    onClick={() => handleDateChange(state.activeDate)}
                    className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Hari ini
                  </button>
                )}
              </div>
            </div>
            {isBackdate && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Kamu sedang mengisi tanggal <strong>{formatDateIndo(inputDate)}</strong> (bukan hari ini).{' '}
                  {backdateExisting
                    ? 'Tanggal ini sudah ada datanya — menyimpan akan menggantikan data lama.'
                    : 'Belum ada data tersimpan untuk tanggal ini.'}{' '}
                  Akumulasi TKU akan dihitung ulang otomatis.
                </span>
              </div>
            )}
          </div>

          {/* Section 1: Sales per Variant */}
          <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-brand-600 text-white flex items-center justify-center text-xs">1</span>
                  Penjualan
                </h2>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200 self-start sm:self-auto">
                Total Terjual: <span className="text-brand-600 dark:text-brand-400">{formatNumber(totalSoldToday)}</span> btl
              </div>
            </div>

            <div className="grid grid-cols-2 @2xl:grid-cols-4 gap-3">
              {VARIANTS.map((v, i) => (
                <div key={v.code} className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors min-w-0">
                  <div className="mb-2 min-w-0">
                    <label className="flex items-center gap-1.5 text-xs font-bold leading-tight" style={{ color: v.color }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                      {v.code}
                    </label>
                    <span className="block text-xs leading-tight text-neutral-500 dark:text-neutral-400 truncate" title={v.name}>{v.name}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={salesV[i] || ''}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        const next = [...salesV] as [number, number, number, number];
                        next[i] = val;
                        setSalesV(next);
                      }}
                      placeholder="0"
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-base font-mono font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-neutral-400 font-sans">btl</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Bottle Return (BB / Return) per Variant */}
          <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs">2</span>
                  BB
                </h2>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200 self-start sm:self-auto">
                Total BB: <span className="text-amber-600 dark:text-amber-400">{formatNumber(totalBbToday)}</span> btl &bull; Rasio: <span className={getBbStatusClass(bbPct)}>{formatPercent(bbPct)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 @2xl:grid-cols-4 gap-3">
              {VARIANTS.map((v, i) => (
                <div key={v.code} className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 min-w-0">
                  <div className="mb-2 min-w-0">
                    <label className="block text-xs font-bold leading-tight text-neutral-700 dark:text-neutral-300">BB {v.code}</label>
                    <span className="block text-xs leading-tight text-neutral-500 dark:text-neutral-400 truncate" title={v.name}>{v.name}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={bbV[i] || ''}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        const next = [...bbV] as [number, number, number, number];
                        next[i] = val;
                        setBbV(next);
                      }}
                      placeholder="0"
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-mono text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-neutral-400">btl</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: PDM per Varian & Total */}
          <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 shadow-sm space-y-4 bg-gradient-to-br from-white via-white to-indigo-50/20 dark:from-neutral-900 dark:via-neutral-900 dark:to-indigo-950/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">3</span>
                  PDM
                </h2>
              </div>

              {/* Total PDM Highlight Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 self-start sm:self-auto shadow-2xs">
                <PackageCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-semibold">Total PDM Hari Ini:</span>
                <span className="text-base font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {formatNumber(totalPdmToday)}
                </span>
                <span className="text-xs font-normal text-indigo-700/80 dark:text-indigo-300">btl</span>
              </div>
            </div>

            <div className="grid grid-cols-2 @2xl:grid-cols-4 gap-3">
              {VARIANTS.map((v, i) => (
                <div key={v.code} className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-800/70 shadow-2xs">
                  <div className="mb-2 min-w-0">
                    <label className="flex items-center gap-1.5 text-xs font-bold leading-tight" style={{ color: v.color }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                      PDM {v.code}
                    </label>
                    <span className="block text-xs leading-tight text-neutral-500 dark:text-neutral-400 truncate" title={v.name}>{v.name}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={pdmV[i] || ''}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        const next = [...pdmV] as [number, number, number, number];
                        next[i] = val;
                        setPdmV(next);
                      }}
                      placeholder="0"
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900 text-sm font-mono font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-neutral-400">btl</span>
                  </div>
                </div>
              ))}
            </div>

            {/* PDM Variant Breakdown Summary */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 flex flex-wrap items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 gap-2">
              <span className="font-medium text-xs">Rincian PDM:</span>
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                {VARIANTS.map((v, i) => (
                  <span key={v.code} className="inline-flex items-center gap-1">
                    <strong style={{ color: v.color }}>{v.code}:</strong> {formatNumber(pdmV[i])} btl
                  </span>
                ))}
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 border-l border-neutral-300 dark:border-neutral-700 pl-3">
                  Σ Total: {formatNumber(totalPdmToday)} btl
                </span>
              </div>
            </div>
          </div>

          {/* Card Kondisi & Parameter Operasional (Dipindah dari menu Realisasi ke setelah PDM, tidak ikut simpan harian) */}
          {renderOpsCard()}

          {/* Section 4: Live Summary Preview */}
          <div className="p-5 bg-gradient-to-r from-brand-50 to-brand-100/50 dark:from-brand-950/30 dark:to-neutral-900 rounded-3xl border border-brand-200 dark:border-brand-900/60 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-bold text-brand-950 dark:text-brand-200">
                Ringkasan
              </h2>
            </div>

            <div className="grid grid-cols-2 @2xl:grid-cols-6 @4xl:grid-cols-5 gap-3 font-mono text-xs items-stretch">
              <div className="p-3.5 bg-white/90 dark:bg-neutral-800/90 rounded-2xl border border-brand-100/80 dark:border-neutral-700/80 shadow-2xs flex flex-col justify-between min-w-0 h-full overflow-hidden col-span-1 @2xl:col-span-2 @4xl:col-span-1">
                <span className="text-xs leading-tight font-sans text-neutral-500 block mb-1 truncate">Total Terjual</span>
                <span className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {formatNumber(totalSoldToday)} <span className="text-xs font-normal text-neutral-400 font-sans">btl</span>
                </span>
              </div>
              <div className="p-3.5 bg-white/90 dark:bg-neutral-800/90 rounded-2xl border border-brand-100/80 dark:border-neutral-700/80 shadow-2xs flex flex-col justify-between min-w-0 h-full overflow-hidden col-span-1 @2xl:col-span-2 @4xl:col-span-1">
                <span className="text-xs leading-tight font-sans text-neutral-500 block mb-1 truncate">Total PDM</span>
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 truncate">
                  {formatNumber(totalPdmToday)} <span className="text-xs font-normal text-neutral-400 font-sans">btl</span>
                </span>
              </div>
              <div className="p-3.5 bg-white/90 dark:bg-neutral-800/90 rounded-2xl border border-brand-100/80 dark:border-neutral-700/80 shadow-2xs flex flex-col justify-between min-w-0 h-full overflow-hidden col-span-1 @2xl:col-span-2 @4xl:col-span-1">
                <span className="text-xs leading-tight font-sans text-neutral-500 block mb-1 truncate">% BB</span>
                <span className={`text-base font-bold truncate ${getBbStatusClass(bbPct)}`}>
                  {formatPercent(bbPct)}
                </span>
              </div>
              <div className="p-3.5 bg-white/90 dark:bg-neutral-800/90 rounded-2xl border border-brand-100/80 dark:border-neutral-700/80 shadow-2xs flex flex-col justify-between min-w-0 h-full overflow-hidden col-span-1 @2xl:col-span-3 @4xl:col-span-1">
                <span className="text-xs leading-tight font-sans text-neutral-500 block mb-1 truncate">YL &lt; 250 / &lt; 300</span>
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {formatPercent(pctL250)} / {formatPercent(pctL300)}
                </span>
              </div>
              <div className="p-3.5 bg-white/90 dark:bg-neutral-800/90 rounded-2xl border border-brand-100/80 dark:border-neutral-700/80 shadow-2xs flex flex-col justify-between min-w-0 h-full overflow-hidden col-span-2 @2xl:col-span-3 @4xl:col-span-1">
                <span className="text-xs leading-tight font-sans text-neutral-500 block mb-1 truncate">s/YL</span>
                <span className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {syl ? formatNumber(syl) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Bar: Save Data */}
          <div className="sticky bottom-4 z-20 p-4 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-lg flex items-center justify-between gap-4">
            <div className="text-xs text-neutral-500 hidden sm:block">
              {isBackdate
                ? `Menyimpan data tanggal ${formatDateIndo(inputDate)} — akumulasi dan rata-rata TKU dihitung ulang otomatis.`
                : 'Perubahan penjualan akan langsung mengupdate akumulasi dan rata-rata kinerja TKU.'}
            </div>

            <button
              onClick={handleSave}
              className="w-full sm:w-auto ml-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isBackdate ? `Simpan Data Tgl ${inputDay} ${period.namaBulanPendek}` : 'Simpan Data Penjualan Hari Ini'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MENU 2: BREAKDOWN RENCANA TARGET (TERPISAH)                           */}
            {/* ========================================================================= */}
      {/* SUB-MENU 2: BREAKDOWN RENCANA PENJUALAN TARGET                            */}
            {/* ========================================================================= */}
      {/* SUB-MENU 2: BREAKDOWN RENCANA PENJUALAN TARGET                            */}
      {/* ========================================================================= */}
      {activeSubMenu === 'breakdown' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {(() => {
            // ---- Ringkasan di atas: vs Target / vs Bln Lalu / vs Thn Lalu (rencana sebulan penuh) ----
            const cumAll = getCumPlanUpToDay(DIM).cumTotal;
            const avgAll = DIM > 0 ? Math.floor(cumAll / DIM) : 0;
            const summaryCards = [
              { label: 'VS TARGET', short: 'Tgt', base: targetHarian, accent: '#6366f1' },
              { label: 'VS BLN LALU', short: 'BL', base: blHarian, accent: '#06b6d4' },
              { label: 'VS THN LALU', short: 'TL', base: tyHarian, accent: '#f59e0b' }
            ].map(c => {
              const pct = c.base > 0 ? avgAll / c.base : 0;
              const diffTotal = cumAll - c.base * DIM;
              const diffPerDay = Math.trunc(diffTotal / Math.max(1, DIM));
              return { ...c, pct, diffTotal, diffPerDay };
            });

            // ---- Tanda warna ----
            // Latar kolom: terlihat jelas di mode terang maupun gelap
            const BAND_GREEN = 'bg-emerald-200 dark:bg-emerald-500/30';
            const BAND_RED = 'bg-red-200 dark:bg-red-500/30';
            const BAND_NEUTRAL = 'bg-neutral-300 dark:bg-neutral-500/35';
            // Bingkai tebal kolom Total (supaya jelas itu kolom total), terang & gelap
            const TOTAL_FRAME = 'border-x-[3px] border-neutral-700 dark:border-neutral-200';

            const sumV = [0, 0, 0, 0];
            let sumTotal = 0;
            const rows: React.ReactNode[] = [];

            for (let d = 1; d <= DIM; d++) {
              const dateObj = new Date(PY, PM0, d);
              const dayShort = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
              const isSun = dateObj.getDay() === 0;
              const isToday = d === day;
              const p = getDayPlanAllVariants(d);
              sumV[0] += p.yo; sumV[1] += p.om; sumV[2] += p.os; sumV[3] += p.yt;
              sumTotal += p.total;

              const isReal = hasActualSavedSalesForDay(d);
              const isDayClosed = isReal || isPastDayLocked(d);
              // Mode Edit Rencana: tanggal lama tampil sebagai RENCANA asli & bisa diedit (kecuali hari Minggu)
              const editingPast = editPastPlan && isDayClosed && !isSun;
              const isDaySaved = isDayClosed && !editingPast;
              // Mode lihat rencana asli: hanya untuk tanggal yang sudah tertutup realisasi, tetap terkunci
              const viewPlan = (showOrigPlan && isDayClosed && !editingPast) || editingPast;
              const shown = viewPlan ? getOriginalPlanAllVariants(d) : p;
              const BAND_PLAN = 'bg-sky-100 dark:bg-sky-500/25';

              // Bandingkan dengan PENCAPAIAN (realisasi) minggu lalu di hari yang sama (tanggal d-7).
              // Bila tanggal d-7 belum punya realisasi, pembandingnya RENCANA BREAKDOWN tanggal d-7 itu sendiri,
              // sehingga perbandingan terus berjalan sampai tanggal terakhir bulan.
              const prevD = d - 7;
              const prevReal = prevD >= 1 && hasActualSavedSalesForDay(prevD) ? getDayActualAllVariants(prevD).total : null;
              const prevPlan = prevD >= 1 ? getDayPlanAllVariants(prevD).total : null;
              const prevIsPlan = prevReal === null && prevPlan !== null && (p.total > 0 || prevPlan > 0);
              const prevTotal = prevReal !== null ? prevReal : prevIsPlan ? prevPlan : null;
              const prevWhat = prevIsPlan ? 'rencana breakdown minggu lalu' : 'pencapaian minggu lalu';
              let totalBand = '';
              let totalTip = 'Belum ada pembanding minggu lalu';
              if (prevTotal !== null) {
                if (p.total > prevTotal) { totalBand = BAND_GREEN; totalTip = `Lebih dari ${prevWhat} (${formatNumber(prevTotal)})`; }
                else if (p.total < prevTotal) { totalBand = BAND_RED; totalTip = `Kurang dari ${prevWhat} (${formatNumber(prevTotal)})`; }
                else { totalBand = BAND_NEUTRAL; totalTip = `Sama dengan ${prevWhat} (${formatNumber(prevTotal)})`; }
              }

              rows.push(
                <tr
                  key={`d${d}`}
                  className={`${
                    isToday
                      ? 'bg-brand-50/60 dark:bg-brand-950/20'
                      : isSun
                      ? 'bg-amber-50/40 dark:bg-amber-950/10'
                      : ''
                  }`}
                >
                  <td className="py-1.5 px-2.5 font-sans whitespace-nowrap">
                    <span className={`font-bold ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-900 dark:text-neutral-100'}`}>Tgl {d}</span>
                    <span className={`block text-xs leading-none ${isSun ? 'text-amber-600 font-medium' : 'text-neutral-400'}`}>{dayShort}{isSun ? ' · libur' : ''}</span>
                  </td>
                  {VARIANTS.map((v, vi) => {
                    const bdR = getBdRect();
                    const isSelCell = !!bdR && (isBdMulti() || bdSelMode) && d >= bdR.d1 && d <= bdR.d2 && vi >= bdR.v1 && vi <= bdR.v2;
                    return (
                    <td
                      key={v.code}
                      data-bd-d={d}
                      data-bd-v={vi}
                      onMouseEnter={() => { if (bdDragging.current) setSelB({ d, v: vi }); }}
                      className={`py-1 px-0.5 text-center ${isSelCell ? 'bg-indigo-200 dark:bg-indigo-500/40 ring-1 ring-inset ring-indigo-400' : viewPlan ? BAND_PLAN : isReal ? BAND_GREEN : ''}`}
                      title={viewPlan ? `Rencana asli • Tgl ${d}` : isReal ? `Realisasi tersimpan • Tgl ${d}` : undefined}
                    >
                      <input
                        id={`bd-input-${d}-${v.code}`}
                        type="text"
                        inputMode="numeric"
                        value={shown[v.code.toLowerCase() as 'yo' | 'om' | 'os' | 'yt'] || ''}
                        placeholder="0"
                        readOnly={isDaySaved || bdSelMode}
                        onMouseDown={(e) => {
                          if (bdSelMode) return;
                          if (e.shiftKey && selA) { e.preventDefault(); setSelB({ d, v: vi }); return; }
                          bdDragging.current = true;
                          setSelA({ d, v: vi });
                          setSelB({ d, v: vi });
                        }}
                        onCopy={handleCellCopy}
                        onCut={handleCellCut}
                        onChange={(e) => {
                          if (isDaySaved || bdSelMode) return;
                          const raw = e.target.value.replace(/[^\d]/g, '');
                          const num = raw === '' ? 0 : parseInt(raw, 10);
                          handleCellChange(d, v.code, isNaN(num) ? 0 : num);
                        }}
                        onFocus={(e) => {
                          if (!isDaySaved) e.target.select();
                          if (!bdDragging.current && !bdSelMode) { setSelA({ d, v: vi }); setSelB({ d, v: vi }); }
                        }}
                        onPaste={(e) => handleCellPaste(e, d, v.code)}
                        onKeyDown={(e) => handleCellKeyDown(e, d, v.code)}
                        className={`w-full max-w-[4.5rem] px-1 py-1 text-center font-mono font-bold text-xs rounded-md border ${editingPast ? 'bg-white dark:bg-neutral-800/80 border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200' : viewPlan ? 'italic bg-transparent border-transparent text-sky-800 dark:text-sky-200' : isReal ? 'bg-transparent border-transparent text-neutral-900 dark:text-neutral-50' : 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700'} ${
                          isDaySaved
                            ? 'cursor-default'
                            : 'hover:border-brand-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none'
                        }`}
                        style={isReal ? undefined : { color: v.color }}
                        title={editingPast ? `Tgl ${d} • Edit rencana ${v.code} (${v.name})` : viewPlan ? `Tgl ${d} • Rencana asli ${v.code} (tidak bisa diedit)` : isDaySaved ? `Tgl ${d} • Realisasi ${v.code}` : `Tgl ${d} • Rencana ${v.code} (${v.name})`}
                      />
                    </td>
                    );
                  })}
                  <td
                    className={`py-1.5 px-2.5 text-right font-mono font-bold text-neutral-900 dark:text-neutral-50 ${viewPlan ? `${BAND_PLAN} italic` : totalBand} ${TOTAL_FRAME}`}
                    title={editingPast ? 'Rencana (sedang diedit)' : viewPlan ? 'Rencana asli (tidak bisa diedit)' : totalTip}
                  >
                    {formatNumber(shown.total)}
                  </td>
                </tr>
              );

              // Baris ringkasan mingguan: rata-rata = akumulasi tgl 1 s/d Sabtu minggu itu ÷ tanggal Sabtu itu
              // (minggu terakhir = tanggal terakhir bulan). vs minggu lalu HANYA di sini.
              const wk = WEEKS.find(w => w.end === d);
              if (wk) {
                const wIdx = WEEKS.indexOf(wk);
                const cw = getCumPlanUpToDay(wk.end);
                const wDiv = Math.max(1, wk.end);
                const avgV = [cw.cumYo, cw.cumOm, cw.cumOs, cw.cumYt].map(x => Math.floor(x / wDiv));
                const avgT = Math.floor(cw.cumTotal / wDiv);
                const prevWk = wIdx > 0 ? WEEKS[wIdx - 1] : null;
                let wkInfo: React.ReactNode = <span className="text-neutral-400">vs mgg lalu: —</span>;
                if (prevWk) {
                  const cp = getCumPlanUpToDay(prevWk.end);
                  const avgPrev = Math.floor(cp.cumTotal / Math.max(1, prevWk.end));
                  if (avgPrev > 0) {
                    const pct = avgT / avgPrev;
                    // Selisih AKUMULASI: akm minggu ini (tgl 1 s/d Sabtu) dikurangi akm bila memakai rata-rata minggu lalu
                    // pada jumlah hari yang sama (cara yang sama dengan selisih vs Target di tabel lain).
                    const akmDiff = cw.cumTotal - avgPrev * wDiv;
                    wkInfo = (
                      <span className={akmDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'}>
                        vs mgg lalu: {formatPercent(pct)} ({formatDiff(akmDiff)})
                      </span>
                    );
                  }
                }
                rows.push(
                  <tr key={`wh${wk.id}`} className="bg-neutral-100 dark:bg-neutral-800 font-sans">
                    <td colSpan={5} className="pt-2 pb-1 px-2.5 text-xs text-neutral-700 dark:text-neutral-200">
                      <div className="flex flex-wrap items-center justify-between gap-x-3">
                        <span><span className="font-bold">Minggu {wk.id}</span><span className="text-neutral-500 dark:text-neutral-400"> · Tgl {wk.start}–{wk.end}</span></span>
                        <span className="text-xs">{wkInfo}</span>
                      </div>
                    </td>
                    <td className={`${TOTAL_FRAME}`} />
                  </tr>,
                  <tr key={`wa${wk.id}`} className="bg-neutral-100 dark:bg-neutral-800 font-mono">
                    <td className="pb-2 pt-0 px-2.5 text-xs leading-tight text-neutral-500 dark:text-neutral-400 font-sans whitespace-nowrap">
                      Rata2<span className="block">÷ {wDiv}</span>
                    </td>
                    {avgV.map((x, k) => (
                      <td key={k} className="pb-2 pt-0 px-1 text-center font-bold" style={{ color: VARIANTS[k].color }}>{formatNumber(x)}</td>
                    ))}
                    <td className={`pb-2 pt-0 px-2.5 text-right font-bold text-neutral-900 dark:text-white ${TOTAL_FRAME}`}>
                      {formatNumber(avgT)}
                      <span className="block text-xs font-normal font-sans text-neutral-500 dark:text-neutral-400">Akm {formatNumber(cw.cumTotal)}</span>
                    </td>
                  </tr>
                );
              }
            }

            return (
              <div className="space-y-3">
                {/* Akumulasi & rata-rata breakdown sebulan (pembagi = tanggal terakhir bulan) */}
                <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-bold tracking-wide text-neutral-500 dark:text-neutral-400 block">AKM BREAKDOWN {period.label.toUpperCase()}</span>
                    <span className="text-lg font-mono font-bold text-neutral-900 dark:text-white">{formatNumber(cumAll)}</span>
                    <span className="text-xs text-neutral-400 font-sans"> btl</span>
                  </div>
                  <div className="text-right min-w-0">
                    <span className="text-xs font-bold tracking-wide text-neutral-500 dark:text-neutral-400 block">RATA2/HR (÷ {DIM})</span>
                    <span className="text-lg font-mono font-bold text-brand-600 dark:text-brand-400">{formatNumber(avgAll)}</span>
                    <span className="text-xs text-neutral-400 font-sans"> btl</span>
                  </div>
                </div>

                {/* Ringkasan di atas */}
                <div className="grid grid-cols-3 gap-2">
                  {summaryCards.map(c => (
                    <div
                      key={c.label}
                      className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs min-w-0"
                      style={{ borderLeft: `4px solid ${c.accent}` }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-xs font-bold tracking-wide text-neutral-500 break-words">{c.label}</span>
                        <span className={`text-xs font-mono font-bold px-1.5 py-px rounded ${c.diffPerDay >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'}`}>
                          {formatDiff(c.diffPerDay)}
                        </span>
                      </div>
                      <div className={`text-base font-mono font-bold leading-tight ${c.pct >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {c.base > 0 ? formatPercent(c.pct) : '—'}
                      </div>
                      <div className="text-xs text-neutral-500 font-mono break-words">
                        {c.short}: {formatNumber(c.base)}/hr
                      </div>
                      <div className={`text-xs font-mono break-words ${c.diffTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        Selisih: {formatDiff(c.diffTotal)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tabel breakdown: Tgl, varian, total (tgl 1 s/d akhir bulan) */}
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <Target className="w-4 h-4 text-brand-600" />
                        Breakdown {period.label}
                      </h3>
                      <button
                        type="button"
                        onClick={() => { if (showOrigPlan) setEditPastPlan(false); setShowOrigPlan(v => !v); }}
                        aria-pressed={showOrigPlan}
                        title={showOrigPlan ? 'Kembali menampilkan realisasi' : 'Lihat rencana asli pada tanggal yang sudah tertutup realisasi'}
                        className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg border transition-colors ${
                          showOrigPlan
                            ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        {showOrigPlan ? 'Lihat Realisasi' : 'Lihat Rencana Asli'}
                      </button>
                      {showOrigPlan && (
                      <button
                        type="button"
                        onClick={() => setEditPastPlan(v => !v)}
                        aria-pressed={editPastPlan}
                        title="Buka kunci tanggal yang sudah lewat untuk mengedit / menghapus rencana breakdown"
                        className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg border transition-colors ${
                          editPastPlan
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {editPastPlan ? 'Selesai Edit' : 'Edit Rencana'}
                      </button>
                      )}
                    </div>
                    {showOrigPlan && editPastPlan && (
                      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 space-y-2">
                        <p className="text-xs text-amber-800 dark:text-amber-200 leading-snug">
                          Mode edit: tanggal lama menampilkan <b>rencana</b> (kotak biru) dan bisa diubah langsung. Realisasi penjualan tidak berubah.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <label className="inline-flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200">
                            Hapus sebelum tgl
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={DIM + 1}
                              value={clearBeforeDay}
                              onChange={(e) => setClearBeforeDay(parseInt(e.target.value, 10) || 1)}
                              className="w-14 px-1.5 py-1 text-center font-mono font-bold rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                            />
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200">
                            <input type="checkbox" checked={clearAllTku} onChange={(e) => setClearAllTku(e.target.checked)} />
                            Semua TKU
                          </label>
                          <button
                            type="button"
                            onClick={() => handleClearPlanBefore(clearBeforeDay, clearAllTku)}
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 font-semibold rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus Rencana
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                      <span className="inline-block w-3 h-3 rounded-sm align-[-2px] mr-1 bg-emerald-300 dark:bg-emerald-500/50" />kolom varian hijau = realisasi tersimpan.
                      {' '}Kolom Total vs pencapaian minggu lalu (hari sama):{' '}
                      <span className="inline-block w-3 h-3 rounded-sm align-[-2px] mx-0.5 bg-red-300 dark:bg-red-500/50" />kurang,{' '}
                      <span className="inline-block w-3 h-3 rounded-sm align-[-2px] mx-0.5 bg-emerald-300 dark:bg-emerald-500/50" />lebih,{' '}
                      <span className="inline-block w-3 h-3 rounded-sm align-[-2px] mx-0.5 bg-neutral-400 dark:bg-neutral-500/60" />sama.
                      {' '}Komputer: seret / Shift+klik lalu Ctrl+C/X/V atau Delete. HP: tekan Pilih Sel, lalu ketuk sel awal dan sel akhir (atau tekan-tahan sel dan geser jari melewati banyak sel), kemudian pakai tombol Salin / Tempel.
                      {showOrigPlan && (
                        <>
                          {' '}<span className="inline-block w-3 h-3 rounded-sm align-[-2px] mx-0.5 bg-sky-300 dark:bg-sky-500/50" />biru miring = rencana asli (hanya lihat). Total, akumulasi, dan rata-rata di bawah tetap memakai realisasi.
                        </>
                      )}
                    </p>
                  </div>
                  <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => { setSelA(null); setSelB(null); setBdSelMode(v => !v); }}
                      aria-pressed={bdSelMode}
                      title="Untuk HP: ketuk sel awal lalu sel akhir untuk memilih rentang"
                      className={`inline-flex items-center gap-1.5 h-8 px-2.5 font-semibold rounded-lg border transition-colors ${
                        bdSelMode
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {bdSelMode ? 'Selesai Pilih' : 'Pilih Sel'}
                    </button>
                    {(bdSelMode || isBdMulti()) && (
                      <>
                        <button type="button" onClick={handleBtnCopy} className="inline-flex items-center gap-1 h-8 px-2.5 font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200">
                          <Copy className="w-3.5 h-3.5" />Salin
                        </button>
                        <button type="button" onClick={handleBtnCut} className="h-8 px-2.5 font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200">
                          Potong
                        </button>
                        <button type="button" onClick={handleBtnPaste} className="h-8 px-2.5 font-semibold rounded-lg border border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300">
                          Tempel
                        </button>
                        <button type="button" onClick={handleBtnClear} className="inline-flex items-center gap-1 h-8 px-2.5 font-semibold rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                          <Trash2 className="w-3.5 h-3.5" />Hapus
                        </button>
                        {(() => {
                          const r = getBdRect();
                          return r ? (
                            <span className="text-neutral-500 dark:text-neutral-400">
                              {(r.d2 - r.d1 + 1) * (r.v2 - r.v1 + 1)} sel (tgl {r.d1}{r.d2 !== r.d1 ? `–${r.d2}` : ''})
                            </span>
                          ) : (
                            <span className="text-neutral-500 dark:text-neutral-400">Ketuk sel awal, atau tekan-tahan lalu geser</span>
                          );
                        })()}
                      </>
                    )}
                  </div>
                  <div ref={bdWrapRef} className={`overflow-x-auto ${bdSelMode ? 'select-none' : ''}`} onClickCapture={handleTableTapSelect}>
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold">
                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                          <th className="py-2 px-2.5">Tgl</th>
                          {VARIANTS.map(v => (
                            <th key={v.code} className="py-2 px-1 text-center" style={{ color: v.color }}>{v.code}</th>
                          ))}
                          <th className={`py-2 px-2.5 text-right font-bold text-neutral-900 dark:text-white border-t-[3px] ${TOTAL_FRAME}`}>Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                        {rows}
                      </tbody>
                      <tfoot className="bg-neutral-100 dark:bg-neutral-800 font-mono font-bold border-t-2 border-neutral-300 dark:border-neutral-700">
                        <tr>
                          <td className="py-2.5 px-2.5 text-neutral-800 dark:text-neutral-200 font-sans">Total</td>
                          {sumV.map((x, k) => (
                            <td key={k} className="py-2.5 px-1 text-center" style={{ color: VARIANTS[k].color }}>{formatNumber(x)}</td>
                          ))}
                          <td className={`py-2.5 px-2.5 text-right text-brand-600 dark:text-brand-400 border-b-[3px] ${TOTAL_FRAME}`}>{formatNumber(sumTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}


      {activeSubMenu === 'realisasi' && renderRealisasiSection()}


      {/* ========================================================================= */}
      {/* SUB-MENU 4: RINGKASAN TKU (SE-INFORMATIF MUNGKIN, SEPERTI DASHBOARD CABANG)*/}
      {/* ========================================================================= */}
      {activeSubMenu === 'ringkasan' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* KARTU TERPADU: PERFORMA PENJUALAN & KONDISI OPERASIONAL TKU */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 md:p-6 space-y-6">
            {/* Header Kartu */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h2 className="text-base leading-tight break-words font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  <span>Rekap Penjualan &amp; Kondisi TKU</span>
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400 border border-brand-200/60 dark:border-brand-900/40">
                  {tku.nama} (Rayon {tku.rayon})
                </span>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  ÷ {divider} hari
                </span>
              </div>
            </div>

            {/* Bagian 1: Performa Penjualan & Capaian Target */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-neutral-700 dark:text-neutral-300 block mb-3">
                1. Performa Penjualan & Capaian Target
              </span>
              <div className="grid grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-4 gap-3.5">
                {/* 1.1 Akumulasi Penjualan */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full">
                  <div>
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">Akumulasi Penjualan</span>
                    <div className="text-lg sm:text-xl font-semibold font-mono tracking-tight break-words text-neutral-900 dark:text-neutral-100">
                      {formatNumber(tkuAkmTotal)} <span className="text-xs font-sans font-normal text-neutral-600 dark:text-neutral-300">btl</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                      <span className="text-neutral-700 dark:text-neutral-300">Rata-rata / hari</span>
                      <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{formatDecimal(tkuDailyAvg)} btl</span>
                    </div>
                  </div>
                </div>

                {/* 1.2 Capaian vs Target */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full">
                  <div>
                    <div className="flex items-start justify-between gap-2 text-neutral-700 dark:text-neutral-300 mb-1 min-w-0">
                      <span className="text-xs font-semibold">Capaian vs Target</span>
                      <Target className="w-4 h-4 text-neutral-600 dark:text-neutral-300 shrink-0" />
                    </div>
                    <div className={`text-lg sm:text-xl font-semibold font-mono tracking-tight break-words ${getStatusClass(akmDiffVsTarget)}`}>
                      {formatPercent(targetPct)}
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                      <span className="text-neutral-700 dark:text-neutral-300">Target: {formatDecimal(targetHarian)}/hr</span>
                      <span className={`font-mono font-bold ${getStatusClass(akmDiffVsTarget)}`}>
                        {formatDiff(akmDiffVsTarget)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                      <span className="text-neutral-700 dark:text-neutral-300">Sisa Target/hr kerja</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{needTarget.text}</span>
                    </div>
                  </div>
                </div>

                {/* 1.3 vs Bulan Lalu (LM) */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full">
                  <div>
                    <div className="flex items-start justify-between gap-2 text-neutral-700 dark:text-neutral-300 mb-1 min-w-0">
                      <span className="text-xs font-semibold">vs Bulan Lalu (LM)</span>
                      <Calendar className="w-4 h-4 text-neutral-600 dark:text-neutral-300 shrink-0" />
                    </div>
                    <div className={`text-lg sm:text-xl font-semibold font-mono tracking-tight break-words ${getStatusClass(akmDiffVsBl)}`}>
                      {formatPercent(blPct)}
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                      <span className="text-neutral-700 dark:text-neutral-300">LM: {formatNumber(blHarian)}/hr</span>
                      <span className={`font-mono font-bold ${getStatusClass(akmDiffVsBl)}`}>
                        {formatDiff(akmDiffVsBl)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                      <span className="text-neutral-700 dark:text-neutral-300">Sisa LM/hr kerja</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{needBl.text}</span>
                    </div>
                  </div>
                </div>

                {/* 1.4 vs Tahun Lalu (LY) */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full">
                  <div>
                    <div className="flex items-start justify-between gap-2 text-neutral-700 dark:text-neutral-300 mb-1 min-w-0">
                      <span className="text-xs font-semibold">vs Tahun Lalu (LY)</span>
                      <Clock className="w-4 h-4 text-neutral-600 dark:text-neutral-300 shrink-0" />
                    </div>
                    <div className={`text-lg sm:text-xl font-semibold font-mono tracking-tight break-words ${getStatusClass(akmDiffVsTy)}`}>
                      {formatPercent(tyPct)}
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                      <span className="text-neutral-700 dark:text-neutral-300">LY: {formatNumber(tyHarian)}/hr</span>
                      <span className={`font-mono font-bold ${getStatusClass(akmDiffVsTy)}`}>
                        {formatDiff(akmDiffVsTy)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                      <span className="text-neutral-700 dark:text-neutral-300">Sisa LY/hr kerja</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{needTy.text}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 2: Kondisi Operasional (8 Kolom Lengkap) */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-neutral-700 dark:text-neutral-300 block mb-3">
                2. Kondisi Operasional (Absensi, JWP, S/YL, PDM, YL &lt; 250, YL &lt; 300)
              </span>
              <div className="grid grid-cols-2 @xl:grid-cols-4 @6xl:grid-cols-8 gap-3 font-mono items-stretch">
                {/* 2.1 Jumlah YL */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-xs leading-tight font-sans text-neutral-700 dark:text-neutral-300 font-semibold block mb-1 break-words">Jumlah YL</span>
                  <span className="text-sm md:text-base leading-tight break-words font-semibold text-neutral-900 dark:text-neutral-100">
                    {yl} <span className="text-xs font-normal text-neutral-600 dark:text-neutral-300 font-sans">/ {ar} area</span>
                  </span>
                  <span className="text-xs text-neutral-700 dark:text-neutral-300 block mt-auto pt-1 leading-snug font-sans break-words" title={`Cover: ${ar > 0 ? truncFixed(((yl / ar) * 100), 0) : 100}%`}>
                    Cover: {ar > 0 ? truncFixed(((yl / ar) * 100), 0) : 100}%
                  </span>
                </div>

                {/* 2.2 Absensi (Absen dulu, baru Freq) */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-xs leading-tight font-sans text-neutral-700 dark:text-neutral-300 font-semibold block mb-1 break-words">Absensi</span>
                  <span className="text-sm md:text-base leading-tight break-words font-semibold text-neutral-900 dark:text-neutral-100">
                    {akmOps.akmAbsen} <span className="text-xs font-normal text-neutral-600 dark:text-neutral-300 font-sans">absen</span>
                  </span>
                  <span className="text-xs text-neutral-700 dark:text-neutral-300 block mt-auto pt-1 leading-snug font-sans break-words">
                    Freq: <strong className="text-neutral-900 dark:text-neutral-100 font-mono font-bold">{akmOps.akmFrek}</strong> kali
                  </span>
                </div>

                {/* 2.3 Akumulasi JWP (dengan EWP di bawahnya) */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-xs leading-tight font-sans text-neutral-700 dark:text-neutral-300 font-semibold block mb-1 break-words">Akumulasi JWP</span>
                  <span className="text-sm md:text-base leading-tight break-words font-semibold text-sky-600 dark:text-sky-400">
                    {formatNumber(effectiveJwp)}
                  </span>
                  <span className="text-xs text-neutral-700 dark:text-neutral-300 block mt-auto pt-1 leading-snug font-sans break-words" title={`EWP: ${effectiveJwp > 0 ? truncFixed((((effectiveJwp - akmOps.akmFrek) / effectiveJwp) * 100), 1) : '0.0'}% ((${formatNumber(effectiveJwp)} - ${akmOps.akmFrek}) ÷ ${formatNumber(effectiveJwp)})`}>
                    EWP: <strong className="text-neutral-900 dark:text-neutral-100 font-mono font-bold">{effectiveJwp > 0 ? truncFixed((((effectiveJwp - akmOps.akmFrek) / effectiveJwp) * 100), 1) : '0.0'}%</strong>
                  </span>
                </div>

                {/* 2.4 s/YL */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-xs leading-tight font-sans text-neutral-700 dark:text-neutral-300 font-semibold block mb-1 break-words">s/YL</span>
                  <span className="text-sm md:text-base leading-tight break-words font-semibold text-brand-600 dark:text-brand-400">
                    {formatNumber(syl !== null ? syl : (effectiveJwp > 0 ? (tkuAkmTotal / effectiveJwp) : 0))} <span className="text-xs font-normal text-neutral-600 dark:text-neutral-300 font-sans">btl</span>
                  </span>
                </div>

                {/* 2.5 Akm PDM (Terupdate) */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-xs leading-tight font-sans text-neutral-700 dark:text-neutral-300 font-semibold block mb-1 break-words">Akm PDM</span>
                  <span className="text-sm md:text-base leading-tight break-words font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatNumber(akmOps.akmPdm)} <span className="text-xs font-normal text-neutral-600 dark:text-neutral-300 font-sans">btl</span>
                  </span>
                  <span className="text-xs text-neutral-700 dark:text-neutral-300 block mt-auto pt-1 leading-snug font-sans break-words">
                    Rata: {divider > 0 ? truncFixed((akmOps.akmPdm / divider), 1) : 0} btl/hr
                  </span>
                </div>

                {/* 2.6 Akm BB */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-xs leading-tight font-sans text-neutral-700 dark:text-neutral-300 font-semibold block mb-1 break-words">Akm BB</span>
                  <span className="text-sm md:text-base leading-tight break-words font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatNumber(akmOps.akmBb)} <span className="text-xs font-normal text-neutral-600 dark:text-neutral-300 font-sans">btl</span>
                  </span>
                  <span className="text-xs text-neutral-700 dark:text-neutral-300 block mt-auto pt-1 leading-snug font-sans break-words">
                    % BB: <strong className={getBbStatusClass(akmBbRatio)}>{formatPercent(akmBbRatio)}</strong>
                  </span>
                </div>

                {/* 2.7 YL < 250 */}
                <div className="p-3.5 rounded-2xl bg-red-50/60 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-xs leading-tight font-sans text-red-700 dark:text-red-400 font-semibold block mb-1 break-words">YL &lt; 250</span>
                  <span className="text-sm md:text-base leading-tight break-words font-semibold text-red-700 dark:text-red-400">
                    {tku.l250 ?? l250 ?? 0} <span className="text-xs font-normal text-red-500 font-sans">YL</span>
                  </span>
                  <span className="text-xs text-red-600 dark:text-red-400 block mt-auto pt-1 leading-snug font-sans break-words font-medium">
                    Rasio: {formatPercent(yl > 0 ? (tku.l250 ?? l250 ?? 0) / yl : 0)}
                  </span>
                </div>

                {/* 2.8 YL < 300 */}
                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-xs leading-tight font-sans text-amber-700 dark:text-amber-400 font-semibold block mb-1 break-words">YL &lt; 300</span>
                  <span className="text-sm md:text-base leading-tight break-words font-semibold text-amber-700 dark:text-amber-400">
                    {tku.l300 ?? l300 ?? 0} <span className="text-xs font-normal text-amber-500 font-sans">YL</span>
                  </span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 block mt-auto pt-1 leading-snug font-sans break-words font-medium">
                    Rasio: {formatPercent(yl > 0 ? (tku.l300 ?? l300 ?? 0) / yl : 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Evaluasi Performa 4 Varian Produk Lengkap */}
          <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand-600" />
                  Komposisi Varian
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="py-2.5 px-3">Varian Produk</th>
                    <th className="py-2.5 px-3 text-right">Akumulasi (btl)</th>
                    <th className="py-2.5 px-3 text-right">Kontribusi</th>
                    <th className="py-2.5 px-3 text-right">Rata/Hari</th>
                    <th className="py-2.5 px-3 text-right">Target Harian</th>
                    <th className="py-2.5 px-3 text-right">% vs Target</th>
                    <th className="py-2.5 px-3 text-right">% vs LM</th>
                    <th className="py-2.5 px-3 text-right">% vs LY</th>
                    <th className="py-2.5 px-3 text-right">Selisih (+/-)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                  {variantMetrics.map(item => (
                    <tr key={item.variant.code} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="py-3 px-3 font-sans font-bold">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.variant.color }} />
                          <span style={{ color: item.variant.color }}>{item.variant.code}</span>
                          <span className="text-neutral-700 dark:text-neutral-300 font-normal">&bull; {item.variant.name}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                        {formatNumber(item.akm)}
                      </td>
                      <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                        {truncFixed(item.share, 1)}%
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        {formatNumber(item.avg)}
                      </td>
                      <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                        {formatNumber(item.vTg)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        <span className={item.pctTg >= 1 ? 'text-emerald-600' : 'text-red-600'}>
                          {formatPercent(item.pctTg)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold">
                        <span className={item.pctBl >= 1 ? 'text-emerald-600' : 'text-neutral-700 dark:text-neutral-300'}>
                          {formatPercent(item.pctBl)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold">
                        <span className={item.pctTy >= 1 ? 'text-emerald-600' : 'text-neutral-700 dark:text-neutral-300'}>
                          {formatPercent(item.pctTy)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        <span className={item.diffTg >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {formatAkmDiffPair(item.diffTg)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-neutral-300 dark:border-neutral-700 font-mono font-bold bg-neutral-50/80 dark:bg-neutral-800/80">
                  <tr>
                    <td className="py-3 px-3 font-sans">Total Seluruh Varian</td>
                    <td className="py-3 px-3 text-right text-neutral-900 dark:text-neutral-100">{formatNumber(tkuAkmTotal)}</td>
                    <td className="py-3 px-3 text-right">100.0%</td>
                    <td className="py-3 px-3 text-right text-brand-600 dark:text-brand-400">{formatNumber(tkuDailyAvg)}</td>
                    <td className="py-3 px-3 text-right">{formatNumber(targetHarian)}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={targetPct >= 1 ? 'text-emerald-600' : 'text-red-600'}>
                        {formatPercent(targetPct)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">{formatPercent(blPct)}</td>
                    <td className="py-3 px-3 text-right">{formatPercent(tyPct)}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={akmDiffVsTarget >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {formatAkmDiffPair(akmDiffVsTarget)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Evaluasi mingguan TKU: capaian vs target, proyeksi, minggu ini vs lalu, tren, posisi di cabang */}
          <EvaluasiPanel state={state} weeks={WEEKS} mode="tku" focusIdx={tkuIdx} showToast={showToast} />

          {/* Grafik Tren Penjualan Harian TKU */}
          <div className="p-4 sm:p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4 min-w-0">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-start gap-2">
                <BarChart3 className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <span>Tren Penjualan</span>
              </h3>
            </div>
            <TrendChart
              salesUnit={1000}
              today={day}
              year={activeYear}
              monthIndex={activeMonth}
              monthShort={period.namaBulanPendek}
              days={trendDays.map(t => ({
                day: t.day,
                sold: t.sold,
                target: t.effTarget,
                lm: t.effBL,
                ly: t.effTY,
                bb: t.bb || 0,
                isSun: t.isSun,
                mult: t.mult,
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
};

