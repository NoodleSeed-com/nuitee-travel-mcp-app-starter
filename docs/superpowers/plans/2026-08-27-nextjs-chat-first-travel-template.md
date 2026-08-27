# Next.js Chat-First Travel Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the repository's primary guest-first Next.js travel website with the approved Brightdesk-derived chat experience while preserving the existing Nuitee Search → Select → Verify MCP boundary.

**Architecture:** Add `apps/web` as a Next.js App Router package beside the existing `src` MCP server. The website owns the shell and custom React renderer; the Noodle deployment owns anonymous admission, the assistant model, MCP tools, state, and Nuitee credentials. One root `starter.config.ts` supplies checked-in non-secret branding to both surfaces.

**Tech Stack:** Node.js 24+, pnpm 11.17.0, Next.js 16.2.11, React 19.2.8, TypeScript 7.0.2, `@noodleseed/one` 0.139.0, `@noodleseed/assistant` 1.24.0, Vitest 4.1.10, Testing Library 16.3.2, Playwright 1.62.1, CSS, React Markdown 10.1.0

**Spec:** `docs/superpowers/specs/2026-08-27-nextjs-chat-first-travel-template-design.md`

## Global Constraints

- The product ends at a verified fare. Do not add prebooking, passenger collection, payment, ticketing, cancellation, or refunds.
- The browser must never receive `NUITEE_API_KEY`, an assistant model key, an assistant client secret, a provider offer ID, or raw provider data.
- The default website is anonymous and uses a public embed ID. Do not add a website session route or authentication implementation.
- The custom renderer must use `useNoodleAssistant` and `NoodleAppView`; it must not implement a second chat transport or MCP Apps bridge.
- The public surface must allowlist exactly `open_travel_starter`, `search_flights`, `verify_flight_offer`, and the App-only `select_flight_offer` helper.
- Keep `select_flight_offer` at `visibility: ['app']` and keep all four tools shared with external MCP hosts.
- Preserve exact origin validation. Production origins are HTTPS; HTTP is allowed only for explicit loopback ports.
- All user-visible progress uses application-owned plain language. Never derive copy from raw tool identifiers.
- The trip rail may use validated structured tool results only. It must not parse assistant prose.
- No assistant admission occurs before the guest submits the first message.
- The guest transcript and browser-local `principalKey` remain in memory and reset together.
- Use the approved restrained Brightdesk composition. The travel-specific signature is one route-orbit assistant mark; all surrounding motion stays quiet and respects reduced motion.
- Use test-driven development: observe every new focused test fail before adding its implementation.
- Run no Noodle deployment, secret, variable, access, budget, or host configuration mutation under this plan. Hosted proof and legacy-host deletion require a separately authorized promotion plan.

---

### Task 1: Make one canonical starter configuration

**Files:**
- Create: `starter.config.ts`
- Modify: `src/starter-config.ts`
- Modify: `scripts/customize.mjs:1-230`
- Modify: `test/customization.test.ts:1-157`
- Modify: `test/repository-readiness.test.ts`

**Interfaces:**
- Consumes: the current `starterConfig` object and safe customization validation.
- Produces: `starterConfig` and `StarterConfig` from root `starter.config.ts`; `src/starter-config.ts` becomes a compatibility re-export.

- [ ] **Step 1: Write the failing canonical-config tests**

Add assertions that the root config is the only object definition, the development origin is the Next.js port, links and prompts are bounded, and the current MCP still imports the same value:

```ts
import { starterConfig } from '../starter.config.js';

it('owns website presentation in one root config', async () => {
  expect(starterConfig.embeddedAssistant.origins).toContain('http://localhost:3000');
  expect(starterConfig.prompts).toHaveLength(3);
  expect(starterConfig.website.developerPath).toBe('/developers');
  expect(starterConfig.website.privacyUrl).toBeNull();
  const compatibilitySource = await readFile(
    new URL('../src/starter-config.ts', import.meta.url),
    'utf8',
  );
  expect(compatibilitySource).toBe(
    "export { starterConfig, type StarterConfig } from '../starter.config.js';\n",
  );
});
```

Extend `validateStarterConfig` tests with one rejected fourth prompt, non-HTTPS privacy URL, control characters in the assistant name, and duplicate prompt copy.

- [ ] **Step 2: Run the tests and confirm the old config fails them**

Run:

```bash
pnpm exec vitest run test/customization.test.ts test/repository-readiness.test.ts
```

Expected: FAIL because `starter.config.ts`, website links, prompts, and the port-3000 origin do not exist.

- [ ] **Step 3: Add the canonical config and compatibility re-export**

Create the root file with this shape:

```ts
export const starterConfig = {
  brand: {
    name: 'Cedar & Cloud Travel',
    mark: 'C',
    assistantName: 'Travel assistant',
    tagline: 'Thoughtful journeys, conversationally planned',
    accent: '#2B6F6D',
    signal: '#CFE86A',
    canvas: '#FBFBFB',
    surface: '#EAE8EC',
    surfaceDark: '#101B22',
    ink: '#2C2C2E',
    muted: '#737479',
    boundary: '#CBCDD5',
  },
  website: {
    developerPath: '/developers',
    supportPath: '/developers#support',
    privacyUrl: null,
    termsUrl: null,
  },
  prompts: [
    'Find a weekend flight to Rome',
    'Compare nonstop fares to London',
    'Plan a round trip for two',
  ],
  widgets: { domain: null },
  embeddedAssistant: { origins: ['http://localhost:3000'] },
} as const;

export type StarterConfig = typeof starterConfig;
```

Replace `src/starter-config.ts` with the exact compatibility re-export asserted by the test.

- [ ] **Step 4: Move customization reads and writes to the root file**

Change the script import and destination:

```js
import { starterConfig } from '../starter.config.ts';

const CONFIG_PATH = fileURLToPath(
  new URL('../starter.config.ts', import.meta.url),
);
```

Extend `validateStarterConfig` with exact keys for `website` and `prompts`. Accept `null` or an exact HTTPS URL for privacy/terms, accept only internal absolute paths for developer/support, require exactly three unique 3–80-character prompts, and preserve these fields inside `applyCustomization`.

Change `renderStarterConfig` so customization preserves the root type export:

```js
export function renderStarterConfig(input) {
  const validated = validateStarterConfig(input);
  return `export const starterConfig = ${JSON.stringify(validated, null, 2)} as const;\n\nexport type StarterConfig = typeof starterConfig;\n`;
}
```

- [ ] **Step 5: Run focused tests and customization validation**

Run:

```bash
pnpm exec vitest run test/customization.test.ts test/repository-readiness.test.ts
pnpm customize:check
```

Expected: PASS, with no second config object and no generated drift.

- [ ] **Step 6: Commit the canonical configuration**

```bash
git add starter.config.ts src/starter-config.ts scripts/customize.mjs test/customization.test.ts test/repository-readiness.test.ts
git commit -m "refactor: centralize travel starter configuration"
```

---

### Task 2: Convert the embedded assistant to a bounded public surface

**Files:**
- Modify: `src/travel-server.ts:1-324`
- Modify: `test/customization.test.ts:143-151`
- Modify: `test/server-contract.test.ts`
- Modify: `docs/generated-agent-guidance.md`

**Interfaces:**
- Consumes: `starterConfig.embeddedAssistant.origins` and the four existing tool factories.
- Produces: `createTravelCapabilities(mode)` returning `{ all, publicSurface }`; the embedded manifest exposes one `public` inline surface with four exact capability references.

- [ ] **Step 1: Write the failing manifest contract**

Replace the authenticated-surface expectation with the exact public manifest projection:

```ts
expect(manifest.server.assistant.surfaces).toEqual([
  {
    mode: 'public',
    origins: [...starterConfig.embeddedAssistant.origins],
    capabilities: [
      { kind: 'tool', name: 'open_travel_starter' },
      { kind: 'tool', name: 'search_flights' },
      { kind: 'tool', name: 'verify_flight_offer' },
      { kind: 'tool', name: 'select_flight_offer' },
    ],
  },
]);
expect(manifest.server.assistant.layout).toEqual({ mode: 'inline' });
expect(
  manifest.tools.find((tool: { name: string }) =>
    tool.name === 'select_flight_offer'),
).toMatchObject({ visibility: ['app'] });
```

Add a contract asserting every name in the surface allowlist occurs exactly once in `manifest.tools`.

- [ ] **Step 2: Run the focused tests and observe the authenticated surface failure**

```bash
pnpm exec vitest run test/customization.test.ts test/server-contract.test.ts
```

Expected: FAIL because the manifest still declares `authenticatedWebsite` and floating layout.

- [ ] **Step 3: Refactor capability construction without duplicating tools**

Import `publicWebsite` and create each tool once:

```ts
function createTravelCapabilities(live: boolean) {
  const open = openTravelStarter();
  const search = live ? liveSearchFlights() : offlineSearchFlights();
  const verify = live
    ? liveVerifyFlightOffer()
    : offlineVerifyFlightOffer();
  const select = live
    ? liveSelectFlightOffer()
    : offlineSelectFlightOffer();

  return {
    all: [open, search, verify, select] as const,
    publicSurface: [open, search, verify, select] as const,
  };
}
```

Construct `capabilities` before `embeddedAssistant` and pass the same references to the server.

- [ ] **Step 4: Declare the public inline assistant**

Use the current operator-provided model contract and the explicit allowlist:

```ts
access: publicWebsite({
  origins: [...starterConfig.embeddedAssistant.origins],
  capabilities: [...capabilities.publicSurface],
}),
layout: { mode: 'inline' },
```

Remove `authenticatedWebsite` from imports. Keep `openAICompatible`, model variables, and secrets in the Noodle deployment.

- [ ] **Step 5: Regenerate checked guidance through the supported command**

Run:

```bash
node_modules/.bin/noodle agents setup --write --json
```

Review only generated guidance changes. Do not accept changes to authored product behavior from the generator.

- [ ] **Step 6: Validate and test the public projection**

Run:

```bash
node_modules/.bin/noodle validate src/embedded-server.ts --json
node_modules/.bin/noodle check src/embedded-server.ts --target embedded-assistant --json
pnpm exec vitest run test/customization.test.ts test/server-contract.test.ts
```

Expected: all envelopes report `ok: true`; tests PASS; `select_flight_offer` remains App-only.

- [ ] **Step 7: Commit the public assistant boundary**

```bash
git add src/travel-server.ts test/customization.test.ts test/server-contract.test.ts docs/generated-agent-guidance.md .agents
git commit -m "feat: expose a bounded guest assistant surface"
```

---

### Task 3: Scaffold the primary Next.js package and runtime configuration

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next-env.d.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.setup.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/src/lib/assistant-config.ts`
- Create: `apps/web/test/assistant-config.test.ts`
- Create: `apps/web/.env.example`
- Modify: `pnpm-workspace.yaml`
- Modify: `pnpm-lock.yaml` through `pnpm install`

**Interfaces:**
- Consumes: root `starterConfig` and public environment values.
- Produces: `PublicAssistantRuntime`, `resolvePublicAssistantRuntime(env)`, a buildable Next.js package, and security headers based on the exact assistant service origin.

- [ ] **Step 1: Write the failing runtime-config test**

```ts
import { describe, expect, it } from 'vitest';
import { resolvePublicAssistantRuntime } from '../src/lib/assistant-config';

describe('public assistant runtime config', () => {
  it('fails closed when the embed id is absent', () => {
    expect(resolvePublicAssistantRuntime({})).toEqual({
      status: 'setup-required',
      message: 'Add NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID to start the travel assistant.',
    });
  });

  it('accepts a public embed id and exact HTTPS service origin', () => {
    expect(resolvePublicAssistantRuntime({
      NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID: 'pub_static_test',
      NEXT_PUBLIC_NOODLE_SERVICE_URL: 'https://cloud.noodleseed.dev',
    })).toEqual({
      status: 'ready',
      embedId: 'pub_static_test',
      serviceUrl: 'https://cloud.noodleseed.dev',
    });
  });

  it.each([
    'https://cloud.noodleseed.dev/path',
    'https://user@cloud.noodleseed.dev',
    'http://cloud.noodleseed.dev',
  ])('rejects an unsafe service URL %s', (serviceUrl) => {
    expect(() => resolvePublicAssistantRuntime({
      NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID: 'pub_static_test',
      NEXT_PUBLIC_NOODLE_SERVICE_URL: serviceUrl,
    })).toThrow();
  });
});
```

- [ ] **Step 2: Add the web package manifest and workspace entry**

Use exact versions already compatible with the repository:

```json
{
  "name": "@nuitee-travel-starter/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:browser": "playwright test"
  },
  "dependencies": {
    "@noodleseed/assistant": "1.24.0",
    "lucide-react": "1.26.0",
    "next": "16.2.11",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-markdown": "10.1.0",
    "remark-gfm": "4.0.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "7.0.0",
    "@testing-library/react": "16.3.2",
    "@types/node": "26.2.0",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "@vitejs/plugin-react": "6.1.0",
    "@playwright/test": "1.62.1",
    "jsdom": "29.1.1",
    "typescript": "7.0.2",
    "vitest": "4.1.10"
  }
}
```

Add `apps/*` to `pnpm-workspace.yaml`, then run `pnpm install` to update the lockfile. Do not hand-edit `pnpm-lock.yaml`.

- [ ] **Step 3: Run the new focused test and observe the missing module failure**

```bash
pnpm --filter @nuitee-travel-starter/web test -- assistant-config.test.ts
```

Expected: FAIL because `src/lib/assistant-config.ts` does not exist.

- [ ] **Step 4: Implement the runtime-config union**

```ts
export type PublicAssistantRuntime =
  | {
      readonly status: 'ready';
      readonly embedId: string;
      readonly serviceUrl: string;
    }
  | {
      readonly status: 'setup-required';
      readonly message: string;
    };

export type ReadyPublicAssistantRuntime = Extract<
  PublicAssistantRuntime,
  { readonly status: 'ready' }
>;

const DEFAULT_SERVICE_URL = 'https://cloud.noodleseed.dev';

export function resolvePublicAssistantRuntime(
  env: Readonly<Record<string, string | undefined>>,
): PublicAssistantRuntime {
  const embedId = env.NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID?.trim();
  if (!embedId) {
    return {
      status: 'setup-required',
      message: 'Add NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID to start the travel assistant.',
    };
  }
  const serviceUrl = env.NEXT_PUBLIC_NOODLE_SERVICE_URL?.trim()
    || DEFAULT_SERVICE_URL;
  const parsed = new URL(serviceUrl);
  const loopback = parsed.hostname === 'localhost'
    || parsed.hostname === '127.0.0.1';
  if (
    serviceUrl !== parsed.origin
    || parsed.username
    || parsed.password
    || (parsed.protocol !== 'https:'
      && !(parsed.protocol === 'http:' && loopback && parsed.port))
  ) {
    throw new Error('Assistant service URL must be an exact HTTPS or explicit loopback origin.');
  }
  return { status: 'ready', embedId, serviceUrl };
}
```

- [ ] **Step 5: Add the minimal Next.js app and security headers**

`app/layout.tsx` imports the root config for metadata and `globals.css`. `app/page.tsx` resolves the runtime config server-side and renders a temporary semantic setup card. `next.config.ts` sets `output: 'standalone'`, `outputFileTracingRoot` to the repository root, disables `poweredByHeader`, and returns these headers:

```ts
const serviceOrigin = new URL(
  process.env.NEXT_PUBLIC_NOODLE_SERVICE_URL
    || 'https://cloud.noodleseed.dev',
).origin;

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  `connect-src 'self' ${serviceOrigin}`,
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  `frame-src 'self' ${serviceOrigin}`,
  "img-src 'self' data:",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline' ${serviceOrigin}`,
  "style-src 'self' 'unsafe-inline'",
].join('; ');
```

Also emit `Permissions-Policy: camera=(), geolocation=(), microphone=()`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.

- [ ] **Step 6: Run package tests, typecheck, and build**

```bash
pnpm --filter @nuitee-travel-starter/web test
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web build
```

Expected: PASS with the setup-required page and no required secret.

- [ ] **Step 7: Commit the Next.js foundation**

```bash
git add apps/web pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat: add the primary Next.js travel website"
```

---

### Task 4: Build the Brightdesk-derived zero state and workspace shell

**Files:**
- Create: `apps/web/src/components/travel-assistant-page.tsx`
- Create: `apps/web/src/components/travel-zero-state.tsx`
- Create: `apps/web/src/components/travel-composer.tsx`
- Create: `apps/web/src/components/trip-context-rail.tsx`
- Create: `apps/web/src/components/settings-sheet.tsx`
- Create: `apps/web/src/components/route-assistant-mark.tsx`
- Create: `apps/web/src/lib/trip-projection.ts`
- Create: `apps/web/test/travel-zero-state.test.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/globals.css`

**Interfaces:**
- Consumes: `PublicAssistantRuntime`, root `starterConfig`, and the first user prompt.
- Produces: `TravelAssistantPage`, `TravelZeroState`, `TravelComposer`, `TripContextRail`, `SettingsSheet`, `RouteAssistantMark`, and the initial `TripProjection` type.

- [ ] **Step 1: Write failing zero-state and shell tests**

```tsx
it('renders the assistant as the product without fake trip history', () => {
  render(<TravelAssistantPage runtime={{ status: 'setup-required', message: 'setup' }} />);
  expect(screen.getByRole('heading', {
    name: 'Where would you like to go?',
  })).toBeVisible();
  expect(screen.getByRole('textbox', {
    name: 'Ask about a flight',
  })).toBeVisible();
  expect(screen.getByText('No trip started')).toBeVisible();
  expect(screen.getByText('Guest session')).toBeVisible();
  expect(screen.queryByText(/conversation history/i)).not.toBeInTheDocument();
});

it('submits a configured prompt through the same first-message callback', () => {
  const onStart = vi.fn();
  render(<TravelZeroState onStart={onStart} />);
  fireEvent.click(screen.getByRole('button', {
    name: starterConfig.prompts[0],
  }));
  expect(onStart).toHaveBeenCalledWith(starterConfig.prompts[0]);
});
```

Add a test that `Settings` opens a dialog with theme, privacy/support, and clear-conversation controls, while `Guest session` is not a button or link.

- [ ] **Step 2: Run the focused test and observe missing components**

```bash
pnpm --filter @nuitee-travel-starter/web test -- travel-zero-state.test.tsx
```

Expected: FAIL because the shell components do not exist.

- [ ] **Step 3: Define the trip projection and shell props**

```ts
export type TripPhase =
  | 'idle'
  | 'searching'
  | 'comparing'
  | 'selected'
  | 'verifying'
  | 'verified'
  | 'error';

export interface TripProjection {
  readonly phase: TripPhase;
  readonly origin?: string;
  readonly destination?: string;
  readonly departureDate?: string;
  readonly returnDate?: string;
  readonly travelers?: string;
}

export const EMPTY_TRIP: TripProjection = { phase: 'idle' };
```

`TravelAssistantPage` owns `mode`, `initialPrompt`, `launchError`, and the current projection. It renders the zero state until a valid first prompt starts a conversation.

- [ ] **Step 4: Implement the approved shell and interaction hierarchy**

Use semantic elements and the exact information architecture:

```tsx
<main className="workspace-shell" id="main-content" tabIndex={-1}>
  <TripContextRail
    projection={projection}
    onNewTrip={reset}
    onOpenSettings={() => setSettingsOpen(true)}
  />
  <section className="travel-canvas" aria-labelledby="travel-home-title">
    <RouteAssistantMark />
    <h1 id="travel-home-title">Where would you like to go?</h1>
    <p>Search, compare, select, and verify flights through conversation.</p>
    <TravelComposer onSubmit={startConversation} />
    <ul className="starter-prompts">
      {starterConfig.prompts.map((prompt) => (
        <li key={prompt}>
          <button type="button" onClick={() => startConversation(prompt)}>
            {prompt}
          </button>
        </li>
      ))}
    </ul>
  </section>
</main>
```

`TravelComposer` renders `<form aria-label="Start a trip">` and `<textarea aria-label="Ask about a flight">`, submits on Enter without Shift, and preserves a newline on Shift+Enter.

The route-orbit mark uses one circular route line and two endpoint dots. It is decorative, `aria-hidden`, rotates slowly only when motion is allowed, and uses no second ambient effect.

- [ ] **Step 5: Add precise Brightdesk-derived styling**

Declare semantic tokens from the root config through inline CSS variables in `layout.tsx`, then use them in `globals.css`:

```css
:root {
  --travel-canvas: #fbfbfb;
  --travel-surface: #eae8ec;
  --travel-signal: #cfe86a;
  --travel-boundary: #CBCDD5;
  --travel-muted: #737479;
  --travel-ink: #2c2c2e;
  --travel-rail-width: 17.5rem;
  --travel-gutter: 16px;
}

.workspace-shell {
  min-height: 100svh;
  overflow-x: hidden;
  padding: var(--travel-gutter);
  background: var(--travel-canvas);
}

.trip-context-rail {
  position: fixed;
  inset: var(--travel-gutter) auto var(--travel-gutter) var(--travel-gutter);
  width: var(--travel-rail-width);
  border: 1px solid var(--travel-boundary);
  border-radius: 22px;
  background: color-mix(in srgb, var(--travel-surface) 82%, transparent);
}

.travel-canvas {
  min-height: calc(100svh - (var(--travel-gutter) * 2));
  margin-left: calc(var(--travel-rail-width) + var(--travel-gutter));
  display: grid;
  place-items: center;
}
```

Use a calm system/Avenir-like sans stack for headings and body, and `ui-monospace` only for IATA codes, prices, and route metadata. Avoid gradients, dashboard cards, hover lift, and page-load cascades.

- [ ] **Step 6: Run focused tests and inspect the zero state**

```bash
pnpm --filter @nuitee-travel-starter/web test -- travel-zero-state.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
```

Expected: PASS. Start `pnpm --filter @nuitee-travel-starter/web dev` and inspect desktop plus 390px mobile before committing.

- [ ] **Step 7: Commit the chat-first shell**

```bash
git add apps/web/app apps/web/src/components apps/web/src/lib/trip-projection.ts apps/web/test/travel-zero-state.test.tsx
git commit -m "feat: build the chat-first travel shell"
```

---

### Task 5: Add delayed guest assistant initialization and conversation lifecycle

**Files:**
- Create: `apps/web/src/components/travel-conversation.tsx`
- Create: `apps/web/test/travel-conversation.test.tsx`
- Modify: `apps/web/src/components/travel-assistant-page.tsx`
- Modify: `apps/web/src/components/travel-composer.tsx`

**Interfaces:**
- Consumes: `ReadyPublicAssistantRuntime` and one initial prompt.
- Produces: `TravelConversation({ runtime, initialPrompt, onReset, onProjectionChange })` using the public headless client.

- [ ] **Step 1: Write failing lifecycle tests with a mocked hook**

```tsx
vi.mock('@noodleseed/assistant/react/client', () => ({
  useNoodleAssistant: vi.fn(),
}));

it('does not initialize the assistant before the first submit', () => {
  render(<TravelAssistantPage runtime={readyRuntime} />);
  expect(useNoodleAssistant).not.toHaveBeenCalled();
});

it('mounts the public client and sends the initial prompt once', async () => {
  mockAssistant({ messages: [], status: 'ready', error: undefined });
  render(<TravelAssistantPage runtime={readyRuntime} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Ask about a flight' }), {
    target: { value: 'JFK to Lisbon next month' },
  });
  fireEvent.submit(screen.getByRole('form', { name: 'Start a trip' }));
  await waitFor(() => expect(sendMessage).toHaveBeenCalledWith(
    'JFK to Lisbon next month',
  ));
  expect(sendMessage).toHaveBeenCalledTimes(1);
  expect(useNoodleAssistant).toHaveBeenCalledWith(expect.objectContaining({
    embedId: readyRuntime.embedId,
    serviceUrl: readyRuntime.serviceUrl,
  }));
});
```

Add a rerender under `StrictMode` and assert the first message still sends once. Add a reset test asserting `abort`, `resetSession`, transcript unmount, and rail reset.

- [ ] **Step 2: Run the lifecycle test and observe the missing conversation**

```bash
pnpm --filter @nuitee-travel-starter/web test -- travel-conversation.test.tsx
```

Expected: FAIL because the conversation component and hook integration do not exist.

- [ ] **Step 3: Implement the public hook boundary**

```tsx
const [principalKey] = useState(() => crypto.randomUUID());
const { client, messages, status, error } = useNoodleAssistant({
  embedId: runtime.embedId,
  serviceUrl: runtime.serviceUrl,
  principalKey,
  clientContext: () => ({
    locale: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }),
});
```

The principal key stays inside the mounted conversation. Do not store it or send it as context.

- [ ] **Step 4: Send the initial prompt safely under Strict Mode**

```tsx
useEffect(() => {
  let active = true;
  queueMicrotask(() => {
    if (active) {
      void client.sendMessage(initialPrompt).catch(() => undefined);
    }
  });
  return () => {
    active = false;
  };
}, [client, initialPrompt]);
```

Every subsequent `sendMessage`, `respond`, and `abort` call must be awaited or explicitly caught. Clear the composer draft only after capturing a non-empty message.

- [ ] **Step 5: Fail closed on missing embed configuration**

When the first submit occurs with `runtime.status === 'setup-required'`, keep the zero state visible and show the runtime message in `role="alert"`. Do not mount the hook, fabricate a response, or repeatedly retry.

- [ ] **Step 6: Run focused tests and typecheck**

```bash
pnpm --filter @nuitee-travel-starter/web test -- travel-conversation.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
```

Expected: PASS with one initial turn and no pre-submit initialization.

- [ ] **Step 7: Commit the guest lifecycle**

```bash
git add apps/web/src/components apps/web/test/travel-conversation.test.tsx
git commit -m "feat: start guest conversations on first submit"
```

---

### Task 6: Render typed assistant messages and MCP App views safely

**Files:**
- Create: `apps/web/src/components/travel-message.tsx`
- Create: `apps/web/src/components/travel-markdown.tsx`
- Create: `apps/web/src/components/travel-view-registry.tsx`
- Create: `apps/web/test/travel-message.test.tsx`
- Modify: `apps/web/src/components/travel-conversation.tsx`

**Interfaces:**
- Consumes: `AssistantUIMessage`, `AssistantClient`, and typed `UIMessage.parts`.
- Produces: `TravelMessage`, `TravelMarkdown`, `TravelViewRegistry`, and explicit handlers for text, views, confirmations, input requests, hidden tool results, and unsupported parts.

- [ ] **Step 1: Write failing typed-part renderer tests**

```tsx
it('renders text and a linked MCP App without printing tool JSON', () => {
  render(<TravelMessage
    client={client}
    message={{
      id: 'assistant-1',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'I found current options.' },
        {
          type: 'data-tool-result',
          data: { id: 'call-1', tool: 'search_flights', result: {
            status: 'success', searchContext: { origin: 'JFK' },
          } },
        },
        {
          type: 'data-view',
          data: {
            id: 'view-1',
            tool: 'search_flights',
            resourceUri: 'ui://nuitee_travel/flight-results',
            title: 'Flight results',
            result: { status: 'success' },
          },
        },
      ],
    }}
  />);
  expect(screen.getByText('I found current options.')).toBeVisible();
  expect(screen.getByTestId('noodle-app-view')).toBeVisible();
  expect(screen.queryByText(/searchContext/)).not.toBeInTheDocument();
});
```

Add tests for safe HTTPS/internal links, rejected `javascript:` links, confirmation accept/decline, input-request cancel, and the unsupported-part fallback.

- [ ] **Step 2: Run the message test and observe missing renderers**

```bash
pnpm --filter @nuitee-travel-starter/web test -- travel-message.test.tsx
```

Expected: FAIL because the typed renderers do not exist.

- [ ] **Step 3: Implement safe Markdown links**

```ts
export function safeMessageHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}
```

Render Markdown with `react-markdown` and `remark-gfm`; do not enable raw HTML. External links receive `target="_blank"` and `rel="noreferrer noopener"`.

- [ ] **Step 4: Implement the App view boundary**

```tsx
export function TravelViewRegistry({ client, view, theme }: Props) {
  if (view.tool !== 'open_travel_starter'
    && view.tool !== 'search_flights') {
    return <p role="status">This travel view is unavailable.</p>;
  }
  return (
    <NoodleAppView
      client={client}
      view={view}
      theme={theme}
    />
  );
}
```

Key each view by `${view.id}:${view.resourceUri}`. Do not fetch the URI, use `srcdoc`, access `part.data.html`, or deduplicate different call IDs.

- [ ] **Step 5: Implement explicit interaction branches**

For `data-confirmation`, render title, description, non-sensitive arguments, `Confirm`, and `Don't proceed`; call `client.respond(id, { action: 'accept' })` or `decline`. For `data-input-request`, state that the current template cannot collect the requested form and provide a `Cancel request` action that sends `{ action: 'cancel' }`. This is the fail-closed path because the current travel surface defines no elicitation workflow.

- [ ] **Step 6: Render the transcript from typed messages**

Map every message by `message.id`, give user and assistant messages distinct semantic classes, and include a visible fallback:

```tsx
return (
  <article className={`travel-message travel-message--${message.role}`}>
    {message.parts.map((part, index) => (
      <TravelMessagePart
        client={client}
        key={`${message.id}:${index}`}
        part={part}
        theme={theme}
      />
    ))}
  </article>
);
```

- [ ] **Step 7: Run tests and commit the safe renderer**

```bash
pnpm --filter @nuitee-travel-starter/web test -- travel-message.test.tsx travel-conversation.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
git add apps/web/src/components apps/web/test
git commit -m "feat: render assistant messages and travel app views"
```

---

### Task 7: Project trip context and plain-language activity

**Files:**
- Modify: `apps/web/src/lib/trip-projection.ts`
- Create: `apps/web/src/lib/travel-progress.ts`
- Create: `apps/web/test/trip-projection.test.ts`
- Create: `apps/web/test/travel-progress.test.ts`
- Modify: `apps/web/src/components/travel-conversation.tsx`
- Modify: `apps/web/src/components/trip-context-rail.tsx`

**Interfaces:**
- Consumes: detached `AssistantUIMessage[]` and raw `AssistantClientEvent` values.
- Produces: `ToolActivity`, `projectTrip(messages, transientPhase)`, `progressForEvent(event)`, and safe rail/status updates.

- [ ] **Step 1: Write failing projection tests**

```ts
it('projects only validated search result fields', () => {
  expect(projectTrip([messageWithToolResult('search_flights', {
    status: 'success',
    searchContext: {
      origin: 'JFK',
      destination: 'LIS',
      departureDate: '2026-10-12',
      returnDate: '2026-10-18',
      adults: 2,
      children: 0,
      infants: 0,
    },
  })])).toEqual({
    phase: 'comparing',
    origin: 'JFK',
    destination: 'LIS',
    departureDate: '2026-10-12',
    returnDate: '2026-10-18',
    travelers: '2 adults',
  });
});

it('does not parse route claims from assistant prose', () => {
  expect(projectTrip([{
    id: 'assistant-1',
    role: 'assistant',
    parts: [{ type: 'text', text: 'JFK to LIS for 9 adults' }],
  }])).toEqual(EMPTY_TRIP);
});
```

Add tests for verification success, selection success, malformed IATA/date/count fields, partial search, and error phase retaining the last valid structured context.

- [ ] **Step 2: Write the failing progress mapping test**

```ts
it.each([
  ['open_travel_starter', 'Opening the travel assistant'],
  ['search_flights', 'Searching current flights'],
  ['select_flight_offer', 'Saving your fare choice'],
  ['verify_flight_offer', 'Verifying the current fare'],
  ['internal_future_tool', 'Working on your request'],
])('maps %s without exposing an identifier', (tool, copy) => {
  expect(progressForEvent({
    event: 'tool_started',
    data: { id: 'call-1', tool },
  } as AssistantClientEvent)).toMatchObject({ label: copy });
});
```

- [ ] **Step 3: Run both focused test files and observe failures**

```bash
pnpm --filter @nuitee-travel-starter/web test -- trip-projection.test.ts travel-progress.test.ts
```

Expected: FAIL because the projection and mapper are not implemented.

- [ ] **Step 4: Implement bounded structural guards**

Use small `isRecord`, `stringField`, `integerField`, IATA, and ISO-date guards. Accept only the exact current result fields and bounds. Build traveler copy from validated adults, children, and infants. Ignore `selectionId`, `searchId`, unknown keys, and every text part.

The reducer processes messages in order so a later valid search replaces earlier trip context and a later successful verify sets `phase: 'verified'` without erasing the route.

Define the activity contract explicitly:

```ts
export interface ToolActivity {
  readonly label: string;
  readonly phase?: TripPhase;
}
```

`progressForEvent` returns `{ label, phase }` for the four known tools, `{ label: 'Working on your request' }` for an unknown tool, and `null` for unrelated events.

- [ ] **Step 5: Subscribe to raw activity without turning it into state authority**

```tsx
useEffect(() => client.subscribe((event) => {
  const progress = progressForEvent(event);
  if (progress) setActivity(progress);
  if (event.event === 'error') setActivity(null);
}), [client]);
```

Render `activity?.label` in one stable `role="status"` and `aria-live="polite"` region. Pass `projectTrip(messages, activity?.phase)` to the parent through `onProjectionChange`; do not publish activity as model context.

- [ ] **Step 6: Run tests, typecheck, and commit**

```bash
pnpm --filter @nuitee-travel-starter/web test -- trip-projection.test.ts travel-progress.test.ts travel-conversation.test.tsx
pnpm --filter @nuitee-travel-starter/web typecheck
git add apps/web/src apps/web/test
git commit -m "feat: project validated trip context and activity"
```

---

### Task 8: Add transcript scrolling, error presentation, responsive polish, and browser checks

**Files:**
- Create: `apps/web/src/lib/conversation-scroll.ts`
- Create: `apps/web/src/lib/assistant-error.ts`
- Create: `apps/web/test/conversation-scroll.test.ts`
- Create: `apps/web/test/assistant-error.test.ts`
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/test/browser/travel-shell.spec.ts`
- Modify: `apps/web/src/components/travel-conversation.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: transcript viewport metrics, client errors, responsive viewport state, and reduced-motion preferences.
- Produces: `isNearTranscriptEnd`, `presentAssistantError`, stable follow-latest behavior, safe error actions, and desktop/mobile browser evidence.

- [ ] **Step 1: Write failing scroll and error tests**

```ts
it('follows only when the reader is within thirty pixels of the end', () => {
  expect(isNearTranscriptEnd({
    scrollHeight: 1000,
    scrollTop: 870,
    clientHeight: 100,
  })).toBe(true);
  expect(isNearTranscriptEnd({
    scrollHeight: 1000,
    scrollTop: 600,
    clientHeight: 100,
  })).toBe(false);
});

it('does not offer retry for a public budget refusal', () => {
  expect(presentAssistantError({
    name: 'AssistantClientError',
    message: 'budget exhausted',
    detail: { code: 'session_exchange_failed', status: 429, retryable: false },
  })).toMatchObject({
    title: 'The travel assistant is unavailable right now',
    canRetry: false,
  });
});
```

Cover retryable 5xx, expired session, generic terminal failure, and setup-required separately.

- [ ] **Step 2: Run the focused tests and observe missing helpers**

```bash
pnpm --filter @nuitee-travel-starter/web test -- conversation-scroll.test.ts assistant-error.test.ts
```

Expected: FAIL because the helpers do not exist.

- [ ] **Step 3: Implement scroll ownership**

```ts
export function isNearTranscriptEnd(metrics: {
  readonly scrollHeight: number;
  readonly scrollTop: number;
  readonly clientHeight: number;
}, threshold = 30): boolean {
  return metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight
    <= threshold;
}
```

In `TravelConversation`, track whether the reader is near the end on `scroll`, use `ResizeObserver` to follow growth only when that flag is true, and scroll to the end immediately before sending a follow-up. Disconnect the observer on unmount.

- [ ] **Step 4: Implement safe error presentation**

Return a closed presentation union:

```ts
export interface AssistantErrorPresentation {
  readonly title: string;
  readonly message: string;
  readonly canRetry: boolean;
}
```

Map known structured detail to setup, budget, expired-session, retryable-service, and terminal copy. Never include service response bodies, URLs, tool names, tokens, or raw error stacks.

- [ ] **Step 5: Finish responsive and reduced-motion CSS**

Add these concrete breakpoints:

```css
@media (max-width: 62rem) and (min-width: 701px) {
  :root { --travel-rail-width: 4.5rem; --travel-gutter: 12px; }
  .trip-context-rail__label,
  .trip-context-rail__details { display: none; }
}

@media (max-width: 700px) {
  .workspace-shell { padding: 0; }
  .trip-context-rail { position: sticky; inset: 0; width: auto; border-radius: 0; }
  .travel-canvas { min-height: calc(100svh - 64px); margin-left: 0; padding: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .route-assistant-mark,
  .assistant-skeleton { animation: none; transition: none; }
}
```

Keep all real controls at least 44px, add visible `:focus-visible`, ensure 200% zoom does not clip the composer, and prevent horizontal overflow.

- [ ] **Step 6: Add zero-state browser tests**

Configure Playwright to start `pnpm --filter @nuitee-travel-starter/web dev`. Test desktop and 390px mobile with no embed ID:

```ts
test('renders the guest shell without opening an assistant session', async ({ page }) => {
  const assistantRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/v1/assistant/')) {
      assistantRequests.push(request.url());
    }
  });
  await page.goto('/');
  await expect(page.getByRole('heading', {
    name: 'Where would you like to go?',
  })).toBeVisible();
  expect(assistantRequests).toEqual([]);
});
```

At 390px assert `document.documentElement.scrollWidth === window.innerWidth`, visible focus after keyboard navigation, and no animation under reduced motion.

- [ ] **Step 7: Run focused, browser, type, and build gates**

```bash
pnpm --filter @nuitee-travel-starter/web test
pnpm --filter @nuitee-travel-starter/web test:browser
pnpm --filter @nuitee-travel-starter/web typecheck
pnpm --filter @nuitee-travel-starter/web build
```

Expected: PASS at desktop and 390px without assistant credentials.

- [ ] **Step 8: Commit the polished experience**

```bash
git add apps/web
git commit -m "feat: polish travel conversation states and responsiveness"
```

---

### Task 9: Add the developer route, OAuth guide, and primary repository documentation

**Files:**
- Create: `apps/web/app/developers/page.tsx`
- Create: `apps/web/test/developer-page.test.tsx`
- Create: `docs/oauth.md`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/customization.md`
- Modify: `docs/EMBEDDED_ASSISTANT.md`
- Modify: `PUBLIC_RELEASE_CHECKLIST.md`
- Modify: `test/repository-readiness.test.ts`

**Interfaces:**
- Consumes: the built guest application, exact runtime boundaries, and installed assistant SDK API.
- Produces: a real `/developers` destination, a copyable authenticated-extension guide, and documentation that makes Next.js the primary path.

- [ ] **Step 1: Write failing repository and developer-page tests**

```ts
it('makes the Next.js guest website the primary README path', async () => {
  const readme = await repositoryFile('README.md');
  expect(readme.indexOf('pnpm dev:web')).toBeLessThan(
    readme.indexOf('External MCP hosts'),
  );
  expect(readme).toContain('Search → Select → Verify');
  expect(readme).toContain('does not book');
});

it('documents OAuth without claiming that login consumption is an OIDC issuer', async () => {
  const oauth = await repositoryFile('docs/oauth.md');
  expect(oauth).toContain('Website login');
  expect(oauth).toContain('createAssistantSession');
  expect(oauth).toContain('customerAuth.oidc');
  expect(oauth).toContain('does not make your website an OIDC authorization server');
});
```

The developer page test asserts `Guest-first setup`, `Optional OAuth`, `NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID`, and the no-booking boundary.

- [ ] **Step 2: Run tests and observe missing docs/page**

```bash
pnpm exec vitest run test/repository-readiness.test.ts
pnpm --filter @nuitee-travel-starter/web test -- developer-page.test.tsx
```

Expected: FAIL because the new primary flow and OAuth guide do not exist.

- [ ] **Step 3: Build the real developer route**

Render concise, copyable setup in this order:

1. install dependencies;
2. start the website with `pnpm dev:web`;
3. validate the MCP with `pnpm agent:check`;
4. add a real public embed ID after an assistant-enabled deployment;
5. verify Search → Select → Verify;
6. follow `docs/oauth.md` only when adding an identity-bound capability.

The page uses the same shell tokens and includes real support/privacy links only when configured. It does not render a disabled login button.

- [ ] **Step 4: Write the OAuth extension guide with exact boundaries**

Include the authenticated route core:

```ts
import { createAssistantSession } from '@noodleseed/assistant/server';

export async function POST(request: Request) {
  const user = await requireCurrentUser(request);
  if (request.headers.get('origin') !== process.env.PUBLIC_APP_ORIGIN) {
    return Response.json({ error: 'Origin is not allowed.' }, { status: 403 });
  }
  const session = await createAssistantSession({
    serviceUrl: process.env.NOODLE_SERVICE_URL!,
    clientId: process.env.NOODLE_ASSISTANT_CLIENT_ID!,
    clientSecret: process.env.NOODLE_ASSISTANT_CLIENT_SECRET!,
    origin: process.env.PUBLIC_APP_ORIGIN!,
    user: { id: user.id, email: user.email, roles: user.roles },
  });
  return Response.json(session);
}
```

State that the snippet replaces `embedId` with `sessionEndpoint`, requires the developer's real `requireCurrentUser`, and must forward the response unchanged. Explain mixed sign-in tickets separately. Explain that direct MCP customer access needs a compliant issuer, discovery, JWKS, audience, authorization-code plus PKCE, and client registration.

- [ ] **Step 5: Rewrite repository entry documentation**

Lead the README with the website, then external MCP hosts. Update architecture and customization diagrams to show browser → public assistant → shared MCP → Nuitee. Rewrite `docs/EMBEDDED_ASSISTANT.md` around guest access and point authenticated readers to `docs/oauth.md`. Add the hosted public embed, privacy link, CSP, budget, and TTL smoke gates to `PUBLIC_RELEASE_CHECKLIST.md`.

Keep `examples/embedded-assistant-host` documented as a temporary authenticated migration reference; do not present it as the primary app.

- [ ] **Step 6: Run documentation and package tests**

```bash
pnpm exec vitest run test/repository-readiness.test.ts
pnpm --filter @nuitee-travel-starter/web test -- developer-page.test.tsx
pnpm customize:check
git diff --check
```

Expected: PASS with no illustrative production origins or private tracker references.

- [ ] **Step 7: Commit the developer experience**

```bash
git add apps/web/app/developers apps/web/test/developer-page.test.tsx docs README.md PUBLIC_RELEASE_CHECKLIST.md test/repository-readiness.test.ts
git commit -m "docs: make the guest Next.js app the primary path"
```

---

### Task 10: Integrate root gates and prove the local replacement boundary

**Files:**
- Modify: `package.json`
- Modify: `test/repository-readiness.test.ts`
- Modify: `.env.example`
- Modify: `apps/web/.env.example`
- Modify: `PUBLIC_RELEASE_CHECKLIST.md`

**Interfaces:**
- Consumes: every prior task's package scripts and tests.
- Produces: root `dev:web`, `build:web`, `test:web`, `check:web`, and a strengthened `ci:offline` gate; a clean local verification record that explicitly leaves hosted promotion unproven.

- [ ] **Step 1: Write the failing root-script contract**

```ts
it('runs the primary website in the offline repository gate', async () => {
  const rootPackage = await repositoryJson('package.json');
  expect(rootPackage.scripts['dev:web']).toBe(
    'pnpm --filter @nuitee-travel-starter/web dev',
  );
  expect(rootPackage.scripts['check:web']).toContain(
    '@nuitee-travel-starter/web typecheck',
  );
  expect(rootPackage.scripts['check:web']).toContain(
    '@nuitee-travel-starter/web test',
  );
  expect(rootPackage.scripts['check:web']).toContain(
    '@nuitee-travel-starter/web build',
  );
  expect(rootPackage.scripts['ci:offline']).toContain('pnpm check:web');
});
```

Also assert the root `.env.example` does not contain assistant client credentials and `apps/web/.env.example` contains only the two public variables.

- [ ] **Step 2: Run the repository contract and observe missing scripts**

```bash
pnpm exec vitest run test/repository-readiness.test.ts
```

Expected: FAIL because the root website scripts are absent.

- [ ] **Step 3: Add root website scripts**

```json
{
  "dev:web": "pnpm --filter @nuitee-travel-starter/web dev",
  "build:web": "pnpm --filter @nuitee-travel-starter/web build",
  "test:web": "pnpm --filter @nuitee-travel-starter/web test",
  "check:web": "pnpm --filter @nuitee-travel-starter/web typecheck && pnpm --filter @nuitee-travel-starter/web test && pnpm --filter @nuitee-travel-starter/web test:browser && pnpm --filter @nuitee-travel-starter/web build"
}
```

Append `pnpm check:web` to `ci:offline`. Retain `pnpm check:embedded-host` because the spec forbids deleting the authenticated Vite reference before hosted Next.js parity.

- [ ] **Step 4: Run the full local repository gate**

Run each command and preserve the JSON envelope for Noodle commands:

```bash
pnpm agent:doctor
pnpm customize:check
pnpm audit:history
pnpm audit:licenses
pnpm test
pnpm agent:check
pnpm agent:check:live
pnpm agent:check:assistant
pnpm check:embedded-host
pnpm check:web
git diff --check
```

Expected: every command exits zero. If a Noodle command returns `{ ok: false }`, repair only the paths named in `error.errors[]`, then rerun that exact command.

- [ ] **Step 5: Run the non-mutating public-host preflight at the known local boundary**

Use the discovered CLI contract:

```bash
node_modules/.bin/noodle assistant embed --check --dir apps/web --surface public --json
```

With no real embed ID configured, the accepted local outcome is a structured missing-environment report naming `NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID`; it must not reveal values or report a client-secret requirement. A green hosted preflight is deliberately outside this plan.

- [ ] **Step 6: Record the honest handoff state**

Update `PUBLIC_RELEASE_CHECKLIST.md` so the completed local gates are distinct from these still-required hosted gates:

- real public embed ID;
- exact HTTPS origin and privacy URL;
- hosted anonymous Search → Select → Verify;
- write → expire → fresh write → verify on one unrestarted server;
- budget visibility and tested zero-budget kill switch;
- authenticated Vite host deletion after parity.

Do not claim public readiness, deployment, adoption, booking completion, or provider availability.

- [ ] **Step 7: Commit the integrated local build**

```bash
git add package.json .env.example apps/web/.env.example PUBLIC_RELEASE_CHECKLIST.md test/repository-readiness.test.ts
git commit -m "test: gate the primary Next.js travel template"
```

- [ ] **Step 8: Request code review before hosted promotion**

Run the `superpowers:requesting-code-review` workflow against the complete branch. Address validated findings with the `superpowers:receiving-code-review` workflow and rerun the full local gate. Stop with the authenticated Vite reference still present until a later user-authorized hosted promotion proves the deletion gate.

---

## Deliberately separate follow-up

Hosted deployment, real-browser provider verification, the 30-minute write → expire → fresh write smoke, budget mutation, and deletion of `examples/embedded-assistant-host/` are one production-promotion subsystem. They require exact target authority and external state that this implementation plan does not have. After the local branch passes Task 10, create a separate promotion plan bound to the operator-supplied org/app/env, website origin, privacy URL, and authorized test inventory.
