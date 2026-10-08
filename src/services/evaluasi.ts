import { AppState, TkuItem, VARIANTS, DailySalesRecord } from '../types';
import { getPeriodInfo, getPembagiHari, SEED_PERIOD } from './storage';

export interface EvaluasiRow {
  tku: TkuItem;
  rawIdx: number;
  // Penjualan Varian
  yo: number;
  om: number;
  os: number;
  yt: number;
  akmPjl: number;
  rata2: number;
  // Perbandingan Waktu
  vsLwPct: number | null;
  diffLw: number | null;
  /** Jumlah botol 7 hari terakhir (jendela bergulir) dan 7 hari sebelumnya, dasar hitung vs LW */
  lwCur: number;
  lwPrev: number;
  vsTgPct: number;
  diffTg: number;
  vsLmPct: number;
  diffLm: number;
  vsLyPct: number;
  diffLy: number;
  // Operasional
  akmBb: number;
  pctBb: number;
  akmPdm: number;
  jwp: number;
  syl: number;
  absen: number;
  frek: number;
  area: number;
  yl: number;
  cover: number;
  // YL Produktivitas Rendah
  l250: number;
  pctL250: number;
  l300: number;
  pctL300: number;
}

export interface EvaluasiGroup {
  key: string;
  label: string;
  kind: 'tku' | 'rayon' | 'cabang';
  rows: EvaluasiRow[];
  total: EvaluasiRow;
}

export interface EvaluasiHighlights {
  topRata: { name: string; names: string[]; val: number; rayon: number };
  topLw: { name: string; names: string[]; pct: number; rayon: number } | null;
  topTg: { name: string; names: string[]; pct: number; rayon: number };
  topLy: { name: string; names: string[]; pct: number; rayon: number };
  bestBb: { name: string; names: string[]; pct: number; rayon: number };
  topSyl: { name: string; names: string[]; val: number; rayon: number };
  bestAbsen: { name: string; names: string[]; abs: number; frk: number; rayon: number };
  bestCover: { name: string; names: string[]; pct: number; rayon: number };
  bestL250: { name: string; names: string[]; pct: number; rayon: number };
  lowestRata: { name: string; names: string[]; val: number; rayon: number };
  lowestTg: { name: string; names: string[]; pct: number; rayon: number };
}

export function buildEvaluasiData(state: AppState): {
  allRows: EvaluasiRow[];
  r1Rows: EvaluasiRow[];
  r2Rows: EvaluasiRow[];
  r1Total: EvaluasiRow;
  r2Total: EvaluasiRow;
  cabangTotal: EvaluasiRow;
  highlights: EvaluasiHighlights;
} {
  const period = getPeriodInfo(state);
  const day = state.currentDayNum;
  const divider = getPembagiHari(state);

  // vs LW = jendela 7 hari bergulir (selalu 7 hari kalender berurutan, libur ikut dihitung):
  //   jumlah botol 7 hari terakhir (tgl akhir-6 s/d akhir) ÷ jumlah botol 7 hari sebelumnya (akhir-13 s/d akhir-7).
  // "akhir" = tanggal penjualan terakhir (sama dengan pembagi rata2). Jendela boleh menyeberang ke bulan lalu.
  const lwEnd = divider;
  const dayKey = (dayNum: number): string => {
    const dt = new Date(period.year, period.monthIndex, dayNum); // dayNum <= 0 otomatis mundur ke bulan lalu
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${mm}-${dd}`;
  };
  const salesOnDay = (idx: number, dayNum: number): number => {
    const rec = state.pjd[dayKey(dayNum)]?.[idx];
    if (rec) return rec.sold || (rec.v ? rec.v.reduce((a, b) => a + b, 0) : 0);
    if (dayNum === day && state.todayInputs[idx]) return state.todayInputs[idx].sold || 0;
    return 0;
  };
  const sumDays = (idx: number, fromDay: number, toDay: number): number => {
    let t = 0;
    for (let d = fromDay; d <= toDay; d++) t += salesOnDay(idx, d);
    return t;
  };

  const allRows: EvaluasiRow[] = state.tkus.map((t, idx) => {
    const rawIdx = idx;
    const yo = t.penjualanAkm[0] || 0;
    const om = t.penjualanAkm[1] || 0;
    const os = t.penjualanAkm[2] || 0;
    const yt = t.penjualanAkm[3] || 0;
    const akmPjl = yo + om + os + yt;
    const rata2 = divider > 0 ? akmPjl / divider : 0;

    // Perbandingan vs Target
    const tgHarian = t.targetHarian || 0;
    const vsTgPct = tgHarian > 0 ? rata2 / tgHarian : 0;
    const diffTg = akmPjl - tgHarian * divider;

    // Perbandingan vs Bulan Lalu (LM)
    const lmHarian = state.targetBulanLalu[idx] || 0;
    const vsLmPct = lmHarian > 0 ? rata2 / lmHarian : 0;
    const diffLm = akmPjl - lmHarian * divider;

    // Perbandingan vs Tahun Lalu (LY)
    const lyHarian = state.targetTahunLalu[idx] || 0;
    const vsLyPct = lyHarian > 0 ? rata2 / lyHarian : 0;
    const diffLy = akmPjl - lyHarian * divider;

    // vs LW: 7 hari terakhir vs 7 hari sebelumnya (jendela bergulir)
    const lwCur = lwEnd >= 1 ? sumDays(idx, lwEnd - 6, lwEnd) : 0;
    const lwPrev = lwEnd >= 1 ? sumDays(idx, lwEnd - 13, lwEnd - 7) : 0;
    const vsLwPct = lwPrev > 0 ? lwCur / lwPrev : null;
    const diffLw = lwPrev > 0 ? (lwCur - lwPrev) / 7 : null;

    // Operasional Harian Akumulatif
    let akmBb = 0;
    let latestAbsen = t.absenYl ?? 0;
    let latestFrek = t.frekuensiAbsen ?? 0;
    let lastRec: DailySalesRecord | null = null;

    for (let d = 1; d <= day; d++) {
      const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
      const rec = state.pjd[dStr]?.[idx] || (d === day ? state.todayInputs[idx] : null);
      if (rec) {
        akmBb += rec.bb || 0;
        if (rec.absen !== undefined) latestAbsen = Number(rec.absen) || 0;
        if (rec.frek !== undefined) latestFrek = Number(rec.frek) || 0;
        lastRec = rec;
      }
    }

    const isSeed = period.key === SEED_PERIOD;
    const baseBbSum = isSeed && t.bbAkm ? t.bbAkm.reduce((a, b) => a + (Number(b) || 0), 0) : 0;
    if (isSeed && akmBb < baseBbSum) {
      akmBb = baseBbSum;
    }
    const finalAbsen = latestAbsen;
    const finalFrek = latestFrek;
    const pctBb = akmPjl + akmBb > 0 ? akmBb / (akmPjl + akmBb) : 0;
    const akmPdm = akmPjl + akmBb;
    const area = lastRec?.ar || t.jumlahArea || 10;
    const yl = lastRec?.yl || t.jumlahYl || 10;
    const cover = area > 0 ? yl / area : 1.0;
    const jwp = (lastRec?.jwp && lastRec.jwp > 0) ? lastRec.jwp : (isSeed ? (t.akmJwp || (yl * divider)) : (yl * divider));
    const syl = jwp > 0 ? Math.round(akmPjl / jwp) : 0;

    // YL < 250 & YL < 300 (murni dari input riil atau baseline spreadsheet resmi)
    const l250 = lastRec?.l250 ?? t.l250 ?? 0;
    const l300 = lastRec?.l300 ?? t.l300 ?? 0;
    const pctL250 = yl > 0 ? l250 / yl : 0;
    const pctL300 = yl > 0 ? l300 / yl : 0;

    return {
      tku: t,
      rawIdx,
      yo,
      om,
      os,
      yt,
      akmPjl,
      rata2,
      vsLwPct,
      diffLw,
      lwCur,
      lwPrev,
      vsTgPct,
      diffTg,
      vsLmPct,
      diffLm,
      vsLyPct,
      diffLy,
      akmBb,
      pctBb,
      akmPdm,
      jwp,
      syl,
      absen: finalAbsen,
      frek: finalFrek,
      area,
      yl,
      cover,
      l250,
      pctL250,
      l300,
      pctL300
    };
  });

  const r1Rows = allRows.filter(r => r.tku.aktif && r.tku.rayon === 1);
  const r2Rows = allRows.filter(r => r.tku.aktif && r.tku.rayon === 2);

  const aggregateRows = (rows: EvaluasiRow[], label: string, rayon: 1 | 2): EvaluasiRow => {
    const yo = rows.reduce((s, r) => s + r.yo, 0);
    const om = rows.reduce((s, r) => s + r.om, 0);
    const os = rows.reduce((s, r) => s + r.os, 0);
    const yt = rows.reduce((s, r) => s + r.yt, 0);
    const akmPjl = yo + om + os + yt;
    const rata2 = divider > 0 ? akmPjl / divider : 0;

    const tgHarian = rows.reduce((s, r) => s + r.tku.targetHarian, 0);
    const vsTgPct = tgHarian > 0 ? rata2 / tgHarian : 0;
    const diffTg = akmPjl - tgHarian * divider;

    const lmHarian = rows.reduce((s, r) => s + (state.targetBulanLalu[r.rawIdx] || 0), 0);
    const vsLmPct = lmHarian > 0 ? rata2 / lmHarian : 0;
    const diffLm = akmPjl - lmHarian * divider;

    const lyHarian = rows.reduce((s, r) => s + (state.targetTahunLalu[r.rawIdx] || 0), 0);
    const vsLyPct = lyHarian > 0 ? rata2 / lyHarian : 0;
    const diffLy = akmPjl - lyHarian * divider;

    const akmBb = rows.reduce((s, r) => s + r.akmBb, 0);
    const pctBb = akmPjl + akmBb > 0 ? akmBb / (akmPjl + akmBb) : 0;
    const akmPdm = akmPjl + akmBb;
    const jwp = rows.reduce((s, r) => s + r.jwp, 0);
    const syl = jwp > 0 ? Math.round(akmPjl / jwp) : 0;
    const absen = rows.reduce((s, r) => s + r.absen, 0);
    const frek = rows.reduce((s, r) => s + r.frek, 0);
    const area = rows.reduce((s, r) => s + r.area, 0);
    const yl = rows.reduce((s, r) => s + r.yl, 0);
    const cover = area > 0 ? yl / area : 1.0;

    const l250 = rows.reduce((s, r) => s + r.l250, 0);
    const l300 = rows.reduce((s, r) => s + r.l300, 0);
    const pctL250 = yl > 0 ? l250 / yl : 0;
    const pctL300 = yl > 0 ? l300 / yl : 0;

    // vs LW total: berbobot jumlah botol (bukan rata-rata persen antar-TKU)
    const lwCur = rows.reduce((s, r) => s + r.lwCur, 0);
    const lwPrev = rows.reduce((s, r) => s + r.lwPrev, 0);
    const vsLwPct = lwPrev > 0 ? lwCur / lwPrev : null;
    const diffLw = lwPrev > 0 ? (lwCur - lwPrev) / 7 : null;

    const summaryTku: TkuItem = {
      id: 999,
      nama: label,
      rayon,
      targetHarian: tgHarian,
      penjualanAkm: [yo, om, os, yt],
      aktif: true
    };

    return {
      tku: summaryTku,
      rawIdx: -1,
      yo,
      om,
      os,
      yt,
      akmPjl,
      rata2,
      vsLwPct,
      diffLw,
      lwCur,
      lwPrev,
      vsTgPct,
      diffTg,
      vsLmPct,
      diffLm,
      vsLyPct,
      diffLy,
      akmBb,
      pctBb,
      akmPdm,
      jwp,
      syl,
      absen,
      frek,
      area,
      yl,
      cover,
      l250,
      pctL250,
      l300,
      pctL300
    };
  };

  const r1Total = aggregateRows(r1Rows, 'Total Rayon 1', 1);
  const r2Total = aggregateRows(r2Rows, 'Total Rayon 2', 2);
  const cabangTotal = aggregateRows(allRows.filter(r => r.tku.aktif), 'Total Cabang', 1);

  // Perhitungan Highlights Performa (mencantumkan semua TKU jika nilainya sama/seri)
  const activeOnly = allRows.filter(r => r.tku.aktif);

  const getTied = (
    rows: EvaluasiRow[],
    getter: (r: EvaluasiRow) => number,
    mode: 'max' | 'min' = 'max',
    eps = 1e-4
  ) => {
    if (rows.length === 0) return { name: '—', names: [], val: 0, rayon: 1 };
    const sorted = [...rows].sort((a, b) => mode === 'max' ? getter(b) - getter(a) : getter(a) - getter(b));
    const targetVal = getter(sorted[0]);
    const matched = sorted.filter(r => Math.abs(getter(r) - targetVal) <= eps);
    const names = matched.map(r => r.tku.nama);
    return {
      name: names.join(', '),
      names,
      val: targetVal,
      rayon: matched[0]?.tku.rayon || 1
    };
  };

  const topRataRes = getTied(activeOnly, r => r.rata2, 'max');
  const lowestRataRes = getTied(activeOnly, r => r.rata2, 'min');

  const validLwRows = activeOnly.filter(r => r.vsLwPct !== null);
  const topLwRes = validLwRows.length > 0 ? getTied(validLwRows, r => r.vsLwPct || 0, 'max') : null;

  const topTgRes = getTied(activeOnly, r => r.vsTgPct, 'max');
  const lowestTgRes = getTied(activeOnly, r => r.vsTgPct, 'min');

  const topLyRes = getTied(activeOnly, r => r.vsLyPct, 'max');
  const bestBbRes = getTied(activeOnly, r => r.pctBb, 'min');
  const topSylRes = getTied(activeOnly, r => r.syl, 'max');

  // Presensi terbaik: nilai absen terendah, lalu frekuensi terendah
  const minAbs = activeOnly.length > 0 ? Math.min(...activeOnly.map(r => r.absen)) : 0;
  const minAbsRows = activeOnly.filter(r => r.absen === minAbs);
  const minFrk = minAbsRows.length > 0 ? Math.min(...minAbsRows.map(r => r.frek)) : 0;
  const bestAbsenRows = minAbsRows.filter(r => r.frek === minFrk);
  const bestAbsenNames = bestAbsenRows.map(r => r.tku.nama);

  const bestCoverRes = getTied(activeOnly, r => r.cover, 'max');
  const bestL250Res = getTied(activeOnly, r => r.pctL250, 'min');

  const highlights: EvaluasiHighlights = {
    topRata: { name: topRataRes.name, names: topRataRes.names, val: topRataRes.val, rayon: topRataRes.rayon },
    topLw: topLwRes ? { name: topLwRes.name, names: topLwRes.names, pct: topLwRes.val, rayon: topLwRes.rayon } : null,
    topTg: { name: topTgRes.name, names: topTgRes.names, pct: topTgRes.val, rayon: topTgRes.rayon },
    topLy: { name: topLyRes.name, names: topLyRes.names, pct: topLyRes.val, rayon: topLyRes.rayon },
    bestBb: { name: bestBbRes.name, names: bestBbRes.names, pct: bestBbRes.val, rayon: bestBbRes.rayon },
    topSyl: { name: topSylRes.name, names: topSylRes.names, val: topSylRes.val, rayon: topSylRes.rayon },
    bestAbsen: { 
      name: bestAbsenNames.join(', '), 
      names: bestAbsenNames, 
      abs: minAbs, 
      frk: minFrk, 
      rayon: bestAbsenRows[0]?.tku.rayon || 1 
    },
    bestCover: { name: bestCoverRes.name, names: bestCoverRes.names, pct: bestCoverRes.val, rayon: bestCoverRes.rayon },
    bestL250: { name: bestL250Res.name, names: bestL250Res.names, pct: bestL250Res.val, rayon: bestL250Res.rayon },
    lowestRata: { name: lowestRataRes.name, names: lowestRataRes.names, val: lowestRataRes.val, rayon: lowestRataRes.rayon },
    lowestTg: { name: lowestTgRes.name, names: lowestTgRes.names, pct: lowestTgRes.val, rayon: lowestTgRes.rayon }
  };

  return {
    allRows,
    r1Rows,
    r2Rows,
    r1Total,
    r2Total,
    cabangTotal,
    highlights
  };
}
