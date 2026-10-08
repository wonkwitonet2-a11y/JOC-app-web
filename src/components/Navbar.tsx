import React from 'react';
import { LogOut, Moon, Sun, Download, PanelLeft, Cloud, RefreshCw, UserCheck } from 'lucide-react';
import { AppState } from '../types';
import { getPeriodInfo } from '../services/storage';

interface NavbarProps {
  state: AppState;
  onLogout: () => void;
  onToggleTheme: () => void;
  onExport: () => void;
  onSelectMenu: (menu: string) => void;
  onToggleDrawer: () => void;
  isSyncing?: boolean;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  onManualSync?: () => void;
  onSwitchToTku?: (tkuIdx: number) => void;
  onSwitchToAdmin?: () => void;
}

const iconBtn =
  'p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors cursor-pointer';

export const Navbar: React.FC<NavbarProps> = ({ 
  state, 
  onLogout, 
  onToggleTheme, 
  onExport, 
  onSelectMenu, 
  onToggleDrawer,
  isSyncing = false,
  syncStatus = 'idle',
  onManualSync,
  onSwitchToTku,
  onSwitchToAdmin
}) => {
  const currentTku = state.role === 't' ? state.tkus[state.activeTkuId] : null;
  const title = state.role === 'a' ? state.currentMenu : currentTku?.nama || 'Center';
  const subtitle = state.role === 'a'
    ? `Cabang Jember \u2022 ${getPeriodInfo(state).label}`
    : `Rayon ${currentTku?.rayon} \u2022 ${getPeriodInfo(state).label}`;

  const hasSb = Boolean(state.supabaseConfig?.u && state.supabaseConfig?.k);

  const handleSelectChange = (val: string) => {
    if (val === 'admin') {
      if (onSwitchToAdmin) onSwitchToAdmin();
    } else {
      if (onSwitchToTku) onSwitchToTku(Number(val));
    }
  };

  const currentSelectValue = state.role === 'a' ? 'admin' : String(state.activeTkuId);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between h-14 px-3 md:px-5">
        <div className="flex items-center gap-2 min-w-0">
          {Boolean(state.role) && (
            <button
              onClick={onToggleDrawer}
              aria-label="Tampilkan atau sembunyikan menu samping"
              title="Tampilkan / Sembunyikan menu samping"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition-colors border border-neutral-200 dark:border-neutral-700 shadow-2xs cursor-pointer"
            >
              <PanelLeft className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span className="hidden lg:inline">Menu</span>
            </button>
          )}

          <button
            onClick={() => state.role === 'a' && onSelectMenu('Dashboard')}
            aria-label="Ke Dashboard"
            className="flex items-center justify-center w-9 h-9 shrink-0 rounded-xl overflow-hidden cursor-pointer"
          >
            <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="JOC" className="w-9 h-9" />
          </button>

          <div className="min-w-0 leading-tight">
            <h1 className="text-[15px] font-bold text-neutral-900 dark:text-neutral-100 truncate">{title}</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {(onSwitchToTku || onSwitchToAdmin) && (
            <select
              value={currentSelectValue}
              onChange={(e) => handleSelectChange(e.target.value)}
              aria-label="Pilih Akun atau Unit TKU"
              className="text-xs font-bold py-1 px-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer hidden sm:inline-block max-w-[140px] md:max-w-[180px] truncate shadow-2xs hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <option value="admin">⭐ Mode Admin</option>
              {state.tkus.map((t, idx) => (
                <option key={idx} value={idx}>
                  {t.nama} (R{t.rayon})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={onManualSync}
            disabled={isSyncing}
            aria-label="Sinkronisasi dan rekonsiliasi data"
            title={
              isSyncing
                ? 'Sedang menyinkronkan data...'
                : hasSb
                ? (syncStatus === 'error' ? 'Gagal sinkron ke Cloud (Klik untuk coba lagi)' : 'Cloud Aktif (Klik untuk sinkronkan data)')
                : 'Klik untuk sinkronkan & rekonsiliasi data sistem'
            }
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isSyncing
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                : syncStatus === 'error'
                ? 'text-red-600 bg-red-50 dark:bg-red-950/40'
                : hasSb
                ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            {isSyncing ? (
              <RefreshCw className="w-[18px] h-[18px] animate-spin" />
            ) : hasSb ? (
              <Cloud className="w-[18px] h-[18px]" />
            ) : (
              <RefreshCw className="w-[18px] h-[18px]" />
            )}
          </button>

          {state.role === 'a' && (
            <button onClick={onExport} aria-label="Unduh cadangan data" title="Unduh cadangan data" className={iconBtn}>
              <Download className="w-[18px] h-[18px]" />
            </button>
          )}

          <button onClick={onToggleTheme} aria-label="Ganti tema" className={iconBtn}>
            {state.theme === 'dark' ? <Sun className="w-[18px] h-[18px] text-amber-400" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>

          <button onClick={onLogout} aria-label="Keluar" title="Keluar" className={`${iconBtn} hover:!text-red-600`}>
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* Baris Dropdown Pilih Akun / TKU Khusus HP (Poin 1: muncul penuh di bawah header di semua menu) */}
      {(onSwitchToTku || onSwitchToAdmin) && (
        <div className="sm:hidden px-3 py-1.5 bg-neutral-50 dark:bg-neutral-950/60 border-t border-neutral-200/70 dark:border-neutral-800/70 flex items-center gap-2">
          <UserCheck className="w-3.5 h-3.5 text-brand-600 shrink-0" />
          <span className="text-[11px] font-semibold text-neutral-500 shrink-0">Pilih:</span>
          <select
            value={currentSelectValue}
            onChange={(e) => handleSelectChange(e.target.value)}
            aria-label="Pilih Akun atau Unit TKU di HP"
            className="flex-1 py-1 px-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-900 dark:text-neutral-100 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-none cursor-pointer"
          >
            <option value="admin">⭐ Mode Admin Cabang</option>
            {state.tkus.map((t, idx) => (
              <option key={idx} value={idx}>
                {t.nama} (Rayon {t.rayon})
              </option>
            ))}
          </select>
        </div>
      )}
    </header>
  );
};
