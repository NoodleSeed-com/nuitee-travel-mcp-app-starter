# Flight Catchers travel companion demo

## Purpose

This private demo profile proves that one Noodle travel server can support a
single conversational journey across current flights, synthetic stays, and an
illustrative loyalty experience. It is intentionally separate from the public
Wayfare starter profile.

The profile must preserve these evidence boundaries:

- Flight search and fare verification use the existing Nuitee Flights
  connector and normalization path.
- Stay results are deterministic synthetic fixtures. They are not live rates,
  availability, or reservations.
- Loyalty balances, status, benefits, and trip estimates are synthetic and
  illustrative. No real account is accessed and no points are earned or
  redeemed.
- A live flight failure is shown as a live flight failure. It must never return
  a stay, loyalty, or flight fixture as a substitute.

## Entry points and shared implementation

The normal entry points keep their existing capability surface:

- `src/server.ts`
- `src/live-server.ts`
- `src/embedded-server.ts`

The demo uses dedicated entry points that call the same
`createTravelServer()` factory with a compile-time demo profile. The demo must
not copy flight tools, schemas, connectors, normalization, or widgets.

## Conversational surface

The demo profile adds these model-visible read-only tools:

- `search_hotels` — compares bounded fictional properties for supported
  fixture destinations and returns an honest empty result elsewhere.
- `open_loyalty` — opens a fixed synthetic rewards profile and benefits
  overview.
- `compare_reward_flights` — shows bounded illustrative reward-flight ideas
  within a points budget. A route and date are optional so “what can these
  points cover?” remains a useful conversational request.
- `review_trip` — resolves current application-issued flight and stay
  selections server-side and shows an illustrative points-and-cash summary.

It also adds one App-only helper:

- `select_hotel` — remembers an opaque stay selection for the current
  caller so the trip review never trusts a model-copied hotel name or price.

No tool books, reserves, pays, redeems, transfers, changes, cancels, or accesses
a real customer account.

## Widget surface

The demo reuses `TravelHome` and `FlightResults`, and adds:

- `HotelResults` — synthetic stay comparison with an accessible bounded
  carousel, stable skeleton geometry, local detail expansion, and a
  non-transactional selection action.
- `LoyaltyOverview` — synthetic balance, tier, benefits, progress, and an
  illustrative selected-trip review. It has no redeem or payment action.
- `RewardFlightResults` — a non-circular comparison carousel showing
  illustrative points, estimated taxes, remaining balance, route, and travel
  shape. It has no booking or redemption action.

Every success, empty, loading, malformed, partial, and error state must provide
useful host text when linked views are unavailable. Controls must work at 280px,
have visible focus, use practical touch targets, respect reduced motion, and
avoid nested scrolling.

## Data and state

Synthetic fixture modules are pure, offline, bounded, and credential-free.
They do not read environment variables or call a network. Outputs carry
`dataSource: "illustrative"` and a visible disclosure.

Reward-flight ideas use the fixed illustrative profile balance of 42,500
points unless the traveler supplies another bounded budget. Missing route and
date values deliberately produce flexible ideas from the profile's Toronto
starting point. The values are not live award inventory, loyalty-program
rates, or redemption offers.

Hotel selections use application-issued opaque identifiers in a caller-scoped,
expiring server state handle. Flight selections continue to use their existing
state handle. `review_trip` reads those handles and never accepts prices,
balances, roles, member IDs, or provider offer IDs from the model or browser.

The review may show one selected flight and one selected stay. Live flight fare
provenance and synthetic stay provenance remain separate, and the UI must not
present their sum as a bookable package total.

## Product-guide decision

The private profile is guided because one conversation crosses live flights,
synthetic stays, illustrative rewards, reward-flight comparisons, and
server-owned selections. The guide routes “flights with these points” to the
illustrative comparison instead of refusing or invoking the live cash-fare
search, while preserving the no-booking and no-redemption boundary.

## Brand and asset boundary

Flight Catchers is a real brand supplied for this private demo. The branch may
use owner-provided artwork, but public redistribution remains blocked until the
repository records trademark and asset authorization.

Use the paper-plane mark for compact identity and live DOM text for the brand
name. Prefer the original transparent SVG or PNG; do not trace, regenerate, or
scrape a logo from a website. Bright cyan is decorative, while accessible deep
teal is used for controls and links.

Persistent disclosure:

> Flight results come from the connected flight provider. Stays and rewards
> are illustrative previews. Booking and redemption are unavailable.

## Release boundary

This demo profile is not automatically part of the public starter release.
Before merging it into a public branch, owners must approve:

- Flight Catchers trademark and asset redistribution.
- The fictional property names and illustrative rewards language.
- Whether demo entry points ship in the public repository.
- Updated security, fixture-safety, customization, and support documentation.
