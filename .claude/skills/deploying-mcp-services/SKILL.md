---
name: deploying-mcp-services
description: "Use when the user explicitly requests a Noodle Seed hosted link, configuration write, deployment, access change, rollback, or connection write."
---

<!-- noodle-skill version:0.91.0 hash:93e735b7ffb45df1 -->

# deploying-mcp-services

Apply only the explicitly authorized hosted mutation to the explicit org, app, and environment.

## Use when

- Deploy this MCP service to an explicit environment.
- Roll back or change hosted access.

## Do not use when

- Do not use for preparation, inspection, or local-only work.
- Do not select or default a mutation target implicitly.

## Required inputs

- Explicit org, app, and environment.
- Authorized mutation.
- Pre-deploy verification evidence.

## Workflow

Read and follow the canonical playbook `references/deploy-and-ops.md` at `../noodle-seed/references/deploy-and-ops.md`. It owns the workflow; do not recreate it here or load the command catalog speculatively.
Load `references/cli-commands.md` at `../noodle-seed/references/cli-commands.md` only when the playbook or observed evidence names that concern.

## Verification evidence

The requested hosted state is confirmed without claiming unperformed host or production checks.

## Recovery paths

Preserve local evidence and isolate authentication, target, build, rollout, health, or rollback failures.

## Stop conditions

Stop and ask when target, authority, or effect is ambiguous.

## Handoff contract

Pass the selected outcome, explicit target, changed files, commands run, passing evidence, first unproven evidence layer, sanitized failure, remaining authority, and exact next action. The receiving skill continues from that layer; do not restart discovery or discard prior proof.
