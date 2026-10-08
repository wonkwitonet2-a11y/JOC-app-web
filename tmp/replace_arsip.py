import re

with open('src/views/ArsipView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Ya, Hapus button
text = text.replace(
    'bg-rose-600 hover:bg-rose-700 text-white"\n              >Ya, Hapus',
    'bg-red-600 hover:bg-red-700 text-white"\n              >Ya, Hapus'
)

# 2. Hapus Arsip Bulan Ini button
text = text.replace(
    'border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50',
    'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50'
)

# 3. YO headers
text = text.replace(
    'text-rose-600 dark:text-rose-400">YO (Ori)</th>\n                      <th className="py-2.5 px-3 text-right font-semibold text-rose-700/70">Rata YO</th>',
    'text-red-600 dark:text-red-400">YO (Ori)</th>\n                      <th className="py-2.5 px-3 text-right font-semibold text-red-700/70">Rata YO</th>'
)

# 4. Absen / Frek / YL < 250
text = text.replace(
    '<th className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">YL Absen</th>\n                      <th className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">Frekuensi</th>',
    '<th className="py-2.5 px-3 text-right font-semibold text-red-600 dark:text-red-400">YL Absen</th>\n                      <th className="py-2.5 px-3 text-right font-semibold text-red-600 dark:text-red-400">Frekuensi</th>'
)
text = text.replace(
    '<th className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400 border-l border-neutral-200 dark:border-neutral-700">YL &lt; 250</th>',
    '<th className="py-2.5 px-3 text-right font-semibold text-red-600 dark:text-red-400 border-l border-neutral-200 dark:border-neutral-700">YL &lt; 250</th>'
)
text = text.replace(
    'font-bold text-rose-600 dark:text-rose-400 border-l border-neutral-200 dark:border-neutral-700">\n                          {row.l250 !== undefined ? row.l250 : \'—\'}',
    'font-bold text-red-600 dark:text-red-400 border-l border-neutral-200 dark:border-neutral-700">\n                          {row.l250 !== undefined ? row.l250 : \'—\'}'
)

text = text.replace(
    '<th className="py-2.5 px-2 text-right text-rose-600">Absen</th>\n                      <th className="py-2.5 px-2 text-right text-rose-600">Frek</th>',
    '<th className="py-2.5 px-2 text-right text-red-600">Absen</th>\n                      <th className="py-2.5 px-2 text-right text-red-600">Frek</th>'
)

text = text.replace(
    '<td className="py-2.5 px-2 text-right text-rose-600">{row.absenYl !== undefined ? row.absenYl : \'—\'}</td>\n                        <td className="py-2.5 px-2 text-right text-rose-600">{row.frekuensiAbsen !== undefined ? row.frekuensiAbsen : \'—\'}</td>',
    '<td className="py-2.5 px-2 text-right text-red-600">{row.absenYl !== undefined ? row.absenYl : \'—\'}</td>\n                        <td className="py-2.5 px-2 text-right text-red-600">{row.frekuensiAbsen !== undefined ? row.frekuensiAbsen : \'—\'}</td>'
)

text = text.replace(
    '<span className="text-rose-600 dark:text-rose-400 font-semibold">\n                  Absen: {activeStats.totalAbsen} (Frek {activeStats.totalFrek})\n                </span>',
    '<span className="text-red-600 dark:text-red-400 font-semibold">\n                  Absen: {activeStats.totalAbsen} (Frek {activeStats.totalFrek})\n                </span>'
)

# Convert all remaining rose- to brand-
remaining_rose = re.findall(r'rose-[a-z0-9/]+', text)
print(f'Converting {len(remaining_rose)} remaining rose-* classes to brand-*')

text = re.sub(r'rose-', 'brand-', text)

with open('src/views/ArsipView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Done!')
