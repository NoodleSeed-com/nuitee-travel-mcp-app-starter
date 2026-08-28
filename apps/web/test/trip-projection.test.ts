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

  it('sets selected after a successful selection without projecting its id', () => {
    expect(projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
      }),
      messageWithToolResult('select_flight_offer', {
        status: 'selected',
        selectionId: 'sel_0123456789abcdef0123456789abcdef',
        providerOffer: { id: 'provider-private' },
      }),
    ])).toEqual({
      phase: 'selected',
      origin: 'JFK',
      destination: 'LIS',
      departureDate: '2026-10-12',
      returnDate: '2026-10-18',
      travelers: '2 adults',
    });
  });

  it('sets verified after a successful verification without erasing the route', () => {
    expect(projectTrip([
      messageWithToolResult('search_flights', {
        status: 'success',
        searchContext: validSearchContext,
      }),
      messageWithToolResult('verify_flight_offer', {
        status: 'success',
        verification: {
          status: 'success',
          availability: 'available',
          selectionId: 'sel_0123456789abcdef0123456789abcdef',
          provider: { offerId: 'provider-private' },
        },
      }),
    ])).toEqual({
      phase: 'verified',
      origin: 'JFK',
      destination: 'LIS',
      departureDate: '2026-10-12',
      returnDate: '2026-10-18',
      travelers: '2 adults',
    });
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
});
