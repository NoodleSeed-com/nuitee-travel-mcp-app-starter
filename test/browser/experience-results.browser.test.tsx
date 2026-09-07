import { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import type { DemoExperienceSearchOutput } from '../../src/demo-schemas.js';
import {
  ExperienceResultsView,
  type ExperienceJourneyState,
} from '../../src/views/experience-results.js';
import '../../src/views/travel.css';

const result: DemoExperienceSearchOutput = {
  status: 'success', dataSource: 'illustrative', source: 'WAYFARE_DEMO', isFictional: true,
  disclosure: 'Fictional Wayfare demo experiences. No operator inventory, capacity, admission, or live availability was checked.',
  message: 'Three fictional experience ideas are ready to explore for Tokyo.',
  fallback: 'Three fictional Wayfare experience ideas for Tokyo; no live operator inventory or booking availability was checked.',
  searchId: 'exsearch_0123456789abcdef0123456789abcdef', supportedDestination: true,
  searchContext: { destination: 'Tokyo', startDate: '2030-04-20', endDate: '2030-04-23', adults: 1, children: 0, currency: 'JPY' },
  experiences: Array.from({ length: 3 }, (_, index) => ({
    experienceId: `exp_${String(index).padStart(32, '0')}`,
    dataSource: 'illustrative' as const, source: 'WAYFARE_DEMO' as const, isFictional: true as const,
    city: 'Tokyo' as const, countryCode: 'JP' as const, timeZone: 'Asia/Tokyo' as const,
    title: ['Yanaka Food & Craft Walk', 'Sumida Evening Waterways', 'Quiet Tea & Design Studio'][index]!,
    operatorLabel: `Wayfare fictional operator ${index + 1}`,
    shortDescription: 'A bounded fictional Tokyo experience designed for interactive browser testing only.',
    categories: index === 0 ? ['FOOD' as const, 'CRAFT' as const] : ['DESIGN' as const, 'CULTURE' as const],
    durationMinutes: 90 + index * 30, meetingArea: `Tokyo demo district ${index + 1}`,
    accessibility: { stepFree: index > 0, summary: index > 0 ? 'Step-free route available.' : 'One short stairway.' },
    inclusions: ['Fictional local host', 'Demonstration'], restrictions: ['Demo conditions apply.'],
    cancellationPolicy: 'Free cancellation until 24 hours before the fictional slot.',
    price: { amountMinor: 6_500 + index * 1_000, currency: 'JPY' as const },
    slots: [{ slotId: `slot_${String(index).padStart(32, '0')}`, startLocal: '2030-04-20T10:00:00', timeZone: 'Asia/Tokyo' as const, remainingCapacity: 6, isFictional: true as const }],
  })),
};

let root: Root | undefined;
afterEach(() => { root?.unmount(); document.body.innerHTML = ''; root = undefined; });

function InteractiveExperiences() {
  const [journey, setJourney] = useState<ExperienceJourneyState>({
    searchId: result.searchId,
    screen: 'results',
    compareIds: [],
  });
  return <ExperienceResultsView
    result={result}
    displayMode="inline"
    journey={journey}
    onJourneyChange={setJourney}
    onAsk={vi.fn()}
  />;
}

function expectIconCentered(button: HTMLButtonElement) {
  const icon = button.querySelector<HTMLElement>('.cc-icon')!;
  const buttonRect = button.getBoundingClientRect();
  const iconRect = icon.getBoundingClientRect();
  expect(Math.abs((buttonRect.left + buttonRect.right) / 2 - (iconRect.left + iconRect.right) / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs((buttonRect.top + buttonRect.bottom) / 2 - (iconRect.top + iconRect.bottom) / 2)).toBeLessThanOrEqual(1);
}

it('supports carousel controls, compare thumbnails, details, and narrow layouts', async () => {
  await page.viewport(900, 1_200);
  const host = document.createElement('div'); document.body.append(host);
  root = createRoot(host); root.render(<InteractiveExperiences />);

  await expect.element(page.getByRole('heading', { name: 'Tokyo experience ideas' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Next experience' })).toBeEnabled();
  const carousel = document.querySelector<HTMLElement>('.cc-card-carousel-track')!;
  const firstCard = document.querySelector<HTMLElement>('.cc-experience-card')!;
  const previous = await page.getByRole('button', { name: 'Previous experience' }).element();
  const next = await page.getByRole('button', { name: 'Next experience' }).element();
  const cardCenter = firstCard.getBoundingClientRect().top + firstCard.getBoundingClientRect().height / 2;
  const previousCenter = previous.getBoundingClientRect().top + previous.getBoundingClientRect().height / 2;
  const nextCenter = next.getBoundingClientRect().top + next.getBoundingClientRect().height / 2;
  expect(Math.abs(previousCenter - cardCenter)).toBeLessThanOrEqual(5);
  expect(Math.abs(nextCenter - cardCenter)).toBeLessThanOrEqual(5);
  expectIconCentered(previous);
  expectIconCentered(next);
  expect(firstCard.querySelector<HTMLElement>('.cc-photo-band')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(180);
  expect(new Set([...document.querySelectorAll<HTMLImageElement>('.cc-experience-card .cc-photo-image')]
    .map((image) => image.src)).size).toBe(3);
  expect(getComputedStyle(carousel).scrollbarWidth).toBe('none');
  await page.getByRole('button', { name: 'Next experience' }).click();
  expect(carousel.scrollLeft).toBeGreaterThan(0);
  const detailButtons = page.getByRole('button', { name: /View details/ });
  const first = await detailButtons.first().element();
  const body = first.closest('.cc-experience-card-body')!;
  expect(Math.abs(first.getBoundingClientRect().width - body.getBoundingClientRect().width + 28)).toBeLessThanOrEqual(1);

  const compareButtons = page.getByRole('button', { name: /Compare .*?/ });
  await compareButtons.nth(0).click();
  await compareButtons.nth(1).click();
  expect(document.querySelectorAll('.cc-experience-thumb')).toHaveLength(2);
  const tray = document.querySelector<HTMLElement>('.cc-experience-tray')!;
  const thumbs = document.querySelector<HTMLElement>('.cc-experience-thumbs')!;
  const compare = await page.getByRole('button', { name: 'Compare selected' }).element();
  expect(Math.abs(compare.getBoundingClientRect().right - tray.getBoundingClientRect().right)).toBeLessThanOrEqual(1);
  expect(compare.getBoundingClientRect().left).toBeGreaterThan(thumbs.getBoundingClientRect().right);
  expect(Math.abs((compare.getBoundingClientRect().top + compare.getBoundingClientRect().bottom) / 2 -
    (thumbs.getBoundingClientRect().top + thumbs.getBoundingClientRect().bottom) / 2)).toBeLessThanOrEqual(5);
  for (const thumb of document.querySelectorAll<HTMLElement>('.cc-experience-thumb')) {
    const remove = thumb.querySelector<HTMLButtonElement>('button')!;
    expect(remove.getBoundingClientRect().left).toBeGreaterThanOrEqual(thumb.getBoundingClientRect().left);
    expect(remove.getBoundingClientRect().right).toBeLessThanOrEqual(thumb.getBoundingClientRect().right);
    expectIconCentered(remove);
    expect(remove.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    expect(Number.parseFloat(getComputedStyle(remove, '::before').width)).toBe(30);
    expect(Number.parseFloat(getComputedStyle(remove, '::before').height)).toBe(30);
  }
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(900);

  await page.viewport(320, 1_200);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  await page.getByRole('button', { name: 'Compare selected' }).click();
  await expect.element(page.getByRole('heading', { name: 'Compare two ideas' })).toBeVisible();
  await page.getByRole('button', { name: /View details for/ }).first().click();
  await expect.element(page.getByRole('heading', { name: 'Experience details' })).toBeVisible();
  await page.getByRole('button', { name: 'Ask about this experience' }).click();

  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
});
