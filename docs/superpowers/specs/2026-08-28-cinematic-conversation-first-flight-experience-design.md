# Cinematic Conversation-First Flight Experience Design

**Status:** Approved visual direction; written specification awaiting review

**Owns:** The consumer-facing Next.js travel shell, cinematic zero state, trip-brief projection, conversation layout, responsive behavior, and visual alignment of the existing Nuitee MCP Apps

**Depends on:** `docs/superpowers/specs/2026-08-27-nextjs-chat-first-travel-template-design.md`, the current guest assistant runtime, the current Search → Select → Verify tool boundary, and the existing `travel-home` and `flight-results` MCP Apps

## 1. Outcome

Turn the current developer-template shell into a credible consumer travel experience that feels like a traditional premium airline website rebuilt around conversation.

The experience keeps the parts of airline websites that create confidence:

- destination-led visual storytelling;
- a clear starting task;
- a visible route, date, traveller, cabin, and currency summary;
- current fare comparisons with schedule, duration, stops, baggage, and terms;
- explicit fare verification before the user acts.

It removes the form-first burden. The guest describes a trip naturally, the assistant asks only for missing or ambiguous facts, and compact controls appear only when they are faster or safer than another prose turn.

The product remains a flight-discovery companion, not an airline and not a booking engine. It searches, compares, selects, and verifies. It does not hold, book, ticket, manage, check in, take payment, or collect passenger identity.

## 2. Binding product boundary

The experience ends at a verified fare.

Supported:

1. Start a guest trip in natural language.
2. Resolve or clarify route, dates, travellers, cabin, country, and currency.
3. Search up to ten bounded current flight options through Nuitee.
4. Compare schedules, price, stops, baggage, fare properties, and relevant amenities.
5. Select an opaque application-issued fare.
6. Verify its current availability and price.

Not supported:

- booking, prebooking, reservation holds, payment, or ticketing;
- passenger names, documents, contact details, or loyalty identifiers;
- manage booking, check-in, flight status, cancellation, or refunds;
- hotels, cars, transfers, packages, and experiences;
- fake or disabled navigation advertising unsupported products.

Every primary CTA and terminal state must preserve this boundary. Use `Select fare` and `Verify current fare`; never use `Book`, `Continue to payment`, or language implying inventory is held.

## 3. Brand and attribution

The implementation remains template-safe and configuration-driven.

- `starterConfig.brand` remains the only brand source.
- The `Vayora` name shown in the approved wireframe is a working visual placeholder, not a hard-coded product decision.
- Until a domain and trademark check is approved, the implementation continues to render the configured repository brand.
- A future name change must require only `starter.config.ts` and asset replacement, not component rewrites.

Marketing attribution appears in two quiet locations:

- beneath the zero-state journey composer; and
- below the final result/verification surface or in the page footer.

Exact copy: `Built on Noodle Seed · Powered by Nuitee`.

The attribution is secondary text, not a badge competing with the consumer brand. It may link to the respective product websites once final destinations are configured.

## 4. Visual direction

### 4.1 Signature

The one memorable visual device is a cinematic destination photograph behind the first trip prompt. All later states become quieter and more information-led.

The first implementation uses:

`apps/web/public/images/conversation-hero-v1.png`

The asset is decorative. It receives an empty alt value, responsive cropping, and a navy scrim that guarantees readable light text. The current 1672×941 image is the approved visual candidate. A true 3840×2160 derivative may replace it later without changing layout or component contracts.

### 4.2 Palette

The site stays light-theme only.

- Neutral paper: `#FBFAF7`
- Raised white: `#FFFFFF`
- Primary ink/navy: `#14213D`
- Interactive blue: `#245AA8`
- Muted copy: `#657083`
- Boundary: `#D9DEE6`
- Success wash: `#D9EEE6`
- Success ink: `#17694C`

The image supplies warmth and destination color. Application chrome remains neutral. Navy is reserved for high-emphasis actions, active identity, and route structure. Blue is reserved for focus, selection, and linked actions.

### 4.3 Typography

- Display: a restrained editorial serif for hero and journey headings.
- Body/UI: the current clean sans-serif stack for controls, conversation, and fare data.
- Data: tabular numerals for times and prices; monospace is not used as a decorative travel motif.

If external font loading would complicate the public template, use self-hosted or system-safe fallbacks. Typography must not add a new runtime dependency or third-party request solely for appearance.

### 4.4 Motion

Motion is functional and sparse:

- a 180–240ms crossfade/position transition from hero to conversation workspace;
- composer focus response;
- trip-brief field updates;
- result skeleton shimmer and fare verification state already owned by the MCP App.

There is no orbiting-dot decoration, background carousel, autoplay video, or perpetual parallax. `prefers-reduced-motion` removes decorative transitions and shimmer while preserving status text.

## 5. Screen architecture

### 5.1 Discover: cinematic zero state

The first screen is a destination-led consumer homepage, not a developer dashboard.

Header:

- configured brand at left;
- at most one consumer navigation action plus `For developers`;
- guest-session status at right;
- no unsupported `Manage booking`, `Check in`, or `Flight status` links.

Hero:

- full first viewport with the generated image;
- left-aligned headline and capability statement;
- wide opaque journey composer anchored in the lower content area;
- two bounded starter prompts from configuration;
- marketing attribution below the composer.

Default copy direction:

- eyebrow: `A new way to find your flight`
- heading: `Tell us where you want to be.`
- supporting copy: `Describe the trip in your own words. We’ll shape the details, compare live options, and verify the fare you choose.`
- composer label: `Start a trip`
- placeholder: `Islamabad to Rome for two, next weekend`
- action: `Plan my flight`

No assistant client mounts before a valid first submit. The hero remains a zero-admission state.

### 5.2 Clarify: conversation plus live trip brief

After first submit, the image gives way to a quiet neutral workspace.

Desktop structure:

- persistent slim header;
- primary conversation column;
- 300–340px live trip-brief column;
- composer anchored after the transcript, without body-level nested scrolling.

The trip brief is a projection of validated structured output, never parsed assistant prose. It may show:

- IATA route and friendly airport/city names;
- trip type;
- departure and return dates;
- adult, child, and infant count;
- cabin;
- currency and point-of-sale country;
- current phase.

Unknown fields remain visibly unresolved or omitted. The brief must not display guessed dates or locations.

Clarification controls are compact and conditional:

- airport choices when a city is ambiguous;
- date-window buttons or a calendar when the date is incomplete;
- passenger and age controls when child/infant rules need precision;
- cabin choices when absent.

The assistant still owns the conversational sequence. Controls send typed follow-up intent through the existing client rather than creating a second search state or calling Nuitee directly.

### 5.3 Compare and verify: MCP App-led result state

The existing `flight-results` MCP App remains the authoritative results UI.

The host must not recreate or duplicate fare cards. The approved wireframe defines the target hierarchy for the App:

- result heading and retrieval freshness;
- visible trip summary;
- carrier, outbound/return timing, duration, and stops;
- total price and currency;
- baggage and fare properties;
- one primary `Select fare` action;
- current verification result and price-change state.

The Noodle App stays attached to its originating assistant message and uses `NoodleAppView`. It may consume the available transcript width, but it is never extracted into an unrelated host-owned state store or copied into a separate results implementation.

After selection:

- the trip brief changes to `Fare selected`;
- the assistant can offer `Verify current fare`;
- verification updates the existing App/model context;
- terminal copy states clearly that the fare is verified, not booked or held.

## 6. Responsive behavior

### Desktop, 1024px and wider

- cinematic hero fills the first viewport;
- composer remains readable at up to roughly 1040px;
- clarification workspace uses conversation plus trip brief;
- fare Apps may use the full conversation column.

### Tablet, 701–1023px

- navigation is reduced;
- trip brief becomes a compact right column or collapsible summary depending on available width;
- no horizontal transcript or fare-card scrolling.

### Mobile, 320–700px

- header becomes a compact brand row;
- hero uses a responsive focal crop that retains coastline and adequate text contrast;
- headline scales without orphaning the final word;
- composer stacks input and primary action;
- only one starter prompt is visible initially;
- trip brief becomes a compact summary below the header and an expandable details region;
- transcript and MCP Apps use the full viewport width;
- fare cards stack carrier, route, and price without hiding essential information.

The implementation must pass at 390px, 320px, and 200% text zoom.

## 7. State and data flow

The host page maintains only presentation state:

```text
discover → starting → conversation
                     ├─ clarifying
                     ├─ searching
                     ├─ comparing
                     ├─ selected
                     ├─ verifying
                     ├─ verified
                     └─ error
```

Authoritative sources:

- assistant messages and client events: transcript and progress;
- validated `search_flights` output: trip brief and result App;
- App-only `select_flight_offer`: active opaque selection;
- `verify_flight_offer`: current availability and price;
- `starterConfig`: brand, copy-safe customization, origins, links, and starter prompts.

The browser does not store provider offer identifiers, raw Nuitee responses, or a shadow itinerary model.

## 8. Error and recovery UX

This design work does not repair the separately observed provider/tool failure. It improves how supported errors are presented without masking backend faults.

- Configuration error: explain the missing public embed setup only after submit.
- Assistant transport error: one calm inline error with a retry only when safe.
- Search/provider error: retain the last valid trip brief as stale, show one failure surface, and provide `Try again` or `Adjust trip`.
- Empty result: state `No matching fares found` and offer date/route refinement.
- Expired selection: clear selected status and ask the guest to select from a fresh search.
- Verification price change: show previous and current price, timestamp, and a deliberate re-selection/acceptance path.

The UI never loops retries automatically, duplicates error Apps, exposes raw error JSON, or implies success after failure.

## 9. Accessibility and performance

- one semantic `main` and one page `h1` per screen;
- skip link targets the active consumer content;
- all controls have visible text or accessible names and at least 44px targets;
- keyboard submission, stop, reset, clarification, selection, and verification work without pointer input;
- status changes use one stable polite live region;
- errors use an alert only when immediate attention is needed;
- image text contrast meets WCAG AA through a deterministic scrim, not image assumptions;
- the hero is responsive, priority-loaded only on the zero state, and not loaded again in conversation;
- Next.js image optimization or equivalent responsive formats prevent the large source image from becoming the mobile payload;
- layout shift is avoided with an explicit image aspect/fill contract.

## 10. Component boundaries

Expected changes are limited to the primary website and MCP App presentation:

- `TravelAssistantPage`: screen transitions and shared header ownership;
- `TravelZeroState`: cinematic hero content and delayed-session composer;
- `TravelConversation`: conversation workspace composition;
- `TripContextRail`: replaced or reshaped into a live `TripBrief` appropriate to desktop and mobile;
- `TravelComposer`: hero and transcript presentation variants over one behavior contract;
- `SettingsSheet`: remains secondary and accessible;
- `travel-message` / view registry: preserve typed rendering and linked App identity;
- `src/views/flight-results.tsx` and `src/views/travel.css`: align the existing MCP App with the approved fare hierarchy without changing tool semantics;
- `starter.config.ts`: add copy/tokens only when they are truly reusable customization fields;
- `apps/web/app/globals.css`: implement the light visual system and responsive layouts.

Do not modify tool schemas, provider normalization, assistant deployment, budgets, secrets, or hosted configuration under this UI implementation.

## 11. Verification contract

### Unit and component tests

- hero renders configured brand, copy, attribution, and decorative image semantics;
- assistant does not initialize before first submit;
- first submit mounts conversation and sends exactly once;
- trip brief renders only validated projection values;
- clarification controls send one follow-up and do not call providers directly;
- unsupported/dead airline navigation is absent;
- result Apps remain linked through `NoodleAppView` with original view identity;
- terminal copy never claims booking or holding;
- light theme and configured tokens remain deterministic.

### Browser tests

- desktop visual state for Discover, Clarify, Compare, and Verify;
- 390px and 320px fit without horizontal overflow;
- 200% text zoom keeps hero copy, composer, trip brief, and results usable;
- keyboard-only trip start, stop, reset, and result interaction;
- reduced motion disables decorative transitions;
- hero image does not load in the conversation-only state after reset lifecycle checks;
- contrast remains readable over the actual generated image.

### Existing gates

- full website tests, typecheck, Playwright, and production build;
- root tests and Noodle validate/test/check;
- history, secret, license, and customization gates;
- no hosted mutation or deployment under this implementation plan.

## 12. Implementation slices

1. Add design tokens, hero asset contract, and cinematic zero state with tests.
2. Replace the floating developer rail with consumer header plus live trip brief.
3. Add compact clarification controls over existing assistant follow-up behavior.
4. Align the existing flight-results App to the approved comparison hierarchy.
5. Add mobile, zoom, keyboard, contrast, and reduced-motion browser coverage.
6. Run full repository gates and present localhost for product review.

Domain acquisition, final brand naming, true 4K image production, provider/tool repair, deployment, PR creation, and merge remain separate decisions.
