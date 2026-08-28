import type {
  AssistantUIMessage,
  AssistantViewData,
} from '@noodleseed/assistant/client';
import { describe, expect, it } from 'vitest';
import { latestJourneyView, travelViewPlacement } from '../src/lib/journey-view';

const first: AssistantViewData = {
  id: 'view-1',
  tool: 'search_flights',
  resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
  title: 'Flight results',
  result: { status: 'success' },
};
const latest: AssistantViewData = { ...first, id: 'view-2' };

describe('journey view selection', () => {
  it('selects the newest exact flight-results view for the journey canvas', () => {
    const messages: AssistantUIMessage[] = [{
      id: 'assistant-1',
      role: 'assistant',
      parts: [
        { type: 'data-view', data: first },
        { type: 'text', text: 'I refreshed the options.' },
        { type: 'data-view', data: latest },
      ],
    }];
    expect(latestJourneyView(messages)).toBe(latest);
  });

  it('keeps the native home view out of the journey canvas', () => {
    expect(travelViewPlacement({
      ...first,
      tool: 'open_travel_starter',
      resourceUri: 'ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget',
    })).toBe('native-home');
  });

  it('fails closed for a mismatched tool or resource URI', () => {
    expect(travelViewPlacement({ ...first, tool: 'manage_booking' })).toBeNull();
    expect(travelViewPlacement({ ...first, resourceUri: 'ui://unknown/results' })).toBeNull();
  });
});
