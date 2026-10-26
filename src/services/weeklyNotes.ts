// ============================================================================
// CATATAN MINGGUAN TKU: alasan/kendala + solusi, ditulis oleh TKU, dibaca admin.
// Fungsi murni (tanpa React). Minggu mengikuti getWeeksOfMonth (Minggu–Sabtu),
// sama dengan menu Evaluasi, jadi nomor minggu di sini = kolom M1, M2, ... di Evaluasi.
// ============================================================================
import { AppState, SolusiStatus, WeeklyNote, WeeklyReply } from '../types';
import { getPeriodInfo, getWeeksOfMonth } from './storage';
import { buildProgressEval, EvalUnit } from './progressEval';

export const LABEL_PENYEBAB = [
  'YL absen',
  'YL belum mandiri',
  'BB tinggi',
  'Area kosong',
  'Lainnya'
] as const;

export const STATUS_SOLUSI: { id: SolusiStatus; text: string }[] = [
  { id: 'belum', text: 'Belum' },
  { id: 'proses', text: 'Proses' },
  { id: 'selesai', text: 'Selesai' }
];

// Batas s/YL: di bawah angka ini YL dianggap belum mandiri (aturan aplikasi).
export const SYL_BATAS = 250;

export const noteKey = (periode: string, tkuId: number, week: number): string =>
  `${periode}:${tkuId}:${week}`;

export const emptyNote = (): WeeklyNote => ({ a: '', s: '', l: [], st: 'belum', u: '' });

export const isNoteFilled = (n?: WeeklyNote | null): boolean =>
  !!n && (n.a.trim() !== '' || n.s.trim() !== '' || (n.l && n.l.length > 0));

export const getNote = (state: AppState, periode: string, tkuId: number, week: number): WeeklyNote | undefined =>
  state.weeklyNotes?.[noteKey(periode, tkuId, week)];

export const getReply = (state: AppState, periode: string, tkuId: number, week: number): WeeklyReply | undefined =>
  state.weeklyReplies?.[noteKey(periode, tkuId, week)];

// ---------------------------------------------------------------------------
// Banyak catatan per minggu. Catatan pertama memakai kunci lama `periode:tku:minggu`
// (agar data lama tetap terbaca); catatan tambahan memakai `periode:tku:minggu:urutan` (urutan >= 2).
// Tanggapan admin memakai kunci yang sama dengan catatannya.
// ---------------------------------------------------------------------------
export interface NoteEntry { k: string; per: string; id: number; wk: number; seq: number; n: WeeklyNote; }

export const parseNoteKey = (k: string): { per: string; id: number; wk: number; seq: number } => {
  const [per, id, wk, seq] = k.split(':');
  return { per, id: Number(id), wk: Number(wk), seq: seq ? Number(seq) : 1 };
};

const keyWithSeq = (periode: string, tkuId: number, week: number, seq: number): string =>
  seq <= 1 ? noteKey(periode, tkuId, week) : `${periode}:${tkuId}:${week}:${seq}`;

// Semua catatan satu TKU di satu minggu, urut dari yang pertama ditulis.
export function listNotes(state: AppState, periode: string, tkuId: number, week: number): NoteEntry[] {
  const out: NoteEntry[] = [];
  Object.keys(state.weeklyNotes || {}).forEach(k => {
    const p = parseNoteKey(k);
    if (p.per !== periode || p.id !== tkuId || p.wk !== week) return;
    const n = state.weeklyNotes![k];
    if (!isNoteFilled(n)) return;
    out.push({ k, ...p, n });
  });
  return out.sort((a, b) => a.seq - b.seq);
}

// Kunci kosong berikutnya untuk menambah catatan baru di minggu itu.
export function nextNoteKey(state: AppState, periode: string, tkuId: number, week: number): string {
  let seq = 1;
  const notes = state.weeklyNotes || {};
  while (notes[keyWithSeq(periode, tkuId, week, seq)]) seq++;
  return keyWithSeq(periode, tkuId, week, seq);
}

// Simpan / ubah satu catatan berdasarkan kuncinya. Catatan kosong total dihapus.
export function withNoteByKey(state: AppState, key: string, note: WeeklyNote): AppState {
  const next = { ...(state.weeklyNotes || {}) };
  if (isNoteFilled(note)) {
    next[key] = { ...note, u: new Date().toISOString() };
    return { ...state, weeklyNotes: next };
  }
  // Catatan dihapus: tanggapan admin pada kunci yang sama ikut dihapus agar tidak menempel
  // pada catatan baru yang nanti memakai kunci itu lagi.
  delete next[key];
  const replies = { ...(state.weeklyReplies || {}) };
  delete replies[key];
  return { ...state, weeklyNotes: next, weeklyReplies: replies };
}

export function withReplyByKey(state: AppState, key: string, text: string): AppState {
  const next = { ...(state.weeklyReplies || {}) };
  if (text.trim()) next[key] = { t: text.trim(), u: new Date().toISOString() };
  else delete next[key];
  return { ...state, weeklyReplies: next };
}

// Kembalikan state baru dengan catatan TKU disimpan. Catatan kosong total dihapus.
export function withNote(state: AppState, periode: string, tkuId: number, week: number, note: WeeklyNote): AppState {
  const key = noteKey(periode, tkuId, week);
  const next = { ...(state.weeklyNotes || {}) };
  if (isNoteFilled(note)) next[key] = { ...note, u: new Date().toISOString() };
  else delete next[key];
  return { ...state, weeklyNotes: next };
}

export function withReply(state: AppState, periode: string, tkuId: number, week: number, text: string): AppState {
  const key = noteKey(periode, tkuId, week);
  const next = { ...(state.weeklyReplies || {}) };
  if (text.trim()) next[key] = { t: text.trim(), u: new Date().toISOString() };
  else delete next[key];
  return { ...state, weeklyReplies: next };
}

// Apakah angka TKU minggu berjalan "menuntut penjelasan": penjualan turun vs minggu lalu, atau s/YL < 250.
export function needsNote(unit: EvalUnit | undefined): { need: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!unit) return { need: false, reasons };
  const w = unit.week;
  if (w.days.length > 0 && w.diff < 0) reasons.push('penjualan turun vs minggu lalu');
  if (w.sylNow !== null && w.sylNow < SYL_BATAS) reasons.push(`s/YL di bawah ${SYL_BATAS}`);
  return { need: reasons.length > 0, reasons };
}

export interface WeekInfo {
  period: string; // YYYY-MM
  weeks: { start: number; end: number }[];
  currentWeek: number; // nomor minggu (mulai 1) yang memuat tanggal update
  unitByIdx: Map<number, EvalUnit>;
}

export function getWeekInfo(state: AppState): WeekInfo {
  const p = getPeriodInfo(state);
  const weeks = getWeeksOfMonth(state);
  const pe = buildProgressEval(state, weeks);
  const unitByIdx = new Map<number, EvalUnit>();
  pe.units.forEach(u => unitByIdx.set(u.idx, u));
  return { period: p.key, weeks, currentWeek: pe.cmp.weekIdx + 1, unitByIdx };
}

// Solusi minggu lalu yang belum selesai (pengingat di minggu ini). Memeriksa semua catatan minggu lalu.
export function pendingSolusi(state: AppState, periode: string, tkuId: number, week: number): WeeklyNote | null {
  if (week <= 1) return null;
  const found = listNotes(state, periode, tkuId, week - 1)
    .find(e => e.n.s.trim() !== '' && e.n.st !== 'selesai');
  return found ? found.n : null;
}

// Rekap label penyebab untuk satu minggu (semua TKU, atau hanya idList bila diberikan).
export function rekapPenyebab(state: AppState, periode: string, week: number, tkuIds: number[]): { label: string; count: number }[] {
  const counts: Record<string, number> = {};
  tkuIds.forEach(id => {
    listNotes(state, periode, id, week).forEach(e => {
      (e.n.l || []).forEach(l => { counts[l] = (counts[l] || 0) + 1; });
    });
  });
  return Object.keys(counts)
    .map(label => ({ label, count: counts[label] }))
    .sort((a, b) => b.count - a.count);
}
