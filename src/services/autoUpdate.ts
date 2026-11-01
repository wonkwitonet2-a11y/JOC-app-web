// Auto-update: aplikasi yang sedang terbuka (browser / WebView / APK) mengecek version.json di server.
// Kalau ID build-nya berbeda dari yang sedang berjalan, halaman dimuat ulang otomatis,
// jadi setelah publish ulang tidak perlu hapus data / buka ulang manual.

declare const __APP_BUILD_ID__: string;

export const CURRENT_BUILD_ID: string =
  typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';

const RELOAD_GUARD_KEY = 'yk_autoupdate_last_reload';

export async function fetchLatestBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json && typeof json.id === 'string' ? json.id : null;
  } catch {
    return null;
  }
}

export function hasNewVersion(latest: string | null): boolean {
  return CURRENT_BUILD_ID !== 'dev' && !!latest && latest !== CURRENT_BUILD_ID;
}

// Cegah reload berulang kalau server/CDN masih menyajikan index.html lama
function reloadAllowed(latest: string): boolean {
  try {
    const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (raw) {
      const { id, at } = JSON.parse(raw);
      if (id === latest && Date.now() - at < 60_000) return false;
    }
  } catch { /* abaikan */ }
  return true;
}

export function reloadToLatest(latest: string) {
  if (!reloadAllowed(latest)) return;
  try { sessionStorage.setItem(RELOAD_GUARD_KEY, JSON.stringify({ id: latest, at: Date.now() })); } catch { /* abaikan */ }
  const url = new URL(window.location.href);
  url.searchParams.set('_v', latest); // paksa WebView melewati cache halaman lama
  window.location.replace(url.toString());
}
