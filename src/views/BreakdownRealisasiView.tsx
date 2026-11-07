import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowLeftRight, ArrowUp, Calendar, ChevronDown, Download } from 'lucide-react';
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
  truncFixed
} from '../services/storage';

interface BreakdownRealisasiViewProps {
  state: AppState;
  onUpdateRayon: (rayon: number) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  // Dipertahankan agar pemanggil lama tidak error (tidak dipakai lagi: tanpa cut-off).
  onUpdatePembagiHari?: () => void;
  onUpdateActiveDay?: (day: number) => void;
  onUpdatePembagiKhususTku?: (tkuIdx: number, val: number | null) => void;
  onNavigateMenu?: (menu: string) => void;
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

// Warna varian (sama seperti menu Penjualan Harian): YO merah, OM kuning, OS pink, YT biru muda
const VCOL: Record<string, string> = {
  YO: 'text-red-600 dark:text-red-400',
  OM: 'text-amber-600 dark:text-amber-400',
  OS: 'text-pink-600 dark:text-pink-400',
  YT: 'text-sky-600 dark:text-sky-400',
  Total: 'text-neutral-900 dark:text-white font-extrabold'
};

// Warna latar lembut per blok kolom: [baris TKU, baris subtotal rayon]. Baris Total Cabang (gelap) tidak diberi.
const TINT: Record<string, [string, string]> = {
  acc: ['bg-brand-50/60 dark:bg-brand-950/25', 'bg-brand-100/70 dark:bg-brand-900/30'],
  avg: ['bg-indigo-50/60 dark:bg-indigo-950/25', 'bg-indigo-100/70 dark:bg-indigo-900/30'],
  wk: ['bg-sky-50/60 dark:bg-sky-950/20', 'bg-sky-100/70 dark:bg-sky-900/25'],
  pct: ['bg-amber-50/60 dark:bg-amber-950/20', 'bg-amber-100/70 dark:bg-amber-900/25'],
  diff: ['bg-emerald-50/60 dark:bg-emerald-950/20', 'bg-emerald-100/70 dark:bg-emerald-900/25']
};

export const BreakdownRealisasiView: React.FC<BreakdownRealisasiViewProps> = ({
  state,
  onUpdateRayon,
  showToast,
  onNavigateMenu
}) => {
  const [tab, setTab] = useState<DataTab>('breakdown');
  const [viewMode, setViewMode] = useState<ViewMode>('bulanan');
  const [showKondisiTku, setShowKondisiTku] = useState<boolean>(true);
  const [showAnalisa, setShowAnalisa] = useState<boolean>(false);
  // Tombol panah: tampilkan rencana asli pada tanggal yang sudah tertutup realisasi (hanya lihat)
  const [showOrigPlan, setShowOrigPlan] = useState<boolean>(false);
  const isReal = tab === 'realisasi';
  const showPlanPast = !isReal && showOrigPlan;
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

  const getRecordFor = (dateStr: string, tkuIdx: number): DailySalesRecord | null => {
    if (state.pjd[dateStr] && state.pjd[dateStr][tkuIdx]) return state.pjd[dateStr][tkuIdx];
    if (dateStr === state.activeDate && state.todayInputs[tkuIdx]) return state.todayInputs[tkuIdx];
    return null;
  };

  // Cek apakah satu TKU pada tanggal d benar-benar memiliki data penjualan tersimpan
  const hasSavedSalesFor = (d: number, tkuIdx: number): boolean => {
    const rec = getRecordFor(isoDate(d), tkuIdx);
    return Boolean(rec && (rec.sold > 0 || (rec.v && rec.v.some(x => x > 0))));
  };

  // Penjualan harian satu TKU pada tanggal d: [YO, OM, OS, YT] (hanya dari data riil tersimpan)
  const getSales = (tkuIdx: number, d: number): number[] => {
    const t = state.tkus[tkuIdx];
    if (!t || !t.aktif) return [0, 0, 0, 0];
    const rec = getRecordFor(isoDate(d), tkuIdx);
    if (rec && rec.v) return [0, 1, 2, 3].map(i => rec.v[i] || 0);
    return [0, 0, 0, 0];
  };

  // Rencana breakdown satu TKU pada tanggal d: [YO, OM, OS, YT]
  const getPlan = (tkuIdx: number, d: number): number[] => {
    const t = state.tkus[tkuIdx];
    if (!t || !t.aktif) return [0, 0, 0, 0];
    // Hari Minggu libur (tidak ada transaksi): rencana breakdown selalu 0, sama seperti Realisasi.
    // Jika suatu Minggu ternyata ada penjualan tersimpan, angka riil tetap tampil (lihat salesByTku).
    if (dow(d) === 0) return [0, 0, 0, 0];
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
        const hasRealized = hasSavedSalesFor(d, idx);
        // Pada menu breakdown:
        // - Jika tanggal tsb SUDAH ada simpan penjualan: otomatis tampilkan hasil riil (getSales)
        // - Jika tanggal tsb BELUM ada simpan penjualan: TETAP TAMPILKAN RENCANA TARGET (getPlan)! Jangan hilang!
        // Pada menu realisasi:
        // - Tampilkan hasil riil, atau [0, 0, 0, 0] jika belum tersimpan
        // Tanggal yang sudah lewat (<= tanggal update) SELALU memakai realisasi, walaupun TKU itu 0 / belum input.
        // Rencana target hanya untuk tanggal yang belum datang (> tanggal update).
        const isPastDay = d <= updateDay;
        const val = isReal
          ? (hasRealized ? getSales(idx, d) : [0, 0, 0, 0])
          : ((hasRealized || isPastDay) ? getSales(idx, d) : getPlan(idx, d));
        arr.push(val);
      }
      map[idx] = arr;
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tkus, state.pjd, state.todayInputs, state.breakdown, state.breakdownPerVariant, state.activeDate, state.activePeriod, updateDay, daysInMonth, tab]);

  // Tanggal dianggap "Real" (tab Breakdown) bila minimal satu TKU aktif pada rayon yang tampil
  // sudah punya penjualan tersimpan, sehingga angka rencananya digantikan data realisasi.
  const isRealDate = (d: number): boolean =>
    d <= updateDay || state.tkus.some((t, i) =>
      t.aktif && (selectedRayon === 0 || t.rayon === selectedRayon) && hasSavedSalesFor(d, i)
    );

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
      // JWP diisi manual oleh TKU (t.akmJwp)
      o.jwp = t.akmJwp || 0;
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
      syl: o.jwp > 0 ? Math.floor(accSold / o.jwp) : null,
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

  // ---- Ringkasan vs Target / Bulan Lalu / Tahun Lalu (mengikuti Mingguan / Bulanan) ----
  // Mingguan = hanya hari pada minggu yang dipilih; Bulanan = tgl 1 s/d tanggal pengali (sama dengan tabel).
  // Selisih = total botol - (pembanding harian x jumlah hari), rata-rata = total / jumlah hari kalender.
  // TKU yang breakdown-nya belum diisi:
  //  - Mingguan: tidak ada rencana DAN tidak ada realisasi tersimpan di minggu terpilih.
  //  - Bulanan : tidak ada rencana (atau realisasi tersimpan) untuk hari yang belum datang (setelah tanggal update).
  const missingPlan = (() => {
    const pf = viewMode === 'mingguan' ? week.start : updateDay + 1;
    const pt = viewMode === 'mingguan' ? week.end : daysInMonth;
    const set = new Set<number>();
    if (pf > pt) return { set, pf, pt }; // tidak ada hari tersisa -> tidak ada yang dipermasalahkan
    allIdxs.forEach(i => {
      let ada = false;
      for (let d = pf; d <= pt && !ada; d++) if (hasSavedSalesFor(d, i) || getPlan(i, d).some(x => x > 0)) ada = true;
      if (!ada) set.add(i);
    });
    return { set, pf, pt };
  })();

  // ---- Keterangan "bd belum isi" per TKU (pintar, belajar dari riwayat) ----
  // - Hari libur cabang (hampir semua TKU kosong, mis. tanggal merah) dilewati.
  // - Pola hari kunjungan tiap TKU dipelajari dari minggu normal (tanpa libur & bukan minggu transisi sesudah libur).
  // - Minggu normal: ditandai bila ada hari kunjungan biasa yang kosong.
  // - Minggu libur / transisi / TKU tanpa pola: ditandai hanya bila kosong total di minggu itu.
  // - Minggu pendek di akhir bulan yang tidak memuat hari kunjungan TKU tidak ditandai (mis. DP genap yang tutup Sabtu).
  type BdGap = { key: string; nama: string; semua: boolean; minggu: number[] };
  const bdGaps: BdGap[] = (() => {
    const out: BdGap[] = [];
    if (isReal) return out;
    const aktifIdx = state.tkus.map((t, i) => (t.aktif ? i : -1)).filter(i => i >= 0);
    if (aktifIdx.length === 0) return out;
    const filled = (i: number, d: number): boolean => hasSavedSalesFor(d, i) || getPlan(i, d).some(x => x > 0);

    // 1) Deteksi hari libur cabang: hampir semua TKU kosong, tetapi minggu itu punya hari lain yang ramai
    const cnt: number[] = [0];
    for (let d = 1; d <= daysInMonth; d++) cnt.push(aktifIdx.filter(i => filled(i, d)).length);
    const isHoliday: boolean[] = new Array(daysInMonth + 1).fill(false);
    weeks.forEach(w => {
      const hari: number[] = [];
      for (let d = w.start; d <= w.end; d++) if (dow(d) !== 0) hari.push(d);
      if (!hari.some(d => cnt[d] > aktifIdx.length * 0.25)) return; // seluruh minggu kosong = belum diisi, bukan libur
      hari.forEach(d => { if (cnt[d] <= aktifIdx.length * 0.1) isHoliday[d] = true; });
    });
    const weekHasHoliday = weeks.map(w => {
      for (let d = w.start; d <= w.end; d++) if (isHoliday[d]) return true;
      return false;
    });
    // Minggu libur + 1 minggu sesudahnya = transisi (jadwal ganjil/genap bisa bergeser)
    const looseWeek = weeks.map((_w, k) => weekHasHoliday[k] || (k > 0 && weekHasHoliday[k - 1]));
    const learnWeeks = weeks.map((w, k) => k).filter(k => !looseWeek[k] && weeks[k].end - weeks[k].start + 1 >= 6);

    // 2) Pola hari kunjungan per TKU
    const pm = month === 1 ? 12 : month - 1;
    const py = month === 1 ? year - 1 : year;
    const dimPrev = new Date(year, month - 1, 0).getDate();
    const patternOf = (i: number): Set<number> => {
      const pat = new Set<number>();
      if (learnWeeks.length > 0) {
        const c = [0, 0, 0, 0, 0, 0, 0];
        learnWeeks.forEach(k => {
          for (let d = weeks[k].start; d <= weeks[k].end; d++) if (dow(d) !== 0 && filled(i, d)) c[dow(d)]++;
        });
        const need = Math.ceil(learnWeeks.length / 2);
        c.forEach((v, wd) => { if (wd !== 0 && v >= need && v > 0) pat.add(wd); });
      }
      if (pat.size === 0) { // cadangan: riwayat penjualan bulan lalu
        const c = [0, 0, 0, 0, 0, 0, 0];
        for (let d = 1; d <= dimPrev; d++) {
          const rec = state.pjd?.[`${py}-${String(pm).padStart(2, '0')}-${String(d).padStart(2, '0')}`]?.[i];
          if (rec && (rec.sold > 0 || (rec.v && rec.v.some(x => x > 0)))) c[new Date(py, pm - 1, d).getDay()]++;
        }
        c.forEach((v, wd) => { if (wd !== 0 && v >= 2) pat.add(wd); });
      }
      return pat;
    };

    // 3) Evaluasi tiap TKU yang tampil
    const check = viewMode === 'mingguan' ? [weekIdx] : weeks.map((_w, k) => k);
    allIdxs.forEach(i => {
      const nama = state.tkus[i].nama;
      let adaIsi = false;
      for (let d = 1; d <= daysInMonth && !adaIsi; d++) if (dow(d) !== 0 && filled(i, d)) adaIsi = true;
      if (!adaIsi) { out.push({ key: `g${i}`, nama, semua: true, minggu: [] }); return; }

      const pat = patternOf(i);
      const minggu: number[] = [];
      check.forEach(k => {
        const w = weeks[k];
        const len = w.end - w.start + 1;
        const cand: number[] = [];
        for (let d = w.start; d <= w.end; d++) if (dow(d) !== 0 && !isHoliday[d]) cand.push(d);
        if (cand.length === 0) return;
        const loose = looseWeek[k] || pat.size === 0;
        if (!loose) {
          const exp = cand.filter(d => pat.has(dow(d)));
          if (exp.some(d => !filled(i, d))) minggu.push(k + 1);
          return;
        }
        if (cand.some(d => filled(i, d))) return;
        if (pat.size === 0) { if (cand.length <= 2) return; }
        else if (len < 7 && !cand.some(d => pat.has(dow(d)))) return;
        minggu.push(k + 1);
      });
      if (minggu.length > 0) out.push({ key: `g${i}`, nama, semua: false, minggu });
    });
    return out;
  })();

  const fmtMinggu = (m: number[]): string => {
    const grp: string[] = [];
    let a = 0;
    while (a < m.length) {
      let b = a;
      while (b + 1 < m.length && m[b + 1] === m[b] + 1) b++;
      grp.push(b - a >= 2 ? `${m[a]}–${m[b]}` : m.slice(a, b + 1).join(' & '));
      a = b + 1;
    }
    return `Mgg ${grp.length > 1 ? `${grp.slice(0, -1).join(', ')} & ${grp[grp.length - 1]}` : grp[0]}`;
  };

  // Keterangan detail untuk Analisa: Mingguan = "bd kosong"; Bulanan = "bd kosong Mgg ..." (atau "bd kosong" bila sebulan penuh)
  const bdDetail = (nama: string): string | null => {
    const g = bdGaps.find(x => x.nama === nama);
    if (!g) return null;
    return g.semua || viewMode === 'mingguan' ? 'bd kosong' : `bd kosong ${fmtMinggu(g.minggu)}`;
  };

  const summary = (() => {
    const base = build(allIdxs);
    const from = viewMode === 'mingguan' ? week.start : 1;
    const to = viewMode === 'mingguan' ? (isReal ? Math.min(week.end, updateDay) : week.end) : n;
    const days = Math.max(0, to - from + 1);
    let total = 0;
    for (let d = from; d <= to; d++) total += (base.daily[d] || [0, 0, 0, 0]).reduce((a, b) => a + b, 0);
    const avg = days > 0 ? total / days : 0;
    const mk = (label: string, c: number) => ({
      label,
      has: c > 0 && days > 0,
      pct: c > 0 && days > 0 ? avg / c : null as number | null,
      diff: total - c * days
    });
    return {
      from, to, days, total, avg,
      items: [mk('vs Target', base.cmp.tg), mk('vs Bulan Lalu', base.cmp.bl), mk('vs Tahun Lalu', base.cmp.ty)]
    };
  })();

  // ---- Analisa: siapa yang mendekati / jauh dari Target & Th Lalu, dan berapa tambahan per YL per hari ----
  // Proyeksi = realisasi (s/d tanggal update) + rencana breakdown untuk hari yang belum datang.
  // Kekurangan = pembanding harian x jumlah hari periode - proyeksi. Mingguan = minggu terpilih; Bulanan = sebulan penuh.
  // Tambahan per YL per hari = kekurangan / sisa hari kerja (Sen-Sab) / jumlah YL. Dianalisa hanya bila realistis.
  // Mendekati (Mingguan & Bulanan sama): TKU biasa <= 2,5 btl/YL/hari; TKU dropping (DP) <= 5 btl/YL/kunjungan
  const MAX_PER_YL_HARI = 2.5;
  const MAX_PER_YL_KUNJ = 5;
  const isDropping = (i: number) => /^DP\b/i.test(state.tkus[i].nama.trim());
  const HEAVY_PCT = 0.10;   // tanda ⚠️ bila tambahan > 10% dari breakdown sisa
  type AnRow = { nama: string; pct: number; gap: number; perDay?: number; perYl?: number; heavy?: number | null; belumBd?: boolean; kunj?: number };
  const analisa = (() => {
    const from = viewMode === 'mingguan' ? week.start : 1;
    const to = viewMode === 'mingguan' ? week.end : daysInMonth;
    const D = to - from + 1;
    let rem = 0; // sisa hari kerja (Senin-Sabtu) setelah tanggal update
    for (let d = Math.max(from, updateDay + 1); d <= to; d++) if (dow(d) !== 0) rem++;
    const projDay = (i: number, d: number) =>
      ((hasSavedSalesFor(d, i) || d <= updateDay) ? getSales(i, d) : getPlan(i, d)).reduce((a, b) => a + b, 0);

    type Acc = { aman: number; dekat: AnRow[]; jauh: AnRow[]; tanpaBanding: number };
    const newAcc = (): Acc => ({ aman: 0, dekat: [], jauh: [], tanpaBanding: 0 });
    // Golongkan satu TKU: aman / mendekati / jauh (batas per YL: lihat MAX_PER_YL_HARI & MAX_PER_YL_KUNJ)
    // need = kebutuhan pembanding, P = proyeksi TKU pada periode yang sama
    const classify = (acc: Acc, i: number, need: number, P: number, planRem: number) => {
      const gap = need - P;
      const nama = state.tkus[i].nama;
      const pct = P / need;
      if (gap <= 0) { acc.aman++; return; }
      if (missingPlan.set.has(i)) { acc.jauh.push({ nama, pct, gap, belumBd: true }); return; } // breakdown kosong -> dihitung jauh
      const yl = state.tkus[i].jumlahYl || 10;
      if (isDropping(i)) {
        // TKU dropping (ganjil/genap): dihitung per KUNJUNGAN = jumlah tanggal sisa yang ada isi breakdown-nya
        let kunj = 0;
        for (let d = Math.max(from, updateDay + 1); d <= to; d++) if (projDay(i, d) > 0) kunj++;
        if (kunj > 0) {
          const perYl = gap / kunj / yl;
          if (perYl <= MAX_PER_YL_KUNJ) {
            acc.dekat.push({ nama, pct, gap, perYl, kunj, heavy: planRem > 0 ? gap / planRem : null });
            return;
          }
        }
      } else if (rem > 0) {
        const perYl = gap / rem / yl;
        if (perYl <= MAX_PER_YL_HARI) {
          acc.dekat.push({ nama, pct, gap, perDay: gap / rem, perYl, heavy: planRem > 0 ? gap / planRem : null });
          return;
        }
      }
      acc.jauh.push({ nama, pct, gap });
    };
    const finish = (label: string, acc: Acc) => {
      acc.dekat.sort((a, b) => a.gap - b.gap);
      acc.jauh.sort((a, b) => a.pct - b.pct);
      return { label, ...acc };
    };
    const planRemOf = (i: number) => {
      let r = 0;
      for (let d = Math.max(from, updateDay + 1); d <= to; d++) r += projDay(i, d);
      return r;
    };

    // vs Target / vs Th Lalu: seluruh periode (minggu terpilih atau sebulan)
    const make = (label: string, cOf: (i: number) => number) => {
      const acc = newAcc();
      allIdxs.forEach(i => {
        const c = cOf(i);
        if (c <= 0) { acc.tanpaBanding++; return; }
        let P = 0;
        for (let d = from; d <= to; d++) P += projDay(i, d);
        classify(acc, i, c * D, P, planRemOf(i));
      });
      return finish(label, acc);
    };

    // vs Minggu Lalu (hanya tampilan Mingguan): hari yang sama minggu lalu (tanggal - 7), hari libur dilewati
    const makeWeek = () => {
      const acc = newAcc();
      const aktifIdxs = state.tkus.map((t, i) => (t.aktif ? i : -1)).filter(i => i >= 0);
      const holiday = (d: number) => aktifIdxs.every(i => projDay(i, d) === 0);
      const pairDays: number[] = [];
      for (let d = week.start; d <= week.end; d++) if (d > 7 && !holiday(d) && !holiday(d - 7)) pairDays.push(d);
      allIdxs.forEach(i => {
        let cur = 0, prev = 0;
        pairDays.forEach(d => { cur += projDay(i, d); prev += projDay(i, d - 7); });
        if (pairDays.length === 0 || prev <= 0) { acc.tanpaBanding++; return; }
        classify(acc, i, prev, cur, planRemOf(i));
      });
      return finish('vs Minggu Lalu', acc);
    };

    return {
      from, to, rem,
      sets: [
        ...(viewMode === 'mingguan' ? [makeWeek()] : []),
        make('vs Target', i => state.tkus[i]?.targetHarian || 0),
        make('vs Th Lalu', i => state.targetTahunLalu[i] || 0)
      ]
    };
  })();
  const fmt1 = (x: number) => (Math.ceil(x * 10 - 1e-9) / 10).toLocaleString('id-ID');

  // ---- Ekspor CSV ----
  const handleExportCsv = () => {
    const head: string[] = ['Nama TKU'];
    shownDays.forEach(d => VCODES.forEach(v => head.push(`Tgl ${d} ${v}`)));
    VCODES.forEach(v => head.push(`Akumulasi ${v}`));
    head.push('Akumulasi Total');
    VCODES.forEach(v => head.push(`Rata-rata ${v}`));
    head.push('Rata-rata Total');
    if (showWeekCmp) head.push('% vs Minggu Lalu', 'Selisih vs Minggu Lalu (btl)');
    head.push('% vs Target', '% vs Bulan Lalu', '% vs Tahun Lalu');
    head.push('Selisih Botol vs Target', 'Selisih Botol vs Bulan Lalu', 'Selisih Botol vs Tahun Lalu');
    if (isReal) head.push('BB Akm', '% BB', 'PDM Akm', 'Absen Akm', 'Frek Akm', 'JWP', 's/YL', 'Jml YL', 'Jml Area', '% Cover Area');

    const lines = [head];
    rows.forEach(r => {
      const line: (string | number)[] = [r.label];
      shownDays.forEach(d => r.agg.daily[d].forEach(x => line.push(isReal && d > updateDay ? '' : x)));
      r.agg.acc.forEach(x => line.push(x));
      line.push(r.agg.accTotal);
      r.agg.avg.forEach(x => line.push(Math.floor(x)));
      line.push(Math.floor(r.agg.avgTotal));
      if (showWeekCmp) {
        const wc = weekCmp(r.agg);
        line.push(wc.pct === null ? '' : truncFixed((wc.pct * 100), 1) + '%', wc.diff === null ? '' : Math.trunc(wc.diff));
      }
      line.push(...[r.agg.pct.tg, r.agg.pct.bl, r.agg.pct.ty].map(p => (p === null ? '' : truncFixed((p * 100), 1) + '%')));
      line.push(Math.trunc(r.agg.diff.tg), Math.trunc(r.agg.diff.bl), Math.trunc(r.agg.diff.ty));
      if (isReal) {
        const o = opsOf(r.idxs, r.agg.accTotal);
        line.push(
          o.bb, o.pctBb === null ? '' : truncFixed((o.pctBb * 100), 1) + '%', o.pdm, o.absen, o.frek,
          o.jwp, o.syl === null ? '' : o.syl, o.yl, o.area, o.cover === null ? '' : truncFixed((o.cover * 100), 1) + '%'
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
  // Semua sel angka: ukuran & ketebalan sama
  const td = 'px-2 py-2 text-right font-mono text-xs font-bold whitespace-nowrap';

  const tint = (k: string, kind: TableRow['kind']) => (kind === 'tku' ? TINT[k][0] : kind === 'rayon' ? TINT[k][1] : '');
  // Latar kolom tanggal: Minggu = merah muda, tanggal genap = abu sangat tipis (pemisah antar tanggal)
  const dayTint = (d: number, kind: TableRow['kind']) => {
    if (kind === 'total') return '';
    if (dow(d) === 0) return kind === 'tku' ? 'bg-red-50/70 dark:bg-red-950/20' : 'bg-red-100/60 dark:bg-red-950/30';
    if (kind === 'tku' && d % 2 === 0) return 'bg-neutral-50 dark:bg-neutral-800/30';
    return '';
  };
  // Aksen warna per rayon: Rayon 1 biru, Rayon 2 ungu (garis di kiri nama TKU)
  const rayonOfRow = (r: TableRow): number =>
    r.kind === 'rayon' ? Number(r.key.slice(1)) : r.kind === 'tku' ? (state.tkus[r.idxs[0]]?.rayon || 0) : 0;
  const accentCls = (r: TableRow) => {
    const ry = rayonOfRow(r);
    return ry === 1 ? 'border-l-[3px] border-l-sky-500' : ry === 2 ? 'border-l-[3px] border-l-violet-500' : '';
  };
  const labelTone = (r: TableRow) => {
    if (r.kind !== 'rayon') return '';
    return rayonOfRow(r) === 1 ? 'text-sky-700 dark:text-sky-300' : 'text-violet-700 dark:text-violet-300';
  };
  // Warna teks aman untuk baris gelap (Total Cabang)
  const hue = (kind: TableRow['kind'], light: string, dark: string) => (kind === 'total' ? dark : light);

  // ---- Perbandingan dengan Minggu lalu (hari yang sama = tanggal - 7) ----
  // Hanya tab Breakdown & tampilan Mingguan. Tanggal 1-7 belum punya pembanding.
  const showWeekCmp = !isReal && viewMode === 'mingguan';
  const dayTotal = (a: Agg, d: number) => a.daily[d].reduce((x, y) => x + y, 0);

  // Hari libur = tidak ada transaksi sama sekali di SEMUA TKU aktif (mis. hari Minggu).
  // Hari libur tidak diberi tanda/warna dan tidak dipakai sebagai pembanding.
  const activeIdxs = state.tkus.map((t, i) => (t.aktif ? i : -1)).filter(i => i >= 0);
  const isHoliday = (d: number): boolean =>
    activeIdxs.every(i => (salesByTku[i]?.[d] || [0, 0, 0, 0]).every(x => !x));

  type Tone = 'up' | 'down' | 'same' | 'none';
  const toneOf = (diff: number | null): Tone => (diff === null ? 'none' : diff > 0 ? 'up' : diff < 0 ? 'down' : 'same');
  // Selisih satu tanggal vs tanggal yang sama minggu lalu (null jika salah satunya libur)
  const dayDiff = (a: Agg, d: number): number | null =>
    d > 7 && !isHoliday(d) && !isHoliday(d - 7) ? dayTotal(a, d) - dayTotal(a, d - 7) : null;
  // Total minggu yang ditampilkan vs hari-hari yang sama minggu lalu (hari libur dilewati)
  const weekCmp = (a: Agg) => {
    let cur = 0, prev = 0, any = false;
    shownDays.forEach(d => {
      if (d > 7 && !isHoliday(d) && !isHoliday(d - 7)) { any = true; cur += dayTotal(a, d); prev += dayTotal(a, d - 7); }
    });
    if (!any) return { pct: null as number | null, diff: null as number | null };
    return { pct: prev > 0 ? cur / prev : null, diff: cur - prev };
  };
  // Hari Minggu tanpa transaksi di semua TKU: kolomnya dipersempit (1 kolom, bukan 4 varian)
  const collapsedDay = (d: number): boolean => dow(d) === 0 && isHoliday(d);

  // Saat Mingguan: tabel otomatis bergeser ke hari pertama yang ada isinya
  const tableScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (viewMode !== 'mingguan') return;
    const box = tableScrollRef.current;
    if (!box) return;
    const first = shownDays.find(d => !collapsedDay(d));
    if (first === undefined) return;
    const dayTh = box.querySelector<HTMLElement>(`th[data-day="${first}"]`);
    const nameTh = box.querySelector<HTMLElement>('thead th');
    if (dayTh && nameTh) box.scrollTo({ left: Math.max(0, dayTh.offsetLeft - nameTh.offsetWidth), behavior: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, weekIdx, tab, selectedRayon]);

  // Ringkasan Breakdown Mingguan: total cabang/rayon vs hari yang sama minggu lalu
  const wkSummary = showWeekCmp ? weekCmp(build(allIdxs)) : null;
  const summaryItems = [
    ...summary.items,
    ...(wkSummary
      ? [{ label: 'vs Minggu Lalu', has: wkSummary.pct !== null && wkSummary.diff !== null, pct: wkSummary.pct, diff: wkSummary.diff ?? 0 }]
      : [])
  ];
  const toneText = (t: Tone, kind: TableRow['kind']) =>
    t === 'none'
      ? 'text-neutral-400'
      : kind === 'total'
        ? t === 'up' ? 'text-emerald-300' : t === 'down' ? 'text-red-300' : 'text-white'
        : t === 'up'
          ? 'text-emerald-600 dark:text-emerald-400'
          : t === 'down'
            ? 'text-red-600 dark:text-red-400'
            : 'text-neutral-900 dark:text-white';
  // Warna angka harian: hijau naik, merah turun; sama / libur = warna biasa
  const dayToneClass = (t: Tone) =>
    t === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : t === 'down'
        ? 'text-red-600 dark:text-red-400'
        : '';
  // Panah kecil di samping persen
  const TrendArrow: React.FC<{ tone: Tone }> = ({ tone }) =>
    tone === 'up'
      ? <ArrowUp className="w-3 h-3 shrink-0" strokeWidth={3} aria-label="naik" />
      : tone === 'down'
        ? <ArrowDown className="w-3 h-3 shrink-0" strokeWidth={3} aria-label="turun" />
        : null;

  const blocks = [
    { title: isReal ? 'Realisasi per Tanggal' : 'Rencana Breakdown per Tanggal', span: shownDays.reduce((sum, d) => sum + (collapsedDay(d) ? 1 : 4), 0), tone: 'text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800' },
    { title: 'Akumulasi', span: 5, tone: 'text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/30' },
    { title: 'Rata-rata', span: 5, tone: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30' },
    ...(showWeekCmp
      ? [{ title: 'Vs Minggu Lalu', span: 2, tone: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30' }]
      : []),
    { title: 'Vs Target / Bulan Lalu / Tahun Lalu', span: 3, tone: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30' },
    { title: 'Selisih Botol', span: 3, tone: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30' }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 sm:p-5 space-y-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        {/* Baris 1: judul (kiri) + ekspor (kanan) */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{isReal ? 'Realisasi' : 'Breakdown'}</h1>
            <p className="text-xs text-neutral-500 truncate">
              {monthName}{isReal ? ` • s/d Tgl ${updateDay}` : ''}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
          {!isReal && (
            <button
              type="button"
              onClick={() => setShowOrigPlan(v => !v)}
              aria-pressed={showOrigPlan}
              title={showOrigPlan ? 'Kembali menampilkan realisasi' : 'Lihat rencana asli pada tanggal yang sudah tertutup realisasi'}
              className={`inline-flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3.5 text-xs font-semibold rounded-xl border transition-colors ${
                showOrigPlan
                  ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>{showOrigPlan ? 'Realisasi' : 'Rencana Asli'}</span>
            </button>
          )}
          <button
            onClick={handleExportCsv}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3.5 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 transition-colors"
            title="Unduh tabel format CSV"
            aria-label="Ekspor CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Ekspor</span>
          </button>
          </div>
        </div>

        {/* Baris 2: kontrol. HP = 2 toggle sebaris + dropdown; tablet/desktop = semua satu baris */}
        <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:gap-3">
          {([
            {
              value: viewMode as string,
              onChange: (v: string) => setViewMode(v as ViewMode),
              options: [
                { id: 'mingguan', label: 'Mingguan' },
                { id: 'bulanan', label: 'Bulanan' }
              ]
            },
            {
              value: tab as string,
              onChange: (v: string) => setTab(v as DataTab),
              options: [
                { id: 'breakdown', label: 'Breakdown' },
                { id: 'realisasi', label: 'Realisasi' }
              ]
            }
          ]).map((group, gi) => (
            <div key={gi} className="grid grid-cols-2 p-1 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl md:w-56">
              {group.options.map(o => (
                <button
                  key={o.id}
                  onClick={() => group.onChange(o.id)}
                  className={`px-2 text-xs font-semibold rounded-lg transition-all ${
                    group.value === o.id
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          ))}

          <div className="relative col-span-2 md:col-span-1 md:w-44">
            <select
              value={selectedRayon}
              onChange={e => onUpdateRayon(parseInt(e.target.value, 10))}
              aria-label="Pilih rayon"
              className="w-full h-10 pl-3 pr-9 appearance-none text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value={0}>Semua Rayon (Cabang)</option>
              <option value={1}>Rayon 1</option>
              <option value={2}>Rayon 2</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          </div>
        </div>

        {/* Baris 3 (hanya Mingguan): pilih minggu */}
        {viewMode === 'mingguan' && (
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-300 shrink-0 mr-1" />
            {weeks.map((w, i) => (
              <button
                key={i}
                onClick={() => setSelectedWeek(i)}
                className={`px-3 h-8 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
                  i === weekIdx
                    ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-200'
                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                Mgg {i + 1} <span className="font-normal opacity-70">({w.start}–{w.end})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ringkasan: peringatan breakdown kosong (paling atas), kartu vs Target / Bulan Lalu / Tahun Lalu, lalu Analisa */}
      <div className="space-y-2">
        {bdGaps.length > 0 && (
          <p className="flex items-start gap-1.5 px-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Bd belum lengkap ({bdGaps.length} TKU): {bdGaps.map(g => g.nama).join(', ')}. Detail di Analisa.</span>
          </p>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-1">
          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
            {isReal ? 'Realisasi' : 'Breakdown'}{' '}
            {viewMode === 'mingguan' ? `Mgg ${weekIdx + 1} (${week.start}–${summary.to >= week.start ? summary.to : week.end})` : `${monthName}${isReal ? ` (s/d tgl ${updateDay})` : ''}`}
          </span>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {summary.days > 0 ? `Rata-rata ${formatNumber(summary.avg)} btl/hr • ${summary.days} hari` : 'Belum ada data'}
          </span>
        </div>
        <div className={`grid gap-1.5 ${summaryItems.length > 3 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {summaryItems.map(it => {
            const up = it.pct !== null && it.pct >= 1;
            const tone = it.pct === null ? 'text-neutral-400' : up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
            const short = it.label.replace('Bulan', 'Bln').replace('Tahun', 'Thn').replace('Minggu', 'Mgg');
            return (
              <div key={it.label} className="min-w-0 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 py-1.5">
                <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 leading-tight truncate">{short}</div>
                <div className={`font-mono text-sm font-extrabold leading-tight ${tone}`}>{it.has ? formatPercent(it.pct) : '—'}</div>
                <div className={`font-mono text-[10px] font-bold leading-tight truncate ${it.has ? getStatusClass(it.diff) : 'text-neutral-400'}`}>
                  {it.has ? formatDiff(it.diff) : 'Belum ada'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Analisa (tutup / buka) */}
        <button type="button" onClick={() => setShowAnalisa(v => !v)} aria-expanded={showAnalisa}
          className="w-full flex items-center justify-between gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-xs font-bold text-neutral-800 dark:text-neutral-100 cursor-pointer">
          <span className="flex items-center gap-1.5 min-w-0">
            <span>📊</span>
            <span className="truncate">Analisa {viewMode === 'mingguan' ? `Mgg ${weekIdx + 1}` : 'Bulan Ini'}</span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            {analisa.sets.reduce((n, st) => n + st.dekat.length, 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                🎯 {analisa.sets.reduce((n, st) => n + st.dekat.length, 0)}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showAnalisa ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {showAnalisa && (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 space-y-3">
            {analisa.sets.map(st => (
              <div key={st.label} className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 first-of-type:border-0 first-of-type:pt-0">
                <span className="inline-block px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/40 text-xs font-bold text-brand-700 dark:text-brand-300">{st.label}</span>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">🟢 Aman: {st.aman} TKU</div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-red-600 dark:text-red-400">🔴 Jauh: {st.jauh.length} TKU</div>
                  {st.jauh.map(r => (
                    <div key={r.nama} className="flex items-center justify-between gap-2 text-xs pl-4">
                      <span className="min-w-0 flex items-baseline gap-1.5 font-semibold text-neutral-800 dark:text-neutral-200">
                        <span className="truncate">{r.nama}</span>
                        {bdDetail(r.nama) && <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-amber-600 dark:text-amber-400">{bdDetail(r.nama)}</span>}
                      </span>
                      <span className="shrink-0 font-mono font-bold text-red-600 dark:text-red-400">{formatPercent(r.pct)} • −{formatNumber(r.gap)}</span>
                    </div>
                  ))}
                </div>
                {st.dekat.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">🟡 Mendekati: {st.dekat.length} TKU</div>
                    {st.dekat.map(r => (
                      <div key={r.nama} className="rounded-lg bg-amber-50/70 dark:bg-amber-950/20 px-2.5 py-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs font-bold">
                          <span className="min-w-0 flex items-baseline gap-1.5 text-neutral-900 dark:text-neutral-100">
                            <span className="truncate">{r.nama}</span>
                            {bdDetail(r.nama) && <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-amber-600 dark:text-amber-400">{bdDetail(r.nama)}</span>}
                          </span>
                          <span className="shrink-0 font-mono text-amber-700 dark:text-amber-400">−{formatNumber(r.gap)} btl</span>
                        </div>
                        <div className="text-[11px] leading-snug text-neutral-700 dark:text-neutral-300">
                          {r.kunj
                            ? <>➜ {r.kunj} kunjungan • <b>+{fmt1(r.perYl || 0)} btl/YL/kunjungan</b></>
                            : <>➜ {analisa.rem} hr • <b>+{fmt1(r.perYl || 0)} btl/YL/hr</b></>}
                          {r.heavy !== null && r.heavy !== undefined && <> ({Math.round(r.heavy * 100)}% bd){r.heavy > HEAVY_PCT ? ' ⚠️' : ''}</>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {st.tanpaBanding > 0 && (
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">⚪ {st.tanpaBanding} TKU belum ada pembanding</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showPlanPast && (
        <p className="px-1 text-xs text-sky-700 dark:text-sky-300">
          Mode rencana asli: angka per tanggal yang sudah tertutup realisasi menampilkan rencana awalnya (hanya lihat). Akumulasi, Rata-rata, dan Selisih tetap memakai realisasi.
        </p>
      )}

      {/* Tabel */}
      <div className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 border-t-4 ${isReal ? 'border-t-emerald-500' : 'border-t-sky-500'} shadow-sm overflow-hidden`}>
        <div ref={tableScrollRef} className="overflow-x-auto">
          <table className="text-xs border-collapse w-max min-w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th rowSpan={3} className="sticky left-0 z-20 px-3 py-2 text-left font-semibold bg-neutral-50 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 min-w-[130px] text-neutral-600 dark:text-neutral-300">
                  Nama TKU
                  <span className="block text-[10px] font-normal text-neutral-400 dark:text-neutral-500">% vs Tgt · Th lalu{showWeekCmp ? ' · Mgg lalu' : ''}</span>
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
                  return (
                    <th
                      key={d}
                      data-day={d}
                      colSpan={collapsedDay(d) ? 1 : 4}
                      className={`${th} ${collapsedDay(d) ? '!px-1' : ''} ${w === 0 ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20' : ''}`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{DAY_NAMES[w]} {d}</span>
                        {!isReal && isRealDate(d) && (
                          <span className={`text-xs px-1 py-px rounded text-white font-semibold leading-none ${showPlanPast ? 'bg-sky-600' : 'bg-emerald-600'}`}>{showPlanPast ? 'Rencana' : 'Real'}</span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {[...VCODES, 'Total'].map(l => (
                  <th key={`a${l}`} rowSpan={2} className={`${th} ${VCOL[l]}`}>{l}</th>
                ))}
                {[...VCODES, 'Total'].map(l => (
                  <th key={`r${l}`} rowSpan={2} className={`${th} ${VCOL[l]}`}>{l}</th>
                ))}
                {showWeekCmp && ['Persen', 'Selisih'].map(l => (
                  <th key={`w${l}`} rowSpan={2} className={th}>{l}</th>
                ))}
                {['Target', 'Bln Lalu', 'Thn Lalu'].map(l => (
                  <th key={`p${l}`} rowSpan={2} className={th}>{l}</th>
                ))}
                {['Target', 'Bln Lalu', 'Thn Lalu'].map(l => (
                  <th key={`s${l}`} rowSpan={2} className={th}>{l}</th>
                ))}
              </tr>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500">
                {shownDays.map(d => collapsedDay(d) ? (
                  <th key={`${d}libur`} className="px-1 py-1 text-center font-semibold text-[10px] text-neutral-400 border-l border-neutral-200 dark:border-neutral-800 bg-red-50 dark:bg-red-950/20">libur</th>
                ) :
                  VCODES.map((v, vi) => (
                    <th
                      key={`${d}${v}`}
                      className={`px-1.5 py-1 text-center font-bold text-xs min-w-[44px] ${VCOL[v]} ${vi === 0 ? 'border-l border-neutral-200 dark:border-neutral-800' : ''} ${dow(d) === 0 ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
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
                const wc = showWeekCmp ? weekCmp(a) : null;
                const sep = 'border-l border-neutral-200 dark:border-neutral-700';
                return (
                  <tr key={r.key} className={rowBg(r.kind)}>
                    <td className={`sticky left-0 z-10 px-3 py-1.5 font-semibold whitespace-nowrap border-r border-neutral-200 dark:border-neutral-700 ${stickyBg(r.kind)} ${accentCls(r)} ${labelTone(r)}`}>
                      {r.label}
                      {(a.pct.tg !== null || a.pct.ty !== null) && (
                        <span className="block mt-0.5 font-mono text-[10px] font-bold leading-tight">
                          {a.pct.tg !== null && (
                            <span className={pctClass(a.pct.tg, r.kind)}><span className="font-sans font-medium opacity-70">Tgt </span>{formatPercent(a.pct.tg)}</span>
                          )}
                          {a.pct.tg !== null && a.pct.ty !== null && <span className="opacity-40"> · </span>}
                          {a.pct.ty !== null && (
                            <span className={pctClass(a.pct.ty, r.kind)}><span className="font-sans font-medium opacity-70">Th </span>{formatPercent(a.pct.ty)}</span>
                          )}
                        </span>
                      )}
                      {wc && wc.pct !== null && wc.diff !== null && (
                        <span className={`block font-mono text-[10px] font-bold leading-tight ${pctClass(wc.pct, r.kind)}`}>
                          <span className="font-sans font-medium opacity-70">Mgg lalu </span>{formatPercent(wc.pct)} • {formatDiff(wc.diff)}
                        </span>
                      )}
                    </td>

                    {/* 1. Transaksi per tanggal */}
                    {shownDays.map(d => collapsedDay(d) ? (
                      <td key={`${d}libur`} className={`px-1 py-2 text-center font-mono text-xs text-neutral-300 dark:text-neutral-600 ${sep} ${dayTint(d, r.kind)}`}>-</td>
                    ) :
                      VCODES.map((v, vi) => {
                        const future = isReal && d > updateDay;
                        // Mode rencana asli: tanggal yang sudah tertutup realisasi menampilkan rencana aslinya
                        const planShown = showPlanPast && isRealDate(d);
                        const val = planShown ? r.idxs.reduce((acc, ti) => acc + getPlan(ti, d)[vi], 0) : a.daily[d][vi];
                        // Hari libur (semua TKU tanpa transaksi): tampil '-' tanpa tanda warna
                        const isHolidayEmpty = !future && val === 0 && (planShown ? dow(d) === 0 : isHoliday(d));
                        // Warna angka per tanggal vs hari yang sama minggu lalu (baris TKU, tampilan mingguan)
                        const dayTone: Tone = showWeekCmp && r.kind === 'tku' && !future && !isHolidayEmpty && !planShown ? toneOf(dayDiff(a, d)) : 'none';
                        // Tab Breakdown: tanggal yang belum datang = rencana target -> biru
                        const isPlanDay = !isReal && !isRealDate(d);
                        const valTone = future || isHolidayEmpty
                          ? 'text-neutral-300 dark:text-neutral-600'
                          : planShown
                            ? `${hue(r.kind, 'text-sky-700 dark:text-sky-300', 'text-sky-300')} italic`
                          : dayTone !== 'none'
                            ? dayToneClass(dayTone)
                            : isPlanDay
                              ? hue(r.kind, 'text-sky-700 dark:text-sky-300', 'text-sky-300')
                              : '';
                        return (
                          <td
                            key={`${d}${v}`}
                            className={`${td} ${vi === 0 ? sep : ''} ${dayTint(d, r.kind)} ${valTone}`}
                          >
                            {future ? '·' : isHolidayEmpty ? '-' : formatNumber(val)}
                          </td>
                        );
                      })
                    )}

                    {/* 2. Akumulasi */}
                    {a.acc.map((x, i) => (
                      <td key={`a${i}`} className={`${td} ${i === 0 ? sep : ''} ${tint('acc', r.kind)}`}>{formatNumber(x)}</td>
                    ))}
                    <td className={`${td} ${tint('acc', r.kind)} font-extrabold ${hue(r.kind, 'text-brand-700 dark:text-brand-300', 'text-sky-300')}`}>{formatNumber(a.accTotal)}</td>

                    {/* 3. Rata-rata */}
                    {a.avg.map((x, i) => (
                      <td key={`r${i}`} className={`${td} ${i === 0 ? sep : ''} ${tint('avg', r.kind)}`}>{formatNumber(x)}</td>
                    ))}
                    <td className={`${td} ${tint('avg', r.kind)} font-extrabold ${hue(r.kind, 'text-indigo-700 dark:text-indigo-300', 'text-indigo-200')}`}>{formatNumber(a.avgTotal)}</td>

                    {/* 4. Vs Minggu lalu (hanya mingguan, tab Breakdown) */}
                    {showWeekCmp && (() => {
                      const wc = weekCmp(a);
                      const toneDiff = toneOf(wc.diff);
                      const tonePct: Tone = wc.pct === null ? 'none' : toneDiff;
                      return (
                        <>
                          <td className={`${td} ${sep} ${tint('wk', r.kind)} ${toneText(tonePct, r.kind)}`}>
                            <span className="inline-flex items-center justify-end gap-0.5">
                              {wc.pct === null ? '—' : formatPercent(wc.pct)}
                              <TrendArrow tone={tonePct} />
                            </span>
                          </td>
                          <td className={`${td} ${tint('wk', r.kind)} ${toneText(toneDiff, r.kind)}`}>
                            {wc.diff === null ? '—' : `${wc.diff > 0 ? '+' : wc.diff < 0 ? '−' : ''}${formatNumber(Math.abs(wc.diff))}`}
                          </td>
                        </>
                      );
                    })()}

                    {/* 5. Vs target / bulan lalu / tahun lalu */}
                    {[a.pct.tg, a.pct.bl, a.pct.ty].map((p, i) => (
                      <td key={`p${i}`} className={`${td} ${i === 0 ? sep : ''} ${tint('pct', r.kind)} ${pctClass(p, r.kind)}`}>
                        {formatPercent(p)}
                      </td>
                    ))}

                    {/* 6. Selisih botol */}
                    {[a.diff.tg, a.diff.bl, a.diff.ty].map((x, i) => (
                      <td key={`s${i}`} className={`${td} ${i === 0 ? sep : ''} ${tint('diff', r.kind)} ${diffClass(x, r.kind)}`}>
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
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 border-t-4 border-t-indigo-500 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Kondisi TKU
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Evaluasi Operasional
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onNavigateMenu && (
                <button
                  type="button"
                  onClick={() => onNavigateMenu('Evaluasi')}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/60 transition-colors cursor-pointer border border-brand-200 dark:border-brand-800"
                >
                  <span>Buka di Menu Evaluasi</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowKondisiTku(prev => !prev)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                {showKondisiTku ? 'Sembunyikan' : 'Tampilkan Tabel'}
              </button>
            </div>
          </div>
          {showKondisiTku && (
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse w-max min-w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-300">
                  <th className="sticky left-0 z-20 px-3 py-2 text-left font-semibold bg-neutral-50 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 min-w-[130px]">Nama TKU</th>
                  {([
                    ['Penjualan Akm', 'text-brand-700 dark:text-brand-300'],
                    ['BB Akm', 'text-amber-600 dark:text-amber-400'],
                    ['% BB', 'text-amber-600 dark:text-amber-400'],
                    ['PDM Akm', 'text-sky-600 dark:text-sky-400'],
                    ['Absen Akm', 'text-violet-600 dark:text-violet-400'],
                    ['Frek Akm', 'text-violet-600 dark:text-violet-400'],
                    ['JWP', 'text-brand-700 dark:text-brand-300'],
                    ['s/YL', 'text-brand-700 dark:text-brand-300'],
                    ['Jml YL', 'text-emerald-600 dark:text-emerald-400'],
                    ['Jml Area', 'text-emerald-600 dark:text-emerald-400'],
                    ['% Cover Area', 'text-emerald-600 dark:text-emerald-400'],
                    ['YL < 250', 'text-red-600 dark:text-red-400'],
                    ['% < 250', 'text-red-600 dark:text-red-400'],
                    ['YL < 300', 'text-amber-600 dark:text-amber-400'],
                    ['% < 300', 'text-amber-600 dark:text-amber-400']
                  ] as const).map(([l, c]) => (
                    <th key={l} className={`${th} ${c}`}>{l}</th>
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
                      <td className={`sticky left-0 z-10 px-3 py-2 font-semibold whitespace-nowrap border-r border-neutral-200 dark:border-neutral-700 ${stickyBg(r.kind)} ${accentCls(r)} ${labelTone(r)}`}>
                        {r.label}
                      </td>
                      <td className={`${td} ${sep} ${hue(r.kind, 'text-brand-700 dark:text-brand-300', 'text-sky-300')}`}>{formatNumber(r.agg.accTotal)}</td>
                      <td className={`${td} ${sep} ${hue(r.kind, 'text-amber-600 dark:text-amber-400', 'text-amber-300')}`}>{formatNumber(o.bb)}</td>
                      <td className={`${td} ${getBbStatusClass(o.pctBb)}`}>{formatPercent(o.pctBb)}</td>
                      <td className={`${td} ${sep} ${hue(r.kind, 'text-sky-600 dark:text-sky-400', 'text-sky-300')}`}>{formatNumber(o.pdm)}</td>
                      <td className={`${td} ${sep}`}>{formatNumber(o.absen)}</td>
                      <td className={td}>{formatNumber(o.frek)}</td>
                      <td className={`${td} ${sep}`}>{formatNumber(o.jwp)}</td>
                      <td className={`${td} ${hue(r.kind, 'text-brand-700 dark:text-brand-300', 'text-sky-300')}`}>{o.syl === null ? '—' : formatNumber(o.syl)}</td>
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
          )}
        </div>
      )}
    </div>
  );
};
