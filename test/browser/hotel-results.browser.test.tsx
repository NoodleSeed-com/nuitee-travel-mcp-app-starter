import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
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
  disclosure:
    'Illustrative stays — these fictional properties do not represent live availability. Booking is unavailable.',
  message: 'Two synthetic stays are available to compare for Lisbon.',
  fallback:
    'Two illustrative Lisbon stays for 2030-04-20 to 2030-04-23. Prices are illustrative and no live availability was checked.',
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
  hotels: [hotel(0), hotel(1)],
};

let root: Root | undefined;
let host: HTMLDivElement | undefined;

function mount(view: ReactNode) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  root.render(view);
}

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
  document.body.innerHTML = '';
});

describe('illustrative hotel widget in a real browser', () => {
  it('renders the match score as readable text inside a 44px disclosure target', async () => {
    await page.viewport(1_100, 1_200);
    mount(<HotelResultsView displayMode="inline" result={result} />);
    await expect.element(page.getByText('Tagus Lantern Hotel 1')).toBeVisible();

    const score = document.querySelector<HTMLElement>('.cc-match-score')!;
    const button = document.querySelector<HTMLButtonElement>('.cc-match-score-button')!;
    expect(score.getAttribute('aria-label')).toMatch(/Stay match \d+ out of 100/u);
    expect(score.querySelector('svg')).toBeNull();
    expect(button.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });
});
