import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Database, 
  ArrowRight,
  Lock
} from 'lucide-react';
import { AppState, TkuItem, SupabaseConfig } from '../types';

interface LoginViewProps {
  tkus: TkuItem[];
  supabaseConfig: SupabaseConfig;
  onLogin: (role: 'a' | 't', tkuId: number) => void;
  onUpdateSupabase: (u: string, k: string, locked?: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  tkus,
  supabaseConfig,
  onLogin,
  onUpdateSupabase,
  showToast
}) => {
  const [role, setRole] = useState<'a' | 't'>('a');
  const [selectedTku, setSelectedTku] = useState<number>(0);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [sbUrl, setSbUrl] = useState<string>(supabaseConfig.u || '');
  const [sbKey, setSbKey] = useState<string>(supabaseConfig.k || '');

  useEffect(() => {
    if (supabaseConfig?.u !== undefined) {
      setSbUrl(supabaseConfig.u);
    }
    if (supabaseConfig?.k !== undefined) {
      setSbKey(supabaseConfig.k);
    }
  }, [supabaseConfig?.u, supabaseConfig?.k]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'a') {
      showToast('Berhasil masuk sebagai Admin Cabang!', 'success');
      onLogin('a', 0);
    } else {
      const tku = tkus[selectedTku];
      if (!tku) {
        showToast('Pilih TKU terlebih dahulu.', 'error');
        return;
      }
      showToast(`Berhasil masuk sebagai ${tku.nama}!`, 'success');
      onLogin('t', selectedTku);
    }
  };

  const handleSaveSbConfig = () => {
    onUpdateSupabase(sbUrl.trim(), sbKey.trim());
    showToast('Konfigurasi Supabase disimpan ke memori lokal.', 'success');
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex flex-col justify-center items-center px-4 py-8">
      {/* Container Box */}
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden">
        {/* Header Accent */}
        <div className="bg-gradient-to-r from-brand-800 via-brand-900 to-brand-950 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <img src={`${import.meta.env.BASE_URL}icon-putih.svg`} alt="Logo JOC" className="inline-block w-14 h-14 rounded-2xl shadow-md mb-3" />
          <h1 className="text-xl font-bold tracking-tight">JOC</h1>
          <p className="text-xs text-brand-100 mt-1 font-medium">
            Jember Operation Center
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Role Segmented Tabs */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
              Pilih Peran Akun
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
              <button
                type="button"
                onClick={() => { setRole('a'); }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  role === 'a'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>Admin Cabang</span>
              </button>
              <button
                type="button"
                onClick={() => { setRole('t'); }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  role === 't'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>Akun TKU</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {role === 't' && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Pilih TKU
                </label>
                <select
                  value={selectedTku}
                  onChange={(e) => setSelectedTku(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                >
                  {tkus.map((t, idx) => (
                    <option key={t.id || idx} value={idx}>
                      {t.nama} (Rayon {t.rayon}){!t.aktif ? ' — Nonaktif' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-brand-600/25 transition-all"
            >
              <span>Masuk</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Supabase Connection Accordion */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="w-full flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 py-1 transition-colors"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Database className="w-3.5 h-3.5 text-neutral-400" />
                Penyimpanan Eksternal Supabase (Opsional)
              </span>
              <span className="text-[11px] font-semibold">{showConfig ? 'Tutup' : 'Buka'}</span>
            </button>

            {showConfig && (
              <div className="mt-3 p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-3 text-xs border border-neutral-200 dark:border-neutral-700/60 animate-in fade-in">
                {supabaseConfig.locked ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Database Supabase Terkoneksi & Terkunci</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        Kredensial database cloud telah dikunci oleh Admin untuk keamanan. Untuk mengubahnya, silakan masuk ke akun Admin &gt; Menu Pengaturan.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                      Sistem bekerja offline/lokal secara otomatis. Jika memiliki database Supabase, Anda dapat menghubungkannya di sini.
                    </p>
                    <div>
                      <label className="block text-[11px] text-neutral-600 dark:text-neutral-300 mb-1">
                        Project URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://xyzcompany.supabase.co"
                        value={sbUrl}
                        onChange={(e) => setSbUrl(e.target.value)}
                        className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-600 dark:text-neutral-300 mb-1">
                        Anon Public Key
                      </label>
                      <input
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIs..."
                        value={sbKey}
                        onChange={(e) => setSbKey(e.target.value)}
                        className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveSbConfig}
                      className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-semibold text-xs transition-colors hover:opacity-90 cursor-pointer"
                    >
                      Simpan Konfigurasi
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-600">
        &copy; {new Date().getFullYear()} Jember Operation Center
      </div>
    </div>
  );
};
