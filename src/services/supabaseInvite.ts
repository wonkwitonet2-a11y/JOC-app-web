import { SupabaseConfig } from '../types';
import { saveSupabaseConfigToVault, loadSupabaseConfigFromVault } from './storage';

// Kredensial Supabase disimpan di localStorage PER BROWSER/PERANGKAT, jadi saat link web
// dibuka di HP/browser lain (misal teman), aplikasi kosong & tidak terhubung ke Supabase.
// "Link undangan" membawa URL + anon key di bagian #hash (tidak dikirim ke server mana pun),
// lalu otomatis disimpan ke perangkat yang membukanya.

const INVITE_PARAM = 'sb';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildInviteLink(cfg: SupabaseConfig): string {
  const payload = toBase64Url(JSON.stringify({ u: cfg.u.trim(), k: cfg.k.trim() }));
  const base = window.location.origin + window.location.pathname;
  return `${base}#${INVITE_PARAM}=${payload}`;
}

// Dipanggil sekali sebelum React dirender. Mengembalikan true jika kredensial berhasil dipasang.
export function consumeInviteFromUrl(): boolean {
  try {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return false;
    const params = new URLSearchParams(hash);
    const raw = params.get(INVITE_PARAM);
    if (!raw) return false;

    const parsed = JSON.parse(fromBase64Url(raw));
    const u = typeof parsed?.u === 'string' ? parsed.u.trim() : '';
    const k = typeof parsed?.k === 'string' ? parsed.k.trim() : '';
    if (!u || !k || !/^https?:\/\//.test(u)) return false;

    const current = loadSupabaseConfigFromVault();
    // Perangkat yang sudah punya kredensial berbeda & terkunci tidak ditimpa diam-diam
    if (!(current.locked && current.u && current.u !== u)) {
      saveSupabaseConfigToVault({ u, k, locked: true });
    }

    // Bersihkan kredensial dari address bar & riwayat
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return true;
  } catch (err) {
    console.warn('Link undangan Supabase tidak valid:', err);
    return false;
  }
}
