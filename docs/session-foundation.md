# Session foundation

The modules in `src/domain/session-*` are inactive building blocks. Existing
server profiles do not register this connector or handle. They currently
support initialization and draft invalidation only, not selection, booking,
payment, or loyalty operations.

## State and transitions

One caller-scoped aggregate contains the current draft identity/revision,
optional quote/review references, and up to 64 idempotency records. Storage
revision belongs to the platform; draft revision belongs to the application.
They are deliberately separate.

`runSessionTransition` validates an internal input and returns an error, a
previously committed result, or a proposal. It never performs a write. Draft
invalidation increments the draft revision and removes quote/review references.
The request must match both the current draft ID and its revision. A delayed
request for an expired draft cannot mutate its replacement even when both
drafts start at revision one. The supplied draft ID is only a reference checked
against already caller-scoped state; it cannot establish identity or authority.
Later selection changes must occur in the same proposal, not in a separate
write followed by invalidation.

The integration must persist a proposal with one `patch_state` call using
`expectedStorageRevision`. `gateSessionCommit` reports new success only when
the actual patch returned `ok: true`. On conflict, return the conflict or read
again and recompute; never attach a newer revision to a stale proposal.

A matching idempotency key returns the original committed result before
checking the request's now-stale draft revision. Reusing a key for a different
operation or payload, including a different expected draft ID, is rejected.
Records are retained until session expiry;
the capacity limit fails closed instead of silently forgetting replay history.

## Expiry and recovery

The aggregate has a hard 30-minute lifetime from initialization. Updates do not
extend it, regardless of the storage service's retention behavior. Review
references have at most five minutes and cannot outlive their quote or session.

An expired aggregate rejects late mutations. An explicit initialization may
propose replacing retained expired state, using a newly issued draft ID and a
key absent from that retained state. Replacement still requires the current
storage revision and a successful patch. This is temporary session state, not
durable booking history or an indefinite cross-session replay guarantee.

## Activation requirements

Before integrating these modules, prove the complete recorded flow:

1. Read through the public platform state connector and check `ok`. A failed
   read must not be converted into a missing state.
2. Supply authoritative invocation time and securely issued references through
   trusted integration, never model or browser fields.
3. Propose, conditionally patch once, and map the actual patch result to the gate.
4. Test real caller separation, concurrent writes, and expiry/recovery against
   the same unrestarted target. Caller separation alone does not establish
   conversation separation; the host's partition/reset behavior needs evidence.

Unit tests exercise emitted compute code without imported closures or ambient
time APIs. A small test CAS adapter proves algorithm behavior only. Public
manifest/catalog construction proves compatibility of the declarations, not
runtime persistence, secure issuance, or hosted isolation.
