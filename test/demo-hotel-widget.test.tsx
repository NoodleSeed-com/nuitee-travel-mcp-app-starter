import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DemoHotel, DemoHotelSearchOutput } from '../src/demo-schemas.js';

vi.mock('../src/helpers.js', () => {
  const Frame = ({ children, title, subtitle, displayMode: _displayMode, ...props }: any) =>
    React.createElement(
      'section',
      props,
      title ? React.createElement('h1', null, title) : null,
      subtitle ? React.createElement('p', null, subtitle) : null,
      children,
    );
  return {
    Action: ({ children, pending: _pending, pendingLabel: _pendingLabel, variant: _variant, ...props }: any) =>
      React.createElement('button', props, children),
    Feedback: ({ children, status }: any) =>
      React.createElement('div', { 'data-status': status }, children),
    Flow: ({ children, variant: _variant, density: _density, ...props }: any) =>
      React.createElement('div', props, children),
    Frame,
    Region: ({ children, title, description }: any) => React.createElement(
      'section',
      null,
      React.createElement('h2', null, title),
      React.createElement('p', null, description),
      children,
    ),
    StatusBadge: ({ children, tone: _tone, ...props }: any) =>
      React.createElement('span', props, children),
    useBranding: vi.fn(),
    useCallTool: vi.fn(),
    useLayout: vi.fn(),
    useRequestDisplayMode: vi.fn(),
    useToolInfo: vi.fn(),
    useViewState: vi.fn(),
    useWidgetReady: vi.fn(),
  };
});

import {
  HotelResultsView,
  isDemoHotelSearchOutput,
} from '../src/views/hotel-results.js';

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
  message: 'Four synthetic stays are available to compare for Lisbon.',
  fallback:
    'Four illustrative Lisbon stays for 2030-04-20 to 2030-04-23. Prices are illustrative and no live availability was checked.',
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

// Alias for the photo-led card tests below, which name the fixture this way.
const sampleHotelResult = result;

const render = (props: Parameters<typeof HotelResultsView>[0]) =>
  renderToStaticMarkup(createElement(HotelResultsView, props));

const visibleText = (markup: string) => markup.replace(/<[^>]*>/gu, ' ');

describe('Wayfare illustrative hotel widget', () => {
  it('renders a geometry-matched shimmer skeleton mirroring the photo-led rail', () => {
    const markup = render({ state: 'loading', displayMode: 'inline', theme: 'light' });

    expect(markup).toContain('cc-hotel-skeleton');
    expect(markup).toContain('cc-hotel-skeleton-disclosure');
    expect(markup).toContain('cc-hotel-results-toolbar');
    // The loaded state is a Rail of full cards, so the skeleton reuses the
    // same rail shell and card classes rather than the old carousel markup.
    expect(markup).toContain('cc-rail-outer');
    expect(markup).toContain('cc-rail-arrow-prev');
    expect(markup).toContain('cc-rail-arrow-next');
    expect(markup).toContain('cc-photo-band');
    expect(markup).toContain('cc-hotel-body');
    expect((markup.match(/cc-hotel-skeleton-card/g) ?? [])).toHaveLength(2);
    expect(markup).toContain('cc-hotel-skeleton-details');
    expect(markup).toContain('cc-shimmer');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('Preparing hotel comparisons');
  });

  it('renders bounded error, malformed, and honest empty states', () => {
    const failed = render({ state: 'error', displayMode: 'inline', theme: 'dark' });
    const malformed = render({ state: 'malformed', displayMode: 'inline' });
    const empty = render({
      result: { ...result, status: 'empty', hotels: [], message: 'No synthetic stay fixtures are available for Banff.' },
      displayMode: 'inline',
    });

    expect(failed).toContain('The hotel comparison could not load');
    expect(failed).toContain('No live hotel search was attempted');
    expect(malformed).toContain('could not be shown safely');
    expect(malformed).toContain('No hotel, rate, or availability was inferred');
    expect(empty).toContain('No illustrative stays matched');
    expect(empty).toContain('No synthetic stay fixtures are available for Banff');
    expect(empty).not.toContain('Select');
  });

  it('shows three bounded inline stays in a scrollable rail', () => {
    const markup = render({ result, displayMode: 'inline', onAdd: vi.fn() });

    expect(markup).toContain(result.disclosure);
    expect(markup).toContain('Illustrative stays');
    expect(markup).toContain('Illustrative prices');
    expect(markup).toContain('aria-label="Stays"');
    expect(markup).toContain('cc-rail-arrow-prev');
    expect(markup).toContain('cc-rail-arrow-next');
    expect((markup.match(/>Select<\/button>/gu) ?? [])).toHaveLength(3);
    expect(markup).toContain('Open the App in expanded view to compare all 4 hotels');
    expect(markup).not.toContain('<img');
    expect(visibleText(markup)).not.toMatch(/\bdemo\b|\bsandbox\b/iu);
    expect(markup).not.toMatch(/Book now|Reserve now|Pay now|Checkout/iu);
  });

  it('shows all bounded results directly in the rail when expanded', () => {
    const markup = render({ result, displayMode: 'fullscreen', onAdd: vi.fn() });

    expect(markup).toContain('aria-label="Stays"');
    expect((markup.match(/>Select<\/button>/gu) ?? [])).toHaveLength(4);
    expect(markup).not.toContain('Open the App in expanded view');
  });

  it('provides two disclosable panels — stay match and hotel/rate details — without a dead-end action', () => {
    const markup = render({ result: { ...result, hotels: [hotel(0)] }, displayMode: 'inline', onAdd: vi.fn() });

    expect(markup).toContain('cc-match-score-button');
    expect(markup).toContain('cc-hotel-details-toggle');
    expect(markup).toContain('Hotel and rate details');
    expect((markup.match(/aria-expanded="false"/gu) ?? [])).toHaveLength(2);
    expect(markup).not.toMatch(/disabled[^>]*>Details</u);
    expect(markup).toContain('Select');
    expect(markup).not.toMatch(/Book now|Reserve now|Pay now|Redeem now|Checkout/iu);
  });

  it('keeps both disclosure panels mounted (not unmounted) behind distinct aria-controls', () => {
    const markup = render({ result: { ...result, hotels: [hotel(0)] }, displayMode: 'inline', onAdd: vi.fn() });

    const ringButton = markup.match(/<button[^>]*class="cc-match-score-button"[^>]*>/u)?.[0] ?? '';
    const detailsButton = markup.match(/<button[^>]*class="cc-hotel-details-toggle"[^>]*>/u)?.[0] ?? '';
    const matchControls = ringButton.match(/aria-controls="([^"]+)"/u)?.[1];
    const detailsControls = detailsButton.match(/aria-controls="([^"]+)"/u)?.[1];

    expect(matchControls).toBeTruthy();
    expect(detailsControls).toBeTruthy();
    expect(matchControls).not.toBe(detailsControls);

    // aria-controls must resolve to a real, still-mounted element — not a
    // dangling id left over from a panel that unmounts on collapse.
    const matchPanel = markup.match(new RegExp(`<div[^>]*id="${matchControls}"[^>]*>`, 'u'))?.[0] ?? '';
    const detailsPanel = markup.match(new RegExp(`<div[^>]*id="${detailsControls}"[^>]*>`, 'u'))?.[0] ?? '';
    expect(matchPanel).toContain('hidden');
    expect(detailsPanel).toContain('hidden');
  });

  it('shows a compact taxes-and-fees qualifier under the price without expanding anything', () => {
    const markup = render({ result: { ...result, hotels: [hotel(0)] }, displayMode: 'inline', onAdd: vi.fn() });

    expect(markup).toContain('cc-price-note');
    expect(markup).toContain('Illustrative subtotal · taxes and fees not included');

    // This is standing disclosure, not the fuller note behind the "Hotel
    // and rate details" toggle — it must sit under the always-visible
    // price, before that collapsed panel even starts.
    const noteAt = markup.indexOf('cc-price-note');
    const detailsPanelAt = markup.indexOf('cc-hotel-detail-content');
    expect(noteAt).toBeGreaterThan(-1);
    expect(detailsPanelAt).toBeGreaterThan(-1);
    expect(noteAt).toBeLessThan(detailsPanelAt);
  });

  it('threads the widget locale through to the stay-match price and rating formatting', () => {
    // <Price> already renders in the host locale; the match ring's detail
    // panel must not fall back to a hardcoded en-CA/en, or the same
    // currency and review count render two different ways one tap apart.
    const rated = { ...hotel(0), reviewScore: 8.9, reviewCount: 1204 } as DemoHotel;
    const defaultLocale = render({ result: { ...result, hotels: [rated] }, displayMode: 'inline', onAdd: vi.fn() });
    const frCA = render({ result: { ...result, hotels: [rated] }, displayMode: 'inline', locale: 'fr-CA', onAdd: vi.fn() });

    expect(defaultLocale).toContain('1,204');
    // fr-CA groups thousands with a space, not the en-CA comma.
    expect(frCA).not.toContain('1,204');
    expect(frCA).toContain('204');
  });

  it('restores the full hotel and rate details behind the second disclosure', () => {
    const sixAmenities = ['Breakfast preview', 'Rooftop concept', 'Wi-Fi', 'Spa access', 'Pet friendly', 'Parking included'];
    const markup = render({
      result: { ...result, hotels: [{ ...hotel(0), amenities: sixAmenities }] },
      displayMode: 'inline',
      onAdd: vi.fn(),
    });

    // The collapsed-card preview line still shows only 3.
    expect(markup).toContain('Breakfast preview · Rooftop concept · Wi-Fi');
    // The restored panel reaches fields the photo-led collapsed view drops:
    // room name, stay length, the taxes disclosure, the description, and
    // the FULL amenity list (not sliced to the 3-item preview).
    expect(markup).toContain('Lantern king room');
    expect(markup).toContain('3 nights · 1 room');
    expect(markup).toContain('Taxes and fees');
    expect(markup).toContain('Not included in subtotal');
    expect(markup).toContain('An illustrative central stay created for a bounded comparison.');
    for (const amenity of sixAmenities) {
      expect(markup).toContain(amenity);
    }
    expect(markup).toContain('Illustrative flexible terms; no transaction can be created.');
  });

  it('renders pending, selected, and safe selection-error states', () => {
    const selectionId = result.hotels[0]!.selectionId;
    const selected = render({
      result: { ...result, hotels: [result.hotels[0]!] },
      displayMode: 'inline',
      selectedSelectionId: selectionId,
      pendingSelectionId: selectionId,
      selectionError: 'The illustrative stay could not be selected. Try again.',
      onAdd: vi.fn(),
    });

    expect(selected).toMatch(/>Selected<\/button>/u);
    expect(selected).not.toMatch(/Added|Adding/u);
    expect(selected).toContain('Nothing was booked, held, or paid');
    expect(selected).toContain('could not be selected');
  });

  it('rejects malformed or over-bounded output at the widget boundary', () => {
    expect(isDemoHotelSearchOutput(result)).toBe(true);
    expect(isDemoHotelSearchOutput({ ...result, hotels: Array.from({ length: 11 }, (_, index) => hotel(index)) })).toBe(false);
    expect(isDemoHotelSearchOutput({ ...result, hotels: [{ ...hotel(0), selectionId: 'provider-rate-id' }] })).toBe(false);
    expect(isDemoHotelSearchOutput({ ...result, status: 'empty' })).toBe(false);
    expect(isDemoHotelSearchOutput({ ...result, hotels: [{ ...hotel(0), amenities: Array(7).fill('Too many') }] })).toBe(false);
  });
});

describe('photo-led hotel card', () => {
  it('paints a deterministic band when the hotel has no image', () => {
    const html = renderToStaticMarkup(
      createElement(HotelResultsView, { displayMode: 'inline', result: sampleHotelResult }),
    );
    expect(html).toContain('cc-photo-band');
    expect(html).toContain('linear-gradient(');
  });

  it('omits the score pin when no review score is returned', () => {
    const html = renderToStaticMarkup(
      createElement(HotelResultsView, { displayMode: 'inline', result: sampleHotelResult }),
    );
    expect(html).not.toContain('cc-score-pin');
  });

  it('renders a stay match ring per hotel', () => {
    const html = renderToStaticMarkup(
      createElement(HotelResultsView, { displayMode: 'inline', result: sampleHotelResult }),
    );
    expect(html).toContain('Stay match');
  });
});
