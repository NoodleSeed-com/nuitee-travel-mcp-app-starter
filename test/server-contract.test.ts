import { describe, expect, it } from 'vitest';
import embeddedApp from '../src/embedded-server.js';
import liveApp from '../src/live-server.js';
import offlineApp from '../src/server.js';

const expectedTools = ['open_travel_starter', 'search_flights', 'verify_flight_offer'];
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

describe('server contract', () => {
  it('exposes exactly the three working model tools and no unfinished domain tools', async () => {
    const manifest = await offlineApp.toManifest() as { tools: Array<{ name: string; visibility?: string[] }> };
    const visible = manifest.tools
      .filter((tool) => !tool.visibility || tool.visibility.includes('model'))
      .map((tool) => tool.name);
    expect(visible).toEqual(expectedTools);
    for (const fragment of forbiddenFragments) expect(visible.join('|')).not.toContain(fragment);
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
        search: { method: 'POST', path: '/flights/rates' },
        verify: { method: 'POST', path: '/flights/verify' },
      },
    });
    expect(Object.keys(http?.operations ?? {})).toEqual(['search', 'verify']);
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
      version: 'v1',
      ttlSeconds: 1_800,
    });
    expect(manifest.tools.find((tool: any) => tool.name === 'open_travel_starter')?.contextProvider).toBe(true);
  });

  it('accepts natural place names conversationally while keeping resolved IATA codes at the tool boundary', async () => {
    const manifest = await liveApp.toManifest() as any;
    const search = manifest.tools.find((entry: any) => entry.name === 'search_flights');
    expect(search.description).toContain('city or airport names');
    expect(search.description).toContain('ambiguous');
    expect(search.inputSchema.properties.origin.description).toContain('Resolved');
    expect(search.inputSchema.properties.destination.description).toContain('Resolved');
  });

  it('keeps the credential-free server free of required managed secrets', async () => {
    const manifest = await offlineApp.toManifest() as { connectors?: unknown; server?: Record<string, unknown> };
    const wire = JSON.stringify(manifest);
    expect(manifest.connectors).toBeUndefined();
    expect(wire).not.toContain('ASSISTANT_MODEL_API_KEY');
    expect(wire).not.toContain('sentinel-nuitee-secret');
  });

  it('keeps embedding optional while reusing the same travel tools', async () => {
    const manifest = await embeddedApp.toManifest() as { tools: Array<{ name: string }> };
    expect(manifest.tools.map((tool) => tool.name)).toEqual(expectedTools);
    const wire = JSON.stringify(manifest);
    expect(wire).toContain('ASSISTANT_MODEL_BASE_URL');
    expect(wire).toContain('ASSISTANT_MODEL');
    expect(wire).toContain('ASSISTANT_MODEL_API_KEY');
    expect(wire).toContain('https://app.example.com');
  });
});
