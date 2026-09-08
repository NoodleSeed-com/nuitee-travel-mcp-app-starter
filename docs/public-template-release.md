# Making this repository public

Wayfare is an example agentic travel project by Noodle Seed. This repository is
the starter: a separate export repository is optional, not required.

## Verify the reviewed revision

From a normal checkout with complete Git history:

```sh
corepack enable
CI=true pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm ci:offline
pnpm check:browser
pnpm audit:release
```

Application CI validates, tests and builds the starter. The public-candidate
workflow audits the actual checkout with full history and runs browser checks.
It does not filter files or replace history before auditing, so accidentally
tracked internal files fail the release gate. Public paths are defined in
`scripts/public-template-policy.mjs`; changes to that allowlist need review.

Advisory scans require registry access. Missing package-store metadata requires
a clean frozen install before interpreting the license audit. Do not ignore
failed scans.

## Review what becomes visible

Removing a file from the current tree does not remove it from Git history.
Review retained history and GitHub discussions, PRs, issues and Actions logs for
material that should stay private. Credential scans and the exact binary review
register support this review; they cannot decide whether historical business
notes are suitable for publication. Resolve any confirmed sensitive material
before changing visibility. A history rewrite requires a separate, explicit
maintainer decision because it changes commit IDs and can disrupt open PRs.

Use [the release checklist](../PUBLIC_RELEASE_CHECKLIST.md) to record the final
revision and remaining repository settings. Keep preparation PRs unarmed.
Changing visibility, deleting remote history or enabling deployment requires
explicit owner authorization.

## Scope

The source release provides a credential-free UI preview and documented
integration points. Adopters configure their own provider accounts, hosted
assistant and deployment settings. Live flight and hotel reads are supported
integration paths; experiences and other ancillaries are illustrative. Booking
and payment are unsupported. Source publication does not establish hosted
production or named-host compatibility.

README captures follow [the Wayfare brand guidelines](brand/wayfare-brand-guidelines.md)
and render real components with fictional data. They are not live-search proof.

## Optional source-only export

For a separate source snapshot, the exporter remains available:

```sh
pnpm export:public -- --ref HEAD --out /absolute/new/travel-starter
```

It reads immutable Git blobs from the selected commit, applies the public
allowlist and supplies project-owned root agent context. It excludes `.git`,
untracked files, installed dependencies and local environments, and refuses
existing destinations and symlinks. Review and validate the resulting snapshot
before distributing it. Exporting does not change this repository's history.
