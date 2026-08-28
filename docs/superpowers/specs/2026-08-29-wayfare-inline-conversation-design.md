# Wayfare Inline Conversation Design

## Status

Approved direction from the user on 2026-08-29. This design supersedes the separate journey-canvas architecture in `2026-08-28-wayfare-conversation-ux-repair-design.md` wherever the two conflict.

## Goal

Turn Wayfare into one centered, ChatGPT-style travel conversation. The conversation is the website experience. Linked MCP Apps appear inline at the exact point in the timeline where a traveler needs to inspect or interact with structured flight data.

## Product decision

Wayfare will not use a persistent right-side Flight workspace, an empty result canvas, a floating chat widget, or a chatbot panel beside a second application surface.

The chosen model is a customer-owned headless assistant renderer with one chronological transcript:

```text
┌──────────────────────────────────────────────────────────────┐
│ Wayfare                                      New trip   Menu │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    Plan your flight                          │
│         ISB → NYC · 18 Sep · 1 adult · Economy              │
│                                                              │
│  Traveler message                                            │
│                                                              │
│  Wayfare reply                                               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Official linked MCP App: current flight results        │  │
│  │ Interactive controls remain inside NoodleAppView       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Follow-up reply / confirmation / input request              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Ask Wayfare…                                      Send │  │
│  └────────────────────────────────────────────────────────┘  │
│  Built on Noodle Seed · Powered by Nuitee                    │
└──────────────────────────────────────────────────────────────┘
```

## Architecture

### One conversation owner

`TravelConversation` remains the sole owner of the assistant hook, session client, messages, activity, Stop, retry, terminal state, transcript following, and composer. It renders one centered conversation column below the existing Wayfare site header.

The landing page remains the cinematic conversational entry. Submitting the hero prompt swaps the landing content for the conversation without opening a drawer or adding a second workspace.

### Inline message parts

`TravelMessage` renders message parts in their original order:

- `text` renders as assistant or traveler prose;
- `data-view` renders through `TravelViewRegistry`, which delegates approved exact identities to the official `NoodleAppView` React host;
- `data-confirmation` renders the bounded confirmation review and both decisions inline;
- `data-input-request` renders the allowlisted native form inline;
- unsupported or unapproved content fails closed with the existing safe status copy.

Every distinct `data-view` identity remains in chronological history. The website does not select only the newest view, move a view to a page-owned side slot, or generically deduplicate different view IDs. This follows the assistant SDK contract: linked Apps are inline by default, and different call IDs are distinct invocations.

### Exact view boundary

Only exact application-owned tool/resource pairs may mount:

- `search_flights` + `ui://nuitee_travel_mcp_app_starter/search_flights_widget`
- `open_travel_starter` + `ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget`

A mismatched tool or resource URI renders `This travel view is unavailable.` It never fetches a `ui://` URI, injects `view.html`, assigns `srcdoc`, imports a second Apps bridge, or rebuilds linked UI from tool-result JSON.

### Remove the side-canvas subsystem

The following side-canvas concepts are removed from the active website architecture:

- `latestJourneyView(messages)` and page-owned newest-view replacement;
- `TravelJourneyCanvas` and its empty/progress panel;
- responsive desktop/mobile reordering between a conversation and a canvas;
- `useSyncExternalStore`/`matchMedia` logic used only to move those two regions;
- `Travel workspace` and `Flight workspace` landmarks.

The finite exact view allowlist moves to `travel-view-policy.ts`, where its vocabulary is inline-view admission rather than journey-slot placement.

## Conversation layout

### Desktop

The main conversation column is centered and capped at `64rem`. Text content is capped near `48rem` for reading comfort, while linked Apps, confirmations, and input forms may use the full conversation width. User messages align right in restrained neutral bubbles. Assistant messages align left without oversized decorative containers.

There is no unused result area. Before a linked App arrives, the page contains only the conversation, its activity status, and the composer.

### Mobile

The same DOM order and visual order are used at every width. The conversation fits 320px and 390px without horizontal scrolling. Interactive Apps use the available width, never a desktop minimum width. The composer remains visible at the bottom of the conversation viewport, and the transcript remains the internal scroll owner for long sessions.

No component is duplicated or remounted to change responsive order.

### Trip context

`TripBrief` becomes a compact, non-editable summary inside the centered conversation column. It is absent in `idle`, uses only validated typed projection fields, and never parses assistant or traveler prose. It must not resemble a separate panel or sidebar.

### Visual system

- Inter remains the only interface typeface.
- The site remains light and neutral.
- The cinematic Wayfare landing image remains the entry experience.
- Conversation surfaces use white, neutral borders, subtle shadows only where depth clarifies interaction, and rounded interactive cards.
- The linked App is the visual focal point when present; the surrounding transcript stays quiet.
- Repeated chat interactions do not animate. Button press feedback may use a short transform of 160ms or less. All movement is removed under `prefers-reduced-motion: reduce`.

## Data flow

1. The traveler submits the landing prompt.
2. `TravelAssistantPage` mounts `TravelConversation` with the existing public embed runtime.
3. `useNoodleAssistant` owns the in-memory guest session and typed `messages`.
4. `TravelConversation` projects typed trip state from tool results and activity only.
5. `TravelMessage` renders every part in chronological order.
6. An approved `data-view` mounts exactly once at that message position through `NoodleAppView`.
7. App interactions continue through the existing assistant client; the website does not invent a second transport or user message.
8. Follow-up sends, Stop, retry, terminal cleanup, and reset keep their current lifecycle behavior.

## Assistant behavior

The existing planning contract remains:

- ask one necessary clarification at a time;
- default omitted values to one adult, Economy, USD, and the US pricing market;
- resolve typed trip details before search;
- use structured input requests when a compact native form is better than another prose turn;
- never request credentials, payment, passport, or unsupported booking details;
- support Search → Select → Verify only.

This UI correction does not authorize booking, payment, passenger collection, hosted deployment, secret changes, embed rebinding, access changes, or public release.

## Errors and empty states

- There is no empty Flight workspace.
- Before results, the assistant text and one stable polite activity region explain progress.
- A linked App error remains inside that inline App; native prose does not expose raw error codes.
- Transport/session errors use the existing safe error presentation and retry only when allowed.
- Unknown view identities fail closed inline.
- Stop preserves the current draft and aborts only the active request.

## Accessibility

- One `main` conversation experience with one named `Travel conversation` region.
- Transcript remains a labeled `role="log"` with chronological DOM order.
- Linked Apps appear in the same keyboard order as their message position.
- All controls remain at least 44×44px.
- Visible keyboard focus is never removed.
- Status and alert regions remain stable and non-duplicated.
- At 200% text zoom and widths of 320, 390, 768, and 1440px, there is no horizontal clipping or mid-word breakage.
- Reduced motion removes transitions and animations from every rendered conversation and linked-App host element.

## Files and ownership

- `apps/web/src/components/travel-conversation.tsx`: one centered conversation, typed projection, lifecycle, composer.
- `apps/web/src/components/travel-message.tsx`: chronological typed-part renderer including inline Apps.
- `apps/web/src/components/travel-view-registry.tsx`: exact inline App admission and official host delegation.
- `apps/web/src/components/trip-brief.tsx`: compact typed trip summary in the conversation column.
- `apps/web/app/globals.css`: centered responsive conversation layout.
- `apps/web/src/lib/travel-view-policy.ts`: exact inline-view allowlist with no newest-view selector.
- `apps/web/src/lib/journey-view.ts`: removed.
- `apps/web/src/components/travel-journey-canvas.tsx`: removed.
- Matching unit, browser, and documentation files change with those owners.

## Verification

### Unit and component proof

- Exact approved `data-view` parts render inline at their original message position.
- Two distinct approved views render twice in chronological order; neither is generically deduplicated.
- A mismatched view fails closed inline.
- No Flight workspace or page-owned canvas exists.
- Typed trip summary remains absent in idle and shows validated projection fields when available.
- Stop, retry, scroll-following, terminal cleanup, Strict Mode initial-send-once, and guest reset tests remain green.

### Browser proof

A deterministic SDK/SSE fixture must prove:

- one centered Travel conversation is the active post-submit experience;
- an approved MCP App appears inline inside the transcript;
- two distinct view identities remain in chronological history;
- an unrelated identity is not absorbed or deduplicated;
- no Flight workspace or unused placeholder exists;
- the composer is already visible after genuine transcript overflow without scrolling it into view;
- keyboard focus reaches message interaction controls and the composer in DOM order;
- 44px targets, full reduced-motion duration lists, 200% zoom, and 320/390/768/1440 fit pass;
- `/` and `/developers` still build.

### Noodle proof

Use the project-local CLI only:

```bash
./node_modules/.bin/noodle validate --json
./node_modules/.bin/noodle test --json
./node_modules/.bin/noodle check --json
./node_modules/.bin/noodle validate src/embedded-server.ts --json
./node_modules/.bin/noodle check src/embedded-server.ts --target embedded-assistant --json
```

Local green evidence does not prove hosted behavior. No hosted write is part of this design.

## Success criteria

The implementation is successful when a traveler experiences one polished conversation, every interactive MCP surface appears inline at the moment it is relevant, no empty side workspace remains, the assistant asks only the next necessary question, and all existing security/session boundaries continue to pass locally.
