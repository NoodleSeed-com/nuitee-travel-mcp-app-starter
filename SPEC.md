# Product specification

## Product contract

Nuitee Travel MCP App Starter is a public-oriented reference implementation for conversational flight discovery and fare verification using the published `@noodleseed/one` package and official Nuitee Connect APIs. The sample experience uses the wholly fictional brand **Cedar & Cloud Travel**. Owner-selected licensing, browser/host evidence, and the remaining release checks are required before public release.

Success means a developer can clone the repository, run the credential-free home, configure their own server-side Nuitee key, search live one-way or round-trip flights, select an application-issued result, verify the fare, and identify every customization and security boundary.

This repository is not an official Nuitee connector and must not imply a Nuitee, airline, travel-agency, or financial-services partnership.

## Version-one boundary

Flights are the only operational travel domain.

| Domain | Version-one state | Interaction |
| --- | --- | --- |
| Flights | Available | Search, compare, verify fare |
| Stays | Coming soon | Noninteractive presentation only |
| Loyalty | Coming soon | Noninteractive presentation only |
| Ground travel | Coming soon | Noninteractive presentation only |
| Experiences | Coming soon | Noninteractive presentation only |

Version one has no multicity search, prebooking, booking, inventory hold, passenger collection, seat or baggage purchase, payment, cancellation, refund, amendment, loyalty earning/redemption, hotel search, car search, or arbitrary HTTP. It produces no checkout or handoff URL.

### Website starting experience

The guest website exposes one general travel composer. The assistant chooses
only among tools registered in the active server profile; the interface does
not require a capability choice or imply that future domains are operational.

## Consumption modes

1. **External MCP host:** ChatGPT, Claude, or another host supplies the conversational model. No assistant-model key is required.
2. **Optional embedded assistant:** an authenticated website backend creates a short-lived assistant session. The same travel server, connector, tools, schemas, state, and widgets are reused. Model configuration is separate from `NUITEE_API_KEY`.

The default `src/server.ts` remains credential-free because the supported connector composition resolves its managed secret when the connector is active. It exposes the complete product surface but returns explicit `configuration_required` results for live-only tools. `src/live-server.ts` composes the same product with the managed Nuitee connector after an owner configures the key. No fixture can activate the live tool path.

## Model-visible tools

The public projection contains four model-visible tools plus one App-only helper: `open_travel_starter`, `plan_flight_search`, `search_flights`, and `verify_flight_offer` are model-visible; `select_flight_offer` is available only to the linked App bridge.

### `open_travel_starter`

- Input: none.
- Works without any provider or model credential.
- Opens TravelHome.
- Flights is available; four future domains are noninteractive.
- Text fallback explains the supported flight workflow and future-domain boundary.

### `plan_flight_search`

- Collects a departure date only when a clear route has no usable exact or relative temporal clue; `next week` is resolved without elicitation as the same local weekday seven days later.
- Uses the same bounded flight-search schema and server-owned defaults as `search_flights`.
- Performs no Nuitee connector call and never invents airport resolution, availability, or fares.

### `search_flights`

- Conversational input: users give city or airport names. The host resolves only unambiguous places, restates the selected airports, and asks for region/country clarification when uncertain. The typed tool receives resolved origin/destination IATA codes plus dates, passengers, cabin, currency, and point-of-sale country.
- One-way or round-trip only; round-trip generates reverse OUTBOUND/INBOUND legs.
- Defaults: one-way unless a return trip is requested; a generic passenger count is treated as adults; otherwise one adult, zero children/infants, and economy. An explicit traveler choice wins. The guest website may provide derived origin/currency/market hints; otherwise currency and market fall back to USD/US.
- Conversation policy: current-fare search is read-only, so the assistant searches immediately with safe defaults, states those assumptions with the results, and offers adjustment afterward. It asks only for a genuinely ambiguous place, no usable date clue, an explicit round trip with no return date, or invalid date/passenger relationships.
- Application policy: exactly three-letter IATA-shaped codes, different endpoints, ISO dates not before the caller's server-authoritative local date, return after departure, one to nine total passengers, at least one adult, infants no greater than adults, age-array lengths equal their counts, child ages 2–11, infant ages 0–1, documented cabin enum, three-letter currency, and two-letter point of sale.
- Provider request: `POST /flights/rates`, JSON, exact documented `legs` array.
- Output: at most ten normalized itineraries, three inline, with opaque `selectionId`; validated search context; airport codes and documented names; comparison route; separate documented outbound/return legs; marketing/operating carrier facts and an optional allowlisted Nuitee-hosted airline image; airport-local schedules; bounded documented duration/stops and overnight/day-change hints; display-price breakdown; fare family; seats remaining; bounded refund/change flags; baggage hints/messages; up to five documented amenities; retrieval time; and documented expiration.
- Never outputs an upstream offer ID, arbitrary logo URL, raw response, fare-basis code, or booking code.
- Empty, partial, malformed, oversized, timeout, provider, and access failures remain distinct.

### `verify_flight_offer`

- Input: active-selection mode by default, with an optional application-issued `sel_` plus 32 lowercase hexadecimal characters. Explicit mode is reserved for a clearly chosen different option; “verify again” always uses the active selection.
- Reads the current caller-scoped selection state (30-minute TTL), requires the resolved record to match the active search, rejects unknown/stale selections locally, resolves the provider offer ID server-side, and calls `POST /flights/verify` only after a match.
- Output: availability, previous and current displayed price/currency, price-change state, bounded documented messages, verification time, and expiration.
- Price change is a success state, not a generic error.
- A provider 404 or locally expired offer directs the user to search again.
- Never prebooks, holds, reserves, collects passengers, takes payment, or books.

## Widget contract

Only two tool-linked React entry widgets are permitted. They share one flight-journey language and reusable search/editor components; no duplicate assistant-specific UI or tool set exists.

### TravelHome

- Fictional Cedar & Cloud Travel shell.
- Flights visibly available.
- Stays, Loyalty, Ground travel, and Experiences visibly “Coming soon” with no buttons, tabs, or disabled actionable controls.
- Familiar labelled route, date, traveller, cabin, currency, and point-of-sale inputs when the host supports starting a follow-up message. An explicit segmented trip-type control defaults new searches to Round trip; One way removes the return field. Natural names are handed to the host model for safe resolution; browser code never guesses an IATA code.
- One conversational example when that host capability is unavailable.
- Loading, unavailable, and malformed-result states.

### FlightResults

- Three options inline; up to ten when the host supplies fullscreen/expanded display mode.
- Boarding-pass-inspired hierarchy without copying third-party assets or styles.
- Named Search/Edit, Results, and Verified fare-review states with host-persisted Back navigation. A prompt may enter at Home/Search or Results; selection and verification advance within the same result widget.
- Route and airport names/codes, carrier facts, optional Nuitee-provided airline imagery with text fallback, separate outbound/return airport-local dates/times, stops, duration, fare family, bounded price breakdown, baggage, terms, documented amenities, verification messages, and freshness disclosure.
- Result cards are explicit selection controls. One **Verify current fare** action appears only after selection.
- Selection is mirrored through the app-only `select_flight_offer` helper, which is hidden from the model. This makes a later “verify this” or “verify again” resolve the same caller-owned fare instead of inferring an option from result order.
- The final state is labelled **Verified fare review** and **Not a ticket or reservation**; it never invents a boarding pass, PNR, barcode, gate, seat, or ticket number.
- Verification success, changed price, expired selection, retryable failure, partial results, empty results, malformed results, and loading are explicit.
- No booking, checkout, reservation, payment, redemption, or handoff action. A production handoff may be added only for an exact allowlisted HTTPS domain and server-owned deep-link/session contract.

Both widgets must work at 280px, adapt to light/dark host themes, use host/native typography, avoid page-horizontal overflow and nested scrolling, expose labels and visible focus, retain 44px practical targets, respect reduced motion, and provide equivalent bounded structured/text fallback.

## Security boundary

```text
Browser widget → Noodle tool → compute gateway → fixed Nuitee HTTP connector
                                      ↘ caller-scoped private selection state
```

- Only origin `https://api.liteapi.travel` and base `https://api.liteapi.travel/v3.0` are authored.
- Only `POST /flights/rates` and `POST /flights/verify` are authored in the active connector.
- Method, origin, base URL, path, headers, and provider offer ID are not model inputs.
- `NUITEE_API_KEY` is a server-side managed secret injected only as `X-API-Key`.
- Widgets have empty `connectDomains` and `frameDomains`; FlightResults allows resource loads only from `https://sandbox.nuitee.flights` and `https://production.nuitee.flights` for validated airline images. Browser code never calls the Nuitee API.
- Compute calls have one-host-call and 12-second ceilings. Search alone permits up to 6 MiB at both connector transport and application parsing so representative large responses can reach bounded normalization; verification retains a 750,000-byte application cap.
- Raw provider errors and bodies are never returned. Public errors are bounded categories.
- Search records and the active selection are caller-scoped, revisioned, private, and expire after 1,800 seconds. A new search clears the active selection.
- Fixture data is test-only, fictional, and unreachable from production tool fulfilment.
- Ordinary tests replace global `fetch` with a failing stub and use only fictional injected provider responses.

Multi-tenant end-user credential brokering is a separate production architecture. Version one has one deployment-owner Nuitee credential and must never ask an end user for it.

## Evidence contract

Claims require the following evidence:

- Package version: registry result, manifest, installed package, and lockfile agree.
- Agent Kit: setup and doctor report current CLI/package and generated-kit versions.
- Contract: current official Nuitee OpenAPI plus reference pages, with ambiguities recorded.
- Unit/widget behavior: hermetic Vitest suite.
- Authoring: default and live `noodle validate --json`.
- Local protocol: default `noodle test --json` and `noodle tools list --json` without credentials.
- Readiness: `noodle check --json`; target-specific checks where available.
- Live provider: prior owner-authorized sandbox smokes prove a bounded one-way search and same-session verification. A hermetic 2.85 MiB regression proves the new search-size path, but a successful large live response still requires recheck; airport lookup remains omitted pending equivalent direct/connector success.

The airport-search route remains deliberately omitted from version one. The latest direct/connector comparison was inconclusive because the direct control redirected to HTML rather than returning valid JSON, so it did not isolate a connector defect. Users may still speak in names: the host resolves clear cases and asks for region/country clarification instead of guessing unfamiliar or ambiguous codes.
- Host UI: real ChatGPT/Claude/other-host render evidence before making a compatibility claim.
- Deployment: hosted health only after explicit authorization; local proof is not hosted proof.

## Future-domain rule

A future travel domain is added only after its official contract, managed credential boundary, bounded normalized schema, model tool, error behavior, hermetic fixtures, widgets (if useful), and end-to-end evidence exist. Until then, change only the noninteractive “Coming soon” copy. Do not register empty tools, fake endpoints, disabled controls, or speculative domain abstractions.
