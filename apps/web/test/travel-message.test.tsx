import type {
  AssistantClient,
  AssistantUIMessage,
} from '@noodleseed/assistant/client';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TravelMessage } from '../src/components/travel-message';

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
    sendMessage: vi.fn<AssistantClient['sendMessage']>()
      .mockResolvedValue(undefined),
    subscribe: vi.fn<AssistantClient['subscribe']>().mockReturnValue(() => {}),
    subscribeChat: vi.fn<AssistantClient['subscribeChat']>()
      .mockReturnValue(() => {}),
    updateContext: vi.fn<AssistantClient['updateContext']>(),
    updateModelContext: vi.fn<AssistantClient['updateModelContext']>(),
    updatePageContext: vi.fn<AssistantClient['updatePageContext']>(),
  } satisfies AssistantClient;
}

function renderMessage(
  client: AssistantClient,
  message: AssistantUIMessage,
) {
  return render(<TravelMessage client={client} message={message} />);
}

let client = createClient();

beforeEach(() => {
  client = createClient();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('typed travel message parts', () => {
  it('renders text and every approved linked App without printing tool JSON', () => {
    const message: AssistantUIMessage = {
      id: 'assistant-1',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'I found current options.' },
        {
          type: 'data-tool-result',
          data: {
            id: 'call-1',
            tool: 'search_flights',
            result: {
              status: 'success',
              searchContext: { origin: 'JFK' },
            },
          },
        },
        {
          type: 'data-view',
          data: {
            id: 'view-1',
            tool: 'search_flights',
            resourceUri: 'ui://nuitee_travel/flight-results',
            title: 'Flight results',
            result: { status: 'success' },
          },
        },
        {
          type: 'data-view',
          data: {
            id: 'view-2',
            tool: 'search_flights',
            resourceUri: 'ui://nuitee_travel/flight-results',
            title: 'Updated flight results',
            result: { status: 'success' },
          },
        },
      ],
    };

    const { container } = renderMessage(client, message);

    expect(screen.getByText('I found current options.')).toBeVisible();
    expect(container.querySelectorAll('noodle-app-view')).toHaveLength(2);
    expect(screen.queryByText(/searchContext/)).not.toBeInTheDocument();
  });

  it('allows internal and HTTPS links with external link isolation', () => {
    renderMessage(client, {
      id: 'assistant-links',
      role: 'assistant',
      parts: [{
        type: 'text',
        text: '[Guide](/guide) and [Airline](https://airline.example/path)',
      }],
    });

    expect(screen.getByRole('link', { name: 'Guide' })).toHaveAttribute(
      'href',
      '/guide',
    );
    expect(screen.getByRole('link', { name: 'Guide' })).not.toHaveAttribute(
      'target',
    );
    expect(screen.getByRole('link', { name: 'Airline' })).toHaveAttribute(
      'href',
      'https://airline.example/path',
    );
    expect(screen.getByRole('link', { name: 'Airline' })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(screen.getByRole('link', { name: 'Airline' })).toHaveAttribute(
      'rel',
      'noreferrer noopener',
    );
  });

  it('renders rejected javascript links as inert text', () => {
    renderMessage(client, {
      id: 'assistant-unsafe-link',
      role: 'assistant',
      parts: [{ type: 'text', text: '[Run this](javascript:alert(1))' }],
    });

    expect(screen.getByText('Run this')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Run this' }))
      .not.toBeInTheDocument();
  });

  it('accepts a pending confirmation and exposes only safe scalar arguments', async () => {
    renderMessage(client, {
      id: 'assistant-confirm',
      role: 'assistant',
      parts: [{
        type: 'data-confirmation',
        data: {
          id: 'confirm-1',
          tool: 'select_flight_offer',
          title: 'Save this fare?',
          description: 'Keep this selection for verification.',
          arguments: {
            origin: 'JFK',
            adults: 2,
            apiKey: 'must-not-render',
            cardNumber: '4111111111111111',
            passportNumber: 'P1234567',
            providerOffer: { id: 'raw-provider-id' },
          },
          status: 'pending',
        },
      }],
    });

    expect(screen.getByRole('heading', { name: 'Save this fare?' }))
      .toBeVisible();
    expect(screen.getByText('Origin')).toBeVisible();
    expect(screen.getByText('JFK')).toBeVisible();
    expect(screen.getByText('Adults')).toBeVisible();
    expect(screen.getByText('2')).toBeVisible();
    expect(screen.queryByText(
      /must-not-render|4111111111111111|P1234567|raw-provider-id/,
    ))
      .not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(client.respond).toHaveBeenCalledWith('confirm-1', {
        action: 'accept',
      });
    });
  });

  it('declines a pending confirmation', async () => {
    renderMessage(client, {
      id: 'assistant-decline',
      role: 'assistant',
      parts: [{
        type: 'data-confirmation',
        data: {
          id: 'confirm-2',
          title: 'Continue?',
          status: 'pending',
        },
      }],
    });

    fireEvent.click(screen.getByRole('button', { name: "Don't proceed" }));

    await waitFor(() => {
      expect(client.respond).toHaveBeenCalledWith('confirm-2', {
        action: 'decline',
      });
    });
  });

  it('fails closed on an input request and lets the traveler cancel it', async () => {
    renderMessage(client, {
      id: 'assistant-input',
      role: 'assistant',
      parts: [{
        type: 'data-input-request',
        data: {
          id: 'input-1',
          message: 'Enter your passport details.',
          requestedSchema: {
            type: 'object',
            properties: { passportNumber: { type: 'string' } },
          },
          expiresAt: '2026-08-27T18:00:00.000Z',
          status: 'pending',
        },
      }],
    });

    expect(screen.getByText(/cannot collect the requested form/i)).toBeVisible();
    expect(screen.queryByText(/passportNumber/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }));

    await waitFor(() => {
      expect(client.respond).toHaveBeenCalledWith('input-1', {
        action: 'cancel',
      });
    });
  });

  it('shows a safe fallback for a supported SDK part the template does not render', () => {
    renderMessage(client, {
      id: 'assistant-file',
      role: 'assistant',
      parts: [{
        type: 'file',
        mediaType: 'application/pdf',
        filename: 'provider-raw.pdf',
        url: 'https://provider.example/raw.pdf',
      }],
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      'This message content is unavailable.',
    );
    expect(screen.queryByText('provider-raw.pdf')).not.toBeInTheDocument();
  });

  it('rejects views outside the travel allowlist', () => {
    renderMessage(client, {
      id: 'assistant-unapproved-view',
      role: 'assistant',
      parts: [{
        type: 'data-view',
        data: {
          id: 'view-unapproved',
          tool: 'manage_booking',
          resourceUri: 'ui://nuitee_travel/manage-booking',
          result: { status: 'success' },
        },
      }],
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      'This travel view is unavailable.',
    );
    expect(document.querySelector('noodle-app-view')).not.toBeInTheDocument();
  });
});
