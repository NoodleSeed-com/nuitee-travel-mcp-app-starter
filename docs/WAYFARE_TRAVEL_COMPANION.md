# Wayfare travel companion

## Purpose

The expanded Wayfare profile demonstrates one Noodle travel server supporting
a single conversational journey across current flights, illustrative stays,
and illustrative rewards. It preserves the canonical Wayfare identity and the
normal starter entry points.

The evidence boundaries are explicit:

- Flight search and fare verification use the existing Nuitee Flights
  connector and normalization path.
- Stay results are deterministic synthetic fixtures, not live rates,
  availability, or reservations.
- Rewards balances, status, benefits, and trip estimates are synthetic and
  illustrative. No real account is accessed and no points are earned or
  redeemed.
- A live flight failure remains a live flight failure. It is never replaced by
  a hotel, rewards, or flight fixture.

## Shared implementation

The normal entry points remain unchanged:

- `src/server.ts`
- `src/live-server.ts`
- `src/embedded-server.ts`

The expanded profile uses dedicated entry points that call the same
`createTravelServer()` factory. It does not copy the flight tools, schemas,
connectors, normalization, or widgets.

## Companion website

The Wayfare website presents flights, stays, and rewards as one planning
conversation. Its neutral homepage offers three accessible entry points:
search flights, compare stays, and explore rewards. All three start the same
assistant experience.

The established Wayfare route mark, palette, hero artwork, destination cards,
and editorial layout remain the active brand system. The three-part Flight →
Stay → Rewards review story explains the wider capability without introducing
a second implementation.

The compact trip summary is selection-driven. It appears only after an
application-issued flight or hotel selection and may then combine those
server-owned selections for review.

## Conversational surface

The expanded profile adds these model-visible read-only tools:

- `search_hotels` — compares bounded fictional properties for supported
  fixture destinations and returns an honest empty result elsewhere.
- `open_loyalty` — opens a fixed synthetic rewards profile and benefits view.
- `compare_reward_flights` — shows bounded illustrative reward-flight ideas
  within a points budget.
- `review_trip` — resolves current application-issued flight and stay
  selections server-side and shows a source-separated trip review.

It also adds one App-only helper:

- `select_hotel` — remembers an opaque stay selection for the current caller.

No tool books, reserves, pays, redeems, transfers, changes, cancels, or
accesses a real customer account.

## Widgets and state

The profile reuses `TravelHome` and `FlightResults`, and adds:

- `HotelResults` for illustrative stay comparison and selection;
- `LoyaltyOverview` for the synthetic balance, benefits, and trip review; and
- `RewardFlightResults` for illustrative points comparisons.

Hotel selections use application-issued opaque identifiers in caller-scoped,
expiring server state. Flight selections continue to use their existing state
handle. `review_trip` reads those handles and never accepts prices, balances,
member IDs, or provider offer IDs from the model or browser.

## Brand and data disclosure

Wayfare is the repository's fictional sample brand. The active route mark is
implemented in `apps/web/src/components/wayfare-mark.tsx`, and the active hero
is `apps/web/public/images/wayfare-hybrid-hero-v2.jpg`. Provenance and review
evidence are recorded in `docs/visual-assets/wayfare-premium-concierge.md`.

Persistent disclosure:

> Flight results come from the connected flight provider. Stays and rewards
> are illustrative previews. Booking and redemption are unavailable.
