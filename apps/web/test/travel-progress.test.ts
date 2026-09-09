import type { AssistantClientEvent } from '@noodleseed/assistant/client';
import { describe, expect, it } from 'vitest';
import { progressForEvent } from '../src/lib/travel-progress';

describe('plain-language assistant activity', () => {
  it.each([
    ['open_travel_starter', 'Opening the travel assistant'],
    ['plan_flight_search', 'Preparing your trip'],
    ['search_flights', 'Searching current flights'],
    ['select_flight_offer', 'Saving your fare choice'],
    ['verify_flight_offer', 'Verifying the current fare'],
    ['search_hotels', 'Finding stays'],
    ['open_hotel', 'Opening your requested stay'],
    ['select_hotel', 'Adding the stay'],
    ['open_loyalty', 'Opening illustrative rewards'],
    ['compare_travel_insurance', 'Comparing illustrative travel protection'],
    ['review_trip', 'Reviewing selected travel'],
    ['internal_future_tool', 'Working on your request'],
  ])('maps %s without exposing an identifier', (tool, copy) => {
    const event = {
      event: 'tool_started',
      data: { id: 'call-1', tool },
    } satisfies AssistantClientEvent;

    const progress = progressForEvent(event);
    expect(progress).toMatchObject({ label: copy });
    expect(progress?.label).not.toContain(tool);
  });

  it('projects only the two honest in-flight trip phases', () => {
    expect(progressForEvent({
      event: 'tool_started',
      data: { id: 'call-plan', tool: 'plan_flight_search' },
    })).toEqual({ label: 'Preparing your trip' });
    expect(progressForEvent({
      event: 'tool_started',
      data: { id: 'call-search', tool: 'search_flights' },
    })).toEqual({
      label: 'Searching current flights',
      phase: 'searching',
    });
    expect(progressForEvent({
      event: 'tool_started',
      data: { id: 'call-verify', tool: 'verify_flight_offer' },
    })).toEqual({
      label: 'Verifying the current fare',
      phase: 'verifying',
    });
    expect(progressForEvent({
      event: 'tool_started',
      data: { id: 'call-select', tool: 'select_flight_offer' },
    })).toEqual({ label: 'Saving your fare choice' });
    expect(progressForEvent({
      event: 'tool_started',
      data: { id: 'call-hotel', tool: 'search_hotels' },
    })).toEqual({ label: 'Finding stays', skeleton: 'hotels' });
  });

  it.each<AssistantClientEvent>([
    { event: 'content', data: { delta: 'Searching flights' } },
    { event: 'tool_completed', data: {
      id: 'call-1',
      tool: 'search_flights',
      result: { status: 'success' },
    } },
    { event: 'done', data: {} },
    { event: 'error', data: { code: 'provider_error' } },
  ])('ignores the unrelated $event event', (event) => {
    expect(progressForEvent(event)).toBeNull();
  });
});
