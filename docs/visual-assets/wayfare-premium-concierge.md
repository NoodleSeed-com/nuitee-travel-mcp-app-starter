# Wayfare premium concierge imagery

Generation date: 2026-08-29

Generation mode: OpenAI built-in `image_gen`

These checked-in JPEGs are native high-resolution web masters. They preserve the
built-in generator's native `1672 x 941` landscape detail and were converted to
JPEG without resizing. They are not true `3840 x 2160` sources and must not be
described as literal 4K masters. Next.js negotiates responsive AVIF/WebP delivery
from these local JPEG masters.

## Wayfare hybrid hero

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
- Built-in mode: generate
- Checked-in dimensions: `1672 x 941`
- Format and bytes: JPEG, `575494`
- SHA-256: `2c50fa80a11397b610764f5dcce8c65257a480dfaf192a3a90260ba6f58ded58`
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

Accepted QA observations: original-detail review found coherent Tower Bridge
geometry, plausible contemporary skyline layers, natural blue-hour weather and
reflections, and no readable signage, advertising, duplicated landmarks,
malformed figures, or plastic surfaces. Non-legible surface marks on the
extreme-right vessel are not generated copy.

Rejected variant reasons: the first London candidate contained generated
text-like lettering on a left-river vessel or pier and was rejected before
conversion.

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
4d9a7f1ee43f20e435fe6d863dc5fe9efcdf8b73 apps/web/public/images/destinations/london-editorial-v2.jpg
4b79d0c20052bce11dd3e53d393341298acb620a apps/web/public/images/destinations/istanbul-editorial-v2.jpg
```

These generated demo images are visual inspiration only. They do not evidence a
specific destination condition, fare, discount, availability, airline
relationship, or travel guarantee.
