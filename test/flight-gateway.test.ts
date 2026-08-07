import { describe, expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
import { gatewayOutputSchema } from '../src/flight-connectors.js';
import { runNuiteeGateway } from '../src/flight-runtime.js';
import {
  fictionalSearchResponse,
  fictionalVerifyResponse,
  selectionState,
  validSearchInput,
} from './fixtures/nuitee.js';

const now = '2030-04-01T12:00:00Z';
const today = '2030-04-01';

function gatewayWithoutDate(): typeof runNuiteeGateway {
  return runInNewContext(`(${runNuiteeGateway.toString()})`, { Date: undefined }) as typeof runNuiteeGateway;
}

function search(overrides: Record<string, unknown> = {}, response: unknown = fictionalSearchResponse) {
  const callOperation = vi.fn(() => ({ raw: response }));
  const result = runNuiteeGateway(
    { kind: 'search', search: { ...validSearchInput, ...overrides }, today, requestedAt: now },
    { callOperation },
  );
  return { result, callOperation };
}

describe('Nuitee gateway search preparation', () => {
  it('runs in the deterministic compute sandbox without a Date global', () => {
    const sandboxed = gatewayWithoutDate();
    const result = sandboxed(
      { kind: 'search', search: validSearchInput, today, requestedAt: now },
      { callOperation: () => ({ raw: fictionalSearchResponse }) },
    );
    expect(result.status).toBe('success');
  });

  it.each([undefined, 'not-an-instant'])('rejects an invalid authoritative request instant %j before the provider call', (requestedAt) => {
    const callOperation = vi.fn();
    const result = runNuiteeGateway(
      { kind: 'search', search: validSearchInput, today, requestedAt },
      { callOperation },
    );
    expect(result.error?.code).toBe('invalid_request');
    expect(callOperation).not.toHaveBeenCalled();
  });

  it('builds the documented one-way legs request and keeps connector authority fixed', () => {
    const { result, callOperation } = search();
    expect(callOperation).toHaveBeenCalledOnce();
    expect(callOperation).toHaveBeenCalledWith('search', {
      legs: [{ origin: 'QZX', destination: 'QZY', date: '2030-04-20', direction: 'OUTBOUND' }],
      adults: 1,
      children: 0,
      infants: 0,
      childrenAges: [],
      infantAges: [],
      cabinClass: 'ECONOMY',
      currency: 'CAD',
      country: 'CA',
    });
    expect(result.status).toBe('success');
  });

  it('builds reverse OUTBOUND/INBOUND legs for a round trip', () => {
    const { callOperation } = search({ returnDate: '2030-04-27' });
    expect(callOperation).toHaveBeenCalledWith(
      'search',
      expect.objectContaining({
        legs: [
          { origin: 'QZX', destination: 'QZY', date: '2030-04-20', direction: 'OUTBOUND' },
          { origin: 'QZY', destination: 'QZX', date: '2030-04-27', direction: 'INBOUND' },
        ],
      }),
    );
  });

  it.each([
    ['malformed origin', { origin: 'C' }],
    ['identical airports', { destination: 'QZX' }],
    ['malformed date', { departureDate: 'April 20' }],
    ['impossible calendar date', { departureDate: '2030-02-30' }],
    ['past date', { departureDate: '2030-03-31' }],
    ['return before departure', { returnDate: '2030-04-19' }],
    ['no adults', { adults: 0 }],
    ['too many passengers', { adults: 9, children: 1 }],
    ['infants exceed adults', { adults: 1, infants: 2, infantAges: [0, 1] }],
    ['child age count mismatch', { children: 1, childrenAges: [] }],
    ['child age out of range', { children: 1, childrenAges: [12] }],
    ['infant age count mismatch', { infants: 1, infantAges: [] }],
    ['invalid cabin', { cabinClass: 'COUCH' }],
    ['invalid currency', { currency: 'DOLLARS' }],
    ['invalid point of sale', { country: 'CAN' }],
  ])('rejects %s before any provider call', (_label, overrides) => {
    const { result, callOperation } = search(overrides);
    expect(result.status).toBe('error');
    expect(result.error?.code).toBe('invalid_request');
    expect(callOperation).not.toHaveBeenCalled();
  });
});

describe('Nuitee gateway normalization', () => {
  it('matches the complete compute connector output schema', () => {
    const { result } = search();
    expect('searchContext' in gatewayOutputSchema.shape).toBe(true);
    expect(gatewayOutputSchema.safeParse(result).success).toBe(true);
  });

  it('returns bounded public itineraries and private selection records', () => {
    const { result } = search();
    expect(result.itineraries).toHaveLength(1);
    expect(result.records).toHaveLength(1);
    expect(result.itineraries?.[0]).toMatchObject({
      route: {
        origin: 'QZX',
        originName: 'Cedar Bay Test Aerodrome',
        destination: 'QZY',
        destinationName: 'Cloud Harbour Test Aerodrome',
      },
      carrier: {
        code: 'ZZ',
        name: 'Cedar Skies',
        logoUrl: 'https://sandbox.nuitee.flights/static/images/airlines/ZZ.png',
      },
      price: { total: 284.5, currency: 'CAD', base: 240, taxes: 40, fees: 4.5 },
      stops: 0,
      fare: { family: 'Cloudlight Economy', mixedCabin: false, seatsRemaining: 4 },
      terms: { changeable: true, refundable: false, hasChangeFee: true, hasRefundFee: false },
      amenities: [
        { category: 'wifi', name: 'Fictional Wi-Fi', available: true, chargeable: false, aircraftType: 'Cedar 100' },
        { category: 'power', name: 'Seat power', available: true, aircraftType: 'Cedar 100' },
      ],
    });
    expect(result.searchContext).toEqual(validSearchInput);
    expect(result.itineraries?.[0]?.selectionId).toMatch(/^sel_[a-f0-9]{32}$/);
    expect(JSON.stringify(result.itineraries)).not.toContain('provider-offer-must-stay-private');
    expect(JSON.stringify(result.itineraries)).not.toContain('marketingLogo');
    expect(result.fallback).toContain('QZX→QZY');
    expect(result.fallback).toContain(result.itineraries?.[0]?.selectionId);
  });

  it('keeps only documented Nuitee-hosted airline image URLs', () => {
    const journey = structuredClone(fictionalSearchResponse.data[0].journeys[0]) as any;
    journey.segments[0].carrier.marketingLogo = 'https://images.example.test/airline.png';
    journey.segments[0].carrier.operatingLogo = 'javascript:alert(1)';
    const { result } = search({}, { data: [{ journeys: [journey] }] });
    expect(result.itineraries?.[0]?.carrier).toEqual({ code: 'ZZ', name: 'Cedar Skies' });
    expect(JSON.stringify(result.itineraries)).not.toContain('images.example.test');
    expect(JSON.stringify(result.itineraries)).not.toContain('javascript:');
  });

  it('caps results at ten and reports partial provider data', () => {
    const journey = fictionalSearchResponse.data[0].journeys[0];
    const raw = {
      data: [{ journeys: [
        ...Array.from({ length: 12 }, (_, index) => ({
          ...journey,
          journeyKey: `j-${index}`,
          cheapestOffer: { ...journey.cheapestOffer, offerId: `private-${index}` },
        })),
        { broken: true },
      ] }],
    };
    const { result } = search({}, raw);
    expect(result.itineraries).toHaveLength(10);
    expect(result.records).toHaveLength(10);
    expect(result.status).toBe('partial');
  });

  it('keeps a round trip as origin-to-destination with separate outbound and return legs', () => {
    const journey = structuredClone(fictionalSearchResponse.data[0].journeys[0]) as any;
    journey.segments.push({
      ...journey.segments[0],
      segmentKey: 'fictional-segment-return',
      originCode: 'QZY',
      originName: 'Cloud Harbour Test Aerodrome',
      destinationCode: 'QZX',
      destinationName: 'Cedar Bay Test Aerodrome',
      departureTime: '2030-04-27T16:00:00+02:00',
      arrivalTime: '2030-04-27T19:30:00+02:00',
      direction: 'INBOUND',
    });
    journey.legDurations.push({
      direction: 'INBOUND',
      duration: { minutes: 210, iso8601: 'PT3H30M' },
      overnightFlight: false,
      dayChange: 0,
    });
    journey.totalDuration = { minutes: 405, iso8601: 'PT6H45M' };
    const { result } = search({ returnDate: '2030-04-27' }, { data: [{ journeys: [journey] }] });
    expect(result.itineraries?.[0]?.route).toEqual(expect.objectContaining({ origin: 'QZX', destination: 'QZY' }));
    expect(result.itineraries?.[0]?.legs).toEqual([
      expect.objectContaining({ direction: 'OUTBOUND', route: expect.objectContaining({ origin: 'QZX', destination: 'QZY' }) }),
      expect.objectContaining({ direction: 'INBOUND', route: expect.objectContaining({ origin: 'QZY', destination: 'QZX' }) }),
    ]);
  });

  it('uses documented per-leg elapsed durations instead of counting the stay between round-trip flights', () => {
    const journey = structuredClone(fictionalSearchResponse.data[0].journeys[0]) as any;
    journey.segments.push({
      ...journey.segments[0],
      segmentKey: 'fictional-segment-return-long-stay',
      originCode: 'QZY', destinationCode: 'QZX', direction: 'INBOUND',
      departureTime: '2030-05-27T16:00:00+02:00', arrivalTime: '2030-05-27T19:30:00+02:00',
      duration: { minutes: 210, iso8601: 'PT3H30M' },
    });
    journey.legDurations.push({
      direction: 'INBOUND', duration: { minutes: 210, iso8601: 'PT3H30M' }, overnightFlight: false, dayChange: 0,
    });
    journey.totalDuration = { minutes: 53_940, iso8601: 'PT899H' };
    const { result } = search({ returnDate: '2030-05-27' }, { data: [{ journeys: [journey] }] });
    expect(result.itineraries?.[0]?.durationMinutes).toBe(405);
  });

  it('distinguishes empty and malformed responses', () => {
    expect(search({}, { data: [{ journeys: [] }] }).result.status).toBe('empty');
    expect(search({}, { unexpected: [] }).result.error?.code).toBe('malformed_response');
  });

  it('normalizes a representative 2.85 MB search response and rejects responses over 3 MiB', () => {
    expect(search({}, { ...fictionalSearchResponse, padding: 'x'.repeat(2_850_000) }).result.status).toBe('success');
    expect(search({}, { ...fictionalSearchResponse, padding: 'x'.repeat(3 * 1024 * 1024) }).result.error?.code).toBe('oversized_response');
  });

  it.each([
    ['missing direction', (journey: any) => { delete journey.segments[0].direction; }],
    ['unknown direction', (journey: any) => { journey.segments[0].direction = 'SIDEWAYS'; }],
    ['missing total duration', (journey: any) => { delete journey.totalDuration; }],
    ['missing leg duration', (journey: any) => { journey.legDurations = []; }],
    ['negative price', (journey: any) => { journey.cheapestOffer.pricing.display.total = -1; }],
    ['unbounded price', (journey: any) => { journey.cheapestOffer.pricing.display.total = 100_000_001; }],
    ['unbounded duration', (journey: any) => { journey.totalDuration.minutes = 1_051_201; }],
  ])('drops a provider journey with %s instead of inventing data', (_label, mutate) => {
    const journey = structuredClone(fictionalSearchResponse.data[0].journeys[0]) as any;
    mutate(journey);
    expect(search({}, { data: [{ journeys: [journey] }] }).result.error?.code).toBe('malformed_response');
  });

  it('rejects an itinerary that exceeds the segment bound', () => {
    const journey = structuredClone(fictionalSearchResponse.data[0].journeys[0]) as any;
    journey.segments = Array.from({ length: 20 }, () => journey.segments[0]);
    const { result } = search({}, { data: [{ journeys: [journey] }] });
    expect(result.error?.code).toBe('malformed_response');
  });

  it('bounds baggage, messages, and provider strings', () => {
    const journey = structuredClone(fictionalSearchResponse.data[0].journeys[0]) as any;
    journey.cheapestOffer.baggage.included = Array.from({ length: 20 }, () => journey.cheapestOffer.baggage.included[0]);
    journey.cheapestOffer.terms.summary = Array.from({ length: 20 }, () => ({ level: 'warning', message: 'x'.repeat(600) }));
    journey.cheapestOffer.segmentAmenities = Array.from({ length: 20 }, () => ({
      segmentKey: 'fictional-segment-1',
      aircraftType: 'x'.repeat(300),
      amenities: Array.from({ length: 20 }, () => ({
        available: true,
        category: 'wifi',
        chargeable: false,
        name: 'x'.repeat(300),
        details: 'x'.repeat(600),
      })),
    }));
    const { result } = search({}, { data: [{ journeys: [journey] }] });
    expect(result.itineraries?.[0]?.baggage.allowances.length).toBeLessThanOrEqual(4);
    expect(result.itineraries?.[0]?.messages.length).toBeLessThanOrEqual(6);
    expect(result.itineraries?.[0]?.messages[0]?.length).toBeLessThanOrEqual(240);
    expect(result.itineraries?.[0]?.amenities.length).toBeLessThanOrEqual(5);
    expect(result.itineraries?.[0]?.amenities[0]?.name.length).toBeLessThanOrEqual(80);
    expect(result.itineraries?.[0]?.amenities[0]?.details.length).toBeLessThanOrEqual(160);
  });
});

describe('Nuitee gateway verification', () => {
  it('verifies in the deterministic compute sandbox without a Date global', () => {
    const sandboxed = gatewayWithoutDate();
    const result = sandboxed(
      { kind: 'verify', selectionId: selectionState.records[0].selectionId, state: selectionState, requestedAt: now },
      { callOperation: () => ({ raw: fictionalVerifyResponse }) },
    );
    expect(result.status).toBe('success');
  });

  it('normalizes RFC 3339 offsets when checking state freshness and offer expiry', () => {
    const offsetState = {
      ...selectionState,
      updatedAt: '2030-04-01T14:00:00+02:00',
      records: [{ ...selectionState.records[0], expiresAt: '2030-04-01T14:15:00+02:00' }],
    };
    const callOperation = vi.fn(() => ({ raw: fictionalVerifyResponse }));
    const result = runNuiteeGateway(
      { kind: 'verify', selectionId: offsetState.records[0].selectionId, state: offsetState, requestedAt: now },
      { callOperation },
    );
    expect(result.status).toBe('success');
    expect(callOperation).toHaveBeenCalledOnce();
  });

  it('resolves an application selection server-side and reports a changed fare normally', () => {
    const callOperation = vi.fn(() => ({ raw: fictionalVerifyResponse }));
    const result = runNuiteeGateway(
      { kind: 'verify', selectionId: selectionState.records[0].selectionId, state: selectionState, requestedAt: now },
      { callOperation },
    );
    expect(callOperation).toHaveBeenCalledWith('verify', { offerId: 'provider-offer-must-stay-private-1' });
    expect(result.status).toBe('success');
    expect(result.verification).toMatchObject({ availability: 'available', priceChanged: true, currentPrice: { total: 299.5, currency: 'CAD' } });
    expect(JSON.stringify(result.verification)).not.toContain('provider-offer-must-stay-private');
  });

  it('reports an unchanged verified fare normally', () => {
    const response = structuredClone(fictionalVerifyResponse) as any;
    response.data[0].journey.pricing.display.total = selectionState.records[0].originalTotal;
    response.data[0].changes.priceChanged = false;
    response.data[0].changes.messages = [];
    const result = runNuiteeGateway(
      { kind: 'verify', selectionId: selectionState.records[0].selectionId, state: selectionState, requestedAt: now },
      { callOperation: vi.fn(() => ({ raw: response })) },
    );
    expect(result.verification).toMatchObject({ priceChanged: false, currentPrice: { total: 284.5, currency: 'CAD' } });
  });

  it('rejects a locally expired offer and a mismatched search without calling Nuitee', () => {
    const expiredCall = vi.fn();
    const expired = runNuiteeGateway(
      { kind: 'verify', selectionId: selectionState.records[0].selectionId, state: selectionState, requestedAt: '2030-04-01T12:16:00Z' },
      { callOperation: expiredCall },
    );
    expect(expired.error?.code).toBe('expired_offer');
    expect(expiredCall).not.toHaveBeenCalled();

    const mismatchedCall = vi.fn();
    const mismatched = runNuiteeGateway(
      { kind: 'verify', selectionId: selectionState.records[0].selectionId, state: { ...selectionState, searchId: 'search_other' }, requestedAt: now },
      { callOperation: mismatchedCall },
    );
    expect(mismatched.error?.code).toBe('unknown_or_stale_selection');
    expect(mismatchedCall).not.toHaveBeenCalled();
  });

  it('distinguishes unavailable, malformed, and oversized verification responses', () => {
    const execute = (raw: unknown) => runNuiteeGateway(
      { kind: 'verify', selectionId: selectionState.records[0].selectionId, state: selectionState, requestedAt: now },
      { callOperation: vi.fn(() => ({ raw })) },
    );
    expect(execute({ data: [] }).error?.code).toBe('unavailable_offer');
    expect(execute({ data: [{}] }).error?.code).toBe('malformed_response');
    expect(execute({ data: [], padding: 'x'.repeat(800_000) }).error?.code).toBe('oversized_response');
  });

  it.each([
    ['unknown', 'sel_ffffffffffffffffffffffffffffffff', selectionState],
    ['malformed', 'provider-offer-must-stay-private-1', selectionState],
    ['stale', selectionState.records[0].selectionId, { ...selectionState, updatedAt: '2029-01-01T00:00:00Z' }],
  ])('rejects an %s selection without calling Nuitee', (_label, selectionId, state) => {
    const callOperation = vi.fn();
    const result = runNuiteeGateway({ kind: 'verify', selectionId, state, requestedAt: now }, { callOperation });
    expect(result.error?.code).toBe('unknown_or_stale_selection');
    expect(callOperation).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'invalid_request'],
    [401, 'authentication'],
    [403, 'entitlement'],
    [404, 'expired_offer'],
    [429, 'rate_limited'],
    [500, 'provider_error'],
    [502, 'provider_error'],
    [503, 'service_unavailable'],
  ])('classifies provider status %i without leaking its body', (status, code) => {
    const callOperation = vi.fn(() => {
      throw Object.assign(new Error('secret-provider-body'), { status });
    });
    const result = runNuiteeGateway(
      { kind: 'verify', selectionId: selectionState.records[0].selectionId, state: selectionState, requestedAt: now },
      { callOperation },
    );
    expect(result.error?.code).toBe(code);
    expect(JSON.stringify(result)).not.toContain('secret-provider-body');
  });

  it.each([
    ['request timed out', 'timeout'],
    ['response body too large', 'oversized_response'],
    ['credential unavailable', 'configuration_required'],
  ])('classifies connector failure %s', (message, code) => {
    const callOperation = vi.fn(() => { throw new Error(message); });
    const result = runNuiteeGateway(
      { kind: 'verify', selectionId: selectionState.records[0].selectionId, state: selectionState, requestedAt: now },
      { callOperation },
    );
    expect(result.error?.code).toBe(code);
    expect(JSON.stringify(result)).not.toContain(message);
  });
});
