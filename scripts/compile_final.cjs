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

// Mapping for SEPT 26
const sept26Rows = [
  { r: 4, name: 'JEMBER', rayon: 1 },
  { r: 5, name: 'JEMBER 2', rayon: 1 },
  { r: 6, name: 'TAWANGALUN', rayon: 1 },
  { r: 7, name: 'DP JEMBER 1', rayon: 1 },
  { r: 8, name: 'DP JEMBER 4', rayon: 1 },
  { r: 12, name: 'SUBTOTAL RAYON 1', rayon: 1, isTotal: true },
  { r: 13, name: 'PELITA', rayon: 2 },
  { r: 14, name: 'DAWUHAN', rayon: 2 },
  { r: 15, name: 'KALISAT', rayon: 2 },
  { r: 16, name: 'DP JEMBER 2', rayon: 2 },
  { r: 17, name: 'DP JEMBER 3', rayon: 2 },
  { r: 23, name: 'SUBTOTAL RAYON 2', rayon: 2, isTotal: true },
  { r: 24, name: 'TOTAL CABANG JEMBER', rayon: 0, isTotal: true }
];

// Let us find the matching row in sept25 for each TKU
function findSept25Row(name) {
  for (let r = 4; r < sept25.length; r++) {
    const n = sept25[r]?.[2]?.trim()?.toUpperCase();
    if (!n) continue;
    if (n === name.toUpperCase()) return sept25[r];
    if (name === 'DP JEMBER 4' && n.includes('JEMPAT 4')) return sept25[r];
    if (name === 'SUBTOTAL RAYON 1' && sept25[r]?.[1]?.trim() === 'RAYON 1') return sept25[r];
    if (name === 'SUBTOTAL RAYON 2' && sept25[r]?.[1]?.trim() === 'RAYON 2') return sept25[r];
    if (name === 'TOTAL CABANG JEMBER' && (sept25[r]?.[1]?.trim() === 'Pjl Harian' || sept25[r]?.[2]?.trim() === 'Pjl Harian')) return sept25[r];
  }
  return null;
}

// In AGS 26 (Agustus 2026):
// Col 97: ORI Akm, 98: ORI Rata
// Col 99: OM Akm, 100: OM Rata
// Col 101: OS Akm, 102: OS Rata
// Col 103: YT Akm, 104: YT Rata
// Col 105: Akm Penjualan Total, Col 106: Rata Pjl Harian Total
function findAgs26Row(name) {
  for (let r = 4; r < ags26.length; r++) {
    const n = ags26[r]?.[2]?.trim()?.toUpperCase();
    if (!n) continue;
    if (n === name.toUpperCase()) return ags26[r];
    if (name === 'SUBTOTAL RAYON 1' && ags26[r]?.[1]?.trim() === 'RAYON 1') return ags26[r];
    if (name === 'SUBTOTAL RAYON 2' && ags26[r]?.[1]?.trim() === 'RAYON 2') return ags26[r];
    if (name === 'TOTAL CABANG JEMBER' && (ags26[r]?.[1]?.trim() === 'Pjl Harian' || ags26[r]?.[2]?.trim() === 'Pjl Harian')) return ags26[r];
  }
  return null;
}

const tableData = [];

for (const t of sept26Rows) {
  const row26 = sept26[t.r];
  const row25 = findSept25Row(t.name);
  const rowAgs = findAgs26Row(t.name);

  // Target Sept 2026 (daily bottles)
  const tgDaily = row26[3];
  const tgOri = row26[139];
  const tgOm = row26[141];
  const tgOs = row26[143];
  const tgYt = row26[145];

  // Bulan Lalu (Agustus 2026) from SEPT 26 summary columns:
  const blDaily = row26[150];
  const blOri = row26[151];
  const blOm = row26[152];
  const blOs = row26[153];
  const blYt = row26[154];

  // Tahun Lalu (September 2025) from SEPT 26:
  const tlDaily = row26[160];

  // Detailed from sept25 if available:
  // Col 97: ORI Akm, 98: ORI Rata
  // Col 99: OM Akm, 100: OM Rata
  // Col 101: YT Akm, 102: YT Rata
  // Col 103: Total Akm, 104: Total Rata
  let tlOriRata = '-', tlOmRata = '-', tlYtRata = '-', tlTotRata = tlDaily;
  let tlOriAkm = '-', tlOmAkm = '-', tlYtAkm = '-', tlTotAkm = '-';
  if (row25) {
    tlOriAkm = row25[97] || '-';
    tlOriRata = row25[98] || '-';
    tlOmAkm = row25[99] || '-';
    tlOmRata = row25[100] || '-';
    tlYtAkm = row25[101] || '-';
    tlYtRata = row25[102] || '-';
    tlTotAkm = row25[103] || '-';
    tlTotRata = row25[104] || tlDaily;
  }

  tableData.push({
    name: t.name,
    rayon: t.rayon,
    isTotal: t.isTotal || false,
    target: {
      daily: tgDaily,
      ori: tgOri,
      om: tgOm,
      os: tgOs,
      yt: tgYt
    },
    bulanLalu: {
      daily: blDaily,
      ori: blOri,
      om: blOm,
      os: blOs,
      yt: blYt
    },
    tahunLalu: {
      daily: tlDaily,
      oriRata: tlOriRata,
      omRata: tlOmRata,
      ytRata: tlYtRata,
      totRata: tlTotRata,
      oriAkm: tlOriAkm,
      omAkm: tlOmAkm,
      ytAkm: tlYtAkm,
      totAkm: tlTotAkm
    }
  });
}

fs.writeFileSync('tmp/final_summary.json', JSON.stringify(tableData, null, 2));
console.log('Successfully compiled final summary data!');
