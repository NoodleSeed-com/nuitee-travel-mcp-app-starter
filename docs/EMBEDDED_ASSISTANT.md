# Embedded Assistant companion

This repository demonstrates one Noodle travel product in two places:

- ChatGPT, Claude, and other MCP hosts connect to the existing MCP server or
  MCP App.
- A travel retailer can embed the same tools and linked widgets in its own
  authenticated website.

Both paths use `createTravelServer(...)` from `src/travel-server.ts`. The
embedded entrypoint remains `src/embedded-server.ts` and calls
`createTravelServer('embedded')`; it does not copy the connector, schemas,
normalizers, tools, or widgets.

The small Cedar & Cloud Travel companion is in
`examples/embedded-assistant-host/`. It is a fictional local demonstration,
not a booking site or a production identity implementation.

## Architecture

```text
Browser sample website
  -> same-origin /api/assistant/session endpoint
  -> Noodle Embedded Assistant runtime
  -> existing search_flights and verify_flight_offer tools
  -> existing linked MCP App widgets
  -> Nuitee sandbox
```

The browser mounts the supported `NoodleAssistant` React wrapper. Its session
endpoint authenticates the website user, validates the exact browser origin,
and calls `createAssistantSession` from `@noodleseed/assistant/server`. The
browser receives only a short-lived assistant session. It never receives the
assistant client secret, a model credential, or `NUITEE_API_KEY`.

The companion runs on `http://localhost:5173` and binds only to
`127.0.0.1`. It does not replace or alter the existing travel preview on port
3003. The embedded server allowlist contains the exact localhost origin for
this development example. Before production, replace the illustrative
`https://app.example.com` origin with the real site origin and decide whether
the localhost origin should remain in that deployment. Production origins
must use HTTPS; wildcard origins are not supported by this example.

## Environment separation

The companion website backend may read only:

| Variable | Owner | Purpose |
| --- | --- | --- |
| `NOODLE_SERVICE_URL` | Website backend | Noodle service used for session exchange |
| `NOODLE_ASSISTANT_CLIENT_ID` | Website backend | Deployment-bound assistant client identifier |
| `NOODLE_ASSISTANT_CLIENT_SECRET` | Website backend | Deployment-bound assistant client credential |
| `PUBLIC_APP_ORIGIN` | Website backend | Exact browser origin; `http://localhost:5173` in development |

The assistant deployment, not the browser app, owns:

- `NUITEE_API_KEY`
- `ASSISTANT_MODEL_BASE_URL`
- `ASSISTANT_MODEL`
- `ASSISTANT_MODEL_API_KEY`

Model credentials and the Nuitee credential are separate secrets. None of
these values belongs in Vite public variables, browser source, HTML, built
JavaScript, cookies, URLs, logs, fixtures, screenshots, tool results, or Git
history. The companion's `.env.example` contains empty placeholders plus the
non-secret localhost origin. Store real local values in an ignored `.env`
inside the companion folder or inject them through the local process
environment.

External MCP hosts supply their own conversational model, so the normal
starter requires none of the three `ASSISTANT_MODEL_*` values.

## Development-only authentication

The local website starts signed out. Selecting **Enter demo** creates an
opaque, short-lived in-memory session in an HTTP-only, SameSite cookie. The
backend assigns this fixed synthetic identity:

```text
id: nuitee-demo-user
email: demo@example.invalid
roles: traveler
```

The identity is local demonstration data only. The browser cannot choose its
user ID, roles, scopes, or allowed origin. Signed-out session exchange returns
`401`; an unexpected `Origin` returns `403`. The demo login endpoint is absent
in production mode and the server remains bound to loopback, so this mechanism
must not be treated as production authentication.

A real travel website must authenticate its own user on the backend and derive
identity and authorization from that verified session. If the downstream API
requires per-user authorization, use a reviewed delegated credential exchange;
do not forward a browser-supplied user identifier with a shared credential.

## Run the local website

From the repository root:

```sh
pnpm install
pnpm --filter @cedar-cloud/embedded-assistant-host dev
```

Then open `http://localhost:5173`. With no assistant client configuration, the
retailer UI still loads, demo sign-in still works, and the page shows a concise
setup-required state. It does not substitute a fake assistant.

Use these local quality gates:

```sh
pnpm --filter @cedar-cloud/embedded-assistant-host typecheck
pnpm --filter @cedar-cloud/embedded-assistant-host test
pnpm --filter @cedar-cloud/embedded-assistant-host build
pnpm test
pnpm validate
pnpm agent:check:assistant
```

MCP authoring, validation, hermetic tool tests, the companion UI, and its
production build all work locally. A real external-browser conversation does
not: it requires a separately authorized assistant-enabled Noodle test
deployment and a deployment-bound assistant client.

## Manual hosted setup for a real session

These are owner actions, not ordinary local setup, and this repository does not
perform them automatically:

1. Replace the illustrative production origin in `src/travel-server.ts` with
   the exact HTTPS origin of the website. Keep only explicitly required local
   origins.
2. Re-run `pnpm agent:check:assistant` and the full repository gates.
3. Configure `NUITEE_API_KEY` and the three `ASSISTANT_MODEL_*` settings as
   server-side managed deployment configuration.
4. Deploy `src/embedded-server.ts` to an authorized owner-only test environment:

   ```sh
   pnpm exec noodle deploy src/embedded-server.ts \
     --org <org> --app <app> --env <test-env> --private
   ```

   Review the resolved organization, app, environment, access mode, origin,
   and entrypoint before approving that mutation.
5. Create a deployment-bound backend client:

   ```sh
   pnpm exec noodle assistant clients create --name cedar-cloud-website \
     --org <org> --app <app> --env <test-env> --json
   ```

   Store its returned credential only in the website backend as
   `NOODLE_ASSISTANT_CLIENT_ID` and `NOODLE_ASSISTANT_CLIENT_SECRET`.
6. Set `NOODLE_SERVICE_URL` and the exact `PUBLIC_APP_ORIGIN` in the website
   backend. Never prefix the secret variables with `VITE_`.
7. Run the doctor using the project-local CLI:

   ```sh
   pnpm exec noodle assistant doctor --origin <exact-https-origin> \
     --client-id <client-id> --org <org> --app <app> --env <test-env> --json
   ```

   Then run the companion typecheck, tests, production build, and a real
   browser smoke.
8. In the browser smoke, verify sign-out, wrong-origin rejection, session
   expiry, keyboard operation, error handling, linked travel widgets, and the
   absence of secrets from network responses, DOM, storage, logs, and built
   assets.

Command options can change. Discover the installed contract with
`pnpm exec noodle commands --json` before performing hosted steps. Creating a
client, setting hosted configuration, and deploying are mutations that require
separate authorization.

The example's `authenticatedWebsite(...)` surface protects Assistant session
exchange, but it does not invent a customer identity provider. A future
`--access customers` deployment must add and validate the integrating site's
real `server.auth` configuration first. Do not reuse the synthetic demo user as
a production identity.

## Current capability boundary

The shared product can search one-way and round-trip flights, compare bounded
results, and verify a selected fare. Search prices can change. It cannot
retrieve or complete a booking, collect payment or passenger details, manage a
booking, change travel, cancel, or refund. The sandbox disclosure in the sample
site is intentional.

Possible future post-booking tools include:

- `get_booking`
- `get_cancellation_policy`
- `quote_cancellation`
- `cancel_booking`

Do not implement those tools until the relevant official Nuitee endpoint
contracts are confirmed and each action has a separate, reviewed customer
authorization design.

## Other presentation modes

The current server uses the floating bottom-right Assistant surface. Noodle
also supports inline, drawer, and application-owned presentations. A custom
presentation must still use the supported Assistant bridge to render linked
MCP App views; it must not copy, scrape, or reinterpret widget HTML.
