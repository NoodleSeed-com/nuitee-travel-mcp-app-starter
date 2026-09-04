'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  resolveInitialCurrency,
  resolveInitialMarketCountry,
  resolveNearestAirport,
  type SupportedCurrency,
  type TravelDefaults,
} from '../lib/travel-defaults';

interface UseTravelDefaultsOptions {
  readonly locale?: string;
  readonly geolocation?: Pick<Geolocation, 'getCurrentPosition'> | null;
}

export interface TravelDefaultsController extends TravelDefaults {
  readonly setCurrency: (currency: SupportedCurrency) => void;
}

export function useTravelDefaults(
  options: UseTravelDefaultsOptions = {},
): TravelDefaultsController {
  // Keep the server and the browser's hydration render identical. Browser-only
  // locale information is applied in an effect immediately after hydration.
  const locale = options.locale ?? 'en-US';
  const geolocation = options.geolocation === undefined
    ? (typeof navigator === 'undefined' ? null : navigator.geolocation)
    : options.geolocation;
  const initialLocaleRef = useRef(locale);
  const geolocationRef = useRef(geolocation);
  const userSelectedCurrencyRef = useRef(false);
  const [defaults, setDefaults] = useState<TravelDefaults>(() => {
    const marketCountry = resolveInitialMarketCountry(locale);
    return {
      currency: resolveInitialCurrency({ locale }),
      ...(marketCountry ? { marketCountry } : {}),
      source: 'fallback',
    };
  });

  const setCurrency = useCallback((currency: SupportedCurrency) => {
    userSelectedCurrencyRef.current = true;
    setDefaults((current) => ({ ...current, currency }));
  }, []);

  useEffect(() => {
    if (options.locale !== undefined || typeof navigator === 'undefined') return;

    const browserLocale = navigator.language || 'en-US';
    if (browserLocale === initialLocaleRef.current) return;
    initialLocaleRef.current = browserLocale;
    const marketCountry = resolveInitialMarketCountry(browserLocale);

    setDefaults((current) => {
      if (current.source !== 'fallback') return current;
      return {
        currency: userSelectedCurrencyRef.current
          ? current.currency
          : resolveInitialCurrency({ locale: browserLocale }),
        ...(marketCountry ? { marketCountry } : {}),
        source: 'fallback',
      };
    });
  }, [options.locale]);

  useEffect(() => {
    const initialGeolocation = geolocationRef.current;
    if (!initialGeolocation) return;
    let active = true;
    initialGeolocation.getCurrentPosition(
      ({ coords }) => {
        if (!active) return;
        const origin = resolveNearestAirport({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        if (!origin) return;
        setDefaults((current) => ({
          origin,
          marketCountry: origin.country,
          currency: userSelectedCurrencyRef.current
            ? current.currency
            : resolveInitialCurrency({
                locale: initialLocaleRef.current,
                airportCountry: origin.country,
              }),
          source: 'browser-geolocation',
        }));
      },
      () => undefined,
      {
        enableHighAccuracy: false,
        timeout: 7_000,
        maximumAge: 86_400_000,
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return { ...defaults, setCurrency };
}
