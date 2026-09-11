import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, rmSync, lstatSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as validate from './validation.mjs';

export function sdkRuntimeDriver({ root, dataDir, websiteOrigin, workerExecArgv = [] }) {
  return async ({ release, secrets, access, port }) => {
    const id = randomUUID();
    const options = { root, id, release, secrets, access, port, websiteOrigin,
      configDir: join(dataDir, 'runtime', id), manifestPath: join(root, 'src', `.business-runtime-${id}.ts`),
      knowledgeDir: join(root, 'src', '.business-runtime', id) };
    const child = fork(join(root, 'scripts/business-runtime-worker.mjs'), [], {
      cwd: root, stdio: ['ignore', 'ignore', 'ignore', 'ipc'], execArgv: workerExecArgv,
      // Do not inherit another application/provider's environment credentials.
      env: { PATH: process.env.PATH, NODE_ENV: 'development' },
    });
    let ready = false, closed = false, metadata;
    const requests = new Map();
    const cleanup = () => {
      for (const file of [options.manifestPath, options.knowledgeDir, options.configDir]) rmSync(file, { recursive: true, force: true });
    };
    const result = {
      get alive() { return ready && !closed; }, get origin() { return metadata?.origin; }, get embedId() { return metadata?.embedId; }, port,
      async close() {
        if (closed) return;
        await new Promise(done => {
          const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
          child.once('exit', () => { clearTimeout(timer); done(); });
          if (child.connected) child.send({ type: 'stop' }); else child.kill('SIGTERM');
        });
      },
      session(userId) {
        if (!result.alive) validate.fail(503, 'The private assistant is unavailable. Start a fresh preview.');
        return new Promise((resolveSession, reject) => {
          const requestId = randomUUID();
          const timeout = setTimeout(() => { requests.delete(requestId); reject(new validate.PortalError(503, 'The assistant session could not start.')); }, 15_000);
          requests.set(requestId, { resolve: value => { clearTimeout(timeout); resolveSession(value); }, reject: () => { clearTimeout(timeout); reject(new validate.PortalError(503, 'The assistant session could not start.')); } });
          child.send({ type: 'session', requestId, userId });
        });
      },
    };
    return new Promise((resolveBoot, rejectBoot) => {
      let diagnostic = 'local startup';
      const reject = () => rejectBoot(new validate.PortalError(503, `The assistant could not start (${diagnostic}). Check the saved model settings and local runtime ports, then retry.`));
      const timeout = setTimeout(() => { reject(); void result.close(); }, 120_000);
      child.on('error', () => { clearTimeout(timeout); reject(); });
      child.on('exit', () => {
        closed = true; clearTimeout(timeout); cleanup();
        for (const request of requests.values()) request.reject();
        requests.clear(); if (!ready) reject();
      });
      child.on('message', message => {
        if (message.type === 'diagnostic') { diagnostic = message.codes.join(', '); }
        else if (message.type === 'ready') { metadata = message; ready = true; clearTimeout(timeout); resolveBoot(result); }
        else if (message.requestId) {
          const request = requests.get(message.requestId); requests.delete(message.requestId);
          if (request) message.type === 'session' ? request.resolve(message.result) : request.reject();
        } else if (message.type === 'error' && !ready) { clearTimeout(timeout); if (diagnostic === 'local startup') diagnostic = message.stage || diagnostic; void result.close().then(reject); }
      });
      child.send({ type: 'start', options });
      options.secrets = undefined;
    });
  };
}

/** Owns only this data directory and the workers it started. */
export class BusinessRuntime {
  constructor(store, { root, websiteOrigin = 'http://localhost:3100', ports = [3105, 3106, 3107], driver } = {}) {
    const url = new URL(websiteOrigin);
    if (url.origin !== websiteOrigin || url.protocol !== 'http:' || url.hostname !== 'localhost' || !url.port) throw Error('Use an exact localhost storefront origin.');
    if (ports.length !== 3 || new Set(ports).size !== 3 || ports.some(port => !Number.isInteger(port) || port < 1024 || port > 65535)) throw Error('Use three distinct local runtime ports.');
    this.store = store; this.root = resolve(root); this.websiteOrigin = websiteOrigin; this.ports = ports;
    this.driver = driver || sdkRuntimeDriver({ root: this.root, dataDir: store.dataDir, websiteOrigin });
    this.busy = false; this.closed = false; this.live = null; this.preview = null; this.retired = null; this.pending = new Set();
    this.lockPath = join(store.dataDir, 'runtime.lock');
    try { writeFileSync(this.lockPath, String(process.pid), { flag: 'wx', mode: 0o600 }); }
    catch (error) {
      if (error.code !== 'EEXIST' || !lstatSync(this.lockPath).isFile()) throw error;
      const pid = Number(readFileSync(this.lockPath, 'utf8'));
      if (!Number.isInteger(pid) || pid < 1) throw Error('Invalid local runtime lock.');
      let alive = true;
      try { process.kill(pid, 0); } catch (e) { if (e.code === 'ESRCH') alive = false; }
      if (alive) throw Error('This business data directory is already running.');
      rmSync(this.lockPath); writeFileSync(this.lockPath, String(process.pid), { flag: 'wx', mode: 0o600 });
    }
    const runtimeDir = join(store.dataDir, 'runtime');
    mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
    // Once the exclusive data-directory lock is held, remove stale private SDK
    // files from a previous crash. UUID names are derived here, never accepted
    // as arbitrary filesystem paths from stored or browser-supplied data.
    for (const entry of readdirSync(runtimeDir)) {
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(entry)) continue;
      rmSync(join(this.root, 'src', `.business-runtime-${entry}.ts`), { force: true });
      rmSync(join(this.root, 'src', '.business-runtime', entry), { recursive: true, force: true });
      rmSync(join(runtimeDir, entry), { recursive: true, force: true });
    }
    this.store.clearPreviewAccess();
    this.sweep = setInterval(() => { if (this.preview && !this.store.session(this.preview.ownerToken)) void this.stopPreview(); }, 1000);
    this.sweep.unref();
    this.restoring = this.restore();
  }
  async exclusive(action) {
    if (this.closed || this.stopping) validate.fail(503, 'The local runtime is shutting down.');
    if (this.busy) validate.fail(409, 'An assistant operation is already running. Wait for it to finish.');
    this.busy = true;
    const task = Promise.resolve().then(action);
    this.pending.add(task);
    try { return await task; } finally { this.pending.delete(task); this.busy = false; }
  }
  async restore() {
    const id = this.store.publication().active_release;
    if (!id) return;
    try { await this.exclusive(async () => {
      const release = this.store.release(id);
      const handle = await this.driver({ release, secrets: this.store.runtimeSecrets(release), access: 'public', port: this.ports[0] });
      if (this.closed || this.stopping) { await handle.close(); return; }
      this.live = { release, handle };
    }); } catch { /* Persisted publication remains visible but unavailable; never substitute another release. */ }
  }
  describe() {
    const publication = this.store.publication();
    return { enabled: true, travelerUrl: this.websiteOrigin, busy: this.busy,
      status: this.live?.handle.alive ? 'ready' : publication.active_release ? 'unavailable' : 'not_connected',
      message: this.live?.handle.alive ? 'The local storefront is using the published version.' : 'Prepare a saved version, test its private chat, then publish it to the local storefront.',
      preview: this.preview?.handle.alive ? { releaseId: this.preview.release.id, digest: this.preview.release.digest, ready: true } : null,
      active: publication.active_release ? { releaseId: publication.active_release, digest: this.live?.release.digest ?? null, activatedAt: publication.activated_at } : null };
  }
  current(revision, releaseId, ownerToken) {
    if (!this.store.session(ownerToken)) validate.fail(401, 'Sign in to continue.');
    const state = this.store.workspace();
    this.store.assertRevision(state.revision, revision);
    if (!state.releaseCurrent || state.release?.id !== releaseId) validate.fail(409, 'Prepare and review the current saved version before continuing.');
    if (state.release.schemaVersion !== 2 || !state.release.assistant?.configured) validate.fail(409, 'Save model settings and prepare a new version first.');
    if (state.settings.capabilities.checkout) validate.fail(409, 'Checkout is not implemented. Disable it before preparing a version.');
    if (state.settings.capabilities.hotels && state.settings.currency === 'GBP') validate.fail(409, 'Hotel search supports CAD, USD and EUR. Choose one of these or disable hotels.');
    return state.release;
  }
  async stopPreview() {
    const previous = this.preview; this.preview = null; this.store.clearPreviewAccess();
    await previous?.handle.close();
  }
  async startPreview(revision, releaseId, ownerToken) {
    return this.exclusive(async () => {
      const release = this.current(revision, releaseId, ownerToken);
      const secrets = this.store.runtimeSecrets(release);
      await this.stopPreview();
      const handle = await this.driver({ release, secrets, access: 'authenticated', port: this.ports[2] });
      try {
        this.current(revision, releaseId, ownerToken);
        if (this.closed || this.stopping) validate.fail(503, 'The local runtime is shutting down.');
        this.preview = { release, handle, ownerToken };
      } catch (error) { await handle.close(); throw error; }
    });
  }
  previewFor(releaseId) {
    if (!this.preview?.handle.alive || this.preview.release.id !== releaseId || !this.store.session(this.preview.ownerToken)) validate.fail(409, 'Start a fresh private preview of this version.');
    return this.preview;
  }
  previewLink(releaseId, token) {
    this.previewFor(releaseId);
    if (this.preview.ownerToken !== token) validate.fail(403, 'Start the private preview from this signed-in session.');
    return `${this.websiteOrigin}/studio-preview#ticket=${this.store.previewTicket(releaseId, token)}`;
  }
  async publish(revision, releaseId, ownerToken) {
    return this.exclusive(async () => {
      const release = this.current(revision, releaseId, ownerToken);
      const preview = this.previewFor(releaseId);
      if (preview.ownerToken !== ownerToken) validate.fail(403, 'Preview this version in your signed-in session before publishing.');
      if (this.live?.release.id === releaseId && this.live.handle.alive) return;
      const port = this.live?.handle.port === this.ports[0] ? this.ports[1] : this.ports[0];
      await this.retired?.handle.close(); this.retired = null;
      const handle = await this.driver({ release, secrets: this.store.runtimeSecrets(release), access: 'public', port });
      try {
        this.current(revision, releaseId, ownerToken); this.previewFor(releaseId);
        if (this.closed || this.stopping || !handle.alive) validate.fail(503, 'The local runtime is unavailable.');
        this.store.activate(revision, releaseId);
        this.retired = this.live; this.live = { release, handle };
      } catch (error) { await handle.close(); throw error; }
      // A new release can disable tools or remove knowledge. Retire prior
      // sessions immediately so old embeds cannot retain those capabilities.
      await this.retired?.handle.close(); this.retired = null;
    });
  }
  projection(previewReleaseId) {
    const entry = previewReleaseId ? this.previewFor(previewReleaseId) : this.live;
    if (!entry?.handle.alive) return { status: this.store.publication().active_release ? 'unavailable' : 'not_published', release: null, runtime: null };
    return { status: 'ready', release: { id: entry.release.id, digest: entry.release.digest, settings: entry.release.settings }, runtime: {
      status: 'ready', serviceUrl: entry.handle.origin,
      ...(previewReleaseId ? { sessionEndpoint: '/api/business/preview/session' } : { embedId: entry.handle.embedId }),
    } };
  }
  async stopAll() {
    if (this.stopping) return this.stopping;
    this.stopping = (async () => {
      await Promise.allSettled([...this.pending]);
      await this.stopPreview();
      await Promise.allSettled([this.live?.handle.close(), this.retired?.handle.close()]);
      this.live = null; this.retired = null;
    })();
    try { await this.stopping; } finally { this.stopping = null; }
  }
  async close() {
    this.closed = true; clearInterval(this.sweep);
    await this.stopAll(); rmSync(this.lockPath, { force: true });
  }
}
