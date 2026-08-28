# Customization guide

Customize the existing flights-first product before adding scope. Keep Cedar & Cloud Travel fictional unless you have authority to replace it with your own brand.

## Cinematic hero image

Replace `apps/web/public/images/conversation-hero-v1.png` with an owned or licensed landscape image using the same filename, or update the explicit image import. Keep a 16:9 source, preserve calm left-side copy space and a lower composer-safe region, and verify the deterministic navy scrim at desktop, 390px, 320px, and 200% text zoom. Do not bundle airline trademarks, liveries, copyrighted campaign art, or destination imagery you do not have authority to redistribute.

## Branding

The canonical customization source is `src/starter-config.ts`. Root `starter.config.ts` is the public compatibility facade consumed by `apps/web/`; it re-exports the same object and must not define a second brand. Use the deterministic command instead of replacing brand text across the repository:

```sh
pnpm customize -- \
  --brand-name "North Star Travel" \
  --brand-mark "N" \
  --tagline "Travel planning, made calm" \
  --accent "#123456" \
  --surface "#F0F1F2" \
  --surface-dark "#101112"

pnpm customize:check
```

The command updates the canonical `src/starter-config.ts` file, writes it atomically, and is idempotent. It accepts only bounded presentation values and never reads credentials or environment files. The MCP server and Apps import the canonical module; the primary Next.js website reaches that same value through root `starter.config.ts`. The website is intentionally light-only and maps these values onto Tailwind's Neutral palette by default. Review light-theme contrast after changing colors; `surfaceDark` remains available to external hosts that consume the portable MCP brand kit.

To prepare the primary guest Assistant surface for one hosted website, add only that exact deployment-owned origin:

```sh
pnpm customize -- --production-origin "https://<your-exact-domain>"
```

That removes the localhost origin by default. Add `--keep-local-demo` only when the same non-production deployment must continue to serve the local Next.js website. The checker rejects paths, query strings, fragments, credentials, wildcards, reserved example/test domains, and non-loopback HTTP origins.

The customized runtime stays one bounded pipeline:

```text
Next.js browser
  → public Assistant surface using the configured exact origin
  → shared travel MCP and linked Apps using the same brand config
  → server-side Nuitee connector
  → Nuitee Flights API
```

The browser receives only the public embed ID and public service origin. Branding changes never move `NUITEE_API_KEY`, model settings, Assistant client credentials, provider identifiers, or raw provider data into the website.

The command deliberately does not rename the package, server ID, tool names, Nuitee connector, state handles, provider limits, fixture carriers, or historical product documents. Those identifiers and security boundaries are not consumer branding.

- Use your own name, short copy, and restrained accent token; keep structural surfaces and text host-neutral.
- Let the host-supplied app identity carry the logo. Do not repeat a brand mark inside a compact response widget.
- Keep the explicit platform system-font stack, compact type scale, and system sizing. The primary website stays light-only; portable MCP widgets retain semantic light/dark colors for external hosts that own their presentation.
- Follow the current [OpenAI Apps SDK UI guidelines](https://developers.openai.com/plugins/concepts/ui-guidelines) when changing typography, color, spacing, actions, or navigation.
- Do not bundle airline/provider logos. FlightResults may render the documented `marketingLogo` from a live result only after the runtime accepts its exact Nuitee Flights asset origin/path; keep carrier text and initials as the failure fallback. A remote image request still reveals normal network metadata to the Nuitee asset host, so disable the image path if that tradeoff does not fit the deployment's privacy policy.
- Never imply a partnership or call this an “official Nuitee connector” without authorization.
- The starter claims no custom widget domain. Before app-store submission, set
  one real, dedicated, deployment-owned HTTPS origin with:

  ```sh
  pnpm customize -- --widget-domain "$DEPLOYMENT_WIDGET_ORIGIN"
  pnpm customize:check
  ```

  Set `DEPLOYMENT_WIDGET_ORIGIN` to the actual owner-controlled deployment
  domain first. The customizer validates one exact HTTPS origin and applies it consistently to
  `homeViewPolicy` and `flightViewPolicy`; it rejects placeholders, wildcards,
  paths, query strings, and fragments. The committed default remains `null`.

Search fixtures must remain clearly fictional. Live output may show the actual carrier name, code, and allowlisted Nuitee-hosted airline image returned by Nuitee, but that is inventory attribution—not a bundled brand partnership.

## Tool descriptions and inputs

Four shared capabilities are created in `src/travel-server.ts` from schemas in `src/flight-schemas.ts`: three model-visible tools plus the App-only selection helper. The public Assistant allowlists the same instances registered for external MCP hosts.

- Keep names intent-shaped and stable.
- Describe one-way/round-trip, price verification, and stop-before-booking boundaries plainly.
- Do not add transport authority such as URL, base URL, path, method, headers, or provider offer ID to an input schema.
- If a new input is required by the official Nuitee contract, add a failing test, validation, request mapping, docs, and bounded output before exposing it.
- Keep country explicit unless product research supports a trusted server-owned point-of-sale default. Do not infer it from untrusted browser hints.

## Normalized fields

Provider-to-public normalization is in `src/flight-runtime.ts`; matching Zod contracts are in `src/flight-schemas.ts`.

To add a field:

1. Verify it in the current official Flights OpenAPI.
2. Decide whether it improves user comparison or verification.
3. Add a fictional success fixture plus missing/malformed/oversized cases.
4. Sanitize strings and cap every new array/nested array.
5. Add it to the public schema only after the runtime produces a bounded value.
6. Update text fallback and widget presentation only if it remains clear at 280px.

Do not return the complete upstream journey, offers array, provider logos, arbitrary carrier image URLs, internal booking/fare codes, coordinates, or any provider identifier used for a downstream transaction. If the Nuitee asset hosts change, verify the current official contract and review CSP/privacy implications before changing the exact allowlist.

## Widget composition

TravelHome and FlightResults live in `src/views/`; `search-editor.tsx` is their shared familiar form. Both use public `@noodleseed/one/react` primitives through `src/helpers.ts`.

- Preserve explicit unselected/selected card states and the single result-level primary action: **Verify selected fare**.
- Keep Search/Edit → Results → Verified fare review navigation shallow, Back-enabled, and persisted with the public app-flow helper.
- Place-name edits must go through an explicit host follow-up until a verified airport-resolution tool exists; never ship a guessed or static production airport mapping.
- Keep three cards inline and ten only when the host supplies fullscreen mode.
- Use progressive disclosure instead of an inner scrolling pane.
- Keep empty, partial, unavailable, malformed, retry, changed-price, expired, and success states.
- Keep the shimmer loading skeleton structurally aligned with the result cards, label it as an offer search rather than live aircraft tracking, and preserve its reduced-motion fallback. Do not add a route scanner, spinner spectacle, or implied live-radar movement.
- Feature-detect host behavior through public hooks; do not depend on a host global.
- Leave widget CSP connection domains empty while all data moves through tools. Keep resource origins empty for TravelHome and restricted to the two Nuitee Flights image origins for FlightResults.
- Do not add a default handoff. A real deployment must author an exact HTTPS domain, a server-owned short-lived deep link or session, and matching origin policy before a handoff button appears.

Run SSR tests and real-browser checks after visual changes. Static CSS assertions do not prove actual 280px layout or keyboard behavior.

## Connector policy

`src/flight-connectors.ts` owns all Nuitee network authority. A safe customization may change request/response fields while preserving:

- exact `https://api.liteapi.travel` origin;
- documented `/v3.0` base;
- allowlisted operations only;
- managed `X-API-Key` authentication;
- one-host-call and timeout limits;
- response-size and normalization bounds;
- sanitized failure output.

Do not add a browser fetch, arbitrary HTTP tool, model-selected origin, raw header input, or silent fixture fallback.

## Adding a future travel domain

Do not begin with an empty folder or placeholder tool. First obtain:

1. A current official endpoint and OpenAPI contract.
2. A clear conversational user benefit and version-one workflow boundary.
3. A credential/identity design that does not weaken Flights.
4. Failing offline tests for request, normalization, failures, and tool catalog.
5. A small public output with explicit caps.
6. A widget only if visual interaction materially improves the experience.
7. Live-read and host evidence under explicit authorization.

Only then register the new tool and change the home domain from “Coming soon.” Domain modules should appear when they own real behavior; do not pre-build abstractions for speculative expansion.

## Guest website and optional identity

`apps/web/` is the primary guest website and `src/embedded-server.ts` selects the shared server factory's public Assistant mode. The committed allowlist contains only the exact Next.js loopback origin. Before a hosted deployment, configure one real HTTPS origin, decide explicitly whether loopback remains, and follow [EMBEDDED_ASSISTANT.md](EMBEDDED_ASSISTANT.md).

Do not create an embedded-only copy of the flight tools or move model/Nuitee credentials into the browser. The public embed ID is intentionally non-secret; an Assistant client secret is not. If a real identity-bound capability later needs website login and backend session exchange, follow [oauth.md](oauth.md). Do not add a disabled login control or reuse the synthetic identity from `examples/embedded-assistant-host/`.
