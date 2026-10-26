import React, { useMemo } from 'react';
import { TrendingUp, ArrowUp, ArrowDown, Target } from 'lucide-react';
import { AppState } from '../types';
import { buildProgressEval } from '../services/progressEval';
import { formatNumber, formatPercent } from '../services/storage';

interface Props {
  state: AppState;
  weeks: { start: number; end: number }[];
  selectedRayon: number;
}

const GOOD = 'bg-emerald-500';
const BAD = 'bg-red-500';
const FIRST = 'bg-brand-500';

const signed = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${formatNumber(Math.abs(x))}`;

/**
 * Rekap Mingguan versi grafik: batang penjualan per minggu (Min–Sab), selisih vs minggu lalu,
 * rata-rata per hari dibanding target, dan akumulasi bulan berjalan.
 * Kalender minggu mengikuti bulan aktif (bukan lagi tetap September) dan hanya menghitung
 * penjualan yang benar-benar tercatat s/d tanggal update.
 */
export const RekapMingguanChart: React.FC<Props> = ({ state, weeks, selectedRayon }) => {
  const ev = useMemo(
    () => buildProgressEval(state, weeks),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.tkus, state.pjd, state.todayInputs, state.activePeriod, state.activeDate, state.pembagiManual, state.currentDayNum, weeks]
  );
  const head = selectedRayon === 0 ? ev.cabang : ev.rayon[selectedRayon];
  if (!head) return null;

  const monthShort = (ev.periodLabel.split(' ')[0] || '').slice(0, 3);
  const cols = ev.weekCols
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !c.future);

  let running = 0;
  const rows = cols.map(({ c, i }, n) => {
    const sales = head.weekSums[i] || 0;
    running += sales;
    const prev = n > 0 ? head.weekSums[cols[n - 1].i] || 0 : null;
    const pct = prev !== null && prev > 0 ? sales / prev : null;
    const diff = prev !== null ? sales - prev : null;
    const avg = head.trend[i];
    const tgWeek = head.tgHarian * c.calDays;
    const vsTg = tgWeek > 0 ? sales / tgWeek : null;
    return {
      id: c.id,
      range: `Tgl ${c.start}–${Math.min(c.end, ev.updateDay)} ${monthShort}`,
      partial: c.current && ev.updateDay < c.end,
      sales,
      cum: running,
      pct,
      diff,
      avg,
      tgWeek,
      vsTg,
    };
  });

  const maxVal = Math.max(1, ...rows.map(r => Math.max(r.sales, r.tgWeek)));
  const totalTargetHarian = head.tgHarian;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Rekap Mingguan</span>
          <span className="text-xs font-normal text-neutral-500">{ev.periodLabel}</span>
        </h3>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 self-start sm:self-auto">
          Target Harian: {formatNumber(totalTargetHarian)} btl/hr
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-neutral-500">Belum ada penjualan tercatat bulan ini.</div>
      ) : (
        <>
          {/* Batang per minggu */}
          <div className="space-y-3">
            {rows.map((r, n) => {
              const w = (r.sales / maxVal) * 100;
              const tgPos = r.tgWeek > 0 ? (r.tgWeek / maxVal) * 100 : null;
              const color = r.pct === null ? FIRST : r.pct >= 1 ? GOOD : BAD;
              return (
                <div key={r.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">M{r.id}{r.partial ? '*' : ''}</span>
                      <span className="ml-1.5 text-xs text-neutral-500">{r.range}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black font-mono text-neutral-900 dark:text-neutral-100">{formatNumber(r.sales)}</span>
                      <span className="text-xs text-neutral-400"> btl</span>
                    </div>
                  </div>

                  <div className="relative h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.max(w, r.sales > 0 ? 2 : 0)}%` }} />
                    {tgPos !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-neutral-900/70 dark:bg-white/80"
                        style={{ left: `${Math.min(tgPos, 100)}%` }}
                        title={`Target minggu: ${formatNumber(r.tgWeek)} btl`}
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {r.pct !== null && r.diff !== null ? (
                      <span className={`inline-flex items-center gap-0.5 font-bold ${r.pct >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {r.pct >= 1 ? <ArrowUp className="w-3 h-3" strokeWidth={3} /> : <ArrowDown className="w-3 h-3" strokeWidth={3} />}
                        {formatPercent(r.pct)} vs mgg lalu ({signed(r.diff)})
                      </span>
                    ) : (
                      <span className="text-neutral-400">{n === 0 ? 'Awal bulan' : '—'}</span>
                    )}
                    <span className="font-mono text-neutral-500">
                      Rata {r.avg !== null ? formatNumber(r.avg) : '—'}/hr
                    </span>
                    {r.vsTg !== null && (
                      <span className={`inline-flex items-center gap-0.5 font-mono font-semibold ${r.vsTg >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        <Target className="w-3 h-3" />
                        {formatPercent(r.vsTg)} target
                      </span>
                    )}
                    <span className="font-mono text-brand-600 dark:text-brand-400 ml-auto">Akm {formatNumber(r.cum)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Naik / sama vs minggu lalu</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Turun</span>
            <span className="inline-flex items-center gap-1"><span className="w-0.5 h-3 bg-neutral-900/70 dark:bg-white/80" />Garis = target minggu</span>
            <span>* = minggu berjalan (sementara)</span>
          </div>
        </>
      )}
    </div>
  );
};
