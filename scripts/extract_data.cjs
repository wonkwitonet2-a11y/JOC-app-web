const https = require('https');
const fs = require('fs');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetch(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

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

async function main() {
  console.log('Downloading SEPT 26...');
  const sept26Csv = await fetch('https://docs.google.com/spreadsheets/d/1USRsNejxUBcLIUPmwuMIm_A1AMwGx6swgef4Ch5H0Vw/export?format=csv&gid=2033046625');
  fs.writeFileSync('tmp/sept26.csv', sept26Csv);

  const rows = parseCSV(sept26Csv);
  console.log(`SEPT 26: ${rows.length} rows, row 1 has ${rows[1]?.length} cols`);

  // Let us inspect the columns in rows 0-3
  fs.writeFileSync('tmp/sept26_parsed.json', JSON.stringify(rows.slice(0, 30), null, 2));

  // Let us see the structure of columns
  const colInfo = [];
  for (let c = 0; c < (rows[1]?.length || 0); c++) {
    const r0 = rows[0]?.[c] || '';
    const r1 = rows[1]?.[c] || '';
    const r2 = rows[2]?.[c] || '';
    const r3 = rows[3]?.[c] || '';
    if (r0 || r1 || r2 || r3) {
      colInfo.push({ col: c, r0, r1, r2, r3 });
    }
  }
  fs.writeFileSync('tmp/sept26_cols.json', JSON.stringify(colInfo, null, 2));
  console.log('Saved colInfo, total cols:', colInfo.length);
}

main().catch(console.error);
