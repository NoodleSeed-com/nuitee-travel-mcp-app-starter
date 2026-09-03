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
    await page.viewport(1_100, 1_200);
    const itineraries = Array.from({ length: 4 }, (_, index) => ({
      ...itinerary,
      selectionId: `sel_${String(index).padStart(32, '0')}`,
      price: { ...itinerary.price, total: itinerary.price.total + index * 25 },
    }));
    const result = { ...search, itineraries };
    mount(<FlightResultsView result={result} displayMode="inline" onVerify={vi.fn()} />);
    await expect.element(page.getByText('Open the App in expanded view to browse all 4 options.')).toBeVisible();
    const carousel = page.getByRole('region', { name: 'Flight option 1 of 3' });
    await expect.element(carousel).toBeVisible();
    await expect.element(page.getByText('Option 1 of 3')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Previous flight option' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Next flight option' })).not.toBeDisabled();
    expect(document.querySelectorAll('.cc-fare-card')).toHaveLength(2);
    const carouselWindow = document.querySelector<HTMLElement>('.cc-carousel-window')!;
    const firstCard = document.querySelector<HTMLElement>('.cc-carousel-slide:not(.cc-carousel-peek-slide) .cc-fare-card')!;
    const peekCard = document.querySelector<HTMLElement>('.cc-carousel-peek-slide .cc-fare-card')!;
    const windowBounds = carouselWindow.getBoundingClientRect();
    const firstBounds = firstCard.getBoundingClientRect();
    const peekBounds = peekCard.getBoundingClientRect();
    const visiblePeek = Math.max(0, Math.min(windowBounds.right, peekBounds.right) - Math.max(windowBounds.left, peekBounds.left));
    expect(getComputedStyle(carouselWindow).overflowX).toBe('clip');
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
    await page.getByRole('button', { name: 'Next flight option' }).click();
    await expect.element(page.getByText('Option 2 of 3')).toBeVisible();
    await expect.element(page.getByText('CA$309.50', { exact: true })).toBeVisible();
    expect(document.querySelectorAll('.cc-fare-card')).toHaveLength(2);
    await page.getByRole('button', { name: 'Next flight option' }).click();
    await expect.element(page.getByText('Option 3 of 3')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Next flight option' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Previous flight option' })).not.toBeDisabled();
    expect(document.querySelectorAll('.cc-fare-card')).toHaveLength(2);
    const previousPeek = document.querySelector<HTMLElement>('.cc-carousel-previous-peek-shell .cc-fare-card')!;
    const finalCard = document.querySelector<HTMLElement>('.cc-carousel-slide:not(.cc-carousel-peek-slide) .cc-fare-card')!;
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

  it('bounds fare chips and swaps to an accessible fare-details face without changing card height', async () => {
    await page.viewport(720, 1_200);
    mount(<InteractiveResults />);
    await expect.element(page.getByText('Lowest fare')).toBeVisible();

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
    const frontContentLeft = document.querySelector<HTMLElement>('.cc-fare-header')!.getBoundingClientRect().left;
    const summary = document.querySelector<HTMLElement>('.cc-fare-front-summary')!;
    const footer = document.querySelector<HTMLElement>('.cc-fare-footer')!;
    const initialHeight = card.getBoundingClientRect().height;
    expect(footer.getBoundingClientRect().top - summary.getBoundingClientRect().bottom).toBeLessThanOrEqual(120);
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

  it('keeps the loading skeleton and result card on the same carousel geometry', async () => {
    await page.viewport(720, 1_200);
    mount(<FlightResultsView state="loading" displayMode="inline" onVerify={vi.fn()} />);
    await expect.element(page.getByText('Searching current flights')).toBeVisible();
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
  it('actually renders the selected-fare accent, not just the shared card shell', async () => {
    // .cc-card (the shared shell from Task 1/2) sets its own border and
    // box-shadow at the same (0,1,0) specificity as .cc-fare-selected, and
    // came later in the file — a regression here means the selected-state
    // border-color and box-shadow computed styles stay identical to the
    // unselected card even though the `cc-fare-selected` class is present.
    await page.viewport(720, 1_200);
    mount(<InteractiveResults />);
    await expect.element(page.getByRole('button', { name: /Select fare from QZX to QZY/ })).toBeVisible();
    const card = document.querySelector<HTMLElement>('.cc-fare-card')!;
    const before = getComputedStyle(card);
    const unselectedBorderColor = before.borderColor;
    const unselectedBoxShadow = before.boxShadow;

    await page.getByRole('button', { name: /Select fare from QZX to QZY/ }).click();
    await expect.element(page.getByRole('button', { name: /Selected fare from QZX to QZY/ })).toBeVisible();
    // .cc-fare-card also transitions border-color/background-color over
    // 120ms; wait for it to settle before reading the final computed value.
    await new Promise((resolve) => setTimeout(resolve, 200));
    const after = getComputedStyle(card);

    expect(after.borderColor).not.toBe(unselectedBorderColor);
    expect(after.boxShadow).not.toBe(unselectedBoxShadow);
    expect(after.borderColor).toBe('rgb(20, 33, 61)'); // --cc-accent: #14213d
    expect(after.boxShadow).toContain('inset');
    expect(after.boxShadow).toContain('rgb(20, 33, 61)');
    // .cc-fare-selected must ADD its accent inset, not REPLACE .cc-card's
    // own elevation — otherwise the selected card is the only flat one in
    // the row. The unselected box-shadow's shadow layers must still be
    // present verbatim, with the inset accent layered in front of them.
    expect(after.boxShadow.endsWith(unselectedBoxShadow)).toBe(true);
  });
});
