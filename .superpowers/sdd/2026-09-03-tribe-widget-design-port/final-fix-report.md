# Final fix wave report

Branch: `feat/tribe-widget-design-port`
Base: `807da5c`
Scope: whole-branch code review fix wave (single pass), Tasks 1-5 only. Tasks 6-10 (map, compare, screen model) untouched, as required.

## 1. Category glyph missing from the gradient band

`PhotoBand` (`src/views/card-primitives.tsx`) now takes an optional `glyph?: ReactNode` prop. When there is no `imageUrl`, the glyph — if supplied — renders inside the existing `aria-hidden` `.cc-photo-decor` layer, wrapped in `<span className="cc-photo-glyph">`. The glyph is never rendered alongside a real photo (the `imageUrl ? img : glyph ? span : null` branch is mutually exclusive).

`HotelCard` (`src/views/hotel-results.tsx`) passes `<BedIcon />` as the glyph.

CSS (`src/views/travel.css`):
- `.cc-photo-decor` gained `display: grid; place-items: center;` so whichever child it holds (image or glyph) is centred — this is what actually makes `place-items: center` on `.cc-photo-band` (which was already there but had nothing to centre) do something.
- New `.cc-photo-glyph { color: #fff; opacity: 0.32; }` and `.cc-photo-glyph .cc-icon { width: 30px; height: 30px; }` — low-opacity white watermark, ~30px, per the spec's "category glyph centred" mitigation for "gradient band reads as a broken image."

Tests added (`test/card-primitives.test.tsx`): glyph renders (with `cc-photo-glyph` in markup) when no image; glyph is absent and `<img>` present when `imageUrl` is supplied; no glyph wrapper at all when neither prop is given.

## 2. Fare card sections double-padded

`.cc-app .cc-fare-card`'s own padding is now `clamp(14px, 3vw, 16px) 0` (vertical only) instead of all four sides, and its `≤320px` override is `padding: 12px 0`. The boarding-pass sections (`.cc-fare-top`, `.cc-route-strip`, `.cc-fare-body`) already carried their own horizontal padding and are unaffected. The three retained sections now carry matching horizontal padding:
- `.cc-details` → `padding-inline: 14px` added.
- `.cc-fare-footer` → `padding-inline: 14px` added.
- `.cc-fare-front-summary` → `padding-left: 20px` (the bullet-marker gutter) changed to `padding-inline: 34px 14px` (14px matches the siblings; the existing 20px marker gutter stacks on top of it on the left).

This makes the dashed `.cc-route-strip` rule run full-bleed to the card's own edges, and puts every front-face section's text at the same ~14px inset.

**Consequence I had to chase down and fix beyond the brief's literal wording:** zeroing the card's own horizontal padding also strips it from the *back* face (the "Flight and fare details" flip panel) and from the loading skeleton (`.cc-skeleton-fare`), neither of which previously had any horizontal padding of their own — both relied entirely on the ambient card padding. I restored it directly on each:
- `.cc-fare-back-header`, `.cc-fare-back-route`, `.cc-fare-detail-content` (the three direct children of `.cc-fare-face-back`) each got `padding-inline: clamp(14px, 3vw, 16px)`.
- `.cc-skeleton-fare` got `padding-inline: clamp(14px, 3vw, 16px)`.

I initially tried the simpler fix of putting `padding: 0 clamp(...)` directly on `.cc-fare-face-back` itself, but that broke an existing browser test (`bounds fare chips and swaps to an accessible fare-details face without changing card height`), which asserts `.cc-fare-back-header`'s bounding-box left edge aligns with `.cc-fare-top`'s bounding-box left edge within 1px. `getBoundingClientRect()` reflects an element's own box position (set by its *parent's* padding), not the padding the element sets on itself — so padding the wrapper (`.cc-fare-face-back`) pushed the header's own box in by ~16px while `.cc-fare-top`'s box (whose parent has no padding) stayed flush, a 16px mismatch. Moving the padding down one level, onto each content child directly (mirroring exactly how the front face's `.cc-fare-top`/`.cc-route-strip`/`.cc-fare-body` each own their own inset), fixes both the visual goal and the test. Re-ran `pnpm test:browser` after this correction — passes.

## 3. `line-height: 0` collapses the ring caption

`.cc-ring-cap` now has an explicit `line-height: 1` (in addition to its existing `font-size`), breaking the inherited `line-height: 0` multiplier from `.cc-app .cc-ring-btn`. `.cc-ring-wrap`'s height is the sum of its block children (`.cc-ring` + `.cc-ring-cap`), so this restores the wrap's true reserved height instead of collapsing the caption's line box to 0px.

Test added: `test/browser/hotel-results.browser.test.tsx` (new file, mirrors the existing `insurance-results.browser.test.tsx` pattern) mounts `HotelResultsView` in a real browser and asserts `getComputedStyle(.cc-ring-cap).lineHeight` and its bounding-box height are both `> 0`, and that `.cc-ring-wrap`'s rendered height is strictly greater than `.cc-ring`'s (proving the caption is actually reserved, not just non-zero in isolation).

I couldn't test this at the SSR/unit level (`pnpm test`) because line-height collapse is a real layout computation that jsdom-less `renderToStaticMarkup` can't observe — hence the new browser test file rather than an addition to `card-primitives.test.tsx`.

## 4. Taxes qualifier no longer always visible

`HotelCard` now renders `<small className="cc-price-note">Illustrative subtotal · taxes and fees not included</small>` directly under `<Price ... />`, unconditionally (not gated by `detailsOpen`). The fuller note (`Taxes and fees` / `Not included in subtotal`) inside the "Hotel and rate details" disclosure is untouched.

CSS: new `.cc-price-note { display: block; margin-top: 1px; color: var(--cc-muted); font-size: 0.66rem; }` near `.cc-price`.

Test added (`test/demo-hotel-widget.test.tsx`): asserts `cc-price-note` and the qualifier text are present in the SSR markup, and that they appear *before* `cc-hotel-detail-content` (the collapsed panel) in the markup — i.e. it's standing disclosure, not one-tap-away.

## 5. Task 8/10 dead material removed

- `src/views/icons.tsx`: removed `MapPinIcon`, `ListIcon`, `PlusIcon` (confirmed zero references anywhere via `grep -rn` before removal). Kept `ChevronLeftIcon`/`ChevronRightIcon` (used by `Rail`).
- `src/views/travel.css`: removed the `.cc-app .cc-compare-chip` block (comment + base rule + `[aria-pressed='true']` variants, both light and dark-theme) — its own comment admitted it was unconsumed until Task 10.
- `src/views/travel.css`: removed `.cc-score-pin-sm`.
- `src/views/card-primitives.tsx`: removed the `small` prop from `ScorePin` (it was never passed anywhere — `hotel-results.tsx` calls `<ScorePin score={reviewScore} />` with no `small`). No test asserted `small`/`cc-score-pin-sm`, so nothing to remove there.

**One item beyond the brief's literal list, but a direct consequence of item 8's fix (see below) that I judged was in the same spirit as this item:** fixing item 8's cabin icon swap (`CheckedBagIcon` → `CarryOnIcon`) left `CheckedBagIcon` with zero remaining references anywhere in the codebase — it was only ever used at the one call site item 8 asked me to change. Leaving a now-dead icon export in the same commit that removes three other dead icons seemed like exactly the kind of leftover this item exists to catch, so I removed `CheckedBagIcon` from `icons.tsx` too. Flagging this explicitly in case you'd rather I hadn't gone beyond the enumerated list.

## 6. Selecting a fare deletes the card's elevation

`.cc-app .cc-fare-selected`'s `box-shadow` changed from `inset 4px 0 0 var(--cc-accent)` (replacing) to `inset 4px 0 0 var(--cc-accent), var(--cc-shadow-card)` (additive) — the selected card keeps the same ambient elevation as every unselected card, plus the accent inset.

Test tightened (`test/browser/widgets.browser.test.tsx`, `actually renders the selected-fare accent...`): added `expect(after.boxShadow.endsWith(unselectedBoxShadow)).toBe(true)`, which asserts the *exact* unselected shadow-layer string is still present verbatim, with the inset accent layered in front of it. This fails against the old bare `box-shadow: inset ...` (would equal only the inset layer, not end with the original two-layer card shadow) and passes against the fix.

## 7. `Rail`'s `aria-label` on a role-less div

`card-primitives.tsx`: `Rail`'s scroll container now has `role="group"` alongside its existing `aria-label`.

Test added (`test/card-primitives.test.tsx`): extracts the `<div class="cc-rail" ...>` open tag from the SSR markup via regex and asserts it contains both `role="group"` and `aria-label="Stays"`.

## 8. Misleading fare badge tone and icon

`fareBadgesFor` (`src/views/flight-results.tsx`) now returns `{ label, tone }[]` instead of `string[]`: `isCheapest` → `Cheapest` (tone `good`), `baggage.checked` → `Checked bag` (tone `good`), `fare.family` → tone `muted` (a fare-family name like "Basic Economy" is not inherently a positive attribute). The render call site maps `tone={badge.tone}` instead of a hardcoded `"good"`.

Cabin-class icon in `.cc-fare-meta`: swapped `<CheckedBagIcon />` for `<CarryOnIcon />` (carry-on = travels in the cabin, so it's at least thematically adjacent to "cabin class," and it no longer visually echoes the separate "Checked bag" badge). `CarryOnIcon` existed in `icons.tsx` already but had zero call sites before this change; it's now genuinely used. No new icon was added, per the constraint.

No existing test asserted fare-badge tone classes or the cabin icon specifically (checked `test/widgets.test.tsx` and the browser suite), so nothing needed updating there; `pnpm test`/`pnpm test:browser` both confirm no regression.

## 9. `stay-match.ts` hardcoded `en-CA`

`computeStayMatch(hotel, all, requestedAmenities = [], locale = 'en-CA')` — added `locale` as a fourth parameter with the same default, so existing 2- and 3-arg callers/tests are unaffected. Threaded into `formatAmount(amount, currency, locale)` (was hardcoded to `'en-CA'`) and into `reviewCount.toLocaleString(locale)` (was hardcoded to `'en'`). `HotelCard` now calls `computeStayMatch(hotel, allHotels, undefined, locale)`, passing its existing `locale` prop through.

Tests added:
- `test/stay-match.test.ts`: price-line formatting differs between the default and an explicit `'fr-CA'` locale; omitting the locale argument still matches an explicit `'en-CA'` call (back-compat); review-count formatting honours the passed locale (`fr-CA` groups with a space, not a comma — asserted directly).
- `test/demo-hotel-widget.test.tsx`: renders `HotelResultsView` with a rated hotel at the default locale (contains `1,204`) vs `locale="fr-CA"` (does not contain `1,204`, does contain `204`) — proving the prop threads all the way from the widget's `locale` prop through `HotelCard` into `computeStayMatch`.

## Verification

```
$ pnpm test
 Test Files  16 passed (16)
      Tests  301 passed (301)

$ pnpm test:browser
 Test Files  3 passed (3)
      Tests  20 passed (20)

$ npx noodle validate --json
{"ok":true,"data":{}}
```

Also re-confirmed by hand, per the branch's standing constraints:
- `grep -rli "1570ef" src/` → no hits (the only reference stays the absence-assertion in `test/demo-brand.test.ts`, untouched).
- `git status --porcelain` shows only `src/views/{card-primitives,flight-results,hotel-results,icons,stay-match}.{tsx,ts}`, `src/views/travel.css`, and the four test files (+1 new browser test file) touched — `package.json`, `apps/web/**`, `src/demo-schemas.ts`, `src/demo-fixtures.ts`, and all flight schema/runtime/connector files are untouched.

## Not done / deferred

Nothing from the nine items was skipped. Tasks 6-10 (map, compare, screen model) were not started, per the explicit instruction that they're a deliberate follow-up PR — the `.cc-app .cc-compare-chip` removal in item 5 is the only Task-10-adjacent touch, and it's a *removal*, not new Task 10 work.

## Addendum: residual from re-review — item 2's skeleton fix was inert

A second-pass review caught a real bug in my own item 2 fix: `.cc-skeleton-fare { padding-inline: clamp(14px, 3vw, 16px) }` and `.cc-app .cc-fare-card { padding: clamp(14px, 3vw, 16px) 0 }` both set `padding-left`/`padding-right` on the *same* `<article className="cc-fare-card cc-skeleton-fare">` (`FareCardSkeleton`). At (0,1,0) vs (0,2,0), the qualified card rule's `padding-left/right: 0` always wins regardless of source order — the same specificity trap the branch had already been bitten by four times. Confirmed in a real Chromium computed-style read: `paddingLeft`/`paddingRight` were `0px`; the loading skeleton rendered flush to the card edges.

**Fix** (`src/views/travel.css`): moved the declaration into a new `.cc-app .cc-skeleton-fare { padding-inline: clamp(14px, 3vw, 16px); }` rule — (0,2,0), tying the card rule's specificity — and placed it *after* `.cc-app .cc-fare-card` so it also wins the source-order tiebreak (it originally sat before, at the top of the file, which would have kept it losing even after qualification). The original unqualified `.cc-skeleton-fare` block keeps its non-conflicting properties (`block-size`, `display`, `gap`, `align-content`, `overflow`).

The `≤320px` media query needed the same treatment: it re-declares `.cc-app .cc-fare-card { padding: 12px 0; ... }` (same (0,2,0), later in the file), which would have silently out-ordered my new rule again inside that breakpoint. Added a matching `.cc-app .cc-skeleton-fare { padding-inline: clamp(14px, 3vw, 16px); }` immediately after it inside the same media block.

**Regression test added** (`test/browser/widgets.browser.test.tsx`, `keeps the loading skeleton rows inset from the card edge, not flush`): mounts the loading state in a real browser and asserts `getComputedStyle(.cc-skeleton-fare).paddingLeft`/`paddingRight` are both `> 0`, plus that a skeleton row's left edge sits strictly inside the skeleton's own left edge. A CSS-text assertion would not have caught this — the declaration existed, it just didn't apply.

**Revert-tested**: reverted the qualification (back to bare `.cc-skeleton-fare`) and reran — the new test failed with `expected 0 to be greater than 0`, exactly matching the reviewer's finding. Restored the fix and reran clean.

**Computed value measured** (before restoring, via a temporary probe assertion, at the existing test's 720×1200 viewport): `paddingLeft: 16px`, `paddingRight: 16px` (`clamp(14px, 3vw, 16px)` resolves to its 16px ceiling at that viewport width — `3vw` of 720px = 21.6px, clamped down to 16).

### Re-verification

```
$ pnpm test
 Test Files  16 passed (16)
      Tests  301 passed (301)

$ pnpm test:browser
 Test Files  3 passed (3)
      Tests  21 passed (21)

$ npx noodle validate --json
{"ok":true,"data":{}}
```
