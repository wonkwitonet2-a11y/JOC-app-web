import json, re

with open('src/data/initialData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'export const INITIAL_TKUS: TkuItem\[\] = (\[.*?\]);', content, re.DOTALL)
if m:
    tkus = json.loads(m.group(1))
    print(f"Loaded {len(tkus)} TKUs")
    
    tot_pdm = [0,0,0,0]
    tot_jwp = 0
    tot_absen = 0
    tot_frek = 0
    tot_syl = 0
    tot_bb = [0,0,0,0]
    
    print("\n--- INDIVIDUAL TKU BREAKDOWN IN initialData.ts ---")
    for t in tkus:
        nama = t['nama']
        pjl = t['penjualanAkm']
        jwp = t['akmJwp']
        absen = t.get('absenYl', 0)
        frek = t.get('frekuensiAbsen', 0)
        syl = t.get('sYl', 0)
        bb = t.get('bbAkm', t.get('bbHarian', [0,0,0,0]))
        
        print(f"{nama:15s} | Pjl Sum={sum(pjl):7d} | JWP={jwp:5d} | Absen={absen:2d} | Frek={frek:2d} | sYl={syl:5d} | BB Sum={sum(bb):6d} (bb={bb})")
        
        for i in range(4):
            tot_pdm[i] += pjl[i]
            tot_bb[i] += bb[i]
        tot_jwp += jwp
        tot_absen += absen
        tot_frek += frek
        tot_syl += syl

    print("\n--- SUM OF INITIAL_TKUS IN initialData.ts ---")
    print(f"1. Akm JWP Cabang: {tot_jwp}")
    print(f"2. Absen Cabang: {tot_absen}, Frek: {tot_frek}")
    print(f"3. S/YL Cabang: {tot_syl}")
    print(f"4. Akm PDM Total Cabang: {sum(tot_pdm)} (per variant: {tot_pdm})")
    print(f"5. Akm BB Total Cabang: {sum(tot_bb)} (per variant: {tot_bb})")

