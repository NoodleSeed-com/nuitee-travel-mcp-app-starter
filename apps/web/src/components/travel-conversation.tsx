'use client';

import { useNoodleAssistant } from '@noodleseed/assistant/react/client';
import { useEffect, useRef, useState } from 'react';
import type { ReadyPublicAssistantRuntime } from '../lib/assistant-config';
import { EMPTY_TRIP, type TripProjection } from '../lib/trip-projection';
import { TravelComposer } from './travel-composer';
import { TravelMessage } from './travel-message';

interface TravelConversationProps {
  readonly runtime: ReadyPublicAssistantRuntime;
  readonly initialPrompt: string;
  readonly onReset: () => void;
  readonly onProjectionChange: (projection: TripProjection) => void;
}

function useResolvedTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      const choice = document.documentElement.dataset.theme;
      setTheme(
        choice === 'dark' || (choice !== 'light' && mediaQuery?.matches)
          ? 'dark'
          : 'light',
      );
    };
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributeFilter: ['data-theme'],
      attributes: true,
    });
    mediaQuery?.addEventListener('change', updateTheme);
    updateTheme();
    return () => {
      observer.disconnect();
      mediaQuery?.removeEventListener('change', updateTheme);
    };
  }, []);

  return theme;
}

export function TravelConversation({
  runtime,
  initialPrompt,
  onReset,
  onProjectionChange,
}: Readonly<TravelConversationProps>) {
  const [principalKey] = useState(() => crypto.randomUUID());
  const { client, messages, status, error } = useNoodleAssistant({
    embedId: runtime.embedId,
    serviceUrl: runtime.serviceUrl,
    principalKey,
    clientContext: () => ({
      locale: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  const initialPromptSentRef = useRef(false);
  const theme = useResolvedTheme();

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active || initialPromptSentRef.current) return;
      initialPromptSentRef.current = true;
      void client.sendMessage(initialPrompt).catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [client, initialPrompt]);

  function resetConversation() {
    onProjectionChange(EMPTY_TRIP);
    onReset();
  }

  function sendFollowUp(prompt: string) {
    void client.sendMessage(prompt).catch(() => undefined);
  }

  return (
    <section className="travel-canvas" aria-label="Travel conversation">
      <div className="travel-conversation">
        <header>
          <h1>Trip conversation</h1>
          <button type="button" onClick={resetConversation}>
            Reset conversation
          </button>
        </header>
        <ol aria-label="Conversation transcript" role="log">
          {messages.map((message) => (
            <li key={message.id}>
              <TravelMessage
                client={client}
                message={message}
                theme={theme}
              />
            </li>
          ))}
        </ol>
        {status !== 'ready' ? (
          <p aria-live="polite" role="status">
            Assistant is responding
          </p>
        ) : null}
        {error ? <p role="alert">{error.message}</p> : null}
        <TravelComposer formLabel="Continue trip" onSubmit={sendFollowUp} />
      </div>
    </section>
  );
}
