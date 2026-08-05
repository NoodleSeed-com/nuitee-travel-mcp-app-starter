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

Version one intentionally exposes no `find_airports` tool. The official endpoint returned `200 OK` directly, but the published Noodle connector failed that same small fixed-origin GET while synthetic GET/query and exact-response relay controls passed. The host may translate well-known, unambiguous names internally, but must restate the selected airports and ask for city/region/country clarification when uncertain. Do not guess, substitute test fixtures, call the provider from the browser, or add an arbitrary HTTP tool.

## Oversized response

**Symptom:** `oversized_response` or a connector-level size error.

The gateway rejects parsed responses above 750,000 UTF-8 bytes. The published Noodle `0.104.1` HTTP transport separately rejects responses above 1,048,576 bytes before response mapping or compute. A synthetic boundary check on 2026-08-05 confirmed that a response just below the limit mapped successfully while one just above it returned only a generic connector failure. The composed application receives no usable size cause and therefore returns a generic sanitized `provider_error` rather than its structured `oversized_response`.

Owner-authorized 2026-08-04 probes confirmed a representative YYZ–LIS request returned `200 OK` and the documented Nuitee shape but measured 2.85 MB without filters and had remained about 1.55 MB after documented cheapest-offer and one-stop filters. Smaller search and same-session verification smokes pass; this is a route-dependent reliability blocker. Do not expose raw responses, weaken secret boundaries, bypass the fixed connector with browser fetch, or add undocumented provider parameters. Resolution requires a public Noodle pre-compute size/narrowing control or a documented Nuitee result-limit/pagination contract.

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

## Agent Kit or validation failures

Run:

```sh
pnpm exec noodle agents doctor --json
pnpm exec noodle validate --fix-prompt
```

If doctor says restart required, restart the agent session before editing. Keep authoring modules at the supported root-level layout used here; the audited compiler failed to package a nested transitive connector import. Report exact structured errors and versions before proposing a broader workaround.
