# noodle CLI commands

Developer-facing `noodle` commands, grouped by area. Local authoring commands (`validate`, `test`, `dev`, `tools`, `resources`, `prompts`) need no login or link. Discover the exact command surface for the installed release with `noodle commands --json`.

## Contents

- Authoring & validation
- Local run & inspect
- Hosted deploy & operations
- Org & members
- Managed config
- Governance & observability
- CLI maintenance

## Authoring & validation

| Command | What it does |
| :-- | :-- |
| `noodle start` | Guided first-run: sign in, scaffold, then deploy or run locally (`--json` for headless). |
| `noodle init` | Create a local Noodle project. |
| `noodle setup` | Reconcile project config and local agent files (dry-run unless `--write`). |
| `noodle doctor` | Check login, service, project, validation, and config. |
| `noodle agents` | Manage AI agent skills and project context (`setup`/`context`/`doctor`). |
| `noodle auth` | Use `auth google` for keyless Google workload identity; diagnose downstream credentials without a business-tool call. |
| `noodle docs` | Export docs in an LLM-readable format. |
| `noodle connect` | Print connection setup for an agent host (Claude Code, Codex, Cursor, etc.). |
| `noodle import` | Import an OpenAPI spec into a starter `server.ts`. |
| `noodle export` | Compile locally and write the portable manifest JSON (no service). |
| `noodle validate` | Author-time compile/schema/connector check; no service (`--json`, `--fix-prompt`). |
| `noodle check` | Check tool design (`tool_design_*`) and MCP Apps/widget readiness; no service. `--min-severity warn` shows only what needs fixing. |
| `noodle test` | Local compile plus a loopback MCP smoke. |

## Local run & inspect

| Command | What it does |
| :-- | :-- |
| `noodle tools` | List local tools via a loopback MCP smoke. |
| `noodle resources` | List local resources via a loopback MCP smoke. |
| `noodle prompts` | List local prompts via a loopback MCP smoke. |
| `noodle dev` | Run a local loopback runtime that serves + hot-reloads the manifest (no login). |
| `noodle devtools` | Preview local widget metadata and rendering. |
| `noodle design` | Inspects the latest finalized widget design brief (`inspect --latest --json`). |

## Hosted deploy & operations

| Command | What it does |
| :-- | :-- |
| `noodle link` | Bind this directory to a Noodle Seed Cloud target (org/app/env). |
| `noodle assistant` | Manage backend credentials for customer-branded embedded assistant clients. |
| `noodle deploy` | Deploy the server to Noodle Seed Cloud. |
| `noodle open` | Open or print the latest deployment URL. |
| `noodle status` | Show hosted deployment status. |
| `noodle inspect` | Inspect hosted deployment metadata without secret material. |
| `noodle smoke` | Run hosted readiness diagnostics and print external smoke commands. |
| `noodle rollback` | Roll back to a previous deployment. |
| `noodle archive` | Archive the whole app: endpoints answer 410 Gone; hard-deleted after the retention window. |
| `noodle restore` | Restore an archived app within the retention window. |
| `noodle access` | Set the access mode (owner-only\|org-members\|authenticated\|customers). |
| `noodle apps` | List or inspect hosted apps for an org (`apps list`/`apps inspect <app>`). |
| `noodle envs` | List or inspect environments for an app (`envs list`/`envs inspect <env>`). |
| `noodle deployments` | List or inspect individual deployments (`deployments list`/`deployments inspect <id>`). |
| `noodle service` | Query hosted service capabilities. |
| `noodle login` | Authenticate with Noodle Seed Cloud. |
| `noodle logout` | Clear saved credentials. |
| `noodle whoami` | Print the current authenticated user. |
| `noodle feedback` | Send sanitized product feedback (bug, idea, docs gap) to the Noodle Seed team. |
| `noodle github` | Connect, inspect, or disconnect the GitHub repository behind an app’s GitHub-native deploys (`connect`/`status`/`disconnect`; `connect` opens a browser install, `--repo` for headless). |
| `noodle target` | Show or set the deployment target (local\|cloud\|other). |

## Org & members

| Command | What it does |
| :-- | :-- |
| `noodle orgs` | List or create orgs. |
| `noodle members` | Manage org members (list/add/remove). |

## Managed config

| Command | What it does |
| :-- | :-- |
| `noodle secrets` | Manage managed secrets (set/list/delete/resolve) by org/app/env scope. |
| `noodle variables` | Manage managed variables (set/list/delete/resolve) by org/app/env scope. |

## Governance & observability

| Command | What it does |
| :-- | :-- |
| `noodle audit` | Operator governance audit status and event queries. |
| `noodle logs` | View service/deployment logs. |
| `noodle metrics` | MCP analytics for a deployed server (volume, sessions, latency percentiles, two-tier errors, tools, clients). Agents: `noodle metrics --agent-output` for a health verdict + next actions. |
| `noodle events` | The per-request MCP event stream with status/tool/client filters; `--session <id>` replays one session in order. Agents: add `--json` and filter (`--status tool_error\|mcp_error`) when debugging. |
| `noodle alerts` | Analytics alert rules (`add\|list\|remove\|test`): an edge-triggered webhook fires when error share, error count, calls, or p95 latency breaches. Webhook URLs are stored server-side and shown redacted. |
| `noodle policy` | Manage policy (status/list/show/effective/simulate/suspend/quota/rate/...). |

## CLI maintenance

| Command | What it does |
| :-- | :-- |
| `noodle help` | Print CLI usage and command help. |
| `noodle version` | Print the installed CLI version. |
| `noodle commands` | Print the machine-readable command catalog (`--json`) or a compact human list. Agents: `noodle commands --json` for every command, subcommand, flag, and exit code without reading source. |
| `noodle features` | Print the versioned Claude, ChatGPT, and Embedded compatibility registry (`--json` or `--markdown`). |
| `noodle update` | Check for, install, or safely repair the CLI update. Agents: `noodle update --check --json`, then `noodle update --yes --json`; add `--repair` only when the check reports `repairSafe: true`. |