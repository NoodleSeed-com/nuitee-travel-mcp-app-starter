import type {
  AssistantUIMessage,
  AssistantViewData,
} from '@noodleseed/assistant/client';
import { describe, expect, it } from 'vitest';
import { latestJourneyView, travelViewPlacement } from '../src/lib/journey-view';

const searchView: AssistantViewData = {
  id: 'view-1',
  tool: 'search_flights',
  resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
  result: { status: 'success' },
};

describe('temporary journey view compatibility bridge', () => {
  it('selects the newest exact search App for the legacy canvas consumer', () => {
    const latest: AssistantViewData = { ...searchView, id: 'view-2' };
    const messages: AssistantUIMessage[] = [{
      id: 'assistant-1',
      role: 'assistant',
      parts: [
        { type: 'data-view', data: searchView },
        { type: 'text', text: 'I refreshed the options.' },
        { type: 'data-view', data: latest },
      ],
    }];

    expect(latestJourneyView(messages)).toBe(latest);
  });

  it('keeps the exact starter App on the legacy native-home path', () => {
    expect(travelViewPlacement({
      ...searchView,
      tool: 'open_travel_starter',
      resourceUri: 'ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget',
    })).toBe('native-home');
  });

  it('delegates admission to the exact inline policy', () => {
    expect(travelViewPlacement({
      ...searchView,
      resourceUri: 'ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget',
    })).toBeNull();
    expect(travelViewPlacement({
      ...searchView,
      tool: 'search_flights_preview',
    })).toBeNull();
  });
});
