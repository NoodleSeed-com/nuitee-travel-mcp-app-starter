# Product screenshot provenance

Captured on 2026-09-08 from the actual Wayfare surfaces in this repository,
following the full [Wayfare brand guidelines](../brand/wayfare-brand-guidelines.md).
All three files were visually inspected at their captured resolution for layout,
legibility, credentials, private data, and truthful state labels.

| File | Surface | Dimensions | SHA-256 |
| --- | --- | --- | --- |
| `travel-home.png` | Next.js homepage, before submitting a message | `1440 × 800` | `0693cdfdde8c16b9309a6faa9fba89b508abf5ee59d4dbcea614a1dd3bd21442` |
| `flight-results.png` | Actual `FlightResultsView`, inline compact carousel, second fictional fare selected | `1080 × 528` | `89d53489dd54f4ef3f4800b18e3357af058d16e1455666e5b063d2c2ceff3ae0` |
| `hotel-results.png` | Actual `HotelJourney`, initial hotel shortlist | `1080 × 754` | `251f4086fec3d0c9417d31ae13b37bb483691dff3a0227f90019d4adccc05eed` |

## What these images prove

These are Playwright Chromium screenshots of repository-owned React UI, not
image-generated interfaces, composites, remote-host screenshots, or evidence of
a live provider response. No product component or styling was changed to make
these captures. The homepage uses the existing local brand imagery; its original
asset provenance remains in the [visual asset ledger](../visual-assets/wayfare-premium-concierge.md).

The widget fixtures in [`scripts/widget-preview-page.tsx`](../../scripts/widget-preview-page.tsx)
contain invented carriers, test airport codes, fictional properties, future test
dates, and illustrative prices. The hotel fixture omits photos and coordinates,
so the actual missing-photo fallback is shown and no map service is contacted.
Selection handles are synthetic, never provider-issued, and absent from captured
markup. A screenshot-only text caption above each widget explicitly labels the
fictional preview. No assistant conversation or host frame is fabricated.

The widgets are rendered to static React markup, then laid out and rasterized by
Chromium with the actual Noodle, travel, and hotel styles. Host Grotesk is loaded
from the installed, licensed local font package. These captures show visual
states, not proof of interactive selection or host interoperability; those have
separate component and host tests. The flight carousel deliberately reveals the
edge of the adjacent option. The hotel carousel contains three visible options
at this desktop width.

## Reproduce the widgets

From the repository root, after installing the frozen dependencies:

```sh
pnpm exec playwright install chromium
pnpm docs:previews
```

[`scripts/capture-widget-previews.mjs`](../../scripts/capture-widget-previews.mjs)
blocks every browser network request, uses a `1160 × 1000` viewport, captures the
`1080px` preview container at device scale 1, and forces light mode, reduced
motion, `en-CA`, and UTC. It rejects unexpected remote URLs, image tags,
credential markers, and selection handles in rendered markup. Source styles
and the local font are embedded for the capture only. The font is not copied as
a new distributable asset.

## Reproduce the homepage

In one terminal, from the repository root:

```sh
pnpm --filter @nuitee-travel-starter/web exec next dev --hostname 127.0.0.1 --port 3317
```

After the server is ready, in another terminal from the same root:

```sh
node scripts/capture-home-preview.mjs
```

Then stop the local server. The script accepts an optional plain loopback origin
if you choose another port. It rejects deployment URLs and URL credentials,
queries, or fragments. Use the credential-free configuration and do not submit
a prompt. Browser requests are restricted to that local origin. The accepted
capture had **0 external requests, 0 page errors, and 0 submitted messages**.
It waits for the composer, fonts, and local images; hides only the Next.js
development indicator; and captures a `1440 × 800` viewport in light mode with
reduced motion, `en-CA`, UTC, and device scale 1.

## Review new captures

Visual inspection must confirm readable content, accurate fixture labels, and
absence of secrets, customer data, provider identifiers, or developer overlays.
Then update the dimensions and SHA-256 table above and append the exact Git
blob/path pairs to [`security/reviewed-binary-blobs.txt`](../../security/reviewed-binary-blobs.txt).
Do not treat a capture or a local test as evidence of a deployed assistant,
current inventory, booking support, or public availability.
