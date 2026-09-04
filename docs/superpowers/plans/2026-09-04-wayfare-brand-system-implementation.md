# Wayfare Brand System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the approved Wayfare brand contract the enforced source of truth and implement it in the Next.js product. The repository-owned MCP App UI is intentionally deferred to Wahab.

**Architecture:** Centralize the approved identity in the Next.js site configuration and CSS tokens and use one exact reusable Wayline component for web lockups. Protect user-visible behavior with component and Playwright tests. Keep the MCP server, its view source, styling, dependencies, and widget tests unchanged; the canonical brand document is the contract for Wahab's later implementation.

**Tech Stack:** TypeScript, React 19, Next.js 16, CSS custom properties, Host Grotesk Variable via Fontsource, Heroicons React, BorderBeam, Vitest, Testing Library, Playwright

**Spec:** `docs/brand/wayfare-brand-guidelines.md`

**Implementation status:** Complete for `apps/web`; MCP App UI deferred to
Wahab. Verified on 2026-09-04 with TypeScript, 230 unit tests, 45 passing
Playwright checks across desktop and mobile (13 intentional skips), a successful
six-route production build, light and focused-composer screenshot review, and
pixel-identical captures under light and dark operating-system preferences,
customization validation, generated-guidance audit, and a clean MCP-scope diff.
The aggregate `pnpm audit:licenses` command remains unable to inspect the
already-installed `@noodleseed/one@0.151.1` because its local pnpm package-index
record is absent; the new web dependencies' package metadata and bundled license
files were reviewed directly.

## Global Constraints

- Read `docs/brand/wayfare-brand-guidelines.md` in full before each implementation or review pass.
- Preserve chat-first composition and the current live-versus-illustrative data boundary.
- Use exact Wayline SVG geometry and Host Grotesk Variable `5.3.0`.
- Use the light-only semantic colors `#66CCFF`, `#99FF99`, and `#FF6666`.
- Use Heroicons for every functional icon; the Wayline mark is the sole custom SVG exception.
- Make text buttons and chat composers pills, icon-only buttons circles, and pointer targets at least 44px.
- BorderBeam runs for `3.1s` only during focus, submission, or response; TextShimmer is activity-only.
- Respect reduced motion, keyboard focus, WCAG AA contrast, 200% text zoom, and 320px width. A dark operating-system preference must still render the light theme.
- Do not change provider behavior, tool schemas, confirmation semantics, or data-source claims.
- Do not commit, push, open a pull request, deploy, or mutate hosted configuration during this execution; those actions require separate authorization.
- Do not modify `src/views/`, root MCP brand configuration, root UI dependencies, or MCP widget tests in this execution. Wahab owns that later pass.

---

### Task 1: Canonical brand contract and agent enforcement

**Files:**
- Create: `docs/brand/wayfare-brand-guidelines.md`
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `docs/customization.md`
- Modify: `docs/architecture.md`
- Modify: `docs/internal/README.md`
- Delete: `docs/internal/wayfare-brand-guidelines.md`

**Interfaces:**
- Consumes: the user-approved visual board and current generated Noodle agent block.
- Produces: a stable public-safe normative document and an automatically loaded repository instruction pointing to it.

- [x] **Step 1: Save the complete approved identity contract**

  Record the exact Wayline SVG, neutral and semantic tokens, Host Grotesk rule,
  Heroicons rule, shape system, jet-window caption rule, motion state table,
  imagery guidance, voice examples, accessibility requirements, and review
  checklist in `docs/brand/wayfare-brand-guidelines.md`.

- [x] **Step 2: Add the agent preflight rule without editing generated context**

  Append a `Wayfare brand preflight` section after the generated Noodle block in
  `AGENTS.md`. Require agents to read the canonical guideline before any
  user-facing design, implementation, or review and to obtain approval for a
  deviation.

- [x] **Step 3: Reconcile active documentation**

  Link the canonical guideline from README, architecture, and customization.
  Remove the obsolete internal draft and remove it from the internal-only
  deletion package.

- [x] **Step 4: Review the document against every approved visual-board section**

  Compare brand foundation, logo, color, typography, shape, iconography, motion,
  imagery, voice, accessibility, and implementation contract line by line.

### Task 2: Next.js brand token and typography migration

**Files:**
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/web/src/lib/site-config.ts`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `apps/web/test/browser/travel-shell.spec.ts`

**Interfaces:**
- Consumes: the web-owned Wayfare token object in `siteConfig.brand`.
- Produces: exact light-only neutral and semantic CSS variables plus Host Grotesk imports in the Next.js product.

- [x] **Step 1: Write failing rendered typography and semantic-state tests**

  Assert `Host Grotesk Variable` in the rendered website, exact light-token
  behavior under both system preferences, and independently computed contrast for primary
  text and action labels.

- [x] **Step 2: Run the focused tests and verify failure**

  Run the matching Next.js unit and Playwright tests. Expect failures naming the current Inter and navy palette.

- [x] **Step 3: Install and import Host Grotesk Variable**

  Replace `@fontsource-variable/inter` with pinned
  `@fontsource-variable/host-grotesk@5.3.0` in the web package and website
  runtime import. Preserve system monospace for code.

- [x] **Step 4: Implement the exact token model**

  Add selected, confirmed, action-needed, canvas, surface, raised, ink, muted,
  boundary, and on-state tokens for the light theme. Replace decorative legacy
  navy/cyan roles with neutral or semantically correct uses.

- [x] **Step 5: Run the focused tests and verify pass**

  Repeat the Task 2 commands and require all assertions to pass.

### Task 3: Wayline logo and shape system

**Files:**
- Modify: `apps/web/src/components/wayfare-mark.tsx`
- Modify: `apps/web/app/icon.svg`
- Modify: `apps/web/app/globals.css`
- Test: `apps/web/test/travel-conversation.test.tsx`
- Test: `apps/web/test/browser/travel-shell.spec.ts`

**Interfaces:**
- Produces: `WayfareMark` rendering exact `viewBox="0 0 64 64"`, path geometry, and two endpoints; global pill/circle interaction geometry.

- [x] **Step 1: Write failing logo and rendered-radius tests**

  Render the real `WayfareMark` and assert its exact view box, route path, two
  circles, `currentColor`, and accessibility treatment. In Playwright, inspect
  every visible button: text actions must have a pill radius and icon-only
  controls must be circular and at least 44px.

- [x] **Step 2: Run focused tests and verify failure against the angular mark and rectangular actions**

  Run `pnpm --filter @nuitee-travel-starter/web test -- travel-conversation.test.tsx` and the matching Playwright grep.

- [x] **Step 3: Replace the mark and favicon with the exact Wayline**

  Use only the master geometry from the spec and preserve `currentColor` in the
  React component. Use black in the standalone favicon asset.

- [x] **Step 4: Normalize interaction geometry**

  Make all text buttons/actions/chips pills, all icon-only buttons circles, and
  keep cards and ordinary form fields on their specified non-pill radii.

- [x] **Step 5: Run focused tests and verify pass**

  Repeat the component and browser commands and require no target-size or
  radius failures.

### Task 4: Stateful composer and agent activity motion

**Files:**
- Modify: `apps/web/src/components/travel-composer.tsx`
- Modify: `apps/web/src/components/ui/border-beam-search.tsx`
- Modify: `apps/web/src/components/travel-conversation.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `apps/web/test/travel-composer.test.tsx`
- Test: `apps/web/test/travel-conversation.test.tsx`
- Test: `apps/web/test/browser/travel-shell.spec.ts`

**Interfaces:**
- Produces: `data-composer-state="idle|focused|busy|error"` on the real composer beam wrapper and activity-only `TextShimmer` output.

- [x] **Step 1: Write failing observable state tests**

  Assert the beam is visually inactive at idle, activates on textarea focus and
  while `busy`, returns to idle after blur/completion, and stays static with an
  action-needed outline in error. Assert TextShimmer appears only during active
  agent preparation and stable answer text has no shimmer class.

- [x] **Step 2: Run focused tests and verify failure**

  Run `pnpm --filter @nuitee-travel-starter/web test -- travel-composer.test.tsx travel-conversation.test.tsx` and confirm the always-running beam violates the state contract.

- [x] **Step 3: Implement the finite visual state**

  Track focus locally, derive idle/focused/busy/error, expose state as a data
  attribute, and control beam visibility through CSS. Keep duration `3.1s` and
  retain stable input/control geometry.

- [x] **Step 4: Implement reduced-motion and live-region behavior**

  Disable traveling beam and shimmer under reduced motion, render a static
  selected outline while active, and ensure the activity phrase is announced
  once through the existing polite status region.

- [x] **Step 5: Run focused unit and browser tests and verify pass**

  Require default-motion and reduced-motion projects to pass.

### Task 5: Jet-window captions, imagery, and responsive composition

**Files:**
- Modify: `apps/web/src/components/destination-inspiration.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/src/components/experience/immersive-explore-page.module.css`
- Modify: `apps/web/src/components/experience/immersive-chat-page.module.css`
- Test: `apps/web/test/browser/travel-shell.spec.ts`

**Interfaces:**
- Produces: centered crop-safe destination captions and responsive window geometry without page overflow.

- [x] **Step 1: Write failing geometry tests**

  At desktop and mobile widths, calculate each caption center relative to its
  window, assert text stays inside the aperture, and assert the destination
  scroller—not the document—owns purposeful horizontal overflow.

- [x] **Step 2: Run browser tests and verify the existing left-aligned captions fail**

  Run the destination-focused Playwright grep.

- [x] **Step 3: Center the caption block in the safe zone**

  Center text and alignment, reserve lower interior inset from the curved edge,
  preserve the scrim and focal-point object positions, and keep readable mobile
  snap behavior.

- [x] **Step 4: Reconcile immersive surfaces with monochrome composition**

  Remove decorative legacy tints, keep approved imagery, and ensure controls on
  alternative experience routes follow the same tokens, radii, and icon rules.

- [x] **Step 5: Run desktop, mobile, dark-preference, and reduced-motion browser tests**

  Require crop, overflow, legibility, and motion assertions to pass.

### Task 6: MCP App brand conformance — deferred to Wahab

**Files:**
- Modify: `src/views/travel.css`
- Modify: `src/views/travel-home.tsx`
- Modify: `src/views/flight-results.tsx`
- Modify: `src/views/hotel-results.tsx`
- Modify: `src/views/loyalty-overview.tsx`
- Modify: `src/views/reward-flight-results.tsx`
- Modify: `src/views/insurance-results.tsx`
- Test: `test/widgets.test.tsx`
- Test: `test/browser/widgets.browser.test.tsx`

**Interfaces:**
- Future work consumes the existing `cc-*` namespace and `@noodleseed/one` action primitives.
- This implementation produces no MCP UI changes. Wahab must use `docs/brand/wayfare-brand-guidelines.md` as the normative contract later.

- [x] **Step 1: Preserve the explicit ownership boundary**

  Keep the MCP view source, CSS, root dependencies, brand configuration, and
  widget tests unchanged in this Next.js-only pass.

- [x] **Step 2: Record the future implementation contract**

  Document that the MCP UI has not been migrated and that Wahab must read the
  canonical guideline before starting that work.

- [ ] **Step 3: Apply the shared brand grammar inside `cc-*` isolation — future**

  Update root tokens, semantic state classes, button/action overrides, focus,
  light-only tokens, timings, and fallbacks without changing tool output or component
  data contracts.

- [ ] **Step 4: Run widget tests and verify pass — future**

  Repeat the focused Vitest command and require both DOM and browser projects
  to pass.

### Task 7: Voice, documentation, and repository contracts

**Files:**
- Modify: user-visible copy in `apps/web/src/components/**/*.tsx` where it violates the approved voice
- Modify: `README.md`
- Modify: `docs/customization.md`
- Modify: `docs/architecture.md`

**Interfaces:**
- Produces: truthful selected/confirmed/live/illustrative language and a release-readiness audit tied to the canonical guideline.

- [x] **Step 1: Audit visible copy against the voice and truthfulness rules**

  Replace only concrete violations: vague failure messages, fake urgency,
  unqualified illustrative results, or confirmation wording before a verified
  effect. Preserve provider-backed caveats and current capability boundaries.

- [x] **Step 2: Update active implementation documentation**

  Document Host Grotesk, semantic tokens, exact logo ownership, motion state
  behavior, Heroicons-only policy, public-safe brand-doc status, and local
  verification commands.

- [x] **Step 3: Extend readiness behavior checks**

  Exercise the repository's existing license and generated-guidance audit
  scripts so the new font dependency remains licensed and generated Noodle
  instructions remain intact. Do not add prose-grep change detectors.

- [x] **Step 4: Run repository and documentation tests**

  Run the Next.js unit and browser suites, `pnpm customize:check`, and
  `pnpm audit:generated-guidance`. Review new dependency license metadata
  directly if the aggregate pnpm license command is blocked by unrelated local
  store metadata, and record that limitation rather than claiming it passed.

### Task 8: Next.js validation and visual acceptance

**Files:**
- Modify: this plan, marking completed checkboxes after evidence exists
- Modify: active docs only if validation reveals an inaccurate claim

**Interfaces:**
- Produces: evidence for source, unit, browser, accessibility, visual, and Noodle App boundaries.

- [x] **Step 1: Run the complete web quality gate**

  Run `pnpm check:web` and require typecheck, unit tests, Playwright, and Next
  production build to pass.

- [x] **Step 2: Confirm the MCP UI working tree remains untouched**

  Inspect the working-tree diff and ensure no `src/views/`, root UI dependency,
  root brand configuration, or MCP widget-test change remains.

- [x] **Step 3: Preserve the MCP App handoff boundary**

  Do not claim MCP App visual conformance. Link Wahab to the canonical guideline
  and this deferred task instead.

- [x] **Step 4: Inspect the Next.js product visually**

  Capture and inspect homepage, active composer, conversation, error, settings,
  destination windows, developer page, mobile, dark-preference, and reduced-motion states.
  Confirm exact Wayline, Host Grotesk, monochrome surfaces, semantic colors,
  pill controls, crop-safe captions, and non-decorative motion.

- [x] **Step 5: Record evidence without overstating completion**

  Mark only evidence-backed checklist items complete. Distinguish approved
  design, source implementation, local runtime verification, hosted behavior,
  and production behavior. No hosted or production claim is authorized here.
