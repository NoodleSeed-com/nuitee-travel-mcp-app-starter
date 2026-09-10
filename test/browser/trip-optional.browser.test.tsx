import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page } from 'vitest/browser';
import type { DemoInsuranceComparisonOutput, DemoRewardFlightSearchOutput } from '../../src/demo-schemas.js';
declare module 'vitest/browser' { interface BrowserCommands { tripOptionalFixtures(): Promise<{ protection: DemoInsuranceComparisonOutput; points: DemoRewardFlightSearchOutput }>; } }
const bridge = vi.hoisted(() => ({ review: vi.fn(), points: vi.fn(), protection: vi.fn(), select: vi.fn(), send: vi.fn(), context: vi.fn() }));
vi.mock('../../src/helpers.js', async original => ({
  ...await original<typeof import('../../src/helpers.js')>(),
  useWidgetReady: () => true,
  useLayout: () => ({ locale: 'en-IE', supports: { followUpMessage: true, modelContext: true } }),
  useCallTool: (name: string) => ({ callToolAsync: name === 'compare_reward_flights' ? bridge.points : name === 'compare_travel_insurance' ? bridge.protection : name === 'select_trip_protection' ? bridge.select : bridge.review }),
  useSendFollowUpMessage: () => bridge.send,
  useUpdateModelContext: () => bridge.context,
}));
import { InlineTripReview } from '../../src/views/trip-review.js';
import { runTripProtection } from '../../src/trip-protection.js';

const review = { status: 'ready', experiences: [], missing: ['stay', 'experiences'],
  flight: { selectionId: `sel_${'a'.repeat(32)}`, searchPrice: { total: 1200, currency: 'EUR' }, disclosure: 'Fare verification needed.' },
  planningContext: { source: 'flight', dateBasis: 'flight_departure', origin: 'Toronto', destination: 'Lisbon', startDate: '2026-09-16', endDate: '2026-09-17', adults: 2, children: 0, currency: 'EUR' },
  fallback: 'A selected flight, with optional stays and experiences.', disclosure: 'A plan, not a booking.' };
let comparison: DemoInsuranceComparisonOutput;
let pointsResult: DemoRewardFlightSearchOutput;
beforeAll(async () => { const fixtures = await commands.tripOptionalFixtures(); comparison = fixtures.protection; pointsResult = fixtures.points; });
function protectionSelection() {
  const common = { review, requestedAt: new Date().toISOString(), readOk: true, tripReadOk: true };
  const prepared = runTripProtection({ ...common, kind: 'prepare', comparison, state: {} });
  return runTripProtection({ ...common, kind: 'select', action: 'select', state: prepared.nextState, comparisonId: comparison.comparisonId, planId: comparison.plans[0]!.planId }).selection;
}
let root: Root | undefined;
afterEach(() => { root?.unmount(); root = undefined; document.body.innerHTML = ''; document.body.style.zoom = ''; vi.restoreAllMocks(); vi.resetAllMocks(); });
function mount() {
  bridge.review.mockResolvedValue({ structuredContent: review }); bridge.context.mockResolvedValue(undefined);
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  root.render(<InlineTripReview onBack={() => {}} />);
}
it('opens points inline using current trip context, then restores focus without changing the cash estimate', async () => {
  let resolve!: (value: unknown) => void;
  bridge.points.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  mount();
  await page.getByRole('button', { name: 'View points options' }).click();
  await expect.element(page.getByText('Loading points examples…')).toBeVisible();
  expect(bridge.points).toHaveBeenCalledWith(expect.objectContaining({ destination: 'Lisbon', origin: 'Toronto', adults: 2, currency: 'EUR', pointsBudget: 42500 }));
  resolve({ structuredContent: pointsResult });
  await expect.element(page.getByRole('heading', { name: 'Points for your Lisbon trip' })).toHaveFocus();
  await expect.element(page.getByText('42,500', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'View Concept partner B example' }).click();
  await expect.element(page.getByText('500', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to your trip' }).first().click();
  await expect.element(page.getByRole('button', { name: 'View points options' })).toHaveFocus();
  await expect.element(page.getByRole('region', { name: 'Trip planning estimate' }).getByText('€1,200.00', { exact: true }).first()).toBeVisible();
  expect(bridge.send).not.toHaveBeenCalled(); expect(bridge.select).not.toHaveBeenCalled();
});
it('waits for acknowledged protection persistence, refreshes the estimate, and removes explicitly', async () => {
  bridge.protection.mockResolvedValue({ structuredContent: { ...comparison, planning: { canSelect: true, message: 'You can add one fictional concept.' } } });
  mount();
  await page.getByRole('button', { name: 'Compare protection' }).click();
  await expect.element(page.getByRole('heading', { name: 'Travel protection for Lisbon' })).toBeVisible();
  let resolve!: (value: unknown) => void;
  bridge.select.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  await page.getByRole('button', { name: 'Add Essential concept to plan' }).click();
  await expect.element(page.getByRole('button', { name: 'Back to your trip' }).first()).toBeDisabled();
  expect(document.body.textContent).not.toContain('Added to your plan');
  const selection = protectionSelection();
  bridge.review.mockResolvedValue({ structuredContent: { ...review, protection: selection } });
  resolve({ structuredContent: { status: 'selected', message: 'Fictional concept added.', selection } });
  await expect.element(page.getByRole('button', { name: 'Review protection' })).toHaveFocus();
  await expect.element(page.getByText('€1,234.00', { exact: true })).toBeVisible();
  await expect.poll(() => bridge.context.mock.lastCall?.[0].structuredContent.tripPlanning.protection.planId).toBe(comparison.plans[0]!.planId);
  bridge.select.mockResolvedValue({ structuredContent: { status: 'removed', message: 'Fictional choice removed.' } });
  bridge.review.mockResolvedValue({ structuredContent: review });
  await page.getByRole('button', { name: 'Remove protection' }).click();
  await expect.element(page.getByRole('button', { name: 'Compare protection' })).toHaveFocus();
  expect(bridge.select).toHaveBeenLastCalledWith({ action: 'remove', comparisonId: comparison.comparisonId, planId: comparison.plans[0]!.planId });
  expect(document.body.textContent).not.toContain('€1,234.00');
  expect(bridge.send).not.toHaveBeenCalled();
});

it('ignores late points results after Back, retries failures and keeps empty examples non-transactional', async () => {
  let resolve!: (value: unknown) => void;
  bridge.points.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  mount();
  await page.getByRole('button', { name: 'View points options' }).click();
  await expect.element(page.getByText('Loading points examples…')).toBeVisible();
  await page.getByRole('button', { name: 'Back to your trip' }).first().click();
  resolve({ structuredContent: pointsResult });
  await expect.element(page.getByRole('button', { name: 'View points options' })).toHaveFocus();
  expect(document.querySelector('.wf-trip-points')).toBeNull();
  bridge.points.mockRejectedValueOnce(new Error('Fixture offline')).mockResolvedValueOnce({ structuredContent: { ...pointsResult, status: 'empty', options: [] } });
  await page.getByRole('button', { name: 'View points options' }).click();
  await expect.element(page.getByRole('heading', { name: 'Points examples could not load' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect.element(page.getByRole('heading', { name: 'No reward examples fit this trip' })).toBeVisible();
  expect(bridge.select).not.toHaveBeenCalled(); expect(bridge.send).not.toHaveBeenCalled();
});

it('does not turn unsupported party or missing protection dates into an invented comparison', async () => {
  mount();
  bridge.review.mockResolvedValue({ structuredContent: { ...review, planningContext: { ...review.planningContext, infants: 1, endDate: undefined } } });
  await page.getByRole('button', { name: 'Compare protection' }).click();
  await expect.element(page.getByRole('heading', { name: 'Protection concepts are unavailable for this trip' })).toBeVisible();
  expect(bridge.protection).not.toHaveBeenCalled();
  await page.getByRole('button', { name: 'Back to your trip' }).click();
  await page.getByRole('button', { name: 'View points options' }).click();
  await expect.element(page.getByText(/one to eight adults only/)).toBeVisible();
  expect(bridge.points).not.toHaveBeenCalled(); expect(bridge.send).not.toHaveBeenCalled();
});

it('rejects a failed acknowledgement, supports a fresh comparison and does not keep stale protection after a trip change', async () => {
  bridge.protection.mockResolvedValue({ structuredContent: { ...comparison, planning: { canSelect: true, message: 'One example can be added.' } } });
  bridge.select.mockResolvedValueOnce({ structuredContent: { status: 'conflict', message: 'State changed.' } });
  mount();
  await page.getByRole('button', { name: 'Compare protection' }).click();
  await page.getByRole('button', { name: 'Add Essential concept to plan' }).click();
  await expect.element(page.getByRole('alert')).toHaveTextContent('The protection choice was not confirmed');
  expect(document.body.textContent).not.toContain('Selected in demo plan');
  await page.getByRole('button', { name: 'Reload comparison' }).click();
  await expect.element(page.getByRole('button', { name: 'Add Essential concept to plan' })).toBeEnabled();
  bridge.select.mockResolvedValueOnce({ structuredContent: { status: 'selected', message: 'Saved', selection: protectionSelection() } });
  await page.getByRole('button', { name: 'Add Essential concept to plan' }).click();
  await expect.element(page.getByText('Your trip changed, so that protection choice is not included in the current estimate.')).toBeVisible();
  expect(document.body.textContent).not.toContain('€1,234.00');
  await expect.element(page.getByRole('button', { name: 'Compare protection' })).toHaveFocus();
  expect(bridge.send).not.toHaveBeenCalled();
});

it('matches approved optional panels, centered carousel arrows and 44px actions at desktop, mobile and zoom', async () => {
  bridge.points.mockResolvedValue({ structuredContent: pointsResult });
  bridge.protection.mockResolvedValue({ structuredContent: { ...comparison, planning: { canSelect: true, message: 'One example can be added.' } } });
  mount();
  for (const [width, zoom] of [[1024, 1], [390, 1], [320, 1], [640, 2]] as const) {
    await page.viewport(width, 1300); document.body.style.zoom = String(zoom);
    await expect.element(page.getByRole('button', { name: 'View points options' })).toBeVisible();
    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect(getComputedStyle(document.querySelector('.wf-review-optional-icon')!).width).toBe('36px');
    await page.screenshot({ path: `__screenshots__/optional-review-${width}-${zoom}.png`, fullPage: true });
    for (const [label, className] of [['View points options', '.wf-trip-points'], ['Compare protection', '.wf-trip-protection']] as const) {
      await page.getByRole('button', { name: label }).click();
      await expect.poll(() => document.querySelector(`${className} article`)).not.toBeNull();
      await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      const arrows = [...document.querySelectorAll<HTMLElement>(`${className} .cc-card-carousel-nav button`)];
      for (const button of arrows) {
        const r = button.getBoundingClientRect(), icon = button.querySelector('svg')?.getBoundingClientRect();
        if (!r.width || !icon) continue;
        expect(r.width / zoom).toBeGreaterThanOrEqual(44);
        expect(Math.abs((r.left + r.right) / 2 - (icon.left + icon.right) / 2)).toBeLessThan(1);
        expect(Math.abs((r.top + r.bottom) / 2 - (icon.top + icon.bottom) / 2)).toBeLessThan(1);
      }
      await page.screenshot({ path: `__screenshots__/optional-${className.slice(1)}-${width}-${zoom}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Back to your trip' }).first().click();
      await expect.element(page.getByRole('button', { name: label })).toHaveFocus();
    }
  }
});

it('rechecks protection at expiry while its inline comparison is open and updates the estimate and context', async () => {
  const actualTimeout = window.setTimeout.bind(window);
  let recheck: (() => void) | undefined;
  vi.spyOn(window, 'setTimeout').mockImplementation((handler, delay, ...args) => {
    if (delay === 60_000 && typeof handler === 'function') recheck = handler as () => void;
    return actualTimeout(handler, delay, ...args);
  });
  const selection = { ...protectionSelection() as object, addedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 1400).toISOString() };
  bridge.protection.mockResolvedValue({ structuredContent: { ...comparison, planning: { canSelect: true, message: 'Choose a fictional concept.' } } });
  mount();
  bridge.review.mockResolvedValueOnce({ structuredContent: { ...review, protection: selection } }).mockResolvedValueOnce({ structuredContent: { ...review, protection: selection } }).mockResolvedValueOnce({ structuredContent: { ...review, protection: selection } }).mockResolvedValue({ structuredContent: review });
  await expect.element(page.getByText('€1,234.00', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review protection' }).click();
  await expect.element(page.getByRole('button', { name: 'Add Essential concept to plan' })).toBeDisabled();
  // First server read still retains it, as with an ahead-of-server browser
  // clock. Exercise the explicitly rearmed timer without a wall-clock minute.
  await expect.poll(() => recheck, { timeout: 5000 }).toBeDefined();
  recheck!();
  await expect.element(page.getByRole('button', { name: 'Add Essential concept to plan' })).toBeEnabled();
  expect(bridge.review.mock.calls.length).toBeGreaterThanOrEqual(4);
  await expect.poll(() => bridge.context.mock.lastCall?.[0].structuredContent.tripPlanning.protection).toBeNull();
  await page.getByRole('button', { name: 'Back to your trip' }).click();
  await expect.element(page.getByRole('button', { name: 'Compare protection' })).toHaveFocus();
  expect(document.body.textContent).not.toContain('€1,234.00');
  await expect.poll(() => bridge.context.mock.lastCall?.[0].structuredContent.tripPlanning.protection).toBeNull();
});
