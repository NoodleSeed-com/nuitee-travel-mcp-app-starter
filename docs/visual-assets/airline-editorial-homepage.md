# Wayfare landing imagery

The active Wayfare landing uses a high-contrast, Host Grotesk cinematic composition: a
mode-aware hero supports a centered conversation entry, and three compact
destination images support discovery. The standard and full-bleed experiences
share exact core image paths through `apps/web/src/lib/travel-hero-content.ts`.
The images are visual inspiration only; they do not evidence a fare,
availability, discount, destination condition, airline relationship, insurance
coverage, or travel guarantee.

## Checked-in local masters

The active core hero masters are:

- `apps/web/public/images/immersive/wayfare-explore-windows-v2.png`;
- `apps/web/public/images/immersive/wayfare-cockpit-v2.png`;
- `apps/web/public/images/immersive/wayfare-stay-v1.png`;
- `apps/web/public/images/immersive/wayfare-flight-stay-v1.png`; and
- `apps/web/public/images/immersive/wayfare-insurance-v1.png`.

The editorial destination masters are:

- `apps/web/public/images/destinations/rome-editorial-v2.jpg`;
- `apps/web/public/images/destinations/london-editorial-v2.jpg`; and
- `apps/web/public/images/destinations/istanbul-editorial-v2.jpg`.

Each is a truthful native `1672 × 941` high-resolution web master. They are
not literal `3840 × 2160` sources and must not be described as 4K masters.
Next.js uses these local JPEGs to provide responsive AVIF/WebP delivery; preserve
the checked-in `sizes`, priority, focal position, and mobile crop behavior when
changing a presentation.

The authoritative [Wayfare premium concierge provenance ledger](wayfare-premium-concierge.md)
records each accepted path, generation mode and prompt, exact dimensions, byte
count, SHA-256, conversion choice, focal crop, visual-QA decision, rejected
variants, and exact reviewed Git blob/path pair. Do not duplicate or substitute
that evidence with a path-only claim.

## Replacement boundary

Use only repository-owned, licensed, or approved generated local imagery. Do
not introduce a remote image origin, airline logo or livery, watermark, readable
signage, prominent identifiable face, or invented commercial claim. A changed
binary requires a new visually reviewed exact blob/path entry in
`security/reviewed-binary-blobs.txt`; this privacy/obvious-content review does
not complete copyright, trademark, generation-provider terms, or public
redistribution approval.

Local visual review and responsive browser evidence do not prove hosted
rendering, deployment, host certification, directory approval, public release,
or completed legal, privacy, customer-auth, embed, origin, and budget
prerequisites. Those remain separately authorized promotion gates in
[`PUBLIC_RELEASE_CHECKLIST.md`](../../PUBLIC_RELEASE_CHECKLIST.md).
