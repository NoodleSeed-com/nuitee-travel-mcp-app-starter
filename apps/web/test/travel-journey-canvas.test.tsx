import type {
  AssistantClient,
  AssistantViewData,
} from '@noodleseed/assistant/client';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_TRIP,
  type TripProjection,
} from '../src/lib/trip-projection';
import { TravelJourneyCanvas } from '../src/components/travel-journey-canvas';

function createClient() {
  return {
    abort: vi.fn<AssistantClient['abort']>(),
    appSandboxUrl: vi.fn<NonNullable<AssistantClient['appSandboxUrl']>>()
      .mockReturnValue(undefined),
    connect: vi.fn<AssistantClient['connect']>().mockResolvedValue(undefined),
    getChatState: vi.fn<AssistantClient['getChatState']>().mockReturnValue({
      messages: [],
      status: 'ready',
    }),
    hasSession: vi.fn<AssistantClient['hasSession']>().mockReturnValue(true),
    isBusy: vi.fn<NonNullable<AssistantClient['isBusy']>>().mockReturnValue(false),
    requestApp: vi.fn<AssistantClient['requestApp']>().mockResolvedValue({}),
    resetSession: vi.fn<AssistantClient['resetSession']>(),
    respond: vi.fn<AssistantClient['respond']>().mockResolvedValue(undefined),
    sendMessage: vi.fn<AssistantClient['sendMessage']>().mockResolvedValue(undefined),
    subscribe: vi.fn<AssistantClient['subscribe']>().mockReturnValue(() => {}),
    subscribeChat: vi.fn<AssistantClient['subscribeChat']>()
      .mockReturnValue(() => {}),
    updateContext: vi.fn<AssistantClient['updateContext']>(),
    updateModelContext: vi.fn<AssistantClient['updateModelContext']>(),
    updatePageContext: vi.fn<AssistantClient['updatePageContext']>(),
  } satisfies AssistantClient;
}

const searchProjection: TripProjection = {
  ...EMPTY_TRIP,
  phase: 'searching',
  origin: 'ISB',
  destination: 'NYC',
};

const errorProjection: TripProjection = {
  ...EMPTY_TRIP,
  phase: 'error',
  origin: 'ISB',
  destination: 'NYC',
};

const view: AssistantViewData = {
  id: 'view-current-flights',
  tool: 'search_flights',
  resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
  title: 'Current flights',
  result: { status: 'success' },
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TravelJourneyCanvas', () => {
  it('mounts the active linked App exactly once', () => {
    const client = createClient();

    render(
      <TravelJourneyCanvas client={client} projection={searchProjection} view={view} />,
    );

    expect(screen.getByRole('region', { name: 'Flight workspace' })).toBeVisible();
    const mounted = document.querySelectorAll('noodle-app-view');
    expect(mounted).toHaveLength(1);
    expect(mounted[0]?.view).toBe(view);
  });

  it('shows typed search progress without inventing result data', () => {
    const client = createClient();

    render(
      <TravelJourneyCanvas
        client={client}
        projection={searchProjection}
        view={null}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Searching current flights');
    expect(document.querySelector('noodle-app-view')).not.toBeInTheDocument();
  });

  it('keeps an invalid-request result in the linked App instead of replacing it with prose', () => {
    const client = createClient();
    const failedView: AssistantViewData = {
      ...view,
      result: { status: 'error', error: { code: 'invalid_request' } },
    };

    render(
      <TravelJourneyCanvas
        client={client}
        projection={errorProjection}
        view={failedView}
      />,
    );

    expect(document.querySelector('noodle-app-view')?.view).toBe(failedView);
    expect(screen.queryByText('invalid_request')).not.toBeInTheDocument();
  });

  it('fails closed when a flight view does not match the registered manifest URI', () => {
    const client = createClient();
    const mismatchedView: AssistantViewData = {
      ...view,
      resourceUri: 'ui://unknown/current-flights',
    };

    render(
      <TravelJourneyCanvas
        client={client}
        projection={searchProjection}
        view={mismatchedView}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'This travel view is unavailable.',
    );
    expect(document.querySelector('noodle-app-view')).not.toBeInTheDocument();
  });
});
