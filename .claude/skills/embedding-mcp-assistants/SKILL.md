---
name: embedding-mcp-assistants
description: "Use when embedding a Noodle assistant into an existing SaaS or web application with browser, identity, session, and credential boundaries."
---

<!-- noodle-skill version:0.98.0 hash:d554d661ed7ac7be -->

# embedding-mcp-assistants

Select one decision-complete assistant topology, then deliver the embed with identity and credential separation proven at the tested level.

## Use when

- Embed the Noodle assistant in an existing web app.
- Wire browser mounting and session exchange.

## Do not use when

- Do not use to build a standalone MCP App.
- Do not use when the request is only server authoring or deployment.

## Required inputs

- Named end user, conversational job, and one to three workflows.
- Exact application origin, mounting point, and existing host framework.
- Access mode plus the identity, session, and server-owned routing boundary.
- Managed or custom renderer and its explicit product benefit.
- Model owner and requested local, hosted, or production evidence level.

## Workflow

Read and follow the canonical playbook at `references/embedded-assistant.md`. It owns the workflow; do not recreate it here or load the command catalog speculatively.
Load the supporting reference at `references/authoring-workflow.md` only when the playbook or observed evidence names that concern.

## Verification evidence

One architecture brief owns the selected topology, and the embed works at the requested boundary without forwarding inbound credentials to business backends.

## Recovery paths

Localize failures to origin, session exchange, browser mount, MCP surface, or hosted configuration.

## Stop conditions

Stop before code when the user, job, workflow, access, identity, origin, routing, renderer, model owner, or evidence target is unresolved; hand vague product intent to designing-mcp-products.

## Handoff contract

Pass the selected outcome, explicit target, changed files, commands run, passing evidence, first unproven evidence layer, sanitized failure, remaining authority, and exact next action. The receiving skill continues from that layer; do not restart discovery or discard prior proof.
