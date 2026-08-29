# Customization guide

Customize the existing flights-first product before adding scope. Keep Wayfare fictional unless you have authority to replace it with your own brand.

## Wayfare image system

The light, Inter-only hybrid cinematic landing uses four local high-resolution JPEG masters: `wayfare-hybrid-hero-v2.jpg` plus the Rome, London, and Istanbul `-editorial-v2.jpg` destinations. Each is a truthful native `1672 × 941` master—not a literal 4K source. Next.js makes responsive AVIF/WebP derivatives from the local files; preserve the explicit `sizes`, focal positions, priority behavior, and responsive crop checks when replacing one.

Read [the Wayfare provenance ledger](visual-assets/wayfare-premium-concierge.md) before changing an image. It records the accepted paths, native dimensions, byte counts, SHA-256 hashes, crop decisions, visual review, and rejected variants. Keep replacements local and owned, licensed, or generated; do not introduce a remote image origin, airline trademarks, liveries, copyrighted campaign art, or an image-based fare, availability, partnership, or destination guarantee. Every changed binary needs its own exact reviewed blob/path pair in `security/reviewed-binary-blobs.txt`; a filename or directory exception is not enough.

## Bundled typography

The website and repository-owned MCP Apps bundle Inter Variable through exact
dependency `@fontsource-variable/inter@5.3.0`; browsers do not fetch the font
from Google or another runtime font host. The package declares the SIL Open
Font License 1.1 (`OFL-1.1`) and includes its license text. Code and command
samples retain a semantic monospace stack.

If you replace Inter, update both package boundaries, the website import, both
MCP App entry imports, the shared `--font-sans` widget token, browser-computed
font tests, and the dependency-license evidence together. The bundled license
record is evidence of the current dependency metadata, not a completed legal
approval: copyright, NOTICE treatment, dependency provenance/compatibility,
and public redistribution still require owner/legal review before release.

## Editorial landing content

Edit `apps/web/src/lib/landing-content.ts` to customize the editorial destination
cards and feature. For each entry in `landingDestinations`, change `name`,
`descriptor`, `prompt`, `imageSrc`, and `imagePosition`. For
`landingEditorialFeature`, change `eyebrow`, `heading`, `support`, `action`,
`prompt`, `imageSrc`, and `imagePosition`.

The starter's three local destination image paths are:

- `/images/destinations/rome-editorial-v2.jpg`
- `/images/destinations/london-editorial-v2.jpg`
- `/images/destinations/istanbul-editorial-v2.jpg`

Keep replacements local and use only owned, licensed, or generated images. Review
the exact replacement bytes and add a new exact blob-ID line to
`security/reviewed-binary-blobs.txt` for every changed image; a path or directory
exception is not sufficient. Use realistic editorial imagery only as
non-evidentiary inspiration. Do not fabricate a fare, discount, availability,
airline partnership, destination guarantee, or any other commercial claim in an
image or its prompt copy.

The four committed masters were generated with OpenAI `image_gen`; their exact
prompts, dimensions, conversion settings, crop notes, and visual-review results
are recorded in [the Wayfare provenance ledger](visual-assets/wayfare-premium-concierge.md).
Raw generation sources stay outside git. Exact-blob review proves which bytes
were inspected for obvious logos, signage, faces, private data, and visual
defects; it does not complete copyright, trademark, model/provider terms, or
public-distribution review.

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
- `apps/web/src/components/wayfare-mark.tsx` owns the deterministic route-line SVG mark. Keep its continuous rounded route path, terminal dot, `currentColor` treatment, and accessible wordmark pairing; do not replace it with a generated raster, an airline lookalike, or a decorative ambient route motif.
- Let the host-supplied app identity carry the logo. Do not repeat a brand mark inside a compact response widget.
- Keep bundled Inter for repository-owned non-code UI, the compact type scale, and semantic monospace only for code. The primary website stays light-only; portable MCP widgets retain semantic light/dark colors for external hosts that own their presentation. Use installed Lucide icons at the documented 20px/18px sizes only for familiar supported actions, with named 44px icon-only controls.
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

Five shared capabilities are created in `src/travel-server.ts` from schemas in `src/flight-schemas.ts`: four model-visible tools plus the App-only selection helper. The public Assistant allowlists the same instances registered for external MCP hosts.

- Keep names intent-shaped and stable.
- Describe one-way/round-trip, price verification, and stop-before-booking boundaries plainly.
- Do not add transport authority such as URL, base URL, path, method, headers, or provider offer ID to an input schema.
- If a new input is required by the official Nuitee contract, add a failing test, validation, request mapping, docs, and bounded output before exposing it.
- The starter deliberately uses server-owned USD and US pricing defaults so a guest can reach results without provider jargon. Change those defaults only through reviewed application configuration; do not infer market from untrusted browser hints.

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

The primary website is one centered chronological conversation. Preserve each official inline MCP App at its original message part and mount it only through the official Noodle App host. The finite admission policy allows only `search_flights` + `ui://nuitee_travel_mcp_app_starter/search_flights_widget` and `open_travel_starter` + `ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget`; a mismatch must fail closed. Treat every distinct view ID as a separate invocation and never add generic deduplication, newest-only selection, a second workspace, or page-authored fare reconstruction. Keep the compact typed trip disclosure inside the conversation and source it only from validated fields. Local success does not prove the hosted embed; that remains unproven until a separately authorized deployment and exact embed-binding verification.

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
