import type {
  AssistantUIMessage,
  AssistantViewData,
} from '@noodleseed/assistant/client';

export type TravelViewPlacement = 'journey-canvas' | 'native-home';

export function travelViewPlacement(
  view: AssistantViewData,
): TravelViewPlacement | null {
  if (
    view.tool === 'search_flights'
    && view.resourceUri === 'ui://nuitee_travel_mcp_app_starter/search_flights_widget'
  ) {
    return 'journey-canvas';
  }
  if (
    view.tool === 'open_travel_starter'
    && view.resourceUri === 'ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget'
  ) {
    return 'native-home';
  }
  return null;
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
