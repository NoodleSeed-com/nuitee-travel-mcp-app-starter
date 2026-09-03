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
  illustrativePolicy: 'Illustrative flexible terms; no transaction can be created.',
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
  it('reserves real height for the match ring caption instead of collapsing its line box', async () => {
    // .cc-app .cc-ring-btn sets `line-height: 0` (a unitless multiplier) so
    // the ring itself stays tightly wrapped. Because line-height inherits
    // as that multiplier rather than a resolved length, .cc-ring-cap would
    // silently inherit it too and compute its own line box to 0px unless it
    // sets its own line-height explicitly.
    await page.viewport(1_100, 1_200);
    mount(<HotelResultsView displayMode="inline" result={result} />);
    await expect.element(page.getByText('Tagus Lantern Hotel 1')).toBeVisible();

    const caption = document.querySelector<HTMLElement>('.cc-ring-cap')!;
    const captionStyle = getComputedStyle(caption);
    expect(Number.parseFloat(captionStyle.lineHeight)).toBeGreaterThan(0);
    expect(caption.getBoundingClientRect().height).toBeGreaterThan(0);

    // If the caption's line box had collapsed, .cc-ring-wrap would reserve
    // only the ring's own height, and the "MATCH" text would overlap the
    // ring stroke instead of sitting below it.
    const wrap = document.querySelector<HTMLElement>('.cc-ring-wrap')!;
    const ring = document.querySelector<HTMLElement>('.cc-ring')!;
    expect(wrap.getBoundingClientRect().height).toBeGreaterThan(ring.getBoundingClientRect().height);
  });
});
