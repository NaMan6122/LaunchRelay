import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

const MOCK_MATCH = {
  match: {
    id: 'mock-startup-001',
    name: 'Acme Corp',
    one_line_pitch: 'AI-powered platform for modern teams',
    url: 'https://acme.example.com',
    logo_url: '',
    category: ['saas', 'ai'],
  },
  impression_id: 'imp_test_001',
};

createServer((req, res) => {
  // ── API endpoints ────────────────────────────────────────────────
  if (req.url.startsWith('/v1/match') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(MOCK_MATCH));
    return;
  }

  if (req.url === '/v1/impressions' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      console.log('Beacon received:', body);
      res.writeHead(200);
      res.end('ok');
    });
    return;
  }

  // ── Static files ─────────────────────────────────────────────────
  const filePath = join(ROOT, req.url === '/' ? '/test/index.html' : req.url);
  try {
    const content = readFileSync(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(3001, () => {
  console.log('Test server running on http://localhost:3001');
});
