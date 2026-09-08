# Optional coding-agent guidance

This repository excludes generated `.agents/` and `.claude/` trees and their
runnable examples. Small project-owned `AGENTS.md` and `CLAUDE.md` files provide
the shared context. Generated examples are not application runtime dependencies.

After installing the pinned project dependencies, developers may generate local
guidance for their coding agent:

```sh
pnpm exec noodle agents setup --write
pnpm exec noodle agents doctor --json
```

Read generated instructions before using them. Do not hand-edit the generated
copies or their managed integrity metadata. Newly generated runnable examples
are upstream tooling, not part of this template's reviewed distribution. Keep
them local and do not import their code into the application. The generated
trees are ignored by Git; keep changes to shared root context project-owned.

`pnpm audit:generated-guidance` succeeds when no generated kits are distributed.
If kits are tracked, it verifies their managed hashes **and** rejects mutable
dependencies, absent exact package-manager versions, and missing example locks.
Run `pnpm audit:release` directly in this repository before publication.

The Apache-2.0 source declaration does not by itself complete the owner/legal
provenance review of any additional assets or examples an adopter distributes.
See [third-party notices](../THIRD_PARTY_NOTICES.md).
