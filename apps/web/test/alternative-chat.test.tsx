import type { AssistantClientEvent } from '@noodleseed/assistant/client';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImmersiveChatPage } from '../src/components/experience/immersive-chat-page';
import { ImmersiveTripRail } from '../src/components/experience/immersive-trip-rail';
import { siteConfig } from '../src/lib/site-config';

const assistantMock = vi.hoisted(() => ({
  useNoodleAssistant: vi.fn(),
}));

vi.mock('@noodleseed/assistant/react/client', () => ({
  useNoodleAssistant: assistantMock.useNoodleAssistant,
}));

vi.mock('@noodleseed/assistant/react', () => ({
  NoodleAppView: () => <div data-testid="noodle-app-view" />,
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
    sendMessage: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn((listener: (event: AssistantClientEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
  };
}

let client = createClient();
let assistantStatus: 'ready' | 'submitted' | 'streaming' = 'ready';

beforeEach(() => {
  sessionStorage.clear();
  client = createClient();
  assistantStatus = 'ready';
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
