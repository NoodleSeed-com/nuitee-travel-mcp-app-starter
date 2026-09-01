import { annotations, tool, z } from '@noodleseed/one';
import {
  DEMO_DESTINATION_ALIASES,
  DEMO_HOTEL_CATALOG,
  DEMO_REWARD_FLIGHT_CATALOG,
  getSyntheticLoyaltyOverview,
} from './demo-fixtures.js';
import {
  demoHotelSearchInputSchema,
  demoHotelSearchOutputSchema,
  demoLoyaltyOverviewSchema,
  demoRewardFlightSearchInputSchema,
  demoRewardFlightSearchOutputSchema,
  demoSelectHotelOutputSchema,
  demoTripReviewSchema,
} from './demo-schemas.js';
import { demoHotelSelectionIdSchema } from './demo-schemas.js';

interface DemoViewPolicies {
  readonly hotel: Readonly<Record<string, unknown>>;
  readonly loyalty: Readonly<Record<string, unknown>>;
}

function searchDemoHotels(viewPolicy: Readonly<Record<string, unknown>>) {
  return tool('search_hotels', {
    title: 'Compare hotels',
    description:
      'Compare deterministic illustrative hotel options for Wayfare. This never checks live hotel availability and cannot reserve or book. Use a city name or supported metro/IATA code with exact stay dates.',
    annotations: annotations.readOnly(),
    input: demoHotelSearchInputSchema,
    output: demoHotelSearchOutputSchema,
    fulfil: ({ input, context, connectors }) => {
      const gateway = connectors.demo.execute({
        kind: 'search',
        search: input,
        catalog: DEMO_HOTEL_CATALOG,
        aliases: DEMO_DESTINATION_ALIASES,
      });
      const current = connectors.state.readState({ handle: 'demo_hotel_selections' });
      connectors.state.patchState({
        handle: 'demo_hotel_selections',
        expectedRevision: current.revision,
        value: {
          searchId: gateway.result.searchId,
          updatedAt: context.temporal.instant,
          records: gateway.records,
        },
      });
      return {
        status: gateway.result.status,
        dataSource: gateway.result.dataSource,
        disclosure: gateway.result.disclosure,
        message: gateway.result.message,
        fallback: gateway.result.fallback,
        searchId: gateway.result.searchId,
        searchContext: gateway.result.searchContext,
        hotels: gateway.result.hotels,
      };
    },
    viewTitle: 'Hotel results',
    viewDescription: 'Bounded illustrative stay comparisons with clear source information.',
    invoking: 'Finding stays…',
    invoked: 'Stay comparison ready',
    view: { component: 'hotel-results', entry: './views/hotel-results.tsx' },
    ...viewPolicy,
  });
}

function openDemoLoyalty(viewPolicy: Readonly<Record<string, unknown>>) {
  return tool('open_loyalty', {
    title: 'Open rewards',
    description:
      'Open the fixed synthetic Wayfare rewards concept. It accesses no real member account and cannot earn, transfer, apply, or redeem points.',
    annotations: annotations.readOnly(),
    input: z.object({}),
    output: demoLoyaltyOverviewSchema,
    fulfil: () => getSyntheticLoyaltyOverview(),
    viewTitle: 'Illustrative rewards',
    viewDescription: 'Synthetic loyalty balance, tier, benefits, and progress with no account action.',
    invoking: 'Opening illustrative rewards…',
    invoked: 'Illustrative rewards ready',
    view: { component: 'loyalty-overview', entry: './views/loyalty-overview.tsx' },
    ...viewPolicy,
  });
}

function compareDemoRewardFlights(viewPolicy: Readonly<Record<string, unknown>>) {
  return tool('compare_reward_flights', {
    title: 'Compare reward flights',
    description:
      'Immediately compare bounded illustrative reward-flight ideas when a traveler asks for flights with points, flights they could book with points, reward flights, or what the displayed points could cover. A route and date are optional; omitted values produce flexible illustrative ideas from Toronto. Do not refuse solely because actual booking is unavailable. This never checks live reward inventory and cannot book, apply, or redeem points.',
    annotations: annotations.readOnly(),
    input: demoRewardFlightSearchInputSchema,
    output: demoRewardFlightSearchOutputSchema,
    fulfil: ({ input, connectors }) => {
      const gateway = connectors.demo.execute({
        kind: 'reward_search',
        rewardSearch: input,
        rewardCatalog: DEMO_REWARD_FLIGHT_CATALOG,
      });
      return {
        status: gateway.rewardResult.status,
        dataSource: gateway.rewardResult.dataSource,
        disclosure: gateway.rewardResult.disclosure,
        message: gateway.rewardResult.message,
        fallback: gateway.rewardResult.fallback,
        searchId: gateway.rewardResult.searchId,
        searchContext: gateway.rewardResult.searchContext,
        pointsContext: gateway.rewardResult.pointsContext,
        options: gateway.rewardResult.options,
      };
    },
    viewTitle: 'Illustrative reward flights',
    viewDescription: 'Bounded points comparisons with estimated taxes and no redemption action.',
    invoking: 'Comparing illustrative reward flights…',
    invoked: 'Reward-flight comparison ready',
    view: { component: 'reward-flight-results', entry: './views/reward-flight-results.tsx' },
    ...viewPolicy,
  });
}

function reviewDemoTrip(viewPolicy: Readonly<Record<string, unknown>>) {
  return tool('review_trip', {
    title: 'Review selected trip',
    description:
      'Review the active application-selected flight and synthetic stay with illustrative rewards context. Reads server-owned opaque selections only; it never accepts copied prices or identifiers and cannot book, pay, or redeem.',
    annotations: annotations.readOnly(),
    input: z.object({}),
    output: demoTripReviewSchema,
    fulfil: ({ connectors }) => {
      const flights = connectors.state.readState({ handle: 'flight_selections' }).value;
      const hotels = connectors.state.readState({ handle: 'demo_hotel_selections' }).value;
      const gateway = connectors.demo.execute({
        kind: 'review',
        flightState: flights,
        hotelState: hotels,
        loyalty: getSyntheticLoyaltyOverview(),
      });
      return {
        status: gateway.review.status,
        dataSource: gateway.review.dataSource,
        disclosure: gateway.review.disclosure,
        fallback: gateway.review.fallback,
        flight: gateway.review.flight,
        stay: gateway.review.stay,
        loyalty: gateway.review.loyalty,
        missing: gateway.review.missing,
      };
    },
    viewTitle: 'Trip and rewards review',
    viewDescription: 'Separate live-flight and synthetic-stay provenance with illustrative rewards.',
    invoking: 'Reviewing selected travel…',
    invoked: 'Trip review ready',
    view: { component: 'loyalty-overview', entry: './views/loyalty-overview.tsx' },
    ...viewPolicy,
  });
}

function selectDemoHotel() {
  return tool('select_hotel', {
    title: 'Remember selected stay',
    visibility: ['app'],
    description:
      'Remember the opaque illustrative stay selected inside the hotel widget for a later trip review.',
    // This only updates short-lived caller-scoped widget state; it does not
    // create a booking, hold inventory, or perform an external side effect.
    annotations: annotations.readOnly(),
    input: z.object({ selectionId: demoHotelSelectionIdSchema }),
    output: demoSelectHotelOutputSchema,
    fulfil: ({ input, connectors }) => {
      const current = connectors.state.readState({ handle: 'demo_hotel_selections' });
      const gateway = connectors.demo.execute({
        kind: 'select',
        selectionId: input.selectionId,
        hotelState: current.value,
      });
      connectors.state.patchState({
        handle: 'demo_hotel_selections',
        expectedRevision: current.revision,
        value: gateway.nextHotelState,
      });
      return {
        status: gateway.selection.status,
        message: gateway.selection.message,
        selectionId: gateway.selection.selectionId,
      };
    },
  });
}

export function createDemoCapabilities(viewPolicies: DemoViewPolicies) {
  const searchHotels = searchDemoHotels(viewPolicies.hotel);
  const loyalty = openDemoLoyalty(viewPolicies.loyalty);
  const rewardFlights = compareDemoRewardFlights(viewPolicies.loyalty);
  const review = reviewDemoTrip(viewPolicies.loyalty);
  const selectHotel = selectDemoHotel();
  return {
    all: [searchHotels, loyalty, rewardFlights, review, selectHotel] as const,
    publicSurface: [searchHotels, loyalty, rewardFlights, review, selectHotel] as const,
  };
}
