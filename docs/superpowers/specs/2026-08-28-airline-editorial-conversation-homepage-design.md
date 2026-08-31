# Airline Editorial Conversation Homepage Design

**Status:** Approved direction; written specification awaiting review

**Owns:** The public Next.js landing-page information architecture, typography, destination discovery, consumer navigation, marketing attribution, responsive behavior, and the transition into the existing guest conversation

**Depends on:** `docs/superpowers/specs/2026-08-27-nextjs-chat-first-travel-template-design.md`, `docs/superpowers/specs/2026-08-28-cinematic-conversation-first-flight-experience-design.md`, the configured guest assistant, and the existing Search → Select → Verify tool boundary

**Supersedes:** The earlier mixed serif/sans typography choice, the single-viewport-only landing page, repeated hero brand copy, and the desktop-style mobile navigation in the cinematic design

## 1. Outcome

Make the public landing page feel like a modern premium airline website rebuilt around conversation.

The site keeps the useful structure of established airline homepages—destination imagery, travel inspiration, clear journey planning, confidence signals, and a complete footer—but replaces the traditional booking form and scattered point-and-click calls to action with one assistant-led flow.

Every travel action starts or supports a conversation. The page must feel useful before the guest submits a prompt, while remaining honest about the product's current capability: search, compare, select, and verify flights. It is not a booking, payment, ticketing, check-in, loyalty, hotel, package, or flight-status product.

## 2. Design principles

1. **Conversation is the booking surface.** Travel cards and editorial calls to action send complete natural-language prompts to the assistant.
2. **Airline depth without airline theatre.** Add inspiration and confidence, not fake controls for unsupported services.
3. **One idea per section.** Each section has one heading, at most one short supporting sentence, and one clear interaction pattern.
4. **Photography carries emotion; typography carries clarity.** Use large realistic travel imagery with a restrained Inter-only interface.
5. **The first action remains obvious.** Additional content must not compete with the hero composer.
6. **Template-safe by default.** Brand, links, prompts, and destinations remain replaceable without editing assistant-runtime logic.

## 3. Information architecture

The landing page is a single document with six ordered regions:

```text
Consumer header
  ↓
Cinematic conversation hero
  ↓
Destination inspiration
  ↓
Search → Compare → Verify capability strip
  ↓
Editorial travel feature
  ↓
Trust and footer
```

The existing conversation state remains a separate focused workspace. Starting from the hero, a destination card, or the editorial feature sends one initial prompt through the same `onStart(prompt)` boundary and transitions to that workspace. No landing section calls Nuitee or the assistant client directly.

## 4. Consumer header

### Desktop

- Left: configured brand mark and name.
- Right: `Plan a trip`, `For developers`, and one compact menu button.
- `Plan a trip` moves focus to the hero composer without reloading.
- The menu contains `Settings` and the existing legal/help links that are actually configured.
- Remove the visible `Guest trip` pill from the hero header. Guest status belongs in the footer and settings disclosure.

The header remains transparent over the hero and uses light content. It does not transform into a second sticky navigation system after scrolling.

### Mobile

- Show only the configured brand and one 44px menu control.
- Put `Plan a trip`, `For developers`, and `Settings` in the menu.
- Keep the menu keyboard-operable, focus-contained while open, dismissible with Escape, and labelled without relying on an icon alone.

The existing conversation header retains a direct `New trip` action because that action is relevant after a session starts.

## 5. Cinematic conversation hero

Reuse the approved cinematic destination image and its readable navy scrim. The hero is the only full-bleed photographic surface above the fold.

Approved hierarchy:

- headline: `Where will you go next?`
- support: `Tell us the trip. We’ll find the flights and verify the fare.`
- composer label: `Plan a trip`
- placeholder: `Islamabad to Rome for two, next weekend`
- action: `Find flights`
- two compact starter prompts from configuration
- a quiet scroll cue labelled `Explore destinations`

Remove from the hero:

- the second rendering of the brand name;
- `A new way to find your flight`;
- the longer explanation about shaping details and comparing live options;
- marketing attribution, which moves to the footer;
- guest-session copy;
- decorative or continuously looping animation.

The desktop hero uses `min-height: 88svh` so the next section edge remains discoverable. On short mobile viewports, content determines height; controls must never be clipped to force a full-screen composition.

## 6. Destination inspiration

Heading: `Places to start`

Do not add introductory body copy beneath this heading. The card names and descriptors carry the section meaning.

Render three premium photographic destination cards. Each card contains:

- destination name;
- a two-to-five-word travel descriptor;
- an accessible action label such as `Plan a trip to Rome`;
- a complete prompt stored in the typed landing-content model.

Initial content direction:

| Destination | Descriptor | Submitted prompt |
| --- | --- | --- |
| Rome | Long weekends | `Help me plan a long-weekend flight to Rome for two.` |
| London | Nonstop options | `Compare nonstop flight options to London.` |
| Istanbul | Flexible dates | `Find flights to Istanbul with flexible dates.` |

Clicking or keyboard-activating a card submits its prompt through the existing start boundary. The card must never show a fabricated fare, discount, route availability, or airline endorsement.

Cards use semantic buttons or links with button behavior, not clickable generic containers. The visible destination name supplies meaning when the image is unavailable.

## 7. Capability strip

Use a restrained three-part strip on a light surface:

1. `Search live flights`
2. `Compare your options`
3. `Verify the fare`

Each item has one short line of supporting copy, capped at 60 characters. The strip is explanatory, not a second navigation surface. Avoid feature badges, statistics, awards, provider counts, and claims that are not measured or contractually guaranteed.

On mobile the three items stack in process order without a visual connector.

## 8. Editorial travel feature

Add one wide photographic feature to create the depth and atmosphere of a traditional airline homepage.

Approved content direction:

- eyebrow: `Travel inspiration`
- heading: `A few words can take you somewhere new.`
- support: one sentence explaining that dates, travellers, cabin, and route can be refined in conversation;
- action: `Start with a flexible trip`
- submitted prompt: `Help me find a trip somewhere warm with flexible dates.`

This is not an offer, package, destination guarantee, or promotional fare. It is another entry into the same assistant flow. The section uses one primary action and no carousel.

## 9. Footer and trust layer

The footer completes the consumer site without pretending to be an airline corporate portal.

Include:

- configured brand name and one concise product description;
- `For developers`;
- configured privacy and terms links, using existing safe fallback behavior when absent;
- `Guest session` with one short disclosure that no account is required;
- exact attribution: `Built on Noodle Seed · Powered by Nuitee`.

Do not add newsletter signup, loyalty enrollment, social-media links, corporate-office groups, manage-booking links, or unsupported support categories.

## 10. Typography and visual system

### Inter everywhere

Use Inter for all consumer and developer surfaces:

- hero and section headings;
- body copy;
- navigation and controls;
- conversation and assistant status;
- fare/result UI owned by this repository;
- settings dialogs;
- developer page;
- code remains monospace where code semantics require it.

Load Inter from the bundled `@fontsource-variable/inter` package so production and offline builds make no browser or build-time request to Google. Define one global font variable and remove explicit editorial-serif declarations.

Hierarchy comes from size, weight, line height, and spacing:

- hero display: 600–650 weight, tight but readable tracking;
- section heading: 550–650;
- body: 400–450;
- controls: 500–600;
- metadata/eyebrows: 550–650 without excessive all-caps tracking.

### Colour and surfaces

- Keep the interface light-theme only.
- Preserve the current neutral paper, raised white, deep navy, blue focus, and muted boundary tokens.
- The hero image supplies colour; below-fold sections remain warm neutral and white.
- Use borders and spacing before shadows. Shadows are reserved for the composer, open menu, and elements that genuinely sit above another surface.
- Do not add decorative gradients behind content. The image scrim remains functional for contrast.

## 11. Image production

The existing hero image remains the primary asset.

Create four realistic travel images for the three destination cards and editorial feature. Generation requirements:

- photographic realism, natural light, no logos, no readable signage, no aircraft branding, and no identifiable private individuals;
- distinct compositions that remain legible under responsive crops;
- generate at the highest native resolution available and commit web-optimized derivatives rather than oversized production masters;
- use local Next.js image assets with explicit responsive sizes and no third-party hotlinks;
- keep card images decorative when the adjacent card text names the destination;
- document source and review the exact binary blobs through the repository history-audit process before commit.

If image generation cannot produce credible, legally safe assets, ship neutral editorial colour fields temporarily rather than importing unlicensed stock photography.

## 12. Component boundaries

Keep the page split into focused presentation units:

- `TravelHeader`: responsive consumer navigation and menu boundary.
- `TravelZeroState`: orchestrates the landing regions and the single `onStart` contract.
- `TravelHero`: hero copy, composer, starter prompts, and scroll cue.
- `DestinationInspiration`: renders configured destination prompt cards.
- `TravelCapabilityStrip`: static bounded-capability explanation.
- `TravelEditorialFeature`: one editorial prompt entry.
- `TravelFooter`: legal, guest disclosure, developer link, and attribution.

The content model for destination and editorial prompts is typed and independent of React in `apps/web/src/lib/landing-content.ts`. Runtime assistant/session code must not import visual assets or landing content.

Do not create a generic design-system abstraction for components used only once. Reuse existing tokens, composer behavior, focus rules, and settings boundary.

## 13. Interaction and data flow

All landing actions converge on one path:

```text
Hero submit ─────────────┐
Starter prompt ──────────┤
Destination card ────────┼─> onStart(prompt) ─> existing guest lifecycle
Editorial action ────────┘
```

Requirements:

- ignore blank prompt submissions;
- prevent duplicate initial submissions while the session is starting;
- preserve the selected prompt until the transition succeeds or an error is shown;
- use the existing safe assistant-error mapping;
- do not mount the assistant client before a valid first action;
- do not call MCP tools directly from landing components;
- `Plan a trip` and the scroll cue change focus/scroll position only and do not create sessions.

## 14. Error behavior

- Configuration failure appears beside the action that attempted to start the assistant.
- A failed destination or editorial start keeps the guest on the landing page and retains enough context to retry.
- Images must not be required for navigation or understanding.
- Missing optional legal URLs use the repository's existing disabled/fallback presentation rather than broken links.
- No destination card silently falls back to a different prompt.

This design does not change provider, Nuitee, assistant-session, or MCP App error contracts.

## 15. Responsive behavior

### Desktop, 1024px and wider

- hero content width remains readable and left aligned;
- the lower edge of destination content is discoverable from the first viewport;
- destination cards render as a three-column row;
- capability items render in one horizontal sequence;
- editorial feature uses a wide image/copy composition.

### Tablet, 701–1023px

- destination cards use two columns with the third card spanning both columns;
- capability strip remains ordered and readable;
- header actions reduce before text wraps.

### Mobile, 320–700px

- brand plus menu only in the header;
- hero height follows content and safe viewport insets;
- composer stacks without clipping or overlaying the input;
- destination cards stack vertically;
- capability items stack in process order;
- editorial copy remains separate from its image when overlay contrast cannot be guaranteed;
- footer links remain 44px touch targets;
- no horizontal page scrolling at 320px or 200% text zoom.

## 16. Accessibility and motion

- Retain the skip link and move its target to the primary hero/landing content.
- All menu, card, prompt, composer, and footer actions are keyboard operable with visible focus.
- The compact navigation menu uses a native modal dialog with focus containment, Escape dismissal, and focus restoration to its trigger.
- Heading order is one `h1`, then section `h2` elements.
- Do not encode process order or card identity through colour alone.
- Maintain WCAG AA text contrast over images at every crop.
- Touch targets are at least 44×44px.
- Smooth scroll and entry transitions are disabled under `prefers-reduced-motion`.
- No autoplay, parallax, background video, carousel, or perpetual decorative animation.

## 17. Copy budget

Combined landing copy—excluding navigation, user prompt examples, legal link labels, and attribution—is capped at 120 words.

- Hero: one headline and one sentence.
- Section introductions: one sentence maximum.
- Card descriptors: two to five words.
- Capability explanations: one short line each.
- Editorial feature: one sentence.
- Footer description and guest disclosure: one sentence each.

Remove duplicate brand labels, decorative eyebrows that repeat the heading, generic travel superlatives, `AI-powered` claims, filler such as `Discover a world of possibilities`, and instructions that the interface already communicates.

## 18. Testing and verification

### Unit and component tests

- Inter is the global non-code typeface and no serif display declaration remains.
- hero copy and removed duplicate copy match the approved contract;
- hero, starter, destination, and editorial actions pass the exact expected prompt to `onStart`;
- blank and duplicate starts remain guarded;
- menu semantics, Escape dismissal, focus behavior, and mobile navigation are covered;
- destination cards remain usable without images;
- legal link fallback and attribution render correctly;
- existing conversation lifecycle, projection, MCP App identity, settings, and developer-page tests remain green.

### Browser proof

Verify at minimum:

- desktop 1440×1000;
- tablet 768×1024;
- mobile 390×844 and 320×568;
- 200% browser text zoom;
- keyboard-only navigation;
- reduced motion;
- no assistant request before a landing action;
- one assistant request with the correct prompt after each entry type;
- no horizontal overflow;
- mobile header and menu behavior;
- hero/image contrast and section discoverability;
- production build and static `/developers` route.

### Repository and Noodle gates

Run the existing web, root, Noodle validation/check, history, license, and offline quality gates required by the repository. Image assets require exact-blob history-review evidence before the branch can be considered clean for public-template review.

## 19. Non-goals

- Changing MCP tools, Nuitee API behavior, or Assistant SDK lifecycle.
- Repairing the separately observed live MCP App/tool-delivery failure.
- Booking, payment, ticketing, passenger data, check-in, flight status, loyalty, hotels, cars, packages, or transfers.
- Personalised recommendations, geolocation, saved trips, accounts, analytics, or newsletter capture.
- A destination CMS, carousel system, general design system, or airline mega-menu.
- Claiming hosted readiness, public availability, production adoption, or measured conversion impact from local UI work.

## 20. Acceptance criteria

The design is complete when:

1. The landing page reads as a coherent consumer travel site above and below the fold.
2. The assistant composer remains the unmistakable primary action.
3. Every travel CTA starts the existing conversation with a deterministic prompt.
4. Inter is used throughout all non-code UI.
5. Copy satisfies the section budgets and removes the identified duplication.
6. Unsupported airline functionality is absent.
7. Desktop, mobile, keyboard, zoom, reduced-motion, and build verification pass.
8. Existing Search → Select → Verify behavior and MCP App rendering remain intact.
9. Generated images are local, optimized, source-documented, and history-audit reviewed.
10. The repository remains honest that local proof is not hosted/public-release proof.
