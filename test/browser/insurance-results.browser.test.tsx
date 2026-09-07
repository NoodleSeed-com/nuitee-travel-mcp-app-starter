import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import type { DemoInsuranceComparisonOutput } from '../../src/demo-schemas.js';
import { InsuranceResultsView } from '../../src/views/insurance-results.js';

const planNames = ['Essential concept', 'Balanced concept', 'Extended concept'] as const;
const comparison: DemoInsuranceComparisonOutput = {
  status: 'success',
  dataSource: 'illustrative',
  disclosure: 'Illustrative travel protection only. No live policy, eligibility, or availability was checked, and nothing can be purchased.',
  message: 'Three illustrative travel protection concepts are ready to compare.',
  fallback: 'Three illustrative travel protection concepts for Portugal are ready to compare. No live policy or eligibility was checked.',
  comparisonId: 'inscmp_0123456789abcdef0123456789abcdef',
  searchContext: {
    destination: 'Portugal',
    departureDate: '2030-04-20',
    returnDate: '2030-04-27',
    adults: 2,
    children: 0,
    residenceCountry: 'CA',
    currency: 'CAD',
  },
  assumptions: ['No traveler health, eligibility, or policy information was collected.'],
  plans: planNames.map((name, index) => ({
    planId: `inplan_${String(index).repeat(32)}`,
    dataSource: 'illustrative',
    name,
    summary: 'A fictional concept for visual comparison and planning context.',
    illustrativePrice: { amount: 68 + (index * 38), currency: 'CAD' },
    deductible: { amount: 250 - (index * 125), currency: 'CAD' },
    coverages: ['Emergency medical', 'Trip cancellation', 'Baggage', 'Travel delay'].map((coverage) => ({
      name: coverage,
      limit: { amount: 1_000 + (index * 500), currency: 'CAD' as const },
      basis: 'per_trip' as const,
      summary: 'Illustrative maximum only; actual terms were not checked.',
    })),
    highlights: ['Fictional comparison concept'],
    exclusions: ['Actual eligibility and exclusions require policy review.'],
  })),
};

let root: Root | undefined;
let host: HTMLDivElement | undefined;

function mount(view: ReactNode) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  root.render(view);
}

function hasHorizontalOverflow() {
  const app = document.querySelector<HTMLElement>('.cc-insurance-results');
  return document.documentElement.scrollWidth > document.documentElement.clientWidth
    || Boolean(app && app.scrollWidth > app.clientWidth);
}

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
  document.body.innerHTML = '';
});

describe('illustrative travel-protection widget in a real browser', () => {
  it.each([320, 1_100])('renders exactly three bounded concepts at %ipx', async (width) => {
    await page.viewport(width, 1_200);
    mount(
      <InsuranceResultsView
        displayMode={width > 800 ? 'fullscreen' : 'inline'}
        result={comparison}
      />,
    );

    await expect.element(page.getByText('Essential concept')).toBeVisible();
    expect(document.querySelectorAll('.cc-insurance-plan-card')).toHaveLength(3);
    expect(document.querySelectorAll('button, a')).toHaveLength(2);
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('keeps concepts in one horizontal row with working navigation and no vertical scroll trap', async () => {
    await page.viewport(320, 900);
    mount(<InsuranceResultsView displayMode="inline" result={comparison} />);
    await expect.element(page.getByText('Essential concept')).toBeVisible();
    const cards = [...document.querySelectorAll<HTMLElement>('.cc-insurance-plan-card')];
    expect(Math.abs(cards[0]!.getBoundingClientRect().top - cards[1]!.getBoundingClientRect().top)).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: 'Next travel protection concept' }).click();
    const track = document.querySelector<HTMLElement>('.cc-card-carousel-track')!;
    await expect.poll(() => track.scrollLeft).toBeGreaterThan(0);
    expect(track.scrollHeight).toBeLessThanOrEqual(track.clientHeight + 1);
    expect(getComputedStyle(cards[0]!).backgroundColor).toBe('rgb(255, 255, 255)');
    const accent = getComputedStyle(document.querySelector('.cc-app')!, '::before').backgroundImage;
    expect(accent).toBe('none');
  });

  it('matches loading and result grid geometry without exposing synthetic values early', async () => {
    await page.viewport(1_100, 1_200);
    mount(<InsuranceResultsView displayMode="fullscreen" state="loading" />);

    await expect.element(page.getByText('Preparing illustrative travel protection…')).toBeInTheDocument();
    expect(document.querySelectorAll('.cc-insurance-skeleton-card')).toHaveLength(3);
    expect(document.body.textContent).not.toContain('Essential concept');
    const loadingGrid = document.querySelector<HTMLElement>('.cc-insurance-plan-grid')!
      .getBoundingClientRect();

    root?.render(<InsuranceResultsView displayMode="fullscreen" result={comparison} />);
    await expect.element(page.getByText('Essential concept')).toBeVisible();
    const resultGrid = document.querySelector<HTMLElement>('.cc-insurance-plan-grid')!
      .getBoundingClientRect();

    expect(Math.abs(loadingGrid.left - resultGrid.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(loadingGrid.width - resultGrid.width)).toBeLessThanOrEqual(1);
  });

  it('stays on the light Wayfare palette when the host reports dark mode', async () => {
    await page.viewport(320, 1_200);
    mount(<InsuranceResultsView displayMode="inline" result={comparison} theme="dark" />);
    await expect.element(page.getByText('Essential concept')).toBeVisible();

    const app = document.querySelector<HTMLElement>('.cc-insurance-results')!;
    expect(app.classList.contains('cc-theme-dark')).toBe(false);
    expect(getComputedStyle(app).colorScheme).toContain('light');
    expect(getComputedStyle(app).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(app).fontFamily).toContain('Host Grotesk Variable');
  });
});
