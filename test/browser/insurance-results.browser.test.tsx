import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
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
        initialStage="comparison"
        result={comparison}
      />,
    );

    await expect.element(page.getByText('Essential concept')).toBeVisible();
    expect(document.querySelectorAll('.cc-insurance-plan-card')).toHaveLength(3);
    expect(document.querySelectorAll('button, a')).toHaveLength(1);
    expect(hasHorizontalOverflow()).toBe(false);
  });

  it('matches loading and result grid geometry without exposing synthetic values early', async () => {
    await page.viewport(1_100, 1_200);
    mount(<InsuranceResultsView displayMode="fullscreen" initialStage="comparison" state="loading" />);

    await expect.element(page.getByText('Preparing illustrative travel protection…')).toBeInTheDocument();
    expect(document.querySelectorAll('.cc-insurance-skeleton-card')).toHaveLength(3);
    expect(document.body.textContent).not.toContain('Essential concept');
    const loadingGrid = document.querySelector<HTMLElement>('.cc-insurance-plan-grid')!
      .getBoundingClientRect();

    root?.render(<InsuranceResultsView displayMode="fullscreen" initialStage="comparison" result={comparison} />);
    await expect.element(page.getByText('Essential concept')).toBeVisible();
    const resultGrid = document.querySelector<HTMLElement>('.cc-insurance-plan-grid')!
      .getBoundingClientRect();

    expect(Math.abs(loadingGrid.left - resultGrid.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(loadingGrid.width - resultGrid.width)).toBeLessThanOrEqual(1);
  });

  it.each([320, 1_100])('supports bounded priority selection and comparison at %ipx', async (width) => {
    await page.viewport(width, 1_200);
    mount(<InsuranceResultsView displayMode={width > 800 ? 'fullscreen' : 'inline'} result={comparison} />);

    const medical = page.getByRole('button', { name: 'Medical emergencies', exact: true });
    const schengen = page.getByRole('button', { name: 'Schengen coverage', exact: true });
    const compare = page.getByRole('button', { name: 'Compare illustrative concepts' });

    await expect.element(medical).toHaveAttribute('aria-pressed', 'false');
    await expect.element(compare).toBeDisabled();
    (await medical.element()).focus();
    await userEvent.keyboard('{Enter}');
    await schengen.click();
    await expect.element(medical).toHaveAttribute('aria-pressed', 'true');
    await expect.element(page.getByText('2 selected')).toBeVisible();
    await expect.element(compare).not.toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Remove Medical emergencies' })).toBeVisible();

    await page.getByRole('button', { name: 'Remove Medical emergencies' }).click();
    await expect.element(medical).toHaveAttribute('aria-pressed', 'false');
    await expect.element(page.getByText('1 selected')).toBeVisible();

    await compare.click();
    await expect.element(page.getByText('Essential concept')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Change comparison brief' })).toBeVisible();
    await expect.element(page.getByText('Your brief includes 1 selected topic; all three concepts remain neutral and unchanged.')).toBeVisible();
    expect(document.body.textContent).not.toContain('Organised around');
    expect(document.querySelectorAll('.cc-insurance-plan-card')).toHaveLength(3);
    expect(hasHorizontalOverflow()).toBe(false);
    expect(document.body.textContent).not.toMatch(/suitable|recommended plan|purchase now|quote now/iu);
  });

  it('resets local preferences when a new comparison replaces the current result', async () => {
    await page.viewport(1_100, 1_200);
    mount(<InsuranceResultsView displayMode="fullscreen" result={comparison} />);

    await page.getByRole('button', { name: 'Medical emergencies', exact: true }).click();
    await page.getByRole('button', { name: 'Compare illustrative concepts' }).click();
    await expect.element(page.getByText('Essential concept')).toBeVisible();

    root?.render(
      <InsuranceResultsView
        displayMode="fullscreen"
        result={{
          ...comparison,
          comparisonId: 'inscmp_abcdef0123456789abcdef0123456789',
          searchContext: { ...comparison.searchContext, destination: 'Spain' },
        }}
      />,
    );

    await expect.element(page.getByText('What matters for this comparison?')).toBeVisible();
    await expect.element(page.getByText('0 selected')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Compare illustrative concepts' }))
      .toBeDisabled();
  });
});
