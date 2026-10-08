import React, { useState } from 'react';
import { 
  Target, 
  Info,
  Calendar,
  History,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { AppState, VARIANTS, VariantCode } from '../types';
import { formatDecimal, formatPercent, getPeriodInfo } from '../services/storage';

interface TargetViewProps {
  state: AppState;
  onUpdateTargetHarian: (tkuIdx: number, newTg: number) => void;
  onUpdateTargetBl: (tkuIdx: number, newBl: number) => void;
  onUpdateTargetTy: (tkuIdx: number, newTy: number) => void;
  onUpdateVariantTarget: (variant: VariantCode, tkuIdx: number, field: 'tg' | 'bl' | 'ty', val: number) => void;
  onTarikDariArsip: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type TargetViewCategory = 'target_harian' | 'bulan_lalu' | 'tahun_lalu' | 'komparasi';


// Kolom isian angka desimal (2 angka di belakang koma). Saat diketik, boleh pakai titik atau koma;
// saat tidak dipilih, tampil rapi 2 desimal (mis. 300,98 tersimpan sebagai 300.98).
const DecimalInput: React.FC<{ value: number; onCommit: (v: number) => void; className?: string }> = ({ value, onCommit, className }) => {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');
  const shown = focused ? text : (value ? formatDecimal(value) : '');
  return (
    <input
      type="text"
      inputMode="decimal"
      value={shown}
      placeholder="0,00"
      onFocus={() => { setText(value ? String(value).replace('.', ',') : ''); setFocused(true); }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const raw = e.target.value.replace(/\./g, ',');
        if (!/^\d*,?\d{0,2}$/.test(raw)) return;
        setText(raw);
        onCommit(Number(raw.replace(',', '.')) || 0);
      }}
      className={className}
    />
  );
};

export const TargetView: React.FC<TargetViewProps> = ({
  state,
  onUpdateVariantTarget,
  onTarikDariArsip,
  showToast
}) => {
  const [activeCategory, setActiveCategory] = useState<TargetViewCategory>('target_harian');

  // Label periode dinamis (tidak lagi di-hard-code September 2026)
  const period = getPeriodInfo(state);
  const blDays = new Date(period.year, period.monthIndex, 0).getDate(); // jumlah hari bulan lalu
  const tyDays = new Date(period.year - 1, period.monthIndex + 1, 0).getDate(); // jumlah hari bulan yang sama tahun lalu
  const curShort = `${period.namaBulanPendek} ${period.year}`;
  const blShortLabel = `${new Date(period.year, period.monthIndex - 1, 1).toLocaleDateString('id-ID', { month: 'short' })} ${period.monthIndex === 0 ? period.year - 1 : period.year}`;
  const tyShortLabel = `${period.namaBulanPendek} ${period.year - 1}`;

  // Helper to retrieve target per variant (internal code: YO, OM, OS, YT)
  const getVarVal = (variant: VariantCode, tkuIdx: number, field: 'tg' | 'bl' | 'ty'): number => {
    return state.targetPerVariant?.[variant]?.[tkuIdx]?.[field] || 0;
  };

  // Calculate totals per variant for Target Harian (September 2026)
  const totalOriTg = state.tkus.reduce((acc, _, idx) => acc + getVarVal('YO', idx, 'tg'), 0);
  const totalOmTg = state.tkus.reduce((acc, _, idx) => acc + getVarVal('OM', idx, 'tg'), 0);
  const totalOsTg = state.tkus.reduce((acc, _, idx) => acc + getVarVal('OS', idx, 'tg'), 0);
  const totalYtTg = state.tkus.reduce((acc, _, idx) => acc + getVarVal('YT', idx, 'tg'), 0);
  const totalTgCabang = totalOriTg + totalOmTg + totalOsTg + totalYtTg || state.tkus.reduce((a, b) => a + (b.aktif ? b.targetHarian : 0), 0);

  // Totals for Bulan Lalu ({period.bulanLaluLabel})
  const totalOriBl = state.tkus.reduce((acc, _, idx) => acc + getVarVal('YO', idx, 'bl'), 0);
  const totalOmBl = state.tkus.reduce((acc, _, idx) => acc + getVarVal('OM', idx, 'bl'), 0);
  const totalOsBl = state.tkus.reduce((acc, _, idx) => acc + getVarVal('OS', idx, 'bl'), 0);
  const totalYtBl = state.tkus.reduce((acc, _, idx) => acc + getVarVal('YT', idx, 'bl'), 0);
  const totalBlCabang = totalOriBl + totalOmBl + totalOsBl + totalYtBl || state.targetBulanLalu.reduce((a, b) => a + b, 0);

  // Totals for Tahun Lalu ({period.tahunLaluLabel})
  const totalOriTy = state.tkus.reduce((acc, _, idx) => acc + getVarVal('YO', idx, 'ty'), 0);
  const totalOmTy = state.tkus.reduce((acc, _, idx) => acc + getVarVal('OM', idx, 'ty'), 0);
  const totalOsTy = state.tkus.reduce((acc, _, idx) => acc + getVarVal('OS', idx, 'ty'), 0);
  const totalYtTy = state.tkus.reduce((acc, _, idx) => acc + getVarVal('YT', idx, 'ty'), 0);
  const totalTyCabang = totalOriTy + totalOmTy + totalOsTy + totalYtTy || state.targetTahunLalu.reduce((a, b) => a + b, 0);

  const handleVariantFieldChange = (variant: VariantCode, tkuIdx: number, field: 'tg' | 'bl' | 'ty', value: number) => {
    onUpdateVariantTarget(variant, tkuIdx, field, value);
    const label = variant === 'YO' ? 'ORI' : variant;
    showToast(`Target ${label} ${state.tkus[tkuIdx]?.nama} disetel ke ${formatDecimal(value)} btl`, 'success');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-600 shrink-0" />
            <span>Target</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {period.label}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={onTarikDariArsip}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors shadow-sm"
          >
            <History className="w-3.5 h-3.5 text-neutral-500" />
            <span>Tarik Dari Arsip</span>
          </button>
        </div>
      </div>

      {/* Target Totals Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <div className="p-4 bg-gradient-to-br from-brand-50/80 to-white dark:from-brand-950/20 dark:to-neutral-900 rounded-2xl border border-brand-200 dark:border-brand-900/50 shadow-sm flex flex-col justify-between min-w-0 h-full">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider leading-tight min-w-0 break-words text-brand-700 dark:text-brand-400">
                Target Harian
              </span>
              <Calendar className="w-4 h-4 text-brand-500 shrink-0" />
            </div>
            <div className="text-2xl font-bold font-mono text-brand-600 dark:text-brand-400 mt-2">
              {formatDecimal(totalTgCabang)} <span className="text-xs font-sans text-neutral-500">btl/hari</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-brand-100 dark:border-brand-900/40 grid grid-cols-4 gap-2 text-[11px] font-mono [&>div]:min-w-0 [&>div]:text-center">
            <div><span className="text-neutral-400 block text-[9px]">ORI</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{formatDecimal(totalOriTg)}</span></div>
            <div><span className="text-amber-500 block text-[9px]">OM</span><span className="font-bold text-amber-600 dark:text-amber-400">{formatDecimal(totalOmTg)}</span></div>
            <div><span className="text-pink-400 block text-[9px]">OS</span><span className="font-bold text-pink-600 dark:text-pink-400">{formatDecimal(totalOsTg)}</span></div>
            <div><span className="text-sky-500 block text-[9px]">YT</span><span className="font-bold text-sky-600 dark:text-sky-400">{formatDecimal(totalYtTg)}</span></div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between min-w-0 h-full">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider leading-tight min-w-0 break-words text-neutral-600 dark:text-neutral-400">
                Bulan Lalu ({period.bulanLaluLabel})
              </span>
              <History className="w-4 h-4 text-neutral-400 shrink-0" />
            </div>
            <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-2">
              {formatDecimal(totalBlCabang)} <span className="text-xs font-sans text-neutral-500">btl/hari</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-4 gap-2 text-[11px] font-mono [&>div]:min-w-0 [&>div]:text-center">
            <div><span className="text-neutral-400 block text-[9px]">ORI</span><span className="font-semibold text-neutral-700 dark:text-neutral-300">{formatDecimal(totalOriBl)}</span></div>
            <div><span className="text-amber-500 block text-[9px]">OM</span><span className="font-semibold text-amber-600 dark:text-amber-400">{formatDecimal(totalOmBl)}</span></div>
            <div><span className="text-pink-400 block text-[9px]">OS</span><span className="font-semibold text-pink-600 dark:text-pink-400">{formatDecimal(totalOsBl)}</span></div>
            <div><span className="text-sky-500 block text-[9px]">YT</span><span className="font-semibold text-sky-600 dark:text-sky-400">{formatDecimal(totalYtBl)}</span></div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between min-w-0 h-full">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider leading-tight min-w-0 break-words text-neutral-600 dark:text-neutral-400">
                Tahun Lalu ({period.tahunLaluLabel})
              </span>
              <TrendingUp className="w-4 h-4 text-neutral-400 shrink-0" />
            </div>
            <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-2">
              {formatDecimal(totalTyCabang)} <span className="text-xs font-sans text-neutral-500">btl/hari</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-4 gap-2 text-[11px] font-mono [&>div]:min-w-0 [&>div]:text-center">
            <div><span className="text-neutral-400 block text-[9px]">ORI</span><span className="font-semibold text-neutral-700 dark:text-neutral-300">{formatDecimal(totalOriTy)}</span></div>
            <div><span className="text-amber-500 block text-[9px]">OM</span><span className="font-semibold text-amber-600 dark:text-amber-400">{formatDecimal(totalOmTy)}</span></div>
            <div><span className="text-neutral-400 block text-[9px]">OS</span><span className="text-neutral-400">—</span></div>
            <div><span className="text-sky-500 block text-[9px]">YT</span><span className="font-semibold text-sky-600 dark:text-sky-400">{formatDecimal(totalYtTy)}</span></div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden p-5 space-y-4">
        {/* Navigation Category Tabs */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveCategory('target_harian')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategory === 'target_harian'
                  ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-600'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>1. Target Harian ({curShort})</span>
            </button>

            <button
              onClick={() => setActiveCategory('bulan_lalu')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategory === 'bulan_lalu'
                  ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-600'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>2. Realisasi Bulan Lalu ({blShortLabel})</span>
            </button>

            <button
              onClick={() => setActiveCategory('tahun_lalu')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategory === 'tahun_lalu'
                  ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-600'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>3. Realisasi Tahun Lalu ({tyShortLabel})</span>
            </button>

            <button
              onClick={() => setActiveCategory('komparasi')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategory === 'komparasi'
                  ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-600'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>4. Komparasi 3 Periode</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Info className="w-3.5 h-3.5 text-brand-500" />
            <span>Angka dalam tabel dapat diedit secara langsung</span>
          </div>
        </div>

        {/* 1. TABEL TARGET HARIAN */}
        {activeCategory === 'target_harian' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>Target Harian</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 font-semibold">
                  Satuan: Botol/Hari
                </span>
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-[11px] bg-neutral-50 dark:bg-neutral-800/60">
                    <th className="py-2.5 px-3 font-semibold text-center w-10">No</th>
                    <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
                    <th className="py-2.5 px-2 font-semibold text-center w-14">Rayon</th>
                    <th className="py-2.5 px-3 font-semibold text-right text-neutral-800 dark:text-neutral-200">
                      ORI (Original)
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right text-amber-700 dark:text-amber-400">
                      OM (Mangga)
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right text-pink-700 dark:text-pink-400">
                      OS (Strawberry)
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right text-sky-700 dark:text-sky-400">
                      YT (Light)
                    </th>
                    <th className="py-2.5 px-4 font-bold text-right text-brand-700 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/20">
                      Total Target (btl/hr)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                  {/* RAYON 1 */}
                  <tr className="bg-neutral-100/60 dark:bg-neutral-800/50 font-bold text-neutral-700 dark:text-neutral-300">
                    <td colSpan={8} className="py-2 px-3 font-sans">
                      RAYON 1 JEMBER
                    </td>
                  </tr>
                  {state.tkus.filter(t => t.rayon === 1).map((t, localIdx) => {
                    const idx = state.tkus.indexOf(t);
                    const ori = getVarVal('YO', idx, 'tg');
                    const om = getVarVal('OM', idx, 'tg');
                    const os = getVarVal('OS', idx, 'tg');
                    const yt = getVarVal('YT', idx, 'tg');
                    const rowSum = ori + om + os + yt;

                    return (
                      <tr key={t.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-neutral-400 font-sans">{localIdx + 1}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">{t.nama}</td>
                        <td className="py-2.5 px-2 text-center text-neutral-500 font-sans">R1</td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={ori} onCommit={(v) => handleVariantFieldChange('YO', idx, 'tg', v)} className="w-20 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-brand-500 focus:outline-none text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={om} onCommit={(v) => handleVariantFieldChange('OM', idx, 'tg', v)} className="w-20 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold text-amber-700 dark:text-amber-400 focus:ring-1 focus:ring-amber-500 focus:outline-none text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={os} onCommit={(v) => handleVariantFieldChange('OS', idx, 'tg', v)} className="w-20 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold text-pink-700 dark:text-pink-400 focus:ring-1 focus:ring-pink-500 focus:outline-none text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={yt} onCommit={(v) => handleVariantFieldChange('YT', idx, 'tg', v)} className="w-20 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold text-sky-700 dark:text-sky-400 focus:ring-1 focus:ring-sky-500 focus:outline-none text-xs" />
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-brand-600 dark:text-brand-400 bg-brand-50/30 dark:bg-brand-950/10">
                          {formatDecimal(rowSum)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* SUBTOTAL RAYON 1 */}
                  {(() => {
                    const r1Tkus = state.tkus.filter(t => t.rayon === 1);
                    const r1Ori = r1Tkus.reduce((a, t) => a + getVarVal('YO', state.tkus.indexOf(t), 'tg'), 0);
                    const r1Om = r1Tkus.reduce((a, t) => a + getVarVal('OM', state.tkus.indexOf(t), 'tg'), 0);
                    const r1Os = r1Tkus.reduce((a, t) => a + getVarVal('OS', state.tkus.indexOf(t), 'tg'), 0);
                    const r1Yt = r1Tkus.reduce((a, t) => a + getVarVal('YT', state.tkus.indexOf(t), 'tg'), 0);
                    const r1Total = r1Ori + r1Om + r1Os + r1Yt;

                    return (
                      <tr className="bg-neutral-50/90 dark:bg-neutral-800/80 font-bold border-t border-neutral-300 dark:border-neutral-700">
                        <td colSpan={3} className="py-2 px-3 font-sans text-neutral-800 dark:text-neutral-200">
                          Total Rayon 1
                        </td>
                        <td className="py-2 px-3 text-right text-neutral-800 dark:text-neutral-200">{formatDecimal(r1Ori)}</td>
                        <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400">{formatDecimal(r1Om)}</td>
                        <td className="py-2 px-3 text-right text-pink-600 dark:text-pink-400">{formatDecimal(r1Os)}</td>
                        <td className="py-2 px-3 text-right text-sky-600 dark:text-sky-400">{formatDecimal(r1Yt)}</td>
                        <td className="py-2 px-4 text-right text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/20 font-extrabold">{formatDecimal(r1Total)}</td>
                      </tr>
                    );
                  })()}

                  {/* RAYON 2 */}
                  <tr className="bg-neutral-100/60 dark:bg-neutral-800/50 font-bold text-neutral-700 dark:text-neutral-300">
                    <td colSpan={8} className="py-2 px-3 font-sans">
                      RAYON 2 JEMBER
                    </td>
                  </tr>
                  {state.tkus.filter(t => t.rayon === 2).map((t, localIdx) => {
                    const idx = state.tkus.indexOf(t);
                    const ori = getVarVal('YO', idx, 'tg');
                    const om = getVarVal('OM', idx, 'tg');
                    const os = getVarVal('OS', idx, 'tg');
                    const yt = getVarVal('YT', idx, 'tg');
                    const rowSum = ori + om + os + yt;

                    return (
                      <tr key={t.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-neutral-400 font-sans">{localIdx + 6}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">{t.nama}</td>
                        <td className="py-2.5 px-2 text-center text-neutral-500 font-sans">R2</td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={ori} onCommit={(v) => handleVariantFieldChange('YO', idx, 'tg', v)} className="w-20 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-brand-500 focus:outline-none text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={om} onCommit={(v) => handleVariantFieldChange('OM', idx, 'tg', v)} className="w-20 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold text-amber-700 dark:text-amber-400 focus:ring-1 focus:ring-amber-500 focus:outline-none text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={os} onCommit={(v) => handleVariantFieldChange('OS', idx, 'tg', v)} className="w-20 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold text-pink-700 dark:text-pink-400 focus:ring-1 focus:ring-pink-500 focus:outline-none text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={yt} onCommit={(v) => handleVariantFieldChange('YT', idx, 'tg', v)} className="w-20 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold text-sky-700 dark:text-sky-400 focus:ring-1 focus:ring-sky-500 focus:outline-none text-xs" />
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-brand-600 dark:text-brand-400 bg-brand-50/30 dark:bg-brand-950/10">
                          {formatDecimal(rowSum)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* SUBTOTAL RAYON 2 */}
                  {(() => {
                    const r2Tkus = state.tkus.filter(t => t.rayon === 2);
                    const r2Ori = r2Tkus.reduce((a, t) => a + getVarVal('YO', state.tkus.indexOf(t), 'tg'), 0);
                    const r2Om = r2Tkus.reduce((a, t) => a + getVarVal('OM', state.tkus.indexOf(t), 'tg'), 0);
                    const r2Os = r2Tkus.reduce((a, t) => a + getVarVal('OS', state.tkus.indexOf(t), 'tg'), 0);
                    const r2Yt = r2Tkus.reduce((a, t) => a + getVarVal('YT', state.tkus.indexOf(t), 'tg'), 0);
                    const r2Total = r2Ori + r2Om + r2Os + r2Yt;

                    return (
                      <tr className="bg-neutral-50/90 dark:bg-neutral-800/80 font-bold border-t border-neutral-300 dark:border-neutral-700">
                        <td colSpan={3} className="py-2 px-3 font-sans text-neutral-800 dark:text-neutral-200">
                          Total Rayon 2
                        </td>
                        <td className="py-2 px-3 text-right text-neutral-800 dark:text-neutral-200">{formatDecimal(r2Ori)}</td>
                        <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400">{formatDecimal(r2Om)}</td>
                        <td className="py-2 px-3 text-right text-pink-600 dark:text-pink-400">{formatDecimal(r2Os)}</td>
                        <td className="py-2 px-3 text-right text-sky-600 dark:text-sky-400">{formatDecimal(r2Yt)}</td>
                        <td className="py-2 px-4 text-right text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/20 font-extrabold">{formatDecimal(r2Total)}</td>
                      </tr>
                    );
                  })()}

                  {/* GRAND TOTAL CABANG JEMBER */}
                  <tr className="bg-brand-50 dark:bg-brand-950/40 font-extrabold border-t-2 border-brand-400 dark:border-brand-800 text-neutral-900 dark:text-white">
                    <td colSpan={3} className="py-3 px-3 font-sans text-brand-800 dark:text-brand-300 text-xs">
                      TOTAL CABANG JEMBER
                    </td>
                    <td className="py-3 px-3 text-right text-neutral-900 dark:text-white">{formatDecimal(totalOriTg)}</td>
                    <td className="py-3 px-3 text-right text-amber-700 dark:text-amber-300">{formatDecimal(totalOmTg)}</td>
                    <td className="py-3 px-3 text-right text-pink-700 dark:text-pink-300">{formatDecimal(totalOsTg)}</td>
                    <td className="py-3 px-3 text-right text-sky-700 dark:text-sky-300">{formatDecimal(totalYtTg)}</td>
                    <td className="py-3 px-4 text-right text-brand-700 dark:text-brand-300 bg-brand-100/70 dark:bg-brand-900/40 text-sm">
                      {formatDecimal(totalTgCabang)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. TABEL REALISASI BULAN LALU */}
        {activeCategory === 'bulan_lalu' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>Realisasi Bulan Lalu</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 font-semibold">
                  Rata2 Botol/Hari
                </span>
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-[11px] bg-neutral-50 dark:bg-neutral-800/60">
                    <th className="py-2.5 px-3 font-semibold text-center w-10">No</th>
                    <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
                    <th className="py-2.5 px-2 font-semibold text-center w-14">Rayon</th>
                    <th className="py-2.5 px-3 font-semibold text-right">ORI</th>
                    <th className="py-2.5 px-3 font-semibold text-right text-amber-600 dark:text-amber-400">OM</th>
                    <th className="py-2.5 px-3 font-semibold text-right text-pink-600 dark:text-pink-400">OS</th>
                    <th className="py-2.5 px-3 font-semibold text-right text-sky-600 dark:text-sky-400">YT</th>
                    <th className="py-2.5 px-3 font-bold text-right text-neutral-900 dark:text-neutral-100 bg-neutral-100/70 dark:bg-neutral-800/80">
                      Rata-rata/Hari
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                  {/* RAYON 1 */}
                  <tr className="bg-neutral-100/60 dark:bg-neutral-800/50 font-bold text-neutral-700 dark:text-neutral-300">
                    <td colSpan={8} className="py-2 px-3 font-sans">
                      RAYON 1 JEMBER
                    </td>
                  </tr>
                  {state.tkus.filter(t => t.rayon === 1).map((t, localIdx) => {
                    const idx = state.tkus.indexOf(t);
                    const ori = getVarVal('YO', idx, 'bl');
                    const om = getVarVal('OM', idx, 'bl');
                    const os = getVarVal('OS', idx, 'bl');
                    const yt = getVarVal('YT', idx, 'bl');
                    const avgDaily = ori + om + os + yt;

                    return (
                      <tr key={t.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-neutral-400 font-sans">{localIdx + 1}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">{t.nama}</td>
                        <td className="py-2.5 px-2 text-center text-neutral-500 font-sans">R1</td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={ori} onCommit={(v) => handleVariantFieldChange('YO', idx, 'bl', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={om} onCommit={(v) => handleVariantFieldChange('OM', idx, 'bl', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={os} onCommit={(v) => handleVariantFieldChange('OS', idx, 'bl', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={yt} onCommit={(v) => handleVariantFieldChange('YT', idx, 'bl', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-800/40">
                          {formatDecimal(avgDaily)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* SUBTOTAL RAYON 1 */}
                  {(() => {
                    const r1Tkus = state.tkus.filter(t => t.rayon === 1);
                    const r1Ori = r1Tkus.reduce((a, t) => a + getVarVal('YO', state.tkus.indexOf(t), 'bl'), 0);
                    const r1Om = r1Tkus.reduce((a, t) => a + getVarVal('OM', state.tkus.indexOf(t), 'bl'), 0);
                    const r1Os = r1Tkus.reduce((a, t) => a + getVarVal('OS', state.tkus.indexOf(t), 'bl'), 0);
                    const r1Yt = r1Tkus.reduce((a, t) => a + getVarVal('YT', state.tkus.indexOf(t), 'bl'), 0);
                    const r1Avg = r1Ori + r1Om + r1Os + r1Yt;

                    return (
                      <tr className="bg-neutral-50/90 dark:bg-neutral-800/80 font-bold border-t border-neutral-300 dark:border-neutral-700">
                        <td colSpan={3} className="py-2 px-3 font-sans text-neutral-800 dark:text-neutral-200">
                          Total Rayon 1
                        </td>
                        <td className="py-2 px-2 text-right">{formatDecimal(r1Ori)}</td>
                        <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400">{formatDecimal(r1Om)}</td>
                        <td className="py-2 px-2 text-right text-pink-600 dark:text-pink-400">{formatDecimal(r1Os)}</td>
                        <td className="py-2 px-2 text-right text-sky-600 dark:text-sky-400">{formatDecimal(r1Yt)}</td>
                        <td className="py-2 px-3 text-right bg-neutral-100/70 dark:bg-neutral-800">{formatDecimal(r1Avg)}</td>
                      </tr>
                    );
                  })()}

                  {/* RAYON 2 */}
                  <tr className="bg-neutral-100/60 dark:bg-neutral-800/50 font-bold text-neutral-700 dark:text-neutral-300">
                    <td colSpan={8} className="py-2 px-3 font-sans">
                      RAYON 2 JEMBER
                    </td>
                  </tr>
                  {state.tkus.filter(t => t.rayon === 2).map((t, localIdx) => {
                    const idx = state.tkus.indexOf(t);
                    const ori = getVarVal('YO', idx, 'bl');
                    const om = getVarVal('OM', idx, 'bl');
                    const os = getVarVal('OS', idx, 'bl');
                    const yt = getVarVal('YT', idx, 'bl');
                    const avgDaily = ori + om + os + yt;

                    return (
                      <tr key={t.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-neutral-400 font-sans">{localIdx + 6}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">{t.nama}</td>
                        <td className="py-2.5 px-2 text-center text-neutral-500 font-sans">R2</td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={ori} onCommit={(v) => handleVariantFieldChange('YO', idx, 'bl', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={om} onCommit={(v) => handleVariantFieldChange('OM', idx, 'bl', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={os} onCommit={(v) => handleVariantFieldChange('OS', idx, 'bl', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={yt} onCommit={(v) => handleVariantFieldChange('YT', idx, 'bl', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-800/40">
                          {formatDecimal(avgDaily)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* SUBTOTAL RAYON 2 */}
                  {(() => {
                    const r2Tkus = state.tkus.filter(t => t.rayon === 2);
                    const r2Ori = r2Tkus.reduce((a, t) => a + getVarVal('YO', state.tkus.indexOf(t), 'bl'), 0);
                    const r2Om = r2Tkus.reduce((a, t) => a + getVarVal('OM', state.tkus.indexOf(t), 'bl'), 0);
                    const r2Os = r2Tkus.reduce((a, t) => a + getVarVal('OS', state.tkus.indexOf(t), 'bl'), 0);
                    const r2Yt = r2Tkus.reduce((a, t) => a + getVarVal('YT', state.tkus.indexOf(t), 'bl'), 0);
                    const r2Avg = r2Ori + r2Om + r2Os + r2Yt;

                    return (
                      <tr className="bg-neutral-50/90 dark:bg-neutral-800/80 font-bold border-t border-neutral-300 dark:border-neutral-700">
                        <td colSpan={3} className="py-2 px-3 font-sans text-neutral-800 dark:text-neutral-200">
                          Total Rayon 2
                        </td>
                        <td className="py-2 px-2 text-right">{formatDecimal(r2Ori)}</td>
                        <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400">{formatDecimal(r2Om)}</td>
                        <td className="py-2 px-2 text-right text-pink-600 dark:text-pink-400">{formatDecimal(r2Os)}</td>
                        <td className="py-2 px-2 text-right text-sky-600 dark:text-sky-400">{formatDecimal(r2Yt)}</td>
                        <td className="py-2 px-3 text-right bg-neutral-100/70 dark:bg-neutral-800">{formatDecimal(r2Avg)}</td>
                      </tr>
                    );
                  })()}

                  {/* GRAND TOTAL CABANG JEMBER */}
                  <tr className="bg-neutral-100 dark:bg-neutral-800/90 font-extrabold border-t-2 border-neutral-400 dark:border-neutral-600 text-neutral-900 dark:text-white">
                    <td colSpan={3} className="py-3 px-3 font-sans text-xs">
                      TOTAL CABANG JEMBER
                    </td>
                    <td className="py-3 px-2 text-right">{formatDecimal(totalOriBl)}</td>
                    <td className="py-3 px-2 text-right text-amber-700 dark:text-amber-300">{formatDecimal(totalOmBl)}</td>
                    <td className="py-3 px-2 text-right text-pink-700 dark:text-pink-300">{formatDecimal(totalOsBl)}</td>
                    <td className="py-3 px-2 text-right text-sky-700 dark:text-sky-300">{formatDecimal(totalYtBl)}</td>
                    <td className="py-3 px-3 text-right bg-neutral-200/60 dark:bg-neutral-700 text-sm">
                      {formatDecimal(totalBlCabang)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. TABEL REALISASI TAHUN LALU */}
        {activeCategory === 'tahun_lalu' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>Realisasi Tahun Lalu</span>
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-[11px] bg-neutral-50 dark:bg-neutral-800/60">
                    <th className="py-2.5 px-3 font-semibold text-center w-10">No</th>
                    <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
                    <th className="py-2.5 px-2 font-semibold text-center w-14">Rayon</th>
                    <th className="py-2.5 px-3 font-semibold text-right">ORI</th>
                    <th className="py-2.5 px-3 font-semibold text-right text-amber-600 dark:text-amber-400">OM</th>
                    <th className="py-2.5 px-3 font-semibold text-right text-neutral-400">OS</th>
                    <th className="py-2.5 px-3 font-semibold text-right text-sky-600 dark:text-sky-400">YT</th>
                    <th className="py-2.5 px-3 font-bold text-right text-neutral-900 dark:text-neutral-100 bg-neutral-100/70 dark:bg-neutral-800/80">
                      Rata-rata/Hari
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                  {/* RAYON 1 */}
                  <tr className="bg-neutral-100/60 dark:bg-neutral-800/50 font-bold text-neutral-700 dark:text-neutral-300">
                    <td colSpan={8} className="py-2 px-3 font-sans">
                      RAYON 1 JEMBER
                    </td>
                  </tr>
                  {state.tkus.filter(t => t.rayon === 1).map((t, localIdx) => {
                    const idx = state.tkus.indexOf(t);
                    const ori = getVarVal('YO', idx, 'ty');
                    const om = getVarVal('OM', idx, 'ty');
                    const yt = getVarVal('YT', idx, 'ty');
                    const avgDaily = ori + om + yt;

                    return (
                      <tr key={t.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-neutral-400 font-sans">{localIdx + 1}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">{t.nama}</td>
                        <td className="py-2.5 px-2 text-center text-neutral-500 font-sans">R1</td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={ori} onCommit={(v) => handleVariantFieldChange('YO', idx, 'ty', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={om} onCommit={(v) => handleVariantFieldChange('OM', idx, 'ty', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right text-neutral-400">
                          <span className="text-neutral-400">—</span>
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={yt} onCommit={(v) => handleVariantFieldChange('YT', idx, 'ty', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-800/40">
                          {formatDecimal(avgDaily)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* SUBTOTAL RAYON 1 */}
                  {(() => {
                    const r1Tkus = state.tkus.filter(t => t.rayon === 1);
                    const r1Ori = r1Tkus.reduce((a, t) => a + getVarVal('YO', state.tkus.indexOf(t), 'ty'), 0);
                    const r1Om = r1Tkus.reduce((a, t) => a + getVarVal('OM', state.tkus.indexOf(t), 'ty'), 0);
                    const r1Yt = r1Tkus.reduce((a, t) => a + getVarVal('YT', state.tkus.indexOf(t), 'ty'), 0);
                    const r1Avg = r1Ori + r1Om + r1Yt;

                    return (
                      <tr className="bg-neutral-50/90 dark:bg-neutral-800/80 font-bold border-t border-neutral-300 dark:border-neutral-700">
                        <td colSpan={3} className="py-2 px-3 font-sans text-neutral-800 dark:text-neutral-200">
                          Total Rayon 1
                        </td>
                        <td className="py-2 px-2 text-right">{formatDecimal(r1Ori)}</td>
                        <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400">{formatDecimal(r1Om)}</td>
                        <td className="py-2 px-2 text-right text-neutral-400">—</td>
                        <td className="py-2 px-2 text-right text-sky-600 dark:text-sky-400">{formatDecimal(r1Yt)}</td>
                        <td className="py-2 px-3 text-right bg-neutral-100/70 dark:bg-neutral-800">{formatDecimal(r1Avg)}</td>
                      </tr>
                    );
                  })()}

                  {/* RAYON 2 */}
                  <tr className="bg-neutral-100/60 dark:bg-neutral-800/50 font-bold text-neutral-700 dark:text-neutral-300">
                    <td colSpan={8} className="py-2 px-3 font-sans">
                      RAYON 2 JEMBER
                    </td>
                  </tr>
                  {state.tkus.filter(t => t.rayon === 2).map((t, localIdx) => {
                    const idx = state.tkus.indexOf(t);
                    const ori = getVarVal('YO', idx, 'ty');
                    const om = getVarVal('OM', idx, 'ty');
                    const yt = getVarVal('YT', idx, 'ty');
                    const avgDaily = ori + om + yt;

                    return (
                      <tr key={t.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-neutral-400 font-sans">{localIdx + 6}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">{t.nama}</td>
                        <td className="py-2.5 px-2 text-center text-neutral-500 font-sans">R2</td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={ori} onCommit={(v) => handleVariantFieldChange('YO', idx, 'ty', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={om} onCommit={(v) => handleVariantFieldChange('OM', idx, 'ty', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-1.5 px-2 text-right text-neutral-400">
                          <span className="text-neutral-400">—</span>
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <DecimalInput value={yt} onCommit={(v) => handleVariantFieldChange('YT', idx, 'ty', v)} className="w-18 px-2 py-1 text-right rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs" />
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-800/40">
                          {formatDecimal(avgDaily)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* SUBTOTAL RAYON 2 */}
                  {(() => {
                    const r2Tkus = state.tkus.filter(t => t.rayon === 2);
                    const r2Ori = r2Tkus.reduce((a, t) => a + getVarVal('YO', state.tkus.indexOf(t), 'ty'), 0);
                    const r2Om = r2Tkus.reduce((a, t) => a + getVarVal('OM', state.tkus.indexOf(t), 'ty'), 0);
                    const r2Yt = r2Tkus.reduce((a, t) => a + getVarVal('YT', state.tkus.indexOf(t), 'ty'), 0);
                    const r2Avg = r2Ori + r2Om + r2Yt;

                    return (
                      <tr className="bg-neutral-50/90 dark:bg-neutral-800/80 font-bold border-t border-neutral-300 dark:border-neutral-700">
                        <td colSpan={3} className="py-2 px-3 font-sans text-neutral-800 dark:text-neutral-200">
                          Total Rayon 2
                        </td>
                        <td className="py-2 px-2 text-right">{formatDecimal(r2Ori)}</td>
                        <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400">{formatDecimal(r2Om)}</td>
                        <td className="py-2 px-2 text-right text-neutral-400">—</td>
                        <td className="py-2 px-2 text-right text-sky-600 dark:text-sky-400">{formatDecimal(r2Yt)}</td>
                        <td className="py-2 px-3 text-right bg-neutral-100/70 dark:bg-neutral-800">{formatDecimal(r2Avg)}</td>
                      </tr>
                    );
                  })()}

                  {/* GRAND TOTAL CABANG JEMBER */}
                  <tr className="bg-neutral-100 dark:bg-neutral-800/90 font-extrabold border-t-2 border-neutral-400 dark:border-neutral-600 text-neutral-900 dark:text-white">
                    <td colSpan={3} className="py-3 px-3 font-sans text-xs">
                      TOTAL CABANG JEMBER
                    </td>
                    <td className="py-3 px-2 text-right">{formatDecimal(totalOriTy)}</td>
                    <td className="py-3 px-2 text-right text-amber-700 dark:text-amber-300">{formatDecimal(totalOmTy)}</td>
                    <td className="py-3 px-2 text-right text-neutral-400">—</td>
                    <td className="py-3 px-2 text-right text-sky-700 dark:text-sky-300">{formatDecimal(totalYtTy)}</td>
                    <td className="py-3 px-3 text-right bg-neutral-200/60 dark:bg-neutral-700 text-sm">
                      {formatDecimal(totalTyCabang)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. TABEL KOMPARASI */}
        {activeCategory === 'komparasi' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>Komparasi Target</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 font-semibold">
                  Satuan: Botol/Hari
                </span>
              </h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-[11px] bg-neutral-50 dark:bg-neutral-800/60">
                    <th className="py-2.5 px-3 font-semibold text-center w-10">No</th>
                    <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
                    <th className="py-2.5 px-2 font-semibold text-center w-14">Rayon</th>
                    <th className="py-2.5 px-3 font-bold text-right text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/20">
                      Target {curShort}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Realisasi {blShortLabel}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Realisasi {tyShortLabel}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Pertumbuhan vs LM
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Pertumbuhan vs LY
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                  {state.tkus.map((t, idx) => {
                    const tg = getVarVal('YO', idx, 'tg') + getVarVal('OM', idx, 'tg') + getVarVal('OS', idx, 'tg') + getVarVal('YT', idx, 'tg') || t.targetHarian;
                    const bl = getVarVal('YO', idx, 'bl') + getVarVal('OM', idx, 'bl') + getVarVal('OS', idx, 'bl') + getVarVal('YT', idx, 'bl') || state.targetBulanLalu[idx] || 0;
                    const ty = getVarVal('YO', idx, 'ty') + getVarVal('OM', idx, 'ty') + getVarVal('OS', idx, 'ty') + getVarVal('YT', idx, 'ty') || state.targetTahunLalu[idx] || 0;
                    
                    const growthBl = bl > 0 ? (tg - bl) / bl : 0;
                    const growthTy = ty > 0 ? (tg - ty) / ty : 0;

                    return (
                      <tr key={t.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-neutral-400 font-sans">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">{t.nama}</td>
                        <td className="py-2.5 px-2 text-center text-neutral-500 font-sans">R{t.rayon}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-brand-600 dark:text-brand-400 bg-brand-50/30 dark:bg-brand-950/10">
                          {formatDecimal(tg)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {formatDecimal(bl)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {formatDecimal(ty)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-semibold ${growthBl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {growthBl >= 0 ? '+' : ''}{formatPercent(growthBl)}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-semibold ${growthTy >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {growthTy >= 0 ? '+' : ''}{formatPercent(growthTy)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* TOTAL CABANG */}
                  <tr className="bg-brand-50 dark:bg-brand-950/40 font-extrabold border-t-2 border-brand-400 dark:border-brand-800 text-neutral-900 dark:text-white">
                    <td colSpan={3} className="py-3 px-3 font-sans text-brand-800 dark:text-brand-300 text-xs">
                      TOTAL CABANG JEMBER
                    </td>
                    <td className="py-3 px-3 text-right text-brand-700 dark:text-brand-300 bg-brand-100/70 dark:bg-brand-900/40 text-sm">
                      {formatDecimal(totalTgCabang)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm">
                      {formatDecimal(totalBlCabang)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm">
                      {formatDecimal(totalTyCabang)}
                    </td>
                    <td className={`py-3 px-3 text-right font-extrabold ${totalTgCabang >= totalBlCabang ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {totalTgCabang >= totalBlCabang ? '+' : ''}{formatPercent(totalBlCabang > 0 ? (totalTgCabang - totalBlCabang) / totalBlCabang : 0)}
                    </td>
                    <td className={`py-3 px-3 text-right font-extrabold ${totalTgCabang >= totalTyCabang ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {totalTgCabang >= totalTyCabang ? '+' : ''}{formatPercent(totalTyCabang > 0 ? (totalTgCabang - totalTyCabang) / totalTyCabang : 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
