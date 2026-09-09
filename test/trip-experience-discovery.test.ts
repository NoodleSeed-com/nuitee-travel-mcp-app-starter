import { describe, expect, it } from 'vitest';
import type { DemoTripReview } from '../src/demo-schemas.js';
import { planTripExperienceSearch, tripPlanningSnapshot } from '../src/views/trip-experience-search.js';
import { compareSyntheticTravelInsurance } from '../src/demo-fixtures.js';

const review = { planningContext: { source: 'flight', dateBasis: 'flight_departure', destination: 'LIS', startDate: '2026-09-18', adults: 2, children: 0, currency: 'CAD' } } as DemoTripReview;
describe('direct trip experience search', () => {
  it('drops the prior protection estimate from a provisional newly-added experience snapshot', () => {
    const plan = compareSyntheticTravelInsurance({ destination: 'Lisbon', departureDate: '2026-09-16', returnDate: '2026-09-17', adults: 2, children: 0, residenceCountry: 'CA', currency: 'EUR' }).plans[0]!;
    const data = { ...review, flight: { selectionId: 'flight', searchPrice: { total: 100, currency: 'EUR' } }, experiences: [], missing: ['stay', 'experiences'], protection: { plan, comparisonId: 'comparison' } } as unknown as DemoTripReview;
    const added = { selectionId: 'new', experience: { title: 'New activity' }, slot: { startLocal: '2026-09-16T10:00:00', timeZone: 'Europe/Lisbon' }, searchContext: { adults: 2 }, totalPrice: { amountMinor: 2000, currency: 'EUR' } } as DemoTripReview['experiences'][number];
    expect(tripPlanningSnapshot(data).planningEstimate.totalMinor).toBe(13400);
    const snapshot = tripPlanningSnapshot(data, added);
    expect(snapshot.protection).toBeNull();
    expect(snapshot.planningEstimate.totalMinor).toBe(12000);
    expect(snapshot.planningEstimate.items.some(item => item.component === 'protection')).toBe(false);
  });
  it('uses a labelled one-day flight-date suggestion, never a made-up stay window', () => {
    const planned = planTripExperienceSearch(review);
    expect(planned.input).toMatchObject({ destination: 'LIS', startDate: '2026-09-18', endDate: '2026-09-19', adults: 2, currency: 'CAD', accessibility: 'ANY' });
    expect(planned.input).not.toHaveProperty('experienceName');
    expect(planned.dateBasis).toBe('flight_date_suggestion');
    expect(planned.note).toContain('Using your flight date as a starting point');
    expect(planned.input).not.toHaveProperty('interests');
  });
  it('reuses the activity window without treating a model-supplied field as confirmed provenance', () => {
    const planned = planTripExperienceSearch({ ...review, planningContext: { ...review.planningContext!, activityDates: { startDate: '2026-09-19', endDate: '2026-09-23' } } });
    expect(planned.input).toMatchObject({ startDate: '2026-09-19', endDate: '2026-09-23' });
    expect(planned.dateBasis).toBe('trip_dates_suggestion');
    expect(planned.note).toContain('Using your trip-planning dates as a starting point');
    expect(planned.note).toContain('Arrival timing has not been checked');
    expect(planned.note).not.toContain('Using your activity or stay dates');
  });
  it('keeps the flight-date label when the model echoes it into the optional activity window', () => {
    const planned = planTripExperienceSearch({ ...review, planningContext: { ...review.planningContext!, activityDates: { startDate: '2026-09-18', endDate: '2026-09-19' } } });
    expect(planned.input).toMatchObject({ startDate: '2026-09-18', endDate: '2026-09-19' });
    expect(planned.dateBasis).toBe('flight_date_suggestion');
    expect(planned.note).toContain('Using your flight date as a starting point');
    expect(planned.note).not.toContain('Using your activity or stay dates');
  });
  it('uses selected stay dates without a provisional-arrival warning', () => {
    const planned = planTripExperienceSearch({ ...review, planningContext: { ...review.planningContext!, source: 'stay', dateBasis: 'stay', startDate: '2026-09-19', endDate: '2026-09-22', propertyName: 'Hotel Mundial' } });
    expect(planned.input).toMatchObject({ startDate: '2026-09-19', endDate: '2026-09-22' });
    expect(planned.dateBasis).toBe('stay');
    expect(planned.note).toContain('Using your activity or stay dates');
    expect(planned.note).not.toContain('starting point');
  });
  it('does not turn a round-trip return date into a confirmed activity end date', () => {
    expect(planTripExperienceSearch({ ...review, planningContext: { ...review.planningContext!, endDate: '2026-09-22' } }).input?.endDate).toBe('2026-09-19');
  });
  it('handles the calendar boundary without a timezone conversion', () => {
    expect(planTripExperienceSearch({ ...review, planningContext: { ...review.planningContext!, startDate: '2028-02-29' } }).input?.endDate).toBe('2028-03-01');
  });
  it('does not search with missing dates, unsupported party or currency', () => {
    for (const patch of [{ startDate: undefined }, { adults: 9 }, { infants: 1 }, { currency: 'XYZ' }, { adults: undefined }]) {
      const plan = planTripExperienceSearch({ ...review, planningContext: { ...review.planningContext!, ...patch } });
      expect(plan.input).toBeUndefined();
      expect(plan.error).toBeTruthy();
    }
  });
});
