# Test in real hosts

Local `noodle dev` and `noodle devtools` prove the server works; the widget experience is only proven inside a real host. `noodle connect <client>` prints the exact setup flow per host.

## Contents

- Local inspection first
- Agent hosts (Claude Code, Codex, editors)
- ChatGPT (developer mode)
- Claude
- Public URL for a local server
- What to verify

## Local inspection first

Run `noodle dev` and inspect the loopback endpoint with MCP Inspector: `noodle connect inspector` prints the flow (`npx @modelcontextprotocol/inspector <printed endpoint>`). Preview widget metadata and rendering with `noodle devtools`.

## Agent hosts (Claude Code, Codex, editors)

`noodle connect claude-code` / `noodle connect codex` (add `--write` for project-local setup). For other editors (`cursor`, `vscode`, `gemini`), `noodle connect <client>` prints the setup steps, and `noodle docs export --format llms` produces portable context. With a deployed endpoint, `noodle connect <client> --endpoint <url>` prints the MCP client registration config.

## ChatGPT (developer mode)

1. Deploy: `noodle deploy`, then `noodle open --print` for the hosted MCP URL (ChatGPT needs a public HTTPS endpoint, not loopback).
2. In ChatGPT: Settings → Connectors → enable Developer mode → add the endpoint (`noodle connect chatgpt` prints these steps).
3. Toggle the connector on in a new conversation and sign in when prompted; testers outside your org need a wider access mode (`noodle access set`).
4. Test on mobile too — invoke the same connector from the ChatGPT iOS/Android apps to check widget layout.

## Claude

`noodle connect claude` prints the flow: deploy, then add the hosted MCP URL as a custom connector in Claude settings and sign in when prompted. Widgets render in Apps-capable Claude surfaces; elsewhere the tool’s text/structured result is shown.

## Public URL for a local server

To try an undeployed server in a host that requires a public URL, `noodle dev --tunnel` publishes a temporary public URL for the loopback endpoint (requires the external `cloudflared` binary on PATH). Treat it as a short-lived test URL — deploy for anything shared.

## What to verify

Run a golden prompt set — direct (“use <tool> to…”), indirect (a natural request the model should route), and negative (requests that must not trigger the tool). Confirm the model picks the right tool with the right arguments, the widget renders and its actions work, external links open, and the experience degrades to readable text where Apps are unsupported. Symptoms → `references/troubleshooting.md`.