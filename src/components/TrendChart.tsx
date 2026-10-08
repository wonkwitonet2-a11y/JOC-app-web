import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatNumber } from '../services/storage';
import { makeNiceAxis, makeUnitAxis, formatAxisLabel } from '../services/chartAxis';

export interface TrendDay {
  day: number;
  sold: number;     // penjualan riil (0 jika belum ada / libur)
  target: number;   // target efektif hari itu (0 jika libur)
  lm: number;       // bulan lalu efektif (0 jika libur / tidak ada)
  ly: number;       // tahun lalu efektif (0 jika libur / tidak ada)
  bb: number;       // balik botol
  isSun: boolean;
  mult: number;     // pengali hari (Senin setelah libur = 2, dst)
}

interface Props {
  days: TrendDay[];
  today: number;
  year: number;
  monthIndex: number;
  monthShort: string;
  salesUnit?: number; // kelipatan sumbu Y penjualan (admin 5000, TKU 1000)
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const C = {
  sales: '#ff1744',
  ok: '#10b981',
  lm: '#eab308',
  ly: '#8b5cf6',
  bb: '#2563eb',
};

export const TrendChart: React.FC<Props> = ({ days, today, year, monthIndex, monthShort, salesUnit }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [sel, setSel] = useState<number>(0);

  // Lebar grafik mengikuti lebar kartu, jadi tulisan selalu berukuran asli (tidak mengecil di HP/tab)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(280, Math.floor(el.clientWidth)));
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = days.length;
  const compact = width < 520;

  const g = useMemo(() => {
    const padL = compact ? 38 : 46;
    const padR = compact ? 10 : 16;
    const padT = 8;
    const salesH = compact ? 190 : 230;
    const gap = 30;
    const bbH = compact ? 70 : 84;
    const salesTop = padT;
    const salesBottom = salesTop + salesH;
    const bbTop = salesBottom + gap;
    const bbBottom = bbTop + bbH;
    const H = bbBottom + 26;
    const inset = compact ? 8 : 12;
    const plotW = width - padL - padR;
    const step = n > 1 ? (plotW - 2 * inset) / (n - 1) : 40;
    return { padL, padR, padT, salesH, gap, bbH, salesTop, salesBottom, bbTop, bbBottom, H, inset, plotW, step };
  }, [width, compact, n]);

  const maxSales = Math.max(1, ...days.filter(d => !d.isSun && d.day <= today && d.sold > 0).map(d => Math.max(d.sold, d.target, d.lm, d.ly))) * 1.1;
  const maxBb = Math.max(0, ...days.map(d => d.bb));
  const salesAxis = useMemo(
    () => (salesUnit ? makeUnitAxis(maxSales, g.salesH, salesUnit) : makeNiceAxis(maxSales, g.salesH)),
    [maxSales, g.salesH, salesUnit]
  );
  const bbPx = g.bbH - 6;
  const bbAxis = useMemo(() => makeNiceAxis(maxBb, bbPx), [maxBb, bbPx]);

  const getX = (i: number) => (n > 1 ? g.padL + g.inset + (i / (n - 1)) * (g.plotW - 2 * g.inset) : g.padL + g.plotW / 2);
  const getY = (v: number) => g.salesBottom - salesAxis.scale(v) * g.salesH;

  // Label tanggal: tampilkan semua jika muat, kalau sempit diselang (hari ini & tgl 1 selalu tampil)
  const labelEvery = g.step >= 20 ? 1 : g.step >= 11 ? 2 : 5;
  const lastRem = n % labelEvery;
  const showLast = labelEvery === 1 || lastRem === 0 || lastRem >= 2;
  const showDayLabel = (d: number) => d === 1 || d === today || (d === n && showLast) || d % labelEvery === 0;

  // Semua garis berhenti di tanggal transaksi terakhir dan hanya melewati hari yang ada transaksinya.
  // Hari libur / hari tanpa transaksi dilewati; pengali target (x2, x3, ...) sudah ada di nilai hari berikutnya.
  const txDays = days
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.day <= today && !d.isSun && d.sold > 0);
  const lastTx = txDays.length ? txDays[txDays.length - 1].d.day : 0;
  const linePts = (pick: (d: TrendDay) => number) =>
    txDays.map(({ d, i }) => ({ x: getX(i), y: getY(pick(d)) }));
  const toPoints = (seg: { x: number; y: number }[]) => seg.map(p => `${p.x},${p.y}`).join(' ');

  // Jika baru ada 1 tanggal transaksi, garis dibuat pendek di tanggal itu supaya tetap terlihat
  const halfDash = Math.max(8, Math.min(18, g.step * 0.45));
  const asLine = (pts: { x: number; y: number }[]) =>
    pts.length === 1 ? [{ x: pts[0].x - halfDash, y: pts[0].y }, { x: pts[0].x + halfDash, y: pts[0].y }] : pts;

  const salesPts = linePts(d => d.sold);
  const hasLm = txDays.some(({ d }) => d.lm > 0);
  const hasLy = txDays.some(({ d }) => d.ly > 0);
  const hasTarget = txDays.some(({ d }) => d.target > 0);
  const targetPts = hasTarget ? linePts(d => d.target) : [];
  const lmPts = hasLm ? linePts(d => d.lm) : [];
  const lyPts = hasLy ? linePts(d => d.ly) : [];

  const selected = days.find(d => d.day === (sel || lastTx || today)) ?? days[days.length - 1];
  const selIdx = selected ? days.findIndex(d => d.day === selected.day) : -1;
  const barW = Math.max(4, Math.min(14, g.step * 0.55));
  const hitW = Math.max(g.step, 12);

  const fmtDay = (d: number) => {
    const name = DAY_NAMES[new Date(year, monthIndex, d).getDay()];
    return `${name}, ${d} ${monthShort}`;
  };

  const select = (d: number) => setSel(d);

  return (
    <div className="space-y-3 min-w-0">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={C.sales} strokeWidth="2.5" strokeLinecap="round" /></svg>
          Penjualan
        </span>
        {hasTarget && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke="currentColor" className="text-neutral-900 dark:text-white" strokeWidth="2" strokeDasharray="4 3" /></svg>
            Target
          </span>
        )}
        {hasLm && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={C.lm} strokeWidth="2" strokeDasharray="4 3" /></svg>
            Bulan lalu (LM)
          </span>
        )}
        {hasLy && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={C.ly} strokeWidth="2" strokeDasharray="4 3" /></svg>
            Tahun lalu (LY)
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-3 rounded-sm opacity-70" style={{ background: C.bb }} />
          Balik botol (BB)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-neutral-200 dark:bg-neutral-700" />
          Libur (Minggu)
        </span>
      </div>

      {/* Grafik */}
      <div ref={wrapRef} className="w-full min-w-0">
        <svg
          width={width}
          height={g.H}
          viewBox={`0 0 ${width} ${g.H}`}
          className="block max-w-full rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 select-none"
          role="img"
          aria-label="Grafik tren penjualan harian dan balik botol"
        >
          <defs>
            <linearGradient id="trendSalesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.sales} stopOpacity="0.22" />
              <stop offset="100%" stopColor={C.sales} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Judul panel (di dalam area gambar, tidak terpotong) */}
          <text x={g.padL} y={g.salesTop + 11} fontSize="11" fontWeight="600" className="fill-neutral-500 dark:fill-neutral-400">
            Penjualan (btl)
          </text>
          <text x={g.padL} y={g.salesBottom + 20} fontSize="11" fontWeight="600" fill={C.bb}>
            Balik Botol (btl)
          </text>

          {/* Pita hari Minggu */}
          {days.map((d, i) =>
            d.isSun ? (
              <rect
                key={`sun-${d.day}`}
                x={getX(i) - Math.max(g.step * 0.45, 5)}
                y={g.salesTop}
                width={Math.max(g.step * 0.9, 10)}
                height={g.bbBottom - g.salesTop}
                className="fill-neutral-200/60 dark:fill-neutral-700/40 pointer-events-none"
                rx={3}
              />
            ) : null
          )}

          {/* Garis bantu + label sumbu Y: penjualan */}
          {salesAxis.ticks.map(tv => (
            <g key={`sy-${tv}`}>
              <line x1={g.padL} x2={width - g.padR} y1={getY(tv)} y2={getY(tv)} stroke="currentColor" className="text-neutral-200 dark:text-neutral-700/70" strokeDasharray="3 4" />
              <text x={g.padL - 6} y={getY(tv) + 4} fontSize="11" textAnchor="end" className="fill-neutral-500 dark:fill-neutral-400 font-mono">
                {salesAxis.showLabel(tv) ? formatAxisLabel(tv) : ''}
              </text>
            </g>
          ))}

          {/* Garis bantu + label sumbu Y: BB */}
          {bbAxis.ticks.map(tv => {
            const y = g.bbBottom - bbAxis.scale(tv) * bbPx;
            return (
              <g key={`by-${tv}`}>
                <line x1={g.padL} x2={width - g.padR} y1={y} y2={y} stroke="currentColor" className="text-neutral-200 dark:text-neutral-700/70" strokeDasharray="3 4" />
                <text x={g.padL - 6} y={y + 4} fontSize="11" textAnchor="end" fill={C.bb} className="font-mono">
                  {bbAxis.showLabel(tv) ? formatAxisLabel(tv) : ''}
                </text>
              </g>
            );
          })}

          {/* Sumbu */}
          <line x1={g.padL} x2={width - g.padR} y1={g.salesBottom} y2={g.salesBottom} stroke="currentColor" className="text-neutral-400 dark:text-neutral-500" />
          <line x1={g.padL} x2={width - g.padR} y1={g.bbBottom} y2={g.bbBottom} stroke="currentColor" className="text-neutral-400 dark:text-neutral-500" />
          <line x1={g.padL} x2={g.padL} y1={g.salesTop} y2={g.bbBottom} stroke="currentColor" className="text-neutral-400 dark:text-neutral-500" />
          <text x={g.padL - 6} y={g.salesBottom + 4} fontSize="11" textAnchor="end" className="fill-neutral-500 dark:fill-neutral-400 font-mono">0</text>
          <text x={g.padL - 6} y={g.bbBottom + 4} fontSize="11" textAnchor="end" fill={C.bb} className="font-mono">0</text>

          {/* Garis acuan: Target / LM / LY (sampai tanggal transaksi terakhir) */}
          {targetPts.length > 0 && (
            <polyline points={toPoints(asLine(targetPts))} fill="none" stroke="currentColor" className="text-neutral-900 dark:text-white" strokeWidth="2" strokeDasharray="5 3" strokeLinejoin="round" />
          )}
          {lmPts.length > 0 && (
            <polyline points={toPoints(asLine(lmPts))} fill="none" stroke={C.lm} strokeWidth="1.75" strokeDasharray="4 4" strokeLinejoin="round" />
          )}
          {lyPts.length > 0 && (
            <polyline points={toPoints(asLine(lyPts))} fill="none" stroke={C.ly} strokeWidth="1.75" strokeDasharray="3 3" strokeLinejoin="round" />
          )}

          {/* Batang BB */}
          {days.map((d, i) => {
            if (d.bb <= 0) return null;
            const h = Math.max(2, bbAxis.scale(d.bb) * bbPx);
            return (
              <rect key={`bb-${d.day}`} x={getX(i) - barW / 2} y={g.bbBottom - h} width={barW} height={h} rx={2} fill={C.bb} opacity={d.day === selected?.day ? 0.95 : 0.6} />
            );
          })}

          {/* Area + garis penjualan (satu garis menyambung sampai transaksi terakhir) */}
          {salesPts.length > 1 && (
            <path
              d={`M ${salesPts[0].x} ${g.salesBottom} ` + salesPts.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${salesPts[salesPts.length - 1].x} ${g.salesBottom} Z`}
              fill="url(#trendSalesGradient)"
            />
          )}
          {salesPts.length > 1 && (
            <polyline points={toPoints(salesPts)} fill="none" stroke={C.sales} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Penunjuk hari terpilih */}
          {selected && selIdx >= 0 && (
            <line x1={getX(selIdx)} x2={getX(selIdx)} y1={g.salesTop} y2={g.bbBottom} stroke={C.sales} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="2 3" />
          )}

          {/* Titik penjualan */}
          {days.map((d, i) => {
            if (d.day > today || d.isSun || d.sold <= 0) return null;
            const met = d.target > 0 && d.sold >= d.target;
            const isSel = d.day === selected?.day;
            const r = isSel ? 5.5 : g.step < 12 ? 2.5 : 3.5;
            return (
              <circle key={`pt-${d.day}`} cx={getX(i)} cy={getY(d.sold)} r={r} fill={met ? C.ok : C.sales} stroke="#fff" strokeWidth={isSel ? 2 : 1.25} className="dark:stroke-neutral-900" />
            );
          })}

          {/* Angka penjualan pada hari terpilih */}
          {selected && selIdx >= 0 && selected.sold > 0 && !selected.isSun && (() => {
            const x = getX(selIdx);
            const y = getY(selected.sold);
            const txt = formatNumber(selected.sold);
            const half = txt.length * 3.6 + 4;
            const tx = Math.min(Math.max(x, g.padL + half), width - g.padR - half);
            const ty = y - 12 < g.salesTop + 16 ? y + 20 : y - 10;
            return (
              <text x={tx} y={ty} fontSize="12" fontWeight="700" textAnchor="middle" fill={C.sales} stroke="#fff" strokeWidth="3" paintOrder="stroke" className="font-mono dark:[stroke:#171717]">
                {txt}
              </text>
            );
          })()}

          {/* Label tanggal */}
          {days.map((d, i) => {
            if (!showDayLabel(d.day)) return null;
            const isSel = d.day === selected?.day;
            const isToday = d.day === today;
            return (
              <g key={`xl-${d.day}`}>
                {(isSel || isToday) && <circle cx={getX(i)} cy={g.bbBottom + 14} r={9} fill={C.sales} opacity={isSel ? 0.18 : 0.1} />}
                <text
                  x={getX(i)}
                  y={g.bbBottom + 18}
                  fontSize="11"
                  textAnchor="middle"
                  className={`font-mono ${isSel || isToday ? 'fill-brand-600 font-bold' : d.isSun ? 'fill-red-500 font-semibold' : 'fill-neutral-600 dark:fill-neutral-400'}`}
                >
                  {d.day}
                </text>
              </g>
            );
          })}

          {/* Area sentuh per tanggal (tap di HP / hover di desktop) */}
          {days.map((d, i) => (
            <rect
              key={`hit-${d.day}`}
              x={getX(i) - hitW / 2}
              y={g.salesTop}
              width={hitW}
              height={g.bbBottom - g.salesTop + 24}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => select(d.day)}
              onClick={() => select(d.day)}
              onTouchStart={() => select(d.day)}
            />
          ))}
        </svg>
      </div>

      {/* Rincian tanggal terpilih (di bawah grafik: tidak menutupi grafik dan tidak keluar layar) */}
      {selected && (
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-xs">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-lg bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 font-bold">
              {fmtDay(selected.day)}
            </span>
            {selected.isSun && <span className="text-neutral-500">Libur — tidak ada transaksi &amp; target</span>}
            {!selected.isSun && selected.sold > 0 && selected.mult > 1 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-mono font-semibold">
                Pengali ×{selected.mult}
              </span>
            )}
            {!selected.isSun && selected.day > lastTx && <span className="text-neutral-400">Belum ada transaksi</span>}
            {!selected.isSun && selected.day < lastTx && selected.sold <= 0 && (
              <span className="text-neutral-500">Tidak ada transaksi — dilewati, masuk ke pengali hari berikutnya</span>
            )}
          </div>
          {!selected.isSun && selected.sold > 0 && selected.day <= today && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 font-mono">
              <Cell label="Penjualan" value={`${formatNumber(selected.sold)} btl`} valueClass="text-[#ff1744] dark:text-[#ff3366]" />
              {selected.target > 0 && (
                <Cell
                  label="Target"
                  value={`${formatNumber(Math.round(selected.target))} btl`}
                  sub={`${selected.sold - selected.target >= 0 ? '+' : '−'}${formatNumber(Math.abs(Math.round(selected.sold - selected.target)))} btl`}
                  subClass={selected.sold - selected.target >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
                  valueClass="text-neutral-900 dark:text-white"
                />
              )}
              {selected.lm > 0 && <Cell label="Bulan lalu (LM)" value={`${formatNumber(Math.round(selected.lm))} btl`} valueClass="text-yellow-600 dark:text-yellow-400" />}
              {selected.ly > 0 && <Cell label="Tahun lalu (LY)" value={`${formatNumber(Math.round(selected.ly))} btl`} valueClass="text-violet-600 dark:text-violet-400" />}
              <Cell label="Balik botol (BB)" value={`${formatNumber(selected.bb)} btl`} valueClass="text-blue-600 dark:text-blue-400" />
            </div>
          )}
        </div>
      )}
      <p className="text-[11px] text-neutral-400">Ketuk / arahkan ke tanggal pada grafik untuk melihat rinciannya.</p>
    </div>
  );
};

const Cell: React.FC<{ label: string; value: string; sub?: string; valueClass?: string; subClass?: string }> = ({ label, value, sub, valueClass, subClass }) => (
  <div className="min-w-0 p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-700/60">
    <span className="block font-sans text-[10px] text-neutral-500 leading-tight">{label}</span>
    <span className={`block text-sm font-bold leading-tight break-words ${valueClass || ''}`}>{value}</span>
    {sub && <span className={`block text-[11px] leading-tight ${subClass || ''}`}>{sub}</span>}
  </div>
);
