# Cinematic Conversation-First Flight Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current neutral developer-workspace shell with the approved cinematic, consumer-facing, conversation-first flight discovery experience while preserving the existing guest assistant and Search → Select → Verify MCP boundary.

**Architecture:** Keep `TravelAssistantPage` as the presentation-state owner and keep `TravelConversation` as the only owner of the headless Assistant client. Add a consumer header and validated trip brief around that client, give the zero state a responsive generated-image hero, render structured input requests through a bounded schema adapter, and restyle the existing `flight-results` MCP App instead of duplicating fare UI in the host.

**Tech Stack:** Next.js 16.3.3, React 19.2.8, TypeScript 7.0.2, `@noodleseed/assistant` 1.27.0, `@noodleseed/one` 0.144.2, Vitest 4.1.10, Testing Library 16.3.2, Playwright 1.62.1, CSS, Next Image, Noodle MCP Apps

**Spec:** `docs/superpowers/specs/2026-08-28-cinematic-conversation-first-flight-experience-design.md`

## Global Constraints

- The product ends at a verified fare. Do not add booking, prebooking, reservation holds, payment, passenger identity, ticketing, check-in, flight status, cancellation, or refunds.
- Keep `TravelConversation` on `useNoodleAssistant`; keep linked views on `NoodleAppView`; do not implement another assistant transport, tool client, or host-owned fare-result renderer.
- Keep the existing server tool schemas, provider normalization, opaque selection IDs, and caller-scoped state unchanged.
- The host trip brief uses only validated `TripProjection` values. It never parses assistant prose or stores provider identifiers.
- The generated hero image is decorative, receives `alt=""`, and is protected by a deterministic navy scrim.
- Keep the site light-only. Respect 390px, 320px, 200% text zoom, keyboard use, 44px controls, and `prefers-reduced-motion`.
- Render `Built on Noodle Seed · Powered by Nuitee` as secondary copy on the hero and result/verification experience.
- `Vayora` remains a wireframe label only. Render `starterConfig.brand`; do not hard-code a new public brand or domain.
- Preserve every unrelated pre-existing worktree modification, including the Noodle, Assistant, and Next package upgrades. Never reset, revert, or stage unrelated files.
- Use test-driven development: add a focused failing assertion, observe the intended failure, implement the smallest coherent slice, and rerun the focused gate before committing.
- Do not deploy, change hosted configuration or budgets, open a PR, merge, or repair the separately observed provider/tool failure under this plan.

---

### Task 1: Build the cinematic zero state and composer variant

**Files:**
- Track: `apps/web/public/images/conversation-hero-v1.png`
- Modify: `apps/web/src/components/travel-zero-state.tsx`
- Modify: `apps/web/src/components/travel-composer.tsx`
- Modify: `apps/web/src/components/travel-assistant-page.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/travel-zero-state.test.tsx`
- Modify: `apps/web/test/travel-theme.test.ts`

**Interfaces:**
- Consumes: `starterConfig.brand`, `starterConfig.prompts`, `TravelZeroStateProps.onStart(prompt)`, and the approved image asset.
- Produces: `TravelComposer` props `variant?: 'hero' | 'conversation'`, `placeholder?: string`, and `visibleSubmitLabel?: string`; a cinematic zero state that still mounts no assistant client.

- [ ] **Step 1: Write the failing hero contract**

Replace the old zero-state expectations and add the asset/attribution assertions in `travel-zero-state.test.tsx`:

```tsx
it('renders a cinematic consumer entry without mounting developer chrome', () => {
  const { container } = render(
    <TravelAssistantPage
      runtime={{ status: 'setup-required', message: 'setup' }}
    />,
  );

  expect(screen.getByRole('heading', {
    name: 'Tell us where you want to be.',
  })).toBeVisible();
  expect(screen.getByText('A new way to find your flight')).toBeVisible();
  expect(screen.getByText(
    'Built on Noodle Seed · Powered by Nuitee',
  )).toBeVisible();
  expect(screen.getByRole('button', { name: 'Plan my flight' })).toBeDisabled();
  expect(container.querySelector('img[alt=""]')).toHaveAttribute(
    'src',
    expect.stringContaining('conversation-hero-v1'),
  );
  expect(screen.queryByText('No trip started')).not.toBeInTheDocument();
  expect(screen.queryByTestId('workspace-atmosphere')).not.toBeInTheDocument();
});
```

Keep the existing assertion that `useNoodleAssistant` is not called before submit in `travel-conversation.test.tsx`.

- [ ] **Step 2: Run the focused tests and observe RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-zero-state.test.tsx test/travel-theme.test.ts
```

Expected: FAIL because the old heading, icon-only composer, trip rail, and shader atmosphere still render.

- [ ] **Step 3: Add explicit composer presentation props**

Extend the composer interface without changing submit, busy, stop, or draft-preservation behavior:

```tsx
interface TravelComposerProps {
  readonly busy?: boolean;
  readonly formLabel?: string;
  readonly onStop?: () => void;
  readonly onSubmit: (prompt: string) => void;
  readonly placeholder?: string;
  readonly submitLabel?: string;
  readonly variant?: 'hero' | 'conversation';
  readonly visibleSubmitLabel?: string;
}
```

Apply `travel-composer--hero` only for the hero. In the hero variant, render the visible label beside `ArrowUp`; in the conversation variant, retain the compact icon-only action and `Stop generating` control. Use the supplied placeholder rather than branching on page state inside the composer.

- [ ] **Step 4: Replace the zero state markup**

Use `next/image` and keep the semantic region as the skip-link target:

```tsx
<section
  className="travel-hero"
  aria-labelledby="travel-home-title"
  id="travel-canvas"
  tabIndex={-1}
>
  <Image
    alt=""
    className="travel-hero__image"
    fill
    priority
    sizes="100vw"
    src="/images/conversation-hero-v1.png"
  />
  <div aria-hidden="true" className="travel-hero__scrim" />
  <div className="travel-hero__content">
    <div className="travel-hero__copy">
      <p className="assistant-identity">A new way to find your flight</p>
      <h1 id="travel-home-title">Tell us where you want to be.</h1>
      <p>Describe the trip in your own words. We’ll shape the details, compare live options, and verify the fare you choose.</p>
    </div>
    <TravelComposer
      formLabel="Start a trip"
      onSubmit={onStart}
      placeholder="Islamabad to Rome for two, next weekend"
      submitLabel="Plan my flight"
      variant="hero"
      visibleSubmitLabel="Plan my flight"
    />
    <p className="travel-attribution">Built on Noodle Seed · Powered by Nuitee</p>
  </div>
</section>
```

Render at most two configured starter prompts and keep `launchError` as the one alert below the composer.

- [ ] **Step 5: Add the fixed-light hero tokens and layout**

Replace the old atmosphere-dependent zero-state selectors with these root tokens and structural rules:

```css
:root {
  color-scheme: light;
  --travel-paper: #fbfaf7;
  --travel-raised: #ffffff;
  --travel-navy: #14213d;
  --travel-blue: #245aa8;
  --travel-ink: #19202b;
  --travel-muted: #657083;
  --travel-boundary: #d9dee6;
  --travel-success-wash: #d9eee6;
  --travel-success-ink: #17694c;
}

.travel-hero {
  position: relative;
  display: grid;
  min-height: 100svh;
  overflow: hidden;
  isolation: isolate;
}

.travel-hero__image { object-fit: cover; object-position: 62% center; }
.travel-hero__scrim {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: linear-gradient(90deg, rgb(12 29 50 / 78%) 0%, rgb(12 29 50 / 38%) 48%, rgb(12 29 50 / 14%) 76%), linear-gradient(0deg, rgb(12 29 50 / 58%) 0%, transparent 46%);
}
.travel-hero__content {
  position: relative;
  z-index: 2;
  display: grid;
  align-content: end;
  gap: 1.25rem;
  min-height: 100svh;
  padding: clamp(6rem, 13vh, 9rem) clamp(1rem, 6vw, 5rem) clamp(1.5rem, 6vh, 3rem);
}

@media (max-width: 700px) {
  .travel-hero__image { object-position: 68% center; }
  .travel-hero__content {
    align-content: end;
    gap: 1rem;
    padding: 5.5rem 1rem 1rem;
  }
  .travel-composer--hero .travel-composer__controls {
    align-items: stretch;
    flex-direction: column;
  }
  .travel-composer--hero button[type='submit'] { width: 100%; }
  .travel-starter-prompts > :nth-child(n + 2) { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .travel-hero,
  .travel-hero * { transition-duration: 0.01ms !important; }
}
```

Cap the hero copy measure at `42rem`, cap the hero composer at `65rem`, and size the headline with `clamp(2.75rem, 7vw, 6.5rem)`. Use a serif system fallback for hero/display headings and the existing sans stack for controls and data. Keep the full phrase `where you want to be.` together with a non-breaking wrapper at desktop and allow it to wrap as a phrase at mobile so the final word is never orphaned. Do not add a remote font request.

- [ ] **Step 6: Run the focused tests and commit**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-zero-state.test.tsx test/travel-theme.test.ts test/travel-conversation.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
```

Expected: PASS, including delayed assistant initialization and existing composer lifecycle coverage.

Commit only the task files:

```bash
git add apps/web/public/images/conversation-hero-v1.png apps/web/src/components/travel-zero-state.tsx apps/web/src/components/travel-composer.tsx apps/web/src/components/travel-assistant-page.tsx apps/web/app/globals.css apps/web/test/travel-zero-state.test.tsx apps/web/test/travel-theme.test.ts
git commit -m "feat: add cinematic conversation-first travel hero"
```

---

### Task 2: Replace the developer rail with consumer header and trip brief

**Files:**
- Create: `apps/web/src/components/travel-header.tsx`
- Create: `apps/web/src/components/trip-brief.tsx`
- Create: `apps/web/test/travel-header.test.tsx`
- Create: `apps/web/test/trip-brief.test.tsx`
- Modify: `apps/web/src/components/travel-assistant-page.tsx`
- Modify: `apps/web/app/globals.css`
- Delete: `apps/web/src/components/trip-context-rail.tsx`
- Modify: `apps/web/test/travel-zero-state.test.tsx`
- Modify: `apps/web/test/travel-conversation.test.tsx`

**Interfaces:**
- Consumes: `starterConfig.brand`, `starterConfig.website.developerPath`, `TripProjection`, `onNewTrip()`, and `onOpenSettings()`.
- Produces: `TravelHeader({ mode, onNewTrip, onOpenSettings })` and `TripBrief({ projection })`; `TravelAssistantPage` composes both without moving Assistant client ownership.

- [ ] **Step 1: Write failing header and trip-brief tests**

Create `travel-header.test.tsx`:

```tsx
it('exposes only honest consumer and developer navigation', () => {
  render(<TravelHeader mode="hero" onNewTrip={vi.fn()} onOpenSettings={vi.fn()} />);

  expect(screen.getByText(starterConfig.brand.name)).toBeVisible();
  expect(screen.getByRole('link', { name: 'For developers' })).toHaveAttribute(
    'href', starterConfig.website.developerPath,
  );
  expect(screen.getByText('Guest trip')).toBeVisible();
  expect(screen.queryByText(/Manage booking|Check in|Flight status/i))
    .not.toBeInTheDocument();
});
```

Create `trip-brief.test.tsx`:

```tsx
it('renders only validated projected trip facts', () => {
  render(<TripBrief projection={{
    phase: 'comparing',
    origin: 'ISB',
    destination: 'FCO',
    departureDate: '2026-09-11',
    returnDate: '2026-09-15',
    travelers: '2 adults',
  }} />);

  expect(screen.getByRole('complementary', { name: 'Live trip brief' }))
    .toHaveTextContent('ISB → FCO');
  expect(screen.getByText('Comparing fares')).toBeVisible();
  expect(screen.queryByText('Provider offer')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused tests and observe RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-header.test.tsx test/trip-brief.test.tsx
```

Expected: FAIL because both components are absent.

- [ ] **Step 3: Implement `TravelHeader`**

Use one header component for both visual modes:

```tsx
interface TravelHeaderProps {
  readonly mode: 'hero' | 'conversation';
  readonly onNewTrip: () => void;
  readonly onOpenSettings: () => void;
}

export function TravelHeader({ mode, onNewTrip, onOpenSettings }: Readonly<TravelHeaderProps>) {
  return (
    <header className={`travel-header travel-header--${mode}`}>
      <a className="travel-wordmark" href="/">
        <span aria-hidden="true" className="travel-wordmark__mark">{starterConfig.brand.mark}</span>
        <span>{starterConfig.brand.name}</span>
      </a>
      <nav aria-label="Primary navigation">
        {mode === 'conversation' ? <button type="button" onClick={onNewTrip}>New trip</button> : null}
        <a href={starterConfig.website.developerPath}>For developers</a>
        <button type="button" onClick={onOpenSettings}>Settings</button>
      </nav>
      <span className="guest-session">Guest trip</span>
    </header>
  );
}
```

All three interactive controls remain at least 44px. On mobile, keep the brand visible, reduce the developer link to its visible short label, and keep Settings accessible by name.

- [ ] **Step 4: Implement `TripBrief` as a pure projection**

Move the phase map from `trip-context-rail.tsx` into `trip-brief.tsx`. Render route, dates, traveller count, and status only when present. Keep the component free of Assistant client imports, parsing, and mutation callbacks:

```tsx
export function TripBrief({ projection }: Readonly<{ projection: TripProjection }>) {
  return (
    <aside aria-label="Live trip brief" className="trip-brief">
      <p className="trip-brief__eyebrow">Live trip brief</p>
      <h2>What we understand</h2>
      {(projection.origin || projection.destination) ? (
        <p className="trip-brief__route">
          <strong>{projection.origin ?? '—'}</strong>
          <span aria-hidden="true">→</span>
          <strong>{projection.destination ?? '—'}</strong>
        </p>
      ) : null}
      <dl>{/* conditionally render validated facts */}</dl>
      <p className="trip-brief__status">{PHASE_LABELS[projection.phase]}</p>
    </aside>
  );
}
```

- [ ] **Step 5: Recompose `TravelAssistantPage`**

Remove `TripContextRail` and `WorkspaceAtmosphere`. Render `TravelHeader` above the active screen. In conversation mode, use:

```tsx
<main className="conversation-workspace" id="travel-canvas" tabIndex={-1}>
  <TravelConversation
    initialPrompt={initialPrompt}
    onProjectionChange={setProjection}
    onReset={reset}
    runtime={runtime}
  />
  <TripBrief projection={projection} />
</main>
```

Keep the settings dialog outside the inert application wrapper and preserve `reset()` as the one state-clearing path.

- [ ] **Step 6: Run focused lifecycle and projection gates**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-header.test.tsx test/trip-brief.test.tsx test/travel-zero-state.test.tsx test/travel-conversation.test.tsx test/trip-projection.test.ts
pnpm --filter @nuitee-travel-starter/web typecheck
```

Expected: PASS; reset still returns projection to `EMPTY_TRIP`, and no assistant mounts on the hero.

- [ ] **Step 7: Commit the consumer shell**

```bash
git add apps/web/src/components/travel-header.tsx apps/web/src/components/trip-brief.tsx apps/web/src/components/travel-assistant-page.tsx apps/web/app/globals.css apps/web/test/travel-header.test.tsx apps/web/test/trip-brief.test.tsx apps/web/test/travel-zero-state.test.tsx apps/web/test/travel-conversation.test.tsx
git rm apps/web/src/components/trip-context-rail.tsx
git commit -m "feat: add consumer travel header and live trip brief"
```

---

### Task 3: Shape the conversation workspace around the approved hierarchy

**Files:**
- Modify: `apps/web/src/components/travel-conversation.tsx`
- Modify: `apps/web/src/components/travel-message.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/travel-conversation.test.tsx`
- Modify: `apps/web/test/travel-message.test.tsx`

**Interfaces:**
- Consumes: unchanged `ReadyPublicAssistantRuntime`, initial prompt, `TravelComposer` conversation variant, and typed `AssistantUIMessage` parts.
- Produces: a neutral conversation canvas with application-owned headings, message roles, stable status/error/composer regions, and linked App views that retain `view.id + resourceUri` identity.

- [ ] **Step 1: Add failing conversation-structure assertions**

Add to `travel-conversation.test.tsx` after first submit:

```tsx
expect(screen.getByRole('heading', { name: 'Your trip, refined together' }))
  .toBeVisible();
expect(screen.getByRole('region', { name: 'Travel conversation' }))
  .toHaveClass('travel-conversation-shell');
expect(screen.getByRole('form', { name: 'Continue trip' }))
  .toHaveClass('travel-composer--conversation');
expect(screen.getByText('Built on Noodle Seed · Powered by Nuitee'))
  .toBeVisible();
```

Retain the existing tests for single initial send, busy draft preservation, Stop, terminal activity suppression, retry, scrolling, and view identity.

- [ ] **Step 2: Run focused tests and observe RED**

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-conversation.test.tsx test/travel-message.test.tsx
```

Expected: FAIL on the new heading, shell class, composer variant, and attribution.

- [ ] **Step 3: Update conversation markup without changing client effects**

Keep all existing effects and client callbacks intact. Change only the rendered structure:

```tsx
<section
  aria-busy={busy}
  aria-label="Travel conversation"
  className="travel-conversation-shell"
>
  <header className="travel-conversation__header">
    <div>
      <p className="assistant-identity">{starterConfig.brand.assistantName}</p>
      <h1>Your trip, refined together</h1>
    </div>
    <button type="button" onClick={resetConversation}>Reset conversation</button>
  </header>
  <div className="travel-transcript" ref={transcriptViewportRef}>{/* existing log */}</div>
  <p aria-live="polite" role="status">{statusLabel}</p>
  {/* existing safe error */}
  <TravelComposer
    busy={busy}
    formLabel="Continue trip"
    onStop={stopGenerating}
    onSubmit={sendFollowUp}
    placeholder="Ask to compare, adjust, or verify…"
    submitLabel="Continue trip"
    variant="conversation"
  />
  <p className="travel-attribution travel-attribution--workspace">Built on Noodle Seed · Powered by Nuitee</p>
</section>
```

Do not add a second results panel or pull `data-view` parts out of their originating message.

- [ ] **Step 4: Implement responsive workspace CSS**

Use a two-column parent from Task 2:

```css
.conversation-workspace {
  display: grid;
  min-height: calc(100svh - 74px);
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 21rem);
  background: radial-gradient(circle at 82% 0%, #dbe7ef 0, transparent 30%), var(--travel-paper);
}
.travel-conversation-shell {
  display: grid;
  width: min(100%, 54rem);
  min-width: 0;
  margin-inline: auto;
  padding: clamp(1.25rem, 4vw, 3rem);
  grid-template-rows: auto minmax(20rem, 1fr) auto auto auto;
}
```

At 700px and below, make the workspace one column, place the trip brief above the conversation content, and remove fixed heights that would clip 200% text.

- [ ] **Step 5: Run focused gates and commit**

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-conversation.test.tsx test/travel-message.test.tsx test/conversation-scroll.test.ts test/travel-progress.test.ts
pnpm --filter @nuitee-travel-starter/web typecheck
```

Expected: PASS with unchanged Assistant lifecycle behavior.

```bash
git add apps/web/src/components/travel-conversation.tsx apps/web/src/components/travel-message.tsx apps/web/app/globals.css apps/web/test/travel-conversation.test.tsx apps/web/test/travel-message.test.tsx
git commit -m "feat: reshape the travel conversation workspace"
```

---

### Task 4: Render bounded structured clarification controls

**Files:**
- Create: `apps/web/src/lib/input-request.ts`
- Create: `apps/web/test/input-request.test.ts`
- Modify: `apps/web/src/components/travel-message.tsx`
- Modify: `apps/web/test/travel-message.test.tsx`
- Modify: `apps/web/app/globals.css`

**Interfaces:**
- Consumes: `AssistantInputRequestData.requestedSchema`, `AssistantClient.respond(id, response)`, and the existing single-response lock.
- Produces: `parseTravelInputSchema(schema): readonly TravelInputField[] | null`, with supported field kinds `text`, `date`, `integer`, and `select`; accepted responses use `{ action: 'accept', content: values }`.

- [ ] **Step 1: Write failing schema-adapter tests**

Create `input-request.test.ts`:

```ts
it('accepts a bounded travel object schema', () => {
  expect(parseTravelInputSchema({
    type: 'object',
    properties: {
      departureDate: { type: 'string', format: 'date', title: 'Departure date' },
      cabinClass: {
        type: 'string',
        title: 'Cabin',
        enum: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'],
      },
    },
    required: ['departureDate'],
  })).toEqual([
    { kind: 'date', name: 'departureDate', label: 'Departure date', required: true },
    { kind: 'select', name: 'cabinClass', label: 'Cabin', required: false, options: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] },
  ]);
});

it('fails closed for unknown fields and unbounded schemas', () => {
  expect(parseTravelInputSchema({
    type: 'object',
    properties: { creditCard: { type: 'string' } },
  })).toBeNull();
});
```

Allow only `origin`, `destination`, `departureDate`, `returnDate`, `adults`, `children`, `infants`, `cabinClass`, `currency`, and `country`. Reject more than six fields, nested objects/arrays, patterns, free-form HTML labels, and enums outside bounded strings.

- [ ] **Step 2: Run the adapter test and observe RED**

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/input-request.test.ts
```

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement the pure schema adapter**

Define:

```ts
export type TravelInputField =
  | { readonly kind: 'text' | 'date'; readonly name: string; readonly label: string; readonly required: boolean }
  | { readonly kind: 'integer'; readonly name: string; readonly label: string; readonly required: boolean; readonly minimum: number; readonly maximum: number }
  | { readonly kind: 'select'; readonly name: string; readonly label: string; readonly required: boolean; readonly options: readonly string[] };

export function parseTravelInputSchema(
  schema: Readonly<Record<string, unknown>>,
): readonly TravelInputField[] | null;
```

Map integer travellers to bounds `0–9`, with `adults` requiring `1–9`. Cap labels at 50 display characters and derive safe fallback labels from the field map rather than arbitrary property names.

- [ ] **Step 4: Add failing renderer interaction coverage**

In `travel-message.test.tsx`, render a pending `data-input-request` with the two-field schema above. Assert:

```tsx
expect(screen.getByLabelText('Departure date')).toHaveAttribute('type', 'date');
expect(screen.getByRole('combobox', { name: 'Cabin' })).toBeVisible();
fireEvent.change(screen.getByLabelText('Departure date'), { target: { value: '2026-09-11' } });
fireEvent.change(screen.getByRole('combobox', { name: 'Cabin' }), { target: { value: 'BUSINESS' } });
fireEvent.submit(screen.getByRole('form', { name: 'Complete trip details' }));
expect(client.respond).toHaveBeenCalledWith('input-trip', {
  action: 'accept',
  content: { departureDate: '2026-09-11', cabinClass: 'BUSINESS' },
});
```

Also retain a fail-closed test that an unsupported schema shows the safe cancellation path and never collects the requested value.

- [ ] **Step 5: Replace the generic input-request refusal with the bounded form**

Use native input/select controls, local state, and the existing `useSingleInteractionResponse`. Submit exactly once. When the adapter returns `null`, keep the current safe message and `Cancel request` action. Do not send a normal chat message or call any MCP tool directly.

- [ ] **Step 6: Run focused gates and commit**

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/input-request.test.ts test/travel-message.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
```

Expected: PASS for accepted fields, unsupported schemas, cancellation, and single-response locking.

```bash
git add apps/web/src/lib/input-request.ts apps/web/src/components/travel-message.tsx apps/web/app/globals.css apps/web/test/input-request.test.ts apps/web/test/travel-message.test.tsx
git commit -m "feat: add safe conversational trip clarifications"
```

---

### Task 5: Align the existing flight-results MCP App with the consumer experience

**Files:**
- Modify: `src/views/flight-results.tsx`
- Modify: `src/views/travel.css`
- Modify: `test/widgets.test.tsx`
- Modify: `test/browser/widgets.browser.test.tsx`

**Interfaces:**
- Consumes: unchanged `SearchOutput`, `Itinerary`, `Verification`, `useCallTool`, `useUpdateModelContext`, and App-owned selection state.
- Produces: the same `FlightResultsView` contract with the approved hierarchy and copy; no schema, tool, state-handle, or provider changes.

- [ ] **Step 1: Add failing copy and boundary assertions**

Extend `test/widgets.test.tsx`:

```tsx
const html = renderToStaticMarkup(
  <FlightResultsView result={result} displayMode="inline" onVerify={vi.fn()} />,
);
expect(html).toContain('Current flight options');
expect(html).toContain('Select fare');
expect(html).not.toMatch(/Book|Continue to payment|fare held/i);
expect(html).toContain('Lowest fare');
```

Only render `Lowest fare` when `itinerary.isCheapest` is true. Do not introduce a `Best overall` claim because the current structured output has no grounded overall ranking.

Change the selected action expectation from `Verify selected fare` to `Verify current fare`, while retaining its full route/carrier accessible label.

- [ ] **Step 2: Run widget tests and observe RED**

```bash
pnpm exec vitest run test/widgets.test.tsx
```

Expected: FAIL on the new heading, grounded cheapest label, and verification copy.

- [ ] **Step 3: Update the App hierarchy and copy**

Keep all validation functions and hook wiring unchanged. Update visible structure so:

- the toolbar leads with `Current flight options` and a bounded freshness timestamp;
- route, date, travellers, cabin, and currency remain visible from `searchContext`;
- carrier identity, route timeline, duration, stops, baggage, fare properties, and total price are scanned in that order;
- each unselected card has one primary `Select fare` action;
- the selected review has one `Verify current fare` action;
- verification shows previous/current price and `Verified, not booked`.

- [ ] **Step 4: Apply the approved neutral/navy App tokens**

Update the existing `--cc-*` variables rather than adding raw global styles:

```css
.cc-app {
  --cc-bg: #fbfaf7;
  --cc-surface: #ffffff;
  --cc-text: #19202b;
  --cc-muted: #657083;
  --cc-border: #d9dee6;
  --cc-accent: #14213d;
  --cc-focus: #245aa8;
}
```

Keep carrier image fallback, inline/fullscreen result bounds, one-column 280px support, no nested scrolling, and reduced-motion skeleton behavior.

- [ ] **Step 5: Run widget unit and browser gates**

```bash
pnpm exec vitest run test/widgets.test.tsx
pnpm exec vitest run --config vitest.browser.config.ts test/browser/widgets.browser.test.tsx
pnpm exec tsc --noEmit
```

Expected: PASS for three inline/ten fullscreen result bounds, selection, verification, price change, expired offer, loading, empty, partial, malformed, and mobile interaction states.

- [ ] **Step 6: Commit the MCP App presentation**

```bash
git add src/views/flight-results.tsx src/views/travel.css test/widgets.test.tsx test/browser/widgets.browser.test.tsx
git commit -m "feat: refine conversational flight comparisons"
```

---

### Task 6: Prove responsive, accessible, and public-template quality

**Files:**
- Modify: `apps/web/test/browser/travel-shell.spec.ts`
- Modify: `apps/web/playwright.config.ts` only if the current deterministic single-worker policy is missing
- Delete: `apps/web/src/components/workspace-atmosphere.tsx`
- Delete: `apps/web/src/components/workspace-atmosphere-canvas.tsx`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml` through the package manager
- Modify: `docs/customization.md`
- Modify: `README.md`
- Modify: `test/repository-readiness.test.ts`

**Interfaces:**
- Consumes: the completed hero, header, trip brief, conversation, clarification, and MCP App slices.
- Produces: deterministic browser proof, removal of the obsolete shader dependency, and documentation for replacing the hero image without changing business boundaries.

- [ ] **Step 1: Replace shader browser tests with cinematic behavior tests**

Update the zero-state test to assert no assistant requests, one main/h1, decorative image readiness, and no shader canvas:

```ts
await page.goto('/');
await expect(page.getByRole('heading', {
  name: 'Tell us where you want to be.',
})).toBeVisible();
await expect(page.locator('.travel-hero__image')).toHaveAttribute('alt', '');
await expect(page.locator('.travel-hero__scrim')).toBeVisible();
await expect(page.locator('[data-atmosphere-canvas]')).toHaveCount(0);
expect(assistantRequests).toEqual([]);
```

Delete the animation-frame delta test. Keep reduced-motion coverage by asserting transition durations are zero or absent under the media preference.

- [ ] **Step 2: Add actual desktop/mobile layout assertions**

Desktop assertions:

- headline last rendered line contains at least two words;
- hero composer and CTA fit inside the viewport;
- computed text color is light and the scrim has a non-empty gradient;
- `For developers` is reachable by keyboard;
- no unsupported airline utility navigation exists.

Mobile assertions:

```ts
await page.setViewportSize({ width: 320, height: 720 });
await page.goto('/');
expect(await page.evaluate(() => document.documentElement.scrollWidth))
  .toBe(320);
await expect(page.getByRole('button', { name: 'Plan my flight' }))
  .toHaveCSS('min-height', '44px');
```

Repeat horizontal-fit checks at the configured 390px project and after setting the document root to 200% font size. In a mocked ready-runtime browser state, submit one prompt and prove the trip brief stacks without horizontal overflow.

- [ ] **Step 3: Run Playwright and observe any behavioral failures**

Run with the deterministic local server contract already used by the repository:

```bash
PLAYWRIGHT_REUSE_SERVER=1 pnpm --filter @nuitee-travel-starter/web exec playwright test --workers=1 --reporter=list
```

Expected: PASS after fixing only product behavior, not by increasing timeouts or weakening assertions.

- [ ] **Step 4: Remove the obsolete shader implementation and dependency**

Delete both atmosphere components. Remove only `@paper-design/shaders-react` from `apps/web/package.json`; preserve the existing Assistant 1.27.0 and Next 16.3.3 upgrades. Update the lockfile through:

```bash
env CI=true pnpm --filter @nuitee-travel-starter/web remove @paper-design/shaders-react --lockfile-only
```

Review `git diff -- apps/web/package.json pnpm-lock.yaml` and reject any unrelated version change.

- [ ] **Step 5: Document hero customization and honest product scope**

Add to `docs/customization.md`:

```markdown
## Cinematic hero image

Replace `apps/web/public/images/conversation-hero-v1.png` with an owned or licensed landscape image using the same filename, or update the explicit image import. Keep a 16:9 source, preserve calm left-side copy space and a lower composer-safe region, and verify the deterministic navy scrim at desktop, 390px, 320px, and 200% text zoom. Do not bundle airline trademarks, liveries, copyrighted campaign art, or destination imagery you do not have authority to redistribute.
```

Update README website copy and screenshot description to lead with the cinematic conversation-first experience. Keep the existing Search → Select → Verify boundary and do not claim booking.

Add repository assertions that the hero asset exists, attribution copy exists, shader source/dependency is absent, and README still contains `Search → Select → Verify`.

- [ ] **Step 6: Run the complete verification matrix**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web test
PLAYWRIGHT_REUSE_SERVER=1 pnpm --filter @nuitee-travel-starter/web exec playwright test --workers=1 --reporter=list
pnpm --filter @nuitee-travel-starter/web build
pnpm test
pnpm customize:check
node_modules/.bin/noodle validate src/server.ts --json
node_modules/.bin/noodle test src/server.ts --json
node_modules/.bin/noodle check src/server.ts --json
node_modules/.bin/noodle validate src/embedded-server.ts --json
node_modules/.bin/noodle check src/embedded-server.ts --target embedded-assistant --json
pnpm audit:history
pnpm audit:licenses
git diff --check
```

Expected: all local gates pass. Existing hosted/public privacy, real-provider, session-budget, or deployment evidence remains explicitly unproven.

- [ ] **Step 7: Review localhost and commit the final integration slice**

Start the current app without changing hosted state:

```bash
pnpm --filter @nuitee-travel-starter/web exec next dev --port 3001
```

Review Discover, Clarify, Compare, empty, provider error, selected, verifying, and verified states at desktop and mobile. Stop the server after evidence capture.

Commit only the final slice:

```bash
git add apps/web/test/browser/travel-shell.spec.ts apps/web/playwright.config.ts apps/web/package.json pnpm-lock.yaml docs/customization.md README.md test/repository-readiness.test.ts
git rm apps/web/src/components/workspace-atmosphere.tsx apps/web/src/components/workspace-atmosphere-canvas.tsx
git commit -m "test: prove the cinematic travel experience"
```

---

## Completion Evidence

The implementation is complete only when:

- every task has its RED → GREEN evidence;
- the generated image is tracked and rendered through responsive image delivery;
- no unsupported airline task appears as a live affordance;
- the host still mounts no Assistant session before first submit;
- linked Apps retain their real view identity and tool bridge;
- one selected fare reaches verified status without booking language;
- desktop, 390px, 320px, 200% zoom, keyboard, and reduced-motion checks pass;
- the obsolete shader code and dependency are gone without disturbing current package upgrades;
- the worktree contains no new secret, provider identifier, generated build output, or unrelated staged change;
- localhost is presented for user review before any PR, merge, deploy, or hosted mutation.
