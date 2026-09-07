# Wayfare two-city experience preview

Status: approved visual contract and implemented local branch slice

## Implementation record

- Visual contract: approved in the standalone prototype.
- Data contract: implemented as deterministic fictional Lisbon and Tokyo
  fixtures with explicit unsupported-destination and filtered-empty outcomes.
- Widget: implemented with result, compare-two, detail, loading, empty, and
  malformed/error states; comparison is local presentation state only.
- Server exposure: registered only in the expanded travel demo profile as a
  read-only capability. The starter profiles are unchanged.
- Agent guidance: the TypeScript product guide now covers context reuse,
  fictional provenance, unsupported destinations, and the no-booking boundary.
- Verification: tracked through focused contract, widget, browser, and server
  tests. Full project and Noodle lifecycle checks remain the final branch gate.

## Funnel boundary

ChatGPT helps a traveler discover, compare, and ask about fictional Wayfare
experience ideas for Lisbon or Tokyo. No experience is saved, held, booked, or
paid for, and there is no external handoff in this preview.

## User and job

A traveler who already has a destination and approximate stay dates wants a
small, useful set of activities without filling in a separate search form.

The visual UI earns its place by making schedule, duration, price, neighborhood,
accessibility, and cancellation differences scannable. A text-only host still
receives the same bounded facts and can continue the conversation.

## Capability

`search_experiences`

- Takes destination, stay date range, participant quantities, display currency,
  and optional interests or accessibility filters.
- Returns a supported-destination flag, bounded fictional experience summaries,
  a visible `WAYFARE_DEMO` disclosure, and a normal empty reason for unsupported
  destinations.
- Does not accept or create a trip selection in the preview phase.

## Widget

`ExperienceComparison`, inline by default.

- Results: three compact cards with category, duration, area, next sample time,
  accessibility note, cancellation summary, and fictional per-person price.
- Compare: local presentation state for at most two results. Selected items
  appear as compact thumbnail cards in the footer before comparison opens.
- Detail: one focused result with schedule, meeting area, inclusions,
  restrictions, and an “Ask about this” conversational action.
- Deliberately excludes fullscreen, picture-in-picture, checkout, saved state,
  and an “Add to trip” action.
- Each card keeps its detail action bottom-aligned and full width so cards with
  different copy retain one consistent action rhythm.
- The card rail uses arrow, keyboard, and touch carousel navigation without a
  visible native scrollbar. The comparison action is a contained full-width
  footer row below its two thumbnail cards.
- Every Lisbon and Tokyo card uses a different bounded photograph from
  Unsplash. The deterministic Wayfare gradient remains underneath each image
  and becomes the visible fallback when an image cannot load. Photographs
  establish city atmosphere; they do not depict the fictional operators or
  promise a specific activity.
- Result-card photographs use a 190px band. Edge-only shading protects the
  overlaid comparison control, category, and credit while leaving the center of
  each photograph visibly clear. The comparison footer keeps selected cards on
  the left and its action on the right, then stacks without overflow on narrow
  hosts.
- The comparison screen repeats each selected experience photograph above its
  fact table and keeps “Back to results” explicitly left-aligned.

## Image provenance

- Alfama, Lisbon: Colin + Meg, Unsplash,
  <https://unsplash.com/photos/MJEAR06oAko>.
- Tagus, Lisbon: Abigail Prowse, Unsplash,
  <https://unsplash.com/photos/z72mX-esrC8>.
- Belém, Lisbon: gemmmm, Unsplash,
  <https://unsplash.com/photos/BWmtnSBbBuk>.
- Yanaka, Tokyo: Michael Wu, Unsplash,
  <https://unsplash.com/photos/NsH4kE9zocY>.
- Sumida, Tokyo: Taro Ohtani, Unsplash,
  <https://unsplash.com/photos/stMdbuD1Rh8>.
- Tea and design, Tokyo: Emile Guillemot, Unsplash,
  <https://unsplash.com/photos/B_6CSQqgvHE>.

The widget requests resized images only from `https://images.unsplash.com`,
which is the sole additional experience-widget resource origin.

## States

- Loading: stable card-shaped skeletons.
- Success: three bounded results.
- Empty: unsupported destination is a normal catalog boundary.
- Error: the fictional catalog could not be read; no result is invented.
- Detail and compare: derived only from the current result set.

## Grounding and trust

- All preview content is authored fictional `WAYFARE_DEMO` data.
- Operator names, prices, capacity, availability, policies, and meeting points
  are illustrative and must never be described as live provider facts.
- No Nuitee Experiences endpoint is called.
- The eventual server result, not browser state, owns selectable identifiers and
  all facts used by the model.

## Product-guide decision

The two-city capability is covered by the TypeScript Wayfare product guide
because the agent must preserve trip context, disclose fictional provenance,
handle unsupported destinations as a normal empty state, and avoid booking
claims. Generated product-skill artifacts are deliberately unchanged; changing
those requires its separate governed regeneration workflow.

## Deliberately not implemented

- Live experience-provider discovery or authoritative inventory.
- Saving an experience into the trip-review state.
- Holds, admission checks, checkout, payment, booking, or cancellation actions.
- More destinations, pagination, or a hotel-style multi-page result carousel.

For this bounded three-result catalog, the existing card carousel supplies
navigation when the viewport cannot show every card. A larger live catalog
would require a separate pagination and ranking design rather than silently
expanding this demo contract.

## Approval questions answered by the preview

1. Is a three-card inline experience useful inside the conversation?
2. Are the facts on each card sufficient without becoming visually dense?
3. Is compare-two valuable, or should details be the only secondary path?
4. Does “Ask about this” provide the right non-transactional next step?
5. Is the fictional-source disclosure visible without dominating the UI?
