import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DemoRewardFlightSearchOutput } from '../src/demo-schemas.js';

vi.mock('../src/helpers.js', () => ({
  Action: ({ children, variant: _variant, ...props }: any) => <button {...props}>{children}</button>,
  Feedback: vi.fn(), Flow: vi.fn(), Frame: vi.fn(),
  useLayout: vi.fn(), useToolInfo: vi.fn(), useWidgetReady: vi.fn(),
}));

import { TripPointsView } from '../src/views/trip-points.js';

const data: DemoRewardFlightSearchOutput = {
  status: 'success', dataSource: 'illustrative',
  disclosure: 'Illustrative reward-flight ideas. No account or award inventory was accessed.',
  message: 'Two illustrative reward-flight ideas fit the sample budget.',
  fallback: 'Two illustrative reward-flight ideas for Lisbon. No points can be redeemed.',
  searchId: `rsearch_${'a'.repeat(32)}`,
  searchContext: { origin: 'Toronto', destination: 'Lisbon', adults: 2, cabinClass: 'ECONOMY', pointsBudget: 42_500, currency: 'EUR' },
  pointsContext: { available: 42_500, source: 'illustrative_profile' },
  options: [
    { optionId: `rwd_${'a'.repeat(32)}`, dataSource: 'illustrative', route: { origin: 'Toronto', destination: 'Lisbon' }, cabinClass: 'ECONOMY', partnerLabel: 'Concept partner A', stops: 0, durationMinutes: 400, pointsPerAdult: 18_000, totalPoints: 36_000, estimatedTaxes: { amount: 90, currency: 'EUR' }, balanceAfter: 6_500, notes: ['No redemption action'] },
    { optionId: `rwd_${'b'.repeat(32)}`, dataSource: 'illustrative', route: { origin: 'Toronto', destination: 'Lisbon' }, cabinClass: 'ECONOMY', partnerLabel: 'Concept partner B', stops: 1, durationMinutes: 550, pointsPerAdult: 21_000, totalPoints: 42_000, estimatedTaxes: { amount: 110, currency: 'EUR' }, balanceAfter: 500, notes: ['No redemption action'] },
  ],
};

const render = (props: Partial<Parameters<typeof TripPointsView>[0]> = {}) =>
  renderToStaticMarkup(<TripPointsView destination="Lisbon" onBack={vi.fn()} data={data} locale="en-IE" {...props} />);
const visibleText = (html: string) => html.replace(/<[^>]*>/gu, ' ');

describe('inline points comparison', () => {
  it('shows the supplied trip context and example-data badge in the header', () => {
    const html = render({ contextLabel: 'Sep 16–17 · 2 adults' });
    const header = html.match(/<header[^>]*>(.*?)<\/header>/u)?.[1] ?? '';
    expect(header).toContain('Points for your Lisbon trip');
    expect(header).toContain('Sep 16–17 · 2 adults');
    expect(header).toContain('Example data');
    expect(render()).not.toContain('wf-trip-points-context');
  });

  it('keeps parent-provided assumptions visible after examples successfully load', () => {
    const html = render({ message: 'Using Toronto as the example origin and one adult for this sample.' });
    expect(html).toContain('Using Toronto as the example origin and one adult for this sample.');
    expect(html).toContain('wf-trip-points-assumption');
    expect(html).toContain('Sample rewards balance');
    expect(html).toContain('Viewing example');
  });

  it('uses the supplied reward ideas and first example budget without applying points to the cash trip', () => {
    const html = render();
    expect(html).toContain('Points for your Lisbon trip');
    expect(html).toContain('Sample rewards balance');
    expect(html).toContain('42,500');
    expect(html).toContain('36,000');
    expect(html).toContain('6,500');
    expect(html).toContain('€90.00');
    expect(html).toContain('€110.00');
    expect(html).toContain('2 adults');
    expect(html).toContain('aria-label="Reward examples"');
    expect(html).toContain('cc-card-carousel-track');
    expect(html).toContain('aria-label="View Concept partner A example" aria-pressed="true"');
    expect(html).toContain('aria-label="View Concept partner B example" aria-pressed="false"');
    expect(html).toContain('Viewing example');
    expect(html).toContain('Reward eligibility unknown');
    expect(html).toContain('Not checked');
    expect(html).toContain('does not change your selected flight or cash estimate');
    expect(html).toContain('No real account or award inventory was accessed');
    expect(html).not.toMatch(/Book now|Redeem now|Apply points|Choose flight|Flight selected|points earned/iu);
  });

  it('formats the supplied balance, party size, routes and currency without a fixed catalog', () => {
    const html = render({ destination: 'Tokyo', locale: 'en-US', data: {
      ...data,
      searchContext: { ...data.searchContext, destination: 'Tokyo', adults: 3, pointsBudget: 57_000, currency: 'USD' },
      pointsContext: { ...data.pointsContext, available: 57_000 },
      options: [{ ...data.options[0]!, route: { origin: 'Vancouver', destination: 'Tokyo' }, partnerLabel: 'Another concept', totalPoints: 54_000, balanceAfter: 3_000, estimatedTaxes: { amount: 123.45, currency: 'USD' } }],
    } });
    expect(html).toContain('57,000');
    expect(html).toContain('54,000');
    expect(html).toContain('3,000');
    expect(html).toContain('3 adults');
    expect(html).toContain('Vancouver');
    expect(html).toContain('Tokyo');
    expect(html).toContain('$123.45');
    expect(html).not.toContain('Concept partner B');
    expect(html).not.toContain('42,500');
    expect(html).not.toContain('Previous reward example');
  });

  it('shows an honest empty comparison with its sample balance and no eligibility claim', () => {
    const html = render({ data: { ...data, status: 'empty', options: [] } });
    expect(html).toContain('No reward examples fit this trip');
    expect(html).toContain('Try a different points budget or destination');
    expect(html).toContain('Sample rewards balance');
    expect(html).not.toContain('Within the sample points budget');
    expect(html).not.toContain('View example');
  });

  it.each(['loading', 'error', 'unavailable'] as const)('keeps %s inline with a back action and no stale sample success', state => {
    const html = render({ state, onRetry: vi.fn() });
    expect(html).toContain('cc-app wf-trip-points');
    expect(html).toContain('Back to your trip');
    expect(html).not.toContain('42,500');
    expect(html).not.toContain('Viewing example');
    expect(html).not.toContain('Within the sample points budget');
    if (state === 'loading') expect(html).toContain('aria-busy="true"');
    else if (state === 'error') expect(html).toContain('Try again');
    else expect(html).toContain('Points examples are unavailable for this trip');
  });

  it('does not invent a sample balance when rewards data is absent', () => {
    const html = render({ data: undefined });
    expect(html).toContain('Points examples could not load');
    expect(html).not.toContain('42,500');
    expect(html).not.toContain('Try again');
  });

  it.each([
    { ...data, dataSource: 'live_account' },
    { ...data, options: [{ ...data.options[0], balanceAfter: 999 }] },
    { ...data, status: 'success', options: [] },
    { ...data, options: [...data.options, ...data.options, ...data.options, ...data.options] },
  ])('rejects malformed reward output before showing financial facts', malformed => {
    const html = render({ data: malformed as DemoRewardFlightSearchOutput, onRetry: vi.fn() });
    expect(html).toContain('Points examples could not load');
    expect(html).toContain('Try again');
    expect(html).not.toContain('Sample rewards balance');
    expect(html).not.toContain('Within the sample points budget');
  });

  it('keeps unsupported-context guidance useful and escapes supplied display text', () => {
    const html = render({ data: undefined, state: 'unavailable', destination: '<script>alert(1)</script>', message: 'Points examples currently support adult Economy and Premium economy trips.' });
    expect(visibleText(html)).toContain('Points examples currently support adult Economy and Premium economy trips.');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('Sample rewards balance');
  });
});
