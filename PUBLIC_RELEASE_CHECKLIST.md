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
- [x] All reachable Git blobs passed this remediation's bounded, sanitized secret-pattern audit; only placeholder environment templates have ever been tracked.
- [x] The installed dependency graph has no npm advisories and no unknown or unlicensed package-metadata groups at the reviewed release candidate.

## Owner decision required

- [ ] Select a source license and copyright holder. Confirm the chosen license permits redistribution of generated Agent Kit guidance/examples; add notices if required.
- [ ] Choose and configure a monitored private vulnerability-reporting route, then replace the placeholder section in `SECURITY.md`.
- [ ] Approve a Code of Conduct and a monitored enforcement contact, or explicitly decide not to adopt one before launch.
- [ ] Supply valid CODEOWNERS users/teams and review boundaries.
- [ ] Decide public support, governance, and contributor legal policy (DCO, CLA, or neither). Do not promise an SLA without staffing it.
- [ ] Approve repository description, topics, merge strategy, release/tag policy, and whether the repository becomes a GitHub template.

## Technical and evidence gates

- [ ] Resolve and prove the caller-state write → expire → fresh-write lifecycle without redeployment. Keep the 30-minute TTL and revision protection.
- [ ] Prove a representative large live search maps successfully under the search-only 6 MiB limit; do not raise the global/default limit.
- [ ] Recheck a bounded round trip and same-session fare verification with the owner-authorized sandbox key. Do not add multicity until Nuitee documents deterministic 3+ leg response mapping.
- [ ] Add one real deployment-owned widget domain and pass the ChatGPT target gate before claiming or submitting ChatGPT compatibility.
- [x] The committed Chromium fixture gate covers 280px/320px overflow, wider inline/fullscreen layouts, 400% CSS-zoom reflow, keyboard/focus, touch targets, light/dark themes, reduced motion, and selection interaction without provider access.
- [ ] Capture only verified, sanitized fixture-based product images, without host conversation chrome, live inventory, offer IDs, user data, production URLs, or third-party carrier logos.
- [ ] Complete owner/legal review of dependency-license compatibility, notices, and package provenance. Automated package metadata is evidence, not legal approval.
- [x] The 2026-08-24 fixture review found `QZX`/`QZY`/`QZH` unassigned in IATA's public airport search, confirmed `ZZ` as IATA's computer-test airline designator, and found no bundled image/font asset in the tracked tree; recheck mutable location assignments at release time.
- [ ] Keep the optional Embedded Assistant limitation explicit until its separately owned hosted model-transport investigation passes. This does not block the credential-free default MCP starter when no hosted-E2E claim is made.

## Remote GitHub controls (requires explicit approval)

- [ ] Protect `main` with pull requests, at least one approval, stale-review dismissal, resolved conversations, the canonical CI check, and force-push/deletion blocking.
- [ ] Set default workflow token permissions to read, keep Actions unable to approve pull requests, restrict allowed Actions, and enforce full-SHA pinning.
- [ ] Enable Dependabot alerts/security updates, secret scanning and push protection, code scanning where available, and private vulnerability reporting.
- [ ] Decide delete-branch-on-merge and merge methods; do not infer maintainer preferences.
- [ ] Merge readiness changes to `main`, re-audit anonymously, switch visibility, verify public-only security controls, and enable template status last.

## Release

- [ ] Run `pnpm ci:offline` from the release commit.
- [ ] Run `pnpm audit:release` from the release commit; CI continuously runs its offline full-history and license-metadata portions against a full clone.
- [ ] Update `CHANGELOG.md` with the approved version/date and create release notes from verified evidence.
- [ ] Confirm no environment files, deployment links, credentials, private identifiers, or unreviewed generated artifacts are tracked.
- [ ] Publish or deploy only under separate explicit authorization.
