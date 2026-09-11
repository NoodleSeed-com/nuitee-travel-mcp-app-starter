# Business portal instructions

Read this app's README, the repository root instructions and architecture, and
the full `../../docs/brand/wayfare-brand-guidelines.md` before user-facing work.
Preserve the approved portal design and asset notices. The portal was migrated
from standalone source commit `256f318`; the old repository is a fallback, not a
second implementation target.

- Scope is one business with server-enforced owner access. Do not add a
  superadmin, business switcher or multi-tenant hierarchy without a new decision.
- Use this app's Node 24 HTTP/SQLite entrypoint and package scripts. No inherited
  Shopify services, databases or runtime packages are part of this application.
- `PORT`, `DATA_DIR` and `PORTAL_TRAVELER_URL` remain configurable. Let the root
  workspace runner choose migration ports; do not stop the existing traveler or
  standalone portal. Do not share their private data directories.
- Private owner records and all mutations require server-side authentication.
  Preserve exact Host/Origin checks, CSRF protection, secure password hashing,
  session rotation/expiry/revocation and optimistic revision checks. Browser IDs,
  preference toggles and model context never grant permissions.
- The local portal uses `127.0.0.1`; the traveler uses `localhost`. Cookies are
  scoped by hostname, not port. Preserve this separation until a deliberate
  deployment identity design replaces it.
- Keys remain server-side and encrypted at rest. Never place them in browser
  storage, release exports, prompts, logs or responses. Save and validation are
  separate actions; provider checks are bounded, read-only and explicit.
- A selected environment and a successful key check do not establish booking,
  payment or ticketing entitlement. Keep preferences separate from capabilities.
- Preserve knowledge draft/review/approval and exact saved-version review.
  Reviewed snapshots are immutable and contain approved sources only. Preparing
  or downloading one is not runtime activation. Show only verified preview,
  activation and operational states as the workspace integration is added.
- Do not invent bookings, metrics, conversations, payment status or issued
  tickets. Operational records must come from supported authoritative sources.
- Keep unsaved non-secret edits on errors and revision conflicts. Never silently
  overwrite a newer saved version or substitute different content after review.
- Run `npm test` in this app after applicable changes. Tests use temporary
  databases and mocked providers, never `.local/portal`, existing user accounts,
  installation keys or real credentials. Browser and runtime checks belong at
  their actual integration boundary; local tests do not prove hosted activation.
- Keep `.local`, database files and environment files out of Git. Preserve the
  private installation key with its database. Do not reset an owner's account or
  move user data as part of an implementation test.
- Root workspace tooling and runtime connection code are separate ownership
  areas. Coordinate contract changes rather than duplicating runtime logic here.
- No push, PR, hosted deployment, provider-account change or real transaction
  without explicit user direction for the action and target.
