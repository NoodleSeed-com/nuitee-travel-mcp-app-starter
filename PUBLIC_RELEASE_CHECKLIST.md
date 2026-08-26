# Public release checklist

This is the decision gate for making the repository public, marking it as a template, or publishing a release. Local implementation evidence does not authorize remote repository changes.

## Completed local foundations

- [x] Exact `@noodleseed/one` and Assistant pins agree across manifests, lockfile, install, and generated guidance.
- [x] Default, live, and embedded entrypoints reuse one travel-server factory.
- [x] The default server and `pnpm ci:offline` require no Nuitee or model credential.
- [x] Nuitee network authority is server-only, fixed-origin, fixed-path, bounded, and hermetically tested.
- [x] The model-visible catalog contains only open, search, and verify tools.
- [x] Fixtures are fictional, offline-only, and never a live fallback.
- [x] Presentation customization is bounded, deterministic, exact-origin validated, and credential-blind.
- [x] CI Actions are full-SHA pinned, checkout credentials are not persisted, and Dependabot covers npm plus Actions.
- [x] Reachable text blobs pass the sanitized secret-pattern audit, and each tracked binary release artifact is held to an exact Git-blob review allowlist; the two current fictional widget PNGs received visual review.
- [x] The installed dependency graph has no npm advisories and no unknown or unlicensed package-metadata groups at the reviewed release candidate.

## Private ready-to-toggle gates

Everything in this section may be completed while the repository remains private. Completing these gates does not authorize repository visibility, template, release, deployment, access, or submission changes.

### Owner decision required

- [x] Adopt Apache License 2.0 for the repository and declare it in package metadata.
- [ ] Confirm the copyright holder and whether generated Agent Kit guidance/examples or dependencies require a repository `NOTICE` file.
- [ ] Choose and configure a monitored private vulnerability-reporting route, then replace the placeholder section in `SECURITY.md`.
- [ ] Approve a Code of Conduct and a monitored enforcement contact, or explicitly decide not to adopt one before launch.
- [x] Assign repository-wide ownership to the verified maintainers `@WahabShah23`, `@asadatnoodle`, and `@hassan50306` in `.github/CODEOWNERS`.
- [x] Use the Developer Certificate of Origin without a CLA, provide community support through GitHub Issues and Discussions without an SLA, and document the boundary in `CONTRIBUTING.md` and `SUPPORT.md`.
- [x] Use the approved repository description and topics, squash-only merges with branch cleanup, SemVer beginning at `v0.1.0`, and enable GitHub template status only after the final public audit.

### Technical and evidence gates

- [x] Bound each provider journey's fallback-offer list before normalization and omit operating-carrier logos so the public output matches the documented marketing-carrier-only image exception.
- [ ] Replace every mutable dependency selector in bundled runnable Agent Kit examples with reviewed exact pins, add an exact package-manager declaration and reproducible lock coverage, then regenerate both managed trees. The pinned 0.139.0 kit and the inspected 0.140.0 package still emit `latest`; `pnpm audit:generated-guidance` and therefore `pnpm audit:release` must fail closed until the upstream generator is fixed.
- [ ] Regenerate the Acme Bistro flagship so its runnable mock no longer claims to mint a signed, expiring checkout URL. Keep payment examples explicitly non-production until an authoritative backend actually owns cart pricing, inventory, signature, and expiry.
- [ ] Resolve and prove the complete caller-state write → expire → fresh-write lifecycle without redeployment. Exact `0.136.0` and `0.137.0` both rejected the expired selection correctly, then returned a tool-level error with no structured output on the same server's fresh search. Keep the 30-minute TTL and revision protection; do not add an application reset workaround.
- [x] On exact `0.138.0`, proved a 4,207,267-byte decoded round-trip response maps to ten bounded itineraries under the search-only 6 MiB limit; the global/default and verification limits remain unwidened.
- [x] Rechecked a bounded live one-way search and same-session active-fare verification with the owner-authorized sandbox key on exact `0.137.0`; the owner also confirmed repeat verification in ChatGPT after the selection fix.
- [x] Rechecked a bounded round trip on exact `0.138.0`: valid documented JSON mapped to ten itineraries, every retained itinerary contained complete outbound and return legs, and one application selection verified successfully in the same session. Do not add multicity until Nuitee documents deterministic 3+ leg response mapping.
- [ ] Set `DEPLOYMENT_WIDGET_ORIGIN` to one real deployment-owned widget domain, configure it with `pnpm customize -- --widget-domain "$DEPLOYMENT_WIDGET_ORIGIN"`, then pass the ChatGPT target gate before claiming or submitting ChatGPT compatibility.
- [x] The committed Chromium fixture gate covers 280px/320px overflow, wider inline/fullscreen layouts, 400% CSS-zoom reflow, keyboard/focus, touch targets, light/dark themes, reduced motion, and selection interaction without provider access.
- [x] Captured reproducible Chromium product images from the actual widgets using only network-disabled fictional fixtures, without host conversation chrome, live inventory, offer IDs, user data, production URLs, or third-party carrier logos.
- [ ] Complete owner/legal review of dependency-license compatibility, notices, and package provenance. Automated package metadata is evidence, not legal approval.
- [x] The 2026-08-24 fixture review found `QZX`/`QZY`/`QZH` unassigned in IATA's public airport search, confirmed `ZZ` as IATA's computer-test airline designator, and found no bundled third-party airline or font asset; recheck mutable location assignments at release time.
- [x] Exclude hosted Embedded Assistant end-to-end claims from the first release while preserving the optional shared-code companion and offline tests. Re-enter that scope only after its separately owned model-transport investigation passes.

### Private GitHub controls

- [x] Protect `main` with pull requests, one code-owner approval, stale-review dismissal, last-push approval, resolved conversations, strict `offline-quality-gates`, admin enforcement, and force-push/deletion blocking.
- [x] Set default workflow token permissions to read, keep Actions unable to approve pull requests, and enforce full-SHA pinning in the committed workflow.
- [x] Keep the reviewed full-SHA Actions policy for the first release; do not add a narrower repository allowlist until every required action is represented and tested.
- [x] Enable Dependabot alerts/security updates, secret scanning, and push protection.
- [x] Keep squash merge as the only enabled merge method, require web commit sign-off, and delete merged branches automatically.
- [x] Require GitHub Merge Queue after the `merge_group` CI trigger reaches `main`, then prove one approved queued pull request passes `offline-quality-gates` against the latest base without a manual branch update.
- [x] Merge the current readiness changes to `main` through reviewed pull requests.

### Candidate freeze

- [ ] Run `pnpm ci:offline` from the release commit.
- [ ] Run `pnpm audit:release` from the release commit. It intentionally remains red while bundled runnable Agent Kit examples use mutable dependencies; CI continuously runs the offline history and license-metadata portions against a full clone.
- [ ] Update `CHANGELOG.md` with the approved version/date and create release notes from verified evidence.
- [ ] Confirm no environment files, deployment links, credentials, private identifiers, or unreviewed generated artifacts are tracked.

## Transition-day actions — not authorized

Do not execute any transition-day action without separate explicit authorization. These checks necessarily depend on public visibility or create externally visible state, so private readiness work must stop before this section.

- [ ] Switch repository visibility to public.
- [ ] Re-audit the repository and five-minute setup anonymously from the exact public revision.
- [ ] Enable code scanning and private vulnerability reporting where public visibility makes them available, then verify both controls.
- [ ] Enable GitHub template status last.
- [ ] Publish or deploy only under separate explicit authorization.
