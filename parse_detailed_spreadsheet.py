import csv

with open('september_data.csv', 'r', encoding='utf-8') as f:
    rows = list(csv.reader(f))

header3 = rows[2]
header4 = rows[3]

# Print header column mapping for cols 160-195
print("=== Column Mapping (160 to 195) ===")
for c in range(160, 195):
    h3 = header3[c].strip() if c < len(header3) else ''
    h4 = header4[c].strip() if c < len(header4) else ''
    print(f"Col {c:3d}: H3='{h3:35s}' | H4='{h4:20s}'")

# Print TKU values for JWP, s/YL, Absen, Frek, PDM, BB
print("\n=== TKU Operational Values ===")
for idx in range(4, 14):
    r = rows[idx]
    name = r[2].strip()
    jwp = r[167].strip()
    s_yl = r[168].strip()
    s_yo = r[169].strip()
    s_om = r[170].strip()
    s_os = r[171].strip()
    s_yt = r[172].strip()
    absen = r[173].strip()
    frek = r[174].strip()
    
    pdm_yo = r[175].strip()
    pdm_om = r[176].strip()
    pdm_os = r[177].strip()
    pdm_yt = r[178].strip()
    
    bb_yo = r[179].strip() # Wait! Let's check headers
    bb_om = r[181].strip()
    bb_os = r[183].strip()
    bb_yt = r[185].strip()
    bb_tot = r[187].strip()
    
    l250 = r[189].strip()
    l300 = r[191].strip()
    
    print(f"TKU {idx-4} ({name:12s}): JWP={jwp:4s} | s/YL={s_yl:4s} (YO={s_yo}, OM={s_om}, OS={s_os}, YT={s_yt}) | Absen={absen:2s} | Frek={frek:2s} | BB_tot={bb_tot:6s} (YO={bb_yo}, OM={bb_om}, OS={bb_os}, YT={bb_yt}) | L250={l250} | L300={l300}")

# Print Branch Total (Row 25)
r25 = rows[25]
print("\n=== BRANCH TOTAL (Row 25 - Pjl Harian) ===")
print(f"JWP: {r25[167]}")
print(f"s/YL Total: {r25[172]} (YO={r25[168]}, OM={r25[169]}, OS={r25[170]}, YT={r25[171]})")
print(f"Absen: {r25[173]} | Frek: {r25[174]}")
print(f"AKM PDM: YO={r25[175]}, OM={r25[176]}, OS={r25[177]}, YT={r25[178]}")
print(f"AKM BB: YO={r25[179]} ({r25[180]}), OM={r25[181]} ({r25[182]}), OS={r25[183]} ({r25[184]}), YT={r25[185]} ({r25[186]}), TOTAL BB={r25[187]} ({r25[188]})")
print(f"L250: {r25[189]} | L300: {r25[191]}")

