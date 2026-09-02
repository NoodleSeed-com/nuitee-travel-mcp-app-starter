---
name: verifying-mcp-delivery
description: "Use when proving a Noodle Seed MCP project works at a named compile, local, connector, App, host, deployment, or production evidence level."
---

<!-- noodle-skill version:0.91.0 hash:6ef6ef551e26b78e -->

# verifying-mcp-delivery

Report the highest evidence level actually rerun without upgrading weaker proof.

## Use when

- Verify this MCP delivery before handoff.
- Prove which delivery layers currently pass.

## Do not use when

- Do not use as a substitute for fixing a known failure.
- Do not infer hosted health from local success.

## Required inputs

- Requested evidence level.
- Current target.
- Existing evidence and its freshness.

## Workflow

Read and follow the canonical playbook `references/verify-and-recover.md` at `../noodle-seed/references/verify-and-recover.md`. It owns the workflow; do not recreate it here or load the command catalog speculatively.
Load `references/test-in-hosts.md` at `../noodle-seed/references/test-in-hosts.md` only when the playbook or observed evidence names that concern.

## Verification evidence

Every dependency below the requested level passes now, or the first unproven layer is explicit.

## Recovery paths

Hand a concrete failing layer to debugging-mcp-delivery with all passing evidence preserved.

## Stop conditions

Stop after the requested level passes or the first bounded failure is isolated.

## Handoff contract

Pass the selected outcome, explicit target, changed files, commands run, passing evidence, first unproven evidence layer, sanitized failure, remaining authority, and exact next action. The receiving skill continues from that layer; do not restart discovery or discard prior proof.
