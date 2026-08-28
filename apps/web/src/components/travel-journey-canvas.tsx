'use client';

import type {
  AssistantClient,
  AssistantViewData,
} from '@noodleseed/assistant/client';
import { travelViewPlacement } from '../lib/journey-view';
import type { TripProjection } from '../lib/trip-projection';
import { TravelViewRegistry } from './travel-view-registry';

interface Props {
  readonly client: AssistantClient;
  readonly projection: TripProjection;
  readonly view: AssistantViewData | null;
}

function canvasMessage(projection: TripProjection): string {
  switch (projection.phase) {
    case 'planned':
    case 'searching':
      return 'Current options will appear here as soon as the search completes.';
    case 'error':
      return 'Adjust the trip in the conversation and search again.';
    case 'no-results':
      return 'Try different dates or airports.';
    case 'comparing':
    case 'selected':
    case 'verifying':
    case 'verified':
      return 'Your latest flight options stay here while you refine the trip.';
    case 'idle':
      return 'Tell Wayfare where you want to go.';
  }
}

export function TravelJourneyCanvas({
  client,
  projection,
  view,
}: Readonly<Props>) {
  const placement = view ? travelViewPlacement(view) : null;
  const journeyView = placement === 'journey-canvas' ? view : null;
  const unrecognizedView = placement === null ? view : null;
  const viewForRegistry = journeyView ?? unrecognizedView;

  return (
    <section aria-label="Flight workspace" className="travel-journey-canvas">
      {viewForRegistry ? (
        <TravelViewRegistry client={client} view={viewForRegistry} />
      ) : (
        <div className="travel-journey-canvas__empty" role="status">
          <h2>
            {projection.phase === 'searching'
              ? 'Searching current flights'
              : 'Your flight options'}
          </h2>
          <p>{canvasMessage(projection)}</p>
        </div>
      )}
    </section>
  );
}
