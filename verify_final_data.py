import json, re

with open('src/data/initialData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'export const INITIAL_TKUS: TkuItem\[\] = (\[.*?\]);', content, re.DOTALL)
if m:
    tkus = json.loads(m.group(1))
    
    tot_jwp = sum(t['akmJwp'] for t in tkus)
    tot_absen = sum(t.get('absenYl', 0) for t in tkus)
    tot_frek = sum(t.get('frekuensiAbsen', 0) for t in tkus)
    tot_pdm = sum(sum(t['penjualanAkm']) for t in tkus)
    
    tot_bb_v = [0,0,0,0]
    for t in tkus:
        bb = t.get('bbAkm', [0,0,0,0])
        for j in range(4): tot_bb_v[j] += bb[j]
        
    tot_bb = sum(tot_bb_v)
    syl_cabang = round(tot_pdm / tot_jwp) if tot_jwp > 0 else 0
    
    print("=== VERIFICATION OF INITIAL_TKUS IN initialData.ts ===")
    print(f"1. Akm JWP Cabang: {tot_jwp}")
    print(f"2. Absen Cabang: {tot_absen}, Frek: {tot_frek}")
    print(f"3. S/YL Cabang: {syl_cabang}")
    print(f"4. Akm PDM Total Cabang: {tot_pdm}")
    print(f"5. Akm BB Total Cabang: {tot_bb} (YO={tot_bb_v[0]}, OM={tot_bb_v[1]}, OS={tot_bb_v[2]}, YT={tot_bb_v[3]})")

