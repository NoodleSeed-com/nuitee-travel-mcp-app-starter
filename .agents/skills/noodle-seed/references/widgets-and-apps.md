# MCP Apps and widgets

## Contents

- Tools and views
- React hook surface
- Worked widget recipe
- ChatGPT App = this widget + a domain
- Knowledge/source apps (search + fetch)
- Permissions and host bridge
- Readiness and boundaries

## Tools and views

Use `tool(name, { description, input, output, fulfil, view })` for a model-visible tool that renders a widget, and the same `tool(name, { ..., visibility: ["app"] })` for an app-only helper hidden from the model. A `view` is `{ component: "name", entry: "./views/name.tsx" }` — a React component the compiler bundles at validate/deploy time.

## Noodle Design default

Generated widgets, official examples, and agent-authored MCP Apps must start with `@noodleseed/one/react` primitives and semantic tokens. Custom React/CSS or third-party components remain valid when the kit lacks the required behavior or the developer explicitly requests them.

`noodle init my-app` defaults to the SaaS profile: federated OIDC placeholders, one explicit context-provider tool, MCP App UI, resource, prompt, state contract, branding, handoff, and embedded assistant. Begin by replacing the IdP/audience/domain placeholders. Use `--template widget`, `hello`, or `http-api` only when that narrower profile is intentional.

The default composition rule is: build the smallest useful conversational surface. Inline has one purpose, one primary action, and at most two visible actions. Use progressive disclosure or a later conversational turn for secondary detail; request fullscreen only when the user asks or the task genuinely needs it. Never use nested scrolling. At 280px and wider, the widget must remain one-column, readable, touch-safe, and free of horizontal overflow. Remove secondary chrome before shrinking essential content.

Treat 1 MiB of uncompressed UTF-8 HTML as the recommended initial React-widget budget, not a compatibility wall. Noodle Seed accepts up to 10 MiB per compiled widget and 20 MiB across a deployment; `noodle check` reports raw and gzip-estimated sizes. Keep large media and dynamic datasets in hosted assets/resources or bounded app-only tool responses instead of inflating the initial widget resource.

Every production widget handles loading, empty, partial, stale, error, retry, and success states. Prefill fields from known tool results and choose safe, reversible defaults; preserve the user’s work across rerenders, and never preselect a consequential action. Use public React primitives and branding tokens. Never author against `ns-*`, `nsr-*`, or example-local `--nw-*` classes/tokens; those are implementation details, not alternate design systems.

Keep the complete `useToolInfo()` result. An empty result envelope is pending, `isError` is an explicit tool error, and any non-pending success must validate every required field and identifier before it becomes UI data. Render a malformed-result error when validation fails, and render dependent actions only after validation succeeds. Safe local input defaults may follow valid hydration; they must never fabricate a loaded business record.

## React hook surface

Author views as React components. `generateHelpers<ServerDefinition>()` (from `@noodleseed/one/react`) returns the typed host hooks:

| Hook | Use for |
| :-- | :-- |
| `useToolInfo` | Read the complete invoking tool result: treat `{}` as pending, handle `isError`, validate every required `structuredContent` field and identifier, reject malformed success data, and render dependent actions only after validation succeeds. |
| `useCallTool` | Call a tool from the widget — returns `{ status, callTool, callToolAsync, data, structuredContent, error, reset }`; target a model-visible tool or a hidden `tool` helper. |
| `useViewState` | Persist per-widget UI state across re-renders and restores: `const [value, setValue] = useViewState("key", initial)`. |
| `useLayout` | Read host layout: `{ theme, displayMode, locale?, host?, supports? }` (`displayMode` is `"inline"`/`"pip"`/`"fullscreen"`) — adapt styling to the host theme and mode. |
| `useBranding` | Read the server-level brand kit (`name`, `accent`, `surface`, `radius`, themed logo/mark/avatar URLs). Nothing is applied for you: widget CSS is yours, so map the values you need onto your own custom properties (e.g. `style={{ "--my-accent": useBranding().accent }}`) instead of hard-coding the brand color a second time. |
| `useRequestDisplayMode` | Request a host-mediated layout change such as fullscreen; treat it as best-effort and keep inline rendering useful. |
| `useOpenExternal` | Open an external link through the host (never `window.open`); the target origin must be listed in the server-level `handoff.allowedDomains`. |
| `useSendFollowUpMessage` | Send a follow-up prompt to the model from a user interaction: `send({ prompt })` — trigger only from an explicit user action. |
| `useUpdateModelContext` | Publish one compact, cohesive author-selected text/structured snapshot through the standard MCP Apps model-context channel; each call replaces the prior snapshot, so include every still-relevant field and check `useLayout().supports?.modelContext` first. |
| `useWidgetLifecycle` | Calling the hook auto-publishes `mounted` and listens for host `cancelled`/`dismissed`; use its publisher for author-owned `submitted` or app milestones, include a complete safe replacement snapshot, and pair explicit submit/cancel with `useSendFollowUpMessage` when an immediate reply is wanted. |
| `useAppFlow` | Manage named widget views with persisted params and back-stack state: `const flow = useAppFlow({ initialView, views })`. |
| `useHandoff` | Open server-created HTTP(S) handoff URLs through the host with status/error state; domain policy still comes from `handoff.allowedDomains`. |

Bind interactive elements to tools (`useCallTool("place_order")`), drive named views with `useAppFlow(...)`, open server-created handoffs with `useHandoff()`, and publish one compact, safe, cohesive snapshot with `useUpdateModelContext()` when `useLayout().supports?.modelContext` is true. Every model-context or lifecycle publication replaces the prior snapshot rather than merging fields, so include everything the model should still know. Calling `useWidgetLifecycle("name")` automatically publishes `mounted`, listens for host `cancelled` and `dismissed`, and returns a publisher for author-owned `submitted` or app-specific milestones; `mounted` is not proof that the host presented pixels. Both hooks use the standard MCP Apps model-context channel, not a host-specific API. These updates affect future model context but do not start a model turn. When an explicit user submit/cancel should receive an immediate reply, also call `useSendFollowUpMessage()` from that user action. `data-llm` may remain a DOM inspection hint, but it is not the bidirectional model-state contract. Use `createViewStore("key", initial)` for multi-component widget state such as carts, filters, or drafts. Use the domain-neutral React components from `@noodleseed/one/react` (`AppShell`, `ShellNav`, `ViewStack`, `AsyncBoundary`, `ActionBar`, `Field`, `QuantityStepper`, `ChoiceGroup`, `HandoffButton`, and related state components) for rich apps before inventing local shell/control scaffolding. Adapt to the host with `useLayout()` — style for both `theme` values, and keep the inline `displayMode` compact (content fits the space; no internal scrolling). Trigger `useOpenExternal()`, `useHandoff()`, and `useSendFollowUpMessage()` only from explicit user actions. A raw `html` escape hatch exists for self-contained widgets (declarative `data-bind`/`data-action`; no inline `<script>`).

## Worked widget recipe

Minimal, complete, and compile-verified — `noodle validate` bundles the view and `noodle check --target chatgpt` audits it. Author two files: the view (`src/views/order-status.tsx`) and the tool declaration (`src/server.ts`).

### 1. The view component

Author React. `generateHelpers<ServerDefinition>()` (from `@noodleseed/one/react`) returns the typed host hooks: read the tool result with `useToolInfo`, call a widget-only helper with `useCallTool`, keep local UI state that survives re-render with `useViewState`, open an allowlisted link with `useOpenExternal`, and publish cohesive model-context snapshots plus author-owned lifecycle milestones.

```tsx
import { useEffect } from 'react';
import type { ServerDefinition } from '@noodleseed/one';
import { Action, ActionBar, AsyncBoundary, Feedback, Field, Flow, Frame, Region, Select, generateHelpers } from '@noodleseed/one/react';

// One call wires the typed host bridge; destructure only the hooks this view uses.
const { useToolInfo, useCallTool, useViewState, useLayout, useOpenExternal, useSendFollowUpMessage, useUpdateModelContext, useWidgetLifecycle } =
  generateHelpers<ServerDefinition>();

type OrderResult = {
  readonly customer: string;
  readonly item: string;
  readonly total: number;
  readonly checkoutUrl: string;
};

function isOrderResult(value: unknown): value is OrderResult {
  if (value === null || typeof value !== 'object') return false;
  const result = value as Partial<OrderResult>;
  return (
    typeof result.customer === 'string' && result.customer.length > 0 &&
    typeof result.item === 'string' && result.item.length > 0 &&
    typeof result.total === 'number' && Number.isFinite(result.total) &&
    typeof result.checkoutUrl === 'string' && result.checkoutUrl.startsWith('https://')
  );
}

export default function OrderStatus() {
  const toolInfo = useToolInfo('show_order');
  const isPending = Object.keys(toolInfo).length === 0;
  const shown = isOrderResult(toolInfo.structuredContent) ? toolInfo.structuredContent : undefined;
  const placeOrder = useCallTool('place_order'); // calls the widget-only helper tool
  const { supports } = useLayout();
  const openExternal = useOpenExternal();
  const sendFollowUpMessage = useSendFollowUpMessage();
  const updateModelContext = useUpdateModelContext();
  const publishLifecycle = useWidgetLifecycle('pickup-order');
  const [item, setItem] = useViewState('item', shown?.item ?? 'falafel_wrap'); // survives re-render
  const confirmed = placeOrder.data?.structuredContent as { readonly status?: string } | undefined;
  const total = shown?.total ?? 0;
  const checkoutUrl = shown?.checkoutUrl ?? '';

  useEffect(() => {
    if (!shown || !supports?.modelContext) return;
    void updateModelContext({
      content: [{ type: 'text', text: `Pickup order: ${item}, total ${total}` }],
      structuredContent: { widget: { name: 'pickup-order', lifecycle: 'active' }, order: { item, total } },
    });
  }, [item, shown, supports?.modelContext, total, updateModelContext]);

  async function submitOrder() {
    if (!shown) return;
    await placeOrder.callTool({ customer: shown.customer, item });
    if (supports?.modelContext) {
      await publishLifecycle('submitted', { surface: 'order', item, total, status: 'submitted' });
    }
    if (supports?.followUpMessage) {
      await sendFollowUpMessage({ prompt: `The pickup order was submitted for ${item}. Confirm the result.` });
    }
  }

  if (isPending) return <Feedback status="loading">Loading the order…</Feedback>;
  if (toolInfo.isError) return <Feedback status="error">Could not load the order.</Feedback>;
  if (!shown) return <Feedback status="error">The order result was incomplete.</Feedback>;

  return (
    // data-llm is an inspection hint; useUpdateModelContext above is the model-visible channel.
    <Frame title="Pickup order" displayMode="auto" data-llm={`Pickup order for ${shown.customer}: ${item}, total ${total}`}>
      <Flow variant="stack">
      <AsyncBoundary state={placeOrder} loading="Placing order…" error={(error) => error.message}>
      <Region title="Order" description="Choose one item for pickup.">
      <Field label="Item">
        <Select value={item} onChange={(event) => setItem(event.currentTarget.value)} options={[
          { value: 'falafel_wrap', label: 'Falafel Wrap' },
          { value: 'lentil_soup', label: 'Lentil Soup' },
          { value: 'mint_lemonade', label: 'Mint Lemonade' },
        ]} />
      </Field>
      </Region>
      {confirmed?.status ? <Feedback status="success">{confirmed.status}</Feedback> : null}
      <ActionBar>
      <Action variant="primary" pending={placeOrder.isPending} pendingLabel="Placing…"
        onClick={submitOrder}
      >
        Place order
      </Action>
      <Action onClick={() => openExternal(checkoutUrl)}>
        Continue checkout
      </Action>
      </ActionBar>
      </AsyncBoundary>
      </Flow>
    </Frame>
  );
}
```

### 2. The tool declaration

`tool` declares both the model-visible tool that renders the view and app-only helpers the view calls. Put `visibility: ["app"]` on each helper. Wire `view: { component, entry }`, `csp`, a widget `domain`, and a real `output` schema so non-Apps hosts still receive structured data. Inside `fulfil`, `input` is a symbolic ref recorded into a flow — reference it in output/template strings, but never use it as an object key or `if` condition.

```ts
import { annotations, server, tool, z } from '@noodleseed/one';

const item = z.enum(['falafel_wrap', 'lentil_soup', 'mint_lemonade']).default('falafel_wrap');
const checkoutUrl = (customer: string) =>
  `https://orders.example.com/pickup?customer=${customer}`;

export default server(
  'pickup',
  {
    title: 'Pickup',
    version: '1.0.0',
    // External-link targets the widget opens; the compiler derives ChatGPT redirect_domains from this.
    handoff: { allowedDomains: ['https://orders.example.com'] },
  },
  [
    tool('show_order', {
      description: 'Show the pickup order and render the ordering widget.',
      // Declare tool annotations — a ChatGPT-submission requirement. A read → `readOnly()`.
      annotations: annotations.readOnly(),
      input: z.object({ customer: z.string().default('Guest') }),
      output: z.object({
        customer: z.string(),
        item: z.string(),
        total: z.number(),
        checkoutUrl: z.string(),
      }),
      fulfil: ({ input }) => ({
        customer: input.customer,
        item: 'falafel_wrap',
        total: 12,
        checkoutUrl: checkoutUrl(input.customer),
      }),
      viewTitle: 'Pickup order',
      viewDescription: 'Pick an item and place a pickup order.',
      // A ChatGPT App is this widget + a domain: one https origin per app.
      domain: 'https://pickup.example.com',
      view: { component: 'order-status', entry: './views/order-status.tsx' },
      csp: {
        connectDomains: ['https://orders.example.com'],
        resourceDomains: ['https://example.com'],
        // Keep CSP origins exact and minimal. Add `frameDomains` ONLY if the widget embeds an
        // iframe — it relaxes subframe rendering and triggers stricter ChatGPT review.
      },
    }),
    // Widget-only helper the view calls with useCallTool('place_order'); hidden from the model.
    tool('place_order', {
      visibility: ['app'],
      description: 'Place a pickup order from the widget.',
      // Widget-mediated direct action: explicit false is equivalent to omitting confirmation.
      annotations: annotations.action({ confirm: false }),
      input: z.object({ customer: z.string().default('Guest'), item }),
      output: z.object({ status: z.string(), item: z.string(), checkoutUrl: z.string() }),
      fulfil: ({ input }) => ({
        status: `Order placed for ${input.customer}.`,
        item: input.item,
        checkoutUrl: checkoutUrl(input.customer),
      }),
    }),
  ],
);
```

## ChatGPT App = this widget + a domain

A "ChatGPT App" is not a separate authoring surface — it is exactly this MCP Apps widget rendered by the ChatGPT host. From the same declaration you author three things:

- `domain` on the widget — one https origin per app (required for app-store submission, optional for dev-mode testing).
- `csp: { connectDomains, resourceDomains }` — the exact network/resource origins the widget may reach; keep them minimal. Add `frameDomains` only if the widget embeds an iframe (it relaxes subframe rendering and draws stricter review). These three lists are the complete CSP surface — there is no `base-uri` list.
- server `handoff.allowedDomains` — the external-link targets `useOpenExternal()` opens.

The compiler emits the rest automatically: the `openai/*` metadata (`openai/outputTemplate`, `openai/widgetCSP`, `openai/widgetDescription`) and ChatGPT’s `redirect_domains` (derived from `handoff.allowedDomains`). `window.openai` and Claude’s ext-apps bridge are auto-detected at startup, so the same widget renders in both Claude and ChatGPT with no host-specific code.

Verify it in the loop: `noodle check --target chatgpt --json` returning `ok:true` means the widget is **metadata-ready** for ChatGPT’s checks (`domain`, `openai/outputTemplate`, CSP present) — it does NOT prove host rendering, conversation UX, or submission acceptance. Fix any `severity:"error"` finding by its `fix`, then re-check. Validate real rendering in ChatGPT Developer Mode / MCP Inspector as a higher level before submitting.

**Every tool needs annotations** (`annotations.readOnly()` / `.action()` / `.openAction()`) — missing or wrong `readOnlyHint`/`openWorldHint`/`destructiveHint` is a common submission rejection. **App-store submission is more than building**: a public https endpoint, exact CSP, org verification, app info, screenshots, and test prompts are required — follow OpenAI’s Apps submission guidelines; `noodle check --target chatgpt` covers only the metadata prerequisites.

## Knowledge/source apps (ChatGPT): search + fetch

If the app is a read-only knowledge/source connector (docs, wiki, CRM lookups) meant for ChatGPT company-knowledge, implement exactly two tools — `search` and `fetch`, both read-only. ChatGPT only surfaces knowledge apps that match these signatures:

```ts
import { annotations, server, tool, z } from '@noodleseed/one';

export default server('kb', { title: 'Knowledge base', version: '1.0.0' }, [
  tool('search', {
    description: 'Search the knowledge base; return citable results.',
    annotations: annotations.readOnly(),
    input: z.object({ query: z.string() }),
    output: z.object({
      results: z.array(z.object({ id: z.string(), title: z.string(), url: z.string() })),
    }),
    fulfil: ({ input }) => ({ results: [{ id: 'doc-1', title: `Match: ${input.query}`, url: 'https://example.com/doc-1' }] }),
  }),
  tool('fetch', {
    description: 'Fetch one document by id for citation.',
    annotations: annotations.readOnly(),
    input: z.object({ id: z.string() }),
    output: z.object({ id: z.string(), title: z.string(), text: z.string(), url: z.string() }),
    fulfil: ({ input }) => ({ id: input.id, title: 'Doc', text: 'Full document text…', url: 'https://example.com/doc-1' }),
  }),
]);
```

`search` → `{ results: [{ id, title, url }] }`; `fetch` → `{ id, title, text, url, metadata? }`. `url` must be an absolute, user-openable https link for citation.

## Permissions and host bridge

Declare extra host capabilities with `permissions` (e.g. `permissions: { clipboardWrite: {} }`). Secrets are never injected into widgets and tool output is redacted before widget delivery. Tool results still carry useful `content`/`structuredContent`, so non-Apps hosts degrade gracefully.

## Readiness and boundaries

React views use the app-local Vite bundler. When adding a view to an existing project that does not declare Vite, run `npm install --save-dev vite` before validation.

Run `noodle validate` first, `noodle check` for widget/Apps readiness, and `noodle devtools` to preview metadata and rendering. Brand via the `server` `branding` tokens (the compiler derives the palette); do not inject raw global CSS.