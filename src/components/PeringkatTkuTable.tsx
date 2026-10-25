import React from 'react';
import { Award } from 'lucide-react';
import {
  BOBOT,
  TOTAL_BOBOT,
  TOTAL_HASIL,
  TOTAL_KONDISI,
  KategoriKey,
  PeringkatHasil,
  PeringkatRow,
} from '../services/peringkat';

interface Props {
  data: PeringkatHasil;
  tanggalUpdate: number;
}

const fmt1 = (n: number | null | undefined) =>
  n === null || n === undefined || !isFinite(n) ? '—' : n.toFixed(1).replace('.', ',');
const fmt2 = (n: number) => n.toFixed(2).replace('.', ',');
const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined || !isFinite(n) ? '—' : `${n.toFixed(1).replace('.', ',')}%`;
const fmtNilai = (k: KategoriKey, n: number | null | undefined) =>
  k === 'syl' ? (n === null || n === undefined || !isFinite(n) ? '—' : String(Math.round(n))) : fmtPct(n);

const GREEN = 'text-emerald-600 dark:text-emerald-400';
const AMBER = 'text-amber-600 dark:text-amber-400';
const RED = 'text-red-600 dark:text-red-400';

/** Warna per kategori: indikator capaian (>= 100% hijau), indikator kondisi (rasio poin / bobot) */
function tone(k: KategoriKey, poin: number | null, nilai: number | null): string {
  if (poin === null) return 'text-neutral-400';
  if (k === 'target' || k === 'yoy' || k === 'mom') return nilai !== null && nilai >= 100 ? GREEN : RED;
  if (k === 'area') return nilai !== null && nilai >= 100 ? GREEN : nilai !== null && nilai >= 80 ? AMBER : RED;
  const r = poin / BOBOT[k];
  return r >= 0.75 ? GREEN : r >= 0.4 ? AMBER : RED;
}

const HASIL: { k: KategoriKey; label: string; unit: string }[] = [
  { k: 'yoy', label: 'vs LY', unit: '%' },
  { k: 'target', label: 'Target', unit: '%' },
  { k: 'mom', label: 'vs LM', unit: '%' },
];
const KONDISI: { k: KategoriKey; label: string; unit: string }[] = [
  { k: 'syl', label: 'S/YL', unit: '' },
  { k: 'area', label: 'YL/Area', unit: '%' },
  { k: 'ewp', label: 'Frek (EWP)', unit: '%' },
  { k: 'yl250', label: '%YL<250', unit: '%' },
  { k: 'absen', label: 'Absen', unit: '%' },
  { k: 'bb', label: '% BB', unit: '%' },
];

const Cell: React.FC<{ row: PeringkatRow; k: KategoriKey; border?: boolean }> = ({ row, k, border }) => {
  const c = row.kategori[k];
  return (
    <td className={`py-3 px-2.5 text-right ${border ? 'border-l border-neutral-200 dark:border-neutral-700' : ''}`}>
      <div className={`font-bold ${tone(k, c.poin, c.nilai)}`}>{fmt1(c.poin)}</div>
      <div className="text-[10px] text-neutral-400 font-normal">{fmtNilai(k, c.nilai)}</div>
    </td>
  );
};

export const PeringkatTkuTable: React.FC<Props> = ({ data, tanggalUpdate }) => {
  const { rows, status } = data;
  const sementara = status === 'SEMENTARA';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`px-2 py-0.5 rounded-full font-semibold ${
            sementara
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
          }`}
        >
          {sementara ? `Sementara (tgl ${tanggalUpdate})` : `Resmi (tgl ${tanggalUpdate})`}
        </span>
        <span className="text-neutral-500">
          Penjualan ({TOTAL_HASIL}) = LY ({BOBOT.yoy}) + Target ({BOBOT.target}) + LM ({BOBOT.mom}). Kondisi ({TOTAL_KONDISI}) = S/YL ({BOBOT.syl}), YL/Area ({BOBOT.area}), Frekuensi ({BOBOT.ewp}), %YL&lt;250 ({BOBOT.yl250}), Absen ({BOBOT.absen}), BB ({BOBOT.bb}). Maks {TOTAL_BOBOT} + bonus.
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[1050px]">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
              <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
              <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
              <th className="py-2.5 px-3 text-right font-semibold">Total</th>
              <th className="py-2.5 px-2.5 text-right font-semibold border-l border-neutral-200 dark:border-neutral-700">
                Skor Penjualan
              </th>
              <th className="py-2.5 px-2.5 text-right font-semibold">Skor Kondisi</th>
              {HASIL.map((h, i) => (
                <th
                  key={h.k}
                  className={`py-2.5 px-2.5 text-right font-semibold ${
                    i === 0 ? 'border-l border-neutral-200 dark:border-neutral-700' : ''
                  }`}
                >
                  {h.label}
                  <div className="text-[10px] font-normal text-neutral-400">maks {BOBOT[h.k]}+</div>
                </th>
              ))}
              {KONDISI.map((h, i) => (
                <th
                  key={h.k}
                  className={`py-2.5 px-2.5 text-right font-semibold ${
                    i === 0 ? 'border-l border-neutral-200 dark:border-neutral-700' : ''
                  }`}
                >
                  {h.label}
                  <div className="text-[10px] font-normal text-neutral-400">maks {BOBOT[h.k]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors ${
                  row.rank === 1 ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''
                }`}
              >
                <td className="py-3 px-3 text-center text-neutral-500">
                  {row.rank === 1 ? <Award className="w-4 h-4 text-amber-500 inline" /> : row.rank}
                </td>
                <td className="py-3 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                  {row.nama}
                  {row.dinormalisasi && (
                    <span
                      className="ml-1 text-amber-600 dark:text-amber-400"
                      title="Ada indikator tanpa data pembanding, skor dinormalisasi ke skala 100"
                    >
                      *
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-right font-bold text-sm text-brand-600 dark:text-brand-400">
                  {fmt2(row.total)}
                </td>
                <td className="py-3 px-2.5 text-right font-semibold border-l border-neutral-200 dark:border-neutral-700">
                  {fmt1(row.skorHasil)}
                </td>
                <td className="py-3 px-2.5 text-right font-semibold">{fmt1(row.skorKondisi)}</td>
                {HASIL.map((h, i) => (
                  <Cell key={h.k} row={row} k={h.k} border={i === 0} />
                ))}
                {KONDISI.map((h, i) => (
                  <Cell key={h.k} row={row} k={h.k} border={i === 0} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.some((r) => r.dinormalisasi) && (
        <p className="text-[11px] text-neutral-500">
          * Skor dinormalisasi karena ada indikator tanpa data pembanding (misal data tahun lalu belum ada).
        </p>
      )}
    </div>
  );
};
