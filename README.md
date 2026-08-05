# Nuitee Travel MCP App Starter

A flights-first Noodle Seed reference application for building polished conversational travel experiences with the official Nuitee Connect Flights API. The fictional customer-facing brand is **Cedar & Cloud Travel**.

This repository demonstrates secure server-side API access, three bounded travel tools, two responsive MCP Apps widgets, opaque fare-selection state, defensive normalization, and fully offline tests. It is an independent starter—not an official Nuitee connector, airline partnership, booking product, or endorsement.

## What it does

- Opens a credential-free travel home with Flights marked available.
- Searches current one-way and round-trip flight offers through Nuitee.
- Returns at most ten normalized options and shows at most three inline.
- Verifies a fare selected from the current caller-scoped search.
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
pnpm install
pnpm test
pnpm dev
```

`pnpm dev` uses the credential-free entrypoint. The home widget works and live-only tools return an explicit configuration error; they never substitute fixtures.

To enable the live entrypoint, keep the real key in your shell and let the Noodle CLI write it to its ignored local managed-secret store:

```sh
read -rsp "Nuitee API key: " NUITEE_API_KEY
export NUITEE_API_KEY
pnpm exec noodle secrets set NUITEE_API_KEY --runtime local --from-env NUITEE_API_KEY
unset NUITEE_API_KEY
pnpm dev:live
```

Local setup does not require `noodle login`. The CLI copies the exported value into its ignored local managed-secret store; `.env` and `.env.local` files are not automatically exported for `--from-env`.

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

### B. Optional embedded assistant

A developer may place the same MCP server inside an authenticated website or SaaS application. Embedded mode adds separate server-side model configuration and a short-lived backend session exchange; it does not duplicate the travel connector, schemas, normalizers, tools, or widgets. See [docs/EMBEDDED_ASSISTANT.md](docs/EMBEDDED_ASSISTANT.md).

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
- “Find a one-way flight from Sydney, Nova Scotia to Halifax on 2026-09-18 for one adult, economy, priced in CAD from Canada.”
- “Find a round trip from San Francisco to Tokyo, returning a week later, for two adults in premium economy, priced in USD from the US.”
- “Verify the fare I selected.”

Users do not need to know IATA codes. The host model resolves clear city or airport names to the tool's validated internal codes, restates the selected airports, and asks for region/country clarification when a name is ambiguous. The official live airport-search tool remains omitted until the published Noodle HTTP connector can execute that GET reliably, so the model must never guess an unfamiliar code.

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
- `src/views/` — TravelHome and FlightResults React widgets
- `test/` — hermetic fictional fixtures and offline tests
- `docs/` — architecture, provider contract, customization, embedding, and troubleshooting

## Customization

Branding, tool descriptions, normalization fields, widget composition, and future domain boundaries are documented in [docs/customization.md](docs/customization.md). Keep fixture airlines fictional and do not bundle carrier logos or imply a partnership without verified usage rights. Live results may display the carrier name and code returned by Nuitee.

## Updating Noodle Seed safely

`@noodleseed/one` is pinned exactly to `0.104.1`. Dependabot opens reviewable dependency pull requests monthly; nothing auto-merges. For a manual Noodle update:

1. Compare the registry version and release guidance.
2. Update the exact package pin and regenerate `pnpm-lock.yaml`.
3. Run `pnpm exec noodle agents setup --write`.
4. Re-read `AGENTS.md`, the selected skills, and generated references.
5. Run the full default and live static validation gates in [CONTRIBUTING.md](CONTRIBUTING.md).
6. Review breaking behavior before merge; never auto-merge a Noodle package change.

## Public-release status

No source license has been selected. Public distribution is blocked until the owner approves and adds one. Host-specific browser evidence, a credentialed sandbox/error-shape smoke by the repository owner, a recheck of deliberately unassigned fixture codes, and dependency/license review are also required before calling a release production-ready.

Live one-way search and same-session fare verification passed for a bounded sandbox route. Reliability remains blocked for routes whose Nuitee response exceeds the published Noodle HTTP connector's fixed 1 MiB transport ceiling: an owner-authorized 2026-08-04 YYZ–LIS response was 2.85 MB without filters and had previously remained about 1.55 MB with documented cheapest-offer and one-stop filters. The connector rejects it before normalization, and the composed tool can only return a generic sanitized provider error. Nuitee documents no result limit or pagination contract.

The official airport-search endpoint also returned `200 OK` and 1,252 bytes directly, but the same fixed-origin GET failed through the published Noodle connector. Synthetic GET/query and exact-response relay controls passed, so `find_airports` is not exposed until that direct connector incompatibility is resolved.

The compiled widgets use the reserved fictional metadata origin
`https://cedar-cloud.example`. Replace it with the deployment's dedicated HTTPS
widget domain before ChatGPT registration or any hosted release.
