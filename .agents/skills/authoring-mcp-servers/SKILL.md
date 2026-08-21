---
name: authoring-mcp-servers
description: "Use when creating or extending a headless Noodle Seed MCP server, tool, resource, prompt, or typed model-facing capability."
---

<!-- noodle-skill version:0.79.0 hash:11523cb33b9473c0 -->

# authoring-mcp-servers

Deliver focused model-facing MCP behavior through the configured TypeScript entrypoint.

## Use when

- Build a headless MCP server.
- Add a typed tool, resource, or prompt.

## Do not use when

- Do not use when the primary outcome is a widget.
- Do not use only to diagnose or deploy existing behavior.

## Required inputs

- Requested user intent.
- Expected typed result.
- External operation contract when applicable.

## Workflow

Read and follow the canonical playbook `references/build-an-mcp-server.md` at `../noodle-seed/references/build-an-mcp-server.md`. It owns the workflow; do not recreate it here or load the command catalog speculatively.
Load `references/authoring-workflow.md` at `../noodle-seed/references/authoring-workflow.md` only when the playbook or observed evidence names that concern.
Load `references/sdk-surface.md` at `../noodle-seed/references/sdk-surface.md` only when the playbook or observed evidence names that concern.

## Verification evidence

The TypeScript behavior and explicit product-guide decision validate and pass local smoke; connector reads also have real-output proof.

## Recovery paths

Resume at the first failing compile, smoke, credential, mapping, or live-read layer.

## Stop conditions

Stop at local delivery unless another requested outcome explicitly authorizes a handoff.

## Handoff contract

Pass the selected outcome, explicit target, changed files, commands run, passing evidence, first unproven evidence layer, sanitized failure, remaining authority, and exact next action. The receiving skill continues from that layer; do not restart discovery or discard prior proof.
