import { EvaluasiRow } from './evaluasi';

/** Kolom yang dinilai "terbaik". max = makin besar makin baik, min = makin kecil makin baik. */
export type BestKey =
  | 'yo' | 'om' | 'os' | 'yt' | 'akmPjl' | 'rata2'
  | 'vsLwPct' | 'vsTgPct' | 'vsLmPct' | 'vsLyPct'
  | 'pctBb' | 'syl' | 'absen' | 'frek' | 'cover' | 'pctL250';

const DIRECTION: Record<BestKey, 'max' | 'min'> = {
  yo: 'max', om: 'max', os: 'max', yt: 'max', akmPjl: 'max', rata2: 'max',
  vsLwPct: 'max', vsTgPct: 'max', vsLmPct: 'max', vsLyPct: 'max',
  pctBb: 'min', syl: 'max', absen: 'min', frek: 'min', cover: 'max',
  pctL250: 'min',
};

export const BEST_CELL_CLASS =
  'bg-emerald-100 dark:bg-emerald-900/40 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.55)]';

export type BestLookup = (key: BestKey, row: EvaluasiRow) => boolean;

/**
 * Cari TKU terbaik per kolom, hanya dari baris TKU (subtotal/total tidak ikut).
 * Seri: semua yang nilainya sama ditandai. Jika semua baris bernilai sama
 * (mis. semua absen 0), tidak ada yang ditandai karena tidak ada yang "terbaik".
 */
export function buildBestLookup(rows: EvaluasiRow[]): BestLookup {
  const best = new Map<BestKey, Set<number>>();
  (Object.keys(DIRECTION) as BestKey[]).forEach(key => {
    const vals: { id: number; v: number }[] = [];
    rows.forEach(r => {
      const v = (r as unknown as Record<string, unknown>)[key];
      if (typeof v === 'number' && isFinite(v)) vals.push({ id: r.tku.id, v });
    });
    if (vals.length < 2) return;
    const nums = vals.map(x => x.v);
    const max = Math.max(...nums);
    const min = Math.min(...nums);
    if (Math.abs(max - min) < 1e-9) return;
    const target = DIRECTION[key] === 'max' ? max : min;
    best.set(key, new Set(vals.filter(x => Math.abs(x.v - target) < 1e-9).map(x => x.id)));
  });
  return (key, row) => best.get(key)?.has(row.tku.id) ?? false;
}
