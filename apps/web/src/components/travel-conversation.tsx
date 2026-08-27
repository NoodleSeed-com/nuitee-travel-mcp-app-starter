'use client';

import { useNoodleAssistant } from '@noodleseed/assistant/react/client';
import { useEffect, useRef, useState } from 'react';
import type { ReadyPublicAssistantRuntime } from '../lib/assistant-config';
import {
  EMPTY_TRIP,
  projectTrip,
  type TripProjection,
} from '../lib/trip-projection';
import {
  progressForEvent,
  type ToolActivity,
} from '../lib/travel-progress';
import { TravelComposer } from './travel-composer';
import { TravelMessage } from './travel-message';

interface TravelConversationProps {
  readonly runtime: ReadyPublicAssistantRuntime;
  readonly initialPrompt: string;
  readonly onReset: () => void;
  readonly onProjectionChange: (projection: TripProjection) => void;
}

function sameProjection(left: TripProjection, right: TripProjection) {
  return left.phase === right.phase
    && left.origin === right.origin
    && left.destination === right.destination
    && left.departureDate === right.departureDate
    && left.returnDate === right.returnDate
    && left.travelers === right.travelers;
}

function newestActivity(
  activeActivities: ReadonlyMap<string, ToolActivity>,
): ToolActivity | null {
  let newest: ToolActivity | null = null;
  for (const activity of activeActivities.values()) newest = activity;
  return newest;
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
  const publishedProjectionRef = useRef<TripProjection>(EMPTY_TRIP);
  const activeActivitiesRef = useRef(new Map<string, ToolActivity>());
  const [activity, setActivity] = useState<ToolActivity | null>(null);
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

  useEffect(() => {
    const activeActivities = activeActivitiesRef.current;
    activeActivities.clear();
    setActivity(null);
    const unsubscribe = client.subscribe((event) => {
      const progress = progressForEvent(event);
      if (event.event === 'tool_started' && progress) {
        activeActivities.delete(event.data.id);
        activeActivities.set(event.data.id, progress);
        setActivity(progress);
        return;
      }
      if (event.event === 'tool_completed') {
        activeActivities.delete(event.data.id);
        setActivity(newestActivity(activeActivities));
        return;
      }
      if (event.event === 'done' || event.event === 'error') {
        activeActivities.clear();
        setActivity(null);
      }
    });
    return () => {
      activeActivities.clear();
      unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    const projection = projectTrip(messages, activity?.phase);
    if (sameProjection(projection, publishedProjectionRef.current)) return;
    publishedProjectionRef.current = projection;
    onProjectionChange(projection);
  }, [activity?.phase, messages, onProjectionChange]);

  function resetConversation() {
    onProjectionChange(EMPTY_TRIP);
    onReset();
  }

  function sendFollowUp(prompt: string) {
    void client.sendMessage(prompt).catch(() => undefined);
  }

  const statusLabel = activity?.label
    ?? (status !== 'ready' ? 'Assistant is responding' : '');

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
        <p aria-live="polite" role="status">
          {statusLabel}
        </p>
        {error ? <p role="alert">{error.message}</p> : null}
        <TravelComposer formLabel="Continue trip" onSubmit={sendFollowUp} />
      </div>
    </section>
  );
}
