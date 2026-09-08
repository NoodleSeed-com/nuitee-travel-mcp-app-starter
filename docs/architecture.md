# Wayfare architecture

Wayfare is an example project by Noodle Seed. The Wayfare identity names the
travel experience; Noodle Seed is its author and MCP/assistant foundation.

## Primary runtime shape

```text
Next.js guest browser
  │ public embed ID; no assistant client secret
  ▼
Noodle public Assistant surface ───── External MCP host
  │ model turns and typed views             │ host model
  └──────────────────┬──────────────────────┘
                     ▼
              shared travel MCP
       flight/hotel reads + illustrative tools
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
  sandboxed compute       caller-scoped state
  validation/gateway      selectionId → offerId
         │                       ▲
         └───────────┬───────────┘
                     ▼
           fixed Nuitee connector
        https://api.liteapi.travel/v3.0
                     │
                     ▼
           official flight and hotel APIs
```

`apps/web/` is the primary product surface. Its high-contrast Host Grotesk homepage owns
one general composer, so capability choice stays inside the agent rather than
in a pre-conversation menu. The hero keeps only the H1 over the layered image;
idle, empty input examples are visual-only typewriter prompts that stop on
focus or input and resolve to one static prompt for reduced motion. Its
blue-hour BorderBeam appears only while the agent is submitting or responding;
idle and focused composers stay static, and the arrow-only submit control keeps the action compact.
The header
keeps only the Wayfare lockup, currency, and menu visible; planning and
developer navigation remain keyboard-accessible inside that menu. A single
official-logo attribution row follows the hero and is not duplicated in the
footer. The optional full-bleed `/experience` visual-reference
route may reuse the complete core hero catalog without defining the default
product entry model. After submission `TravelAssistantPage` hands the unchanged
journey to `TravelConversation`, which owns one chronological conversation,
delayed guest admission, typed message rendering, and plain-language activity.
`TravelMessage` preserves
message-part order and delegates official inline MCP Apps to `NoodleAppView`.

The [Wayfare brand guidelines](brand/wayfare-brand-guidelines.md) are the
normative presentation contract for the website and repository-owned MCP Apps.
`AGENTS.md` requires coding agents to read them before any user-facing design,
implementation, or review.
Every distinct view ID is a distinct chronological invocation and remains
mounted in history; the website has no newest-only selector, generic App
deduplication, second results workspace, page-authored fare reconstruction, or
viewport-dependent DOM reordering. The website calls neither Nuitee nor MCP
tools directly. On the first submitted message, the official Assistant hook
uses the public embed ID to open an anonymous session.

The website admits only these exact linked-App identities:

- `search_flights` + `ui://nuitee_travel_mcp_app_starter/search_flights_widget`;
- `open_travel_starter` + `ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget`;
- `search_hotels` + `ui://nuitee_travel_mcp_app_starter/search_hotels_widget`;
- `open_hotel` + `ui://nuitee_travel_mcp_app_starter/open_hotel_widget`;
- `search_experiences` + `ui://nuitee_travel_mcp_app_starter/search_experiences_widget`;
- `add_experience_to_trip` + `ui://nuitee_travel_mcp_app_starter/add_experience_to_trip_widget`;
- `open_loyalty` + `ui://nuitee_travel_mcp_app_starter/open_loyalty_widget`;
- `compare_reward_flights` + `ui://nuitee_travel_mcp_app_starter/compare_reward_flights_widget`;
- `review_trip` + `ui://nuitee_travel_mcp_app_starter/review_trip_widget`; and
- `compare_travel_insurance` + `ui://nuitee_travel_mcp_app_starter/compare_travel_insurance_widget`.

A tool/URI mismatch fails closed inline and never reaches `NoodleAppView`. The compact typed trip disclosure stays inside the conversation, is absent before typed facts exist, and exposes only validated route, date, party, cabin, and optional secondary facts; it never parses Assistant prose.

`apps/web/src/components/wayfare-mark.tsx` owns the deterministic route-line SVG logo asset. Every functional interface icon in the Next.js website comes from the pinned Heroicons React package. Outline icons are the default; compact solid icons are reserved for status emphasis. Hand-authored utility SVGs and mixed icon libraries are not permitted in that surface. Official Noodle Seed and Nuitée SVG wordmarks are a narrow identity-attribution exception, not product icons. The website does not use icons to imply attachments, payment, booking, voice, or account capabilities. The default homepage layers the configured blue-hour panorama beneath a fixed transparent cabin foreground and applies bounded mouse-only movement to the panorama; touch and reduced-motion presentations remain static. `/experience` may read the complete mode-aware `1672 × 941` visual catalog from `apps/web/src/lib/travel-hero-content.ts`. The passive editorial destination cards retain their local JPEG masters. None are claimed as literal 4K sources, and Next.js produces responsive AVIF/WebP delivery from them. Exact bytes, hashes, crop choices, and visual-review evidence are in [the Wayfare provenance ledger](visual-assets/wayfare-premium-concierge.md).

The repository-owned MCP Apps implement the compact Wayfare card/carousel
pattern. The canonical brand guidelines include the approved ChatGPT host-theme
exception; the Wayfare website retains its light palette and Host Grotesk.

`src/` owns the MCP server, model-facing workflows, exact public capability allowlist, connector, tools, state, and linked Apps. External MCP hosts enter the same server and provide their own model. No browser-specific or host-specific copy of the business tools exists.

The baseline `src/embedded-server.ts` public Assistant surface remains
flights-only and allowlists four model-visible tools plus one App-only helper,
exactly:

- `open_travel_starter`;
- `plan_flight_search`;
- `search_flights`;
- `verify_flight_offer`; and
- App-only `select_flight_offer`.

The last helper remains `visibility: ['app']`; it is available to the trusted linked App bridge but is not offered to the model as a conversational tool.

The expanded `src/demo-embedded-server.ts` profile reuses those flight
capabilities and adds eight model-visible tools: `search_hotels`, `open_hotel`,
`search_experiences`, `add_experience_to_trip`, `open_loyalty`, `compare_reward_flights`, `compare_travel_insurance`, and
`review_trip`—plus App-only `select_hotel`. In live and embedded profiles, `search_hotels` uses the fixed Nuitee
`POST /v3.0/hotels/rates` connector. `src/demo-preview-server.ts` is the
credential-free fictional alternative. Experiences, rewards, reward flights and protection
remain illustrative compute; they do not access accounts, redeem points or
purchase policies. `open_hotel` reopens a named hotel from the current caller's stored search without refreshing rates or selecting it. `add_experience_to_trip` records an explicitly chosen returned date/time in temporary caller state, with a 30-minute expiry and acknowledged, duplicate-safe writes. These tools are provider-read-only; selections change conversation planning state, not provider inventory. No selection is a booking.

Any combination of selected flight, stay, and experiences is a valid planning review. Review buttons read current selections inline without sending a chat message. Explore experiences also opens inline using the selected context. Flight-derived dates are labeled as provisional browsing dates, not confirmed arrival or activity dates; known stay dates retain their source. Missing components remain optional, and prices stay separate.

The visual contract is one centered chronological conversation. Linked Apps stay inline at their original message-part positions.
Distinct view IDs are not generically deduplicated. Mismatched tool/resource pairs fail closed.
Current trip stays inside the conversation. Local proof is not hosted proof.

## Repository surfaces

| Surface | Entrypoint | Credentials resolved | Purpose |
| --- | --- | --- | --- |
| Primary website | `apps/web/` | Public embed ID and optional public service origin | Guest chat-first core landing plus optional expanded illustrative views |
| Public Assistant MCP | `src/embedded-server.ts` | Nuitee key plus operator-provided Assistant model settings in Noodle | Anonymous Assistant sessions over the exact public allowlist |
| Expanded Assistant | `src/demo-embedded-server.ts` | Same hosted boundaries as the public Assistant | Current flights and hotels plus fictional experiences, rewards and travel protection |
| External MCP baseline | `src/server.ts` | None | Credential-free home and explicit live-tool configuration errors |
| Expanded fictional preview | `src/demo-preview-server.ts` | None | Fictional hotel/ancillary UI; flight tools report missing configuration, no provider fallback |
| Expanded live MCP | `src/demo-live-server.ts` | `NUITEE_API_KEY` | Provider-backed flights and hotels plus illustrative ancillary views |
| External MCP live | `src/live-server.ts` | `NUITEE_API_KEY` in Noodle when executed | Provider-backed use from DevTools or external MCP hosts |
| Migration reference | `examples/embedded-assistant-host/` | Local synthetic website session or backend Assistant client settings | Temporary authenticated parity oracle; not the primary app |

All MCP entrypoints call `createTravelServer(...)`. Tool names, schemas, output bounds, normalizers, state rules, and Apps are shared. The credential-free split exists because the active HTTP connector resolves its managed secret before local protocol smoke; it prevents ordinary offline tests and external-host exploration from needing a dummy key or fixture fallback.

## Guest Assistant lifecycle

1. The Next.js route resolves `NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID` and the exact service origin.
2. Mounting the page renders only the zero state; it spends no public admission and creates no Assistant session.
3. The first valid guest message mounts `TravelConversation`, generates a browser-memory `principalKey`, and starts the official public client.
4. The hook sends locale and IANA time zone as untrusted presentation context. It may also send a derived airport/city/country/currency page default; precise coordinates never enter the Assistant context.
5. The service binds the session to the public surface's exact origin, allowlist, model, budget, and anonymous principal.
6. Typed text, interactions, structured results, and App views flow through the same Assistant client.
7. New trip/reset unmounts that client, aborts active work through the hook, and clears the in-memory transcript, principal key, and trip projection together.

The guest website has no `/api/assistant/session` route and no Assistant client ID or secret. Public origin checks are browser boundaries, not bot authentication; the capability allowlist, confirmation requirements, admission controls, and daily budget are the abuse boundaries.

Deterministic local browser evidence proves this composition only against a loopback fixture. Hosted behavior remains unproven until a separately authorized deployment and exact embed-binding verification exercise the intended revision and origin.

## Search data flow

1. When a clear route has no usable exact or relative date clue, `plan_flight_search` collects departure and optional return dates through one portable structured-input interaction and returns a typed trip plan. `Next week` instead resolves to the same local weekday seven days after the server-provided local date, without another question. Planning performs no connector operation.
2. The model calls `search_flights` immediately from the typed facts. One-way, one adult, and Economy are visible defaults when the traveler does not supply a return trip, party, or cabin; a generic passenger count is treated as adults unless children or infants are explicit. The guest website may suggest an untrusted derived origin, currency, and pricing market when those facts are omitted; explicit traveler text always wins. Other hosts and unresolved website sessions retain USD and the US pricing market. The response states the applied assumptions and offers adjustment after the read-only search rather than requiring confirmation first.
3. The compute gateway validates route/date/traveler relationships against server-authoritative time.
4. The gateway calls the allowlisted search operation once. Tool input cannot select an origin, URL, path, method, header, credential, or provider offer ID.
5. The connector sends the exact request to `POST /flights/rates` and injects `X-API-Key` from the managed secret.
6. Search permits up to 6 MiB at connector and application parsing boundaries. The gateway flattens bounded journeys, keeps one valid offer per itinerary, normalizes at most ten, and accepts only exact allowlisted Nuitee airline-image origins.
7. Every provider offer ID becomes a private caller-scoped record. Public output receives only an application-issued `sel_…` handle.
8. The tool replaces `flight_selections` using revision control and a 30-minute TTL; a new search begins with no active selection.
9. At most three itineraries display inline. The same App may show up to ten only when the host grants fullscreen presentation.
10. Validated planning and search results drive the compact Current trip summary inside the conversation. The summary never parses Assistant prose or stores identifiers.

If validation or the provider fails, the application returns bounded sanitized state and consults no fixture. A valid empty result clears stale route projection and reports no fares found.

## Fictional experience discovery

The expanded preview, live, and embedded profiles all register the same
`search_experiences` tool. `src/experience-fixtures.ts` supplies a deterministic
Lisbon/Tokyo catalog; this tool performs no provider HTTP request. Exact stay
dates and party size shape sample slots. Optional interest or step-free filters
apply only when requested. Unsupported destinations and filters with no matches
produce explicit empty results instead of invented replacement inventory.

Every result carries `dataSource: illustrative`, `source: WAYFARE_DEMO`, and
`isFictional: true`. The linked `ExperienceResultsView` offers a carousel,
details, a two-item comparison, and explicit date/time selection. A single named
match opens details directly; broad or ambiguous matches stay in the carousel.
The server owns temporary experience search snapshots and selected slots; widget
state owns navigation only. `add_experience_to_trip` validates the returned
references and acknowledges a successful state write before showing Added.
`review_trip` reads those selections alongside optional flights and stays.
There is no live admission check, reservation, or booking.

The widget's fixed decorative photos load from `https://images.unsplash.com`
under its resource-only CSP. They do not validate a fictional operator or its
inventory. This ordinary image traffic is separate from the compute tool and
can disclose request metadata to the image host; see [SECURITY.md](../SECURITY.md).

## Selection and verification data flow

1. A linked App click records one application-issued `selectionId` through the App-only helper. Hosts without Apps may pass that opaque handle explicitly.
2. The model-visible verification tool defaults to the caller's active selection. Explicit mode is reserved for a clearly different choice.
3. The gateway validates ID syntax, state age, active-search identity, record membership, and TTL before provider access.
4. Unknown, stale, or expired selections stop before a Nuitee call.
5. A valid private record supplies the provider offer ID for one `POST /flights/verify` request.
6. The provider ID is discarded from public output. The result contains bounded availability, old/new display price, change state, messages, and expiry.
7. A changed fare is a successful verification outcome. An unavailable or expired fare directs the user to search again.

The terminal product state is a verified fare review. No provider ID is retained for prebook, no passenger or payment data is collected, and no transaction or handoff URL is emitted.

## Browser and credential boundaries

| Value | Owner/storage | Browser-visible |
| --- | --- | --- |
| Public embed ID | Website deployment configuration | Yes, intentionally non-secret |
| Public Assistant service origin | Website deployment configuration | Yes, exact origin only |
| Anonymous Assistant session | Noodle service and browser memory | Short-lived browser response only |
| `NUITEE_API_KEY` | Ignored local authoring store or Noodle managed secret | Never |
| Assistant model variables/key | Noodle deployment configuration | Never |
| Provider `offerId` | Private caller-scoped Noodle state | Never |
| Application `selectionId` | Public tool/App output bound to private caller state | Yes |
| Optional Assistant client secret | Authenticated website backend only | Never |
| Request IP | Fly.io proxy and the server-side IPinfo Lite lookup | Never sent to client props or assistant context; only a coarse country code may reach untrusted page context |

The browser receives no model key, Nuitee key, Assistant client secret, raw provider response, server continuation, provider transaction identifier, or direct MCP credential. Content Security Policy must allow the exact Noodle service origin in `script-src`, `connect-src`, and `frame-src`; all other public runtime origins remain application-owned.

The permission-free country and currency flow is documented in [`docs/privacy.md`](privacy.md). Browser geolocation is disabled. A server-side IPinfo Lite lookup may derive only a coarse country code from Fly.io's trusted request header; it never supplies authorization, infers an airport, or overrides a traveler-stated route or manual currency choice.

## Optional authenticated extension

Authentication is not part of the guest runtime. A developer adding an identity-bound capability must keep website login, backend Assistant session exchange, and direct MCP customer OIDC separate. The backend authenticates the website user, validates the exact origin, calls `createAssistantSession`, and forwards the short-lived response unchanged. Direct customer access requires its own compliant issuer and `customerAuth.oidc(...)` or supported adapter.

See [oauth.md](oauth.md). The synthetic login in `examples/embedded-assistant-host/` is retained only as a temporary migration reference and must not be copied as production identity.

## Failure layers

1. **Website setup:** missing public embed ID, invalid service origin, or blocked CSP.
2. **Public admission:** exhausted daily budget with no automatic retry loop.
3. **Assistant session:** transient service failure, terminal service error, or expired session.
4. **Local input:** `invalid_request` before provider access.
5. **Configuration/auth/access:** `configuration_required`, `authentication`, `entitlement`.
6. **Capacity/transport:** `rate_limited`, `timeout`, `oversized_response`.
7. **Provider/data:** `provider_error`, `service_unavailable`, `malformed_response`, partial success, or empty success.
8. **Fare lifecycle:** `unknown_or_stale_selection`, `expired_offer`, `unavailable_offer`, or successful changed fare.

User-visible copy comes from bounded application constants. Raw error bodies, URLs, tokens, internal tool names, invocation IDs, and stacks never render.
