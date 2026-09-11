# One business workspace and storefront

This branch adds the approved owner portal alongside `apps/web` without moving
existing MCP sources or importing the unfinished hotel-checkout branch. The
standalone portal remains a preserved fallback, not a second development target.

## Local assistant topology

Travelers use the existing Next.js headless assistant and linked travel Apps at
`http://localhost:3100`. Their jobs are supported travel search/planning and
answers from owner-approved business reference material. Existing illustrative
experiences, cars, rewards and protection remain labelled; no booking, payment,
ticketing, or operational-feed implementation is implied.

The owner signs in to the local single-business portal at
`http://127.0.0.1:3103`. Saved settings, approved knowledge and versioned credential
references form an immutable reviewed release. A private authenticated Noodle
assistant previews that exact release at `/studio-preview`. A one-use, short-lived
fragment ticket exchanges server-side for an HttpOnly owner-bound preview cookie;
the Next server mints SDK sessions only after the portal verifies this binding.
Raw credentials never pass through the browser or enter release exports.

Publication starts a separate public Noodle runtime, checks its boot, and only
then atomically changes the portal's active release. Failure preserves the prior
public version. SDK runtime ports are 3105/3106 (alternating public versions) and
3107 (private preview). The public store projection is server-owned, and preview
session responses retain official SDK tokens and endpoint URLs unchanged. The
existing custom renderer is retained to preserve the approved Wayfare layout,
keyboard/mobile experience and typed linked-App transcript.

This is a local application on a trusted developer machine. Noodle's development
service is not a production perimeter. Exact website origins are configured on
the runtime. No hosted service or provider account is changed by this migration.
The business supplies its model endpoint, model name and API key and its Nuitée
key using protected portal forms. Existing hosted Wayfare credentials are neither
copied nor inferred. Local functional evidence uses fictional model/provider
fixtures; actual provider/model access requires the owner's configured accounts.

SQLite and its installation encryption key migrate together through a checked
copy. The source database remains untouched. New development uses the combined
repository; preservation does not create automatic bidirectional synchronization.
