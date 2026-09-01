'use client';

import { ArrowUp, Square } from 'lucide-react';
import { type FormEvent, type Ref, useState } from 'react';

interface TravelComposerProps {
  readonly busy?: boolean;
  readonly formLabel?: string;
  readonly inputId?: string;
  readonly inputRef?: Ref<HTMLTextAreaElement>;
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
  busy = false,
  formLabel = 'Start a trip',
  inputId,
  inputRef,
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const prompt = draft.trim();
    if (!prompt) return;
    onSubmit(prompt);
    setDraft('');
  }

  return (
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
      <textarea
        aria-label="Ask the travel assistant"
        className="travel-composer__input"
        id={inputId}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={placeholder}
        ref={inputRef}
        rows={1}
        value={draft}
      />
      <div className="travel-composer__controls">
        {busy && onStop ? (
          <button
            aria-label="Stop generating"
            className="travel-composer__send travel-composer__stop"
            onClick={onStop}
            type="button"
          >
            <Square aria-hidden="true" />
          </button>
        ) : (
          <button
            aria-label={submitLabel}
            className="travel-composer__send"
            disabled={!draft.trim()}
            type="submit"
          >
            <ArrowUp aria-hidden="true" />
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
  );
}
