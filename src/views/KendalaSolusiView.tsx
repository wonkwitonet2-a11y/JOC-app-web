import React from 'react';
import { StickyNote } from 'lucide-react';
import { AppState, WeeklyNote } from '../types';
import { KendalaLogCard } from '../components/KendalaLogCard';
import { KendalaLogPanel } from '../components/KendalaLogPanel';

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
  <div className="p-3 sm:p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
    <div className="min-w-0">
      <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
        <StickyNote className="w-5 h-5 text-brand-600 shrink-0" />
        <span>Kendala &amp; Solusi</span>
      </h1>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>
    </div>
  </div>
);

// Menu "Kendala & Solusi": TKU menulis alasan/kendala + solusi tiap minggu, admin membaca dan menanggapi.
export const KendalaSolusiView: React.FC<Props> = ({ state, mode, onSaveNote, onSaveReply, onUpdateRayon, showToast }) => {
  if (mode === 'tku') {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <PageHeader subtitle="Catat masalah kapan saja: topik, area, kenapa, tindakan, dan hasilnya. Admin membaca catatan ini saat evaluasi." />
        <KendalaLogCard
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
            className={`px-3 h-9 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              state.selectedRayon === r.id
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <KendalaLogPanel
        state={state}
        selectedRayon={state.selectedRayon}
        onSaveReply={onSaveReply}
        showToast={showToast}
      />
    </div>
  );
};
