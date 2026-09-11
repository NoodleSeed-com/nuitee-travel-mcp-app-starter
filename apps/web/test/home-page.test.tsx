import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestHeaders = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({ headers: requestHeaders }));

import HomePage, { generateMetadata } from '../app/page';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';

function travelAssistantProps(page: ReactElement<{ children?: ReactNode }>) {
  const assistant = Children.toArray(page.props.children).find((child) => (
    isValidElement(child) && child.type === TravelAssistantPage
  )) as ReactElement<{ initialCountry?: string }> | undefined;

  expect(assistant).toBeDefined();
  return assistant?.props ?? {};
}

describe('Wayfare home request defaults', () => {
  beforeEach(() => {
    requestHeaders.mockReset();
    vi.stubEnv('IPINFO_TOKEN', 'test-token');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('derives only a country from Fly client IP and passes it to the client', async () => {
    requestHeaders.mockResolvedValue(new Headers({
      'fly-client-ip': '203.0.113.42',
    }));
    const lookup = vi.fn(async () => new Response('PK', { status: 200 }));
    vi.stubGlobal('fetch', lookup);

    const page = await HomePage();

    expect(lookup).toHaveBeenCalledOnce();
    expect(lookup).toHaveBeenCalledWith(
      'https://api.ipinfo.io/lite/203.0.113.42/country_code',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
    expect(travelAssistantProps(page)).toMatchObject({ initialCountry: 'PK' });
    expect(JSON.stringify(page.props)).not.toContain('203.0.113.42');
  });

  it('falls back without making a lookup when no provider token is configured', async () => {
    vi.stubEnv('IPINFO_TOKEN', '');
    requestHeaders.mockResolvedValue(new Headers({
      'fly-client-ip': '203.0.113.42',
    }));
    const lookup = vi.fn();
    vi.stubGlobal('fetch', lookup);

    const page = await HomePage();

    expect(lookup).not.toHaveBeenCalled();
    expect(travelAssistantProps(page).initialCountry).toBeUndefined();
  });
  it('uses only released public identity for business metadata', async () => {
    vi.stubEnv('WAYFARE_BUSINESS_PORTAL_ORIGIN', 'http://127.0.0.1:3103');
    const projection = { status: 'ready', release: {
      id: 'r_11111111-1111-4111-8111-111111111111', digest: 'a'.repeat(64),
      settings: { name: 'North Star Travel', initials: 'NS', welcome: 'Find your next good place.', currency: 'CAD', language: 'French',
        capabilities: { flights: true, hotels: false, experiences: false, cars: false, checkout: false } },
      knowledge: [{ content: 'Private source text' }],
    }, runtime: { status: 'ready', embedId: 'pub_fixture', serviceUrl: 'http://127.0.0.1:3105' } };
    const lookup = vi.fn(async () => Response.json(projection));
    vi.stubGlobal('fetch', lookup);
    const metadata = await generateMetadata();
    expect(metadata).toMatchObject({ title: { absolute: 'North Star Travel — Travel assistant' }, description: projection.release.settings.welcome,
      openGraph: { siteName: 'North Star Travel' } });
    expect(JSON.stringify(metadata)).not.toMatch(/Wayfare|Private source|pub_fixture/);
    expect(lookup).toHaveBeenCalledWith('http://127.0.0.1:3103/api/storefront', expect.anything());
    lookup.mockImplementation(async () => Response.json({ status: 'not_published' }));
    expect(JSON.stringify(await generateMetadata())).not.toContain('North Star Travel');
  });
});
