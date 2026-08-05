import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/helpers.js', () => {
  const container = ({ children, title, subtitle, displayMode: _displayMode, ...props }: any) =>
    React.createElement('section', props, title ? React.createElement('h1', null, title) : null, subtitle ? React.createElement('p', null, subtitle) : null, children);
  return {
    Action: ({ children, pending: _pending, pendingLabel: _pendingLabel, variant: _variant, ...props }: any) => React.createElement('button', props, children),
    ActionBar: ({ children }: any) => React.createElement('div', null, children),
    Feedback: ({ children, status }: any) => React.createElement('div', { 'data-status': status }, children),
    Flow: ({ children, variant: _variant, density: _density, ...props }: any) => React.createElement('div', props, children),
    Frame: container,
    Region: ({ children, title, description }: any) => React.createElement('section', null, React.createElement('h2', null, title), React.createElement('p', null, description), children),
    Field: ({ children, label, detail }: any) => React.createElement('label', null, label, children, detail ? React.createElement('small', null, detail) : null),
    Input: (props: any) => React.createElement('input', props),
    Select: ({ options, ...props }: any) => React.createElement('select', props, options.map((option: any) => React.createElement('option', { key: option.value, value: option.value }, option.label))),
    StatusBadge: ({ children }: any) => React.createElement('span', null, children),
    useCallTool: vi.fn(),
    useAppFlow: vi.fn(),
    useBranding: vi.fn(),
    useLayout: vi.fn(),
    useRequestDisplayMode: vi.fn(),
    useSendFollowUpMessage: vi.fn(),
    useToolInfo: vi.fn(),
    useUpdateModelContext: vi.fn(),
    useViewState: vi.fn(),
  };
});
import { FlightResultsView, isGatewayError, isSearchOutput, isVerification } from '../src/views/flight-results.js';
import { SearchEditor, searchPrompt } from '../src/views/search-editor.js';
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
  route: {
    origin: 'QZX',
    originName: 'Cedar Bay Test Aerodrome',
    destination: 'QZY',
    destinationName: 'Cloud Harbour Test Aerodrome',
  },
  carrier: { name: 'Cedar Skies', code: 'ZZ' },
  departureTime: '2030-04-20T09:00:00Z',
  arrivalTime: '2030-04-20T12:15:00Z',
  durationMinutes: 195,
  stops: 0,
  price: { total: 284.5, currency: 'CAD', base: 240, taxes: 40, fees: 4.5 },
  baggage: { carryOn: true, checked: false, allowances: ['One fictional cabin bag'] },
  expiresAt: '2030-04-01T12:15:00Z',
  retrievedAt: '2030-04-01T12:00:00Z',
  isCheapest: true,
  fare: { family: 'Cloudlight Economy', mixedCabin: false, seatsRemaining: 4 },
  terms: { changeable: true, refundable: false, hasChangeFee: true, hasRefundFee: false },
  amenities: [
    { category: 'wifi' as const, name: 'Fictional Wi-Fi', available: true, chargeable: false, details: 'Test fixture only', aircraftType: 'Cedar 100' },
  ],
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
  it('shows familiar editable flight fields, one available domain, and noninteractive coming-soon domains', () => {
    const html = renderToStaticMarkup(<TravelHomeView data={home} theme="light" onSearchPrompt={vi.fn()} />);
    expect(html).toContain('Flight search');
    expect(html).toContain('Flights available');
    expect(html).toContain('Flights');
    expect(html.match(/Coming soon/g)).toHaveLength(4);
    for (const field of ['From', 'To', 'Departure', 'Return', 'Adults', 'Cabin', 'Currency', 'Country']) expect(html).toContain(field);
    expect(html).toContain('Round trip');
    expect(html).toContain('One way');
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('type="radio"');
    expect(html).toContain('checked="" value="round_trip"');
    expect(html).toContain('placeholder="City or airport"');
    for (const helper of ['City or airport name', 'Ages 2–11', 'Under 2', 'ISO code', 'Point of sale']) expect(html).not.toContain(helper);
    expect(html).not.toContain('Use city or airport names.');
    expect(html).toMatch(/<input type="date" required="" name="returnDate"/);
    expect(html).toContain('aria-label="Swap origin and destination"');
    expect(html).toContain('>Search flights</button>');
    expect(html).not.toContain('disabled');
    expect(html).not.toContain('airline-logo');
    expect(html).not.toContain('cc-mark');
    expect(html).not.toContain('cc-hero-art');
  });

  it('hydrates a one-way search without a return-date field or stale return prompt', () => {
    const context = {
      origin: 'QZX', destination: 'QZY', departureDate: '2030-04-20', adults: 1, children: 0, infants: 0,
      childrenAges: [], infantAges: [], cabinClass: 'ECONOMY' as const, currency: 'CAD', country: 'CA',
    };
    const html = renderToStaticMarkup(<SearchEditor context={context} title="Edit your search" onSubmit={vi.fn()} />);
    expect(html).toContain('One way');
    expect(html).toContain('checked="" value="one_way"');
    expect(html).not.toContain('name="returnDate"');
    const prompt = searchPrompt({
      ...context,
      tripType: 'one_way',
      returnDate: '2030-04-27',
      adults: '1', children: '0', infants: '0',
    } as any);
    expect(prompt).toContain('one way');
    expect(prompt).not.toContain('returning 2030-04-27');
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
  it('shows at most three inline and ten expanded, with one selection-aware primary action', () => {
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
    expect((inline.match(/>Select fare<\/button>/g) ?? [])).toHaveLength(3);
    expect((fullscreen.match(/>Select fare<\/button>/g) ?? [])).toHaveLength(10);
    expect(inline).not.toContain('Verify selected fare');
    const selected = renderToStaticMarkup(
      <FlightResultsView
        result={{ status: 'success', itineraries: results, fallback: '10 flights', retrievedAt: itinerary.retrievedAt }}
        displayMode="inline"
        selectedSelectionId={results[1].selectionId}
        onSelect={vi.fn()}
        onVerify={vi.fn()}
      />,
    );
    expect((selected.match(/>Verify selected fare<\/button>/g) ?? [])).toHaveLength(1);
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

  it('renders an honest route-scanning skeleton with result-card parity', () => {
    const html = renderToStaticMarkup(<FlightResultsView state="loading" displayMode="inline" onVerify={vi.fn()} />);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Searching current flights');
    expect(html).toContain('Comparing routes, schedules, and fares');
    expect((html.match(/cc-skeleton-fare/g) ?? [])).toHaveLength(3);
    expect(html).not.toContain('live radar');
  });

  it('renders verification success, changed price, expired offer, and retry states', () => {
    const base = {
      result: { status: 'success' as const, itineraries: [itinerary], fallback: 'One flight', retrievedAt: itinerary.retrievedAt },
      displayMode: 'inline' as const,
      onVerify: vi.fn(),
      onSelect: vi.fn(),
      selectedSelectionId: itinerary.selectionId,
    };
    const changed = renderToStaticMarkup(<FlightResultsView {...base} view="review" verification={{ status: 'success', selectionId: itinerary.selectionId, availability: 'available', priceChanged: true, previousPrice: itinerary.price, currentPrice: { total: 299.5, currency: 'CAD' }, messages: ['Fare changed'], expiresAt: itinerary.expiresAt }} />);
    const success = renderToStaticMarkup(<FlightResultsView {...base} view="review" verification={{ status: 'success', selectionId: itinerary.selectionId, availability: 'available', priceChanged: false, previousPrice: itinerary.price, currentPrice: itinerary.price, messages: [], expiresAt: itinerary.expiresAt }} />);
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
        onSelect={vi.fn()}
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
    const actionHtml = renderToStaticMarkup(<FlightResultsView
      result={result}
      displayMode="inline"
      onVerify={vi.fn()}
      onSelect={vi.fn()}
      selectedSelectionId={itinerary.selectionId}
    />);
    const html = renderToStaticMarkup(<FlightResultsView
      result={result}
      displayMode="inline"
      view="review"
      onVerify={vi.fn()}
      onBack={vi.fn()}
      selectedSelectionId={itinerary.selectionId}
      verification={{
        status: 'success', selectionId: itinerary.selectionId, availability: 'available', priceChanged: false,
        previousPrice: itinerary.price, currentPrice: itinerary.price, messages: ['Fare remains available.'],
        verifiedAt: '2030-04-01T12:02:00Z', expiresAt: itinerary.expiresAt,
      }}
    />);
    expect(html).toContain('Verified Apr 1');
    expect(html).toContain('Offer expires');
    expect(html).toContain('Fare remains available.');
    expect(actionHtml).toContain('aria-label="Verify selected fare from QZX to QZY with Cedar Skies"');
  });

  it('supports editable search, back navigation, and a boarding-pass-inspired fare review without claiming a ticket', () => {
    const result = {
      status: 'success' as const,
      itineraries: [itinerary],
      fallback: 'One flight',
      message: 'One flight',
      retrievedAt: itinerary.retrievedAt,
      searchContext: {
        origin: 'QZX', destination: 'QZY', departureDate: '2030-04-20', adults: 1, children: 0, infants: 0,
        childrenAges: [], infantAges: [], cabinClass: 'ECONOMY' as const, currency: 'CAD', country: 'CA',
      },
    };
    const editor = renderToStaticMarkup(<FlightResultsView result={result} displayMode="inline" view="search" onSearchPrompt={vi.fn()} onBack={vi.fn()} onVerify={vi.fn()} />);
    expect(editor).toContain('Edit your search');
    expect(editor).toContain('value="Cedar Bay Test Aerodrome"');
    expect(editor).toContain('Back</button>');

    const review = renderToStaticMarkup(<FlightResultsView
      result={result}
      displayMode="inline"
      view="review"
      selectedSelectionId={itinerary.selectionId}
      onBack={vi.fn()}
      onVerify={vi.fn()}
      verification={{
        status: 'success', selectionId: itinerary.selectionId, availability: 'available', priceChanged: false,
        previousPrice: itinerary.price, currentPrice: itinerary.price, messages: [], verifiedAt: itinerary.retrievedAt,
      }}
    />);
    expect(review).toContain('Verified fare review');
    expect(review).toContain('Not a ticket or reservation');
    expect(review).toContain('Cedar Bay Test Aerodrome');
    expect(review).toContain('Cloudlight Economy');
    expect(review).toContain('Fictional Wi-Fi');
    expect(review).not.toContain('cc-mark');
    for (const falseClaim of ['Boarding pass', 'Ticket number', 'Gate', 'Seat assigned', 'Book now']) expect(review).not.toContain(falseClaim);
  });

  it('uses host-native typography and includes responsive accessibility safeguards', () => {
    const css = readFileSync(new URL('../src/views/travel.css', import.meta.url), 'utf8');
    expect(css).toContain('ui-sans-serif');
    expect(css).toContain('-apple-system');
    expect(css).toContain('BlinkMacSystemFont');
    expect(css).toContain('"Segoe UI"');
    expect(css).toContain('background: transparent');
    expect(css).not.toContain('font-family: inherit;');
    expect(css).not.toContain('2.7rem');
    expect(css).not.toContain('4.5rem');
    expect(css).toContain('@media (max-width: 320px)');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('overflow-wrap: anywhere');
    expect(css).toContain('repeat(auto-fit');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('@keyframes cc-route-scan');
    expect(css).toContain('.cc-search-skeleton');
  });
});
