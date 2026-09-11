import test, { after } from 'node:test';
const temporaryDirectories = [];
after(async () => { for (const path of temporaryDirectories) await rm(path, { recursive: true, force: true }); });
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { BusinessStore, modelInput } from '../business-store.mjs';
import { PortalStore, sessionHash } from '../store.mjs';
import { BusinessRuntime } from '../business-runtime.mjs';
import { createPortalServer } from '../server.mjs';
import { migrateBusiness } from '../../../scripts/migrate-business.mjs';

const owner = { name: 'Fixture Owner', email: 'owner@example.test', businessName: 'Fixture Travel', salt: 'synthetic', passwordHash: 'synthetic' };
const providerKey = 'synthetic-provider-secret', modelKey = 'synthetic-model-secret';
const model = { baseUrl: 'https://models.example.test/v1', model: 'fixture', transport: 'responses', apiKey: modelKey };
async function directory(t) {
  const path = await mkdtemp(join(tmpdir(), 'business-lifecycle-test-'));
  temporaryDirectories.push(path); return path;
}
function configured(store) {
  store.createOwner(owner);
  let state = store.workspace();
  state = store.saveConnection({ revision: state.revision, apiKey: providerKey, environment: 'sandbox' });
  state = store.saveModel({ revision: state.revision, ...model });
  return store.prepareRelease(state.revision);
}
function fakeDriver() {
  const handles = [];
  let failPublic = false, gate = null;
  return { handles, set failPublic(value) { failPublic = value; }, set gate(value) { gate = value; },
    driver: async ({ release, secrets, access, port }) => {
      assert.ok(secrets.modelKey && secrets.providerKey);
      if (gate) { const wait = gate; gate = null; await wait; }
      if (access === 'public' && failPublic) throw Error('synthetic boot failure');
      const handle = { alive: true, origin: `http://127.0.0.1:${port}`, embedId: access === 'public' ? 'emb_fixture' : null, release, port,
        close: async () => { handle.alive = false; }, session: async () => ({ token: 'fixture-sdk-token', expiresAt: new Date(Date.now() + 60_000).toISOString(), endpoints: { turns: `http://127.0.0.1:${port}/unaltered-sdk-turns` }, configuration: { fixture: true } }) };
      handles.push(handle); return handle;
    } };
}

test('versioned encrypted model/provider credentials stay out of exports and preserve a published binding on replacement', async t => {
  const path = await directory(t), store = new BusinessStore(path); t.after(() => store.close());
  const state = configured(store), release = state.release;
  assert.equal(release.schemaVersion, 2);
  assert.deepEqual(store.runtimeSecrets(release), { providerKey, modelKey });
  assert.ok(!JSON.stringify(state).includes(modelKey)); assert.ok(!JSON.stringify(state).includes(providerKey));
  let next = store.saveModel({ revision: state.revision, ...model, apiKey: 'replacement-model-secret' });
  assert.equal(next.releaseCurrent, false);
  assert.equal(store.runtimeSecrets(release).modelKey, modelKey);
  next = store.prepareRelease(next.revision);
  assert.equal(store.runtimeSecrets(next.release).modelKey, 'replacement-model-secret');
  const raw = await readFile(join(path, 'portal.sqlite'));
  for (const key of [modelKey, providerKey, 'replacement-model-secret']) assert.ok(!raw.includes(Buffer.from(key)));
  store.removeModel(next.revision);
  assert.throws(() => store.runtimeSecrets(release), /removed/);
});

test('model input rejects unknown fields, credential URLs, unsupported transports and unsafe keys', () => {
  for (const input of [
    { ...model, baseUrl: 'http://models.example.test/v1' }, { ...model, baseUrl: 'https://user:pass@example.test' },
    { ...model, baseUrl: 'https://example.test?key=secret' }, { ...model, baseUrl: 'https://example.test/#fragment' },
    { ...model, transport: 'invented' }, { ...model, apiKey: 'bad key with spaces' }, { ...model, businessId: 'foreign' },
  ]) assert.throws(() => modelInput({ revision: 1, ...input }));
  assert.throws(() => modelInput({ revision: 1, ...model, baseUrl: 'http://127.0.0.1:12345/v1/' }));
  assert.equal(modelInput({ revision: 1, ...model, baseUrl: 'https://models.example.test/v1/' }).baseUrl, 'https://models.example.test/v1');
});

test('preview is private, publication is atomic, stale drafts cannot activate, and restart restores the exact active release', async t => {
  const store = new BusinessStore(await directory(t));
  let runtime; t.after(async () => { await runtime?.close(); store.close(); });
  let state = configured(store); const account = store.createSession(); const fake = fakeDriver();
  const options = { root: resolve('.'), driver: fake.driver };
  runtime = new BusinessRuntime(store, options);
  await runtime.startPreview(state.revision, state.release.id, account.token);
  assert.equal(runtime.projection().status, 'not_published');
  const originalId = state.release.id;
  await runtime.publish(state.revision, originalId, account.token);
  assert.equal(runtime.projection().release.id, originalId);
  state = store.workspace();
  state = store.saveSettings(state.revision, { ...state.settings, name: 'New Draft Name' });
  assert.equal(runtime.projection().release.settings.name, 'Fixture Travel');
  await assert.rejects(runtime.publish(state.revision, originalId, account.token), /current saved version/);
  state = store.prepareRelease(state.revision);
  await runtime.startPreview(state.revision, state.release.id, account.token);
  fake.failPublic = true;
  await assert.rejects(runtime.publish(state.revision, state.release.id, account.token));
  assert.equal(runtime.projection().release.id, originalId);
  assert.equal(store.publication().active_release, originalId);
  fake.failPublic = false;
  await runtime.publish(state.revision, state.release.id, account.token);
  assert.equal(runtime.projection().release.settings.name, 'New Draft Name');
  const active = state.release.id;
  await runtime.close(); runtime = new BusinessRuntime(store, options); await runtime.restoring;
  assert.equal(runtime.projection().release.id, active); assert.equal(runtime.describe().preview, null);
  await Promise.all([runtime.stopAll(), runtime.stopAll()]); assert.equal(runtime.projection().status, 'unavailable');
  assert.ok(fake.handles.every(handle => !handle.alive));
  assert.equal(runtime.closed, false);
});

test('a changed revision or removed connection while preview boots closes the candidate and cannot expose it', async t => {
  const store = new BusinessStore(await directory(t)); const state = configured(store); const account = store.createSession();
  const fake = fakeDriver(), runtime = new BusinessRuntime(store, { root: resolve('.'), driver: fake.driver });
  t.after(async () => { await runtime.close(); store.close(); });
  let releaseGate;
  fake.gate = new Promise(done => { releaseGate = done; });
  const preparing = runtime.startPreview(state.revision, state.release.id, account.token);
  await new Promise(done => setImmediate(done));
  await assert.rejects(runtime.startPreview(state.revision, state.release.id, account.token), /already running/);
  store.removeConnection(state.revision); releaseGate();
  await assert.rejects(preparing, /workspace changed/);
  assert.equal(runtime.describe().preview, null); assert.ok(fake.handles.every(handle => !handle.alive));
});

test('preview tickets are one-use, owner-bound, short-lived, and revoked by logout or credential removal', async t => {
  const store = new BusinessStore(await directory(t)); t.after(() => store.close());
  const state = configured(store), account = store.createSession();
  const ticket = store.previewTicket(state.release.id, account.token);
  const exchanged = store.exchangePreviewTicket(ticket);
  assert.equal(store.previewSession(exchanged.token).releaseId, state.release.id);
  assert.throws(() => store.exchangePreviewTicket(ticket), /expired/);
  const expired = store.previewTicket(state.release.id, account.token);
  store.db.prepare('UPDATE preview_tickets SET expires_at = 1 WHERE token_hash = ?').run(sessionHash(expired));
  assert.throws(() => store.exchangePreviewTicket(expired), /expired/);
  store.deleteSession(account.token); assert.equal(store.previewSession(exchanged.token), null);
  const next = store.createSession(), nextTicket = store.previewTicket(state.release.id, next.token);
  store.removeConnection(state.revision); assert.throws(() => store.exchangePreviewTicket(nextTicket), /expired/);
});

test('migration copies an intact database/key pair, retains the original and refuses overwrites', async t => {
  const base = await directory(t), source = join(base, 'source'), destination = join(base, 'destination');
  const legacy = new PortalStore(source);
  legacy.createOwner(owner); legacy.saveConnection({ revision: legacy.workspace().revision, apiKey: providerKey, environment: 'sandbox' });
  legacy.createSession();
  const beforeDb = await readFile(join(source, 'portal.sqlite')), beforeKey = await readFile(join(source, 'installation.key'));
  const report = await migrateBusiness(source, destination);
  assert.equal(report.sourceUnchanged, true);
  assert.deepEqual(await readFile(join(source, 'portal.sqlite')), beforeDb);
  assert.deepEqual(await readFile(join(source, 'installation.key')), beforeKey);
  const copy = new BusinessStore(destination);
  assert.equal(copy.publicOwner().email, owner.email); assert.equal(copy.decrypt(copy.read().encryptedKey), providerKey);
  assert.equal(copy.db.prepare('SELECT COUNT(*) AS count FROM sessions').get().count, 0);
  assert.equal(copy.workspace().modelConnection.configured, false); copy.close();
  assert.equal((await stat(join(destination, 'installation.key'))).mode & 0o777, 0o600);
  await assert.rejects(migrateBusiness(source, destination)); legacy.close();
});

test('HTTP integration enforces owner CSRF, distinct cookie, private exchange and unchanged SDK session forwarding', async t => {
  const dataDir = await directory(t), fake = fakeDriver();
  const server = createPortalServer({ dataDir, businessRuntime: { root: resolve('.'), driver: fake.driver } });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(async () => { await new Promise(done => server.close(done)); await server.businessClosed; });
  const origin = `http://127.0.0.1:${server.address().port}`;
  let cookie, csrf;
  async function api(path, method = 'GET', body, headers = {}) {
    const response = await fetch(`${origin}${path}`, { method, headers: {
      ...(cookie ? { Cookie: cookie } : {}), ...(method !== 'GET' ? { Origin: origin, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf || '' } : {}), ...headers,
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const value = await response.json(); return { status: response.status, value, headers: response.headers };
  }
  assert.equal((await api('/api/workspace')).status, 401);
  assert.equal((await api('/api/storefront')).value.status, 'not_published');
  const setup = await api('/api/setup', 'POST', { name: owner.name, email: owner.email, businessName: owner.businessName, password: 'synthetic secure password 2026' });
  assert.equal(setup.status, 200); cookie = setup.headers.get('set-cookie').split(';')[0]; csrf = setup.value.csrfToken;
  assert.ok(cookie.startsWith(`wayfare_portal_${server.address().port}=`));
  let state = (await api('/api/workspace')).value;
  assert.equal((await api('/api/model', 'PUT', { revision: state.revision, ...model }, { 'X-CSRF-Token': '' })).status, 403);
  state = (await api('/api/model', 'PUT', { revision: state.revision, ...model })).value;
  state = (await api('/api/connection', 'PUT', { revision: state.revision, apiKey: providerKey, environment: 'sandbox' })).value;
  state = (await api('/api/releases', 'POST', { revision: state.revision })).value;
  let result = await api('/api/runtime/preview', 'POST', { revision: state.revision, releaseId: state.release.id });
  assert.equal(result.status, 200); assert.equal(result.value.runtime.preview.ready, true);
  const link = (await api('/api/runtime/preview-link', 'POST', { releaseId: state.release.id })).value.url;
  const ticket = new URLSearchParams(new URL(link).hash.slice(1)).get('ticket');
  assert.equal((await api('/api/storefront/preview/exchange', 'POST', { ticket })).status, 403, 'browser may not call bridge directly');
  const exchange = await fetch(`${origin}/api/storefront/preview/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket }) });
  assert.equal(exchange.status, 200); const credentials = await exchange.json();
  const headers = { Authorization: `Bearer ${credentials.token}` };
  assert.equal((await fetch(`${origin}/api/storefront/preview`)).status, 401);
  const projection = await (await fetch(`${origin}/api/storefront/preview`, { headers })).json();
  assert.equal(projection.release.id, state.release.id); assert.ok(!JSON.stringify(projection).includes(modelKey));
  const sdk = await fetch(`${origin}/api/storefront/preview/session`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(sdk.status, 200); const session = await sdk.json();
  assert.equal(session.token, 'fixture-sdk-token'); assert.ok(session.endpoints.turns.endsWith('/unaltered-sdk-turns'));
  result = await api('/api/runtime/publish', 'POST', { revision: state.revision, releaseId: state.release.id });
  assert.equal(result.status, 200);
  assert.equal((await api('/api/storefront')).value.release.id, state.release.id);
  await api('/api/logout', 'POST', {});
  assert.equal((await fetch(`${origin}/api/storefront/preview`, { headers })).status, 401);
  assert.equal(fake.handles.find(handle => !handle.embedId).alive, false);
  assert.equal((await api('/api/storefront')).value.status, 'ready', 'logout leaves public version running');
});
