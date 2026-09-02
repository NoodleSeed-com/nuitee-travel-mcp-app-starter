import type {
  AssistantClient,
  AssistantUIMessage,
  AssistantViewData,
} from '@noodleseed/assistant/client';
import {
  act,
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
  it('renders distinct approved Apps in chronological message-part order', () => {
    const firstView: AssistantViewData = {
      id: 'view-1',
      tool: 'search_flights',
      resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
      title: 'Flight results',
      result: { status: 'success' },
    };
    const secondView: AssistantViewData = {
      id: 'view-2',
      tool: 'open_travel_starter',
      resourceUri: 'ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget',
      title: 'Travel starter',
      result: { status: 'success' },
    };
    const message: AssistantUIMessage = {
      id: 'assistant-1',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'I found current options.' },
        { type: 'data-view', data: firstView },
        { type: 'text', text: 'Choose the trip you want to refine.' },
        { type: 'data-view', data: secondView },
      ],
    };

    renderMessage(client, message);

    const article = screen.getByRole('article', { name: 'Assistant message' });
    const firstText = screen.getByText('I found current options.');
    const secondText = screen.getByText('Choose the trip you want to refine.');
    const apps = article.querySelectorAll('noodle-app-view');
    const surfaces = screen.getAllByTestId('travel-app-surface');

    expect([...article.children]).toEqual([
      firstText,
      surfaces[0],
      secondText,
      surfaces[1],
    ]);
    expect(apps).toHaveLength(2);
    expect(apps[0]?.view).toBe(firstView);
    expect(apps[1]?.view).toBe(secondView);
  });

  it('contains an approved App in one unlabeled visual host without rebuilding it', () => {
    const view: AssistantViewData = {
      id: 'view-contained',
      tool: 'search_flights',
      resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
      title: 'Flight results',
      result: { status: 'success' },
    };
    renderMessage(client, {
      id: 'assistant-contained-view',
      role: 'assistant',
      parts: [{ type: 'data-view', data: view }],
    });

    const surface = screen.getByTestId('travel-app-surface');
    const app = surface.querySelector('noodle-app-view');
    expect(app).not.toBeNull();
    expect(surface).not.toHaveTextContent('Flight results');
    expect(surface.querySelector('iframe[srcdoc]')).toBeNull();
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

  it('accepts a pending confirmation and exposes only allowlisted scalar arguments', async () => {
    renderMessage(client, {
      id: 'assistant-confirm',
      role: 'assistant',
      parts: [
        {
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
        },
        {
          type: 'data-tool-result',
          data: {
            id: 'call-private-result',
            tool: 'select_flight_offer',
            result: { privateProviderResult: 'raw-tool-result-must-not-render' },
          },
        },
      ],
    });

    const confirmation = screen.getByRole('region', {
      name: 'Confirmation request',
    });
    expect(confirmation).toHaveClass('travel-interaction-card');
    expect(screen.getByRole('heading', { name: 'Save this fare?' }))
      .toBeVisible();
    expect(screen.getByText('Origin')).toBeVisible();
    expect(screen.getByText('JFK')).toBeVisible();
    expect(screen.getByText('Adults')).toBeVisible();
    expect(screen.getByText('2')).toBeVisible();
    expect(screen.queryByText(
      /must-not-render|4111111111111111|P1234567|raw-provider-id|raw-tool-result/,
    ))
      .not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeVisible();
    expect(screen.getByRole('button', { name: "Don't proceed" })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(client.respond).toHaveBeenCalledWith('confirm-1', {
        action: 'accept',
      });
    });
  });

  it('hides credential and provider aliases outside the review allowlist', () => {
    const aliases = [
      ['pnr', 'PNR-PRIVATE'],
      ['recordLocator', 'LOCATOR-PRIVATE'],
      ['offerReference', 'OFFER-PRIVATE'],
      ['accessCode', 'ACCESS-PRIVATE'],
      ['bankAccountNumber', 'BANK-PRIVATE'],
      ['travelerEmail', 'TRAVELER-PRIVATE'],
      ['dateOfBirth', 'DOB-PRIVATE'],
    ] as const;

    for (const [alias, privateValue] of aliases) {
      const view = renderMessage(client, {
        id: `assistant-${alias}`,
        role: 'assistant',
        parts: [{
          type: 'data-confirmation',
          data: {
            id: `confirm-${alias}`,
            arguments: { [alias]: privateValue },
            status: 'pending',
          },
        }],
      });

      expect(screen.queryByText(privateValue)).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('sanitizes and bounds confirmation title and description text', () => {
    renderMessage(client, {
      id: 'assistant-bounded-confirmation',
      role: 'assistant',
      parts: [{
        type: 'data-confirmation',
        data: {
          id: 'confirm-bounded-copy',
          title: `Review\u0000   ${'T'.repeat(100)}`,
          description: `Details\u202e   ${'D'.repeat(300)}`,
          status: 'pending',
        },
      }],
    });

    const heading = screen.getByRole('heading');
    const confirmation = screen.getByRole('region', {
      name: 'Confirmation request',
    });
    const description = confirmation.querySelector('p');
    expect(heading).toHaveTextContent(/^Review T/);
    expect(heading.textContent).not.toContain('\u0000');
    expect(heading.textContent?.length).toBeLessThanOrEqual(80);
    expect(description).toHaveTextContent(/^Details D/);
    expect(description?.textContent).not.toContain('\u202e');
    expect(description?.textContent?.length).toBeLessThanOrEqual(240);
  });

  it('locks confirmation actions before an unresolved response settles', () => {
    let resolveResponse: (() => void) | undefined;
    client.respond.mockImplementation(() => new Promise<void>((resolve) => {
      resolveResponse = resolve;
    }));
    renderMessage(client, {
      id: 'assistant-locked-confirmation',
      role: 'assistant',
      parts: [{
        type: 'data-confirmation',
        data: {
          id: 'confirm-locked',
          title: 'Continue?',
          status: 'pending',
        },
      }],
    });

    const accept = screen.getByRole('button', { name: 'Confirm' });
    const decline = screen.getByRole('button', { name: "Don't proceed" });
    act(() => {
      accept.click();
      decline.click();
      accept.click();
    });

    expect(accept).toBeDisabled();
    expect(decline).toBeDisabled();
    expect(client.respond).toHaveBeenCalledOnce();
    expect(client.respond).toHaveBeenCalledWith('confirm-locked', {
      action: 'accept',
    });
    resolveResponse?.();
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

  it('collects an allowlisted trip clarification with native controls', async () => {
    renderMessage(client, {
      id: 'assistant-trip-input',
      role: 'assistant',
      parts: [{
        type: 'data-input-request',
        data: {
          id: 'input-trip',
          message: 'Complete your trip details.',
          requestedSchema: {
            type: 'object',
            properties: {
              departureDate: {
                type: 'string',
                format: 'date',
                title: 'Departure date',
              },
              cabinClass: {
                type: 'string',
                title: 'Cabin',
                enum: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'],
              },
            },
            required: ['departureDate'],
          },
          expiresAt: '2026-08-27T18:00:00.000Z',
          status: 'pending',
        },
      }],
    });

    const inputRequest = screen.getByRole('region', { name: 'Input request' });
    expect(inputRequest).toHaveClass('travel-interaction-card');
    expect(screen.getByText('Complete your trip details.')).toBeVisible();
    expect(screen.getByLabelText('Departure date')).toHaveAttribute('type', 'date');
    expect(screen.getByRole('combobox', { name: 'Cabin' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel request' })).toBeVisible();

    fireEvent.change(screen.getByLabelText('Departure date'), {
      target: { value: '2026-09-11' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Cabin' }), {
      target: { value: 'BUSINESS' },
    });
    fireEvent.submit(screen.getByRole('form', { name: 'Complete trip details' }));

    await waitFor(() => {
      expect(client.respond).toHaveBeenCalledWith('input-trip', {
        action: 'accept',
        content: { departureDate: '2026-09-11', cabinClass: 'BUSINESS' },
      });
    });
  });

  it('renders Noodle date schemas that include field descriptions', () => {
    renderMessage(client, {
      id: 'assistant-noodle-date-input',
      role: 'assistant',
      parts: [{
        type: 'data-input-request',
        data: {
          id: 'input-noodle-date',
          message: 'When would you like to travel?',
          requestedSchema: {
            type: 'object',
            properties: {
              departureDate: {
                type: 'string',
                description: 'Travel date in YYYY-MM-DD format',
                format: 'date',
              },
              returnDate: {
                type: 'string',
                description: 'Travel date in YYYY-MM-DD format',
                format: 'date',
              },
            },
            required: ['departureDate'],
          },
          expiresAt: '2026-09-03T18:00:00.000Z',
          status: 'pending',
        },
      }],
    });

    expect(screen.getByText('When would you like to travel?')).toBeVisible();
    expect(screen.getByLabelText('Departure date')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Return date')).toHaveAttribute('type', 'date');
    expect(screen.queryByText(/cannot collect the requested form/i)).not.toBeInTheDocument();
  });

  it('keeps input cancellation locked after a rejected response', async () => {
    client.respond.mockRejectedValue(new Error('raw service failure'));
    renderMessage(client, {
      id: 'assistant-rejected-input',
      role: 'assistant',
      parts: [{
        type: 'data-input-request',
        data: {
          id: 'input-rejected',
          message: 'Sensitive request text',
          requestedSchema: { type: 'object' },
          expiresAt: '2026-08-27T18:00:00.000Z',
          status: 'pending',
        },
      }],
    });

    const cancel = screen.getByRole('button', { name: 'Cancel request' });
    act(() => {
      cancel.click();
      cancel.click();
    });

    await waitFor(() => expect(client.respond).toHaveBeenCalledOnce());
    expect(cancel).toBeDisabled();
    expect(screen.queryByText(/raw service failure/)).not.toBeInTheDocument();
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
