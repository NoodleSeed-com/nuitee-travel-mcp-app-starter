import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { StrictMode, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  return {
    abort: vi.fn(),
    resetSession: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(undefined),
  };
}

function submitPrompt(prompt: string) {
  fireEvent.change(screen.getByRole('textbox', {
    name: 'Ask about a flight',
  }), { target: { value: prompt } });
  fireEvent.submit(screen.getByRole('form', { name: 'Start a trip' }));
}

let client = createClient();

beforeEach(() => {
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
  vi.restoreAllMocks();
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
      name: 'Where would you like to go?',
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
    expect(composer).toHaveValue('');
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

  it('aborts and resets the session before returning to a fresh zero state', async () => {
    render(<TravelAssistantPage runtime={readyRuntime} />);
    submitPrompt('JFK to Lisbon next month');

    expect(await screen.findByRole('log', {
      name: 'Conversation transcript',
    })).toBeVisible();
    fireEvent.click(screen.getByRole('button', {
      name: 'Reset conversation',
    }));

    await waitFor(() => {
      expect(client.abort).toHaveBeenCalledOnce();
      expect(client.resetSession).toHaveBeenCalledOnce();
    });
    expect(screen.queryByRole('log', {
      name: 'Conversation transcript',
    })).not.toBeInTheDocument();
    expect(screen.getByText('No trip started')).toBeVisible();
    expect(screen.getByRole('heading', {
      name: 'Where would you like to go?',
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
