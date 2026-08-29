# Fictional fixture and asset safety

This repository keeps demonstration data visibly fictional and separate from
the live connector path. Fixture identifiers are schema-shaped test data; they
are never represented as current inventory.

## Reviewed identifiers

The public [IATA Airline and Airport Code Search](https://www.iata.org/en/publications/directories/code-search/)
returned no assigned airport for `QZX`, `QZY`, or `QZH` when each code was
checked on 2026-08-24. They stand for Cedar Bay Test Aerodrome, Cloud Harbour
Test Aerodrome, and Cedar Junction Test Airport only inside hermetic fixtures.

These location codes are currently unassigned, not permanently reserved. A
release owner must recheck them against IATA's current source before every
public release and replace them consistently if an assignment appears.

The fictional carrier code is `ZZ`. IATA Resolution 762 section 6.1(k) lists
`ZZ` for computer tests rather than assignment to an operating airline. See
the official [Passenger Standards Conference attachment](https://www.iata.org/contentassets/c33c192da39a42fcac34cb5ac81fd2ea/psc2023-agenda_t2.pdf).

## Asset boundary

The reviewed Git tree contains no bundled third-party airline artwork. It does
bundle Inter Variable from `@fontsource-variable/inter@5.3.0`, whose package
declares and includes the SIL Open Font License 1.1 (`OFL-1.1`). The font is
loaded locally by the website and MCP App bundles; there is no runtime request
to a third-party font host. Dependency-license metadata and the repository
license audit do not replace the outstanding owner/legal review of copyright,
NOTICE treatment, provenance/compatibility, and public redistribution.

The tracked raster boundary is explicit:

- `apps/web/public/images/wayfare-hybrid-hero-v2.jpg`;
- `apps/web/public/images/destinations/rome-editorial-v2.jpg`;
- `apps/web/public/images/destinations/london-editorial-v2.jpg`; and
- `apps/web/public/images/destinations/istanbul-editorial-v2.jpg`.

These four local generated masters are native `1672 × 941` high-resolution web
images, not literal 4K sources. Their OpenAI `image_gen` prompts, dimensions,
bytes, hashes, responsive delivery, conversion choices, and visual review are
recorded in `docs/visual-assets/wayfare-premium-concierge.md`. The historical
rejected London blob is reviewed only for reachable-history coverage; it is not
the accepted current image.

- `docs/images/flight-results.png` and `docs/images/travel-home.png` are
  first-party Chromium captures governed by `docs/images/README.md`.

The raster review boundary remains exact-blob based.

Raw destination-generation sources stay outside git. Every tracked raster is
covered by an exact reviewed blob ID in `security/reviewed-binary-blobs.txt`.
That review is a privacy/obvious-content check, not final copyright, trademark,
generation-provider-terms, or public-distribution clearance; those release
gates remain open.

Fixture code includes one fictional Nuitee-shaped `marketingLogo` URL solely to
test exact-origin normalization and rendering; ordinary and browser tests never
fetch it, and public fixture previews omit the image.

Live search results may render an allowlisted Nuitee-hosted carrier image and
the real carrier name/code returned with that inventory. That is data
attribution, not a bundled asset, endorsement, or airline partnership. Carrier
text and fictional initials remain the safe fallback.

Do not add copied airline, airport, travel-agency, or reference-application
assets. Any new demonstration asset needs an explicit origin, license, and
public-distribution review. Any changed binary also needs a new exact blob-ID
review entry; approval does not carry forward by path.
