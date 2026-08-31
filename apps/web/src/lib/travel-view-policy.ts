import type { AssistantViewData } from '@noodleseed/assistant/client';

const INLINE_TRAVEL_VIEW_URIS: Readonly<Record<string, string>> = {
  search_flights: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
  open_travel_starter: 'ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget',
};

export function isInlineTravelView(view: AssistantViewData): boolean {
  const expectedUri = INLINE_TRAVEL_VIEW_URIS[view.tool];
  return expectedUri !== undefined && view.resourceUri === expectedUri;
}
