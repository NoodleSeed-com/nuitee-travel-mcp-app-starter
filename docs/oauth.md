# Optional OAuth and authenticated Assistant sessions

The default Next.js template is intentionally guest-first. Its current Search → Select → Verify tools do not require a website identity, so `apps/web/` uses a public embed ID and ships no login UI, application session route, or identity database.

Authentication does not change presentation ownership: the website keeps one persistent current flight-results slot in a journey canvas controlled by, but separate from, the conversation; the selected linked App still mounts through the official Noodle App host and not inside transcript messages. Local tests do not establish an authenticated or public hosted embed. Hosted behavior remains unproven until a separately authorized deployment and exact embed-binding verification for the chosen identity mode.

Add authentication only when a real capability needs persistence, personalization, authorization, tenant routing, or another backend-verified user fact. Keep these three identity layers separate.

## 1. Website login

**Website login** is your application's own OAuth or OIDC consumer and browser session. Choose and configure the provider, callback, cookies, logout behavior, account linking, and authorization policy in your application. This repository does not provide `requireCurrentUser`; the function in the route below must be replaced with your real fail-closed backend session check.

Consuming an OAuth/OIDC provider for website login does not make your website an OIDC authorization server. A login access token is not an Assistant client secret, a Nuitee key, or automatically a valid bearer token for direct MCP customer access.

## 2. Choose one Assistant access path

The repository default remains the guest-public `publicWebsite(...)` surface in `src/travel-server.ts`. Do not add authentication merely to decorate the template. When a real capability needs identity, choose one of the two supported paths below and test its complete browser, backend, and surface boundary.

### Path A — Authenticated-only website

Use this path when every Assistant visitor must already have a verified website session. In `src/travel-server.ts`, import the installed authoring helper and replace the default `publicWebsite(...)` access declaration; do not keep both declarations for the same origin:

```ts
import { authenticatedWebsite } from '@noodleseed/one';

// Inside the existing embeddedAssistant({ ... }) declaration:
access: authenticatedWebsite({
  origins: [...starterConfig.embeddedAssistant.origins],
  capabilities: [...capabilities.publicSurface],
}),
```

This is the installed `@noodleseed/one` `AuthenticatedWebsiteInput` shape. `capabilities` is optional in the SDK, but this template keeps the explicit `capabilities.publicSurface` projection so the authenticated surface does not silently widen when another server capability is added. The array contains the same five registered instances: `open_travel_starter`, `plan_flight_search`, `search_flights`, `verify_flight_offer`, and `select_flight_offer`. The selection helper's tool declaration remains `visibility: ['app']`, so it stays available to the linked App bridge without becoming model-visible.

Keep `origins` on the same exact configured allowlist and run validation/check before any separately authorized deployment. The repository default remains guest-public until a developer deliberately makes this source change for an identity-bound product.

#### Backend session exchange

After website login succeeds, a same-origin backend route exchanges the backend-verified user for one short-lived Assistant session. Install and use `@noodleseed/assistant/server`; keep every environment value in this snippet backend-only.

```ts
import { createAssistantSession } from '@noodleseed/assistant/server';

export async function POST(request: Request) {
  const user = await requireCurrentUser(request);
  if (request.headers.get('origin') !== process.env.PUBLIC_APP_ORIGIN) {
    return Response.json({ error: 'Origin is not allowed.' }, { status: 403 });
  }
  const session = await createAssistantSession({
    serviceUrl: process.env.NOODLE_SERVICE_URL!,
    clientId: process.env.NOODLE_ASSISTANT_CLIENT_ID!,
    clientSecret: process.env.NOODLE_ASSISTANT_CLIENT_SECRET!,
    origin: process.env.PUBLIC_APP_ORIGIN!,
    user: { id: user.id, email: user.email, roles: user.roles },
  });
  return Response.json(session);
}
```

The route must:

- authenticate before exchange and return `401` when the website session is absent;
- compare the request origin to one trusted exact `PUBLIC_APP_ORIGIN`, never reflect or accept an arbitrary header value;
- derive identity, roles, scopes, tenant membership, and routing from server-owned state rather than browser input;
- use the Noodle control-plane service origin, not a deployment URL ending in `/v1/mcp`;
- keep `NOODLE_ASSISTANT_CLIENT_ID` and `NOODLE_ASSISTANT_CLIENT_SECRET` out of `NEXT_PUBLIC_` variables, browser code, logs, and responses; and
- forward the `createAssistantSession` response unchanged so the browser follows its versioned endpoints and expiry.

In the browser hook, replace `embedId` with the same-origin `sessionEndpoint`. They are mutually exclusive:

```ts
useNoodleAssistant({
  sessionEndpoint: '/api/assistant/session',
  principalKey,
});
```

The route is an optional extension, not part of the guest template. Do not add a disabled login button or dead session endpoint before the product has an identity-bound capability. For Path A, the authored `authenticatedWebsite(...)` surface and the browser's `sessionEndpoint` must be introduced together; changing only one side fails closed.

### Path B — Mixed guest-to-signed-in conversation

A mixed surface is a separate product decision. Configure `publicWebsite({ signIn: true, ... })` only when an allowlisted capability really requires identity. When the Assistant requests sign-in, the browser receives a short-lived, single-use `signInTicket` and hands control to the website's existing login flow.

Preserve the exact guest origins and capability projection while opting into the installed SDK's mixed mode:

```ts
access: publicWebsite({
  origins: [...starterConfig.embeddedAssistant.origins],
  capabilities: [...capabilities.publicSurface],
  signIn: true,
}),
```

This path keeps anonymous Search → Select → Verify available and adds ticket-based elevation only for a newly authored identity-dependent capability. It is not the authenticated-only replacement above, and the current repository does not enable it.

After login, the backend spends that ticket through `createAssistantSession({ ..., signInTicket })` using the website's Assistant client credentials. Possession of the ticket alone grants nothing. Persist it only long enough to cross the login redirect, never put it in logs, and handle typed expiry or tenant-mismatch refusals without retry loops.

If login and the continuing conversation use different origins, finish the exchange on the origin where the conversation will continue and expose a same-origin session endpoint there. The client sends cookies with `credentials: "same-origin"`; a cross-origin session endpoint will not receive the website session cookie.

The Assistant can retain server-side conversation state through elevation, but a full-page navigation does not repaint the earlier browser transcript. Tell users that the assistant remembers the conversation, not that the transcript will reappear.

### Sign-out and principal changes

On sign-out or an account, principal, or tenant change, perform this browser lifecycle in order:

1. Stop accepting new sends and unmount and reset the current Assistant client and session through the application-owned parent boundary. Let `useNoodleAssistant` own its underlying abort/reset cleanup rather than manually disposing the same client twice.
2. Then clear the transcript, trip projection, and activity, including any selected fare or retry state held by the renderer.
3. Complete the website's server-side sign-out or account/tenant switch and discard any pending sign-in ticket or prior session response.
4. Derive a new browser-memory `principalKey` for the newly verified user-and-tenant boundary, remount the hook, and create or use a fresh principal-scoped session from the same-origin endpoint.
5. Never reuse the previous token, transcript, trip projection, selection, or interaction decision across that boundary.

Changing the `principalKey` is a lifecycle signal, not authorization; the backend must still authenticate the new website session and derive claims/tenant routing from server-owned state. This procedure is integration guidance only. The guest template ships no login, sign-out, account-switch, or tenant-switch UI.

## 3. Direct MCP customer authentication

Direct MCP customer access is independent from website embedding. Use `customerAuth.oidc(...)` or a supported federated adapter only when external MCP clients must call the deployment as verified customers.

A direct OIDC integration needs a compliant issuer with:

- HTTPS issuer metadata and discovery;
- a stable JWKS endpoint and key rotation;
- an exact audience accepted by the MCP deployment;
- authorization-code flow with PKCE;
- client registration appropriate to the intended MCP hosts; and
- verified claims, scopes, and token lifetimes that match the server's authorization rules.

Your website may consume a third-party issuer for login while the MCP deployment trusts that issuer directly. That relationship still does not make your website an OIDC authorization server. Do not point `customerAuth.oidc(...)` at a login callback, browser session endpoint, or provider access token merely because the website can sign users in.

## Credential ownership

| Value | Owner | Browser-visible |
| --- | --- | --- |
| Website OAuth client secret | Website backend or secret manager | Never |
| Website session cookie | Website backend; secure, HTTP-only cookie | Opaque cookie only |
| `NOODLE_ASSISTANT_CLIENT_SECRET` | Website backend or secret manager | Never |
| Assistant session response | Short-lived browser memory | Yes, intentionally |
| `NUITEE_API_KEY` | Noodle deployment secret | Never |
| Model API key | Noodle deployment secret | Never |
| Direct MCP bearer token | External MCP client | Not the website embed transport |

## Verification before enabling authentication

- Signed-out session exchange returns `401`.
- Wrong-origin exchange returns `403` before `createAssistantSession`.
- The browser, built assets, DOM, storage, network responses, and logs contain no client secret, model key, Nuitee key, or raw website session.
- A changed signed-in principal changes `principalKey`, aborts the old client, and clears its in-memory transcript.
- Session expiry re-exchanges once; interaction decisions do not auto-retry.
- One identity-bound read proves the intended role, scope, and tenant boundary with synthetic or approved test data.
- Direct MCP customer auth is tested separately with real issuer discovery, JWKS, audience, PKCE, and client-registration evidence.

Authentication does not expand the travel product boundary. The starter still ends at a verified fare and does not prebook, collect passenger details, take payment, ticket, cancel, or refund.
