import csv

with open('september_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

print(f"Total rows: {len(rows)}")

# Print header row 3 (line index 2)
header3 = rows[2]
print("\nHeader row 3 length:", len(header3))
for i, val in enumerate(header3):
    if val.strip():
        print(f"Col {i}: {val.strip()}")

# Identify TKU rows
tku_rows = []
for idx, r in enumerate(rows):
    if len(r) > 2 and r[2].strip() in ['JEMBER', 'JEMBER 2', 'TAWANGALUN', 'DP JEMBER 1', 'DP JEMBER 4', 'PELITA', 'DAWUHAN', 'KALISAT', 'DP JEMBER 2', 'DP JEMBER 3']:
        tku_rows.append((r[2].strip(), r))

print(f"\nFound {len(tku_rows)} TKU rows:")
for name, r in tku_rows:
    print(f"\nTKU: {name} (cols: {len(r)})")
    # print daily sales columns (from col 4 onwards, 4 cols per day for 30 days)
    # col 4: Day 1 (1/9) -> 4 cols: ORI, OM, OS, YT
    # Col indices for Day 1: 4, 5, 6, 7
    # Day 30: 4 + 29*4 = 120, 121, 122, 123
    print("Day 1 (1/9):", r[4:8])
    print("Day 2 (2/9):", r[8:12])
    # Let's find target columns, BL, LY, etc.
    # User's mapping:
    # Target YO, OM, OS, YT
    # Let's inspect columns around index 130 to 200
    for c_idx in range(120, min(len(r), 180)):
        val = r[c_idx].strip()
        if val:
            print(f"  col {c_idx} ({header3[c_idx] if c_idx < len(header3) else ''}): {val}")

