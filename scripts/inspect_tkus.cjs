const fs = require('fs');

const csv = fs.readFileSync('tmp/sept26.csv', 'utf8');

function parseCSV(csv) {
  const lines = csv.split('\n');
  return lines.map(line => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  });
}

const rows = parseCSV(csv);

// Col indexes based on our earlier col headers:
// Col 2: Center/TKU Name
// Col 3: AKM Target Penjualan (Target Harian)
// Col 139: Target PJL ORI
// Col 141: Target PJL OM
// Col 143: Target PJL OS
// Col 145: Target PJL YT
// Col 150: Pjl Bln Lalu (Total)
// Col 151: PJL Bln Lalu ORI
// Col 152: PJL Bln Lalu OM
// Col 153: PJL Bln Lalu OS
// Col 154: PJL Bln Lalu YT
// Col 160: Pjl Thn Lalu (Total)

console.log('--- INSPECTION OF ROWS 4 to 24 in SEPT 26 ---');
const tkus = [];
for (let r = 4; r <= 24; r++) {
  const row = rows[r];
  if (!row) continue;
  const no = row[1];
  const name = row[2];
  const targetHarian = row[3];
  
  const tgOri = row[139];
  const tgOm = row[141];
  const tgOs = row[143];
  const tgYt = row[145];

  const blTotal = row[150];
  const blOri = row[151];
  const blOm = row[152];
  const blOs = row[153];
  const blYt = row[154];

  const tlTotal = row[160];

  console.log(`Row ${r}: [${no}] ${name} | Target: ${targetHarian} | Tg(ORI/OM/OS/YT): ${tgOri}/${tgOm}/${tgOs}/${tgYt} | BL(Tot,ORI/OM/OS/YT): ${blTotal} [${blOri}, ${blOm}, ${blOs}, ${blYt}] | TL: ${tlTotal}`);
}
