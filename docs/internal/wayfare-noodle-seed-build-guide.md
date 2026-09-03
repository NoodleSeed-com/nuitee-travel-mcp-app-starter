# Wayfare Noodle Seed build guide

> **Internal-only — remove from the public release tree and public Git history.**

Status: implementation handoff; no runtime changes have been made

Reviewed: 2026-09-04
Primary audience: a coding agent working in this repository

This is the decision-complete guide for extending the existing Noodle Seed MCP
App into the approved Wayfare product. Read the product specification, domain
model, demo catalog, agent behavior, and Nuitee investigation before proposing
runtime edits.

## Required reading order

1. [Wayfare conversational product specification](./wayfare-conversational-product-spec.md)
2. [Wayfare canonical domain model](./wayfare-domain-model.md)
3. [Nuitee API investigation](./nuitee-api-investigation.md)
4. [Wayfare demo data catalog](./wayfare-demo-data-catalog.md)
5. [Wayfare agent behavior and acceptance](./wayfare-agent-behavior-and-acceptance.md)
6. Current repository source, tests, and generated Noodle instructions

The documents describe a target. Inspect the configured TypeScript entrypoint
and the machine-readable Noodle command surface before implementation. Preserve
the current Search -> Select -> Verify flight behavior unless an approved step
explicitly replaces it.

## Noodle route and lifecycle

Use the project-local `noodle-seed` skill and select the route that owns the
current implementation phase. This work will eventually require:

- `authoring-mcp-servers` for model-visible tools and server behavior;
- `building-mcp-apps` for linked views;
- `connecting-apis-to-mcp` only after all required live API evidence inputs are
  present for the exact operation; and
- `creating-product-agent-guides` only after the declared capability surface
  exists.

Do not infer command flags from this document. Discover the installed command
surface with `noodle commands --json`, then drive validation from canonical
JSON envelopes.

Minimum local proof after each implementation slice:

1. `noodle validate --json`;
2. repair each structured error at its exact path;
3. `noodle test --json`;
4. for App/view work, `noodle check --json` and the relevant local DevTools
   inspection; and
5. repository tests and browser tests proportionate to the changed slice.

No document in this package authorizes a deploy, hosted config change, secret
write, provider mutation, product-skill replacement, or publication.

## Architectural shape

Keep four boundaries small and explicit:

```text
Model and MCP App
        |
        v
Wayfare MCP capabilities
        |
        v
Wayfare domain services and session state
        |
        +--> Nuitee Lite read adapters
        |
        +--> removable Wayfare demo-data adapters
```

### Capability layer

Owns schemas, authorization/visibility, annotations, bounded results, linked
views, error vocabulary, and confirmation requirements. It accepts only
canonical input and opaque references.

### Domain layer

Owns trip rules, server-side selection resolution, pricing, loyalty,
redemption, voucher eligibility, review validity, confirmation, idempotency,
change/cancellation previews, aggregate statuses, and audit events.

### Live adapter layer

Owns Nuitee request mapping, fixed origins, authentication by managed secret,
timeouts, response-size limits, provider error mapping, raw response parsing,
normalization, and expiring provider state. No Nuitee object becomes the MCP
contract.

### Demo adapter layer

Owns fictional profiles, experiences, loyalty, vouchers, payment, booking
policies, and session mutations. It must be easy to identify and remove. It
implements the same Wayfare domain contracts a real downstream integration
would implement.

## Proposed MCP capability surface

Names below are the approved target names unless existing compatibility makes a
documented alias necessary. Do not add all tools in one unreviewable change;
deliver vertical slices with tests.

### Discovery and selection

| Tool | Effect | Source | Linked view |
| --- | --- | --- | --- |
| `open_travel_starter` | Read-only entry context | Wayfare config | Travel home |
| `plan_flight_search` | Read-only structured plan when a required date is missing | Wayfare | None |
| `search_flights` | Read-only current one-way/return offers | Nuitee Lite | Flight comparison |
| `verify_flight_offer` | Read-only verification of the active flight selection | Nuitee Lite | Flight comparison/update |
| `search_hotels` | Read-only current hotel/room/rate offers | Nuitee Lite | Hotel comparison |
| `search_experiences` | Read-only deterministic tour/options/slot results | Wayfare demo | Experience comparison |
| `update_trip_draft` | Add, replace, or remove an offer selection by opaque reference | Session | Updated trip summary |

### Wallet and pricing

| Tool | Effect | Source | Linked view |
| --- | --- | --- | --- |
| `get_loyalty_account` | Read-only bounded balance, tier, policy, and activity | Wayfare demo | Member wallet |
| `list_vouchers` | Read-only bounded eligible/available vouchers | Wayfare demo | Member wallet |
| `preview_points_redemption` | Read-only points-to-voucher preview | Wayfare demo | Member wallet/review |
| `confirm_points_redemption` | Session mutation after explicit approval | Wayfare demo | Member wallet/review |
| `apply_trip_voucher` | Reserve or remove one voucher against one eligible component | Session | Booking review |
| `quote_trip` | Recalculate the current server-owned draft | Mixed | Booking review |

### Booking and servicing

| Tool | Effect | Source | Linked view |
| --- | --- | --- | --- |
| `prepare_trip_booking` | Create an immutable, expiring review for the current draft | Mixed | Booking review |
| `confirm_trip_booking` | Create the fictional trip after explicit confirmation | Wayfare demo | Confirmed itinerary |
| `get_trip` | Read-only retrieval of the current session trip | Wayfare demo | Confirmed itinerary |
| `preview_trip_change` | Read-only change impact and price/refund preview | Mixed or demo | Mutation preview |
| `confirm_trip_change` | Apply the bound fictional change after confirmation | Wayfare demo | Updated itinerary |
| `preview_trip_cancellation` | Read-only component or whole-trip cancellation impact | Wayfare demo | Mutation preview |
| `confirm_trip_cancellation` | Apply the bound fictional cancellation after confirmation | Wayfare demo | Updated itinerary |

Do not expose a generic arbitrary provider-call tool, raw CRUD surface, payment
tool, profile switcher, or one monolithic `book_everything` tool.

## Capability contracts

The coding agent should express each input and result as strict TypeScript
schemas using the repository's current Noodle authoring API. The field lists
below are semantic requirements, not copy-paste source.

### `search_flights`

Input:

- origin and destination airport codes resolved from unambiguous natural
  places;
- `ONE_WAY` or `ROUND_TRIP`;
- departure date and a later return date for a round trip;
- adults, children, and infants within provider-supported bounds;
- cabin class;
- display currency and pricing market; and
- optional bounded search preferences.

Result:

- canonical search context with visible assumptions;
- at most ten `FlightOffer` summaries;
- one opaque search handle and opaque offer references;
- request/observation time and live provenance;
- a truthful empty state; or
- one mapped provider error with retry guidance.

The current response-size evidence and round-trip normalization in
`docs/nuitee-flights-contract.md` remain applicable. Never return raw journeys,
provider offer IDs, or the entire response.

### `verify_flight_offer`

Input is the active application-issued selection reference only. Resolve the
provider offer from expiring server state. Return `VERIFIED`, `CHANGED`,
`EXPIRED`, or `UNAVAILABLE`, including a bounded field-level summary of a price,
schedule, baggage, or policy change. Verification does not select, hold, book,
or charge.

### `search_hotels`

Input:

- destination/location resolution accepted by the adapter;
- check-in and checkout dates;
- rooms and adults/children per room;
- display currency and market;
- optional bounded filters such as star rating, board basis, amenities, and
  refundable preference.

Result:

- canonical stay context and applied assumptions;
- a bounded result set with `HotelOffer` projections;
- opaque hotel/rate references and observation/expiry data;
- live provenance; and
- a distinct empty or provider-error result.

Join Hotel Data only for properties in the bounded rate result or for a
selected property. Do not download or expose bulk hotel content to the model.

### `search_experiences`

Input:

- canonical destination;
- date range within the stay;
- participant quantities;
- display currency;
- optional interest/accessibility/language filters; and
- optional cursor.

Result:

- whether the destination is in the curated catalog;
- bounded `ExperienceOffer` results with tour, option, slot, participant, price,
  policy, and capacity fields;
- fictional provenance and disclosure;
- opaque selection references; and
- a normal `UNSUPPORTED_DESTINATION` empty reason when inventory is absent.

Do not reproduce Nuitee's generic `object` experience responses. Use the
explicit canonical model.

### `update_trip_draft`

Input:

- current draft reference;
- action: `ADD_OR_REPLACE` or `REMOVE`;
- component type: `FLIGHT`, `HOTEL`, or `EXPERIENCE`; and
- application-issued offer/selection reference when adding.

The server resolves the selection, verifies session ownership, checks expiry
and conflicts, recalculates dates/participants, increments the draft revision,
and invalidates stale quotes/reviews. For an experience, allow a quantity or
participant allocation only within the resolved offer's participant schema.

The result returns a bounded trip summary and invalidation reasons. It never
accepts a caller-supplied price, provider ID, status, or policy.

### `get_loyalty_account`

Accept no member ID. Resolve the fictional member from the session. Return tier,
available/pending points, policy summary, and at most ten recent events. Omit
contact fields and payment data.

### `list_vouchers`

Accept optional eligibility context derived from the current draft. Return a
bounded list with masked code, discount, eligible components, minimum spend,
validity, remaining uses, and status. Never support arbitrary guest lookup.

### `preview_points_redemption`

Input is integer points, current draft, and target `FLIGHT` or `HOTEL`
component. Validate policy, balance, eligibility, and maximum discount. Return
the proposed fixed-value voucher, projected balance, target, and expiry without
changing state.

### `confirm_points_redemption`

Input is the server-issued redemption preview/token and an idempotency key.
Require clear user approval after the preview. Create one session voucher and
reserve the points; replay returns the same voucher. Same-key/different-preview
reuse fails closed.

### `apply_trip_voucher`

Input is the current draft, one server-issued voucher reference, target
component, and action `APPLY` or `REMOVE`. Validate ownership, status, validity,
currency, minimum spend, eligibility, and stacking. Recalculate the quote. This
is reversible draft state, but it still requires the user's clear instruction.

### `quote_trip`

Accept the current draft reference only. Resolve every component server-side,
reject conflicts or expired selections, apply the pricing order from the domain
model, and return an expiring `TripQuote`. Mixed-source line items retain their
own provenance.

### `prepare_trip_booking`

Accept the current draft reference. Require:

- one verified, unexpired flight;
- one selected hotel;
- no experience schedule conflicts;
- consistent traveler and participant counts;
- valid rewards and voucher state;
- one currency across the quote; and
- the fictional saved payment method.

Re-verify or reject stale live components according to their exact provider
contract. Return an immutable `BookingReview` and a separately protected
confirmation token bound to session, member, draft revision, review, and
expiry. Preparing does not book, charge, debit points, or consume a voucher.

### `confirm_trip_booking`

Accept only the bound confirmation token and an idempotency key. Tool
description and product guide must require explicit approval of the current
review. Atomically create the `WayfareTrip`, component reservations, fictional
payment, voucher consumption, loyalty debit/reservation change, pending points,
and audit events.

Return:

- Wayfare trip reference and aggregate status;
- bounded component confirmations;
- final price/rewards summary;
- next servicing actions;
- persistent fictional confirmation disclosure; and
- the linked itinerary view.

Never call a Nuitee booking or payment mutation from this tool.

### `get_trip`

Accept an optional current-session trip reference. Do not support arbitrary
cross-member or unbounded booking searches. Return the latest bounded itinerary,
component statuses, price summary, rewards effects, and audit timeline.

### `preview_trip_change`

Input is a current-session trip reference, target component, and structured
requested change. Resolve alternative live flight/hotel offers through the same
search/verification boundaries where required; use fixtures for experiences.
Return an expiring preview containing exact effects, price difference,
penalties/refund, reward/voucher effects, and unaffected reservations. Do not
mutate the trip.

### `confirm_trip_change`

Accept only the bound change preview/token and idempotency key after explicit
approval. Atomically apply fictional state, append events, update aggregate
status, and return the updated itinerary. Do not mutate Nuitee.

### `preview_trip_cancellation`

Input is a current-session trip reference and exact scope: one or more component
references or `WHOLE_TRIP`. Return an expiring fictional preview with affected
and unaffected reservations, penalties, refund, points/voucher restoration,
and post-cancellation aggregate status. It must make whole-trip scope visually
and textually unmistakable.

### `confirm_trip_cancellation`

Accept only the bound cancellation preview/token and idempotency key after
explicit approval. Mark the targeted reservations cancelled, update fictional
payment/refund and rewards state, append events, derive aggregate status, and
return the updated itinerary. Treat it as destructive even though the data is
fictional.

## Annotations, visibility, and authorization intent

Use the exact annotation API exposed by the installed Noodle authoring version.
The semantic target is:

- discovery, wallet reads, quoting, retrieval, and mutation previews are
  read-only and idempotent;
- live Nuitee reads are open-world; fixture-only reads are closed-world;
- draft selection, redemption confirmation, voucher application, booking, and
  change confirmation are state-changing;
- cancellation confirmation is state-changing and destructive;
- every confirmation capability has idempotent replay semantics even though it
  is not read-only; and
- tools needed for natural-language use are model-visible. Views may invoke the
  same bounded actions with opaque references; do not create a separate weaker
  browser-only mutation path.

Do not mark a capability safer than its behavior. Authorization remains
session-scoped even with a fictional member, so a fork can replace the member
source without redesigning every tool.

## Error vocabulary

Return typed, user-actionable errors without provider bodies:

| Code | Meaning | Agent action |
| --- | --- | --- |
| `INVALID_TRIP_INPUT` | Dates, party, occupancy, or route violates schema | Ask for the one missing or conflicting field. |
| `NO_RESULTS` | Valid live search completed with no offers | Offer one relevant refinement. |
| `UNSUPPORTED_DESTINATION` | No fictional experiences are configured | Continue flight/hotel planning normally. |
| `PROVIDER_UNAVAILABLE` | Nuitee transport or service failure | Preserve state, explain the affected domain, and avoid fake fallback. |
| `OFFER_EXPIRED` | Server-held provider selection can no longer be used | Re-search the affected domain. |
| `OFFER_CHANGED` | Verification found a material change | Show the difference and require reselection/acceptance. |
| `SELECTION_NOT_FOUND` | Opaque reference is invalid, expired, or wrong-session | Reopen current results; never ask for a provider ID. |
| `DRAFT_CONFLICT` | Dates, participants, or schedules conflict | Explain the smallest conflicting choice. |
| `INSUFFICIENT_POINTS` | Redemption exceeds available policy balance | Offer the maximum valid redemption. |
| `VOUCHER_INELIGIBLE` | Voucher fails target, validity, spend, or stacking rules | Explain the bounded reason and show eligible alternatives. |
| `REVIEW_STALE` | Draft revision, offer, or expiry no longer matches | Re-prepare the review. |
| `CONFIRMATION_REQUIRED` | Action lacks explicit approval of the bound preview | Present the current review and ask clearly. |
| `IDEMPOTENCY_CONFLICT` | Same key was used with a different bound action | Stop and report safely; do not retry with guessed state. |
| `TRIP_NOT_FOUND` | No matching current-session trip | Offer the session's active trip if one exists. |
| `CHANGE_NOT_ALLOWED` | Fictional policy forbids the requested change | Explain the policy and alternative cancellation path. |
| `CANCELLATION_NOT_ALLOWED` | Fictional cutoff has passed | Explain without mutating state. |

Expected empty states are results, not exceptions. Do not return stack traces,
request headers, API responses, credentials, or internal identifiers.

## Session state requirements

- Partition every draft, selection, review, trip, preview, and idempotency record
  by a non-user-controlled session principal.
- Apply a documented TTL to search handles, reviews, mutation previews, and the
  session trip.
- Use server time, with a test clock for deterministic tests.
- Make transitions atomic within the session store.
- Record same-key/same-body results and reject same-key/different-body replay.
- Resolve all computed values from current state rather than caller input.
- Reset cleanly when the session expires.

An in-memory implementation is acceptable for the starter's session-scoped
contract if it is explicit that horizontal scaling and durable recovery are not
provided. Do not imply that it is a production database primitive.

## MCP App view plan

Reuse the existing view architecture and design system. Add only views that make
dense information materially easier to understand:

| View | Purpose | Primary action |
| --- | --- | --- |
| Flight comparison | Compare bounded live return-flight offers and verification changes | Select one flight |
| Hotel comparison | Compare live properties, rooms, rates, and cancellation summaries | Select one stay |
| Experience comparison | Compare fictional tours, options, slots, and participant prices | Add an experience |
| Member wallet | Understand points, redemption value, and eligible vouchers | Preview redemption or apply voucher |
| Booking review | Inspect the complete current trip and final total | Return explicit confirmation through conversation |
| Confirmed itinerary | Inspect confirmations, status, policies, and timeline | Ask to change or cancel |
| Mutation preview | Inspect affected components, cost/refund, and rewards effects | Return explicit confirmation through conversation |

One view should have one clear purpose and at most one primary action. Views
must render safely without assuming a specific host, theme, width, or hover.
Text results remain complete enough for hosts that do not render MCP Apps.

## Product `agentGuide` requirement

This product requires an `agentGuide` because safe use depends on ordering many
capabilities, distinguishing live and fictional evidence, asking minimal
questions, and enforcing review-before-confirmation.

Do not hand-edit `.agents/skills/nuitee-travel-mcp-app-starter/`. The existing
skill is generated from the current flight-only guide and explicitly forbids
booking, loyalty, and hotel behavior.

After all referenced tools are declared and tested:

1. author the approved guide in the configured TypeScript server;
2. map every workflow step to an exact declared capability;
3. run Noodle validation and smoke tests;
4. preview `noodle agents setup --json --regenerate-app-skill` or the exact
   equivalent reported by the installed command catalog;
5. report the planned target, ownership, removals, and replacements; and
6. obtain separate approval before writing the regenerated product skill.

The workflow content to encode is specified in
[Wayfare agent behavior and acceptance](./wayfare-agent-behavior-and-acceptance.md).

## Recommended implementation slices

1. Canonical primitives, source metadata, session partitioning, and strict
   schema tests.
2. Live hotel search/content adapter and hotel comparison, preserving the
   existing flight surface.
3. Removable experience fixtures, search, and comparison for two pilot cities;
   expand to all twelve only after the contract passes.
4. Trip draft and generic server-owned selection behavior.
5. Fictional member, loyalty, vouchers, redemption, and wallet.
6. Quote and immutable booking review.
7. Atomic fictional booking and confirmed itinerary.
8. Change and cancellation preview/confirmation.
9. Remaining destination fixtures, empty states, accessibility, and browser
   evidence.
10. TypeScript `agentGuide`, validation, generated-skill preview, and separately
    approved regeneration.

Each slice should add failing tests first, implement the smallest complete
vertical behavior, and finish with current machine-readable Noodle evidence.

## Testing requirements

At minimum, prove:

- schema rejection of malformed dates, currencies, money, occupancy, statuses,
  and arbitrary objects;
- round-trip flight search and verification remain correct;
- hotel mapping is bounded and never leaks provider IDs;
- all twelve experience destinations return deterministic inventory;
- an unsupported city returns a successful empty result;
- fixture schedules remain useful relative to future search dates;
- every selection resolves only in its own session;
- draft revision invalidates stale quotes and reviews;
- points preview does not mutate balance;
- confirmed redemption is idempotent and reserves rather than prematurely
  debits points;
- voucher eligibility, limits, minimum spend, cap, expiry, and stacking rules;
- atomic booking success and rollback on injected failure;
- duplicate booking replay returns one trip;
- same idempotency key with a different action fails closed;
- preview-only change/cancellation leaves state untouched;
- confirmed change/cancellation matches the bound preview;
- component and aggregate statuses remain consistent;
- fictional refunds and points restoration follow policy;
- cross-session retrieval fails;
- live provider error never activates fictional fallback;
- every model result and view shows correct provenance/disclosure;
- views work with keyboard, touch, narrow widths, zoom/reflow, dark theme, and
  reduced motion; and
- no credential-shaped or raw-provider material enters snapshots or tracked
  files.

## Completion handoff

The implementing agent must report:

- exact changed files and declared capabilities;
- Noodle validation, smoke, App check, and repository-test evidence;
- fixture and live paths exercised;
- the first unproven layer, especially hosted/deployed behavior;
- whether any provider mutation was attempted (the expected answer is no);
- the generated product-skill preview and whether writing it remains
  unauthorized; and
- any intentional difference from this design with the builder's approval.
