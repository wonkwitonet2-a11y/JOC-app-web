import json
import re

with open('parsed_tkus.json') as f:
    parsed_tkus = json.load(f)

with open('parsed_pjd.json') as f:
    parsed_pjd = json.load(f)

with open('parsed_targets.json') as f:
    parsed_targets = json.load(f)

# Format INITIAL_TKUS ts string
tkus_ts = "export const INITIAL_TKUS: TkuItem[] = " + json.dumps(parsed_tkus, indent=2) + ";\n"

# Format INITIAL_PJD ts string
pjd_ts = "export const INITIAL_PJD: Record<string, Record<number, DailySalesRecord>> = " + json.dumps(parsed_pjd, indent=2) + ";\n"

# Read initialData.ts
with open('src/data/initialData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace INITIAL_TKUS
content = re.sub(r'export const INITIAL_TKUS: TkuItem\[\] = \[.*?\];', tkus_ts.strip(), content, flags=re.DOTALL)

# Update TARGET_BL and TARGET_TY
bl_str = f"export const INITIAL_TARGET_BL = {json.dumps(parsed_targets['bl'])};"
ty_str = f"export const INITIAL_TARGET_TY = {json.dumps(parsed_targets['ty'])};"

content = re.sub(r'export const INITIAL_TARGET_BL = \[.*?\];', bl_str, content)
content = re.sub(r'export const INITIAL_TARGET_TY = \[.*?\];', ty_str, content)

# Append INITIAL_PJD to initialData.ts if not present
if "export const INITIAL_PJD" not in content:
    content += "\n\n" + pjd_ts

with open('src/data/initialData.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated src/data/initialData.ts successfully!")

