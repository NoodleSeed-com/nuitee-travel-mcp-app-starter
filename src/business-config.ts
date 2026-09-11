import { createHash } from 'node:crypto';
import { z } from '@noodleseed/one';

const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const text = (max: number) => z.string().min(1).max(max).refine(value => value === value.trim()
  && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value));
const positive = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const businessSettingsSchema = z.strictObject({
  name: text(40), initials: text(3), welcome: text(90), theme: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  currency: z.enum(['CAD', 'USD', 'GBP', 'EUR']), language: z.enum(['English', 'French', 'Spanish']),
  tone: z.enum(['Warm and helpful', 'Concise and practical', 'Thoughtful and detailed']),
  adults: z.enum(['1 adult', '2 adults']), nights: z.enum(['1 night', '2 nights', '3 nights']),
  capabilities: z.strictObject({ flights: z.boolean(), hotels: z.boolean(), experiences: z.boolean(), cars: z.boolean(), checkout: z.boolean() }),
});
const releaseV1Schema = z.strictObject({
  schemaVersion: z.literal(1), id: z.string().regex(new RegExp(`^r_${uuid}$`)), digest: z.string().regex(/^[0-9a-f]{64}$/),
  createdAt: z.string().refine(value => /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value),
  sourceRevision: positive, settings: businessSettingsSchema,
  knowledge: z.array(z.strictObject({
    id: z.string().regex(new RegExp(`^k_${uuid}$`)), title: text(100), kind: z.enum(['Business', 'FAQ', 'Policy']),
    content: text(4000), version: positive,
  })).max(100),
  provider: z.strictObject({
    configured: z.boolean(), environment: z.enum(['sandbox', 'production']).nullable(),
    status: z.enum(['disconnected', 'saved', 'verified', 'rejected', 'unavailable']),
    credentialVersion: z.string().regex(new RegExp(`^${uuid}$`)).nullable(),
  }),
});
const assistantMetadataSchema = z.strictObject({
  configured: z.boolean(), baseUrl: text(2048).nullable(), model: text(120).nullable(),
  transport: z.enum(['responses', 'chat-completions']), credentialVersion: z.string().regex(new RegExp(`^${uuid}$`)).nullable(),
});
const releaseSchema = z.discriminatedUnion('schemaVersion', [releaseV1Schema,
  releaseV1Schema.extend({ schemaVersion: z.literal(2), assistant: assistantMetadataSchema }),
]);
export type BusinessSettings = z.infer<typeof businessSettingsSchema>;
export type BusinessRelease = z.infer<typeof releaseSchema>;
export interface BusinessRuntimeOptions {
  readonly websiteOrigin: string;
  readonly access: 'authenticated' | 'public';
  /** Exact path for every approved source, relative to the TypeScript entrypoint directory. */
  readonly knowledgePaths: Readonly<Record<string, string>>;
  readonly modelTransport?: 'responses' | 'chat-completions';
}
export class BusinessConfigurationError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = 'BusinessConfigurationError'; }
}
function invalid(code: string, message: string): never { throw new BusinessConfigurationError(code, message); }
export function canonicalBusinessJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalBusinessJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalBusinessJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Application release data, never an SDK manifest. Errors deliberately omit supplied values. */
export function validateBusinessRelease(input: unknown): BusinessRelease {
  const result = releaseSchema.safeParse(input);
  if (!result.success) invalid('invalid_release', 'The business release contains unsupported or invalid fields.');
  const release = result.data;
  if ([release.settings.name, release.settings.initials, release.settings.welcome].some(value => value.includes('${'))) {
    invalid('invalid_display_text', 'Business display text cannot contain runtime expression markers.');
  }
  const provider = release.provider;
  if (provider.configured ? provider.environment === null || provider.status === 'disconnected'
    : provider.environment !== null || provider.status !== 'disconnected' || provider.credentialVersion !== null) {
    invalid('invalid_provider_metadata', 'The provider connection metadata is inconsistent.');
  }
  if (new Set(release.knowledge.map(source => source.id)).size !== release.knowledge.length) {
    invalid('duplicate_knowledge', 'Approved knowledge identities must be unique.');
  }
  if (release.schemaVersion === 2) {
    const assistant = release.assistant;
    if (assistant.configured) {
      if (!assistant.baseUrl || !assistant.model || !assistant.credentialVersion) invalid('invalid_assistant_metadata', 'The assistant connection metadata is incomplete.');
      let url: URL;
      try { url = new URL(assistant.baseUrl!); } catch { invalid('invalid_assistant_metadata', 'The assistant model endpoint is invalid.'); }
      if (url!.username || url!.password || url!.search || url!.hash || url!.protocol !== 'https:') {
        invalid('invalid_assistant_metadata', 'Use an HTTPS model endpoint without credentials, query parameters or fragments.');
      }
    } else if (assistant.baseUrl !== null || assistant.model !== null || assistant.credentialVersion !== null) {
      invalid('invalid_assistant_metadata', 'Disconnected assistant metadata must not retain a model or credential version.');
    }
  }
  const payload = { schemaVersion: release.schemaVersion, sourceRevision: release.sourceRevision,
    settings: release.settings, knowledge: release.knowledge, provider,
    ...(release.schemaVersion === 2 ? { assistant: release.assistant } : {}),
  };
  const digest = createHash('sha256').update(canonicalBusinessJson(payload)).digest('hex');
  if (digest !== release.digest) invalid('release_digest_mismatch', 'The release no longer matches its reviewed content.');
  if (release.settings.capabilities.checkout) invalid('checkout_unsupported', 'Checkout is not implemented. Disable checkout before starting this release.');
  if (release.settings.capabilities.hotels && release.settings.currency === 'GBP') {
    invalid('hotel_currency_unsupported', 'Hotel search currently supports CAD, USD and EUR. Choose one of these currencies or disable hotels.');
  }
  return release;
}

export function validateBusinessRuntimeOptions(input: BusinessRuntimeOptions, release: BusinessRelease): BusinessRuntimeOptions {
  if (!input || !['authenticated', 'public'].includes(input.access)
    || input.modelTransport !== undefined && !['responses', 'chat-completions'].includes(input.modelTransport)) {
    invalid('invalid_runtime_options', 'Select a supported assistant access mode and model transport.');
  }
  let url: URL;
  try { url = new URL(input.websiteOrigin); } catch { invalid('invalid_website_origin', 'Configure an exact website origin.'); }
  if (url!.origin !== input.websiteOrigin || url!.username || url!.password
    || !(url!.protocol === 'https:' || url!.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url!.hostname))) {
    invalid('invalid_website_origin', 'Configure an exact HTTPS or loopback HTTP website origin without a path.');
  }
  const paths = input.knowledgePaths;
  if (!paths || typeof paths !== 'object' || Array.isArray(paths)
    || Object.keys(paths).length !== release.knowledge.length
    || release.knowledge.some(source => !Object.hasOwn(paths, source.id))) {
    invalid('invalid_knowledge_paths', 'Provide exactly one local path for each approved knowledge source.');
  }
  const values = Object.values(paths);
  if (new Set(values).size !== values.length || values.some(path => typeof path !== 'string' || path.length > 240
    || !/^(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.(?:md|txt)$/.test(path)
    || path.split('/').some(segment => segment === '.' || segment === '..'))) {
    invalid('invalid_knowledge_paths', 'Knowledge paths must be unique relative Markdown or text files within the entrypoint directory.');
  }
  if (release.schemaVersion === 2 && input.modelTransport !== undefined && input.modelTransport !== release.assistant.transport) {
    invalid('model_transport_mismatch', 'The runtime model transport must match the reviewed release.');
  }
  return { websiteOrigin: input.websiteOrigin, access: input.access, knowledgePaths: { ...paths },
    modelTransport: input.modelTransport ?? (release.schemaVersion === 2 ? release.assistant.transport : 'responses') };
}
