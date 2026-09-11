import { afterEach, describe, expect, it, vi } from 'vitest';
import { previewPost, previewToken } from '../src/lib/business-preview';

const env = { WAYFARE_BUSINESS_PORTAL_ORIGIN: 'http://127.0.0.1:3103', WAYFARE_STOREFRONT_ORIGIN: 'http://localhost:3100' };
const token = 'synthetic_private_preview_cookie';
const ticket = 'synthetic_single_use_preview_ticket';
const request = (body: unknown, { cookie = false, origin = 'http://localhost:3100', contentType = 'application/json' } = {}) => new Request('http://localhost:3100/api/business/preview/exchange', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': contentType, ...(cookie ? { Cookie: `wayfare_preview_3100=${token}` } : {}) }, body: JSON.stringify(body),
});
afterEach(() => vi.unstubAllGlobals());

describe('private preview boundary', () => {
  it('exchanges one ticket server-to-server and returns only an HttpOnly cookie', async () => {
    const fetch = vi.fn(async () => Response.json({ token, expiresAt: new Date(Date.now() + 600_000).toISOString() })); vi.stubGlobal('fetch', fetch);
    const response = await previewPost(request({ ticket }), 'exchange', env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('set-cookie')).toMatch(/^wayfare_preview_3100=.*; Path=\/; HttpOnly; SameSite=Strict; Max-Age=\d+$/);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3103/api/storefront/preview/exchange', expect.objectContaining({ body: JSON.stringify({ ticket }), headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }));
  });
  it('rejects wrong origin, non-JSON, missing cookie, target injection and oversized payload before portal access', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect((await previewPost(request({ ticket }, { origin: 'http://localhost:3000' }), 'exchange', env)).status).toBe(403);
    expect((await previewPost(request({ ticket }, { contentType: 'text/plain' }), 'exchange', env)).status).toBe(415);
    expect((await previewPost(request({}), 'session', env)).status).toBe(401);
    expect((await previewPost(request({ ticket, target: 'https://other.example' }), 'exchange', env)).status).toBe(400);
    expect((await previewPost(request({ routing: { tenant: 'other' } }, { cookie: true }), 'session', env)).status).toBe(400);
    expect((await previewPost(request({ ticket: 'x'.repeat(5000) }), 'exchange', env)).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('forwards the SDK session response unchanged with only the private bearer and bounded presentation hints', async () => {
    const session = { token: 'synthetic_sdk_session', expiresAt: '2030-01-01T00:00:00Z', endpoints: { turns: 'http://127.0.0.1:3106/turns', toolConfirmations: 'http://127.0.0.1:3106/confirm', sandbox: 'http://127.0.0.1:3106/sandbox' }, configuration: { custom: 'additive supported contract' } };
    const fetch = vi.fn(async () => Response.json(session)); vi.stubGlobal('fetch', fetch);
    const response = await previewPost(request({ clientContext: { locale: 'fr', timeZone: 'America/Toronto' } }, { cookie: true }), 'session', env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(session);
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3103/api/storefront/preview/session', expect.objectContaining({ headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ clientContext: { locale: 'fr', timeZone: 'America/Toronto' } }) }));
  });
  it('does not expose upstream errors or resurrect refused/revoked preview cookies', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('synthetic-provider-secret', { status: 401 })));
    const response = await previewPost(request({}, { cookie: true }), 'session', env);
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain('synthetic-provider-secret');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(previewToken(`wayfare_preview_3100=${token}; wayfare_preview_3100=${token}`, 'wayfare_preview_3100')).toBeUndefined();
    expect(previewToken(`wayfare_preview_3100=${token}`, 'wayfare_preview_3101')).toBeUndefined();
  });
});
