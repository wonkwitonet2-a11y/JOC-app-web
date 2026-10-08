import csv

with open('september_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

for idx in range(len(rows)):
    r = rows[idx]
    c1 = r[1].strip() if len(r) > 1 else ''
    c2 = r[2].strip() if len(r) > 2 else ''
    c3 = r[3].strip() if len(r) > 3 else ''
    c_tot = sum(1 for c in r if c.strip())
    print(f"Row {idx:2d} | C1: '{c1}' | C2: '{c2}' | C3: '{c3}' | total non-empty: {c_tot}")
