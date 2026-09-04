'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  resolveInitialCurrency,
  resolveInitialMarketCountry,
  type SupportedCurrency,
  type TravelDefaults,
} from '../lib/travel-defaults';

interface UseTravelDefaultsOptions {
  readonly country?: string;
  readonly locale?: string;
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
  const country = options.country?.toUpperCase().match(/^[A-Z]{2}$/)?.[0];
  const initialLocaleRef = useRef(locale);
  const userSelectedCurrencyRef = useRef(false);
  const [defaults, setDefaults] = useState<TravelDefaults>(() => {
    const marketCountry = country ?? resolveInitialMarketCountry(locale);
    return {
      currency: resolveInitialCurrency({ locale, country }),
      ...(marketCountry ? { marketCountry } : {}),
      source: country ? 'ip-country' : 'fallback',
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

  return { ...defaults, setCurrency };
}
