import { Children, isValidElement, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestHeaders = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({ headers: requestHeaders }));

import HomePage from '../app/page';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';

function travelAssistantProps(page: ReactElement) {
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
});
