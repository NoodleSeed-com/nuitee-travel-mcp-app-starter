'use client';

import { useNoodleAssistant } from '@noodleseed/assistant/react/client';
import type { AssistantUIMessage } from '@noodleseed/assistant/client';
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { siteConfig } from '../lib/site-config';
import { presentAssistantError } from '../lib/assistant-error';
import type { ReadyPublicAssistantRuntime } from '../lib/assistant-config';
import { isNearTranscriptEnd } from '../lib/conversation-scroll';
import {
  toTravelPageContext,
  type TravelDefaults,
} from '../lib/travel-defaults';
import { projectTrip, type TripProjection } from '../lib/trip-projection';
import {
  progressForEvent,
  type ToolActivity,
} from '../lib/travel-progress';
import { TravelComposer } from './travel-composer';
import { TextShimmer } from './ui/text-shimmer';
import { TravelMessage } from './travel-message';
import { TripBrief } from './trip-brief';
import {
  ImmersiveConversationSkeleton,
  ImmersiveTripRail,
} from './experience/immersive-trip-rail';

interface TravelConversationProps {
  readonly appearance?: 'standard' | 'immersive';
  readonly className?: string;
  readonly defaults: TravelDefaults;
  readonly runtime: ReadyPublicAssistantRuntime;
  readonly initialPrompt: string;
  readonly onInitialPromptAccepted?: () => void;
  readonly onNewTrip?: () => void;
  readonly promptRequest?: {
    readonly id: number;
    readonly prompt: string;
  } | null;
}

function conversationCopy(projection: TripProjection) {
  if (projection.focus === 'stays') {
    return {
      title: projection.stayDestination ? `Stay in ${projection.stayDestination}` : 'Compare stays',
      placeholder: projection.phase === 'stay-selected'
        ? 'Review the trip or change the stay…'
        : 'Refine the destination, dates, or rooms…',
    };
  }
  if (projection.focus === 'rewards') {
    return { title: 'Illustrative rewards', placeholder: 'Ask about the tier or benefits…' };
  }
  if (projection.focus === 'insurance') {
    return {
      title: 'Illustrative travel protection',
      placeholder: 'Adjust the trip details or compare the concepts…',
    };
  }
  if (projection.focus === 'trip') {
    return { title: 'Your travel plan', placeholder: 'Adjust a flight or stay…' };
  }
  const title = projection.origin && projection.destination
    ? `${projection.origin} to ${projection.destination}`
    : 'Plan your trip';
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
    case 'comparing-stays':
    case 'stay-selected':
    case 'rewards':
    case 'insurance':
    case 'trip-review':
      return { title, placeholder: 'Tell Wayfare what you need…' };
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

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function failedViewKey(part: AssistantUIMessage['parts'][number]) {
  if (part.type !== 'data-view') return null;
  const result = record(part.data.result);
  const error = record(result?.error);
  if (result?.status !== 'error' || typeof error?.code !== 'string') return null;
  return `${part.data.tool}:${part.data.resourceUri}:${error.code}`;
}

function visibleConversationMessages(
  messages: readonly AssistantUIMessage[],
): readonly AssistantUIMessage[] {
  const failedViews = new Set<string>();
  const visible: AssistantUIMessage[] = [];

  for (const message of messages) {
    if (message.role === 'user') failedViews.clear();
    const parts = message.parts.filter((part) => {
      const key = failedViewKey(part);
      if (!key) return true;
      if (failedViews.has(key)) return false;
      failedViews.add(key);
      return true;
    });
    if (parts.length > 0) visible.push({ ...message, parts });
  }
  return visible;
}

function currentTurnHasToolError(messages: readonly AssistantUIMessage[]) {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];
    if (!message || message.role === 'user') break;
    for (const part of message.parts) {
      if (failedViewKey(part)) return true;
      if (part.type !== 'data-tool-result') continue;
      if (record(part.data.result)?.status === 'error') return true;
    }
  }
  return false;
}

export function TravelConversation({
  appearance = 'standard',
  className,
  defaults,
  runtime,
  initialPrompt,
  onInitialPromptAccepted,
  onNewTrip,
  promptRequest,
}: Readonly<TravelConversationProps>) {
  const durableInitialPrompt = Boolean(onInitialPromptAccepted);
  const [principalKey] = useState(() => crypto.randomUUID());
  const { client, messages, status, error } = useNoodleAssistant({
    embedId: runtime.embedId,
    serviceUrl: runtime.serviceUrl,
    principalKey,
    clientContext: () => ({
      locale: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
    pageContext: () => toTravelPageContext(defaults),
  });
  const initialPromptSendingRef = useRef(false);
  const initialPromptAcceptedRef = useRef(false);
  const onInitialPromptAcceptedRef = useRef(onInitialPromptAccepted);
  const promptRequestIdRef = useRef<number | null>(null);
  const lastPromptRef = useRef(initialPrompt);
  const activeActivitiesRef = useRef(new Map<string, ToolActivity>());
  const transcriptContentRef = useRef<HTMLOListElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const followLatestRef = useRef(true);
  const [activity, setActivity] = useState<ToolActivity | null>(null);
  const [initialPromptState, setInitialPromptState] = useState<
    'pending' | 'sending' | 'failed' | 'sent'
  >('pending');
  const [stopRequested, setStopRequested] = useState(false);
  const stopRequestedRef = useRef(false);
  const busy = status === 'submitted' || status === 'streaming';
  const terminal = status === 'error' || Boolean(error);
  const terminalRef = useRef(terminal);
  terminalRef.current = terminal;
  onInitialPromptAcceptedRef.current = onInitialPromptAccepted;

  useEffect(() => {
    if (!durableInitialPrompt) {
      let active = true;
      queueMicrotask(() => {
        if (
          !active
          || initialPromptSendingRef.current
          || initialPromptAcceptedRef.current
          || stopRequestedRef.current
        ) return;
        initialPromptSendingRef.current = true;
        setInitialPromptState('sending');
        lastPromptRef.current = initialPrompt;
        followLatestRef.current = true;
        void client.sendMessage(initialPrompt).then(() => {
          initialPromptAcceptedRef.current = true;
          initialPromptSendingRef.current = false;
          setInitialPromptState('sent');
        }).catch(() => {
          initialPromptSendingRef.current = false;
          setInitialPromptState('failed');
        });
      });
      return () => {
        active = false;
      };
    }

    if (
      status !== 'ready'
      || initialPromptState !== 'pending'
      || initialPromptSendingRef.current
      || initialPromptAcceptedRef.current
    ) return;

    initialPromptSendingRef.current = true;
    setInitialPromptState('sending');
    lastPromptRef.current = initialPrompt;
    followLatestRef.current = true;
    void client.sendMessage(initialPrompt).then(() => {
      initialPromptAcceptedRef.current = true;
      initialPromptSendingRef.current = false;
      setInitialPromptState('sent');
      onInitialPromptAcceptedRef.current?.();
    }).catch(() => {
      initialPromptSendingRef.current = false;
      setInitialPromptState('failed');
    });
  }, [client, durableInitialPrompt, initialPrompt, initialPromptState, status]);

  useEffect(() => {
    if (
      status !== 'ready'
      || !promptRequest
      || promptRequestIdRef.current === promptRequest.id
    ) return;
    promptRequestIdRef.current = promptRequest.id;
    lastPromptRef.current = promptRequest.prompt;
    followLatestRef.current = true;
    void client.sendMessage(promptRequest.prompt).catch(() => undefined);
  }, [client, promptRequest, status]);

  useEffect(() => {
    const content = transcriptContentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (followLatestRef.current) {
        conversationEndRef.current?.scrollIntoView?.({ block: 'end' });
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateFollowState = () => {
      followLatestRef.current = isNearTranscriptEnd({
        clientHeight: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight,
        scrollTop: window.scrollY,
      });
    };
    updateFollowState();
    window.addEventListener('scroll', updateFollowState, { passive: true });
    return () => window.removeEventListener('scroll', updateFollowState);
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
        if (activeActivities.size === 0) {
          initialPromptAcceptedRef.current = true;
          setInitialPromptState('sent');
        }
        return;
      }
      if (event.event === 'done' || event.event === 'error') {
        activeActivities.clear();
        setActivity(null);
        initialPromptAcceptedRef.current = true;
        setInitialPromptState('sent');
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
  const visibleMessages = useMemo(
    () => visibleConversationMessages(messages),
    [messages],
  );
  const hasToolError = useMemo(
    () => currentTurnHasToolError(messages),
    [messages],
  );
  const copy = conversationCopy(projection);
  const awaitingAssistantContent = appearance === 'immersive'
    && busy
    && visibleMessages.every((message) => message.role === 'user');

  function sendFollowUp(prompt: string) {
    followLatestRef.current = true;
    conversationEndRef.current?.scrollIntoView?.({ block: 'end' });
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

  function retryInitialPrompt() {
    if (initialPromptSendingRef.current) return;
    if (status === 'error') client.resetSession();
    setInitialPromptState('pending');
  }

  const initialPromptIsSending = initialPromptState === 'pending'
    || initialPromptState === 'sending';
  const showOptimisticInitialPrompt = visibleMessages.length === 0
    && initialPromptState !== 'failed';
  const initialPromptProgress = visibleMessages.length === 0
    && initialPromptIsSending
    && !terminal
    && !stopRequested;
  const responseInProgress = !stopRequested
    && (initialPromptProgress || Boolean(activity) || busy);
  const statusLabel = terminal || stopRequested || !responseInProgress
    ? ''
    : 'Thinking…';
  let activityInsertionIndex = visibleMessages.length;
  for (let index = visibleMessages.length - 1; index >= 0; index -= 1) {
    if (visibleMessages[index]?.role === 'user') {
      activityInsertionIndex = index + 1;
      break;
    }
  }
  const errorPresentation = error && !hasToolError
    ? presentAssistantError(error)
    : null;

  const activityRow = (
    <li
      className="travel-conversation__activity"
      data-active={statusLabel ? 'true' : 'false'}
      key="assistant-activity"
    >
      <p
        aria-live="polite"
        className="travel-conversation__activity-status"
        role="status"
      >
        {statusLabel ? <TextShimmer>{statusLabel}</TextShimmer> : null}
      </p>
    </li>
  );

  return (
    <section
      aria-busy={responseInProgress}
      aria-label="Travel conversation"
      className={[
        'travel-conversation-shell',
        appearance === 'immersive'
          ? 'travel-conversation-shell--immersive'
          : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      data-scroll-owner="page"
    >
      <header className="travel-conversation__header">
        <p className="assistant-identity">
          {siteConfig.brand.assistantName}
        </p>
        <h1>{copy.title}</h1>
        {appearance === 'immersive' && onNewTrip ? (
          <button onClick={onNewTrip} type="button">Start a new trip</button>
        ) : null}
      </header>
      <div className="travel-conversation__context">
        <TripBrief projection={projection} />
      </div>
      <div
        className="travel-transcript"
        data-scroll-owner="page"
      >
        <ol
          aria-label="Conversation transcript"
          ref={transcriptContentRef}
          role="log"
        >
          {showOptimisticInitialPrompt ? (
            <li data-optimistic-initial-prompt="true">
              <article
                aria-label="Traveler message"
                className="travel-message travel-message--user"
              >
                <p>{initialPrompt}</p>
              </article>
            </li>
          ) : null}
          {visibleMessages.map((message, index) => (
            <Fragment key={message.id}>
              {index === activityInsertionIndex ? activityRow : null}
              <li>
                <TravelMessage client={client} message={message} />
              </li>
            </Fragment>
          ))}
          {activityInsertionIndex === visibleMessages.length
            ? activityRow
            : null}
        </ol>
        {awaitingAssistantContent ? <ImmersiveConversationSkeleton /> : null}
        <div aria-hidden="true" data-testid="conversation-end" ref={conversationEndRef} />
      </div>
      {appearance === 'immersive' ? (
        <ImmersiveTripRail
          busy={busy}
          onPrompt={sendFollowUp}
          projection={projection}
        />
      ) : null}
      <div className="travel-conversation__lower-chrome">
        {durableInitialPrompt && initialPromptState === 'failed' ? (
          <section className="assistant-error initial-prompt-error" role="alert">
            <h2>Your request is still here</h2>
            <p>The Assistant session did not start. Try the same request again without retyping it.</p>
            <button onClick={retryInitialPrompt} type="button">
              Retry starting trip
            </button>
          </section>
        ) : null}
        {projection.phase === 'no-results' ? (
          <div
            aria-label="Refine this search"
            className="travel-search-refinements"
            role="group"
          >
            <button
              disabled={busy}
              onClick={() => sendFollowUp(
                'Search nearby airports for this trip.',
              )}
              type="button"
            >
              Try nearby airports
            </button>
            <button
              disabled={busy}
              onClick={() => sendFollowUp(
                'Help me change the travel dates.',
              )}
              type="button"
            >
              Change dates
            </button>
          </div>
        ) : null}
        {projection.phase === 'error' || hasToolError ? (
          <div
            aria-label="Recover flight search"
            className="travel-search-refinements"
            role="group"
          >
            <button
              disabled={busy}
              onClick={() => sendFollowUp(
                'Help me adjust the airports or travel dates before searching again.',
              )}
              type="button"
            >
              Adjust trip
            </button>
            <button
              disabled={busy}
              onClick={() => sendFollowUp(
                'Search nearby airports for this trip instead.',
              )}
              type="button"
            >
              Try nearby airports
            </button>
          </div>
        ) : null}
        {errorPresentation && !(durableInitialPrompt && initialPromptState === 'failed') ? (
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
      </div>
      <TravelComposer
        busy={responseInProgress}
        error={Boolean(errorPresentation || hasToolError || projection.phase === 'error')}
        formLabel="Continue trip"
        onStop={stopGenerating}
        onSubmit={sendFollowUp}
        placeholder={copy.placeholder}
        submitLabel="Continue trip"
        variant="conversation"
      />
    </section>
  );
}
