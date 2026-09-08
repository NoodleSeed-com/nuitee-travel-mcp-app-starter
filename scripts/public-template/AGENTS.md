# Wayfare

Wayfare is an example agentic travel project by Noodle Seed: a TypeScript MCP
App with a Next.js guest website. Read the
README and `docs/architecture.md` before changing the product. Before any
user-facing change, read `docs/brand/wayfare-brand-guidelines.md` in full.

For Noodle authoring, use the installed Noodle Seed skill. Generate optional
project-local guidance with the pinned CLI:

```sh
pnpm exec noodle agents setup --write
pnpm exec noodle agents doctor --json
```

Generated guidance is local tooling, excluded from this source distribution.
Do not add its runnable examples or private implementation notes to releases.
Use `noodle commands --json` for command discovery and parse its machine output.
Validate changes with `noodle validate --json`, then `noodle test --json` and
`noodle check --json` at the relevant entrypoint. Run `pnpm ci:offline` for the
application and `pnpm check:browser` for user-facing behavior.

Keep provider and model credentials server-side. Never print secret values,
raw provider bodies, offer IDs, or customer data. Ordinary tests use fictional
fixtures and require no accounts. Live provider checks require configured
credentials and authorization; deploy, link, hosted changes, publication, and
transactions require explicit authorization for the action and target.

Keep the capability boundary truthful: live flight/hotel reads, illustrative
ancillaries, no booking or payment. Preserve unrelated work, use reviewed PRs,
and never enable auto-merge or queue a PR without explicit user instruction.
