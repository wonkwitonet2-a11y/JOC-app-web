import React, { useEffect, useMemo, useState } from 'react';
import { StickyNote, AlertTriangle, Plus, Save, Clock, MessageSquare, Pencil, History, X, Trash2 } from 'lucide-react';
import { AppState, SolusiStatus, WeeklyNote } from '../types';
import { formatNumber, formatPercent, formatDiff } from '../services/storage';
import {
  LABEL_PENYEBAB, STATUS_SOLUSI, emptyNote, getWeekInfo, isNoteFilled, listNotes,
  needsNote, nextNoteKey, parseNoteKey, pendingSolusi
} from '../services/weeklyNotes';
import { CatatanBaris } from './CatatanBaris';
import { useConfirm } from './ConfirmDialog';

interface Props {
  state: AppState;
  tkuIdx: number; // indeks TKU di state.tkus
  onSaveNote: (key: string, note: WeeklyNote) => void; // key = periode:tkuId:minggu[:urutan]
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const periodeLabel = (p: string): string => {
  const [y, m] = p.split('-');
  const name = BULAN[Number(m) - 1];
  return name ? `${name} ${y}` : p;
};
const waktu = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const num = (n: number | null | undefined): string => (n === null || n === undefined ? '—' : formatNumber(n));
const statusText = (st: SolusiStatus): string => STATUS_SOLUSI.find(s => s.id === st)?.text || 'Belum';

const cardCls = 'rounded-2xl border shadow-xs bg-white dark:bg-neutral-900';
const areaCls = 'w-full text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40';

// Halaman TKU "Kendala & Solusi": kartu TAMBAH catatan (selalu menambah, tidak mengedit)
// + kartu Riwayat Catatan (edit dan centang status hanya di sini).
export const CatatanMingguanCard: React.FC<Props> = ({ state, tkuIdx, onSaveNote, showToast }) => {
  const { ask, dialog } = useConfirm();
  const tku = state.tkus[tkuIdx];
  const tkuId = tku?.id ?? -1;
  const info = useMemo(() => getWeekInfo(state), [state]);
  const [week, setWeek] = useState<number>(info.currentWeek);
  const [draft, setDraft] = useState<WeeklyNote>(emptyNote());
  // Edit hanya terjadi di Riwayat: kunci catatan yang sedang diedit + isian sementaranya.
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<WeeklyNote>(emptyNote());

  useEffect(() => {
    setWeek(info.currentWeek); setDraft(emptyNote()); setEditKey(null);
  }, [info.currentWeek, info.period, tkuId]);

  // Riwayat: semua catatan TKU ini, bulan dan minggu terbaru di atas; dalam satu minggu urut tulis.
  const entries = useMemo(() => {
    return Object.keys(state.weeklyNotes || {})
      .map(k => ({ k, ...parseNoteKey(k), n: state.weeklyNotes![k] }))
      .filter(e => e.id === tkuId && isNoteFilled(e.n))
      .sort((a, b) => (a.per === b.per ? (a.wk === b.wk ? b.seq - a.seq : b.wk - a.wk) : a.per < b.per ? 1 : -1));
  }, [state.weeklyNotes, tkuId]);

  if (!tku) return null;

  const isCurrent = week === info.currentWeek;
  const unit = info.unitByIdx.get(tkuIdx);
  const check = needsNote(isCurrent ? unit : undefined);
  const pending = pendingSolusi(state, info.period, tkuId, week);
  const hasNoteThisWeek = listNotes(state, info.period, tkuId, week).length > 0;
  const unfilled = isCurrent && check.need && !hasNoteThisWeek;
  const canAdd = isNoteFilled(draft);
  const canSaveEdit = isNoteFilled(editDraft);

  const patch = (p: Partial<WeeklyNote>) => setDraft(d => ({ ...d, ...p }));
  const toggleLabel = (l: string) => patch({ l: draft.l.includes(l) ? draft.l.filter(x => x !== l) : [...draft.l, l] });
  const patchEdit = (p: Partial<WeeklyNote>) => setEditDraft(d => ({ ...d, ...p }));
  const toggleEditLabel = (l: string) => patchEdit({ l: editDraft.l.includes(l) ? editDraft.l.filter(x => x !== l) : [...editDraft.l, l] });

  const changeWeek = (n: number) => { setWeek(n); setDraft(emptyNote()); };

  // Tombol "Tambah Catatan": selalu membuat catatan BARU (kunci kosong berikutnya), tidak menimpa yang lama.
  const addNote = () => {
    onSaveNote(nextNoteKey(state, info.period, tkuId, week), { ...draft, st: 'belum' });
    showToast('Catatan ditambahkan ke Riwayat', 'success');
    setDraft(emptyNote());
  };

  const startEdit = (k: string, n: WeeklyNote) => {
    setEditKey(k);
    setEditDraft({ ...n, l: [...(n.l || [])] });
  };
  const cancelEdit = () => { setEditKey(null); setEditDraft(emptyNote()); };
  const saveEdit = () => {
    if (!editKey) return;
    onSaveNote(editKey, editDraft);
    showToast('Perubahan catatan tersimpan', 'success');
    cancelEdit();
  };

  // Hapus catatan dari Riwayat, selalu lewat konfirmasi.
  const deleteNote = (k: string, wk: number, per: string) => {
    ask({
      title: 'Hapus catatan ini?',
      message: `Catatan minggu ke-${wk} (${periodeLabel(per)}) akan dihapus permanen, termasuk tanggapan admin bila ada. Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: 'Ya, Hapus',
      cancelLabel: 'Batal',
      tone: 'danger',
      onConfirm: () => {
        onSaveNote(k, emptyNote());
        if (editKey === k) cancelEdit();
        showToast('Catatan dihapus', 'success');
      }
    });
  };

  // Centang status langsung di Riwayat.
  const setStatus = (k: string, n: WeeklyNote, st: SolusiStatus) => {
    onSaveNote(k, { ...n, st });
  };

  const w = unit?.week;
  const chips: { k: string; v: string; bad?: boolean }[] = [];
  if (isCurrent && w) {
    chips.push({ k: 'Penjualan vs mgg lalu', v: `${formatNumber(w.cur)} vs ${formatNumber(w.prev)} (${formatDiff(w.diff)})`, bad: w.days.length > 0 && w.diff < 0 });
    chips.push({ k: 's/YL', v: `${num(w.sylPrev)} → ${num(w.sylNow)}`, bad: w.sylNow !== null && w.sylNow < 250 });
    chips.push({ k: 'YL absen', v: `${num(w.absenPrev)} → ${num(w.absenNow)}` });
    chips.push({ k: '% BB', v: `${formatPercent(w.bbPctPrev)} → ${formatPercent(w.bbPctCur)}` });
  }
  const wk = info.weeks[week - 1];
  const selectable = info.weeks.map((x, i) => ({ n: i + 1, ...x })).filter(x => x.n <= info.currentWeek);

  const labelPicker = (on: (l: string) => boolean, toggle: (l: string) => void) => (
    <div>
      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">Penyebab (pilih bila ada)</span>
      <div className="flex flex-wrap gap-1.5">
        {LABEL_PENYEBAB.map(l => (
          <button
            key={l}
            type="button"
            onClick={() => toggle(l)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-colors ${on(l) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {dialog}
      {/* ===== KARTU TAMBAH CATATAN (selalu menambah, bukan edit) ===== */}
      <div className={`${cardCls} ${unfilled ? 'border-amber-300 dark:border-amber-700/70' : 'border-neutral-200 dark:border-neutral-800'}`}>
        <div className="flex items-center justify-between gap-3 p-3.5 md:p-4">
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
              <StickyNote className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-neutral-900 dark:text-neutral-100">Tambah Catatan</span>
              <span className="block text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {unfilled ? 'Mohon isi alasan: ' + check.reasons.join(', ') : 'Setiap catatan baru masuk ke Riwayat di bawah'}
              </span>
            </span>
          </span>
          {unfilled && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 shrink-0">Perlu catatan</span>}
        </div>

        <div className="px-3.5 md:px-4 pb-4 space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Minggu</label>
            <select
              value={week}
              onChange={e => changeWeek(Number(e.target.value))}
              className="text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 px-2 py-1"
            >
              {selectable.map(x => (
                <option key={x.n} value={x.n}>M{x.n} (tgl {x.start}–{x.end}){x.n === info.currentWeek ? ' • berjalan' : ''}</option>
              ))}
            </select>
          </div>

          {chips.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {chips.map(c => (
                <div key={c.k} className={`rounded-xl px-2.5 py-1.5 border ${c.bad ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50' : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700'}`}>
                  <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{c.k}</div>
                  <div className={`text-xs font-bold font-mono ${c.bad ? 'text-red-700 dark:text-red-300' : 'text-neutral-900 dark:text-neutral-100'}`}>{c.v}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Angka pembanding hanya ditampilkan untuk minggu berjalan{wk ? ` (M${week}: tgl ${wk.start}–${wk.end})` : ''}.</p>
          )}

          {pending && (
            <div className="rounded-xl p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300"><Clock className="w-3.5 h-3.5" />Solusi minggu lalu belum selesai ({statusText(pending.st)})</div>
              <div className="text-amber-900 dark:text-amber-200 break-words">{pending.s}</div>
            </div>
          )}

          {labelPicker(l => draft.l.includes(l), toggleLabel)}

          <div className="space-y-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3 h-3" />Kendala
              </label>
              <textarea rows={3} value={draft.a} onChange={e => patch({ a: e.target.value })} className={areaCls}
                placeholder="Contoh: 2 YL tidak masuk karena sakit, area Sukorambi belum ada pengganti" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Solusi / Tindak Lanjut</label>
              <textarea rows={3} value={draft.s} onChange={e => patch({ s: e.target.value })} className={areaCls}
                placeholder="Contoh: cari YL pengganti, pendampingan staf di area tersebut mulai Senin" />
            </div>
          </div>

          <button
            type="button"
            onClick={addNote}
            disabled={!canAdd}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${canAdd ? 'bg-brand-600 hover:bg-brand-700 text-white cursor-pointer' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'}`}
          >
            <Plus className="w-4 h-4" />Tambah Catatan
          </button>
        </div>
      </div>

      {/* ===== KARTU RIWAYAT CATATAN ===== */}
      <div className={`${cardCls} border-neutral-200 dark:border-neutral-800`}>
        <div className="flex items-center justify-between gap-3 p-3.5 md:p-4">
          <span className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
              <History className="w-4 h-4" />
            </span>
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Riwayat Catatan</span>
          </span>
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{entries.length} catatan</span>
        </div>
        <div className="px-3.5 md:px-4 pb-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5">
          {entries.length === 0 && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Belum ada catatan. Catatan yang Anda simpan akan muncul di sini.</p>
          )}
          {entries.map(e => {
            const reply = state.weeklyReplies?.[e.k];
            const canEdit = e.per === info.period;
            const range = canEdit ? info.weeks[e.wk - 1] : undefined;
            const isEditing = editKey === e.k;
            return (
              <div key={e.k} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      M{e.wk} <span className="font-semibold text-neutral-500 dark:text-neutral-400">• {periodeLabel(e.per)}{range ? ` (tgl ${range.start}–${range.end})` : ''}</span>
                    </div>
                    {e.n.u && <div className="text-xs text-neutral-400">Disimpan {waktu(e.n.u)}</div>}
                  </div>
                  {canEdit && !isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={() => startEdit(e.k, e.n)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer shrink-0">
                      <Pencil className="w-3 h-3" />Edit
                    </button>
                      <button type="button" onClick={() => deleteNote(e.k, e.wk, e.per)} aria-label="Hapus catatan" title="Hapus catatan"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer">
                        <Trash2 className="w-3 h-3" />Hapus
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    {labelPicker(l => editDraft.l.includes(l), toggleEditLabel)}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3 h-3" />Kendala
                      </label>
                      <textarea rows={3} value={editDraft.a} onChange={ev => patchEdit({ a: ev.target.value })} className={areaCls} />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Solusi / Tindak Lanjut</label>
                      <textarea rows={3} value={editDraft.s} onChange={ev => patchEdit({ s: ev.target.value })} className={areaCls} />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={cancelEdit}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer">
                        <X className="w-4 h-4" />Batal
                      </button>
                      <button type="button" onClick={saveEdit} disabled={!canSaveEdit}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${canSaveEdit ? 'bg-brand-600 hover:bg-brand-700 text-white cursor-pointer' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'}`}>
                        <Save className="w-4 h-4" />Simpan Perubahan
                      </button>
                    </div>
                  </div>
                ) : (
                  <CatatanBaris note={e.n} onChangeStatus={st => setStatus(e.k, e.n, st)} />
                )}

                {reply && reply.t.trim() && (
                  <div className="rounded-lg p-2 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-sky-800 dark:text-sky-300"><MessageSquare className="w-3.5 h-3.5" />Tanggapan admin</div>
                    <div className="text-sky-900 dark:text-sky-100 break-words whitespace-pre-wrap">{reply.t}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
