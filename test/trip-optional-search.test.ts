import { expect, it } from 'vitest';
import { planTripPoints, planTripProtection } from '../src/views/trip-optional-search.js';
import type { DemoTripReview } from '../src/demo-schemas.js';
import { getSyntheticLoyaltyOverview } from '../src/demo-fixtures.js';

const trip = { planningContext: { source: 'stay', destination: 'Lisbon', startDate: '2030-04-20', endDate: '2030-04-21', dateBasis: 'stay', adults: 2, children: 0, currency: 'EUR' } } as DemoTripReview;
it('reuses known trip context for examples without applying points', () => {
  expect(planTripPoints(trip).input).toMatchObject({ destination: 'Lisbon', adults: 2, departureDate: '2030-04-20', currency: 'EUR', pointsBudget: 42500 });
  expect(planTripProtection(trip).input).toEqual({ destination: 'Lisbon', departureDate: '2030-04-20', returnDate: '2030-04-21', adults: 2, children: 0, residenceCountry: 'CA', currency: 'EUR' });
});
it.each([{ infants: 1 }, { adults: 9 }, { currency: 'JPY' }])('does not silently replace unsupported known travelers/currency: %j', unsupported => {
  const data = { ...trip, planningContext: { ...trip.planningContext!, ...unsupported } };
  expect(planTripPoints(data).input).toBeUndefined();
  expect(planTripProtection(data).input).toBeUndefined();
});
it('does not invent an end date or party for protection', () => {
  expect(planTripProtection({ ...trip, planningContext: { ...trip.planningContext!, endDate: undefined } }).input).toBeUndefined();
  expect(planTripProtection({ ...trip, planningContext: { ...trip.planningContext!, adults: undefined } }).input).toBeUndefined();
  const missingChildren = planTripProtection({ ...trip, planningContext: { ...trip.planningContext!, children: undefined } });
  expect(missingChildren.input).toBeUndefined();
  expect(missingChildren.error).toMatch(/traveler|party/i);
});
it('uses known activity dates when browsing from flight context', () => {
  const data = { ...trip, planningContext: { ...trip.planningContext!, dateBasis: 'flight_departure' as const, activityDates: { startDate: '2030-04-21', endDate: '2030-04-23' } } };
  expect(planTripProtection(data).input).toMatchObject({ departureDate: '2030-04-21', returnDate: '2030-04-23' });
});

it.each([
  { children: -1 }, { children: 0.5 }, { children: '0' }, { children: 7 },
  { adults: 0 }, { adults: -1 }, { adults: 1.5 }, { adults: '2' }, { adults: 3, children: 6 },
  { infants: -1 }, { infants: '0' }, { infants: 0.5 }, { startDate: '2030-02-30' },
  { endDate: '2030-04-20' }, { endDate: '2030-07-20' }, { currency: undefined },
])('rejects malformed or unsupported protection context: %j', patch => {
  const data = { ...trip, planningContext: { ...trip.planningContext!, ...patch } } as DemoTripReview;
  const result = planTripProtection(data);
  expect(result.input).toBeUndefined();
  expect(result.error).toEqual(expect.any(String));
});

it('accepts the supported protection party, duration and currency limits', () => {
  for (const currency of ['CAD', 'USD', 'EUR', 'GBP']) {
    const result = planTripProtection({ ...trip, planningContext: { ...trip.planningContext!,
      adults: 2, children: 6, infants: 0, endDate: '2030-07-19', currency } });
    expect(result.input).toMatchObject({ adults: 2, children: 6, returnDate: '2030-07-19', currency, residenceCountry: 'CA' });
  }
});

it.each([{}, { startDate: '2030-04-21' }, { endDate: '2030-04-23' }, null, '2030-04-21'])('does not mix incomplete activity dates with flight fallback dates: %j', activityDates => {
  const data = { ...trip, planningContext: { ...trip.planningContext!, dateBasis: 'flight_departure', activityDates } } as DemoTripReview;
  expect(planTripProtection(data).input).toBeUndefined();
});

it('uses only a valid fixture profile balance inside the reward comparison budget bounds', () => {
  const profile = getSyntheticLoyaltyOverview();
  for (const pointsBalance of [5_000, 57_000, 1_000_000]) {
    const result = planTripPoints({ ...trip, loyalty: { ...profile, member: { ...profile.member, pointsBalance } } });
    expect(result.input?.pointsBudget).toBe(pointsBalance);
    expect(result.note).not.toContain('42,500');
  }
});

it.each([undefined, null, '42500', -1, 0, 4_999, 1.5, NaN, Infinity, 1_000_001])('uses a visible sample budget when the profile balance is unusable: %j', pointsBalance => {
  const profile = getSyntheticLoyaltyOverview();
  const result = planTripPoints({ ...trip, loyalty: { ...profile, member: { ...profile.member, pointsBalance } } } as DemoTripReview);
  expect(result.input?.pointsBudget).toBe(42_500);
  expect(result.note).toMatch(/42,500.*example|example.*42,500/i);
});

it.each([undefined, {}, { member: null }, { member: {} }])('safely explains the fallback when the sample profile is missing or incomplete: %j', loyalty => {
  const result = planTripPoints({ ...trip, loyalty } as DemoTripReview);
  expect(result.input?.pointsBudget).toBe(42_500);
  expect(result.note).toContain('42,500');
});

it('does not treat foreign account data as the illustrative profile', () => {
  const profile = getSyntheticLoyaltyOverview();
  const result = planTripPoints({ ...trip, loyalty: { ...profile, dataSource: 'live_account', member: { ...profile.member, pointsBalance: 57_000 } } } as unknown as DemoTripReview);
  expect(result.input?.pointsBudget).toBe(42_500);
  expect(result.note).toContain('42,500');
});

it('keeps fallback point assumptions visible without inventing protection context', () => {
  const result = planTripPoints({} as DemoTripReview);
  expect(result.input).toEqual({ origin: 'Toronto', adults: 1, cabinClass: 'ECONOMY', currency: 'CAD', pointsBudget: 42_500 });
  expect(result.note).toMatch(/Toronto.*one adult.*CAD.*42,500/);
  expect(planTripProtection({} as DemoTripReview).input).toBeUndefined();
});

it.each([{ adults: 0 }, { adults: -1 }, { adults: 1.5 }, { adults: '2' }, { children: -1 }, { infants: '0' }])('does not submit malformed known travelers in a points example: %j', patch => {
  expect(planTripPoints({ ...trip, planningContext: { ...trip.planningContext!, ...patch } } as DemoTripReview).input).toBeUndefined();
});
