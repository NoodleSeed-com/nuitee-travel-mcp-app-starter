import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { demoGatewayOutputSchema } from '../src/demo-connectors.js';
import { compareSyntheticTravelInsurance, getSyntheticLoyaltyOverview } from '../src/demo-fixtures.js';
import { runDemoGateway } from '../src/demo-runtime.js';
import { runTripProtection } from '../src/trip-protection.js';
import {
  demoAddExperienceInputSchema,
  demoExperienceSelectionStateSchema,
} from '../src/demo-schemas.js';
import { DEMO_EXPERIENCE_ALIASES, DEMO_EXPERIENCE_CATALOG } from '../src/experience-fixtures.js';
import { acknowledgeExperienceSelection } from '../src/selection-state.js';

const requestedAt = '2030-04-01T12:00:00.000Z';
const searchContext = {
  destination: 'Lisbon', startDate: '2030-04-20', endDate: '2030-04-23',
  adults: 2, children: 0, currency: 'EUR' as const,
};
function search(experienceState?: unknown, overrides = {}, at = requestedAt) {
  return demoGatewayOutputSchema.parse(runDemoGateway({
    kind: 'experience_search', experienceSearch: { ...searchContext, ...overrides },
    experienceCatalog: DEMO_EXPERIENCE_CATALOG, experienceAliases: DEMO_EXPERIENCE_ALIASES,
    experienceState, requestedAt: at, experienceReadOk: true,
  }));
}
function add(state: unknown, experienceId: string, slotId: string, at = requestedAt) {
  return demoGatewayOutputSchema.parse(runDemoGateway({
    kind: 'experience_select', experienceState: state, experienceId, slotId, requestedAt: at, experienceReadOk: true,
  }));
}
function firstSelection() {
  const searched = search();
  const experience = searched.experienceResult!.experiences[0]!;
  return { searched, experience, added: add(searched.nextExperienceState, experience.experienceId, experience.slots[0]!.slotId) };
}

describe('server-owned experience planning selections', () => {
  it('accepts only returned references, never caller price, party, or state', () => {
    const { experience } = firstSelection();
    const request = { experienceId: experience.experienceId, slotId: experience.slots[0]!.slotId };
    expect(demoAddExperienceInputSchema.parse(request)).toEqual(request);
    for (const extra of [{ price: 1 }, { adults: 1 }, { experienceState: {} }, { requestedAt }]) {
      expect(demoAddExperienceInputSchema.safeParse({ ...request, ...extra }).success).toBe(false);
    }
  });

  it('stores exactly returned options with server clock expiry and computes adult totals from those records', () => {
    const { searched, experience, added } = firstSelection();
    expect(searched.nextExperienceState!.records).toHaveLength(3);
    expect(searched.nextExperienceState!.records[0]).toMatchObject({
      createdAt: requestedAt, expiresAt: '2030-04-01T12:30:00.000Z', searchContext,
    });
    expect(added.experienceSelection).toMatchObject({
      status: 'selected', selection: {
        experience, slot: experience.slots[0], searchContext,
        totalPrice: { amountMinor: experience.price.amountMinor * 2, currency: 'EUR' },
        addedAt: requestedAt, expiresAt: '2030-04-01T12:30:00.000Z',
      },
    });
    expect(added.experienceSelection!.selection!.selectionId).toMatch(/^esel_[a-f0-9]{32}$/);
    expect(added.nextExperienceState!.selected).toHaveLength(1);
    expect(added.experienceSelection!.message).toContain('not reserved');
  });

  it('rejects foreign references, mismatched slots, missing state, and expired options', () => {
    const { searched, experience } = firstSelection();
    const other = searched.experienceResult!.experiences[1]!;
    expect(add(undefined, experience.experienceId, experience.slots[0]!.slotId).experienceSelection!.status).toBe('unavailable');
    expect(add(searched.nextExperienceState, experience.experienceId, other.slots[0]!.slotId).experienceSelection!.status).toBe('unavailable');
    expect(add(searched.nextExperienceState, experience.experienceId, experience.slots[0]!.slotId, '2030-04-01T12:30:00.000Z').experienceSelection!.status).toBe('expired');
    expect(add(searched.nextExperienceState, experience.experienceId, experience.slots[0]!.slotId, 'invalid-clock').experienceSelection!.status).toBe('unavailable');
    const failedRead = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'experience_select', experienceState: searched.nextExperienceState, experienceReadOk: false,
      experienceId: experience.experienceId, slotId: experience.slots[0]!.slotId, requestedAt,
    }));
    expect(failedRead.experienceSelection!.status).toBe('unavailable');
    expect(failedRead.nextExperienceState).toBeUndefined();
  });

  it('replays duplicate selections without mutation and preserves selected items on later searches', () => {
    const { experience, added } = firstSelection();
    const duplicate = add(added.nextExperienceState, experience.experienceId, experience.slots[0]!.slotId);
    expect(duplicate.experienceSelection!.status).toBe('already_selected');
    expect(duplicate.experienceSelection!.selection).toEqual(added.experienceSelection!.selection);
    expect(duplicate.nextExperienceState).toBeUndefined();
    const tokyo = search(added.nextExperienceState, { destination: 'Tokyo' });
    expect(tokyo.nextExperienceState!.selected).toEqual(added.nextExperienceState!.selected);
    expect(tokyo.nextExperienceState!.records.every((record) => record.experience.city === 'Tokyo')).toBe(true);
    expect(add(tokyo.nextExperienceState, experience.experienceId, experience.slots[0]!.slotId).experienceSelection!.status).toBe('already_selected');
  });

  it('normalizes a blank broad-search name in stored options without changing existing selections', () => {
    const { added } = firstSelection();
    const searched = search(added.nextExperienceState, { destination: 'Tokyo', experienceName: ' ' });
    expect(searched.experienceResult!.experiences).toHaveLength(3);
    expect(searched.nextExperienceState!.records).toHaveLength(3);
    for (const record of searched.nextExperienceState!.records) {
      expect(record.searchContext).not.toHaveProperty('experienceName');
    }
    expect(searched.nextExperienceState!.selected).toEqual(added.nextExperienceState!.selected);
    const experience = searched.experienceResult!.experiences[0]!;
    const selected = add(searched.nextExperienceState, experience.experienceId, experience.slots[0]!.slotId);
    expect(selected.experienceSelection!.status).toBe('selected');
    expect(selected.experienceSelection!.selection!.searchContext).not.toHaveProperty('experienceName');
    expect(selected.nextExperienceState!.selected).toHaveLength(2);
  });

  it('can add a freshly searched option after the previous identical choice expires', () => {
    const { added, experience } = firstSelection();
    const later = '2030-04-01T12:31:00.000Z';
    const refreshed = search(added.nextExperienceState, {}, later);
    const chosenAgain = add(refreshed.nextExperienceState, experience.experienceId, experience.slots[0]!.slotId, later);
    expect(chosenAgain.experienceSelection!.status).toBe('selected');
    expect(chosenAgain.experienceSelection!.selection!.expiresAt).toBe('2030-04-01T13:01:00.000Z');
    expect(chosenAgain.nextExperienceState!.selected).toHaveLength(1);
  });

  it('keeps one original selection when a later currency search returns new references for the same activity and time', () => {
    const { added } = firstSelection();
    const newSearch = search(added.nextExperienceState, { currency: 'USD' });
    const experience = newSearch.experienceResult!.experiences[0]!;
    const duplicate = add(newSearch.nextExperienceState, experience.experienceId, experience.slots[0]!.slotId);
    expect(duplicate.experienceSelection!.status).toBe('already_selected');
    expect(duplicate.experienceSelection!.selection).toEqual(added.experienceSelection!.selection);
    expect(duplicate.experienceSelection!.selection!.experience.experienceId).not.toBe(experience.experienceId);
    expect(duplicate.experienceSelection!.selection!.totalPrice.currency).toBe('EUR');
    expect(duplicate.nextExperienceState).toBeUndefined();
  });

  it('never proposes replacing stored choices after an unsuccessful state read', () => {
    const result = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'experience_search', experienceSearch: searchContext, experienceCatalog: DEMO_EXPERIENCE_CATALOG,
      experienceAliases: DEMO_EXPERIENCE_ALIASES, requestedAt, experienceReadOk: false,
    }));
    expect(result.experienceResult!.experiences).toHaveLength(3);
    expect(result.mayWriteExperienceState).toBe(false);
    expect(result.nextExperienceState).toBeUndefined();
  });

  it('blocks unknown child pricing and insufficient stored capacity without claiming success', () => {
    const withChildren = search(undefined, { children: 1 });
    const childOption = withChildren.experienceResult!.experiences[0]!;
    const childResult = add(withChildren.nextExperienceState, childOption.experienceId, childOption.slots[0]!.slotId);
    expect(childResult.experienceSelection).toMatchObject({ status: 'unavailable' });
    expect(childResult.experienceSelection!.message).toMatch(/child pricing is unknown/i);
    expect(childResult.nextExperienceState).toBeUndefined();

    const { searched, experience } = firstSelection();
    const state = structuredClone(searched.nextExperienceState!);
    state.records[0]!.experience.slots[0]!.remainingCapacity = 1;
    expect(add(state, experience.experienceId, experience.slots[0]!.slotId).experienceSelection!.status).toBe('unavailable');
  });

  it('acknowledges new selections only after an explicit successful state patch', () => {
    const { added } = firstSelection();
    const proposal = added.experienceSelection!;
    expect(acknowledgeExperienceSelection({ proposal, patchOk: true })).toEqual(proposal);
    for (const patchOk of [false, undefined, 'true']) {
      expect(acknowledgeExperienceSelection({ proposal, patchOk })).toEqual({
        status: 'conflict', message: 'Your trip changed before this experience could be added. Review your trip, then try again.',
      });
    }
    expect(acknowledgeExperienceSelection({ proposal: { ...proposal, status: 'already_selected' } }).status).toBe('already_selected');
  });

  it('reviews any selected component, including experience-only and empty plans', () => {
    const { added } = firstSelection();
    const review = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'review', flightState: undefined, hotelState: undefined,
      experienceState: added.nextExperienceState, experienceReadOk: true, requestedAt, loyalty: getSyntheticLoyaltyOverview(),
    })).review!;
    expect(review).toMatchObject({ status: 'ready', missing: ['flight', 'stay'], experiences: [added.experienceSelection!.selection] });
    expect(review.fallback).not.toContain('needs a current');
    const empty = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'review', flightState: undefined, hotelState: undefined, requestedAt,
      loyalty: getSyntheticLoyaltyOverview(),
    })).review!;
    expect(empty).toMatchObject({ status: 'incomplete', experiences: [], missing: ['flight', 'stay', 'experiences'] });
    expect(review.planningContext).toMatchObject({
      source: 'experience', destination: 'Lisbon', countryCode: 'PT', adults: 2,
      startDate: searchContext.startDate, endDate: searchContext.endDate,
      dateBasis: 'experience_search', meetingArea: added.experienceSelection!.selection!.experience.meetingArea,
    });
    const expiredReview = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'review', flightState: undefined, hotelState: undefined,
      experienceState: added.nextExperienceState, experienceReadOk: true, requestedAt: '2030-04-01T12:30:00.000Z',
      loyalty: getSyntheticLoyaltyOverview(),
    })).review!;
    expect(expiredReview).toMatchObject({ status: 'incomplete', experiences: [] });
    expect(expiredReview.notes?.join(' ')).toContain('expired');
  });

  it('returns relevant selected-flight context without inventing an arrival or return date', () => {
    const flight = {
      selectionId: 'sel_0123456789abcdef0123456789abcdef', offerId: 'private-provider-id', searchId: 'search_test',
      originalTotal: 400, currency: 'EUR', expiresAt: '2030-04-01T12:15:00.000Z',
      planningContext: { origin: 'YYZ', destination: 'LIS', departureDate: '2030-04-20', adults: 2, children: 0, infants: 1, currency: 'EUR' },
    };
    const reviewed = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'review', hotelState: undefined,
      flightState: { records: [flight], activeSelectionId: flight.selectionId, updatedAt: requestedAt },
      requestedAt, loyalty: getSyntheticLoyaltyOverview(),
    })).review!;
    expect(reviewed).toMatchObject({ status: 'ready', missing: ['stay', 'experiences'], experiences: [] });
    expect(reviewed.flight).toMatchObject({ origin: 'YYZ', destination: 'LIS' });
    expect(reviewed.planningContext).toMatchObject({
      source: 'flight', destination: 'LIS', origin: 'YYZ', startDate: '2030-04-20', dateBasis: 'flight_departure',
      adults: 2, children: 0, infants: 1,
    });
    expect(reviewed.planningContext).not.toHaveProperty('endDate');
    expect(reviewed.notes?.join(' ')).toContain('Confirm local arrival');
    expect(JSON.stringify(reviewed)).not.toContain('private-provider-id');
  });

  it('exposes explicit activity dates alongside, not instead of, flight dates', () => {
    const activityDates = { startDate: '2030-04-21', endDate: '2030-04-24' };
    const flight = {
      selectionId: 'sel_0123456789abcdef0123456789abcdef', offerId: 'private-provider-id', searchId: 'search_test',
      originalTotal: 400, currency: 'EUR', expiresAt: '2030-04-01T12:15:00.000Z',
      planningContext: { origin: 'YYZ', destination: 'LIS', departureDate: '2030-04-20', adults: 2, children: 0, infants: 0, currency: 'EUR', activityDates },
    };
    const reviewed = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'review', flightState: { records: [flight], activeSelectionId: flight.selectionId, updatedAt: requestedAt },
      requestedAt, loyalty: getSyntheticLoyaltyOverview(),
    })).review!;
    expect(reviewed.planningContext).toMatchObject({ startDate: '2030-04-20', dateBasis: 'flight_departure', activityDates });
  });

  it('reuses party and origin only from selections matching the same city and trip dates', () => {
    const { added } = firstSelection();
    const stay = {
      selectionId: 'hsel_0123456789abcdef0123456789abcdef', searchId: 'hsearch_0123456789abcdef0123456789abcdef',
      dataSource: 'illustrative', propertyName: 'Fictional Lisbon Studio', city: 'Lisbon',
      checkInDate: searchContext.startDate, checkOutDate: searchContext.endDate, nights: 3, rooms: 1,
      staySubtotal: { amount: 240, currency: 'EUR' },
    };
    const flight = {
      selectionId: 'sel_0123456789abcdef0123456789abcdef', offerId: 'private-provider-id',
      originalTotal: 400, currency: 'EUR',
      planningContext: { origin: 'YYZ', destination: 'LIS', departureDate: searchContext.startDate,
        returnDate: searchContext.endDate, adults: 2, children: 0, infants: 0, currency: 'EUR' },
    };
    const review = (selectedFlight: typeof flight, experienceState?: unknown) => demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'review', requestedAt, experienceReadOk: true, experienceState,
      hotelState: { records: [stay], activeSelectionId: stay.selectionId },
      flightState: { records: [selectedFlight], activeSelectionId: selectedFlight.selectionId },
      aliases: DEMO_EXPERIENCE_ALIASES, loyalty: getSyntheticLoyaltyOverview(),
    })).review!;
    expect(review(flight, added.nextExperienceState).planningContext).toMatchObject({
      source: 'stay', destination: 'Lisbon', propertyName: stay.propertyName, adults: 2, children: 0, origin: 'YYZ',
    });
    const unrelated = review({ ...flight, planningContext: { ...flight.planningContext, destination: 'NRT' } });
    expect(unrelated.planningContext).not.toHaveProperty('adults');
    expect(unrelated.planningContext).not.toHaveProperty('origin');
  });

  it('reuses party from the selected stay search, not a later unrelated search or a conflicting flight', () => {
    const stay = {
      selectionId: 'hsel_0123456789abcdef0123456789abcdef', searchId: 'hsearch_0123456789abcdef0123456789abcdef',
      dataSource: 'illustrative', propertyName: 'Fictional Lisbon Studio', city: 'Lisbon',
      checkInDate: searchContext.startDate, checkOutDate: searchContext.endDate, nights: 3, rooms: 1,
      staySubtotal: { amount: 240, currency: 'EUR' },
    };
    const flight = { selectionId: 'sel_0123456789abcdef0123456789abcdef', offerId: 'private-provider-id', originalTotal: 400, currency: 'EUR',
      planningContext: { origin: 'YYZ', destination: 'LIS', departureDate: searchContext.startDate, returnDate: searchContext.endDate, adults: 3, children: 0, infants: 0, currency: 'EUR' } };
    const review = (searchId = stay.searchId, includeFlight = false) => demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'review', requestedAt, experienceReadOk: true,
      hotelState: { records: [stay], activeSelectionId: stay.selectionId, searchResult: { searchId, searchContext: { adults: 2, children: 0 } } },
      ...(includeFlight ? { flightState: { records: [flight], activeSelectionId: flight.selectionId } } : {}),
      aliases: DEMO_EXPERIENCE_ALIASES, loyalty: getSyntheticLoyaltyOverview(),
    })).review!;
    expect(review().planningContext).toMatchObject({ source: 'stay', adults: 2, children: 0 });
    expect(review('hsearch_ffffffffffffffffffffffffffffffff').planningContext).not.toHaveProperty('adults');
    expect(review(stay.searchId, true).planningContext).not.toHaveProperty('adults');
    expect(review(stay.searchId, true).notes).toContain('Selected components have different participant details. Confirm who is joining the next part of the trip.');
  });

  it.each([
    ['experience', { adults: 3 }], ['experience', { children: 1 }], ['experience', { infants: 1 }],
    ['stay', { adults: 3 }], ['stay', { children: 1 }], ['stay', { infants: 1 }],
  ] as const)('clears conflicting participant counts for a %s-based plan: %j', (source, difference) => {
    const { added } = firstSelection();
    const flight = {
      selectionId: 'sel_0123456789abcdef0123456789abcdef', originalTotal: 400, currency: 'EUR',
      planningContext: { origin: 'YYZ', destination: 'LIS', departureDate: searchContext.startDate,
        returnDate: searchContext.endDate, adults: 2, children: 0, infants: 0, currency: 'EUR', ...difference },
    };
    const stay = {
      selectionId: 'hsel_0123456789abcdef0123456789abcdef', searchId: 'hsearch_0123456789abcdef0123456789abcdef',
      dataSource: 'illustrative', propertyName: 'Fictional Lisbon Studio', city: 'Lisbon',
      checkInDate: searchContext.startDate, checkOutDate: searchContext.endDate, nights: 3, rooms: 1,
      staySubtotal: { amount: 240, currency: 'EUR' },
    };
    const reviewed = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'review', requestedAt, experienceReadOk: true, experienceState: added.nextExperienceState,
      flightState: { records: [flight], activeSelectionId: flight.selectionId },
      hotelState: source === 'stay' ? { records: [stay], activeSelectionId: stay.selectionId,
        searchResult: { searchId: stay.searchId, searchContext: { adults: 2, children: 0 } } } : undefined,
      aliases: DEMO_EXPERIENCE_ALIASES, loyalty: getSyntheticLoyaltyOverview(),
    })).review!;
    expect(reviewed.planningContext).toMatchObject({ source, destination: 'Lisbon', origin: 'YYZ' });
    for (const field of ['adults', 'children', 'infants']) expect(reviewed.planningContext).not.toHaveProperty(field);
    expect(reviewed.notes).toContain('Selected components have different participant details. Confirm who is joining the next part of the trip.');
    expect(reviewed.experiences[0]!.searchContext.adults).toBe(2);
    const comparison = compareSyntheticTravelInsurance({ destination: 'Lisbon', departureDate: searchContext.startDate,
      returnDate: searchContext.endDate, adults: 2, children: 0, residenceCountry: 'CA', currency: 'EUR' });
    expect(runTripProtection({ kind: 'prepare', review: reviewed, comparison, state: {},
      readOk: true, tripReadOk: true, requestedAt })).toMatchObject({ canSelect: false, mayWrite: false });
  });

  it('checks every matching experience party instead of retaining the first selection’s counts', () => {
    const first = firstSelection().added.experienceSelection!.selection!;
    const searched = search(undefined, { adults: 3 });
    const experience = searched.experienceResult!.experiences[0]!;
    const second = add(searched.nextExperienceState, experience.experienceId, experience.slots[0]!.slotId).experienceSelection!.selection!;
    const reviewed = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'review', requestedAt, flightState: undefined, hotelState: undefined, experienceReadOk: true,
      experienceState: { updatedAt: requestedAt, records: [], selected: [first, second] },
      aliases: DEMO_EXPERIENCE_ALIASES, loyalty: getSyntheticLoyaltyOverview(),
    })).review!;
    expect(reviewed.planningContext).toMatchObject({ source: 'experience', destination: 'Lisbon' });
    for (const field of ['adults', 'children', 'infants']) expect(reviewed.planningContext).not.toHaveProperty(field);
    expect(reviewed.notes).toContain('Selected components have different participant details. Confirm who is joining the next part of the trip.');
    expect(reviewed.experiences.map(selection => selection.searchContext.adults)).toEqual([2, 3]);
  });

  it('bounds stored choices and stays self-contained in serialized compute', () => {
    const { searched, experience, added } = firstSelection();
    expect(demoExperienceSelectionStateSchema.safeParse({
      ...added.nextExperienceState, selected: Array.from({ length: 9 }, () => added.experienceSelection!.selection),
    }).success).toBe(false);
    const atLimit = { ...searched.nextExperienceState!, selected: Array.from({ length: 8 }, (_, index) => ({
      ...added.experienceSelection!.selection!,
      experience: { ...added.experienceSelection!.selection!.experience, experienceId: `exp_${index.toString(16).padStart(32, '0')}`, title: `Other experience ${index}` },
    })) };
    expect(add(atLimit, experience.experienceId, experience.slots[0]!.slotId).experienceSelection!.status).toBe('limit_reached');
    const isolated = runInNewContext(`(${runDemoGateway.toString()})`, { Date: undefined }) as typeof runDemoGateway;
    const searchedWithoutDate = demoGatewayOutputSchema.parse(isolated({
      kind: 'experience_search', experienceSearch: searchContext, experienceCatalog: DEMO_EXPERIENCE_CATALOG,
      experienceAliases: DEMO_EXPERIENCE_ALIASES, requestedAt: '2030-04-30T23:45:00.000Z', experienceReadOk: true,
    }));
    expect(searchedWithoutDate.nextExperienceState!.records[0]!.expiresAt).toBe('2030-05-01T00:15:00.000Z');
    const selected = isolated({ kind: 'experience_select', experienceState: searched.nextExperienceState,
      experienceId: experience.experienceId, slotId: experience.slots[0]!.slotId, requestedAt, experienceReadOk: true });
    expect(demoGatewayOutputSchema.parse(selected).experienceSelection!.status).toBe('selected');
    const gate = runInNewContext(`(${acknowledgeExperienceSelection.toString()})`, Object.create(null)) as typeof acknowledgeExperienceSelection;
    expect(gate({ proposal: added.experienceSelection, patchOk: false }).status).toBe('conflict');
  });
});
