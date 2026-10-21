import React from 'react';
import { Download } from 'lucide-react';
import { EvaluasiRow } from '../services/evaluasi';
import { formatNumber, formatPercent, getBbStatusClass, truncFixed } from '../services/storage';

interface EvalKondisiTableProps {
  r1Rows: EvaluasiRow[];
  r2Rows: EvaluasiRow[];
  r1Total: EvaluasiRow;
  r2Total: EvaluasiRow;
  cabangTotal: EvaluasiRow;
  selectedRayon: number; // 0: Cabang, 1: Rayon 1, 2: Rayon 2
  fullscreen?: boolean;
  periodLabel?: string;
}

export const EvalKondisiTable: React.FC<EvalKondisiTableProps> = ({
  r1Rows,
  r2Rows,
  r1Total,
  r2Total,
  cabangTotal,
  selectedRayon,
  fullscreen = false,
  periodLabel = ''
}) => {
  const th = "py-2 px-2 text-right font-semibold whitespace-nowrap text-xs border-b border-neutral-200 dark:border-neutral-700";
  const td = "py-1.5 px-2 text-right whitespace-nowrap tabular-nums font-mono text-xs";
  const sep = "border-l border-neutral-200 dark:border-neutral-700";

  const rowsToRender: { row: EvaluasiRow; kind: 'tku' | 'subtotal' | 'total' }[] = [];

  if (selectedRayon === 0 || selectedRayon === 1) {
    r1Rows.forEach(r => rowsToRender.push({ row: r, kind: 'tku' }));
    rowsToRender.push({ row: r1Total, kind: 'subtotal' });
  }

  if (selectedRayon === 0 || selectedRayon === 2) {
    r2Rows.forEach(r => rowsToRender.push({ row: r, kind: 'tku' }));
    rowsToRender.push({ row: r2Total, kind: 'subtotal' });
  }

  if (selectedRayon === 0) {
    rowsToRender.push({ row: cabangTotal, kind: 'total' });
  }

  const handleExportCsv = () => {
    const head = [
      'Nama TKU',
      'Penjualan Akm',
      'BB Akm',
      '% BB',
      'PDM Akm',
      'Absen Akm',
      'Frek Akm',
      'JWP',
      's/YL',
      'Jml YL',
      'Jml Area',
      '% Cover Area',
      'YL < 250',
      '% < 250',
      'YL < 300',
      '% < 300'
    ];

    const lines = [head];
    rowsToRender.forEach(({ row, kind }) => {
      const label = kind === 'total' ? 'TOTAL CABANG' : kind === 'subtotal' ? row.tku.nama.toUpperCase() : row.tku.nama;
      lines.push([
        label,
        String(row.akmPjl),
        String(row.akmBb),
        truncFixed(row.pctBb * 100, 1) + '%',
        String(row.akmPdm),
        String(row.absen),
        String(row.frek),
        String(row.jwp),
        row.syl > 0 ? String(row.syl) : '—',
        String(row.yl),
        String(row.area),
        truncFixed(row.cover * 100, 1) + '%',
        String(row.l250),
        truncFixed(row.pctL250 * 100, 1) + '%',
        String(row.l300),
        truncFixed(row.pctL300 * 100, 1) + '%'
      ]);
    });

    const csv = lines.map(l => l.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kondisi_operasional_tku_${periodLabel || 'evaluasi'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-3 ${fullscreen ? 'h-full flex flex-col' : ''}`}>
      {!fullscreen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Kondisi Operasional TKU
            </h3>
            <p className="text-[11px] text-neutral-500">
              Balik Botol (BB), PDM, Presensi/Absensi, JWP, Produktivitas s/YL, dan Penetrasi Area
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh CSV</span>
          </button>
        </div>
      )}

      <div className={`overflow-auto border border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 ${fullscreen ? 'flex-1 min-h-0 rounded-lg' : 'max-h-[680px] rounded-2xl'}`}>
        <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
          <thead className="sticky top-0 z-20 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 shadow-2xs border-b border-neutral-200 dark:border-neutral-700">
            <tr className="text-[11px]">
              <th className="sticky left-0 z-30 px-3 py-2 text-left font-bold bg-neutral-100 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 min-w-[130px]">
                Nama TKU
              </th>
              {([
                ['Penjualan Akm', 'text-brand-700 dark:text-brand-300'],
                ['BB Akm', 'text-amber-600 dark:text-amber-400'],
                ['% BB', 'text-amber-600 dark:text-amber-400'],
                ['PDM Akm', 'text-sky-600 dark:text-sky-400'],
                ['Absen Akm', 'text-violet-600 dark:text-violet-400'],
                ['Frek Akm', 'text-violet-600 dark:text-violet-400'],
                ['JWP', 'text-brand-700 dark:text-brand-300'],
                ['s/YL', 'text-brand-700 dark:text-brand-300'],
                ['Jml YL', 'text-emerald-600 dark:text-emerald-400'],
                ['Jml Area', 'text-emerald-600 dark:text-emerald-400'],
                ['% Cover Area', 'text-emerald-600 dark:text-emerald-400'],
                ['YL < 250', 'text-red-600 dark:text-red-400'],
                ['% < 250', 'text-red-600 dark:text-red-400'],
                ['YL < 300', 'text-amber-600 dark:text-amber-400'],
                ['% < 300', 'text-amber-600 dark:text-amber-400']
              ] as const).map(([label, colCls]) => (
                <th key={label} className={`${th} ${colCls}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rowsToRender.map(({ row: r, kind }) => {
              const isTot = kind === 'total';
              const isSub = kind === 'subtotal';
              const rowBg = isTot
                ? 'bg-neutral-900 text-white dark:bg-neutral-950 font-bold border-t-2 border-neutral-700'
                : isSub
                ? 'bg-neutral-100 dark:bg-neutral-800/80 font-bold text-neutral-800 dark:text-neutral-200'
                : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 text-neutral-800 dark:text-neutral-200 font-medium';

              const stickyBg = isTot
                ? 'bg-neutral-900 text-white dark:bg-neutral-950 font-bold'
                : isSub
                ? 'bg-neutral-100 dark:bg-neutral-800 font-bold'
                : 'bg-white dark:bg-neutral-900 font-semibold';

              const coverCls = isTot
                ? (r.cover >= 1 ? 'text-emerald-300' : 'text-amber-300')
                : (r.cover >= 1 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-semibold');

              return (
                <tr key={`${r.tku.id}-${r.tku.nama}-${isSub ? 'sub' : ''}${isTot ? 'tot' : ''}`} className={`transition-colors font-mono text-xs ${rowBg}`}>
                  <td className={`sticky left-0 z-10 px-3 py-1.5 text-left font-sans whitespace-nowrap border-r border-neutral-200 dark:border-neutral-700 shadow-[1px_0_3px_rgba(0,0,0,0.06)] ${stickyBg}`}>
                    {isTot ? 'TOTAL CABANG' : isSub ? r.tku.nama.toUpperCase() : r.tku.nama}
                  </td>
                  <td className={`${td} ${sep} ${isTot ? 'text-sky-300' : 'text-brand-700 dark:text-brand-300 font-bold'}`}>
                    {formatNumber(r.akmPjl)}
                  </td>
                  <td className={`${td} ${sep} ${isTot ? 'text-amber-300' : 'text-amber-600 dark:text-amber-400'}`}>
                    {formatNumber(r.akmBb)}
                  </td>
                  <td className={`${td} ${getBbStatusClass(r.pctBb)}`}>
                    {formatPercent(r.pctBb)}
                  </td>
                  <td className={`${td} ${sep} ${isTot ? 'text-sky-300' : 'text-sky-600 dark:text-sky-400 font-bold'}`}>
                    {formatNumber(r.akmPdm)}
                  </td>
                  <td className={`${td} ${sep} ${r.absen > 0 ? (isTot ? 'text-red-300 font-bold' : 'text-red-600 dark:text-red-400 font-bold') : 'text-neutral-400'}`}>
                    {formatNumber(r.absen)}
                  </td>
                  <td className={`${td} ${r.frek > 0 ? (isTot ? 'text-red-300 font-bold' : 'text-red-600 dark:text-red-400 font-bold') : 'text-neutral-400'}`}>
                    {formatNumber(r.frek)}
                  </td>
                  <td className={`${td} ${sep}`}>
                    {formatNumber(r.jwp)}
                  </td>
                  <td className={`${td} ${isTot ? 'text-sky-300' : 'text-brand-700 dark:text-brand-300 font-bold'}`}>
                    {r.syl > 0 ? formatNumber(r.syl) : '—'}
                  </td>
                  <td className={`${td} ${sep}`}>
                    {formatNumber(r.yl)}
                  </td>
                  <td className={td}>
                    {formatNumber(r.area)}
                  </td>
                  <td className={`${td} ${coverCls}`}>
                    {formatPercent(r.cover)}
                  </td>
                  <td className={`${td} ${sep} ${isTot ? 'text-red-300' : 'text-red-600 dark:text-red-400 font-bold'}`}>
                    {formatNumber(r.l250)}
                  </td>
                  <td className={`${td} ${isTot ? 'text-red-300' : 'text-red-600 dark:text-red-400'}`}>
                    {formatPercent(r.pctL250)}
                  </td>
                  <td className={`${td} ${sep} ${isTot ? 'text-amber-300' : 'text-amber-600 dark:text-amber-400 font-bold'}`}>
                    {formatNumber(r.l300)}
                  </td>
                  <td className={`${td} ${isTot ? 'text-amber-300' : 'text-amber-600 dark:text-amber-400'}`}>
                    {formatPercent(r.pctL300)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
