'use client';

import { ArrowUp } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface TravelComposerProps {
  readonly formLabel?: string;
  readonly onSubmit: (prompt: string) => void;
}

export function TravelComposer({
  formLabel = 'Start a trip',
  onSubmit,
}: Readonly<TravelComposerProps>) {
  const [draft, setDraft] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = draft.trim();
    if (!prompt) return;
    onSubmit(prompt);
    setDraft('');
  }

  return (
    <form aria-label={formLabel} className="travel-composer" onSubmit={submit}>
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
        placeholder="Ask about dates, airports, or a route"
        rows={1}
        value={draft}
      />
      <button
        aria-label="Start trip"
        className="travel-composer__send"
        disabled={!draft.trim()}
        type="submit"
      >
        <ArrowUp aria-hidden="true" />
      </button>
    </form>
  );
}
