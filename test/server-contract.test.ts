import { describe, expect, it } from 'vitest';
import { execFile as execFileCallback } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import embeddedApp from '../src/embedded-server.js';
import {
  flightPlanDatesSchema,
  flightPlanInputSchema,
} from '../src/flight-schemas.js';
import liveApp from '../src/live-server.js';
import offlineApp from '../src/server.js';
import { starterConfig } from '../src/starter-config.js';
import * as travelServer from '../src/travel-server.js';

const expectedTools = [
  'open_travel_starter',
  'plan_flight_search',
  'search_flights',
  'verify_flight_offer',
];
const expectedAllTools = [...expectedTools, 'select_flight_offer'];
const forbiddenFragments = [
  'book',
  'prebook',
  'payment',
  'passenger',
  'cancel',
  'refund',
  'redeem',
  'hotel',
  'car_rental',
  'loyalty',
  'http_request',
];
const execFile = promisify(execFileCallback);
const noodleCli = fileURLToPath(new URL('../node_modules/.bin/noodle', import.meta.url));

describe('server contract', () => {
  it('exposes exactly the four working model tools and no unfinished domain tools', async () => {
    const manifest = await offlineApp.toManifest() as { tools: Array<{ name: string; visibility?: string[] }> };
    const visible = manifest.tools
      .filter((tool) => !tool.visibility || tool.visibility.includes('model'))
      .map((tool) => tool.name);
    expect(visible).toEqual(expectedTools);
    for (const fragment of forbiddenFragments) expect(visible.join('|')).not.toContain(fragment);
  });

  it('keeps active-fare selection as an app-only helper and makes repeat verification explicit', async () => {
    const manifest = await liveApp.toManifest() as any;
    const select = manifest.tools.find((entry: any) => entry.name === 'select_flight_offer');
    const verify = manifest.tools.find((entry: any) => entry.name === 'verify_flight_offer');

    expect(manifest.tools.map((entry: any) => entry.name)).toEqual(expectedAllTools);
    expect(select).toMatchObject({
      visibility: ['app'],
      annotations: { readOnlyHint: true },
    });
    expect(JSON.stringify(select?.inputSchema)).toContain('selectionId');
    expect(verify?.description).toContain('verify again');
    expect(verify?.inputSchema.properties.selectionMode.default).toBe('active');
  });

  it('links only TravelHome and FlightResults widgets', async () => {
    const manifest = await offlineApp.toManifest();
    const wire = JSON.stringify(manifest);
    expect(wire).toContain('travel-home');
    expect(wire).toContain('flight-results');
    expect(wire).not.toContain('preferences-card');
  });

  it('does not claim a widget origin until the deployment owner configures a real one', async () => {
    const manifest = await offlineApp.toManifest();
    const wire = JSON.stringify(manifest);
    expect(wire).not.toContain('cedar-cloud.example');
    expect(wire).not.toContain('your-app.example.com');
  });

  it('applies one configured widget domain consistently to every widget policy', () => {
    const policy = (travelServer as any).widgetDomainPolicy;
    expect(policy).toBeTypeOf('function');
    expect(policy(null)).toEqual({});
    expect(policy('https://widgets.travel.example.co')).toEqual({
      domain: 'https://widgets.travel.example.co',
    });
  });

  it('allows airline images only from the documented Nuitee Flights asset origins', async () => {
    const manifest = await liveApp.toManifest() as any;
    const wire = JSON.stringify(manifest);
    expect(wire).toContain('https://sandbox.nuitee.flights');
    expect(wire).toContain('https://production.nuitee.flights');
    expect(wire).not.toContain('images.example');
  });

  it('keeps Nuitee authority out of model input and in the live connector policy', async () => {
    const manifest = await liveApp.toManifest() as { tools: Array<Record<string, unknown>> };
    const catalog = liveApp.toConnectorCatalog();
    expect(catalog?.connectors).toHaveLength(2);
    const http = catalog?.connectors.find((connector) => connector.id === 'nuitee_flights_http');
    const gateway = catalog?.connectors.find((connector) => connector.id === 'nuitee_flights_gateway');
    expect(http).toMatchObject({
      http: {
        baseUrl: 'https://api.liteapi.travel/v3.0',
        allowedOrigins: ['https://api.liteapi.travel'],
        auth: { kind: 'apiKey', header: 'X-API-Key', secret: 'NUITEE_API_KEY' },
      },
      operations: {
        search: {
          method: 'POST',
          path: '/flights/rates',
          limits: { maxResponseBytes: 6 * 1024 * 1024 },
        },
        verify: { method: 'POST', path: '/flights/verify' },
      },
    });
    expect(Object.keys(http?.operations ?? {})).toEqual(['search', 'verify']);
    expect((http?.operations as Record<string, any> | undefined)?.verify?.limits?.maxResponseBytes).toBeUndefined();
    expect(gateway).toMatchObject({
      operations: {
        execute: {
          limits: { timeoutMs: 12_000, maxHostCalls: 1 },
          calls: {
            search: 'nuitee_flights_http.search',
            verify: 'nuitee_flights_http.verify',
          },
        },
      },
    });
    const searchTool = manifest.tools.find((tool) => tool.name === 'search_flights');
    const input = JSON.stringify(searchTool?.inputSchema ?? searchTool?.input ?? {});
    for (const field of ['url', 'baseUrl', 'headers', 'method', 'path']) {
      expect(input).not.toContain(`\"${field}\"`);
    }
  });

  it('declares caller-scoped expiring selection state and portable home context', async () => {
    const manifest = await liveApp.toManifest() as any;
    expect(manifest.state.handles.flight_selections).toMatchObject({
      kind: 'selection',
      scope: 'caller',
      version: 'v2',
      ttlSeconds: 1_800,
    });
    expect(manifest.state.handles.flight_selections.schema.properties).toHaveProperty('activeSelectionId');
    expect(manifest.tools.find((tool: any) => tool.name === 'open_travel_starter')?.contextProvider).toBe(true);
  });

  it('accepts natural place names conversationally while keeping resolved IATA codes at the tool boundary', async () => {
    const manifest = await liveApp.toManifest() as any;
    const search = manifest.tools.find((entry: any) => entry.name === 'search_flights');
    expect(search.description).toContain('city or airport names');
    expect(search.description).toContain('ambiguous');
    expect(search.description).toContain('relative dates');
    expect(search.description).toContain('next week');
    expect(search.inputSchema.properties.origin.description).toContain('Resolved');
    expect(search.inputSchema.properties.destination.description).toContain('Resolved');
  });

  it('collects only missing dates before search and publishes a typed trip plan', async () => {
    const manifest = await liveApp.toManifest() as any;
    const plan = manifest.tools.find((entry: any) => entry.name === 'plan_flight_search');
    const search = manifest.tools.find((entry: any) => entry.name === 'search_flights');

    expect(plan.inputSchema.required).toEqual(['origin', 'destination']);
    expect(plan.inputSchema.properties).toEqual(expect.objectContaining({
      origin: expect.objectContaining({ type: 'string' }),
      destination: expect.objectContaining({ type: 'string' }),
      currency: expect.objectContaining({ type: 'string', default: 'USD' }),
      country: expect.objectContaining({ type: 'string', default: 'US' }),
    }));
    expect(flightPlanInputSchema.parse({
      origin: 'ISB',
      destination: 'FCO',
      currency: 'PKR',
      country: 'PK',
    })).toEqual({
      origin: 'ISB',
      destination: 'FCO',
      currency: 'PKR',
      country: 'PK',
    });

    const planWire = JSON.stringify(plan);
    expect(planWire).toContain('choose_travel_dates');
    expect(plan.description).toContain('no usable exact or relative departure date');
    expect(planWire).toContain('When would you like to travel?');
    expect(planWire).toContain('departureDate');
    expect(planWire).toContain('returnDate');
    expect(planWire).not.toContain('point-of-sale');
    expect(planWire).not.toContain('NUITEE_API_KEY');

    expect(search.inputSchema.properties.currency.default).toBe('USD');
    expect(search.inputSchema.properties.country.default).toBe('US');
    expect(search.inputSchema.properties.adults.default).toBe(1);
    expect(search.inputSchema.properties.adults.description).toContain('generic passenger');
    expect(search.inputSchema.properties.adults.description).toContain('adults');
    expect(search.inputSchema.properties.cabinClass.default).toBe('ECONOMY');
  });

  it('rejects lower-case airport codes through the registered flight-plan tool', async () => {
    const error = await execFile(noodleCli, [
      'tools',
      'call',
      'plan_flight_search',
      'src/server.ts',
      '--args',
      JSON.stringify({ origin: 'isb', destination: 'NYC' }),
      '--json',
    ]).then(
      () => undefined,
      (failure) => failure,
    );

    expect(error).toBeDefined();
    const response = JSON.parse(String((error as { stdout?: string }).stdout));
    expect(response).toMatchObject({
      ok: false,
      error: {
        code: 'mcp_error',
        detail: {
          data: {
            reason: 'invalid_tool_arguments',
            validation: [expect.objectContaining({ path: 'origin' })],
          },
        },
      },
    });
  });

  it('rejects an impossible calendar date from the flight-plan elicitation form', () => {
    expect(flightPlanDatesSchema.safeParse({
      departureDate: '2026-02-31',
    }).success).toBe(false);
  });

  it('guides the assistant to make one progressive decision instead of interrogating', async () => {
    const manifest = await embeddedApp.toManifest() as any;
    const guide = manifest.server.agentGuide;

    expect(guide.description).toContain('conversation-first flight discovery');
    expect(guide.workflows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'plan_and_search_flights',
        steps: [
          expect.objectContaining({ capability: { kind: 'tool', name: 'plan_flight_search' } }),
          expect.objectContaining({ capability: { kind: 'tool', name: 'search_flights' } }),
        ],
      }),
      expect.objectContaining({
        id: 'search_flights_with_dates',
        steps: [
          expect.objectContaining({ capability: { kind: 'tool', name: 'search_flights' } }),
        ],
      }),
    ]));
    expect(guide.examples).toContainEqual(expect.objectContaining({
      prompt: 'Show me flights from ISB to NYC on 2026-09-18.',
      workflow: 'search_flights_with_dates',
    }));
    expect(guide.examples).toContainEqual(expect.objectContaining({
      prompt: 'Show me flights from Toronto to Lisbon next week for two passengers.',
      workflow: 'search_flights_with_dates',
    }));
    const guideWire = JSON.stringify(guide);
    expect(guideWire).toContain('one focused question');
    expect(guideWire).toContain('one adult');
    expect(guideWire).toContain('Economy');
    expect(guideWire).toContain('actual airport code');
    expect(guideWire).toContain('YYZ for Toronto');
    expect(guideWire).toContain('not YTO');
    expect(guideWire).toContain('untrusted page');
    expect(guideWire).toContain('explicit traveler');
    expect(guideWire).toContain('omitted');
    expect(guideWire).toContain('same local weekday seven days later');
    expect(guideWire).toContain('generic passenger count as adults');
    expect(guideWire).toContain('search immediately');
    expect(guideWire).toContain('state the assumptions');
    expect(guideWire).toContain('one-way');
    expect(guideWire).toContain('USD');
    expect(guideWire).toContain('US pricing market');
    expect(guideWire).toContain('Do not repeat the same search call');
    expect(guideWire).toContain('non-retryable');
    expect(guideWire).not.toContain('ask for currency');
    expect(guideWire).not.toContain('confirm before searching');
  });

  it('keeps the credential-free server free of required managed secrets', async () => {
    const manifest = await offlineApp.toManifest() as { connectors?: unknown; server?: Record<string, unknown> };
    const wire = JSON.stringify(manifest);
    expect(manifest.connectors).toBeUndefined();
    expect(wire).not.toContain('ASSISTANT_MODEL_API_KEY');
    expect(wire).not.toContain('sentinel-nuitee-secret');
  });

  it('keeps embedding optional while reusing the same travel tools', async () => {
    const manifest = await embeddedApp.toManifest() as {
      server: {
        assistant: {
          surfaces: Array<{
            mode: string;
            origins: string[];
            capabilities: Array<{ kind: string; name: string }>;
          }>;
          layout: { mode: string };
        };
      };
      tools: Array<{ name: string; visibility?: string[] }>;
    };
    const liveManifest = await liveApp.toManifest() as { tools: Array<{ name: string }> };
    expect(manifest.tools.map((tool) => tool.name)).toEqual(liveManifest.tools.map((tool) => tool.name));
    expect(manifest.tools.map((tool) => tool.name)).toEqual(expectedAllTools);
    const wire = JSON.stringify(manifest);
    expect(wire).toContain('ASSISTANT_MODEL_BASE_URL');
    expect(wire).toContain('ASSISTANT_MODEL');
    expect(wire).toContain('ASSISTANT_MODEL_API_KEY');
    expect(wire).toContain('"transport":"responses"');
    expect(manifest.server.assistant.surfaces[0]?.origins).toEqual([
      'http://localhost:3000',
      'http://localhost:3001',
      'https://wayfare-experience.fly.dev',
    ]);
    for (const origin of starterConfig.embeddedAssistant.origins) expect(wire).toContain(origin);
    expect(wire).not.toContain('https://app.example.com');
    expect(manifest.server.assistant.surfaces).toEqual([
      {
        mode: 'public',
        origins: [...starterConfig.embeddedAssistant.origins],
        capabilities: [
          { kind: 'tool', name: 'open_travel_starter' },
          { kind: 'tool', name: 'plan_flight_search' },
          { kind: 'tool', name: 'search_flights' },
          { kind: 'tool', name: 'verify_flight_offer' },
          { kind: 'tool', name: 'select_flight_offer' },
        ],
      },
    ]);
    expect(manifest.server.assistant.layout).toEqual({ mode: 'inline' });
    expect(manifest.tools.find((tool) => tool.name === 'select_flight_offer'))
      .toMatchObject({ visibility: ['app'], annotations: { readOnlyHint: true } });
    for (const name of expectedAllTools) {
      expect(manifest.tools.filter((tool) => tool.name === name)).toHaveLength(1);
    }
  });

  it('keeps the companion website free of assistant-specific business tools', async () => {
    const files = ['App.tsx', 'AssistantMount.tsx', 'auth.ts', 'main.tsx', 'server.ts'];
    const source = (await Promise.all(files.map((file) => readFile(
      new URL(`../examples/embedded-assistant-host/src/${file}`, import.meta.url),
      'utf8',
    )))).join('\n');
    expect(source).not.toMatch(/\btool\s*\(/);
    expect(source).not.toContain('createTravelServer');
    expect(source).not.toContain('search_flights');
    expect(source).not.toContain('verify_flight_offer');
  });
});
