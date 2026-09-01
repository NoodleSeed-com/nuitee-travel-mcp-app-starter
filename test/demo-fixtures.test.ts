import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  demoHotelSchema,
  demoHotelSearchInputSchema,
  demoHotelSearchOutputSchema,
  demoHotelSelectionStateSchema,
  demoLoyaltyOverviewSchema,
  demoRewardFlightSearchOutputSchema,
  demoTripReviewSchema,
} from '../src/demo-schemas.js';
import {
  DEMO_DESTINATION_ALIASES,
  DEMO_HOTEL_CATALOG,
  DEMO_REWARD_FLIGHT_CATALOG,
  buildSyntheticTripReview,
  getSyntheticLoyaltyOverview,
  hotelSelectionRecords,
  searchSyntheticRewardFlights,
  searchSyntheticHotels,
} from '../src/demo-fixtures.js';
import { demoGatewayOutputSchema } from '../src/demo-connectors.js';
import { runDemoGateway } from '../src/demo-runtime.js';

const searchInput = {
  destination: 'Lisbon',
  checkInDate: '2030-04-20',
  checkOutDate: '2030-04-23',
  adults: 2,
  children: 0,
  rooms: 1,
  currency: 'CAD' as const,
};

const rewardSearchInput = {
  origin: 'Toronto',
  adults: 1,
  cabinClass: 'ECONOMY' as const,
  pointsBudget: 42_500,
  currency: 'CAD' as const,
};

describe('synthetic Wayfare travel fixtures', () => {
  it('validates hotel dates, traveler bounds, room relationships, and supported currencies', () => {
    expect(demoHotelSearchInputSchema.parse(searchInput)).toEqual(searchInput);
    expect(demoHotelSearchInputSchema.safeParse({
      ...searchInput,
      checkOutDate: searchInput.checkInDate,
    }).success).toBe(false);
    expect(demoHotelSearchInputSchema.safeParse({
      ...searchInput,
      checkOutDate: '2030-06-20',
    }).success).toBe(false);
    expect(demoHotelSearchInputSchema.safeParse({
      ...searchInput,
      adults: 1,
      rooms: 2,
    }).success).toBe(false);
    expect(demoHotelSearchInputSchema.safeParse({
      ...searchInput,
      currency: 'GBP',
    }).success).toBe(false);
    expect(demoHotelSearchInputSchema.safeParse({
      ...searchInput,
      destination: 'x'.repeat(81),
    }).success).toBe(false);
  });

  it('returns deterministic bounded fictional stays with opaque application identifiers', () => {
    const first = searchSyntheticHotels(searchInput);
    const second = searchSyntheticHotels(searchInput);

    expect(first).toEqual(second);
    expect(first.status).toBe('success');
    expect(first.hotels).toHaveLength(3);
    expect(first.hotels.length).toBeLessThanOrEqual(10);
    expect(first.searchId).toMatch(/^hsearch_[a-f0-9]{32}$/);
    for (const hotel of first.hotels) {
      expect(demoHotelSchema.parse(hotel)).toEqual(hotel);
      expect(hotel.selectionId).toMatch(/^hsel_[a-f0-9]{32}$/);
      expect(hotel.dataSource).toBe('illustrative');
      expect(hotel.amenities.length).toBeLessThanOrEqual(6);
      expect(hotel.nights).toBe(3);
      expect(hotel.rooms).toBe(1);
      expect(hotel.staySubtotal.amount).toBe(hotel.nightlyPrice.amount * 3);
      expect(hotel.taxesAndFeesIncluded).toBe(false);
      expect(JSON.stringify(hotel)).not.toContain('fixtureKey');
    }
    expect(demoHotelSearchOutputSchema.parse(first)).toEqual(first);
    expect(searchSyntheticHotels({ ...searchInput, checkOutDate: '2030-04-24' }).searchId)
      .not.toBe(first.searchId);
  });

  it.each([
    ['Toronto', 2],
    ['YYZ', 2],
    ['Vancouver', 2],
    ['YVR', 2],
  ])('supports the fixed %s destination fixture set', (destination, expectedCount) => {
    const result = searchSyntheticHotels({ ...searchInput, destination });
    expect(result.status).toBe('success');
    expect(result.hotels).toHaveLength(expectedCount);
  });

  it('returns an honest empty result for an unsupported destination without inventing inventory', () => {
    const result = searchSyntheticHotels({ ...searchInput, destination: 'Banff' });

    expect(result).toMatchObject({
      status: 'empty',
      dataSource: 'illustrative',
      hotels: [],
    });
    expect(result.message).toContain('No synthetic stay fixtures');
    expect(result.fallback).toContain('No live hotel search was attempted');
  });

  it('creates bounded opaque selection records that validate as caller state', () => {
    const search = searchSyntheticHotels(searchInput);
    const records = hotelSelectionRecords(search);
    const state = {
      searchId: search.searchId,
      updatedAt: '2030-04-01T12:00:00Z',
      records,
      activeSelectionId: records[1]!.selectionId,
    };

    expect(records).toHaveLength(search.hotels.length);
    expect(demoHotelSelectionStateSchema.parse(state)).toEqual(state);
    expect(JSON.stringify(records)).not.toContain('provider');
    expect(JSON.stringify(records)).not.toContain('offerId');
  });

  it('returns only the fixed synthetic loyalty identity and bounded concept benefits', () => {
    const first = getSyntheticLoyaltyOverview();
    const second = getSyntheticLoyaltyOverview();

    expect(first).toEqual(second);
    expect(demoLoyaltyOverviewSchema.parse(first)).toEqual(first);
    expect(first).toMatchObject({
      status: 'success',
      dataSource: 'illustrative',
      member: {
        displayName: 'Preview traveler',
        reference: 'WAYFARE-PREVIEW-0001',
        tier: 'Explorer concept tier',
      },
    });
    expect(first.benefits.length).toBeGreaterThan(0);
    expect(first.benefits.length).toBeLessThanOrEqual(6);
    expect(JSON.stringify(first)).not.toContain('@');
  });

  it('returns deterministic illustrative reward-flight ideas within the supplied points budget', () => {
    const first = searchSyntheticRewardFlights(rewardSearchInput);
    const second = searchSyntheticRewardFlights(rewardSearchInput);

    expect(first).toEqual(second);
    expect(first.status).toBe('success');
    expect(first.options.length).toBeGreaterThanOrEqual(3);
    expect(first.options.length).toBeLessThanOrEqual(6);
    expect(first.searchContext).toEqual(rewardSearchInput);
    expect(first.pointsContext).toMatchObject({ available: 42_500 });
    for (const option of first.options) {
      expect(option.dataSource).toBe('illustrative');
      expect(option.optionId).toMatch(/^rwd_[a-f0-9]{32}$/);
      expect(option.totalPoints).toBeLessThanOrEqual(first.pointsContext.available);
      expect(option.balanceAfter).toBe(first.pointsContext.available - option.totalPoints);
      expect(option.estimatedTaxes.currency).toBe('CAD');
    }
    expect(demoRewardFlightSearchOutputSchema.parse(first)).toEqual(first);
  });

  it('tailors illustrative reward-flight ideas to a supplied route and returns honest empty output', () => {
    const routed = searchSyntheticRewardFlights({
      ...rewardSearchInput,
      destination: 'Lisbon',
      departureDate: '2030-04-20',
      pointsBudget: 25_000,
    });
    expect(routed.status).toBe('success');
    expect(routed.options.every((option) => option.route.destination === 'Lisbon')).toBe(true);
    expect(routed.options.every((option) => option.departureDate === '2030-04-20')).toBe(true);

    const empty = searchSyntheticRewardFlights({ ...rewardSearchInput, pointsBudget: 5_000 });
    expect(empty).toMatchObject({ status: 'empty', options: [] });
    expect(empty.fallback).toContain('No illustrative reward-flight option');
  });

  it('keeps live flight and synthetic stay prices separate in trip review', () => {
    const stay = hotelSelectionRecords(searchSyntheticHotels(searchInput))[0]!;
    const review = buildSyntheticTripReview({
      flight: {
        selectionId: 'sel_0123456789abcdef0123456789abcdef',
        originalTotal: 284.5,
        currency: 'CAD',
        expiresAt: '2030-04-01T12:15:00Z',
      },
      stay,
    });

    expect(demoTripReviewSchema.parse(review)).toEqual(review);
    expect(review).toMatchObject({
      status: 'ready',
      dataSource: 'illustrative',
      missing: [],
      flight: { dataSource: 'live_nuitee_selection' },
      stay: { dataSource: 'illustrative' },
    });
    const wire = JSON.stringify(review);
    expect(wire).not.toContain('packageTotal');
    expect(wire).not.toContain('combinedTotal');
    expect(wire).not.toContain('offerId');
  });

  it('returns an incomplete review when a server-owned selection is missing', () => {
    const review = buildSyntheticTripReview({});
    expect(review).toMatchObject({
      status: 'incomplete',
      missing: ['flight', 'stay'],
    });
    expect(review.flight).toBeUndefined();
    expect(review.stay).toBeUndefined();
  });

  it('rejects over-bounded hotel, state, loyalty, and review arrays', () => {
    const search = searchSyntheticHotels(searchInput);
    expect(demoHotelSearchOutputSchema.safeParse({
      ...search,
      hotels: Array.from({ length: 11 }, () => search.hotels[0]),
    }).success).toBe(false);
    expect(demoHotelSelectionStateSchema.safeParse({
      updatedAt: '2030-04-01T12:00:00Z',
      records: Array.from({ length: 11 }, () => hotelSelectionRecords(search)[0]),
    }).success).toBe(false);
    const loyalty = getSyntheticLoyaltyOverview();
    expect(demoLoyaltyOverviewSchema.safeParse({
      ...loyalty,
      benefits: Array.from({ length: 7 }, () => loyalty.benefits[0]),
    }).success).toBe(false);
    const incomplete = buildSyntheticTripReview({});
    expect(demoTripReviewSchema.safeParse({
      ...incomplete,
      missing: ['flight', 'stay', 'flight'],
    }).success).toBe(false);
  });

  it('contains no network, environment, credential, or real-customer data path', async () => {
    const source = await readFile(new URL('../src/demo-fixtures.ts', import.meta.url), 'utf8');
    const wire = JSON.stringify({
      hotels: searchSyntheticHotels(searchInput),
      loyalty: getSyntheticLoyaltyOverview(),
      rewardFlights: searchSyntheticRewardFlights(rewardSearchInput),
    });

    expect(source).not.toMatch(/\bfetch\s*\(/u);
    expect(source).not.toContain('process.env');
    expect(source).not.toContain('NUITEE_API_KEY');
    expect(source).not.toContain('ASSISTANT_MODEL_API_KEY');
    expect(source).not.toContain('X-API-Key');
    expect(wire).not.toMatch(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u);
    expect(wire).not.toContain('authorization');
    expect(wire).not.toContain('customerId');
    expect(wire).not.toContain('accountId');
  });

  it('maps synthetic search and opaque records inside the serialized compute boundary', () => {
    const gateway = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'search',
      search: searchInput,
      catalog: DEMO_HOTEL_CATALOG as unknown as Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>,
      aliases: DEMO_DESTINATION_ALIASES,
    }));

    expect(gateway.kind).toBe('search');
    expect(gateway.result).toMatchObject({
      status: 'success',
      dataSource: 'illustrative',
      searchContext: searchInput,
    });
    expect(gateway.records).toHaveLength(3);
    expect(JSON.stringify(gateway.result)).not.toContain('fixtureKey');
  });

  it('maps reward-flight comparisons inside the serialized compute boundary', () => {
    const gateway = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'reward_search',
      rewardSearch: rewardSearchInput,
      rewardCatalog: DEMO_REWARD_FLIGHT_CATALOG as unknown as readonly Readonly<Record<string, unknown>>[],
    }));

    expect(gateway.kind).toBe('reward_search');
    expect(gateway.rewardResult).toMatchObject({
      status: 'success',
      dataSource: 'illustrative',
      pointsContext: { available: 42_500 },
    });
    expect(gateway.rewardResult?.options.length).toBeGreaterThanOrEqual(3);
  });

  it('runs the serialized hotel search without a Date global', () => {
    const sandboxed = runInNewContext(
      `(${runDemoGateway.toString()})`,
      { Date: undefined },
    ) as typeof runDemoGateway;
    const gateway = demoGatewayOutputSchema.parse(sandboxed({
      kind: 'search',
      search: searchInput,
      catalog: DEMO_HOTEL_CATALOG as unknown as Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>,
      aliases: DEMO_DESTINATION_ALIASES,
    }));

    expect(gateway.result).toMatchObject({
      status: 'success',
      searchContext: searchInput,
    });
    expect(gateway.result?.hotels[0]).toMatchObject({ nights: 3 });
  });

  it('rejects stale hotel selections and reviews only active server-owned records', () => {
    const searched = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'search',
      search: searchInput,
      catalog: DEMO_HOTEL_CATALOG as unknown as Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>,
      aliases: DEMO_DESTINATION_ALIASES,
    }));
    const hotelState = {
      searchId: searched.result!.searchId,
      updatedAt: '2030-04-01T12:00:00Z',
      records: searched.records!,
    };
    const stale = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'select',
      selectionId: 'hsel_ffffffffffffffffffffffffffffffff',
      hotelState,
    }));
    expect(stale.selection).toMatchObject({ status: 'unavailable' });
    expect(stale.nextHotelState).toEqual(hotelState);

    const selectionId = searched.records![0]!.selectionId;
    const selected = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'select',
      selectionId,
      hotelState,
    }));
    expect(selected.selection).toMatchObject({ status: 'selected', selectionId });

    const review = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'review',
      flightState: {
        updatedAt: '2030-04-01T12:00:00Z',
        activeSelectionId: 'sel_0123456789abcdef0123456789abcdef',
        records: [{
          selectionId: 'sel_0123456789abcdef0123456789abcdef',
          offerId: 'private-upstream-offer',
          searchId: 'search_01',
          originalTotal: 284.5,
          currency: 'CAD',
        }],
      },
      hotelState: selected.nextHotelState!,
      loyalty: getSyntheticLoyaltyOverview(),
    }));
    expect(review.review).toMatchObject({
      status: 'ready',
      flight: { dataSource: 'live_nuitee_selection' },
      stay: { dataSource: 'illustrative' },
    });
    expect(JSON.stringify(review.review)).not.toContain('private-upstream-offer');
  });
});
