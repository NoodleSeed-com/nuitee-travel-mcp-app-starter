import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import demoEmbeddedApp from '../src/demo-embedded-server.js';
import demoLiveApp from '../src/demo-live-server.js';
import demoPreviewApp from '../src/demo-preview-server.js';
import embeddedApp from '../src/embedded-server.js';
import liveApp from '../src/live-server.js';
import { experienceDemoViewPolicy, hotelDemoViewPolicy } from '../src/travel-server.js';

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
  'open_hotel',
  'search_experiences',
  'open_loyalty',
  'compare_reward_flights',
  'compare_travel_insurance',
  'review_trip',
  'select_hotel',
  'add_experience_to_trip',
];

function modelVisible(manifest: any) {
  return manifest.tools
    .filter((entry: any) => !entry.visibility || entry.visibility.includes('model'))
    .map((entry: any) => entry.name);
}

describe('Wayfare expanded travel profile', () => {
  it('returns the planning estimate from a read-only computation over server-owned review data', async () => {
    const manifest = await demoEmbeddedApp.toManifest() as any;
    const review = manifest.tools.find((entry: any) => entry.name === 'review_trip');
    expect(review.fulfilment.steps.at(-1).use).toBe('demo.estimate_trip');
    expect(JSON.stringify(review.outputSchema.properties.planningEstimate)).toContain('mixed_currencies');
    expect(JSON.stringify(review.outputSchema.properties.planningEstimate)).toContain('providerSubtotalMinor');
    expect(Object.keys(review.inputSchema.properties)).toEqual([]);
    expect(review.annotations.readOnlyHint).toBe(true);
  });
  it('makes hotel discovery reuse context and expose adjustable one-night, one-person defaults', async () => {
    const manifest = await demoEmbeddedApp.toManifest() as any;
    const search = manifest.tools.find((entry: any) => entry.name === 'search_hotels');
    expect(search.description).toContain('never ask for them again after a date-only reply');
    expect(search.description).toContain('same local weekday seven days later');
    expect(search.description).toContain('1 night, 1 adult and 1 room');
    expect(search.inputSchema.properties.adults.default).toBe(1);
    expect(search.inputSchema.properties.rooms.default).toBe(1);
    const source = await readFile(new URL('../src/travel-server.ts', import.meta.url), 'utf8');
    expect(source).toContain('If a provider request fails, preserve all known search details');
    expect(source).not.toContain('Apply two adults, one room');
  });
  it('reopens returned hotels read-only using the existing snapshot and widget-only selection', async () => {
    const manifest = await demoEmbeddedApp.toManifest() as any;
    const open = manifest.tools.find((entry: any) => entry.name === 'open_hotel');
    expect(open).toMatchObject({ annotations: { readOnlyHint: true } });
    expect(Object.keys(open.inputSchema.properties)).toEqual(['hotelName']);
    expect(open.fulfilment.steps.map((step: any) => step.use)).toEqual(['state.read_state', 'demo.prepare_states', 'demo.open_hotel']);
    expect(JSON.stringify(manifest.state.handles.demo_hotel_selections.schema)).toContain('searchResult');
  });
  it('provides a credential-free local preview of every widget tool', async () => {
    const manifest = await demoPreviewApp.toManifest() as any;
    expect(manifest.tools.map((entry: any) => entry.name)).toEqual(demoTools);
    expect(manifest.tools.find((entry: any) => entry.name === 'search_hotels')?.description)
      .toContain('illustrative');
    expect(Object.keys(manifest.connectors)).toEqual(['demo', 'state']);
    expect(manifest.provides).toBeUndefined();
    expect(manifest.state.handles.demo_hotel_selections).toBeDefined();
  });

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
      'open_hotel',
      'search_experiences',
      'open_loyalty',
      'compare_reward_flights',
      'compare_travel_insurance',
      'review_trip',
      'add_experience_to_trip',
    ]);
    for (const name of demoTools) {
      expect(manifest.tools.filter((entry: any) => entry.name === name)).toHaveLength(1);
    }

    const wire = JSON.stringify(manifest);
    expect(wire).toContain('Wayfare');
    expect(wire).toContain('illustrative');
    expect(wire).toContain('hotel-results');
    expect(wire).toContain('experience-results');
    expect(wire).toContain('WAYFARE_DEMO');
    expect(wire).toContain('Lisbon and Tokyo');
    expect(wire).toContain('loyalty-overview');
    expect(wire).toContain('reward-flight-results');
    expect(wire).toContain('insurance-results');
    expect(wire).toContain('not an insurance quote, policy, or recommendation');
    expect(wire).toContain(
      'Do not refuse a “book with points” request solely because redemption is unavailable',
    );
  });

  it('exposes two-city fictional experiences only in expanded profiles', async () => {
    const demo = await demoLiveApp.toManifest() as any;
    const starter = await liveApp.toManifest() as any;
    const experiences = demo.tools.find((entry: any) => entry.name === 'search_experiences');
    const home = demo.tools.find((entry: any) => entry.name === 'open_travel_starter');

    expect(experiences).toMatchObject({ annotations: { readOnlyHint: true } });
    expect(JSON.stringify(experiences.outputSchema)).toContain('WAYFARE_DEMO');
    expect(JSON.stringify(experiences.outputSchema)).toContain('UNSUPPORTED_DESTINATION');
    expect(JSON.stringify(experiences.inputSchema)).toContain(
      'Use ANY unless the traveler explicitly requests step-free or wheelchair-accessible options',
    );
    expect(JSON.stringify(experiences.inputSchema)).toContain('ANY');
    expect(JSON.stringify(home.outputSchema)).toContain('Experiences');
    const agentGuide = JSON.stringify(demo.server.agentGuide);
    expect(agentGuide).toContain('search_experiences');
    expect(agentGuide).toContain('Never infer an interest or accessibility filter');
    expect(starter.tools.some((entry: any) => entry.name === 'search_experiences')).toBe(false);
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

  it('keeps experience selection callable by conversation and app with caller-owned state and acknowledged patch output', async () => {
    const manifest = await demoLiveApp.toManifest() as any;
    const add = manifest.tools.find((entry: any) => entry.name === 'add_experience_to_trip');
    expect(add).toMatchObject({ visibility: ['model', 'app'], annotations: { readOnlyHint: true } });
    expect(Object.keys(add.inputSchema.properties)).toEqual(['experienceId', 'slotId']);
    expect(add.inputSchema.additionalProperties).toBe(false);
    expect(add.outputSchema.required).toEqual(expect.arrayContaining(['requestedExperienceId', 'requestedSlotId']));
    expect(manifest.state.handles.experience_selections).toMatchObject({ kind: 'selection', scope: 'caller', ttlSeconds: 1_800 });
    expect(JSON.stringify(add)).toContain('acknowledge_experience_selection');
    expect(JSON.stringify(add)).toContain('expectedRevision');
    expect(JSON.stringify(add)).toContain('patchOk');
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

describe('hotel widget map CSP', () => {
  it('allows each required Mapbox origin without wildcards', () => {
    const expected = [
      'https://api.mapbox.com',
      'https://events.mapbox.com',
      'https://a.tiles.mapbox.com',
      'https://b.tiles.mapbox.com',
      'https://c.tiles.mapbox.com',
      'https://d.tiles.mapbox.com',
    ];

    for (const origin of expected) {
      expect(hotelDemoViewPolicy.csp.connectDomains).toContain(origin);
      expect(hotelDemoViewPolicy.csp.resourceDomains).toContain(origin);
    }
    expect([
      ...hotelDemoViewPolicy.csp.connectDomains,
      ...hotelDemoViewPolicy.csp.resourceDomains,
    ].some((origin) => origin.includes('*'))).toBe(false);
  });

  it('retains the bounded Nuitee hotel-image origin', () => {
    expect(hotelDemoViewPolicy.csp.resourceDomains).toContain('https://snaphotelapi.com');
    expect(hotelDemoViewPolicy.csp.resourceDomains).toContain('https://static.cupid.travel');
    expect(hotelDemoViewPolicy.csp.connectDomains).not.toContain('https://static.cupid.travel');
  });
});

describe('experience widget image CSP', () => {
  it('allows bounded experience and inline stay image origins without provider connections', () => {
    expect(experienceDemoViewPolicy.csp.connectDomains).toEqual([]);
    expect(experienceDemoViewPolicy.csp.resourceDomains).toEqual(['https://images.unsplash.com', 'https://snaphotelapi.com', 'https://static.cupid.travel', 'https://sandbox.nuitee.flights', 'https://production.nuitee.flights']);
    expect(experienceDemoViewPolicy.csp.frameDomains).toEqual([]);
  });
});

it('allows selected airline logos in hotel, experience and standalone trip reviews as resources only', () => {
  for (const policy of [hotelDemoViewPolicy, experienceDemoViewPolicy]) {
    for (const origin of ['https://sandbox.nuitee.flights', 'https://production.nuitee.flights']) {
      expect(policy.csp.resourceDomains).toContain(origin);
      expect(policy.csp.connectDomains).not.toContain(origin);
    }
    expect(policy.csp.resourceDomains.some(origin => origin.includes('*'))).toBe(false);
  }
});
