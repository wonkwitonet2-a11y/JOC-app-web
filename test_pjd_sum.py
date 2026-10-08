import re, json

with open('src/data/initialData.ts', 'r', encoding='utf-8') as f:
    code = f.read()

m = re.search(r'export const INITIAL_PJD: Record<string, Record<number, DailySalesRecord>> = (\{.*?\});\n\nexport const INITIAL_QUOTES', code, re.DOTALL)
if m:
    pjd = json.loads(m.group(1))
    print(f"PJD dates count: {len(pjd.keys())}")
    
    tot_pjl = 0
    tot_bb = 0
    tot_absen = 0
    tot_frek = 0
    
    for date_str, tkus in pjd.items():
        for tku_idx, rec in tkus.items():
            if 'v' in rec and isinstance(rec['v'], list):
                tot_pjl += sum(rec['v'])
            if 'bb' in rec:
                tot_bb += rec['bb']
            if 'absen' in rec:
                tot_absen += rec['absen']
            if 'frek' in rec:
                tot_frek += rec['frek']
                
    print(f"Total PJD Sales: {tot_pjl}")
    print(f"Total PJD BB: {tot_bb}")
    print(f"Total PJD Absen: {tot_absen}")
    print(f"Total PJD Frek: {tot_frek}")
else:
    print("Could not match INITIAL_PJD")
