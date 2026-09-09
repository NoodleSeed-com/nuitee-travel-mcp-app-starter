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
