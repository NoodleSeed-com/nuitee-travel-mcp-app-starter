import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { useState, type ReactNode } from 'react';
import type { SearchOutput } from '../../src/flight-schemas.js';
import type { DemoHotelSearchOutput } from '../../src/demo-schemas.js';

const host = vi.hoisted(() => ({ result: undefined as unknown, calls: [] as string[] }));
vi.mock('../../src/helpers.js', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/helpers.js')>(),
  useWidgetReady: () => true,
  useLayout: () => ({ theme: 'light', displayMode: 'inline', locale: 'en-CA', supports: {} }),
  useToolInfo: () => ({ structuredContent: host.result }),
  useViewState: (_key: string, initial: unknown) => useState(initial),
  useAppFlow: () => {
    const [activeView, setView] = useState('results');
    return { activeView, navigate: setView, back: () => setView('results') };
  },
  useCallTool: (name: string) => ({
    status: 'idle', isPending: false, reset: () => undefined,
    callToolAsync: async ({ selectionId }: { selectionId: string }) => {
      host.calls.push(name);
      return { structuredContent: { status: 'selected', selectionId, message: 'Selected for planning, not booked.' } };
    },
  }),
  useSendFollowUpMessage: () => () => { throw new Error('Review must not send a chat message.'); },
  useUpdateModelContext: () => async () => undefined,
  useRequestDisplayMode: () => async () => undefined,
}));

// The shared review's tool loading/error/fresh-read behavior has its own tests.
// These tests prove each parent hands off locally and preserves its UI on return.
vi.mock('../../src/views/trip-review.js', () => ({
  InlineTripReview: ({ onBack, backLabel }: { onBack: () => void; backLabel: string }) => <section aria-label="Inline trip review"><h2>Your Lisbon plan</h2><button type="button" onClick={() => {
    onBack();
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-trip-review-trigger]')?.focus());
  }}>{backLabel}</button></section>,
}));
import HotelResults from '../../src/views/hotel-results.js';
import FlightResults, { FlightResultsView } from '../../src/views/flight-results.js';
import ExpandedFlightResults from '../../src/views/expanded-flight-results.js';

const flight: SearchOutput = {
  status: 'success', message: 'One fixture fare.', fallback: 'One fixture fare; not live inventory.',
  itineraries: [{
    selectionId: 'sel_0123456789abcdef0123456789abcdef',
    route: { origin: 'YYZ', destination: 'LIS' }, carrier: { name: 'Fixture Air', code: 'ZZ' },
    departureTime: '2030-04-20T09:00:00Z', arrivalTime: '2030-04-20T12:15:00Z', durationMinutes: 195, stops: 0,
    price: { total: 284.5, currency: 'CAD' }, baggage: { carryOn: true, checked: false, allowances: [] },
    retrievedAt: '2030-04-01T12:00:00Z', isCheapest: true, fare: {}, terms: {}, amenities: [], segments: [], messages: [],
    legs: [{ direction: 'OUTBOUND', route: { origin: 'YYZ', destination: 'LIS' }, departureTime: '2030-04-20T09:00:00Z', arrivalTime: '2030-04-20T12:15:00Z', durationMinutes: 195, stops: 0 }],
  }],
};
const stay: DemoHotelSearchOutput = {
  status: 'success', dataSource: 'illustrative', searchId: 'hsearch_0123456789abcdef0123456789abcdef',
  disclosure: 'Illustrative stays. No live availability was checked and booking is unavailable.',
  message: 'One illustrative stay.', fallback: 'One illustrative stay in Lisbon; nothing is held or booked.',
  searchContext: { destination: 'Lisbon', checkInDate: '2030-04-20', checkOutDate: '2030-04-23', adults: 2, children: 0, rooms: 1, currency: 'CAD' },
  hotels: [{
    selectionId: 'hsel_0123456789abcdef0123456789abcdef', dataSource: 'illustrative', name: 'Lantern Hotel', city: 'Lisbon', countryCode: 'PT', neighborhood: 'Baixa',
    description: 'An illustrative central stay.', roomName: 'King room', category: 4, amenities: ['Wi-Fi'], nights: 3, rooms: 1,
    nightlyPrice: { amount: 200, currency: 'CAD' }, staySubtotal: { amount: 600, currency: 'CAD' }, taxesAndFeesIncluded: false, policySummary: 'Illustrative cancellation terms; not a reservation.',
  }],
};
let root: Root;
function mount(element: ReactNode) {
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container); root.render(element);
}
afterEach(() => { root?.unmount(); document.body.innerHTML = ''; host.calls.length = 0; host.result = undefined; });

it('shows a hotel acknowledgment and returns from local review to the same selected detail', async () => {
  host.result = stay; mount(<HotelResults />);
  await expect.element(page.getByRole('button', { name: 'Review my trip' })).not.toBeInTheDocument();
  await page.getByRole('button', { name: 'View stay: Lantern Hotel' }).click();
  await expect.element(page.getByRole('button', { name: 'Choose this stay' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose this stay' }).click();
  await expect.element(page.getByText('Stay added to your trip', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByRole('heading', { name: 'Your Lisbon plan' })).toBeVisible();
  await expect.element(page.getByText('King room', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Back to stays', exact: true }).click();
  await expect.element(page.getByText('King room', { exact: true })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Selected', exact: true })).toBeDisabled();
  await expect.element(page.getByRole('button', { name: 'Review my trip' })).toHaveFocus();
  expect(host.calls).toEqual(['select_hotel']);
});

it('preserves the selected flight detail face when inline trip review returns', async () => {
  host.result = flight; mount(<ExpandedFlightResults />);
  await expect.element(page.getByRole('button', { name: 'Review my trip' })).not.toBeInTheDocument();
  await page.getByRole('button', { name: 'Select fare from YYZ to LIS with Fixture Air' }).click();
  await expect.element(page.getByText('Flight added to your trip', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Flight and fare details' }).click();
  await expect.element(page.getByRole('button', { name: 'Back to flight', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByRole('heading', { name: 'Your Lisbon plan' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Verify current fare from YYZ to LIS with Fixture Air' })).not.toBeInTheDocument();
  await page.getByRole('button', { name: 'Back to flights', exact: true }).click();
  await expect.element(page.getByRole('button', { name: 'Back to flight', exact: true })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Verify current fare from YYZ to LIS with Fixture Air' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Review my trip' })).toHaveFocus();
  expect(host.calls).toEqual(['select_flight_offer']);
});

it('keeps the flight-only starter free of an unavailable review action', async () => {
  host.result = flight; mount(<FlightResults />);
  await page.getByRole('button', { name: 'Select fare from YYZ to LIS with Fixture Air' }).click();
  await expect.element(page.getByRole('button', { name: 'Selected fare from YYZ to LIS with Fixture Air' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Review my trip' })).not.toBeInTheDocument();
});

it.each([320, 900])('keeps selected flight review and verification actions usable at %ipx', async width => {
  await page.viewport(width, 1000);
  const review = vi.fn(), verify = vi.fn();
  mount(<FlightResultsView result={flight} displayMode="inline" selectedSelectionId={flight.itineraries[0]!.selectionId} onReview={review} onVerify={verify} />);
  const action = page.getByRole('button', { name: 'Review my trip' });
  await expect.element(action).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await action.element()).getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(getComputedStyle(await action.element()).backgroundColor).toBe('rgb(13, 13, 13)');
  expect(getComputedStyle(await action.element()).color).toBe('rgb(255, 255, 255)');
  for (const child of (await action.element()).querySelectorAll('span')) expect(getComputedStyle(child).color).toBe('rgb(255, 255, 255)');
  const acknowledgment = document.querySelector('.cc-flight-selection-handoff > div[role="status"]')!;
  const title = acknowledgment.children[0]!.getBoundingClientRect(), price = acknowledgment.children[1]!.getBoundingClientRect();
  expect(price.top - title.bottom).toBeLessThanOrEqual(8);
  await page.screenshot({ path: `__screenshots__/selection-handoffs-flight-${width}.png`, fullPage: true });
  await action.click(); expect(review).toHaveBeenCalledOnce();
  await page.getByRole('button', { name: 'Verify current fare from YYZ to LIS with Fixture Air' }).click();
  expect(verify).toHaveBeenCalledWith(flight.itineraries[0]!.selectionId);
});

it.each([320, 900])('keeps the selected stay acknowledgment and review action readable at %ipx', async width => {
  await page.viewport(width, 1000);
  host.result = stay; mount(<HotelResults />);
  await page.getByRole('button', { name: 'View stay: Lantern Hotel' }).click();
  await page.getByRole('button', { name: 'Choose this stay' }).click();
  const action = page.getByRole('button', { name: 'Review my trip' });
  await expect.element(action).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await action.element()).getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  const icon = document.querySelector('.cc-stay-selected-note .cc-icon')!;
  expect(icon.getBoundingClientRect().width).toBe(20);
  expect(getComputedStyle(document.querySelector('.cc-hotel-journey')!).fontFamily).toContain('Host Grotesk');
  await page.screenshot({ path: `__screenshots__/selection-handoffs-hotel-${width}.png`, fullPage: true });
});
