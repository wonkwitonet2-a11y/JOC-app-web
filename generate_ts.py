import csv
import json

def parse_num(val):
    if not val:
        return 0
    clean = val.replace('.', '').replace(',', '.').strip()
    try:
        if '.' in clean:
            return float(clean)
        return int(clean)
    except:
        return 0

with open('september_data.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

tku_rows = []
for idx, r in enumerate(rows):
    if len(r) > 2 and r[2].strip() in ['JEMBER', 'JEMBER 2', 'TAWANGALUN', 'DP JEMBER 1', 'DP JEMBER 4', 'PELITA', 'DAWUHAN', 'KALISAT', 'DP JEMBER 2', 'DP JEMBER 3']:
        tku_rows.append((r[2].strip(), r))

print(f"Parsed {len(tku_rows)} TKUs")

parsed_tkus = []
parsed_pjd = {} # date_str -> { tku_idx -> record }

for tku_idx, (name, r) in enumerate(tku_rows):
    tg_harian = int(parse_num(r[3]))
    
    # Penjualan Akm
    yo_akm = int(parse_num(r[128]))
    om_akm = int(parse_num(r[130]))
    os_akm = int(parse_num(r[132]))
    yt_akm = int(parse_num(r[134]))
    
    # Target
    tg_yo = int(parse_num(r[139]))
    tg_om = int(parse_num(r[141]))
    tg_os = int(parse_num(r[143]))
    tg_yt = int(parse_num(r[145]))
    
    # Bulan Lalu (BL)
    bl_tot = int(parse_num(r[150]))
    bl_yo = int(parse_num(r[151]))
    bl_om = int(parse_num(r[152]))
    bl_os = int(parse_num(r[153]))
    bl_yt = int(parse_num(r[154]))
    
    # Tahun Lalu (TY)
    ty_tot = int(parse_num(r[160]))
    
    # Operasional
    jml_area = int(parse_num(r[162]))
    jml_yl = int(parse_num(r[163]))
    akm_jwp = int(parse_num(r[167]))
    s_yl = int(parse_num(r[168]))
    absen = int(parse_num(r[173]))
    frek = int(parse_num(r[174]))
    
    bb_yo = int(parse_num(r[175]))
    bb_om = int(parse_num(r[176]))
    bb_os = int(parse_num(r[177]))
    bb_yt = int(parse_num(r[178]))
    
    l250 = int(parse_num(r[189]))
    l300 = int(parse_num(r[191]))

    print(f"TKU {tku_idx} {name}:")
    print(f"  Akm Sales: YO={yo_akm}, OM={om_akm}, OS={os_akm}, YT={yt_akm}")
    print(f"  Target: YO={tg_yo}, OM={tg_om}, OS={tg_os}, YT={tg_yt} (Tot: {tg_harian})")
    print(f"  BL: Tot={bl_tot}, YO={bl_yo}, OM={bl_om}, OS={bl_os}, YT={bl_yt}")
    print(f"  TY: Tot={ty_tot}")
    print(f"  Ops: Area={jml_area}, YL={jml_yl}, JWP={akm_jwp}, s/YL={s_yl}, Absen={absen}, Frek={frek}")
    print(f"  BB: YO={bb_yo}, OM={bb_om}, OS={bb_os}, YT={bb_yt}")
    print(f"  L250={l250}, L300={l300}")

    # Daily sales PJD for 30 days
    for day in range(1, 31):
        c_yo = int(parse_num(r[4 + (day-1)*4]))
        c_om = int(parse_num(r[5 + (day-1)*4]))
        c_os = int(parse_num(r[6 + (day-1)*4]))
        c_yt = int(parse_num(r[7 + (day-1)*4]))
        sold = c_yo + c_om + c_os + c_yt
        
        # If any value sold > 0
        date_str = f"2026-09-{day:02d}"
        if date_str not in parsed_pjd:
            parsed_pjd[date_str] = {}
            
        parsed_pjd[date_str][tku_idx] = {
            "v": [c_yo, c_om, c_os, c_yt],
            "b": [0, 0, 0, 0],
            "sold": sold,
            "bb": 0,
            "pdmV": [c_yo, c_om, c_os, c_yt],
            "pdm": sold,
            "yl": jml_yl,
            "ar": jml_area,
            "jwp": jml_yl * day,
            "absen": 0,
            "frek": 0,
            "l250": l250,
            "l300": l300
        }

print("\nPJD days count:", len(parsed_pjd))
