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
      <div className="travel-hero__content">
        <div className="travel-hero__copy">
          <h1 id="travel-home-title">Where will you go next?</h1>
          <p>Tell Wayfare the trip you have in mind.</p>
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
        <div className="travel-hero__media" aria-hidden="true">
          <Image
            alt=""
            className="travel-hero__image"
            fill
            priority
            sizes="(max-width: 767px) 100vw, 1200px"
            src="/images/wayfare-hybrid-hero-v2.jpg"
          />
        </div>
      </div>
    </section>
  );
}
