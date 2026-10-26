import React from 'react';
import { AlertTriangle, Lightbulb, Check } from 'lucide-react';
import { SolusiStatus, WeeklyNote } from '../types';
import { STATUS_SOLUSI } from '../services/weeklyNotes';

interface Props {
  note: WeeklyNote;
  // Bila diberikan, status bisa dicentang langsung. Tanpa ini, status hanya tampil (baca saja).
  onChangeStatus?: (st: SolusiStatus) => void;
}

const chipCls = 'px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-900/40';

// Satu baris catatan: [Kendala] [Solusi] [Status]. Dipakai di Riwayat (TKU) dan panel admin,
// supaya tampilan kiri-kanannya sama.
export const CatatanBaris: React.FC<Props> = ({ note, onChangeStatus }) => {
  const hasSolusi = note.s.trim() !== '';
  const readOnly = !onChangeStatus;
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-2.5 items-stretch">
      {/* KIRI: kendala */}
      <div className="rounded-xl border border-red-200/70 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-2.5 space-y-1.5 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />Kendala
        </div>
        {note.l.length > 0 && (
          <div className="flex flex-wrap gap-1">{note.l.map(l => <span key={l} className={chipCls}>{l}</span>)}</div>
        )}
        <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words leading-relaxed">
          {note.a.trim() || <span className="text-neutral-400">—</span>}
        </p>
      </div>

      {/* KANAN: solusi */}
      <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 space-y-1.5 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
          <Lightbulb className="w-3.5 h-3.5 shrink-0" />Solusi
        </div>
        <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words leading-relaxed">
          {hasSolusi ? note.s : <span className="text-neutral-400">—</span>}
        </p>
      </div>

      {/* SAMPING: status, tinggal dicentang */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-2 flex flex-col justify-center gap-1.5 bg-neutral-50/50 dark:bg-neutral-800/30">
        {STATUS_SOLUSI.map(s => {
          const on = note.st === s.id;
          return (
            <button
              key={s.id}
              type="button"
              disabled={readOnly}
              onClick={() => !on && onChangeStatus?.(s.id)}
              className={`flex items-center gap-1.5 text-xs font-semibold ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${on ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}
              aria-pressed={on}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                on
                  ? s.id === 'selesai' ? 'bg-emerald-600 border-emerald-600 text-white'
                    : s.id === 'proses' ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-neutral-500 border-neutral-500 text-white'
                  : 'border-neutral-300 dark:border-neutral-600'
              }`}>
                {on && <Check className="w-3 h-3" strokeWidth={3} />}
              </span>
              <span>{s.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
