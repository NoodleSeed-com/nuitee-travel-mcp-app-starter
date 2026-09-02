import type {
  AssistantJsonValue,
  AssistantUIMessage,
} from '@noodleseed/assistant/client';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_TRIP,
  projectTrip,
} from '../src/lib/trip-projection';

function messageWithToolResult(
  tool: string,
  result: AssistantJsonValue,
): AssistantUIMessage {
  return {
    id: `assistant-${tool}`,
    role: 'assistant',
    parts: [{
      type: 'data-tool-result',
      data: { id: `call-${tool}`, tool, result },
    }],
  };
}

const validSearchContext = {
  origin: 'JFK',
  destination: 'LIS',
  departureDate: '2026-10-12',
  returnDate: '2026-10-18',
  adults: 2,
  children: 0,
  infants: 0,
} as const;

const flightSelectionA = 'sel_0123456789abcdef0123456789abcdef';
const flightSelectionB = 'sel_fedcba9876543210fedcba9876543210';
const staySelectionA = 'hsel_0123456789abcdef0123456789abcdef';
const staySelectionB = 'hsel_fedcba9876543210fedcba9876543210';

function flightOption(
  selectionId: string,
  carrierName = 'Cedar Skies',
  carrierCode = 'ZZ',
  total = 284.5,
) {
  return {
    selectionId,
    route: { origin: 'JFK', destination: 'LIS' },
    carrier: { name: carrierName, code: carrierCode },
    departureTime: '2026-10-12T09:00:00-04:00',
    price: { total, currency: 'CAD' },
    legs: [
      {
        direction: 'OUTBOUND',
        departureTime: '2026-10-12T09:00:00-04:00',
      },
      {
        direction: 'INBOUND',
        departureTime: '2026-10-18T11:20:00+01:00',
      },
    ],
  } as const;
}

function hotelOption(
  selectionId: string,
  name = 'Tagus Lantern Hotel',
  total = 1_800,
) {
  return {
    selectionId,
    dataSource: 'illustrative',
    name,
    city: 'Lisbon',
    nights: 6,
    staySubtotal: { amount: total, currency: 'CAD' },
  } as const;
}

describe('structured trip projection', () => {
  it('projects an accepted typed plan before the fare search runs', () => {
    expect(projectTrip([messageWithToolResult('plan_flight_search', {
      status: 'planned',
      message: 'Trip details are ready. Search current fares now.',
      origin: 'ISB',
      destination: 'NYC',
      departureDate: '2026-09-18',
      returnDate: '2026-09-27',
      adults: 1,
      cabinClass: 'ECONOMY',
      currency: 'USD',
      country: 'US',
      providerOfferId: 'must-not-project',
    })])).toEqual({
      phase: 'planned',
      origin: 'ISB',
      destination: 'NYC',
      departureDate: '2026-09-18',
      returnDate: '2026-09-27',
      travelers: '1 adult',
      cabinClass: 'Economy',
      currency: 'USD',
      country: 'US',
    });
  });

  it('ignores malformed typed plan fields instead of parsing around them', () => {
    expect(projectTrip([messageWithToolResult('plan_flight_search', {
      status: 'planned',
      origin: 'isb',
      destination: 'NYC',
      departureDate: '2026-09-18',
      adults: 1,
      cabinClass: 'ECONOMY',
      currency: 'USD',
      country: 'US',
    })])).toEqual(EMPTY_TRIP);
  });

  it('projects only validated search result fields', () => {
    expect(projectTrip([messageWithToolResult('search_flights', {
      status: 'success',
      searchId: 'search_private-provider-correlation',
      searchContext: {
        ...validSearchContext,
        providerOffer: { id: 'raw-provider-id' },
      },
      providerDebug: { requestId: 'request-private' },
    })])).toEqual({
      phase: 'comparing',
      origin: 'JFK',
      destination: 'LIS',
      departureDate: '2026-10-12',
      returnDate: '2026-10-18',
      travelers: '2 adults',
    });
  });

  it('does not parse route claims from assistant prose', () => {
    expect(projectTrip([{
      id: 'assistant-1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'JFK to LIS for 9 adults' }],
    }])).toEqual(EMPTY_TRIP);
  });

  it('does not supplement typed context with dates or markets from prose', () => {
    expect(projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: {
          origin: 'ISB',
          destination: 'FCO',
          departureDate: '2026-08-31',
          adults: 2,
          children: 0,
          infants: 0,
          cabinClass: 'ECONOMY',
        },
      }),
      {
        id: 'assistant-prose-only-details',
        role: 'assistant',
        parts: [{
          type: 'text',
          text: 'Return on 2026-09-07, priced in USD for the US market.',
        }],
      },
    ])).toEqual({
      phase: 'comparing',
      origin: 'ISB',
      destination: 'FCO',
      departureDate: '2026-08-31',
      travelers: '2 adults',
      cabinClass: 'Economy',
    });
  });

  it('projects a bounded live fare summary only after a correlated successful selection', () => {
    expect(projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
        providerOffer: { id: 'provider-private' },
      }),
    ])).toEqual({
      phase: 'selected',
      hasFlightSelection: true,
      origin: 'JFK',
      destination: 'LIS',
      departureDate: '2026-10-12',
      returnDate: '2026-10-18',
      travelers: '2 adults',
      selectedFlight: {
        dataSource: 'live_nuitee_selection',
        sourceLabel: 'Nuitee search fare',
        carrierName: 'Cedar Skies',
        carrierCode: 'ZZ',
        origin: 'JFK',
        destination: 'LIS',
        departureDate: '2026-10-12',
        returnDate: '2026-10-18',
        departureTime: '2026-10-12T09:00:00-04:00',
        returnDepartureTime: '2026-10-18T11:20:00+01:00',
        travelers: '2 adults',
        searchPrice: { total: 284.5, currency: 'CAD' },
        status: 'selected',
      },
    });
    expect(JSON.stringify(projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
    ]))).not.toContain(flightSelectionA);
  });

  it('projects a bounded illustrative stay summary only after a correlated selection', () => {
    expect(projectTrip([
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Lisbon',
          checkInDate: '2026-10-12',
          checkOutDate: '2026-10-18',
        },
        hotels: [hotelOption(staySelectionA)],
      }),
      messageWithToolResult('select_hotel', {
        status: 'selected',
        selectionId: staySelectionA,
      }),
    ])).toEqual({
      phase: 'stay-selected',
      hasStaySelection: true,
      focus: 'stays',
      stayDestination: 'Lisbon',
      checkInDate: '2026-10-12',
      checkOutDate: '2026-10-18',
      selectedStay: {
        dataSource: 'illustrative',
        sourceLabel: 'Illustrative stay',
        propertyName: 'Tagus Lantern Hotel',
        destination: 'Lisbon',
        checkInDate: '2026-10-12',
        checkOutDate: '2026-10-18',
        nights: 6,
        subtotal: { total: 1_800, currency: 'CAD' },
        status: 'selected',
      },
    });
  });

  it('updates the matching selected fare with a bounded verified current price', () => {
    expect(projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      messageWithToolResult('verify_flight_offer', {
        status: 'success',
        verification: {
          status: 'success',
          availability: 'available',
          selectionId: flightSelectionA,
          currentPrice: { total: 291.25, currency: 'CAD' },
          provider: { offerId: 'provider-private' },
        },
      }),
    ])).toEqual({
      phase: 'verified',
      hasFlightSelection: true,
      origin: 'JFK',
      destination: 'LIS',
      departureDate: '2026-10-12',
      returnDate: '2026-10-18',
      travelers: '2 adults',
      selectedFlight: expect.objectContaining({
        dataSource: 'live_nuitee_selection',
        sourceLabel: 'Verified Nuitee fare',
        carrierName: 'Cedar Skies',
        searchPrice: { total: 284.5, currency: 'CAD' },
        currentPrice: { total: 291.25, currency: 'CAD' },
        status: 'verified',
      }),
    });
  });

  it('downgrades a verified fare when a later verification fails', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      messageWithToolResult('verify_flight_offer', {
        status: 'success',
        verification: {
          status: 'success',
          availability: 'available',
          selectionId: flightSelectionA,
          currentPrice: { total: 291.25, currency: 'CAD' },
        },
      }),
      messageWithToolResult('verify_flight_offer', { status: 'error' }),
    ]);

    expect(projected).toMatchObject({
      phase: 'error',
      hasFlightSelection: true,
      selectedFlight: {
        sourceLabel: 'Nuitee search fare',
        status: 'selected',
        searchPrice: { total: 284.5, currency: 'CAD' },
      },
    });
    expect(projected.selectedFlight).not.toHaveProperty('currentPrice');
  });

  it('does not manufacture a selected fare from verification without a select result', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('verify_flight_offer', {
        status: 'success',
        verification: {
          status: 'success',
          availability: 'available',
          selectionId: flightSelectionA,
          currentPrice: { total: 291.25, currency: 'CAD' },
        },
      }),
    ]);

    expect(projected.phase).toBe('comparing');
    expect(projected).not.toHaveProperty('hasFlightSelection');
    expect(projected).not.toHaveProperty('selectedFlight');
  });

  it('replaces a fare selection only when the later opaque id resolves in the current search', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [
          flightOption(flightSelectionA),
          flightOption(flightSelectionB, 'Northstar Air', 'NS', 336),
        ],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionB,
      }),
    ]);

    expect(projected.selectedFlight).toMatchObject({
      carrierName: 'Northstar Air',
      carrierCode: 'NS',
      searchPrice: { total: 336, currency: 'CAD' },
      status: 'selected',
    });
    expect(JSON.stringify(projected)).not.toContain(flightSelectionA);
    expect(JSON.stringify(projected)).not.toContain(flightSelectionB);
  });

  it('invalidates a prior fare selection and its private correlation on a new search', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: {
          origin: 'SFO',
          destination: 'NRT',
          departureDate: '2026-12-01',
          adults: 1,
          children: 0,
          infants: 0,
        },
        itineraries: [],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
    ]);

    expect(projected).toMatchObject({
      phase: 'comparing',
      origin: 'SFO',
      destination: 'NRT',
      travelers: '1 adult',
    });
    expect(projected).not.toHaveProperty('hasFlightSelection');
    expect(projected).not.toHaveProperty('selectedFlight');
  });

  it('fails closed and clears a stale selection when a new search result is malformed', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: {
          ...validSearchContext,
          destination: 'lis',
        },
        itineraries: [flightOption(flightSelectionA)],
      }),
    ]);

    expect(projected.phase).toBe('comparing');
    expect(projected).not.toHaveProperty('hasFlightSelection');
    expect(projected).not.toHaveProperty('selectedFlight');
  });

  it('rolls back unavailable, unknown, and malformed fare selections', () => {
    const base = [
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
    ] as const;
    const expected = projectTrip(base);

    expect(projectTrip([
      ...base,
      messageWithToolResult('select_flight_offer', {
        status: 'unavailable',
        selectionId: flightSelectionB,
      }),
    ])).toEqual(expected);
    expect(projectTrip([
      ...base,
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionB,
      }),
    ])).toEqual(expected);
    expect(projectTrip([
      ...base,
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: 'provider-offer-id',
      }),
    ])).toEqual(expected);
  });

  it('does not verify a stale selection or accept malformed current-price data', () => {
    const base = [
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
    ] as const;
    const expected = projectTrip(base);
    const verification = (selectionId: string, currentPrice: AssistantJsonValue) =>
      messageWithToolResult('verify_flight_offer', {
        status: 'success',
        verification: {
          status: 'success',
          availability: 'available',
          selectionId,
          currentPrice,
        },
      });

    expect(projectTrip([
      ...base,
      verification(flightSelectionB, { total: 299, currency: 'CAD' }),
    ])).toEqual(expected);
    expect(projectTrip([
      ...base,
      verification(flightSelectionA, { total: -1, currency: 'CAD' }),
    ])).toEqual(expected);
  });

  it('replaces and resets illustrative stays without combining their subtotal with a fare', () => {
    const flightSearch = messageWithToolResult('search_flights', {
      status: 'success',
      searchContext: validSearchContext,
      itineraries: [flightOption(flightSelectionA)],
    });
    const hotelSearch = messageWithToolResult('search_hotels', {
      status: 'success',
      dataSource: 'illustrative',
      searchContext: {
        destination: 'Lisbon',
        checkInDate: '2026-10-12',
        checkOutDate: '2026-10-18',
      },
      hotels: [
        hotelOption(staySelectionA),
        hotelOption(staySelectionB, 'Azure Quay House', 2_040),
      ],
    });
    const selected = projectTrip([
      flightSearch,
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      hotelSearch,
      messageWithToolResult('select_hotel', {
        status: 'selected',
        selectionId: staySelectionA,
      }),
      messageWithToolResult('select_hotel', {
        status: 'selected',
        selectionId: staySelectionB,
      }),
    ]);

    expect(selected.selectedStay).toMatchObject({
      dataSource: 'illustrative',
      sourceLabel: 'Illustrative stay',
      propertyName: 'Azure Quay House',
      subtotal: { total: 2_040, currency: 'CAD' },
    });
    expect(selected.selectedFlight?.sourceLabel).toBe('Nuitee search fare');
    expect(selected).not.toHaveProperty('combinedTotal');
    expect(selected).not.toHaveProperty('estimatedTotal');

    const reset = projectTrip([
      flightSearch,
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      hotelSearch,
      messageWithToolResult('select_hotel', {
        status: 'selected',
        selectionId: staySelectionA,
      }),
      messageWithToolResult('search_hotels', {
        status: 'empty',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Porto',
          checkInDate: '2026-11-01',
          checkOutDate: '2026-11-04',
        },
        hotels: [],
      }),
      messageWithToolResult('select_hotel', {
        status: 'selected',
        selectionId: staySelectionA,
      }),
    ]);
    expect(reset.selectedFlight).toBeUndefined();
    expect(reset).not.toHaveProperty('hasStaySelection');
    expect(reset).not.toHaveProperty('selectedStay');
    expect(reset).toMatchObject({ stayDestination: 'Porto' });
  });

  it('keeps the current stay when a replacement selection fails or is unknown', () => {
    const base = [
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Lisbon',
          checkInDate: '2026-10-12',
          checkOutDate: '2026-10-18',
        },
        hotels: [hotelOption(staySelectionA)],
      }),
      messageWithToolResult('select_hotel', {
        status: 'selected',
        selectionId: staySelectionA,
      }),
    ] as const;
    const expected = projectTrip(base);

    expect(projectTrip([
      ...base,
      messageWithToolResult('select_hotel', {
        status: 'unavailable',
        selectionId: staySelectionB,
      }),
    ])).toEqual(expected);
    expect(projectTrip([
      ...base,
      messageWithToolResult('select_hotel', {
        status: 'selected',
        selectionId: staySelectionB,
      }),
    ])).toEqual(expected);
  });

  it('ignores malformed search records and never exposes their opaque ids or prices', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [{
          ...flightOption(flightSelectionA),
          carrier: { name: 'Cedar Skies', code: '<script>' },
          price: { total: 99_999_999_999, currency: 'CAD' },
        }],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Lisbon',
          checkInDate: '2026-10-12',
          checkOutDate: '2026-10-18',
        },
        hotels: [{
          ...hotelOption(staySelectionA),
          nights: 4,
          staySubtotal: { amount: Number.POSITIVE_INFINITY, currency: 'CAD' },
        }],
      }),
      messageWithToolResult('select_hotel', {
        status: 'selected',
        selectionId: staySelectionA,
      }),
    ]);

    expect(projected).not.toHaveProperty('selectedFlight');
    expect(projected).not.toHaveProperty('selectedStay');
    expect(JSON.stringify(projected)).not.toContain('script');
    expect(JSON.stringify(projected)).not.toContain(flightSelectionA);
    expect(JSON.stringify(projected)).not.toContain(staySelectionA);
  });

  it('accepts a bounded partial search and pluralizes every traveler group', () => {
    expect(projectTrip([messageWithToolResult('search_flights', {
      status: 'partial',
      searchContext: {
        origin: 'LHR',
        destination: 'DXB',
        departureDate: '2026-11-02',
        adults: 1,
        children: 2,
        infants: 1,
      },
    })])).toEqual({
      phase: 'comparing',
      origin: 'LHR',
      destination: 'DXB',
      departureDate: '2026-11-02',
      travelers: '1 adult, 2 children, 1 infant',
    });
  });

  it.each([
    ['lowercase IATA', { origin: 'jfk' }],
    ['long IATA', { destination: 'LISB' }],
    ['impossible date', { departureDate: '2026-02-31' }],
    ['loose date', { departureDate: '2026-2-3' }],
    ['zero adults', { adults: 0 }],
    ['too many children', { children: 9 }],
    ['too many infants', { infants: 10 }],
    ['fractional traveler count', { adults: 1.5 }],
  ])('ignores a search with malformed %s', (_name, replacement) => {
    expect(projectTrip([messageWithToolResult('search_flights', {
      status: 'success',
      searchContext: { ...validSearchContext, ...replacement },
    })])).toEqual(EMPTY_TRIP);
  });

  it('lets a later valid search replace the previous trip context', () => {
    expect(projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
      }),
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: {
          origin: 'SFO',
          destination: 'NRT',
          departureDate: '2026-12-01',
          adults: 1,
          children: 0,
          infants: 0,
        },
      }),
    ])).toEqual({
      phase: 'comparing',
      origin: 'SFO',
      destination: 'NRT',
      departureDate: '2026-12-01',
      travelers: '1 adult',
    });
  });

  it('replaces an old route with a later validated empty search context', () => {
    expect(projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
      }),
      messageWithToolResult('search_flights', {
        status: 'empty',
        searchId: 'search_private-new-route',
        searchContext: {
          origin: 'SFO',
          destination: 'NRT',
          departureDate: '2026-12-01',
          adults: 1,
          children: 0,
          infants: 0,
        },
        itineraries: [],
      }),
    ])).toEqual({
      phase: 'no-results',
      origin: 'SFO',
      destination: 'NRT',
      departureDate: '2026-12-01',
      travelers: '1 adult',
    });
  });

  it('does not replace prior context with malformed fields from an empty search', () => {
    expect(projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
      }),
      messageWithToolResult('search_flights', {
        status: 'empty',
        searchContext: {
          origin: 'sfo',
          destination: 'NRT',
          departureDate: '2026-12-01',
          adults: 1,
          children: 0,
          infants: 0,
        },
      }),
    ])).toMatchObject({
      phase: 'comparing',
      origin: 'JFK',
      destination: 'LIS',
    });
  });

  it('retains only prior valid context when a later structured result errors', () => {
    expect(projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
      }),
      messageWithToolResult('verify_flight_offer', {
        status: 'error',
        searchContext: {
          origin: 'SFO',
          destination: 'NRT',
          departureDate: '2027-01-01',
          adults: 9,
          children: 0,
          infants: 0,
        },
        provider: { route: 'private-provider-route' },
      }),
    ])).toEqual({
      phase: 'error',
      origin: 'JFK',
      destination: 'LIS',
      departureDate: '2026-10-12',
      returnDate: '2026-10-18',
      travelers: '2 adults',
    });
  });

  it('uses a transient phase only for the returned projection', () => {
    const messages = [messageWithToolResult('search_flights', {
      status: 'success',
      searchContext: validSearchContext,
    })];

    expect(projectTrip(messages, 'verifying')).toMatchObject({
      phase: 'verifying',
      origin: 'JFK',
      destination: 'LIS',
    });
    expect(projectTrip(messages)).toMatchObject({ phase: 'comparing' });
  });

  it('keeps live flight context while focusing the same conversation on synthetic stays', () => {
    expect(projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
      }),
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Lisbon',
          checkInDate: '2026-10-12',
          checkOutDate: '2026-10-18',
        },
        internalFixtureKey: 'must-not-project',
      }),
    ])).toEqual({
      phase: 'comparing-stays',
      origin: 'JFK',
      destination: 'LIS',
      departureDate: '2026-10-12',
      returnDate: '2026-10-18',
      travelers: '2 adults',
      focus: 'stays',
      stayDestination: 'Lisbon',
      checkInDate: '2026-10-12',
      checkOutDate: '2026-10-18',
    });
  });

  it('preserves same-trip flight, rewards, and protection context across a hotel search', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('open_loyalty', {
        status: 'success',
        dataSource: 'illustrative',
      }),
      messageWithToolResult('compare_travel_insurance', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Portugal',
          departureDate: '2026-10-12',
          returnDate: '2026-10-18',
          adults: 2,
          children: 0,
          residenceCountry: 'CA',
          currency: 'CAD',
        },
      }),
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Lisbon',
          checkInDate: '2026-10-13',
          checkOutDate: '2026-10-18',
        },
        hotels: [],
      }),
    ], undefined, [{
      tool: 'select_flight_offer',
      result: { status: 'selected', selectionId: flightSelectionA },
    }]);

    expect(projected).toMatchObject({
      hasFlightSelection: true,
      hasRewardsReview: true,
      hasInsuranceComparison: true,
      origin: 'JFK',
      destination: 'LIS',
      stayDestination: 'Lisbon',
      protectionDestination: 'Portugal',
      selectedFlight: { carrierName: 'Cedar Skies' },
    });
  });

  it('clears stale flight, rewards, and protection context for an unrelated hotel search', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      messageWithToolResult('open_loyalty', {
        status: 'success',
        dataSource: 'illustrative',
      }),
      messageWithToolResult('compare_travel_insurance', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Portugal',
          departureDate: '2026-10-12',
          returnDate: '2026-10-18',
          adults: 2,
          children: 0,
          residenceCountry: 'CA',
          currency: 'CAD',
        },
      }),
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Tokyo',
          checkInDate: '2026-12-02',
          checkOutDate: '2026-12-06',
        },
        hotels: [],
      }),
    ], undefined, [{
      tool: 'select_flight_offer',
      result: { status: 'selected', selectionId: flightSelectionA },
    }]);

    expect(projected).toEqual({
      phase: 'comparing-stays',
      focus: 'stays',
      stayDestination: 'Tokyo',
      checkInDate: '2026-12-02',
      checkOutDate: '2026-12-06',
    });
  });

  it('preserves same-trip flight, stay, and rewards context for insurance comparison', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Lisbon',
          checkInDate: '2026-10-12',
          checkOutDate: '2026-10-18',
        },
        hotels: [hotelOption(staySelectionA)],
      }),
      messageWithToolResult('select_hotel', {
        status: 'selected',
        selectionId: staySelectionA,
      }),
      messageWithToolResult('open_loyalty', {
        status: 'success',
        dataSource: 'illustrative',
      }),
      messageWithToolResult('compare_travel_insurance', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Portugal',
          departureDate: '2026-10-12',
          returnDate: '2026-10-18',
          adults: 2,
          children: 0,
          residenceCountry: 'CA',
          currency: 'CAD',
        },
      }),
    ]);

    expect(projected).toMatchObject({
      phase: 'insurance',
      focus: 'insurance',
      hasFlightSelection: true,
      hasStaySelection: true,
      hasRewardsReview: true,
      hasInsuranceComparison: true,
      selectedFlight: { carrierName: 'Cedar Skies' },
      selectedStay: { propertyName: 'Tagus Lantern Hotel' },
      protectionDestination: 'Portugal',
    });
  });

  it('clears stale flight, stay, and rewards context for an unrelated insurance comparison', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Lisbon',
          checkInDate: '2026-10-12',
          checkOutDate: '2026-10-18',
        },
        hotels: [hotelOption(staySelectionA)],
      }),
      messageWithToolResult('select_hotel', {
        status: 'selected',
        selectionId: staySelectionA,
      }),
      messageWithToolResult('open_loyalty', {
        status: 'success',
        dataSource: 'illustrative',
      }),
      messageWithToolResult('compare_travel_insurance', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Japan',
          departureDate: '2026-12-01',
          returnDate: '2026-12-08',
          adults: 1,
          children: 0,
          residenceCountry: 'CA',
          currency: 'JPY',
        },
      }),
    ], undefined, [
      {
        tool: 'select_flight_offer',
        result: { status: 'selected', selectionId: flightSelectionA },
      },
      {
        tool: 'select_hotel',
        result: { status: 'selected', selectionId: staySelectionA },
      },
    ]);

    expect(projected).toEqual({
      phase: 'insurance',
      focus: 'insurance',
      hasInsuranceComparison: true,
      protectionDestination: 'Japan',
      departureDate: '2026-12-01',
      returnDate: '2026-12-08',
      travelers: '1 adult',
      currency: 'JPY',
      country: 'CA',
    });
  });

  it('keeps a selected one-way flight when the same-trip stay starts the next day', () => {
    const oneWayOption = {
      ...flightOption(flightSelectionA),
      legs: [{
        direction: 'OUTBOUND',
        departureTime: '2026-10-12T09:00:00-04:00',
      }],
    };
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: {
          origin: 'JFK',
          destination: 'LIS',
          departureDate: '2026-10-12',
          adults: 2,
          children: 0,
          infants: 0,
        },
        itineraries: [oneWayOption],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Lisbon',
          checkInDate: '2026-10-13',
          checkOutDate: '2026-10-18',
        },
        hotels: [],
      }),
    ]);

    expect(projected).toMatchObject({
      phase: 'comparing-stays',
      hasFlightSelection: true,
      origin: 'JFK',
      destination: 'LIS',
      departureDate: '2026-10-12',
      stayDestination: 'Lisbon',
      checkInDate: '2026-10-13',
      selectedFlight: { carrierName: 'Cedar Skies' },
    });
  });

  it('clears a selected flight when a same-date hotel search targets another city', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: {
          origin: 'JFK',
          destination: 'LIS',
          departureDate: '2026-10-12',
          adults: 2,
          children: 0,
          infants: 0,
        },
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Tokyo',
          checkInDate: '2026-10-13',
          checkOutDate: '2026-10-18',
        },
        hotels: [],
      }),
    ]);

    expect(projected).toEqual({
      phase: 'comparing-stays',
      focus: 'stays',
      stayDestination: 'Tokyo',
      checkInDate: '2026-10-13',
      checkOutDate: '2026-10-18',
    });
  });

  it('keeps a selected next-day stay when a one-way flight has an exact destination correlation', () => {
    const projected = projectTrip([
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'LIS',
          checkInDate: '2026-10-13',
          checkOutDate: '2026-10-18',
        },
        hotels: [{
          ...hotelOption(staySelectionA),
          nights: 5,
        }],
      }),
      messageWithToolResult('select_hotel', {
        status: 'selected',
        selectionId: staySelectionA,
      }),
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: {
          origin: 'JFK',
          destination: 'LIS',
          departureDate: '2026-10-12',
          adults: 2,
          children: 0,
          infants: 0,
        },
        itineraries: [],
      }),
    ]);

    expect(projected).toMatchObject({
      phase: 'comparing',
      origin: 'JFK',
      destination: 'LIS',
      departureDate: '2026-10-12',
      stayDestination: 'LIS',
      checkInDate: '2026-10-13',
      hasStaySelection: true,
      selectedStay: { propertyName: 'Tagus Lantern Hotel' },
    });
  });

  it.each([
    ['starts before departure', '2026-10-11', '2026-10-17'],
    ['ends after return', '2026-10-13', '2026-10-19'],
  ])('clears a round-trip flight when a hotel stay %s', (_case, checkInDate, checkOutDate) => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: flightSelectionA,
      }),
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Lisbon',
          checkInDate,
          checkOutDate,
        },
        hotels: [],
      }),
    ]);

    expect(projected).toEqual({
      phase: 'comparing-stays',
      focus: 'stays',
      stayDestination: 'Lisbon',
      checkInDate,
      checkOutDate,
    });
  });

  it('interleaves a direct App selection before its later transcript verification', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('verify_flight_offer', {
        status: 'success',
        verification: {
          status: 'success',
          availability: 'available',
          selectionId: flightSelectionA,
          currentPrice: { total: 291.25, currency: 'CAD' },
        },
      }),
    ], undefined, [{
      afterTranscriptResultCount: 1,
      tool: 'select_flight_offer',
      result: { status: 'selected', selectionId: flightSelectionA },
    }]);

    expect(projected).toMatchObject({
      phase: 'verified',
      hasFlightSelection: true,
      selectedFlight: {
        sourceLabel: 'Verified Nuitee fare',
        status: 'verified',
        currentPrice: { total: 291.25, currency: 'CAD' },
      },
    });
  });

  it('keeps later insurance focus after an earlier direct App selection', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('compare_travel_insurance', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Portugal',
          departureDate: '2026-10-12',
          returnDate: '2026-10-18',
          adults: 2,
          children: 0,
          residenceCountry: 'CA',
          currency: 'CAD',
        },
      }),
    ], undefined, [{
      afterTranscriptResultCount: 1,
      tool: 'select_flight_offer',
      result: { status: 'selected', selectionId: flightSelectionA },
    }]);

    expect(projected).toMatchObject({
      phase: 'insurance',
      focus: 'insurance',
      hasFlightSelection: true,
      hasInsuranceComparison: true,
    });
  });

  it('keeps later stay focus after an earlier direct App selection', () => {
    const projected = projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
        itineraries: [flightOption(flightSelectionA)],
      }),
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Lisbon',
          checkInDate: '2026-10-13',
          checkOutDate: '2026-10-18',
        },
        hotels: [],
      }),
    ], undefined, [{
      afterTranscriptResultCount: 1,
      tool: 'select_flight_offer',
      result: { status: 'selected', selectionId: flightSelectionA },
    }]);

    expect(projected).toMatchObject({
      phase: 'comparing-stays',
      focus: 'stays',
      hasFlightSelection: true,
      stayDestination: 'Lisbon',
    });
  });

  it('fails closed when a flight search follows an uncorrelated hotel-only trip', () => {
    const projected = projectTrip([
      messageWithToolResult('search_hotels', {
        status: 'success',
        dataSource: 'illustrative',
        searchContext: {
          destination: 'Lisbon',
          checkInDate: '2026-10-12',
          checkOutDate: '2026-10-18',
        },
        hotels: [hotelOption(staySelectionA)],
      }),
      messageWithToolResult('select_hotel', {
        status: 'selected',
        selectionId: staySelectionA,
      }),
      messageWithToolResult('open_loyalty', {
        status: 'success',
        dataSource: 'illustrative',
      }),
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: {
          origin: 'YYZ',
          destination: 'NRT',
          departureDate: '2026-10-12',
          returnDate: '2026-10-18',
          adults: 2,
          children: 0,
          infants: 0,
        },
        itineraries: [],
      }),
    ], undefined, [{
      tool: 'select_hotel',
      result: { status: 'selected', selectionId: staySelectionA },
    }]);

    expect(projected).toEqual({
      phase: 'comparing',
      origin: 'YYZ',
      destination: 'NRT',
      departureDate: '2026-10-12',
      returnDate: '2026-10-18',
      travelers: '2 adults',
    });
  });

  it('projects only synthetic loyalty and review status, never member or price data', () => {
    const projected = projectTrip([
      messageWithToolResult('open_loyalty', {
        status: 'success',
        dataSource: 'illustrative',
        member: { reference: 'private-value' },
      }),
      messageWithToolResult('review_trip', {
        status: 'ready',
        dataSource: 'illustrative',
        flight: { searchPrice: { total: 999 } },
      }),
    ]);

    expect(projected).toEqual({
      phase: 'trip-review',
      focus: 'trip',
      hasRewardsReview: true,
    });
    expect(JSON.stringify(projected)).not.toContain('private-value');
    expect(JSON.stringify(projected)).not.toContain('999');
  });

  it('projects safe illustrative insurance context without opaque ids or plan prices', () => {
    const projected = projectTrip([messageWithToolResult('compare_travel_insurance', {
      status: 'success',
      dataSource: 'illustrative',
      comparisonId: 'inscmp_private_opaque',
      searchContext: {
        destination: 'Portugal',
        departureDate: '2026-10-12',
        returnDate: '2026-10-18',
        adults: 2,
        children: 0,
        residenceCountry: 'CA',
        currency: 'CAD',
      },
      plans: [{ illustrativePrice: { amount: 999, currency: 'CAD' } }],
    })]);

    expect(projected).toEqual({
      phase: 'insurance',
      focus: 'insurance',
      hasInsuranceComparison: true,
      protectionDestination: 'Portugal',
      departureDate: '2026-10-12',
      returnDate: '2026-10-18',
      travelers: '2 adults',
      currency: 'CAD',
      country: 'CA',
    });
    expect(JSON.stringify(projected)).not.toContain('private_opaque');
    expect(JSON.stringify(projected)).not.toContain('999');
  });

  it('ignores malformed demo hotel context', () => {
    expect(projectTrip([messageWithToolResult('search_hotels', {
      status: 'success',
      dataSource: 'illustrative',
      searchContext: {
        destination: 'Lisbon',
        checkInDate: '2026-10-18',
        checkOutDate: '2026-10-12',
      },
    })])).toEqual(EMPTY_TRIP);
  });
});
