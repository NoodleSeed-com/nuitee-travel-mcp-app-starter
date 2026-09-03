# Wayfare canonical domain model

> **Internal-only — remove from the public release tree and public Git history.**

Status: target contract; not implemented
Reviewed: 2026-09-04

This document defines the provider-independent data language used by Wayfare's
future MCP capabilities. It deliberately does not reproduce Nuitee's schemas.
The provider contracts are evidence used by adapters, not the public product
model. See the [Nuitee API investigation](./nuitee-api-investigation.md) for the
observed access matrix and contract weaknesses.

## Modeling rules

1. Normalize every provider response at the connector boundary.
2. Return only bounded, task-relevant projections to the model and views.
3. Use application-issued opaque references for anything a caller can select.
4. Store provider IDs and raw payloads only inside server-side adapter state.
5. Represent money as integer minor units and an ISO 4217 currency.
6. Represent dates and times explicitly; never infer a timezone from a label.
7. Make live versus fictional provenance machine-readable.
8. Use constrained status unions and documented state transitions.
9. Separate observed offers, selections, reviews, and confirmed reservations.
10. Treat all input from the model, browser, and page as untrusted.

## Shared primitives

| Type | Required fields | Rules |
| --- | --- | --- |
| `OpaqueId` | prefixed string | High-entropy or keyed opaque reference. Must not reveal a provider ID, email, or fixture key. |
| `Money` | `amountMinor`, `currency` | Integer amount in the currency's minor unit. No binary floating-point arithmetic. |
| `CalendarDate` | `YYYY-MM-DD` | Validate as a real date. Return date must be later than departure date. |
| `ZonedDateTime` | `dateTime`, `timeZone` | ISO 8601 timestamp and IANA timezone. Preserve the local time shown to the traveler. |
| `DateRange` | `startDate`, `endDate` | Half-open range for stays; `endDate` is checkout and must be later. |
| `PostalAddress` | bounded address projection | Fictional billing/meeting addresses only. Do not require a real address for the demo. |
| `DataProvenance` | `source`, `observedAt`, `isFictional`, `disclosure` | `source` is `NUITEE_LIVE` or `WAYFARE_DEMO`. `isFictional` must agree with the source. |
| `PolicySummary` | `kind`, `summary`, optional deadlines and money | Bounded traveler-readable policy. Retain raw provider policy only server-side if needed. |
| `PageInfo` | `returned`, optional `nextCursor` | Cursor must be opaque. Do not promise pagination when the source cannot support it. |

Every model-visible top-level result includes provenance. Mixed-source results,
such as a trip quote containing live observations and fictional experiences,
include provenance on each component plus an aggregate disclosure.

## Identity and traveler context

### `MemberProfile`

| Field | Type | Notes |
| --- | --- | --- |
| `memberId` | `OpaqueId` | Session-resolved fictional member ID. |
| `displayName` | string | Fictional display name. |
| `primaryTraveler` | `TravelerProfile` | Used only as a default for the simulated booking. |
| `preferences` | `TravelPreferences` | Cabin, accessibility, room, dietary, and experience preferences when explicitly present in fixtures. |
| `displayCurrency` | ISO currency | Default only; an explicit traveler request wins. |
| `loyaltyTier` | enum | `EXPLORER`, `VOYAGER`, or `CONCIERGE`. Initial fixture uses one tier. |
| `paymentMethods` | `SavedPaymentMethod[]` | Return only masked display information. |

### `TravelerProfile`

The demo needs only a fictional display name, traveler category, and bounded
preferences. It must not include a passport number, national identifier, real
date of birth, loyalty number, or other identity document.

Traveler categories are `ADULT`, `CHILD`, and `INFANT`. When the user requests
additional travelers without names, the server creates session labels such as
`Adult 2` or `Child 1`; it does not ask for real PII.

### `SavedPaymentMethod`

Fields are `paymentMethodId`, `brand`, `lastFour`, `expiryMonth`,
`expiryYear`, and `billingName`. All values are fictional. No primary account
number, security code, bank credential, address, or reusable payment token is
stored or accepted.

## Trip intent and draft

### `TripIntent`

| Group | Fields |
| --- | --- |
| Route | `origin`, `destination`, `tripType` |
| Dates | `departureDate`, required `returnDate` for `ROUND_TRIP` |
| Travelers | counts by category |
| Flight preferences | cabin and optional stop/time/baggage preferences |
| Stay | rooms, occupancy, optional neighborhood/amenity/board preferences |
| Experiences | optional interest tags, accessibility needs, pace, and budget |
| Presentation | display currency and market inferred through existing safe defaults |

The canonical complete-trip path uses `ROUND_TRIP`. Existing one-way flight
search remains valid. `MULTI_CITY` is not a permitted initial value.

### `TripDraft`

`TripDraft` is mutable session state containing:

- the normalized `TripIntent`;
- at most one active flight selection;
- at most one active hotel selection;
- zero or more experience selections that do not conflict in time;
- one optional applied voucher;
- reserved loyalty points, if points were converted into that voucher;
- the latest quote reference; and
- a monotonic `revision`.

Every material change increments `revision` and invalidates the previous quote
and booking review. The caller never supplies a total, price, balance, status,
or revision outcome; the server recalculates them.

## Offer models

An offer is an observed or fictional option, not a reservation. Each offer has
an opaque selection reference, provenance, observation time, and expiry when
the source supports it.

### `FlightOffer`

Required public projection:

- `flightOfferId`;
- `outbound` and, for return trips, `inbound` `FlightLeg` values;
- validating carrier label and flight segments;
- cabin and fare-family label;
- stops and total duration per leg;
- bounded baggage summary;
- bounded change/refund summary;
- `totalPrice` for the entire requested party;
- `verificationStatus`: `UNVERIFIED`, `VERIFIED`, `CHANGED`, `EXPIRED`, or
  `UNAVAILABLE`;
- `observedAt` and optional `expiresAt`; and
- live provenance.

`FlightSegment` contains origin/destination airport codes, departure/arrival
zoned times, marketing carrier and flight number, and duration. Do not expose
provider offer IDs, raw fare rules, or payment data.

### `HotelOffer`

Required public projection:

- `hotelOfferId`;
- `property`: name, star rating when sourced, location summary, bounded images,
  and key amenities;
- `stay`: check-in, checkout, nights, rooms, and occupancy;
- `room`: name, bed summary, occupancy, and key amenities;
- `ratePlan`: board basis, payment timing, and cancellation policy;
- `totalPrice` for the entire requested stay;
- `availabilityStatus`: `OBSERVED`, `EXPIRED`, or `UNAVAILABLE`;
- `observedAt` and optional `expiresAt`; and
- live provenance.

The adapter must distinguish provider-sourced star ratings from Wayfare copy.
It must not infer accessibility, safety, neighborhood quality, or suitability
from absent provider data.

### `ExperienceOffer`

Required public projection:

- `experienceOfferId`;
- `tourId`, `title`, `shortDescription`, and interest categories;
- fictional operator label;
- bounded images and optional fictional rating summary;
- duration, meeting point, accessibility notes, inclusions, and exclusions;
- `bookingOptionId`, option title, language, and participant rules;
- `slotId` and `start` as a `ZonedDateTime`;
- remaining fictional capacity;
- participant quantities and `totalPrice`;
- cancellation policy;
- `availabilityStatus`: `AVAILABLE`, `SOLD_OUT`, or `CLOSED`; and
- fictional provenance.

All experience content is curated project data. It must never be described as
current Nuitee inventory or a real operator's offering.

## Loyalty and vouchers

### `LoyaltyAccount`

| Field | Type |
| --- | --- |
| `accountId` | `OpaqueId` |
| `status` | `ACTIVE` or `DISABLED` |
| `tier` | `EXPLORER`, `VOYAGER`, or `CONCIERGE` |
| `availablePoints` | non-negative integer |
| `pendingPoints` | non-negative integer |
| `redemptionPolicy` | bounded policy projection |
| `recentActivity` | bounded list of `LoyaltyEvent` |
| `provenance` | `WAYFARE_DEMO` |

`LoyaltyEvent` uses explicit types such as `EARNED`, `PENDING`, `RESERVED`,
`REDEEMED`, `RESTORED`, and `EXPIRED`. It records integer points, event time,
reason, related trip when applicable, and the resulting available balance.

### `Voucher`

| Group | Fields |
| --- | --- |
| Identity | `voucherId`, masked `displayCode` |
| Origin | `PROMOTIONAL` or `POINTS_REDEMPTION` |
| Discount | `FIXED_AMOUNT` or `PERCENTAGE`, value, currency where applicable |
| Constraints | minimum spend, maximum discount, eligible component types |
| Validity | start, end, status |
| Usage | usage limit, remaining uses, optional related points reservation |
| Ownership | member ID, never accepted from the caller |
| Provenance | always `WAYFARE_DEMO` in this version |

Voucher status is `AVAILABLE`, `RESERVED`, `USED`, `EXPIRED`, `DISABLED`, or
`RESTORED`. One voucher may be applied to one flight or hotel component in the
initial implementation. Voucher stacking is rejected.

### Redemption preview and commitment

A `RedemptionPreview` contains points requested, fixed voucher value, selected
eligible component, current and projected balances, expiry, and fictional
policy. Creating a preview does not change the balance.

On explicit confirmation, the server creates a `POINTS_REDEMPTION` voucher and
reserves the points in the draft. Confirmation of the full trip changes the
reservation to `REDEEMED`. Draft removal or expiry restores the reservation.

## Pricing and review

### `TripQuote`

`TripQuote` is a server-calculated projection of the current draft revision:

- `quoteId`, `draftId`, and `draftRevision`;
- one line item for each selected component;
- subtotal;
- taxes and fees as explicit lines when available;
- voucher discount and its target component;
- final total;
- display currency;
- component provenance and observation times;
- `createdAt` and `expiresAt`; and
- traveler-readable assumptions and disclosures.

Live Nuitee flight and hotel totals are already requested in the trip's display
currency. Fictional experience prices are generated directly in that currency
from documented fixture price bands; Wayfare must not claim to perform a live
foreign-exchange conversion.

Discount calculation order is:

1. component base totals;
2. provider-reported taxes and fees already contained in live totals;
3. fictional experience totals and explicit fictional fees;
4. voucher eligibility and minimum-spend check;
5. capped voucher discount; and
6. final trip total.

The discount can never make a component or trip total negative.

### `BookingReview`

`BookingReview` is an immutable snapshot of one current quote and draft
revision. It includes `reviewId`, expiry, all itinerary details, traveler
labels, price lines, policy summaries, masked payment method, provenance, and
the exact simulated-booking disclosure.

The server issues a high-entropy `confirmationToken` bound to the review,
session, member, and draft revision. The token is capability input, not content
for display. Any material change or expiry makes it invalid.

## Confirmed trip and reservations

### `WayfareTrip`

| Field | Notes |
| --- | --- |
| `tripId` | Opaque, customer-facing Wayfare reference. |
| `status` | Aggregate state derived from component reservations. |
| `intentSnapshot` | Immutable route, dates, and party at confirmation. |
| `reservations` | One flight, one hotel, and zero or more experience reservations. |
| `priceSummary` | Confirmed fictional payment and discount summary. |
| `loyaltySummary` | Points redeemed, restored, and pending accrual. |
| `createdAt`, `updatedAt` | Session clock timestamps. |
| `events` | Bounded traveler-visible audit timeline. |
| `provenance` | Mixed-source disclosure; transactional state is fictional. |

Aggregate statuses are:

- `CONFIRMED` when every current component is confirmed;
- `CHANGED` after a confirmed mutation with all current components active;
- `PARTIALLY_CANCELLED` when at least one component remains active;
- `CANCELLED` when no component remains active; and
- `EXPIRED` only for an unconfirmed review, never for a confirmed trip.

### Component reservations

All reservations share:

- `reservationId` and fictional `confirmationReference`;
- `componentType`;
- `status`;
- immutable confirmation snapshot;
- confirmed price and policy;
- fictional fulfillment summary;
- created and updated times; and
- audit events.

Statuses are `CONFIRMED`, `CHANGED`, `CANCELLED`, and `FAILED`. A simulated
atomic confirmation must not produce a partial trip. If construction fails,
no trip, payment, voucher use, or loyalty debit is committed.

Experience reservations may additionally demonstrate a
`PENDING_CONFIRMATION` transition internally, but the synchronous demo
confirmation must resolve it deterministically before returning to the user.

## Payment model

`PaymentRecord` is explicitly fictional and contains:

- opaque `paymentId`;
- masked payment-method summary;
- `AUTHORIZED`, `CAPTURED`, `PARTIALLY_REFUNDED`, `REFUNDED`, or `VOIDED`;
- authorized/captured/refunded `Money` values;
- fictional timestamps; and
- a persistent `WAYFARE_DEMO` marker.

No payment endpoint, SDK secret, transaction token, or real processor object is
part of this model.

## Change and cancellation models

### Preview

`TripMutationPreview` contains:

- `previewId`, target trip and current revision;
- mutation kind and exact affected reservations;
- proposed itinerary or status changes;
- price difference, penalty, refund, voucher effect, and points effect;
- unaffected reservations;
- expiry;
- explicit fictional disclosure; and
- a server-bound confirmation token.

A preview is read-only. It becomes invalid after any trip change, expiry, or
different target selection.

### Confirmation

Change and cancellation confirmation accepts only the bound preview/token and
an idempotency key. The server never trusts caller-supplied prices, penalty,
refund, scope, or status.

Cancellation policy fixtures must define:

- cutoff relative to service date;
- refundable amount or percentage;
- voucher restoration behavior;
- redeemed-points restoration behavior; and
- pending-points removal behavior.

## State transitions

```text
TripDraft
  PLANNING
    -> QUOTED
    -> READY_FOR_CONFIRMATION
    -> CONFIRMED WayfareTrip

WayfareTrip
  CONFIRMED
    -> CHANGED
    -> PARTIALLY_CANCELLED
    -> CANCELLED

Any active trip
  -> preview change/cancellation (no mutation)
  -> explicit confirmation
  -> idempotent committed event
```

Every mutation appends a `TripEvent` with event ID, type, time, affected opaque
references, before/after revision, and a bounded explanation. Events never
contain credentials, raw payloads, payment secrets, or unredacted PII.

## Provider adapter mappings

| Nuitee family | Wayfare projection | Notes |
| --- | --- | --- |
| Flights search | `FlightOffer[]` | Normalize journeys and requested directions; retain raw offer only in expiring server state. |
| Flight verification | updated `FlightOffer` | Compare with active selection and mark price/schedule changes explicitly. |
| Search / hotel rates | `HotelOffer[]` | Combine property, room, rate, total, and cancellation summary. |
| Hotel Data | `HotelProperty` content | Join only bounded descriptive fields needed by the selected/search result. |
| Booking API | none in v1 | Do not call mutations. Use only as reference for concepts; simulated `Reservation` is Wayfare-owned. |
| Experiences | `ExperienceOffer[]` from fixtures | Preserve tour/option/slot/participant concepts without copying the underspecified generic objects. |
| Loyalty | `LoyaltyAccount` from fixtures | Correct casing conflicts and separate balance, policy, and activity. |
| Vouchers | `Voucher` from fixtures | Preserve eligibility/validity/usage concepts; do not depend on the separate live voucher origin. |

## Validation invariants

- A return trip has exactly one outbound and one inbound flight leg in the
  selected public projection.
- Hotel checkout is after check-in and normally aligns to the return date.
- Experience slots fall within the destination stay and do not overlap.
- Traveler and participant quantities are positive and internally consistent.
- Every selected offer resolves from current server-side state.
- Every live offer is current enough for its operation or is re-searched.
- A booking review matches the current draft revision and is unexpired.
- A voucher is active, owned by the session member, eligible, and unused.
- Reserved or redeemed points never exceed the available balance.
- Money operations use the same currency within a quote.
- Confirmation requires the server-issued token and an idempotency key.
- A replay returns the original result; a same-key/different-body replay fails
  closed.
- Trip aggregate status is derivable from its component states.
- No cross-session identifier resolves.

## Data minimization projections

The model-visible and view-visible result should be smaller than the internal
canonical object whenever possible. Examples:

- loyalty balance requests do not return traveler contact fields;
- search results do not return raw policies or provider payloads;
- booking review does not return the confirmation token in visible content;
- itinerary display returns masked payment only;
- voucher lists return masked codes unless the code is required for a current
  server-side operation; and
- audit history is bounded and cursor-based.
