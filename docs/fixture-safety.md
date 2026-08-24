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

The reviewed Git tree contains no bundled third-party airline artwork or
webfonts. The only tracked raster assets are first-party Chromium captures of
the actual widgets under `docs/images/`; their adjacent provenance file records
the fictional, network-disabled capture process. Fixture code includes one
fictional Nuitee-shaped `marketingLogo` URL solely to test exact-origin
normalization and rendering; ordinary and browser tests never fetch it, and
public fixture previews omit the image.

Live search results may render an allowlisted Nuitee-hosted carrier image and
the real carrier name/code returned with that inventory. That is data
attribution, not a bundled asset, endorsement, or airline partnership. Carrier
text and fictional initials remain the safe fallback.

Do not add copied airline, airport, travel-agency, or reference-application
assets. Any new demonstration asset needs an explicit origin, license, and
public-distribution review.
