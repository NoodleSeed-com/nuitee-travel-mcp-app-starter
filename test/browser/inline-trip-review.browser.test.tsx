import { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
const bridge = vi.hoisted(() => ({ call: vi.fn(), search: vi.fn(), add: vi.fn(), send: vi.fn(), context: vi.fn(), followUp: true }));
vi.mock('../../src/helpers.js', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/helpers.js')>(),
  useWidgetReady: () => true,
  useLayout: () => ({ locale: 'en-CA', displayMode: 'inline', supports: { followUpMessage: bridge.followUp, modelContext: true } }),
  useCallTool: (name: string) => ({ callToolAsync: name === 'search_experiences' ? bridge.search : name === 'add_experience_to_trip' ? bridge.add : bridge.call }),
  useViewState: (_key: string, initial: unknown) => useState(initial),
  useSendFollowUpMessage: () => bridge.send,
  useUpdateModelContext: () => bridge.context,
}));
import { InlineTripReview } from '../../src/views/trip-review.js';
import { runDemoGateway } from '../../src/demo-runtime.js';
import { DEMO_EXPERIENCE_ALIASES, DEMO_EXPERIENCE_CATALOG } from '../../src/experience-fixtures.js';
import type { DemoExperienceSearchOutput, DemoExperienceSelection } from '../../src/demo-schemas.js';

const review = {
  status: 'ready', experiences: [], missing: ['stay', 'experiences'],
  flight: { selectionId: `sel_${'a'.repeat(32)}`, searchPrice: { total: 1200, currency: 'CAD' }, disclosure: 'Flight fare still needs verification.' },
  planningContext: { source: 'flight', dateBasis: 'flight_departure', destination: 'Tokyo', startDate: '2026-10-10', adults: 2, currency: 'CAD' },
  fallback: 'One flight selected. Stays and experiences remain optional.',
  disclosure: 'A plan only; nothing reserved or paid.',
};
let root: Root | undefined;
afterEach(() => { root?.unmount(); root = undefined; document.body.innerHTML = ''; vi.resetAllMocks(); bridge.followUp = true; });
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
  expect(bridge.send).toHaveBeenCalledWith({ prompt: expect.stringContaining('Do not repeat the trip review') });
  await page.getByRole('button', { name: 'Back to flight' }).click();
  await expect.element(page.getByRole('button', { name: 'Review my trip' })).toHaveFocus();
  bridge.call.mockResolvedValue({ structuredContent: { ...review, flight: { ...review.flight, searchPrice: { total: 1350, currency: 'CAD' } } } });
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByText('$1,350.00', { exact: true })).toBeVisible();
  expect(bridge.call).toHaveBeenCalledTimes(2);
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

it('still hands stay searches to the conversation once, without another inline review call', async () => {
  bridge.call.mockResolvedValue({ structuredContent: review });
  mount();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByRole('heading', { name: 'Your Tokyo plan' })).toBeVisible();
  for (const [index, label] of ['Find a stay'].entries()) {
    await page.getByRole('button', { name: label }).click();
    expect(bridge.send).toHaveBeenCalledTimes(index + 1);
    expect(bridge.send).toHaveBeenLastCalledWith({ prompt: expect.stringContaining('Do not repeat the trip review, display another plan card, or recheck my flight fare for this search') });
    expect(bridge.send).toHaveBeenLastCalledWith({ prompt: expect.stringContaining('one short question for only the missing') });
    expect(bridge.call).toHaveBeenCalledExactlyOnceWith({});
  }
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
  expect(bridge.search).toHaveBeenCalledExactlyOnceWith({ destination: 'Tokyo', startDate: '2026-10-10', endDate: '2026-10-11', adults: 2, children: 0, currency: 'CAD', accessibility: 'ANY' });
  expect(bridge.call).toHaveBeenCalledTimes(1);
  resolveSearch({ structuredContent: searched.experienceResult });
  await expect.element(page.getByRole('heading', { name: 'Tokyo experience ideas' })).toBeVisible();
  expect(document.querySelectorAll('.cc-experience-card')).toHaveLength(3);
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
  expect(bridge.call).toHaveBeenCalledTimes(2);
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
  expect(bridge.call).toHaveBeenCalledTimes(2);
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
