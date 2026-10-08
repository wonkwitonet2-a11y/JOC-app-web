import re, json

with open('src/data/initialArchivesData.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's inspect rows in INITIAL_ARCHIVES['2026-08'] or '2026-09'
m = re.search(r'export const INITIAL_ARCHIVES: Record<string, ArchiveRecord> = (\{.*?\});', code, re.DOTALL)
if m:
    arc_json = m.group(1)
    # clean trailing commas
    arc_json = re.sub(r',(\s*[\}\]])', r'\1', arc_json)
    arcs = json.loads(arc_json)
    print("Archive keys:", list(arcs.keys()))
    
    for key in ['2026-08']:
        if key in arcs:
            rows = arcs[key]['rows']
            tot_jwp = sum(r.get('akmJwp', 0) for r in rows)
            tot_absen = sum(r.get('absenYl', 0) for r in rows)
            tot_frek = sum(r.get('frekuensiAbsen', 0) for r in rows)
            tot_bb = sum(r.get('akmBb', 0) for r in rows)
            tot_sold = sum(r.get('total', 0) for r in rows)
            avg_syl = round(tot_sold / tot_jwp) if tot_jwp > 0 else 0
            
            print(f"\n--- Archive {key} ---")
            print(f"Total JWP: {tot_jwp}")
            print(f"Total Absen: {tot_absen}")
            print(f"Total Frek: {tot_frek}")
            print(f"Total BB: {tot_bb}")
            print(f"Total Sold: {tot_sold}")
            print(f"Avg S/YL: {avg_syl}")
else:
    print("Could not match INITIAL_ARCHIVES")

