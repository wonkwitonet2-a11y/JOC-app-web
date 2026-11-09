/**
 * Perbandingan "vs Minggu Lalu" (dipakai bersama oleh menu TKU & Admin Breakdown).
 *
 * Aturan:
 *  - Minggu dihitung Minggu s/d Sabtu. Minggu terakhir bulan berakhir di tanggal terakhir bulan.
 *  - Minggu ini  = akm (realisasi + breakdown) dari hari Minggu s/d akhir minggu itu.
 *  - Minggu lalu = akm dengan jumlah hari yang sama, tepat 7 hari sebelumnya.
 *  - Persen = akm minggu ini / akm minggu lalu. Selisih = akm minggu ini - akm minggu lalu.
 *  - Bila minggu 1 tidak dimulai hari Minggu, hari-hari di bulan lalu ikut dihitung (tanggal <= 0), memakai penjualan riil yang tersimpan.
 */
export interface WeekCompareRange {
  curFrom: number;
  curTo: number;
  prevFrom: number;
  prevTo: number;
}

/** monthIndex0 = 0..11. Tanggal boleh <= 0 (otomatis mundur ke bulan lalu). */
export const weekCompareRange = (year: number, monthIndex0: number, weekStart: number, weekEnd: number): WeekCompareRange => {
  const dowStart = new Date(year, monthIndex0, weekStart).getDay(); // 0 = Minggu
  const curFrom = weekStart - dowStart;
  return { curFrom, curTo: weekEnd, prevFrom: curFrom - 7, prevTo: weekEnd - 7 };
};

/** Kunci tanggal YYYY-MM-DD; d <= 0 atau d > jumlah hari bulan otomatis pindah bulan. */
export const dateKeyOf = (year: number, monthIndex0: number, d: number): string => {
  const dt = new Date(year, monthIndex0, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

export interface WeekCompareResult {
  cur: number;
  prev: number;
  pct: number | null;
  diff: number | null;
}

/** dayValue(d): total penjualan (riil / rencana) pada tanggal d, termasuk d <= 0 (bulan lalu). */
export const compareWeek = (range: WeekCompareRange, dayValue: (d: number) => number): WeekCompareResult => {
  let cur = 0;
  let prev = 0;
  for (let d = range.curFrom; d <= range.curTo; d++) cur += dayValue(d) || 0;
  for (let d = range.prevFrom; d <= range.prevTo; d++) prev += dayValue(d) || 0;
  if (prev <= 0) return { cur, prev, pct: null, diff: null };
  return { cur, prev, pct: cur / prev, diff: cur - prev };
};
