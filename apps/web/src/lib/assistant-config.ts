export type PublicAssistantRuntime =
  | {
      readonly status: 'ready';
      readonly embedId: string;
      readonly serviceUrl: string;
    }
  | {
      readonly status: 'setup-required';
      readonly message: string;
    };

export type ReadyPublicAssistantRuntime = Extract<
  PublicAssistantRuntime,
  { readonly status: 'ready' }
>;

const DEFAULT_SERVICE_URL = 'https://cloud.noodleseed.dev';

export function resolvePublicAssistantRuntime(
  env: Readonly<Record<string, string | undefined>>,
): PublicAssistantRuntime {
  const embedId = env.NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID?.trim();
  if (!embedId) {
    return {
      status: 'setup-required',
      message: 'Add NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID to start the travel assistant.',
    };
  }
  const serviceUrl = env.NEXT_PUBLIC_NOODLE_SERVICE_URL?.trim()
    || DEFAULT_SERVICE_URL;
  const parsed = new URL(serviceUrl);
  const loopback = parsed.hostname === 'localhost'
    || parsed.hostname === '127.0.0.1';
  if (
    serviceUrl !== parsed.origin
    || parsed.username
    || parsed.password
    || (parsed.protocol !== 'https:'
      && !(parsed.protocol === 'http:' && loopback && parsed.port))
  ) {
    throw new Error('Assistant service URL must be an exact HTTPS or explicit loopback origin.');
  }
  return { status: 'ready', embedId, serviceUrl };
}
