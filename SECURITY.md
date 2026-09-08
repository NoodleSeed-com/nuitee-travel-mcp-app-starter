# Security policy

## Supported boundary

Wayfare is an example project by Noodle Seed. It supports read-only flight discovery and fare verification, plus
hotel search and application selection in the expanded live/embedded profiles.
The preview profile is explicitly fictional. Expanded profiles also expose
fictional Lisbon/Tokyo experience discovery, detail, and comparison; no live
operator inventory, capacity, admission, or accessibility is verified. Experiences
cannot be saved to a trip, held, or booked. Rewards, reward flights and travel
protection are illustrative and do not access real accounts or sell products. It does not support prebooking, booking, reservations, passenger data, payment, cancellation, refund, loyalty transactions, or end-user credential collection.

Version one uses one deployment-owner Nuitee key. Multi-tenant credential brokering, per-user provider authorization, and customer-owned routing require a separate production architecture and threat model.

## Secrets

- `NUITEE_API_KEY` is a server-side Noodle managed secret injected as `X-API-Key` by the fixed connector.
- End users must never paste a Nuitee key into a conversation.
- Assistant-model credentials are optional, separate from the Nuitee key, and server-side only.
- Embedded-assistant backend client credentials remain in the authenticated embedding backend.
- Browser code receives no Nuitee/model/client secret; embedded mode gives it only a short-lived assistant session.
- `.env`, `.env.noodle`, and local `.env.*` variants are ignored; the intentionally tracked `.env.example` files contain only empty secret/config names and the non-secret localhost demo origin.

Never put secret values in source, fixtures, tests, snapshots, screenshots, prompts, widget data, tool results, errors, logs, generated artifacts, Git history, issues, or pull requests.

If a credential may have been exposed, revoke/rotate it at its owner, remove it from every active store, audit access, and treat Git-history cleanup as incident response rather than proof that the original credential is safe.

## Network authority

The live connector permits only:

- `POST https://api.liteapi.travel/v3.0/flights/rates`
- `POST https://api.liteapi.travel/v3.0/flights/verify`
- `POST https://api.liteapi.travel/v3.0/hotels/rates` (expanded live/embedded profiles)

Tools cannot select a URL, base, origin, path, method, or header. Widgets invoke business operations through Noodle tools. Optional hotel map
exploration uses the explicitly configured Mapbox integration and its declared
CSP domains; absent host/fullscreen/map configuration must retain a useful
textual comparison. Map use can disclose ordinary network metadata to Mapbox.
Audit the exact compiled CSP when enabling it in a host. FlightResults may load a validated airline image from `https://sandbox.nuitee.flights` or `https://production.nuitee.flights`; it uses no-referrer requests and rejects every other image origin/path. Loading that image still discloses ordinary request metadata such as the viewer's IP address and user agent to Nuitee's asset host, so deployments that do not accept that privacy tradeoff should disable remote carrier images and retain the text/initial fallback.

The experience tool runs solely against the bundled fictional catalog and
makes no provider HTTP call. Its widget may load fixed decorative photography
from `https://images.unsplash.com`, as declared by its resource-only CSP; hotel
results may load provider images from `https://snaphotelapi.com`. These resource
requests disclose ordinary network metadata to the image hosts and do not
prove live inventory, an operator relationship, or booking support. Experience
inspection/comparison identifiers represent view state, not reservation tokens
or server-side trip selections.

The starter claims no widget domain. Configure one real, dedicated HTTPS widget
origin for the relevant widgets before registration with a host; never use a reserved or
placeholder domain to satisfy a target gate.

## Offer identifiers

Provider offer IDs are sensitive capability-like values even though they are not credentials. Search stores them only in caller-scoped private state with a 30-minute TTL. Public output contains an opaque application `selectionId`; verify rejects unknown/stale IDs before any provider call.

Do not add a raw `offerId` tool input, log state values, put provider IDs in widget/model context, or persist selections across callers/sessions.

## Provider data and failures

Provider responses are untrusted and bounded before public use. Public results cap itineraries and nested arrays, sanitize strings, omit raw
responses, arbitrary image URLs and internal fare codes, and classify errors
through application-owned messages. Allowed carrier and hotel imagery is bounded
to the explicit resource origins above. Experience photography is fixed widget
content, separate from provider output. A live provider failure never activates
fixtures; intentionally illustrative tools remain clearly identified as such.

The authored compute gateway has a 12-second/one-host-call limit. Flight search alone accepts up to 6 MiB at the connector and application boundaries before normalizing at most ten results; fare verification retains a 750,000-byte application cap. Operators should not broaden either limit without contract evidence and should monitor without logging raw bodies.

## Reporting a vulnerability

Report vulnerabilities privately to [asad@noodleseed.com](mailto:asad@noodleseed.com).
This is also the private contact for concerns under the
[community conduct policy](CODE_OF_CONDUCT.md). You may use GitHub's private
vulnerability reporting feature if enabled for the repository. Do not open a
public issue containing exploit details, secrets, provider IDs, customer data,
or production URLs.

Include a concise impact statement, affected revision, safe reproduction steps, and whether a credential might be exposed. Do not test against live provider inventory or other users without written authorization.

## Release blocker

Publish only the reviewed clean source export after its content/history,
exact-binary-review, reproducibility, dependency and advisory checks pass.
Distribution notices must be reviewed for the actual public artifact.
Hosted caller-state lifecycle and named-host UI evidence are required before
claiming production or host readiness, as specified in
[PUBLIC_RELEASE_CHECKLIST.md](PUBLIC_RELEASE_CHECKLIST.md).
