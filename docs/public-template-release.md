# Preparing a public source candidate

The public artifact is a clean export from a reviewed commit. The development
repository contains private history and must remain private. Do not publish it
by changing its visibility or creating a public fork.

## Export

After committing the approved changes, use a new absolute destination:

```sh
pnpm export:public -- --out /absolute/new/travel-starter
# Optionally select another reviewed commit:
pnpm export:public -- --ref HEAD --out /absolute/new/travel-starter-candidate
```

The exporter reads Git blobs from one resolved commit. It never copies the
working tree, untracked files, secrets, installed modules or `.git`. It refuses
existing destinations and symlinks. The allowlist in
`scripts/public-template-policy.mjs` excludes internal documents, planning
reports and generated kits; changes to that allowlist need review.

The export includes the application's source, lockfile, tests and public docs.
Project-owned agent context replaces generated context in the exported root.
The explicit output path and source commit appear in the result. Review the
actual output before publishing; an allowlist is not a complete content review.

## Test the candidate

Initialize a fresh local Git history so audits see only the candidate, then run:

```sh
cd /absolute/new/travel-starter
git init
git add .
git commit --signoff -m "Initial agentic travel starter"
corepack enable
CI=true pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm ci:offline
pnpm check:browser
pnpm audit:release
```

The candidate CI workflow rehearses the export and its clean install without
publishing it. Source-development `audit:release` is intentionally blocked by
internal files and mutable generated examples; use the public candidate for the
full distribution audit. Ordinary application CI runs in both trees.

Advisory scans require registry access. Missing package-store metadata is an
installation problem and must be resolved with a clean frozen install before
interpreting the license audit. Do not ignore failed scans.

## Scope and promotion

The source release promises a credential-free UI preview and documented
integration points. It does not promise that another developer's credentials,
provider entitlement, hosted model settings or target MCP host already work.
Live reads and production promotion require those developers' configuration and
verification. The full decision list is in `PUBLIC_RELEASE_CHECKLIST.md`.

README captures follow `docs/brand/wayfare-brand-guidelines.md` and render the
real components using fictional data; they are not hosted or live-search proof.

Open the preparation PR for review without auto-merge or merge-queue enrollment.
Publish the new repository and enable template status only after explicit owner
approval and final anonymous verification.

## Local provider read evidence

On 2026-09-08, `src/demo-live-server.ts` was exercised with the owner-provided
Lite credential through Noodle's ignored local managed store. A YYZ–LIS flight
search for 2026-10-18 returned ten normalized itineraries with `partial` status;
Lisbon hotel search for October 18–21 returned nine stays with `live_nuitee`
provenance and `success` status. Initial calls returned application-level errors;
one bounded retry produced those results. No booking, reservation, payment,
hosted mutation, raw response, credential or provider identifier was recorded.
This proves representative reads, not provider availability or every journey.
