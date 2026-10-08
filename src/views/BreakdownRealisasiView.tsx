import React, { useMemo, useState } from 'react';
import { Calendar, Download } from 'lucide-react';
import { AppState, VariantCode, DailySalesRecord } from '../types';
import {
  formatNumber,
  formatPercent,
  formatDiff,
  getStatusClass,
  getBbStatusClass,
  getPembagiHari,
  getPembagiBreakdownBulanan,
  getPembagiBreakdownMingguan,
  getDaysInActiveMonth,
  getWeeksOfMonth,
  getSeedDailyBranchTotal
} from '../services/storage';

interface BreakdownRealisasiViewProps {
  state: AppState;
  onUpdateRayon: (rayon: number) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  // Dipertahankan agar pemanggil lama tidak error (tidak dipakai lagi: tanpa cut-off).
  onUpdatePembagiHari?: () => void;
  onUpdateActiveDay?: (day: number) => void;
  onUpdatePembagiKhususTku?: (tkuIdx: number, val: number | null) => void;
}

type ViewMode = 'mingguan' | 'bulanan';
type DataTab = 'breakdown' | 'realisasi';

interface Agg {
  daily: number[][]; // index 1..N -> [YO, OM, OS, YT]
  acc: number[]; // akumulasi per varian s/d tanggal pengali
  accTotal: number;
  avg: number[];
  avgTotal: number;
  cmp: { tg: number; bl: number; ty: number }; // pembanding = rata-rata harian (bukan akumulasi)
  pct: { tg: number | null; bl: number | null; ty: number | null };
  diff: { tg: number; bl: number; ty: number }; // selisih botol
}

interface TableRow {
  key: string;
  label: string;
  kind: 'tku' | 'rayon' | 'total';
  agg: Agg;
  idxs: number[];
}

// Operasional akumulatif (BB, PDM, absen, frekuensi, JWP, YL, area)
interface Ops {
  bb: number;
  pdm: number;
  absen: number;
  frek: number;
  jwp: number;
  yl: number;
  area: number;
  l250: number;
  l300: number;
}

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const VCODES: VariantCode[] = ['YO', 'OM', 'OS', 'YT'];

export const BreakdownRealisasiView: React.FC<BreakdownRealisasiViewProps> = ({
  state,
  onUpdateRayon
}) => {
  const [tab, setTab] = useState<DataTab>('breakdown');
  const [viewMode, setViewMode] = useState<ViewMode>('bulanan');
  const isReal = tab === 'realisasi';
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const selectedRayon = state.selectedRayon; // 0: Cabang, 1: Rayon 1, 2: Rayon 2

  // ---- Kalender bulan kerja ----
  const period = state.activePeriod || state.activeDate;
  const pParts = period.split('-');
  const year = parseInt(pParts[0], 10);
  const month = parseInt(pParts[1], 10); // 1..12
  const daysInMonth = getDaysInActiveMonth(state);
  const updateDay = getPembagiHari(state); // tanggal update = pembagi realisasi (maks. tanggal terakhir bulan)
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const isoDate = (d: number) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dow = (d: number) => new Date(year, month - 1, d).getDay();

  // Minggu berakhir di hari Sabtu; minggu terakhir berakhir di tanggal terakhir bulan.
  const weeks = useMemo(() => getWeeksOfMonth(state), [state.activePeriod, state.activeDate]);

  const currentWeekIdx = Math.max(0, weeks.findIndex(w => updateDay >= w.start && updateDay <= w.end));
  const weekIdx = Math.min(selectedWeek ?? currentWeekIdx, weeks.length - 1);
  const week = weeks[weekIdx];

  const shownStart = viewMode === 'mingguan' ? week.start : 1;
  const shownEnd = viewMode === 'mingguan' ? week.end : daysInMonth;
  const shownDays = Array.from({ length: shownEnd - shownStart + 1 }, (_, i) => shownStart + i);

  // Tanggal pengali / pembagi:
  // - REALISASI : selalu tanggal update (mingguan maupun bulanan)
  // - BREAKDOWN : bulanan = tanggal terakhir bulan; mingguan = tanggal hari Sabtu minggu tsb
  //               (minggu terakhir yang terpotong akhir bulan = tanggal terakhir bulan)
  // Akumulasi selalu dihitung dari tanggal 1 sampai tanggal pengali.
  const n = isReal
    ? Math.max(1, Math.min(updateDay, daysInMonth))
    : viewMode === 'mingguan'
      ? getPembagiBreakdownMingguan(weekIdx, state)
      : getPembagiBreakdownBulanan(state);

  // ---- Data penjualan ----
  const activeTkus = state.tkus.filter(t => t.aktif);
  const totalBranchTarget = activeTkus.reduce((a, b) => a + b.targetHarian, 0) || 1;

  const getRecordFor = (dateStr: string, tkuIdx: number): DailySalesRecord | null => {
    if (state.pjd[dateStr] && state.pjd[dateStr][tkuIdx]) return state.pjd[dateStr][tkuIdx];
    if (dateStr === state.activeDate && state.todayInputs[tkuIdx]) return state.todayInputs[tkuIdx];
    return null;
  };

  // Penjualan harian satu TKU pada tanggal d: [YO, OM, OS, YT]
  const getSales = (tkuIdx: number, d: number): number[] => {
    const t = state.tkus[tkuIdx];
    if (!t || !t.aktif) return [0, 0, 0, 0];
    if (d > updateDay) return [0, 0, 0, 0];
    const rec = getRecordFor(isoDate(d), tkuIdx);
    if (rec && rec.v) return [0, 1, 2, 3].map(i => rec.v[i] || 0);
    if (dow(d) === 0) return [0, 0, 0, 0]; // Minggu libur
    const branchDayTotal = getSeedDailyBranchTotal(state, d);
    const tkuTotal = Math.round(branchDayTotal * (t.targetHarian / totalBranchTarget));
    const ratios = [0.76, 0.09, 0.11, 0.04];
    return ratios.map(r => Math.round(tkuTotal * r));
  };

  // Rencana breakdown satu TKU pada tanggal d: [YO, OM, OS, YT]
  const getPlan = (tkuIdx: number, d: number): number[] => {
    const t = state.tkus[tkuIdx];
    if (!t || !t.aktif) return [0, 0, 0, 0];
    const bv = state.breakdownPerVariant;
    if (bv && bv.YO && bv.YO[tkuIdx]) return VCODES.map(v => bv[v]?.[tkuIdx]?.[d - 1] || 0);
    const tot = state.breakdown?.[tkuIdx]?.[d - 1] || 0;
    return [0.76, 0.09, 0.11, 0.04].map(r => Math.round(tot * r));
  };

  const salesByTku = useMemo(() => {
    const map: Record<number, number[][]> = {};
    state.tkus.forEach((_t, idx) => {
      const arr: number[][] = [[0, 0, 0, 0]];
      for (let d = 1; d <= daysInMonth; d++) {
        // Pada menu breakdown: tanggal <= updateDay (sudah terealisasi) diisi dari realisasi (getSales),
        // sedangkan tanggal > updateDay (sisa hari) diisi dari rencana target (getPlan).
        const val = isReal
          ? getSales(idx, d)
          : (d <= updateDay ? getSales(idx, d) : getPlan(idx, d));
        arr.push(val);
      }
      map[idx] = arr;
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tkus, state.pjd, state.todayInputs, state.breakdown, state.breakdownPerVariant, state.activeDate, state.activePeriod, updateDay, daysInMonth, tab]);

  const build = (idxs: number[]): Agg => {
    const daily: number[][] = [[0, 0, 0, 0]];
    for (let d = 1; d <= daysInMonth; d++) {
      const sum = [0, 0, 0, 0];
      idxs.forEach(i => {
        const s = salesByTku[i]?.[d] || [0, 0, 0, 0];
        for (let v = 0; v < 4; v++) sum[v] += s[v];
      });
      daily.push(sum);
    }
    const acc = [0, 0, 0, 0];
    for (let d = 1; d <= n; d++) for (let v = 0; v < 4; v++) acc[v] += daily[d][v];
    const accTotal = acc.reduce((a, b) => a + b, 0);
    const avg = acc.map(x => x / n);
    const avgTotal = accTotal / n;
    const cmp = {
      tg: idxs.reduce((a, i) => a + (state.tkus[i]?.targetHarian || 0), 0),
      bl: idxs.reduce((a, i) => a + (state.targetBulanLalu[i] || 0), 0),
      ty: idxs.reduce((a, i) => a + (state.targetTahunLalu[i] || 0), 0)
    };
    const pct = (c: number) => (c > 0 ? avgTotal / c : null);
    return {
      daily,
      acc,
      accTotal,
      avg,
      avgTotal,
      cmp,
      pct: { tg: pct(cmp.tg), bl: pct(cmp.bl), ty: pct(cmp.ty) },
      // Selisih botol = akumulasi - (pembanding x tanggal pengali)
      diff: {
        tg: accTotal - cmp.tg * n,
        bl: accTotal - cmp.bl * n,
        ty: accTotal - cmp.ty * n
      }
    };
  };

  // ---- Operasional akumulatif per TKU (tgl 1 s/d tanggal update) ----
  // BB, Absen, Frekuensi = jumlah data harian yang diinput TKU. Akm PDM = Penjualan Akm + BB Akm (dihitung di opsOf).
  // JWP, Jml YL, Jml Area = nilai pada catatan terbaru (JWP bersifat kumulatif).
  const opsByTku = useMemo(() => {
    const map: Record<number, Ops> = {};
    state.tkus.forEach((t, idx) => {
      const o: Ops = { bb: 0, pdm: 0, absen: 0, frek: 0, jwp: 0, yl: t.jumlahYl || 0, area: t.jumlahArea || 0, l250: t.l250 ?? 0, l300: t.l300 ?? 0 };
      let last: DailySalesRecord | null = null;
      let latestAbsen = t.absenYl ?? 0;
      let latestFrek = t.frekuensiAbsen ?? 0;
      for (let d = 1; d <= Math.min(updateDay, daysInMonth); d++) {
        const rec = getRecordFor(isoDate(d), idx);
        if (!rec) continue;
        o.bb += rec.bb || 0;
        o.pdm += rec.pdm || (rec.pdmV ? rec.pdmV.reduce((a, b) => a + b, 0) : 0);
        if (rec.absen !== undefined) latestAbsen = Number(rec.absen) || 0;
        if (rec.frek !== undefined) latestFrek = Number(rec.frek) || 0;
        last = rec;
      }
      o.yl = t.jumlahYl || 10;
      o.area = t.jumlahArea || 10;
      if (last) {
        if (last.l250 !== undefined) o.l250 = last.l250;
        if (last.l300 !== undefined) o.l300 = last.l300;
      } else {
        o.l250 = t.l250 ?? 0;
        o.l300 = t.l300 ?? 0;
      }
      o.jwp = (last?.jwp && last.jwp > 0) ? last.jwp : (o.yl * updateDay);
      o.absen = latestAbsen;
      o.frek = latestFrek;
      const baseBbSum = t.bbAkm ? t.bbAkm.reduce((a, b) => a + b, 0) : 0;
      if (o.bb < baseBbSum) o.bb = baseBbSum;

      if (!t.aktif) { o.bb = 0; o.pdm = 0; o.absen = 0; o.frek = 0; o.jwp = 0; o.yl = 0; o.area = 0; o.l250 = 0; o.l300 = 0; }
      map[idx] = o;
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tkus, state.pjd, state.todayInputs, state.activeDate, state.activePeriod, updateDay, daysInMonth]);

  const opsOf = (idxs: number[], accSold: number) => {
    const o: Ops = { bb: 0, pdm: 0, absen: 0, frek: 0, jwp: 0, yl: 0, area: 0, l250: 0, l300: 0 };
    idxs.forEach(i => {
      const x = opsByTku[i];
      if (!x) return;
      (Object.keys(o) as (keyof Ops)[]).forEach(k => { o[k] += x[k]; });
    });
    return {
      ...o,
      pdm: accSold + o.bb, // Akm PDM = Penjualan Akm + BB Akm
      pctBb: o.bb + accSold > 0 ? o.bb / (o.bb + accSold) : null,
      syl: o.jwp > 0 ? Math.round(accSold / o.jwp) : null,
      cover: o.area > 0 ? o.yl / o.area : null,
      pctL250: o.yl > 0 ? o.l250 / o.yl : null,
      pctL300: o.yl > 0 ? o.l300 / o.yl : null
    };
  };

  // ---- Susun baris ----
  const rayonsToShow = selectedRayon === 0 ? [1, 2] : [selectedRayon];
  const rows: TableRow[] = [];
  const allIdxs: number[] = [];
  rayonsToShow.forEach(r => {
    const idxs = state.tkus.map((t, i) => (t.aktif && t.rayon === r ? i : -1)).filter(i => i >= 0);
    idxs.forEach(i => {
      rows.push({ key: `t${i}`, label: state.tkus[i].nama, kind: 'tku', agg: build([i]), idxs: [i] });
      allIdxs.push(i);
    });
    rows.push({ key: `r${r}`, label: `Subtotal Rayon ${r}`, kind: 'rayon', agg: build(idxs), idxs });
  });
  if (selectedRayon === 0) {
    rows.push({ key: 'all', label: 'Total Cabang', kind: 'total', agg: build(allIdxs), idxs: allIdxs });
  }

  // ---- Ekspor CSV ----
  const handleExportCsv = () => {
    const head: string[] = ['Nama TKU'];
    shownDays.forEach(d => VCODES.forEach(v => head.push(`Tgl ${d} ${v}`)));
    VCODES.forEach(v => head.push(`Akumulasi ${v}`));
    head.push('Akumulasi Total');
    VCODES.forEach(v => head.push(`Rata-rata ${v}`));
    head.push('Rata-rata Total');
    head.push('% vs Target', '% vs Bulan Lalu', '% vs Tahun Lalu');
    head.push('Selisih Botol vs Target', 'Selisih Botol vs Bulan Lalu', 'Selisih Botol vs Tahun Lalu');
    if (isReal) head.push('BB Akm', '% BB', 'PDM Akm', 'Absen Akm', 'Frek Akm', 'JWP', 's/YL', 'Jml YL', 'Jml Area', '% Cover Area');

    const lines = [head];
    rows.forEach(r => {
      const line: (string | number)[] = [r.label];
      shownDays.forEach(d => r.agg.daily[d].forEach(x => line.push(isReal && d > updateDay ? '' : x)));
      r.agg.acc.forEach(x => line.push(x));
      line.push(r.agg.accTotal);
      r.agg.avg.forEach(x => line.push(Math.round(x)));
      line.push(Math.round(r.agg.avgTotal));
      line.push(...[r.agg.pct.tg, r.agg.pct.bl, r.agg.pct.ty].map(p => (p === null ? '' : (p * 100).toFixed(1) + '%')));
      line.push(Math.round(r.agg.diff.tg), Math.round(r.agg.diff.bl), Math.round(r.agg.diff.ty));
      if (isReal) {
        const o = opsOf(r.idxs, r.agg.accTotal);
        line.push(
          o.bb, o.pctBb === null ? '' : (o.pctBb * 100).toFixed(1) + '%', o.pdm, o.absen, o.frek,
          o.jwp, o.syl === null ? '' : o.syl, o.yl, o.area, o.cover === null ? '' : (o.cover * 100).toFixed(1) + '%'
        );
      }
      lines.push(line.map(String));
    });
    const csv = lines.map(l => l.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab}_${viewMode}_${year}-${String(month).padStart(2, '0')}${viewMode === 'mingguan' ? `_mgg${weekIdx + 1}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Tampilan ----
  const stickyBg = (kind: TableRow['kind']) =>
    kind === 'total'
      ? 'bg-neutral-900 dark:bg-neutral-950'
      : kind === 'rayon'
        ? 'bg-neutral-100 dark:bg-neutral-800'
        : 'bg-white dark:bg-neutral-900';
  const rowBg = (kind: TableRow['kind']) =>
    kind === 'total'
      ? 'bg-neutral-900 text-white dark:bg-neutral-950 font-bold'
      : kind === 'rayon'
        ? 'bg-neutral-100 dark:bg-neutral-800 font-bold'
        : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50';
  const pctClass = (p: number | null, kind: TableRow['kind']) =>
    p === null
      ? 'text-neutral-400'
      : kind === 'total'
        ? p >= 1 ? 'text-emerald-300' : 'text-red-300'
        : p >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  const diffClass = (x: number, kind: TableRow['kind']) =>
    kind === 'total' ? (x >= 0 ? 'text-emerald-300' : 'text-red-300') : getStatusClass(x);

  const th = 'px-2 py-1.5 text-center font-semibold whitespace-nowrap border-l border-neutral-200 dark:border-neutral-800';
  const td = 'px-2 py-2 text-right font-mono text-[11px] whitespace-nowrap';

  const blocks = [
    { title: isReal ? '1. Realisasi per Tanggal' : '1. Rencana Breakdown per Tanggal', span: shownDays.length * 4, tone: 'text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800' },
    { title: `2. Akumulasi (Tgl 1–${n})`, span: 5, tone: 'text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/30' },
    { title: `3. Rata-rata (÷ ${n} hari)`, span: 5, tone: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30' },
    { title: '4. Vs Target / Bulan Lalu / Tahun Lalu', span: 3, tone: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30' },
    { title: '5. Selisih Botol', span: 3, tone: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30' }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{isReal ? 'Realisasi' : 'Breakdown'}</h1>
          <p className="text-xs text-neutral-500">
            {monthName}{isReal ? ` • s/d Tgl ${updateDay}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-neutral-900 dark:bg-neutral-100 rounded-xl shrink-0">
            {([
              { id: 'breakdown', label: 'Breakdown' },
              { id: 'realisasi', label: 'Realisasi' }
            ] as const).map(m => (
              <button
                key={m.id}
                onClick={() => setTab(m.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  tab === m.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-neutral-300 dark:text-neutral-600 hover:text-white dark:hover:text-neutral-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl shrink-0">
            {[
              { id: 0, label: 'Semua' },
              { id: 1, label: 'Rayon 1' },
              { id: 2, label: 'Rayon 2' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => onUpdateRayon(r.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedRayon === r.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
            title="Unduh tabel format CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Mingguan / Bulanan (+ pilih minggu) */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center">
          {([
            { id: 'mingguan', label: 'Mingguan' },
            { id: 'bulanan', label: 'Bulanan' }
          ] as const).map(m => (
            <button
              key={m.id}
              onClick={() => setViewMode(m.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === m.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {viewMode === 'mingguan' && (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
            <Calendar className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            {weeks.map((w, i) => (
              <button
                key={i}
                onClick={() => setSelectedWeek(i)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  i === weekIdx
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                Mgg {i + 1} <span className="font-normal opacity-70">({w.start}–{w.end})</span>
              </button>
            ))}
          </div>
        )}

        <span className="text-[11px] text-neutral-500 sm:ml-auto">
          Pembagi {isReal ? '(tanggal update)' : viewMode === 'mingguan' ? '(tanggal Sabtu minggu ini)' : '(tanggal terakhir bulan)'}: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{n} hari</strong>
          {' '}&bull; Selisih = Akumulasi − (pembanding × {n})
        </span>
      </div>

      {/* Legend Keterangan Warna */}
      <div className="flex flex-wrap items-center gap-4 bg-neutral-50 dark:bg-neutral-800/60 px-3.5 py-2 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 text-xs">
        <div className="flex items-center gap-1.5 font-sans">
          <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block shrink-0" />
          <span><strong className="text-emerald-700 dark:text-emerald-400">Header Hijau Badge "Riil" / Kolom Hijau</strong> = Tanggal Sudah Terealisasi (Data Penjualan Nyata)</span>
        </div>
        <div className="flex items-center gap-1.5 font-sans">
          <span className="w-2.5 h-2.5 rounded bg-neutral-200 dark:bg-neutral-700 inline-block shrink-0" />
          <span><strong className="text-neutral-700 dark:text-neutral-300">Kolom Biasa</strong> = Target Rencana Sisa Hari</span>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse w-max min-w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th rowSpan={3} className="sticky left-0 z-20 px-3 py-2 text-left font-semibold bg-neutral-50 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 min-w-[130px] text-neutral-600 dark:text-neutral-300">
                  Nama TKU
                </th>
                {blocks.map(b => (
                  <th key={b.title} colSpan={b.span} className={`px-2 py-1.5 text-center font-bold border-l border-neutral-200 dark:border-neutral-800 ${b.tone}`}>
                    {b.title}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-300">
                {shownDays.map(d => {
                  const w = dow(d);
                  const isRealizedDay = d <= updateDay;
                  return (
                    <th
                      key={d}
                      colSpan={4}
                      className={`${th} ${w === 0 ? 'text-red-600 dark:text-red-400' : ''} ${
                        isRealizedDay
                          ? 'bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold border-b-2 border-b-emerald-500'
                          : ''
                      }`}
                      title={isRealizedDay ? `Tgl ${d} • Sudah Terealisasi (Penjualan Riil)` : `Tgl ${d} • Target Rencana Sisa Hari`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{DAY_NAMES[w]} {d}</span>
                        {isRealizedDay && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-600 text-white font-bold leading-none">
                            Riil
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {[...VCODES, 'Total'].map(l => (
                  <th key={`a${l}`} rowSpan={2} className={th}>{l}</th>
                ))}
                {[...VCODES, 'Total'].map(l => (
                  <th key={`r${l}`} rowSpan={2} className={th}>{l}</th>
                ))}
                {['Target', 'Bln Lalu', 'Thn Lalu'].map(l => (
                  <th key={`p${l}`} rowSpan={2} className={th}>{l}</th>
                ))}
                {['Target', 'Bln Lalu', 'Thn Lalu'].map(l => (
                  <th key={`s${l}`} rowSpan={2} className={th}>{l}</th>
                ))}
              </tr>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500">
                {shownDays.map(d =>
                  VCODES.map((v, vi) => (
                    <th
                      key={`${d}${v}`}
                      className={`px-1.5 py-1 text-center font-semibold text-[10px] min-w-[44px] ${vi === 0 ? 'border-l border-neutral-200 dark:border-neutral-800' : ''}`}
                    >
                      {v}
                    </th>
                  ))
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map(r => {
                const a = r.agg;
                const sep = 'border-l border-neutral-200 dark:border-neutral-700';
                return (
                  <tr key={r.key} className={rowBg(r.kind)}>
                    <td className={`sticky left-0 z-10 px-3 py-2 font-semibold whitespace-nowrap border-r border-neutral-200 dark:border-neutral-700 ${stickyBg(r.kind)}`}>
                      {r.label}
                    </td>

                    {/* 1. Transaksi per tanggal */}
                    {shownDays.map(d =>
                      VCODES.map((v, vi) => {
                        const future = isReal && d > updateDay;
                        const val = a.daily[d][vi];
                        const isSunEmpty = dow(d) === 0 && val === 0;
                        return (
                          <td
                            key={`${d}${v}`}
                            className={`${td} ${vi === 0 ? sep : ''} ${future || isSunEmpty ? 'text-neutral-300 dark:text-neutral-600' : ''}`}
                          >
                            {future ? '·' : isSunEmpty ? '-' : formatNumber(val)}
                          </td>
                        );
                      })
                    )}

                    {/* 2. Akumulasi */}
                    {a.acc.map((x, i) => (
                      <td key={`a${i}`} className={`${td} ${i === 0 ? sep : ''}`}>{formatNumber(x)}</td>
                    ))}
                    <td className={`${td} font-bold`}>{formatNumber(a.accTotal)}</td>

                    {/* 3. Rata-rata */}
                    {a.avg.map((x, i) => (
                      <td key={`r${i}`} className={`${td} ${i === 0 ? sep : ''}`}>{formatNumber(x)}</td>
                    ))}
                    <td className={`${td} font-bold`}>{formatNumber(a.avgTotal)}</td>

                    {/* 4. Vs target / bulan lalu / tahun lalu */}
                    {[a.pct.tg, a.pct.bl, a.pct.ty].map((p, i) => (
                      <td key={`p${i}`} className={`${td} font-semibold ${i === 0 ? sep : ''} ${pctClass(p, r.kind)}`}>
                        {formatPercent(p)}
                      </td>
                    ))}

                    {/* 5. Selisih botol */}
                    {[a.diff.tg, a.diff.bl, a.diff.ty].map((x, i) => (
                      <td key={`s${i}`} className={`${td} font-semibold ${i === 0 ? sep : ''} ${diffClass(x, r.kind)}`}>
                        {formatDiff(x)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Tabel operasional akumulatif (hanya di tab Realisasi) */}
      {isReal && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Kondisi TKU
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-max min-w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-300">
                  <th className="sticky left-0 z-20 px-3 py-2 text-left font-semibold bg-neutral-50 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 min-w-[130px]">Nama TKU</th>
                  {['Penjualan Akm', 'BB Akm', '% BB', 'PDM Akm', 'Absen Akm', 'Frek Akm', 'JWP', 's/YL', 'Jml YL', 'Jml Area', '% Cover Area', 'YL < 250', '% < 250', 'YL < 300', '% < 300'].map(l => (
                    <th key={l} className={th}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {rows.map(r => {
                  const o = opsOf(r.idxs, r.agg.accTotal);
                  const sep = 'border-l border-neutral-200 dark:border-neutral-700';
                  const coverCls = o.cover === null
                    ? 'text-neutral-400'
                    : r.kind === 'total'
                      ? (o.cover >= 1 ? 'text-emerald-300' : 'text-amber-300')
                      : (o.cover >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400');
                  return (
                    <tr key={`o${r.key}`} className={rowBg(r.kind)}>
                      <td className={`sticky left-0 z-10 px-3 py-2 font-semibold whitespace-nowrap border-r border-neutral-200 dark:border-neutral-700 ${stickyBg(r.kind)}`}>
                        {r.label}
                      </td>
                      <td className={`${td} ${sep}`}>{formatNumber(r.agg.accTotal)}</td>
                      <td className={`${td} ${sep}`}>{formatNumber(o.bb)}</td>
                      <td className={`${td} ${getBbStatusClass(o.pctBb)}`}>{formatPercent(o.pctBb)}</td>
                      <td className={`${td} ${sep}`}>{formatNumber(o.pdm)}</td>
                      <td className={`${td} ${sep}`}>{formatNumber(o.absen)}</td>
                      <td className={td}>{formatNumber(o.frek)}</td>
                      <td className={`${td} ${sep}`}>{formatNumber(o.jwp)}</td>
                      <td className={td}>{o.syl === null ? '—' : formatNumber(o.syl)}</td>
                      <td className={`${td} ${sep}`}>{formatNumber(o.yl)}</td>
                      <td className={td}>{formatNumber(o.area)}</td>
                      <td className={`${td} font-semibold ${coverCls}`}>{formatPercent(o.cover)}</td>
                      <td className={`${td} ${sep} font-bold text-red-600 dark:text-red-400`}>{formatNumber(o.l250)}</td>
                      <td className={`${td} text-red-600 dark:text-red-400`}>{formatPercent(o.pctL250)}</td>
                      <td className={`${td} ${sep} font-bold text-amber-600 dark:text-amber-400`}>{formatNumber(o.l300)}</td>
                      <td className={`${td} text-amber-600 dark:text-amber-400`}>{formatPercent(o.pctL300)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
