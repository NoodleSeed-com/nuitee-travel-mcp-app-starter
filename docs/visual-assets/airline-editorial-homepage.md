# Airline editorial homepage imagery

Generation date: 2026-08-28

Generation tool: OpenAI built-in `image_gen`

The reviewed source PNGs are kept outside git in
`/private/tmp/airline-editorial-sources/`. Only the optimized JPEG derivatives
listed below are committed.

## Source prompts

### Rome

```text
Ultra-realistic premium travel editorial photograph of Rome at early morning, warm natural sunlight across terracotta rooftops and layered historic architecture, a quiet elevated viewpoint, cinematic depth, sophisticated airline campaign photography, no people in foreground, no logos, no readable signage, no text, no watermark, landscape 3:2 composition with safe space for responsive cropping.
```

### London

```text
Ultra-realistic premium travel editorial photograph of London beside the River Thames at blue hour, restrained modern skyline and historic riverside architecture, natural atmospheric light, elegant airline campaign photography, no prominent brands, no readable signage, no text, no watermark, landscape 3:2 composition with strong center subject and safe responsive crop.
```

### Istanbul

```text
Ultra-realistic premium travel editorial photograph of Istanbul and the Bosphorus at golden hour, layered waterfront city, ferries as small unbranded silhouettes, warm haze and detailed architecture, sophisticated airline campaign photography, no logos, no readable signage, no text, no watermark, landscape 3:2 composition with safe responsive crop.
```

### Warm editorial feature

```text
Ultra-realistic cinematic Mediterranean coastal travel photograph at late afternoon, luminous sea, pale cliffs, a quiet winding shoreline and warm horizon, premium airline campaign aesthetic, no people in foreground, no buildings with logos, no readable signage, no text, no watermark, wide 16:9 composition with darker safe area for adjacent copy.
```

## Committed derivatives

| Path | Dimensions | Bytes | Crop notes |
| --- | ---: | ---: | --- |
| `apps/web/public/images/destinations/rome-dawn-v1.jpg` | 1920×1280 | 577,408 | 3:2 frame; skyline and domes remain legible through centered responsive crops, with open sky above. |
| `apps/web/public/images/destinations/london-river-v1.jpg` | 1920×1280 | 723,536 | 3:2 frame; the central riverfront, skyline, and lamp retain a stable center-weighted crop. |
| `apps/web/public/images/destinations/istanbul-bosphorus-v1.jpg` | 1920×1280 | 621,807 | 3:2 frame; the Bosphorus and central mosque remain visible through responsive center crops. |
| `apps/web/public/images/destinations/warm-horizon-v1.jpg` | 1920×1080 | 722,135 | 16:9 frame; open sea supports flexible cropping while the darker cliff edge remains available for adjacent copy. |

The source outputs were generated at their highest available native landscape
resolution, then converted to JPEG quality 84 and resampled to the documented
web dimensions.

## Visual review

Every selected source and every committed derivative was inspected at original
detail. The first London candidate was rejected for an identifiable foreground
face. The first Istanbul candidate was rejected for text-like ferry markings;
both were regenerated from their exact prompts before conversion.

The selected assets contain no visible logos, readable signage, or identifiable
foreground faces. Architecture, vessel geometry, water and sky boundaries, and
object repetition were reviewed without finding a visible defect. The primary
subjects and intended negative space remain usable under the responsive crop
positions defined in `apps/web/src/lib/landing-content.ts`.

These assets are generated demo imagery. They are not evidence of a destination,
fare, discount, availability, airline relationship, or travel guarantee.
