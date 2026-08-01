// Static builder. `node build.mjs` writes dist/index.html plus a page per map
// (dist/<mapId>.html, opening on that map) — self-contained single files.
// `node build.mjs --artifact <path>` writes the body-only bundle for hosting.
// No dependencies.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const read = f => readFileSync(new URL('./' + f, import.meta.url), 'utf8');
const SCRIPTS = ['engine.js', 'data.js', 'view.js'];

function bundle(startMap) {
  let html = read('index.html');
  html = html.replace(/<link rel="stylesheet" href="style\.css[^"]*">/,
    () => '<style>\n' + read('style.css') + '</style>');
  for (const src of SCRIPTS) {
    const js = read(src);
    html = html.replace(new RegExp('<script src="' + src.replace('.', '\\.') + '[^"]*"></scr' + 'ipt>'),
      () => '<script>\n' + js + '</scr' + 'ipt>');
  }
  if (startMap) {
    html = html.replace('<script>\n  window.demo',
      "<script>\n  window.__START_MAP = '" + startMap + "';\n  window.demo");
  }
  return html;
}

const artifactAt = process.argv.indexOf('--artifact');
if (artifactAt >= 0) {
  const out = process.argv[artifactAt + 1];
  const full = bundle();
  const head = full.split('<head>')[1].split('</head>')[0]
    .match(/<style>[\s\S]*?<\/style>/g).join('\n');
  const body = full.split(/<body>\s*/)[1].split(/\s*<\/body>/)[0];
  writeFileSync(out, '<title>Fan-Out Graph</title>\n' + head + '\n' + body);
  console.log('artifact bundle →', out);
} else {
  // map ids come from the data file itself — the builder is dataset-blind too
  const ids = new Function(read('data.js') + '; return MAPS.map(m => m.id);')();
  mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
  writeFileSync(new URL('./dist/index.html', import.meta.url), bundle());
  for (const id of ids) {
    writeFileSync(new URL('./dist/' + id + '.html', import.meta.url), bundle(id));
  }
  console.log('dist/index.html +', ids.map(i => 'dist/' + i + '.html').join(' + '));
}
