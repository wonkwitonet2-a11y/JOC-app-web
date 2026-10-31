// Penyimpanan HP palsu supaya fungsi di storage.ts bisa diuji di Node (tanpa browser).
const mem: Record<string, string> = {};
export const fake = { full: false };
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in mem ? mem[k] : null),
  setItem: (k: string, v: string) => { if (fake.full) throw new Error('QuotaExceededError'); mem[k] = String(v); },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { Object.keys(mem).forEach(k => delete mem[k]); }
};
(globalThis as any).window = globalThis;
(globalThis as any).document = {};
