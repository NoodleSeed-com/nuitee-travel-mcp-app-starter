# Contributing

This repository uses pnpm, test-first changes, generated Noodle Agent Kit guidance, and fully offline ordinary tests.

## Setup

```sh
corepack enable
pnpm install
pnpm exec noodle agents doctor --json
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
```

Use Node 24+ and pnpm 11+. Do not switch package managers or remove `pnpm-lock.yaml`.

## Test-first workflow

1. Read `AGENTS.md` and the relevant generated skills/references.
2. Add a focused failing test under `test/**/*.{test,spec}.{ts,tsx}`.
3. Run `pnpm test` and confirm the expected failure.
4. Implement the smallest coherent change.
5. Run the focused suite, then all offline and Noodle gates.
6. Update product/security/provider/customization docs when a contract changes.

Generated Agent Kit examples are documentation assets. Do not import their code or let Vitest discover tests outside the project-owned `test/` tree.

See [docs/generated-agent-guidance.md](docs/generated-agent-guidance.md) for generated-file regeneration, review, and redistribution boundaries. Use the repository issue forms for sanitized bugs and product proposals. Do not report vulnerabilities in public issues; the owner must finalize the private reporting route before public release.

## Offline rule

Ordinary tests and CI must require no provider network, Nuitee key, assistant-model key, Noodle account, or customer identity. Mock the compute gateway's allowlisted `callOperation` function and use fictional fixtures. The Vitest setup fails any accidental global `fetch` call.

The separate `pnpm test:browser` gate renders fictional fixtures in headless Chromium and makes no provider call. Install its local browser once with `pnpm exec playwright install chromium`. It verifies narrow-width overflow, keyboard focus, touch targets, light/dark themes, reduced motion, and selection interaction.

Never make a live provider call merely to get CI green. Live sandbox evidence is an explicitly authorized owner step after offline gates pass.

## Fixtures

- Keep airline names, airline identifiers, itinerary/offer IDs, and inventory fictional.
- Label fixture content as fictional where it could be mistaken for live inventory.
- Do not record or paste upstream responses, customer data, real keys, carrier logos, or private reference assets.
- Keep fixtures bounded and derive focused fictional test cases for missing, malformed, partial, empty, oversized, changed-price, expired, and unavailable behavior.
- Fixture airport codes must be schema-shaped but unassigned when reviewed; recheck them against IATA's current code lookup before public release. Reserved computer-test designators may be used for fictional airlines only when documented.
- Production tool fulfilment must never import from `test/` or return fixtures on failure.

## Full review gates

```sh
pnpm install
pnpm exec noodle agents setup --write
pnpm exec playwright install chromium
pnpm test:browser
pnpm ci:offline
```

`pnpm ci:offline` is the canonical no-secret gate. It checks Agent Kit freshness, validates the safe customization file, runs the root suite, exercises the default local MCP protocol, lists the tool surface, runs default/live/embedded static readiness checks, and typechecks/tests/builds the companion host. Live and embedded entrypoints are only validated statically; CI does not execute provider- or model-backed tools. Do not run those calls without managed credentials, entitlement, safe input, and explicit authorization.

Review the tool list after every change: it must contain only `open_travel_starter`, `search_flights`, and `verify_flight_offer`. Airport lookup remains omitted until its live connector path passes; a future domain remains presentation-only until its full contract and evidence exist.

## Security review expectations

- Exact origin/base/path/method/auth remain connector-owned.
- No transport authority or provider offer ID appears in model inputs.
- No raw provider response/error/logo/internal fare code appears in public output.
- Every list and nested list has an explicit cap.
- Unknown/stale selection IDs stop before provider access.
- Browser/widget CSP remains empty unless a reviewed feature requires a narrowly allowlisted domain.
- Changed fares remain success states; no result implies a hold, reservation, or booking.
- No new secrets or credential-shaped fields appear in source, docs, tests, logs, or artifacts.

## Updating `@noodleseed/one`

The package must stay exact-pinned; never commit `latest`.

1. Report the existing and candidate registry versions.
2. Obtain review for the candidate version.
3. Update the exact pin and run `pnpm install` to regenerate the lock.
4. Run `pnpm exec noodle agents setup --write` and doctor.
5. Re-read changed Agent Kit instructions and relevant skills.
6. Run every default/live/embedded static gate and application test.
7. Review manifests, widgets, connector behavior, state, and error output for breaking changes.
8. Merge only after human review. Do not auto-merge Noodle package updates.

Monthly Dependabot pull requests cover npm and GitHub Actions. They are review prompts, not approval to merge; action updates must remain full-commit-SHA pinned. The workspace also holds newly published packages for 24 hours by default. The current exact Noodle package pair is an explicitly reviewed compatibility-set exception; change that exception only with the pins, lockfile, regenerated Agent Kit, and full gates.

## Change review

A pull request should state product impact, contract source, new failing test, security impact, evidence run, and unexecuted evidence (live provider, host, deployment). Do not mix unrelated generated-kit, dependency, visual, and provider-contract changes when they can be reviewed separately.

No license has been selected. Do not add one or publish the repository without owner approval.
