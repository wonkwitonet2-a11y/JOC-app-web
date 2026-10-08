import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface FullscreenPanelProps {
  title: string;
  onClose: () => void;
  /** Tombol/kontrol tambahan di header (mis. filter rayon). */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Layar penuh berbasis CSS (bukan Fullscreen API) supaya jalan di APK/webview/iframe.
// Header tetap di atas, isi mengisi sisa layar. Tombol Esc dan tombol Tutup menutupnya.
export const FullscreenPanel: React.FC<FullscreenPanelProps> = ({ title, onClose, actions, children }) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <h2 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate min-w-0">{title}</h2>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 text-white cursor-pointer"
            aria-label="Tutup layar penuh"
          >
            <X className="w-3.5 h-3.5" />
            <span>Tutup</span>
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-2">{children}</div>
    </div>
  );
};
