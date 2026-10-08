import React from 'react';
import { Calendar, SlidersHorizontal } from 'lucide-react';
import { AppState } from '../types';
import { getPembagiHari, getDaysInActiveMonth } from '../services/storage';

// Pembagi hari TANPA cut-off. Komponen ini hanya menampilkan info (tidak ada pilihan lagi):
// pembagi = tanggal berjalan (hari ini ikut dihitung walau datanya belum disimpan),
// dan berhenti di tanggal terakhir bulan kerja jika kalender sudah melewati bulan tersebut.
interface PembagiHariControlProps {
  state: AppState;
  // Dipertahankan agar pemanggil lama tidak error; tidak dipakai lagi.
  onUpdatePembagiHari?: () => void;
  onUpdateActiveDay?: (day: number) => void;
  variant?: 'banner' | 'compact' | 'table-header';
}

export const PembagiHariControl: React.FC<PembagiHariControlProps> = ({
  state,
  variant = 'banner'
}) => {
  const pembagi = getPembagiHari(state);
  const hariBulan = getDaysInActiveMonth(state);
  const penuh = pembagi >= hariBulan;

  if (variant === 'compact' || variant === 'table-header') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800/90 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">
        <Calendar className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
        <span className="text-neutral-600 dark:text-neutral-400 font-medium">Pembagi:</span>
        <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{pembagi} hari</span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-r from-brand-50/70 via-neutral-50 to-amber-50/50 dark:from-brand-950/20 dark:via-neutral-900 dark:to-amber-950/20 rounded-2xl border border-brand-200/70 dark:border-brand-900/40 shadow-xs">
      <div className="flex items-start gap-2">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-brand-600 text-white shadow-xs shrink-0">
          <SlidersHorizontal className="w-4 h-4" />
        </span>
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Pembagi Hari
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              {pembagi} dari {hariBulan} hari
            </span>
          </h2>
          <p className="text-xs text-neutral-500">
            Rata2 = Akumulasi &divide; {pembagi} hari
          </p>
        </div>
      </div>
    </div>
  );
};
