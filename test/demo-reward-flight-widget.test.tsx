import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DemoRewardFlightSearchOutput } from '../src/demo-schemas.js';

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
    Action: ({ children, variant: _variant, ...props }: any) =>
      React.createElement('button', props, children),
    Feedback: ({ children, status }: any) =>
      React.createElement('div', { 'data-status': status }, children),
    Flow: ({ children, variant: _variant, density: _density, ...props }: any) =>
      React.createElement('div', props, children),
    Frame,
    StatusBadge: ({ children, tone: _tone, ...props }: any) =>
      React.createElement('span', props, children),
    useBranding: vi.fn(),
    useLayout: vi.fn(),
    useToolInfo: vi.fn(),
    useWidgetReady: vi.fn(),
  };
});

import {
  RewardFlightResultsView,
  isDemoRewardFlightSearchOutput,
} from '../src/views/reward-flight-results.js';

const result: DemoRewardFlightSearchOutput = {
  status: 'success',
  dataSource: 'illustrative',
  disclosure: 'Illustrative reward-flight comparisons only. No live reward inventory was checked and points cannot be redeemed.',
  message: 'Three illustrative reward-flight ideas fit within 42,500 points.',
  fallback: 'Three illustrative reward-flight ideas from Toronto fit within 42,500 points. No live availability or redemption was checked.',
  searchId: 'rsearch_0123456789abcdef0123456789abcdef',
  searchContext: {
    origin: 'Toronto',
    adults: 1,
    cabinClass: 'ECONOMY',
    pointsBudget: 42_500,
    currency: 'CAD',
  },
  pointsContext: { available: 42_500, source: 'illustrative_profile' },
  options: [
    {
      optionId: 'rwd_0123456789abcdef0123456789abcdef',
      dataSource: 'illustrative',
      route: { origin: 'Toronto', destination: 'Montreal' },
      cabinClass: 'ECONOMY',
      partnerLabel: 'Concept partner A',
      stops: 0,
      durationMinutes: 85,
      pointsPerAdult: 12_000,
      totalPoints: 12_000,
      estimatedTaxes: { amount: 48, currency: 'CAD' },
      balanceAfter: 30_500,
      notes: ['Illustrative availability', 'No redemption action'],
    },
    {
      optionId: 'rwd_1123456789abcdef0123456789abcdef',
      dataSource: 'illustrative',
      route: { origin: 'Toronto', destination: 'New York' },
      cabinClass: 'ECONOMY',
      partnerLabel: 'Concept partner B',
      stops: 0,
      durationMinutes: 95,
      pointsPerAdult: 18_000,
      totalPoints: 18_000,
      estimatedTaxes: { amount: 72, currency: 'CAD' },
      balanceAfter: 24_500,
      notes: ['Illustrative availability', 'No redemption action'],
    },
    {
      optionId: 'rwd_2123456789abcdef0123456789abcdef',
      dataSource: 'illustrative',
      route: { origin: 'Toronto', destination: 'Vancouver' },
      cabinClass: 'ECONOMY',
      partnerLabel: 'Concept partner C',
      stops: 0,
      durationMinutes: 305,
      pointsPerAdult: 31_000,
      totalPoints: 31_000,
      estimatedTaxes: { amount: 94, currency: 'CAD' },
      balanceAfter: 11_500,
      notes: ['Illustrative availability', 'No redemption action'],
    },
  ],
};

const render = (props: Parameters<typeof RewardFlightResultsView>[0]) =>
  renderToStaticMarkup(createElement(RewardFlightResultsView, props));

const visibleText = (markup: string) => markup.replace(/<[^>]*>/gu, ' ');

describe('Wayfare illustrative reward-flight widget', () => {
  it('renders a geometry-matched accessible skeleton', () => {
    const markup = render({ state: 'loading', displayMode: 'inline', theme: 'light' });
    expect(markup).toContain('cc-reward-flight-skeleton');
    expect(markup).toContain('cc-reward-flight-carousel');
    expect(markup).toContain('cc-shimmer');
    expect(markup).toContain('aria-busy="true"');
  });

  it('renders bounded reward ideas in a non-circular carousel without transactional actions', () => {
    const markup = render({ result, displayMode: 'inline', theme: 'light', locale: 'en-CA' });

    expect(markup).toContain('Illustrative reward flights');
    expect(markup).toContain('42,500 points available');
    expect(markup).toContain('12,000 points');
    expect(markup).toContain('Toronto');
    expect(markup).toContain('Montreal');
    expect(markup).toContain('aria-label="Reward flight ideas carousel"');
    const previous = markup.match(/<button[^>]*aria-label="Previous reward flight"[^>]*>/u)?.[0] ?? '';
    const next = markup.match(/<button[^>]*aria-label="Next reward flight"[^>]*>/u)?.[0] ?? '';
    expect(previous).toContain('disabled');
    expect(next).not.toContain('disabled');
    expect(markup).toContain('cc-reward-flight-peek-slide');
    expect(markup).toContain('data-slot="icon"');
    expect(visibleText(markup)).not.toMatch(/\bdemo\b|\bsandbox\b/iu);
    expect(markup).not.toMatch(/Book now|Redeem now|Apply points|Checkout/iu);
  });

  it('renders safe empty, error, and malformed states', () => {
    const empty = render({
      result: { ...result, status: 'empty', options: [], message: 'No illustrative reward-flight option fits this points budget.' },
      displayMode: 'inline',
      theme: 'light',
    });
    const failed = render({ state: 'error', displayMode: 'inline', theme: 'dark' });
    const malformed = render({ state: 'malformed', displayMode: 'inline', theme: 'light' });

    expect(empty).toContain('No illustrative reward-flight ideas fit');
    expect(failed).toContain('could not load');
    expect(failed).not.toContain('cc-theme-dark');
    expect(malformed).toContain('could not be shown safely');
  });

  it('rejects malformed or over-bounded output at the widget boundary', () => {
    expect(isDemoRewardFlightSearchOutput(result)).toBe(true);
    expect(isDemoRewardFlightSearchOutput({
      ...result,
      options: [...result.options, ...result.options, ...result.options, result.options[0]],
    })).toBe(false);
    expect(isDemoRewardFlightSearchOutput({
      ...result,
      options: [{ ...result.options[0], totalPoints: 99_999 }],
    })).toBe(false);
  });
});
