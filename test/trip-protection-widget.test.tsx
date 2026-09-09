import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compareSyntheticTravelInsurance } from '../src/demo-fixtures.js';
import type { DemoInsuranceComparisonOutput } from '../src/demo-schemas.js';

const actions = vi.hoisted(() => [] as { className?: string; disabled?: boolean; onClick?: () => void }[]);
vi.mock('../src/helpers.js', () => ({
  Action: ({ children, variant: _variant, ...props }: any) => {
    actions.push(props);
    return <button {...props}>{children}</button>;
  },
  Feedback: vi.fn(), Flow: vi.fn(), Frame: vi.fn(), Region: vi.fn(), StatusBadge: vi.fn(),
  useLayout: vi.fn(), useToolInfo: vi.fn(), useWidgetReady: vi.fn(),
}));

import { TripProtectionView } from '../src/views/trip-protection-view.js';

const baseData = compareSyntheticTravelInsurance({
  destination: 'Lisbon', departureDate: '2030-09-16', returnDate: '2030-09-17',
  adults: 2, children: 0, residenceCountry: 'CA', currency: 'EUR',
});
const data = { ...baseData, planning: { canSelect: true, message: 'A protection concept can be added to the demo plan.' } };
const render = (props: Partial<Parameters<typeof TripProtectionView>[0]> = {}) =>
  renderToStaticMarkup(<TripProtectionView data={data} destination="Lisbon" contextLabel="Sep 16–17 · 2 adults" locale="en-IE" onBack={vi.fn()} onSelect={vi.fn()} {...props} />);
const addActions = () => actions.filter(action => action.className?.includes('wf-trip-protection-add'));

describe('inline protection concepts', () => {
  beforeEach(() => { actions.length = 0; });

  it('renders the approved header and three real fixture concepts with their prices and limits', () => {
    const html = render();
    expect(html).toContain('Travel protection for Lisbon');
    expect(html).toContain('Sep 16–17 · 2 adults');
    expect(html).toContain('Example data');
    expect(html).toContain('Compare protection concepts');
    expect(html).toContain('example Canadian residence');
    expect(html).toContain('aria-label="Protection concepts"');
    expect(html).toContain('cc-card-carousel-track');
    expect(html.match(/class="wf-trip-protection-card"/gu)).toHaveLength(3);
    for (const plan of data.plans) {
      expect(html).toContain(plan.name);
      expect(html).toContain(plan.summary);
    }
    for (const amount of ['€34.00', '€56.00', '€81.00', '€680,000', '€1,020', '€510', '€170']) expect(html).toContain(amount);
    expect(html).toContain('Medical example limit');
    expect(html).toContain('Cancellation example limit');
    expect(html).toContain('Baggage example limit');
    expect(html).toContain('Example deductible');
    expect(html).toContain('per traveler');
    expect(html).toContain('per trip');
    expect(html).toContain('Actual exclusions, covered reasons and pre-existing-condition terms remain unknown.');
    expect(html).toContain('You are not insured.');
    expect(html).not.toMatch(/Buy now|Purchase now|Checkout|Recommended plan|Coverage confirmed/iu);
  });

  it('calls the parent only after an explicit add and never reports local success', () => {
    const onSelect = vi.fn();
    const html = render({ onSelect });
    expect(onSelect).not.toHaveBeenCalled();
    expect(addActions()).toHaveLength(3);
    addActions()[1]!.onClick?.();
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(data.comparisonId, data.plans[1]!.planId);
    expect(html).not.toContain('Selected in demo plan');
    expect(html).not.toContain('added to your plan');
  });

  it.each([undefined, { canSelect: false, message: 'Review your current trip before adding a concept.' }, { canSelect: 'true', message: 'Invalid selection context.' }])('requires an explicit valid planning capability for adding: %j', planning => {
    const onSelect = vi.fn();
    render({ data: { ...baseData, planning } as DemoInsuranceComparisonOutput, onSelect });
    expect(addActions()).toHaveLength(3);
    expect(addActions().every(action => action.disabled)).toBe(true);
    for (const action of addActions()) action.onClick?.();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('disables adds without a parent action and explains comparison-only context', () => {
    const html = render({ onSelect: undefined, data: { ...data, planning: { canSelect: false, message: 'Review your current trip before adding a concept.' } } });
    expect(html).toContain('Review your current trip before adding a concept.');
    expect(addActions().every(action => action.disabled)).toBe(true);
  });

  it('disables all adds while acknowledgement is pending and shows only acknowledged selections', () => {
    const onSelect = vi.fn();
    const pending = render({ pending: true, onSelect });
    expect(pending).toContain('Saving…');
    expect(pending).toContain('aria-busy="true"');
    expect(pending).not.toContain('Selected in demo plan');
    expect(addActions().every(action => action.disabled)).toBe(true);
    for (const action of addActions()) action.onClick?.();
    expect(onSelect).not.toHaveBeenCalled();
    actions.length = 0;
    const acknowledged = render({ selectedPlanId: data.plans[1]!.planId });
    expect(acknowledged.match(/Selected in demo plan/gu)).toHaveLength(1);
    expect(addActions()[1]!.disabled).toBe(true);
    expect(acknowledged).toContain('You are not insured.');
  });

  it('keeps saving errors and supplied assumptions visible without claiming a selection', () => {
    const html = render({ actionError: 'The concept could not be saved. Try again.', message: 'One night is a provisional browsing assumption.', note: 'This comparison is for the selected stay dates.' });
    expect(html).toContain('role="alert"');
    expect(html).toContain('The concept could not be saved. Try again.');
    expect(html).toContain('One night is a provisional browsing assumption.');
    expect(html).toContain('This comparison is for the selected stay dates.');
    expect(html).not.toContain('Selected in demo plan');
  });

  it('preserves the returned residence, party and currencies instead of Canadian preview constants', () => {
    const other = compareSyntheticTravelInsurance({ ...data.searchContext, residenceCountry: 'GB', currency: 'GBP', adults: 1, children: 2 });
    const html = render({ data: other });
    expect(html).toContain('example residence in GB');
    expect(html).toContain('1 adult · 2 children');
    expect(html).not.toContain('Canadian residence');
    expect(html).toContain('£');
    expect(html).not.toContain('€');
  });

  it('shows an unavailable limit when the exact source coverage is absent', () => {
    const changed = { ...data, plans: data.plans.map(plan => ({ ...plan, coverages: plan.coverages.map(coverage => coverage.name === 'Emergency medical' ? { ...coverage, name: 'Different coverage' } : coverage) })) };
    const html = render({ data: changed });
    expect(html).toContain('Medical example limit');
    expect(html.match(/Not provided/gu)).toHaveLength(3);
    expect(html).not.toContain('€680,000');
  });

  it.each(['loading', 'error', 'unavailable'] as const)('keeps %s full-width and readable without stale price or success', state => {
    const html = render({ state, onRetry: vi.fn() });
    expect(html).toContain('cc-app wf-trip-protection');
    expect(html).toContain('Back to your trip');
    expect(html).not.toContain('€34.00');
    expect(html).not.toContain('Add to plan (demo)');
    expect(html).not.toContain('Selected in demo plan');
    if (state === 'loading') expect(html).toContain('aria-busy="true"');
    if (state === 'error') expect(html).toContain('Try again');
  });

  it.each([undefined, { ...data, plans: [] }, { ...data, plans: data.plans.slice(0, 2) }, { ...data, policyNumber: 'not-allowed' }])('rejects missing, empty or unsafe data before showing plans', invalid => {
    const html = render({ data: invalid as DemoInsuranceComparisonOutput, onRetry: vi.fn() });
    expect(html).toContain('Protection concepts could not load');
    expect(html).toContain('Try again');
    expect(html).not.toContain('€34.00');
    expect(addActions()).toHaveLength(0);
  });
});
