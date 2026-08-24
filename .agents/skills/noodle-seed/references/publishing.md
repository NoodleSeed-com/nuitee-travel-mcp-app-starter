# Publish to app directories

> Preparation is read-only unless the current user request explicitly authorizes the exact deploy, access change, host write, or submission target. A request to prepare must report missing readiness work and stop before mutation.

Directory requirements evolve. Identify the requested directory first and verify its current official requirements before preparing directory-specific evidence.

## Contents

- Shared readiness gate
- Distribution metadata source
- Hosted immutable distribution
- Directory-specific evidence
- Submission boundary

## Shared readiness gate

Before any submission:

Use `references/app-directory-compliance.md` as this route’s canonical shared compliance checklist.

Prepare evidence for a reachable production MCP endpoint, accurate capability descriptions and schemas, useful fallback behavior, realistic positive and negative tests, data minimization, privacy disclosures, support ownership, and any interactive surface the directory will review.

## Distribution metadata source

When the user explicitly prepares host packaging, author the host-neutral `distribution` option in the same `server.ts`; do not add it during an ordinary build that has no distribution goal. It contains listing, publisher, support, legal, assets, and review facts that cannot be derived safely from MCP capability descriptions.

Reference real packaged images with `asset(...)`, write useful alt text, and include realistic positive and negative review scenarios. Name the exact expected MCP tools in each positive scenario’s `tools` array. A negative scenario is a non-invocation case: set `shouldInvoke: false` and do not define `tools`. For each MCP App screenshot, add the separate user `prompt` that produces that exact state. Capture only the rendered MCP App response—never the enclosing website, Devtools shell, host conversation, or an unrelated product photo—and meet the selected directory’s current format, dimension, and count limits. Keep reviewer credentials, tokens, secrets, personal data, and test-account passwords out of metadata and source control; supply any authorized reviewer credential out of band.

`distribution` is projected separately. It leaves the canonical App Package and Runtime Artifact unchanged, so editing listing copy cannot change deployment execution or product-skill identity. A product package still needs the separately judged `agentGuide`; do not duplicate capability schemas or workflow truth in listing metadata.

The shared framework can validate metadata and resolved image bytes, run an available target adapter, and create a reproducible archive. Target-specific availability and exact flags live in `references/cli-commands.md` and the live command catalog (`noodle commands --json`); never invent an unlisted target, bundle, filename, or acceptance claim.

When a directory has separate installable-plugin and remote-connector submission projections, generate each with its own exact live-catalog command. Never combine their archives or describe an operator dossier as directly portal-uploadable.

Local or repository testing and public-directory submission are distinct packaging states with distinct required inputs. An export command only compiles local source and writes the requested archive. It does not deploy, register, upload, submit, review, or publish the package.

When an export reports `uploadArtifacts`, treat its output archive as an outer review kit. Extract it, follow the generated instructions, and upload only the named inner artifacts to their matching fields. Never substitute the outer kit for a nested single-purpose upload.

## Hosted immutable distribution

Publishing a deployment-bound archive is a hosted mutation. Run it only when the current request explicitly authorizes that exact deployment and target: `noodle distributions publish <deployment-id> [server.ts] --target <target>`. The command compiles local TypeScript and requires its package snapshot to exactly match the selected deployment before it uploads anything. It uses the endpoint and package identity returned by the service; never substitute a local URL or a different deployment.

Use `noodle distributions list <deployment-id>` to discover immutable versions, `noodle distributions inspect <distribution-id>` to inspect one, and `noodle distributions download <distribution-id> --output <archive.zip>` to retrieve its exact archive. Download verifies the service length and digest before an atomic local write; a failed verification must leave no output file.

Lifecycle and delivery are separate mutations. Run `readiness`, `review`, `release`, `rollback`, `deprecate`, `revoke`, or `grant` only when the request explicitly authorizes that exact distribution and action. Inspect first when the active state or version is not already known.

Set readiness from evidence you can verify. Record `review` only from a real human-observed host status; never infer submission, approval, or publication from a generated archive or a successful Noodle command, and never put reviewer credentials or secrets in feedback.

`release --visibility private` creates or advances a stable Noodle channel without anonymous discovery; `release --visibility public` enables Noodle public delivery only. Both still require the underlying MCP deployment to use exact public access. Neither action publishes to an external directory.

`grant` returns one short-lived, exact-version bearer URL. Treat the complete URL as a secret, disclose it only to the authorized reviewer, and do not paste it into source, logs, issues, or durable docs. `rollback` moves only the channel pointer to an older ready version; `deprecate` stops delivery and `revoke` is terminal.

A hosted archive is still a submission candidate. Creating, listing, inspecting, downloading, releasing, or granting it does not submit it to an external directory, satisfy review, or publish a host listing.

## Directory-specific evidence

Read the selected directory’s current official submission documentation at review time. Record each additional requirement separately from the shared checklist, including listing fields, identity verification, test credentials, screenshots, policy declarations, review limits, and appeal or resubmission steps. Never project one directory’s requirements onto another.

When a requirement cannot be verified from the selected directory’s current documentation or direct review evidence, mark it unknown instead of borrowing a rule from another host.

## Submission boundary

Preparation is read-only. Reverify current official requirements immediately before public submission. Deployment, access changes, directory registration, credential entry, final submission, and publication each remain separate human-operated mutations that require explicit authorization for the exact target. Report remaining evidence gaps and stop when that authority or required directory access is absent.