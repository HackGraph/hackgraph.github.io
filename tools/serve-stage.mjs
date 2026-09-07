import './prepare-site.mjs';
process.env.HG_SITE_DIR = new URL('../.site/', import.meta.url).pathname;
process.env.HG_PORT = '5183';
await import('./serve.mjs');
