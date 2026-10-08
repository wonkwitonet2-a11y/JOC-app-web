import re
import json

bb_list = [
    [5915, 1275, 1620, 945],    # JEMBER
    [4725, 1090, 2585, 1955],   # JEMBER 2
    [3675, 2395, 5705, 1830],   # TAWANGALUN
    [5195, 235, 270, 235],      # DP JEMBER 1
    [9095, 570, 670, 725],      # DP JEMBER 4
    [1860, 210, 175, 155],      # PELITA
    [710, 375, 460, 480],       # DAWUHAN
    [15, 20, 75, 50],           # KALISAT
    [0, 0, 0, 0],               # DP JEMBER 2
    [0, 0, 0, 0]                # DP JEMBER 3
]

with open('src/data/initialData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract INITIAL_TKUS JSON match
match = re.search(r'export const INITIAL_TKUS: TkuItem\[\] = (\[.*?\]);', text, re.DOTALL)
if match:
    tkus = json.loads(match.group(1))
    for idx, t in enumerate(tkus):
        if idx < len(bb_list):
            t['bbAkm'] = bb_list[idx]
    
    new_tkus_str = "export const INITIAL_TKUS: TkuItem[] = " + json.dumps(tkus, indent=2) + ";"
    text = text[:match.start()] + new_tkus_str + text[match.end():]
    
    with open('src/data/initialData.ts', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated INITIAL_TKUS with bbAkm!")

