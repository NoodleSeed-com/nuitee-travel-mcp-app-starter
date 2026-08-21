---
name: building-mcp-apps
description: "Use when a Noodle Seed MCP App, widget, interactive card, visual interaction, or host-visible UI is the primary requested outcome."
---

<!-- noodle-skill version:0.79.0 hash:9fd67d4d24328e15 -->

# building-mcp-apps

Deliver an MCP App whose visual interaction earns its place and preserves useful model-visible fallback.

## Use when

- Build an MCP App or widget.
- Add a host-visible interactive workflow.

## Do not use when

- Do not use when concise text fully serves the user.
- Do not use for headless server work with no UI outcome.

## Required inputs

- Target user and explicit UI benefit.
- Primary interaction and states.
- Model-visible result and text fallback.

## Workflow

Read and follow the canonical playbook `references/build-an-mcp-app.md` at `../noodle-seed/references/build-an-mcp-app.md`. It owns the workflow; do not recreate it here or load the command catalog speculatively.
Load `references/experience-design.md` at `../noodle-seed/references/experience-design.md` only when the playbook or observed evidence names that concern.
Load `references/widgets-and-apps.md` at `../noodle-seed/references/widgets-and-apps.md` only when the playbook or observed evidence names that concern.

## Verification evidence

The App records its product-guide decision and passes validation, local smoke, app checks, and the requested preview or host evidence level.

## Recovery paths

Distinguish data-contract, widget-runtime, rendering, host, and deployment failures.

## Stop conditions

Stop before deployment or publication unless that distinct outcome was requested.

## Handoff contract

Pass the selected outcome, explicit target, changed files, commands run, passing evidence, first unproven evidence layer, sanitized failure, remaining authority, and exact next action. The receiving skill continues from that layer; do not restart discovery or discard prior proof.
