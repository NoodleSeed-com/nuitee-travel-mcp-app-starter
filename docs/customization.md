# Customization guide

Customize the existing flights-first product before adding scope. Keep Wayfare fictional unless you have authority to replace it with your own brand.

## Wayfare image system

The high-contrast Host Grotesk homepage uses the configured layered jet-window hero, one
shared promise, one composer, passive destination inspiration, and passive
editorial copy. The optional `/experience` visual-reference route consumes the
complete Explore, Flights, Stays, Flight + Stay, and Insurance catalog declared
in `apps/web/src/lib/travel-hero-content.ts`. Each active hero is a truthful
native `1672 × 941` master—not a literal 4K source. Next.js makes responsive
AVIF/WebP derivatives from the local files; preserve the explicit `sizes`, focal
positions, priority behavior, and responsive crop checks when replacing one.

The default hero copy is intentionally limited to one H1. Its empty composer
cycles short, visual-only sample requests. Keep the samples within supported
travel intent, stop them on focus or text entry, and preserve the static
reduced-motion fallback. The surrounding ocean BorderBeam runs only while the agent is responding
and stays still when idle, focused, or showing an error; its submit
control remains an accessible arrow-only button. The compact header exposes only currency and the menu
beside the Wayfare lockup; do not restore direct planning or developer links to
that row.

The attribution row below the hero uses the unmodified official files
`apps/web/public/images/partners/noodle-seed.svg` and
`apps/web/public/images/partners/nuitee.svg`. These third-party wordmarks are an
identity exception to the Heroicons-only functional icon rule. Do not recolor,
redraw, animate, use them as controls, or imply a commercial endorsement beyond
the truthful `Built on` and `Powered by` labels. Confirm trademark and public
redistribution rights during the repository's public-release audit.

Read [the Wayfare provenance ledger](visual-assets/wayfare-premium-concierge.md) before changing an image. It records the accepted paths, native dimensions, byte counts, SHA-256 hashes, crop decisions, visual review, and rejected variants. Keep replacements local and owned, licensed, or generated; do not introduce a remote image origin, airline trademarks, liveries, copyrighted campaign art, or an image-based fare, availability, partnership, or destination guarantee. Every changed binary needs its own exact reviewed blob/path pair in `security/reviewed-binary-blobs.txt`; a filename or directory exception is not enough.

## Bundled typography

The Next.js website bundles Host Grotesk Variable through exact dependency
`@fontsource-variable/host-grotesk@5.3.0`; browsers do not fetch the font
from Google or another runtime font host. The package declares the SIL Open
Font License 1.1 (`OFL-1.1`) and includes its license text. Code and command
samples retain a semantic monospace stack.

If you replace Host Grotesk, update the website package and import,
browser-computed font tests, and dependency-license evidence together. Repository-owned MCP Apps follow the canonical brand guideline, including its
approved host typography and theme adaptation for ChatGPT. The bundled license
record is evidence of the current dependency metadata, not a completed legal
approval: copyright, NOTICE treatment, dependency provenance/compatibility,
and public redistribution still require owner/legal review before release.

## Editorial landing content

Edit `apps/web/src/lib/landing-content.ts` to customize the editorial destination
cards and feature. For each entry in `landingDestinations`, change `name`,
`descriptor`, `prompt`, `imageSrc`, and `imagePosition`. For
`landingEditorialFeature`, change only the passive editorial `heading` and `support`.
The destination `prompt` remains available to `/experience`; the default homepage
does not dispatch it from its passive destination inspiration.
Its visual panel uses the shared `WayfareMark` from
`apps/web/src/components/wayfare-mark.tsx`; there is no separate editorial image
or eyebrow field.

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

The editorial destination masters and active core hero masters were generated
with OpenAI `image_gen`; their prompt records or summaries, dimensions, crop
notes, and visual-review results are recorded in
[the Wayfare provenance ledger](visual-assets/wayfare-premium-concierge.md).
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

The command updates the canonical `src/starter-config.ts` file, writes it atomically, and is idempotent. It accepts only bounded presentation values and never reads credentials or environment files. The MCP server and Apps import the canonical module; the primary Next.js website reaches that same value through root `starter.config.ts`. The website is intentionally light-only and consumes the brand through direct CSS custom properties in `apps/web/app/globals.css`; it does not use a Tailwind mapping. Review light-theme contrast after changing colors; `surfaceDark` remains available to external hosts that consume the portable MCP brand kit.

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

The browser receives the public embed ID, public service origin, and public website origin. Branding changes never move `NUITEE_API_KEY`, model settings, Assistant client credentials, provider identifiers, or raw provider data into the website.

The command deliberately does not rename the package, server ID, tool names, Nuitee connector, state handles, provider limits, fixture carriers, or historical product documents. Those identifiers and security boundaries are not consumer branding.

- Use your own name, short copy, and restrained accent token; keep structural surfaces and text host-neutral.
- `apps/web/src/components/wayfare-mark.tsx` owns the exact Wayline SVG mark. Preserve its `64 × 64` geometry, continuous rounded route path, two endpoint circles, `currentColor` treatment, and accessible wordmark pairing; do not replace it with an angular W, generated raster, airline lookalike, or decorative ambient route motif.
- Let the host-supplied app identity carry the logo. Do not repeat a brand mark inside a compact response widget.
- Keep bundled Host Grotesk for Next.js non-code UI, the compact type scale, and semantic monospace only for code. The website uses the exact light-only Wayfare tokens and does not inherit the operating system's dark preference. Use only the installed Heroicons React package for its functional interface iconography: `24/outline` is the default set, `20/solid` is reserved for compact status emphasis, and icon-only controls retain an accessible name and a 44px target. Do not add another icon library or hand-author a utility SVG. The repository-owned Wayline logo is the sole repository-authored SVG brand-asset exception; unmodified official third-party wordmarks may appear only for truthful identity attribution. MCP App visual changes must follow the same canonical guideline, including its approved host adaptation.

The complete normative system is in the
[Wayfare brand guidelines](brand/wayfare-brand-guidelines.md). Coding agents
must read it before designing, implementing, or reviewing a user-facing change.
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

## Website origin and hosting

Set `NEXT_PUBLIC_SITE_URL` in `apps/web/.env.local` before a production build to
your exact website origin, for example `https://<your-exact-domain>` with the
placeholder replaced. The parser rejects trailing slashes, paths, queries,
fragments, credentials, wildcards, and non-loopback HTTP. Metadata, social URLs,
JSON-LD, robots, and sitemap share this origin. Without it the site uses
`http://localhost:3000`, marks pages noindex, disallows crawling, and emits an
empty sitemap. An explicit local origin is also noindex. Public build variables
must be supplied when building, and changing them requires a rebuild.

This website setting does not change Assistant access. Use the exact-origin
customizer above and separately apply your authorized Noodle hosted
configuration. The template contains no owner-specific canonical redirect;
configure any custom-domain redirects for your own domains.

Fly deployment is optional. `fly.toml` has no app identity; supply your own
`--app` on every command. CI deploys only after its quality gate and only when
the repository variable `ENABLE_FLY_DEPLOY` is exactly `true`, with configured
`FLY_APP`, `FLY_DEPLOY_URL`, public Assistant coordinates, and a secret deploy
token. Forking or merging does not enable deployment. See
[FLY_DEPLOYMENT.md](FLY_DEPLOYMENT.md) for the complete adopter-owned setup.

## Tool descriptions and inputs

Five shared capabilities are created in `src/travel-server.ts` from schemas in `src/flight-schemas.ts`: four model-visible tools plus the App-only selection helper. The public Assistant allowlists the same instances registered for external MCP hosts.

- Keep names intent-shaped and stable.
- Describe one-way/round-trip, price verification, and stop-before-booking boundaries plainly.
- Do not add transport authority such as URL, base URL, path, method, headers, or provider offer ID to an input schema.
- If a new input is required by the official Nuitee contract, add a failing test, validation, request mapping, docs, and bounded output before exposing it.
- The starter uses USD and US as server-owned fallbacks so every host can reach results without provider jargon. The primary guest website may supply an untrusted derived airport-country and selected-currency default when the traveler omitted those facts; explicit traveler text always wins. Preserve the in-memory/no-third-party/no-authorization boundary in [`docs/privacy.md`](privacy.md) when changing this behavior.

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

- Preserve explicit unselected/selected card states and the single result-level primary action: **Verify current fare**.
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

`apps/web/` is the primary guest website and `src/embedded-server.ts` selects the shared server factory's public Assistant mode. The committed allowlist contains only the exact Next.js loopback origins `http://localhost:3000` and `http://localhost:3001`. Before a hosted deployment, configure one real HTTPS origin, decide explicitly whether loopback remains, and follow [EMBEDDED_ASSISTANT.md](EMBEDDED_ASSISTANT.md).

Do not create an embedded-only copy of the flight tools or move model/Nuitee credentials into the browser. The public embed ID is intentionally non-secret; an Assistant client secret is not. If a real identity-bound capability later needs website login and backend session exchange, follow [oauth.md](oauth.md). Do not add a disabled login control or reuse the synthetic identity from `examples/embedded-assistant-host/`.
