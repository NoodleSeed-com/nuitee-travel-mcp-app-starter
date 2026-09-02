# Wayfare Agent-Led Starting Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage's capability-first entry points with one natural-language starting composer while preserving the existing conversation, MCP Apps, trip projection, tools, and provider truth boundaries.

**Architecture:** Keep `TravelAssistantPage → TravelConversation → TravelMessage/NoodleAppView → projectTrip → TripBrief` unchanged. Narrow only the zero state: render one static cinematic hero and composer, make the existing destination and editorial material passive, and reinforce the existing expanded product guide so capability choice stays inside the agent. No new router, state store, planner canvas, widget system, provider integration, or transaction flow is introduced.

**Tech Stack:** TypeScript 7, React 19, Next.js 16, `@noodleseed/assistant`, `@noodleseed/one`, Vitest, Testing Library, Playwright, CSS, Noodle CLI.

**Spec:** `docs/superpowers/specs/2026-09-02-wayfare-agent-led-starting-experience-design.md`

## Global Constraints

- The homepage main content has one start action: the existing `TravelComposer` submission path.
- Preserve `TravelAssistantPage`, `TravelConversation`, `useNoodleAssistant`, `TravelMessage`, `TravelViewRegistry`, `NoodleAppView`, `projectTrip`, and `TripBrief`; change them only if a failing regression proves the narrow homepage work requires it.
- Keep structured MCP Apps inline and in chronological message order.
- Keep the starter profile flights-only and the expanded profile truthful: flights are provider-backed; stays, rewards, reward flights, and travel protection are illustrative; cars and private aviation are not registered tools.
- Do not add booking, payment, login, durable trip storage, a unified checkout, a `plan_everything` tool, or a client-side intent router.
- Do not parse transcript prose to derive trip state.
- Preserve explicit traveler input over browser-derived origin and currency hints.
- Ask at most one focused clarification at a time and do not reopen facts already supplied.
- Retain provider-owned transaction language; no result may imply that Wayfare booked, paid, ticketed, redeemed, or issued coverage.
- Maintain one `h1`, chronological keyboard order, visible focus, 44 by 44 CSS-pixel targets, reduced motion, and horizontal fit at 320, 390, 768, and 1440 pixels plus 200% text zoom.
- Do not hand-edit generated Noodle agent files. If `noodle agents doctor --json` reports staleness, refresh them with `noodle agents setup --write` and review the generated diff.
- Local or CI success is not hosted deployment proof. This plan performs no deploy, hosted configuration write, secret change, assistant rebinding, or public release.

## File map

- `apps/web/src/components/travel-hero.tsx`: static agent-led hero, one composer, one passive example, existing image loading behavior.
- `apps/web/src/components/travel-zero-state.tsx`: zero-state composition; no capability strip; supporting sections receive no start callback.
- `apps/web/src/components/destination-inspiration.tsx`: passive destination imagery with no buttons or prompt dispatch.
- `apps/web/src/components/travel-editorial-feature.tsx`: passive product explanation with no call-to-action.
- `apps/web/src/components/travel-capability-strip.tsx`: delete after its only production import is removed.
- `apps/web/src/lib/landing-content.ts`: retain destination data needed by `/experience`; remove the now-unused editorial action and prompt fields.
- `apps/web/app/globals.css`: static hero layout, passive destination treatment, passive editorial spacing, and removal of obsolete homepage mode/capability rules.
- `apps/web/test/travel-zero-state.test.tsx`: component contract for one start path and passive supporting content.
- `apps/web/test/landing-content.test.ts`: exact passive editorial-content contract.
- `apps/web/test/browser/travel-shell.spec.ts`: browser proof for single entry, one assistant turn, mobile first fold, zoom, and passive content.
- `src/travel-server.ts`: minimal expanded-guide wording for internal routing, focused requests, shared context, and one next step.
- `test/demo-server-contract.test.ts`: manifest-level agent-guide contract.
- `README.md`, `SPEC.md`, `docs/architecture.md`, `docs/customization.md`, `docs/WAYFARE_TRAVEL_COMPANION.md`: active documentation aligned with the single-entry homepage and unchanged capability truth.
- `test/repository-readiness.test.ts`: prevents active documentation from drifting back to a multi-entry homepage.

---

### Task 1: Convert the existing zero state to one start path

**Files:**

- Modify: `apps/web/test/travel-zero-state.test.tsx:16-445`
- Modify: `apps/web/test/landing-content.test.ts:1-66`
- Modify: `apps/web/src/components/travel-hero.tsx:1-330`
- Modify: `apps/web/src/components/travel-zero-state.tsx:1-39`
- Modify: `apps/web/src/components/destination-inspiration.tsx:1-101`
- Modify: `apps/web/src/components/travel-editorial-feature.tsx:1-34`
- Modify: `apps/web/src/lib/landing-content.ts:1-65`
- Delete: `apps/web/src/components/travel-capability-strip.tsx`

**Interfaces:**

- Consumes: `TravelComposer({ formLabel, inputId, inputRef, onSubmit, placeholder, submitLabel, variant, visibleSubmitLabel })` and the existing `TravelZeroStateProps` passed by `TravelAssistantPage`.
- Produces: unchanged `TravelHeroProps` and `TravelZeroStateProps`; zero-state `onStart(prompt: string)` is reachable only through `TravelHero`'s composer.
- Produces: `DestinationInspiration(): JSX.Element` and `TravelEditorialFeature(): React.JSX.Element` with no callback props.
- Preserves: `coreHeroModes` for `/experience`; the homepage reads only `coreHeroModes[0].scenes[0]` as its existing visual master.

- [ ] **Step 1: Replace capability-first component assertions with a failing single-entry contract**

Keep the existing identity, footer, launch-error, ref, Enter, and Shift+Enter tests. Remove the tests whose titles require seven modes, scene pickers, starter prompts, capability cards, destination prompt submission, and the editorial prompt. Add these exact contracts:

```tsx
it('renders one agent-led starting action with passive supporting content', () => {
  const onStart = vi.fn();
  const { container } = render(
    <TravelZeroState inputRef={createRef()} onStart={onStart} />,
  );

  expect(screen.getByRole('heading', {
    level: 1,
    name: 'Tell us the trip you have in mind',
  })).toBeVisible();
  expect(screen.getAllByRole('form', { name: 'Plan a trip' })).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Submit trip request' }))
    .toBeDisabled();
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Suggested trips' }))
    .not.toBeInTheDocument();
  expect(container.querySelector('.travel-capabilities')).not.toBeInTheDocument();

  const inspiration = screen.getByRole('region', {
    name: 'Where the journey could take you',
  });
  expect(within(inspiration).getAllByRole('listitem')).toHaveLength(5);
  expect(within(inspiration).queryByRole('button')).not.toBeInTheDocument();

  const editorial = screen.getByRole('region', {
    name: 'One conversation, every part of the trip.',
  });
  expect(within(editorial).queryByRole('button')).not.toBeInTheDocument();
  expect(onStart).not.toHaveBeenCalled();
});

it.each([
  'A long weekend somewhere warm in October.',
  'Find a hotel near the Louvre.',
  'Plan a family trip from Toronto to Rome during spring break.',
  'I already have flights to Lisbon. Help with the rest.',
])('submits the natural-language intent unchanged: %s', (prompt) => {
  const onStart = vi.fn();
  render(<TravelZeroState inputRef={createRef()} onStart={onStart} />);

  fireEvent.change(
    screen.getByRole('textbox', { name: 'Ask the travel assistant' }),
    { target: { value: prompt } },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Submit trip request' }));

  expect(onStart).toHaveBeenCalledOnce();
  expect(onStart).toHaveBeenCalledWith(prompt);
});

it('uses location only as a bounded starting hint', () => {
  const { rerender } = render(
    <TravelZeroState inputRef={createRef()} onStart={vi.fn()} />,
  );
  expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
    .toHaveAttribute(
      'placeholder',
      'Your departure — describe the trip you have in mind',
    );

  rerender(
    <TravelZeroState
      defaults={{
        origin: { iata: 'ISB', city: 'Islamabad', country: 'PK' },
        currency: 'PKR',
        source: 'browser-geolocation',
      }}
      inputRef={createRef()}
      onStart={vi.fn()}
    />,
  );
  expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
    .toHaveAttribute(
      'placeholder',
      'Islamabad — describe the trip you have in mind',
    );
});
```

Update the editorial fixture test to require only the fields used by the passive homepage block:

```ts
it('defines one passive agent-led editorial statement', () => {
  expect(landingEditorialFeature).toEqual({
    heading: 'One conversation, every part of the trip.',
    support: 'Tell Wayfare what you are planning. It will bring in the relevant parts of the journey as they become useful.',
  });
});
```

- [ ] **Step 2: Run the focused tests and verify the old homepage fails the new contract**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-zero-state.test.tsx test/landing-content.test.ts
```

Expected: FAIL because the old heading, tablists, prompt buttons, capability strip, destination buttons, and editorial action are still present.

- [ ] **Step 3: Simplify `TravelHero` while retaining its image and composer plumbing**

Replace the mode/scene state and tab UI with the existing Explore image master and the following static content. Keep the current loaded-image and failed-image state behavior:

```tsx
'use client';

import Image from 'next/image';
import { type Ref, useState } from 'react';
import {
  NEUTRAL_TRAVEL_DEFAULTS,
  type TravelDefaults,
} from '../lib/travel-defaults';
import { coreHeroModes } from '../lib/travel-hero-content';
import { TravelComposer } from './travel-composer';

interface TravelHeroProps {
  readonly defaults?: TravelDefaults;
  readonly inputRef: Ref<HTMLTextAreaElement>;
  readonly launchError?: string | null;
  readonly onStart: (prompt: string) => void;
}

const heroScene = coreHeroModes[0].scenes[0];

export function TravelHero({
  defaults = NEUTRAL_TRAVEL_DEFAULTS,
  inputRef,
  launchError,
  onStart,
}: Readonly<TravelHeroProps>) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>(
    'loading',
  );
  const promptOrigin = defaults.origin?.city ?? 'Your departure';

  return (
    <section className="travel-hero" aria-labelledby="travel-home-title">
      <div className="travel-hero__content">
        <div
          className="travel-hero__experience travel-hero__experience--agent-led travel-hero__media"
          data-image-state={imageState}
        >
          <Image
            alt=""
            className="travel-hero__image"
            fill
            onError={() => setImageState('error')}
            onLoad={() => setImageState('loaded')}
            priority
            sizes="(max-width: 767px) 100vw, 1200px"
            src={heroScene.imageSrc}
            style={{ objectPosition: heroScene.imagePosition }}
          />
          <span aria-hidden="true" className="travel-hero__image-skeleton" />
          <span aria-hidden="true" className="travel-hero__media-veil" />
          <div className="travel-hero__interface">
            <div className="travel-hero__panel">
              <div className="travel-hero__copy">
                <span>Your journey starts here</span>
                <h1 id="travel-home-title">Tell us the trip you have in mind</h1>
                <p>
                  Describe the journey once. Wayfare will bring in the relevant
                  travel options as they become useful.
                </p>
              </div>
              <TravelComposer
                formLabel="Plan a trip"
                inputId="travel-prompt"
                inputRef={inputRef}
                onSubmit={onStart}
                placeholder={`${promptOrigin} — describe the trip you have in mind`}
                submitLabel="Submit trip request"
                variant="hero"
                visibleSubmitLabel="Plan my trip"
              />
              <p className="travel-hero__detail">
                For example: A long weekend somewhere warm in October.
              </p>
            </div>
          </div>
        </div>
        {launchError ? (
          <p className="travel-zero-state__error" role="alert">
            {launchError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Remove the capability strip from composition and make supporting sections passive**

Change `TravelZeroState` to:

```tsx
export function TravelZeroState({
  defaults = NEUTRAL_TRAVEL_DEFAULTS,
  inputRef,
  launchError = null,
  onStart,
}: Readonly<TravelZeroStateProps>) {
  return (
    <div className="travel-landing">
      <TravelHero
        defaults={defaults}
        inputRef={inputRef}
        launchError={launchError}
        onStart={onStart}
      />
      <DestinationInspiration />
      <TravelEditorialFeature />
    </div>
  );
}
```

Delete `travel-capability-strip.tsx` after confirming `rg -n "TravelCapabilityStrip" apps/web/src` returns only the removed import and component definition.

In `DestinationInspiration`, remove `DestinationInspirationProps` and `onStart`. Preserve the current `IntersectionObserver`, image loading, skeleton, scrim, and `sizes` behavior. Replace the heading and each button with passive semantics:

```tsx
<section
  aria-labelledby="travel-inspiration-title"
  className="destination-inspiration travel-landing__section"
  data-revealed={revealed ? 'true' : 'false'}
  id="places-to-start"
  ref={sectionRef}
>
  <header className="travel-section-heading">
    <span>Travel inspiration</span>
    <h2 id="travel-inspiration-title">Where the journey could take you</h2>
  </header>
  <ul
    aria-label="Destination inspiration"
    className="destination-inspiration__grid"
  >
    {landingDestinations.map((destination, index) => {
      const imageState = failedImages.has(destination.id)
        ? 'error'
        : loadedImages.has(destination.id) ? 'loaded' : 'loading';
      return (
        <li data-window-index={index} key={destination.id}>
          <article className="destination-card" data-image-state={imageState}>
            <span aria-hidden="true" className="destination-card__skeleton" />
            <Image
              alt=""
              className="destination-card__image"
              fill
              loading={index === 0 ? 'eager' : 'lazy'}
              onError={() => setFailedImages((current) => (
                new Set(current).add(destination.id)
              ))}
              onLoad={() => setLoadedImages((current) => (
                new Set(current).add(destination.id)
              ))}
              sizes="(max-width: 767px) 78vw, (max-width: 1023px) 42vw, 22vw"
              src={destination.imageSrc}
              style={{ objectPosition: destination.imagePosition }}
            />
            <span aria-hidden="true" className="destination-card__scrim" />
            <span className="destination-card__copy">
              <strong>{destination.name}</strong>
              <span>{destination.descriptor}</span>
            </span>
          </article>
        </li>
      );
    })}
  </ul>
</section>
```

Replace `TravelEditorialFeature` with:

```tsx
import type React from 'react';
import { landingEditorialFeature } from '../lib/landing-content';
import { WayfareMark } from './wayfare-mark';

export function TravelEditorialFeature(): React.JSX.Element {
  return (
    <section
      aria-labelledby="travel-editorial-title"
      className="travel-editorial travel-landing__section"
    >
      <WayfareMark className="travel-editorial__mark" />
      <div className="travel-editorial__copy">
        <h2 id="travel-editorial-title">
          {landingEditorialFeature.heading}
        </h2>
        <p>{landingEditorialFeature.support}</p>
      </div>
    </section>
  );
}
```

Change `LandingEditorialFeature` and its value to:

```ts
export interface LandingEditorialFeature {
  readonly heading: string;
  readonly support: string;
}

export const landingEditorialFeature = {
  heading: 'One conversation, every part of the trip.',
  support: 'Tell Wayfare what you are planning. It will bring in the relevant parts of the journey as they become useful.',
} as const satisfies LandingEditorialFeature;
```

Do not remove `LandingDestination.prompt`; `/experience` still consumes it.

- [ ] **Step 5: Run focused component tests**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-zero-state.test.tsx test/landing-content.test.ts
```

Expected: PASS. `TravelAssistantPage` coverage remains in `travel-zero-state.test.tsx`; do not create a duplicate page-level test file.

- [ ] **Step 6: Commit the independently testable zero-state change**

```bash
git add apps/web/src/components/travel-hero.tsx apps/web/src/components/travel-zero-state.tsx apps/web/src/components/destination-inspiration.tsx apps/web/src/components/travel-editorial-feature.tsx apps/web/src/components/travel-capability-strip.tsx apps/web/src/lib/landing-content.ts apps/web/test/travel-zero-state.test.tsx apps/web/test/landing-content.test.ts
git commit -m "feat: make Wayfare homepage agent-led"
```

---

### Task 2: Simplify the landing CSS and lock responsive browser behavior

**Files:**

- Modify: `apps/web/test/browser/travel-shell.spec.ts:142-774,1895-2070`
- Modify: `apps/web/app/globals.css:220-530,542-885,960-1025,1660-1810,2340-2580`

**Interfaces:**

- Consumes: Task 1's static `.travel-hero__experience--agent-led`, single `.travel-composer--hero`, passive `.destination-card` articles, and passive `.travel-editorial` section.
- Produces: one first-fold composer at 320 by 720, no page-horizontal overflow, passive supporting cards, and unchanged conversation CSS below the landing rules.
- Preserves: `.travel-composer--conversation`, `.travel-conversation`, `.trip-brief`, settings sheet, header, footer, and linked-App layout rules.

- [ ] **Step 1: Replace obsolete mode and prompt-rail browser tests with failing single-entry tests**

Delete the tests named:

- `switches immersive planning scenes without opening an assistant session`
- `keeps all seven standard planning tabs reachable without overlap at tablet width`
- `switches every Private Jets and Cars atmosphere without opening a session`
- `keeps the next planning section discoverable with consistent desktop spacing and targets`
- `starts one destination prompt through one assistant turn`
- `shows both configured starter prompts across required mobile conditions`

Remove helper functions used only by those tests. Replace the zero-state browser contract with:

```ts
test('renders one agent-led start without opening an assistant session', async ({
  page,
}) => {
  const assistantRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/v1/assistant/')) {
      assistantRequests.push(request.url());
    }
  });

  await page.goto('/');

  await expect(page.getByRole('heading', {
    level: 1,
    name: 'Tell us the trip you have in mind',
  })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Plan a trip' })).toHaveCount(1);
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.locator('.travel-starter-prompts')).toHaveCount(0);
  await expect(page.locator('.travel-capabilities')).toHaveCount(0);
  await expect(page.locator('.destination-card')).toHaveCount(5);
  await expect(page.locator('.destination-card button')).toHaveCount(0);
  await expect(page.locator('.travel-editorial button')).toHaveCount(0);
  await expect(page.locator('main h1')).toHaveCount(1);
  expect(assistantRequests).toEqual([]);
});
```

Removing `expectStarterPromptsFit` also makes the top-level `siteConfig` import unused; remove that import. Keep `expectDestinationWindowsSettled` because the passive rail retains `id="places-to-start"` and still uses the existing reveal behavior.

Replace the destination-submission browser fixture with a composer-only first-turn test:

```ts
test('submits one broad intent through one assistant turn', async ({ page }) => {
  const submittedPrompts: string[] = [];
  let sessionRequests = 0;
  await page.route('**/v1/assistant/public-sessions', async (route) => {
    sessionRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'browser-fixture-token',
        expiresAt: '2099-01-01T00:00:00.000Z',
        endpoints: {
          turns: 'http://127.0.0.1:3108/browser-fixture/turns',
          toolConfirmations: 'http://127.0.0.1:3108/browser-fixture/confirmations',
        },
      }),
    });
  });
  await page.route('**/browser-fixture/turns', async (route) => {
    const body = route.request().postDataJSON() as { message?: unknown };
    if (typeof body.message === 'string') submittedPrompts.push(body.message);
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'deterministic_browser_fixture' }),
    });
  });

  await page.goto('/');
  const prompt = 'Plan a family trip from Toronto to Rome during spring break.';
  await page.getByRole('textbox', { name: 'Ask the travel assistant' }).fill(prompt);
  await page.getByRole('button', { name: 'Submit trip request' }).click();

  await expect.poll(() => submittedPrompts).toEqual([prompt]);
  expect(sessionRequests).toBe(1);
});
```

Update the mobile-fit test so its start controls are only the composer submit, while header, menu, footer, and legal controls retain their existing assertions:

```ts
test('keeps the agent-led first fold usable at 320px and 200 percent zoom', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');

  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const composer = await page.locator('.travel-composer--hero').boundingBox();
  expect(composer).not.toBeNull();
  expect(composer!.y).toBeGreaterThanOrEqual(0);
  expect(composer!.y + composer!.height).toBeLessThanOrEqual(720);
  await expectMinimumTargetSize(
    page.getByRole('button', { name: 'Submit trip request' }),
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expectHorizontalFit(page, 390);
  expect(await landingMidwordBreaks(page)).toEqual([]);
  await expect(page.locator('.destination-card button')).toHaveCount(0);
  await expect(page.locator('.travel-editorial button')).toHaveCount(0);
});
```

Update the granted and denied location tests to expect these exact placeholders:

```ts
await expect(page.getByRole('textbox', { name: 'Ask the travel assistant' }))
  .toHaveAttribute(
    'placeholder',
    'Islamabad — describe the trip you have in mind',
  );

await expect(page.getByRole('textbox', { name: 'Ask the travel assistant' }))
  .toHaveAttribute(
    'placeholder',
    'Your departure — describe the trip you have in mind',
  );
```

In `keeps the premium desktop hero heading on one line with rounded visual surfaces`, remove `.travel-starter-prompts` from the centering selector array and keep the heading, hero support, and composer assertions.

Rename `keeps 390px below-fold sections compact around the horizontal destination rail` to `keeps 390px passive inspiration and editorial content contained`. Delete its `capabilityItems` and `capabilityBoxes` block. Keep the destination rail, editorial mark/copy, footer, legal fallback, and page-width assertions unchanged.

- [ ] **Step 2: Run the focused Playwright tests and verify layout assertions fail before CSS cleanup**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec playwright test test/browser/travel-shell.spec.ts --project=desktop-chromium --grep "agent-led start|broad intent"
pnpm --filter @nuitee-travel-starter/web exec playwright test test/browser/travel-shell.spec.ts --project=mobile-chromium --grep "agent-led first fold"
```

Expected before the CSS change: at least the 320px first-fold geometry assertion fails because the old mode-aware hero reserves excess vertical space.

- [ ] **Step 3: Replace mode-aware landing rules with a static agent-led layout**

Remove `.travel-hero__modes`, `.travel-hero__mode`, `.travel-starter-prompts`, `.travel-capabilities`, and homepage Private Jets/Cars/scene-specific rule blocks. Keep shared image loading, skeleton, veil, composer, destination image, reveal, footer, and conversation rules.

Use these static hero rules:

```css
.travel-hero__experience--agent-led .travel-hero__image {
  filter: saturate(0.9) brightness(0.82);
}

.travel-hero__interface {
  position: relative;
  z-index: 4;
  display: grid;
  min-height: inherit;
  place-items: center;
  padding: clamp(1.25rem, 4vw, 3.5rem);
}

.travel-hero__panel {
  display: grid;
  width: min(100%, 50rem);
  justify-items: center;
  gap: clamp(0.85rem, 2vw, 1.25rem);
}

.travel-hero__panel .travel-composer--hero {
  width: 100%;
  margin: 0;
}

@media (max-width: 767px) {
  .travel-hero__experience {
    min-height: min(39rem, calc(100svh - 5rem));
    border-radius: 26px;
  }

  .travel-hero__interface {
    padding: 1rem 0.8rem;
  }

  .travel-hero__copy {
    padding-inline: 0.35rem;
  }

  .travel-hero__copy h1 {
    max-width: 12ch;
    font-size: clamp(2rem, 11vw, 3.2rem);
  }
}
```

Because `.destination-card` is now an `article`, retain its visual layout but remove `.destination-card:hover` and `.destination-card:focus-visible`. Remove button-specific cursor and interaction transitions; retain image-load transitions and reveal motion. Change the editorial support spacing to:

```css
.travel-editorial__copy > p {
  margin-bottom: 0;
  color: rgb(255 255 255 / 78%);
  font-size: 0.92rem;
  line-height: 1.6;
}
```

Delete `.travel-editorial__copy button`, its focus/hover rules, and all responsive selectors that only arrange `.travel-capabilities`.

- [ ] **Step 4: Run the focused browser tests and inspect screenshots at all required widths**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec playwright test test/browser/travel-shell.spec.ts --project=desktop-chromium --grep "agent-led start|broad intent|premium landing visual evidence"
pnpm --filter @nuitee-travel-starter/web exec playwright test test/browser/travel-shell.spec.ts --project=mobile-chromium --grep "agent-led first fold|mobile navigation sheet"
```

Expected: PASS. Open the generated 320, 390, 768, and 1440 screenshots and confirm the heading and composer dominate the first fold, destination windows read as noninteractive inspiration, and no empty gap remains where the tabs or starter prompts were removed.

- [ ] **Step 5: Run the complete web unit and browser suites**

```bash
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web test
pnpm --filter @nuitee-travel-starter/web test:browser
pnpm --filter @nuitee-travel-starter/web build
```

Expected: all commands exit 0. The existing conversation, inline MCP App, trip projection, error, Stop, retry, reset, and text-zoom tests remain green.

- [ ] **Step 6: Commit the responsive landing cleanup**

```bash
git add apps/web/app/globals.css apps/web/test/browser/travel-shell.spec.ts
git commit -m "test: lock agent-led Wayfare entry experience"
```

---

### Task 3: Strengthen the existing expanded product guide without adding tools

**Files:**

- Modify: `test/demo-server-contract.test.ts:31-180`
- Modify: `src/travel-server.ts:143-257`

**Interfaces:**

- Consumes: the existing `travelCompanionDemoAgentGuide` workflows and the exact tool catalog emitted by `demoLiveApp.toManifest()`.
- Produces: manifest guidance that makes capability selection internal, keeps focused requests focused, reuses journey facts, offers one contextual next step, and calls only tools present in the active profile.
- Preserves: every tool name, schema, connector, widget, state handle, and live-versus-illustrative boundary.

- [ ] **Step 1: Add a failing manifest-level orchestration contract**

Add this test inside `describe('Wayfare expanded travel profile', ...)`:

```ts
it('keeps capability choice inside one agent-led journey', async () => {
  const manifest = await demoLiveApp.toManifest() as any;
  const guide = manifest.server.agentGuide;
  const wire = JSON.stringify(guide);

  expect(guide.description).toContain('agent-led conversation');
  expect(wire).toContain('capability choice is internal');
  expect(wire).toContain('Keep a focused request focused');
  expect(wire).toContain('Reuse route, dates, travelers, preferences, and selections');
  expect(wire).toContain('at most one contextually relevant next step');
  expect(wire).toContain('registered in the active profile');
  expect(wire).toContain('explicit traveler instruction always wins');
  expect(wire).toContain('Flight results come from the connected provider');
  expect(wire).toContain('illustrative');
  expect(wire).not.toContain('plan_everything');
});
```

- [ ] **Step 2: Run the guide contract and verify it fails on the missing orchestration language**

Run:

```bash
pnpm exec vitest run test/demo-server-contract.test.ts
```

Expected: FAIL on `agent-led conversation` and the new routing-boundary strings; existing tool-surface assertions remain green.

- [ ] **Step 3: Add only global orchestration guidance to the existing guide**

Change the expanded guide description to:

```ts
description:
  'Guide one agent-led conversation across current flights, illustrative hotel and travel-protection comparisons, and illustrative rewards while keeping every source boundary visible.',
```

Append these entries to `useWhen`:

```ts
'A traveler describes a broad trip goal without choosing a travel capability.',
'A traveler wants to continue a trip using route, dates, travelers, preferences, or selections already established in the conversation.',
```

Insert these boundaries before the existing source-specific boundaries:

```ts
'Treat capability choice as internal orchestration. Never ask the traveler to choose Flights, Stays, Rewards, or Travel Protection before describing the trip.',
'Keep a focused request focused. Do not turn a flight-only, stay-only, rewards-only, or protection-only request into a full-trip questionnaire.',
'Reuse route, dates, travelers, preferences, and selections already established by explicit traveler statements or structured tool results. An explicit traveler instruction always wins.',
'After a successful result or selection, offer at most one contextually relevant next step. Do not fan out into every available domain or call unrelated tools speculatively.',
'Call only capabilities registered in the active profile. If a requested capability is unavailable, say so directly and continue with supported parts of the trip.',
```

Do not add a broad-trip workflow with a fixed tool sequence. The existing atomic workflows remain the source of valid tool ordering, and the global boundaries govern how the model chooses among them.

- [ ] **Step 4: Run focused contracts and Noodle validation**

```bash
pnpm exec vitest run test/demo-server-contract.test.ts test/server-contract.test.ts
./node_modules/.bin/noodle validate src/demo-live-server.ts --json
./node_modules/.bin/noodle validate src/demo-embedded-server.ts --json
```

Expected: both Vitest files pass; each Noodle command writes one `{ "ok": true, ... }` JSON envelope to stdout and nothing to stderr.

- [ ] **Step 5: Commit the guide-only orchestration change**

```bash
git add src/travel-server.ts test/demo-server-contract.test.ts
git commit -m "feat: guide Wayfare capability routing"
```

---

### Task 4: Align active documentation without weakening current capability truth

**Files:**

- Modify: `test/repository-readiness.test.ts:100-350`
- Modify: `README.md:1-45`
- Modify: `SPEC.md:1-55`
- Modify: `docs/architecture.md:24-60`
- Modify: `docs/customization.md:1-62`
- Modify: `docs/WAYFARE_TRAVEL_COMPANION.md:1-55`

**Interfaces:**

- Consumes: Task 1's single-entry homepage and Task 3's internal routing language.
- Produces: active documentation that distinguishes the agent-led website shell from the flights-only starter profile and the expanded illustrative profile.
- Preserves: the exact starter tool count, no-booking boundary, data-source disclosures, security model, and `/experience` visual-reference route.

- [ ] **Step 1: Add a failing active-documentation drift test**

Add this test to `test/repository-readiness.test.ts`:

```ts
it('documents the agent-led homepage without overstating available tools', async () => {
  const [readme, spec, architecture, customization, companion] = await Promise.all([
    repositoryFile('README.md'),
    repositoryFile('SPEC.md'),
    repositoryFile('docs/architecture.md'),
    repositoryFile('docs/customization.md'),
    repositoryFile('docs/WAYFARE_TRAVEL_COMPANION.md'),
  ]);
  const activeDocs = [readme, architecture, customization, companion].join('\n');

  expect(readme).toContain('single-entry cinematic landing');
  expect(spec).toContain('one general travel composer');
  expect(architecture).toContain('capability choice stays inside the agent');
  expect(customization).toContain('passive destination inspiration');
  expect(companion).toContain('one natural-language starting composer');
  expect(companion).toContain('Flights remain provider-backed');
  expect(activeDocs).not.toMatch(/offers accessible entry points for each|choose a planning view/i);
  expect(spec).toContain('Flights are the only operational travel domain.');
  expect(spec).toContain('It produces no checkout or handoff URL.');
});
```

Update the existing repository-readiness assertion from `shared multi-mode cinematic` to `single-entry cinematic landing`. Keep the assertions that the active hero uses `coreHeroModes`, the approved image masters exist, and the old shader layer remains absent.

In the existing `documents only the current editorial fields, CSS tokens, and verification label` test, replace the retired interactive-editorial assertion with:

```ts
expect(customization).toContain('passive editorial `heading` and `support`');
expect(customization).toContain('destination `prompt` remains available to `/experience`');
expect(customization).not.toContain('`heading`, `support`, `action`, and `prompt`');
```

- [ ] **Step 2: Run the documentation contract and verify current prose fails**

Run:

```bash
pnpm exec vitest run test/repository-readiness.test.ts
```

Expected: FAIL because active documentation still describes a shared multi-mode homepage and per-domain entry points.

- [ ] **Step 3: Make the minimum documentation edits**

Apply these exact content decisions:

- `README.md`: describe `/` as a `single-entry cinematic landing` with one natural-language composer; say the existing conversation, inline widgets, and Search → Select → Verify flight boundary are unchanged. Describe `/experience` as an optional visual-reference route, not the default homepage contract.
- `SPEC.md`: add a `Website starting experience` subsection stating: `The guest website exposes one general travel composer. The assistant chooses only among tools registered in the active server profile; the interface does not require a capability choice or imply that future domains are operational.` Keep `Flights are the only operational travel domain.` and `It produces no checkout or handoff URL.` unchanged.
- `docs/architecture.md`: state that `/` owns one composer and capability choice stays inside the agent. Preserve `TravelAssistantPage`, `TravelConversation`, inline MCP Apps, typed projection, and guest-session descriptions. Clarify that `/experience` may reuse the complete visual catalog without defining the default product entry model.
- `docs/customization.md`: explain that the default homepage uses the existing Explore master, one shared promise, one composer, passive destination inspiration, and passive editorial copy. State that destination `prompt` remains for `/experience`; it is not dispatched by the default homepage. Remove instructions to customize the retired homepage mode tabs or editorial action.
- `docs/WAYFARE_TRAVEL_COMPANION.md`: replace `offers accessible entry points for each illustrative or live domain` with `offers one natural-language starting composer`; say Flights remain provider-backed while stays, rewards, and travel protection remain illustrative. State that the agent selects among registered tools and the existing compact trip summary remains selection-driven.

Do not rewrite the starter product as if all domains are live, and do not document a provider handoff that the current tool surface does not produce.

- [ ] **Step 4: Run documentation and customization checks**

```bash
pnpm exec vitest run test/repository-readiness.test.ts test/customization.test.ts
pnpm customize:check
```

Expected: all commands exit 0 and the repository-readiness suite still proves the exact flights-only starter surface.

- [ ] **Step 5: Commit the documentation alignment**

```bash
git add README.md SPEC.md docs/architecture.md docs/customization.md docs/WAYFARE_TRAVEL_COMPANION.md test/repository-readiness.test.ts
git commit -m "docs: align Wayfare with agent-led entry"
```

---

### Task 5: Refresh generated guidance only if required and run the complete gate

**Files:**

- Conditionally regenerate: project-local Noodle agent files reported stale by `noodle agents doctor --json`
- Verify only: all implementation files from Tasks 1-4

**Interfaces:**

- Consumes: the complete agent-led homepage change.
- Produces: machine-validated repository state with no unrelated diff and no unreviewed generated changes.

- [ ] **Step 1: Inspect machine-readable agent-kit status**

```bash
./node_modules/.bin/noodle agents doctor --json
```

Expected: one JSON envelope with `ok: true`. If its machine-readable state reports stale generated files, run exactly:

```bash
./node_modules/.bin/noodle agents setup --write
./node_modules/.bin/noodle agents doctor --json
git diff -- .agents
```

Review the diff for generated version/guidance changes only. Do not manually edit `.agents` output.

- [ ] **Step 2: Run full web, root, and expanded-profile verification**

```bash
pnpm check:web
pnpm test
pnpm agent:check
pnpm agent:check:demo
pnpm agent:check:assistant
pnpm agent:check:demo:assistant
pnpm audit:generated-guidance
```

Expected: every command exits 0; every Noodle `--json` subcommand emits canonical success envelopes with empty stderr.

- [ ] **Step 3: Run repository safety checks**

```bash
pnpm customize:check
pnpm audit:history
pnpm audit:licenses
git diff --check
git status --short
```

Expected: checks exit 0. `git status --short` lists only generated agent files if Step 1 required a refresh; otherwise it is empty.

- [ ] **Step 4: Commit a required generated refresh as its own mechanical change**

Run this step only when Step 1 changed generated files:

```bash
git add .agents
git commit -m "chore: refresh Noodle agent guidance"
```

Expected: the commit contains generated agent files only.

- [ ] **Step 5: Review the branch against the design boundary**

```bash
git log --oneline --decorate origin/main..HEAD
git diff --stat origin/main...HEAD
git diff --name-status origin/main...HEAD
```

Expected implementation commits after the design and plan artifacts:

```text
feat: make Wayfare homepage agent-led
test: lock agent-led Wayfare entry experience
feat: guide Wayfare capability routing
docs: align Wayfare with agent-led entry
```

Confirm the diff contains no new provider tool, checkout URL, authentication system, durable trip store, side canvas, client intent router, or deployment mutation.

## Acceptance checklist

- [ ] `/` has one natural-language start path in main content.
- [ ] Capability tabs, prompt chips, capability cards, destination prompt actions, and the editorial start action are absent from `/`.
- [ ] Existing visual assets remain in use; supporting destination and editorial content is passive.
- [ ] One submitted prompt creates one existing assistant conversation turn.
- [ ] The existing transcript, official inline MCP Apps, typed trip projection, `TripBrief`, Stop, retry, reset, and error behavior remain green.
- [ ] The expanded agent guide makes capability choice internal without adding a tool or fixed universal workflow.
- [ ] Starter, expanded, live, illustrative, unavailable, and future capability states remain accurately distinguished.
- [ ] The homepage and conversation fit 320, 390, 768, and 1440 pixels and 200% text zoom without page-horizontal overflow.
- [ ] All focused and complete verification commands pass.
- [ ] No deployment or hosted mutation has occurred.
