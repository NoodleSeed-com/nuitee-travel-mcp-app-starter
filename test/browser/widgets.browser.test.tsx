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
  ])('renders the TravelHome %s state and nested primitives in Host Grotesk', async (
    _state,
    props,
    visibleText,
  ) => {
    await page.viewport(320, 1_000);
    mount(
      <TravelHomeView
        {...props}
        theme="light"
      />,
    );
    await expect.element(page.getByText(visibleText)).toBeVisible();
    await document.fonts.ready;

    const frame = document.querySelector<HTMLElement>('.cc-app');
    const primitive = frame?.querySelector<HTMLElement>('.nsr-feedback, .nsr-flow');

    expect(frame).not.toBeNull();
    expect(primitive).not.toBeNull();
    expect(getComputedStyle(frame!).fontFamily).toContain('Host Grotesk Variable');
    expect(getComputedStyle(frame!).getPropertyValue('--font-sans'))
      .toContain('Host Grotesk Variable');
    expect(getComputedStyle(primitive!).fontFamily).toContain('Host Grotesk Variable');
  });

  it.each([280, 320])('renders TravelHome at %ipx without horizontal overflow', async (width) => {
    await page.viewport(width, 1_000);
    mount(<TravelHomeView data={home} theme="light" />);
    await expect.element(page.getByRole('heading', { name: 'Travel capabilities' })).toBeVisible();
    expect(document.querySelector('.cc-search-form')).toBeNull();
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
    await page.viewport(1_100, 1_200);
    const itineraries = Array.from({ length: 4 }, (_, index) => ({
      ...itinerary,
      selectionId: `sel_${String(index).padStart(32, '0')}`,
      price: { ...itinerary.price, total: itinerary.price.total + index * 25 },
    }));
    const result = { ...search, itineraries };
    mount(<FlightResultsView result={result} displayMode="inline" onVerify={vi.fn()} />);
    expect(document.body.textContent).not.toContain('Open the App in expanded view to browse all 4 options.');
    const carousel = page.getByRole('region', { name: 'Flight option 1 of 3' });
    await expect.element(carousel).toBeVisible();
    await expect.element(page.getByText('Option 1 of 3')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Previous flight option' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Next flight option' })).not.toBeDisabled();
    expect(document.querySelectorAll('.cc-fare-card')).toHaveLength(3);
    const carouselWindow = document.querySelector<HTMLElement>('.cc-carousel-window')!;
    const editSearchCard = document.querySelector<HTMLElement>('.cc-results-toolbar')!;
    const firstCard = document.querySelector<HTMLElement>('.cc-carousel-slide[data-slide-index="0"] .cc-fare-card')!;
    const peekCard = document.querySelector<HTMLElement>('.cc-carousel-slide[data-slide-index="1"] .cc-fare-card')!;
    const windowBounds = carouselWindow.getBoundingClientRect();
    const editSearchBounds = editSearchCard.getBoundingClientRect();
    const firstBounds = firstCard.getBoundingClientRect();
    const peekBounds = peekCard.getBoundingClientRect();
    const visiblePeek = Math.max(0, Math.min(windowBounds.right, peekBounds.right) - Math.max(windowBounds.left, peekBounds.left));
    expect(getComputedStyle(carouselWindow).overflowX).toBe('clip');
    expect(Math.abs(windowBounds.left - editSearchBounds.left)).toBeLessThanOrEqual(1);
    expect(firstBounds.left).toBeGreaterThanOrEqual(windowBounds.left);
    expect(firstBounds.right).toBeLessThanOrEqual(windowBounds.right);
    expect(visiblePeek / windowBounds.width).toBeGreaterThanOrEqual(0.2);
    expect(visiblePeek / windowBounds.width).toBeLessThanOrEqual(0.35);
    expect(Math.abs(firstBounds.height - peekBounds.height)).toBeLessThanOrEqual(1);
    const nextArrow = await page.getByRole('button', { name: 'Next flight option' }).element();
    const nextBounds = nextArrow.getBoundingClientRect();
    expect(Math.abs(
      firstBounds.top + firstBounds.height / 2 - (nextBounds.top + nextBounds.height / 2),
    )).toBeLessThanOrEqual(2);
    const oneCardStep = peekBounds.left - firstBounds.left;
    await page.getByRole('button', { name: 'Next flight option' }).click();
    await expect.element(page.getByText('Option 2 of 3')).toBeVisible();
    await expect.element(page.getByText('CA$309.50', { exact: true })).toBeVisible();
    expect(document.querySelectorAll('.cc-fare-card')).toHaveLength(3);
    await expect.poll(() => Math.abs(
      document.querySelector<HTMLElement>('.cc-carousel-slide[data-slide-index="1"] .cc-fare-card')!.getBoundingClientRect().left
        - firstBounds.left,
    )).toBeLessThanOrEqual(1);
    expect(oneCardStep).toBeGreaterThan(firstBounds.width);
    expect(oneCardStep - firstBounds.width).toBeLessThanOrEqual(13);
    await page.getByRole('button', { name: 'Next flight option' }).click();
    await expect.element(page.getByText('Option 3 of 3')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Next flight option' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Previous flight option' })).not.toBeDisabled();
    expect(document.querySelectorAll('.cc-fare-card')).toHaveLength(3);
    const previousPeek = document.querySelector<HTMLElement>('.cc-carousel-slide[data-slide-index="1"] .cc-fare-card')!;
    const finalCard = document.querySelector<HTMLElement>('.cc-carousel-slide[data-slide-index="2"] .cc-fare-card')!;
    await expect.poll(() => {
      const peek = previousPeek.getBoundingClientRect();
      const window = carouselWindow.getBoundingClientRect();
      return Math.max(0, Math.min(window.right, peek.right) - Math.max(window.left, peek.left)) / window.width;
    }).toBeLessThanOrEqual(0.35);
    const previousPeekBounds = previousPeek.getBoundingClientRect();
    const finalBounds = finalCard.getBoundingClientRect();
    const finalWindowBounds = carouselWindow.getBoundingClientRect();
    const visiblePrevious = Math.max(0, Math.min(finalWindowBounds.right, previousPeekBounds.right) - Math.max(finalWindowBounds.left, previousPeekBounds.left));
    expect(visiblePrevious / finalWindowBounds.width).toBeGreaterThanOrEqual(0.2);
    expect(visiblePrevious / finalWindowBounds.width).toBeLessThanOrEqual(0.35);
    expect(Math.abs(finalBounds.right - finalWindowBounds.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(finalBounds.width - firstBounds.width)).toBeLessThanOrEqual(1);
    expect(document.querySelector('.cc-result-carousel')).toBeNull();
    expect(hasHorizontalOverflow()).toBe(false);

    root?.render(<FlightResultsView result={result} displayMode="fullscreen" onVerify={vi.fn()} />);
    await expect.poll(() => document.querySelectorAll('.cc-fare-card').length).toBe(4);
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('keeps a visible next and previous fare preview on mobile', async () => {
    await page.viewport(390, 1_200);
    const itineraries = Array.from({ length: 3 }, (_, index) => ({
      ...itinerary,
      selectionId: `sel_${String(index).padStart(32, '0')}`,
      price: { ...itinerary.price, total: itinerary.price.total + index * 25 },
    }));
    mount(<FlightResultsView
      result={{ ...search, itineraries }}
      displayMode="inline"
      onVerify={vi.fn()}
    />);

    await expect.element(page.getByRole('region', { name: 'Flight option 1 of 3' }))
      .toBeVisible();
    const carouselWindow = document.querySelector<HTMLElement>('.cc-carousel-window')!;
    const visibleShare = (card: HTMLElement) => {
      const windowBounds = carouselWindow.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      return Math.max(
        0,
        Math.min(windowBounds.right, cardBounds.right)
          - Math.max(windowBounds.left, cardBounds.left),
      ) / windowBounds.width;
    };
    const nextPeek = document.querySelector<HTMLElement>('.cc-carousel-slide[data-slide-index="1"] .cc-fare-card')!;
    expect(visibleShare(nextPeek)).toBeGreaterThan(0.1);
    expect(visibleShare(nextPeek)).toBeLessThan(0.2);

    await page.getByRole('button', { name: 'Next flight option' }).click();
    await page.getByRole('button', { name: 'Next flight option' }).click();
    await expect.element(page.getByText('Option 3 of 3')).toBeVisible();
    const previousPeek = document.querySelector<HTMLElement>(
      '.cc-carousel-slide[data-slide-index="1"] .cc-fare-card',
    )!;
    await expect.poll(() => visibleShare(previousPeek)).toBeLessThan(0.2);
    expect(visibleShare(previousPeek)).toBeGreaterThan(0.1);
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('uses the full rail width at narrow mobile sizes so fare copy is not clipped', async () => {
    await page.viewport(280, 1_200);
    const itineraries = Array.from({ length: 3 }, (_, index) => ({
      ...itinerary,
      selectionId: `sel_${String(index).padStart(32, '0')}`,
      price: { ...itinerary.price, total: itinerary.price.total + index * 25 },
    }));
    mount(<FlightResultsView result={{ ...search, itineraries }} displayMode="inline" onVerify={vi.fn()} />);
    await expect.element(page.getByRole('region', { name: 'Flight option 1 of 3' })).toBeVisible();

    const windowBounds = document.querySelector<HTMLElement>('.cc-carousel-window')!.getBoundingClientRect();
    const cardBounds = document.querySelector<HTMLElement>('.cc-carousel-slide[data-slide-index="0"] .cc-fare-card')!
      .getBoundingClientRect();
    const arrivalBounds = document.querySelector<HTMLElement>('.cc-flight-endpoint-arrival')!.getBoundingClientRect();
    expect(Math.abs(windowBounds.width - cardBounds.width)).toBeLessThanOrEqual(1);
    expect(arrivalBounds.right).toBeLessThanOrEqual(cardBounds.right);
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('bounds fare chips and swaps to an accessible fare-details face without changing card height', async () => {
    await page.viewport(720, 1_200);
    mount(<InteractiveResults />);
    await expect.element(page.getByText('Best value')).toBeVisible();

    const card = document.querySelector<HTMLElement>('.cc-fare-card')!;
    const chip = document.querySelector<HTMLElement>('.cc-fare-highlight-badge')!;
    const cardBounds = card.getBoundingClientRect();
    const chipBounds = chip.getBoundingClientRect();
    expect(chipBounds.left).toBeGreaterThanOrEqual(cardBounds.left);
    expect(chipBounds.right).toBeLessThanOrEqual(cardBounds.right);
    expect(chip.scrollWidth).toBeLessThanOrEqual(chip.clientWidth);

    const toggle = page.getByRole('button', { name: 'Flight and fare details' });
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
    const front = document.querySelector<HTMLElement>('.cc-fare-face-front')!;
    const back = document.querySelector<HTMLElement>('.cc-fare-face-back')!;
    const frontContentLeft = document.querySelector<HTMLElement>('.cc-compact-fare-main')!.getBoundingClientRect().left;
    const frontScroll = document.querySelector<HTMLElement>('.cc-fare-front-scroll')!;
    const footer = document.querySelector<HTMLElement>('.cc-fare-footer')!;
    const initialHeight = card.getBoundingClientRect().height;
    expect(getComputedStyle(frontScroll).overflowY).toBe('hidden');
    expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(card.getBoundingClientRect().bottom);
    expect(front.getAttribute('aria-hidden')).toBe('false');
    expect(back.getAttribute('aria-hidden')).toBe('true');
    expect(getComputedStyle(back).transitionProperty).toContain('opacity');
    await toggle.click();
    const backButton = page.getByRole('button', { name: 'Back to flight' });
    await expect.element(backButton).toBeVisible();
    expect(back.hasAttribute('inert')).toBe(false);
    await expect.element(backButton).toHaveFocus();
    const backHeaderCopy = document.querySelector<HTMLElement>('.cc-fare-back-header > div')!.getBoundingClientRect();
    const backHeader = document.querySelector<HTMLElement>('.cc-fare-back-header')!;
    const backButtonBounds = (await backButton.element()).getBoundingClientRect();
    const backButtonStyle = getComputedStyle(await backButton.element());
    expect(backButtonBounds.left >= backHeaderCopy.right || backButtonBounds.top >= backHeaderCopy.bottom).toBe(true);
    await expect.poll(() => (
      Math.abs(backHeader.getBoundingClientRect().left - frontContentLeft)
    )).toBeLessThanOrEqual(1);
    expect(backButtonStyle.borderTopWidth).toBe('0px');
    expect(backButtonStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(card.classList.contains('cc-fare-card-details')).toBe(true);
    expect(getComputedStyle(card).backgroundImage).not.toBe('none');
    expect(getComputedStyle(back).backgroundImage).toBe('none');
    expect(front.getAttribute('aria-hidden')).toBe('true');
    expect(back.getAttribute('aria-hidden')).toBe('false');
    await expect.element(page.getByText('Fare family')).toBeVisible();
    expect(document.querySelector('.cc-fare-watermark')).toBeNull();
    const dataTile = document.querySelector<HTMLElement>('.cc-fare-detail-content-compact .cc-details-grid > div')!;
    expect(getComputedStyle(dataTile).borderTopWidth).toBe('1px');
    expect(Math.abs(card.getBoundingClientRect().height - initialHeight)).toBeLessThanOrEqual(1);
    await backButton.click();
    await expect.element(toggle).toHaveFocus();
    expect(Math.abs(card.getBoundingClientRect().height - initialHeight)).toBeLessThanOrEqual(1);
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('keeps a two-leg fare footer visible inside its aligned card at mobile width', async () => {
    await page.viewport(320, 1_200);
    const returnLeg = {
      direction: 'INBOUND' as const,
      route: { origin: 'QZY', destination: 'QZX' },
      departureTime: '2030-04-27T16:00:00+02:00',
      arrivalTime: '2030-04-27T19:30:00+02:00',
      durationMinutes: 210,
      stops: 0,
    };
    mount(
      <FlightResultsView
        displayMode="inline"
        onSelect={vi.fn()}
        onVerify={vi.fn()}
        result={{
          ...search,
          searchContext: {
            ...search.searchContext!,
            returnDate: '2030-04-27',
            tripType: 'ROUND_TRIP',
          },
          itineraries: [{ ...itinerary, legs: [itinerary.legs[0]!, returnLeg] }],
        }}
      />,
    );

    await expect.element(page.getByRole('region', { name: 'Flight option 1 of 1' })).toBeVisible();
    expect(document.querySelector('section[aria-label="Return QZY to QZX"]')).not.toBeNull();
    const card = document.querySelector<HTMLElement>('.cc-fare-card')!;
    const footer = document.querySelector<HTMLElement>('.cc-fare-footer')!;
    const cardBounds = card.getBoundingClientRect();
    const footerBounds = footer.getBoundingClientRect();
    expect(card.classList.contains('cc-fare-card-round-trip')).toBe(true);
    expect(footerBounds.bottom).toBeLessThanOrEqual(cardBounds.bottom);
    expect(footerBounds.top).toBeGreaterThanOrEqual(cardBounds.top);
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('keeps a max-content multi-stop itinerary compact with overflow details on its back face', async () => {
    await page.viewport(720, 1_200);
    const crowdedItinerary: Itinerary = {
      ...itinerary,
      arrivalTime: '2030-04-20T18:45:00Z',
      durationMinutes: 585,
      stops: 2,
      legs: [
        {
          direction: 'OUTBOUND',
          route: { origin: 'QZX', destination: 'QZY' },
          departureTime: '2030-04-20T09:00:00Z',
          arrivalTime: '2030-04-20T18:45:00Z',
          durationMinutes: 585,
          stops: 2,
        },
        {
          direction: 'INBOUND',
          route: { origin: 'QZY', destination: 'QZX' },
          departureTime: '2030-04-27T08:00:00Z',
          arrivalTime: '2030-04-27T18:30:00Z',
          durationMinutes: 630,
          stops: 2,
        },
      ],
      segments: [
        {
          origin: 'QZX', destination: 'QZA', direction: 'OUTBOUND',
          departureTime: '2030-04-20T09:00:00Z', arrivalTime: '2030-04-20T11:00:00Z',
          durationMinutes: 120, carrier: itinerary.carrier, flightNumber: '101',
        },
        {
          origin: 'QZA', originName: 'North Cedar International Test Airport', destination: 'QZB', direction: 'OUTBOUND',
          departureTime: '2030-04-20T12:10:00Z', arrivalTime: '2030-04-20T14:40:00Z',
          durationMinutes: 150, carrier: itinerary.carrier, flightNumber: '202',
        },
        {
          origin: 'QZB', originName: 'South Cloud Harbour Test Airport', destination: 'QZY', direction: 'OUTBOUND',
          departureTime: '2030-04-20T15:55:00Z', arrivalTime: '2030-04-20T18:45:00Z',
          durationMinutes: 170, carrier: itinerary.carrier, flightNumber: '303',
        },
        {
          origin: 'QZY', destination: 'QZB', direction: 'INBOUND',
          departureTime: '2030-04-27T08:00:00Z', arrivalTime: '2030-04-27T10:50:00Z',
          durationMinutes: 170, carrier: itinerary.carrier, flightNumber: '404',
        },
        {
          origin: 'QZB', originName: 'South Cloud Harbour Test Airport', destination: 'QZA', direction: 'INBOUND',
          departureTime: '2030-04-27T12:05:00Z', arrivalTime: '2030-04-27T14:35:00Z',
          durationMinutes: 150, carrier: itinerary.carrier, flightNumber: '505',
        },
        {
          origin: 'QZA', originName: 'North Cedar International Test Airport', destination: 'QZX', direction: 'INBOUND',
          departureTime: '2030-04-27T16:30:00Z', arrivalTime: '2030-04-27T18:30:00Z',
          durationMinutes: 120, carrier: itinerary.carrier, flightNumber: '606',
        },
      ],
    };

    mount(
      <FlightResultsView
        displayMode="inline"
        onSelect={vi.fn()}
        onVerify={vi.fn()}
        result={{
          ...search,
          searchContext: {
            ...search.searchContext!,
            returnDate: '2030-04-27',
            tripType: 'ROUND_TRIP',
          },
          itineraries: [crowdedItinerary],
        }}
      />,
    );

    await expect.element(page.getByRole('button', { name: 'Flight and fare details' })).toBeVisible();
    const card = document.querySelector<HTMLElement>('.cc-fare-card')!;
    const front = document.querySelector<HTMLElement>('.cc-fare-front-scroll')!;
    const footer = document.querySelector<HTMLElement>('.cc-fare-footer')!;
    const select = page.getByRole('button', { name: /Select fare from QZX to QZY/ });
    const cardBounds = card.getBoundingClientRect();
    const footerBounds = footer.getBoundingClientRect();

    expect(getComputedStyle(front).overflowY).toBe('hidden');
    expect(footerBounds.top).toBeGreaterThanOrEqual(cardBounds.top);
    expect(footerBounds.bottom).toBeLessThanOrEqual(cardBounds.bottom);
    await expect.element(select).toBeVisible();
    expect((await select.element()).getBoundingClientRect().bottom).toBeLessThanOrEqual(cardBounds.bottom);
    await page.getByRole('button', { name: 'Flight and fare details' }).click();
    const back = document.querySelector<HTMLElement>('.cc-fare-face-back')!;
    expect(back.textContent).toContain('North Cedar International Test Airport');
    expect(getComputedStyle(back).overflowY).toBe('auto');
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('keeps the loading skeleton and result card on the same carousel geometry', async () => {
    await page.viewport(720, 1_200);
    mount(<FlightResultsView state="loading" displayMode="inline" onVerify={vi.fn()} />);
    await expect.element(page.getByText('Searching current fares', { exact: true })).toBeVisible();
    const skeletonBounds = document.querySelector<HTMLElement>('.cc-skeleton-fare')!
      .getBoundingClientRect();

    root?.render(<FlightResultsView result={search} displayMode="inline" onVerify={vi.fn()} />);
    await expect.element(page.getByRole('article')).toBeVisible();
    await expect.poll(() => Math.abs(
      skeletonBounds.left - document.querySelector<HTMLElement>('.cc-fare-card')!.getBoundingClientRect().left,
    )).toBeLessThanOrEqual(1);
    const resultBounds = document.querySelector<HTMLElement>('.cc-fare-card')!
      .getBoundingClientRect();

    expect(Math.abs(skeletonBounds.width - resultBounds.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(skeletonBounds.left - resultBounds.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(skeletonBounds.height - resultBounds.height)).toBeLessThanOrEqual(1);
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('keeps the loading skeleton rows inset from the card edge, not flush', async () => {
    // The loading skeleton shares the compact fare-card shell and should
    // retain the same visible content inset as the loaded result.
    await page.viewport(720, 1_200);
    mount(<FlightResultsView state="loading" displayMode="inline" onVerify={vi.fn()} />);
    await expect.element(page.getByText('Searching current fares', { exact: true })).toBeVisible();

    const skeleton = document.querySelector<HTMLElement>('.cc-skeleton-fare')!;
    const skeletonStyle = getComputedStyle(skeleton);
    expect(Number.parseFloat(skeletonStyle.paddingLeft)).toBeGreaterThan(0);
    expect(Number.parseFloat(skeletonStyle.paddingRight)).toBeGreaterThan(0);

    const row = document.querySelector<HTMLElement>('.cc-skeleton-fare .cc-skeleton-row')!;
    expect(row.getBoundingClientRect().left).toBeGreaterThan(skeleton.getBoundingClientRect().left + 1);
  });

  it('keeps secondary verified-fare details collapsed until requested', async () => {
    await page.viewport(720, 1_200);
    mount(<FlightResultsView
      result={search}
      displayMode="inline"
      view="review"
      selectedSelectionId={itinerary.selectionId}
      onBack={vi.fn()}
      onVerify={vi.fn()}
      verification={{
        status: 'success',
        selectionId: itinerary.selectionId,
        availability: 'available',
        priceChanged: false,
        previousPrice: itinerary.price,
        currentPrice: itinerary.price,
        messages: [],
        verifiedAt: itinerary.retrievedAt,
      }}
    />);

    const toggle = page.getByRole('button', {
      name: 'Fare conditions and price breakdown',
    });
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect.element(page.getByText('Fictional Wi-Fi')).not.toBeVisible();

    await toggle.click();

    await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect.element(page.getByText('Fictional Wi-Fi')).toBeVisible();
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('reflows without overflow under a 400% CSS zoom simulation', async () => {
    await page.viewport(1_280, 1_200);
    document.body.style.zoom = '4';
    mount(<TravelHomeView data={home} theme="light" />);
    await expect.element(page.getByRole('heading', { name: 'Travel capabilities' })).toBeVisible();
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('exposes a visible keyboard focus indicator', async () => {
    await page.viewport(320, 1_000);
    mount(<FlightResultsView result={search} displayMode="inline" view="search" onSearchPrompt={vi.fn()} onBack={vi.fn()} onVerify={vi.fn()} />);
    const searchAction = page.getByRole('button', { name: 'Search flights' });
    await expect.element(searchAction).toBeVisible();
    const searchButton = await searchAction.element();

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
    mount(<TravelHomeView data={home} theme="dark" />);
    await expect.poll(() => document.querySelector('.cc-app')).not.toBeNull();
    const darkApp = document.querySelector<HTMLElement>('.cc-app');
    expect(darkApp).not.toBeNull();
    expect(darkApp?.classList.contains('cc-theme-dark')).toBe(false);
    expect(getComputedStyle(darkApp!).colorScheme).toContain('light');
    expect(getComputedStyle(darkApp!).backgroundColor).toBe('rgb(255, 255, 255)');

    root?.render(<TravelHomeView data={home} theme="light" />);
    await expect.poll(() => document.querySelector('.cc-theme-dark')).toBeNull();
    const lightApp = document.querySelector<HTMLElement>('.cc-app');
    expect(getComputedStyle(lightApp!).colorScheme).toContain('light');
  });

  it('honors reduced-motion preferences for shimmer and controls', async () => {
    await page.viewport(320, 900);
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    mount(<FlightResultsView state="loading" displayMode="inline" onVerify={vi.fn()} />);
    await expect.element(page.getByText('Searching current fares', { exact: true })).toBeVisible();

    const shimmer = document.querySelector<HTMLElement>('.cc-shimmer');
    expect(shimmer).not.toBeNull();
    expect(getComputedStyle(shimmer!).animationName).toBe('none');
  });

  it('keeps compact flight controls at the 44px accessible target minimum', async () => {
    await page.viewport(320, 1_000);
    mount(<FlightResultsView result={search} displayMode="inline" onVerify={vi.fn()} />);
    await expect.element(page.getByRole('button', { name: 'Flight and fare details' })).toBeVisible();

    const details = await page.getByRole('button', { name: 'Flight and fare details' }).element();
    const option = await page.getByRole('button', { name: 'Show flight option 1' }).element();
    expect(details.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(option.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(option.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
  });

  it('keeps the compact fare card neutral and moves selected blue to its button', async () => {
    await page.viewport(720, 1_200);
    mount(<InteractiveResults />);
    await expect.element(page.getByRole('button', { name: /Select fare from QZX to QZY/ })).toBeVisible();
    const card = document.querySelector<HTMLElement>('.cc-fare-card')!;
    const before = getComputedStyle(card);
    const unselectedBackgroundColor = before.backgroundColor;
    const unselectedBorderColor = before.borderColor;
    const unselectedBoxShadow = before.boxShadow;

    await page.getByRole('button', { name: /Select fare from QZX to QZY/ }).click();
    await expect.poll(() => card.classList.contains('cc-fare-selected')).toBe(true);
    // .cc-fare-card also transitions border-color/background-color over
    // 120ms; wait for it to settle before reading the final computed value.
    await new Promise((resolve) => setTimeout(resolve, 200));
    const after = getComputedStyle(card);
    const selectedAction = await page.getByRole('button', { name: /Selected fare from QZX to QZY/ }).element();
    const selectedActionStyle = getComputedStyle(selectedAction);

    expect(after.backgroundColor).toBe(unselectedBackgroundColor);
    expect(after.borderColor).toBe(unselectedBorderColor);
    expect(after.boxShadow).toBe(unselectedBoxShadow);
    expect(selectedActionStyle.backgroundColor).toBe('rgb(102, 204, 255)');
    expect(selectedActionStyle.color).toBe('rgb(13, 13, 13)');
  });
});
