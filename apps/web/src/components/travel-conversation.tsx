'use client';

import { useNoodleAssistant } from '@noodleseed/assistant/react/client';
import { useEffect, useRef, useState } from 'react';
import { starterConfig } from '../../../../starter.config';
import { presentAssistantError } from '../lib/assistant-error';
import type { ReadyPublicAssistantRuntime } from '../lib/assistant-config';
import { isNearTranscriptEnd } from '../lib/conversation-scroll';
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
  const lastPromptRef = useRef(initialPrompt);
  const publishedProjectionRef = useRef<TripProjection>(EMPTY_TRIP);
  const activeActivitiesRef = useRef(new Map<string, ToolActivity>());
  const transcriptContentRef = useRef<HTMLOListElement>(null);
  const transcriptViewportRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const [activity, setActivity] = useState<ToolActivity | null>(null);
  const [stopRequested, setStopRequested] = useState(false);
  const stopRequestedRef = useRef(false);
  const busy = status === 'submitted' || status === 'streaming';
  const terminal = status === 'error' || Boolean(error);
  const terminalRef = useRef(terminal);
  terminalRef.current = terminal;
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
    const content = transcriptContentRef.current;
    const viewport = transcriptViewportRef.current;
    if (!content || !viewport || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (followLatestRef.current) viewport.scrollTop = viewport.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (busy) return;
    stopRequestedRef.current = false;
    setStopRequested(false);
  }, [busy]);

  useEffect(() => {
    const activeActivities = activeActivitiesRef.current;
    activeActivities.clear();
    setActivity(null);
    const unsubscribe = client.subscribe((event) => {
      if (terminalRef.current || stopRequestedRef.current) {
        activeActivities.clear();
        return;
      }
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
    if (!terminal) return;
    activeActivitiesRef.current.clear();
    setActivity(null);
  }, [terminal]);

  useEffect(() => {
    const projection = projectTrip(
      messages,
      terminal ? undefined : activity?.phase,
    );
    if (sameProjection(projection, publishedProjectionRef.current)) return;
    publishedProjectionRef.current = projection;
    onProjectionChange(projection);
  }, [activity?.phase, messages, onProjectionChange, terminal]);

  function resetConversation() {
    onProjectionChange(EMPTY_TRIP);
    onReset();
  }

  function sendFollowUp(prompt: string) {
    const viewport = transcriptViewportRef.current;
    followLatestRef.current = true;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
    lastPromptRef.current = prompt;
    void client.sendMessage(prompt).catch(() => undefined);
  }

  function stopGenerating() {
    if (stopRequestedRef.current) return;
    stopRequestedRef.current = true;
    activeActivitiesRef.current.clear();
    setActivity(null);
    setStopRequested(true);
    client.abort();
  }

  const statusLabel = terminal
    ? ''
    : stopRequested
      ? ''
      : activity?.label ?? (busy ? 'Assistant is responding' : '');
  const errorPresentation = error ? presentAssistantError(error) : null;

  return (
    <section
      className="travel-canvas"
      aria-busy={busy}
      aria-label="Travel conversation"
      id="travel-canvas"
      tabIndex={-1}
    >
      <div className="travel-conversation">
        <header>
          <div>
            <p className="assistant-identity">
              {starterConfig.brand.assistantName}
            </p>
            <h1>Trip conversation</h1>
          </div>
          <button type="button" onClick={resetConversation}>
            Reset conversation
          </button>
        </header>
        <div
          className="travel-transcript"
          onScroll={(event) => {
            followLatestRef.current = isNearTranscriptEnd(event.currentTarget);
          }}
          ref={transcriptViewportRef}
        >
          <ol
            aria-label="Conversation transcript"
            ref={transcriptContentRef}
            role="log"
          >
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
        </div>
        <p aria-live="polite" role="status">
          {statusLabel}
        </p>
        {errorPresentation ? (
          <section className="assistant-error" role="alert">
            <h2>{errorPresentation.title}</h2>
            <p>{errorPresentation.message}</p>
            {errorPresentation.canRetry ? (
              <button
                type="button"
                onClick={() => sendFollowUp(lastPromptRef.current)}
              >
                Try again
              </button>
            ) : null}
          </section>
        ) : null}
        <TravelComposer
          busy={busy}
          formLabel="Continue trip"
          onStop={stopGenerating}
          onSubmit={sendFollowUp}
          submitLabel="Continue trip"
        />
      </div>
    </section>
  );
}
