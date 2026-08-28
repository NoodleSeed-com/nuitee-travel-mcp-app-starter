'use client';

import { useNoodleAssistant } from '@noodleseed/assistant/react/client';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { starterConfig } from '../../../../starter.config';
import { presentAssistantError } from '../lib/assistant-error';
import type { ReadyPublicAssistantRuntime } from '../lib/assistant-config';
import { isNearTranscriptEnd } from '../lib/conversation-scroll';
import { latestJourneyView } from '../lib/journey-view';
import { projectTrip, type TripProjection } from '../lib/trip-projection';
import {
  progressForEvent,
  type ToolActivity,
} from '../lib/travel-progress';
import { TravelComposer } from './travel-composer';
import { TravelJourneyCanvas } from './travel-journey-canvas';
import { TravelMessage } from './travel-message';
import { TripBrief } from './trip-brief';

interface TravelConversationProps {
  readonly runtime: ReadyPublicAssistantRuntime;
  readonly initialPrompt: string;
}

const MOBILE_WORKSPACE_QUERY = '(max-width: 760px)';

function subscribeToMobileWorkspace(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined;
  }
  const mediaQuery = window.matchMedia(MOBILE_WORKSPACE_QUERY);
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }
  mediaQuery.addListener(onChange);
  return () => mediaQuery.removeListener(onChange);
}

function mobileWorkspaceSnapshot() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(MOBILE_WORKSPACE_QUERY).matches;
}

function conversationCopy(projection: TripProjection) {
  const title = projection.origin && projection.destination
    ? `${projection.origin} to ${projection.destination}`
    : 'Plan your flight';
  switch (projection.phase) {
    case 'planned':
    case 'searching':
      return { title, placeholder: 'Adjust the trip or add a preference…' };
    case 'comparing':
    case 'no-results':
      return { title, placeholder: 'Compare fares or refine this search…' };
    case 'selected':
    case 'verifying':
    case 'verified':
      return { title, placeholder: 'Ask about or verify this fare…' };
    case 'error':
      return { title, placeholder: 'Tell Wayfare what to change…' };
    case 'idle':
      return { title, placeholder: 'Tell Wayfare what you need…' };
  }
}

function newestActivity(
  activeActivities: ReadonlyMap<string, ToolActivity>,
): ToolActivity | null {
  let newest: ToolActivity | null = null;
  for (const activity of activeActivities.values()) newest = activity;
  return newest;
}

export function TravelConversation({
  runtime,
  initialPrompt,
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
  const mobileWorkspace = useSyncExternalStore(
    subscribeToMobileWorkspace,
    mobileWorkspaceSnapshot,
    () => false,
  );

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

  const projection = useMemo(() => projectTrip(
    messages,
    terminal ? undefined : activity?.phase,
  ), [activity?.phase, messages, terminal]);
  const journeyView = useMemo(() => latestJourneyView(messages), [messages]);

  const copy = conversationCopy(projection);

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

  const conversationController = (
    <section
      aria-busy={busy}
      aria-label="Travel conversation"
      className="travel-conversation-shell"
      key="conversation-controller"
      style={mobileWorkspace ? {
        height: '75vh',
        maxHeight: '40rem',
        minHeight: 0,
        overflow: 'hidden',
      } : undefined}
    >
      <header className="travel-conversation__header">
        <div>
          <p className="assistant-identity">
            {starterConfig.brand.assistantName}
          </p>
          <h1>{copy.title}</h1>
        </div>
      </header>
      <div
        className="travel-transcript"
        onScroll={(event) => {
          followLatestRef.current = isNearTranscriptEnd(event.currentTarget);
        }}
        ref={transcriptViewportRef}
        style={mobileWorkspace ? { overflowY: 'auto' } : undefined}
      >
        <ol
          aria-label="Conversation transcript"
          ref={transcriptContentRef}
          role="log"
        >
          {messages.map((message) => (
            <li key={message.id}>
              <TravelMessage client={client} message={message} />
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
        placeholder={copy.placeholder}
        submitLabel="Continue trip"
        variant="conversation"
      />
      <p className="travel-attribution travel-attribution--workspace">
        Built on Noodle Seed · Powered by Nuitee
      </p>
    </section>
  );
  const journeyCanvas = (
    <TravelJourneyCanvas
      client={client}
      key="journey-canvas"
      projection={projection}
      view={journeyView}
    />
  );

  return (
    <section aria-label="Travel workspace" className="travel-journey-workspace">
      <TripBrief projection={projection} />
      <div className="travel-journey-workspace__body">
        {mobileWorkspace
          ? [journeyCanvas, conversationController]
          : [conversationController, journeyCanvas]}
      </div>
    </section>
  );
}
