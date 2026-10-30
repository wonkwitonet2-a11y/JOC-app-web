import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, BarChart3, Search, ChevronDown, ChevronRight, Copy, LayoutGrid, Rows3, CheckCircle2 } from 'lucide-react';
import { AppState } from '../types';
import { getPeriodInfo } from '../services/storage';
import { buildWaText, copyText, fmtTgl, groupKey, listLog, LogEntry, normTopik, rekapTopik, STATUS_SOLUSI } from '../services/weeklyNotes';
import { ReplyBox } from './CatatanMingguanPanel';

interface Props {
  state: AppState;
  selectedRayon: number; // 0: cabang, 1/2: rayon
  onSaveReply: (key: string, text: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type ViewMode = 'papan' | 'dropdown';
const VIEW_KEY = 'kendala-admin-view';

const dash = <span className="text-neutral-400">—</span>;

// Waktu terakhir diubah (untuk mengurutkan: yang terbaru diupdate tampil paling atas).
const updatedAt = (e: LogEntry): number => {
  const t = e.n.u ? new Date(e.n.u).getTime() : 0;
  return isNaN(t) ? 0 : t;
};
const byLatest = (a: LogEntry, b: LogEntry) => updatedAt(b) - updatedAt(a) || (a.v.d < b.v.d ? 1 : a.v.d > b.v.d ? -1 : 0) || b.seq - a.seq;

const StatusBadge: React.FC<{ st: string }> = ({ st }) => {
  const label = STATUS_SOLUSI.find(s => s.id === st)?.text || st;
  const tone = st === 'selesai' ? 'bg-emerald-600' : st === 'proses' ? 'bg-amber-500' : 'bg-neutral-500';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold text-white ${tone}`}>{label}</span>;
};

// Satu catatan = tabel mini (label kiri, isi kanan) + kotak tanggapan admin.
const EntryTable: React.FC<{
  e: LogEntry;
  reply: string;
  onSaveReply: (key: string, text: string) => void;
  showToast?: Props['showToast'];
  onCopy?: () => void;
  copyCount?: number;
  dim?: boolean;
}> = ({ e, reply, onSaveReply, showToast, onCopy, copyCount = 1, dim }) => {
  const rows: [string, React.ReactNode][] = [
    ['Topik', <span className="font-semibold">{e.v.tp || dash}{e.v.legacy && <span className="block text-[10px] text-neutral-400">catatan lama</span>}</span>],
    ['Siapa', <span className="font-bold">{e.v.ar || dash}</span>],
    ['Kapan', <span className="font-mono">{fmtTgl(e.v.d) || dash}</span>],
    ['Kenapa', e.v.a.trim() || dash],
    ['Tindakan', e.v.s.trim() || dash],
    ['Hasil', e.v.h.trim() || dash]
  ];
  const inputDate = e.n.u ? new Date(e.n.u) : null;
  const inputLabel = inputDate && !isNaN(inputDate.getTime())
    ? fmtTgl(`${inputDate.getFullYear()}-${String(inputDate.getMonth() + 1).padStart(2, '0')}-${String(inputDate.getDate()).padStart(2, '0')}`)
    : '';
  return (
    <div className={`rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900 ${dim ? 'opacity-90' : ''}`}>
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
          Diinput <span className="font-mono">{inputLabel || '—'}</span>
        </span>
        <StatusBadge st={e.n.st} />
      </div>
      <table className="w-full text-xs border-collapse table-fixed">
        <tbody>
          {rows.map(([label, val]) => (
            <tr key={label} className="border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
              <th scope="row" className="w-[72px] px-2 py-1.5 text-left align-top text-[10px] font-bold uppercase tracking-wider text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50">{label}</th>
              <td className="px-2 py-1.5 align-top text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words">{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-2 space-y-2 border-t border-neutral-100 dark:border-neutral-800">
        <ReplyBox
          initial={reply}
          onSave={txt => { onSaveReply(e.k, txt); showToast?.('Tanggapan tersimpan', 'success'); }}
        />
        {onCopy && (
          <button type="button" onClick={onCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border border-brand-200 dark:border-brand-900/50 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/40 cursor-pointer whitespace-nowrap">
            <Copy className="w-3 h-3" />Salin WA{copyCount > 1 ? ` (${copyCount} YL)` : ''}
          </button>
        )}
      </div>
    </div>
  );
};

// Isi satu TKU: catatan aktif (belum/proses) dulu, yang selesai disembunyikan di balik panah.
const TkuBody: React.FC<{
  entries: LogEntry[];
  replyOf: (k: string) => string;
  onSaveReply: Props['onSaveReply'];
  showToast?: Props['showToast'];
  onCopyGroup: (g: LogEntry[]) => void;
}> = ({ entries, replyOf, onSaveReply, showToast, onCopyGroup }) => {
  const [showDone, setShowDone] = useState(false);
  const active = useMemo(() => entries.filter(e => e.n.st !== 'selesai').sort(byLatest), [entries]);
  const done = useMemo(() => entries.filter(e => e.n.st === 'selesai').sort(byLatest), [entries]);

  const render = (list: LogEntry[], dim?: boolean) => {
    const seen = new Set<string>();
    return list.map(e => {
      const g = groupKey(e);
      const first = !seen.has(g);
      seen.add(g);
      const members = first ? [...list.filter(x => groupKey(x) === g)] : [];
      return (
        <EntryTable key={e.k} e={e} dim={dim} reply={replyOf(e.k)} onSaveReply={onSaveReply} showToast={showToast}
          onCopy={first ? () => onCopyGroup(members) : undefined} copyCount={members.length} />
      );
    });
  };

  return (
    <div className="space-y-2.5">
      {active.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />{entries.length === 0 ? 'Belum ada catatan.' : 'Tidak ada masalah yang masih berjalan.'}
        </p>
      )}
      {render(active)}
      {done.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowDone(v => !v)} aria-expanded={showDone}
            className="w-full flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 cursor-pointer">
            {showDone ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Riwayat selesai ({done.length})
          </button>
          {showDone && <div className="space-y-2.5 mt-2.5">{render(done, true)}</div>}
        </div>
      )}
    </div>
  );
};

const selCls = 'text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 px-2 py-1.5';

// Panel admin: log Kendala & Solusi per TKU. "Papan" = tabel per TKU berjajar menyamping (geser);
// "Dropdown" = satu bar per TKU yang bisa dibuka. Catatan terbaru diupdate di atas, yang selesai disembunyikan.
export const KendalaLogPanel: React.FC<Props> = ({ state, selectedRayon, onSaveReply, showToast }) => {
  const period = getPeriodInfo(state).key;
  const [fText, setFText] = useState('');
  const [view, setView] = useState<ViewMode>(() => {
    try { return localStorage.getItem(VIEW_KEY) === 'dropdown' ? 'dropdown' : 'papan'; } catch { return 'papan'; }
  });
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* abaikan */ } }, [view]);
  const [open, setOpen] = useState<Record<number, boolean>>({});

  // Nomor tabel tetap (Tabel 1 = TKU aktif pertama), tidak berubah saat ganti rayon.
  const allActive = useMemo(() => state.tkus.filter(t => t.aktif), [state.tkus]);
  const tkus = useMemo(
    () => allActive.filter(t => selectedRayon === 0 || t.rayon === selectedRayon),
    [allActive, selectedRayon]
  );
  const numOf = useMemo(() => new Map(allActive.map((t, i) => [t.id, i + 1])), [allActive]);

  const base = useMemo(() => {
    const ids = new Set(tkus.map(t => t.id));
    return listLog(state, { periode: period }).filter(e => ids.has(e.id));
  }, [state, period, tkus]);

  const filtered = useMemo(() => {
    const q = normTopik(fText);
    if (!q) return base;
    return base.filter(e => normTopik([e.v.tp, e.v.ar, e.v.a, e.v.s, e.v.h].join(' ')).includes(q));
  }, [base, fText]);

  const byTku = useMemo(() => {
    const m = new Map<number, LogEntry[]>();
    filtered.forEach(e => { if (!m.has(e.id)) m.set(e.id, []); m.get(e.id)!.push(e); });
    return m;
  }, [filtered]);

  const rekap = useMemo(() => rekapTopik(base.map(e => e.v)), [base]);
  const maxCount = rekap.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  const belum = base.filter(e => e.n.st !== 'selesai').length;
  const tkuTulis = new Set(base.map(e => e.id)).size;

  const copyGroup = async (g: LogEntry[]) => {
    const rows = [...g].sort((a, b) => a.wk - b.wk || a.seq - b.seq).map(x => x.v);
    const ok = await copyText(buildWaText(rows));
    showToast?.(ok ? 'Laporan disalin, siap ditempel ke WhatsApp' : 'Tidak bisa menyalin di perangkat ini', ok ? 'success' : 'error');
  };
  const replyOf = (k: string) => state.weeklyReplies?.[k]?.t || '';

  const stat = (id: number) => {
    const list = byTku.get(id) || [];
    return { total: list.length, active: list.filter(e => e.n.st !== 'selesai').length, list };
  };
  // TKU yang punya masalah aktif ditaruh lebih dulu di mode dropdown; papan tetap urut nomor tabel.
  const isOpen = (id: number) => open[id] ?? stat(id).active > 0;

  const tabBtn = (v: ViewMode, label: string, Icon: React.ElementType) => (
    <button type="button" onClick={() => setView(v)} aria-pressed={view === v}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all ${view === v ? 'bg-brand-600 text-white shadow-xs' : 'text-neutral-600 dark:text-neutral-400'}`}>
      <Icon className="w-3.5 h-3.5" />{label}
    </button>
  );

  return (
    <div className="p-4 md:p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4 min-w-0">
      <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-neutral-100">
        <ClipboardList className="w-4 h-4 text-brand-600 dark:text-brand-400" />Log Kendala &amp; Solusi TKU
      </h3>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold">
          {tkuTulis} dari {tkus.length} TKU sudah menulis
        </span>
        <span className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold">
          {base.length} baris bulan ini
        </span>
        {belum > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-semibold">
            {belum} belum selesai
          </span>
        )}
      </div>

      {rekap.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1"><BarChart3 className="w-3 h-3" />Topik terbanyak</span>
          {rekap.slice(0, 6).map(r => (
            <div key={r.label} className="flex items-center gap-2 text-xs">
              <span className="w-32 shrink-0 font-semibold text-neutral-700 dark:text-neutral-300 truncate" title={r.label}>{r.label}</span>
              <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${(r.count / maxCount) * 100}%` }} />
              </div>
              <span className="w-6 text-right font-mono font-bold text-neutral-700 dark:text-neutral-300">{r.count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          {tabBtn('papan', 'Papan', LayoutGrid)}
          {tabBtn('dropdown', 'Dropdown', Rows3)}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input type="text" value={fText} onChange={e => setFText(e.target.value)} placeholder="Cari topik / area / isi"
            className="w-full text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 pl-8 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
        </div>
      </div>

      {tkus.length === 0 && <p className="text-xs text-neutral-500">Tidak ada TKU aktif pada pilihan ini.</p>}

      {/* ===== PAPAN: tabel per TKU berjajar menyamping, geser ke kanan ===== */}
      {view === 'papan' && tkus.length > 0 && (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1">
          {tkus.map(t => {
            const s = stat(t.id);
            return (
              <section key={t.id}
                className="snap-start shrink-0 basis-[88%] sm:basis-[calc(50%-6px)] lg:basis-[calc(33.333%-8px)] xl:basis-[calc(25%-9px)] min-w-0 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/30 flex flex-col">
                <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Tabel {numOf.get(t.id)}</div>
                    <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{t.nama}</div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${s.active > 0 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'}`}>
                    {s.active > 0 ? `${s.active} aktif` : 'Aman'}
                  </span>
                </header>
                <div className="p-2.5 max-h-[75vh] overflow-y-auto">
                  <TkuBody entries={s.list} replyOf={replyOf} onSaveReply={onSaveReply} showToast={showToast} onCopyGroup={copyGroup} />
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ===== DROPDOWN: satu bar per TKU ===== */}
      {view === 'dropdown' && tkus.length > 0 && (
        <div className="space-y-2">
          {tkus.map(t => {
            const s = stat(t.id);
            const o = isOpen(t.id);
            return (
              <section key={t.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <button type="button" onClick={() => setOpen(p => ({ ...p, [t.id]: !o }))} aria-expanded={o}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left bg-neutral-50 dark:bg-neutral-800/50 cursor-pointer">
                  {o ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Tabel {numOf.get(t.id)}</span>
                    <span className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{t.nama}</span>
                  </span>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${s.active > 0 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'}`}>
                    {s.active > 0 ? `${s.active} aktif` : 'Aman'}
                  </span>
                </button>
                {o && (
                  <div className="p-2.5">
                    <TkuBody entries={s.list} replyOf={replyOf} onSaveReply={onSaveReply} showToast={showToast} onCopyGroup={copyGroup} />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
