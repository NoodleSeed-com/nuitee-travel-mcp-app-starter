# Contributing

Build useful agentic travel experiences with small, reviewable changes. The
starter uses TypeScript, Node 24+, pnpm 11.17.0 and a committed workspace lock.

## Local setup

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm exec playwright install chromium
pnpm check:browser
```

Read the README, `AGENTS.md`, `docs/architecture.md` and, before any user-facing
change, the full `docs/brand/wayfare-brand-guidelines.md`. Optional local agent
guidance can be generated with `pnpm exec noodle agents setup --write`; see
[generated guidance](docs/generated-agent-guidance.md). Do not redistribute
bundled generated examples or import them into the application.

## Develop and verify

For a behavior change, add a focused failing test, implement the smallest
coherent change, then rerun the focused suite and relevant full checks. Keep
fixtures fictional and bounded. Update public capability, privacy and provider
documentation when behavior changes.

```sh
pnpm ci:offline
pnpm check:browser
```

`ci:offline` validates configuration, audits reachable history and dependency
license metadata, runs application tests, checks the default/live/embedded MCP
contracts, and builds the Next.js website and authenticated-host example. It
requires installed dependencies but no provider credentials or Noodle account.
Browser checks are separate and use fictional fixtures. Application CI runs the
build and contract checks; the public-candidate workflow runs browser checks and
the release audit against the actual repository with full history.

`pnpm audit:release` additionally enforces public file/link boundaries, generated
example reproducibility and current dependency advisories. Run it directly in
this repository. Internal notes and regenerated agent tooling stay untracked.
Advisory checks require network access.

## Security and provider contracts

- Never include credentials, raw provider responses, offer identifiers, customer
  data or private URLs in code, fixtures, issues, screenshots or logs.
- Keep origin, path, method and credential injection connector-owned. End users
  must never paste provider keys into conversation.
- Preserve caller-scoped opaque selections, TTL/revision checks, bounded lists,
  explicit provenance and safe public errors.
- A provider failure must never activate fictional fallback inventory.
- Ordinary tests require no live network or identity. Use the existing test
  harness and fictional input; do not call providers to make CI pass.
- Flight and hotel reads are supported integration paths. Rewards and protection
  are illustrative. Booking, payment and real loyalty transactions require new
  contracts, authorization and implementation; they are not starter features.

Report suspected vulnerabilities through [SECURITY.md](SECURITY.md), never a
public issue. Community assistance and its no-SLA boundary are in [SUPPORT.md](SUPPORT.md).

## Dependencies and generated files

Keep direct versions exact and regenerate the lock with pnpm. Verify advisories,
licenses, typechecks, application/host tests, browser behavior and builds after a
runtime upgrade. Bounded overrides must explain the vulnerable range and patched
version. Preserve the workspace's minimum-release-age policy.

Never hand-edit Noodle managed hashes or examples. Updating generated local
guidance is a separate reviewed change and does not make it part of the public
source distribution.

## Review and contribution terms

Describe the problem, resulting behavior, evidence, and material limitations in
the PR. Get maintainer approval before merging. Do not enable auto-merge or add
a PR to GitHub's Merge Queue without explicit authorization. The destination
repository's branch protections and queue settings are owner-managed controls.

Contributions are licensed under the [Apache License 2.0](LICENSE). This project
uses the [Developer Certificate of Origin 1.1](https://developercertificate.org/)
and does not use a Contributor License Agreement. Sign off commits:

```sh
git commit --signoff
```

The sign-off uses your real name and reachable email to certify your right to
submit the contribution under the project's license. Be respectful, constructive
and protective of user privacy in all community interactions.
