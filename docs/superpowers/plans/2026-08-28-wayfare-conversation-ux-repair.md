# Wayfare Journey Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Wayfare from a framed chatbot into a conversation-controlled travel website with one persistent linked MCP flight-results canvas.

**Architecture:** The existing assistant hook remains the sole owner of session, messages, activity, and abort state. A pure typed selector assigns known `data-view` parts to an application-owned journey slot; the newest valid flight-results view mounts once through `NoodleAppView` outside the transcript, while text and structured interactions remain in the compact conversation controller.

**Tech Stack:** TypeScript, `@noodleseed/one` 0.145.1, `@noodleseed/assistant` 1.27.0, Next.js 16, React 19, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-28-wayfare-conversation-ux-repair-design.md`

## Global Constraints

- Guest-first public access and exact loopback origins remain unchanged.
- Search is read-only; selection uses app-issued opaque IDs; verification is the final supported action.
- Linked Apps render only through `NoodleAppView`; never fetch `ui://` URIs, inject `view.html`, or reconstruct flight UI from tool-result JSON.
- Only the exact `search_flights` plus `ui://nuitee_travel_mcp_app_starter/search_flights_widget` pair owns the current journey slot.
- Different view identities are not generically deduplicated; replacement is allowed only inside that explicit application-owned slot.
- Client code never parses traveler or assistant prose to infer airports, dates, passengers, currency, or market.
- One adult, Economy, USD, and the US pricing market remain the defaults when omitted.
- No hosted deploy, embed rebinding, origin change, secret change, or public release is authorized.
- Preserve visible keyboard focus, 44 px targets, Inter typography, light theme, reduced motion, and horizontal fit at 320, 390, 768, and 1440 px.

## File map

- Create `apps/web/src/lib/journey-view.ts`: finite placement map and newest-view selector.
- Create `apps/web/test/journey-view.test.ts`: identity, ordering, and fail-closed selector tests.
- Create `apps/web/src/components/travel-journey-canvas.tsx`: persistent linked App host and typed empty/progress states.
- Create `apps/web/test/travel-journey-canvas.test.tsx`: canvas rendering and failure-state tests.
- Modify `apps/web/src/components/travel-message.tsx`: keep known slotted views out of transcript messages.
- Modify `apps/web/src/components/travel-conversation.tsx`: compose trip strip, conversation controller, and journey canvas around the existing hook.
- Modify `apps/web/src/components/travel-assistant-page.tsx`: remove the old parent-owned chatbot-plus-sidebar composition.
- Modify `apps/web/src/components/trip-brief.tsx`: present validated state as the integrated route strip.
- Modify `apps/web/app/globals.css`: implement the desktop grid and mobile canvas/controller flow.
- Modify existing component and browser tests named in Tasks 3-5.

---

### Task 1: Preserve and verify the approved assistant-behavior foundation

**Files:**
- Modify/commit: `src/flight-schemas.ts`
- Modify/commit: `src/travel-server.ts`
- Modify/commit: `test/server-contract.test.ts`
- Modify/commit: `test/customization.test.ts`
- Modify/commit: `apps/web/src/lib/trip-projection.ts`
- Modify/commit: `apps/web/src/lib/travel-progress.ts`
- Modify/commit: `apps/web/test/trip-projection.test.ts`
- Modify/commit: `apps/web/test/travel-progress.test.ts`
- Modify/commit: `apps/web/next.config.ts`
- Create/commit: `apps/web/test/next-config.test.ts`

**Interfaces:**
- Produces: `plan_flight_search`, typed `FlightPlan`, defaulted `search_flights` input, and `TripProjection` support for planned/searching/result/error phases.
- Preserves: `search_flights`, `select_flight_offer`, and `verify_flight_offer` names and security boundaries.

- [ ] **Step 1: Verify the already-observed server RED to GREEN evidence remains represented in tests**

Confirm the focused tests assert the actual contract:

```ts
expect(guide.workflows).toEqual(expect.arrayContaining([
  expect.objectContaining({
    id: 'plan_and_search_flights',
    steps: [
      expect.objectContaining({ capability: { kind: 'tool', name: 'plan_flight_search' } }),
      expect.objectContaining({ capability: { kind: 'tool', name: 'search_flights' } }),
    ],
  }),
]));
expect(search.inputSchema.properties.currency.default).toBe('USD');
expect(search.inputSchema.properties.country.default).toBe('US');
```

- [ ] **Step 2: Run the focused foundation tests**

```bash
pnpm exec vitest run test/server-contract.test.ts test/customization.test.ts
pnpm --filter @nuitee-travel-starter/web exec vitest run test/trip-projection.test.ts test/travel-progress.test.ts test/next-config.test.ts
```

Expected: PASS with the planning tool, one-question guide, typed projection, activity mapping, and development-only CSP behavior covered.

- [ ] **Step 3: Validate the authored server manifests**

```bash
./node_modules/.bin/noodle validate --json
./node_modules/.bin/noodle validate src/embedded-server.ts --json
./node_modules/.bin/noodle check src/embedded-server.ts --target embedded-assistant --json
```

Expected: each command emits one `{ "ok": true, ... }` envelope. Existing disclosure or optional customer-auth warnings may remain warnings; no validation error is accepted.

- [ ] **Step 4: Commit only the verified foundation slice**

```bash
git add src/flight-schemas.ts src/travel-server.ts test/server-contract.test.ts test/customization.test.ts apps/web/src/lib/trip-projection.ts apps/web/src/lib/travel-progress.ts apps/web/test/trip-projection.test.ts apps/web/test/travel-progress.test.ts apps/web/next.config.ts apps/web/test/next-config.test.ts
git diff --cached --check
git commit -m "feat: simplify the Wayfare flight-planning contract"
```

### Task 2: Add the explicit journey-view slot selector

**Files:**
- Create: `apps/web/src/lib/journey-view.ts`
- Create: `apps/web/test/journey-view.test.ts`

**Interfaces:**
- Consumes: `readonly AssistantUIMessage[]` and `AssistantViewData` from `@noodleseed/assistant/client`.
- Produces: `travelViewPlacement(view): 'journey-canvas' | 'native-home' | null` and `latestJourneyView(messages): AssistantViewData | null`.

- [ ] **Step 1: Write the failing selector tests**

```ts
import type { AssistantUIMessage, AssistantViewData } from '@noodleseed/assistant/client';
import { latestJourneyView, travelViewPlacement } from '../src/lib/journey-view';

const first: AssistantViewData = {
  id: 'view-1',
  tool: 'search_flights',
  resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
  title: 'Flight results',
  result: { status: 'success' },
};
const latest: AssistantViewData = { ...first, id: 'view-2' };

it('selects the newest exact flight-results view for the journey canvas', () => {
  const messages: AssistantUIMessage[] = [{
    id: 'assistant-1',
    role: 'assistant',
    parts: [
      { type: 'data-view', data: first },
      { type: 'text', text: 'I refreshed the options.' },
      { type: 'data-view', data: latest },
    ],
  }];
  expect(latestJourneyView(messages)).toBe(latest);
});

it('keeps the native home view out of the journey canvas', () => {
  expect(travelViewPlacement({
    ...first,
    tool: 'open_travel_starter',
    resourceUri: 'ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget',
  })).toBe('native-home');
});

it('fails closed for a mismatched tool or resource URI', () => {
  expect(travelViewPlacement({ ...first, tool: 'manage_booking' })).toBeNull();
  expect(travelViewPlacement({ ...first, resourceUri: 'ui://unknown/results' })).toBeNull();
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/journey-view.test.ts
```

Expected: FAIL because `src/lib/journey-view.ts` does not exist.

- [ ] **Step 3: Implement the finite placement map and reverse selector**

```ts
import type { AssistantUIMessage, AssistantViewData } from '@noodleseed/assistant/client';

export type TravelViewPlacement = 'journey-canvas' | 'native-home';

export function travelViewPlacement(view: AssistantViewData): TravelViewPlacement | null {
  if (view.tool === 'search_flights' && view.resourceUri === 'ui://nuitee_travel_mcp_app_starter/search_flights_widget') {
    return 'journey-canvas';
  }
  if (view.tool === 'open_travel_starter' && view.resourceUri === 'ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget') {
    return 'native-home';
  }
  return null;
}

export function latestJourneyView(messages: readonly AssistantUIMessage[]): AssistantViewData | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const parts = messages[messageIndex]!.parts;
    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = parts[partIndex]!;
      if (part.type === 'data-view' && travelViewPlacement(part.data) === 'journey-canvas') {
        return part.data;
      }
    }
  }
  return null;
}
```

- [ ] **Step 4: Run the selector tests and typecheck**

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/journey-view.test.ts
pnpm --filter @nuitee-travel-starter/web typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit the selector**

```bash
git add apps/web/src/lib/journey-view.ts apps/web/test/journey-view.test.ts
git diff --cached --check
git commit -m "feat: slot linked flight views into the journey canvas"
```

### Task 3: Move linked Apps out of transcript messages

**Files:**
- Modify: `apps/web/src/components/travel-message.tsx`
- Modify: `apps/web/test/travel-message.test.tsx`

**Interfaces:**
- Consumes: `travelViewPlacement(view)` from Task 2.
- Produces: transcript rendering for text, confirmations, and input requests; known Wayfare views return `null` because their owning page region renders them.

- [ ] **Step 1: Replace the old multi-view expectation with a failing placement test**

```ts
it('keeps known linked travel views out of the conversational transcript', () => {
  const message: AssistantUIMessage = {
    id: 'assistant-views',
    role: 'assistant',
    parts: [
      { type: 'text', text: 'I found current options.' },
      { type: 'data-view', data: firstView },
      { type: 'data-view', data: secondView },
    ],
  };
  renderMessage(client, message);
  expect(screen.getByText('I found current options.')).toBeVisible();
  expect(document.querySelectorAll('noodle-app-view')).toHaveLength(0);
});
```

Keep the existing test proving an unapproved view renders the safe “This travel view is unavailable” status.

- [ ] **Step 2: Run the message test and verify RED**

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-message.test.tsx
```

Expected: FAIL because two `<noodle-app-view>` elements still render inline.

- [ ] **Step 3: Suppress only explicitly placed travel views**

```tsx
case 'data-view':
  return travelViewPlacement(part.data)
    ? null
    : <TravelViewRegistry client={client} view={part.data} />;
```

- [ ] **Step 4: Run the message and selector suites**

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-message.test.tsx test/journey-view.test.ts
```

Expected: PASS with known views suppressed and unknown views failing closed.

- [ ] **Step 5: Commit transcript placement**

```bash
git add apps/web/src/components/travel-message.tsx apps/web/test/travel-message.test.tsx
git diff --cached --check
git commit -m "fix: keep linked travel views out of the transcript"
```

### Task 4: Build the persistent journey canvas

**Files:**
- Create: `apps/web/src/components/travel-journey-canvas.tsx`
- Create: `apps/web/test/travel-journey-canvas.test.tsx`
- Modify: `apps/web/src/components/travel-view-registry.tsx`

**Interfaces:**
- Consumes: `AssistantClient`, `AssistantViewData | null`, and `TripProjection`.
- Produces: `<TravelJourneyCanvas client view projection />`, one `NoodleAppView` for the active slot, or a typed quiet state when no view exists.

- [ ] **Step 1: Write failing canvas tests**

```tsx
it('mounts the active linked App exactly once', () => {
  render(<TravelJourneyCanvas client={client} projection={searchProjection} view={view} />);
  expect(screen.getByRole('region', { name: 'Flight workspace' })).toBeVisible();
  const mounted = document.querySelectorAll('noodle-app-view');
  expect(mounted).toHaveLength(1);
  expect(mounted[0]?.view).toBe(view);
});

it('shows typed search progress without inventing result data', () => {
  render(<TravelJourneyCanvas client={client} projection={{
    ...EMPTY_TRIP,
    phase: 'searching',
    origin: 'ISB',
    destination: 'NYC',
  }} view={null} />);
  expect(screen.getByRole('status')).toHaveTextContent('Searching current flights');
  expect(document.querySelector('noodle-app-view')).not.toBeInTheDocument();
});

it('keeps an invalid-request result in the linked App instead of replacing it with prose', () => {
  const failedView = { ...view, result: { status: 'error', error: { code: 'invalid_request' } } };
  render(<TravelJourneyCanvas client={client} projection={errorProjection} view={failedView} />);
  expect(document.querySelector('noodle-app-view')?.view).toBe(failedView);
  expect(screen.queryByText('invalid_request')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the canvas test and verify RED**

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-journey-canvas.test.tsx
```

Expected: FAIL because `TravelJourneyCanvas` does not exist.

- [ ] **Step 3: Implement the minimal typed canvas**

```tsx
export function TravelJourneyCanvas({ client, projection, view }: Readonly<Props>) {
  return (
    <section aria-label="Flight workspace" className="travel-journey-canvas">
      {view ? (
        <TravelViewRegistry client={client} view={view} />
      ) : (
        <div className="travel-journey-canvas__empty" role="status">
          <h2>{projection.phase === 'searching' ? 'Searching current flights' : 'Your flight options'}</h2>
          <p>{canvasMessage(projection)}</p>
        </div>
      )}
    </section>
  );
}
```

Implement the copy from typed phase only:

```ts
function canvasMessage(projection: TripProjection): string {
  switch (projection.phase) {
    case 'planned':
    case 'searching':
      return 'Current options will appear here as soon as the search completes.';
    case 'error':
      return 'Adjust the trip in the conversation and search again.';
    case 'no-results':
      return 'Try different dates or airports.';
    case 'comparing':
    case 'selected':
    case 'verifying':
    case 'verified':
      return 'Your latest flight options stay here while you refine the trip.';
    case 'idle':
      return 'Tell Wayfare where you want to go.';
  }
}
```

- [ ] **Step 4: Run canvas, message, and typecheck gates**

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-journey-canvas.test.tsx test/travel-message.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit the canvas**

```bash
git add apps/web/src/components/travel-journey-canvas.tsx apps/web/src/components/travel-view-registry.tsx apps/web/test/travel-journey-canvas.test.tsx
git diff --cached --check
git commit -m "feat: add the persistent Wayfare journey canvas"
```

### Task 5: Compose the conversation-controlled website workspace

**Files:**
- Modify: `apps/web/src/components/travel-conversation.tsx`
- Modify: `apps/web/src/components/travel-assistant-page.tsx`
- Modify: `apps/web/src/components/trip-brief.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/travel-conversation.test.tsx`
- Modify: `apps/web/test/trip-brief.test.tsx`

**Interfaces:**
- Consumes: `latestJourneyView(messages)`, `TravelJourneyCanvas`, and the existing `TripProjection`.
- Produces: one `travel-journey-workspace` with route strip, compact conversation controller, and flexible journey canvas.

- [ ] **Step 1: Write the failing workspace regression**

Use two distinct linked views in the mocked assistant message, submit the hero prompt, and assert:

```tsx
const workspace = await screen.findByRole('region', { name: 'Travel workspace' });
const conversation = within(workspace).getByRole('region', { name: 'Travel conversation' });
const canvas = within(workspace).getByRole('region', { name: 'Flight workspace' });
expect(workspace).toContainElement(conversation);
expect(workspace).toContainElement(canvas);
expect(within(conversation).queryByText('Flight results')).not.toBeInTheDocument();
expect(canvas.querySelectorAll('noodle-app-view')).toHaveLength(1);
expect(canvas.querySelector('noodle-app-view')?.view).toBe(secondView);
expect(screen.queryByRole('complementary', { name: 'Live trip brief' })).not.toBeInTheDocument();
expect(screen.getByRole('region', { name: 'Current trip' })).toHaveTextContent('ISB → NYC');
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-conversation.test.tsx test/trip-brief.test.tsx
```

Expected: FAIL because the old parent still renders a framed conversation plus complementary sidebar.

- [ ] **Step 3: Move projection and view composition into `TravelConversation`**

```ts
const projection = useMemo(
  () => projectTrip(messages, terminal ? undefined : activity?.phase),
  [activity?.phase, messages, terminal],
);
const journeyView = useMemo(() => latestJourneyView(messages), [messages]);
```

Render:

```tsx
<section aria-label="Travel workspace" className="travel-journey-workspace">
  <TripBrief projection={projection} />
  <div className="travel-journey-workspace__body">
    <section aria-busy={busy} aria-label="Travel conversation" className="travel-conversation-shell">
      <header className="travel-conversation__header">
        <div>
          <p className="assistant-identity">{starterConfig.brand.assistantName}</p>
          <h1>{copy.title}</h1>
        </div>
      </header>
      <div className="travel-transcript" ref={transcriptViewportRef}>
        <ol aria-label="Conversation transcript" ref={transcriptContentRef} role="log">
          {messages.map((message) => (
            <li key={message.id}><TravelMessage client={client} message={message} /></li>
          ))}
        </ol>
      </div>
      <p aria-live="polite" role="status">{statusLabel}</p>
      {errorPresentation ? (
        <section className="assistant-error" role="alert">
          <h2>{errorPresentation.title}</h2>
          <p>{errorPresentation.message}</p>
          {errorPresentation.canRetry ? (
            <button type="button" onClick={() => sendFollowUp(lastPromptRef.current)}>
              Try again
            </button>
          ) : null}
        </section>
      ) : null}
      <TravelComposer
        busy={busy}
        formLabel="Continue trip"
        onStop={stopGenerating}
        onSubmit={sendFollowUp}
        placeholder={copy.placeholder}
        submitLabel="Continue trip"
        variant="conversation"
      />
      <p className="travel-attribution travel-attribution--workspace">
        Built on Noodle Seed · Powered by Nuitee
      </p>
    </section>
    <TravelJourneyCanvas client={client} projection={projection} view={journeyView} />
  </div>
</section>
```

Remove `projection` state, `onProjectionChange`, and the old sibling `TripBrief` from `TravelAssistantPage`.

- [ ] **Step 4: Convert `TripBrief` to the integrated route strip**

Use `role="region"`, `aria-label="Current trip"`, and the existing validated fields. Keep it absent while phase is `idle`. Do not add editable controls or parse conversation text.

- [ ] **Step 5: Replace chatbot CSS with the journey workspace layout**

```css
.travel-journey-workspace {
  width: min(100%, 90rem);
  margin-inline: auto;
}
.travel-journey-workspace__body {
  display: grid;
  grid-template-columns: minmax(20rem, 24rem) minmax(0, 1fr);
  gap: clamp(1.25rem, 3vw, 2.5rem);
}
.travel-conversation-shell {
  width: auto;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.travel-journey-canvas {
  min-width: 0;
  min-height: 36rem;
  overflow: clip;
  border: 1px solid var(--travel-boundary);
  border-radius: 24px;
  background: var(--travel-raised);
}
```

At `max-width: 760px`, use one column, put `.travel-journey-canvas` first, keep the composer sticky at `bottom: 0`, and remove movement transitions under `prefers-reduced-motion: reduce`.

- [ ] **Step 6: Run focused tests, typecheck, and build**

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/journey-view.test.ts test/travel-message.test.tsx test/travel-journey-canvas.test.tsx test/travel-conversation.test.tsx test/trip-brief.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web build
```

Expected: PASS; `/` and `/developers` remain buildable.

- [ ] **Step 7: Commit the integrated workspace**

```bash
git add apps/web/src/components/travel-conversation.tsx apps/web/src/components/travel-assistant-page.tsx apps/web/src/components/trip-brief.tsx apps/web/app/globals.css apps/web/test/travel-conversation.test.tsx apps/web/test/trip-brief.test.tsx
git diff --cached --check
git commit -m "feat: turn Wayfare into a conversation-controlled workspace"
```

### Task 6: Prove responsive MCP UI behavior and preserve the hosted boundary

**Files:**
- Modify: `apps/web/test/browser/travel-shell.spec.ts`
- Modify: `README.md`
- Modify: `docs/EMBEDDED_ASSISTANT.md`
- Modify: `docs/PREMIUM_UI_PLAN.md`
- Modify: `docs/architecture.md`
- Modify: `docs/customization.md`
- Modify: `docs/nuitee-flights-contract.md`
- Modify: `docs/oauth.md`

**Interfaces:**
- Proves: one current MCP App view, no inline transcript views, desktop/mobile fit, keyboard reachability, reduced motion, and honest local-versus-hosted claims.

- [ ] **Step 1: Add the failing browser composition checks**

Return this exact SSE shape from the deterministic `turns` route so the public SDK produces two typed views in one known slot:

```ts
const result = {
  status: 'success',
  message: 'Current flight options',
  fallback: 'Current flight options',
  searchContext: {
    origin: 'ISB',
    destination: 'NYC',
    departureDate: '2026-09-18',
    adults: 1,
    children: 0,
    infants: 0,
    childrenAges: [],
    infantAges: [],
    cabinClass: 'ECONOMY',
    currency: 'USD',
    country: 'US',
  },
  itineraries: [],
};
const view = (id: string) => ({
  id,
  tool: 'search_flights',
  resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
  title: 'Flight results',
  result,
  html: '<!doctype html><html><body><main>Flight results</main></body></html>',
});
const frame = (event: string, data: unknown) => (
  `event: ${event}\ndata: ${JSON.stringify(data)}`
);
await route.fulfill({
  status: 200,
  contentType: 'text/event-stream',
  body: [
    frame('tool_completed', { id: 'view-1', tool: 'search_flights', result }),
    frame('view_available', view('view-1')),
    frame('tool_completed', { id: 'view-2', tool: 'search_flights', result }),
    frame('view_available', view('view-2')),
    frame('done', {}),
    '',
  ].join('\n\n'),
});
```

Assert:

```ts
await expect(page.getByRole('region', { name: 'Travel workspace' })).toBeVisible();
await expect(page.getByRole('region', { name: 'Flight workspace' }).locator('noodle-app-view')).toHaveCount(1);
await expect(page.getByRole('region', { name: 'Travel conversation' }).locator('noodle-app-view')).toHaveCount(0);
await expect(page.getByRole('region', { name: 'Current trip' })).toContainText('ISB → NYC');
```

At 1440 px assert the conversation is left of the canvas. At 390 px assert the canvas is above the conversation, the composer is reachable, and `document.documentElement.scrollWidth === 390`. Repeat horizontal fit at 320, 768, and 1440 px.

- [ ] **Step 2: Run Playwright and verify RED before correction**

```bash
PLAYWRIGHT_REUSE_SERVER=1 pnpm --filter @nuitee-travel-starter/web exec playwright test test/browser/travel-shell.spec.ts --workers=1 --reporter=list
```

Expected: FAIL on missing workspace/canvas composition or duplicate linked views, not on fixture setup.

- [ ] **Step 3: Correct only the selectors proven wrong by the browser assertions**

If desktop order fails, adjust `grid-template-columns` or grid placement on `.travel-journey-workspace__body`. If mobile order fails, set `.travel-journey-canvas { grid-row: 1; }` and `.travel-conversation-shell { grid-row: 2; }` inside the 760 px media query. If the composer is unreachable, apply `position: sticky; bottom: 0; z-index: 2;` to `.travel-composer--conversation` with an opaque light background. Do not weaken viewport, landmark, view-count, focus, target-size, or reduced-motion assertions.

- [ ] **Step 4: Run the complete local verification matrix**

```bash
pnpm exec vitest run
pnpm --filter @nuitee-travel-starter/web test
pnpm --filter @nuitee-travel-starter/web typecheck
PLAYWRIGHT_REUSE_SERVER=1 pnpm --filter @nuitee-travel-starter/web exec playwright test --workers=1 --reporter=list
pnpm --filter @nuitee-travel-starter/web build
./node_modules/.bin/noodle validate --json
./node_modules/.bin/noodle test --json
./node_modules/.bin/noodle check --json
./node_modules/.bin/noodle validate src/embedded-server.ts --json
./node_modules/.bin/noodle check src/embedded-server.ts --target embedded-assistant --json
git diff --check
```

Expected: every command exits 0. Record exact test counts and any documented warning envelopes.

- [ ] **Step 5: Re-run read-only hosted evidence without mutating it**

```bash
./node_modules/.bin/noodle deployments inspect nuitee-travel-mcp-app-starter-bad7b645ec13e475 --org u-wahab-d5072f54 --json
./node_modules/.bin/noodle metrics --org u-wahab-d5072f54 --app nuitee-travel-mcp-app-starter --env dev --window 24h --agent-output --json
```

Expected: record the deployment id/version and explicitly state that local green gates do not update the hosted public embed. Do not run deploy, link, secret, variable, access, or embed mutation commands.

- [ ] **Step 6: Update documentation to match the implemented architecture**

Documentation must say:

- the website owns one persistent current flight-results slot;
- linked Apps still mount through the official host;
- the conversation controls the journey canvas rather than containing it;
- hosted behavior remains unproven until a separately authorized deployment and embed-binding verification.

- [ ] **Step 7: Commit browser proof and documentation**

```bash
git add apps/web/test/browser/travel-shell.spec.ts README.md docs/EMBEDDED_ASSISTANT.md docs/PREMIUM_UI_PLAN.md docs/architecture.md docs/customization.md docs/nuitee-flights-contract.md docs/oauth.md
git diff --cached --check
git commit -m "test: prove the Wayfare journey workspace"
```

- [ ] **Step 8: Verify the committed tree**

Run the complete matrix from Step 4 again against committed HEAD, then:

```bash
git status --short
git diff --check
```

Expected: clean worktree and no diff errors. If unrelated user changes remain, list them exactly rather than claiming the worktree is clean.
