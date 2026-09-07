import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkUrl, classify, collectUrls } from './check-refs.mjs';

test('link availability distinguishes inconclusive and failed responses', () => {
  assert.deepEqual([200, 403, 429, 0, 404, 410, 503].map(c => classify(c)),
    ['responded', 'blocked', 'blocked', 'unreachable', 'not-found', 'not-found', 'unavailable']);
  assert.equal(classify(200, 'https://example.org/404.html?lang=en'), 'not-found');
  assert.ok(collectUrls().length > 700);
});
test('HEAD failures retry GET, record redirects, and release response bodies', async () => {
  const methods = []; let cancelled = 0;
  const result = await checkUrl('https://example.org/old', { fetcher: async (url, opts) => {
    methods.push(opts.method);
    return { status: opts.method === 'HEAD' ? 405 : 200, url: 'https://example.org/new', body: { cancel() { cancelled++; } } };
  } });
  assert.deepEqual(methods, ['HEAD', 'GET']); assert.equal(cancelled, 2);
  assert.equal(result.status, 'responded'); assert.equal(result.finalUrl, 'https://example.org/new');
  const failed = await checkUrl('https://example.org/', { fetcher: async () => { throw new Error('network'); } });
  assert.equal(failed.status, 'unreachable'); assert.equal(failed.code, 0);
});

test('access diagnostics preserve TLS and timeout failures without bypassing validation', async () => {
  const expired = new TypeError('fetch failed', { cause: { code: 'CERT_HAS_EXPIRED' } });
  const result = await checkUrl('https://example.org/', { fetcher: async () => { throw expired; } });
  assert.equal(result.status, 'unreachable');
  assert.deepEqual(result.attempts.map(a => [a.method, a.error.code]), [['HEAD', 'CERT_HAS_EXPIRED'], ['GET', 'CERT_HAS_EXPIRED']]);
  const mixed = await checkUrl('https://example.org/', { fetcher: async (url, { method }) => {
    if (method === 'HEAD') return { status: 403, url };
    throw new DOMException('Timed out', 'TimeoutError');
  } });
  assert.equal(mixed.attempts[0].code, 403);
  assert.equal(mixed.attempts[1].error.name, 'TimeoutError');
  assert.equal(mixed.status, 'unreachable');
});
