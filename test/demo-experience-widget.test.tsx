import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/helpers.js', () => ({
  Action: ({ children, variant: _variant, ...props }: any) => React.createElement('button', props, children),
  Feedback: ({ children, status }: any) => React.createElement('div', { 'data-status': status }, children),
  Frame: ({ children, title, subtitle, displayMode: _displayMode, ...props }: any) => React.createElement(
    'section', props,
    title ? React.createElement('h1', null, title) : null,
    subtitle ? React.createElement('p', null, subtitle) : null,
    children,
  ),
  StatusBadge: ({ children, tone: _tone, ...props }: any) => React.createElement('span', props, children),
  useLayout: vi.fn(),
  useSendFollowUpMessage: vi.fn(),
  useToolInfo: vi.fn(),
  useUpdateModelContext: vi.fn(),
  useViewState: vi.fn(),
  useWidgetReady: vi.fn(),
}));

import { demoGatewayOutputSchema } from '../src/demo-connectors.js';
import type { DemoExperienceSearchOutput } from '../src/demo-schemas.js';
import { DEMO_EXPERIENCE_ALIASES, DEMO_EXPERIENCE_CATALOG } from '../src/experience-fixtures.js';
import { runDemoGateway } from '../src/demo-runtime.js';
import {
  ExperienceResultsView,
  acknowledgedExperienceSelection,
  isDemoExperienceSearchOutput,
  restoreExperienceJourney,
} from '../src/views/experience-results.js';
import { isExperienceTripSelection } from '../src/views/experience-selection-data.js';
import { ExperienceAddedView } from '../src/views/experience-selection.js';
import type { DemoExperienceSelection } from '../src/demo-schemas.js';

const result = demoGatewayOutputSchema.parse(runDemoGateway({
  kind: 'experience_search',
  experienceSearch: {
    destination: 'Lisbon', startDate: '2030-04-20', endDate: '2030-04-23',
    adults: 2, children: 0, currency: 'EUR', interests: ['FOOD', 'CULTURE'],
  },
  experienceCatalog: DEMO_EXPERIENCE_CATALOG,
  experienceAliases: DEMO_EXPERIENCE_ALIASES,
})).experienceResult!;

const render = (props: Parameters<typeof ExperienceResultsView>[0]) =>
  renderToStaticMarkup(createElement(ExperienceResultsView, props));

describe('Wayfare experience comparison widget', () => {
  it('renders normalized blank-name discovery as a valid carousel rather than a malformed result', () => {
    const broad = demoGatewayOutputSchema.parse(runDemoGateway({
      kind: 'experience_search',
      experienceSearch: { ...result.searchContext, experienceName: ' ' },
      experienceCatalog: DEMO_EXPERIENCE_CATALOG,
      experienceAliases: DEMO_EXPERIENCE_ALIASES,
    })).experienceResult!;
    expect(isDemoExperienceSearchOutput(broad)).toBe(true);
    expect(restoreExperienceJourney(undefined, broad).screen).toBe('results');
    const html = render({ result: broad, displayMode: 'inline' });
    expect((html.match(/>View details</g) ?? [])).toHaveLength(3);
    expect(html).not.toContain('Choose a day to continue');
  });

  it('opens one explicitly named match in details without selecting a date or slot, and honors Back', () => {
    const named = { ...result, searchContext: { ...result.searchContext, experienceName: result.experiences[0]!.title }, experiences: result.experiences.slice(0, 1) };
    expect(restoreExperienceJourney(undefined, named)).toMatchObject({ screen: 'detail', detailId: named.experiences[0]!.experienceId });
    expect(restoreExperienceJourney(undefined, named).choice).toBeUndefined();
    const html = render({ result: named, displayMode: 'inline' });
    expect(html).toContain('Choose a day to continue');
    expect(html).not.toContain('cc-experience-card');
    expect(restoreExperienceJourney({ searchId: named.searchId, screen: 'results', compareIds: [] }, named).screen).toBe('results');
    expect(restoreExperienceJourney({ searchId: 'old', screen: 'results', compareIds: [] }, named).screen).toBe('detail');
    expect(restoreExperienceJourney(undefined, { ...named, experiences: result.experiences }).screen).toBe('results');
    expect(restoreExperienceJourney(undefined, { ...named, searchContext: result.searchContext }).screen).toBe('results');
    expect(isDemoExperienceSearchOutput({ ...named, searchContext: { ...named.searchContext, experienceName: {} } })).toBe(false);
  });

  it('renders three bounded cards with bottom full-width detail actions and explicit demo provenance', () => {
    const html = render({ result, displayMode: 'inline', locale: 'en-CA' });

    expect(html).toContain('Lisbon experience ideas');
    expect(html).toContain('WAYFARE DEMO');
    expect(html).toContain(result.disclosure);
    expect((html.match(/class="[^"]*cc-experience-detail-action/g) ?? [])).toHaveLength(3);
    expect((html.match(/>View details</g) ?? [])).toHaveLength(3);
    expect(html).toContain('Select two cards to compare');
    expect(html).toContain('Next experience');
    expect(html).toContain('https://images.unsplash.com/');
    expect(html).toContain('Photo: Colin + Meg · Unsplash');
    const photoSources = [...html.matchAll(/https:\/\/images\.unsplash\.com\/(photo-[^?&quot;]+)/g)]
      .map((match) => match[1]);
    expect(new Set(photoSources).size).toBe(3);
    expect(html).not.toMatch(/Book now|Reserve|Checkout|Add to trip/iu);
  });

  it('hides comparison controls and guidance when only one experience is available', () => {
    const html = render({
      result: { ...result, experiences: result.experiences.slice(0, 1) },
      displayMode: 'inline',
      journey: { searchId: result.searchId, screen: 'results', compareIds: [] },
      onJourneyChange: vi.fn(),
    });

    expect(html).not.toContain('cc-experience-compare-toggle');
    expect(html).not.toContain('cc-experience-tray');
    expect(html).not.toContain('Select two cards to compare');
    expect(html).not.toContain('Compare selected');
  });

  it('renders selected thumbnails and the compare-two screen from current result IDs only', () => {
    const ids = result.experiences.slice(0, 2).map((experience) => experience.experienceId);
    const resultsHtml = render({
      result, displayMode: 'inline',
      journey: { searchId: result.searchId, screen: 'results', compareIds: ids },
    });
    expect((resultsHtml.match(/cc-experience-thumb/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(resultsHtml).toContain('Compare selected');

    const compareHtml = render({
      result, displayMode: 'inline',
      journey: { searchId: result.searchId, screen: 'compare', compareIds: ids },
    });
    expect(compareHtml).toContain('Compare two ideas');
    expect(compareHtml).toContain(result.experiences[0]!.cancellationPolicy);
    expect(compareHtml).toContain(result.experiences[1]!.accessibility.summary);
    expect((compareHtml.match(/cc-photo-image/g) ?? [])).toHaveLength(2);
  });

  it('renders the approved date and time choice with adult subtotal, disclosure, and a conversational action', () => {
    const experience = result.experiences[0]!;
    const html = render({
      result, displayMode: 'inline',
      journey: { searchId: result.searchId, screen: 'detail', detailId: experience.experienceId, compareIds: [] },
      onAsk: vi.fn(),
    });
    expect(html).toContain('Choose a day');
    expect(html).toContain(experience.operatorLabel);
    expect(html).toContain(experience.inclusions[0]);
    expect(html).toContain('Ask about this experience');
    expect(html).toContain('No reservation or payment');
    expect(html).toContain('Using your trip’s traveler details');
    expect(html).toContain('per adult × 2');
    expect(html).toContain('Choose a day to continue');
  });

  it('renders safe loading, error, malformed, and unsupported-destination states', () => {
    expect(render({ state: 'loading', displayMode: 'inline' })).toContain('aria-busy="true"');
    expect(render({ state: 'error', displayMode: 'inline' })).toContain('No replacement inventory was generated');
    expect(render({ state: 'malformed', displayMode: 'inline' })).toContain('could not be shown safely');
    const empty: DemoExperienceSearchOutput = {
      ...result, status: 'empty', supportedDestination: false,
      emptyReason: 'UNSUPPORTED_DESTINATION', experiences: [],
      message: 'The fictional Wayfare experience catalog is not configured for Reykjavík.',
    };
    expect(render({ result: empty, displayMode: 'inline' })).toContain('No demo catalog');
    expect(render({ result: empty, displayMode: 'inline' })).not.toContain('View details');
  });

  it('rejects malformed nested output and presentation state from another search', () => {
    expect(isDemoExperienceSearchOutput(result)).toBe(true);
    expect(isDemoExperienceSearchOutput({
      ...result,
      experiences: [{ ...result.experiences[0], experienceId: 'provider-id' }],
    })).toBe(false);
    expect(isDemoExperienceSearchOutput({
      ...result,
      experiences: [{ ...result.experiences[0], slots: [] }],
    })).toBe(false);
    const html = render({
      result, displayMode: 'inline',
      journey: { searchId: 'older-search', screen: 'detail', detailId: result.experiences[0]!.experienceId, compareIds: [] },
    });
    expect(html).toContain('Lisbon experience ideas');
    expect(html).not.toContain('Experience details');
  });
});

const experience = result.experiences[0]!;
const selection: DemoExperienceSelection = {
  selectionId: 'esel_0123456789abcdef0123456789abcdef', experience, slot: experience.slots[0]!,
  searchContext: result.searchContext,
  totalPrice: { amountMinor: experience.price.amountMinor * result.searchContext.adults, currency: experience.price.currency },
  addedAt: '2030-04-01T12:00:00Z', expiresAt: '2030-04-01T12:30:00Z',
};

describe('experience planning acknowledgments', () => {
  it('requires a coherent server acknowledgment for the requested experience and slot', () => {
    const response = { structuredContent: { status: 'selected', selection, requestedExperienceId: experience.experienceId, requestedSlotId: selection.slot.slotId } };
    expect(isExperienceTripSelection(selection)).toBe(true);
    expect(acknowledgedExperienceSelection(response, experience.experienceId, selection.slot.slotId)).toEqual(selection);
    expect(acknowledgedExperienceSelection(response, 'another-experience', selection.slot.slotId)).toBeUndefined();
    expect(acknowledgedExperienceSelection(response, experience.experienceId, 'another-slot')).toBeUndefined();
    expect(acknowledgedExperienceSelection(response, experience.experienceId, selection.slot.slotId, { experience: { ...experience, price: { ...experience.price, amountMinor: 1 } }, context: result.searchContext })).toBeUndefined();
    expect(acknowledgedExperienceSelection({ ...response, isError: true }, experience.experienceId, selection.slot.slotId)).toBeUndefined();
    expect(acknowledgedExperienceSelection({ structuredContent: { status: 'expired', selection } }, experience.experienceId, selection.slot.slotId)).toBeUndefined();
    expect(isExperienceTripSelection({ ...selection, totalPrice: { ...selection.totalPrice, amountMinor: 1 } })).toBe(false);
    expect(isExperienceTripSelection({ ...selection, slot: { ...selection.slot, startLocal: '2030-04-20T23:00:00' } })).toBe(false);
    expect(isExperienceTripSelection({ ...selection, searchContext: { ...selection.searchContext, adults: '2' } })).toBe(false);
  });

  it('accepts a server-bound duplicate from a repeated search without changing its original price', () => {
    const nextSlotId = 'slot_ffffffffffffffffffffffffffffffff';
    const repeated = { ...experience, experienceId: 'exp_ffffffffffffffffffffffffffffffff', slots: [{ ...selection.slot, slotId: nextSlotId }], price: { amountMinor: 99_00, currency: 'CAD' as const } };
    const expected = { experience: repeated, context: { ...result.searchContext, currency: 'CAD' as const } };
    const response = { structuredContent: { status: 'already_selected', selection, requestedExperienceId: repeated.experienceId, requestedSlotId: nextSlotId } };
    expect(acknowledgedExperienceSelection(response, repeated.experienceId, nextSlotId, expected)).toEqual(selection);
    expect(acknowledgedExperienceSelection(response, repeated.experienceId, nextSlotId, { ...expected, context: { ...expected.context, adults: 3 } })).toBeUndefined();
    expect(acknowledgedExperienceSelection(response, repeated.experienceId, nextSlotId, { ...expected, experience: { ...repeated, slots: [{ ...repeated.slots[0]!, startLocal: '2030-04-21T23:00:00' }] } })).toBeUndefined();
    expect(acknowledgedExperienceSelection({ structuredContent: { ...response.structuredContent, requestedSlotId: selection.slot.slotId } }, repeated.experienceId, nextSlotId, expected)).toBeUndefined();
  });

  it('does not fabricate child pricing or an actionable add for children', () => {
    const html = render({ result: { ...result, searchContext: { ...result.searchContext, children: 1 } }, displayMode: 'inline',
      journey: { searchId: result.searchId, screen: 'detail', detailId: experience.experienceId, compareIds: [], choice: { experienceId: experience.experienceId, date: selection.slot.startLocal.slice(0, 10), slotId: selection.slot.slotId } }, onAdd: vi.fn(), onJourneyChange: vi.fn() });
    expect(html).toContain('Child pricing is unknown');
    expect(html).toContain('Total unknown');
    expect(html).toMatch(/disabled=""[^>]*>Add to my trip/);
  });

  it('shows the acknowledged planning choice with imagery and review without claiming reservation', () => {
    const html = renderToStaticMarkup(createElement(ExperienceAddedView, { selection, onReview: vi.fn(), onExplore: vi.fn() }));
    expect(html).toContain('Added to your trip');
    expect(html).toContain('wf-trip-selected');
    expect(html).toContain('Fictional experience');
    expect(html).toContain('Review my trip');
    expect(html).toContain('Explore more experiences');
    expect(html).toContain('https://images.unsplash.com/');
    expect(html).not.toContain('confirmed');
  });
});
