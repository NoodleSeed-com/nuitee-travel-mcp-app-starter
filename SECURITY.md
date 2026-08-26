# Security policy

## Supported boundary

This starter supports read-only flight discovery and fare verification. It does not support prebooking, booking, reservations, passenger data, payment, cancellation, refund, loyalty transactions, or end-user credential collection.

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

Tools cannot select a URL, base, origin, path, method, or header. Widgets have no external connection domain and call Noodle tools only. FlightResults may load a validated airline image from `https://sandbox.nuitee.flights` or `https://production.nuitee.flights`; it uses no-referrer requests and rejects every other image origin/path. Loading that image still discloses ordinary request metadata such as the viewer's IP address and user agent to Nuitee's asset host, so deployments that do not accept that privacy tradeoff should disable remote carrier images and retain the text/initial fallback.

The starter claims no widget domain. Configure one real, dedicated HTTPS widget
origin for both widgets before registration with a host; never use a reserved or
placeholder domain to satisfy a target gate.

## Offer identifiers

Provider offer IDs are sensitive capability-like values even though they are not credentials. Search stores them only in caller-scoped private state with a 30-minute TTL. Public output contains an opaque application `selectionId`; verify rejects unknown/stale IDs before any provider call.

Do not add a raw `offerId` tool input, log state values, put provider IDs in widget/model context, or persist selections across callers/sessions.

## Provider data and failures

Provider responses are untrusted and bounded before public use. Public results cap itineraries and nested arrays, sanitize strings, omit raw responses/provider logos/arbitrary image URLs/internal fare codes, and classify errors through application-owned messages. The only image exception is a documented marketing-carrier image on an exact Nuitee Flights asset origin. A provider failure never activates fixtures.

The authored compute gateway has a 12-second/one-host-call limit. Flight search alone accepts up to 6 MiB at the connector and application boundaries before normalizing at most ten results; fare verification retains a 750,000-byte application cap. Operators should not broaden either limit without contract evidence and should monitor without logging raw bodies.

## Reporting a vulnerability

The repository owner must replace this section with a monitored private security contact before public release. Until then, use GitHub's private vulnerability reporting feature if enabled for the repository. Do not open a public issue containing exploit details, secrets, provider IDs, customer data, or production URLs.

Include a concise impact statement, affected revision, safe reproduction steps, and whether a credential might be exposed. Do not test against live provider inventory or other users without written authorization.

## Release blocker

A final reporting contact, copyright/NOTICE and owner/legal dependency-license and provenance review, corrected reproducible generated examples, the remaining caller-state lifecycle proof, and named-host UI evidence are required before public release. The automated history, exact-binary-review, generated-guidance, package-metadata, and advisory checks must be repeated from the final release commit.
