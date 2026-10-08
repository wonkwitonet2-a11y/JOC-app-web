import React from 'react';
import {
  BarChart3,
  CalendarCheck,
  TrendingUp,
  Target,
  Users,
  Archive,
  Settings,
  GitCompare,
  LayoutGrid,
  ShieldCheck,
  Building2,
  X
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
}

interface SidebarProps {
  role?: 'a' | 't';
  currentMenu: string;
  onSelectMenu: (menu: string) => void;
  tkusCount: number;
  activeTkuName?: string;
  activeTkuRayon?: number;
  // Drawer "Lainnya" di HP (dibuka dari menu bawah)
  isOpen: boolean;
  onClose: () => void;
  onOpenDrawer: () => void;
  // Sidebar tablet/desktop bisa disembunyikan
  collapsed: boolean;
  onCollapse: () => void;
  onSwitchToAdmin?: () => void;
}

export const ADMIN_MENUS: MenuItem[] = [
  { id: "Dashboard", label: "Dashboard", short: "Dashboard", icon: BarChart3, group: "Pantau" },
  { id: "Penjualan Harian", label: "Penjualan Harian", short: "Harian", icon: CalendarCheck, group: "Pantau" },
  { id: "Evaluasi", label: "Evaluasi", short: "Evaluasi", icon: TrendingUp, group: "Pantau" },
  { id: "Breakdown & Realisasi", label: "Breakdown & Realisasi", short: "Breakdown & Realisasi", icon: GitCompare, group: "Pantau" },
  { id: "Target", label: "Target", short: "Target", icon: Target, group: "Kelola" },
  { id: "Profil TKU", label: "Profil TKU", short: "Profil", icon: Users, group: "Kelola" },
  { id: "Arsip", label: "Arsip", short: "Arsip", icon: Archive, group: "Kelola" },
  { id: "Pengaturan", label: "Pengaturan", short: "Pengaturan", icon: Settings, group: "Kelola" },
];

export const TKU_MENUS: MenuItem[] = [
  { id: "ringkasan", label: "Ringkasan", short: "Ringkasan", icon: BarChart3, group: "Menu Utama TKU" },
  { id: "input", label: "Penjualan", short: "Penjualan", icon: CalendarCheck, group: "Menu Utama TKU" },
  { id: "breakdown", label: "Breakdown", short: "Breakdown", icon: Target, group: "Menu Utama TKU" },
  { id: "realisasi", label: "Realisasi", short: "Realisasi", icon: GitCompare, group: "Menu Utama TKU" },
];

// Backwards-compatible export
export const MENUS = ADMIN_MENUS;

const ADMIN_BOTTOM_IDS = ["Dashboard", "Penjualan Harian", "Evaluasi", "Breakdown & Realisasi"];
const TKU_BOTTOM_IDS = ["ringkasan", "input", "breakdown", "realisasi"];

const NavList: React.FC<{
  menus: MenuItem[];
  currentMenu: string;
  onPick: (id: string) => void;
  role?: 'a' | 't';
  onSwitchToAdmin?: () => void;
}> = ({ menus, currentMenu, onPick }) => {
  const groups = Array.from(new Set(menus.map(m => m.group)));

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {groups.map(group => (
        <div key={group}>
          <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {group}
          </p>
          <div className="space-y-0.5">
            {menus.filter(m => m.group === group).map(item => {
              const Icon = item.icon;
              const active = currentMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onPick(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors ${
                    active
                      ? 'bg-brand-50 text-brand-700 font-semibold dark:bg-brand-950/40 dark:text-brand-300'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/70 dark:hover:text-neutral-100'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  role = 'a',
  currentMenu,
  onSelectMenu,
  tkusCount,
  activeTkuName,
  activeTkuRayon,
  isOpen,
  onClose,
  onOpenDrawer,
  collapsed,
  onCollapse,
  onSwitchToAdmin
}) => {
  const isTku = role === 't';
  const menus = isTku ? TKU_MENUS : ADMIN_MENUS;
  const bottomIds = isTku ? TKU_BOTTOM_IDS : ADMIN_BOTTOM_IDS;
  const inMore = !bottomIds.includes(currentMenu);

  return (
    <>
      {/* Tablet/desktop: sidebar kiri (bisa ditutup dengan tombol X agar layar lebih besar) */}
      <aside className={`${collapsed ? 'hidden' : 'hidden md:flex'} flex-col w-60 shrink-0 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 h-[calc(100vh-3.5rem)] sticky top-14 transition-all shadow-xs z-20`}>
        {/* Header Sidebar dengan tombol Tutup (X) yang jelas untuk mode tablet/desktop */}
        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {isTku ? (
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="w-4 h-4 text-brand-600 shrink-0" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                  {activeTkuName ? `${activeTkuName} (R${activeTkuRayon || 1})` : 'Menu TKU'}
                </span>
              </div>
            ) : (
              <>
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Navigasi</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400 font-semibold">{tkusCount} Unit</span>
              </>
            )}
          </div>
          {/* Tombol Tutup (X) agar layar konten terlihat lebih besar di tablet */}
          <button
            onClick={onCollapse}
            aria-label="Tutup menu samping"
            title="Tutup menu (Lebarkan tampilan layar)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-brand-50 dark:bg-neutral-800 dark:hover:bg-brand-950/50 text-neutral-600 hover:text-brand-600 dark:text-neutral-300 dark:hover:text-brand-400 transition-colors border border-neutral-200 dark:border-neutral-700 shadow-2xs shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span className="text-[11px]">Tutup</span>
          </button>
        </div>

        <NavList
          menus={menus}
          currentMenu={currentMenu}
          onPick={onSelectMenu}
          role={role}
          onSwitchToAdmin={onSwitchToAdmin}
        />

        {/* Footer Sidebar dengan tombol alternatif tutup */}
        <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>{isTku ? 'Akun Operator' : `${tkusCount} unit aktif`}</span>
          <button
            onClick={onCollapse}
            title="Tutup menu (Lebarkan tampilan layar)"
            className="flex items-center gap-1 text-neutral-500 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-400 transition-colors font-medium"
          >
            <X className="w-3.5 h-3.5" />
            <span>Tutup Menu</span>
          </button>
        </div>
      </aside>

      {/* HP: menu navigasi bawah */}
      <nav
        aria-label="Menu utama"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-t border-neutral-200 dark:border-neutral-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className={`grid ${isTku ? 'grid-cols-4' : 'grid-cols-5'} h-16`}>
          {bottomIds.map(id => {
            const item = menus.find(m => m.id === id);
            if (!item) return null;
            const Icon = item.icon;
            const active = currentMenu === id;
            return (
              <button
                key={id}
                onClick={() => onSelectMenu(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-w-0 px-1 text-[11px] leading-none font-medium transition-colors ${
                  active ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                <span className={`px-3.5 py-1 rounded-full transition-colors ${active ? 'bg-brand-50 dark:bg-brand-950/50' : ''}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="max-w-full truncate">{item.short}</span>
              </button>
            );
          })}

          {!isTku && (
            <button
              onClick={onOpenDrawer}
              className={`flex flex-col items-center justify-center gap-1 min-w-0 px-1 text-[11px] leading-none font-medium transition-colors ${
                inMore ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              <span className={`px-3.5 py-1 rounded-full transition-colors ${inMore ? 'bg-brand-50 dark:bg-brand-950/50' : ''}`}>
                <LayoutGrid className="w-5 h-5" />
              </span>
              Lainnya
            </button>
          )}
        </div>
      </nav>

      {/* HP: drawer menu lengkap dari bawah (khusus admin saat tombol Lainnya ditekan) */}
      {!isTku && (
        <>
          <div
            onClick={onClose}
            aria-hidden="true"
            className={`md:hidden fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Semua menu"
            className={`md:hidden fixed bottom-0 inset-x-0 z-50 max-h-[85%] bg-white dark:bg-neutral-900 rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-200 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Semua Menu Admin</h2>
              <button onClick={onClose} aria-label="Tutup menu" className="p-2 -mr-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavList
              menus={menus}
              currentMenu={currentMenu}
              onPick={(id) => { onSelectMenu(id); onClose(); }}
              role={role}
            />
          </aside>
        </>
      )}
    </>
  );
};
