# Wayfare Tribe stay UI port

Date: 2026-09-05. Target: PR #59 on `codex/tribe-widget-wayfare-local`.

This implementation completes the hotel-UI portion previously deferred from
`feat/tribe-widget-design-port`. The interaction model comes from
`NoodleSeed-com/tribe-tourism-hotel-mcp`; the visual and language contract is
the approved [`docs/brand/wayfare-brand-guidelines.md`](../../brand/wayfare-brand-guidelines.md).

## Product fit and user benefit

The target traveler is comparing several returned stays inside an ongoing
conversation. A widget is better than text because location, price, terms,
amenities, and match evidence must be scanned across multiple options while
the traveler retains an explicit selection. The smallest complete experience
is a bounded shortlist with list/map views, a maximum-three comparison tray,
and a comparison matrix. Existing rate details and selection remain in the
same chronological widget.

## Interaction and state contract

- Success: show list/map controls only when at least one stay has valid
  coordinates. The map includes an equivalent non-map hotel rail.
- Map unavailable: render a keyboard-accessible CSS location board; Mapbox is
  progressive enhancement and is never required to compare or select.
- Compare: allow up to three stays, require two before opening the matrix, and
  move focus to the new screen heading.
- Selection: keep every hotel card white. Only a pressed compare, map, or final
  selection button receives selected blue (`#66CCFF`). Default actions remain
  black and white.
- Loading, empty, malformed, provider-error, and selection-error behavior stay
  useful and truthful through the existing hotel widget states.
- Reduced motion disables map fades and animated map travel.

## Data and output boundary

Coordinates are optional but must occur as a valid pair. Synthetic fixtures
carry bounded city coordinates; live Nuitee content maps bounded latitude and
longitude when both are present. All comparison facts remain in the existing
structured result, and the existing `fallback` remains model-visible when the
widget cannot render. Mapbox tiles and presentation state never enter model
context.

## Capability boundary

This port does not add Tribe checkout, payment, reservation, or booking tools.
The existing `select_hotel` action records a choice only and continues to say
that nothing was held, reserved, booked, or paid. Existing product-agent-guide
coverage is sufficient because the hotel search, comparison, selection, and
transaction boundary are already defined; no new guide is installed.

## Verification

Unit tests cover coordinate pairing, live mapping, Mapbox style/CSP, fallback
map layout, compare-row logic, screen routing, and widget-boundary validation.
Browser tests cover 44px controls, list/map switching, neutral selected cards,
blue selected actions, focus movement, and comparison navigation. Completion
also requires `noodle validate --json`, `noodle test --json`, `noodle check
--json`, and visual inspection in Noodle Devtools.
