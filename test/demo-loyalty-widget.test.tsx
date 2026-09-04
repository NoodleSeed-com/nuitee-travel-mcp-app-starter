import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type {
  DemoLoyaltyOverview,
  DemoTripReview,
} from '../src/demo-schemas.js';

vi.mock('../src/helpers.js', () => {
  const Frame = ({
    children,
    title,
    subtitle,
    displayMode: _displayMode,
    ...props
  }: any) => React.createElement(
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
    StatusBadge: ({ children, tone: _tone, ...props }: any) =>
      React.createElement('span', props, children),
    useBranding: vi.fn(),
    useLayout: vi.fn(),
    useToolInfo: vi.fn(),
    useWidgetReady: vi.fn(),
  };
});
import {
  WAYFARE_PREVIEW_DISCLOSURE,
  LoyaltyOverviewView,
  isDemoLoyaltyOverview,
  isDemoTripReview,
} from '../src/views/loyalty-overview.js';

const loyalty: DemoLoyaltyOverview = {
  status: 'success',
  dataSource: 'illustrative',
  disclosure: WAYFARE_PREVIEW_DISCLOSURE,
  fallback:
    'Preview traveler has 84,500 simulated Wayfare points and an illustrative Explorer concept tier.',
  member: {
    displayName: 'Preview traveler',
    reference: 'WAYFARE-PREVIEW-0001',
    tier: 'Explorer concept tier',
    pointsBalance: 84_500,
  },
  progress: {
    label: 'Three of five illustrative trips toward the next concept tier',
    current: 3,
    target: 5,
  },
  benefits: [
    {
      name: 'Flexible planning preview',
      description: 'Compare selected travel with an illustrative rewards lens.',
    },
    {
      name: 'Priority support concept',
      description: 'See how a future authenticated support benefit could appear.',
    },
    {
      name: 'Trip progress concept',
      description: 'Track synthetic progress without changing a real account.',
    },
  ],
  illustrativePointsValue: {
    points: 25_000,
    value: { amount: 125, currency: 'CAD' },
    explanation:
      'This illustrative value is synthetic and does not represent a redemption offer or current program policy.',
  },
};

const review: DemoTripReview = {
  status: 'ready',
  dataSource: 'illustrative',
  disclosure: WAYFARE_PREVIEW_DISCLOSURE,
  fallback:
    'The selected current flight and simulated hotel are shown separately with an illustrative rewards overview.',
  flight: {
    dataSource: 'live_nuitee_selection',
    selectionId: 'sel_0123456789abcdef0123456789abcdef',
    searchPrice: { total: 610.4, currency: 'CAD' },
    expiresAt: '2030-04-01T12:15:00Z',
    disclosure:
      'Current provider search price; verify the fare before relying on price or availability.',
  },
  stay: {
    dataSource: 'illustrative',
    selectionId: 'hsel_0123456789abcdef0123456789abcdef',
    propertyName: 'Harbour Paper Plane Hotel',
    city: 'Lisbon',
    checkInDate: '2030-04-20',
    checkOutDate: '2030-04-23',
    nights: 3,
    rooms: 1,
    staySubtotal: { amount: 720, currency: 'CAD' },
  },
  loyalty,
  missing: [],
};

const render = (
  props: Parameters<typeof LoyaltyOverviewView>[0],
) => renderToStaticMarkup(createElement(LoyaltyOverviewView, props));

const visibleText = (markup: string) => markup.replace(/<[^>]*>/gu, ' ');

describe('Wayfare loyalty widget', () => {
  it('accepts a real hotel selection and preserves its live provenance in trip review', () => {
    const liveReview = { ...review, stay: { ...review.stay!, dataSource: 'live_nuitee' as const } };
    expect(isDemoTripReview(liveReview)).toBe(true);
    const markup = render({ data: liveReview, theme: 'light' });
    expect(markup).toContain('Current Nuitee hotel selection');
    expect(markup).not.toContain('Simulated hotel selection');
    expect(markup).not.toContain('simulated hotels');
    expect(markup).toContain('rewards are examples');
  });
  it('uses a geometry-matched, accessible loading skeleton', () => {
    const markup = render({ state: 'loading', theme: 'light' });

    expect(markup).toContain('cc-loyalty-skeleton');
    expect(markup).toContain('cc-loyalty-skeleton-hero');
    expect(markup).toContain('cc-loyalty-skeleton-progress');
    expect(markup).toContain('cc-loyalty-skeleton-benefits');
    expect(markup).toContain('cc-loyalty-skeleton-value');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('Preparing the rewards profile');
  });

  it('renders bounded tool-error and malformed-result states without inventing loyalty facts', () => {
    const failed = render({ state: 'error', theme: 'dark' });
    const malformed = render({ state: 'malformed', theme: 'light' });

    expect(failed).toContain('The loyalty experience could not load');
    expect(failed).not.toContain('cc-theme-dark');
    expect(failed).toContain('No account, points, booking, or payment was changed');
    expect(failed).not.toContain('84,500');
    expect(malformed).toContain('no balance, benefit, or trip value was inferred');
    expect(malformed).not.toContain('Explorer concept tier');
  });

  it('shows the synthetic overview with disclosure, tier progress, benefits, and no action CTA', () => {
    const markup = render({ data: loyalty, theme: 'light', locale: 'en-CA' });

    expect(markup).not.toContain('Preview only');
    expect(markup).toContain('Points balance');
    expect(markup).toContain('84,500');
    expect(markup).toContain('Explorer tier');
    expect(markup).toContain('<progress');
    expect(markup).toContain('Flexible planning');
    expect(markup).toContain('25,000 points');
    expect(markup).toContain('125.00');
    expect(markup.match(/Example rewards only/g)).toHaveLength(1);
    expect(markup).toContain('no real account was accessed');
    expect(visibleText(markup)).not.toMatch(/illustrative|simulated|synthetic|preview/iu);
    expect(markup).toContain('cc-loyalty-benefits');
    expect(visibleText(markup)).not.toMatch(/\bdemo\b|\bsandbox\b/iu);
    expect(markup).not.toMatch(/<a\s|<form/i);
    expect([...markup.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].every(match => /^(Previous|Next) /.test(match[1]!))).toBe(true);
    expect(markup).not.toMatch(/Redeem now|Book now|Pay now|Apply points/i);
  });

  it('keeps live-flight and simulated-stay provenance separate in a trip review', () => {
    const markup = render({ data: review, theme: 'dark', locale: 'en-CA' });

    expect(markup).toContain('Trip and rewards review');
    expect(markup).not.toContain('cc-theme-dark');
    expect(markup).toContain('Current Nuitee flight selection');
    expect(markup).toContain('stay and rewards are examples');
    expect(markup).toContain('610.40');
    expect(markup).toContain('Harbour Paper Plane Hotel');
    expect(markup).toContain('720.00');
    expect(markup).toContain('not a bookable package total');
    expect(markup).toContain('Nothing booked, held, paid, or redeemed');
    expect(markup).not.toContain('1,330.40');
    expect(markup).not.toMatch(/<a\s|<form/i);
    expect([...markup.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].every(match => /^(Previous|Next) /.test(match[1]!))).toBe(true);
  });

  it('renders an incomplete review as a safe conversational next step', () => {
    const incomplete: DemoTripReview = {
      ...review,
      status: 'incomplete',
      flight: undefined,
      missing: ['flight'],
    };
    const markup = render({ data: incomplete, theme: 'light' });

    expect(markup).toContain('Trip review needs another selection');
    expect(markup).toContain('Select a flight in the conversation');
    expect(markup).toContain('stay and rewards are examples');
    expect(markup).not.toContain('Current Nuitee flight selection');
  });

  it('rejects malformed nested values at the widget boundary', () => {
    expect(isDemoLoyaltyOverview(loyalty)).toBe(true);
    expect(
      isDemoLoyaltyOverview({
        ...loyalty,
        member: { ...loyalty.member, pointsBalance: -1 },
      }),
    ).toBe(false);
    expect(isDemoTripReview(review)).toBe(true);
    expect(
      isDemoTripReview({
        ...review,
        stay: { ...review.stay, selectionId: 'provider-offer-id' },
      }),
    ).toBe(false);
    expect(
      isDemoTripReview({ ...review, status: 'ready', missing: ['stay'] }),
    ).toBe(false);
  });
});
