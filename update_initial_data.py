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

pics = [
    "Bpk. Hendra S.", "Ibu Siti Rohmah", "Bpk. Agus Santoso", "Bpk. Bambang P.", "Ibu Nurul Aini",
    "Bpk. Eko Prasetyo", "Bpk. Ahmad Fauzi", "Ibu Dewi Lestari", "Ibu Sri Wahyuni", "Bpk. Arif Wibowo"
]
alamats = [
    "Jl. Hayam Wuruk No. 45, Jember", "Jl. Trunojoyo No. 12, Jember", "Jl. Dharmawangsa No. 88, Rambipuji",
    "Jl. Gajah Mada No. 102, Kaliwates", "Jl. PB Sudirman No. 34, Patrang", "Jl. Diponegoro No. 29, Pelita",
    "Jl. Raya Dawuhan No. 18, Dawuhan", "Jl. Kalisat Utama No. 99, Kalisat", "Jl. Letjen Sutoyo No. 67, Sumbersari",
    "Jl. KH Shiddiq No. 14, Talangsari"
]

initial_tkus = []
target_bl = []
target_ty = []
target_variant_yo = {}
target_variant_om = {}
target_variant_os = {}
target_variant_yt = {}

pjd_data = {}

for idx, (name, r) in enumerate(tku_rows):
    rayon = 1 if idx in [0, 1, 2, 3, 4] else 2
    tg_harian = int(parse_num(r[3]))
    
    yo_akm = int(parse_num(r[128]))
    om_akm = int(parse_num(r[130]))
    os_akm = int(parse_num(r[132]))
    yt_akm = int(parse_num(r[134]))
    
    tg_yo = int(parse_num(r[139]))
    tg_om = int(parse_num(r[141]))
    tg_os = int(parse_num(r[143]))
    tg_yt = int(parse_num(r[145]))
    
    bl_tot = int(parse_num(r[150]))
    bl_yo = int(parse_num(r[151]))
    bl_om = int(parse_num(r[152]))
    bl_os = int(parse_num(r[153]))
    bl_yt = int(parse_num(r[154]))
    
    ty_tot = int(parse_num(r[160]))
    
    jml_area = int(parse_num(r[162]))
    jml_yl = int(parse_num(r[163]))
    akm_jwp = int(parse_num(r[167]))
    s_yl = int(parse_num(r[168]))
    absen = int(parse_num(r[173]))
    frek = int(parse_num(r[174]))
    
    l250 = int(parse_num(r[189]))
    l300 = int(parse_num(r[191]))

    tku_obj = {
        "id": idx + 1,
        "nama": name,
        "rayon": rayon,
        "targetHarian": tg_harian,
        "penjualanAkm": [yo_akm, om_akm, os_akm, yt_akm],
        "aktif": True,
        "pic": pics[idx],
        "alamat": alamats[idx],
        "hp": f"0812-3456-78{idx:02d}",
        "jumlahArea": jml_area,
        "jumlahYl": jml_yl,
        "coverageArea": round(jml_yl / jml_area, 3) if jml_area > 0 else 1.0,
        "jumlahYlLy": jml_yl,
        "diffYl": 0,
        "akmJwp": akm_jwp,
        "sYl": s_yl,
        "absenYl": absen,
        "frekuensiAbsen": frek,
        "l250": l250,
        "l300": l300
    }
    initial_tkus.append(tku_obj)
    
    target_bl.append(bl_tot)
    target_ty.append(ty_tot)
    
    target_variant_yo[idx] = {"tg": tg_yo, "bl": bl_yo, "ty": tg_yo}
    target_variant_om[idx] = {"tg": tg_om, "bl": bl_om, "ty": tg_om}
    target_variant_os[idx] = {"tg": tg_os, "bl": bl_os, "ty": tg_os}
    target_variant_yt[idx] = {"tg": tg_yt, "bl": bl_yt, "ty": tg_yt}

    # Extract daily PJD
    for day in range(1, 31):
        c_yo = int(parse_num(r[4 + (day-1)*4]))
        c_om = int(parse_num(r[5 + (day-1)*4]))
        c_os = int(parse_num(r[6 + (day-1)*4]))
        c_yt = int(parse_num(r[7 + (day-1)*4]))
        sold = c_yo + c_om + c_os + c_yt
        
        date_str = f"2026-09-{day:02d}"
        if date_str not in pjd_data:
            pjd_data[date_str] = {}
        pjd_data[date_str][str(idx)] = {
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

print("Generated initial_tkus count:", len(initial_tkus))
print("Generated target_bl:", target_bl)
print("Generated target_ty:", target_ty)

# Save json files for inspection or embedding
with open('parsed_tkus.json', 'w') as f:
    json.dump(initial_tkus, f, indent=2)

with open('parsed_pjd.json', 'w') as f:
    json.dump(pjd_data, f, indent=2)

with open('parsed_targets.json', 'w') as f:
    json.dump({
        "bl": target_bl,
        "ty": target_ty,
        "yo": target_variant_yo,
        "om": target_variant_om,
        "os": target_variant_os,
        "yt": target_variant_yt
    }, f, indent=2)

