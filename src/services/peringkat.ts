/**
 * Peringkat TKU — total poin penuh 100 (belum termasuk bonus di atas 100%).
 *
 * Penjualan = 65 poin:  vs Tahun Lalu 28 (utama), vs Target 24, vs Bulan Lalu 13 (terendah).
 * Kondisi   = 35 poin (urut dari pengaruh ke penjualan): S/YL 8, Jumlah YL vs Area 7, Frekuensi (EWP) 7,
 *                      %YL<250 5 (syarat YL mandiri 250), Absen 4, BB 4.
 *
 * Tangga nilai (persentase dari poin penuh indikator) mengikuti aturan perusahaan:
 * - Penjualan: >=100% = poin penuh + bonus proporsional (persen/100 x bobot, tidak dibatasi),
 *   95% = 85%, 90% = 75%, 85% = 60%, 80% = 50%, <80% = 0. Di antara anak tangga dibulatkan ke bawah.
 * - YL vs Area: 100% = 100%, 90% = 2/3, 80% = 1/3, <80% = 0.
 * - BB: 0% = 100%, s/d 5% = 2/3, s/d 10% = 1/3, >10% = 0.
 * - Absen: 0% = 100%, s/d 10% = 70%, s/d 20% = 50%, >20% = 0.
 * - EWP: 100% = 100%, 99,75 = 13/15 dst (lihat tabel di skorEwp), <90 = 0.
 * - %YL<250: (100 - persen)% dari poin penuh.
 * - S/YL: <250 = 0, 250 = 1/3, naik linear sampai 350 = 100%.
 * Absen & Frekuensi di aplikasi = angka update terbaru (bukan dijumlah harian).
 *
 * Basis kosong/nol (mis. data tahun lalu belum ada): indikator itu dikeluarkan,
 * lalu poin sisanya dinormalisasi di dalam kelompoknya (Penjualan tetap 65, Kondisi tetap 35) supaya TKU tidak dirugikan.
 */

export const BOBOT = {
  yoy: 28,
  target: 24,
  mom: 13,
  syl: 8,
  area: 7,
  ewp: 7,
  yl250: 5,
  absen: 4,
  bb: 4,
} as const;

export type KategoriKey = keyof typeof BOBOT;

/** Kelompok untuk tampilan: hasil penjualan vs kondisi TKU */
export const KELOMPOK_HASIL: KategoriKey[] = ['yoy', 'target', 'mom'];
export const KELOMPOK_KONDISI: KategoriKey[] = ['syl', 'area', 'ewp', 'yl250', 'absen', 'bb'];

const sumBobot = (g: KategoriKey[]) => g.reduce((t, k) => t + BOBOT[k], 0);
export const TOTAL_HASIL = sumBobot(KELOMPOK_HASIL); // 65
export const TOTAL_KONDISI = sumBobot(KELOMPOK_KONDISI); // 35
export const TOTAL_BOBOT = TOTAL_HASIL + TOTAL_KONDISI; // 100

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
  /** % YL dengan rata-rata < 250, skala 0-100 */
  persenYl250?: number;
  /** S/YL = rata-rata penjualan per YL (botol) */
  sYl?: number;
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

/** YL vs Area: 100% = penuh, 90% = 2/3, 80% = 1/3, <80% = 0 */
function skorArea(ylAktual: number, standarArea: number): Skor {
  if (!fin(ylAktual) || !fin(standarArea) || standarArea <= 0) return { poin: null, nilai: null };
  const persen = (ylAktual / standarArea) * 100;
  const rasio = tangga(trunc2(persen), [
    [100, 1],
    [90, 10 / 15],
    [80, 5 / 15],
  ]);
  return { poin: rasio * BOBOT.area, nilai: persen };
}

/** BB: 0 = penuh, s/d 5% = 2/3, >5 s/d 10% = 1/3, >10% = 0 */
function skorBb(persenBb: number): Skor {
  if (!fin(persenBb)) return { poin: null, nilai: null };
  const v = trunc1(Math.max(0, persenBb));
  let rasio = 0;
  if (v <= 0) rasio = 1;
  else if (v <= 5) rasio = 10 / 15;
  else if (v <= 10) rasio = 5 / 15;
  return { poin: rasio * BOBOT.bb, nilai: v };
}

/** %YL<250: 0% = penuh, makin besar persen makin kecil poin: (100 - persen)% x bobot */
function skorYl250(persen: number | undefined): Skor {
  if (!fin(persen)) return { poin: null, nilai: null };
  const v = Math.min(100, Math.max(0, persen));
  return { poin: ((100 - v) / 100) * BOBOT.yl250, nilai: v };
}

/** S/YL: <250 = 0, 250 = 1/3 bobot, naik linear sampai 350 = penuh. Tanpa data = dikeluarkan. */
function skorSyl(syl: number | undefined): Skor {
  if (!fin(syl) || syl <= 0) return { poin: null, nilai: null };
  let rasio = 0;
  if (syl >= 350) rasio = 1;
  else if (syl >= 250) rasio = (5 + (syl - 250) / 10) / 15;
  return { poin: rasio * BOBOT.syl, nilai: syl };
}

/** Absen (% dari jumlah YL): 0 = penuh, s/d 10% = 70%, s/d 20% = 50%, >20% = 0 */
function skorAbsen(absen: number, totalYl: number): Skor {
  if (!fin(absen) || !fin(totalYl) || totalYl <= 0) return { poin: null, nilai: null };
  const persen = round2((Math.max(0, absen) / totalYl) * 100);
  let rasio = 0;
  if (persen <= 0) rasio = 1;
  else if (persen <= 10) rasio = 0.7;
  else if (persen <= 20) rasio = 0.5;
  return { poin: rasio * BOBOT.absen, nilai: persen };
}

/** Frekuensi (EWP %): 100 = penuh, 99,75 = 13/15, 99,5 = 12/15, 99,25 = 11/15, 99 = 10/15, lalu turun 1/15 per 1% sampai 90 = 1/15, <90 = 0 */
function skorEwp(totalYl: number, tanggal: number, frek: number): Skor {
  if (!fin(totalYl) || !fin(tanggal) || !fin(frek) || totalYl <= 0 || tanggal <= 0) {
    return { poin: null, nilai: null };
  }
  const hariEfektif = totalYl * tanggal;
  const persen = round2(((hariEfektif - Math.max(0, frek)) / hariEfektif) * 100);
  const poin15 = tangga(persen, [
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
  return { poin: (poin15 / 15) * BOBOT.ewp, nilai: persen };
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
    yl250: skorYl250(d.persenYl250),
    syl: skorSyl(d.sYl),
  };

  const keys = Object.keys(BOBOT) as KategoriKey[];
  const dikeluarkan = keys.filter((k) => mentah[k].poin === null);
  // Normalisasi per kelompok: porsi Penjualan (65) dan Kondisi (35) tetap, walau ada indikator dikeluarkan
  const faktorGrup = (grup: KategoriKey[]) => {
    const berlaku = grup.reduce((t, k) => (mentah[k].poin === null ? t : t + BOBOT[k]), 0);
    return berlaku > 0 ? sumBobot(grup) / berlaku : 0;
  };
  const faktorHasil = faktorGrup(KELOMPOK_HASIL);
  const faktorKondisi = faktorGrup(KELOMPOK_KONDISI);
  const faktorDari = (k: KategoriKey) => (KELOMPOK_HASIL.includes(k) ? faktorHasil : faktorKondisi);

  const kategori = {} as Record<KategoriKey, SkorKategori>;
  for (const k of keys) {
    const m = mentah[k];
    kategori[k] = {
      poin: m.poin === null ? null : m.poin * faktorDari(k),
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
