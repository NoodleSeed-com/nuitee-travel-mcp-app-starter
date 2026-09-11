import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createPortalServer } from '../server.mjs';
import { sessionHash } from '../store.mjs';
import { createHash } from 'node:crypto';
import { canonicalJson } from '../releases.mjs';

const account = { name: 'Test Owner', email: 'owner@example.test', password: 'fictional owner password 2026', businessName: 'North Star Travel' };
const login = { email: account.email, password: account.password };
const fakeKey = 'fictional_nuitee_secret_for_offline_tests';

async function listen(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return `http://127.0.0.1:${server.address().port}`;
}

async function stop(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function requestWithHost(origin, path, host) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(`${origin}${path}`, { headers: { Host: host } }, (response) => {
      response.resume();
      response.once('end', () => resolve({ status: response.statusCode, headers: response.headers }));
    });
    request.once('error', reject);
    request.end();
  });
}

async function fixture(t, options = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), 'portal-server-test-'));
  let server = createPortalServer({ dataDir, checkKey: async () => ({ status: 'verified' }), ...options });
  let origin = await listen(server);
  let cookie = '', csrf = '';
  t.after(async () => { await stop(server); await rm(dataDir, { recursive: true, force: true }); });
  const api = {
    get server() { return server; }, get origin() { return origin; }, dataDir,
    get cookie() { return cookie; }, get csrf() { return csrf; },
    async restart() {
      await stop(server);
      server = createPortalServer({ dataDir, checkKey: async () => ({ status: 'verified' }), ...options });
      origin = await listen(server);
    },
    async request(path, { method = 'GET', body, rawBody, headers = {}, authenticated = true } = {}) {
      const outgoing = {
        ...(authenticated && cookie ? { Cookie: cookie } : {}),
        ...(method !== 'GET' && method !== 'HEAD' ? { Origin: origin, 'Content-Type': 'application/json', ...(authenticated && csrf ? { 'X-CSRF-Token': csrf } : {}) } : {}),
        ...headers,
      };
      for (const [key, value] of Object.entries(outgoing)) if (value === null) delete outgoing[key];
      const response = await fetch(`${origin}${path}`, {
        method, headers: outgoing, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        ...(rawBody !== undefined ? { body: rawBody } : {}), redirect: 'manual',
      });
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch { result = text; }
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      if (result?.csrfToken) csrf = result.csrfToken;
      return { status: response.status, body: result, text, headers: response.headers };
    },
    async setup() {
      const result = await api.request('/api/setup', { method: 'POST', body: account });
      assert.equal(result.status, 200);
      return result;
    },
    async workspace() {
      const result = await api.request('/api/workspace');
      assert.equal(result.status, 200);
      return result.body;
    },
  };
  return api;
}

test('one named owner protects workspace and operational data; no operational fixtures or launch endpoint', async (t) => {
  const portal = await fixture(t, { travelerUrl: 'http://localhost:3000' });
  assert.deepEqual((await portal.request('/api/session')).body, { setupRequired: true, user: null, csrfToken: null });
  for (const path of ['/api/workspace', '/api/bookings', '/api/analytics', '/api/conversations']) {
    assert.equal((await portal.request(path)).status, 401);
  }
  const setup = await portal.setup();
  assert.deepEqual(setup.body.user, { id: '1', name: account.name, email: account.email });
  assert.equal(setup.body.setupRequired, false);
  assert.match(setup.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  assert.doesNotMatch(setup.headers.get('set-cookie'), /Domain=/);
  assert.equal((await portal.request('/api/setup', { method: 'POST', body: { ...account, email: 'another@example.test' } })).status, 409);
  const workspace = await portal.workspace();
  assert.equal(workspace.settings.name, account.businessName);
  assert.deepEqual(workspace.knowledge, []);
  assert.equal(workspace.history.length, 1);
  assert.equal(workspace.history[0].title, 'Workspace created');
  assert.equal(workspace.runtime.status, 'not_connected');
  assert.equal(workspace.runtime.travelerUrl, 'http://localhost:3000/');
  assert.match(workspace.runtime.message, /not applied/);
  assert.deepEqual((await portal.request('/api/bookings')).body, { status: 'not_connected', bookings: [] });
  assert.deepEqual((await portal.request('/api/analytics')).body, { status: 'not_connected', metrics: null });
  assert.deepEqual((await portal.request('/api/conversations')).body, { status: 'not_connected', conversations: [] });
  assert.equal((await portal.request('/api/launch', { method: 'POST', body: {} })).status, 404);
});

test('reviewed releases freeze saved settings and approved knowledge without leaking credentials; survive restart', async (t) => {
  const portal = await fixture(t);
  await portal.setup();
  let workspace = await portal.workspace();
  workspace = (await portal.request('/api/knowledge', { method: 'POST', body: { revision: workspace.revision, title: 'Approved policy', kind: 'Policy', content: 'Call the business for support.' } })).body;
  const source = workspace.knowledge[0];
  workspace = (await portal.request(`/api/knowledge/${source.id}/publish`, { method: 'POST', body: { revision: workspace.revision } })).body;
  workspace = (await portal.request('/api/knowledge', { method: 'POST', body: { revision: workspace.revision, title: 'Unapproved', kind: 'FAQ', content: 'Unapproved draft should stay private.' } })).body;
  workspace = (await portal.request('/api/connection', { method: 'PUT', body: { revision: workspace.revision, apiKey: fakeKey, environment: 'sandbox' } })).body;
  const revision = workspace.revision;
  const prepared = await portal.request('/api/releases', { method: 'POST', body: { revision } });
  assert.equal(prepared.status, 200);
  const { release } = prepared.body;
  assert.equal(prepared.body.releaseCurrent, true);
  assert.equal(release.sourceRevision, revision);
  assert.deepEqual(release.settings, workspace.settings);
  assert.deepEqual(release.knowledge, [{ id: source.id, title: source.title, kind: source.kind, content: source.content, version: 1 }]);
  assert.equal(release.provider.credentialVersion, workspace.connection.version);
  assert.deepEqual(Object.keys(release.provider).sort(), ['configured', 'credentialVersion', 'environment', 'status']);
  const { id, createdAt, digest, ...payload } = release;
  assert.equal(digest, createHash('sha256').update(canonicalJson(payload)).digest('hex'));
  const exported = await portal.request(`/api/releases/${id}`);
  assert.deepEqual(exported.body, { release });
  assert.doesNotMatch(exported.text, /Unapproved|fictional_nuitee|ciphertext|installation.key|password|csrfToken|owner@example/);
  assert.match(exported.headers.get('cache-control'), /no-store/);
  const repeated = await portal.request('/api/releases', { method: 'POST', body: { revision: prepared.body.revision } });
  assert.equal(repeated.body.revision, prepared.body.revision);
  assert.deepEqual(repeated.body.release, release);
  await portal.restart();
  assert.deepEqual((await portal.request(`/api/releases/${id}`)).body.release, release);
  assert.equal((await portal.workspace()).releaseCurrent, true);
});

test('new drafts do not change reviewed content; saved changes and credential replacement require a fresh review', async (t) => {
  const portal = await fixture(t);
  await portal.setup();
  let workspace = await portal.workspace();
  workspace = (await portal.request('/api/connection', { method: 'PUT', body: { revision: workspace.revision, apiKey: fakeKey, environment: 'sandbox' } })).body;
  workspace = (await portal.request('/api/releases', { method: 'POST', body: { revision: workspace.revision } })).body;
  const original = workspace.release;
  workspace = (await portal.request('/api/knowledge', { method: 'POST', body: { revision: workspace.revision, title: 'Draft', kind: 'FAQ', content: 'Work in progress.' } })).body;
  assert.equal(workspace.releaseCurrent, true);
  workspace = (await portal.request('/api/connection', { method: 'PUT', body: { revision: workspace.revision, apiKey: fakeKey + '_replacement', environment: 'sandbox' } })).body;
  assert.equal(workspace.releaseCurrent, false);
  assert.deepEqual(workspace.release, original);
  workspace = (await portal.request('/api/releases', { method: 'POST', body: { revision: workspace.revision } })).body;
  assert.notEqual(workspace.release.provider.credentialVersion, original.provider.credentialVersion);
  const replacement = workspace.release;
  workspace = (await portal.request('/api/settings', { method: 'PUT', body: { revision: workspace.revision, settings: { ...workspace.settings, name: 'Updated business' } } })).body;
  assert.equal(workspace.releaseCurrent, false);
  assert.deepEqual(workspace.release, replacement);
  assert.deepEqual((await portal.request(`/api/releases/${original.id}`)).body.release, original);
  workspace = (await portal.request('/api/releases', { method: 'POST', body: { revision: workspace.revision } })).body;
  assert.equal(workspace.release.settings.name, 'Updated business');
  assert.equal(workspace.runtime.status, 'not_connected');
  const source = workspace.knowledge[0];
  workspace = (await portal.request(`/api/knowledge/${source.id}/publish`, { method: 'POST', body: { revision: workspace.revision } })).body;
  assert.equal(workspace.releaseCurrent, false);
  workspace = (await portal.request('/api/releases', { method: 'POST', body: { revision: workspace.revision } })).body;
  assert.equal(workspace.release.knowledge.length, 1);
  workspace = (await portal.request('/api/connection/check', { method: 'POST', body: { revision: workspace.revision } })).body;
  assert.equal(workspace.releaseCurrent, false);
  workspace = (await portal.request('/api/releases', { method: 'POST', body: { revision: workspace.revision } })).body;
  workspace = (await portal.request('/api/connection', { method: 'DELETE', body: { revision: workspace.revision } })).body;
  assert.equal(workspace.releaseCurrent, false);
});

test('the release limit preserves existing versions, revision and history without partial writes', async (t) => {
  const portal = await fixture(t);
  await portal.setup();
  const before = await portal.workspace();
  const first = (await portal.request('/api/releases', { method: 'POST', body: { revision: before.revision } })).body.release;
  const database = new DatabaseSync(join(portal.dataDir, 'portal.sqlite'));
  try {
    const insert = database.prepare('INSERT INTO releases VALUES (?, ?)');
    for (let index = 1; index < 100; index++) {
      const id = `r_00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
      insert.run(id, JSON.stringify({ ...first, id }));
    }
  } finally { database.close(); }
  let workspace = await portal.workspace();
  workspace = (await portal.request('/api/settings', { method: 'PUT', body: { revision: workspace.revision, settings: { ...workspace.settings, welcome: 'New saved content' } } })).body;
  const limited = await portal.request('/api/releases', { method: 'POST', body: { revision: workspace.revision } });
  assert.equal(limited.status, 409);
  assert.match(limited.body.error, /100 reviewed-version limit/);
  assert.deepEqual(await portal.workspace(), workspace);
  assert.deepEqual((await portal.request(`/api/releases/${first.id}`)).body.release, first);
});

test('release preparation enforces authentication, CSRF, exact revision and server-authored payloads', async (t) => {
  const portal = await fixture(t);
  assert.equal((await portal.request('/api/releases', { method: 'POST', body: { revision: 1 } })).status, 401);
  await portal.setup();
  const before = await portal.workspace();
  for (const headers of [{ 'X-CSRF-Token': null }, { Origin: 'http://localhost:3000' }]) {
    assert.equal((await portal.request('/api/releases', { method: 'POST', body: { revision: before.revision }, headers })).status, 403);
  }
  assert.equal((await portal.request('/api/releases', { method: 'POST', body: { revision: before.revision, settings: { name: 'Forged' } } })).status, 400);
  const results = await Promise.all([1, 2].map(() => portal.request('/api/releases', { method: 'POST', body: { revision: before.revision } })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const prepared = results.find(r => r.status === 200).body;
  assert.deepEqual((await portal.workspace()).release, prepared.release);
  assert.equal((await portal.request(`/api/releases/${prepared.release.id}`, { authenticated: false })).status, 401);
  assert.equal((await portal.request('/api/releases/r_00000000-0000-0000-0000-000000000000')).status, 404);
  assert.equal((await portal.request('/api/launch', { method: 'POST', body: { releaseId: prepared.release.id } })).status, 404);
  await portal.request('/api/logout', { method: 'POST', body: {} });
  assert.equal((await portal.request(`/api/releases/${prepared.release.id}`)).status, 401);
});

test('origin, Fetch Metadata, host and CSRF are enforced; public document navigation remains usable', async (t) => {
  const portal = await fixture(t);
  for (const headers of [{ Origin: null }, { Origin: 'https://untrusted.example' }, { 'Sec-Fetch-Site': 'cross-site' }, { 'Sec-Fetch-Site': 'same-site' }]) {
    assert.equal((await portal.request('/api/setup', { method: 'POST', body: account, headers })).status, 403);
  }
  assert.equal((await requestWithHost(portal.origin, '/api/session', `rebinding.example:${portal.server.address().port}`)).status, 403);
  assert.equal((await portal.request('/api/session', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  const page = await portal.request('/', { headers: { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document' } });
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
  const redirected = await requestWithHost(portal.origin, '/?page=setup', `localhost:${portal.server.address().port}`);
  assert.equal(redirected.status, 307);
  assert.equal(redirected.headers.location, `${portal.origin}/?page=setup`);
  assert.equal((await requestWithHost(portal.origin, '/api/session', `localhost:${portal.server.address().port}`)).status, 403);
  await portal.setup();
  const workspace = await portal.workspace();
  for (const headers of [{ 'X-CSRF-Token': null }, { 'X-CSRF-Token': 'invalid' }, { Origin: 'http://localhost:3000' }, { 'Sec-Fetch-Site': 'same-site' }]) {
    assert.equal((await portal.request('/api/settings', { method: 'PUT', body: { revision: workspace.revision, settings: workspace.settings }, headers })).status, 403);
  }
  assert.equal((await portal.workspace()).revision, workspace.revision);
});

test('settings persist across restart and concurrent updates cannot overwrite a newer revision', async (t) => {
  const portal = await fixture(t);
  await portal.setup();
  const before = await portal.workspace();
  const results = await Promise.all([
    portal.request('/api/settings', { method: 'PUT', body: { revision: before.revision, settings: { ...before.settings, name: 'First Save' } } }),
    portal.request('/api/settings', { method: 'PUT', body: { revision: before.revision, settings: { ...before.settings, name: 'Second Save' } } }),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  const saved = await portal.workspace();
  assert.equal(saved.revision, before.revision + 1);
  assert.equal(saved.history.length, 2);
  await portal.restart();
  assert.deepEqual(await portal.workspace(), saved);
  assert.equal((await portal.request('/api/login', { method: 'POST', body: login, authenticated: false })).status, 200);
  assert.equal((await portal.workspace()).settings.name, saved.settings.name);
});

test('knowledge approval is versioned and editing an approved source preserves it until explicit approval', async (t) => {
  const portal = await fixture(t);
  await portal.setup();
  let current = await portal.workspace();
  let result = await portal.request('/api/knowledge', { method: 'POST', body: { revision: current.revision, title: 'Travel changes', kind: 'FAQ', content: 'Original approved guidance.' } });
  assert.equal(result.status, 200);
  current = result.body;
  const originalId = current.knowledge[0].id;
  result = await portal.request(`/api/knowledge/${originalId}/publish`, { method: 'POST', body: { revision: current.revision } });
  assert.equal(result.status, 200);
  current = result.body;
  assert.equal(current.knowledge[0].status, 'Published');
  const published = structuredClone(current.knowledge[0]);
  result = await portal.request('/api/knowledge', { method: 'POST', body: { revision: current.revision, id: originalId, title: 'Travel changes', kind: 'FAQ', content: 'New draft guidance.' } });
  assert.equal(result.status, 200);
  current = result.body;
  assert.deepEqual(current.knowledge.find((entry) => entry.id === originalId), published);
  const draft = current.knowledge.find((entry) => entry.status === 'Draft');
  assert.equal(draft.sourceId, originalId);
  assert.equal(draft.version, 2);
  const staleRevision = current.revision;
  result = await portal.request('/api/knowledge', { method: 'POST', body: { revision: current.revision, id: originalId, title: 'Travel changes', kind: 'FAQ', content: 'Reviewed draft guidance.' } });
  current = result.body;
  assert.equal(current.knowledge.length, 2);
  assert.equal(current.knowledge.find((entry) => entry.status === 'Draft').id, draft.id);
  assert.equal((await portal.request(`/api/knowledge/${draft.id}/publish`, { method: 'POST', body: { revision: staleRevision } })).status, 409);
  result = await portal.request(`/api/knowledge/${draft.id}/publish`, { method: 'POST', body: { revision: current.revision } });
  assert.equal(result.status, 200);
  current = result.body;
  assert.equal(current.knowledge.length, 1);
  assert.deepEqual(current.knowledge[0], { ...published, version: 2, content: 'Reviewed draft guidance.' });
  assert.equal((await portal.request(`/api/knowledge/${originalId}/publish`, { method: 'POST', body: { revision: current.revision } })).status, 409);
  await portal.restart();
  assert.deepEqual((await portal.workspace()).knowledge, current.knowledge);
});

test('provider secrets are encrypted, masked without fragments, persisted and checked only on explicit request', async (t) => {
  const calls = [];
  let providerStatus = 'verified';
  const portal = await fixture(t, { checkKey: async (key) => { calls.push(key); return { status: providerStatus, rawBody: key }; } });
  await portal.setup();
  let current = await portal.workspace();
  let result = await portal.request('/api/connection', { method: 'PUT', body: { revision: current.revision, apiKey: fakeKey, environment: 'sandbox' } });
  assert.equal(result.status, 200);
  assert.equal(calls.length, 0);
  current = result.body;
  assert.match(current.connection.version, /^[a-f0-9-]{36}$/);
  assert.deepEqual(current.connection, { configured: true, status: 'saved', environment: 'sandbox', checkedAt: null, version: current.connection.version });
  assert.doesNotMatch(result.text, new RegExp(fakeKey));
  for (const filename of await readdir(portal.dataDir)) {
    assert.equal((await readFile(join(portal.dataDir, filename))).includes(Buffer.from(fakeKey)), false);
    assert.equal((await stat(join(portal.dataDir, filename))).mode & 0o077, 0);
  }
  assert.equal((await stat(portal.dataDir)).mode & 0o077, 0);
  await portal.restart();
  result = await portal.request('/api/connection/check', { method: 'POST', body: { revision: current.revision } });
  assert.equal(result.status, 200);
  assert.deepEqual(calls, [fakeKey]);
  current = result.body;
  assert.equal(current.connection.status, 'verified');
  assert.ok(Date.parse(current.connection.checkedAt));
  assert.doesNotMatch(result.text, new RegExp(fakeKey));
  providerStatus = 'rejected';
  result = await portal.request('/api/connection/check', { method: 'POST', body: { revision: current.revision } });
  current = result.body;
  assert.equal(current.connection.status, 'rejected');
  assert.equal(current.connection.configured, true);
  result = await portal.request('/api/connection', { method: 'PUT', body: { revision: current.revision, apiKey: `${fakeKey}_replacement`, environment: 'production' } });
  current = result.body;
  assert.deepEqual(current.connection, { configured: true, status: 'saved', environment: 'production', checkedAt: null, version: current.connection.version });
  result = await portal.request('/api/connection', { method: 'DELETE', body: { revision: current.revision } });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.connection, { configured: false, status: 'disconnected', environment: null, checkedAt: null });
  assert.equal((await portal.request('/api/connection/check', { method: 'POST', body: { revision: result.body.revision } })).status, 409);
  const database = new DatabaseSync(join(portal.dataDir, 'portal.sqlite'));
  try { assert.equal(database.prepare('SELECT connection_secret FROM workspace').get().connection_secret, null); }
  finally { database.close(); }
});

test('provider errors are sanitized, retain the saved key and become unavailable without fake verification', async (t) => {
  const portal = await fixture(t, { checkKey: async (key) => { throw new Error(`provider echoed ${key} private body`); } });
  await portal.setup();
  const current = await portal.workspace();
  const saved = await portal.request('/api/connection', { method: 'PUT', body: { revision: current.revision, apiKey: fakeKey, environment: 'sandbox' } });
  const checked = await portal.request('/api/connection/check', { method: 'POST', body: { revision: saved.body.revision } });
  assert.equal(checked.status, 200);
  assert.equal(checked.body.connection.status, 'unavailable');
  assert.equal(checked.body.connection.configured, true);
  assert.doesNotMatch(checked.text, /fictional_nuitee_secret|provider echoed|private body/);
});

test('an in-flight provider result cannot mark a replaced credential verified', async (t) => {
  let entered, finish;
  const started = new Promise((resolve) => { entered = resolve; });
  const pending = new Promise((resolve) => { finish = resolve; });
  const portal = await fixture(t, { checkKey: async () => { entered(); return pending; } });
  await portal.setup();
  let current = await portal.workspace();
  current = (await portal.request('/api/connection', { method: 'PUT', body: { revision: current.revision, apiKey: fakeKey, environment: 'sandbox' } })).body;
  const checking = portal.request('/api/connection/check', { method: 'POST', body: { revision: current.revision } });
  await started;
  const replacement = await portal.request('/api/connection', { method: 'PUT', body: { revision: current.revision, apiKey: `${fakeKey}_new`, environment: 'production' } });
  assert.equal(replacement.status, 200);
  finish({ status: 'verified' });
  assert.equal((await checking).status, 409);
  const after = await portal.workspace();
  assert.deepEqual(after.connection, replacement.body.connection);
  assert.equal(after.revision, replacement.body.revision);
});

test('logout during an in-flight provider check prevents a later mutation', async (t) => {
  let entered, finish;
  const started = new Promise((resolve) => { entered = resolve; });
  const pending = new Promise((resolve) => { finish = resolve; });
  const portal = await fixture(t, { checkKey: async () => { entered(); return pending; } });
  await portal.setup();
  let current = await portal.workspace();
  current = (await portal.request('/api/connection', { method: 'PUT', body: { revision: current.revision, apiKey: fakeKey, environment: 'sandbox' } })).body;
  const checking = portal.request('/api/connection/check', { method: 'POST', body: { revision: current.revision } });
  await started;
  assert.equal((await portal.request('/api/logout', { method: 'POST', body: {} })).status, 200);
  finish({ status: 'verified' });
  assert.equal((await checking).status, 401);
  assert.equal((await portal.request('/api/login', { method: 'POST', body: login })).status, 200);
  assert.deepEqual(await portal.workspace(), current);
});

test('logout while a request body is arriving prevents a later settings write', async (t) => {
  const portal = await fixture(t);
  await portal.setup();
  const current = await portal.workspace();
  const body = JSON.stringify({ revision: current.revision, settings: { ...current.settings, name: 'Must not save' } });
  const arrived = new Promise((resolve) => portal.server.once('request', resolve));
  let outgoing;
  const delayed = new Promise((resolve, reject) => {
    outgoing = httpRequest(`${portal.origin}/api/settings`, { method: 'PUT', headers: {
      Origin: portal.origin, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Cookie: portal.cookie, 'X-CSRF-Token': portal.csrf,
    } }, (response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode));
    });
    outgoing.once('error', reject);
    outgoing.write(body.slice(0, 20));
  });
  await arrived;
  assert.equal((await portal.request('/api/logout', { method: 'POST', body: {} })).status, 200);
  outgoing.end(body.slice(20));
  assert.equal(await delayed, 401);
  assert.equal((await portal.request('/api/login', { method: 'POST', body: login })).status, 200);
  assert.deepEqual(await portal.workspace(), current);
});

test('session IDs are hashed, login rotates the existing session, expiry and logout revoke access', async (t) => {
  const portal = await fixture(t);
  await portal.setup();
  const firstCookie = portal.cookie;
  const firstCsrf = portal.csrf;
  const firstToken = firstCookie.split('=')[1];
  let database = new DatabaseSync(join(portal.dataDir, 'portal.sqlite'));
  try {
    const row = database.prepare('SELECT id_hash FROM sessions').get();
    assert.equal(row.id_hash, sessionHash(firstToken));
    const owner = database.prepare('SELECT * FROM owner').get();
    assert.notEqual(owner.password_hash, account.password);
    assert.equal(owner.password_hash.length, 128);
  } finally { database.close(); }
  assert.equal((await readFile(join(portal.dataDir, 'portal.sqlite'))).includes(Buffer.from(firstToken)), false);
  assert.equal((await portal.request('/api/login', { method: 'POST', body: login })).status, 200);
  assert.notEqual(portal.cookie, firstCookie);
  assert.notEqual(portal.csrf, firstCsrf);
  assert.equal((await portal.request('/api/workspace', { headers: { Cookie: firstCookie } })).status, 401);
  assert.equal((await portal.request('/api/logout', { method: 'POST', body: {}, headers: { 'X-CSRF-Token': firstCsrf } })).status, 403);
  const currentToken = portal.cookie.split('=')[1];
  database = new DatabaseSync(join(portal.dataDir, 'portal.sqlite'));
  try { database.prepare('UPDATE sessions SET expires_at = ? WHERE id_hash = ?').run(Date.now() - 1, sessionHash(currentToken)); }
  finally { database.close(); }
  assert.equal((await portal.request('/api/workspace')).status, 401);
  assert.deepEqual((await portal.request('/api/session')).body, { setupRequired: false, user: null, csrfToken: null });
  assert.equal((await portal.request('/api/login', { method: 'POST', body: login })).status, 200);
  const logout = await portal.request('/api/logout', { method: 'POST', body: {} });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await portal.request('/api/workspace')).status, 401);
});

test('strict input validation rejects foreign authority, malformed bodies and unsupported settings', async (t) => {
  const portal = await fixture(t);
  assert.equal((await portal.request('/api/setup', { method: 'POST', body: { ...account, password: 'short' } })).status, 400);
  assert.equal((await portal.request('/api/setup', { method: 'POST', body: { ...account, businessId: 'other' } })).status, 400);
  await portal.setup();
  const current = await portal.workspace();
  assert.equal((await portal.request('/api/workspace?businessId=other')).status, 400);
  const invalid = [
    { revision: current.revision, settings: current.settings, businessId: 'other' },
    { revision: current.revision, settings: { ...current.settings, businessId: 'other' } },
    { revision: current.revision, settings: { ...current.settings, capabilities: { ...current.settings.capabilities, ticketing: true } } },
    { revision: current.revision, settings: { ...current.settings, capabilities: { ...current.settings.capabilities, flights: 'true' } } },
    { revision: current.revision, settings: { ...current.settings, theme: 'url(https://untrusted.example)' } },
    { revision: 0, settings: current.settings },
  ];
  for (const body of invalid) assert.equal((await portal.request('/api/settings', { method: 'PUT', body })).status, 400);
  assert.equal((await portal.request('/api/settings', { method: 'PUT', rawBody: '{invalid json' })).status, 400);
  assert.equal((await portal.request('/api/settings', { method: 'PUT', rawBody: 'x'.repeat(40 * 1024) })).status, 413);
  assert.equal((await portal.request('/api/settings', { method: 'PUT', body: {}, headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await portal.request('/api/knowledge', { method: 'POST', body: { revision: current.revision, title: 'Bad', kind: 'FAQ', content: 'x', status: 'Published' } })).status, 400);
  assert.equal((await portal.request('/api/connection', { method: 'PUT', body: { revision: current.revision, apiKey: `${fakeKey}\r\nHeader: value`, environment: 'sandbox' } })).status, 400);
  assert.deepEqual(await portal.workspace(), current);
  for (const path of ['/store.mjs', '/server.mjs', '/.env', '/.local/portal/portal.sqlite', '/installation.key', '/AGENTS.md']) {
    assert.equal((await portal.request(path)).status, 404);
  }
});

test('authentication and provider checks have bounded attempt rates', async (t) => {
  const portal = await fixture(t);
  await portal.setup();
  for (let count = 0; count < 9; count += 1) {
    assert.equal((await portal.request('/api/login', { method: 'POST', body: { ...login, password: 'incorrect fixture password' } })).status, 401);
  }
  const blocked = await portal.request('/api/login', { method: 'POST', body: login });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  let current = await portal.workspace();
  current = (await portal.request('/api/connection', { method: 'PUT', body: { revision: current.revision, apiKey: fakeKey, environment: 'sandbox' } })).body;
  for (let count = 0; count < 5; count += 1) {
    const checked = await portal.request('/api/connection/check', { method: 'POST', body: { revision: current.revision } });
    assert.equal(checked.status, 200);
    current = checked.body;
  }
  assert.equal((await portal.request('/api/connection/check', { method: 'POST', body: { revision: current.revision } })).status, 429);
  assert.equal((await portal.workspace()).revision, current.revision);
});

test('runtime URL configuration rejects unsafe schemes, embedded credentials and private query tokens', () => {
  for (const travelerUrl of ['http://example.com', 'http://127.0.0.1:3000', 'https://user:password@example.com', 'javascript:alert(1)', 'https://example.com/?key=secret', 'https://example.com/#token']) {
    assert.throws(() => createPortalServer({ travelerUrl }), /URL/);
  }
});

test('a missing installation key does not silently replace the key for an existing database', async (t) => {
  const portal = await fixture(t);
  await portal.setup();
  await stop(portal.server);
  const filename = join(portal.dataDir, 'installation.key');
  await rm(filename);
  assert.throws(() => createPortalServer({ dataDir: portal.dataDir }), /installation key is missing/);
  await assert.rejects(stat(filename), { code: 'ENOENT' });
});
