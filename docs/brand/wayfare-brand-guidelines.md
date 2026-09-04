# Wayfare brand guidelines

**Status:** Approved product contract
**Approved:** 2026-09-04
**Applies to:** the Wayfare website, conversational product, repository-owned MCP Apps, product copy, generated previews, and new user-facing capabilities

Wayfare is a **modern global explorer for globally curious professionals**. It
turns travel planning into one capable, continuous conversation. The brand
should feel worldly, optimistic, calm, and precise—not like a legacy airline,
luxury concierge, or generic booking portal.

The canonical expression is:

> **One conversation. The whole journey.**

## 1. Product and brand principles

1. **Chat first.** Conversation is the primary surface for intent, refinement,
   comparison, selection, and continuation. Supporting UI stays chronological
   and subordinate to the conversation.
2. **Clear before clever.** Use direct language and explicit states. Do not make
   users decode visual novelty, provider terminology, or agent behavior.
3. **Editorial, not ornamental.** Photography and layout create a sense of
   place. Decoration does not compete with trip decisions.
4. **Confident, not loud.** High contrast, generous space, restrained motion,
   and short copy carry the identity.
5. **Truthful by construction.** Always distinguish live, illustrative,
   selected, confirmed, stale, and action-needed information.
6. **Global without clichés.** Avoid passport collages, airline-livery imagery,
   decorative route maps, and generic luxury symbolism.

## 2. Logo system

The approved logo is **The Wayline**: a continuous journey line with a visible
origin and destination. It suggests movement and connection without depicting
an aircraft, pin, or literal map.

### Master geometry

Use this exact vector geometry. The logo is the only custom SVG exception in
the product.

```svg
<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <path
    d="M7 18C14 18 15.5 46 24 46C32.5 46 31 22 39 22C47 22 46 42 53 42C57.5 42 58.5 35.5 59 30"
    stroke="currentColor"
    stroke-width="6"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle cx="7" cy="18" r="4.2" fill="currentColor" />
  <circle cx="59" cy="30" r="4.2" fill="currentColor" />
</svg>
```

### Approved lockups

- **Primary wordmark:** Wayline mark followed by `Wayfare` in Host Grotesk,
  semibold, sentence case.
- **Icon mark:** Wayline alone when the Wayfare name is already visible or at
  favicon/app-icon scale.
- **One-color only:** use black on light surfaces and white on dark surfaces.
  Semantic colors are not logo colors. The large dark editorial feature is one
  exception: its Wayline carries the approved liquid WebGL shader while
  preserving the exact master geometry. The favicon is the other exception and
  renders the unchanged Wayline in selected light blue (`#66CCFF`) so it remains
  recognizable in browser chrome. Header, app icon, footer, and other compact
  marks remain one-color.
- Preserve the `64 × 64` view box, round stroke caps, round joins, two endpoint
  circles, and `currentColor` behavior.
- Do not redraw the mark as an angular W, add a badge around it, animate its
  path, add a plane or map pin, distort it, or use it as a product control.
- The editorial shader moves color and light inside the fixed mark. It never
  draws, morphs, rotates, or moves the Wayline path. Reduced motion and WebGL
  failure render the same palette as a static SVG gradient.

### Sizing and clearance

- Navigation mark: 24px visible size in a target at least 44px high.
- Standalone small mark: never render below 16px.
- Clear space: at least one endpoint-circle diameter on every side.
- Favicon: use the exact icon mark in `#66CCFF` on a transparent surface.

## 3. Color system

The base is simple white and high-contrast black. Neutral surfaces do most of
the work; semantic color communicates state and is never decorative chrome.
Wayfare is a light-theme product. The website must not switch palettes in
response to the visitor's operating-system color preference. A dark presentation
requires a new explicit product decision and an update to this contract.

### Neutral tokens

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#FFFFFF` | Page and conversation background |
| Surface | `#F7F7F7` | Secondary surface |
| Raised | `#FFFFFF` | Composer, card, and sheet surfaces |
| Ink | `#0D0D0D` | Primary text and functional icons |
| Muted | `#5D5D5D` | Secondary text |
| Subtle | `#767676` | Low-emphasis supporting text on white |
| Boundary | `#E8E8E8` | Dividers and neutral outlines |

### Semantic tokens

| State | Value | Meaning |
| --- | --- | --- |
| Selected | `#66CCFF` | The current choice or selected item |
| Confirmed | `#99FF99` | Completed, verified, or confirmed |
| Action needed | `#FF6666` | Blocking issue or required user action |
| Response activity | `#2F7391` | Legible base color for the live `Thinking…` shimmer |

Rules:

- Never use selected blue as a generic brand fill or default primary-button
  color. Default action contrast is black/white.
- Pair semantic color with plain language and, where helpful, a Heroicon.
- A selection is not a confirmation. A provider response is not automatically
  verified. An error is not a warning.
- User-authored or provider-supplied colors cannot replace Wayfare state
  colors. Carrier colors may remain inside factual carrier identity only.
- Composer focus uses a high-contrast 2px ink outline. Selected blue is reserved
  for genuine selection state and is never used as an input-focus color.
- Text and icons must meet WCAG AA contrast at their rendered size. Colored
  surfaces should normally retain black text in light mode.

## 4. Typography

**Host Grotesk Variable** is the sole Wayfare product typeface. It is used by
the website and repository-owned MCP Apps. System monospace is reserved for
code, identifiers, and developer examples.

Recommended hierarchy:

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Display | `clamp(3rem, 7vw, 6.5rem)` | 600 | 0.94–1.02 | `-0.055em` |
| Section title | `clamp(2rem, 5vw, 4.5rem)` | 600 | 0.98–1.06 | `-0.045em` |
| Card title | `1.125–1.5rem` | 600 | 1.1 | `-0.025em` |
| Body | `0.95–1.05rem` | 400–500 | 1.5–1.65 | normal |
| Label | `0.75–0.875rem` | 600–650 | 1.2 | `0–0.04em` |

- Use sentence case. Uppercase is allowed only for compact machine-like facts
  such as airport codes, not as a substitute for hierarchy.
- Keep headlines decisive and compact. Avoid a one-word final line when a
  balanced wrap is possible.
- The homepage hero H1 uses weight 500 and remains on one line from tablet
  widths upward. It may wrap naturally on narrow mobile screens.
- Prices, dates, durations, and route facts use tabular numerals where visual
  comparison matters.
- Do not mix another sans-serif into product UI.

## 5. Shape and layout language

### Interactive geometry

- Every text button, chip, and chat input/composer is fully rounded
  (`border-radius: 999px`).
- Icon-only controls are circular and at least `44 × 44px`.
- Standard fields that are not the conversational composer may use a 10–14px
  radius; their associated actions remain pills.
- The header currency selector uses a compact pill trigger and a white,
  softly elevated popover. Every option pairs a local country or region flag
  with the three-letter currency code and the full country or region name;
  never fall back to a browser-native select menu. Use `#66CCFF` only for the
  selected row, a solid Heroicons checkmark for confirmation, and the neutral
  surface for keyboard or pointer focus. Support arrow keys, Home, End, Enter,
  Space, Escape, outside-click dismissal, and focus restoration.
- Content cards use restrained 14–24px radii. Do not turn every container into
  a pill.
- Pointer and keyboard targets are at least 44px in both dimensions.

### Jet-window visual device

Destination imagery uses the Wayfare jet-window silhouette: a tall aperture
with an arched top, softened bottom, and pale structural surround. It is a
reusable brand device for places and inspiration—not a universal card shape.

- Keep destination names and descriptors horizontally centered.
- Center the caption block within the crop-safe lower interior area so text is
  not clipped by the curved frame.
- Use a lower scrim strong enough for white copy without hiding the place.
- Preserve place-specific focal points through responsive `object-position`.
- On narrow screens, use a horizontal, snap-aligned journey rather than
  shrinking captions below readable size.

### Composition

- One primary conversational start per page.
- Keep the homepage hero compact enough that the next journey section enters
  the first desktop viewport. Photography supports the prompt; it does not
  dominate the page.
- The homepage hero contains one visible message only: the H1 promise. Do not
  add an eyebrow, supporting paragraph, example sentence, or competing callout
  over the jet-window image.
- The primary header contains the Wayfare lockup, currency selector, and menu
  control only. Planning, developer, support, settings, and legal navigation
  live inside the menu. Do not add a separator line below the header.
- The menu is a white, softly elevated sheet with a 24px outer radius, a compact
  title, and a 20px Heroicons close glyph inside a 44px circular target. Its
  primary action is a black pill. Secondary navigation uses unboxed text rows
  divided by neutral hairlines; legal availability is a quiet group at the
  bottom. Use selected blue only for keyboard focus. On mobile, the same menu
  becomes a full-width rounded bottom sheet.
- Directly below the homepage hero, use one spacious endorsement-style
  attribution row: `Built on`
  with the official Noodle Seed wordmark and `Powered by` with the official
  Nuitée wordmark. Keep both marks one-color black, optically balanced, and
  secondary to the composer. Do not repeat this attribution in the footer.
- After the partner attribution and before destination inspiration, show the
  approved six-capability overview: Flights, Hotels, Experiences, Loyalty,
  Vouchers, and Booking & trip care. Use a quiet three-by-two grid on desktop,
  two columns on tablet, and one column on mobile. Each item has one Heroicon,
  a title, and one concise description. It is passive orientation—not a set of
  cards—so do not add backgrounds, shadows, links, buttons, hover effects, or
  interactive animation. Capability glyphs may reuse the restrained liquid
  WebGL field inside the Heroicon silhouette, with a static Heroicon fallback
  for reduced-motion and unavailable-WebGL environments. Include one subdued
  provenance note distinguishing provider-backed live flight results from
  clearly labeled Wayfare demo data. Keep that note on one line when a desktop
  viewport has room; allow natural wrapping on tablet and mobile.
- The footer is a restrained two-part close: a one-color Wayfare lockup and
  tagline opposite only configured developer, support, and legal links, then a
  quiet copyright row separated by a neutral hairline. Hide unconfigured legal
  links. Do not show guest-session instructions, setup statuses, planning
  caveats, or repeat the partner attribution in the footer.
- No pre-conversation mode picker or parallel booking dashboard.
- Tools and MCP Apps appear in chronological context with useful text fallback.
- Ask only for information required for the next safe action.
- Use generous whitespace and strong alignment; avoid decorative panel stacks.

## 6. Iconography

**Heroicons is the only functional product icon library.** This applies to the
Next.js product and every repository-owned MCP App.

- Import from `@heroicons/react/24/outline` by default.
- Use `@heroicons/react/20/solid` only for compact status emphasis.
- Use `currentColor`; state color comes from the parent.
- Default visual size is 20px; compact supporting icons may be 18px.
- Decorative icons use `aria-hidden="true"`; icon-only buttons have an
  explicit accessible name.
- Do not use Lucide, inline utility SVG, CSS-drawn interface icons, Unicode
  symbol stand-ins, or invented icons for unsupported capability.
- The Wayline logo is the only repository-authored SVG exception. Official
  third-party identity marks may be used only for truthful attribution; they
  are brand assets, never controls or functional iconography. Country flags are
  locale symbols and require country names in accessible text.

## 7. Motion system

Motion communicates activity, continuity, or a change of state. Idle UI stays
still.

### Editorial Wayline liquid shader

The large Wayline in the dark editorial feature uses a real WebGL fragment
shader clipped to the exact approved logo silhouette. This is Wayfare's one
ambient brand-motion exception; it must not be reused as generic interface
decoration.

- Render a slow liquid field using blue-hour blue (`#66CCFF`), deep ocean blue,
  restrained violet, and a small warm horizon reflection.
- Move the internal field only. The path, endpoints, position, scale, and
  surrounding editorial composition remain fixed.
- Keep the canonical SVG beneath the canvas as an immediate static fallback.
- Clip with the canonical Wayline mask; never approximate the shape in shader
  mathematics or substitute a generic wave.
- Cap device-pixel density at `1.5`, render only while the mark is near the
  viewport, and pause while the page is hidden.
- Do not introduce Three.js or another scene library for this single effect.
- Reduced motion, missing WebGL, shader compilation failure, or context loss
  must show the static blue-hour SVG gradient without an empty or flashing mark.

### Composer BorderBeam

The fully rounded composer uses a subtle BorderBeam only while the agent is
responding. Idle, empty, focused, and user-authored states remain static so
motion communicates active work rather than decorating the input.

- Duration: exactly `3.1s` per loop.
- Geometry: follow the complete pill perimeter.
- Visual treatment: a visible but restrained ocean line using the hero's
  blue-hour blue, teal, and violet family plus a soft, localized bloom along
  the lower edge.
- The input, placeholder, and controls remain static and readable.
- Idle and focused: no moving beam; focused composers use an ink-only outline.
- Error: static action-needed outline, no moving beam.
- Reduced motion: static neutral or ink outline, no loop or traveling bloom.

### Agent TextShimmer

Use TextShimmer only for the live label `Thinking…` while the agent is
preparing or streaming a response.

- Place the label in chronological conversation flow immediately after the
  latest traveler message and before incoming assistant content. Never place
  it against the composer.
- Render it slightly larger than supporting metadata using the legible
  blue-response token (`#2F7391`) with selected blue (`#66CCFF`) as the moving
  highlight.
- The label is a polite live-region announcement once, not on every animation
  frame.
- Stable answer text, user messages, prices, confirmations, and errors never
  shimmer.
- Remove the activity label when the response completes.
- Reduced motion renders ordinary response-blue text without shimmer.

### Idle composer typewriter

The empty homepage composer may type a short rotating set of supported trip
requests to demonstrate that natural language is accepted.

- Use concise, truthful examples such as `Tokyo in spring`, `A long weekend in
  New York`, `Return flights to London`, and `Three nights in Lisbon`.
- Type at approximately 55ms per character, hold the complete prompt for
  approximately 1.8 seconds, erase faster at approximately 28ms per character,
  then pause briefly before the next prompt.
- Stop and hide the animation immediately when the composer receives focus,
  the traveler types, submission begins, or an error needs attention.
- Keep the rotating copy `aria-hidden`; the textarea retains the stable
  accessible name `Ask the travel assistant`.
- Reduced motion shows the first complete example statically with no cycling or
  blinking cursor.

### Timing and easing

- Hover and focus feedback: `120–180ms`.
- Sheets, disclosures, and state transitions: `180–280ms`.
- Prefer opacity and transform. Do not animate layout dimensions when an
  equivalent non-layout effect exists.
- Motion is interruptible and never steals or loses keyboard focus.

### Composer state contract

| State | Border | Agent status | Accessibility |
| --- | --- | --- | --- |
| Empty homepage | Static neutral | None | Ready for input |
| Focused and empty | Static ink | None | Visible focus remains |
| Focused with text | Static ink | None | Visible focus remains |
| Submitting | BorderBeam active | `Thinking…` begins after the user message | Announce once |
| Responding | BorderBeam active | `Thinking…` stays before assistant content | Stable streamed answer |
| Complete | Static neutral | Removed | Predictable focus |
| Error | Static action-needed | Plain actionable error | No shimmer |

## 8. Imagery

Photography should feel observed, atmospheric, and place-specific. It creates
curiosity without implying inventory, partnership, price, or availability.

- Favor honest city texture, landscapes, transit moments, and changing light.
- Destination-card masters use portrait-first `3:4` composition, crisp local
  detail, and confident natural contrast. Keep the landmark readable in a
  narrow jet-window crop and reserve enough darker detail in the lower quarter
  for centered white captions. Avoid gray haze, muddy midtones, artificial HDR,
  oversaturation, or generic postcard framing.
- Present hero photography in its natural color. Do not apply a full-frame
  black veil, hue shift, desaturation, or darkening filter. Compose naturally
  dark imagery behind light copy; do not manufacture contrast with text shadow.
- The homepage hero may separate a fixed transparent jet-cabin foreground from
  an outside panorama. On fine pointers, move only the panorama by no more than
  12px to suggest looking through the windows. Touch and reduced-motion
  presentations remain static.
- Avoid airline liveries, provider logos, staged luxury, passport-and-suitcase
  collages, over-processed stock imagery, and decorative map graphics.
- Always maintain asset provenance and licensing records.
- The bundled Noodle Seed and Nuitée attribution wordmarks remain unmodified
  official assets. Their inclusion requires owner review of trademark and
  public-distribution rights before this starter is released publicly.
- An image caption describes inspiration; it does not make a commercial claim.
- Loading states use neutral, reduced-motion-safe skeletons. Image failure must
  preserve legible destination text.

## 9. Voice and conversation

Wayfare sounds direct, calm, specific, and transparent. It helps users compare
real tradeoffs without fake enthusiasm, vague apology, or urgency theater.

Use:

- “I found three current fares that fit your dates.”
- “The lower fare has one stop. The nonstop option is £84 more.”
- “That price changed. Review the new total before continuing.”

Avoid:

- “Amazing! I found the perfect dream trip!”
- “Oops, something went wrong.”
- “Book now before it’s gone!”

Copy rules:

- Name what happened, what is known, and what the user can do next.
- Label illustrative data every time it could be mistaken for live inventory.
- Use “selected” before verification and “confirmed” only after the relevant
  action completes.
- Never imply booking, redemption, voucher issuance, payment, or protection
  purchase where that capability is unavailable.
- Prefer one clear next action over a row of speculative choices.

## 10. Accessibility and responsive behavior

- Meet WCAG AA color contrast and preserve meaning without color.
- Support keyboard navigation, visible focus, semantic landmarks, accessible
  names, and useful live-region behavior.
- Respect `prefers-reduced-motion: reduce` everywhere.
- Preserve function at 200% text zoom, 320px viewport width, and touch target
  sizes of at least 44px.
- Keep the product light even when `prefers-color-scheme: dark` is active.
- Avoid horizontal page overflow. Purposeful destination carousels may scroll
  within their own labelled region.

## 11. Implementation contract for coding agents

Before designing, implementing, or reviewing a new or changed user-facing
capability, a coding agent must read this document in full and cite it in the
task plan or implementation notes.

The following are non-negotiable unless the user explicitly approves a
deviation:

- exact Wayline geometry;
- Host Grotesk Variable;
- approved light-only tokens;
- Heroicons-only functional iconography;
- pill buttons and composer, circular icon controls;
- centered crop-safe jet-window captions;
- state-bound BorderBeam and activity-only TextShimmer;
- editorial-only liquid WebGL Wayline with a static reduced-motion fallback;
- idle-only, reduced-motion-safe homepage typewriter prompts;
- quiet header navigation and the approved partner attribution row;
- chat-first composition and truthful conversational copy; and
- accessibility and reduced-motion behavior.

A document decision is not implementation proof. Completion requires source,
unit, browser, accessibility, visual, and MCP App validation at the relevant
boundary.

## 12. Brand review checklist

Before shipping a user-facing capability, confirm:

- [ ] The capability begins or continues naturally in conversation.
- [ ] Logo, typography, tokens, radii, and icons match this contract.
- [ ] Selected, confirmed, and action-needed states are semantically correct.
- [ ] Every button is a pill or a circular icon control.
- [ ] Agent activity and composer motion follow the state contract.
- [ ] Reduced motion, keyboard use, 200% zoom, and mobile work.
- [ ] A dark operating-system preference still renders the approved light theme.
- [ ] Images have provenance and do not imply unavailable inventory.
- [ ] Copy distinguishes live, illustrative, selected, and confirmed data.
- [ ] The implementation was visually inspected, not only snapshot-tested.
