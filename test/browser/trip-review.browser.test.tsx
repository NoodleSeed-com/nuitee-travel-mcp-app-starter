import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { TripReviewView, tripSuggestion } from '../../src/views/trip-review.js';
import type { DemoTripReview } from '../../src/demo-schemas.js';

const review = {
  status: 'ready', experiences: [{
    selectionId: `esel_${'a'.repeat(32)}`,
    experience: { title: 'Tagus Sunset Sailing Circle', city: 'Lisbon' },
    slot: { startLocal: '2026-09-19T18:30:00', timeZone: 'Europe/Lisbon' },
    searchContext: { adults: 2 }, totalPrice: { amountMinor: 17200, currency: 'CAD' },
  }], missing: ['flight', 'stay'],
  planningContext: { source: 'experience', destination: 'Lisbon', meetingArea: 'Belém marina meeting point', startDate: '2026-09-18', endDate: '2026-09-21', dateBasis: 'experience_search', adults: 2, currency: 'CAD' },
  fallback: 'Your selected experience is part of your plan, not a booking.',
} as DemoTripReview;
let root: Root | undefined;
afterEach(() => { root?.unmount(); root = undefined; document.body.innerHTML = ''; document.body.style.zoom = ''; });

it('keeps the stay thumbnail, fallback and price aligned at desktop, mobile and zoom', async () => {
  const stayReview = { ...review, experiences: [], missing: ['flight', 'experiences'], stay: {
    dataSource: 'live_nuitee', selectionId: `hsel_${'b'.repeat(32)}`,
    propertyName: 'Selected Lisbon Hotel', city: 'Lisbon', checkInDate: '2026-09-18', checkOutDate: '2026-09-21', nights: 3, rooms: 1,
    staySubtotal: { amount: 519.23, currency: 'CAD' }, imageUrl: 'https://static.cupid.travel/browser-fixture.jpg',
  } } as DemoTripReview;
  const node = document.createElement('div'); document.body.append(node); root = createRoot(node);
  root.render(<TripReviewView data={stayReview} onSuggest={() => {}} onContinue={() => {}} />);
  await expect.element(page.getByRole('heading', { name: 'Selected Lisbon Hotel' })).toBeVisible();
  const photo = document.querySelector('.wf-review-stay-thumbnail img')!;
  expect(photo.getAttribute('referrerpolicy')).toBe('no-referrer');
  photo.dispatchEvent(new Event('error'));
  await expect.poll(() => document.querySelector('.wf-review-stay-thumbnail img')).toBeNull();
  expect(document.querySelector('.wf-review-stay-thumbnail .cc-icon')).not.toBeNull();
  for (const [width, zoom] of [[882, 1], [366, 1], [320, 1], [640, 2]] as const) {
    await page.viewport(width, 1100);
    document.body.style.zoom = String(zoom);
    await expect.poll(() => document.querySelector('.wf-review-stay-thumbnail')!.getBoundingClientRect().width / zoom).toBe(width / zoom > 640 ? 86 : 64);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    const facts = document.querySelector('.wf-review-stay h3')!.getBoundingClientRect();
    const price = document.querySelector('.wf-review-stay .wf-review-price')!.getBoundingClientRect();
    if (width / zoom <= 640) expect(Math.abs(facts.left - price.left)).toBeLessThan(1);
    await page.screenshot({ path: `__screenshots__/stay-review-thumbnail-${width}-${zoom}.png`, fullPage: true });
  }
  root.render(<TripReviewView data={{ ...stayReview, stay: { ...stayReview.stay!, imageUrl: 'https://static.cupid.travel/browser-fixture-changed.jpg' } }} />);
  await expect.poll(() => document.querySelector('.wf-review-stay-thumbnail img')?.getAttribute('src')).toBe('https://static.cupid.travel/browser-fixture-changed.jpg');
});

it('keeps breathing room between flight-only suggestions and the date note at narrow widths and zoom', async () => {
  const flightReview = {
    ...review, experiences: [], missing: ['stay', 'experiences'],
    flight: { selectionId: `sel_${'b'.repeat(32)}`, searchPrice: { total: 655.07, currency: 'CAD' }, disclosure: 'Flight search selection only.' },
    planningContext: { source: 'flight', destination: 'LIS', origin: 'IST', startDate: '2026-09-18', dateBasis: 'flight_departure', adults: 2, currency: 'CAD' },
    notes: ['The flight date is its departure date. Confirm local arrival and the final stay date before searching accommodation.'],
  } as DemoTripReview;
  const node = document.createElement('div'); document.body.append(node); root = createRoot(node);
  root.render(<TripReviewView data={flightReview} onSuggest={() => {}} onContinue={() => {}} />);
  for (const [width, zoom] of [[882, 1], [366, 1], [320, 1], [640, 2]] as const) {
    await page.viewport(width, 1100);
    document.body.style.zoom = String(zoom);
    await expect.element(page.getByRole('button', { name: 'Explore experiences' })).toBeVisible();
    await expect.poll(() => {
      const suggestions = document.querySelector('.wf-review-suggestions')!.getBoundingClientRect();
      const note = document.querySelector('.wf-review-note')!.getBoundingClientRect();
      return Math.round((note.top - suggestions.bottom) / zoom);
    }).toBe(16);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    const footer = document.querySelector('.wf-review-footer')!.getBoundingClientRect();
    const note = document.querySelector('.wf-review-note')!.getBoundingClientRect();
    expect(Math.round((footer.top - note.bottom) / zoom)).toBe(20);
    await page.screenshot({ path: `__screenshots__/flight-review-note-${width}-${zoom}.png`, fullPage: true });
  }
});

it('matches the approved review layout and offers contextual missing-item actions', async () => {
  await page.viewport(882, 1100);
  const node = document.createElement('div'); document.body.append(node); root = createRoot(node);
  const followUp = vi.fn(); const onContinue = vi.fn();
  root.render(<TripReviewView data={review} onSuggest={part => followUp(tripSuggestion(review, part))} onContinue={onContinue} />);
  await expect.element(page.getByRole('heading', { name: 'Your Lisbon plan' })).toBeVisible();
  await document.fonts.ready;
  expect(getComputedStyle(document.querySelector('.wf-review-header')!).padding).toBe('23px 24px 17px');
  expect(document.querySelector('.wf-review-thumbnail')!.getBoundingClientRect().width).toBe(86);
  const button = await page.getByRole('button', { name: 'Continue planning' }).element();
  expect(button.getBoundingClientRect().height).toBe(50);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(882);
  await page.getByRole('button', { name: 'Find a stay' }).click();
  expect(followUp).toHaveBeenCalledWith(expect.stringContaining('near Belém marina meeting point'));
  expect(followUp).toHaveBeenCalledWith(expect.stringContaining('2026-09-18 to 2026-09-21 for 2 adults'));
  await page.getByRole('button', { name: 'Continue planning' }).click();
  expect(onContinue).toHaveBeenCalledOnce();
  await page.screenshot({ path: '__screenshots__/wayfare-trip-review-implemented.png', fullPage: true });
  await page.viewport(366, 1100);
  await expect.poll(() => document.querySelector('.wf-review-thumbnail')!.getBoundingClientRect().width).toBe(64);
  expect(getComputedStyle(document.querySelector('.wf-review-content')!).padding).toBe('0px 17px 20px');
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(366);
  await page.screenshot({ path: '__screenshots__/wayfare-trip-review-mobile-implemented.png', fullPage: true });
  await page.viewport(320, 1100);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
});
