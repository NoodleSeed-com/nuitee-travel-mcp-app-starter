import { describe, expect, it } from 'vitest';
import {
  resolveInitialCurrency,
  resolveNearestAirport,
  toTravelPageContext,
  type AirportRecord,
  type TravelDefaults,
} from '../src/lib/travel-defaults';

describe('travel defaults', () => {
  it('resolves Islamabad coordinates to Islamabad International Airport', () => {
    expect(resolveNearestAirport({
      latitude: 33.6167,
      longitude: 73.0992,
    })).toEqual({
      iata: 'ISB',
      city: 'Islamabad',
      country: 'PK',
    });
  });

  it('rejects a nearest airport beyond the safe default radius', () => {
    expect(resolveNearestAirport({ latitude: 0, longitude: -140 }))
      .toBeUndefined();
  });

  it('rejects malformed coordinates instead of guessing', () => {
    expect(resolveNearestAirport({ latitude: Number.NaN, longitude: 73 }))
      .toBeUndefined();
    expect(resolveNearestAirport({ latitude: 91, longitude: 73 }))
      .toBeUndefined();
    expect(resolveNearestAirport({ latitude: 33, longitude: 181 }))
      .toBeUndefined();
  });

  it('uses catalog order as the stable equal-distance tie break', () => {
    const first: AirportRecord = {
      iata: 'AAA', city: 'First', country: 'US', latitude: 1, longitude: 1,
    };
    const second: AirportRecord = {
      iata: 'BBB', city: 'Second', country: 'US', latitude: -1, longitude: -1,
    };

    expect(resolveNearestAirport(
      { latitude: 0, longitude: 0 },
      [first, second],
      250,
    )).toEqual({ iata: 'AAA', city: 'First', country: 'US' });
  });

  it('rejects an airport just outside a caller-supplied radius', () => {
    const catalog: readonly AirportRecord[] = [{
      iata: 'AAA', city: 'North', country: 'US', latitude: 1, longitude: 0,
    }];

    expect(resolveNearestAirport({ latitude: 0, longitude: 0 }, catalog, 110))
      .toBeUndefined();
    expect(resolveNearestAirport({ latitude: 0, longitude: 0 }, catalog, 112))
      .toEqual({ iata: 'AAA', city: 'North', country: 'US' });
  });

  it('uses airport country before browser locale for supported currency', () => {
    expect(resolveInitialCurrency({ locale: 'en-US', airportCountry: 'PK' }))
      .toBe('PKR');
  });

  it('uses browser locale region when no airport country is available', () => {
    expect(resolveInitialCurrency({ locale: 'en-GB' })).toBe('GBP');
    expect(resolveInitialCurrency({ locale: 'de-DE' })).toBe('EUR');
  });

  it('falls back to USD for malformed or unsupported locale data', () => {
    expect(resolveInitialCurrency({ locale: 'not-a-locale' })).toBe('USD');
    expect(resolveInitialCurrency({ locale: 'es-MX' })).toBe('USD');
  });

  it('projects only bounded derived defaults into assistant page context', () => {
    const defaults: TravelDefaults = {
      origin: { iata: 'ISB', city: 'Islamabad', country: 'PK' },
      currency: 'PKR',
      source: 'browser-geolocation',
    };

    const context = toTravelPageContext(defaults);

    expect(context).toEqual({
      travelDefaults: {
        origin: 'ISB',
        originLabel: 'Islamabad',
        country: 'PK',
        currency: 'PKR',
        source: 'browser-geolocation',
      },
    });
    expect(JSON.stringify(context)).not.toMatch(
      /latitude|longitude|accuracy|permission/i,
    );
  });

  it('omits location fields from fallback assistant page context', () => {
    expect(toTravelPageContext({ currency: 'GBP', source: 'fallback' }))
      .toEqual({
        travelDefaults: { currency: 'GBP', source: 'fallback' },
      });
  });
});
