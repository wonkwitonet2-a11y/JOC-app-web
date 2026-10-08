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

def parse_num(s):
    if not s:
        return 0
    s = str(s).replace(".", "").replace(",", ".").replace(" ", "").strip()
    try:
        return int(float(s))
    except:
        return 0

results = {}

for item in sheets_2026:
    gid = item["gid"]
    month_name = item["namaBulan"]
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
            rows = list(csv.reader(io.StringIO(content)))
            
            # Find header row with column names
            header_row_3 = rows[3] if len(rows) > 3 else []
            header_row_2 = rows[2] if len(rows) > 2 else []
            
            print(f"\n==========================================")
            print(f"SHEET: {month_name} ({len(rows)} rows, max cols: {max(len(r) for r in rows)})")
            
            # Find TKU rows (1 to 10)
            tku_rows = []
            for r_idx, r in enumerate(rows):
                if len(r) > 2 and r[1].strip().isdigit():
                    num = int(r[1].strip())
                    if 1 <= num <= 10:
                        name = r[2].strip()
                        tku_rows.append((num, name, r_idx, r))
            
            print(f"Found {len(tku_rows)} TKU rows:")
            for num, name, r_idx, r in tku_rows:
                # Print column values from 120 to end
                print(f"  TKU {num}: {name} (row {r_idx})")
                for c_idx in range(120, min(145, len(r))):
                    h_val = ""
                    if c_idx < len(header_row_3) and header_row_3[c_idx].strip():
                        h_val = header_row_3[c_idx].strip()
                    elif c_idx < len(header_row_2) and header_row_2[c_idx].strip():
                        h_val = header_row_2[c_idx].strip()
                    if r[c_idx].strip():
                        print(f"    col {c_idx} [{h_val}]: {r[c_idx].strip()}")
                        
    except Exception as e:
        print(f"Error {month_name}: {e}")
