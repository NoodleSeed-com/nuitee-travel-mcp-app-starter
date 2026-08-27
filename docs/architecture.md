# Architecture

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
         open / search / select / verify
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
           official Flights API
```

`apps/web/` is the primary product surface. It owns the conversation shell, delayed guest admission, typed message renderer, plain-language activity, and read-only trip projection. It calls neither Nuitee nor MCP tools directly. On the first submitted message, the official Assistant hook uses the public embed ID to open an anonymous session. Linked travel Apps render through `NoodleAppView` with the existing client.

`src/` owns the MCP server, model-facing workflows, exact public capability allowlist, connector, tools, state, and linked Apps. External MCP hosts enter the same server and provide their own model. No browser-specific or host-specific copy of the business tools exists.

The public Assistant surface allowlists exactly:

- `open_travel_starter`;
- `search_flights`;
- `verify_flight_offer`; and
- App-only `select_flight_offer`.

The last helper remains `visibility: ['app']`; it is available to the trusted linked App bridge but is not offered to the model as a conversational tool.

## Repository surfaces

| Surface | Entrypoint | Credentials resolved | Purpose |
| --- | --- | --- | --- |
| Primary website | `apps/web/` | Public embed ID and optional public service origin | Guest chat-first Search → Select → Verify experience |
| Public Assistant MCP | `src/embedded-server.ts` | Nuitee key plus operator-provided Assistant model settings in Noodle | Anonymous Assistant sessions over the exact public allowlist |
| External MCP baseline | `src/server.ts` | None | Credential-free home and explicit live-tool configuration errors |
| External MCP live | `src/live-server.ts` | `NUITEE_API_KEY` in Noodle when executed | Provider-backed use from DevTools or external MCP hosts |
| Migration reference | `examples/embedded-assistant-host/` | Local synthetic website session or backend Assistant client settings | Temporary authenticated parity oracle; not the primary app |

All MCP entrypoints call `createTravelServer(...)`. Tool names, schemas, output bounds, normalizers, state rules, and Apps are shared. The credential-free split exists because the active HTTP connector resolves its managed secret before local protocol smoke; it prevents ordinary offline tests and external-host exploration from needing a dummy key or fixture fallback.

## Guest Assistant lifecycle

1. The Next.js route resolves `NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID` and the exact service origin.
2. Mounting the page renders only the zero state; it spends no public admission and creates no Assistant session.
3. The first valid guest message mounts `TravelConversation`, generates a browser-memory `principalKey`, and starts the official public client.
4. The hook sends locale and IANA time zone only as untrusted presentation context.
5. The service binds the session to the public surface's exact origin, allowlist, model, budget, and anonymous principal.
6. Typed text, interactions, structured results, and App views flow through the same Assistant client.
7. New trip/reset unmounts that client, aborts active work through the hook, and clears the in-memory transcript, principal key, and trip projection together.

The guest website has no `/api/assistant/session` route and no Assistant client ID or secret. Public origin checks are browser boundaries, not bot authentication; the capability allowlist, confirmation requirements, admission controls, and daily budget are the abuse boundaries.

## Search data flow

1. The model supplies only travel intent fields from `searchInputSchema`.
2. The compute gateway validates route/date/traveler relationships against server-authoritative time.
3. The gateway calls the allowlisted search operation once. Tool input cannot select an origin, URL, path, method, header, credential, or provider offer ID.
4. The connector sends the exact request to `POST /flights/rates` and injects `X-API-Key` from the managed secret.
5. Search permits up to 6 MiB at connector and application parsing boundaries. The gateway flattens bounded journeys, keeps one valid offer per itinerary, normalizes at most ten, and accepts only exact allowlisted Nuitee airline-image origins.
6. Every provider offer ID becomes a private caller-scoped record. Public output receives only an application-issued `sel_…` handle.
7. The tool replaces `flight_selections` using revision control and a 30-minute TTL; a new search begins with no active selection.
8. At most three itineraries display inline. The same App may show up to ten only when the host grants fullscreen presentation.
9. The validated `searchContext` drives both the App editor and the website's read-only trip rail. The rail never parses Assistant prose or stores identifiers.

If validation or the provider fails, the application returns bounded sanitized state and consults no fixture. A valid empty result clears stale route projection and reports no fares found.

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

The browser receives no model key, Nuitee key, Assistant client secret, raw provider response, server continuation, provider transaction identifier, or direct MCP credential. Content Security Policy must allow the exact Noodle service origin in `script-src`, `connect-src`, and `frame-src`; all other public runtime origins remain application-owned.

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
