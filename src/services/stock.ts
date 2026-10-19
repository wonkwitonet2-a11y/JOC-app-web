import { SisaStockRecord, StockBatch, StockGroup, VariantCode } from '../types';

export const STOCK_GROUPS: { code: StockGroup; name: string }[] = [
  { code: 'YO', name: 'Yakult Original' },
  { code: 'OM', name: 'Original Mangga' },
  { code: 'OS', name: 'Original Stroberi' },
  { code: 'YT', name: 'Yakult Light' },
  { code: 'LOOSE', name: 'Loose (botol lepas)' },
];

// Batas hari untuk tanda peringatan exp
export const EXP_WARN_DAYS = 7;

export type ExpLevel = 'expired' | 'warn' | 'ok';

export const emptyBatches = (): SisaStockRecord['batches'] => ({
  YO: [], OM: [], OS: [], YT: [], LOOSE: [],
});

export const emptyStockRecord = (): SisaStockRecord => ({
  updatedAt: '',
  batches: emptyBatches(),
});

// Selisih hari (exp - hari ini), pakai tanggal kalender tanpa jam supaya tidak geser karena zona waktu.
export function daysUntil(exp: string, today: string): number {
  const [ey, em, ed] = exp.split('-').map(n => parseInt(n, 10));
  const [ty, tm, td] = today.split('-').map(n => parseInt(n, 10));
  if (!ey || !em || !ed || !ty || !tm || !td) return NaN;
  const a = Date.UTC(ey, em - 1, ed);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((a - b) / 86400000);
}

export function expLevel(exp: string, today: string): ExpLevel {
  const d = daysUntil(exp, today);
  if (Number.isNaN(d)) return 'ok';
  if (d < 0) return 'expired';
  if (d <= EXP_WARN_DAYS) return 'warn';
  return 'ok';
}

export function expLabel(exp: string, today: string): string {
  const d = daysUntil(exp, today);
  if (Number.isNaN(d)) return '';
  if (d < 0) return `lewat ${Math.abs(d)} hari`;
  if (d === 0) return 'exp hari ini';
  return `${d} hari lagi`;
}

export const sortBatches = (list: StockBatch[]): StockBatch[] =>
  [...list].sort((a, b) => a.exp.localeCompare(b.exp));

export const groupTotal = (list: StockBatch[] | undefined): number =>
  (list || []).reduce((acc, b) => acc + (Number(b.qty) || 0), 0);

export function recordTotal(rec: SisaStockRecord | undefined): number {
  if (!rec) return 0;
  return STOCK_GROUPS.reduce((acc, g) => acc + groupTotal(rec.batches?.[g.code]), 0);
}

// Tanggal exp paling dekat (dari semua grup yang jumlahnya > 0). null jika kosong.
export function nearestExp(rec: SisaStockRecord | undefined): { exp: string; group: StockGroup } | null {
  if (!rec) return null;
  let best: { exp: string; group: StockGroup } | null = null;
  STOCK_GROUPS.forEach(g => {
    (rec.batches?.[g.code] || []).forEach(b => {
      if (!b.exp || !(Number(b.qty) > 0)) return;
      if (!best || b.exp < best.exp) best = { exp: b.exp, group: g.code };
    });
  });
  return best;
}

// Jumlah botol yang sudah lewat exp / hampir exp
export function countByLevel(rec: SisaStockRecord | undefined, today: string): { expired: number; warn: number } {
  const out = { expired: 0, warn: 0 };
  if (!rec) return out;
  STOCK_GROUPS.forEach(g => {
    (rec.batches?.[g.code] || []).forEach(b => {
      const q = Number(b.qty) || 0;
      if (!q || !b.exp) return;
      const lv = expLevel(b.exp, today);
      if (lv === 'expired') out.expired += q;
      else if (lv === 'warn') out.warn += q;
    });
  });
  return out;
}

// Rapikan hasil isian: buang baris kosong, gabungkan tanggal exp yang sama (dijumlah DI DALAM satu isian
// yang sama), urutkan dari exp paling dekat.
export function normalizeBatches(list: StockBatch[]): StockBatch[] {
  const map = new Map<string, number>();
  list.forEach(b => {
    const q = Math.max(0, Math.floor(Number(b.qty) || 0));
    if (!b.exp || q <= 0) return;
    map.set(b.exp, (map.get(b.exp) || 0) + q);
  });
  return sortBatches(Array.from(map.entries()).map(([exp, qty]) => ({ exp, qty })));
}

export const isVariantGroup = (g: StockGroup): g is VariantCode => g !== 'LOOSE';

// "2026-10-25" -> "25 Okt 2026"
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export function formatExpShort(exp: string): string {
  const [y, m, d] = exp.split('-').map(n => parseInt(n, 10));
  if (!y || !m || !d) return exp || '-';
  return `${d} ${BULAN[m - 1]} ${y}`;
}

export function formatUpdatedAt(iso: string): string {
  if (!iso) return 'Belum pernah diisi';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'Belum pernah diisi';
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${dt.getDate()} ${BULAN[dt.getMonth()]} ${dt.getFullYear()}, ${hh}.${mm}`;
}
