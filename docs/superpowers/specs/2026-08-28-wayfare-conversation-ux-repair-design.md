# Wayfare Conversation UX Repair Design

## Outcome

Wayfare is a conversation-controlled travel website, not a chatbot embedded in a travel page. A natural-language request changes the main website into a persistent journey workspace: a compact conversation controller on the left and a wide, application-owned MCP journey canvas on the right. Search, comparison, selection, and verification remain visible while the traveler continues refining the trip.

Wayfare turns a route-only request into one focused date decision, then searches with visible assumptions. Conversation state, the trip summary, and linked MCP App views share typed state and never derive product state by parsing assistant prose.

## Experience contract

- A clear route with no dates triggers one structured date request. It does not trigger a questionnaire.
- One adult, Economy, USD, and US point of sale are defaults. The assistant does not ask about them unless the user explicitly requests a change.
- A clear metro area such as New York resolves to its metro IATA code when supported; the assistant does not force an airport choice before search.
- Ambiguous place names still require one location clarification before any tool call.
- “Point-of-sale country” never appears in customer-facing copy.
- A typed trip plan updates the live trip brief before results. Client code does not parse user or assistant text.
- Search, selection, and verification keep their current Nuitee, opaque-selection, TTL, and read-only boundaries.

## Server architecture

Add a model-visible `plan_flight_search` tool. Its input is a resolved origin and destination. Its fulfilment uses one portable `ctx.elicit` step to collect the departure date and optional return date, then returns a bounded typed plan with the standard assumptions.

Keep `search_flights` as the only Nuitee search operation. Make currency and point-of-sale defaults explicit in its schema so the model can call it from the typed plan without asking the user for provider-oriented fields.

Author one host-neutral `agentGuide` with two workflows:

1. Plan and search: use `plan_flight_search` when dates are missing, then call `search_flights` from the accepted plan. If the user already supplied dates, call `search_flights` directly.
2. Verify a fare: preserve the current application selection and verification flow.

The guide owns pacing and assumptions. `server.instructions` retains only global location-resolution and safety boundaries.

## Browser architecture

### Journey workspace

The landing hero remains the primary conversational entry point. After the first prompt, the page transitions into one cohesive journey workspace rather than mounting a framed chat card.

Desktop uses two deliberate regions:

- A compact conversation controller using `minmax(20rem, 24rem)`, containing the short transcript, structured clarification requests, progress, recovery actions, and composer.
- A flexible journey canvas that owns search progress, flight results, comparison, selection, and verification views.

A compact route strip above the workspace presents validated trip state. It replaces the floating trip-brief sidebar and stays visually connected to both regions.

The conversation controller uses the page surface directly. It must not look like a detached support widget: no floating chatbot shell, oversized empty transcript, or duplicated product attribution. The composer remains easy to reach and the transcript is concise enough to scan.

### MCP view slotting

Linked Apps remain the source of truth for MCP UI. The browser must continue mounting typed `data-view` parts through `NoodleAppView`; it must never reconstruct flight results from `data-tool-result` JSON.

Known travel views are assigned to explicit application-owned slots:

- `search_flights` / `flight-results` owns the primary journey canvas.
- `open_travel_starter` remains available to external MCP hosts but does not replace the website's native landing experience.

Verification has no linked App view in the current capability set, so this repair does not invent a verification slot or browser-owned fare UI.

For each slot, render only the newest valid linked view. Earlier invocations remain represented by concise transcript activity but do not leave multiple live sandboxes mounted. View identity stays typed and opaque; generic resource-URI deduplication is not used outside the known slot map.

`TravelMessage` renders conversational text, confirmations, and structured input requests. It does not render slotted journey views inline. The parent conversation/workspace boundary derives the latest valid slotted view from the typed message parts and passes the original `AssistantClient` and view object to `NoodleAppView`.

### Responsive behavior

At mobile widths, the route strip remains compact, the journey canvas becomes the primary content, and the conversation controller follows in document flow with a sticky bottom composer. The transcript may be visually compacted but remains keyboard and screen-reader accessible. No horizontal scrolling is permitted at 320, 390, 768, or 1440 px.

Remove the conversation-level Reset button; the global New trip action remains the single reset control. Use a phase-aware heading and composer placeholder. Add exact 160 ms press feedback to interactive controls, gated hover behavior for fine pointers, and preserve reduced-motion behavior.

## Truth and error handling

- Declined or cancelled date collection produces no search call and no invented state.
- Invalid elicited content remains pending through the Noodle interaction contract.
- The trip brief updates only from validated tool results.
- A failed search remains visible in the journey canvas with one corrective action. It does not create another chat card or erase the current trip context.
- Repeated `data-view` parts from one or more tool attempts yield one active sandbox in the known journey slot.
- If no valid linked view exists, the journey canvas shows a quiet progress or empty state derived from typed projection, never parsed assistant prose.
- Existing safe assistant error mapping, Stop behavior, and terminal activity clearing remain unchanged.
- Development CSP may support React development mode only in development; production CSP remains strict.

## Hosted boundary

The browser currently uses a public embed whose visible behavior predates this source repair. Hosted deployment version 8 was created on 2026-08-27, while the one-question guide, default currency/market assumptions, and metro-code behavior were added locally on 2026-08-28. Local UI completion therefore does not prove hosted assistant behavior.

The current embed-to-deployment binding must be inspected and proved before deployment. Publishing an updated server, rebinding an embed, changing origins, or changing hosted configuration requires separate explicit authorization. The local implementation must report this boundary rather than claiming the assistant is fixed in production.

## Acceptance checks

- Manifest validation proves `plan_flight_search` contains an elicitation step before any connector operation.
- The agent guide projects only existing public capabilities and says to use defaults rather than interrogate.
- A typed plan result immediately renders route, dates, travellers, cabin, currency, and customer-friendly market copy.
- Idle projection renders no contradictory “No trip started” rail.
- The conversation has one New trip/reset concept, a phase-aware title and composer, and no detached chatbot shell.
- A repeated linked `flight-results` view renders exactly one `NoodleAppView` in the primary journey canvas and none inside transcript messages.
- Search progress, failure, results, selection, and verification remain in the canvas while follow-up conversation continues.
- Desktop reads as one travel application with conversation and data regions; mobile keeps the journey view and composer immediately reachable.
- Browser coverage proves 320, 390, 768, and 1440 px fit, keyboard operation, reduced motion, and a real structured input card.
- `noodle validate`, `noodle test`, embedded-assistant check, web tests, browser tests, typecheck, and production build pass.

## Non-goals

- Booking, payment, passenger details, loyalty, hotels, cars, and transactions remain out of scope.
- No hosted deploy, secret change, origin change, or public release is authorized by this repair.
- The browser does not infer airports, dates, market, or passenger data from natural-language transcript text.
