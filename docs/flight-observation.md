# Flight observation foundation

The internal flight observation adapter implements the approved known/unknown
fact policy. It does not change or register any current flight tool, connector,
selection flow, or view. Current flight search and verification remain intact.

`runLegacyFlightObservation` receives an existing normalized itinerary, the
original search context, the expected trip context, and trusted lookup metadata.
It returns a bounded observation or a fixed safe invalid-input result. The
authoring schemas describe strict known/unknown facts and five prerequisite
checks; a missing optional fact does not suppress the entire observation.

## Trust and evidence

The caller must resolve the legacy selection from the current session and issue
the canonical reference before invoking this function. Both reference strings
are syntactically checked, and the supplied legacy reference must match the
itinerary. That check does not establish entropy, ownership, or permission.
The authority object must never come from model or browser input.

`observedAt` is the original server-recorded search observation time, not the
time this adapter runs or the provider's arbitrary `retrievedAt` string.
`selectionExpiresAt` is the existing server retention deadline; `now` is an
injected server time. Mapping must not refresh either observation or retention.
All instants require explicit known offsets. Provider expiry remains separately
known or unknown; absent provider expiry never means that inventory is held.

The adapter is specific to observations obtained through the Nuitee gateway.
Its live provenance describes that source, not a new provider call or a promise
that the old observation is still available. Tests use synthetic gateway
responses as hermetic contract examples, never as inventory returned to users.

The exact normalized original and expected contexts are compared, including
route, dates, passenger categories and ages, cabin request, currency, and market.
These inputs must be server-held facts. The requested cabin is kept as request
context, while the offer's observed cabin remains unknown.

## Facts and prerequisites

Legacy normalization does not retain IANA zones, an observed cabin, or a
validating carrier. Marketing-carrier fields can contain operating-carrier
fallbacks, so the adapter retains a display label but marks the marketing role
unknown. Missing baggage booleans were normalized to false, making their source
meaning ambiguous; true remains known. Detailed allowance text may have been
synthesized from rounded or clamped piece counts, so it remains explicitly
unknown with `AMBIGUOUS_LEGACY_DEFAULT` rather than becoming an entitlement.
Fare family, flight number, and explicit policy flags are known only when valid.

| Prerequisite | Required evidence |
| --- | --- |
| Display | Valid bounded route and segment structure; unknown facts are shown honestly |
| Observed-price line | Matching trip context, current retained selection, acceptable provider expiry evidence, and exact same-currency Money |
| Absolute schedule comparison | Matching current context and valid chronological offset-bearing segment times |
| Destination-local rules | Matching current context, valid local times, and IANA zones; this adapter always reports the zones as unknown |
| Request fare verification | Matching context and current reference/expiry evidence; unknown descriptive facts do not block this request |

These checks are prerequisites, not permissions or capabilities. An observation
may still be displayed when expired, but its dependent planning actions are
blocked. Unknown price does not prevent requesting verification. Unknown IANA
zone does not prevent comparing explicit-offset instants. No check authorizes
booking or replaces a future bound review and explicit confirmation. The
observation always starts `UNVERIFIED`; the legacy price-only verification result
cannot certify all material fare, cabin, or schedule facts.

## Exact money and executable boundary

Amounts are converted by padding ordinary decimal digits to the explicitly
supported currency exponent, comparing the integer text with the safe-integer
bound, and converting that bounded integer once. There is no floating-point
amount multiplication or rounding. Unsupported currencies, sub-minor precision,
scientific notation, and overflow become unknown price. Original JSON numeric
lexemes were already lost by the legacy parser and cannot be reconstructed.

The exported function is self-contained for serialized compute: it uses inline
Gregorian-date and offset arithmetic, bounded integer conversion, and injected
metadata. It has no runtime imports, network operations, Date, Intl, process,
require, or BigInt dependency. Its authoring schema can reuse the shared domain
primitives, but the executable independently enforces its relevant semantics.
Tests invoke the exact `toString()` representation in a VM with those globals
removed and compare date/money edge cases with the shared primitives.

This establishes local executable compatibility, not connector registration,
hosted runtime evidence, provider correctness, or a deployed capability.
