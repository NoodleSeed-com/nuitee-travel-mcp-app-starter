# Guest embedded Assistant

`apps/web/` is the primary developer experience in this repository: a guest-first Next.js travel website whose embedded Assistant exposes the same Search → Select → Verify product as external MCP hosts.

Local tests prove the code and browser shell. They do not prove an active hosted Assistant, provider inventory, a production origin, daily admission budget, privacy monitoring, or a public release. Those require the exact promotion evidence in [../PUBLIC_RELEASE_CHECKLIST.md](../PUBLIC_RELEASE_CHECKLIST.md) and separate authorization for every hosted mutation.

## Guest-first architecture

```text
Next.js guest browser
  → public embed ID and exact Noodle service origin
  → Noodle public Assistant surface and model
  → shared travel MCP tools and linked Apps
  → server-side Nuitee connector
  → Nuitee Flights API
```

The browser uses the custom renderer in `apps/web/` with `useNoodleAssistant` and `NoodleAppView`. It does not implement a second chat transport, fetch `ui://` resources, copy the linked Apps, or call Nuitee directly.

`src/embedded-server.ts` calls the same `createTravelServer('embedded')` product factory as the other entrypoints. Its public surface allowlists the same four tool instances registered on the server:

- model-visible `open_travel_starter`;
- model-visible `search_flights`;
- model-visible `verify_flight_offer`; and
- App-only `select_flight_offer`.

The public surface is anonymous, not identity-free: Noodle binds each session to an anonymous principal, exact surface, admission controls, and budget. It has no `${user}` claims, customer routing, delegated credentials, or website account.

## Product boundary

The Assistant may open the starter, search one-way or round-trip flights, select an application-issued fare handle, and verify current availability and price. A verified or changed fare is terminal.

It does not prebook, hold inventory, collect passenger data, take payment, issue a ticket, manage a booking, cancel, refund, redeem loyalty, or search hotels and cars. Neither a selection nor a verified fare implies that inventory is held.

## Website runtime configuration

The primary website reads only two public values:

| Variable | Purpose | Secret |
| --- | --- | --- |
| `NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID` | Stable identifier for the active public Assistant surface | No |
| `NEXT_PUBLIC_NOODLE_SERVICE_URL` | Exact Noodle service origin; optional when using the default Cloud origin | No |

Copy `apps/web/.env.example` into an ignored local file only after an active assistant-enabled deployment provides the real embed ID. The service URL must be an exact HTTPS origin, or an explicit `localhost`/`127.0.0.1` origin with a port for local development.

The Noodle deployment, never the browser, owns:

- `NUITEE_API_KEY`;
- `ASSISTANT_MODEL_BASE_URL`;
- `ASSISTANT_MODEL`;
- `ASSISTANT_MODEL_API_KEY`; and
- any future connector or delegated-exchange secret.

Do not put those values in `NEXT_PUBLIC_` variables, source, HTML, cookies, URLs, screenshots, logs, fixtures, or Assistant context. A public embed ID is safe in page source; an Assistant client secret is not.

## Local development

From the repository root:

```sh
pnpm install
pnpm dev:web
```

Open `http://localhost:3000`. Without an embed ID, the real zero state and `/developers` route render normally. The first submitted message shows a bounded setup-required state; the app does not activate fixtures or a fake Assistant.

Validate the MCP independently:

```sh
pnpm agent:check
pnpm agent:check:assistant
```

The default page does not open an Assistant session on mount. Admission starts only after a valid first message. The guest `principalKey`, transcript, and trip projection remain in browser memory and reset together.

## Exact origins and CSP

The committed public surface allows only the exact Next.js loopback origins `http://localhost:3000` and `http://localhost:3001`; the second supports a local fallback when port 3000 is occupied. Before a hosted browser test, configure the real deployment-owned HTTPS website origin:

```sh
pnpm customize -- --production-origin "https://<your-exact-domain>"
pnpm customize:check
```

Keep loopback only when the same non-production deployment intentionally serves local development. Wildcards, paths, query strings, fragments, userinfo, trailing slashes, and non-loopback HTTP origins fail validation.

The Next.js security headers allow the exact Noodle service origin in:

- `script-src` for the public embed runtime;
- `connect-src` for session and turn traffic; and
- `frame-src` for linked App sandboxes.

Keep `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, the restrictive permissions policy, and the exact service origin. A blocked `script-src` prevents the runtime from starting, so the page cannot report that failure from inside the Assistant.

Run the local non-mutating preflight and production-equivalent website build before promotion:

```sh
pnpm exec noodle assistant embed --check --json --surface public
pnpm --filter @nuitee-travel-starter/web build
```

The preflight reports required or missing environment names without printing values. It does not prove that a hosted deployment, origin, embed ID, privacy link, or budget is active.

## Public admission and budget

A public surface must have one reviewed daily turn budget and an operational kill switch. Before inviting traffic, the owner must inspect the active embed projection, exact origins, four allowed capabilities, current spend, and configured cap. Budget exhaustion is a calm unavailable state; the website does not automatically retry it.

Budget changes and embed revocation are hosted mutations. Do not run them under local implementation authority. Record the exact organization, app, environment, old value, new value, approver, and post-change probe in the promotion evidence.

## Browser proof required for a hosted claim

Use synthetic or explicitly approved provider input and prove all of the following against the exact candidate revision and active target:

1. The page loads without starting an Assistant session.
2. The first message opens one anonymous session from the exact HTTPS origin.
3. Search returns bounded current results or a truthful empty/partial state.
4. App selection updates only caller-scoped state and exposes no provider offer ID.
5. Verify reaches a verified, changed, unavailable, or expired fare without implying a hold or booking.
6. Text, confirmation/input fallbacks, and linked Apps render through the official typed client.
7. Missing configuration, wrong origin, budget exhaustion, expired session, retryable service failure, terminal failure, and unavailable App views produce safe bounded UI.
8. Browser network, DOM, storage, built assets, console, and logs contain no Nuitee key, model key, Assistant client secret, raw provider body, or private offer ID.
9. Desktop, 390px mobile, keyboard, 200% text zoom, dark mode, and reduced motion remain usable.
10. The privacy and support destinations resolve, are monitored, and describe the actual data flow.

Local Playwright coverage deliberately stays on the zero state and sends no `/v1/assistant/` requests. It is not a substitute for this hosted smoke.

## State and TTL proof

Selection state is caller-scoped, revision-protected, and expires after 30 minutes. Before a hosted readiness claim, prove the complete lifecycle on one unrestarted deployment:

1. search and select one fare;
2. verify that fare before expiry;
3. wait for the real 30-minute TTL and prove the stale selection fails before provider access;
4. run a fresh search in the same caller/session boundary;
5. select and verify the new fare successfully; and
6. confirm that no old provider identifier or revision is reused.

Do not shorten the TTL, redeploy between steps, patch an application reset workaround, or infer a pass from the expected stale-selection rejection alone.

## Privacy and support

The checked-in `starterConfig.website.privacyUrl` and `termsUrl` are `null`, so the website renders no invented legal links. Configure one real HTTPS privacy URL and a monitored support destination before a hosted public-readiness claim. The privacy notice must cover anonymous Assistant/model processing, page and client context, Nuitee-backed flight searches, retention, third parties, budgets, and the fact that the site does not create bookings.

The `/developers` route renders support only from configured application paths and renders privacy only when a real URL exists. Do not use a reserved example domain or claim monitoring that has not been established.

## Optional authenticated extension

The guest website has no `/api/assistant/session` route. If a future identity-bound capability requires sign-in, follow [oauth.md](oauth.md) and keep these layers distinct:

1. the website's own login and server session;
2. backend `createAssistantSession` exchange using deployment-bound client credentials; and
3. optional direct MCP customer authentication through a compliant issuer and `customerAuth.oidc(...)` or supported adapter.

The authenticated browser replaces `embedId` with a same-origin `sessionEndpoint`; it never uses both. The backend authenticates first, validates the exact origin, derives claims and tenant routing from server-owned state, and forwards the session response unchanged.

## Legacy authenticated host

`examples/embedded-assistant-host/` remains a **temporary authenticated migration reference**. It preserves earlier origin, session-exchange, error, build, and local synthetic-login tests while the primary Next.js app's replacement evidence is reviewed.

It is not the primary website, not a second supported product architecture, and not a production identity provider. Its `Enter demo` session uses a fixed fictional local identity and loopback-only behavior. Do not copy it into the guest app or represent it as OAuth.

Remove the legacy host and its root scripts only after the Next.js app has equivalent or stronger session/origin coverage for the chosen authenticated extension, the hosted guest gates pass, migration documentation no longer depends on it, and a separate reviewed removal change proves the repository gates.

## Honest handoff

After local validation, report the highest evidence actually reached:

- source and unit tests;
- local Noodle validate/test/check;
- local Next.js typecheck/build/browser shell;
- non-mutating embed preflight; or
- separately authorized hosted browser proof.

Do not collapse those layers into “production ready.” Deployment, hosted configuration, public budget changes, direct MCP access changes, legacy-host deletion, repository visibility, template status, and release publication remain separately authorized actions.
