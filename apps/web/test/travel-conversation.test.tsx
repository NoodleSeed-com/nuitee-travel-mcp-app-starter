import type {
  AssistantChatError,
  AssistantClientEvent,
} from '@noodleseed/assistant/client';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { starterConfig } from '../../../starter.config';
import { TravelAssistantPage } from '../src/components/travel-assistant-page';

const assistantMock = vi.hoisted(() => ({
  useNoodleAssistant: vi.fn(),
}));

vi.mock('@noodleseed/assistant/react/client', () => ({
  useNoodleAssistant: assistantMock.useNoodleAssistant,
}));

const readyRuntime = {
  status: 'ready' as const,
  embedId: 'pub_travel_test',
  serviceUrl: 'https://assistant.example.com',
};

function createClient() {
  const eventListeners = new Set<(event: AssistantClientEvent) => void>();
  return {
    abort: vi.fn(),
    resetSession: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn((listener: (event: AssistantClientEvent) => void) => {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    }),
    emit(event: AssistantClientEvent) {
      for (const listener of eventListeners) listener(event);
    },
  };
}

function submitPrompt(prompt: string) {
  fireEvent.change(screen.getByRole('textbox', {
    name: 'Ask about a flight',
  }), { target: { value: prompt } });
  fireEvent.submit(screen.getByRole('form', { name: 'Start a trip' }));
}

let client = createClient();
let resizeCallback: ResizeObserverCallback | undefined;
let resizeDisconnect = vi.fn<() => void>();

beforeEach(() => {
  resizeCallback = undefined;
  resizeDisconnect = vi.fn<() => void>();
  vi.stubGlobal('ResizeObserver', class ResizeObserverStub {
    constructor(callback: ResizeObserverCallback) {
      resizeCallback = callback;
    }

    observe() {}

    unobserve() {}

    disconnect() {
      resizeDisconnect();
    }
  });
  client = createClient();
  assistantMock.useNoodleAssistant.mockReset();
  assistantMock.useNoodleAssistant.mockImplementation(() => {
    const activeClient = client;
    useEffect(() => () => {
      activeClient.abort();
      activeClient.resetSession();
    }, [activeClient]);
    return {
      client: activeClient,
      messages: [],
      status: 'ready',
      error: undefined,
    };
  });
});

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('guest travel conversation lifecycle', () => {
  it('does not initialize the assistant before the first submit', () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);

    expect(assistantMock.useNoodleAssistant).not.toHaveBeenCalled();
  });

  it('mounts the public client and sends the initial prompt once', async () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('  JFK to Lisbon next month  ');

    await waitFor(() => {
      expect(client.sendMessage).toHaveBeenCalledWith(
        'JFK to Lisbon next month',
      );
    });
    expect(screen.getByRole('heading', { name: 'Your trip, refined together' }))
      .toBeVisible();
    expect(screen.getByRole('region', { name: 'Travel conversation' }))
      .toHaveClass('travel-conversation-shell');
    expect(screen.getByRole('form', { name: 'Continue trip' }))
      .toHaveClass('travel-composer--conversation');
    expect(screen.getByText('Built on Noodle Seed · Powered by Nuitee'))
      .toBeVisible();
    expect(screen.getByText(starterConfig.brand.assistantName)).toBeVisible();
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
    expect(assistantMock.useNoodleAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        embedId: readyRuntime.embedId,
        serviceUrl: readyRuntime.serviceUrl,
        principalKey: expect.any(String),
      }),
    );

    const options = assistantMock.useNoodleAssistant.mock.calls.at(-1)?.[0];
    expect(options).not.toHaveProperty('context');
    expect(options).not.toHaveProperty('pageContext');
    expect(options.clientContext()).toEqual({
      locale: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    expect(options.clientContext()).not.toHaveProperty('principalKey');
  });

  it('keeps linked App views light when the surrounding document requests dark mode', async () => {
    document.documentElement.dataset.theme = 'light';
    assistantMock.useNoodleAssistant.mockImplementation(() => ({
      client,
      messages: [{
        id: 'assistant-view',
        role: 'assistant',
        parts: [{
          type: 'data-view',
          data: {
            id: 'view-light-only',
            tool: 'search_flights',
            resourceUri: 'ui://nuitee_travel/flight-results',
            title: 'Flight results',
            result: { status: 'success' },
          },
        }],
      }],
      status: 'ready',
      error: undefined,
    }));
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('JFK to Lisbon next month');

    const linkedView = await waitFor(() => {
      const view = document.querySelector('noodle-app-view');
      expect(view).not.toBeNull();
      return view;
    });
    await act(async () => {
      document.documentElement.dataset.theme = 'dark';
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(linkedView?.theme).toBe('light');
  });

  it('sends the first prompt once under StrictMode and client identity changes', async () => {
    const firstClient = client;
    const view = render(
      <StrictMode>
        <TravelAssistantPage runtime={readyRuntime} />
      </StrictMode>,
    );

    submitPrompt('JFK to Lisbon next month');
    await waitFor(() => expect(firstClient.sendMessage).toHaveBeenCalledOnce());

    const replacementClient = createClient();
    client = replacementClient;
    view.rerender(
      <StrictMode>
        <TravelAssistantPage runtime={readyRuntime} />
      </StrictMode>,
    );

    await Promise.resolve();
    expect(firstClient.sendMessage).toHaveBeenCalledTimes(1);
    expect(replacementClient.sendMessage).not.toHaveBeenCalled();
  });

  it('lets the hook dispose replaced and unmounted clients once', async () => {
    const firstClient = client;
    const view = render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('JFK to Lisbon next month');
    await waitFor(() => expect(firstClient.sendMessage).toHaveBeenCalledOnce());

    const replacementClient = createClient();
    client = replacementClient;
    view.rerender(<TravelAssistantPage runtime={readyRuntime} />);

    expect(firstClient.abort).toHaveBeenCalledOnce();
    expect(firstClient.resetSession).toHaveBeenCalledOnce();
    expect(firstClient.sendMessage).toHaveBeenCalledOnce();
    expect(replacementClient.sendMessage).not.toHaveBeenCalled();

    view.unmount();
    await Promise.resolve();
    expect(replacementClient.abort).toHaveBeenCalledOnce();
    expect(replacementClient.resetSession).toHaveBeenCalledOnce();
  });

  it('keeps setup-required submission on the zero state with one alert', () => {
    render(
      <TravelAssistantPage
        runtime={{ status: 'setup-required', message: 'Add the public embed.' }}
      />,
    );

    submitPrompt('JFK to Lisbon next month');

    expect(screen.getByRole('heading', {
      name: 'Tell us where you want to be.',
    })).toBeVisible();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Add the public embed.');
    expect(assistantMock.useNoodleAssistant).not.toHaveBeenCalled();
  });

  it('captures a non-empty follow-up before clearing the composer', async () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('JFK to Lisbon next month');
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledOnce());
    client.sendMessage.mockClear();

    const composer = screen.getByRole('textbox', {
      name: 'Ask about a flight',
    });
    fireEvent.change(composer, {
      target: { value: '  Avoid overnight connections  ' },
    });
    fireEvent.submit(screen.getByRole('form', { name: 'Continue trip' }));

    expect(client.sendMessage).toHaveBeenCalledWith(
      'Avoid overnight connections',
    );
    expect(screen.getByRole('button', { name: 'Continue trip' })).toBeVisible();
    expect(composer).toHaveValue('');
  });

  it.each(['submitted', 'streaming'] as const)(
    'preserves a %s follow-up and stops the active turn without a second send',
    async (busyStatus) => {
      let hookStatus: 'ready' | 'submitted' | 'streaming' = 'ready';
      assistantMock.useNoodleAssistant.mockImplementation(() => {
        const activeClient = client;
        useEffect(() => () => {
          activeClient.abort();
          activeClient.resetSession();
        }, [activeClient]);
        return {
          client: activeClient,
          messages: [],
          status: hookStatus,
          error: undefined,
        };
      });
      const view = render(<TravelAssistantPage runtime={readyRuntime} />);
      submitPrompt('JFK to Lisbon next month');
      await waitFor(() => expect(client.sendMessage).toHaveBeenCalledOnce());
      client.sendMessage.mockClear();
      client.abort.mockClear();

      hookStatus = busyStatus;
      view.rerender(<TravelAssistantPage runtime={readyRuntime} />);
      act(() => {
        client.emit({
          event: 'tool_started',
          data: { id: 'call-search-active', tool: 'search_flights' },
        });
      });
      expect(screen.getByRole('status')).toHaveTextContent(
        'Searching current flights',
      );

      const composer = screen.getByRole('textbox', {
        name: 'Ask about a flight',
      });
      fireEvent.change(composer, {
        target: { value: 'Keep this follow-up for after the stop' },
      });
      const form = screen.getByRole('form', { name: 'Continue trip' });
      const stop = screen.getByRole('button', { name: 'Stop generating' });
      expect(stop).toBeInstanceOf(HTMLButtonElement);
      expect(stop).toHaveAttribute('type', 'button');
      stop.focus();
      expect(stop).toHaveFocus();

      fireEvent.submit(form);
      expect(client.sendMessage).not.toHaveBeenCalled();
      expect(composer).toHaveValue('Keep this follow-up for after the stop');

      fireEvent.click(stop);
      expect(client.abort).toHaveBeenCalledOnce();
      expect(client.resetSession).not.toHaveBeenCalled();
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
      expect(composer).toHaveValue('Keep this follow-up for after the stop');

      hookStatus = 'ready';
      view.rerender(<TravelAssistantPage runtime={readyRuntime} />);
      expect(screen.queryByRole('button', { name: 'Stop generating' }))
        .not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue trip' }))
        .toBeEnabled();

      fireEvent.submit(form);
      expect(client.sendMessage).toHaveBeenCalledOnce();
      expect(client.sendMessage).toHaveBeenCalledWith(
        'Keep this follow-up for after the stop',
      );
      expect(composer).toHaveValue('');
    },
  );

  it('does not announce busy work for a terminal error and keeps raw details private', async () => {
    assistantMock.useNoodleAssistant.mockImplementation(() => ({
      client,
      messages: [],
      status: 'error',
      error: {
        name: 'AssistantClientError',
        message: 'token secret at https://private.example.com/search_flights',
        detail: {
          code: 'turn_failed',
          status: 400,
          retryable: false,
        },
      },
    }));
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('JFK to Lisbon next month');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The travel assistant could not continue',
    );
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(document.body).not.toHaveTextContent(
      /Assistant is responding|token secret|https?:|search_flights/i,
    );
  });

  it('suppresses stale tool activity when hook state becomes terminal without a client event', async () => {
    let hookState: {
      status: 'streaming' | 'error';
      error: AssistantChatError | undefined;
    } = {
      status: 'streaming',
      error: undefined,
    };
    assistantMock.useNoodleAssistant.mockImplementation(() => {
      const activeClient = client;
      useEffect(() => () => {
        activeClient.abort();
        activeClient.resetSession();
      }, [activeClient]);
      return {
        client: activeClient,
        messages: [],
        ...hookState,
      };
    });
    const view = render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('JFK to Lisbon next month');

    act(() => {
      client.emit({
        event: 'tool_started',
        data: { id: 'call-search-stale', tool: 'search_flights' },
      });
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Searching current flights',
    );
    expect(screen.getByText('Searching')).toBeVisible();

    hookState = {
      status: 'error',
      error: {
        name: 'AssistantClientError',
        message: 'terminal turn failure',
        detail: {
          code: 'turn_failed',
          status: 400,
          retryable: false,
        },
      },
    };
    view.rerender(<TravelAssistantPage runtime={readyRuntime} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The travel assistant could not continue',
    );
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByText('Searching')).not.toBeInTheDocument();
    expect(screen.getByText('No trip started')).toBeVisible();

    hookState = { ...hookState, status: 'streaming' };
    view.rerender(<TravelAssistantPage runtime={readyRuntime} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('retries the last message only when the client marks a service error retryable', async () => {
    assistantMock.useNoodleAssistant.mockImplementation(() => ({
      client,
      messages: [],
      status: 'error',
      error: {
        name: 'AssistantClientError',
        message: 'temporary service failure',
        detail: {
          code: 'turn_failed',
          status: 503,
          retryable: true,
        },
      },
    }));
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('JFK to Lisbon next month');
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledOnce());
    client.sendMessage.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(client.sendMessage).toHaveBeenCalledWith('JFK to Lisbon next month');
  });

  it('preserves upward reading, follows near-end growth, and disconnects its observer', async () => {
    const view = render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('JFK to Lisbon next month');
    const transcript = await screen.findByRole('log', {
      name: 'Conversation transcript',
    });
    const viewport = transcript.parentElement;
    expect(viewport).not.toBeNull();
    if (!viewport) return;
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 1_000 },
    });

    viewport.scrollTop = 600;
    fireEvent.scroll(viewport);
    expect(resizeCallback).toBeTypeOf('function');
    resizeCallback?.([], {} as ResizeObserver);
    expect(viewport.scrollTop).toBe(600);

    viewport.scrollTop = 870;
    fireEvent.scroll(viewport);
    resizeCallback?.([], {} as ResizeObserver);
    expect(viewport.scrollTop).toBe(1_000);

    viewport.scrollTop = 600;
    fireEvent.scroll(viewport);
    fireEvent.change(screen.getByRole('textbox', {
      name: 'Ask about a flight',
    }), { target: { value: 'Avoid overnight connections' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Continue trip' }));
    expect(viewport.scrollTop).toBe(1_000);

    view.unmount();
    expect(resizeDisconnect).toHaveBeenCalledOnce();
  });

  it('renders the typed transcript instead of role placeholders', async () => {
    assistantMock.useNoodleAssistant.mockImplementation(() => {
      const activeClient = client;
      useEffect(() => () => {
        activeClient.abort();
        activeClient.resetSession();
      }, [activeClient]);
      return {
        client: activeClient,
        messages: [{
          id: 'assistant-typed-message',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Here are the current choices.' }],
        }],
        status: 'ready',
        error: undefined,
      };
    });
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('JFK to Lisbon next month');

    expect(await screen.findByText('Here are the current choices.'))
      .toBeVisible();
    expect(screen.queryByText('Assistant message')).not.toBeInTheDocument();
  });

  it('projects a later empty route honestly and uses one stable mapped activity region', async () => {
    assistantMock.useNoodleAssistant.mockImplementation(() => {
      const activeClient = client;
      useEffect(() => () => {
        activeClient.abort();
        activeClient.resetSession();
      }, [activeClient]);
      return {
        client: activeClient,
        messages: [
          {
            id: 'assistant-search-result',
            role: 'assistant',
            parts: [{
              type: 'data-tool-result',
              data: {
                id: 'call-search',
                tool: 'search_flights',
                result: {
                  status: 'success',
                  searchContext: {
                    origin: 'JFK',
                    destination: 'LIS',
                    departureDate: '2026-10-12',
                    adults: 1,
                    children: 0,
                    infants: 0,
                  },
                },
              },
            }],
          },
          {
            id: 'assistant-empty-result',
            role: 'assistant',
            parts: [{
              type: 'data-tool-result',
              data: {
                id: 'call-search-empty',
                tool: 'search_flights',
                result: {
                  status: 'empty',
                  searchId: 'search_private-new-route',
                  searchContext: {
                    origin: 'SFO',
                    destination: 'NRT',
                    departureDate: '2026-12-01',
                    adults: 1,
                    children: 0,
                    infants: 0,
                  },
                  itineraries: [],
                },
              },
            }],
          },
        ],
        status: 'ready',
        error: undefined,
      };
    });
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('JFK to Lisbon in October');

    expect(await screen.findByRole('complementary', {
      name: 'Live trip brief',
    })).toHaveTextContent('SFO → NRT');
    expect(screen.getByRole('complementary', {
      name: 'Live trip brief',
    })).not.toHaveTextContent('JFK → LIS');
    expect(screen.getByText('No fares found')).toBeVisible();
    const activityRegion = screen.getByRole('status');
    expect(activityRegion).toBeEmptyDOMElement();
    expect(screen.getAllByRole('status')).toHaveLength(1);

    act(() => {
      client.emit({
        event: 'tool_started',
        data: {
          id: 'call-search-next',
          tool: 'search_flights',
        },
      });
    });

    expect(activityRegion).toHaveTextContent('Searching current flights');
    expect(screen.getByText('Searching')).toBeVisible();
    expect(document.body).not.toHaveTextContent('search_flights');
    expect(screen.getAllByRole('status')).toHaveLength(1);

    act(() => {
      client.emit({
        event: 'tool_completed',
        data: {
          id: 'call-search-next',
          tool: 'search_flights',
          result: { status: 'success' },
        },
      });
    });

    expect(activityRegion).toBeEmptyDOMElement();
    expect(screen.getByText('No fares found')).toBeVisible();
  });

  it('keeps the newest active tool visible when an earlier call completes', async () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('JFK to Lisbon in October');

    const activityRegion = await screen.findByRole('status');
    act(() => {
      client.emit({
        event: 'tool_started',
        data: { id: 'call-search-first', tool: 'search_flights' },
      });
      client.emit({
        event: 'tool_started',
        data: { id: 'call-verify-second', tool: 'verify_flight_offer' },
      });
    });
    expect(activityRegion).toHaveTextContent('Verifying the current fare');

    act(() => {
      client.emit({
        event: 'tool_completed',
        data: {
          id: 'call-search-first',
          tool: 'search_flights',
          result: { status: 'success' },
        },
      });
    });
    expect(activityRegion).toHaveTextContent('Verifying the current fare');
    expect(document.body).not.toHaveTextContent(
      /call-search-first|call-verify-second/,
    );

    act(() => {
      client.emit({
        event: 'tool_completed',
        data: {
          id: 'call-verify-second',
          tool: 'verify_flight_offer',
          result: { status: 'success' },
        },
      });
    });
    expect(activityRegion).toBeEmptyDOMElement();
  });

  it.each<AssistantClientEvent>([
    { event: 'done', data: {} },
    { event: 'error', data: { code: 'provider_error' } },
  ])('clears all concurrent activity on terminal $event', async (terminalEvent) => {
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('JFK to Lisbon in October');

    const activityRegion = await screen.findByRole('status');
    act(() => {
      client.emit({
        event: 'tool_started',
        data: { id: 'call-search-active', tool: 'search_flights' },
      });
      client.emit({
        event: 'tool_started',
        data: { id: 'call-verify-active', tool: 'verify_flight_offer' },
      });
    });
    expect(activityRegion).toHaveTextContent('Verifying the current fare');

    act(() => {
      client.emit(terminalEvent);
    });
    expect(activityRegion).toBeEmptyDOMElement();
  });

  it('aborts and resets the session before returning to a fresh zero state', async () => {
    assistantMock.useNoodleAssistant.mockImplementation(() => {
      const activeClient = client;
      useEffect(() => () => {
        activeClient.abort();
        activeClient.resetSession();
      }, [activeClient]);
      return {
        client: activeClient,
        messages: [{
          id: 'assistant-selected-fare',
          role: 'assistant',
          parts: [
            {
              type: 'data-tool-result',
              data: {
                id: 'call-search-reset',
                tool: 'search_flights',
                result: {
                  status: 'success',
                  searchContext: {
                    origin: 'JFK',
                    destination: 'LIS',
                    departureDate: '2026-10-12',
                    returnDate: '2026-10-18',
                    adults: 2,
                    children: 0,
                    infants: 0,
                  },
                },
              },
            },
            {
              type: 'data-tool-result',
              data: {
                id: 'call-select-reset',
                tool: 'select_flight_offer',
                result: {
                  status: 'selected',
                  selectionId: 'sel_0123456789abcdef0123456789abcdef',
                },
              },
            },
          ],
        }],
        status: 'ready',
        error: undefined,
      };
    });
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('JFK to Lisbon next month');

    expect(await screen.findByRole('log', {
      name: 'Conversation transcript',
    })).toBeVisible();
    expect(await screen.findByRole('complementary', {
      name: 'Live trip brief',
    })).toHaveTextContent('JFK → LIS');
    expect(screen.getByText('Fare selected')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'New trip' }));

    await waitFor(() => {
      expect(client.abort).toHaveBeenCalledOnce();
      expect(client.resetSession).toHaveBeenCalledOnce();
    });
    expect(screen.queryByRole('log', {
      name: 'Conversation transcript',
    })).not.toBeInTheDocument();
    expect(screen.queryByText('No trip started')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', {
      name: 'Tell us where you want to be.',
    })).toBeVisible();
  });

  it('creates a fresh in-memory principal for the next conversation', async () => {
    const principalKeys = [
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
    ] as const;
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce(principalKeys[0])
      .mockReturnValueOnce(principalKeys[1]);
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('First trip');
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', {
      name: 'Reset conversation',
    }));
    submitPrompt('Second trip');

    await waitFor(() => {
      const usedKeys = assistantMock.useNoodleAssistant.mock.calls
        .map(([options]) => options.principalKey);
      expect(usedKeys).toContain(principalKeys[0]);
      expect(usedKeys).toContain(principalKeys[1]);
    });
  });
});
