import React, { useState } from 'react';
import {  
  TrendingUp, 
  Award, 
  Calendar, 
  Target
} from 'lucide-react';
import { AppState, VARIANTS, DailySalesRecord } from '../types';
import { 
  formatNumber, formatDecimal, truncFixed, 
  formatPercent, 
  formatDiff, 
  getStatusClass,
  getBbStatusClass,
  formatDateIndo,
  getPembagiHari,
  getAutoSalesDay,
  isPembagiManual,
  getPeriodInfo,
  getSeedDailyBranchTotal,
  SEED_PERIOD
} from '../services/storage';
import { TrendChart } from '../components/TrendChart';
import { PeringkatTkuTable } from '../components/PeringkatTkuTable';
import { hitungPeringkat, hitungSkorTku, PeringkatInput } from '../services/peringkat';

const fmtPoin = (n: number | null | undefined) =>
  n === null || n === undefined || !isFinite(n) ? '—' : n.toFixed(1).replace('.', ',');

interface DashboardViewProps {
  state: AppState;
  onUpdateRayon: (rayon: number) => void;
  onUpdatePembagiHari?: () => void;
  onUpdateActiveDay?: (day: number) => void;
  /** Pilih tanggal pembagi rata2 (null = kembali otomatis ke tanggal transaksi terakhir) */
  onSetPembagiManual?: (day: number | null) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  state, 
  onUpdateRayon,
  onUpdatePembagiHari,
  onUpdateActiveDay,
  onSetPembagiManual
}) => {
  const [rankingCriteria, setRankingCriteria] = useState<'gabungan' | 'target' | 'bulanLalu' | 'tahunLalu'>('gabungan');
  const [rekapTab, setRekapTab] = useState<'penjualan' | 'kondisi' | 'peringkat'>('penjualan');

  const selectedRayon = state.selectedRayon; // 0: Cabang, 1: Rayon 1, 2: Rayon 2
  const day = state.currentDayNum;
  const divider = getPembagiHari(state);
  const manualDivider = isPembagiManual(state);
  const autoDivider = getAutoSalesDay(state);
  const dividerLabel = manualDivider ? 'Tanggal Update (manual)' : 'Tanggal Update';
  // Info bulan kerja (tidak lagi di-hard-code September 2026)
  const period = getPeriodInfo(state);
  const isSeed = period.key === SEED_PERIOD;
  const MD = period.daysInMonth;
  const SUNDAYS = Array.from({ length: MD }, (_, i) => i + 1).filter(x => new Date(period.year, period.monthIndex, x).getDay() === 0);

  // Filter TKUs based on selected Rayon
  const filteredTkus = state.tkus.filter(t => {
    if (!t.aktif) return false;
    if (selectedRayon === 0) return true;
    return t.rayon === selectedRayon;
  });

  // Aggregated sales totals
  const totalTarget = filteredTkus.reduce((acc, t) => acc + t.targetHarian, 0);
  const variantSums = [0, 0, 0, 0];
  let totalSold = 0;

  filteredTkus.forEach(t => {
    t.penjualanAkm.forEach((val, i) => {
      variantSums[i] += val;
      totalSold += val;
    });
  });

  const maxVariant = Math.max(1, ...variantSums);

  // Targets comparison
  const blSum = filteredTkus.reduce((acc, t) => {
    const rawIdx = state.tkus.indexOf(t);
    return acc + (state.targetBulanLalu[rawIdx] || 0);
  }, 0);

  const tySum = filteredTkus.reduce((acc, t) => {
    const rawIdx = state.tkus.indexOf(t);
    return acc + (state.targetTahunLalu[rawIdx] || 0);
  }, 0);

  // Persentase membandingkan rata-rata harian; selisih adalah gap akumulasi terhadap target s/d tanggal update.
  const avgPerDay = totalSold / divider;
  const targetDiff = totalSold - totalTarget * divider;
  const targetPct = avgPerDay / (totalTarget || 1);

  const blDiff = totalSold - blSum * divider;
  const blPct = avgPerDay / (blSum || 1);

  const tyDiff = totalSold - tySum * divider;
  const tyPct = avgPerDay / (tySum || 1);
  const formatAkmDiffPair = (diff: number) =>
    `${formatDiff(diff)}/${formatDiff(Math.trunc(diff / Math.max(1, divider)))}`;

  // 1. Area & Yakult Lady (YL) & Coverage Area
  const totalArea = filteredTkus.reduce((a, t) => a + (t.jumlahArea || 10), 0);
  const totalYl = filteredTkus.reduce((a, t) => a + (t.jumlahYl || 10), 0);
  const coverageAreaPct = totalArea > 0 ? (totalYl / totalArea) : 1;
  const vacantArea = Math.max(0, totalArea - totalYl);

  // 2. Presensi & Absensi YL & Akumulasi JWP terupdate dari pjd dan todayInputs
  let totalAbsenSpreadsheet = 0;
  let totalFrekSpreadsheet = 0;
  let totalJwpSpreadsheet = 0;

  filteredTkus.forEach(t => {
    const rawIdx = state.tkus.indexOf(t);
    let lastRec: DailySalesRecord | null = null;
    let latestAbsen = t.absenYl ?? 0;
    let latestFrek = t.frekuensiAbsen ?? 0;

    for (let d = 1; d <= day; d++) {
      const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
      const rec = state.pjd[dStr]?.[rawIdx] || (d === day ? state.todayInputs[rawIdx] : null);
      if (rec) {
        if (rec.absen !== undefined) latestAbsen = Number(rec.absen) || 0;
        if (rec.frek !== undefined) latestFrek = Number(rec.frek) || 0;
        lastRec = rec;
      }
    }

    const tkuYl = t.jumlahYl || 10;
    // JWP diisi manual oleh masing-masing TKU; admin hanya menjumlahkan (t.akmJwp)
    const effectiveTkuJwp = t.akmJwp || 0;

    totalAbsenSpreadsheet += latestAbsen;
    totalFrekSpreadsheet += latestFrek;
    totalJwpSpreadsheet += effectiveTkuJwp;
  });

  const ewpPct = totalJwpSpreadsheet > 0 ? ((totalJwpSpreadsheet - totalFrekSpreadsheet) / totalJwpSpreadsheet) * 100 : 0;

  // 3. Akumulasi BB
  let totalAkmBb = 0;
  let todayBb = 0;
  for (let d = 1; d <= day; d++) {
    const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
    const dayMap = state.pjd[dStr] || {};
    filteredTkus.forEach(t => {
      const rawIdx = state.tkus.indexOf(t);
      const rec = dayMap[rawIdx];
      const recBb = rec?.bb !== undefined ? rec.bb : (d === day ? (state.todayInputs[rawIdx]?.bb || 0) : 0);
      totalAkmBb += recBb;
      if (d === day) {
        todayBb += (state.todayInputs[rawIdx]?.bb || rec?.bb || 0);
      }
    });
  }

  // Fallback / pembanding BB: hanya untuk bulan data resmi (September 2026) jika pjd belum terisi
  if (isSeed && totalAkmBb === 0) {
    const baseTkuBbSum = filteredTkus.reduce((sum, t) => {
      const bbArr = t.bbAkm || [0, 0, 0, 0];
      return sum + (Number(bbArr[0]) + Number(bbArr[1]) + Number(bbArr[2]) + Number(bbArr[3]));
    }, 0);
    totalAkmBb = baseTkuBbSum;
  }

  // Rasio BB = BB ÷ (Penjualan + BB), sama dengan tabel Dashboard, Evaluasi, dan Breakdown
  const bbPercent = (totalSold + totalAkmBb) > 0 ? (totalAkmBb / (totalSold + totalAkmBb)) : 0;
  const totalAkmPdm = totalSold + totalAkmBb;
  const avgPdmPerDay = divider > 0 ? (totalAkmPdm / divider) : 0;

  // 4. Produktivitas s/YL per JWP (JWP)
  const totalL250 = filteredTkus.reduce((a, t) => a + (t.l250 ?? 0), 0);
  const totalL300 = filteredTkus.reduce((a, t) => a + (t.l300 ?? 0), 0);
  const pctTotalL250 = totalYl > 0 ? totalL250 / totalYl : 0;
  const pctTotalL300 = totalYl > 0 ? totalL300 / totalYl : 0;
  const sylVal = totalJwpSpreadsheet > 0 ? (totalSold / totalJwpSpreadsheet) : 0;

  // Daily points calculation for Chart
  const r1TodaySold = [0, 1, 2, 3, 4].reduce((a, idx) => a + (state.todayInputs[idx]?.sold || 0), 0);
  const r2TodaySold = [5, 6, 7, 8, 9].reduce((a, idx) => a + (state.todayInputs[idx]?.sold || 0), 0);
  const cabangTodaySold = r1TodaySold + r2TodaySold;
  const todaySoldForView = selectedRayon === 1 ? r1TodaySold : selectedRayon === 2 ? r2TodaySold : cabangTodaySold;

  const getRayonRatio = (d: number, rayon: number): number => {
    if (rayon === 0) return 1.0;
    let r1Ratio = 0.4803;
    if (d >= 8 && d <= 14) r1Ratio = 0.5079;
    else if (d >= 15 && d <= 21) r1Ratio = 0.4777;
    else if (d >= 22) r1Ratio = 0.4250;
    return rayon === 1 ? r1Ratio : (1 - r1Ratio);
  };

  // Penjualan per tanggal diambil dari data harian yang tersimpan (pjd) - sama dengan menu Penjualan Harian.
  // Angka dasar spreadsheet (seed) hanya dipakai sebagai cadangan jika tanggal itu belum punya data pjd.
  const getPjdDaySold = (d: number): number | null => {
    const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
    const dayMap = state.pjd[dStr];
    if (!dayMap) return null;
    let sum = 0;
    let has = false;
    state.tkus.forEach((t, idx) => {
      if (!t.aktif) return;
      if (selectedRayon !== 0 && t.rayon !== selectedRayon) return;
      const rec = dayMap[idx];
      if (rec && rec.sold !== undefined) {
        sum += rec.sold || 0;
        has = true;
      }
    });
    return has ? sum : null;
  };

  const dailyPoints: { day: number; val: number }[] = [];
  for (let d = 1; d <= day; d++) {
    let val = 0;
    const fromPjd = getPjdDaySold(d);
    if (d === day) {
      val = todaySoldForView > 0 ? todaySoldForView : (fromPjd ?? 0);
    } else if (fromPjd !== null) {
      val = fromPjd;
    } else {
      const baseCabang = getSeedDailyBranchTotal(state, d);
      if (selectedRayon === 0) {
        val = baseCabang;
      } else {
        val = baseCabang > 0 ? Math.round(baseCabang * getRayonRatio(d, selectedRayon)) : 0;
      }
    }
    dailyPoints.push({ day: d, val });
  }

  const activeYear = period.year;
  const activeMonth = period.monthIndex;

  // Day Multiplier Calculation
  // For Monday or after holiday/no transaction: multiplier counts consecutive non-transaction days + 1.
  // Looks back across the month boundary into previous month (e.g. Day 1 is Monday -> Sunday prev month was off -> multiplier is 2).
  const getDayMultiplier = (d: number): number => {
    const curDate = new Date(activeYear, activeMonth, d);
    if (curDate.getDay() === 0) return 0; // Holiday (Sunday)

    let skipped = 0;
    for (let step = 1; step <= 7; step++) {
      const prevDate = new Date(activeYear, activeMonth, d - step);
      const prevIsSun = prevDate.getDay() === 0;

      if (d - step >= 1) {
        const prevD = d - step;
        // Tanggal sebelumnya dianggap "dilewati" jika Minggu atau tidak ada transaksi
        const prevVal = prevD <= day ? (dailyPoints[prevD - 1]?.val || 0) : 0;

        if (prevIsSun || prevVal === 0) {
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

  // Active contiguous day segments (excluding Sundays) for drawing trend reference polylines
  const activeSegments: number[][] = [];
  let currentActSeg: number[] = [];
  for (let d = 1; d <= MD; d++) {
    const isSun = new Date(period.year, period.monthIndex, d).getDay() === 0;
    if (!isSun) {
      currentActSeg.push(d);
    } else {
      if (currentActSeg.length > 0) {
        activeSegments.push(currentActSeg);
        currentActSeg = [];
      }
    }
  }
  if (currentActSeg.length > 0) {
    activeSegments.push(currentActSeg);
  }

  // Perhitungan BB harian riil dari data transaksi unit TKU yang terfilter
  const getDayBb = (d: number): number => {
    const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
    const dayMap = state.pjd[dStr];
    let sum = 0;
    let hasData = false;
    if (dayMap) {
      filteredTkus.forEach(t => {
        const rawIdx = state.tkus.indexOf(t);
        const rec = dayMap[rawIdx];
        if (rec && rec.bb !== undefined) {
          sum += Number(rec.bb) || 0;
          hasData = true;
        }
      });
    }
    if (d === day && !hasData) {
      filteredTkus.forEach(t => {
        const rawIdx = state.tkus.indexOf(t);
        sum += Number(state.todayInputs[rawIdx]?.bb) || 0;
      });
      return sum;
    }
    if (hasData) return sum;
    if (isSeed && state.bbHarian?.[d]) {
      const rayonTkus = filteredTkus;
      const totalTkus = state.tkus.filter(x => x.aktif).length || 10;
      return selectedRayon === 0
        ? state.bbHarian[d]
        : Math.round(state.bbHarian[d] * (rayonTkus.length / totalTkus));
    }
    return 0;
  };

  const segments: [number, number][][] = [];
  let currentSegment: [number, number][] = [];

  dailyPoints.forEach(({ day: d, val: v }) => {
    if (v > 0) {
      currentSegment.push([d, v]);
    } else {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    }
  });
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  // Input skor peringkat per TKU (dipakai tab Penjualan, Kondisi TKU, dan Peringkat)
  const buildPeringkatInput = (r: {
    t: { id: number | string; nama: string; rayon?: number };
    avg: number; tg: number; ty: number; bl: number; pctBb: number;
    abs: number; yl: number; frk: number; area: number;
  }): PeringkatInput => ({
    id: r.t.id,
    nama: r.t.nama,
    rayon: r.t.rayon,
    aktual: r.avg,
    target: r.tg,
    tahunLalu: r.ty,
    bulanLalu: r.bl,
    persenBb: r.pctBb * 100,
    absen: r.abs,
    totalYl: r.yl,
    frekHariKosong: r.frk,
    tanggal: divider,
    ylAktual: r.yl,
    standarArea: r.area,
  });

  // TKU Ranking rows with 3 targets + combined average ranking
  const rankedTkus = [...filteredTkus].map(t => {
    const rawIdx = state.tkus.indexOf(t);
    const akm = t.penjualanAkm.reduce((a, b) => a + b, 0);
    const avg = akm / divider;

    const tg = t.targetHarian;
    const diffTg = akm - tg * divider;
    const pctTg = tg > 0 ? avg / tg : 0;

    const bl = state.targetBulanLalu[rawIdx] || 0;
    const diffBl = akm - bl * divider;
    const pctBl = bl > 0 ? avg / bl : 0;

    const ty = state.targetTahunLalu[rawIdx] || 0;
    const diffTy = akm - ty * divider;
    const pctTy = ty > 0 ? avg / ty : 0;

    const validCount = (tg > 0 ? 1 : 0) + (bl > 0 ? 1 : 0) + (ty > 0 ? 1 : 0) || 1;
    const pctGabungan = (pctTg + pctBl + pctTy) / validCount;

    // Operational metrics per TKU
    const inp = state.todayInputs[rawIdx];
    const area = t.jumlahArea || 10;
    const yl = t.jumlahYl || 10;
    const cover = area > 0 ? (yl / area) : 1;
    const abs = inp?.absen !== undefined ? inp.absen : (t.absenYl !== undefined ? t.absenYl : 0);
    const frk = inp?.frek !== undefined ? inp.frek : (t.frekuensiAbsen !== undefined ? t.frekuensiAbsen : 0);
    const jwp = t.akmJwp || 0;
    const s_yl = jwp > 0 ? Math.floor(akm / jwp) : (t.sYl || 0);

    // Hitung akumulasi BB dan % BB untuk TKU ini secara riil (tanpa proration buatan)
    let tkuAkmBb = 0;
    for (let d = 1; d <= day; d++) {
      const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
      const rec = state.pjd[dStr]?.[rawIdx];
      const recBb = rec?.bb !== undefined ? rec.bb : (d === day ? (state.todayInputs[rawIdx]?.bb || 0) : 0);
      tkuAkmBb += recBb;
    }
    // Jika bulan data resmi (September 2026) dan pjd belum mencatat BB harian, gunakan base bbAkm dari data resmi TKU
    if (isSeed && tkuAkmBb === 0) {
      const bbArr = t.bbAkm || [0, 0, 0, 0];
      tkuAkmBb = (Number(bbArr[0]) || 0) + (Number(bbArr[1]) || 0) + (Number(bbArr[2]) || 0) + (Number(bbArr[3]) || 0);
    }
    const pctBb = (akm + tkuAkmBb) > 0 ? (tkuAkmBb / (akm + tkuAkmBb)) : 0;

    const skor = hitungSkorTku(buildPeringkatInput({ t, avg, tg, ty, bl, pctBb, abs, yl, frk, area }));

    return {
      t,
      rawIdx,
      skor,
      akm,
      avg,
      akmBb: tkuAkmBb,
      pctBb,
      tg,
      diffTg,
      pctTg,
      bl,
      diffBl,
      pctBl,
      ty,
      diffTy,
      pctTy,
      pctGabungan,
      area,
      yl,
      cover,
      abs,
      frk,
      jwp,
      s_yl,
      l250: inp?.l250 ?? t.l250 ?? 0,
      l300: inp?.l300 ?? t.l300 ?? 0,
      pctL250: yl > 0 ? (inp?.l250 ?? t.l250 ?? 0) / yl : 0,
      pctL300: yl > 0 ? (inp?.l300 ?? t.l300 ?? 0) / yl : 0
    };
  }).sort((a, b) => {
    if (rankingCriteria === 'target') return b.pctTg - a.pctTg;
    if (rankingCriteria === 'bulanLalu') return b.pctBl - a.pctBl;
    if (rankingCriteria === 'tahunLalu') return b.pctTy - a.pctTy;
    // Gabungan = total poin penjualan (LY 30 + Target 25 + LM 20, termasuk bonus >100%)
    return b.skor.skorHasil - a.skor.skorHasil || b.skor.total - a.skor.total;
  });

  const getActivePct = (row: typeof rankedTkus[0]) => {
    if (rankingCriteria === 'target') return row.pctTg;
    if (rankingCriteria === 'bulanLalu') return row.pctBl;
    if (rankingCriteria === 'tahunLalu') return row.pctTy;
    return row.skor.skorHasil;
  };

  const maxRankPct = Math.max(0.0001, ...rankedTkus.map(r => getActivePct(r)));

  // Peringkat TKU 130 poin (tab "Peringkat"): gabungan hasil penjualan + kondisi TKU
  const peringkatData = hitungPeringkat(rankedTkus.map(buildPeringkatInput), divider);

  return (
    <div className="space-y-6">
      {/* Top Bar with Segmented Rayon Controls & Pemilih Akun */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Dashboard
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {formatDateIndo(state.activeDate)} &bull; Cabang Jember
          </p>
          {/* Tanggal update = pembagi rata2 (JWP diisi manual TKU). Default: tanggal transaksi terakhir; admin bisa memilih tanggal lain. */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700">
              <Calendar className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span className="text-neutral-600 dark:text-neutral-400 font-medium">Tgl update (pembagi rata2):</span>
              <input
                type="date"
                value={`${period.key}-${String(divider).padStart(2, '0')}`}
                min={`${period.key}-01`}
                max={`${period.key}-${String(MD).padStart(2, '0')}`}
                disabled={!onSetPembagiManual}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v || !v.startsWith(period.key)) return;
                  const d = parseInt(v.slice(8, 10), 10);
                  if (!d || !onSetPembagiManual) return;
                  // Memilih tanggal yang sama dengan tanggal otomatis = kembali ke otomatis
                  onSetPembagiManual(d === autoDivider ? null : d);
                }}
                className="font-mono font-bold text-neutral-900 dark:text-neutral-100 bg-transparent border-0 p-0 focus:ring-0 text-xs"
              />
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${manualDivider ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'}`}>
              {manualDivider ? `Manual \u2022 ${divider} hari` : `Otomatis \u2022 ${divider} hari`}
            </span>
            {manualDivider && onSetPembagiManual && (
              <button
                type="button"
                onClick={() => onSetPembagiManual(null)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Kembali otomatis (tgl {autoDivider})
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Rayon Selector */}
          <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm shrink-0">
            {[
              { id: 0, label: 'Cabang' },
              { id: 1, label: 'Rayon 1' },
              { id: 2, label: 'Rayon 2' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => onUpdateRayon(r.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedRayon === r.id
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KARTU TERPADU: PERFORMA PENJUALAN & KONDISI OPERASIONAL */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 md:p-6 space-y-6">
        {/* Header Kartu */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-base md:text-lg leading-tight break-words font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              <span>Rekap Penjualan &amp; Kondisi TKU</span>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs px-2.5 py-1.5 rounded-xl font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400 border border-brand-200/60 dark:border-brand-900/40">
              {selectedRayon === 0 ? 'Seluruh Cabang' : `Rayon ${selectedRayon}`}
            </span>
          </div>
        </div>

        {/* Bagian 1: Realisasi */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-3">
            1. Realisasi
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1.1 Akumulasi Penjualan */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full">
              <div>
                <span className="text-xs font-medium text-neutral-500 block mb-1">Realisasi</span>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight break-words text-neutral-900 dark:text-neutral-100">
                  {formatNumber(totalSold)} <span className="text-xs font-sans font-normal text-neutral-400">btl</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <span className="text-neutral-500">Rata2/hr</span>
                <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                  {formatDecimal(avgPerDay)} btl
                </span>
              </div>
            </div>

            {/* 1.2 vs Target */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full">
              <div>
                <div className="flex items-start justify-between gap-2 text-neutral-500 mb-1 min-w-0">
                  <span className="text-xs font-medium">vs Target</span>
                  <Target className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                </div>
                <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight break-words ${getStatusClass(targetDiff)}`}>
                  {formatPercent(targetPct)}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <span className="text-neutral-500">Target: {formatDecimal(totalTarget)}/hr</span>
                <span className={`font-mono font-bold ${getStatusClass(targetDiff)}`}>
                  {formatAkmDiffPair(targetDiff)}
                </span>
              </div>
            </div>

            {/* 1.3 vs Bulan Lalu */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full">
              <div>
                <div className="flex items-start justify-between gap-2 text-neutral-500 mb-1 min-w-0">
                  <span className="text-xs font-medium">vs Bln Lalu</span>
                  <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                </div>
                <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight break-words ${getStatusClass(blDiff)}`}>
                  {formatPercent(blPct)}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <span className="text-neutral-500">LM: {formatNumber(blSum)}/hr</span>
                <span className={`font-mono font-bold ${getStatusClass(blDiff)}`}>
                  {formatAkmDiffPair(blDiff)}
                </span>
              </div>
            </div>

            {/* 1.4 vs Tahun Lalu */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full">
              <div>
                <div className="flex items-start justify-between gap-2 text-neutral-500 mb-1 min-w-0">
                  <span className="text-xs font-medium">vs Tahun Lalu</span>
                  <Award className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                </div>
                <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight break-words ${getStatusClass(tyDiff)}`}>
                  {formatPercent(tyPct)}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <span className="text-neutral-500">LY: {formatNumber(tySum)}/hr</span>
                <span className={`font-mono font-bold ${getStatusClass(tyDiff)}`}>
                  {formatAkmDiffPair(tyDiff)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bagian 2: Kondisi TKU */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-3">
            2. Kondisi TKU
          </span>
          <div className="grid gap-3 font-mono items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(9.5rem, 1fr))' }}>
            {/* 2.1 Jumlah YL */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
              <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 break-words">Jumlah YL</span>
              <span className="text-base md:text-lg leading-tight break-words font-bold text-neutral-900 dark:text-neutral-100">
                {totalYl} <span className="text-xs font-normal text-neutral-400 font-sans">/ {totalArea} area</span>
              </span>
              <span className="text-[10px] text-neutral-400 block mt-auto pt-1 leading-snug font-sans break-words" title={`Cover: ${formatPercent(coverageAreaPct)} ${vacantArea > 0 ? `(${vacantArea} kosong)` : ''}`}>
                Cover: {formatPercent(coverageAreaPct)} {vacantArea > 0 ? `(${vacantArea} ksg)` : ''}
              </span>
            </div>

            {/* 2.2 Absen */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
              <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 break-words">Absen</span>
              <span className="text-base md:text-lg leading-tight break-words font-bold text-neutral-900 dark:text-neutral-100">
                {totalAbsenSpreadsheet} <span className="text-xs font-normal text-neutral-400 font-sans">YL</span>
              </span>
              <span className="text-[10px] text-neutral-600 dark:text-neutral-300 block mt-auto pt-1 leading-snug font-sans break-words">
                Freq: <strong className="text-neutral-900 dark:text-neutral-100 font-mono font-bold">{totalFrekSpreadsheet}</strong>
              </span>
            </div>

            {/* 2.3 JWP */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
              <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 break-words">JWP</span>
              <span className="text-base md:text-lg leading-tight break-words font-bold text-sky-600 dark:text-sky-400">
                {formatNumber(totalJwpSpreadsheet)}
              </span>
              <span className="text-[10px] text-neutral-600 dark:text-neutral-300 block mt-auto pt-1 leading-snug font-sans break-words" title={`EWP: ${truncFixed(ewpPct, 1)}% ((${formatNumber(totalJwpSpreadsheet)} - ${totalFrekSpreadsheet}) ÷ ${formatNumber(totalJwpSpreadsheet)})`}>
                EWP: <strong className="text-neutral-900 dark:text-neutral-100 font-mono font-bold">{truncFixed(ewpPct, 1)}%</strong>
              </span>
            </div>

            {/* 2.4 s/YL (340: Akm Pjl / Akm JWP, 299 dihapus) */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
              <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 break-words">s/YL</span>
              <span className="text-base md:text-lg leading-tight break-words font-bold text-brand-600 dark:text-brand-400">
                {sylVal > 0 ? formatNumber(sylVal) : '—'} <span className="text-xs font-normal text-neutral-400 font-sans">btl</span>
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-auto pt-1 leading-snug font-sans break-words">
                Akm Pjl &divide; Akm JWP
              </span>
            </div>

            {/* 2.5 PDM */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
              <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 break-words">PDM</span>
              <span className="text-base md:text-lg leading-tight break-words font-bold text-indigo-600 dark:text-indigo-400">
                {formatNumber(totalAkmPdm)} <span className="text-xs font-normal text-neutral-400 font-sans">btl</span>
              </span>
              <span className="text-[10px] text-neutral-400 block mt-auto pt-1 leading-snug font-sans break-words">
                Rata2: {formatDecimal(avgPdmPerDay)}/hr
              </span>
            </div>

            {/* 2.6 BB */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between min-w-0 h-full overflow-hidden">
              <span className="text-[11px] leading-tight font-sans text-neutral-500 block mb-1 break-words">BB</span>
              <span className="text-base md:text-lg leading-tight break-words font-bold text-neutral-900 dark:text-neutral-100">
                {formatNumber(totalAkmBb)} <span className="text-xs font-normal text-neutral-400 font-sans">btl</span>
              </span>
              <span className="text-[10px] text-neutral-400 block mt-auto pt-1 leading-snug font-sans break-words">
                Rasio: <strong className={getBbStatusClass(bbPercent)}>{formatPercent(bbPercent)}</strong>
              </span>
            </div>
            {/* 2.7 YL < 250 */}
            <div className="p-3.5 rounded-2xl bg-red-50/60 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 flex flex-col justify-between min-w-0 h-full overflow-hidden">
              <span className="text-[11px] leading-tight font-sans text-red-700 dark:text-red-400 font-medium block mb-1 break-words">YL &lt; 250</span>
              <span className="text-base md:text-lg leading-tight break-words font-bold text-red-700 dark:text-red-400">
                {totalL250} <span className="text-xs font-normal text-red-500 font-sans">YL</span>
              </span>
              <span className="text-[10px] text-red-600 dark:text-red-400 block mt-auto pt-1 leading-snug font-sans break-words">
                Rasio: {formatPercent(pctTotalL250)}
              </span>
            </div>
            {/* 2.8 YL < 300 */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex flex-col justify-between min-w-0 h-full overflow-hidden">
              <span className="text-[11px] leading-tight font-sans text-amber-700 dark:text-amber-400 font-medium block mb-1 break-words">YL &lt; 300</span>
              <span className="text-base md:text-lg leading-tight break-words font-bold text-amber-700 dark:text-amber-400">
                {totalL300} <span className="text-xs font-normal text-amber-500 font-sans">YL</span>
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-auto pt-1 leading-snug font-sans break-words">
                Rasio: {formatPercent(pctTotalL300)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Variant Composition Grid */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden p-5">
        <div className="mb-4">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Komposisi Varian
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                <th className="py-2.5 px-4 font-semibold">Varian Produk</th>
                <th className="py-2.5 px-4 text-right font-semibold">Akumulasi</th>
                <th className="py-2.5 px-4 text-right font-semibold" title={`Rata-rata dihitung dengan pembagi ${divider} hari (${dividerLabel})`}>
                  Rata-rata/hari (÷{divider}hr)
                </th>
                <th className="py-2.5 px-4 text-right font-semibold">Porsi</th>
                <th className="py-2.5 px-4 font-semibold w-1/3">Diagram Rasio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
              {VARIANTS.map((v, idx) => {
                const val = variantSums[idx];
                const avg = val / divider;
                const portion = val / (totalSold || 1);
                const widthPct = (val / maxVariant) * 100;
                return (
                  <tr key={v.code} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs" style={{ color: v.color }}>
                          {v.code}
                        </span>
                        <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                          {v.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatNumber(val)}
                    </td>
                    <td className="py-3 px-4 text-right text-neutral-600 dark:text-neutral-300">
                      {formatDecimal(avg)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-neutral-700 dark:text-neutral-300">
                      {formatPercent(portion)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-full h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: v.color
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grafik Tren Penjualan Harian & Balik Botol */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-4 sm:p-6 space-y-4 min-w-0">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-600 shrink-0" />
            <span>Tren Penjualan</span>
          </h2>
        </div>
        <TrendChart
          salesUnit={5000}
          today={day}
          year={period.year}
          monthIndex={period.monthIndex}
          monthShort={period.namaBulanPendek}
          days={Array.from({ length: Math.min(day, MD) }, (_, i) => {
            const d = i + 1;
            const mult = getDayMultiplier(d);
            return {
              day: d,
              sold: d <= day ? (dailyPoints[d - 1]?.val || 0) : 0,
              target: mult > 0 ? totalTarget * mult : 0,
              lm: mult > 0 ? blSum * mult : 0,
              ly: mult > 0 ? tySum * mult : 0,
              bb: getDayBb(d),
              isSun: SUNDAYS.includes(d),
              mult,
            };
          })}
        />
      </div>

      {/* Master TKU Table: Rekap Penjualan (kondisi operasional lengkap ada di Evaluasi > Tabel Utuh) */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Peringkat TKU
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold">
                {rankedTkus.length} Unit
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Pilih tampilan tabel: Penjualan atau Kondisi TKU */}
            <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl shrink-0">
              {([['penjualan', 'Penjualan'], ['kondisi', 'Kondisi TKU'], ['peringkat', 'Peringkat Total']] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setRekapTab(id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    rekapTab === id
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Ranking Selector (hanya untuk tabel penjualan) */}
            {rekapTab === 'penjualan' && (
            <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-x-auto shrink-0 max-w-full">
              <button
                onClick={() => setRankingCriteria('gabungan')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  rankingCriteria === 'gabungan'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Gabungan
              </button>
              <button
                onClick={() => setRankingCriteria('target')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  rankingCriteria === 'target'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                vs Target
              </button>
              <button
                onClick={() => setRankingCriteria('bulanLalu')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  rankingCriteria === 'bulanLalu'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                vs Bln Lalu
              </button>
              <button
                onClick={() => setRankingCriteria('tahunLalu')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  rankingCriteria === 'tahunLalu'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                vs Th Lalu
              </button>
            </div>
            )}
          </div>
        </div>

        {/* TAB 1: PENJUALAN & TARGET */}
        {rekapTab === 'penjualan' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
                <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
                <th className="py-2.5 px-2 font-semibold">Rayon</th>
                <th className="py-2.5 px-3 text-right font-semibold">Akumulasi</th>
                <th className="py-2.5 px-3 text-right font-semibold" title={`Rata2 dihitung dengan pembagi ${divider} hari (${dividerLabel})`}>
                  Rata2/hr
                </th>
                <th className="py-2.5 px-3 text-right font-semibold text-amber-600 dark:text-amber-400 border-l border-neutral-200 dark:border-neutral-700">BB</th>
                <th className="py-2.5 px-2.5 text-right font-semibold text-amber-600 dark:text-amber-400">% BB<div className="text-[10px] font-normal text-neutral-400">poin</div></th>
                <th className="py-2.5 px-3 text-right font-semibold border-l border-neutral-200 dark:border-neutral-700">vs Target</th>
                <th className="py-2.5 px-3 text-right font-semibold">vs LM</th>
                <th className="py-2.5 px-3 text-right font-semibold">vs LY</th>
                <th className="py-2.5 px-3 text-right font-semibold">Poin Penjualan<div className="text-[10px] font-normal text-neutral-400">maks 75+</div></th>
                <th className="py-2.5 px-3 font-semibold w-28 text-left">Diagram Capaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
              {rankedTkus.map((row, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;

                const activeBarPct = getActivePct(row);
                const barWidth = Math.min(100, Math.max(10, (activeBarPct / maxRankPct) * 100));

                const barColor = rankingCriteria === 'bulanLalu'
                  ? 'bg-amber-500'
                  : rankingCriteria === 'tahunLalu'
                  ? 'bg-sky-500'
                  : 'bg-brand-600';

                return (
                  <tr key={row.t.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                        isTop1 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                          : isTop2
                          ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          : isTop3
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          : 'text-neutral-500'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                      {row.t.nama}
                    </td>

                    <td className="py-3 px-2 font-sans text-neutral-500">
                      R{row.t.rayon}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                      {formatNumber(row.akm)}
                    </td>

                    <td className="py-3 px-3 text-right text-neutral-600 dark:text-neutral-300">
                      {formatDecimal(row.avg)}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-400 border-l border-neutral-200 dark:border-neutral-700">
                      {formatNumber(row.akmBb)}
                    </td>

                    <td className={`py-3 px-2.5 text-right font-semibold ${getBbStatusClass(row.pctBb)}`}>
                      {formatPercent(row.pctBb)}
                      <div className="text-[10px] text-neutral-400 font-normal">{fmtPoin(row.skor.kategori.bb.poin)} poin</div>
                    </td>

                    <td className={`py-3 px-3 text-right border-l border-neutral-200 dark:border-neutral-700 ${
                      rankingCriteria === 'target' ? 'bg-brand-50/40 dark:bg-brand-950/20 font-bold' : ''
                    }`}>
                      <div className={getStatusClass(row.diffTg)}>
                        {formatPercent(row.pctTg)}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-normal">
                        {formatAkmDiffPair(row.diffTg)}
                      </div>
                      <div className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                        {fmtPoin(row.skor.kategori.target.poin)} poin
                      </div>
                    </td>

                    <td className={`py-3 px-3 text-right ${
                      rankingCriteria === 'bulanLalu' ? 'bg-amber-50/40 dark:bg-amber-950/20 font-bold' : ''
                    }`}>
                      <div className={getStatusClass(row.diffBl)}>
                        {formatPercent(row.pctBl)}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-normal">
                        {formatAkmDiffPair(row.diffBl)}
                      </div>
                      <div className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                        {fmtPoin(row.skor.kategori.mom.poin)} poin
                      </div>
                    </td>

                    <td className={`py-3 px-3 text-right ${
                      rankingCriteria === 'tahunLalu' ? 'bg-sky-50/40 dark:bg-sky-950/20 font-bold' : ''
                    }`}>
                      <div className={getStatusClass(row.diffTy)}>
                        {formatPercent(row.pctTy)}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-normal">
                        {formatAkmDiffPair(row.diffTy)}
                      </div>
                      <div className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                        {fmtPoin(row.skor.kategori.yoy.poin)} poin
                      </div>
                    </td>

                    <td className={`py-3 px-3 text-right ${
                      rankingCriteria === 'gabungan' ? 'bg-brand-50/40 dark:bg-brand-950/20 font-bold' : ''
                    }`}>
                      <div className={`font-bold ${getStatusClass(row.skor.skorHasil - 75)}`}>
                        {fmtPoin(row.skor.skorHasil)}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-normal font-sans">
                        LY + Target + LM
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-neutral-400 text-right mt-0.5">
                        {rankingCriteria === 'gabungan' ? `${fmtPoin(activeBarPct)} poin` : formatPercent(activeBarPct)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-neutral-300 dark:border-neutral-700 bg-neutral-100/70 dark:bg-neutral-800/70 font-mono text-xs font-bold text-neutral-900 dark:text-white">
              <tr>
                <td colSpan={3} className="py-3 px-3 font-sans text-center">
                  TOTAL {selectedRayon === 0 ? 'CABANG' : `RAYON ${selectedRayon}`}
                </td>
                <td className="py-3 px-3 text-right text-brand-600 dark:text-brand-400">
                  {formatNumber(rankedTkus.reduce((s, r) => s + r.akm, 0))}
                </td>
                <td className="py-3 px-3 text-right">
                  {formatDecimal(rankedTkus.reduce((s, r) => s + r.avg, 0))}
                </td>
                <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-400 border-l border-neutral-200 dark:border-neutral-700">
                  {formatNumber(rankedTkus.reduce((s, r) => s + r.akmBb, 0))}
                </td>
                <td className="py-3 px-2.5 text-right text-amber-600 dark:text-amber-400">
                  {formatPercent((() => {
                    const a = rankedTkus.reduce((s, r) => s + r.akm, 0);
                    const b = rankedTkus.reduce((s, r) => s + r.akmBb, 0);
                    return (a + b) > 0 ? b / (a + b) : 0;
                  })())}
                </td>
                <td colSpan={5} className="py-3 px-3 text-neutral-400 font-sans font-normal text-[11px] text-right">
                  {rankedTkus.length} Unit TKU
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        ) : rekapTab === 'peringkat' ? (
        /* TAB 3: PERINGKAT TKU (130 poin) */
        <PeringkatTkuTable data={peringkatData} tanggalUpdate={divider} />
        ) : (
        /* TAB 2: KONDISI TKU */
        <div className="overflow-x-auto">
          {(() => {
            const sum = (f: (r: typeof rankedTkus[0]) => number) => rankedTkus.reduce((a, r) => a + f(r), 0);
            const tArea = sum(r => r.area);
            const tYl = sum(r => r.yl);
            const tJwp = sum(r => r.jwp);
            const tAkm = sum(r => r.akm);
            const tL250 = sum(r => r.l250);
            const tL300 = sum(r => r.l300);
            const bd = 'border-l border-neutral-200 dark:border-neutral-700';
            const kondisiRows = [...rankedTkus].sort((a, b) => b.skor.skorKondisi - a.skor.skorKondisi);
            return (
              <table className="w-full text-left text-sm border-collapse min-w-[960px]">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                    <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
                    <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
                    <th className="py-2.5 px-2 font-semibold">Rayon</th>
                    <th className={`py-2.5 px-3 text-right font-semibold ${bd}`}>Area</th>
                    <th className="py-2.5 px-3 text-right font-semibold">YL</th>
                    <th className="py-2.5 px-3 text-right font-semibold">% Cover<div className="text-[10px] font-normal text-neutral-400">poin maks 15</div></th>
                    <th className={`py-2.5 px-3 text-right font-semibold text-sky-600 dark:text-sky-400 ${bd}`}>JWP</th>
                    <th className="py-2.5 px-3 text-right font-semibold">s/YL</th>
                    <th className={`py-2.5 px-3 text-right font-semibold ${bd}`}>Absen<div className="text-[10px] font-normal text-neutral-400">poin maks 10</div></th>
                    <th className="py-2.5 px-3 text-right font-semibold">Frek (EWP)<div className="text-[10px] font-normal text-neutral-400">poin maks 15</div></th>
                    <th className={`py-2.5 px-3 text-right font-semibold text-red-600 dark:text-red-400 ${bd}`}>&lt;250</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-red-600 dark:text-red-400">%&lt;250</th>
                    <th className={`py-2.5 px-3 text-right font-semibold text-amber-600 dark:text-amber-400 ${bd}`}>&lt;300</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">%&lt;300</th>
                    <th className={`py-2.5 px-3 text-right font-semibold text-brand-600 dark:text-brand-400 ${bd}`}>Skor Kondisi<div className="text-[10px] font-normal text-neutral-400">maks 55</div></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                  {kondisiRows.map((row, idx) => (
                    <tr key={row.t.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-3 text-center text-neutral-500">{idx + 1}</td>
                      <td className="py-3 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">{row.t.nama}</td>
                      <td className="py-3 px-2 font-sans text-neutral-500">R{row.t.rayon}</td>
                      <td className={`py-3 px-3 text-right ${bd}`}>{row.area}</td>
                      <td className="py-3 px-3 text-right">{row.yl}</td>
                      <td className={`py-3 px-3 text-right font-bold ${row.cover >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{formatPercent(row.cover)}<div className="text-[10px] text-neutral-400 font-normal">{fmtPoin(row.skor.kategori.area.poin)} poin</div></td>
                      <td className={`py-3 px-3 text-right text-sky-600 dark:text-sky-400 ${bd}`}>{formatNumber(row.jwp)}</td>
                      <td className="py-3 px-3 text-right font-bold text-brand-600 dark:text-brand-400">{row.s_yl > 0 ? formatNumber(row.s_yl) : '—'}</td>
                      <td className={`py-3 px-3 text-right ${bd}`}>{row.abs > 0 ? <span className="font-bold text-red-600 dark:text-red-400">{row.abs}</span> : <span className="text-neutral-400">0</span>}<div className="text-[10px] text-neutral-400 font-normal">{fmtPoin(row.skor.kategori.absen.poin)} poin</div></td>
                      <td className="py-3 px-3 text-right">{row.frk > 0 ? <span className="font-bold text-red-600 dark:text-red-400">{row.frk}</span> : <span className="text-neutral-400">0</span>}<div className="text-[10px] text-neutral-400 font-normal">{row.skor.kategori.ewp.nilai !== null ? `${row.skor.kategori.ewp.nilai.toFixed(2).replace('.', ',')}% · ` : ''}{fmtPoin(row.skor.kategori.ewp.poin)} poin</div></td>
                      <td className={`py-3 px-3 text-right text-red-600 dark:text-red-400 ${bd}`}>{row.l250}</td>
                      <td className="py-3 px-3 text-right font-semibold text-red-600 dark:text-red-400">{formatPercent(row.pctL250)}</td>
                      <td className={`py-3 px-3 text-right text-amber-600 dark:text-amber-400 ${bd}`}>{row.l300}</td>
                      <td className="py-3 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">{formatPercent(row.pctL300)}</td>
                      <td className={`py-3 px-3 text-right font-bold text-brand-600 dark:text-brand-400 ${bd}`}>{fmtPoin(row.skor.skorKondisi)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-neutral-300 dark:border-neutral-700 bg-neutral-100/70 dark:bg-neutral-800/70 font-mono text-xs font-bold text-neutral-900 dark:text-white">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 font-sans text-center">
                      TOTAL {selectedRayon === 0 ? 'CABANG' : `RAYON ${selectedRayon}`}
                    </td>
                    <td className={`py-3 px-3 text-right ${bd}`}>{tArea}</td>
                    <td className="py-3 px-3 text-right">{tYl}</td>
                    <td className="py-3 px-3 text-right">{formatPercent(tArea > 0 ? tYl / tArea : 0)}</td>
                    <td className={`py-3 px-3 text-right text-sky-600 dark:text-sky-400 ${bd}`}>{formatNumber(tJwp)}</td>
                    <td className="py-3 px-3 text-right text-brand-600 dark:text-brand-400">{tJwp > 0 ? formatNumber(Math.floor(tAkm / tJwp)) : '—'}</td>
                    <td className={`py-3 px-3 text-right ${bd}`}>{sum(r => r.abs)}</td>
                    <td className="py-3 px-3 text-right">{sum(r => r.frk)}</td>
                    <td className={`py-3 px-3 text-right text-red-600 dark:text-red-400 ${bd}`}>{tL250}</td>
                    <td className="py-3 px-3 text-right text-red-600 dark:text-red-400">{formatPercent(tYl > 0 ? tL250 / tYl : 0)}</td>
                    <td className={`py-3 px-3 text-right text-amber-600 dark:text-amber-400 ${bd}`}>{tL300}</td>
                    <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-400">{formatPercent(tYl > 0 ? tL300 / tYl : 0)}</td>
                    <td className={`py-3 px-3 ${bd}`}></td>
                  </tr>
                </tfoot>
              </table>
            );
          })()}
        </div>
        )}
      </div>
    </div>
  );
};
