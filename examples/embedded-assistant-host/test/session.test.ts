import { describe, expect, it, vi } from 'vitest';
import { DEMO_USER, createDemoAuthStore } from '../src/auth.ts';
import { createHostApi, readHostConfig } from '../src/server.ts';

const origin = 'http://localhost:5173';

function request(path: string, init: RequestInit = {}) {
  return new Request(`${origin}${path}`, {
    method: 'POST',
    headers: { origin, ...init.headers },
    ...init,
  });
}

async function callApi(
  api: ReturnType<typeof createHostApi>,
  apiRequest: Request,
) {
  const response = await api(apiRequest);
  if (!response) throw new Error('Expected an API response.');
  return response;
}

async function login(api: ReturnType<typeof createHostApi>) {
  const response = await callApi(api, request('/api/demo/login'));
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
    expect(response.status).toBe(200);
    expect(cookie).toBeTruthy();
    expect(response.headers.get('set-cookie')).toContain('Max-Age=900');
    return cookie!;
}

describe('embedded assistant host session boundary', () => {
  it('returns 401 when a signed-out user requests a session', async () => {
    const api = createHostApi({
      mode: 'development',
      config: readHostConfig({}, 'development'),
      auth: createDemoAuthStore(),
    });
    const response = await callApi(api, request('/api/assistant/session'));
    expect(response.status).toBe(401);
  });

  it('rejects an unexpected Origin before session exchange', async () => {
    const api = createHostApi({
      mode: 'development',
      config: readHostConfig({}, 'development'),
      auth: createDemoAuthStore(),
    });
    const cookie = await login(api);
    const response = await callApi(api, request('/api/assistant/session', {
      headers: { origin: 'http://localhost:9999', cookie },
    }));
    expect(response.status).toBe(403);
  });

  it('makes demo authentication unavailable in production mode', async () => {
    const api = createHostApi({
      mode: 'production',
      config: readHostConfig({}, 'production'),
      auth: createDemoAuthStore(),
    });
    const response = await callApi(api, request('/api/demo/login'));
    expect(response.status).toBe(404);
  });

  it('returns a safe setup-required response when assistant config is absent', async () => {
    const api = createHostApi({
      mode: 'development',
      config: readHostConfig({}, 'development'),
      auth: createDemoAuthStore(),
    });
    const cookie = await login(api);
    const response = await callApi(api, request('/api/assistant/session', {
      headers: { origin, cookie },
    }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: 'setup_required',
      message: 'The travel assistant needs deployment setup before it can start.',
    });
  });

  it('uses only the fixed server-owned demo identity and never leaks credentials', async () => {
    const exchange = vi.fn(async () => ({
      token: 'short-lived-session-token',
      expiresAt: '2026-08-21T18:00:00.000Z',
      endpoints: { turns: 'https://assistant.example.invalid/turns' },
    }));
    const config = readHostConfig({
      NOODLE_SERVICE_URL: 'https://assistant.example.invalid',
      NOODLE_ASSISTANT_CLIENT_ID: 'client-id-sentinel',
      NOODLE_ASSISTANT_CLIENT_SECRET: 'client-secret-sentinel',
      PUBLIC_APP_ORIGIN: origin,
    }, 'development');
    const api = createHostApi({
      mode: 'development',
      config,
      auth: createDemoAuthStore(),
      exchange,
    });
    const cookie = await login(api);
    const response = await callApi(api, request('/api/assistant/session', {
      headers: { origin, cookie },
      body: JSON.stringify({
        id: 'browser-selected-id',
        roles: ['admin'],
        origin: 'https://attacker.invalid',
      }),
    }));
    expect(response.status).toBe(200);
    expect(exchange).toHaveBeenCalledWith(expect.objectContaining({
      origin,
      user: DEMO_USER,
    }));
    const body = JSON.stringify(await response.json());
    for (const forbidden of [
      'client-secret-sentinel',
      'ASSISTANT_MODEL_API_KEY',
      'NUITEE_API_KEY',
      'browser-selected-id',
      'admin',
      'attacker.invalid',
    ]) {
      expect(body).not.toContain(forbidden);
    }
  });
});
