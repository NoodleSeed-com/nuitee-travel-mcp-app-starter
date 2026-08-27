import { describe, expect, it } from 'vitest';
import { resolvePublicAssistantRuntime } from '../src/lib/assistant-config';

describe('public assistant runtime config', () => {
  it('fails closed when the embed id is absent', () => {
    expect(resolvePublicAssistantRuntime({})).toEqual({
      status: 'setup-required',
      message: 'Add NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID to start the travel assistant.',
    });
  });

  it('accepts a public embed id and exact HTTPS service origin', () => {
    expect(resolvePublicAssistantRuntime({
      NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID: 'pub_static_test',
      NEXT_PUBLIC_NOODLE_SERVICE_URL: 'https://cloud.noodleseed.dev',
    })).toEqual({
      status: 'ready',
      embedId: 'pub_static_test',
      serviceUrl: 'https://cloud.noodleseed.dev',
    });
  });

  it.each([
    'https://cloud.noodleseed.dev/path',
    'https://user@cloud.noodleseed.dev',
    'http://cloud.noodleseed.dev',
  ])('rejects an unsafe service URL %s', (serviceUrl) => {
    expect(() => resolvePublicAssistantRuntime({
      NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID: 'pub_static_test',
      NEXT_PUBLIC_NOODLE_SERVICE_URL: serviceUrl,
    })).toThrow();
  });
});
