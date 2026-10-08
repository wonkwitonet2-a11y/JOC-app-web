// Service untuk menyimpan draft input penjualan TKU secara otomatis ke localStorage
// Jika aplikasi tiba-tiba ditutup, diminimalkan, atau dibuka kembali, data ketikan (YO, OM, OS, YT, BB, PDM)
// tidak akan hilang dan langsung dimuat kembali.

export interface TkuInputDraft {
  v: [number, number, number, number];
  b: [number, number, number, number];
  pdmV: [number, number, number, number];
  yl?: number;
  ar?: number;
  l250?: number;
  l300?: number;
  jwpCustom?: number;
  absen?: number;
  frek?: number;
  updatedAt: number;
}

const DRAFT_PREFIX = 'yk_input_draft_';

function makeKey(date: string, tkuIdx: number): string {
  return `${DRAFT_PREFIX}${date}_${tkuIdx}`;
}

export function saveTkuInputDraft(
  date: string,
  tkuIdx: number,
  salesV: [number, number, number, number],
  bbV: [number, number, number, number],
  pdmV: [number, number, number, number],
  extras?: {
    yl?: number;
    ar?: number;
    l250?: number;
    l300?: number;
    jwpCustom?: number;
    absen?: number;
    frek?: number;
  }
) {
  try {
    const key = makeKey(date, tkuIdx);
    const hasData =
      salesV.some(x => x > 0) ||
      bbV.some(x => x > 0) ||
      pdmV.some(x => x > 0) ||
      Boolean(extras && (extras.absen || extras.frek || extras.l250 || extras.l300));

    if (!hasData) {
      localStorage.removeItem(key);
      return;
    }

    const draft: TkuInputDraft = {
      v: salesV,
      b: bbV,
      pdmV,
      ...extras,
      updatedAt: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (err) {
    console.warn('Gagal menyimpan draft input:', err);
  }
}

export function loadTkuInputDraft(date: string, tkuIdx: number): TkuInputDraft | null {
  try {
    const key = makeKey(date, tkuIdx);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.v) && parsed.v.length === 4) {
      return parsed as TkuInputDraft;
    }
  } catch (err) {
    console.warn('Gagal membaca draft input:', err);
  }
  return null;
}

export function clearTkuInputDraft(date: string, tkuIdx: number) {
  try {
    const key = makeKey(date, tkuIdx);
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('Gagal menghapus draft input:', err);
  }
}
