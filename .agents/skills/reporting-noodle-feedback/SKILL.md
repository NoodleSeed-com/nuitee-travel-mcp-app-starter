---
name: reporting-noodle-feedback
description: "Use when a Noodle Seed bug, misleading instruction, missing capability, or concrete product improvement should be proposed to the user."
---

<!-- noodle-skill version:0.91.0 hash:0f404109f4845683 -->

# reporting-noodle-feedback

Preview one sanitized feedback proposal and submit it once only after informed explicit approval.

## Use when

- Report a Noodle Seed bug or documentation gap.
- Propose a concrete Noodle product improvement.

## Do not use when

- Do not use for generic project bugs.
- Do not send customer code, identifiers, logs, or secrets.

## Required inputs

- One distinct finding.
- Sanitized observed and expected behavior.
- User approval for the exact dry-run preview and live command.

## Workflow

Read and follow the canonical playbook `references/feedback.md` at `../noodle-seed/references/feedback.md`. It owns the workflow; do not recreate it here or load the command catalog speculatively.

## Verification evidence

The user saw the exact sanitized preview, diagnostics, destination, and live command; only a returned reference proves submission.

## Recovery paths

If login or rate limits block the one live submission, report that nothing was sent. A recording failure has an unknown outcome: report no reference and never auto-login or retry-loop.

## Stop conditions

Stop after the local dry-run and before the live command until the user explicitly approves it.

## Handoff contract

Pass the selected outcome, explicit target, changed files, commands run, passing evidence, first unproven evidence layer, sanitized failure, remaining authority, and exact next action. The receiving skill continues from that layer; do not restart discovery or discard prior proof.
