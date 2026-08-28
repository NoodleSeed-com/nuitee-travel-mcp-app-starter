'use client';

import { NoodleAppView } from '@noodleseed/assistant/react';
import type {
  AssistantClient,
  AssistantViewData,
} from '@noodleseed/assistant/client';
import { isInlineTravelView } from '../lib/travel-view-policy';

interface TravelViewRegistryProps {
  readonly client: AssistantClient;
  readonly view: AssistantViewData;
}

export function TravelViewRegistry({
  client,
  view,
}: Readonly<TravelViewRegistryProps>) {
  if (!isInlineTravelView(view)) {
    return <p role="status">This travel view is unavailable.</p>;
  }

  return <NoodleAppView client={client} theme="light" view={view} />;
}
