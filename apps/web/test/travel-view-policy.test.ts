import type { AssistantViewData } from '@noodleseed/assistant/client';
import { describe, expect, it } from 'vitest';
import { isInlineTravelView } from '../src/lib/travel-view-policy';

const searchView: AssistantViewData = {
  id: 'search-view',
  tool: 'search_flights',
  resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
  result: { status: 'success' },
};

const starterView: AssistantViewData = {
  id: 'starter-view',
  tool: 'open_travel_starter',
  resourceUri: 'ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget',
  result: { status: 'success' },
};

describe('inline travel view admission', () => {
  it.each([
    ['flight search', searchView],
    ['travel starter', starterView],
  ])('admits the exact %s tool and resource pair', (_label, view) => {
    expect(isInlineTravelView(view)).toBe(true);
  });

  it.each([
    ['approved tool with the other approved URI', {
      ...searchView,
      resourceUri: starterView.resourceUri,
    }],
    ['approved URI with an unknown tool', {
      ...searchView,
      tool: 'manage_booking',
    }],
    ['unknown URI', {
      ...searchView,
      resourceUri: 'ui://nuitee_travel_mcp_app_starter/manage_booking_widget',
    }],
    ['missing tool', {
      ...searchView,
      tool: '',
    }],
    ['tool prefix lookalike', {
      ...searchView,
      tool: 'preview_search_flights',
    }],
    ['tool suffix lookalike', {
      ...searchView,
      tool: 'search_flights_preview',
    }],
    ['URI suffix lookalike', {
      ...searchView,
      resourceUri: `${searchView.resourceUri}_preview`,
    }],
  ])('rejects %s', (_label, view) => {
    expect(isInlineTravelView(view)).toBe(false);
  });
});
