import { useState, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import type { HomeOutput, Itinerary, SearchOutput } from '../../src/flight-schemas.js';
import { starterConfig } from '../../src/starter-config.js';
import { FlightResultsView } from '../../src/views/flight-results.js';
import { TravelHomeView } from '../../src/views/travel-home.js';

const home: HomeOutput = {
  status: 'ready',
  brand: starterConfig.brand.name,
  message: 'Flights are available. Tell me your route, dates, travelers, currency, and point-of-sale country to begin.',
  domains: [
    { name: 'Flights', availability: 'available' },
    { name: 'Stays', availability: 'coming_soon' },
    { name: 'Loyalty', availability: 'coming_soon' },
    { name: 'Ground travel', availability: 'coming_soon' },
    { name: 'Experiences', availability: 'coming_soon' },
  ],
  fallback: 'Wayfare can search and verify flights.',
};

const itinerary: Itinerary = {
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
  amenities: [{
    category: 'wifi',
    name: 'Fictional Wi-Fi',
    available: true,
    chargeable: false,
    details: 'Test fixture only',
    aircraftType: 'Cedar 100',
  }],
  legs: [{
    direction: 'OUTBOUND',
    route: { origin: 'QZX', destination: 'QZY' },
    departureTime: '2030-04-20T09:00:00Z',
    arrivalTime: '2030-04-20T12:15:00Z',
    durationMinutes: 195,
    stops: 0,
  }],
  segments: [],
  messages: ['Fictional fixture fare; not live inventory.'],
};

const search: SearchOutput = {
  status: 'success',
  message: 'One fictional test fare found.',
  fallback: 'One fictional test fare from QZX to QZY.',
  retrievedAt: itinerary.retrievedAt,
  searchContext: {
    origin: 'QZX',
    destination: 'QZY',
    departureDate: '2030-04-20',
    adults: 1,
    children: 0,
    infants: 0,
    childrenAges: [],
    infantAges: [],
    cabinClass: 'ECONOMY',
    currency: 'CAD',
    country: 'CA',
  },
  itineraries: [itinerary],
};

let root: Root | undefined;
let host: HTMLDivElement | undefined;

function mount(element: ReactElement) {
  host = document.createElement('div');
  host.dataset.testid = 'widget-host';
  host.style.width = '100%';
  document.body.append(host);
  root = createRoot(host);
  root.render(element);
}

function hasHorizontalOverflow() {
  const app = document.querySelector<HTMLElement>('.cc-app');
  return document.documentElement.scrollWidth > document.documentElement.clientWidth ||
    Boolean(app && app.scrollWidth > app.clientWidth);
}

function InteractiveResults({ theme = 'light' }: { readonly theme?: 'light' | 'dark' }) {
  const [selected, setSelected] = useState<string>();
  return (
    <FlightResultsView
      result={search}
      displayMode="inline"
      theme={theme}
      selectedSelectionId={selected}
      onSelect={setSelected}
      onVerify={vi.fn()}
    />
  );
}

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
  document.body.innerHTML = '';
  document.body.style.zoom = '';
});

describe('real-browser widget readiness', () => {
  it.each([
    ['loading', { state: 'loading' as const }, 'Opening your travel starting point…'],
    ['error', { state: 'error' as const }, 'The travel starter could not open. Try again.'],
    ['malformed', { state: 'malformed' as const }, 'The travel starter result was incomplete.'],
    ['success', { data: home }, 'Flights available'],
  ])('renders the TravelHome %s state and nested primitives in Inter', async (
    _state,
    props,
    visibleText,
  ) => {
    await page.viewport(320, 1_000);
    mount(
      <TravelHomeView
        {...props}
        theme="light"
        onSearchPrompt={vi.fn()}
      />,
    );
    await expect.element(page.getByText(visibleText)).toBeVisible();
    await document.fonts.ready;

    const frame = document.querySelector<HTMLElement>('.cc-app');
    const primitive = frame?.querySelector<HTMLElement>('.nsr-feedback, .nsr-flow');

    expect(frame).not.toBeNull();
    expect(primitive).not.toBeNull();
    expect(getComputedStyle(frame!).fontFamily).toContain('Inter Variable');
    expect(getComputedStyle(frame!).getPropertyValue('--font-sans'))
      .toContain('Inter Variable');
    expect(getComputedStyle(primitive!).fontFamily).toContain('Inter Variable');
  });

  it.each([280, 320])('renders TravelHome at %ipx without horizontal overflow', async (width) => {
    await page.viewport(width, 1_000);
    mount(<TravelHomeView data={home} theme="light" onSearchPrompt={vi.fn()} />);
    await expect.element(page.getByRole('button', { name: 'Search flights' })).toBeVisible();
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('keeps fare selection operable and touch-safe at 280px', async () => {
    await page.viewport(280, 1_200);
    mount(<InteractiveResults />);

    const select = page.getByRole('button', { name: /Select fare from QZX to QZY/ });
    await expect.element(select).toBeVisible();
    const selectBox = (await select.element()).getBoundingClientRect();
    expect(selectBox.height).toBeGreaterThanOrEqual(44);
    expect(selectBox.width).toBeGreaterThanOrEqual(44);

    await select.click();
    await expect.element(page.getByRole('button', { name: /Verify current fare/ })).toBeVisible();
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('keeps wider inline and fullscreen result modes bounded', async () => {
    await page.viewport(720, 1_200);
    const itineraries = Array.from({ length: 4 }, (_, index) => ({
      ...itinerary,
      selectionId: `sel_${String(index).padStart(32, '0')}`,
      price: { ...itinerary.price, total: itinerary.price.total + index * 25 },
    }));
    const result = { ...search, itineraries };
    mount(<FlightResultsView result={result} displayMode="inline" onVerify={vi.fn()} />);
    await expect.element(page.getByText('Open the App in expanded view to browse all 4 options.')).toBeVisible();
    expect(hasHorizontalOverflow()).toBe(false);

    root?.render(<FlightResultsView result={result} displayMode="fullscreen" onVerify={vi.fn()} />);
    await expect.poll(() => document.querySelectorAll('.cc-fare-card').length).toBe(4);
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('reflows without overflow under a 400% CSS zoom simulation', async () => {
    await page.viewport(1_280, 1_200);
    document.body.style.zoom = '4';
    mount(<TravelHomeView data={home} theme="light" onSearchPrompt={vi.fn()} />);
    await expect.element(page.getByRole('button', { name: 'Search flights' })).toBeVisible();
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('exposes a visible keyboard focus indicator', async () => {
    await page.viewport(320, 1_000);
    mount(<TravelHomeView data={home} theme="light" onSearchPrompt={vi.fn()} />);
    const search = page.getByRole('button', { name: 'Search flights' });
    await expect.element(search).toBeVisible();
    const searchButton = await search.element();

    // Chromium date controls expose multiple internal keyboard stops, so keep
    // walking the real tab order until the primary action is reached.
    for (let index = 0; index < 40 && document.activeElement !== searchButton; index += 1) {
      await userEvent.tab();
    }

    expect(document.activeElement).toBe(searchButton);
    const focusStyle = getComputedStyle(searchButton);
    expect(focusStyle.outlineStyle).not.toBe('none');
    expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
  });

  it('renders explicit light and dark theme surfaces', async () => {
    await page.viewport(320, 1_000);
    mount(<TravelHomeView data={home} theme="dark" onSearchPrompt={vi.fn()} />);
    await expect.poll(() => document.querySelector('.cc-app')).not.toBeNull();
    const darkApp = document.querySelector<HTMLElement>('.cc-app');
    expect(darkApp).not.toBeNull();
    expect(darkApp?.classList.contains('cc-theme-dark')).toBe(true);
    expect(getComputedStyle(darkApp!).colorScheme).toContain('dark');

    root?.render(<TravelHomeView data={home} theme="light" onSearchPrompt={vi.fn()} />);
    await expect.poll(() => document.querySelector('.cc-theme-dark')).toBeNull();
    const lightApp = document.querySelector<HTMLElement>('.cc-app');
    expect(getComputedStyle(lightApp!).colorScheme).toContain('light');
  });

  it('honors reduced-motion preferences for shimmer and controls', async () => {
    await page.viewport(320, 900);
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    mount(<FlightResultsView state="loading" displayMode="inline" onVerify={vi.fn()} />);
    await expect.element(page.getByText('Searching current flights')).toBeVisible();

    const shimmer = document.querySelector<HTMLElement>('.cc-shimmer');
    expect(shimmer).not.toBeNull();
    expect(getComputedStyle(shimmer!).animationName).toBe('none');
  });
});
