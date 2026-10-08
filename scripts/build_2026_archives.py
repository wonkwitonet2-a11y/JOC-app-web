import csv
import json
import os

sheets_2026 = [
    {"key": "2026-01", "name": "JAN 26", "namaBulan": "Januari 2026", "d": 31, "file": "tmp/months/2026-01.csv"},
    {"key": "2026-02", "name": "FEB 26", "namaBulan": "Februari 2026", "d": 28, "file": "tmp/months/2026-02.csv"},
    {"key": "2026-03", "name": "Maret 26", "namaBulan": "Maret 2026", "d": 31, "file": "tmp/months/2026-03.csv"},
    {"key": "2026-04", "name": "APR 26", "namaBulan": "April 2026", "d": 30, "file": "tmp/months/2026-04.csv"},
    {"key": "2026-05", "name": "MEI 26", "namaBulan": "Mei 2026", "d": 31, "file": "tmp/months/2026-05.csv"},
    {"key": "2026-06", "name": "JUNI 26", "namaBulan": "Juni 2026", "d": 30, "file": "tmp/months/2026-06.csv"},
    {"key": "2026-07", "name": "JULI 26", "namaBulan": "Juli 2026", "d": 31, "file": "tmp/months/2026-07.csv"},
    {"key": "2026-08", "name": "AGS 26", "namaBulan": "Agustus 2026", "d": 31, "file": "tmp/months/2026-08.csv"},
]

tku_standard_names = [
    (1, "Jember", 1),
    (2, "Jember 2", 1),
    (3, "Tawangalun", 1),
    (4, "DP Jember 1", 1),
    (5, "DP Jember 4", 1),
    (6, "Pelita", 2),
    (7, "Dawuhan", 2),
    (8, "Kalisat", 2),
    (9, "DP Jember 2", 2),
    (10, "DP Jember 3", 2),
]

def parse_num(s):
    if not s:
        return 0
    s = str(s).replace(".", "").replace(",", ".").replace(" ", "").strip()
    try:
        return int(float(s))
    except:
        return 0

archives = {}

for item in sheets_2026:
    fname = item["file"]
    with open(fname, "r", encoding="utf-8", errors="ignore") as f:
        rows = list(csv.reader(f))
        
    key = item["key"]
    month_name = item["namaBulan"]
    days_in_month = item["d"]
    
    # Check if 3-variant or 4-variant layout
    # Layout 1 (Jan-Mei): col 97 (YO), 99 (OM), 101 (YT), 103 (Total)
    # Layout 2 (Juni-Ags): col 128 (YO), 130 (OM), 132 (OS), 134 (YT), 136 (Total)
    is_4_variants = (key in ["2026-06", "2026-07", "2026-08"])
    
    archive_rows = []
    found_tkus = set()
    
    for r_idx, r in enumerate(rows):
        if len(r) > 2 and r[1].strip().isdigit():
            num = int(r[1].strip())
            if 1 <= num <= 10 and num not in found_tkus:
                found_tkus.add(num)
                matched_std = next((t for t in tku_standard_names if t[0] == num), None)
                std_name = matched_std[1] if matched_std else r[2].strip()
                rayon = matched_std[2] if matched_std else (1 if num <= 5 else 2)
                
                if is_4_variants:
                    yo = parse_num(r[128]) if len(r) > 128 else 0
                    om = parse_num(r[130]) if len(r) > 130 else 0
                    os = parse_num(r[132]) if len(r) > 132 else 0
                    yt = parse_num(r[134]) if len(r) > 134 else 0
                    total = parse_num(r[136]) if len(r) > 136 else 0
                else:
                    yo = parse_num(r[97]) if len(r) > 97 else 0
                    om = parse_num(r[99]) if len(r) > 99 else 0
                    os = 0
                    yt = parse_num(r[101]) if len(r) > 101 else 0
                    total = parse_num(r[103]) if len(r) > 103 else 0
                
                if total == 0 and (yo + om + os + yt) > 0:
                    total = yo + om + os + yt
                elif total > 0 and (yo + om + os + yt) == 0:
                    yo = total
                elif total != (yo + om + os + yt):
                    # Check discrepancy
                    pass
                
                archive_rows.append({
                    "nama": std_name,
                    "rayon": rayon,
                    "varian": [yo, om, os, yt],
                    "total": total
                })
                
    archive_rows.sort(key=lambda x: next(t[0] for t in tku_standard_names if t[1] == x["nama"]))
    
    archives[key] = {
        "periode": key,
        "namaBulan": month_name,
        "d": days_in_month,
        "terkunci": True,
        "rows": archive_rows
    }
    
    total_cabang = sum(r["total"] for r in archive_rows)
    print(f"\n[{key}] {month_name} ({days_in_month} hari) - Total Cabang: {total_cabang:,} btl")
    for r in archive_rows:
        print(f"  {r['nama']:12} (R{r['rayon']}): YO={r['varian'][0]:,}, OM={r['varian'][1]:,}, OS={r['varian'][2]:,}, YT={r['varian'][3]:,} -> Total={r['total']:,}")

with open("scripts/final_2026_archives.json", "w") as f:
    json.dump(archives, f, indent=2)

print("\nWrote scripts/final_2026_archives.json successfully!")
