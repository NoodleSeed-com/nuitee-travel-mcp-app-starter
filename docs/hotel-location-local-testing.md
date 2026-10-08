# Hotel location constraints: local testing

Branch: `fix/hotel-location-constraints`. This change stays local until reviewed.

## Behavior

- Without `near` (or with `near: null`), hotels retain the existing city-wide request, provider order,
  and result limit. No proximity filtering is applied.
- With `near.landmark`, the server resolves a unique provider place in the
  requested city and verifies its country and coordinates. It searches rates
  around that location, then removes candidates outside the search area and
  candidates without coordinates. The same remaining hotels populate the
  cards, model response, and selectable caller state.
- A walking limit scopes **candidate discovery only**: 80 meters per requested
  minute, capped at 10 km. A landmark without a walking limit uses a 1.5 km
  discovery area. These are straight-line search areas, never measured walking
  routes or proof that a hotel meets a walking-time requirement. The provider
  request has a minimum 1 km radius; the server applies the smaller candidate
  area afterward when necessary.
- Ambiguous, missing, wrong-country, or incomplete landmark evidence fails
  without silently substituting a city-wide search.
- A redundant city suffix in a formal landmark name is removed from the
  autocomplete query only. The original requested constraint is retained, and
  the returned place still needs matching city and country evidence. For
  example, “Yale Club of New York City” searches for “yale club, New York, US.”
- Cards show the requested landmark, walking limit, resolved search center,
  straight-line distance, and “Walking time unverified.” Named-hotel inspection
  preserves this evidence.
- The assistant uses the same returned candidates and does not create a
  separate proximity shortlist or invented walking-minute ranges. Explicit
  price comparisons use returned price metadata, distinguish unknown tax
  inclusion, and never label an unverified candidate the cheapest qualifying
  hotel.
- The credential-free fictional profile cannot resolve real landmarks; it
  reports that limitation instead of presenting fictional city-wide stays as
  matches.

Verified walking eligibility still requires a walking-route integration. This
branch implements location-scoped discovery and truthful presentation; it does
not add that integration or claim measured walking times. Provider place lookup
and scoped rates were exercised with the public Yale Club query during local
debugging. The long formal-name query returned no autocomplete candidates,
while the shortened query resolved the landmark and returned nine nearby stays.
Synthetic tests preserve that query behavior without live requests.

Provider contracts: [place search](https://docs.liteapi.travel/reference/get_data-places),
[place details](https://docs.liteapi.travel/reference/get_data-places-placeid),
and [hotel rates](https://docs.liteapi.travel/reference/post_hotels-rates).
The UI follows the [Wayfare brand guidelines](brand/wayfare-brand-guidelines.md).

## Local conversation test

Use your existing local Nuitee and operator-provided model configuration; keep
credentials server-side. Start the branch's expanded assistant:

```sh
pnpm install --frozen-lockfile
pnpm dev:demo:embedded
```

The local server prints a process-local public Embed ID and service origin.
Use those public coordinates for the website's local
`NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID` and `NEXT_PUBLIC_NOODLE_SERVICE_URL`, then
start `pnpm dev:web` in another terminal. Restart the website if those public
coordinates change. Preserve your hosted website configuration.

**A local website pointing at the hosted assistant will keep using the hosted
tools and instructions. It will not exercise this branch's MCP changes.**

Test the original sequence:

1. “I want a hotel near Yale Club in New York, maximum 20 minutes walk.”
2. “Show me for next week.”
3. Inspect the cards and ask “Which has the lowest displayed price?”
4. Ask to open a returned hotel by name.

Expected: the landmark survives the date-only reply; results identify the
requested limit but explicitly say walking times are unverified. Nearby
candidates and prose refer to the same returned set. A distant Downtown hotel
cannot pass the server's search-area check. A failed location lookup explains
the issue instead of replacing it with broad New York results. Opening a hotel
retains the location evidence.

Start a **new trip**, then ask “Show hotels in New York for next week.”
Expected: the normal city-wide search and carousel, with no location filtering.
A date-only follow-up in the original trip intentionally retains the original
landmark constraint; ask to remove it explicitly when broadening that trip.

## Automated checks

```sh
pnpm ci:offline
pnpm check:browser
pnpm exec noodle validate src/demo-embedded-server.ts --json
pnpm exec noodle check src/demo-embedded-server.ts --target embedded-assistant --json
```

Tests cover constrained and unconstrained results, missing/ambiguous landmark
lookup, formal-name city suffixes, null location inputs, wrong country, coordinate availability, no broad fallback, isolated
compute execution, tax uncertainty, mixed currencies, named-hotel reopening,
and mobile candidate disclosure through inspection. They use fictional data
and make no live hotel or model requests.
