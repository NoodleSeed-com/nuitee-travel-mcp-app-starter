import type { AssistantViewData } from '@noodleseed/assistant/client';

const INLINE_TRAVEL_VIEW_URIS: Readonly<Record<string, string>> = {
  search_flights: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
  open_travel_starter: 'ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget',
  search_hotels: 'ui://nuitee_travel_mcp_app_starter/search_hotels_widget',
  open_hotel: 'ui://nuitee_travel_mcp_app_starter/open_hotel_widget',
  search_experiences: 'ui://nuitee_travel_mcp_app_starter/search_experiences_widget',
  search_cars: 'ui://nuitee_travel_mcp_app_starter/search_cars_widget',
  add_experience_to_trip: 'ui://nuitee_travel_mcp_app_starter/add_experience_to_trip_widget',
  open_loyalty: 'ui://nuitee_travel_mcp_app_starter/open_loyalty_widget',
  compare_reward_flights: 'ui://nuitee_travel_mcp_app_starter/compare_reward_flights_widget',
  review_trip: 'ui://nuitee_travel_mcp_app_starter/review_trip_widget',
  compare_travel_insurance: 'ui://nuitee_travel_mcp_app_starter/compare_travel_insurance_widget',
};

export function isInlineTravelView(view: AssistantViewData): boolean {
  const expectedUri = INLINE_TRAVEL_VIEW_URIS[view.tool];
  return expectedUri !== undefined && view.resourceUri === expectedUri;
}
