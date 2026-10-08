import csv

with open('september_data.csv', 'r', encoding='utf-8') as f:
    rows = list(csv.reader(f))

print(f"Total rows in CSV: {len(rows)}")

for idx, r in enumerate(rows):
    c1 = r[1].strip() if len(r) > 1 else ''
    c2 = r[2].strip() if len(r) > 2 else ''
    c3 = r[3].strip() if len(r) > 3 else ''
    print(f"Row {idx:2d} | C1: '{c1[:20]}' | C2: '{c2[:20]}' | C3: '{c3[:20]}'")

