# Optional embedded assistant

This starter supports two consumption paths built from one shared Noodle
product factory: one set of travel tools, the same Nuitee connector and
normalization logic, and the same MCP App widgets. Separate entrypoints select
credential-free, live external-host, or optional embedded configuration without
duplicating business behavior.

The optional composition is `src/embedded-server.ts`. It selects the same
`createTravelServer(...)` factory as `src/live-server.ts`; its illustrative
`https://app.example.com` allowed origin must be replaced with the embedding
product's exact HTTPS origin before any deployment.

## External MCP host mode

ChatGPT, Claude, and other MCP hosts supply the conversational model. In this
default mode, the starter needs no assistant model API key. The host connects
to the MCP server, invokes its travel tools, and renders supported widgets or
their text fallback.

## Embedded website mode

An application developer may optionally add the Noodle assistant to an
authenticated website or SaaS product. The shared product factory can be given
an `embeddedAssistant(...)` configuration; do not create assistant-specific
copies of the flight tools, schemas, connector, normalizers, or widgets.

Embedded mode requires these Noodle deployment settings:

- `ASSISTANT_MODEL_BASE_URL`
- `ASSISTANT_MODEL`
- `ASSISTANT_MODEL_API_KEY`

The model credential is completely separate from `NUITEE_API_KEY`. Both remain
server-side. Neither may appear in browser code, prompts, tool results,
fixtures, tests, logs, screenshots, generated artifacts, or version control.
The browser receives only a short-lived assistant session; it never receives a
model key, Nuitee key, assistant client secret, MCP token, or raw application
session.

## Presentation choices

Choose the experience that fits the host product:

- Floating assistant
- Inline assistant
- Drawer assistant
- Application-owned UI using the headless client

The built-in floating presentation is a reasonable default, but it is not a
requirement. Application-owned UI must still render linked MCP App views through
the supported bridge rather than copying or interpreting widget HTML.

## Integration boundary

1. Add one server-level `embeddedAssistant(...)` configuration to the existing
   travel server. Configure exact allowed origins: HTTPS in production and only
   explicit localhost or `127.0.0.1` origins for local development.
2. Configure the model base URL and model as managed variables and the model API
   key as a managed secret in the Noodle deployment. Do not place these values
   in the embedding application's browser environment.
3. Deploy the assistant-enabled server before creating an assistant backend
   client. Deployment and hosted configuration are separate, explicitly
   authorized operations and are not performed by this repository's ordinary
   tests.
4. Add an authenticated, same-origin backend session endpoint in the embedding
   application. Authenticate the application user first, then exchange the
   verified identity with `@noodleseed/assistant/server`.
5. Source the application origin from trusted backend configuration or match it
   against the same exact allowlist. Browser page context is an untrusted model
   hint and must never grant authorization.
6. Forward the assistant session response unchanged. The browser keeps the
   short-lived session in memory and mounts the React wrapper, custom element,
   or supported headless client.

Static authoring checks do not require any of these values:

```sh
pnpm validate:embedded
pnpm exec noodle check src/embedded-server.ts --target embedded-assistant --json
```

Running or deploying that optional entrypoint requires the three managed model
settings plus the managed Nuitee key. Do not put placeholder or real values in
this repository.

Customer identity is optional for the default external-host starter. An
embedded product must define its own authenticated user boundary. If it passes
roles or scopes, they must come from the verified backend session. If the
downstream business API must enforce per-user authorization, use the supported
delegated token-exchange architecture rather than forwarding a user identifier
with a shared credential.

The example does not declare a fictional identity provider. Deploying the MCP
resource with `--access customers` therefore requires the integrating product
to add and verify its real `customerAuth` configuration first. A backend-minted
assistant session can be used with other deployment access modes, but the SaaS
backend must still authenticate its own user before session exchange.

## Validation and deployment

Before integrating an embedded host, validate the assistant-enabled server and
the exact embedding origin with the current Noodle commands and run the host's
production-equivalent build. Verify that:

- signed-out session exchange returns `401`;
- wrong or malformed origins fail closed;
- browser network, DOM, and storage contain no model or connector credential;
- keyboard submission, loading, errors, and linked travel widgets work;
- page Content Security Policy allows the required Noodle service origin in
  both `connect-src` and `frame-src`;
- no deployment or hosted configuration is inferred from local validation.

This repository does not contain real credentials, configure hosted secrets,
deploy an assistant, or implement an embedding application's authentication.
