# Wayfare Premium Concierge Polish Design

> **Iconography update — 2026-09-04:** The current Wayfare brand guideline
> supersedes every Lucide or custom utility-icon instruction in this historical
> design record. Product iconography now uses Heroicons exclusively; the
> original Wayfare route-line logo remains the sole custom SVG exception.

## Status

Approved by the user on 2026-08-29.

This design supersedes the visual and interaction treatment in the earlier Wayfare landing-page and inline-conversation specifications wherever they conflict. It preserves the single centered conversation, chronological inline MCP Apps, exact view admission, guest-first session model, and Search → Select → Verify product boundary defined by `2026-08-29-wayfare-inline-conversation-design.md`.

## Goal

Make Wayfare feel like a quiet premium airline concierge: visually distinctive, immediately understandable, and polished enough to demonstrate how a traditional flight website becomes conversation first.

The conversation remains the product. Photography, iconography, trip context, and motion support the conversation instead of competing with it.

## Reference principles

The live Layla experience is a directional reference for restraint, not a source to copy. Wayfare adopts the following principles:

- one dominant action in the opening fold;
- a short headline and one confident composer;
- compact travel inspiration close to the first action;
- consistent radii, spacing, icon weight, and surface depth;
- strong imagery used selectively;
- less explanatory copy around self-explanatory controls.

Wayfare does not copy Layla's logo, lavender palette, organic background shapes, copy, cards, imagery, or human-travel-expert proposition.

## Product decisions

### Chosen direction

The chosen direction is **hybrid cinematic**:

- a bright, calm landing canvas;
- one centered headline and composer;
- a rounded, photorealistic cinematic image window supporting the primary action;
- compact destination inspiration immediately below;
- one centered ChatGPT-style conversation after submission;
- interactive MCP Apps appearing inline at their exact message positions.

The site remains light themed and uses Inter throughout.

### Signature

Wayfare's single signature element is a continuous route line. It forms the brand mark and reappears only where route progress or verified state has real meaning.

It is not a decorative background motif and does not loop continuously.

## Experience architecture

### Landing state

Desktop composition:

```text
┌──────────────────────────────────────────────────────────────┐
│ Wayfare mark                         Plan trip   Developers  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    Where will you go next?                   │
│             Tell Wayfare the trip you have in mind.         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Islamabad to Rome, two adults, next weekend         ↑ │  │
│  └────────────────────────────────────────────────────────┘  │
│                  Weekend trip   Nonstop fares                │
│                                                              │
│  ╭────────────────────────────────────────────────────────╮  │
│  │       Cinematic, photorealistic destination view       │  │
│  ╰────────────────────────────────────────────────────────╯  │
└──────────────────────────────────────────────────────────────┘
```

The first fold has one job: start a trip. It contains one `h1`, one short supporting sentence, one composer, and no more than two starter prompts. The cinematic image is visually important but never carries essential text or controls.

Below the fold:

1. compact destination cards;
2. one concise Search · Compare · Verify capability row;
3. one editorial travel feature with one action;
4. a minimal footer.

No additional promotional section is added without removing or replacing an existing one.

### Conversation state

After a prompt is submitted, the landing content gives way to one uninterrupted conversation beneath the shared Wayfare header.

- The reading column has a `48rem` maximum width.
- The conversation shell has a `64rem` maximum width.
- Inline MCP Apps and structured interaction cards may use the full shell width.
- There is no right rail, side canvas, empty result workspace, or floating chatbot window.
- Traveler turns are compact and right aligned.
- Assistant prose is unboxed, left aligned, and typographically quiet.
- Search results, starter views, confirmations, forms, no-results states, and verification appear chronologically in the transcript.
- The composer remains anchored at the bottom while the transcript owns vertical scrolling.

### Trip context

Validated trip facts appear in one compact, collapsible context row after facts exist:

```text
ISB → FCO · 31 Aug · 2 adults · Economy                      ⌄
```

The collapsed form shows route, departure date, party size, and cabin when those typed values exist. Expansion shows return date, currency, and market when present. The row is collapsed by default, renders a native button with `aria-expanded`, and does not render an expansion control when no secondary facts exist. The component remains absent in `idle` and never parses conversational prose.

It is context for the conversation, not a separate workspace.

## Brand system

### Wayfare mark

The mark is a deterministic, repository-owned SVG rather than a generated raster logo.

Geometry requirements:

- square `24 × 24` view box;
- one continuous route-line path forming a legible abstract `W`;
- rounded line caps and joins;
- one destination dot at the path terminus;
- no airplane silhouette, globe, map pin, compass rose, gradients, letters, or enclosed badge inside the SVG;
- recognizable at 16px and balanced at 24px, 32px, and 64px;
- monochrome ink and reversed white presentations derive from `currentColor`.

The wordmark pairs the mark with `Wayfare` in Inter 650. The mark must also work alone as the favicon and compact mobile identity.

### Iconography

Use Lucide icons already available to the web application when a familiar symbol improves recognition.

Icon contract:

- default visual size: 20px;
- compact factual icon size: 18px;
- stroke width: 1.75px unless the library icon becomes illegible;
- `currentColor` only;
- icon-only controls require an accessible name and at least a 44 × 44px target;
- paired labels remain visible for unfamiliar actions;
- no decorative icon wall;
- no icon may imply an unsupported capability such as attachments, payment, booking, voice, or account management.

Approved semantic uses include route, departure date, travelers, cabin, search, compare, selection, verification, menu, settings, Stop, and send.

### Color tokens

```text
Ink navy        #0B1F33
Canvas          #F7F8FA
Raised surface  #FFFFFF
Sky action      #3478F6
Sea-glass       #4DB8AE
Boundary        #D8DEE7
Muted text      #526173
```

Sky action is the primary control and focus color. Sea-glass is reserved for positive supporting context and verified states. It is not a second primary action color.

All text, controls, borders, and focus indicators must satisfy WCAG AA contrast in their rendered states.

### Typography

Inter remains the only interface family.

- Hero `h1`: 620 weight, tightly tracked, one line on sufficiently wide desktop screens, balanced two-line wrap below that threshold.
- Section headings: 560–600 weight.
- Conversation title: 500–560 weight.
- Body: 400–450 weight with a comfortable reading line height.
- Labels and facts: 600–700 only where hierarchy requires it.
- Uppercase eyebrow copy is removed unless it communicates a real product state.

The implementation uses a small, explicit type scale. It does not introduce display fonts, serif accents, or arbitrary one-off sizes.

### Shape and depth

- Composer: 20–24px radius, not a full capsule on narrow mobile layouts.
- Destination and editorial media: 24–28px radius.
- Structured conversation cards: 18–24px radius.
- Compact controls and fields: 10–14px radius.
- Pills are reserved for tags, short facts, and statuses.

Shadows remain soft and sparse. Borders define most surfaces; shadows indicate genuinely elevated controls such as the composer or a temporary dialog.

## Landing content and copy

### Hero

Required copy:

- Heading: `Where will you go next?`
- Supporting line: `Tell Wayfare the trip you have in mind.`
- Composer example: a concrete route, travelers, and timing.
- Submit action: `Find flights`.

No product jargon, MCP terminology, capability explanation, account explanation, or marketing attribution appears in the primary hero hierarchy.

### Destination inspiration

Destination cards show only:

- destination name;
- one short trip cue;
- one high-resolution image.

They remain directly actionable and submit a visible prompt through the same trusted start-conversation path.

Desktop shows a compact row. Mobile uses a horizontally scrollable, scroll-snapping row that keeps part of the next card visible and does not create three consecutive full-viewport cards.

### Capability row

The three real stages are:

- Search live flights;
- Compare options;
- Verify the fare.

Each stage gets one icon, one short label, and at most one supporting sentence. The sequence is factual, not decorative numbering.

### Footer

The footer preserves developer, support, privacy, terms, guest-session, Noodle Seed, and Nuitee disclosures. It removes duplicate promotional copy and does not elevate infrastructure attribution above traveler actions.

## Conversation components

### Travel message

- Traveler messages use a restrained raised surface and compact padding.
- Assistant prose remains unboxed.
- Message spacing is based on conversational turns, not uniform list-card gaps.
- Markdown headings, lists, tables, and code retain bounded readable measures.
- Consecutive assistant parts read as one response unless a structured App or interaction requires separation.

### Inline App surface

`TravelViewRegistry` continues to admit only the exact approved tool/resource pairs and delegates rendering to the official `NoodleAppView`.

The website supplies only stable host spacing and containment:

- width: full conversation shell;
- maximum width: shell boundary;
- no page-owned duplicate App header;
- no transformation of App output into website-authored fare cards;
- no `srcdoc`, generic remote fetch, or tool-result reconstruction;
- no clipped iframe, nested scroll trap, or minimum desktop width on mobile.

A newly delivered App remains mounted at its chronological message position. Different view IDs remain different invocations.

### Composer

The conversation composer:

- remains visible at the bottom of the conversation viewport;
- preserves the user's draft while busy and after Stop;
- blocks duplicate sends without clearing the draft;
- uses a visible Stop control during an active request;
- grows only to a bounded maximum height;
- uses the current conversation phase to provide concise placeholder guidance;
- does not expose unsupported attachment, microphone, payment, or booking controls.

### Confirmation and input requests

Native confirmation and allowlisted input-request cards use the same visual system as inline Apps:

- clear title;
- bounded factual review;
- one primary action and one quiet secondary action;
- explicit pending, accepted, declined, canceled, and unavailable states;
- no raw transport or provider detail.

## Imagery system

### Required generated assets

Create four new photorealistic masters through the built-in image-generation workflow:

1. hybrid hero destination panorama;
2. Rome destination image;
3. London destination image;
4. Istanbul destination image.

The logo and product icons remain SVG/code-native and are not image-generated.

### Art direction

All images share one editorial travel language:

- natural atmospheric light;
- believable architecture, geography, water, vegetation, and weather;
- refined color separation without aggressive HDR treatment;
- realistic lens behavior and material texture;
- contemporary premium-airline campaign quality;
- no fake shallow-depth artifacts across distant landscapes.

Hero composition reserves stable negative space and meaningful crop regions for desktop, tablet, and mobile. Destination images retain recognizable subject matter at `4:3`, `3:2`, and portrait mobile crops.

### Avoid list

- logos, airline liveries, watermarks, captions, signage, or generated text;
- prominent identifiable faces;
- malformed hands or bodies;
- impossible landmarks or duplicated architectural elements;
- fantasy lighting, oversaturated skies, excessive haze, or plastic textures;
- visual motifs copied from Layla or an airline's protected campaign.

### Resolution and delivery

The accepted hero source is `3840 × 2160`. Each accepted destination source has a 3840px long edge and a short edge of at least 2160px before web derivatives are produced. Simple pixel resampling is not sufficient acceptance: every selected output must retain believable source detail at 100% inspection before integration.

The web application uses optimized responsive AVIF/WebP delivery and correct `sizes`/priority behavior. The checked-in asset strategy must balance high-resolution fidelity with repository and page-weight limits; visual masters must not force every client to download the largest source.

For each accepted asset, record:

- final generation prompt;
- built-in generation mode;
- original and checked-in dimensions;
- file format and byte size;
- SHA-256 hash;
- crop/focal-point decision;
- visual QA decision and rejected-artifact notes.

Binary additions receive the repository's required history-audit review entry before the final branch gate.

## Motion and feedback

### State-driven route progress

The route line advances only when typed assistant/tool state changes:

```text
Planned → Searching → Comparing → Selected → Verifying → Verified
```

Each real transition colors one additional route segment. There is no orbit, bouncing dot, ambient spinner, or decorative infinite loop.

### Interaction motion

- Button press: `transform: scale(0.97)` over 100–160ms.
- Hover color/border: 140–180ms and only under fine-pointer hover media queries.
- Popover/dialog entry: 160–220ms with origin-aware transform where applicable.
- Inline card arrival caused by streaming: at most 180ms opacity plus a 4px translation.
- Keyboard-submitted messages do not wait for an entrance animation.
- Dynamic UI uses interruptible transitions and names exact transitioned properties; never `transition: all`.

Use the shared curves:

```css
--travel-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--travel-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
```

Under `prefers-reduced-motion: reduce`, positional motion is removed. Useful opacity, color, and state changes may remain without delaying interaction.

## Data and lifecycle boundaries

The polish implementation does not change:

- `useNoodleAssistant` session ownership;
- guest-first public embed configuration;
- principal-key lifecycle;
- initial-send-once behavior;
- Stop, retry, abort, reset, and terminal cleanup;
- typed trip projection sources;
- exact MCP App tool/resource admission;
- Search → Select → Verify capability scope;
- provider credentials, hosted configuration, access, or deployment state.

No new browser storage, analytics, remote image origin, font origin, or client-visible secret is introduced.

## Errors and incomplete states

- Setup-required state appears as a clear inline hero notice with the exact developer action; it does not replace the entire design with raw configuration text.
- Transport/session errors appear near the latest assistant turn and preserve the composer draft.
- Retry appears only for retryable failures.
- No-results explains that no fares matched and offers short refinement actions.
- Unknown or mismatched views fail closed inline.
- App loading reserves bounded space without a looping decorative loader.
- App failure never exposes raw provider payloads, credentials, stack traces, or transport identifiers.

## Responsive behavior

### Desktop, `≥ 1024px`

- Hero headline remains on one line when it fits without shrinking below the approved scale.
- Composer remains centered.
- Cinematic image uses a broad rounded window rather than becoming a text backdrop.
- Destination cards form a compact row.
- Conversation text and App widths follow their separate readable/surface caps.

### Tablet, `768–1023px`

- Header actions remain usable without crowding the wordmark.
- Hero copy wraps deliberately.
- Image focal point remains meaningful.
- Destination cards use two columns or compact horizontal discovery.

### Mobile, `320–767px`

- One edge-safe column with no horizontal clipping.
- Header exposes the mark, wordmark, and menu without crowding.
- Hero composer becomes a rounded card with a full-width explicit action.
- Starter prompts remain short and do not create a tall stack.
- Destination discovery does not render three full-width viewport-height cards in sequence.
- Inline Apps, forms, confirmations, and the composer fit the viewport at 200% text zoom.

## Accessibility

- One `h1` per page state.
- Semantic banner, main, transcript log, and footer landmarks remain intact.
- Every icon-only control has a specific accessible name.
- Decorative images and icons are hidden from assistive technology.
- Informative imagery receives concise, factual alternatives only when the image adds information beyond adjacent text.
- Visible focus meets contrast requirements on light, image, and raised surfaces.
- Controls provide at least 44 × 44px targets.
- DOM order matches reading, focus, and visual order.
- Status and alert regions remain stable and non-duplicated.
- At 200% text zoom, essential content and nested App controls remain available without two-dimensional scrolling.

## Component ownership

Expected production owners include:

- `travel-header.tsx`: mark, wordmark, restrained primary navigation;
- `travel-hero.tsx`: hybrid composition and primary conversation entry;
- `travel-zero-state.tsx`: reduced landing hierarchy;
- `destination-inspiration.tsx`: compact destination discovery;
- `travel-capability-strip.tsx`: concise factual sequence;
- `travel-editorial-feature.tsx`: one bounded editorial feature;
- `travel-conversation.tsx`: centered lifecycle and compact trip context;
- `travel-message.tsx`: polished chronological message and structured-part rhythm;
- `travel-view-registry.tsx`: exact official inline App delegation;
- `travel-composer.tsx`: shared polished composer states;
- `trip-brief.tsx`: collapsible typed context row;
- `travel-footer.tsx`: concise disclosures and attribution;
- `globals.css`: tokens, responsive composition, containment, focus, and motion;
- a focused repository-owned Wayfare SVG mark component or asset;
- generated image assets and their provenance ledger;
- matching unit, browser, repository-readiness, and documentation proof.

The implementation should not create a second design system, generic card library, animation dependency, icon dependency, or image runtime.

## Verification contract

### Component and unit proof

- Wayfare mark renders in header and compact contexts without inaccessible duplicate text.
- Icon-only controls retain names and minimum targets.
- Hero contains only the approved primary hierarchy.
- Destination actions still use the trusted start path.
- Trip context remains typed, absent in idle, and collapsible when present.
- Draft, busy, Stop, retry, terminal, and reset lifecycle tests remain green.
- Distinct approved App identities remain chronological and mismatches fail closed.

### Browser proof

Use deterministic local assistant/App fixtures to prove:

- zero state and active conversation at 320, 390, 768, and 1440px;
- 200% text zoom containment in the page and every nested App document;
- no horizontal clipping, orphaned hero word, hidden composer, or nested scroll trap;
- keyboard order through header, hero, transcript, inline App controls, structured requests, and composer;
- visible focus against every surface;
- minimum 44px targets;
- reduced-motion behavior and absence of unintended long durations;
- unique App identities and preserved mounted instances across later turns;
- no secondary Flight workspace or page-owned fare reconstruction.

### Image proof

- inspect every generated output at original detail;
- verify dimensions, format, bytes, hash, and focal crop;
- reject visible generation artifacts before integration;
- prove responsive `sizes`, loading, and priority behavior;
- record the binary history-audit review;
- ensure the production page does not reference discarded or missing assets.

### Repository and Noodle proof

Run the established offline gates, including:

```bash
env CI=true pnpm test
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web test
pnpm --filter @nuitee-travel-starter/web build
pnpm audit:history
pnpm audit:licenses
./node_modules/.bin/noodle validate --json
./node_modules/.bin/noodle test --json
./node_modules/.bin/noodle check --json
./node_modules/.bin/noodle validate src/embedded-server.ts --json
./node_modules/.bin/noodle check src/embedded-server.ts --target embedded-assistant --json
git diff --check
```

The exact aggregate repository command may replace redundant individual commands, but the final report must name the exact committed SHA and distinguish local proof from hosted behavior.

## Non-goals

- Booking, payment, passenger-detail collection, check-in, or account management.
- A right-side itinerary builder or traditional flight-search form.
- Rebuilding MCP App data as website-owned fare cards.
- Copying Layla or airline protected assets and visual identity.
- New fonts, remote icon services, animation libraries, or analytics.
- Hosted deployment, embed rebinding, secret changes, access changes, public release, or PR merge.

## Success criteria

The implementation succeeds when:

1. a first-time visitor understands within one fold that they can describe a flight naturally;
2. the landing page feels calm, premium, and visually memorable without competing with the composer;
3. the Wayfare mark is recognizable and usable from favicon to header scale;
4. photography looks natural and high resolution at every responsive crop;
5. the active experience remains one centered conversation;
6. every interactive MCP App appears inline exactly where it is needed;
7. trip context, errors, no-results, confirmations, and verification feel like one cohesive system;
8. motion communicates real state and never becomes decorative noise;
9. accessibility, lifecycle, exact-view, security, history, and offline quality gates remain green;
10. all claims remain local until separate hosted proof exists.
