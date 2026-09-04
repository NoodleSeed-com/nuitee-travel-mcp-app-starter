import { type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import type { DemoHomeOutput, DemoTripReview } from '../../src/demo-schemas.js';

const bridge = vi.hoisted(() => ({ output: {} as unknown }));
vi.mock('../../src/helpers.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/helpers.js')>(),
  useWidgetReady: () => true,
  useLayout: () => ({ theme: 'dark', locale: 'en-CA', supports: {} }),
  useToolInfo: () => ({ structuredContent: bridge.output }),
  useSendFollowUpMessage: () => vi.fn(),
}));

import TravelHome from '../../src/views/travel-home.js';
import LoyaltyOverview from '../../src/views/loyalty-overview.js';

// Synthetic browser inputs exercise the live result shape, not live inventory.
const liveHome: DemoHomeOutput = {
  status: 'ready', brand: 'Wayfare',
  message: 'Compare current flights and stays with illustrative rewards.',
  disclosure: 'Flights and stays use connected providers; rewards are illustrative. Booking is unavailable.',
  domains: [
    { name: 'Flights', availability: 'available', label: 'Current flights' },
    { name: 'Stays', availability: 'available', label: 'Current stays' },
    { name: 'Loyalty', availability: 'illustrative', label: 'Illustrative rewards' },
    { name: 'Ground travel', availability: 'coming_soon', label: 'Coming soon' },
    { name: 'Experiences', availability: 'coming_soon', label: 'Coming soon' },
  ],
  fallback: 'Compare current flights and stays; rewards remain illustrative and booking is unavailable.',
};

const review: DemoTripReview = {
  status: 'incomplete', dataSource: 'illustrative', missing: ['flight'],
  disclosure: 'A provider stay selection with illustrative rewards; no booking or payment has occurred.',
  fallback: 'A stay is selected. Choose a flight to continue; nothing has been booked, paid or redeemed.',
  stay: {
    dataSource: 'live_nuitee', selectionId: 'hsel_0123456789abcdef0123456789abcdef',
    propertyName: 'Synthetic browser stay', city: 'Lisbon',
    checkInDate: '2030-04-20', checkOutDate: '2030-04-23', nights: 3, rooms: 1,
    staySubtotal: { amount: 720, currency: 'CAD' },
  },
  loyalty: {
    status: 'success', dataSource: 'illustrative',
    disclosure: 'This rewards profile is synthetic; no real member account was accessed.',
    fallback: 'A synthetic rewards profile for a browser test, not a real account or redeemable points.',
    member: { displayName: 'Preview traveler', reference: 'WAYFARE-PREVIEW-0001', tier: 'Explorer concept tier', pointsBalance: 42_500 },
    progress: { label: 'Illustrative trip progress', current: 3, target: 5 },
    benefits: [{ name: 'Planning preview', description: 'An illustrative benefit with no account action.' }],
    illustrativePointsValue: { points: 25_000, value: { amount: 125, currency: 'CAD' }, explanation: 'Synthetic value only, not a redemption offer or current program policy.' },
  },
};

let root: Root | undefined;
let host: HTMLDivElement | undefined;
function mount(output: unknown, view: ReactElement) {
  bridge.output = output;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  root.render(view);
}

afterEach(() => {
  root?.unmount(); host?.remove(); root = undefined; host = undefined;
  bridge.output = {};
});

describe('live output provenance through the widget boundary', () => {
  it('renders the expanded live home on a narrow dark host without changing its owned light theme', async () => {
    await page.viewport(320, 1_000);
    mount(liveHome, <TravelHome />);
    await expect.element(page.getByRole('heading', { name: 'Travel capabilities' })).toBeVisible();
    await expect.element(page.getByText('Current stays', { exact: true })).toBeVisible();
    expect(document.body.textContent).not.toContain('result was incomplete');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    const app = document.querySelector<HTMLElement>('.cc-app')!;
    expect(getComputedStyle(app).colorScheme).toContain('light');
    expect(app.getAttribute('data-llm')).toBe(liveHome.fallback);
    await page.screenshot({ path: '__screenshots__/p6-live-home-320.png', element: app });
  });

  it('renders a live stay with truthful provenance and a non-booking boundary', async () => {
    await page.viewport(320, 1_400);
    mount(review, <LoyaltyOverview />);
    await expect.element(page.getByRole('heading', { name: 'Synthetic browser stay' })).toBeVisible();
    const stay = document.querySelector<HTMLElement>('.cc-loyalty-selection')!;
    expect(stay.textContent).toMatch(/Nuitee.*hotel selection/i);
    expect(stay.textContent).not.toContain('Simulated hotel selection');
    expect(document.body.textContent).toContain('nothing booked, held, paid, or redeemed');
    expect(document.body.textContent).not.toContain('with simulated hotels');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    expect(document.querySelector('.cc-app')?.getAttribute('data-llm')).toBe(review.fallback);
    await page.screenshot({ path: '__screenshots__/p6-live-review-320.png', element: document.querySelector('.cc-app')! });
  });

  it('keeps illustrative stays explicitly simulated without claiming provider-backed hotel facts', async () => {
    mount({ ...review, stay: { ...review.stay!, dataSource: 'illustrative' } }, <LoyaltyOverview />);
    await expect.element(page.getByText('Simulated hotel selection', { exact: true })).toBeVisible();
    expect(document.body.textContent).not.toContain('Flight and stay results come from connected providers');
  });

  it('rejects an unsupported stay source at the bridge boundary', async () => {
    mount({ ...review, stay: { ...review.stay!, dataSource: 'unverified_vendor' } }, <LoyaltyOverview />);
    await expect.element(page.getByText('The result was incomplete, so no balance, benefit, or trip value was inferred.')).toBeVisible();
    expect(document.body.textContent).not.toContain('Synthetic browser stay');
  });
});
