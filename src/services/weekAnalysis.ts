import { EvalUnit } from './progressEval';
import { formatNumber } from './storage';

/**
 * Analisa penyebab naik / turun penjualan mingguan, berbasis aturan dari data yang sudah ada.
 * Pembanding: hari yang sama di minggu lalu (tanggal d vs d-7), jadi minggu berjalan yang belum lengkap tetap adil.
 * Ubah angka di TH untuk menyesuaikan kepekaan.
 */
export const TH = {
  stabilPct: 0.03, // selisih di bawah 3% dianggap stabil
  bbPoin: 0.01, // %BB naik/turun >= 1 poin persen dianggap berpengaruh
  sylPct: 0.05, // s/YL berubah >= 5% dianggap berpengaruh
  l250Min: 1, // rata-rata YL < 250 per hari berubah >= 1 orang
  absenMin: 1, // absen bertambah >= 1 dalam 7 hari
  varianShare: 0.5 // satu varian menyumbang >= 50% dari total penurunan / kenaikan
};

export type WeekStatus = 'naik' | 'turun' | 'stabil' | 'nodata';
export type CauseKey = 'absen' | 'bb' | 'l250' | 'syl' | 'varian';

export interface WeekCause {
  key: CauseKey;
  tone: 'bad' | 'good' | 'info';
  text: string;
}

export interface WeekAnalysis {
  status: WeekStatus;
  diff: number;
  pct: number | null;
  causes: WeekCause[];
  summary: string;
}

export const CAUSE_LABEL: Record<CauseKey, string> = {
  absen: 'YL absen',
  bb: 'BB',
  l250: 'YL < 250',
  syl: 's/YL',
  varian: 'Varian'
};

const VARIANTS = ['YO', 'OM', 'OS', 'YT'];
const pctStr = (x: number, digits = 1) => `${(Math.abs(x) * 100).toFixed(digits).replace('.', ',')}%`;
const signedPct = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${pctStr(x)}`;

export function analyzeUnit(u: EvalUnit): WeekAnalysis {
  const w = u.week;
  if (w.days.length === 0 || w.prev <= 0) {
    return { status: 'nodata', diff: 0, pct: null, causes: [], summary: 'Belum ada pembanding minggu lalu.' };
  }

  const pct = w.diff / w.prev;
  const status: WeekStatus = Math.abs(pct) < TH.stabilPct ? 'stabil' : pct > 0 ? 'naik' : 'turun';
  if (status === 'stabil') {
    return { status, diff: w.diff, pct, causes: [], summary: `Stabil (${signedPct(pct)} vs minggu lalu).` };
  }

  const down = status === 'turun';
  const causes: WeekCause[] = [];

  // 1. Tenaga jual: absen & frekuensi bertambah dalam 7 hari terakhir
  if (down && w.absenPrev !== null) {
    const da = w.absenNow - w.absenPrev;
    if (da >= TH.absenMin) {
      const df = w.frekPrev !== null ? w.frekNow - w.frekPrev : 0;
      causes.push({
        key: 'absen',
        tone: 'bad',
        text: `YL absen bertambah ${formatNumber(da)}${df > 0 ? `, frekuensi +${formatNumber(df)}` : ''}`
      });
    }
  }

  // 2. Bottle back (BB)
  if (w.bbPctCur !== null && w.bbPctPrev !== null) {
    const dp = w.bbPctCur - w.bbPctPrev;
    if (down && dp >= TH.bbPoin) {
      causes.push({ key: 'bb', tone: 'bad', text: `BB naik dari ${pctStr(w.bbPctPrev)} ke ${pctStr(w.bbPctCur)}` });
    } else if (!down && dp <= -TH.bbPoin) {
      causes.push({ key: 'bb', tone: 'good', text: `BB turun dari ${pctStr(w.bbPctPrev)} ke ${pctStr(w.bbPctCur)}` });
    }
  }

  // 3. YL produktivitas rendah (< 250)
  if (w.l250Cur !== null && w.l250Prev !== null) {
    const d = w.l250Cur - w.l250Prev;
    const f = (x: number) => x.toFixed(1).replace('.', ',');
    if (down && d >= TH.l250Min) {
      causes.push({ key: 'l250', tone: 'bad', text: `YL < 250 naik dari ${f(w.l250Prev)} ke ${f(w.l250Cur)} orang/hari` });
    } else if (!down && d <= -TH.l250Min) {
      causes.push({ key: 'l250', tone: 'good', text: `YL < 250 turun dari ${f(w.l250Prev)} ke ${f(w.l250Cur)} orang/hari` });
    }
  }

  // 4. Produktivitas per YL (s/YL)
  if (w.sylNow !== null && w.sylPrev !== null && w.sylPrev > 0) {
    const ds = (w.sylNow - w.sylPrev) / w.sylPrev;
    if (down && ds <= -TH.sylPct) {
      causes.push({ key: 'syl', tone: 'bad', text: `s/YL turun ${pctStr(ds)} (${formatNumber(w.sylPrev)} → ${formatNumber(w.sylNow)})` });
    } else if (!down && ds >= TH.sylPct) {
      causes.push({ key: 'syl', tone: 'good', text: `s/YL naik ${pctStr(ds)} (${formatNumber(w.sylPrev)} → ${formatNumber(w.sylNow)})` });
    }
  }

  // 5. Varian yang paling berpengaruh
  const dv = w.vCur.map((c, i) => c - (w.vPrev[i] || 0));
  const moves = dv.map(x => (down ? Math.min(0, x) : Math.max(0, x)));
  const total = moves.reduce((a, b) => a + b, 0);
  if (total !== 0) {
    let top = 0;
    moves.forEach((m, i) => {
      if (Math.abs(m) > Math.abs(moves[top])) top = i;
    });
    const share = moves[top] / total;
    if (share >= TH.varianShare) {
      causes.push({
        key: 'varian',
        tone: down ? 'bad' : 'good',
        text: `${VARIANTS[top]} ${down ? 'turun' : 'naik'} ${formatNumber(Math.abs(moves[top]))} btl (${Math.round(share * 100)}% dari total)`
      });
    } else if (moves.filter(m => m !== 0).length >= 3) {
      causes.push({ key: 'varian', tone: 'info', text: `${down ? 'Turun' : 'Naik'} merata di semua varian` });
    }
  }

  const head = `${down ? 'Turun' : 'Naik'} ${pctStr(pct)}`;
  const summary = causes.length
    ? `${head}: ${causes.map(c => c.text).join('; ')}.`
    : `${head}: belum ada faktor menonjol di data (cek cuaca, libur, atau stok di lapangan).`;

  return { status, diff: w.diff, pct, causes, summary };
}

export interface WeekSummary {
  nUp: number;
  nDown: number;
  nSame: number;
  topDown: { name: string; diff: number } | null;
  topUp: { name: string; diff: number } | null;
  /** penyebab penurunan yang paling banyak muncul */
  dominant: { key: CauseKey; count: number }[];
}

export function summarizeWeek(items: { u: EvalUnit; a: WeekAnalysis }[]): WeekSummary {
  const valid = items.filter(x => x.a.status !== 'nodata');
  const downs = valid.filter(x => x.a.status === 'turun');
  const ups = valid.filter(x => x.a.status === 'naik');
  const pick = (list: typeof valid, dir: 1 | -1) =>
    list.length ? list.reduce((m, x) => (x.a.diff * dir > m.a.diff * dir ? x : m)) : null;
  const dn = pick(downs, -1);
  const upx = pick(ups, 1);

  const counts: Partial<Record<CauseKey, number>> = {};
  downs.forEach(x =>
    x.a.causes.forEach(c => {
      if (c.tone === 'bad') counts[c.key] = (counts[c.key] || 0) + 1;
    })
  );
  const dominant = (Object.keys(counts) as CauseKey[])
    .map(key => ({ key, count: counts[key] || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    nUp: ups.length,
    nDown: downs.length,
    nSame: valid.length - ups.length - downs.length,
    topDown: dn ? { name: dn.u.name, diff: dn.a.diff } : null,
    topUp: upx ? { name: upx.u.name, diff: upx.a.diff } : null,
    dominant
  };
}
