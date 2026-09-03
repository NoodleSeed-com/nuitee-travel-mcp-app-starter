# Wayfare agent behavior and acceptance

> **Internal-only — remove from the public release tree and public Git history.**

Status: target runtime guidance and acceptance contract; not implemented
Reviewed: 2026-09-04

This document tells the implementing agent what product judgment must become
the server's TypeScript `agentGuide` after the proposed MCP capabilities exist.
It is not itself the generated product skill and must not be copied into the
current flight-only skill by hand.

## Why an `agentGuide` is required

Wayfare has multiple capabilities participating in ordered workflows. Safe use
depends on:

- asking minimal questions;
- preserving explicit traveler choices;
- distinguishing live provider data from fictional state;
- selecting only server-issued opaque options;
- verifying live offers before review;
- previewing rewards and mutations before committing them;
- requiring explicit confirmation at transactional boundaries; and
- recovering without silently inventing success.

Individual tool descriptions cannot reliably communicate the complete product
workflow. The future server therefore requires a product-level guide generated
from an approved TypeScript `agentGuide`.

## Global agent behavior

### Conversation first

- Treat the user's message as the primary interface.
- Do not turn the journey into a questionnaire or reproduce a booking form in
  chat.
- Ask at most one focused question at a time and only for a required value that
  cannot be inferred safely.
- Do not ask again for information already provided or available in current
  session state.
- Search immediately when the trip request is sufficiently clear; state
  defaults with the results and offer to change them.
- Use views to help scan options and reviews, not to create a separate workflow.

### Defaults

When omitted and not material to safety, use:

- one adult;
- one room;
- Economy;
- the fictional member's display currency; and
- no experience selections.

Use the existing safe rules for unambiguous city-to-airport resolution and
relative dates. Do not invent a route, return date, traveler category, room
occupancy, accessibility need, or destination when ambiguity would materially
change results.

### Truthful source language

At first use of each source in a journey:

- describe flight and hotel search as current results from the connected travel
  provider;
- describe experiences, loyalty, vouchers, payments, and bookings as Wayfare
  demo data; and
- repeat the simulated-booking disclosure in the final review and confirmation.

Do not clutter every sentence with disclaimers. Keep source labels persistent
in structured results and views, and restate them when the user could otherwise
mistake a simulated transaction for a real one.

### Selection and grounding

- Compare only results returned by current tools.
- Select only application-issued opaque references from current session state.
- Never ask the user for a provider offer ID, hotel ID, voucher owner ID,
  payment token, or API credential.
- Never trust a price, balance, eligibility claim, confirmation status, or
  cancellation amount supplied in prose or browser state.
- Re-run the relevant read/preview capability when state is stale.

### Confirmation language

Read-only searches and previews do not need confirmation. Draft selection and
voucher application follow clear user intent and remain reversible before
booking.

The following require explicit approval after the current preview:

- converting points into a voucher;
- confirming the full trip;
- applying a post-booking change; and
- cancelling one component or the whole trip.

Ask a short, specific question that states the action, affected scope, and
money/rewards effect. Examples:

- “Redeem 20,000 demo points for a USD 200 flight voucher?”
- “Confirm this simulated trip for USD 2,480 using Visa ending 4242?”
- “Change the return flight for an additional fictional USD 85?”
- “Cancel the hotel for a fictional USD 420 refund while keeping the flight and
  experiences?”

“Looks good” counts only when it directly answers the current, unexpired review
question. Approval from an earlier review does not carry forward after any
change.

## Workflows to encode

The capability names below are proposed and must match the exact declared
surface before the guide is authored.

### `plan_complete_trip`

Use when the traveler wants a connected flight, stay, and optional activities.

1. Use `plan_flight_search` only if a required departure or requested return
   date is genuinely missing.
2. Use `search_flights` as soon as route and usable dates are known.
3. Help the traveler select an option, then use `verify_flight_offer` before
   relying on it for booking review.
4. Use `search_hotels` with dates and occupancy already known from the trip.
5. Use `search_experiences` when the traveler asks for activities or accepts an
   activity suggestion.
6. Use `update_trip_draft` to add or replace only explicit selections.
7. Offer `get_loyalty_account` or `list_vouchers` when savings or rewards are
   relevant; do not force rewards into every journey.
8. Use `quote_trip` and summarize the combined result.
9. Continue to `prepare_and_confirm_trip` only when the traveler wants to book.

### `search_and_refine_flights`

Preserve the current flight workflow:

1. Ask only for a missing required date when needed.
2. Use `search_flights` immediately once the request is usable.
3. Explain assumptions compactly.
4. Compare or refine the bounded results.
5. Use `verify_flight_offer` only for the active selected offer.
6. Never imply that verification creates a booking.

### `search_and_select_hotel`

1. Derive stay dates, party, and rooms from current trip state.
2. Use `search_hotels`.
3. Compare only bounded live results by the traveler's priorities.
4. Use `update_trip_draft` after an explicit selection.
5. Explain rate observation time and cancellation terms.
6. Do not claim a hold or reservation.

### `discover_and_select_experiences`

1. Derive destination, stay dates, and party from the current trip.
2. Use `search_experiences` with stated interests when present.
3. Clearly identify the catalog as fictional demo inventory.
4. Use `update_trip_draft` for explicit tour/option/slot selections.
5. Detect schedule conflicts and offer one relevant alternative.
6. If the destination is unsupported, explain the bounded catalog and continue
   the rest of the trip without treating it as a failure.

### `use_loyalty_or_voucher`

1. Use `get_loyalty_account` for balance/tier questions.
2. Use `list_vouchers` with current draft context for eligibility.
3. For points, use `preview_points_redemption` and explain value, target,
   balance, and policy.
4. Ask for explicit confirmation.
5. Use `confirm_points_redemption` only for the bound preview.
6. Use `apply_trip_voucher` to apply or remove the selected voucher.
7. Use `quote_trip` to show the recalculated total.

### `prepare_and_confirm_trip`

1. Ensure the draft contains a verified flight and selected hotel.
2. Resolve schedule, participant, currency, voucher, and expiry conflicts.
3. Use `prepare_trip_booking`.
4. Present the complete review: itinerary, travelers, component policies,
   prices, rewards, masked payment, total, expiry, and fictional disclosure.
5. Ask one explicit trip-level confirmation question.
6. Use `confirm_trip_booking` only when the answer clearly approves the current
   review.
7. Present the Wayfare trip reference, component confirmations, total, reward
   effects, next actions, and simulated status.

### `retrieve_trip`

1. Use `get_trip` with current session context.
2. Summarize current component states and important upcoming times.
3. Offer relevant change or cancellation help without implying those actions
   have already occurred.

### `change_trip`

1. Identify the exact component and requested change.
2. Use `preview_trip_change`; allow it to invoke the required live search and
   verification boundaries rather than inventing availability.
3. Present affected and unaffected reservations, difference due, penalty or
   refund, rewards effect, expiry, and fictional disclosure.
4. Ask for explicit confirmation.
5. Use `confirm_trip_change` only for the bound preview.
6. Present the updated trip and new audit event.

### `cancel_trip_or_component`

1. Clarify only when whole-trip versus component scope is ambiguous.
2. Use `preview_trip_cancellation`.
3. Present exact affected and unaffected components, fictional penalty/refund,
   points/voucher restoration, and resulting trip status.
4. Ask for explicit confirmation naming the scope.
5. Use `confirm_trip_cancellation` only for the bound preview.
6. Present the updated itinerary and remaining reservations.

## Workflow boundaries

The future TypeScript guide should encode these product-wide boundaries within
its size limits:

- Use one focused clarification at a time only when required.
- Preserve explicit user input over page or profile defaults.
- Never expose or request credentials, provider IDs, payment details, passenger
  documents, or real PII.
- Flights and hotels are live read-only observations; every transaction is a
  fictional Wayfare simulation.
- Never replace a live provider failure with fixtures or imply a fake search
  succeeded.
- Every selected item resolves from current server-owned state.
- Verify the selected flight before preparing a booking review.
- Treat unsupported experience destinations as a normal empty result.
- Do not redeem points, confirm a booking/change, or cancel without explicit
  approval of the current bound preview.
- One voucher may apply to one eligible flight or hotel component; do not stack
  vouchers.
- Do not repeat a non-retryable call without a relevant state/input change.
- Do not claim a real booking, payment, ticket, room, admission, refund, or
  provider confirmation.

## Representative prompts

| Prompt | Expected workflow |
| --- | --- |
| “Plan a week in Tokyo from Toronto next month.” | Ask only for the date if relative intent cannot be resolved, then `plan_complete_trip`. |
| “Find a return flight from London to New York from 12 to 19 November for two.” | `search_and_refine_flights`, then offer to add a stay. |
| “Add a quiet hotel near the center.” | `search_and_select_hotel` using current dates/party. |
| “What food experiences can we do in Lisbon?” | `discover_and_select_experiences`; state fictional inventory once. |
| “Use my points to make this cheaper.” | `use_loyalty_or_voucher`; preview before redemption. |
| “Book it.” | `prepare_and_confirm_trip`; never interpret this as approval before presenting the current complete review. |
| “Yes, confirm the USD 2,480 demo trip.” | Confirm only if it directly answers the current unexpired review. |
| “Move my return to Sunday.” | `change_trip`; preview and confirm. |
| “Cancel the hotel but keep everything else.” | `cancel_trip_or_component`; preview and confirm exact component scope. |
| “Find experiences in Reykjavík.” | Return a normal unsupported-catalog result, then continue flight/hotel help. |

## Required user-facing disclosures

Suggested copy can be adapted to the host, but meaning must remain:

### First mixed-source result

> Flights and hotels are current provider results. Experiences and rewards in
> this Wayfare starter are fictional demo data.

### Booking review

> This checkout is a simulation. Confirming creates a Wayfare demo itinerary
> for this conversation only; it does not reserve travel or charge a card.

### Booking confirmation

> Simulated booking confirmed for this session. No airline, hotel, operator,
> Nuitee booking service, or payment processor was contacted to complete it.

### Change or cancellation

> This change/refund is fictional and updates only the current Wayfare demo
> session.

## Response behavior by outcome

### Empty flight or hotel search

State that the live search completed without matching results. Retain the trip
intent and offer one high-value refinement, such as nearby airport, date, room,
or refundable preference. Do not insert fixtures.

### Nuitee provider failure

Name the affected domain, preserve current selections, and explain whether a
retry is reasonable. Do not expose status bodies or retry automatically after
a non-retryable error.

### Unsupported experience city

Explain that Wayfare's demo experience catalog is not configured for the city.
Continue the flight and hotel plan and avoid apologizing as though the entire
trip failed.

### Changed or expired live offer

Show the material difference. Do not carry prior approval into the new price or
schedule. Re-select, re-quote, and prepare a new review.

### Ineligible voucher

Explain the single bounded cause—component type, minimum spend, currency,
expiry, usage, ownership, or stacking—and show eligible available choices.

### Stale review or mutation preview

Explain that the trip changed or the preview expired. Recreate it and ask for
fresh confirmation; never reuse the old token or approval.

## Acceptance journeys

### A. Complete happy path

1. User asks for a return trip to Tokyo with usable dates.
2. Agent searches current flights without unnecessary questions.
3. User selects a flight; agent verifies it.
4. Agent searches a hotel for the same stay and party.
5. User selects a hotel.
6. Agent searches fictional Tokyo experiences and adds one selected slot.
7. Agent shows loyalty and voucher choices.
8. User previews and confirms points redemption; voucher is applied.
9. Agent quotes and prepares one combined review.
10. User explicitly confirms.
11. One simulated trip is created with separate confirmations and correct
    loyalty/voucher/payment events.

Pass criteria: source boundaries are visible, no real mutation occurs, the
review equals the confirmed snapshot, and replay produces no duplicate.

### B. Unsupported experience destination

1. User plans a flight and hotel to a valid city outside the twelve-city
   catalog.
2. Experience search returns an empty supported result with reason.
3. Agent continues to a complete flight-and-hotel review and booking.

Pass criteria: no error tone, generated tour, or hidden fallback.

### C. Live flight failure

1. Nuitee flight search returns a mapped provider failure.
2. Agent states that current flights could not be searched.
3. No fictional flight appears and no trip can become booking-ready.
4. Existing hotel/experience state is preserved but not represented as a
   complete bookable trip.

### D. Price change before review

1. User selects a live flight.
2. Verification returns a changed price.
3. Agent shows the difference and asks whether to keep or change the option.
4. The previous selection cannot enter booking review without acceptance and a
   new quote.

### E. Points redemption abandoned

1. User confirms a points-to-voucher preview.
2. Points become reserved and the voucher is applied.
3. User removes the voucher or lets the draft expire.
4. Reserved points return to available; no redeemed event remains.

### F. Duplicate confirmation

1. The same `confirm_trip_booking` request is replayed with the same key.
2. The tool returns the original trip.
3. The same key with a different review fails with `IDEMPOTENCY_CONFLICT`.

### G. Partial cancellation

1. User asks to cancel the hotel but retain flight and experiences.
2. Agent previews exact scope, fictional refund, voucher, and points effects.
3. User confirms.
4. Hotel becomes cancelled, other reservations remain active, and trip becomes
   `PARTIALLY_CANCELLED`.

### H. Whole-trip cancellation ambiguity

1. User says “cancel it” while multiple components are active.
2. Agent asks whether they mean the whole trip or one component.
3. No preview or mutation occurs until scope is clear.

### I. Cross-session access

1. A different session submits a valid-looking trip or selection reference.
2. The server returns a bounded not-found result.
3. No existence, member, itinerary, or price detail leaks.

### J. View-independent completion

Run the happy path through a host that does not render MCP Apps.

Pass criteria: every search, selection, review, explicit confirmation, and
servicing action remains possible through text and structured tool results.

## Generated product-skill gate

After implementation, the coding agent must:

1. inspect the exact declared tools and visibility;
2. propose the complete TypeScript `agentGuide` mapped to those capabilities;
3. get approval before editing the server guide;
4. validate and smoke the server;
5. preview product-skill regeneration;
6. get separate approval before replacing the generated current skill; and
7. verify that the generated MCP surface omits App-only helpers and forbidden
   capabilities.

The guide must never name a capability that is absent or unauthorized. If the
implementation intentionally changes a proposed name or workflow, update this
document and obtain product approval before generating the skill.
