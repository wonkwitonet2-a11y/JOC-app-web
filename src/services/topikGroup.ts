// ============================================================================
// PENGELOMPOKAN TOPIK OTOMATIS (tampilan admin).
// TKU bebas menulis topik: "YL < 250", "<250", "yl kurang dr 250", "s/yl dibawah 250" ... semuanya
// dianggap SATU topik. Fungsi di sini murni dan HANYA dipakai saat menampilkan; teks asli yang
// disimpan TKU (weeklyNotes, arsip, sinkron) tidak pernah diubah.
// ============================================================================

// Kata penghubung / sebutan umum yang tidak membedakan topik.
const STOP = new Set([
  'yl', 'syl', 's', 'yang', 'yg', 'dengan', 'dgn', 'dan', 'di', 'ke', 'untuk', 'utk', 'pada',
  'btl', 'bt', 'botol', 'per', 'hari', 'hr', 'rata', 'rata2', 'ratarata', 'masalah', 'kendala', 'topik'
]);

// Kata/lambang "kurang dari" dan "lebih dari" disatukan jadi lambang < dan >.
const LESS = /<=|≤|=<|<|\b(?:kurang\s+(?:dari|dr|dri)|kurang|kurng|krg|dibawah|di\s+bawah|dibwh|dibawh|bawah|under|below|lebih\s+kecil|lbh\s+kecil|lebih\s+rendah)\b/g;
const MORE = />=|≥|=>|>|\b(?:lebih\s+(?:dari|dr|dri)|lebih|lbh|diatas|di\s+atas|diatasnya|atas|over|above|lebih\s+besar|lebih\s+tinggi)\b/g;

/** Bentuk baku sebuah topik; topik yang maknanya sama menghasilkan teks yang sama. */
export function canonTopik(raw?: string): string {
  let t = (raw || '').toLowerCase();
  if (!t.trim()) return '';
  t = t.replace(/s\s*\/\s*yl/g, ' syl ');
  t = t.replace(/(\d)[.,](\d{3})(?!\d)/g, '$1$2'); // 1.000 -> 1000
  t = t.replace(LESS, ' < ').replace(MORE, ' > ');
  t = t.replace(/[^a-z0-9<>\s]/g, ' ');
  // pisahkan angka dari huruf: "250btl" -> "250 btl", "yl250" -> "yl 250"
  t = t.replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2');
  const toks = t.split(/\s+/).filter(Boolean).filter(w => !STOP.has(w));
  // lambang ganda berurutan (mis. "yl kurang dari <250") jadi satu
  const out: string[] = [];
  toks.forEach(w => { if (!((w === '<' || w === '>') && out[out.length - 1] === w)) out.push(w); });
  return out.join(' ');
}

function lev(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// Pecah bentuk baku jadi bagian "tanda" (angka, <, >) dan bagian "kata".
const split = (k: string) => {
  const toks = k.split(' ').filter(Boolean);
  return {
    sig: toks.filter(w => /^[0-9<>]+$/.test(w)).join(' '),
    words: toks.filter(w => !/^[0-9<>]+$/.test(w)).sort().join(' ')
  };
};

// Dua bentuk baku dianggap satu topik bila angka/lambangnya sama dan katanya sama atau hanya beda salah ketik kecil.
function same(a: string, b: string): boolean {
  if (a === b) return true;
  const x = split(a), y = split(b);
  if (x.sig !== y.sig) return false;
  if (x.words === y.words) return true;
  if (!x.words || !y.words) return false; // "<250" vs "<250 absen" beda topik
  const len = Math.max(x.words.length, y.words.length);
  if (len < 5) return false; // kata pendek jangan dikira salah ketik
  return lev(x.words, y.words) <= (len >= 9 ? 2 : 1);
}

export interface TopikCluster {
  id: string; // bentuk baku wakil kelompok
  label: string; // tulisan yang paling sering dipakai TKU
  variants: string[]; // semua tulisan asli yang masuk kelompok ini
  count: number;
}

/**
 * Kelompokkan daftar tulisan topik. Hasil: peta dari tulisan asli (huruf kecil, spasi rapi) ke kelompoknya.
 * Hasil tidak bergantung urutan masukan.
 */
export function clusterTopik(topics: (string | undefined)[]): Map<string, TopikCluster> {
  const norm = (t: string) => t.trim().replace(/\s+/g, ' ').toLowerCase();
  const freq = new Map<string, { text: string; n: number }>(); // per tulisan asli ternormalisasi
  topics.forEach(t => {
    const raw = (t || '').trim().replace(/\s+/g, ' ');
    if (!raw) return;
    const k = norm(raw);
    const cur = freq.get(k);
    if (cur) cur.n++; else freq.set(k, { text: raw, n: 1 });
  });

  // urut: paling sering muncul dulu, lalu abjad -> wakil kelompok stabil
  const items = Array.from(freq.entries())
    .map(([k, v]) => ({ k, text: v.text, n: v.n, canon: canonTopik(v.text) || k }))
    .sort((a, b) => b.n - a.n || a.canon.localeCompare(b.canon) || a.k.localeCompare(b.k));

  const clusters: { canon: string; members: typeof items }[] = [];
  items.forEach(it => {
    const hit = clusters.find(c => same(c.canon, it.canon));
    if (hit) hit.members.push(it); else clusters.push({ canon: it.canon, members: [it] });
  });

  const out = new Map<string, TopikCluster>();
  clusters.forEach(c => {
    const best = c.members[0]; // anggota terbanyak (sudah terurut)
    const cl: TopikCluster = {
      id: c.canon,
      label: best.text,
      variants: c.members.map(m => m.text),
      count: c.members.reduce((s, m) => s + m.n, 0)
    };
    c.members.forEach(m => out.set(m.k, cl));
  });
  return out;
}

/** Kunci kelompok untuk satu topik (tulisan asli) memakai hasil clusterTopik. */
export function topikClusterOf(map: Map<string, TopikCluster>, tp?: string): TopikCluster | undefined {
  const k = (tp || '').trim().replace(/\s+/g, ' ').toLowerCase();
  return k ? map.get(k) : undefined;
}
