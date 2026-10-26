import { fs } from '../services/displayMode';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3 } from 'lucide-react';
import { EvalUnit, ProgressEval, STATUS_LABEL } from '../services/progressEval';
import { VARIANTS } from '../types';
import { formatNumber, formatPercent } from '../services/storage';
import { ArsipLineChart, makeAxis } from './ArsipYearCharts';

interface Props {
  ev: ProgressEval;
  units: EvalUnit[];
  head: EvalUnit;
  isTku: boolean;
  year: number;
  month: number; // 0-based
}

const signed = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${formatNumber(Math.abs(x))}`;
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const GOOD = '#10b981';
const BAD = '#ef4444';
const NEUTRAL = '#a3a3a3';

const cardCls = 'p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm min-w-0';
const titleCls = 'text-sm font-bold text-neutral-900 dark:text-neutral-100';
const subCls = 'text-xs text-neutral-500 dark:text-neutral-400';

function useWidth(initial = 320) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(240, Math.floor(el.clientWidth)));
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/* ---------- 1. Donut capaian vs target ---------- */
const DonutCapaian: React.FC<{ head: EvalUnit }> = ({ head }) => {
  const p = head.progress;
  const size = 150;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const real = p.targetMonth > 0 ? Math.min(1, p.acc / p.targetMonth) : 0;
  const expected = p.daysInMonth > 0 ? p.updateDay / p.daysInMonth : 0;
  const color = p.status === 'berat' ? BAD : p.status === 'waspada' ? '#f59e0b' : GOOD;
  const ang = expected * 2 * Math.PI - Math.PI / 2;
  const tx1 = size / 2 + (r - stroke / 2 - 2) * Math.cos(ang);
  const ty1 = size / 2 + (r - stroke / 2 - 2) * Math.sin(ang);
  const tx2 = size / 2 + (r + stroke / 2 + 2) * Math.cos(ang);
  const ty2 = size / 2 + (r + stroke / 2 + 2) * Math.sin(ang);
  const projPct = p.projectedPct ?? 0;

  return (
    <div className={cardCls}>
      <h3 className={titleCls}>Capaian vs Target Bulan</h3>
      <p className={subCls}>Garis hitam = posisi seharusnya hari ini</p>
      <div className="flex items-center gap-4 mt-2">
        <svg width={size} height={size} className="shrink-0">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-neutral-200 dark:stroke-neutral-800" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * real} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} className="stroke-neutral-900 dark:stroke-white" strokeWidth={2.5} strokeLinecap="round" />
          <text x={size / 2} y={size / 2 - 2} textAnchor="middle" className="fill-neutral-900 dark:fill-neutral-100" fontSize={fs(22)} fontWeight={800}>
            {formatPercent(p.pctToDate)}
          </text>
          <text x={size / 2} y={size / 2 + 15} textAnchor="middle" className="fill-neutral-500" fontSize={fs(12)}>
            s/d tgl {p.updateDay}
          </text>
        </svg>
        <div className="min-w-0 space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
          <div>
            <div className="text-neutral-500">Realisasi / target bulan</div>
            <div className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
              {formatNumber(p.acc)} <span className="text-neutral-400">/</span> {formatNumber(p.targetMonth)}
            </div>
          </div>
          <div>
            <div className="text-neutral-500">Proyeksi akhir bulan</div>
            <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden mt-1 w-full max-w-[160px]">
              <div className="h-full rounded-full" style={{ width: `${Math.min(1, projPct) * 100}%`, background: projPct >= 1 ? GOOD : '#f59e0b' }} />
            </div>
            <div className={`font-mono font-bold mt-0.5 ${projPct >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {formatPercent(p.projectedPct)}
            </div>
          </div>
          <span className="inline-block px-2 py-0.5 rounded-full font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">
            {STATUS_LABEL[p.status]}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ---------- 2. Kartu KPI minggu ini vs lalu ---------- */
const KpiTiles: React.FC<{ head: EvalUnit }> = ({ head }) => {
  const w = head.week;
  const f1 = (x: number) => x.toFixed(1).replace('.', ',');
  const tiles: { label: string; now: string; d: number | null; dText: string; goodWhenUp: boolean }[] = [
    {
      label: '% BB',
      now: w.bbPctCur === null ? '—' : formatPercent(w.bbPctCur),
      d: w.bbPctCur !== null && w.bbPctPrev !== null ? (w.bbPctCur - w.bbPctPrev) * 100 : null,
      dText: w.bbPctCur !== null && w.bbPctPrev !== null ? `${f1(Math.abs((w.bbPctCur - w.bbPctPrev) * 100))} poin` : '',
      goodWhenUp: false,
    },
    {
      label: 'YL Absen',
      now: formatNumber(w.absenNow),
      d: w.absenPrev !== null ? w.absenNow - w.absenPrev : null,
      dText: w.absenPrev !== null ? formatNumber(Math.abs(w.absenNow - w.absenPrev)) : '',
      goodWhenUp: false,
    },
    {
      label: 's/YL',
      now: w.sylNow === null ? '—' : formatNumber(w.sylNow),
      d: w.sylNow !== null && w.sylPrev !== null ? w.sylNow - w.sylPrev : null,
      dText: w.sylNow !== null && w.sylPrev !== null ? formatNumber(Math.abs(w.sylNow - w.sylPrev)) : '',
      goodWhenUp: true,
    },
    {
      label: 'YL < 250',
      now: w.l250Cur === null ? '—' : f1(w.l250Cur),
      d: w.l250Cur !== null && w.l250Prev !== null ? w.l250Cur - w.l250Prev : null,
      dText: w.l250Cur !== null && w.l250Prev !== null ? f1(Math.abs(w.l250Cur - w.l250Prev)) : '',
      goodWhenUp: false,
    },
  ];
  return (
    <div className={cardCls}>
      <h3 className={titleCls}>Indikator Minggu Ini</h3>
      <p className={subCls}>Perubahan dibanding minggu lalu (hijau = membaik)</p>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {tiles.map(t => {
          const flat = t.d === null || Math.abs(t.d) < 0.05;
          const good = !flat && (t.d! > 0) === t.goodWhenUp;
          const col = flat ? 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800' : good ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40' : 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40';
          const Icon = t.d !== null && t.d > 0 ? ArrowUp : ArrowDown;
          return (
            <div key={t.label} className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/30">
              <div className="text-xs font-semibold text-neutral-500">{t.label}</div>
              <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 leading-tight">{t.now}</div>
              <span className={`mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold ${col}`}>
                {flat ? '● tetap' : (<><Icon className="w-3 h-3" strokeWidth={3} />{t.dText}</>)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- 3. Selisih harian vs 7 hari lalu (batang naik/turun) ---------- */
const DailyDelta: React.FC<{ ev: ProgressEval; head: EvalUnit; year: number; month: number }> = ({ ev, head, year, month }) => {
  const [ref, width] = useWidth();
  const days = ev.cmp.days;
  const cells = head.week.cells;
  const n = days.length;
  const H = Math.round(200 * fs(1));
  const padT = 22;
  const padB = Math.round(40 * fs(1));
  const padX = 12;
  const plotH = H - padT - padB;
  const maxAbs = Math.max(1, ...cells.map(c => Math.abs(c)));
  const mid = padT + plotH / 2;
  const slot = n > 0 ? (width - padX * 2) / n : 0;
  const bw = Math.min(34, slot * 0.6);
  const hOf = (v: number) => (Math.abs(v) / maxAbs) * (plotH / 2);

  return (
    <div className={cardCls}>
      <h3 className={titleCls}>Selisih Harian vs 7 Hari Lalu</h3>
      <p className={subCls}>Botol per tanggal dibanding tanggal − 7 · tgl {ev.cmp.start}–{Math.min(ev.cmp.end, ev.updateDay)}</p>
      <div ref={ref} className="w-full mt-1">
        {n === 0 ? (
          <div className="py-10 text-center text-xs text-neutral-500">Belum ada pembanding.</div>
        ) : (
          <svg width={width} height={H} className="block">
            <line x1={padX} x2={width - padX} y1={mid} y2={mid} className="stroke-neutral-300 dark:stroke-neutral-600" strokeWidth={1} />
            {days.map((d, i) => {
              const v = cells[i] ?? 0;
              const cx = padX + slot * i + slot / 2;
              const h = hOf(v);
              const up = v >= 0;
              const dow = DAY_NAMES[new Date(year, month, d).getDay()];
              return (
                <g key={d}>
                  <rect x={cx - bw / 2} y={up ? mid - h : mid} width={bw} height={Math.max(h, v === 0 ? 0 : 2)} rx={3} fill={v === 0 ? NEUTRAL : up ? GOOD : BAD} />
                  {(n <= 8 || i % 2 === 0) && (
                    <text x={cx} y={up ? mid - h - 4 : mid + h + 11} textAnchor="middle" fontSize={fs(12)} fontWeight={700} fill={v === 0 ? NEUTRAL : up ? GOOD : BAD}>
                      {signed(v)}
                    </text>
                  )}
                  <text x={cx} y={H - Math.round(18 * fs(1))} textAnchor="middle" className="fill-neutral-500 dark:fill-neutral-400" fontSize={fs(12)}>{dow}</text>
                  <text x={cx} y={H - Math.round(6 * fs(1))} textAnchor="middle" className="fill-neutral-700 dark:fill-neutral-300" fontSize={fs(12)} fontWeight={600}>{d}</text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};

/* ---------- 4. Komposisi varian per minggu (batang bertumpuk) ---------- */
const StackedVariants: React.FC<{ ev: ProgressEval; units: EvalUnit[] }> = ({ ev, units }) => {
  const [ref, width] = useWidth();
  const cols = ev.weekCols.filter(c => !c.future);
  const vt = ev.variantTrend(units);
  const n = cols.length;
  const H = Math.round(222 * fs(1));
  const padL = Math.round(48 * fs(1));
  const padR = 10;
  const padT = 22;
  const padB = Math.round(30 * fs(1));
  const plotH = H - padT - padB;
  const colIdx = cols.map(c => ev.weekCols.indexOf(c));
  const totals = colIdx.map(ci => vt.reduce((s, v) => s + (v.avg[ci] ?? 0), 0));
  const hasData = totals.some(t => t > 0);
  const axis = makeAxis(0, Math.max(1, ...totals), true, true);
  const y = (v: number) => padT + plotH - ((v - axis.bottom) / (axis.top - axis.bottom)) * plotH;
  const slot = n > 0 ? (width - padL - padR) / n : 0;
  const bw = Math.min(48, slot * 0.6);

  return (
    <div className={cardCls}>
      <h3 className={titleCls}>Komposisi Varian per Minggu</h3>
      <p className={subCls}>Rata botol per hari, ditumpuk per varian</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
        {VARIANTS.map(v => (
          <span key={v.code} className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: v.color }} />{v.code}
          </span>
        ))}
      </div>
      <div ref={ref} className="w-full">
        {!hasData ? (
          <div className="py-10 text-center text-xs text-neutral-500">Belum ada data.</div>
        ) : (
          <svg width={width} height={H} className="block">
            {axis.ticks.map(t => (
              <g key={t}>
                <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} className="stroke-neutral-200 dark:stroke-neutral-700" />
                <text x={padL - 6} y={y(t) + 3} textAnchor="end" className="fill-neutral-500 dark:fill-neutral-400" fontSize={fs(12)}>{formatNumber(t)}</text>
              </g>
            ))}
            {cols.map((c, i) => {
              const ci = colIdx[i];
              const cx = padL + slot * i + slot / 2;
              let acc = 0;
              return (
                <g key={c.id}>
                  {VARIANTS.map((v, vi) => {
                    const val = vt[vi]?.avg[ci] ?? 0;
                    if (val <= 0) return null;
                    const y0 = y(acc);
                    acc += val;
                    const y1 = y(acc);
                    return <rect key={v.code} x={cx - bw / 2} y={y1} width={bw} height={Math.max(0, y0 - y1)} fill={v.color} />;
                  })}
                  {totals[i] > 0 && (
                    <text x={cx} y={y(totals[i]) - 5} textAnchor="middle" fontSize={fs(12)} fontWeight={700} className="fill-neutral-800 dark:fill-neutral-200">
                      {formatNumber(totals[i])}
                    </text>
                  )}
                  <text x={cx} y={H - Math.round(8 * fs(1))} textAnchor="middle" fontSize={fs(12)} fontWeight={c.current ? 700 : 400} className={c.current ? 'fill-indigo-600 dark:fill-indigo-300' : 'fill-neutral-500 dark:fill-neutral-400'}>
                    M{c.id}{c.current && ev.updateDay < c.end ? '*' : ''}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};

/* ---------- 5. Varian minggu ini vs lalu (batang berpasangan) ---------- */
const VariantPairs: React.FC<{ head: EvalUnit }> = ({ head }) => {
  const [ref, width] = useWidth();
  const w = head.week;
  const H = Math.round(200 * fs(1));
  const padT = 22;
  const padB = Math.round(44 * fs(1));
  const padX = 10;
  const plotH = H - padT - padB;
  const maxV = Math.max(1, ...w.vCur, ...w.vPrev);
  const slot = (width - padX * 2) / 4;
  const bw = Math.min(26, slot * 0.34);
  const hOf = (v: number) => (v / maxV) * plotH;
  const has = w.days.length > 0 && (w.cur > 0 || w.prev > 0);

  return (
    <div className={cardCls}>
      <h3 className={titleCls}>Varian: Minggu Ini vs Lalu</h3>
      <p className={subCls}>
        <span className="inline-flex items-center gap-1 mr-3"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: NEUTRAL }} />Minggu lalu</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-brand-600" />Minggu ini</span>
      </p>
      <div ref={ref} className="w-full mt-1">
        {!has ? (
          <div className="py-10 text-center text-xs text-neutral-500">Belum ada pembanding.</div>
        ) : (
          <svg width={width} height={H} className="block">
            <line x1={padX} x2={width - padX} y1={padT + plotH} y2={padT + plotH} className="stroke-neutral-300 dark:stroke-neutral-600" />
            {VARIANTS.map((v, i) => {
              const cx = padX + slot * i + slot / 2;
              const prev = w.vPrev[i] || 0;
              const cur = w.vCur[i] || 0;
              const d = cur - prev;
              return (
                <g key={v.code}>
                  <rect x={cx - bw - 1.5} y={padT + plotH - hOf(prev)} width={bw} height={hOf(prev)} rx={3} fill={NEUTRAL} opacity={0.7} />
                  <rect x={cx + 1.5} y={padT + plotH - hOf(cur)} width={bw} height={hOf(cur)} rx={3} fill={v.color} />
                  <text x={cx + 1.5 + bw / 2} y={padT + plotH - hOf(cur) - 4} textAnchor="middle" fontSize={fs(12)} fontWeight={700} className="fill-neutral-800 dark:fill-neutral-200">
                    {formatNumber(cur)}
                  </text>
                  <text x={cx} y={H - Math.round(22 * fs(1))} textAnchor="middle" fontSize={fs(12)} fontWeight={800} fill={v.color}>{v.code}</text>
                  <text x={cx} y={H - Math.round(8 * fs(1))} textAnchor="middle" fontSize={fs(12)} fontWeight={700} fill={d === 0 ? NEUTRAL : d > 0 ? GOOD : BAD}>
                    {d === 0 ? '=' : `${d > 0 ? '▲' : '▼'} ${formatNumber(Math.abs(d))}`}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};

/* ---------- 6. Peringkat selisih per TKU (admin) ---------- */
const TkuDiverging: React.FC<{ units: EvalUnit[] }> = ({ units }) => {
  const list = units
    .filter(u => u.week.days.length > 0 && u.week.prev > 0)
    .sort((a, b) => b.week.diff - a.week.diff);
  const nUp = list.filter(u => u.week.diff > 0).length;
  const nDown = list.filter(u => u.week.diff < 0).length;
  const nSame = list.length - nUp - nDown;
  const maxAbs = Math.max(1, ...list.map(u => Math.abs(u.week.diff)));

  return (
    <div className={cardCls}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={titleCls}>Naik / Turun per TKU</h3>
          <p className={subCls}>Selisih botol minggu ini vs minggu lalu, hari yang sama</p>
        </div>
        {list.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">▲ {nUp}</span>
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">▼ {nDown}</span>
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">● {nSame}</span>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="py-8 text-center text-xs text-neutral-500">Belum ada pembanding minggu lalu.</div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {list.map(u => {
            const d = u.week.diff;
            const pctW = (Math.abs(d) / maxAbs) * 100;
            return (
              <div key={u.key} className="grid grid-cols-[84px_1fr_60px] sm:grid-cols-[110px_1fr_70px] items-center gap-2 text-xs">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate" title={u.name}>{u.name}</span>
                <div className="relative h-5 grid grid-cols-2">
                  <div className="relative flex justify-end">
                    {d < 0 && <div className="h-full rounded-l-md" style={{ width: `${pctW}%`, background: BAD }} />}
                  </div>
                  <div className="relative border-l border-neutral-400 dark:border-neutral-500">
                    {d > 0 && <div className="h-full rounded-r-md" style={{ width: `${pctW}%`, background: GOOD }} />}
                  </div>
                </div>
                <span className={`text-right font-mono font-bold ${d > 0 ? 'text-emerald-600 dark:text-emerald-400' : d < 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-500'}`}>
                  {signed(d)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ---------- Gabungan ---------- */
export const EvalWeeklyVisual: React.FC<Props> = ({ ev, units, head, isTku, year, month }) => {
  const cols = ev.weekCols.filter(c => !c.future);
  const colIdx = cols.map(c => ev.weekCols.indexOf(c));
  const labels = cols.map(c => `M${c.id}${c.current && ev.updateDay < c.end ? '*' : ''}`);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Ringkasan visual</span>
        <span className="text-xs text-neutral-400">* = minggu berjalan (sementara)</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <DonutCapaian head={head} />
        <KpiTiles head={head} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ArsipLineChart
          title="Tren Rata-rata per Hari"
          subtitle="Per minggu (Min–Sab) dibanding target, bulan lalu, dan tahun lalu (per hari)"
          months={labels}
          format={v => formatNumber(v)}
          series={[
            { name: isTku ? head.name : 'Penjualan', color: '#c8102e', values: colIdx.map(ci => head.trend[ci] ?? null), labels: true },
            { name: 'Target/hari', color: '#2563eb', values: colIdx.map(() => (head.tgHarian > 0 ? head.tgHarian : null)), dashed: true },
            { name: 'Bulan lalu/hari', color: '#f59e0b', values: colIdx.map(() => (head.blHarian > 0 ? head.blHarian : null)), dashed: true },
            { name: 'Tahun lalu/hari', color: '#10b981', values: colIdx.map(() => (head.tyHarian > 0 ? head.tyHarian : null)), dashed: true },
          ]}
        />
        <DailyDelta ev={ev} head={head} year={year} month={month} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <StackedVariants ev={ev} units={units} />
        <VariantPairs head={head} />
      </div>

      {!isTku && <TkuDiverging units={units} />}
    </section>
  );
};
