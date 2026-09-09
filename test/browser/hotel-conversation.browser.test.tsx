import { createRoot, type Root } from 'react-dom/client';
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import HotelResults, { HotelResultsView } from '../../src/views/hotel-results.js';
import OpenHotel from '../../src/views/open-hotel.js';
import { runDemoGateway } from '../../src/demo-runtime.js';
import type { DemoHotelSearchOutput } from '../../src/demo-schemas.js';

const result: DemoHotelSearchOutput = {
  status: 'success', dataSource: 'illustrative',
  searchId: 'hsearch_0123456789abcdef0123456789abcdef',
  disclosure: 'Illustrative stays. No live availability was checked and booking is unavailable.',
  message: 'Four illustrative stays.', fallback: 'Four illustrative stays in Lisbon; nothing is held or booked.',
  searchContext: { destination: 'Lisbon', checkInDate: '2030-04-20', checkOutDate: '2030-04-23', adults: 2, children: 0, rooms: 1, currency: 'CAD' },
  hotels: Array.from({ length: 4 }, (_, i) => ({
    selectionId: `hsel_${String(i).padStart(32, '0')}`, dataSource: 'illustrative',
    name: `Lantern Hotel ${i + 1}`, city: 'Lisbon', countryCode: 'PT', neighborhood: 'Baixa',
    lat: 38.71 + i / 1000, lng: -9.13, description: 'An illustrative central stay.', roomName: 'King room',
    category: 4, amenities: ['Wi-Fi'], nights: 3, rooms: 1,
    nightlyPrice: { amount: 200 + i, currency: 'CAD' }, staySubtotal: { amount: 600 + i * 3, currency: 'CAD' },
    taxesAndFeesIncluded: false, policySummary: 'Illustrative cancellation terms; not a reservation.',
  })),
};
let root: Root;
function mount(props: Partial<Parameters<typeof HotelResultsView>[0]> = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  function Journey() {
    const [selected, setSelected] = useState<string>();
    return <HotelResultsView result={result} displayMode="inline" selectedSelectionId={selected} onAdd={setSelected} {...props} />;
  }
  root.render(<Journey />);
}
const globals = globalThis as unknown as Record<string, unknown>;
afterEach(() => { root?.unmount(); document.body.innerHTML = ''; delete globals.__noodleReactBridge; delete globals.__noodleState; delete globals.__noodleReactVersion; });

function notifyViewStateChange() {
  // Match the host bridge: React's external-store subscription reads this version.
  globals.__noodleReactVersion = Number(globals.__noodleReactVersion ?? 0) + 1;
  window.dispatchEvent(new Event('noodle:state'));
}

function mountOpened(output: unknown) {
  const calls: string[] = [];
  const saved: Record<string, unknown> = {};
  const hotel = result.hotels[3]!;
  const review = runDemoGateway({ kind: 'review', flightState: {}, hotelState: {
    activeSelectionId: hotel.selectionId,
    records: [{ selectionId: hotel.selectionId, searchId: result.searchId, dataSource: 'illustrative', propertyName: hotel.name, city: hotel.city,
      checkInDate: result.searchContext.checkInDate, checkOutDate: result.searchContext.checkOutDate, nights: hotel.nights, rooms: hotel.rooms, staySubtotal: hotel.staySubtotal }],
  }, loyalty: {} }).review;
  globals.__noodleReactBridge = {
    getToolResult: () => ({ structuredContent: output }),
    getLayout: () => ({ theme: 'light', displayMode: 'inline', supports: {} }),
    getViewState: () => saved,
    setWidgetState: (patch: Record<string, unknown>) => { Object.assign(saved, patch); notifyViewStateChange(); },
    callServerTool: async (request: { name: string; arguments: { selectionId?: string } }) => {
      calls.push(request.name);
      if (request.name === 'review_trip') return { structuredContent: review };
      expect(request.name).toBe('select_hotel');
      expect(request.arguments.selectionId).toBe(hotel.selectionId);
      return { structuredContent: { status: 'selected', selectionId: hotel.selectionId } };
    },
  };
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  root.render(<OpenHotel />);
  return calls;
}

it('opens a requested later stay directly, preserves Back, then chooses and reviews inline', async () => {
  await page.viewport(900, 1200);
  const hotel = result.hotels[3]!;
  const calls = mountOpened({ status: 'ready', message: 'The requested hotel is open. Nothing selected.', result: { ...result, hotels: [hotel] }, focusedSelectionId: hotel.selectionId });
  await expect.element(page.getByRole('heading', { name: hotel.name })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Choose this stay' })).toBeEnabled();
  expect(document.querySelector('.cc-stay-card')).toBeNull();
  expect(calls).toEqual([]);
  await page.getByRole('button', { name: 'Back to stays', exact: true }).click();
  await expect.element(page.getByRole('heading', { name: 'Stays for your trip' })).toBeVisible();
  await page.getByRole('button', { name: `View stay: ${hotel.name}` }).click();
  await page.getByRole('button', { name: 'Choose this stay' }).click();
  await expect.element(page.getByText('Stay added to your trip', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review my trip' }).click();
  await expect.element(page.getByRole('heading', { name: 'Your Lisbon plan' })).toBeVisible();
  expect(calls).toEqual(['select_hotel', 'review_trip']);
  await page.getByRole('button', { name: 'Back to stays' }).click();
  await expect.element(page.getByRole('button', { name: 'Selected', exact: true })).toBeVisible();
});

it('shows matching cards for ambiguity and no selection controls for a missing hotel', async () => {
  mountOpened({ status: 'ready', message: 'Two hotels match that name.', result: { ...result, hotels: result.hotels.slice(0, 2) } });
  await expect.element(page.getByRole('heading', { name: 'Stays for your trip' })).toBeVisible();
  expect(document.querySelectorAll('.cc-stay-card')).toHaveLength(2);
  expect(document.querySelector('.cc-stay-detail')).toBeNull();
  root.unmount(); document.body.innerHTML = '';
  const calls = mountOpened({ status: 'not_found', message: 'That hotel is not in the current returned results.' });
  await expect.element(page.getByText('That hotel is not in the current returned results.')).toBeVisible();
  expect(document.querySelector('.cc-stay-card, .cc-stay-detail')).toBeNull();
  expect(calls).toEqual([]);
});

it('hides hotel scrollbars while retaining centered mid-card arrows and keyboard scrolling', async () => {
  await page.viewport(900, 1200);
  mount();
  await expect.element(page.getByRole('button', { name: 'Next stay', exact: true })).toBeEnabled();
  const track = document.querySelector<HTMLElement>('.cc-card-carousel-track')!;
  const card = document.querySelector<HTMLElement>('.cc-stay-card')!;
  expect(getComputedStyle(track).scrollbarWidth).toBe('none');
  for (const button of document.querySelectorAll<HTMLElement>('.cc-card-carousel-nav button')) {
    const rect = button.getBoundingClientRect(), icon = button.querySelector('.cc-icon')!.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    expect(Math.abs(rect.top + rect.height / 2 - cardRect.top - cardRect.height / 2)).toBeLessThanOrEqual(8);
    expect(Math.abs(rect.left + rect.width / 2 - icon.left - icon.width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(rect.top + rect.height / 2 - icon.top - icon.height / 2)).toBeLessThanOrEqual(1);
  }
  await page.getByRole('button', { name: 'Next stay', exact: true }).click();
  await expect.poll(() => track.scrollLeft).toBeGreaterThan(0);
  track.focus();
  await userEvent.keyboard('{Home}');
  // Scroll snapping may settle at the first card's 2px focus-ring inset.
  await expect.element(page.getByRole('button', { name: 'Previous stay', exact: true })).toBeDisabled();
  expect(Math.abs(card.getBoundingClientRect().left - track.getBoundingClientRect().left)).toBeLessThanOrEqual(3);
  await page.screenshot({ path: '__screenshots__/hotel-carousel.png', fullPage: true });
});

it('starts with three inspectable stays instead of inline comparison and match controls', async () => {
  mount();
  await expect.element(page.getByRole('button', { name: `View stay: ${result.hotels[0]!.name}` })).toBeVisible();
  const cards = [...document.querySelectorAll('.cc-stay-card')];
  expect(cards).toHaveLength(Math.min(3, result.hotels.length));
  for (const card of cards) expect(card.querySelectorAll('button')).toHaveLength(1);
  expect(document.querySelector('.cc-match-score-button')).toBeNull();
  expect(document.querySelector('[role="radiogroup"]')).toBeNull();
  expect(document.querySelector('.cc-map-board')).toBeNull();
});

it('reveals one stay, selects it, and restores the shortlist without blue card fill', async () => {
  mount();
  await page.getByRole('button', { name: `View stay: ${result.hotels[0]!.name}` }).click();
  await expect.element(page.getByRole('button', { name: 'Choose this stay' })).toBeVisible();
  await expect.element(page.getByText(result.hotels[0]!.roomName, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Choose this stay' }).click();
  const selected = page.getByRole('button', { name: 'Selected', exact: true });
  await expect.element(selected).toBeVisible();
  await expect.poll(async () => getComputedStyle(await selected.element()).backgroundColor).toBe('rgb(102, 204, 255)');
  expect(getComputedStyle(document.querySelector('.cc-stay-detail')!).backgroundColor).toBe('rgb(255, 255, 255)');
  await expect.element(page.getByText(/Nothing was booked, held, or paid/)).toBeVisible();
  await page.getByRole('button', { name: 'Back to stays' }).click();
  await expect.element(page.getByRole('button', { name: `View selected stay: ${result.hotels[0]!.name}` })).toBeVisible();
});

it('keeps cancellation and tax qualifiers visible before inspection', async () => {
  mount();
  await expect.element(page.getByRole('button', { name: `View stay: ${result.hotels[0]!.name}` })).toBeVisible();
  const first = document.querySelector('.cc-stay-card')!;
  expect(first.textContent).toContain(result.hotels[0]!.policySummary);
  expect(first.textContent).toContain('Taxes and fees not included');
});

it('does not turn a request for optional exploration into an inline map', async () => {
  mount();
  await page.getByRole('button', { name: 'Explore stays' }).click();
  await expect.element(page.getByText(/Map exploration needs an expanded view/)).toBeVisible();
  expect(document.querySelector('.cc-map-board')).toBeNull();
  await expect.element(page.getByRole('button', { name: 'Back to stays' })).toBeVisible();
});

it('keeps the initial mobile shortlist within the page at 320px', async () => {
  await page.viewport(320, 800);
  mount();
  await expect.element(page.getByRole('button', { name: `View stay: ${result.hotels[0]!.name}` })).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  const button = await page.getByRole('button', { name: `View stay: ${result.hotels[0]!.name}` }).element();
  expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
});

it('adapts host-styled hotels to dark mode without changing the Wayfare surface', async () => {
  mount({ appearance: 'host', theme: 'dark' });
  await expect.element(page.getByRole('button', { name: `View stay: ${result.hotels[0]!.name}` })).toBeVisible();
  const style = getComputedStyle(document.querySelector('.cc-hotel-results')!);
  expect(style.colorScheme).toBe('dark');
  expect(style.fontFamily).not.toContain('Host Grotesk');
  expect(style.getPropertyValue('--surface-primary').trim()).not.toBe('#FFFFFF');
});

it('reveals more returned results only when requested', async () => {
  mount();
  await page.getByRole('button', { name: 'Show 1 more stay', exact: true }).click();
  await expect.element(page.getByRole('button', { name: 'View stay: Lantern Hotel 4' })).toBeVisible();
  expect(document.querySelectorAll('.cc-stay-card')).toHaveLength(4);
});

it('keeps expanded host map controls readable and returns to the compact flow', async () => {
  let returned = false;
  mount({ appearance: 'host', theme: 'dark', displayMode: 'fullscreen', onReturn: () => { returned = true; } });
  await page.getByRole('button', { name: 'Explore stays' }).click();
  await expect.poll(() => document.querySelectorAll('.cc-map-choice').length).toBe(4);
  for (const choice of document.querySelectorAll('.cc-map-choice')) {
    expect(getComputedStyle(choice).backgroundColor).toBe('rgb(33, 33, 33)');
    expect(getComputedStyle(choice).color).toBe('rgb(243, 243, 243)');
  }
  await page.getByRole('button', { name: 'Back to stays' }).click();
  await expect.element(page.getByRole('button', { name: 'View stay: Lantern Hotel 1' })).toBeVisible();
  expect(returned).toBe(true);
});

it('compares two explicitly chosen stays without a map on an inline-only host', async () => {
  mount();
  await page.getByRole('button', { name: 'Explore stays' }).click();
  await page.getByRole('checkbox', { name: 'Lantern Hotel 1', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Lantern Hotel 2', exact: true }).click();
  await expect.element(page.getByRole('region', { name: 'Stay comparison' })).toBeVisible();
  expect(document.querySelectorAll('.cc-stay-comparison article')).toHaveLength(2);
  expect(document.querySelector('.cc-map-board')).toBeNull();
});

it('persists inspected stay and rejects mismatched helper acknowledgments', async () => {
  const saved: Record<string, unknown> = {};
  let mismatch = true;
  globals.__noodleReactBridge = {
    getToolResult: () => ({ structuredContent: result }),
    getLayout: () => ({ theme: 'light', displayMode: 'inline', supports: {} }),
    getViewState: () => saved,
    setWidgetState: (patch: Record<string, unknown>) => { Object.assign(saved, patch); notifyViewStateChange(); },
    callServerTool: async (request: { name: string; arguments: { selectionId: string } }) => {
      expect(request.name).toBe('select_hotel');
      expect(request.arguments.selectionId).toBe(result.hotels[0]!.selectionId);
      return { structuredContent: { status: 'selected', selectionId: mismatch ? result.hotels[1]!.selectionId : request.arguments.selectionId } };
    },
  };
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  root.render(<HotelResults />);
  await page.getByRole('button', { name: 'View stay: Lantern Hotel 1' }).click();
  root.unmount(); root = createRoot(container); root.render(<HotelResults />);
  await expect.element(page.getByRole('button', { name: 'Choose this stay' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose this stay' }).click();
  await expect.element(page.getByText(/That stay could not be selected/)).toBeVisible();
  expect(saved.selected_demo_hotel).toBeUndefined();
  mismatch = false;
  await page.getByRole('button', { name: 'Choose this stay' }).click();
  await expect.element(page.getByRole('button', { name: 'Selected', exact: true })).toBeVisible();
  expect(saved.selected_demo_hotel).toBe(result.hotels[0]!.selectionId);
});
