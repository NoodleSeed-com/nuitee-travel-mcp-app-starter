---
name: authoring-mcp-servers
description: "Use when creating or extending a headless Noodle Seed MCP server, tool, resource, prompt, or typed model-facing capability."
---

<!-- noodle-skill version:0.98.0 hash:dd57a15df15d10b2 -->

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

Read and follow the canonical playbook at `references/build-an-mcp-server.md`. It owns the workflow; do not recreate it here or load the command catalog speculatively.
Load the supporting reference at `references/authoring-workflow.md` only when the playbook or observed evidence names that concern.
Load the supporting reference at `references/sdk-surface.md` only when the playbook or observed evidence names that concern.

## Verification evidence

The TypeScript behavior and explicit product-guide decision validate and pass local smoke; connector reads also have real-output proof.

## Recovery paths

Resume at the first failing compile, smoke, credential, mapping, or live-read layer.

## Stop conditions

Stop at local delivery unless another requested outcome explicitly authorizes a handoff.

## Handoff contract

Pass the selected outcome, explicit target, changed files, commands run, passing evidence, first unproven evidence layer, sanitized failure, remaining authority, and exact next action. The receiving skill continues from that layer; do not restart discovery or discard prior proof.
