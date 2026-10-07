# Flight search latency

## Goal and measurement

The objective is usable live fares within 20 seconds, not an error or skeleton
within 20 seconds. Measure submit-to-first-visible-fare separately from the full
assistant turn. Include failed/empty/unknown attempts in the timely-fare-rate
denominator and report their outcomes separately.

The existing frontend already renders inline results before final prose. The
gateway already makes one upstream operation per invocation. Do not add another
renderer, request path, polling service or global retry cache to solve an
unmeasured bottleneck.

## Opt-in benchmark

`scripts/benchmark-flight-search.mjs` uses the existing Playwright installation
and real public website UI. It creates 30 deterministic synthetic searches from
an explicit future date, half fresh conversations and half follow-ups. Ten are
short-haul one-way, ten domestic/long-haul one-way and ten return trips. It never
selects, books or pays. One invocation per planned scenario; no retry-until-pass.

Obtain approval of the site, request count and normal model/API usage first.
For example, after approval:

```sh
node scripts/benchmark-flight-search.mjs --url https://gowayfare.io --start-date 2027-01-12 --limit 30 --confirm-live
```

Use the identical start date and workload for baseline/candidate, alternating
control/candidate ordering in an approved experiment where possible. Record the
verified deployment SHA and model configuration separately without secrets.
Thirty observations are a pilot, not proof of an SLO.

Output is NDJSON containing only scenario IDs, observation timestamps, session
mode, session response timing/status when available, visible-fare time, turn
time and outcome. It does not save tokens, prompts, page bodies or provider data.
First fare requires a visible, enabled fare button inside a newly rendered widget,
not just iframe insertion. Turn completion is recorded independently; observation
continues for a delayed widget within the same bounded window. A 120-second observation limit stops the benchmark
instead of overlapping an unfinished turn. Closing the browser is not proof of
upstream cancellation. Do not resume until the outstanding work has settled.

Model/tool/upstream stage timings are deliberately absent: these cannot be
reconstructed accurately from browser paint. Join approved Noodle events/traces
using the observation window; missing evidence must not be reported as zero.
The SDK's delivered/ok outcome is not proof that a fare search succeeded.

## Current implementation

- Flight tool activity uses the existing invocation map and now has a neutral
  skeleton. The skeleton leaves on the matching result; final prose may continue.
- One turn-scoped deadline produces plain slow-search copy after 20 seconds,
  including session/model time. It never initiates a retry or declares an API
  failure. Existing Stop and terminal error recovery remain authoritative.
- Search retry policy explicitly includes retryable failures and preserves
  inputs until the traveler requests another attempt. This is behavioral
  guidance, not a deterministic runtime retry budget.
- Flight presentation instructions are shorter while preserving partial-result,
  verification, selection and text-only-host boundaries.
- Unknown connector exceptions and browser verification transport failures use
  `execution_error`, not `provider_error`. Numeric internal `code` fields are
  not HTTP statuses. Deadline copy does not identify an unproven failing layer.
  Raw exception messages and bodies never enter the public result.
  Existing HTTP error categories remain compatible, but their messages do not
  attribute an upstream status to a particular provider without provenance.

Recovery copy follows the truthful-state and voice requirements in
[`docs/brand/wayfare-brand-guidelines.md`](../brand/wayfare-brand-guidelines.md).
Error classification is not root-cause telemetry: the installed compute host
exposes `callOperation` but no logger, clock or invocation context. The assistant
authoring API also exposes no per-turn duplicate-search guard. Those platform
capabilities remain separate work; do not simulate them with raw-error output,
an extra connector call, or a global cache.

## Evidence-gated next steps

No provider timeout, model variable, state-persistence order or upstream filter
is changed by these UX/policy updates. The current 75-second HTTP/80-second
compute ceilings are safety bounds, not latency targets.

The candidate `filters.showCheapestOfferOnly: true` is documented in the
[official Flights OpenAPI](https://docs.liteapi.travel/openapi/openapiflights.json)
(checked 2026-10-07), but must improve measured latency without losing usable
journeys, fallback offers, baggage, return legs or selection correctness before
adoption. Never add unrequested stops/airline/date restrictions to make a
benchmark faster. Smaller response bytes alone do not establish lower latency.

Similarly, only benchmark a faster model if model-to-tool timing is material.
Preserve existing capabilities and safety; no new router is needed. If upstream
duration dominates, resolve that provider/connector boundary rather than adding
frontend infrastructure. Production changes require exact-target release
approval and passing review/CI.
