import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { tripPlanningEstimate } from '../src/trip-planning-estimate.js';
import { demoTripReviewFlightSchema } from '../src/demo-schemas.js';

const trip = {
  flight: { searchPrice: { total: 1743.32, currency: 'EUR' } },
  stay: { dataSource: 'live_nuitee', staySubtotal: { amount: 323.33, currency: 'EUR' } },
  experiences: [{ totalPrice: { amountMinor: 9200, currency: 'EUR' } }],
  planningContext: { adults: 2 },
};

describe('source-aware trip planning estimate', () => {
  it('accepts an explicit unavailable review price, not an omitted or malformed one', () => {
    const flight = { dataSource: 'live_nuitee_selection', selectionId: `sel_${'a'.repeat(32)}`, disclosure: 'The selected search price is currently unavailable.' };
    expect(demoTripReviewFlightSchema.safeParse({ ...flight, searchPrice: null }).success).toBe(true);
    expect(demoTripReviewFlightSchema.safeParse(flight).success).toBe(false);
    expect(demoTripReviewFlightSchema.safeParse({ ...flight, searchPrice: {} }).success).toBe(false);
  });
  it('sums already party-priced selections in integer minor units, never per traveler', () => {
    expect(tripPlanningEstimate({ review: trip })).toMatchObject({
      status: 'complete', currency: 'EUR', fractionDigits: 2, totalMinor: 215865,
      providerSubtotalMinor: 206665, fictionalSubtotalMinor: 9200,
    });
  });
  it('labels illustrative stays separately from provider search prices', () => {
    const result = tripPlanningEstimate({ review: { ...trip, stay: { ...trip.stay, dataSource: 'illustrative' } } });
    expect(result.providerSubtotalMinor).toBe(174332);
    expect(result.fictionalSubtotalMinor).toBe(41533);
    expect(result.items[1]?.source).toBe('fictional');
  });
  it('never converts or totals mixed currencies', () => {
    const result = tripPlanningEstimate({ review: { ...trip, flight: { searchPrice: { total: 1743.32, currency: 'CAD' } } } });
    expect(result.status).toBe('mixed_currencies');
    expect(result.totalMinor).toBeUndefined();
    expect(result.providerSubtotalMinor).toBeUndefined();
    expect(result.items.map(item => item.currency)).toEqual(['CAD', 'EUR', 'EUR']);
  });
  it.each([undefined, { currency: 'EUR' }, { total: NaN, currency: 'EUR' }, { total: -1, currency: 'EUR' }, { total: 1.005, currency: 'EUR' }, { total: 100, currency: 'ZZZ' }])('does not treat an unusable selected price as zero: %j', searchPrice => {
    const result = tripPlanningEstimate({ review: { ...trip, flight: { searchPrice } } });
    expect(result.status).toBe('incomplete');
    expect(result.totalMinor).toBeUndefined();
    expect(result.items[0]?.amountMinor).toBeUndefined();
    expect(result.items[1]?.amountMinor).toBe(32333);
  });
  it('keeps a real zero price and avoids floating point arithmetic errors', () => {
    const result = tripPlanningEstimate({ review: { flight: { searchPrice: { total: 0.1, currency: 'CAD' } }, stay: { dataSource: 'live_nuitee', staySubtotal: { amount: 0.2, currency: 'CAD' } }, experiences: [{ totalPrice: { amountMinor: 0, currency: 'CAD' } }] } });
    expect(result.totalMinor).toBe(30);
    expect(result.items[2]?.amountMinor).toBe(0);
  });
  it('does not divide JPY minor units by 100', () => {
    expect(tripPlanningEstimate({ review: { flight: { searchPrice: { total: 1000, currency: 'JPY' } }, experiences: [{ totalPrice: { amountMinor: 2000, currency: 'JPY' } }] } })).toMatchObject({ totalMinor: 3000, fractionDigits: 0 });
  });
  it('preserves native flight amounts when combined calculation precision is unsupported', () => {
    const result = tripPlanningEstimate({ review: { flight: { searchPrice: { total: 100.12, currency: 'AUD' } } } });
    expect(result.status).toBe('incomplete');
    expect(result.items[0]).toMatchObject({ amount: 100.12, currency: 'AUD' });
    expect(result.totalMinor).toBeUndefined();
  });
  it('shows only selected components and no total for an empty plan', () => {
    expect(tripPlanningEstimate({ review: { experiences: [] } })).toEqual({ status: 'empty', items: [] });
    expect(tripPlanningEstimate({ review: { experiences: trip.experiences } })).toMatchObject({ status: 'complete', totalMinor: 9200, providerSubtotalMinor: 0, fictionalSubtotalMinor: 9200 });
  });
  it('does not let a supplied points balance or client total discount the trip', () => {
    expect(tripPlanningEstimate({ review: { ...trip, loyalty: { pointsBalance: 42500 }, total: 1 } }).totalMinor).toBe(215865);
  });
  it('adds one selected protection party price to the fictional subtotal without multiplying it', () => {
    const protection = { plan: { illustrativePrice: { amount: 56, currency: 'EUR' } }, searchContext: { adults: 2, children: 1 } };
    const result = tripPlanningEstimate({ review: { ...trip, protection } });
    expect(result).toMatchObject({ status: 'complete', currency: 'EUR', totalMinor: 221465,
      providerSubtotalMinor: 206665, fictionalSubtotalMinor: 14800 });
    expect(result.items.at(-1)).toMatchObject({ component: 'protection', source: 'fictional', amountMinor: 5600 });
    expect(result.items.filter(item => item.component === 'protection')).toHaveLength(1);
  });
  it('does not count the same protection choice twice when supplied through review and the compute input', () => {
    const protection = { plan: { illustrativePrice: { amount: 56, currency: 'EUR' } } };
    const result = tripPlanningEstimate({ review: { ...trip, protection }, protection });
    expect(result.totalMinor).toBe(221465);
    expect(result.items.filter(item => item.component === 'protection')).toHaveLength(1);
    const replacement = { plan: { illustrativePrice: { amount: 81, currency: 'EUR' } } };
    expect(tripPlanningEstimate({ review: { ...trip, protection }, protection: replacement }).totalMinor).toBe(223965);
  });
  it('preserves a selected protection currency without converting or offering a combined total', () => {
    const result = tripPlanningEstimate({ review: trip, protection: { plan: { illustrativePrice: { amount: 56, currency: 'CAD' } } } });
    expect(result.status).toBe('mixed_currencies');
    expect(result.totalMinor).toBeUndefined();
    expect(result.providerSubtotalMinor).toBeUndefined();
    expect(result.fictionalSubtotalMinor).toBeUndefined();
    expect(result.items.at(-1)).toMatchObject({ component: 'protection', amount: 56, amountMinor: 5600, currency: 'CAD' });
  });
  it.each([undefined, null, { currency: 'EUR' }, { amount: NaN, currency: 'EUR' }, { amount: -1, currency: 'EUR' }, { amount: 1.005, currency: 'EUR' }])('keeps the estimate incomplete for an unusable selected protection price: %j', illustrativePrice => {
    const result = tripPlanningEstimate({ review: trip, protection: { plan: { illustrativePrice } } });
    expect(result.status).toBe('incomplete');
    expect(result.totalMinor).toBeUndefined();
    expect(result.items.at(-1)).toMatchObject({ component: 'protection', source: 'fictional' });
    expect(result.items.at(-1)?.amountMinor).toBeUndefined();
    expect(result.items[0]?.amountMinor).toBe(174332);
  });
  it('does not add a merely browsed comparison or an unacknowledged proposal to the estimate', () => {
    const comparison = { plans: [{ illustrativePrice: { amount: 56, currency: 'EUR' } }] };
    const result = tripPlanningEstimate({ review: { ...trip, comparison, protectionProposal: { selection: comparison.plans[0] } } });
    expect(result.totalMinor).toBe(215865);
    expect(result.items.some(item => item.component === 'protection')).toBe(false);
  });
  it('runs at the serialized compute boundary without imports or module closures', () => {
    const run = runInNewContext(`(${tripPlanningEstimate.toString()})`);
    expect(run({ review: trip })).toEqual(tripPlanningEstimate({ review: trip }));
    const input = { review: trip, protection: { plan: { illustrativePrice: { amount: 56, currency: 'EUR' } } } };
    expect(run(input)).toEqual(tripPlanningEstimate(input));
  });
});
