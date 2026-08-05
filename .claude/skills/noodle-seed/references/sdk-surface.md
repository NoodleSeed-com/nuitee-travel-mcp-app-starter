# @noodleseed/one SDK surface

Import these from `@noodleseed/one`. They are declarative builders that emit manifest data — do not hand-author the manifest or runtime artifacts. React view helpers come from `@noodleseed/one/react` (`generateHelpers`); the hook surface is documented in `widgets-and-apps.md`.
Platform helper connectors are explicit subpath imports from `@noodleseed/one/platform` (`noodlePlatform`, `noodlePlatformCatalog`) when an app needs first-party hosted state APIs.

## Contents

- Exports by area
- Authoring signatures
- Recipes

## Exports by area

### Server & tools

- `server(name, options, definitions)` — the server/app root.
- `tool(name, options)` — declare every tool; add `view` to render an MCP App or `visibility: ["app"]` for an app-only helper.

### Views & assets

- `asset("./path")` — reference a packaged asset (e.g. an image).
- `annotations(...)` — tool/Apps annotation metadata.

### Connectors & flows

- `connector("id").version(...).http({...})` or `.compute(...)` — declarative data connectors.
- `connection("logical_id", source)` — stable downstream-account/workload identity used by a connector binding.
- `bind(connector, { profile, connection })` — bind one connector alias to an exact credential profile and logical connection.
- `googleWorkloadIdentity({ provider: variable(...), access })` — keyless deployed-workload access to Google APIs through WIF; configure with `noodle auth google`.
- `when(...)` — declarative conditions for recorded flows (no native branching on runtime values).

### Resources & prompts

- `resource(name, { ... })` — an MCP resource.
- `prompt(name, { ... })` — an MCP prompt.

### Managed config

- `secret("NAME")` — reference a managed secret (operated via `noodle secrets`).
- `variable("NAME")` — reference a managed variable (operated via `noodle variables`).

### Customer auth

- `customerAuth.oidc(...)`, `.federatedOidc(...)`, `.firebase(...)`, or `.microsoft(...)` — end-user/customer identity for `--access customers` deployments. A direct/federated issuer must publish direct RFC 8414 discovery, Dynamic Client Registration, authorization-code + refresh grants, PKCE `code_challenge_methods_supported: ["S256"]`, public-client `token_endpoint_auth_methods_supported: ["none"]`, and a public JWKS; verify it with `noodle auth doctor src/server.ts`. Firebase Web App fields are browser-visible configuration: use `variable(...)`, not `secret(...)`, and restrict the key in Firebase.

### Sessions

- `handoffSession(...)` — typed cross-host handoff session envelopes.

### Schemas

- `z` — Zod, for input/output schemas (compiles to JSON Schema 2020-12).

### Other

- `clientCredentials`
- `customerEndpoint`
- `embeddedAssistant`
- `externalExchange`
- `gmailConnector`
- `managedSecret`
- `openAICompatible`

## Authoring signatures

- `server(name, options, definitions)` — `options` commonly includes `title`, `version`, `instructions`, `branding`, `auth`, `use`, `provides`, `state`, and `handoff`; `definitions` is the array of tools/resources/prompts.
- `tool(name, { description, input, output, annotations?, visibility?, view?, fulfil })` — `input`/`output` are Zod schemas; `fulfil({ input, connectors, user })` returns data matching `output`. Add `view: { component, entry }` for a React widget; use `visibility: ["app"]` for an app-only helper.
- `resource(name, { uri, description?, mimeType?, fulfil })` and `prompt(name, { description?, arguments?, fulfil })` expose MCP resources/prompts.
- View metadata (`viewTitle`, `viewDescription`, `csp`, `domain`, `permissions`) belongs on the tool that renders it; `asset("./path")` packages local files.
- `customerAuth.*(...)` belongs in `server` options when deployed customer callers need verified identity; inspect `examples/customer-auth` or `examples/sharepoint` before using it.
- `state` defines durable widget state handles; handle schemas may use `.optional()`/`.default()` — defaulted fields are optional on write, so a save that omits them still validates. `handoff` declares allowed external domains for safe host handoff.

## Recipes

Minimal, complete, compiling recipes — author in `src/server.ts`, then `noodle validate`. Inside a `fulfil`, `ctx.input` (a prompt’s arguments or a templated resource’s URI variables) and `ctx.connectors` are **symbolic**: reference them to record a flow. Recording is not execution, so never branch on their runtime values with native `if` — use `when(...)`.

### Resource

`resource(name, { uri, title?, description?, mimeType?, fulfil })`. `fulfil` returns the resource body itself — a plain string, or a bare content entry `{ uri, mimeType, text }` — and the runtime maps it into MCP `contents` for you. Do **not** return a `{ contents: [...] }` wrapper: the runtime already wraps it, so that double-wraps (the whole JSON ends up inside `contents[0].text`). Use a fixed URI for a constant document, or a `{var}` template whose variable arrives on `ctx.input`.

```ts
import { resource } from '@noodleseed/one';

// Fixed-URI resource: one constant document the model can read.
resource('changelog', {
  uri: 'docs://changelog',
  title: 'Changelog',
  mimeType: 'text/markdown',
  // Return the bare content entry (or just a string); never a { contents: [...] } wrapper.
  fulfil: () => ({ uri: 'docs://changelog', mimeType: 'text/markdown', text: 'Changelog: 1.0.0 first release' }),
});

// {var} URI-template resource: the URI variable arrives on ctx.input (a symbolic ref).
resource('ticket', {
  uri: 'tickets://{id}',
  title: 'Support ticket',
  mimeType: 'text/markdown',
  fulfil: (ctx) => ({
    uri: `tickets://${ctx.input.id}`,
    mimeType: 'text/markdown',
    text: `Ticket ${ctx.input.id}`,
  }),
});
```

### Prompt

`prompt(name, { title?, description?, arguments?, fulfil })`. `arguments` is a Zod object (each key becomes a `prompts/list` descriptor) or an explicit `[{ name, description?, required? }]` list. `fulfil` returns `{ messages: [{ role, content: { type: 'text', text } }] }`; supplied argument values arrive on `ctx.input`.

```ts
import { prompt, z } from '@noodleseed/one';

prompt('summarize_ticket', {
  title: 'Summarize ticket',
  description: 'Draft a short summary of a support ticket.',
  // A Zod object: each key becomes a prompts/list descriptor (or pass [{ name, description?, required? }]).
  arguments: z.object({
    ticket_id: z.string().describe('Ticket to summarize'),
    tone: z.enum(['concise', 'detailed']).default('concise'),
  }),
  // Argument values arrive on ctx.input; return the prompts/get messages shape.
  fulfil: (ctx) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Summarize ticket ${ctx.input.ticket_id} in a ${ctx.input.tone} tone.`,
        },
      },
    ],
  }),
});
```

### Non-trivial tool: ctx connectors, annotations, visibility, async

`ctx` is `{ input, user, connectors }`. Bind connectors with `use` on the server, then call one inside `fulfil` to record a step. `annotations.readOnly()` declares a closed-world safe read. TypeScript action helpers enforce confirmation only with `{ confirm: true }`; omitted or `false` executes directly, and action/destructive/open-world hints alone never enable the gate. For stateless hosts that cannot present Noodle confirmation, set `interactions: { confirmationFallback: 'host' }` in the `server` options to explicitly trust native host write approval; omission remains fail-closed and the fallback never supplies missing `ctx.elicit` input. `visibility` defaults to `['model', 'app']` — set `['app']` to hide a helper from the model. `fulfil` may be `async` (the compiler awaits it while recording).

```ts
import { annotations, connector, server, tool, z } from '@noodleseed/one';

// A tool-facing HTTP connector, bound to the server via `use`, reachable as ctx.connectors.crm.
const crm = connector('crm')
  .version('1.0.0')
  .http({
    baseUrl: 'https://crm.example.com',
    allowedOrigins: ['https://crm.example.com'],
    operations: {
      get_ticket: {
        type: 'read',
        method: 'GET',
        path: '/tickets',
        query: ['id'],
        input: z.object({ id: z.string() }),
        output: z.object({ subject: z.string().optional(), status: z.string().optional() }),
        response: { subject: '${response.subject}', status: '${response.status}' },
      },
    },
  });

export default server('support', { title: 'Support', version: '1.0.0', use: { crm } }, [
  tool('get_ticket', {
    description: 'Fetch a support ticket by id.',
    input: z.object({ id: z.string() }),
    output: z.object({ subject: z.string(), status: z.string() }),
    annotations: annotations.readOnly(), // read-only hint for hosts
    visibility: ['model', 'app'], // default; use ['app'] to hide the tool from the model
    // ctx is { input, user, connectors }. A connector call records one flow step (a Ref) —
    // recording is not execution, so never branch on the result with native if (use when).
    fulfil: ({ input, connectors }) => {
      const found = connectors.crm.get_ticket({ id: input.id });
      return { subject: found.subject, status: found.status };
    },
  }),
  tool('echo', {
    description: 'Echo text back.',
    input: z.object({ text: z.string() }),
    output: z.object({ echo: z.string() }),
    annotations: annotations.action(), // world-affecting hint; add { confirm: true } to gate
    // fulfil may be async — the compiler awaits it while recording the flow.
    fulfil: async ({ input }) => ({ echo: input.text }),
  }),
]);
```

### Conditional flow with when()

`when(condition, () => record)` records the inner step(s) guarded by a condition instead of a native `if`. `when` is a **free function** (import it), the condition is `ref.equals(scalar)` (equality only — no `<`/`>`/`&&`), and the recorded step is skipped at runtime unless the condition holds. Never write a native `if` on a symbolic ref, and never call a method on one (e.g. `input.name.trim()`) — both silently mis-record or throw; compose strings with a template literal and branch with `when(...)`.

```ts
import { connector, server, tool, when, z } from '@noodleseed/one';

// Two read operations; the tracking lookup only runs when the order came back shipped.
const orders = connector('orders')
  .version('1.0.0')
  .http({
    baseUrl: 'https://orders.example.com',
    allowedOrigins: ['https://orders.example.com'],
    operations: {
      get_order: {
        type: 'read',
        method: 'GET',
        path: '/orders',
        query: ['id'],
        input: z.object({ id: z.string() }),
        output: z.object({ id: z.string().optional(), status: z.string().optional() }),
        response: { id: '${response.id}', status: '${response.status}' },
      },
      get_tracking: {
        type: 'read',
        method: 'GET',
        path: '/tracking',
        query: ['order_id'],
        input: z.object({ order_id: z.string() }),
        output: z.object({ url: z.string().optional() }),
        response: { url: '${response.url}' },
      },
    },
  });

export default server('orders_app', { title: 'Orders', version: '1.0.0', use: { orders } }, [
  tool('track_order', {
    description: 'Find shipment tracking for an order.',
    input: z.object({ orderId: z.string() }),
    output: z.object({
      orderId: z.string(),
      status: z.string(),
      trackingUrl: z.string().optional(),
    }),
    fulfil: ({ input, connectors }) => {
      const order = connectors.orders.get_order({ id: input.orderId });
      // Record the tracking step only when order.status === "shipped" (equality-only condition).
      const tracking = when(order.status.equals('shipped'), () =>
        connectors.orders.get_tracking({ order_id: order.id }),
      );
      return {
        orderId: order.id,
        status: order.status,
        // `.optional()` marks a ref that may be absent when its guarding step did not run.
        trackingUrl: tracking.url.optional(),
      };
    },
  }),
]);
```