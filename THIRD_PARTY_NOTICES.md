# Third-party notices and assets

The application source is copyright 2026 Noodle Seed and licensed under
[Apache-2.0](LICENSE). This document identifies bundled assets and dependencies;
it does not relicense third-party components or grant general trademark rights.

## Bundled assets

| Asset | Source and terms |
| --- | --- |
| Wayfare imagery and Wayline mark | Repository-created assets; generation, source files and exact review records are in `docs/visual-assets/` and the brand guidelines. Preserve attribution and review replacement imagery. |
| Noodle Seed wordmark | Noodle Seed-owned identity asset used for truthful attribution. Copyright holder confirmed by the owner on 2026-09-08. |
| Nuitée wordmark | Unmodified official Nuitée asset. The repository owner confirmed redistribution clearance on 2026-09-08. This permits its inclusion in this starter; it does not imply endorsement of an adopter's business or grant rights to alter the mark. |
| Host Grotesk | `@fontsource-variable/host-grotesk`, SIL Open Font License 1.1. Preserve the package's license when distributing the font. |
| Heroicons | `@heroicons/react`, MIT. Preserve the package license when redistributing its code. |
| README screenshots | Captured from this application with fictional fixtures. See `docs/images/README.md` for capture commands, dimensions and hashes. |

The Apache license's trademark exclusion still applies. Replace identity assets
when presenting an independently branded product. Live provider imagery is not
included in the screenshot captures or redistributed as fixture inventory.

## Installed dependencies

The lockfile is the authoritative version inventory. Use `pnpm licenses list
--json` for the platform-specific graph after `pnpm install --frozen-lockfile`.
Preserve dependency licenses and notices when packaging or distributing their
code, fonts or native binaries.

The reviewed macOS graph contains Apache-2.0, MIT, MIT-0, ISC, BSD-2-Clause,
BSD-3-Clause, 0BSD, BlueOak-1.0.0, OFL-1.1, CC0-1.0, CC-BY-4.0, MPL-2.0,
LGPL-3.0-or-later, and dual-license alternatives. Other operating systems select
different native packages, so repeat the inventory for the actual artifact.

Components needing particular attention when redistributing binaries or modified
sources include:

- `@img/sharp-libvips-*`: LGPL-3.0-or-later native libvips distributions. This
  source template does not vendor their binaries; retain the upstream notices
  and satisfy the applicable terms when producing a deployed/distributed image.
- `lightningcss` and its native packages: MPL-2.0.
- `dompurify`: MPL-2.0 OR Apache-2.0.
- `json-schema`: AFL-2.1 OR BSD-3-Clause.
- `caniuse-lite`: CC-BY-4.0; `mdn-data`: CC0-1.0.
- `@noodleseed/one` and `@noodleseed/assistant`: Apache-2.0 package metadata.
  The installed `@noodleseed/one` notice is preserved in `NOTICE`.

The metadata check detects missing declarations. It does not decide license
compatibility or replace review of a distribution's actual contents.
