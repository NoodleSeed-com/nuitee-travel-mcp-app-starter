---
name: creating-product-agent-guides
description: "Use when a Noodle Seed MCP server needs a new or revised product agent guide, App Package skill, or explicit product-skill regeneration."
---

<!-- noodle-skill version:0.79.0 hash:0fa48a82fe836cf0 -->

# creating-product-agent-guides

Create or revise one grounded TypeScript product guide, prove it locally, and preview every generated-file change before explicit installation.

## Use when

- Teach agents how to use this MCP product across multiple capabilities.
- Create, revise, regenerate, or recover an app product skill.

## Do not use when

- Do not use merely to add or change an MCP capability; use the owning server or App build skill.
- Do not invent product workflows, capability names, or weaker safety boundaries from source shape alone.

## Required inputs

- Configured TypeScript entrypoint and its declared MCP capabilities.
- Builder-confirmed product triggers, workflow judgment, and boundaries that source cannot prove.
- Separate approval for source editing and generated app-skill installation or replacement.

## Workflow

Read and follow the canonical playbook `references/product-agent-guides.md` at `../noodle-seed/references/product-agent-guides.md`. It owns the workflow; do not recreate it here or load the command catalog speculatively.

## Verification evidence

The approved TypeScript guide references only declared capabilities, validation and local smoke pass, and the explicit package plan is either approved and applied or left as a preview.

## Recovery paths

Repair structured guide errors by exact path; preserve modified or unowned local files and use only the previewed app-skill recovery action the builder approves.

## Stop conditions

Stop before editing source or materializing generated app-skill files at each separate approval boundary.

## Handoff contract

Pass the selected outcome, explicit target, changed files, commands run, passing evidence, first unproven evidence layer, sanitized failure, remaining authority, and exact next action. The receiving skill continues from that layer; do not restart discovery or discard prior proof.
