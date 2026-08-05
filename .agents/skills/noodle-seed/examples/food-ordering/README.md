# Food Ordering

**Owns:** The flagship consumer ordering MCP App example: React view authoring, app-only helper tools,
caller-scoped cart state handles, invocation context, model-visible widget state/lifecycle, packaged image
assets, portable structured elicitation, checkout handoff policy, host actions, CSP/permissions metadata,
and widget preview coverage.

Food Ordering is a generic, synthetic version of a live marketplace ordering app. It lets a user search
stores, browse menus, customize an item, build a multi-line cart, review the order, and hand off checkout to
an allowlisted example domain. It does not use real restaurant APIs, real checkout, customer credentials, or
private customer data.

## What It Shows

| Capability | Example |
| :--- | :--- |
| Public entry tool | `open_ordering` returns structured fallback content and renders the React widget |
| App-only helper tools | `search_stores`, `load_menu`, `load_item`, `read_cart`, `sync_cart`, `prepare_checkout`; mutating widget-owned helpers use `confirm: false` (equivalent to omission) and execute directly because action hints alone never gate |
| Durable cart state | `server(..., { state: { handles: { cart } }, use: { state } })` with caller scope and revision checks |
| React app runtime kit | `@noodleseed/one/react` supplies app flow, shell/nav/view, async state, form, quantity, choice, and handoff primitives |
| Multi-step widget flow | One React shell navigates stores, menu, item customization, cart, review, and handoff views through `useAppFlow` |
| Invocation context | `server.context` sets locale/time-zone defaults, derives an ambient service area/date, and makes the same snapshot available to tools and the reserved `noodle_context` MCP adapter |
| Structured missing input | `plan_order` uses `ctx.elicit` to collect a fulfilment method and date through embedded/headless forms, standard bidirectional elicitation, a linked MCP App form, or an exact structured conversational retry on stateless hosts |
| Model-visible widget state | `useUpdateModelContext` publishes one cohesive replacement snapshot when supported; `useWidgetLifecycle` auto-publishes mounted/cancelled/dismissed and reports author-owned submitted milestones for future context (not host-presentation proof), while the user-triggered submit pairs `useSendFollowUpMessage` for an immediate reply |
| Handoff | `handoff.allowedDomains` allows only `https://orders.example.com` checkout URLs |
| Progressive enhancement | Non-Apps hosts still receive stores, featured items, and a readable fallback summary |
| Fail-closed hydration | The React view treats only the unhydrated, pre-result `{}` envelope as pending; a hydrated empty success remains distinct. It surfaces `isError`, validates required records and identifiers, and withholds ordering actions from malformed results |

The example is intentionally richer than the generated starter, but each inline view still follows the
same default: one immediate purpose, one primary action, at most one subordinate action, and progressive
disclosure for the rest. Preview it at 280px before adding navigation or local CSS; loading, empty, stale,
error/retry, and success states must remain readable without nested vertical scrolling.

Like the comprehensive default `noodle init my-app` scaffold, this flagship keeps the server feature-rich
while making each individual widget view focused; server capability breadth and screen density are separate.
The compiled initial widget should normally remain under the 1 MiB performance recommendation; Noodle Seed's
hard ceilings are 10 MiB per compiled widget and 20 MiB across one deployment. Run `noodle check` to see raw
and gzip-estimated sizes. Deploy requests are gzip-compressed as one stream so repeated self-contained React
runtime bytes deduplicate on the wire without a cross-tenant CDN. Keep menu images or large live datasets in assets/resources and app-only tools
rather than embedding them into the initial HTML bundle.

## Local Author Loop

```sh
noodle validate
noodle test
noodle dev
```

In another terminal:

```sh
noodle tools list
noodle tools call open_ordering --args '{"customer":"Asha","query":"noodles"}'
noodle tools call summarize_ordering_options --args '{}'
```

When a developer finalizes visual feedback in the local Design experience, a coding agent can inspect the
latest project-local brief without a path or session id:

```sh
noodle design inspect --latest --json
```

The agent should locate the captured elements in this example's authored React source, preserve the listed
behavior and accessibility constraints, and verify every acceptance check before changing unrelated UI.

For Apps metadata conformance, start `noodle dev`, copy the loopback MCP endpoint, then run:

```sh
npx @mcpjam/cli@latest apps conformance --url http://127.0.0.1:<port>/o/demo/food-ordering/mcp --quiet --format json
```

## Client Setup

Use the CLI to print the exact setup flow for your MCP client:

```sh
noodle connect claude
noodle connect chatgpt
noodle connect inspector
```

## Deploy

```sh
noodle deploy --org demo --app food-ordering --env prod --access owner-only
noodle open
```

That one deploy command preflights the complete target, creates a missing app/environment, and verifies
hosted readiness. If it is interrupted, rerun the same command to resume the unfinished operation without a
duplicate deployment. Use `--access org-members` for an org-wide internal demo. This example has no
connector secrets and does not include tokens, caller-key mechanisms, or `.env.noodle` values.

## Demo Assets

The packaged demo images live under `assets/` and are public web assets when deployed. The current app uses
`assets/noodle-bowl.jpg` as the server branding image.

Image sources:

- `assets/noodle-bowl.jpg` — Unsplash photo
  [`IRv8V9Hb8gI`](https://unsplash.com/photos/IRv8V9Hb8gI), downloaded from Unsplash.
- `assets/lentil-soup.jpg` — Unsplash image
  [`photo-1510431198580-7727c9fa1e3a`](https://images.unsplash.com/photo-1510431198580-7727c9fa1e3a), downloaded from Unsplash.
- `assets/mint-lemonade.jpg` — Unsplash photo
  [`X7Nx327NtuA`](https://unsplash.com/photos/X7Nx327NtuA) by Imad 786.

Unsplash photos are free to use under the [Unsplash License](https://unsplash.com/license); attribution is
not required, but source notes are kept here for provenance.
