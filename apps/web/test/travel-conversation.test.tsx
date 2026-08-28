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
  within,
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
  fireEvent.submit(screen.getByRole('form', { name: 'Plan a trip' }));
}

function conversationStatus() {
  return within(screen.getByRole('region', { name: 'Travel conversation' }))
    .getByRole('status');
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

  it('focuses the shared travel prompt when Plan a trip is clicked without initializing the assistant', () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);

    fireEvent.click(screen.getByRole('button', { name: 'Plan a trip' }));

    expect(screen.getByRole('textbox', { name: 'Ask about a flight' }))
      .toHaveFocus();
    expect(assistantMock.useNoodleAssistant).not.toHaveBeenCalled();
  });

  it('keeps the travel prompt focused after the menu Plan a trip action closes', async () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);

    const menuTrigger = screen.getByRole('button', { name: 'Open menu' });
    menuTrigger.focus();
    fireEvent.click(menuTrigger);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Travel menu' }))
      .getByRole('button', { name: 'Plan a trip' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Travel menu' }))
        .not.toBeInTheDocument();
    });
    expect(screen.getByRole('textbox', { name: 'Ask about a flight' }))
      .toHaveFocus();
    expect(assistantMock.useNoodleAssistant).not.toHaveBeenCalled();
    expect(client.sendMessage).not.toHaveBeenCalled();
  });

  it('mounts the public client and sends the initial prompt once', async () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('  JFK to Lisbon next month  ');

    await waitFor(() => {
      expect(client.sendMessage).toHaveBeenCalledWith(
        'JFK to Lisbon next month',
      );
    });
    expect(screen.getByRole('heading', { name: 'Plan your flight' }))
      .toBeVisible();
    expect(screen.getByRole('region', { name: 'Travel conversation' }))
      .toHaveClass('travel-conversation-shell');
    expect(screen.getByRole('form', { name: 'Continue trip' }))
      .toHaveClass('travel-composer--conversation');
    expect(screen.queryByText('Built on Noodle Seed · Powered by Nuitee'))
      .not.toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Continue trip' })).toBeVisible();
    expect(screen.getByText(starterConfig.brand.assistantName)).toBeVisible();
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Reset conversation' }))
      .not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'New trip' })).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Ask about a flight' }))
      .toHaveAttribute('placeholder', 'Tell Wayfare what you need…');
    expect(screen.getAllByRole('region', { name: 'Travel conversation' }))
      .toHaveLength(1);
    expect(screen.queryByRole('region', { name: 'Travel workspace' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Flight workspace' }))
      .not.toBeInTheDocument();
    expect(document.querySelector('.travel-journey-workspace'))
      .not.toBeInTheDocument();
    expect(document.querySelector('.travel-journey-canvas'))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Current trip' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Refine this search' }))
      .not.toBeInTheDocument();
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

  it('keeps stable semantic grid slots when trip context and errors are absent', async () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('JFK to Lisbon next month');

    const conversation = await screen.findByRole('region', {
      name: 'Travel conversation',
    });
    const contextSlot = conversation.children.item(1);
    const transcript = within(conversation).getByRole('log', {
      name: 'Conversation transcript',
    }).parentElement;
    const lowerChrome = conversation.children.item(3);
    const composer = within(conversation).getByRole('form', {
      name: 'Continue trip',
    });
    expect(contextSlot).toHaveClass('travel-conversation__context');
    expect(contextSlot).toBeEmptyDOMElement();
    expect(conversation.children.item(2)).toBe(transcript);
    expect(lowerChrome).toHaveClass('travel-conversation__lower-chrome');
    expect(lowerChrome).toContainElement(conversationStatus());
    expect(within(lowerChrome as HTMLElement).queryByRole('alert'))
      .not.toBeInTheDocument();
    expect(conversation.children.item(4)).toBe(composer);
    expect(conversation.children).toHaveLength(5);
  });

  it('keeps errors inside the stable lower-chrome grid slot', async () => {
    assistantMock.useNoodleAssistant.mockImplementation(() => ({
      client,
      messages: [],
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
    }));
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('JFK to Lisbon next month');

    const conversation = await screen.findByRole('region', {
      name: 'Travel conversation',
    });
    const lowerChrome = conversation.children.item(3);
    const alert = within(conversation).getByRole('alert');
    const composer = within(conversation).getByRole('form', {
      name: 'Continue trip',
    });

    expect(conversation.children.item(1)).toHaveClass(
      'travel-conversation__context',
    );
    expect(conversation.children.item(2)).toHaveClass('travel-transcript');
    expect(lowerChrome).toHaveClass('travel-conversation__lower-chrome');
    expect(lowerChrome).toContainElement(conversationStatus());
    expect(lowerChrome).toContainElement(alert);
    expect(conversation.children.item(4)).toBe(composer);
    expect(conversation.children).toHaveLength(5);
  });

  it('uses the typed plan to align the heading, composer, and live brief', async () => {
    assistantMock.useNoodleAssistant.mockImplementation(() => ({
      client,
      messages: [{
        id: 'assistant-plan',
        role: 'assistant',
        parts: [{
          type: 'data-tool-result',
          data: {
            id: 'call-plan',
            tool: 'plan_flight_search',
            result: {
              status: 'planned',
              message: 'Trip details are ready. Search current fares now.',
              origin: 'ISB',
              destination: 'NYC',
              departureDate: '2026-09-18',
              returnDate: '2026-09-27',
              adults: 1,
              cabinClass: 'ECONOMY',
              currency: 'USD',
              country: 'US',
            },
          },
        }],
      }],
      status: 'ready',
      error: undefined,
    }));
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('Islamabad to New York');

    expect(await screen.findByRole('heading', { name: 'ISB to NYC' }))
      .toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Ask about a flight' }))
      .toHaveAttribute('placeholder', 'Adjust the trip or add a preference…');
    const conversation = screen.getByRole('region', { name: 'Travel conversation' });
    const brief = screen.getByRole('region', { name: 'Current trip' });
    const transcript = within(conversation).getByRole('log', {
      name: 'Conversation transcript',
    });
    expect(brief).toHaveTextContent('ISB → NYC');
    expect(conversation).toContainElement(brief);
    expect(brief.compareDocumentPosition(transcript)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Ready to search')).toBeVisible();
  });

  it('keeps typed trip context compact until the traveler expands it', async () => {
    assistantMock.useNoodleAssistant.mockImplementation(() => ({
      client,
      messages: [{
        id: 'assistant-plan-context',
        role: 'assistant',
        parts: [{
          type: 'data-tool-result',
          data: {
            id: 'call-plan-context',
            tool: 'plan_flight_search',
            result: {
              status: 'planned',
              message: 'Trip details are ready. Search current fares now.',
              origin: 'ISB',
              destination: 'FCO',
              departureDate: '2026-08-31',
              returnDate: '2026-09-07',
              adults: 2,
              cabinClass: 'ECONOMY',
              currency: 'USD',
              country: 'US',
            },
          },
        }],
      }],
      status: 'ready',
      error: undefined,
    }));
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('Islamabad to Rome for two');

    const context = await screen.findByRole('region', { name: 'Current trip' });
    expect(within(context).getByText('ISB')).toBeVisible();
    expect(within(context).getByText('FCO')).toBeVisible();
    expect(within(context).getByText('2 adults')).toBeVisible();
    expect(within(context).queryByText('US market')).not.toBeInTheDocument();

    const toggle = within(context).getByRole('button', { name: 'Show trip details' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(context).getByText('US market')).toBeVisible();
  });

  it('omits the trip disclosure control when no secondary facts exist', async () => {
    assistantMock.useNoodleAssistant.mockImplementation(() => ({
      client,
      messages: [{
        id: 'assistant-plan-primary-facts',
        role: 'assistant',
        parts: [{
          type: 'data-tool-result',
          data: {
            id: 'call-plan-primary-facts',
            tool: 'search_flights',
            result: {
              status: 'success',
              searchContext: {
                origin: 'ISB',
                destination: 'FCO',
                departureDate: '2026-08-31',
                adults: 2,
                children: 0,
                infants: 0,
                cabinClass: 'ECONOMY',
              },
            },
          },
        }],
      }],
      status: 'ready',
      error: undefined,
    }));
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('Islamabad to Rome for two');

    const context = await screen.findByRole('region', { name: 'Current trip' });
    expect(within(context).getByText('ISB')).toBeVisible();
    expect(within(context).getByText('FCO')).toBeVisible();
    expect(within(context).getByText('2 adults')).toBeVisible();
    expect(within(context).queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders every linked App inline in chronological conversation order', async () => {
    const firstView = {
      id: 'view-search-first',
      tool: 'search_flights',
      resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
      title: 'Flight results',
      result: { status: 'success' },
    };
    const secondView = { ...firstView, id: 'view-search-second' };
    const unrelatedView = {
      id: 'view-booking-unrelated',
      tool: 'manage_booking',
      resourceUri: 'ui://unknown/manage_booking',
      title: 'Booking manager',
      result: { status: 'success' },
    };
    assistantMock.useNoodleAssistant.mockImplementation(() => ({
      client,
      messages: [{
        id: 'assistant-workspace',
        role: 'assistant',
        parts: [
          {
            type: 'data-tool-result',
            data: {
              id: 'call-plan-workspace',
              tool: 'plan_flight_search',
              result: {
                status: 'planned',
                message: 'Trip details are ready. Search current fares now.',
                origin: 'ISB',
                destination: 'NYC',
                departureDate: '2026-09-18',
                adults: 1,
                cabinClass: 'ECONOMY',
                currency: 'USD',
                country: 'US',
              },
            },
          },
          { type: 'data-view', data: firstView },
          { type: 'data-view', data: unrelatedView },
          { type: 'text', text: 'I refreshed the current choices.' },
          { type: 'data-view', data: secondView },
        ],
      }],
      status: 'ready',
      error: undefined,
    }));
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('Islamabad to New York');

    const conversation = await screen.findByRole('region', {
      name: 'Travel conversation',
    });
    const transcript = within(conversation).getByRole('log', {
      name: 'Conversation transcript',
    });
    const message = within(transcript).getByRole('article', {
      name: 'Assistant message',
    });
    const linkedApps = message.querySelectorAll('noodle-app-view');
    const unavailable = within(message).getByText(
      'This travel view is unavailable.',
    );
    const prose = within(message).getByText('I refreshed the current choices.');
    expect(linkedApps).toHaveLength(2);
    expect(linkedApps[0]?.view).toBe(firstView);
    expect(linkedApps[1]?.view).toBe(secondView);
    expect(linkedApps[0]?.compareDocumentPosition(unavailable)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(unavailable.compareDocumentPosition(prose)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(prose.compareDocumentPosition(linkedApps[1]!)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Travel workspace' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Flight workspace' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Live trip brief' }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Current trip' }))
      .toHaveTextContent('ISB → NYC');
  });

  it('keeps one inline App and composer in chronological keyboard order', async () => {
    const mobileView = {
      id: 'view-mobile-order',
      tool: 'search_flights',
      resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
      title: 'Flight results',
      result: { status: 'success' },
    };
    assistantMock.useNoodleAssistant.mockImplementation(() => ({
      client,
      messages: [{
        id: 'assistant-mobile-order',
        role: 'assistant',
        parts: [{ type: 'data-view', data: mobileView }],
      }],
      status: 'ready',
      error: undefined,
    }));
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('Show current flights');

    const conversation = await screen.findByRole('region', {
      name: 'Travel conversation',
    });
    const transcript = within(conversation).getByRole('log', {
      name: 'Conversation transcript',
    });
    const linkedApp = transcript.querySelector<HTMLElement>('noodle-app-view');
    expect(linkedApp).not.toBeNull();
    if (!linkedApp) return;
    expect(conversation.querySelectorAll('noodle-app-view')).toHaveLength(1);
    linkedApp.tabIndex = 0;
    const composer = screen.getByRole('textbox', { name: 'Ask about a flight' });
    const focusable = Array.from(conversation.querySelectorAll<HTMLElement>(
      'noodle-app-view, textarea, button:not(:disabled)',
    )).filter((element) => element.tabIndex >= 0);
    expect(focusable.indexOf(linkedApp)).toBeLessThan(focusable.indexOf(composer));
  });

  it('bounds a long conversation with the transcript as its only scroll owner', async () => {
    assistantMock.useNoodleAssistant.mockImplementation(() => ({
      client,
      messages: Array.from({ length: 48 }, (_, index) => ({
        id: `assistant-long-${index}`,
        role: 'assistant',
        parts: [{ type: 'text', text: `Flight note ${index + 1}` }],
      })),
      status: 'ready',
      error: undefined,
    }));
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('Review a long itinerary');

    const conversation = await screen.findByRole('region', {
      name: 'Travel conversation',
    });
    const log = within(conversation).getByRole('log', {
      name: 'Conversation transcript',
    });
    const transcript = log.parentElement;
    expect(transcript).not.toBeNull();
    if (!transcript) return;
    expect(within(log).getAllByRole('article')).toHaveLength(48);
    expect(conversation).not.toHaveAttribute('style');
    const composer = within(conversation).getByRole('form', {
      name: 'Continue trip',
    });
    expect(conversation).toContainElement(transcript);
    expect(conversation).toContainElement(composer);
    expect(transcript.compareDocumentPosition(composer)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([
    {
      action: 'Plan a trip to Rome',
      prompt: 'Help me plan a long-weekend flight to Rome for two.',
    },
    {
      action: 'Start with a flexible trip',
      prompt: 'Help me find a trip somewhere warm with flexible dates.',
    },
  ])('starts $action as exactly one conversation', async ({ action, prompt }) => {
    render(<TravelAssistantPage runtime={readyRuntime} />);

    fireEvent.click(screen.getByRole('button', { name: action }));

    await waitFor(() => {
      expect(client.sendMessage).toHaveBeenCalledWith(prompt);
    });
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
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
            resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
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
      name: 'Where will you go next?',
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
      expect(conversationStatus()).toHaveTextContent(
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
      expect(conversationStatus()).toBeEmptyDOMElement();
      expect(screen.getByRole('textbox', { name: 'Ask about a flight' }))
        .toHaveValue('Keep this follow-up for after the stop');
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
    expect(conversationStatus()).toBeEmptyDOMElement();
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
    expect(conversationStatus()).toHaveTextContent(
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
    expect(conversationStatus()).toBeEmptyDOMElement();
    expect(screen.queryByText('Searching')).not.toBeInTheDocument();
    expect(screen.queryByText('No trip started')).not.toBeInTheDocument();

    hookState = { ...hookState, status: 'streaming' };
    view.rerender(<TravelAssistantPage runtime={readyRuntime} />);
    expect(conversationStatus()).toBeEmptyDOMElement();
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
    let hookStatus: 'ready' | 'streaming' = 'ready';
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
        status: hookStatus,
        error: undefined,
      };
    });
    const view = render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('JFK to Lisbon in October');

    expect(await screen.findByRole('region', {
      name: 'Current trip',
    })).toHaveTextContent('SFO → NRT');
    expect(screen.getByRole('region', {
      name: 'Current trip',
    })).not.toHaveTextContent('JFK → LIS');
    expect(screen.getByText('No fares found')).toBeVisible();
    const conversation = screen.getByRole('region', { name: 'Travel conversation' });
    const activityRegion = within(conversation).getByRole('status');
    expect(activityRegion).toBeEmptyDOMElement();
    expect(within(conversation).getAllByRole('status')).toHaveLength(1);

    const refinements = screen.getByRole('group', {
      name: 'Refine this search',
    });
    const nearbyAirports = within(refinements).getByRole('button', {
      name: 'Try nearby airports',
    });
    const changeDates = within(refinements).getByRole('button', {
      name: 'Change dates',
    });
    fireEvent.click(nearbyAirports);
    expect(client.sendMessage).toHaveBeenLastCalledWith(
      'Search nearby airports for this trip.',
    );
    fireEvent.click(changeDates);
    expect(client.sendMessage).toHaveBeenLastCalledWith(
      'Help me change the travel dates.',
    );

    hookStatus = 'streaming';
    view.rerender(<TravelAssistantPage runtime={readyRuntime} />);
    expect(nearbyAirports).toBeDisabled();
    expect(changeDates).toBeDisabled();
    hookStatus = 'ready';
    view.rerender(<TravelAssistantPage runtime={readyRuntime} />);

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
    const progress = within(
      await screen.findByRole('region', { name: 'Current trip' }),
    ).getByLabelText('Trip progress');
    expect(progress).toHaveAttribute('data-phase', 'searching');
    expect(progress.querySelectorAll('[data-complete="true"]')).toHaveLength(2);
    expect(document.body).not.toHaveTextContent('search_flights');
    expect(within(conversation).getAllByRole('status')).toHaveLength(1);

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

    const activityRegion = conversationStatus();
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

    const activityRegion = conversationStatus();
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
    expect(await screen.findByRole('region', {
      name: 'Current trip',
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
      name: 'Where will you go next?',
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
    fireEvent.click(screen.getByRole('button', { name: 'New trip' }));
    submitPrompt('Second trip');

    await waitFor(() => {
      const usedKeys = assistantMock.useNoodleAssistant.mock.calls
        .map(([options]) => options.principalKey);
      expect(usedKeys).toContain(principalKeys[0]);
      expect(usedKeys).toContain(principalKeys[1]);
    });
  });
});
