# Sanitized live-smoke evidence

This record separates verified application behavior from mutable Nuitee
sandbox behavior. It contains no credential, authorization header, endpoint,
request values, raw response, fare, carrier, opaque selection identifier, or
customer data.

## 2026-08-24 candidate

- Runtime: exact `@noodleseed/one` and CLI `0.136.0`.
- Environment: owner-authorized Nuitee sandbox credential, held server-side.
- Operations: read-only flight search and fare verification only. No booking,
  prebooking, hold, payment, cancellation, or other provider mutation ran.
- One-way control: the connector completed bounded response mapping with
  `partial` status, returned the maximum ten public itineraries, and every
  retained itinerary covered the one requested leg. No response-size error
  occurred.
- Persistent-session flow: search mapped ten public itineraries, the app-only
  selection helper recorded one application-issued choice, and active fare
  verification completed successfully. The repository owner separately
  confirmed in ChatGPT that verifying the same active fare again keeps the
  selected option after the repeat-selection fix.
- Caller-state expiry: after the real 30-minute TTL on the same server and MCP
  session, active verification mapped the expected
  `unknown_or_stale_selection` application error. The subsequent fresh search
  returned no selection, so the fresh-write layer did not complete.
- Long-running-server control: new MCP sessions against that same unrestarted
  local server then returned a tool-level state-operation signature with no
  structured content. A fresh one-shot CLI server mapped ten choices for the
  equivalent read-only control at the same time. This isolates a server-lifetime
  or state-runtime concern but does not establish its root cause.
- Round-trip attempts: two bounded synthetic searches reached application
  mapping but returned the public `provider_error` category with no itinerary.
  Neither produced `response_too_large`. Because neither returned a legitimate
  complete journey, this does not prove successful large-response or
  round-trip mapping.
- Privacy review: the audit process emitted only public status/category and
  aggregate counts. No private data appeared in its recorded output.
- Version boundary: `0.137.0` became available only after the controlled
  `0.136.0` server shutdown. The interactive self-update was declined. Retest
  the unresolved state layer after a reviewed exact-pin/Agent-Kit update.

The 6 MiB search-only ceiling remains a narrow application limit, not a claim
that every Nuitee response is below that size. Fare verification retains its
smaller limit. Do not raise the global connector default to compensate for a
provider error.

## Evidence still required

- One successful representative round trip whose normalized itineraries each
  cover both requested legs.
- One successful response in the previously observed large-response class,
  mapped under the search-only 6 MiB ceiling.
- A successful fresh search/write/verification after the real 30-minute TTL on
  the same unrestarted server. Expiry rejection is proven; fresh write is not.

Sandbox inventory is mutable and may be incomplete. A later provider success
must still pass application shape and leg-coverage checks before either open
item can be closed.
