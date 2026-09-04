import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTravelDefaults } from '../src/hooks/use-travel-defaults';
import type { SupportedCurrency } from '../src/lib/travel-defaults';

afterEach(() => {
  cleanup();
});

function position(latitude: number, longitude: number): GeolocationPosition {
  return {
    coords: {
      accuracy: 25,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      latitude,
      longitude,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: 1,
    toJSON: () => ({}),
  };
}

describe('useTravelDefaults', () => {
  it('keeps the first render deterministic before applying the browser locale', async () => {
    const originalLanguage = navigator.language;
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: 'en-GB',
    });
    const renders: SupportedCurrency[] = [];

    function Probe() {
      const defaults = useTravelDefaults({ geolocation: null });
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

  it('requests low-accuracy location once and stores only the derived airport', async () => {
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>(
      (success) => success(position(33.6167, 73.0992)),
    );

    const { result } = renderHook(() => useTravelDefaults({
      locale: 'en-US',
      geolocation: { getCurrentPosition },
    }));

    await waitFor(() => expect(result.current.origin?.iata).toBe('ISB'));
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(getCurrentPosition.mock.calls[0]?.[2]).toEqual({
      enableHighAccuracy: false,
      timeout: 7000,
      maximumAge: 86400000,
    });
    expect(result.current).toMatchObject({
      origin: { iata: 'ISB', city: 'Islamabad', country: 'PK' },
      marketCountry: 'PK',
      currency: 'PKR',
      source: 'browser-geolocation',
    });
    expect(JSON.stringify(result.current)).not.toMatch(
      /latitude|longitude|accuracy|timestamp/i,
    );
  });

  it('keeps locale currency and neutral origin when permission is denied', async () => {
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>(
      (_success, error) => error?.({
        code: 1,
        message: 'Permission denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }),
    );

    const { result } = renderHook(() => useTravelDefaults({
      locale: 'en-GB',
      geolocation: { getCurrentPosition },
    }));

    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledOnce());
    expect(result.current).toMatchObject({
      currency: 'GBP',
      marketCountry: 'GB',
      source: 'fallback',
    });
    expect(result.current.origin).toBeUndefined();
  });

  it('quietly keeps fallback defaults when geolocation is unavailable', () => {
    const { result } = renderHook(() => useTravelDefaults({
      locale: 'en-AU',
      geolocation: null,
    }));

    expect(result.current).toMatchObject({
      currency: 'AUD',
      marketCountry: 'AU',
      source: 'fallback',
    });
    expect(result.current.origin).toBeUndefined();
  });

  it('ignores a location callback after unmount', () => {
    let resolvePosition: PositionCallback | undefined;
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>(
      (success) => { resolvePosition = success; },
    );
    const { unmount } = renderHook(() => useTravelDefaults({
      locale: 'en-US',
      geolocation: { getCurrentPosition },
    }));

    unmount();
    expect(() => resolvePosition?.(position(33.6167, 73.0992))).not.toThrow();
  });

  it('does not overwrite an explicit currency when location resolves late', async () => {
    let resolvePosition: PositionCallback | undefined;
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>(
      (success) => { resolvePosition = success; },
    );
    const { result } = renderHook(() => useTravelDefaults({
      locale: 'en-US',
      geolocation: { getCurrentPosition },
    }));

    act(() => result.current.setCurrency('EUR'));
    act(() => resolvePosition?.(position(33.6167, 73.0992)));

    await waitFor(() => expect(result.current.origin?.iata).toBe('ISB'));
    expect(result.current.currency).toBe('EUR');
    expect(result.current.source).toBe('browser-geolocation');
  });
});
