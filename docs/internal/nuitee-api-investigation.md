# Nuitee API investigation

> **Internal-only — remove from the public release tree and public Git history.**

Reviewed: 2026-09-03

Repository: `NoodleSeed-com/nuitee-travel-mcp-app-starter`

Scope: Nuitee API topology, credential access, Experiences, Loyalty, Vouchers,
and contract-quality risks.

This investigation informs, but does not define, Wayfare's public product
contract. The approved provider-independent target is documented in the
[Wayfare canonical domain model](./wayfare-domain-model.md), and the coding
handoff is in the [Wayfare Noodle Seed build guide](./wayfare-noodle-seed-build-guide.md).

This record contains only sanitized status, response-size, count, and schema
evidence. It contains no API key, authorization header, raw response, customer
record, booking identifier, offer identifier, price, or payment secret.

## Evidence boundaries

- **Observed:** direct, owner-authorized, read-only or search-style HTTP probes
  made on 2026-09-03. Response bodies containing provider or account data were
  discarded or reduced to field names and aggregate counts.
- **Documented:** the current official Nuitee OpenAPI documents. Documentation
  is not treated as proof that an account is entitled or that a live response
  conforms.
- **Not exercised:** prebook, booking, payment, cancellation, loyalty updates,
  points redemption, voucher creation/update/deletion, or any other mutation.
- **Not proven:** hosted Noodle behavior, public-host behavior, production
  booking correctness, provider-wide schema conformance, or sustained
  availability.

## API topology

Nuitee's API catalog is not served from one origin.

| Origin | Documented API families | Authentication |
| --- | --- | --- |
| `https://api.liteapi.travel/v3.0` | Search, Booking, Flights, Experiences, Hotel Data, Loyalty, Price Index | `X-API-Key` |
| `https://da.liteapi.travel` | Vouchers, Analytics | `X-Api-Key` |

HTTP header names are case-insensitive, but the OpenAPI documents use different
capitalization. A production integration should still model these as two fixed
connectors with separate origin allowlists and the same managed credential only
when Nuitee confirms that account policy.

The initial Vouchers and Analytics probes used the common `/v3.0` origin and
returned `404`. Those results were routing failures, not entitlement evidence.
The corrected probes against `da.liteapi.travel` returned `200` for all three
credentials.

## Credential access matrix

The credential labels below identify environment slots only. No value or
fingerprint is retained. The dedicated Lite credential has a production-style
prefix and is distinct from the other sandbox and production credentials.

| API family | Sandbox credential | Production credential | Dedicated Lite credential |
| --- | --- | --- | --- |
| Search / hotel rates | `200`, populated | `200`, populated | `200`, populated |
| Booking API | `200`, no-match read | `200`, no-match read | `200`, no-match read |
| Flights static data | `200` | `403` | `200` |
| Flights search | `200`, populated | `403` | `200`, populated |
| Experiences | `403` | `403` | `403` |
| Hotel Data | `200`, populated | `200`, populated | `200`, populated |
| Loyalty settings | `200`, empty | `200`, empty | `400` |
| Vouchers at correct origin | `200` | `200` | `200` |
| Price Index | `200` | `200` | `200` |
| Analytics at correct origin | `200` | `200` | `200` |

Interpretation:

- No current credential proves access to all nine requested families.
- The dedicated Lite credential is the strongest production-shaped candidate:
  it can search hotels and flights and reach Hotel Data, Booking reads,
  Vouchers, Price Index, and Analytics.
- Experiences is explicitly unavailable on every tested credential.
- Loyalty is reachable with the sandbox and production credentials, but the
  empty settings response does not prove a configured loyalty program. The
  dedicated Lite credential's `400` remains unexplained without inspecting or
  asking Nuitee to interpret the sanitized provider error.
- A successful Booking read does not prove permission or correctness for
  prebook, book, amendment, payment, or cancellation.

### Sanitized observed shapes

- Hotel Data returned a `data` array containing 249 country objects with `code`
  and `name` fields for each credential.
- Hotel rates returned one populated hotel and one room type in the bounded
  probe for each credential. The sandbox result explicitly carried
  `sandbox: true`; the production-shaped results did not.
- The sandbox Flights search returned three journeys in the first probe. The
  dedicated Lite credential returned two journeys in its bounded probe.
- Booking lookups used a unique no-match client reference and returned an empty
  `data` array for each credential.
- Vouchers and Analytics were checked by status only at the correct origin;
  their response bodies were discarded.

## Experiences data model

Documented lifecycle:

```text
Tour
  -> Availability and participant categories
  -> Booking option and time slot
  -> Prebook and payment intent
  -> Booking accepted as PENDING_CONFIRMATION
  -> Provider webhook
  -> CONFIRMED, FAILED, or CANCELLED
```

### Endpoints and intended entities

| Operation | Documented input | Documented output |
| --- | --- | --- |
| `GET /experiences/tours` | Required `language`, `currency` | Tour listings, localized content, images, ratings, prices |
| `GET /experiences/tours/{id}` | Tour ID, language, currency | Full tour profile, duration, highlights, media, meeting point, policies, inclusions |
| `GET /experiences/tours/{id}/availability` | Tour ID, language | Dates, time slots, capacity or bookability hints |
| `GET /experiences/tours/{id}/reviews` | Tour ID, language, currency | Review text, ratings, dates, purported pagination |
| `POST /experiences/tours/{id}/booking-options` | Prose says language, currency, date, participants | Option ID, title, required inputs, slots, authoritative retail price |
| `POST /experiences/tours/{id}/prebooks` | `selection`, language, currency, `usePaymentSdk`; optional client reference | Temporary validation/hold plus payment transaction details |
| `POST /experiences/bookings` | Prebook ID, billing, traveler, payment | Booking state |
| `GET /experiences/bookings/{bookingId}` | Dispatcher booking ID | Current booking state and eventual voucher |

### Booking state

The only substantially typed Experiences object is `ExperienceBookingData`:

- identity: `bookingId`, `prebookId`, `cartId`, `experienceBookingId`,
  `providerBookingId`;
- product: integer `tourId`, integer `optionId`, `dateTime`;
- money: numeric `price`, string `currency`;
- payment: `paymentStatus`, `paymentTransactionId`, opaque
  `providerPayment`;
- fulfillment: opaque `voucher`;
- status: `PENDING_CONFIRMATION`, `CONFIRMED`, `FAILED`, or `CANCELLED`.

The booking request requires `prebookId`, untyped `billing`, untyped `traveler`,
and `payment`. `payment.method` is limited to `TRANSACTION_ID`, but
`transactionId` is not itself required by the schema.

## Loyalty data model

```text
Account
  -> Loyalty configuration
  -> Guests
       -> Booking links
       -> Current and upcoming points
       -> Assigned vouchers
       -> Redeem points -> new guest-bound voucher
```

### Entities

**Guest**

- integer `id`;
- `firstName`, `lastName`, `email`, `phoneNumber`;
- `points`, `upcomingPoints`;
- booking identifiers;
- `createdAt`, `updatedAt`, and an optional deletion marker.

**Guest booking link**

- numeric record ID;
- `guestID`, `bookingID`;
- `cashbackRateUsed`, points;
- creation and update timestamps.

**Loyalty configuration**

- `status`, with update input restricted to `enabled` or `disabled`;
- `cashbackRate`;
- response-only `cashbackCurrency` in the examples.

**Points balance**

- `currentPoints`;
- `upcomingPoints`.

**Points redemption**

- request: integer `points` and string `currency`;
- response: a guest-bound voucher-like object containing discount, validity,
  usage, status, and ownership fields.

The Guest, Booking, Voucher, and history endpoints can expose names, email
addresses, phone numbers, booking identifiers, balances, and commercial
activity. A future MCP surface must not return these upstream objects wholesale.

## Vouchers data model

Vouchers are documented on `https://da.liteapi.travel`, not the common
`/v3.0` origin.

```text
Voucher
  -> optional Guest assignment
  -> validity window
  -> usage limit and remaining uses
  -> optional monetary budget and computed spend
  -> hotel or flight prebook through voucherCode
  -> usage-history records linked to bookings
```

### Voucher fields

- identity: `id`, `voucher_code`;
- discount: `discount_type`, `discount_value`, `currency`, `minimum_spend`,
  `maximum_discount_amount`;
- validity: `validity_start`, `validity_end`, `status`;
- limits: `usages_limit`, `remaining_uses`, optional `budget`, computed
  `budget_used`;
- ownership: optional `guest_id`, `user_id`;
- presentation: `description`, `terms_and_conditions`;
- audit: `created_at`, `updated_at`, `deleted_at`.

Create and full update require voucher code, discount type/value, minimum spend,
maximum discount, usage limit, currency, dates, and status. Status also has a
separate update endpoint accepting `active` or `inactive`. Voucher usage history
contains booking ID, guest email, hotel name, usage date, voucher code, and
discount amount.

Vouchers are documented as applicable to both hotel and flight prebooks through
the `voucherCode` field. No standalone public validation or redemption endpoint
is defined in the Voucher specification.

## Smoke and mirrors in the published contracts

The phrase **smoke and mirrors** here means the documentation presents a broad,
product-complete capability while the machine contract is too vague,
contradictory, or fragmented to support a safe generated integration.

### Experiences: product-rich prose, schema-poor contract

1. **Generic discovery envelope.** Tour search, detail, availability, reviews,
   and booking options all return `SuccessEnvelope.data` as either an arbitrary
   object or arbitrary object array. There are no Tour, Availability, Review,
   Slot, Participant, or BookingOption schemas.
2. **A response wrapper is used as a request.** Booking options declares
   `SuccessEnvelope` as its request body even though the prose requires date,
   language, currency, and participants.
3. **Pagination is advertised but not modeled.** Tour search claims a paginated
   result without a pagination schema. Reviews mention `limit` and `offset`, but
   the operation parameters define neither.
4. **Checkout-critical objects are opaque.** `selection`, `billing`, `traveler`,
   prebook output, voucher, and provider payment are untyped objects.
5. **Payment requirement is incomplete.** The only payment method is
   `TRANSACTION_ID`, but `transactionId` is optional.
6. **Everything inside booking data is optional.** The response requires only
   the outer `data` property, so a schema-valid booking can omit its booking ID,
   status, product, price, and payment state.
7. **Lifecycle without a complete control surface.** `CANCELLED` is a booking
   status, but no Experiences cancellation operation is documented.
8. **Idempotency is prose-level.** The booking description promises an
   idempotent return and a `409` for an existing prebook, but no idempotency key
   or precise replay contract is defined.
9. **Sensitive payment material is hidden behind `object`.** Prebook prose says
   it returns a payment secret, but the schema does not identify or constrain
   that field. A generic mapper could accidentally expose it.

### Loyalty: example-driven rather than contract-driven

1. **No reusable component schemas.** The Loyalty OpenAPI has no named schemas;
   most useful shape information lives in inline examples.
2. **Object/array contradiction.** The single-guest response is declared as an
   object while its example puts guest records in an array.
3. **Identity casing fragments.** The same concepts appear as `guestId`,
   `guest_id`, and `guestID`, and as `bookingID` versus booking strings.
4. **Voucher casing changes by endpoint.** Guest vouchers use snake_case while
   points redemption returns a camelCase voucher.
5. **Singleton configuration looks plural.** Loyalty settings are conceptually
   one account configuration, but examples wrap them in a `data` array.
6. **Currency cannot be configured through the modeled update.** Responses show
   `cashbackCurrency`; the update accepts only `status` and `cashbackRate`.
7. **Points economics are unspecified.** The contract defines current and
   upcoming balances but no earning unit, vesting transition, expiration,
   reversal, or points-to-currency conversion rule.
8. **Cashback rate is weakly constrained.** It is a floating-point number with
   no schema minimum, maximum, or unambiguous percentage-unit contract.
9. **Unbounded PII reads.** `GET /guests` exposes personal and commercial data
   without documented pagination, filtering, or field projection.
10. **Live setup state is unexplained.** Empty `200` responses and the dedicated
    Lite credential's `400` cannot be interpreted from the schema as disabled,
    unconfigured, or invalid account state.

### Vouchers: detailed fields, inconsistent operational semantics

1. **The service origin is easy to miss.** Vouchers is listed beside the main
   APIs but runs on `da.liteapi.travel`. Calling the common origin produces a
   misleading `404`.
2. **Singular envelope, array examples.** Create, list, and get-one examples use
   a `voucher` property that often contains an array, even for one resource.
3. **The create example contains server fields.** Its example includes IDs,
   timestamps, user ownership, and remaining uses that are not create inputs.
4. **Guest identity type conflicts.** `guest_id` is declared as a string in the
   create schema but is numeric in examples and Loyalty paths.
5. **Enums are mostly prose.** `discount_type` is an unconstrained string even
   though percentage, fixed amount, and points redemption have different
   monetary meaning. Create/update status is also unconstrained while the
   status-only operation allows just `active` and `inactive` and read prose also
   mentions `expired`.
6. **Money and limits lack safety constraints.** Amounts, budgets, and usage
   limits have no consistent nonnegative, integer, precision, rounding, or
   currency validation contract.
7. **Updates are overwrite-prone.** Full `PUT` requires the complete core object
   but provides no version, ETag, or optimistic-concurrency field.
8. **HTTP meanings are blurred.** A missing voucher is documented as `400`, and
   an already-used immutable voucher is described as `404`; clients cannot
   reliably distinguish invalid input, absence, and immutable state.
9. **Delete semantics are unclear.** A delete endpoint exists while the entity
   also exposes `deleted_at`; the contract does not say whether deletion is soft,
   reversible, or retained in history.
10. **Usage history is sensitive and unbounded.** It includes guest email,
    booking ID, hotel name, and monetary data without documented pagination or
    date filters.
11. **Redemption is displaced.** The Voucher API manages definitions and
    history, but actual validation/redemption happens indirectly in hotel or
    flight prebook with a differently cased `voucherCode` field.

### Cross-API integration risks

- Identity is not canonical across `guestId`, `guest_id`, `guestID`, booking ID
  variants, provider IDs, and dispatcher IDs.
- Money uses unconstrained JSON numbers plus currency strings rather than a
  shared decimal/minor-unit contract.
- Envelopes vary among `data`, `voucher`, and `history`, with inconsistent
  object-versus-array cardinality.
- Pagination, errors, timestamp formats, deletion behavior, and idempotency are
  not shared contracts.
- A catalog entry or syntactically valid OpenAPI document does not prove live
  entitlement, usable routing, or response conformance.
- A single account API key reaches PII, financial settings, bookings, vouchers,
  and analytics. It provides account attribution, not end-user authorization or
  least-privilege field access.

## Integration stance

Do not generate a production connector directly from these schemas.

Before exposing any of these APIs through MCP:

1. Obtain the missing Experiences entitlement and capture one sanitized live
   response shape for every intended read.
2. Ask Nuitee for concrete Experiences component schemas and clarification of
   booking-options, pagination, payment, cancellation, and idempotency.
3. Normalize Loyalty and Voucher identities into application-owned string IDs;
   do not expose provider/account identifiers directly.
4. Normalize money into one bounded `{ amount, currency }` representation with
   explicit precision and rounding policy.
5. Keep PII and payment fields out of model-visible results. Return only the
   minimum decision-useful projection.
6. Treat points redemption, voucher changes, prebooking, booking, payment, and
   cancellation as separately authorized confirmed actions with idempotency and
   post-action verification.
7. Build separate fixed-origin connectors for the main API and the Data
   Analytics/Vouchers API.

## Official sources

- [Nuitee OpenAPI index](https://docs.liteapi.travel/reference/openapi-specifications)
- [Experiences OpenAPI](https://docs.liteapi.travel/openapi/api-experiences.json)
- [Loyalty OpenAPI](https://docs.liteapi.travel/openapi/api-loyalty.json)
- [Vouchers OpenAPI](https://docs.liteapi.travel/openapi/api-vouchers.json)
- [Analytics OpenAPI](https://docs.liteapi.travel/openapi/api-analytics.json)
- [Price Index OpenAPI](https://docs.liteapi.travel/openapi/api-price-index.json)
