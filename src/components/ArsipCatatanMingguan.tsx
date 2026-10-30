import React from 'react';
import { StickyNote } from 'lucide-react';
import { AppState, ArchiveRecord } from '../types';
import { fmtTgl, isNoteFilled, parseNoteKey } from '../services/weeklyNotes';

// Daftar catatan mingguan TKU untuk satu bulan arsip (baca saja). Kunci catatan = `${periode}:${tkuId}:${minggu}`.
export const ArsipCatatanMingguan: React.FC<{ state: AppState; periode: string; arsip?: ArchiveRecord }> = ({ state, periode, arsip }) => {
  // Arsip yang sudah menyimpan salinan catatan memakai salinan itu; arsip lama memakai data aktif.
  const notes = arsip?.catatan?.n ?? state.weeklyNotes ?? {};
  const replies = arsip?.catatan?.r ?? state.weeklyReplies ?? {};
  const rows: { key: string; seq: number; week: number; tkuId: number; nama: string; text: string; reply: string; tgl: string }[] = [];
  Object.keys(notes).forEach(k => {
    const { per, id, wk, seq } = parseNoteKey(k);
    if (per !== periode) return;
    const n = notes[k];
    if (!isNoteFilled(n)) return;
    const tkuId = id;
    const tku = state.tkus.find(t => t.id === tkuId);
    const parts: string[] = [];
    if (n.l.length > 0) parts.push(`[${n.l.join(', ')}]`);
    if ((n.tp || '').trim()) parts.push(`Topik: ${n.tp!.trim()}`);
    if ((n.ar || '').trim()) parts.push(`Area: ${n.ar!.trim()}`);
    if (n.a.trim()) parts.push(`Kendala: ${n.a.trim()}`);
    if (n.s.trim()) parts.push(`Solusi: ${n.s.trim()} (${n.st})`);
    if ((n.h || '').trim()) parts.push(`Hasil: ${n.h!.trim()}`);
    rows.push({
      key: k,
      seq,
      week: wk,
      tkuId,
      nama: tku ? tku.nama : `TKU ${id}`,
      text: parts.join(' • '),
      reply: replies[k]?.t || '',
      tgl: fmtTgl(n.d)
    });
  });
  if (rows.length === 0) return null;
  rows.sort((a, b) => a.week - b.week || a.tkuId - b.tkuId || a.seq - b.seq);

  return (
    <details className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
      <summary className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 cursor-pointer">
        <StickyNote className="w-4 h-4 text-brand-600 dark:text-brand-400" />
        Catatan Mingguan TKU ({rows.length})
      </summary>
      <div className="mt-3 space-y-2">
        {rows.map(r => (
          <div key={r.key} className="text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 p-2.5">
            <div className="font-bold text-neutral-900 dark:text-neutral-100">M{r.week} • {r.nama}{r.tgl ? ` • ${r.tgl}` : ''}</div>
            <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-words">{r.text}</p>
            {r.reply && <p className="text-xs text-sky-700 dark:text-sky-300 mt-1">Tanggapan admin: {r.reply}</p>}
          </div>
        ))}
      </div>
    </details>
  );
};
