# Tribe Widget Design Port — Phases 1 & 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the `tribe-tourism-hotel-mcp` widget design language — boarding-pass flight cards, photo-led hotel cards, a map board, compare, and a match ring — into `src/views/*`, rendered in our own navy/cream identity.

**Architecture:** A shared token layer and card primitive module in `src/views/`, consumed by both the flight and hotel widgets. The hotel widget grows a two-axis state model (`screen` × `boardView`) persisted through `useViewState`, with the map board and compare screens as separate modules so no single file exceeds ~600 lines. Mapbox GL loads from CDN at runtime with a CSS-only fallback board that is the surface all tests assert against.

**Tech Stack:** TypeScript, React 19 (server-rendered in tests via `renderToStaticMarkup`), Zod v4 schemas, plain CSS custom properties (no Tailwind), Vitest + Vitest browser mode, Noodle Seed CLI.

**Spec:** `docs/superpowers/specs/2026-09-03-tribe-widget-design-port-design.md`

## Global Constraints

- **Palette is fixed.** Tribe blue `#1570EF` must never appear. Every accent derives from the existing `--cc-accent: #14213d` on `--cc-bg: #fbfaf7`. Dark theme keeps the existing `.cc-theme-dark` values (`--cc-bg: #061a22`, `--cc-surface: #0a222c`, `--cc-text: #f3fafc`, `--cc-muted: #b5c7cd`, `--cc-border: #24404a`).
- **No new runtime dependencies.** No Tailwind, no `@alpic-ai/ui`, no `lucide-react`, no Skybridge. Mapbox GL is loaded from CDN at runtime and is never added to `package.json`.
- **No invented data.** A field absent from the schema is omitted from the UI, never defaulted to a placeholder value or a zero.
- **Class prefix is `cc-`.** All new CSS classes follow the existing convention in `src/views/travel.css`.
- **Accessibility floor, already established in `.cc-app`:** 44px minimum touch target on `button`/`summary`, `outline: 3px solid var(--cc-focus)` with `outline-offset: 3px` on `:focus-visible`. New interactive elements inherit these; do not override them.
- **Flights are restyle-only.** No change to flight schemas, runtime, or connectors in any task.
- **`src/hotel-runtime.ts` and `src/hotel-connectors.ts` do not exist on this branch.** They live on the unmerged `codex/wayfare-chat-trip-flow` branch. No task may modify them.
- **Test commands:** `pnpm test` (Vitest, Node) and `pnpm test:browser` (Vitest browser mode). Browser tests must pass with no `VITE_MAPBOX_TOKEN` set.
- **Every task ends with a commit.** Commit messages end with `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

## File Structure

| File | Responsibility | Task |
| --- | --- | --- |
| `src/views/travel.css` | Modify — token layer, rail, card, photo band, ring, map, compare styles | 1, 5, 8, 9 |
| `src/views/icons.tsx` | Modify — add `MapPinIcon`, `ListIcon`, `PlusIcon`, `ChevronLeftIcon`, `ChevronRightIcon` | 2 |
| `src/views/card-primitives.tsx` | Create — `Rail`, `Badge`, `PhotoBand`, `ScorePin`, `Price`, `MatchRing`. Pure React, imports only `icons.js` and `travel.css`. No `helpers.js` import, so tests need no mock. | 2, 5 |
| `src/views/stay-match.ts` | Create — `computeStayMatch()`, pure scoring over `DemoHotel[]` | 4 |
| `src/views/flight-results.tsx` | Modify — `FareCard` boarding-pass restyle only | 3 |
| `src/views/hotel-results.tsx` | Modify — photo-led card, then screen router | 5, 10 |
| `src/views/mapbox-loader.ts` | Create — CDN loader, token, theme style resolution | 7 |
| `src/views/hotel-map-board.tsx` | Create — `MapBoard`, `FallbackMap`, `MapboxMap`, `HotelChipRail`, `MapDetailCard` | 8 |
| `src/views/hotel-compare.tsx` | Create — `CompareTray`, `CompareMatrix` | 9 |
| `src/demo-schemas.ts` | Modify — optional `lat`/`lng` with both-or-neither refinement | 6 |
| `src/demo-fixtures.ts` | Modify — coordinates on the 7 hotel fixtures, threaded through `searchSyntheticHotels` | 6 |
| `src/travel-server.ts` | Modify — Mapbox CSP origins on the demo view policy | 7 |
| `vite.config.ts` | Modify — `define` for `VITE_MAPBOX_TOKEN` / `VITE_MAPBOX_STYLE` | 7 |

---

## Task 1: Design token layer and rail CSS

**Files:**
- Modify: `src/views/travel.css` (append a new section at end of file)
- Test: `test/demo-brand.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties `--cc-radius-card`, `--cc-shadow-card`, `--cc-shadow-card-hover`, `--cc-good`, `--cc-rail-gap` on `.cc-app`. CSS classes `.cc-rail-outer`, `.cc-rail`, `.cc-rail-arrow`, `.cc-rail-arrow-prev`, `.cc-rail-arrow-next`, `.cc-card`.

- [ ] **Step 1: Write the failing test**

Append to `test/demo-brand.test.ts`:

```ts
describe('ported card design tokens', () => {
  const css = readFileSync(new URL('../src/views/travel.css', import.meta.url), 'utf8');

  it('defines the card token layer on .cc-app', () => {
    for (const token of [
      '--cc-radius-card:',
      '--cc-shadow-card:',
      '--cc-shadow-card-hover:',
      '--cc-good:',
      '--cc-rail-gap:',
    ]) {
      expect(css).toContain(token);
    }
  });

  it('never introduces the Tribe brand blue', () => {
    expect(css.toLowerCase()).not.toContain('#1570ef');
  });

  it('derives the card shadow hover tint from the accent token', () => {
    expect(css).toMatch(/--cc-shadow-card-hover:[^;]*var\(--cc-accent\)/);
  });

  it('hides the rail scrollbar on all three engines', () => {
    expect(css).toContain('scrollbar-width: none');
    expect(css).toContain('-ms-overflow-style: none');
    expect(css).toMatch(/\.cc-rail::-webkit-scrollbar\s*\{\s*display:\s*none/);
  });

  it('shows rail arrows only at 640px and up', () => {
    expect(css).toMatch(/@media \(min-width: 640px\)\s*\{\s*\.cc-rail-arrow\s*\{\s*display:\s*grid/);
  });
});
```

Ensure `readFileSync` is imported at the top of the file: `import { readFileSync } from 'node:fs';`

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- demo-brand`
Expected: FAIL — `--cc-radius-card:` not found in travel.css.

- [ ] **Step 3: Write the CSS**

Append to the end of `src/views/travel.css`:

```css
/* ── Ported card design language ───────────────────────────────────────────
   Card, rail, and elevation primitives shared by the flight and hotel
   widgets. Every accent derives from --cc-accent; no new brand colour. */

.cc-app {
  --cc-radius-card: 16px;
  --cc-shadow-card: 0 1px 2px rgb(25 32 43 / 0.04), 0 1px 3px rgb(25 32 43 / 0.06);
  --cc-shadow-card-hover:
    0 8px 24px -6px color-mix(in srgb, var(--cc-accent) 18%, transparent),
    0 2px 6px rgb(25 32 43 / 0.06);
  --cc-good: #1a7f37;
  --cc-rail-gap: 14px;
}

/* Deepened from the reference's #10961d: our canvas is warm cream, where
   that green falls below 4.5:1 for the score pin's small bold numerals. */
.cc-theme-dark {
  --cc-good: #5fc47c;
  --cc-shadow-card: 0 1px 2px rgb(0 0 0 / 0.3), 0 1px 3px rgb(0 0 0 / 0.36);
  --cc-shadow-card-hover:
    0 8px 24px -6px color-mix(in srgb, var(--cc-accent) 34%, transparent),
    0 2px 6px rgb(0 0 0 / 0.36);
}

.cc-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--cc-border) 60%, transparent);
  border-radius: var(--cc-radius-card);
  background: var(--cc-surface);
  box-shadow: var(--cc-shadow-card);
}

.cc-rail-outer {
  position: relative;
}

.cc-rail {
  display: flex;
  gap: var(--cc-rail-gap);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding-bottom: 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.cc-rail::-webkit-scrollbar {
  display: none;
}

.cc-rail > * {
  flex: 0 0 auto;
  scroll-snap-align: start;
}

.cc-rail-arrow {
  position: absolute;
  top: 80px;
  z-index: 10;
  display: none;
  place-items: center;
  width: 36px;
  min-width: 36px;
  height: 36px;
  min-height: 36px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--cc-surface) 92%, transparent);
  color: var(--cc-text);
  box-shadow: 0 2px 8px rgb(25 32 43 / 0.18);
  backdrop-filter: blur(6px);
  transform: translateY(-50%);
}

@media (min-width: 640px) {
  .cc-rail-arrow {
    display: grid;
  }
}

.cc-rail-arrow-prev { left: -6px; }
.cc-rail-arrow-next { right: -6px; }

@media (prefers-reduced-motion: reduce) {
  .cc-rail {
    scroll-behavior: auto;
  }
}
```

Note the `.cc-rail-arrow` overrides `min-width`/`min-height` to 36px. The global `.cc-app button { min-height: 44px; min-width: 44px }` rule would otherwise make the overlay arrows too large for the card gutter. This is the one deliberate exception; the arrows duplicate scroll behaviour that is already reachable by keyboard and touch, so they are not the sole path to any content.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- demo-brand`
Expected: PASS, all 5 new assertions green, and every pre-existing assertion in the file still green.

- [ ] **Step 5: Commit**

```bash
git add src/views/travel.css test/demo-brand.test.ts
git commit -m "feat(views): add card and rail design tokens"
```

---

## Task 2: Card primitives module

**Files:**
- Create: `src/views/card-primitives.tsx`
- Modify: `src/views/icons.tsx`
- Test: `test/card-primitives.test.tsx` (create)

**Interfaces:**
- Consumes: `.cc-card`, `.cc-rail*` from Task 1.
- Produces:
  - `Rail({ ariaLabel, children }: { ariaLabel: string; children: ReactNode })`
  - `Badge({ tone, children }: { tone?: 'brand' | 'good' | 'muted'; children: ReactNode })`
  - `PhotoBand({ name, imageUrl, height, children }: { name: string; imageUrl?: string; height?: number; children?: ReactNode })`
  - `ScorePin({ score, small }: { score?: number; small?: boolean })` — renders `null` when `score` is `undefined`
  - `Price({ total, perNight, currency, locale }: { total: number; perNight: number; currency: string; locale: string })`
  - `gradientForName(name: string): string` — exported for test
  - New icons from `icons.js`: `MapPinIcon`, `ListIcon`, `PlusIcon`, `ChevronLeftIcon`, `ChevronRightIcon`

- [ ] **Step 1: Write the failing test**

Create `test/card-primitives.test.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  Badge,
  PhotoBand,
  Price,
  Rail,
  ScorePin,
  gradientForName,
} from '../src/views/card-primitives.js';

describe('gradientForName', () => {
  it('is deterministic for the same name', () => {
    expect(gradientForName('Tagus Lantern Hotel')).toBe(gradientForName('Tagus Lantern Hotel'));
  });

  it('differs between hotels', () => {
    expect(gradientForName('Tagus Lantern Hotel')).not.toBe(gradientForName('Alfama Cloud House'));
  });

  it('produces a css linear-gradient', () => {
    expect(gradientForName('Rainlight Vancouver')).toMatch(/^linear-gradient\(/);
  });
});

describe('ScorePin', () => {
  it('renders nothing when no score is supplied', () => {
    expect(renderToStaticMarkup(<ScorePin />)).toBe('');
  });

  it('renders the score with a text alternative when supplied', () => {
    const html = renderToStaticMarkup(<ScorePin score={8.9} />);
    expect(html).toContain('8.9');
    expect(html).toContain('Guest rating 8.9 out of 10');
  });
});

describe('PhotoBand', () => {
  it('paints the deterministic gradient when no image is available', () => {
    const html = renderToStaticMarkup(<PhotoBand name="Tagus Lantern Hotel" />);
    expect(html).toContain('linear-gradient(');
    expect(html).not.toContain('<img');
  });

  it('renders the image when one is supplied, keeping the gradient beneath', () => {
    const html = renderToStaticMarkup(
      <PhotoBand name="Tagus Lantern Hotel" imageUrl="https://snaphotelapi.com/a.jpg" />,
    );
    expect(html).toContain('<img');
    expect(html).toContain('https://snaphotelapi.com/a.jpg');
    expect(html).toContain('linear-gradient(');
  });

  it('is decoration, so it is hidden from assistive technology', () => {
    expect(renderToStaticMarkup(<PhotoBand name="X" />)).toContain('aria-hidden="true"');
  });
});

describe('Price', () => {
  it('shows total and per-night in the given currency', () => {
    const html = renderToStaticMarkup(
      <Price total={1716} perNight={286} currency="CAD" locale="en-CA" />,
    );
    expect(html).toContain('1,716');
    expect(html).toContain('286');
  });
});

describe('Rail', () => {
  it('labels the scroll region and renders both arrows', () => {
    const html = renderToStaticMarkup(<Rail ariaLabel="Stays"><div>card</div></Rail>);
    expect(html).toContain('aria-label="Stays"');
    expect(html).toContain('cc-rail-arrow-prev');
    expect(html).toContain('cc-rail-arrow-next');
  });
});

describe('Badge', () => {
  it('applies the tone modifier class', () => {
    expect(renderToStaticMarkup(<Badge tone="good">Flexible</Badge>)).toContain('cc-badge-good');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- card-primitives`
Expected: FAIL — cannot resolve `../src/views/card-primitives.js`.

- [ ] **Step 3a: Add the new icons**

Append to `src/views/icons.tsx`:

```tsx
export const MapPinIcon = (props: IconProps) => <Icon {...props}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></Icon>;
export const ListIcon = (props: IconProps) => <Icon {...props}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></Icon>;
export const PlusIcon = (props: IconProps) => <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>;
export const ChevronLeftIcon = (props: IconProps) => <Icon {...props}><path d="m14 6-6 6 6 6" /></Icon>;
export const ChevronRightIcon = (props: IconProps) => <Icon {...props}><path d="m10 6 6 6-6 6" /></Icon>;
```

- [ ] **Step 3b: Write the primitives module**

Create `src/views/card-primitives.tsx`:

```tsx
import { useRef, type ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons.js';

/**
 * Deterministic gradient for a hotel with no photograph.
 *
 * Main has no hotel imagery, so this is the band every card shows there. It
 * must look like a deliberate treatment rather than a failed image load, and
 * it must be stable — the same hotel looks the same across renders and turns.
 * The ramp runs from the brand navy through to a warm sand, staying inside the
 * widget palette.
 */
export function gradientForName(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  const angle = 120 + (hash % 90);
  const lift = 6 + ((hash >> 8) % 14);
  const warmHue = 28 + ((hash >> 16) % 18);
  const warmLight = 58 + ((hash >> 4) % 10);
  return `linear-gradient(${angle}deg, hsl(219 51% ${14 + lift}%) 0%, hsl(213 34% ${30 + lift}%) 46%, hsl(${warmHue} 34% ${warmLight}%) 100%)`;
}

export function PhotoBand({
  name,
  imageUrl,
  height = 152,
  children,
}: {
  readonly name: string;
  readonly imageUrl?: string;
  readonly height?: number;
  readonly children?: ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className="cc-photo-band"
      style={{ background: gradientForName(name), height: `${height}px` }}
    >
      {imageUrl ? <img alt="" className="cc-photo-image" loading="lazy" src={imageUrl} /> : null}
      {children}
    </div>
  );
}

export function ScorePin({ score, small = false }: { readonly score?: number; readonly small?: boolean }) {
  if (score === undefined) return null;
  const rounded = Math.round(score * 10) / 10;
  return (
    <span className={`cc-score-pin${small ? ' cc-score-pin-sm' : ''}`}>
      <span aria-hidden="true">{rounded.toFixed(1)}</span>
      <span className="cc-visually-hidden">Guest rating {rounded.toFixed(1)} out of 10</span>
    </span>
  );
}

export function Badge({
  tone = 'brand',
  children,
}: {
  readonly tone?: 'brand' | 'good' | 'muted';
  readonly children: ReactNode;
}) {
  return <span className={`cc-badge cc-badge-${tone}`}>{children}</span>;
}

export function Price({
  total,
  perNight,
  currency,
  locale,
}: {
  readonly total: number;
  readonly perNight: number;
  readonly currency: string;
  readonly locale: string;
}) {
  const format = (amount: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${Math.round(amount)}`;
    }
  };
  return (
    <p className="cc-price">
      <strong>{format(total)}</strong>
      <span> total · {format(perNight)}/night</span>
    </p>
  );
}

export function Rail({ ariaLabel, children }: { readonly ariaLabel: string; readonly children: ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) => {
    const element = railRef.current;
    if (!element) return;
    element.scrollBy({
      left: direction * Math.min(element.clientWidth * 0.9, 320),
      behavior: 'smooth',
    });
  };
  return (
    <div className="cc-rail-outer">
      <div aria-label={ariaLabel} className="cc-rail" ref={railRef} tabIndex={0}>
        {children}
      </div>
      <button
        aria-label="Scroll left"
        className="cc-rail-arrow cc-rail-arrow-prev"
        onClick={() => scroll(-1)}
        type="button"
      >
        <ChevronLeftIcon />
      </button>
      <button
        aria-label="Scroll right"
        className="cc-rail-arrow cc-rail-arrow-next"
        onClick={() => scroll(1)}
        type="button"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}
```

- [ ] **Step 3c: Add the primitives CSS**

Append to `src/views/travel.css`:

```css
/* ── Photo band, score pin, badges, price ─────────────────────────────────── */
.cc-photo-band {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.cc-photo-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cc-score-pin {
  position: absolute;
  right: 9px;
  top: 9px;
  z-index: 2;
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 18px 56px 56px;
  background: var(--cc-good);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  box-shadow: 0 6px 14px color-mix(in srgb, var(--cc-good) 34%, transparent);
}

.cc-theme-dark .cc-score-pin { color: #04141b; }
.cc-score-pin-sm { width: 26px; height: 26px; right: 6px; top: 6px; font-size: 0.7rem; }

.cc-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  background: color-mix(in srgb, var(--cc-accent) 9%, var(--cc-surface));
  color: var(--cc-accent);
}

.cc-theme-dark .cc-badge { background: color-mix(in srgb, var(--cc-accent) 20%, transparent); }
.cc-badge-good { background: color-mix(in srgb, var(--cc-good) 12%, var(--cc-surface)); color: var(--cc-good); }
.cc-badge-muted { background: color-mix(in srgb, var(--cc-text) 6%, var(--cc-surface)); color: var(--cc-muted); }

.cc-price { margin-top: auto; padding-top: 3px; }
.cc-price strong { font-size: 1rem; font-weight: 700; letter-spacing: -0.015em; }
.cc-price span { font-size: 0.72rem; color: var(--cc-muted); }
```

Check whether `.cc-visually-hidden` already exists in `travel.css` (it is used by `hotel-results.tsx`). If it does not, add:

```css
.cc-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- card-primitives`
Expected: PASS, all 11 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/views/card-primitives.tsx src/views/icons.tsx src/views/travel.css test/card-primitives.test.tsx
git commit -m "feat(views): add shared card primitives"
```

---

## Task 3: Flight fare card boarding-pass restyle

**Files:**
- Modify: `src/views/flight-results.tsx` (`FareCard`, ~line 536; `FareCarousel`, ~line 645)
- Modify: `src/views/travel.css`
- Test: `test/widgets.test.tsx`

**Interfaces:**
- Consumes: `Rail`, `Badge` from `card-primitives.js` (Task 2); `.cc-card` from Task 1.
- Produces: no new exports. `FareCard` keeps its existing props exactly: `{ itinerary, pending, searchContext, selected, onSelect }`.

- [ ] **Step 1: Write the failing test**

Append to `test/widgets.test.tsx`, inside the existing top-level `describe` that renders `FlightResultsView`. Reuse whatever fixture builder that file already uses to produce a `SearchOutput`; the assertions below only need the rendered markup string.

```tsx
describe('boarding-pass fare card', () => {
  it('brackets the route strip with dashed rules', () => {
    const html = renderToStaticMarkup(
      <FlightResultsView displayMode="inline" result={sampleSearchOutput} />,
    );
    expect(html).toContain('cc-route-strip');
  });

  it('renders the fare card on the shared card shell', () => {
    const html = renderToStaticMarkup(
      <FlightResultsView displayMode="inline" result={sampleSearchOutput} />,
    );
    expect(html).toMatch(/class="[^"]*cc-card[^"]*cc-fare-card/);
  });

  it('keeps the per-carrier accent custom property', () => {
    const html = renderToStaticMarkup(
      <FlightResultsView displayMode="inline" result={sampleSearchOutput} />,
    );
    expect(html).toContain('--cc-carrier-accent');
  });
});
```

If `sampleSearchOutput` is not already a binding in that file, hoist the fixture the existing tests build into a module-level `const sampleSearchOutput` and reuse it.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- widgets`
Expected: FAIL — `cc-route-strip` not present in output.

- [ ] **Step 3a: Add the fare card CSS**

Append to `src/views/travel.css`:

```css
/* ── Flight fare card: boarding pass ──────────────────────────────────────── */
.cc-fare-card { width: 296px; }

.cc-fare-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 14px;
}

.cc-fare-price { flex: 0 0 auto; text-align: right; }
.cc-fare-price strong { display: block; font-size: 1rem; font-weight: 700; letter-spacing: -0.015em; }
.cc-fare-price span { font-size: 0.68rem; color: var(--cc-muted); }

/* Dashed rules top and bottom are the boarding-pass cue. */
.cc-route-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px dashed color-mix(in srgb, var(--cc-text) 16%, transparent);
  border-bottom: 1px dashed color-mix(in srgb, var(--cc-text) 16%, transparent);
}

.cc-route-end { text-align: center; }
.cc-route-end strong { display: block; font-size: 1.125rem; font-weight: 700; line-height: 1; letter-spacing: -0.02em; }
.cc-route-end span { font-size: 0.72rem; color: var(--cc-muted); }

.cc-route-mid {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 5px;
  padding: 0 4px;
  color: var(--cc-muted);
}

.cc-route-mid .cc-route-line { flex: 1; height: 1px; background: currentColor; opacity: 0.32; }

.cc-fare-body { display: flex; flex: 1; flex-direction: column; gap: 10px; padding: 12px 14px 14px; }
.cc-fare-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 0.72rem; color: var(--cc-muted); }
.cc-fare-meta span { display: inline-flex; align-items: center; gap: 5px; }
.cc-card-badges { display: flex; flex-wrap: wrap; gap: 6px; }
```

- [ ] **Step 3b: Restyle `FareCard`**

In `src/views/flight-results.tsx`, add to the existing `./card-primitives.js` import (create the import if absent):

```tsx
import { Badge, Rail } from './card-primitives.js';
```

Replace the body of `FareCard` so it renders this structure. Keep the existing `CarrierIdentity`, `carrierAccent`, `money`, `duration`, `stopLabel`, and `itineraryFlightLabel` helpers — they already exist in the file and must not be duplicated. `firstLeg` and `lastLeg` below come from `itinerary.legs`; use the same accessors the current implementation uses to read departure and arrival times and airport codes.

```tsx
<article
  className={`cc-card cc-fare-card ${selected ? 'cc-fare-card-selected' : ''}`}
  style={{ '--cc-carrier-accent': carrierAccent(itinerary.carrier.code) } as CSSProperties}
>
  <div className="cc-fare-top">
    <CarrierIdentity carrier={itinerary.carrier} compact />
    <span className="cc-fare-price">
      <strong>{money(itinerary.price.total, itinerary.price.currency)}</strong>
      <span>total</span>
    </span>
  </div>

  <div className="cc-route-strip">
    <span className="cc-route-end">
      <strong>{flightMoment(firstLeg.departureTime)}</strong>
      <span>{itinerary.route.origin}</span>
    </span>
    <span aria-hidden="true" className="cc-route-mid">
      <span className="cc-route-line" />
      <PlaneIcon />
      <span className="cc-route-line" />
    </span>
    <span className="cc-route-end">
      <strong>{flightMoment(lastLeg.arrivalTime)}</strong>
      <span>{itinerary.route.destination}</span>
    </span>
  </div>

  <div className="cc-fare-body">
    <div className="cc-fare-meta">
      <span><ClockIcon />{duration(itinerary.durationMinutes)}</span>
      <span><RouteIcon />{stopLabel(itinerary.stops)}</span>
      <span><CheckedBagIcon />{itinerary.cabin}</span>
    </div>
    {itinerary.badges?.length ? (
      <div className="cc-card-badges">
        {itinerary.badges.slice(0, 3).map((badge) => (
          <Badge key={badge} tone="good">{badge}</Badge>
        ))}
      </div>
    ) : null}
    {/* Keep the existing details disclosure and Action button exactly as they
        are today — only the wrapper markup above changes. */}
  </div>
</article>
```

Use the property names the file already uses for duration, stops, cabin, and badges; if `itinerary.badges` does not exist in this codebase's `Itinerary` type, omit the badges block entirely rather than inventing the field.

- [ ] **Step 3c: Swap the carousel for the shared rail**

In `FareCarousel`, replace the hand-rolled scroll container and arrow buttons with `<Rail ariaLabel="Flight fares">…</Rail>`, keeping the existing card mapping and any selection state untouched.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- widgets`
Expected: PASS, including every pre-existing assertion in the file.

- [ ] **Step 5: Verify the browser suite still passes**

Run: `pnpm test:browser`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/flight-results.tsx src/views/travel.css test/widgets.test.tsx
git commit -m "feat(views): restyle fare cards as boarding passes"
```

---

## Task 4: Stay match scoring

**Files:**
- Create: `src/views/stay-match.ts`
- Test: `test/stay-match.test.ts` (create)

**Interfaces:**
- Consumes: `DemoHotel` from `../demo-schemas.js`.
- Produces:
  - `type MatchStatus = 'ok' | 'partial'`
  - `interface MatchLine { key: string; label: string; detail: string; status: MatchStatus }`
  - `interface StayMatch { score: number; lines: MatchLine[] }`
  - `computeStayMatch(hotel: DemoHotel, all: readonly DemoHotel[], requested?: readonly string[]): StayMatch`

- [ ] **Step 1: Write the failing test**

Create `test/stay-match.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeStayMatch } from '../src/views/stay-match.js';
import type { DemoHotel } from '../src/demo-schemas.js';

function hotel(overrides: Partial<DemoHotel> = {}): DemoHotel {
  return {
    selectionId: 'hsel_test',
    dataSource: 'illustrative',
    name: 'Test Stay',
    city: 'Lisbon',
    countryCode: 'PT',
    neighborhood: 'Baixa concept district',
    description: 'An illustrative stay.',
    roomName: 'Test room',
    category: 4,
    amenities: ['Wi-Fi', 'Breakfast preview'],
    nights: 6,
    rooms: 1,
    nightlyPrice: { amount: 286, currency: 'CAD' },
    staySubtotal: { amount: 1716, currency: 'CAD' },
    taxesAndFeesIncluded: false,
    illustrativePolicy: 'Illustrative flexible terms; no reservation can be created.',
    ...overrides,
  } as DemoHotel;
}

describe('computeStayMatch', () => {
  it('omits the guest-rating line when no review score is present', () => {
    const match = computeStayMatch(hotel(), [hotel()]);
    expect(match.lines.map((line) => line.key)).not.toContain('rating');
  });

  it('includes the guest-rating line when a review score is present', () => {
    const rated = hotel({ reviewScore: 8.9, reviewCount: 1204 } as Partial<DemoHotel>);
    const match = computeStayMatch(rated, [rated]);
    const rating = match.lines.find((line) => line.key === 'rating');
    expect(rating?.detail).toContain('8.9');
  });

  it('scores the cheapest stay in the set highest on price', () => {
    const cheap = hotel({ name: 'Cheap', staySubtotal: { amount: 1428, currency: 'CAD' } });
    const dear = hotel({ name: 'Dear', staySubtotal: { amount: 2064, currency: 'CAD' } });
    const set = [cheap, dear];
    const cheapPrice = computeStayMatch(cheap, set).lines.find((l) => l.key === 'price');
    const dearPrice = computeStayMatch(dear, set).lines.find((l) => l.key === 'price');
    expect(cheapPrice?.status).toBe('ok');
    expect(dearPrice?.status).toBe('partial');
  });

  it('never returns a score outside 0-100', () => {
    const match = computeStayMatch(hotel(), [hotel()]);
    expect(match.score).toBeGreaterThanOrEqual(0);
    expect(match.score).toBeLessThanOrEqual(100);
  });

  it('renormalises so a hotel with no rating is not penalised for the missing field', () => {
    const unrated = hotel();
    const rated = hotel({ reviewScore: 10, reviewCount: 10 } as Partial<DemoHotel>);
    // Identical on every shared dimension, so the unrated hotel must not score
    // lower merely because it has one fewer line.
    expect(computeStayMatch(unrated, [unrated]).score)
      .toBe(computeStayMatch(rated, [rated]).score);
  });

  it('marks amenity overlap partial when a requested amenity is missing', () => {
    const stay = hotel({ amenities: ['Wi-Fi'] });
    const match = computeStayMatch(stay, [stay], ['Wi-Fi', 'Gym']);
    expect(match.lines.find((line) => line.key === 'amenities')?.status).toBe('partial');
  });

  it('reports flexibility from the illustrative policy text', () => {
    const rigid = hotel({ illustrativePolicy: 'Illustrative terms only; no room is held or reserved.' });
    expect(computeStayMatch(rigid, [rigid]).lines.find((l) => l.key === 'flexibility')?.status)
      .toBe('partial');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- stay-match`
Expected: FAIL — cannot resolve `../src/views/stay-match.js`.

- [ ] **Step 3: Write the scoring module**

Create `src/views/stay-match.ts`:

```ts
import type { DemoHotel } from '../demo-schemas.js';

export type MatchStatus = 'ok' | 'partial';

export interface MatchLine {
  readonly key: string;
  readonly label: string;
  readonly detail: string;
  readonly status: MatchStatus;
}

export interface StayMatch {
  readonly score: number;
  readonly lines: readonly MatchLine[];
}

/**
 * Stay match is deliberately NOT the reference's "Tribe Fit".
 *
 * That score reasons about group composition, room splits, and per-traveler
 * mobility from facility evidence this project does not fetch and traveler
 * profiles it does not collect. Reproducing it here would put a confident
 * number on nothing.
 *
 * Every line below cites a field the search actually returned. A line whose
 * source field is absent is omitted, and the score is renormalised across the
 * lines that remain — so a hotel with no review data scores on four
 * dimensions rather than being silently penalised for a fifth it never had.
 */
export function computeStayMatch(
  hotel: DemoHotel,
  all: readonly DemoHotel[],
  requestedAmenities: readonly string[] = [],
): StayMatch {
  const lines: MatchLine[] = [];
  const weights: number[] = [];

  // Price — position within the returned set, never an absolute budget claim.
  const totals = all.map((entry) => entry.staySubtotal.amount);
  const low = Math.min(...totals);
  const high = Math.max(...totals);
  const total = hotel.staySubtotal.amount;
  const priceWeight = high === low ? 1 : 1 - (total - low) / (high - low);
  lines.push({
    key: 'price',
    label: 'Price',
    detail: high === low
      ? `${formatAmount(total, hotel.staySubtotal.currency)} total`
      : `${formatAmount(total, hotel.staySubtotal.currency)} of ${formatAmount(low, hotel.staySubtotal.currency)}–${formatAmount(high, hotel.staySubtotal.currency)}`,
    status: priceWeight >= 0.5 ? 'ok' : 'partial',
  });
  weights.push(priceWeight);

  // Flexibility — read from the policy text the fixture or provider supplied.
  const policy = hotel.illustrativePolicy.toLowerCase();
  const flexible = policy.includes('flexible');
  lines.push({
    key: 'flexibility',
    label: 'Flexibility',
    detail: hotel.illustrativePolicy.replace(/;.*$/, ''),
    status: flexible ? 'ok' : 'partial',
  });
  weights.push(flexible ? 1 : 0.45);

  // Category — 1-5 star, straight from the field.
  const categoryWeight = (hotel.category - 1) / 4;
  lines.push({
    key: 'category',
    label: 'Category',
    detail: `${hotel.category}-star`,
    status: hotel.category >= 4 ? 'ok' : 'partial',
  });
  weights.push(categoryWeight);

  // Guest rating — omitted entirely when the provider returned nothing.
  const reviewScore = (hotel as { reviewScore?: number }).reviewScore;
  const reviewCount = (hotel as { reviewCount?: number }).reviewCount;
  if (reviewScore !== undefined) {
    lines.push({
      key: 'rating',
      label: 'Rating',
      detail: reviewCount === undefined
        ? `${reviewScore.toFixed(1)} guest rating`
        : `${reviewScore.toFixed(1)} from ${reviewCount.toLocaleString('en')} reviews`,
      status: reviewScore >= 8 ? 'ok' : 'partial',
    });
    weights.push(Math.min(1, Math.max(0, reviewScore / 10)));
  }

  // Amenities — overlap only. No inference about what an amenity implies.
  if (requestedAmenities.length > 0) {
    const owned = new Set(hotel.amenities.map((item) => item.toLowerCase()));
    const matched = requestedAmenities.filter((item) => owned.has(item.toLowerCase()));
    const ratio = matched.length / requestedAmenities.length;
    lines.push({
      key: 'amenities',
      label: 'Amenities',
      detail: `${matched.length} of ${requestedAmenities.length} requested`,
      status: ratio === 1 ? 'ok' : 'partial',
    });
    weights.push(ratio);
  } else {
    const ratio = Math.min(1, hotel.amenities.length / 4);
    lines.push({
      key: 'amenities',
      label: 'Amenities',
      detail: `${hotel.amenities.length} listed`,
      status: hotel.amenities.length >= 3 ? 'ok' : 'partial',
    });
    weights.push(ratio);
  }

  const mean = weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
  return { score: Math.round(Math.min(100, Math.max(0, mean * 100))), lines };
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- stay-match`
Expected: PASS, all 7 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/views/stay-match.ts test/stay-match.test.ts
git commit -m "feat(views): compute stay match from returned fields"
```

---

## Task 5: Photo-led hotel card with match ring

**Files:**
- Modify: `src/views/card-primitives.tsx` (add `MatchRing`, `MatchDetail`)
- Modify: `src/views/hotel-results.tsx` (`HotelCard`, ~line 221)
- Modify: `src/views/travel.css`
- Test: `test/demo-hotel-widget.test.tsx`, `test/card-primitives.test.tsx`

**Interfaces:**
- Consumes: `PhotoBand`, `ScorePin`, `Badge`, `Price`, `Rail` (Task 2); `computeStayMatch`, `StayMatch` (Task 4).
- Produces:
  - `MatchRing({ score, size }: { score: number; size?: number })`
  - `MatchDetail({ match, footnote }: { match: StayMatch; footnote?: string })`

- [ ] **Step 1: Write the failing test**

Append to `test/card-primitives.test.tsx`:

```tsx
import { MatchDetail, MatchRing } from '../src/views/card-primitives.js';

describe('MatchRing', () => {
  it('exposes the score as a text alternative, not colour alone', () => {
    const html = renderToStaticMarkup(<MatchRing score={82} />);
    expect(html).toContain('82');
    expect(html).toContain('Stay match 82 out of 100');
  });

  it('draws the arc proportional to the score', () => {
    const full = renderToStaticMarkup(<MatchRing score={100} />);
    const half = renderToStaticMarkup(<MatchRing score={50} />);
    expect(full).not.toBe(half);
  });
});

describe('MatchDetail', () => {
  it('renders one row per supplied line and shows the footnote', () => {
    const html = renderToStaticMarkup(
      <MatchDetail
        footnote="Guest rating omitted — not returned."
        match={{
          score: 82,
          lines: [
            { key: 'price', label: 'Price', detail: 'CA$1,716 total', status: 'ok' },
            { key: 'category', label: 'Category', detail: '4-star', status: 'partial' },
          ],
        }}
      />,
    );
    expect(html).toContain('Price');
    expect(html).toContain('Category');
    expect(html).toContain('Guest rating omitted');
  });
});
```

Append to `test/demo-hotel-widget.test.tsx`:

```tsx
describe('photo-led hotel card', () => {
  it('paints a deterministic band when the hotel has no image', () => {
    const html = renderToStaticMarkup(
      createElement(HotelResultsView, { displayMode: 'inline', result: sampleHotelResult }),
    );
    expect(html).toContain('cc-photo-band');
    expect(html).toContain('linear-gradient(');
  });

  it('omits the score pin when no review score is returned', () => {
    const html = renderToStaticMarkup(
      createElement(HotelResultsView, { displayMode: 'inline', result: sampleHotelResult }),
    );
    expect(html).not.toContain('cc-score-pin');
  });

  it('renders a stay match ring per hotel', () => {
    const html = renderToStaticMarkup(
      createElement(HotelResultsView, { displayMode: 'inline', result: sampleHotelResult }),
    );
    expect(html).toContain('Stay match');
  });
});
```

Reuse the `sampleHotelResult` fixture the file already builds; hoist it to module level if it is currently inline.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- card-primitives demo-hotel-widget`
Expected: FAIL — `MatchRing` is not exported.

- [ ] **Step 3a: Add `MatchRing` and `MatchDetail`**

Append to `src/views/card-primitives.tsx`:

```tsx
import type { StayMatch } from './stay-match.js';

export function MatchRing({ score, size = 42 }: { readonly score: number; readonly size?: number }) {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circumference;
  return (
    <span className="cc-ring-wrap">
      <svg className="cc-ring" height={size} role="img" viewBox={`0 0 ${size} ${size}`} width={size}>
        <title>Stay match {score} out of 100</title>
        <circle className="cc-ring-track" cx={size / 2} cy={size / 2} fill="none" r={radius} strokeWidth="4" />
        <circle
          className="cc-ring-fill"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          strokeDasharray={`${filled.toFixed(1)} ${circumference.toFixed(1)}`}
          strokeWidth="4"
        />
        <text className="cc-ring-num" textAnchor="middle" x={size / 2} y={size / 2 + 4.5}>
          {score}
        </text>
      </svg>
      <span className="cc-ring-cap">match</span>
    </span>
  );
}

export function MatchDetail({ match, footnote }: { readonly match: StayMatch; readonly footnote?: string }) {
  return (
    <div className="cc-match-detail">
      <p className="cc-match-head">Stay match {match.score}</p>
      {match.lines.map((line) => (
        <p className="cc-match-line" key={line.key}>
          <span className={`cc-match-status cc-match-status-${line.status}`}>
            {line.status === 'ok' ? '✓' : '~'}
          </span>
          <span className="cc-match-label">{line.label}</span>
          <span className="cc-match-value">{line.detail}</span>
        </p>
      ))}
      {footnote ? <p className="cc-match-foot">{footnote}</p> : null}
    </div>
  );
}
```

- [ ] **Step 3b: Add the ring CSS**

Append to `src/views/travel.css`:

```css
/* ── Stay match ring ──────────────────────────────────────────────────────── */
.cc-ring-wrap { display: inline-block; flex: 0 0 auto; text-align: center; }
.cc-ring { display: block; }
.cc-ring-track { stroke: color-mix(in srgb, var(--cc-text) 11%, transparent); }
.cc-ring-fill { stroke: var(--cc-accent); stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%; }
.cc-ring-num { fill: var(--cc-text); font-size: 0.8rem; font-weight: 700; }
.cc-ring-cap { display: block; margin-top: 1px; font-size: 0.53rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--cc-muted); }

.cc-match-detail {
  display: grid;
  gap: 7px;
  padding: 11px 13px 13px;
  border-top: 1px solid var(--cc-border);
  background: color-mix(in srgb, var(--cc-text) 3%, var(--cc-surface));
}

.cc-match-head { font-size: 0.75rem; font-weight: 700; }
.cc-match-line { display: grid; grid-template-columns: 15px 70px 1fr; gap: 8px; align-items: baseline; font-size: 0.72rem; }
.cc-match-status { font-weight: 700; }
.cc-match-status-ok { color: var(--cc-good); }
.cc-match-status-partial { color: #a8730f; }
.cc-theme-dark .cc-match-status-partial { color: #e0b06a; }
.cc-match-label { font-weight: 600; color: var(--cc-muted); }
.cc-match-value { color: var(--cc-text); }
.cc-match-foot { padding-top: 7px; border-top: 1px dashed var(--cc-border); font-size: 0.66rem; color: var(--cc-muted); }

/* ── Hotel card ───────────────────────────────────────────────────────────── */
.cc-hotel-card { width: 268px; }
.cc-hotel-body { display: flex; flex: 1; flex-direction: column; gap: 7px; padding: 12px 13px 14px; }
.cc-hotel-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.cc-hotel-hood { font-size: 0.75rem; color: var(--cc-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-hotel-amenity-line { font-size: 0.72rem; color: var(--cc-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-hotel-actions { display: flex; gap: 8px; padding-top: 3px; }
.cc-hotel-actions > * { flex: 1; }

.cc-compare-chip {
  position: absolute;
  left: 9px;
  top: 9px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  min-width: 0;
  padding: 5px 10px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, #fff 90%, transparent);
  color: #14213d;
  font-size: 0.68rem;
  font-weight: 700;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.2);
  backdrop-filter: blur(4px);
}

.cc-compare-chip[aria-pressed='true'] { background: var(--cc-accent); color: #fff; }
.cc-theme-dark .cc-compare-chip[aria-pressed='true'] { color: #04141b; }
```

The `.cc-compare-chip` overrides the global 44px button minimum for the same reason as the rail arrows: it is an overlay affordance on a photo band, and the same compare toggle is reachable at full size from the compare tray in Task 9.

- [ ] **Step 3c: Restyle `HotelCard`**

In `src/views/hotel-results.tsx`, import the primitives and scorer:

```tsx
import { Badge, MatchDetail, MatchRing, PhotoBand, Price, Rail, ScorePin } from './card-primitives.js';
import { computeStayMatch } from './stay-match.js';
```

Rewrite `HotelCard` to accept an added `allHotels` prop and render:

```tsx
function HotelCard({ hotel, allHotels, locale, selected, pending, onAdd }: {
  readonly hotel: DemoHotel;
  readonly allHotels: readonly DemoHotel[];
  readonly locale: string;
  readonly selected: boolean;
  readonly pending: boolean;
  readonly onAdd?: (selectionId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const match = computeStayMatch(hotel, allHotels);
  const reviewScore = (hotel as { reviewScore?: number }).reviewScore;
  const imageUrl = (hotel as { imageUrl?: string }).imageUrl;
  const flexible = hotel.illustrativePolicy.toLowerCase().includes('flexible');

  return (
    <article className={`cc-card cc-hotel-card ${selected ? 'cc-hotel-card-selected' : ''}`}>
      <PhotoBand imageUrl={imageUrl} name={hotel.name}>
        <ScorePin score={reviewScore} />
      </PhotoBand>
      <div className="cc-hotel-body">
        <div className="cc-hotel-title-row">
          <div>
            <h3>{hotel.name}</h3>
            <span className="cc-hotel-category" aria-label={`${hotel.category} out of 5 concept category`}>
              <StarIcon />{hotel.category}/5
            </span>
          </div>
          <button
            aria-controls={detailsId}
            aria-expanded={open}
            className="cc-ring-btn"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <MatchRing score={match.score} />
          </button>
        </div>
        <p className="cc-hotel-hood">{hotel.neighborhood} · {hotel.city}, {hotel.countryCode}</p>
        <div className="cc-card-badges">
          <Badge tone={flexible ? 'good' : 'muted'}>
            {flexible ? 'Flexible terms' : 'Terms only'}
          </Badge>
          <Badge tone="muted">Illustrative</Badge>
        </div>
        <p className="cc-hotel-amenity-line">{hotel.amenities.slice(0, 3).join(' · ')}</p>
        <Price
          currency={hotel.staySubtotal.currency}
          locale={locale}
          perNight={hotel.nightlyPrice.amount}
          total={hotel.staySubtotal.amount}
        />
        <div className="cc-hotel-actions">
          <Action disabled title="Arrives with live stays" variant="secondary">Details</Action>
          {onAdd ? (
            <Action
              aria-label={`Add ${hotel.name} to trip`}
              aria-pressed={selected}
              disabled={selected}
              onClick={() => onAdd(hotel.selectionId)}
              pending={pending}
              pendingLabel="Adding…"
              variant={selected ? 'secondary' : 'primary'}
            >
              {selected ? 'Added' : 'Select'}
            </Action>
          ) : null}
        </div>
      </div>
      {open ? (
        <div id={detailsId}>
          <MatchDetail
            footnote={reviewScore === undefined
              ? 'Computed from returned search fields. Guest rating omitted — not returned.'
              : 'Computed from returned search fields.'}
            match={match}
          />
        </div>
      ) : null}
    </article>
  );
}
```

Update the call site that maps hotels into cards to pass `allHotels={result.hotels}`, and wrap that mapping in `<Rail ariaLabel="Stays">`.

Add `.cc-ring-btn { border: 0; background: none; padding: 0; min-height: 0; min-width: 0; line-height: 0; }` to `travel.css`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- card-primitives demo-hotel-widget`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: PASS. If pre-existing hotel-widget assertions reference removed markup (`cc-hotel-visual`, `cc-hotel-face-front`, `cc-hotel-details-toggle`), update those assertions to the new structure — they are testing presentation that this task intentionally replaces.

- [ ] **Step 6: Commit**

```bash
git add src/views/card-primitives.tsx src/views/hotel-results.tsx src/views/travel.css test/card-primitives.test.tsx test/demo-hotel-widget.test.tsx
git commit -m "feat(views): make hotel cards photo-led with a match ring"
```

---

## Task 6: Hotel coordinates

**Files:**
- Modify: `src/demo-schemas.ts` (`demoHotelSchema`, ~line 65)
- Modify: `src/demo-fixtures.ts` (`HotelFixture` type ~line 60, `DEMO_HOTEL_CATALOG` ~line 77, `searchSyntheticHotels` ~line 504)
- Test: `test/demo-fixtures.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `DemoHotel.lat?: number`, `DemoHotel.lng?: number`. Both present or both absent, enforced by schema refinement.

- [ ] **Step 1: Write the failing test**

Append to `test/demo-fixtures.test.ts`:

```ts
describe('hotel coordinates', () => {
  it('gives every hotel fixture a mappable coordinate pair', () => {
    for (const fixtures of Object.values(DEMO_HOTEL_CATALOG)) {
      for (const fixture of fixtures) {
        expect(typeof fixture.lat).toBe('number');
        expect(typeof fixture.lng).toBe('number');
        expect(fixture.lat).toBeGreaterThanOrEqual(-90);
        expect(fixture.lat).toBeLessThanOrEqual(90);
        expect(fixture.lng).toBeGreaterThanOrEqual(-180);
        expect(fixture.lng).toBeLessThanOrEqual(180);
      }
    }
  });

  it('threads coordinates through a synthetic search', () => {
    const output = searchSyntheticHotels({
      destination: 'Lisbon',
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-07',
      adults: 2,
      children: 0,
      rooms: 1,
      currency: 'CAD',
    });
    expect(output.hotels.length).toBeGreaterThan(0);
    for (const hotel of output.hotels) {
      expect(typeof hotel.lat).toBe('number');
      expect(typeof hotel.lng).toBe('number');
    }
  });

  it('rejects a hotel carrying only one half of a coordinate pair', () => {
    const base = searchSyntheticHotels({
      destination: 'Lisbon',
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-07',
      adults: 2,
      children: 0,
      rooms: 1,
      currency: 'CAD',
    }).hotels[0];
    expect(() => demoHotelSchema.parse({ ...base, lng: undefined })).toThrow();
    expect(() => demoHotelSchema.parse({ ...base, lat: undefined })).toThrow();
  });

  it('accepts a hotel with neither coordinate', () => {
    const base = searchSyntheticHotels({
      destination: 'Lisbon',
      checkInDate: '2026-10-01',
      checkOutDate: '2026-10-07',
      adults: 2,
      children: 0,
      rooms: 1,
      currency: 'CAD',
    }).hotels[0];
    const { lat: _lat, lng: _lng, ...withoutCoords } = base;
    expect(() => demoHotelSchema.parse(withoutCoords)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- demo-fixtures`
Expected: FAIL — `fixture.lat` is `undefined`.

- [ ] **Step 3a: Extend the schema**

In `src/demo-schemas.ts`, add to the `demoHotelSchema` object, after `neighborhood`:

```ts
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
```

Then attach the refinement immediately after the `z.object({...})` closing brace, converting the export to:

```ts
export const demoHotelSchema = z.object({
  // ...existing fields, plus lat and lng above...
}).refine(
  ({ lat, lng }) => (lat === undefined) === (lng === undefined),
  {
    path: ['lng'],
    message: 'A hotel needs both coordinates or neither; a half-located hotel is not mappable.',
  },
);
```

- [ ] **Step 3b: Add coordinates to fixtures**

In `src/demo-fixtures.ts`, add to the `HotelFixture` interface:

```ts
  readonly lat: number;
  readonly lng: number;
```

Add to each catalog entry, matching its stated neighborhood:

| Fixture | `lat` | `lng` |
| --- | --- | --- |
| `demo_hotel_tagus_lantern` (Baixa) | `38.7107` | `-9.1365` |
| `demo_hotel_alfama_cloud_house` (Alfama) | `38.7117` | `-9.1300` |
| `demo_hotel_juniper_quay_lisbon` (Riverside) | `38.7050` | `-9.1450` |
| `demo_hotel_cedar_junction` (Harbour) | `43.6390` | `-79.3820` |
| `demo_hotel_harbourglass` (King West) | `43.6445` | `-79.4000` |
| `demo_hotel_pacific_fern` (Vancouver) | `49.2900` | `-123.1230` |
| `demo_hotel_rainlight` (Vancouver) | `49.2760` | `-123.1210` |

If the catalog contains a fixture not listed above, give it a coordinate within its city consistent with its neighborhood label.

- [ ] **Step 3c: Thread them through the search**

In `searchSyntheticHotels`, add to the mapped hotel object, after `neighborhood: fixture.neighborhood,`:

```ts
      lat: fixture.lat,
      lng: fixture.lng,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- demo-fixtures`
Expected: PASS.

- [ ] **Step 5: Verify no other consumer broke**

Run: `pnpm test`
Expected: PASS. `noodle validate --json` must also report `{"ok":true}`:

Run: `pnpm validate -- --json`

- [ ] **Step 6: Commit**

```bash
git add src/demo-schemas.ts src/demo-fixtures.ts test/demo-fixtures.test.ts
git commit -m "feat(hotels): add optional coordinates to stays"
```

---

## Task 7: Mapbox loader, build define, and CSP

**Files:**
- Create: `src/views/mapbox-loader.ts`
- Modify: `vite.config.ts`
- Modify: `src/travel-server.ts` (`demoViewPolicy`, ~line 334)
- Test: `test/mapbox-loader.test.ts` (create), `test/demo-server-contract.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `MAPBOX_TOKEN: string`
  - `MAPBOX_GL_JS_URL`, `MAPBOX_GL_CSS_URL`
  - `mapboxStyleForTheme(theme?: string | null): string`
  - `loadMapboxFromCdn(): Promise<MapboxLike>`
  - Types `MapboxLike`, `MapboxMapLike`, `MapboxMarkerLike`, `MapboxBoundsLike`

- [ ] **Step 1: Write the failing test**

Create `test/mapbox-loader.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAPBOX_GL_JS_URL, mapboxStyleForTheme } from '../src/views/mapbox-loader.js';

describe('mapboxStyleForTheme', () => {
  it('selects the dark style for a dark host theme', () => {
    expect(mapboxStyleForTheme('dark')).toContain('dark');
  });

  it('selects the light style otherwise', () => {
    expect(mapboxStyleForTheme('light')).toContain('light');
    expect(mapboxStyleForTheme(undefined)).toContain('light');
  });
});

describe('MAPBOX_GL_JS_URL', () => {
  it('pins an exact version from the mapbox cdn', () => {
    expect(MAPBOX_GL_JS_URL).toMatch(/^https:\/\/api\.mapbox\.com\/mapbox-gl-js\/v\d+\.\d+\.\d+\//);
  });
});
```

Append to `test/demo-server-contract.test.ts`:

```ts
describe('hotel widget map CSP', () => {
  it('lists every mapbox tile host explicitly, since wildcards are dropped', () => {
    const expected = [
      'https://api.mapbox.com',
      'https://events.mapbox.com',
      'https://a.tiles.mapbox.com',
      'https://b.tiles.mapbox.com',
      'https://c.tiles.mapbox.com',
      'https://d.tiles.mapbox.com',
    ];
    for (const origin of expected) {
      expect(demoViewPolicy.csp.connectDomains).toContain(origin);
      expect(demoViewPolicy.csp.resourceDomains).toContain(origin);
    }
  });

  it('never uses a wildcard subdomain', () => {
    const all = [...demoViewPolicy.csp.connectDomains, ...demoViewPolicy.csp.resourceDomains];
    expect(all.some((origin) => origin.includes('*'))).toBe(false);
  });
});
```

Export `demoViewPolicy` from `src/travel-server.ts` if it is not already exported.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- mapbox-loader demo-server-contract`
Expected: FAIL — cannot resolve `../src/views/mapbox-loader.js`.

- [ ] **Step 3a: Write the loader**

Create `src/views/mapbox-loader.ts`:

```ts
/**
 * Mapbox GL is loaded from the CDN at runtime, never bundled.
 *
 * The reference implementation documents that bundling it stalls inside the
 * sandboxed widget iframe, and our widgets run in the same class of sandbox.
 * A single shared promise resolves window.mapboxgl; a failure clears the
 * promise so a later mount can retry rather than inheriting the rejection.
 */
export const MAPBOX_GL_JS_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
export const MAPBOX_GL_CSS_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';

export interface MapboxBoundsLike {
  extend(lngLat: readonly [number, number]): void;
  isEmpty(): boolean;
}

export interface MapboxMapLike {
  addControl(control: unknown, position?: string): void;
  on(event: 'load' | 'error', handler: () => void): void;
  fitBounds(bounds: MapboxBoundsLike, options: Record<string, unknown>): void;
  flyTo(options: Record<string, unknown>): void;
  getZoom(): number;
  resize(): void;
  remove(): void;
}

export interface MapboxMarkerLike {
  setLngLat(lngLat: readonly [number, number]): MapboxMarkerLike;
  addTo(map: MapboxMapLike): MapboxMarkerLike;
  getElement(): HTMLElement;
  remove(): void;
}

export interface MapboxLike {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => MapboxMapLike;
  Marker: new (options: Record<string, unknown>) => MapboxMarkerLike;
  NavigationControl: new (options: Record<string, unknown>) => unknown;
  LngLatBounds: new () => MapboxBoundsLike;
}

declare global {
  interface Window {
    mapboxgl?: MapboxLike;
  }
}

let pending: Promise<MapboxLike> | null = null;

export function loadMapboxFromCdn(): Promise<MapboxLike> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.mapboxgl) return Promise.resolve(window.mapboxgl);
  if (pending) return pending;

  pending = new Promise<MapboxLike>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('mapbox timed out')), 8000);
    const settleOk = () => {
      window.clearTimeout(timeout);
      if (window.mapboxgl) resolve(window.mapboxgl);
      else reject(new Error('mapbox loaded without window.mapboxgl'));
    };
    const settleFail = () => {
      window.clearTimeout(timeout);
      reject(new Error('mapbox script failed'));
    };

    if (!document.querySelector(`link[href="${MAPBOX_GL_CSS_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MAPBOX_GL_CSS_URL;
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MAPBOX_GL_JS_URL}"]`);
    if (existing) {
      existing.addEventListener('load', settleOk, { once: true });
      existing.addEventListener('error', settleFail, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = MAPBOX_GL_JS_URL;
    script.async = true;
    script.onload = settleOk;
    script.onerror = settleFail;
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    pending = null;
    throw error;
  });

  return pending;
}

// vite.config.ts replaces these exact expressions with string literals at
// build time. Reading import.meta.env at runtime can yield undefined in the
// production widget bundle, which blanks the whole view.
const envToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim();
const envStyle = (import.meta.env.VITE_MAPBOX_STYLE as string | undefined)?.trim();

/** Public, URL-restricted Mapbox pk. token — a client-side identifier, not a secret. */
export const MAPBOX_TOKEN = envToken ?? '';

export function mapboxStyleForTheme(theme?: string | null): string {
  if (envStyle) return envStyle;
  return theme === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11';
}
```

- [ ] **Step 3b: Inline the token at build time**

In `vite.config.ts`, add a `define` block to the exported config. If the file currently uses the object form of `defineConfig`, convert it to the function form:

```ts
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // ...existing config...
    define: {
      'import.meta.env.VITE_MAPBOX_TOKEN': JSON.stringify(
        process.env.VITE_MAPBOX_TOKEN ?? env.VITE_MAPBOX_TOKEN ?? '',
      ),
      'import.meta.env.VITE_MAPBOX_STYLE': JSON.stringify(
        process.env.VITE_MAPBOX_STYLE ?? env.VITE_MAPBOX_STYLE ?? '',
      ),
    },
  };
});
```

Apply the same `define` block to `vitest.browser.config.ts` so browser tests resolve the expression to an empty string rather than failing to parse it.

- [ ] **Step 3c: Add the CSP origins**

In `src/travel-server.ts`, replace `demoViewPolicy` with:

```ts
// Mapbox drops wildcard subdomains such as https://*.mapbox.com, so every
// tile host is listed explicitly. snaphotelapi.com is intentionally absent:
// hotel photography arrives with the live branch, not this one.
const mapboxOrigins = [
  'https://api.mapbox.com',
  'https://events.mapbox.com',
  'https://a.tiles.mapbox.com',
  'https://b.tiles.mapbox.com',
  'https://c.tiles.mapbox.com',
  'https://d.tiles.mapbox.com',
];

export const demoViewPolicy = {
  ...sharedWidgetDomainPolicy,
  csp: {
    connectDomains: [...mapboxOrigins],
    resourceDomains: [...mapboxOrigins],
    frameDomains: [],
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- mapbox-loader demo-server-contract`
Expected: PASS.

- [ ] **Step 5: Validate the server contract**

Run: `pnpm validate -- --json`
Expected: `{"ok":true}`.

- [ ] **Step 6: Commit**

```bash
git add src/views/mapbox-loader.ts vite.config.ts vitest.browser.config.ts src/travel-server.ts test/mapbox-loader.test.ts test/demo-server-contract.test.ts
git commit -m "feat(views): load mapbox from cdn and allow its origins"
```

---

## Task 8: Map board

**Files:**
- Create: `src/views/hotel-map-board.tsx`
- Modify: `src/views/travel.css`
- Test: `test/hotel-map-board.test.tsx` (create), `test/browser/widgets.browser.test.tsx`

**Interfaces:**
- Consumes: `PhotoBand`, `ScorePin`, `Badge`, `Price` (Tasks 2, 5); `MAPBOX_TOKEN`, `loadMapboxFromCdn`, `mapboxStyleForTheme` (Task 7); `DemoHotel.lat`/`lng` (Task 6).
- Produces:
  - `MapBoard({ hotels, locale, theme, selectedId, onSelect, onAdd, selectedSelectionId }: MapBoardProps)`
  - `FallbackMap({ hotels, selectedId, onSelect, locale }: FallbackMapProps)` — exported for test
  - `mappableHotels(hotels: readonly DemoHotel[]): DemoHotel[]` — exported for test

- [ ] **Step 1: Write the failing test**

Create `test/hotel-map-board.test.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FallbackMap, mappableHotels } from '../src/views/hotel-map-board.js';
import type { DemoHotel } from '../src/demo-schemas.js';

function stay(name: string, lat?: number, lng?: number): DemoHotel {
  return {
    selectionId: `hsel_${name}`,
    dataSource: 'illustrative',
    name,
    city: 'Lisbon',
    countryCode: 'PT',
    neighborhood: 'Baixa concept district',
    description: 'An illustrative stay.',
    roomName: 'Room',
    category: 4,
    amenities: ['Wi-Fi'],
    nights: 6,
    rooms: 1,
    nightlyPrice: { amount: 286, currency: 'CAD' },
    staySubtotal: { amount: 1716, currency: 'CAD' },
    taxesAndFeesIncluded: false,
    illustrativePolicy: 'Illustrative flexible terms.',
    ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
  } as DemoHotel;
}

describe('mappableHotels', () => {
  it('keeps only stays carrying both coordinates', () => {
    const all = [stay('A', 38.71, -9.13), stay('B')];
    expect(mappableHotels(all).map((h) => h.name)).toEqual(['A']);
  });
});

describe('FallbackMap', () => {
  const hotels = [
    stay('Tagus Lantern Hotel', 38.7107, -9.1365),
    stay('Alfama Cloud House', 38.7117, -9.13),
    stay('Juniper Quay Lisbon', 38.705, -9.145),
  ];

  it('renders one keyboard-reachable button per stay', () => {
    const html = renderToStaticMarkup(
      <FallbackMap hotels={hotels} locale="en-CA" onSelect={() => {}} />,
    );
    expect(html.match(/cc-map-pin/g)?.length).toBe(3);
    expect(html).toContain('aria-label="Select Tagus Lantern Hotel"');
  });

  it('normalises coordinates inside the 12-88% box', () => {
    const html = renderToStaticMarkup(
      <FallbackMap hotels={hotels} locale="en-CA" onSelect={() => {}} />,
    );
    const percentages = [...html.matchAll(/(?:left|top):\s*([\d.]+)%/g)].map((m) => Number(m[1]));
    expect(percentages.length).toBeGreaterThan(0);
    for (const value of percentages) {
      expect(value).toBeGreaterThanOrEqual(12);
      expect(value).toBeLessThanOrEqual(88);
    }
  });

  it('centres a single stay rather than dividing by a zero span', () => {
    const html = renderToStaticMarkup(
      <FallbackMap hotels={[hotels[0]]} locale="en-CA" onSelect={() => {}} />,
    );
    expect(html).toContain('50%');
    expect(html).not.toContain('NaN');
  });

  it('marks the selected pin', () => {
    const html = renderToStaticMarkup(
      <FallbackMap hotels={hotels} locale="en-CA" onSelect={() => {}} selectedId="hsel_Alfama Cloud House" />,
    );
    expect(html).toContain('data-active="true"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- hotel-map-board`
Expected: FAIL — cannot resolve `../src/views/hotel-map-board.js`.

- [ ] **Step 3a: Write the module**

Create `src/views/hotel-map-board.tsx`. This is the full file:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DemoHotel } from '../demo-schemas.js';
import { Badge, PhotoBand, Price, ScorePin } from './card-primitives.js';
import {
  MAPBOX_TOKEN,
  loadMapboxFromCdn,
  mapboxStyleForTheme,
  type MapboxMapLike,
  type MapboxMarkerLike,
} from './mapbox-loader.js';

type Located = DemoHotel & { readonly lat: number; readonly lng: number };

export function mappableHotels(hotels: readonly DemoHotel[]): Located[] {
  return hotels.filter(
    (hotel): hotel is Located =>
      typeof (hotel as { lat?: unknown }).lat === 'number'
      && typeof (hotel as { lng?: unknown }).lng === 'number',
  );
}

function money(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 })
      .format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

/**
 * The no-token surface, and the one the tests assert against.
 *
 * CI has no Mapbox token, and this board is a real surface users hit — so
 * asserting against it tests a path that genuinely ships rather than mocking
 * one that does not.
 */
export function FallbackMap({
  hotels,
  selectedId,
  onSelect,
  locale,
}: {
  readonly hotels: readonly Located[];
  readonly selectedId?: string;
  readonly onSelect: (selectionId: string) => void;
  readonly locale: string;
}) {
  const lats = hotels.map((hotel) => hotel.lat);
  const lngs = hotels.map((hotel) => hotel.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const position = (hotel: Located) => ({
    left: maxLng === minLng ? '50%' : `${(12 + ((hotel.lng - minLng) / (maxLng - minLng)) * 76).toFixed(2)}%`,
    top: maxLat === minLat ? '50%' : `${(12 + ((maxLat - hotel.lat) / (maxLat - minLat)) * 76).toFixed(2)}%`,
  });

  return (
    <div className="cc-fallback-map">
      <div aria-hidden="true" className="cc-fallback-grid" />
      {hotels.map((hotel) => (
        <button
          aria-label={`Select ${hotel.name}`}
          className="cc-map-pin"
          data-active={hotel.selectionId === selectedId ? 'true' : 'false'}
          key={hotel.selectionId}
          onClick={() => onSelect(hotel.selectionId)}
          style={position(hotel)}
          type="button"
        >
          {money(hotel.staySubtotal.amount, hotel.staySubtotal.currency, locale)}
        </button>
      ))}
    </div>
  );
}

type MapStatus = 'idle' | 'loading' | 'ready' | 'failed';

function buildMarkerElement(
  hotel: Located,
  active: boolean,
  locale: string,
  onClick: () => void,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'cc-map-marker';
  wrapper.dataset.active = active ? 'true' : 'false';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cc-map-marker-inner';
  button.textContent = money(hotel.staySubtotal.amount, hotel.staySubtotal.currency, locale);
  button.setAttribute('aria-label', `Select ${hotel.name}`);
  button.addEventListener('click', onClick);
  wrapper.appendChild(button);
  return wrapper;
}

function MapCanvas({
  hotels,
  selectedId,
  onSelect,
  theme,
  locale,
}: {
  readonly hotels: readonly Located[];
  readonly selectedId?: string;
  readonly onSelect: (selectionId: string) => void;
  readonly theme: 'light' | 'dark';
  readonly locale: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMapLike | null>(null);
  const markersRef = useRef(new globalThis.Map<string, MapboxMarkerLike>());
  const [status, setStatus] = useState<MapStatus>('idle');

  const geoKey = useMemo(
    () => hotels.map((hotel) => `${hotel.selectionId}:${hotel.lat},${hotel.lng}`).join('|'),
    [hotels],
  );
  const canUseMapbox = Boolean(MAPBOX_TOKEN) && hotels.length > 0 && status !== 'failed';
  const ready = canUseMapbox && status === 'ready';

  useEffect(() => { setStatus('idle'); }, [geoKey]);

  useEffect(() => {
    if (!canUseMapbox || !containerRef.current) return undefined;
    let cancelled = false;
    let timeout: number | undefined;
    let observer: ResizeObserver | undefined;
    setStatus('loading');

    void (async () => {
      const mapboxgl = await loadMapboxFromCdn();
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: mapboxStyleForTheme(theme),
        center: [hotels[0].lng, hotels[0].lat],
        zoom: 11,
        projection: 'mercator',
        attributionControl: true,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      timeout = window.setTimeout(() => { if (!cancelled) setStatus('failed'); }, 9000);

      map.on('load', () => {
        if (cancelled) return;
        if (timeout) window.clearTimeout(timeout);
        const bounds = new mapboxgl.LngLatBounds();
        for (const hotel of hotels) {
          const lngLat: [number, number] = [hotel.lng, hotel.lat];
          bounds.extend(lngLat);
          const marker = new mapboxgl.Marker({
            element: buildMarkerElement(
              hotel,
              hotel.selectionId === selectedId,
              locale,
              () => onSelect(hotel.selectionId),
            ),
            anchor: 'bottom',
          }).setLngLat(lngLat).addTo(map);
          markersRef.current.set(hotel.selectionId, marker);
        }
        if (hotels.length > 1 && !bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 54, maxZoom: 13.5, duration: 0 });
        }
        setStatus('ready');
        // The container is frequently sized after init, leaving the canvas at
        // partial height with the board background showing through.
        map.resize();
        requestAnimationFrame(() => map.resize());
        window.setTimeout(() => map.resize(), 250);
      });
      map.on('error', () => {
        if (timeout) window.clearTimeout(timeout);
        if (!cancelled) setStatus('failed');
      });

      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        observer = new ResizeObserver(() => map.resize());
        observer.observe(containerRef.current);
      }
    })().catch(() => { if (!cancelled) setStatus('failed'); });

    return () => {
      cancelled = true;
      if (timeout) window.clearTimeout(timeout);
      observer?.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [canUseMapbox, geoKey]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      marker.getElement().dataset.active = id === selectedId ? 'true' : 'false';
    });
    const selected = hotels.find((hotel) => hotel.selectionId === selectedId);
    if (mapRef.current && selected) {
      mapRef.current.flyTo({
        center: [selected.lng, selected.lat],
        zoom: Math.max(mapRef.current.getZoom(), 13),
        essential: true,
        speed: 1.1,
      });
    }
  }, [selectedId]);

  if (!canUseMapbox) {
    return <FallbackMap hotels={hotels} locale={locale} onSelect={onSelect} selectedId={selectedId} />;
  }
  return <div className={`cc-map-canvas${ready ? ' cc-map-canvas-ready' : ''}`} ref={containerRef} />;
}

export function MapBoard({
  hotels,
  locale,
  theme,
  selectedId,
  onSelect,
  children,
}: {
  readonly hotels: readonly DemoHotel[];
  readonly locale: string;
  readonly theme: 'light' | 'dark';
  readonly selectedId?: string;
  readonly onSelect: (selectionId: string) => void;
  readonly children?: (hotel: DemoHotel) => React.ReactNode;
}) {
  const located = mappableHotels(hotels);
  const selected = located.find((hotel) => hotel.selectionId === selectedId);
  const unmapped = hotels.length - located.length;

  return (
    <div className="cc-map-wrap">
      <div className="cc-map-layout">
        <div className="cc-map-board">
          <MapCanvas
            hotels={located}
            locale={locale}
            onSelect={onSelect}
            selectedId={selectedId}
            theme={theme}
          />
        </div>
        {selected && children ? <aside className="cc-map-detail">{children(selected)}</aside> : null}
      </div>

      {located.length > 1 ? (
        <div className="cc-chip-rail-wrap">
          <p className="cc-chip-rail-cap">
            {located.length} stays on this map — select one to preview
          </p>
          <div className="cc-rail">
            {located.map((hotel) => (
              <button
                className="cc-chip"
                data-active={hotel.selectionId === selectedId ? 'true' : 'false'}
                key={hotel.selectionId}
                onClick={() => onSelect(hotel.selectionId)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="cc-chip-thumb"
                  style={{ background: gradientThumb(hotel.name) }}
                />
                <span className="cc-chip-text">
                  <strong>{hotel.name}</strong>
                  <span>{money(hotel.staySubtotal.amount, hotel.staySubtotal.currency, locale)} total</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {unmapped > 0 ? (
        <p className="cc-map-note">
          {unmapped} stay{unmapped === 1 ? '' : 's'} without a map location — see the list view.
        </p>
      ) : null}
    </div>
  );
}

function gradientThumb(name: string): string {
  // Reuses the card gradient so a stay looks identical in card, chip, and tray.
  return gradientForName(name);
}
```

Add `gradientForName` to the import from `./card-primitives.js`, and re-export `PhotoBand`, `ScorePin`, `Badge`, `Price` usage as needed by the detail card the caller supplies through `children`.

- [ ] **Step 3b: Add the map CSS**

Append to `src/views/travel.css`:

```css
/* ── Map board ────────────────────────────────────────────────────────────── */
.cc-map-wrap { display: flex; flex-direction: column; gap: 12px; }
.cc-map-layout { display: flex; flex-direction: column; gap: 12px; }

@media (min-width: 700px) {
  .cc-map-layout { flex-direction: row; align-items: stretch; }
}

.cc-map-board {
  position: relative;
  flex: 1;
  height: 300px;
  overflow: hidden;
  border-radius: var(--cc-radius-card);
}

@media (min-width: 700px) {
  .cc-map-board { height: 360px; }
}

.cc-map-detail { width: 100%; }

@media (min-width: 700px) {
  .cc-map-detail { flex: 0 0 auto; width: 264px; }
}

.cc-map-canvas { position: absolute; inset: 0; z-index: 2; opacity: 0; pointer-events: none; transition: opacity 0.35s ease; }
.cc-map-canvas-ready { opacity: 1; pointer-events: auto; }
.mapboxgl-canvas { outline: none; }

.cc-fallback-map {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--cc-accent) 10%, transparent), transparent 60%),
    linear-gradient(135deg, #eef1f5, #e0e5ec);
}

.cc-theme-dark .cc-fallback-map {
  background:
    radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--cc-accent) 22%, transparent), transparent 60%),
    linear-gradient(135deg, #071a22, #0d242e);
}

.cc-fallback-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgb(120 130 150 / 0.14) 1px, transparent 1px),
    linear-gradient(90deg, rgb(120 130 150 / 0.14) 1px, transparent 1px);
  background-size: 38px 38px;
}

.cc-map-pin,
.cc-map-marker-inner {
  min-height: 32px;
  min-width: 0;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, #fff 85%, transparent);
  border-radius: 999px;
  background: #fff;
  color: #16181d;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 6px 14px rgb(16 24 40 / 0.24);
}

.cc-map-pin { position: absolute; transform: translate(-50%, -100%); }

.cc-map-pin[data-active='true'],
.cc-map-marker[data-active='true'] .cc-map-marker-inner {
  background: var(--cc-accent);
  color: #fff;
  border-color: var(--cc-accent);
  box-shadow: 0 9px 20px color-mix(in srgb, var(--cc-accent) 45%, transparent);
  z-index: 3;
}

.cc-map-pin[data-active='true'] { transform: translate(-50%, -100%) scale(1.09); }
.cc-theme-dark .cc-map-pin[data-active='true'],
.cc-theme-dark .cc-map-marker[data-active='true'] .cc-map-marker-inner { color: #04141b; }

.cc-map-note { font-size: 0.72rem; color: var(--cc-muted); }

.cc-chip-rail-wrap { display: grid; gap: 7px; }
.cc-chip-rail-cap { font-size: 0.72rem; font-weight: 600; color: var(--cc-muted); }

.cc-chip {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 196px;
  padding: 7px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--cc-surface);
  box-shadow: var(--cc-shadow-card);
  text-align: left;
}

.cc-chip[data-active='true'] { border-color: var(--cc-accent); }
.cc-chip-thumb { flex: 0 0 auto; width: 42px; height: 42px; border-radius: 9px; }
.cc-chip-text { min-width: 0; }
.cc-chip-text strong { display: block; font-size: 0.78rem; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-chip-text span { font-size: 0.7rem; color: var(--cc-muted); }

@media (prefers-reduced-motion: reduce) {
  .cc-map-canvas { transition: none; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- hotel-map-board`
Expected: PASS, all 5 assertions.

- [ ] **Step 5: Confirm no token is needed**

Run: `env -u VITE_MAPBOX_TOKEN pnpm test -- hotel-map-board`
Expected: PASS. The fallback board must render with no token present.

- [ ] **Step 6: Commit**

```bash
git add src/views/hotel-map-board.tsx src/views/travel.css test/hotel-map-board.test.tsx
git commit -m "feat(views): add the hotel map board"
```

---

## Task 9: Compare tray and matrix

**Files:**
- Create: `src/views/hotel-compare.tsx`
- Modify: `src/views/travel.css`
- Test: `test/hotel-compare.test.tsx` (create)

**Interfaces:**
- Consumes: `gradientForName` (Task 2), `computeStayMatch` (Task 4).
- Produces:
  - `MAX_COMPARE = 3`
  - `CompareTray({ selected, onOpen, onRemove }: CompareTrayProps)`
  - `CompareMatrix({ hotels, locale, onBack }: CompareMatrixProps)`
  - `buildCompareRows(hotels: readonly DemoHotel[], locale: string): CompareRow[]` — exported for test
  - `interface CompareRow { key: string; label: string; cells: string[]; bestIndexes: number[] }`

- [ ] **Step 1: Write the failing test**

Create `test/hotel-compare.test.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CompareTray, MAX_COMPARE, buildCompareRows } from '../src/views/hotel-compare.js';
import type { DemoHotel } from '../src/demo-schemas.js';

function stay(name: string, total: number, category: number, flexible = true): DemoHotel {
  return {
    selectionId: `hsel_${name}`,
    dataSource: 'illustrative',
    name,
    city: 'Lisbon',
    countryCode: 'PT',
    neighborhood: 'Baixa concept district',
    description: 'An illustrative stay.',
    roomName: 'Room',
    category,
    amenities: ['Wi-Fi', 'Breakfast preview'],
    nights: 6,
    rooms: 1,
    nightlyPrice: { amount: Math.round(total / 6), currency: 'CAD' },
    staySubtotal: { amount: total, currency: 'CAD' },
    taxesAndFeesIncluded: false,
    illustrativePolicy: flexible
      ? 'Illustrative flexible terms; no reservation can be created.'
      : 'Illustrative terms only; no room is held or reserved.',
  } as DemoHotel;
}

const HOTELS = [stay('Tagus', 1716, 4), stay('Alfama', 1428, 3, false), stay('Juniper', 2064, 5)];

describe('buildCompareRows', () => {
  it('marks the cheapest total as best', () => {
    const rows = buildCompareRows(HOTELS, 'en-CA');
    const total = rows.find((row) => row.key === 'total');
    expect(total?.bestIndexes).toEqual([1]);
  });

  it('marks the highest category as best', () => {
    const rows = buildCompareRows(HOTELS, 'en-CA');
    expect(rows.find((row) => row.key === 'category')?.bestIndexes).toEqual([2]);
  });

  it('allows a tie to mark more than one cell', () => {
    const rows = buildCompareRows(HOTELS, 'en-CA');
    expect(rows.find((row) => row.key === 'cancellation')?.bestIndexes).toEqual([0, 2]);
  });

  it('drops a row no hotel has data for', () => {
    const rows = buildCompareRows(HOTELS, 'en-CA');
    expect(rows.map((row) => row.key)).not.toContain('rating');
  });

  it('keeps the rating row when at least one hotel has a score', () => {
    const rated = [{ ...HOTELS[0], reviewScore: 8.9 } as DemoHotel, HOTELS[1], HOTELS[2]];
    expect(buildCompareRows(rated, 'en-CA').map((row) => row.key)).toContain('rating');
  });
});

describe('CompareTray', () => {
  it('renders nothing when no stay is marked', () => {
    expect(renderToStaticMarkup(
      <CompareTray onOpen={() => {}} onRemove={() => {}} selected={[]} />,
    )).toBe('');
  });

  it('asks for one more when only one is marked', () => {
    const html = renderToStaticMarkup(
      <CompareTray onOpen={() => {}} onRemove={() => {}} selected={[HOTELS[0]]} />,
    );
    expect(html).toContain('Pick 1 more');
    expect(html).toContain('disabled');
  });

  it('enables the CTA at two', () => {
    const html = renderToStaticMarkup(
      <CompareTray onOpen={() => {}} onRemove={() => {}} selected={HOTELS.slice(0, 2)} />,
    );
    expect(html).toContain('2 stays ready to compare');
    expect(html).not.toContain('disabled');
  });
});

describe('MAX_COMPARE', () => {
  it('caps at three, since a wider matrix is unreadable inline', () => {
    expect(MAX_COMPARE).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- hotel-compare`
Expected: FAIL — cannot resolve `../src/views/hotel-compare.js`.

- [ ] **Step 3a: Write the module**

Create `src/views/hotel-compare.tsx`:

```tsx
import type { DemoHotel } from '../demo-schemas.js';
import { gradientForName } from './card-primitives.js';
import { computeStayMatch } from './stay-match.js';

/** Three is the ceiling: a wider matrix is unreadable in an inline iframe. */
export const MAX_COMPARE = 3;

export interface CompareRow {
  readonly key: string;
  readonly label: string;
  readonly cells: readonly string[];
  readonly bestIndexes: readonly number[];
}

function money(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 })
      .format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

function bestBy(values: readonly number[], direction: 'min' | 'max'): number[] {
  const target = direction === 'min' ? Math.min(...values) : Math.max(...values);
  return values.flatMap((value, index) => (value === target ? [index] : []));
}

/**
 * A row whose source field is absent across every compared hotel is dropped
 * rather than rendered empty — on main that removes the guest-rating row.
 */
export function buildCompareRows(hotels: readonly DemoHotel[], locale: string): CompareRow[] {
  const rows: CompareRow[] = [];
  const totals = hotels.map((hotel) => hotel.staySubtotal.amount);
  const nightly = hotels.map((hotel) => hotel.nightlyPrice.amount);
  const categories = hotels.map((hotel) => hotel.category);
  const flexible = hotels.map((hotel) => hotel.illustrativePolicy.toLowerCase().includes('flexible'));
  const amenityCounts = hotels.map((hotel) => hotel.amenities.length);
  const matches = hotels.map((hotel) => computeStayMatch(hotel, hotels).score);

  rows.push({
    key: 'total',
    label: 'Total',
    cells: hotels.map((hotel) => money(hotel.staySubtotal.amount, hotel.staySubtotal.currency, locale)),
    bestIndexes: bestBy(totals, 'min'),
  });
  rows.push({
    key: 'nightly',
    label: 'Per night',
    cells: hotels.map((hotel) => money(hotel.nightlyPrice.amount, hotel.nightlyPrice.currency, locale)),
    bestIndexes: bestBy(nightly, 'min'),
  });
  rows.push({
    key: 'category',
    label: 'Category',
    cells: hotels.map((hotel) => `${hotel.category}-star`),
    bestIndexes: bestBy(categories, 'max'),
  });
  rows.push({
    key: 'cancellation',
    label: 'Cancellation',
    cells: flexible.map((value) => (value ? 'Flexible' : 'Terms only')),
    bestIndexes: bestBy(flexible.map((value) => (value ? 1 : 0)), 'max'),
  });
  rows.push({
    key: 'neighborhood',
    label: 'Neighborhood',
    cells: hotels.map((hotel) => hotel.neighborhood),
    bestIndexes: [],
  });

  const scores = hotels.map((hotel) => (hotel as { reviewScore?: number }).reviewScore);
  if (scores.some((score) => score !== undefined)) {
    rows.push({
      key: 'rating',
      label: 'Guest rating',
      cells: scores.map((score) => (score === undefined ? '—' : score.toFixed(1))),
      bestIndexes: bestBy(scores.map((score) => score ?? -1), 'max'),
    });
  }

  rows.push({
    key: 'amenities',
    label: 'Amenities',
    cells: hotels.map((hotel) => `${hotel.amenities.length} listed`),
    bestIndexes: bestBy(amenityCounts, 'max'),
  });
  rows.push({
    key: 'match',
    label: 'Stay match',
    cells: matches.map((score) => String(score)),
    bestIndexes: bestBy(matches, 'max'),
  });

  return rows;
}

export function CompareTray({
  selected,
  onOpen,
  onRemove,
}: {
  readonly selected: readonly DemoHotel[];
  readonly onOpen: () => void;
  readonly onRemove: (selectionId: string) => void;
}) {
  if (selected.length === 0) return null;
  const ready = selected.length >= 2;
  return (
    <div className="cc-tray">
      <div className="cc-tray-thumbs">
        {selected.map((hotel) => (
          <button
            aria-label={`Remove ${hotel.name} from compare`}
            className="cc-tray-thumb"
            key={hotel.selectionId}
            onClick={() => onRemove(hotel.selectionId)}
            style={{ background: gradientForName(hotel.name) }}
            type="button"
          >
            <span aria-hidden="true" className="cc-tray-x">×</span>
          </button>
        ))}
      </div>
      <p className="cc-tray-copy">
        {ready ? `${selected.length} stays ready to compare` : 'Pick 1 more to compare'}
      </p>
      <button className="cc-tray-cta" disabled={!ready} onClick={onOpen} type="button">
        Compare
      </button>
    </div>
  );
}

export function CompareMatrix({
  hotels,
  locale,
  onBack,
}: {
  readonly hotels: readonly DemoHotel[];
  readonly locale: string;
  readonly onBack: () => void;
}) {
  const rows = buildCompareRows(hotels, locale);
  const matches = hotels.map((hotel) => computeStayMatch(hotel, hotels).score);
  const winnerIndex = matches.indexOf(Math.max(...matches));
  const winner = hotels[winnerIndex];
  const cheapestIndex = hotels
    .map((hotel) => hotel.staySubtotal.amount)
    .reduce((best, amount, index, all) => (amount < all[best] ? index : best), 0);
  const cheapest = hotels[cheapestIndex];
  const gap = winner.staySubtotal.amount - cheapest.staySubtotal.amount;

  return (
    <div className="cc-compare">
      <button className="cc-compare-back" onClick={onBack} type="button">Back to stays</button>
      <div className="cc-compare-scroll">
        <table className="cc-matrix">
          <caption>{hotels.length} stays compared</caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              {hotels.map((hotel) => <th key={hotel.selectionId} scope="col">{hotel.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {row.cells.map((cell, index) => (
                  <td
                    className={row.bestIndexes.includes(index) ? 'cc-matrix-best' : undefined}
                    key={hotels[index].selectionId}
                  >
                    {cell}
                    {row.bestIndexes.includes(index)
                      ? <span className="cc-visually-hidden"> — best</span>
                      : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cc-verdict">
        <strong>We'd pick {winner.name} — highest stay match at {matches[winnerIndex]}.</strong>
        {gap > 0 ? (
          <span>
            {' '}The one tradeoff: {money(gap, winner.staySubtotal.currency, locale)} more than{' '}
            {cheapest.name} across {winner.nights} night{winner.nights === 1 ? '' : 's'}.
          </span>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 3b: Add the compare CSS**

Append to `src/views/travel.css`:

```css
/* ── Compare tray and matrix ──────────────────────────────────────────────── */
.cc-tray {
  position: sticky;
  bottom: 12px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 10px;
  border-radius: var(--cc-radius-card);
  background: var(--cc-surface);
  box-shadow: var(--cc-shadow-card-hover);
}

.cc-tray-thumbs { display: flex; }
.cc-tray-thumbs > * + * { margin-left: -8px; }

.cc-tray-thumb {
  position: relative;
  width: 36px;
  min-width: 36px;
  height: 36px;
  min-height: 36px;
  padding: 0;
  border: 2px solid var(--cc-surface);
  border-radius: 9px;
}

.cc-tray-x {
  position: absolute;
  right: -3px;
  top: -3px;
  display: grid;
  place-items: center;
  width: 15px;
  height: 15px;
  border-radius: 999px;
  background: var(--cc-text);
  color: var(--cc-surface);
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1;
}

.cc-tray-copy { flex: 1; font-size: 0.75rem; color: var(--cc-muted); }

.cc-tray-cta {
  flex: 0 0 auto;
  padding: 9px 18px;
  border: 0;
  border-radius: 999px;
  background: var(--cc-accent);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
}

.cc-theme-dark .cc-tray-cta { color: #04141b; }
.cc-tray-cta:disabled { opacity: 0.5; cursor: not-allowed; }

.cc-compare-scroll { overflow-x: auto; }
.cc-matrix { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
.cc-matrix caption { padding-bottom: 9px; text-align: left; font-size: 0.75rem; color: var(--cc-muted); }
.cc-matrix th, .cc-matrix td { padding: 9px 11px; border-bottom: 1px solid var(--cc-border); text-align: left; vertical-align: top; }
.cc-matrix thead th { border-bottom: 2px solid var(--cc-accent); font-weight: 700; }
.cc-matrix tbody th { font-size: 0.72rem; font-weight: 600; color: var(--cc-muted); white-space: nowrap; }
.cc-matrix-best { font-weight: 700; }
.cc-matrix-best::after { content: ' ◄'; color: var(--cc-accent); font-size: 0.62rem; vertical-align: 1px; }

.cc-verdict {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--cc-accent) 7%, var(--cc-surface));
  font-size: 0.8rem;
}

.cc-theme-dark .cc-verdict { background: color-mix(in srgb, var(--cc-accent) 14%, transparent); }
.cc-verdict span { color: var(--cc-muted); }

/* Below 700px the matrix would be unreadable as a wide grid. */
@media (max-width: 699px) {
  .cc-matrix, .cc-matrix tbody, .cc-matrix tr, .cc-matrix td, .cc-matrix th { display: block; }
  .cc-matrix thead { display: none; }
  .cc-matrix tbody th { padding-bottom: 2px; border-bottom: 0; }
  .cc-matrix td::before { content: attr(data-hotel) ': '; color: var(--cc-muted); font-weight: 600; }
}
```

In `CompareMatrix`, add `data-hotel={hotels[index].name}` to each `<td>` so the stacked mobile layout labels its cells.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- hotel-compare`
Expected: PASS, all 9 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/views/hotel-compare.tsx src/views/travel.css test/hotel-compare.test.tsx
git commit -m "feat(views): add compare tray and matrix"
```

---

## Task 10: Screen model wiring

**Files:**
- Modify: `src/views/hotel-results.tsx`
- Modify: `src/views/travel.css`
- Test: `test/demo-hotel-widget.test.tsx`, `test/browser/widgets.browser.test.tsx`

**Interfaces:**
- Consumes: `MapBoard`, `mappableHotels` (Task 8); `CompareTray`, `CompareMatrix`, `MAX_COMPARE` (Task 9); `PhotoBand`, `Badge`, `Price`, `ScorePin`, `Rail` (Tasks 2, 5).
- Produces: `HotelResultsView` keeps its existing prop signature; two new optional props `initialScreen?: 'shortlist' | 'compare'` and `initialBoardView?: 'list' | 'map'` are added purely so tests can render a screen directly.

- [ ] **Step 1: Write the failing test**

Append to `test/demo-hotel-widget.test.tsx`:

```tsx
describe('hotel screen model', () => {
  it('offers a list and map toggle as a labelled radio group', () => {
    const html = renderToStaticMarkup(
      createElement(HotelResultsView, { displayMode: 'inline', result: sampleHotelResult }),
    );
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Board view"');
    expect(html.match(/role="radio"/g)?.length).toBe(2);
  });

  it('hides the toggle when no stay carries coordinates', () => {
    const flat = {
      ...sampleHotelResult,
      hotels: sampleHotelResult.hotels.map(({ lat: _lat, lng: _lng, ...rest }: any) => rest),
    };
    const html = renderToStaticMarkup(
      createElement(HotelResultsView, { displayMode: 'inline', result: flat }),
    );
    expect(html).not.toContain('aria-label="Board view"');
  });

  it('renders the map board when the map view is selected', () => {
    const html = renderToStaticMarkup(
      createElement(HotelResultsView, {
        displayMode: 'inline',
        initialBoardView: 'map',
        result: sampleHotelResult,
      }),
    );
    expect(html).toContain('cc-map-board');
  });

  it('renders the compare matrix on the compare screen', () => {
    const html = renderToStaticMarkup(
      createElement(HotelResultsView, {
        displayMode: 'fullscreen',
        initialScreen: 'compare',
        result: sampleHotelResult,
      }),
    );
    expect(html).toContain('cc-matrix');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- demo-hotel-widget`
Expected: FAIL — `role="radiogroup"` not present.

- [ ] **Step 3a: Add the view toggle CSS**

Append to `src/views/travel.css`:

```css
/* ── Board view toggle ────────────────────────────────────────────────────── */
.cc-viewtoggle { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--cc-border); border-radius: 999px; }

.cc-viewtoggle button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  min-width: 0;
  padding: 6px 13px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--cc-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.cc-viewtoggle button[aria-checked='true'] { background: var(--cc-accent); color: #fff; }
.cc-theme-dark .cc-viewtoggle button[aria-checked='true'] { color: #04141b; }

.cc-shortlist-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
```

- [ ] **Step 3b: Wire the screen model**

In `src/views/hotel-results.tsx`, add state at the top of `HotelResultsView` (after the existing `state`/`result` guards):

```tsx
type HotelScreen = 'shortlist' | 'compare';
type BoardView = 'list' | 'map';

const [screen, setScreen] = useState<HotelScreen>(initialScreen ?? 'shortlist');
const [boardView, setBoardView] = useState<BoardView>(initialBoardView ?? 'list');
const [compareIds, setCompareIds] = useState<readonly string[]>([]);
const [mapSelectionId, setMapSelectionId] = useState<string | undefined>(undefined);
const headingRef = useRef<HTMLHeadingElement>(null);

// The widget lives in an iframe; without this, focus is stranded on the
// control that triggered the transition after the screen swaps beneath it.
useEffect(() => { headingRef.current?.focus(); }, [screen]);

const hotels = result.hotels;
const mappable = mappableHotels(hotels);
const compared = compareIds
  .map((id) => hotels.find((hotel) => hotel.selectionId === id))
  .filter((hotel): hotel is DemoHotel => hotel !== undefined);

const toggleCompare = (selectionId: string) => {
  setCompareIds((current) => current.includes(selectionId)
    ? current.filter((id) => id !== selectionId)
    : current.length >= MAX_COMPARE ? current : [...current, selectionId]);
};
```

Add the two optional props to the destructured parameter list and its type:

```tsx
  readonly initialScreen?: 'shortlist' | 'compare';
  readonly initialBoardView?: 'list' | 'map';
```

Render the compare screen first:

```tsx
if (screen === 'compare' && compared.length >= 2) {
  return (
    <Frame className={frameClassName} style={brandStyle}>
      <h2 ref={headingRef} tabIndex={-1}>Compare stays</h2>
      <CompareMatrix hotels={compared} locale={locale} onBack={() => setScreen('shortlist')} />
    </Frame>
  );
}
```

Then the shortlist header with the toggle, shown only when something is mappable:

```tsx
<div className="cc-shortlist-head">
  <div>
    <h2 ref={headingRef} tabIndex={-1}>Stays in {hotels[0]?.city}</h2>
    <p>{result.message}</p>
  </div>
  {mappable.length > 0 ? (
    <div aria-label="Board view" className="cc-viewtoggle" role="radiogroup">
      <button
        aria-checked={boardView === 'list'}
        onClick={() => setBoardView('list')}
        role="radio"
        type="button"
      >
        <ListIcon />List
      </button>
      <button
        aria-checked={boardView === 'map'}
        onClick={() => setBoardView('map')}
        role="radio"
        type="button"
      >
        <MapPinIcon />Map
      </button>
    </div>
  ) : null}
</div>
```

Then the board:

```tsx
{boardView === 'map' && mappable.length > 0 ? (
  <MapBoard
    hotels={hotels}
    locale={locale}
    onSelect={setMapSelectionId}
    selectedId={mapSelectionId}
    theme={theme}
  >
    {(hotel) => (
      <HotelCard
        allHotels={hotels}
        hotel={hotel}
        locale={locale}
        onAdd={onAdd}
        pending={pendingSelectionId === hotel.selectionId}
        selected={selectedSelectionId === hotel.selectionId}
      />
    )}
  </MapBoard>
) : (
  <Rail ariaLabel="Stays">
    {hotels.map((hotel) => (
      <HotelCard
        allHotels={hotels}
        comparing={compareIds.includes(hotel.selectionId)}
        hotel={hotel}
        key={hotel.selectionId}
        locale={locale}
        onAdd={onAdd}
        onToggleCompare={() => toggleCompare(hotel.selectionId)}
        pending={pendingSelectionId === hotel.selectionId}
        selected={selectedSelectionId === hotel.selectionId}
      />
    ))}
  </Rail>
)}

<CompareTray
  onOpen={() => setScreen('compare')}
  onRemove={toggleCompare}
  selected={compared}
/>
```

Extend `HotelCard` with the two new optional props `comparing?: boolean` and `onToggleCompare?: () => void`, rendering the chip inside `PhotoBand` when `onToggleCompare` is supplied:

```tsx
<PhotoBand imageUrl={imageUrl} name={hotel.name}>
  {onToggleCompare ? (
    <button
      aria-label={comparing ? `Remove ${hotel.name} from compare` : `Add ${hotel.name} to compare`}
      aria-pressed={comparing}
      className="cc-compare-chip"
      onClick={onToggleCompare}
      type="button"
    >
      {comparing ? <CheckIcon /> : <PlusIcon />}
      {comparing ? 'Comparing' : 'Compare'}
    </button>
  ) : null}
  <ScorePin score={reviewScore} />
</PhotoBand>
```

Add the imports:

```tsx
import { useEffect, useRef } from 'react';
import { ListIcon, MapPinIcon, PlusIcon } from './icons.js';
import { MapBoard, mappableHotels } from './hotel-map-board.js';
import { CompareMatrix, CompareTray, MAX_COMPARE } from './hotel-compare.js';
```

- [ ] **Step 3c: Request fullscreen for compare**

Where the widget already calls `useRequestDisplayMode`, request `fullscreen` when `screen` becomes `compare` and revert to `inline` on return, following the existing call pattern in the file.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- demo-hotel-widget`
Expected: PASS.

- [ ] **Step 5: Run the full suite and validate**

```bash
pnpm test
env -u VITE_MAPBOX_TOKEN pnpm test:browser
pnpm validate -- --json
```

Expected: all PASS, and validate reports `{"ok":true}`. Fix any `error.errors[]` entry at its `path` and re-run rather than freeform editing.

- [ ] **Step 6: Commit**

```bash
git add src/views/hotel-results.tsx src/views/travel.css test/demo-hotel-widget.test.tsx
git commit -m "feat(views): add hotel screen and board view model"
```

---

## Final verification

- [ ] **Step 1: Full test sweep**

```bash
pnpm test
env -u VITE_MAPBOX_TOKEN pnpm test:browser
```

Both must pass with no token present.

- [ ] **Step 2: Noodle gates**

```bash
pnpm validate -- --json
pnpm test:noodle -- --json 2>/dev/null || npx noodle test --json
npx noodle check --json
```

`validate` and `test` must report `ok: true`. `check` gates the widget build.

- [ ] **Step 3: Confirm the palette constraint held**

```bash
grep -ri "1570ef" src/ && echo "FAIL: Tribe blue present" || echo "OK: no Tribe blue"
grep -c "tailwind\|lucide-react\|@alpic-ai" package.json
```

Expected: no Tribe blue; second command prints `0`.

- [ ] **Step 4: Confirm no forbidden file was touched**

```bash
git diff --stat origin/main -- src/hotel-runtime.ts src/hotel-connectors.ts
```

Expected: empty output — neither file exists on this branch and neither was created.

- [ ] **Step 5: Review the diff**

```bash
git diff origin/main --stat
```

Confirm the change set matches the File Structure table and nothing in `apps/web` was modified.

---

## Self-review notes

**Spec coverage.** Token layer → Task 1. Rail primitive → Tasks 1–2. Boarding-pass fare card → Task 3. Photo band with optional image → Tasks 2, 5. Score pin omitted without `reviewScore` → Tasks 2, 5. Stay match with line omission and renormalisation → Tasks 4, 5. `lat`/`lng` both-or-neither → Task 6. Fixture coordinates → Task 6. CDN Mapbox loader → Task 7. Build-time token inlining → Task 7. Explicit CSP tile hosts → Task 7. Fallback board as the tested surface → Task 8. Thumbnail rail as non-map path → Task 8. Unmapped-hotel note → Task 8. Compare tray and matrix, best-cell marking, row dropping, three-hotel cap, mobile stacking → Task 9. Screen and board-view model, focus management, fullscreen request → Task 10.

**Deliberate deviation from the spec's phase split.** The spec places the match ring in phase 2, but the hotel card renders it, so Task 4 (scoring) and Task 5 (ring) run before the phase-2 map work. Building the card twice would be waste. The delivered scope is unchanged.

**Deferred, as specified.** Details and rooms screens are phase 3 and appear in no task; the Details button ships disabled with a title explaining why. The live `hotel-runtime.ts` coordinate mapping is documented in the spec for whoever merges `codex/wayfare-chat-trip-flow` and is not attempted here.

**Known follow-up.** Hotel photography requires either that merge or an `imageUrl` field added to the synthetic schema. `PhotoBand` already accepts the image, so no rework is needed when it arrives.
