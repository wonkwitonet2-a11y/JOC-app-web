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

export const emptyNote = (): WeeklyNote => ({ a: '', s: '', l: [], st: 'belum', u: '', d: '', tp: '', ar: '', h: '' });

export const isNoteFilled = (n?: WeeklyNote | null): boolean =>
  !!n && (
    (n.a || '').trim() !== '' || (n.s || '').trim() !== '' || (n.l && n.l.length > 0) ||
    (n.tp || '').trim() !== '' || (n.ar || '').trim() !== '' || (n.h || '').trim() !== ''
  );

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

// ---------------------------------------------------------------------------
// LOG KENDALA & SOLUSI (harian / tiap ada masalah). Satu baris = satu kejadian untuk satu area YL.
// Kolom: Tgl, Topik, Area, Kenapa (a), Tindakan (s), Hasil (h). Disimpan di peta weeklyNotes yang sama
// (kunci periode:tku:minggu:urutan) supaya sinkron, arsip, dan tanggapan admin tetap berjalan.
// ---------------------------------------------------------------------------
const pad2 = (n: number) => String(n).padStart(2, '0');

// Tanggal default form: hari ini bila masih di bulan kerja, selain itu tanggal terakhir bulan kerja.
export function defaultNoteDate(state: AppState): string {
  const p = getPeriodInfo(state);
  const now = new Date();
  const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  return today.slice(0, 7) === p.key ? today : `${p.key}-${pad2(p.daysInMonth)}`;
}

// Batas isian tanggal: hanya di dalam bulan kerja.
export function noteDateRange(state: AppState): { min: string; max: string } {
  const p = getPeriodInfo(state);
  return { min: `${p.key}-01`, max: `${p.key}-${pad2(p.daysInMonth)}` };
}

// Nomor minggu (mulai 1) yang memuat tanggal itu di bulan kerja; sama dengan kolom M1, M2, ... di Evaluasi.
export function weekOfDate(state: AppState, date: string): number {
  const day = Number(date.slice(8, 10));
  const weeks = getWeeksOfMonth(state);
  const i = weeks.findIndex(w => day >= w.start && day <= w.end);
  return i >= 0 ? i + 1 : 1;
}

// Kunci catatan untuk tanggal tertentu; pakai urutan kosong berikutnya di minggu itu.
export function keyForDate(state: AppState, tkuId: number, date: string): string {
  const per = date.slice(0, 7);
  return nextNoteKey(state, per, tkuId, weekOfDate(state, date));
}

// Simpan catatan yang tanggalnya berubah: bila minggu/bulan berbeda, kunci dipindah dan tanggapan admin ikut.
export function withNoteMovedByDate(state: AppState, oldKey: string, note: WeeklyNote): AppState {
  if (!note.d) return withNoteByKey(state, oldKey, note);
  const old = parseNoteKey(oldKey);
  const per = note.d.slice(0, 7);
  const wk = weekOfDate(state, note.d);
  if (old.per === per && old.wk === wk) return withNoteByKey(state, oldKey, note);
  const newKey = nextNoteKey(state, per, old.id, wk);
  const notes = { ...(state.weeklyNotes || {}) };
  const replies = { ...(state.weeklyReplies || {}) };
  delete notes[oldKey];
  notes[newKey] = { ...note, u: new Date().toISOString() };
  if (replies[oldKey]) { replies[newKey] = replies[oldKey]; delete replies[oldKey]; }
  return { ...state, weeklyNotes: notes, weeklyReplies: replies };
}

export const normTopik = (t?: string): string => (t || '').trim().replace(/\s+/g, ' ').toLowerCase();

// "2026-10-23" -> "23/10/26"
export function fmtTgl(d?: string): string {
  if (!d || d.length < 10) return '';
  return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}`;
}

// Isi catatan seperti yang ditampilkan di tabel baru. Catatan lama (tanpa field baru) TIDAK diubah di penyimpanan;
// ia hanya dipetakan saat ditampilkan: Tgl dari waktu simpan (dijaga tetap di minggunya), Topik dari label penyebab
// (atau "Catatan mingguan"), Area & Hasil kosong sampai dilengkapi lewat Edit.
export interface NoteView { d: string; tp: string; ar: string; a: string; s: string; h: string; legacy: boolean; }

export function viewNote(state: AppState, k: string, n: WeeklyNote): NoteView {
  const legacy = !n.d;
  let d = n.d || '';
  if (!d) {
    const { per, wk } = parseNoteKey(k);
    const weeks = getWeeksOfMonth(state);
    const inPeriod = per === getPeriodInfo(state).key;
    const wRange = inPeriod ? weeks[wk - 1] : undefined;
    let cand = '';
    if (n.u) {
      const t = new Date(n.u);
      if (!isNaN(t.getTime())) cand = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
    }
    if (inPeriod && wRange) {
      const day = Number(cand.slice(8, 10));
      d = cand.slice(0, 7) === per && day >= wRange.start && day <= wRange.end ? cand : `${per}-${pad2(wRange.start)}`;
    } else {
      d = cand;
    }
  }
  const tp = (n.tp || '').trim() || ((n.l || []).length ? n.l.join(', ') : (legacy ? 'Catatan mingguan' : ''));
  return { d, tp, ar: (n.ar || '').trim(), a: n.a || '', s: n.s || '', h: n.h || '', legacy };
}

// Teks laporan untuk WhatsApp. Baris yang tanggal + topiknya sama digabung jadi satu laporan.
export function buildWaText(rows: NoteView[]): string {
  if (rows.length === 0) return '';
  const first = rows[0];
  const per = (f: (n: NoteView) => string) =>
    rows.map(n => `- ${n.ar || '-'} : ${f(n).trim() || '-'}`).join('\n');
  return [
    `*Topik* : ${first.tp || '-'}`,
    '',
    '*Siapa* : ',
    rows.map(n => n.ar || '-').join('\n'),
    '',
    `*Kapan* : ${fmtTgl(first.d) || '-'}`,
    '',
    '*Kenapa* :',
    per(n => n.a),
    '',
    '*Tindakan*',
    per(n => n.s),
    '',
    '*Hasil* : ',
    rows.map(n => `${n.ar || '-'} : ${n.h.trim() || '-'}`).join('\n')
  ].join('\n');
}

// Urut: tanggal terbaru dulu, lalu bulan/minggu/urutan terbaru.
export interface LogEntry { k: string; per: string; id: number; wk: number; seq: number; n: WeeklyNote; v: NoteView; }
export function sortLog(a: LogEntry, b: LogEntry): number {
  if (a.v.d !== b.v.d) return a.v.d < b.v.d ? 1 : -1;
  if (a.per !== b.per) return a.per < b.per ? 1 : -1;
  if (a.wk !== b.wk) return b.wk - a.wk;
  return b.seq - a.seq;
}

// Semua catatan (opsional hanya satu TKU / satu periode) sebagai LogEntry.
export function listLog(state: AppState, opts: { tkuId?: number; periode?: string } = {}): LogEntry[] {
  const out: LogEntry[] = [];
  Object.keys(state.weeklyNotes || {}).forEach(k => {
    const p = parseNoteKey(k);
    if (opts.tkuId !== undefined && p.id !== opts.tkuId) return;
    if (opts.periode && p.per !== opts.periode) return;
    const n = state.weeklyNotes![k];
    if (!isNoteFilled(n)) return;
    out.push({ k, ...p, n, v: viewNote(state, k, n) });
  });
  return out.sort(sortLog);
}

// Kelompok baris yang sama TKU + tanggal + topik (untuk salin WA). Catatan lama tanpa topik tak digabung.
export const groupKey = (e: LogEntry): string =>
  e.v.legacy ? `x:${e.k}` : `${e.id}|${e.v.d}|${normTopik(e.v.tp)}`;

// Salin teks ke clipboard; ada cadangan untuk browser/iframe yang memblokir clipboard API.
export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* lanjut cadangan */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// Rekap topik (admin): jumlah catatan per topik, tulisan yang beda huruf besar/spasi dianggap sama.
export function rekapTopik(notes: { tp: string }[]): { label: string; count: number }[] {
  const map = new Map<string, { label: string; count: number }>();
  notes.forEach(n => {
    const key = normTopik(n.tp);
    if (!key) return;
    const cur = map.get(key);
    if (cur) cur.count++;
    else map.set(key, { label: n.tp.trim(), count: 1 });
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
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
