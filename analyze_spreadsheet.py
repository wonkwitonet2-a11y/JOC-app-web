import csv

with open('september_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

print(f"Total rows in CSV: {len(rows)}")

# Let's inspect all non-empty rows and their columns
for idx, r in enumerate(rows):
    label = r[2].strip() if len(r) > 2 else ''
    if not label and len(r) > 1:
        label = r[1].strip()
    if label or any(c.strip() for c in r):
        # find non-empty columns in this row
        row_info = [(c_idx, val.strip()) for c_idx, val in enumerate(r) if val.strip()]
        print(f"Row {idx:2d} | Label: '{label}' | Non-empty cols count: {len(row_info)}")
        # If it looks like a summary row (Pjl Harian, TOTAL SALES, RAYON, etc.), show important columns
        if any(keyword in label.upper() for keyword in ['PJL HARIAN', 'TOTAL', 'RAYON', 'AKM', 'JEMBER']):
            print(f"   -> Summary/TKU Row {idx}: {label}")
            for c_idx, val in row_info:
                if c_idx >= 120 and c_idx <= 200:
                    print(f"      Col {c_idx}: '{val}'")

