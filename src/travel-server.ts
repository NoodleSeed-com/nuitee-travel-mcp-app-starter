import {
  annotations,
  embeddedAssistant,
  openAICompatible,
  secret,
  server,
  tool,
  variable,
  z,
} from '@noodleseed/one';
import { noodleState, nuiteeGateway, nuiteeHttp } from './flight-connectors.js';
import {
  homeOutputSchema,
  searchInputSchema,
  searchOutputSchema,
  selectionStateSchema,
  verifyOutputSchema,
} from './flight-schemas.js';

const home = {
  status: 'ready' as const,
  brand: 'Cedar & Cloud Travel' as const,
  message: 'Flights are available. Tell me your route, dates, travelers, currency, and point-of-sale country to begin.',
  domains: [
    { name: 'Flights' as const, availability: 'available' as const },
    { name: 'Stays' as const, availability: 'coming_soon' as const },
    { name: 'Loyalty' as const, availability: 'coming_soon' as const },
    { name: 'Ground travel' as const, availability: 'coming_soon' as const },
    { name: 'Experiences' as const, availability: 'coming_soon' as const },
  ],
  fallback:
    'Cedar & Cloud Travel can search one-way or round-trip flights, compare up to ten current options, and verify a selected fare. Stays, Loyalty, Ground travel, and Experiences are coming soon.',
};

const configurationError = {
  code: 'configuration_required' as const,
  message: 'Live Nuitee access is not configured on this server. A deployment owner must configure NUITEE_API_KEY server-side.',
  retryable: false,
};

const homeViewPolicy = {
  // A custom widget `domain` is intentionally omitted for local and ordinary
  // MCP-host use. Before an app-store submission, add the same real,
  // deployment-owned HTTPS origin to both widgets; never ship a placeholder.
  csp: { connectDomains: [], resourceDomains: [], frameDomains: [] },
};

const flightViewPolicy = {
  // The widget never calls Nuitee. These origins are resource-only so it can
  // display a bounded marketingLogo returned by the official Flights contract.
  // Runtime normalization rejects every other image origin and path.
  csp: {
    connectDomains: [],
    resourceDomains: [
      'https://sandbox.nuitee.flights',
      'https://production.nuitee.flights',
    ],
    frameDomains: [],
  },
};

function openTravelStarter() {
  return tool('open_travel_starter', {
    title: 'Open Cedar & Cloud Travel',
    description:
      'Open the Cedar & Cloud Travel home experience. Flights are available; all other displayed travel domains are noninteractive coming-soon information.',
    annotations: annotations.readOnly(),
    contextProvider: true,
    input: z.object({}),
    output: homeOutputSchema,
    fulfil: () => home,
    viewTitle: 'Cedar & Cloud Travel',
    viewDescription: 'Flights-first travel discovery with clearly labelled future domains.',
    invoking: 'Opening Cedar & Cloud Travel…',
    invoked: 'Travel starter ready',
    view: { component: 'travel-home', entry: './views/travel-home.tsx' },
    ...homeViewPolicy,
  });
}

function offlineSearchFlights() {
  return tool('search_flights', {
    title: 'Search flights',
    description:
      'Users may ask with city or airport names. Resolve only clear places to IATA codes, and ask about ambiguous places before calling. Search becomes available after the owner configures NUITEE_API_KEY and Flights access.',
    annotations: annotations.readOnly(),
    input: searchInputSchema,
    output: searchOutputSchema,
    fulfil: () => ({
      status: 'error' as const,
      message: configurationError.message,
      fallback: configurationError.message,
      itineraries: [],
      error: configurationError,
    }),
    viewTitle: 'Flight results',
    viewDescription: 'Bounded flight comparisons with fare verification as the only primary action.',
    invoking: 'Searching current flights…',
    invoked: 'Flight search complete',
    view: { component: 'flight-results', entry: './views/flight-results.tsx' },
    ...flightViewPolicy,
  });
}

function liveSearchFlights() {
  return tool('search_flights', {
    title: 'Search flights',
    description:
      'Search current one-way or round-trip Nuitee offers when users give city or airport names. Resolve only unambiguous places to IATA codes and ask about ambiguous places before calling. Returns at most ten bounded itineraries; prices must be verified.',
    annotations: annotations.readOnly(),
    input: searchInputSchema,
    output: searchOutputSchema,
    fulfil: ({ input, context, connectors }) => {
      const gateway = connectors.gateway.execute({
        kind: 'search',
        search: input,
        today: context.temporal.localDate,
        requestedAt: context.temporal.instant,
      });
      const current = connectors.state.readState({ handle: 'flight_selections' });
      connectors.state.patchState({
        handle: 'flight_selections',
        expectedRevision: current.revision,
        value: {
          searchId: gateway.searchId,
          updatedAt: context.temporal.instant,
          records: gateway.records,
        },
      });
      return {
        status: gateway.status,
        message: gateway.message,
        fallback: gateway.fallback,
        retrievedAt: gateway.retrievedAt,
        searchId: gateway.searchId,
        searchContext: gateway.searchContext,
        itineraries: gateway.itineraries,
        error: gateway.error,
      };
    },
    viewTitle: 'Flight results',
    viewDescription: 'Bounded flight comparisons with fare verification as the only primary action.',
    invoking: 'Searching current flights…',
    invoked: 'Flight search complete',
    view: { component: 'flight-results', entry: './views/flight-results.tsx' },
    ...flightViewPolicy,
  });
}

function offlineVerifyFlightOffer() {
  return tool('verify_flight_offer', {
    title: 'Verify a flight fare',
    description:
      'Verify a fare selected from the current application search. Accepts only an application-issued opaque selection identifier, never a provider offer identifier.',
    annotations: annotations.readOnly(),
    input: z.object({ selectionId: z.string().regex(/^sel_[a-f0-9]{32}$/) }),
    output: verifyOutputSchema,
    fulfil: () => ({
      status: 'error' as const,
      message: configurationError.message,
      fallback: configurationError.message,
      error: configurationError,
    }),
  });
}

function liveVerifyFlightOffer() {
  return tool('verify_flight_offer', {
    title: 'Verify a flight fare',
    description:
      'Verify a fare selected from the current application search. Reports availability, current price, changes, messages, and expiry; it never prebooks or books.',
    annotations: annotations.readOnly(),
    input: z.object({ selectionId: z.string().regex(/^sel_[a-f0-9]{32}$/) }),
    output: verifyOutputSchema,
    fulfil: ({ input, context, connectors }) => {
      const current = connectors.state.readState({ handle: 'flight_selections' });
      const gateway = connectors.gateway.execute({
        kind: 'verify',
        selectionId: input.selectionId,
        state: current.value,
        requestedAt: context.temporal.instant,
      });
      return {
        status: gateway.status,
        message: gateway.message,
        fallback: gateway.fallback,
        verification: gateway.verification,
        error: gateway.error,
      };
    },
  });
}

export function createTravelServer(mode: 'credential-free' | 'live' | 'embedded') {
  // All entrypoints share this product factory. Only the connector/model
  // credentials differ, which prevents local tests and external MCP hosts from
  // inheriting optional embedded-assistant requirements.
  const live = mode !== 'credential-free';
  const assistant = mode === 'embedded'
    ? embeddedAssistant({
        model: openAICompatible({
          baseUrl: variable('ASSISTANT_MODEL_BASE_URL'),
          model: variable('ASSISTANT_MODEL'),
          apiKey: secret('ASSISTANT_MODEL_API_KEY'),
        }),
        // Replace this illustrative exact origin before any deployment.
        allowedOrigins: ['https://app.example.com'],
        layout: { mode: 'floating', position: 'bottom-right' },
      })
    : undefined;
  const options = live
    ? {
        title: 'Nuitee Travel MCP App Starter',
        version: '0.1.0',
        instructions:
          'Help users discover and verify one-way or round-trip flights from natural city or airport names. Translate only well-known, unambiguous places to IATA codes, restate the resolved airports, and ask for city/region/country clarification when uncertain or ambiguous. Never guess a code, request credentials, expose provider offer identifiers, or imply booking, payment, loyalty, hotel, car, or transaction support.',
        branding: {
          name: 'Cedar & Cloud Travel',
          accent: '#2B6F6D',
          surface: '#F4F1E8',
          surfaceDark: '#101B22',
          radius: 'lg' as const,
          density: 'comfortable' as const,
        },
        use: { gateway: nuiteeGateway, state: noodleState },
        provides: { nuitee_flights_http: nuiteeHttp },
        state: {
          handles: {
            flight_selections: {
              kind: 'selection' as const,
              scope: 'caller' as const,
              version: 'v1',
              ttlSeconds: 1_800,
              schema: selectionStateSchema,
            },
          },
        },
        ...(assistant ? { assistant } : {}),
      }
    : {
        title: 'Nuitee Travel MCP App Starter',
        version: '0.1.0',
        instructions:
          'Open the credential-free Cedar & Cloud Travel home. Users may speak in natural city or airport names; resolve only unambiguous places and ask for region/country clarification rather than guessing a code. Live tools explain that an owner must configure NUITEE_API_KEY; never ask an end user to paste a key.',
        branding: {
          name: 'Cedar & Cloud Travel',
          accent: '#2B6F6D',
          surface: '#F4F1E8',
          surfaceDark: '#101B22',
          radius: 'lg' as const,
          density: 'comfortable' as const,
        },
      };

  return server(
    'nuitee_travel_mcp_app_starter',
    options,
    [
      openTravelStarter(),
      live ? liveSearchFlights() : offlineSearchFlights(),
      live ? liveVerifyFlightOffer() : offlineVerifyFlightOffer(),
    ],
  );
}
