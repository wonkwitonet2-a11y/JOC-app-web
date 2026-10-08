import json

with open("scripts/final_2026_archives.json") as f:
    data = json.load(f)

# Sort descending from 2026-08 down to 2026-01
keys = sorted(data.keys(), reverse=True)

ts_lines = ["export const INITIAL_ARCHIVES: Record<string, ArchiveRecord> = {"]
for k in keys:
    arc = data[k]
    periode = arc["periode"]
    namaBulan = arc["namaBulan"]
    d = arc["d"]
    ts_lines.append(f'  "{k}": {{')
    ts_lines.append(f'    periode: "{periode}",')
    ts_lines.append(f'    namaBulan: "{namaBulan}",')
    ts_lines.append(f'    d: {d},')
    ts_lines.append(f'    terkunci: true,')
    ts_lines.append(f'    rows: [')
    for r in arc["rows"]:
        nama = r["nama"]
        rayon = r["rayon"]
        varian = json.dumps(r["varian"])
        total = r["total"]
        ts_lines.append(f'      {{ nama: "{nama}", rayon: {rayon}, varian: {varian}, total: {total} }},')
    ts_lines.append('    ]')
    ts_lines.append('  },')
ts_lines.append('};')

out_str = "\n".join(ts_lines)
with open("tmp/initial_archives.ts", "w") as f:
    f.write(out_str)

print(f"Generated tmp/initial_archives.ts with {len(keys)} months!")
