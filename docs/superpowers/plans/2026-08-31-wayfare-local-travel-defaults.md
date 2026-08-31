# Wayfare Local Travel Defaults Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically suggest a local departure airport and display currency in Wayfare without exposing precise browser location or overriding explicit traveler choices.

**Architecture:** A pure resolver operates on a pinned, generated public-domain airport catalog. One client hook requests geolocation once, stores only derived defaults, and passes them through page composition to the hero, header, and the assistant's typed untrusted `pageContext`; the MCP guide and planning tool accept those values only as optional defaults.

**Tech Stack:** TypeScript 7, React 19, Next.js 16, Vitest, Testing Library, Playwright, Noodle Seed embedded assistant 1.27.

**Spec:** `docs/superpowers/specs/2026-08-31-wayfare-local-travel-defaults-design.md`

## Global Constraints

- No IP lookup, reverse-geocoding request, backend endpoint, cookie, local storage, session storage, or analytics event.
- Raw latitude, longitude, accuracy, permission state, and timestamps never enter React state, DOM, logs, URLs, Assistant context, tests snapshots, or errors.
- Geolocation runs once per page lifetime with `enableHighAccuracy: false`, `timeout: 7000`, and `maximumAge: 86400000`.
- Nearest-airport resolution fails closed beyond 250 km.
- Explicit traveler route/currency choices always outrank page defaults.
- Camera and microphone remain disabled; geolocation is allowed only for the top-level same-origin page.
- Preserve the guest-first session, single centered conversation, chronological inline MCP Apps, and Search → Select → Verify boundary.
- Use TDD for every production behavior and preserve all existing accessibility, responsive, history, license, Noodle, and build gates.

---

### Task 1: Pure airport and currency resolver

**Files:**
- Create: `apps/web/src/lib/travel-defaults.ts`
- Create: `apps/web/src/data/airports.generated.ts`
- Create: `apps/web/test/travel-defaults.test.ts`
- Create: `scripts/generate-airport-catalog.mjs`
- Create: `docs/airport-data.md`
- Modify: `test/repository-readiness.test.ts`

**Interfaces:**
- Produces: `SUPPORTED_CURRENCIES`, `SupportedCurrency`, `AirportDefault`, `TravelDefaults`, `NEUTRAL_TRAVEL_DEFAULTS`, `resolveNearestAirport`, `resolveInitialCurrency`, and `toTravelPageContext`.
- Consumes: generated `AIRPORTS` entries shaped as `{ iata, city, country, latitude, longitude }`.

- [ ] **Step 1: Write the failing resolver tests**

Add tests that call the wished-for API directly:

```ts
expect(resolveNearestAirport({ latitude: 33.6167, longitude: 73.0992 }))
  .toMatchObject({ iata: 'ISB', city: 'Islamabad', country: 'PK' });
expect(resolveNearestAirport({ latitude: 0, longitude: -140 })).toBeUndefined();
expect(resolveInitialCurrency({ locale: 'en-GB' })).toBe('GBP');
expect(resolveInitialCurrency({ locale: 'en-US', airportCountry: 'PK' })).toBe('PKR');
expect(toTravelPageContext({
  origin: { iata: 'ISB', city: 'Islamabad', country: 'PK' },
  currency: 'PKR',
  source: 'browser-geolocation',
})).toEqual({
  travelDefaults: {
    origin: 'ISB',
    originLabel: 'Islamabad',
    country: 'PK',
    currency: 'PKR',
    source: 'browser-geolocation',
  },
});
expect(JSON.stringify(toTravelPageContext(defaults))).not.toMatch(/latitude|longitude|accuracy/);
```

Include deterministic equal-distance ordering, malformed coordinates, unsupported locale, and 250 km boundary cases.

- [ ] **Step 2: Run the focused tests and capture RED**

Run: `pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-defaults.test.ts`

Expected: FAIL because `travel-defaults.ts` does not exist.

- [ ] **Step 3: Implement the pure resolver**

Create these exact public types and constants:

```ts
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PKR', 'AED',
  'QAR', 'SAR', 'TRY', 'JPY', 'SGD', 'INR',
] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];
export interface AirportDefault {
  readonly iata: string;
  readonly city: string;
  readonly country: string;
}
export interface TravelDefaults {
  readonly origin?: AirportDefault;
  readonly currency: SupportedCurrency;
  readonly source: 'browser-geolocation' | 'fallback';
}
```

Use a Haversine calculation, reject non-finite/out-of-range coordinates, choose the nearest entry within `250`, and retain generated catalog order as the stable tie-break. Currency precedence is airport country, locale region, then `USD`.

`toTravelPageContext(defaults)` returns JSON-safe derived fields only and never receives coordinates.

- [ ] **Step 4: Generate and document the pinned airport catalog**

Implement `scripts/generate-airport-catalog.mjs` to accept an explicit CSV input path and output path, parse quoted CSV safely, retain only `large_airport` rows with `scheduled_service=yes`, valid IATA/country/coordinates, and emit sorted compact TypeScript. Fetch the current OurAirports `airports.csv` to a temporary path, record the retrieval date and SHA-256 in `docs/airport-data.md`, generate `apps/web/src/data/airports.generated.ts`, then delete the temporary CSV.

The generated header must name `https://ourairports.com/data/`, the snapshot date, the source SHA-256, and the public-domain license URL. Do not commit the CSV.

- [ ] **Step 5: Add repository provenance assertions**

Extend `test/repository-readiness.test.ts` to require the source URL, snapshot date, SHA-256, public-domain notice, filter rules, and generated-file header. It must fail if runtime code fetches `ourairports.com`.

- [ ] **Step 6: Run GREEN gates**

Run:

```sh
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-defaults.test.ts
pnpm exec vitest run test/repository-readiness.test.ts
pnpm --filter @nuitee-travel-starter/web typecheck
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit Task 1**

```sh
git add apps/web/src/lib/travel-defaults.ts apps/web/src/data/airports.generated.ts apps/web/test/travel-defaults.test.ts scripts/generate-airport-catalog.mjs docs/airport-data.md test/repository-readiness.test.ts
git commit -m "feat: resolve local Wayfare travel defaults"
```

---

### Task 2: One-shot browser default owner and responsive UI

**Files:**
- Create: `apps/web/src/hooks/use-travel-defaults.ts`
- Create: `apps/web/test/use-travel-defaults.test.tsx`
- Modify: `apps/web/src/components/travel-assistant-page.tsx`
- Modify: `apps/web/src/components/travel-header.tsx`
- Modify: `apps/web/src/components/travel-zero-state.tsx`
- Modify: `apps/web/src/components/travel-hero.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/travel-header.test.tsx`
- Modify: `apps/web/test/travel-zero-state.test.tsx`

**Interfaces:**
- Consumes: `TravelDefaults`, `SupportedCurrency`, `resolveNearestAirport`, and `resolveInitialCurrency` from Task 1.
- Produces: `useTravelDefaults(): TravelDefaults & { setCurrency(currency: SupportedCurrency): void }` and page-owned props passed to header, zero state, and conversation.

- [ ] **Step 1: Write failing hook tests**

Use a controlled `navigator.geolocation.getCurrentPosition` implementation. Prove:

```ts
expect(getCurrentPosition).toHaveBeenCalledOnce();
expect(options).toEqual({
  enableHighAccuracy: false,
  timeout: 7000,
  maximumAge: 86400000,
});
expect(result.current.origin).toMatchObject({ iata: 'ISB' });
expect(result.current.currency).toBe('PKR');
```

Add denied, timed-out, unavailable, unmounted-before-callback, and page-lifetime currency override cases. Assert derived hook state has no coordinate keys or values.

- [ ] **Step 2: Run hook tests and capture RED**

Run: `pnpm --filter @nuitee-travel-starter/web exec vitest run test/use-travel-defaults.test.tsx`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the hook**

Initialize currency from `navigator.language`, request location in one cleanup-aware `useEffect`, resolve inside the success callback, and store only `AirportDefault`, currency, and source. An explicit `setCurrency` call must remain authoritative when a late geolocation callback arrives.

- [ ] **Step 4: Write failing component tests**

Extend header and zero-state tests to require:

```tsx
<TravelHeader
  currency="PKR"
  onCurrencyChange={onCurrencyChange}
  {...existingProps}
/>
```

Assert a native combobox named `Currency` selects `PKR`, invokes `onCurrencyChange('EUR')`, and renders before the menu trigger. Assert hero route text and composer placeholder use `Islamabad (ISB)` and the fallback uses `Your departure`.

- [ ] **Step 5: Run component tests and capture RED**

Run:

```sh
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-header.test.tsx test/travel-zero-state.test.tsx
```

Expected: FAIL on missing props/control/dynamic copy.

- [ ] **Step 6: Plumb the single defaults owner through the page**

Call `useTravelDefaults()` exactly once in `TravelAssistantPage`. Pass `currency` and `setCurrency` to both header modes, and pass the same immutable snapshot to `TravelZeroState`/`TravelHero` and `TravelConversation`.

Render a compact native select with the 13 supported currency options. Keep the accessible name `Currency`, preserve 44 px target sizing, and avoid adding a second mobile-only copy of the control.

Replace hard-coded `Islamabad` hero examples with pure formatting from the received defaults. Do not modify destination cards or post-search provider routes.

- [ ] **Step 7: Run GREEN UI gates**

Run:

```sh
pnpm --filter @nuitee-travel-starter/web exec vitest run test/use-travel-defaults.test.tsx test/travel-header.test.tsx test/travel-zero-state.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web test
pnpm --filter @nuitee-travel-starter/web build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 8: Commit Task 2**

Restore `apps/web/next-env.d.ts` to its tracked production import before staging. Then:

```sh
git add apps/web/src/hooks/use-travel-defaults.ts apps/web/test/use-travel-defaults.test.tsx apps/web/src/components/travel-assistant-page.tsx apps/web/src/components/travel-header.tsx apps/web/src/components/travel-zero-state.tsx apps/web/src/components/travel-hero.tsx apps/web/app/globals.css apps/web/test/travel-header.test.tsx apps/web/test/travel-zero-state.test.tsx apps/web/next-env.d.ts
git commit -m "feat: personalize Wayfare departure defaults"
```

---

### Task 3: Assistant defaults, browser policy, and privacy contract

**Files:**
- Modify: `apps/web/src/components/travel-conversation.tsx`
- Modify: `apps/web/test/travel-conversation.test.tsx`
- Modify: `apps/web/next.config.ts`
- Create: `apps/web/test/security-headers.test.ts`
- Modify: `src/flight-schemas.ts`
- Modify: `src/travel-server.ts`
- Modify: `test/server-contract.test.ts`
- Modify: `docs/architecture.md`
- Modify: `docs/EMBEDDED_ASSISTANT.md`
- Modify: `docs/customization.md`
- Create: `docs/privacy.md`
- Modify: `test/repository-readiness.test.ts`

**Interfaces:**
- Consumes: `TravelDefaults` and `toTravelPageContext` from Task 1.
- Produces: a typed `pageContext` callback on `useNoodleAssistant`, optional planning-tool `currency`/`country` defaults, and `geolocation=(self)` response policy.

- [ ] **Step 1: Write failing assistant-context tests**

Change the current negative `pageContext` assertion to require:

```ts
expect(options.pageContext()).toEqual({
  travelDefaults: {
    origin: 'ISB',
    originLabel: 'Islamabad',
    country: 'PK',
    currency: 'PKR',
    source: 'browser-geolocation',
  },
});
expect(JSON.stringify(options.pageContext())).not.toMatch(
  /latitude|longitude|accuracy|permission/i,
);
```

Rerender with a user-selected currency and prove the callback returns the fresh selection on the next call.

- [ ] **Step 2: Write failing server-contract tests**

Require `plan_flight_search` to keep only `origin` and `destination` required while exposing optional defaulted `currency`/`country` properties. Call the tool with `PKR`/`PK` and prove the planned output preserves them. Assert the guide says page defaults are untrusted, omitted values only, and explicit traveler choices win.

- [ ] **Step 3: Write failing header/privacy tests**

Require `Permissions-Policy` to equal `camera=(), geolocation=(self), microphone=()` and repository docs to contain the coordinate-processing, no-persistence, no-third-party-lookup, and denial-fallback contract.

- [ ] **Step 4: Run the three RED groups**

Run:

```sh
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-conversation.test.tsx test/security-headers.test.ts
pnpm exec vitest run test/server-contract.test.ts test/repository-readiness.test.ts
```

Expected: FAIL on missing `pageContext`, planning defaults, policy, and documentation.

- [ ] **Step 5: Implement typed untrusted page context**

Add a required `defaults: TravelDefaults` prop to `TravelConversation` and configure:

```ts
pageContext: () => toTravelPageContext(defaults),
```

Keep the existing `clientContext` limited to locale and time zone. Do not call `updateContext`, `updateModelContext`, or send a hidden synthetic user message.

- [ ] **Step 6: Align the MCP planning defaults**

Add optional defaulted `currency` and `country` fields to `flightPlanInputSchema`; preserve `['origin', 'destination']` as the only required fields. Normalize them to uppercase in `planFlightSearch` output.

Update both relevant guide steps and server instructions: use page defaults only for omitted origin/currency/market; never treat them as verified; explicit user text wins. Keep USD/US as the non-website fallback.

- [ ] **Step 7: Update policy and privacy documentation**

Allow only self geolocation in the Next response header. Document the optional permission, in-memory coordinate resolution, derived model hint, denial fallback, no persistence, and no external lookup. Update active architecture/customization/embed docs without claiming hosted proof.

- [ ] **Step 8: Run GREEN contract gates**

Run:

```sh
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-conversation.test.tsx test/security-headers.test.ts
pnpm exec vitest run test/server-contract.test.ts test/repository-readiness.test.ts
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm test
noodle validate --json
noodle test --json
noodle check src/embedded-server.ts --target embedded-assistant --json
git diff --check
```

Expected: all commands exit 0 with canonical Noodle JSON envelopes reporting `ok: true`; existing public-surface warnings may remain only if unchanged and documented.

- [ ] **Step 9: Commit Task 3**

```sh
git add apps/web/src/components/travel-conversation.tsx apps/web/test/travel-conversation.test.tsx apps/web/next.config.ts apps/web/test/security-headers.test.ts src/flight-schemas.ts src/travel-server.ts test/server-contract.test.ts docs/architecture.md docs/EMBEDDED_ASSISTANT.md docs/customization.md docs/privacy.md test/repository-readiness.test.ts
git commit -m "feat: ground Wayfare with local travel hints"
```

---

### Task 4: Browser proof, CI root-cause repair, and PR update

**Files:**
- Modify: `apps/web/test/browser/travel-shell.spec.ts`
- Inspect: `apps/web/app/globals.css`
- Inspect: `apps/web/playwright.config.ts`
- Modify: `PUBLIC_RELEASE_CHECKLIST.md`

**Interfaces:**
- Consumes: the completed automatic defaults experience and existing nested-App browser fixture.
- Produces: deterministic granted/denied location proof, retained nested-App accessibility/containment proof, a green exact-commit matrix, and a non-force update to PR #41.

- [ ] **Step 1: Reproduce and localize the two CI failures**

Use `gh run view 33307774833 --job 99247268621 --log-failed` to preserve exact evidence. Compare CI browser/font/viewport state with local configuration and add temporary assertion diagnostics only inside the failing tests. State one root-cause hypothesis for nested App overflow and one for the 200% submit-control overflow before changing production code.

- [ ] **Step 2: Add failing browser tests for travel defaults**

Add deterministic contexts for:

```ts
await context.grantPermissions(['geolocation'], { origin: baseURL });
await context.setGeolocation({ latitude: 33.6167, longitude: 73.0992 });
```

Prove `ISB`, `PKR`, the currency combobox, and origin-aware example copy. In a separate denied context, prove neutral origin and locale currency. Assert no coordinate values occur in visible DOM text or assistant request fixture context.

- [ ] **Step 3: Capture RED**

Run the new focused Playwright cases plus the two CI-failing cases. Expected: new defaults tests fail before fixture support, and the diagnostic run identifies the geometry root cause without weakening assertions.

- [ ] **Step 4: Implement the smallest deterministic repair**

Fix only the confirmed source of overflow or readiness variance. Keep nested frame own-scroll-width checks, 44 px controls, 200% scalable App typography, composer containment, and existing thresholds. Do not raise timeouts or tolerances merely to make CI pass.

- [ ] **Step 5: Run focused and full browser GREEN gates**

Run:

```sh
pnpm --filter @nuitee-travel-starter/web exec playwright test test/browser/travel-shell.spec.ts --workers=1 --reporter=list
pnpm --filter @nuitee-travel-starter/web test:browser
```

Expected: all applicable projects pass; only existing explicitly project-scoped skips remain.

- [ ] **Step 6: Update the release checklist honestly**

Mark only locally proven items. Keep hosted deployment, real production origin, public privacy/legal approval, live-provider, session-expiry, and host-certification items open.

- [ ] **Step 7: Run the exact full verification matrix**

Stop the local dev server and restore `apps/web/next-env.d.ts`. Run:

```sh
env CI=true pnpm ci:offline
pnpm audit:history
git diff --check
git status --short
```

Expected: all gates exit 0 and only intended unstaged report artifacts, if any, remain.

- [ ] **Step 8: Commit and verify the exact committed SHA**

```sh
git add apps/web/test/browser/travel-shell.spec.ts apps/web/app/globals.css apps/web/playwright.config.ts PUBLIC_RELEASE_CHECKLIST.md
git commit -m "test: prove local Wayfare travel defaults"
env CI=true pnpm ci:offline
pnpm audit:history
git diff --check HEAD^..HEAD
git status --short
```

Stage only files that actually changed. Expected: exact committed-HEAD verification exits 0 and the worktree is clean.

- [ ] **Step 9: Push to the existing PR and watch checks**

Push the current HEAD without force to PR #41's existing head branch `169/neutral-light-chat-ui`, then run:

```sh
gh pr checks 41 --watch --interval 10
gh pr view 41 --json url,state,isDraft,mergeStateStatus,reviewDecision,statusCheckRollup
```

Do not merge. Report the pushed SHA, PR URL, check conclusions, review/merge state, and any hosted/public-release prerequisites that remain open.
