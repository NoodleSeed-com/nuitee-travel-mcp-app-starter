# Premium UI implementation plan

Status: implemented locally; browser/real-host visual evidence remains a release gate.

## Decision

Adopt one coherent **Quiet Canopy** visual system for Cedar & Cloud Travel, using the disciplined route and timing hierarchy of a **Runway Grid** inside flight results.

The result should feel like a calm premium concierge, not a miniature airline website. Familiar controls and interaction patterns remain standard; distinctiveness comes from hierarchy, spacing, precise language, and the Cedar & Cloud palette.

The temporary concept files are intentionally outside the repository:

- `/tmp/cedar-cloud-premium-ui-concepts/recommended.html` — recommended interactive direction.
- `/tmp/cedar-cloud-premium-ui-concepts/index.html` — three visual directions for comparison.

## Evidence and resolved disagreements

The plan uses:

- the current generated Noodle Agent Kit guidance in `widgets-and-apps.md` and `experience-design.md`;
- the current public `@noodleseed/one/react` component and hook surface;
- official MCP Apps progressive-enhancement and host-context guidance;
- official W3C/WAI accessibility guidance;
- current official airline search and shopping patterns from Emirates, Singapore Airlines, Qatar Airways, Delta, Air Canada, and United;
- current official Nuitee flight search and verification guidance.

Primary public references:

- [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview)
- [MCP Apps SDK overview](https://apps.extensions.modelcontextprotocol.io/api/documents/Overview.html)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WAI disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
- [Emirates flight search](https://www.emirates.com/english/book/)
- [Singapore Airlines fare types](https://www.singaporeair.com/en_UK/us/flying-withus/fare-types/)
- [Qatar Airways booking](https://www.qatarairways.com/en-qa/book.html)
- [Delta online booking](https://www.delta.com/us/en/booking-information/online-booking/overview)
- [Air Canada booking](https://www.aircanada.com/ca/en/aco/home/book.html)
- [United flight search](https://www.united.com/en/us/book-flight/)
- [Nuitee flight-booking workflow](https://docs.liteapi.travel/docs/build-a-flight-booking-experience)

Two inherited choices now disagree with current Agent Kit guidance:

1. `docs/customization.md` and the current tests preserve one primary **Verify fare** button per card. The current generated rule is one inline purpose, one primary action, and at most two visible actions. The premium implementation will use selectable fare cards followed by one **Verify selected fare** action.
2. The current CSS duplicates branding colors and uses a brand gradient. Current generated guidance requires runtime branding tokens and advises against brand gradients. The implementation will map `useBranding()` values to local semantic custom properties and use flat surfaces.

These are application corrections, not new Noodle feedback findings.

## Product and interaction boundary

The UI continues to expose only two tool-linked entry widgets:

- `TravelHome` for a credential-free first impression and conversational flight invitation;
- `FlightResults` for comparing search results and verifying one selected fare.

They share a unified Search/Edit → Results → Verified fare-review journey. Familiar labelled search inputs are included, with natural place names sent through an explicit host follow-up for safe resolution. The journey adds no website navigation, hamburger menu, tabs, loyalty controls, checkout, booking, payment, or unfinished travel-domain actions.

A hamburger menu is familiar when a product has hidden navigation. These focused widgets have no internal navigation to hide, so adding one would create false affordance. If a future embedded website shell owns broader navigation, that shell may use its normal standard menu independently of the widgets.

## Visual system

### Tokens

Use server branding as the authority, with semantic fallbacks for local preview and hosts that omit optional values.

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#F7F6F2` | `#101713` |
| Surface | `#FFFFFF` | `#17211C` |
| Primary text | `#17221E` | `#F4F7F5` |
| Secondary text | `#50615A` | `#B4C0BA` |
| Cedar action | `#1E6049` | `#82D1B0` |
| On cedar | `#FFFFFF` | `#0D2B21` |
| Strong boundary | `#68776F` | `#75847C` |
| Price-change warning | `#A84A1F` | a host-adaptive warning token |

Every final combination must be measured in the rendered host. Color never carries state by itself.

### Typography

- Inherit the host/system sans stack; bundle or fetch no font.
- Use weight, spacing, and size for premium hierarchy rather than a branded display face.
- Use tabular numerals for times and prices.
- Keep IATA codes visually crisp, but do not use decorative all-caps text beyond codes and short metadata.
- Keep body copy at a practical host-relative size; metadata must remain readable at 280px and 400% zoom.

### Shape, depth, and spacing

- Use 12–16px widget/card radii, following the runtime branding radius where available.
- Prefer one-pixel separators and surface contrast over large shadows.
- Remove the current gradient and ornamental ticket effects.
- Use an 8px spacing rhythm with deliberate 12, 16, 24, and 32px steps.
- Preserve generous whitespace in `TravelHome`; use denser, aligned spacing in `FlightResults`.

### Icons and motion

- Use familiar route arrows, chevrons, status marks, and host-expand affordances.
- Pair every meaningful icon with visible text or an accessible name.
- Bundle no airline/provider logos and use no third-party icon asset without license review.
- Keep result cards information-led. TravelHome may use the original code-native Cedar & Cloud landscape illustration; it must not imply a real destination, aircraft, or carrier partnership.
- Limit motion to 100–140ms opacity or color transitions.
- Use no parallax, sliding cards, animated countdown, or loading spectacle.
- Make reduced-motion behavior effectively instant.

## TravelHome contract

### Composition

1. Compact Cedar & Cloud lockup using runtime branding.
2. Plain `Flights available` status.
3. One concise headline and supporting sentence.
4. Familiar labelled route, date, traveller, cabin, currency, and country controls, led by an explicit Round trip / One way segmented choice and a real route-swap action.
5. One **Search flights** submit action only when the host reports follow-up-message support; useful conversational fallback when unsupported.
6. An original code-native Cedar & Cloud landscape illustration with no external media request.
7. Static capability list: Flights available; Stays, Loyalty, Ground travel, and Experiences coming soon.

Coming-soon rows have no hover treatment, pointer cursor, tab stop, button semantics, or disabled-control appearance.

### Conversation behavior

When supported, **Search flights** uses `useSendFollowUpMessage()` from explicit form submission. Its prompt carries the user's entered route, dates, travelers, cabin, currency, and point-of-sale country; the host resolves only unambiguous place names and asks for missing child/infant ages or ambiguous locations. It does not call Nuitee directly and does not add another business tool.

## FlightResults contract

### Search summary

Show a compact immutable recap before the list:

`YYZ → LIS · Sep 15–22 · 2 adults · Economy`

This requires adding a bounded `searchContext` object to the existing `search_flights` output, copied only from already validated tool input. It does not expose the upstream response or create a new tool.

Natural city/airport names remain valid conversational input. The result UI must not invent city names when only IATA codes are available. The temporary mockups use city names only as fictional design labels.

### Result-card hierarchy

Each card presents, in order:

1. Real live carrier name and code as text, or fictional fixture carrier text.
2. Airport-local departure and arrival times with IATA codes and `+1 day` when appropriate.
3. Direction, total duration, stop count, and connection details when documented.
4. Bounded baggage statements: included, not included when explicitly documented, or not provided.
5. Trip-total search price and currency.
6. Retrieval time and documented expiry.
7. A standard **Flight details** disclosure for bounded segment detail.

Avoid ungrounded `Best`, `Recommended`, or urgency claims. `Lowest shown` is allowed only when it is computed from the bounded result set and described exactly that way.

### Selection and the single primary action

- Render three options inline and up to ten in fullscreen.
- Do not preselect a fare.
- A card has a large keyboard-operable selection surface with an explicit selected state and contextual accessible name.
- Keep the separate **Flight details** disclosure outside the card's selection button so interactive elements are never nested.
- Once the user selects a fare, show one action dock containing **Verify selected fare**.
- The dock is not sticky in inline mode.
- Retrying replaces the primary action instead of adding another.
- After success, app flow advances to the dedicated **Verified fare review** state; Back returns to results.

The existing `verify_flight_offer` input remains the application-issued opaque `selectionId`; the widget never receives or submits a provider offer identifier.

### Expanded browsing

When more than three results exist and the host reports display-mode support, show one quiet `ExpandButton`/host-mediated control such as **Show all 8 results**. If unsupported, retain the explanatory text fallback. Never add an internal scroll pane or horizontal carousel.

### Verification states

The selected result can become:

- pending;
- verified at the same price;
- verified with a changed price;
- expired;
- unavailable;
- retryable provider error;
- terminal error;
- malformed safe-failure state.

Changed price is a normal, prominent status with old price, current price, currency, availability, messages, and verification time. It does not expose a booking action. Expired or unavailable results direct the conversation back to search.

When model-context publication is supported, publish only one compact verified-fare snapshot. Do not publish the full result set, provider response, or secret-adjacent data.

## Public Noodle React usage

Keep using public `@noodleseed/one/react` surfaces:

- `Frame`, `Flow`, `Region`, `Feedback`, `Action`, and `ActionBar`;
- `StatusBadge`, state components, and `AsyncBoundary` where they simplify complete states;
- `ExpandButton` for a supported host display-mode request;
- a public collection/choice primitive if its current documented behavior fits card selection; otherwise use semantic buttons with `aria-pressed` and keep the primary action as Noodle `Action`;
- `useLayout`, `useBranding`, `useRequestDisplayMode`, `useSendFollowUpMessage`, `useUpdateModelContext`, `useToolInfo`, `useCallTool`, and `useViewState` only for their documented roles.

Do not add `AppShell`, website navigation, overlay sheets, or carousel. The focused FlightResults entry uses public app-flow routing only for its three shallow states and Back stack.

## Component structure

### `TravelHome`

- `TravelHomeContainer` — validated tool envelope, theme, branding, host capabilities.
- `BrandIntro` — mark, availability, headline, supporting copy.
- `ConversationStarter` — real host follow-up action or noninteractive fallback copy.
- `CapabilityList` — static availability presentation.

### `FlightResults`

- `FlightResultsContainer` — tool state, selected ID, verification controller, host capabilities.
- `ResultsSummary` — bounded query recap, count, freshness, optional expand action.
- `FareCollection` — three inline or ten fullscreen.
- `FareCard` — selection surface plus separate detail disclosure.
- `LegTimeline` — flight-specific route/time layout.
- `FareFacts` — stops, duration, baggage, freshness, expiry.
- `ActionDock` — the single primary verify action.
- `FareReview` — boarding-pass-inspired stable/changed verification view, explicitly labelled not a ticket or reservation.
- Result-level feedback — expired, unavailable, retry, and terminal states.

## Responsive behavior

| Width/mode | Behavior |
| --- | --- |
| 280px | One column; stacked metadata and price; full-width primary action; no clipped focus ring. |
| 320–479px | One column; compact timeline; capability list collapses without horizontal scroll. |
| Inline wider | Three vertically stacked results; no internal scrolling; one primary action after selection. |
| Fullscreen | Up to ten results; more breathing room and segment details; host remains scroll owner. |
| Dark theme | Same hierarchy and semantics with measured dark tokens, not inverted photographs/assets. |

## Accessibility acceptance criteria

- Logical DOM, reading, and keyboard order match the visual order.
- Every selection and action works with keyboard alone.
- Visible focus remains fully visible at card edges and in action states.
- Practical targets aim for at least 44×44 CSS pixels; WCAG 2.2 minimum spacing rules still apply.
- Normal text meets 4.5:1 and meaningful component boundaries/focus meet 3:1.
- Color is never the only indicator for selection, partial data, verification, price change, or error.
- Verification updates use polite status announcements without stealing focus.
- `scrollWidth <= clientWidth` at 280px, 320px, and representative host widths.
- No descendant creates an unintended vertical or horizontal scroll container.
- Text reflows at 400% zoom without loss of information or action.
- Reduced motion suppresses every nonessential transition.

## Test-first execution plan

### Phase 1 — lock the new interaction contract (complete)

Add failing tests before implementation for:

- one primary action across the inline result widget;
- no preselected fare;
- selection required before verification;
- contextual selection and verification accessible names;
- three inline and ten fullscreen results;
- host-expand control present only when supported;
- home follow-up action present only when supported;
- four coming-soon domains remain noninteractive;
- verification replaces the action dock;
- changed, expired, unavailable, retry, stale, empty, partial, malformed, loading, and success states;
- no booking, checkout, hold, reserve, payment, loyalty, or arbitrary-link action.

### Phase 2 — expose supported host and brand helpers (complete)

Update `src/helpers.ts` to export only the public components/hooks selected above. Map `useBranding()` values into widget-local semantic CSS variables with safe fallbacks.

### Phase 3 — refine `TravelHome` (complete)

Remove the gradient, implement the Quiet Canopy hierarchy, add capability-detected conversational follow-up, and preserve text fallback.

### Phase 4 — refactor `FlightResults` (complete)

Add the bounded search recap, selection state, one action dock, route timeline, separate disclosure, fullscreen request, and complete verification replacement states. Preserve the existing server-owned selection-ID boundary.

### Phase 5 — implement the shared visual system (complete for code/static evidence)

Replace raw duplicated colors with semantic variables, apply both themes, add tabular numeric alignment, refine focus, remove `overflow-x: clip` as a masking strategy, and solve any actual overflow instead.

### Phase 6 — browser and host evidence (pending release evidence)

Run:

- the full existing offline suite;
- new SSR/component tests;
- `pnpm exec noodle validate --json`;
- `pnpm exec noodle test --json`;
- `pnpm exec noodle tools list --json`;
- `pnpm exec noodle check --json` and the appropriate host target;
- real-browser tests at 280px, 320px, wider inline, fullscreen, light, dark, reduced motion, keyboard-only, and 400% zoom;
- DevTools state review for every loading/error/verification state;
- manual checks in every host the README will claim to support.

No visual polish is complete until the real-browser overflow, focus, contrast, and theme evidence passes.

## Files expected to change during implementation

- `src/helpers.ts`
- `src/flight-schemas.ts` and bounded search output assembly for `searchContext`
- `src/views/travel-home.tsx`
- `src/views/flight-results.tsx`
- `src/views/travel.css`
- `test/widgets.test.tsx`
- focused browser/widget tests added through the supported project workflow
- `docs/customization.md` to replace the obsolete per-card primary-action rule
- README screenshots only after real host/browser verification and asset review

The connector authority, Nuitee authentication, provider request mapping, opaque selection mapping, and tool catalog do not change for this design phase.

## Stop conditions

Stop and report before broadening scope if:

- a desired visual state requires undocumented provider data;
- the public Noodle React surface cannot support the interaction without an internal import;
- a host does not expose the assumed follow-up or display-mode capability;
- real-browser evidence reveals a layout conflict that would require a new business tool or navigation shell;
- any design would introduce airline assets, external fonts, licensing uncertainty, booking implications, or a new credential path.
