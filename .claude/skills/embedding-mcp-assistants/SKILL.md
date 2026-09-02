---
name: embedding-mcp-assistants
description: "Use when embedding a Noodle assistant into an existing SaaS or web application with browser, identity, session, and credential boundaries."
---

<!-- noodle-skill version:0.91.0 hash:cc54a67f21c0ecdb -->

# embedding-mcp-assistants

Deliver the requested assistant embed with identity and credential separation proven at the tested level.

## Use when

- Embed the Noodle assistant in an existing web app.
- Wire browser mounting and session exchange.

## Do not use when

- Do not use to build a standalone MCP App.
- Do not use when the request is only server authoring or deployment.

## Required inputs

- Application origin and mounting point.
- Desired built-in or custom browser experience.
- Identity/session boundary.
- Requested local or hosted evidence level.

## Workflow

Read and follow the canonical playbook `references/embedded-assistant.md` at `../noodle-seed/references/embedded-assistant.md`. It owns the workflow; do not recreate it here or load the command catalog speculatively.
Load `references/authoring-workflow.md` at `../noodle-seed/references/authoring-workflow.md` only when the playbook or observed evidence names that concern.

## Verification evidence

The embed works at the requested boundary without forwarding inbound credentials to business backends.

## Recovery paths

Localize failures to origin, session exchange, browser mount, MCP surface, or hosted configuration.

## Stop conditions

Stop when unavailable identity, origin, or hosted authority blocks the next evidence layer.

## Handoff contract

Pass the selected outcome, explicit target, changed files, commands run, passing evidence, first unproven evidence layer, sanitized failure, remaining authority, and exact next action. The receiving skill continues from that layer; do not restart discovery or discard prior proof.
