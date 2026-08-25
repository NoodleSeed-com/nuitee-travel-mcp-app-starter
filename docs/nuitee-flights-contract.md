# Nuitee Flights contract

Reviewed against official Nuitee sources on 2026-08-05. Nuitee's [OpenAPI specifications index](https://docs.liteapi.travel/reference/openapi-specifications) identifies the machine-readable specs as the integration source of truth. This starter uses the current [Flights OpenAPI document](https://docs.liteapi.travel/openapi/openapiflights.json).

The contract was derived from official documentation. Later owner-authorized local smokes inspected only bounded public tool output or sanitized status/size/shape metadata; no credential or raw provider response was recorded in the repository.

## Base and authentication

- Origin: `https://api.liteapi.travel`
- Versioned base: `https://api.liteapi.travel/v3.0`
- Authentication: `X-API-Key`
- Managed secret name: `NUITEE_API_KEY`

Flights uses the normal Nuitee authentication method. See [authentication](https://docs.liteapi.travel/reference/authentication). Sandbox data is non-production, limited, inaccurate, or inconsistent in some cases. Production and whitelabel Flights access require approval, and the [access guide](https://docs.liteapi.travel/docs/getting-access-to-flights) acknowledges accounts for which Flights endpoints are not enabled.

## Endpoints used

| Intent | Method/path | Inputs used | Public fields retained |
| --- | --- | --- | --- |
| Search | `POST /flights/rates` | `legs`, `adults`, `children`, `infants`, `childrenAges`, `infantAges`, `cabinClass`, `currency`, `country` | Bounded journey/segments, carrier name/code and optional Nuitee-hosted marketing image, times, duration/stops, display total/currency, baggage hints, messages, expiry/timestamp |
| Verify | `POST /flights/verify` | `offerId` resolved privately | Availability, previous/current display total/currency, price-change state, messages, expiry/timestamp |
| Airports (documented, not active) | `GET /data/flights/airports?q=...` | `q` | Tool omitted pending direct Noodle connector compatibility |

Official pages: [search](https://docs.liteapi.travel/reference/post_flights-rates), [verify](https://docs.liteapi.travel/reference/post_flights-verify), and [airports](https://docs.liteapi.travel/reference/get_data-flights-airports).

## Search request

The OpenAPI requires `legs`, `adults`, and `currency`. Each leg requires `origin`, `destination`, and `date`; `direction` may be `OUTBOUND` or `INBOUND`. This starter sends direction explicitly.

One-way:

```json
{
  "legs": [
    { "origin": "QZX", "destination": "QZY", "date": "2030-04-20", "direction": "OUTBOUND" }
  ],
  "adults": 1,
  "children": 0,
  "infants": 0,
  "childrenAges": [],
  "infantAges": [],
  "cabinClass": "ECONOMY",
  "currency": "CAD",
  "country": "CA"
}
```

`QZX` and `QZY` are test-only fixture identifiers, not a live route. Their
current suitability and the fictional `ZZ` carrier convention are recorded in
[fixture-safety.md](fixture-safety.md).

Round-trip adds the reverse route with `direction: "INBOUND"`. The repository supports exactly one or two legs; multicity remains outside version one even though the provider contract can accept additional legs.

Cabin values are `ECONOMY`, `PREMIUM_ECONOMY`, `BUSINESS`, and `FIRST`. The OpenAPI defines child ages 2–11 and infant ages 0–1; prose says each age-array length matches its passenger count, and provider examples state infants cannot exceed adults.

Nuitee does not publish a total-passenger maximum or strict IATA/currency regex in this contract. The repository's nine-passenger cap and code shapes are defensive application policy, not provider guarantees. `country` is optional in OpenAPI but the workflow guide recommends always including it for point-of-sale pricing, so this starter requires it rather than inventing a locale default.

## Search response normalization

The documented top-level shape is `{ data: [{ journeys: [...] }] }`. The normalizer:

1. Flattens bounded provider batches.
2. Accepts one valid offer per journey, preferring `cheapestOffer` and otherwise a valid `offers[]` entry.
3. Requires a private `offerId`, bounded nonnegative display total/currency, one to eight complete segments, documented OUTBOUND/INBOUND directions, per-direction `legDurations`, and a bounded documented `totalDuration`.
4. Builds one explicit public leg per requested direction. A round trip keeps the outbound route as its comparison route and presents outbound and return schedules separately.
5. Rejects a malformed journey rather than defaulting direction, duration, codes, or price. Other valid journeys can still produce a `partial` result.
6. Creates at most ten itineraries and retains at most four baggage descriptions, six messages, and five documented amenities per itinerary.
7. Stores the full provider ID verbatim only in private state.
8. Copies the already validated application search fields into bounded `searchContext` so widgets can hydrate Edit search without receiving provider authority.
9. Retains documented airport names, marketing and distinct operating carrier facts, flight numbers, day-change/overnight hints, display base/taxes/fees, fare family/mixed-cabin/seats, and refund/change flags only when each value passes its public bound.
10. Retains `carrier.marketingLogo` only when it is an exact HTTPS airline-image URL on `sandbox.nuitee.flights` or `production.nuitee.flights`; arbitrary schemes, hosts, and paths are discarded. The UI always renders the carrier name/code and falls back to bounded initials if the image is absent or fails.

The public comparison duration is the sum of documented per-leg elapsed durations, each of which includes layovers. It deliberately does not count the days spent at the destination between outbound and return travel. The provider `totalDuration` is still required as a response-shape check but is not presented as flight time.

The public output intentionally omits provider logos, arbitrary carrier image URLs, provider IDs, raw responses, `segmentKey`, fare-basis and booking codes, fee objects and unrestricted/full terms, ancillary pricing, coordinates, and every unused nested object. The optional Nuitee-hosted marketing-carrier image is the only image exception. The starter does not try to mirror the full provider response: it keeps only decision-useful fields with explicit caps.

## Verification

The request is exactly `{ "offerId": "…" }`. The ID is resolved from the current caller's private selection state; model/browser input can never provide it directly.

The documented success shape is `{ data: [{ journey, changes? }] }`. The normalizer uses `journey.pricing.display`, expiry/timestamp, and bounded `changes.messages`. `changes.priceChanged`, or a difference from the stored search display price, produces a successful changed-price state.

The [workflow guide](https://docs.liteapi.travel/docs/build-a-flight-booking-experience) defines Search → Select → Verify → Prebook. It says search prices can change, results must not be reused across sessions, full offer IDs must be preserved verbatim for downstream calls, and a verify 404 means re-search. This starter deliberately ends at Verify.

## Error handling

| Condition | Starter category | Behavior |
| --- | --- | --- |
| Local validation / provider 400 | `invalid_request` | Fix request; no automatic fallback |
| Missing managed connector secret | `configuration_required` | Deployment owner configures key |
| 401 | `authentication` | Check server credential |
| 403 | `entitlement` | Check Flights access/environment |
| Verify 404 | `expired_offer` | Search again |
| 429 | `rate_limited` | Back off and retry later |
| Connector deadline | `timeout` | Retryable |
| Response over local cap | `oversized_response` | Narrow request/retry |
| Invalid safe response shape | `malformed_response` | Retryable; no raw body returned |
| 502 or other 5xx | `provider_error` | Retryable, sanitized |
| 503 | `service_unavailable` | Retry later |
| Successful verify envelope with an empty `data` array | `unavailable_offer` | Search again |
| Nonempty verify item missing its documented journey | `malformed_response` | Retry; no raw body returned |

Search endpoint-specific docs list 200/400/401/502/503. Verify lists 200/400/401/404/502/503. General [error handling](https://docs.liteapi.travel/reference/error-handling) defines 403, and general [rate limiting](https://docs.liteapi.travel/reference/rate-limiting) defines 429, so both are handled without assuming a Flights-specific response body.

The application mapping for thrown connector statuses/messages is covered hermetically at the gateway boundary. The generated public connector guidance does not currently document the exact thrown error object for every transport/runtime failure, so a credentialed owner-authorized smoke must confirm 400/401/403/404/429/502/503 and deadline behavior before those mappings are claimed as live-runtime evidence.

### Observed live evidence and response-size follow-up

An owner-authorized 2026-08-04 live MCP session successfully searched a bounded YQY–YHZ sandbox route, returned ten normalized itineraries, and verified one application selection without exposing its upstream offer ID. This proves the corrected deterministic compute path, state handoff, and both POST operations for that bounded case only.

A YYZ–LIS request returned `200 OK`, the documented `data[].journeys[]` shape, and 2.85 MB without filters; an earlier filtered probe remained about 1.55 MB with `filters.showCheapestOfferOnly`, `filters.maxStops: 1`, and ascending price sort. A later complete round-trip response measured exactly 4,960,533 decoded bytes, with 276 of 276 journeys containing both requested legs. `@noodleseed/one` 0.116 raises the authored per-operation maximum to 6 MiB. This starter sets search to 6 MiB at both connector and application parsing boundaries and proves the measured response class completes bounded normalization hermetically. Verification retains its smaller application cap and no widened connector limit.

On exact 0.138.0, a fresh owner-authorized round-trip control returned HTTP 200, valid documented JSON, and exactly 4,207,267 decoded bytes. The equivalent connector completed bounded mapping to ten itineraries, all ten contained complete outbound and return legs, and a same-session application selection and active fare verification succeeded. This closes the representative greater-than-3-MiB and round-trip release evidence for that sandbox request without increasing any non-search limit. Nuitee's current OpenAPI documents filters and sort but no search result-count limit or pagination contract, so the repository does not invent one.

The latest airport comparison did not isolate a connector defect: the direct control followed one redirect and returned 69 bytes of HTML rather than valid JSON, while the connector returned no mapped output or observable public upstream cause. Because the direct control also failed its JSON-shape requirement, the result is inconclusive and points first to endpoint/redirect/request verification. The active connector and model tool continue to omit airport lookup until equivalent current direct and connector requests both succeed.

## Known ambiguities

1. **Verify pricing:** prose describes original and display pricing, while the current `FlightFullOfferPricing` schema guarantees only `display` and `converted`. Normalize only `display`; ignore undocumented extras.
2. **Offer ID format:** official examples/prose describe an opaque msgpack-encoded value, while one 400 example says UUIDv7. Do not validate provider ID format; retain the search value verbatim and validate only the application selection ID.
3. **Streaming path:** search prose mentions `/flights/rates/stream`, but the current Flights OpenAPI does not define it. Use JSON `POST /flights/rates` with normal JSON response handling.
4. **Rate limit numbers:** official pages disagree on numeric limits. Do not encode a number; classify 429 and back off.
5. **Flights access:** one section says sandbox is enabled by default, while common issues say Flights endpoints may not be enabled. Document key possession and Flights access separately.
6. **Optional response fields:** most nested response fields are not required and success examples are sparse. Normalize defensively; partial/malformed fixtures are mandatory.
7. **Segment timestamps:** described as ISO 8601 but not formally constrained or guaranteed to carry a timezone. Preserve the provider's bounded airport-local wall-clock components for schedules; never silently convert them to the viewer's timezone.
