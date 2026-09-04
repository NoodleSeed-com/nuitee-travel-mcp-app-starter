import { describe, expect, it } from 'vitest';
import {
  resolveInitialCurrency,
  resolveInitialMarketCountry,
  toTravelPageContext,
  type TravelDefaults,
} from '../src/lib/travel-defaults';

describe('travel defaults', () => {
  it('uses request country before browser locale for supported currency', () => {
    expect(resolveInitialCurrency({ locale: 'en-US', country: 'PK' }))
      .toBe('PKR');
  });

  it('uses browser locale region when no request country is available', () => {
    expect(resolveInitialCurrency({ locale: 'en-GB' })).toBe('GBP');
    expect(resolveInitialCurrency({ locale: 'de-DE' })).toBe('EUR');
  });

  it('derives a bounded pricing market from the browser locale', () => {
    expect(resolveInitialMarketCountry('en-CA')).toBe('CA');
    expect(resolveInitialMarketCountry('en-GB')).toBe('GB');
    expect(resolveInitialMarketCountry('not-a-locale')).toBeUndefined();
  });

  it('falls back to USD for malformed or unsupported locale data', () => {
    expect(resolveInitialCurrency({ locale: 'not-a-locale' })).toBe('USD');
    expect(resolveInitialCurrency({ locale: 'es-MX' })).toBe('USD');
  });

  it('projects only the bounded country and currency into assistant page context', () => {
    const defaults: TravelDefaults = {
      currency: 'PKR',
      marketCountry: 'PK',
      source: 'ip-country',
    };

    const context = toTravelPageContext(defaults);

    expect(context).toEqual({
      travelCountry: 'PK',
      travelCurrency: 'PKR',
      travelDefaultSource: 'ip-country',
    });
    expect(JSON.stringify(context)).not.toMatch(
      /latitude|longitude|accuracy|permission/i,
    );
  });

  it('omits location fields from fallback assistant page context', () => {
    expect(toTravelPageContext({ currency: 'GBP', source: 'fallback' }))
      .toEqual({
        travelCurrency: 'GBP',
        travelDefaultSource: 'fallback',
      });
  });

  it('projects the locale-derived market when request country is unavailable', () => {
    expect(toTravelPageContext({
      currency: 'CAD',
      marketCountry: 'CA',
      source: 'fallback',
    })).toEqual({
      travelCountry: 'CA',
      travelCurrency: 'CAD',
      travelDefaultSource: 'fallback',
    });
  });
});
