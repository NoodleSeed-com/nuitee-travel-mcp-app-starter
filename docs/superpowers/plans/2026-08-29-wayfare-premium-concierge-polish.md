# Wayfare Premium Concierge Polish Implementation Plan

> **Iconography update — 2026-09-04:** The current Wayfare brand guideline
> supersedes every Lucide or custom utility-icon instruction in this historical
> implementation plan. Product iconography now uses Heroicons exclusively; the
> original Wayfare route-line logo remains the sole custom SVG exception.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the approved Wayfare foundation into a quiet premium airline-concierge experience with a hybrid cinematic landing page, a repository-owned route-line brand mark, restrained iconography, true high-resolution travel imagery, and one cohesive inline MCP App conversation.

**Architecture:** Preserve `TravelAssistantPage` as the zero-state/conversation switch and `TravelConversation` as the only assistant lifecycle owner. Refine the existing focused components rather than introducing a second design system: one shared SVG mark, one token layer, one compact landing hierarchy, one typed collapsible trip context, and official `NoodleAppView` instances kept at their chronological message positions. Image masters remain local assets and Next Image performs responsive AVIF/WebP delivery.

**Tech Stack:** Next.js 16.2.11, React 19.2.8, TypeScript 7.0.2, Inter, CSS, Lucide React, `@noodleseed/assistant` 1.24.0, `NoodleAppView`, Vitest 4.1.10, Testing Library 16.3.2, Playwright 1.62.1, built-in image generation, local JPEG masters, Next Image optimization

**Spec:** `docs/superpowers/specs/2026-08-29-wayfare-premium-concierge-polish-design.md`

## Global Constraints

- Keep the website light themed and use Inter throughout.
- Keep one centered conversation; do not add a right rail, side canvas, empty result workspace, or floating chatbot.
- Keep every approved MCP App inline at its chronological message position through the official `NoodleAppView` host.
- Preserve exact view admission for `search_flights` + `ui://nuitee_travel_mcp_app_starter/search_flights_widget` and `open_travel_starter` + `ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget`.
- Preserve the guest-first public embed, in-memory `principalKey`, initial-send-once behavior, Stop, retry, abort, reset, terminal cleanup, and draft preservation.
- Preserve the Search → Select → Verify boundary. Do not add booking, payment, passenger-detail collection, check-in, or account controls.
- Use one repository-owned SVG Wayfare mark and the existing Lucide dependency. Add no icon, animation, font, card-system, or image-runtime dependency.
- The logo and product icons stay vector/code-native. Use built-in image generation only for raster travel photography.
- Accept a `3840 × 2160` hero source and destination sources with a 3840px long edge and at least a 2160px short edge. Do not accept simple pixel resampling without believable 100% detail.
- Generated imagery must contain no text, logos, watermarks, airline liveries, prominent identifiable faces, malformed architecture, impossible geography, or protected campaign motifs.
- Use exact-property transitions, keep interactive UI motion at 220ms or less, never animate keyboard submission, and remove positional motion under `prefers-reduced-motion: reduce`.
- Keep all controls at least 44 × 44px, preserve visible focus, and prove page plus nested-App containment at 200% text zoom.
- Keep credentials, provider offer IDs, raw provider payloads, assistant model keys, and `.env` values out of UI, tests, docs, prompts, logs, and generated assets.
- Run no hosted deployment, secret, variable, access, budget, origin, embed, or public-release mutation under this plan.
- Use TDD: observe each new focused assertion fail for the intended reason before implementing it.
- Commit each task separately and request task-level review before proceeding to the next task.

## File and Responsibility Map

- Create `apps/web/src/components/wayfare-mark.tsx`: the single React owner of the route-line mark.
- Create `apps/web/app/icon.svg`: static favicon form of the same approved geometry.
- Modify `src/starter-config.ts`: checked-in brand color values only; preserve its public shape.
- Modify `apps/web/app/globals.css`: premium tokens, landing composition, conversation rhythm, responsive rules, focus, and motion.
- Modify `apps/web/next.config.ts`: advertise AVIF/WebP image output while preserving the current CSP and standalone build.
- Modify `apps/web/src/components/travel-header.tsx`: use the Wayfare mark and restrained header hierarchy.
- Modify `apps/web/src/components/travel-hero.tsx`: hybrid centered hero and cinematic media window.
- Modify `apps/web/src/components/travel-zero-state.tsx`: keep the approved four-section landing order without adding copy.
- Modify `apps/web/src/components/destination-inspiration.tsx`: compact desktop row and mobile scroll-snap discovery.
- Modify `apps/web/src/components/travel-capability-strip.tsx`: three factual stages with restrained icons.
- Modify `apps/web/src/components/travel-editorial-feature.tsx`: quiet route-line feature with no fifth raster image.
- Modify `apps/web/src/components/travel-footer.tsx`: retain required links/disclosures and reduce hierarchy.
- Modify `apps/web/src/components/trip-brief.tsx`: typed, collapsed-by-default trip context with a native disclosure control.
- Modify `apps/web/src/components/travel-conversation.tsx`: retain lifecycle ownership while simplifying header/status/context composition.
- Modify `apps/web/src/components/travel-message.tsx`: consistent prose, confirmation, and input-request surfaces.
- Modify `apps/web/src/components/travel-view-registry.tsx`: stable inline App host containment only; no App reconstruction.
- Modify `apps/web/src/components/travel-composer.tsx`: polished shared hero/conversation controls without unsupported affordances.
- Modify `apps/web/src/lib/landing-content.ts`: four approved image identities and concise landing copy.
- Create four versioned files under `apps/web/public/images`: hero plus Rome, London, and Istanbul sources.
- Create `docs/visual-assets/wayfare-premium-concierge.md`: prompts, dimensions, hashes, crops, byte sizes, QA, and binary-review evidence.
- Modify focused web, browser, repository-readiness, customization, and asset tests alongside their production owners.

---

### Task 1: Establish the Wayfare brand mark and premium tokens

**Files:**
- Create: `apps/web/src/components/wayfare-mark.tsx`
- Create: `apps/web/app/icon.svg`
- Modify: `src/starter-config.ts`
- Modify: `apps/web/src/components/travel-header.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/travel-header.test.tsx`
- Modify: `apps/web/test/travel-theme.test.ts`
- Modify: `test/customization.test.ts`

**Interfaces:**
- Consumes: the existing `starterConfig.brand` object shape and existing header callbacks.
- Produces: `WayfareMark({ className?: string })`, an `aria-hidden` current-color SVG; the exact route geometry `M3.25 6.5L7.6 17.25L12 9L16.4 17.25L20.25 8`; one terminal circle at `(20.25, 8)` with radius `1.35`.

- [ ] **Step 1: Write the failing mark and token tests**

Extend `apps/web/test/travel-header.test.tsx`:

```tsx
it('renders one repository-owned Wayfare route mark beside the wordmark', () => {
  render(
    <TravelHeader
      mode="hero"
      onNewTrip={vi.fn()}
      onOpenSettings={vi.fn()}
      onPlanTrip={vi.fn()}
    />,
  );

  const home = screen.getByRole('link', { name: 'Wayfare' });
  const mark = home.querySelector('svg[data-wayfare-mark="true"]');
  expect(mark).not.toBeNull();
  expect(mark).toHaveAttribute('aria-hidden', 'true');
  expect(mark?.querySelector('path')).toHaveAttribute(
    'd',
    'M3.25 6.5L7.6 17.25L12 9L16.4 17.25L20.25 8',
  );
  expect(mark?.querySelector('circle')).toHaveAttribute('cx', '20.25');
});
```

Replace the current theme cases in `apps/web/test/travel-theme.test.ts` with the approved checked-in values and contrast pairs:

```ts
expect(starterConfig.brand).toMatchObject({
  accent: '#3478F6',
  signal: '#0B1F33',
  canvas: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceDark: '#0B1F33',
  ink: '#0B1F33',
  muted: '#526173',
  boundary: '#D8DEE7',
});

expect(contrastRatio('#0B1F33', '#F7F8FA')).toBeGreaterThanOrEqual(4.5);
expect(contrastRatio('#526173', '#F7F8FA')).toBeGreaterThanOrEqual(4.5);
expect(contrastRatio('#3478F6', '#F7F8FA')).toBeGreaterThanOrEqual(3);
```

Add a customization assertion that the config key shape is unchanged; this task changes values, not the customization API.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-header.test.tsx test/travel-theme.test.ts
pnpm exec vitest run test/customization.test.ts
```

Expected: FAIL because the header renders the old text badge and the checked-in colors differ.

- [ ] **Step 3: Create the current-color mark component**

Create `apps/web/src/components/wayfare-mark.tsx`:

```tsx
interface WayfareMarkProps {
  readonly className?: string;
}

export function WayfareMark({ className }: Readonly<WayfareMarkProps>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      data-wayfare-mark="true"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M3.25 6.5L7.6 17.25L12 9L16.4 17.25L20.25 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="20.25" cy="8" fill="currentColor" r="1.35" />
    </svg>
  );
}
```

Create `apps/web/app/icon.svg` with the same `viewBox`, path, and circle, using ink `#0B1F33` on a transparent canvas. Do not wrap the icon in a badge or add text.

- [ ] **Step 4: Replace the header badge and update checked-in color values**

In `travel-header.tsx`, replace the text mark span content with:

```tsx
<span aria-hidden="true" className="travel-wordmark__mark">
  <WayfareMark />
</span>
<span>{starterConfig.brand.name}</span>
```

Update only the existing brand color values in `src/starter-config.ts`. Preserve every key, prompt, origin, URL, and type export.

In `globals.css`, replace the existing root token values with the approved colors and add the shared motion curves. Do not append duplicate declarations:

```css
:root {
  --travel-ink: #0b1f33;
  --travel-canvas: #f7f8fa;
  --travel-raised: #ffffff;
  --travel-blue: #3478f6;
  --travel-sea-glass: #4db8ae;
  --travel-muted: #526173;
  --travel-boundary: #d8dee7;
  --travel-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --travel-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}
```

Style `.travel-wordmark__mark` as a transparent 28px square with no circular background; size its child SVG to 24px.

- [ ] **Step 5: Run focused and customization gates**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-header.test.tsx test/travel-theme.test.ts
pnpm exec vitest run test/customization.test.ts
pnpm customize:check
pnpm --filter @nuitee-travel-starter/web typecheck
git diff --check
```

Expected: all commands PASS; the customization shape remains unchanged.

- [ ] **Step 6: Commit the brand foundation**

```bash
git add apps/web/src/components/wayfare-mark.tsx apps/web/app/icon.svg src/starter-config.ts apps/web/src/components/travel-header.tsx apps/web/app/globals.css apps/web/test/travel-header.test.tsx apps/web/test/travel-theme.test.ts test/customization.test.ts
git commit -m "feat: establish the Wayfare brand system"
```

---

### Task 2: Generate, inspect, and register the 4K travel imagery

**Files:**
- Create: `apps/web/public/images/wayfare-hybrid-hero-v2.jpg`
- Create: `apps/web/public/images/destinations/rome-editorial-v2.jpg`
- Create: `apps/web/public/images/destinations/london-editorial-v2.jpg`
- Create: `apps/web/public/images/destinations/istanbul-editorial-v2.jpg`
- Create: `docs/visual-assets/wayfare-premium-concierge.md`
- Modify: `apps/web/src/lib/landing-content.ts`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/test/landing-assets.test.ts`
- Modify: `apps/web/test/landing-content.test.ts`
- Modify: `apps/web/test/next-config.test.ts`
- Modify: `test/repository-readiness.test.ts`

**Interfaces:**
- Consumes: the existing local-image-only CSP and `landingDestinations` data model.
- Produces: four versioned local JPEG master paths; `nextConfig.images.formats = ['image/avif', 'image/webp']`; one human-readable provenance ledger containing exact prompts, dimensions, byte sizes, SHA-256 hashes, focal crops, and QA decisions.

- [ ] **Step 1: Write the failing image identity and delivery tests**

Update the expected image paths in `landing-content.test.ts` to the four `v2` identities above. Extend `landing-assets.test.ts`:

```ts
const expectedMasters = [
  '/images/wayfare-hybrid-hero-v2.jpg',
  '/images/destinations/rome-editorial-v2.jpg',
  '/images/destinations/london-editorial-v2.jpg',
  '/images/destinations/istanbul-editorial-v2.jpg',
] as const;

it.each(expectedMasters)('%s is a high-resolution local JPEG master', (src) => {
  const path = join(publicRoot, src);
  const bytes = readFileSync(path);
  const dimensions = jpegDimensions(bytes);
  expect([...bytes.subarray(0, 2)]).toEqual([0xff, 0xd8]);
  expect(Math.max(dimensions.width, dimensions.height)).toBe(3840);
  expect(Math.min(dimensions.width, dimensions.height)).toBeGreaterThanOrEqual(2160);
  expect(statSync(path).size).toBeGreaterThan(500_000);
  expect(statSync(path).size).toBeLessThan(4_000_000);
});
```

Extend `next-config.test.ts`:

```ts
it('negotiates modern responsive image formats', async () => {
  const config = (await import('../next.config')).default;
  expect(config.images?.formats).toEqual(['image/avif', 'image/webp']);
});
```

Add a readiness test that reads `docs/visual-assets/wayfare-premium-concierge.md`, computes each asset's SHA-256 with `createHash('sha256')`, and asserts the emitted lowercase hash, dimensions, and final path occur in the ledger.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/landing-assets.test.ts test/landing-content.test.ts test/next-config.test.ts
pnpm exec vitest run test/repository-readiness.test.ts
```

Expected: FAIL because the `v2` assets, ledger, and image format configuration do not exist.

- [ ] **Step 3: Generate the hero master through the built-in image tool**

Use one built-in image-generation call with this exact production prompt:

```text
Use case: photorealistic-natural
Asset type: Wayfare premium airline-concierge landing hero, 4K-grade landscape master
Primary request: a cinematic Mediterranean coastline seen from an elevated quiet cove at early morning, deep clear blue water, pale limestone cliffs, restrained coastal vegetation, open horizon, no buildings dominating the scene
Style/medium: highly realistic editorial travel photography, premium airline campaign quality, natural lens rendering, believable fine texture
Composition/framing: 16:9 wide landscape; stable negative space through the upper center for responsive cropping; meaningful coastline detail on both sides; no subject centered like a stock-photo postcard
Lighting/mood: soft early-morning directional light, calm and optimistic, clean color separation, no aggressive HDR
Color palette: ink-blue sea, pale mineral stone, muted green vegetation, warm restrained sunlight
Constraints: deliver source detail suitable for a 3840x2160 master; no text, no logo, no watermark, no aircraft, no people, no boats with visible branding
Avoid: fantasy geography, duplicated cliffs, plastic water, oversaturated cyan, excessive haze, malformed structures, synthetic-looking sharpness
```

Inspect the output at original detail. Reject it if any avoid item is visible. If its delivered dimensions are below the acceptance contract, use one targeted built-in edit/upscale iteration that preserves the approved composition and restores believable fine detail; do not satisfy the test with a conventional pixel resize.

If the accepted built-in artifact is not already JPEG, convert its encoded format without resizing:

```bash
sips -s format jpeg -s formatOptions 92 /absolute/path/to/accepted-hero.png --out apps/web/public/images/wayfare-hybrid-hero-v2.jpg
```

Verify the converted JPEG remains exactly `3840 × 2160`. Never rename PNG or WebP bytes to a `.jpg` extension. Do not overwrite `v1`.

- [ ] **Step 4: Generate the three destination masters independently**

Issue one built-in generation call per destination. Reuse this shared scaffold and substitute the exact subject line for each call:

```text
Use case: photorealistic-natural
Asset type: Wayfare destination discovery card, 4K-grade landscape master
Style/medium: highly realistic contemporary editorial travel photography, premium airline campaign quality, natural lens and architectural detail
Composition/framing: landscape master that remains recognizable in 4:3, 3:2, and portrait crops; one stable focal subject; no critical content at the extreme edges
Lighting/mood: natural atmospheric light, refined and inviting, no aggressive HDR
Constraints: 3840px long edge and at least 2160px short edge; no text, logos, watermarks, airline branding, or prominent identifiable faces
Avoid: impossible architecture, duplicated landmarks, malformed people, plastic texture, fantasy lighting, oversaturation, generated signage
```

Use these subject lines:

```text
Rome: a dawn view across Rome's layered historic rooftops toward a recognizable but not oversized dome, warm mineral stone, believable urban depth, quiet morning atmosphere
London: a refined blue-hour view along the Thames with contemporary and historic London layers, realistic weather and reflections, no advertising or readable signage
Istanbul: a warm late-afternoon Bosphorus view with ferries at a distance, layered shoreline and mosque silhouettes rendered accurately, no readable vessel names or flags
```

Inspect each output at original detail. Regenerate any image with text-like markings, impossible landmarks, duplicated structures, distorted ferries, or synthetic faces. Convert accepted non-JPEG artifacts with `sips -s format jpeg -s formatOptions 92` without resizing, verify the required dimensions after conversion, and save only the accepted outputs to the versioned paths.

- [ ] **Step 5: Register the assets, crops, image formats, and ledger**

Update `landing-content.ts` to use the `v2` destination paths and approved focal percentages found during visual inspection. Configure:

```ts
images: {
  formats: ['image/avif', 'image/webp'],
},
```

in `next.config.ts` without changing the existing headers or CSP.

Create `docs/visual-assets/wayfare-premium-concierge.md` with one section per asset containing the exact final prompt, built-in mode, checked-in dimensions, bytes from `stat`, lowercase SHA-256 from `shasum -a 256`, focal crop, accepted QA observations, and explicit rejected-variant reasons. Record the repository's binary history-review entry before Task 7's audit.

- [ ] **Step 6: Run image, config, and readiness proof**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/landing-assets.test.ts test/landing-content.test.ts test/next-config.test.ts
pnpm exec vitest run test/repository-readiness.test.ts
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web build
git diff --check
```

Expected: all commands PASS; `/` and `/developers` build; every ledger hash matches its checked-in binary.

- [ ] **Step 7: Commit the accepted imagery and evidence**

```bash
git add apps/web/public/images/wayfare-hybrid-hero-v2.jpg apps/web/public/images/destinations/rome-editorial-v2.jpg apps/web/public/images/destinations/london-editorial-v2.jpg apps/web/public/images/destinations/istanbul-editorial-v2.jpg apps/web/src/lib/landing-content.ts apps/web/next.config.ts apps/web/test/landing-assets.test.ts apps/web/test/landing-content.test.ts apps/web/test/next-config.test.ts docs/visual-assets/wayfare-premium-concierge.md test/repository-readiness.test.ts
git commit -m "feat: add Wayfare premium travel imagery"
```

---

### Task 3: Build the hybrid cinematic landing experience

**Files:**
- Modify: `apps/web/src/components/travel-hero.tsx`
- Modify: `apps/web/src/components/travel-zero-state.tsx`
- Modify: `apps/web/src/components/destination-inspiration.tsx`
- Modify: `apps/web/src/components/travel-capability-strip.tsx`
- Modify: `apps/web/src/components/travel-editorial-feature.tsx`
- Modify: `apps/web/src/components/travel-footer.tsx`
- Modify: `apps/web/src/lib/landing-content.ts`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/travel-zero-state.test.tsx`
- Modify: `apps/web/test/landing-assets.test.ts`
- Modify: `apps/web/test/landing-content.test.ts`
- Delete: `apps/web/public/images/wayfare-coastline-hero-v1.jpg`
- Delete: `apps/web/public/images/destinations/rome-dawn-v1.jpg`
- Delete: `apps/web/public/images/destinations/london-river-v1.jpg`
- Delete: `apps/web/public/images/destinations/istanbul-bosphorus-v1.jpg`
- Delete: `apps/web/public/images/destinations/warm-horizon-v1.jpg`

**Interfaces:**
- Consumes: `onStart(prompt)`, `inputRef`, the four Task 2 image identities, the Task 1 mark, and existing safe support/legal config.
- Produces: one primary landing hierarchy; `DestinationInspiration` with mobile scroll-snap discovery; a three-item factual capability row; an editorial feature that uses the route-line mark instead of a fifth raster image.

- [ ] **Step 1: Write the failing landing-hierarchy tests**

In `travel-zero-state.test.tsx`, assert the reduced copy and singular first action:

```tsx
expect(screen.getByRole('heading', {
  level: 1,
  name: 'Where will you go next?',
})).toBeVisible();
expect(screen.getByText('Tell Wayfare the trip you have in mind.')).toBeVisible();
expect(screen.getAllByRole('form', { name: 'Plan a trip' })).toHaveLength(1);
expect(screen.getByRole('button', { name: 'Find flights' })).toBeDisabled();
expect(screen.getAllByRole('button', { name: /Plan a trip to/u })).toHaveLength(3);
expect(screen.getByRole('list', { name: 'How Wayfare plans flights' })).toBeVisible();
expect(screen.queryByText('Travel inspiration')).not.toBeInTheDocument();
```

Assert that the hero image path is `/images/wayfare-hybrid-hero-v2.jpg`, that the hero contains only two suggested prompts, and that submitting a destination still calls the same `onStart` callback with the exact visible destination prompt.

- [ ] **Step 2: Run the focused landing tests and verify RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-zero-state.test.tsx test/landing-content.test.ts
```

Expected: FAIL on old hero copy, old image path, old capability label, and old editorial eyebrow.

- [ ] **Step 3: Restructure the hero without changing submission behavior**

Render the approved copy and keep `TravelComposer` as the only form:

```tsx
<section className="travel-hero" aria-labelledby="travel-home-title">
  <div className="travel-hero__content">
    <div className="travel-hero__copy">
      <h1 id="travel-home-title">Where will you go next?</h1>
      <p>Tell Wayfare the trip you have in mind.</p>
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
    {/* two existing trusted prompt buttons */}
    {/* launchError remains one role=alert */}
    <div className="travel-hero__media" aria-hidden="true">
      <Image
        alt=""
        fill
        priority
        sizes="(max-width: 767px) 100vw, 1200px"
        src="/images/wayfare-hybrid-hero-v2.jpg"
      />
    </div>
  </div>
</section>
```

Do not place headline, composer, prompts, or errors inside the image container.

- [ ] **Step 4: Compact the destination, capability, and editorial sections**

Keep the destination button semantics and use the existing `Image` focal positions. Change only presentation and concise copy.

Render the capability list with the accessible name `How Wayfare plans flights` and exact stages:

```tsx
const stages = [
  { label: 'Search live flights', icon: Search },
  { label: 'Compare options', icon: ListFilter },
  { label: 'Verify the fare', icon: BadgeCheck },
] as const;
```

Use each icon with `aria-hidden="true"`. Keep at most one supporting sentence per stage.

Replace the editorial image panel with a quiet dark raised panel containing `WayfareMark`, heading `Plans change. Wayfare keeps up.`, one sentence, and the existing `Start with a flexible trip` action. Remove `landingEditorialFeature.imageSrc`, `imagePosition`, and the `Travel inspiration` eyebrow from the data contract and tests.

After every production and test reference points to the accepted `v2` assets and the editorial feature no longer consumes a raster image, remove the five superseded `v1` files listed in this task. Confirm `rg -n 'v1.jpg' apps/web/src apps/web/test` returns no production or test reference before deletion. Task 7 updates the remaining active documentation references before the final gate.

Update `landing-assets.test.ts` so its parameterized set contains exactly the hero and three `v2` destination paths. The asset test must no longer read a removed editorial `imageSrc` field.

- [ ] **Step 5: Implement the hybrid responsive composition**

In `globals.css`:

- use a bright hero canvas rather than a full-bleed image backdrop;
- cap `.travel-hero__content` at 1200px and center it;
- cap the composer near 48rem;
- render `.travel-hero__media` as a 24–28px rounded window with `aspect-ratio: 16 / 7` on desktop and `4 / 3` on mobile;
- keep the headline on one line only when it fits naturally at `≥1024px`;
- use a horizontal mobile destination row with `grid-auto-flow: column`, `grid-auto-columns: minmax(16rem, 82vw)`, `overflow-x: auto`, `scroll-snap-type: x mandatory`, and visible trailing card context;
- keep the capability row visually quiet and avoid boxed icon tiles;
- preserve footer landmarks, configured links, unconfigured legal labels, guest disclosure, and infrastructure attribution.

- [ ] **Step 6: Run focused, full web, and production checks**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-zero-state.test.tsx test/landing-content.test.ts test/landing-assets.test.ts test/travel-header.test.tsx
pnpm --filter @nuitee-travel-starter/web test
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web build
git diff --check
```

Expected: all commands PASS and both static routes build.

- [ ] **Step 7: Commit the hybrid landing experience**

```bash
git add apps/web/src/components/travel-hero.tsx apps/web/src/components/travel-zero-state.tsx apps/web/src/components/destination-inspiration.tsx apps/web/src/components/travel-capability-strip.tsx apps/web/src/components/travel-editorial-feature.tsx apps/web/src/components/travel-footer.tsx apps/web/src/lib/landing-content.ts apps/web/app/globals.css apps/web/test/travel-zero-state.test.tsx apps/web/test/landing-assets.test.ts apps/web/test/landing-content.test.ts
git add -u apps/web/public/images
git commit -m "feat: build the Wayfare hybrid landing experience"
```

---

### Task 4: Turn trip context into a compact typed disclosure

**Files:**
- Modify: `apps/web/src/components/trip-brief.tsx`
- Modify: `apps/web/src/components/travel-conversation.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/travel-conversation.test.tsx`
- Modify: `apps/web/test/trip-projection.test.ts`

**Interfaces:**
- Consumes: `TripProjection` only; no message prose or raw provider fields.
- Produces: `TripBrief({ projection })`, absent in `idle`, collapsed by default, with a native `button[aria-expanded]` only when return date, currency, or market supplies secondary detail.

- [ ] **Step 1: Write failing disclosure and typed-fact tests**

Add to `travel-conversation.test.tsx`:

```tsx
it('keeps typed trip context compact until the traveler expands it', async () => {
  assistantMock.useNoodleAssistant.mockImplementation(() => ({
    client,
    messages: [{
      id: 'assistant-plan-context',
      role: 'assistant',
      parts: [{
        type: 'data-tool-result',
        data: {
          id: 'call-plan-context',
          tool: 'plan_flight_search',
          result: {
            status: 'planned',
            message: 'Trip details are ready. Search current fares now.',
            origin: 'ISB',
            destination: 'FCO',
            departureDate: '2026-08-31',
            returnDate: '2026-09-07',
            adults: 2,
            cabinClass: 'ECONOMY',
            currency: 'USD',
            country: 'US',
          },
        },
      }],
    }],
    status: 'ready',
    error: undefined,
  }));
  render(<TravelAssistantPage runtime={readyRuntime} />);
  submitPrompt('Islamabad to Rome for two');

  const context = await screen.findByRole('region', { name: 'Current trip' });
  expect(within(context).getByText('ISB')).toBeVisible();
  expect(within(context).getByText('FCO')).toBeVisible();
  expect(within(context).getByText('2 adults')).toBeVisible();
  expect(within(context).queryByText('US market')).not.toBeInTheDocument();

  const toggle = within(context).getByRole('button', { name: 'Show trip details' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(within(context).getByText('US market')).toBeVisible();
});
```

Add a case proving no disclosure button renders when only primary facts exist. Retain the projection tests proving prose is ignored.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-conversation.test.tsx test/trip-projection.test.ts
```

Expected: FAIL because the current brief expands every fact permanently and has no disclosure button.

- [ ] **Step 3: Implement the typed collapsed state**

Make `trip-brief.tsx` a client component. Compute:

```ts
const hasSecondaryDetails = Boolean(
  projection.returnDate || projection.currency || projection.country,
);
const [expanded, setExpanded] = useState(false);
```

Render primary facts in DOM order: route, departure, travelers, cabin. Render secondary facts only when `expanded`. The toggle uses:

```tsx
<button
  aria-expanded={expanded}
  aria-label={expanded ? 'Hide trip details' : 'Show trip details'}
  className="trip-brief__toggle"
  onClick={() => setExpanded((value) => !value)}
  type="button"
>
  <ChevronDown aria-hidden="true" />
</button>
```

Do not reset expansion because a tool phase changes; reset occurs naturally when the conversation unmounts.

- [ ] **Step 4: Simplify the conversation header and context rhythm**

Keep the assistant name and route-aware title, but remove redundant uppercase identity treatment and heavy dividers. The header and trip context remain direct children of the stable six-area grid so transcript scroll ownership does not regress.

Use CSS grid/flex facts with icons hidden from assistive technology. Do not duplicate values for mobile.

- [ ] **Step 5: Run lifecycle, type, and build gates**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-conversation.test.tsx test/trip-projection.test.ts
pnpm --filter @nuitee-travel-starter/web test
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web build
git diff --check
```

Expected: all tests PASS, including Strict Mode initial-send, Stop, retry, reset, activity correlation, and transcript scroll ownership.

- [ ] **Step 6: Commit the compact trip context**

```bash
git add apps/web/src/components/trip-brief.tsx apps/web/src/components/travel-conversation.tsx apps/web/app/globals.css apps/web/test/travel-conversation.test.tsx apps/web/test/trip-projection.test.ts
git commit -m "feat: refine Wayfare trip context"
```

---

### Task 5: Polish transcript, structured interactions, inline Apps, and composer

**Files:**
- Modify: `apps/web/src/components/travel-message.tsx`
- Modify: `apps/web/src/components/travel-view-registry.tsx`
- Modify: `apps/web/src/components/travel-composer.tsx`
- Modify: `apps/web/src/components/travel-conversation.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/travel-message.test.tsx`
- Modify: `apps/web/test/travel-conversation.test.tsx`

**Interfaces:**
- Consumes: existing typed `AssistantUIMessage` parts, `AssistantClient`, exact `isInlineTravelView`, and `TravelComposer` lifecycle callbacks.
- Produces: `.travel-app-surface` as containment around the official App host; unified `.travel-interaction-card` styling for confirmation/input requests; no changes to App transport or response payloads.

- [ ] **Step 1: Write failing inline-surface and composer tests**

Add to `travel-message.test.tsx`:

```tsx
it('contains an approved App in one unlabeled visual host without rebuilding it', () => {
  const view: AssistantViewData = {
    id: 'view-contained',
    tool: 'search_flights',
    resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
    title: 'Flight results',
    result: { status: 'success' },
  };
  renderMessage(client, {
    id: 'assistant-contained-view',
    role: 'assistant',
    parts: [{ type: 'data-view', data: view }],
  });

  const surface = screen.getByTestId('travel-app-surface');
  const app = surface.querySelector('noodle-app-view');
  expect(app).not.toBeNull();
  expect(surface).not.toHaveTextContent('Flight results');
  expect(surface.querySelector('iframe[srcdoc]')).toBeNull();
});
```

Add assertions that confirmation and input request sections share `travel-interaction-card`, their primary and secondary actions remain named, and no raw tool result appears.

Add to `travel-conversation.test.tsx`:

```tsx
expect(screen.queryByText('Built on Noodle Seed · Powered by Nuitee')).not.toBeInTheDocument();
expect(screen.getByRole('form', { name: 'Continue trip' })).toBeVisible();
```

Retain the busy draft/Stop test and add an assertion that the typed draft remains visible after Stop.

Extend the existing no-results fixture to assert two bounded refinement actions:

```tsx
const refinements = screen.getByRole('group', { name: 'Refine this search' });
fireEvent.click(within(refinements).getByRole('button', {
  name: 'Try nearby airports',
}));
expect(client.sendMessage).toHaveBeenLastCalledWith(
  'Search nearby airports for this trip.',
);
```

Add the sibling `Change dates` action with exact prompt `Help me change the travel dates.`. Assert the group is absent outside `no-results` and both controls disable while busy. Retain the existing setup-required, retryable-error, terminal-error, unknown-view, and raw-detail privacy assertions.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-message.test.tsx test/travel-conversation.test.tsx
```

Expected: FAIL because the App has no host surface, interaction cards do not share the class, and conversation attribution remains in the active hierarchy.

- [ ] **Step 3: Add containment without changing App ownership**

Change only the approved branch in `travel-view-registry.tsx`:

```tsx
return (
  <div className="travel-app-surface" data-testid="travel-app-surface">
    <NoodleAppView client={client} theme="light" view={view} />
  </div>
);
```

Do not add an App title, toolbar, loading transport, alternate iframe, JSON renderer, or duplicate view identity.

- [ ] **Step 4: Unify structured interaction presentation**

Add `travel-interaction-card` beside the existing semantic classes on confirmation and input-request sections. Preserve all current bounds, allowlists, locking, response actions, and safe fallbacks.

Use CSS to establish:

- 18–24px radius;
- one boundary;
- raised white surface;
- facts aligned as a responsive definition grid;
- primary action using sky blue;
- quiet secondary action with a neutral boundary;
- full-width mobile controls where labels would otherwise wrap badly.

- [ ] **Step 5: Refine the transcript and composer hierarchy**

Keep user messages compact with a quiet raised surface. Keep assistant prose unboxed and capped at 48rem. Let `.travel-app-surface` use the 64rem shell.

Remove `travel-attribution--workspace` from `TravelConversation`; the landing footer and navigation/settings surfaces retain the required infrastructure disclosure.

When `projection.phase === 'no-results'`, render one `role="group"` named `Refine this search` in the lower-chrome slot. Its two buttons call `sendFollowUp` with the exact prompts asserted above and use `disabled={busy}`. Do not create navigation, mutate trip state directly, or expose a page-owned fare filter.

Keep the composer as the same form and state owner. Do not add attachment or microphone controls. Use an explicit send icon, exact phase placeholder, bounded textarea growth, and visible Stop. Preserve:

```ts
if (busy) return;
const prompt = draft.trim();
if (!prompt) return;
onSubmit(prompt);
setDraft('');
```

and keep the existing draft intact because the busy branch exits before `setDraft`.

- [ ] **Step 6: Run focused and full lifecycle proof**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-message.test.tsx test/travel-conversation.test.tsx test/travel-view-policy.test.ts
pnpm --filter @nuitee-travel-starter/web test
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web build
git diff --check
```

Expected: all commands PASS; exact approved Apps remain inline and distinct; rejected views remain fail-closed.

- [ ] **Step 7: Commit the polished conversation surfaces**

```bash
git add apps/web/src/components/travel-message.tsx apps/web/src/components/travel-view-registry.tsx apps/web/src/components/travel-composer.tsx apps/web/src/components/travel-conversation.tsx apps/web/app/globals.css apps/web/test/travel-message.test.tsx apps/web/test/travel-conversation.test.tsx
git commit -m "feat: polish the Wayfare conversation surfaces"
```

---

### Task 6: Add state-driven route feedback and responsive browser proof

**Files:**
- Modify: `apps/web/src/components/trip-brief.tsx`
- Modify: `apps/web/src/components/travel-conversation.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/test/travel-conversation.test.tsx`
- Modify: `apps/web/test/browser/travel-shell.spec.ts`

**Interfaces:**
- Consumes: `TripProjection['phase']`, the existing deterministic assistant/SSE fixture, and real nested `NoodleAppView` frame handshakes.
- Produces: `data-phase` on the route progress element; six fixed segments whose completed count derives only from typed phases; desktop/mobile/zoom/reduced-motion visual proof.

- [ ] **Step 1: Write failing route-state and browser assertions**

Add a component assertion:

```tsx
const progress = within(
  await screen.findByRole('region', { name: 'Current trip' }),
).getByLabelText('Trip progress');
expect(progress).toHaveAttribute('data-phase', 'searching');
expect(progress.querySelectorAll('[data-complete="true"]')).toHaveLength(2);
```

Use this exact completed-segment map:

```ts
const COMPLETED_SEGMENTS: Readonly<Record<TripProjection['phase'], number>> = {
  idle: 0,
  planned: 1,
  searching: 2,
  comparing: 3,
  'no-results': 3,
  selected: 4,
  verifying: 5,
  verified: 6,
  error: 0,
};
```

Extend `travel-shell.spec.ts` with named scenarios for:

- premium zero-state first fold;
- one-line desktop hero heading;
- 390px hybrid hero and scroll-snap destination peek;
- active centered conversation with compact trip context;
- two distinct inline Apps in chronological order;
- confirmation/input/App control keyboard order;
- 200% page and nested-App text scaling;
- reduced motion with no transform animation;
- composer reachability after long transcript overflow.

- [ ] **Step 2: Run the focused browser scenario and verify RED**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-conversation.test.tsx
pnpm --filter @nuitee-travel-starter/web exec playwright test test/browser/travel-shell.spec.ts --grep "premium|route progress" --workers=1 --reporter=list
```

Expected: component FAIL because no segmented route progress exists; browser cases FAIL on old layout selectors or missing premium contracts.

- [ ] **Step 3: Implement event-driven route segments**

Render six decorative segments inside one labeled progress group:

```tsx
<div
  aria-label="Trip progress"
  className="trip-progress"
  data-phase={projection.phase}
  role="img"
>
  {Array.from({ length: 6 }, (_, index) => (
    <span
      aria-hidden="true"
      data-complete={index < completedSegments ? 'true' : 'false'}
      key={index}
    />
  ))}
</div>
```

Transition only `background-color` and `opacity` for 160ms. Do not use keyframes, dash loops, orbiting dots, or a timer.

- [ ] **Step 4: Finish exact motion and responsive CSS**

Audit every changed transition. Replace broad or built-in easing with exact properties and the approved curves. Gate hover-only movement:

```css
@media (hover: hover) and (pointer: fine) {
  .destination-card:hover {
    transform: translateY(-2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .destination-card,
  .travel-app-surface,
  .trip-progress span {
    transform: none;
    transition-property: color, background-color, border-color, opacity;
  }
}
```

Keep interactive durations at 220ms or less. Keep the rare marketing image reveal under 500ms and ensure it never blocks interaction.

- [ ] **Step 5: Run deterministic desktop and mobile visual QA**

Stop only a verified Next dev process owned by this exact worktree if its `.next/dev/lock` blocks the isolated Playwright server; restore the same localhost command afterward.

Run:

```bash
pnpm --filter @nuitee-travel-starter/web exec playwright test test/browser/travel-shell.spec.ts --workers=1 --reporter=list
```

Inspect screenshots at 1440×1000, 768×1024, 390×844, and 320×568. Inspect the 390px 200%-text case and every nested App document at original screenshot detail. Reject clipping, orphaned hero words, hidden controls, ambiguous focus, excessive whitespace, scroll traps, and blurred image crops.

- [ ] **Step 6: Run full web verification**

Run:

```bash
pnpm --filter @nuitee-travel-starter/web test
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web test:browser
pnpm --filter @nuitee-travel-starter/web build
git diff --check
```

Expected: all web tests, browser projects, and production routes PASS; only explicitly project-scoped skips remain.

- [ ] **Step 7: Commit route feedback and browser proof**

```bash
git add apps/web/src/components/trip-brief.tsx apps/web/src/components/travel-conversation.tsx apps/web/app/globals.css apps/web/test/travel-conversation.test.tsx apps/web/test/browser/travel-shell.spec.ts
git commit -m "test: prove the Wayfare premium conversation"
```

---

### Task 7: Reconcile public-template docs, run exact-SHA gates, and update PR #41

**Files:**
- Modify: `README.md`
- Modify: `docs/customization.md`
- Modify: `docs/architecture.md`
- Modify: `docs/EMBEDDED_ASSISTANT.md`
- Modify: `docs/visual-assets/airline-editorial-homepage.md`
- Modify: `test/repository-readiness.test.ts`
- Create: `.superpowers/sdd/2026-08-29-wayfare-premium-concierge-polish/final-report.md` as ignored execution evidence

**Interfaces:**
- Consumes: all committed Task 1–6 behavior, the existing release/readiness contracts, PR #41 head `169/neutral-light-chat-ui`, and the exact aggregate offline gate.
- Produces: active docs matching the premium inline-conversation architecture; one final exact-SHA report; a fast-forward update to the existing PR only. This task does not merge the PR.

- [ ] **Step 1: Write the failing readiness assertions**

Extend `test/repository-readiness.test.ts` to read active docs and production owners, then assert:

```ts
expect(readme).toContain('Wayfare');
expect(readme).toContain('conversation');
expect(architecture).toContain('inline MCP Apps');
expect(customization).toContain('wayfare-mark.tsx');
expect(embeddedGuide).not.toMatch(/right[- ]side|Flight workspace|side canvas/iu);
expect(activeDocs).not.toMatch(/Cedar & Cloud|route-orbit|full-bleed hero/iu);
expect(assetGuide).toContain('wayfare-premium-concierge.md');
```

Keep existing assertions that public readiness and hosted proof remain separate.

- [ ] **Step 2: Run the readiness test and verify RED**

Run:

```bash
pnpm exec vitest run test/repository-readiness.test.ts
```

Expected: FAIL on stale brand, old visual treatment, or missing new asset guidance.

- [ ] **Step 3: Update only active product documentation**

Document:

- the hybrid cinematic landing structure;
- the route-line SVG mark and Lucide icon boundary;
- the four local high-resolution assets and provenance ledger;
- one centered conversation with official inline MCP Apps;
- the compact typed trip disclosure;
- Inter/light-theme customization points;
- no right rail, App reconstruction, booking/payment scope, remote image origin, or hosted claim.

Do not rewrite dated historical specs or reports to pretend they described the new architecture.

- [ ] **Step 4: Run focused documentation and source scans**

Run:

```bash
pnpm exec vitest run test/repository-readiness.test.ts
pnpm customize:check
rg -n 'Cedar & Cloud|Flight workspace|side canvas|right-side canvas|route-orbit|full-bleed hero' README.md docs apps/web/src --glob '!docs/superpowers/specs/**' --glob '!docs/superpowers/plans/**'
git diff --check
```

Expected: readiness and customization PASS; the stale scan returns no active contradictory guidance.

- [ ] **Step 5: Commit documentation reconciliation**

```bash
git add README.md docs/customization.md docs/architecture.md docs/EMBEDDED_ASSISTANT.md docs/visual-assets/airline-editorial-homepage.md test/repository-readiness.test.ts
git commit -m "docs: document the Wayfare premium experience"
```

- [ ] **Step 6: Run the exact committed-HEAD local matrix**

Record `git rev-parse HEAD`, verify porcelain is clean, then run:

```bash
env CI=true pnpm ci:offline
pnpm audit:history
git diff --check
git status --short
```

Expected:

- aggregate exit `0`;
- root, web, embedded-host, Playwright, build, customization, license, history, and Noodle checks PASS;
- history audit reports zero findings after the required binary review entry;
- worktree is clean;
- no hosted proof is claimed.

If `audit:licenses` fails only because the sandbox-selected pnpm store lacks a package-index file, rerun the exact command with read-only access to the configured pnpm store. Do not change dependencies to repair environment metadata.

- [ ] **Step 7: Create the ignored exact-SHA report**

Write `.superpowers/sdd/2026-08-29-wayfare-premium-concierge-polish/final-report.md` with:

- exact HEAD SHA;
- commit list since `b761567`;
- accepted asset paths, dimensions, bytes, and hashes;
- unit/browser/build/Noodle command exits and counts;
- visual QA dimensions and findings;
- current known public privacy/customer-auth warnings;
- explicit statement that local proof is not hosted proof;
- confirmation that no hosted mutation or merge occurred.

Because `.superpowers/sdd` is ignored execution evidence, do not stage it unless repository policy explicitly requires a force-added report.

- [ ] **Step 8: Fast-forward the existing PR branch and verify CI**

Confirm PR #41 still targets `main` from `169/neutral-light-chat-ui`:

```bash
gh pr view 41 --json number,state,headRefName,baseRefName,url,mergeStateStatus,statusCheckRollup
```

Push without force:

```bash
git push origin HEAD:169/neutral-light-chat-ui
```

Watch the fresh check:

```bash
gh pr checks 41 --watch
```

Expected: a new `offline-quality-gates` run completes successfully for the pushed exact SHA. If it fails, inspect the named failing job and repair the branch through a new reviewed commit; do not merge and do not describe the PR as ready while the check is red.

- [ ] **Step 9: Report the PR handoff without merging**

Report:

- PR URL `https://github.com/NoodleSeed-com/nuitee-travel-mcp-app-starter/pull/41`;
- pushed exact SHA;
- check conclusion;
- localhost review command;
- local versus hosted proof boundary;
- remaining public-release prerequisites, if any.

Do not enable auto-merge, merge PR #41, deploy, or make the repository public.
