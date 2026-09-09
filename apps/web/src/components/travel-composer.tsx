'use client';

import { ArrowDownIcon, ArrowPathIcon, ArrowUpIcon, StopIcon } from '@heroicons/react/24/outline';
import { type FormEvent, type Ref, useEffect, useState } from 'react';
import { BorderBeam } from './ui/border-beam-search';

interface TravelComposerProps {
  readonly animatedPlaceholders?: readonly string[];
  readonly busy?: boolean;
  readonly error?: boolean;
  readonly formLabel?: string;
  readonly inputId?: string;
  readonly inputRef?: Ref<HTMLTextAreaElement>;
  readonly jumpToLatestPending?: boolean;
  readonly onJumpToLatest?: () => void;
  readonly onStop?: () => void;
  readonly onSubmit: (prompt: string) => void;
  readonly placeholder?: string;
  readonly submitLabel?: string;
  readonly suggestions?: readonly {
    readonly label: string;
    readonly prompt: string;
  }[];
  readonly suggestionsLabel?: string;
  readonly variant?: 'hero' | 'conversation';
  readonly visibleSubmitLabel?: string;
}

export function TravelComposer({
  animatedPlaceholders = [],
  busy = false,
  error = false,
  formLabel = 'Start a trip',
  inputId,
  inputRef,
  jumpToLatestPending = false,
  onJumpToLatest,
  onStop,
  onSubmit,
  placeholder = 'Ask about dates, airports, or a route',
  submitLabel = 'Start trip',
  suggestions = [],
  suggestionsLabel = 'Suggested requests',
  variant = 'conversation',
  visibleSubmitLabel,
}: Readonly<TravelComposerProps>) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const [animatedPrompt, setAnimatedPrompt] = useState('');
  const animatedPromptKey = animatedPlaceholders.join('\u0000');
  const hasAnimatedPlaceholders = animatedPromptKey.length > 0;
  const showAnimatedPrompt = hasAnimatedPlaceholders
    && !busy
    && !draft
    && !focused;
  const composerState = error
    ? 'error'
    : busy
      ? 'busy'
      : focused
        ? 'focused'
        : 'idle';

  useEffect(() => {
    if (!animatedPromptKey) {
      setAnimatedPrompt('');
      return;
    }

    const prompts = animatedPromptKey.split('\u0000');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimatedPrompt(prompts[0] ?? '');
      return;
    }

    let cancelled = false;
    let promptIndex = 0;
    let characterIndex = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const typeNextCharacter = () => {
      if (cancelled) return;
      const prompt = prompts[promptIndex] ?? '';

      if (!deleting) {
        characterIndex += 1;
        setAnimatedPrompt(prompt.slice(0, characterIndex));
        if (characterIndex >= prompt.length) {
          deleting = true;
          timer = setTimeout(typeNextCharacter, 1_800);
          return;
        }
        timer = setTimeout(typeNextCharacter, 55);
        return;
      }

      characterIndex -= 1;
      setAnimatedPrompt(prompt.slice(0, Math.max(0, characterIndex)));
      if (characterIndex <= 0) {
        deleting = false;
        promptIndex = (promptIndex + 1) % prompts.length;
        timer = setTimeout(typeNextCharacter, 360);
        return;
      }
      timer = setTimeout(typeNextCharacter, 28);
    };

    typeNextCharacter();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [animatedPromptKey]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const prompt = draft.trim();
    if (!prompt) return;
    onSubmit(prompt);
    setDraft('');
  }

  return (
    <div
      className={[
        'travel-composer-beam',
        `travel-composer-beam--${variant}`,
        suggestions.length > 0 ? 'travel-composer-beam--with-suggestions' : '',
      ].filter(Boolean).join(' ')}
      data-wayfare-composer-beam="true"
      data-composer-state={composerState}
    >
      {onJumpToLatest ? (
        <button
          aria-label="Jump to latest message"
          aria-description={jumpToLatestPending ? 'Moving to the latest turn or waiting for its reply. You can still jump down.' : undefined}
          className="travel-composer__jump-latest"
          data-loading={jumpToLatestPending ? 'true' : 'false'}
          onClick={onJumpToLatest}
          title="Jump to latest message"
          type="button"
        >
          {jumpToLatestPending ? <ArrowPathIcon aria-hidden="true" /> : <ArrowDownIcon aria-hidden="true" />}
        </button>
      ) : null}
      <BorderBeam
        active={!error && busy}
        borderRadius={999}
        className="travel-composer-beam__effect"
        colorVariant="ocean"
        duration={3.1}
        size="line"
        hueRange={12}
        saturation={1.35}
        strength={0.74}
        theme="light"
      >
        <form
          aria-label={formLabel}
          className={[
            'travel-composer',
            variant === 'hero'
              ? 'travel-composer--hero'
              : 'travel-composer--conversation',
            suggestions.length > 0 ? 'travel-composer--with-suggestions' : '',
          ].filter(Boolean).join(' ')}
          onSubmit={submit}
        >
          <div className="travel-composer__input-shell">
            <textarea
              aria-label="Ask the travel assistant"
              className="travel-composer__input"
              id={inputId}
              onBlur={() => setFocused(false)}
              onChange={(event) => setDraft(event.currentTarget.value)}
              onFocus={() => setFocused(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={hasAnimatedPlaceholders ? undefined : placeholder}
              ref={inputRef}
              rows={1}
              value={draft}
              aria-invalid={error || undefined}
            />
            {hasAnimatedPlaceholders ? (
              <span
                aria-hidden="true"
                className="travel-composer__typewriter"
                data-typewriter-prompts={animatedPlaceholders.join(' | ')}
                hidden={!showAnimatedPrompt}
              >
                <span>{animatedPrompt}</span>
                <span aria-hidden="true" className="travel-composer__typewriter-cursor" />
              </span>
            ) : null}
          </div>
          <div className="travel-composer__controls">
            {busy && onStop ? (
              <button
                aria-label="Stop generating"
                className="travel-composer__send travel-composer__stop"
                onClick={onStop}
                type="button"
              >
                <StopIcon aria-hidden="true" />
              </button>
            ) : (
              <button
                aria-label={submitLabel}
                className="travel-composer__send"
                disabled={!draft.trim()}
                type="submit"
              >
                <ArrowUpIcon aria-hidden="true" />
                {variant === 'hero' && visibleSubmitLabel ? (
                  <span>{visibleSubmitLabel}</span>
                ) : null}
              </button>
            )}
          </div>
          {suggestions.length > 0 ? (
            <ul
              aria-label={suggestionsLabel}
              className="travel-composer__suggestions"
            >
              {suggestions.map((suggestion) => (
                <li key={suggestion.label}>
                  <button
                    onClick={() => setDraft(suggestion.prompt)}
                    type="button"
                  >
                    {suggestion.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      </BorderBeam>
    </div>
  );
}
