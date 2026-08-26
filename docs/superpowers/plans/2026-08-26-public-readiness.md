# Private Public-Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the repository to an evidenced ready-to-toggle state while it remains private.

**Architecture:** Preserve the current flights-first Noodle Seed application and close only the release-evidence, configuration, security, legal, and clean-room developer-experience gaps. Separate private readiness gates from transition-day actions so routine work cannot publish, deploy, submit, or change visibility.

**Tech Stack:** TypeScript, Noodle Seed 0.139.0, React 19, Vitest 4, Playwright, pnpm 11, GitHub Actions.

**Spec:** `PUBLIC_RELEASE_CHECKLIST.md`

## Global Constraints

- Keep the repository private and `is_template: false`.
- Do not create a tag or GitHub Release.
- Do not link, configure, deploy, roll back, connect, or submit a hosted Noodle target without separate explicit authorization for the exact target.
- Keep `NUITEE_API_KEY` and every other credential out of prompts, logs, fixtures, screenshots, tests, documentation, and Git history.
- Preserve the 1,800-second caller-state TTL and expected-revision protection; do not add an application reset workaround.
- Preserve the first-release exclusion for hosted Embedded Assistant claims.

---

### Task 1: Isolate and record the readiness work

**Files:**
- Modify: `.gitignore`
- Create: `docs/superpowers/plans/2026-08-26-public-readiness.md`

- [x] Create branch `169/public-readiness` in an isolated worktree.
- [x] Verify the baseline unit and Chromium suites pass.
- [x] Ignore `.pnpm-store/` and `.worktrees/` without committing either directory.
- [x] Commit the isolated readiness foundation.

### Task 2: Separate readiness evidence from publication actions

**Files:**
- Modify: `PUBLIC_RELEASE_CHECKLIST.md`
- Modify: `test/repository-readiness.test.ts`

- [x] Add a failing repository-contract test for distinct ready-to-toggle and transition-day sections.
- [x] Reorganize the checklist without marking unproven items complete.
- [x] Verify the focused repository test and full unit suite.
- [ ] Commit the checklist contract.

### Task 3: Add a safe real widget-domain configuration path

**Files:**
- Modify: `src/starter-config.ts`
- Modify: `src/travel-server.ts`
- Modify: `scripts/customize.mjs`
- Modify: `test/customization.test.ts`
- Modify: `test/server-contract.test.ts`
- Modify: `README.md`
- Modify: `docs/customization.md`
- Modify: `docs/troubleshooting.md`

- [ ] Write failing tests for absent, placeholder, wildcard, non-HTTPS, path-bearing, and mismatched widget domains.
- [ ] Add an optional exact `widgetDomain` config and `--widget-domain` customization option.
- [ ] Apply the same configured domain to both widget policies while preserving an intentionally unconfigured default.
- [ ] Verify generic checks still pass and the ChatGPT target remains blocked until an owner supplies a real domain.
- [ ] Commit the configuration path without inventing an owner domain.

### Task 4: Prove the caller-state lifecycle on exact 0.139.0

**Files:**
- Modify: `docs/live-smoke-evidence.md`
- Modify: `docs/troubleshooting.md`
- Modify: `PUBLIC_RELEASE_CHECKLIST.md`

- [ ] Start one unrestarted live server and one persistent MCP session with an owner-authorized sandbox credential.
- [ ] Search, select, and verify one application-issued fare.
- [ ] Wait at least 1,805 seconds.
- [ ] Confirm the expired selection is rejected safely.
- [ ] On the same server and session, complete a fresh search, fresh selection, and successful verification.
- [ ] Record only sanitized statuses, aggregate counts, exact versions, and the tested revision.
- [ ] If the fresh write fails, preserve the sanitized failure and leave the release gate blocked pending an upstream runtime fix.

### Task 5: Prepare owner security and legal decisions

**Files:**
- Modify: `SECURITY.md`
- Modify: `PUBLIC_RELEASE_CHECKLIST.md`
- Modify: `CONTRIBUTING.md` when the Code of Conduct decision requires it
- Create: `NOTICE` only when the copyright and notice review requires it
- Create: `CODE_OF_CONDUCT.md` only after the owner selects the policy and monitored enforcement contact

- [ ] Inventory shipped notices and dependency-license metadata without treating automation as legal approval.
- [ ] Obtain the copyright-holder and NOTICE decision.
- [ ] Obtain and test a monitored private vulnerability-reporting route.
- [ ] Obtain the Code of Conduct and enforcement-contact decision.
- [ ] Record named approvers and dates without inventing contacts or legal conclusions.

### Task 6: Run the private release-candidate gate

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `PUBLIC_RELEASE_CHECKLIST.md`
- Create: `docs/releases/v0.1.0.md`

- [ ] Complete a clean-room clone with no credentials and follow the five-minute README setup.
- [ ] Run `pnpm test:browser`, `pnpm ci:offline`, and `pnpm audit:release` from the exact candidate commit.
- [ ] Run the ChatGPT target check after a real widget domain is configured.
- [ ] Verify the exact candidate succeeds through GitHub Merge Queue.
- [ ] Freeze `v0.1.0` notes using the actual UTC freeze date without creating a tag or GitHub Release.
- [ ] Confirm the repository remains private, non-template, unpublished, and undeployed.

### Transition-day runbook: explicitly not executable under this plan

- [ ] Obtain separate explicit authorization.
- [ ] Switch visibility to public.
- [ ] Perform an anonymous clone and public-only security-control audit.
- [ ] Enable private vulnerability reporting and any public-only code-security controls.
- [ ] Enable template status last.
- [ ] Publish `v0.1.0` only after the exact public revision passes every gate.
