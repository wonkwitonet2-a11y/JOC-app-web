export type VariantCode = 'YO' | 'OM' | 'OS' | 'YT';

export interface VariantInfo {
  code: VariantCode;
  name: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export const VARIANTS: VariantInfo[] = [
  { code: 'YO', name: 'Yakult Original', color: '#c8102e', badgeBg: 'bg-red-50 dark:bg-red-950/40', badgeText: 'text-red-700 dark:text-red-400' },
  { code: 'OM', name: 'Original Mangga', color: '#f59e0b', badgeBg: 'bg-amber-50 dark:bg-amber-950/40', badgeText: 'text-amber-700 dark:text-amber-400' },
  { code: 'OS', name: 'Original Stroberi', color: '#ec4899', badgeBg: 'bg-pink-50 dark:bg-pink-950/40', badgeText: 'text-pink-700 dark:text-pink-400' },
  { code: 'YT', name: 'Yakult Light', color: '#0ea5e9', badgeBg: 'bg-sky-50 dark:bg-sky-950/40', badgeText: 'text-sky-700 dark:text-sky-400' },
];

export interface TkuItem {
  id: number;
  nama: string;
  rayon: 1 | 2;
  targetHarian: number; // botol per hari
  penjualanAkm: [number, number, number, number]; // [YO, OM, OS, YT]
  aktif: boolean;
  pic?: string;
  alamat?: string;
  hp?: string;
  jumlahArea?: number;
  jumlahYl?: number;
  coverageArea?: number;
  jumlahYlLy?: number;
  diffYl?: number;
  absenYl?: number;
  frekuensiAbsen?: number;
  akmJwp?: number;
  sYl?: number;
  l250?: number;
  l300?: number;
  bbAkm?: [number, number, number, number]; // [YO, OM, OS, YT]
}

export interface DailySalesRecord {
  v: [number, number, number, number]; // sales per variant [YO, OM, OS, YT]
  b: [number, number, number, number]; // bottle returns per variant
  sold: number;
  bb: number;
  pdmV?: [number, number, number, number]; // PDM per varian [YO, OM, OS, YT]
  pdm?: number; // Total PDM (sum of pdmV or total)
  yl?: number;
  ar?: number;
  l250?: number;
  l300?: number;
  jwp?: number;
  jwpm?: number;
  absen?: number;
  frek?: number;
}

export interface DailyOpsRecord {
  pdmV?: [number, number, number, number];
  pdm?: number;
  yl?: number;
  area?: number;
  l250?: number;
  l300?: number;
  jwp?: number;
  absen?: number;
  frek?: number;
}

export interface TargetVariantItem {
  tg?: number;
  bl?: number;
  ty?: number;
}

export interface ArchiveRow {
  nama: string;
  rayon: number;
  varian: [number, number, number, number]; // [YO, OM, OS, YT]
  rataVarian?: [number, number, number, number]; // [Rata YO, Rata OM, Rata OS, Rata YT]
  total: number;
  rataHarian?: number;
  targetHarian?: number;
  vsTargetPct?: number;
  bulanLalu?: number;
  vsLmPct?: number;
  tahunLalu?: number;
  vsLyPct?: number;
  akmBb?: number;
  akmBbPct?: number;
  akmJwp?: number;
  sYl?: number;
  absenYl?: number;
  frekuensiAbsen?: number;
  jumlahYl?: number;
  jumlahArea?: number;
  coverageArea?: number;
  l250?: number;
  l300?: number;
}

export interface ArchiveRecord {
  periode: string; // e.g. "2026-08"
  namaBulan: string;
  d: number; // days in month
  terkunci: boolean;
  rows: ArchiveRow[];
}

export interface MotivationQuote {
  id: number;
  teks: string;
  aktif: boolean;
}

export interface SupabaseConfig {
  u: string;
  k: string;
  locked?: boolean;
}

// Data kerja yang berlaku PER BULAN. Saat bulan kerja dipindah, isi ini disimpan ke monthStore
// (bulan lama) dan diganti dengan milik bulan tujuan (atau lembar kosong jika bulan baru).
export interface TkuMonthlyFields {
  targetHarian: number;
  penjualanAkm: [number, number, number, number];
  jumlahArea?: number;
  jumlahYl?: number;
  coverageArea?: number;
  absenYl?: number;
  frekuensiAbsen?: number;
  akmJwp?: number;
  sYl?: number;
  l250?: number;
  l300?: number;
  bbAkm?: [number, number, number, number];
}

export interface MonthSnapshot {
  periode: string; // YYYY-MM
  savedAt: string; // ISO time
  tkuMonthly: Record<number, TkuMonthlyFields>; // tku.id -> angka bulan tsb
  targetBulanLalu: Record<number, number>; // tku.id -> nilai
  targetTahunLalu: Record<number, number>;
  targetPerVariant: {
    YO: Record<number, TargetVariantItem>;
    OM: Record<number, TargetVariantItem>;
    OS: Record<number, TargetVariantItem>;
    YT: Record<number, TargetVariantItem>;
  };
  breakdown: Record<number, number[]>; // tku.id -> 31 angka
  breakdownPerVariant: {
    YO: Record<number, number[]>;
    OM: Record<number, number[]>;
    OS: Record<number, number[]>;
    YT: Record<number, number[]>;
  };
  todayInputs: Record<number, DailySalesRecord>; // tku.id -> input
  bbHarian: Record<number, number>;
}

export interface AppState {
  dataVersion?: string;
  role: 'a' | 't' | null; // 'a': admin, 't': tku
  activeTkuId: number;
  currentMenu: string;
  selectedRayon: number; // 0: Cabang, 1: Rayon 1, 2: Rayon 2
  activeDate: string; // YYYY-MM-DD
  activePeriod: string; // YYYY-MM-01
  currentDayNum: number;
  pembagiHari?: number; // Pembagi hari aktif untuk hitung rata-rata penjualan di Dashboard
  pembagiHariMode?: 'tanggal'; // Tanpa cut-off: pembagi selalu = tanggal update (maks. tanggal terakhir bulan kerja)
  pembagiKhususTku?: Record<number, number>; // tkuIndex -> pembagi khusus hari
  pembagiBreakdown?: number; // Pembagi khusus HANYA untuk menu breakdown rencana
  pembagiBreakdownMode?: 'auto' | 'manual'; // 'auto': ikut tanggal beranda, 'manual': diisi manual khusus breakdown
  pembagiKhususBreakdownTku?: Record<number, number>; // tkuIndex -> pembagi khusus breakdown rencana
  targetBulanLalu: number[];
  targetTahunLalu: number[];
  targetPerVariant: {
    YO: Record<number, TargetVariantItem>;
    OM: Record<number, TargetVariantItem>;
    OS: Record<number, TargetVariantItem>;
    YT: Record<number, TargetVariantItem>;
  };
  breakdown: Record<number, number[]>; // tkuId -> array of 31 numbers
  breakdownPerVariant: {
    YO: Record<number, number[]>;
    OM: Record<number, number[]>;
    OS: Record<number, number[]>;
    YT: Record<number, number[]>;
  };
  todayInputs: Record<number, DailySalesRecord>;
  pjd: Record<string, Record<number, DailySalesRecord>>; // date -> tkuIndex -> record
  hjd: Record<string, Record<number, DailyOpsRecord>>; // date -> tkuIndex -> record
  bbHarian: Record<number, number>; // dayNum -> total BB
  quotes: MotivationQuote[];
  archives: Record<string, ArchiveRecord>;
  monthStore?: Record<string, MonthSnapshot>; // YYYY-MM -> data kerja bulan yang sedang tidak aktif
  activeArchiveKey: string | null;
  supabaseConfig: SupabaseConfig;
  tkus: TkuItem[];
  adminPin: string;
  tkuPin: string;
  theme: 'light' | 'dark' | 'system';
}
