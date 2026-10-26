import React from 'react';
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

// Menu "Kendala & Solusi": TKU menulis alasan/kendala + solusi tiap minggu, admin membaca dan menanggapi.
export const KendalaSolusiView: React.FC<Props> = ({ state, mode, onSaveNote, onSaveReply, onUpdateRayon, showToast }) => {
  if (mode === 'tku') {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Tulis kendala yang terjadi minggu ini dan rencana solusinya. Admin membaca catatan ini saat evaluasi.
        </p>
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
      <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
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
