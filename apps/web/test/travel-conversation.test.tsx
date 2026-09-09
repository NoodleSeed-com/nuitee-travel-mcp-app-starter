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
import { TravelAssistantPage } from '../src/components/travel-assistant-page';
import { siteConfig } from '../src/lib/site-config';

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
    name: 'Ask the travel assistant',
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
  it('does not automatically resend a rejected initial prompt on rerender', async () => {
    client.sendMessage.mockRejectedValueOnce(new Error('Fictional service failure'));
    const view = render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('Find a stay in Lisbon');
    await act(async () => {});
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
    view.rerender(<TravelAssistantPage runtime={readyRuntime} />);
    await act(async () => {});
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('shows hotel card skeletons only while the hotel search is running', async () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('Hotels in Lisbon next week');
    await waitFor(() => expect(client.subscribe).toHaveBeenCalled());
    act(() => client.emit({ event: 'tool_started', data: { id: 'hotel-search', tool: 'search_hotels' } }));
    expect(document.querySelectorAll('.travel-hotel-skeleton')).toHaveLength(3);
    expect(document.querySelector('.travel-hotel-skeletons')).toHaveAttribute('aria-hidden', 'true');
    act(() => client.emit({ event: 'tool_completed', data: { id: 'hotel-search', tool: 'search_hotels', result: { status: 'error' } } }));
    expect(document.querySelector('.travel-hotel-skeletons')).toBeNull();
  });

  it('removes the hotel skeleton when its view arrives before tool completion', async () => {
    assistantMock.useNoodleAssistant.mockReturnValue({ client, messages: [], status: 'streaming' });
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('Hotels in Lisbon next week');
    await waitFor(() => expect(client.subscribe).toHaveBeenCalled());
    act(() => client.emit({ event: 'tool_started', data: { id: 'hotels-1', tool: 'search_hotels' } }));
    expect(document.querySelectorAll('.travel-hotel-skeleton')).toHaveLength(3);
    const view = { id: 'hotels-1', tool: 'search_hotels', resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_hotels_widget', result: { status: 'success' } };
    // A historical view or a rejected tool/resource pair cannot finish this search.
    act(() => client.emit({ event: 'view_available', data: { ...view, id: 'older-hotels' } }));
    act(() => client.emit({ event: 'view_available', data: { ...view, resourceUri: 'ui://unknown/widget' } }));
    expect(document.querySelectorAll('.travel-hotel-skeleton')).toHaveLength(3);
    act(() => client.emit({ event: 'view_available', data: view }));
    expect(document.querySelector('.travel-hotel-skeletons')).toBeNull();
    expect(screen.queryByText('Finding stays…')).toBeNull();
    expect(conversationStatus()).toHaveTextContent('Thinking…');
    expect(screen.getByRole('region', { name: 'Travel conversation' })).toHaveAttribute('aria-busy', 'true');

    // A second search has its own loading lifecycle; the late first completion
    // must not hide its skeleton, nor must another tool's result.
    act(() => client.emit({ event: 'tool_started', data: { id: 'hotels-2', tool: 'search_hotels' } }));
    act(() => client.emit({ event: 'tool_completed', data: { id: 'hotels-1', tool: 'search_hotels', result: {} } }));
    act(() => client.emit({ event: 'view_available', data: { id: 'flights-1', tool: 'search_flights', resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget', result: {} } }));
    expect(document.querySelectorAll('.travel-hotel-skeleton')).toHaveLength(3);
    act(() => client.emit({ event: 'view_available', data: { ...view, id: 'hotels-2', result: { status: 'error' } } }));
    expect(document.querySelector('.travel-hotel-skeletons')).toBeNull();
  });
  it('does not initialize the assistant before the first submit', () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);

    expect(assistantMock.useNoodleAssistant).not.toHaveBeenCalled();
  });

  it('places a concise response status between the traveler and assistant messages', async () => {
    assistantMock.useNoodleAssistant.mockImplementation(() => ({
      client,
      messages: [{
        id: 'traveler-turn',
        role: 'user',
        parts: [{ type: 'text', text: 'JFK to Tokyo next month' }],
      }, {
        id: 'assistant-turn',
        role: 'assistant',
        parts: [{ type: 'text', text: 'I found a few routes.' }],
      }],
      status: 'streaming',
      error: undefined,
    }));
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('JFK to Tokyo next month');

    const activity = await screen.findByText('Thinking…');
    const travelerMessage = screen.getByRole('article', { name: 'Traveler message' });
    const assistantMessage = screen.getByRole('article', { name: 'Assistant message' });
    expect(activity).toHaveClass('text-shimmer');
    expect(conversationStatus()).toHaveClass('travel-conversation__activity-status');
    expect(travelerMessage.compareDocumentPosition(activity))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(activity.compareDocumentPosition(assistantMessage))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('focuses the shared travel prompt from the menu without initializing the assistant', () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Travel menu' }))
      .getByRole('button', { name: 'Plan a trip' }));

    expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
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
    expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
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
    expect(screen.getByRole('heading', { name: 'Plan your trip' }))
      .toBeVisible();
    expect(screen.getByRole('region', { name: 'Travel conversation' }))
      .toHaveClass('travel-conversation-shell');
    expect(screen.getByRole('form', { name: 'Continue trip' }))
      .toHaveClass('travel-composer--conversation');
    expect(screen.queryByText('Built on Noodle Seed · Powered by Nuitee'))
      .not.toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Continue trip' })).toBeVisible();
    expect(screen.getByText(siteConfig.brand.assistantName)).toBeVisible();
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Reset conversation' }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New trip' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
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
    expect(options.pageContext()).toEqual({
      travelCountry: 'US',
      travelCurrency: 'USD',
      travelDefaultSource: 'fallback',
    });
    expect(JSON.stringify(options.pageContext())).not.toMatch(
      /latitude|longitude|accuracy|permission/i,
    );
    expect(options.clientContext()).toEqual({
      locale: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    expect(options.clientContext()).not.toHaveProperty('principalKey');
  });

  it('shows the submitted trip and response progress before the public session is ready', async () => {
    client.sendMessage.mockImplementation(() => new Promise<void>(() => {}));
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt('JFK to Tokyo next month');

    const conversation = screen.getByRole('region', {
      name: 'Travel conversation',
    });
    expect(within(conversation).getByRole('article', {
      name: 'Traveler message',
    })).toHaveTextContent('JFK to Tokyo next month');
    expect(within(conversation).getByRole('status')).toHaveTextContent(
      'Thinking…',
    );
    expect(conversation).toHaveAttribute('aria-busy', 'true');
    expect(within(conversation).getByRole('form', { name: 'Continue trip' })
      .closest('[data-wayfare-composer-beam="true"]'))
      .toHaveAttribute('data-composer-state', 'busy');
  });

  it('recomputes user-selected currency in untrusted page context', async () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Currency' }));
    fireEvent.click(screen.getByRole('option', { name: 'EUR European Union' }));
    submitPrompt('Islamabad to Rome next weekend');

    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledOnce());
    let options = assistantMock.useNoodleAssistant.mock.calls.at(-1)?.[0];
    expect(options.pageContext()).toEqual({
      travelCountry: 'US',
      travelCurrency: 'EUR',
      travelDefaultSource: 'fallback',
    });

    fireEvent.click(screen.getByRole('combobox', { name: 'Currency' }));
    fireEvent.click(screen.getByRole('option', { name: 'GBP United Kingdom' }));
    options = assistantMock.useNoodleAssistant.mock.calls.at(-1)?.[0];
    expect(options.pageContext()).toEqual({
      travelCountry: 'US',
      travelCurrency: 'GBP',
      travelDefaultSource: 'fallback',
    });
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
    expect(transcript).toContainElement(conversationStatus());
    expect(lowerChrome).not.toContainElement(conversationStatus());
    expect(within(lowerChrome as HTMLElement).queryByRole('alert'))
      .not.toBeInTheDocument();
    expect(conversation.children.item(4)).toBe(
      composer.closest('[data-wayfare-composer-beam="true"]'),
    );
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
    expect(conversation.children.item(2)).toContainElement(conversationStatus());
    expect(lowerChrome).not.toContainElement(conversationStatus());
    expect(lowerChrome).toContainElement(alert);
    expect(conversation.children.item(4)).toBe(
      composer.closest('[data-wayfare-composer-beam="true"]'),
    );
    expect(conversation.children).toHaveLength(5);
  });

  it('uses the typed plan to align the heading and composer without a premature summary', async () => {
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
    expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
      .toHaveAttribute('placeholder', 'Adjust the trip or add a preference…');
    expect(screen.queryByRole('region', { name: 'Current trip' }))
      .not.toBeInTheDocument();
    expect(screen.queryByText('Ready to search')).not.toBeInTheDocument();
  });

  it('keeps typed trip context compact until the traveler expands it', async () => {
    assistantMock.useNoodleAssistant.mockImplementation(() => ({
      client,
      messages: [{
        id: 'assistant-plan-context',
        role: 'assistant',
        parts: [
          {
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
          },
          {
            type: 'data-tool-result',
            data: {
              id: 'call-select-context',
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
        parts: [
          {
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
          },
          {
            type: 'data-tool-result',
            data: {
              id: 'call-select-primary-facts',
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
    expect(screen.queryByRole('region', { name: 'Current trip' }))
      .not.toBeInTheDocument();
  });

  it('collapses duplicate failed search Apps and preserves an in-conversation recovery path', async () => {
    const failedView = {
      id: 'view-search-failed-first',
      tool: 'search_flights',
      resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
      title: 'Flight results',
      result: {
        status: 'error',
        error: { code: 'invalid_request', retryable: false },
      },
    };
    assistantMock.useNoodleAssistant.mockImplementation(() => ({
      client,
      messages: [{
        id: 'assistant-failed-search',
        role: 'assistant',
        parts: [
          { type: 'data-view', data: failedView },
          { type: 'data-view', data: { ...failedView, id: 'view-search-failed-second' } },
          {
            type: 'data-tool-result',
            data: {
              id: 'call-search-failed',
              tool: 'search_flights',
              result: {
                status: 'error',
                message: 'The request needs different trip details.',
                fallback: 'Adjust the trip and search again.',
                itineraries: [],
                error: { code: 'invalid_request', retryable: false },
              },
            },
          },
        ],
      }],
      status: 'error',
      error: {
        name: 'AssistantClientError',
        message: 'terminal turn failure',
        detail: { code: 'turn_failed', status: 400, retryable: false },
      },
    }));
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('Toronto to Lisbon on September 15');

    const conversation = await screen.findByRole('region', {
      name: 'Travel conversation',
    });
    expect(conversation.querySelectorAll('noodle-app-view')).toHaveLength(1);
    expect(within(conversation).queryByText(
      'The travel assistant could not continue',
    )).not.toBeInTheDocument();
    expect(within(conversation).getByRole('group', {
      name: 'Recover flight search',
    })).toBeVisible();
    expect(within(conversation).getByRole('textbox', {
      name: 'Ask the travel assistant',
    })).toBeEnabled();
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
    const composer = screen.getByRole('textbox', { name: 'Ask the travel assistant' });
    const focusable = Array.from(conversation.querySelectorAll<HTMLElement>(
      'noodle-app-view, textarea, button:not(:disabled)',
    )).filter((element) => element.tabIndex >= 0);
    expect(focusable.indexOf(linkedApp)).toBeLessThan(focusable.indexOf(composer));
  });

  it('keeps a long conversation in document flow with the page as scroll owner', async () => {
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
    expect(conversation).toHaveAttribute('data-scroll-owner', 'page');
    expect(transcript).toHaveAttribute('data-scroll-owner', 'page');
    const composer = within(conversation).getByRole('form', {
      name: 'Continue trip',
    });
    expect(conversation).toContainElement(transcript);
    expect(conversation).toContainElement(composer);
    expect(transcript.compareDocumentPosition(composer)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([
    'Help me plan a long-weekend flight to Rome for two.',
    'Help me build a trip somewhere warm with flexible dates and a hotel.',
  ])('starts the typed request as exactly one conversation: %s', async (prompt) => {
    render(<TravelAssistantPage runtime={readyRuntime} />);

    submitPrompt(prompt);

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
      name: 'Tell us the trip you have in mind',
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
      name: 'Ask the travel assistant',
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
      expect(conversationStatus()).toHaveTextContent('Thinking…');

      const composer = screen.getByRole('textbox', {
        name: 'Ask the travel assistant',
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
      expect(screen.getByRole('textbox', { name: 'Ask the travel assistant' }))
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
    expect(conversationStatus()).toHaveTextContent('Thinking…');
    expect(screen.queryByText('Searching')).not.toBeInTheDocument();

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

  it('follows a widget-originated traveler turn but does not pull the reader down for assistant-only updates', async () => {
    let messages: Array<{ id: string; role: 'user' | 'assistant'; parts: Array<{ type: 'text'; text: string }> }> = [
      { id: 'first-user', role: 'user', parts: [{ type: 'text', text: 'Plan Lisbon' }] },
      { id: 'first-answer', role: 'assistant', parts: [{ type: 'text', text: 'Your trip widget' }] },
    ];
    assistantMock.useNoodleAssistant.mockImplementation(() => ({ client, messages, status: 'ready', error: undefined }));
    const view = render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('Plan Lisbon');
    const end = await screen.findByTestId('conversation-end');
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(100);
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(200);
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000);
    fireEvent.scroll(window);
    messages = [...messages, { id: 'widget-follow-up', role: 'user', parts: [{ type: 'text', text: 'Find flights to Lisbon' }] }];
    view.rerender(<TravelAssistantPage runtime={readyRuntime} />);
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 2000, behavior: 'smooth' }));
    fireEvent.wheel(window, { deltaY: -100 });
    scrollTo.mockClear();
    fireEvent.scroll(window);
    messages = [...messages, { id: 'second-answer', role: 'assistant', parts: [{ type: 'text', text: 'Where are you flying from?' }] }];
    view.rerender(<TravelAssistantPage runtime={readyRuntime} />);
    act(() => resizeCallback?.([], {} as ResizeObserver));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('offers a jump to latest while reading above new content and resumes following on click', async () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('Plan Lisbon');
    const end = await screen.findByTestId('conversation-end');
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    let scrollY = 200;
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(100);
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY);
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000);
    fireEvent.scroll(window);
    act(() => resizeCallback?.([], {} as ResizeObserver));
    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Jump to latest message' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 2000, behavior: 'smooth' });
    expect(screen.getByRole('button', { name: 'Jump to latest message' })).toHaveAttribute('data-loading', 'true');
    expect(end).toHaveFocus();
    // Intermediate animation events and streaming resizes must not cancel or
    // restart the smooth movement before its destination is reached.
    scrollY = 900;
    fireEvent.scroll(window);
    act(() => resizeCallback?.([], {} as ResizeObserver));
    expect(scrollTo).toHaveBeenCalledOnce();
    scrollY = 1900;
    fireEvent.scroll(window);
    fireEvent(window, new Event('scrollend'));
    expect(screen.queryByRole('button', { name: 'Jump to latest message' })).not.toBeInTheDocument();
    act(() => resizeCallback?.([], {} as ResizeObserver));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 2000, behavior: 'instant' });
    scrollY = 200;
    fireEvent.resize(window);
    expect(screen.getByRole('button', { name: 'Jump to latest message' })).toBeVisible();
  });

  it('preserves upward reading, follows near-end growth, and disconnects its observer', async () => {
    const view = render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('JFK to Lisbon next month');
    const end = await screen.findByTestId('conversation-end');
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    let scrollY = 600;
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(100);
    vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY);
    vi.spyOn(document.documentElement, 'scrollHeight', 'get')
      .mockReturnValue(1_000);

    fireEvent.scroll(window);
    expect(resizeCallback).toBeTypeOf('function');
    resizeCallback?.([], {} as ResizeObserver);
    expect(scrollTo).not.toHaveBeenCalled();

    scrollY = 870;
    fireEvent.scroll(window);
    resizeCallback?.([], {} as ResizeObserver);
    expect(scrollTo).toHaveBeenCalledOnce();

    scrollTo.mockClear();
    scrollY = 600;
    fireEvent.scroll(window);
    fireEvent.change(screen.getByRole('textbox', {
      name: 'Ask the travel assistant',
    }), { target: { value: 'Avoid overnight connections' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Continue trip' }));
    expect(scrollTo).toHaveBeenCalledOnce();

    view.unmount();
    expect(resizeDisconnect).toHaveBeenCalledOnce();
  });

  it('uses an immediate jump for reduced motion, with no animation lock', async () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('Plan Lisbon');
    await screen.findByTestId('conversation-end');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(100);
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(200);
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000);
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole('button', { name: 'Jump to latest message' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 2000, behavior: 'instant' });
    expect(screen.getByRole('button', { name: 'Jump to latest message' })).toHaveAttribute('data-loading', 'false');
  });

  it.each(['reply', 'error', 'stop'] as const)('clears follow-up loading on %s and keeps the jump usable while waiting', async finish => {
    let messages = [
      { id: 'first-user', role: 'user', parts: [{ type: 'text', text: 'Plan Lisbon' }] },
      { id: 'first-answer', role: 'assistant', parts: [{ type: 'text', text: 'Your previous plan' }] },
      { id: 'follow-up', role: 'user', parts: [{ type: 'text', text: 'Find flights' }] },
    ];
    let status = 'streaming';
    assistantMock.useNoodleAssistant.mockImplementation(() => ({ client, messages, status }));
    const view = render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('Plan Lisbon');
    await screen.findByTestId('conversation-end');
    const jump = screen.getByRole('button', { name: 'Jump to latest message' });
    expect(jump).toHaveAttribute('data-loading', 'true');
    expect(jump).toBeEnabled();
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(100);
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(200);
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000);
    fireEvent.scroll(window);
    if (finish === 'reply') {
      messages = [...messages, { id: 'reply', role: 'assistant', parts: [{ type: 'text', text: 'Which airport?' }] }];
    } else if (finish === 'error') {
      status = 'error';
    } else {
      fireEvent.click(screen.getByRole('button', { name: 'Stop generating' }));
    }
    view.rerender(<TravelAssistantPage runtime={readyRuntime} />);
    expect(jump).toHaveAttribute('data-loading', 'false');
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

    expect(screen.queryByRole('region', { name: 'Current trip' }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'SFO to NRT' })).toBeVisible();
    expect(screen.queryByText('No fares found')).not.toBeInTheDocument();
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

    expect(activityRegion).toHaveTextContent('Thinking…');
    expect(screen.queryByText('Searching')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Current trip' }))
      .not.toBeInTheDocument();
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
    expect(screen.queryByText('No fares found')).not.toBeInTheDocument();
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
    expect(activityRegion).toHaveTextContent('Thinking…');

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
    expect(activityRegion).toHaveTextContent('Thinking…');
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
    expect(activityRegion).toHaveTextContent('Thinking…');

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
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Travel menu' }))
      .getByRole('button', { name: 'New trip' }));

    await waitFor(() => {
      expect(client.abort).toHaveBeenCalledOnce();
      expect(client.resetSession).toHaveBeenCalledOnce();
    });
    expect(screen.queryByRole('log', {
      name: 'Conversation transcript',
    })).not.toBeInTheDocument();
    expect(screen.queryByText('No trip started')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', {
      name: 'Tell us the trip you have in mind',
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
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Travel menu' }))
      .getByRole('button', { name: 'New trip' }));
    submitPrompt('Second trip');

    await waitFor(() => {
      const usedKeys = assistantMock.useNoodleAssistant.mock.calls
        .map(([options]) => options.principalKey);
      expect(usedKeys).toContain(principalKeys[0]);
      expect(usedKeys).toContain(principalKeys[1]);
    });
  });
});
