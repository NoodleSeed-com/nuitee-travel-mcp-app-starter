# Nuitee Travel MCP App Starter

A flights-first Noodle Seed reference application for building polished conversational travel experiences with the official Nuitee Connect Flights API. The fictional customer-facing brand is **Cedar & Cloud Travel**.

This repository demonstrates secure server-side API access, three bounded travel tools, two MCP Apps entry widgets designed for responsive hosts and one unified flight journey, opaque fare-selection state, defensive normalization, and fully offline tests. It is an independent starter—not an official Nuitee connector, airline partnership, booking product, or endorsement.

## What it does

- Opens a credential-free travel home with Flights marked available.
- Searches current one-way and round-trip flight offers through Nuitee.
- Returns at most ten normalized options and shows at most three inline.
- Provides familiar editable search controls with explicit Round trip and One way choices; the host resolves natural place names and asks before resolving ambiguous airports.
- Verifies a fare selected from the current caller-scoped search.
- Moves from search to comparison to a boarding-pass-inspired **Verified fare review**, with Back/Edit navigation and no ticket claim.
- Treats fare changes as a normal state and stops before prebooking.

It deliberately does **not** prebook, book, hold inventory, collect passengers, take payment, cancel, refund, redeem loyalty, search hotels or cars, or expose arbitrary HTTP. Stays, Loyalty, Ground travel, and Experiences are noninteractive “Coming soon” presentation only.

## Requirements

- Node.js 24 or newer
- pnpm 11 or newer
- A Nuitee API key for live tools
- Nuitee Flights access for the intended environment; possession of a key alone does not guarantee usable Flights entitlement

See Nuitee's [authentication](https://docs.liteapi.travel/reference/authentication) and [Flights access](https://docs.liteapi.travel/docs/getting-access-to-flights) guidance. Sandbox flight data is non-production, limited, and may be inconsistent. Production and whitelabel access require Nuitee approval.

## Five-minute local setup

```sh
git clone https://github.com/NoodleSeed-com/nuitee-travel-mcp-app-starter.git
cd nuitee-travel-mcp-app-starter
corepack enable
pnpm install
pnpm test
pnpm dev
```

`pnpm dev` uses the credential-free entrypoint. The home widget works and live-only tools return an explicit configuration error; they never substitute fixtures.

For current provider results in local DevTools, copy the value-free template, add your key to the project-root `.env`, and start the live entrypoint:

```sh
cp .env.example .env
# Edit .env locally so it contains NUITEE_API_KEY=<your value>.
pnpm dev:live
```

Local setup does not require `noodle login`. The pinned Noodle CLI treats the exact project-root `.env` as a read-only fallback for matching `secret(...)` declarations. `.env.local` is not that fallback. Stop and restart `pnpm dev:live` after changing server code or local configuration, then use Chat mode in the opened DevTools.

If you prefer Noodle's scoped local store, transfer an already exported shell value without putting the value on the command line:

```sh
pnpm exec noodle secrets set NUITEE_API_KEY --runtime local --from-env NUITEE_API_KEY
```

That optional command writes `.env.noodle` for the effective local target. Both `.env` and `.env.noodle` are ignored. A local value is not automatically a cloud deployment secret.

Never paste a Nuitee key into a conversation, source file, browser variable, screenshot, fixture, test, log, or Git history. `.env.example` contains only the variable name; `.env`, `.env.local`, and `.env.noodle` are ignored. End-user credential brokering is outside version one.

## Two supported consumption paths

### A. External MCP host

ChatGPT, Claude, and other MCP hosts provide the conversational model, so no assistant-model API key is required. Start the appropriate entrypoint and use the current CLI guidance for your host:

```sh
pnpm exec noodle connect chatgpt
pnpm exec noodle connect claude
pnpm exec noodle connect inspector
```

Hosts without MCP Apps support still receive bounded structured data and a readable `fallback` summary.

### Test a live search locally

With `pnpm dev:live` running, send this in DevTools Chat:

> Find a one-way flight from Sydney, Nova Scotia to Halifax two months from today for one adult in economy, priced in CAD from Canada.

The host should resolve the place names to YQY and YHZ before calling the typed tool. A successful call shows current normalized provider options; a `partial` result is valid when malformed provider entries were safely dropped. Select one option and choose **Verify selected fare** to exercise same-session verification. If the widget still shows an earlier schema error after a source change, stop the running process with Ctrl+C, run `pnpm dev:live` again, and start a fresh DevTools conversation.

### Test the deployed server in ChatGPT

Local proof and hosted proof are separate. After local search and verification pass, the repository owner can run:

```sh
pnpm exec noodle validate src/live-server.ts --json
pnpm exec noodle login

# One-time local link. Replace YOUR_ORG_SLUG with the slug shown by Noodle.
pnpm exec noodle link \
  --org YOUR_ORG_SLUG \
  --app nuitee-travel-mcp-app-starter \
  --env dev \
  --access owner-only \
  --entrypoint src/live-server.ts \
  --save local

pnpm exec noodle deploy
pnpm exec noodle open --print
pnpm exec noodle connect chatgpt
```

Always use the pinned project-local CLI through `pnpm exec noodle`. A bare `noodle deploy` may invoke an older global installation and correctly fail the deploy preflight when its CLI version does not match the project's pinned `@noodleseed/one` version. The hosted service can also raise its minimum compatible CLI version; in that case even the correctly pinned local CLI fails closed and names the required version. Treat that as a reviewed dependency update: inspect the release guidance, update the exact pin and lockfile, regenerate Agent Kit, and rerun every gate below. Do not bypass the compatibility check.

The local link is deliberate: without an explicit link or deploy target, the CLI may infer the app slug from the entrypoint filename (for example, `live-server`) and use a different environment than intended. Confirm the printed org, app, environment, access mode, and entrypoint before approving a deploy.

The interactive deploy preflight identifies missing cloud configuration. Configure `NUITEE_API_KEY` as the deployment's server-side secret; do not assume the local `.env` has been uploaded, and do not put the key in ChatGPT. `owner-only` is the safe initial test access. ChatGPT Developer mode uses the public HTTPS MCP endpoint printed after deployment.

This starter intentionally omits a made-up widget domain. Local DevTools and generic MCP connection testing do not need one. `pnpm exec noodle check src/live-server.ts --target chatgpt --json` therefore fails its `chatgpt_widget_domain` release gate until the deployment owner configures one real, dedicated HTTPS origin for both widgets. That domain is required for reliable ChatGPT app-version discovery and becomes the widget sandbox origin; never satisfy the gate with a placeholder. Add it and make the ChatGPT target check pass before claiming ChatGPT compatibility or submitting the app.

### B. Optional embedded assistant

A developer may place the same MCP server inside an authenticated website or SaaS application. The companion at `examples/embedded-assistant-host/` demonstrates this without duplicating the travel connector, schemas, normalizers, tools, or widgets. See [docs/EMBEDDED_ASSISTANT.md](docs/EMBEDDED_ASSISTANT.md).

## Useful commands

```sh
pnpm test
pnpm exec noodle validate --json
pnpm exec noodle test --json
pnpm exec noodle tools list --json
pnpm exec noodle check --json

pnpm validate:live
pnpm exec noodle devtools src/server.ts
pnpm exec noodle devtools src/live-server.ts
```

Ordinary tests and the default Noodle baseline are fully offline and need neither `NUITEE_API_KEY` nor an assistant-model credential. `src/live-server.ts` statically validates without a key, but executing its provider-backed tools requires the managed Nuitee secret and account entitlement.

## Example prompts

- “Open Cedar & Cloud Travel.”
- “Find a one-way flight from Sydney, Nova Scotia to Halifax on `<future YYYY-MM-DD>` for one adult, economy, priced in CAD from Canada.”
- “Find a round trip from San Francisco to Tokyo next month, returning a week later, for two adults in premium economy, priced in USD from the US.”
- “Verify the fare I selected.”

Users do not need to know IATA codes. The host model resolves clear city or airport names to the tool's validated internal codes, restates the selected airports, and asks for region/country clarification when a name is ambiguous. The official live airport-search tool remains omitted until the published Noodle HTTP connector can execute that GET reliably, so the model must never guess an unfamiliar code.

## Widget tour

| Widget | When it appears | What the user can do |
| --- | --- | --- |
| `TravelHome` | Opening the starter or beginning a flight search | See Flights as available, view future domains as noninteractive “Coming soon” items, and start a familiar one-way or round-trip search through the host conversation. |
| `FlightResults` | After search or fare verification | Compare three offers inline (up to ten in fullscreen), edit the search, select one fare, verify its current price, and return through the unified Search → Results → Verified fare-review flow. |

Both widgets use host-native typography, light/dark themes, visible keyboard focus, practical touch targets, reduced-motion-safe loading skeletons, and bounded text fallback for hosts without MCP Apps. The final review is explicitly not a ticket, booking, or reservation. Browser-level 280px and named-host evidence remains a release gate, so clone authors should run the checks in [CONTRIBUTING.md](CONTRIBUTING.md) before making compatibility claims.

## Expected failure behavior

Provider failures never trigger fixture fallback. The gateway has hermetic coverage for sanitized categories covering missing configuration, authentication, entitlement, rate limiting, timeout, provider error, unavailable service, malformed or oversized response, expired or unavailable offer, and unknown or stale selection. A changed fare remains a successful verification state with old and new prices. Exact transport-error mapping remains part of the owner-authorized live smoke because the public connector guidance does not specify every thrown runtime error shape.

See [docs/troubleshooting.md](docs/troubleshooting.md) for operator actions.

## Project map

- `src/server.ts` — credential-free default entrypoint
- `src/live-server.ts` — managed-secret live composition
- `src/travel-server.ts` — shared three-tool product definition
- `src/flight-connectors.ts` — exact-origin Nuitee HTTP and compute connectors plus caller state adapter
- `src/flight-runtime.ts` — request validation, failure classification, bounded normalization, and opaque selection resolution
- `src/flight-schemas.ts` — public and private Zod contracts
- `src/views/` — TravelHome and FlightResults entry widgets plus their shared search editor and unified visual system
- `test/` — hermetic fictional fixtures and offline tests
- `docs/` — architecture, provider contract, customization, embedding, and troubleshooting

## Customization

Branding, tool descriptions, normalization fields, widget composition, and future domain boundaries are documented in [docs/customization.md](docs/customization.md). The widgets use the host platform's system sans-serif stack, system-neutral structural colors, and a restrained Cedar & Cloud accent. They deliberately avoid a duplicated in-widget brand logo or decorative hero so they remain native to ChatGPT and other MCP hosts. Keep fixture airlines fictional and do not bundle carrier assets. Live results may display the carrier name, code, and documented `marketingLogo` supplied by Nuitee, but only when the image uses an allowlisted Nuitee Flights asset origin; carrier text remains the fallback. Inventory attribution does not by itself imply an airline partnership or make this an official Nuitee connector.

## Updating Noodle Seed safely

`@noodleseed/one` is pinned exactly to `0.132.1`. Dependabot opens reviewable dependency pull requests monthly; nothing auto-merges. For a manual Noodle update:

1. Compare the registry version and release guidance.
2. Update the exact package pin and regenerate `pnpm-lock.yaml`.
3. Run `pnpm exec noodle agents setup --write`.
4. Re-read `AGENTS.md`, the selected skills, and generated references.
5. Run the full default and live static validation gates in [CONTRIBUTING.md](CONTRIBUTING.md).
6. Review breaking behavior before merge; never auto-merge a Noodle package change.

## Public-release status

No source license has been selected. Public distribution is blocked until the owner approves and adds one. Host-specific browser evidence, a credentialed sandbox/error-shape smoke by the repository owner, a recheck of deliberately unassigned fixture codes, and dependency/license review are also required before calling a release production-ready.

Live one-way search and same-session fare verification previously passed for a bounded sandbox route. A complete owner-authorized round-trip response later measured 4,960,533 decoded bytes, above the former 3 MiB operation ceiling. `@noodleseed/one` 0.116 raises the opt-in per-operation maximum to 6 MiB; this starter applies that ceiling only to flight search and proves the measured response class reaches bounded normalization hermetically. Fare verification keeps the smaller 750,000-byte application limit and no widened connector limit. The 6 MiB configuration still needs a successful live mapping recheck after deployment. Nuitee documents no result limit or pagination contract.

The 0.107 airport recheck was inconclusive: the direct control received one redirect and a small HTML response rather than the expected JSON, while the connector produced no mapped result or observable public upstream cause. That does not reproduce a connector-only defect because the direct control did not succeed. `find_airports` remains omitted until the current official endpoint and equivalent direct/connector requests both pass safely.

No custom widget domain is claimed by default. Configure one real, dedicated,
deployment-owned HTTPS origin for both widgets before app-store submission.
