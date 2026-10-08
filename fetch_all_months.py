import urllib.request, csv, io, json

sheet_id = "1USRsNejxUBcLIUPmwuMIm_A1AMwGx6swgef4Ch5H0Vw"
sheets_config = [
    {"key": "2026-01", "name": "JAN 26", "namaBulan": "Januari 2026", "gid": "306074932", "d": 31},
    {"key": "2026-02", "name": "FEB 26", "namaBulan": "Februari 2026", "gid": "309692263", "d": 28},
    {"key": "2026-03", "name": "Maret 26", "namaBulan": "Maret 2026", "gid": "1142202713", "d": 31},
    {"key": "2026-04", "name": "APR 26", "namaBulan": "April 2026", "gid": "1761840320", "d": 30},
    {"key": "2026-05", "name": "MEI 26", "namaBulan": "Mei 2026", "gid": "1872066484", "d": 31},
    {"key": "2026-06", "name": "JUNI 26", "namaBulan": "Juni 2026", "gid": "319344240", "d": 30},
    {"key": "2026-07", "name": "JULI 26", "namaBulan": "Juli 2026", "gid": "1831375126", "d": 31},
    {"key": "2026-08", "name": "AGS 26", "namaBulan": "Agustus 2026", "gid": "214654360", "d": 31},
    {"key": "2025-09", "name": "SEPTEMBER", "namaBulan": "September 2025", "gid": "13344399", "d": 30},
    {"key": "2025-10", "name": "OKT 2025", "namaBulan": "Oktober 2025", "gid": "757171743", "d": 31},
    {"key": "2025-11", "name": "NOV 2025", "namaBulan": "November 2025", "gid": "1086378744", "d": 30},
    {"key": "2025-12", "name": "DES 25", "namaBulan": "Desember 2025", "gid": "870473957", "d": 31},
]

def parse_num(s):
    if not s: return 0
    s = s.replace(".", "").replace(",", ".").replace(" ", "").strip()
    try:
        return int(float(s))
    except:
        return 0

archives = {}

for item in sheets_config:
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={item['gid']}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
            rows = list(csv.reader(io.StringIO(content)))
            
            # Find TKU rows
            archive_rows = []
            for r in rows[4:]:
                if len(r) > 2 and r[1].isdigit() and int(r[1]) <= 10:
                    no = int(r[1])
                    name = r[2].strip()
                    rayon = 1 if no <= 5 else 2
                    
                    # Look for variant totals in summary columns (around col 120-135)
                    # Let's inspect where Akm ORI, OM, OS, YT, Total are located
                    # Usually col 125..135
                    # Find total sold
                    total_sold = 0
                    yo = 0
                    om = 0
                    os = 0
                    yt = 0
                    
                    # Search for total
                    for c_idx in range(120, min(140, len(r))):
                        val = parse_num(r[c_idx])
                        if val > 10000 and total_sold == 0:
                            total_sold = val
                    
                    archive_rows.append({
                        "nama": name,
                        "rayon": rayon,
                        "raw_row": r
                    })
            
            archives[item["key"]] = {
                "periode": item["key"],
                "namaBulan": item["namaBulan"],
                "d": item["d"],
                "terkunci": True,
                "count": len(archive_rows)
            }
            print(f"Parsed [{item['namaBulan']}]: {len(archive_rows)} TKUs")
    except Exception as e:
        print(f"Error {item['namaBulan']}: {e}")

with open("all_months_manifest.json", "w") as f:
    json.dump(archives, f, indent=2)
