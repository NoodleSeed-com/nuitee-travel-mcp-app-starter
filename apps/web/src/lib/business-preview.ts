// Server-only cookie exchange. The portal owns identity, release binding and assistant credentials.
import { businessConfig } from './business-config';
import { boundedJson, BusinessResponseError, object, portalRequest } from './business-storefront';

const opaque = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{20,256}$/.test(value);
const json = (body: unknown, status = 200, extra?: HeadersInit) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', ...extra } });

export function previewToken(cookie: string | null, name: string): string | undefined {
  const matches = (cookie || '').split(';').map(part => part.trim()).filter(part => part.startsWith(name + '='));
  const value = matches.length === 1 ? matches[0].slice(name.length + 1) : undefined;
  return opaque(value) ? value : undefined;
}

export async function previewPost(request: Request, operation: 'exchange' | 'session', env: Readonly<Record<string, string | undefined>> = process.env): Promise<Response> {
  try {
    const config = businessConfig(env);
    if (!config) return json({ error: 'Private preview is not configured.' }, 404);
    const target = new URL(request.url);
    if (request.method !== 'POST' || target.origin !== config.storefrontOrigin || target.search
      || request.headers.get('origin') !== config.storefrontOrigin
      || (request.headers.has('sec-fetch-site') && request.headers.get('sec-fetch-site') !== 'same-origin')) {
      return json({ error: 'Open the private preview from this website.' }, 403);
    }
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '')) return json({ error: 'Send a JSON request.' }, 415);
    const token = previewToken(request.headers.get('cookie'), config.previewCookie);
    if (operation === 'session' && !token) return json({ error: 'Open a new private preview from your business portal.' }, 401);
    const body = object(await boundedJson(request, 4096));
    if (!body) return json({ error: 'Invalid preview request.' }, 400);
    if (operation === 'exchange') {
      if (Object.keys(body).length !== 1 || !opaque(body.ticket)) return json({ error: 'Invalid preview ticket.' }, 400);
      const result = object(await portalRequest(config, '/api/storefront/preview/exchange', { body: { ticket: body.ticket } }));
      const expiry = typeof result?.expiresAt === 'string' ? Date.parse(result.expiresAt) : NaN;
      if (!opaque(result?.token) || !Number.isFinite(expiry) || expiry <= Date.now()) throw new BusinessResponseError(502);
      const maxAge = Math.min(1800, Math.max(1, Math.floor((expiry - Date.now()) / 1000)));
      return json({ ok: true }, 200, { 'Set-Cookie': `${config.previewCookie}=${result.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}` });
    }
    if (Object.keys(body).some(key => key !== 'clientContext')) return json({ error: 'Invalid preview request.' }, 400);
    const context = body.clientContext === undefined ? undefined : object(body.clientContext);
    if (context === null || (context && Object.keys(context).some(key => !['locale', 'timeZone'].includes(key)
      || typeof context[key] !== 'string' || (context[key] as string).length > 100 || /[\u0000-\u001f]/.test(context[key] as string)))) return json({ error: 'Invalid presentation context.' }, 400);
    const response = await portalRequest(config, '/api/storefront/preview/session', { token, body: context ? { clientContext: context } : {} });
    // Preserve the supported SDK session contract, including additive endpoint/configuration fields.
    return json(response);
  } catch (error) {
    const status = error instanceof BusinessResponseError ? error.status : 502;
    return json({ error: status === 401 || status === 403 ? 'Open a new private preview from your business portal.' : 'The private preview could not connect. Return to the portal and try again.' }, status);
  }
}
