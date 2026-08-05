<!-- BEGIN NOODLE AGENT CONTEXT -->
<!-- noodle-agent-kit:0.60.0 hash:cbb5c6a18b420ad3 -->
# Noodle Seed Project Context

Agent target: Codex.

Build this project as a Noodle Seed MCP server or app authored in TypeScript. Every `--json` command uses the canonical envelope on stdout and keeps stderr empty: one-shot commands write exactly one envelope on stdout; streaming commands write one NDJSON envelope per line. Drive the loop by parsing machine state — not by reading source or scraping human prose.

## Agent-native loop

- **Applicability**: when the request is unrelated to the Noodle MCP server or app, follow the project's normal instructions and run no Noodle lifecycle commands.
- **Route first**: read the `noodle-seed` skill `SKILL.md`, choose exactly one primary route for the requested outcome, and read that primary reference. Read supporting references only when the route or observed evidence requires them.
- Discover: `noodle commands --json` — every command, flag, and exit code (don't read source).
- Author, when the selected route requires it: edit the configured TypeScript entrypoint — follow that route and its capability references.
- Validate: `noodle validate --json` → on failure `{ok:false,error:{code,message,fix,next,errors:[{code,path,message}]}}`; per-field detail is in `error.errors[]`.
- Repair: fix each `error.errors[]` entry at its `path`, re-run validate; `noodle validate --fix-prompt` gives ready repair prose. Never freeform re-edit.
- Smoke: `noodle test --json`.
- Continue only to the level the selected route requests: Apps/widgets use `noodle check --json` plus `noodle devtools`; hosted inspection stays read-only; hosted mutation runs only when the current user request explicitly authorizes the exact action and target.
- Stale skill? `noodle agents doctor --json` → `noodle agents setup --write`.

The exact `--json`/exit-code contract is in the `noodle-seed` skill and its `references/agent-contract.md`. Human-oriented command prose lives in the project README, not here.

## Safety

- Keep secrets, bearer tokens, refresh tokens, static access keys, `.env` / `.env.noodle` values, and `~/.noodle/config.json` out of prompts, logs, docs, tests, and generated files.
- Do not hand-author manifest JSON or YAML, runtime artifact JSON, connector IR, or hosted asset metadata.
- Do not add static data-plane credential paths; hosted access is identity-based.
- Never run `link`, hosted secret/variable/config/access changes, deploy, rollback, host configuration writes, or directory submission unless the current user request explicitly authorizes the exact mutation and target.

## Project Defaults

- name: nuitee-travel-mcp-app-starter
- entrypoint: src/server.ts
- template: widget
- app: nuitee-travel-mcp-app-starter

Generated Noodle agent files are project-local and non-secret. Refresh them with `noodle agents setup --write`.
<!-- END NOODLE AGENT CONTEXT -->
