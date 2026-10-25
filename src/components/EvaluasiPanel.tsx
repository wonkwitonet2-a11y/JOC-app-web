import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, FileText, Share2, Target, TrendingUp } from 'lucide-react';
import { AppState } from '../types';
import { formatNumber, formatPercent, formatDiff, truncFixed } from '../services/storage';
import {
  buildProgressEval,
  rankOf,
  EvalUnit,
  ProgressEval,
  STATUS_LABEL,
  WeekDef
} from '../services/progressEval';
import { EvalWeeklyVisual } from './EvalWeeklyVisual';
import { analyzeUnit, summarizeWeek, CAUSE_LABEL, WeekStatus } from '../services/weekAnalysis';
import {
  buildExportDoc,
  buildNotes,
  docToText,
  exportDocPdf,
  exportDocPng,
  EvalNote
} from '../services/evalExport';

interface EvaluasiPanelProps {
  state: AppState;
  weeks: WeekDef[];
  /** admin: tampilkan banyak TKU sesuai rayon terpilih; tku: hanya satu TKU + posisi di cabang */
  mode: 'admin' | 'tku';
  /** admin: 0 = semua, 1 / 2 = rayon */
  rayon?: number;
  /** tku: index TKU yang dilihat */
  focusIdx?: number;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  /** konten tambahan yang disisipkan tepat di bawah kartu Capaian vs target bulan */
  afterCapaian?: React.ReactNode;
}

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const signed = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${formatNumber(Math.abs(x))}`;
const toneCls = (good: boolean | null) =>
  good === null ? 'text-neutral-500' : good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

const STATUS_STYLE: Record<string, string> = {
  tercapai: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  aman: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  waspada: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  berat: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
  nodata: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
};

const NOTE_DOT: Record<EvalNote['tone'], string> = {
  good: 'bg-emerald-500',
  bad: 'bg-red-500',
  warn: 'bg-amber-500',
  info: 'bg-neutral-400'
};

const Arrow: React.FC<{ v: number | null; goodWhenUp?: boolean }> = ({ v, goodWhenUp = true }) => {
  if (v === null || v === 0) return null;
  const good = (v > 0) === goodWhenUp;
  const Icon = v > 0 ? ArrowUp : ArrowDown;
  return <Icon className={`w-3 h-3 shrink-0 ${toneCls(good)}`} strokeWidth={3} />;
};

const th = 'px-2.5 py-2 text-right font-semibold whitespace-nowrap text-[11px] text-neutral-500';
const td = 'px-2.5 py-2 text-right font-mono text-[11px] font-bold whitespace-nowrap';

export const EvaluasiPanel: React.FC<EvaluasiPanelProps> = ({ state, weeks, mode, rayon = 0, focusIdx, showToast, afterCapaian }) => {
  const ev: ProgressEval = useMemo(
    () => buildProgressEval(state, weeks),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.tkus, state.pjd, state.todayInputs, state.activePeriod, state.activeDate, state.pembagiManual, state.currentDayNum, weeks]
  );
  const [busy, setBusy] = useState(false);

  const isTku = mode === 'tku';
  const units: EvalUnit[] = isTku
    ? ev.units.filter(u => u.idx === focusIdx)
    : ev.units.filter(u => rayon === 0 || u.rayon === rayon);
  const total: EvalUnit | null = isTku ? null : rayon === 0 ? ev.cabang : ev.rayon[rayon];
  const head = isTku ? units[0] : total;

  if (!head) {
    return (
      <div className="p-4 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-500">
        Belum ada data TKU aktif untuk dievaluasi.
      </div>
    );
  }

  const p = head.progress;
  const scopeLabel = isTku ? `${head.name} (Rayon ${head.rayon})` : rayon === 0 ? 'Semua Rayon' : `Rayon ${rayon}`;
  const rank = isTku && focusIdx !== undefined ? rankOf(ev, focusIdx) : null;
  const notes = buildNotes(ev, units, head);

  const doc = () =>
    buildExportDoc(ev, {
      title: isTku ? `Evaluasi ${head.name}` : 'Evaluasi Penjualan Cabang Jember',
      units,
      total,
      scopeLabel
    });
  const fileBase = `evaluasi_${isTku ? head.name : rayon === 0 ? 'cabang' : `rayon${rayon}`}_${ev.periodLabel}_tgl${ev.updateDay}`;

  const onImage = async () => {
    setBusy(true);
    try {
      const r = await exportDocPng(doc(), fileBase);
      showToast?.(r === 'shared' ? 'Gambar ringkasan siap dibagikan' : 'Gambar ringkasan diunduh', 'success');
    } catch {
      showToast?.('Gagal membuat gambar ringkasan', 'error');
    } finally {
      setBusy(false);
    }
  };
  const onPdf = () => {
    exportDocPdf(doc());
    showToast?.('Pilih "Simpan sebagai PDF" di jendela cetak', 'info');
  };
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(docToText(doc()));
      showToast?.('Teks ringkasan disalin, siap ditempel ke WhatsApp', 'success');
    } catch {
      showToast?.('Tidak bisa menyalin teks di perangkat ini', 'error');
    }
  };

  // ---- Kartu capaian ----
  const barPct = p.targetMonth > 0 ? Math.min(1, p.acc / p.targetMonth) : 0;
  const expectedPct = p.daysInMonth > 0 ? p.updateDay / p.daysInMonth : 0;
  const w = head.week;
  const hasCmp = w.days.length > 0 && w.prev > 0;

  // ---- Naik / turun (admin) ----
  const cmpUnits = units.filter(u => u.week.days.length > 0 && u.week.prev > 0);
  const sortedUnits = [...units].sort((a, b) => b.week.diff - a.week.diff);

  // ---- Status naik/turun + penyebab otomatis ----
  const analyzed = units.map(u => ({ u, a: analyzeUnit(u) }));
  const analyzedSorted = [...analyzed].sort((x, y) => {
    if (x.a.status === 'nodata') return 1;
    if (y.a.status === 'nodata') return -1;
    return (x.a.pct ?? 0) - (y.a.pct ?? 0); // paling turun di atas
  });
  const analyzedTotal = total ? { u: total, a: analyzeUnit(total) } : null;
  const wsum = summarizeWeek(analyzed);
  const STATUS_CHIP: Record<WeekStatus, { cls: string; label: string }> = {
    naik: { cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300', label: '▲ Naik' },
    turun: { cls: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300', label: '▼ Turun' },
    stabil: { cls: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300', label: '● Stabil' },
    nodata: { cls: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400', label: '— Belum ada' }
  };
  const CAUSE_CHIP = {
    bad: 'bg-red-50 text-red-700 border-red-200/70 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50',
    good: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50',
    info: 'bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800/50 dark:text-neutral-300 dark:border-neutral-700'
  };
  const analysisCard = (x: { u: EvalUnit; a: ReturnType<typeof analyzeUnit> }, strong = false) => {
    const chip = STATUS_CHIP[x.a.status];
    return (
      <div
        key={`an-${x.u.key}`}
        className={`p-3 rounded-xl border bg-white dark:bg-neutral-900 space-y-2 ${strong ? 'border-indigo-300 dark:border-indigo-800' : 'border-neutral-200 dark:border-neutral-800'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">{x.u.name}</span>
          <div className="flex items-center gap-2 shrink-0">
            {x.a.status !== 'nodata' && (
              <span className={`text-[11px] font-mono font-bold ${toneCls(x.a.diff === 0 ? null : x.a.diff > 0)}`}>
                {signed(x.a.diff)} btl
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${chip.cls}`}>
              {chip.label}
              {x.a.pct !== null && x.a.status !== 'stabil' ? ` ${Math.abs(x.a.pct * 100).toFixed(1).replace('.', ',')}%` : ''}
            </span>
          </div>
        </div>
        {x.a.causes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {x.a.causes.map(c => (
              <span key={c.key} className={`px-2 py-1 rounded-lg border text-[11px] leading-snug ${CAUSE_CHIP[c.tone]}`}>
                <span className="font-bold">{CAUSE_LABEL[c.key]}:</span> {c.text}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-neutral-500">
            {x.a.status === 'turun' || x.a.status === 'naik' ? 'Belum ada faktor menonjol di data. Cek cuaca, libur, atau stok di lapangan.' : x.a.summary}
          </p>
        )}
      </div>
    );
  };

  const weekRows = (list: EvalUnit[], isTotal = false) =>
    list.map(u => {
      const x = u.week;
      const ok = x.days.length > 0 && x.prev > 0;
      const bbD = x.bbPctCur !== null && x.bbPctPrev !== null ? (x.bbPctCur - x.bbPctPrev) * 100 : null;
      const abD = x.absenPrev !== null ? x.absenNow - x.absenPrev : null;
      const syD = x.sylNow !== null && x.sylPrev !== null ? x.sylNow - x.sylPrev : null;
      return (
        <tr key={u.key} className={isTotal ? 'bg-neutral-50 dark:bg-neutral-800/50 font-bold' : ''}>
          <td className={`px-3 py-2 text-left font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap sticky left-0 ${isTotal ? 'bg-neutral-50 dark:bg-neutral-800' : 'bg-white dark:bg-neutral-900'}`}>{u.name}</td>
          <td className={`${td} ${ok ? toneCls(x.diff === 0 ? null : x.diff > 0) : 'text-neutral-400'}`}>{ok ? signed(x.diff) : '—'}</td>
          <td className={`${td} ${ok ? toneCls(x.diff === 0 ? null : x.diff > 0) : 'text-neutral-400'}`}>
            <span className="inline-flex items-center justify-end gap-0.5">{ok ? formatPercent(x.pct) : '—'}{ok && <Arrow v={x.diff} />}</span>
          </td>
          <td className={`${td} text-neutral-800 dark:text-neutral-100`}>
            <span className="inline-flex items-center justify-end gap-1">
              {x.bbPctCur === null ? '—' : formatPercent(x.bbPctCur)}
              {bbD !== null && Math.abs(bbD) >= 0.05 && (
                <span className={`inline-flex items-center text-[10px] ${toneCls(bbD < 0)}`}><Arrow v={bbD} goodWhenUp={false} />{truncFixed(Math.abs(bbD), 1).replace('.', ',')}</span>
              )}
            </span>
          </td>
          <td className={`${td} text-neutral-800 dark:text-neutral-100`}>
            <span className="inline-flex items-center justify-end gap-1">
              {formatNumber(x.absenNow)}
              {abD !== null && abD !== 0 && <span className={`inline-flex items-center text-[10px] ${toneCls(abD < 0)}`}><Arrow v={abD} goodWhenUp={false} />{Math.abs(abD)}</span>}
            </span>
          </td>
          <td className={`${td} text-neutral-800 dark:text-neutral-100`}>
            <span className="inline-flex items-center justify-end gap-1">
              {x.sylNow === null ? '—' : formatNumber(x.sylNow)}
              {syD !== null && syD !== 0 && <span className={`inline-flex items-center text-[10px] ${toneCls(syD > 0)}`}><Arrow v={syD} />{Math.abs(syD)}</span>}
            </span>
          </td>
        </tr>
      );
    });

  const trendCell = (u: EvalUnit, i: number) => {
    const v = u.trend[i];
    if (v === null || v === undefined) return <span className="text-neutral-300 dark:text-neutral-600">—</span>;
    const before = u.trend.slice(0, i).filter(x => x !== null).pop() as number | undefined;
    const d = before === undefined ? null : v - before;
    return (
      <span className={`inline-flex items-center justify-end gap-0.5 ${d === null || d === 0 ? '' : toneCls(d > 0)}`}>
        {formatNumber(v)}
        <Arrow v={d} />
      </span>
    );
  };
  const trendRows = (list: EvalUnit[], isTotal = false) =>
    list.map(u => (
      <tr key={`tr${u.key}`} className={isTotal ? 'bg-neutral-50 dark:bg-neutral-800/50 font-bold' : ''}>
        <td className={`px-3 py-2 text-left font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap sticky left-0 ${isTotal ? 'bg-neutral-50 dark:bg-neutral-800' : 'bg-white dark:bg-neutral-900'}`}>{u.name}</td>
        {ev.weekCols.map((c, i) => (
          <td key={c.id} className={`${td} ${c.current ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''}`}>{trendCell(u, i)}</td>
        ))}
        <td className="px-2.5 py-2 text-left whitespace-nowrap">
          {u.streak >= 2 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">Turun {u.streak} mgg</span>}
        </td>
      </tr>
    ));


  const card = 'p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 min-w-0';
  const cap = 'text-[11px] font-bold text-neutral-500 dark:text-neutral-400';

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 border-t-4 border-t-indigo-500 shadow-sm overflow-hidden">
      {/* Judul + ekspor */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0" />
            Evaluasi {isTku ? head.name : 'Penjualan'}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">{scopeLabel} • {ev.periodLabel} • data s/d tgl {ev.updateDay}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button onClick={onImage} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 disabled:opacity-50" title="Simpan / bagikan sebagai gambar">
            <Share2 className="w-3.5 h-3.5" /> Gambar
          </button>
          <button onClick={onPdf} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200" title="Cetak / simpan sebagai PDF">
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={onCopy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200" title="Salin teks untuk WhatsApp">
            <Copy className="w-3.5 h-3.5" /> Salin
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* A. Capaian vs target, sisa kebutuhan, proyeksi */}
        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Capaian vs target bulan</span>
            <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className={card}>
              <div className={cap}>Capaian s/d tgl {p.updateDay}</div>
              <div className={`mt-1 text-lg font-black font-mono leading-none ${toneCls(p.pctToDate === null ? null : p.pctToDate >= 1)}`}>{formatPercent(p.pctToDate)}</div>
              <div className="mt-1 text-[11px] font-mono text-neutral-500">{formatNumber(p.acc)} / {formatNumber(p.targetToDate)} btl</div>
              <div className={`text-[11px] font-mono font-bold ${toneCls(p.gapToDate >= 0)}`}>{formatDiff(p.gapToDate)} btl</div>
            </div>
            <div className={card}>
              <div className={cap}>Sisa kebutuhan</div>
              {p.workLeft > 0 ? (
                <>
                  <div className="mt-1 text-lg font-black font-mono leading-none text-neutral-900 dark:text-neutral-100">{p.needPerDay === null ? '—' : formatNumber(Math.ceil(p.needPerDay))}<span className="text-[11px] font-sans font-normal text-neutral-500"> btl/hari</span></div>
                  <div className="mt-1 text-[11px] text-neutral-500">{p.workLeft} hari kerja lagi (tanpa Minggu)</div>
                  <div className="text-[11px] font-mono text-neutral-500">Laju kini {formatNumber(p.avgPerWorkDay)}/hari</div>
                </>
              ) : (
                <>
                  <div className="mt-1 text-lg font-black font-mono leading-none text-neutral-900 dark:text-neutral-100">{formatNumber(p.sisaTarget)}<span className="text-[11px] font-sans font-normal text-neutral-500"> btl</span></div>
                  <div className="mt-1 text-[11px] text-neutral-500">Tidak ada hari tersisa di bulan ini</div>
                </>
              )}
            </div>
            <div className={card}>
              <div className={cap}>{isTku && rank ? 'Posisi di cabang' : 'Minggu ini vs lalu'}</div>
              {isTku && rank ? (
                <>
                  <div className="mt-1 text-lg font-black font-mono leading-none text-neutral-900 dark:text-neutral-100">#{rank.pctCabang}<span className="text-[11px] font-sans font-normal text-neutral-500"> dari {rank.totalCabang} TKU</span></div>
                  <div className="mt-1 text-[11px] text-neutral-500">% target • di Rayon {head.rayon}: #{rank.pctRayon}/{rank.totalRayon}</div>
                  <div className="text-[11px] text-neutral-500">Rata/hari: #{rank.avgCabang} cabang, #{rank.avgRayon} rayon</div>
                </>
              ) : (
                <>
                  <div className={`mt-1 text-lg font-black font-mono leading-none ${hasCmp ? toneCls(w.diff === 0 ? null : w.diff > 0) : 'text-neutral-400'}`}>{hasCmp ? signed(w.diff) : '—'}<span className="text-[11px] font-sans font-normal text-neutral-500"> btl</span></div>
                  <div className="mt-1 text-[11px] text-neutral-500">{hasCmp ? `${formatPercent(w.pct)} dari minggu lalu` : 'Belum ada pembanding'}</div>
                </>
              )}
            </div>
          </div>
          <p className="text-[10px] text-neutral-400">Target dihitung per hari kalender. Proyeksi memakai laju rata-rata per hari jual dan sisa hari kerja tanpa Minggu (libur nasional belum diperhitungkan).</p>
        </section>

        {afterCapaian}

        {/* Ringkasan visual: grafik & diagram */}
        <EvalWeeklyVisual
          ev={ev}
          units={units}
          head={head}
          isTku={isTku}
          year={Number(state.activePeriod.slice(0, 4))}
          month={Number(state.activePeriod.slice(5, 7)) - 1}
        />

        {/* B. Minggu ini vs minggu lalu: penjualan, BB, absen, s/YL */}
        <section className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
            Minggu ini vs minggu lalu • tgl {ev.cmp.start}–{Math.min(ev.cmp.end, ev.updateDay)}
          </span>
          {ev.cmp.days.length === 0 ? (
            <div className="text-xs text-neutral-500">Belum ada pembanding: hari di minggu ini belum punya penjualan, atau tanggalnya belum punya padanan di minggu lalu.</div>
          ) : (
            <>
              <details className="rounded-xl border border-neutral-200 dark:border-neutral-800">
                <summary className="px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">Tabel detail minggu ini vs lalu</summary>
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                      <th className={`${th} text-left px-3 sticky left-0 bg-neutral-50 dark:bg-neutral-800`}>TKU</th>
                      <th className={th}>Selisih btl</th>
                      <th className={th} title="Penjualan hari yang sama di minggu ini dibanding minggu lalu. 100% = sama; di atas 100% = naik; di bawah 100% = turun">% vs Mgg Lalu</th>
                      <th className={th} title="BB / (penjualan + BB) pada hari yang dibandingkan. Panah = perubahan poin persen vs minggu lalu">% BB</th>
                      <th className={th} title="Posisi absen akumulatif; angka kecil = pertambahan vs 7 hari lalu">Absen</th>
                      <th className={th} title="s/YL akumulatif; angka kecil = perubahan vs 7 hari lalu">s/YL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {weekRows(isTku ? units : sortedUnits)}
                    {total && weekRows([total], true)}
                  </tbody>
                </table>
              </div>
              </details>
              <p className="text-[10px] text-neutral-400">Penjualan &amp; % BB: hari yang sama dengan minggu lalu (hari libur dilewati). Absen &amp; s/YL: posisi akumulatif per tgl {ev.updateDay} dibanding tgl {ev.updateDay - 7}; “—” bila belum ada catatan pembanding.</p>

              <details className="rounded-xl border border-neutral-200 dark:border-neutral-800">
                <summary className="px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">Rincian harian (▲ naik / ▼ turun vs tanggal − 7)</summary>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 text-[11px]">
                        <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-neutral-50 dark:bg-neutral-800">TKU</th>
                        {ev.cmp.days.map(d => (
                          <th key={d} className="px-1.5 py-2 text-center font-semibold whitespace-nowrap">
                            {DAY_NAMES[new Date(Number(state.activePeriod.slice(0, 4)), Number(state.activePeriod.slice(5, 7)) - 1, d).getDay()]} {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {[...(isTku ? units : sortedUnits), ...(total ? [total] : [])].map(u => (
                        <tr key={`d${u.key}`}>
                          <td className="px-3 py-1.5 font-semibold whitespace-nowrap sticky left-0 bg-white dark:bg-neutral-900">{u.name}</td>
                          {u.week.cells.map((c, i) => (
                            <td key={i} className="px-1.5 py-1.5 text-center" title={`${signed(c)} btl`}>
                              <span className={`inline-flex items-center justify-center min-w-6 h-6 px-1 rounded-md text-[10px] font-bold ${c > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : c < 0 ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'}`}>
                                {c > 0 ? '▲' : c < 0 ? '▼' : '='}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </section>

        {/* B2. Status naik/turun + penyebab otomatis */}
        {ev.cmp.days.length > 0 && (
          <section className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
              Status &amp; penyebab • tgl {ev.cmp.start}–{Math.min(ev.cmp.end, ev.updateDay)}
            </span>
            {!isTku && (wsum.nUp + wsum.nDown > 0) && (
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 text-xs text-neutral-700 dark:text-neutral-200 space-y-1">
                <p>
                  <b>{wsum.nUp}</b> TKU naik, <b>{wsum.nDown}</b> turun, <b>{wsum.nSame}</b> stabil.
                </p>
                {wsum.topDown && (
                  <p>Penurunan terbesar: <b>{wsum.topDown.name}</b> ({signed(wsum.topDown.diff)} btl).</p>
                )}
                {wsum.topUp && (
                  <p>Kenaikan terbesar: <b>{wsum.topUp.name}</b> ({signed(wsum.topUp.diff)} btl).</p>
                )}
                {wsum.dominant.length > 0 && (
                  <p>
                    Penyebab penurunan yang paling sering:{' '}
                    {wsum.dominant.map(d => `${CAUSE_LABEL[d.key]} (${d.count} TKU)`).join(', ')}.
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              {analyzedTotal && analysisCard(analyzedTotal, true)}
              {(isTku ? analyzed : analyzedSorted).map(x => analysisCard(x))}
            </div>
            <p className="text-[10px] text-neutral-400">
              Penyebab dihitung otomatis dari data yang tercatat (absen, BB, YL &lt; 250, s/YL, varian) pada hari yang sama dengan minggu lalu. Faktor di luar data, misalnya cuaca, libur, atau stok, perlu dicek langsung di lapangan. Stabil = selisih di bawah 3%.
            </p>
          </section>
        )}

        {/* C. Tren antar-minggu */}
        <section className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">Tren antar-minggu • rata-rata btl per hari (pembagi 7 hari, Min–Sab)</span>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                  <th className={`${th} text-left px-3 sticky left-0 bg-neutral-50 dark:bg-neutral-800`}>TKU</th>
                  {ev.weekCols.map(c => (
                    <th key={c.id} className={`${th} ${c.current ? 'text-indigo-600 dark:text-indigo-300' : ''}`}>
                      M{c.id}<span className="block font-normal text-[9px] opacity-70">{c.start}–{c.end}</span>
                      <span className="block font-normal text-[9px] opacity-70">÷{c.calDays}</span>
                      {c.current && ev.updateDay < c.end && <span className="block font-normal text-[9px] text-amber-600 dark:text-amber-400">sementara</span>}
                    </th>
                  ))}
                  <th className={`${th} text-left`}>Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {trendRows(units)}
                {total && trendRows([total], true)}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-neutral-400">Panah = naik / turun dibanding minggu sebelumnya yang punya data. Pembagi = jumlah hari kalender dalam minggu itu (Minggu–Sabtu = 7; Minggu ikut dihitung). Minggu yang baru berjalan atau terpotong awal/akhir bulan memakai jumlah harinya sampai tgl {ev.updateDay}. Angka ÷ di bawah M1, M2, … adalah pembaginya.</p>
        </section>

        {/* D. Catatan otomatis */}
        {notes.length > 0 && (
          <section className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-200 leading-relaxed">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Catatan evaluasi</span>
            {notes.map((n, i) => (
              <div key={i} className="flex gap-2">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${NOTE_DOT[n.tone]}`} />
                <span>{n.text}</span>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};
