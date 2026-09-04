import { createRoot, type Root } from 'react-dom/client';
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import HotelResults, { HotelResultsView } from '../../src/views/hotel-results.js';
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
afterEach(() => { root?.unmount(); document.body.innerHTML = ''; delete globals.__noodleReactBridge; delete globals.__noodleState; });

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
    setWidgetState: (patch: Record<string, unknown>) => { Object.assign(saved, patch); window.dispatchEvent(new Event('noodle:state')); },
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
