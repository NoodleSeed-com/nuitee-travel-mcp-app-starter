# Troubleshooting in hosts

## Contents

- First moves
- Customer-auth metadata
- Symptom map

## First moves

Re-run the local gates before debugging in-host: `noodle validate`, `noodle check` (add `--target chatgpt` for ChatGPT-specific requirements), and `noodle doctor`. Confirm the CLI is current with `noodle update --check` and that the project-local skill is intact with `noodle agents doctor --json` — host metadata requirements evolve and fixes ship in the CLI/agent-kit. Never paste tokens, secrets, or `.env` / `.env.noodle` values into prompts or logs while debugging.

For protocol/conformance checks, the headless harness is `@mcpjam/cli`, not a `noodle` subcommand. Use it against a local `noodle dev` URL without an access token, or against hosted URLs through the host/OAuth flow printed by `noodle connect`.

## Customer-auth metadata

Adding `embeddedAssistant(...)` does not select the MCP access mode or authorization server. Before changing auth, inspect the exact active deployment with `noodle deployments list --org <org> --app <app> --env <env> --json` and match its active deployment ID, server version, and access mode to the endpoint being tested.

For `customers` access, Direct or federated customer auth must advertise the configured tenant issuer; a managed Noodle bridge must advertise the Noodle authorization server. Owner-only access advertises the platform authorization server. If a direct or federated `customers` deployment still advertises the platform issuer, treat it as `customer_auth_state_inconsistent` and escalate with the endpoint, active deployment ID, and sanitized protected-resource metadata. Do not proxy, rewrite, rotate, or redeploy to hide the mismatch. Never share bearer tokens, refresh tokens, client secrets, or credential files.

## Symptom map

| Symptom | Likely cause | Fix |
| :-- | :-- | :-- |
| Images, fonts, or styles don’t load inside the widget | The host sandbox silently blocks origins not declared in the widget CSP | Add every asset origin to `csp: { resourceDomains: [...] }` (fetch/XHR origins go in `connectDomains`, embedded iframes in `frameDomains`), then re-run `noodle check --target chatgpt` |
| ChatGPT warns “Widget CSP is not set” | The widget declares no `csp` | Declare `csp` on the widget with the exact origins it uses |
| ChatGPT warns “Widget domain is not set” | No `domain` on the widget (required for app-store submission) | Set `domain: "https://…"` (one https origin per app) on each widget |
| External links do nothing, or show a safe-link warning | Link opened outside the host bridge, or the target origin is not allowlisted | Use `useOpenExternal()` (never `window.open`) and add the target origins to the server-level `handoff.allowedDomains` |
| Tool succeeds but no widget appears | The tool has no view, or the host surface doesn’t support MCP Apps | Use `tool`, run `noodle check`, preview with `noodle devtools`; on non-Apps surfaces only the text/structured result renders |
| Widget shows stale or missing data | The widget reads `structuredContent`, which must match the `output` schema | Make `fulfil` return exactly the `output` shape (arrays and nested objects are supported); inspect the live result with `noodle devtools` |
| `useCallTool` fails from the widget | Tool name mismatch, or the helper tool is model-visible | List names with `noodle tools`; widget-only helpers must be declared with `tool` |
| `noodle validate` passes but React views fail to bundle (“requires Vite”) | Vite is missing from the app dependencies or its dependencies are not installed — widget bundling uses the app-local Vite | Run `npm install --save-dev vite`, then retry `noodle validate` / `noodle dev` / `noodle deploy` |
| Hosted endpoint returns 401 to probes | Expected: hosted servers challenge unauthenticated calls with OAuth metadata | Sign in from the host when prompted; widen who may call with `noodle access set` if testers are outside the org |
| Tools error only after deploy | Runtime/config differences surface hosted (secrets, connector reachability) | Run `noodle smoke`, then `noodle metrics --agent-output` and `noodle events --tool <name> --status tool_error --json`; check `noodle secrets list` scope |
| A connector tool validates and lists, but returns empty or `undefined` fields | The `response` mapping references a path the API does not return — usually the wrong root (a `.body` segment, when the parsed body is bound directly to `${response}`) or the wrong shape | Run `noodle tools call <name> --args <json>` with the secret set and compare the mapped result to the API’s real JSON; map from `${response.<path>}` (the body is `${response}`, there is no `.body`) and use bracket array indices (`${response.items[0].id}`) |
| A connector should return a list but returns one item, `undefined`, or the whole raw objects | A `${response.arr[0]…}` mapping picks ONE element; a response mapping cannot reshape array items and a tool’s Zod output does not strip them at runtime | Bind the whole array with `${response.<arr>}`, then narrow each element in a compute connector (`references/connect-an-api.md` → “Return a list”) |
| `noodle dev` boots but the loopback returns `-32600 "not found"` (or 404) for a valid server | A required `secret(...)` is unresolved — a missing secret fails compile *closed* at boot so nothing is served; the local secret was set at a scope `noodle dev` does not read | Run `noodle secrets set NAME --runtime local --from-env NAME`; local config and dev resolve the same effective target, and every author-loop command stops with the exact target/recovery command before exposing an empty endpoint (`references/connect-an-api.md` → “Set the secret for local runs”) |
| Need to invoke a tool from the terminal | Local tools run in-process; the `noodle` CLI is not a general MCP client for **deployed** URLs (there is no `call <url>` verb) | Locally, `noodle tools call <name> --args <json>` (also `noodle resources read` / `noodle prompts get`) runs the tool against the in-process runtime — with the secret set it executes the connector against the real API, so use it to prove mapped output. For a **deployed** URL use MCP Inspector or `npx @mcpjam/cli@latest tools call --url <url> ...` |
| One customer/session reports a bad answer or protocol error | The failure may be a model/tool error, host protocol error, or connector/runtime error | Run `noodle metrics --agent-output`, then `noodle events --tool <name> --status tool_error --json`; copy the `sessionId` into `noodle events --session <id> --json`, then match timestamps with `noodle logs` |