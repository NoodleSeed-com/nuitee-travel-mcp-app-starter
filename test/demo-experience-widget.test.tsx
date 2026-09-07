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
  isDemoExperienceSearchOutput,
} from '../src/views/experience-results.js';

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
  });

  it('renders details and a conversational action without a transaction', () => {
    const experience = result.experiences[0]!;
    const html = render({
      result, displayMode: 'inline',
      journey: { searchId: result.searchId, screen: 'detail', detailId: experience.experienceId, compareIds: [] },
      onAsk: vi.fn(),
    });
    expect(html).toContain('Experience details');
    expect(html).toContain(experience.operatorLabel);
    expect(html).toContain(experience.inclusions[0]);
    expect(html).toContain('Ask about this experience');
    expect(html).toContain('cannot save or book');
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
