# Wayfare MCP tool and widget audit

Date: 2026-09-05. Baseline: PR #59, commit `82963657b279d3deb738a546585247c11c41eb86`, plus the requested control-motion fix.

## Verdict

**Partially aligned; not ready to claim ChatGPT submission compliance.** The expanded server has 11 tools (nine model-visible, two app-only) and seven widget resources backed by six React entry components. All are covered below. The starter profile is the five flight/home tools, not an additional widget set. Hotel map, comparison, match details, and the flight search editor are included as subviews.

This is a source, descriptor, local runtime, and browser-test audit—not an OpenAI approval or a credentialed production test. Current OpenAI Apps SDK documentation redirects to the Plugins documentation; the linked UI and MCP review rules are the applicable references inspected for this audit.

## Changes made in this request

Removed press scaling from shared MCP and product controls, the trip-brief toggle, and selected fallback-map pins. Critically, the old global press transform replaced the translate used to anchor carousel arrows and map pins; even the old reduced-motion reset removed that positioning. Controls now retain their geometry and use color/border/focus feedback. Deliberate carousel navigation, panel transitions, chevron rotation, and scenery motion are unchanged.

The rule is recorded in [Wayfare brand guidelines, section 7](../brand/wayfare-brand-guidelines.md). No audit findings below were silently implemented, no hosted configuration was changed, and no deployment or merge was performed.

## Tool-by-tool coverage

Every widget row also inherits the shared domain and theme/font findings below. “Sound” here describes inspected behavior, not approval.

| Tool | Widget / subviews | Assessment and remaining work |
| --- | --- | --- |
| `open_travel_starter` | `travel-home` | Bounded capability summary and textual fallback are sound. **Live expanded output is rejected by its widget validator** (F2). The menu of future capabilities is less task-focused than a compact contextual starting card. |
| `plan_flight_search` | No widget | Explicit inputs and date clarification are useful. Noodle flags form-elicitation compatibility with ChatGPT; prove a conversational retry path instead of assuming the form works (F7). |
| `search_flights` | `flight-results`, fare details, verification states, search editor | Clear select/verify distinction, bounded options, pending/error states, persisted fare state, and model context are strengths. Card metadata and inline detail/edit flows need simplification (F5); live search writes selection state despite read-only annotation (F4). |
| `verify_flight_offer` | No independent resource; result consumed by flight UI | Server-owned selection lookup, price-change handling, and explicit no-booking boundary are sound. Requires credentialed success/stale/price-change tests in the actual host before release. |
| `select_flight_offer` | App-only flight helper | Correctly hidden from the model. Live implementation writes state and reports success without checking membership in the current search (F4, F8). App-only visibility is not authorization. |
| `search_hotels` | `hotel-results`, `hotel-map-board`, `hotel-compare`, match/details | Live/illustrative disclosure, selection errors, bounded data, and location-less fallback are useful. Inline list/map navigation, comparison, and action density need work (F5). Comparison/map state is not persisted (F6). Mapbox real-host behavior remains unproven (F9). Search writes selection state (F4). |
| `select_hotel` | App-only hotel helper | Validates the selection through the gateway and keeps reservation separate from selection. Its state write needs annotation review (F4). |
| `open_loyalty` | `loyalty-overview` | Clearly disclosed fixed synthetic profile with no account/payment action. It is a concept preview, not production rewards functionality (F3). |
| `compare_reward_flights` | `reward-flight-results` | Bounded carousel and honest points/tax disclosure. Inventory is illustrative (F3); dense per-card metadata deserves a compact inline summary (F5). |
| `compare_travel_insurance` | `insurance-results` | Explicitly distinguishes concepts from policies/quotes. Three full plans plus coverage, exclusions, assumptions, and disclosures are tall for inline/mobile; move detail to an expanded view (F5). No live insurer inventory (F3). |
| `review_trip` | Separate resource using `loyalty-overview` | Keeps flight/stay prices separate and does not imply booking. **A live hotel selection is rejected by the widget**; rendered hotel copy also assumes simulation (F2). Rewards remain illustrative (F3). |

## Findings

### F1 — Submission blocker: no dedicated widget domain

`src/starter-config.ts:26` sets `widgets.domain` to `null`; `src/travel-server.ts:275` consequently omits the domain for every resource. Local omission is intentional in the source, but `noodle check src/demo-preview-server.ts --target chatgpt --json` exits 1 with `chatgpt_widget_domain`, listing all seven resources. Generic validation passing does not override that result. Configure the actual deployment-owned HTTPS widget origin before submission; do not insert a placeholder or assume the product origin is interchangeable. Hosted changes require separate authorization.

### F2 — High: valid live results cannot render in two widgets

- `src/views/travel-home.tsx:25`: `isHome` requires `Stays: illustrative` whenever any domain is illustrative. The live home in `src/travel-server.ts:51` has `Stays: available` and `Loyalty: illustrative`, so the wrapper renders its incomplete-result error.
- `src/views/loyalty-overview.tsx:123`: `isStaySelection` only accepts `illustrative`. The server schema at `src/demo-schemas.ts:325` also permits `live_nuitee`; the review gateway preserves this live source. The UI therefore rejects a legitimate live stay. Its “Simulated hotel selection” text also needs source-aware rendering.

Two temporary diagnostic tests reproduced server-schema acceptance alongside widget-validator rejection; both passed, and were removed rather than encoding the bugs as desired regression behavior. These defects conflict with the reliability expectations in [OpenAI’s review requirements](https://developers.openai.com/plugins/deploy/app-review). Add positive live-output regression tests with the eventual fixes.

### F3 — Submission blocker for the demo capabilities

`src/demo-capabilities.ts` intentionally serves fixture-backed loyalty, reward-flight, and insurance comparisons, even in the expanded live profile. Preview hotels are also illustrative; live hotels are a separate implementation. Honest disclosures are good but do not turn fixed data into operational account/inventory functionality. OpenAI does not accept trial/demo-only products for publication under its [plugin guidelines](https://developers.openai.com/plugins/app-guidelines). Connect real supported capabilities or exclude these tools from the submission profile; keep the local demonstration clearly separate.

### F4 — Annotation review required for state-writing tools

All tools use `annotations.readOnly()`. However, live `search_flights` and `select_flight_offer` write `flight_selections` (`src/travel-server.ts:427,526`); both hotel searches and `select_hotel` write `demo_hotel_selections` (`src/demo-capabilities.ts:44,87,260`). These are temporary caller-scoped selections, not bookings or public mutations.

The [review requirements](https://developers.openai.com/plugins/deploy/app-review) describe state updates as non-read-only, while the [general guidelines](https://developers.openai.com/plugins/app-guidelines) distinguish changes outside the conversation. Document whether this storage qualifies solely as conversation bookkeeping; otherwise mark the actual writing variants non-read-only with precise descriptions. Do not classify a read-only provider query as open-world merely because it makes an HTTP request. Destructive operations were not found in this tool set.

### F5 — UI alignment gap: typography, theme, and inline complexity

`src/views/travel.css:1` forces Host Grotesk and a light-only palette; view implementations do not adapt their styling to the passed dark theme. This follows the approved Wayfare contract but conflicts with OpenAI host styling guidance. A ChatGPT-specific brand adaptation needs an explicit product decision, not an unapproved global rebrand.

Hotel cards expose Compare, Match, details, and selection alongside a list/map switch. Comparison changes local screen immediately and can render inline when fullscreen is unsupported; map switching never requests fullscreen. Flight cards have detail/edit subviews; reward cards contain substantial metadata; insurance renders complete plan detail inline. These are concrete candidates for a compact result card plus a deliberately expanded detail/map experience. [OpenAI’s UI guidelines](https://developers.openai.com/plugins/concepts/ui-guidelines) favor host typography/theme, single-purpose inline content, restrained actions and metadata, and fullscreen for richer maps or exploration. Its optional UI library is not a requirement to replace our React components or Heroicons.

### F6 — Medium: hotel exploration state is not restored

`src/views/hotel-results.tsx:394` stores screen, board view, comparison IDs, and selected map ID in component-local `useState`. The wrapper persists only the final selected hotel through `useViewState`. A remount loses the shortlist/map context, and the assistant does not receive the comparison shortlist as model context. Persist meaningful user choices through the host bridge, distinguishing private presentation state from useful model context. [OpenAI’s UI reference](https://developers.openai.com/plugins/reference) provides widget-state persistence for interactions across renders.

### F7 — Host compatibility not proven: date elicitation

The ChatGPT-target check warns about `plan_flight_search` form elicitation (`chatgpt_elicitation_compatibility`). This is a warning, not the check’s hard failure. Exercise missing-date, rejection, and retry flows in ChatGPT; preserve a plain conversational fallback. Noodle Devtools alone cannot prove this host behavior.

### F8 — Medium: flight helper accepts an unknown selection

`src/travel-server.ts:519` validates ID shape, reads caller state, then writes the supplied `activeSelectionId` without confirming it belongs to the current unexpired records. It returns “selected” even for a well-formed unknown ID. Later verification can reject it, but the intermediate success is misleading. Resolve membership/expiry before writing and return a bounded stale-selection result. This is a source-confirmed logic gap, not a demonstrated cross-user access issue.

### F9 — Mapbox lifecycle risk and remaining host checks

`src/views/hotel-map-board.tsx:194` includes `selectedId` in the map creation effect; changing a selection therefore tears down and recreates the map, rebuilding markers and fitting bounds. A separate selection effect also calls `flyTo`. This can reset the viewport on selection and should be separated from map initialization. The CSS press fix does not change camera/navigation behavior.

Mapbox origins are explicit and there are no wildcard frame permissions, which is a useful baseline. Real tiles, worker/CSP behavior, token restrictions, and map interactions were not exercised in ChatGPT during this audit. The credential-free fallback is not evidence that real Mapbox works in its sandbox. Review each declared connect/resource origin against actual requests and test the real host.

## Verification and limits

- MCP unit tests: **330 passed**; MCP browser tests: **31 passed**.
- Product TypeScript check: **passed**; product unit tests: **256 passed**.
- New control-stability browser suite: **8 passed**, covering actual product controls and MCP CSS on anchored control fixtures, desktop/mobile, normal/reduced motion.
- Expanded preview Noodle validate, protocol smoke, and generic widget check: **passed**; smoke enumerated all 11 tools.
- ChatGPT-target check: **failed**, one error category affecting all seven widget domains; elicitation warning remains.
- Runtime schema diagnostics: **two live-output mismatches reproduced**. No provider booking, payment, redemption, or insurance purchase was attempted.

This is not a full WCAG certification, penetration test, credentialed provider integration run, or actual ChatGPT sandbox sign-off. Focus styling and 44px control minima exist, but complete screen-reader, zoom, contrast, and keyboard-map testing remain release work. Local test success and presence of descriptors do not establish live availability or OpenAI approval.

Recommended order: fix the two live rendering defects and stale-flight selection check; resolve annotation semantics and the ChatGPT-specific brand decision; simplify inline widgets and persist hotel context; configure a real widget domain and run credentialed ChatGPT tests on a non-demo submission profile.
