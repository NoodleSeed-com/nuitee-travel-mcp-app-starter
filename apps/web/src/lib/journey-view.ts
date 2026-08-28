import type {
  AssistantUIMessage,
  AssistantViewData,
} from '@noodleseed/assistant/client';
import { isInlineTravelView } from './travel-view-policy';

export type TravelViewPlacement = 'journey-canvas' | 'native-home';

/**
 * Temporary compatibility for the side-canvas consumers removed in Task 2.
 * Inline admission is owned exclusively by isInlineTravelView.
 */
export function travelViewPlacement(
  view: AssistantViewData,
): TravelViewPlacement | null {
  if (!isInlineTravelView(view)) return null;
  return view.tool === 'search_flights' ? 'journey-canvas' : 'native-home';
}

export function latestJourneyView(
  messages: readonly AssistantUIMessage[],
): AssistantViewData | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const parts = messages[messageIndex]!.parts;
    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = parts[partIndex]!;
      if (
        part.type === 'data-view'
        && travelViewPlacement(part.data) === 'journey-canvas'
      ) {
        return part.data;
      }
    }
  }
  return null;
}
