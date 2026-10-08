import csv

with open('september_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

header3 = rows[2]
header4 = rows[3]

for idx, r in enumerate(rows):
    if len(r) > 2 and r[2].strip() in ['JEMBER', 'JEMBER 2', 'TAWANGALUN', 'DP JEMBER 1', 'DP JEMBER 4', 'PELITA', 'DAWUHAN', 'KALISAT', 'DP JEMBER 2', 'DP JEMBER 3']:
        name = r[2].strip()
        print(f"\n--- {name} ---")
        for c in range(173, min(len(r), 210)):
            h3 = header3[c].strip() if c < len(header3) else ''
            h4 = header4[c].strip() if c < len(header4) else ''
            val = r[c].strip()
            print(f"Col {c} (H3: '{h3}' | H4: '{h4}'): {val}")
