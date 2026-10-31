// Tes pindah bulan, arsip, dan peringatan gagal simpan. Jalankan: npm test
import './setup.ts';
import { fake } from './setup.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultState, switchWorkingPeriod, captureMonthSnapshot, getPeriodInfo,
  getArchiveGateStatus, buildArchiveFromState, saveAppState, setLocalSaveHandler, synchronizeAppState
} from '../src/services/storage.ts';

const strip = (s: any) => JSON.stringify({ ...s, savedAt: '' });

function stateWithSales() {
  const st: any = getDefaultState();
  const key = getPeriodInfo(st).key;
  const date = `${key}-03`;
  st.pjd = { ...st.pjd, [date]: { ...(st.pjd?.[date] || {}), 0: { v: [100, 10, 5, 2], b: [0, 0, 0, 0], sold: 117, bb: 0, pdmV: [0, 0, 0, 0], pdm: 0, yl: 10, ar: 5, u: 1 } } };
  // Hitung ulang angka akumulasi dari data harian, seperti yang dilakukan aplikasi setelah input.
  return { st: synchronizeAppState(st) as any, key, date };
}

function nextKey(key: string) {
  const [y, m] = key.split('-').map(Number);
  const i = y * 12 + (m - 1) + 1;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

test('pindah bulan lalu kembali: angka bulan asal sama persis', () => {
  const { st, key } = stateWithSales();
  const before = captureMonthSnapshot(st, key);
  const there = switchWorkingPeriod(st, nextKey(key));
  assert.notEqual(getPeriodInfo(there).key, key);
  const back = switchWorkingPeriod(there, key);
  assert.equal(getPeriodInfo(back).key, key);
  assert.equal(strip(captureMonthSnapshot(back, key)), strip(before));
});

test('pindah bulan menyimpan bulan lama utuh di monthStore', () => {
  const { st, key } = stateWithSales();
  const there: any = switchWorkingPeriod(st, nextKey(key));
  assert.ok(there.monthStore?.[key], 'foto bulan lama tidak tersimpan');
  assert.equal(strip(there.monthStore[key]), strip(captureMonthSnapshot(st, key)));
});

test('pindah bulan tidak mengubah pjd, hjd, dan arsip', () => {
  const { st, key } = stateWithSales();
  const there: any = switchWorkingPeriod(st, nextKey(key));
  assert.deepEqual(there.pjd, st.pjd);
  assert.deepEqual(there.hjd, st.hjd);
  assert.deepEqual(there.archives, st.archives);
});

test('bulan baru mulai kosong untuk penjualan', () => {
  const { st, key } = stateWithSales();
  const there: any = switchWorkingPeriod(st, nextKey(key));
  const snap = captureMonthSnapshot(there, nextKey(key));
  const total = Object.values(snap.tkuMonthly).reduce((a: number, t: any) => a + (t.penjualanAkm || []).reduce((x: number, y: number) => x + y, 0), 0);
  assert.equal(total, 0);
});

test('kunci pindah bulan: belum diarsip -> belum; sesudah arsip -> tersimpan; berubah -> berubah', () => {
  const { st, key } = stateWithSales();
  assert.equal(getArchiveGateStatus(st), 'belum');
  const archived: any = { ...st, archives: { ...st.archives, [key]: buildArchiveFromState(st) } };
  assert.equal(getArchiveGateStatus(archived), 'tersimpan');
  const changed: any = synchronizeAppState({ ...archived, pjd: { ...archived.pjd, [`${key}-04`]: { 0: { ...archived.pjd[`${key}-03`][0], v: [999, 0, 0, 0], sold: 999, u: 2 } } } } as any);
  assert.equal(getArchiveGateStatus(changed), 'berubah');
});

test('arsip: total tiap TKU = jumlah empat varian', () => {
  const { st } = stateWithSales();
  const arc: any = buildArchiveFromState(st);
  for (const row of arc.rows) {
    const sum = row.varian.reduce((a: number, b: number) => a + b, 0);
    assert.equal(Math.round(row.total), Math.round(sum), `total ${row.nama} tidak sama dengan jumlah varian`);
  }
});

test('gagal simpan di HP: peringatan muncul sekali, lalu hilang saat pulih', async () => {
  const calls: boolean[] = [];
  setLocalSaveHandler(ok => calls.push(ok));
  const st: any = getDefaultState();
  const origErr = console.error; console.error = () => {};
  try {
    saveAppState(st);
    fake.full = true; saveAppState(st); saveAppState(st);
    fake.full = false; saveAppState(st);
  } finally { console.error = origErr; setLocalSaveHandler(null); }
  await new Promise(r => setTimeout(r, 20));
  assert.deepEqual(calls, [false, true]);
});
