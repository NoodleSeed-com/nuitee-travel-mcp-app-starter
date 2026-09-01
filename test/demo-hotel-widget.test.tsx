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
  illustrativePolicy: 'Illustrative flexible terms; no transaction can be created.',
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

const render = (props: Parameters<typeof HotelResultsView>[0]) =>
  renderToStaticMarkup(createElement(HotelResultsView, props));

const visibleText = (markup: string) => markup.replace(/<[^>]*>/gu, ' ');

describe('Flight Catchers demo hotel widget', () => {
  it('renders a geometry-matched shimmer skeleton with a next-card peek', () => {
    const markup = render({ state: 'loading', displayMode: 'inline', theme: 'light' });

    expect(markup).toContain('cc-hotel-skeleton');
    expect(markup).toContain('cc-hotel-skeleton-disclosure');
    expect(markup).toContain('cc-hotel-results-toolbar');
    expect(markup).toContain('cc-hotel-carousel-stage');
    expect(markup).toContain('cc-hotel-carousel-window');
    expect(markup).toContain('cc-hotel-carousel-track');
    expect(markup).toContain('cc-hotel-carousel-peek-slide');
    expect((markup.match(/cc-hotel-skeleton-card/g) ?? [])).toHaveLength(2);
    expect(markup).toContain('cc-hotel-skeleton-details');
    expect(markup).toContain('cc-shimmer');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('Preparing synthetic hotel comparisons');
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
    expect(empty).not.toContain('Add to trip');
  });

  it('shows three bounded inline options through a non-circular carousel', () => {
    const markup = render({ result, displayMode: 'inline', onAdd: vi.fn() });

    expect(markup).toContain(result.disclosure);
    expect(markup).toContain('Illustrative stays');
    expect(markup).toContain('Illustrative prices');
    expect(markup).toContain('aria-label="Hotel options carousel"');
    expect(markup).toContain('Hotel 1 of 3');
    const previous = markup.match(/<button[^>]*aria-label="Previous hotel"[^>]*>/u)?.[0] ?? '';
    const next = markup.match(/<button[^>]*aria-label="Next hotel"[^>]*>/u)?.[0] ?? '';
    expect(previous).toContain('disabled');
    expect(next).not.toContain('disabled');
    expect((markup.match(/>Add to trip<\/button>/gu) ?? [])).toHaveLength(2);
    expect(markup).toContain('Open the App in expanded view to compare all 4 hotels');
    expect(markup).not.toContain('<img');
    expect(visibleText(markup)).not.toMatch(/\bdemo\b|\bsandbox\b/iu);
    expect(markup).not.toMatch(/Book now|Reserve now|Pay now|Checkout/iu);
  });

  it('uses a 1.3-card expanded-carousel hook while retaining all bounded results', () => {
    const markup = render({ result, displayMode: 'fullscreen', onAdd: vi.fn() });

    expect(markup).toContain('cc-hotel-carousel-expanded');
    expect(markup).toContain('Hotel 1 of 4');
    expect(markup).toContain('cc-hotel-carousel-peek-slide');
    expect(markup).not.toContain('Open the App in expanded view');
    expect(markup).not.toContain('Hotel 1 of 5');
  });

  it('provides fixed-face detail hooks without exposing a transactional action', () => {
    const markup = render({ result: { ...result, hotels: [hotel(0)] }, displayMode: 'inline', onAdd: vi.fn() });

    expect(markup).toContain('cc-hotel-face-stack');
    expect(markup).toContain('cc-hotel-face-front');
    expect(markup).toContain('cc-hotel-face-back');
    expect(markup).toContain('cc-hotel-face-is-hidden');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('Hotel and rate details');
    expect(markup).toContain('Back to hotel');
    expect(markup).toContain('Not included in subtotal');
    expect(markup).toContain('Add to trip');
    expect(markup).not.toMatch(/Book now|Reserve now|Pay now|Redeem now|Checkout/iu);
  });

  it('renders pending, selected, and safe selection-error states', () => {
    const selectionId = result.hotels[0]!.selectionId;
    const selected = render({
      result: { ...result, hotels: [result.hotels[0]!] },
      displayMode: 'inline',
      selectedSelectionId: selectionId,
      pendingSelectionId: selectionId,
      selectionError: 'The illustrative stay could not be added to this trip. Try again.',
      onAdd: vi.fn(),
    });

    expect(selected).toContain('Added to trip');
    expect(selected).toContain('Nothing was booked, held, or paid');
    expect(selected).toContain('could not be added to this trip');
  });

  it('rejects malformed or over-bounded output at the widget boundary', () => {
    expect(isDemoHotelSearchOutput(result)).toBe(true);
    expect(isDemoHotelSearchOutput({ ...result, hotels: Array.from({ length: 11 }, (_, index) => hotel(index)) })).toBe(false);
    expect(isDemoHotelSearchOutput({ ...result, hotels: [{ ...hotel(0), selectionId: 'provider-rate-id' }] })).toBe(false);
    expect(isDemoHotelSearchOutput({ ...result, status: 'empty' })).toBe(false);
    expect(isDemoHotelSearchOutput({ ...result, hotels: [{ ...hotel(0), amenities: Array(7).fill('Too many') }] })).toBe(false);
  });
});
