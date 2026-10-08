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
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  CalendarRange,
  Edit3,
  Check,
  PackageCheck,
  Info,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Clock,
  MapPin,
  Phone,
  FileSpreadsheet,
  CheckSquare,
  ListOrdered,
  Award,
  CalendarCheck,
  GitCompare,
  Copy
} from 'lucide-react';
import { AppState, VARIANTS, VariantCode, DailySalesRecord, TkuItem } from '../types';
import { TrendChart } from '../components/TrendChart';
import { 
  formatNumber, 
  formatPercent, 
  formatDiff, 
  getStatusClass, 
  getBbStatusClass, 
  formatDateIndo,
  getPembagiHari,
  getPembagiKhususTku,
  getPeriodInfo,
  SEED_PERIOD
} from '../services/storage';
import { makeUnitAxis, makeNiceAxis, formatAxisLabel } from '../services/chartAxis';
import { REAL_TKU_DAILY_SALES } from '../data/realSalesSeptember2026';
import { saveTkuInputDraft, loadTkuInputDraft, clearTkuInputDraft } from '../services/inputDraft';

interface TkuInputViewProps {
  state: AppState;
  activeSubMenu?: TkuSubMenu;
  onSelectSubMenu?: (sub: TkuSubMenu) => void;
  onSaveTkuInput: (tkuIdx: number, data: DailySalesRecord) => void;
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
  const [internalSubMenu, setInternalSubMenu] = useState<TkuSubMenu>('ringkasan');
  const activeSubMenu = activeSubMenuProp !== undefined ? activeSubMenuProp : internalSubMenu;
  const setActiveSubMenu = (sub: TkuSubMenu) => {
    setInternalSubMenu(sub);
    if (onSelectSubMenu) onSelectSubMenu(sub);
  };
  
  const tkuIdx = state.activeTkuId;
  const tku = state.tkus[tkuIdx] || state.tkus[0];
  const day = state.currentDayNum;
  const divider = getPembagiKhususTku(state, tkuIdx);
  // Info bulan kerja (tidak lagi di-hard-code September 2026)
  const period = getPeriodInfo(state);
  const DIM = period.daysInMonth;
  const PY = period.year;
  const PM0 = period.monthIndex;

  // Existing today's input or defaults
  const existingInput = state.todayInputs[tkuIdx] || {
    v: [0, 0, 0, 0],
    b: [0, 0, 0, 0],
    sold: 0,
    bb: 0,
    pdmV: [0, 0, 0, 0],
    pdm: 0,
    yl: tku.jumlahYl || 10,
    ar: tku.jumlahArea || 10,
    l250: tku.l250 ?? 0,
    l300: tku.l300 ?? 0,
    jwpm: (tku.jumlahYl || 10) * day,
    jwp: (tku.jumlahYl || 10) * day,
    absen: 0,
    frek: 0
  };

  // Tanggal input: default = tanggal update (hari ini), bisa dipilih mundur untuk mengisi tanggal yang terlewat
  const [inputDate, setInputDate] = useState<string>(state.activeDate);
  useEffect(() => {
    setInputDate(state.activeDate);
  }, [state.activeDate]);
  useEffect(() => {
    // Keluar dari menu Input: kembalikan ke tanggal update supaya menu lain tidak ikut membaca tanggal lama
    if (activeSubMenu !== 'input') setInputDate(state.activeDate);
  }, [activeSubMenu]);
  const isBackdate = inputDate !== state.activeDate;
  const inputDay = Number(inputDate.slice(8, 10)) || day;
  const minInputDate = `${period.key}-01`;
  const maxInputDate = state.activeDate;
  const backdateExisting = isBackdate ? state.pjd[inputDate]?.[tkuIdx] : null;

  // Form states for Input Penjualan: inisialisasi awal bersih [0,0,0,0]
  const [salesV, setSalesV] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [bbV, setBbV] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [pdmV, setPdmV] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [yl, setYl] = useState<number>(tku.jumlahYl || 10);
  const [ar, setAr] = useState<number>(tku.jumlahArea || 10);
  const [l250, setL250] = useState<number>(tku.l250 ?? 0);
  const [l300, setL300] = useState<number>(tku.l300 ?? 0);
  const [jwpCustom, setJwpCustom] = useState<number>((tku.jumlahYl || 10) * day);
  const [absen, setAbsen] = useState<number>(0);
  const [frek, setFrek] = useState<number>(0);

  // Breakdown Sub-Menu States
  const [selectedBreakdownPeriod, setSelectedBreakdownPeriod] = useState<'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'ALL'>('M1');

  // Realisasi Sub-Menu States (M1 s/d M5 & Satu Bulan)
  const [selectedRealisasiPeriod, setSelectedRealisasiPeriod] = useState<'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'ALL'>('M1');
  const [inlineEditDay, setInlineEditDay] = useState<number | null>(null);
  const [inlineEditV, setInlineEditV] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [inlineEditBbV, setInlineEditBbV] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [inlineEditPdmV, setInlineEditPdmV] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [inlineEditAbsen, setInlineEditAbsen] = useState<number>(0);
  const [inlineEditFrek, setInlineEditFrek] = useState<number>(0);
  const [inlineEditL250, setInlineEditL250] = useState<number>(0);
  const [inlineEditL300, setInlineEditL300] = useState<number>(0);

  // Ringkasan Sub-Menu Hover Point
  const [hoveredTrend, setHoveredTrend] = useState<{
    day: number;
    val: number;
    bb?: number;
    mult: number;
    effTarget: number;
    effBL: number;
    effTY: number;
    diff: number;
    x?: number;
    y?: number;
  } | null>(null);

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

    // Jika draf bernilai 0 (kosong) tetapi data resmi/seed memiliki data penjualan nyata,
    // MAKA DATA RESMI / SEED HARUS DIUTAMAKAN agar form tidak menjadi kosong!
    const finalSalesV: [number, number, number, number] = draftHasSales
      ? draft!.v
      : (inputHasSales ? input!.v : (draft?.v || [0, 0, 0, 0]));

    const draftHasBb = Boolean(draft && Array.isArray(draft.b) && draft.b.some(x => x > 0));
    const inputHasBb = Boolean(input && Array.isArray(input.b) && input.b.some(x => x > 0));
    const finalBbV: [number, number, number, number] = draftHasBb
      ? draft!.b
      : (inputHasBb ? input!.b : (draft?.b || [0, 0, 0, 0]));

    const draftHasPdm = Boolean(draft && Array.isArray(draft.pdmV) && draft.pdmV.some(x => x > 0));
    const inputHasPdm = Boolean(input && ((Array.isArray(input?.pdmV) && input.pdmV.some(x => x > 0)) || Boolean(input?.pdm && input.pdm > 0)));
    const finalPdmV: [number, number, number, number] = draftHasPdm
      ? draft!.pdmV
      : (inputHasPdm ? (input!.pdmV || [input!.pdm || 0, 0, 0, 0]) : (draft?.pdmV || [0, 0, 0, 0]));

    setSalesV(finalSalesV);
    setBbV(finalBbV);
    setPdmV(finalPdmV);

    setYl(draft?.yl ?? input?.yl ?? tku.jumlahYl ?? 10);
    setAr(draft?.ar ?? input?.ar ?? tku.jumlahArea ?? 10);
    setL250(input?.l250 ?? draft?.l250 ?? tku.l250 ?? 0);
    setL300(input?.l300 ?? draft?.l300 ?? tku.l300 ?? 0);
    setJwpCustom(draft?.jwpCustom ?? input?.jwpm ?? (tku.jumlahYl || 10) * inputDay);
    setAbsen(input?.absen ?? draft?.absen ?? tku.absenYl ?? 0);
    setFrek(input?.frek ?? draft?.frek ?? tku.frekuensiAbsen ?? 0);
  }, [tkuIdx, state.pjd, state.todayInputs, inputDate, tku]);

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

  const effectiveJwp = jwpCustom > 0 ? jwpCustom : (yl * day);
  const tkuAkmTotal = tku.penjualanAkm.reduce((a, b) => a + b, 0);
  const tkuDailyAvg = divider > 0 ? tkuAkmTotal / divider : 0;
  const tkuTarget = tku.targetHarian;
  const diffVsTarget = tkuDailyAvg - tkuTarget;
  const syl = effectiveJwp > 0 ? tkuAkmTotal / effectiveJwp : null;

  // Handle Save Input Penjualan Hari Ini (Data tetap muncul dan tidak hilang dari form setelah disimpan)
  const handleSave = () => {
    const record: DailySalesRecord = {
      v: salesV,
      b: bbV,
      sold: totalSoldToday,
      bb: totalBbToday,
      pdmV: pdmV,
      pdm: totalPdmToday,
      yl: tku.jumlahYl || 10,
      ar: tku.jumlahArea || 10,
      l250,
      l300,
      jwpm: jwpCustom,
      jwp: (tku.jumlahYl || 10) * inputDay,
      absen,
      frek
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

    if (isBackdate) {
      if (inputDate < minInputDate || inputDate > maxInputDate) {
        showToast('Tanggal di luar rentang bulan kerja / melewati tanggal update.', 'error');
        return;
      }
      onReviseDailyData(inputDate, tkuIdx, record);
      showToast(`Penjualan ${tku.nama} tanggal ${formatDateIndo(inputDate)} berhasil disimpan!`, 'success');
      return;
    }

    onSaveTkuInput(tkuIdx, record);

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

  // Helper: Retrieve target or actual realized sales for a specific date and variant
  const getPlannedTargetForDay = (d: number, variant: 'ALL' | VariantCode): number => {
    // Tanggal yang sudah terealisasi (d <= day): Otomatis ambil dari Penjualan Riil!
    if (d <= day) {
      if (variant === 'ALL') {
        return getActualSalesForDay(d, 'YO') + getActualSalesForDay(d, 'OM') + getActualSalesForDay(d, 'OS') + getActualSalesForDay(d, 'YT');
      }
      return getActualSalesForDay(d, variant);
    }
    // Tanggal mendatang (d > day): Ambil dari data rencana breakdown
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

  // Definisi minggu (Senin-Minggu) dari kalender bulan kerja.
  // Pembagi mingguan = tanggal hari Sabtu dalam minggu itu; jika minggu tsb tidak punya Sabtu
  // (minggu terakhir yang terpotong akhir bulan) = tanggal terakhir bulan.
  const WEEKS = useMemo(() => {
    const list: { id: number; label: string; start: number; end: number; saturdayDate: number; days: number[] }[] = [];
    let start = 1;
    for (let d = 1; d <= DIM; d++) {
      if (new Date(PY, PM0, d).getDay() === 0 || d === DIM) {
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

  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startDay: number,
    startVariant: VariantCode
  ) => {
    e.preventDefault();
    const clipData = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text');
    if (!clipData) return;

    // Split rows by newline (supporting Windows \r\n, Mac \r, Linux \n)
    const rawRows = clipData.split(/\r\n|\n|\r/).filter(row => row.trim().length > 0);
    if (rawRows.length === 0) return;

    const startVarIdx = VAR_CODES.indexOf(startVariant);
    if (startVarIdx === -1) return;

    const batchUpdates: { variant: VariantCode; dayIdx: number; val: number }[] = [];

    rawRows.forEach((rowStr, rowOffset) => {
      const targetDay = startDay + rowOffset;
      if (targetDay > DIM) return; // maksimal sebanyak hari di bulan kerja

      // Split cells in row by tab (Excel/Sheets standard), or comma/semicolon
      let cells = rowStr.split('\t');
      if (cells.length === 1 && (rowStr.includes(';') || rowStr.includes(','))) {
        cells = rowStr.split(/[;,]/);
      }

      cells.forEach((cellStr, colOffset) => {
        const targetVarIdx = startVarIdx + colOffset;
        if (targetVarIdx >= VAR_CODES.length) return; // only 4 variants (YO, OM, OS, YT)

        const vCode = VAR_CODES[targetVarIdx];
        const cleaned = cellStr.trim().replace(/[^\d]/g, '');
        const val = cleaned === '' ? 0 : parseInt(cleaned, 10);

        batchUpdates.push({
          variant: vCode,
          dayIdx: targetDay - 1,
          val: isNaN(val) ? 0 : Math.max(0, val)
        });
      });
    });

    if (batchUpdates.length > 0) {
      if (onBatchUpdateBreakdown) {
        onBatchUpdateBreakdown(tkuIdx, batchUpdates);
      } else {
        batchUpdates.forEach(u => {
          onUpdateBreakdownDay(tkuIdx, u.variant, u.dayIdx, u.val);
        });
      }
      showToast(`Berhasil menempel (paste) ${batchUpdates.length} sel target rencana!`, 'success');
    }
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentDay: number,
    currentVariant: VariantCode
  ) => {
    const varIdx = VAR_CODES.indexOf(currentVariant);
    let nextId = '';

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

  const handleCopyAllTargets = () => {
    // Generate TSV format for Excel
    const lines = ['Tanggal\tHari\tYO\tOM\tOS\tYT\tTotal'];
    for (let d = 1; d <= DIM; d++) {
      const dateObj = new Date(PY, PM0, d);
      const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
      const p = getDayPlanAllVariants(d);
      lines.push(`${d}\t${dayName}\t${p.yo}\t${p.om}\t${p.os}\t${p.yt}\t${p.total}`);
    }
    const tsv = lines.join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      showToast('Tabel target rencana berhasil disalin ke clipboard (format Excel/TSV)', 'success');
    }).catch(() => {
      showToast('Gagal menyalin ke clipboard', 'error');
    });
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
      const avgDaily = d > 0 ? Math.round(cum.cumTotal / d) : 0;
      const vsTg = targetHarian > 0 ? ((avgDaily / targetHarian) * 100).toFixed(1) + '%' : '-';
      const vsLm = blHarian > 0 ? ((avgDaily / blHarian) * 100).toFixed(1) + '%' : '-';
      const vsLy = tyHarian > 0 ? ((avgDaily / tyHarian) * 100).toFixed(1) + '%' : '-';
      const pctBbStr = (opsD.pctBb * 100).toFixed(1) + '%';
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
      jwp: (tku.jumlahYl || 10) * d,
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
    onReviseDailyData(revDateStr(d), tkuIdx, record);
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
      o.jwp = last?.jwp || (isSeed ? (t.akmJwp || (o.yl * day)) : (o.yl * day));
      if (!t.aktif) { o.bb = 0; o.pdm = 0; o.absen = 0; o.frek = 0; o.jwp = 0; o.yl = 0; o.area = 0; }
      map[idx] = o;
    });
    return map;
  }, [state.tkus, state.pjd, state.todayInputs, state.activeDate, day, DIM, period.key]);

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
      syl: o.jwp > 0 ? Math.round(accSold / o.jwp) : null,
      cover: o.area > 0 ? o.yl / o.area : null
    };
  };

  const tkuOps = opsOf([tkuIdx], tkuAkmTotal);
  const rayonIdxs = useMemo(() => state.tkus.map((t, i) => (t.aktif && t.rayon === tku.rayon ? i : -1)).filter(i => i >= 0), [state.tkus, tku.rayon]);
  const rayonAccSold = useMemo(() => rayonIdxs.reduce((sum, i) => sum + state.tkus[i].penjualanAkm.reduce((a, b) => a + b, 0), 0), [rayonIdxs, state.tkus]);
  const rayonOps = opsOf(rayonIdxs, rayonAccSold);

  const cabangIdxs = useMemo(() => state.tkus.map((t, i) => (t.aktif ? i : -1)).filter(i => i >= 0), [state.tkus]);
  const cabangAccSold = useMemo(() => cabangIdxs.reduce((sum, i) => sum + state.tkus[i].penjualanAkm.reduce((a, b) => a + b, 0), 0), [cabangIdxs, state.tkus]);
  const cabangOps = opsOf(cabangIdxs, cabangAccSold);

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
    // PDM hari transaksi d adalah pasokan botol untuk hari transaksi berikutnya (Penjualan next + BB next).
    // Jika hari berikutnya libur/tidak ada transaksi (misal Minggu), maka transaksi hari Senin PDM-nya mundur ke Sabtu.
    // Jika tanggal d bukan hari transaksi aktif (misal Minggu libur), PDM adalah 0.
    // Jika tanggal d adalah hari terakhir dengan data (belum ada data transaksi esoknya), menggunakan manual input PDM hari ini.
    let pdmV: [number, number, number, number] = [0, 0, 0, 0];
    let pdm = 0;
    if (isPast) {
      const isSun = new Date(PY, PM0, d).getDay() === 0;
      const hasTransactionToday = sold > 0 || (!isSun && d <= day);

      if (hasTransactionToday) {
        // Cari hari transaksi berikutnya yang sudah tercatat
        let nextD = -1;
        for (let step = d + 1; step <= Math.min(day, DIM); step++) {
          const nextIsSun = new Date(PY, PM0, step).getDay() === 0;
          const nextSold = getActualSalesForDay(step, "ALL");
          if (nextSold > 0 || (!nextIsSun && step <= day)) {
            nextD = step;
            break;
          }
        }

        if (nextD > 0) {
          const nextDStr = `${period.key}-${String(nextD).padStart(2, "0")}`;
          const nextPjdRec = state.pjd[nextDStr]?.[tkuIdx];
          const nextTodayRec = nextD === day ? state.todayInputs[tkuIdx] : null;
          const nextRec = nextPjdRec || nextTodayRec;
          const nextActual = getDayActualAllVariants(nextD);
          const nextSalesV: [number, number, number, number] = nextRec?.v ? nextRec.v : [nextActual.yo, nextActual.om, nextActual.os, nextActual.yt];
          const nextBbV: [number, number, number, number] = nextRec?.b ? nextRec.b : [0, 0, 0, 0];
          pdmV = [
            nextSalesV[0] + nextBbV[0],
            nextSalesV[1] + nextBbV[1],
            nextSalesV[2] + nextBbV[2],
            nextSalesV[3] + nextBbV[3]
          ];
          pdm = pdmV.reduce((a, b) => a + b, 0);
        } else {
          // Hari terakhir (hari ini / belum ada transaksi esoknya): gunakan manual input PDM hari ini
          if (rec?.pdmV) {
            pdmV = [...rec.pdmV];
          } else if (d === day && pdmV) {
            pdmV = [...pdmV];
          } else {
            const manualPdm = rec?.pdm ?? (d === day ? totalPdmToday : 0);
            pdmV = [manualPdm, 0, 0, 0];
          }
          pdm = pdmV.reduce((a, b) => a + b, 0);
        }
      } else {
        pdmV = [0, 0, 0, 0];
        pdm = 0;
      }
    }

    const absen = isPast ? (rec?.absen ?? 0) : 0;
    const frek = isPast ? (rec?.frek ?? 0) : 0;

    const l250Val = isPast ? (rec?.l250 ?? tku.l250 ?? 0) : 0;
    const l300Val = isPast ? (rec?.l300 ?? tku.l300 ?? 0) : 0;

    // Kumulatif s/d tgl d
    const cum = isPast ? getCumActualUpToDay(d) : { cumTotal: 0 };
    let cumBb = 0;
    let cumAbsen = 0;
    let cumFrek = 0;

    if (isPast) {
      for (let i = 1; i <= d; i++) {
        const sStr = `${period.key}-${String(i).padStart(2, "0")}`;
        const r = state.pjd[sStr]?.[tkuIdx] || (i === day ? state.todayInputs[tkuIdx] : null);
        cumBb += r?.bb ?? getDailyOpsForDay(i).bb;
        if (r?.absen !== undefined) cumAbsen = Number(r.absen) || 0;
        if (r?.frek !== undefined) cumFrek = Number(r.frek) || 0;
      }
    }

    const cumPdm = cum.cumTotal + cumBb;
    const cumJwp = (rec?.yl || tku.jumlahYl || 10) * d;
    const sylDay = cumJwp > 0 ? Math.round(cum.cumTotal / cumJwp) : null;

    return {
      sold,
      bbV,
      bb,
      pctBb,
      pdmV,
      pdm,
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

  const blHarian = state.targetBulanLalu[tkuIdx] || 0;
  const blDiff = tkuDailyAvg - blHarian;
  const blPct = blHarian > 0 ? (tkuDailyAvg / blHarian) : 0;

  const tyHarian = state.targetTahunLalu[tkuIdx] || 0;
  const tyDiff = tkuDailyAvg - tyHarian;
  const tyPct = tyHarian > 0 ? (tkuDailyAvg / tyHarian) : 0;



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
    const diffTg = avg - vTg;
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

  // Parameter Operasional Master Chips (Dipindah dari menu Realisasi ke menu Input Penjualan Harian setelah PDM)
  // Parameter Operasional Master Chips (Dipindah dari menu Realisasi ke menu Input Penjualan Harian setelah PDM)
  // Jml YL & Area hanya tampilan (diedit di Profil TKU). JWP otomatis mengikuti tanggal yang dipilih.
  // Absen, Freq, <250, <300 bersifat memperbarui (overwrite/update langsung saat diubah, bukan akumulasi).
  const todayRec = state.todayInputs[tkuIdx];
  const cYl = tku.jumlahYl || 10;
  const cAr = tku.jumlahArea || 10;
  const chipRec = state.pjd[state.activeDate]?.[tkuIdx] || todayRec;
  const cL250 = chipRec?.l250 ?? tku.l250 ?? 0;
  const cL300 = chipRec?.l300 ?? tku.l300 ?? 0;
  const cAbsen = chipRec?.absen ?? tku.absenYl ?? 0;
  const cFrek = chipRec?.frek ?? tku.frekuensiAbsen ?? 0;
  const autoJwp = cYl * day;

  const commitChip = (patch: Partial<DailySalesRecord>) => {
    if (patch.frek !== undefined) setFrek(patch.frek);
    if (patch.absen !== undefined) setAbsen(patch.absen);
    if (patch.l250 !== undefined) setL250(patch.l250);
    if (patch.l300 !== undefined) setL300(patch.l300);

    const savedToday = state.pjd[state.activeDate]?.[tkuIdx];
    const base: DailySalesRecord = savedToday || todayRec || {
      v: [0, 0, 0, 0], b: [0, 0, 0, 0], sold: 0, bb: 0, pdmV: [0, 0, 0, 0], pdm: 0
    };
    const rec: DailySalesRecord = {
      ...base,
      yl: cYl,
      ar: cAr,
      l250: patch.l250 !== undefined ? patch.l250 : cL250,
      l300: patch.l300 !== undefined ? patch.l300 : cL300,
      absen: patch.absen !== undefined ? patch.absen : cAbsen,
      frek: patch.frek !== undefined ? patch.frek : cFrek,
      jwp: autoJwp,
      jwpm: autoJwp,
      ...patch
    };
    saveTkuInputDraft(inputDate, tkuIdx, salesV, bbV, pdmV, {
      yl: cYl,
      ar: cAr,
      l250: patch.l250 !== undefined ? patch.l250 : cL250,
      l300: patch.l300 !== undefined ? patch.l300 : cL300,
      jwpCustom,
      absen: patch.absen !== undefined ? patch.absen : cAbsen,
      frek: patch.frek !== undefined ? patch.frek : cFrek
    });
    onSaveTkuInput(tkuIdx, rec);
  };

  // Card Kondisi & Parameter Operasional (Dipindah dari menu Realisasi ke menu Input Penjualan Harian setelah PDM)
  // Berfungsi otomatis dan tidak ikut simpan harian
  const renderOpsCard = () => (
    <div className="p-4 md:p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-0.5">
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
          Kondisi TKU
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

        {/* 3. JWP (Otomatis Mengikuti Tanggal: YL × Tgl) */}
        <div className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs bg-sky-50/60 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-900/40" title={`JWP Otomatis = ${cYl} YL × Tgl ${day}`}>
          <span className="text-sky-700 dark:text-sky-400 font-semibold">JWP:</span>
          <span className="font-mono font-bold text-sky-700 dark:text-sky-300 px-1">{autoJwp}</span>
        </div>

        {/* 4. Absen (Memperbarui nilai) */}
        <div className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs bg-purple-50/60 dark:bg-purple-950/30 border-purple-200/60 dark:border-purple-900/40">
          <span className="text-purple-700 dark:text-purple-400 font-semibold">Absen:</span>
          <OpsNumberField
            value={cAbsen}
            min={0}
            onCommit={(n) => commitChip({ absen: n })}
            className="w-14 px-1.5 py-0.5 rounded-lg border font-mono font-bold text-center text-xs bg-white dark:bg-neutral-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 focus:ring-purple-500"
          />
        </div>

        {/* 5. Freq Absen (Memperbarui nilai) */}
        <div className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200/60 dark:border-indigo-900/40">
          <span className="text-indigo-700 dark:text-indigo-400 font-semibold">Freq:</span>
          <OpsNumberField
            value={cFrek}
            min={0}
            onCommit={(n) => commitChip({ frek: n })}
            className="w-14 px-1.5 py-0.5 rounded-lg border font-mono font-bold text-center text-xs bg-white dark:bg-neutral-900 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 focus:ring-indigo-500"
          />
        </div>

        {/* 6. YL < 250 (Memperbarui nilai) */}
        <div className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs bg-red-50/60 dark:bg-red-950/30 border-red-200/60 dark:border-red-900/40">
          <span className="text-red-700 dark:text-red-400 font-semibold">YL &lt; 250:</span>
          <OpsNumberField
            value={cL250}
            min={0}
            onCommit={(n) => commitChip({ l250: n })}
            className="w-14 px-1.5 py-0.5 rounded-lg border font-mono font-bold text-center text-xs bg-white dark:bg-neutral-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 focus:ring-red-500"
          />
        </div>

        {/* 7. YL < 300 (Memperbarui nilai) */}
        <div className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/40">
          <span className="text-amber-700 dark:text-amber-400 font-semibold">YL &lt; 300:</span>
          <OpsNumberField
            value={cL300}
            min={0}
            onCommit={(n) => commitChip({ l300: n })}
            className="w-14 px-1.5 py-0.5 rounded-lg border font-mono font-bold text-center text-xs bg-white dark:bg-neutral-900 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 focus:ring-amber-500"
          />
        </div>
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
    let periodTotalAbs = 0;
    let periodTotalFrk = 0;

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

        if (opsD.absen > 0 || opsD.frek > 0) { periodTotalAbs = opsD.absen; periodTotalFrk = opsD.frek; }
      }
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Tabel Detail Realisasi Harian & Operasional */}
        <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-emerald-600" />
                Realisasi Harian
              </h3>
            </div>

            {/* Switcher Minggu & Salin Button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 border border-neutral-200 dark:border-neutral-700 shrink-0">
                {[
                  { id: 'M1', label: 'M1' },
                  { id: 'M2', label: 'M2' },
                  { id: 'M3', label: 'M3' },
                  { id: 'M4', label: 'M4' },
                  { id: 'M5', label: 'M5' },
                  { id: 'ALL', label: 'Satu Bulan' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedRealisasiPeriod(p.id as any);
                      setInlineEditDay(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedRealisasiPeriod === p.id ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                  >
                    {p.label}
                  </button>
                ))}
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
          </div>

          <div className="overflow-x-auto max-h-[650px] border border-neutral-200 dark:border-neutral-800 rounded-2xl">
            <table className="w-full text-xs text-left border-collapse min-w-[1780px]">
              <thead className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold shadow-2xs">
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-2">Hari</th>
                  <th className="py-2.5 px-2 text-right" style={{ color: VARIANTS[0].color }}>YO</th>
                  <th className="py-2.5 px-2 text-right" style={{ color: VARIANTS[1].color }}>OM</th>
                  <th className="py-2.5 px-2 text-right" style={{ color: VARIANTS[2].color }}>OS</th>
                  <th className="py-2.5 px-2 text-right" style={{ color: VARIANTS[3].color }}>YT</th>
                  <th className="py-2.5 px-2.5 text-right font-bold text-neutral-900 dark:text-white">Realisasi Harian</th>
                  <th className="py-2.5 px-2.5 text-right text-emerald-600 dark:text-emerald-400 font-bold">Akumulasi</th>
                  <th className="py-2.5 px-2.5 text-right font-bold">Rata-rata/hr</th>
                  <th className="py-2.5 px-2.5 text-right">vs Tgt</th>
                  <th className="py-2.5 px-2.5 text-right">vs LM</th>
                  <th className="py-2.5 px-2.5 text-right">vs LY</th>
                  
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
                {realisasiDaysToShow.map(d => {
                  const dateObj = new Date(PY, PM0, d);
                  const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
                  const isSun = dateObj.getDay() === 0;
                  const isToday = d === day;
                  const isPast = d <= day;
                  const isEditing = inlineEditDay === d;

                  const r = isPast ? getDayActualAllVariants(d) : { yo: 0, om: 0, os: 0, yt: 0, total: 0 };
                  const cum = isPast ? getCumActualUpToDay(d) : { cumYo: 0, cumOm: 0, cumOs: 0, cumYt: 0, cumTotal: 0 };
                  const opsD = getDailyOpsDetail(d);

                  const dayDivider = d;
                  const avgDaily = (isPast && dayDivider > 0) ? Math.round(cum.cumTotal / dayDivider) : 0;

                  const vsTgPct = (isPast && targetHarian > 0) ? (avgDaily / targetHarian) : 0;
                  const vsTgDiff = avgDaily - targetHarian;

                  const vsBlPct = (isPast && blHarian > 0) ? (avgDaily / blHarian) : 0;
                  const vsBlDiff = avgDaily - blHarian;

                  const vsTyPct = (isPast && tyHarian > 0) ? (avgDaily / tyHarian) : 0;
                  const vsTyDiff = avgDaily - tyHarian;

                  const editTotalSold = inlineEditV[0] + inlineEditV[1] + inlineEditV[2] + inlineEditV[3];
                  const editTotalBb = inlineEditBbV[0] + inlineEditBbV[1] + inlineEditBbV[2] + inlineEditBbV[3];
                  const editTotalPdm = inlineEditPdmV[0] + inlineEditPdmV[1] + inlineEditPdmV[2] + inlineEditPdmV[3];
                  const editPctBb = (editTotalSold + editTotalBb) > 0 ? editTotalBb / (editTotalSold + editTotalBb) : 0;

                  return (
                    <tr
                      key={d}
                      className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors ${isToday ? 'bg-emerald-50/30 dark:bg-emerald-950/20 font-medium' : isSun ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5 font-bold font-sans">
                          <span>Tgl {d}</span>
                          {isToday && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-semibold">
                              Hari Ini
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 font-sans">
                        <span className={isSun ? 'text-amber-600 font-medium' : 'text-neutral-600 dark:text-neutral-400'}>
                          {dayName} {isSun ? '(Libur)' : ''}
                        </span>
                      </td>

                      {/* YO */}
                      <td className="py-1.5 px-1.5 text-right font-bold" style={{ color: VARIANTS[0].color }}>
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
                      <td className="py-1.5 px-1.5 text-right font-bold" style={{ color: VARIANTS[1].color }}>
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
                      <td className="py-1.5 px-1.5 text-right font-bold" style={{ color: VARIANTS[2].color }}>
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
                      <td className="py-1.5 px-1.5 text-right font-bold" style={{ color: VARIANTS[3].color }}>
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
                      <td className="py-2 px-2.5 text-right font-bold text-neutral-900 dark:text-neutral-100">
                        {isEditing ? (
                          <span className="text-emerald-600">{formatNumber(editTotalSold)}</span>
                        ) : isPast ? (
                          formatNumber(r.total)
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>
                        )}
                      </td>

                      {/* Akumulasi */}
                      <td className="py-2 px-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {isPast ? formatNumber(cum.cumTotal) : <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>}
                      </td>

                      {/* Rata-rata / Hari */}
                      <td className="py-2 px-2.5 text-right font-bold text-neutral-900 dark:text-neutral-100">
                        {isPast ? formatNumber(avgDaily) : <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>}
                      </td>

                      {/* vs Target */}
                      <td className="py-2 px-2.5 text-right font-bold">
                        {isPast ? (
                          <>
                            <span className={vsTgPct >= 1 ? 'text-emerald-600' : 'text-red-600'}>
                              {formatPercent(vsTgPct)}
                            </span>
                            <div className="text-[10px] text-neutral-400 font-normal">
                              {vsTgDiff >= 0 ? `+${formatNumber(vsTgDiff)}` : formatNumber(vsTgDiff)}
                            </div>
                          </>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>
                        )}
                      </td>

                      {/* vs LM */}
                      <td className="py-2 px-2.5 text-right font-semibold">
                        {isPast ? (
                          <>
                            <span className={vsBlPct >= 1 ? 'text-emerald-600' : 'text-neutral-600 dark:text-neutral-400'}>
                              {formatPercent(vsBlPct)}
                            </span>
                            <div className="text-[10px] text-neutral-400 font-normal">
                              {vsBlDiff >= 0 ? `+${formatNumber(vsBlDiff)}` : formatNumber(vsBlDiff)}
                            </div>
                          </>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-700 font-normal">—</span>
                        )}
                      </td>

                      {/* vs LY */}
                      <td className="py-2 px-2.5 text-right font-semibold">
                        {isPast ? (
                          <>
                            <span className={vsTyPct >= 1 ? 'text-emerald-600' : 'text-neutral-600 dark:text-neutral-400'}>
                              {formatPercent(vsTyPct)}
                            </span>
                            <div className="text-[10px] text-neutral-400 font-normal">
                              {vsTyDiff >= 0 ? `+${formatNumber(vsTyDiff)}` : formatNumber(vsTyDiff)}
                            </div>
                          </>
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
                })}
              </tbody>
              <tfoot className="sticky bottom-0 bg-neutral-100 dark:bg-neutral-800 font-mono font-bold border-t-2 border-neutral-300 dark:border-neutral-700 shadow-xs">
                <tr>
                  <td colSpan={2} className="py-3 px-3 font-sans text-neutral-800 dark:text-neutral-200">
                    Total {selectedRealisasiPeriod === 'ALL' ? 'Satu Bulan Penuh' : realisasiPeriodTitle}
                  </td>
                  <td className="py-3 px-1.5 text-right" style={{ color: VARIANTS[0].color }}>{formatNumber(periodTotalYo)}</td>
                  <td className="py-3 px-1.5 text-right" style={{ color: VARIANTS[1].color }}>{formatNumber(periodTotalOm)}</td>
                  <td className="py-3 px-1.5 text-right" style={{ color: VARIANTS[2].color }}>{formatNumber(periodTotalOs)}</td>
                  <td className="py-3 px-1.5 text-right" style={{ color: VARIANTS[3].color }}>{formatNumber(periodTotalYt)}</td>
                  <td className="py-3 px-2.5 text-right text-emerald-600 text-sm">
                    {formatNumber(periodTotalSold)} btl
                  </td>
                  <td colSpan={5} className="py-3 px-2.5 text-right text-neutral-500 font-normal font-sans text-xs">
                    Rata: <strong className="text-neutral-900 dark:text-white font-mono">{formatNumber(breakdownDaysToShow.length > 0 ? Math.round(periodTotalSold / breakdownDaysToShow.length) : 0)} btl/hr</strong>
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
                  <td className="py-3 px-2.5 text-center border-l border-neutral-200 dark:border-neutral-700 text-[10px] text-neutral-400 font-sans font-normal">
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
      {/* 1. Card Profil Informasi Unit TKU (Ringkas & Sub-card Kanan Kiri Atas Bawah 2x2) */}
      <div className="p-3.5 md:p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base md:text-lg leading-tight break-words font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  {tku.nama} (R{tku.rayon})
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {tku.aktif ? 'Aktif' : 'Non-Aktif'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Unit Operasional Rayon {tku.rayon}
              </p>
            </div>
          </div>
        </div>

        {/* Informasi Ringkas: 2x2 Kanan Kiri Atas Bawah */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2 px-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 block leading-tight">PIC</span>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate text-[11px]">{tku.pic || 'andriani w'}</p>
            </div>
          </div>

          <div className="p-2 px-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 block leading-tight">HP</span>
              <p className="font-mono font-semibold text-neutral-800 dark:text-neutral-200 truncate text-[11px]">{tku.hp || '0812-3456-7890'}</p>
            </div>
          </div>

          <div className="p-2 px-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 block leading-tight">Wilayah</span>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate text-[11px]">{tku.alamat || 'jember kota'}</p>
            </div>
          </div>

          <div className="p-2 px-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-400 block leading-tight">Tgl Update</span>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate text-[11px]">
                {formatDateIndo(state.activeDate)}
              </p>
            </div>
          </div>
        </div>
      </div>

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
                  <p className="text-[11px] text-neutral-500 mt-0.5">
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
                    setInputDate(val);
                  }}
                  className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-mono font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                {isBackdate && (
                  <button
                    type="button"
                    onClick={() => setInputDate(state.activeDate)}
                    className="px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Hari ini
                  </button>
                )}
              </div>
            </div>
            {isBackdate && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {VARIANTS.map((v, i) => (
                <div key={v.code} className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors min-w-0">
                  <div className="mb-2 min-w-0">
                    <label className="flex items-center gap-1.5 text-xs font-bold leading-tight" style={{ color: v.color }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                      {v.code}
                    </label>
                    <span className="block text-[11px] leading-tight text-neutral-500 dark:text-neutral-400 truncate" title={v.name}>{v.name}</span>
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {VARIANTS.map((v, i) => (
                <div key={v.code} className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 min-w-0">
                  <div className="mb-2 min-w-0">
                    <label className="block text-xs font-bold leading-tight text-neutral-700 dark:text-neutral-300">BB {v.code}</label>
                    <span className="block text-[11px] leading-tight text-neutral-500 dark:text-neutral-400 truncate" title={v.name}>{v.name}</span>
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {VARIANTS.map((v, i) => (
                <div key={v.code} className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-800/70 shadow-2xs">
                  <div className="mb-2 min-w-0">
                    <label className="flex items-center gap-1.5 text-xs font-bold leading-tight" style={{ color: v.color }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                      PDM {v.code}
                    </label>
                    <span className="block text-[11px] leading-tight text-neutral-500 dark:text-neutral-400 truncate" title={v.name}>{v.name}</span>
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
              <span className="font-medium text-[11px]">Rincian PDM:</span>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
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

            <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-5 gap-3 font-mono text-xs items-stretch">
              <div className="p-3.5 bg-white/90 dark:bg-neutral-800/90 rounded-2xl border border-brand-100/80 dark:border-neutral-700/80 shadow-2xs flex flex-col justify-between min-w-0 h-full overflow-hidden col-span-1 md:col-span-2 lg:col-span-1">
                <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 truncate">Total Terjual</span>
                <span className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {formatNumber(totalSoldToday)} <span className="text-xs font-normal text-neutral-400 font-sans">btl</span>
                </span>
              </div>
              <div className="p-3.5 bg-white/90 dark:bg-neutral-800/90 rounded-2xl border border-brand-100/80 dark:border-neutral-700/80 shadow-2xs flex flex-col justify-between min-w-0 h-full overflow-hidden col-span-1 md:col-span-2 lg:col-span-1">
                <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 truncate">Total PDM</span>
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 truncate">
                  {formatNumber(totalPdmToday)} <span className="text-xs font-normal text-neutral-400 font-sans">btl</span>
                </span>
              </div>
              <div className="p-3.5 bg-white/90 dark:bg-neutral-800/90 rounded-2xl border border-brand-100/80 dark:border-neutral-700/80 shadow-2xs flex flex-col justify-between min-w-0 h-full overflow-hidden col-span-1 md:col-span-2 lg:col-span-1">
                <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 truncate">% BB</span>
                <span className={`text-base font-bold truncate ${getBbStatusClass(bbPct)}`}>
                  {formatPercent(bbPct)}
                </span>
              </div>
              <div className="p-3.5 bg-white/90 dark:bg-neutral-800/90 rounded-2xl border border-brand-100/80 dark:border-neutral-700/80 shadow-2xs flex flex-col justify-between min-w-0 h-full overflow-hidden col-span-1 md:col-span-3 lg:col-span-1">
                <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 truncate">YL &lt; 250 / &lt; 300</span>
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {formatPercent(pctL250)} / {formatPercent(pctL300)}
                </span>
              </div>
              <div className="p-3.5 bg-white/90 dark:bg-neutral-800/90 rounded-2xl border border-brand-100/80 dark:border-neutral-700/80 shadow-2xs flex flex-col justify-between min-w-0 h-full overflow-hidden col-span-2 md:col-span-3 lg:col-span-1">
                <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 truncate">s/YL</span>
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
          {/* Controls Bar for Breakdown */}
          <div className="p-4 md:p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-600" />
                Breakdown
              </h2>
            </div>
          </div>

          {/* Card 1: Rekapitulasi Target Rencana Mingguan (Dengan Perbandingan vs Minggu Sebelumnya) */}
          <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-600" />
                  Target Mingguan
                </h3>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                Target Harian: <strong className="text-brand-600">{formatNumber(targetHarian)} btl/hr</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[920px]">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-semibold bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="py-2.5 px-3">Periode Minggu</th>
                    <th className="py-2.5 px-3 text-right">Rencana Minggu Ini</th>
                    <th className="py-2.5 px-3 text-right text-brand-600 dark:text-brand-400 font-bold">Akumulasi</th>
                    <th className="py-2.5 px-3 text-right font-bold">Rata-rata/hr</th>
                    <th className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-white border-l border-neutral-200 dark:border-neutral-700">vs Minggu Sebelumnya (%)</th>
                    <th className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-white">Pertumbuhan / Selisih (btl)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                  {(() => {
                    let runningCumTotal = 0;
                    let runningCumV = [0, 0, 0, 0];
                    let prevWeekTotal: number | null = null;

                    return WEEKS.map((w, wIdx) => {
                      let weekPlanTotal = 0;
                      const weekPlanV = [0, 0, 0, 0];

                      w.days.forEach(d => {
                        VARIANTS.forEach((v, vIdx) => {
                          const p = getPlannedTargetForDay(d, v.code);
                          weekPlanV[vIdx] += p;
                          weekPlanTotal += p;
                        });
                      });

                      // Akumulasi nyambung
                      runningCumTotal += weekPlanTotal;
                      weekPlanV.forEach((val, vIdx) => {
                        runningCumV[vIdx] += val;
                      });

                      // Pembagi Sabtu di minggu tersebut
                      const weekDivider = w.saturdayDate;
                      const avgDaily = weekDivider > 0 ? (runningCumTotal / weekDivider) : 0;

                      // Perhitungan vs Minggu Sebelumnya
                      const vsPrevPct = prevWeekTotal !== null && prevWeekTotal > 0 ? (weekPlanTotal / prevWeekTotal) : null;
                      const vsPrevDiff = prevWeekTotal !== null ? (weekPlanTotal - prevWeekTotal) : null;

                      // Simpan untuk minggu berikutnya
                      const curWeekTotalForNext = weekPlanTotal;
                      prevWeekTotal = curWeekTotalForNext;

                      const pKey = `M${wIdx + 1}` as 'M1' | 'M2' | 'M3' | 'M4' | 'M5';
                      const isSelected = selectedBreakdownPeriod === pKey;

                      return (
                        <tr
                          key={w.id}
                          onClick={() => setSelectedBreakdownPeriod(pKey)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-brand-50/70 dark:bg-brand-950/30 font-semibold'
                              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2 font-sans font-bold">
                              <span>{w.label}</span>
                              <span className="text-[10px] text-neutral-400 font-normal">
                                (Tgl {w.start}–{w.end} {period.namaBulanPendek})
                              </span>
                              {isSelected && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-600 text-white font-semibold">
                                  Terpilih
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                            {formatNumber(weekPlanTotal)} btl
                            <div className="text-[10px] text-neutral-400 font-normal">
                              YO:{formatNumber(weekPlanV[0])} OM:{formatNumber(weekPlanV[1])} OS:{formatNumber(weekPlanV[2])} YT:{formatNumber(weekPlanV[3])}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-brand-600 dark:text-brand-400">
                            {formatNumber(runningCumTotal)} btl
                            <div className="text-[10px] text-neutral-400 font-normal">
                              Akm V: {formatNumber(runningCumV[0])} / {formatNumber(runningCumV[1])} / {formatNumber(runningCumV[2])} / {formatNumber(runningCumV[3])}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                            {formatNumber(Math.round(avgDaily))} btl
                          </td>
                          <td className="py-3 px-3 text-right font-bold border-l border-neutral-200 dark:border-neutral-700">
                            {vsPrevPct !== null ? (
                              <span className={vsPrevPct >= 1 ? 'text-emerald-600' : 'text-red-600'}>
                                {formatPercent(vsPrevPct)}
                              </span>
                            ) : (
                              <span className="text-neutral-400 font-normal font-sans text-xs">— (Baseline M1)</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold">
                            {vsPrevDiff !== null ? (
                              <span className={vsPrevDiff >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                                {vsPrevDiff >= 0 ? `+${formatNumber(vsPrevDiff)}` : formatNumber(vsPrevDiff)} btl
                              </span>
                            ) : (
                              <span className="text-neutral-400 font-normal font-sans text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Detail Rencana Harian per Varian (Selector M1, M2, M3, M4, M5, Satu Bulan) */}
          {(() => {
            let curTotalPlan = 0;
            const curVPlan = [0, 0, 0, 0];

            return (
              <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <Target className="w-5 h-5 text-brand-600" />
                      Rencana Harian
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                        Sel Hijau / Badge "Realisasi": Data Penjualan Riil
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium border border-neutral-200 dark:border-neutral-700">
                        Sel Putih: Target Rencana Sisa Hari (Dapat Diatur)
                      </span>
                    </div>
                  </div>

                  {/* Switcher M1, M2, M3, M4, M5, Satu Bulan */}
                  <div className="inline-flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 border border-neutral-200 dark:border-neutral-700 shrink-0">
                    {[
                      { id: 'M1', label: 'M1' },
                      { id: 'M2', label: 'M2' },
                      { id: 'M3', label: 'M3' },
                      { id: 'M4', label: 'M4' },
                      { id: 'M5', label: 'M5' },
                      { id: 'ALL', label: 'Satu Bulan' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedBreakdownPeriod(p.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedBreakdownPeriod === p.id
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[650px] border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                  <table className="w-full text-xs text-left border-collapse min-w-[1050px]">
                    <thead className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold shadow-2xs">
                      <tr className="border-b border-neutral-200 dark:border-neutral-700">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-2">Hari</th>
                        <th className="py-2.5 px-2 text-right" style={{ color: VARIANTS[0].color }}>YO (Edit)</th>
                        <th className="py-2.5 px-2 text-right" style={{ color: VARIANTS[1].color }}>OM (Edit)</th>
                        <th className="py-2.5 px-2 text-right" style={{ color: VARIANTS[2].color }}>OS (Edit)</th>
                        <th className="py-2.5 px-2 text-right" style={{ color: VARIANTS[3].color }}>YT (Edit)</th>
                        <th className="py-2.5 px-2.5 text-right font-bold text-neutral-900 dark:text-white">Rencana Harian</th>
                        <th className="py-2.5 px-2.5 text-right text-brand-600 dark:text-brand-400 font-bold">Akumulasi</th>
                        <th className="py-2.5 px-2.5 text-right font-bold">Rata-rata/hr (Per Varian & Total)</th>
                        <th className="py-2.5 px-2.5 text-right">vs Tgt ({formatNumber(targetHarian)})</th>
                        <th className="py-2.5 px-2.5 text-right">vs LM ({formatNumber(blHarian)})</th>
                        <th className="py-2.5 px-2.5 text-right">vs LY ({formatNumber(tyHarian)})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                      {breakdownDaysToShow.map(d => {
                        const dateObj = new Date(PY, PM0, d);
                        const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
                        const isSun = dateObj.getDay() === 0;
                        const isToday = d === day;

                        const p = getDayPlanAllVariants(d);
                        const cum = getCumPlanUpToDay(d);
                        curTotalPlan += p.total;
                        curVPlan[0] += p.yo;
                        curVPlan[1] += p.om;
                        curVPlan[2] += p.os;
                        curVPlan[3] += p.yt;

                        const dayDivider = d;
                        const avgYo = dayDivider > 0 ? Math.round(cum.cumYo / dayDivider) : 0;
                        const avgOm = dayDivider > 0 ? Math.round(cum.cumOm / dayDivider) : 0;
                        const avgOs = dayDivider > 0 ? Math.round(cum.cumOs / dayDivider) : 0;
                        const avgYt = dayDivider > 0 ? Math.round(cum.cumYt / dayDivider) : 0;
                        const avgDaily = dayDivider > 0 ? Math.round(cum.cumTotal / dayDivider) : 0;

                        const vsTgPct = targetHarian > 0 ? (avgDaily / targetHarian) : 0;
                        const vsTgDiff = avgDaily - targetHarian;

                        const vsBlPct = blHarian > 0 ? (avgDaily / blHarian) : 0;
                        const vsBlDiff = avgDaily - blHarian;

                        const vsTyPct = tyHarian > 0 ? (avgDaily / tyHarian) : 0;
                        const vsTyDiff = avgDaily - tyHarian;

                        return (
                          <tr 
                            key={d}
                            className={`transition-colors ${
                              isToday
                                ? 'bg-brand-50/50 dark:bg-brand-950/20 font-semibold'
                                : isSun
                                ? 'bg-amber-50/30 dark:bg-amber-950/10 text-neutral-400'
                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                            }`}
                          >
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5 font-bold font-sans">
                                <span>Tgl {d}</span>
                                {isToday && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-600 text-white font-semibold">
                                    Hari Ini
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2 font-sans">
                              <span className={isSun ? 'text-amber-600 font-medium' : 'text-neutral-600 dark:text-neutral-400'}>
                                {dayName} {isSun ? '(Libur)' : ''}
                              </span>
                            </td>
                            {VARIANTS.map(v => (
                              <td key={v.code} className="py-1 px-1 text-right">
                                <input
                                  id={`bd-input-${d}-${v.code}`}
                                  type="text"
                                  inputMode="numeric"
                                  value={p[v.code.toLowerCase() as 'yo' | 'om' | 'os' | 'yt'] || ''}
                                  placeholder="0"
                                  disabled={d <= day}
                                  readOnly={d <= day}
                                  onChange={(e) => {
                                    if (d <= day) return;
                                    const raw = e.target.value.replace(/[^\d]/g, '');
                                    const num = raw === '' ? 0 : parseInt(raw, 10);
                                    handleCellChange(d, v.code, isNaN(num) ? 0 : num);
                                  }}
                                  onFocus={(e) => d > day && e.target.select()}
                                  onPaste={(e) => d > day && handleCellPaste(e, d, v.code)}
                                  onKeyDown={(e) => d > day && handleCellKeyDown(e, d, v.code)}
                                  className={`w-16 px-1.5 py-1 text-right font-mono font-bold text-xs rounded-lg border transition-all shadow-2xs ${
                                    d <= day
                                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300/80 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 cursor-default'
                                      : 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 hover:border-brand-400 focus:border-brand-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-brand-500/20 focus:outline-none'
                                  }`}
                                  style={{ color: d <= day ? undefined : v.color }}
                                  title={d <= day ? `Tgl ${d} • Realisasi Riil ${v.code}` : `Tgl ${d} • Target ${v.code} (${v.name})`}
                                />
                              </td>
                            ))}
                            <td className="py-2 px-2.5 text-right font-bold text-neutral-900 dark:text-neutral-100">
                              {formatNumber(p.total)} btl
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold text-brand-600 dark:text-brand-400">
                              {formatNumber(cum.cumTotal)} btl
                              <div className="text-[10px] text-neutral-400 font-normal">
                                {formatNumber(cum.cumYo)} / {formatNumber(cum.cumOm)} / {formatNumber(cum.cumOs)} / {formatNumber(cum.cumYt)}
                              </div>
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold text-neutral-900 dark:text-neutral-100">
                              {formatNumber(avgDaily)} btl
                              <div className="text-[10px] text-neutral-400 font-normal">
                                Rata V: {formatNumber(avgYo)} / {formatNumber(avgOm)} / {formatNumber(avgOs)} / {formatNumber(avgYt)}
                              </div>
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold">
                              <span className={vsTgPct >= 1 ? 'text-emerald-600' : 'text-red-600'}>
                                {formatPercent(vsTgPct)}
                              </span>
                              <div className={`text-[10px] ${vsTgDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {vsTgDiff >= 0 ? `+${formatNumber(vsTgDiff)}` : formatNumber(vsTgDiff)}
                              </div>
                            </td>
                            <td className="py-2 px-2.5 text-right font-semibold">
                              <span className={vsBlPct >= 1 ? 'text-emerald-600' : 'text-neutral-600 dark:text-neutral-400'}>
                                {formatPercent(vsBlPct)}
                              </span>
                              <div className={`text-[10px] ${vsBlDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {vsBlDiff >= 0 ? `+${formatNumber(vsBlDiff)}` : formatNumber(vsBlDiff)}
                              </div>
                            </td>
                            <td className="py-2 px-2.5 text-right font-semibold">
                              <span className={vsTyPct >= 1 ? 'text-emerald-600' : 'text-neutral-600 dark:text-neutral-400'}>
                                {formatPercent(vsTyPct)}
                              </span>
                              <div className={`text-[10px] ${vsTyDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {vsTyDiff >= 0 ? `+${formatNumber(vsTyDiff)}` : formatNumber(vsTyDiff)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-neutral-100 dark:bg-neutral-800 font-mono font-bold border-t-2 border-neutral-300 dark:border-neutral-700 shadow-xs">
                      <tr>
                        <td colSpan={2} className="py-3 px-3 text-neutral-800 dark:text-neutral-200 font-sans">
                          Total Rencana {breakdownPeriodTitle}
                        </td>
                        <td className="py-3 px-1.5 text-right" style={{ color: VARIANTS[0].color }}>{formatNumber(curVPlan[0])}</td>
                        <td className="py-3 px-1.5 text-right" style={{ color: VARIANTS[1].color }}>{formatNumber(curVPlan[1])}</td>
                        <td className="py-3 px-1.5 text-right" style={{ color: VARIANTS[2].color }}>{formatNumber(curVPlan[2])}</td>
                        <td className="py-3 px-1.5 text-right" style={{ color: VARIANTS[3].color }}>{formatNumber(curVPlan[3])}</td>
                        <td className="py-3 px-2.5 text-right text-brand-600 dark:text-brand-400 text-sm">
                          {formatNumber(curTotalPlan)} btl
                        </td>
                        <td colSpan={5} className="py-3 px-3 text-right text-neutral-500 font-normal font-sans text-xs">
                          {breakdownDaysToShow.length} Hari Kerja Terjadwal
                        </td>
                      </tr>
                    </tfoot>
                  </table>
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
                <h2 className="text-base md:text-lg leading-tight break-words font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  <span>Rekap Penjualan &amp; Kondisi TKU</span>
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400 border border-brand-200/60 dark:border-brand-900/40">
                  {tku.nama} (Rayon {tku.rayon})
                </span>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  ÷ {divider} hari
                </span>
              </div>
            </div>

            {/* Bagian 1: Performa Penjualan & Capaian Target */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-3">
                1. Performa Penjualan & Capaian Target
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1.1 Akumulasi Penjualan */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full">
                  <div>
                    <span className="text-xs font-medium text-neutral-500 block mb-1">Akumulasi Penjualan</span>
                    <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight break-words text-neutral-900 dark:text-neutral-100">
                      {formatNumber(tkuAkmTotal)} <span className="text-xs font-sans font-normal text-neutral-400">btl</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                    <span className="text-neutral-500">Rata-rata / hari</span>
                    <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                      {formatNumber(tkuDailyAvg)} btl
                    </span>
                  </div>
                </div>

                {/* 1.2 vs Target Bulan Ini */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full">
                  <div>
                    <div className="flex items-start justify-between gap-2 text-neutral-500 mb-1 min-w-0">
                      <span className="text-xs font-medium">Capaian vs Target</span>
                      <Target className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    </div>
                    <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight break-words ${getStatusClass(diffVsTarget)}`}>
                      {formatPercent(targetPct)}
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                    <span className="text-neutral-500">Target: {formatNumber(targetHarian)}/hr</span>
                    <span className={`font-mono font-bold ${getStatusClass(diffVsTarget)}`}>
                      {formatDiff(diffVsTarget)} btl
                    </span>
                  </div>
                </div>

                {/* 1.3 vs Bulan Lalu (LM) */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full">
                  <div>
                    <div className="flex items-start justify-between gap-2 text-neutral-500 mb-1 min-w-0">
                      <span className="text-xs font-medium">vs Bulan Lalu (LM)</span>
                      <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    </div>
                    <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight break-words ${getStatusClass(blDiff)}`}>
                      {formatPercent(blPct)}
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                    <span className="text-neutral-500">LM: {formatNumber(blHarian)}/hr</span>
                    <span className={`font-mono font-bold ${getStatusClass(blDiff)}`}>
                      {formatDiff(blDiff)} btl
                    </span>
                  </div>
                </div>

                {/* 1.4 vs Tahun Lalu (LY) */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full">
                  <div>
                    <div className="flex items-start justify-between gap-2 text-neutral-500 mb-1 min-w-0">
                      <span className="text-xs font-medium">vs Tahun Lalu (LY)</span>
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                    <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight break-words ${getStatusClass(tyDiff)}`}>
                      {formatPercent(tyPct)}
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                    <span className="text-neutral-500">LY: {formatNumber(tyHarian)}/hr</span>
                    <span className={`font-mono font-bold ${getStatusClass(tyDiff)}`}>
                      {formatDiff(tyDiff)} btl
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 2: Kondisi Operasional (8 Kolom Lengkap) */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-3">
                2. Kondisi Operasional (Absensi, JWP, S/YL, PDM, YL &lt; 250, YL &lt; 300)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 font-mono items-stretch">
                {/* 2.1 Jumlah YL */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 truncate">Jumlah YL</span>
                  <span className="text-base md:text-lg leading-tight truncate font-bold text-neutral-900 dark:text-neutral-100">
                    {yl} <span className="text-xs font-normal text-neutral-400 font-sans">/ {ar} area</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-auto pt-1 leading-snug font-sans truncate" title={`Cover: ${ar > 0 ? ((yl / ar) * 100).toFixed(0) : 100}%`}>
                    Cover: {ar > 0 ? ((yl / ar) * 100).toFixed(0) : 100}%
                  </span>
                </div>

                {/* 2.2 Absensi (Absen dulu, baru Freq) */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 truncate">Absensi</span>
                  <span className="text-base md:text-lg leading-tight truncate font-bold text-neutral-900 dark:text-neutral-100">
                    {akmOps.akmAbsen} <span className="text-xs font-normal text-neutral-400 font-sans">absen</span>
                  </span>
                  <span className="text-[10px] text-neutral-600 dark:text-neutral-300 block mt-auto pt-1 leading-snug font-sans truncate">
                    Freq: <strong className="text-neutral-900 dark:text-neutral-100 font-mono font-bold">{akmOps.akmFrek}</strong> kali
                  </span>
                </div>

                {/* 2.3 Akumulasi JWP (dengan EWP di bawahnya) */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 truncate">Akumulasi JWP</span>
                  <span className="text-base md:text-lg leading-tight truncate font-bold text-sky-600 dark:text-sky-400">
                    {formatNumber(effectiveJwp)}
                  </span>
                  <span className="text-[10px] text-neutral-600 dark:text-neutral-300 block mt-auto pt-1 leading-snug font-sans truncate" title={`EWP: ${effectiveJwp > 0 ? (((effectiveJwp - akmOps.akmFrek) / effectiveJwp) * 100).toFixed(1) : '0.0'}% ((${formatNumber(effectiveJwp)} - ${akmOps.akmFrek}) ÷ ${formatNumber(effectiveJwp)})`}>
                    EWP: <strong className="text-neutral-900 dark:text-neutral-100 font-mono font-bold">{effectiveJwp > 0 ? (((effectiveJwp - akmOps.akmFrek) / effectiveJwp) * 100).toFixed(1) : '0.0'}%</strong> <span className="text-neutral-400 font-normal">({effectiveJwp - akmOps.akmFrek}/{formatNumber(effectiveJwp)})</span>
                  </span>
                </div>

                {/* 2.4 s/YL */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 truncate">s/YL</span>
                  <span className="text-base md:text-lg leading-tight truncate font-bold text-brand-600 dark:text-brand-400">
                    {formatNumber(Math.round(syl !== null ? syl : (effectiveJwp > 0 ? (tkuAkmTotal / effectiveJwp) : 0)))} <span className="text-xs font-normal text-neutral-400 font-sans">btl</span>
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-auto pt-1 leading-snug font-sans truncate">
                    Akm Pjl &divide; Akm JWP
                  </span>
                </div>

                {/* 2.5 Akm PDM (Terupdate) */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 truncate">Akm PDM</span>
                  <span className="text-base md:text-lg leading-tight truncate font-bold text-indigo-600 dark:text-indigo-400">
                    {formatNumber(akmOps.akmPdm)} <span className="text-xs font-normal text-neutral-400 font-sans">btl</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-auto pt-1 leading-snug font-sans truncate">
                    Rata: {divider > 0 ? (akmOps.akmPdm / divider).toFixed(1) : 0} btl/hr
                  </span>
                </div>

                {/* 2.6 Akm BB */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 truncate">Akm BB</span>
                  <span className="text-base md:text-lg leading-tight truncate font-bold text-neutral-900 dark:text-neutral-100">
                    {formatNumber(akmOps.akmBb)} <span className="text-xs font-normal text-neutral-400 font-sans">btl</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-auto pt-1 leading-snug font-sans truncate">
                    % BB: <strong className={getBbStatusClass(akmBbRatio)}>{formatPercent(akmBbRatio)}</strong>
                  </span>
                </div>

                {/* 2.7 YL < 250 */}
                <div className="p-3.5 rounded-2xl bg-red-50/60 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-[11px] leading-tight font-sans text-red-700 dark:text-red-400 font-medium block mb-1 truncate">YL &lt; 250</span>
                  <span className="text-base md:text-lg leading-tight truncate font-bold text-red-700 dark:text-red-400">
                    {tku.l250 ?? l250 ?? 0} <span className="text-xs font-normal text-red-500 font-sans">YL</span>
                  </span>
                  <span className="text-[10px] text-red-600 dark:text-red-400 block mt-auto pt-1 leading-snug font-sans truncate">
                    Rasio: {formatPercent(yl > 0 ? (tku.l250 ?? l250 ?? 0) / yl : 0)}
                  </span>
                </div>

                {/* 2.8 YL < 300 */}
                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex flex-col justify-between min-w-0 h-full overflow-hidden">
                  <span className="text-[11px] leading-tight font-sans text-amber-700 dark:text-amber-400 font-medium block mb-1 truncate">YL &lt; 300</span>
                  <span className="text-base md:text-lg leading-tight truncate font-bold text-amber-700 dark:text-amber-400">
                    {tku.l300 ?? l300 ?? 0} <span className="text-xs font-normal text-amber-500 font-sans">YL</span>
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-auto pt-1 leading-snug font-sans truncate">
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
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-semibold bg-neutral-50 dark:bg-neutral-800/50">
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
                          <span className="text-neutral-500 font-normal">&bull; {item.variant.name}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                        {formatNumber(item.akm)}
                      </td>
                      <td className="py-3 px-3 text-right text-neutral-600 dark:text-neutral-400">
                        {item.share.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        {formatNumber(item.avg)}
                      </td>
                      <td className="py-3 px-3 text-right text-neutral-500">
                        {formatNumber(item.vTg)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        <span className={item.pctTg >= 1 ? 'text-emerald-600' : 'text-red-600'}>
                          {formatPercent(item.pctTg)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold">
                        <span className={item.pctBl >= 1 ? 'text-emerald-600' : 'text-neutral-600 dark:text-neutral-400'}>
                          {formatPercent(item.pctBl)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold">
                        <span className={item.pctTy >= 1 ? 'text-emerald-600' : 'text-neutral-600 dark:text-neutral-400'}>
                          {formatPercent(item.pctTy)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        <span className={item.diffTg >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {item.diffTg >= 0 ? `+${formatNumber(item.diffTg)}` : formatNumber(item.diffTg)}
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
                      <span className={diffVsTarget >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {diffVsTarget >= 0 ? `+${formatNumber(diffVsTarget)}` : formatNumber(diffVsTarget)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

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

