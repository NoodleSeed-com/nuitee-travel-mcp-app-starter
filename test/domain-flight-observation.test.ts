import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { z } from '@noodleseed/one';
import { runNuiteeGateway } from '../src/flight-runtime.js';
import { itinerarySchema, searchInputSchema } from '../src/flight-schemas.js';
import { runLegacyFlightObservation } from '../src/domain/flight-observation-adapter.js';
import { flightObservationResultSchema } from '../src/domain/flight-observation.js';
import { instantSchema, moneyFromDecimal } from '../src/domain/primitives.js';
import { publicDomainError } from '../src/domain/errors.js';
import { fictionalSearchResponse, validSearchInput } from './fixtures/nuitee.js';

function input() {
  const legacy = runNuiteeGateway({
    kind: 'search', search: validSearchInput, today: '2030-04-01', requestedAt: '2030-04-01T12:00:00Z',
  }, { callOperation: () => ({ raw: fictionalSearchResponse }) });
  return {
    itinerary: itinerarySchema.parse(legacy.itineraries![0]),
    searchContext: searchInputSchema.parse(validSearchInput),
    expectedContext: searchInputSchema.parse(validSearchInput),
    authority: {
      flightOfferId: `flight_${'ab'.repeat(16)}`,
      legacySelectionId: legacy.itineraries![0].selectionId,
      observedAt: '2030-04-01T12:00:00Z',
      selectionExpiresAt: '2030-04-01T12:30:00Z',
      now: '2030-04-01T12:01:00Z',
    },
  };
}

function observed(value = input()) {
  const result = runLegacyFlightObservation(value);
  expect(flightObservationResultSchema.safeParse(result).success).toBe(true);
  if (result.status !== 'observed') throw new Error('Expected a fixture observation');
  return result;
}

describe('legacy flight observations', () => {
  it('keeps truthful useful facts and distinct unknowns without changing legacy data', () => {
    const value = input();
    const original = structuredClone(value);
    const result = observed(value);
    expect(value).toEqual(original);
    expect(result.observation.totalPrice).toEqual({ status: 'KNOWN', value: { amountMinor: 28450, currency: 'CAD' } });
    expect(result.observation.cabin.status).toBe('UNKNOWN');
    expect(result.observation.validatingCarrier.status).toBe('UNKNOWN');
    expect(result.observation.segments[0].marketingCarrier.status).toBe('UNKNOWN');
    expect(result.observation.segments[0].flightNumber).toEqual({ status: 'KNOWN', value: 'ZZ101' });
    expect(result.observation.segments[0].departure.timeZone.status).toBe('UNKNOWN');
    expect(result.observation.baggage.checked).toEqual({ status: 'UNKNOWN', reason: 'AMBIGUOUS_LEGACY_DEFAULT' });
    expect(result.observation.observedAt).toBe(value.authority.observedAt);
    expect(result.observation.provenance).toMatchObject({ source: 'NUITEE_LIVE', isFictional: false, observedAt: value.authority.observedAt });
    expect(result.observation.verificationStatus).toBe('UNVERIFIED');
    expect(result.prerequisites.display.satisfied).toBe(true);
    expect(result.prerequisites.observedPrice.satisfied).toBe(true);
    expect(result.prerequisites.absoluteSchedule.satisfied).toBe(true);
    expect(result.prerequisites.localRules).toEqual({ satisfied: false, reasons: ['TIMEZONE_UNKNOWN'] });
    expect(result.prerequisites.requestVerification.satisfied).toBe(true);
    expect(JSON.stringify(result)).not.toContain('provider-offer-must-stay-private');
    expect(JSON.stringify(result)).not.toContain(value.authority.legacySelectionId);
  });

  it('does not turn synthesized legacy baggage text into a canonical entitlement', () => {
    const response = structuredClone(fictionalSearchResponse) as unknown as {
      data: Array<{ journeys: Array<{ cheapestOffer: { baggage: { included: unknown[] } } }> }>;
    };
    response.data[0].journeys[0].cheapestOffer.baggage.included = [{ pieces: -1.7 }];
    const legacy = runNuiteeGateway({
      kind: 'search', search: validSearchInput, today: '2030-04-01', requestedAt: '2030-04-01T12:00:00Z',
    }, { callOperation: () => ({ raw: response }) });
    const itinerary = itinerarySchema.parse(legacy.itineraries![0]);
    expect(itinerary.baggage.allowances).toEqual(['0 bag piece(s)']);
    const value = input();
    value.itinerary = itinerary;
    value.authority.legacySelectionId = itinerary.selectionId;
    const result = observed(value);
    expect(result.observation.baggage.allowances).toEqual({ status: 'UNKNOWN', reason: 'AMBIGUOUS_LEGACY_DEFAULT' });
    expect(result.observation.baggage.carryOn).toEqual({ status: 'KNOWN', value: true });
    expect(result.observation.baggage.checked.status).toBe('UNKNOWN');
    expect(JSON.stringify(result)).not.toContain('0 bag piece(s)');
    expect(result.prerequisites.observedPrice.satisfied).toBe(true);
  });

  it('gates only time-dependent actions for offset-free or invalid schedule observations', () => {
    const value = input();
    value.itinerary.segments[0].departureTime = '2030-04-20T09:00:00';
    let result = observed(value);
    expect(result.observation.segments[0].departure.local.status).toBe('KNOWN');
    expect(result.prerequisites.absoluteSchedule.reasons).toContain('ABSOLUTE_TIME_UNKNOWN');
    expect(result.prerequisites.observedPrice.satisfied).toBe(true);
    expect(result.prerequisites.requestVerification.satisfied).toBe(true);
    value.itinerary.segments[0].departureTime = '2030-02-30T09:00:00Z';
    result = observed(value);
    expect(result.observation.segments[0].departure.local.status).toBe('UNKNOWN');
    expect(result.prerequisites.display.satisfied).toBe(true);
    expect(result.prerequisites.localRules.reasons).toContain('LOCAL_TIME_UNKNOWN');
  });

  it('does not infer absent labels or price precision and isolates currency/party mismatches', () => {
    const value = input();
    delete value.itinerary.segments[0].flightNumber;
    value.itinerary.fare = {};
    value.itinerary.price.total = 0.001;
    let result = observed(value);
    expect(result.observation.fareFamily.status).toBe('UNKNOWN');
    expect(result.observation.segments[0].flightNumber.status).toBe('UNKNOWN');
    expect(result.observation.totalPrice.status).toBe('UNKNOWN');
    expect(result.prerequisites.observedPrice.reasons).toContain('PRICE_UNKNOWN');
    expect(result.prerequisites.requestVerification.satisfied).toBe(true);
    value.itinerary.price.total = 1;
    value.itinerary.price.currency = 'USD';
    result = observed(value);
    expect(result.prerequisites.observedPrice.reasons).toContain('CURRENCY_MISMATCH');
    const changed = input();
    changed.expectedContext.adults = 2;
    result = observed(changed);
    expect(result.prerequisites.observedPrice.reasons).toContain('CONTEXT_MISMATCH');
    expect(result.prerequisites.display.satisfied).toBe(true);
  });

  it('binds the exact dates, route, currency and age distribution of the expected trip', () => {
    for (const changed of [
      { departureDate: '2030-04-21' }, { origin: 'QZH' }, { currency: 'USD' },
      { adults: 2 }, { children: 1, childrenAges: [8] },
    ]) {
      const value = input();
      Object.assign(value.expectedContext, changed);
      const result = observed(value);
      expect(result.prerequisites.observedPrice.reasons).toContain('CONTEXT_MISMATCH');
      expect(result.prerequisites.absoluteSchedule.reasons).toContain('CONTEXT_MISMATCH');
      expect(result.prerequisites.requestVerification.reasons).toContain('CONTEXT_MISMATCH');
      expect(result.prerequisites.display.satisfied).toBe(true);
    }
  });

  it('retains round-trip legs and rejects reversed absolute segment times without blocking price display', () => {
    const value = input();
    value.searchContext.returnDate = '2030-04-27';
    value.expectedContext.returnDate = '2030-04-27';
    value.itinerary.segments.push({
      ...value.itinerary.segments[0], direction: 'INBOUND', origin: 'QZY', destination: 'QZX',
      departureTime: '2030-04-27T09:00:00+02:00', arrivalTime: '2030-04-27T12:15:00+02:00',
    });
    value.itinerary.legs.push({ ...value.itinerary.legs[0], direction: 'INBOUND', route: { origin: 'QZY', destination: 'QZX' } });
    const result = observed(value);
    expect(result.observation.legs.map((leg) => leg.direction)).toEqual(['OUTBOUND', 'INBOUND']);
    expect(result.prerequisites.absoluteSchedule.satisfied).toBe(true);
    value.itinerary.segments[1].arrivalTime = '2030-04-27T08:00:00+02:00';
    expect(observed(value).prerequisites.absoluteSchedule.reasons).toContain('SCHEDULE_CONFLICT');
    expect(observed(value).prerequisites.observedPrice.satisfied).toBe(true);
  });

  it('gates date-mismatched schedules and returns departing before the outbound arrival', () => {
    const value = input();
    value.itinerary.segments[0].departureTime = '2030-04-21T09:00:00Z';
    expect(observed(value).prerequisites.absoluteSchedule.reasons).toContain('SCHEDULE_DATE_MISMATCH');
    value.itinerary.segments[0].departureTime = '2030-04-20T09:00:00Z';
    value.searchContext.returnDate = '2030-04-21';
    value.expectedContext.returnDate = '2030-04-21';
    value.itinerary.segments[0].arrivalTime = '2030-04-21T12:00:00Z';
    value.itinerary.segments.push({
      ...value.itinerary.segments[0], direction: 'INBOUND', origin: 'QZY', destination: 'QZX',
      departureTime: '2030-04-21T11:00:00Z', arrivalTime: '2030-04-21T15:00:00Z',
    });
    value.itinerary.legs.push({ ...value.itinerary.legs[0], direction: 'INBOUND', route: { origin: 'QZY', destination: 'QZX' } });
    expect(observed(value).prerequisites.absoluteSchedule.reasons).toContain('SCHEDULE_CONFLICT');
    expect(observed(value).prerequisites.requestVerification.satisfied).toBe(true);
  });

  it('rejects array/object codes and enums without coercing untrusted values to strings', () => {
    const value = input();
    for (const key of ['origin', 'destination', 'currency', 'country', 'cabinClass'] as const) {
      expect(runLegacyFlightObservation({ ...value, searchContext: { ...value.searchContext, [key]: [value.searchContext[key]] } }).status).toBe('invalid');
    }
    for (const key of ['origin', 'destination', 'direction'] as const) {
      expect(runLegacyFlightObservation({ ...value, itinerary: { ...value.itinerary, segments: [{ ...value.itinerary.segments[0], [key]: [value.itinerary.segments[0][key]] }] } }).status).toBe('invalid');
    }
  });

  it('uses original server observation time and distinct retention/provider expiry gates', () => {
    const value = input();
    value.itinerary.retrievedAt = 'not-an-authoritative-clock';
    value.authority.now = '2030-04-01T12:30:00Z';
    let result = observed(value);
    expect(result.observation.observedAt).toBe('2030-04-01T12:00:00Z');
    expect(result.prerequisites.observedPrice.reasons).toContain('SELECTION_EXPIRED');
    expect(result.prerequisites.requestVerification.reasons).toContain('PROVIDER_EXPIRED');
    delete value.itinerary.expiresAt;
    value.authority.now = '2030-04-01T12:01:00Z';
    expect(observed(value).prerequisites.observedPrice.satisfied).toBe(true);
    value.itinerary.expiresAt = 'tomorrow';
    result = observed(value);
    expect(result.prerequisites.requestVerification.reasons).toContain('INVALID_PROVIDER_EXPIRY');
    expect(result.prerequisites.display.satisfied).toBe(true);
  });

  it('rejects invalid authoritative IDs, time, binding, and malformed core shapes safely', () => {
    for (const mutate of [
      (value: ReturnType<typeof input>) => { value.authority.flightOfferId = 'provider-123'; },
      (value: ReturnType<typeof input>) => { value.authority.legacySelectionId = `sel_${'cd'.repeat(16)}`; },
      (value: ReturnType<typeof input>) => { value.authority.observedAt = '2030-02-30T00:00:00Z'; },
      (value: ReturnType<typeof input>) => { value.authority.observedAt = '2030-04-01T12:02:00Z'; },
      (value: ReturnType<typeof input>) => { value.authority.selectionExpiresAt = value.authority.observedAt; },
      (value: ReturnType<typeof input>) => { value.itinerary.segments = []; },
      (value: ReturnType<typeof input>) => { value.expectedContext.children = 1; },
    ]) {
      const value = input();
      mutate(value);
      const result = runLegacyFlightObservation(value);
      expect(result).toEqual({ status: 'invalid', error: publicDomainError('INVALID_TRIP_INPUT') });
      expect(flightObservationResultSchema.safeParse(result).success).toBe(true);
    }
  });

  it('runs the exact serialized function without ambient clock, Intl, Node, or import closures', () => {
    const sandboxed = runInNewContext(`(${runLegacyFlightObservation.toString()})`, {
      Date: undefined, Intl: undefined, process: undefined, require: undefined,
      fetch: undefined, BigInt: undefined, URL: undefined, Map: undefined, Set: undefined,
    }) as typeof runLegacyFlightObservation;
    const value = input();
    expect(sandboxed(value)).toEqual(runLegacyFlightObservation(value));
  });

  it('agrees with canonical Money and instant constraints for representative edge cases', () => {
    for (const [amount, currency] of [[0.29, 'USD'], [123, 'JPY'], [0.001, 'BHD'], [0.001, 'KWD']] as const) {
      const value = input();
      value.itinerary.price = { total: amount, currency };
      expect(observed(value).observation.totalPrice).toEqual({ status: 'KNOWN', value: moneyFromDecimal(String(amount), currency) });
    }
    for (const timestamp of ['2000-02-29T00:00:00Z', '1900-02-29T00:00:00Z', '2030-01-01T00:00:00-00:00', '2030-01-01T00:00:00+14:01', '2030-01-01T24:00:00Z']) {
      const value = input();
      value.itinerary.expiresAt = timestamp;
      expect(observed(value).observation.expiresAt.status === 'KNOWN').toBe(instantSchema.safeParse(timestamp).success);
    }
  });

  it('publishes known/unknown and prerequisite result discriminants in JSON Schema', () => {
    const schema = JSON.stringify(z.toJSONSchema(flightObservationResultSchema));
    expect(schema).toContain('KNOWN');
    expect(schema).toContain('UNKNOWN');
    expect(schema).toContain('NOT_AVAILABLE_IN_LEGACY_PROJECTION');
    expect(schema).toContain('additionalProperties');
  });
});
