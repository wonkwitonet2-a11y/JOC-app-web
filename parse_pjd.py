import json

with open('src/data/initialData.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

pjd_lines = []
capturing = False
for line in lines:
    if 'export const INITIAL_PJD' in line:
        capturing = True
        pjd_lines.append(line[line.find('{'):])
        continue
    if capturing:
        if 'export const INITIAL_QUOTES' in line or 'export const INITIAL_ARCHIVES' in line:
            # remove trailing semicolon or comma
            last = pjd_lines[-1].rstrip()
            if last.endswith(';'): pjd_lines[-1] = last[:-1]
            break
        pjd_lines.append(line)

pjd_str = ''.join(pjd_lines).strip()
if pjd_str.endswith(';'): pjd_str = pjd_str[:-1]

pjd = json.loads(pjd_str)
print(f"Loaded {len(pjd.keys())} dates in INITIAL_PJD")

tot_v = [0,0,0,0]
tot_sold = 0
tot_pdm = 0

for d_str, tkus in pjd.items():
    for tku_k, rec in tkus.items():
        v = rec.get('v', [0,0,0,0])
        pdm = rec.get('pdm', sum(v))
        for i in range(4):
            tot_v[i] += v[i]
        tot_sold += rec.get('sold', sum(v))
        tot_pdm += pdm

print(f"Total Daily Sales (v sum): {sum(tot_v)} (per variant: {tot_v})")
print(f"Total Sold: {tot_sold}")
print(f"Total PDM in PJD: {tot_pdm}")

