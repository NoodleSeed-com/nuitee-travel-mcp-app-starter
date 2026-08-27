'use client';

import { NoodleAppView } from '@noodleseed/assistant/react';
import type {
  AssistantClient,
  AssistantViewData,
} from '@noodleseed/assistant/client';

interface TravelViewRegistryProps {
  readonly client: AssistantClient;
  readonly theme: 'light' | 'dark';
  readonly view: AssistantViewData;
}

export function TravelViewRegistry({
  client,
  theme,
  view,
}: Readonly<TravelViewRegistryProps>) {
  if (
    view.tool !== 'open_travel_starter'
    && view.tool !== 'search_flights'
  ) {
    return <p role="status">This travel view is unavailable.</p>;
  }

  return <NoodleAppView client={client} theme={theme} view={view} />;
}
