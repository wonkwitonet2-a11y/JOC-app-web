import csv

with open('september_data.csv', 'r', encoding='utf-8') as f:
    raw_lines = f.readlines()

print(f"Total raw lines in file: {len(raw_lines)}")

reader = csv.reader(raw_lines)
rows = list(reader)

for idx, r in enumerate(rows):
    line_str = ",".join(r)
    for target in ['2920', '2.920', '18', '66', '342', '1010685', '1.010.685', '55295', '55.295', '808.150', '808150', '49.943']:
        if target in line_str:
            print(f"Row {idx:2d} matches target '{target}': {r[:4]}...")
            # print surrounding columns
            for c_idx, val in enumerate(r):
                if target in val:
                    print(f"   Col {c_idx}: '{val}'")

