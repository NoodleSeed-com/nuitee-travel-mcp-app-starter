# Public starter release checklist

This gate covers a reusable agentic travel **source template**. Developers must
be able to install it, preview fictional journeys, configure their own accounts,
and extend the application. Hosted production promotion is a separate decision.

## Source candidate gates

- [ ] Freeze one reviewed commit and export it with `pnpm export:public -- --out /absolute/new/directory`.
- [x] Run `pnpm ci:offline`, `pnpm check:browser`, and `pnpm audit:release` in the fresh public candidate after a frozen install (2026-09-08, Wayfare refresh including experiences: 697 unit/contract tests, 125 browser tests passed, 17 intentional browser skips; zero known dependency vulnerabilities). Repeat for the final publication revision.
- [x] Inspect the homepage, flight and hotel screenshots and verify their exact blob entries and fictional-data provenance (2026-09-08; see `docs/images/README.md`).
- [ ] Have a developer unfamiliar with the project complete the README quickstart.
- [x] Verify the provider-backed flight and hotel paths with authorized developer-owned credentials. On 2026-09-08 the expanded live entrypoint returned ten flight itineraries (`partial`) and nine live hotel stays (`success`) after one bounded retry. This is local read evidence only.
- [x] Inspect the exported tree and its new history for internal material, secrets and unreviewed binaries (2026-09-08; 301 files, one fresh audit commit, nine detectors, zero findings). Repeat for the final publication revision.

The development repository retains internal documentation and old history. It
must remain private. The export has an explicit source allowlist and carries no
Git history, internal documents, planning reports, local environments, generated
Agent Kit trees, or deployment credentials. Do not use GitHub's visibility toggle
on this development repository or publish a fork containing its history.

The baseline profile keeps four model-visible tools plus one App-only helper:
`open_travel_starter`, `plan_flight_search`, `search_flights`,
`verify_flight_offer`, and App-only `select_flight_offer`. Expanded profiles add
hotel and illustrative ancillary tools; inspect the chosen entrypoint.

## Owner decision required

- [x] Adopt Apache License 2.0; copyright holder: Noodle Seed (owner confirmed 2026-09-08).
- [x] Record owner confirmation of Nuitée wordmark redistribution (2026-09-08); preserve attribution and trademark boundaries in `THIRD_PARTY_NOTICES.md`.
- [x] Confirm the private security and conduct reporting destination: `asad@noodleseed.com` (owner confirmed 2026-09-08; recorded in `SECURITY.md` and `CODE_OF_CONDUCT.md`).
- [ ] Review `NOTICE`, third-party notices, and platform-specific dependency licenses for the actual distribution. An automated metadata audit is not a rights determination.
- [ ] Approve `CODE_OF_CONDUCT.md`; its private enforcement route is confirmed above.

## Reproducibility and repository controls

- [x] Keep application dependencies and the package manager pinned with one committed workspace lockfile.
- [x] Exclude bundled generated examples from the public export; local regeneration is optional. The generated-guidance audit rejects mutable dependencies if examples are distributed.
- [x] Use credential-free ordinary tests, fictional fixtures, fixed provider connectors, bounded outputs, and no fixture fallback after a live failure.
- [x] Gate Fly deployment on explicit opt-in and adopter-owned app, website URL and assistant settings.
- [x] Use the Developer Certificate of Origin without a CLA and community support without an SLA.
- [ ] Verify main-branch protection, required CI and reviewer ownership on the destination repository.
- [ ] Verify secret scanning, push protection, Dependabot and private vulnerability reporting on the destination repository.
- [ ] Verify code scanning availability and enable it for the public destination.

Control settings belong to the destination repository and do not transfer with
source files. Private source CI passing does not prove these public controls. Review queue settings
explicitly for the destination repository.

## Host and production promotion (conditional)

These gates apply when an adopter promotes a hosted service or claims a specific
host is verified. They are not prerequisites for distributing a clearly labelled
source preview.

- [ ] Configure one real public embed ID and exact allowed HTTPS website origin; prove wrong-origin requests fail closed.
- [ ] Configure and monitor a real HTTPS privacy URL, support route, retention policy, budget and kill switch.
- [ ] Run anonymous Search → Select → Verify and hotel search/selection in the intended browser and MCP host, including errors and accessible mobile states.
- [ ] Prove the 30-minute selection TTL, stale rejection, fresh write, caller isolation and session reset on one unrestarted target.
- [ ] Configure a real dedicated widget origin and pass the relevant host gate before claiming host compatibility.
- [ ] Prove live field provenance, explicit unknowns and safe state-read failure handling for any newly added capability.

Booking, payment, ticketing, loyalty transactions and protection purchases remain
unsupported. The session/domain foundation modules are preparatory and inactive.

## Transition-day actions — not authorized by a preparation PR

- [ ] Approve the exact exported candidate and create a **new** public repository with fresh history.
- [ ] Re-run setup anonymously against its exact public revision.
- [ ] Enable GitHub template status after the anonymous checks pass.
- [ ] Publish an initial version and release notes describing actual capabilities and known limitations.

A preparation PR never authorizes publication, deployment, auto-merge, or entry
into a merge queue. Keep the PR unarmed until a maintainer explicitly requests
its next step.
