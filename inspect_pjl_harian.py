import csv

with open('september_data.csv', 'r', encoding='utf-8') as f:
    rows = list(csv.reader(f))

# Find row "Pjl Harian" and "RAYON 1", "RAYON 2"
header3 = rows[2]
header4 = rows[3]

for idx, r in enumerate(rows):
    label = r[1].strip() if len(r) > 1 and r[1].strip() else (r[2].strip() if len(r) > 2 else '')
    if any(k in label.upper() for k in ['PJL HARIAN', 'RAYON 1', 'RAYON 2']):
        print(f"\n==================== Row {idx}: '{label}' ====================")
        for c in range(120, len(r)):
            val = r[c].strip()
            if val:
                h3 = header3[c].strip() if c < len(header3) else ''
                h4 = header4[c].strip() if c < len(header4) else ''
                print(f"Col {c:3d} (H3: '{h3:15s}' | H4: '{h4:15s}'): {val}")

