import React, { useState, useMemo, useEffect } from 'react';
import {
  Archive,
  Save,
  Lock,
  Unlock,
  Upload,
  FileSpreadsheet,
  History,
  TrendingUp,
  Calendar,
  Layers,
  Award,
  BarChart3,
  RotateCcw,
  Users,
  Target,
  Database,
  RefreshCw,
  Trash2,
  ChevronDown,
  Settings2
} from 'lucide-react';
import { AppState, ArchiveRecord, ArchiveRow, VARIANTS } from '../types';
import { ArsipLineChart } from '../components/ArsipYearCharts';
import { ArsipCatatanMingguan } from '../components/ArsipCatatanMingguan';
import { formatNumber, formatDecimal, round2, formatPercent, getPeriodInfo, getBbStatusClass } from '../services/storage';
import { INITIAL_ARCHIVES } from '../data/initialData';

// 'Jember' (arsip lama) dan 'JEMBER 1' (data aktif) adalah unit yang sama
const normNama = (n: string) => {
  const x = (n || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return x === 'jember' ? 'jember 1' : x;
};

// Ambil rata-rata harian TKU tanpa pembulatan ke atas (Math.floor).
// Jika ada data lama yang sempat tersimpan dengan Math.round (misal 4249.5 jadi 4250),
// fungsi ini membatasi maksimumnya ke Math.floor(total / d) = 4249.
const getRowRataHarian = (row: { total?: number; rataHarian?: number }, d: number): number => {
  const days = d || 30;
  const floorVal = Math.floor((row.total || 0) / days);
  if (row.rataHarian !== undefined && !isNaN(row.rataHarian)) {
    return Math.min(Math.floor(row.rataHarian), floorVal);
  }
  return floorVal;
};

const getRowRataVarian = (row: { varian?: number[]; rataVarian?: [number, number, number, number] }, vIdx: number, d: number): number => {
  const days = d || 30;
  const v = row.varian?.[vIdx] || 0;
  const floorVal = Math.floor(v / days);
  if (row.rataVarian && row.rataVarian[vIdx] !== undefined && !isNaN(row.rataVarian[vIdx])) {
    return Math.min(Math.floor(row.rataVarian[vIdx]), floorVal);
  }
  return floorVal;
};


// ===== Agregat level cabang per bulan arsip =====
interface BranchMonth {
  key: string;
  label: string; // "Agustus"
  short: string; // "Agu"
  rata: number; // rata penjualan/hari seluruh cabang
  target: number; // target/hari seluruh cabang
  ly: number; // tahun lalu/hari seluruh cabang
  vsTgt: number | null;
  vsLy: number | null;
  syl: number | null;
  absen: number;
  jmlYl: number;
  l250: number;
  varRata: [number, number, number, number];
}

const aggBranchMonth = (key: string, arc: ArchiveRecord): BranchMonth => {
  const rows = arc.rows || [];
  const d = arc.d || 30;
  const sold = rows.reduce((s, r) => s + (r.total || 0), 0);
  const rata = rows.reduce((s, r) => s + getRowRataHarian(r, d), 0);
  const target = rows.reduce((s, r) => s + (r.targetHarian || 0), 0);
  const ly = rows.reduce((s, r) => s + (r.tahunLalu || 0), 0);
  const jwp = rows.reduce((s, r) => s + (r.akmJwp || 0), 0);
  const label = (arc.namaBulan || key).replace(/\s*\d{4}$/, '');
  const varRata = [0, 1, 2, 3].map(i => rows.reduce((s, r) => s + getRowRataVarian(r, i, d), 0)) as [number, number, number, number];
  return {
    key,
    label,
    short: label.slice(0, 3),
    rata,
    target,
    ly,
    vsTgt: target > 0 ? rata / target : null,
    vsLy: ly > 0 ? rata / ly : null,
    syl: jwp > 0 ? Math.floor(sold / jwp) : null,
    absen: rows.reduce((s, r) => s + (r.absenYl || 0), 0),
    jmlYl: rows.reduce((s, r) => s + (r.jumlahYl || 0), 0),
    l250: rows.reduce((s, r) => s + (r.l250 || 0), 0),
    varRata,
  };
};

const fmtChartDec = (v: number) => formatDecimal(v, Number.isInteger(v) ? 0 : 1);

// ===== Riwayat Tahunan: nilai per TKU / cabang untuk tiap metrik =====
const histRowValue = (metric: HistoricalMetric, row: ArchiveRow, d: number): number => {
  switch (metric) {
    case 'total': return row.total || 0;
    case 'rata': return row.rataHarian ?? (row.total / (d || 31));
    case 'bb': return row.akmBb || 0;
    case 'syl': return row.sYl || 0;
    case 'coverage': return row.coverageArea || (row.jumlahArea ? (row.jumlahYl || 0) / row.jumlahArea : 1);
  }
};

const histBranchValue = (metric: HistoricalMetric, arc: ArchiveRecord): number | null => {
  const rows = arc.rows || [];
  const d = arc.d || 31;
  const sold = rows.reduce((s, r) => s + (r.total || 0), 0);
  switch (metric) {
    case 'total': return sold;
    case 'rata': return sold / d;
    case 'bb': return rows.reduce((s, r) => s + (r.akmBb || 0), 0);
    case 'syl': {
      const jwp = rows.reduce((s, r) => s + (r.akmJwp || 0), 0);
      return jwp > 0 ? Math.floor(sold / jwp) : null;
    }
    case 'coverage': {
      const area = rows.reduce((s, r) => s + (r.jumlahArea || 0), 0);
      const yl = rows.reduce((s, r) => s + (r.jumlahYl || 0), 0);
      return area > 0 ? yl / area : 1;
    }
  }
};

// asAvg = true -> nilai rata-rata (boleh desimal); false -> nilai bulanan
const fmtHist = (metric: HistoricalMetric, v: number, asAvg = false): string => {
  if (metric === 'coverage') return formatPercent(v);
  if (metric === 'rata' || metric === 'syl' || asAvg) return formatDecimal(v);
  return formatNumber(v);
};

interface ArsipViewProps {
  state: AppState;
  onSaveCurrentMonthArchive: () => void;
  onUnlockArchive: (archiveKey: string) => void;
  onImportCsvArchive: (csvText: string) => void;
  onSelectArchive: (archiveKey: string) => void;
  onDeleteArchive?: (archiveKey: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isSyncing?: boolean;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  onManualSync?: () => void;
  onForcePushArchive?: () => void;
  /** Simpan koreksi Absen & Frekuensi per baris arsip (index baris -> nilai baru) */
  onUpdateArchiveAbsen?: (archiveKey: string, patch: Record<number, { absenYl: number; frekuensiAbsen: number; tahunLalu: number }>) => void;
}

type ArchiveTab = 'item_sales' | 'target_eval' | 'ops_bb' | 'all_columns';
type HistoricalMetric = 'total' | 'rata' | 'bb' | 'syl' | 'coverage';

export const ArsipView: React.FC<ArsipViewProps> = ({
  state,
  onSaveCurrentMonthArchive,
  onUnlockArchive,
  onImportCsvArchive,
  onSelectArchive,
  onDeleteArchive,
  showToast,
  isSyncing = false,
  syncStatus = 'idle',
  onManualSync,
  onForcePushArchive,
  onUpdateArchiveAbsen
}) => {
  const [csvInput, setCsvInput] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<ArchiveTab>('item_sales');
  const [histMetric, setHistMetric] = useState<HistoricalMetric>('total');
  // Konfirmasi hapus memakai kotak di dalam aplikasi: window.confirm() diblokir diam-diam di APK/iframe.
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  // Mode koreksi Absen & Frekuensi (hanya arsip buatan sendiri yang kuncinya dibuka)
  const [editAbsen, setEditAbsen] = useState(false);
  const [absenDraft, setAbsenDraft] = useState<Record<number, { abs: string; frk: string; ty: string }>>({});

  const hasSupabase = Boolean(state.supabaseConfig?.u && state.supabaseConfig?.k);

  // Sort descending for selector (Agustus down to Januari)
  const archiveKeysDesc = Object.keys(state.archives).sort((a, b) => b.localeCompare(a));

  // Daftar tahun yang tersedia di arsip (default 2026 dan 2025)
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    Object.keys(state.archives).forEach(k => {
      const y = k.slice(0, 4);
      if (/^\d{4}$/.test(y)) years.add(y);
    });
    years.add('2026');
    years.add('2025');
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [state.archives]);

  const activeKey = state.activeArchiveKey || archiveKeysDesc[0] || '2026-08';
  const activeArchive = state.archives[activeKey];
  // Arsip bawaan (Jan–Agu 2026, dst) selalu dipulihkan dari data bawaan saat dimuat, jadi koreksi hanya untuk arsip lain (mis. September 2026)
  const canEditAbsen = Boolean(activeArchive && !activeArchive.terkunci && !INITIAL_ARCHIVES[activeKey] && onUpdateArchiveAbsen);
  useEffect(() => { setEditAbsen(false); }, [activeKey]);
  const startEditAbsen = () => {
    const d: Record<number, { abs: string; frk: string; ty: string }> = {};
    activeArchive.rows.forEach((r, i) => { d[i] = { abs: String(r.absenYl ?? 0), frk: String(r.frekuensiAbsen ?? 0), ty: String(r.tahunLalu ?? 0) }; });
    setAbsenDraft(d);
    setEditAbsen(true);
  };
  const saveEditAbsen = () => {
    const patch: Record<number, { absenYl: number; frekuensiAbsen: number; tahunLalu: number }> = {};
    Object.keys(absenDraft).forEach(k => {
      const i = Number(k);
      const abs = Math.max(0, Math.round(Number(absenDraft[i].abs) || 0));
      const frk = Math.max(0, Math.round(Number(absenDraft[i].frk) || 0));
      const ty = Math.max(0, Math.round((Number(String(absenDraft[i].ty).replace(',', '.')) || 0) * 100) / 100);
      patch[i] = { absenYl: abs, frekuensiAbsen: frk, tahunLalu: ty };
    });
    onUpdateArchiveAbsen?.(activeKey, patch);
    setEditAbsen(false);
    showToast(`Perubahan arsip ${activeKey} disimpan`, 'success');
  };
  const editBar = (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
      {editAbsen ? (
        <>
          <button type="button" onClick={saveEditAbsen} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700">Simpan</button>
          <button type="button" onClick={() => setEditAbsen(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">Batal</button>
          <span className="text-xs text-neutral-500">Isi Absen, Frekuensi, atau rata-rata Tahun Lalu tiap TKU</span>
        </>
      ) : canEditAbsen ? (
        <button type="button" onClick={startEditAbsen} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-600 text-white hover:bg-brand-700">Edit Absen, Frekuensi &amp; Tahun Lalu</button>
      ) : (
        <span className="text-xs text-neutral-500">
          {INITIAL_ARCHIVES[activeKey]
            ? 'Arsip bawaan tidak bisa diedit.'
            : activeArchive?.terkunci
              ? 'Untuk mengoreksi data arsip, buka kunci arsip dulu lewat menu Opsi Arsip.'
              : ''}
        </span>
      )}
    </div>
  );

  // Filter pilihan tahun (2026, 2025, dst)
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return activeKey ? activeKey.slice(0, 4) : '2026';
  });

  const filteredArchiveKeysDesc = useMemo(() => {
    return archiveKeysDesc.filter(k => k.startsWith(selectedYear));
  }, [archiveKeysDesc, selectedYear]);

  // Urutan kronologis (Januari -> Desember) hanya untuk tahun yang dipilih
  const yearKeysAsc = useMemo(() => [...filteredArchiveKeysDesc].reverse(), [filteredArchiveKeysDesc]);


  // Agregat cabang per bulan (Januari -> bulan terakhir) untuk tahun terpilih
  const branchMonths = useMemo(
    () => yearKeysAsc.filter(k => state.archives[k]?.rows).map(k => aggBranchMonth(k, state.archives[k])),
    [yearKeysAsc, state.archives]
  );
  const chartMonths = useMemo(() => branchMonths.map(m => m.short), [branchMonths]);

  // Ringkasan setahun = rata-rata bulanan (bukan akumulasi)
  const yearSummary = useMemo(() => {
    if (branchMonths.length === 0) return null;
    const n = branchMonths.length;
    const avg = (f: (m: BranchMonth) => number) => branchMonths.reduce((s, m) => s + f(m), 0) / n;
    const rata = avg(m => m.rata);
    const target = avg(m => m.target);
    const ly = avg(m => m.ly);
    return { rata, target, ly, vsTgt: target > 0 ? rata / target : null, vsLy: ly > 0 ? rata / ly : null };
  }, [branchMonths]);

  // Baris "Total Cabang" pada Riwayat Tahunan: rata-rata & nilai terakhir
  const branchHistVals = yearKeysAsc
    .map(k => state.archives[k])
    .filter(a => a && a.rows)
    .map(a => histBranchValue(histMetric, a))
    .filter((v): v is number => v !== null);
  const branchHistAvg = branchHistVals.length ? branchHistVals.reduce((s, v) => s + v, 0) / branchHistVals.length : null;
  const branchHistLatest = branchHistVals.length ? branchHistVals[branchHistVals.length - 1] : null;

  // Overall Statistics across all archives
  const allArchives = filteredArchiveKeysDesc.map(k => state.archives[k]).filter(Boolean);
  const totalMonths = allArchives.length;
  const grandTotalBottles = allArchives.reduce((sum, arc) => {
    return sum + arc.rows.reduce((rSum, row) => rSum + (row.total || 0), 0);
  }, 0);
  // Rata-rata per hari = akumulasi botol ÷ jumlah hari dari Januari sampai bulan terakhir yang terarsip
  const totalDaysArchived = allArchives.reduce((sum, arc) => sum + (arc.d || 0), 0);
  const avgBottlesPerDay = totalDaysArchived > 0 ? grandTotalBottles / totalDaysArchived : 0;

  // Best performing month (rata-rata harian bulan tertinggi)
  const bestMonth = useMemo(() => {
    let best: { namaBulan: string; rata: number; total: number } | null = null;
    for (const arc of allArchives) {
      const d = arc.d || 30;
      const rata = arc.rows.reduce((sum, r) => sum + getRowRataHarian(r, d), 0);
      const total = arc.rows.reduce((sum, r) => sum + (r.total || 0), 0);
      if (!best || rata > best.rata) {
        best = { namaBulan: arc.namaBulan, rata, total };
      }
    }
    return best;
  }, [allArchives]);

  // Active Month KPI Calculations
  const activeStats = useMemo(() => {
    if (!activeArchive || !activeArchive.rows) return null;
    const rows = activeArchive.rows;
    const d = activeArchive.d || 31;

    const totalSold = rows.reduce((s, r) => s + (r.total || 0), 0);
    const avgDailySold = rows.reduce((s, r) => s + getRowRataHarian(r, d), 0);
    const totalYo = rows.reduce((s, r) => s + (r.varian[0] || 0), 0);
    const totalOm = rows.reduce((s, r) => s + (r.varian[1] || 0), 0);
    const totalOs = rows.reduce((s, r) => s + (r.varian[2] || 0), 0);
    const totalYt = rows.reduce((s, r) => s + (r.varian[3] || 0), 0);

    const totalRataYo = rows.reduce((s, r) => s + getRowRataVarian(r, 0, d), 0);
    const totalRataOm = rows.reduce((s, r) => s + getRowRataVarian(r, 1, d), 0);
    const totalRataOs = rows.reduce((s, r) => s + getRowRataVarian(r, 2, d), 0);
    const totalRataYt = rows.reduce((s, r) => s + getRowRataVarian(r, 3, d), 0);

    const totalTargetHarian = rows.reduce((s, r) => s + (r.targetHarian || 0), 0);
    const totalBulanLalu = rows.reduce((s, r) => s + (r.bulanLalu || 0), 0);
    const totalTahunLalu = rows.reduce((s, r) => s + (r.tahunLalu || 0), 0);

    const totalBb = rows.reduce((s, r) => s + (r.akmBb || 0), 0);
    const bbPct = (totalSold + totalBb) > 0 ? (totalBb / (totalSold + totalBb)) : 0; // BB ÷ (Penjualan + BB), sama dengan rumus per-TKU

    const totalArea = rows.reduce((s, r) => s + (r.jumlahArea || 0), 0);
    const totalYl = rows.reduce((s, r) => s + (r.jumlahYl || 0), 0);
    const coveragePct = totalArea > 0 ? (totalYl / totalArea) : 1;

    const totalJwp = rows.reduce((s, r) => s + (r.akmJwp || 0), 0);
    const totalAbsen = rows.reduce((s, r) => s + (r.absenYl || 0), 0);
    const totalFrek = rows.reduce((s, r) => s + (r.frekuensiAbsen || 0), 0);
    const avgSyl = totalJwp > 0 ? Math.floor(totalSold / totalJwp) : 0;

    const vsTargetPct = totalTargetHarian > 0 ? (avgDailySold / totalTargetHarian) : 1;
    const vsLmPct = totalBulanLalu > 0 ? (avgDailySold / totalBulanLalu) : 1;
    const vsLyPct = totalTahunLalu > 0 ? (avgDailySold / totalTahunLalu) : 1;

    return {
      totalSold,
      avgDailySold,
      totalYo,
      totalOm,
      totalOs,
      totalYt,
      totalRataYo,
      totalRataOm,
      totalRataOs,
      totalRataYt,
      totalTargetHarian,
      vsTargetPct,
      totalBulanLalu,
      vsLmPct,
      totalTahunLalu,
      vsLyPct,
      totalBb,
      bbPct,
      totalArea,
      totalYl,
      coveragePct,
      totalJwp,
      avgSyl,
      totalAbsen,
      totalFrek
    };
  }, [activeArchive]);

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvInput.trim()) {
      showToast('Tempel data CSV terlebih dahulu', 'error');
      return;
    }
    onImportCsvArchive(csvInput);
    setCsvInput('');
    setShowImport(false);
  };

  return (
    <div className="space-y-6">
      {confirmDeleteKey && state.archives[confirmDeleteKey] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmDeleteKey(null)}>
          <div className="w-full max-w-sm p-5 space-y-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Hapus arsip {state.archives[confirmDeleteKey].namaBulan || confirmDeleteKey}?
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Hanya catatan arsip ({confirmDeleteKey}) yang dihapus. Data penjualan harian bulan itu tidak ikut terhapus, dan bisa diarsipkan lagi lewat "Simpan Bulan Ini".
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setConfirmDeleteKey(null)} className="px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">Batal</button>
              <button
                onClick={() => { const k = confirmDeleteKey; setConfirmDeleteKey(null); if (onDeleteArchive) onDeleteArchive(k); }}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative">
        <div className="flex items-center gap-3 min-w-0">
          <span className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400">
            <Archive className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Arsip Penjualan
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Rekapitulasi tutup buku bulanan &amp; perbandingan kinerja
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-w-full">
          {/* Tombol Utama: Simpan Bulan Ini */}
          <button
            onClick={() => {
              onSaveCurrentMonthArchive();
              showToast(`Bulan ${getPeriodInfo(state).label} berhasil diarsipkan!`, 'success');
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white shadow-sm shadow-brand-600/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Bulan Ini</span>
          </button>

          {/* Tombol Dropdown Opsi Arsip */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActionsMenu(prev => !prev)}
              aria-label="Opsi Pengelolaan Arsip"
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                showActionsMenu
                  ? 'bg-neutral-200 dark:bg-neutral-700 border-neutral-400 dark:border-neutral-600 text-neutral-900 dark:text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>Opsi</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showActionsMenu ? 'rotate-180' : ''}`} />
            </button>

            {showActionsMenu && (
              <>
                {/* Backdrop dismiss */}
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setShowActionsMenu(false)}
                />

                {/* Floating Menu Card */}
                <div className="absolute right-0 top-full mt-2 z-30 w-56 p-1.5 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 border-b border-neutral-100 dark:border-neutral-700/60">
                    Opsi Arsip ({activeKey})
                  </div>

                  {activeArchive && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsMenu(false);
                        onUnlockArchive(activeKey);
                        showToast(
                          activeArchive.terkunci 
                            ? `Kunci arsip ${activeKey} dibuka untuk koreksi` 
                            : `Arsip ${activeKey} telah dikunci`, 
                          'info'
                        );
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer text-left"
                    >
                      {activeArchive.terkunci ? (
                        <>
                          <Unlock className="w-4 h-4 text-amber-500 shrink-0" />
                          <div>
                            <p className="font-semibold text-neutral-900 dark:text-neutral-100">Buka Kunci</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Izinkan koreksi angka arsip</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <p className="font-semibold text-neutral-900 dark:text-neutral-100">Kunci Arsip</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Kunci data agar aman</p>
                          </div>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionsMenu(false);
                      setShowImport(prev => !prev);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer text-left"
                  >
                    <Upload className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">Impor Data CSV</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Unggah dari Excel/CSV</p>
                    </div>
                  </button>

                  {activeArchive && onDeleteArchive && !INITIAL_ARCHIVES[activeKey] && (
                    <div className="pt-1 border-t border-neutral-100 dark:border-neutral-700/60">
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          setConfirmDeleteKey(activeKey);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors cursor-pointer text-left"
                      >
                        <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                        <div>
                          <p className="font-semibold">Hapus Arsip Ini</p>
                          <p className="text-xs text-red-500/80">Hapus rekapan {activeKey}</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Catatan mingguan TKU untuk bulan arsip yang dipilih */}
      <ArsipCatatanMingguan state={state} periode={activeKey} arsip={state.archives[activeKey]} />

      {/* Supabase Cloud Storage Info & Sync Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col min-w-0 h-full">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            hasSupabase 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
          }`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Database Cloud
              </h2>
              {hasSupabase ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {syncStatus === 'syncing' ? 'Menyinkronkan...' : 'Terhubung'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                  Belum Terhubung
                </span>
              )}
            </div>
          </div>
        </div>

        {hasSupabase && onForcePushArchive && (
          <button
            onClick={onForcePushArchive}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyimpan ke Cloud...' : 'Simpan Semua Arsip ke Supabase'}</span>
          </button>
        )}
      </div>

      {/* Summary KPI Cards across Archives */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 items-stretch">
        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col min-w-0 h-full">
          <div className="flex items-start justify-between gap-2 text-neutral-500 text-xs mb-1">
            <span>Periode Arsip</span>
            <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl lg:text-2xl break-words leading-tight font-bold text-neutral-900 dark:text-neutral-100">
            {totalMonths} Bulan <span className="text-xs font-semibold text-neutral-500">({selectedYear})</span>
          </div>
          <div className="text-xs text-neutral-500 mt-auto pt-0.5 break-words">
            {yearKeysAsc.length > 0
              ? `${(state.archives[yearKeysAsc[0]]?.namaBulan || yearKeysAsc[0]).replace(/\s*\d{4}$/, '')} – ${state.archives[yearKeysAsc[yearKeysAsc.length - 1]]?.namaBulan || yearKeysAsc[yearKeysAsc.length - 1]}`
              : '—'}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col min-w-0 h-full">
          <div className="flex items-start justify-between gap-2 text-neutral-500 text-xs mb-1">
            <span>Total Botol Terarsip</span>
            <Layers className="w-4 h-4 text-brand-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl lg:text-2xl break-words leading-tight font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {formatNumber(grandTotalBottles)}
          </div>
          <div className="text-xs text-neutral-500 mt-auto pt-0.5 break-words">
            Botol seluruh cabang
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col min-w-0 h-full">
          <div className="flex items-start justify-between gap-2 text-neutral-500 text-xs mb-1">
            <span>Rata-rata / Hari</span>
            <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-xl lg:text-2xl break-words leading-tight font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {formatDecimal(avgBottlesPerDay)}
          </div>
          <div className="text-xs text-neutral-500 mt-auto pt-0.5 break-words">
            {formatNumber(grandTotalBottles)} btl ÷ {totalDaysArchived} hari
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col min-w-0 h-full">
          <div className="flex items-start justify-between gap-2 text-neutral-500 text-xs mb-1">
            <span>Rata-rata Bulan Tertinggi</span>
            <Award className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
            {bestMonth ? bestMonth.namaBulan : '—'}
          </div>
          <div className="text-xs text-neutral-500 mt-0.5 font-mono">
            {bestMonth ? `${formatDecimal(bestMonth.rata)} btl/hr` : '—'}
          </div>
        </div>
      </div>

      {/* Impor Spreadsheet Accordion */}
      {showImport && (
        <form
          onSubmit={handleImportSubmit}
          className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-brand-200 dark:border-brand-900 shadow-md space-y-3 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Impor CSV
            </h2>
          </div>
          <p className="text-xs text-neutral-500 leading-normal">
            Tempel data per baris: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono">tanggal,nama_tku,varian,botol,bb</code>.<br />
            Contoh: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono">2026-08-01,Jember 1,YO,1990,150</code>. Varian yang valid: YO, OM, OS, YT.
          </p>

          <textarea
            rows={5}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder="2026-07-01,Jember 1,YO,2100,120&#10;2026-07-01,Jember 1,OM,310,20&#10;2026-07-01,Pelita,YO,2400,135"
            className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowImport(false)}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700"
            >
              Proses & Tambah ke Arsip
            </button>
          </div>
        </form>
      )}

      {/* Archive Year & Month Selector */}
      {archiveKeysDesc.length > 0 && (
        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
          {/* Level 1: Pilih Tahun */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                Pilih Tahun:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {availableYears.map(yr => {
                const countInYr = archiveKeysDesc.filter(k => k.startsWith(yr)).length;
                const isYrActive = selectedYear === yr;
                return (
                  <button
                    key={yr}
                    onClick={() => {
                      setSelectedYear(yr);
                      const inYr = archiveKeysDesc.filter(k => k.startsWith(yr));
                      if (inYr.length > 0 && (!activeKey || !activeKey.startsWith(yr))) {
                        onSelectArchive(inYr[0]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isYrActive
                        ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-600'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <span>Tahun {yr}</span>
                    <span className={`text-xs px-1.5 py-0.2 rounded-full font-mono ${
                      isYrActive ? 'bg-brand-700 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}>
                      {countInYr}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level 2: Pilih Bulan */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Pilih Bulan ({selectedYear}):
              </span>
              <span className="text-xs text-neutral-500">
                {filteredArchiveKeysDesc.length} Bulan Tersedia
              </span>
            </div>

            {filteredArchiveKeysDesc.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {filteredArchiveKeysDesc.map(k => {
                  const arc = state.archives[k];
                  const isSelected = k === activeKey;
                  const totalBtl = arc?.rows ? arc.rows.reduce((sum, r) => sum + r.total, 0) : 0;
                  return (
                    <button
                      key={k}
                      onClick={() => onSelectArchive(k)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex flex-col items-start gap-0.5 ${
                        isSelected
                          ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-600/30'
                          : 'bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <span className="font-bold">{arc?.namaBulan || k}</span>
                      <span className={`text-xs font-mono ${isSelected ? 'text-brand-100' : 'text-neutral-500'}`}>
                        {formatNumber(totalBtl)} btl
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-dashed border-neutral-300 dark:border-neutral-700">
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  Belum ada data arsip untuk tahun {selectedYear}.
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Data dapat diisikan nanti dari file Excel (Oktober, November, Desember 2025).
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Archive Snapshot Details */}
      {activeArchive && activeStats ? (
        <div className="space-y-4">
          {/* Active Month Operational & Sales KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 items-stretch">
            {/* Card 1: Penjualan & Target */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col min-w-0 h-full">
              <div className="flex items-start justify-between gap-2 text-neutral-500 text-xs mb-1">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Penjualan & Target</span>
                <Target className="w-4 h-4 text-brand-500 shrink-0" />
              </div>
              <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono break-words leading-tight">
                {formatNumber(activeStats.totalSold)} <span className="text-xs font-normal text-neutral-500">btl</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-neutral-500 mt-auto border-t border-neutral-100 dark:border-neutral-800 pt-1">
                <span>Rata: <b className="text-neutral-800 dark:text-neutral-200 font-mono">{formatDecimal(activeStats.avgDailySold)}</b>/hr</span>
                <span className={`font-bold ${activeStats.vsTargetPct >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {formatPercent(activeStats.vsTargetPct)} Tgt
                </span>
              </div>
            </div>

            {/* Card 2: Balik Botol */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col min-w-0 h-full">
              <div className="flex items-start justify-between gap-2 text-neutral-500 text-xs mb-1">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Akumulasi Balik Botol</span>
                <RotateCcw className="w-4 h-4 text-sky-500 shrink-0" />
              </div>
              <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono break-words leading-tight">
                {formatNumber(activeStats.totalBb)} <span className="text-xs font-normal text-neutral-500">btl</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-neutral-500 mt-auto border-t border-neutral-100 dark:border-neutral-800 pt-1">
                <span>Rasio Retur:</span>
                <span className="font-bold text-sky-600 dark:text-sky-400 font-mono">
                  {formatPercent(activeStats.bbPct)}
                </span>
              </div>
            </div>

            {/* Card 3: s/YL & JWP */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col min-w-0 h-full">
              <div className="flex items-start justify-between gap-2 text-neutral-500 text-xs mb-1">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">s/YL</span>
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
              <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono break-words leading-tight">
                {activeStats.avgSyl} <span className="text-xs font-normal text-neutral-500">btl</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-neutral-500 mt-auto border-t border-neutral-100 dark:border-neutral-800 pt-1">
                <span>Akm JWP:</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200 font-mono">
                  {formatNumber(activeStats.totalJwp)}
                </span>
              </div>
            </div>

            {/* Card 4: Coverage Area & Presensi */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col min-w-0 h-full">
              <div className="flex items-start justify-between gap-2 text-neutral-500 text-xs mb-1">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Area & Presensi YL</span>
                <Users className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
              <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono break-words leading-tight">
                {formatPercent(activeStats.coveragePct)} <span className="text-xs font-normal text-neutral-500">Cover</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-neutral-500 mt-auto border-t border-neutral-100 dark:border-neutral-800 pt-1">
                <span>{activeStats.totalYl}/{activeStats.totalArea} YL Area</span>
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  Absen: {activeStats.totalAbsen} (Frek {activeStats.totalFrek})
                </span>
              </div>
            </div>
          </div>

          {/* Table Container with Tab Navigation */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3 min-w-0">
              <div className="shrink-0">
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-600" />
                  <span>Detail Arsip: {activeArchive.namaBulan}</span>
                </h2>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto max-w-full min-w-0">
                <button
                  onClick={() => setActiveTab('item_sales')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'item_sales'
                      ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  Rata & Varian Item
                </button>
                <button
                  onClick={() => setActiveTab('target_eval')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'target_eval'
                      ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  Vs Target, Bln Lalu & Thn Lalu
                </button>
                <button
                  onClick={() => setActiveTab('ops_bb')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'ops_bb'
                      ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  Balik Botol & Operasional YL
                </button>
                <button
                  onClick={() => setActiveTab('all_columns')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'all_columns'
                      ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  Semua Kolom
                </button>
              </div>
            </div>

            {/* TAB 1: Rata-rata per Item & Varian */}
            {activeTab === 'item_sales' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                      <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
                      <th className="py-2.5 px-2 font-semibold">Rayon</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-red-600 dark:text-red-400">YO (Ori)</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-red-700/70">Rata YO</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">OM (Mangga)</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-amber-700/70">Rata OM</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-pink-600 dark:text-pink-400">OS (Stroberi)</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-pink-700/70">Rata OS</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-sky-600 dark:text-sky-400">YT (Light)</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-sky-700/70">Rata YT</th>
                      <th className="py-2.5 px-4 text-right font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-100/50 dark:bg-neutral-800/50">Total Botol</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Rata/Hari</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                    {activeArchive.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                          {row.nama}
                        </td>
                        <td className="py-3 px-2 font-sans">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                            row.rayon === 1 ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700'
                          }`}>
                            R{row.rayon}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(row.varian[0])}</td>
                        <td className="py-3 px-3 text-right text-neutral-500">{formatDecimal(getRowRataVarian(row, 0, activeArchive.d))}</td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(row.varian[1])}</td>
                        <td className="py-3 px-3 text-right text-neutral-500">{formatDecimal(getRowRataVarian(row, 1, activeArchive.d))}</td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">{row.varian[2] > 0 ? formatNumber(row.varian[2]) : '—'}</td>
                        <td className="py-3 px-3 text-right text-neutral-500">{row.varian[2] > 0 ? formatDecimal(getRowRataVarian(row, 2, activeArchive.d)) : '—'}</td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(row.varian[3])}</td>
                        <td className="py-3 px-3 text-right text-neutral-500">{formatDecimal(getRowRataVarian(row, 3, activeArchive.d))}</td>
                        <td className="py-3 px-4 text-right font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-100/30 dark:bg-neutral-800/30">
                          {formatNumber(row.total)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-neutral-700 dark:text-neutral-300">
                          {formatDecimal(getRowRataHarian(row, activeArchive.d))}
                        </td>
                      </tr>
                    ))}

                    {/* Total Row */}
                    <tr className="bg-brand-50/60 dark:bg-brand-950/30 font-bold border-t-2 border-brand-200 dark:border-brand-900/60 text-xs">
                      <td colSpan={2} className="py-3.5 px-3 font-sans text-brand-700 dark:text-brand-400">Total Cabang</td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400">{formatNumber(activeStats.totalYo)}</td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400">{formatDecimal(activeStats.totalRataYo)}</td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400">{formatNumber(activeStats.totalOm)}</td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400">{formatDecimal(activeStats.totalRataOm)}</td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400">{activeStats.totalOs > 0 ? formatNumber(activeStats.totalOs) : '—'}</td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400">{activeStats.totalRataOs > 0 ? formatDecimal(activeStats.totalRataOs) : '—'}</td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400">{formatNumber(activeStats.totalYt)}</td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400">{formatDecimal(activeStats.totalRataYt)}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-brand-700 dark:text-brand-400 text-sm bg-brand-100/40 dark:bg-brand-900/40">
                        {formatNumber(activeStats.totalSold)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-extrabold text-brand-700 dark:text-brand-400">
                        {formatDecimal(activeStats.avgDailySold)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: Vs Target, Bulan Lalu & Tahun Lalu */}
            {activeTab === 'target_eval' && (
              <div className="overflow-x-auto">
                {editBar}
                <table className="w-full text-left text-sm border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                      <th className="py-2.5 px-4 font-semibold">Nama TKU</th>
                      <th className="py-2.5 px-3 font-semibold">Rayon</th>
                      <th className="py-2.5 px-4 text-right font-bold text-neutral-900 dark:text-neutral-100">Total Botol</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Rata/Hari</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-brand-600 dark:text-brand-400">Target/Hari</th>
                      <th className="py-2.5 px-3 text-right font-bold text-brand-600 dark:text-brand-400">% Vs Target</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-blue-600 dark:text-blue-400">Pjl Bln Lalu</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-blue-600 dark:text-blue-400">% LM</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">Pjl Thn Lalu</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">% LY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                    {activeArchive.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3 px-4 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                          {row.nama}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                            row.rayon === 1 ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700'
                          }`}>
                            Rayon {row.rayon}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-neutral-900 dark:text-neutral-100">
                          {formatNumber(row.total)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-neutral-700 dark:text-neutral-300">
                          {formatDecimal(row.rataHarian ?? (row.total / activeArchive.d))}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {row.targetHarian ? formatDecimal(row.targetHarian) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold">
                          {row.vsTargetPct !== undefined ? (
                            <span className={row.vsTargetPct >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                              {formatPercent(row.vsTargetPct)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-600 dark:text-neutral-400">
                          {row.bulanLalu ? formatDecimal(row.bulanLalu) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-blue-600 dark:text-blue-400 font-semibold">
                          {row.vsLmPct ? formatPercent(row.vsLmPct) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-600 dark:text-neutral-400">
                          {editAbsen ? (
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="any"
                              value={absenDraft[idx]?.ty ?? ''}
                              onChange={e => setAbsenDraft(d => ({ ...d, [idx]: { ...d[idx], ty: e.target.value } }))}
                              className="w-20 px-1.5 py-1 text-right text-xs font-mono rounded-md border border-brand-400 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                            />
                          ) : (row.tahunLalu ? formatDecimal(row.tahunLalu) : '—')}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                          {row.vsLyPct ? formatPercent(row.vsLyPct) : '—'}
                        </td>
                      </tr>
                    ))}

                    {/* Total Row */}
                    <tr className="bg-brand-50/60 dark:bg-brand-950/30 font-bold border-t-2 border-brand-200 dark:border-brand-900/60 text-xs">
                      <td colSpan={2} className="py-3.5 px-4 font-sans text-brand-700 dark:text-brand-400">
                        Total Cabang
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-brand-700 dark:text-brand-400 text-sm">
                        {formatNumber(activeStats.totalSold)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400 font-bold">
                        {formatDecimal(activeStats.avgDailySold)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400 font-bold">
                        {formatDecimal(activeStats.totalTargetHarian)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-extrabold text-brand-700 dark:text-brand-400">
                        {formatPercent(activeStats.vsTargetPct)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400 font-bold">
                        {formatDecimal(activeStats.totalBulanLalu)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400 font-bold">
                        {formatPercent(activeStats.vsLmPct)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400 font-bold">
                        {formatDecimal(activeStats.totalTahunLalu)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400 font-bold">
                        {formatPercent(activeStats.vsLyPct)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: Balik Botol & Kondisi Operasional YL */}
            {activeTab === 'ops_bb' && (
              <div className="overflow-x-auto">
                {editBar}
                <table className="w-full text-left text-sm border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                      <th className="py-2.5 px-4 font-semibold">Nama TKU</th>
                      <th className="py-2.5 px-3 font-semibold">Rayon</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-sky-600 dark:text-sky-400">Akm BB (btl)</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-sky-600 dark:text-sky-400">% BB</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">Akm JWP</th>
                      <th className="py-2.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400">s/YL</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-red-600 dark:text-red-400">YL Absen</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-red-600 dark:text-red-400">Frekuensi</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">Jml Area</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">Jml YL</th>
                      <th className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">% Coverage</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-red-600 dark:text-red-400 border-l border-neutral-200 dark:border-neutral-700">YL &lt; 250</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">YL &lt; 300</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                    {activeArchive.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3 px-4 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                          {row.nama}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                            row.rayon === 1 ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700'
                          }`}>
                            Rayon {row.rayon}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {row.akmBb !== undefined ? formatNumber(row.akmBb) : '—'}
                        </td>
                        <td className={`py-3 px-3 text-right font-semibold ${getBbStatusClass(row.akmBbPct)}`}>
                          {row.akmBbPct !== undefined ? formatPercent(row.akmBbPct) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {row.akmJwp !== undefined ? formatNumber(row.akmJwp) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                          {row.sYl !== undefined ? row.sYl : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {editAbsen ? (
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={absenDraft[idx]?.abs ?? ''}
                              onChange={e => setAbsenDraft(d => ({ ...d, [idx]: { ...d[idx], abs: e.target.value } }))}
                              className="w-16 px-1.5 py-1 text-right text-xs font-mono rounded-md border border-brand-400 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                            />
                          ) : (row.absenYl !== undefined ? row.absenYl : '—')}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {editAbsen ? (
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={absenDraft[idx]?.frk ?? ''}
                              onChange={e => setAbsenDraft(d => ({ ...d, [idx]: { ...d[idx], frk: e.target.value } }))}
                              className="w-16 px-1.5 py-1 text-right text-xs font-mono rounded-md border border-brand-400 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                            />
                          ) : (row.frekuensiAbsen !== undefined ? row.frekuensiAbsen : '—')}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {row.jumlahArea !== undefined ? row.jumlahArea : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {row.jumlahYl !== undefined ? row.jumlahYl : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          {row.coverageArea !== undefined ? (
                            <span className={row.coverageArea >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                              {formatPercent(row.coverageArea)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-red-600 dark:text-red-400 border-l border-neutral-200 dark:border-neutral-700">
                          {row.l250 !== undefined ? row.l250 : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {row.l300 !== undefined ? row.l300 : '—'}
                        </td>
                      </tr>
                    ))}

                    {/* Total Row */}
                    <tr className="bg-brand-50/60 dark:bg-brand-950/30 font-bold border-t-2 border-brand-200 dark:border-brand-900/60 text-xs">
                      <td colSpan={2} className="py-3.5 px-4 font-sans text-brand-700 dark:text-brand-400">
                        Total Cabang
                      </td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400 font-bold">
                        {formatNumber(activeStats.totalBb)}
                      </td>
                      <td className={`py-3.5 px-3 text-right font-bold ${getBbStatusClass(activeStats.bbPct)}`}>
                        {formatPercent(activeStats.bbPct)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400 font-bold">
                        {formatNumber(activeStats.totalJwp)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-extrabold text-brand-700 dark:text-brand-400">
                        {activeStats.avgSyl}
                      </td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400 font-bold">
                        {activeStats.totalAbsen}
                      </td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400 font-bold">
                        {activeStats.totalFrek}
                      </td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400 font-bold">
                        {activeStats.totalArea}
                      </td>
                      <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400 font-bold">
                        {activeStats.totalYl}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-brand-700 dark:text-brand-400">
                        {formatPercent(activeStats.coveragePct)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: Semua Kolom (Full Comprehensive View) */}
            {activeTab === 'all_columns' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1400px]">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 bg-neutral-50 dark:bg-neutral-800/40">
                      <th className="py-2.5 px-3 font-semibold sticky left-0 bg-neutral-50 dark:bg-neutral-800 z-10">Nama TKU</th>
                      <th className="py-2.5 px-2 font-semibold">R</th>
                      <th className="py-2.5 px-2 text-right">YO</th>
                      <th className="py-2.5 px-2 text-right">OM</th>
                      <th className="py-2.5 px-2 text-right">OS</th>
                      <th className="py-2.5 px-2 text-right">YT</th>
                      <th className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">Total Btl</th>
                      <th className="py-2.5 px-2 text-right font-semibold">Rata/Hr</th>
                      <th className="py-2.5 px-2 text-right">Target</th>
                      <th className="py-2.5 px-2 text-right font-bold">% Tgt</th>
                      <th className="py-2.5 px-2 text-right">Bln Lalu</th>
                      <th className="py-2.5 px-2 text-right">% LM</th>
                      <th className="py-2.5 px-2 text-right">Thn Lalu</th>
                      <th className="py-2.5 px-2 text-right">% LY</th>
                      <th className="py-2.5 px-2 text-right">Akm BB</th>
                      <th className="py-2.5 px-2 text-right">% BB</th>
                      <th className="py-2.5 px-2 text-right">JWP</th>
                      <th className="py-2.5 px-2 text-right font-bold">S/YL</th>
                      <th className="py-2.5 px-2 text-right text-red-600">Absen</th>
                      <th className="py-2.5 px-2 text-right text-red-600">Frek</th>
                      <th className="py-2.5 px-2 text-right">Area</th>
                      <th className="py-2.5 px-2 text-right">YL</th>
                      <th className="py-2.5 px-3 text-right font-bold">% Cover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                    {activeArchive.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100 sticky left-0 bg-white dark:bg-neutral-900 z-10 border-r border-neutral-100 dark:border-neutral-800">
                          {row.nama}
                        </td>
                        <td className="py-2.5 px-2 text-neutral-500">R{row.rayon}</td>
                        <td className="py-2.5 px-2 text-right">{formatNumber(row.varian[0])}</td>
                        <td className="py-2.5 px-2 text-right">{formatNumber(row.varian[1])}</td>
                        <td className="py-2.5 px-2 text-right">{row.varian[2] > 0 ? formatNumber(row.varian[2]) : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{formatNumber(row.varian[3])}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-800/30">
                          {formatNumber(row.total)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold">{formatDecimal(row.rataHarian ?? (row.total / activeArchive.d))}</td>
                        <td className="py-2.5 px-2 text-right">{row.targetHarian ? formatDecimal(row.targetHarian) : '—'}</td>
                        <td className="py-2.5 px-2 text-right font-bold">{row.vsTargetPct ? formatPercent(row.vsTargetPct) : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{row.bulanLalu ? formatDecimal(row.bulanLalu) : '—'}</td>
                        <td className="py-2.5 px-2 text-right text-blue-600">{row.vsLmPct ? formatPercent(row.vsLmPct) : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{row.tahunLalu ? formatDecimal(row.tahunLalu) : '—'}</td>
                        <td className="py-2.5 px-2 text-right text-emerald-600">{row.vsLyPct ? formatPercent(row.vsLyPct) : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{row.akmBb ? formatNumber(row.akmBb) : '—'}</td>
                        <td className={`py-2.5 px-2 text-right ${getBbStatusClass(row.akmBbPct)}`}>{row.akmBbPct ? formatPercent(row.akmBbPct) : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{row.akmJwp ? formatNumber(row.akmJwp) : '—'}</td>
                        <td className="py-2.5 px-2 text-right font-bold">{row.sYl !== undefined ? row.sYl : '—'}</td>
                        <td className="py-2.5 px-2 text-right text-red-600">{row.absenYl !== undefined ? row.absenYl : '—'}</td>
                        <td className="py-2.5 px-2 text-right text-red-600">{row.frekuensiAbsen !== undefined ? row.frekuensiAbsen : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{row.jumlahArea !== undefined ? row.jumlahArea : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{row.jumlahYl !== undefined ? row.jumlahYl : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{row.coverageArea !== undefined ? formatPercent(row.coverageArea) : '—'}</td>
                      </tr>
                    ))}

                    {/* Grand Total */}
                    <tr className="bg-brand-50/60 dark:bg-brand-950/30 font-bold border-t-2 border-brand-200 dark:border-brand-900/60 text-xs">
                      <td className="py-3 px-3 font-sans text-brand-700 dark:text-brand-400 sticky left-0 bg-brand-50/90 dark:bg-brand-950/90 z-10 border-r border-brand-200 dark:border-brand-900">
                        Total Cabang
                      </td>
                      <td className="py-3 px-2 text-brand-700 dark:text-brand-400">All</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{formatNumber(activeStats.totalYo)}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{formatNumber(activeStats.totalOm)}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{activeStats.totalOs > 0 ? formatNumber(activeStats.totalOs) : '—'}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{formatNumber(activeStats.totalYt)}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-brand-700 dark:text-brand-400 bg-brand-100/40 dark:bg-brand-900/40">{formatNumber(activeStats.totalSold)}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400 font-bold">{formatDecimal(activeStats.avgDailySold)}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400 font-bold">{formatDecimal(activeStats.totalTargetHarian)}</td>
                      <td className="py-3 px-2 text-right font-extrabold text-brand-700 dark:text-brand-400">{formatPercent(activeStats.vsTargetPct)}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{formatDecimal(activeStats.totalBulanLalu)}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{formatPercent(activeStats.vsLmPct)}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{formatDecimal(activeStats.totalTahunLalu)}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{formatPercent(activeStats.vsLyPct)}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{formatNumber(activeStats.totalBb)}</td>
                      <td className={`py-3 px-2 text-right ${getBbStatusClass(activeStats.bbPct)}`}>{formatPercent(activeStats.bbPct)}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{formatNumber(activeStats.totalJwp)}</td>
                      <td className="py-3 px-2 text-right font-extrabold text-brand-700 dark:text-brand-400">{activeStats.avgSyl}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{activeStats.totalAbsen}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{activeStats.totalFrek}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{activeStats.totalArea}</td>
                      <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-400">{activeStats.totalYl}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-brand-700 dark:text-brand-400">{formatPercent(activeStats.coveragePct)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-500">
          Belum ada arsip bulan tersimpan. Klik "Simpan Bulan Ini" untuk mengarsipkan rekapitulasi saat ini.
        </div>
      )}

      {/* Vs Target & Tahun Lalu: level cabang, per bulan + rata-rata setahun */}
      {branchMonths.length > 0 && yearSummary && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-brand-600" />
              <span>Vs Target &amp; Tahun Lalu — Cabang</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300">{selectedYear}</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Rata penjualan per hari seluruh cabang dibanding target dan tahun lalu, tiap bulan dan rata-rata setahun.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                  <th className="py-2.5 px-4 font-semibold sticky left-0 bg-neutral-50 dark:bg-neutral-800 z-10">Bulan</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Rata/Hari</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-brand-600 dark:text-brand-400">Target/Hari</th>
                  <th className="py-2.5 px-3 text-right font-bold text-brand-600 dark:text-brand-400">% Vs Tgt</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">Thn Lalu/Hari</th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">% Vs LY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                {branchMonths.map(m => (
                  <tr key={m.key} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans font-semibold text-neutral-900 dark:text-neutral-100 sticky left-0 bg-white dark:bg-neutral-900 z-10 border-r border-neutral-100 dark:border-neutral-800">{m.label}</td>
                    <td className="py-3 px-3 text-right font-semibold text-neutral-800 dark:text-neutral-200">{formatDecimal(m.rata)}</td>
                    <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">{m.target > 0 ? formatDecimal(m.target) : '—'}</td>
                    <td className="py-3 px-3 text-right font-bold">
                      {m.vsTgt !== null ? <span className={m.vsTgt >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{formatPercent(m.vsTgt)}</span> : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">{m.ly > 0 ? formatDecimal(m.ly) : '—'}</td>
                    <td className="py-3 px-3 text-right font-bold">
                      {m.vsLy !== null ? <span className={m.vsLy >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{formatPercent(m.vsLy)}</span> : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-brand-50/60 dark:bg-brand-950/30 font-bold border-t-2 border-brand-200 dark:border-brand-900/60 text-xs">
                  <td className="py-3.5 px-4 font-sans text-brand-700 dark:text-brand-400 sticky left-0 bg-brand-50/90 dark:bg-brand-950/90 z-10 border-r border-brand-200 dark:border-brand-900">
                    Rata-rata {selectedYear} ({branchMonths.length} bln)
                  </td>
                  <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400">{formatDecimal(yearSummary.rata)}</td>
                  <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400">{yearSummary.target > 0 ? formatDecimal(yearSummary.target) : '—'}</td>
                  <td className="py-3.5 px-3 text-right font-extrabold text-brand-700 dark:text-brand-400">{yearSummary.vsTgt !== null ? formatPercent(yearSummary.vsTgt) : '—'}</td>
                  <td className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400">{yearSummary.ly > 0 ? formatDecimal(yearSummary.ly) : '—'}</td>
                  <td className="py-3.5 px-3 text-right font-extrabold text-brand-700 dark:text-brand-400">{yearSummary.vsLy !== null ? formatPercent(yearSummary.vsLy) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grafik perbandingan Januari s/d bulan terakhir pada tahun terpilih */}
      {branchMonths.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Grafik Perbandingan {selectedYear}
            </h2>
            <span className="text-xs text-neutral-500">
              {branchMonths[0].short} – {branchMonths[branchMonths.length - 1].short} · tap grafik untuk lihat nilai bulan
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <ArsipLineChart
              title="1. Penjualan vs Target & Tahun Lalu"
              subtitle="Rata penjualan per hari, seluruh cabang"
              months={chartMonths}
              format={fmtChartDec}
              series={[
                { name: 'Penjualan', color: '#c8102e', values: branchMonths.map(m => m.rata), labels: true },
                { name: 'Target', color: '#2563eb', values: branchMonths.map(m => (m.target > 0 ? m.target : null)), dashed: true },
                { name: 'Tahun Lalu', color: '#8b5cf6', values: branchMonths.map(m => (m.ly > 0 ? m.ly : null)), dashed: true },
              ]}
            />
            <ArsipLineChart
              title="2. s/YL"
              subtitle="Rata botol per YL per hari kerja"
              months={chartMonths}
              integer
              series={[{ name: 's/YL', color: '#f59e0b', values: branchMonths.map(m => m.syl), labels: true, allLabels: true }]}
            />
            <ArsipLineChart
              title="3. YL Absen"
              subtitle="Jumlah YL absen seluruh cabang"
              months={chartMonths}
              zeroBased
              integer
              series={[{ name: 'Absen', color: '#ef4444', values: branchMonths.map(m => m.absen), labels: true, allLabels: true }]}
            />
            <ArsipLineChart
              title="4. Jumlah YL"
              subtitle="Total YL aktif seluruh cabang"
              months={chartMonths}
              zeroBased
              integer
              series={[{ name: 'Jml YL', color: '#10b981', values: branchMonths.map(m => m.jmlYl), labels: true, allLabels: true }]}
            />
            <ArsipLineChart
              title="5. YL < 250"
              subtitle="Jumlah YL dengan penjualan di bawah 250 btl"
              months={chartMonths}
              zeroBased
              integer
              series={[{ name: 'YL < 250', color: '#e11d48', values: branchMonths.map(m => m.l250), labels: true, allLabels: true }]}
            />
            <ArsipLineChart
              title="6. Performa Varian"
              subtitle="Rata penjualan per hari tiap varian"
              months={chartMonths}
              zeroBased
              format={fmtChartDec}
              series={VARIANTS.map((v, i) => ({
                name: v.code,
                color: v.color,
                values: branchMonths.map(m => (m.varRata[i] > 0 ? m.varRata[i] : null)),
              }))}
            />
          </div>
        </div>
      )}

      {/* Riwayat Tahunan: tabel TKU per bulan, hanya untuk tahun yang dipilih (ringkasan = rata-rata, bukan akumulasi) */}
      {yearKeysAsc.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <History className="w-4 h-4 text-brand-600" />
                <span>Riwayat Tahunan</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300">{selectedYear}</span>
              </h2>
            </div>

            {/* Historical Metric Selector */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
              {([
                ['total', 'Total Botol'],
                ['rata', 'Rata/Hari'],
                ['bb', 'BB'],
                ['syl', 's/YL'],
                ['coverage', '% Coverage Area'],
              ] as [HistoricalMetric, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setHistMetric(key)}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    histMetric === key
                      ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                  <th className="py-2.5 px-4 font-semibold sticky left-0 bg-neutral-50 dark:bg-neutral-800 z-10">Nama Unit TKU</th>
                  {yearKeysAsc.map(k => (
                    <th key={k} className="py-2.5 px-3 text-right font-semibold">
                      {state.archives[k]?.namaBulan.replace(/\s*\d{4}$/, '') || k}
                    </th>
                  ))}
                  <th className="py-2.5 px-4 text-right font-bold text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/20">
                    Rata-rata {yearKeysAsc.length} Bulan
                  </th>
                  <th className="py-2.5 px-4 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                    Nilai Terakhir
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                {state.tkus.map(t => {
                  let sumVal = 0;
                  let countVal = 0;
                  let latestVal: number | null = null;

                  const cells = yearKeysAsc.map(k => {
                    const arc = state.archives[k];
                    const row = arc?.rows.find(r => normNama(r.nama) === normNama(t.nama));
                    if (!row) return { k, text: '—' };
                    const v = histRowValue(histMetric, row, arc.d || 31);
                    countVal += 1;
                    sumVal += v;
                    latestVal = v;
                    return { k, text: fmtHist(histMetric, v) };
                  });

                  return (
                    <tr key={t.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4 font-sans font-semibold text-neutral-900 dark:text-neutral-100 sticky left-0 bg-white dark:bg-neutral-900 z-10 border-r border-neutral-100 dark:border-neutral-800">
                        {t.nama}
                      </td>
                      {cells.map(c => (
                        <td key={c.k} className="py-3 px-3 text-right font-medium text-neutral-700 dark:text-neutral-300">
                          {c.text}
                        </td>
                      ))}

                      {/* Rata-rata */}
                      <td className="py-3 px-4 text-right font-bold text-brand-700 dark:text-brand-300 bg-brand-50/40 dark:bg-brand-950/10">
                        {countVal > 0 ? fmtHist(histMetric, sumVal / countVal, true) : '—'}
                      </td>

                      {/* Nilai terakhir */}
                      <td className="py-3 px-4 text-right font-semibold text-neutral-800 dark:text-neutral-200">
                        {latestVal !== null ? fmtHist(histMetric, latestVal) : '—'}
                      </td>
                    </tr>
                  );
                })}

                {/* Total cabang per bulan + rata-rata setahun */}
                <tr className="bg-brand-50/60 dark:bg-brand-950/30 font-bold border-t-2 border-brand-200 dark:border-brand-900/60 text-xs">
                  <td className="py-3.5 px-4 font-sans text-brand-700 dark:text-brand-400 sticky left-0 bg-brand-50/90 dark:bg-brand-950/90 z-10 border-r border-brand-200 dark:border-brand-900">
                    Total Cabang Jember
                  </td>
                  {yearKeysAsc.map(k => {
                    const arc = state.archives[k];
                    const v = arc && arc.rows ? histBranchValue(histMetric, arc) : null;
                    return (
                      <td key={k} className="py-3.5 px-3 text-right text-brand-700 dark:text-brand-400 font-bold">
                        {v === null ? '—' : fmtHist(histMetric, v)}
                      </td>
                    );
                  })}

                  <td className="py-3.5 px-4 text-right font-extrabold text-brand-700 dark:text-brand-400 bg-brand-100/60 dark:bg-brand-900/40 text-sm">
                    {branchHistAvg !== null ? fmtHist(histMetric, branchHistAvg, true) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right text-brand-700 dark:text-brand-400 font-extrabold">
                    {branchHistLatest !== null ? fmtHist(histMetric, branchHistLatest) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
