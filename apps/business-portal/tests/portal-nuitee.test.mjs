import test from 'node:test';
import assert from 'node:assert/strict';
import { checkNuiteeKey } from '../nuitee.mjs';

const fakeKey = 'test-only-not-a-real-provider-key';
const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

test('connection check makes one fixed read, returns only status and does not follow redirects', async () => {
  let calls = 0;
  const result = await checkNuiteeKey(fakeKey, { fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.liteapi.travel/v3.0/data/currencies');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers['X-API-Key'], fakeKey);
    assert.equal(options.redirect, 'error');
    assert.equal(options.body, undefined);
    return json({ data: [{ code: 'CAD', currency: 'Canadian Dollar' }] });
  } });
  assert.equal(calls, 1);
  assert.deepEqual(result, { status: 'verified' });
});

test('rejected credentials are distinct from rate limits, outages and malformed successes', async () => {
  for (const status of [401, 403, 429, 500, 302]) {
    assert.deepEqual(await checkNuiteeKey(fakeKey, { fetchImpl: async () => new Response(fakeKey, { status }) }),
      { status: [401, 403].includes(status) ? 'rejected' : 'unavailable' });
  }
  for (const body of [{}, { data: [] }, { error: fakeKey, data: [{ code: 'CAD' }] }, { data: [{ code: '<script>' }] }]) {
    assert.deepEqual(await checkNuiteeKey(fakeKey, { fetchImpl: async () => json(body) }), { status: 'unavailable' });
  }
  assert.deepEqual(await checkNuiteeKey(fakeKey, { fetchImpl: async () => new Response('<html>login</html>') }), { status: 'unavailable' });
  assert.deepEqual(await checkNuiteeKey(fakeKey, { fetchImpl: async () => { throw new Error(fakeKey); } }), { status: 'unavailable' });
});

test('connection check bounds streamed responses even without content length', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(64 * 1024)); },
    cancel() { cancelled = true; },
  });
  assert.deepEqual(await checkNuiteeKey(fakeKey, {
    fetchImpl: async () => new Response(stream, { headers: { 'Content-Type': 'application/json' } }),
  }), { status: 'unavailable' });
  assert.equal(cancelled, true);
});

test('connection timeout aborts both the request and a stalled response body', async () => {
  // Keep the fake transport alive like a socket while the production timeout is unref'd.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    let requestAborted = false;
    assert.deepEqual(await checkNuiteeKey(fakeKey, { timeoutMs: 15, fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => { requestAborted = true; reject(new Error('aborted')); });
    }) }), { status: 'unavailable' });
    assert.equal(requestAborted, true);
    assert.deepEqual(await checkNuiteeKey(fakeKey, { timeoutMs: 15, fetchImpl: async (_url, { signal }) => {
      const stream = new ReadableStream({ start(controller) {
        signal.addEventListener('abort', () => controller.error(new Error('aborted')));
      } });
      return new Response(stream, { headers: { 'Content-Type': 'application/json' } });
    } }), { status: 'unavailable' });
  } finally { clearInterval(keepAlive); }
});

test('invalid keys never reach a transport', async () => {
  for (const key of ['', null, 'key\r\nInjected: yes', 'a'.repeat(4097)]) {
    const result = await checkNuiteeKey(key, { fetchImpl: () => assert.fail('must not fetch') });
    assert.deepEqual(result, { status: 'rejected' });
  }
});
