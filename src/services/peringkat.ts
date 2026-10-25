/**
 * Peringkat TKU — 7 indikator, total poin penuh 130.
 *
 * Poin penuh:
 *   Penjualan : vs Tahun Lalu 30, vs Target 25, vs Bulan Lalu 20
 *   Kondisi   : YL vs Area 15, Frekuensi (EWP) 15, BB 15, Absen 10
 *
 * Aturan:
 * - Penjualan: >=100% = poin penuh + bonus proporsional (persen/100 x bobot, tidak dibatasi),
 *   95% = 85%, 90% = 75%, 85% = 60%, 80% = 50%, <80% = 0. Nilai di antara dibulatkan ke anak tangga bawah.
 * - Absen, Frekuensi, BB: nilai 0 = poin penuh (lihat tabel di fungsi skor masing-masing).
 * - Absen & Frekuensi di aplikasi = angka update terbaru (bukan dijumlah harian).
 *
 * Basis kosong/nol (mis. data tahun lalu belum ada): indikator itu dikeluarkan,
 * lalu semua poin dinormalisasi ke skala 130 supaya TKU tidak dirugikan.
 */

export const BOBOT = {
  yoy: 30,
  target: 25,
  mom: 20,
  area: 15,
  ewp: 15,
  bb: 15,
  absen: 10,
} as const;

export type KategoriKey = keyof typeof BOBOT;

export const TOTAL_BOBOT = (Object.values(BOBOT) as number[]).reduce((a, b) => a + b, 0); // 130

/** Kelompok untuk tampilan: hasil penjualan vs kondisi TKU */
export const KELOMPOK_HASIL: KategoriKey[] = ['yoy', 'target', 'mom'];
export const KELOMPOK_KONDISI: KategoriKey[] = ['area', 'ewp', 'bb', 'absen'];

/** Ranking dianggap sementara bila tanggal update <= nilai ini */
export const TANGGAL_SEMENTARA = 5;

export interface PeringkatInput {
  id: number | string;
  nama: string;
  rayon?: number;
  /** Rata-rata penjualan per hari (botol) bulan ini */
  aktual: number;
  /** Rata-rata target harian */
  target: number;
  /** Rata-rata hasil bulan sama tahun lalu */
  tahunLalu: number;
  /** Rata-rata hasil bulan lalu */
  bulanLalu: number;
  /** % BB dalam skala 0-100 */
  persenBb: number;
  /** (tidak dipakai lagi, dipertahankan agar kompatibel) */
  persenYl250?: number;
  /** Jumlah YL absen (angka update terbaru) */
  absen: number;
  totalYl: number;
  /** Frekuensi hari kosong (angka update terbaru, akumulasi) */
  frekHariKosong: number;
  /** Tanggal update / pembagi hari */
  tanggal: number;
  ylAktual: number;
  standarArea: number;
}

export interface SkorKategori {
  /** Poin akhir (sudah dinormalisasi bila ada indikator dikeluarkan); null = dikeluarkan */
  poin: number | null;
  /** Nilai mentah untuk ditampilkan (persen, dll), null bila tidak ada */
  nilai: number | null;
  bobot: number;
}

export interface PeringkatRow {
  rank: number;
  id: number | string;
  nama: string;
  rayon?: number;
  total: number;
  skorHasil: number;
  skorKondisi: number;
  dinormalisasi: boolean;
  dikeluarkan: KategoriKey[];
  kategori: Record<KategoriKey, SkorKategori>;
}

export interface PeringkatHasil {
  status: 'SEMENTARA' | 'RESMI';
  rows: PeringkatRow[];
}

const fin = (v: unknown): v is number => typeof v === 'number' && isFinite(v);
const round2 = (v: number) => Math.round(v * 100) / 100;
/** Potong ke 1 desimal, sama dengan tampilan formatPercent (truncFixed) */
const trunc1 = (v: number) => Math.floor(v * 10 + 1e-9) / 10;

type Skor = { poin: number | null; nilai: number | null };

/** Potong ke 2 desimal (94,999 tidak dianggap 95) */
const trunc2 = (v: number) => Math.floor(v * 100 + 1e-7) / 100;

/** Cari poin dari tangga [batasMinimum, poin] urut turun; di bawah semua batas = 0 */
function tangga(v: number, rows: [number, number][]): number {
  for (const [min, poin] of rows) if (v >= min) return poin;
  return 0;
}

/**
 * Penjualan (vs LY / Target / LM). Nilai = pencapaian (%).
 * >=100% : poin penuh + bonus proporsional (persen/100 x bobot).
 */
function skorPenjualan(aktual: number, basis: number, bobot: number): Skor {
  if (!fin(aktual) || !fin(basis) || basis <= 0) return { poin: null, nilai: null };
  const persen = (aktual / basis) * 100;
  const v = trunc2(persen);
  if (v >= 100) return { poin: (persen / 100) * bobot, nilai: persen };
  const rasio = tangga(v, [
    [95, 0.85],
    [90, 0.75],
    [85, 0.6],
    [80, 0.5],
  ]);
  return { poin: rasio * bobot, nilai: persen };
}

/** YL vs Area: 100% = 15, 90% = 10, 80% = 5, <80% = 0 */
function skorArea(ylAktual: number, standarArea: number): Skor {
  if (!fin(ylAktual) || !fin(standarArea) || standarArea <= 0) return { poin: null, nilai: null };
  const persen = (ylAktual / standarArea) * 100;
  const poin = tangga(trunc2(persen), [
    [100, BOBOT.area],
    [90, 10],
    [80, 5],
  ]);
  return { poin, nilai: persen };
}

/** BB: 0 = 15, s/d 5% = 10, >5 s/d 10% = 5, >10% = 0 */
function skorBb(persenBb: number): Skor {
  if (!fin(persenBb)) return { poin: null, nilai: null };
  const v = trunc1(Math.max(0, persenBb));
  let poin = 0;
  if (v <= 0) poin = 15;
  else if (v <= 5) poin = 10;
  else if (v <= 10) poin = 5;
  return { poin, nilai: v };
}

/** Absen (% dari jumlah YL): 0 = 10, s/d 10% = 7, s/d 20% = 5, >20% = 0 */
function skorAbsen(absen: number, totalYl: number): Skor {
  if (!fin(absen) || !fin(totalYl) || totalYl <= 0) return { poin: null, nilai: null };
  const persen = round2((Math.max(0, absen) / totalYl) * 100);
  let poin = 0;
  if (persen <= 0) poin = 10;
  else if (persen <= 10) poin = 7;
  else if (persen <= 20) poin = 5;
  return { poin, nilai: persen };
}

/** Frekuensi (EWP %): 100 = 15, 99,75 = 13, 99,5 = 12, 99,25 = 11, 99 = 10, lalu turun 1 per 1% sampai 90 = 1, <90 = 0 */
function skorEwp(totalYl: number, tanggal: number, frek: number): Skor {
  if (!fin(totalYl) || !fin(tanggal) || !fin(frek) || totalYl <= 0 || tanggal <= 0) {
    return { poin: null, nilai: null };
  }
  const hariEfektif = totalYl * tanggal;
  const persen = round2(((hariEfektif - Math.max(0, frek)) / hariEfektif) * 100);
  const poin = tangga(persen, [
    [100, 15],
    [99.75, 13],
    [99.5, 12],
    [99.25, 11],
    [99, 10],
    [98, 9],
    [97, 8],
    [96, 7],
    [95, 6],
    [94, 5],
    [93, 4],
    [92, 3],
    [91, 2],
    [90, 1],
  ]);
  return { poin, nilai: persen };
}

export function hitungSkorTku(d: PeringkatInput): Omit<PeringkatRow, 'rank'> {
  const mentah: Record<KategoriKey, { poin: number | null; nilai: number | null }> = {
    yoy: skorPenjualan(d.aktual, d.tahunLalu, BOBOT.yoy),
    target: skorPenjualan(d.aktual, d.target, BOBOT.target),
    mom: skorPenjualan(d.aktual, d.bulanLalu, BOBOT.mom),
    area: skorArea(d.ylAktual, d.standarArea),
    ewp: skorEwp(d.totalYl, d.tanggal, d.frekHariKosong),
    bb: skorBb(d.persenBb),
    absen: skorAbsen(d.absen, d.totalYl),
  };

  const keys = Object.keys(BOBOT) as KategoriKey[];
  const dikeluarkan = keys.filter((k) => mentah[k].poin === null);
  const bobotBerlaku = keys.reduce((s, k) => (mentah[k].poin === null ? s : s + BOBOT[k]), 0);
  // Faktor normalisasi ke skala 130 (=1 bila semua indikator berlaku)
  const faktor = bobotBerlaku > 0 ? TOTAL_BOBOT / bobotBerlaku : 0;

  const kategori = {} as Record<KategoriKey, SkorKategori>;
  for (const k of keys) {
    const m = mentah[k];
    kategori[k] = {
      poin: m.poin === null ? null : m.poin * faktor,
      nilai: m.nilai,
      bobot: BOBOT[k],
    };
  }

  const jumlah = (grup: KategoriKey[]) =>
    grup.reduce((s, k) => s + (kategori[k].poin ?? 0), 0);

  const skorHasil = jumlah(KELOMPOK_HASIL);
  const skorKondisi = jumlah(KELOMPOK_KONDISI);

  return {
    id: d.id,
    nama: d.nama,
    rayon: d.rayon,
    total: skorHasil + skorKondisi,
    skorHasil,
    skorKondisi,
    dinormalisasi: dikeluarkan.length > 0,
    dikeluarkan,
    kategori,
  };
}

/**
 * Urutan: total skor -> poin YoY -> poin Target -> poin BB (lebih tinggi menang).
 */
export function hitungPeringkat(daftar: PeringkatInput[], tanggalUpdate: number): PeringkatHasil {
  const hasil = daftar.map(hitungSkorTku);
  const p = (r: Omit<PeringkatRow, 'rank'>, k: KategoriKey) => r.kategori[k].poin ?? -Infinity;

  hasil.sort(
    (a, b) =>
      round2(b.total) - round2(a.total) ||
      p(b, 'yoy') - p(a, 'yoy') ||
      p(b, 'target') - p(a, 'target') ||
      p(b, 'bb') - p(a, 'bb')
  );

  return {
    status: fin(tanggalUpdate) && tanggalUpdate <= TANGGAL_SEMENTARA ? 'SEMENTARA' : 'RESMI',
    rows: hasil.map((r, i) => ({ rank: i + 1, ...r })),
  };
}
