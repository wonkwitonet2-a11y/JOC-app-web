import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PackageSearch,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Clock,
  ChevronLeft,
  ChevronDown,
  Pencil,
  AlertTriangle,
  Info
} from 'lucide-react';
import { AppState, SisaStockRecord, StockBatch, StockGroup, VARIANTS } from '../types';
import { formatNumber, getTodayDateString } from '../services/storage';
import {
  STOCK_GROUPS,
  countByLevel,
  emptyBatches,
  expLabel,
  expLevel,
  formatExpShort,
  formatUpdatedAt,
  groupTotal,
  nearestExp,
  normalizeBatches,
  recordTotal,
  sortBatches
} from '../services/stock';
import { useConfirm } from '../components/ConfirmDialog';

interface SisaStockViewProps {
  state: AppState;
  mode: 'admin' | 'tku';
  onSaveSisaStock: (tkuId: number, record: SisaStockRecord) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// ---------------------------------------------------------------------------
// Gaya kecil yang dipakai bersama
// ---------------------------------------------------------------------------
const LEVEL_CLASS = {
  expired: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  warn: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
} as const;

const groupBadge = (code: StockGroup): { bg: string; text: string } => {
  const v = VARIANTS.find(x => x.code === code);
  if (v) return { bg: v.badgeBg, text: v.badgeText };
  return { bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-700 dark:text-neutral-300' };
};

const inputCls =
  'w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-none';

// ---------------------------------------------------------------------------
// Draft isian (string agar kolom angka bebas dihapus & diketik ulang)
// ---------------------------------------------------------------------------
type DraftRow = { key: string; exp: string; qty: string };
type Draft = Record<StockGroup, DraftRow[]>;

let rowSeq = 0;
const newKey = () => `r${Date.now().toString(36)}${(rowSeq++).toString(36)}`;
const blankRow = (): DraftRow => ({ key: newKey(), exp: '', qty: '' });

function toDraft(rec: SisaStockRecord | undefined): Draft {
  const out = {} as Draft;
  STOCK_GROUPS.forEach(g => {
    const list = sortBatches(rec?.batches?.[g.code] || []);
    out[g.code] = list.length
      ? list.map(b => ({ key: newKey(), exp: b.exp, qty: String(b.qty) }))
      : [blankRow()];
  });
  return out;
}

function draftToBatches(d: Draft): SisaStockRecord['batches'] {
  const out = emptyBatches();
  STOCK_GROUPS.forEach(g => {
    out[g.code] = normalizeBatches(
      d[g.code].map(r => ({ exp: r.exp, qty: Number(r.qty) || 0 } as StockBatch))
    );
  });
  return out;
}

const batchesSig = (b: SisaStockRecord['batches']): string =>
  JSON.stringify(STOCK_GROUPS.map(g => normalizeBatches(b?.[g.code] || [])));

// ---------------------------------------------------------------------------
// Editor satu TKU
// ---------------------------------------------------------------------------
const StockEditor: React.FC<{
  tkuId: number;
  tkuName: string;
  saved: SisaStockRecord | undefined;
  onSave: (record: SisaStockRecord) => void;
  showToast: SisaStockViewProps['showToast'];
}> = ({ tkuName, saved, onSave, showToast }) => {
  const { ask, dialog } = useConfirm();
  const today = getTodayDateString();
  const [draft, setDraft] = useState<Draft>(() => toDraft(saved));

  const draftBatches = useMemo(() => draftToBatches(draft), [draft]);
  const dirty = batchesSig(draftBatches) !== batchesSig(saved?.batches || emptyBatches());

  // Kalau data tersimpan berubah dari luar (mis. hasil sinkron) dan isian belum diubah, ikuti data terbaru.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    if (!dirtyRef.current) setDraft(toDraft(saved));
  }, [saved?.updatedAt]);

  const updateRow = (g: StockGroup, key: string, patch: Partial<DraftRow>) =>
    setDraft(d => ({ ...d, [g]: d[g].map(r => (r.key === key ? { ...r, ...patch } : r)) }));

  const addRow = (g: StockGroup) => setDraft(d => ({ ...d, [g]: [...d[g], blankRow()] }));

  const removeRow = (g: StockGroup, key: string) =>
    setDraft(d => {
      const left = d[g].filter(r => r.key !== key);
      return { ...d, [g]: left.length ? left : [blankRow()] };
    });

  const grandTotal = STOCK_GROUPS.reduce((acc, g) => acc + groupTotal(draftBatches[g.code]), 0);

  const doSave = () => {
    // Jumlah diisi tapi tanggal exp kosong -> tolak, supaya tidak ada stok tanpa exp.
    for (const g of STOCK_GROUPS) {
      const bad = draft[g.code].find(r => (Number(r.qty) || 0) > 0 && !r.exp);
      if (bad) {
        showToast(`${g.code}: ada jumlah yang belum diisi tanggal exp-nya`, 'error');
        return;
      }
    }
    const commit = () => {
      onSave({ updatedAt: new Date().toISOString(), batches: draftBatches });
      showToast(`Sisa stock ${tkuName} diperbarui`, 'success');
    };
    if (grandTotal === 0 && recordTotal(saved) > 0) {
      ask({
        title: 'Kosongkan semua sisa stock?',
        message: 'Semua isian kosong. Data sisa stock sebelumnya akan diganti menjadi kosong (0).',
        tone: 'warning',
        confirmLabel: 'Ya, kosongkan',
        onConfirm: commit
      });
      return;
    }
    commit();
  };

  return (
    <div className="space-y-4">
      {dialog}

      <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Sisa stock</p>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">{tkuName}</h2>
          <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 shrink-0" />
            Terakhir diperbarui: {formatUpdatedAt(saved?.updatedAt || '')}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Total isian</p>
          <p className="text-2xl font-mono font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatNumber(grandTotal)} <span className="text-xs font-semibold text-neutral-500">botol</span>
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900 text-[11px] text-brand-800 dark:text-brand-200 leading-relaxed">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          Isi sesuai kondisi stok terkini. Saat disimpan, data lama <b>diganti</b> dengan isian ini (tidak dijumlahkan).
          Satu varian boleh punya beberapa tanggal exp.
        </span>
      </div>

      {STOCK_GROUPS.map(g => {
        const badge = groupBadge(g.code);
        const total = groupTotal(draftBatches[g.code]);
        return (
          <div
            key={g.code}
            className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${badge.bg} ${badge.text}`}>{g.code === 'LOOSE' ? 'LOOSE' : g.code}</span>
                <span className="text-xs text-neutral-500 truncate">{g.name}</span>
              </div>
              <span className="text-sm font-mono font-bold tabular-nums text-neutral-900 dark:text-neutral-100 shrink-0">
                {formatNumber(total)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_96px_36px] gap-2 px-0.5 text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                <span>Tanggal exp</span>
                <span>Jumlah</span>
                <span />
              </div>
              {draft[g.code].map(r => {
                const q = Number(r.qty) || 0;
                const lv = r.exp && q > 0 ? expLevel(r.exp, today) : null;
                return (
                  <div key={r.key} className="space-y-1">
                    <div className="grid grid-cols-[1fr_96px_36px] gap-2 items-center">
                      <input
                        type="date"
                        value={r.exp}
                        onChange={e => updateRow(g.code, r.key, { exp: e.target.value })}
                        aria-label={`Tanggal exp ${g.code}`}
                        className={`${inputCls} font-mono`}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={r.qty}
                        onChange={e => updateRow(g.code, r.key, { qty: e.target.value.replace(/[^0-9]/g, '') })}
                        aria-label={`Jumlah ${g.code}`}
                        className={`${inputCls} font-mono text-right`}
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(g.code, r.key)}
                        aria-label="Hapus baris"
                        className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {lv && (
                      <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-semibold ${LEVEL_CLASS[lv]}`}>
                        {lv === 'expired' ? 'Kedaluwarsa' : lv === 'warn' ? 'Hampir exp' : 'Aman'} · {expLabel(r.exp, today)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => addRow(g.code)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah tanggal exp
            </button>
          </div>
        );
      })}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDraft(toDraft(saved))}
          disabled={!dirty}
          className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 disabled:opacity-40 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Batalkan
        </button>
        <button
          type="button"
          onClick={doSave}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {dirty ? 'Simpan & Perbarui Stock' : 'Perbarui Stock'}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Rincian exp (dipakai di tabel admin saat baris dibuka)
// ---------------------------------------------------------------------------
const BatchChips: React.FC<{ rec: SisaStockRecord | undefined; today: string }> = ({ rec, today }) => {
  const rows = STOCK_GROUPS.map(g => ({ g, list: sortBatches((rec?.batches?.[g.code] || []).filter(b => b.qty > 0)) })).filter(
    x => x.list.length > 0
  );
  if (rows.length === 0) return <p className="text-xs text-neutral-500">Belum ada data sisa stock.</p>;
  return (
    <div className="space-y-2">
      {rows.map(({ g, list }) => {
        const badge = groupBadge(g.code);
        return (
          <div key={g.code} className="flex items-start gap-2">
            <span className={`mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${badge.bg} ${badge.text}`}>{g.code}</span>
            <div className="flex flex-wrap gap-1.5">
              {list.map(b => (
                <span
                  key={b.exp}
                  className={`px-2 py-0.5 rounded-md border text-[11px] font-mono font-semibold ${LEVEL_CLASS[expLevel(b.exp, today)]}`}
                >
                  {formatExpShort(b.exp)}: {formatNumber(b.qty)}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// View utama
// ---------------------------------------------------------------------------
export const SisaStockView: React.FC<SisaStockViewProps> = ({ state, mode, onSaveSisaStock, showToast }) => {
  const today = getTodayDateString();
  const stock = state.sisaStock || {};

  const [editId, setEditId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  // --- Mode TKU: langsung editor milik akun yang sedang aktif ---
  if (mode === 'tku') {
    const tku = state.tkus[state.activeTkuId] || state.tkus[0];
    if (!tku) return null;
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <StockEditor
          key={tku.id}
          tkuId={tku.id}
          tkuName={tku.nama}
          saved={stock[tku.id]}
          onSave={rec => onSaveSisaStock(tku.id, rec)}
          showToast={showToast}
        />
      </div>
    );
  }

  // --- Mode Admin: editor satu TKU ---
  const editing = editId !== null ? state.tkus.find(t => t.id === editId) : undefined;
  if (editing) {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <button
          type="button"
          onClick={() => setEditId(null)}
          className="flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-brand-600 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Kembali ke rekap
        </button>
        <StockEditor
          key={editing.id}
          tkuId={editing.id}
          tkuName={editing.nama}
          saved={stock[editing.id]}
          onSave={rec => onSaveSisaStock(editing.id, rec)}
          showToast={showToast}
        />
      </div>
    );
  }

  // --- Mode Admin: rekap semua TKU ---
  const tkus = state.tkus.filter(t => t.aktif);
  const rows = tkus.map(t => {
    const rec = stock[t.id];
    return { t, rec, total: recordTotal(rec), near: nearestExp(rec), lv: countByLevel(rec, today) };
  });

  const colTotals = STOCK_GROUPS.map(g => rows.reduce((acc, r) => acc + groupTotal(r.rec?.batches?.[g.code]), 0));
  const grand = colTotals.reduce((a, b) => a + b, 0);
  const sumExpired = rows.reduce((a, r) => a + r.lv.expired, 0);
  // Tanggal exp paling dekat per grup (dari seluruh TKU), beserta TKU mana saja yang memegangnya
  const nearestPerGroup = STOCK_GROUPS.map(g => {
    let exp = '';
    rows.forEach(r => {
      (r.rec?.batches?.[g.code] || []).forEach(b => {
        if (b.exp && Number(b.qty) > 0 && (!exp || b.exp < exp)) exp = b.exp;
      });
    });
    if (!exp) return { g, exp: '', qty: 0, holders: [] as { id: number; nama: string; qty: number }[] };
    const holders = rows
      .map(r => ({
        id: r.t.id,
        nama: r.t.nama,
        qty: (r.rec?.batches?.[g.code] || []).filter(b => b.exp === exp).reduce((x, b) => x + (Number(b.qty) || 0), 0)
      }))
      .filter(h => h.qty > 0)
      .sort((x, y) => y.qty - x.qty);
    return { g, exp, qty: holders.reduce((acc, h) => acc + h.qty, 0), holders };
  });
  const belumIsi = rows.filter(r => !r.rec?.updatedAt).length;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Total Sisa Stock</p>
          <p className="mt-1 text-xl font-mono font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{formatNumber(grand)}</p>
          <p className="text-[10px] text-neutral-500">botol, seluruh TKU</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Sudah Kedaluwarsa</p>
          <p className={`mt-1 text-xl font-mono font-bold tabular-nums ${sumExpired > 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
            {formatNumber(sumExpired)}
          </p>
          <p className="text-[10px] text-neutral-500">botol lewat exp</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Belum Diisi</p>
          <p className={`mt-1 text-xl font-mono font-bold tabular-nums ${belumIsi > 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
            {belumIsi}
          </p>
          <p className="text-[10px] text-neutral-500">dari {rows.length} TKU</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-3">
        <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Exp Terdekat per Varian &amp; TKU yang Memegangnya</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-start">
          {nearestPerGroup.map(({ g, exp, qty, holders }) => {
            const badge = groupBadge(g.code);
            const lv = exp ? expLevel(exp, today) : null;
            return (
              <div
                key={g.code}
                className={`p-2.5 rounded-xl border ${lv ? LEVEL_CLASS[lv] : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-400'}`}
              >
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${badge.bg} ${badge.text}`}>{g.code}</span>
                {exp ? (
                  <>
                    <p className="mt-1.5 text-xs font-mono font-bold">{formatExpShort(exp)}</p>
                    <p className="text-[10px] font-semibold opacity-80">{expLabel(exp, today)}</p>
                    <p className="text-[10px] opacity-80">{formatNumber(qty)} botol</p>
                    <div className="mt-2 pt-2 border-t border-current/20 space-y-1">
                      {holders.map(h => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => setEditId(h.id)}
                          title={`Buka stok ${h.nama}`}
                          className="w-full flex items-center justify-between gap-1 text-left text-[10px] font-semibold hover:underline cursor-pointer"
                        >
                          <span className="truncate">{h.nama}</span>
                          <span className="font-mono tabular-nums shrink-0">{formatNumber(h.qty)}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-1.5 text-xs font-semibold">Belum ada data</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
          <PackageSearch className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Rekap Sisa Stock per TKU</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-[10px] uppercase tracking-wider text-neutral-500">
                <th className="sticky left-0 z-10 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-left font-bold">TKU</th>
                {STOCK_GROUPS.map(g => (
                  <th key={g.code} className="px-2 py-2 text-right font-bold">{g.code}</th>
                ))}
                <th className="px-2 py-2 text-right font-bold">Total</th>
                <th className="px-3 py-2 text-left font-bold">Exp terdekat</th>
                <th className="px-3 py-2 text-left font-bold">Diperbarui</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ t, rec, total, near }) => {
                const open = openId === t.id;
                const lv = near ? expLevel(near.exp, today) : null;
                return (
                  <React.Fragment key={t.id}>
                    <tr className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="sticky left-0 z-10 bg-white dark:bg-neutral-900 px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => setOpenId(open ? null : t.id)}
                          className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-neutral-100 cursor-pointer text-left"
                          aria-expanded={open}
                        >
                          <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                          <span className="whitespace-nowrap">{t.nama}</span>
                          <span className="text-[10px] text-neutral-400">R{t.rayon}</span>
                        </button>
                      </td>
                      {STOCK_GROUPS.map(g => (
                        <td key={g.code} className="px-2 py-2.5 text-right font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
                          {formatNumber(groupTotal(rec?.batches?.[g.code]))}
                        </td>
                      ))}
                      <td className="px-2 py-2.5 text-right font-mono font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                        {formatNumber(total)}
                      </td>
                      <td className="px-3 py-2.5">
                        {near && lv ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold whitespace-nowrap ${LEVEL_CLASS[lv]}`}>
                            {lv === 'expired' && <AlertTriangle className="w-3 h-3" />}
                            {formatExpShort(near.exp)} ({near.group})
                          </span>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-neutral-500 whitespace-nowrap">
                        {rec?.updatedAt ? formatUpdatedAt(rec.updatedAt) : <span className="text-red-600 dark:text-red-400 font-semibold">Belum diisi</span>}
                      </td>
                      <td className="px-2 py-2.5">
                        <button
                          type="button"
                          onClick={() => setEditId(t.id)}
                          aria-label={`Ubah sisa stock ${t.nama}`}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-neutral-50/70 dark:bg-neutral-800/30">
                        <td colSpan={STOCK_GROUPS.length + 5} className="px-4 py-3">
                          <BatchChips rec={rec} today={today} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 font-bold">
                <td className="sticky left-0 z-10 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-neutral-900 dark:text-neutral-100">Cabang</td>
                {colTotals.map((v, i) => (
                  <td key={i} className="px-2 py-2.5 text-right font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                    {formatNumber(v)}
                  </td>
                ))}
                <td className="px-2 py-2.5 text-right font-mono tabular-nums text-neutral-900 dark:text-neutral-100">{formatNumber(grand)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-neutral-500 px-1">
        Ketuk nama TKU untuk melihat rincian tanggal exp, atau ikon pensil untuk memperbarui stoknya.
      </p>
    </div>
  );
};
