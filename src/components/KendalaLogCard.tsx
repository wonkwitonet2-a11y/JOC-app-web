import React, { useMemo, useState } from 'react';
import { Plus, Save, X, ClipboardList, History, Search } from 'lucide-react';
import { AppState, SolusiStatus, WeeklyNote } from '../types';
import { getPeriodInfo } from '../services/storage';
import {
  buildWaText, copyText, defaultNoteDate, emptyNote, groupKey, isNoteFilled, keyForDate,
  listLog, LogEntry, noteDateRange, normTopik
} from '../services/weeklyNotes';
import { KendalaLogTable } from './KendalaLogTable';
import { useConfirm } from './ConfirmDialog';

interface Props {
  state: AppState;
  tkuIdx: number; // indeks TKU di state.tkus
  onSaveNote: (key: string, note: WeeklyNote) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface Draft { d: string; tp: string; ar: string; a: string; s: string; h: string; }

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const periodeLabel = (p: string): string => {
  const [y, m] = p.split('-');
  const name = BULAN[Number(m) - 1];
  return name ? `${name} ${y}` : p;
};

const cardCls = 'rounded-2xl border shadow-xs bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800';
const inputCls = 'w-full text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40';
const labelCls = 'text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1';

// Halaman TKU "Kendala & Solusi": form tambah masalah (kapan saja) + tabel riwayat.
export const KendalaLogCard: React.FC<Props> = ({ state, tkuIdx, onSaveNote, showToast }) => {
  const { ask, dialog } = useConfirm();
  const tku = state.tkus[tkuIdx];
  const tkuId = tku?.id ?? -1;
  const period = getPeriodInfo(state).key;
  const range = noteDateRange(state);

  const blank = (): Draft => ({ d: defaultNoteDate(state), tp: '', ar: '', a: '', s: '', h: '' });
  const [draft, setDraft] = useState<Draft>(blank);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(blank);
  const [fPeriod, setFPeriod] = useState<string>(period);
  const [fText, setFText] = useState('');

  const all = useMemo(() => listLog(state, { tkuId }), [state, tkuId]);
  const periods = useMemo(() => {
    const set = new Set<string>(all.map(e => e.per));
    set.add(period);
    return Array.from(set).sort().reverse();
  }, [all, period]);

  const entries = useMemo(() => {
    const q = normTopik(fText);
    return all.filter(e => {
      if (fPeriod !== 'all' && e.per !== fPeriod) return false;
      if (!q) return true;
      return normTopik([e.v.tp, e.v.ar, e.v.a, e.v.s, e.v.h].join(' ')).includes(q);
    });
  }, [all, fPeriod, fText]);

  if (!tku) return null;

  const toNote = (dr: Draft, st: SolusiStatus, l: string[] = []): WeeklyNote => ({
    a: dr.a.trim(), s: dr.s.trim(), l, st, u: '',
    d: dr.d, tp: dr.tp.trim(), ar: dr.ar.trim().toUpperCase(), h: dr.h.trim()
  });
  const filled = (dr: Draft) => isNoteFilled(toNote(dr, 'belum')) && !!dr.d;

  const save = () => {
    if (!filled(draft)) return;
    onSaveNote(keyForDate(state, tkuId, draft.d), toNote(draft, 'belum'));
    showToast('Kendala ditambahkan ke Riwayat', 'success');
    setDraft(blank());
  };

  const startEdit = (e: LogEntry) => {
    setEditKey(e.k);
    // catatan lama: tanggal diambil dari tampilan (tetap di minggunya)
    setEditDraft({ d: e.v.d || defaultNoteDate(state), tp: e.n.tp || (e.v.legacy ? '' : e.v.tp), ar: e.v.ar, a: e.n.a, s: e.n.s, h: e.v.h });
  };
  const saveEdit = () => {
    if (!editKey) return;
    const cur = all.find(x => x.k === editKey);
    onSaveNote(editKey, toNote(editDraft, cur?.n.st || 'belum', cur?.n.l || []));
    showToast('Perubahan tersimpan', 'success');
    setEditKey(null);
  };
  const del = (e: LogEntry) => ask({
    title: 'Hapus catatan ini?',
    message: `Catatan ${e.v.tp || 'tanpa topik'}${e.v.ar ? ` (${e.v.ar})` : ''} akan dihapus permanen, termasuk tanggapan admin bila ada. Tindakan ini tidak bisa dibatalkan.`,
    confirmLabel: 'Ya, Hapus', cancelLabel: 'Batal', tone: 'danger',
    onConfirm: () => {
      onSaveNote(e.k, emptyNote());
      if (editKey === e.k) setEditKey(null);
      showToast('Catatan dihapus', 'success');
    }
  });
  const copyGroup = async (g: LogEntry[]) => {
    // urut area sesuai urutan input (lama ke baru)
    const rows = [...g].sort((a, b) => a.wk - b.wk || a.seq - b.seq).map(x => x.v);
    const ok = await copyText(buildWaText(rows));
    showToast(ok ? 'Laporan disalin, siap ditempel ke WhatsApp' : 'Tidak bisa menyalin di perangkat ini', ok ? 'success' : 'error');
  };

  const form = (dr: Draft, set: (p: Partial<Draft>) => void) => (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Topik</label>
        <input type="text" value={dr.tp} onChange={e => set({ tp: e.target.value })} className={inputCls} placeholder="Contoh: YL < 250" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Siapa</label>
          <input type="text" value={dr.ar} onChange={e => set({ ar: e.target.value })} className={`${inputCls} uppercase`} placeholder="Contoh: A04" />
        </div>
        <div>
          <label className={labelCls}>Kapan (tgl kejadian)</label>
          <input type="date" min={range.min} max={range.max} value={dr.d} onChange={e => set({ d: e.target.value })} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Kenapa</label>
        <textarea rows={2} value={dr.a} onChange={e => set({ a: e.target.value })} className={inputCls} placeholder="Penyebab masalah" />
      </div>
      <div>
        <label className={labelCls}>Tindakan</label>
        <textarea rows={2} value={dr.s} onChange={e => set({ s: e.target.value })} className={inputCls} placeholder="Langkah yang dilakukan" />
      </div>
      <div>
        <label className={labelCls}>Hasil</label>
        <textarea rows={2} value={dr.h} onChange={e => set({ h: e.target.value })} className={inputCls} placeholder="Contoh: rata-rata per 23/10 = 222" />
      </div>
    </div>
  );

  const canAdd = filled(draft);
  const canSaveEdit = filled(editDraft);
  const btnOn = 'bg-brand-600 hover:bg-brand-700 text-white cursor-pointer';
  const btnOff = 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed';

  return (
    <div className="space-y-4">
      {dialog}

      {/* ===== TAMBAH MASALAH ===== */}
      <div className={cardCls}>
        <div className="flex items-center gap-2.5 p-3.5 md:p-4">
          <span className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
            <ClipboardList className="w-4 h-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-neutral-900 dark:text-neutral-100">Kendala</span>
          </span>
        </div>
        <div className="px-3.5 md:px-4 pb-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
          {form(draft, p => setDraft(d => ({ ...d, ...p })))}
          <div className="flex">
            <button type="button" onClick={save} disabled={!canAdd}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${canAdd ? btnOn : btnOff}`}>
              <Plus className="w-4 h-4" />Simpan
            </button>
          </div>
        </div>
      </div>

      {/* ===== RIWAYAT ===== */}
      <div className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 md:p-4">
          <span className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shrink-0">
              <History className="w-4 h-4" />
            </span>
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Riwayat Kendala &amp; Solusi</span>
          </span>
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{entries.length} baris</span>
        </div>
        <div className="px-3.5 md:px-4 pb-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
          <div className="flex flex-wrap gap-2">
            <select value={fPeriod} onChange={e => setFPeriod(e.target.value)}
              className="text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 px-2 py-1.5">
              {periods.map(p => <option key={p} value={p}>{periodeLabel(p)}{p === period ? ' • berjalan' : ''}</option>)}
              <option value="all">Semua bulan</option>
            </select>
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input type="text" value={fText} onChange={e => setFText(e.target.value)} placeholder="Cari topik / area / isi"
                className="w-full text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 pl-8 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
            </div>
          </div>

          {entries.length === 0 && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Belum ada catatan. Masalah yang Anda simpan akan muncul di sini.</p>
          )}

          {entries.length > 0 && (
            <KendalaLogTable
              entries={entries}
              replyOf={k => state.weeklyReplies?.[k]?.t || ''}
              canEdit={e => e.per === period}
              onEdit={startEdit}
              onDelete={del}
              onStatus={(e, st) => onSaveNote(e.k, { ...e.n, st })}
              onCopyGroup={copyGroup}
            />
          )}

        </div>
      </div>
      {/* ===== EDIT (popup, selalu terlihat di layar) ===== */}
      {editKey && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={() => setEditKey(null)}>
          <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl p-4 space-y-3">
            <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Edit catatan</div>
            {form(editDraft, p => setEditDraft(d => ({ ...d, ...p })))}
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditKey(null)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer">
                <X className="w-4 h-4" />Batal
              </button>
              <button type="button" onClick={saveEdit} disabled={!canSaveEdit}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${canSaveEdit ? btnOn : btnOff}`}>
                <Save className="w-4 h-4" />Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
