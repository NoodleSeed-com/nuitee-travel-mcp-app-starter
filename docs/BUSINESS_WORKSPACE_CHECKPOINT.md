# Business workspace checkpoint

Checkpoint date: September 11, 2026. Branch: `feat/business-portal-workspace`.
The integration is based on freshly fetched main at
`52469fa8d581f75b52bca8b0ea458ba02e7de6b2`. Implementation commit: `a2ea949` (`feat: connect business portal and storefront
in one workspace`). Use `git log -1 --oneline` for the latest documentation
checkpoint. The worktree now lives in the starter repository’s permanent
`.worktrees/business-portal-workspace` directory.
No push or PR has been made; owner acceptance testing comes next.

## Accepted scope

One clone contains the existing Wayfare traveler, the migrated owner portal and
shared travel/assistant code. One business configures its own branding, approved
knowledge, Nuitée key and model service, privately tries a fixed reviewed version,
then explicitly publishes it locally. Multi-tenancy, superadmin, cross-business
switching and customer-specific forks remain deferred.

The old standalone portal and traveler remain preserved fallbacks. Do not edit
both implementations or synchronize databases bidirectionally. No hosted
Wayfare secrets or unfinished hotel-checkout code were incorporated.

## Implemented slice

- Root `pnpm dev:business` coordinates the portal at `127.0.0.1:3103`, traveler at
  `localhost:3100`, and SDK workers on loopback ports 3105–3107.
- The migrated portal keeps owner authentication, revision checks, saved
  preferences, knowledge drafts/approval and encrypted credential storage.
  Integrated mode adds versioned model connections and reviewed release schema 2.
- Actual private chat uses an exact prepared release and a one-use preview link.
  Explicit publication starts a separate worker, then switches only after
  successful startup. Failed publication preserves the prior active version;
  successful replacement stops the prior worker and existing tabs must reload.
- The frontend separates visual branding, saved/prepared content, private chat
  and the published version. It retains non-secret edits on failure, blocks
  stale or unsaved publication, and reports unsupported checkout/GBP hotels.
- Optional `migrate:business` copies a checked SQLite/key pair without changing
  the source or overwriting a destination. Copied sessions are cleared.
- Bookings, analytics and conversation review remain disconnected. No checkout,
  payment, flight booking or ticket issuance is implied.

See [the operating guide](BUSINESS_WORKSPACE.md) and
[architecture](BUSINESS_WORKSPACE_ARCHITECTURE.md) for exact commands and trust
boundaries. Runtime plaintext SDK files are private temporary material, cleaned
on normal shutdown; the long-lived authoritative vault is encrypted. Preserve
the database and matching installation key together.

## Verification

The committed implementation was verified again from an independent clean local
clone: frozen offline installation, full `pnpm ci:offline`, `pnpm test:business`,
`pnpm test:business:runtime` (2 tests), and `pnpm test:business:browser` all passed.
That clone contained no local data, credentials, generated guidance or untracked
application files. The public source exporter also passed for `a2ea949`.

- `pnpm ci:offline` passed: TypeScript, customization validation, history and
  license checks, 713 core tests, official Noodle checks, the embedded-host
  tests/build, and 313 web unit tests plus the production Next build.
- All 30 portal tests passed, including real HTTP authentication/CSRF, encrypted
  versioned credentials, one-use private preview links, concurrent stop handling,
  stale revisions, failed-publication preservation, restart and checked migration.
- Actual SDK fixture integration passed: private session, model HTTP/SSE, linked
  App tool execution, approved knowledge retrieval, disabled tools, publication,
  restart and an anonymous public streamed conversation.
- Real browser integration passed through actual portal UI, database, Next bridge
  and SDK: owner setup, provider/model save, brand/defaults/capability changes,
  approved knowledge, excluded draft, exact version review/private chat/publish,
  public chat and owner logout revoking private access. Fictional model/provider
  credentials only; no external provider or model requests were made.
- All 96 widget browser tests passed on rerun; one initial fallback-color timing
  assertion failed and passed in isolation and the complete rerun without a code
  change. Existing web browser suite: 85 passed, 17 existing conditional skips.
  The web suite used separate `.next-business-regression` output to coexist with
  the running combined preview. Eight additional business projection browser
  scenarios passed; the portal fixture UI covered 34 responsive layouts.
- The custom-business linked App fix additionally passed 35 widget unit tests and
  TypeScript. It preserves the original starter/demo output contracts.

The local migration has copied the existing owner account into the combined
installation, preserved its database/key pair, and cleared copied sessions so the
owner signs in again. The original installation is unchanged. No account reset,
secret export, hosted deployment, provider mutation or real transaction occurred.
The copied account still needs model settings before private chat can start.
Actual provider/model account verification is the first unproven evidence layer;
use the protected forms and explicit read-only provider check with your account.

## Acceptance and next work

1. Start `pnpm dev:business` and open the owner portal at
   `http://127.0.0.1:3103` and traveler at `http://localhost:3100`.
2. Follow [the operating guide](BUSINESS_WORKSPACE.md), using your model and Nuitée
   accounts. Preview the exact saved version before publication. Confirm edits
   remain drafts until publication and that the public page changes afterward.
3. Record acceptance fixes as new focused local commits. Push/open a PR only after
   explicit user direction following this testing.
4. Fetch main again before preparing the PR. Reconcile the separate hotel-checkout
   work when it has completed its own review; do not merge its unfinished branch
   ancestry into this change. Checkout and operational feeds are separate work.

The standalone portal is a committed fallback. Continue implementation in this
combined branch; do not maintain two diverging copies or synchronize databases.
