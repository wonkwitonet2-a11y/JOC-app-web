import { fs } from '../services/displayMode';
import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface ChartSeries {
  name: string;
  color: string;
  values: (number | null)[]; // satu nilai per bulan (null = tidak ada data)
  dashed?: boolean;
  labels?: boolean; // tampilkan angka di atas titik
}

interface LineChartProps {
  title: string;
  subtitle?: string;
  months: string[]; // label sumbu X (Jan, Feb, ...)
  series: ChartSeries[];
  zeroBased?: boolean; // sumbu Y mulai dari 0 (untuk data hitungan)
  integer?: boolean; // angka bulat saja
  format?: (v: number) => string;
}

const defaultFormat = (v: number) =>
  Number.isInteger(v) ? v.toLocaleString('id-ID') : v.toLocaleString('id-ID', { maximumFractionDigits: 1 });

// Sumbu Y dengan angka "rapi"
export function makeAxis(min: number, max: number, zeroBased: boolean, integer: boolean) {
  let lo = zeroBased ? 0 : min;
  let hi = max;
  if (hi === lo) hi = lo + 1;
  if (!zeroBased) {
    const pad = (hi - lo) * 0.15;
    lo = Math.max(0, lo - pad);
    hi = hi + pad;
  }
  const rawStep = (hi - lo) / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const f = rawStep / pow;
  let step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
  if (integer) step = Math.max(1, Math.round(step));
  const bottom = Math.floor(lo / step) * step;
  const top = Math.max(bottom + step, Math.ceil(hi / step) * step);
  const ticks: number[] = [];
  for (let v = bottom; v <= top + 1e-9; v += step) ticks.push(v);
  return { bottom, top, ticks };
}

export const ArsipLineChart: React.FC<LineChartProps> = ({
  title,
  subtitle,
  months,
  series,
  zeroBased = false,
  integer = false,
  format = defaultFormat,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [sel, setSel] = useState<number>(months.length - 1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(260, Math.floor(el.clientWidth)));
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setSel(months.length - 1);
  }, [months.length]);

  const n = months.length;
  const compact = width < 420;
  const padL = Math.round((compact ? 44 : 54) * fs(1));
  const padR = 14;
  const padT = 18;
  const plotH = compact ? 150 : 180;
  const H = padT + plotH + 26;
  const plotW = width - padL - padR;
  const inset = 10;
  const step = n > 1 ? (plotW - 2 * inset) / (n - 1) : 0;

  const all = series.flatMap(s => s.values).filter((v): v is number => v !== null && isFinite(v));
  const axis = useMemo(
    () => makeAxis(all.length ? Math.min(...all) : 0, all.length ? Math.max(...all) : 1, zeroBased, integer),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all.join(','), zeroBased, integer]
  );

  const x = (i: number) => padL + inset + (n > 1 ? i * step : (plotW - 2 * inset) / 2);
  const y = (v: number) => padT + plotH - ((v - axis.bottom) / (axis.top - axis.bottom)) * plotH;

  const pathFor = (vals: (number | null)[]) => {
    let d = '';
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null || !isFinite(v)) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  const onPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const dist = Math.abs(x(i) - px);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setSel(best);
  };

  return (
    <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm min-w-0">
      <div className="mb-2">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>
        {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5">
        {series.map(s => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <span
              className="inline-block w-4 h-0.5 rounded"
              style={{
                background: s.dashed
                  ? `repeating-linear-gradient(90deg, ${s.color} 0 4px, transparent 4px 7px)`
                  : s.color,
              }}
            />
            {s.name}
          </span>
        ))}
      </div>

      <div ref={wrapRef} className="w-full">
        {n === 0 ? (
          <div className="py-10 text-center text-xs text-neutral-500">Belum ada data.</div>
        ) : (
          <svg
            width={width}
            height={H}
            className="block touch-pan-y select-none"
            onPointerDown={onPointer}
            onPointerMove={e => e.pointerType === 'mouse' && onPointer(e)}
          >
            {/* grid + label sumbu Y */}
            {axis.ticks.map(t => (
              <g key={t}>
                <line
                  x1={padL}
                  x2={width - padR}
                  y1={y(t)}
                  y2={y(t)}
                  className="stroke-neutral-200 dark:stroke-neutral-700"
                  strokeWidth={1}
                />
                <text
                  x={padL - 6}
                  y={y(t) + 3}
                  textAnchor="end"
                  className="fill-neutral-500 dark:fill-neutral-400"
                  fontSize={fs(12)}
                >
                  {format(t)}
                </text>
              </g>
            ))}

            {/* garis bulan terpilih */}
            {sel >= 0 && sel < n && (
              <line
                x1={x(sel)}
                x2={x(sel)}
                y1={padT}
                y2={padT + plotH}
                className="stroke-neutral-400 dark:stroke-neutral-500"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            )}

            {/* label sumbu X */}
            {months.map((m, i) => (
              <text
                key={m + i}
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                className={i === sel ? 'fill-neutral-900 dark:fill-neutral-100' : 'fill-neutral-500 dark:fill-neutral-400'}
                fontSize={fs(12)}
                fontWeight={i === sel ? 700 : 400}
              >
                {m}
              </text>
            ))}

            {/* garis & titik */}
            {series.map(s => (
              <g key={s.name}>
                <path
                  d={pathFor(s.values)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={s.dashed ? '5 4' : undefined}
                />
                {s.values.map((v, i) =>
                  v === null || !isFinite(v) ? null : (
                    <g key={i}>
                      <circle cx={x(i)} cy={y(v)} r={i === sel ? 4.5 : 3} fill={s.color} className="stroke-white dark:stroke-neutral-900" strokeWidth={1.5} />
                      {s.labels && (n <= 7 || i === sel) && (
                        <text
                          x={x(i)}
                          y={y(v) - 8}
                          textAnchor="middle"
                          fontSize={fs(12)}
                          fontWeight={600}
                          fill={s.color}
                        >
                          {format(v)}
                        </text>
                      )}
                    </g>
                  )
                )}
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* pembacaan nilai bulan terpilih */}
      {n > 0 && sel >= 0 && sel < n && (
        <div className="mt-1 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-bold text-neutral-800 dark:text-neutral-200">{months[sel]}</span>
          {series.map(s => (
            <span key={s.name} className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.name}:{' '}
              <b className="font-mono text-neutral-900 dark:text-neutral-100">
                {s.values[sel] === null || s.values[sel] === undefined ? '—' : format(s.values[sel] as number)}
              </b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
