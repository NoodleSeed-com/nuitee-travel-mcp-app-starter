// Server-owned adapter. Import only from route handlers/server components.
import { businessConfig, type BusinessConfig } from './business-config';
import type { BusinessBrand } from './business-brand';
import { resolvePublicAssistantRuntime, type PublicAssistantRuntime } from './assistant-config';

export class BusinessResponseError extends Error {
  constructor(readonly status: number) { super('The business connection is unavailable.'); }
}

export function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function boundedJson(response: Response | Request, maximum = 64 * 1024): Promise<unknown> {
  if (Number(response.headers.get('content-length')) > maximum || !response.body) throw new BusinessResponseError(413);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { reject(new BusinessResponseError(408)); void reader.cancel().catch(() => undefined); }, 8000);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      length += value.byteLength;
      if (length > maximum) throw new BusinessResponseError(413);
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks, length).toString('utf8'));
  } catch (error) {
    if (error instanceof BusinessResponseError) throw error;
    throw new BusinessResponseError(400);
  } finally { clearTimeout(timer!); await reader.cancel().catch(() => undefined); }
}

export async function portalRequest(config: BusinessConfig, path: '/api/storefront' | '/api/storefront/preview' | '/api/storefront/preview/exchange' | '/api/storefront/preview/session', options: { token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(config.portalOrigin + path, {
    method: options.body === undefined ? 'GET' : 'POST', headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    cache: 'no-store', redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new BusinessResponseError([400, 401, 403, 409, 429].includes(response.status) ? response.status : 502);
  }
  if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
    await response.body?.cancel();
    throw new BusinessResponseError(502);
  }
  return boundedJson(response, path.endsWith('/session') ? 256 * 1024 : 64 * 1024);
}

function string(value: unknown, max: number): value is string {
  return typeof value === 'string' && Boolean(value.trim()) && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
}

// The portal's display fields accept line breaks (the welcome editor is a textarea).
function displayText(value: unknown, max: number): value is string {
  return typeof value === 'string' && Boolean(value.trim()) && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
}

export function publicStorefront(value: unknown, config: BusinessConfig, preview = false): { runtime: PublicAssistantRuntime; brand: BusinessBrand; releaseId: string } | null {
  const envelope = object(value), release = object(envelope?.release), settings = object(release?.settings), runtime = object(envelope?.runtime);
  const capabilities = object(settings?.capabilities);
  if (envelope?.status !== 'ready' || !release || !settings || runtime?.status !== 'ready'
    || !string(release.id, 80) || !/^r_[a-f0-9-]{36}$/.test(release.id)
    || typeof release.digest !== 'string' || !/^[a-f0-9]{64}$/.test(release.digest)
    || !displayText(settings.name, 40) || !displayText(settings.initials, 3) || !displayText(settings.welcome, 90)
    || !['CAD', 'USD', 'GBP', 'EUR'].includes(settings.currency as string)
    || !['English', 'French', 'Spanish'].includes(settings.language as string)
    || !capabilities || ['flights', 'hotels', 'experiences', 'cars', 'checkout'].some(key => typeof capabilities[key] !== 'boolean')
    || typeof runtime.serviceUrl !== 'string' || !config.runtimeOrigins.includes(runtime.serviceUrl)) return null;
  if (preview
    ? runtime.sessionEndpoint !== '/api/business/preview/session' || runtime.embedId !== undefined
    : !string(runtime.embedId, 200) || runtime.sessionEndpoint !== undefined) return null;
  return {
    releaseId: release.id,
    brand: { name: settings.name, initials: settings.initials, welcome: settings.welcome,
      currency: settings.currency as BusinessBrand['currency'], language: settings.language as BusinessBrand['language'],
      capabilities: { flights: capabilities.flights as boolean, hotels: capabilities.hotels as boolean,
        experiences: capabilities.experiences as boolean, cars: capabilities.cars as boolean, checkout: capabilities.checkout as boolean } },
    runtime: preview
      ? { status: 'ready', sessionEndpoint: '/api/business/preview/session', serviceUrl: runtime.serviceUrl }
      : { status: 'ready', embedId: runtime.embedId as string, serviceUrl: runtime.serviceUrl },
  };
}

export interface StorefrontResolution {
  readonly businessMode: boolean;
  readonly runtime: PublicAssistantRuntime;
  readonly brand?: BusinessBrand;
  readonly releaseId?: string;
}

export async function storefront(env: Readonly<Record<string, string | undefined>> = process.env, previewToken?: string): Promise<StorefrontResolution> {
  if (env.WAYFARE_BUSINESS_PORTAL_ORIGIN === undefined) return { businessMode: false, runtime: resolvePublicAssistantRuntime(env) };
  const unavailable: PublicAssistantRuntime = { status: 'setup-required', message: 'The travel assistant is currently unavailable. Please try again later.' };
  try {
    const config = businessConfig(env)!;
    const response = await portalRequest(config, previewToken ? '/api/storefront/preview' : '/api/storefront', { token: previewToken });
    const projection = publicStorefront(response, config, Boolean(previewToken));
    return { businessMode: true, ...(projection || { runtime: object(response)?.status === 'not_published'
      ? { status: 'setup-required' as const, message: 'This business has not launched its travel assistant yet. Please return after it is published.' }
      : unavailable }) };
  } catch { return { businessMode: true, runtime: unavailable }; }
}
