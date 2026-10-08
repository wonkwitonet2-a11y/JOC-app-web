import urllib.request
import csv
import io
import json

sheet_id = "1USRsNejxUBcLIUPmwuMIm_A1AMwGx6swgef4Ch5H0Vw"
sheets_2026 = [
    {"key": "2026-01", "name": "JAN 26", "namaBulan": "Januari 2026", "gid": "306074932", "d": 31},
    {"key": "2026-02", "name": "FEB 26", "namaBulan": "Februari 2026", "gid": "309692263", "d": 28},
    {"key": "2026-03", "name": "Maret 26", "namaBulan": "Maret 2026", "gid": "1142202713", "d": 31},
    {"key": "2026-04", "name": "APR 26", "namaBulan": "April 2026", "gid": "1761840320", "d": 30},
    {"key": "2026-05", "name": "MEI 26", "namaBulan": "Mei 2026", "gid": "1872066484", "d": 31},
    {"key": "2026-06", "name": "JUNI 26", "namaBulan": "Juni 2026", "gid": "319344240", "d": 30},
    {"key": "2026-07", "name": "JULI 26", "namaBulan": "Juli 2026", "gid": "1831375126", "d": 31},
    {"key": "2026-08", "name": "AGS 26", "namaBulan": "Agustus 2026", "gid": "214654360", "d": 31},
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
    gid = item["gid"]
    month_name = item["namaBulan"]
    key = item["key"]
    days_in_month = item["d"]
    
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode("utf-8", errors="ignore")
        rows = list(csv.reader(io.StringIO(content)))
        
        # Determine columns for YO, OM, OS, YT, Total
        # Let's inspect rows 2, 3, 4 for headers
        # In general:
        # Col 128: ORI (YO)
        # Col 130: OM
        # Col 132: OS
        # Col 134: YT
        # Col 136: Total
        
        # Check for TKU rows
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
                    
                    # Read values
                    yo = parse_num(r[128]) if len(r) > 128 else 0
                    om = parse_num(r[130]) if len(r) > 130 else 0
                    os = parse_num(r[132]) if len(r) > 132 else 0
                    yt = parse_num(r[134]) if len(r) > 134 else 0
                    total = parse_num(r[136]) if len(r) > 136 else 0
                    
                    if total == 0 and (yo + om + os + yt) > 0:
                        total = yo + om + os + yt
                    elif total > 0 and (yo + om + os + yt) == 0:
                        yo = total
                        
                    archive_rows.append({
                        "nama": std_name,
                        "rayon": rayon,
                        "varian": [yo, om, os, yt],
                        "total": total
                    })
                    
        # Sort by standard order
        archive_rows.sort(key=lambda x: next(t[0] for t in tku_standard_names if t[1] == x["nama"]))
        
        archives[key] = {
            "periode": key,
            "namaBulan": month_name,
            "d": days_in_month,
            "terkunci": True,
            "rows": archive_rows
        }
        
        total_cabang = sum(r["total"] for r in archive_rows)
        print(f"[{key}] {month_name}: {len(archive_rows)} TKUs, Total Cabang: {total_cabang:,} btl")

with open("scripts/extracted_2026_archives.json", "w") as f:
    json.dump(archives, f, indent=2)

print("\nSaved to scripts/extracted_2026_archives.json successfully!")
