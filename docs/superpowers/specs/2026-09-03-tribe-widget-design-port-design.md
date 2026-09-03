# Tribe widget design port — design

Date: 2026-09-03. Branch: `feat/tribe-widget-design-port`, based on
`origin/main` (0c19aea).

Port the widget design language of
[`NoodleSeed-com/tribe-tourism-hotel-mcp`](https://github.com/NoodleSeed-com/tribe-tourism-hotel-mcp)
into this repository's MCP widgets — flights, hotels, and a new map view —
expressed in our own visual identity rather than Tribe's.

## Base state — read this first

This branch is cut from `origin/main`, where **hotels are synthetic and
fixture-only**. The live Nuitée hotel integration lives exclusively on the
unmerged `codex/wayfare-chat-trip-flow` branch, which is currently mid-merge
across roughly forty conflicted files and is not a viable base.

Concretely, on `origin/main`:

- `src/hotel-runtime.ts` and `src/hotel-connectors.ts` **do not exist**.
- `demoHotelSchema` has **no `imageUrl`, no `reviewScore`, no `reviewCount`**.
  It is `dataSource: syntheticDataSourceSchema`, `taxesAndFeesIncluded:
  z.literal(false)`, `illustrativePolicy`.
- No `snaphotelapi.com` CSP entry exists, because nothing loads photography.
- Eight hotel fixtures live in `src/demo-fixtures.ts`.
- `src/views/travel.css` is 2043 lines; `hotel-results.tsx` is 583;
  `flight-results.tsx` is 1066.

Every design decision below is written against that reality. Where a piece
depends on live data we do not yet have, it is specified to **degrade to a
deliberate design rather than a broken one**, and to start working
automatically when the live branch merges.

## Scope

**In scope.** The `src/views/*` MCP widgets: card anatomy, rail behaviour,
elevation, screen model, and a hotel map board. Two schema fields (`lat`,
`lng`) and fixture coordinates.

**Out of scope.** The `apps/web` Next.js chat shell. The reference is a ChatGPT
app with no chat surface of its own — ChatGPT is its chat — so there is no
conversation UI to port. Our Wayfare shell is untouched.

**Not adopted.** Tailwind, `@alpic-ai/ui`, `lucide-react`, Skybridge, and the
Tribe blue palette. We take the reference's *form*, not its stack.

## Reference inventory

| Reference | Ours |
| --- | --- |
| `src/views/flights.tsx` — boarding-pass card, snap rail | `src/views/flight-results.tsx` restyle |
| `src/views/plan-stays.tsx` — `shortlist`/`details`/`rooms`/`compare`/`checkout` | `src/views/hotel-results.tsx` screen model |
| `plan-stays.tsx` — `BoardView`, `MapBoard`, `MapMarkers`, `FallbackMap`, `HotelRail`, `MapDetailCard` | new `src/views/hotel-map-board.tsx` |
| `src/lib/mapbox-loader.ts` — CDN loader | new `src/views/mapbox-loader.ts` |
| `src/index.css` — Tailwind theme, marker/pin/fallback CSS | new token layer in `src/views/travel.css` |
| `TribeFitRing`, `TribeFitDetail` | reworked as **Stay match** (see below) |

The reference's `docs/ui-ux-vision.md` states the governing principle we adopt:
*conversation is the input, the widget is the output* — the widget renders
decisions and never builds input forms. Our widgets already follow this.

## Visual identity

Every Tribe accent maps to our existing widget tokens. Tribe blue `#1570EF`
never appears.

| Role | Tribe | Ours (existing `.cc-app` token) |
| --- | --- | --- |
| Accent | `#1570EF` | `--cc-accent: #14213d` |
| Surface | `#ffffff` | `--cc-surface: #ffffff` |
| Canvas | Tailwind `background` | `--cc-bg: #fbfaf7` |
| Text / muted | `foreground` / `muted-foreground` | `--cc-text` / `--cc-muted` |
| Dark mode | pure black `#000` | `--cc-bg: #061a22` (existing `.cc-theme-dark`) |

New tokens on `.cc-app`, matching the existing `--cc-*` convention:

```
--cc-radius-card: 16px;
--cc-shadow-card: 0 1px 2px rgb(25 32 43 / 0.04), 0 1px 3px rgb(25 32 43 / 0.06);
--cc-shadow-card-hover: 0 8px 24px -6px color-mix(in srgb, var(--cc-accent) 18%, transparent),
                        0 2px 6px rgb(25 32 43 / 0.06);
--cc-good: #1a7f37;   /* deepened from Tribe #10961d to hold contrast on cream */
--cc-rail-gap: 14px;
```

`--cc-good` is darkened relative to the reference because our canvas is warm
cream rather than white; `#10961d` on `#fbfaf7` falls below 4.5:1 for the score
pin's small bold numerals.

## Component architecture

Four view modules, so `hotel-results.tsx` does not become another 2000-line
file — the reference's `plan-stays.tsx` is 2086 lines, a boundary worth not
reproducing.

```
src/views/
  travel.css              (+ token layer, rail, card, map, pin styles)
  card-primitives.tsx     NEW  Rail, RailArrow, Badge, ScorePin, MatchRing, Price, PhotoBand
  hotel-results.tsx       screen router + shortlist  (target: < 600 lines)
  hotel-map-board.tsx     NEW  MapBoard, HotelRail, MapDetailCard, FallbackMap
  hotel-compare.tsx       NEW  CompareTray, Compare matrix
  mapbox-loader.ts        NEW  CDN loader + theme style resolution
  flight-results.tsx      FareCard restyle only
```

`card-primitives.tsx` is the only shared dependency between flights and hotels,
and depends on nothing but `travel.css` and our existing `icons.tsx`.

## Phase 1 — foundation, flights, hotel cards

### Rail primitive

The reference repeats its carousel verbatim in three places. We build it once:

- `overflow-x: auto`, `scroll-snap-type: x mandatory`, snap-start children,
  scrollbar hidden on all three engines.
- Overlay circular arrows, `≥ 640px` only, positioned against the card's photo
  band rather than its full height.
- `scrollBy` of `min(clientWidth * 0.9, 320px)`.

Existing `.cc-hotel-carousel-*` rules collapse into this. The current
arrow and peek-slide behaviour is preserved as a modifier class so no existing
browser test regresses.

### Flights — boarding-pass card

`FareCard` takes the reference's anatomy:

```
┌──────────────────────────────────┐
│ (AC) Air Canada       CA$742     │
│      AC 8621 + AC 34    total    │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│  07:15  ──── ✈ ────  19:40       │
│   YYZ                  LIS       │
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
│ ◷ 11h 25m   ⇄ 1 stop   ⛭ Economy │
│ [ Free checked bag ]             │
│ [        Select fare           ] │
└──────────────────────────────────┘
```

The dashed rules above and below the route strip are the boarding-pass cue.
Existing `RouteTimeline` and `CarrierIdentity` are reused unchanged, and
`carrierAccents` is retained — per-carrier accent is a better signal than the
reference's single brand blue, and it is already ours. Round-trip cards keep
their existing taller `--cc-fare-card-size: 19rem`.

Flights are **restyle-only**: no schema, runtime, or connector change.

### Hotels — photo band without photos

```
┌──────────────────────────────┐
│ [+ Compare]              ◖8.9│  ← pin only when reviewScore exists
│      photo band  160px       │
│                              │
├──────────────────────────────┤
│ Tagus Lantern      ★★★★  ◜85◝│
│ Alfama                       │
│ [Illustrative] [Breakfast]   │
│ Wi-Fi · Pool · Terrace       │
│ CA$1,740 total · CA$248/night│
│ [ Details ]        [ Select ]│
└──────────────────────────────┘
```

`PhotoBand` accepts an **optional** `imageUrl`:

- **Absent (every hotel on main):** a deterministic gradient derived from a
  hash of the hotel name, ramped between `--cc-accent` and a warm sand tone,
  with the category glyph centred. Deterministic so a given hotel looks the
  same across renders and turns. It reads as an intentional treatment, not a
  failed image load.
- **Present (once live data lands):** the photograph, `object-fit: cover`,
  lazily loaded, with the gradient beneath as the loading state.

No new schema field and no CSP change on this branch. When the live branch
merges and brings `imageUrl`, the component renders photography with no code
change on our side.

`ScorePin` renders **only** when `reviewScore` is present, which on main is
never. It is built now because the compare matrix and map detail card share it,
and because the live branch supplies the field.

## Phase 2 — map, compare, match ring

### `lat` / `lng`

`demoHotelSchema` gains two optional fields:

```ts
lat: z.number().min(-90).max(90).optional(),
lng: z.number().min(-180).max(180).optional(),
```

Both-or-neither is enforced by a schema refinement — a half-located hotel is not
mappable and would render at the equator. Optional rather than required
because live inventory does return rate-only hotels with no content record.

The eight fixtures in `src/demo-fixtures.ts` receive real coordinates for their
cities, so the map is fully working and testable on main with no credentials.

**Live-data follow-up, not implemented here.** When `codex/wayfare-chat-trip-flow`
merges, `hotel-runtime.ts` should populate these from the `/hotels/rates`
response it already parses. It binds `content` from `response.hotels[]` and
already reads `name`, `address`, `city_name`, `stars` from it; the reference
reads the coordinates from that identical array
(`tribe-ref/src/lib/liteapi.ts:212-213`). The addition is:

```ts
...(number(content.latitude) !== undefined && number(content.longitude) !== undefined
  ? { lat: number(content.latitude), lng: number(content.longitude) }
  : {}),
```

No new endpoint or credential is required for it. This is recorded here so
whoever performs that merge applies it; this branch does not touch a file that
does not exist on its base.

### Map board

A `list | map` segmented toggle appears in the shortlist header only when at
least one hotel is mappable. `MapBoard` renders 340px tall, 480px at ≥680px.

**Mapbox is loaded from CDN, never bundled.** The reference documents that
bundling stalls inside the sandboxed widget iframe
(`mapbox-loader.ts:1-2`), and our widgets run in the same class of sandbox. A
single shared promise resolves `window.mapboxgl`, with an 8s timeout and a
reset-on-failure so a later attempt can retry.

- Markers are DOM elements built imperatively, styled by `.cc-map-marker` — a
  white pill with a rotated-square tail, flipping to `--cc-accent` navy with
  white text when active.
- `fitBounds` with `padding: 54, maxZoom: 13.5` on load; `flyTo` on selection.
- Map style follows `useLayout().theme` — `mapbox/light-v11` or `dark-v11`.
- `ResizeObserver` plus staggered `resize()` calls after load. The reference
  found the container is frequently sized after map init, leaving the canvas at
  partial height.
- Selection starts empty; the detail card appears only once the user picks a
  marker or a rail chip.

**Fallback board.** With no token, or on Mapbox failure or timeout, a CSS-only
board renders: a subtle grid over a tinted gradient, pins positioned by min-max
normalising lat/lng into a 12–88% box. This is a first-class surface, not an
error state.

**Token handling.** `VITE_MAPBOX_TOKEN` is read through `vite.config.ts`
`define` and inlined as a string literal at build time, exactly as the reference
does, because `import.meta.env` can be undefined in the production widget build
and blanks the view. The token is a public, URL-restricted Mapbox `pk.`
publishable token — a client-side identifier by design, not a secret. It is
never logged and never written into generated artifacts.

**CSP.** The hotel view policy in `travel-server.ts` gains the Mapbox origins.
Wildcard subdomains are silently dropped by the host, so each tile host is
listed explicitly:

```
connectDomains:  api.mapbox.com, events.mapbox.com, {a,b,c,d}.tiles.mapbox.com
resourceDomains: api.mapbox.com, events.mapbox.com, {a,b,c,d}.tiles.mapbox.com
```

The flight and home view policies are untouched — only the hotel widget draws a
map.

### Compare

A sticky bottom tray appears once one hotel is marked, showing thumbnails, a
per-hotel remove affordance, and a Compare CTA that enables at two. The compare
screen requests fullscreen and renders a metric matrix — total, per-night,
cancellation, category, amenities, match — with the best cell per row marked,
then one recommendation and the single genuine tradeoff named plainly.

Selection is capped at three; the matrix is unreadable wider than that in an
inline iframe, and the reference's own mobile guidance stacks it anyway. Below
680px the matrix becomes per-hotel vertical sections.

Rows whose source field is absent across all compared hotels are dropped
entirely rather than rendered empty — on main that removes the guest-rating row.

### Stay match ring

The reference's "Tribe Fit" scores group composition, room splits, and
per-traveler mobility from `/data/hotel` facility evidence we do not fetch and
traveler profiles we do not collect. Reproducing the ring on invented inputs
would put a confident number on nothing — exactly the failure the reference's
own "make the reasoning visible" principle warns against.

We compute **Stay match** only from fields the search already returns, and every
breakdown line cites the field it came from:

| Line | Source | Basis | On main |
| --- | --- | --- | --- |
| Price | `staySubtotal` vs. result-set range | position within returned results, not an absolute budget | available |
| Flexibility | `illustrativePolicy` | refundable / non-refundable / provider terms | available |
| Category | `category` | 1–5 star | available |
| Amenities | `amenities` ∩ search context | overlap only, no inference | available |
| Guest rating | `reviewScore`, `reviewCount` | — | **absent**, line omitted |

Rendered as a 40px SVG ring with a count-up animation, expanding on tap to the
cited breakdown. **Lines whose source field is absent are omitted, never
defaulted** — a hotel with no review data shows four lines, not a zero. The
score is normalised across the lines actually present, so the number stays
honest on main and gains a fifth input when live data arrives.

Labelled "Stay match", with a tooltip stating it is computed from the returned
search fields. It is a shortlist-ordering aid, not a quality verdict.

## Phase 3 — rooms and details (specified, deferred)

**Blocked on `codex/wayfare-chat-trip-flow` merging.** Both items operate on
`hotel-connectors.ts` and `hotel-runtime.ts`, neither of which exists on this
base. Specified here so the design is complete; implemented on a follow-up
branch cut after that merge.

### Rooms — no new endpoint

That branch pins `maxRatesPerHotel: 1` and takes the first `roomType` and
`rate` via `.find(Boolean)`. Raising the parameter to 3 and retaining the set
yields genuine bookable room options with their own offer ids and prices, from
a call already made.

This turns the single `roomName` into a bounded `roomOptions` array (max 3),
with `roomName` retained as the first option's name so existing consumers do
not break.

Response size is the risk: that connector caps at 6 MiB and this triples
per-hotel rate payload. The runtime already truncates to ten hotels; room
options are additionally capped at three per hotel and stripped of provider
metadata beyond offer id, name, board, price, and cancellation.

### Details — two new connector operations

Gallery, review sentiment, and featured reviews are not in the rates response.
They require additions to the authenticated `nuitee_hotels_http` connector:

- `hotelContent`: `GET /data/hotel` — images, facilities, sentiment
- `hotelReviews`: `GET /data/reviews?limit=6` — featured reviews

Both `type: 'read'`, both reusing the `NUITEE_API_KEY` secret already bound to
that connector. No new credential.

These payloads are photo-heavy and must not enter `structuredContent`, which the
model reads and which counts against the response cap. They travel widget-only,
fetched on demand when the user opens a details screen, via `useCallTool`
against a `get_hotel_details` data tool carrying no view template — so it swaps
the open widget's state rather than spawning a new transcript card.

## Screen and display-mode model

`useViewState` persists `{ screen, boardView, selectedId, compareIds }` so the
board survives across conversation turns.

| Screen | Trigger | Display mode | Phase |
| --- | --- | --- | --- |
| `shortlist` | search result | inline | 1 |
| `compare` | Compare CTA at ≥2 | fullscreen | 2 |
| `details` | Details button | fullscreen | 3 |
| `rooms` | room selection | fullscreen | 3 |

Navigation rule, adopted from the reference: a widget button swaps state within
the same widget; a new natural-language search renders a fresh board. This stops
a widget silently rewriting its own scroll-up history.

Because phase 3's screens are deferred, the phase-1/2 Details button is
disabled with a "coming with live stays" affordance rather than routing to an
empty screen.

Focus moves to the new screen's heading on every transition — the widget lives
in an iframe and focus would otherwise be stranded.

## Accessibility

- Existing `.cc-app` guarantees preserved: 44px minimum touch targets, `3px`
  focus ring at `--cc-focus`, `outline-offset: 3px`.
- Map markers are real `<button>` elements with `aria-label`, keyboard
  reachable. The thumbnail rail is an equivalent non-map path to every hotel,
  so the map is never the only route to a selection.
- The `list | map` toggle is a labelled radio group, not two loose buttons.
- The reference's `prefers-reduced-motion` block is adopted: ring count-up, card
  entrance, and `flyTo` all reduce to instant.
- Score pin and match ring carry text alternatives; colour is never the sole
  carrier of a score.
- The gradient photo band is `aria-hidden` — it is decoration, and the hotel
  name adjacent to it is the accessible label.
- Hotels without coordinates are named in a line beneath the map, directing to
  the list view, rather than silently vanishing.

## Testing

Test-first per phase, against the existing vitest and
`vitest.browser.config.ts` suites.

| Phase | Coverage |
| --- | --- |
| 1 | `test/widgets.test.tsx` and `test/demo-hotel-widget.test.tsx` — card structure, rail snap/scroll, gradient band determinism for a given name, `ScorePin` omitted when `reviewScore` absent, dashed route strip present; existing `test/demo-brand.test.ts` token assertions still pass |
| 2 | `test/demo-fixtures.test.ts` — fixture coordinates valid; schema round-trip for `lat`/`lng` including the both-or-neither refinement; **map tests in `test/browser/widgets.browser.test.tsx` run against the CSS fallback board only** — no token, no network; compare best-cell selection; compare row dropped when absent across all hotels; match-ring line omission and renormalisation when a source field is absent |
| 3 | `roomOptions` cap and 6 MiB budget; details payload absent from `structuredContent` |

Browser tests must not depend on `VITE_MAPBOX_TOKEN`. CI has no token, and the
fallback board is a real supported surface — asserting against it tests a path
users genuinely hit rather than mocking one they do not.

`noodle validate --json` and `noodle test --json` gate every phase; `noodle
check --json` additionally gates phases touching widgets, per the project's
agent-native loop in `CLAUDE.md`.

## Risks

| Risk | Mitigation |
| --- | --- |
| Mapbox fails, times out, or has no token | CSS fallback board is a first-class surface, not an error state; it is what tests assert |
| CSP wildcard drop silently breaks tiles | Every tile host listed explicitly; verified via `noodle check` |
| Gradient band reads as a broken image | Deterministic per hotel, category glyph centred, tuned as an intentional treatment; reviewed on real fixtures before phase 1 closes |
| `hotel-results.tsx` grows unmanageable | Split into four modules before adding screens, not after |
| Design port diverges from the unmerged live branch | Phase 3 explicitly deferred until that merge; phase 2's live hook documented with the exact patch so it is applied rather than rediscovered |
| "Stay match" reads as an authoritative quality score | Labelled a match aid, every line cites its field, absent fields omitted and the score renormalised rather than defaulted |

## Out of scope, explicitly

- `apps/web` chat shell, hero, composer, and conversation styling.
- The reference's accessibility-evidence model, which depends on per-facility
  data we do not fetch and traveler profiles we do not collect.
- Tribe's checkout handoff to `book.tribetourism.com`; our existing selection
  and verification flow is unchanged.
- Any change to flight data, schemas, or connectors — flights are restyle-only.
- Merging or resolving `codex/wayfare-chat-trip-flow`.
