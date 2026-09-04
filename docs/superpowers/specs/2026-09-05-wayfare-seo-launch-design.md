# Wayfare SEO Launch Design

## Status

Approved in chat on 5 September 2026. This document records the approved
technical SEO, social-preview, canonical-host, and webmaster-registration
scope for `https://gowayfare.io` before implementation begins.

## Goal

Give Wayfare a complete, truthful search and social-sharing foundation: every
public page declares its canonical identity, indexable pages are discoverable,
private or duplicate experiences stay out of search, shared links render a
branded preview, and the domain is verified with Google Search Console and Bing
Webmaster Tools.

This work follows `docs/brand/wayfare-brand-guidelines.md` as the normative
visual and voice contract. It does not broaden Wayfare's current product claims.

## Current baseline

The live homepage publishes only `Wayfare` as its title and `One conversation.
The whole journey.` as its description. It has no canonical, Open Graph,
Twitter Card, or structured-data declarations. The live `/robots.txt`,
`/sitemap.xml`, and `/manifest.webmanifest` routes return `404`.

Both `https://gowayfare.io` and `https://www.gowayfare.io` serve the same page.
Fly redirects HTTP to HTTPS, but the `www` hostname does not redirect to the
approved apex hostname. All application routes currently inherit the root
indexing behavior, including conversational and experimental routes that should
not become search landing pages.

The isolated implementation worktree starts from `origin/main` at `6d540f8`.
Its scoped web baseline is green: 29 files and 242 tests pass. The repository-
wide baseline has one unrelated server-contract failure caused by the older
Noodle CLI's changed error envelope. That failure belongs to the separate
assistant-origin repair and must not be folded into this SEO change.

## Canonical domain and URL policy

`https://gowayfare.io` is the only canonical production origin.

- Fly continues redirecting HTTP requests to HTTPS.
- Requests to `https://www.gowayfare.io/:path*` receive a permanent redirect to
  `https://gowayfare.io/:path*`, preserving the path and query string.
- Every indexable page emits an absolute canonical URL on the apex origin.
- Sitemap entries use absolute apex-origin URLs only.
- Development and Fly-host URLs never appear in production metadata.

## Search-facing information architecture

The first sitemap contains these canonical pages:

| URL | Indexing | Search purpose |
| --- | --- | --- |
| `/` | index, follow | Primary Wayfare product and travel-planning experience |
| `/privacy` | index, follow | Public privacy policy and location-processing disclosure |
| `/terms` | index, follow | Public terms and service boundary |

`/developers` is excluded and marked `noindex, follow` because its current copy
calls itself a private partner preview and exposes repository setup detail rather
than durable public product documentation. `/experience` and `/experience/chat`
are excluded and marked `noindex, nofollow` because they are experimental and
conversation/session surfaces, not independent search destinations.

No destination, guide, or booking-intent landing pages are created in this
launch. Search Console data will inform a separate content strategy rather than
shipping thin pages without evidence.

## Metadata contract

Shared metadata is defined from one typed SEO configuration so titles,
descriptions, URLs, and image paths cannot drift.

- Site name: `Wayfare`
- Default title: `Wayfare — Plan your trip in one conversation`
- Title template: `%s | Wayfare`
- Homepage description: `Plan your trip in one conversation. Search current
  flights and compare clearly labelled travel options with Wayfare.`
- Canonical origin: `https://gowayfare.io`
- Locale: `en_GB`
- Open Graph type: `website`
- Twitter card: `summary_large_image`
- Theme color: `#FFFFFF`
- Accent/favicons: Wayfare Selected Blue `#66CCFF`

The privacy and terms pages retain their existing descriptions and add absolute
canonicals. Experimental and developer routes receive explicit robots metadata.
Metadata must not claim that Wayfare completes bookings, issues tickets, takes
payment, redeems rewards, sells insurance, or provides live hotel inventory.

## Social preview image

One deterministic 1200 by 630 pixel image serves Open Graph and Twitter.

The composition uses approved, repository-owned jet-window imagery with natural
colour and no black veil, hue shift, text shadow, artificial HDR, airline livery,
or provider branding. The exact Wayline mark and `Wayfare` wordmark are rendered
from repository-controlled assets rather than generated lettering. Host Grotesk
sets the message `One conversation. The whole journey.` The foreground and text
remain crop-safe inside the central social-preview safe area.

The asset is delivered as a static raster under the Next.js app metadata file
convention. Its dimensions, file type, and metadata references are tested. The
final image is shown to the user for visual review before it is committed with
the implementation.

## Crawl and install surfaces

Next.js metadata routes provide:

- `/robots.txt`: permits normal crawling, disallows experimental and chat
  routes, and declares `https://gowayfare.io/sitemap.xml`.
- `/sitemap.xml`: includes only canonical indexable routes and supplies honest
  `lastModified`, `changeFrequency`, and priority hints.
- `/manifest.webmanifest`: names Wayfare, uses the approved light-only colours,
  starts at `/`, and references the existing light-blue Wayline icon.

Robots rules are not used as a substitute for `noindex`: excluded HTML routes
also emit their own robots metadata so indexing intent remains explicit.

## Structured data

The homepage renders two JSON-LD nodes in a single `@graph`:

1. `WebSite` with the canonical URL, name, description, and publisher brand.
2. `WebApplication` describing Wayfare as a browser-based travel-planning
   application available in English.

The graph uses stable apex-origin `@id` values and references the canonical
favicon/brand image. It does not include fake reviews, ratings, offers, prices,
download requirements, social profiles, or a `SearchAction`. JSON is serialized
without allowing executable `<` content into the script element.

## Webmaster registration and submission

After the SEO changes are deployed and live:

1. Add a Google Search Console Domain property for `gowayfare.io` under the
   currently signed-in Google account.
2. Copy the Google ownership token into a DNS TXT record at the domain's GoDaddy
   DNS provider. Do not store the token in Git, screenshots, logs, or prompts.
3. Complete ownership verification, submit
   `https://gowayfare.io/sitemap.xml`, run live URL inspection for the homepage,
   and request indexing.
4. Import the verified property into Bing Webmaster Tools, which reuses Google
   verification, then confirm the sitemap is present and readable.

If account login, multi-factor authentication, or GoDaddy authorization is not
already available, automation pauses at that authentication boundary for the
user. Search-engine reporting may take days to populate; registration success
is not presented as ranking or traffic success.

IndexNow is intentionally omitted. The launch has three indexable, mostly static
URLs, so sitemap discovery is sufficient. Analytics, keyword-volume tooling,
paid SEO suites, content publishing, and backlink outreach are separate product
or growth decisions.

## Implementation boundaries

The implementation is confined to `apps/web`, its tests, and the narrow Next.js
canonical-host redirect configuration. It reuses current copy, assets, and
components. It does not alter the assistant, MCP server, Noodle deployment,
currency detection, legal substance, product navigation, or CI architecture.

No secret or verification value is committed. A future environment-based
URL-prefix verification fallback may use Next.js `metadata.verification`, but
the approved Domain property uses DNS and needs no production meta tag.

## Verification

Implementation follows test-driven development:

- Unit tests first assert the central SEO configuration, route metadata,
  canonical URLs, robots policy, sitemap membership, manifest, structured data,
  social-image reference, and `www` redirect.
- The new assertions must fail for the missing behavior before implementation.
- The scoped web suite, typecheck, production build, and repository checks run
  after implementation.
- The social image is inspected at native 1200 by 630 resolution.
- A local production server is checked for rendered `<head>` output and HTTP
  behavior without adding Playwright back to hosted CI.
- After deployment, direct requests verify status, content type, canonical tags,
  robots, sitemap, manifest, structured data, social image, and the permanent
  `www` redirect on `gowayfare.io`.

## Completion criteria

The work is complete only when all of the following are true:

- the user has approved the rendered social preview;
- tests, typecheck, build, and applicable CI checks pass;
- the focused PR is merged and the exact merged revision is live on Fly;
- production metadata and crawl endpoints match this specification;
- Google Search Console ownership is verified and the sitemap is submitted;
- Bing Webmaster Tools contains the imported property and sitemap; and
- any authentication boundary or search-engine processing delay is reported as
  pending rather than silently treated as complete.
