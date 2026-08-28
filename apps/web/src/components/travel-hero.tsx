'use client';

import Image from 'next/image';
import type { Ref } from 'react';
import { starterConfig } from '../../../../starter.config';
import { TravelComposer } from './travel-composer';

interface TravelHeroProps {
  readonly inputRef: Ref<HTMLTextAreaElement>;
  readonly launchError?: string | null;
  readonly onStart: (prompt: string) => void;
}

export function TravelHero({
  inputRef,
  launchError,
  onStart,
}: Readonly<TravelHeroProps>) {
  return (
    <section className="travel-hero" aria-labelledby="travel-home-title">
      <Image
        alt=""
        className="travel-hero__image"
        fill
        priority
        sizes="100vw"
        src="/images/conversation-hero-v1.png"
      />
      <div aria-hidden="true" className="travel-hero__scrim" />
      <div className="travel-hero__content">
        <div className="travel-hero__copy">
          <h1 id="travel-home-title">
            Where will you <span>go next?</span>
          </h1>
          <p>Tell us the trip. We’ll find the flights and verify the fare.</p>
        </div>
        <TravelComposer
          formLabel="Plan a trip"
          inputId="travel-prompt"
          inputRef={inputRef}
          onSubmit={onStart}
          placeholder="Islamabad to Rome for two, next weekend"
          submitLabel="Find flights"
          variant="hero"
          visibleSubmitLabel="Find flights"
        />
        <ul className="travel-starter-prompts" aria-label="Suggested trips">
          {starterConfig.prompts.slice(0, 2).map((prompt) => (
            <li key={prompt}>
              <button type="button" onClick={() => onStart(prompt)}>
                {prompt}
              </button>
            </li>
          ))}
        </ul>
        {launchError ? (
          <p className="travel-zero-state__error" role="alert">{launchError}</p>
        ) : null}
        <a className="travel-hero__explore" href="#places-to-start">
          Explore destinations
        </a>
      </div>
    </section>
  );
}
