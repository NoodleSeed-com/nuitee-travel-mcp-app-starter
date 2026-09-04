import { isIP } from 'node:net';

const IPINFO_COUNTRY_ENDPOINT = 'https://api.ipinfo.io/lite';

interface RequestCountryOptions {
  readonly fetcher?: typeof fetch;
  readonly token?: string;
}

/**
 * Resolve a coarse ISO country on the server without exposing the request IP
 * to client code. Fly-Client-IP is supplied by the deployment proxy; forwarded
 * headers from arbitrary clients are intentionally ignored.
 */
export async function resolveRequestCountry(
  requestHeaders: Headers,
  options: RequestCountryOptions = {},
): Promise<string | undefined> {
  const token = options.token?.trim();
  const clientIp = requestHeaders.get('fly-client-ip')?.trim();
  if (!token || !clientIp || isIP(clientIp) === 0) return undefined;

  try {
    const response = await (options.fetcher ?? fetch)(
      `${IPINFO_COUNTRY_ENDPOINT}/${encodeURIComponent(clientIp)}/country_code`,
      {
        cache: 'no-store',
        headers: {
          Accept: 'text/plain',
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(750),
      },
    );
    if (!response.ok) return undefined;
    const country = (await response.text()).trim().toUpperCase();
    return /^[A-Z]{2}$/.test(country) ? country : undefined;
  } catch {
    return undefined;
  }
}
