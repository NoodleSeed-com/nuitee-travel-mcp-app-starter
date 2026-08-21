# Authoring workflow

## Contents

- Input paths
- Fit check
- Product-guide decision
- Repair loop
- Connectors
- HTTP connector example (full server)
- Customer OAuth for remote MCP clients
- Auth-derived customer API endpoints
- Per-tool authorization
- Delegated downstream auth (call your API as the signed-in user)
- Invocation context
- Compute connector example
- Tests
- Secrets and variables
- Embedded assistant
- Boundaries

## Input paths

1. **Website scrape** — if the user gives a URL, scrape it for surface hints (products, services, hours, contact, pricing). Stop there: the URL does not reveal CRM, booking systems, custom APIs, auth model, eligibility rules, quoting logic, or approval flows. Those live in the business systems and the owner’s head — ask.
2. **OpenAPI import** — `noodle import openapi <file>` emits a starter `server.ts` from a spec. Use it when the user provides an OpenAPI document.
3. **User interview** — Noodle does not interview; you do. Cover custom APIs/integrations, eligibility rules, quoting/approval logic, and private schemas (SQL DDL or JSON samples for custom `connector` declarations). Ask for concrete examples and sample payloads; do not guess a schema from a URL or invent endpoints.

## Fit check

Before building, confirm the idea fits a conversational surface: 1–3 focused actions where saying it beats clicking, plus data or actions the model lacks on its own. Poor fits — long-form or static content, dashboards, deep multi-step navigation, or a full app port. When an idea does not fit, narrow the scope to the actions that do.

## Product-guide decision

Before authoring, record whether the product is guided or unguided and why. Do not wait for the user to name `agentGuide`; load `references/product-agent-guides.md` for the canonical decision criteria and TypeScript shape whenever product-level workflow guidance may add value.

## Repair loop

Author in `server.ts`, then `noodle validate` → fix cited errors (see `compile-errors.md`) → re-validate → `noodle test` → `noodle dev`. Keep the loop tight and error-driven.

## Connectors

Declare connectors as data, not imperative code:

- **HTTP**: `connector("id").version("1.0.0").http({ baseUrl, allowedOrigins, auth, operations })` with per-operation `request`/`response` mapping using `${args...}` / `${response...}` expressions.
- **Compute**: `connector("id").version("1.0.0").compute(name, { input, output, calls?, run })` — a self-contained, sandboxed function (no imports/closure capture) that may call allowlisted operations via `callOperation`.

Tools record connector calls into a flow; recording is not execution. Do not branch on runtime outputs with native `if` — use declarative `when(...)` conditions.

HTTP connector auth variants: `bearer` (`{ kind: "bearer", secret: secret("API_TOKEN") }`), `apiKey` (`{ kind: "apiKey", header: "X-API-Key", secret: secret("API_KEY") }`), `clientCredentials`, `delegatedOAuth`, `delegatedSessionCookie`, and `delegatedTokenExchange` (per-user calls to your own API — see "Delegated downstream auth" below). Use managed `secret(...)` / `variable(...)` refs for all values that differ by org/app/env.

When one connector needs independently selectable accounts, declare catalog `credentialProfiles` plus each operation’s accepted `credentials.profiles`, then bind each `server.use` alias with `bind(connector, { profile, connection: connection("logical_id", managedSecret(secret("NAME"), { scopes, audience })) })`. The alias is the stable account boundary; never put provider account ids, labels, or credential values in it. `gmailConnector()` is the curated Gmail catalog helper; reuse it under independent aliases and accept canonical `accounts` arrays in tools (one account for writes, or an explicitly ordered supported combination for reads). See the bundled `gmail-multi-account` flagship. Bound managed secrets are supported by hosted execution. For deployed-server access to Google APIs, use `googleWorkloadIdentity({ provider: variable("GOOGLE_WIF_PROVIDER"), access: { kind: "direct" } })`, or add `serviceAccountImpersonation` with a managed service-account email. This is keyless Google Workload Identity Federation: exact Google scopes/audience come from the catalog operation, while `noodle auth google prepare|status|doctor|revoke` owns operator lifecycle. See the bundled `google-bigquery` flagship. `externalExchange()` is runnable only when the deployment operator injects an exact HTTPS provider endpoint/origin/audience and durable shared subject-pin store through service ports; Noodle sends a short-lived platform-signed deployment workload assertion and accepts only a bounded bearer response. Provider implementations must consume assertion replay ids through durable shared atomic storage across instances and restarts. There is intentionally no hosted enrollment or provider CRUD surface yet. The provider wire contract is public, but its conformance kit is workspace/source-only and is not an installable npm package. Bound `clientCredentials(...)` remains fail-closed until its provider slice lands.

## HTTP connector example (full server)

Declare the API as data, bind it with `use`, then record calls in tools. The operation mapping in detail: `request` builds the JSON request body, `query: [...]` names the input args sent as URL query parameters, and `response` maps the parsed HTTP body (bound to `${response}`) into your typed `output`. `auth` reads a managed `secret(...)` — never inline a key. This whole example is compile-verified on every `pnpm test`.

```ts
import { connector, secret, variable, server, tool, z } from '@noodleseed/one';

const crm = connector('crm').version('1.0.0').http({
  baseUrl: variable('CRM_BASE_URL'),
  allowedOrigins: ['https://api.crm.example'],
  auth: { kind: 'bearer', secret: secret('CRM_TOKEN') },
  operations: {
    find_customer: {
      type: 'read',
      method: 'GET',
      path: '/customers',
      query: ['email'],
      input: z.object({ email: z.string() }),
      output: z.object({ id: z.string(), name: z.string().optional() }),
      response: { id: '${response.data[0].id}', name: '${response.data[0].name}' },
    },
    create_ticket: {
      type: 'action',
      method: 'POST',
      path: '/tickets',
      input: z.object({ customer_id: z.string(), body: z.string() }),
      output: z.object({ ticket_id: z.string() }),
      request: { customer_id: '${args.customer_id}', body: '${args.body}' },
      response: { ticket_id: '${response.id}' },
    },
  },
});

export default server('support', { title: 'Support', version: '1.0.0', use: { crm } }, [
  tool('find_customer', {
    description: 'Find a customer by email address.',
    input: z.object({ email: z.string() }),
    output: z.object({ id: z.string(), name: z.string().optional() }),
    fulfil: ({ input, connectors }) => {
      const customer = connectors.crm.find_customer({ email: input.email });
      return { id: customer.id, name: customer.name };
    },
  }),
  tool('open_ticket', {
    description: 'Open a support ticket for a customer.',
    input: z.object({ customer_id: z.string(), body: z.string() }),
    output: z.object({ ticket_id: z.string() }),
    fulfil: ({ input, connectors }) => {
      const ticket = connectors.crm.create_ticket({ customer_id: input.customer_id, body: input.body });
      return { ticket_id: ticket.ticket_id };
    },
  }),
]);
```

Naming: connector operation names and tool names are lowercase-with-underscores. Map with `${args.field}` for tool/operation inputs and `${response.path}` for the response — the parsed JSON body is bound directly to `${response}`, so there is **no `.body` envelope**; use bracket syntax for array indices (`${response.data[0].id}`) — a dotted numeric index like `.0.` is invalid. Declare URL query parameters with the operation-level `query: ["arg"]` array, **not** inside `request` (which builds only the JSON body). `allowedOrigins` must be literal origin URLs (the SSRF allowlist); `baseUrl` may be a `variable(...)` that differs by env.

More: `auth.kind` is `bearer` | `apiKey` (needs `header`) | `clientCredentials` | `delegatedOAuth` | `delegatedSessionCookie` | `delegatedTokenExchange`. For client credentials use `{ kind: "clientCredentials", tokenUrl, clientId, clientSecret, scopes? }` (RFC-6749 grant); for a non-standard partner token endpoint add `profile: "custom"` with a `custom: { requestFormat, clientIdField, clientSecretField, tokenResponsePath, expirySource }` descriptor. Do not put credential headers in operation `headers`; use connector `auth`. Use `.compute(name, { input, output, run })` for a sandboxed transform; `provides:` (instead of `use:`) exposes a connector only to compute `callOperation`; and `noodle import openapi <file>` generates a connector from an OpenAPI spec.

## Customer OAuth for remote MCP clients

For `customerAuth.oidc(...)` and `.federatedOidc(...)`, the application developer owns the standards-compliant authorization server. Noodle verifies its access tokens; it does not proxy discovery, create OAuth clients, or repair the upstream server. For issuer `https://id.example.com/oauth`, publish the path-inserted RFC 8414 document at `https://id.example.com/.well-known/oauth-authorization-server/oauth` as direct unauthenticated HTTP 200 JSON — never a login redirect.

That metadata must expose HTTPS `authorization_endpoint`, `token_endpoint`, `jwks_uri`, and RFC 7591 `registration_endpoint`; advertise authorization-code and refresh-token grants, Dynamic Client Registration, PKCE with `code_challenge_methods_supported: ["S256"]`, and public clients with `token_endpoint_auth_methods_supported: ["none"]`. Validate the exact RFC 8707 `resource` on authorize, code exchange, and refresh, then map approved versions of one app/environment to the stable audience configured in `customerAuth`; use distinct audiences across apps and environments. Publish only public signing keys in JWKS. Run `noodle auth doctor src/server.ts`; its issuer-readiness probes perform bounded read-only GET checks and never register a client. A successful `noodle deploy --access customers` reports the same readiness without turning a diagnostic failure into a failed deployment.

The MCP client, or Devtools during local testing, opens the configured `authorization_endpoint`; Noodle does not submit the login form or manage the authorization server's session or CSRF cookies. Keep the login and consent UI plus credential POST on the same origin as the authorization endpoint. If a separate-site UI is unavoidable, the authorization server must explicitly trust the UI origin, use exact credentialed CORS where browser JavaScript calls it, issue the session and CSRF cookies needed by cross-site POSTs as `SameSite=None; Secure`, and return a CSRF token that the UI submits with credentials. Cookies cannot be shared across unrelated registrable domains. Browser privacy controls may still block this cross-site flow, so a same-origin route or reverse proxy remains the reliable design.

Verify customer OAuth in three explicit layers. First run `noodle auth doctor src/server.ts --json`; a pass proves metadata and JWKS readiness, but it does not prove that registration or token issuance succeeds. Next run `noodle test src/server.ts --json`; for a protected app it proves that anonymous MCP access fails closed with exact protected-resource metadata and returns `interactiveRequired: true`. Finally run `noodle devtools src/server.ts`, complete sign-in, and make one authenticated `tools/list` request or one representative safe read. Only that final layer proves issuer, signature, stable audience, and exact-resource binding together. Never report a passing doctor or anonymous boundary smoke as working end-to-end authentication.

## Auth-derived customer API endpoints

Use a customer endpoint when the verified IdP selects a different API base URL for each SaaS customer. The claim contains the complete base URL; tool input and `${user}` do not select it. Declare one named policy, use that reference as the connector `baseUrl`, and map its claim path in direct OIDC or on every federated issuer:

```ts
import { annotations, connector, customerAuth, customerEndpoint, secret, server, tool, variable, z } from '@noodleseed/one';

const customerApi = customerEndpoint('customer_api', {
  allowedHttpsHostSuffixes: ['api.noodleseed.dev'],
});

const api = connector('customer_api_connector').version('1.0.0').http({
  baseUrl: customerApi,
  auth: {
    kind: 'delegatedTokenExchange',
    tokenUrl: 'https://id.noodleseed.dev/oauth/token',
    clientId: variable('CUSTOMER_API_CLIENT_ID'),
    clientSecret: secret('CUSTOMER_API_CLIENT_SECRET'),
  },
  operations: {
    list_records: {
      type: 'read',
      method: 'GET',
      path: '/records',
      input: z.object({}),
      output: z.object({ records: z.array(z.unknown()).max(100) }),
    },
    archive_record: {
      type: 'action',
      method: 'POST',
      path: '/records/${args.record_id}/archive',
      input: z.object({ record_id: z.string() }),
      output: z.object({ archived: z.boolean() }),
    },
  },
});

export default server(
  'customer_records',
  {
    title: 'Customer records',
    version: '1.0.0',
    use: { api },
    interactions: { confirmationFallback: 'host' },
    auth: customerAuth.oidc({
      issuer: 'https://id.noodleseed.dev',
      audience: 'noodleseed-customer-records-prod',
      routing: {
        endpoints: {
          customer_api: { claim: 'tenant.api_base_url' },
        },
      },
    }),
  },
  [
    tool('list_records', {
      description: 'List records for the signed-in customer.',
      input: z.object({}),
      output: z.object({ records: z.array(z.unknown()).max(100) }),
      fulfil: ({ connectors }) => {
        const result = connectors.api.listRecords();
        return { records: result.records };
      },
    }),
    tool('archive_record', {
      description: 'Archive one record for the signed-in customer.',
      input: z.object({ record_id: z.string() }),
      output: z.object({ archived: z.boolean() }),
      annotations: annotations.openAction({ destructive: false, confirm: true }),
      fulfil({ input, connectors }) {
        const result = connectors.api.archiveRecord({ record_id: input.record_id });
        return { archived: result.archived };
      },
    }),
  ],
);
```

`customerEndpoint` accepts exactly one non-empty policy arm: exact HTTPS origins, or HTTPS hostname suffixes. Exact policies may authorize an explicit non-default port; suffix policies allow port 443 and match only the exact host or dot-boundary subdomains. Do not add connector `allowedOrigins` to a customer-routed connector. Its fixed credential/token endpoints are validated independently and cannot come from caller claims.

Customer-routed connector auth must be omitted or use `delegatedTokenExchange` at both connector and operation level. The compiler validates the concrete connector definition emitted from TypeScript, including connector defaults and operation overrides. Do not emit bearer, API-key, client-credentials, or managed-provider fallbacks for local mode; use operation fakes while leaving auth declarative. `customer_endpoint_unsupported_auth` reports the exact failing path and auth kind.

On a bidirectional MCP transport whose client negotiated form elicitation, Noodle sends the standard confirmation form. The current stateless hosted MCP transport cannot initiate that exchange, so the example explicitly declares `server.interactions.confirmationFallback: 'host'`. That fallback trusts the MCP host to have collected native write approval before the tool call reaches Noodle; it is never inferred from client identity and does not replace authentication, authorization, policy, or accurate action/destructive annotations. Omit it when connected hosts are not trusted to provide that approval; confirmation then fails closed with `interaction_unavailable` when the standard exchange is unavailable.

Every federated issuer must repeat every endpoint key used by the app, although each issuer may choose a different claim path. Endpoint names use lowercase letters, numbers, and underscores. Resolved claims must be exact absolute HTTPS URLs of at most 2,048 UTF-8 bytes with no userinfo, query, fragment, IP literal, special-use host, or unsafe whitespace/control characters. The runtime preserves a canonical optional base path.

Resolved customer URLs are private routing authority: they never enter the manifest/artifact, `${user}`, logs, model output, widgets, public confirmation review, cache keys, or delegated-token-exchange assertions. Routed reads may be used by tools, including declared nested calls. A routed action—including one reached through a connector wrapper—requires exact `annotations.confirm: true`; omitted or `false` fails with `customer_endpoint_action_unsupported`. Routed resources, prompts, and ambient context fail with `customer_endpoint_surface_unsupported`.

At runtime, an initially missing, malformed, or disallowed claim returns the same safe `connector_route_unavailable` tool error before credential lookup or connector egress. Preparation stores only sorted route `{ key, fingerprint }` bindings in the private server-held continuation. Acceptance re-resolves the current request routes; a missing or changed binding returns `invalid_continuation` before policy, credentials, or egress, then the matching frozen snapshot is reused for the action and nested/later calls. `tools/list` remains based only on roles and scopes, so route availability neither reveals tenant topology nor changes the existing authorization filter.

## Per-tool authorization

Keep endpoint authentication in `customerAuth.*(...)`, then narrow individual tools with the optional typed `authorization` rule. Every `requiredScopes` value is required; any one `allowedRoles` value is sufficient; when both lists are present, both conditions apply. Omit `authorization` for an unrestricted tool. Do not invent a policy expression language or infer authorization from tool arguments, page context, connector output, email domains, or other unverified data.

```ts
auth: customerAuth.oidc({
  issuer: 'https://id.example.com',
  audience: 'https://api.example.com/mcp',
  claims: { roles: 'permissions.roles', scopes: 'permissions.scopes' },
}),

tool('list_org_apps', {
  authorization: {
    requiredScopes: ['org_apps:read'],
    allowedRoles: ['org_admin', 'org_member'],
  },
  // input, output, and fulfilment...
})
```

Role values are trusted only from the explicitly configured claim path (or the platform-private bridge role claim). Direct OIDC scopes default to standard `scope`, `scp`, or `scopes` claims unless `claims.scopes` is configured. Embedded-assistant backends pass verified `user.roles` and `user.scopes` separately during `createAssistantSession(...)`; page context never grants either. Claim values must be a string or string array; malformed or oversized values fail closed. Eligible tools remain in authored order in `tools/list`; ineligible tools are omitted and a guessed direct call is still denied before argument validation or connector execution. Scope denials use MCP OAuth step-up metadata without disclosing role names.

## Delegated downstream auth (call your API as the signed-in user)

Use delegated connector auth when the downstream API must enforce its own per-user authorization — a shared service credential plus a forwarded user id would bypass it. Three shapes exist; pick by who owns the downstream:

`delegatedTokenExchange` consumes a verified customer caller; an MCP access mode does not create one. The server must declare `customerAuth.*(...)` or `embeddedAssistant(...)` so Noodle can establish the caller subject, issuer, and audience. Otherwise `noodle validate`, `noodle auth doctor`, and deploy fail early with `delegated_token_exchange_identity_required`, before secrets are resolved or any connector egress. A successful local Devtools exchange is not evidence that the hosted server has an identity source. Devtools supplies a separate, loopback-only local identity context that is never accepted by hosted deployment.

- **`delegatedTokenExchange`** — your own API. The platform signs a short-lived, verifiable assertion of the signed-in user and exchanges it at a token endpoint you implement (RFC 8693). It works with verified customer OIDC identities and the built-in Firebase/Microsoft adapters; no per-user OAuth enrollment. Embedded-assistant sessions can bind customer-routed connectors when the authenticated embedding backend resolves each route from server-owned tenancy data and passes it during session exchange. Browser input, page context, session claims, and tool arguments cannot supply or override that private route authority.
- **`delegatedOAuth` with `provider: "firebase" | "microsoft"`** — Noodle-managed bridge providers using stored per-user refresh tokens. Requires the matching `customerAuth` bridge; any other provider string is the compile error `unsupported_delegated_provider`.
- **`delegatedSessionCookie`** — Firebase-managed session-cookie apps only; not a generic mechanism.

### The connector (your `server.ts`)

```ts
auth: {
  kind: 'delegatedTokenExchange',
  tokenUrl: 'https://app.example.com/api/assistant/oauth/token', // fixed HTTPS; static connectors also allowlist its origin
  clientId: variable('EXAMPLE_DELEG_CLIENT_ID'),
  clientSecret: secret('EXAMPLE_DELEG_CLIENT_SECRET'),
  scopes: ['time_off'],           // optional
  audience: 'example-api',        // optional; assertion + request audience, defaults to tokenUrl
  authMethod: 'client_secret_basic', // default; client_secret_post supported
}
```

Inside tools, `${user.subject}` / `${user.email}` / `${user.name}` / `${user.locale}` / `${user.timeZone}` / `${user.claims.*}` stay available as verified context; the delegated credential is what makes the *downstream call itself* run as that user.

### The exchange request your endpoint receives

The broker POSTs `application/x-www-form-urlencoded` to `tokenUrl` with `Authorization: Basic base64(clientId:clientSecret)` (or `client_id`/`client_secret` form fields for `client_secret_post`):

```
grant_type=urn:ietf:params:oauth:grant-type:token-exchange
subject_token=<RS256 JWT signed by the platform>
subject_token_type=urn:ietf:params:oauth:token-type:jwt
scope=time_off            (space-joined, when configured)
audience=example-api      (when configured)
```

The `subject_token` claims: `iss` (platform issuer; JWKS at `{iss}/.well-known/jwks.json`), `sub` (verified user id), `aud` (your configured audience or the tokenUrl), `email`, `name`, `claims` (declared session claims), `tenant` (`org/app/env`), `deployment`, `customer_identity: { version: 1, issuer }`, `iat`, `exp` (about 120 s), `jti`. Key downstream users by `(customer_identity.issuer, sub)`, never by `sub` alone. Firebase uses `https://securetoken.google.com/<project-id>`; Microsoft uses `https://login.microsoftonline.com/<tenant-id>/v2.0`. A routed exchange adds `route: { key, fingerprint }`, never the customer URL; credential cache and single-flight keys include that route binding. Respond with `{ "access_token": "...", "token_type": "Bearer", "expires_in": 900 }`; the broker caches per user + connector + scopes + route until `expires_in` minus 300 s and presents the token downstream as `Authorization: Bearer`.

### The downstream token endpoint (your backend)

```ts
// POST /api/assistant/oauth/token — Node example with jose.
import { createRemoteJWKSet, jwtVerify } from 'jose';

const PLATFORM_ISSUER = process.env.NOODLE_PLATFORM_ISSUER!; // e.g. https://cloud.noodleseed.dev
const jwks = createRemoteJWKSet(new URL(`${PLATFORM_ISSUER}/.well-known/jwks.json`));

export async function tokenEndpoint(req: Request): Promise<Response> {
  // 1. Authenticate the broker client credential (client_secret_basic).
  const basic = req.headers.get('authorization') ?? '';
  const [clientId, clientSecret] = atob(basic.replace(/^Basic /, '')).split(':');
  if (!isValidClient(clientId, clientSecret)) return new Response(null, { status: 401 });
  // 2. Verify the platform-signed user assertion (never trust a plaintext user id).
  const form = new URLSearchParams(await req.text());
  const { payload } = await jwtVerify(form.get('subject_token') ?? '', jwks, {
    issuer: PLATFORM_ISSUER,
    audience: 'https://app.example.com/api/assistant/oauth/token', // your tokenUrl or configured audience
  });
  if (payload.deployment !== undefined && payload.tenant !== 'your-org/your-app/prod') {
    return new Response(null, { status: 403 }); // optionally pin the calling deployment
  }
  // 3. Mint your own short-lived user-scoped token; your API enforces per-user rules from it.
  const accessToken = await issueAccessToken(String(payload.sub), clientId, form.get('scope') ?? '');
  return Response.json({ access_token: accessToken, token_type: "Bearer", expires_in: 900 });
}
```

### Test delegated exchange locally

Local customer OIDC sign-in and delegated-exchange assertion trust are two distinct boundaries. OIDC proves the caller to the local MCP server; Devtools uses a separate local issuer only for the RFC 8693 assertion sent to your downstream token endpoint. This requires no `server.ts` change or additional flag, environment variable, or config surface.

1. Configure the OIDC authorization server for the exact loopback callback and RFC 8707 resource. Do not add the Devtools assertion key to OIDC issuer metadata or change its signing keys.
2. Start Devtools, complete customer sign-in, and copy the displayed `{ issuer, jwks }` from **Local delegated exchange**.
3. Pin both values only in the customer-owned development RFC 8693 token endpoint.
4. Restrict that trust to development client credentials, audience, API, and data.
5. Run the delegated tool until its binding reads **Exchange verified**.
6. Use hosted preview or `noodle auth doctor --live` to prove the production platform issuer.

**Never trust the Devtools issuer in production: anyone holding the local private key could impersonate a customer.**

Diagnose statically with `noodle auth doctor`; set a short-lived real customer token only in `NOODLE_CUSTOMER_TOKEN` and add `--live --org <org> --app <app> --env <env>` to perform one exchange per delegated binding without invoking a business tool. Add `--version <version>` to test that exact pinned MCP resource. Common failures include structured `credential_unavailable` reasons such as `caller_identity_not_customer`. For a Firebase/Microsoft bridge, `caller_issuer_missing` means the session predates issuer binding: reconnect once through customer authentication, then retry. No IdP custom claim or `server.ts` change is required. Direct/federated OIDC verification assigns the customer identity at the trusted verifier boundary; never ask an IdP to mint a Noodle-specific classification claim.

## Design tools for the model

Shape tools around what a user says, not 1:1 around API endpoints. `references/tool-design.md` owns the doctrine: intent-shaped tools, titles and annotations, bounded outputs, a small tool surface, and deliberate context.

## Invocation context

Every executable invocation receives one immutable server-authoritative temporal snapshot. TypeScript authoring does not create a hidden context tool. Use `server(..., { context })` for locale/time-zone defaults and trusted ambient facts, and designate one normal zero-input tool with `contextProvider: true` when the model needs portable application context. The embedded host preloads it per turn; Claude, ChatGPT, and other MCP hosts call it normally.

```ts
context: {
  defaults: { locale: 'en-GB', timeZone: 'Europe/London' },
  ambient: {
    output: z.object({ defaultTeamId: z.string(), holidays: z.array(z.string()) }),
    fulfil: ({ user, context, connectors }) => {
      const calendar = connectors.people.getCalendar({
        subject: user.subject,
        asOf: context.temporal.instant,
      });
      return { defaultTeamId: calendar.default_team_id, holidays: calendar.holidays };
    },
  },
},
```

Ambient providers are recorded as fulfilment data at author time, may call read-only connector operations only, and have a declared output schema. Later fulfilments read `${context.temporal.localDate}`, `${context.temporal.timeZone}`, `${context.ambient.defaultTeamId}`, and `${context.ambientStatus}`. If ambient resolution fails, the status is `unavailable`; never invent the missing business facts. Ambient/model-visible context is capped at 16 KiB serialized JSON, depth 8, and 128 entries per container; credential-shaped keys are rejected.

Direct MCP tool calls may also expose an optional, untrusted client hint as `${context.location.latitude}` and `${context.location.longitude}`, with optional `${context.location.city}`, `${context.location.region}`, `${context.location.country}`, and `${context.location.timeZone}`. Noodle exposes location only when the host supplies one complete, finite, in-range coordinate pair. Treat it as a proximity convenience only: never use it for authentication, authorization, policy, compliance, or delivery-address proof. An explicit tool input must override the hint. When location is absent and the operation needs it, ask the user or return a structured location-required result; never substitute a fixed default location.

## Ask for structured missing input

Use `ctx.elicit` inside a tool fulfilment when execution needs one bounded value from the user. The call records an `elicit` flow step and returns its symbolic scope; it does not prompt at author time:

```ts
tool('prepare_time_off', {
  description: 'Resolve a time-off request before proposing the write.',
  input: z.object({ start: z.string(), end: z.string() }),
  output: z.object({ start: z.string(), end: z.string(), teamId: z.string() }),
  fulfil: ({ input, elicit }) => {
    const answer = elicit({
      id: 'choose_team',
      message: 'Which team should receive this request?',
      input: z.object({ teamId: z.string().describe('Team') }),
    });
    return { start: input.start, end: input.end, teamId: answer.teamId };
  },
});
```

Use a stable lowercase/number/underscore id and a flat form of string/number/integer/boolean, string choices or multi-select, with optional `email`, `uri`, `date`, or `date-time` formats. Nested objects and credential-shaped fields fail with `invalid_elicitation_schema`. Every interactive flow must place all `ctx.elicit` calls before its first connector operation or compilation fails with `invalid_elicitation_flow`. Embedded/headless clients receive `input_requested`; bidirectional MCP transports map the primitive to standard form `elicitation/create`. On stateless hosts, the adapter returns a structured non-executing `interaction_unavailable` result; linked Apps render its business-user form and retry in request `_meta`, while models can use the advertised reserved retry field. Accept validates and replays only the operation-free input prefix; invalid content returns `arg_invalid`, and decline/cancel stop. Elicitation gathers missing input and does not replace confirmation. In a flow marked `confirm: true`, every eligible `input_requested` precedes `tool_proposed`; the final proposal reviews the original input, elicited values, and sole exact eligible connector action. Conditional branches may declare multiple candidate actions only when preparation resolves exactly one eligible action from input/context or completed pure steps; zero or multiple actions fail with `invalid_confirmation_flow` before I/O. Acceptance is bound to that exact action. Later read-only operations and pure compute may assemble output, but a second eligible action fails closed. Use `ref.at(index)` for array access in recorded expressions. MCP uses final standard form confirmation on capable bidirectional transports and fails closed otherwise. Setting `interactions: { confirmationFallback: "host" }` in the server options explicitly trusts native host approval only when confirmation transport is unavailable and after every elicited field is collected; it still uses preparation and prepared execution, is never inferred from client name, and does not replace authorization. Omitted or `false` annotations execute directly; hints alone never gate. `annotations.action({ confirm: true })` explicitly enables confirmation; `annotations.action({ confirm: false })` explicitly preserves direct execution.

## Compute connector example

```ts
const scoring = connector('scoring').version('1.0.0').compute('normalize', {
  input: z.object({ email: z.string(), priority: z.string().optional() }),
  output: z.object({ score: z.number() }),
  calls: { find_customer: 'crm.find_customer' },
  limits: { timeoutMs: 1000, maxHostCalls: 2 },
  run(input, { callOperation }) {
    const customer = callOperation("find_customer", { email: input.email }) as { id?: string };
    return { score: customer.id && input.priority === "high" ? 100 : 50 };
  },
});
```

Compute `run` functions are serialized and sandboxed: no imports, no closure capture, no `fetch`, no `process`. Any backing-system call must be declared in acyclic `calls` and invoked through `callOperation`. For conditional flow edges, use `when(...)` in recorded fulfilment instead of native branching on connector outputs.

## Tests

Use Vitest for app-local tests. The generated `npm test` command scans only the project-owned `test/` directory; skill-local example tests are reference material, not part of the app suite. Keep fixtures project-local; do not import from `examples/`. A minimum test suite imports the default server, checks the intended definitions compile, then lets `noodle test --json` perform the loopback MCP smoke.

```ts
import { describe, expect, it } from 'vitest';
import app from '../src/server.js';

describe('server', () => {
  it('declares the expected tool surface', () => {
    expect(app.name).toBe('support_assistant');
  });
});
```

After focused tests pass, run `noodle validate --json`, `noodle test --json`, and then `noodle dev` for interactive local verification.

## Secrets and variables

Author managed config as `secret("NAME")` / `variable("NAME")` and operate it with `noodle secrets set` / `noodle variables set` (scoped org/app/env). Never inline secret values in `server.ts`, tests, or generated files.

## Embedded assistant

To place the same server tools inside a SaaS web app, declare `assistant: embeddedAssistant(...)` alongside the one server-level brand kit. Read `embedded-assistant.md` before integrating: it owns the HTTPS-origin rule, managed model configuration, required deploy-before-client sequence, customer-backend exchange, browser mount, and verification checklist.

## Knowledge components

Ground an assistant in controlled documents and the customer's live public site with one declaration — never a handwritten `search`/`fetch` tool pair, a provider name, a sync job, or an index manifest. Declare `knowledge(...)` with `file(...)` documents (UTF-8 `.md`/`.txt`, project-root relative, ≤100 files, ≤1 MiB each, ≤25 MiB per component) and `site(...)` live scopes (exact HTTPS origin plus positive path globs), pass the declaration in the server's `knowledge` array, and include it in a public website surface's `capabilities` to project the generated `search_<name>` capability:

```ts
const product = knowledge('product', {
  title: 'Product knowledge',
  description: 'Public product, pricing, and support information.',
  documents: [
    file('./knowledge/product.md', { title: 'Product guide' }),
    file('./knowledge/faq.txt', { title: 'FAQ' }),
  ],
  sites: [
    site({ origin: 'https://www.acme.example', include: ['/docs/**', '/pricing'], refresh: '6h' }),
  ],
});
```

The compiler validates and hashes every document at build time (bad extensions, root escapes, symlinks, oversize, and non-UTF-8 fail `noodle validate` with the exact path); deployment publishes versioned files transactionally with the app, crawls declared sites, and re-crawls them on the `refresh` cadence (`15m`–`7d`, default daily; `noodle knowledge refresh <name>` crawls on demand). Component names are lowercase snake-case; each component implies exactly one generated bounded search capability with cited results.

The managed crawler and managed index are the defaults and need no configuration. A component may instead bring its own crawler (`crawler: firecrawl({ apiKey: secret('FIRECRAWL_API_KEY') })` or `tavily(...)`) and/or its own index (`index: algolia({ appId: variable('ALGOLIA_APP_ID'), apiKey: secret('ALGOLIA_API_KEY') })` or `meilisearch({ host: variable(...), apiKey: secret(...) })`). The code declares only config names; operators supply values with `noodle secrets set` / `noodle variables set`, and deploy preflight fails closed naming any unset reference.

## Boundaries

Do not hand-author manifest JSON/YAML, runtime artifacts, connector IR, or hosted asset metadata. Do not read or copy secrets, bearer tokens, refresh tokens, static access keys, `.env`, `.env.noodle`, or `~/.noodle/config.json`. Hosted access is identity-based — do not add static data-plane credential paths.