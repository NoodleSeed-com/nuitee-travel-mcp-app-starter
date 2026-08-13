# Architecture

## Runtime shape

```text
External MCP host or optional embedded assistant
                    │
                    ▼
          Noodle model-visible tool
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
  sandboxed compute      caller-scoped Noodle state
  validation/gateway     selectionId → provider offerId
          │                   ▲
          └─────────┬─────────┘
                    ▼
          fixed Nuitee HTTP connector
       https://api.liteapi.travel/v3.0
                    │
                    ▼
          official Nuitee Flights API
```

The browser never calls the Nuitee API. Both React entry widgets call or consume Noodle tools through the supported host bridge. Their CSP declares no external connection or frame origin. TravelHome has no external resource origin; FlightResults allows images only from the exact Nuitee Flights sandbox and production asset origins so it can display a validated `marketingLogo` supplied in search results. TravelHome can send an explicit user-authored search follow-up to a capable host; FlightResults uses a persisted Search/Edit → Results → Verified fare-review flow and calls only `verify_flight_offer` directly.

## Entrypoints

| Entrypoint | Credentials resolved | Purpose |
| --- | --- | --- |
| `src/server.ts` | None | Credential-free home, offline baseline, explicit configuration errors for live tools |
| `src/live-server.ts` | `NUITEE_API_KEY` when executed | External MCP hosts and local live provider use |
| `src/embedded-server.ts` | Nuitee key plus three assistant-model settings when executed | Optional authenticated website/SaaS embed |

All three call `createTravelServer(...)`. Tool names, schemas, output bounds, normalizers, state rules, and widgets are shared; there is no assistant-specific business tool set.

The split exists because an active HTTP connector resolves its managed secret before local protocol smoke. The split keeps the supported external-host baseline credential-free without a dummy key, raw environment read, fake endpoint, or fixture fallback. The live and embedded entrypoints reuse the same product factory once their respective server-side configuration is present.

## Search data flow

1. The model supplies only travel intent fields from `searchInputSchema`.
2. The compute gateway applies relationship validation using the server-authoritative local date.
3. The gateway calls the allowlisted `search` operation once. It cannot accept an origin, URL, path, method, or header.
4. The HTTP connector sends the exact JSON `legs` request to `POST /flights/rates`, injecting `X-API-Key` from the managed secret.
5. Search alone permits up to 6 MiB at the connector and application parsing boundaries. The gateway then flattens bounded `data[].journeys[]`, accepts one valid offer per itinerary, normalizes at most ten, and keeps an optional airline image only from the exact Nuitee Flights asset allowlist.
6. Each provider offer ID becomes a private selection record. The public itinerary receives only an application-issued `sel_…` identifier.
7. The tool replaces the caller's `flight_selections` state using revision control and a 30-minute TTL.
8. The result exposes at most three itineraries inline; the same FlightResults component may show up to ten when the host reports fullscreen display mode.
9. The output includes the already validated `searchContext`, allowing familiar fields to be hydrated without exposing the provider request or raw response. Submitting natural place-name edits sends a host follow-up so ambiguity is resolved conversationally.

If validation or the provider fails, no fixture is consulted. The tool returns a bounded failure category and clears/replaces the current selection set with no provider IDs.

## Verification data flow

1. The widget or model passes only an application `selectionId`.
2. The tool reads private caller-scoped state.
3. The compute gateway verifies ID syntax, state age, active-search identity, record membership, and documented expiration.
4. An unknown, stale, or locally expired selection stops before any Nuitee call.
5. For a valid record, the gateway calls `POST /flights/verify` once with the exact provider ID held in state.
6. The provider ID is discarded from public output. The result contains availability, old/new display price, change state, bounded messages, and expiry.
7. A price change is success. An expired/missing offer directs the user to search again.

The starter stops at a verified fare review. It does not preserve the provider ID for prebook, collect passenger details, or expose a transaction/handoff URL. A future handoff must be server-created, short-lived, and restricted to one exact deployment-owned HTTPS origin.

## Airport input boundary

Version one requires three-letter IATA codes at the typed tool boundary. The latest airport lookup comparison did not establish a current connector-only defect: the direct control redirected to HTML rather than returning valid JSON, and the connector produced no mapped result. No unverified lookup tool or fixture-backed substitute is exposed; capable host models may resolve clear names conversationally and must ask when ambiguous.

## Secret boundaries

| Value | Owner/storage | Public visibility |
| --- | --- | --- |
| `NUITEE_API_KEY` | Project-root ignored `.env` fallback or scoped Noodle local store during authoring; Noodle managed cloud secret after deployment | Never browser/model/tool output/state/log/source |
| Provider `offerId` | Private caller-scoped state | Never browser/model/tool output |
| `selectionId` | Application-issued public handle | Tool/widget/model; valid only against current private state |
| Assistant model settings | Optional Noodle deployment variables/secret | Never browser; unrelated to Nuitee key |
| Assistant backend client secret | Embedding SaaS backend | Never MCP tool or browser |
| Short-lived assistant session | Browser memory | Browser only, bounded lifetime |

Selection state is not a substitute for tenant authorization. A multi-tenant product must add verified customer identity and server-owned tenancy routing; browser hints, model input, and tool arguments cannot choose credentials or downstream origins.

## Text and widget outputs

Every widget-linked tool has a typed structured output and a bounded `fallback` field. Apps-capable hosts render TravelHome or FlightResults; those entry widgets share the same form, tokens, and journey semantics. Other hosts can explain the same state from the structured fields and fallback text. The provider raw response is never an output schema field, and Zod bounds exist on every public list and nested list.

## Failure layers

1. **Local input:** `invalid_request` before provider access.
2. **Configuration/auth/access:** `configuration_required`, `authentication`, `entitlement`.
3. **Capacity/transport:** `rate_limited`, `timeout`, `oversized_response`.
4. **Provider/service:** `provider_error`, `service_unavailable`.
5. **Data:** `malformed_response`, partial success, or empty success.
6. **Offer lifecycle:** `unknown_or_stale_selection`, `expired_offer`, `unavailable_offer`, or successful changed fare.

Raw error bodies are treated as untrusted. Classification may inspect bounded status/code signals internally, but public messages come from application-owned constants.
