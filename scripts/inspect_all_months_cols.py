import urllib.request
import csv
import io

sheet_id = "1USRsNejxUBcLIUPmwuMIm_A1AMwGx6swgef4Ch5H0Vw"
sheets = [
    {"key": "2026-01", "name": "JAN 26", "gid": "306074932"},
    {"key": "2026-02", "name": "FEB 26", "gid": "309692263"},
    {"key": "2026-03", "name": "Maret 26", "gid": "1142202713"},
    {"key": "2026-04", "name": "APR 26", "gid": "1761840320"},
    {"key": "2026-05", "name": "MEI 26", "gid": "1872066484"},
    {"key": "2026-06", "name": "JUNI 26", "gid": "319344240"},
    {"key": "2026-07", "name": "JULI 26", "gid": "1831375126"},
    {"key": "2026-08", "name": "AGS 26", "gid": "214654360"},
]

def parse_num(s):
    if not s: return 0
    s = str(s).replace(".", "").replace(",", ".").replace(" ", "").strip()
    try:
        return int(float(s))
    except:
        return 0

for s in sheets:
    gid = s["gid"]
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    with urllib.request.urlopen(url) as resp:
        content = resp.read().decode("utf-8", errors="ignore")
        rows = list(csv.reader(io.StringIO(content)))
        print(f"\n==================== {s['name']} (total cols: {max(len(r) for r in rows)}) ====================")
        
        # Look for headers in row 1, 2, 3
        h1 = rows[1] if len(rows) > 1 else []
        h2 = rows[2] if len(rows) > 2 else []
        h3 = rows[3] if len(rows) > 3 else []
        
        # Print summary header titles from col 100 onwards
        for c in range(100, max(len(r) for r in rows)):
            t1 = h1[c] if c < len(h1) else ""
            t2 = h2[c] if c < len(h2) else ""
            t3 = h3[c] if c < len(h3) else ""
            titles = " | ".join(filter(None, [t1.strip(), t2.strip(), t3.strip()]))
            if titles:
                # check value in row 4 (Jember)
                val_jember = rows[4][c] if len(rows) > 4 and c < len(rows[4]) else ""
                print(f"Col {c}: [{titles}] -> Jember: '{val_jember}'")
