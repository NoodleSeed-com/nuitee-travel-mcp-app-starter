---
name: debugging-mcp-delivery
description: "Use when an existing Noodle Seed MCP project has a concrete validation, runtime, connector, App, host, deployment, or production failure."
---

<!-- noodle-skill version:0.98.0 hash:8d75ad13f4b3120a -->

# debugging-mcp-delivery

Repair or isolate the first failing evidence layer while preserving everything already proven.

## Use when

- Diagnose this failing MCP project.
- Inspect a hosted failure from logs or status.

## Do not use when

- Do not use for a greenfield build with no failure evidence.
- Do not mutate hosted state during read-only inspection.

## Required inputs

- Exact failing command or symptom.
- Current target and evidence level.
- Most recent sanitized failure.

## Workflow

Read and follow the canonical playbook at `references/verify-and-recover.md`. It owns the workflow; do not recreate it here or load the command catalog speculatively.
Load the supporting reference at `references/troubleshooting.md` only when the playbook or observed evidence names that concern.
Load the supporting reference at `references/inspect-hosted.md` only when the playbook or observed evidence names that concern.

## Verification evidence

The failed layer is rerun successfully, or the stable blocker and exact next action are reported.

## Recovery paths

After two attempts with the same signature, stop editing and preserve the repro and passing layers.

## Stop conditions

Stop before hosted mutation unless the user separately requests deploying-mcp-services.

## Handoff contract

Pass the selected outcome, explicit target, changed files, commands run, passing evidence, first unproven evidence layer, sanitized failure, remaining authority, and exact next action. The receiving skill continues from that layer; do not restart discovery or discard prior proof.
