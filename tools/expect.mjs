/**
 * The handful of `expect` matchers this repo's tests actually use, on top of node:assert.
 *
 * The tests were written against vitest. Rather than rewrite 53 assertions into assert
 * calls, this keeps them readable and lets `node --test` run them with nothing installed.
 * Add a matcher here when a test needs one; do not reach for a framework.
 */
import assert from 'node:assert/strict';

const type = v => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

/** Deep "contains": every key in `want` matches in `got`, extra keys in `got` are fine. */
function subset(got, want, path = '') {
  for (const [k, v] of Object.entries(want)) {
    const at = path ? `${path}.${k}` : k;
    if (v && type(v) === 'object') subset(got?.[k], v, at);
    else assert.deepStrictEqual(got?.[k], v, `at ${at}`);
  }
}

function matchers(got, negate) {
  const check = (pass, msg) =>
    assert.ok(negate ? !pass : pass, `expected ${JSON.stringify(got)?.slice(0, 120)} ${negate ? 'NOT ' : ''}${msg}`);
  return {
    toBe: w => (negate ? assert.notStrictEqual(got, w) : assert.strictEqual(got, w)),
    toEqual: w => (negate ? assert.notDeepStrictEqual(got, w) : assert.deepStrictEqual(got, w)),
    toContain: w => check(got?.includes?.(w), `to contain ${JSON.stringify(w)}`),
    toHaveLength: n => check(got?.length === n, `to have length ${n} (got ${got?.length})`),
    toBeGreaterThan: n => check(got > n, `to be > ${n}`),
    toBeLessThan: n => check(got < n, `to be < ${n}`),
    toBeTruthy: () => check(!!got, 'to be truthy'),
    toBeDefined: () => check(got !== undefined, 'to be defined'),
    toBeUndefined: () => check(got === undefined, 'to be undefined'),
    toMatchObject: w => subset(got, w),
    toThrow: re => {
      if (negate) return assert.doesNotThrow(got);
      assert.throws(got, re ? (re instanceof RegExp ? re : new RegExp(re)) : undefined);
    },
  };
}

export function expect(got) {
  return { ...matchers(got, false), not: matchers(got, true) };
}
