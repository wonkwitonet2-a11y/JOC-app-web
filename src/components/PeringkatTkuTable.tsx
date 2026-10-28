import React from 'react';
import { Award } from 'lucide-react';
import {
  BOBOT,
  fmtBobot,
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
  n === null || n === undefined || !isFinite(n) ? '—' : n.toFixed(2).replace('.', ',');
const fmt2 = (n: number) => n.toFixed(2).replace('.', ',');
const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined || !isFinite(n) ? '—' : `${n.toFixed(1).replace('.', ',')}%`;
const fmtNilai = (k: KategoriKey, n: number | null | undefined) =>
  k === 'syl' || k === 'yl300' ? (n === null || n === undefined || !isFinite(n) ? '—' : String(Math.round(n))) : fmtPct(n);

const GREEN = 'text-emerald-600 dark:text-emerald-400';
const AMBER = 'text-amber-600 dark:text-amber-400';
const RED = 'text-red-600 dark:text-red-400';

/** Warna per kategori: indikator capaian (>= 100% hijau), indikator kondisi (rasio poin / bobot) */
function tone(k: KategoriKey, poin: number | null, nilai: number | null): string {
  if (poin === null) return 'text-neutral-600 dark:text-neutral-300';
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
  { k: 'bb', label: '% BB', unit: '%' },
  { k: 'yl300', label: 'YL<300', unit: '' },
];

const Cell: React.FC<{ row: PeringkatRow; k: KategoriKey; border?: boolean }> = ({ row, k, border }) => {
  const c = row.kategori[k];
  return (
    <td className={`py-3 px-3 text-right ${border ? 'border-l border-neutral-200 dark:border-neutral-700' : ''}`}>
      <div className={`font-bold whitespace-nowrap ${tone(k, c.poin, c.nilai)}`}>
        {fmt1(c.poin)}
        {c.poin !== null && <span className="ml-1 text-xs font-normal text-neutral-700 dark:text-neutral-300">poin</span>}
      </div>
      <div className="text-xs text-neutral-700 dark:text-neutral-300 font-medium whitespace-nowrap mt-0.5">{fmtNilai(k, c.nilai)}</div>
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
          className={`px-2.5 py-1 rounded-full font-semibold ${
            sementara
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
          }`}
        >
          {sementara ? `Sementara (tgl ${tanggalUpdate})` : `Resmi (tgl ${tanggalUpdate})`}
        </span>
        <span className="text-neutral-700 dark:text-neutral-300 font-medium">
          Penjualan ({fmtBobot(TOTAL_HASIL)}) = LY ({fmtBobot(BOBOT.yoy)}) + Target ({fmtBobot(BOBOT.target)}) + LM ({fmtBobot(BOBOT.mom)}). Kondisi ({fmtBobot(TOTAL_KONDISI)}) = S/YL ({fmtBobot(BOBOT.syl)}), YL/Area ({fmtBobot(BOBOT.area)}), Frekuensi ({fmtBobot(BOBOT.ewp)}), %YL&lt;250 ({fmtBobot(BOBOT.yl250)}), BB ({fmtBobot(BOBOT.bb)}), YL&lt;300 ({fmtBobot(BOBOT.yl300)}). Maks {TOTAL_BOBOT} + bonus penjualan (sampai 120%).
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <table className="w-full text-left text-sm border-collapse min-w-[1050px]">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs bg-neutral-50 dark:bg-neutral-800/40">
              <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
              <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
              <th className="py-2.5 px-3 text-right font-semibold">Total</th>
              <th className="py-2.5 px-3 text-right font-semibold border-l border-neutral-200 dark:border-neutral-700">
                Skor Penjualan
                <div className="text-xs font-normal text-neutral-700 dark:text-neutral-300 whitespace-nowrap mt-0.5">maks {fmtBobot(TOTAL_HASIL)}+ poin</div>
              </th>
              <th className="py-2.5 px-3 text-right font-semibold">
                Skor Kondisi
                <div className="text-xs font-normal text-neutral-700 dark:text-neutral-300 whitespace-nowrap mt-0.5">maks {fmtBobot(TOTAL_KONDISI)} poin</div>
              </th>
              {HASIL.map((h, i) => (
                <th
                  key={h.k}
                  className={`py-2.5 px-3 text-right font-semibold ${
                    i === 0 ? 'border-l border-neutral-200 dark:border-neutral-700' : ''
                  }`}
                >
                  {h.label}
                  <div className="text-xs font-normal text-neutral-700 dark:text-neutral-300 whitespace-nowrap mt-0.5">maks {fmtBobot(BOBOT[h.k])}+ poin</div>
                </th>
              ))}
              {KONDISI.map((h, i) => (
                <th
                  key={h.k}
                  className={`py-2.5 px-3 text-right font-semibold ${
                    i === 0 ? 'border-l border-neutral-200 dark:border-neutral-700' : ''
                  }`}
                >
                  {h.label}
                  <div className="text-xs font-normal text-neutral-700 dark:text-neutral-300 whitespace-nowrap mt-0.5">maks {fmtBobot(BOBOT[h.k])} poin</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs sm:text-sm">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors ${
                  row.rank === 1 ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''
                }`}
              >
                <td className="py-3 px-3 text-center text-neutral-700 dark:text-neutral-300 font-semibold">
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
                <td className="py-3 px-3 text-right font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                  {fmt2(row.total)}
                </td>
                <td className="py-3 px-3 text-right font-semibold whitespace-nowrap border-l border-neutral-200 dark:border-neutral-700">
                  <span className="font-bold">{fmt1(row.skorHasil)}</span> <span className="text-xs font-normal text-neutral-700 dark:text-neutral-300">poin</span>
                </td>
                <td className="py-3 px-3 text-right font-semibold whitespace-nowrap">
                  <span className="font-bold">{fmt1(row.skorKondisi)}</span> <span className="text-xs font-normal text-neutral-700 dark:text-neutral-300">poin</span>
                </td>
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

      <details className="text-xs text-neutral-700 dark:text-neutral-300 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/50 dark:bg-neutral-800/30">
        <summary className="cursor-pointer font-bold text-neutral-800 dark:text-neutral-200">Keterangan poin per kategori</summary>
        <ul className="mt-2 space-y-2 leading-relaxed">
          <li><b>vs LY ({fmtBobot(BOBOT.yoy)} poin), Target ({fmtBobot(BOBOT.target)} poin), vs LM ({fmtBobot(BOBOT.mom)} poin):</b> proporsional dari 0% sampai 120% tanpa tangga: poin = capaian × bobot (0% = 0; 100% = poin penuh; 120% = 1,2 × poin penuh). Di atas 120% poin tidak bertambah lagi; bila poin sama, yang persen aslinya lebih tinggi di atas.</li>
          <li><b>S/YL ({fmtBobot(BOBOT.syl)} poin):</b> angka desimal dibuang. Di bawah 250 = 0; 250–279 = 1/3; 280–299 = 1/2; 300–329 = 70%; 330–349 = 85%; 350 ke atas = penuh.</li>
          <li><b>YL/Area ({fmtBobot(BOBOT.area)} poin):</b> naik merata dari 80% (1/3 poin) sampai 100% (penuh); 100% ke atas = penuh; di bawah 80% = 0.</li>
          <li><b>Frek/EWP ({fmtBobot(BOBOT.ewp)} poin):</b> 100% = penuh; 99,75 = 13/15; 99,5 = 12/15; 99,25 = 11/15; 99 = 10/15; lalu turun 1/15 tiap 1% sampai 90 = 1/15; di bawah 90 = 0.</li>
          <li><b>%YL&lt;250 ({fmtBobot(BOBOT.yl250)} poin):</b> 0% = penuh, turun merata sampai 30% = 0; 30% ke atas = 0.</li>
          <li><b>BB ({fmtBobot(BOBOT.bb)} poin):</b> 0% (istimewa) = penuh; di atas 0 sampai 5% (wajar) = 3/4; di atas 5 sampai 10% (warning) = 1/4; di atas 10% (tidak wajar) = 0.</li>
          <li><b>YL&lt;300 ({fmtBobot(BOBOT.yl300)} poin):</b> tidak ada YL di bawah 300 = penuh; ada satu saja = 0.</li>
        </ul>
      </details>

      {rows.some((r) => r.dinormalisasi) && (
        <p className="text-xs text-neutral-700 dark:text-neutral-300">
          * Skor dinormalisasi karena ada indikator tanpa data pembanding (misal data tahun lalu belum ada).
        </p>
      )}
    </div>
  );
};
