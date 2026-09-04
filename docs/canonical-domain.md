# Canonical domain foundations

`src/domain/` contains the application-owned contracts used to build connected
trip capabilities. These modules are preparatory: importing them does not add
tools to an existing server profile or change its flight response format.

## Development checks

Run `pnpm typecheck:domain` to strictly type-check `src/domain/` and its
`test/domain-*.test.ts` tests without emitting files. `pnpm ci:core` runs this
check before the behavior tests, using the root package's pinned compiler.
It does not require a temporary configuration or a compiler from another
workspace. The focused configuration inherits the root compiler options;
it is not a claim that unrelated legacy server modules pass a full TypeScript
check. `pnpm test` continues to exercise those modules' existing contracts.

## Money

`Money` is `{ amountMinor, currency }`. Amounts are nonnegative safe integers.
The explicit currency list and minor-unit exponents live together in
`primitives.ts`; adding a currency requires its exponent and regression tests.
This list describes application support, not provider entitlement or available
inventory.

`moneyFromDecimal` converts ordinary unsigned decimal strings exactly. It
rejects excess decimal places, unsupported currencies, and overflow rather
than guessing a rounding rule. `addMoney` and `subtractMoney` require matching
currencies and check overflow/underflow. No helper performs foreign exchange.

## Validation boundaries

Objects reject unknown fields. Native schema constraints survive JSON Schema
export, while semantic checks such as date-range ordering and agreement between
a timestamp offset and an IANA zone require executable validation as well.
Tests cover both in-process parsing and the exported contract.

Calendar dates are real Gregorian dates. Instants require an explicit known
offset and support up to millisecond precision; leap seconds are not supported.
Zoned date-times retain the original local representation and validate it
against the execution environment's IANA timezone data. Neither an airport
label nor a numeric UTC offset establishes an IANA zone.

The Node validation and money helpers use imports, `Date`, `Intl`, and/or
`BigInt`. Do not reference them from a serialized Noodle compute function by
closure: compute requires a self-contained implementation and separate runtime
tests. A passing Zod test does not prove sandbox behavior.

## Provenance and references

Live and fictional provenance are distinct schema variants. `NUITEE_LIVE`
requires `isFictional: false`; `WAYFARE_DEMO` requires `isFictional: true`.
Both include a bounded disclosure and observation instant. Mixed results must
preserve the source of each component when those capabilities are integrated.

The opaque-reference schema checks a prefixed 128-bit hexadecimal shape only.
It does not issue identifiers, prove unpredictability, conceal an upstream ID,
establish ownership, or validate expiry. Server-side issuance and current
caller-scoped lookup must enforce those properties separately.

## Errors

`DomainError` accepts a controlled application error code. Return its
`toPublic()` result, not the exception, stack, or a provider cause. Public
variants bind the code to fixed safe text and retry guidance. Expected search
emptiness remains a successful result when search capabilities are integrated;
sharing an outcome vocabulary does not make empty inventory an exception.
