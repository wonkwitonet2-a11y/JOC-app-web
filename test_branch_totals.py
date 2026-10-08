import re

with open('src/data/initialData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Match everything inside export const INITIAL_TKUS = [...]
start_idx = content.find('export const INITIAL_TKUS')
end_idx = content.find('export const INITIAL_TARGET_BL')
tkus_text = content[start_idx:end_idx]

# Match each object { ... }
objects = re.findall(r'\{\s*id:.*?\n  \}', tkus_text, re.DOTALL)
print(f"Found {len(objects)} TKU objects")

tot_pdm = [0,0,0,0]
tot_jwp = 0
tot_absen = 0
tot_frek = 0
tot_syl = 0
tot_bb = [0,0,0,0]

for b in objects:
    nama_m = re.search(r'nama:\s*[\'"]([^\'"]+)[\'"]', b)
    nama = nama_m.group(1) if nama_m else 'Unknown'
    
    pjl_m = re.search(r'penjualanAkm:\s*\[([^\]]+)\]', b)
    pjl = [int(x.strip()) for x in pjl_m.group(1).split(',')] if pjl_m else [0,0,0,0]
    
    jwp_m = re.search(r'akmJwp:\s*(\d+)', b)
    jwp = int(jwp_m.group(1)) if jwp_m else 0
    
    absen_m = re.search(r'absenYl:\s*(\d+)', b)
    absen = int(absen_m.group(1)) if absen_m else 0
    
    frek_m = re.search(r'frekuensiAbsen:\s*(\d+)', b)
    frek = int(frek_m.group(1)) if frek_m else 0
    
    syl_m = re.search(r'sYl:\s*(\d+)', b)
    syl = int(syl_m.group(1)) if syl_m else 0
    
    bb_m = re.search(r'bbHarian:\s*\[([^\]]+)\]', b)
    bb = [int(x.strip()) for x in bb_m.group(1).split(',')] if bb_m else [0,0,0,0]
    
    print(f"{nama:15s} | Pjl sum={sum(pjl):7d} | JWP={jwp:5d} | Absen={absen:3d} | Frek={frek:3d} | sYl={syl:5d} | BB sum={sum(bb):6d}")
    
    for i in range(4):
        tot_pdm[i] += pjl[i]
        tot_bb[i] += bb[i]
    tot_jwp += jwp
    tot_absen += absen
    tot_frek += frek
    tot_syl += syl

print("\n--- CURRENT INITIAL_TKUS TOTALS IN initialData.ts ---")
print(f"1. Akm JWP Cabang: {tot_jwp}")
print(f"2. Absen Cabang: {tot_absen}, Frek: {tot_frek}")
print(f"3. S/YL Cabang: {tot_syl}")
print(f"4. Akm PDM Total Cabang: {sum(tot_pdm)} (per variant: {tot_pdm})")
print(f"5. Akm BB Total Cabang: {sum(tot_bb)} (per variant: {tot_bb})")
