---
name: designing-mcp-products
description: "Use when a Noodle Seed MCP product idea needs conversational fit, user benefit, scope, interaction, or evidence design before implementation."
---

<!-- noodle-skill version:0.91.0 hash:78a6f181b61f92f1 -->

# designing-mcp-products

Produce the smallest decision-ready MCP product design before code or hosted mutation.

## Use when

- Turn a vague product idea into an MCP product.
- Decide whether this job needs an MCP App.

## Do not use when

- Do not use for an already specified implementation.
- Do not use for generic product or UI design outside MCP.

## Required inputs

- Target user and job.
- System data or action the model cannot supply.
- Requested stopping point.

## Workflow

Read and follow the canonical playbook `references/experience-design.md` at `../noodle-seed/references/experience-design.md`. It owns the workflow; do not recreate it here or load the command catalog speculatively.
Load `references/authoring-workflow.md` at `../noodle-seed/references/authoring-workflow.md` only when the playbook or observed evidence names that concern.

## Verification evidence

A bounded product contract states user benefit, model boundary, interaction, fallback, product-guide decision, risks, and next implementation skill.

## Recovery paths

If the idea is broad, reduce it to one conversational job and one representative success path.

## Stop conditions

Stop before implementation when the design inputs or product fit are unresolved.

## Handoff contract

Pass the selected outcome, explicit target, changed files, commands run, passing evidence, first unproven evidence layer, sanitized failure, remaining authority, and exact next action. The receiving skill continues from that layer; do not restart discovery or discard prior proof.
