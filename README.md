# Nuitee Travel MCP App Starter

A guest-first Next.js developer template for building a chat-first flight experience with a Noodle embedded assistant and the official Nuitee Connect Flights API. The fictional customer-facing brand is **Wayfare**.

The primary guest website guides a traveler through **Search → Select → Verify** and stops at a verified fare. It does not book, hold inventory, collect passenger details, take payment, or issue tickets. The repository also exposes the same bounded MCP tools and linked Apps to external MCP hosts; there is no website-only copy of the travel product.

This is an independent starter, not an official Nuitee connector, airline partnership, booking product, or endorsement.

## Primary guest website

The Next.js application in `apps/web/` is the main developer path. Its cinematic conversation-first hero starts with the traveler’s own words, then moves into delayed anonymous Assistant admission, an application-owned typed renderer, plain-language progress, structured trip projection, and the existing Noodle MCP App views.

```sh
corepack enable
pnpm install
pnpm dev:web
```

Open `http://localhost:3000`. The zero state works without credentials and does not open an Assistant session on mount. Without a real public embed ID, the first submitted message fails closed with setup guidance rather than substituting a fake assistant.

Run the credential-free MCP gate separately:

```sh
pnpm agent:check
```

After a separately authorized assistant-enabled deployment provides a stable public embed ID, copy `apps/web/.env.example` to an ignored local environment file and set:

```text
NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID=<real-public-embed-id>
NEXT_PUBLIC_NOODLE_SERVICE_URL=<exact-service-origin>
```

Both values are public deployment coordinates. Never place `NUITEE_API_KEY`, an Assistant client secret, or model credentials in a `NEXT_PUBLIC_` variable. The optional service URL must be one exact HTTPS origin, or an explicit loopback origin with a port for local development.

The browser path is:

```text
Next.js browser
  → public Noodle assistant
  → shared travel MCP and linked Apps
  → server-side Nuitee connector
  → Nuitee Flights API
```

The guest template has no login button, application database, or `/api/assistant/session` route. Add identity only for a real identity-bound capability and follow [docs/oauth.md](docs/oauth.md); website login, Assistant session exchange, and direct MCP customer authentication are distinct layers.

## Capability boundary

- Open the travel starter and explain the supported flight scope.
- Search current one-way and round-trip offers after resolving only unambiguous places to IATA codes.
- Return at most ten normalized itineraries and show at most three inline.
- Select an application-issued opaque fare handle inside the linked flight-results App.
- Verify the active or explicitly selected fare against current availability and price.
- Treat partial results, changed prices, unavailable offers, and expiry as normal bounded outcomes.

The product deliberately does not prebook, reserve, collect passengers, take payment, ticket, cancel, refund, manage loyalty, or search hotels and cars. “Stays,” “Loyalty,” “Ground travel,” and “Experiences” remain noninteractive presentation only.

## Live Nuitee development

Requirements:

- Node.js 24 or newer;
- pnpm 11 or newer;
- a Nuitee API key for live tools; and
- Nuitee Flights access for the intended environment. Possession of a key alone does not guarantee usable Flights entitlement.

See Nuitee's [authentication](https://docs.liteapi.travel/reference/authentication) and [Flights access](https://docs.liteapi.travel/docs/getting-access-to-flights) guidance. Sandbox data is non-production, limited, and may be inconsistent. Production and whitelabel access require Nuitee approval.

The credential-free server remains the default:

```sh
pnpm dev
```

Its home App works and live-only tools return an explicit configuration error. For current provider results in local DevTools, copy the value-free template, add the key to the project-root ignored `.env`, and start the live entrypoint:

```sh
cp .env.example .env
# Edit .env locally so it contains NUITEE_API_KEY=<your value>.
pnpm dev:live
```

Local setup does not require `noodle login`. The pinned CLI reads the exact project-root `.env` only as a local fallback for matching `secret(...)` declarations. `.env.local` is not that fallback. Stop and restart `pnpm dev:live` after changing server code or configuration.

Alternatively, transfer an already exported shell value into Noodle's ignored local store without placing the value on the command line:

```sh
pnpm exec noodle secrets set NUITEE_API_KEY --runtime local --from-env NUITEE_API_KEY
```

Never paste a Nuitee key into a conversation, source file, browser variable, screenshot, fixture, test, log, URL, or Git history. A local value is not automatically a hosted deployment secret.

For a live smoke, ask for a future one-way or round-trip flight, select one returned fare in the linked App, and choose **Verify selected fare**. A `partial` search result is valid when malformed provider entries were safely dropped. The terminal outcome is a verified or changed fare, never a booking.

## External MCP hosts

ChatGPT, Claude, Inspector, and other MCP hosts can consume the same MCP server. The host provides the conversational model, so this path requires no Assistant model key.

```sh
pnpm exec noodle connect chatgpt
pnpm exec noodle connect claude
pnpm exec noodle connect inspector
```

Hosts without MCP Apps support still receive bounded structured results and a readable fallback summary. Users may speak in natural city or airport names; a capable host should resolve only clear places and ask for region or country clarification when a name is ambiguous.

The starter does not claim a custom widget domain. Before claiming or submitting ChatGPT App compatibility, set one real deployment-owned origin and run:

```sh
pnpm customize -- --widget-domain "$DEPLOYMENT_WIDGET_ORIGIN"
pnpm customize:check
pnpm exec noodle check src/live-server.ts --target chatgpt --json
```

Do not satisfy the gate with a placeholder, wildcard, path, or unrelated domain.

## Embedded Assistant architecture

`src/embedded-server.ts` declares the public Assistant surface over the same tool instances used by MCP hosts. `apps/web/` consumes the public embed ID and renders the primary guest website. Model settings and `NUITEE_API_KEY` remain server-side in Noodle; the browser receives neither.

The older `examples/embedded-assistant-host/` application remains only as a temporary authenticated migration reference while parity and removal gates are reviewed. It is not the primary website and its synthetic local sign-in is not a production identity implementation. See [docs/EMBEDDED_ASSISTANT.md](docs/EMBEDDED_ASSISTANT.md) for the guest path and [docs/oauth.md](docs/oauth.md) for a real authenticated extension.

No hosted conversation is claimed from local code or tests alone. A real public embed ID, exact HTTPS website origin, monitored privacy link, CSP validation, budget controls, live Search → Select → Verify browser proof, and the selection-TTL smoke remain promotion evidence in [PUBLIC_RELEASE_CHECKLIST.md](PUBLIC_RELEASE_CHECKLIST.md). Deployments, access changes, hosted configuration, and budget mutations require separate exact authorization.

## Customization

The canonical checked-in configuration lives in `src/starter-config.ts`; root `starter.config.ts` is the public compatibility facade imported by the Next.js app. Use the deterministic customizer rather than replacing strings across the repository:

```sh
pnpm customize -- \
  --brand-name "North Star Travel" \
  --brand-mark "N" \
  --tagline "Travel planning, made calm" \
  --accent "#123456"

pnpm customize:check
```

To prepare a specific hosted website, add its exact owner-controlled HTTPS origin and decide explicitly whether loopback remains:

```sh
pnpm customize -- --production-origin "https://<your-exact-domain>"
pnpm customize:check
```

The customizer does not rename packages, server IDs, tool names, connector contracts, state handles, provider limits, or fixtures. Review light/dark contrast and browser layout after visual changes. Full constraints are in [docs/customization.md](docs/customization.md).

## Architecture and security

The browser never calls Nuitee. The fixed server-side connector owns the exact provider origin, path, method, API-key injection, timeout, response-size limit, and normalization boundary. Provider offer IDs stay in private caller-scoped state; browser-visible selection IDs are application-issued opaque handles valid only against that state.

The shared journey is Search/Edit → Results → Verified fare review. The flight-results App uses `select_flight_offer` as an App-only helper and `verify_flight_offer` for current provider verification. Raw provider responses, arbitrary URLs, and transaction identifiers are never public output fields.

Read [docs/architecture.md](docs/architecture.md), [SECURITY.md](SECURITY.md), and [docs/nuitee-flights-contract.md](docs/nuitee-flights-contract.md) before changing the network, identity, state, or provider boundary.

## Quality gates

Useful local commands:

```sh
pnpm test
pnpm test:browser
pnpm customize:check
pnpm --filter @nuitee-travel-starter/web test
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web build
pnpm --filter @nuitee-travel-starter/web test:browser
pnpm exec noodle validate --json
pnpm exec noodle test --json
pnpm exec noodle tools list --json
pnpm exec noodle check --json
pnpm agent:check:live
pnpm agent:check:assistant
```

The fixture-only Chromium captures below show the cinematic conversation-first website and real linked Apps with fictional data; they are not live inventory or host screenshots. Their reproducible provenance is in [docs/images/README.md](docs/images/README.md).

| Cinematic credential-free home | Fictional flight comparison |
| --- | --- |
| ![Wayfare cinematic conversation-first home with no Assistant session before submit](docs/images/travel-home.png) | ![Wayfare flight-results widget using fictional fares and no airline logo](docs/images/flight-results.png) |

## Public-release status

This repository is licensed under the [Apache License 2.0](LICENSE), remains private, and is not being made public by these changes. Local implementation evidence does not prove hosted availability or authorize repository visibility, template status, deployment, access, budget, submission, or release changes.

The complete gate inventory is in [PUBLIC_RELEASE_CHECKLIST.md](PUBLIC_RELEASE_CHECKLIST.md). Outstanding owner/legal, security-contact, generated-dependency, widget-domain, caller-state lifecycle, hosted guest-assistant, privacy, and production browser evidence must be satisfied before a public-readiness claim.

## Contributing and generated guidance

Start with [CONTRIBUTING.md](CONTRIBUTING.md), use the sanitized issue forms, and never place vulnerability details or secrets in a public issue. Community support and its no-SLA boundary are in [SUPPORT.md](SUPPORT.md); the monitored private security route remains an owner decision in [SECURITY.md](SECURITY.md).

The `.agents/` and `.claude/` trees are generated Agent Kit guidance. [docs/generated-agent-guidance.md](docs/generated-agent-guidance.md) explains regeneration, provenance review, and public-redistribution boundaries. Review generated diffs; do not hand-edit them.

Unreleased changes are summarized in [CHANGELOG.md](CHANGELOG.md). Add a version and date only at an approved release freeze.
