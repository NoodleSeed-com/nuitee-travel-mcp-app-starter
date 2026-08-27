import {
  annotations,
  embeddedAssistant,
  openAICompatible,
  publicWebsite,
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
  selectFlightOutputSchema,
  selectionIdSchema,
  selectionStateSchema,
  verifyInputSchema,
  verifyOutputSchema,
} from './flight-schemas.js';
import { starterConfig } from './starter-config.js';

const home = {
  status: 'ready' as const,
  brand: starterConfig.brand.name,
  message: 'Flights are available. Tell me your route, dates, travelers, currency, and point-of-sale country to begin.',
  domains: [
    { name: 'Flights' as const, availability: 'available' as const },
    { name: 'Stays' as const, availability: 'coming_soon' as const },
    { name: 'Loyalty' as const, availability: 'coming_soon' as const },
    { name: 'Ground travel' as const, availability: 'coming_soon' as const },
    { name: 'Experiences' as const, availability: 'coming_soon' as const },
  ],
  fallback:
    `${starterConfig.brand.name} can search one-way or round-trip flights, compare up to ten current options, and verify a selected fare. Stays, Loyalty, Ground travel, and Experiences are coming soon.`,
};

const configurationError = {
  code: 'configuration_required' as const,
  message: 'Live Nuitee access is not configured on this server. A deployment owner must configure NUITEE_API_KEY server-side.',
  retryable: false,
};

export function widgetDomainPolicy(domain: string | null) {
  return domain === null ? {} : { domain };
}

const sharedWidgetDomainPolicy = widgetDomainPolicy(starterConfig.widgets.domain);

const homeViewPolicy = {
  // A custom widget `domain` is intentionally omitted for local and ordinary
  // MCP-host use. The customizer applies one real, deployment-owned HTTPS
  // origin to both widgets before submission; never ship a placeholder.
  ...sharedWidgetDomainPolicy,
  csp: { connectDomains: [], resourceDomains: [], frameDomains: [] },
};

const flightViewPolicy = {
  // The widget never calls Nuitee. These origins are resource-only so it can
  // display a bounded marketingLogo returned by the official Flights contract.
  // Runtime normalization rejects every other image origin and path.
  ...sharedWidgetDomainPolicy,
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
    title: `Open ${starterConfig.brand.name}`,
    description:
      `Open the ${starterConfig.brand.name} home experience. Flights are available; all other displayed travel domains are noninteractive coming-soon information.`,
    annotations: annotations.readOnly(),
    contextProvider: true,
    input: z.object({}),
    output: homeOutputSchema,
    fulfil: () => home,
    viewTitle: starterConfig.brand.name,
    viewDescription: 'Flights-first travel discovery with clearly labelled future domains.',
    invoking: `Opening ${starterConfig.brand.name}…`,
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
      'Verify a fare selected from the current application search. For “verify again”, re-verify the active fare. Accepts only application-issued opaque selection identifiers, never provider offer identifiers.',
    annotations: annotations.readOnly(),
    input: verifyInputSchema,
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
      'Verify a fare selected from the current application search. For “verify again”, “verify this”, or an otherwise unchanged choice, use the active selection mode and omit selectionId. Use explicit mode only when the user clearly chooses a different option. Reports availability, current price, changes, messages, and expiry; it never prebooks or books.',
    annotations: annotations.readOnly(),
    input: verifyInputSchema,
    output: verifyOutputSchema,
    fulfil: ({ input, context, connectors }) => {
      const current = connectors.state.readState({ handle: 'flight_selections' });
      const gateway = connectors.gateway.execute({
        kind: 'verify',
        selectionId: input.selectionId,
        selectionMode: input.selectionMode,
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

function offlineSelectFlightOffer() {
  return tool('select_flight_offer', {
    title: 'Remember selected fare',
    visibility: ['app'],
    description: 'Remember the fare selected inside the flight-results widget for a later verification turn.',
    annotations: annotations.action({ confirm: true }),
    input: z.object({ selectionId: selectionIdSchema }),
    output: selectFlightOutputSchema,
    fulfil: () => ({
      status: 'unavailable' as const,
      message: configurationError.message,
    }),
  });
}

function liveSelectFlightOffer() {
  return tool('select_flight_offer', {
    title: 'Remember selected fare',
    visibility: ['app'],
    description: 'Remember the fare selected inside the flight-results widget for a later verification turn.',
    annotations: annotations.action({ confirm: true }),
    input: z.object({ selectionId: selectionIdSchema }),
    output: selectFlightOutputSchema,
    fulfil: ({ input, connectors }) => {
      const current = connectors.state.readState({ handle: 'flight_selections' });
      connectors.state.patchState({
        handle: 'flight_selections',
        expectedRevision: current.revision,
        value: {
          searchId: current.value.searchId,
          updatedAt: current.value.updatedAt,
          records: current.value.records,
          activeSelectionId: input.selectionId,
        },
      });
      return {
        status: 'selected' as const,
        message: 'The selected fare is ready for verification.',
        selectionId: input.selectionId,
      };
    },
  });
}

function createTravelCapabilities(live: boolean) {
  const open = openTravelStarter();
  const search = live ? liveSearchFlights() : offlineSearchFlights();
  const verify = live ? liveVerifyFlightOffer() : offlineVerifyFlightOffer();
  const select = live ? liveSelectFlightOffer() : offlineSelectFlightOffer();

  return {
    all: [open, search, verify, select] as const,
    publicSurface: [open, search, verify, select] as const,
  };
}

export function createTravelServer(mode: 'credential-free' | 'live' | 'embedded') {
  // All entrypoints share this product factory. Only the connector/model
  // credentials differ, which prevents local tests and external MCP hosts from
  // inheriting optional embedded-assistant requirements.
  const live = mode !== 'credential-free';
  const capabilities = createTravelCapabilities(live);
  const assistant = mode === 'embedded'
    ? embeddedAssistant({
        model: openAICompatible({
          baseUrl: variable('ASSISTANT_MODEL_BASE_URL'),
          model: variable('ASSISTANT_MODEL'),
          apiKey: secret('ASSISTANT_MODEL_API_KEY'),
        }),
        // The starter ships with exact Next.js loopback origins for the
        // primary guest website's standard and fallback preview ports. Add the
        // deployment-owned HTTPS origin explicitly before hosted use and
        // remove loopback from hosted-only deployments.
        access: publicWebsite({
          origins: [...starterConfig.embeddedAssistant.origins],
          capabilities: [...capabilities.publicSurface],
        }),
        layout: { mode: 'inline' },
      })
    : undefined;
  const options = live
    ? {
        title: 'Nuitee Travel MCP App Starter',
        version: '0.1.0',
        instructions:
          'Help users discover and verify one-way or round-trip flights from natural city or airport names. Translate only well-known, unambiguous places to IATA codes, restate the resolved airports, and ask for city/region/country clarification when uncertain or ambiguous. Never guess a code, request credentials, expose provider offer identifiers, or imply booking, payment, loyalty, hotel, car, or transaction support.',
        branding: {
          name: starterConfig.brand.name,
          accent: starterConfig.brand.accent,
          surface: starterConfig.brand.surface,
          surfaceDark: starterConfig.brand.surfaceDark,
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
              version: 'v2',
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
          `Open the credential-free ${starterConfig.brand.name} home. Users may speak in natural city or airport names; resolve only unambiguous places and ask for region/country clarification rather than guessing a code. Live tools explain that an owner must configure NUITEE_API_KEY; never ask an end user to paste a key.`,
        branding: {
          name: starterConfig.brand.name,
          accent: starterConfig.brand.accent,
          surface: starterConfig.brand.surface,
          surfaceDark: starterConfig.brand.surfaceDark,
          radius: 'lg' as const,
          density: 'comfortable' as const,
        },
      };

  return server(
    'nuitee_travel_mcp_app_starter',
    options,
    capabilities.all,
  );
}
