import { AppState, DailySalesRecord } from '../types';
import { getPeriodInfo, getPembagiHari, getJwpAsOf } from './storage';

/**
 * Evaluasi bersama untuk menu Breakdown, Realisasi (admin) dan ringkasan akun TKU.
 * Semua fungsi murni (tanpa React) supaya angkanya sama di mana pun ditampilkan.
 *
 * Aturan hari:
 *  - "Hari jual" = tanggal yang punya penjualan di cabang (minimal satu TKU > 0).
 *  - Sisa hari ke depan dihitung tanpa hari Minggu (libur). Libur nasional tidak diketahui sistem.
 *  - Target dihitung per hari kalender (targetHarian x jumlah hari), sama seperti kolom vs Target di tabel.
 */

export interface WeekDef { start: number; end: number }

export type ProgressStatus = 'tercapai' | 'aman' | 'waspada' | 'berat' | 'nodata';

export interface ProgressSummary {
  updateDay: number;
  daysInMonth: number;
  workDone: number; // jumlah hari jual s/d tanggal update
  workLeft: number; // sisa hari kerja (tanpa Minggu) setelah tanggal update
  acc: number;
  tgHarian: number;
  targetToDate: number; // targetHarian x tanggal update
  targetMonth: number; // targetHarian x jumlah hari bulan
  pctToDate: number | null; // acc / targetToDate
  gapToDate: number; // acc - targetToDate
  sisaTarget: number; // sisa botol agar target bulan tercapai
  needPerDay: number | null; // butuh botol per hari kerja sisa
  avgPerWorkDay: number; // laju rata-rata per hari jual
  projectedTotal: number;
  projectedPct: number | null; // proyeksi akhir bulan / target bulan
  status: ProgressStatus;
}

export interface WeekCompare {
  days: number[]; // tanggal minggu ini yang punya pembanding (hari jual di tanggal itu dan 7 hari sebelumnya)
  cells: number[]; // selisih penjualan per tanggal vs tanggal - 7
  cur: number;
  prev: number;
  diff: number;
  pct: number | null;
  upDays: number;
  downDays: number;
  bbCur: number;
  bbPrev: number;
  bbPctCur: number | null; // BB / (penjualan + BB) pada hari yang dibandingkan
  bbPctPrev: number | null;
  absenNow: number;
  absenPrev: number | null; // posisi absen per (tanggal update - 7); null jika belum ada catatan
  frekNow: number;
  frekPrev: number | null;
  accNow: number;
  accPrev: number | null;
  jwpNow: number;
  jwpPrev: number | null;
  sylNow: number | null;
  sylPrev: number | null;
  vCur: number[]; // penjualan per varian [YO,OM,OS,YT] pada hari yang dibandingkan (minggu ini)
  vPrev: number[]; // idem, minggu lalu
  l250Cur: number | null; // rata-rata YL < 250 per hari yang dibandingkan (null = belum tercatat)
  l250Prev: number | null;
}

export interface EvalUnit {
  key: string;
  name: string;
  rayon: number;
  idx: number; // -1 untuk baris gabungan (rayon / cabang)
  acc: number;
  tgHarian: number;
  progress: ProgressSummary;
  week: WeekCompare;
  /** rata-rata penjualan per hari kalender (pembagi 7 untuk minggu Min–Sab penuh) untuk tiap minggu (null = belum ada data minggu itu) */
  trend: (number | null)[];
  weekSums: number[];
  /** jumlah botol per minggu per varian: [minggu][YO,OM,OS,YT] */
  variantSums: number[][];
  /** banyaknya penurunan berturut-turut sampai minggu terakhir yang punya data */
  streak: number;
}

export interface WeekCol {
  id: number;
  start: number;
  end: number;
  days: number; // jumlah hari jual (<= tanggal update)
  calDays: number; // jumlah hari kalender (Min–Sab, Minggu ikut dihitung) s/d tanggal update = pembagi rata-rata mingguan
  current: boolean; // minggu yang memuat tanggal update
  future: boolean; // belum ada hari jual sama sekali
}

export interface ProgressEval {
  periodLabel: string;
  updateDay: number;
  daysInMonth: number;
  workDone: number;
  workLeft: number;
  weekCols: WeekCol[];
  cmp: { weekIdx: number; start: number; end: number; days: number[] };
  units: EvalUnit[]; // semua TKU aktif
  cabang: EvalUnit;
  rayon: Record<number, EvalUnit>;
  aggregate: (units: EvalUnit[], name: string, rayon: number) => EvalUnit;
  variantTrend: (units: EvalUnit[]) => { code: 'YO' | 'OM' | 'OS' | 'YT'; avg: (number | null)[] }[];
}

const VCODES = ['YO', 'OM', 'OS', 'YT'] as const;

const sumNullable = (vals: (number | null)[]): number | null =>
  vals.every(v => v !== null) ? (vals as number[]).reduce((a, b) => a + b, 0) : null;

export function buildProgressEval(state: AppState, weeks: WeekDef[]): ProgressEval {
  const period = getPeriodInfo(state);
  const dim = period.daysInMonth;
  const updateDay = Math.max(1, Math.min(getPembagiHari(state), dim));

  const keyOf = (d: number): string => {
    const dt = new Date(period.year, period.monthIndex, d); // d <= 0 otomatis mundur ke bulan lalu
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const recOf = (idx: number, d: number): DailySalesRecord | null =>
    state.pjd?.[keyOf(d)]?.[idx] || (keyOf(d) === state.activeDate ? state.todayInputs?.[idx] : undefined) || null;
  const soldOf = (rec: DailySalesRecord | null): number =>
    rec ? (rec.sold || (rec.v ? rec.v.reduce((a, b) => a + (b || 0), 0) : 0)) : 0;
  const dow = (d: number) => new Date(period.year, period.monthIndex, d).getDay();

  const activeIdx = state.tkus.map((t, i) => (t.aktif ? i : -1)).filter(i => i >= 0);
  const cabangCache = new Map<number, number>();
  const cabangDay = (d: number): number => {
    if (!cabangCache.has(d)) cabangCache.set(d, activeIdx.reduce((s, i) => s + soldOf(recOf(i, d)), 0));
    return cabangCache.get(d)!;
  };
  const hasData = (d: number) => cabangDay(d) > 0;

  let workDone = 0;
  for (let d = 1; d <= updateDay; d++) if (hasData(d)) workDone++;
  let workLeft = 0;
  for (let d = updateDay + 1; d <= dim; d++) if (dow(d) !== 0) workLeft++;

  const makeProgress = (acc: number, tgHarian: number): ProgressSummary => {
    const targetToDate = tgHarian * updateDay;
    const targetMonth = tgHarian * dim;
    const avgPerWorkDay = workDone > 0 ? acc / workDone : 0;
    const projectedTotal = acc + avgPerWorkDay * workLeft;
    const projectedPct = targetMonth > 0 ? projectedTotal / targetMonth : null;
    const sisaTarget = Math.max(0, targetMonth - acc);
    let status: ProgressStatus = 'nodata';
    if (targetMonth > 0) {
      if (acc >= targetMonth) status = 'tercapai';
      else if (projectedPct !== null && projectedPct >= 1) status = 'aman';
      else if (projectedPct !== null && projectedPct >= 0.95) status = 'waspada';
      else status = 'berat';
    }
    return {
      updateDay,
      daysInMonth: dim,
      workDone,
      workLeft,
      acc,
      tgHarian,
      targetToDate,
      targetMonth,
      pctToDate: targetToDate > 0 ? acc / targetToDate : null,
      gapToDate: acc - targetToDate,
      sisaTarget,
      needPerDay: workLeft > 0 ? sisaTarget / workLeft : null,
      avgPerWorkDay,
      projectedTotal,
      projectedPct,
      status
    };
  };

  // ---- Pembanding mingguan: tanggal d vs d-7, hanya hari jual di kedua tanggal ----
  const safeWeeks = weeks.length > 0 ? weeks : [{ start: 1, end: dim }];
  let weekIdx = safeWeeks.findIndex(w => updateDay >= w.start && updateDay <= w.end);
  if (weekIdx < 0) weekIdx = safeWeeks.length - 1;
  const cw = safeWeeks[weekIdx];
  const cmpDays: number[] = [];
  for (let d = cw.start; d <= Math.min(cw.end, updateDay); d++) {
    if (hasData(d) && hasData(d - 7)) cmpDays.push(d);
  }

  const snap = (idx: number, upto: number, field: 'absen' | 'frek'): number | null => {
    let v: number | null = null;
    for (let d = 1; d <= Math.min(upto, dim); d++) {
      const r = recOf(idx, d);
      const x = r ? r[field] : undefined;
      if (x !== undefined && x !== null) v = Number(x) || 0;
    }
    return v;
  };

  const weekCols: WeekCol[] = safeWeeks.map((w, i) => {
    let days = 0;
    for (let d = w.start; d <= Math.min(w.end, updateDay); d++) if (hasData(d)) days++;
    const calDays = Math.max(0, Math.min(w.end, updateDay) - w.start + 1);
    return { id: i + 1, start: w.start, end: w.end, days, calDays, current: i === weekIdx, future: days === 0 };
  });

  const streakOf = (trend: (number | null)[]): number => {
    const seq = trend.filter(v => v !== null) as number[];
    let n = 0;
    for (let i = seq.length - 1; i >= 1; i--) {
      if (seq[i] < seq[i - 1]) n++;
      else break;
    }
    return n;
  };

  // Minggu berjalan yang belum selesai tidak ikut menghitung "Turun N mgg" (rata-ratanya hanya dari sebagian hari)
  const forStreak = (trend: (number | null)[]) =>
    trend.map((v, wi) => (weekCols[wi].current && updateDay < weekCols[wi].end ? null : v));

  const units: EvalUnit[] = activeIdx.map(i => {
    const t = state.tkus[i];
    const accNow = (t.penjualanAkm || []).reduce((a, b) => a + (b || 0), 0);
    const tg = t.targetHarian || 0;

    const cells = cmpDays.map(d => soldOf(recOf(i, d)) - soldOf(recOf(i, d - 7)));
    const cur = cmpDays.reduce((s, d) => s + soldOf(recOf(i, d)), 0);
    const prev = cmpDays.reduce((s, d) => s + soldOf(recOf(i, d - 7)), 0);
    const bbCur = cmpDays.reduce((s, d) => s + (recOf(i, d)?.bb || 0), 0);
    const bbPrev = cmpDays.reduce((s, d) => s + (recOf(i, d - 7)?.bb || 0), 0);

    const vCur = [0, 0, 0, 0];
    const vPrev = [0, 0, 0, 0];
    cmpDays.forEach(d => {
      const a = recOf(i, d);
      const b = recOf(i, d - 7);
      for (let v = 0; v < 4; v++) {
        vCur[v] += a?.v?.[v] || 0;
        vPrev[v] += b?.v?.[v] || 0;
      }
    });
    const avgL250 = (days: number[]): number | null => {
      let sum = 0;
      let cnt = 0;
      days.forEach(d => {
        const x = recOf(i, d)?.l250;
        if (x !== undefined && x !== null) {
          sum += Number(x) || 0;
          cnt++;
        }
      });
      return cnt > 0 ? sum / cnt : null;
    };

    const hasPrevDay = updateDay - 7 >= 1;
    let last7 = 0;
    for (let d = Math.max(1, updateDay - 6); d <= updateDay; d++) last7 += soldOf(recOf(i, d));
    const accPrev = hasPrevDay ? accNow - last7 : null;
    const jwpNow = t.akmJwp || 0;
    const jwpPrev = hasPrevDay ? getJwpAsOf(state, i, updateDay - 7) : null;

    const week: WeekCompare = {
      days: cmpDays,
      cells,
      cur,
      prev,
      diff: cur - prev,
      pct: prev > 0 ? cur / prev : null,
      upDays: cells.filter(x => x > 0).length,
      downDays: cells.filter(x => x < 0).length,
      bbCur,
      bbPrev,
      bbPctCur: cur + bbCur > 0 ? bbCur / (cur + bbCur) : null,
      bbPctPrev: prev + bbPrev > 0 ? bbPrev / (prev + bbPrev) : null,
      absenNow: snap(i, updateDay, 'absen') ?? t.absenYl ?? 0,
      absenPrev: hasPrevDay ? snap(i, updateDay - 7, 'absen') : null,
      frekNow: snap(i, updateDay, 'frek') ?? t.frekuensiAbsen ?? 0,
      frekPrev: hasPrevDay ? snap(i, updateDay - 7, 'frek') : null,
      accNow,
      accPrev,
      jwpNow,
      jwpPrev,
      sylNow: jwpNow > 0 ? Math.floor(accNow / jwpNow) : null,
      sylPrev: accPrev !== null && jwpPrev && jwpPrev > 0 ? Math.floor(accPrev / jwpPrev) : null,
      vCur,
      vPrev,
      l250Cur: avgL250(cmpDays),
      l250Prev: avgL250(cmpDays.map(d => d - 7))
    };

    const weekSums: number[] = [];
    const variantSums: number[][] = [];
    const trend = safeWeeks.map((w, wi) => {
      let sum = 0;
      const vs = [0, 0, 0, 0];
      for (let d = w.start; d <= Math.min(w.end, updateDay); d++) {
        if (!hasData(d)) continue;
        const r = recOf(i, d);
        sum += soldOf(r);
        for (let v = 0; v < 4; v++) vs[v] += r?.v?.[v] || 0;
      }
      weekSums.push(sum);
      variantSums.push(vs);
      return weekCols[wi].days > 0 && weekCols[wi].calDays > 0 ? sum / weekCols[wi].calDays : null;
    });

    return {
      key: `t${i}`,
      name: t.nama,
      rayon: t.rayon,
      idx: i,
      acc: accNow,
      tgHarian: tg,
      progress: makeProgress(accNow, tg),
      week,
      trend,
      weekSums,
      variantSums,
      streak: streakOf(forStreak(trend))
    };
  });

  const aggregate = (list: EvalUnit[], name: string, rayon: number): EvalUnit => {
    const acc = list.reduce((s, u) => s + u.acc, 0);
    const tg = list.reduce((s, u) => s + u.tgHarian, 0);
    const wk = list.map(u => u.week);
    const sum = (f: (w: WeekCompare) => number) => wk.reduce((s, w) => s + f(w), 0);
    const cur = sum(w => w.cur);
    const prev = sum(w => w.prev);
    const bbCur = sum(w => w.bbCur);
    const bbPrev = sum(w => w.bbPrev);
    const accNow = sum(w => w.accNow);
    const jwpNow = sum(w => w.jwpNow);
    const accPrev = sumNullable(wk.map(w => w.accPrev));
    const jwpPrev = sumNullable(wk.map(w => w.jwpPrev));
    const cells = cmpDays.map((_, k) => wk.reduce((s, w) => s + (w.cells[k] || 0), 0));
    const weekSums = safeWeeks.map((_, wi) => list.reduce((s, u) => s + u.weekSums[wi], 0));
    const variantSums = safeWeeks.map((_, wi) => [0, 1, 2, 3].map(v => list.reduce((s, u) => s + u.variantSums[wi][v], 0)));
    const trend = weekSums.map((s, wi) => (weekCols[wi].days > 0 && weekCols[wi].calDays > 0 ? s / weekCols[wi].calDays : null));
    return {
      key: `agg-${name}`,
      name,
      rayon,
      idx: -1,
      acc,
      tgHarian: tg,
      progress: makeProgress(acc, tg),
      week: {
        days: cmpDays,
        cells,
        cur,
        prev,
        diff: cur - prev,
        pct: prev > 0 ? cur / prev : null,
        upDays: cells.filter(x => x > 0).length,
        downDays: cells.filter(x => x < 0).length,
        bbCur,
        bbPrev,
        bbPctCur: cur + bbCur > 0 ? bbCur / (cur + bbCur) : null,
        bbPctPrev: prev + bbPrev > 0 ? bbPrev / (prev + bbPrev) : null,
        absenNow: sum(w => w.absenNow),
        absenPrev: sumNullable(wk.map(w => w.absenPrev)),
        frekNow: sum(w => w.frekNow),
        frekPrev: sumNullable(wk.map(w => w.frekPrev)),
        accNow,
        accPrev,
        jwpNow,
        jwpPrev,
        sylNow: jwpNow > 0 ? Math.floor(accNow / jwpNow) : null,
        sylPrev: accPrev !== null && jwpPrev && jwpPrev > 0 ? Math.floor(accPrev / jwpPrev) : null,
        vCur: [0, 1, 2, 3].map(v => wk.reduce((a, w) => a + (w.vCur[v] || 0), 0)),
        vPrev: [0, 1, 2, 3].map(v => wk.reduce((a, w) => a + (w.vPrev[v] || 0), 0)),
        l250Cur: sumNullable(wk.map(w => w.l250Cur)),
        l250Prev: sumNullable(wk.map(w => w.l250Prev))
      },
      trend,
      weekSums,
      variantSums,
      streak: streakOf(forStreak(trend))
    };
  };

  const variantTrend = (list: EvalUnit[]) =>
    VCODES.map((code, v) => ({
      code,
      avg: weekCols.map((c, wi) =>
        c.days > 0 && c.calDays > 0 ? list.reduce((s, u) => s + u.variantSums[wi][v], 0) / c.calDays : null
      )
    }));

  return {
    periodLabel: period.label,
    updateDay,
    daysInMonth: dim,
    workDone,
    workLeft,
    weekCols,
    cmp: { weekIdx, start: cw.start, end: cw.end, days: cmpDays },
    units,
    cabang: aggregate(units, 'Total Cabang', 1),
    rayon: {
      1: aggregate(units.filter(u => u.rayon === 1), 'Total Rayon 1', 1),
      2: aggregate(units.filter(u => u.rayon === 2), 'Total Rayon 2', 2)
    },
    aggregate,
    variantTrend
  };
}

/** Posisi satu TKU di cabang dan rayonnya (1 = terbaik). */
export function rankOf(ev: ProgressEval, idx: number) {
  const me = ev.units.find(u => u.idx === idx);
  if (!me) return null;
  const rank = (pool: EvalUnit[], f: (u: EvalUnit) => number) =>
    pool.filter(u => f(u) > f(me) + 1e-9).length + 1;
  const pct = (u: EvalUnit) => u.progress.pctToDate ?? 0;
  const avg = (u: EvalUnit) => u.progress.avgPerWorkDay;
  const sameRayon = ev.units.filter(u => u.rayon === me.rayon);
  return {
    pctCabang: rank(ev.units, pct),
    pctRayon: rank(sameRayon, pct),
    avgCabang: rank(ev.units, avg),
    avgRayon: rank(sameRayon, avg),
    totalCabang: ev.units.length,
    totalRayon: sameRayon.length
  };
}

export const STATUS_LABEL: Record<ProgressStatus, string> = {
  tercapai: 'Target tercapai',
  aman: 'On track',
  waspada: 'Waspada',
  berat: 'Perlu dikejar',
  nodata: 'Belum ada target'
};
