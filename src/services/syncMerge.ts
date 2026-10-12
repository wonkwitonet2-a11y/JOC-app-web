// Penggabungan TIGA ARAH untuk data yang dipakai bersama banyak perangkat.
//
//  base   : isi cloud saat terakhir kali perangkat ini sinkron (titik awal bersama)
//  local  : isi di HP ini sekarang
//  remote : isi di cloud sekarang
//
// Aturan per bagian terkecil ("daun", mis. satu sel penjualan `tanggal:TKU`):
//  - lokal tidak berubah dari base  -> ikut cloud (termasuk penghapusan oleh perangkat lain)
//  - cloud tidak berubah dari base  -> ikut lokal (termasuk penghapusan oleh HP ini)
//  - keduanya berubah beda          -> lokal menang (dihitung sebagai bentrok),
//                                      kecuali lokal menghapus & cloud mengubah: versi cloud dipertahankan
//
// Tanpa base (perangkat baru / belum pernah sinkron): gabungan murni, TIDAK ada penghapusan,
// kalau bentrok versi cloud menang.

export const SYNC_KEYS = [
  'pjd',
  'todayInputs',
  'breakdown',
  'breakdownPerVariant',
  'targetBulanLalu',
  'targetTahunLalu',
  'targetPerVariant',
  'tkus',
  'archives',
  'monthStore'
] as const;

export type SyncKey = typeof SYNC_KEYS[number];
export type Syncable = Partial<Record<SyncKey, any>>;

// Berapa tingkat wadah yang diurai sampai ke "daun" (nilai di bawahnya dianggap satu kesatuan).
//  pjd: tanggal -> TKU -> sel | targetPerVariant: varian -> TKU -> item | breakdown: TKU -> larik 31 hari
const DEPTH: Record<Exclude<SyncKey, 'tkus'>, number> = {
  pjd: 2,
  todayInputs: 1,
  breakdown: 1,
  breakdownPerVariant: 2,
  targetBulanLalu: 1,
  targetTahunLalu: 1,
  targetPerVariant: 2,
  archives: 1,
  monthStore: 1
};

export interface MergeStats {
  conflicts: number;    // keduanya berubah beda -> lokal menang
  localDeletes: number; // penghapusan oleh HP ini yang diteruskan ke cloud
  leaves: number;       // jumlah bagian yang dibandingkan
}

export interface MergeResult {
  merged: Syncable;
  stats: MergeStats;
  usedBase: boolean;
}

const isContainer = (x: any): boolean => x !== null && typeof x === 'object';

const definedKeys = (o: any): string[] => Object.keys(o).filter(k => o[k] !== undefined);

// Perbandingan isi tanpa peduli urutan kunci (jsonb di Postgres mengurutkan ulang kunci objek).
export function deepEq(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return typeof a === 'number' ? (Number.isNaN(a) && Number.isNaN(b)) : false;
  const aa = Array.isArray(a);
  if (aa !== Array.isArray(b)) return false;
  if (aa) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEq(a[i], b[i])) return false;
    return true;
  }
  const ka = definedKeys(a);
  const kb = definedKeys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (b[k] === undefined) return false;
    if (!deepEq(a[k], b[k])) return false;
  }
  return true;
}

function leaf(b: any, l: any, r: any, nb: boolean, cx: MergeStats): any {
  cx.leaves++;
  if (deepEq(l, r)) return l;
  if (nb) return r !== undefined ? r : l;
  const lChanged = !deepEq(l, b);
  const rChanged = !deepEq(r, b);
  if (!lChanged) return r;
  if (!rChanged) {
    if (l === undefined && r !== undefined && b !== undefined) cx.localDeletes++;
    return l;
  }
  cx.conflicts++;
  if (l === undefined) return r;
  return l;
}

function m3(b: any, l: any, r: any, depth: number, nb: boolean, cx: MergeStats): any {
  const canDescend =
    depth > 0 &&
    !(l === undefined && r === undefined) &&
    (l === undefined || isContainer(l)) &&
    (r === undefined || isContainer(r)) &&
    (b === undefined || isContainer(b));
  if (!canDescend) return leaf(b, l, r, nb, cx);

  const lo = l ?? {};
  const ro = r ?? {};
  const bo = b ?? {};
  const asArray = Array.isArray(l) || Array.isArray(r);
  const keys = new Set<string>([...definedKeys(lo), ...definedKeys(ro)]);
  const out: any = asArray ? [] : {};
  keys.forEach(k => {
    const v = m3(bo[k], lo[k], ro[k], depth - 1, nb, cx);
    if (v !== undefined) out[k] = v;
  });
  return out;
}

const tkusById = (a: any): Record<string, any> => {
  const o: Record<string, any> = {};
  if (Array.isArray(a)) {
    a.forEach(t => {
      if (t && t.id !== undefined && t.id !== null) o[String(t.id)] = t;
    });
  }
  return o;
};

function runMerge(base: Syncable | null, local: Syncable, remote: Syncable, nb: boolean): { merged: Syncable; stats: MergeStats } {
  const stats: MergeStats = { conflicts: 0, localDeletes: 0, leaves: 0 };
  const out: Syncable = {};

  SYNC_KEYS.forEach(key => {
    if (key === 'tkus') {
      const lt = local.tkus;
      const rt = remote.tkus;
      if (!Array.isArray(lt) && !Array.isArray(rt)) return;
      const bm = !nb && base && Array.isArray(base.tkus) ? tkusById(base.tkus) : undefined;
      const merged = m3(bm, tkusById(lt), tkusById(rt), 2, nb || bm === undefined, stats) || {};
      // Urutan: ikut HP ini dulu, lalu TKU yang hanya ada di cloud.
      const order: string[] = [];
      const push = (t: any) => {
        const id = t && t.id !== undefined && t.id !== null ? String(t.id) : null;
        if (id !== null && id in merged && !order.includes(id)) order.push(id);
      };
      (Array.isArray(lt) ? lt : []).forEach(push);
      (Array.isArray(rt) ? rt : []).forEach(push);
      Object.keys(merged).forEach(id => { if (!order.includes(id)) order.push(id); });
      out.tkus = order.map(id => merged[id]);
      return;
    }
    const v = m3(base ? base[key] : undefined, local[key], remote[key], DEPTH[key], nb, stats);
    if (v !== undefined) out[key] = v;
  });

  return { merged: out, stats };
}

export function mergeSyncable(
  base: Syncable | null,
  local: Syncable,
  remote: Syncable,
  opts: { guard?: boolean } = {}
): MergeResult {
  let nb = base === null;
  let res = runMerge(base, local, remote, nb);
  // Pengaman: kalau tiba-tiba sangat banyak data "terhapus" oleh HP ini, curigai base-nya
  // (mis. HP belum sempat menerapkan hasil gabungan sebelumnya) lalu gabungkan tanpa penghapusan.
  if (!nb && opts.guard && res.stats.localDeletes > 5 && res.stats.localDeletes > 0.2 * res.stats.leaves) {
    nb = true;
    res = runMerge(base, local, remote, true);
  }
  return { merged: res.merged, stats: res.stats, usedBase: !nb };
}

// Ambil hanya bagian yang digabung dari payload cloud / state.
export function pickSyncable(payload: any): Syncable {
  const out: Syncable = {};
  if (!payload || typeof payload !== 'object') return out;
  SYNC_KEYS.forEach(k => {
    if (payload[k] !== undefined) out[k] = payload[k];
  });
  return out;
}
