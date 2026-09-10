import { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
const bridge = vi.hoisted(() => ({ call: vi.fn(), search: vi.fn(), hotels: vi.fn(), selectHotel: vi.fn(), add: vi.fn(), send: vi.fn(), context: vi.fn(), followUp: true, modelContext: true }));
vi.mock('../../src/helpers.js', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/helpers.js')>(),
  useWidgetReady: () => true,
  useLayout: () => ({ locale: 'en-CA', displayMode: 'inline', supports: { followUpMessage: bridge.followUp, modelContext: bridge.modelContext } }),
  useCallTool: (name: string) => ({ callToolAsync: name === 'search_experiences' ? bridge.search : name === 'search_hotels' ? bridge.hotels : name === 'select_hotel' ? bridge.selectHotel : name === 'add_experience_to_trip' ? bridge.add : bridge.call }),
  useViewState: (_key: string, initial: unknown) => useState(initial),
  useSendFollowUpMessage: () => bridge.send,
  useUpdateModelContext: () => bridge.context,
}));
import { InlineTripReview } from '../../src/views/trip-review.js';
import { runDemoGateway } from '../../src/demo-runtime.js';
import { DEMO_EXPERIENCE_ALIASES, DEMO_EXPERIENCE_CATALOG } from '../../src/experience-fixtures.js';
import type { DemoExperienceSearchOutput, DemoExperienceSelection, DemoHotelSearchOutput, DemoTripReview } from '../../src/demo-schemas.js';

const review = {
  status: 'ready', experiences: [], missing: ['stay', 'experiences'],
  flight: { selectionId: `sel_${'a'.repeat(32)}`, searchPrice: { total: 1200, currency: 'CAD' }, disclosure: 'Flight fare still needs verification.' },
  planningContext: { source: 'flight', dateBasis: 'flight_departure', destination: 'Tokyo', startDate: '2026-10-10', adults: 2, currency: 'CAD' },
  fallback: 'One flight selected. Stays and experiences remain optional.',
  disclosure: 'A plan only; nothing reserved or paid.',
};
let root: Root | undefined;
afterEach(() => { root?.unmount(); root = undefined; document.body.innerHTML = ''; vi.resetAllMocks(); bridge.followUp = true; bridge.modelContext = true; });
function mount() {
  bridge.send.mockResolvedValue(undefined); bridge.context.mockResolvedValue(undefined);
  function Flow() {
    const [open, setOpen] = useState(false);
    return open ? <InlineTripReview onBack={() => setOpen(false)} backLabel="Back to flight" /> : <button data-trip-review-trigger onClick={() => setOpen(true)}>Review my trip</button>;
  }
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host); root.render(<Flow />);
}

it('loads fresh trip state in the same widget without a chat message, with preserved return navigation', async () => {
  bridge.call.mockResolvedValue({ structuredContent: review });
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByRole('heading', { name: 'Your Tokyo plan' })).toBeVisible();
  expect(bridge.call).toHaveBeenCalledExactlyOnceWith({});
  expect(bridge.send).not.toHaveBeenCalled();
  await page.getByRole('button', { name: 'Continue planning' }).click();
  expect(bridge.send).toHaveBeenCalledWith({ prompt: 'Find a stay in Tokyo.' });
  expect(bridge.context.mock.lastCall?.[0].content[1].text).toContain('Do not repeat the trip review');
  await page.getByRole('button', { name: 'Back to flight' }).click();
  await expect.element(page.getByRole('button', { name: 'Review my trip' })).toHaveFocus();
  bridge.call.mockResolvedValue({ structuredContent: { ...review, flight: { ...review.flight, searchPrice: { total: 1350, currency: 'CAD' } } } });
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByRole('region', { name: 'Selected flight' }).getByText('$1,350.00', { exact: true })).toBeVisible();
  expect(bridge.call).toHaveBeenCalledTimes(3);
});

it('shows loading, rejects malformed results and retries without inventing selections', async () => {
  let resolve!: (value: unknown) => void;
  bridge.call.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Preparing your selected trip');
  resolve({ structuredContent: { status: 'ready' } });
  await expect.element(page.getByText('The trip result was incomplete, so no selections were inferred.')).toBeVisible();
  bridge.call.mockResolvedValueOnce({ structuredContent: review });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect.element(page.getByRole('heading', { name: 'Your Tokyo plan' })).toBeVisible();
  expect(bridge.send).not.toHaveBeenCalled();
});

it('keeps an explicitly unpriced flight visible in the actual inline review without inventing a total', async () => {
  bridge.call.mockResolvedValue({ structuredContent: { ...review, flight: { ...review.flight, searchPrice: null } } });
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByRole('heading', { name: 'Your selected flight' })).toBeVisible();
  await expect.element(page.getByText('Price unavailable', { exact: true })).toBeVisible();
  await expect.element(page.getByText('Total incomplete', { exact: true })).toBeVisible();
  expect(bridge.send).not.toHaveBeenCalled();
});

it('keeps stay-search instructions in model context and sends only the request to chat', async () => {
  bridge.call.mockResolvedValue({ structuredContent: review });
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByRole('heading', { name: 'Your Tokyo plan' })).toBeVisible();
  await page.getByRole('button', { name: 'Find a stay' }).click();
  expect(bridge.send).toHaveBeenCalledExactlyOnceWith({ prompt: 'Find a stay in Tokyo.' });
  const context = bridge.context.mock.lastCall?.[0];
  expect(context.structuredContent.tripPlanning.context).toMatchObject({ destination: 'Tokyo' });
  expect(context.content[1].text).toContain('Do not repeat the trip review, display another plan card, or recheck my flight fare for this search');
  expect(context.content[1].text).toContain('one short question for only the missing');
  expect(bridge.call).toHaveBeenCalledTimes(2);
});

it('waits for fresh model context without overwriting it or leaking currency instructions into chat', async () => {
  bridge.call.mockResolvedValue({ structuredContent: review });
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByRole('heading', { name: 'Your Tokyo plan' })).toBeVisible();
  const current = { ...review, planningContext: { ...review.planningContext, destination: 'NRT', currency: 'GBP' } };
  bridge.call.mockResolvedValue({ structuredContent: current });
  bridge.context.mockClear();
  let resolveContext!: () => void;
  bridge.context.mockImplementationOnce(() => new Promise<void>(resolve => { resolveContext = resolve; }));
  await page.getByRole('button', { name: 'Find a stay' }).click();
  await expect.element(page.getByRole('button', { name: 'Find a stay' })).toBeDisabled();
  expect(bridge.send).not.toHaveBeenCalled();
  expect(bridge.context).toHaveBeenCalledTimes(1);
  const context = bridge.context.mock.lastCall?.[0];
  expect(context.structuredContent.tripPlanning.context).toMatchObject({ destination: 'NRT', currency: 'GBP' });
  expect(context.content[0].text).toBe(current.fallback);
  expect(context.content[1].text).toContain('Choose CAD, USD or EUR in the conversation for the hotel search');
  expect(context.content[1].text).toContain('Do not treat flight departure or return dates as confirmed local arrival');
  resolveContext();
  await expect.poll(() => bridge.send.mock.calls.length).toBe(1);
  expect(bridge.send).toHaveBeenCalledExactlyOnceWith({ prompt: 'Find a stay in NRT.' });
  expect(bridge.context).toHaveBeenCalledTimes(1);
});

it('offers retry when model context fails without exposing instructions or starting an incomplete turn', async () => {
  bridge.call.mockResolvedValue({ structuredContent: review });
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByRole('heading', { name: 'Your Tokyo plan' })).toBeVisible();
  bridge.context.mockRejectedValueOnce(new Error('Context unavailable'));
  await page.getByRole('button', { name: 'Find a stay' }).click();
  await expect.element(page.getByText('Your trip details could not be shared with the conversation. Try again.')).toBeVisible();
  expect(bridge.send).not.toHaveBeenCalled();
  await expect.element(page.getByRole('button', { name: 'Find a stay' })).toBeEnabled();
  await page.getByRole('button', { name: 'Find a stay' }).click();
  expect(bridge.send).toHaveBeenCalledExactlyOnceWith({ prompt: 'Find a stay in Tokyo.' });
});

it('keeps a useful factual request without model instructions when the host lacks model context', async () => {
  bridge.modelContext = false;
  bridge.call.mockResolvedValue({ structuredContent: review });
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await page.getByRole('button', { name: 'Find a stay' }).click();
  expect(bridge.context).not.toHaveBeenCalled();
  expect(bridge.send).toHaveBeenCalledExactlyOnceWith({ prompt: 'Find a stay in Tokyo based on my flight departing 2026-10-10 for 2 adults, with prices in CAD.' });
});

function experienceSearch(input = { destination: 'Tokyo', startDate: '2026-10-10', endDate: '2026-10-11', adults: 2, children: 0, currency: 'CAD' }) {
  return runDemoGateway({ kind: 'experience_search', experienceSearch: input, requestedAt: new Date().toISOString(), experienceReadOk: true,
    experienceCatalog: DEMO_EXPERIENCE_CATALOG, experienceAliases: DEMO_EXPERIENCE_ALIASES });
}

it('opens real carousel and chooser in place, adds only an explicit slot, then reads the updated trip', async () => {
  await page.viewport(900, 1200);
  const searched = experienceSearch();
  bridge.call.mockResolvedValue({ structuredContent: review });
  let resolveSearch!: (value: unknown) => void;
  bridge.search.mockImplementationOnce(() => new Promise(done => { resolveSearch = done; }));
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await page.getByRole('button', { name: 'Explore experiences' }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Finding fictional experience ideas');
  expect(getComputedStyle(document.querySelector('.wf-experience-discovery .nsr-frame-surface')!).borderTopWidth).toBe('0px');
  expect(bridge.search).toHaveBeenCalledExactlyOnceWith({ destination: 'Tokyo', startDate: '2026-10-10', endDate: '2026-10-11', adults: 2, children: 0, currency: 'CAD', accessibility: 'ANY' });
  expect(bridge.call).toHaveBeenCalledTimes(2);
  resolveSearch({ structuredContent: searched.experienceResult });
  await expect.element(page.getByRole('heading', { name: 'Tokyo experience ideas' })).toBeVisible();
  expect(document.querySelectorAll('.cc-experience-card')).toHaveLength(3);
  expect(getComputedStyle(document.querySelector('.wf-experience-discovery')!).borderTopWidth).toBe('1px');
  expect(getComputedStyle(document.querySelector('.wf-experience-discovery .nsr-frame-surface')!).borderTopWidth).toBe('0px');
  expect(getComputedStyle(document.querySelector('.cc-experience-card')!).borderTopWidth).toBe('1px');
  await expect.element(page.getByText(/Using your flight date as a starting point/)).toBeVisible();
  expect(bridge.send).not.toHaveBeenCalled();
  expect(bridge.add).not.toHaveBeenCalled();
  await expect.poll(() => bridge.context.mock.lastCall?.[0].structuredContent.experienceSearchContext).toMatchObject({ startDate: '2026-10-10', endDate: '2026-10-11', adults: 2, currency: 'CAD' });
  expect(bridge.context.mock.lastCall?.[0].structuredContent).toMatchObject({ tripPlanning: { flightSelectionId: review.flight.selectionId, missing: ['stay', 'experiences'] }, experienceBrowsing: { dateBasis: 'flight_date_suggestion' } });
  await page.screenshot({ path: '__screenshots__/direct-trip-experiences-desktop.png', fullPage: true });
  await page.viewport(366, 1000);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(366);
  await page.screenshot({ path: '__screenshots__/direct-trip-experiences-mobile.png', fullPage: true });
  await page.viewport(900, 1200);
  await page.getByRole('button', { name: 'View details for Yanaka Food & Craft Walk' }).click();
  await expect.element(page.getByRole('button', { name: 'Choose a day to continue' })).toBeDisabled();
  await page.getByRole('button', { name: 'Saturday 10 Oct' }).click();
  await page.getByRole('button', { name: '10:00', exact: true }).click();
  const experience = (searched.experienceResult as DemoExperienceSearchOutput).experiences[0]!;
  const selected = runDemoGateway({ kind: 'experience_select', experienceState: searched.nextExperienceState, experienceId: experience.experienceId, slotId: experience.slots[0].slotId, requestedAt: new Date().toISOString(), experienceReadOk: true });
  let acknowledge!: (value: unknown) => void;
  bridge.add.mockImplementationOnce(() => new Promise(done => { acknowledge = done; }));
  await page.getByRole('button', { name: 'Add to my trip', exact: true }).click();
  await expect.element(page.getByRole('button', { name: 'Back to your trip' })).toBeDisabled();
  acknowledge({ structuredContent: { ...selected.experienceSelection as object, requestedExperienceId: experience.experienceId, requestedSlotId: experience.slots[0]!.slotId } });
  await expect.element(page.getByRole('button', { name: 'Review my trip', exact: true })).toBeVisible();
  const selection = (selected.experienceSelection as { selection: DemoExperienceSelection }).selection;
  expect(bridge.add).toHaveBeenCalledExactlyOnceWith({ experienceId: experience.experienceId, slotId: experience.slots[0].slotId });
  await expect.poll(() => bridge.context.mock.lastCall?.[0].structuredContent.tripPlanning.missing).toEqual(['stay']);
  bridge.call.mockResolvedValue({ structuredContent: { ...review, experiences: [selection], missing: ['stay'] } });
  await page.getByRole('button', { name: 'Review my trip', exact: true }).click();
  await expect.element(page.getByRole('heading', { name: 'Your Tokyo plan' })).toBeVisible();
  await expect.element(page.getByRole('region', { name: 'Selected flight' })).toBeVisible();
  await expect.element(page.getByRole('region', { name: 'Selected experiences' })).toBeVisible();
  expect(bridge.call).toHaveBeenCalledTimes(3);
  expect(bridge.send).not.toHaveBeenCalled();
});

it('allows Back during a pending search, ignores its late answer, and uses a fresh review', async () => {
  bridge.call.mockResolvedValue({ structuredContent: review });
  let resolve!: (value: unknown) => void;
  bridge.search.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await page.getByRole('button', { name: 'Explore experiences' }).click();
  await page.getByRole('button', { name: 'Back to your trip' }).click();
  await expect.element(page.getByRole('heading', { name: 'Your Tokyo plan' })).toBeVisible();
  resolve({ structuredContent: experienceSearch().experienceResult });
  await expect.element(page.getByRole('heading', { name: 'Your Tokyo plan' })).toBeVisible();
  expect(document.querySelector('.cc-experience-card')).toBeNull();
  expect(bridge.call).toHaveBeenCalledTimes(3);
  expect(bridge.send).not.toHaveBeenCalled();
});

it('handles failed and malformed searches with retry and uses explicit dates without chat support', async () => {
  bridge.followUp = false;
  bridge.call.mockResolvedValue({ structuredContent: { ...review, planningContext: { ...review.planningContext, activityDates: { startDate: '2026-10-11', endDate: '2026-10-13' } } } });
  bridge.search.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ structuredContent: { status: 'success' } }).mockImplementationOnce(input => Promise.resolve({ structuredContent: experienceSearch(input).experienceResult }));
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByRole('button', { name: 'Find a stay' })).toBeDisabled();
  await page.getByRole('button', { name: 'Explore experiences' }).click();
  await expect.element(page.getByText(/Experience ideas could not load/)).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect.element(page.getByText(/The experience result was incomplete/)).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect.element(page.getByRole('heading', { name: 'Tokyo experience ideas' })).toBeVisible();
  expect(bridge.search).toHaveBeenCalledTimes(3);
  expect(bridge.search).toHaveBeenLastCalledWith(expect.objectContaining({ startDate: '2026-10-11', endDate: '2026-10-13' }));
  expect(document.body.textContent).not.toContain('Using your flight date as a starting point');
  await expect.element(page.getByText(/Using your trip-planning dates as a starting point/)).toBeVisible();
  expect(document.body.textContent).not.toContain('Using your activity or stay dates');
  await expect.poll(() => bridge.context.mock.lastCall?.[0].structuredContent.experienceBrowsing?.dateBasis).toBe('trip_dates_suggestion');
  expect(bridge.send).not.toHaveBeenCalled();
});

it('keeps both widget copy and model context provisional when optional dates echo the flight day', async () => {
  bridge.call.mockResolvedValue({ structuredContent: { ...review, planningContext: { ...review.planningContext, activityDates: { startDate: '2026-10-10', endDate: '2026-10-11' } } } });
  bridge.search.mockImplementation(input => Promise.resolve({ structuredContent: experienceSearch(input).experienceResult }));
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await page.getByRole('button', { name: 'Explore experiences' }).click();
  await expect.element(page.getByRole('heading', { name: 'Tokyo experience ideas' })).toBeVisible();
  await expect.element(page.getByText(/Using your flight date as a starting point/)).toBeVisible();
  expect(document.body.textContent).not.toContain('Using your activity or stay dates');
  await expect.poll(() => bridge.context.mock.lastCall?.[0].structuredContent.experienceBrowsing?.dateBasis).toBe('flight_date_suggestion');
  expect(bridge.search).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ startDate: '2026-10-10', endDate: '2026-10-11' }));
  expect(bridge.send).not.toHaveBeenCalled();
});

it('shows the existing honest empty state for an unsupported city and preserves Back', async () => {
  bridge.call.mockResolvedValue({ structuredContent: { ...review, planningContext: { ...review.planningContext, destination: 'Madrid' } } });
  bridge.search.mockImplementation(input => Promise.resolve({ structuredContent: experienceSearch(input).experienceResult }));
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await page.getByRole('button', { name: 'Explore experiences' }).click();
  await expect.element(page.getByRole('heading', { name: 'No demo catalog for Madrid yet' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to your trip' }).click();
  await expect.element(page.getByRole('heading', { name: 'Your Madrid plan' })).toBeVisible();
  expect(bridge.send).not.toHaveBeenCalled();
});

const stayInput = { destination: 'LIS', countryCode: 'PT', checkInDate: '2026-09-18', checkOutDate: '2026-09-21', adults: 2, children: 0, rooms: 1, currency: 'CAD' } as const;
const stayResult: DemoHotelSearchOutput = {
  status: 'success', dataSource: 'illustrative', searchId: `hsearch_${'b'.repeat(32)}`, searchContext: stayInput,
  message: 'Three illustrative Lisbon stays.', disclosure: 'Illustrative stays, not live availability. Nothing reserved.', fallback: 'Three illustrative stays in Lisbon, no room held or booked.',
  hotels: Array.from({ length: 3 }, (_, index) => ({
    selectionId: `hsel_${String(index).padStart(32, '0')}`, dataSource: 'illustrative', name: `Lisbon Test Stay ${index + 1}`, city: 'Lisbon', countryCode: 'PT', neighborhood: 'Baixa',
    description: 'An illustrative central stay.', roomName: 'King room', category: 4, amenities: ['Wi-Fi'], nights: 3, rooms: 1,
    nightlyPrice: { amount: 200, currency: 'CAD' }, staySubtotal: { amount: 600, currency: 'CAD' }, taxesAndFeesIncluded: false, policySummary: 'Illustrative cancellation terms; no reservation.',
  })),
};
const flightReview: DemoTripReview = {
  ...review, status: 'ready', missing: ['stay', 'experiences'],
  planningContext: { source: 'flight', dateBasis: 'flight_departure', destination: 'LIS', countryCode: 'PT', startDate: stayInput.checkInDate, endDate: stayInput.checkOutDate, adults: 2, currency: 'CAD' },
};
const chosenHotel = stayResult.hotels[0]!;
const stayReview: DemoTripReview = {
  ...flightReview, flight: undefined, missing: ['flight', 'experiences'],
  stay: { selectionId: chosenHotel.selectionId, propertyName: chosenHotel.name, city: chosenHotel.city, checkInDate: stayInput.checkInDate, checkOutDate: stayInput.checkOutDate, nights: 3, rooms: 1, staySubtotal: chosenHotel.staySubtotal, dataSource: 'illustrative' },
  planningContext: { source: 'stay', dateBasis: 'stay', destination: 'Lisbon', countryCode: 'PT', propertyName: chosenHotel.name, startDate: stayInput.checkInDate, endDate: stayInput.checkOutDate, adults: 2, currency: 'CAD' },
};

it('finds stays inline with known dates, acknowledges selection, and preserves the flight in review', async () => {
  await page.viewport(900, 1200);
  bridge.call.mockResolvedValue({ structuredContent: flightReview });
  let resolve!: (value: unknown) => void;
  bridge.hotels.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await page.getByRole('button', { name: 'Find a stay' }).click();
  await expect.element(page.getByRole('button', { name: 'Back to your trip' })).toBeEnabled();
  await expect.element(page.getByRole('status')).toHaveTextContent('Finding stays');
  expect(document.querySelectorAll('.cc-stay-skeleton')).toHaveLength(3);
  expect(bridge.hotels).toHaveBeenCalledExactlyOnceWith(stayInput);
  expect(bridge.send).not.toHaveBeenCalled();
  resolve({ structuredContent: stayResult });
  await expect.element(page.getByRole('button', { name: `View stay: ${chosenHotel.name}` })).toBeVisible();
  await expect.element(page.getByText(/Using your flight dates as a starting point/)).toBeVisible();
  expect(bridge.selectHotel).not.toHaveBeenCalled();
  await page.screenshot({ path: '__screenshots__/direct-trip-stays-desktop.png', fullPage: true });
  await page.viewport(320, 1000);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  await page.screenshot({ path: '__screenshots__/direct-trip-stays-mobile.png', fullPage: true });
  await page.viewport(900, 1200);
  await page.getByRole('button', { name: `View stay: ${chosenHotel.name}` }).click();
  let acknowledge!: (value: unknown) => void;
  bridge.selectHotel.mockImplementationOnce(() => new Promise(done => { acknowledge = done; }));
  await page.getByRole('button', { name: 'Choose this stay' }).click();
  await expect.element(page.getByRole('button', { name: 'Back to your trip' })).toBeDisabled();
  acknowledge({ structuredContent: { status: 'selected', selectionId: chosenHotel.selectionId } });
  await expect.element(page.getByText('Stay added to your trip', { exact: true })).toBeVisible();
  await expect.poll(() => bridge.context.mock.lastCall?.[0].structuredContent.tripPlanning).toMatchObject({ staySelectionId: chosenHotel.selectionId, flightSelectionId: review.flight.selectionId, missing: ['experiences'] });
  bridge.call.mockResolvedValue({ structuredContent: { ...stayReview, flight: flightReview.flight, missing: ['experiences'] } });
  await page.getByRole('button', { name: 'Review my trip', exact: true }).click();
  await expect.element(page.getByRole('region', { name: 'Selected stay' })).toBeVisible();
  await expect.element(page.getByRole('region', { name: 'Selected flight' })).toBeVisible();
  expect(bridge.selectHotel).toHaveBeenCalledExactlyOnceWith({ selectionId: chosenHotel.selectionId });
  expect(bridge.send).not.toHaveBeenCalled();
});

it('continues a hotel-only plan inline without the failing generic conversation request', async () => {
  bridge.call.mockResolvedValue({ structuredContent: stayReview });
  bridge.search.mockImplementation(input => Promise.resolve({ structuredContent: experienceSearch(input).experienceResult }));
  // A failing chat transport must not block an inline continuation.
  mount();
  bridge.send.mockRejectedValue(new Error('Request Failed'));
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByRole('button', { name: 'Find flights' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Explore experiences' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue planning' }).click();
  await expect.element(page.getByRole('heading', { name: 'Lisbon experience ideas' })).toBeVisible();
  expect(bridge.search).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ destination: 'Lisbon', startDate: stayInput.checkInDate, endDate: stayInput.checkOutDate }));
  expect(bridge.send).not.toHaveBeenCalled();
  expect(bridge.hotels).not.toHaveBeenCalled();
});

it.each(['Continue planning', 'Find a stay'])('refreshes a stale plan before %s so an already selected stay is not searched again', async label => {
  bridge.call.mockResolvedValueOnce({ structuredContent: flightReview }).mockResolvedValue({ structuredContent: { ...stayReview, flight: flightReview.flight, missing: ['experiences'] } });
  bridge.search.mockImplementation(input => Promise.resolve({ structuredContent: experienceSearch(input).experienceResult }));
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await page.getByRole('button', { name: label }).click();
  if (label === 'Continue planning') await expect.element(page.getByRole('heading', { name: 'Lisbon experience ideas' })).toBeVisible();
  else {
    await expect.element(page.getByText('That part of your trip is already selected. Your current plan is shown here.')).toBeVisible();
    expect(document.body.textContent).not.toContain('Request failed');
    await expect.element(page.getByRole('region', { name: 'Selected stay' })).toBeVisible();
  }
  expect(bridge.hotels).not.toHaveBeenCalled();
  expect(bridge.send).not.toHaveBeenCalled();
});

it('guards duplicate navigation and failed state reads without changing selections or starting a search', async () => {
  let resolve!: (value: unknown) => void;
  bridge.call.mockResolvedValueOnce({ structuredContent: flightReview }).mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValue({ structuredContent: flightReview });
  bridge.hotels.mockResolvedValue({ structuredContent: stayResult });
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await page.getByRole('button', { name: 'Continue planning' }).click();
  await expect.element(page.getByRole('button', { name: 'Continue planning' })).toBeDisabled();
  await expect.element(page.getByRole('button', { name: 'Find a stay' })).toBeDisabled();
  expect(bridge.call).toHaveBeenCalledTimes(2);
  resolve({ isError: true });
  await expect.element(page.getByText(/Your current selections could not be checked/)).toBeVisible();
  expect(bridge.hotels).not.toHaveBeenCalled();
  expect(bridge.send).not.toHaveBeenCalled();
  await page.getByRole('button', { name: 'Continue planning' }).click();
  await expect.element(page.getByRole('button', { name: `View stay: ${chosenHotel.name}` })).toBeVisible();
  expect(bridge.hotels).toHaveBeenCalledTimes(1);
});

it('ignores a late hotel result after Back and offers retry for failed or malformed results', async () => {
  bridge.call.mockResolvedValue({ structuredContent: flightReview });
  let resolve!: (value: unknown) => void;
  bridge.hotels.mockImplementationOnce(() => new Promise(done => { resolve = done; }))
    .mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ structuredContent: { status: 'success' } })
    .mockResolvedValueOnce({ structuredContent: { ...stayResult, status: 'empty', hotels: [] } });
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await page.getByRole('button', { name: 'Find a stay' }).click();
  await page.getByRole('button', { name: 'Back to your trip' }).click();
  resolve({ structuredContent: stayResult });
  await expect.element(page.getByRole('heading', { name: 'Your LIS plan' })).toBeVisible();
  expect(document.querySelector('.cc-stay-card')).toBeNull();
  await page.getByRole('button', { name: 'Find a stay' }).click();
  await expect.element(page.getByText(/Stays could not load/)).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect.element(page.getByText(/The hotel result was incomplete/)).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect.element(page.getByText('No stays found', { exact: true })).toBeVisible();
  expect(bridge.send).not.toHaveBeenCalled();
});

it('keeps the selected stay and offers chat recovery when an explicit flight follow-up fails', async () => {
  bridge.call.mockResolvedValue({ structuredContent: stayReview });
  mount();
  bridge.send.mockRejectedValue(new Error('Request Failed'));
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await page.getByRole('button', { name: 'Find flights' }).click();
  await expect.element(page.getByText('The conversation could not be opened. Please type your request in the chat.')).toBeVisible();
  await expect.element(page.getByRole('region', { name: 'Selected stay' })).toBeVisible();
  expect(bridge.send).toHaveBeenCalledExactlyOnceWith({ prompt: expect.stringContaining('Find flights to Lisbon') });
});
