# Airline Editorial Conversation Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete premium-airline-style landing page in which every travel action starts the existing guest assistant, while standardizing all non-code UI on Inter and preserving Search → Select → Verify.

**Architecture:** Keep the assistant lifecycle unchanged and route the hero, configured starter prompts, destination cards, and editorial feature through the existing `onStart(prompt)` boundary. Split the landing page into focused presentation components backed by one typed content module; keep navigation/settings in native dialogs and use local generated imagery with no remote browser dependencies.

**Tech Stack:** Next.js 16, React 19, TypeScript 7, `@fontsource-variable/inter` 5.3.0, Vitest, Testing Library, Playwright, local Noodle Assistant SDK, Noodle CLI, PNG/JPEG asset tooling

**Spec:** `docs/superpowers/specs/2026-08-28-airline-editorial-conversation-homepage-design.md`

## Global Constraints

- Start execution from committed spec revision `b0373a3` in an isolated clean worktree; the existing integration worktree contains unrelated unstaged dependency and generated-guidance changes that must remain untouched.
- Conversation is the booking surface. Landing components call only `onStart(prompt)` and never initialize the Assistant client, call Nuitee, or call an MCP tool directly.
- Preserve the existing guest-first lifecycle and exact Search → Select → Verify boundary.
- Do not add booking, payment, ticketing, passenger data, check-in, flight status, loyalty, hotels, cars, packages, transfers, newsletters, accounts, analytics, or geolocation.
- Use Inter for all non-code UI. Code and command samples retain a semantic monospace font.
- Keep the site light-theme only and preserve the neutral paper, white, deep navy, blue focus, muted text, and boundary tokens.
- Combined landing copy—excluding navigation, user prompt examples, legal link labels, and attribution—is at most 120 words.
- Every travel CTA sends one deterministic prompt through the existing initial-message path.
- Images are local, realistically generated, free of logos/readable signage/aircraft branding, web optimized, and reviewed through the exact-blob history-audit workflow.
- Maintain WCAG AA contrast, one `h1`, ordered `h2` sections, visible keyboard focus, native-dialog focus containment, Escape dismissal, 44×44px targets, and reduced-motion support.
- Pass 1440×1000, 768×1024, 390×844, 320×568, and 200% text-zoom checks without horizontal overflow.
- Local validation is not evidence of hosted readiness, public availability, adoption, or measured conversion impact.
- Use `apply_patch` for text edits. Stage only files named by the active task and review `git diff --cached --name-only` before every commit.

## File Structure

### New files

- `apps/web/src/lib/landing-content.ts` — typed destination and editorial prompt content; no React or runtime imports.
- `apps/web/src/components/travel-hero.tsx` — cinematic hero, composer, configured prompt buttons, and destination scroll cue.
- `apps/web/src/components/destination-inspiration.tsx` — accessible destination prompt cards.
- `apps/web/src/components/travel-capability-strip.tsx` — static Search → Compare → Verify explanation.
- `apps/web/src/components/travel-editorial-feature.tsx` — one photographic flexible-trip prompt entry.
- `apps/web/src/components/travel-footer.tsx` — guest disclosure, legal/help links, developer link, and attribution.
- `apps/web/src/components/travel-navigation-dialog.tsx` — native modal navigation with focus restoration and settings handoff.
- `apps/web/public/images/destinations/rome-dawn-v1.jpg` — Rome destination card image.
- `apps/web/public/images/destinations/london-river-v1.jpg` — London destination card image.
- `apps/web/public/images/destinations/istanbul-bosphorus-v1.jpg` — Istanbul destination card image.
- `apps/web/public/images/destinations/warm-horizon-v1.jpg` — wide editorial feature image.
- `apps/web/test/landing-content.test.ts` — content and prompt contract tests.
- `apps/web/test/landing-assets.test.ts` — local image presence, encoding, and size-budget tests.
- `docs/visual-assets/airline-editorial-homepage.md` — generated-image prompts, review notes, and derivative details.

### Modified files

- `package.json`, `apps/web/package.json`, and `pnpm-lock.yaml` — exact `@fontsource-variable/inter@5.3.0` dependency for the repository-owned MCP Apps and Next.js shell.
- `apps/web/app/layout.tsx` — import bundled variable Inter.
- `apps/web/app/globals.css` — Inter-only UI typography, landing layout, responsive header/menu, card, feature, and footer styles.
- `src/views/travel-home.tsx` and `src/views/flight-results.tsx` — import bundled variable Inter into both MCP App entry bundles.
- `src/views/travel.css` — make Inter the primary MCP App font.
- `test/widgets.test.tsx` — assert the repository-owned MCP Apps bundle and select Inter.
- `apps/web/src/components/travel-composer.tsx` — optional textarea ref/id for header-to-composer focus.
- `apps/web/src/components/travel-zero-state.tsx` — landing-page composition only.
- `apps/web/src/components/travel-header.tsx` — consumer actions and navigation-dialog trigger.
- `apps/web/src/components/travel-assistant-page.tsx` — one shared first-prompt boundary and focus wiring.
- `apps/web/app/developers/page.tsx` — inherits Inter; no content expansion.
- `apps/web/test/travel-zero-state.test.tsx` — hero, destinations, capability strip, feature, footer, and prompt-entry contracts.
- `apps/web/test/travel-header.test.tsx` — desktop/mobile navigation semantics and dialog behavior.
- `apps/web/test/travel-theme.test.ts` — preserve accessible light-theme token proof.
- `apps/web/test/travel-conversation.test.tsx` — prove all landing prompt sources still initialize one guest conversation.
- `apps/web/test/developer-page.test.tsx` — retain developer/legal behavior under global typography.
- `apps/web/test/browser/travel-shell.spec.ts` — responsive, font, keyboard, prompt-entry, motion, and visual-layout proof.
- `docs/customization.md` — explain safe replacement of the new landing content and generated image derivatives.

---

### Task 1: Define the typed landing-content contract

**Files:**
- Create: `apps/web/src/lib/landing-content.ts`
- Create: `apps/web/test/landing-content.test.ts`

**Interfaces:**
- Consumes: no runtime state; string asset paths are public-root paths.
- Produces: `LandingDestination`, `LandingEditorialFeature`, `landingDestinations`, and `landingEditorialFeature` for Tasks 4 and 5.

- [ ] **Step 1: Write the failing content contract test**

Create `apps/web/test/landing-content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  landingDestinations,
  landingEditorialFeature,
} from '../src/lib/landing-content';

describe('airline editorial landing content', () => {
  it('defines three deterministic destination prompt entries', () => {
    expect(landingDestinations).toEqual([
      {
        id: 'rome',
        name: 'Rome',
        descriptor: 'Long weekends',
        prompt: 'Help me plan a long-weekend flight to Rome for two.',
        imageSrc: '/images/destinations/rome-dawn-v1.jpg',
        imagePosition: 'center 48%',
      },
      {
        id: 'london',
        name: 'London',
        descriptor: 'Nonstop options',
        prompt: 'Compare nonstop flight options to London.',
        imageSrc: '/images/destinations/london-river-v1.jpg',
        imagePosition: 'center 52%',
      },
      {
        id: 'istanbul',
        name: 'Istanbul',
        descriptor: 'Flexible dates',
        prompt: 'Find flights to Istanbul with flexible dates.',
        imageSrc: '/images/destinations/istanbul-bosphorus-v1.jpg',
        imagePosition: 'center 46%',
      },
    ]);
  });

  it('defines one honest flexible-trip editorial prompt', () => {
    expect(landingEditorialFeature).toEqual({
      eyebrow: 'Travel inspiration',
      heading: 'A few words can take you somewhere new.',
      support: 'Refine the dates, travellers, cabin, and route as you go.',
      action: 'Start with a flexible trip',
      prompt: 'Help me find a trip somewhere warm with flexible dates.',
      imageSrc: '/images/destinations/warm-horizon-v1.jpg',
      imagePosition: 'center 54%',
    });
  });

  it('keeps every destination id and submitted prompt unique', () => {
    expect(new Set(landingDestinations.map(({ id }) => id)).size).toBe(3);
    expect(new Set(landingDestinations.map(({ prompt }) => prompt)).size).toBe(3);
  });
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/landing-content.test.ts
```

Expected: FAIL because `../src/lib/landing-content` does not exist.

- [ ] **Step 3: Add the typed content module**

Create `apps/web/src/lib/landing-content.ts`:

```ts
export interface LandingDestination {
  readonly id: 'rome' | 'london' | 'istanbul';
  readonly name: string;
  readonly descriptor: string;
  readonly prompt: string;
  readonly imageSrc: string;
  readonly imagePosition: string;
}

export interface LandingEditorialFeature {
  readonly eyebrow: string;
  readonly heading: string;
  readonly support: string;
  readonly action: string;
  readonly prompt: string;
  readonly imageSrc: string;
  readonly imagePosition: string;
}

export const landingDestinations = [
  {
    id: 'rome',
    name: 'Rome',
    descriptor: 'Long weekends',
    prompt: 'Help me plan a long-weekend flight to Rome for two.',
    imageSrc: '/images/destinations/rome-dawn-v1.jpg',
    imagePosition: 'center 48%',
  },
  {
    id: 'london',
    name: 'London',
    descriptor: 'Nonstop options',
    prompt: 'Compare nonstop flight options to London.',
    imageSrc: '/images/destinations/london-river-v1.jpg',
    imagePosition: 'center 52%',
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    descriptor: 'Flexible dates',
    prompt: 'Find flights to Istanbul with flexible dates.',
    imageSrc: '/images/destinations/istanbul-bosphorus-v1.jpg',
    imagePosition: 'center 46%',
  },
] as const satisfies readonly LandingDestination[];

export const landingEditorialFeature = {
  eyebrow: 'Travel inspiration',
  heading: 'A few words can take you somewhere new.',
  support: 'Refine the dates, travellers, cabin, and route as you go.',
  action: 'Start with a flexible trip',
  prompt: 'Help me find a trip somewhere warm with flexible dates.',
  imageSrc: '/images/destinations/warm-horizon-v1.jpg',
  imagePosition: 'center 54%',
} as const satisfies LandingEditorialFeature;
```

- [ ] **Step 4: Run focused test and typecheck**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/landing-content.test.ts
pnpm --filter @nuitee-travel-starter/web typecheck
```

Expected: both commands PASS.

- [ ] **Step 5: Commit only the content contract**

```bash
git add apps/web/src/lib/landing-content.ts apps/web/test/landing-content.test.ts
git diff --cached --name-only
git commit -m "feat: define editorial travel prompts"
```

Expected staged paths: exactly the two files above.

---

### Task 2: Standardize every non-code surface on bundled Inter

**Files:**
- Modify: `package.json`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `src/views/travel-home.tsx`
- Modify: `src/views/flight-results.tsx`
- Modify: `src/views/travel.css`
- Modify: `test/widgets.test.tsx`
- Modify: `apps/web/test/browser/travel-shell.spec.ts`

**Interfaces:**
- Consumes: existing root layout and light-theme tokens.
- Produces: one locally bundled `Inter Variable` face inherited by hero, conversation, settings, repository-owned MCP Apps, and developer page; code/pre remain monospace.

- [ ] **Step 1: Add a failing browser assertion for global Inter**

Add to `apps/web/test/browser/travel-shell.spec.ts`:

```ts
test('uses Inter throughout the consumer and developer UI', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const consumerFonts = await page.locator('body, h1, button, textarea')
    .evaluateAll((elements) => elements.map((element) => (
      getComputedStyle(element).fontFamily
    )));
  expect(consumerFonts.every((font) => font.includes('Inter Variable'))).toBe(true);

  await page.goto('/developers');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('body')).toHaveCSS('font-family', /Inter Variable/);
  await expect(page.locator('code').first()).not.toHaveCSS(
    'font-family',
    /Inter Variable/,
  );
});
```

- [ ] **Step 2: Run the focused desktop browser test and observe RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec playwright test test/browser/travel-shell.spec.ts --project=desktop-chromium --grep "uses Inter throughout"
```

Expected: FAIL because the body uses the current Avenir/system stack and the hero heading uses Iowan/Baskerville.

- [ ] **Step 3: Add a failing MCP App typography contract**

In `test/widgets.test.tsx`, rename `uses host-native typography and includes responsive accessibility safeguards` to `uses bundled Inter and includes responsive accessibility safeguards`. Replace the host-native family assertions with:

```ts
expect(css).toContain('font-family: "Inter Variable", Inter');
expect(readFileSync(new URL('../src/views/travel-home.tsx', import.meta.url), 'utf8'))
  .toContain("import '@fontsource-variable/inter';");
expect(readFileSync(new URL('../src/views/flight-results.tsx', import.meta.url), 'utf8'))
  .toContain("import '@fontsource-variable/inter';");
```

Run:

```bash
pnpm exec vitest run test/widgets.test.tsx
```

Expected: FAIL because the MCP Apps use the host-native stack and do not import Inter.

- [ ] **Step 4: Install the exact bundled font package in both package boundaries**

Run:

```bash
pnpm add -w @fontsource-variable/inter@5.3.0 --save-exact
pnpm --filter @nuitee-travel-starter/web add @fontsource-variable/inter@5.3.0 --save-exact
```

Confirm both `package.json` and `apps/web/package.json` contain exactly:

```json
"@fontsource-variable/inter": "5.3.0"
```

- [ ] **Step 5: Import Inter and remove explicit display-serif styling**

At the top of `apps/web/app/layout.tsx`, add:

```ts
import '@fontsource-variable/inter';
```

Set the global UI family in `apps/web/app/globals.css`:

```css
:root {
  font-family: "Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif;
}

button,
textarea,
input,
select {
  font: inherit;
}

pre,
code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}
```

Remove every `Iowan Old Style`, `Baskerville`, `Times New Roman`, Avenir, and `SF Pro Text` declaration. Do not change code/pre semantics.

At the top of both `src/views/travel-home.tsx` and `src/views/flight-results.tsx`, add:

```ts
import '@fontsource-variable/inter';
```

Change the `.cc-app` font declaration in `src/views/travel.css` to:

```css
font-family: "Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif;
```

- [ ] **Step 6: Run browser, MCP App, typecheck, build, and license gates**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec playwright test test/browser/travel-shell.spec.ts --project=desktop-chromium --grep "uses Inter throughout"
pnpm exec vitest run test/widgets.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web build
pnpm audit:licenses
```

Expected: all PASS; license audit reports OFL-1.1 for the added font package and zero missing license records.

- [ ] **Step 7: Commit only the Inter dependency and typography changes**

```bash
git add package.json apps/web/package.json pnpm-lock.yaml apps/web/app/layout.tsx apps/web/app/globals.css src/views/travel-home.tsx src/views/flight-results.tsx src/views/travel.css test/widgets.test.tsx apps/web/test/browser/travel-shell.spec.ts
git diff --cached --name-only
git commit -m "style: standardize travel UI on Inter"
```

Expected staged paths: exactly the ten files above. If execution did not start from a clean worktree, stop rather than stage unrelated dependency-upgrade hunks.

---

### Task 3: Simplify the cinematic hero and focus contract

**Files:**
- Create: `apps/web/src/components/travel-hero.tsx`
- Modify: `apps/web/src/components/travel-composer.tsx`
- Modify: `apps/web/src/components/travel-zero-state.tsx`
- Modify: `apps/web/src/components/travel-assistant-page.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/travel-zero-state.test.tsx`
- Modify: `apps/web/test/travel-conversation.test.tsx`

**Interfaces:**
- Consumes: `starterConfig.prompts`, `TravelComposer`, and the existing `(prompt: string) => void` start callback.
- Produces: `TravelHero({ inputRef, launchError, onStart })`; `TravelComposer.inputRef?: Ref<HTMLTextAreaElement>`; one focusable textarea with id `travel-prompt`.

- [ ] **Step 1: Replace the old hero expectations with the approved copy contract**

Update the first test in `apps/web/test/travel-zero-state.test.tsx` to assert:

```ts
expect(screen.getByRole('heading', {
  level: 1,
  name: 'Where will you go next?',
})).toBeVisible();
expect(screen.getByText(
  'Tell us the trip. We’ll find the flights and verify the fare.',
)).toBeVisible();
expect(screen.getByRole('button', { name: 'Find flights' })).toBeDisabled();
expect(screen.getByRole('link', { name: 'Explore destinations' }))
  .toHaveAttribute('href', '#places-to-start');
expect(screen.queryByText('A new way to find your flight')).not.toBeInTheDocument();
expect(screen.queryByText(
  'Built on Noodle Seed · Powered by Nuitee',
)).not.toBeInTheDocument();
expect(screen.getAllByText(starterConfig.brand.name)).toHaveLength(1);
expect(screen.queryByText('Guest trip')).not.toBeInTheDocument();
```

Keep the existing typed-submit, Enter, Shift+Enter, decorative-image, and no-assistant-before-submit assertions.

- [ ] **Step 2: Run the focused tests and observe RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-zero-state.test.tsx test/travel-conversation.test.tsx
```

Expected: FAIL on the old headline, copy, attribution position, duplicate brand, and action label.

- [ ] **Step 3: Add the composer ref contract**

In `apps/web/src/components/travel-composer.tsx`, add:

```ts
import { type FormEvent, type Ref, useState } from 'react';

interface TravelComposerProps {
  readonly inputId?: string;
  readonly inputRef?: Ref<HTMLTextAreaElement>;
  // retain every existing prop unchanged
}
```

Apply `id={inputId}` and `ref={inputRef}` to the textarea. Do not move draft state out of the composer.

- [ ] **Step 4: Create the focused hero component**

Create `apps/web/src/components/travel-hero.tsx` with this public shape:

```tsx
'use client';

import Image from 'next/image';
import type { Ref } from 'react';
import { starterConfig } from '../../../../starter.config';
import { TravelComposer } from './travel-composer';

interface TravelHeroProps {
  readonly inputRef: Ref<HTMLTextAreaElement>;
  readonly launchError?: string | null;
  readonly onStart: (prompt: string) => void;
}

export function TravelHero({ inputRef, launchError, onStart }: Readonly<TravelHeroProps>) {
  return (
    <section className="travel-hero" aria-labelledby="travel-home-title">
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
          <h1 id="travel-home-title">Where will you go next?</h1>
          <p>Tell us the trip. We’ll find the flights and verify the fare.</p>
        </div>
        <TravelComposer
          formLabel="Plan a trip"
          inputId="travel-prompt"
          inputRef={inputRef}
          onSubmit={onStart}
          placeholder="Islamabad to Rome for two, next weekend"
          submitLabel="Find flights"
          variant="hero"
          visibleSubmitLabel="Find flights"
        />
        <ul className="travel-starter-prompts" aria-label="Suggested trips">
          {starterConfig.prompts.slice(0, 2).map((prompt) => (
            <li key={prompt}>
              <button type="button" onClick={() => onStart(prompt)}>{prompt}</button>
            </li>
          ))}
        </ul>
        <a className="travel-hero__scroll-cue" href="#places-to-start">
          Explore destinations
        </a>
        {launchError ? <p className="travel-zero-state__error" role="alert">{launchError}</p> : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Make `TravelZeroState` a landing orchestrator and wire the ref once**

Change `TravelZeroState` to accept `inputRef: Ref<HTMLTextAreaElement>` and initially render only:

```tsx
<div className="travel-landing">
  <TravelHero inputRef={inputRef} launchError={launchError} onStart={onStart} />
</div>
```

In `TravelAssistantPage`, create:

```ts
const heroInputRef = useRef<HTMLTextAreaElement>(null);
```

Put `id="travel-canvas" tabIndex={-1}` on the zero-state `<main>` and pass `inputRef={heroInputRef}` to `TravelZeroState`. Keep `startConversation` as the only normalization/runtime guard.

- [ ] **Step 6: Replace the old hero typography/layout rules**

In `globals.css`:

- set `.travel-hero { min-height: 88svh; }` on desktop;
- remove `.travel-hero__brand` and `.travel-hero__headline-phrase` rules;
- use Inter, `font-weight: 620`, and a non-orphaning max width for the hero heading;
- keep the functional navy scrim;
- add a quiet text scroll cue with a 44px target;
- let mobile hero height follow content rather than forcing `100svh`.

- [ ] **Step 7: Run focused unit tests, typecheck, and desktop browser hero checks**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-zero-state.test.tsx test/travel-conversation.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web exec playwright test test/browser/travel-shell.spec.ts --project=desktop-chromium --grep "cinematic|Inter"
```

Expected: PASS. The retired-heading browser assertions may require updating to the approved heading in this task; do not weaken fit, contrast, keyboard, or no-request assertions.

- [ ] **Step 8: Commit the simplified hero slice**

```bash
git add apps/web/src/components/travel-hero.tsx apps/web/src/components/travel-composer.tsx apps/web/src/components/travel-zero-state.tsx apps/web/src/components/travel-assistant-page.tsx apps/web/app/globals.css apps/web/test/travel-zero-state.test.tsx apps/web/test/travel-conversation.test.tsx apps/web/test/browser/travel-shell.spec.ts
git diff --cached --name-only
git commit -m "feat: simplify the conversation-first hero"
```

---

### Task 4: Generate, optimize, document, and audit destination imagery

**Files:**
- Create: `apps/web/public/images/destinations/rome-dawn-v1.jpg`
- Create: `apps/web/public/images/destinations/london-river-v1.jpg`
- Create: `apps/web/public/images/destinations/istanbul-bosphorus-v1.jpg`
- Create: `apps/web/public/images/destinations/warm-horizon-v1.jpg`
- Create: `apps/web/test/landing-assets.test.ts`
- Create: `docs/visual-assets/airline-editorial-homepage.md`
- Modify: `security/reviewed-binary-blobs.txt`
- Modify: `docs/customization.md`

**Interfaces:**
- Consumes: image paths from `landing-content.ts` and the image-generation skill.
- Produces: four local, reviewed JPEG derivatives under 1.5MB each for Task 5.

- [ ] **Step 1: Write a failing local-asset budget test**

Create `apps/web/test/landing-assets.test.ts`:

```ts
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { landingDestinations, landingEditorialFeature } from '../src/lib/landing-content';

const publicRoot = join(import.meta.dirname, '..', 'public');

describe('editorial landing imagery', () => {
  it.each([
    ...landingDestinations.map(({ imageSrc }) => imageSrc),
    landingEditorialFeature.imageSrc,
  ])('%s is a local optimized JPEG', (imageSrc) => {
    const path = join(publicRoot, imageSrc);
    const bytes = readFileSync(path);
    expect([...bytes.subarray(0, 2)]).toEqual([0xff, 0xd8]);
    expect(statSync(path).size).toBeGreaterThan(100_000);
    expect(statSync(path).size).toBeLessThan(1_500_000);
  });
});
```

- [ ] **Step 2: Run the asset test and observe RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/landing-assets.test.ts
```

Expected: FAIL with `ENOENT` for the first missing destination image.

- [ ] **Step 3: Generate the four source images using the imagegen skill**

Use the highest native resolution available. Generate each image separately with these prompts:

**Rome**

```text
Ultra-realistic premium travel editorial photograph of Rome at early morning, warm natural sunlight across terracotta rooftops and layered historic architecture, a quiet elevated viewpoint, cinematic depth, sophisticated airline campaign photography, no people in foreground, no logos, no readable signage, no text, no watermark, landscape 3:2 composition with safe space for responsive cropping.
```

**London**

```text
Ultra-realistic premium travel editorial photograph of London beside the River Thames at blue hour, restrained modern skyline and historic riverside architecture, natural atmospheric light, elegant airline campaign photography, no prominent brands, no readable signage, no text, no watermark, landscape 3:2 composition with strong center subject and safe responsive crop.
```

**Istanbul**

```text
Ultra-realistic premium travel editorial photograph of Istanbul and the Bosphorus at golden hour, layered waterfront city, ferries as small unbranded silhouettes, warm haze and detailed architecture, sophisticated airline campaign photography, no logos, no readable signage, no text, no watermark, landscape 3:2 composition with safe responsive crop.
```

**Warm editorial feature**

```text
Ultra-realistic cinematic Mediterranean coastal travel photograph at late afternoon, luminous sea, pale cliffs, a quiet winding shoreline and warm horizon, premium airline campaign aesthetic, no people in foreground, no buildings with logos, no readable signage, no text, no watermark, wide 16:9 composition with darker safe area for adjacent copy.
```

Save the raw outputs outside the repository under `/private/tmp/airline-editorial-sources/`.

- [ ] **Step 4: Inspect every source and reject visual defects**

Open each source with `view_image` at original detail. Reject and regenerate any image with malformed architecture, repeated objects, implausible water/sky boundaries, text-like artefacts, visible logos, branded aircraft, or identifiable foreground faces.

- [ ] **Step 5: Create the web derivatives**

Create `apps/web/public/images/destinations/`, then convert each approved source to JPEG quality 84 and a maximum width of 1920px. Use `sips` on macOS:

```bash
sips -Z 1920 -s format jpeg -s formatOptions 84 /private/tmp/airline-editorial-sources/rome.png --out apps/web/public/images/destinations/rome-dawn-v1.jpg
sips -Z 1920 -s format jpeg -s formatOptions 84 /private/tmp/airline-editorial-sources/london.png --out apps/web/public/images/destinations/london-river-v1.jpg
sips -Z 1920 -s format jpeg -s formatOptions 84 /private/tmp/airline-editorial-sources/istanbul.png --out apps/web/public/images/destinations/istanbul-bosphorus-v1.jpg
sips -Z 2560 -s format jpeg -s formatOptions 84 /private/tmp/airline-editorial-sources/warm-horizon.png --out apps/web/public/images/destinations/warm-horizon-v1.jpg
```

Run `sips -g pixelWidth -g pixelHeight` separately for each derivative. Card images must be at least 1536px wide; the feature must be at least 1920px wide.

- [ ] **Step 6: Document source prompts and visual review**

Create `docs/visual-assets/airline-editorial-homepage.md` with:

- the four exact prompts above;
- generation date `2026-08-28`;
- the generation tool name;
- source files kept outside git;
- committed derivative path, pixel dimensions, byte size, and crop notes;
- explicit review result for logos, readable signage, faces, architecture, and responsive safe areas;
- statement that the assets are generated demo imagery, not destination or fare evidence.

- [ ] **Step 7: Record the four reviewed exact blob IDs before commit**

Only after completing the original-detail visual review, run `git hash-object` separately for each derivative:

```bash
git hash-object apps/web/public/images/destinations/rome-dawn-v1.jpg
git hash-object apps/web/public/images/destinations/london-river-v1.jpg
git hash-object apps/web/public/images/destinations/istanbul-bosphorus-v1.jpg
git hash-object apps/web/public/images/destinations/warm-horizon-v1.jpg
```

Append one exact `<printed-hash> <repository-path>` line per image to `security/reviewed-binary-blobs.txt`. Do not add a glob, directory exception, placeholder hash, or copied hash from another path.

- [ ] **Step 8: Document safe landing-content customization**

Add `## Editorial landing content` to `docs/customization.md`. Name `apps/web/src/lib/landing-content.ts`, the four image paths, and the exact prompt fields a template adopter changes. Require owned/licensed or generated images, new exact-blob review lines for changed bytes, local paths, realistic but non-evidentiary imagery, and no fabricated fare, discount, availability, airline partnership, or destination guarantee.

- [ ] **Step 9: Run the asset test and diff checks**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/landing-assets.test.ts
git diff --check
```

Expected: asset test PASS and the diff is clean.

- [ ] **Step 10: Commit the reviewed imagery slice**

```bash
git add apps/web/public/images/destinations/rome-dawn-v1.jpg apps/web/public/images/destinations/london-river-v1.jpg apps/web/public/images/destinations/istanbul-bosphorus-v1.jpg apps/web/public/images/destinations/warm-horizon-v1.jpg apps/web/test/landing-assets.test.ts docs/visual-assets/airline-editorial-homepage.md docs/customization.md security/reviewed-binary-blobs.txt
git diff --cached --name-only
git commit -m "feat: add editorial destination imagery"
```

- [ ] **Step 11: Prove the committed binary history gate**

Run:

```bash
pnpm audit:history
```

Expected: PASS with zero unreviewed binary artifacts. If it fails on one of the four new paths, compare that committed file's `git hash-object` output with its ledger line, correct only the mismatched line, amend the imagery commit, and rerun.

---

### Task 5: Add destination discovery, capability, editorial, and footer sections

**Files:**
- Create: `apps/web/src/components/destination-inspiration.tsx`
- Create: `apps/web/src/components/travel-capability-strip.tsx`
- Create: `apps/web/src/components/travel-editorial-feature.tsx`
- Create: `apps/web/src/components/travel-footer.tsx`
- Modify: `apps/web/src/components/travel-zero-state.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/travel-zero-state.test.tsx`
- Modify: `apps/web/test/travel-conversation.test.tsx`

**Interfaces:**
- Consumes: `landingDestinations`, `landingEditorialFeature`, `starterConfig`, and `onStart(prompt)`.
- Produces: `DestinationInspiration({ onStart })`, `TravelCapabilityStrip()`, `TravelEditorialFeature({ onStart })`, and `TravelFooter()`.

- [ ] **Step 1: Add failing section and prompt-entry tests**

Add to `travel-zero-state.test.tsx`:

```ts
it('renders a concise airline editorial landing structure', () => {
  render(<TravelZeroState inputRef={{ current: null }} onStart={vi.fn()} />);

  expect(screen.getByRole('heading', { level: 2, name: 'Places to start' }))
    .toBeVisible();
  expect(screen.getByText('Search live flights')).toBeVisible();
  expect(screen.getByText('Compare your options')).toBeVisible();
  expect(screen.getByText('Verify the fare')).toBeVisible();
  expect(screen.getByRole('heading', {
    level: 2,
    name: 'A few words can take you somewhere new.',
  })).toBeVisible();
  expect(screen.getByText('Built on Noodle Seed · Powered by Nuitee'))
    .toBeVisible();
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
});

it.each(landingDestinations)(
  'starts the $name destination prompt through onStart',
  ({ name, prompt }) => {
    const onStart = vi.fn();
    render(<TravelZeroState inputRef={{ current: null }} onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: `Plan a trip to ${name}` }));
    expect(onStart).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledWith(prompt);
  },
);

it('starts the flexible editorial prompt through onStart', () => {
  const onStart = vi.fn();
  render(<TravelZeroState inputRef={{ current: null }} onStart={onStart} />);
  fireEvent.click(screen.getByRole('button', {
    name: landingEditorialFeature.action,
  }));
  expect(onStart).toHaveBeenCalledWith(landingEditorialFeature.prompt);
});
```

Also test the configured privacy/terms fallback and `For developers` link in the footer.

- [ ] **Step 2: Run the zero-state test and observe RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-zero-state.test.tsx
```

Expected: FAIL because the four sections do not exist.

- [ ] **Step 3: Implement `DestinationInspiration`**

Render a section with `id="places-to-start"`, heading `Places to start`, and three semantic buttons. Each button contains a decorative `next/image` image, destination name, and descriptor; its accessible name is `Plan a trip to ${name}` and its click handler calls `onStart(prompt)` exactly once.

Public signature:

```ts
interface DestinationInspirationProps {
  readonly onStart: (prompt: string) => void;
}

export function DestinationInspiration(
  props: Readonly<DestinationInspirationProps>,
): React.JSX.Element;
```

- [ ] **Step 4: Implement the bounded capability strip**

Render exactly these items and supporting lines:

```ts
const capabilities = [
  ['Search live flights', 'Use current availability from Nuitee.'],
  ['Compare your options', 'Review schedules, stops, baggage, and price.'],
  ['Verify the fare', 'Check availability and price before you leave.'],
] as const;
```

Use an ordered list with `aria-label="How the travel assistant works"`. It has no click handlers.

- [ ] **Step 5: Implement the editorial feature and footer**

`TravelEditorialFeature` renders the configured image, eyebrow, `h2`, support sentence, and a semantic button that calls `onStart(landingEditorialFeature.prompt)`.

`TravelFooter` renders:

- configured brand and `Thoughtful journeys, conversationally planned`;
- `For developers` and `Support` links;
- configured Privacy/Terms links or the existing `Not configured` fallback labels;
- `Guest session` and `No account is required to plan a trip.`;
- exact attribution `Built on Noodle Seed · Powered by Nuitee`.

- [ ] **Step 6: Compose the landing page in the approved order**

Update `TravelZeroState`:

```tsx
<div className="travel-landing">
  <TravelHero inputRef={inputRef} launchError={launchError} onStart={onStart} />
  <DestinationInspiration onStart={onStart} />
  <TravelCapabilityStrip />
  <TravelEditorialFeature onStart={onStart} />
  <TravelFooter />
</div>
```

Do not move `onStart` normalization or runtime guards out of `TravelAssistantPage`.

- [ ] **Step 7: Add section layout and interaction CSS**

Implement:

- max 1200px centered content grid below the hero;
- three equal destination cards at desktop, two columns plus spanning third at tablet, one column mobile;
- card image aspect ratio 4:3 and overlay that preserves text contrast;
- capability strip as three ordered columns desktop and stacked rows mobile;
- wide editorial image/copy composition with no carousel;
- restrained footer with 44px links and no extra marketing groups;
- visible hover/focus states that do not move layout.

- [ ] **Step 8: Prove all entry sources still initialize exactly one conversation**

In `travel-conversation.test.tsx`, add parameterized cases for one destination prompt and the editorial prompt. Each case renders `TravelAssistantPage`, activates the landing action, waits for `client.sendMessage`, and asserts the exact prompt and one call.

- [ ] **Step 9: Run focused unit tests, typecheck, and build**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/landing-content.test.ts test/landing-assets.test.ts test/travel-zero-state.test.tsx test/travel-conversation.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web build
```

Expected: all PASS and `/` plus `/developers` build successfully.

- [ ] **Step 10: Commit the below-fold landing experience**

```bash
git add apps/web/src/components/destination-inspiration.tsx apps/web/src/components/travel-capability-strip.tsx apps/web/src/components/travel-editorial-feature.tsx apps/web/src/components/travel-footer.tsx apps/web/src/components/travel-zero-state.tsx apps/web/app/globals.css apps/web/test/travel-zero-state.test.tsx apps/web/test/travel-conversation.test.tsx
git diff --cached --name-only
git commit -m "feat: add conversation-first travel discovery"
```

---

### Task 6: Simplify responsive navigation with a native dialog

**Files:**
- Create: `apps/web/src/components/travel-navigation-dialog.tsx`
- Modify: `apps/web/src/components/travel-header.tsx`
- Modify: `apps/web/src/components/travel-assistant-page.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/travel-header.test.tsx`
- Modify: `apps/web/test/travel-zero-state.test.tsx`

**Interfaces:**
- Consumes: `starterConfig.website`, the shared hero textarea ref, `onOpenSettings`, `onNewTrip`, and page `mode`.
- Produces: `TravelHeader.onPlanTrip: () => void` and `TravelNavigationDialog({ mode, open, onClose, onNewTrip, onOpenSettings, onPlanTrip })`.

- [ ] **Step 1: Write failing header and focus tests**

Replace the current hero-header test with assertions that:

```ts
const onPlanTrip = vi.fn();
const onOpenSettings = vi.fn();
render(
  <TravelHeader
    mode="hero"
    onNewTrip={vi.fn()}
    onOpenSettings={onOpenSettings}
    onPlanTrip={onPlanTrip}
  />,
);

expect(screen.getByRole('button', { name: 'Plan a trip' })).toBeVisible();
expect(screen.getByRole('link', { name: 'For developers' }))
  .toHaveAttribute('href', starterConfig.website.developerPath);
expect(screen.queryByText('Guest trip')).not.toBeInTheDocument();

const trigger = screen.getByRole('button', { name: 'Open menu' });
fireEvent.click(trigger);
expect(screen.getByRole('dialog', { name: 'Travel menu' })).toBeVisible();
fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
expect(onOpenSettings).toHaveBeenCalledOnce();
expect(screen.queryByRole('dialog', { name: 'Travel menu' }))
  .not.toBeInTheDocument();
```

Add separate tests for Escape dismissal/focus restoration, Plan-a-trip callback, conversation-mode New-trip callback, developer/support/legal links, and no unsupported utility labels.

- [ ] **Step 2: Run the header suite and observe RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-header.test.tsx test/travel-zero-state.test.tsx
```

Expected: FAIL because `onPlanTrip`, the menu trigger, and dialog do not exist and `Guest trip` still renders.

- [ ] **Step 3: Implement the native navigation dialog**

Model its lifecycle on the existing `SettingsSheet`:

- hold a `HTMLDialogElement` ref;
- call `showModal()` when available and set `open` as a test fallback;
- focus the close button on open;
- contain Tab/Shift+Tab within dialog links/buttons;
- handle native `cancel` plus explicit Escape;
- close before invoking Plan, New trip, or Settings;
- restore focus to the menu trigger on cleanup.

Dialog content:

- hero mode: Plan a trip, For developers, Settings, Support, configured Privacy/Terms or non-link `Not configured` rows;
- conversation mode: New trip, For developers, Settings, Support, and the same legal rows.

- [ ] **Step 4: Update the header API and visible actions**

Use:

```ts
interface TravelHeaderProps {
  readonly mode: 'hero' | 'conversation';
  readonly onNewTrip: () => void;
  readonly onOpenSettings: () => void;
  readonly onPlanTrip: () => void;
}
```

Desktop hero header: brand, Plan a trip, For developers, Open menu.

Desktop conversation header: brand, New trip, For developers, Open menu.

Mobile header: brand and Open menu only; hide direct actions with CSS rather than duplicating DOM labels.

Remove `Guest trip` entirely from `TravelHeader`.

- [ ] **Step 5: Wire Plan a trip to the existing hero textarea**

In `TravelAssistantPage`:

```ts
function focusPlanTrip() {
  heroInputRef.current?.focus();
}
```

Pass `onPlanTrip={focusPlanTrip}` to the hero header and `onPlanTrip={reset}` to the conversation header. `TravelHeader` and `TravelNavigationDialog` do not render a Plan-a-trip action in conversation mode, so the latter callback remains unreachable through UI. Clicking Plan a trip in hero mode must not call `startConversation` or initialize the Assistant client.

- [ ] **Step 6: Add responsive header and dialog CSS**

- transparent light header over the hero;
- neutral solid header in conversation mode;
- desktop direct action group plus 44px menu trigger;
- at `max-width: 700px`, brand plus menu only;
- dialog sized to content on desktop and a bottom/side sheet on mobile without exceeding viewport height;
- no sticky transformed navigation after the hero;
- `prefers-reduced-motion` removes dialog transitions.

- [ ] **Step 7: Run unit, type, and focused browser keyboard checks**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-header.test.tsx test/travel-zero-state.test.tsx test/travel-conversation.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web exec playwright test test/browser/travel-shell.spec.ts --project=desktop-chromium --grep "keyboard|cinematic"
```

Expected: PASS; no assistant request occurs when Plan a trip only focuses the composer.

- [ ] **Step 8: Commit navigation as an isolated slice**

```bash
git add apps/web/src/components/travel-navigation-dialog.tsx apps/web/src/components/travel-header.tsx apps/web/src/components/travel-assistant-page.tsx apps/web/app/globals.css apps/web/test/travel-header.test.tsx apps/web/test/travel-zero-state.test.tsx apps/web/test/travel-conversation.test.tsx apps/web/test/browser/travel-shell.spec.ts
git diff --cached --name-only
git commit -m "feat: simplify responsive travel navigation"
```

---

### Task 7: Complete responsive, accessibility, and repository verification

**Files:**
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/browser/travel-shell.spec.ts`
- Modify: `apps/web/test/travel-theme.test.ts`
- Modify: `apps/web/test/developer-page.test.tsx` only if the global font import exposes a legitimate regression
- Create: `.superpowers/sdd/2026-08-28-airline-editorial-conversation-homepage/final-report.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: deterministic browser evidence and an exact-SHA verification report; no new product capability.

- [ ] **Step 1: Add the final browser assertions before visual fixes**

Update `travel-shell.spec.ts` to prove:

```ts
await expect(page.getByRole('heading', {
  level: 1,
  name: 'Where will you go next?',
})).toBeVisible();
await expect(page.getByRole('heading', {
  level: 2,
  name: 'Places to start',
})).toBeVisible();
await expect(page.getByRole('contentinfo')).toContainText(
  'Built on Noodle Seed · Powered by Nuitee',
);
await expect(page.locator('h1')).toHaveCount(1);
await expect(page.locator('[data-atmosphere-canvas]')).toHaveCount(0);
```

Add project-scoped tests that:

- verify the next section begins within 120px below the desktop first viewport;
- assert three destination cards at desktop and stacked cards at 390px;
- assert 44px minimum targets for menu, composer action, destination cards, editorial action, and footer links;
- tab into the menu, activate it, cycle focus, dismiss with Escape, and verify trigger focus restoration;
- click one destination card with the session endpoint deterministically stubbed, then assert the conversation heading and one initial prompt submission;
- verify no Assistant request before any landing action;
- assert `scrollWidth === viewport width` at 320px, 390px, 768px, and 1440px;
- set root font size to 200% at 390px and repeat horizontal-fit and target-visibility checks;
- emulate reduced motion and assert landing/menu transition durations are `0s`;
- navigate to `/developers` and verify static content, Inter, and configured legal behavior.

- [ ] **Step 2: Run the full browser suite and capture RED evidence**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web test:browser
```

Expected: any remaining responsive, target-size, first-viewport, or keyboard mismatch fails with a specific assertion. Do not raise timeouts or weaken assertions.

- [ ] **Step 3: Apply only the CSS/semantic fixes required by those failures**

Use existing tokens. Required end state:

- desktop hero `min-height: 88svh` and visible destination-section edge;
- 320px/390px composer stacks without button overlap;
- destination cards are 3/2+span/1 columns at desktop/tablet/mobile;
- capability strip is 3/1 columns;
- editorial image/copy stays readable without overlay on narrow screens;
- footer links and menu controls meet 44px minimum;
- no fixed-width element causes horizontal overflow;
- no perpetual animation or decorative gradient is introduced.

- [ ] **Step 4: Capture and inspect final visual evidence**

Capture full-page screenshots at:

```text
1440×1000
768×1024
390×844
320×568
390×844 with 200% root text
```

Open each image with `view_image` and record findings. Check hierarchy, crop quality, repeated copy, card readability, footer completion, menu layout, focus visibility, no clipped controls, no orphan headline word, and no unsupported airline actions.

- [ ] **Step 5: Run the complete web and repository gates**

Run in this order:

```bash
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web test
pnpm --filter @nuitee-travel-starter/web test:browser
pnpm --filter @nuitee-travel-starter/web build
pnpm test
pnpm customize:check
pnpm agent:check
pnpm agent:check:live
pnpm agent:check:assistant
pnpm check:embedded-host
pnpm audit:history
pnpm audit:licenses
pnpm ci:offline
git diff --check
```

Expected: all exit 0. Existing Noodle warnings are recorded verbatim and are not relabelled as passes when they are release blockers. If license audit fails only with `ERR_PNPM_MISSING_PACKAGE_INDEX_FILE`, repair the install metadata or rerun with approved read-only access to the populated pnpm store; do not change dependency versions to conceal it.

- [ ] **Step 6: Write the exact-SHA final report**

Create `.superpowers/sdd/2026-08-28-airline-editorial-conversation-homepage/final-report.md` with:

- implementation commit list;
- exact tested SHA;
- unit, browser, build, Noodle, history, license, and offline-gate command results;
- screenshot paths and visual observations;
- image dimensions, byte sizes, and reviewed blob hashes;
- confirmation that unrelated worktree changes were absent from the implementation worktree;
- remaining live-provider/MCP App-delivery and hosted-public proof boundaries;
- explicit statement that this work does not prove booking, production adoption, or public release readiness.

- [ ] **Step 7: Commit verification fixes and the report**

```bash
git add apps/web/app/globals.css apps/web/test/browser/travel-shell.spec.ts apps/web/test/travel-theme.test.ts .superpowers/sdd/2026-08-28-airline-editorial-conversation-homepage/final-report.md
git diff --cached --name-only
git commit -m "test: verify the airline editorial experience"
```

Add `apps/web/test/developer-page.test.tsx` only if Step 3 required a real tested change. If the report path is ignored, use `git add -f` for that exact report only.

- [ ] **Step 8: Run post-commit exact-SHA verification**

Run:

```bash
pnpm ci:offline
pnpm audit:history
git diff HEAD^ HEAD --check
git status --short --branch
```

Expected: both gates exit 0, commit diff check is clean, and the implementation worktree has no uncommitted files. Update the report and amend the final verification commit if its recorded SHA or results were pre-commit rather than exact-HEAD evidence.

## Completion Boundary

The implementation is ready for code review when all seven tasks are committed, the exact-SHA matrix is green, the screenshots are visually approved, and the branch contains only the planned landing-page changes. Do not push, update the existing PR, merge, deploy, or modify hosted Noodle configuration without a separate explicit user instruction for that exact action.
