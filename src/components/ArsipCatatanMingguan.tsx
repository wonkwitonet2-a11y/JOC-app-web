import React, { useState, useEffect } from 'react';
import { StickyNote, ChevronDown } from 'lucide-react';
import { AppState, ArchiveRecord } from '../types';
import { fmtTgl, isNoteFilled, parseNoteKey } from '../services/weeklyNotes';

// Daftar catatan mingguan TKU untuk satu bulan arsip (baca saja). Kunci catatan = `${periode}:${tkuId}:${minggu}`.
export const ArsipCatatanMingguan: React.FC<{ state: AppState; periode: string; arsip?: ArchiveRecord }> = ({ state, periode, arsip }) => {
  // Tampilan awal selalu tertutup. Saat pindah menu atau pindah periode arsip, otomatis tertutup lagi.
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [periode]);

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

  if (rows.length === 0) {
    return (
      <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
          <StickyNote className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          Histori Kendala &amp; Solusi (0)
        </div>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Belum ada catatan kendala &amp; solusi yang tercatat untuk bulan {arsip?.namaBulan || periode}.
        </p>
      </div>
    );
  }

  rows.sort((a, b) => a.week - b.week || a.tkuId - b.tkuId || a.seq - b.seq);

  return (
    <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between gap-3 text-left cursor-pointer group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 group-hover:scale-105 transition-transform">
            <StickyNote className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>Histori Kendala &amp; Solusi</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300">
                {rows.length}
              </span>
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isOpen ? 'Klik untuk menutup catatan' : 'Klik untuk membuka catatan bulan ini'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800 transition-colors">
            {isOpen ? 'Tutup Catatan' : 'Buka Catatan'}
          </span>
          <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2 animate-in fade-in duration-150">
          {rows.map(r => (
            <div key={r.key} className="text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/50 dark:bg-neutral-800/40">
              <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                <span>M{r.week} • {r.nama}</span>
                {r.tgl && <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{r.tgl}</span>}
              </div>
              <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-words text-xs leading-relaxed">{r.text}</p>
              {r.reply && (
                <div className="mt-2 p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40">
                  <p className="text-xs text-sky-800 dark:text-sky-300 font-medium">Tanggapan admin: {r.reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
