import React from 'react';
import { StickyNote } from 'lucide-react';
import { AppState, WeeklyNote } from '../types';
import { CatatanMingguanCard } from '../components/CatatanMingguanCard';
import { CatatanMingguanPanel } from '../components/CatatanMingguanPanel';

interface Props {
  state: AppState;
  mode: 'tku' | 'admin';
  onSaveNote: (key: string, note: WeeklyNote) => void;
  onSaveReply: (key: string, text: string) => void;
  onUpdateRayon: (rayon: number) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const RAYON_TABS = [
  { id: 0, label: 'Cabang' },
  { id: 1, label: 'Rayon 1' },
  { id: 2, label: 'Rayon 2' }
];

const PageHeader: React.FC<{ subtitle: string }> = ({ subtitle }) => (
  <div className="p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
    <div className="flex items-center gap-3 min-w-0">
      <span className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 shrink-0">
        <StickyNote className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Kendala &amp; Solusi
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
      </div>
    </div>
  </div>
);

// Menu "Kendala & Solusi": TKU menulis alasan/kendala + solusi tiap minggu, admin membaca dan menanggapi.
export const KendalaSolusiView: React.FC<Props> = ({ state, mode, onSaveNote, onSaveReply, onUpdateRayon, showToast }) => {
  if (mode === 'tku') {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <PageHeader subtitle="Tulis kendala minggu ini dan rencana solusinya. Admin membaca catatan ini saat evaluasi." />
        <CatatanMingguanCard
          state={state}
          tkuIdx={state.activeTkuId}
          onSaveNote={onSaveNote}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <PageHeader subtitle="Baca kendala & solusi dari TKU, lalu beri tanggapan per rayon." />
      <div className="inline-flex max-w-full overflow-x-auto p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
        {RAYON_TABS.map(r => (
          <button
            key={r.id}
            onClick={() => onUpdateRayon(r.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              state.selectedRayon === r.id
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <CatatanMingguanPanel
        state={state}
        selectedRayon={state.selectedRayon}
        onSaveReply={onSaveReply}
        showToast={showToast}
      />
    </div>
  );
};
