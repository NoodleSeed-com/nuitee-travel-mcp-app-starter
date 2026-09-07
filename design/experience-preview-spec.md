# Wayfare two-city experience preview

Status: visual prototype only; no runtime capability is implemented

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

## Proposed capability

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

The eventual two-city capability should be covered by the Wayfare product guide
because the agent must preserve trip context, disclose fictional provenance,
handle unsupported destinations as a normal empty state, and avoid booking
claims. This visual preview does not change the current guide.

## Approval questions answered by the preview

1. Is a three-card inline experience useful inside the conversation?
2. Are the facts on each card sufficient without becoming visually dense?
3. Is compare-two valuable, or should details be the only secondary path?
4. Does “Ask about this” provide the right non-transactional next step?
5. Is the fictional-source disclosure visible without dominating the UI?
