import { describe, expect, it } from 'vitest';
import type { DemoTripReview } from '../src/demo-schemas.js';
import { planTripHotelSearch } from '../src/views/trip-hotel-search.js';

const review = { planningContext: { source: 'experience', dateBasis: 'experience_search', destination: 'Lisbon', countryCode: 'PT', startDate: '2026-09-18', endDate: '2026-09-21', adults: 2, children: 0, currency: 'CAD', meetingArea: 'Belém' } } as DemoTripReview;
describe('inline trip hotel search', () => {
  it('reuses known dates and party with a visible one-room browsing default', () => {
    const plan = planTripHotelSearch(review);
    expect(plan.input).toEqual({ destination: 'Lisbon', countryCode: 'PT', checkInDate: '2026-09-18', checkOutDate: '2026-09-21', adults: 2, children: 0, rooms: 1, currency: 'CAD' });
    expect(plan.note).toContain('1 room');
    expect(plan.note).toContain('Distance from Belém has not been checked');
  });
  it('uses both flight dates only as a labelled browsing suggestion, never a confirmed arrival', () => {
    const plan = planTripHotelSearch({ ...review, planningContext: { ...review.planningContext!, source: 'flight', dateBasis: 'flight_departure', destination: 'LIS', countryCode: undefined } });
    expect(plan.input).toMatchObject({ destination: 'LIS', checkInDate: '2026-09-18', checkOutDate: '2026-09-21' });
    expect(plan.note).toContain('flight dates as a starting point');
    expect(plan.note).toContain('Arrival timing has not been checked');
  });
  it('prefers an existing activity window and labels the one-night default when no end date is known', () => {
    const flight = { ...review, planningContext: { ...review.planningContext!, source: 'flight' as const, dateBasis: 'flight_departure' as const, activityDates: { startDate: '2026-09-19', endDate: '2026-09-23' } } };
    expect(planTripHotelSearch(flight).input).toMatchObject({ checkInDate: '2026-09-19', checkOutDate: '2026-09-23' });
    const plan = planTripHotelSearch({ ...flight, planningContext: { ...flight.planningContext, activityDates: undefined, endDate: undefined } });
    expect(plan.input).toMatchObject({ checkInDate: '2026-09-18', checkOutDate: '2026-09-19' });
    expect(plan.note).toContain('Starting with a 1-night stay');
  });
  it('defaults an omitted adult count to one and discloses it', () => {
    const plan = planTripHotelSearch({ ...review, planningContext: { ...review.planningContext!, adults: undefined } });
    expect(plan.input).toMatchObject({ adults: 1, rooms: 1 });
    expect(plan.note).toContain('1 adult, 1 room');
  });
  it('handles the one-night default across a year boundary and preserves explicit longer dates', () => {
    const plan = planTripHotelSearch({ ...review, planningContext: { ...review.planningContext!, startDate: '2026-12-31', endDate: undefined, currency: undefined } });
    expect(plan.input).toMatchObject({ checkInDate: '2026-12-31', checkOutDate: '2027-01-01', currency: 'CAD' });
    expect(planTripHotelSearch(review).input?.checkOutDate).toBe('2026-09-21');
  });
  it.each([{ startDate: '2026-02-30' }, { endDate: '2026-09-18' }, { endDate: '2026-11-01' }, { adults: 9 }, { children: 1 }, { infants: 1 }, { currency: 'JPY' }, { countryCode: undefined }])('hands unsupported or missing details back without guessing: %j', patch => {
    expect(planTripHotelSearch({ ...review, planningContext: { ...review.planningContext!, ...patch } }).input).toBeUndefined();
  });
});
