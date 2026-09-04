import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import * as helpers from '../src/helpers.js';

vi.mock('../src/helpers.js', () => {
  const container = ({ children, title, subtitle, displayMode: _displayMode, ...props }: any) =>
    React.createElement('section', props, title ? React.createElement('h1', null, title) : null, subtitle ? React.createElement('p', null, subtitle) : null, children);
  return {
    Action: ({ children, pending: _pending, pendingLabel: _pendingLabel, variant = 'secondary', ...props }: any) => React.createElement('button', { ...props, 'data-variant': variant }, children),
    ActionBar: ({ children }: any) => React.createElement('div', null, children),
    Feedback: ({ children, status }: any) => React.createElement('div', { 'data-status': status }, children),
    Flow: ({ children, variant: _variant, density: _density, ...props }: any) => React.createElement('div', props, children),
    Form: ({ children, ...props }: any) => React.createElement('form', props, children),
    Frame: container,
    Region: ({ children, title, description }: any) => React.createElement('section', null, React.createElement('h2', null, title), React.createElement('p', null, description), children),
    Field: ({ children, label, detail }: any) => React.createElement('label', null, label, children, detail ? React.createElement('small', null, detail) : null),
    Input: (props: any) => React.createElement('input', props),
    Select: ({ options, ...props }: any) => React.createElement('select', props, options.map((option: any) => React.createElement('option', { key: option.value, value: option.value }, option.label))),
    StatusBadge: ({ children, tone: _tone, ...props }: any) => React.createElement('span', props, children),
    useCallTool: vi.fn(),
    useAppFlow: vi.fn(),
    useBranding: vi.fn(),
    useLayout: vi.fn(),
    useRequestDisplayMode: vi.fn(),
    useSendFollowUpMessage: vi.fn(),
    useToolInfo: vi.fn(),
    useUpdateModelContext: vi.fn(),
    useViewState: vi.fn(),
    useWidgetReady: vi.fn(),
  };
});
import {
  default as FlightResults,
  FlightResultsView,
  isGatewayError,
  isSearchOutput,
  isVerification,
  selectionOutcome,
  selectionTransition,
  selectedFareModelContext,
} from '../src/views/flight-results.js';
import { SearchEditor, searchPrompt } from '../src/views/search-editor.js';
import { isHome, TravelHomeView } from '../src/views/travel-home.js';
import { starterConfig } from '../src/starter-config.js';
import { demoHomeOutputSchema } from '../src/demo-schemas.js';

const home = {
  status: 'ready' as const,
  brand: starterConfig.brand.name,
  message: 'Flights are available. Tell me where and when you would like to travel.',
  domains: [
    { name: 'Flights', availability: 'available' as const },
    { name: 'Stays', availability: 'coming_soon' as const },
    { name: 'Loyalty', availability: 'coming_soon' as const },
    { name: 'Ground travel', availability: 'coming_soon' as const },
    { name: 'Experiences', availability: 'coming_soon' as const },
  ],
  fallback: `${starterConfig.brand.name} can search and verify flights.`,
};

const itinerary = {
  selectionId: 'sel_0123456789abcdef0123456789abcdef',
  route: {
    origin: 'QZX',
    originName: 'Cedar Bay Test Aerodrome',
    destination: 'QZY',
    destinationName: 'Cloud Harbour Test Aerodrome',
  },
  carrier: {
    name: 'Cedar Skies',
    code: 'ZZ',
    logoUrl: 'https://sandbox.nuitee.flights/static/images/airlines/ZZ.png',
  },
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

// A carrier with a curated accent (unlike the shared `itinerary` fixture
// above, whose ZZ code is deliberately unmapped) so tests can assert the
// `--cc-carrier-accent` custom property is actually emitted.
const sampleSearchOutput = {
  status: 'success' as const,
  itineraries: [{ ...itinerary, carrier: { name: 'Nuitee Air', code: 'ND' } }],
  fallback: 'One flight',
  message: 'One flight',
  retrievedAt: itinerary.retrievedAt,
  searchContext: {
    origin: 'QZX', destination: 'QZY', departureDate: '2030-04-20', adults: 1, children: 0, infants: 0,
    childrenAges: [], infantAges: [], cabinClass: 'ECONOMY' as const, currency: 'CAD', country: 'CA',
  },
};

describe('TravelHome', () => {
  const expandedHome = (stays: 'available' | 'illustrative') => demoHomeOutputSchema.parse({
    ...home,
    disclosure: 'Current flights, clearly sourced stays, and illustrative rewards. Booking is unavailable.',
    domains: home.domains.map((domain) => ({
      ...domain,
      availability: domain.name === 'Stays' ? stays : domain.name === 'Loyalty' ? 'illustrative' : domain.availability,
      label: domain.name === 'Stays' ? (stays === 'available' ? 'Current stays' : 'Illustrative stays') : 'Capability status',
    })),
  });

  it.each(['available', 'illustrative'] as const)('accepts the schema-supported expanded home with %s stays', (stays) => {
    const data = expandedHome(stays);
    expect(isHome(data)).toBe(true);
    const html = renderToStaticMarkup(<TravelHomeView data={data} theme="light" />);
    expect(html).toContain(stays === 'available' ? 'Current flights and stays' : 'Flights, illustrative stays');
    expect(html).toContain(data.fallback);
    expect(html).toContain(data.disclosure);
  });

  it('rejects unsupported home availability combinations and malformed expanded labels or disclosures', () => {
    const data = expandedHome('illustrative');
    for (const patch of [{ label: '' }, { label: 'x'.repeat(81) }, { label: 42 }, { label: undefined }]) {
      expect(isHome({ ...data, domains: data.domains.map((domain, index) => index === 1 ? { ...domain, ...patch } : domain) })).toBe(false);
    }
    for (const disclosure of ['', ' '.repeat(30), 'x'.repeat(321), 42, undefined]) {
      expect(isHome({ ...data, disclosure })).toBe(false);
    }
    for (const [index, availability] of [[0, 'illustrative'], [1, 'coming_soon'], [2, 'available'], [3, 'available'], [4, 'illustrative']] as const) {
      expect(isHome({ ...data, domains: data.domains.map((domain, position) => position === index ? { ...domain, availability } : domain) })).toBe(false);
    }
  });

  it('keeps the starter chat first while showing capability availability', () => {
    const html = renderToStaticMarkup(<TravelHomeView data={home} theme="light" />);
    expect(html).toContain('Flight search');
    expect(html).toContain('Flights available');
    expect(html).toContain('cc-availability-badge');
    expect(html).toContain('Travel capabilities');
    expect(html).toContain('Flights');
    expect(html.match(/Coming soon/g)).toHaveLength(4);
    expect(html).not.toContain('Trip details');
    expect(html).not.toContain('cc-search-form');
    expect(html).not.toContain('role="radiogroup"');
    expect(html).not.toContain('>Search flights</button>');
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
    const loading = renderToStaticMarkup(<TravelHomeView state="loading" theme="dark" />);
    expect(loading).toContain('Opening');
    expect(loading).not.toContain('cc-theme-dark');
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
  it('renders a compact recovery state instead of repeating the result heading', () => {
    const errorResult = {
      status: 'error' as const,
      fallback: 'The request is invalid.',
      message: 'The request is invalid.',
      itineraries: [],
      error: {
        code: 'invalid_request' as const,
        message: 'Check the airports and travel date.',
        retryable: false,
      },
    };

    const html = renderToStaticMarkup(
      <FlightResultsView result={errorResult} displayMode="inline" onVerify={vi.fn()} />,
    );

    expect(html).toContain('Search needs attention');
    expect(html).toContain('Adjust an airport or travel date');
    expect(html).not.toContain('<h1>Flight results</h1>');
  });

  it('does not let host branding override the fixed Wayfare widget palette', () => {
    vi.mocked(helpers.useWidgetReady).mockReturnValue(true);
    vi.mocked(helpers.useLayout).mockReturnValue({ theme: 'light', displayMode: 'inline', supports: {} } as never);
    vi.mocked(helpers.useBranding).mockReturnValue({} as never);
    vi.mocked(helpers.useToolInfo).mockReturnValue({} as never);
    vi.mocked(helpers.useCallTool).mockReturnValue({ status: 'idle', isPending: false, reset: vi.fn(), callToolAsync: vi.fn() } as never);
    vi.mocked(helpers.useAppFlow).mockReturnValue({ activeView: 'results', navigate: vi.fn(), back: vi.fn() } as never);
    vi.mocked(helpers.useRequestDisplayMode).mockReturnValue(vi.fn() as never);
    vi.mocked(helpers.useSendFollowUpMessage).mockReturnValue(vi.fn() as never);
    vi.mocked(helpers.useUpdateModelContext).mockReturnValue(vi.fn() as never);
    vi.mocked(helpers.useViewState).mockReturnValue([undefined, vi.fn()] as never);

    const html = renderToStaticMarkup(<FlightResults />);

    expect(html).not.toContain('--cc-accent:');
    expect(html).not.toContain('--cc-focus:');
  });

  it('presents current options for selection without booking claims', () => {
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
    const html = renderToStaticMarkup(
      <FlightResultsView result={result} displayMode="inline" onVerify={vi.fn()} />,
    );

    expect(html).toContain('Flight options');
    expect(html).toContain('Select fare');
    expect(html).not.toMatch(/Book|Continue to payment|fare held/i);
    expect(html).toContain('Best value');

    const withoutCheapest = renderToStaticMarkup(
      <FlightResultsView result={{ ...result, itineraries: [{ ...itinerary, isCheapest: false }] }} displayMode="inline" onVerify={vi.fn()} />,
    );
    expect(withoutCheapest).not.toContain('Best value');
  });

  it('publishes only the active fare as bounded model context', () => {
    const third = {
      ...itinerary,
      selectionId: 'sel_33333333333333333333333333333333',
      carrier: { name: 'Cloudline Three', code: 'C3' },
      price: { total: 412.2, currency: 'CAD' },
    };

    const context = selectedFareModelContext(third);
    const wire = JSON.stringify(context);

    expect(wire).toContain(third.selectionId);
    expect(wire).toContain('Cloudline Three');
    expect(wire).toContain('412.2');
    expect(wire).toContain('active fare selection');
    expect(wire).not.toContain(itinerary.selectionId);
    expect(wire).not.toContain('offerId');
    expect(wire).not.toContain('logoUrl');
  });

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
    expect(inline).toContain('aria-label="Flight options carousel"');
    expect(inline).toContain('cc-carousel-stage');
    expect(inline).toContain('cc-carousel-window');
    expect(inline).toContain('cc-carousel-track');
    expect(inline).toContain('cc-carousel-slide');
    expect(inline).toContain('data-active-index="0"');
    expect(inline).toContain('data-slide-index="2"');
    expect(inline).toContain('aria-hidden="true"');
    expect(inline).toContain('cc-results-toolbar');
    expect((inline.match(/>Flight options</g) ?? [])).toHaveLength(1);
    expect(inline).not.toContain('cc-result-carousel');
    expect(inline).toContain('aria-label="Previous flight option"');
    expect(inline).toContain('aria-label="Next flight option"');
    const previousButton = inline.match(/<button[^>]*aria-label="Previous flight option"[^>]*>/)?.[0] ?? '';
    const nextButton = inline.match(/<button[^>]*aria-label="Next flight option"[^>]*>/)?.[0] ?? '';
    expect(previousButton).toContain('disabled');
    expect(nextButton).not.toContain('disabled');
    expect(inline).toContain('Option 1 of 3');
    expect(inline).not.toContain('Open the App in expanded view');
    expect(inline).not.toContain('Select one fare to verify');
    expect((fullscreen.match(/>Select fare<\/button>/g) ?? [])).toHaveLength(10);
    expect(fullscreen).not.toContain('aria-label="Flight options carousel"');
    expect(inline).not.toContain('Verify current fare');
    const selected = renderToStaticMarkup(
      <FlightResultsView
        result={{ status: 'success', itineraries: results, fallback: '10 flights', retrievedAt: itinerary.retrievedAt }}
        displayMode="inline"
        selectedSelectionId={results[1].selectionId}
        onSelect={vi.fn()}
        onVerify={vi.fn()}
      />,
    );
    expect((selected.match(/>Verify current fare<\/button>/g) ?? [])).toHaveLength(1);
    expect(selected).toContain('data-active-index="1"');
    const selectedNextButton = selected.match(/<button[^>]*aria-label="Next flight option"[^>]*>/)?.[0] ?? '';
    expect(selectedNextButton).not.toContain('disabled');
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

  it('renders a geometry-matched carousel skeleton with a next-card preview and no duplicate status shell', () => {
    const html = renderToStaticMarkup(<FlightResultsView state="loading" displayMode="inline" onVerify={vi.fn()} />);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Searching current fares');
    expect((html.match(/cc-skeleton-fare/g) ?? [])).toHaveLength(2);
    expect(html).toContain('cc-carousel-stage');
    expect(html).toContain('cc-carousel-window');
    expect(html).toContain('cc-carousel-track');
    expect(html).not.toContain('cc-results-toolbar');
    expect(html).toContain('cc-fare-card cc-skeleton-fare');
    expect(html).toContain('cc-skeleton-leg');
    expect((html.match(/cc-skeleton-price-stack"/g) ?? [])).toHaveLength(2);
    expect(html).toContain('cc-skeleton-details');
    expect(html).toContain('cc-shimmer');
    expect(html).not.toContain('cc-route-scan');
    expect(html).not.toContain('Checking providers');
  });

  it('uses bounded highlight chips and an accessible fixed-height fare-details face', () => {
    const html = renderToStaticMarkup(
      <FlightResultsView
        result={{ status: 'success', itineraries: [itinerary], fallback: 'One flight', message: 'One flight', retrievedAt: itinerary.retrievedAt }}
        displayMode="inline"
        onVerify={vi.fn()}
      />,
    );

    expect(html).toContain('cc-fare-highlight-badge');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('cc-fare-face-stack');
    expect(html).toContain('cc-fare-face-front');
    expect(html).toContain('cc-fare-face-back');
    expect(html).toContain('cc-compact-fare-front');
    expect(html).toContain('cc-compact-fare-main');
    expect(html).toContain('cc-compact-fare-price');
    expect(html).toContain('cc-leg-route-origin');
    expect(html).toContain('cc-leg-route-destination');
    expect(html).toContain('cc-flight-segment-row');
    expect(html).toContain('cc-flight-path-line');
    expect(html).toContain('cc-fare-detail-content-compact');
    expect(html).toContain('Back to flight');
    expect(html).not.toContain('cc-fare-watermark');
    expect(html).not.toContain('<details');
    expect(html).not.toContain('cc-details-panel');
  });

  it('uses curated carrier accents and falls back to the Wayfare accent for unknown carriers', () => {
    const renderCarrier = (code: string, name: string) => renderToStaticMarkup(
      <FlightResultsView
        result={{
          status: 'success',
          itineraries: [{ ...itinerary, carrier: { name, code } }],
          fallback: 'One flight',
          retrievedAt: itinerary.retrievedAt,
        }}
        displayMode="inline"
        onVerify={vi.fn()}
      />,
    );

    expect(renderCarrier('ND', 'Nuitee Air')).toContain('--cc-carrier-accent:#171717');
    expect(renderCarrier('TP', 'TAP')).toContain('--cc-carrier-accent:#087a55');
    expect(renderCarrier('TS', 'Air Transat')).toContain('--cc-carrier-accent:#17649a');
    expect(renderCarrier('ZZ', 'Future Airline')).not.toContain('--cc-carrier-accent:');
  });

  it('shows Nuitee-provided airline imagery with carrier text and a safe fallback', () => {
    const withLogo = renderToStaticMarkup(
      <FlightResultsView
        result={{ status: 'success', itineraries: [itinerary], fallback: 'One flight', retrievedAt: itinerary.retrievedAt }}
        displayMode="inline"
        onVerify={vi.fn()}
      />,
    );
    expect(withLogo).toContain('src="https://sandbox.nuitee.flights/static/images/airlines/ZZ.png"');
    expect(withLogo).toContain('referrerPolicy="no-referrer"');
    expect(withLogo).toContain('Cedar Skies');
    expect(withLogo).toContain('cc-carrier-initials');

    const withoutLogo = renderToStaticMarkup(
      <FlightResultsView
        result={{
          status: 'success',
          itineraries: [{ ...itinerary, carrier: { name: 'Cedar Skies', code: 'ZZ' } }],
          fallback: 'One flight',
          retrievedAt: itinerary.retrievedAt,
        }}
        displayMode="inline"
        onVerify={vi.fn()}
      />,
    );
    expect(withoutLogo).not.toContain('<img');
    expect(withoutLogo).toContain('cc-carrier-initials');
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
    expect(changed).toContain('cc-state-action-needed');
    expect(success).toContain('Verified, not booked');
    expect(success).toContain('cc-state-confirmed');
    expect(expired).toContain('Search again');
    expect(expired).toContain('cc-verification-error');
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

  it('makes round-trip direction and stop details scannable without opening fare details', () => {
    const roundTripWithStop = {
      ...itinerary,
      arrivalTime: '2030-04-20T14:20:00+02:00',
      durationMinutes: 530,
      stops: 1,
      legs: [
        {
          direction: 'OUTBOUND' as const,
          route: { origin: 'QZX', destination: 'QZY' },
          departureTime: '2030-04-20T09:00:00+02:00',
          arrivalTime: '2030-04-20T14:20:00+02:00',
          durationMinutes: 320,
          stops: 1,
        },
        {
          direction: 'INBOUND' as const,
          route: { origin: 'QZY', destination: 'QZX' },
          departureTime: '2030-04-27T16:00:00+02:00',
          arrivalTime: '2030-04-27T19:30:00+02:00',
          durationMinutes: 210,
          stops: 0,
        },
      ],
      segments: [
        {
          origin: 'QZX',
          destination: 'QZH',
          destinationName: 'Cedar Junction Test Airport',
          departureTime: '2030-04-20T09:00:00+02:00',
          arrivalTime: '2030-04-20T11:00:00+02:00',
          direction: 'OUTBOUND' as const,
          durationMinutes: 120,
          carrier: itinerary.carrier,
          flightNumber: '101',
        },
        {
          origin: 'QZH',
          originName: 'Cedar Junction Test Airport',
          destination: 'QZY',
          departureTime: '2030-04-20T12:20:00+02:00',
          arrivalTime: '2030-04-20T14:20:00+02:00',
          direction: 'OUTBOUND' as const,
          durationMinutes: 120,
          carrier: itinerary.carrier,
          flightNumber: '202',
        },
        {
          origin: 'QZY',
          destination: 'QZX',
          departureTime: '2030-04-27T16:00:00+02:00',
          arrivalTime: '2030-04-27T19:30:00+02:00',
          direction: 'INBOUND' as const,
          durationMinutes: 210,
          carrier: itinerary.carrier,
          flightNumber: '303',
        },
      ],
    };
    const html = renderToStaticMarkup(
      <FlightResultsView
        result={{ status: 'success', itineraries: [roundTripWithStop], fallback: 'Round trip', message: 'Round trip', retrievedAt: itinerary.retrievedAt }}
        displayMode="inline"
        onVerify={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(html).toMatch(/<h4[^>]*>.*Outbound.*<\/h4>/);
    expect(html).toMatch(/<h4[^>]*>.*Return.*<\/h4>/);
    expect(html).toContain('1 stop');
    expect(html).toContain('Nonstop');
    expect(html).toContain('Layover at <strong>Cedar Junction Test Airport (QZH)</strong>');
    expect(html).toContain('1h 20m');
    expect(html.indexOf('Cedar Junction Test Airport (QZH)')).toBeLessThan(html.indexOf('Return'));
    expect(html.indexOf('1 stop')).toBeLessThan(html.indexOf('Flight and fare details'));
  });

  it('shows that layover detail is unavailable instead of inventing a stop location', () => {
    const stoppedWithoutSegments = {
      ...itinerary,
      stops: 1,
      legs: [{ ...itinerary.legs[0], stops: 1 }],
    };
    const html = renderToStaticMarkup(
      <FlightResultsView
        result={{ status: 'success', itineraries: [stoppedWithoutSegments], fallback: 'One stop', message: 'One stop', retrievedAt: itinerary.retrievedAt }}
        displayMode="inline"
        onVerify={vi.fn()}
      />,
    );

    expect(html).toContain('1 stop');
    expect(html).toContain('Layover details were not provided.');
    expect(html).not.toContain('Layover at');
  });

  it('fails closed on malformed nested tool results and verification data', () => {
    const validResult = { status: 'success', itineraries: [itinerary], fallback: 'One flight', message: 'One flight', retrievedAt: itinerary.retrievedAt };
    expect(isSearchOutput(validResult)).toBe(true);
    expect(isSearchOutput({ ...validResult, itineraries: [{ ...itinerary, route: { origin: '??', destination: 'QZY' } }] })).toBe(false);
    expect(isSearchOutput({ ...validResult, itineraries: [] })).toBe(false);
    expect(isSearchOutput({ ...validResult, status: 'empty' })).toBe(false);
    expect(isSearchOutput({ ...validResult, status: 'error', itineraries: [] })).toBe(false);
    expect(isSearchOutput({ ...validResult, message: undefined })).toBe(false);
    expect(isSearchOutput({ ...validResult, retrievedAt: 'x'.repeat(65) })).toBe(false);
    expect(isSearchOutput({ ...validResult, searchId: 'provider-controlled-id' })).toBe(false);
    expect(isVerification({
      status: 'success', selectionId: itinerary.selectionId, availability: 'available', priceChanged: false,
      previousPrice: itinerary.price, currentPrice: itinerary.price, messages: [],
    })).toBe(true);
    expect(isVerification({ status: 'success', selectionId: itinerary.selectionId, availability: 'available', priceChanged: false })).toBe(false);
    expect(isGatewayError({ code: 'timeout', message: 'Timed out', retryable: true })).toBe(true);
    expect(isGatewayError({ code: 'made_up', message: 'No', retryable: true })).toBe(false);
  });

  it('confirms a fare selection only when the tool explicitly returns the same bounded selection', () => {
    const selectionId = itinerary.selectionId;

    expect(selectionOutcome({
      structuredContent: {
        status: 'selected',
        selectionId,
        message: 'The fare was added to this trip.',
      },
    }, selectionId)).toEqual({
      confirmed: true,
      message: 'The fare was added to this trip.',
    });

    for (const unsafeResponse of [
      undefined,
      { structuredContent: { status: 'error', selectionId } },
      { structuredContent: { status: 'selected', selectionId: 'sel_ffffffffffffffffffffffffffffffff' } },
      { structuredContent: { status: 'selected' } },
    ]) {
      expect(selectionOutcome(unsafeResponse, selectionId)).toEqual({
        confirmed: false,
        message: 'The fare could not be selected. Your previous selection is unchanged.',
      });
    }
  });

  it('retains a verified current fare when a replacement selection is rejected', () => {
    const replacement = {
      ...itinerary,
      selectionId: 'sel_ffffffffffffffffffffffffffffffff',
      price: { ...itinerary.price, total: 399.5 },
    };
    const verified = {
      status: 'success' as const,
      selectionId: itinerary.selectionId,
      availability: 'available' as const,
      priceChanged: true,
      previousPrice: itinerary.price,
      currentPrice: { total: 299.5, currency: 'CAD' },
      messages: ['The current fare remains available.'],
      verifiedAt: itinerary.retrievedAt,
    };
    const transition = selectionTransition(
      { structuredContent: { status: 'error', selectionId: replacement.selectionId } },
      replacement.selectionId,
      itinerary.selectionId,
    );

    expect(transition).toMatchObject({
      confirmed: false,
      nextSelectionId: itinerary.selectionId,
      resetVerification: false,
    });
    const review = renderToStaticMarkup(
      <FlightResultsView
        displayMode="inline"
        onVerify={vi.fn()}
        result={{
          status: 'success',
          itineraries: [itinerary, replacement],
          fallback: 'Two flights',
          message: 'Two flights',
          retrievedAt: itinerary.retrievedAt,
        }}
        selectedSelectionId={transition.nextSelectionId}
        verification={verified}
        view="review"
      />,
    );
    expect(review).toContain('Verified fare review');
    expect(review).toContain('CA$299.50');
    expect(review).toContain('The current fare remains available.');
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
    expect(actionHtml).toContain('aria-label="Verify current fare from QZX to QZY with Cedar Skies"');
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
    expect(review).toContain('Verified, not booked');
    expect(review).toContain('Cedar Bay Test Aerodrome');
    expect(review).toContain('Cloudlight Economy');
    expect(review).toContain('Fictional Wi-Fi');
    expect(review).toContain('Fare conditions and price breakdown');
    expect(review).toContain('aria-expanded="false"');
    expect(review).toContain('hidden=""');
    expect(review).not.toContain('cc-mark');
    for (const falseClaim of ['Boarding pass', 'Ticket number', 'Gate', 'Seat assigned', 'Book now']) expect(review).not.toContain(falseClaim);
  });

  it('uses the Wayfare widget foundation and includes responsive accessibility safeguards', () => {
    const css = readFileSync(new URL('../src/views/travel.css', import.meta.url), 'utf8');
    expect(css).toContain('--font-sans: "Host Grotesk Variable"');
    expect(css).toContain('font-family: var(--font-sans)');
    expect(readFileSync(new URL('../src/views/travel-home.tsx', import.meta.url), 'utf8'))
      .toContain("import '@fontsource-variable/host-grotesk';");
    expect(readFileSync(new URL('../src/views/flight-results.tsx', import.meta.url), 'utf8'))
      .toContain("import '@fontsource-variable/host-grotesk';");
    expect(css).toContain('--cc-bg: #FFFFFF');
    expect(css).toContain('--cc-surface-muted: #F7F7F7');
    expect(css).toContain('--cc-surface: #FFFFFF');
    expect(css).toContain('--cc-text: #0D0D0D');
    expect(css).toContain('--cc-muted: #5D5D5D');
    expect(css).toContain('--cc-subtle: #767676');
    expect(css).toContain('--cc-border: #E8E8E8');
    expect(css).toContain('--cc-selected: #66CCFF');
    expect(css).toContain('--cc-confirmed: #99FF99');
    expect(css).toContain('--cc-action-needed: #FF6666');
    expect(css).toContain('--cc-response: #2F7391');
    expect(css).toContain('--accent: #0D0D0D');
    expect(css).toContain('--accent-foreground: #FFFFFF');
    expect(css).toMatch(/\.cc-loyalty-progress progress::-webkit-progress-value\s*\{[^}]*background:\s*var\(--cc-text\)/s);
    expect(css).toContain('background: var(--cc-bg)');
    expect(css).not.toContain('font-family: inherit;');
    expect(css).not.toContain('2.7rem');
    expect(css).not.toContain('4.5rem');
    expect(css).toContain('@media (max-width: 320px)');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('overflow-wrap: anywhere');
    expect(css).toContain('repeat(auto-fit');
    expect(css).toMatch(/\.cc-domain-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
    expect(css).toContain('.cc-availability-badge');
    expect(css).toMatch(/\.cc-domain-name\s*\{[^}]*overflow-wrap:\s*anywhere/s);
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('@keyframes cc-shimmer');
    expect(css).not.toContain('@keyframes cc-route-scan');
    expect(css).toContain('.cc-search-skeleton');
    expect(css).toMatch(/\.cc-carousel-stage\s*\{[^}]*position:\s*relative/s);
    expect(css).toMatch(/\.cc-carousel-arrow\s*\{[^}]*top:\s*50%/s);
    expect(css).toMatch(/\.cc-carousel-window\s*\{[^}]*overflow:\s*clip/s);
    expect(css).toMatch(/\.cc-carousel-track\s*\{[^}]*display:\s*flex/s);
    expect(css).not.toMatch(/\.cc-carousel[^}]*overflow-x:\s*auto/s);
    expect(css).toMatch(/\.cc-fare-highlight-badge\s*\{[^}]*white-space:\s*nowrap/s);
    expect(css).toMatch(/\.cc-fare-face-stack\s*\{[^}]*display:\s*grid/s);
    expect(css).toMatch(/\.cc-fare-face\s*\{[^}]*grid-area:\s*1\s*\/\s*1/s);
    expect(css).toMatch(/\.cc-fare-face\s*\{[^}]*transition:/s);
    expect(css).toMatch(/\.cc-fare-card-details\s*\{[^}]*background:/s);
    expect(css).toMatch(/\.cc-carousel-slide\s*>\s*\.cc-fare-card\s*\{[^}]*min-block-size:\s*var\(--cc-fare-card-size,\s*15\.5rem\)/s);
    expect(css).toMatch(/\.cc-fare-card-round-trip\s*\{[^}]*--cc-fare-card-size:\s*19rem/s);
    expect(css).toContain('var(--cc-carrier-accent, var(--cc-accent))');
    expect(css).toMatch(/\.cc-fare-back-header\s*\{[^}]*grid-template-columns:/s);
    expect(css).toMatch(/\.cc-fare-back-button\s*\{[^}]*border:\s*0/s);
    expect(css).toMatch(/\.cc-fare-back-button\s*\{[^}]*background:\s*transparent/s);
    expect(css).toMatch(/\.cc-carousel-track\[data-active-index='1'\]\s*\{[^}]*transform:/s);
    expect(css).toMatch(/\.cc-carousel-track\s*\{[^}]*transition:\s*transform/s);
  });

  it('keeps compact fare state rules independent from the shared card shell', () => {
    const css = readFileSync(new URL('../src/views/travel.css', import.meta.url), 'utf8');
    expect(css).toMatch(/^\.cc-fare-selected\s*\{/m);
    expect(css).toMatch(/^\.cc-fare-card-details\s*\{/m);
    expect(css).not.toContain('.cc-app .cc-fare-card-details');
  });

  it('uses the portable Noodle Form and gates bridge-backed controls on widget readiness', () => {
    const editorSource = readFileSync(new URL('../src/views/search-editor.tsx', import.meta.url), 'utf8');
    const homeSource = readFileSync(new URL('../src/views/travel-home.tsx', import.meta.url), 'utf8');
    const resultsSource = readFileSync(new URL('../src/views/flight-results.tsx', import.meta.url), 'utf8');
    expect(editorSource).toContain('<Form');
    expect(editorSource).not.toContain('<form');
    expect(homeSource).toContain('useWidgetReady()');
    expect(resultsSource).toContain('useWidgetReady()');
  });

  it('keeps the per-carrier accent on the compact fare card', () => {
    const html = renderToStaticMarkup(
      <FlightResultsView displayMode="inline" result={sampleSearchOutput} onVerify={vi.fn()} />,
    );
    expect(html).toContain('--cc-carrier-accent');
    expect(html).toContain('cc-compact-fare-front');
  });
});
