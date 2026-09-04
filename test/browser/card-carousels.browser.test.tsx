import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import type { DemoLoyaltyOverview } from '../../src/demo-schemas.js';
import { LoyaltyOverviewView } from '../../src/views/loyalty-overview.js';
import { CardCarousel } from '../../src/views/card-carousel.js';
import '../../src/views/travel.css';

const loyalty: DemoLoyaltyOverview = {
  status: 'success', dataSource: 'illustrative',
  disclosure: 'Illustrative rewards only. No real account or program was checked.',
  fallback: 'An illustrative rewards profile; no real account was accessed.',
  member: { displayName: 'Preview traveler', reference: 'WAYFARE-PREVIEW-0001', tier: 'Explorer concept tier', pointsBalance: 42500 },
  progress: { label: 'Illustrative progress', current: 3, target: 5 },
  benefits: [
    { name: 'Flexible planning', description: 'Illustrative comparison, not a real entitlement.' },
    { name: 'Travel support', description: 'Illustrative support concept only.' },
    { name: 'Stay discovery', description: 'Illustrative hotel highlights only.' },
  ],
  illustrativePointsValue: { points: 25000, value: { amount: 250, currency: 'CAD' }, explanation: 'Illustrative value, not a redemption offer.' },
};

let root: Root;
afterEach(() => { root?.unmount(); document.body.innerHTML = ''; });
function mount(view: React.ReactNode) {
  const host = document.createElement('div'); document.body.append(host);
  root = createRoot(host); root.render(view);
}

it('lays rewards panels horizontally without nesting a second carousel', async () => {
  await page.viewport(320, 900);
  mount(<LoyaltyOverviewView data={loyalty} theme="light" />);
  await expect.element(page.getByRole('button', { name: 'Next rewards panel' })).toBeVisible();
  const cards = [...document.querySelectorAll('.cc-loyalty-summary > .cc-card-carousel-item')];
  expect(cards).toHaveLength(4);
  expect(cards[0]!.getBoundingClientRect().top).toBe(cards[1]!.getBoundingClientRect().top);
  await page.getByRole('button', { name: 'Next rewards panel' }).click();
  await expect.element(page.getByRole('button', { name: 'Previous rewards panel' })).toBeEnabled();
  expect(document.querySelectorAll('.cc-card-carousel .cc-card-carousel')).toHaveLength(0);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
});

it('supports keyboard navigation and reveals tall content without vertical clipping', async () => {
  await page.viewport(320, 900);
  mount(<div className="cc-app"><CardCarousel label="Test choices" itemName="choice">
    <article><h2>First choice</h2><p style={{ height: 500 }}>Long readable content</p><button>First action</button></article>
    <article><h2>Second choice</h2><button>Second action</button></article>
  </CardCarousel></div>);
  await expect.element(page.getByRole('button', { name: 'Next choice' })).toBeEnabled();
  const track = document.querySelector<HTMLElement>('.cc-card-carousel-track')!;
  track.focus(); track.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  await expect.element(page.getByRole('button', { name: 'Next choice' })).toBeDisabled();
  expect(track.scrollHeight).toBeLessThanOrEqual(track.clientHeight + 1);
  track.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  await expect.element(page.getByRole('button', { name: 'Previous choice' })).toBeDisabled();
});
