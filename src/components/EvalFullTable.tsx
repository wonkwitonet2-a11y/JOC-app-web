import React from 'react';
import { EvaluasiRow } from '../services/evaluasi';
import { formatNumber, formatDecimal, formatPercent, getStatusClass, getBbStatusClass } from '../services/storage';
import { VARIANTS } from '../types';
import { buildBestLookup, BEST_CELL_CLASS, BestKey } from '../services/evalBest';

interface EvalFullTableProps {
  rows: EvaluasiRow[];
  r1Rows: EvaluasiRow[];
  r2Rows: EvaluasiRow[];
  r1Total: EvaluasiRow;
  r2Total: EvaluasiRow;
  cabangTotal: EvaluasiRow;
  selectedRayon: number; // 0: Cabang, 1: Rayon 1, 2: Rayon 2
  divider: number;
  /** true: tabel mengisi tinggi layar penuh dan menggulir sendiri (header & total tetap menempel). */
  fullscreen?: boolean;
}

export const EvalFullTable: React.FC<EvalFullTableProps> = ({
  r1Rows,
  r2Rows,
  r1Total,
  r2Total,
  cabangTotal,
  selectedRayon,
  fullscreen = false
}) => {
  const bestOf = buildBestLookup([
    ...(selectedRayon === 0 || selectedRayon === 1 ? r1Rows : []),
    ...(selectedRayon === 0 || selectedRayon === 2 ? r2Rows : []),
  ]);
  const thCls = "py-1.5 px-1 text-right font-bold whitespace-nowrap text-xs";
  const tdCls = "py-1.25 sm:py-1.5 px-1 text-right whitespace-nowrap tabular-nums font-mono text-xs";

  const renderRow = (r: EvaluasiRow, isSubtotal = false, isTotal = false) => {
    const b = (k: BestKey) => (!isSubtotal && !isTotal && bestOf(k, r) ? ` ${BEST_CELL_CLASS}` : '');
    const rowBg = isTotal
      ? 'bg-neutral-900 text-white dark:bg-neutral-950 font-bold border-t-2 border-neutral-700'
      : isSubtotal
      ? 'bg-neutral-100 dark:bg-neutral-800/80 font-bold text-neutral-800 dark:text-neutral-200'
      : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 text-neutral-800 dark:text-neutral-200 font-medium';

    const stickyBg = isTotal
      ? 'bg-neutral-900 text-white dark:bg-neutral-950 font-bold'
      : isSubtotal
      ? 'bg-neutral-100 dark:bg-neutral-800'
      : 'bg-white dark:bg-neutral-900';

    return (
      <tr key={r.tku.id + (isSubtotal ? '-sub' : '') + (isTotal ? '-tot' : '')} className={`transition-colors font-mono text-xs ${rowBg}`}>
        {/* Sticky Unit Name: Mepet ke huruf terakhir */}
        <td className={`sticky left-0 z-10 pl-1.5 pr-0.5 py-1.25 sm:py-1.5 text-left font-sans font-semibold whitespace-nowrap border-r border-neutral-200 dark:border-neutral-700 shadow-[1px_0_3px_rgba(0,0,0,0.06)] ${stickyBg}`}>
          <div className="flex items-center gap-0.5 w-max">
            <span className="text-xs font-bold">{r.tku.nama}</span>
          </div>
        </td>

        {/* Varian Penjualan */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700${b('yo')}`} style={{ color: VARIANTS[0].color }}>{formatNumber(r.yo)}</td>
        <td className={`${tdCls}${b('om')}`} style={{ color: VARIANTS[1].color }}>{formatNumber(r.om)}</td>
        <td className={`${tdCls}${b('os')}`} style={{ color: VARIANTS[2].color }}>{formatNumber(r.os)}</td>
        <td className={`${tdCls}${b('yt')}`} style={{ color: VARIANTS[3].color }}>{formatNumber(r.yt)}</td>

        {/* Akumulasi & Rata-rata */}
        <td className={`${tdCls} font-bold text-brand-600 dark:text-brand-400 border-l border-neutral-200 dark:border-neutral-700${b('akmPjl')}`}>{formatNumber(r.akmPjl)}</td>
        <td className={`${tdCls} font-bold text-neutral-900 dark:text-neutral-100${b('rata2')}`}>{formatDecimal(r.rata2)}</td>

        {/* vs LW (Last Week) */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700${b('vsLwPct')}`}>
          {r.vsLwPct !== null ? (
            <span className={isTotal || isSubtotal ? '' : getStatusClass(r.vsLwPct - 1)}>
              {formatPercent(r.vsLwPct)}
            </span>
          ) : (
            <span className="text-neutral-400 font-normal">—</span>
          )}
        </td>

        {/* vs Target */}
        <td className={`${tdCls}${b('vsTgPct')}`}>
          <span className={isTotal || isSubtotal ? '' : getStatusClass(r.diffTg)}>
            {formatPercent(r.vsTgPct)}
          </span>
        </td>

        {/* vs LM (Bulan Lalu) */}
        <td className={`${tdCls}${b('vsLmPct')}`}>
          <span className={isTotal || isSubtotal ? '' : getStatusClass(r.diffLm)}>
            {formatPercent(r.vsLmPct)}
          </span>
        </td>

        {/* vs LY (Tahun Lalu) */}
        <td className={`${tdCls}${b('vsLyPct')}`}>
          <span className={isTotal || isSubtotal ? '' : getStatusClass(r.diffLy)}>
            {formatPercent(r.vsLyPct)}
          </span>
        </td>

        {/* Balik Botol */}
        <td className={`${tdCls} text-amber-600 dark:text-amber-400 border-l border-neutral-200 dark:border-neutral-700`}>{formatNumber(r.akmBb)}</td>
        <td className={`${tdCls} font-semibold ${getBbStatusClass(r.pctBb)}${b('pctBb')}`}>{formatPercent(r.pctBb)}</td>

        {/* JWP & s/YL */}
        <td className={`${tdCls} text-sky-600 dark:text-sky-400 border-l border-neutral-200 dark:border-neutral-700`}>{formatNumber(r.jwp)}</td>
        <td className={`${tdCls} font-bold text-brand-600 dark:text-brand-400${b('syl')}`}>{formatNumber(r.syl)}</td>

        {/* Absen & Frek */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700${b('absen')}`}>
          {r.absen > 0 ? (
            <span className="text-red-600 dark:text-red-400 font-bold">{r.absen}</span>
          ) : (
            <span className="text-neutral-400">0</span>
          )}
        </td>
        <td className={`${tdCls}${b('frek')}`}>
          {r.frek > 0 ? (
            <span className="text-red-600 dark:text-red-400 font-bold">{r.frek}</span>
          ) : (
            <span className="text-neutral-400">0</span>
          )}
        </td>

        {/* Area, YL, % Cover */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700`}>{r.area}</td>
        <td className={tdCls}>{r.yl}</td>
        <td className={`${tdCls} font-bold ${r.cover >= 1.0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}${b('cover')}`}>
          {formatPercent(r.cover)}
        </td>

        {/* YL < 250 & YL < 300 */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700 text-red-600 dark:text-red-400`}>{r.l250}</td>
        <td className={`${tdCls} text-red-600 dark:text-red-400 font-semibold${b('pctL250')}`}>{formatPercent(r.pctL250)}</td>
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700 text-amber-600 dark:text-amber-400`}>{r.l300}</td>
        <td className={`${tdCls} text-amber-600 dark:text-amber-400 font-semibold`}>{formatPercent(r.pctL300)}</td>
      </tr>
    );
  };

  return (
    <div className={`overflow-auto border border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 ${fullscreen ? 'h-full rounded-lg' : 'max-h-[700px] rounded-2xl'}`}>
      <table className="w-full text-xs text-left border-collapse min-w-[1100px]">
        <thead className="sticky top-0 z-20 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 shadow-2xs border-b border-neutral-200 dark:border-neutral-700">
          <tr className="text-[11px]">
            <th className="sticky left-0 z-30 pl-2 pr-0.5 py-2 text-left font-bold bg-neutral-100 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700">
              Nama TKU
            </th>
            {/* Varian */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`} style={{ color: VARIANTS[0].color }}>YO</th>
            <th className={thCls} style={{ color: VARIANTS[1].color }}>OM</th>
            <th className={thCls} style={{ color: VARIANTS[2].color }}>OS</th>
            <th className={thCls} style={{ color: VARIANTS[3].color }}>YT</th>
            {/* Penjualan */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>Akm Pjl</th>
            <th className={thCls}>Rata2</th>
            {/* Waktu */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>vs LW</th>
            <th className={thCls}>vs Tgt</th>
            <th className={thCls}>vs LM</th>
            <th className={thCls}>vs LY</th>
            {/* BB */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>Akm BB</th>
            <th className={thCls}>% BB</th>
            {/* Produktivitas */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>JWP</th>
            <th className={thCls}>s/YL</th>
            {/* Presensi */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>Abs</th>
            <th className={thCls}>Frk</th>
            {/* Area */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>Area</th>
            <th className={thCls}>YL</th>
            <th className={thCls}>% CA</th>
            {/* YL < 250 */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>&lt;250</th>
            <th className={thCls}>%&lt;250</th>
            {/* YL < 300 */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>&lt;300</th>
            <th className={thCls}>%&lt;300</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {/* Rayon 1 */}
          {(selectedRayon === 0 || selectedRayon === 1) && (
            <>
              {r1Rows.map(r => renderRow(r))}
              {renderRow(r1Total, true)}
            </>
          )}

          {/* Rayon 2 */}
          {(selectedRayon === 0 || selectedRayon === 2) && (
            <>
              {r2Rows.map(r => renderRow(r))}
              {renderRow(r2Total, true)}
            </>
          )}
        </tbody>
        {selectedRayon === 0 && (
          <tfoot className="sticky bottom-0 z-20">
            {renderRow(cabangTotal, false, true)}
          </tfoot>
        )}
      </table>
    </div>
  );
};
