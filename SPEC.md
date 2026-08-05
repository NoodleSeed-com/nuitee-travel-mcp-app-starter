# Product specification

## Product contract

Nuitee Travel MCP App Starter is a public-ready reference implementation for conversational flight discovery and fare verification using the published `@noodleseed/one` package and official Nuitee Connect APIs. The sample experience uses the wholly fictional brand **Cedar & Cloud Travel**.

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

## Consumption modes

1. **External MCP host:** ChatGPT, Claude, or another host supplies the conversational model. No assistant-model key is required.
2. **Optional embedded assistant:** an authenticated website backend creates a short-lived assistant session. The same travel server, connector, tools, schemas, state, and widgets are reused. Model configuration is separate from `NUITEE_API_KEY`.

The default `src/server.ts` remains credential-free because `@noodleseed/one@0.104.1` still resolves a connector secret before local `noodle test`, including a probed `secret(..., { optional: true })`. It exposes the complete product surface but returns explicit `configuration_required` results for live-only tools. `src/live-server.ts` composes the same product with the managed Nuitee connector after an owner configures the key. No fixture can activate the live tool path.

## Model-visible tools

Exactly three model-visible tools are allowed.

### `open_travel_starter`

- Input: none.
- Works without any provider or model credential.
- Opens TravelHome.
- Flights is available; four future domains are noninteractive.
- Text fallback explains the supported flight workflow and future-domain boundary.

### `search_flights`

- Conversational input: users give city or airport names. The host resolves only unambiguous places, restates the selected airports, and asks for region/country clarification when uncertain. The typed tool receives resolved origin/destination IATA codes plus dates, passengers, cabin, currency, and point-of-sale country.
- One-way or round-trip only; round-trip generates reverse OUTBOUND/INBOUND legs.
- Defaults: one adult, zero children/infants, economy.
- Application policy: exactly three-letter IATA-shaped codes, different endpoints, ISO dates not before the caller's server-authoritative local date, return after departure, one to nine total passengers, at least one adult, infants no greater than adults, age-array lengths equal their counts, child ages 2–11, infant ages 0–1, documented cabin enum, three-letter currency, and two-letter point of sale.
- Provider request: `POST /flights/rates`, JSON, exact documented `legs` array.
- Output: at most ten normalized itineraries, three inline, with opaque `selectionId`; comparison route, separate documented outbound/return legs, carrier, airport-local schedules, bounded documented duration/stops, price/currency, baggage hints/messages, retrieval time, and documented expiration.
- Never outputs an upstream offer ID, logo URL, raw response, fare-basis code, or booking code.
- Empty, partial, malformed, oversized, timeout, provider, and access failures remain distinct.

### `verify_flight_offer`

- Input: only `sel_` plus 32 lowercase hexadecimal characters issued by this application.
- Reads the current caller-scoped selection state (30-minute TTL), requires the record to match the active search, rejects unknown/stale selections locally, resolves the provider offer ID server-side, and calls `POST /flights/verify` only after a match.
- Output: availability, previous and current displayed price/currency, price-change state, bounded documented messages, verification time, and expiration.
- Price change is a success state, not a generic error.
- A provider 404 or locally expired offer directs the user to search again.
- Never prebooks, holds, reserves, collects passengers, takes payment, or books.

## Widget contract

Only two React widgets are permitted.

### TravelHome

- Fictional Cedar & Cloud Travel shell.
- Flights visibly available.
- Stays, Loyalty, Ground travel, and Experiences visibly “Coming soon” with no buttons, tabs, or disabled actionable controls.
- One conversational example for beginning a flight search.
- Loading, unavailable, and malformed-result states.

### FlightResults

- Three options inline; up to ten when the host supplies fullscreen/expanded display mode.
- Boarding-pass-inspired hierarchy without copying third-party assets or styles.
- Route, carrier name/code, separate outbound/return airport-local dates/times, stops, duration, price/currency, baggage hints, verification messages, and freshness disclosure.
- “Verify fare” is the only primary consequential action.
- Verification success, changed price, expired selection, retryable failure, partial results, empty results, malformed results, and loading are explicit.
- No booking, checkout, reservation, payment, redemption, or handoff action.

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
- Widgets have empty `connectDomains`, `resourceDomains`, and `frameDomains`; they call Noodle tools only.
- Compute calls have one-host-call and 12-second ceilings. Parsed bodies above 750,000 UTF-8 bytes are rejected before normalization; the Noodle transport may enforce a smaller upstream hard ceiling.
- Raw provider errors and bodies are never returned. Public errors are bounded categories.
- Selection state is caller-scoped, revisioned, private, and expires after 1,800 seconds.
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
- Live provider: owner-authorized sandbox smokes prove a bounded one-way search and same-session verification. They also preserve route-dependent response-size and airport-GET blockers as explicit limits, not application success claims.

The official airport-search contract is verified, but `find_airports` is deliberately omitted from version one because the current published Noodle connector fails that direct GET while direct provider, synthetic query, and exact-response relay controls pass. Users may still speak in names: the host resolves clear cases and asks for region/country clarification instead of guessing unfamiliar or ambiguous codes.
- Host UI: real ChatGPT/Claude/other-host render evidence before making a compatibility claim.
- Deployment: hosted health only after explicit authorization; local proof is not hosted proof.

## Future-domain rule

A future travel domain is added only after its official contract, managed credential boundary, bounded normalized schema, model tool, error behavior, hermetic fixtures, widgets (if useful), and end-to-end evidence exist. Until then, change only the noninteractive “Coming soon” copy. Do not register empty tools, fake endpoints, disabled controls, or speculative domain abstractions.
