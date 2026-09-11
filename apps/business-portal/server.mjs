import { createServer } from 'node:http';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { PortalStore, SESSION_DURATION_MS } from './store.mjs';
import * as validate from './validation.mjs';
import { checkNuiteeKey } from './nuitee.mjs';
import { BusinessStore } from './business-store.mjs';
import { BusinessRuntime } from './business-runtime.mjs';

const derive = promisify(scrypt);
const scryptOptions = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const COOKIE = 'portal_session';
const MAX_BODY = 32 * 1024;
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/icons.js', ['icons.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
]);
const publicDir = join(dirname(fileURLToPath(import.meta.url)), 'public');

function cookieToken(request, name = COOKIE) {
  const values = (request.headers.cookie || '').split(';').map((part) => part.trim()).filter((part) => part.startsWith(`${name}=`));
  if (values.length !== 1) return null;
  const token = values[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

function sessionCookie(token, name = COOKIE) {
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`;
}

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function requestBody(request) {
  const contentLength = request.headers['content-length'];
  if (contentLength !== undefined && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY)) {
    request.resume();
    validate.fail(413, 'The request is too large.');
  }
  return new Promise((resolveBody, rejectBody) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size <= MAX_BODY) chunks.push(chunk);
    });
    request.once('error', () => rejectBody(new validate.PortalError(400, 'The request could not be read.')));
    request.once('aborted', () => rejectBody(new validate.PortalError(400, 'The request was interrupted.')));
    request.once('end', () => {
      if (size > MAX_BODY) return rejectBody(new validate.PortalError(413, 'The request is too large.'));
      try { resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { rejectBody(new validate.PortalError(400, 'Send a valid JSON request.')); }
    });
  });
}

function constantEquals(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length || left.length > 256) return false;
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function limiter(limit, windowMs) {
  const windows = new Map();
  return (key) => {
    const now = Date.now();
    for (const [entry, state] of windows) if (state.until <= now) windows.delete(entry);
    const current = windows.get(key) || { count: 0, until: now + windowMs };
    current.count += 1;
    windows.set(key, current);
    if (current.count > limit) validate.fail(429, 'Too many attempts. Please try again later.');
  };
}

/** Local-only single-owner application. Tests supply a disposable directory and provider stub. */
export function createPortalServer({ dataDir, checkKey = checkNuiteeKey, travelerUrl = null, businessRuntime = null } = {}) {
  const configuredTravelerUrl = validate.travelerUrl(travelerUrl);
  const Store = businessRuntime ? BusinessStore : PortalStore;
  const store = new Store(dataDir || resolve('.local/portal'));
  let manager;
  try { manager = businessRuntime ? new BusinessRuntime(store, businessRuntime) : null; }
  catch (error) { store.close(); throw error; }
  const previewLimit = limiter(30, 60_000);
  const authLimit = limiter(10, 15 * 60 * 1000);
  const checkLimit = limiter(5, 10 * 60 * 1000);
  const dummySalt = randomBytes(16).toString('hex');
  const runtime = {
    status: 'not_connected', travelerUrl: configuredTravelerUrl,
    message: configuredTravelerUrl
      ? 'The existing traveler experience opens separately. Saved portal settings and knowledge are not applied to it yet.'
      : 'Connect a prepared assistant runtime before previewing or launching chat. Saved portal settings are not applied to a traveler experience yet.',
  };
  const workspace = (value = store.workspace()) => ({ ...value, runtime: manager ? manager.describe() : { ...runtime } });
  const sessionEnvelope = (session) => ({ setupRequired: !store.owner(), user: session?.user || null, csrfToken: session?.csrfToken || null });

  const server = createServer({ maxHeaderSize: 8 * 1024 }, async (request, response) => {
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'");
    try {
      const address = server.address();
      const port = address && typeof address === 'object' ? address.port : null;
      const host = request.headers.host;
      if (!port || ![`localhost:${port}`, `127.0.0.1:${port}`].includes(host)
          || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress)) {
        validate.fail(403, 'This portal is available only on its local address.');
      }
      const expectedOrigin = `http://${host}`;
      const metadata = request.headers['sec-fetch-site'];
      if (request.headers.origin && request.headers.origin !== expectedOrigin) validate.fail(403, 'The request origin is not allowed.');
      const url = new URL(request.url, expectedOrigin);
      if (url.origin !== expectedOrigin) validate.fail(400, 'The request address is invalid.');
      const path = url.pathname;
      const method = request.method;
      const api = path.startsWith('/api/');
      if (host === `localhost:${port}`) {
        if (!api && assets.has(path) && ['GET', 'HEAD'].includes(method)) {
          response.writeHead(307, { Location: `http://127.0.0.1:${port}${path}${url.search}` });
          response.end();
          return;
        }
        validate.fail(403, 'Use the portal at its 127.0.0.1 address.');
      }
      if (api && metadata && !['same-origin', 'none'].includes(metadata)) validate.fail(403, 'Open the portal directly on its local address.');
      if (api && url.search) validate.fail(400, 'API query parameters are not supported.');
      const bridge = manager && ['/api/storefront/preview/exchange', '/api/storefront/preview/session', '/api/storefront/preview'].includes(path);
      if (bridge && (request.headers.origin || metadata)) validate.fail(403, 'Use the storefront server for private preview access.');
      const mutation = !['GET', 'HEAD'].includes(method);
      if (mutation) {
        if (!bridge && (request.headers.origin !== expectedOrigin || metadata && metadata !== 'same-origin')) validate.fail(403, 'A same-origin request is required.');
        if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] || '')) validate.fail(415, 'Send JSON with Content-Type application/json.');
      }

      if (!api) {
        const asset = assets.get(path);
        if (!asset) validate.fail(404, 'Not found.');
        if (!['GET', 'HEAD'].includes(method)) validate.fail(405, 'This method is not supported.');
        let content;
        try { content = await readFile(join(publicDir, asset[0])); }
        catch { validate.fail(404, 'Not found.'); }
        response.writeHead(200, { 'Content-Type': asset[1], 'Content-Length': content.length });
        response.end(method === 'HEAD' ? undefined : content);
        return;
      }

      if (manager && path === '/api/storefront' && method === 'GET') return json(response, 200, manager.projection());
      const previewBinding = () => {
        const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.authorization || '');
        const binding = store.previewSession(match?.[1]);
        if (!binding) validate.fail(401, 'Open a fresh private preview from the signed-in portal.');
        manager.previewFor(binding.releaseId);
        return binding;
      };
      if (bridge && path === '/api/storefront/preview/exchange' && method === 'POST') {
        previewLimit(request.socket.remoteAddress);
        const body = validate.fields(await requestBody(request), ['ticket']);
        const exchanged = store.exchangePreviewTicket(body.ticket);
        manager.previewFor(exchanged.releaseId);
        return json(response, 200, { token: exchanged.token, expiresAt: exchanged.expiresAt });
      }
      if (bridge && path === '/api/storefront/preview' && method === 'GET') return json(response, 200, manager.projection(previewBinding().releaseId));
      if (bridge && path === '/api/storefront/preview/session' && method === 'POST') {
        const binding = previewBinding();
        // The SDK receives its configured origin and server-owned identity only.
        // Browser locale/context is not a routing or permission input.
        validate.fields(await requestBody(request), [], ['clientContext']);
        const result = await manager.previewFor(binding.releaseId).handle.session(binding.userId);
        previewBinding();
        return json(response, 200, result);
      }
      const cookieName = manager ? `wayfare_portal_${port}` : COOKIE;
      const token = cookieToken(request, cookieName);
      const session = store.session(token);
      if (path === '/api/session' && method === 'GET') return json(response, 200, sessionEnvelope(session));

      if (['/api/setup', '/api/login'].includes(path) && method === 'POST') {
        authLimit(request.socket.remoteAddress);
        const body = await requestBody(request);
        if (path === '/api/setup') {
          validate.fields(body, ['name', 'email', 'password', 'businessName']);
          const name = validate.text(body.name, 'Owner name', 1, 80);
          const email = validate.email(body.email);
          const businessName = validate.text(body.businessName, 'Business name', 1, 40);
          const password = validate.password(body.password);
          if (store.owner()) validate.fail(409, 'The owner account is already set up. Sign in instead.');
          const salt = randomBytes(16).toString('hex');
          const hash = await derive(password, salt, 64, scryptOptions);
          store.createOwner({ name, email, businessName, salt, passwordHash: hash.toString('hex') });
          hash.fill(0);
        } else {
          validate.fields(body, ['email', 'password']);
          const email = validate.email(body.email);
          const password = validate.password(body.password);
          const owner = store.owner();
          const hash = await derive(password, owner?.password_salt || dummySalt, 64, scryptOptions);
          const expected = owner ? Buffer.from(owner.password_hash, 'hex') : Buffer.alloc(64);
          const matches = timingSafeEqual(hash, expected);
          hash.fill(0);
          if (!owner || owner.email !== email || !matches) validate.fail(401, 'Email or password is incorrect.');
        }
        const created = store.createSession(token);
        response.setHeader('Set-Cookie', sessionCookie(created.token, cookieName));
        return json(response, 200, sessionEnvelope(created));
      }

      if (!session) validate.fail(401, 'Sign in to continue.');
      if (mutation && !constantEquals(request.headers['x-csrf-token'], session.csrfToken)) validate.fail(403, 'The session changed. Reload the portal and try again.');
      const authenticatedBody = async () => {
        const body = await requestBody(request);
        const current = store.session(token);
        if (!current) validate.fail(401, 'Sign in to continue.');
        if (!constantEquals(request.headers['x-csrf-token'], current.csrfToken)) validate.fail(403, 'The session changed. Reload the portal and try again.');
        return body;
      };

      if (path === '/api/logout' && method === 'POST') {
        validate.fields(await authenticatedBody(), []);
        store.deleteSession(token);
        if (manager?.preview?.ownerToken === token) await manager.stopPreview();
        response.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
        return json(response, 200, { ok: true });
      }
      if (manager && path === '/api/model' && method === 'PUT') return json(response, 200, workspace(store.saveModel(await authenticatedBody())));
      if (manager && path === '/api/model' && method === 'DELETE') {
        const body = validate.fields(await authenticatedBody(), ['revision']);
        store.removeModel(validate.revision(body.revision));
        await manager.stopAll();
        return json(response, 200, workspace());
      }
      if (manager && ['/api/runtime/preview', '/api/runtime/publish'].includes(path) && method === 'POST') {
        const body = validate.fields(await authenticatedBody(), ['revision', 'releaseId']);
        if (typeof body.releaseId !== 'string' || !/^r_[a-f0-9-]{36}$/.test(body.releaseId)) validate.fail(400, 'Choose a reviewed version.');
        await manager[path.endsWith('/preview') ? 'startPreview' : 'publish'](validate.revision(body.revision), body.releaseId, token);
        return json(response, 200, workspace());
      }
      if (manager && path === '/api/runtime/preview-link' && method === 'POST') {
        const body = validate.fields(await authenticatedBody(), ['releaseId']);
        return json(response, 200, { url: manager.previewLink(body.releaseId, token) });
      }
      if (path === '/api/workspace' && method === 'GET') return json(response, 200, workspace());
      if (path === '/api/releases' && method === 'POST') {
        const body = validate.fields(await authenticatedBody(), ['revision']);
        return json(response, 200, workspace(store.prepareRelease(validate.revision(body.revision))));
      }
      const releaseId = /^\/api\/releases\/(r_[a-f0-9-]{36})$/.exec(path)?.[1];
      if (releaseId && method === 'GET') return json(response, 200, { release: store.release(releaseId) });
      if (path === '/api/bookings' && method === 'GET') return json(response, 200, { status: 'not_connected', bookings: [] });
      if (path === '/api/analytics' && method === 'GET') return json(response, 200, { status: 'not_connected', metrics: null });
      if (path === '/api/conversations' && method === 'GET') return json(response, 200, { status: 'not_connected', conversations: [] });
      if (path === '/api/settings' && method === 'PUT') {
        const body = validate.fields(await authenticatedBody(), ['revision', 'settings']);
        return json(response, 200, workspace(store.saveSettings(validate.revision(body.revision), validate.settings(body.settings))));
      }
      if (path === '/api/knowledge' && method === 'POST') {
        const body = validate.knowledge(await authenticatedBody());
        return json(response, 200, workspace(store.saveKnowledge(body)));
      }
      const publishId = /^\/api\/knowledge\/(k_[a-f0-9-]{36})\/publish$/.exec(path)?.[1];
      if (publishId && method === 'POST') {
        const body = validate.fields(await authenticatedBody(), ['revision']);
        return json(response, 200, workspace(store.publishKnowledge(validate.revision(body.revision), publishId)));
      }
      if (path === '/api/connection' && method === 'PUT') {
        return json(response, 200, workspace(store.saveConnection(validate.connection(await authenticatedBody()))));
      }
      if (path === '/api/connection' && method === 'DELETE') {
        const body = validate.fields(await authenticatedBody(), ['revision']);
        store.removeConnection(validate.revision(body.revision));
        if (manager) await manager.stopAll();
        return json(response, 200, workspace());
      }
      if (path === '/api/connection/check' && method === 'POST') {
        checkLimit(session.user.id);
        const body = validate.fields(await authenticatedBody(), ['revision']);
        const revision = validate.revision(body.revision);
        let apiKey = store.keyForCheck(revision);
        let status = 'unavailable';
        try {
          const result = await checkKey(apiKey);
          if (['verified', 'rejected', 'unavailable'].includes(result?.status)) status = result.status;
        } catch { /* Provider exceptions are deliberately never logged or exposed. */ }
        finally { apiKey = undefined; }
        // A replaced key, logout or expired session cannot be committed after an in-flight check.
        if (!store.session(token)) validate.fail(401, 'Sign in to continue.');
        return json(response, 200, workspace(store.saveConnectionCheck(revision, status)));
      }
      validate.fail(404, 'Not found.');
    } catch (error) {
      if (response.destroyed || response.writableEnded) return;
      const expected = error instanceof validate.PortalError;
      if (expected && error.status === 429) response.setHeader('Retry-After', '600');
      json(response, expected ? error.status : 500, { error: expected ? error.message : 'The portal could not complete the request. Please try again.' });
    }
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 100;
  server.businessClosed = new Promise(done => server.on('close', () => {
    Promise.resolve(manager?.close()).catch(() => {}).finally(() => { store.close(); done(); });
  }));
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rawPort = process.env.PORT || '3003';
  if (!/^\d{1,5}$/.test(rawPort) || Number(rawPort) < 1024 || Number(rawPort) > 65535) {
    console.error('PORT must be an integer from 1024 to 65535.');
    process.exitCode = 1;
  } else {
    try {
      const server = createPortalServer({ dataDir: process.env.DATA_DIR || resolve('.local/portal'), travelerUrl: process.env.PORTAL_TRAVELER_URL || null,
        businessRuntime: process.env.WAYFARE_BUSINESS_ROOT ? { root: process.env.WAYFARE_BUSINESS_ROOT, websiteOrigin: process.env.WAYFARE_STOREFRONT_ORIGIN || 'http://localhost:3100' } : null });
      server.on('error', () => { console.error('The local portal could not start. Check its port and private storage configuration.'); process.exitCode = 1; });
      server.listen(Number(rawPort), '127.0.0.1', () => console.log(`Business portal: http://127.0.0.1:${rawPort}`));
      for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
    } catch {
      console.error('The local portal could not start. Check its private storage and traveler URL configuration.');
      process.exitCode = 1;
    }
  }
}
