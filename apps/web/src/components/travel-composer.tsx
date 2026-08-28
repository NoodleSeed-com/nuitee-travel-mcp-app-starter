'use client';

import { ArrowUp, Square } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface TravelComposerProps {
  readonly busy?: boolean;
  readonly formLabel?: string;
  readonly onStop?: () => void;
  readonly onSubmit: (prompt: string) => void;
  readonly placeholder?: string;
  readonly submitLabel?: string;
  readonly variant?: 'hero' | 'conversation';
  readonly visibleSubmitLabel?: string;
}

export function TravelComposer({
  busy = false,
  formLabel = 'Start a trip',
  onStop,
  onSubmit,
  placeholder = 'Ask about dates, airports, or a route',
  submitLabel = 'Start trip',
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
      className={variant === 'hero'
        ? 'travel-composer travel-composer--hero'
        : 'travel-composer travel-composer--conversation'}
      onSubmit={submit}
    >
      <textarea
        aria-label="Ask about a flight"
        className="travel-composer__input"
        onChange={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={placeholder}
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
    </form>
  );
}
