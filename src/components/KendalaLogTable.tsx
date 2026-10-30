import React from 'react';
import { Check, Copy, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { SolusiStatus } from '../types';
import { LogEntry, STATUS_SOLUSI, fmtTgl, groupKey } from '../services/weeklyNotes';

interface Props {
  entries: LogEntry[]; // sudah terurut
  tkuName?: (id: number) => string; // bila diberikan, kolom TKU ditampilkan (admin)
  replyOf: (k: string) => string;
  canEdit: (e: LogEntry) => boolean;
  onEdit?: (e: LogEntry) => void;
  onDelete?: (e: LogEntry) => void;
  onStatus?: (e: LogEntry, st: SolusiStatus) => void; // tanpa ini status hanya tampil
  onCopyGroup: (group: LogEntry[]) => void;
  renderReply?: (e: LogEntry) => React.ReactNode; // kotak tanggapan admin (panel admin)
}

const th = 'px-2.5 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 whitespace-nowrap';
const td = 'px-2.5 py-2 align-top text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words';
const dash = <span className="text-neutral-400">—</span>;

const StatusPills: React.FC<{ st: SolusiStatus; onChange?: (st: SolusiStatus) => void }> = ({ st, onChange }) => (
  <div className="flex flex-wrap gap-1">
    {STATUS_SOLUSI.map(s => {
      const on = st === s.id;
      const tone = s.id === 'selesai' ? 'bg-emerald-600 border-emerald-600' : s.id === 'proses' ? 'bg-amber-500 border-amber-500' : 'bg-neutral-500 border-neutral-500';
      return (
        <button
          key={s.id}
          type="button"
          disabled={!onChange}
          onClick={() => !on && onChange?.(s.id)}
          aria-pressed={on}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${onChange ? 'cursor-pointer' : 'cursor-default'} ${on ? `${tone} text-white` : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'}`}
        >
          {on && <Check className="w-3 h-3" strokeWidth={3} />}{s.text}
        </button>
      );
    })}
  </div>
);

const ReplyView: React.FC<{ text: string }> = ({ text }) =>
  text.trim() ? (
    <div className="rounded-lg p-2 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 text-xs">
      <div className="flex items-center gap-1.5 font-bold text-sky-800 dark:text-sky-300"><MessageSquare className="w-3.5 h-3.5" />Tanggapan admin</div>
      <div className="text-sky-900 dark:text-sky-100 break-words whitespace-pre-wrap">{text}</div>
    </div>
  ) : null;

// Tabel log Kendala & Solusi. Layar lebar = tabel (Tgl, Topik, Area, Kenapa, Tindakan, Hasil, Status);
// HP = kartu per baris dengan judul kolom sebagai label kecil.
export const KendalaLogTable: React.FC<Props> = ({ entries, tkuName, replyOf, canEdit, onEdit, onDelete, onStatus, onCopyGroup, renderReply }) => {
  // kelompok berurutan (entries sudah terurut, jadi baris sekelompok berdampingan)
  const groups: LogEntry[][] = [];
  const idx = new Map<string, number>();
  entries.forEach(e => {
    const g = groupKey(e);
    if (idx.has(g)) groups[idx.get(g)!].push(e);
    else { idx.set(g, groups.length); groups.push([e]); }
  });

  const actions = (e: LogEntry) => canEdit(e) && (onEdit || onDelete) ? (
    <div className="flex items-center gap-1">
      {onEdit && (
        <button type="button" onClick={() => onEdit(e)} aria-label="Edit" title="Edit"
          className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={() => onDelete(e)} aria-label="Hapus" title="Hapus"
          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  ) : null;

  const copyBtn = (g: LogEntry[]) => (
    <button type="button" onClick={() => onCopyGroup(g)}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border border-brand-200 dark:border-brand-900/50 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/40 cursor-pointer whitespace-nowrap">
      <Copy className="w-3 h-3" />Salin WA{g.length > 1 ? ` (${g.length} YL)` : ''}
    </button>
  );

  return (
    <>
      {/* ===== LAYAR LEBAR: TABEL ===== */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full border-collapse">
          <thead className="bg-neutral-50 dark:bg-neutral-800/60">
            <tr>
              {tkuName && <th className={th}>TKU</th>}
              <th className={th}>Topik</th>
              <th className={th}>Siapa</th>
              <th className={th}>Kapan</th>
              <th className={th}>Kenapa</th>
              <th className={th}>Tindakan</th>
              <th className={th}>Hasil</th>
              <th className={th}>Status</th>
              <th className={th}></th>
            </tr>
          </thead>
          {groups.map((g, gi) => (
            <tbody key={gi} className="border-t-2 border-neutral-200 dark:border-neutral-700">
              {g.map((e, i) => (
                <React.Fragment key={e.k}>
                  <tr className={e.v.legacy ? 'bg-neutral-50/60 dark:bg-neutral-800/20' : ''}>
                    <td className={`${td} font-semibold`}>
                      {e.v.tp || dash}
                      {e.v.legacy && <span className="block text-[10px] font-semibold text-neutral-400">catatan lama</span>}
                    </td>
                    <td className={`${td} font-bold`}>{e.v.ar || dash}</td>
                    <td className={`${td} whitespace-nowrap font-mono`}>{fmtTgl(e.v.d) || dash}</td>
                    {tkuName && <td className={`${td} font-semibold`}>{tkuName(e.id)}</td>}
                    <td className={td}>{e.v.a.trim() || dash}</td>
                    <td className={td}>{e.v.s.trim() || dash}</td>
                    <td className={td}>{e.v.h.trim() || dash}</td>
                    <td className={td}><StatusPills st={e.n.st} onChange={onStatus ? st => onStatus(e, st) : undefined} /></td>
                    <td className={td}>
                      <div className="flex flex-col gap-1.5 items-start">
                        {actions(e)}
                        {i === 0 && copyBtn(g)}
                      </div>
                    </td>
                  </tr>
                  {(replyOf(e.k).trim() || renderReply) && (
                    <tr>
                      <td colSpan={tkuName ? 9 : 8} className="px-2.5 pb-2.5">
                        {renderReply ? renderReply(e) : <ReplyView text={replyOf(e.k)} />}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {/* ===== HP: KARTU ===== */}
      <div className="md:hidden space-y-3">
        {groups.map((g, gi) => (
          <div key={gi} className="space-y-2">
            {g.map((e, i) => (
              <div key={e.k} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2 bg-white dark:bg-neutral-900">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 break-words">{e.v.tp || 'Tanpa topik'}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="font-mono">{fmtTgl(e.v.d) || '—'}</span>
                      {tkuName && <> • {tkuName(e.id)}</>}
                      {e.v.legacy && <> • catatan lama</>}
                    </div>
                  </div>
                  {actions(e)}
                </div>
                {([['Siapa', e.v.ar], ['Kapan', fmtTgl(e.v.d)], ['Kenapa', e.v.a.trim()], ['Tindakan', e.v.s.trim()], ['Hasil', e.v.h.trim()]] as [string, string][]).map(([label, val]) => (
                  <div key={label}>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{label}</div>
                    <div className={`text-sm whitespace-pre-wrap break-words ${label === 'Siapa' ? 'font-bold' : ''} text-neutral-800 dark:text-neutral-200`}>{val || dash}</div>
                  </div>
                ))}
                <StatusPills st={e.n.st} onChange={onStatus ? st => onStatus(e, st) : undefined} />
                {renderReply ? renderReply(e) : <ReplyView text={replyOf(e.k)} />}
                {i === 0 && copyBtn(g)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};
