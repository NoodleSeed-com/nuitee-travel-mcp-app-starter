# Wayfare Inline Conversation Implementation Plan

> **Agentic workers required:** Use `superpowers:subagent-driven-development` to execute this plan task-by-task with a fresh implementer and reviewer for each task.

**Goal:** Replace the split controller/canvas workspace with one centered, ChatGPT-style Wayfare conversation where every trusted Nuitee MCP App is rendered inline at its chronological message position.

**Architecture:** `TravelConversation` owns one bounded conversation column and the existing assistant lifecycle. `TravelMessage` renders every message part in order; `TravelViewRegistry` is the sole inline `data-view` boundary and admits only exact tool/URI pairs through `NoodleAppView`. Typed trip state remains a compact `TripBrief` inside the conversation, while the side canvas, newest-view selector, viewport-dependent DOM reordering, and empty flight workspace are removed.

**Tech Stack:** Next.js 16, React 19, TypeScript, `@noodleseed/assistant`, Noodle Seed CLI, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-29-wayfare-inline-conversation-design.md`

## Global Constraints

- Preserve all current uncommitted structured input-request work in `travel-message.tsx` and its test; integrate it instead of overwriting it.
- Keep the official `useNoodleAssistant` lifecycle, guest principal, one-shot initial prompt, `ResizeObserver` cleanup, near-end scroll following, Stop behavior, retry behavior, activity correlation, terminal suppression, and closed error presentation.
- Render linked Apps only through public `NoodleAppView`. Never fetch the UI URI, inject HTML/srcdoc, rebuild App UI from tool JSON, or deduplicate distinct view IDs.
- The only accepted tool/URI pairs are:
  - `search_flights` + `ui://nuitee_travel_mcp_app_starter/search_flights_widget`
  - `open_travel_starter` + `ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget`
- Fail closed with the existing safe unavailable status for unknown or mismatched tool/URI pairs.
- Do not mutate hosted configuration, secrets, embed IDs, releases, deployments, or Noodle access policy.
- Use the project-local Noodle CLI. Local green checks are not hosted-behavior proof.
- Preserve the light-only Inter visual system, Wayfare naming, keyboard operation, 44 px targets, reduced motion, and 200% text zoom support.
- Run tests test-first: observe the intended assertion fail before changing production behavior, then make the smallest implementation that passes.

---

## Task 1: Restore chronological inline MCP App rendering

**Files:**

- Create: `apps/web/src/lib/travel-view-policy.ts`
- Create: `apps/web/test/travel-view-policy.test.ts`
- Modify: `apps/web/src/components/travel-view-registry.tsx`
- Modify: `apps/web/src/components/travel-message.tsx`
- Modify: `apps/web/test/travel-message.test.tsx`
- Delete: `apps/web/src/lib/journey-view.ts`
- Delete: `apps/web/test/journey-view.test.ts`

### Step 1: Write the exact-pair policy tests

Create table-driven tests that prove both approved pairs return `true`, and prove these cases return `false`: approved tool with the other approved URI, approved URI with an unknown tool, unknown URI, missing tool, and prefix/suffix lookalikes.

Define the public predicate around the SDK view shape:

```ts
import type { AssistantViewData } from '@noodleseed/assistant/client';

export function isInlineTravelView(view: AssistantViewData): boolean {
  const expectedUri = INLINE_TRAVEL_VIEW_URIS[view.tool];
  return expectedUri !== undefined && view.ui.uri === expectedUri;
}
```

Use the actual installed `AssistantViewData` fields confirmed by the existing fixtures; do not cast application objects to arbitrary records in production code.

Run and observe RED:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-view-policy.test.ts test/travel-message.test.tsx
```

Expected RED: the policy module is missing and approved `data-view` parts are still suppressed from the transcript.

### Step 2: Make `TravelViewRegistry` the only trust boundary

Replace `travelViewPlacement` with `isInlineTravelView`. The component must remain deliberately small:

```tsx
if (!isInlineTravelView(view)) {
  return <p role="status">This travel view is unavailable.</p>;
}

return <NoodleAppView client={client} theme="light" view={view} />;
```

Do not add newest-view selection, generic URI checks, ID deduplication, or fallback reconstruction.

### Step 3: Render every message part chronologically

In `TravelMessage`, change the `data-view` branch to always render `TravelViewRegistry` at that part's current position:

```tsx
case 'data-view':
  return (
    <TravelViewRegistry
      client={client}
      key={`${message.id}-${partIndex}`}
      view={part.data}
    />
  );
```

Retain the pending structured input-request heading/copy changes already present in the working tree.

Extend `travel-message.test.tsx` to prove:

- prose, an approved search App, more prose, and an approved starter App keep that exact order;
- both distinct App identities reach separate `NoodleAppView` instances;
- an unrelated or mismatched identity renders only the safe unavailable status;
- confirmation, input-request, tool-result, and existing assistant text behavior remain intact.

### Step 4: Remove the superseded selector

Delete `journey-view.ts` and `journey-view.test.ts`. Confirm no source imports or references remain:

```bash
rg -n "latestJourneyView|travelViewPlacement|journey-view" apps/web/src apps/web/test
```

Expected result: no matches.

### Step 5: Verify and commit Task 1

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-view-policy.test.ts test/travel-message.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
git diff --check
```

Commit only the listed Task 1 files:

```bash
git add apps/web/src/lib/travel-view-policy.ts apps/web/test/travel-view-policy.test.ts apps/web/src/components/travel-view-registry.tsx apps/web/src/components/travel-message.tsx apps/web/test/travel-message.test.tsx apps/web/src/lib/journey-view.ts apps/web/test/journey-view.test.ts
git commit -m "feat: render Wayfare Apps inline in conversation"
```

---

## Task 2: Collapse the product into one centered conversation

**Files:**

- Modify: `apps/web/src/components/travel-conversation.tsx`
- Modify: `apps/web/src/components/trip-brief.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/travel-conversation.test.tsx`
- Modify: `apps/web/test/trip-brief.test.tsx`
- Delete: `apps/web/src/components/travel-journey-canvas.tsx`
- Delete: `apps/web/test/travel-journey-canvas.test.tsx`

### Step 1: Write the centered-shell regressions

Update the component tests before production code. Prove that a started journey renders exactly one `section[aria-label="Travel conversation"]`, one chronological transcript, one compact `Current trip` region when typed projection exists, and no `Travel workspace`, `Flight workspace`, `travel-journey-workspace`, or `travel-journey-canvas` landmark/class.

Keep lifecycle regressions explicit:

- initial prompt sends once;
- follow-up send scrolls/follows without losing the draft on busy rejection;
- Stop calls `client.abort()` only, preserves the draft, clears live tool copy, and disappears when ready;
- terminal hook errors suppress stale activity;
- retry uses the last attempted prompt;
- `ResizeObserver` disconnects;
- scrolling away from the end prevents forced follow until the next user send.

Run and observe RED:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-conversation.test.tsx test/trip-brief.test.tsx test/travel-journey-canvas.test.tsx
```

Expected RED: the side workspace and canvas are still rendered and the old test still expects their landmark.

### Step 2: Remove viewport-dependent composition

In `TravelConversation` remove:

- `useSyncExternalStore`;
- `MOBILE_WORKSPACE_QUERY` and all matchMedia helpers;
- `latestJourneyView` and `TravelJourneyCanvas` imports;
- `journeyView`, `conversationController`, `journeyCanvas`, and responsive array ordering;
- mobile-only inline height/overflow styles.

Return one semantic column in the same DOM order at every viewport:

```tsx
<section
  aria-busy={busy}
  aria-label="Travel conversation"
  className="travel-conversation-shell"
>
  <header className="travel-conversation__header">…</header>
  <TripBrief projection={projection} />
  <div className="travel-transcript">…chronological messages…</div>
  <p aria-live="polite" role="status">{statusLabel}</p>
  {errorPresentation ? <section className="assistant-error" role="alert">…</section> : null}
  <TravelComposer … />
  <p className="travel-attribution travel-attribution--workspace">…</p>
</section>
```

Do not alter the assistant hook/session boundary or event correlation while changing layout.

### Step 3: Make `TripBrief` compact and conversational

Keep it absent for `idle`. For typed state, keep `aria-label="Current trip"`, route, dates, travelers, cabin, currency, market, and phase. Style it as a compact wrap-capable summary immediately below the conversation heading, not as a sidebar or floating rail. Do not infer fields from prose.

### Step 4: Replace side-canvas CSS with one centered shell

Delete `.travel-journey-workspace`, `.travel-journey-workspace__body`, `.travel-journey-canvas`, and empty-canvas rules, including mobile grid reordering. Build the conversation around these invariants:

```css
.conversation-workspace {
  display: grid;
  min-height: calc(100dvh - var(--travel-header-height));
  place-items: stretch center;
}

.travel-conversation-shell {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto auto auto;
  width: min(100%, 64rem);
  min-height: 0;
  max-height: calc(100dvh - var(--travel-header-height));
}

.travel-transcript {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.travel-message--assistant > :not(noodle-app-view) {
  max-width: 48rem;
}

.travel-message noodle-app-view {
  display: block;
  width: 100%;
}
```

Adapt selectors to the actual message markup instead of relying on unsupported custom-element descendant assumptions. Keep the conversation composer visually anchored at the bottom of the column, with an opaque surface and keyboard-visible focus. The document must not need viewport-dependent DOM reordering.

### Step 5: Delete the side canvas and verify Task 2

Delete `travel-journey-canvas.tsx` and its test, then run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-conversation.test.tsx test/trip-brief.test.tsx test/travel-message.test.tsx test/conversation-scroll.test.ts test/travel-progress.test.ts
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web build
rg -n "Travel workspace|Flight workspace|travel-journey-workspace|travel-journey-canvas|TravelJourneyCanvas" apps/web/src apps/web/test
git diff --check
```

The `rg` command must return no production references; any remaining browser assertions are Task 3 REDs only.

Commit only the Task 2 files:

```bash
git add apps/web/src/components/travel-conversation.tsx apps/web/src/components/trip-brief.tsx apps/web/app/globals.css apps/web/test/travel-conversation.test.tsx apps/web/test/trip-brief.test.tsx apps/web/src/components/travel-journey-canvas.tsx apps/web/test/travel-journey-canvas.test.tsx
git commit -m "feat: center Wayfare on one travel conversation"
```

---

## Task 3: Prove the inline journey end to end and reconcile developer guidance

**Files:**

- Modify: `apps/web/test/browser/travel-shell.spec.ts`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/embedded-assistant-guide.md`
- Modify: `docs/customization.md`
- Modify: `test/repository-readiness.test.ts`

### Step 1: Replace the side-canvas browser fixture and assertions

In the deterministic SSE fixture, emit a conversation with:

1. assistant prose that deliberately does not encode a complete typed trip;
2. `data-view` for the exact search pair with a stable view ID;
3. assistant prose;
4. `data-view` for the exact starter pair with a different stable view ID;
5. a mismatched or unrelated view identity;
6. typed tool-result data that produces route, dates, traveler count, cabin, currency, and market in `Current trip`.

The browser proof must assert DOM and visual order: prose → first App → prose → second App → unavailable status. Both approved `noodle-app-view` elements remain in transcript history and expose their distinct identities. The unrelated view never reaches `NoodleAppView`.

Remove all selectors and expectations for `.travel-journey-workspace`, `.travel-journey-canvas`, `Travel workspace`, `Flight workspace`, newest-only selection, and mobile canvas/controller reordering.

### Step 2: Prove the centered responsive shell

For 320, 390, 768, and 1440 px viewports, assert:

- no horizontal overflow;
- conversation is centered and no wider than 64rem;
- assistant prose is narrower than full-width Apps;
- user turns remain visually right-aligned;
- the transcript scrolls independently while the composer remains reachable without calling `scrollIntoView` in the test;
- two approved App instances stay mounted after later turns;
- the current-trip summary is in the conversation and absent in idle state;
- every actionable control is at least 44×44 CSS pixels;
- keyboard focus is visible;
- 200% text zoom preserves content and composer access;
- with reduced motion, the root and every comma-separated transition/animation duration on relevant descendants resolve to zero seconds.

Run and observe RED before editing product code further:

```bash
PLAYWRIGHT_REUSE_SERVER=1 pnpm --filter @nuitee-travel-starter/web exec playwright test test/browser/travel-shell.spec.ts --workers=1 --reporter=list
```

Only adjust product code if a browser assertion exposes a real layout/accessibility defect; do not weaken viewport, identity, ordering, focus, target-size, or reduced-motion assertions.

### Step 3: Reconcile public documentation and repository contracts

Update current guidance to say:

- Wayfare is one centered conversation, not a controller-plus-canvas workspace;
- MCP Apps render inline at the message part that requires interaction;
- only the two exact tool/URI pairs are admitted;
- distinct view IDs are chronological invocations and are never generically deduplicated;
- typed projection powers the compact trip summary;
- local validation does not prove hosted behavior.

Keep older dated specs/plans as historical artifacts. The new dated spec is the authority where they conflict. Update repository-readiness assertions to read the actual current component/policy files rather than stale source locations.

### Step 4: Run the complete local verification matrix

Run in this order from the repository root:

```bash
pnpm agents:doctor
pnpm customize:check
pnpm audit:history
pnpm audit:licenses
env CI=true pnpm test
pnpm exec noodle validate --json
pnpm exec noodle test --json
pnpm exec noodle tools list --json
pnpm exec noodle check --json
pnpm check:live
pnpm check:embedded
pnpm check:embedded-host
pnpm check:web
git diff --check
git status --short
```

If `audit:licenses` reports `ERR_PNPM_MISSING_PACKAGE_INDEX_FILE`, rerun the exact command with the populated configured pnpm store available; do not change dependency versions merely to mask local store metadata. Record every JSON envelope and exit code honestly. Do not claim hosted behavior from these local gates.

### Step 5: Commit Task 3

```bash
git add apps/web/test/browser/travel-shell.spec.ts README.md docs/architecture.md docs/embedded-assistant-guide.md docs/customization.md test/repository-readiness.test.ts
git commit -m "test: prove the Wayfare inline conversation"
```

After the commit, rerun the full matrix on the exact committed SHA, run `git diff --check`, and require a clean worktree. Request a fresh whole-branch review against `fab5c1e` before preparing a PR or merge.

