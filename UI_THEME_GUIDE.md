# 🎨 Panduan Desain UI & Tema Aplikasi (Design System Guide)
Dokumentasi ini dibuat agar Anda dapat dengan mudah **menduplikasi tampilan (UI), tema warna, sistem dark mode, dan komponen** aplikasi ini ke proyek aplikasi baru Anda.

---

## 1. Fondasi Teknologi (*Tech Stack*)
- **Framework**: React 19 (atau 18) + TypeScript + Vite
- **Styling Engine**: **Tailwind CSS v4** (menggunakan `@import "tailwindcss";` dan direktif `@theme`)
- **Icon Pack**: `lucide-react` (ringan, konsisten, dan modern)
- **Tipografi**: 
  - UI Text: `Plus Jakarta Sans`
  - Angka & Data Tabel: `JetBrains Mono` (dengan `tabular-nums` agar angka sejajar vertikal rapi)

---

## 2. Instalasi Paket Dependensi (Untuk Proyek Baru)

Jalankan perintah ini di proyek baru Anda:

```bash
npm install lucide-react clsx tailwind-merge
npm install -D tailwindcss @tailwindcss/vite
```

Tambahkan plugin Tailwind di `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

---

## 3. Font Google & Konfigurasi `index.html`

Salin link font berikut ke `<head>` pada file `index.html`:

```html
<!-- Google Fonts: Plus Jakarta Sans & JetBrains Mono -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

Di tag `<body>`:
```html
<body class="bg-neutral-50 text-neutral-900 antialiased selection:bg-brand-500 selection:text-white">
  <div id="root"></div>
</body>
```

---

## 4. Konfigurasi Tema Tailwind CSS v4 (`src/index.css`)

Berikut isi lengkap file `src/index.css`:

```css
@import "tailwindcss";

@theme {
  /* Brand Corporate Navy Blue */
  --color-brand-50: #eef4fb;
  --color-brand-100: #dce8f6;
  --color-brand-200: #b9d0ec;
  --color-brand-300: #8db1de;
  --color-brand-400: #6b9bd6;
  --color-brand-500: #2f6bb5;
  --color-brand-600: #1d4f91;
  --color-brand-700: #143d73;
  --color-brand-800: #0f2f5a;
  --color-brand-900: #0C2D57; /* Warna Utama / Primary */
  --color-brand-950: #071b38;
}

/* Dukungan Dark Mode manual via kelas .dark pada elemen <html> */
@custom-variant dark (&:where(.dark, .dark *));

:root { color-scheme: light; }
:root.dark { color-scheme: dark; }

html.dark body { 
  background-color: #0a0a0a; 
  color: #f5f5f5; 
}

@layer base {
  body {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  }
  
  .font-mono, .tabular-nums {
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
  }
}

/* Scrollbar Minimalis & Elegan untuk Tabel Padat Data */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(150, 150, 150, 0.25);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(150, 150, 150, 0.4);
}

:focus-visible { 
  outline: 2px solid #1d4f91; 
  outline-offset: 2px; 
}
```

---

## 5. Logika Tema Terang & Gelap (Dark Mode Toggle)

Simpan preferensi tema di `localStorage` atau `state`:

```tsx
import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app-theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  return { theme, toggleTheme };
}
```

---

## 6. Aturan Warna & Status Standar

### A. Aturan Warna Balik Botol (BB)
| Kondisi Persentase BB | Warna | Kode Kelas Tailwind |
| :--- | :--- | :--- |
| **< 5.0%** | Hijau (Aman/Bagus) | `bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800` |
| **5.0% - 9.9%** | Kuning / Amber (Perhatian) | `bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800` |
| **≥ 10.0%** | Merah / Rose (Kritis/Tinggi) | `bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800` |

**Fungsi Helper TypeScript:**
```tsx
export function getBbBadgeClass(pct: number): string {
  if (pct < 5.0) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  }
  if (pct < 10.0) {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
  }
  return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
}
```

### B. Aturan Capaian Target / Sales Realisasi
| Kondisi | Status | Kode Kelas Tailwind |
| :--- | :--- | :--- |
| **≥ 100%** | Tercapai / Surplus | `bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300` |
| **95% - 99.9%** | Mendekati Target | `bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300` |
| **< 95%** | Kurang / Defisit | `bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300` |

---

## 7. Komponen Kartu Metrik (Metric Card Component)

Komponen kartu statistik bersih khas dashboard enterprise:

```tsx
import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'danger' | 'neutral';
  };
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  badge,
  icon,
}) => {
  const badgeColors = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-50 tracking-tight">
          {value}
        </span>
        {badge && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeColors[badge.variant]}`}>
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
};
```

---

## 8. Template Tabel Data Rapi & Presisi (Data Table)

```tsx
<div className="overflow-x-auto rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs">
  <table className="w-full border-collapse text-left text-xs">
    <thead>
      <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold uppercase tracking-wider">
        <th className="py-3 px-4">Nama Item</th>
        <th className="py-3 px-4 text-right">Target</th>
        <th className="py-3 px-4 text-right">Realisasi</th>
        <th className="py-3 px-4 text-center">Status</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
      <tr className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
        <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-neutral-100">
          Yakult Original
        </td>
        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-300">
          12,500
        </td>
        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
          13,100
        </td>
        <td className="py-2.5 px-4 text-center">
          <span className="inline-flex px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            104.8%
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 9. Struktur Kerangka Halaman (*App Shell*)

```tsx
<div className="min-h-screen bg-neutral-100/60 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors">
  {/* Navbar Sticky */}
  <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 h-14 flex items-center justify-between px-4">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-brand-900 text-white flex items-center justify-center font-bold text-sm">
        J
      </div>
      <div>
        <h1 className="text-sm font-bold leading-tight">Nama Aplikasi</h1>
        <p className="text-[10px] text-neutral-500">Sub-judul / Status Periode</p>
      </div>
    </div>
    
    <div className="flex items-center gap-2">
      <button 
        onClick={toggleTheme}
        className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </div>
  </header>

  {/* Main Content Area */}
  <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
    {/* Isi Konten Anda */}
  </main>
</div>
```
