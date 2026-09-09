import { describe, expect, it } from 'vitest';
import { gatewayOutputSchema } from '../src/flight-connectors.js';
import { selectionStateSchema } from '../src/flight-schemas.js';
import { runNuiteeGateway } from '../src/flight-runtime.js';
import { prepareSelectionStates } from '../src/selection-state.js';
import { demoGatewayOutputSchema } from '../src/demo-connectors.js';
import { runDemoGateway } from '../src/demo-runtime.js';
import { getSyntheticLoyaltyOverview } from '../src/demo-fixtures.js';
import { fictionalSearchResponse, validSearchInput } from './fixtures/nuitee.js';

const requestedAt = '2030-04-01T12:00:00Z';
const logo = 'https://sandbox.nuitee.flights/static/images/airlines/ZZ.png';
function search(airlineLogo: string | undefined = logo) {
  const response = structuredClone(fictionalSearchResponse);
  (response.data[0].journeys[0].segments[0].carrier as any).marketingLogo = airlineLogo;
  return gatewayOutputSchema.parse(runNuiteeGateway(
    { kind: 'search', search: validSearchInput, today: '2030-04-01', requestedAt },
    { callOperation: () => ({ raw: response }) },
  ));
}
function review(flightState: unknown) {
  return demoGatewayOutputSchema.parse(runDemoGateway({
    kind: 'review', flightState, requestedAt, loyalty: getSyntheticLoyaltyOverview(),
  })).review!;
}
describe('selected flight image boundaries', () => {
  it.each(['sandbox', 'production'])('retains the %s search logo through selection and trip-review schema boundaries', environment => {
    const airlineLogoUrl = logo.replace('sandbox', environment);
    const found = search(airlineLogoUrl);
    expect(found.itineraries![0].carrier.logoUrl).toBe(airlineLogoUrl);
    const stored = selectionStateSchema.parse({
      records: found.records, activeSelectionId: found.records![0].selectionId, updatedAt: requestedAt,
    });
    expect(stored.records![0]).toHaveProperty('airlineLogoUrl', airlineLogoUrl);
    const prepared = prepareSelectionStates({ flightState: stored });
    const result = review(selectionStateSchema.parse(prepared.flightState));
    expect(result.flight).toHaveProperty('airlineLogoUrl', airlineLogoUrl);
    expect(result.flight!.searchPrice).toEqual({ total: 284.5, currency: 'CAD' });
    expect(result.flight).not.toHaveProperty('offerId');
  });
  it('keeps legacy selections without a logo readable', () => {
    const found = search();
    const record = { ...found.records![0] } as Record<string, unknown>;
    delete record.airlineLogoUrl;
    const result = review(selectionStateSchema.parse({ records: [record], activeSelectionId: record.selectionId, updatedAt: requestedAt }));
    expect(result.status).toBe('ready');
    expect(result.flight).not.toHaveProperty('airlineLogoUrl');
  });
  it.each([
    'https://untrusted.example/ZZ.png',
    'https://sandbox.nuitee.flights.evil.example/static/images/airlines/ZZ.png',
    'http://sandbox.nuitee.flights/static/images/airlines/ZZ.png',
    'https://sandbox.nuitee.flights:444/static/images/airlines/ZZ.png',
    'https://sandbox.nuitee.flights/other/ZZ.png',
    'javascript:alert(1)',
  ])('omits an untrusted logo at search and review boundaries: %s', airlineLogoUrl => {
    const found = search(airlineLogoUrl);
    expect(found.records![0]).not.toHaveProperty('airlineLogoUrl');
    const record = { ...found.records![0], airlineLogoUrl };
    expect(selectionStateSchema.safeParse({ records: [record], updatedAt: requestedAt }).success).toBe(false);
    const result = review({ records: [record], activeSelectionId: record.selectionId });
    expect(result.status).toBe('ready');
    expect(result.flight).not.toHaveProperty('airlineLogoUrl');
  });
});
