#!/usr/bin/env node
// Static server for local development. There is no build step: this serves the repository
// exactly as GitHub Pages does, so what you see here is what ships.
//   node tools/serve.mjs        ->  http://localhost:5173
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[/\\]$/, '');
const PORT = Number(process.env.PORT || 5173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = join(ROOT, normalize(url));
  // join+normalize already collapse '..'; refuse anything that still lands outside the repo
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return res.writeHead(403).end('forbidden');
  if (url.endsWith('/')) file = join(file, 'index.html');
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream',
                         'cache-control': 'no-cache' }).end(body);
  } catch {
    try {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
         .end(await readFile(join(ROOT, '404.html')));
    } catch { res.writeHead(404).end('not found'); }
  }
}).listen(PORT, '127.0.0.1', () => console.log(`hackgraph on http://localhost:${PORT}`));
