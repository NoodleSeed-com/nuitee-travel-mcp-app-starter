import { annotations, tool, when, z } from '@noodleseed/one';
import {
  DEMO_DESTINATION_ALIASES,
  DEMO_HOTEL_CATALOG,
  DEMO_INSURANCE_PLAN_CATALOG,
  DEMO_REWARD_FLIGHT_CATALOG,
  getSyntheticLoyaltyOverview,
} from './demo-fixtures.js';
import {
  DEMO_EXPERIENCE_ALIASES,
  DEMO_EXPERIENCE_CATALOG,
} from './experience-fixtures.js';
import {
  demoExperienceSearchInputSchema,
  demoExperienceSearchOutputSchema,
  demoAddExperienceInputSchema,
  demoAddExperienceOutputSchema,
  demoHotelSearchInputSchema,
  demoHotelSearchOutputSchema,
  demoInsuranceComparisonInputSchema,
  demoInsuranceComparisonOutputSchema,
  demoLoyaltyOverviewSchema,
  demoRewardFlightSearchInputSchema,
  demoRewardFlightSearchOutputSchema,
  demoSelectHotelOutputSchema,
  demoTripReviewSchema,
  openHotelInputSchema,
  openHotelOutputSchema,
} from './demo-schemas.js';
import { demoHotelSelectionIdSchema } from './demo-schemas.js';

interface DemoViewPolicies {
  readonly hotel: Readonly<Record<string, unknown>>;
  readonly experience: Readonly<Record<string, unknown>>;
  readonly insurance: Readonly<Record<string, unknown>>;
  readonly loyalty: Readonly<Record<string, unknown>>;
  readonly review: Readonly<Record<string, unknown>>;
}

function searchDemoExperiences(viewPolicy: Readonly<Record<string, unknown>>) {
  return tool('search_experiences', {
    title: 'Explore experience ideas',
    description:
      'Explore bounded fictional Wayfare experience ideas for Lisbon or Tokyo using exact stay dates and party size. For a named experience request, pass experienceName: one match opens the existing detail/date/time chooser, multiple matches show a carousel. Use this named lookup when the traveler wants to add a named experience but has not chosen a slot, even if broad results were already shown; let the widget collect that choice. Use experienceName: "" for broad discovery or add another experience, never the city name or a wildcard. Apply optional interest filters only when explicitly requested. For accessibility use ANY unless the traveler explicitly requests step-free or wheelchair-accessible options, in which case use STEP_FREE. Returned experience and slot references can be added to this conversation’s trip plan for 30 minutes; nothing is held, reserved, or booked.',
    annotations: annotations.readOnly(),
    input: demoExperienceSearchInputSchema,
    output: demoExperienceSearchOutputSchema,
    fulfil: ({ input, context, connectors }) => {
      const current = connectors.state.readState({ handle: 'experience_selections' });
      const states = connectors.demo.prepare_states({ experienceState: current.value });
      const gateway = connectors.demo.execute({
        kind: 'experience_search',
        experienceSearch: input,
        experienceCatalog: DEMO_EXPERIENCE_CATALOG,
        experienceAliases: DEMO_EXPERIENCE_ALIASES,
        experienceState: states.experienceState.optional(),
        experienceReadOk: current.ok.optional(),
        requestedAt: context['temporal.instant'],
      });
      when(gateway.mayWriteExperienceState.equals(true), () => connectors.state.patchState({
        handle: 'experience_selections', expectedRevision: current.revision,
        value: gateway.nextExperienceState,
      }));
      return {
        status: gateway['experienceResult.status'],
        dataSource: gateway['experienceResult.dataSource'],
        source: gateway['experienceResult.source'],
        isFictional: gateway['experienceResult.isFictional'],
        disclosure: gateway['experienceResult.disclosure'],
        message: gateway['experienceResult.message'],
        fallback: gateway['experienceResult.fallback'],
        searchId: gateway['experienceResult.searchId'],
        searchContext: gateway['experienceResult.searchContext'],
        supportedDestination: gateway['experienceResult.supportedDestination'],
        emptyReason: gateway['experienceResult.emptyReason'].optional(),
        experiences: gateway['experienceResult.experiences'],
      };
    },
    viewTitle: 'Fictional experience ideas',
    viewDescription: 'Browse or disambiguate fictional Lisbon and Tokyo experiences. A single named match opens details with date/time choices; the widget handles slot selection, so do not repeat its slot list in prose unless the widget is unavailable. Nothing is booked.',
    invoking: 'Finding fictional experience ideas…',
    invoked: 'Experience ideas ready',
    view: { component: 'experience-results', entry: './views/experience-results.tsx' },
    ...viewPolicy,
  });
}

function addDemoExperience(viewPolicy: Readonly<Record<string, unknown>>) {
  return tool('add_experience_to_trip', {
    title: 'Add experience to my trip',
    description: 'Add an explicitly chosen returned fictional experience and date/time slot to this conversation’s trip plan. Reuse the server-stored party and price; only pass returned experienceId and slotId. Repeated requests do not duplicate a choice. This is a temporary planning selection, not a reservation, booking, or payment. If time is ambiguous, ask which returned slot first. Search again if options expired.',
    visibility: ['model', 'app'],
    // Like flight/stay selection this only changes temporary caller state;
    // there is no provider write, inventory hold, reservation, or payment.
    annotations: annotations.readOnly(),
    input: demoAddExperienceInputSchema,
    output: demoAddExperienceOutputSchema,
    fulfil: ({ input, context, connectors }) => {
      const current = connectors.state.readState({ handle: 'experience_selections' });
      const states = connectors.demo.prepare_states({ experienceState: current.value });
      const gateway = connectors.demo.execute({
        kind: 'experience_select', experienceState: states.experienceState.optional(),
        experienceReadOk: current.ok.optional(),
        experienceId: input.experienceId, slotId: input.slotId, requestedAt: context['temporal.instant'],
      });
      const patch = when(gateway['experienceSelection.status'].equals('selected'), () => connectors.state.patchState({
        handle: 'experience_selections', expectedRevision: current.revision, value: gateway.nextExperienceState,
      }));
      const acknowledged = connectors.demo.acknowledge_experience_selection({
        proposal: gateway.experienceSelection, patchOk: patch.ok.optional(),
      });
      return {
        status: acknowledged.status, message: acknowledged.message, selection: acknowledged.selection.optional(),
        requestedExperienceId: input.experienceId, requestedSlotId: input.slotId,
      };
    },
    viewTitle: 'Experience added to your trip',
    viewDescription: 'Acknowledged planning selection with its chosen date, time, party, and separate fictional price.',
    invoking: 'Adding experience to your trip…',
    invoked: 'Experience selection checked',
    view: { component: 'experience-added', entry: './views/experience-added.tsx' },
    ...viewPolicy,
  });
}

function searchDemoHotels(viewPolicy: Readonly<Record<string, unknown>>) {
  return tool('search_hotels', {
    title: 'Compare hotels',
    description:
      'Compare deterministic illustrative hotel options for Wayfare. This never checks live hotel availability and cannot reserve or book. Reuse the known destination and dates. Resolve next week as the same local weekday seven days later. If omitted, browse 1 night, 1 adult and 1 room, with visible adjustable assumptions. Pass resolved exact stay dates.',
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
          searchId: gateway['result.searchId'],
          updatedAt: context['temporal.instant'],
          records: gateway.records,
          searchResult: gateway.result,
        },
      });
      return {
        status: gateway['result.status'],
        dataSource: gateway['result.dataSource'],
        disclosure: gateway['result.disclosure'],
        message: gateway['result.message'],
        fallback: gateway['result.fallback'],
        searchId: gateway['result.searchId'],
        searchContext: gateway['result.searchContext'],
        hotels: gateway['result.hotels'],
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

function searchLiveHotels(viewPolicy: Readonly<Record<string, unknown>>) {
  return tool('search_hotels', {
    title: 'Search hotels',
    description:
      'Search current Nuitee hotel rates and availability. Reuse destination and dates from the conversation; never ask for them again after a date-only reply. Resolve next week as the same local weekday seven days later. If omitted, browse 1 night, 1 adult and 1 room, showing adjustable assumptions without asking for confirmation. Preserve explicit dates, nights, guests and rooms. Pass exact stay dates and a city with its two-letter country code, or an IATA airport code. Results are read-only, can change, and do not hold or reserve a room.',
    annotations: annotations.readOnly(),
    input: demoHotelSearchInputSchema,
    output: demoHotelSearchOutputSchema,
    fulfil: ({ input, context, connectors }) => {
      const gateway = connectors.hotels.execute({
        search: input,
        requestedAt: context['temporal.instant'],
      });
      const current = connectors.state.readState({ handle: 'demo_hotel_selections' });
      connectors.state.patchState({
        handle: 'demo_hotel_selections',
        expectedRevision: current.revision,
        value: {
          searchId: gateway['result.searchId'],
          updatedAt: context['temporal.instant'],
          records: gateway.records,
          searchResult: gateway.result,
        },
      });
      return {
        status: gateway['result.status'],
        dataSource: gateway['result.dataSource'],
        disclosure: gateway['result.disclosure'],
        message: gateway['result.message'],
        fallback: gateway['result.fallback'],
        searchId: gateway['result.searchId'],
        searchContext: gateway['result.searchContext'],
        hotels: gateway['result.hotels'],
        error: gateway['result.error'],
      };
    },
    viewTitle: 'Current hotel results',
    viewDescription: 'Bounded current hotel rates with clear verification and no-reservation boundaries.',
    invoking: 'Searching current stays…',
    invoked: 'Hotel search complete',
    view: { component: 'hotel-results', entry: './views/hotel-results.tsx' },
    ...viewPolicy,
  });
}

function openReturnedHotel(viewPolicy: Readonly<Record<string, unknown>>) {
  return tool('open_hotel', {
    title: 'Open a returned hotel',
    description: 'Open the existing hotel widget when the traveler names a hotel to show, inspect, choose, or add. Matches only this conversation’s most recent returned stays, including those beyond the first three cards. One match opens details with Choose this stay; multiple matches show matching cards. Use this instead of repeating a city search or only saying select it in the widget. Does not search providers, change selections, reserve, or book. If absent or expired, explain that and offer a fresh search; never invent a hotel or substitute an unrelated stay.',
    annotations: annotations.readOnly(),
    input: openHotelInputSchema,
    output: openHotelOutputSchema,
    fulfil: ({ input, connectors }) => {
      const current = connectors.state.readState({ handle: 'demo_hotel_selections' });
      const states = connectors.demo.prepare_states({ hotelState: current.value });
      const opened = connectors.demo.open_hotel({ hotelName: input.hotelName, hotelState: states.hotelState.optional(), readOk: current.ok.optional() });
      return { status: opened.status, message: opened.message, result: opened.result.optional(), focusedSelectionId: opened.focusedSelectionId.optional(), selectedSelectionId: opened.selectedSelectionId.optional() };
    },
    viewTitle: 'Your requested stay',
    viewDescription: 'The requested returned hotel, ready to inspect and choose. A name with multiple matches shows only those options. Opening never selects or reserves a stay.',
    invoking: 'Opening the requested stay…',
    invoked: 'Hotel lookup complete',
    view: { component: 'open-hotel', entry: './views/open-hotel.tsx' },
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
        status: gateway['rewardResult.status'],
        dataSource: gateway['rewardResult.dataSource'],
        disclosure: gateway['rewardResult.disclosure'],
        message: gateway['rewardResult.message'],
        fallback: gateway['rewardResult.fallback'],
        searchId: gateway['rewardResult.searchId'],
        searchContext: gateway['rewardResult.searchContext'],
        pointsContext: gateway['rewardResult.pointsContext'],
        options: gateway['rewardResult.options'],
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

function compareDemoTravelInsurance(viewPolicy: Readonly<Record<string, unknown>>) {
  return tool('compare_travel_insurance', {
    title: 'Compare travel protection',
    description:
      'Compare exactly three deterministic illustrative travel-protection concepts for a destination and trip dates. This is not an insurance quote, policy, or recommendation; it checks no insurer, eligibility, availability, medical information, or policy wording and cannot purchase coverage.',
    annotations: annotations.readOnly(),
    input: demoInsuranceComparisonInputSchema,
    output: demoInsuranceComparisonOutputSchema,
    fulfil: ({ input, connectors }) => {
      const gateway = connectors.demo.execute({
        kind: 'insurance_compare',
        insuranceComparison: input,
        insuranceCatalog: DEMO_INSURANCE_PLAN_CATALOG,
      });
      return {
        status: gateway['insuranceResult.status'],
        dataSource: gateway['insuranceResult.dataSource'],
        disclosure: gateway['insuranceResult.disclosure'],
        message: gateway['insuranceResult.message'],
        fallback: gateway['insuranceResult.fallback'],
        comparisonId: gateway['insuranceResult.comparisonId'],
        searchContext: gateway['insuranceResult.searchContext'],
        assumptions: gateway['insuranceResult.assumptions'],
        plans: gateway['insuranceResult.plans'],
      };
    },
    viewTitle: 'Illustrative travel protection',
    viewDescription: 'Three source-labelled protection concepts with no quote, policy, eligibility decision, or purchase action.',
    invoking: 'Comparing illustrative travel protection…',
    invoked: 'Travel protection comparison ready',
    view: { component: 'insurance-results', entry: './views/insurance-results.tsx' },
    ...viewPolicy,
  });
}

function reviewDemoTrip(viewPolicy: Readonly<Record<string, unknown>>) {
  return tool('review_trip', {
    title: 'Review selected trip',
    description:
      'Review any currently selected flight, stay, and fictional experiences with separate prices and illustrative rewards. A single selected component is a valid plan. Missing components are optional; use returned planningContext for relevant next suggestions. Reads server-owned selections only and cannot book, pay, or redeem.',
    annotations: annotations.readOnly(),
    input: z.object({}),
    output: demoTripReviewSchema,
    fulfil: ({ context, connectors }) => {
      const flights = connectors.state.readState({ handle: 'flight_selections' }).value;
      const hotels = connectors.state.readState({ handle: 'demo_hotel_selections' }).value;
      const experiences = connectors.state.readState({ handle: 'experience_selections' });
      const states = connectors.demo.prepare_states({ flightState: flights, hotelState: hotels, experienceState: experiences.value });
      const gateway = connectors.demo.execute({
        kind: 'review',
        flightState: states.flightState.optional(),
        hotelState: states.hotelState.optional(),
        experienceState: states.experienceState.optional(),
        experienceReadOk: experiences.ok.optional(),
        requestedAt: context['temporal.instant'],
        aliases: { ...DEMO_DESTINATION_ALIASES, ...DEMO_EXPERIENCE_ALIASES },
        loyalty: getSyntheticLoyaltyOverview(),
      });
      const estimate = connectors.demo.estimate_trip({ review: gateway.review });
      return {
        status: gateway['review.status'],
        dataSource: gateway['review.dataSource'],
        disclosure: gateway['review.disclosure'],
        fallback: gateway['review.fallback'],
        flight: gateway['review.flight'].optional(),
        stay: gateway['review.stay'].optional(),
        experiences: gateway['review.experiences'],
        planningContext: gateway['review.planningContext'].optional(),
        notes: gateway['review.notes'].optional(),
        loyalty: gateway['review.loyalty'],
        missing: gateway['review.missing'],
        planningEstimate: estimate,
      };
    },
    viewTitle: 'Trip and rewards review',
    viewDescription: 'Separate live-flight and synthetic-stay provenance with illustrative rewards.',
    invoking: 'Reviewing selected travel…',
    invoked: 'Trip review ready',
    view: { component: 'trip-review', entry: './views/trip-review.tsx' },
    ...viewPolicy,
  });
}

function selectDemoHotel() {
  return tool('select_hotel', {
    title: 'Remember selected stay',
    visibility: ['app'],
    description:
      'Remember the opaque stay selected inside the hotel widget for a later trip review.',
    // This only updates short-lived caller-scoped widget state; it does not
    // create a booking, hold inventory, or perform an external side effect.
    annotations: annotations.readOnly(),
    input: z.object({ selectionId: demoHotelSelectionIdSchema }),
    output: demoSelectHotelOutputSchema,
    fulfil: ({ input, connectors }) => {
      const current = connectors.state.readState({ handle: 'demo_hotel_selections' });
      const states = connectors.demo.prepare_states({ hotelState: current.value });
      const gateway = connectors.demo.execute({
        kind: 'select',
        selectionId: input.selectionId,
        hotelState: states.hotelState.optional(),
      });
      when(gateway['selection.status'].equals('selected'), () => connectors.state.patchState({
        handle: 'demo_hotel_selections',
        expectedRevision: current.revision,
        value: gateway.nextHotelState,
      }));
      return {
        status: gateway['selection.status'],
        message: gateway['selection.message'],
        selectionId: gateway['selection.selectionId'].optional(),
      };
    },
  });
}

export function createDemoCapabilities(
  viewPolicies: DemoViewPolicies,
  options: { readonly liveHotels?: boolean } = {},
) {
  const searchHotels = options.liveHotels
    ? searchLiveHotels(viewPolicies.hotel)
    : searchDemoHotels(viewPolicies.hotel);
  const experiences = searchDemoExperiences(viewPolicies.experience);
  const openHotel = openReturnedHotel(viewPolicies.hotel);
  const loyalty = openDemoLoyalty(viewPolicies.loyalty);
  const rewardFlights = compareDemoRewardFlights(viewPolicies.loyalty);
  const insurance = compareDemoTravelInsurance(viewPolicies.insurance);
  const review = reviewDemoTrip(viewPolicies.review);
  const selectHotel = selectDemoHotel();
  const addExperience = addDemoExperience(viewPolicies.experience);
  return {
    all: [searchHotels, openHotel, experiences, loyalty, rewardFlights, insurance, review, selectHotel, addExperience] as const,
    publicSurface: [searchHotels, openHotel, experiences, loyalty, rewardFlights, insurance, review, selectHotel, addExperience] as const,
  };
}
