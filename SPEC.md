# Wayfare product specification

## Product contract

Wayfare is an example project by Noodle Seed for conversational travel planning,
built with the published `@noodleseed/one` package and configured Nuitée flight
and hotel APIs. Wayfare is the example product identity; Noodle Seed is its
author and MCP/assistant foundation. Developers can use the project as a starter
for their own travel experience. The [Wayfare brand guidelines](docs/brand/wayfare-brand-guidelines.md)
define the included product's presentation contract. Source-release, named-host,
and hosted-production evidence remain separate gates.

Success means a developer can run the credential-free homepage and expanded
preview, configure their own provider and assistant services, search and verify
flights, discover and select stays, explore fictional experiences, and identify
each customization, data-source, and security boundary.

This repository is not an official Nuitee connector and must not imply a Nuitee, airline, travel-agency, or financial-services partnership.

## Version-one boundary

The baseline profile supports provider-backed flights. Expanded live and
embedded profiles also support provider-backed hotel search and application
selection; the preview profile uses explicit fictional data.

| Domain | Baseline profile | Expanded profiles |
| --- | --- | --- |
| Flights | Search, compare, and verify when live access is configured | Same shared flight tools |
| Stays | Noninteractive coming-soon presentation | Live hotel search/selection; fictional stays in the preview profile |
| Experiences | Noninteractive coming-soon presentation | Fictional Lisbon/Tokyo discovery, detail, and two-item comparison |
| Loyalty and reward flights | Noninteractive coming-soon presentation | Illustrative balance, benefits, and reward ideas; no account or redemption |
| Travel protection | Not registered | Fictional comparisons; no quote, policy, eligibility decision, or purchase |
| Ground travel | Noninteractive coming-soon presentation | No connected car or ground-travel service |


Version one has no multicity search, prebooking, booking, inventory hold, passenger collection, seat or baggage purchase, payment, cancellation, refund, amendment, loyalty earning/redemption, hotel booking, car search, or arbitrary HTTP. It produces no checkout or handoff URL.

### Website starting experience

The guest website exposes one general travel composer. The assistant chooses
only among tools registered in the active server profile; the interface does
not require a capability choice or imply that future domains are operational.

## Consumption modes

1. **External MCP host:** ChatGPT, Claude, or another host supplies the conversational model. No assistant-model key is required.
2. **Guest embedded assistant:** the website uses a public embed ID and exact
   service origin to start an anonymous session after the first message. The
   same tools, schemas, state, and Apps are reused; model credentials remain
   server-side and separate from `NUITEE_API_KEY`. An authenticated backend
   session exchange is an optional extension, not the default website path.

The default `src/server.ts` remains credential-free because the supported connector composition resolves its managed secret when the connector is active. It exposes the baseline flight surface but returns explicit `configuration_required` results for live-only tools. `src/live-server.ts` composes the same product with the managed Nuitee connector after an owner configures the key. No fixture can activate the live tool path.

## Model-visible tools

The baseline public projection contains four model-visible tools plus one App-only helper: `open_travel_starter`, `plan_flight_search`, `search_flights`, and `verify_flight_offer` are model-visible; `select_flight_offer` is available only to the linked App bridge.

Expanded profiles add model-visible `search_hotels`, `search_experiences`,
`open_loyalty`, `compare_reward_flights`, `compare_travel_insurance`, and
`review_trip`, plus App-only `select_hotel`. Live/embedded hotel reads use the
fixed Nuitée connector; the preview substitutes an explicitly fictional hotel
profile. Experiences, rewards, and protection are illustrative in every expanded
profile and never serve as fallback inventory for a failed live read.

### `open_travel_starter`

- Input: none.
- Works without any provider or model credential.
- Opens TravelHome.
- Baseline availability describes the flight workflow and noninteractive future
  domains. Expanded availability distinguishes configured live flight/hotel
  reads from illustrative experiences, rewards, and protection.
- Text fallback states the active profile's data-source and no-transaction boundary.

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

### `search_experiences` (expanded profiles)

- Requires a destination and exact stay-date window; party size and currency
  use the bounded schema defaults. Interest and accessibility filters apply
  only when explicitly requested; `STEP_FREE` represents a fictional catalog
  filter, not a verified accessibility service.
- Reads only the deterministic Lisbon/Tokyo catalog in
  `src/experience-fixtures.ts`. Other destinations return
  `UNSUPPORTED_DESTINATION`; unmatched filters return `NO_MATCHING_EXPERIENCES`.
- Returns at most six ideas with bounded descriptions, fictional operator
  labels, duration, area, accessibility, inclusions, restrictions, prices,
  cancellation terms, and at most four sample slots per idea.
- Every result carries `dataSource: illustrative`, `source: WAYFARE_DEMO`, and
  `isFictional: true`. Capacity and sample times are synthetic.
- No experience provider is called. There is no server-side experience
  selection, save-to-trip, inventory hold, admission check, or booking tool.
  `review_trip` continues to resolve only flight and hotel selections.

## Widget contract

The baseline links TravelHome and FlightResults. Expanded profiles also link
hotel, experience, loyalty, reward-flight, trip-review, and protection Apps.
They share the same tools across the website and external hosts; there is no
duplicate assistant-specific business implementation.

### TravelHome

- Wayfare example identity, authored by Noodle Seed.
- A compact capability overview reflects the selected server profile.
- Baseline future domains remain noninteractive; expanded disclosures label
  fictional experiences, rewards, protection, and any preview hotel data.
- Where supported, useful follow-up prompts continue the conversation. The
  host resolves unambiguous place names; browser code never guesses IATA codes.
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

### ExperienceResults

- A labelled horizontal carousel presents current fictional search results.
- Details show the fictional operator, inclusions, restrictions, sample times,
  access, price, and policy; a follow-up action asks the assistant for context.
- Compare exactly two returned ideas using persisted widget view state and
  optional model context. This is inspection, not a server-side trip selection.
- Fixed Unsplash photography is decorative and attributed. It does not make
  the fictional operators, availability, or capacity real.
- Empty, unsupported-destination, loading, malformed, and error states retain
  useful fallback and never generate replacement inventory.

All widgets follow the Wayfare brand contract, including the approved ChatGPT
host-theme adaptation. The website stays light with Host Grotesk. Preserve
320px and 200% text-zoom use, 44px targets, visible focus, reduced motion,
readable text fallback, and the conversation's vertical scrolling; repeated
cards use labelled horizontal carousels.

## Security boundary

```text
Browser widget → Noodle tool → compute gateway → fixed Nuitee HTTP connector
                                      ↘ caller-scoped private selection state
```

- Only origin `https://api.liteapi.travel` and base `https://api.liteapi.travel/v3.0` are authored.
- The flight connector permits `POST /flights/rates` and `POST /flights/verify`;
  expanded live/embedded profiles add fixed `POST /hotels/rates`. The experience
  compute tool uses the local fictional catalog and no provider HTTP operation.
- Method, origin, base URL, path, headers, and provider offer ID are not model inputs.
- `NUITEE_API_KEY` is a server-side managed secret injected only as `X-API-Key`.
- Baseline widgets have empty `connectDomains` and `frameDomains`. FlightResults
  permits validated airline images from the exact Nuitée Flights asset origins.
  Hotels may load `https://snaphotelapi.com` imagery and use explicitly configured
  Mapbox domains; experiences declare `https://images.unsplash.com` as a
  resource-only origin. Browser code never calls the Nuitée API. Remote image
  requests can disclose ordinary network metadata; see [SECURITY.md](SECURITY.md).
- Compute calls have one-host-call and 12-second ceilings. Search alone permits up to 6 MiB at both connector transport and application parsing so representative large responses can reach bounded normalization; verification retains a 750,000-byte application cap.
- Raw provider errors and bodies are never returned. Public errors are bounded categories.
- Search records and the active selection are caller-scoped, revisioned, private, and expire after 1,800 seconds. A new search clears the active selection.
- Provider-response fixtures are test-only and never activate a live tool
  fallback. Explicitly illustrative hotel-preview, experience, reward, and
  protection catalogs are intentional runtime content in their stated profiles.
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

A new live travel domain requires an evidenced provider contract, credential
boundary, bounded schema, tool, error behavior, hermetic tests, useful UI, and
end-to-end proof. A deliberately fictional demonstration may use a bounded local
catalog with persistent provenance, as experiences do; it must never imply live
service or transaction support. Other unsupported domains stay noninteractive.
Do not register empty tools, fake endpoints, or speculative transaction actions.
