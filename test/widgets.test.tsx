import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/helpers.js', () => {
  const container = ({ children, title, subtitle, ...props }: any) =>
    React.createElement('section', props, title ? React.createElement('h1', null, title) : null, subtitle ? React.createElement('p', null, subtitle) : null, children);
  return {
    Action: ({ children, pending: _pending, pendingLabel: _pendingLabel, variant: _variant, ...props }: any) => React.createElement('button', props, children),
    ActionBar: ({ children }: any) => React.createElement('div', null, children),
    Feedback: ({ children, status }: any) => React.createElement('div', { 'data-status': status }, children),
    Flow: ({ children, variant: _variant, density: _density, ...props }: any) => React.createElement('div', props, children),
    Frame: container,
    Region: ({ children, title, description }: any) => React.createElement('section', null, React.createElement('h2', null, title), React.createElement('p', null, description), children),
    useCallTool: vi.fn(),
    useLayout: vi.fn(),
    useToolInfo: vi.fn(),
    useViewState: vi.fn(),
  };
});
import { FlightResultsView, isGatewayError, isSearchOutput, isVerification } from '../src/views/flight-results.js';
import { isHome, TravelHomeView } from '../src/views/travel-home.js';

const home = {
  status: 'ready' as const,
  brand: 'Cedar & Cloud Travel',
  message: 'Flights are available. Tell me where and when you would like to travel.',
  domains: [
    { name: 'Flights', availability: 'available' as const },
    { name: 'Stays', availability: 'coming_soon' as const },
    { name: 'Loyalty', availability: 'coming_soon' as const },
    { name: 'Ground travel', availability: 'coming_soon' as const },
    { name: 'Experiences', availability: 'coming_soon' as const },
  ],
  fallback: 'Cedar & Cloud Travel can search and verify flights.',
};

const itinerary = {
  selectionId: 'sel_0123456789abcdef0123456789abcdef',
  route: { origin: 'QZX', destination: 'QZY' },
  carrier: { name: 'Cedar Skies', code: 'ZZ' },
  departureTime: '2030-04-20T09:00:00Z',
  arrivalTime: '2030-04-20T12:15:00Z',
  durationMinutes: 195,
  stops: 0,
  price: { total: 284.5, currency: 'CAD' },
  baggage: { carryOn: true, checked: false, allowances: ['One fictional cabin bag'] },
  expiresAt: '2030-04-01T12:15:00Z',
  retrievedAt: '2030-04-01T12:00:00Z',
  isCheapest: true,
  legs: [
    {
      direction: 'OUTBOUND' as const,
      route: { origin: 'QZX', destination: 'QZY' },
      departureTime: '2030-04-20T09:00:00+02:00',
      arrivalTime: '2030-04-20T12:15:00+02:00',
      durationMinutes: 195,
      stops: 0,
    },
  ],
  segments: [],
  messages: ['Fictional fixture fare; not live inventory.'],
};

describe('TravelHome', () => {
  it('shows one available domain and noninteractive coming-soon domains', () => {
    const html = renderToStaticMarkup(<TravelHomeView data={home} theme="light" />);
    expect(html).toContain('Cedar &amp; Cloud Travel');
    expect(html).toContain('Flights');
    expect(html.match(/Coming soon/g)).toHaveLength(4);
    expect(html).not.toContain('<button');
    expect(html).not.toContain('disabled');
  });

  it('renders loading, malformed, and unavailable states', () => {
    expect(renderToStaticMarkup(<TravelHomeView state="loading" theme="dark" />)).toContain('Opening');
    expect(renderToStaticMarkup(<TravelHomeView state="error" theme="light" />)).toContain('could not');
    expect(renderToStaticMarkup(<TravelHomeView state="malformed" theme="light" />)).toContain('incomplete');
  });

  it('rejects malformed nested home data at the widget boundary', () => {
    expect(isHome(home)).toBe(true);
    expect(isHome({ ...home, domains: [{ name: 'Flights' }] })).toBe(false);
    expect(isHome({ ...home, domains: home.domains.map((domain) => ({ ...domain, availability: 'available' })) })).toBe(false);
    expect(isHome({ ...home, domains: home.domains.map((domain) => ({ ...domain, name: 'Flights' })) })).toBe(false);
  });
});

describe('FlightResults', () => {
  it('shows at most three inline and ten expanded, with Verify fare as the only action', () => {
    const results = Array.from({ length: 10 }, (_, index) => ({
      ...itinerary,
      selectionId: `sel_${String(index).padStart(32, '0')}`,
    }));
    const inline = renderToStaticMarkup(
      <FlightResultsView
        result={{ status: 'success', itineraries: results, fallback: '10 flights', retrievedAt: itinerary.retrievedAt }}
        displayMode="inline"
        onVerify={vi.fn()}
      />,
    );
    const fullscreen = renderToStaticMarkup(
      <FlightResultsView
        result={{ status: 'success', itineraries: results, fallback: '10 flights', retrievedAt: itinerary.retrievedAt }}
        displayMode="fullscreen"
        onVerify={vi.fn()}
      />,
    );
    expect((inline.match(/>Verify fare<\/button>/g) ?? [])).toHaveLength(3);
    expect((fullscreen.match(/>Verify fare<\/button>/g) ?? [])).toHaveLength(10);
    for (const forbidden of ['Book', 'Checkout', 'Reserve', 'Pay', 'Redeem']) expect(inline).not.toContain(forbidden);
  });

  it.each([
    ['loading', { state: 'loading' as const }, 'Searching'],
    ['empty', { result: { status: 'empty' as const, itineraries: [], fallback: 'No flights', retrievedAt: itinerary.retrievedAt } }, 'No flights'],
    ['partial', { result: { status: 'partial' as const, itineraries: [itinerary], fallback: 'Partial', retrievedAt: itinerary.retrievedAt } }, 'Some provider results'],
    ['error', { result: { status: 'error' as const, itineraries: [], fallback: 'Try again', retrievedAt: itinerary.retrievedAt, error: { code: 'service_unavailable' as const, message: 'Unavailable', retryable: true } } }, 'Unavailable'],
  ])('renders %s state', (_name, props, text) => {
    expect(renderToStaticMarkup(<FlightResultsView displayMode="inline" onVerify={vi.fn()} {...props} />)).toContain(text);
  });

  it('renders verification success, changed price, expired offer, and retry states', () => {
    const base = {
      result: { status: 'success' as const, itineraries: [itinerary], fallback: 'One flight', retrievedAt: itinerary.retrievedAt },
      displayMode: 'inline' as const,
      onVerify: vi.fn(),
    };
    const changed = renderToStaticMarkup(<FlightResultsView {...base} verification={{ status: 'success', selectionId: itinerary.selectionId, availability: 'available', priceChanged: true, previousPrice: itinerary.price, currentPrice: { total: 299.5, currency: 'CAD' }, messages: ['Fare changed'], expiresAt: itinerary.expiresAt }} />);
    const success = renderToStaticMarkup(<FlightResultsView {...base} verification={{ status: 'success', selectionId: itinerary.selectionId, availability: 'available', priceChanged: false, previousPrice: itinerary.price, currentPrice: itinerary.price, messages: [], expiresAt: itinerary.expiresAt }} />);
    const expired = renderToStaticMarkup(<FlightResultsView {...base} verificationError={{ code: 'expired_offer', message: 'This offer expired. Search again.', retryable: false }} />);
    const retry = renderToStaticMarkup(<FlightResultsView {...base} verificationError={{ code: 'timeout', message: 'Verification timed out.', retryable: true }} />);
    expect(changed).toContain('Price changed');
    expect(success).toContain('Fare verified');
    expect(expired).toContain('Search again');
    expect(retry).toContain('Try again');
  });

  it('renders outbound and return schedules without host-timezone conversion', () => {
    const roundTrip = {
      ...itinerary,
      legs: [
        itinerary.legs[0],
        {
          direction: 'INBOUND' as const,
          route: { origin: 'QZY', destination: 'QZX' },
          departureTime: '2030-04-27T16:00:00+02:00',
          arrivalTime: '2030-04-27T19:30:00+02:00',
          durationMinutes: 210,
          stops: 0,
        },
      ],
    };
    const html = renderToStaticMarkup(
      <FlightResultsView
        result={{ status: 'success', itineraries: [roundTrip], fallback: 'Round trip', retrievedAt: itinerary.retrievedAt }}
        displayMode="inline"
        onVerify={vi.fn()}
      />,
    );
    expect(html).toContain('Outbound');
    expect(html).toContain('Return');
    expect(html).toContain('9:00');
    expect(html).toContain('16:00');
  });

  it('fails closed on malformed nested tool results and verification data', () => {
    const validResult = { status: 'success', itineraries: [itinerary], fallback: 'One flight', message: 'One flight', retrievedAt: itinerary.retrievedAt };
    expect(isSearchOutput(validResult)).toBe(true);
    expect(isSearchOutput({ ...validResult, itineraries: [{ ...itinerary, route: { origin: '??', destination: 'QZY' } }] })).toBe(false);
    expect(isSearchOutput({ ...validResult, itineraries: [] })).toBe(false);
    expect(isSearchOutput({ ...validResult, status: 'empty' })).toBe(false);
    expect(isSearchOutput({ ...validResult, status: 'error', itineraries: [] })).toBe(false);
    expect(isVerification({
      status: 'success', selectionId: itinerary.selectionId, availability: 'available', priceChanged: false,
      previousPrice: itinerary.price, currentPrice: itinerary.price, messages: [],
    })).toBe(true);
    expect(isVerification({ status: 'success', selectionId: itinerary.selectionId, availability: 'available', priceChanged: false })).toBe(false);
    expect(isGatewayError({ code: 'timeout', message: 'Timed out', retryable: true })).toBe(true);
    expect(isGatewayError({ code: 'made_up', message: 'No', retryable: true })).toBe(false);
  });

  it('renders price freshness, verification messages, and distinct accessible actions', () => {
    const result = { status: 'success' as const, itineraries: [itinerary], fallback: 'One flight', message: 'One flight', retrievedAt: itinerary.retrievedAt };
    const html = renderToStaticMarkup(<FlightResultsView
      result={result}
      displayMode="inline"
      onVerify={vi.fn()}
      verification={{
        status: 'success', selectionId: itinerary.selectionId, availability: 'available', priceChanged: false,
        previousPrice: itinerary.price, currentPrice: itinerary.price, messages: ['Fare remains available.'],
        verifiedAt: '2030-04-01T12:02:00Z', expiresAt: itinerary.expiresAt,
      }}
    />);
    expect(html).toContain('Results retrieved');
    expect(html).toContain('Search offer expires');
    expect(html).toContain('Fare remains available.');
    expect(html).toContain('aria-label="Verify fare for QZX to QZY with Cedar Skies"');
  });

  it('includes keyboard focus, 280px, overflow, touch target, and reduced-motion safeguards', () => {
    const css = readFileSync(new URL('../src/views/travel.css', import.meta.url), 'utf8');
    expect(css).toContain('@media (max-width: 320px)');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('overflow-wrap: anywhere');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
