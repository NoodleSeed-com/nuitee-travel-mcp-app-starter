# Final whole-branch fix report

Base: `09f6e20e9be4f26aaa6879b8c4cf7ecb971f880f`

## Scope completed

- Made the active conversation single-flight at the composer boundary for both `submitted` and `streaming` hook states. A busy composer remains editable, refuses form submission without calling `sendMessage`, and preserves its draft.
- Added a native `type="button"` control named `Stop generating` only while busy. One activation calls `client.abort()` without resetting the session or duplicating official hook disposal. Stop clears and suppresses transient tool activity until authoritative hook state settles; the preserved draft becomes submittable again when the hook returns to ready.
- Strengthened the reset lifecycle test with a valid structured search plus selection result, a visible `JFK → LIS` / `Fare selected` rail projection, and the final `EMPTY_TRIP` zero state.
- Strengthened linked-App coverage by inspecting both actual `<noodle-app-view>` hosts and proving they receive the distinct `view-1` and `view-2` object identities.
- Rendered `starterConfig.brand.assistantName` in both the primary zero state and active conversation header.
- Added conditional Terms consumers. Settings mirrors Privacy with an explicit `Not configured` fallback; developer help renders Terms only when an exact configured URL exists. The existing exact customization validation was unchanged.

## TDD evidence

Focused RED command:

```text
pnpm --filter @nuitee-travel-starter/web test -- travel-conversation.test.tsx travel-message.test.tsx travel-zero-state.test.tsx developer-page.test.tsx
```

Observed five expected failures: missing Stop, missing zero-state assistant name, missing Settings Terms/fallback, and missing configured Terms links in Settings and developer help. The strengthened linked-view and reset assertions already passed against their existing production paths.

Focused GREEN command:

```text
pnpm --filter @nuitee-travel-starter/web exec vitest run test/travel-conversation.test.tsx test/travel-message.test.tsx test/travel-zero-state.test.tsx test/developer-page.test.tsx
```

Result: 4 files, 41 tests passed. After adding both busy statuses to the table, `travel-conversation.test.tsx` passed 19/19.

## Verification

- `pnpm --filter @nuitee-travel-starter/web typecheck` — passed.
- `pnpm --filter @nuitee-travel-starter/web test` — 10 files, 88 tests passed.
- `pnpm --filter @nuitee-travel-starter/web test:browser` — 5 passed, 1 intentional desktop skip.
- `pnpm --filter @nuitee-travel-starter/web build` — passed; `/`, `/_not-found`, and `/developers` prerendered statically.
- `pnpm test` — 6 files, 159 tests passed.
- `pnpm customize:check` — passed.
- Project-local `noodle validate --json`, `noodle test --json`, `noodle tools list --json`, and `noodle check --json` — all returned `ok:true`.
- Exact `pnpm ci:offline` — exited 0 before commit, including Agent Kit doctor, customization, history and license audits, root tests, default/live/embedded Noodle gates, retained embedded-host checks, web typecheck/tests/browser/build.
- `git diff --check` — passed before the report was added; rerun at handoff.

The first sandboxed bind attempts for Noodle smoke and Playwright returned `listen EPERM`; the same project-local commands passed when rerun with the approved loopback-bind permission. A global `noodle` binary was also older than the project SDK, so all accepted Noodle evidence uses the repository-local CLI selected by the package scripts.

## Remaining boundary

No new product concern was introduced. Existing local-only boundaries remain: the embedded-assistant check still warns that a real privacy URL and customer-auth configuration are required for the respective hosted/public modes; the browser suite reports the known development-only CSP `eval()` warning; hosted deployment, real-provider/host proof, budget mutation, and legacy-host deletion remain outside this fix wave.
