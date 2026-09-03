# Wayfare removable demo data catalog

> **Internal-only — remove from the public release tree and public Git history.**

Status: fixture design; not implemented
Reviewed: 2026-09-04

This document defines the fictional data that lets a fresh Wayfare starter fork
complete a coherent conversational journey without creating real bookings,
payments, accounts, vouchers, or experience reservations.

## Packaging contract

Place future fictional records under one unmistakable directory:

```text
src/demo-data/
  index.ts
  member.ts
  loyalty.ts
  vouchers.ts
  payment.ts
  booking-policy.ts
  experiences/
    index.ts
    rome.ts
    london.ts
    istanbul.ts
    lisbon.ts
    banff.ts
    tokyo.ts
    new-york.ts
    paris.ts
    bangkok.ts
    dubai.ts
    hong-kong.ts
    singapore.ts
```

This is a target layout, not authorization to move existing files now. During
implementation, migrate or delete overlapping `src/demo-fixtures.ts` content
only after checking current imports and tests.

Requirements:

- demo data is enabled by default for a fresh clone;
- every fixture is marked `WAYFARE_DEMO`;
- no file contains a real person, booking, voucher, property contract, payment
  credential, operator record, or copied provider payload;
- one exported demo-data boundary feeds domain services;
- the MCP capability layer never imports individual fixtures directly;
- removing/replacing the directory requires only replacing that boundary, not
  changing capability schemas or agent workflows; and
- startup should fail clearly when demo mode is selected but required fixtures
  are missing, rather than silently fabricating records.

## Default member

Ship one fixed fictional member. Do not add profile switching.

Suggested fixture characteristics:

| Field | Fictional value/behavior |
| --- | --- |
| Display name | `Jamie Rivera` or another explicitly fictional neutral name |
| Tier | `VOYAGER` |
| Display currency | `USD` |
| Available points | `85,000` |
| Pending points | `4,250` |
| Primary traveler | One fictional adult; no identity-document fields |
| Preferences | Economy by default, aisle preference, quiet room, food/culture experiences |
| Saved payment | Fictional Visa ending `4242`, masked everywhere |
| History | A small bounded set of fictional earn/redemption events |

The exact display name can change during implementation, but tests must prove
that all identity-shaped content is fictional and that no tool accepts a
member ID from the model.

Additional travelers requested in conversation are session labels such as
`Adult 2`, `Child 1`, or `Infant 1`. The demo must not ask for real names,
birthdates, passport details, addresses, or known-traveler numbers.

## Loyalty policy

Use one simple, explicit fictional policy:

- points are whole non-negative integers;
- redemption starts at 1,000 points and uses 1,000-point increments;
- 100 points represent USD 1.00 of fictional voucher value before conversion
  into the trip's display currency;
- a points voucher can cover at most 50% of one eligible flight or hotel
  component;
- points can be reserved only once in one active trip draft;
- confirmation converts reserved points to redeemed points;
- review expiry, voucher removal, or abandoned draft releases reserved points;
- eligible cancellation restores redeemed points according to the component's
  fictional cancellation policy; and
- pending earn is removed for a cancelled component.

If a non-USD trip requires a displayed value, use an explicitly fictional,
deterministic demo conversion table owned by the fixtures. Include its
effective label in the redemption preview; never describe it as a live exchange
rate. The implementation may instead limit redemption display to configured
currencies if that is clearer and is approved before coding.

## Initial vouchers

Provide two contrasting fixtures so the agent can explain eligibility:

### `WELCOME10`

- origin: `PROMOTIONAL`;
- type: `PERCENTAGE`;
- value: 10%;
- eligible component: hotel only;
- minimum spend: USD 300 equivalent in the trip display currency;
- maximum discount: USD 100 equivalent;
- usage limit: one;
- status: `AVAILABLE`; and
- validity: relative policy that remains usable in the demo.

### `FLIGHT50`

- origin: `PROMOTIONAL`;
- type: `FIXED_AMOUNT`;
- value: USD 50 equivalent;
- eligible component: flight only;
- minimum spend: USD 500 equivalent;
- usage limit: one; and
- status: `AVAILABLE`.

Use masked display codes in general wallet output. The recognizable labels
above are fixture identifiers and may be shown only if the product deliberately
uses them as promotional codes. Do not support arbitrary caller-supplied codes
that bypass server-side ownership and eligibility.

Only one voucher may be applied to one trip. A points redemption creates a
third session-scoped fixed-value voucher and must obey the same one-voucher
rule.

## Saved payment fixture

The fictional saved method contains only:

- opaque payment-method reference;
- brand label;
- last four digits;
- expiry month and year safely in the future relative to the test clock;
- fictional billing display name; and
- `WAYFARE_DEMO` provenance.

Do not store a full test card number even if a payment provider publishes one.
Do not include a CVV, address, payment SDK secret, processor token, or live test
mode integration. The simulated payment service deterministically produces
authorization, capture, void, and refund records from server-side session
state.

## Experience catalog strategy

### Why these destinations

The catalog combines Wayfare's existing visual destinations with strong global
tourism signals. Euromonitor's 2025 city index placed Paris, Tokyo, and Rome
among the leading overall destinations, while its international-arrivals view
was led by Bangkok and also highlighted Hong Kong and London. Mastercard's 2025
travel analysis identified Tokyo and Osaka as the fastest-rising summer
destinations. New York and Dubai add globally prominent long-haul demand, while
Istanbul, Lisbon, Banff, and Singapore provide product and geographic variety.

Sources reviewed for the selection:

- [Euromonitor Top 100 City Destinations Index 2025](https://www.euromonitor.com/newsroom/press-releases/december-2025/euromonitor-international-unveils-worlds-top-100-city-destinations-for-2025)
- [Mastercard Travel Trends 2025](https://newsroom.mastercard.com/news/ap/en/newsroom/press-releases/en/2025/mastercard-economics-institute-on-travel-in-2025-asia-pacific-leads-trending-summer-destinations-for-second-year-running/)
- [WTTC Cities Economic Impact](https://wttc.org/Portals/0/Documents/Reports/2023/WTTC-Cities-Economic-Impact-Final.pdf)

The catalog is a product sample, not a claim that these are the definitive or
permanent twelve most-visited cities. Tourism datasets use different measures,
including arrivals, spending, infrastructure, and overall attractiveness.

### Destination coverage

| Destination | IATA anchor | Timezone | Catalog emphasis |
| --- | --- | --- | --- |
| Rome | FCO | Europe/Rome | ancient history, food, art, evening walks |
| London | LHR | Europe/London | landmarks, theatre, museums, food markets |
| Istanbul | IST | Europe/Istanbul | architecture, Bosphorus, food, bazaars |
| Lisbon | LIS | Europe/Lisbon | neighborhoods, food, music, coastal day trips |
| Banff | YYC gateway | America/Edmonton | mountains, wildlife, scenic transport, low-impact outdoors |
| Tokyo | HND/NRT | Asia/Tokyo | neighborhoods, food, design, traditional culture |
| New York | JFK/LGA/EWR | America/New_York | landmarks, arts, food, architecture |
| Paris | CDG/ORY | Europe/Paris | art, food, neighborhoods, river experiences |
| Bangkok | BKK | Asia/Bangkok | temples, food, canals, markets |
| Dubai | DXB | Asia/Dubai | architecture, desert, food, waterfront |
| Hong Kong | HKG | Asia/Hong_Kong | harbor, food, neighborhoods, trails |
| Singapore | SIN | Asia/Singapore | gardens, food, architecture, family attractions |

Airport anchors help route examples but do not turn the experience catalog into
airport-bound inventory. City resolution should accept known aliases and map
to one canonical destination key.

### Minimum depth per destination

Each destination must have at least six curated fictional tours:

1. a short landmark or orientation experience;
2. a food or market experience;
3. an art, history, or cultural experience;
4. a family-suitable option;
5. a premium or small-group option; and
6. an outdoor, evening, or destination-specific option.

At least one should be accessible under each supported accessibility filter the
catalog advertises. Do not claim accessibility where fixture details do not
support it.

Each tour includes:

- stable internal fixture key and generated opaque public ID;
- fictional title, operator, copy, and bounded media;
- categories and suitable traveler types;
- duration and canonical meeting point;
- inclusions, exclusions, restrictions, and accessibility notes;
- cancellation policy;
- two or more booking options when meaningful;
- participant categories and min/max quantities;
- weekly slot templates and capacity; and
- a deterministic price band.

Names must be clearly fictional and should avoid trademarks or names of real
operators. Images must be repository-owned, licensed for the intended release,
or omitted. Do not scrape provider imagery or reviews.

## Non-expiring deterministic availability

Do not hard-code a short list of calendar dates that will become stale in a
production-running demo. Store recurring availability rules:

- allowed weekdays;
- local start times;
- seasonal month range when relevant;
- booking cutoff;
- per-slot capacity;
- blackout-rule identifiers; and
- deterministic sold-out behavior based on the input date and fixture seed.

At query time, materialize slots inside the requested stay window using the
destination timezone and an injected server clock. The same inputs, fixture
version, and test clock return the same slots. Future valid dates continue to
work without editing fixtures.

Capacity is fictional. The tool must label it that way and must not imply a
real operator seat was checked or held.

## Fictional pricing

Each booking option defines a price band by participant category. Generate a
deterministic price directly in the requested supported display currency. The
result must say that the price is fictional and must not imply a live FX quote.

Required pricing cases across the catalog:

- per-person adult/child pricing;
- a free infant category where appropriate;
- one private-group price;
- one optional add-on represented as a booking option rather than an arbitrary
  untyped field; and
- cancellation policies with both flexible and non-refundable examples.

Do not use negative prices, hidden mandatory fees, unbounded decimals, or a
currency absent from the `Money` contract.

## Booking and servicing policy fixtures

Define a small set of reusable policies rather than custom code per record:

| Policy | Change behavior | Cancellation behavior |
| --- | --- | --- |
| `FLEXIBLE` | Change allowed before cutoff; apply fictional price difference | Full refund before cutoff, then non-refundable |
| `MODERATE` | Change allowed with fixed fictional fee plus price difference | Percentage refund before cutoff |
| `RESTRICTED` | No change after confirmation | Non-refundable |

The live offer's displayed policy summary should inform the simulated flight or
hotel policy snapshot, but the demo must never claim that a fictional refund
was executed by the real provider.

For full-trip cancellation:

1. calculate each component separately;
2. sum fictional penalties and refunds;
3. restore an unused promotional voucher when its policy allows;
4. restore redeemed points for refundable value;
5. remove pending earn from cancelled components; and
6. derive `PARTIALLY_CANCELLED` or `CANCELLED` from remaining reservations.

## Fictional confirmations and documents

Generate opaque Wayfare references with explicit demo prefixes in display copy,
for example `WF-DEMO-...`, while keeping internal IDs non-guessable. Do not
generate airline ticket numbers, hotel provider confirmations, genuine voucher
barcodes, boarding passes, QR codes, or operator-branded documents.

The confirmed itinerary may include a bounded fictional experience admission
summary, but it must remain visibly non-redeemable.

## Unsupported destination behavior

When a valid city is outside the experience catalog:

- return success with an empty list and reason `UNSUPPORTED_DESTINATION`;
- name the requested destination;
- state that no fictional experience catalog is configured;
- do not call Nuitee Experiences with the Lite key;
- do not generate ad hoc tours; and
- let the agent continue flights, hotel, rewards, and booking normally.

This must feel like a bounded catalog, not a broken API.

## Removal and replacement instructions

The eventual public starter documentation should tell a developer:

1. identify every import through the single demo-data boundary;
2. replace member, loyalty, voucher, experience, payment, and booking adapters
   with implementations of the canonical Wayfare contracts;
3. keep provenance accurate for each replacement;
4. replace session state if durable, multi-instance behavior is required;
5. update the product `agentGuide` only when workflows or boundaries change;
6. run Noodle validation, smoke, App checks, repository tests, and secret scans;
   and
7. delete the isolated demo directory only after no runtime import remains.

Removing fixtures must not lead to a fallback that invents records. Missing
configured adapters should fail startup with a clear, non-secret diagnostic.
