import type { AssistantClientEvent } from '@noodleseed/assistant/client';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImmersiveChatPage } from '../src/components/experience/immersive-chat-page';
import { ImmersiveTripRail } from '../src/components/experience/immersive-trip-rail';
import { siteConfig } from '../src/lib/site-config';

const assistantMock = vi.hoisted(() => ({
  useNoodleAssistant: vi.fn(),
}));

const appViewMock = vi.hoisted(() => ({
  mountedClient: undefined as undefined | {
    requestApp(method: string, params: Readonly<Record<string, unknown>>): Promise<unknown>;
  },
}));

vi.mock('@noodleseed/assistant/react/client', () => ({
  useNoodleAssistant: assistantMock.useNoodleAssistant,
}));

vi.mock('@noodleseed/assistant/react', () => ({
  NoodleAppView: ({ client: mountedClient }: {
    client: typeof appViewMock.mountedClient;
  }) => {
    appViewMock.mountedClient = mountedClient;
    return <div data-testid="noodle-app-view" />;
  },
}));

const readyRuntime = {
  status: 'ready' as const,
  embedId: 'pub_experience_test',
  serviceUrl: 'https://assistant.example.com',
};

function createClient() {
  const listeners = new Set<(event: AssistantClientEvent) => void>();
  return {
    abort: vi.fn(),
    resetSession: vi.fn(),
    respond: vi.fn().mockResolvedValue(undefined),
    requestApp: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Fare selected.' }],
      isError: false,
      structuredContent: {
        status: 'selected',
        selectionId: 'sel_0123456789abcdef0123456789abcdef',
      },
    }),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn((listener: (event: AssistantClientEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
  };
}

function verifiedFlightAppMessage(selectionId: string) {
  return {
    id: 'message-assistant-flight-app-verification',
    role: 'assistant' as const,
    parts: [
      {
        type: 'data-view',
        data: {
          id: 'flight-results-app-verification',
          tool: 'search_flights',
          resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
          title: 'Flight results',
          result: { status: 'success' },
        },
      },
      {
        type: 'data-tool-result',
        data: {
          tool: 'search_flights',
          result: {
            status: 'success',
            searchContext: {
              origin: 'YYZ', destination: 'LIS', departureDate: '2026-09-08',
              adults: 2, children: 0, infants: 0, cabinClass: 'ECONOMY',
              currency: 'CAD', country: 'CA',
            },
            itineraries: [{
              selectionId,
              route: { origin: 'YYZ', destination: 'LIS' },
              carrier: { name: 'Air Transat', code: 'TS' },
              departureTime: '2026-09-08T19:45:00-04:00',
              price: { total: 607.45, currency: 'CAD' },
            }],
          },
        },
      },
      {
        type: 'data-tool-result',
        data: {
          tool: 'select_flight_offer',
          result: { status: 'selected', selectionId },
        },
      },
      {
        type: 'data-tool-result',
        data: {
          tool: 'verify_flight_offer',
          result: {
            status: 'success',
            verification: {
              status: 'success',
              availability: 'available',
              selectionId,
              currentPrice: { total: 612.25, currency: 'CAD' },
            },
          },
        },
      },
    ],
  };
}

let client = createClient();
let assistantStatus: 'ready' | 'submitted' | 'streaming' = 'ready';
let assistantMessages: readonly {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly parts: readonly Record<string, unknown>[];
}[] = [];

beforeEach(() => {
  sessionStorage.clear();
  client = createClient();
  assistantStatus = 'ready';
  assistantMessages = [];
  appViewMock.mountedClient = undefined;
  assistantMock.useNoodleAssistant.mockReset();
  assistantMock.useNoodleAssistant.mockImplementation(() => {
    const activeClient = client;
    useEffect(() => () => {
      activeClient.abort();
      activeClient.resetSession();
    }, [activeClient]);
    return {
      client: activeClient,
      messages: assistantMessages,
      status: assistantStatus,
      error: undefined,
    };
  });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('alternative custom chat page', () => {
  it('shows an honest protection-comparison state in the trip rail', () => {
    const onPrompt = vi.fn();
    render(
      <ImmersiveTripRail
        busy={false}
        onPrompt={onPrompt}
        projection={{
          phase: 'insurance',
          focus: 'insurance',
          hasInsuranceComparison: true,
        }}
      />,
    );

    const protection = screen.getByRole('button', { name: /Protection/ });
    expect(protection).toHaveTextContent('Comparison available');
    fireEvent.click(protection);
    expect(onPrompt).toHaveBeenCalledWith(
      'Compare illustrative travel protection for this trip.',
    );
  });

  it('renders the immersive conversation hierarchy, trip context, and compact trip control', async () => {
    assistantMessages = [
      {
        id: 'message-user',
        role: 'user',
        parts: [{
          type: 'text',
          text: 'Find me flights from Toronto to Lisbon next week for two.',
        }],
      },
      {
        id: 'message-assistant',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'Here are the current options for your trip.',
          },
          {
            type: 'data-tool-result',
            data: {
              tool: 'search_flights',
              result: {
                status: 'success',
                searchContext: {
                  origin: 'YYZ',
                  destination: 'LIS',
                  tripType: 'ONE_WAY',
                  departureDate: '2026-09-08',
                  adults: 2,
                  children: 0,
                  infants: 0,
                  childrenAges: [],
                  infantAges: [],
                  cabinClass: 'ECONOMY',
                  currency: 'CAD',
                  country: 'CA',
                },
              },
            },
          },
        ],
      },
    ];
    sessionStorage.setItem('wayfare:experience-prompt', 'Toronto to Lisbon');

    render(<ImmersiveChatPage runtime={readyRuntime} />);

    const routeSummary = await screen.findByRole('region', {
      name: 'Trip route summary',
    });
    expect(routeSummary).toHaveTextContent('YYZ');
    expect(routeSummary).toHaveTextContent('LIS');
    expect(routeSummary).toHaveTextContent('8 Sep');
    expect(routeSummary).toHaveTextContent('2 adults');
    expect(routeSummary).toHaveTextContent('Economy');
    expect(routeSummary).toHaveTextContent('CAD');

    expect(screen.getByLabelText('Wayfare assistant')).toBeVisible();
    expect(screen.getByLabelText('Traveler')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Change trip details' }))
      .toBeVisible();
    expect(document.querySelector('.travel-conversation__header--immersive'))
      .not.toBeInTheDocument();
    const conversation = screen.getByRole('region', { name: 'Travel conversation' });
    const transcript = within(conversation).getByRole('log', {
      name: 'Conversation transcript',
    }).parentElement!;
    const tripRail = within(conversation).getByRole('complementary', {
      name: 'Your trip',
    });
    expect(
      routeSummary.compareDocumentPosition(transcript) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      transcript.compareDocumentPosition(tripRail) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View trip · 0 selected' }))
      .toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps stateless protection separate from the stateful trip review', () => {
    const onPrompt = vi.fn();
    render(
      <ImmersiveTripRail
        busy={false}
        onPrompt={onPrompt}
        projection={{
          phase: 'insurance',
          focus: 'insurance',
          hasFlightSelection: true,
          hasStaySelection: true,
          hasRewardsReview: true,
          hasInsuranceComparison: true,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Review current trip' }));
    expect(onPrompt).toHaveBeenCalledWith(
      'Review my current flight, stay, and illustrative rewards together.',
    );
    expect(screen.getByText(/Protection comparisons remain separate/)).toBeVisible();
  });

  it('shows validated selected flight and stay summaries without inventing a package total', () => {
    render(
      <ImmersiveTripRail
        busy={false}
        onPrompt={vi.fn()}
        projection={{
          phase: 'stay-selected',
          hasFlightSelection: true,
          hasStaySelection: true,
          selectedFlight: {
            dataSource: 'live_nuitee_selection',
            sourceLabel: 'Nuitee search fare',
            carrierName: 'Air Transat',
            carrierCode: 'TS',
            origin: 'YYZ',
            destination: 'LIS',
            departureDate: '2026-09-08',
            departureTime: '2026-09-08T19:45:00-04:00',
            travelers: '2 adults',
            searchPrice: { total: 607.45, currency: 'CAD' },
            status: 'selected',
          },
          selectedStay: {
            dataSource: 'illustrative',
            sourceLabel: 'Illustrative stay',
            propertyName: 'Tagus Lantern Hotel',
            destination: 'Lisbon',
            checkInDate: '2026-09-08',
            checkOutDate: '2026-09-15',
            nights: 7,
            subtotal: { total: 1_240, currency: 'CAD' },
            status: 'selected',
          },
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /Flight/ }))
      .toHaveTextContent('Air Transat · YYZ → LIS');
    expect(screen.getByRole('button', { name: /Flight/ }))
      .toHaveTextContent('Nuitee search fare · CA$607.45 · 19:45 · Verify price');
    expect(screen.getByRole('button', { name: /Flight/ }))
      .toHaveTextContent('19:45');
    expect(screen.getByRole('button', { name: /Stay/ }))
      .toHaveTextContent('Tagus Lantern Hotel');
    expect(screen.getByRole('button', { name: /Stay/ }))
      .toHaveTextContent('Illustrative stay · CA$1,240.00');
    expect(screen.queryByText(/estimated total/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Flight and stay prices remain separate/)).toBeVisible();
  });

  it('shows bounded insurance-first trip context without exposing quote data', () => {
    render(
      <ImmersiveTripRail
        busy={false}
        onPrompt={vi.fn()}
        projection={{
          phase: 'insurance',
          focus: 'insurance',
          hasInsuranceComparison: true,
          protectionDestination: 'Portugal',
          departureDate: '2026-10-12',
          returnDate: '2026-10-18',
          travelers: '2 adults',
          currency: 'CAD',
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /Protection/ }))
      .toHaveTextContent('Comparison available · Portugal');
    expect(screen.queryByText(/quote|recommended|policy price/i)).not.toBeInTheDocument();
  });

  it('reveals the newest matching App when a selected trip item is opened', async () => {
    const selectionId = 'sel_0123456789abcdef0123456789abcdef';
    const view = {
      tool: 'search_flights',
      resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
      title: 'Flight results',
      result: { status: 'success' },
    };
    assistantMessages = [{
      id: 'message-assistant-results',
      role: 'assistant',
      parts: [
        { type: 'data-view', data: { ...view, id: 'older-flight-results' } },
        { type: 'data-view', data: { ...view, id: 'newer-flight-results' } },
        {
          type: 'data-tool-result',
          data: {
            tool: 'search_flights',
            result: {
              status: 'success',
              searchContext: {
                origin: 'YYZ', destination: 'LIS', departureDate: '2026-09-08',
                adults: 2, children: 0, infants: 0, cabinClass: 'ECONOMY',
                currency: 'CAD', country: 'CA',
              },
              itineraries: [{
                selectionId,
                route: { origin: 'YYZ', destination: 'LIS' },
                carrier: { name: 'Air Transat', code: 'TS' },
                departureTime: '2026-09-08T19:45:00-04:00',
                price: { total: 607.45, currency: 'CAD' },
              }],
            },
          },
        },
        {
          type: 'data-tool-result',
          data: {
            tool: 'select_flight_offer',
            result: { status: 'selected', selectionId },
          },
        },
      ],
    }];
    sessionStorage.setItem('wayfare:experience-prompt', 'Toronto to Lisbon');
    const revealed: HTMLElement[] = [];
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value(this: HTMLElement) { revealed.push(this); },
    });

    try {
      render(<ImmersiveChatPage runtime={readyRuntime} />);
      await waitFor(() => expect(client.sendMessage).toHaveBeenCalledOnce());
      const surfaces = document.querySelectorAll<HTMLElement>('.travel-app-surface');
      expect(surfaces).toHaveLength(2);

      fireEvent.click(screen.getByRole('button', { name: /Flight/ }));

      expect(revealed.at(-1)).toBe(surfaces.item(1));
      expect(document.activeElement).toBe(surfaces.item(1));
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: originalScrollIntoView,
      });
    }
  });

  it('projects a successful selection made directly inside an embedded flight App', async () => {
    const selectionId = 'sel_0123456789abcdef0123456789abcdef';
    assistantMessages = [{
      id: 'message-assistant-flight-app',
      role: 'assistant',
      parts: [
        {
          type: 'data-view',
          data: {
            id: 'flight-results-app',
            tool: 'search_flights',
            resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
            title: 'Flight results',
            result: { status: 'success' },
          },
        },
        {
          type: 'data-tool-result',
          data: {
            tool: 'search_flights',
            result: {
              status: 'success',
              searchContext: {
                origin: 'YYZ', destination: 'LIS', departureDate: '2026-09-08',
                adults: 2, children: 0, infants: 0, cabinClass: 'ECONOMY',
                currency: 'CAD', country: 'CA',
              },
              itineraries: [{
                selectionId,
                route: { origin: 'YYZ', destination: 'LIS' },
                carrier: { name: 'Air Transat', code: 'TS' },
                departureTime: '2026-09-08T19:45:00-04:00',
                price: { total: 607.45, currency: 'CAD' },
              }],
            },
          },
        },
      ],
    }];
    sessionStorage.setItem('wayfare:experience-prompt', 'Toronto to Lisbon');

    render(<ImmersiveChatPage runtime={readyRuntime} />);
    await waitFor(() => expect(appViewMock.mountedClient).toBeDefined());

    await appViewMock.mountedClient!.requestApp('tools/call', {
      name: 'select_flight_offer',
      arguments: { selectionId },
    });

    await waitFor(() => expect(screen.getByRole('button', { name: /Flight/ }))
      .toHaveTextContent('Air Transat · YYZ → LIS'));
    expect(client.requestApp).toHaveBeenCalledWith('tools/call', {
      name: 'select_flight_offer',
      arguments: { selectionId },
    });
    expect(screen.getByRole('button', { name: /Flight/ }))
      .toHaveTextContent('Nuitee search fare · CA$607.45 · 19:45 · Verify price');
  });

  it('projects a successful selection made directly inside an embedded hotel App', async () => {
    const selectionId = 'hsel_0123456789abcdef0123456789abcdef';
    client.requestApp.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Stay selected.' }],
      isError: false,
      structuredContent: { status: 'selected', selectionId },
    });
    assistantMessages = [{
      id: 'message-assistant-hotel-app',
      role: 'assistant',
      parts: [
        {
          type: 'data-view',
          data: {
            id: 'hotel-results-app',
            tool: 'search_hotels',
            resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_hotels_widget',
            title: 'Hotel results',
            result: { status: 'success' },
          },
        },
        {
          type: 'data-tool-result',
          data: {
            tool: 'search_hotels',
            result: {
              status: 'success',
              dataSource: 'live_nuitee',
              searchContext: {
                destination: 'Lisbon',
                checkInDate: '2026-09-08',
                checkOutDate: '2026-09-11',
                currency: 'CAD',
              },
              hotels: [{
                selectionId,
                dataSource: 'live_nuitee',
                name: 'Lisbon Riverside Hotel',
                city: 'Lisbon',
                nights: 3,
                staySubtotal: { amount: 825, currency: 'CAD' },
              }],
            },
          },
        },
      ],
    }];
    sessionStorage.setItem('wayfare:experience-prompt', 'Hotels in Lisbon');

    render(<ImmersiveChatPage runtime={readyRuntime} />);
    await waitFor(() => expect(appViewMock.mountedClient).toBeDefined());

    await appViewMock.mountedClient!.requestApp('tools/call', {
      name: 'select_hotel',
      arguments: { selectionId },
    });

    await waitFor(() => expect(screen.getByRole('button', { name: /Stay/ }))
      .toHaveTextContent('Lisbon Riverside Hotel'));
    expect(screen.getByRole('button', { name: /Stay/ }))
      .toHaveTextContent('Lisbon · 3 nights');
    expect(screen.getByRole('button', { name: /Stay/ }))
      .toHaveTextContent('Current Nuitee hotel rate · CA$825.00');
    expect(client.requestApp).toHaveBeenCalledWith('tools/call', {
      name: 'select_hotel',
      arguments: { selectionId },
    });
  });

  it('downgrades a verified rail fare when direct App re-verification fails', async () => {
    const selectionId = 'sel_0123456789abcdef0123456789abcdef';
    assistantMessages = [verifiedFlightAppMessage(selectionId)];
    client.requestApp.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Verification failed.' }],
      isError: true,
    });
    sessionStorage.setItem('wayfare:experience-prompt', 'Toronto to Lisbon');

    render(<ImmersiveChatPage runtime={readyRuntime} />);
    await waitFor(() => expect(appViewMock.mountedClient).toBeDefined());
    expect(screen.getByRole('button', { name: /Flight/ }))
      .toHaveTextContent('Verified Nuitee fare · CA$612.25');

    await appViewMock.mountedClient!.requestApp('tools/call', {
      name: 'verify_flight_offer',
      arguments: { selectionId },
    });

    await waitFor(() => expect(screen.getByRole('button', { name: /Flight/ }))
      .toHaveTextContent('Nuitee search fare · CA$607.45 · 19:45 · Verify price'));
    expect(screen.getByRole('button', { name: /Flight/ }))
      .not.toHaveTextContent('Verified Nuitee fare');
  });

  it('downgrades a verified rail fare when direct App transport fails', async () => {
    const selectionId = 'sel_0123456789abcdef0123456789abcdef';
    assistantMessages = [verifiedFlightAppMessage(selectionId)];
    client.requestApp.mockRejectedValueOnce(new Error('session unavailable'));
    sessionStorage.setItem('wayfare:experience-prompt', 'Toronto to Lisbon');

    render(<ImmersiveChatPage runtime={readyRuntime} />);
    await waitFor(() => expect(appViewMock.mountedClient).toBeDefined());
    expect(screen.getByRole('button', { name: /Flight/ }))
      .toHaveTextContent('Verified Nuitee fare · CA$612.25');

    await expect(appViewMock.mountedClient!.requestApp('tools/call', {
      name: 'verify_flight_offer',
      arguments: { selectionId },
    })).rejects.toThrow('session unavailable');

    await waitFor(() => expect(screen.getByRole('button', { name: /Flight/ }))
      .toHaveTextContent('Nuitee search fare · CA$607.45 · 19:45 · Verify price'));
    expect(screen.getByRole('button', { name: /Flight/ }))
      .not.toHaveTextContent('Verified Nuitee fare');
  });

  it('shows an accessible empty state without opening an Assistant session', async () => {
    render(<ImmersiveChatPage runtime={readyRuntime} />);

    expect(await screen.findByTestId('immersive-chat-page')).toHaveAttribute(
      'data-layout',
      'custom-chat',
    );
    expect(screen.getByRole('heading', { name: 'Where should we take you?' }))
      .toBeVisible();
    expect(screen.getByRole('form', { name: 'Start a trip' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Find a flight' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Compare protection' })).toBeVisible();
    expect(assistantMock.useNoodleAssistant).not.toHaveBeenCalled();
  });

  it('consumes a one-shot landing prompt and sends it exactly once', async () => {
    sessionStorage.setItem(
      'wayfare:experience-prompt',
      'Toronto to Lisbon next week for two adults',
    );

    render(<ImmersiveChatPage runtime={readyRuntime} />);

    await waitFor(() => {
      expect(client.sendMessage).toHaveBeenCalledWith(
        'Toronto to Lisbon next week for two adults',
      );
    });
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('wayfare:experience-prompt')).toBeNull();
    expect(screen.getByRole('region', { name: 'Travel conversation' }))
      .toHaveClass('travel-conversation-shell--immersive');
    expect(screen.getByRole('complementary', { name: 'Your trip' }))
      .toBeVisible();
    expect(assistantMock.useNoodleAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        embedId: readyRuntime.embedId,
        serviceUrl: readyRuntime.serviceUrl,
        principalKey: expect.any(String),
      }),
    );
  });

  it('waits for the Assistant client to be ready before sending the landing prompt', async () => {
    assistantStatus = 'submitted';
    sessionStorage.setItem(
      'wayfare:experience-prompt',
      'Toronto to Lisbon next week for two adults',
    );
    const view = render(<ImmersiveChatPage runtime={readyRuntime} />);

    await screen.findByTestId('immersive-chat-page');
    expect(client.sendMessage).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('wayfare:experience-prompt')).toBe(
      'Toronto to Lisbon next week for two adults',
    );

    assistantStatus = 'ready';
    view.rerender(<ImmersiveChatPage runtime={readyRuntime} />);

    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledOnce());
    expect(sessionStorage.getItem('wayfare:experience-prompt')).toBeNull();
  });

  it('retains a rejected landing prompt and retries it without retyping', async () => {
    client.sendMessage
      .mockRejectedValueOnce(new Error('session race'))
      .mockResolvedValueOnce(undefined);
    sessionStorage.setItem(
      'wayfare:experience-prompt',
      'Toronto to Lisbon next week for two adults',
    );

    render(<ImmersiveChatPage runtime={readyRuntime} />);

    const retry = await screen.findByRole('button', { name: 'Retry starting trip' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your request is still here',
    );
    expect(sessionStorage.getItem('wayfare:experience-prompt')).toBe(
      'Toronto to Lisbon next week for two adults',
    );

    fireEvent.click(retry);

    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(sessionStorage.getItem('wayfare:experience-prompt')).toBeNull();
    });
  });

  it('carries the selected Explore currency into Assistant page context', async () => {
    sessionStorage.setItem('wayfare:experience-currency', 'CAD');
    sessionStorage.setItem('wayfare:experience-prompt', 'Toronto to Lisbon');

    render(<ImmersiveChatPage runtime={readyRuntime} />);

    await waitFor(() => {
      const options = assistantMock.useNoodleAssistant.mock.calls.at(-1)?.[0];
      expect(options?.pageContext()).toMatchObject({ travelCurrency: 'CAD' });
    });
    expect(sessionStorage.getItem('wayfare:experience-currency')).toBeNull();
  });

  it('starts from a suggested intent and keeps the composer available', async () => {
    render(<ImmersiveChatPage runtime={readyRuntime} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Find a flight' }));

    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledOnce());
    expect(screen.getByRole('form', { name: 'Continue trip' })).toBeVisible();
  });

  it('sends Rewards as a follow-up after a conversation has started', async () => {
    sessionStorage.setItem('wayfare:experience-prompt', 'Toronto to Lisbon');
    render(<ImmersiveChatPage runtime={readyRuntime} />);
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Rewards' }));

    await waitFor(() => {
      expect(client.sendMessage).toHaveBeenNthCalledWith(2, siteConfig.prompts[2]);
    });
  });

  it('queues a Rewards follow-up until the active turn finishes', async () => {
    sessionStorage.setItem('wayfare:experience-prompt', 'Toronto to Lisbon');
    const view = render(<ImmersiveChatPage runtime={readyRuntime} />);
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledTimes(1));

    assistantStatus = 'streaming';
    view.rerender(<ImmersiveChatPage runtime={readyRuntime} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rewards' }));
    expect(client.sendMessage).toHaveBeenCalledTimes(1);

    assistantStatus = 'ready';
    view.rerender(<ImmersiveChatPage runtime={readyRuntime} />);
    await waitFor(() => {
      expect(client.sendMessage).toHaveBeenNthCalledWith(2, siteConfig.prompts[2]);
    });
  });

  it('opens the compact navigation and keeps focus order aligned with mobile layout', async () => {
    sessionStorage.setItem('wayfare:experience-prompt', 'Toronto to Lisbon');
    render(<ImmersiveChatPage runtime={readyRuntime} />);
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('button', { name: 'Close menu' }))
      .toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Trip navigation' }).className)
      .toContain('navigationOpen');

    const tripRail = screen.getByRole('complementary', { name: 'Your trip' });
    const composer = screen.getByRole('form', { name: 'Continue trip' });
    expect(
      tripRail.compareDocumentPosition(composer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders a safe setup-required state without attempting a session', async () => {
    render(<ImmersiveChatPage runtime={{
      status: 'setup-required',
      message: 'Assistant setup is required.',
    }} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Assistant setup is required.',
    );
    expect(assistantMock.useNoodleAssistant).not.toHaveBeenCalled();
  });
});
