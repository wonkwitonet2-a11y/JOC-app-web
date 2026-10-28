/**
 * Peringkat TKU — total poin penuh 100 (belum termasuk bonus di atas 100%).
 *
 * Skala 70:30 — bobot dasar 65:35 dikalikan skala (bukan dibulatkan manual):
 *   Penjualan = 70 poin = bobot dasar x 70/65:  vs Tahun Lalu 35 (50%), vs Target 24,5 (35%), vs Bulan Lalu 10,5 (15%).
 *   Kondisi   = 30 poin = bobot dasar x 30/35:  S/YL 7,71, YL/Area 6,86, Frekuensi (EWP) 6,
 *                      %YL<250 4,29, BB 3,43, YL<300 1,71.
 * Ganti TOTAL_PENJUALAN/TOTAL_KONDISI_SKALA di bawah untuk skala lain (mis. 65/35 = kembali ke semula).
 *
 * Rumus per indikator:
 * - Penjualan: PROPORSIONAL dari 0% sampai 120% (tanpa tangga). Poin = capaian% / 100 x bobot, jadi 0% = 0,
 *   100% = poin penuh, 120% = 1,2 x bobot. Di atas 120% poin berhenti bertambah (BATAS_BONUS); bila poin sama
 *   (mis. sama-sama sudah lewat 120%), persen asli (desimal) yang lebih tinggi di atas.
 * - S/YL (desimal dibuang): <250 = 0, 250-279 = 1/3, 280-299 = 1/2, 300-329 = 0,7, 330-349 = 0,85, 350+ = penuh.
 * - YL/Area (coverage): proporsional naik merata dari 80% (1/3 poin) sampai 100% (penuh); <80% = 0.
 * - EWP: 100% = penuh, 99,75 = 13/15 dst (lihat tabel di skorEwp), <90 = 0.
 * - %YL<250: 0% = penuh, turun merata sampai 30% = 0; 30% ke atas = 0.
 * - BB (dipotong 1 desimal): 0% = penuh, di atas 0 s/d 5% = 3/4, di atas 5 s/d 10% = 1/4, >10% = 0.
 * - YL<300: tidak ada YL di bawah 300 = poin penuh, ada satu saja = 0.
 * Frekuensi di aplikasi = angka update terbaru (bukan dijumlah harian).
 *
 * Basis kosong/nol (mis. data tahun lalu belum ada): indikator itu dikeluarkan.
 * - Kondisi: sisa poin dinormalisasi proporsional (tetap sesuai total kondisi).
 * - Penjualan (tetap sesuai total penjualan): bobot indikator yang kosong dibagikan ke indikator lain sebanding kuadrat bobotnya,
 *   sehingga yang bobotnya besar (Target/Tahun Lalu) menerima lebih banyak dan Bulan Lalu tidak membengkak.
 * Urutan saat total sama: rata-rata persen penjualan (dibobot, tanpa batas bonus) yang lebih tinggi menang.
 */

/** Skala total: Penjualan + Kondisi harus 100 */
const TOTAL_PENJUALAN = 70;
const TOTAL_KONDISI_SKALA = 30;
/** Bobot dasar (skema 65:35) — dipakai sebagai acuan proporsi, tidak dipakai langsung */
const DASAR_HASIL = 65;
const DASAR_KONDISI = 35;
const hasil = (b: number) => (b * TOTAL_PENJUALAN) / DASAR_HASIL;
const kondisi = (b: number) => (b * TOTAL_KONDISI_SKALA) / DASAR_KONDISI;

export const BOBOT = {
  yoy: hasil(32.5), // 50% dari penjualan
  target: hasil(22.75), // 35% dari penjualan
  mom: hasil(9.75), // 15% dari penjualan
  syl: kondisi(9),
  area: kondisi(8),
  ewp: kondisi(7),
  yl250: kondisi(5),
  bb: kondisi(4),
  yl300: kondisi(2),
} as const;

/** Tampilkan bobot/poin maksimum: maks 2 desimal, tanpa nol di belakang, koma desimal (mis. 7,71 / 24,5 / 30) */
export const fmtBobot = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** Poin penjualan naik proporsional sampai capaian ini (%). Di atasnya poin tidak bertambah. */
export const BATAS_BONUS = 120;

export type KategoriKey = keyof typeof BOBOT;

/** Kelompok untuk tampilan: hasil penjualan vs kondisi TKU */
export const KELOMPOK_HASIL: KategoriKey[] = ['yoy', 'target', 'mom'];
export const KELOMPOK_KONDISI: KategoriKey[] = ['syl', 'area', 'ewp', 'yl250', 'bb', 'yl300'];

const sumBobot = (g: KategoriKey[]) => Math.round(g.reduce((t, k) => t + BOBOT[k], 0) * 1e6) / 1e6;
export const TOTAL_HASIL = sumBobot(KELOMPOK_HASIL); // 70
export const TOTAL_KONDISI = sumBobot(KELOMPOK_KONDISI); // 30
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
  /** Jumlah YL dengan rata-rata < 300 (sudah termasuk yang < 250) */
  jumlahYl300?: number;
  /** S/YL = rata-rata penjualan per YL (botol) */
  sYl?: number;
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
  /** Rata-rata persen penjualan (dibobot LY/Target/LM, tanpa batas bonus) untuk pemisah saat seri */
  rataPersenJual: number;
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
 * Proporsional langsung: poin = capaian / 100 x bobot, mulai 0% sampai BATAS_BONUS (120%). Tanpa tangga.
 * Di atas 120% poin tidak bertambah; pembeda diserahkan ke persen asli (rataPersenJual) saat pengurutan.
 */
function skorPenjualan(aktual: number, basis: number, bobot: number): Skor {
  if (!fin(aktual) || !fin(basis) || basis <= 0) return { poin: null, nilai: null };
  const persen = (aktual / basis) * 100;
  const dipakai = Math.min(Math.max(0, persen), BATAS_BONUS);
  return { poin: (dipakai / 100) * bobot, nilai: persen };
}

/** YL vs Area: naik merata dari 80% (1/3 poin) sampai 100% (penuh); di bawah 80% = 0 */
function skorArea(ylAktual: number, standarArea: number): Skor {
  if (!fin(ylAktual) || !fin(standarArea) || standarArea <= 0) return { poin: null, nilai: null };
  const persen = (ylAktual / standarArea) * 100;
  const v = trunc2(persen);
  let rasio = 0;
  if (v >= 100) rasio = 1;
  else if (v >= 80) rasio = 1 / 3 + ((v - 80) / 20) * (2 / 3);
  return { poin: rasio * BOBOT.area, nilai: persen };
}

/** BB: 0% = penuh, di atas 0 s/d 5% = 3/4, di atas 5 s/d 10% = 1/4, di atas 10% = 0 */
function skorBb(persenBb: number): Skor {
  if (!fin(persenBb)) return { poin: null, nilai: null };
  const v = trunc1(Math.max(0, persenBb));
  let rasio = 0;
  if (v <= 0) rasio = 1;
  else if (v <= 5) rasio = 0.75;
  else if (v <= 10) rasio = 0.25;
  return { poin: rasio * BOBOT.bb, nilai: v };
}

/** %YL<250: 0% = penuh, turun linear sampai 30% = 0; 30% ke atas tidak dapat poin */
function skorYl250(persen: number | undefined): Skor {
  if (!fin(persen)) return { poin: null, nilai: null };
  const v = Math.min(100, Math.max(0, persen));
  const rasio = v >= 30 ? 0 : 1 - v / 30;
  return { poin: rasio * BOBOT.yl250, nilai: v };
}

/** YL<300: tidak ada YL di bawah 300 = penuh, ada satu saja = 0 (syarat hitungan komisi) */
function skorYl300(jumlah: number | undefined): Skor {
  if (!fin(jumlah)) return { poin: null, nilai: null };
  const v = Math.max(0, jumlah);
  return { poin: v <= 0 ? BOBOT.yl300 : 0, nilai: v };
}

/** S/YL bertahap: <250 = 0, 250 = 1/3, 280 = 1/2, 300 = 0,7, 330 = 0,85, 350+ = penuh. Tanpa data = dikeluarkan. */
function skorSyl(syl: number | undefined): Skor {
  if (!fin(syl) || syl <= 0) return { poin: null, nilai: null };
  const rasio = tangga(Math.floor(syl), [
    [350, 1],
    [330, 0.85],
    [300, 0.7],
    [280, 0.5],
    [250, 1 / 3],
  ]);
  return { poin: rasio * BOBOT.syl, nilai: syl };
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
    yl250: skorYl250(d.persenYl250),
    syl: skorSyl(d.sYl),
    yl300: skorYl300(d.jumlahYl300),
  };

  const keys = Object.keys(BOBOT) as KategoriKey[];
  const dikeluarkan = keys.filter((k) => mentah[k].poin === null);
  // Kondisi: normalisasi proporsional (tetap sesuai total kondisi).
  const faktorKondisi = (() => {
    const berlaku = KELOMPOK_KONDISI.reduce((t, k) => (mentah[k].poin === null ? t : t + BOBOT[k]), 0);
    return berlaku > 0 ? TOTAL_KONDISI / berlaku : 0;
  })();
  // Penjualan (tetap sesuai total penjualan): bobot yang kosong dibagi ke indikator lain sebanding kuadrat bobotnya.
  const hasilBerlaku = KELOMPOK_HASIL.filter((k) => mentah[k].poin !== null);
  const bobotKosong = TOTAL_HASIL - hasilBerlaku.reduce((t, k) => t + BOBOT[k], 0);
  const sumKuadrat = hasilBerlaku.reduce((t, k) => t + BOBOT[k] ** 2, 0);
  const faktorDari = (k: KategoriKey) => {
    if (!KELOMPOK_HASIL.includes(k)) return faktorKondisi;
    if (sumKuadrat <= 0) return 0;
    return (BOBOT[k] + (bobotKosong * BOBOT[k] ** 2) / sumKuadrat) / BOBOT[k];
  };

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

  let sw = 0;
  let sp = 0;
  for (const k of KELOMPOK_HASIL) {
    const n = mentah[k].nilai;
    if (fin(n)) {
      sw += BOBOT[k];
      sp += BOBOT[k] * n;
    }
  }
  const rataPersenJual = sw > 0 ? sp / sw : 0;

  return {
    id: d.id,
    nama: d.nama,
    rayon: d.rayon,
    total: skorHasil + skorKondisi,
    rataPersenJual,
    skorHasil,
    skorKondisi,
    dinormalisasi: dikeluarkan.length > 0,
    dikeluarkan,
    kategori,
  };
}

/**
 * Urutan: total skor -> rata-rata persen penjualan -> poin YoY -> poin Target -> poin BB (lebih tinggi menang).
 */
export function hitungPeringkat(daftar: PeringkatInput[], tanggalUpdate: number): PeringkatHasil {
  const hasil = daftar.map(hitungSkorTku);
  const p = (r: Omit<PeringkatRow, 'rank'>, k: KategoriKey) => r.kategori[k].poin ?? -Infinity;

  hasil.sort(
    (a, b) =>
      round2(b.total) - round2(a.total) ||
      round2(b.rataPersenJual) - round2(a.rataPersenJual) ||
      p(b, 'yoy') - p(a, 'yoy') ||
      p(b, 'target') - p(a, 'target') ||
      p(b, 'bb') - p(a, 'bb')
  );

  return {
    status: fin(tanggalUpdate) && tanggalUpdate <= TANGGAL_SEMENTARA ? 'SEMENTARA' : 'RESMI',
    rows: hasil.map((r, i) => ({ rank: i + 1, ...r })),
  };
}
