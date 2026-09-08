# Optional coding-agent guidance

The private development repository retains Noodle-managed `.agents/` and
`.claude/` trees. The public export excludes those trees and their runnable
examples. It supplies a small project-owned `AGENTS.md` and `CLAUDE.md` instead.
Application source, dependencies and tests remain identical to the approved
commit; generated examples are not application runtime dependencies.

After installing the pinned project dependencies, developers may generate local
guidance for their coding agent:

```sh
pnpm exec noodle agents setup --write
pnpm exec noodle agents doctor --json
```

Read generated instructions before using them. Do not hand-edit the generated
copies or their managed integrity metadata. Newly generated runnable examples
are upstream tooling, not part of this template's reviewed distribution. Keep
them local and do not import their code into the application.

`pnpm audit:generated-guidance` succeeds when no generated kits are distributed.
If kits are tracked, it verifies their managed hashes **and** rejects mutable
dependencies, absent exact package-manager versions, and missing example locks.
The private development tree intentionally fails that release-only check while
its old mutable examples remain. This does not block application CI; the public
export must pass the complete release audit.

The Apache-2.0 source declaration does not by itself complete the owner/legal
provenance review of any additional assets or examples an adopter distributes.
See [third-party notices](../THIRD_PARTY_NOTICES.md).
