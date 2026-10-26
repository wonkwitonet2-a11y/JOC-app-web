// Skala teks saat ini (1 = 16px). Ukuran dasar diatur otomatis oleh lebar layar di index.css.
// Dipakai grafik SVG agar teks dan jaraknya ikut membesar di monitor/proyektor.
export function getRootScale(): number {
  if (typeof window === 'undefined') return 1;
  const px = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return px > 0 ? px / 16 : 1;
}
export const fs = (n: number) => n * getRootScale();
