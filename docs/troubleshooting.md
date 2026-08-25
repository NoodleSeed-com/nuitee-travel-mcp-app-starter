# Troubleshooting

All public errors are sanitized. Inspect structured codes and operator logs without printing credentials, raw provider bodies, or provider offer IDs.

## Missing Nuitee key

**Symptom:** `configuration_required` or local `connector_secret_unresolved` on the live entrypoint.

The default `src/server.ts` is intentionally credential-free. For the shortest live local path, put `NUITEE_API_KEY` in the exact project-root `.env` and run:

```sh
pnpm dev:live
```

Local secret setup does not require `noodle login`. The pinned CLI reads the exact project-root `.env` as a read-only fallback for matching managed declarations; `.env.local` is not that fallback. Alternatively, export the value and run `pnpm exec noodle secrets set NUITEE_API_KEY --runtime local --from-env NUITEE_API_KEY` to write the ignored scoped `.env.noodle` store for the effective local target. The browser never reads either file.

If the value was added or server code changed while DevTools was running, stop it with Ctrl+C and restart `pnpm dev:live`. A local secret does not configure the cloud deployment; hosted setup has its own preflight and managed secret.

Do not add a key literal to `.env.example`, source, a tool argument, or a prompt. Verify the effective local target rather than printing the value.

## Missing Flights access

**Symptom:** `entitlement`, usually from a 403, or Nuitee reports that Flights endpoints are not enabled.

A valid API key may still lack the required environment/account access. Request Flights access through the Nuitee dashboard. Sandbox behavior and production approval are separate; do not rewrite application auth or invent sample results.

## 401 versus 403

- `authentication` / 401: the server credential is missing, invalid, or rejected. Check the managed secret and intended environment.
- `entitlement` / 403: the key authenticated but lacks access to the requested resource. Check Flights enablement.

Never return the provider error body or key to the user.

## Verify 404, expired, or missing offer

**Symptom:** `expired_offer` or `unknown_or_stale_selection`.

Offer IDs expire and must not be reused across sessions. Search again, select a new application result, and verify promptly. Do not accept a raw provider offer ID or bypass caller-scoped state.

## Unavailable fare

**Symptom:** `unavailable_offer` from a response with no safely usable journey.

The selected inventory can disappear even before documented expiry. Return to search; do not present it as held or reservable.

## 429 rate limit

**Symptom:** `rate_limited`.

Back off before retrying. Official pages disagree on exact numeric ceilings, so do not encode one universal rate. Monitor usage in the Nuitee dashboard and coordinate higher limits with Nuitee.

## Provider 502 or other 5xx

**Symptom:** `provider_error`.

This may be provider authentication/routing/content failure. Retry a bounded number of times or adjust the route. If it persists, record only status, endpoint class, time, and sanitized correlation information. Do not log raw bodies or swap in fixtures.

## Service 503

**Symptom:** `service_unavailable`.

The Flights service/provider may be disabled or temporarily unavailable. Retry later and distinguish this from credential/entitlement failures.

## Timeout

**Symptom:** `timeout`.

The compute gateway has a 12-second deadline and one provider host call. Retry or narrow the search. Do not increase the deadline without testing host behavior and user-perceived latency.

## Airport name lookup

**Symptom:** the host cannot confidently resolve a city/airport name to one code.

Version one intentionally exposes no `find_airports` tool. The latest equivalent comparison was inconclusive: the direct control followed one redirect to a small HTML response instead of valid JSON, while the connector produced no mapped output or public upstream cause. Because the control did not succeed, this did not reproduce a connector-only defect. Reconfirm the current official endpoint and equivalent request before changing the connector. The host may translate well-known, unambiguous names internally, but must restate the selected airports and ask for city/region/country clarification when uncertain. Do not guess, substitute test fixtures, call the provider from the browser, or add an arbitrary HTTP tool.

## Oversized response

**Symptom:** `oversized_response` or a connector-level size error.

`@noodleseed/one` 0.116 supports an opt-in per-operation maximum of 6 MiB. This starter applies 6 MiB only to `search`; its application parser uses the same search cap and hermetic coverage proves the measured 4,960,533-byte response class reaches bounded normalization. Verification retains a 750,000-byte application cap and no widened connector limit.

Owner-authorized probes confirmed one representative request returned `200 OK` and the documented Nuitee shape at 2,865,567 decoded bytes; the equivalent 0.137.0 connector request mapped ten bounded itineraries. On exact 0.138.0, a round-trip control returned valid documented JSON at exactly 4,207,267 decoded bytes and the equivalent connector mapped ten complete outbound/return itineraries under the search-only 6 MiB ceiling. This is evidence for the tested request, not a guarantee that every provider response stays below the ceiling. Do not expose raw responses, weaken secret boundaries, bypass the fixed connector with browser fetch, add undocumented provider parameters, or raise the global limit.

## Expired selection state

**Symptom:** flight search worked, then a fresh search failed after the caller-scoped selection expired.

The live `flight_selections` handle is caller-scoped and expires after 30 minutes. Exact 0.136.0 and 0.137.0 both rejected an expired active selection correctly, then returned a tool-level error with no structured output on the same server's next fresh search. Track the sanitized starter evidence in [issue #5](https://github.com/NoodleSeed-com/nuitee-travel-mcp-app-starter/issues/5). Do not extend or remove the TTL, bypass expected-revision protection, repeatedly redeploy, or add a client-side reset workaround. A candidate fix must pass write → expire → fresh write → verify on one unrestarted server.

## Malformed or partial response

- `malformed_response`: no safe interpretation was possible.
- `partial`: at least one valid option remains, but malformed/truncated provider entries were dropped.

Recheck the current official OpenAPI before changing normalization. Add a sanitized fictional fixture and failing test for a newly observed shape. A successful provider HTTP status is not proof every nested field exists.

## Price changed

**Symptom:** verification succeeds with `priceChanged: true`.

This is normal market behavior. Show old and current displayed prices clearly. It is not a generic error and does not authorize prebooking.

## Widget does not render

1. Confirm the host supports MCP Apps and inspect `noodle check --json`.
2. Confirm the tool still returns useful `fallback` and bounded structured content.
3. Run `pnpm exec noodle devtools src/server.ts` for the credential-free home or the live entrypoint after configuring its secret.
4. Inspect browser console/network without capturing secrets or provider IDs.
5. Reproduce at 280px, light/dark, keyboard, and reduced motion.

Do not claim ChatGPT, Claude, or another host works from generic metadata alone; record a real host render.

For ChatGPT specifically, `noodle check src/live-server.ts --target chatgpt --json` intentionally reports `chatgpt_widget_domain` until the deployment owner adds one real, dedicated HTTPS widget origin to both widgets. The generic/local gates do not require it. Do not use a reserved or placeholder domain to make the target check green.

## Embedded assistant session errors

See `docs/EMBEDDED_ASSISTANT.md`. Keep assistant model configuration in the Noodle deployment, backend client credentials in the authenticated SaaS backend, and only the short-lived session in the browser. A signed-out session endpoint must return 401; wrong origins must fail closed.

The optional example has no fake customer identity provider. If you choose a
`customers` access deployment, add your product's verified `customerAuth`
configuration and run the current auth doctor before deployment.

## Deployment CLI version mismatch

First compare `pnpm exec noodle --version` with the exact `@noodleseed/one` version in `package.json` and `pnpm-lock.yaml`. If they differ, reinstall from the lockfile and use the project-local command; a bare `noodle deploy` may have invoked an older global installation. Do not change the package pin to match an older global CLI.

If those three versions agree but deploy says that CLI is incompatible with the hosted service and names a newer required package, the service compatibility floor has moved. Review that release, update the exact dependency and lockfile, regenerate Agent Kit, and run the full local gates before retrying deployment. This is different from a global-CLI mismatch, and an older exact pin may have deployed successfully before the service floor changed. Do not bypass the preflight. Before the first deploy, use the README's `noodle link` command to bind the intended org, app, environment, access mode, and `src/live-server.ts` entrypoint; then run `pnpm exec noodle deploy`.

If a successful deploy appears under an app named after the entrypoint (for example, `live-server`) or under an unexpected environment, the directory was not linked to the intended target. Do not guess from the endpoint. Inspect the deployment, create the explicit local link documented in the README, and deploy a new reviewed version to that target. Linking does not move or rename an existing deployment.

## Agent Kit or validation failures

Run:

```sh
pnpm exec noodle agents doctor --json
pnpm exec noodle validate --fix-prompt
```

If doctor says restart required, restart the agent session before editing. Keep authoring modules at the supported root-level layout used here; the audited compiler failed to package a nested transitive connector import. Report exact structured errors and versions before proposing a broader workaround.
