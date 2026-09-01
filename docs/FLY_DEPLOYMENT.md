# Fly.io Experience deployment

The repository's hosted demo is the **Experience** environment at
`https://wayfare-experience.fly.dev`. Fly runs only the stateless Next.js
website. Noodle Cloud continues to own the Assistant, MCP server, model
configuration, connector credentials, and caller-scoped state.

## What the image contains

The root `Dockerfile` builds the `apps/web` workspace using Next.js standalone
output and runs it as an unprivileged user. The runtime image contains no source
credentials, development dependencies, database, or persistent volume.

`fly.toml` provisions one shared CPU with 512 MB RAM and lets the Machine stop
when idle. The first request after an idle period can therefore have a cold
start. Increase memory to 1 GB if production image optimization shows memory
pressure.

## Required public coordinates

Set these in the shell that runs the build:

```sh
export NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID="<public-embed-id>"
export NEXT_PUBLIC_NOODLE_SERVICE_URL="https://cloud.noodleseed.dev"
```

These values are intentionally public and are compiled into the browser bundle.
Never expose `NUITEE_API_KEY`, an Assistant client secret, a model key, or a Fly
access token through a `NEXT_PUBLIC_` variable or Docker build argument.

The Noodle Assistant surface must independently allow the deployment's exact
HTTPS origin. For the maintained Experience environment that origin is:

```text
https://wayfare-experience.fly.dev
```

## Automatic maintained deployment

The `CI` GitHub Actions workflow deploys the maintained Experience after every
successful push to `main`. Pull requests and merge-queue checks run the same
quality gate but never receive the production environment or deploy to Fly.

The `production` GitHub environment owns these deployment coordinates:

- `NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID` environment variable: the stable,
  public Assistant embed ID.
- `NEXT_PUBLIC_NOODLE_SERVICE_URL` environment variable:
  `https://cloud.noodleseed.dev`.
- `FLY_API_TOKEN` environment secret: an app-scoped deploy token for
  `wayfare-experience`. It is never passed to the Docker build.

The deployment job waits for `offline-quality-gates`, serializes production
deployments, uses immutable action and Fly CLI versions, waits for the Fly
rollout, and verifies both Fly status and an HTTP response from
`https://wayfare-experience.fly.dev`.

Rotate the app-scoped token without printing it to the terminal:

```sh
fly tokens create deploy \
  --app wayfare-experience \
  --name github-actions-production \
  --expiry 8760h | gh secret set FLY_API_TOKEN --env production
```

## Manual recovery deployment

If GitHub Actions is unavailable, authenticate with Fly and deploy from the
repository root:

```sh
fly auth login
fly deploy \
  --build-arg NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID="$NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID" \
  --build-arg NEXT_PUBLIC_NOODLE_SERVICE_URL="$NEXT_PUBLIC_NOODLE_SERVICE_URL"
```

Run `fly status`, inspect `fly logs`, and exercise a real browser conversation
after each manual recovery deployment. A successful image rollout does not by
itself prove the Assistant origin binding or live Nuitee workflow.

## Deploy your own copy

Fork or clone the repository, choose a globally unique Fly app name, and change
the `app` value in `fly.toml`. Create that app in your Fly organization, configure
your own public Noodle Assistant embed ID, and replace the exact production
origin through the supported customizer:

```sh
pnpm customize -- --production-origin "https://<your-app>.fly.dev" --keep-local-demo
pnpm customize:check
fly apps create <your-app> --org <your-fly-org>
fly deploy -a <your-app> \
  --build-arg NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID="$NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID" \
  --build-arg NEXT_PUBLIC_NOODLE_SERVICE_URL="$NEXT_PUBLIC_NOODLE_SERVICE_URL"
```

Changing the checked-in origin prepares the Noodle server source; it does not
mutate or redeploy an existing Noodle Assistant surface. Complete that hosted
configuration separately before claiming the embedded experience works.
