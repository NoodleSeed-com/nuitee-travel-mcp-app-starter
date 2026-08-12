# Product agent guides

An `agentGuide` is the optional, host-neutral, TypeScript-only source for product-level workflow guidance beyond individual MCP capability descriptions. Noodle validates it and generates the App Package product skill; it does not invent the guide’s product judgment.

## Required decision

Do not wait for the user to name `agentGuide`. During every MCP server or App build, decide whether the product needs one and state the decision and reason in the design or handoff.

Author a guide when any of these conditions applies:

- A request for an App Package, product skill, plugin, or agent distribution requires one.
- Multiple capabilities participate in one user workflow, especially when order or purpose matters.
- Safe or useful operation depends on product-specific ordering, grounding, clarification, boundaries, or representative examples that capability descriptions cannot express.

A product with a single self-explanatory capability may omit the guide when its description, schema, and annotations fully communicate safe use and there is no product-specific workflow or boundary to add. Tool count is a signal, not a rule: one ambiguous or consequential capability can still require a guide, while several independent self-explanatory capabilities may not.

Make the judgment from the user’s stated outcome and grounded product evidence. If a guide is warranted but a decision-changing workflow or boundary is unknown, ask only for that missing product input; never fabricate it. The user should not need to know this feature name to receive the benefit.

## Authoring shape

The guide contains `description`, `useWhen`, named `workflows`, optional `boundaries`, and optional example prompt-to-workflow mappings. Each workflow step references a declared `tool`, `resource`, or `prompt` by symbolic `{ kind, name }`; do not duplicate schemas, connector bindings, URLs, credentials, or raw runtime data.

Keep identifiers within 200 characters and prose within 4,000 characters. A guide has at most 32 `useWhen` entries, 32 workflows, 64 steps per workflow, 64 boundaries, and 64 examples. The compiler rejects an App Package whose bounded derived MCP surface would still exceed its artifact ceiling.

Use `server.instructions` for a concise live MCP-session primer. Noodle-owned workflow skills teach how to build and operate Noodle projects; a product guide teaches agents how to use this one deployed product. Compilation validates references and produces an App Package sibling while the RuntimeArtifact deliberately omits guide prose.

## Local lifecycle

`noodle agents setup` previews the local product-skill files compiled from `server.ts`; add `--write` to install them under `.agents/skills/<app-skill>/` and `.claude/skills/<app-skill>/`. No account or hosted deployment is required. The app files have an ownership record separate from the Noodle workflow skills.

`noodle agents setup --write` is idempotent and never overwrites a modified app-skill file. `--force` applies only to Noodle-owned project context, not app product skills. Run `noodle agents doctor --json`: `agent_skill_modified` means preserve and review local bytes; `agent_skill_stale` means source, surface, renderer, or installed files changed, so preview before writing; `agent_skill_invalid_state` means the ownership record is malformed or unsafe, so preserve the files and review the record before retrying.

Recover `agent_guide_*` errors by correcting the guide shape, workflow IDs, and capability kind/name. Remove any credential-shaped value: managed config is referenced by name only.