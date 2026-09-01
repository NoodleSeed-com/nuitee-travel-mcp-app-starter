import type { AssistantClientEvent } from '@noodleseed/assistant/client';
import type { TripPhase } from './trip-projection';

export interface ToolActivity {
  readonly label: string;
  readonly phase?: TripPhase;
}

export function progressForEvent(
  event: AssistantClientEvent,
): ToolActivity | null {
  if (event.event !== 'tool_started') return null;

  switch (event.data.tool) {
    case 'open_travel_starter':
      return { label: 'Opening the travel assistant' };
    case 'plan_flight_search':
      return { label: 'Preparing your trip' };
    case 'search_flights':
      return { label: 'Searching current flights', phase: 'searching' };
    case 'select_flight_offer':
      return { label: 'Saving your fare choice' };
    case 'verify_flight_offer':
      return { label: 'Verifying the current fare', phase: 'verifying' };
    case 'search_hotels':
      return { label: 'Finding stays' };
    case 'select_hotel':
      return { label: 'Adding the stay' };
    case 'open_loyalty':
      return { label: 'Opening illustrative rewards' };
    case 'review_trip':
      return { label: 'Reviewing selected travel' };
    default:
      return { label: 'Working on your request' };
  }
}
