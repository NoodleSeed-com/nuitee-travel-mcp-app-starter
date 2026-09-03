# Wayfare conversational travel product specification

> **Internal-only — remove from the public release tree and public Git history.**

Status: approved product design; implementation not started

Reviewed: 2026-09-04
Audience: the coding agent and developers building Wayfare with Noodle Seed

This specification defines the intended product. It does not claim that the
current MCP server implements the capabilities below. The current runtime
remains the source of truth for shipped behavior until this design is built,
validated, and deployed.

## Product outcome

Wayfare is a production-running conversational travel agent. A traveler can
move from an initial idea to a complete fictional booking, then retrieve,
change, or cancel that trip, without leaving the conversation.

The initial complete-trip scope is:

- one destination;
- a return flight with outbound and inbound legs;
- one hotel stay aligned to the travel dates;
- zero or more optional experiences;
- one pre-authenticated fictional member;
- loyalty points and vouchers;
- one saved, masked fictional payment method;
- one combined trip review and explicit confirmation; and
- conversational post-booking retrieval, changes, and cancellation.

The experience is cohesive to the traveler, but the underlying data remains
composable. A `WayfareTrip` contains separate flight, hotel, and experience
reservations so each component can have its own price, status, confirmation,
policy, and history.

## Approved product decisions

| Decision | Approved direction |
| --- | --- |
| Booking boundary | Simulate the complete booking lifecycle with fictional transactional state. Never create a real provider booking. |
| Trip shape | One customer-facing Wayfare trip containing separate component reservations. |
| Flight scope | One-way remains supported by the existing flight surface; the canonical full-trip journey uses a Nuitee-supported return flight. Multi-city is out of scope. |
| Identity | One fixed, pre-authenticated fictional member. No login, profile picker, or conversational identity switching. |
| Payment | One saved, masked fictional method. Never collect or retain a real card number, security code, bank credential, or payment token. |
| Data model | Stable Wayfare-owned domain model with provider adapters. Do not expose Nuitee payloads as the product contract. |
| Live provider use | Nuitee Lite is read-only discovery and verification: flight search, flight verification, hotel rate search, and hotel content. |
| Fictional domains | Experiences, member data, loyalty, vouchers, payments, bookings, confirmations, changes, cancellations, and history. |
| Rewards | Redeeming points creates a voucher; the voucher can discount one eligible flight or hotel component. |
| Confirmation | One explicit trip-level confirmation before booking. Each later change or cancellation requires a new preview and explicit confirmation. |
| Persistence | Simulated state lasts for the current conversation/session and resets afterward. |
| Demo packaging | Fictional data is enabled by default and isolated so a developer can remove or replace it. |
| MCP shape | Composable domain tools orchestrated by the agent, not one monolithic travel tool. |
| UI | Lightweight MCP App views for dense comparison and review. Conversation remains the controller and every action remains conversationally available. |

## Evidence and source-of-truth boundary

Wayfare must always distinguish current provider observations from fictional
demo behavior.

### Live Nuitee Lite data

Use the dedicated Lite credential for:

- flight search;
- verification of a selected flight offer;
- hotel rate and availability search; and
- hotel/property content needed to explain an option.

All live operations in this version are read-only. A search or verification
response is an observation, not a reservation. Prices and availability may
change until the simulated booking is confirmed.

### Fictional Wayfare data

Use deterministic project fixtures for:

- the member and traveler profile;
- the saved masked payment method;
- points balances, accrual, and redemption;
- vouchers and voucher usage;
- experience tours, options, schedules, and availability;
- prebooking, payment, booking, and confirmations;
- changes, cancellation, refunds, and history; and
- all provider-like documents generated after confirmation.

Fictional data must be labeled `WAYFARE_DEMO` in structured output. The agent
must describe it as simulated or illustrative at the first relevant use and in
every booking confirmation. It must never imply that Nuitee, an airline, a
hotel, an experience operator, or a payment processor accepted the booking.

### Failure integrity

A live provider failure remains a live provider failure. Wayfare must not:

- replace a failed Nuitee flight or hotel search with fixtures;
- reuse stale offers without labeling them stale;
- fabricate a successful verification;
- convert an error into an empty result; or
- imply that a simulated confirmation proves provider availability.

The agent may continue with unaffected domains, preserve the current trip
draft, and offer one relevant recovery action.

## Complete conversational journey

### 1. Understand the trip

The agent extracts destination, dates or date intent, traveler count, rooms,
and meaningful preferences from natural language. It asks one focused question
only when a required value cannot be inferred safely.

Defaults may reduce friction after the traveler has given a usable trip idea:

- one adult;
- one room;
- Economy cabin;
- the member's configured display currency; and
- no experiences unless the traveler asks or accepts a suggestion.

Every applied default must be visible and easy to change. Page-provided
defaults are convenience hints only; explicit traveler instructions win.

### 2. Search and compare live flights

The agent searches current Nuitee Lite offers, presents at most ten normalized
options, and preserves separate outbound and inbound legs for return trips.
It may help compare price, stops, schedule, duration, baggage, and fare rules.

Selection does not book. Before the flight can enter the final review, the
selected offer must pass the existing active-offer verification boundary.

### 3. Search and compare live hotels

The agent searches hotels using the destination, check-in/check-out dates,
occupancy, rooms, and display currency derived from the trip. It presents a
bounded list with property content, room/rate plan, board basis, price, and
cancellation terms.

Selection does not reserve. The final trip quote records when the hotel rate
was observed and that simulated confirmation does not create a provider hold.

### 4. Discover fictional experiences

The agent searches deterministic Wayfare experience fixtures for the selected
destination, dates, party, and interests. Results expose tour content, booking
options, participant categories, time slots, meeting information, inclusions,
restrictions, price, and cancellation policy.

The curated launch catalog covers:

- Rome;
- London;
- Istanbul;
- Lisbon;
- Banff;
- Tokyo;
- New York;
- Paris;
- Bangkok;
- Dubai;
- Hong Kong; and
- Singapore.

For other destinations, no configured experience inventory is a normal empty
result. The agent explains this without calling it an error and continues the
flight-and-hotel journey. Suggested prompts should favor catalog destinations
so the complete experience remains discoverable.

### 5. Use loyalty and vouchers

The agent can explain the fictional member's available and pending points,
tier, recent activity, and current vouchers. It must not expose the complete
upstream-style member record when a bounded balance or benefit summary is
enough.

Points redemption follows this sequence:

1. Preview the number of points, monetary value, eligible component, and
   post-redemption balance.
2. Obtain explicit approval.
3. Create a session-scoped fixed-value voucher.
4. Apply it to one eligible flight or hotel component.
5. Reserve the points in the draft; debit them only when booking is confirmed.

If the draft is abandoned, the reservation is released. Cancellation restores
points or voucher value according to the explicit fictional policy included in
the booking review.

### 6. Prepare one combined review

The agent assembles an immutable booking review containing:

- route, dates, travelers, and rooms;
- selected and verified flight;
- selected hotel and rate plan;
- selected experiences and time slots;
- component prices and provenance;
- taxes and fees;
- voucher and loyalty effects;
- total due in one currency;
- important change and cancellation terms;
- the masked fictional payment method;
- expiry of the review; and
- a persistent statement that confirmation is simulated.

The review is invalidated by any material draft change, expired live offer, or
failed re-verification.

### 7. Confirm the complete trip

The agent may call the confirmation capability only after the traveler clearly
approves the current review. A vague acknowledgement given before the review,
selection of an option, or a click that merely opens details is not approval.

Confirmation atomically creates the session-scoped `WayfareTrip`, component
reservations, fictional confirmation references, loyalty events, voucher usage,
and a fictional payment record. An idempotency key ensures a replay returns the
same trip instead of creating a duplicate.

### 8. Retrieve, change, or cancel

The agent can retrieve the active session trip by its Wayfare trip reference or
from current conversation context.

Every change uses preview then confirm:

1. Describe the requested change.
2. Re-search or recalculate affected components when needed.
3. Present availability, price difference, penalties, refund, and unaffected
   reservations.
4. Ask for explicit confirmation.
5. Apply the change idempotently and append an audit event.

Cancellation uses the same pattern. The traveler can cancel an eligible
component or the whole trip. The preview must make scope unmistakable and show
the fictional refund and rewards restoration before confirmation.

## Conversation and view relationship

Conversation owns intent, orchestration, clarification, permission, and the
journey state. MCP App views make high-density information easier to scan:

- flight comparison;
- hotel comparison;
- experience comparison;
- loyalty and vouchers;
- combined booking review; and
- confirmed itinerary or change/cancellation preview.

Views must not become a parallel website workflow. A traveler can perform the
same meaningful action in natural language. View controls operate only on
application-issued opaque references and must never send prices, balances,
provider IDs, or confirmation state as trusted browser input.

## Safety and privacy requirements

- Never place API keys, credentials, raw provider responses, payment secrets,
  provider offer IDs, or customer records in prompts, views, logs, fixtures,
  documentation, or test snapshots.
- Never request real payment details or passenger documents in the demo.
- Never treat model text or browser state as authority for identity, price,
  points, voucher balance, eligibility, or reservation state.
- Resolve all opaque selections and calculations server-side.
- Bound every list and response before it reaches the model or browser.
- Keep PII-shaped fixture fields minimal and unmistakably fictional.
- Require explicit confirmation at every transactional boundary.
- Preserve an append-only session audit trail for all fictional mutations.
- Make idempotent replay behavior explicit for booking, change, cancellation,
  redemption, and voucher application.

## Out of scope for the first implementation

- real prebook, booking, payment, ticketing, cancellation, or refund calls;
- multi-city flights or multiple hotel stays;
- cars, rail, insurance purchase, or transfers;
- real authentication, customer accounts, or cross-session history;
- passport, visa, identity-document, or real passenger-detail collection;
- direct points transfer or cash withdrawal;
- stacking multiple vouchers on one trip;
- provider webhooks or asynchronous fulfillment;
- a standalone non-conversational booking website; and
- claims of production provider booking readiness.

## Definition of product completion

The design is implemented only when:

- every proposed tool is declared, validated, and covered by deterministic
  tests;
- live and fictional provenance is visible in structured results and user copy;
- the full happy path and all confirmation boundaries pass through the MCP
  server;
- unsupported destinations and provider failures remain coherent;
- session isolation and idempotency are proven;
- the runtime `agentGuide` references only implemented capabilities;
- Noodle validation, smoke, App checks, and browser evidence pass; and
- no claim extends beyond the exact local or hosted evidence collected.

## Related internal documents

- [Nuitee API investigation](./nuitee-api-investigation.md)
- [Wayfare canonical domain model](./wayfare-domain-model.md)
- [Wayfare Noodle Seed build guide](./wayfare-noodle-seed-build-guide.md)
- [Wayfare demo data catalog](./wayfare-demo-data-catalog.md)
- [Wayfare agent behavior and acceptance](./wayfare-agent-behavior-and-acceptance.md)
