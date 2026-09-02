import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DemoInsuranceComparisonOutput } from '../src/demo-schemas.js';

vi.mock('../src/helpers.js', () => {
  const Frame = ({ children, title, subtitle, displayMode: _displayMode, ...props }: any) =>
    React.createElement(
      'section',
      props,
      title ? React.createElement('h1', null, title) : null,
      subtitle ? React.createElement('p', null, subtitle) : null,
      children,
    );
  return {
    Feedback: ({ children, status }: any) =>
      React.createElement('div', { 'data-status': status }, children),
    Flow: ({ children, variant: _variant, density: _density, ...props }: any) =>
      React.createElement('div', props, children),
    Frame,
    Region: ({ children, title, description }: any) => React.createElement(
      'section',
      null,
      React.createElement('h2', null, title),
      React.createElement('p', null, description),
      children,
    ),
    StatusBadge: ({ children, tone: _tone, ...props }: any) =>
      React.createElement('span', props, children),
    useBranding: vi.fn(),
    useLayout: vi.fn(),
    useToolInfo: vi.fn(),
    useWidgetReady: vi.fn(),
  };
});

import {
  InsuranceResultsView,
  isDemoInsuranceComparisonOutput,
} from '../src/views/insurance-results.js';

const result: DemoInsuranceComparisonOutput = {
  status: 'success',
  dataSource: 'illustrative',
  disclosure:
    'Illustrative travel protection only. This is not an insurance quote, policy, recommendation, or statement of coverage. No insurer or eligibility was checked.',
  message: 'Three illustrative travel protection concepts are ready to compare.',
  fallback:
    'Three illustrative travel protection concepts for a seven-day Portugal trip are ready to compare. No insurer, eligibility, or policy wording was checked, and nothing can be purchased.',
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
  assumptions: [
    'Residence is treated as Canada for this illustrative comparison.',
    'No traveler health, eligibility, or policy information was collected.',
  ],
  plans: [
    {
      planId: 'inplan_00000000000000000000000000000000',
      dataSource: 'illustrative',
      name: 'Essential concept',
      summary: 'A compact concept for core emergency and interruption examples.',
      illustrativePrice: { amount: 68, currency: 'CAD' },
      deductible: { amount: 250, currency: 'CAD' },
      coverages: [
        { name: 'Emergency medical', limit: { amount: 1_000_000, currency: 'CAD' }, basis: 'per_traveler', summary: 'Illustrative maximum only.' },
        { name: 'Trip cancellation', limit: { amount: 1_500, currency: 'CAD' }, basis: 'per_trip', summary: 'Illustrative maximum only.' },
        { name: 'Baggage', limit: { amount: 750, currency: 'CAD' }, basis: 'per_traveler', summary: 'Illustrative maximum only.' },
        { name: 'Travel delay', limit: { amount: 250, currency: 'CAD' }, basis: 'per_trip', summary: 'Illustrative maximum only.' },
      ],
      highlights: ['Core concept comparison', 'No live policy check'],
      exclusions: ['Pre-existing-condition rules require actual policy review.'],
    },
    {
      planId: 'inplan_11111111111111111111111111111111',
      dataSource: 'illustrative',
      name: 'Balanced concept',
      summary: 'A broader concept with higher illustrative limits.',
      illustrativePrice: { amount: 104, currency: 'CAD' },
      deductible: { amount: 100, currency: 'CAD' },
      coverages: [
        { name: 'Emergency medical', limit: { amount: 2_000_000, currency: 'CAD' }, basis: 'per_traveler', summary: 'Illustrative maximum only.' },
        { name: 'Trip cancellation', limit: { amount: 3_000, currency: 'CAD' }, basis: 'per_trip', summary: 'Illustrative maximum only.' },
        { name: 'Baggage', limit: { amount: 1_500, currency: 'CAD' }, basis: 'per_traveler', summary: 'Illustrative maximum only.' },
        { name: 'Travel delay', limit: { amount: 500, currency: 'CAD' }, basis: 'per_trip', summary: 'Illustrative maximum only.' },
      ],
      highlights: ['Broader concept comparison', 'No live policy check'],
      exclusions: ['Adventure-activity rules require actual policy review.'],
    },
    {
      planId: 'inplan_22222222222222222222222222222222',
      dataSource: 'illustrative',
      name: 'Extended concept',
      summary: 'The widest illustrative limits in this fictional comparison.',
      illustrativePrice: { amount: 146, currency: 'CAD' },
      deductible: { amount: 0, currency: 'CAD' },
      coverages: [
        { name: 'Emergency medical', limit: { amount: 5_000_000, currency: 'CAD' }, basis: 'per_traveler', summary: 'Illustrative maximum only.' },
        { name: 'Trip cancellation', limit: { amount: 5_000, currency: 'CAD' }, basis: 'per_trip', summary: 'Illustrative maximum only.' },
        { name: 'Baggage', limit: { amount: 2_500, currency: 'CAD' }, basis: 'per_traveler', summary: 'Illustrative maximum only.' },
        { name: 'Travel delay', limit: { amount: 1_000, currency: 'CAD' }, basis: 'per_trip', summary: 'Illustrative maximum only.' },
      ],
      highlights: ['Expanded concept comparison', 'No live policy check'],
      exclusions: ['Actual eligibility and exclusions require policy review.'],
    },
  ],
};

const render = (props: Parameters<typeof InsuranceResultsView>[0]) =>
  renderToStaticMarkup(createElement(InsuranceResultsView, props));

const visibleText = (markup: string) => markup.replace(/<[^>]*>/gu, ' ');

describe('Wayfare illustrative travel-protection widget', () => {
  it('renders a geometry-matched loading skeleton for all three concepts', () => {
    const markup = render({ state: 'loading', displayMode: 'inline', theme: 'light' });

    expect(markup).toContain('cc-insurance-skeleton');
    expect(markup).toContain('cc-insurance-skeleton-disclosure');
    expect(markup).toContain('cc-insurance-context');
    expect(markup).toContain('cc-insurance-plan-grid');
    expect((markup.match(/cc-insurance-skeleton-card/g) ?? [])).toHaveLength(3);
    expect(markup).toContain('cc-shimmer');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('Preparing illustrative travel protection');
  });

  it('renders bounded error and malformed states without inferring coverage', () => {
    const failed = render({ state: 'error', displayMode: 'inline', theme: 'dark' });
    const malformed = render({ state: 'malformed', displayMode: 'inline' });

    expect(failed).toContain('The travel protection comparison could not load');
    expect(failed).toContain('No insurer or policy was contacted');
    expect(malformed).toContain('could not be shown safely');
    expect(malformed).toContain('No price, eligibility, or coverage was inferred');
  });

  it('shows exactly three source-labelled concepts and no transactional action', () => {
    const markup = render({ result, displayMode: 'inline', theme: 'light' });

    expect(markup).toContain(result.disclosure);
    expect(markup).toContain('Illustrative travel protection');
    expect(markup).toContain('Portugal');
    expect(markup).toContain('Essential concept');
    expect(markup).toContain('Balanced concept');
    expect(markup).toContain('Extended concept');
    expect((markup.match(/cc-insurance-plan-card/g) ?? [])).toHaveLength(3);
    expect(markup).toContain('What to check before buying elsewhere');
    expect(visibleText(markup)).not.toMatch(/\bdemo\b|\bsandbox\b/iu);
    expect(markup).not.toMatch(/Buy now|Purchase now|Checkout|Add to trip|Recommended plan/iu);
  });

  it('rejects malformed, over-bounded, and transactional-looking output', () => {
    expect(isDemoInsuranceComparisonOutput(result)).toBe(true);
    expect(isDemoInsuranceComparisonOutput({ ...result, plans: result.plans.slice(0, 2) })).toBe(false);
    expect(isDemoInsuranceComparisonOutput({
      ...result,
      plans: [{ ...result.plans[0], planId: 'provider-policy-id' }, ...result.plans.slice(1)],
    })).toBe(false);
    expect(isDemoInsuranceComparisonOutput({
      ...result,
      plans: [{ ...result.plans[0], highlights: Array(6).fill('Too many') }, ...result.plans.slice(1)],
    })).toBe(false);
    expect(isDemoInsuranceComparisonOutput({ ...result, purchaseUrl: 'https://example.com' })).toBe(false);
    expect(isDemoInsuranceComparisonOutput({ ...result, medicalHistory: 'private value' })).toBe(false);
  });

  it('accepts a consistently GBP-denominated illustrative comparison', () => {
    const gbpResult = {
      ...result,
      searchContext: { ...result.searchContext, currency: 'GBP' as const },
      plans: result.plans.map((plan) => ({
        ...plan,
        illustrativePrice: { ...plan.illustrativePrice, currency: 'GBP' as const },
        deductible: { ...plan.deductible, currency: 'GBP' as const },
        coverages: plan.coverages.map((coverage) => ({
          ...coverage,
          limit: { ...coverage.limit, currency: 'GBP' as const },
        })),
      })),
    };

    expect(isDemoInsuranceComparisonOutput(gbpResult)).toBe(true);
    expect(render({ result: gbpResult, displayMode: 'inline' })).toContain('£68.00');
  });
});
