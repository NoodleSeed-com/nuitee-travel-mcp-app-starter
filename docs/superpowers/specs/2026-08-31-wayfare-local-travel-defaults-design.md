# Wayfare Local Travel Defaults Design

## Status

Architecture approved by the user on 2026-08-31. Written-spec review is pending.

This design extends `2026-08-29-wayfare-premium-concierge-polish-design.md`. It does not change the guest-first session model, the single centered conversation, chronological inline MCP Apps, exact view admission, or the Search → Select → Verify product boundary.

## Goal

Make Wayfare feel locally relevant before the first message by automatically suggesting the nearest supported departure airport and an appropriate display currency, without sending precise location to Noodle, Nuitee, the assistant model, analytics, or any third party.

## Chosen approach

Wayfare uses the browser Geolocation API and resolves coordinates locally against a bundled, public-domain airport catalog. The browser discards the coordinates after resolution. No IP lookup, browser-to-geocoder request, cookie, local storage, session storage, analytics event, or backend endpoint is added.

This is the simplest implementation that satisfies the requested automatic behavior while preserving a public-template privacy boundary.

## User experience

### Automatic resolution

After client hydration, Wayfare requests browser location automatically with low-accuracy, bounded settings. The page remains fully usable while the prompt is pending.

- Permission granted: Wayfare chooses the nearest catalog airport within 250 kilometres.
- Permission denied, timed out, unavailable, or no airport within range: Wayfare keeps a neutral origin and never shows an error interruption.
- Location resolution runs once per page lifetime. It is not persisted by the application.

The browser may remember its own permission decision; Wayfare does not store it.

### Header currency

The top-right header includes a compact native currency selector before the menu button. Its initial value resolves in this order:

1. an explicit selection made by the user during the current page lifetime;
2. the resolved airport country's common travel currency;
3. the browser locale's region currency;
4. `USD`.

The selector offers the starter's supported display currencies: `USD`, `EUR`, `GBP`, `CAD`, `AUD`, `PKR`, `AED`, `QAR`, `SAR`, `TRY`, `JPY`, `SGD`, and `INR`. Selection is session-only and is not presented as an exchange-rate service.

### Origin-aware pre-search copy

Before the first turn, the hero example, composer placeholder, and example planning flow use the derived origin:

```text
Islamabad (ISB) → Rome (FCO)
```

If no safe airport default is available, the same surfaces say `Your departure → Rome` and the composer uses `Your departure to Rome for two, next weekend`.

The dynamic origin applies only to pre-search examples and defaults. Once typed provider/tool results exist, their validated route and currency remain authoritative. Wayfare never rewrites a route selected or stated by the traveler.

## Components and boundaries

### `travel-defaults.ts`

A pure module owns:

- the `AirportDefault` and `TravelDefaults` types;
- Haversine distance calculation;
- nearest-airport resolution with the 250 km fail-closed radius;
- browser-locale region parsing;
- country/region-to-currency mapping;
- fallback labels and supported currency validation.

It has no browser globals, network access, React state, logging, or assistant dependency.

### Airport catalog

A generated TypeScript data module contains only the fields required at runtime: IATA code, city label, ISO country code, latitude, and longitude. Its source is a pinned OurAirports data snapshot, which is published into the public domain. Repository documentation records the upstream URL, snapshot date, generation/filter rules, and public-domain notice.

The catalog includes scheduled-service large airports with valid IATA and coordinate fields. The implementation does not bundle airport descriptions, contact data, or provider content.

### `use-travel-defaults.ts`

A client hook owns the one-shot automatic permission request and page-lifetime override state.

- `enableHighAccuracy: false`
- `timeout: 7000`
- `maximumAge: 86400000`

Coordinates exist only inside the geolocation callback long enough to call the pure resolver. The hook stores only the derived airport/city/country/currency fields.

### Page composition

`TravelAssistantPage` owns one `TravelDefaults` value and passes it to `TravelHeader`, `TravelZeroState`, and `TravelConversation`. These components do not independently request location.

`TravelHeader` renders the native currency selector in hero and conversation modes. `TravelHero` renders derived example copy. The conversation receives derived hints through a typed `pageContext` callback.

## Assistant context

Every turn recomputes this bounded, untrusted page context:

```ts
{
  travelDefaults: {
    origin: "ISB",
    originLabel: "Islamabad",
    country: "PK",
    currency: "PKR",
    source: "browser-geolocation"
  }
}
```

When location is unavailable, `origin`, `originLabel`, and `country` are omitted and `source` is `fallback`. The selected currency remains present.

The page context never contains latitude, longitude, accuracy, permission state, IP address, timestamps, or a persistent identifier. It is a convenience hint, not verified identity, market authorization, pricing authority, or tool authorization.

Assistant guidance uses these values only as defaults when the traveler has not supplied the corresponding fact. An explicit traveler origin, destination, currency, or market always wins. The MCP server retains its server-owned default policy for non-website hosts and for turns without this page context.

## Browser policy and privacy

The Next.js `Permissions-Policy` changes from `geolocation=()` to `geolocation=(self)` while camera and microphone remain disabled. No cross-origin frame receives geolocation permission.

Privacy documentation states:

- location permission is optional;
- precise coordinates are processed only in memory in the browser;
- only a derived airport/city/country/currency hint can reach the assistant model;
- no application persistence or third-party location lookup is used;
- denial does not reduce flight-search capability.

No console output, telemetry, test snapshot, URL, DOM attribute, model context, or error message may expose coordinates.

## Error handling

Geolocation failures are quiet fallbacks, not alerts. The currency selector remains usable. Unsupported or malformed locale/country values resolve to `USD` without throwing.

The app never retries location automatically. A page reload may cause the browser to resolve permission again according to browser policy.

## Accessibility and responsive behavior

- The currency control has a visible `Currency` label for assistive technology and a native select interaction.
- The combined selector target is at least 44 × 44 px.
- Header controls fit at 320 px, 390 px, 200% text size, and desktop widths without clipping.
- Dynamic route copy remains readable and does not depend on flags or color alone.
- No new motion is introduced.

## Testing and verification

### Unit and component tests

- nearest-airport resolution, including equal-distance stability and 250 km rejection;
- locale and airport-country currency precedence;
- malformed and unsupported inputs fail to neutral defaults;
- geolocation granted, denied, timed out, and unavailable;
- coordinate values are absent from derived state and assistant page context;
- user currency selection outranks automatic defaults;
- header selector and hero copy render the derived defaults;
- explicit conversation input remains authoritative over page defaults.

### Browser tests

- Playwright geolocation permission produces a deterministic airport/currency and origin-aware hero;
- denied permission produces the neutral origin and locale currency;
- header remains contained at 320 px, 390 px, desktop, and 200% text;
- the existing nested MCP App, composer, keyboard, reduced-motion, and scroll-containment checks remain green.

### Noodle and repository gates

- web typecheck, unit tests, browser tests, and production build;
- root repository tests and readiness assertions;
- `noodle validate --json`, `noodle test --json`, and the existing embedded-assistant check;
- history, license, diff, and exact-commit CI gates before push.

## CI repair boundary

The currently red PR has two CI-only browser geometry failures. They are investigated separately under the systematic-debugging workflow. Any repair must address a reproduced layout or readiness root cause, retain the existing accessibility/containment assertions, and avoid arbitrary tolerance increases or timeout inflation.

## Non-goals

- IP geolocation, reverse-geocoding APIs, maps, exchange rates, or currency conversion;
- saving location or currency across page reloads;
- automatic destination choice;
- changing provider search results after a traveler supplies a route;
- using browser location as pricing, identity, authorization, fraud, or regulatory evidence;
- requesting high-accuracy or background location;
- adding a backend geolocation route or hosted configuration.

## Source

Airport data comes from [OurAirports Data](https://ourairports.com/data/) under its [public-domain dedication](https://github.com/davidmegginson/ourairports-data/blob/main/LICENSE). The repository must pin and document the snapshot used rather than fetching this data at runtime.
