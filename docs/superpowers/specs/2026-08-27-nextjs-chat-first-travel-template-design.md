# Next.js Chat-First Travel Template Design

**Status:** Approved for implementation planning on 2026-08-27

**Owns:** The primary Next.js website, Brightdesk-derived chat-first interaction, guest assistant access, repository migration, customization boundary, optional OAuth guide, and release evidence required before the old embedded-host example is retired

**Depends on:** The existing Nuitee flight connector, schemas, tools, MCP Apps, caller-scoped selection state, embedded-assistant deployment support, and the repository's public-readiness controls

## 1. Outcome

Turn this repository into a developer template whose primary experience is a real Next.js travel website with an embedded Noodle assistant. The website must feel like the assistant is the product, using the same structural and interaction pattern as Brightdesk's current Akari home:

- a floating workspace rail;
- one quiet, dominant conversation canvas;
- a centered guest zero state and composer;
- assistant initialization only after the first submitted message;
- a custom application-owned renderer;
- plain-language progress instead of internal tool names;
- inline Noodle MCP App views for flight results;
- responsive, accessible behavior from desktop through 390px mobile.

The template is guest-first. It must work without a website account, browser cookie, assistant client secret, or application database. Developers who need sign-in receive a separate OAuth and authenticated-session guide; the default template does not ship dead authentication code.

The product boundary remains exactly **Search → Select → Verify**. A verified fare is the terminal state. The template does not prebook, collect passenger data, take payment, issue tickets, cancel, or refund.

## 2. Chosen architecture

Use one repository with two independently deployable surfaces:

1. `apps/web/`: the primary Next.js website and custom chat renderer.
2. `src/`: the existing Noodle MCP server, Nuitee connector, tools, widgets, state, and embedded-assistant declaration.

A root `starter.config.ts` becomes the checked-in, non-secret source of developer customization shared by both surfaces.

This structure was chosen over:

- expanding the current Vite host, which would fail the Next.js requirement and leave the website as a secondary example; and
- splitting every concern into new workspace packages, which would add monorepo concepts and migration churn without improving the template's first-use experience.

`examples/embedded-assistant-host/` remains temporarily as a migration oracle. It is removed only after the Next.js app has equivalent or stronger session, origin, error, build, and browser coverage.

## 3. Product scope

### 3.1 Included capabilities

The website exposes the same Nuitee-backed capability set already authored by the MCP:

- open the travel starter and explain supported domains;
- conversational one-way and round-trip flight search;
- resolve only unambiguous city or airport names to IATA codes;
- ask for clarification instead of guessing ambiguous locations;
- compare at most ten bounded itineraries;
- select an application-issued opaque fare identifier inside the flight-results App;
- verify the active or explicitly selected fare against current availability and price;
- report provider changes, expiry, partial results, and sanitized errors.

The public assistant capability allowlist includes the three model-visible tools and the App-only selection helper. `select_flight_offer` remains `visibility: ['app']`; it is callable by the trusted MCP App bridge but is not offered to the model as a conversational capability.

### 3.2 Excluded capabilities

- prebooking or reservation holds;
- passenger profile or document collection;
- payment, ticketing, order creation, or booking confirmation;
- cancellation, changes, refunds, loyalty, hotels, cars, ground travel, or experiences;
- saved trips, conversation history, accounts, or cross-device persistence;
- dynamic multi-tenant or runtime white-label configuration;
- browser calls directly to Nuitee;
- client-side provider offer identifiers or raw provider payloads.

## 4. Repository structure

The implementation target is:

```text
apps/web/
  app/
    layout.tsx
    page.tsx
    developers/page.tsx
    globals.css
  src/
    components/
      travel-home.tsx
      travel-conversation.tsx
      travel-composer.tsx
      trip-context-rail.tsx
      settings-sheet.tsx
      travel-view-registry.tsx
      travel-progress.ts
    lib/
      assistant-config.ts
      trip-projection.ts
  test/
  package.json

src/
  travel-server.ts
  flight-connectors.ts
  flight-runtime.ts
  flight-schemas.ts
  views/

starter.config.ts
scripts/customize.mjs
docs/
  oauth.md
  architecture.md
  EMBEDDED_ASSISTANT.md
```

`pnpm-workspace.yaml` adds `apps/*`. Root scripts make the website obvious:

- `pnpm dev:web` starts Next.js;
- `pnpm build:web` performs the production website build;
- `pnpm test:web` runs website tests;
- the canonical offline CI command includes the MCP gates and website typecheck, tests, build, and browser checks.

The root README leads with the Next.js website. External MCP-host use remains documented as a supported secondary path.

## 5. Customization model

`starter.config.ts` is the sole checked-in customization contract. It contains only non-secret values:

- brand name and short mark;
- assistant display name;
- tagline and zero-state copy;
- semantic light and dark color tokens;
- radius and density choices;
- exact local and production website origins;
- public documentation, support, privacy, and terms links;
- suggested starter prompts.

It does not contain Nuitee credentials, model settings, assistant client credentials, deployment tokens, or provider endpoints.

Both the MCP branding block and the Next.js website import this config. `scripts/customize.mjs` updates and validates the single file rather than maintaining two brand sources. `src/starter-config.ts` may remain as a compatibility re-export during migration, then is removed after every consumer uses the root config.

This is a developer template, not a dynamic white-label platform. A developer changes the checked-in config and redeploys. There is no tenant table, runtime theme API, tenant switcher, or per-request brand selection.

## 6. Website experience

### 6.1 Shared Brightdesk composition

The visual composition follows Brightdesk rather than the current promotional Vite host:

- a floating 15–18rem desktop rail with an inset rounded boundary;
- a fluid white conversation canvas;
- restrained borders and tonal separation instead of card walls and heavy shadows;
- one limited accent used for assistant presence and the selected destination;
- generous whitespace around the zero-state composer;
- no dashboard charts, fake itinerary history, deal feed, or dead travel navigation.

The travel template uses its own semantic brand tokens, but preserves Brightdesk's hierarchy, spacing, responsiveness, interaction cadence, and reduced-motion behavior.

### 6.2 Guest zero state

Before the first message:

- the rail shows the brand, selected `New trip`, `Developer guide`, `Guest session`, and `Settings`;
- `Current trip` displays `No trip started` and no invented facts;
- the center shows the assistant mark, `Where would you like to go?`, a one-sentence capability description, the large composer, and three configured starter prompts;
- no assistant session is opened and no daily public-assistant admission is spent merely by mounting the page;
- setup errors are not shown until the visitor tries to start a conversation.

`Developer guide` navigates to a real in-site setup page backed by the repository's current documentation. `Guest session` is a non-interactive status, not an account control. `Settings` opens an accessible sheet containing the system/light/dark theme choice, privacy/support links, and a clear-conversation action. The rail contains no fake conversation history or dead destinations.

The zero-state component owns the first draft. On submit it mounts a separate conversation component with the initial prompt. This preserves React hook ordering and mirrors Brightdesk's delayed assistant initialization.

### 6.3 Conversation state

After the first valid submit:

- the zero state is replaced by a transcript view without a full-page navigation;
- the custom assistant hook is created with the public `embedId`, optional public service URL, and a browser-local `principalKey`;
- the initial prompt is sent exactly once with Strict Mode-safe effect cleanup;
- `New trip` and `Reset conversation` abort active work, reset the assistant session, clear the transcript projection, and clear the trip rail;
- follow-up messages use the same session until expiry or reset;
- the composer remains fixed within the conversation canvas while only the transcript scrolls.

The guest `principalKey` is generated once per mounted browser tab and stays in memory. It is never sent to Noodle, stored in local storage, used as authorization, or reused across a reload.

### 6.4 Trip context rail

The rail is a projection, not a second state authority. It may show:

- resolved origin and destination;
- travel dates;
- traveler count;
- current phase: searching, comparing fares, selected, verifying, or verified.

It updates only from validated structured outputs already returned by `search_flights`, `select_flight_offer`, and `verify_flight_offer`. It never parses assistant prose, guesses missing values, stores provider identifiers, or decides authorization.

Before a successful search, unknown fields remain absent. On provider error, the prior valid search context may remain visible with an explicit stale/error state; it must not silently present failed data as current.

### 6.5 Messages and MCP Apps

The renderer uses `useNoodleAssistant` from `@noodleseed/assistant/react/client`. It preserves typed message parts:

- `text` renders through a safe Markdown component;
- `data-view` renders through `NoodleAppView` with the existing client and resolved theme;
- `data-confirmation` and `data-input-request` have explicit supported or fail-closed UI;
- raw `data-tool-result` JSON is never printed as customer-facing content;
- unsupported parts render an explicit safe fallback rather than disappearing silently.

The existing travel-home and flight-results MCP Apps remain the authoritative rich interfaces. The host does not copy their business UI, fetch `ui://` resources itself, inject provider HTML, use `srcdoc`, or recreate the MCP Apps bridge.

Every invocation keeps its service-provided identity. The host does not generically deduplicate views by content. If a future product decision needs a single replaceable slot, it must use an explicit application-owned resource-to-slot map.

### 6.6 Progress and loading

Customer copy never exposes internal tool identifiers. Use a finite mapping:

| Capability | Customer progress copy |
| --- | --- |
| `open_travel_starter` | `Opening the travel assistant` |
| `search_flights` | `Searching current flights` |
| `select_flight_offer` | `Saving your fare choice` |
| `verify_flight_offer` | `Verifying the current fare` |
| unknown | `Working on your request` |

One stable `role="status"` and `aria-live="polite"` region presents thinking, mapped tool activity, and view readiness. Loading uses a restrained animated assistant mark or skeleton. It never renders a static `Loading xyz` message as the primary experience, flashes internal names, or starts competing animations.

Reduced-motion mode stops decorative rotation, shimmer, and non-essential transitions while retaining status text.

### 6.7 Failure states

The UI distinguishes:

- missing public embed configuration: developer-facing setup state with no fake assistant;
- exhausted public budget: calm unavailable state with no automatic retry loop;
- network or assistant service failure: safe retry for a message only when the client reports it as retryable;
- provider search failure: existing sanitized message and no synthetic fixture activation;
- expired or unknown selection: ask the guest to search or select again;
- partial flight results: show bounded valid results with partial status;
- unavailable MCP App view: text fallback or explicit retry, never raw JSON;
- unsupported interaction: fail closed with a clear message.

No error state implies a booking was created or a fare was held.

### 6.8 Responsive and accessible behavior

- Desktop uses the floating rail and centered canvas.
- Tablet collapses the rail while keeping the composer dominant.
- Mobile replaces the rail with a compact top bar and accessible menu; trip context moves below the header without horizontal scrolling.
- The layout works at 390px and with 200% text zoom.
- The page has one `main`, one `h1`, a skip link, visible focus styles, semantic transcript landmarks, and 44px interactive targets.
- Keyboard submit, stop, reset, view interactions, and any confirmation/elicitation controls are fully operable.
- Transcript scrolling preserves an intentional upward reading position and follows new output only when the visitor is near the bottom or sends a new message.

## 7. Guest assistant surface

The default embedded server changes from `authenticatedWebsite(...)` to `publicWebsite(...)` for the primary site.

The tool factory must create each capability once, then pass those same capability references to both the server list and the public surface allowlist. Do not recreate tools independently for the allowlist.

The public surface owns:

- exact loopback and HTTPS production origins from `starter.config.ts`;
- the explicit allowlist for open, search, verify, and the App-only selection helper;
- the existing assistant model configuration held by the Noodle deployment;
- an inline presentation mode compatible with an application-owned renderer;
- a real privacy URL before hosted/public readiness;
- operator-controlled daily admission and turn budgets plus a kill switch.

Deployment provisions a stable, non-secret public embed ID. `apps/web` receives it as `NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID`; an optional `NEXT_PUBLIC_NOODLE_SERVICE_URL` supports local or self-hosted environments. These are public deployment coordinates, not credentials.

The guest website has no `/api/assistant/session` route and holds no Noodle assistant client ID or secret. The browser client opens its anonymous session directly through the public embed service when the first message is submitted.

## 8. Runtime data flow

1. The guest loads the Next.js site. No assistant session exists.
2. The guest submits a non-empty first prompt.
3. The conversation component mounts the public headless assistant client with the embed ID.
4. The service admits an anonymous principal under the exact public surface, budget, and capability allowlist.
5. The assistant model uses the shared product guide and calls only projected capabilities.
6. `search_flights` calls the existing Nuitee gateway through server-side credentials, normalizes the response, writes caller-scoped selection state, and returns bounded structured output plus the flight-results view.
7. The browser renders the linked MCP App through `NoodleAppView`. It never calls Nuitee.
8. A fare click invokes the App-only selection helper using the application-issued opaque selection ID.
9. Verification reads the active caller-scoped selection and calls Nuitee with the privately held provider identifier.
10. The assistant reports current availability and price. The workflow stops.

Selection state remains caller-scoped with expected-revision protection and a 30-minute TTL. The website does not shadow or extend that state in local storage, cookies, or its own API.

## 9. Credential and privacy boundaries

| Owner | Values | Browser-visible? |
| --- | --- | --- |
| Noodle deployment | model URL/name/key or managed-model enrollment | No |
| Noodle deployment | `NUITEE_API_KEY` and connector configuration | No |
| Website deployment | public embed ID and public service URL | Yes, intentionally non-secret |
| Browser memory | short-lived anonymous assistant session and transcript | Yes, current tab only |
| Caller-scoped MCP state | search records, provider offer IDs, active opaque selection | No |

The site Content Security Policy must allow the exact Noodle service origin in `script-src`, `connect-src`, and `frame-src`, plus only the documented Nuitee Flights asset origins required by the existing marketing-carrier logo. The browser never receives arbitrary provider image URLs.

Public origin checks are a browser boundary, not bot authentication. Abuse resistance comes from the capability allowlist, bounded schemas and results, anonymous admission controls, per-surface budgets, provider limits, and the operator kill switch.

The default template collects no account identity or passenger personal data. It does not persist transcripts or add analytics that record prompt or provider response content.

## 10. OAuth and authenticated extension guide

`docs/oauth.md` explains authentication without changing the default guest application.

It must separate three concepts:

1. **Website login:** the developer's own OAuth/OIDC consumer and browser session.
2. **Embedded assistant session exchange:** the authenticated backend verifies its session, then calls `createAssistantSession` with backend-only Noodle client credentials and verified user fields.
3. **Direct MCP customer authentication:** optional `customerAuth.oidc(...)` or a supported federated adapter for external MCP clients; consuming Google OAuth for website login does not make the app an OIDC authorization server.

The guide provides two supported upgrade paths:

- replace the public surface with `authenticatedWebsite(...)` and add a same-origin Next.js `/api/assistant/session` route; or
- use a mixed `publicWebsite({ signIn: true })` surface when a future identity-dependent capability justifies preserving an anonymous conversation through sign-in.

The guide requires:

- exact trusted origins from server configuration, never arbitrary request headers;
- authentication before session exchange;
- backend-only `NOODLE_SERVICE_URL`, client ID, and client secret;
- unchanged forwarding of the session response;
- browser-local `principalKey` changes when the signed-in user or tenant changes;
- explicit sign-out/reset handling so one principal never sees another principal's transcript;
- tests for signed-out `401`, wrong-origin `403`, secret absence from browser output, and one authenticated tool turn.

Because the current travel capabilities do not require identity, OAuth is not added merely to decorate the template. Developers should introduce it only with a real persistence, personalization, authorization, or identity-bound capability.

## 11. Migration strategy

The implementation plan must preserve a working repository throughout:

1. Add the root config contract and adapt current consumers without changing behavior.
2. Refactor travel capability construction so public surface allowlisting reuses the exact tool references.
3. Add `apps/web` with the Brightdesk-derived shell and delayed guest client.
4. Port safe message, progress, scroll, MCP App view, fallback, and responsive behavior from Brightdesk by adapting domain-specific names and data rather than copying customer-operations logic.
5. Add website build, unit, browser, and repository contract gates.
6. Make README and customization guidance lead with the Next.js site.
7. Prove local and hosted parity.
8. Remove `examples/embedded-assistant-host/` and its scripts only after every parity gate passes.

The migration must not create a second MCP server, duplicate the Nuitee connector, copy provider schemas into the website, or add a separate assistant-only business tool set.

## 12. Verification and release gates

### 12.1 Static and automated gates

- current root tests, Noodle validation, Noodle smoke tests, tool listing, and target checks pass;
- Next.js typecheck, unit tests, production build, and dependency boundary checks pass;
- public surface inspection lists only the intended four capabilities, with selection still App-only;
- zero-state tests prove no public session/network admission occurs before first submit;
- Strict Mode tests prove the first prompt sends exactly once;
- reset tests prove session, transcript, and rail projection clear together;
- renderer tests cover text, view, confirmation, elicitation, tool result suppression, unsupported parts, retryable and terminal errors;
- no test, fixture, snapshot, generated file, or build output contains secrets or provider offer IDs;
- repository tests enforce one canonical starter config and prevent reintroduction of the retired Vite host after removal.

### 12.2 Browser gates

- inspect desktop, tablet, 390px mobile, dark mode if retained, reduced motion, 200% zoom, and keyboard-only use;
- submit a real prompt, render a real linked flight-results App, select a fare, and verify it;
- inspect browser network, DOM, storage, source, and Next.js payloads for secret absence;
- verify exact-origin rejection and CSP behavior for script, connection, and frame delivery;
- verify transcript scroll preservation and follow-latest behavior;
- verify calm budget-exhausted, session-expired, provider-error, partial-result, and App-unavailable states.

### 12.3 Hosted gates before calling the template ready

- active assistant-enabled deployment with a real public embed ID;
- real HTTPS website origin and monitored privacy/support links;
- successful public embed preflight for the active surface;
- one anonymous hosted Search → Select → Verify journey using authorized test inventory;
- write → expire → fresh write → verify on one unrestarted hosted server for the 30-minute `flight_selections` lifecycle;
- daily budget visibility and a tested zero-budget kill switch;
- no placeholder domains, contacts, widget origins, or repository governance gaps;
- no claim that local checks prove hosted compatibility, provider availability, adoption, booking completion, or production business outcomes.

## 13. Acceptance criteria

The design is complete when all of the following are true:

- a developer opening the repository sees the Next.js website as the primary path;
- the website visibly follows the approved Brightdesk chat-first composition;
- a guest can search, compare, select, and verify without creating an account;
- the assistant does not initialize before the first submit;
- every rich flight result is rendered through the existing MCP App boundary;
- the trip rail contains only validated structured facts;
- the browser holds no Nuitee key, model key, assistant client secret, provider offer ID, or raw application session;
- the default repository contains no unused authentication system;
- the OAuth guide is accurate about website OAuth, assistant session exchange, and direct MCP OIDC;
- the Vite companion is removed only after the Next.js app satisfies its replacement gates;
- the experience never implies booking, payment, ticketing, cancellation, or refund support.

## 14. Resolved decisions

- **Primary experience:** Next.js website, not external-host-first documentation.
- **Form factor:** Brightdesk-style assistant-as-the-product layout.
- **Access:** guest-first public assistant surface.
- **Authentication:** guide only by default; no dead auth implementation.
- **Customization:** one checked-in developer config, not runtime white-label tenancy.
- **Renderer:** application-owned React renderer using the official headless client and `NoodleAppView`.
- **Capabilities:** expose only the existing Nuitee MCP surface.
- **Terminal workflow state:** verified fare.
- **Persistence:** in-memory guest transcript plus existing caller-scoped Noodle state only.
- **Migration:** keep the current embedded example until Next.js replacement parity is proven.
