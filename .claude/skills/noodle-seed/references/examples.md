# Examples

Flagship examples, one per capability. The **bundled** rows ship inside this skill under `examples/<name>/` (the real `server.ts`, `src/views/*.tsx`, and — for the design-first flagships — a `design/` set); read them locally at the paths shown. The rest live only in the Noodle Seed repository under `examples/<name>/` on GitHub. Extend an existing flagship rather than inventing a new shape.

## Bundled in this skill — read locally

Paths are relative to this skill directory. Assets (images/fonts) are omitted from the bundle; fetch the full runnable example from the repository if you need them. Verify any edit with `noodle validate --json` then `noodle test --json`.

| Example | Use when | Read |
| :-- | :-- | :-- |
| `hello` | Minimal TypeScript quickstart — a single tool, no connectors/widgets. | `examples/hello/src/server.ts` |
| `weather` | HTTP connectors, multi-step flows, a list-returning connector op (whole-array bind + compute narrowing), and the sandboxed compute connector. | `examples/weather/src/server.ts` |
| `food-ordering` | Consumer ordering MCP App widgets, app-only helpers, cart state, assets, branding, and handoff. | `examples/food-ordering/src/server.ts` |
| `acme-discovery` | Top-of-funnel discovery→handoff: a discovery carousel, a `create_handoff` deep link, and a design-first UX spec + wireframe. | `examples/acme-discovery/src/server.ts` + `design/` |
| `acme-tasks` | A two-way productivity app designed around its top-3 prioritized flows (capture/prioritize/complete), with a design-first flow spec + wireframe. | `examples/acme-tasks/src/server.ts` + `design/` |
| `acme-bistro` | End-to-end ordering with a payment-only handoff; ships a gold-standard `design/` set (UX doc, wireframe with compliance audit, API contract). | `examples/acme-bistro/src/server.ts` + `design/` |
| `customer-auth` | End-user OIDC, private customer API routing, route-bound confirmed actions, roles/scopes, and delegated credentials. | `examples/customer-auth/src/server.ts` |
| `stateful-draft` | Review and save a brief before signup; carry caller-scoped state into an account. | `examples/stateful-draft/src/server.ts` |
| `gmail-multi-account` | One curated Gmail connector reused by two account bindings, canonical account arrays, exact mutation confirmation, and an accompanying personal-automation skill. | `examples/gmail-multi-account/src/server.ts` |
| `google-bigquery` | Keyless Google Workload Identity Federation with optional service-account impersonation, a BigQuery REST connector, and complete developer/operator setup. | `examples/google-bigquery/src/server.ts` |

## In the repository only — `examples/<name>/` on GitHub

| Example | Use when |
| :-- | :-- |
| `perplexity` | A real SaaS API with bearer auth and a managed `secret`. |
| `bitcoin` | API-key HTTP connector, custom auth header, and compute normalization. |
| `sharepoint` | Microsoft SharePoint delegated Microsoft Entra auth and Graph tools. |
| `internal-ops-demo` | Governed internal connectivity — tools/resources/prompts, role-shaped output. |

## Canonical server.ts

Author with `server(name, options, definitions)` and top-level helpers:

```ts
import { server, tool, z } from '@noodleseed/one';

export default server('hello', { title: 'Hello', version: '1.0.0' }, [
  tool('greet', {
    description: 'Greet someone by name.',
    input: z.object({ name: z.string() }),
    output: z.object({ greeting: z.string() }),
    fulfil: ({ input }) => ({ greeting: `Hello, ${input.name}!` }),
  }),
]);
```