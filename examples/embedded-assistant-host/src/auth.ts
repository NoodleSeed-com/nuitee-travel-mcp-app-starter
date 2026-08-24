import { randomBytes } from 'node:crypto';

export const DEMO_USER = Object.freeze({
  id: 'nuitee-demo-user',
  email: 'demo@example.invalid',
  name: 'Demo traveler',
  roles: ['traveler'] as const,
});

const COOKIE_NAME = 'nuitee_travel_starter_demo';
const SESSION_TTL_MS = 15 * 60 * 1_000;

interface DemoSession {
  readonly expiresAt: number;
}

export interface DemoAuthStore {
  issue(): { readonly cookie: string };
  read(cookieHeader: string | null): typeof DEMO_USER | undefined;
  revoke(cookieHeader: string | null): string;
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return undefined;
}

function cookie(value: string, maxAge: number, secure: boolean) {
  return [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function createDemoAuthStore(options: {
  readonly now?: () => number;
  readonly secure?: boolean;
} = {}): DemoAuthStore {
  const sessions = new Map<string, DemoSession>();
  const now = options.now ?? Date.now;
  const secure = options.secure ?? false;

  function prune() {
    const current = now();
    for (const [id, session] of sessions) {
      if (session.expiresAt <= current) sessions.delete(id);
    }
  }

  return {
    issue() {
      prune();
      const id = randomBytes(32).toString('base64url');
      sessions.set(id, { expiresAt: now() + SESSION_TTL_MS });
      return { cookie: cookie(id, SESSION_TTL_MS / 1_000, secure) };
    },
    read(cookieHeader) {
      prune();
      const id = readCookie(cookieHeader, COOKIE_NAME);
      return id && sessions.has(id) ? DEMO_USER : undefined;
    },
    revoke(cookieHeader) {
      const id = readCookie(cookieHeader, COOKIE_NAME);
      if (id) sessions.delete(id);
      return cookie('', 0, secure);
    },
  };
}
