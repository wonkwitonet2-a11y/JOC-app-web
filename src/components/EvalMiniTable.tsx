import React, { useState, useRef, useLayoutEffect } from 'react';
import { EvaluasiRow } from '../services/evaluasi';
import { formatNumber, formatDecimal, formatPercent, getStatusClass, getBbStatusClass } from '../services/storage';
import { buildBestLookup, BEST_CELL_CLASS, BestKey } from '../services/evalBest';
import { Table, LayoutGrid, ArrowRightLeft } from 'lucide-react';

interface EvalMiniTableProps {
  r1Rows: EvaluasiRow[];
  r2Rows: EvaluasiRow[];
  r1Total: EvaluasiRow;
  r2Total: EvaluasiRow;
  cabangTotal: EvaluasiRow;
  selectedRayon: number;
  mobileMode?: 'table' | 'matrix';
  onMobileModeChange?: (mode: 'table' | 'matrix') => void;
  hideTopBar?: boolean;
  compact?: boolean;
  /** Paskan seluruh baris (sampai TKU terakhir + total) ke tinggi wadah tanpa scroll. Dipakai di mode Slide layar penuh landscape. */
  fitHeight?: boolean;
}

export const EvalMiniTable: React.FC<EvalMiniTableProps> = ({
  r1Rows,
  r2Rows,
  r1Total,
  r2Total,
  cabangTotal,
  selectedRayon,
  mobileMode: mobileModeProp,
  onMobileModeChange,
  hideTopBar = false,
  compact = false,
  fitHeight = false
}) => {
  // Mode tampilan mobile: 'table' (tabel geser presisi) vs 'matrix' (matriks baris rapi per unit)
  const [internalMobileMode, setInternalMobileMode] = useState<'table' | 'matrix'>('table');
  const mobileMode = mobileModeProp !== undefined ? mobileModeProp : internalMobileMode;
  const setMobileMode = (m: 'table' | 'matrix') => {
    setInternalMobileMode(m);
    if (onMobileModeChange) onMobileModeChange(m);
  };


  // --- Paskan tinggi baris agar semua TKU (sampai yang terakhir) + Total terlihat utuh ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rowH, setRowH] = useState<number | null>(null);
  const showR1 = selectedRayon === 0 || selectedRayon === 1;
  const showR2 = selectedRayon === 0 || selectedRayon === 2;
  // header (1) + baris TKU + subtotal tiap rayon + total cabang (hanya saat Cabang)
  const totalRowCount =
    1 +
    (showR1 ? r1Rows.length + 1 : 0) +
    (showR2 ? r2Rows.length + 1 : 0) +
    (selectedRayon === 0 ? 1 : 0);

  useLayoutEffect(() => {
    if (!fitHeight) { setRowH(null); return; }
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      // wadah tersembunyi (display:none) atau belum punya tinggi -> abaikan
      if (h < 80) return;
      const next = Math.max(16, Math.floor((h - 3) / totalRowCount));
      setRowH(prev => (prev === next ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [fitHeight, totalRowCount]);

  const fitCellStyle: React.CSSProperties | undefined =
    fitHeight && rowH
      ? {
          height: rowH,
          paddingTop: 0,
          paddingBottom: 0,
          fontSize: Math.max(9, Math.min(13, Math.round(rowH * 0.5))),
          lineHeight: 1,
        }
      : undefined;

  const activeRows = [
    ...(selectedRayon === 0 || selectedRayon === 1 ? r1Rows : []),
    ...(selectedRayon === 0 || selectedRayon === 2 ? r2Rows : []),
  ];
  const bestOf = buildBestLookup(activeRows);

  const thSubCls = compact 
    ? "py-1.5 px-1 text-right font-bold whitespace-nowrap text-xs border-b border-neutral-200 dark:border-neutral-700"
    : "py-2 px-1.5 text-right font-bold whitespace-nowrap text-xs border-b border-neutral-200 dark:border-neutral-700";
  const tdCls = compact 
    ? "py-1.25 sm:py-1.5 px-1 text-right whitespace-nowrap tabular-nums font-mono text-xs"
    : "py-1.5 sm:py-2 px-1.5 text-right whitespace-nowrap tabular-nums font-mono text-xs";

  const renderTableRow = (r: EvaluasiRow, isSubtotal = false, isTotal = false) => {
    // Tanda terbaik hanya diberikan untuk baris TKU aktif (bukan subtotal/total)
    const b = (k: BestKey) => (!isSubtotal && !isTotal && bestOf(k, r) ? ` ${BEST_CELL_CLASS}` : '');

    const rowBg = isTotal
      ? 'bg-neutral-900 text-white dark:bg-neutral-950 font-bold'
      : isSubtotal
      ? 'bg-neutral-100 dark:bg-neutral-800 font-bold text-neutral-800 dark:text-neutral-200'
      : 'hover:bg-neutral-50/90 dark:hover:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 font-medium';

    const stickyBg = isTotal
      ? 'bg-neutral-900 text-white dark:bg-neutral-950'
      : isSubtotal
      ? 'bg-neutral-100 dark:bg-neutral-800'
      : 'bg-white dark:bg-neutral-900 group-hover:bg-neutral-50 dark:group-hover:bg-neutral-800/50';

    const borderB = isTotal ? 'border-t-2 border-neutral-700' : 'border-b border-neutral-100 dark:border-neutral-800';

    return (
      <tr 
        key={r.tku.id + (isSubtotal ? '-sub' : '') + (isTotal ? '-tot' : '')} 
        className={`group transition-colors font-mono text-xs ${rowBg} ${borderB}`}
      >
        {/* Kolom TKU Sticky di Kiri: Mepet ke huruf terakhir */}
        <td style={fitCellStyle} className={`pl-1.5 pr-0.5 ${compact ? 'py-1.25 sm:py-1.5 text-xs' : 'py-1.5 sm:py-2 text-xs'} text-left font-sans font-semibold whitespace-nowrap sticky left-0 z-10 border-r border-neutral-200 dark:border-neutral-700 shadow-[1px_0_3px_rgba(0,0,0,0.06)] ${stickyBg}`}>
          <div className="flex items-center gap-0.5 w-max">
            <span className="font-bold text-neutral-900 dark:text-neutral-100">{r.tku.nama}</span>
          </div>
        </td>

        {/* 1. Rata2 */}
        <td style={fitCellStyle} className={`${tdCls} font-bold text-neutral-900 dark:text-neutral-100 border-l border-neutral-200/60 dark:border-neutral-700/60${b('rata2')}`}>
          {formatDecimal(r.rata2)}
        </td>

        {/* 2. vs LW (%) */}
        <td style={fitCellStyle} className={`${tdCls}${b('vsLwPct')}`}>
          {r.vsLwPct !== null ? (
            <span className={isTotal || isSubtotal ? '' : getStatusClass(r.vsLwPct - 1)}>
              {formatPercent(r.vsLwPct)}
            </span>
          ) : (
            <span className="text-neutral-400 font-normal">—</span>
          )}
        </td>

        {/* 3. vs Tgt (%) */}
        <td style={fitCellStyle} className={`${tdCls}${b('vsTgPct')}`}>
          <span className={isTotal || isSubtotal ? '' : getStatusClass(r.diffTg)}>
            {formatPercent(r.vsTgPct)}
          </span>
        </td>

        {/* 4. vs LY (%) */}
        <td style={fitCellStyle} className={`${tdCls}${b('vsLyPct')}`}>
          <span className={isTotal || isSubtotal ? '' : getStatusClass(r.diffLy)}>
            {formatPercent(r.vsLyPct)}
          </span>
        </td>

        {/* 5. % BB */}
        <td style={fitCellStyle} className={`${tdCls} font-bold border-l border-neutral-200/60 dark:border-neutral-700/60 ${getBbStatusClass(r.pctBb)}${b('pctBb')}`}>
          {formatPercent(r.pctBb)}
        </td>

        {/* 6. s/YL */}
        <td style={fitCellStyle} className={`${tdCls} font-bold text-brand-600 dark:text-brand-400${b('syl')}`}>
          {formatNumber(r.syl)}
        </td>

        {/* 7. Absen */}
        <td style={fitCellStyle} className={`${tdCls} border-l border-neutral-200/60 dark:border-neutral-700/60 text-center${b('absen')}`}>
          <span className={r.absen > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-neutral-400'}>
            {r.absen}
          </span>
        </td>

        {/* 8. Frek */}
        <td style={fitCellStyle} className={`${tdCls} text-center${b('frek')}`}>
          <span className={r.frek > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-neutral-400'}>
            {r.frek}
          </span>
        </td>

        {/* 9. % Cover Area (CA) */}
        <td style={fitCellStyle} className={`${tdCls} border-l border-neutral-200/60 dark:border-neutral-700/60 font-bold ${r.cover >= 1.0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}${b('cover')}`}>
          {formatPercent(r.cover)}
        </td>

        {/* 10. % YL < 250 */}
        <td style={fitCellStyle} className={`${tdCls} border-l border-neutral-200/60 dark:border-neutral-700/60 font-bold ${r.pctL250 > 0.3 ? 'text-red-600 dark:text-red-400' : r.pctL250 > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}${b('pctL250')}`}>
          {formatPercent(r.pctL250)}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-1.5 h-full flex flex-col min-h-0">
      {/* Header Bar dengan Toggle Mode Tampilan di Layar Mobile (bila hideTopBar false) */}
      {!hideTopBar && (
        <div className="flex items-center justify-between gap-2 px-1 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="inline-block w-2 h-2 rounded-full bg-brand-500" />
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">Format Mini Ringkas</span>
          </div>

          {/* Tombol Switcher Khusus Layar HP: Tabel Geser vs Matriks Ringkas */}
          <div className="sm:hidden inline-flex p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => setMobileMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                mobileMode === 'table'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Table className="w-3 h-3 text-brand-500" />
              <span>Tabel Geser</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMode('matrix')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                mobileMode === 'matrix'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <LayoutGrid className="w-3 h-3 text-brand-500" />
              <span>Matriks HP</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAMPILAN 1: TABEL LENGKAP GESER PRESISI (SINGLE CLEAN HEADER ROW) */}
      {/* ========================================================================= */}
      {(mobileMode === 'table' || typeof window === 'undefined') && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
          {/* Petunjuk Geser Horizontal di HP */}
          <div className="sm:hidden px-2 py-0.5 bg-neutral-50 dark:bg-neutral-800/70 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-600 dark:text-neutral-400 shrink-0">
            <span className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-400">
              <ArrowRightLeft className="w-3 h-3 shrink-0" /> Geser tabel jika diperlukan
            </span>
            <span className="font-mono text-[9px] text-neutral-400">11 Kolom</span>
          </div>

          <div ref={scrollRef} className="overflow-auto w-full flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-xs text-left border-collapse min-w-[620px]">
              <thead className="sticky top-0 z-20 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs shadow-2xs">
                {/* Header Tunggal Ringkas */}
                <tr>
                  <th style={fitCellStyle} className="pl-1.5 pr-0.5 py-1 text-left sticky left-0 z-30 bg-neutral-100 dark:bg-neutral-800 border-r border-b border-neutral-200 dark:border-neutral-700 font-bold">
                    TKU
                  </th>
                  <th style={fitCellStyle} className={`${thSubCls} border-l border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100`}>Rata2</th>
                  <th style={fitCellStyle} className={thSubCls}>vs LW</th>
                  <th style={fitCellStyle} className={thSubCls}>vs Tgt</th>
                  <th style={fitCellStyle} className={thSubCls}>vs LY</th>
                  <th style={fitCellStyle} className={`${thSubCls} border-l border-neutral-200 dark:border-neutral-700 text-amber-600 dark:text-amber-400`}>% BB</th>
                  <th style={fitCellStyle} className={`${thSubCls} text-brand-600 dark:text-brand-400`}>s/YL</th>
                  <th style={fitCellStyle} className={`${thSubCls} border-l border-neutral-200 dark:border-neutral-700 text-center`}>Abs</th>
                  <th style={fitCellStyle} className={`${thSubCls} text-center`}>Frk</th>
                  <th style={fitCellStyle} className={`${thSubCls} border-l border-neutral-200 dark:border-neutral-700 text-emerald-600 dark:text-emerald-400`}>% CA</th>
                  <th style={fitCellStyle} className={`${thSubCls} border-l border-neutral-200 dark:border-neutral-700 text-red-600 dark:text-red-400`}>&lt;250</th>
                </tr>
              </thead>
              <tbody>
                {/* Rayon 1 */}
                {(selectedRayon === 0 || selectedRayon === 1) && (
                  <>
                    {r1Rows.map(r => renderTableRow(r))}
                    {renderTableRow(r1Total, true)}
                  </>
                )}

                {/* Rayon 2 */}
                {(selectedRayon === 0 || selectedRayon === 2) && (
                  <>
                    {r2Rows.map(r => renderTableRow(r))}
                    {renderTableRow(r2Total, true)}
                  </>
                )}
              </tbody>
              {selectedRayon === 0 && (
                <tfoot className="sticky bottom-0 z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.12)]">
                  {renderTableRow(cabangTotal, false, true)}
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAMPILAN 2: MATRIKS RAPI PER UNIT TKU KHUSUS HP (TERATUR & SANGAT MUDAH DIBACA) */}
      {/* ========================================================================= */}
      {mobileMode === 'matrix' && (
        <div className="space-y-3 sm:hidden animate-in fade-in duration-150">
          {activeRows.map(r => {
            const isTargetHit = r.diffTg >= 0;
            const b = (k: BestKey) => (bestOf(k, r) ? ` ${BEST_CELL_CLASS} rounded px-1` : '');

            return (
              <div 
                key={r.tku.id} 
                className="p-3.5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-2.5"
              >
                {/* Baris Atas: Nama Unit & Angka Rata2 + Capaian Target */}
                <div className="flex items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-brand-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      R{r.tku.rayon}
                    </span>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                      {r.tku.nama}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-mono font-black text-neutral-900 dark:text-white">
                      {formatDecimal(r.rata2)} <span className="text-[10px] font-normal text-neutral-400">btl</span>
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      isTargetHit 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                        : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800'
                    }`}>
                      {formatPercent(r.vsTgPct)}
                    </span>
                  </div>
                </div>

                {/* Matriks 4 Kolom Teratur: Seluruh Indikator Berada di Posisi Identik */}
                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                  {/* Kolom 1: Tren Pertumbuhan */}
                  <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-tight">Tren</span>
                    <div>
                      <span className="text-[9px] text-neutral-400 block">vs LW</span>
                      <span className={`font-bold block ${getStatusClass(r.vsLwPct !== null ? r.vsLwPct - 1 : 0)}${b('vsLwPct')}`}>
                        {r.vsLwPct !== null ? formatPercent(r.vsLwPct) : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-400 block">vs LY</span>
                      <span className={`font-bold block ${getStatusClass(r.diffLy)}${b('vsLyPct')}`}>
                        {formatPercent(r.vsLyPct)}
                      </span>
                    </div>
                  </div>

                  {/* Kolom 2: Mutu Botol & s/YL */}
                  <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-tight">Mutu</span>
                    <div>
                      <span className="text-[9px] text-neutral-400 block">% BB</span>
                      <span className={`font-bold block ${getBbStatusClass(r.pctBb)}${b('pctBb')}`}>
                        {formatPercent(r.pctBb)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-400 block">s/YL</span>
                      <span className={`font-bold text-brand-600 dark:text-brand-400 block${b('syl')}`}>
                        {formatNumber(r.syl)}
                      </span>
                    </div>
                  </div>

                  {/* Kolom 3: Presensi */}
                  <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-tight">Presensi</span>
                    <div>
                      <span className="text-[9px] text-neutral-400 block">Absen</span>
                      <span className={`font-bold block ${r.absen > 0 ? 'text-red-600' : 'text-neutral-600 dark:text-neutral-400'}${b('absen')}`}>
                        {r.absen}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-400 block">Frek</span>
                      <span className={`font-bold block ${r.frek > 0 ? 'text-red-600' : 'text-neutral-600 dark:text-neutral-400'}${b('frek')}`}>
                        {r.frek}
                      </span>
                    </div>
                  </div>

                  {/* Kolom 4: Evaluasi Area & YL */}
                  <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-tight">Evaluasi</span>
                    <div>
                      <span className="text-[9px] text-neutral-400 block">% CA</span>
                      <span className={`font-bold block ${r.cover >= 1 ? 'text-emerald-600' : 'text-amber-600'}${b('cover')}`}>
                        {formatPercent(r.cover)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-400 block">&lt;250</span>
                      <span className={`font-bold block ${r.pctL250 > 0 ? 'text-red-600' : 'text-emerald-600'}${b('pctL250')}`}>
                        {formatPercent(r.pctL250)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Kartu Ringkasan Total Cabang di Mode Matriks HP */}
          <div className="p-4 rounded-2xl bg-neutral-900 text-white dark:bg-neutral-950 border border-neutral-800 shadow-md space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-neutral-300">TOTAL CABANG</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {formatPercent(cabangTotal.vsTgPct)} vs Target
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-mono pt-1 border-t border-neutral-800">
              <div>
                <span className="text-neutral-400 text-[9px] block">Rata/Hari</span>
                <span className="font-bold text-xs text-white">{formatDecimal(cabangTotal.rata2)}</span>
              </div>
              <div>
                <span className="text-neutral-400 text-[9px] block">% BB</span>
                <span className={`font-bold text-xs ${getBbStatusClass(cabangTotal.pctBb)}`}>{formatPercent(cabangTotal.pctBb)}</span>
              </div>
              <div>
                <span className="text-neutral-400 text-[9px] block">s/YL</span>
                <span className="font-bold text-xs text-brand-400">{formatNumber(cabangTotal.syl)}</span>
              </div>
              <div>
                <span className="text-neutral-400 text-[9px] block">% CA</span>
                <span className="font-bold text-xs text-emerald-400">{formatPercent(cabangTotal.cover)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
