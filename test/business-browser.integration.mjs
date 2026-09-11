import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer as createPortProbe } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { createPortalServer } from '../apps/business-portal/server.mjs';
import { sdkRuntimeDriver } from '../apps/business-portal/business-runtime.mjs';
import { createBusinessModelFixture } from './fixtures/business-model.mjs';

// Real portal, storefront, SDK stream and linked App; only the model is fictional.
// This test always creates its own empty data directory. It cannot adopt an existing workspace.
const root = resolve(import.meta.dirname, '..');
const webRoot = join(root, 'apps/web');
const websiteOrigin = 'http://localhost:3510';
const portalOrigin = 'http://127.0.0.1:3513';
const runtimePorts = [3515, 3516, 3517];
const brandName = 'Fixture Journeys';
const welcome = 'Plan a thoughtful fixture journey.';
const answer = 'Fixture answer from the connected business assistant.';

async function assertFree(port, host) {
  await new Promise((resolveProbe, reject) => {
    const probe = createPortProbe();
    probe.once('error', () => reject(new Error(`Test port ${host}:${port} is occupied; existing processes were left untouched.`)));
    probe.listen(port, host, () => probe.close(resolveProbe));
  });
}

async function waitUntil(check, message, timeout = 60_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await delay(100);
  }
  throw new Error(message);
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise(done => {
    const timeout = setTimeout(() => child.kill('SIGKILL'), 8_000);
    child.once('exit', () => { clearTimeout(timeout); done(); });
    child.kill('SIGTERM');
  });
}

async function mutateThroughUi(page, path, action, method = 'POST') {
  const received = page.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === method, { timeout: 150_000 });
  await action();
  const response = await received;
  assert.equal(response.ok(), true, `UI request ${method} ${path} failed: ${await response.text()}`);
  return response.json();
}

async function createKnowledge(page, title, content) {
  await page.getByRole('button', { name: 'Add knowledge', exact: true }).click();
  await page.getByLabel('Source title', { exact: true }).fill(title);
  await page.getByLabel('Source content', { exact: true }).fill(content);
  await mutateThroughUi(page, '/api/knowledge', () => page.getByRole('button', { name: 'Save draft', exact: true }).click());
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}

async function submitChat(page, prompt) {
  await page.getByRole('textbox', { name: 'Ask the travel assistant', exact: true }).fill(prompt);
  await page.getByRole('button', { name: 'Submit trip request', exact: true }).click();
  await page.getByText(answer, { exact: true }).first().waitFor({ state: 'visible', timeout: 90_000 });
}

test('owner UI prepares, privately chats with, and publishes an immutable business version', { timeout: 420_000 }, async t => {
  await assertFree(3510, 'localhost');
  for (const port of [3513, ...runtimePorts]) await assertFree(port, '127.0.0.1');
  const dataDir = await mkdtemp(join(tmpdir(), 'business-browser-test-'));
  const buildDir = `.next-business-e2e-${process.pid}`;
  const artifacts = join(webRoot, buildDir, 'evidence');
  await mkdir(artifacts, { recursive: true });
  let model, portal, web, browser, context;
  const errors = [], blocked = [], requests = [];
  let webOutput = '';
  try {
    model = await createBusinessModelFixture();
    portal = createPortalServer({ dataDir, travelerUrl: websiteOrigin,
      checkKey: async () => { throw new Error('This fixture must never check provider credentials.'); },
      businessRuntime: { root, websiteOrigin, ports: runtimePorts,
        driver: sdkRuntimeDriver({ root, dataDir, websiteOrigin, workerExecArgv: model.workerExecArgv }) },
    });
    await new Promise((done, reject) => { portal.once('error', reject); portal.listen(3513, '127.0.0.1', done); });
    web = spawn(process.execPath, [join(webRoot, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', 'localhost', '--port', '3510'], {
      cwd: webRoot, stdio: ['ignore', 'pipe', 'pipe'], env: {
        PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1',
        WAYFARE_WEB_DIST_DIR: buildDir, WAYFARE_BUSINESS_PORTAL_ORIGIN: portalOrigin,
        WAYFARE_STOREFRONT_ORIGIN: websiteOrigin,
        WAYFARE_BUSINESS_RUNTIME_ORIGINS: runtimePorts.map(port => `http://127.0.0.1:${port}`).join(','),
      },
    });
    web.stdout.on('data', chunk => { webOutput = (webOutput + chunk).slice(-12_000); });
    web.stderr.on('data', chunk => { webOutput = (webOutput + chunk).slice(-12_000); });
    await waitUntil(async () => {
      if (web.exitCode !== null) throw new Error('The isolated Next process exited before startup.');
      try { return (await fetch(websiteOrigin, { signal: AbortSignal.timeout(2000) })).ok; } catch { return false; }
    }, 'The isolated storefront did not start.', 90_000);
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
    const allowed = new Set([websiteOrigin, portalOrigin, ...runtimePorts.map(port => `http://127.0.0.1:${port}`)]);
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (allowed.has(url.origin) || ['data:', 'blob:', 'about:'].includes(url.protocol)) return route.continue();
      blocked.push(url.origin);
      return route.abort('blockedbyclient');
    });
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    context.on('request', request => requests.push({ url: request.url(), method: request.method() }));
    const owner = await context.newPage();
    owner.setDefaultTimeout(30_000);
    await owner.goto(portalOrigin);
    await owner.getByLabel('Your name', { exact: true }).fill('Fixture Owner');
    await owner.getByLabel('Business name', { exact: true }).fill(brandName);
    await owner.getByLabel('Email', { exact: true }).fill('fixture@example.test');
    await owner.getByLabel('Password', { exact: true }).fill('fictional-owner-password');
    await mutateThroughUi(owner, '/api/setup', () => owner.getByRole('button', { name: 'Create workspace', exact: true }).click());
    await owner.locator('.nav [data-page="connections"]').click();
    await owner.getByLabel('Nuitée API key', { exact: true }).fill('fictional-provider-key');
    await mutateThroughUi(owner, '/api/connection', () => owner.getByRole('button', { name: 'Save key securely', exact: true }).click(), 'PUT');
    await owner.getByLabel('Model API base URL', { exact: true }).fill('https://models.example.test/v1');
    await owner.getByLabel('Model name', { exact: true }).fill('fictional-model');
    await owner.getByLabel('API transport', { exact: true }).selectOption('chat-completions');
    await owner.getByLabel('Model API key', { exact: true }).fill('fictional-model-key');
    await mutateThroughUi(owner, '/api/model', () => owner.getByRole('button', { name: 'Save model connection', exact: true }).click(), 'PUT');
    await owner.locator('.nav [data-page="setup"]').click();
    await owner.locator('.setupstep').nth(1).click();
    await owner.getByLabel('Welcome message', { exact: true }).fill(welcome);
    await owner.getByLabel('Display currency', { exact: true }).selectOption('EUR');
    await owner.getByLabel('Language', { exact: true }).selectOption('French');
    await owner.getByRole('button', { name: 'Review and save', exact: true }).click();
    await mutateThroughUi(owner, '/api/settings', () => owner.getByRole('button', { name: 'Save portal settings', exact: true }).click(), 'PUT');
    await owner.locator('.nav [data-page="controls"]').click();
    for (const key of ['hotels', 'experiences', 'cars', 'checkout']) {
      const toggle = owner.locator(`[data-capability="${key}"]`);
      if (await toggle.getAttribute('aria-checked') === 'true') await toggle.click();
    }
    await owner.getByLabel('Adults, when unspecified', { exact: true }).selectOption('2 adults');
    await owner.getByRole('button', { name: 'Review and save', exact: true }).click();
    await mutateThroughUi(owner, '/api/settings', () => owner.getByRole('button', { name: 'Save portal settings', exact: true }).click(), 'PUT');
    await owner.locator('.nav [data-page="knowledge"]').click();
    await createKnowledge(owner, 'Fixture desk hours', 'Our fictional desk opens at 10:37 each Tuesday.');
    await owner.getByRole('button', { name: 'Review draft', exact: true }).click();
    const approved = owner.waitForResponse(response => /\/api\/knowledge\/k_[^/]+\/publish$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST');
    await owner.getByRole('button', { name: 'Approve in portal', exact: true }).click();
    assert.equal((await approved).ok(), true);
    await owner.getByRole('dialog').waitFor({ state: 'hidden' });
    await createKnowledge(owner, 'Unapproved fixture draft', 'Draft-only canary: never publish this fictional detail.');
    await owner.locator('.nav [data-page="setup"]').click();
    await owner.locator('.setupstep').nth(2).click();
    await owner.getByRole('button', { name: 'Review saved version', exact: true }).click();
    const review = owner.getByRole('dialog', { name: 'Review your saved version', exact: true });
    assert.match(await review.innerText(), /10:37/);
    assert.doesNotMatch(await review.innerText(), /Draft-only canary|fictional-provider-key|fictional-model-key/);
    const prepared = await mutateThroughUi(owner, '/api/releases', () => owner.getByRole('button', { name: 'Prepare reviewed version', exact: true }).click());
    const release = prepared.release;
    assert.ok(release?.id && release.digest);
    assert.equal(release.knowledge.length, 1);
    assert.equal(release.settings.capabilities.hotels, false);
    t.diagnostic('Owner UI saved connections, settings and approved knowledge; immutable release prepared.');

    const publicPage = await context.newPage();
    await publicPage.goto(websiteOrigin);
    assert.equal(await publicPage.getByRole('textbox', { name: 'Ask the travel assistant', exact: true }).isDisabled(), true);
    await mutateThroughUi(owner, '/api/runtime/preview', () => owner.getByRole('button', { name: 'Preview saved version', exact: true }).click());
    const previewLink = owner.getByRole('link', { name: 'Open private chat preview', exact: true });
    await previewLink.waitFor({ state: 'visible', timeout: 150_000 });
    const previewPromise = context.waitForEvent('page');
    await previewLink.click();
    const preview = await previewPromise;
    await preview.getByRole('heading', { name: welcome, exact: true }).waitFor({ state: 'visible', timeout: 60_000 });
    assert.equal(new URL(preview.url()).hash, '');
    assert.match(await preview.getByLabel('Private preview', { exact: true }).innerText(), new RegExp(release.id.slice(-8)));
    const cookie = (await context.cookies(websiteOrigin)).find(value => value.name === 'wayfare_preview_3510');
    assert.equal(cookie?.httpOnly, true); assert.equal(cookie?.sameSite, 'Strict');
    assert.doesNotMatch(await preview.content(), /fictional-provider-key|fictional-model-key|Draft-only canary|10:37/);
    assert.equal(await preview.evaluate(() => localStorage.length + sessionStorage.length), 0);
    await submitChat(preview, 'Open the travel starter.');
    const app = preview.locator('noodle-app-view').first().locator('iframe').first().contentFrame().locator('iframe').contentFrame();
    await app.getByText(welcome, { exact: true }).waitFor({ state: 'visible', timeout: 60_000 });
    assert.equal(await app.getByText('The travel starter result was incomplete.', { exact: true }).count(), 0);
    assert.ok(model.requests.length >= 2, 'The actual SDK must call the model and execute the linked App tool.');
    assert.equal(model.requests[0].tools.some(tool => tool.function?.name === 'search_hotels'), false);
    await preview.screenshot({ path: join(artifacts, 'private-chat.png'), fullPage: true });
    t.diagnostic('Private ticket exchanged; actual SDK streamed the fictional answer and rendered the business linked App.');

    await owner.getByRole('button', { name: 'Review publication', exact: true }).click();
    const published = await mutateThroughUi(owner, '/api/runtime/publish', () => owner.getByRole('button', { name: 'Publish reviewed version', exact: true }).click());
    assert.equal(published.runtime.active.releaseId, release.id);
    assert.equal(published.runtime.active.digest, release.digest);
    const projection = await (await fetch(portalOrigin + '/api/storefront')).json();
    assert.equal(projection.release.id, release.id); assert.equal(projection.release.digest, release.digest);
    assert.ok(projection.runtime.embedId);
    assert.doesNotMatch(JSON.stringify(projection), /10:37|Draft-only canary|fictional-provider-key|fictional-model-key/);
    await publicPage.reload();
    await publicPage.getByRole('heading', { name: welcome, exact: true }).waitFor({ state: 'visible' });
    assert.match(await publicPage.title(), /Fixture Journeys/);
    assert.equal(await publicPage.locator('meta[name="description"]').getAttribute('content'), welcome);
    assert.equal(await publicPage.getByRole('combobox', { name: 'Currency', exact: true }).getAttribute('data-value'), 'EUR');
    assert.equal(await publicPage.getByRole('region', { name: brandName + ' capabilities', exact: true }).getByText('Hotels', { exact: true }).count(), 0);
    await publicPage.screenshot({ path: join(artifacts, 'published-storefront.png'), fullPage: true });
    await submitChat(publicPage, 'Open the travel starter.');
    assert.ok(requests.some(request => request.url.includes('/public-sessions')));
    await owner.getByRole('button', { name: 'Sign out', exact: true }).click();
    await mutateThroughUi(owner, '/api/logout', () => owner.getByRole('dialog').getByRole('button', { name: 'Sign out', exact: true }).click());
    await preview.reload();
    await preview.getByRole('heading', { name: 'Open this preview from your studio', exact: true }).waitFor({ state: 'visible' });
    const denied = await preview.evaluate(async () => (await fetch('/api/business/preview/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    })).status);
    assert.equal(denied, 401);
    assert.equal((await (await fetch(portalOrigin + '/api/storefront')).json()).release.id, release.id);
    assert.ok(requests.every(request => !request.url.includes('ticket=')), 'Preview fragments must never enter network request URLs.');
    assert.deepEqual(blocked, [], 'The browser must need no external services in this fictional test.');
    assert.deepEqual(errors, [], 'The complete flow must not raise browser page errors.');
    assert.doesNotMatch(JSON.stringify(model.requests), /fictional-provider-key|fictional-model-key|Draft-only canary/);
    t.diagnostic(`Published the same release; public chat works and owner logout revokes private preview. Evidence: ${artifacts}`);
  } catch (error) {
    for (const [index, page] of (context?.pages() || []).entries()) {
      await page.screenshot({ path: join(artifacts, `failure-${index}.png`), fullPage: true }).catch(() => {});
    }
    t.diagnostic(`Fictional-flow evidence: ${artifacts}`);
    t.diagnostic(`Next output: ${webOutput}`);
    throw error;
  } finally {
    await browser?.close();
    await stopChild(web);
    if (portal) {
      await new Promise(done => portal.close(done));
      await portal.businessClosed;
    }
    await model?.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
