import { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import type { DemoExperience, DemoExperienceSearchInput, DemoExperienceSelection } from '../../src/demo-schemas.js';
import { ExperienceAddedView, ExperienceChooseView, type ExperienceSelectionState } from '../../src/views/experience-selection.js';
import '@fontsource-variable/host-grotesk';
import '@noodleseed/one/react/styles.css';
import '../../src/views/travel.css';

const context: DemoExperienceSearchInput = { destination: 'Lisbon', startDate: '2026-09-18', endDate: '2026-09-21', adults: 2, children: 0, currency: 'CAD' };
const experience: DemoExperience = {
  experienceId: 'exp_0123456789abcdef0123456789abcdef', dataSource: 'illustrative', source: 'WAYFARE_DEMO', isFictional: true,
  city: 'Lisbon', countryCode: 'PT', timeZone: 'Europe/Lisbon', title: 'Tagus Sunset Sailing Circle', operatorLabel: 'Wayfare fictional sailing operator',
  shortDescription: 'A quiet fictional harbor sail with skyline storytelling and a small seasonal snack.', categories: ['CULTURE', 'WATER'],
  durationMinutes: 120, meetingArea: 'Belém marina meeting point', price: { amountMinor: 8600, currency: 'CAD' },
  accessibility: { stepFree: false, summary: 'Assisted boarding may be requested. This experience is not step-free.' },
  inclusions: ['Two-hour sail', 'Welcome drink', 'A light snack'], restrictions: [],
  cancellationPolicy: 'Free cancellation until 48 hours before the fictional slot.',
  slots: [18, 19, 20].map((day) => ({ slotId: `slot_${String(day).padStart(32, '0')}`, startLocal: `2026-09-${day}T18:30:00`, timeZone: 'Europe/Lisbon', remainingCapacity: 6, isFictional: true })),
};
const saved = (slotId: string): DemoExperienceSelection => ({ selectionId: 'esel_0123456789abcdef0123456789abcdef', experience, slot: experience.slots.find((slot) => slot.slotId === slotId)!, searchContext: context, totalPrice: { amountMinor: 17200, currency: 'CAD' }, addedAt: '2026-09-08T10:00:00Z', expiresAt: '2026-09-08T10:30:00Z' });
let root: Root | undefined;
afterEach(() => { root?.unmount(); document.body.innerHTML = ''; root = undefined; });
function mount(node: React.ReactNode, width?: number) {
  document.body.style.margin = '0';
  const host = document.createElement('div'); if (width) host.style.width = `${width}px`; document.body.append(host); root = createRoot(host); root.render(node);
}
const onReview = vi.fn();
function SelectionFlow() {
  const [choice, setChoice] = useState<ExperienceSelectionState>();
  const [selected, setSelected] = useState<DemoExperienceSelection>();
  return selected ? <ExperienceAddedView selection={selected} onReview={onReview} onExplore={() => setSelected(undefined)} /> :
    <ExperienceChooseView experience={experience} context={context} choice={choice} onChoice={setChoice} onAdd={(slotId) => setSelected(saved(slotId))} onAsk={vi.fn()} onBack={vi.fn()} />;
}

it('matches the approved desktop spacing and date-to-add-to-review interaction', async () => {
  await page.viewport(882, 1200);
  mount(<SelectionFlow />);
  await expect.element(page.getByRole('heading', { name: experience.title })).toBeVisible();
  await document.fonts.ready;
  await expect.element(page.getByRole('button', { name: 'Choose a day to continue' })).toBeDisabled();
  await expect.element(page.getByRole('button', { name: '18:30', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Saturday 19 Sep' }).click();
  await expect.element(page.getByRole('button', { name: '18:30', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.element(page.getByRole('button', { name: 'Add to my trip', exact: true })).toBeEnabled();
  const detail = document.querySelector<HTMLElement>('.wf-trip-detail')!;
  const photo = document.querySelector<HTMLElement>('.wf-trip-photo')!;
  const add = await page.getByRole('button', { name: 'Add to my trip', exact: true }).element();
  expect(getComputedStyle(detail).padding).toBe('25px');
  expect(photo.getBoundingClientRect().height).toBe(230);
  expect(photo.getBoundingClientRect().left).toBe(1);
  expect(photo.getBoundingClientRect().width).toBe(880);
  expect(add.getBoundingClientRect().height).toBe(50);
  expect(add.getBoundingClientRect().width).toBe(detail.clientWidth - 50);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(882);
  await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
  await page.screenshot({ path: '__screenshots__/wayfare-trip-choose-implemented.png', fullPage: true });
  await page.getByRole('button', { name: 'Add to my trip', exact: true }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Added to your trip');
  await expect.element(page.getByRole('heading', { name: 'Part of your Lisbon plan' })).toBeVisible();
  expect(getComputedStyle(document.querySelector('.wf-trip-selected')!).backgroundColor).toBe('rgb(102, 204, 255)');
  await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
  await page.screenshot({ path: '__screenshots__/wayfare-trip-added-implemented.png', fullPage: true });
  await page.getByRole('button', { name: 'Review my trip', exact: true }).click();
  expect(onReview).toHaveBeenCalledOnce();
  await page.getByRole('button', { name: 'Explore more experiences' }).click();
  await expect.element(page.getByRole('heading', { name: experience.title })).toBeVisible();
});

it('preserves the approved mobile spacing, prevents overflow, and requires a time when several exist', async () => {
  await page.viewport(366, 1400);
  const multiTime = { ...experience, slots: [experience.slots[0]!, { ...experience.slots[0]!, slotId: 'slot_ffffffffffffffffffffffffffffffff', startLocal: '2026-09-18T19:30:00' }] };
  function MultipleTimes() {
    const [choice, setChoice] = useState<ExperienceSelectionState>();
    return <ExperienceChooseView experience={multiTime} context={context} choice={choice} onChoice={setChoice} onAdd={vi.fn()} />;
  }
  mount(<MultipleTimes />);
  await expect.element(page.getByRole('heading', { name: experience.title })).toBeVisible();
  await page.getByRole('button', { name: 'Friday 18 Sep' }).click();
  await expect.element(page.getByRole('button', { name: 'Choose a time to continue' })).toBeDisabled();
  await page.getByRole('button', { name: '19:30', exact: true }).click();
  await expect.element(page.getByRole('button', { name: 'Add to my trip', exact: true })).toBeEnabled();
  expect(getComputedStyle(document.querySelector('.wf-trip-detail')!).padding).toBe('18px');
  expect(document.querySelector('.wf-trip-photo')!.getBoundingClientRect().height).toBe(195);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(366);
  await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
  await page.screenshot({ path: '__screenshots__/wayfare-trip-mobile-implemented.png', fullPage: true });
  await page.viewport(320, 1400);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  await page.getByText('What’s included, access & cancellation', { exact: true }).click();
  await expect.element(page.getByText('Fictional operator: Wayfare fictional sailing operator')).toBeVisible();
});

it('keeps pending, expired and child-price-unknown states truthful and non-actionable', async () => {
  await page.viewport(366, 1400);
  const choice = { experienceId: experience.experienceId, date: '2026-09-18', slotId: experience.slots[0]!.slotId };
  mount(<ExperienceChooseView experience={experience} context={context} choice={choice} status="pending" onAdd={vi.fn()} onChoice={vi.fn()} />);
  await expect.element(page.getByRole('button', { name: 'Adding to your trip…' })).toBeDisabled();
  root!.render(<ExperienceChooseView experience={experience} context={context} choice={choice} status="expired" message="These experience options have expired." onAdd={vi.fn()} />);
  await expect.element(page.getByRole('alert')).toHaveTextContent('These experience options have expired.');
  await expect.element(page.getByRole('button', { name: 'Refresh experience' })).toBeDisabled();
  root!.render(<ExperienceChooseView experience={experience} context={{ ...context, children: 1 }} choice={choice} onAdd={vi.fn()} />);
  await expect.element(page.getByRole('button', { name: 'Add to my trip', exact: true })).toBeDisabled();
  expect(document.body.textContent).toContain('Total unknown');
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(366);
});
