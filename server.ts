import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

const distPath = path.join(__dirname, 'dist');

// Aturan cache supaya setiap publish ulang LANGSUNG sampai ke WebView/APK:
// - index.html & version.json: tidak boleh di-cache (selalu ambil yang terbaru)
// - /assets/*: nama file ber-hash, aman di-cache lama
const NO_CACHE = 'no-store, no-cache, must-revalidate, max-age=0';
function setCacheHeaders(res: express.Response, filePath: string) {
  const base = path.basename(filePath);
  if (base === 'index.html' || base === 'version.json') {
    res.setHeader('Cache-Control', NO_CACHE);
  } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { index: false, setHeaders: setCacheHeaders }));
}

app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// File statis yang tidak ada (mis. aset lama) jangan dijawab dengan index.html
app.get(['/assets/*', '/version.json'], (_req, res) => {
  res.status(404).set('Cache-Control', NO_CACHE).send('Not found');
});

app.get('*', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', NO_CACHE);
    res.sendFile(indexPath);
  } else {
    res.status(200).send('OK');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
