# Inspect hosted state

Read hosted evidence without changing target, credentials, configuration, access, host wiring, revisions, or directory state.

## Use when

- The user asks for hosted status, deployment metadata, health, logs, events, metrics, audit evidence, or diagnosis.
- The request is inspect-only, diagnose-only, or asks whether an existing deployment works.

## Authority boundary

This route is read-only. It never authorizes `login`, `logout`, `link`, `target set`, hosted secret/variable/config/access changes, `deploy`, `rollback`, host configuration writes, or directory submission. If evidence shows one of those actions is needed, report the exact proposed action and target, then stop for a new explicit user request.

## Workflow

1. Resolve the requested org, app, environment, and deployment from existing non-secret context. Do not change the effective target to make inspection easier.
2. Choose the narrowest read-only command: `noodle target show`, `noodle status`, `noodle inspect`, `noodle smoke`, `noodle metrics --agent-output`, `noodle events --json`, `noodle logs`, or `noodle audit`.
3. Prefer machine output when the selected command supports it. Record the target, revision/deployment ID, timestamp, result, and any request ID without exposing secrets or customer payloads.
4. When the installed Developer MCP is available, use its deployment inspection or diagnosis tool only for the selected org/app/env. Treat it as evidence gathering, not mutation authority.
5. If a command fails, distinguish missing authentication/access from unhealthy application behavior. Do not repair, relink, redeploy, rotate config, or roll back under this route.

## Stop conditions

- Stop complete when the requested hosted fact is supported by current evidence and higher untested levels are named.
- Stop blocked when existing access cannot read the target or the requested evidence requires a host/user journey unavailable in scope.
- Stop for authorization when the next useful action would mutate local targeting, hosted state, host configuration, or directory state.