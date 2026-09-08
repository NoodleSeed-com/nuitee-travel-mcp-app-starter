# Wayfare premium concierge imagery

Generation date: 2026-08-29

Generation mode: OpenAI built-in `image_gen`

These checked-in PNG and JPEG files are high-resolution web masters. Landscape
assets preserve the dimensions documented per asset; the refreshed destination
portraits use optimized `1536 x 2048` masters. They are not true `3840 x 2160`
sources and must not be described as literal 4K masters. Next.js negotiates
responsive AVIF/WebP delivery from these local masters.

## Partner attribution wordmarks

These SVGs are unmodified identity assets used only in the quiet attribution
row below the homepage hero. They are not functional product icons and do not
relax the Heroicons-only interface rule.

### Noodle Seed

- Final path: `apps/web/public/images/partners/noodle-seed.svg`
- Source: canonical Noodle Seed website asset
  `apps/website/public/images/logos/noodle_seed_logo.svg`
- Retrieved: `2026-09-04`
- Intrinsic dimensions: `250 x 39`
- Format and bytes: SVG, `10205`
- SHA-256: `7da487a643bd1c3b0ef9bc122b54b836b87d4929f469902e6d9a2f64bd7d4951`
- Git blob: `ec41d92adfc9eec67922c3b6a02ea61a0f6b7184`

### Nuitée

- Final path: `apps/web/public/images/partners/nuitee.svg`
- Source: `https://nuitee.com/logos/nuitee-black.svg`
- Retrieved: `2026-09-04`
- Intrinsic dimensions: `100 x 34`
- Format and bytes: SVG, `4250`
- SHA-256: `c305e88d25b80313604c256d355bef987b034e2f28d56156d51d986b194d4860`
- Git blob: `9ee481a2c4b897356e5cff1ab20d0c8a7d311d7c`

On 2026-09-08 the repository owner confirmed Noodle Seed as copyright holder
and confirmed Nuitée wordmark redistribution clearance for this starter.
Preserve the unmodified marks and attribution. This approval does not imply
endorsement of adopters or a general right to alter the marks. See
`THIRD_PARTY_NOTICES.md` for the distribution boundary.

## Wayline WebGL mask

The large dark editorial feature renders a small WebGL fragment shader beneath
an alpha mask of the canonical Wayline geometry. The mask is repository-owned,
contains no generated or third-party content, and is the same approved path and
two endpoints used by `apps/web/src/components/wayfare-mark.tsx`.

- Final path: `apps/web/public/images/brand/wayfare-mark-mask.svg`
- Source: canonical repository-owned Wayline geometry
- Created: `2026-09-04`
- Format and bytes: SVG, `355`
- SHA-256: `bbf2338e37eb1955296f9ffb284ba2a421eceb41cdff4ef2c33624722b3fb3f6`
- Git blob: `0bcc9721b18fb34d627af23cb2afa80145513972`
- Use: CSS alpha mask for the editorial liquid shader only; the header,
  favicon, app icon, and compact marks remain one-color.

## Layered homepage hero

Generation date: 2026-09-04

The default homepage composes two independent generated assets. The outside
view moves by at most 10px horizontally and 5px vertically beneath a fixed
transparent cabin foreground on mouse input. Touch and reduced-motion
presentations remain static. Both assets are decorative and contain no text,
people, provider marks, airline branding, or embedded interface.

### Outside view — Mediterranean blue hour

- Final path: `apps/web/public/images/immersive/wayfare-window-view-v1.png`
- Built-in mode: generate
- Checked-in dimensions: `1945 x 809`
- Format and bytes: PNG, `1734135`
- SHA-256: `5a84eb689e13091d63ac2a89af60cac0583787ca26822bbf4a909bd1837856c1`
- Focal crop: `50% 50%`; the center remains dark and the coastlines occupy the
  outer thirds with enough overscan for the bounded pointer movement.

Final generation prompt:

```text
Use case: photorealistic-natural
Asset type: layered Wayfare homepage hero background, outside view only
Primary request: Create an ultra-wide photorealistic panoramic view seen from a passenger aircraft at blue hour, intended to move subtly behind a separate transparent airplane-cabin foreground.
Scene/backdrop: A calm Mediterranean coastline and dark teal sea at dusk, with distant low islands and a restrained band of fading warm light on the horizon.
Subject: The outside landscape only; no aircraft interior, no window frames.
Style/medium: premium editorial travel photography, natural detail, realistic atmospheric depth and subtle film grain.
Composition/framing: very wide landscape, approximately 2.4:1. Keep the entire central 45 percent consistently deep navy and dark teal so centered white interface copy remains legible without overlays or shadows. Preserve interesting coastline detail toward the outer thirds. Leave overscan around every edge for 12px parallax movement and responsive center cropping.
Lighting/mood: quiet blue hour, sophisticated and globally curious, naturally dark but not black, restrained highlights, no blown-out sky.
Color palette: deep navy, charcoal blue, dark teal, a very thin muted amber horizon.
Constraints: no text, no logos, no watermark, no people, no airplane, no cabin, no artificial vignette, no black overlay, no graphic elements, no stylized illustration.
Avoid: bright cyan water, daytime lighting, tropical postcard saturation, dramatic storm, stars, city lights, obvious landmarks, fake HDR.
```

### Foreground — transparent three-window cabin

- Final path: `apps/web/public/images/immersive/wayfare-cabin-frame-v1.png`
- Built-in mode: generate with requested alpha transparency
- Checked-in dimensions: `1916 x 821`
- Format and bytes: RGBA PNG, `2121651`
- SHA-256: `f4532116ab84b41680ec3fd34dc881f8e0129615054b1dfe9ca80bfe99053b3c`
- Focal crop: `50% 50%`; desktop reveals three windows while narrow crops retain
  the complete central window. The window openings contain alpha transparency.

Final generation prompt:

```text
Use case: photorealistic-natural
Asset type: transparent foreground layer for a layered Wayfare homepage hero
Primary request: Create only the interior wall of a premium modern passenger aircraft with three large elegant jet windows, photographed straight-on from a seated eye-level viewpoint. The view through all three windows must be genuine transparent alpha holes so a separate panoramic landscape can be placed and moved behind the cabin.
Subject: Symmetrical aircraft sidewall and three window surrounds spanning an ultra-wide frame; a wide central window plus partially visible matching windows toward both sides.
Style/medium: photorealistic editorial architectural photography, realistic molded cabin materials and fine surface texture, minimal and refined.
Composition/framing: ultra-wide landscape approximately 2.4:1, perfectly straight-on, symmetric, no perspective tilt. The center window should occupy the central copy area while the interior frame provides strong stable structure around it. Match the proportions of a compact website hero.
Lighting/mood: dim blue-hour ambient cabin light, charcoal and warm dark-gray interior, subtle soft highlights on the window rims, calm and sophisticated.
Color palette: charcoal, deep warm gray, near-black navy accents; avoid bright white or beige plastic.
Transparency: transparent canvas outside the cabin silhouette where appropriate, and most importantly genuinely transparent window openings with clean realistic inner edges and no sky, glass tint, reflection, scenery, checkerboard pattern, or placeholder fill inside them. Preserve alpha transparency.
Constraints: no outside scenery, no people, no seats, no text, no logos, no airline branding, no watermark, no controls or UI, no black overlay.
Avoid: bright cream cabin, futuristic spaceship styling, private jet luxury cues, glowing neon, oval portholes, window shades, visible glass reflections, fake transparency pattern.
```

Original-detail and responsive composite review confirmed natural central
contrast without an overlay or text shadow, clean alpha window openings,
coherent cabin geometry, useful desktop/tablet/mobile crops, and no visible
private data, credentials, markings, people, or commercial claims.

## Destination portrait refresh

Generation date: 2026-09-04

Generation mode: OpenAI built-in `image_gen`, one independent generate call per
destination. Each native `1086 x 1448` RGB PNG was mechanically resized to
`1536 x 2048` and converted with `sips` to JPEG quality 90 for a crisp but
practical checked-in web master. No subject, geometry, color, or composition
was edited after generation.

### Rome

- Final path: `apps/web/public/images/destinations/rome-editorial-v3.jpg`
- Checked-in dimensions: `1536 x 2048`
- Format and bytes: JPEG, `926276`
- SHA-256: `6c04697cc9a724820cbefd2cb05ca22da1ab844e864bc994c3a1adc4c99b9b72`
- Git blob: `ba4e041735fe906e153f71eff986af1bdfe84bb2`

Final generation prompt:

```text
Use case: photorealistic-natural. Create a vertical 3:4 premium editorial travel portrait of Rome from an elevated terrace, with St. Peter's dome and layered historic rooftops at golden hour. Use crisp architectural detail, dramatic natural light, confident contrast, and deeper detailed shadows in the lower quarter for a centered white caption. No text, logo, watermark, people, window frame, artificial HDR, gray haze, or oversaturation. High-resolution, 4K-quality photographic detail.
```

### London

- Final path: `apps/web/public/images/destinations/london-editorial-v3.jpg`
- Checked-in dimensions: `1536 x 2048`
- Format and bytes: JPEG, `723452`
- SHA-256: `d26787af64e4acfee117dc9643725e603ee82744111cea5e6ebb650582c1c841`
- Git blob: `7b6ef94d25b03e58739a45fdabb69c3a48560693`

Final generation prompt:

```text
Use case: photorealistic-natural. Create a vertical 3:4 premium editorial travel portrait of London's Tower Bridge at blue hour, with the bridge clearly readable, crisp masonry and city detail, luminous but natural evening light, confident contrast, and a darker detailed lower quarter for a centered white caption. No text, logo, watermark, prominent people, window frame, artificial HDR, gray haze, or oversaturation. High-resolution, 4K-quality photographic detail.
```

### Istanbul

- Final path: `apps/web/public/images/destinations/istanbul-editorial-v3.jpg`
- Checked-in dimensions: `1536 x 2048`
- Format and bytes: JPEG, `919851`
- SHA-256: `c535bae868a50e994152d0e0cfc883a0c0027ad5c17f042ef963213a676b7f26`
- Git blob: `e3ec66365d3c98c5b73f6eb3b365aad86a910da5`

Final generation prompt:

```text
Use case: photorealistic-natural. Create a vertical 3:4 premium editorial travel portrait of Istanbul with Ortakoy Mosque and the Bosphorus Bridge at sunset, detailed waterfront texture, realistic warm light, strong natural blue-and-gold contrast, and a darker detailed lower quarter for a centered white caption. No text, logo, watermark, prominent people, window frame, artificial HDR, gray haze, or oversaturation. High-resolution, 4K-quality photographic detail.
```

### Lisbon

- Final path: `apps/web/public/images/destinations/lisbon-editorial-v3.jpg`
- Checked-in dimensions: `1536 x 2048`
- Format and bytes: JPEG, `959292`
- SHA-256: `b9a7fc5abd65debe753ea6f853a1030eb81f01163928747d96a97d6f7804db36`
- Git blob: `6f0c3f2b95b953b277fb89e7ebea473fd1f581b6`

Final generation prompt:

```text
Use case: photorealistic-natural. Create a vertical 3:4 premium editorial travel portrait of Lisbon's tiled hillside rooftops looking toward the Tagus and 25 de Abril Bridge in late-afternoon light. Use crisp local texture, clear spatial depth, confident natural contrast, and a darker detailed lower quarter for a centered white caption. No text, logo, watermark, prominent people, window frame, artificial HDR, gray haze, or oversaturation. High-resolution, 4K-quality photographic detail.
```

### Banff

- Final path: `apps/web/public/images/destinations/banff-editorial-v3.jpg`
- Checked-in dimensions: `1536 x 2048`
- Format and bytes: JPEG, `1014168`
- SHA-256: `1650d5bcb57a35b8eb1e4f89a9ac680cf9a8fab35c7571e8e16048ce4db75f6d`
- Git blob: `242fe88e9c5f390174c9a1382247c3c0be4872f4`

Final generation prompt:

```text
Use case: photorealistic-natural. Create a vertical 3:4 premium editorial travel portrait of Moraine Lake in Banff with the Canadian Rockies at early morning, crisp rock and forest texture, clear turquoise water, restrained natural color, confident contrast, and a darker detailed lower quarter for a centered white caption. No text, logo, watermark, people, window frame, artificial HDR, gray haze, or oversaturation. High-resolution, 4K-quality photographic detail.
```

Original-detail review confirmed recognizable place-specific landmarks, coherent
geometry, clear portrait crops, useful lower-caption contrast, and no text,
logos, watermarks, credentials, private data, prominent identifiable people, or
commercial claims. The `4K-quality` prompt language describes the requested
detail standard; these checked-in files must be described by their true
`1536 x 2048` dimensions.

## Active shared core hero masters

The full-bleed `/experience` routes consume these exact paths through
`apps/web/src/lib/travel-hero-content.ts`; they do not keep separate crops or
duplicate hero images. The default homepage uses the layered pair above.

### Explore — three-window cabin view

- Final path: `apps/web/public/images/immersive/wayfare-explore-windows-v2.png`
- Built-in mode: generate
- Checked-in dimensions: `1672 x 941`
- Format and bytes: PNG, `1902911`
- SHA-256: `4f28eb6b9f00c101cb9a66d7731a07ae760d4cf61b436750a7e6172b0b98e41a`
- Focal crop: `50% 50%`; three ivory aircraft windows span the usable width.

Prompt summary: photoreal three-window ivory aircraft cabin looking over a
Mediterranean coast, with no people, branding, text, watermark, or embedded UI.
Original-detail review confirmed coherent window geometry, stable sea and cliff
continuity, useful center space for live HTML, and no obvious private data or
generated markings.

### Flights — split-cockpit horizon

- Final path: `apps/web/public/images/immersive/wayfare-cockpit-v2.png`
- Built-in mode: generate
- Checked-in dimensions: `1672 x 941`
- Format and bytes: PNG, `1645364`
- SHA-256: `cca500fbae39d3d593cc379f319ca64eae484ccbce5582a9620e571b66bac1a4`
- Focal crop: `50% 50%`; two cockpit panes and the slim center pillar remain visible.

Prompt summary: photoreal commercial cockpit with a clearly divided two-pane
windscreen and coastal horizon, without pilots, brands, readable instruments,
text, watermark, or embedded UI. Original-detail review confirmed that the
cockpit reads as aviation rather than a car windscreen and preserves a clean
live-composer zone.

### Insurance — airport-lounge protection concept

- Final path: `apps/web/public/images/immersive/wayfare-insurance-v1.png`
- Built-in mode: generate
- Checked-in dimensions: `1672 x 941`
- Format and bytes: PNG, `1790904`
- SHA-256: `0750cee8fea894960331b79502ea6de460a6d7b84e2ca20a1cacb94ccdf537b0`
- Focal crop: `50% 50%`; travel essentials and airport context remain decorative.

Prompt summary: premium photoreal airport lounge with carry-on travel
essentials, an aircraft and coastal sky beyond glass, and a subtle shield-like
reflection in the Wayfare navy/teal/ivory palette. Original-detail review found
no people, logos, text, policy claims, or embedded UI. The image is decorative
only and does not evidence coverage, eligibility, availability, or an insurer.

The existing Stays and Flight + Stay masters retain their checked-in paths and
are also reused exactly by both landing variants.

## Retained legacy Wayfare hybrid hero

- Final path: `apps/web/public/images/wayfare-hybrid-hero-v2.jpg`
- Built-in mode: generate, followed by one built-in detail-preserving edit
- Checked-in dimensions: `1672 x 941`
- Format and bytes: JPEG, `704736`
- SHA-256: `5834743c2c7b9802bc903ee60e2da6770d2b23373014abd04e7e4d30e09be4eb`
- Focal crop: `center 50%`; open water and horizon remain stable while both cliff edges provide depth.
- Conversion: `sips` JPEG quality 92, format conversion only; no resizing.

Initial generation prompt:

```text
Use case: photorealistic-natural
Asset type: Wayfare premium airline-concierge landing hero, 4K-grade landscape master
Primary request: a cinematic Mediterranean coastline seen from an elevated quiet cove at early morning, deep clear blue water, pale limestone cliffs, restrained coastal vegetation, open horizon, no buildings dominating the scene
Style/medium: highly realistic editorial travel photography, premium airline campaign quality, natural lens rendering, believable fine texture
Composition/framing: 16:9 wide landscape; stable negative space through the upper center for responsive cropping; meaningful coastline detail on both sides; no subject centered like a stock-photo postcard
Lighting/mood: soft early-morning directional light, calm and optimistic, clean color separation, no aggressive HDR
Color palette: ink-blue sea, pale mineral stone, muted green vegetation, warm restrained sunlight
Constraints: deliver source detail suitable for a 3840x2160 master; no text, no logo, no watermark, no aircraft, no people, no boats with visible branding
Avoid: fantasy geography, duplicated cliffs, plastic water, oversaturated cyan, excessive haze, malformed structures, synthetic-looking sharpness
```

Accepted refinement prompt:

```text
Edit target: the immediately preceding generated Mediterranean coastline image.
Use case: photorealistic-natural
Primary request: preserve the approved composition, geometry, lighting, color, negative space, coastline placement, and natural photographic character exactly; create a genuine 3840x2160 16:9 master with restored believable fine source detail in the limestone, vegetation, and water at 100% inspection.
Constraints: output exactly 3840x2160 pixels; do not crop or add subjects; no text, logo, watermark, aircraft, people, or branded boats.
Avoid: conventional pixel resampling appearance, synthetic sharpening, halos, repeated textures, duplicated cliffs, plastic water, oversaturated cyan, excessive haze, malformed structures.
```

Accepted QA observations: original-detail review found believable limestone,
vegetation, and water texture; a stable open horizon; meaningful coastline detail
on both sides; natural light; and no text, logo, watermark, aircraft, people,
branded boats, duplicated cliffs, malformed structures, excessive haze, or
sharpening halos.

Rejected variant reasons: the initial built-in candidate was not selected because
the refinement delivered stronger micro-detail and a cleaner right-hand cliff
while preserving the composition. Both built-in outputs were `1672 x 941`; the
earlier literal-4K requirement was superseded by the user-directed native-detail
acceptance ruling, and neither output was conventionally resampled.

## Rome destination

- Final path: `apps/web/public/images/destinations/rome-editorial-v2.jpg`
- Built-in mode: generate
- Checked-in dimensions: `1672 x 941`
- Format and bytes: JPEG, `584013`
- SHA-256: `754a326b839112bb568d48c845a36aac2c831971391282d7be60ef5c6c0d03fb`
- Focal crop: `72% 48%`; St. Peter's dome anchors the crop while layered roofs retain context.
- Conversion: `sips` JPEG quality 92, format conversion only; no resizing.

Final generation prompt:

```text
Use case: photorealistic-natural
Asset type: Wayfare destination discovery card, 4K-grade landscape master
Primary request: Rome: a dawn view across Rome's layered historic rooftops toward a recognizable but not oversized dome, warm mineral stone, believable urban depth, quiet morning atmosphere
Style/medium: highly realistic contemporary editorial travel photography, premium airline campaign quality, natural lens and architectural detail
Composition/framing: landscape master that remains recognizable in 4:3, 3:2, and portrait crops; one stable focal subject; no critical content at the extreme edges
Lighting/mood: natural atmospheric light, refined and inviting, no aggressive HDR
Constraints: 3840px long edge and at least 2160px short edge; no text, logos, watermarks, airline branding, or prominent identifiable faces
Avoid: impossible architecture, duplicated landmarks, malformed people, plastic texture, fantasy lighting, oversaturation, generated signage
```

Accepted QA observations: original-detail review found coherent historic roof
layers, restrained landmark scale, warm natural atmosphere, and no generated
markings, duplicated landmarks, malformed people, plastic textures, or fantasy
lighting. The dome remains legible through 4:3, 3:2, and focal portrait crops.

Rejected variant reasons: the first Rome candidate contained text-like generated
markings along a left-midground roofline and was rejected before conversion.

## London destination

- Final path: `apps/web/public/images/destinations/london-editorial-v2.jpg`
- Built-in mode: generate, followed by one built-in precise-object edit
- Checked-in dimensions: `1672 x 941`
- Format and bytes: JPEG, `566890`
- SHA-256: `be2ae83ea5ec1fabcd4c70caaf78668225a79a3353681b95ce8009ae184b2dc5`
- Focal crop: `58% 50%`; Tower Bridge remains centered with enough skyline and river context.
- Conversion: `sips` JPEG quality 92, format conversion only; no resizing.

Final generation prompt:

```text
Use case: photorealistic-natural
Asset type: Wayfare destination discovery card, 4K-grade landscape master
Primary request: London: a refined blue-hour view along the Thames with contemporary and historic London layers, realistic weather and reflections, no advertising or readable signage
Style/medium: highly realistic contemporary editorial travel photography, premium airline campaign quality, natural lens and architectural detail
Composition/framing: landscape master that remains recognizable in 4:3, 3:2, and portrait crops; one stable focal subject; no critical content at the extreme edges
Lighting/mood: natural atmospheric light, refined and inviting, no aggressive HDR
Constraints: 3840px long edge and at least 2160px short edge; no text, logos, watermarks, airline branding, or prominent identifiable faces
Avoid: impossible architecture, duplicated landmarks, malformed people, plastic texture, fantasy lighting, oversaturation, generated signage
```

Accepted precise-object edit prompt:

```text
Use case: precise-object-edit
Edit target: the immediately preceding London Tower Bridge JPEG.
Primary request: remove the entire dark foreground vessel at the extreme lower-right, including every white glyph-like hull marking, railing, mast, and reflection belonging to that vessel; reconstruct only natural Thames water and blue-hour reflections in the removed area.
Invariants: preserve the accepted Tower Bridge and skyline composition, every bridge and architectural geometry, left promenade and lamps, other distant vessel, camera position, crop, blue-hour lighting, realistic weather, water texture, reflections, color, and native photographic detail.
Constraints: no text, glyphs, logos, readable signage, advertising, watermarks, prominent identifiable faces, or added objects anywhere in the image.
Avoid: altered or impossible bridge architecture, duplicated structures, malformed boats or people, plastic water, fantasy lighting, oversaturation, synthetic sharpening, or text-like artifacts.
```

Accepted QA observations: original-detail review found coherent Tower Bridge
geometry, plausible contemporary skyline layers, natural blue-hour weather and
reflections, and no readable signage, advertising, duplicated landmarks,
malformed figures, or plastic surfaces. The former extreme-right foreground
vessel and its white glyph-like hull markings are absent, with natural water and
reflections restored in their place. The documented `58% 50%` 4:3 crop was
inspected independently and contains no text-like marks.

Rejected variant reasons: the first London candidate contained generated
text-like lettering on a left-river vessel or pier and was rejected before
conversion. The initially checked-in second candidate was rejected in Fix Round
1 because its extreme-right foreground vessel contained large white glyph-like
hull lettering that remained visible in the documented 4:3 crop.

## Istanbul destination

- Final path: `apps/web/public/images/destinations/istanbul-editorial-v2.jpg`
- Built-in mode: generate
- Checked-in dimensions: `1672 x 941`
- Format and bytes: JPEG, `507119`
- SHA-256: `e2d746245f5e53a5319160fe06f4d0936e21b30011e6f24bbeac1dba427c19a3`
- Focal crop: `30% 50%`; Ortaköy Mosque stays primary while the bridge and water retain place context.
- Conversion: `sips` JPEG quality 93, format conversion only; no resizing. Quality 93 retains additional native detail and clears the repository's 500,000-byte master floor.

Final generation prompt:

```text
Use case: photorealistic-natural
Asset type: Wayfare destination discovery card, 4K-grade landscape master
Primary request: Istanbul: a warm late-afternoon Bosphorus view with ferries at a distance, layered shoreline and mosque silhouettes rendered accurately, no readable vessel names or flags
Style/medium: highly realistic contemporary editorial travel photography, premium airline campaign quality, natural lens and architectural detail
Composition/framing: landscape master that remains recognizable in 4:3, 3:2, and portrait crops; one stable focal subject; no critical content at the extreme edges
Lighting/mood: natural atmospheric light, refined and inviting, no aggressive HDR
Constraints: 3840px long edge and at least 2160px short edge; no text, logos, watermarks, airline branding, or prominent identifiable faces
Avoid: impossible architecture, duplicated landmarks, malformed people, plastic texture, fantasy lighting, oversaturation, generated signage
```

Accepted QA observations: original-detail review found a coherent Ortaköy Mosque
and Bosphorus Bridge relationship, accurate mosque silhouette, plausible ferry
geometry, natural water and warm light, and no readable vessel names, flags,
signage, duplicated landmarks, malformed people, or plastic textures.

Rejected variant reasons: the first Istanbul candidate contained name-like ferry
markings and an implausible monumental-mosque/bridge geography, so it was
rejected before conversion.

## Binary history review evidence

Each checked-in JPEG received an original-detail human visual review before its
exact Git blob identity was computed. These exact entries are recorded here for
Task 7's branch-level history audit:

```text
240eb6956d733f2044c3e13b913cfccd706990b0 apps/web/public/images/wayfare-hybrid-hero-v2.jpg
e6d793cc15a411fb0539dd5cec6dc0baf4002ab4 apps/web/public/images/destinations/rome-editorial-v2.jpg
3e9370023af2f45d3846d642cbdb5c697c3b61db apps/web/public/images/destinations/london-editorial-v2.jpg
4b79d0c20052bce11dd3e53d393341298acb620a apps/web/public/images/destinations/istanbul-editorial-v2.jpg
060089d1f0fe41cbc89af3e2afe424dcb83a08a6 apps/web/public/images/immersive/wayfare-explore-windows-v2.png
1940a8249a53ec3d774dbe76427cb70971321154 apps/web/public/images/immersive/wayfare-cockpit-v2.png
b657e59195f697df14f6e7eda50c0b775deea053 apps/web/public/images/immersive/wayfare-insurance-v1.png
f4d3c3248a1b133ba848868146b35e62825d45bb apps/web/public/images/immersive/wayfare-window-view-v1.png
4cb2591aa07608f1abd537e4d48874bf4a6e06fd apps/web/public/images/immersive/wayfare-cabin-frame-v1.png
```

These generated demo images are visual inspiration only. They do not evidence a
specific destination condition, fare, discount, availability, airline
relationship, or travel guarantee.

### Task 7 fix round 1

The rejected historical London v2 blob
`4d9a7f1ee43f20e435fe6d863dc5fe9efcdf8b73` is visually security-reviewed only
for reachable-history audit coverage. It is not current product acceptance; the
accepted final London blob remains
`3e9370023af2f45d3846d642cbdb5c697c3b61db` above. Task 7 also narrows the
history-audit fixture exception to complete known browser-evidence lines, so a
suffix or another key-shaped token on the same line remains detectable.
