import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createBusinessModelFixture } from './fixtures/business-model.mjs';
import { BusinessStore } from '../apps/business-portal/business-store.mjs';
import { BusinessRuntime, sdkRuntimeDriver } from '../apps/business-portal/business-runtime.mjs';
import { createAssistantClient } from '@noodleseed/assistant/client';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('fictional model transport blocks external named and global fetch before connection', async () => {
  const model = await createBusinessModelFixture();
  try {
    const script = `
      import assert from 'node:assert/strict';
      import { subscribe } from 'node:diagnostics_channel';
      import { Agent, fetch as namedFetch } from 'undici';
      let unexpectedConnections = 0;
      subscribe('undici:client:beforeConnect', ({connectParams}) => {
        if (!['127.0.0.1', 'localhost'].includes(connectParams.hostname)) unexpectedConnections++;
      });
      const explicitAgent = new Agent();
      for (const request of [
        () => fetch('https://outside.example.test/v1'),
        () => namedFetch('https://outside.example.test/v1', {dispatcher: explicitAgent}),
        () => namedFetch('https://models.example.test.evil.invalid/v1', {dispatcher: explicitAgent}),
      ]) await assert.rejects(request, error => /External requests are blocked/.test(String(error.cause)));
      const response = await namedFetch('https://models.example.test/v1/chat/completions', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({messages: [{role: 'user', content: 'Open the travel starter.'}]}),
        dispatcher: explicitAgent,
      });
      assert.equal(response.status, 200);
      await response.json();
      assert.equal(unexpectedConnections, 0);
      await explicitAgent.close();
    `;
    await promisify(execFile)(process.execPath, [...model.workerExecArgv, '--input-type=module', '--eval', script], { cwd: resolve(import.meta.dirname, '..'), timeout: 20_000 });
    assert.equal(model.requests.length, 1);
  } finally { await model.close(); }
});

test('actual local SDK previews an immutable business release, streams a linked App turn, publishes and restores it', { timeout: 180_000 }, async () => {
  const root = resolve(import.meta.dirname, '..'), dataDir = await mkdtemp(join(tmpdir(), 'business-sdk-test-'));
  const model = await createBusinessModelFixture();
  const store = new BusinessStore(dataDir);
  let runtime;
  const runtimeOptions = { root, ports: [3415, 3416, 3417], driver: sdkRuntimeDriver({ root, dataDir, websiteOrigin: 'http://localhost:3100', workerExecArgv: model.workerExecArgv }) };
  try {
    store.createOwner({ name: 'Fixture Owner', email: 'fixture@example.test', businessName: 'Fixture Journeys', salt: 'unused', passwordHash: 'unused' });
    let state = store.workspace();
    state = store.saveConnection({ revision: state.revision, apiKey: 'fictional-provider-key', environment: 'sandbox' });
    state = store.saveModel({ revision: state.revision, apiKey: 'fictional-model-key', baseUrl: 'https://models.example.test/v1', model: 'fictional-model', transport: 'chat-completions' });
    state = store.saveSettings(state.revision, { ...state.settings, currency: 'EUR', adults: '2 adults', capabilities: { flights: true, hotels: false, experiences: false, cars: false, checkout: false } });
    state = store.saveKnowledge({ revision: state.revision, title: 'Fixture hours', kind: 'FAQ', content: 'Our fictional desk opens at 10:37 each Tuesday.' });
    state = store.publishKnowledge(state.revision, state.knowledge[0].id);
    state = store.prepareRelease(state.revision);
    const owner = store.createSession();
    runtime = new BusinessRuntime(store, runtimeOptions);
    await runtime.startPreview(state.revision, state.release.id, owner.token);
    assert.equal(runtime.describe().preview.releaseId, state.release.id);
    assert.equal(runtime.projection().status, 'not_published');
    const preview = runtime.previewFor(state.release.id);
    const session = await preview.handle.session('1');
    assert.ok(session.token); assert.ok(session.endpoints.turns);
    const events = [];
    const client = createAssistantClient({ sessionEndpoint: 'http://fixture.invalid/session', fetch: async (url, init) => {
      if (String(url) === 'http://fixture.invalid/session') return Response.json(session);
      const headers = new Headers(init?.headers); headers.set('Origin', 'http://localhost:3100');
      return fetch(url, { ...init, headers });
    } });
    client.subscribe(event => events.push(event));
    await client.connect();
    await client.sendMessage('Open the travel starter.');
    assert.ok(!client.getChatState().error);
    assert.ok(model.requests.length >= 2, 'real SDK must invoke the model transport and execute the tool');
    assert.ok(JSON.stringify(events).includes('Fixture answer from the connected business assistant.'), 'streamed answer reaches official client');
    assert.ok(JSON.stringify(events).includes('view_available'), 'linked App event reaches official client');
    await client.sendMessage('What are your desk hours?');
    assert.ok(!client.getChatState().error);
    const knowledgeHits = model.requests.flatMap(request => request.messages ?? []).filter(message => message.role === 'tool').flatMap(message => JSON.parse(message.content).hits ?? []);
    assert.ok(knowledgeHits.some(hit => hit.title === 'Fixture hours' && /desk opens at 10[ :]+37 each tuesday/i.test(hit.excerpt)), 'actual knowledge retrieval returns the approved source');
    const serialized = JSON.stringify(model.requests);
    assert.ok(serialized.includes('Fixture Journeys'));
    assert.ok(serialized.includes('EUR'));
    assert.ok(serialized.includes('search_business_knowledge'));
    assert.ok(!model.requests[0].tools.some(tool => tool.function?.name === 'search_hotels'), 'disabled hotel tool is absent from actual model surface');
    assert.ok(!serialized.includes('fictional-provider-key') && !serialized.includes('fictional-model-key'));
    await runtime.publish(state.revision, state.release.id, owner.token);
    assert.equal(runtime.projection().release.id, state.release.id);
    assert.ok(runtime.projection().runtime.embedId);
    await runtime.close();
    runtime = new BusinessRuntime(store, runtimeOptions);
    await runtime.restoring;
    assert.equal(runtime.projection().release.id, state.release.id);
    assert.equal(runtime.describe().preview, null);
    const published = runtime.projection();
    const publicEvents = [];
    const publicClient = createAssistantClient({ embedId: published.runtime.embedId, serviceUrl: published.runtime.serviceUrl, fetch: async (url, init) => {
      const headers = new Headers(init?.headers); headers.set('Origin', 'http://localhost:3100');
      return fetch(url, { ...init, headers });
    } });
    publicClient.subscribe(event => publicEvents.push(event));
    await publicClient.connect();
    await publicClient.sendMessage('Open the travel starter.');
    assert.ok(!publicClient.getChatState().error);
    assert.ok(JSON.stringify(publicEvents).includes('view_available'), 'restored public release still executes tools and streams its linked App');
    assert.ok(JSON.stringify(publicEvents).includes('Fixture answer from the connected business assistant.'));
  } finally { await runtime?.close(); store.close(); await model.close(); await rm(dataDir, { recursive: true, force: true }); }
});
