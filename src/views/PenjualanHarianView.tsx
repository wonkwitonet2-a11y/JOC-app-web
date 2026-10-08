import React, { useState } from 'react';
import { 
  Calendar, 
  Download, 
  CheckCircle2,
  TrendingUp,
  PackageCheck,
  RotateCcw
} from 'lucide-react';
import { AppState, VARIANTS, VariantCode, DailySalesRecord } from '../types';
import { 
  formatNumber, 
  formatPercent, 
  formatDateIndo,
  getPeriodInfo,
  getSeedDailyBranchTotal,
  getBbStatusClass
} from '../services/storage';

interface PenjualanHarianViewProps {
  state: AppState;
  onSaveDailyData: (date: string, tkuIdx: number, record: DailySalesRecord) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onUpdatePembagiHari?: () => void;
  onUpdateActiveDay?: (day: number) => void;
}

export const PenjualanHarianView: React.FC<PenjualanHarianViewProps> = ({
  state,
  showToast
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(state.currentDayNum);

  // Info bulan kerja
  const period = getPeriodInfo(state);
  const MD = period.daysInMonth;
  const PY = period.year;
  const PM0 = period.monthIndex;
  const activeTkus = state.tkus.filter(t => t.aktif);
  const totalBranchTarget = activeTkus.reduce((a, b) => a + b.targetHarian, 0) || 1;

  // Generate ISO date for selectedDay
  const getIsoDate = (d: number) => {
    return `${state.activePeriod.slice(0, 8)}${String(d).padStart(2, '0')}`;
  };

  const currentDateIso = getIsoDate(selectedDay);

  // Helper to fetch record for a given date and TKU index
  const getRecordFor = (dateStr: string, tkuIdx: number): DailySalesRecord | null => {
    if (state.pjd[dateStr] && state.pjd[dateStr][tkuIdx]) {
      return state.pjd[dateStr][tkuIdx];
    }
    if (dateStr === state.activeDate && state.todayInputs[tkuIdx]) {
      return state.todayInputs[tkuIdx];
    }
    return null;
  };

  // Helper to calculate sales for a specific TKU on day d (1..30)
  const getTkuDailySales = (tkuIdx: number, d: number, variant: 'ALL' | VariantCode = 'ALL'): number => {
    const t = state.tkus[tkuIdx];
    if (!t || !t.aktif) return 0;

    const dateIso = getIsoDate(d);
    const rec = getRecordFor(dateIso, tkuIdx);

    // If day is today and we have input:
    if (d === state.currentDayNum && rec) {
      if (variant === 'ALL') return rec.sold || 0;
      const vIdx = VARIANTS.findIndex(v => v.code === variant);
      return rec.v ? (rec.v[vIdx] || 0) : 0;
    }

    // If day is beyond today in current month, not happened yet
    if (d > state.currentDayNum) {
      return 0;
    }

    // If record exists in pjd:
    if (rec && rec.sold !== undefined) {
      if (variant === 'ALL') return rec.sold;
      const vIdx = VARIANTS.findIndex(v => v.code === variant);
      return rec.v ? (rec.v[vIdx] || 0) : 0;
    }

    // Historical day from initial history
    const dateObj = new Date(PY, PM0, d);
    if (dateObj.getDay() === 0) {
      return 0; // Sunday libur
    }

    const branchDayTotal = getSeedDailyBranchTotal(state, d);
    const tkuProportion = t.targetHarian / totalBranchTarget;
    const tkuTotal = Math.round(branchDayTotal * tkuProportion);

    if (variant === 'ALL') {
      return tkuTotal;
    }

    const ratios: Record<VariantCode, number> = { YO: 0.76, OM: 0.09, OS: 0.11, YT: 0.04 };
    return Math.round(tkuTotal * ratios[variant]);
  };

  // Compute daily sums for Rayon 1, Rayon 2, and Cabang for selected date
  const computeDailySums = (rayonFilter: number | null) => {
    let sold = 0;
    let bb = 0;
    let pdm = 0;
    let absen = 0;
    let frek = 0;
    let l250 = 0;
    let l300 = 0;
    const vTotal = [0, 0, 0, 0];

    state.tkus.forEach((t, idx) => {
      if (!t.aktif) return;
      if (rayonFilter !== null && t.rayon !== rayonFilter) return;

      const rec = getRecordFor(currentDateIso, idx);
      const daySold = rec?.sold ?? getTkuDailySales(idx, selectedDay, 'ALL');
      const dayBb = rec?.bb ?? 0;
      const dayPdm = rec ? ((rec.pdm ?? 0) || (rec.pdmV ? rec.pdmV.reduce((a, b) => a + b, 0) : 0)) : 0;
      const dayAbsen = rec?.absen ?? 0;
      const dayFrek = rec?.frek ?? 0;
      const dayL250 = rec?.l250 ?? t.l250 ?? 0;
      const dayL300 = rec?.l300 ?? t.l300 ?? 0;

      sold += daySold;
      bb += dayBb;
      pdm += dayPdm;
      absen += dayAbsen;
      frek += dayFrek;
      l250 += dayL250;
      l300 += dayL300;

      const vVals = rec?.v || [
        getTkuDailySales(idx, selectedDay, 'YO'),
        getTkuDailySales(idx, selectedDay, 'OM'),
        getTkuDailySales(idx, selectedDay, 'OS'),
        getTkuDailySales(idx, selectedDay, 'YT')
      ];

      vVals.forEach((val, i) => {
        vTotal[i] += (val || 0);
      });
    });

    return { sold, bb, pdm, absen, frek, l250, l300, vTotal };
  };

  const r1Sum = computeDailySums(1);
  const r2Sum = computeDailySums(2);
  const cabangSum = computeDailySums(null);

  const r1Target = state.tkus.filter(t => t.aktif && t.rayon === 1).reduce((a, b) => a + b.targetHarian, 0);
  const r2Target = state.tkus.filter(t => t.aktif && t.rayon === 2).reduce((a, b) => a + b.targetHarian, 0);

  // CSV Export for Selected Day
  const handleExportCsv = () => {
    const headers = [
      'No', 'Nama TKU', 'Rayon',
      'YO', 'OM', 'OS', 'YT', 'Total Terjual',
      'Target Harian', '% Capaian',
      'BB', '% BB', 'PDM',
      'Absen', 'Frek', 'YL < 250', 'YL < 300'
    ];

    const rows: (string | number)[][] = [];

    state.tkus.filter(t => t.aktif).forEach((t, i) => {
      const idx = state.tkus.indexOf(t);
      const rec = getRecordFor(currentDateIso, idx);
      const v = rec?.v || [
        getTkuDailySales(idx, selectedDay, 'YO'),
        getTkuDailySales(idx, selectedDay, 'OM'),
        getTkuDailySales(idx, selectedDay, 'OS'),
        getTkuDailySales(idx, selectedDay, 'YT')
      ];
      const sold = rec?.sold ?? getTkuDailySales(idx, selectedDay, 'ALL');
      const bb = rec?.bb ?? 0;
      const pctBb = (bb + sold) > 0 ? ((bb / (bb + sold)) * 100).toFixed(2) + '%' : '0%';
      const pdm = rec ? ((rec.pdm ?? 0) || (rec.pdmV ? rec.pdmV.reduce((a, b) => a + b, 0) : 0)) : 0;
      const absen = rec?.absen ?? 0;
      const frek = rec?.frek ?? 0;
      const l250 = rec?.l250 ?? t.l250 ?? 0;
      const l300 = rec?.l300 ?? t.l300 ?? 0;
      const pctCapaian = t.targetHarian > 0 ? ((sold / t.targetHarian) * 100).toFixed(2) + '%' : '0%';

      rows.push([
        i + 1,
        t.nama,
        `Rayon ${t.rayon}`,
        v[0], v[1], v[2], v[3],
        sold,
        t.targetHarian,
        pctCapaian,
        bb,
        pctBb,
        pdm,
        absen,
        frek,
        l250,
        l300
      ]);
    });

    // Subtotal R1
    rows.push([
      '', 'SUBTOTAL RAYON 1', 'Rayon 1',
      r1Sum.vTotal[0], r1Sum.vTotal[1], r1Sum.vTotal[2], r1Sum.vTotal[3],
      r1Sum.sold,
      r1Target,
      r1Target > 0 ? ((r1Sum.sold / r1Target) * 100).toFixed(2) + '%' : '0%',
      r1Sum.bb,
      (r1Sum.bb + r1Sum.sold) > 0 ? ((r1Sum.bb / (r1Sum.bb + r1Sum.sold)) * 100).toFixed(2) + '%' : '0%',
      r1Sum.pdm,
      r1Sum.absen,
      r1Sum.frek,
      r1Sum.l250,
      r1Sum.l300
    ]);

    // Subtotal R2
    rows.push([
      '', 'SUBTOTAL RAYON 2', 'Rayon 2',
      r2Sum.vTotal[0], r2Sum.vTotal[1], r2Sum.vTotal[2], r2Sum.vTotal[3],
      r2Sum.sold,
      r2Target,
      r2Target > 0 ? ((r2Sum.sold / r2Target) * 100).toFixed(2) + '%' : '0%',
      r2Sum.bb,
      (r2Sum.bb + r2Sum.sold) > 0 ? ((r2Sum.bb / (r2Sum.bb + r2Sum.sold)) * 100).toFixed(2) + '%' : '0%',
      r2Sum.pdm,
      r2Sum.absen,
      r2Sum.frek,
      r2Sum.l250,
      r2Sum.l300
    ]);

    // Total Cabang
    rows.push([
      '', 'TOTAL CABANG JEMBER', 'Cabang',
      cabangSum.vTotal[0], cabangSum.vTotal[1], cabangSum.vTotal[2], cabangSum.vTotal[3],
      cabangSum.sold,
      totalBranchTarget,
      totalBranchTarget > 0 ? ((cabangSum.sold / totalBranchTarget) * 100).toFixed(2) + '%' : '0%',
      cabangSum.bb,
      (cabangSum.bb + cabangSum.sold) > 0 ? ((cabangSum.bb / (cabangSum.bb + cabangSum.sold)) * 100).toFixed(2) + '%' : '0%',
      cabangSum.pdm,
      cabangSum.absen,
      cabangSum.frek,
      cabangSum.l250,
      cabangSum.l300
    ]);

    const csvContent = [
      `Data Penjualan Harian Cabang Jember - Tanggal ${formatDateIndo(currentDateIso)}`,
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = `Penjualan_Harian_Cabang_${currentDateIso}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast(`Laporan ${filename} berhasil diunduh!`, 'success');
  };

  const onTrackCount = state.tkus.filter(t => {
    if (!t.aktif) return false;
    const idx = state.tkus.indexOf(t);
    const rec = getRecordFor(currentDateIso, idx);
    const sold = rec?.sold ?? getTkuDailySales(idx, selectedDay, 'ALL');
    return sold >= t.targetHarian;
  }).length;
  const activeCount = state.tkus.filter(t => t.aktif).length;
  const pctCapaian = cabangSum.sold / (totalBranchTarget || 1);
  const pctBb = (cabangSum.bb + cabangSum.sold) > 0 ? cabangSum.bb / (cabangSum.bb + cabangSum.sold) : 0;
  const diffFromTarget = cabangSum.sold - totalBranchTarget;

  return (
    <div className="space-y-5">
      {/* 1. Header Ringkas & Pemilih Tanggal Kalender Tunggal */}
      <div className="p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600 shrink-0" />
            <span>Rekap Penjualan Harian</span>
          </h1>
        </div>

        {/* Controls: Date Picker Kalender & Ekspor CSV Saja */}
        <div className="flex items-center gap-2.5">
          <input
            type="date"
            min={`${period.key}-01`}
            max={`${period.key}-${String(MD).padStart(2, '0')}`}
            value={currentDateIso}
            onChange={(e) => {
              const dayPart = Number(e.target.value.slice(8));
              if (dayPart >= 1 && dayPart <= MD) setSelectedDay(dayPart);
            }}
            className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-mono font-bold text-neutral-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-none cursor-pointer"
          />

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer shrink-0"
            title="Unduh Tabel Format CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards Bersih, Rapi & Simetris (5 Indikator Utama) */}
      <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-5 gap-2.5 sm:gap-3 items-stretch">
        {/* Card 1: Penjualan Hari Ini */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between min-w-0 col-span-1 md:col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1 truncate">
            Penjualan
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-brand-600 dark:text-brand-400 truncate">
            {formatNumber(cabangSum.sold)} <span className="text-xs font-normal text-neutral-400">btl</span>
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
            <span className="text-neutral-400 font-medium">Capaian</span>
            <span className={`font-mono font-bold ${pctCapaian >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatPercent(pctCapaian)}
            </span>
          </div>
        </div>

        {/* Card 2: Target */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between min-w-0 col-span-1 md:col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1 truncate">
            Target
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
            {formatNumber(totalBranchTarget)} <span className="text-xs font-normal text-neutral-400">btl</span>
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
            <span className="text-neutral-400 font-medium">Selisih</span>
            <span className={`font-mono font-bold ${diffFromTarget >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {diffFromTarget >= 0 ? '+' : ''}{formatNumber(diffFromTarget)} btl
            </span>
          </div>
        </div>

        {/* Card 3: BB */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between min-w-0 col-span-1 md:col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1 truncate">
            BB
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400 truncate">
            {formatNumber(cabangSum.bb)} <span className="text-xs font-normal text-neutral-400">btl</span>
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
            <span className="text-neutral-400 font-medium">Rasio BB</span>
            <span className={`font-mono font-bold ${getBbStatusClass(pctBb)}`}>
              {formatPercent(pctBb)}
            </span>
          </div>
        </div>

        {/* Card 4: PDM */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between min-w-0 col-span-1 md:col-span-3 lg:col-span-1">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1 truncate">
            PDM
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-sky-600 dark:text-sky-400 truncate">
            {formatNumber(cabangSum.pdm)} <span className="text-xs font-normal text-neutral-400">btl</span>
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
            <span className="text-neutral-400 font-medium">Porsi PDM</span>
            <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
              {cabangSum.sold > 0 ? formatPercent(cabangSum.pdm / cabangSum.sold) : '0%'}
            </span>
          </div>
        </div>

        {/* Card 5: Capai Target */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between min-w-0 col-span-2 md:col-span-3 lg:col-span-1">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1 truncate">
            Capai Target
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 truncate">
            <span className="text-emerald-600">{onTrackCount}</span>
            <span className="text-neutral-400 text-xs font-normal">/ {activeCount} TKU</span>
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
            <span className="text-neutral-400 font-medium">Tingkat Capai</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatPercent(activeCount > 0 ? onTrackCount / activeCount : 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Tabel Rekap Penjualan */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Rekap Penjualan
          </h2>
          <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-2.5 py-1 rounded-lg border border-brand-200/60 dark:border-brand-900/40">
            Total: {formatNumber(cabangSum.sold)} btl
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-[11px] bg-neutral-50 dark:bg-neutral-800/40">
                <th className="py-2.5 px-3 font-semibold min-w-[120px]">Nama TKU</th>
                <th className="py-2.5 px-2 text-right font-semibold text-red-600 dark:text-red-400">YO</th>
                <th className="py-2.5 px-2 text-right font-semibold text-amber-600 dark:text-amber-400">OM</th>
                <th className="py-2.5 px-2 text-right font-semibold text-pink-600 dark:text-pink-400">OS</th>
                <th className="py-2.5 px-2 text-right font-semibold text-sky-600 dark:text-sky-400">YT</th>
                <th className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">Terjual</th>
                <th className="py-2.5 px-2.5 text-right font-semibold text-neutral-500">Target</th>
                <th className="py-2.5 px-2.5 text-right font-semibold border-r border-neutral-200 dark:border-neutral-800">% Tgt</th>
                <th className="py-2.5 px-2.5 text-right font-semibold text-amber-600 dark:text-amber-400">BB</th>
                <th className="py-2.5 px-2.5 text-right font-semibold text-amber-600 dark:text-amber-400">% BB</th>
                <th className="py-2.5 px-2.5 text-right font-semibold text-sky-600 dark:text-sky-400">PDM</th>
                <th className="py-2.5 px-2 text-right font-semibold text-neutral-500">Abs</th>
                <th className="py-2.5 px-2 text-right font-semibold text-neutral-500">Frk</th>
                <th className="py-2.5 px-2.5 text-right font-semibold text-red-600 dark:text-red-400 border-l border-neutral-200 dark:border-neutral-700">&lt;250</th>
                <th className="py-2.5 px-2.5 text-right font-semibold text-amber-600 dark:text-amber-400">&lt;300</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
              {/* RAYON 1 SECTION */}
              <tr className="bg-neutral-100/60 dark:bg-neutral-800/60 font-bold text-neutral-700 dark:text-neutral-300">
                <td colSpan={15} className="py-2 px-3 font-sans text-[11px] uppercase tracking-wider text-brand-700 dark:text-brand-400">
                  RAYON 1 JEMBER
                </td>
              </tr>
              {state.tkus.filter(t => t.rayon === 1).map(t => {
                const idx = state.tkus.indexOf(t);
                const rec = getRecordFor(currentDateIso, idx);
                const v = rec?.v || [
                  getTkuDailySales(idx, selectedDay, 'YO'),
                  getTkuDailySales(idx, selectedDay, 'OM'),
                  getTkuDailySales(idx, selectedDay, 'OS'),
                  getTkuDailySales(idx, selectedDay, 'YT')
                ];
                const sold = rec?.sold ?? getTkuDailySales(idx, selectedDay, 'ALL');
                const bb = rec?.bb;
                const bbRatio = (bb !== undefined && sold !== undefined && (bb + sold) > 0) ? (bb / (bb + sold)) : null;
                const pctBb = bbRatio !== null ? formatPercent(bbRatio) : '—';
                const pdm = rec ? ((rec.pdm ?? 0) || (rec.pdmV ? rec.pdmV.reduce((a, b) => a + b, 0) : 0)) : undefined;
                const absen = rec?.absen;
                const frek = rec?.frek;
                const pctCapaianTku = t.targetHarian > 0 ? (sold || 0) / t.targetHarian : 0;

                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors ${
                      !t.aktif ? 'opacity-40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                      {t.nama} <span className="text-[10px] text-neutral-400 font-normal">R{t.rayon}</span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                      {v ? formatNumber(v[0]) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                      {v ? formatNumber(v[1]) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                      {v ? formatNumber(v[2]) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                      {v ? formatNumber(v[3]) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                      {sold !== undefined ? formatNumber(sold) : '—'}
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-neutral-500">
                      {formatNumber(t.targetHarian)}
                    </td>
                    <td className={`py-2.5 px-2.5 text-right font-bold border-r border-neutral-200 dark:border-neutral-800 ${
                      pctCapaianTku >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatPercent(pctCapaianTku)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-amber-600 dark:text-amber-400 font-medium">
                      {bb !== undefined ? formatNumber(bb) : '—'}
                    </td>
                    <td className={`py-2.5 px-2.5 text-right ${getBbStatusClass(bbRatio)}`}>
                      {pctBb}
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-sky-600 dark:text-sky-400">
                      {pdm !== undefined ? formatNumber(pdm) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-neutral-600 dark:text-neutral-400">
                      {absen !== undefined ? absen : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-neutral-500">
                      {frek !== undefined ? frek : '—'}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-red-600 dark:text-red-400 border-l border-neutral-200 dark:border-neutral-700">
                      {rec?.l250 ?? t.l250 ?? 0}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                      {rec?.l300 ?? t.l300 ?? 0}
                    </td>
                  </tr>
                );
              })}

              {/* Subtotal Rayon 1 */}
              <tr className="bg-neutral-50/90 dark:bg-neutral-800/60 font-semibold border-t-2 border-neutral-200 dark:border-neutral-700">
                <td className="py-2.5 px-3 font-sans font-bold text-neutral-900 dark:text-white">Total Rayon 1</td>
                <td className="py-2.5 px-2 text-right">{formatNumber(r1Sum.vTotal[0])}</td>
                <td className="py-2.5 px-2 text-right">{formatNumber(r1Sum.vTotal[1])}</td>
                <td className="py-2.5 px-2 text-right">{formatNumber(r1Sum.vTotal[2])}</td>
                <td className="py-2.5 px-2 text-right">{formatNumber(r1Sum.vTotal[3])}</td>
                <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-white">
                  {formatNumber(r1Sum.sold)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-bold text-neutral-600 dark:text-neutral-300">
                  {formatNumber(r1Target)}
                </td>
                <td className={`py-2.5 px-2.5 text-right font-bold border-r border-neutral-200 dark:border-neutral-800 ${
                  r1Sum.sold >= r1Target ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {formatPercent(r1Sum.sold / (r1Target || 1))}
                </td>
                <td className="py-2.5 px-2.5 text-right text-amber-600">{formatNumber(r1Sum.bb)}</td>
                <td className={`py-2.5 px-2.5 text-right ${getBbStatusClass((r1Sum.bb + r1Sum.sold) > 0 ? (r1Sum.bb / (r1Sum.bb + r1Sum.sold)) : 0)}`}>
                  {formatPercent(r1Sum.bb / ((r1Sum.bb + r1Sum.sold) || 1))}
                </td>
                <td className="py-2.5 px-2.5 text-right text-sky-600">{formatNumber(r1Sum.pdm)}</td>
                <td className="py-2.5 px-2 text-right">{formatNumber(r1Sum.absen)}</td>
                <td className="py-2.5 px-2 text-right">{formatNumber(r1Sum.frek)}</td>
                <td className="py-2.5 px-2.5 text-right font-bold text-red-600 border-l border-neutral-200 dark:border-neutral-700">{formatNumber(r1Sum.l250)}</td>
                <td className="py-2.5 px-2.5 text-right font-bold text-amber-600">{formatNumber(r1Sum.l300)}</td>
              </tr>

              {/* RAYON 2 SECTION */}
              <tr className="bg-neutral-100/60 dark:bg-neutral-800/60 font-bold text-neutral-700 dark:text-neutral-300">
                <td colSpan={15} className="py-2 px-3 font-sans text-[11px] uppercase tracking-wider text-brand-700 dark:text-brand-400">
                  RAYON 2 JEMBER
                </td>
              </tr>
              {state.tkus.filter(t => t.rayon === 2).map(t => {
                const idx = state.tkus.indexOf(t);
                const rec = getRecordFor(currentDateIso, idx);
                const v = rec?.v || [
                  getTkuDailySales(idx, selectedDay, 'YO'),
                  getTkuDailySales(idx, selectedDay, 'OM'),
                  getTkuDailySales(idx, selectedDay, 'OS'),
                  getTkuDailySales(idx, selectedDay, 'YT')
                ];
                const sold = rec?.sold ?? getTkuDailySales(idx, selectedDay, 'ALL');
                const bb = rec?.bb;
                const bbRatio = (bb !== undefined && sold !== undefined && (bb + sold) > 0) ? (bb / (bb + sold)) : null;
                const pctBb = bbRatio !== null ? formatPercent(bbRatio) : '—';
                const pdm = rec ? ((rec.pdm ?? 0) || (rec.pdmV ? rec.pdmV.reduce((a, b) => a + b, 0) : 0)) : undefined;
                const absen = rec?.absen;
                const frek = rec?.frek;
                const pctCapaianTku = t.targetHarian > 0 ? (sold || 0) / t.targetHarian : 0;

                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors ${
                      !t.aktif ? 'opacity-40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                      {t.nama} <span className="text-[10px] text-neutral-400 font-normal">R{t.rayon}</span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                      {v ? formatNumber(v[0]) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                      {v ? formatNumber(v[1]) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                      {v ? formatNumber(v[2]) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                      {v ? formatNumber(v[3]) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                      {sold !== undefined ? formatNumber(sold) : '—'}
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-neutral-500">
                      {formatNumber(t.targetHarian)}
                    </td>
                    <td className={`py-2.5 px-2.5 text-right font-bold border-r border-neutral-200 dark:border-neutral-800 ${
                      pctCapaianTku >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatPercent(pctCapaianTku)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-amber-600 dark:text-amber-400 font-medium">
                      {bb !== undefined ? formatNumber(bb) : '—'}
                    </td>
                    <td className={`py-2.5 px-2.5 text-right ${getBbStatusClass(bbRatio)}`}>
                      {pctBb}
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-sky-600 dark:text-sky-400">
                      {pdm !== undefined ? formatNumber(pdm) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-neutral-600 dark:text-neutral-400">
                      {absen !== undefined ? absen : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-neutral-500">
                      {frek !== undefined ? frek : '—'}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-red-600 dark:text-red-400 border-l border-neutral-200 dark:border-neutral-700">
                      {rec?.l250 ?? t.l250 ?? 0}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                      {rec?.l300 ?? t.l300 ?? 0}
                    </td>
                  </tr>
                );
              })}

              {/* Subtotal Rayon 2 */}
              <tr className="bg-neutral-50/90 dark:bg-neutral-800/60 font-semibold">
                <td className="py-2.5 px-3 font-sans font-bold text-neutral-900 dark:text-white">Total Rayon 2</td>
                <td className="py-2.5 px-2 text-right">{formatNumber(r2Sum.vTotal[0])}</td>
                <td className="py-2.5 px-2 text-right">{formatNumber(r2Sum.vTotal[1])}</td>
                <td className="py-2.5 px-2 text-right">{formatNumber(r2Sum.vTotal[2])}</td>
                <td className="py-2.5 px-2 text-right">{formatNumber(r2Sum.vTotal[3])}</td>
                <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-white">
                  {formatNumber(r2Sum.sold)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-bold text-neutral-600 dark:text-neutral-300">
                  {formatNumber(r2Target)}
                </td>
                <td className={`py-2.5 px-2.5 text-right font-bold border-r border-neutral-200 dark:border-neutral-800 ${
                  r2Sum.sold >= r2Target ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {formatPercent(r2Sum.sold / (r2Target || 1))}
                </td>
                <td className="py-2.5 px-2.5 text-right text-amber-600">{formatNumber(r2Sum.bb)}</td>
                <td className={`py-2.5 px-2.5 text-right ${getBbStatusClass((r2Sum.bb + r2Sum.sold) > 0 ? (r2Sum.bb / (r2Sum.bb + r2Sum.sold)) : 0)}`}>
                  {formatPercent(r2Sum.bb / ((r2Sum.bb + r2Sum.sold) || 1))}
                </td>
                <td className="py-2.5 px-2.5 text-right text-sky-600">{formatNumber(r2Sum.pdm)}</td>
                <td className="py-2.5 px-2 text-right">{formatNumber(r2Sum.absen)}</td>
                <td className="py-2.5 px-2 text-right">{formatNumber(r2Sum.frek)}</td>
                <td className="py-2.5 px-2.5 text-right font-bold text-red-600 border-l border-neutral-200 dark:border-neutral-700">{formatNumber(r2Sum.l250)}</td>
                <td className="py-2.5 px-2.5 text-right font-bold text-amber-600">{formatNumber(r2Sum.l300)}</td>
              </tr>

              {/* Total Cabang */}
              <tr className="bg-brand-50/80 dark:bg-brand-950/40 font-bold border-t-2 border-brand-200 dark:border-brand-900/60">
                <td className="py-3 px-3 font-sans text-brand-700 dark:text-brand-300">TOTAL CABANG JEMBER</td>
                <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-300">{formatNumber(cabangSum.vTotal[0])}</td>
                <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-300">{formatNumber(cabangSum.vTotal[1])}</td>
                <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-300">{formatNumber(cabangSum.vTotal[2])}</td>
                <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-300">{formatNumber(cabangSum.vTotal[3])}</td>
                <td className="py-3 px-3 text-right font-black text-brand-700 dark:text-brand-300 text-sm">
                  {formatNumber(cabangSum.sold)}
                </td>
                <td className="py-3 px-2.5 text-right font-bold text-brand-700 dark:text-brand-300">
                  {formatNumber(totalBranchTarget)}
                </td>
                <td className={`py-3 px-2.5 text-right font-black border-r border-neutral-200 dark:border-neutral-800 ${
                  cabangSum.sold >= totalBranchTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatPercent(cabangSum.sold / (totalBranchTarget || 1))}
                </td>
                <td className="py-3 px-2.5 text-right text-amber-600 dark:text-amber-400">{formatNumber(cabangSum.bb)}</td>
                <td className={`py-3 px-2.5 text-right ${getBbStatusClass((cabangSum.bb + cabangSum.sold) > 0 ? (cabangSum.bb / (cabangSum.bb + cabangSum.sold)) : 0)}`}>
                  {formatPercent(cabangSum.bb / ((cabangSum.bb + cabangSum.sold) || 1))}
                </td>
                <td className="py-3 px-2.5 text-right text-sky-600 dark:text-sky-400">{formatNumber(cabangSum.pdm)}</td>
                <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-300">{formatNumber(cabangSum.absen)}</td>
                <td className="py-3 px-2 text-right text-brand-700 dark:text-brand-300">{formatNumber(cabangSum.frek)}</td>
                <td className="py-3 px-2.5 text-right font-bold text-red-600 border-l border-neutral-200 dark:border-neutral-700">{formatNumber(cabangSum.l250)}</td>
                <td className="py-3 px-2.5 text-right font-bold text-amber-600">{formatNumber(cabangSum.l300)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
