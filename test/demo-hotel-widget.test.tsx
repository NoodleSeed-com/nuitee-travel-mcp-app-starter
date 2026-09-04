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
  lat: 38.71 + index * 0.001,
  lng: -9.13 - index * 0.001,
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

describe('Wayfare conversational hotel widget', () => {
  it('renders loading without actionable fake hotels', () => {
    const html = render({ state: 'loading', displayMode: 'inline' });
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('View stay:');
  });
  it('renders bounded errors and empty results', () => {
    expect(render({ state: 'error', displayMode: 'inline' })).toContain('nothing was selected');
    expect(render({ state: 'malformed', displayMode: 'inline' })).toContain('could not be shown safely');
    const html = render({ result: { ...result, status: 'empty', hotels: [], message: 'No stays matched Banff.' }, displayMode: 'inline' });
    expect(html).toContain('No stays matched Banff');
    expect(html).not.toContain('View stay:');
  });
  it('limits the initial shortlist to three inspectable options in either display mode', () => {
    for (const displayMode of ['inline', 'fullscreen']) {
      const html = render({ result, displayMode });
      expect((html.match(/aria-label="View stay:/g) ?? [])).toHaveLength(3);
      expect(html).not.toContain('Tagus Lantern Hotel 4');
      expect(html).toContain('Show 1 more stay');
      expect(html).toContain(result.disclosure);
      expect(html).not.toMatch(/Book now|Reserve now|Pay now|Checkout/);
    }
  });
  it('keeps policy and tax qualifiers visible without inline match controls', () => {
    const html = render({ result, displayMode: 'inline' });
    expect(html).toContain(hotel(0).policySummary);
    expect(html).toContain('Taxes and fees not included');
    expect(html).not.toContain('cc-match-score');
    expect(html).not.toContain('Hotel result view');
    expect(html).not.toContain('Lantern king room');
  });
  it('preserves subtotal precision and locale', () => {
    const precise = { ...hotel(0), staySubtotal: { amount: 858.49, currency: 'CAD' as const } };
    expect(render({ result: { ...result, hotels: [precise] }, displayMode: 'inline' })).toContain('858.49');
    expect(render({ result: { ...result, hotels: [precise] }, displayMode: 'inline', locale: 'fr-CA' })).toContain('858,49');
  });
  it('does not turn an unconfirmed live tax flag into a claim of exclusion', () => {
    const live = { ...result, dataSource: 'live_nuitee' as const, hotels: [{ ...hotel(0), dataSource: 'live_nuitee' as const }] };
    const html = render({ result: live, displayMode: 'inline' });
    expect(html).toContain('Tax and fee inclusion requires review');
    expect(html).not.toContain('Taxes and fees not included');
  });
  it('restores focused details with the full returned amenities', () => {
    const html = render({ result, displayMode: 'inline', experience: { searchId: result.searchId, screen: 'detail', detailId: hotel(0).selectionId, compareIds: [], shown: 3 }, onAdd: vi.fn() });
    expect(html).toContain('Lantern king room');
    expect(html).toContain(hotel(0).description);
    for (const amenity of hotel(0).amenities) expect(html).toContain(amenity);
    expect(html).toContain('Choose this stay');
    expect(html).not.toContain('Tagus Lantern Hotel 2');
  });
  it('ignores presentation state from an older search', () => {
    const html = render({ result, displayMode: 'inline', experience: { searchId: 'old-search', screen: 'detail', detailId: hotel(0).selectionId, compareIds: [], shown: 10 } });
    expect((html.match(/aria-label="View stay:/g) ?? [])).toHaveLength(3);
    expect(html).not.toContain('Choose this stay');
  });
  it('does not show selection success for an ID outside current results', () => {
    const html = render({ result, displayMode: 'inline', selectedSelectionId: 'hsel_99999999999999999999999999999999' });
    expect(html).not.toContain('Nothing was booked');
    expect(html).not.toContain('View selected stay');
  });
  it('preserves the previous selection alongside a selection error', () => {
    const html = render({ result, displayMode: 'inline', selectedSelectionId: hotel(0).selectionId, selectionError: 'Could not select the other stay.' });
    expect(html).toContain('View selected stay: Tagus Lantern Hotel 1');
    expect(html).toContain('Could not select the other stay');
    expect(html).toContain('Nothing was booked, held, or paid');
  });
  it('uses a truthful no-photo fallback without inventing guest ratings', () => {
    const html = render({ result, displayMode: 'inline' });
    expect(html).toContain('Photo not provided');
    expect(html).not.toContain('Guest rating');
    expect(html).not.toContain('linear-gradient');
  });
  it('rejects malformed or over-bounded output', () => {
    expect(isDemoHotelSearchOutput(result)).toBe(true);
    expect(isDemoHotelSearchOutput({ ...result, hotels: Array.from({ length: 11 }, (_, index) => hotel(index)) })).toBe(false);
    expect(isDemoHotelSearchOutput({ ...result, hotels: [{ ...hotel(0), selectionId: 'provider-rate-id' }] })).toBe(false);
    expect(isDemoHotelSearchOutput({ ...result, hotels: [{ ...hotel(0), lng: undefined }] })).toBe(false);
    expect(isDemoHotelSearchOutput({ ...result, hotels: [{ ...hotel(0), lat: 91 }] })).toBe(false);
    expect(isDemoHotelSearchOutput({ ...result, status: 'empty' })).toBe(false);
    expect(isDemoHotelSearchOutput({ ...result, hotels: [{ ...hotel(0), amenities: Array(7).fill('Too many') }] })).toBe(false);
  });
});
