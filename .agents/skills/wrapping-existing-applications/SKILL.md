---
name: wrapping-existing-applications
description: "Use when an existing application has no stable usable API and needs a read-only, identity-first Noodle Seed integration plan before implementation."
---

<!-- noodle-skill version:0.79.0 hash:eccc3c158dcafba8 -->

# wrapping-existing-applications

Produce the smallest safe, repository-grounded existing-application integration plan before any mutation.

## Use when

- Plan how to wrap an existing application that has no usable public API.
- Map internal application capabilities into an approved Noodle Seed implementation plan.

## Do not use when

- Do not use when all four API-evidence inputs exist—an API base URL, authentication scheme, representative safe read, and observed response; use `connecting-apis-to-mcp`. Missing, stale, inaccessible, undocumented-only, or otherwise unusable API evidence remains in `wrapping-existing-applications`.
- Do not use to execute an approved plan, diagnose a concrete failure, or mutate hosted state.

## Required inputs

- Repository scope and requested stopping point.
- Target user jobs.
- End-user identity provider and caller population.
- One static preconfigured downstream origin, or a routing blocker and owning-workflow handoff.

## Workflow

Read and follow the canonical playbook `references/wrap-existing-app.md` at `../noodle-seed/references/wrap-existing-app.md`. It owns the workflow; do not recreate it here or load the command catalog speculatively.
Load `references/authoring-workflow.md` at `../noodle-seed/references/authoring-workflow.md` only when the playbook or observed evidence names that concern.
Load `references/tool-design.md` at `../noodle-seed/references/tool-design.md` only when the playbook or observed evidence names that concern.

## Verification evidence

A sanitized capability map and repository-scoped plan state identity, authorization, routing, application changes, tool budget, tests, blockers, and the first unproven layer.

## Recovery paths

With a stable origin but no safe stable HTTP boundary, plan the smallest application-owned stable HTTPS adapter over existing business functions. If a safe live verification input or working credential is missing, leave that evidence explicitly unproven and name the exact prerequisite. Only multi-origin routing or no stable HTTP origin blocks and hands off to the existing owning routing workflow.

## Stop conditions

Stop after presenting the draft plan and before any file or hosted mutation until the user explicitly authorizes the exact next action and target.

## Handoff contract

Pass the selected outcome, explicit target, changed files, commands run, passing evidence, first unproven evidence layer, sanitized failure, remaining authority, and exact next action. The receiving skill continues from that layer; do not restart discovery or discard prior proof.
