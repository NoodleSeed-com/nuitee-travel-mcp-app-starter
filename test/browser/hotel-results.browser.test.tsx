import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import type { DemoHotel, DemoHotelSearchOutput } from '../../src/demo-schemas.js';
import { HotelResultsView } from '../../src/views/hotel-results.js';

const hotel = (index: number): DemoHotel => ({
  selectionId: `hsel_${String(index).padStart(32, '0')}`,
  dataSource: 'illustrative',
  name: `Tagus Lantern Hotel ${index + 1}`,
  city: 'Lisbon',
  countryCode: 'PT',
  neighborhood: 'Baixa concept district',
  description: 'An illustrative central stay created for a bounded comparison.',
  roomName: 'Lantern king room',
  category: 4,
  amenities: ['Breakfast preview', 'Rooftop concept', 'Wi-Fi'],
  nights: 3,
  rooms: 1,
  nightlyPrice: { amount: 286 + index, currency: 'CAD' },
  staySubtotal: { amount: (286 + index) * 3, currency: 'CAD' },
  taxesAndFeesIncluded: false,
  policySummary: 'Illustrative flexible terms; no transaction can be created.',
});

const result: DemoHotelSearchOutput = {
  status: 'success',
  dataSource: 'illustrative',
  disclosure: 'Illustrative stays — these fictional properties do not represent live availability. Booking is unavailable.',
  message: 'Four illustrative stays are available to compare for Lisbon.',
  fallback: 'Four illustrative Lisbon stays. No live availability was checked and booking is unavailable.',
  searchId: 'hsearch_0123456789abcdef0123456789abcdef',
  searchContext: {
    destination: 'Lisbon',
    checkInDate: '2030-04-20',
    checkOutDate: '2030-04-23',
    adults: 2,
    children: 0,
    rooms: 1,
    currency: 'CAD',
  },
  hotels: Array.from({ length: 4 }, (_, index) => hotel(index)),
};

let root: Root | undefined;
let host: HTMLDivElement | undefined;

function mount() {
  host = document.createElement('div');
  host.style.width = '100%';
  document.body.append(host);
  root = createRoot(host);
  root.render(
    <HotelResultsView
      displayMode="inline"
      onAdd={vi.fn()}
      result={result}
    />,
  );
}

function hasHorizontalOverflow() {
  const app = document.querySelector<HTMLElement>('.cc-app');
  return document.documentElement.scrollWidth > document.documentElement.clientWidth
    || Boolean(app && app.scrollWidth > app.clientWidth);
}

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
  document.body.innerHTML = '';
});

describe('hotel result layout', () => {
  it('shows three compact inline hotel cards together on desktop', async () => {
    await page.viewport(1_100, 1_200);
    mount();

    await expect.element(page.getByRole('region', { name: 'Hotel options' })).toBeVisible();
    const grid = document.querySelector<HTMLElement>('.cc-hotel-inline-grid')!;
    const cards = [...grid.querySelectorAll<HTMLElement>('.cc-hotel-card')];
    expect(cards).toHaveLength(3);

    const gridBounds = grid.getBoundingClientRect();
    const bounds = cards.map((card) => card.getBoundingClientRect());
    expect(Math.max(...bounds.map((box) => box.top)) - Math.min(...bounds.map((box) => box.top)))
      .toBeLessThanOrEqual(1);
    expect(Math.max(...bounds.map((box) => box.height)) - Math.min(...bounds.map((box) => box.height)))
      .toBeLessThanOrEqual(1);
    for (const box of bounds) {
      expect(box.left).toBeGreaterThanOrEqual(gridBounds.left);
      expect(box.right).toBeLessThanOrEqual(gridBounds.right);
    }
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('stacks all three hotel cards without horizontal overflow on mobile', async () => {
    await page.viewport(390, 1_200);
    mount();

    await expect.element(page.getByRole('button', { name: 'Add Tagus Lantern Hotel 1 to trip' })).toBeVisible();
    const cards = [...document.querySelectorAll<HTMLElement>('.cc-hotel-inline-grid > .cc-hotel-card')];
    expect(cards).toHaveLength(3);
    const bounds = cards.map((card) => card.getBoundingClientRect());
    expect(bounds[1]!.top).toBeGreaterThan(bounds[0]!.bottom);
    expect(bounds[2]!.top).toBeGreaterThan(bounds[1]!.bottom);
    expect(hasHorizontalOverflow()).toBe(false);
  });
});
