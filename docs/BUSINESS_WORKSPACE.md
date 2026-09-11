# Run your business workspace locally

This checkout contains one business owner portal, the existing Wayfare traveler
website, and their shared travel and assistant runtime. Configure your business
in the portal, try an exact reviewed version privately, then publish it to the
local storefront. A second checkout or a separate admin repository is not needed.

This is a local development setup for a trusted machine. It is not a hosted
production deployment. Bookings, payments, ticketing and operational feeds are
not implemented by this integration.

## Start from one clone

Use Node.js 24.18 or later in the Node 24 line and pnpm 11.17.0. From the
repository root:

```sh
corepack enable
corepack prepare pnpm@11.17.0 --activate
pnpm install --frozen-lockfile
pnpm dev:business
```

The runner starts the portal and website together. Assistant workers start when
you request a private preview or publish a reviewed version. A saved publication
is restored on a later startup; a private preview must be started again.

| Address | Purpose |
| --- | --- |
| [127.0.0.1:3103](http://127.0.0.1:3103/) | Owner sign-in, business configuration and publication |
| [localhost:3100](http://localhost:3100/) | Traveler storefront; uses the published version |
| `http://127.0.0.1:3105` and `http://127.0.0.1:3106` | Alternating local SDK workers for public versions |
| `http://127.0.0.1:3107` | Local SDK worker for the private preview |

Keep the runner terminal open. Use Ctrl+C for normal shutdown and cleanup. If a
required port is occupied, stop your previous combined-workspace instance or the
known conflicting process. The runner does not take over occupied ports. The
preserved traveler on port 3000 and standalone portal on port 3003 can remain
separate fallbacks.

The default data directory is `.local/business-portal` at the repository root.
To use another private directory, set it when starting the runner:

```sh
WAYFARE_BUSINESS_DATA_DIR=/absolute/private/business-data pnpm dev:business
```

The first visit creates this installation's owner account. If you copied an
existing account using the migration command below, sign in with that account.
Only one business owner workspace is implemented; there is no superadmin or
business switching.

## Bring your own connections

Open **Setup & launch → Connect**, or **Connections**. The two connections are
separate:

- **Nuitée:** enter your business's API key and select its account environment.
  **Save key securely** stores it without calling Nuitée. **Check saved key**
  performs an explicit read-only check. Environment selection and a successful
  check do not establish booking, payment or ticketing permissions.
- **Model:** enter your model API base URL, exact model name, API transport
  (`Responses API` or `Chat Completions API`), and model API key. Use values from
  your existing model account or compatible server. An HTTPS endpoint is
  required; HTTP model endpoints are not supported by this SDK integration.
  **Save model connection** stores these values without contacting the provider.

The public Wayfare embed does not supply a hidden model key. No existing Wayfare
hosted account, model secret, provider environment file or SDK login is copied
into this installation. A Nuitée key alone cannot run the conversational model.

Use the authenticated portal forms for this mode. The root `.env.example` is for
the separate starter MCP commands; `dev:business` does not use it to import
provider or model credentials. Keys stay server-side and are not returned by the
portal, included in release downloads, or stored in browser storage. Secret
inputs are cleared on submission; non-secret edits remain available after an
error or revision conflict.

## Configure, review, preview, publish

1. Save your business name, welcome, appearance, language, currency and agent
   preferences. Preferences do not grant provider capabilities. Hotel checkout
   must remain off. Hotel search supports CAD, USD and EUR; choose one of those
   currencies or disable hotels before previewing a GBP configuration.
2. Add business facts, FAQs or policies in **Knowledge**. Save each source as a
   draft, review its text, then **Approve in portal**. Editing an approved source
   keeps its existing approved text until the revision is approved.
3. In **Preview**, select **Review saved version**. Review the exact saved
   settings, approved source contents, and travel/model connection metadata.
   Select **Prepare reviewed version** to freeze that copy. Saved knowledge
   drafts and unsaved source edits are excluded. Save or discard unsaved settings
   and model connection fields before preparing a version.
4. Select **Preview saved version**. The portal starts the actual local assistant
   for that exact prepared version. When the server reports it ready, use
   **Open private chat preview** to open a separate tab. The access link is
   one-time and short-lived; **Get a new preview link** creates another. This is
   real chat using your configured accounts, so chat and travel requests can
   reach the model and Nuitée services. The branding panel above it is explicitly
   visual-only and never generates replies.
5. After trying the private chat, open **Launch → Review publication**. Review
   the version again, then select **Publish reviewed version**. The new public
   worker must start successfully before the active storefront version changes.
   **Open published storefront** opens the current version at `localhost:3100`.

Preparing, downloading or saving a version does not publish it. The public
storefront uses only the active published version. Later changes require a new
review, preparation and private preview before publication. Repeating preparation
with unchanged saved content keeps the existing prepared version.

Publication captures the reviewed revision and exact release. If another tab
changes the workspace, the server rejects the stale request. Use **Load latest
and keep my edits**, then review again. A failed publication preserves the
previous active version; **Refresh runtime status** reads its current health.
After a successful switch the previous worker is stopped. Reload existing
traveler chat tabs to start using the new version.

Replacing a saved key keeps the active version's previous credential available
until the replacement version is published. **Removing** either connection stops
both public and private local runtimes and revokes preview access. It does not
revoke the key in the external provider account. Reconnect, prepare, preview and
publish before using the storefront again.

## Copy an existing portal account, optionally

Run migration before first starting the combined portal with that destination.
Use the source data directory that contains both `portal.sqlite` and its matching
`installation.key`. The destination must not exist, its parent must already
exist, and source and destination must be separate directories.

```sh
mkdir -p .local
pnpm migrate:business /absolute/source/portal-data "$PWD/.local/business-portal"
pnpm dev:business
```

The command takes a SQLite backup, copies the matching encryption key, validates
the copied database, and clears sessions in the copy. Sign in again using the
copied owner account. Settings, knowledge, saved provider credentials and reviewed
versions remain in the copied database; the source directory stays unchanged.
The command refuses an existing destination, including an empty one, and cleans
up a partial destination if migration fails.

Do not point both applications at the same live directory. The copy is a
checkpoint, not ongoing synchronization: later changes in either installation
are not copied to the other. Use the combined workspace as the development
target and preserve the standalone source as a fallback. Migrating the old
portal account does not discover or import hosted Wayfare model credentials.

## Local storage and trust boundary

Back up `portal.sqlite` and `installation.key` together while the workspace is
stopped, and protect the pair as private account data. The installation key is
required to decrypt the saved vault; replacing or losing it does not recover the
credentials. Do not commit databases, backups, keys or generated runtime files.

The portal encrypts the long-lived credential vault. To run the local SDK, each
worker receives the reviewed credential versions and writes temporary plaintext
SDK configuration with file mode `0600` inside a private `0700` runtime directory.
Approved source files and generated entrypoints are private as well. Normal
shutdown removes these worker files. An abrupt machine/process failure can leave
private artifacts, so treat the whole data directory and generated runtime paths
as sensitive; do not distribute them as part of a source copy. The SDK cannot be
described as keeping every local credential copy encrypted while it runs.

The portal uses `127.0.0.1` and the traveler uses `localhost`. Owner and preview
cookies are HttpOnly and SameSite=Strict; their names include the application
port (`wayfare_portal_3103` and `wayfare_preview_3100`) to prevent name collisions
with other local instances. Browsers scope cookies by hostname, not port. These
names do not isolate applications sharing a hostname. Preview access also
requires the server's owner-session and exact-release binding; signing out or
removing a connection revokes it.

The SDK development control plane is open on loopback and assumes a trusted local
machine. This arrangement is not suitable for untrusted users on the same
machine, a shared public server, port forwarding, or production hosting without
a separate deployment and access design. Starting the local workspace performs
no hosted deployment or provider-account administration.

## What is still disconnected

Bookings, analytics and conversation review have no authoritative operational
feed. The portal shows missing-data states, not invented bookings, revenue or
zero activity. Flight search/selection/fare verification does not book a flight
or issue a ticket. Hotel checkout and payments are not included. The separate
hotel-checkout branch has not been incorporated and still needs its own review.
Experiences, cars, rewards and protection retain their labelled illustrative
planning behavior where supported; they are not live transaction services.

## Checks for this integration

Run from the repository root:

```sh
pnpm test:business
pnpm test:business:runtime
pnpm test:business:browser
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web test
pnpm --filter @nuitee-travel-starter/web test:browser
```

`test:business` exercises portal, storage, permissions and integration boundaries
with temporary data and stubs. `test:business:runtime` starts the actual local SDK
against a fictional model transport, streams a tool/App turn, and checks
publication and restore. It requires free test ports 3415–3417 and local process
execution; it is not a live-provider or model-quality test. Web browser fixtures
check the real rendered interface without requiring provider accounts. Install
the test browser once with `pnpm exec playwright install chromium` if needed.

These are reproduction commands, not a claim that every release gate has passed.
See the [current checkpoint](BUSINESS_WORKSPACE_CHECKPOINT.md) for verification
status and remaining review, and the
[workspace architecture](BUSINESS_WORKSPACE_ARCHITECTURE.md) for the integration
boundary. Local user testing is required before requesting a PR or push.
