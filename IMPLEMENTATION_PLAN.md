# Implementation plan

## Status and governing decisions

The implementation is complete through offline/static gates plus prior owner-authorized local sandbox search/verify evidence. Deployment, publication, and public-release claims remain outside the completed evidence.

| Decision | Resolution |
| --- | --- |
| Package | Pin `@noodleseed/one` exactly to `0.136.0`; regenerate the lockfile and Agent Kit on every update. |
| Operational scope | Flights search and fare verification only. |
| API contract | Current official Nuitee Flights OpenAPI is source of truth; prose informs workflow and ambiguity notes. |
| Entry points | Credential-free `src/server.ts`; managed-secret live composition `src/live-server.ts`. |
| Secret | One deployment-owner `NUITEE_API_KEY`, injected server-side as `X-API-Key`. |
| Search | One-way and round-trip JSON `POST /flights/rates`; no streaming or multicity in v1. |
| Airport lookup | Omit `find_airports` until the published Noodle connector can execute the verified official GET directly; require IATA codes. |
| Selection provenance | Caller-scoped private Noodle state, 30-minute TTL, application opaque ID, provider offer ID never public. |
| Verify | Resolve state before provider call; changed price is success; stop before prebook. |
| Widgets | TravelHome and FlightResults only. |
| Fixtures | Hermetic, fictional, test-only; never a production fallback. |
| Embedded assistant | Valuable optional path that reuses the live server; not part of the default baseline. |
| License | None until owner approval; public-release blocker. |

## Phase 0 — preflight and bootstrap (complete)

Dependencies: none.

1. Verify repository path, exact Git remote, private/empty state, clean starting tree, and intended `main` branch.
2. Query npm for current `@noodleseed/one`; stop for approval if it differs from the approved version.
3. Initialize the widget scaffold using the exact approved CLI version, pnpm, and Codex/Claude instructions.
4. Install, generate Agent Kit, run doctor, and stop if restart is required.
5. Scope Vitest to `test/**/*.{test,spec}.{ts,tsx}`.
6. Run the untouched baseline. Record and stop on failure.

Correction outcome: the reviewed scaffold failure was narrowly corrected by pinning the approved exact package, regenerating the lock, refreshing Agent Kit, and removing the active embedded-assistant block from the default server. The repository now resolves exact `0.136.0`; the generated Codex and Claude instructions identify Agent Kit `0.81.0`, and `noodle agents doctor --json` reports both targets current with no restart required. The corrected baseline requires neither a provider nor assistant-model credential.

## Phase 1 — primary-source and reference audit (complete)

Dependencies: Phase 0.

### Official Nuitee

- Verify origin/base, auth, search, verify, airport lookup, errors, access, sandbox limitations, and booking workflow from official sources.
- Use [openapiflights.json](https://docs.liteapi.travel/openapi/openapiflights.json), not copied schemas or sample-app behavior.
- Record prose/OpenAPI disagreements in `docs/nuitee-flights-contract.md`.

### Tribe Tourism findings

Confirmed at the audited reference revision:

- Skybridge and Alpic, not `@noodleseed/one`.
- Silent sample-flight substitution on missing credentials and failed calls.
- Direct Tribe checkout path with no separate fare verification.
- Hardcoded Tribe branding/domains.
- Passenger mapping and request assumptions diverge from the current documented Nuitee contract.
- Hotel implementation is much larger than flights.
- No hermetic public-starter test suite.
- Fixed-width/carousel and focus/touch behavior need additional 280px/accessibility work.

Retain only independent product ideas: conversational discovery, compact comparison cards, boarding-pass-inspired hierarchy, and a clear selection-to-verification step. Copy no code, assets, branding, Skybridge plumbing, Alpic config, fallback data, or checkout behavior.

### TD branch lessons

Retain independently implemented patterns: fixed-origin connector authority, search/verify separation, bounded normalization, hermetic connector mocks, widget state coverage, and explicit App-only behavior where useful.

Do not carry over banking/rewards scope, TD branding/data/assets, real-airline fixtures, raw provider offer IDs, or historical workarounds without re-verification. The audited branch's raw `offerId` input is explicitly rejected here. Its historical response-size and host-rendering observations are treated as evidence to retest, not as current API guarantees.

## Phase 2 — failing tests (complete)

Dependencies: Phase 1 contract decisions.

Tests were authored before their implementation modules and first failed on missing runtime, live entrypoint, and widgets. Coverage includes:

- Fixed base/origin/path/method/header policy and no model-controlled transport authority.
- Secret name only in the managed connector declaration; no raw credential in public output.
- One-way/round-trip request construction and leg direction.
- IATA, different airports, ISO/not-past dates, later return date.
- Adult/child/infant counts, total cap, infant/adult rule, and exact age-array relationships.
- Cabin, currency, and point-of-sale validation.
- Search success, empty, partial, malformed, oversized, max ten, round-trip directional normalization, strict segment/duration/price bounds, baggage ≤4, and messages ≤6.
- 400, 401, 403, verify 404, 429, 500, 502, 503, timeout, credential-unavailable, and oversized classification.
- Verification success, unchanged/changed fare, unavailable response, locally expired offer, active-search mismatch, unknown/stale selection, and no provider call on failed provenance.
- Exact three-tool catalog, connector/state policy assertions, portable home context, and absence of airport/transaction/future-domain/arbitrary-HTTP tools.
- TravelHome and FlightResults loading, error, malformed, empty, partial, changed-price, expired, retry, and success states.
- Three inline/ten fullscreen, no booking actions, noninteractive coming-soon items, focus/touch/280px/overflow/reduced-motion CSS safeguards.

## Phase 3 — shared flight implementation (complete, offline evidence)

Dependencies: Phase 2 failing tests.

1. Define bounded public/private Zod schemas.
2. Implement one self-contained compute gateway for validation, classification, normalization, and safe provider-call orchestration.
3. Author one fixed Nuitee HTTP connector with exactly two operations and managed `X-API-Key` auth.
4. Set compute limits to 12 seconds and one host call. Apply a 6 MiB connector/application cap only to search; retain the 750,000-byte application cap for verification.
5. Normalize at most ten itineraries with explicit outbound/inbound legs; reject missing direction, per-leg duration, total duration, invalid code, or unbounded numeric facts rather than inventing them. Remove arbitrary logos, internal fare codes, raw responses, and provider IDs; retain only an optional exact-allowlisted Nuitee-hosted carrier image.
6. Generate opaque application selections; store upstream IDs only in caller-scoped state.
7. Resolve selection state inside the compute gateway before verify, preventing arbitrary offer proxying.
8. Build the two entrypoints from one server factory; do not duplicate business definitions.

Stop condition: do not fake optional credentials, inject a sentinel secret, or route around managed auth. If the live composition does not statically validate through the public SDK, stop and report the package evidence.

## Phase 4 — widgets (complete, SSR/static evidence)

Dependencies: public schemas and tool surface from Phase 3.

1. Replace scaffold preferences UI with TravelHome and FlightResults.
2. Use public `@noodleseed/one/react` primitives plus bounded local CSS.
3. Keep widget CSP empty; browser code calls Noodle tools only.
4. Keep coming-soon domains static and noninteractive.
5. Use a shared labelled SearchEditor in TravelHome and FlightResults. Natural place-name submissions use an explicit host follow-up, while the browser remains provider- and credential-free.
6. Use public app-flow state for Search/Edit → Results → Verified fare review, including Back navigation.
7. Require explicit card selection, then expose one **Verify selected fare** action; successful verification advances to the review state.
8. Preserve provider airport-local schedule text without converting it into the viewer's timezone; render search/offer freshness, bounded fare/term/amenity detail, and verification messages.
9. Label the final state as a fare review and explicitly not a ticket or reservation. Expose no default handoff.
10. Validate nested structured content defensively before rendering, and test pure render components with mocked host helpers; validate bundled widgets with Noodle.

Remaining UI release evidence: interactive real-browser checks at 280px/light/dark/keyboard/reduced-motion and one real host per claimed compatibility target.

## Phase 5 — documentation (complete)

Dependencies: resolved architecture.

- `README.md`: purpose, omissions, setup, credentials, two consumption modes, commands, prompts, failures, customization, updates.
- `SPEC.md`: authoritative product/tool/UI/security/evidence/future boundary.
- `IMPLEMENTATION_PLAN.md`: phases, dependencies, stops, findings, release checklist.
- `docs/architecture.md`: browser/tool/connector/provider flow and private selection state.
- `docs/nuitee-flights-contract.md`: official endpoint/field/error contract and ambiguities.
- `docs/customization.md`: safe extension points.
- `docs/troubleshooting.md`: operator error taxonomy.
- `docs/EMBEDDED_ASSISTANT.md`: optional authenticated embed path.
- `SECURITY.md`: secrets, reporting, supported security boundary.
- `CONTRIBUTING.md`: pnpm, test-first, offline CI, generated Agent Kit, review gates.

## Phase 6 — verification (complete for offline/static evidence)

Dependencies: Phases 3–5.

Run in this order:

```sh
pnpm install
pnpm exec noodle agents setup --write
pnpm exec noodle agents doctor --json
pnpm test
pnpm exec noodle validate --json
pnpm exec noodle test --json
pnpm exec noodle tools list --json
pnpm exec noodle check --json
pnpm exec noodle validate src/live-server.ts --json
pnpm exec noodle check src/live-server.ts --json
```

Then perform source/secret scans and inspect the tool catalog. Do not run provider-backed tools without an owner-provided managed key, entitlement, safe input, and explicit authorization.

The repository-owned CI workflow runs only the credential-free protocol gates and static live validation. Test setup replaces global `fetch` with a failing stub so ordinary application tests cannot silently turn into provider calls.

Stop and report any failing command with exit status, structured error, package version, and Agent Kit version. Use debugging guidance only for concrete failures.

Executed result: the ordered credential-free baseline passes, including the hermetic Vitest suite, authoring validation, MCP protocol smoke, the exact three-tool catalog, and generic readiness. Live and embedded entrypoints pass static validation/readiness. The ChatGPT target remains intentionally blocked until an owner supplies one real widget domain; the embedded target cannot invent the embedding product's customer identity provider. Prior bounded live search and same-session verification evidence exists; real browser/host evidence and broader provider error-shape evidence remain Phase 7.

## Phase 7 — owner-authorized live and host proof (partially executed)

Dependencies: owner credential, Nuitee Flights access, explicit live-call authorization, and successful Phase 6.

1. Complete: owner configured a sandbox `NUITEE_API_KEY` through the managed local secret path.
2. Complete: a bounded one-way search and a verify against its selection passed in the same local MCP session.
3. Complete for the tested happy path: populated mappings were bounded and neither key nor upstream offer ID appeared in public output.
4. Pending: the latest airport direct/connector comparison was inconclusive because the direct control redirected to HTML; keep the tool omitted until equivalent current requests both pass.
5. Partially complete: the former 1 MiB connector blocker now has a supported 6 MiB search-only configuration and hermetic 4.96 MB mapping proof. A successful representative large live response still requires recheck after deployment.
6. Exercise widgets in DevTools at 280px, light/dark, keyboard, reduced motion, empty/error/changed/expired states.
7. Connect each named external host and verify fallback plus App rendering before claiming compatibility.
8. Remove local diagnostic data according to operator policy; never commit runtime secret stores.

Stop on missing entitlement, inconsistent sandbox inventory, provider ambiguity, or any secret exposure. Never replace failure with fixtures.

## Phase 8 — public release (blocked)

Dependencies: Phase 7 evidence and owner decisions.

- [ ] Owner selects and adds a source license.
- [ ] Owner approves public visibility and repository description.
- [ ] Credentialed sandbox smoke passes without sanitized-data concerns.
- [ ] Owner-authorized smoke confirms the concrete connector runtime error shape and deadline behavior used for public error categories.
- [ ] Real-browser and claimed-host evidence passes.
- [ ] Dependency, asset, provenance, and trademark review passes.
- [ ] Deliberately unassigned fixture location codes are rechecked against IATA's current lookup; fictional names and the reserved computer-test carrier designator remain non-operational.
- [ ] No private reference links, packages, code, assets, credentials, recordings, or customer data exist.
- [ ] Secret scan and Git-history scan pass.
- [ ] README links and clone/setup commands work in a fresh environment.
- [ ] `@noodleseed/one` pin, lockfile, Agent Kit, and full gates agree.
- [ ] Dependabot is enabled without auto-merge.
- [ ] Security reporting contact is finalized.
- [ ] One real dedicated HTTPS widget domain is configured for both widgets before app-store submission; no placeholder origin is shipped.
- [ ] No deployment URLs or unverified “official connector” claims appear.

## Developer-experience findings

Four sanitized upstream findings were submitted to the private Noodle Seed feedback tracker on 2026-08-05 and mirrored as public-starter reference issues in this repository. A fifth hosted state-expiry finding was submitted and mirrored on 2026-08-12. The private tracker references are identifiers only; there are no public tracker URLs.

### Resolved application defect — ambient time in deterministic compute

The first live search failed because the application gateway used JavaScript `Date` inside a deterministic compute connector, where that ambient global is unavailable. The gateway now parses the server-authoritative `context.temporal` values without `Date`, and regression tests execute search and verify with `Date` explicitly removed.

Classification: application code and test-environment mismatch, not a Noodle defect. Node-only unit execution had hidden the runtime difference; the corrected suite models the compute sandbox.

### Resolved application defect — incomplete compute output schema

The first rich live result reached the gateway but failed before the widget because the compute connector returned `searchContext` without declaring it in its strict output schema. The schema now declares the field, and a regression test parses the complete gateway result before any live smoke.

Classification: application contract mismatch, not a Noodle or Nuitee defect. A representative live YQY–YHZ search now returns ten populated normalized options through the composed tool.

### Significant — initializer version drift

Tracking: Noodle feedback `fb-957`; [GitHub issue #4](https://github.com/NoodleSeed-com/nuitee-travel-mcp-app-starter/issues/4).

Running an exact-version initializer historically produced a manifest containing `"latest"`. The original `0.103.1` run resolved `0.100.0`; a `0.104.1` recheck on 2026-08-05 resolved `0.102.1`. On 2026-08-06, an exact `npx @noodleseed/one@0.105.0 init` still wrote `"@noodleseed/one": "latest"`; the untouched pnpm install resolved `0.104.2` under the active minimum-release-age policy even though npm's `latest` dist-tag was `0.105.0`. The current repository independently pins exact `0.136.0`, regenerated the lockfile, and verifies manifest/installed/lock agreement instead of assuming the historical initializer behavior is fixed.

Classification: Noodle Seed developer experience, not Nuitee or application code.

### Blocking baseline, corrected — default embedded-assistant credentials

Tracking: Noodle feedback `fb-956`; [GitHub issue #3](https://github.com/NoodleSeed-com/nuitee-travel-mcp-app-starter/issues/3).

The generated widget server activated an embedded assistant and made ordinary `noodle test` require assistant-model configuration. After correcting the fresh scaffold's drift to exact `0.105.0`, its 2026-08-06 local smoke still failed `connector_secret_unresolved` for `ASSISTANT_MODEL_API_KEY` with all three assistant-model settings absent. Noodle 0.116 removes that block from new default scaffolds. This existing starter keeps its separately selected embedded entrypoint as an explicit authenticated-surface opt-in while the credential-free default remains assistant-free.

Classification: Noodle scaffold default for this product shape.

### Significant — optional connector secret mismatch

A public-API probe accepted `secret('NUITEE_API_KEY', { optional: true })` during static validation, but local `noodle test` still failed `connector_secret_unresolved`. An isolated exact-`0.105.0` recheck on 2026-08-06 reproduced the same failure with an absent optional secret. The two-entrypoint composition avoids sentinel credentials and keeps the same business surface.

Classification: Noodle managed-secret/runtime behavior. It blocks a single entrypoint that both starts credential-free and later activates a shared-key connector without regeneration.

### Nice-to-have — nested authoring import packaging

The authoring compiler followed `src/travel-server.ts` but failed to package its nested `src/flights/connectors.ts` import into the temporary graph. Flattening authoring modules under `src/` fixed the structured `read_error` with no product change.

Classification: Noodle authoring compiler/module-layout behavior.

### Resolved capability, live recheck pending — HTTP body-cap configurability

Tracking: Noodle feedback `fb-954`; [GitHub issue #1](https://github.com/NoodleSeed-com/nuitee-travel-mcp-app-starter/issues/1).

The exact-`0.105.0` HTTP runtime applied a 1,048,576-byte transport ceiling before response mapping or compute: a 2026-08-06 synthetic check mapped a 1.04 MB JSON response to one tiny field, while a 1.06 MB response returned only `connector failed for operation`. Owner-authorized probes later measured a complete round-trip response at 4,960,533 decoded bytes, above the exact 3 MiB ceiling. `@noodleseed/one` 0.116 raises the opt-in per-operation maximum to 6 MiB; this starter applies 6 MiB only to search and proves that the measured response class completes bounded normalization hermetically. Verification is not widened. Successful live mapping under the 6 MiB configuration remains pending.

Classification: the reported Noodle connector capability is available in 0.107 and the application-side cap mismatch is corrected. Remaining live evidence concerns request/provider behavior, not proof that the response-size fix failed. It does not justify direct browser/provider access or an ungoverned fetch workaround.

### Open — expired caller-scoped state blocks later searches

Tracking: [GitHub issue #5](https://github.com/NoodleSeed-com/nuitee-travel-mcp-app-starter/issues/5) and upstream [Noodle Borg issue #1033](https://github.com/NoodleSeed-com/noodle-borg/issues/1033).

The hosted `flight_selections` handle uses a 30-minute caller-scoped TTL. A fresh deployment restored flight searches, but the same deployment later returned `connector_error (patch_state)` after the state expired; repeating the deployment produced the same temporary recovery and later failure. Source and existing store tests show expired rows reject writes until explicitly pruned, while reliable hosted pruning has not yet been demonstrated.

Classification: upstream state-lifecycle behavior with a temporary deployment-reset mitigation. Do not remove the TTL or weaken revision checks. Keep this finding open until a released fix passes a hosted short-TTL write-expire-write smoke without redeployment.

### Inconclusive on current version — direct airport GET connector incompatibility

Tracking: Noodle feedback `fb-955`; [GitHub issue #2](https://github.com/NoodleSeed-com/nuitee-travel-mcp-app-starter/issues/2).

The documented airport endpoint returned `200 OK` in earlier controls, while the exact-`0.105.0` fixed-origin connector returned only `connector failed for operation "search"`. The 0.107 read-only reproduction did not confirm that earlier connector-only result: the direct control followed one redirect and returned 69 bytes of HTML rather than valid JSON; the connector produced no mapped output or observable public upstream cause.

Classification: current result is inconclusive and should be investigated first as endpoint/redirect/request behavior. Because the direct control did not succeed, the prescribed rubric does not reproduce FB-955 on 0.107. The model-visible airport tool remains omitted until equivalent current direct and connector requests both pass.

### Nuitee documentation ambiguities

OpenAPI/prose disagree on verify pricing fields, provider offer-ID format, streaming path availability, and numeric rate limits. These are provider-documentation findings, handled conservatively in `docs/nuitee-flights-contract.md`; they are not Noodle or application failures.
