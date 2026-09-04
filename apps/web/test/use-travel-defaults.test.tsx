import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useTravelDefaults } from '../src/hooks/use-travel-defaults';
import type { SupportedCurrency } from '../src/lib/travel-defaults';

afterEach(() => {
  cleanup();
});

describe('useTravelDefaults', () => {
  it('keeps the first render deterministic before applying the browser locale', async () => {
    const originalLanguage = navigator.language;
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: 'en-GB',
    });
    const renders: SupportedCurrency[] = [];

    function Probe() {
      const defaults = useTravelDefaults();
      renders.push(defaults.currency);
      return <span>{defaults.currency}</span>;
    }

    const screen = render(<Probe />);

    expect(renders[0]).toBe('USD');
    await waitFor(() => expect(screen.getByText('GBP')).toBeVisible());

    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: originalLanguage,
    });
  });

  it('uses a coarse request country without asking for browser location', () => {
    const { result } = renderHook(() => useTravelDefaults({
      country: 'PK',
      locale: 'en-US',
    }));

    expect(result.current).toMatchObject({
      marketCountry: 'PK',
      currency: 'PKR',
      source: 'ip-country',
    });
  });

  it('quietly keeps locale defaults when a request country is unavailable', () => {
    const { result } = renderHook(() => useTravelDefaults({
      locale: 'en-AU',
    }));

    expect(result.current).toMatchObject({
      currency: 'AUD',
      marketCountry: 'AU',
      source: 'fallback',
    });
  });

  it('keeps an explicit currency authoritative over the detected country', () => {
    const { result } = renderHook(() => useTravelDefaults({
      country: 'PK',
      locale: 'en-US',
    }));

    act(() => result.current.setCurrency('EUR'));

    expect(result.current.currency).toBe('EUR');
    expect(result.current.source).toBe('ip-country');
  });
});
