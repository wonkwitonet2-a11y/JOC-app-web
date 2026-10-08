import urllib.request
import os

sheet_id = "1USRsNejxUBcLIUPmwuMIm_A1AMwGx6swgef4Ch5H0Vw"
sheets_2026 = [
    {"key": "2026-01", "name": "JAN 26", "namaBulan": "Januari 2026", "gid": "306074932"},
    {"key": "2026-02", "name": "FEB 26", "namaBulan": "Februari 2026", "gid": "309692263"},
    {"key": "2026-03", "name": "Maret 26", "namaBulan": "Maret 2026", "gid": "1142202713"},
    {"key": "2026-04", "name": "APR 26", "namaBulan": "April 2026", "gid": "1761840320"},
    {"key": "2026-05", "name": "MEI 26", "namaBulan": "Mei 2026", "gid": "1872066484"},
    {"key": "2026-06", "name": "JUNI 26", "namaBulan": "Juni 2026", "gid": "319344240"},
    {"key": "2026-07", "name": "JULI 26", "namaBulan": "Juli 2026", "gid": "1831375126"},
    {"key": "2026-08", "name": "AGS 26", "namaBulan": "Agustus 2026", "gid": "214654360"},
]

os.makedirs("tmp/months", exist_ok=True)

for item in sheets_2026:
    gid = item["gid"]
    fname = f"tmp/months/{item['key']}.csv"
    if not os.path.exists(fname):
        url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
            with open(fname, "wb") as f:
                f.write(content)
            print(f"Downloaded {item['namaBulan']} -> {fname} ({len(content)} bytes)")
    else:
        print(f"Already exists: {fname}")
