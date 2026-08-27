'use client';

import { useNoodleAssistant } from '@noodleseed/assistant/react/client';
import { useEffect, useRef, useState } from 'react';
import type { ReadyPublicAssistantRuntime } from '../lib/assistant-config';
import { EMPTY_TRIP, type TripProjection } from '../lib/trip-projection';
import { TravelComposer } from './travel-composer';

interface TravelConversationProps {
  readonly runtime: ReadyPublicAssistantRuntime;
  readonly initialPrompt: string;
  readonly onReset: () => void;
  readonly onProjectionChange: (projection: TripProjection) => void;
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
  const clientRef = useRef(client);
  const projectionChangeRef = useRef(onProjectionChange);
  const disposedClientsRef = useRef(new WeakSet<object>());
  const mountedRef = useRef(false);
  const initialPromptSentRef = useRef(false);
  clientRef.current = client;
  projectionChangeRef.current = onProjectionChange;

  function disposeClient() {
    const activeClient = clientRef.current;
    if (disposedClientsRef.current.has(activeClient)) return;
    disposedClientsRef.current.add(activeClient);
    try {
      activeClient.abort();
    } catch {
      // Reset still needs to clear local session state when abort fails.
    }
    try {
      activeClient.resetSession();
    } catch {
      // The host reset remains fail-closed even if SDK cleanup has failed.
    }
    projectionChangeRef.current(EMPTY_TRIP);
  }

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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      queueMicrotask(() => {
        if (!mountedRef.current) disposeClient();
      });
    };
  }, []);

  function resetConversation() {
    disposeClient();
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
              {message.role === 'user' ? 'Traveler message' : 'Assistant message'}
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
