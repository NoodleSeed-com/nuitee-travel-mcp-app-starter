import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { demoHotelSearchOutputSchema, demoHotelSelectionRecordSchema, demoTripReviewSchema } from '../src/demo-schemas.js';
import { runHotelGateway } from '../src/hotel-runtime.js';
import { runDemoGateway } from '../src/demo-runtime.js';
import { getSyntheticLoyaltyOverview } from '../src/demo-fixtures.js';

const search = {
  destination: 'Lisbon',
  countryCode: 'PT',
  checkInDate: '2026-09-18',
  checkOutDate: '2026-09-21',
  adults: 2,
  children: 0,
  rooms: 1,
  currency: 'CAD',
};

const response = {
  data: [{
    hotelId: 'lp-test',
    roomTypes: [{
      name: 'Deluxe room',
      offerId: 'provider-offer-must-stay-private',
      offerRetailRate: [{ amount: 900, currency: 'CAD' }],
      rates: [{
        name: 'Deluxe king room',
        retailRate: {
          total: [{ amount: 900, currency: 'CAD' }],
          taxesAndFees: [{ included: true, amount: 90, currency: 'CAD' }],
        },
        cancellationPolicies: {
          refundableTag: 'RFN',
          cancelPolicyInfos: [{ cancelTime: '2026-09-15 10:00:00' }],
        },
        perks: [{ name: 'Breakfast included' }],
      }],
    }],
  }],
  hotels: [{
    id: 'lp-test',
    name: 'Harbour Light Lisbon',
    main_photo: 'https://snaphotelapi.com/hotels/lp-test.jpg',
    address: '1 Harbour Street',
    country_code: 'PT',
    city_name: 'Lisbon',
    latitude: 38.7107,
    longitude: -9.1365,
    rating: 9.2,
    stars: 5,
    review_count: 725,
    tags: ['Pool'],
    story: 'A current central Lisbon property returned by the provider.',
  }],
};

describe('Nuitee hotel gateway', () => {
  const nearSearch = { ...search, near: { landmark: 'Fixture Club', maxWalkingMinutes: 20 } };
  const place = { placeId: 'fixture-place', displayName: 'Fixture Club', formattedAddress: '10 Fixture Road, Lisbon, Portugal' };
  const location = { latitude: 38.7107, longitude: -9.1365 };
  const addressComponents = [{ types: ['country'], shortText: 'PT' }];
  const locatedResponse = {
    data: ['far', 'near', 'unknown'].map((suffix) => ({ ...response.data[0], hotelId: suffix })),
    hotels: ['far', 'near', 'unknown'].map((suffix) => ({
      ...response.hotels[0], id: suffix, name: `Fixture ${suffix} hotel`,
      latitude: suffix === 'far' ? 38.8 : suffix === 'unknown' ? undefined : 38.711,
      longitude: suffix === 'unknown' ? undefined : -9.1365,
    })),
  };
  function locatedOperation(name: string) {
    return { raw: name === 'places' ? { data: [place] } : name === 'place_details' ? { data: { ...place, location, addressComponents } } : locatedResponse };
  }

  it('preserves city-wide results and provider order when no location constraint was requested', () => {
    const callOperation = vi.fn(() => ({ raw: locatedResponse }));
    const output = runHotelGateway({ search }, { callOperation });
    expect(callOperation).toHaveBeenCalledTimes(1);
    expect(callOperation).toHaveBeenCalledWith('search', expect.objectContaining({ cityName: 'Lisbon', countryCode: 'PT', latitude: undefined, longitude: undefined, radius: undefined }));
    expect(output.result).toMatchObject({ hotels: [{ name: 'Fixture far hotel' }, { name: 'Fixture near hotel' }, { name: 'Fixture unknown hotel' }] });
    expect((output.records as unknown[])).toHaveLength(3);
    expect(output.result.locationAssessment).toBeUndefined();
    expect(demoHotelSearchOutputSchema.safeParse(output.result).success).toBe(true);
  });

  it('accepts an explicit null location without inventing or filtering a landmark', () => {
    const callOperation = vi.fn(() => ({ raw: locatedResponse }));
    const output = runHotelGateway({ search: { ...search, near: null } }, { callOperation });
    expect(callOperation).toHaveBeenCalledTimes(1);
    expect(output.result).toMatchObject({ status: 'success', hotels: [{ name: 'Fixture far hotel' }, { name: 'Fixture near hotel' }, { name: 'Fixture unknown hotel' }] });
    expect((output.result.searchContext as Record<string, unknown>).near).toBeUndefined();
    expect(demoHotelSearchOutputSchema.safeParse(output.result).success).toBe(true);
  });

  it('does not default a null walking limit to a schema bound', () => {
    const output = runHotelGateway({ search: { ...nearSearch, near: { landmark: 'Fixture Club', maxWalkingMinutes: null } } }, { callOperation: locatedOperation });
    expect(output.result).toMatchObject({ status: 'success', locationAssessment: { searchRadiusMeters: 1500 } });
    expect((output.result.searchContext as Record<string, any>).near.maxWalkingMinutes).toBeUndefined();
  });

  it('resolves a formal landmark name without repeating its city suffix in autocomplete', () => {
    const requested = { ...nearSearch, near: { landmark: 'Fixture Club of Lisbon City', maxWalkingMinutes: 20 } };
    const callOperation = vi.fn((name: string, args: Readonly<Record<string, unknown>>) => name === 'places' && args.textQuery !== 'fixture club, Lisbon, PT'
      ? { raw: { data: [] } } : locatedOperation(name));
    const output = runHotelGateway({ search: requested }, { callOperation });
    expect(callOperation).toHaveBeenCalledWith('places', expect.objectContaining({ textQuery: 'fixture club, Lisbon, PT' }));
    expect(output.result).toMatchObject({ status: 'success', searchContext: { near: requested.near }, hotels: [{ name: 'Fixture near hotel' }] });
    expect(demoHotelSearchOutputSchema.safeParse(output.result).success).toBe(true);
  });

  it('normalizes the New York City alias while verifying the actual returned city and country', () => {
    const requested = { ...nearSearch, destination: 'New York City', countryCode: 'US', near: { landmark: 'Fixture Club of New York City', maxWalkingMinutes: 20 } };
    const callOperation = vi.fn((name: string) => name === 'places'
      ? { raw: { data: [{ ...place, formattedAddress: '10 Fictional Road, New York, NY, USA' }] } }
      : name === 'place_details' ? { raw: { data: { ...place, location, addressComponents: [{ types: ['country'], shortText: 'US' }] } } }
      : locatedOperation(name));
    expect(runHotelGateway({ search: requested }, { callOperation }).result.status).toBe('success');
    expect(callOperation).toHaveBeenCalledWith('places', expect.objectContaining({ textQuery: 'fixture club, New York, US' }));
  });

  it('resolves the landmark, scopes rates by coordinates and excludes distant or unlocated candidates from UI and selectable state', () => {
    const callOperation = vi.fn(locatedOperation);
    const output = runHotelGateway({ search: nearSearch }, { callOperation });
    expect(callOperation).toHaveBeenCalledWith('places', expect.objectContaining({ textQuery: 'Fixture Club, Lisbon, PT' }));
    expect(callOperation).toHaveBeenCalledWith('search', expect.objectContaining({ ...location, radius: 1600, cityName: undefined, iataCode: undefined }));
    expect(output.result).toMatchObject({ status: 'success', hotels: [{ name: 'Fixture near hotel', locationEvidence: { walkingStatus: 'unverified' } }], locationAssessment: { excludedCount: 2, walkingStatus: 'unverified' } });
    expect((output.result.hotels as unknown[])).toHaveLength(1);
    expect((output.records as unknown[])).toHaveLength(1);
    expect(demoHotelSearchOutputSchema.safeParse(output.result).success).toBe(true);
  });

  it.each([{ places: [] }, { places: [place, { ...place, placeId: 'fixture-other' }] }])('does not search the whole city when landmark lookup has no unique match: $places', ({ places }) => {
    const callOperation = vi.fn(() => ({ raw: { data: places } }));
    const output = runHotelGateway({ search: nearSearch }, { callOperation });
    expect(output.result).toMatchObject({ status: 'error', error: { code: 'location_unresolved' }, hotels: [] });
    expect(callOperation).toHaveBeenCalledTimes(1);
  });

  it('does not invent coordinates when place details have no location', () => {
    const callOperation = vi.fn((name: string) => ({ raw: name === 'places' ? { data: [place] } : { data: place } }));
    expect(runHotelGateway({ search: nearSearch }, { callOperation }).result).toMatchObject({ status: 'error', error: { code: 'location_unresolved' } });
    expect(callOperation).toHaveBeenCalledTimes(2);
  });

  it('rejects a matching landmark in the wrong country without searching rates', () => {
    const callOperation = vi.fn((name: string) => name === 'place_details'
      ? { raw: { data: { ...place, location, addressComponents: [{ types: ['country'], shortText: 'US' }] } } }
      : locatedOperation(name));
    expect(runHotelGateway({ search: nearSearch }, { callOperation }).result).toMatchObject({ status: 'error', error: { code: 'location_unresolved' } });
    expect(callOperation).toHaveBeenCalledTimes(2);
  });

  it('does not declare that missing taxes are excluded or rank mixed currencies as comparable', () => {
    const raw = { data: [response.data[0], { ...response.data[0], hotelId: 'usd', roomTypes: [{ ...response.data[0]!.roomTypes[0], offerRetailRate: [{ amount: 400, currency: 'USD' }] }] }], hotels: [response.hotels[0], { ...response.hotels[0], id: 'usd' }] };
    expect(runHotelGateway({ search }, { callOperation: () => ({ raw }) }).result.priceComparison)
      .toMatchObject({ comparable: false, lowestDisplayedSelectionIds: [] });
  });

  it('returns a truthful empty scoped result without silently broadening the search', () => {
    const callOperation = vi.fn((name: string) => name === 'search' ? { raw: { data: [locatedResponse.data[0]], hotels: [locatedResponse.hotels[0]] } } : locatedOperation(name));
    const output = runHotelGateway({ search: nearSearch }, { callOperation });
    expect(output.result).toMatchObject({ status: 'empty', hotels: [], locationAssessment: { excludedCount: 1 } });
    expect(output.result.fallback).toContain('No candidates');
    expect(callOperation).toHaveBeenCalledTimes(3);
    expect(demoHotelSearchOutputSchema.safeParse(output.result).success).toBe(true);
  });

  it('distinguishes unknown taxes from confirmed exclusion', () => {
    const output = runHotelGateway({ search }, { callOperation: () => ({ raw: { ...response, data: [{ ...response.data[0], roomTypes: [{ ...response.data[0]!.roomTypes[0], rates: [{ ...response.data[0]!.roomTypes[0]!.rates[0], retailRate: {} }] }] }] } }) });
    expect(output.result).toMatchObject({ hotels: [{ taxesAndFeesIncluded: false, taxAndFeeStatus: 'unknown' }] });
    expect(output.result.priceComparison).toMatchObject({ comparable: false, scope: 'returned_hotels' });
  });

  it('does not pretend that fictional stays satisfy a real landmark constraint', () => {
    const output = runDemoGateway({ kind: 'search', search: nearSearch, catalog: {}, aliases: {} });
    expect(output.result).toMatchObject({ status: 'error', error: { code: 'location_unresolved' }, hotels: [] });
    expect(demoHotelSearchOutputSchema.safeParse(output.result).success).toBe(true);
  });

  it('keeps landmark resolution and distance filtering compatible with the compute sandbox', () => {
    const sandboxed = runInNewContext(`(${runHotelGateway.toString()})`, { Date: undefined, URL: undefined, Map: undefined, Set: undefined }) as typeof runHotelGateway;
    expect(sandboxed({ search: nearSearch }, { callOperation: locatedOperation }).result).toMatchObject({ status: 'success', hotels: [{ name: 'Fixture near hotel' }] });
  });
  it.each(['https://static.cupid.travel', 'https://snaphotelapi.com'])('preserves provider photos from %s', (origin) => {
    const raw = { ...response, hotels: [{ ...response.hotels[0], thumbnail: `${origin}/fixture-thumbnail.jpg`, main_photo: `${origin}/fixture-main.jpg` }] };
    const output = runHotelGateway({ search }, { callOperation: () => ({ raw }) });
    expect(output.result).toMatchObject({ status: 'success', hotels: [{ imageUrl: `${origin}/fixture-thumbnail.jpg` }] });
    expect(demoHotelSearchOutputSchema.safeParse(output.result).success).toBe(true);
    const records = (output.records as unknown[]).map(value => demoHotelSelectionRecordSchema.parse(value));
    expect(records[0]).toHaveProperty('imageUrl', `${origin}/fixture-thumbnail.jpg`);
    const review = runDemoGateway({ kind: 'review', flightState: {}, hotelState: { records, activeSelectionId: records[0]!.selectionId }, loyalty: getSyntheticLoyaltyOverview() });
    expect(demoTripReviewSchema.parse(review.review).stay).toHaveProperty('imageUrl', `${origin}/fixture-thumbnail.jpg`);
    expect(JSON.stringify(review)).not.toContain('provider-offer-must-stay-private');
  });

  it.each([
    'http://static.cupid.travel/photo.jpg',
    'https://static.cupid.travel.evil.example/photo.jpg',
    'https://static.cupid.travel@evil.example/photo.jpg',
    'https://static.cupid.travel:8443/photo.jpg',
    'https://untrusted.example/photo.jpg',
  ])('rejects an unapproved thumbnail and falls back to the approved main photo: %s', (thumbnail) => {
    const output = runHotelGateway({ search }, { callOperation: () => ({ raw: { ...response, hotels: [{ ...response.hotels[0], thumbnail, main_photo: 'https://static.cupid.travel/fixture-main.jpg' }] } }) });
    expect(output.result).toMatchObject({ hotels: [{ imageUrl: 'https://static.cupid.travel/fixture-main.jpg' }] });
  });

  it('runs without browser or clock globals and normalizes a bounded live rate', () => {
    const sandboxed = runInNewContext(`(${runHotelGateway.toString()})`, {
      Date: undefined,
      URL: undefined,
      Map: undefined,
      Set: undefined,
    }) as typeof runHotelGateway;
    const callOperation = vi.fn(() => ({ raw: response }));
    const output = sandboxed({ search, requestedAt: '2026-09-02T23:00:00Z' }, { callOperation });

    expect(callOperation).toHaveBeenCalledWith('search', expect.objectContaining({
      cityName: 'Lisbon',
      countryCode: 'PT',
      occupancies: [{ rooms: 1, adults: 2, children: [] }],
      checkin: '2026-09-18',
      checkout: '2026-09-21',
      currency: 'CAD',
      stream: false,
    }));
    expect(demoHotelSearchOutputSchema.safeParse(output.result).success).toBe(true);
    expect((output.records as unknown[]).every((record) => demoHotelSelectionRecordSchema.safeParse(record).success)).toBe(true);
    expect(output.result).toMatchObject({
      status: 'success',
      dataSource: 'live_nuitee',
      hotels: [{
        name: 'Harbour Light Lisbon',
        roomName: 'Deluxe king room',
        nightlyPrice: { amount: 300, currency: 'CAD' },
        staySubtotal: { amount: 900, currency: 'CAD' },
        taxesAndFeesIncluded: true,
        lat: 38.7107,
        lng: -9.1365,
        imageUrl: 'https://snaphotelapi.com/hotels/lp-test.jpg',
      }],
    });
    expect(JSON.stringify(output.result)).not.toContain('provider-offer-must-stay-private');
    expect(JSON.stringify(output.records)).toContain('provider-offer-must-stay-private');
  });

  it('turns a nested 401 into a safe, non-retryable authentication result', () => {
    const output = runHotelGateway({ search }, {
      callOperation: () => {
        throw { error: { response: { statusCode: 401 }, message: 'upstream rejected credential' } };
      },
    });

    expect(output.result).toMatchObject({
      status: 'error',
      hotels: [],
      error: { code: 'authentication', retryable: false },
    });
    expect(JSON.stringify(output)).not.toContain('upstream rejected credential');
  });

  it('requires a country code for an unknown city before provider egress', () => {
    const callOperation = vi.fn();
    const output = runHotelGateway({ search: { ...search, destination: 'Mystery City', countryCode: undefined } }, { callOperation });

    expect(output.result).toMatchObject({
      status: 'error',
      error: { code: 'invalid_request', retryable: false },
    });
    expect(callOperation).not.toHaveBeenCalled();
  });
});
