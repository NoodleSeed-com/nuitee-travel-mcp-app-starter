import { AIRPORTS } from '../data/airports.generated';

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

export interface AirportRecord {
  readonly iata: string;
  readonly city: string;
  readonly country: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface AirportDefault {
  readonly iata: string;
  readonly city: string;
  readonly country: string;
}

export interface TravelDefaults {
  readonly origin?: AirportDefault;
  readonly currency: SupportedCurrency;
  readonly source: 'browser-geolocation' | 'fallback';
}

export const NEUTRAL_TRAVEL_DEFAULTS: TravelDefaults = {
  currency: 'USD',
  source: 'fallback',
};

const EARTH_RADIUS_KM = 6_371;
const MAX_DEFAULT_AIRPORT_DISTANCE_KM = 250;

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

function degreesToRadians(value: number) {
  return value * Math.PI / 180;
}

function distanceKm(
  latitude: number,
  longitude: number,
  airport: AirportRecord,
) {
  const latitudeDelta = degreesToRadians(airport.latitude - latitude);
  const longitudeDelta = degreesToRadians(airport.longitude - longitude);
  const originLatitude = degreesToRadians(latitude);
  const airportLatitude = degreesToRadians(airport.latitude);
  const halfLatitude = Math.sin(latitudeDelta / 2);
  const halfLongitude = Math.sin(longitudeDelta / 2);
  const haversine = halfLatitude * halfLatitude
    + Math.cos(originLatitude) * Math.cos(airportLatitude)
    * halfLongitude * halfLongitude;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

export function resolveNearestAirport(
  position: Readonly<{ latitude: number; longitude: number }>,
  catalog: readonly AirportRecord[] = AIRPORTS,
  maximumDistanceKm = MAX_DEFAULT_AIRPORT_DISTANCE_KM,
): AirportDefault | undefined {
  const { latitude, longitude } = position;
  if (
    !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
    || !Number.isFinite(maximumDistanceKm)
    || maximumDistanceKm <= 0
  ) {
    return undefined;
  }

  let nearest: AirportRecord | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const airport of catalog) {
    const currentDistance = distanceKm(latitude, longitude, airport);
    if (currentDistance < nearestDistance) {
      nearest = airport;
      nearestDistance = currentDistance;
    }
  }
  if (!nearest || nearestDistance > maximumDistanceKm) return undefined;
  return {
    iata: nearest.iata,
    city: nearest.city,
    country: nearest.country,
  };
}

function localeRegion(locale: string) {
  try {
    return new Intl.Locale(locale).maximize().region?.toUpperCase();
  } catch {
    return undefined;
  }
}

export function resolveInitialCurrency({
  locale,
  airportCountry,
}: Readonly<{
  locale: string;
  airportCountry?: string;
}>): SupportedCurrency {
  const country = airportCountry?.toUpperCase();
  if (country && COUNTRY_CURRENCIES[country]) {
    return COUNTRY_CURRENCIES[country];
  }
  const region = localeRegion(locale);
  return region ? COUNTRY_CURRENCIES[region] ?? 'USD' : 'USD';
}

export function toTravelPageContext(defaults: TravelDefaults) {
  return {
    travelDefaults: {
      ...(defaults.origin ? {
        origin: defaults.origin.iata,
        originLabel: defaults.origin.city,
        country: defaults.origin.country,
      } : {}),
      currency: defaults.currency,
      source: defaults.source,
    },
  } as const;
}
