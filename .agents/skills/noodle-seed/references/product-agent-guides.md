# Product agent guides

An `agentGuide` is the optional, host-neutral, TypeScript-only source for product-level workflow guidance beyond individual MCP capability descriptions. Noodle validates it and generates the App Package product skill; it does not invent the guide’s product judgment.

## Required decision

Do not wait for the user to name `agentGuide`. During every MCP server or App build, decide whether the product needs one and state the decision and reason in the design or handoff.

Author a guide when any of these conditions applies:

- A request for an App Package or app product skill requires one. A marketplace plugin or customer-agent distribution also needs this product source in addition to separate listing metadata.
- Multiple capabilities participate in one user workflow, especially when order or purpose matters.
- Safe or useful operation depends on product-specific ordering, grounding, clarification, boundaries, or representative examples that capability descriptions cannot express.

A product with a single self-explanatory capability may omit the guide when its description, schema, and annotations fully communicate safe use and there is no product-specific workflow or boundary to add. Tool count is a signal, not a rule: one ambiguous or consequential capability can still require a guide, while several independent self-explanatory capabilities may not.

Make the judgment from the user’s stated outcome and grounded product evidence. If a guide is warranted but a decision-changing workflow or boundary is unknown, ask only for that missing product input; never fabricate it. The user should not need to know this feature name to receive the benefit.

## Scope boundaries

Noodle workflow skills teach a coding agent how to build and operate Noodle projects. The generated app product skill is team-local guidance for using one product. A marketplace plugin is a separate host distribution bundle.

A host-neutral distribution metadata and archive framework now exists, but per-app marketplace plugin generation is not available until a target adapter lands, and customer-agent distribution is not available. If the user asks for either, explain the boundary and stop at the proven local App Package, product-skill, and metadata work. Do not claim a target bundle, submission, hosted distribution, or customer-agent projection.

## Creation workflow

1. **Inspect grounded capability evidence.** Read the configured TypeScript entrypoint (`server.ts` or `src/server.ts`) and identify its exact declared tools, resources, prompts, descriptions, visibility, annotations, authorization, and widget relationships. Treat schemas and compiled annotations as facts. Never invent or guess a tool, resource, prompt, capability kind, workflow, or weaker write boundary.
2. **Decide guided or unguided.** Apply the criteria above and state the decision with its evidence. If the existing capabilities are self-explanatory and no product judgment is missing, recommend an intentionally unguided server and stop this workflow.
3. **Interview only for product judgment.** Ask the builder for the decision-changing triggers, workflow ordering, grounding or clarification rules, boundaries, and representative prompts that source cannot prove. Do not ask them to restate capability names or schemas already present in TypeScript.
4. **Propose TypeScript.** Present the complete proposed `agentGuide` block, map every step to one exact declared capability and kind, and call out how write, destructive, open-world, confirmation, authorization, and widget boundaries remain unchanged. Request explicit approval before editing the configured TypeScript entrypoint.
5. **Apply and prove after approval.** Add or revise only the approved TypeScript guide. Run `noodle validate --json`, repair each structured guide error at its exact path without free-form invention, then run `noodle test --json`.
6. **Preview the App Package plan.** Run `noodle agents setup --json` and report its exact target, file, ownership-migration, removal, and replacement actions. A preview never writes files. For an existing installed app skill, pass `--regenerate-app-skill` to state the intended operation explicitly; add `--replace-modified-app-skill` only when the builder is considering replacement of previously Noodle-owned bytes.
7. **Ask separately before installation.** Request explicit approval before writing or replacing the app product skill. On approval, run `noodle agents setup --write` for a first installation, or `noodle agents setup --write --regenerate-app-skill` for a changed, migrated, renamed, or removed installation. Add `--replace-modified-app-skill` only when the preview identified modified previously owned bytes and the builder approved losing those exact local modifications.

## Authoring shape

The guide contains `description`, `useWhen`, named `workflows`, optional `boundaries`, and optional example prompt-to-workflow mappings. Each workflow step references a declared `tool`, `resource`, or `prompt` by symbolic `{ kind, name }`; do not duplicate schemas, connector bindings, URLs, credentials, or raw runtime data.

Keep identifiers within 200 characters and prose within 4,000 characters. A guide has at most 32 `useWhen` entries, 32 workflows, 64 steps per workflow, 64 boundaries, and 64 examples. The compiler rejects an App Package whose bounded derived MCP surface would still exceed its artifact ceiling.

Use `server.instructions` for a concise live MCP-session primer. Noodle-owned workflow skills teach how to build and operate Noodle projects; a product guide teaches agents how to use this one deployed product. Compilation validates references and produces an App Package sibling while the RuntimeArtifact deliberately omits guide prose.

## Local lifecycle

`noodle agents setup` previews the local product-skill files compiled from `server.ts`; add `--write` for the first installation under `.agents/skills/<app-skill>/` and `.claude/skills/<app-skill>/`. No account or hosted deployment is required. The app files have an ownership record separate from the Noodle workflow skills.

A normal `noodle agents setup --write` refreshes Noodle-owned workflow skills but leaves an already installed app product skill unchanged. Regeneration, ownership-schema migration, rename, and removal require `--regenerate-app-skill` and are previewed even when `--write` is present without that flag. `--force` applies only to Noodle-owned project context and never overwrites a modified app-skill file. `--replace-modified-app-skill` is the narrower, separately approved recovery for previously owned app-skill bytes; it never claims unowned collisions or bypasses malformed state.

Run `noodle agents doctor --json`: `agent_skill_modified` means preserve and review local bytes; `agent_skill_stale` means source, surface, renderer, installed files, or ownership schema changed, so preview explicit regeneration; `agent_skill_invalid_state` means the ownership record is malformed or unsafe, so preserve the files and review the record before retrying.

Recover `agent_guide_*` errors by correcting the guide shape, workflow IDs, and capability kind/name. Remove any credential-shaped value: managed config is referenced by name only.