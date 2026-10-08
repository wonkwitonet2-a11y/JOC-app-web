import React, { useState, useCallback } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
}

export const ConfirmDialog: React.FC<{
  isOpen: boolean;
  options: ConfirmOptions | null;
  onClose: () => void;
}> = ({ isOpen, options, onClose }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !options) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await options.onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const isDanger = options.tone === 'danger';
  const isWarning = options.tone === 'warning';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm p-5 space-y-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isDanger
                ? 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                : isWarning
                ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                : 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
            }`}
          >
            {isDanger || isWarning ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <HelpCircle className="w-5 h-5" />
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
              {options.title}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-line">
              {options.message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            {options.cancelLabel || 'Batal'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className={`px-4 py-2 text-xs font-bold rounded-xl text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}
          >
            {loading ? 'Memproses...' : options.confirmLabel || 'Ya, Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);

  const ask = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setOpts(null);
  }, []);

  const dialog = <ConfirmDialog isOpen={open} options={opts} onClose={close} />;

  return { ask, dialog };
}
