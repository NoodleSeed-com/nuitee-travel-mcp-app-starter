# Wayfare travel companion

## Purpose

Wayfare is an example project by Noodle Seed. Its expanded profile demonstrates
one shared travel server supporting a single conversational journey across
current flights and stays, fictional experiences, illustrative rewards, and
travel-protection concepts. Wayfare is the example product identity; Noodle Seed
is its author and MCP/assistant foundation. The normal starter entry points
remain available.

The evidence boundaries are explicit:

- Flight search and fare verification use the existing Nuitee Flights
  connector and normalization path.
- Stay results use the Nuitee hotel connector in live/embedded profiles. The
  credential-free preview uses deterministic synthetic stays. Neither reserves
  inventory or completes a booking.
- Experience discovery uses a deterministic fictional catalog for Lisbon and
  Tokyo in every expanded profile. Prices, operators, slots, capacity, and
  accessibility statements are examples; no live experience source is queried.
- Rewards balances, status, benefits, and trip estimates are synthetic and
  illustrative. No real account is accessed and no points are earned or
  redeemed.
- Travel-protection results are exactly three deterministic fictional concepts.
  They are not quotes, policies, recommendations, coverage guarantees, or
  eligibility decisions; no insurer or live insurance source is contacted.
- A live flight failure remains a live flight failure. It is never replaced by
  a hotel, rewards, insurance, or flight fixture.

## Shared implementation

The normal entry points remain unchanged:

- `src/server.ts`
- `src/live-server.ts`
- `src/embedded-server.ts`

The expanded profile uses dedicated entry points that call the same
`createTravelServer()` factory. It does not copy the flight tools, schemas,
connectors, normalization, or widgets.

## Companion website

The Wayfare website presents flights, stays, experiences, rewards, and travel protection as
one planning conversation. Its neutral homepage offers one natural-language starting composer.
The agent selects among tools registered in the active profile instead of asking
the traveler to choose a capability first. Flights and stays are provider-backed in the expanded live profile. Preview
stays, experiences, rewards, and travel protection are illustrative.

The established Wayfare route mark, palette, hero artwork, destination cards,
and editorial layout remain the active brand system. The three-part Flight →
Stay → Rewards review story explains the wider capability without introducing
a second implementation.

The compact trip summary uses validated structured facts, never conversation
prose. The separate trip review is selection-driven: it resolves application-issued
flight and hotel selections without adding fictional experience comparisons.

## Conversational surface

The expanded profile adds these model-visible read-only tools:

- `search_hotels` — reads bounded current Nuitee stays in live/embedded profiles
  and fictional properties in the preview profile for supported
  fixture destinations and returns an honest empty result elsewhere.
- `search_experiences` — returns fictional Lisbon/Tokyo ideas for exact stay
  dates and party size, with explicitly requested interest/accessibility filters.
  Unsupported destinations produce an honest empty catalog result.
- `open_loyalty` — opens a fixed synthetic rewards profile and benefits view.
- `compare_reward_flights` — shows bounded illustrative reward-flight ideas
  within a points budget.
- `compare_travel_insurance` — compares exactly three deterministic,
  source-labelled travel-protection concepts from trip context. It does not
  accept or expose health, identity, payment, policy, insurer, or purchase
  fields.
- `review_trip` — resolves current application-issued flight and stay
  selections server-side and shows a source-separated trip review.

It also adds one App-only helper:

- `select_hotel` — remembers an opaque stay selection for the current caller.

No tool books, reserves, pays, redeems, transfers, changes, cancels, purchases
coverage, checks eligibility, contacts an insurer, or accesses a real customer
account.

## Widgets and state

The profile reuses `TravelHome` and `FlightResults`, and adds:

- `HotelResults` for current or illustrative stay comparison and selection;
- `ExperienceResults` for fictional ideas, detail, two-item comparison, and
  follow-up conversation, with no saving or booking;
- `LoyaltyOverview` for the synthetic balance and benefits;
- `RewardFlightResults` for illustrative points comparisons;
- `TripReview` for the selected flight and stay; and
- `InsuranceResults` for a read-only, three-card travel-protection comparison
  with persistent disclosure and no action controls.

Hotel selections use application-issued opaque identifiers in caller-scoped,
expiring server state. Flight selections continue to use their existing state
handle. `review_trip` reads those handles and never accepts prices, balances,
member IDs, or provider offer IDs from the model or browser. Travel protection
is deliberately stateless: it has no select, add-to-trip, quote, checkout, or
purchase flow. Experience inspection and comparison are widget view state, not
server-side trip selections. The experience tool makes no provider request; its
fixed decorative Unsplash photos use the declared resource-only CSP and do not
represent real operator inventory.

## Brand and data disclosure

Wayfare is the example travel project by Noodle Seed. Its product identity
follows the [Wayfare brand guidelines](brand/wayfare-brand-guidelines.md). The active route mark is
implemented in `apps/web/src/components/wayfare-mark.tsx`. The standard and
full-bleed landings share their active core hero catalog from
`apps/web/src/lib/travel-hero-content.ts`, including the three-window Explore,
split-cockpit Flights, Stays, Flight + Stay, and Insurance masters. Provenance
and review evidence are recorded in
`docs/visual-assets/wayfare-premium-concierge.md`.

Persistent disclosure:

> In live profiles, flights and stays come from Nuitée. Experiences, rewards,
> and travel protection are fictional examples; preview stays are illustrative
> too. Booking, redemption, and policy purchase are unavailable.
