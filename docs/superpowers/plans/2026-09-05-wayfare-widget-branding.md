# Wayfare Widget Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every repository-owned travel widget in PR #59 to the approved Wayfare visual and semantic contract without changing tool behavior.

**Architecture:** Establish one shared light-only token, typography, icon, and interaction foundation, then migrate the starter and result widgets onto it in independently testable slices. Keep structured tool outputs and app-only selection helpers intact while changing only rendering, wording, and semantic state presentation.

**Tech Stack:** TypeScript, React 19, `@noodleseed/one/react`, Host Grotesk Variable, Heroicons, Vitest, Vitest Browser with Playwright, Noodle Seed CLI

**Spec:** `docs/superpowers/specs/2026-09-05-wayfare-widget-branding-design.md`

## Global Constraints

- `docs/brand/wayfare-brand-guidelines.md` is the normative contract.
- The product is light-only: canvas `#FFFFFF`, surface `#F7F7F7`, raised `#FFFFFF`, ink `#0D0D0D`, muted `#5D5D5D`, subtle `#767676`, boundary `#E8E8E8`.
- Selected is `#66CCFF`, confirmed is `#99FF99`, action needed is `#FF6666`, and response activity is `#2F7391`.
- Host Grotesk Variable is the sole UI typeface.
- Heroicons is the sole functional icon library; the Wayline is the only repository-authored SVG exception.
- Text actions and chips are pills; icon-only controls are circular and at least 44 by 44 pixels.
- A selection is not a confirmation, and illustrative data remains explicitly labeled.
- Tool schemas, provider calls, structured outputs, selection identifiers, and model-visible fallbacks do not change.
- The primary checkout remains untouched; all work is performed in the PR #59 worktree.

---

### Task 1: Shared Wayfare foundation

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/views/icons.tsx`
- Modify: `src/views/card-primitives.tsx`
- Modify: `src/views/travel.css`
- Test: `test/card-primitives.test.tsx`
- Test: `test/demo-brand.test.ts`
- Test: `test/widgets.test.tsx`

**Interfaces:**
- Consumes: the existing `.cc-app` class and `Rail`, `Badge`, `Price`, `MatchDetail`, and score presentation primitives.
- Produces: Heroicon exports with the existing local icon names, exact Wayfare CSS variables, a 44-pixel rail-control contract, and text-based `MatchScore`/`MatchDetail` semantics.

- [x] **Step 1: Write failing foundation tests**

Add assertions that rendered icons come from Heroicons, `MatchScore` has the
accessible text `Stay match 82 out of 100`, match rows render `Matches` and
`Consider`, computed rail buttons are 44 by 44 pixels, and `.cc-app` computes to
Host Grotesk on a white canvas even when the input theme is dark.

```tsx
expect(renderToStaticMarkup(<MatchScore score={82} />)).toContain('Stay match 82 out of 100');
expect(renderToStaticMarkup(<MatchDetail match={match} />)).toContain('Matches');
expect(renderToStaticMarkup(<MatchDetail match={partialMatch} />)).toContain('Consider');
expect(getComputedStyle(document.querySelector('.cc-app')!).fontFamily).toContain('Host Grotesk Variable');
expect(button.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
```

- [x] **Step 2: Run focused tests and observe the expected failures**

Run: `pnpm vitest run test/card-primitives.test.tsx test/demo-brand.test.ts test/widgets.test.tsx`

Expected: failures identify Inter, the custom SVG match ring, symbol-only match
rows, old colors, and 36-pixel rail controls.

- [x] **Step 3: Install and wire the shared brand dependencies**

Replace `@fontsource-variable/inter` with `@fontsource-variable/host-grotesk`
and add `@heroicons/react` at the versions already used by `apps/web`:

```json
{
  "dependencies": {
    "@fontsource-variable/host-grotesk": "5.3.0",
    "@heroicons/react": "2.2.0"
  }
}
```

Re-export the required outline and solid Heroicons from `src/views/icons.tsx`
under the existing local names so consumers do not need unrelated rewrites.

- [x] **Step 4: Implement the light-only tokens and primitives**

Set the `.cc-app` token block to the exact approved values, remove dark-theme
palette overrides, enforce pill/circle geometry, replace `MatchRing` with
`MatchScore`, and render explicit match labels with Heroicons.

```css
.cc-app {
  --cc-bg: #FFFFFF;
  --cc-surface: #FFFFFF;
  --cc-subtle-surface: #F7F7F7;
  --cc-text: #0D0D0D;
  --cc-muted: #5D5D5D;
  --cc-subtle: #767676;
  --cc-border: #E8E8E8;
  --cc-selected: #66CCFF;
  --cc-confirmed: #99FF99;
  --cc-action-needed: #FF6666;
  --cc-response: #2F7391;
  color-scheme: light;
  font-family: "Host Grotesk Variable", ui-sans-serif, system-ui, sans-serif;
}
```

- [x] **Step 5: Run the focused tests until green**

Run: `pnpm vitest run test/card-primitives.test.tsx test/demo-brand.test.ts test/widgets.test.tsx`

Expected: all focused foundation tests pass.

- [x] **Step 6: Commit the foundation**

```bash
git add package.json pnpm-lock.yaml src/views/icons.tsx src/views/card-primitives.tsx src/views/travel.css test/card-primitives.test.tsx test/demo-brand.test.ts test/widgets.test.tsx
git commit -m "feat(widgets): establish Wayfare brand foundation"
```

### Task 2: Chat-first starter and search refinement

**Files:**
- Modify: `src/views/travel-home.tsx`
- Modify: `src/views/search-editor.tsx`
- Modify: `src/views/travel.css`
- Test: `test/widgets.test.tsx`
- Test: `test/browser/widgets.browser.test.tsx`

**Interfaces:**
- Consumes: exact Wayfare tokens and Heroicons from Task 1 plus the existing `onDemoPrompt` callback.
- Produces: a passive chat-first `TravelHomeView`; `SearchEditor` remains available only for in-context flight refinement.

- [x] **Step 1: Write failing starter composition tests**

Assert that `TravelHomeView` renders capability availability and disclosure,
does not render `Trip details` or the search form, keeps optional hotel/loyalty
follow-up pills, and stays light when passed `theme="dark"`.

```tsx
expect(homeMarkup).toContain('Travel capabilities');
expect(homeMarkup).not.toContain('Trip details');
expect(homeMarkup).not.toContain('cc-search-form');
expect(homeMarkup).not.toContain('cc-theme-dark');
```

- [x] **Step 2: Run focused tests and observe the expected failures**

Run: `pnpm vitest run test/widgets.test.tsx --testNamePattern="TravelHome|Wayfare"`

Expected: the current starter still renders the pre-conversation search form
and attaches the dark-theme class.

- [x] **Step 3: Implement the compact starter**

Remove `SearchEditor` from `TravelHomeView`, retain the provenance disclosure,
render domains as a quiet one-column orientation list, and keep supported
follow-up prompts as black or neutral pill actions. Remove `onSearchPrompt`
from the home surface while leaving the reusable `SearchEditor` API intact for
flight-result editing.

- [x] **Step 4: Make refinement controls Wayfare-compliant**

Style trip choices as selected-blue pills, keep standard fields at 10–14px
radii, make the route-swap control a 44-pixel circle, and keep the submit action
black with white text.

- [x] **Step 5: Run unit and browser starter tests**

Run: `pnpm vitest run test/widgets.test.tsx`

Run: `pnpm vitest run --config vitest.browser.config.ts test/browser/widgets.browser.test.tsx`

Expected: starter composition, light-only rendering, focus treatment, and
refinement controls pass.

- [x] **Step 6: Commit the starter conversion**

```bash
git add src/views/travel-home.tsx src/views/search-editor.tsx src/views/travel.css test/widgets.test.tsx test/browser/widgets.browser.test.tsx
git commit -m "feat(widgets): make the travel starter chat first"
```

### Task 3: Flight and hotel decision semantics

**Files:**
- Modify: `src/views/flight-results.tsx`
- Modify: `src/views/hotel-results.tsx`
- Modify: `src/views/card-primitives.tsx`
- Modify: `src/views/travel.css`
- Test: `test/widgets.test.tsx`
- Test: `test/demo-hotel-widget.test.tsx`
- Test: `test/card-primitives.test.tsx`
- Test: `test/browser/widgets.browser.test.tsx`
- Test: `test/browser/hotel-results.browser.test.tsx`

**Interfaces:**
- Consumes: `MatchScore`, Wayfare tokens, pill actions, and existing selection callbacks.
- Produces: visually distinct selected, verified, changed-price, expired, and provider-error states with unchanged result schemas.

- [x] **Step 1: Write failing decision-state tests**

Add behavior assertions for `Select`, `Selecting…`, and `Selected`; selected
cards use `rgb(102, 204, 255)`; verified availability uses confirmed styling;
price change and expiry use action-needed styling; hotel selection never says
`Add`, `Added`, or `Adding`.

```tsx
expect(selectedMarkup).toContain('Selected');
expect(selectedMarkup).not.toMatch(/Added|Adding/);
expect(getComputedStyle(selectedCard).backgroundColor).toBe('rgb(102, 204, 255)');
```

- [x] **Step 2: Run focused tests and observe the expected failures**

Run: `pnpm vitest run test/widgets.test.tsx test/demo-hotel-widget.test.tsx test/card-primitives.test.tsx`

Expected: old success tones, `Added` copy, custom ring references, and generic
accent styling fail the new assertions.

- [x] **Step 3: Implement flight semantic states**

Use selected blue only for current fare selection. Reserve confirmed green for
the provider-verified, unchanged fare state. Use action-needed treatment for
changed price, expiry, and blocking verification failures. Keep best-value and
shortest labels neutral unless they report a selected state.

- [x] **Step 4: Implement hotel semantic states**

Rename the callback-facing labels to `Select`, `Selecting…`, and `Selected`;
replace `MatchRing` with `MatchScore`; keep stay-match disclosure explicit;
make hotel detail controls pills; and render the selected card in selected blue
without confirmation language.

- [x] **Step 5: Run decision unit and browser tests**

Run: `pnpm vitest run test/widgets.test.tsx test/demo-hotel-widget.test.tsx test/card-primitives.test.tsx`

Run: `pnpm vitest run --config vitest.browser.config.ts test/browser/widgets.browser.test.tsx test/browser/hotel-results.browser.test.tsx`

Expected: all flight, hotel, selection, verification, rail, and disclosure tests pass.

- [x] **Step 6: Commit decision widgets**

```bash
git add src/views/flight-results.tsx src/views/hotel-results.tsx src/views/card-primitives.tsx src/views/travel.css test/widgets.test.tsx test/demo-hotel-widget.test.tsx test/card-primitives.test.tsx test/browser/widgets.browser.test.tsx test/browser/hotel-results.browser.test.tsx
git commit -m "feat(widgets): align travel decisions with Wayfare states"
```

### Task 4: Guidance widget consistency

**Files:**
- Modify: `src/views/loyalty-overview.tsx`
- Modify: `src/views/reward-flight-results.tsx`
- Modify: `src/views/insurance-results.tsx`
- Modify: `src/views/travel.css`
- Test: `test/demo-loyalty-widget.test.tsx`
- Test: `test/demo-reward-flight-widget.test.tsx`
- Test: `test/demo-insurance-widget.test.tsx`
- Test: `test/browser/insurance-results.browser.test.tsx`

**Interfaces:**
- Consumes: Host Grotesk, Heroicons, light-only frames, and semantic state tokens.
- Produces: consistent non-transactional loyalty, reward, review, and protection guidance surfaces.

- [x] **Step 1: Write failing guidance-widget tests**

Assert that dark input does not add `.cc-theme-dark`, no inline functional SVG
remains, illustrative disclosures remain visible, generic highlights are
neutral, and actions do not imply booking, redemption, purchase, or insurance
recommendation.

```tsx
expect(markup).not.toContain('cc-theme-dark');
expect(markup).not.toMatch(/<svg[^>]*class="cc-icon"/);
expect(markup).toContain('Illustrative');
expect(markup).not.toMatch(/Buy now|Book now|Redeem now|Recommended plan/i);
```

- [x] **Step 2: Run focused tests and observe the expected failures**

Run: `pnpm vitest run test/demo-loyalty-widget.test.tsx test/demo-reward-flight-widget.test.tsx test/demo-insurance-widget.test.tsx`

Expected: Inter imports, dark-theme classes, and reward-flight inline icons fail.

- [x] **Step 3: Implement guidance-widget branding**

Switch font imports, remove dark-theme class output, replace reward-flight
inline SVGs with Heroicons, retone generic positive decoration to neutral, and
preserve provenance, caveats, and safe continuation wording.

- [x] **Step 4: Run guidance unit and browser tests**

Run: `pnpm vitest run test/demo-loyalty-widget.test.tsx test/demo-reward-flight-widget.test.tsx test/demo-insurance-widget.test.tsx`

Run: `pnpm vitest run --config vitest.browser.config.ts test/browser/insurance-results.browser.test.tsx`

Expected: all guidance widgets render with light-only Wayfare styling and retain their safety copy.

- [x] **Step 5: Commit guidance widgets**

```bash
git add src/views/loyalty-overview.tsx src/views/reward-flight-results.tsx src/views/insurance-results.tsx src/views/travel.css test/demo-loyalty-widget.test.tsx test/demo-reward-flight-widget.test.tsx test/demo-insurance-widget.test.tsx test/browser/insurance-results.browser.test.tsx
git commit -m "feat(widgets): unify Wayfare guidance surfaces"
```

### Task 5: Whole-branch verification and PR handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-09-05-wayfare-widget-branding.md`
- Modify only if verification exposes a product defect: files already listed in Tasks 1–4

**Interfaces:**
- Consumes: the complete branded widget suite.
- Produces: a pushed PR #59 head with current test and Noodle validation evidence.

- [x] **Step 1: Run complete unit and browser suites**

Run: `env CI=true pnpm test`

Run: `env CI=true pnpm test:browser`

Expected: every unit and browser test passes.

- [x] **Step 2: Run Noodle validation and smoke checks**

Run: `noodle validate --json`

Run: `noodle test --json`

Run: `noodle check src/demo-live-server.ts --json`

Expected: each command returns a canonical `{ "ok": true, ... }` JSON envelope
and stderr stays empty.

- [x] **Step 3: Inspect responsive widget previews**

Run the repository preview capture at 720 and 320 CSS pixels with reduced
motion, then inspect the generated images for overflow, clipped copy, selection
legibility, and control sizing.

Run: `pnpm docs:previews`

Expected: all seven surfaces remain readable and no horizontal page overflow
appears outside intentional result rails.

- [x] **Step 4: Record completion and commit documentation**

Mark every completed checkbox in this plan and record any credential-dependent
verification as unproven rather than inferred.

```bash
git add docs/superpowers/specs/2026-09-05-wayfare-widget-branding-design.md docs/superpowers/plans/2026-09-05-wayfare-widget-branding.md
git commit -m "docs: record Wayfare widget branding delivery"
```

- [x] **Step 5: Push the exact PR branch**

Run: `git push origin codex/tribe-widget-wayfare-local`

Expected: PR #59 updates to the verified local head without force-pushing or
creating a second pull request.

## Verification Record

- `env CI=true pnpm test`: 16 files and 303 tests passed.
- `env CI=true pnpm test:browser`: 3 Chromium files and 28 tests passed.
- `./node_modules/.bin/noodle validate --json`: returned `{"ok":true,"data":{}}`.
- `./node_modules/.bin/noodle test --json`: returned `ok: true` for the five offline travel tools.
- `./node_modules/.bin/noodle check src/demo-live-server.ts --json`: returned `ok: true`, with seven widget resources, nine model-visible tools, and two app-only helpers.
- Seven fixture-only surfaces were captured and inspected at 720px and 320px with reduced motion and blocked network access.
- The global `noodle` binary is version 0.98.0 and fails the project-version guard; verification therefore used the repository-local CLI matched to `@noodleseed/one` 0.161.2.
- Credentialed live Nuitee search, host rendering, deployment, and production behavior remain unproven and were not inferred from local validation.
