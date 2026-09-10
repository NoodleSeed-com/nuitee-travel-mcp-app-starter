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

const hotelView: AssistantViewData = {
  id: 'hotel-view',
  tool: 'search_hotels',
  resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_hotels_widget',
  result: { status: 'success', dataSource: 'illustrative' },
};

const experienceView: AssistantViewData = {
  id: 'experience-view',
  tool: 'search_experiences',
  resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_experiences_widget',
  result: { status: 'success', dataSource: 'illustrative' },
};

const loyaltyView: AssistantViewData = {
  id: 'loyalty-view',
  tool: 'open_loyalty',
  resourceUri: 'ui://nuitee_travel_mcp_app_starter/open_loyalty_widget',
  result: { status: 'success', dataSource: 'illustrative' },
};

const rewardFlightView: AssistantViewData = {
  id: 'reward-flight-view',
  tool: 'compare_reward_flights',
  resourceUri: 'ui://nuitee_travel_mcp_app_starter/compare_reward_flights_widget',
  result: { status: 'success', dataSource: 'illustrative' },
};

const reviewView: AssistantViewData = {
  id: 'review-view',
  tool: 'review_trip',
  resourceUri: 'ui://nuitee_travel_mcp_app_starter/review_trip_widget',
  result: { status: 'ready', dataSource: 'illustrative' },
};

const insuranceView: AssistantViewData = {
  id: 'insurance-view',
  tool: 'compare_travel_insurance',
  resourceUri: 'ui://nuitee_travel_mcp_app_starter/compare_travel_insurance_widget',
  result: { status: 'success', dataSource: 'illustrative' },
};

describe('inline travel view admission', () => {
  it.each([
    ['flight search', searchView],
    ['travel starter', starterView],
    ['demo hotel search', hotelView],
    ['named hotel details', {
      id: 'opened-hotel',
      tool: 'open_hotel',
      resourceUri: 'ui://nuitee_travel_mcp_app_starter/open_hotel_widget',
      result: { status: 'ready' },
    }],
    ['fictional experience search', experienceView],
    ['fictional car search', { id:'cars',tool:'search_cars',resourceUri:'ui://nuitee_travel_mcp_app_starter/search_cars_widget',result:{status:'success'} }],
    ['experience selection acknowledgment', {
      id: 'experience-added',
      tool: 'add_experience_to_trip',
      resourceUri: 'ui://nuitee_travel_mcp_app_starter/add_experience_to_trip_widget',
      result: { status: 'selected' },
    }],
    ['demo loyalty overview', loyaltyView],
    ['illustrative reward-flight comparison', rewardFlightView],
    ['trip review', reviewView],
    ['illustrative travel-protection comparison', insuranceView],
  ])('admits the exact %s tool and resource pair', (_label, view) => {
    expect(isInlineTravelView(view)).toBe(true);
  });

  it.each([
    ['named hotel tool with a search resource', {
      ...hotelView,
      tool: 'open_hotel',
    }],
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
