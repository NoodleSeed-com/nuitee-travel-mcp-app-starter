import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import demoEmbeddedApp from '../src/demo-embedded-server.js';
import demoLiveApp from '../src/demo-live-server.js';
import embeddedApp from '../src/embedded-server.js';
import liveApp from '../src/live-server.js';

const starterTools = [
  'open_travel_starter',
  'plan_flight_search',
  'search_flights',
  'verify_flight_offer',
  'select_flight_offer',
];

const sharedFlightTools = [
  'plan_flight_search',
  'search_flights',
  'verify_flight_offer',
  'select_flight_offer',
];

const demoTools = [
  ...starterTools,
  'search_hotels',
  'open_loyalty',
  'compare_reward_flights',
  'compare_travel_insurance',
  'review_trip',
  'select_hotel',
];

function modelVisible(manifest: any) {
  return manifest.tools
    .filter((entry: any) => !entry.visibility || entry.visibility.includes('model'))
    .map((entry: any) => entry.name);
}

describe('Wayfare expanded travel profile', () => {
  it('keeps capability choice inside one agent-led journey', async () => {
    const manifest = await demoLiveApp.toManifest() as any;
    const guide = manifest.server.agentGuide;
    const wire = JSON.stringify(guide);

    expect(guide.description).toContain('agent-led conversation');
    expect(wire).toContain('capability choice as internal');
    expect(wire).toContain('Keep a focused request focused');
    expect(wire).toContain('Reuse route, dates, travelers, preferences, and selections');
    expect(wire).toContain('at most one contextually relevant next step');
    expect(wire).toContain('registered in the active profile');
    expect(wire).toContain('explicit traveler instruction always wins');
    expect(wire).toContain('Flight and hotel results come from connected Nuitee provider searches');
    expect(wire).toContain('illustrative');
    expect(wire).not.toContain('plan_everything');
  });

  it('leaves every normal starter entrypoint on its existing capability surface', async () => {
    const live = await liveApp.toManifest() as any;
    const embedded = await embeddedApp.toManifest() as any;

    expect(live.tools.map((entry: any) => entry.name)).toEqual(starterTools);
    expect(embedded.tools.map((entry: any) => entry.name)).toEqual(starterTools);
    expect(JSON.stringify(live)).not.toContain('illustrative');
    expect(JSON.stringify(embedded)).not.toContain('illustrative');
  });

  it('adds the synthetic domains only to the compile-time demo profile', async () => {
    const manifest = await demoLiveApp.toManifest() as any;

    expect(manifest.tools.map((entry: any) => entry.name)).toEqual(demoTools);
    expect(modelVisible(manifest)).toEqual([
      'open_travel_starter',
      'plan_flight_search',
      'search_flights',
      'verify_flight_offer',
      'search_hotels',
      'open_loyalty',
      'compare_reward_flights',
      'compare_travel_insurance',
      'review_trip',
    ]);
    for (const name of demoTools) {
      expect(manifest.tools.filter((entry: any) => entry.name === name)).toHaveLength(1);
    }

    const wire = JSON.stringify(manifest);
    expect(wire).toContain('Wayfare');
    expect(wire).toContain('illustrative');
    expect(wire).toContain('hotel-results');
    expect(wire).toContain('loyalty-overview');
    expect(wire).toContain('reward-flight-results');
    expect(wire).toContain('insurance-results');
    expect(wire).toContain('not an insurance quote, policy, or recommendation');
    expect(wire).toContain(
      'Do not refuse a “book with points” request solely because redemption is unavailable',
    );
  });

  it('keeps model-facing input schemas compatible with provider JSON Schema parsers', async () => {
    const manifest = await demoEmbeddedApp.toManifest() as any;

    for (const entry of manifest.tools.filter((toolEntry: any) =>
      !toolEntry.visibility || toolEntry.visibility.includes('model'))) {
      expect(JSON.stringify(entry.inputSchema), entry.name).not.toContain('\\\\p{');
    }
  });

  it('reuses the exact flight contracts and connector catalog in the demo', async () => {
    const liveManifest = await liveApp.toManifest() as any;
    const demoManifest = await demoLiveApp.toManifest() as any;
    const liveFlightTools = liveManifest.tools.filter((entry: any) => sharedFlightTools.includes(entry.name));
    const demoFlightTools = demoManifest.tools.filter((entry: any) => sharedFlightTools.includes(entry.name));

    expect(demoFlightTools).toEqual(liveFlightTools);
    const liveCatalog = liveApp.toConnectorCatalog();
    const demoCatalog = demoLiveApp.toConnectorCatalog();
    const liveNuitee = liveCatalog?.connectors.filter((entry: any) => entry.id.startsWith('nuitee_flights_'));
    const demoNuitee = demoCatalog?.connectors.filter((entry: any) => entry.id.startsWith('nuitee_flights_'));
    expect(demoNuitee).toEqual(liveNuitee);
    expect(demoCatalog?.connectors.find((entry: any) => entry.id === 'nuitee_hotels_gateway'))
      .toMatchObject({ kind: 'custom', operations: { execute: { type: 'read' } } });
    expect(demoCatalog?.connectors.find((entry: any) => entry.id === 'nuitee_hotels_http'))
      .toMatchObject({ kind: 'custom', operations: { search: { type: 'read', path: '/hotels/rates' } } });
    expect(demoCatalog?.connectors.find((entry: any) => entry.id === 'wayfare_preview_gateway'))
      .toMatchObject({ kind: 'custom', operations: { execute: { type: 'read' } } });

    const sources = await Promise.all([
      readFile(new URL('../src/demo-live-server.ts', import.meta.url), 'utf8'),
      readFile(new URL('../src/demo-embedded-server.ts', import.meta.url), 'utf8'),
    ]);
    for (const source of sources) {
      expect(source).not.toMatch(/\btool\s*\(/);
      expect(source).not.toContain('nuiteeGateway');
      expect(source).not.toContain('searchInputSchema');
    }
  });

  it('keeps demo selections opaque, caller-scoped, expiring, and app-only', async () => {
    const manifest = await demoLiveApp.toManifest() as any;
    const select = manifest.tools.find((entry: any) => entry.name === 'select_hotel');
    const review = manifest.tools.find((entry: any) => entry.name === 'review_trip');

    expect(select).toMatchObject({
      visibility: ['app'],
      annotations: { readOnlyHint: true },
    });
    expect(JSON.stringify(select.inputSchema)).toContain('selectionId');
    expect(JSON.stringify(select.inputSchema)).not.toContain('price');
    expect(review.inputSchema).toMatchObject({
      type: 'object',
      properties: {},
    });
    expect(manifest.state.handles.demo_hotel_selections).toMatchObject({
      kind: 'selection',
      scope: 'caller',
      ttlSeconds: 1_800,
    });
  });

  it('uses the same demo capability surface in external-host and embedded modes', async () => {
    const live = await demoLiveApp.toManifest() as any;
    const embedded = await demoEmbeddedApp.toManifest() as any;

    expect(embedded.tools.map((entry: any) => entry.name)).toEqual(
      live.tools.map((entry: any) => entry.name),
    );
    expect(embedded.server.assistant.surfaces[0].capabilities).toEqual(
      demoTools.map((name) => ({ kind: 'tool', name })),
    );
  });

  it('does not expose a transactional or arbitrary transport capability', async () => {
    const manifest = await demoLiveApp.toManifest() as any;
    const names = manifest.tools.map((entry: any) => entry.name).join('|');

    for (const forbidden of [
      'book',
      'reserve',
      'payment',
      'redeem',
      'transfer',
      'cancel',
      'refund',
      'http_request',
    ]) {
      expect(names).not.toContain(forbidden);
    }

    const insurance = manifest.tools.find((entry: any) =>
      entry.name === 'compare_travel_insurance');
    expect(insurance).toMatchObject({
      annotations: { readOnlyHint: true },
    });
    expect(JSON.stringify({
      inputSchema: insurance.inputSchema,
      outputSchema: insurance.outputSchema,
    })).not.toMatch(
      /purchaseUrl|checkoutUrl|policyNumber|insurer|underwriter/iu,
    );
  });
});
