// Tes penggabungan data antar HP. Jalankan: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSyncable } from '../src/services/syncMerge.ts';

const rec = (x: number) => ({ v: [x, 0, 0, 0], b: [0, 0, 0, 0], sold: x });
const day = (obj: any) => obj;

test('dua HP mengisi sel berbeda: keduanya tersimpan', () => {
  const base: any = { pjd: { '2026-10-05': { 0: rec(1) } } };
  const local: any = { pjd: { '2026-10-05': { 0: rec(1), 1: rec(2) } } };
  const remote: any = { pjd: { '2026-10-05': { 0: rec(1) }, '2026-10-06': { 0: rec(9) } } };
  const m: any = mergeSyncable(base, local, remote).merged;
  assert.ok(m.pjd['2026-10-05'][1], 'isian HP ini hilang');
  assert.ok(m.pjd['2026-10-06'][0], 'isian HP lain hilang');
  assert.ok(m.pjd['2026-10-05'][0], 'data lama hilang');
});

test('hjd ikut digabung per sel (bukan ditimpa utuh)', () => {
  const base: any = { hjd: { '2026-10-05': { 0: { a: 1 } } } };
  const local: any = { hjd: { '2026-10-05': { 0: { a: 1 }, 1: { a: 2 } } } };
  const remote: any = { hjd: { '2026-10-05': { 0: { a: 1 } }, '2026-10-06': { 0: { a: 9 } } } };
  const m: any = mergeSyncable(base, local, remote).merged;
  assert.deepEqual(m.hjd, { '2026-10-05': { 0: { a: 1 }, 1: { a: 2 } }, '2026-10-06': { 0: { a: 9 } } });
});

test('base lama tanpa hjd (HP belum diperbarui): tidak ada data hilang', () => {
  const local: any = { hjd: { '2026-10-05': { 1: { a: 2 } } } };
  const remote: any = { hjd: { '2026-10-06': { 0: { a: 9 } } } };
  const r = mergeSyncable({} as any, local, remote);
  assert.ok((r.merged as any).hjd['2026-10-05'][1]);
  assert.ok((r.merged as any).hjd['2026-10-06'][0]);
  assert.equal(r.stats.localDeletes, 0);
});

test('tanpa base (HP baru): tidak pernah menghapus data cloud', () => {
  const local: any = { sisaStock: {} , pjd: {} };
  const remote: any = { pjd: { '2026-10-05': { 0: rec(3) } } };
  const m: any = mergeSyncable(null, local, remote).merged;
  assert.ok(m.pjd['2026-10-05'][0], 'data cloud terhapus oleh HP baru');
});

test('penjualan harian TIDAK pernah terhapus lewat sinkronisasi (sengaja: anti-kehilangan data)', () => {
  const base: any = { pjd: { '2026-10-05': { 0: rec(1), 1: rec(2) } } };
  const withBoth: any = { pjd: { '2026-10-05': { 0: rec(1), 1: rec(2) } } };
  const without: any = { pjd: { '2026-10-05': { 0: rec(1) } } };
  // HP ini menghapus, cloud tidak berubah -> data tetap ada
  assert.ok((mergeSyncable(base, without, withBoth).merged as any).pjd['2026-10-05'][1]);
  // HP lain menghapus, HP ini tidak berubah -> data tetap ada
  assert.ok((mergeSyncable(base, withBoth, without).merged as any).pjd['2026-10-05'][1]);
});

test('penjualan harian bentrok: yang punya cap waktu (u) lebih baru yang dipakai', () => {
  const older: any = { pjd: { '2026-10-05': { 0: { ...rec(1), u: 1000 } } } };
  const newer: any = { pjd: { '2026-10-05': { 0: { ...rec(9), u: 2000 } } } };
  assert.equal((mergeSyncable(older, older, newer).merged as any).pjd['2026-10-05'][0].sold, 9);
  assert.equal((mergeSyncable(older, newer, older).merged as any).pjd['2026-10-05'][0].sold, 9);
});

test('hjd: penghapusan oleh satu HP diteruskan bila HP lain tidak mengubahnya', () => {
  const base: any = { hjd: { '2026-10-05': { 0: { a: 1 }, 1: { a: 2 } } } };
  const without: any = { hjd: { '2026-10-05': { 0: { a: 1 } } } };
  const m: any = mergeSyncable(base, without, base).merged;
  assert.equal(m.hjd['2026-10-05'][1], undefined);
});

test('HP ini menghapus tapi cloud mengubah: versi cloud dipertahankan', () => {
  const base: any = { pjd: { '2026-10-05': { 0: rec(1), 1: rec(2) } } };
  const local: any = { pjd: { '2026-10-05': { 0: rec(1) } } };
  const remote: any = { pjd: { '2026-10-05': { 0: rec(1), 1: rec(7) } } };
  const m: any = mergeSyncable(base, local, remote).merged;
  assert.ok(m.pjd['2026-10-05'][1], 'perubahan cloud hilang karena penghapusan lokal');
});

test('target (targetPerVariant) berbeda sel: dua-duanya masuk', () => {
  const base: any = { targetPerVariant: { YO: { 0: { tg: 1, bl: 0, ty: 0 } }, OM: {}, OS: {}, YT: {} } };
  const local: any = { targetPerVariant: { YO: { 0: { tg: 5, bl: 0, ty: 0 } }, OM: {}, OS: {}, YT: {} } };
  const remote: any = { targetPerVariant: { YO: { 0: { tg: 1, bl: 0, ty: 0 } }, OM: { 0: { tg: 3, bl: 0, ty: 0 } }, OS: {}, YT: {} } };
  const m: any = mergeSyncable(base, local, remote).merged;
  assert.equal(m.targetPerVariant.YO[0].tg, 5);
  assert.equal(m.targetPerVariant.OM[0].tg, 3);
});

test('pengaman: penghapusan massal dicurigai, tidak menghapus data cloud', () => {
  const dates: any = {};
  for (let d = 1; d <= 20; d++) dates[`2026-10-${String(d).padStart(2, '0')}`] = { 0: rec(d) };
  const r = mergeSyncable(dates && { pjd: dates } as any, { pjd: {} } as any, { pjd: dates } as any, { guard: true });
  assert.equal(Object.keys((r.merged as any).pjd).length, 20, 'data cloud terhapus massal');
});

test('arsip: editan lokal dengan timestamp u lebih baru menang meskipun remote terkunci', () => {
  const remoteArc = {
    periode: '2026-09',
    namaBulan: 'September 2026',
    d: 30,
    terkunci: true,
    u: 1000,
    rows: [{ nama: 'JEMBER 1', absenYl: 0, frekuensiAbsen: 0 }]
  };
  const localArc = {
    periode: '2026-09',
    namaBulan: 'September 2026',
    d: 30,
    terkunci: false,
    u: 2000,
    rows: [{ nama: 'JEMBER 1', absenYl: 5, frekuensiAbsen: 12 }]
  };
  const res: any = mergeSyncable(null, { archives: { '2026-09': localArc } } as any, { archives: { '2026-09': remoteArc } } as any);
  assert.equal(res.merged.archives['2026-09'].rows[0].absenYl, 5, 'editan absen lokal terhapus');
  assert.equal(res.merged.archives['2026-09'].rows[0].frekuensiAbsen, 12, 'editan frekuensi lokal terhapus');
});

test('arsip: catatan digabung sehingga tidak hilang saat salah satu sisi diperbarui', () => {
  const remoteArc = {
    periode: '2026-09',
    namaBulan: 'September 2026',
    d: 30,
    terkunci: true,
    u: 1000,
    catatan: { n: { '2026-W36-0': { isi: 'Catatan minggu 1' } }, r: {} },
    rows: [{ nama: 'JEMBER 1', absenYl: 0 }]
  };
  const localArc = {
    periode: '2026-09',
    namaBulan: 'September 2026',
    d: 30,
    terkunci: false,
    u: 2000,
    rows: [{ nama: 'JEMBER 1', absenYl: 3 }]
  };
  const res: any = mergeSyncable(null, { archives: { '2026-09': localArc } } as any, { archives: { '2026-09': remoteArc } } as any);
  assert.equal(res.merged.archives['2026-09'].rows[0].absenYl, 3);
  assert.ok(res.merged.archives['2026-09'].catatan?.n['2026-W36-0'], 'catatan hilang saat sync');
});

