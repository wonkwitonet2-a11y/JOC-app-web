const fs = require('fs');

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

const sept26 = parseCSV(fs.readFileSync('tmp/sept26.csv', 'utf8'));
const ags26 = parseCSV(fs.readFileSync('tmp/ags26.csv', 'utf8'));
const sept25 = parseCSV(fs.readFileSync('tmp/september_ly.csv', 'utf8'));

console.log('=== SEPT 26 TKU ROWS ===');
const sept26Tkus = [];
// In sept26:
// Row 4: JEMBER (R1)
// Row 5: JEMBER 2 (R1)
// Row 6: TAWANGALUN (R1)
// Row 7: DP JEMBER 1 (R1)
// Row 8: DP JEMBER 4 (R1)
// Row 12: RAYON 1
// Row 13: PELITA (R2)
// Row 14: DAWUHAN (R2)
// Row 15: KALISAT (R2)
// Row 16: DP JEMBER 2 (R2)
// Row 17: DP JEMBER 3 (R2)
// Row 23: RAYON 2
// Row 24: Pjl Harian (CABANG)

const targetRows = [
  { r: 4, name: 'JEMBER', rayon: 1 },
  { r: 5, name: 'JEMBER 2', rayon: 1 },
  { r: 6, name: 'TAWANGALUN', rayon: 1 },
  { r: 7, name: 'DP JEMBER 1', rayon: 1 },
  { r: 8, name: 'DP JEMBER 4', rayon: 1 },
  { r: 12, name: 'TOTAL RAYON 1', rayon: 1, isTotal: true },
  { r: 13, name: 'PELITA', rayon: 2 },
  { r: 14, name: 'DAWUHAN', rayon: 2 },
  { r: 15, name: 'KALISAT', rayon: 2 },
  { r: 16, name: 'DP JEMBER 2', rayon: 2 },
  { r: 17, name: 'DP JEMBER 3', rayon: 2 },
  { r: 23, name: 'TOTAL RAYON 2', rayon: 2, isTotal: true },
  { r: 24, name: 'TOTAL CABANG JEMBER', rayon: 0, isTotal: true }
];

const results = [];

for (const item of targetRows) {
  const row = sept26[item.r];
  if (!row) continue;
  
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

  results.push({
    name: item.name,
    rayon: item.rayon,
    isTotal: item.isTotal || false,
    target: {
      total: targetHarian,
      ori: tgOri,
      om: tgOm,
      os: tgOs,
      yt: tgYt
    },
    bulanLalu: {
      total: blTotal,
      ori: blOri,
      om: blOm,
      os: blOs,
      yt: blYt
    },
    tahunLalu: {
      total: tlTotal
    }
  });
}

console.log(JSON.stringify(results, null, 2));

// Now let us also look at September 2025 (sept25) to see if we have per-item breakdown for Tahun Lalu!
console.log('=== SEPT 2025 INSPECTION FOR PER-ITEM TAHUN LALU ===');
for (let r = 0; r < Math.min(25, sept25.length); r++) {
  const row = sept25[r];
  console.log(`sept25 row ${r}: [col 1: ${row[1]}] [col 2: ${row[2]}] [col 3: ${row[3]}] [length: ${row.length}]`);
}
