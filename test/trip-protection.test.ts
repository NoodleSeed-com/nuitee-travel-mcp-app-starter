import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { compareSyntheticTravelInsurance } from '../src/demo-fixtures.js';
import { runTripProtection } from '../src/trip-protection.js';

const requestedAt = '2030-04-01T12:00:00.000Z';
const expiresAt = '2030-04-01T12:30:00.000Z';
const searchContext = {
  destination: 'Lisbon', departureDate: '2030-04-20', returnDate: '2030-04-23',
  adults: 2, children: 0, residenceCountry: 'CA', currency: 'EUR' as const,
};
const comparison = compareSyntheticTravelInsurance(searchContext);
const review = {
  status: 'ready',
  flight: { selectionId: 'sel_0123456789abcdef0123456789abcdef' }, experiences: [],
  planningContext: { source: 'flight', dateBasis: 'flight_departure', destination: 'Lisbon',
    startDate: searchContext.departureDate, endDate: searchContext.returnDate,
    adults: 2, children: 0, infants: 0, currency: 'EUR' },
};
const object = (value: unknown) => value as Record<string, unknown>;
function prepare(overrides: Partial<Parameters<typeof runTripProtection>[0]> = {}) {
  return runTripProtection({ kind: 'prepare', comparison, review, state: {}, requestedAt, readOk: true, tripReadOk: true, ...overrides });
}
function select(state: unknown, overrides: Partial<Parameters<typeof runTripProtection>[0]> = {}) {
  return runTripProtection({ kind: 'select', action: 'select', comparisonId: comparison.comparisonId,
    planId: comparison.plans[0]!.planId, state, review, requestedAt, readOk: true, tripReadOk: true, ...overrides });
}
function selected() { return select(prepare().nextState); }

describe('server-owned protection planning state', () => {
  it('caches the full bounded server comparison and only its own 30-minute clock', () => {
    const result = prepare();
    expect(result).toMatchObject({ canSelect: true, mayWrite: true, nextState: {
      comparison: { result: comparison, createdAt: requestedAt, expiresAt },
    } });
    expect(Object.keys(object(result.nextState))).toEqual(['comparison', 'selected']);
    expect(object(result.nextState).selected).toBeNull();
    expect(object(object(result.nextState).comparison).tripKey).toEqual(expect.any(String));
    expect(String(object(object(result.nextState).comparison).tripKey).length).toBeLessThanOrEqual(3000);
    expect(comparison.assumptions.join(' ')).toContain('Canada');
  });

  it('resolves a selection from saved records, preserving a party price without multiplication', () => {
    const result = selected();
    expect(result).toMatchObject({ status: 'selected', mayWrite: true, selection: {
      comparisonId: comparison.comparisonId, plan: comparison.plans[0], searchContext,
      addedAt: requestedAt, expiresAt,
    } });
    expect(object(result.nextState).selected).toEqual(result.selection);
    expect(result.message).toMatch(/not insured/i);
    const contaminatedInput = { ...prepare().nextState as object, price: 1, total: 1 };
    expect(select(contaminatedInput).selection).toEqual(result.selection);
    expect(select(prepare().nextState, { comparison: { ...comparison, plans: comparison.plans.map(item => ({
      ...item, illustrativePrice: { amount: 1, currency: 'EUR' },
    })) } }).selection).toEqual(result.selection);
  });

  it('rejects absent state and foreign, malformed or unrecognized IDs', () => {
    for (const state of [undefined, {}]) expect(select(state)).toMatchObject({ status: 'unavailable', mayWrite: false });
    const state = prepare().nextState;
    for (const changes of [
      { comparisonId: 'inscmp_ffffffffffffffffffffffffffffffff' },
      { planId: 'inplan_ffffffffffffffffffffffffffffffff' },
      { comparisonId: 'unrecognized' }, { planId: 'unrecognized' }, { action: undefined },
    ]) expect(select(state, changes)).toMatchObject({ status: 'unavailable', mayWrite: false });
    const other = compareSyntheticTravelInsurance({ ...searchContext, adults: 3 });
    expect(select(state, { planId: other.plans[0]!.planId })).toMatchObject({ status: 'unavailable', mayWrite: false });
  });

  it('requires successful selection and trip reads before preparing or changing state', () => {
    for (const changes of [{ readOk: false }, { readOk: undefined }, { tripReadOk: false }, { tripReadOk: undefined }]) {
      expect(prepare(changes)).toMatchObject({ canSelect: false, mayWrite: false });
      expect(prepare(changes).nextState).toBeUndefined();
      expect(select(prepare().nextState, changes)).toMatchObject({ status: 'unavailable', mayWrite: false });
      expect(select(prepare().nextState, changes).nextState).toBeUndefined();
    }
  });

  it('requires at least one authoritative trip selection', () => {
    for (const invalidReview of [undefined, {}, { ...review, flight: undefined },
      { ...review, flight: { selectionId: 'foreign' } },
    ]) expect(prepare({ review: invalidReview })).toMatchObject({ canSelect: false, mayWrite: false });
  });

  it('does not invent absent dates, party, currency or protection end dates', () => {
    for (const changes of [
      { startDate: undefined }, { endDate: undefined }, { adults: undefined }, { children: undefined }, { currency: undefined },
    ]) expect(prepare({ review: { ...review, planningContext: { ...review.planningContext, ...changes } } })).toMatchObject({ canSelect: false, mayWrite: false });
  });

  it('uses exact trimmed destination matching and flight activity dates when present', () => {
    expect(prepare({ review: { ...review, planningContext: { ...review.planningContext, destination: ' lisBON ' } } }).canSelect).toBe(true);
    expect(prepare({ review: { ...review, planningContext: { ...review.planningContext, destination: 'LIS' } } }).canSelect).toBe(false);
    const activityReview = { ...review, planningContext: { ...review.planningContext,
      startDate: '2030-04-18', endDate: '2030-04-25',
      activityDates: { startDate: searchContext.departureDate, endDate: searchContext.returnDate },
    } };
    expect(prepare({ review: activityReview }).canSelect).toBe(true);
    expect(prepare({ review: { ...activityReview, planningContext: { ...activityReview.planningContext,
      activityDates: { startDate: searchContext.departureDate },
    } } }).canSelect).toBe(false);
  });

  it('leaves mismatched comparisons browse-only', () => {
    for (const changes of [
      { destination: 'Tokyo' }, { departureDate: '2030-04-21' }, { returnDate: '2030-04-24' },
      { adults: 3 }, { children: 1 }, { currency: 'USD' as const },
    ]) {
      const result = prepare({ comparison: compareSyntheticTravelInsurance({ ...searchContext, ...changes }) });
      expect(result).toMatchObject({ canSelect: false, mayWrite: false });
      expect(result.nextState).toBeUndefined();
    }
  });

  it('rejects malformed and unsupported context instead of weakening party or currency bounds', () => {
    for (const changes of [
      { adults: 0 }, { adults: 9 }, { adults: 1.5 }, { adults: '2' }, { children: -1 }, { children: 7 },
      { adults: 3, children: 6 }, { children: '0' }, { infants: 1 }, { infants: -1 }, { infants: '0' },
      { currency: 'JPY' }, { currency: 'eur' }, { endDate: '2030-07-20' },
      { startDate: '2030-02-30' }, { endDate: searchContext.departureDate },
    ]) expect(prepare({ review: { ...review, planningContext: { ...review.planningContext, ...changes } } }).canSelect).toBe(false);
  });

  it('accepts the existing four comparison currencies and eight-traveler, ninety-day bounds', () => {
    for (const currency of ['CAD', 'USD', 'EUR', 'GBP'] as const) {
      const nextSearch = { ...searchContext, adults: 2, children: 6, returnDate: '2030-07-19', currency };
      const result = prepare({ comparison: compareSyntheticTravelInsurance(nextSearch),
        review: { ...review, planningContext: { ...review.planningContext, adults: 2, children: 6, endDate: nextSearch.returnDate, currency } } });
      expect(result.canSelect).toBe(true);
    }
  });

  it('rejects invalid clocks and reversed time without extending a selection', () => {
    for (const at of [undefined, 'invalid-clock', '99999999999999999999']) {
      expect(prepare({ requestedAt: at })).toMatchObject({ canSelect: false, mayWrite: false });
      expect(select(prepare().nextState, { requestedAt: at })).toMatchObject({ status: 'unavailable', mayWrite: false });
    }
    expect(select(prepare().nextState, { requestedAt: '2030-04-01T11:59:59.999Z' })).toMatchObject({ status: 'unavailable', mayWrite: false });
    const added = select(prepare().nextState, { requestedAt: '2030-04-01T12:10:00.000Z' });
    expect(object(added.selection).expiresAt).toBe(expiresAt);
    expect(select(added.nextState)).toMatchObject({ status: 'unavailable', mayWrite: false });
    expect(prepare({ state: added.nextState }).mayWrite).toBe(false);
  });

  it('expires comparisons and selected concepts at the exact deadline', () => {
    const added = selected();
    expect(select(prepare().nextState, { requestedAt: expiresAt })).toMatchObject({ status: 'expired', mayWrite: false });
    expect(select(added.nextState, { requestedAt: expiresAt })).toMatchObject({ status: 'expired', mayWrite: false });
    expect(runTripProtection({ kind: 'review', state: added.nextState, review, requestedAt: expiresAt,
      readOk: true, tripReadOk: true })).toMatchObject({ note: expect.stringMatching(/expired/i) });
    expect(runTripProtection({ kind: 'review', state: added.nextState, review, requestedAt: expiresAt,
      readOk: true, tripReadOk: true }).selection).toBeUndefined();
    expect(object(prepare({ state: added.nextState, requestedAt: expiresAt }).nextState).selected).toBeNull();
  });

  it('can select again from a refreshed cache after the preserved earlier selection expires', () => {
    const added = selected();
    const refreshed = prepare({ state: added.nextState, requestedAt: '2030-04-01T12:20:00.000Z' });
    expect(object(refreshed.nextState).selected).toEqual(added.selection);
    const later = '2030-04-01T12:35:00.000Z';
    const chosenAgain = select(refreshed.nextState, { requestedAt: later });
    expect(chosenAgain).toMatchObject({ status: 'selected', mayWrite: true, selection: {
      addedAt: later, expiresAt: '2030-04-01T12:50:00.000Z', plan: comparison.plans[0],
    } });
    expect(select(refreshed.nextState, { action: 'remove', requestedAt: later })).toMatchObject({ status: 'expired', mayWrite: false });
    expect(select(refreshed.nextState, { requestedAt: '2030-04-01T12:50:00.000Z' })).toMatchObject({ status: 'expired', mayWrite: false });
  });

  it('validates real UTC dates and rolls expiry through leap days, month ends and year ends', () => {
    for (const [requestedAt, expiresAt] of [
      ['2000-02-28T23:45:00Z', '2000-02-29T00:15:00.000Z'],
      ['2032-02-29T23:45:00.123Z', '2032-03-01T00:15:00.123Z'],
      ['2030-04-30T23:45:00.1Z', '2030-05-01T00:15:00.100Z'],
      ['2030-12-31T23:45:00.999Z', '2031-01-01T00:15:00.999Z'],
    ]) {
      const result = prepare({ requestedAt });
      expect(result.canSelect).toBe(true);
      expect(object(object(result.nextState).comparison).expiresAt).toBe(expiresAt);
    }
    for (const requestedAt of ['1900-02-29T12:00:00Z', '2030-02-29T12:00:00Z', '2030-04-31T12:00:00Z',
      '2030-04-01T24:00:00Z', '2030-04-01T12:60:00Z', '2030-04-01T12:00:60Z', '2030-04-01T12:00:00+00:00',
      '9999-12-31T23:45:00Z']) {
      expect(prepare({ requestedAt })).toMatchObject({ canSelect: false, mayWrite: false });
    }
  });

  it('binds choices to all trip selection IDs plus effective dates, party and currency', () => {
    const added = selected();
    for (const nextReview of [
      { ...review, flight: { selectionId: 'sel_ffffffffffffffffffffffffffffffff' } },
      { ...review, stay: { selectionId: 'hsel_ffffffffffffffffffffffffffffffff' } },
      { ...review, car: { selectionId: 'carsel_ffffffffffffffff' } },
      { ...review, experiences: [{ selectionId: 'esel_ffffffffffffffffffffffffffffffff' }] },
      ...[{ adults: 3 }, { currency: 'USD' }, { startDate: '2030-04-21' }, { destination: 'Tokyo' }]
        .map(changes => ({ ...review, planningContext: { ...review.planningContext, ...changes } })),
    ]) {
      expect(select(added.nextState, { review: nextReview })).toMatchObject({ status: 'conflict', mayWrite: false });
      expect(runTripProtection({ kind: 'review', state: added.nextState, review: nextReview,
        requestedAt, readOk: true, tripReadOk: true }).selection).toBeUndefined();
    }
  });

  it('keeps bindings stable across price changes and experience order', () => {
    const experiences = [{ selectionId: `esel_${'a'.repeat(32)}` }, { selectionId: `esel_${'b'.repeat(32)}` }];
    const initial = { ...review, experiences };
    const prepared = prepare({ review: initial });
    const added = select(prepared.nextState, { review: initial });
    expect(select(added.nextState, { review: { ...initial, flight: { ...review.flight, searchPrice: { total: 1, currency: 'EUR' } },
      experiences: [...experiences].reverse() } }).status).toBe('already_selected');
  });

  it('replays duplicates without writing and explicitly replaces the one selected plan', () => {
    const added = selected();
    expect(select(added.nextState)).toMatchObject({ status: 'already_selected', selection: added.selection, mayWrite: false });
    expect(select(added.nextState).nextState).toBeUndefined();
    const replacement = select(added.nextState, { planId: comparison.plans[1]!.planId });
    expect(replacement).toMatchObject({ status: 'selected', mayWrite: true });
    expect(object(object(replacement.nextState).selected).plan).toEqual(comparison.plans[1]);
    expect(Object.keys(object(replacement.nextState)).sort()).toEqual(['comparison', 'selected']);
  });

  it('preserves an existing selection when a new server comparison replaces the cache', () => {
    const added = selected();
    const newComparison = compareSyntheticTravelInsurance({ ...searchContext, residenceCountry: 'US' });
    const prepared = prepare({ state: added.nextState, comparison: newComparison });
    expect(object(prepared.nextState).selected).toEqual(added.selection);
    expect(object(object(prepared.nextState).comparison).result).toEqual(newComparison);
    expect(select(prepared.nextState)).toMatchObject({ status: 'already_selected', mayWrite: false });
  });

  it('removes only the explicitly selected pair and does not let a stale card remove its replacement', () => {
    const added = selected();
    const removed = select(added.nextState, { action: 'remove' });
    expect(removed).toMatchObject({ status: 'removed', mayWrite: true });
    expect(removed.selection).toBeUndefined();
    expect(object(removed.nextState).selected).toBeNull();
    const replacement = select(added.nextState, { planId: comparison.plans[1]!.planId });
    expect(select(replacement.nextState, { action: 'remove' })).toMatchObject({ status: 'conflict', mayWrite: false });
    expect(select(removed.nextState, { action: 'remove' })).toMatchObject({ status: 'unavailable', mayWrite: false });
  });

  it('clears removed choices when state writes merge fields instead of replacing the record', () => {
    const added = selected();
    const removed = select(added.nextState, { action: 'remove' });
    const persisted = { ...object(added.nextState), ...object(removed.nextState) };
    expect(persisted.selected).toBeNull();
    expect(runTripProtection({ kind: 'acknowledge', proposal: removed, patchOk: true }).status).toBe('removed');
    expect(runTripProtection({ kind: 'review', state: persisted, review, requestedAt, readOk: true, tripReadOk: true })).toEqual({});
    expect(select(persisted, { action: 'remove' })).toMatchObject({ status: 'unavailable', mayWrite: false });
    expect(select(persisted)).toMatchObject({ status: 'selected', mayWrite: true });
  });

  it('clears expired or trip-mismatched choices when a new comparison is merged into state', () => {
    const added = selected();
    for (const overrides of [{ requestedAt: expiresAt },
      { review: { ...review, flight: { selectionId: 'sel_ffffffffffffffffffffffffffffffff' } } }]) {
      const prepared = prepare({ state: added.nextState, ...overrides });
      const persisted = { ...object(added.nextState), ...object(prepared.nextState) };
      expect(prepared).toMatchObject({ canSelect: true, mayWrite: true });
      expect(persisted.selected).toBeNull();
      expect(runTripProtection({ kind: 'review', state: persisted, review, requestedAt,
        readOk: true, tripReadOk: true, ...overrides })).toEqual({});
      expect(select(persisted, overrides)).toMatchObject({ status: 'selected', mayWrite: true });
    }
  });

  it('clears an expired comparison during removal and accepts the resulting empty tombstones', () => {
    const added = selected();
    const state = { ...object(added.nextState), comparison: { ...object(object(added.nextState).comparison),
      createdAt: '2030-04-01T11:20:00.000Z', expiresAt: '2030-04-01T11:50:00.000Z' } };
    const removed = select(state, { action: 'remove' });
    expect(removed).toMatchObject({ status: 'removed', mayWrite: true, nextState: { comparison: null, selected: null } });
    const persisted = { ...state, ...object(removed.nextState) };
    expect(persisted).toEqual({ comparison: null, selected: null });
    expect(runTripProtection({ kind: 'review', state: persisted, review, requestedAt, readOk: true, tripReadOk: true })).toEqual({});
    expect(select(persisted)).toMatchObject({ status: 'unavailable', mayWrite: false });
    expect(prepare({ state: persisted })).toMatchObject({ canSelect: true, mayWrite: true });
  });

  it('requires explicit successful write acknowledgment for selection and removal', () => {
    for (const proposal of [selected(), select(selected().nextState, { action: 'remove' })]) {
      const acknowledged = runTripProtection({ kind: 'acknowledge', proposal, patchOk: true });
      expect(acknowledged).toEqual({ status: proposal.status, message: proposal.message,
        ...(proposal.selection ? { selection: proposal.selection } : {}) });
      for (const patchOk of [false, undefined]) {
        expect(runTripProtection({ kind: 'acknowledge', proposal, patchOk })).toMatchObject({ status: 'conflict' });
        expect(runTripProtection({ kind: 'acknowledge', proposal, patchOk }).selection).toBeUndefined();
      }
    }
    const proposal = select(selected().nextState);
    expect(runTripProtection({ kind: 'acknowledge', proposal }).status).toBe('already_selected');
    expect(runTripProtection({ kind: 'acknowledge', proposal: {} }).status).toBe('conflict');
    expect(runTripProtection({ kind: 'acknowledge', proposal: selected(), patchOk: 'true' as unknown as boolean }).status).toBe('conflict');
  });

  it('fails closed on malformed enum values without coercing or echoing them', () => {
    for (const status of [['removed'], { toString: 'removed' }]) {
      expect(runTripProtection({ kind: 'acknowledge', proposal: { status, message: 'An untrusted result.' }, patchOk: true })).toMatchObject({ status: 'conflict' });
    }
    expect(prepare({ review: { ...review, planningContext: { ...review.planningContext, source: ['flight'] } } }).canSelect).toBe(false);
    expect(prepare({ review: { ...review, experiences: 'not-an-array' } }).canSelect).toBe(false);
    const invalidComparison = structuredClone(comparison);
    Object.assign(invalidComparison.plans[0]!.coverages[0]!, { basis: ['per_trip'] });
    expect(prepare({ comparison: invalidComparison }).canSelect).toBe(false);
  });

  it('reviews only current choices after successful reads and gives useful failure notes', () => {
    const added = selected();
    const args = { kind: 'review' as const, state: added.nextState, review, requestedAt, readOk: true, tripReadOk: true };
    expect(runTripProtection(args).selection).toEqual(added.selection);
    for (const changes of [{ readOk: false }, { tripReadOk: false }, { requestedAt: 'bad-clock' }]) {
      expect(runTripProtection({ ...args, ...changes }).selection).toBeUndefined();
      expect(runTripProtection({ ...args, ...changes }).note).toEqual(expect.any(String));
    }
    expect(runTripProtection({ ...args, state: {} })).toEqual({});
  });

  it('rejects malformed saved money, oversized comparisons and nonfinite state clocks', () => {
    for (const change of [(state: Record<string, unknown>) => { object(object(state.comparison).result).plans = []; },
      (state: Record<string, unknown>) => { object(state.comparison).createdAt = 'not-a-clock'; },
      (state: Record<string, unknown>) => { object(state.comparison).expiresAt = '2030-04-02T12:30:00.000Z'; },
      (state: Record<string, unknown>) => { const result = object(object(state.comparison).result);
        const plans = result.plans as Record<string, unknown>[]; object(plans[0]!.illustrativePrice).amount = Infinity; },
    ]) {
      const state = structuredClone(object(prepare().nextState));
      change(state);
      expect(select(state)).toMatchObject({ status: 'unavailable', mayWrite: false });
      expect(prepare({ state }).mayWrite).toBe(false);
    }
  });

  it('runs without module closure state when serialized for Noodle compute', () => {
    const isolated = runInNewContext(`(${runTripProtection.toString()})`, { Date: undefined }) as typeof runTripProtection;
    const initial = isolated({ kind: 'prepare', comparison, review, requestedAt, readOk: true, tripReadOk: true });
    expect(initial).toEqual(prepare({ state: undefined }));
    const proposed = isolated({ kind: 'select', state: initial.nextState, review, requestedAt,
      action: 'select', comparisonId: comparison.comparisonId, planId: comparison.plans[0]!.planId,
      readOk: true, tripReadOk: true });
    expect(proposed).toEqual(selected());
    expect(isolated({ kind: 'acknowledge', proposal: proposed, patchOk: true }).status).toBe('selected');
    expect(isolated({ kind: 'review', state: proposed.nextState, review, requestedAt, readOk: true, tripReadOk: true }).selection).toEqual(proposed.selection);
  });
});
