# Publish to app directories

> Preparation is read-only unless the current user request explicitly authorizes the exact deploy, access change, host write, or submission target. A request to prepare must report missing readiness work and stop before mutation.

Directory requirements evolve. Identify the requested directory first and verify its current official requirements before preparing directory-specific evidence.

## Contents

- Shared readiness gate
- Directory-specific evidence
- Submission boundary

## Shared readiness gate

Before any submission:

Use `references/app-directory-compliance.md` as this route’s canonical shared compliance checklist.

Prepare evidence for a reachable production MCP endpoint, accurate capability descriptions and schemas, useful fallback behavior, realistic positive and negative tests, data minimization, privacy disclosures, support ownership, and any interactive surface the directory will review.

## Directory-specific evidence

Read the selected directory’s current official submission documentation at review time. Record each additional requirement separately from the shared checklist, including listing fields, identity verification, test credentials, screenshots, policy declarations, review limits, and appeal or resubmission steps. Never project one directory’s requirements onto another.

When a requirement cannot be verified from the selected directory’s current documentation or direct review evidence, mark it unknown instead of borrowing a rule from another host.

## Submission boundary

Preparation is read-only. Deployment, access changes, directory registration, and final submission each require explicit authorization for the exact target. Report remaining evidence gaps and stop when that authority or required directory access is absent.