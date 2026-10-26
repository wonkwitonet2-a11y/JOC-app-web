import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, TkuItem, DailySalesRecord, SupabaseConfig, ArchiveRecord, ArchiveRow, SisaStockRecord, MonthSnapshot, TkuMonthlyFields, WeeklyNote, WeeklyReply } from '../types';
import {
  INITIAL_TKUS,
  INITIAL_TARGET_BL,
  INITIAL_TARGET_TY,
  INITIAL_ARCHIVES,
  INITIAL_QUOTES,
  INITIAL_PJD,
  INITIAL_DAILY_HISTORY
} from '../data/initialData';
import { DEFAULT_SUPABASE_CONFIG } from '../config/defaultSupabase';
import { SYNC_KEYS, Syncable, deepEq, mergeSyncable, pickSyncable } from './syncMerge';

export const STORAGE_KEY = 'yakult_sales_system_v11';
export const SESSION_KEY = 'yk_sesi_v11';
export const LAST_ACTIVE_KEY = 'yk_last_active_v11';
export const SESSION_EXPIRED_FLAG_KEY = 'yk_session_expired_flag';
export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 menit (600.000 ms)

export function recordSessionActivity() {
  try {
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVE_KEY, String(now));
    const sessionRaw = localStorage.getItem(SESSION_KEY);
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      session.lastActive = now;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch (_) {}
}

export function clearAppSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
  } catch (_) {}
}

export function saveAppSession(role: 'a' | 't', tkuId?: number) {
  try {
    const now = Date.now();
    localStorage.setItem(LAST_ACTIVE_KEY, String(now));
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      role,
      tkuId,
      lastActive: now
    }));
  } catch (_) {}
}

export function isSessionExpired(): boolean {
  try {
    const sessionRaw = localStorage.getItem(SESSION_KEY);
    if (!sessionRaw) return false;
    const session = JSON.parse(sessionRaw);
    if (!session?.role) return false;
    const lastActiveRaw = localStorage.getItem(LAST_ACTIVE_KEY);
    const lastActive = Math.max(Number(session.lastActive) || 0, Number(lastActiveRaw) || 0);
    if (lastActive > 0 && Date.now() - lastActive > INACTIVITY_TIMEOUT_MS) {
      return true;
    }
  } catch (_) {}
  return false;
}

const DATA_VERSION = '20260930_OFFICIAL_SPREADSHEET_V11';
// Bulan yang datanya sudah "ditanam" dari spreadsheet resmi (INITIAL_TKUS, INITIAL_PJD, dst.).
// Bulan lain TIDAK boleh memakai angka dasar ini (supaya bulan baru benar-benar kosong).
export const SEED_PERIOD = '2026-09';

// ---- Vault Cadangan Abadi Sisa Stock & Data (Anti-Reset & Tahan Perubahan Kode) ----
export const SISA_STOCK_BACKUP_KEY = 'yk_sisa_stock_vault_v1';
export const SAFETY_STATE_BACKUP_KEY = 'yk_state_safety_vault_v1';

export function saveSisaStockBackup(stock: Record<number, SisaStockRecord> | undefined): void {
  try {
    if (stock && typeof stock === 'object' && Object.keys(stock).length > 0) {
      localStorage.setItem(SISA_STOCK_BACKUP_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        stock
      }));
    }
  } catch (_) {}
}

export function loadSisaStockBackup(): Record<number, SisaStockRecord> {
  try {
    const raw = localStorage.getItem(SISA_STOCK_BACKUP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.stock && typeof parsed.stock === 'object') {
        return parsed.stock;
      }
    }
  } catch (_) {}
  return {};
}

// ---- Supabase (cloud sync) ----
// Data disimpan sebagai satu baris JSON di tabel app_store (key "main_state"),
// supaya struktur AppState yang sudah ada tidak perlu dipecah jadi banyak tabel.
const REMOTE_KEY = 'main_state';
export const SUPABASE_VAULT_KEY = 'yk_supabase_credentials_vault_v1';
let cachedClient: SupabaseClient | null = null;
let cachedConfigSig = '';

// Vault terisolasi khusus Supabase yang tidak akan terhapus saat pembersihan/reset state harian
export function loadSupabaseConfigFromVault(): SupabaseConfig {
  try {
    // 1. Cek vault utama
    const vaultRaw = localStorage.getItem(SUPABASE_VAULT_KEY);
    if (vaultRaw) {
      const parsed = JSON.parse(vaultRaw);
      // Jika pengguna sengaja memutuskan koneksi di menu setting pada perangkat ini
      if (parsed && parsed.disconnected === true) {
        return { u: '', k: '', locked: false };
      }
      if (parsed && typeof parsed.u === 'string' && typeof parsed.k === 'string' && (parsed.u.trim() || parsed.k.trim())) {
        return {
          u: parsed.u.trim(),
          k: parsed.k.trim(),
          locked: Boolean(parsed.locked)
        };
      }
    }

    // 2. Jika di vault belum ada, selamatkan dari semua riwayat key versi sebelumnya
    const legacyKeys = [
      STORAGE_KEY,
      'yakult_sales_system_v9',
      'yakult_sales_system_v8',
      'yakult_sales_system_v7',
      'yakult_sales_system_v6',
      'yakult_sales_system_v5',
      'yakult_sales_system_v4',
      'yakult_sales_system_v3',
      'yakult_sales_system_v2',
      'yakult_sales_system_v1',
      'yk_supabase_config',
      'supabase_config'
    ];

    for (const key of legacyKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const cfg = parsed.supabaseConfig || (parsed.u && parsed.k ? parsed : null);
          if (cfg && typeof cfg.u === 'string' && typeof cfg.k === 'string' && (cfg.u.trim() || cfg.k.trim())) {
            const rescued: SupabaseConfig = {
              u: cfg.u.trim(),
              k: cfg.k.trim(),
              locked: Boolean(cfg.locked)
            };
            saveSupabaseConfigToVault(rescued);
            return rescued;
          }
        }
      } catch (_) {}
    }
  } catch (err) {
    console.warn('Gagal membaca vault Supabase:', err);
  }

  // 3. Kredensial bawaan permanen dari DEFAULT_SUPABASE_CONFIG (aktif otomatis di semua perangkat)
  if (DEFAULT_SUPABASE_CONFIG.u && DEFAULT_SUPABASE_CONFIG.k) {
    return {
      u: DEFAULT_SUPABASE_CONFIG.u.trim(),
      k: DEFAULT_SUPABASE_CONFIG.k.trim(),
      locked: Boolean(DEFAULT_SUPABASE_CONFIG.locked)
    };
  }

  // 4. Opsional: kredensial bawaan dari environment build (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
  try {
    const env = (import.meta as any).env || {};
    const du = String(env.VITE_SUPABASE_URL || '').trim();
    const dk = String(env.VITE_SUPABASE_ANON_KEY || '').trim();
    if (du && dk) return { u: du, k: dk, locked: true };
  } catch (_) {}

  return { u: '', k: '', locked: false };
}

export function saveSupabaseConfigToVault(config: SupabaseConfig) {
  try {
    if (!config) return;
    const isDisconnected = !(config.u || '').trim() && !(config.k || '').trim();
    const clean = {
      u: (config.u || '').trim(),
      k: (config.k || '').trim(),
      locked: Boolean(config.locked),
      disconnected: isDisconnected
    };
    localStorage.setItem(SUPABASE_VAULT_KEY, JSON.stringify(clean));
  } catch (err) {
    console.warn('Gagal menyimpan vault Supabase:', err);
  }
}

function getSupabaseClient(config: SupabaseConfig | undefined | null): SupabaseClient | null {
  const activeConfig = (config && config.u && config.k) ? config : loadSupabaseConfigFromVault();
  if (!activeConfig || !activeConfig.u || !activeConfig.k) return null;
  const url = activeConfig.u.trim();
  const key = activeConfig.k.trim();
  if (!url || !key) return null;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return null;
  const sig = url + '|' + key;
  if (cachedClient && cachedConfigSig === sig) return cachedClient;
  try {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false }
    });
    cachedConfigSig = sig;
    return cachedClient;
  } catch (err) {
    console.warn('Konfigurasi Supabase tidak valid:', err);
    cachedClient = null;
    cachedConfigSig = '';
    return null;
  }
}

// ---- Penghemat egress ----
// Catatan versi sinkronisasi terakhir di perangkat ini (localStorage):
//  - ts   : waktu updated_at baris remote yang terakhir kita tahu (ms)
//  - hash : sidik jari data (tanpa field tampilan) saat itu
//  - u    : URL project Supabase (supaya catatan tidak tertukar antar project)
// Dipakai untuk (1) melewati download kalau data cloud belum berubah, dan
// (2) melewati upload kalau tidak ada data yang benar-benar berubah.
const SYNC_META_KEY = 'yakult_sb_sync_meta_v1';

interface SyncMeta { ts: number; hash: string; u: string; tok?: string; mode?: 'version' | 'updated_at'; }

// Field yang hanya soal tampilan / turunan kalender. Berubah saat pindah menu, ganti
// tema, atau ganti hari, tetapi bukan data penjualan, jadi tidak perlu memicu upload.
const VOLATILE_KEYS = [
  'role', 'activeTkuId', 'currentMenu', 'selectedRayon', 'theme',
  'activeDate', 'currentDayNum', 'pembagiHari', 'pembagiHariMode'
] as const;

function cyrb53(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + ':' + str.length;
}

// Catatan harian kosong (semua nol) yang dibuat otomatis saat ganti hari bukan data baru,
// jadi tidak boleh membuat HP dianggap "punya perubahan belum terkirim".
const isBlankDaily = (r: any): boolean => {
  if (!r || typeof r !== 'object') return true;
  const zeros = (a: any) => !Array.isArray(a) || a.every((x: any) => !Number(x));
  return zeros(r.v) && zeros(r.b) && zeros(r.pdmV) &&
    !Number(r.sold) && !Number(r.bb) && !Number(r.pdm) &&
    !Number(r.absen) && !Number(r.frek) && !Number(r.l250) && !Number(r.l300) && !Number(r.jwpCustom);
};

export function computeSyncHash(state: AppState): string {
  const rest: Record<string, unknown> = { ...(state as unknown as Record<string, unknown>) };
  VOLATILE_KEYS.forEach(k => { delete rest[k]; });
  delete rest.supabaseConfig;
  const ti = rest.todayInputs as Record<string, any> | undefined;
  if (ti && typeof ti === 'object') {
    const filled: Record<string, any> = {};
    Object.keys(ti).forEach(k => { if (!isBlankDaily(ti[k])) filled[k] = ti[k]; });
    rest.todayInputs = filled;
  }
  return cyrb53(JSON.stringify(rest));
}

// ---- Sinyal real-time (Supabase Realtime Broadcast) ----
// Setelah satu HP berhasil menyimpan, ia mengirim sinyal KECIL (beberapa byte, tanpa isi data) ke HP lain.
// HP lain lalu menjalankan sinkron biasa: cek token ringan dulu, unduh data penuh hanya kalau memang berubah.
// Jadi hemat egress: data penuh tidak pernah dikirim lewat sinyal. Kalau sinyal terlewat (offline / koneksi
// putus), cek berkala di App tetap menjadi jaring pengaman.
const PING_CHANNEL = 'yk-sync';
let pingChannel: any = null;
let pingChannelReady = false;
let pingChannelSig = '';

export function subscribeSyncPing(config: SupabaseConfig | undefined | null, onPing: () => void): () => void {
  const client = getSupabaseClient(config);
  if (!client || !config) return () => {};
  try {
    const sig = config.u.trim() + '|' + config.k.trim();
    pingChannelReady = false;
    pingChannelSig = sig;
    const ch = client.channel(PING_CHANNEL, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'changed' }, () => { onPing(); });
    ch.subscribe((status: string) => {
      if (pingChannelSig !== sig) return;
      pingChannelReady = status === 'SUBSCRIBED';
      // Tersambung kembali setelah putus: kemungkinan ada perubahan yang terlewat, cek sekali.
      if (status === 'SUBSCRIBED') onPing();
    });
    pingChannel = ch;
    return () => {
      pingChannelReady = false;
      if (pingChannel === ch) pingChannel = null;
      try { client.removeChannel(ch); } catch (_) { /* abaikan */ }
    };
  } catch (err) {
    console.warn('Realtime sinyal gagal diaktifkan (memakai cek berkala):', err);
    return () => {};
  }
}

async function sendSyncPing(): Promise<void> {
  try {
    if (!pingChannel || !pingChannelReady) return;
    await pingChannel.send({ type: 'broadcast', event: 'changed', payload: { t: Date.now() } });
  } catch (_) {
    // Sinyal hanya pemercepat: gagal tidak masalah, cek berkala tetap jalan.
  }
}

// Cadangan bergulir di Supabase (14 slot, baris terpisah dari main_state): kalau suatu hari data utama
// rusak / tertimpa / aplikasi diperbaiki dan datanya kacau, salinan beberapa hari terakhir masih ada.
// Hanya upload (tidak menambah egress), maksimal sekali per 30 menit per HP.
const SNAP_FLAG = 'yakult_sb_snapshot_at_v1';
async function maybeSaveRollingSnapshot(client: SupabaseClient, payload: unknown): Promise<void> {
  try {
    const last = Number(localStorage.getItem(SNAP_FLAG) || 0);
    if (Date.now() - last < 30 * 60 * 1000) return;
    const now = new Date();
    const dayOfYear = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86400000);
    const { error } = await client.from('app_store').upsert({
      key: `snapshot_slot_${dayOfYear % 14}`,
      value: { savedAt: now.toISOString(), data: payload },
      updated_at: now.toISOString()
    });
    if (!error) localStorage.setItem(SNAP_FLAG, String(Date.now()));
  } catch (_) {
    // cadangan bersifat tambahan: gagal tidak boleh mengganggu sinkronisasi utama
  }
}

// Buat payload bersih untuk cloud: buang kredensial supabaseConfig, preferensi UI lokal, dll.
// Buat payload bersih untuk cloud: buang kredensial supabaseConfig, preferensi UI lokal, dll.
// Hanya arsip yang memang ada di INITIAL_ARCHIVES bawaan yang dianggap statis
const isStaticArchiveKey = (k: string): boolean => Boolean(INITIAL_ARCHIVES[k]);

export function sanitizeStateForCloud(state: AppState): Partial<AppState> {
  const clean: Record<string, unknown> = { ...(state as unknown as Record<string, unknown>) };
  VOLATILE_KEYS.forEach(k => { delete clean[k]; });
  delete clean.supabaseConfig; // Kredensial rahasia tidak disimpan di database cloud

  if (clean.archives && typeof clean.archives === 'object') {
    const userArchives: Record<string, unknown> = {};
    Object.keys(clean.archives as Record<string, unknown>).forEach(k => {
      if (!isStaticArchiveKey(k)) {
        userArchives[k] = (clean.archives as Record<string, unknown>)[k];
      }
    });
    clean.archives = userArchives;
  }

  return clean as Partial<AppState>;
}

function readSyncMeta(config: SupabaseConfig | undefined | null): SyncMeta | null {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as SyncMeta;
    if (!m || !config || m.u !== config.u.trim()) return null;
    return m;
  } catch {
    return null;
  }
}

function writeSyncMeta(config: SupabaseConfig, ts: number, hash: string, tok?: string) {
  try {
    localStorage.setItem(
      SYNC_META_KEY,
      JSON.stringify({ ts, hash, u: config.u.trim(), tok: tok ?? '', mode: tokenMode })
    );
  } catch (_) {
    // abaikan
  }
}

// Salinan isi cloud saat terakhir sinkron (hanya bagian yang digabung): titik awal untuk gabungan tiga arah.
const SYNC_BASE_KEY = 'yakult_sb_sync_base_v1';

function readSyncBase(config: SupabaseConfig | undefined | null): Syncable | null {
  try {
    const raw = localStorage.getItem(SYNC_BASE_KEY);
    if (!raw || !config) return null;
    const b = JSON.parse(raw) as { u: string; data: Syncable };
    if (!b || b.u !== config.u.trim() || !b.data) return null;
    return b.data;
  } catch {
    return null;
  }
}

function writeSyncBase(config: SupabaseConfig, data: Syncable) {
  try {
    localStorage.setItem(SYNC_BASE_KEY, JSON.stringify({ u: config.u.trim(), data }));
  } catch (_) {
    // Kuota penuh: tanpa base, gabungan berjalan aman tanpa penghapusan.
    try { localStorage.removeItem(SYNC_BASE_KEY); } catch (_) { /* abaikan */ }
  }
}

// True kalau perangkat ini belum pernah sinkron dengan cloud (HP baru / data browser dihapus).
export function hasSyncMeta(config: SupabaseConfig | undefined | null): boolean {
  return !!readSyncMeta(config);
}

// True kalau data (di luar field tampilan) berbeda dari yang terakhir tersinkron.
export function hasUnsyncedChanges(state: AppState): boolean {
  const meta = readSyncMeta(state.supabaseConfig);
  if (!meta) return true;
  return meta.hash !== computeSyncHash(state);
}

/**
 * Terapkan hasil gabungan (bagian yang disinkronkan) ke state lokal.
 * Arsip bawaan 2025/2026-08 tidak ikut cloud, jadi dipertahankan dari lokal.
 */
export function applySyncable(state: AppState, s: Syncable): AppState {
  const next: any = { ...state };
  SYNC_KEYS.forEach(k => {
    if (k === 'archives') return;
    if (s[k] !== undefined) next[k] = s[k];
  });
  const statics: Record<string, ArchiveRecord> = {};
  Object.keys(state.archives || {}).forEach(k => {
    if (isStaticArchiveKey(k)) statics[k] = state.archives[k];
  });
  next.archives = { ...statics, ...(s.archives || {}) };
  return synchronizeAppState(next as AppState);
}

const syncableOf = (state: AppState): Syncable => pickSyncable(sanitizeStateForCloud(state));

/**
 * Dipakai setelah simpan/tarik selesai: state di layar mungkin sudah berubah (pengguna masih mengetik)
 * sejak proses dimulai. Hasil gabungan diterapkan sebagai selisih, jadi ketikan baru tidak tertimpa.
 */
export function reapplyMergedState(prev: AppState, start: AppState, merged: AppState): AppState {
  if (prev === start) return merged;
  const r = mergeSyncable(syncableOf(start), syncableOf(prev), syncableOf(merged), { guard: false });
  // Kalau gabungan ini membawa pindah bulan kerja dari cloud (lebih baru dari bulan di layar), terapkan juga.
  const mKey = getPeriodInfo(merged).key;
  const followPeriod = mKey !== getPeriodInfo(start).key && mKey > getPeriodInfo(prev).key;
  const next = applySyncable(followPeriod ? { ...prev, activePeriod: `${mKey}-01` } : prev, r.merged);
  return followPeriod ? followCloudPeriod(next, mKey) : next;
}

// Penerima hasil gabungan untuk SEMUA jalur simpan (termasuk simpan paksa), didaftarkan oleh App.
type MergedHandler = (merged: AppState, start: AppState) => void;
let mergedHandler: MergedHandler | null = null;
export function setMergedStateHandler(fn: MergedHandler | null) {
  mergedHandler = fn;
}

export type RemoteLoadResult = { state: AppState } | 'unchanged' | null;

// ---- Akses baris utama di Supabase dengan "token versi" ----
// Token = kolom `version` (angka, naik 1 tiap simpan). Kalau kolom itu belum dibuat di Supabase,
// otomatis memakai `updated_at` sebagai token. Simpan hanya berhasil kalau token di server masih
// sama dengan yang kita pegang; jadi jam HP tidak lagi menentukan siapa yang "lebih baru".
type TokenMode = 'version' | 'updated_at';
let tokenMode: TokenMode = 'version';

const isMissingVersionCol = (e: any): boolean =>
  !!e && (e.code === '42703' || e.code === 'PGRST204' || /column.*version|version.*column/i.test(String(e.message || '')));

const tokenCols = () => (tokenMode === 'version' ? 'version, updated_at' : 'updated_at');

type RowRead =
  | { ok: true; exists: boolean; tok: string; updatedAt: string; value?: any }
  | { ok: false; message: string };

async function fetchMainRow(client: SupabaseClient, withValue: boolean): Promise<RowRead> {
  for (let i = 0; i < 2; i++) {
    const cols = tokenCols() + (withValue ? ', value' : '');
    const { data, error } = await client.from('app_store').select(cols).eq('key', REMOTE_KEY).maybeSingle();
    if (error) {
      if (tokenMode === 'version' && isMissingVersionCol(error)) {
        tokenMode = 'updated_at';
        continue;
      }
      return { ok: false, message: error.message };
    }
    if (!data) return { ok: true, exists: false, tok: '', updatedAt: '' };
    const row = data as any;
    return {
      ok: true,
      exists: true,
      tok: tokenMode === 'version' ? String(row.version ?? 0) : String(row.updated_at ?? ''),
      updatedAt: String(row.updated_at ?? ''),
      value: row.value
    };
  }
  return { ok: false, message: 'Gagal membaca baris utama Supabase' };
}

type RowWrite =
  | { status: 'ok'; tok: string }
  | { status: 'conflict' }
  | { status: 'error'; message: string };

async function writeMainRow(client: SupabaseClient, payload: Partial<AppState>, exists: boolean, expectTok: string): Promise<RowWrite> {
  const nowIso = new Date().toISOString();
  const cols = tokenCols();
  const tokOf = (row: any) => (tokenMode === 'version' ? String(row.version ?? 0) : String(row.updated_at ?? ''));

  if (!exists) {
    const row: any = { key: REMOTE_KEY, value: payload, updated_at: nowIso };
    if (tokenMode === 'version') row.version = 1;
    const { data, error } = await client.from('app_store').insert(row).select(cols);
    if (error) {
      if (error.code === '23505') return { status: 'conflict' }; // baris sudah dibuat perangkat lain
      if (tokenMode === 'version' && isMissingVersionCol(error)) {
        tokenMode = 'updated_at';
        return { status: 'conflict' };
      }
      return { status: 'error', message: error.message };
    }
    const first = Array.isArray(data) ? (data[0] as any) : null;
    return { status: 'ok', tok: first ? tokOf(first) : '' };
  }

  const patch: any = { value: payload, updated_at: nowIso };
  let q: any;
  if (tokenMode === 'version') {
    patch.version = Number(expectTok) + 1;
    q = client.from('app_store').update(patch).eq('key', REMOTE_KEY).eq('version', Number(expectTok));
  } else {
    q = client.from('app_store').update(patch).eq('key', REMOTE_KEY).eq('updated_at', expectTok);
  }
  const { data, error } = await q.select(cols);
  if (error) {
    if (tokenMode === 'version' && isMissingVersionCol(error)) {
      tokenMode = 'updated_at';
      return { status: 'conflict' };
    }
    return { status: 'error', message: error.message };
  }
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return { status: 'conflict' }; // token di server sudah berubah: ada yang menyimpan duluan
  return { status: 'ok', tok: tokOf(rows[0]) };
}

// Ambil state terbaru dari Supabase dan gabungkan dengan state lokal (tiga arah).
export async function loadStateFromSupabase(
  config: SupabaseConfig | undefined | null,
  currentState?: AppState
): Promise<RemoteLoadResult> {
  const client = getSupabaseClient(config);
  if (!client || !config) return null;
  try {
    const known = readSyncMeta(config);
    const local = currentState || getDefaultState();

    // Cek murah dulu: hanya token, bukan JSON besar.
    const head = await fetchMainRow(client, false);
    if (!head.ok) {
      console.warn('Supabase sync (load info):', head.message);
      return null;
    }
    if (!head.exists) return null;
    if (known && known.tok && known.mode === tokenMode && known.tok === head.tok) return 'unchanged';

    const full = await fetchMainRow(client, true);
    if (!full.ok) {
      console.warn('Supabase sync (load):', full.message);
      return null;
    }
    if (!full.exists || !full.value) return null;

    const remoteSync = pickSyncable(full.value);
    const localHash = computeSyncHash(local);
    const localClean = !!known && known.hash === localHash;

    let base = readSyncBase(config);
    // Lokal persis sama dengan yang terakhir tersinkron: bisa dijadikan titik awal bersama.
    if (!base && localClean) base = syncableOf(local);

    const r = mergeSyncable(base, syncableOf(local), remoteSync, { guard: false });
    // Bulan kerja (activePeriod) bukan bagian data yang digabung, jadi diikuti terpisah:
    // kalau cloud sudah di bulan yang LEBIH BARU, HP ini ikut pindah (tidak pernah mundur otomatis).
    const remotePeriodKey = String((full.value as any)?.activePeriod || '').slice(0, 7);
    const followPeriod = shouldFollowCloudPeriod(local, remotePeriodKey);
    const mergedSync = followPeriod
      ? resolveMergeForFollow(r.merged, syncableOf(local), remoteSync, base, getPeriodInfo(local).key, remotePeriodKey)
      : r.merged;
    let merged = applySyncable(followPeriod ? { ...local, activePeriod: `${remotePeriodKey}-01` } : local, mergedSync);
    if (followPeriod) merged = followCloudPeriod(merged, remotePeriodKey);

    // Tanggal aktif harus mengikuti bulan kerja yang tersimpan di cloud jika beda
    const remoteAct = computeActiveDate(merged.activePeriod);
    merged = { ...merged, activeDate: remoteAct.date, currentDayNum: remoteAct.day, pembagiHari: remoteAct.day };

    // Masih ada perubahan lokal yang belum ada di cloud? Tandai "belum tersinkron" supaya terkirim.
    const hasLocalOnly = known ? !localClean : !deepEq(r.merged, remoteSync);
    const remoteTs = Date.parse(full.updatedAt || '');
    writeSyncBase(config, remoteSync);
    writeSyncMeta(config, isNaN(remoteTs) ? 0 : remoteTs, hasLocalOnly ? 'belum-terkirim' : computeSyncHash(merged), full.tok);
    return { state: merged };
  } catch (err) {
    console.warn('Supabase sync fallback ke lokal:', err);
    return null;
  }
}

const MAX_SAVE_TRIES = 4;

// Simpan state ke Supabase dengan cek versi di server (compare-and-swap).
// Kalau perangkat lain sudah menyimpan duluan: tarik, gabungkan tiga arah, coba lagi (maks. 4 kali).
// Perangkat yang belum punya catatan sinkron TIDAK pernah menimpa membabi buta: selalu digabung dulu.
export async function saveStateToSupabase(
  state: AppState,
  force = false,
  onMergedState?: (merged: AppState) => void
): Promise<boolean> {
  const client = getSupabaseClient(state.supabaseConfig);
  if (!client) return false;
  try {
    const hash = computeSyncHash(state);
    const meta = readSyncMeta(state.supabaseConfig);
    if (!force && meta && meta.hash === hash) return true; // sudah sama dengan cloud

    const localSync = syncableOf(state);
    let base = readSyncBase(state.supabaseConfig);
    if (!base && meta && meta.hash === hash) base = localSync;

    for (let attempt = 0; attempt < MAX_SAVE_TRIES; attempt++) {
      const head = await fetchMainRow(client, false);
      if (!head.ok) {
        console.warn('Supabase sync (save head):', head.message);
        return false; // tidak tahu kondisi cloud: jangan menimpa
      }
      const knownTok = meta && meta.tok && meta.mode === tokenMode ? meta.tok : null;

      let working = state;
      let exists = head.exists;
      let expectTok = head.tok;

      if (head.exists && head.tok !== knownTok) {
        // Cloud berubah sejak sinkron terakhir kita: tarik lalu gabungkan sebelum menyimpan.
        const full = await fetchMainRow(client, true);
        if (!full.ok) {
          console.warn('Supabase sync (save pull):', full.message);
          return false;
        }
        exists = full.exists;
        expectTok = full.tok;
        if (full.exists) {
          const r = mergeSyncable(base, localSync, pickSyncable(full.value || {}), { guard: !force });
          // Jangan sampai HP yang masih di bulan lama menurunkan bulan kerja di cloud: ikuti bulan yang lebih baru.
          const remotePeriodKey = String((full.value as any)?.activePeriod || '').slice(0, 7);
          const followPeriod = shouldFollowCloudPeriod(state, remotePeriodKey);
          const mergedSync = followPeriod
            ? resolveMergeForFollow(r.merged, localSync, pickSyncable(full.value || {}), base, getPeriodInfo(state).key, remotePeriodKey)
            : r.merged;
          working = applySyncable(followPeriod ? { ...state, activePeriod: `${remotePeriodKey}-01` } : state, mergedSync);
          if (followPeriod) working = followCloudPeriod(working, remotePeriodKey);
        }
      }

      const cleanPayload = sanitizeStateForCloud(working);
      const res = await writeMainRow(client, cleanPayload, exists, expectTok);
      if (res.status === 'conflict') continue; // ada yang menyimpan di sela-sela: ulangi dari tarik data
      if (res.status === 'error') {
        console.warn('Supabase sync (save info):', res.message);
        return false;
      }

      writeSyncBase(state.supabaseConfig, pickSyncable(cleanPayload));
      writeSyncMeta(state.supabaseConfig, Date.now(), computeSyncHash(working), res.tok);
      void maybeSaveRollingSnapshot(client, cleanPayload);
      void sendSyncPing();
      if (working !== state && computeSyncHash(working) !== hash) {
        // Hasil gabungan membawa data dari perangkat lain: perbarui tampilan HP ini juga.
        if (onMergedState) onMergedState(working);
        else if (mergedHandler) mergedHandler(working, state);
      }
      return true;
    }
    console.warn('Supabase sync: terlalu banyak bentrok versi, akan dicoba lagi nanti');
    return false;
  } catch (err) {
    console.warn('Supabase sync save error (data aman di lokal):', err);
    return false;
  }
}

// Uji coba koneksi Supabase secara langsung dari PengaturanView
export async function testSupabaseConnection(u: string, k: string): Promise<{ success: boolean; message: string }> {
  if (!u || !k) return { success: false, message: 'URL dan Key tidak boleh kosong' };
  const trimmedUrl = u.trim();
  const trimmedKey = k.trim();
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return { success: false, message: 'URL Supabase harus dimulai dengan https://' };
  }
  try {
    const client = createClient(trimmedUrl, trimmedKey, { auth: { persistSession: false } });
    const { error } = await client.from('app_store').select('key').limit(1);
    if (error) {
      if (error.message.includes('Invalid API key')) {
        return { success: false, message: 'API Key Supabase tidak valid. Pastikan anon public key dimasukkan dengan lengkap.' };
      }
      if (error.code === '42P01' || error.message.includes('relation "app_store" does not exist')) {
        return { success: false, message: 'Tabel "app_store" belum ditemukan di Supabase. Buat tabel app_store dengan kolom key (text), value (jsonb), updated_at (timestamptz).' };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Koneksi ke database Supabase berhasil & tabel app_store siap!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal menghubungi server Supabase' };
  }
}

export const formatNumber = (n: number | null | undefined): string => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Math.floor(n).toLocaleString('id-ID');
};

// Format angka desimal hingga 2 angka di belakang koma TANPA pembulatan ke atas (dipotong/floor).
// Jika bulat (misal 330), tampil "330". Jika ada desimal (misal 330.78), tampil "330,78" (BUKAN jadi 331).
export const formatDecimal = (n: number | null | undefined, digits = 2): string => {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return '—';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const factor = Math.pow(10, digits);
  // Potong tanpa pembulatan ke atas
  const floored = Math.floor(abs * factor + 1e-9) / factor;
  const whole = Math.floor(floored);
  const fracNum = Math.round((floored - whole) * factor);
  const wholeStr = whole.toLocaleString('id-ID');
  if (fracNum === 0 || digits === 0) return `${sign}${wholeStr}`;
  let fracStr = String(fracNum).padStart(digits, '0');
  if (fracStr.endsWith('0')) fracStr = fracStr.slice(0, -1);
  return `${sign}${wholeStr},${fracStr}`;
};

// Bulatkan ke bawah tanpa desimal (300,89 jadi 300)
export const round2 = (n: number): number => Math.floor(Number(n) || 0);

// Potong ke 2 desimal TANPA pembulatan ke atas (5160.679 -> 5160.67). Toleransi kecil untuk floating point.
export const potong2Desimal = (n: number): number => {
  const v = Number(n) || 0;
  return Math.floor(v * 100 + 1e-9) / 100;
};

// Rata-rata per hari tiap varian [YO, OM, OS, YT] dari satu baris arsip, TANPA dibulatkan ke bilangan bulat
// (hanya dipotong 2 desimal). Dihitung ulang dari total botol per varian / jumlah hari arsip, karena
// field rataVarian di arsip lama sudah terlanjur dibulatkan. Fallback ke rataVarian bila total varian tidak ada.
export const getArsipRataVarian = (
  row: { varian?: number[]; rataVarian?: number[] },
  d: number
): [number, number, number, number] => {
  if (d > 0 && Array.isArray(row.varian) && row.varian.length === 4) {
    return [0, 1, 2, 3].map(i => potong2Desimal((Number(row.varian![i]) || 0) / d)) as [number, number, number, number];
  }
  if (Array.isArray(row.rataVarian) && row.rataVarian.length === 4) {
    return [0, 1, 2, 3].map(i => potong2Desimal(Number(row.rataVarian![i]) || 0)) as [number, number, number, number];
  }
  return [0, 0, 0, 0];
};

// Rata-rata total satu TKU = jumlah rata 4 varian (yang sudah desimal), mis. 5160,67 + 500,75 + 788,09 + 500,22 = 6949,73.
export const getArsipRataTotal = (
  row: { varian?: number[]; rataVarian?: number[] },
  d: number
): number => {
  const sum = getArsipRataVarian(row, d).reduce((a, b) => a + b, 0);
  return Math.round(sum * 100) / 100; // hanya membuang sisa floating point, bukan membulatkan data
};

// Potong (BUKAN bulatkan) ke `digits` angka di belakang koma: 250,7989 -> "250.79" (digits 2) atau "250" (digits 0).
// Titik desimal sama seperti toFixed. Toleransi kecil menghindari salah hitung floating point (0.29*100 = 28.999...).
export const truncFixed = (n: number, digits = 1): string => {
  if (n === null || n === undefined || !isFinite(n) || isNaN(n)) return '—';
  const f = Math.pow(10, digits);
  const eps = n >= 0 ? 1e-9 : -1e-9;
  const t = Math.trunc(n * f + eps * Math.max(1, Math.abs(n * f))) / f;
  return (Object.is(t, -0) ? 0 : t).toFixed(digits);
};

export const formatPercent = (x: number | null | undefined): string => {
  if (x === null || x === undefined || !isFinite(x) || isNaN(x)) return '—';
  return truncFixed(x * 100, 1).replace('.', ',') + '%';
};

export const formatDiff = (n: number | null | undefined): string => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const prefix = n >= 0 ? '+' : '−';
  return `${prefix}${formatNumber(Math.abs(n))}`;
};

export const getStatusClass = (n: number | null | undefined): string => {
  if (n === null || n === undefined || isNaN(n)) return 'text-neutral-500';
  return n >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
};

/**
 * Pewarnaan standar untuk Rasio BB (% BB):
 * - < 5%   : Hijau (emerald)
 * - 5%–9.9%: Kuning / Amber
 * - >= 10% : Merah (red)
 */
export const getBbStatusClass = (pct: number | null | undefined): string => {
  if (pct === null || pct === undefined || isNaN(pct)) return 'text-neutral-500';
  const p = (pct <= 1.0 && pct >= 0) ? pct * 100 : pct;
  if (p < 5.0) {
    return 'text-emerald-600 dark:text-emerald-400 font-bold';
  } else if (p < 10.0) {
    return 'text-amber-600 dark:text-amber-400 font-bold';
  } else {
    return 'text-red-600 dark:text-red-400 font-bold';
  }
};

export const formatDateIndo = (dateStr: string): string => {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Jumlah hari di bulan kerja (activePeriod). Bulan kerja TIDAK ikut berganti otomatis
// hanya karena kalender HP sudah pindah bulan; ia baru berganti saat periode baru dibuat/disimpan.
export const getDaysInActiveMonth = (state: AppState): number => {
  try {
    const src = state.activePeriod || state.activeDate;
    if (src) {
      const parts = src.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m)) return new Date(y, m, 0).getDate();
    }
  } catch {
    // fallback
  }
  return 30;
};

// Hitung tanggal aktif (tanggal update) TANPA cut-off:
// - Hari ini masih di bulan kerja        -> tanggal hari ini (hari ini ikut dihitung walau datanya belum disimpan)
// - Kalender sudah lewat bulan kerja     -> tanggal terakhir bulan kerja (28/29/30/31)
// - Bulan kerja belum dimulai            -> tanggal 1
export const computeActiveDate = (period: string, now: Date = new Date()): { date: string; day: number } => {
  const parts = (period || '').split('-');
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  if (isNaN(y) || isNaN(m)) { y = now.getFullYear(); m = now.getMonth() + 1; }
  const daysIn = new Date(y, m, 0).getDate();
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  const perIdx = y * 12 + (m - 1);
  let day: number;
  if (nowIdx > perIdx) day = daysIn;
  else if (nowIdx === perIdx) day = Math.min(now.getDate(), daysIn);
  else day = 1;
  day = Math.max(1, day);
  return { date: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day };
};

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const NAMA_BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export interface PeriodInfo {
  year: number;
  monthIndex: number; // 0..11
  daysInMonth: number;
  key: string; // YYYY-MM
  namaBulan: string; // September
  namaBulanPendek: string; // Sep
  label: string; // September 2026
  bulanLaluLabel: string; // Agustus 2026
  tahunLaluLabel: string; // September 2025
}

// Info bulan kerja (dari state.activePeriod). Dipakai agar tidak ada lagi teks/perhitungan "September 2026" yang di-hard-code.
export const getPeriodInfo = (state: AppState): PeriodInfo => {
  const src = state.activePeriod || state.activeDate || '';
  const parts = src.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }
  const mi = month - 1;
  const prevMi = (mi + 11) % 12;
  const prevYear = mi === 0 ? year - 1 : year;
  return {
    year,
    monthIndex: mi,
    daysInMonth: new Date(year, month, 0).getDate(),
    key: `${year}-${String(month).padStart(2, '0')}`,
    namaBulan: NAMA_BULAN[mi],
    namaBulanPendek: NAMA_BULAN_PENDEK[mi],
    label: `${NAMA_BULAN[mi]} ${year}`,
    bulanLaluLabel: `${NAMA_BULAN[prevMi]} ${prevYear}`,
    tahunLaluLabel: `${NAMA_BULAN[mi]} ${year - 1}`
  };
};

// Total cabang per hari dari spreadsheet resmi. HANYA berlaku untuk bulan data resmi (SEED_PERIOD);
// bulan lain mengembalikan 0 supaya tidak ada angka September yang "nyasar" ke bulan baru.
export const getSeedDailyBranchTotal = (state: AppState, dayNum: number): number =>
  getPeriodInfo(state).key === SEED_PERIOD ? (INITIAL_DAILY_HISTORY[dayNum - 1] || 0) : 0;

// Minggu berakhir di hari Sabtu; minggu terakhir berakhir di tanggal terakhir bulan.
export const getWeeksOfMonth = (state: AppState): { start: number; end: number }[] => {
  const p = getPeriodInfo(state);
  const list: { start: number; end: number }[] = [];
  let start = 1;
  for (let d = 1; d <= p.daysInMonth; d++) {
    if (new Date(p.year, p.monthIndex, d).getDay() === 6 || d === p.daysInMonth) {
      list.push({ start, end: d });
      start = d + 1;
    }
  }
  return list;
};

// Pembagi realisasi (Dashboard, Evaluasi, Akun TKU, Breakdown):
// Dihitung otomatis berdasarkan TANGGAL TERAKHIR YANG MEMILIKI TRANSAKSI PENJUALAN (PJD).
// Contoh: Hari ini tanggal 5 Oktober, tetapi transaksi terakhir yang tersimpan adalah tanggal 3 Oktober,
// maka pembagi otomatis = 3 hari (bukan 5), sehingga rata-rata harian tetap akurat.
// Ketika tanggal 5 sudah diinput dan disimpan, pembagi otomatis bertambah menjadi 5.
// Tanggal pilihan manual dari Dashboard admin (null = otomatis). Hanya berlaku untuk bulan kerja yang sama.
export const getPembagiManualDay = (state: AppState): number | null => {
  const m = state.pembagiManual;
  if (!m || typeof m.day !== 'number') return null;
  const period = getPeriodInfo(state);
  if (m.period !== period.key) return null;
  if (m.day < 1 || m.day > period.daysInMonth) return null;
  return Math.floor(m.day);
};

export const isPembagiManual = (state: AppState): boolean => getPembagiManualDay(state) !== null;

// Tanggal otomatis = tanggal terakhir yang punya transaksi penjualan (tanpa memperhatikan pilihan manual).
export const getAutoSalesDay = (state: AppState): number => {
  const period = getPeriodInfo(state);
  const pjd = state.pjd || {};
  let latestDay = 0;

  // Scan seluruh tanggal di bulan aktif untuk mencari tanggal terbesar yang ada transaksi
  for (let d = 1; d <= period.daysInMonth; d++) {
    const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
    const dayRecords = pjd[dStr];
    if (dayRecords) {
      const hasSales = Object.values(dayRecords).some(
        r => r && (Number(r.sold) > 0 || (Array.isArray(r.v) && r.v.some(v => Number(v) > 0)))
      );
      if (hasSales) {
        latestDay = d;
      }
    }
  }

  // Cek apakah ada data di todayInputs untuk hari ini
  if (state.todayInputs) {
    const hasTodaySales = Object.values(state.todayInputs).some(
      r => r && (Number(r.sold) > 0 || (Array.isArray(r.v) && r.v.some(v => Number(v) > 0)))
    );
    if (hasTodaySales && state.currentDayNum > latestDay) {
      latestDay = state.currentDayNum;
    }
  }

  // Khusus bulan data resmi bawaan (September 2026), jika belum ada PJD dinamis, fallback ke tanggal berjalan
  if (latestDay === 0 && period.key === SEED_PERIOD) {
    return Math.max(1, Math.min(state.currentDayNum || 1, period.daysInMonth));
  }

  // Jika belum ada transaksi sama sekali di bulan baru, default ke 1
  return latestDay > 0 ? latestDay : 1;
};

// Pembagi rata2: tanggal pilihan manual (Dashboard admin) jika ada,
// kalau tidak, tanggal transaksi terakhir. (JWP tidak memakai pembagi ini: diisi manual oleh TKU.)
export const getLatestSalesDay = (state: AppState): number => {
  const manual = getPembagiManualDay(state);
  return manual !== null ? manual : getAutoSalesDay(state);
};

export const getPembagiHari = (state: AppState): number => {
  return getLatestSalesDay(state);
};

// JWP kumulatif per TKU: diisi MANUAL oleh TKU (kolom JWP di card Kondisi TKU), tidak ada rumus otomatis.
// Nilai yang berlaku = isian manual pada catatan terbaru s/d tanggal `upToDay`.
// `useLegacy`: bila belum ada isian manual, pakai JWP lama yang tersimpan di catatan harian (data sebelum fitur ini).
export const getJwpAsOf = (state: AppState, tkuIdx: number, upToDay: number, useLegacy = true): number | null => {
  const period = getPeriodInfo(state);
  const last = Math.min(Math.max(0, Math.floor(upToDay)), period.daysInMonth);
  let manual: number | null = null;
  let legacy: number | null = null;
  for (let d = 1; d <= last; d++) {
    const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
    let rec = state.pjd?.[dStr]?.[tkuIdx];
    if (!rec && dStr === state.activeDate) rec = state.todayInputs?.[tkuIdx];
    if (!rec) continue;
    if (rec.jwpManual !== undefined && rec.jwpManual !== null && !isNaN(Number(rec.jwpManual))) manual = Number(rec.jwpManual);
    else if (rec.jwp !== undefined && Number(rec.jwp) > 0) legacy = Number(rec.jwp);
  }
  if (manual !== null) return manual;
  return useLegacy ? legacy : null;
};

export const getTanggalUpdate = (state: AppState): number => {
  return getPembagiHari(state);
};

// Pembagi untuk Rencana Breakdown:
// - Mingguan: tanggal hari Sabtu pada minggu tersebut (minggu terakhir = tanggal terakhir bulan)
// - Bulanan (Full Sebulan): tanggal terakhir di bulan tersebut
export const getPembagiBreakdownMingguan = (weekIdx: number, state?: AppState): number => {
  const ref: AppState = state || ({ activePeriod: getTodayDateString().slice(0, 8) + '01' } as AppState);
  const weeks = getWeeksOfMonth(ref);
  const w = weeks[Math.max(0, Math.min(weekIdx, weeks.length - 1))];
  return w ? w.end : getDaysInActiveMonth(ref);
};

export const getPembagiBreakdownBulanan = (state: AppState): number => {
  return getDaysInActiveMonth(state);
};

export const getPembagiKhususTku = (state: AppState, _tkuIdx?: number): number => {
  return getPembagiHari(state);
};


// ============================================================================
// PINDAH BULAN KERJA (aman: bulan lama disimpan utuh, bulan baru mulai kosong)
// ============================================================================
// pjd & hjd sudah berkunci tanggal (YYYY-MM-DD) sehingga otomatis menampung banyak bulan.
// Yang bersifat "satu bulan saja" (angka akumulasi TKU, target, breakdown, input hari ini)
// dibungkus sebagai MonthSnapshot dan disimpan di state.monthStore saat bulannya tidak aktif.
// Semua tampilan tetap membaca field lama (tkus, targetPerVariant, breakdown, dst.), jadi
// tidak ada menu lain yang perlu diubah.

const PERIOD_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const VARIANT_SHARE: Record<'YO' | 'OM' | 'OS' | 'YT', number> = { YO: 0.76, OM: 0.09, OS: 0.11, YT: 0.04 };

export const isValidPeriodKey = (k: string): boolean => PERIOD_KEY_RE.test(k);

export const getDaysInMonthOfKey = (key: string): number => {
  if (!isValidPeriodKey(key)) return 30;
  const [y, m] = key.split('-').map(n => parseInt(n, 10));
  return new Date(y, m, 0).getDate();
};

export const periodLabelOf = (key: string): string => {
  if (!isValidPeriodKey(key)) return key;
  const [y, m] = key.split('-');
  return `${NAMA_BULAN[parseInt(m, 10) - 1]} ${y}`;
};

const shiftPeriodKey = (key: string, deltaMonths: number): string => {
  const [y, m] = key.split('-').map(n => parseInt(n, 10));
  const idx = y * 12 + (m - 1) + deltaMonths;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
};

const toIndexRecord = <T,>(arr: T[]): Record<number, T> => {
  const out: Record<number, T> = {};
  arr.forEach((v, i) => { out[i] = v; });
  return out;
};

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

// Bulan baru: target & rencana harian (breakdown) mulai 0. Admin mengisi manual,
// pembanding bulan lalu/tahun lalu ditarik lewat tombol "Tarik Dari Arsip" di menu Target.
// Ubah ke true kalau Target Harian ingin dibawa dari bulan sebelumnya.
const CARRY_TARGET_HARIAN_TO_NEW_MONTH = false;

// Rencana harian bawaan untuk satu bulan: hari Minggu = 0, hari lain = target harian.
// (Sebelumnya tanggal Minggu di-hard-code untuk September saja.)
export function buildDefaultBreakdown(
  tkus: TkuItem[],
  year: number,
  monthIndex: number,
  perVariantTarget?: AppState['targetPerVariant']
): { breakdown: Record<number, number[]>; breakdownPerVariant: AppState['breakdownPerVariant'] } {
  const breakdown: Record<number, number[]> = {};
  const breakdownPerVariant: AppState['breakdownPerVariant'] = { YO: {}, OM: {}, OS: {}, YT: {} };
  const codes: Array<'YO' | 'OM' | 'OS' | 'YT'> = ['YO', 'OM', 'OS', 'YT'];
  tkus.forEach((tku, idx) => {
    const total: number[] = [];
    const per: Record<string, number[]> = { YO: [], OM: [], OS: [], YT: [] };
    for (let d = 1; d <= 31; d++) {
      const isSunday = new Date(year, monthIndex, d).getDay() === 0;
      const plan = isSunday ? 0 : (tku.targetHarian || 0);
      total.push(plan);
      codes.forEach(c => {
        const tg = perVariantTarget?.[c]?.[idx]?.tg;
        const base = tg !== undefined && tg > 0 ? tg : Math.floor((tku.targetHarian || 0) * VARIANT_SHARE[c]);
        per[c].push(isSunday ? 0 : base);
      });
    }
    breakdown[idx] = total;
    codes.forEach(c => { breakdownPerVariant[c][idx] = per[c]; });
  });
  return { breakdown, breakdownPerVariant };
}

// Foto semua data "satu bulan" dari state kerja saat ini.
export function captureMonthSnapshot(state: AppState, key?: string): MonthSnapshot {
  const periode = key || getPeriodInfo(state).key;
  const tkuMonthly: Record<number, TkuMonthlyFields> = {};
  state.tkus.forEach((t, i) => {
    tkuMonthly[i] = {
      targetHarian: t.targetHarian,
      penjualanAkm: [...(t.penjualanAkm || [0, 0, 0, 0])] as [number, number, number, number],
      jumlahArea: t.jumlahArea,
      jumlahYl: t.jumlahYl,
      coverageArea: t.coverageArea,
      absenYl: t.absenYl,
      frekuensiAbsen: t.frekuensiAbsen,
      akmJwp: t.akmJwp,
      sYl: t.sYl,
      l250: t.l250,
      l300: t.l300,
      bbAkm: t.bbAkm ? ([...t.bbAkm] as [number, number, number, number]) : undefined
    };
  });
  return clone({
    periode,
    savedAt: new Date().toISOString(),
    tkuMonthly,
    targetBulanLalu: toIndexRecord(state.targetBulanLalu || []),
    targetTahunLalu: toIndexRecord(state.targetTahunLalu || []),
    targetPerVariant: state.targetPerVariant,
    breakdown: state.breakdown,
    breakdownPerVariant: state.breakdownPerVariant,
    todayInputs: state.todayInputs,
    bbHarian: state.bbHarian || {}
  });
}

// Lembar kosong untuk bulan yang belum pernah dibuka.
// - Penjualan, BB, absen, frekuensi, JWP, s/YL, <250, <300, input harian = KOSONG.
// - Target harian & jumlah YL/area dibawa dari bulan sebelumnya sebagai titik awal (bisa diubah di menu Target / Profil).
// - "Bulan lalu" otomatis diisi dari arsip bulan sebelumnya, "tahun lalu" dari arsip bulan yang sama tahun lalu (jika ada).
export function buildBlankSnapshot(state: AppState, key: string): MonthSnapshot {
  const [yStr, mStr] = key.split('-');
  const year = parseInt(yStr, 10);
  const monthIndex = parseInt(mStr, 10) - 1;
  const act = computeActiveDate(`${key}-01`);
  const prevArc = state.archives?.[shiftPeriodKey(key, -1)];
  const lyArc = state.archives?.[shiftPeriodKey(key, -12)];
  const norm = (str: string) => {
    const s = (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (s === 'jember' || s === 'jember 1') return 'jember 1';
    if (s === 'dp jempat 4' || s === 'dp jember 4') return 'dp jember 4';
    return s;
  };
  const avgFrom = (arc: ArchiveRecord | undefined, nama: string): number => {
    if (!arc) return 0;
    const row = arc.rows.find(r => norm(r.nama) === norm(nama));
    if (!row) return 0;
    return getArsipRataTotal(row, arc.d);
  };
  const avgVarFrom = (arc: ArchiveRecord | undefined, nama: string, vi: number): number => {
    if (!arc) return 0;
    const row = arc.rows.find(r => norm(r.nama) === norm(nama));
    if (!row) return 0;
    return getArsipRataVarian(row, arc.d)[vi];
  };

  const codes: Array<'YO' | 'OM' | 'OS' | 'YT'> = ['YO', 'OM', 'OS', 'YT'];
  const tkuMonthly: Record<number, TkuMonthlyFields> = {};
  const targetBulanLalu: Record<number, number> = {};
  const targetTahunLalu: Record<number, number> = {};
  const targetPerVariant: AppState['targetPerVariant'] = { YO: {}, OM: {}, OS: {}, YT: {} };
  const todayInputs: Record<number, DailySalesRecord> = {};

  state.tkus.forEach((t, i) => {
    const yl = t.jumlahYl || 10;
    const ar = t.jumlahArea || 10;
    tkuMonthly[i] = {
      targetHarian: CARRY_TARGET_HARIAN_TO_NEW_MONTH ? t.targetHarian : 0,
      penjualanAkm: [0, 0, 0, 0],
      jumlahArea: t.jumlahArea,
      jumlahYl: t.jumlahYl,
      coverageArea: ar > 0 ? yl / ar : 1,
      absenYl: 0,
      frekuensiAbsen: 0,
      akmJwp: 0,
      sYl: 0,
      l250: 0,
      l300: 0,
      bbAkm: [0, 0, 0, 0]
    };
    // Pembanding mulai 0 (tidak otomatis dari arsip). Isi lewat tombol "Tarik Dari Arsip".
    targetBulanLalu[i] = 0;
    targetTahunLalu[i] = 0;
    codes.forEach((c) => {
      targetPerVariant[c][i] = {
        tg: CARRY_TARGET_HARIAN_TO_NEW_MONTH
          ? (state.targetPerVariant?.[c]?.[i]?.tg ?? Math.floor((t.targetHarian || 0) * VARIANT_SHARE[c]))
          : 0,
        bl: 0,
        ty: 0
      };
    });
    todayInputs[i] = {
      v: [0, 0, 0, 0],
      b: [0, 0, 0, 0],
      sold: 0,
      bb: 0,
      pdmV: [0, 0, 0, 0],
      pdm: 0,
      yl,
      ar,
    };
  });

  // Breakdown bulan baru KOSONG (0 semua), diisi manual oleh admin.
  const bd: { breakdown: Record<number, number[]>; breakdownPerVariant: AppState['breakdownPerVariant'] } = {
    breakdown: {},
    breakdownPerVariant: { YO: {}, OM: {}, OS: {}, YT: {} }
  };
  state.tkus.forEach((_, i) => {
    bd.breakdown[i] = Array(31).fill(0);
    codes.forEach(c => { (bd.breakdownPerVariant as any)[c][i] = Array(31).fill(0); });
  });

  return {
    periode: key,
    savedAt: new Date().toISOString(),
    tkuMonthly,
    targetBulanLalu,
    targetTahunLalu,
    targetPerVariant,
    breakdown: bd.breakdown,
    breakdownPerVariant: bd.breakdownPerVariant,
    todayInputs,
    bbHarian: {}
  };
}

// Terapkan foto bulan ke field kerja. Data master TKU (nama, rayon, aktif, PIC, dst.) tidak disentuh.
function applyMonthSnapshot(state: AppState, snap: MonthSnapshot): AppState {
  const blank = buildBlankSnapshot(state, snap.periode);
  const tkus = state.tkus.map((t, i) => {
    const m = snap.tkuMonthly?.[i] || blank.tkuMonthly[i];
    return { ...t, ...clone(m) };
  });
  const arrFrom = (rec: Record<number, number> | undefined): number[] =>
    state.tkus.map((_, i) => Number(rec?.[i]) || 0);
  const pick = <T,>(rec: Record<number, T> | undefined, fb: Record<number, T>, i: number): T =>
    (rec && rec[i] !== undefined ? rec[i] : fb[i]);
  const mergeVar = <T,>(src: Record<string, Record<number, T>> | undefined, fb: Record<string, Record<number, T>>) => {
    const out: Record<string, Record<number, T>> = {};
    ['YO', 'OM', 'OS', 'YT'].forEach(c => {
      out[c] = {};
      state.tkus.forEach((_, i) => { out[c][i] = clone(pick(src?.[c], fb[c], i)); });
    });
    return out;
  };
  const breakdown: Record<number, number[]> = {};
  const todayInputs: Record<number, DailySalesRecord> = {};
  state.tkus.forEach((_, i) => {
    breakdown[i] = clone(pick(snap.breakdown, blank.breakdown, i));
    todayInputs[i] = clone(pick(snap.todayInputs, blank.todayInputs, i));
  });
  return {
    ...state,
    tkus,
    targetBulanLalu: arrFrom(snap.targetBulanLalu),
    targetTahunLalu: arrFrom(snap.targetTahunLalu),
    targetPerVariant: mergeVar(snap.targetPerVariant as any, blank.targetPerVariant as any) as unknown as AppState['targetPerVariant'],
    breakdown,
    breakdownPerVariant: mergeVar(snap.breakdownPerVariant as any, blank.breakdownPerVariant as any) as unknown as AppState['breakdownPerVariant'],
    todayInputs,
    bbHarian: clone(snap.bbHarian || {})
  };
}

// Status arsip bulan kerja aktif, dipakai untuk mengunci pindah bulan.
//  - 'kosong'  : bulan ini belum ada penjualan sama sekali -> boleh pindah tanpa arsip
//  - 'tersimpan': arsip ada dan sama dengan data kerja terbaru
//  - 'belum'   : belum pernah disimpan ke arsip
//  - 'berubah' : sudah pernah diarsipkan, tetapi data kerja berubah sesudahnya
export type ArchiveGateStatus = 'kosong' | 'tersimpan' | 'belum' | 'berubah';

export function getArchiveGateStatus(state: AppState): ArchiveGateStatus {
  const key = getPeriodInfo(state).key;
  const fresh = buildArchiveFromState(state);
  const totalNow = fresh.rows.reduce((a, r) => a + (r.total || 0), 0);
  const arc = state.archives?.[key];
  if (totalNow === 0) return arc ? 'tersimpan' : 'kosong';
  if (!arc) return 'belum';
  const sig = (r: ArchiveRow) => JSON.stringify([
    r.nama, r.varian, r.targetHarian, r.bulanLalu, r.tahunLalu, r.akmBb, r.akmJwp,
    r.absenYl, r.frekuensiAbsen, r.jumlahYl, r.jumlahArea, r.l250, r.l300
  ]);
  const a = new Map(arc.rows.map(r => [r.nama, sig(r)] as const));
  const same = fresh.rows.length === arc.rows.length && fresh.d === arc.d && fresh.rows.every(r => a.get(r.nama) === sig(r));
  return same ? 'tersimpan' : 'berubah';
}

// Pindah bulan kerja. Urutan yang menjamin data tidak hilang:
//  1) foto bulan lama masuk ke monthStore (tidak ada yang dihapus),
//  2) bulan tujuan dibuka dari monthStore, atau lembar kosong kalau belum pernah dibuka,
//  3) tanggal aktif dihitung ulang, lalu angka diselaraskan.
// pjd/hjd/arsip tidak diubah sama sekali.
export function switchWorkingPeriod(state: AppState, newKey: string): AppState {
  if (!isValidPeriodKey(newKey)) return state;
  const oldKey = getPeriodInfo(state).key;
  if (newKey === oldKey) return state;

  const store: Record<string, MonthSnapshot> = { ...(state.monthStore || {}) };
  store[oldKey] = captureMonthSnapshot(state, oldKey);

  const target = store[newKey] || buildBlankSnapshot(state, newKey);
  delete store[newKey]; // bulan aktif tidak perlu disimpan dobel

  const period = `${newKey}-01`;
  const act = computeActiveDate(period);
  const applied = applyMonthSnapshot({ ...state, monthStore: store }, target);
  return synchronizeAppState({
    ...applied,
    monthStore: store,
    activePeriod: period,
    activeDate: act.date,
    currentDayNum: act.day,
    pembagiHari: act.day,
    pembagiHariMode: 'tanggal',
    pembagiBreakdown: act.day,
    pembagiKhususTku: {},
    pembagiKhususBreakdownTku: {}
  });
}

// ---- Sinkron bulan kerja antar HP ----
// Bulan kerja (activePeriod) dulu hanya tersimpan per HP, sehingga HP lain tetap di bulan lama.
// Aturan sekarang: bulan kerja di cloud yang LEBIH BARU diikuti semua HP (hanya maju, tidak pernah mundur otomatis).
// Kalau admin sengaja memilih bulan lain lewat Pengaturan, pilihan itu dihormati selama aplikasi belum dimuat ulang.
let manualPeriodKey: string | null = null;

export function markPeriodManualSwitch(key: string): void {
  manualPeriodKey = isValidPeriodKey(key) ? key : null;
}

// Kunci bulan kalender HP saat ini ("2026-10").
export function getCalendarPeriodKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Bulan kerja sudah tertinggal dari bulan kalender (mis. kalender Oktober, bulan kerja masih September).
export function isPeriodBehindCalendar(state: AppState, now: Date = new Date()): boolean {
  return getPeriodInfo(state).key < getCalendarPeriodKey(now);
}

// Data yang terikat ke SATU bulan kerja dan tidak dihitung ulang dari penjualan harian:
// rencana harian (breakdown) dan target. Saat HP pindah bulan mengikuti cloud, bagian ini WAJIB memakai
// versi cloud (milik bulan baru), supaya sisa isian lama di HP ini tidak bercampur ke bulan baru.
const MONTH_BOUND_KEYS = ['breakdown', 'breakdownPerVariant', 'targetPerVariant', 'targetBulanLalu', 'targetTahunLalu'] as const;
const FOLLOW_BACKUP_KEY = 'yakult_period_follow_backup_v1';
let followHadLocalEdits = false;

// Dibaca sekali oleh tampilan untuk menambah catatan di pesan "bulan kerja otomatis pindah".
export function consumeFollowLocalEditsFlag(): boolean {
  const v = followHadLocalEdits;
  followHadLocalEdits = false;
  return v;
}

// Gabungan khusus saat ikut pindah bulan: penjualan harian, arsip, profil tetap digabung seperti biasa
// (per tanggal, aman), tetapi target & rencana harian diambil dari cloud. Kalau HP ini punya ubahan
// target/rencana yang belum terkirim, salinannya disimpan di HP ini (tidak dibuang diam-diam).
function resolveMergeForFollow(
  merged: Syncable,
  local: Syncable,
  remote: Syncable,
  base: Syncable | null,
  fromKey: string,
  toKey: string
): Syncable {
  const out: Syncable = { ...merged };
  const diverged: Syncable = {};
  let any = false;
  MONTH_BOUND_KEYS.forEach(k => {
    if (remote[k] !== undefined) out[k] = remote[k];
    if (base && local[k] !== undefined && !deepEq(local[k], base[k]) && !deepEq(local[k], remote[k])) {
      diverged[k] = local[k];
      any = true;
    }
  });
  if (any) {
    followHadLocalEdits = true;
    try {
      localStorage.setItem(
        FOLLOW_BACKUP_KEY,
        JSON.stringify({ savedAt: new Date().toISOString(), fromPeriod: fromKey, toPeriod: toKey, data: diverged })
      );
    } catch (_) {
      // kuota penuh: abaikan, data bulan baru tetap aman
    }
  }
  return out;
}

export function shouldFollowCloudPeriod(local: AppState, remoteKey: string): boolean {
  if (!isValidPeriodKey(remoteKey)) return false;
  const localKey = getPeriodInfo(local).key;
  if (remoteKey <= localKey) return false;
  if (manualPeriodKey === localKey) return false;
  return true;
}

// Pindah bulan kerja HP ini mengikuti cloud. Data penjualan (pjd), arsip, dan monthStore tidak diubah:
// bagian bulan kerja (target, breakdown, profil) sudah ikut tergabung dari cloud sebelum fungsi ini dipanggil.
export function followCloudPeriod(state: AppState, remoteKey: string): AppState {
  if (!isValidPeriodKey(remoteKey)) return state;
  const period = `${remoteKey}-01`;
  const act = computeActiveDate(period);
  const pjdAct = state.pjd?.[act.date] || {};
  const todayInputs: Record<number, DailySalesRecord> = {};
  (state.tkus || []).forEach((t, idx) => {
    todayInputs[idx] = pjdAct[idx]
      ? { ...pjdAct[idx] }
      : {
          v: [0, 0, 0, 0],
          b: [0, 0, 0, 0],
          sold: 0,
          bb: 0,
          pdmV: [0, 0, 0, 0],
          pdm: 0,
          yl: t.jumlahYl || 10,
          ar: t.jumlahArea || 10
        };
  });
  return synchronizeAppState({
    ...state,
    activePeriod: period,
    activeDate: act.date,
    currentDayNum: act.day,
    pembagiHari: act.day,
    pembagiHariMode: 'tanggal',
    pembagiBreakdown: act.day,
    pembagiKhususTku: {},
    pembagiKhususBreakdownTku: {},
    todayInputs
  });
}

// Daftar bulan yang boleh dipilih: dari bulan data resmi pertama sampai bulan kalender + 1,
// ditambah bulan apa pun yang sudah punya data tersimpan.
export function listSelectablePeriods(state: AppState, now: Date = new Date()): string[] {
  const keys = new Set<string>();
  const [sy, sm] = SEED_PERIOD.split('-').map(n => parseInt(n, 10));
  const startIdx = sy * 12 + (sm - 1);
  const endIdx = now.getFullYear() * 12 + now.getMonth() + 1;
  for (let i = startIdx; i <= endIdx; i++) {
    keys.add(`${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`);
  }
  Object.keys(state.monthStore || {}).forEach(k => { if (isValidPeriodKey(k)) keys.add(k); });
  keys.add(getPeriodInfo(state).key);
  return Array.from(keys).sort();
}

// Ringkasan isi satu bulan dari data harian (pjd): jumlah hari terisi & total botol terjual.
export function summarizePeriod(state: AppState, key: string): { days: number; total: number } {
  let days = 0;
  let total = 0;
  Object.keys(state.pjd || {}).forEach(dateStr => {
    if (!dateStr.startsWith(key + '-')) return;
    let dayTotal = 0;
    Object.values(state.pjd[dateStr] || {}).forEach((r: any) => {
      (r?.v || []).forEach((x: number) => { dayTotal += Number(x) || 0; });
    });
    if (dayTotal > 0) { days++; total += dayTotal; }
  });
  return { days, total };
}

// ---- Cadangan per bulan & pemeriksaan isi cloud ----
const MONTH_BACKUP_PREFIX = 'bulan_';

// Salinan terpisah (baris sendiri di app_store) untuk satu bulan: pjd, hjd, dan foto angka bulannya.
// Baris ini tidak ikut tertimpa kalau baris utama main_state tertimpa perangkat lain.
export async function saveMonthBackupToSupabase(state: AppState, key: string): Promise<boolean> {
  const client = getSupabaseClient(state.supabaseConfig);
  if (!client || !isValidPeriodKey(key)) return false;
  try {
    const pick = <T,>(src: Record<string, T> | undefined): Record<string, T> => {
      const out: Record<string, T> = {};
      Object.keys(src || {}).forEach(d => { if (d.startsWith(key + '-')) out[d] = (src as Record<string, T>)[d]; });
      return out;
    };
    const active = getPeriodInfo(state).key === key;
    const snapshot = active ? captureMonthSnapshot(state, key) : state.monthStore?.[key];
    const payload = {
      periode: key,
      savedAt: new Date().toISOString(),
      pjd: pick(state.pjd),
      hjd: pick(state.hjd),
      snapshot: snapshot || null,
      arsip: state.archives?.[key] || null
    };
    const { error } = await client
      .from('app_store')
      .upsert({ key: MONTH_BACKUP_PREFIX + key, value: payload, updated_at: new Date().toISOString() });
    if (error) {
      console.warn('Supabase backup bulan:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase backup bulan error:', err);
    return false;
  }
}

export interface CloudInspectResult {
  ok: boolean;
  message: string;
  mainUpdatedAt?: string;
  activePeriod?: string;
  months: { key: string; days: number; total: number; hasBackupRow: boolean; hasArchive: boolean }[];
}

// Periksa apa yang SUNGGUH ada di Supabase (bukan yang ada di HP): baris utama + cadangan per bulan.
export async function inspectCloudData(config: SupabaseConfig | undefined | null): Promise<CloudInspectResult> {
  const client = getSupabaseClient(config);
  if (!client) return { ok: false, message: 'Supabase belum dikonfigurasi (URL & Key).', months: [] };
  try {
    const [{ data: mainRow, error: mainErr }, { data: keyRows, error: keyErr }] = await Promise.all([
      client.from('app_store').select('value, updated_at').eq('key', REMOTE_KEY).maybeSingle(),
      client.from('app_store').select('key')
    ]);
    if (mainErr) return { ok: false, message: mainErr.message, months: [] };
    if (keyErr) return { ok: false, message: keyErr.message, months: [] };
    if (!mainRow || !mainRow.value) return { ok: false, message: 'Belum ada data utama di Supabase.', months: [] };
    const rows: Array<{ key: string }> = (keyRows as any[]) || [];
    const main = mainRow;
    const v = main.value as Partial<AppState>;
    const perMonth: Record<string, { days: number; total: number }> = {};
    Object.keys(v.pjd || {}).forEach(dateStr => {
      const k = dateStr.slice(0, 7);
      let dayTotal = 0;
      Object.values((v.pjd as Record<string, Record<number, DailySalesRecord>>)[dateStr] || {}).forEach(r => {
        (r?.v || []).forEach(x => { dayTotal += Number(x) || 0; });
      });
      if (!perMonth[k]) perMonth[k] = { days: 0, total: 0 };
      if (dayTotal > 0) { perMonth[k].days++; perMonth[k].total += dayTotal; }
    });
    const backupKeys = new Set<string>(rows.filter(r => String(r.key).startsWith(MONTH_BACKUP_PREFIX)).map(r => String(r.key).slice(MONTH_BACKUP_PREFIX.length)));
    const archiveKeys = new Set<string>(Object.keys(v.archives || {}));
    const allKeys = new Set<string>([...Object.keys(perMonth), ...backupKeys, ...Object.keys(v.monthStore || {})]);
    const months = Array.from(allKeys)
      .filter(isValidPeriodKey)
      .sort()
      .map(k => ({
        key: k,
        days: perMonth[k]?.days || 0,
        total: perMonth[k]?.total || 0,
        hasBackupRow: backupKeys.has(k),
        hasArchive: archiveKeys.has(k)
      }));
    return {
      ok: true,
      message: 'Berhasil membaca Supabase.',
      mainUpdatedAt: main.updated_at as string,
      activePeriod: (v.activePeriod as string) || undefined,
      months
    };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Gagal menghubungi Supabase', months: [] };
  }
}

// Susun arsip satu bulan dari angka kerja saat ini.
export function buildArchiveFromState(state: AppState): ArchiveRecord {
  const curP = getPeriodInfo(state);
  const currentKey = curP.key;
  const divider = getPembagiHari(state) || state.pembagiHari || state.currentDayNum || 1;

  // Potong ke 2 desimal tanpa pembulatan ke atas (Math.floor)
  const trunc2 = (n: number): number => Math.floor(n * 100 + 1e-9) / 100;

  const rows: ArchiveRow[] = state.tkus.filter(t => t.aktif).map((t) => {
    const idx = state.tkus.indexOf(t);
    const sold = t.penjualanAkm.reduce((a, b) => a + b, 0);
    const akmBb = (t.bbAkm || [0, 0, 0, 0]).reduce((a, b) => a + (Number(b) || 0), 0);
    const targetHarian = t.targetHarian || 0;
    const bulanLalu = state.targetBulanLalu[idx] || 0;
    const tahunLalu = state.targetTahunLalu[idx] || 0;
    const rataHarian = divider > 0 ? Math.floor(sold / divider) : 0;
    const vsTargetPct = targetHarian > 0 ? trunc2((rataHarian / targetHarian) * 1000) / 1000 : 1;
    const vsLmPct = bulanLalu > 0 ? trunc2((rataHarian / bulanLalu) * 1000) / 1000 : 1;
    const vsLyPct = tahunLalu > 0 ? trunc2((rataHarian / tahunLalu) * 1000) / 1000 : 1;
    const akmBbPct = (sold + akmBb) > 0 ? trunc2((akmBb / (sold + akmBb)) * 1000) / 1000 : 0;
    const akmJwp = t.akmJwp || 0;
    const sYl = akmJwp > 0 ? Math.floor(sold / akmJwp) : 0;
    const absenYl = t.absenYl || 0;
    const frekuensiAbsen = t.frekuensiAbsen || 0;
    const jumlahYl = t.jumlahYl || 0;
    const jumlahArea = t.jumlahArea || 0;
    const coverageArea = jumlahArea > 0 ? trunc2((jumlahYl / jumlahArea) * 1000) / 1000 : 1;
    const rataVarian: [number, number, number, number] = [
      divider > 0 ? Math.floor(t.penjualanAkm[0] / divider) : 0,
      divider > 0 ? Math.floor(t.penjualanAkm[1] / divider) : 0,
      divider > 0 ? Math.floor(t.penjualanAkm[2] / divider) : 0,
      divider > 0 ? Math.floor(t.penjualanAkm[3] / divider) : 0
    ];

    return {
      nama: t.nama,
      rayon: t.rayon,
      varian: [...t.penjualanAkm] as [number, number, number, number],
      total: sold,
      targetHarian,
      vsTargetPct,
      bulanLalu,
      vsLmPct,
      tahunLalu,
      vsLyPct,
      akmBb,
      akmBbPct,
      akmJwp,
      sYl,
      absenYl,
      frekuensiAbsen,
      jumlahYl,
      jumlahArea,
      coverageArea,
      l250: t.l250 || 0,
      l300: t.l300 || 0,
      rataVarian,
      rataHarian
    };
  });

  // Salin catatan Kendala & Solusi (+ tanggapan admin) bulan ini ke arsip, supaya tersimpan sesuai bulannya.
  const catatanN: Record<string, WeeklyNote> = {};
  const catatanR: Record<string, WeeklyReply> = {};
  const prefix = `${currentKey}:`;
  Object.keys(state.weeklyNotes || {}).forEach(k => {
    if (!k.startsWith(prefix)) return;
    const n = state.weeklyNotes![k];
    if (!n || !((n.a || '').trim() || (n.s || '').trim() || (n.l || []).length)) return;
    catatanN[k] = { ...n, l: [...(n.l || [])] };
    const r = state.weeklyReplies?.[k];
    if (r) catatanR[k] = { ...r };
  });

  return {
    periode: currentKey,
    namaBulan: curP.label,
    d: curP.daysInMonth,
    terkunci: true,
    rows,
    catatan: { n: catatanN, r: catatanR }
  };
}

export function getDefaultState(): AppState {
  // Bulan bawaan = bulan data resmi (SEED_PERIOD). Bulan lain dibuka lewat pilihan bulan di Pengaturan,
  // supaya angka September tidak tampil di bawah label bulan kalender yang berbeda.
  const period = `${SEED_PERIOD}-01`;
  const defAct = computeActiveDate(period);
  const today = defAct.date;
  const dayNum = defAct.day;

  // PJD diisi dengan data resmi September 2026 dari spreadsheet
  const pjd: Record<string, Record<number, DailySalesRecord>> = JSON.parse(JSON.stringify(INITIAL_PJD || {}));
  const todayInputs: Record<number, DailySalesRecord> = {};
  const ylCounts = [11, 11, 11, 10, 7, 11, 9, 9, 10, 8];
  const areaCounts = [12, 12, 11, 10, 7, 12, 11, 10, 10, 8];

  INITIAL_TKUS.forEach((_, idx) => {
    todayInputs[idx] = {
      v: [0, 0, 0, 0],
      b: [0, 0, 0, 0],
      sold: 0,
      bb: 0,
      pdmV: [0, 0, 0, 0],
      pdm: 0,
      yl: ylCounts[idx] || 10,
      ar: areaCounts[idx] || 10,
    };
  });

  // Rencana harian 31 hari (hari Minggu mengikuti kalender bulan kerja)
  const [seedY, seedM] = SEED_PERIOD.split('-').map(n => parseInt(n, 10));
  const { breakdown, breakdownPerVariant } = buildDefaultBreakdown(INITIAL_TKUS, seedY, seedM - 1);

  const bbHarian: Record<number, number> = {};

  const baseState: AppState = {
    dataVersion: DATA_VERSION,
    role: null, // start at login screen or can auto-switch to admin demo
    activeTkuId: 0,
    currentMenu: "Dashboard",
    selectedRayon: 0, // Cabang
    activeDate: today,
    activePeriod: period,
    currentDayNum: dayNum,
    pembagiHari: dayNum,
    pembagiHariMode: 'tanggal',
    pembagiKhususTku: {},
    pembagiBreakdown: dayNum,
    pembagiBreakdownMode: 'auto',
    pembagiKhususBreakdownTku: {},
    targetBulanLalu: [...INITIAL_TARGET_BL],
    targetTahunLalu: [...INITIAL_TARGET_TY],
    targetPerVariant: {
      YO: {
        0: { tg: 2350, bl: 2253, ty: 2496 },
        1: { tg: 2450, bl: 2392, ty: 2199 },
        2: { tg: 2240, bl: 2202, ty: 2791 },
        3: { tg: 3565, bl: 3805, ty: 3687 },
        4: { tg: 1620, bl: 1482, ty: 1845 },
        5: { tg: 2965, bl: 2881, ty: 3055 },
        6: { tg: 2135, bl: 2074, ty: 2342 },
        7: { tg: 3245, bl: 3163, ty: 3510 },
        8: { tg: 2835, bl: 2593, ty: 3382 },
        9: { tg: 1545, bl: 1638, ty: 1692 }
      },
      OM: {
        0: { tg: 450, bl: 337, ty: 529 },
        1: { tg: 480, bl: 368, ty: 563 },
        2: { tg: 520, bl: 393, ty: 671 },
        3: { tg: 370, bl: 290, ty: 373 },
        4: { tg: 145, bl: 104, ty: 230 },
        5: { tg: 440, bl: 331, ty: 550 },
        6: { tg: 305, bl: 235, ty: 515 },
        7: { tg: 435, bl: 326, ty: 600 },
        8: { tg: 385, bl: 261, ty: 370 },
        9: { tg: 100, bl: 86, ty: 226 }
      },
      OS: {
        0: { tg: 330, bl: 419, ty: 0 },
        1: { tg: 320, bl: 453, ty: 0 },
        2: { tg: 430, bl: 543, ty: 0 },
        3: { tg: 295, bl: 388, ty: 0 },
        4: { tg: 135, bl: 157, ty: 0 },
        5: { tg: 310, bl: 395, ty: 0 },
        6: { tg: 230, bl: 296, ty: 0 },
        7: { tg: 155, bl: 538, ty: 0 },
        8: { tg: 280, bl: 352, ty: 0 },
        9: { tg: 100, bl: 132, ty: 0 }
      },
      YT: {
        0: { tg: 300, bl: 228, ty: 273 },
        1: { tg: 355, bl: 250, ty: 277 },
        2: { tg: 235, bl: 179, ty: 239 },
        3: { tg: 260, bl: 211, ty: 173 },
        4: { tg: 85, bl: 63, ty: 77 },
        5: { tg: 285, bl: 220, ty: 244 },
        6: { tg: 120, bl: 94, ty: 164 },
        7: { tg: 435, bl: 119, ty: 165 },
        8: { tg: 150, bl: 109, ty: 115 },
        9: { tg: 30, bl: 26, ty: 63 }
      }
    },
    breakdown,
    breakdownPerVariant,
    todayInputs,
    pjd,
    hjd: {},
    sisaStock: loadSisaStockBackup(),
    bbHarian,
    quotes: [...INITIAL_QUOTES],
    archives: { ...INITIAL_ARCHIVES },
    monthStore: {},
    weeklyNotes: {},
    weeklyReplies: {},
    activeArchiveKey: '2026-08',
    supabaseConfig: loadSupabaseConfigFromVault(),
    tkus: [...INITIAL_TKUS],
    adminPin: '0000',
    tkuPin: '1111',
    theme: 'light'
  };

  const seedState = synchronizeAppState(baseState);
  const nowKey = getCalendarPeriodKey();
  // Jika kalender sudah di bulan yang lebih baru (mis. Oktober 2026),
  // arsipkan data September 2026 secara resmi dan mulai langsung di bulan berjalan!
  if (nowKey > SEED_PERIOD) {
    const sepArchive = buildArchiveFromState(seedState);
    const withArchive: AppState = {
      ...seedState,
      archives: { ...seedState.archives, [SEED_PERIOD]: sepArchive },
      monthStore: { ...seedState.monthStore, [SEED_PERIOD]: captureMonthSnapshot(seedState, SEED_PERIOD) }
    };
    return switchWorkingPeriod(withArchive, nowKey);
  }

  return seedState;
}

export function loadAppState(): AppState {
  try {
    // Clear old versions to load official spreadsheet baseline
    ['yakult_sales_system_v1', 'yakult_sales_system_v2', 'yakult_sales_system_v3', 'yakult_sales_system_v4', 'yakult_sales_system_v5', 'yakult_sales_system_v6', 'yakult_sales_system_v7', 'yakult_sales_system_v8', 'yakult_sales_system_v9'].forEach(k => {
      try { localStorage.removeItem(k); } catch (_) {}
    });

      const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validasi sesi aktif & batas waktu inaktivitas 10 menit
      let activeSession: { role: 'a' | 't'; tkuId?: number } | null = null;
      const sessionRaw = localStorage.getItem(SESSION_KEY);
      const lastActiveRaw = localStorage.getItem(LAST_ACTIVE_KEY);
      if (sessionRaw) {
        try {
          const session = JSON.parse(sessionRaw);
          const lastActive = Math.max(Number(session?.lastActive) || 0, Number(lastActiveRaw) || 0);
          const now = Date.now();
          if (lastActive > 0 && now - lastActive > INACTIVITY_TIMEOUT_MS) {
            // Sesi kedaluwarsa karena aplikasi ditutup atau ditinggal lebih dari 10 menit
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(LAST_ACTIVE_KEY);
            localStorage.setItem(SESSION_EXPIRED_FLAG_KEY, '1');
          } else if (session?.role) {
            activeSession = { role: session.role, tkuId: session.tkuId };
            // Perbarui stempel waktu aktif
            session.lastActive = now;
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            localStorage.setItem(LAST_ACTIVE_KEY, String(now));
          }
        } catch (_) {}
      }

      parsed.role = activeSession ? activeSession.role : null;
      if (activeSession && activeSession.tkuId !== undefined) {
        parsed.activeTkuId = activeSession.tkuId;
      }

      const defaultState = getDefaultState();
      
      // Calculate total cumulative sales in parsed.tkus
      let totalParsedSales = 0;
      if (Array.isArray(parsed.tkus)) {
        parsed.tkus.forEach((t: any) => {
          if (Array.isArray(t.penjualanAkm)) {
            totalParsedSales += t.penjualanAkm.reduce((a: number, b: number) => a + (Number(b) || 0), 0);
          }
        });
      }

      // Bulan kerja yang tersimpan. Cek "total penjualan < 870.000" hanya berlaku untuk bulan data resmi;
      // bulan baru (mis. Oktober) memang mulai dari 0 dan TIDAK boleh dianggap data rusak.
      const parsedPeriodKey = String(parsed.activePeriod || '').slice(0, 7);
      const parsedIsSeed = !parsedPeriodKey || parsedPeriodKey === SEED_PERIOD;

      // If stored data has old 11 TKUs or old total != 870.255 or missing targetPerVariant, force refresh master data
      const needsFreshMaster = 
        !parsed.dataVersion || 
        parsed.dataVersion !== DATA_VERSION || 
        !Array.isArray(parsed.tkus) || 
        parsed.tkus.length !== 10 || 
        (parsedIsSeed && totalParsedSales < 870000) ||
        !parsed.targetPerVariant?.YO || 
        Object.keys(parsed.targetPerVariant?.YO || {}).length < 10;

      const backupStock = loadSisaStockBackup();
      const userStock = (parsed.sisaStock && typeof parsed.sisaStock === 'object' && Object.keys(parsed.sisaStock).length > 0)
        ? { ...backupStock, ...parsed.sisaStock }
        : backupStock;

      if (needsFreshMaster) {
        const vaultCfg = loadSupabaseConfigFromVault();
        const finalCfg = (parsed.supabaseConfig && parsed.supabaseConfig.u) ? parsed.supabaseConfig : vaultCfg;
        if (finalCfg.u || finalCfg.k) {
          saveSupabaseConfigToVault(finalCfg);
        }
        // Jangan buang bulan lain: simpan foto bulan kerja yang sedang terbuka + semua bulan yang sudah tersimpan.
        const carriedStore: Record<string, MonthSnapshot> = { ...(parsed.monthStore || {}) };
        if (parsedPeriodKey && parsedPeriodKey !== SEED_PERIOD && Array.isArray(parsed.tkus)) {
          try { carriedStore[parsedPeriodKey] = captureMonthSnapshot(parsed as AppState, parsedPeriodKey); } catch (_) {}
        }
        const userArchives: Record<string, ArchiveRecord> = {};
        Object.keys(parsed.archives || {}).forEach(k => {
          if (!INITIAL_ARCHIVES[k]) userArchives[k] = parsed.archives[k];
        });
        return {
          ...defaultState,
          supabaseConfig: finalCfg,
          role: activeSession ? activeSession.role : null,
          activeTkuId: activeSession?.tkuId ?? defaultState.activeTkuId,
          theme: parsed.theme || defaultState.theme,
          monthStore: carriedStore,
          weeklyNotes: { ...(parsed.weeklyNotes || {}) },
          weeklyReplies: { ...(parsed.weeklyReplies || {}) },
          pjd: { ...defaultState.pjd, ...(parsed.pjd || {}) },
          hjd: { ...(defaultState.hjd || {}), ...(parsed.hjd || {}) },
          sisaStock: userStock,
          breakdown: parsed.breakdown || defaultState.breakdown,
          breakdownPerVariant: parsed.breakdownPerVariant || defaultState.breakdownPerVariant,
          targetBulanLalu: parsed.targetBulanLalu || defaultState.targetBulanLalu,
          targetTahunLalu: parsed.targetTahunLalu || defaultState.targetTahunLalu,
          targetPerVariant: parsed.targetPerVariant || defaultState.targetPerVariant,
          todayInputs: parsed.todayInputs || defaultState.todayInputs,
          archives: { ...defaultState.archives, ...userArchives }
        };
      }

      const merged: AppState = { ...defaultState, ...parsed, sisaStock: userStock };
      if (userStock && Object.keys(userStock).length > 0) {
        saveSisaStockBackup(userStock);
      }
      merged.role = activeSession ? activeSession.role : null;
      if (activeSession && activeSession.tkuId !== undefined) {
        merged.activeTkuId = activeSession.tkuId;
      }
      const vaultCfg = loadSupabaseConfigFromVault();
      if (!merged.supabaseConfig || (!merged.supabaseConfig.u && vaultCfg.u)) {
        merged.supabaseConfig = vaultCfg;
      } else if (merged.supabaseConfig.u || merged.supabaseConfig.k) {
        saveSupabaseConfigToVault(merged.supabaseConfig);
      }
      const act = computeActiveDate(merged.activePeriod);
      merged.activeDate = act.date;
      merged.currentDayNum = act.day;

      if (Array.isArray(merged.tkus)) {
        merged.tkus.forEach(t => {
          if (t && t.nama === 'JEMBER') t.nama = 'JEMBER 1';
        });
      }

      // Sinkronisasi todayInputs murni terhadap tanggal aktif (act.date).
      // Jika pada tanggal aktif sudah ada data tersimpan di pjd, pakai data tersebut.
      // Jika belum ada data di pjd untuk tanggal aktif, setel seluruh kolom ke 0 (bukan membawa data hari kemarin/lalu).
      const activePjd = merged.pjd?.[act.date] || {};
      const syncedTodayInputs: Record<number, DailySalesRecord> = {};
      merged.tkus.forEach((_, idx) => {
        if (activePjd[idx]) {
          syncedTodayInputs[idx] = { ...activePjd[idx] };
        } else {
          syncedTodayInputs[idx] = {
            v: [0, 0, 0, 0],
            b: [0, 0, 0, 0],
            sold: 0,
            bb: 0,
            pdmV: [0, 0, 0, 0],
            pdm: 0,
            yl: merged.tkus[idx]?.jumlahYl || 10,
            ar: merged.tkus[idx]?.jumlahArea || 10,
          };
        }
      });
      merged.todayInputs = syncedTodayInputs;

      // Cut-off sudah dihapus: buang sisa pengaturan lama dari data tersimpan
      delete (merged as unknown as Record<string, unknown>).cutoffHari;
      merged.pembagiHariMode = 'tanggal';
      merged.pembagiHari = getPembagiHari(merged);
      if (!merged.pembagiKhususTku) {
        merged.pembagiKhususTku = {};
      }
      if (!merged.targetPerVariant || !merged.targetPerVariant.YO || Object.keys(merged.targetPerVariant.YO).length === 0) {
        merged.targetPerVariant = defaultState.targetPerVariant;
      }
      if (merged.currentMenu === 'Beranda') {
        merged.currentMenu = 'Dashboard';
      }

      // Always merge default rich archives so spreadsheet metrics (target, BB, S/YL, area, etc.) are never lost
      const safeArchives: Record<string, ArchiveRecord> = {};
      Object.keys(defaultState.archives).forEach(key => {
        const defArc = defaultState.archives[key];
        // Arsip buatan pengguna (mis. 2026-09, hasil arsip otomatis dari data resmi) milik pengguna:
        // koreksi Absen/Frekuensi dan lainnya TIDAK boleh ditimpa data bawaan saat dimuat ulang.
        if (!INITIAL_ARCHIVES[key] && parsed.archives && parsed.archives[key]) {
          safeArchives[key] = parsed.archives[key];
          return;
        }
        const userArc = (parsed.archives && parsed.archives[key]) || defArc;
        safeArchives[key] = {
          ...defArc,
          ...userArc,
          rows: defArc.rows.map((defRow, rIdx) => {
            const userRow = userArc?.rows?.[rIdx] || {};
            return {
              ...defRow,
              ...userRow,
              targetHarian: defRow.targetHarian ?? userRow.targetHarian,
              vsTargetPct: defRow.vsTargetPct ?? userRow.vsTargetPct,
              bulanLalu: defRow.bulanLalu ?? userRow.bulanLalu,
              vsLmPct: defRow.vsLmPct ?? userRow.vsLmPct,
              tahunLalu: defRow.tahunLalu ?? userRow.tahunLalu,
              vsLyPct: defRow.vsLyPct ?? userRow.vsLyPct,
              akmBb: defRow.akmBb ?? userRow.akmBb,
              akmBbPct: defRow.akmBbPct ?? userRow.akmBbPct,
              akmJwp: defRow.akmJwp ?? userRow.akmJwp,
              sYl: defRow.sYl ?? userRow.sYl,
              absenYl: defRow.absenYl ?? userRow.absenYl,
              frekuensiAbsen: defRow.frekuensiAbsen ?? userRow.frekuensiAbsen,
              jumlahYl: defRow.jumlahYl ?? userRow.jumlahYl,
              jumlahArea: defRow.jumlahArea ?? userRow.jumlahArea,
              coverageArea: defRow.coverageArea ?? userRow.coverageArea,
              rataVarian: defRow.rataVarian ?? userRow.rataVarian,
              rataHarian: defRow.rataHarian ?? userRow.rataHarian
            };
          })
        };
      });

      if (parsed.archives) {
        Object.keys(parsed.archives).forEach(key => {
          if (!safeArchives[key]) {
            safeArchives[key] = parsed.archives[key];
          }
        });
      }

      merged.archives = safeArchives;
      if (!merged.activeArchiveKey || !merged.archives[merged.activeArchiveKey]) {
        merged.activeArchiveKey = '2026-08';
      }

      return synchronizeAppState(merged);
    }
  } catch (err) {
    console.error('Failed to load state from localStorage:', err);
  }
  return getDefaultState();
}

/**
 * Sinkronisasi total data, rekonsiliasi angka penjualan akumulasi TKU,
 * botol balik, absensi, JWP, s/YL, dan indikator operasional agar serasi 100% di semua tampilan.
 */
// Unit TKU "Jember" (nama lama) disamakan menjadi "Jember 1" di data aktif maupun arsip.
// Ini hanya untuk nama TKU, bukan nama cabang ("Cabang Jember").
const isNamaJemberLama = (n: unknown): boolean =>
  typeof n === 'string' && n.trim().toLowerCase() === 'jember';

function sanitizeArchivesRounding(archives: Record<string, ArchiveRecord> | undefined): { changed: boolean; archives: Record<string, ArchiveRecord> } {
  if (!archives) return { changed: false, archives: {} };
  let changed = false;
  const next: Record<string, ArchiveRecord> = {};
  Object.keys(archives).forEach(k => {
    const arc = archives[k];
    if (!arc || !Array.isArray(arc.rows) || !arc.d) {
      next[k] = arc;
      return;
    }
    const d = arc.d;
    let rowChanged = false;
    const nextRows = arc.rows.map(r => {
      let rCopy = { ...r };
      const expectedFloor = Math.floor((r.total || 0) / d);
      // Jika rataHarian dibulatkan ke atas (misal 127.485 / 30 = 4249.5 jadi 4250), koreksi ke 4249 (Math.floor)
      if (r.rataHarian !== undefined && r.rataHarian > expectedFloor) {
        rCopy.rataHarian = expectedFloor;
        rowChanged = true;
      }
      if (Array.isArray(r.varian)) {
        const nextRataVarian = r.varian.map((v, vIdx) => {
          const fv = Math.floor((v || 0) / d);
          if (r.rataVarian && r.rataVarian[vIdx] !== undefined && r.rataVarian[vIdx] > fv) {
            rowChanged = true;
            return fv;
          }
          return r.rataVarian ? r.rataVarian[vIdx] : fv;
        }) as [number, number, number, number];
        rCopy.rataVarian = nextRataVarian;
      }
      return rCopy;
    });
    if (rowChanged) {
      changed = true;
      next[k] = { ...arc, rows: nextRows };
    } else {
      next[k] = arc;
    }
  });
  return { changed, archives: next };
}

function normalizeNamaJember1(state: AppState): AppState {
  let changed = false;
  const tkus = (state.tkus || []).map(t => {
    if (t && isNamaJemberLama(t.nama)) { changed = true; return { ...t, nama: 'JEMBER 1' }; }
    return t;
  });
  let archives = state.archives;
  if (archives) {
    const next: Record<string, ArchiveRecord> = {};
    Object.keys(archives).forEach(k => {
      const arc = archives[k];
      if (arc?.rows?.some(r => isNamaJemberLama(r.nama))) {
        changed = true;
        next[k] = { ...arc, rows: arc.rows.map(r => isNamaJemberLama(r.nama) ? { ...r, nama: 'Jember 1' } : r) };
      } else {
        next[k] = arc;
      }
    });
    archives = next;
  }
  const sanitized = sanitizeArchivesRounding(archives);
  if (sanitized.changed) {
    changed = true;
    archives = sanitized.archives;
  }
  return changed ? { ...state, tkus, archives } : state;
}

export function synchronizeAppState(state: AppState): AppState {
  state = normalizeNamaJember1(state);
  const period = getPeriodInfo(state);
  const isSeed = period.key === SEED_PERIOD; // hanya bulan data resmi yang boleh memakai angka dasar spreadsheet
  const divider = getPembagiHari(state);
  const pjd = { ...(state.pjd || {}) };

  const nextTkus = state.tkus.map((t, idx) => {
    let sumV: [number, number, number, number] = [0, 0, 0, 0];
    let hasPjdData = false;
    let akmBb = 0;
    // Nilai Master dari Profil TKU (Source of Truth untuk Jumlah YL & Area)
    const masterYl = t.jumlahYl || 10;
    const masterArea = t.jumlahArea || 10;

    let latestAbsen = isSeed ? (t.absenYl ?? 0) : 0;
    let latestFrek = isSeed ? (t.frekuensiAbsen ?? 0) : 0;
    const sumB: [number, number, number, number] = [0, 0, 0, 0];
    let latestYl = masterYl;
    let latestL250 = t.l250 ?? 0;
    let latestL300 = t.l300 ?? 0;

    // Scan seluruh tanggal dalam bulan aktif di pjd
    for (let d = 1; d <= 31; d++) {
      const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
      const rec = pjd[dStr]?.[idx];
      if (rec) {
        hasPjdData = true;
        if (rec.v && Array.isArray(rec.v)) {
          sumV[0] += Number(rec.v[0]) || 0;
          sumV[1] += Number(rec.v[1]) || 0;
          sumV[2] += Number(rec.v[2]) || 0;
          sumV[3] += Number(rec.v[3]) || 0;
        }
        if (rec.b && Array.isArray(rec.b)) {
          for (let k = 0; k < 4; k++) sumB[k] += Number(rec.b[k]) || 0;
        }
        akmBb += Number(rec.bb) || 0;
        if (rec.absen !== undefined) latestAbsen = Number(rec.absen) || 0;
        if (rec.frek !== undefined) latestFrek = Number(rec.frek) || 0;
        if (rec.yl !== undefined && rec.yl > 0) latestYl = rec.yl;
        if (rec.l250 !== undefined) latestL250 = Number(rec.l250) || 0;
        if (rec.l300 !== undefined) latestL300 = Number(rec.l300) || 0;
      }
    }

    // Periksa juga todayInputs (input aktif hari ini yang baru diketik/diisi chip)
    const todayRec = state.todayInputs?.[idx];
    if (todayRec) {
      if (todayRec.absen !== undefined) latestAbsen = Number(todayRec.absen) || 0;
      if (todayRec.frek !== undefined) latestFrek = Number(todayRec.frek) || 0;
      if (todayRec.l250 !== undefined) latestL250 = Number(todayRec.l250) || 0;
      if (todayRec.l300 !== undefined) latestL300 = Number(todayRec.l300) || 0;
      if (todayRec.yl !== undefined && todayRec.yl > 0) latestYl = todayRec.yl;
    }

    const totalV = sumV[0] + sumV[1] + sumV[2] + sumV[3];
    const finalV: [number, number, number, number] = isSeed
      ? ((hasPjdData && totalV > 0) ? sumV : (t.penjualanAkm || [0, 0, 0, 0]))
      : sumV; // bulan selain data resmi: murni dari input harian (kosong kalau belum ada input)

    const totalSold = finalV[0] + finalV[1] + finalV[2] + finalV[3];
    // JWP diisi manual oleh TKU (tanpa rumus). Bulan data resmi (September) tanpa isian manual tetap memakai angka dasar spreadsheet.
    const jwpScan = getJwpAsOf(state, idx, period.daysInMonth, !isSeed);
    const finalAkmJwp = isSeed ? (jwpScan ?? (t.akmJwp || 0)) : (jwpScan ?? 0);
    const calculatedSYl = finalAkmJwp > 0 ? Math.floor(totalSold / finalAkmJwp) : 0;
    const finalSYl = isSeed ? (t.sYl || calculatedSYl) : calculatedSYl;

    // Nilai dari Profil TKU selalu menjadi rujukan utama untuk Jumlah YL & Area
    const finalYl = masterYl;
    const finalArea = masterArea;
    const finalCover = finalArea > 0 ? finalYl / finalArea : 1.0;

    const finalAbsen = latestAbsen;
    const finalFrek = latestFrek;

    const baseBb: [number, number, number, number] = isSeed
      ? ((t.bbAkm && (t.bbAkm[0] > 0 || t.bbAkm[1] > 0 || t.bbAkm[2] > 0 || t.bbAkm[3] > 0))
        ? t.bbAkm
        : (INITIAL_TKUS[idx]?.bbAkm || [0, 0, 0, 0]))
      : sumB; // bulan lain: BB per varian dijumlah dari botol balik harian

    return {
      ...t,
      penjualanAkm: finalV,
      jumlahYl: finalYl,
      jumlahArea: finalArea,
      coverageArea: finalCover,
      absenYl: finalAbsen,
      frekuensiAbsen: finalFrek,
      akmJwp: finalAkmJwp,
      sYl: finalSYl,
      l250: latestL250,
      l300: latestL300,
      bbAkm: baseBb
    };
  });

  // Sinkronisasi BB Harian Cabang untuk bulan aktif
  const nextBbHarian: Record<number, number> = isSeed ? { ...(state.bbHarian || {}) } : {};
  for (let d = 1; d <= period.daysInMonth; d++) {
    const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
    const dayRecords = pjd[dStr];
    if (dayRecords) {
      const dayTotalBb = Object.values(dayRecords).reduce((acc: number, r: any) => acc + (Number(r?.bb) || 0), 0);
      nextBbHarian[d] = dayTotalBb;
    }
  }

  return {
    ...state,
    pembagiHari: divider,
    tkus: nextTkus,
    bbHarian: nextBbHarian,
  };
}

export function saveAppState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // 1. Cadangan abadi sisa stok ke vault terisolasi (tahan restart/update kode)
    if (state.sisaStock && typeof state.sisaStock === 'object' && Object.keys(state.sisaStock).length > 0) {
      saveSisaStockBackup(state.sisaStock);
    }

    // 2. Cadangan keselamatan data utama (anti-kehilangan jika STORAGE_KEY bermasalah)
    try {
      localStorage.setItem(SAFETY_STATE_BACKUP_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        activePeriod: state.activePeriod,
        pjd: state.pjd,
        sisaStock: state.sisaStock,
        archives: state.archives,
        monthStore: state.monthStore,
        weeklyNotes: state.weeklyNotes,
        weeklyReplies: state.weeklyReplies,
        targetPerVariant: state.targetPerVariant,
        breakdown: state.breakdown,
        breakdownPerVariant: state.breakdownPerVariant
      }));
    } catch (_) {}

    if (state.supabaseConfig?.u || state.supabaseConfig?.k) {
      saveSupabaseConfigToVault(state.supabaseConfig);
    }
    if (state.role) {
      const now = Date.now();
      const lastActiveRaw = localStorage.getItem(LAST_ACTIVE_KEY);
      const lastActive = Number(lastActiveRaw) || now;
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ role: state.role, tkuId: state.activeTkuId, lastActive })
      );
      if (!lastActiveRaw) {
        localStorage.setItem(LAST_ACTIVE_KEY, String(now));
      }
    } else {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(LAST_ACTIVE_KEY);
    }
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function exportStateToJson(state: AppState) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `yakult_backup_${state.activeDate}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
