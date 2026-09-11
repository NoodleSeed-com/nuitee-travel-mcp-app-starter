# Business portal

The single-business owner workspace for Wayfare: authenticated owner access,
persistent business settings, knowledge review, encrypted travel/model
connections, and an explicit private-preview/publication flow. The approved
Host Grotesk typography, Wayline mark, rounded cards and mobile navigation are
preserved.

The portal, traveler website and shared runtime now live in one checkout. Start
both applications from the **repository root**:

```sh
pnpm install --frozen-lockfile
pnpm dev:business
```

Use Node.js 24.18 or later in the Node 24 line and pnpm 11.17.0. The owner portal
opens at [127.0.0.1:3103](http://127.0.0.1:3103/); the traveler storefront opens at
[localhost:3100](http://localhost:3100/). The runner reserves SDK ports 3105–3107.
The private account directory defaults to root `.local/business-portal`; set
`WAYFARE_BUSINESS_DATA_DIR` to use another directory.

Read [Run your business workspace locally](../../docs/BUSINESS_WORKSPACE.md) for
first-owner setup, bringing your Nuitée/model connections, optional account
migration, exact-version review, private chat, publication, backup and local
security boundaries. Read the [architecture](../../docs/BUSINESS_WORKSPACE_ARCHITECTURE.md)
and [app instructions](AGENTS.md) before changing the integration.

## What is connected

Saved settings and approved knowledge are frozen into a reviewed version with
non-secret travel/model metadata. **Preview saved version** runs the actual
assistant against that copy. **Publish reviewed version** switches the local
storefront only after a separate public worker starts successfully. A failed
publication retains the prior active version. Later saved changes do not take
effect until reviewed and published again. Replacing credentials preserves the
active version until publication; removing either connection stops both local
runtimes and revokes preview access.

The business supplies its own model endpoint, model name, API transport and key.
A Nuitée key or public Wayfare embed does not supply model credentials. The
portal encrypts the vault; the local SDK needs temporary private plaintext
configuration while running. This is a trusted-machine development setup, not a
production security perimeter.

Bookings, analytics and conversation feeds remain disconnected. Search and
selection do not create bookings or tickets. Hotel checkout is not implemented;
the separate checkout branch is still pending. The visual branding panel remains
labelled visual-only, separate from the real private chat.

## Run checks

From the repository root:

```sh
pnpm test:business
pnpm test:business:runtime
pnpm --filter @nuitee-travel-starter/web test:browser
```

Tests use temporary databases and fictional providers/model transports. The SDK
integration check runs real local SDK workers; fixture success does not verify
your provider entitlement, model account or hosted deployment. Current evidence
and remaining work are recorded in the
[workspace checkpoint](../../docs/BUSINESS_WORKSPACE_CHECKPOINT.md).

For isolated portal development, `npm run dev` in this directory starts the
standalone Node HTTP/SQLite server on `127.0.0.1:3003`. `npm test` runs its
`portal-*.test.mjs` tests. That standalone mode does not bind the integrated model
or traveler runtime; use `pnpm dev:business` for the complete local flow.

| Standalone setting | Purpose |
| --- | --- |
| `PORT` | Loopback listening port; default `3003` |
| `DATA_DIR` | Private database and key directory; default `.local/portal` relative to the current working directory |
| `PORTAL_TRAVELER_URL` | Validated server-configured traveler link; unset by default |

Do not reuse the preserved standalone portal's live data directory. The optional
`pnpm migrate:business <sourceData> <newDestination>` command copies a checked
snapshot; the destination must be absent and its parent must exist. The source
stays unchanged, the copied account requires a fresh sign-in, and no ongoing
synchronization is created.

## Migration provenance and assets

The portal source came from the standalone `travel-business-console` repository,
commit `256f318` (`feat: prepare immutable reviewed business portal versions`).
The migration carried `portal/*.mjs`, `portal/public/*`, and
`tests/portal-*.test.mjs`, with app-local test imports. Subsequent integration
belongs in this combined workspace; the standalone source remains a fallback.
No inherited Shopify runtime code, environment files or databases were copied
as application source. Account migration is a separate explicit local operation.

The approved owner visual is recorded in the source repository's
`design/portal-demo.html`, visual milestone `0433c10`. The optional **Open example
design** link still points to the preserved reference on `localhost:3002`; it is
not a required service and its labelled fictional records are not working data.

[ASSET_NOTICES.txt](ASSET_NOTICES.txt) is preserved from the source
`design/ASSET_NOTICES.txt`. Host Grotesk retains its SIL Open Font License and
Heroicons its MIT notice. Wayline geometry and source asset comments remain
preserved. Follow the full
[Wayfare brand guidelines](../../docs/brand/wayfare-brand-guidelines.md) for
user-facing changes.
