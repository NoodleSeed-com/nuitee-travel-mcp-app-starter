# Wayfare Agent-Led Starting Experience Design

## Status

Product direction approved by the user on 2026-09-02. Written specification awaiting user review.

This design is a reuse-first refinement of the existing Wayfare experience. It supersedes earlier homepage entry-point decisions where they expose flights, stays, packages, insurance, private jets, cars, destinations, or editorial calls to action as separate ways to begin. It preserves the approved single inline conversation architecture in `2026-08-29-wayfare-inline-conversation-design.md`, the guest-first session model, official linked MCP App rendering, typed trip projection, and provider-owned transaction boundary.

## Goal

Make starting a trip feel effortless: the traveler describes what they want once, and Wayfare decides which available capabilities can help. The traveler must not need to understand or select the product's internal capability taxonomy before speaking to the agent.

The successful experience is:

```text
Describe the trip
        ↓
Wayfare interprets the intent and existing context
        ↓
Wayfare asks one necessary question or invokes the next useful tool
        ↓
Grounded results appear inline
        ↓
The existing trip brief reflects confirmed context and selections
        ↓
Wayfare offers the next relevant step or an explicit provider handoff
```

## Product decisions

### One starting action

The landing page has one primary action within its main content: a natural-language composer. Capability tabs, prompt chips, destination actions, category cards, and editorial calls to action do not initiate competing workflows.

The page may retain selected travel imagery and editorial material as passive reassurance and inspiration. That content must support the single composer rather than behave as another navigation or prompt system.

### Agent-led routing

Wayfare infers whether a request needs flights, stays, rewards, travel protection, ground travel, or a combination. Capability choice is an internal orchestration decision, not a prerequisite imposed on the traveler.

The agent routes only to capabilities actually registered and available in the active server profile. The homepage does not promise unavailable tools. Live, illustrative, unavailable, and future capabilities retain their existing source and disclosure boundaries.

### Comparison and selection boundary

Wayfare owns discovery, clarification, grounded comparison, selection, verification where supported, and a coherent review of the trip. Booking, payment, identity verification, passenger documents, provider accounts, and final confirmation remain provider-owned.

The interface must distinguish `selected in Wayfare`, `verified`, `provider checkout opened`, and `booking confirmed`. Wayfare must not claim the last state without authoritative provider evidence.

### Evolution, not a rebuild

The current application already provides the core system. This design changes the entry experience and sharpens existing orchestration. It does not authorize a new chat framework, new planner application, new state store, replacement widget system, account system, or booking engine.

## Current foundation to retain

The implementation must preserve and extend these existing owners:

- `TravelAssistantPage` owns the zero-state-to-conversation transition and initial prompt handoff.
- `TravelConversation` and `useNoodleAssistant` own the guest session, messages, activity, lifecycle, transcript, and follow-up composer.
- `TravelMessage`, `TravelViewRegistry`, and `NoodleAppView` render approved structured interactions inline in chronological order.
- `projectTrip` in `trip-projection.ts` derives typed trip state from structured tool outputs rather than parsing prose.
- `TripBrief` renders the compact trip summary after a supported selection exists.
- `travelCompanionDemoAgentGuide` already routes across the expanded demo capabilities and preserves live-versus-illustrative boundaries.
- Existing flight, stay, rewards, protection, review, selection, and verification tools remain atomic.
- Existing loading, Stop, retry, reset, safe fallback, accessibility, and responsive behavior remain part of the contract.

Removing or replacing one of these systems requires a separately approved design. The default implementation is the smallest change that makes the entry agent-led.

## Starting experience

### Hero

The hero communicates one product promise rather than one capability at a time.

- The heading invites an unconstrained trip description, for example: `Tell us the trip you have in mind.`
- Supporting copy explains that Wayfare can coordinate relevant parts of the journey without listing them as modes to select.
- One large composer accepts short, vague, focused, or multi-component requests.
- A concise, non-interactive example may show the breadth of acceptable input. It must not become a carousel of choices or a collection of prompt buttons.
- The current location-derived origin and currency may continue to inform placeholder or supporting copy under the approved local-defaults contract. They remain defaults, never authoritative facts.
- The first viewport on a 320px-wide mobile screen contains the product promise and usable composer without horizontal scrolling.

Examples of valid first messages include:

- `A long weekend somewhere warm in October.`
- `Find a hotel near the Louvre.`
- `Plan a family trip from Toronto to Rome during spring break.`
- `I already have flights to Lisbon. Help with the rest.`

These examples demonstrate acceptable language; the page does not require the user to select one.

### Supporting content

`DestinationInspiration` or its existing assets may be retained in a passive form below the primary starting area. Supporting content must:

- avoid an `onStart` action or hidden precomposed prompt;
- avoid appearing to be a required first step;
- avoid advertising a capability that the active product profile cannot serve;
- preserve source, disclosure, and accessibility requirements; and
- remain visually subordinate to the composer.

`TravelCapabilityStrip` is removed from the landing composition. The current mode-based hero behavior and mode-specific suggestion controls are removed from the active starting path. `TravelEditorialFeature` may be removed from the composition or converted to passive content if its visual value justifies retention; it must not contain a second start action.

### Transition into conversation

Submitting the landing composer continues to use the existing `TravelAssistantPage` transition and initial-send-once behavior. The page does not navigate to a separate planner, open a drawer, or mount a parallel workspace.

The submitted text appears in the same chronological conversation the traveler will continue using. Focus, loading state, error recovery, Stop, reset, and transcript-following behavior keep their current ownership.

## Agent behavior

### Reuse the current product guide

The expanded product guide remains the orchestration owner. It is revised only where necessary to state the cross-capability behavior consistently:

1. Interpret the travel goal and facts already provided.
2. Reuse structured trip context and explicit user statements.
3. Choose the available capability that produces the next useful progress.
4. Ask at most one focused question when a required value cannot be inferred safely.
5. Search immediately when the request contains enough information for a read-only operation.
6. Present grounded results with the correct live or illustrative disclosure.
7. Offer one contextually relevant next step without forcing a complete package flow.

A focused request remains focused. `Find a hotel near the Louvre` must not trigger an unsolicited full-trip questionnaire. A broad request may span multiple capabilities, but the agent should not fan out into expensive or noisy searches until essential dates, places, and party constraints are known.

### Contextual progression

The agent introduces an adjacent capability only when current context makes it helpful. Examples include:

- offer a stay after destination and dates are established;
- offer ground travel when arrival details make it relevant;
- offer travel protection only when enough trip context exists to compare the available concepts honestly; and
- offer trip review after supported selections exist.

The agent explains the relevance in plain language. The traveler can decline, skip, replace, or revise any component conversationally.

### No hidden capability promise

The desired end state can support all travel domains, but the running product must remain truthful during rollout. If the active profile lacks a requested capability, the agent says so and continues with supported parts of the trip. It does not substitute synthetic output for live inventory or present illustrative data as bookable.

## Conversation and trip summary

The approved inline conversation remains the primary experience. Structured results stay at the exact point in the transcript where their tools produced them. Existing cards continue to handle interactions that are clearer visually than in prose.

`TripBrief` remains a compact summary inside the conversation column, not a persistent dashboard or separate journey canvas. It continues to appear progressively from typed projection data. The implementation may extend its fields or status labels only when an existing or newly available structured tool result supplies authoritative data needed by the user.

The summary must not render empty placeholders for every possible capability. It shows only known trip facts and supported selections. Natural-language revisions update the conversation first; structured tool results then update the projection and summary through the existing data path.

## Data flow

The implementation preserves the existing flow:

```text
Landing composer
    ↓
TravelAssistantPage.startConversation(prompt)
    ↓
TravelConversation initial send
    ↓
Product agent guide chooses an existing atomic tool
    ↓
Structured tool result and optional approved linked MCP App
    ↓
TravelMessage renders the chronological response
    ↓
projectTrip derives current typed context
    ↓
TripBrief renders supported facts and selections
```

There is no second client-side intent router and no prose parser for trip state. The agent guide chooses tools; the tool schemas validate inputs; the projection derives UI state from structured outputs.

## Grounding and handoff

Every domain keeps its actual evidence boundary:

- live results identify their provider and relevant freshness or verification state;
- illustrative results remain visibly illustrative near the result;
- unsupported or unavailable requests receive a bounded explanation rather than invented options; and
- mixed-domain review does not combine incompatible live and synthetic prices into a factual package total.

Before a supported provider handoff, Wayfare re-verifies the selection when a verification tool exists. The action is labeled `Continue with [provider]` or equivalent provider-specific language, not `Book with Wayfare`.

The current application does not need a new unified checkout. If several selections require separate provider checkouts, Wayfare explains that boundary and preserves the trip summary between handoffs where the existing session allows it.

## Error handling

The redesign retains the current safe failure behavior and adds no generic retry loop.

- Preserve the original traveler message and known trip state after an error.
- Distinguish missing required information, no results, unsupported capability, provider failure, and stale or changed selection.
- Ask for one relevant adjustment after a non-retryable failure.
- Prevent duplicate initial sends and duplicate actions during loading.
- Preserve successful components when another domain fails.
- Never expose raw connector errors, credentials, provider identifiers intended only for tools, or synthetic fixture internals.

## Accessibility and responsive behavior

- The landing page has one `h1`, one clearly labelled primary composer, and one obvious submission action.
- Passive inspiration is not placed in the keyboard order as a collection of false start controls.
- Existing header controls, legal links, and session controls remain available without competing with the main start action.
- All interactive targets remain at least 44 by 44 CSS pixels.
- Visible focus, keyboard submission, input labelling, live status, alert behavior, and reduced-motion behavior remain intact.
- The starting experience and conversation fit 320px, 390px, 768px, and 1440px widths and 200% text zoom without page-level horizontal overflow or clipped controls.
- The conversation keeps chronological DOM and keyboard order across breakpoints.

## File ownership and intended change surface

The detailed implementation plan must confirm exact edits, but the expected surface is deliberately narrow:

- `apps/web/src/components/travel-zero-state.tsx`: compose the single-entry landing experience and passive supporting content.
- `apps/web/src/components/travel-hero.tsx`: replace mode selection and prompt actions with the shared agent-led promise and one composer.
- `apps/web/src/lib/travel-hero-content.ts`: retire or narrow mode-specific active-start content while preserving reusable copy or asset metadata where useful.
- `apps/web/src/components/travel-capability-strip.tsx`: remove from active composition; delete only if no remaining consumer or test requires it.
- `apps/web/src/components/destination-inspiration.tsx`: make passive if retained.
- `apps/web/src/components/travel-editorial-feature.tsx`: remove from active composition or make passive if retained.
- `apps/web/src/components/travel-assistant-page.tsx`: preserve its existing transition; change only props or composition required by the simplified zero state.
- `src/travel-server.ts`: minimally clarify product-guide routing and capability availability without changing unrelated tool contracts.
- `apps/web/src/lib/trip-projection.ts` and `apps/web/src/components/trip-brief.tsx`: preserve by default; extend only for a demonstrated gap in structured multi-capability context.
- `apps/web/app/globals.css`: remove obsolete mode/CTA layout and style the single-entry composition using the existing visual system.
- Existing matching unit and browser tests: replace obsolete multi-entry assertions with single-entry and routing-boundary coverage.
- `SPEC.md` and `docs/WAYFARE_TRAVEL_COMPANION.md`: reconcile the flights-only baseline, expanded profile, and live-versus-illustrative capability truth. If generated agent guidance becomes stale, refresh it through the supported Noodle agent setup workflow rather than editing generated files by hand.

The plan must not perform broad component rewrites merely to match a preferred abstraction.

## Testing and verification

### Unit and component tests

- The landing main content exposes one composer submission path.
- Capability tabs, prompt chips, destination prompt actions, and editorial start actions are absent.
- A short, broad, focused, and multi-component prompt each reaches the existing `onStart` callback unchanged.
- Launch errors remain associated with the composer and do not discard the draft.
- Local origin and currency defaults remain bounded hints and never overwrite explicit input.
- `TripBrief` remains absent before supported structured state and renders only validated projection fields.
- Existing projection, inline MCP App admission, message ordering, Stop, retry, reset, and initial-send-once tests remain green.
- Product-guide tests cover focused requests, broad requests, capability unavailability, source boundaries, and one-question-at-a-time behavior.

### Browser tests

- A traveler can start with one natural-language composer at desktop and mobile widths.
- No capability selection is required before submission.
- The submitted prompt transitions into the existing conversation exactly once.
- An approved MCP App remains inline in chronological order.
- Passive inspiration cannot launch a hidden prompt.
- Keyboard and screen-reader users encounter a clear heading, composer, submission control, transcript, and follow-up composer in order.
- The page fits the required widths and 200% text zoom without horizontal overflow.
- Reduced motion and minimum target-size checks remain green.

### Repository and Noodle gates

- Web typecheck, unit tests, browser tests, and production build.
- Root repository tests and readiness checks required by the current package scripts.
- `noodle validate --json`, `noodle test --json`, and `noodle check --json` for the configured app target.
- Existing embedded-assistant validation remains green if the changed product guide or shared server code reaches that target.

Local or CI success does not prove hosted deployment. Deploying, changing hosted configuration, adding secrets, rebinding the assistant, or releasing publicly is outside this design unless separately authorized.

## Success criteria

The implementation succeeds when:

- a visitor can express a travel goal without selecting a capability;
- the same existing conversation receives that intent exactly once;
- the agent asks one necessary question or uses an available tool without reopening facts already supplied;
- grounded and illustrative sources remain visibly distinct;
- existing inline widgets and trip projection continue to work;
- the traveler can revise decisions naturally without rebuilding context; and
- provider checkout remains an explicit handoff rather than an implied Wayfare transaction.

Product analytics, if already available and authorized, should distinguish intent submission, first grounded result, routing correction, comparison, selection, verification, and provider handoff. Adding a new analytics system is not required by this design.

## Non-goals

- Rebuilding `TravelConversation`, `useNoodleAssistant`, `TravelMessage`, or the official linked MCP App host.
- Introducing a persistent side canvas, dashboard, form-led itinerary builder, or capability menu.
- Creating a universal `plan_everything` tool or a second client-side intent router.
- Implementing missing flight, hotel, car, private-aviation, insurance, rewards, or experience providers as part of the homepage change.
- Treating illustrative fixtures as live availability.
- Adding login, durable trip storage, cross-device continuity, payment, booking, ticketing, cancellation, or passenger-document collection.
- Creating a unified multi-provider checkout.
- Deploying, publishing, changing hosted configuration, or claiming production impact.
