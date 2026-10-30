import React, { useMemo, useState } from 'react';
import { StickyNote, AlertTriangle, CheckCircle2, MessageSquare, Save, BarChart3 } from 'lucide-react';
import { AppState } from '../types';
import { getWeekInfo, listNotes, needsNote, rekapPenyebab } from '../services/weeklyNotes';
import { CatatanBaris } from './CatatanBaris';

interface Props {
  state: AppState;
  selectedRayon: number; // 0: cabang, 1/2: rayon
  onSaveReply: (key: string, text: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReplyBox: React.FC<{ initial: string; onSave: (t: string) => void }> = ({ initial, onSave }) => {
  const [text, setText] = useState(initial);
  const [dirty, setDirty] = useState(false);
  // ikuti perubahan dari perangkat lain selama belum diedit di sini
  React.useEffect(() => { if (!dirty) setText(initial); }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
        <MessageSquare className="w-3 h-3" />Tanggapan admin (opsional)
      </label>
      <textarea
        rows={2}
        value={text}
        onChange={e => { setText(e.target.value); setDirty(true); }}
        placeholder="Arahan singkat untuk TKU"
        className="w-full text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 p-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      />
      <button
        type="button"
        disabled={!dirty}
        onClick={() => { onSave(text); setDirty(false); }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${dirty ? 'bg-brand-600 hover:bg-brand-700 text-white cursor-pointer' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'}`}
      >
        <Save className="w-3.5 h-3.5" />{dirty ? 'Simpan Tanggapan' : 'Tersimpan'}
      </button>
    </div>
  );
};

// Panel admin di menu Evaluasi: baca catatan semua TKU per minggu, rekap penyebab, beri tanggapan.
export const CatatanMingguanPanel: React.FC<Props> = ({ state, selectedRayon, onSaveReply, showToast }) => {
  const info = useMemo(() => getWeekInfo(state), [state]);
  const [week, setWeek] = useState<number>(info.currentWeek);
  const isCurrent = week === info.currentWeek;

  const tkus = state.tkus
    .map((t, idx) => ({ t, idx }))
    .filter(x => x.t.aktif && (selectedRayon === 0 || x.t.rayon === selectedRayon));

  const rekap = rekapPenyebab(state, info.period, week, tkus.map(x => x.t.id));
  const maxCount = rekap.reduce((m, r) => Math.max(m, r.count), 0) || 1;

  const filledCount = tkus.filter(x => listNotes(state, info.period, x.t.id, week).length > 0).length;
  const needCount = isCurrent
    ? tkus.filter(x => needsNote(info.unitByIdx.get(x.idx)).need && listNotes(state, info.period, x.t.id, week).length === 0).length
    : 0;
  const selectable = info.weeks.map((w, i) => ({ n: i + 1, ...w })).filter(x => x.n <= info.currentWeek);

  return (
    <div className="p-4 md:p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-neutral-100">
          <StickyNote className="w-4 h-4 text-brand-600 dark:text-brand-400" />Catatan Mingguan TKU
        </h3>
        <select
          value={week}
          onChange={e => setWeek(Number(e.target.value))}
          className="text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 px-2 py-1"
        >
          {selectable.map(x => (
            <option key={x.n} value={x.n}>M{x.n} (tgl {x.start}–{x.end}){x.n === info.currentWeek ? ' • berjalan' : ''}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold">
          {filledCount} dari {tkus.length} TKU sudah menulis
        </span>
        {needCount > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-semibold">
            {needCount} TKU angkanya turun tapi belum menulis
          </span>
        )}
      </div>

      {rekap.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1"><BarChart3 className="w-3 h-3" />Penyebab terbanyak</span>
          {rekap.map(r => (
            <div key={r.label} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 font-semibold text-neutral-700 dark:text-neutral-300">{r.label}</span>
              <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${(r.count / maxCount) * 100}%` }} />
              </div>
              <span className="w-6 text-right font-mono font-bold text-neutral-700 dark:text-neutral-300">{r.count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        {tkus.map(({ t, idx }) => {
          const notes = listNotes(state, info.period, t.id, week);
          const filled = notes.length > 0;
          const chk = isCurrent ? needsNote(info.unitByIdx.get(idx)) : { need: false, reasons: [] as string[] };
          const warn = !filled && chk.need;
          return (
            <div key={t.id} className={`rounded-2xl border p-3 space-y-2 ${warn ? 'border-amber-300 dark:border-amber-700/70 bg-amber-50/40 dark:bg-amber-950/10' : 'border-neutral-200 dark:border-neutral-800'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{t.nama} <span className="text-xs font-semibold text-neutral-400">Rayon {t.rayon}</span></span>
                {filled ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />{notes.length} catatan</span>
                ) : warn ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5" />Belum menulis</span>
                ) : (
                  <span className="text-xs font-semibold text-neutral-400">Belum ada catatan</span>
                )}
              </div>
              {warn && <p className="text-xs text-amber-800 dark:text-amber-300">Perlu penjelasan: {chk.reasons.join(', ')}.</p>}
              {notes.map(({ k, n }) => {
                const reply = state.weeklyReplies?.[k];
                return (
                  <div key={k} className="space-y-2">
                    {/* Format sama dengan Riwayat TKU: Kendala | Solusi | Status (baca saja untuk admin) */}
                    <CatatanBaris note={n} />
                    <ReplyBox
                      initial={reply?.t || ''}
                      onSave={txt => { onSaveReply(k, txt); showToast?.('Tanggapan tersimpan', 'success'); }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
        {tkus.length === 0 && <p className="text-xs text-neutral-500">Tidak ada TKU aktif pada pilihan ini.</p>}
      </div>
    </div>
  );
};
