# Wayfare Widget Branding Design

**Status:** Approved in conversation on 2026-09-05  
**Delivery branch:** `codex/tribe-widget-wayfare-local` (PR #59)  
**Normative visual contract:** [`docs/brand/wayfare-brand-guidelines.md`](../../brand/wayfare-brand-guidelines.md)

## Goal

Bring every repository-owned MCP widget in PR #59 into the approved Wayfare
brand system without changing tool schemas, provider behavior, or the honest
boundary between live, illustrative, selected, verified, and confirmed data.

## User and conversational job

The user is a globally curious traveler working with Wayfare in conversation.
Widgets help them scan, compare, select, verify, and continue; they do not
replace the conversation with a parallel booking dashboard.

The widget set must support these jobs:

- understand which travel capability or result has appeared;
- compare flights, hotels, reward ideas, protection guidance, and trip context;
- make a reversible selection and continue in chat;
- distinguish live provider data from illustrative Wayfare guidance;
- understand when an item is merely selected versus provider-verified.

## Scope

The conversion covers the seven rendered surfaces registered by the travel
server:

1. travel starter;
2. flight results and fare review;
3. hotel results and stay-match detail;
4. loyalty overview and trip review;
5. reward-flight ideas;
6. travel-protection guidance;
7. the shared flight search editor used inside result refinement.

The tool contracts, Nuitee flight and hotel gateways, selection identifiers,
structured output schemas, app-only helper tools, and model-visible fallbacks
remain unchanged.

## Visual foundation

- Use Host Grotesk Variable as the sole product typeface.
- Force the light Wayfare palette even when an MCP host reports a dark theme.
- Use exact neutral tokens: canvas `#FFFFFF`, surface `#F7F7F7`, raised
  `#FFFFFF`, ink `#0D0D0D`, muted `#5D5D5D`, subtle `#767676`, and boundary
  `#E8E8E8`.
- Use semantic colors only for their stated meaning: selected `#66CCFF`,
  confirmed `#99FF99`, action needed `#FF6666`, and response activity
  `#2F7391`.
- Default actions are black with white text. Every text action and chip is a
  full pill. Icon-only controls are circular and at least 44 by 44 pixels.
- Use Heroicons outline icons by default and solid icons only for compact
  status emphasis. Remove custom functional SVGs, Unicode checkmarks, and
  Unicode approximation symbols.
- Cards use restrained radii, neutral boundaries, quiet elevation, and
  readable body and label sizes. Tabular numerals are used for prices, dates,
  durations, points, and route facts.

## Composition and interaction

### Travel starter

The starter becomes a compact orientation surface. It states current capability
availability and provenance, then directs the user back to the conversation.
It does not render a trip form, trip-type picker, or dashboard-style stack.
Optional hotel and loyalty prompts remain available as compact pills when the
host supports follow-up messages.

### Flight and hotel decisions

Flight and hotel rails remain horizontally scrollable with snap alignment.
Desktop rail controls become 44-pixel circular Heroicon buttons. Cards retain
their existing fare/detail disclosures and bounded selection callbacks.

Selection uses selected blue with black text and the literal labels `Select`,
`Selecting…`, and `Selected`. A selected item is never styled as confirmed.
Provider verification may use confirmed green only after the verification
response explicitly reports availability without a price change. Price change,
expiry, or blocking provider failure uses action-needed styling and plain copy.

The custom stay-match SVG ring becomes a compact text score pill. Match detail
uses Heroicons plus explicit `Matches` or `Consider` labels rather than symbols.
The score remains guidance derived from returned fields, not a provider claim.

### Loyalty, reward, and protection guidance

These widgets retain their illustrative disclosure and non-transactional
language. Green is not used for generic positive decoration. Actions remain
continuation prompts, never booking, redemption, insurance recommendation, or
purchase claims.

## States and accessibility

Every surface keeps loading, empty, partial, malformed, error, selected, and
verification states where applicable. Skeletons are neutral and static when
reduced motion is requested. Focus uses a two-pixel ink outline. Controls keep
an accessible name, panels keep valid `aria-controls` relationships, and no
content requires color alone to convey meaning.

The layouts must remain usable at 320 CSS pixels, at 200 percent text zoom, and
with the host reporting a dark theme. The rendered result remains a light
Wayfare surface in every case.

## Model-visible and widget-only boundaries

Model-visible results and fallbacks remain the source of truth. Widget-only
selection helpers may remember or report the current selection but do not imply
booking or confirmation. No new product-agent guide is required because this
change does not alter tool intent, required inputs, sequencing, or safety
behavior.

## Verification

- Unit tests exercise selection wording and semantic state rendering.
- Component tests prove Heroicons, Host Grotesk, chat-first starter composition,
  and the removal of custom widget SVG controls.
- Browser tests prove light-only rendering, 44-pixel controls, pill actions,
  selected-state colors, 320-pixel resilience, and reduced-motion behavior.
- Full `pnpm test` and `pnpm test:browser` pass.
- `noodle validate --json`, `noodle test --json`, and
  `noodle check src/demo-live-server.ts --json` pass.
- Expanded live provider smoke remains credential-dependent and is reported
  separately if `NUITEE_API_KEY` is unavailable.

