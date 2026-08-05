# Outcome

Deliver the smallest useful Noodle Seed MCP server that turns a real user intent into a safe, typed result. Author only the configured TypeScript entrypoint, normally `src/server.ts`; keep the public authoring surface TypeScript-only and never hand-author generated manifests or connector IR.

## Use when

- The user asks to create or extend a headless MCP server, tools, resources, prompts, or connector-backed behavior.
- The requested result is primarily model-facing and does not require a widget or host-visible UI.

## Do not use when

- The primary outcome is an MCP App, widget, or visual interaction; select the App route.
- The task is only to diagnose existing failures, deploy, publish, embed, or report feedback; select that dedicated route.
- The idea has no conversational fit: static content, a dashboard, deep navigation, or a full existing app port should be narrowed to the few actions that are better said than clicked.

## Required inputs

Establish only the inputs needed for the requested stopping point. Follow `references/authoring-workflow.md` for the canonical discovery paths. Do not guess or invent a private schema, endpoint, authentication model, eligibility rule, or approval flow. If a required input is unavailable, state exactly what evidence is missing and stop before fabricating behavior.

## Workflow

1. **Confirm conversational fit.** Name one to three focused jobs where saying the request is easier than navigating the underlying system, and identify the data or action the model cannot provide by itself.
2. **Define the product contract.** For each job, write the user phrase, the intent-shaped tool or resource, its minimal typed input, the useful output, read/write effect, and backing operation. Design for user intent, not a 1:1 API endpoint wrapper.
3. **Choose the smallest implementation.** Use native tools, resources, or prompts for local/static behavior; add a connector only when external data or actions are required. Keep response output small and model-readable.
4. **Author in TypeScript.** Follow `references/authoring-workflow.md` for connector and flow patterns, `references/tool-design.md` for the model-facing tool surface, and `references/sdk-surface.md` for exact builders. These are this route’s complete canonical support set; use the router lookup catalog only when observed evidence names a different concern.
   MCP protocol versions are platform-owned and negotiated automatically at the serving endpoint. Do not add protocol-version settings to server options, `noodle.json`, app manifests, or deployment configuration.
5. **Validate and repair.** Run `noodle validate --json`. Parse `error.errors[]`, repair the cited `path`, and rerun validation. Consult the lookup catalog only for the specific reported error code; do not open another reference speculatively.
6. **Run the local smoke.** After validation succeeds, run `noodle test --json` and repair any failure at that evidence layer.
7. **Prove external behavior.** For connector-backed reads, set credentials through the effective local target and run a safe representative `noodle tools call`. Confirm populated mapped fields from real output, not merely successful registration.
8. **Stop at the requested boundary.** Do not add an App, host test, hosted environment, publication work, or deployment unless the user requested that outcome. Deploy only when the selected route or the user explicitly requires it.

## Verification evidence

Report evidence as a ladder and claim only levels actually exercised:

- **Authoring:** the requested TypeScript behavior exists with typed inputs and outputs.
- **Compilation:** `noodle validate --json` returned success.
- **Local smoke:** `noodle test --json` returned success.
- **Connector reality:** a representative safe read via `noodle tools call` returned populated mapped fields. This is required for connector-backed work.
- **Higher levels:** explicitly report host, deployment, and production checks as not run unless they were separately requested and evidenced.

## Recovery paths

- Validation failure: fix each structured error at its reported path, rerun validation, then resume at the next unproven layer.
- Tool registers but returns empty or `undefined` fields: inspect one sanitized real response, correct `${response...}` mappings, and rerun the same read.
- Credential unavailable: verify `secret(...)` naming and the effective local target; never inline or print the secret.
- Missing product input: ask for the smallest concrete example, schema, or rule that unblocks the selected job. Do not widen the build to compensate.
- Repeated failure at the same layer: stop after two evidence-backed repair attempts with the same failure signature and report the command, sanitized error, evidence already proven, and exact next action.

## Stop conditions

- Stop complete when the requested behavior passes validation and local smoke, and every connector-backed read has real-output evidence.
- Stop at the user's requested boundary; do not deploy unless the user requested deployment.
- Stop blocked when progress requires unavailable credentials, private schemas, external approval, or a live write the user has not approved.
- In the handoff, name what changed, what passed, what was not run, and any remaining risk without upgrading local evidence into a hosted or production claim.