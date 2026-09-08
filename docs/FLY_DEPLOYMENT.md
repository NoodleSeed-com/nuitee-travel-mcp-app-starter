# Deploy your own website on Fly.io

Fly runs the stateless Next.js website. Noodle Cloud owns the Assistant, MCP
server, model configuration, connector credentials, and caller-scoped state.
The starter contains no Fly app identity and automatic deployment is disabled
unless an adopter explicitly enables it. Creating a fork or merging a pull
request does not arm deployment.

## Prepare your coordinates

Create an app in your own Fly organization and set its public coordinates in
your shell. Replace the placeholders before running these commands:

```sh
export FLY_APP="<your-globally-unique-app-name>"
export FLY_DEPLOY_URL="https://<your-app>.fly.dev"
export NEXT_PUBLIC_SITE_URL="$FLY_DEPLOY_URL"
export NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID="<your-public-embed-id>"
export NEXT_PUBLIC_NOODLE_SERVICE_URL="https://cloud.noodleseed.dev"
```

`NEXT_PUBLIC_SITE_URL` is the website's exact canonical origin, used for page
metadata, social URLs, JSON-LD, robots, and sitemap. Use HTTPS without a trailing
slash, path, query, fragment, or credentials. An unset value falls back to
`http://localhost:3000`, marks pages noindex, blocks crawling, and publishes an
empty sitemap. Explicit HTTP loopback origins with a port are also noindex.
Changing these public build values requires rebuilding the image.

All `NEXT_PUBLIC_` values are public. Never put `NUITEE_API_KEY`, an Assistant
client secret, a model key, or a Fly access token in a public variable or Docker
build argument. Keep provider/model credentials in the supported Noodle secret
mechanism, separate from this website.

The default Assistant allowlist contains only `http://localhost:3000` and
`http://localhost:3001`. Prepare your own exact production origin locally:

```sh
pnpm customize -- --production-origin "$FLY_DEPLOY_URL"
pnpm customize:check
```

Add `--keep-local-demo` only if the same non-production Assistant must serve
`http://localhost:3000`. This edits source only. Separately configure and deploy
your Noodle Assistant through its supported hosted workflow before expecting
browser sessions to work. See [EMBEDDED_ASSISTANT.md](EMBEDDED_ASSISTANT.md).

## Manual deployment

Authenticate with Fly, create your app once, and deploy from the repository
root. Every command supplies `--app`; `fly.toml` intentionally has no `app` value.

```sh
fly auth login
fly apps create "$FLY_APP" --org "<your-fly-org>"
fly deploy --app "$FLY_APP" \
  --build-arg NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" \
  --build-arg NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID="$NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID" \
  --build-arg NEXT_PUBLIC_NOODLE_SERVICE_URL="$NEXT_PUBLIC_NOODLE_SERVICE_URL"
fly status --app "$FLY_APP"
fly logs --app "$FLY_APP"
```

The root `Dockerfile` builds Next.js standalone output and runs as an
unprivileged user. `fly.toml` uses one shared CPU and 512 MB RAM, stops when
idle, and has an HTTP health check. Cold starts are possible. Adjust its region
and memory for your own deployment.

## Opt in to GitHub Actions deployment

Configure the following **repository variables** in your own repository:

| Variable | Value |
| --- | --- |
| `ENABLE_FLY_DEPLOY` | Set exactly `true` only when ready to enable main-branch deployment; unset or `false` keeps it disabled. |
| `FLY_APP` | Your Fly app name. |
| `FLY_DEPLOY_URL` | Your exact HTTPS website origin, such as your app's Fly hostname or configured custom domain. |

The opt-in must be a repository variable because the job condition is evaluated
before the `production` environment is available. Configure these in the
`production` GitHub environment (or as repository variables where appropriate):

- `NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID`: your public Assistant embed ID.
- `NEXT_PUBLIC_NOODLE_SERVICE_URL`: the HTTPS Noodle service origin.
- `FLY_API_TOKEN`: an app-scoped deployment **secret**, never a variable.

For example, create and transfer an app-scoped token without printing it:

```sh
fly tokens create deploy \
  --app "$FLY_APP" \
  --name github-actions-production \
  --expiry 8760h | gh secret set FLY_API_TOKEN --env production
```

Enable the repository variable only after the app, public coordinates, secret,
and exact Assistant origin are ready. Setting it to `false` disables future
workflow deployments. This guide does not change GitHub settings or hosted state.

Only a push to `main` with `ENABLE_FLY_DEPLOY` exactly `true` can deploy, and it
must first pass `offline-quality-gates`. Pull requests and merge queues run
quality checks without deployment. The deployment job validates the app name,
HTTPS deployment/service origins and embed ID before invoking Fly. It passes
`FLY_DEPLOY_URL` as the image's `NEXT_PUBLIC_SITE_URL`, serializes deployments,
waits for rollout, and checks Fly status and the website response. Credentials
use the existing GitHub secret mechanism and never enter the image build.

An HTTP success proves website availability only. After deployment, verify the
canonical URLs and exercise a real browser conversation to prove exact-origin
Assistant binding and the provider-backed workflow. A successful Fly rollout
alone does not prove either of those boundaries.
