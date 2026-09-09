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
  it('runs at the serialized compute boundary without imports or module closures', () => {
    const run = runInNewContext(`(${tripPlanningEstimate.toString()})`);
    expect(run({ review: trip })).toEqual(tripPlanningEstimate({ review: trip }));
  });
});
