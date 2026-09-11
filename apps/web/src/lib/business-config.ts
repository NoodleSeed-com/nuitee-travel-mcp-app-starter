export interface BusinessConfig {
  readonly portalOrigin: string;
  readonly storefrontOrigin: string;
  readonly runtimeOrigins: readonly string[];
  readonly previewCookie: string;
}

function loopbackOrigin(value: string, host?: string): string {
  const url = new URL(value);
  if (url.origin !== value || url.protocol !== 'http:' || !url.port
    || !['localhost', '127.0.0.1'].includes(url.hostname)
    || (host && url.hostname !== host)) {
    throw new Error('Business integration requires exact configured loopback origins.');
  }
  return url.origin;
}

export function businessConfig(env: Readonly<Record<string, string | undefined>>): BusinessConfig | null {
  if (env.WAYFARE_BUSINESS_PORTAL_ORIGIN === undefined) return null;
  const portalOrigin = loopbackOrigin(env.WAYFARE_BUSINESS_PORTAL_ORIGIN, '127.0.0.1');
  const storefrontOrigin = loopbackOrigin(env.WAYFARE_STOREFRONT_ORIGIN || 'http://localhost:3100', 'localhost');
  const origins = (env.WAYFARE_BUSINESS_RUNTIME_ORIGINS || 'http://127.0.0.1:3105,http://127.0.0.1:3106,http://127.0.0.1:3107').split(',');
  if (!origins.length || origins.length > 12) throw new Error('Invalid runtime origin configuration.');
  return {
    portalOrigin, storefrontOrigin,
    runtimeOrigins: [...new Set(origins.map(value => loopbackOrigin(value.trim())))],
    previewCookie: `wayfare_preview_${new URL(storefrontOrigin).port}`,
  };
}
