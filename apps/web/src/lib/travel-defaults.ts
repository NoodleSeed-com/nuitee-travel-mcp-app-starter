export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'PKR',
  'AED',
  'QAR',
  'SAR',
  'TRY',
  'JPY',
  'SGD',
  'INR',
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export interface TravelDefaults {
  readonly currency: SupportedCurrency;
  readonly marketCountry?: string;
  readonly source: 'ip-country' | 'fallback';
}

export const NEUTRAL_TRAVEL_DEFAULTS: TravelDefaults = {
  currency: 'USD',
  source: 'fallback',
};

const COUNTRY_CURRENCIES: Readonly<Record<string, SupportedCurrency>> = {
  AE: 'AED',
  AT: 'EUR',
  AU: 'AUD',
  BE: 'EUR',
  CA: 'CAD',
  CY: 'EUR',
  DE: 'EUR',
  EE: 'EUR',
  ES: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  GB: 'GBP',
  GR: 'EUR',
  HR: 'EUR',
  IE: 'EUR',
  IN: 'INR',
  IT: 'EUR',
  JP: 'JPY',
  LT: 'EUR',
  LU: 'EUR',
  LV: 'EUR',
  MT: 'EUR',
  NL: 'EUR',
  PK: 'PKR',
  PT: 'EUR',
  QA: 'QAR',
  SA: 'SAR',
  SG: 'SGD',
  SI: 'EUR',
  SK: 'EUR',
  TR: 'TRY',
  US: 'USD',
};

function localeRegion(locale: string) {
  try {
    return new Intl.Locale(locale).maximize().region?.toUpperCase();
  } catch {
    return undefined;
  }
}

export function resolveInitialMarketCountry(locale: string) {
  try {
    const region = new Intl.Locale(locale).region?.toUpperCase();
    return region && /^[A-Z]{2}$/.test(region) ? region : undefined;
  } catch {
    return undefined;
  }
}

export function resolveInitialCurrency({
  locale,
  country,
}: Readonly<{
  locale: string;
  country?: string;
}>): SupportedCurrency {
  const normalizedCountry = country?.toUpperCase();
  if (normalizedCountry && COUNTRY_CURRENCIES[normalizedCountry]) {
    return COUNTRY_CURRENCIES[normalizedCountry];
  }
  const region = localeRegion(locale);
  return region ? COUNTRY_CURRENCIES[region] ?? 'USD' : 'USD';
}

export function toTravelPageContext(defaults: TravelDefaults) {
  return {
    ...(defaults.marketCountry ? { travelCountry: defaults.marketCountry } : {}),
    travelCurrency: defaults.currency,
    travelDefaultSource: defaults.source,
  } as const;
}
