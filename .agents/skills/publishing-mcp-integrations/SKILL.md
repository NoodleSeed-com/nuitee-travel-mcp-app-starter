---
name: publishing-mcp-integrations
description: "Use when preparing, reviewing, or submitting a Noodle Seed MCP integration to a host or app directory."
---

<!-- noodle-skill version:0.79.0 hash:efffbf82007f935d -->

# publishing-mcp-integrations

Produce complete submission evidence with host-review uncertainty stated explicitly.

## Use when

- Prepare this MCP integration for a directory.
- Review or submit the host listing.

## Do not use when

- Do not use for ordinary deployment.
- Do not submit when the user requested preparation or review only.

## Required inputs

- Target directory.
- Current deployment and verification evidence.
- Requested review, preparation, or submission boundary.

## Workflow

Read and follow the canonical playbook `references/publishing.md` at `../noodle-seed/references/publishing.md`. It owns the workflow; do not recreate it here or load the command catalog speculatively.
Load `references/app-directory-compliance.md` at `../noodle-seed/references/app-directory-compliance.md` only when the playbook or observed evidence names that concern.

## Verification evidence

Required product, policy, deployment, media, and test evidence is present or explicitly missing.

## Recovery paths

Return missing implementation or evidence to its owning skill without restarting discovery.

## Stop conditions

Stop before external submission without explicit user authorization.

## Handoff contract

Pass the selected outcome, explicit target, changed files, commands run, passing evidence, first unproven evidence layer, sanitized failure, remaining authority, and exact next action. The receiving skill continues from that layer; do not restart discovery or discard prior proof.
