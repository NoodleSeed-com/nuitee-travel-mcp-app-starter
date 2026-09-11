// Isolated local SDK host. IPC and private files carry credentials; output never does.
import { dev, run, setLocalConfigValue } from '@noodleseed/one';
import { createAssistantSession } from '@noodleseed/assistant/server';
import { mkdir, readFile, writeFile, rm, chmod, readdir } from 'node:fs/promises';
import { join } from 'node:path';
let handle, privateClient, options, stopping = false, stage = 'preparing';
const send = value => { if (process.connected) process.send(value); };
async function privateModes(directory) {
  await chmod(directory, 0o700);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) await privateModes(join(directory, entry.name));
    else if (entry.isFile()) await chmod(join(directory, entry.name), 0o600);
  }
}
async function stop() {
  if (stopping) return;
  stopping = true;
  await handle?.close().catch(() => {});
  if (options) await Promise.allSettled([rm(options.manifestPath, { force: true }), rm(options.knowledgeDir, { recursive: true, force: true }), rm(options.configDir, { recursive: true, force: true })]);
  process.exit(0);
}
async function start(input) {
  options = input;
  const { root, id, release, secrets, websiteOrigin, access, port, configDir, manifestPath, knowledgeDir } = input;
  await mkdir(configDir, { recursive: true, mode: 0o700 });
  await mkdir(knowledgeDir, { recursive: true, mode: 0o700 });
  const knowledgePaths = {};
  for (const source of release.knowledge) {
    knowledgePaths[source.id] = `.business-runtime/${id}/${source.id}.md`;
    await writeFile(join(knowledgeDir, `${source.id}.md`), source.content, { flag: 'wx', mode: 0o600 });
  }
  const runtime = { websiteOrigin, access, knowledgePaths, modelTransport: release.assistant.transport };
  await writeFile(manifestPath, `import { createBusinessServer } from './business-server.js';\nexport default createBusinessServer(${JSON.stringify(release)}, ${JSON.stringify(runtime)});\n`, { flag: 'wx', mode: 0o600 });
  const scope = { level: 'env', org: 'local', app: 'wayfare-business', env: access === 'public' ? 'live' : 'preview' };
  for (const [kind, name, value] of [
    ['secret', 'NUITEE_API_KEY', secrets.providerKey],
    ['secret', 'ASSISTANT_MODEL_API_KEY', secrets.modelKey],
    ['variable', 'ASSISTANT_MODEL_BASE_URL', release.assistant.baseUrl],
    ['variable', 'ASSISTANT_MODEL', release.assistant.model],
    ['variable', 'NOODLE_KNOWLEDGE_ENABLED', 'true'],
  ]) setLocalConfigValue(configDir, { kind, scope, name, value });
  // The SDK's local secret resolver needs its own private configuration. The
  // authoritative long-lived copy is encrypted in the portal vault.
  input.secrets = undefined;
  await privateModes(configDir);
  stage = 'compiling';
  handle = await dev({ manifestPath, projectRoot: configDir, org: scope.org, app: scope.app, env: scope.env, port, watch: false, interactive: false, log: () => {} });
  if (!handle.boot.ok) { send({ type: 'diagnostic', codes: handle.boot.errors.map(error => /^[a-z_]{1,60}$/.test(error.code) ? error.code : 'boot_error') }); throw Error('boot_failed'); }
  if (handle.origin !== `http://127.0.0.1:${port}`) { stage = 'origin_validation'; throw Error('origin_failed'); }
  if (access === 'authenticated') {
    stage = 'provisioning_preview';
    const lines = [], original = console.log;
    let code;
    try {
      console.log = (...values) => lines.push(values.join(' '));
      // Local dev has no hosted control-plane identity. This synthetic token is
      // accepted only by the isolated loopback development service.
      code = await run(['assistant', 'clients', 'create', '--name', 'owner-preview', '--service', handle.origin,
        '--org', scope.org, '--app', scope.app, '--env', scope.env, '--auth-token', 'local-business-preview', '--json'], {}, join(configDir, 'cli'));
    } finally { console.log = original; }
    if (code !== 0) throw Error('preview_client_failed');
    const output = JSON.parse(lines.join('\n'));
    privateClient = JSON.parse(await readFile(output.data.secretFile, 'utf8'));
    await privateModes(configDir);
  } else if (!handle.boot.embedId) throw Error('embed_missing');
  send({ type: 'ready', origin: handle.origin, embedId: handle.boot.embedId ?? null });
}
process.on('message', async message => {
  try {
    if (message.type === 'start') await start(message.options);
    if (message.type === 'stop') await stop();
    if (message.type === 'session') {
      if (!privateClient || !handle || stopping) throw Error('preview_unavailable');
      const result = await createAssistantSession({ serviceUrl: handle.origin, clientId: privateClient.clientId,
        clientSecret: privateClient.clientSecret, origin: options.websiteOrigin, user: { id: message.userId } });
      send({ type: 'session', requestId: message.requestId, result });
    }
  } catch {
    send({ type: 'error', stage, requestId: message.requestId ?? null });
    if (message.type === 'start') await stop();
  }
});
process.once('disconnect', stop);
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
process.on('uncaughtException', () => { send({ type: 'error' }); void stop(); });
process.on('unhandledRejection', () => { send({ type: 'error' }); void stop(); });
