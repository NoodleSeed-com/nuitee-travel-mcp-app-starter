import { runInNewContext } from 'node:vm';
import { z } from '@noodleseed/one';
import { beforeAll, describe, expect, it } from 'vitest';
import previewApp from '../src/demo-preview-server.js';
import { demoTripReviewSchema } from '../src/demo-schemas.js';
import { noodleState } from '../src/flight-connectors.js';

const instant = '2030-04-01T12:00:00Z';
const flightState = {
  updatedAt: instant,
  activeSelectionId: 'sel_0123456789abcdef0123456789abcdef',
  records: [{
    selectionId: 'sel_0123456789abcdef0123456789abcdef',
    offerId: 'private-provider-offer',
    searchId: 'search_01',
    originalTotal: 284.5,
    currency: 'CAD',
    expiresAt: '2030-04-01T12:15:00Z',
  }],
};
const hotelState = {
  updatedAt: instant,
  activeSelectionId: 'hsel_0123456789abcdef0123456789abcdef',
  records: [{
    selectionId: 'hsel_0123456789abcdef0123456789abcdef',
    searchId: 'hsearch_0123456789abcdef0123456789abcdef',
    dataSource: 'illustrative',
    propertyName: 'Synthetic test stay',
    city: 'Tokyo',
    checkInDate: '2030-04-20',
    checkOutDate: '2030-04-23',
    nights: 3,
    rooms: 1,
    staySubtotal: { amount: 510, currency: 'CAD' },
  }],
};

// The native local read returned this envelope before any state write.
// "active" alone is not evidence that a selection was stored.
function read(handle: string, value: unknown = {}, revision = 0) {
  return { ok: true, handle, value, revision, status: 'active', expiresAt: instant };
}

let reviewTool: any;
let catalog: any;
beforeAll(async () => {
  const manifest = await previewApp.toManifest() as any;
  reviewTool = manifest.tools.find((tool: any) => tool.name === 'review_trip');
  catalog = previewApp.toConnectorCatalog();
});

function resolve(value: any, results: Record<string, any>): any {
  if (typeof value === 'string' && value.startsWith('${steps.')) {
    return value.slice(8, -1).split('.').reduce((result, key) => result?.[key], results);
  }
  if (Array.isArray(value)) return value.map((entry) => resolve(entry, results));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, resolve(entry, results)]));
  }
  return value;
}

function review(flights: unknown = read('flight_selections'), hotels: unknown = read('demo_hotel_selections')) {
  const results: Record<string, any> = {};
  for (const step of reviewTool.fulfilment.steps) {
    const args = resolve(step.args, results);
    if (step.use === 'state.read_state') {
      results[step.id] = args.handle === 'flight_selections' ? flights : hotels;
      continue;
    }
    expect(step.use).toMatch(/^demo\.(prepare_states|execute|review)$/);
    const operation = catalog.connectors.find((entry: any) => entry.id === 'wayfare_preview_gateway')
      .operations[step.use.split('.')[1]];
    // Validate the emitted native input, then run its emitted source in a fresh
    // context. This cannot pass via the tolerant direct fixture helper alone.
    const parsed = z.fromJSONSchema(operation.input).parse(args);
    const run = runInNewContext(`(${operation.code})`, {
      Date: undefined, fetch: undefined, process: undefined, crypto: undefined,
    });
    results[step.id] = z.fromJSONSchema(operation.output).parse(run(parsed));
  }
  return demoTripReviewSchema.parse(resolve(reviewTool.fulfilment.output, results));
}

describe('trip review at the recorded state/compute boundary', () => {
  it('returns an honest incomplete review for two successful fresh reads', () => {
    const result = review();
    expect(result).toMatchObject({ status: 'incomplete', missing: ['flight', 'stay'] });
    expect(result.flight).toBeUndefined();
    expect(result.stay).toBeUndefined();
    expect(result.disclosure).not.toMatch(/current provider|current Nuitee|flight remains|selections came from/);
    expect(result.disclosure).toContain('No flight or stay is selected');
    expect(result.disclosure).toContain('illustrative');
  });

  it('keeps the selected flight when only the stay is absent', () => {
    const result = review(read('flight_selections', flightState, 2));
    expect(result).toMatchObject({
      status: 'incomplete', missing: ['stay'],
      flight: { selectionId: flightState.activeSelectionId, searchPrice: { total: 284.5, currency: 'CAD' } },
    });
    expect(result.stay).toBeUndefined();
    expect(result.disclosure).toContain('No stay is selected');
    expect(result.disclosure).toContain('flight');
  });

  it.each(['illustrative', 'live_nuitee'])('keeps a selected %s stay when only the flight is absent', (dataSource) => {
    const stored = { ...hotelState, records: [{ ...hotelState.records[0], dataSource }] };
    const result = review(read('flight_selections'), read('demo_hotel_selections', stored, 2));
    expect(result).toMatchObject({
      status: 'incomplete', missing: ['flight'],
      stay: { dataSource, selectionId: hotelState.activeSelectionId, staySubtotal: { amount: 510, currency: 'CAD' } },
    });
    expect(result.flight).toBeUndefined();
    expect(result.disclosure).toContain('No flight is selected');
    expect(result.disclosure).not.toMatch(/flight remains|Flight and stay selections came/);
    expect(result.disclosure).toContain(dataSource === 'live_nuitee' ? 'current provider' : 'illustrative');
  });

  it.each(['illustrative', 'live_nuitee'])('preserves both selections and separate %s stay prices', (dataSource) => {
    const stored = { ...hotelState, records: [{ ...hotelState.records[0], dataSource }] };
    const flights = read('flight_selections', flightState, 3);
    const hotels = read('demo_hotel_selections', stored, 4);
    const before = JSON.stringify({ flights, hotels });
    const result = review(flights, hotels);
    expect(result).toMatchObject({
      status: 'ready', missing: [],
      flight: { dataSource: 'live_nuitee_selection', selectionId: flightState.activeSelectionId,
        searchPrice: { total: 284.5, currency: 'CAD' }, expiresAt: flightState.records[0].expiresAt },
      stay: { dataSource, selectionId: hotelState.activeSelectionId, staySubtotal: { amount: 510, currency: 'CAD' } },
    });
    expect(JSON.stringify(result)).not.toMatch(/packageTotal|combinedTotal|private-provider-offer/);
    expect(JSON.stringify({ flights, hotels })).toBe(before);
    expect(result.disclosure).toContain(dataSource === 'live_nuitee' ? 'current provider searches' : 'Stay and rewards values are illustrative');
  });

  it('treats valid stored states without active selections as missing', () => {
    const { activeSelectionId: _flight, ...flights } = flightState;
    const { activeSelectionId: _hotel, ...hotels } = hotelState;
    expect(review(read('flight_selections', flights, 1), read('demo_hotel_selections', hotels, 1)))
      .toMatchObject({ status: 'incomplete', missing: ['flight', 'stay'] });
    expect(review(read('flight_selections', { updatedAt: instant, records: [] }, 1),
      read('demo_hotel_selections', { updatedAt: instant, records: [] }, 1)))
      .toMatchObject({ status: 'incomplete', missing: ['flight', 'stay'] });
  });

  it('does not infer absence from an undocumented status string', () => {
    const result = review({ ...read('flight_selections', flightState, 1), status: 'other_status' },
      read('demo_hotel_selections', hotelState, 1));
    expect(result).toMatchObject({ status: 'ready', missing: [] });
  });

  for (const [label, handle, stored] of [
    ['flight', 'flight_selections', flightState],
    ['stay', 'demo_hotel_selections', hotelState],
  ] as const) {
    it.each([
      ['failed empty read', { ...read(handle), ok: false }],
      ['failed populated read', { ...read(handle, stored, 1), ok: false }],
      ['missing success marker', { ...read(handle), ok: undefined }],
      ['missing success marker on populated read', { ...read(handle, stored, 1), ok: undefined }],
      ['wrong handle', read('unexpected_handle')],
      ['empty value after a write', read(handle, {}, 1)],
      ['missing revision', { ...read(handle), revision: undefined }],
      ['negative revision', read(handle, {}, -1)],
      ['fractional revision', read(handle, {}, 0.5)],
      ['missing value', { ...read(handle), value: undefined }],
      ['null value', read(handle, null)],
      ['array value', read(handle, [])],
      ['scalar value', read(handle, 'unavailable')],
      ['malformed nonempty value', read(handle, { unexpected: true })],
      ['missing stored updatedAt', read(handle, { records: stored.records }, 1)],
      ['missing stored records', read(handle, { updatedAt: instant }, 1)],
      ['invalid stored selection', read(handle, { ...stored, activeSelectionId: 'invalid' }, 1)],
      ['invalid stored record', read(handle, { ...stored, records: [{}] }, 1)],
      ['too many stored records', read(handle, { ...stored, records: Array.from({ length: 11 }, () => stored.records[0]) }, 1)],
    ])(`fails closed for ${label}: %s`, (_reason, envelope) => {
      expect(() => label === 'flight'
        ? review(envelope, read('demo_hotel_selections', hotelState, 1))
        : review(read('flight_selections', flightState, 1), envelope)).toThrow();
    });
  }

  it('records only two state reads and the bounded review computation', () => {
    expect(reviewTool.fulfilment.steps.map((step: any) => step.use))
      .toEqual(['state.read_state', 'state.read_state', 'demo.review']);
    const operation = catalog.connectors.find((entry: any) => entry.id === 'wayfare_preview_gateway').operations.review;
    expect(operation.type).toBe('read');
    expect(operation.calls).toBeUndefined();
    for (const key of ['flightRead', 'hotelRead']) {
      expect(operation.input.required).toContain(key);
      const empty = operation.input.properties[key].anyOf.find((branch: any) => branch.properties.revision.const === 0);
      expect(empty.properties.value).toMatchObject({ type: 'object', properties: {}, additionalProperties: false });
    }
    const stateRead = noodleState.operations.read_state;
    expect(stateRead.output.properties).toHaveProperty('ok');
    expect(stateRead.output.properties).toHaveProperty('handle');
  });
});
