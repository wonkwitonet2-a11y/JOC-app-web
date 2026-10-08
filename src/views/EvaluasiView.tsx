import React, { useState } from 'react';
import { 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  Table as TableIcon, 
  FileSpreadsheet, 
  Sparkles,
  Maximize2,
  Minimize2,
  Table,
  LayoutGrid,
  Zap,
  Target,
  Calendar,
  ShieldCheck,
  Flame,
  UserCheck,
  MapPin,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { AppState } from '../types';
import { buildEvaluasiData, EvaluasiHighlights } from '../services/evaluasi';
import { EvalFullTable } from '../components/EvalFullTable';
import { EvalMiniTable } from '../components/EvalMiniTable';
import { formatNumber, formatPercent, getPeriodInfo, getPembagiHari, getBbStatusClass } from '../services/storage';

interface EvaluasiViewProps {
  state: AppState;
  onUpdateRayon: (rayon: number) => void;
}

const abbreviateTkuName = (name: string): string => {
  const n = name.trim();
  const up = n.toUpperCase();
  if (up === 'DP JEMBER 1' || up === 'DP 1' || up === 'DP1') return 'DP1';
  if (up === 'DP JEMBER 2' || up === 'DP 2' || up === 'DP2') return 'DP2';
  if (up === 'DP JEMBER 3' || up === 'DP 3' || up === 'DP3') return 'DP3';
  if (up === 'DP JEMBER 4' || up === 'DP 4' || up === 'DP4') return 'DP4';
  if (up === 'TAWANGALUN' || up === 'TALUN') return 'Talun';
  if (up === 'JEMBER 1' || up === 'JEMBER1' || up === 'JBR 1' || up === 'JBR1' || up === 'JEMBER') return 'JBR1';
  if (up === 'JEMBER 2' || up === 'JEMBER2' || up === 'JBR 2' || up === 'JBR2') return 'JBR2';
  if (up === 'KALISAT' || up === 'KSAT') return 'Ksat';
  if (up === 'DAWUHAN' || up === 'DWH') return 'Dwh';
  if (up === 'PELITA') return 'Pelita';
  return name;
};

const formatShortNames = (names: string[] | undefined, defaultName: string): string => {
  if (names && names.length > 0) {
    return names.map(abbreviateTkuName).join(', ');
  }
  if (!defaultName || defaultName === '—') return '—';
  return defaultName.split(', ').map(abbreviateTkuName).join(', ');
};

interface RingkasanPrestasiPanelProps {
  highlights: EvaluasiHighlights;
  layout?: '2-col' | 'row';
  periodLabel?: string;
  className?: string;
}

/** Komponen Ringkasan Prestasi 9 Metrik Kunci (Single Title, Short Codes & Popup Detail) */
const RingkasanPrestasiPanel: React.FC<RingkasanPrestasiPanelProps> = ({
  highlights,
  layout = '2-col',
  periodLabel = '',
  className = ''
}) => {
  const [modalDetail, setModalDetail] = useState<{
    title: string;
    value: string;
    namesList: string[];
    icon: React.ElementType;
    iconColor: string;
  } | null>(null);

  const cards = [
    {
      id: 'rata',
      title: 'Top rata2',
      rawNames: highlights.topRata.names || [highlights.topRata.name],
      shortNames: formatShortNames(highlights.topRata.names, highlights.topRata.name),
      value: `${formatNumber(Math.round(highlights.topRata.val))} btl`,
      icon: TrendingUp,
      iconColor: 'text-brand-600 dark:text-brand-400',
      valColor: 'text-brand-600 dark:text-brand-400',
    },
    {
      id: 'lw',
      title: 'Vs LW',
      rawNames: highlights.topLw?.names || (highlights.topLw ? [highlights.topLw.name] : ['—']),
      shortNames: formatShortNames(highlights.topLw?.names, highlights.topLw?.name || '—'),
      value: highlights.topLw ? formatPercent(highlights.topLw.pct) : '—',
      icon: Zap,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'target',
      title: 'vs tgt',
      rawNames: highlights.topTg.names || [highlights.topTg.name],
      shortNames: formatShortNames(highlights.topTg.names, highlights.topTg.name),
      value: formatPercent(highlights.topTg.pct),
      icon: Target,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'ly',
      title: 'vs LY',
      rawNames: highlights.topLy.names || [highlights.topLy.name],
      shortNames: formatShortNames(highlights.topLy.names, highlights.topLy.name),
      value: formatPercent(highlights.topLy.pct),
      icon: Calendar,
      iconColor: 'text-sky-600 dark:text-sky-400',
      valColor: 'text-sky-600 dark:text-sky-400',
    },
    {
      id: 'bb',
      title: '%BB',
      rawNames: highlights.bestBb.names || [highlights.bestBb.name],
      shortNames: formatShortNames(highlights.bestBb.names, highlights.bestBb.name),
      value: formatPercent(highlights.bestBb.pct),
      icon: ShieldCheck,
      iconColor: getBbStatusClass(highlights.bestBb.pct),
      valColor: getBbStatusClass(highlights.bestBb.pct),
    },
    {
      id: 'syl',
      title: 'S/yl',
      rawNames: highlights.topSyl.names || [highlights.topSyl.name],
      shortNames: formatShortNames(highlights.topSyl.names, highlights.topSyl.name),
      value: formatNumber(highlights.topSyl.val),
      icon: Flame,
      iconColor: 'text-brand-600 dark:text-brand-400',
      valColor: 'text-brand-600 dark:text-brand-400',
    },
    {
      id: 'presensi',
      title: 'abs/frk',
      rawNames: highlights.bestAbsen.names || [highlights.bestAbsen.name],
      shortNames: formatShortNames(highlights.bestAbsen.names, highlights.bestAbsen.name),
      value: String(highlights.bestAbsen.abs === 0 ? 0 : highlights.bestAbsen.frk),
      icon: UserCheck,
      iconColor: 'text-purple-600 dark:text-purple-400',
      valColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      id: 'ca',
      title: 'Ca',
      rawNames: highlights.bestCover.names || [highlights.bestCover.name],
      shortNames: formatShortNames(highlights.bestCover.names, highlights.bestCover.name),
      value: formatPercent(highlights.bestCover.pct),
      icon: MapPin,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valColor: highlights.bestCover.pct >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'l250',
      title: '<250',
      rawNames: highlights.bestL250.names || [highlights.bestL250.name],
      shortNames: formatShortNames(highlights.bestL250.names, highlights.bestL250.name),
      value: formatPercent(highlights.bestL250.pct),
      icon: CheckCircle2,
      iconColor: 'text-teal-600 dark:text-teal-400',
      valColor: 'text-teal-600 dark:text-teal-400',
      span2: true,
    },
  ];

  const handleCardClick = (c: typeof cards[0]) => {
    setModalDetail({
      title: c.title,
      value: c.value,
      namesList: c.rawNames,
      icon: c.icon,
      iconColor: c.iconColor,
    });
  };

  const renderSingleCard = (c: typeof cards[0], isCompact = false) => (
    <div
      key={c.id}
      onClick={() => handleCardClick(c)}
      className={`p-1.5 sm:p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-center gap-0.5 sm:gap-1 min-w-0 overflow-hidden cursor-pointer hover:border-brand-500/50 hover:shadow-xs transition-all group ${c.span2 && isCompact ? 'col-span-2' : ''}`}
    >
      {/* Baris 1: Judul Kategori | Nilainya */}
      <div className="flex items-center justify-between gap-1 leading-none">
        <div className="flex items-center gap-1 min-w-0">
          <c.icon className={`w-3.5 h-3.5 ${c.iconColor} shrink-0`} />
          <span className="text-[9.5px] sm:text-[10px] font-bold text-neutral-800 dark:text-neutral-200 truncate">
            {c.title}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 font-mono text-[10px] sm:text-[10.5px]">
          <span className="text-neutral-300 dark:text-neutral-600 font-normal">|</span>
          <span className={`font-black ${c.valColor}`}>{c.value}</span>
        </div>
      </div>

      {/* Baris 2: TKU tsb. (mepet ke atas ke garis pemisah, menumpuk jika panjang) */}
      <div className="min-w-0 mt-0.5 pt-0.5 border-t border-neutral-100 dark:border-neutral-800/80">
        <span 
          className="text-[9px] sm:text-[9.5px] font-bold text-neutral-600 dark:text-neutral-300 block leading-tight break-words group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2" 
          title={c.shortNames}
        >
          {c.shortNames}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Detail Overlay Popup Modal saat Kartu Ringkasan Diklik */}
      {modalDetail && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setModalDetail(null)}
        >
          <div 
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4 text-left animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <modalDetail.icon className={`w-5 h-5 ${modalDetail.iconColor}`} />
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    {modalDetail.title}
                  </h3>
                  <p className="text-xs font-mono font-black text-brand-600 dark:text-brand-400">
                    Capaian: {modalDetail.value}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalDetail(null)}
                className="p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-500 dark:text-neutral-400 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-tight block">
                Unit TKU Terpilih ({modalDetail.namesList.length} Unit):
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {modalDetail.namesList.map((nm, idx) => (
                  <div 
                    key={idx}
                    className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between gap-2"
                  >
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {nm}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 font-bold shrink-0">
                      {abbreviateTkuName(nm)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setModalDetail(null)}
              className="w-full py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold text-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {layout === 'row' ? (
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-1.5 sm:gap-2 items-stretch ${className}`}>
          {cards.map(c => renderSingleCard(c, false))}
        </div>
      ) : (
        <div className={`flex flex-col h-full overflow-hidden ${className}`}>
          {/* Header Panel */}
          <div className="flex items-center justify-between px-1 pb-1 shrink-0 border-b border-neutral-200/80 dark:border-neutral-800 mb-1">
            <div className="flex items-center gap-1 min-w-0">
              <Bookmark className="w-3 h-3 text-brand-600 dark:text-brand-400 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-900 dark:text-white truncate">
                RINGKASAN PRESTASI
              </span>
            </div>
            <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
              9 Metrik
            </span>
          </div>

          {/* 2-Kolom Grid Kartu Pas Vertikal (Mode Landscape) */}
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-1 auto-rows-fr h-full">
            {cards.map(c => renderSingleCard(c, true))}
          </div>
        </div>
      )}
    </>
  );
};

export const EvaluasiView: React.FC<EvaluasiViewProps> = ({ state, onUpdateRayon }) => {
  const [evalMode, setEvalMode] = useState<'mini' | 'full' | 'analisa'>('mini');
  const [mobileMiniMode, setMobileMiniMode] = useState<'table' | 'matrix'>('table');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const selectedRayon = state.selectedRayon; // 0: Cabang, 1: Rayon 1, 2: Rayon 2
  const period = getPeriodInfo(state);
  const day = state.currentDayNum;
  const divider = getPembagiHari(state);

  const {
    allRows,
    r1Rows,
    r2Rows,
    r1Total,
    r2Total,
    cabangTotal,
    highlights
  } = buildEvaluasiData(state);

  const displayedRows = selectedRayon === 0 
    ? allRows.filter(r => r.tku.aktif)
    : selectedRayon === 1
    ? r1Rows
    : r2Rows;

  // Sorting for performance analysis
  const sortedByPerf = [...displayedRows].sort((a, b) => b.vsTgPct - a.vsTgPct);
  const top3Tkus = sortedByPerf.slice(0, 3);
  const bottom3Tkus = [...displayedRows].sort((a, b) => a.vsTgPct - b.vsTgPct).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls Bar */}
      <div className="p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600 shrink-0" />
              <span>Evaluasi</span>
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-200 dark:border-brand-800 font-semibold">
              {period.label} (÷{divider}hr)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Rayon Filter */}
          <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl shrink-0">
            {[
              { id: 0, label: 'Cabang' },
              { id: 1, label: 'Rayon 1' },
              { id: 2, label: 'Rayon 2' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => onUpdateRayon(r.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedRayon === r.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* View Mode Switcher: Mini Table (HP) vs Full Table vs Analisa */}
          <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl shrink-0 overflow-x-auto max-w-full">
            <button
              onClick={() => setEvalMode('mini')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                evalMode === 'mini'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Tabel Mini</span>
            </button>
            <button
              onClick={() => setEvalMode('full')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                evalMode === 'full'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel Utuh</span>
            </button>
            <button
              onClick={() => setEvalMode('analisa')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                evalMode === 'analisa'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tren Mingguan</span>
            </button>
          </div>

          {/* Tombol Gabungan Khusus Mode Mini di Layar HP: Tabel Geser vs Matriks HP */}
          {evalMode === 'mini' && (
            <div className="sm:hidden inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl shrink-0 border border-neutral-200/80 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setMobileMiniMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mobileMiniMode === 'table'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Table className="w-3 h-3 text-brand-500" />
                <span>Geser</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileMiniMode('matrix')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mobileMiniMode === 'matrix'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <LayoutGrid className="w-3 h-3 text-brand-500" />
                <span>Matriks</span>
              </button>
            </div>
          )}

          {/* Tombol Mode Layar Penuh (Fullscreen) */}
          <button
            onClick={() => setIsFullscreen(true)}
            title="Tampilkan slide tabel dan 9 kartu ringkasan dalam 1 frame layar penuh"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all cursor-pointer shadow-xs"
          >
            <Maximize2 className="w-3.5 h-3.5 text-brand-400 dark:text-brand-600" />
            <span>Mode Slide</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAMPILAN SESUAI MODE: LANDSCAPE SAMPING (2-KOLOM), PORTRAIT BAWAH       */}
      {/* ========================================================================= */}

      {/* MODE 1: TABEL MINI */}
      {evalMode === 'mini' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-brand-600" />
              <span>Tabel Ringkas</span>
            </h2>
          </div>

          {/* Grid Responsif: Landscape Samping, Portrait / Tab Mode Bawah */}
          <div className="flex flex-col landscape:grid landscape:grid-cols-12 gap-3 items-stretch">
            {/* Tabel Mini di Kiri (Landscape) / Atas (Portrait) */}
            <div className="landscape:col-span-8 min-w-0 flex flex-col justify-between bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 sm:p-4 shadow-sm">
              <div className="flex-1 min-h-0">
                <EvalMiniTable
                  r1Rows={r1Rows}
                  r2Rows={r2Rows}
                  r1Total={r1Total}
                  r2Total={r2Total}
                  cabangTotal={cabangTotal}
                  selectedRayon={selectedRayon}
                  mobileMode={mobileMiniMode}
                  onMobileModeChange={setMobileMiniMode}
                  hideTopBar={true}
                  compact={false}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 pt-2.5 shrink-0 border-t border-neutral-100 dark:border-neutral-800 mt-2">
                <span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-500 inline-block shrink-0" />
                <span><strong className="text-emerald-700 dark:text-emerald-400">Sel hijau</strong> = Performa terbaik unit TKU</span>
              </div>
            </div>

            {/* 9 Kartu Ringkasan: Samping Kanan (Landscape) / Bawah (Portrait / Tab Mode) */}
            <div className="landscape:col-span-4 min-w-0 flex flex-col justify-start">
              {/* Mode Landscape: 2-Kolom Kartu Pas Tinggi Vertikal Tabel */}
              <div className="hidden landscape:block h-full bg-neutral-50/90 dark:bg-neutral-900/90 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-2">
                <RingkasanPrestasiPanel highlights={highlights} layout="2-col" periodLabel={period.label} />
              </div>

              {/* Mode Portrait / Tab Mode: Tampil Rapi di Bawah Tabel dalam 3 Kolom */}
              <div className="block landscape:hidden">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                  Ringkasan Metrik
                </h3>
                <RingkasanPrestasiPanel highlights={highlights} layout="row" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: TABEL UTUH / FULL */}
      {evalMode === 'full' && (
        <div className="space-y-6">
          {/* TABEL FULL DI ATAS */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <TableIcon className="w-4 h-4 text-emerald-600" />
                <span>Tabel Lengkap</span>
              </h2>
              <span className="text-[11px] text-neutral-500 font-mono">
                Total {displayedRows.length} Unit TKU &bull; Pembagi {divider} Hari
              </span>
            </div>

            <EvalFullTable
              rows={displayedRows}
              r1Rows={r1Rows}
              r2Rows={r2Rows}
              r1Total={r1Total}
              r2Total={r2Total}
              cabangTotal={cabangTotal}
              selectedRayon={selectedRayon}
              divider={divider}
            />
          </div>

          {/* Rekapitulasi Penjualan & Tren Pertumbuhan Mingguan */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Rekap Mingguan</span>
                </h3>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                Target Harian: {formatNumber(selectedRayon === 0 ? state.tkus.reduce((a,b)=>a+b.targetHarian, 0) : state.tkus.filter(t=>t.rayon === selectedRayon).reduce((a,b)=>a+b.targetHarian, 0))} btl/hr
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-semibold bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="py-2.5 px-3">Periode</th>
                    <th className="py-2.5 px-3">Rentang Tanggal</th>
                    <th className="py-2.5 px-3 text-right">Penjualan Minggu Ini</th>
                    <th className="py-2.5 px-3 text-right text-brand-600 dark:text-brand-400 font-bold">Akumulasi s/d Minggu Ini</th>
                    <th className="py-2.5 px-3 text-right font-bold">Rata-rata/hr</th>
                    <th className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-white border-l border-neutral-200 dark:border-neutral-700">vs Minggu Lalu (%)</th>
                    <th className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-white">Naik / Turun (btl)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                  {(() => {
                    const WEEKS_DEF = [
                      { label: 'M1 (Minggu 1)', range: 'Tgl 1 – 6 Sep', start: 1, end: 6, workDays: 6, div: 6 },
                      { label: 'M2 (Minggu 2)', range: 'Tgl 8 – 13 Sep', start: 8, end: 13, workDays: 6, div: 12 },
                      { label: 'M3 (Minggu 3)', range: 'Tgl 15 – 20 Sep', start: 15, end: 20, workDays: 6, div: 18 },
                      { label: 'M4 (Minggu 4)', range: 'Tgl 22 – 27 Sep', start: 22, end: 27, workDays: 6, div: 24 },
                      { label: 'M5 (Minggu 5)', range: 'Tgl 29 – 30 Sep', start: 29, end: 30, workDays: 2, div: 26 },
                    ];

                    const relevantTkus = state.tkus.filter(t => t.aktif && (selectedRayon === 0 || t.rayon === selectedRayon));
                    const relIdxs = relevantTkus.map(t => state.tkus.indexOf(t));

                    let runningCum = 0;
                    let prevWeekSales: number | null = null;
                    const rows = [];

                    for (let wIdx = 0; wIdx < WEEKS_DEF.length; wIdx++) {
                      const w = WEEKS_DEF[wIdx];
                      let weekSales = 0;

                      for (let d = w.start; d <= w.end; d++) {
                        const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
                        relIdxs.forEach(tIdx => {
                          const rec = state.pjd[dStr]?.[tIdx];
                          if (rec) {
                            weekSales += rec.sold || (rec.v ? rec.v.reduce((a, b) => a + b, 0) : 0);
                          } else if (d === state.currentDayNum && state.todayInputs[tIdx]) {
                            weekSales += state.todayInputs[tIdx].sold || 0;
                          } else {
                            weekSales += state.breakdown?.[tIdx]?.[d - 1] || state.tkus[tIdx].targetHarian;
                          }
                        });
                      }

                      runningCum += weekSales;
                      const avgPerDay = w.div > 0 ? runningCum / w.div : 0;
                      const vsPrevPct = prevWeekSales !== null && prevWeekSales > 0 ? (weekSales / prevWeekSales) : null;
                      const vsPrevDiff = prevWeekSales !== null ? (weekSales - prevWeekSales) : null;

                      prevWeekSales = weekSales;

                      rows.push(
                        <tr key={w.label} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                          <td className="py-2.5 px-3 font-sans font-bold text-neutral-900 dark:text-neutral-100">
                            {w.label}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-neutral-500">
                            {w.range}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                            {formatNumber(weekSales)} <span className="text-[10px] font-sans text-neutral-400 font-normal">btl</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-brand-600 dark:text-brand-400">
                            {formatNumber(runningCum)} <span className="text-[10px] font-sans text-neutral-400 font-normal">btl</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-neutral-800 dark:text-neutral-200">
                            {formatNumber(Math.round(avgPerDay))} <span className="text-[10px] font-sans text-neutral-400 font-normal">btl/hr</span>
                          </td>
                          <td className="py-2.5 px-3 text-right border-l border-neutral-200 dark:border-neutral-700">
                            {vsPrevPct !== null ? (
                              <span className={`font-bold ${vsPrevPct >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatPercent(vsPrevPct)}
                              </span>
                            ) : (
                              <span className="text-neutral-400">— (Awal Bulan)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {vsPrevDiff !== null ? (
                              <span className={`font-bold ${vsPrevDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {vsPrevDiff >= 0 ? `+${formatNumber(vsPrevDiff)}` : formatNumber(vsPrevDiff)} btl
                              </span>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    }

                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* 9 KARTU RINGKASAN DI BAWAH TABEL */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Ringkasan 9 Metrik Performa Kunci
            </h3>
            <RingkasanPrestasiPanel highlights={highlights} layout="row" />
          </div>
        </div>
      )}

      {/* MODE 3: TREN MINGGUAN & ANALISA */}
      {evalMode === 'analisa' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Performer vs Bottom Performer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top 3 Performers */}
            <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm space-y-3 min-w-0 h-full">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <Award className="w-5 h-5" />
                <h3>3 TKU Terbaik</h3>
              </div>
              <div className="space-y-2">
                {top3Tkus.map((r, i) => (
                  <div key={r.tku.id} className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-6 h-6 shrink-0 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-neutral-900 dark:text-white break-words">{r.tku.nama} (Rayon {r.tku.rayon})</p>
                        <span className="text-[10px] text-neutral-500 font-mono block break-words">
                          Rata: {formatNumber(Math.round(r.rata2))} btl/hr &bull; s/YL: {r.syl} &bull; % BB: {formatPercent(r.pctBb)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black font-mono break-words leading-tight text-emerald-600 dark:text-emerald-400">
                        {formatPercent(r.vsTgPct)}
                      </span>
                      <span className="text-[10px] text-neutral-400 block">vs Target</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom 3 Performers */}
            <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-red-200/80 dark:border-red-900/50 shadow-sm space-y-3 min-w-0 h-full">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <h3>3 TKU Perlu Pembinaan</h3>
              </div>
              <div className="space-y-2">
                {bottom3Tkus.map((r, i) => (
                  <div key={r.tku.id} className="p-3 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-6 h-6 shrink-0 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-neutral-900 dark:text-white break-words">{r.tku.nama} (Rayon {r.tku.rayon})</p>
                        <span className="text-[10px] text-neutral-500 font-mono block break-words">
                          Rata: {formatNumber(Math.round(r.rata2))} btl/hr &bull; YL &lt; 250: {r.l250} ({formatPercent(r.pctL250)})
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black font-mono break-words leading-tight text-red-600 dark:text-red-400">
                        {formatPercent(r.vsTgPct)}
                      </span>
                      <span className="text-[10px] text-neutral-400 block">vs Target</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rangkuman Analisa Eksekutif */}
          <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-600" />
              <span>Analisa &amp; Rekomendasi</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch text-xs text-neutral-700 dark:text-neutral-300">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700 space-y-1.5 min-w-0 h-full break-words">
                <span className="font-bold text-brand-600 dark:text-brand-400 uppercase text-[10px] tracking-wider block">1. Evaluasi Ritme &amp; Target</span>
                <p>
                  Pencapaian Cabang Jember mencapai rata-rata <strong className="font-mono">{formatNumber(Math.round(cabangTotal.rata2))} btl/hari</strong> ({formatPercent(cabangTotal.vsTgPct)} vs Target). Unit dengan tren pertumbuhan mingguan (vs LW) tertinggi dipimpin oleh <strong className="text-emerald-600">{highlights.topLw?.name || '—'}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700 space-y-1.5 min-w-0 h-full break-words">
                <span className="font-bold text-amber-600 dark:text-amber-400 uppercase text-[10px] tracking-wider block">2. Mutu Operasional &amp; BB</span>
                <p>
                  Rasio Balik Botol Cabang berada di angka <strong className="font-mono">{formatPercent(cabangTotal.pctBb)}</strong>. Unit dengan kontrol botol terbersih adalah <strong className="text-amber-600">{highlights.bestBb.name}</strong> ({formatPercent(highlights.bestBb.pct)}).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700 space-y-1.5 min-w-0 h-full break-words">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-wider block">3. Produktivitas &amp; YL &lt; 250</span>
                <p>
                  Total YL dengan rata-rata &lt; 250 botol/hari tercatat sebanyak <strong className="font-mono text-red-600">{cabangTotal.l250} YL</strong> ({formatPercent(cabangTotal.pctL250)}). Perlu pendampingan khusus pada rute dan pembagian area YL tersebut.
                </p>
              </div>
            </div>
          </div>

          {/* 9 KARTU RINGKASAN DI BAWAH ANALISA */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Ringkasan Metrik
            </h3>
            <RingkasanPrestasiPanel highlights={highlights} layout="row" />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL / FRAME MODE LAYAR PENUH (FULLSCREEN 1-FRAME MIRROR SHEET)       */}
      {/* Sesuai Referensi Screenshot 2: Kiri Tabel Utuh, Kanan 9 Card 2-Kolom      */}
      {/* ========================================================================= */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md p-1.5 sm:p-2.5 flex flex-col gap-1.5 overflow-hidden animate-in fade-in duration-150">
          {/* Header Bar Layar Penuh Super Ringkas & Tipis (Hemat Ruang Vertikal) */}
          <div className="px-2 py-0.5 bg-neutral-900 text-white rounded-md border border-neutral-800 flex items-center justify-between gap-1 shrink-0 min-w-0 h-6 sm:h-7">
            {/* Kiri: Judul + Periode + Rayon Filter */}
            <div className="flex items-center gap-1 min-w-0">
              <TrendingUp className="w-3 h-3 text-brand-400 shrink-0" />
              <h2 className="text-[10px] font-bold tracking-tight text-white uppercase truncate max-w-[100px] sm:max-w-[180px]">
                EVALUASI TKU
              </h2>
              <span className="text-[8.5px] font-mono px-1 py-0 rounded bg-neutral-800 text-brand-300 font-semibold shrink-0">
                {period.label} (÷{divider}hr)
              </span>

              {/* Rayon Selector */}
              <div className="inline-flex p-0.2 bg-neutral-800 rounded shrink-0">
                {[
                  { id: 0, label: 'Cabang' },
                  { id: 1, label: 'R1' },
                  { id: 2, label: 'R2' },
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => onUpdateRayon(r.id)}
                    className={`px-1 py-0 text-[9px] font-bold rounded transition-all cursor-pointer ${
                      selectedRayon === r.id
                        ? 'bg-brand-600 text-white shadow-2xs'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kanan: Mode Switcher & Tombol Keluar */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Mini vs Utuh Selector */}
              <div className="inline-flex p-0.2 bg-neutral-800 rounded">
                <button
                  onClick={() => setEvalMode('mini')}
                  className={`flex items-center gap-0.5 px-1.5 py-0 text-[9px] font-bold rounded transition-all cursor-pointer ${
                    evalMode === 'mini'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-2.5 h-2.5" />
                  <span>Slide</span>
                </button>
                <button
                  onClick={() => setEvalMode('full')}
                  className={`flex items-center gap-0.5 px-1.5 py-0 text-[9px] font-bold rounded transition-all cursor-pointer ${
                    evalMode === 'full'
                      ? 'bg-brand-600 text-white shadow-2xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <TableIcon className="w-2.5 h-2.5" />
                  <span>Lengkap</span>
                </button>
              </div>

              {/* Tombol Tutup Layar Penuh */}
              <button
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-0.5 px-1.5 py-0 text-[9px] font-bold rounded bg-brand-600 hover:bg-brand-700 text-white transition-all cursor-pointer shadow-2xs shrink-0"
              >
                <Minimize2 className="w-2.5 h-2.5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>

          {/* Konten 1 Frame Murni: Landscape (Samping), Portrait/Tab Mode (Atas-Bawah) */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {/* 1. LAYOUT MODE LANDSCAPE: Tabel Kiri (Mini atau Lengkap Geser) + 9 Card Kanan (2-Kolom Pas Sejajar) */}
            <div className="hidden landscape:grid landscape:grid-cols-12 gap-2 items-stretch h-full overflow-hidden">
              {/* Panel Kiri: Tabel Mini / Lengkap dengan scroll horizontal & vertikal */}
              <div className="col-span-8 h-full min-h-0 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-1.5 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 min-h-0 overflow-auto">
                  {evalMode === 'mini' ? (
                    <EvalMiniTable
                      r1Rows={r1Rows}
                      r2Rows={r2Rows}
                      r1Total={r1Total}
                      r2Total={r2Total}
                      cabangTotal={cabangTotal}
                      selectedRayon={selectedRayon}
                      mobileMode={mobileMiniMode}
                      onMobileModeChange={setMobileMiniMode}
                      hideTopBar={true}
                      compact={true}
                      fitHeight={true}
                    />
                  ) : (
                    <EvalFullTable
                      rows={displayedRows}
                      r1Rows={r1Rows}
                      r2Rows={r2Rows}
                      r1Total={r1Total}
                      r2Total={r2Total}
                      cabangTotal={cabangTotal}
                      selectedRayon={selectedRayon}
                      divider={divider}
                      fullscreen={true}
                    />
                  )}
                </div>
                {/* Legend Bawah */}
                <div className="flex items-center gap-1.5 text-[8.5px] text-neutral-500 pt-1 shrink-0 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="w-2 h-2 rounded bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-500 inline-block" />
                  <span><strong className="text-emerald-700 dark:text-emerald-400">Sel hijau</strong> = Performa terbaik unit TKU</span>
                </div>
              </div>

              {/* Panel Kanan: Ringkasan Prestasi 9 Kartu 2-Kolom Pas Sejajar (Sama Seperti Mini) */}
              <div className="col-span-4 h-full min-h-0 bg-neutral-100/90 dark:bg-neutral-900/90 rounded-xl border border-neutral-200/80 dark:border-neutral-800 p-1.5 overflow-hidden">
                <RingkasanPrestasiPanel
                  highlights={highlights}
                  layout="2-col"
                  periodLabel={period.label}
                />
              </div>
            </div>

            {/* 2. LAYOUT MODE PORTRAIT / TAB MODE: Tabel di Atas, 9 Card Rapi di Bawah */}
            <div className="flex landscape:hidden flex-col gap-2.5 h-full overflow-y-auto pr-0.5">
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-2">
                {evalMode === 'mini' ? (
                  <EvalMiniTable
                    r1Rows={r1Rows}
                    r2Rows={r2Rows}
                    r1Total={r1Total}
                    r2Total={r2Total}
                    cabangTotal={cabangTotal}
                    selectedRayon={selectedRayon}
                    mobileMode={mobileMiniMode}
                    onMobileModeChange={setMobileMiniMode}
                    hideTopBar={true}
                    compact={true}
                  />
                ) : (
                  <EvalFullTable
                    rows={displayedRows}
                    r1Rows={r1Rows}
                    r2Rows={r2Rows}
                    r1Total={r1Total}
                    r2Total={r2Total}
                    cabangTotal={cabangTotal}
                    selectedRayon={selectedRayon}
                    divider={divider}
                    fullscreen={true}
                  />
                )}
                <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 pt-1.5 shrink-0 border-t border-neutral-100 dark:border-neutral-800 mt-1">
                  <span className="w-2 h-2 rounded bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-500 inline-block" />
                  <span><strong className="text-emerald-700 dark:text-emerald-400">Sel hijau</strong> = Performa terbaik unit TKU</span>
                </div>
              </div>

              <div className="bg-neutral-100/90 dark:bg-neutral-900/90 rounded-xl border border-neutral-200/80 dark:border-neutral-800 p-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Bookmark className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                    RINGKASAN PRESTASI
                  </h3>
                </div>
                <RingkasanPrestasiPanel highlights={highlights} layout="row" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
