import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  createAssistantSession,
  type CreateAssistantSessionInput,
} from '@noodleseed/assistant/server';
import { createServer as createViteServer } from 'vite';
import { createDemoAuthStore, type DemoAuthStore } from './auth.ts';

export type HostMode = 'development' | 'production';

type HostEnvironment = Readonly<Partial<Record<
  | 'NOODLE_SERVICE_URL'
  | 'NOODLE_ASSISTANT_CLIENT_ID'
  | 'NOODLE_ASSISTANT_CLIENT_SECRET'
  | 'PUBLIC_APP_ORIGIN',
  string | undefined
>>>;

export interface HostConfig {
  readonly publicOrigin?: string;
  readonly assistant?: {
    readonly serviceUrl: string;
    readonly clientId: string;
    readonly clientSecret: string;
  };
}

type SessionExchange = (input: CreateAssistantSessionInput) => Promise<unknown>;

const LOCAL_ORIGIN = 'http://localhost:5173';
const PORT = 5173;
const HOST = '127.0.0.1';

function exactOrigin(value: string | undefined, mode: HostMode) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.origin !== value || url.pathname !== '/' || url.search || url.hash) return undefined;
    if (mode === 'production' && url.protocol !== 'https:') return undefined;
    if (mode === 'development' && value !== LOCAL_ORIGIN) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

function exactHttpsServiceOrigin(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:'
      || url.username
      || url.password
      || url.origin !== value
      || url.pathname !== '/'
      || url.search
      || url.hash
    ) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function readHostConfig(env: HostEnvironment, mode: HostMode): HostConfig {
  const publicOrigin = exactOrigin(
    env.PUBLIC_APP_ORIGIN?.trim() || (mode === 'development' ? LOCAL_ORIGIN : undefined),
    mode,
  );
  const serviceUrl = exactHttpsServiceOrigin(env.NOODLE_SERVICE_URL?.trim());
  const clientId = env.NOODLE_ASSISTANT_CLIENT_ID?.trim();
  const clientSecret = env.NOODLE_ASSISTANT_CLIENT_SECRET?.trim();

  return {
    publicOrigin,
    ...(publicOrigin && serviceUrl && clientId && clientSecret
      ? { assistant: { serviceUrl, clientId, clientSecret } }
      : {}),
  };
}

function json(status: number, body: unknown, headers: HeadersInit = {}) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function matchesOrigin(request: Request, config: HostConfig) {
  return Boolean(config.publicOrigin && request.headers.get('origin') === config.publicOrigin);
}

export function createHostApi(options: {
  readonly mode: HostMode;
  readonly config: HostConfig;
  readonly auth?: DemoAuthStore;
  readonly exchange?: SessionExchange;
}) {
  const auth = options.auth ?? createDemoAuthStore({ secure: options.mode === 'production' });
  const exchange = options.exchange ?? createAssistantSession;

  return async function handleApi(request: Request): Promise<Response | undefined> {
    const path = new URL(request.url).pathname;

    if (path === '/api/host/status' && request.method === 'GET') {
      const signedIn = Boolean(auth.read(request.headers.get('cookie')));
      return json(200, {
        authenticated: signedIn,
        demoAvailable: options.mode === 'development',
        assistant: options.config.assistant ? 'ready' : 'setup_required',
      });
    }

    if (path === '/api/demo/login' && request.method === 'POST') {
      if (options.mode !== 'development') return json(404, { code: 'not_found' });
      if (!matchesOrigin(request, options.config)) return json(403, { code: 'origin_forbidden' });
      const session = auth.issue();
      return json(200, { authenticated: true, demo: true }, { 'set-cookie': session.cookie });
    }

    if (path === '/api/demo/logout' && request.method === 'POST') {
      if (options.mode !== 'development') return json(404, { code: 'not_found' });
      if (!matchesOrigin(request, options.config)) return json(403, { code: 'origin_forbidden' });
      return json(200, { authenticated: false }, {
        'set-cookie': auth.revoke(request.headers.get('cookie')),
      });
    }

    if (path === '/api/assistant/session' && request.method === 'POST') {
      if (!matchesOrigin(request, options.config)) return json(403, { code: 'origin_forbidden' });
      const user = auth.read(request.headers.get('cookie'));
      if (!user) return json(401, { code: 'authentication_required' });
      if (!options.config.assistant || !options.config.publicOrigin) {
        return json(503, {
          code: 'setup_required',
          message: 'The travel assistant needs deployment setup before it can start.',
        });
      }

      try {
        const session = await exchange({
          serviceUrl: options.config.assistant.serviceUrl,
          clientId: options.config.assistant.clientId,
          clientSecret: options.config.assistant.clientSecret,
          origin: options.config.publicOrigin,
          user,
          context: { surface: 'nuitee-travel-starter-demo' },
          preferences: { locale: 'en-CA', timeZone: 'America/Toronto' },
        });
        return json(200, session);
      } catch {
        return json(502, {
          code: 'assistant_unavailable',
          message: 'The travel assistant could not start. Please try again.',
        });
      }
    }

    if (path.startsWith('/api/')) return json(404, { code: 'not_found' });
    return undefined;
  };
}

function securityHeaders(config: HostConfig, mode: HostMode) {
  const serviceOrigin = config.assistant
    ? (() => {
        try {
          return new URL(config.assistant.serviceUrl).origin;
        } catch {
          return undefined;
        }
      })()
    : undefined;
  const connect = ["'self'", ...(serviceOrigin ? [serviceOrigin] : [])];
  const frames = serviceOrigin ? [serviceOrigin] : ["'none'"];
  return {
    'content-security-policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      `connect-src ${connect.join(' ')}`,
      `frame-src ${frames.join(' ')}`,
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
  } as const;
}

async function toWebRequest(request: IncomingMessage, config: HostConfig) {
  const origin = config.publicOrigin ?? LOCAL_ORIGIN;
  return new Request(new URL(request.url ?? '/', origin), {
    method: request.method,
    headers: request.headers as HeadersInit,
  });
}

async function sendWebResponse(response: Response, target: ServerResponse) {
  target.statusCode = response.status;
  response.headers.forEach((value, name) => target.setHeader(name, value));
  target.end(Buffer.from(await response.arrayBuffer()));
}

const mimeTypes: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

async function serveBuiltAsset(pathname: string, response: ServerResponse, root: string) {
  const relative = normalize(pathname === '/' ? 'index.html' : pathname.slice(1));
  const requested = relative.startsWith('..') ? 'index.html' : relative;
  let file = join(root, requested);
  try {
    if (!(await stat(file)).isFile()) file = join(root, 'index.html');
  } catch {
    file = join(root, 'index.html');
  }
  response.statusCode = 200;
  response.setHeader('content-type', mimeTypes[extname(file)] ?? 'application/octet-stream');
  response.end(await readFile(file));
}

export async function startHostServer(options: {
  readonly mode: HostMode;
  readonly env: HostEnvironment;
}) {
  const config = readHostConfig(options.env, options.mode);
  const api = createHostApi({ mode: options.mode, config });
  const root = fileURLToPath(new URL('..', import.meta.url));
  const headers = securityHeaders(config, options.mode);
  const vite = options.mode === 'development'
    ? await createViteServer({
        root,
        // Keep the demo on one loopback port. Transform middleware remains
        // available without opening Vite's separate WebSocket listener.
        server: { middlewareMode: true, hmr: false, ws: false },
        appType: 'spa',
      })
    : undefined;

  const server = createServer(async (request, response) => {
    for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
    const handled = await api(await toWebRequest(request, config));
    if (handled) return sendWebResponse(handled, response);
    if (vite) {
      return vite.middlewares(request, response, () => {
        response.statusCode = 404;
        response.end('Not found');
      });
    }
    return serveBuiltAsset(new URL(request.url ?? '/', config.publicOrigin ?? 'https://localhost').pathname, response, join(root, 'dist'));
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(PORT, HOST, resolve);
    });
  } catch (error) {
    await vite?.close();
    throw error;
  }
  return server;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const mode: HostMode = process.argv.includes('--production') ? 'production' : 'development';
  void startHostServer({ mode, env: process.env })
    .then(() => console.log('Travel Embedded Assistant host is listening on 127.0.0.1:5173.'))
    .catch(() => {
      console.error('Embedded Assistant host failed to start.');
      process.exitCode = 1;
    });
}
