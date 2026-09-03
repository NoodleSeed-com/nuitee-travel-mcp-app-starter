import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { demoHotelSearchOutputSchema, demoHotelSelectionRecordSchema } from '../src/demo-schemas.js';
import { runHotelGateway } from '../src/hotel-runtime.js';

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
    rating: 9.2,
    stars: 5,
    review_count: 725,
    tags: ['Pool'],
    story: 'A current central Lisbon property returned by the provider.',
  }],
};

describe('Nuitee hotel gateway', () => {
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
