'use client';

import Image from 'next/image';
import { starterConfig } from '../../../../starter.config';
import { TravelComposer } from './travel-composer';

interface TravelZeroStateProps {
  readonly launchError?: string | null;
  readonly onStart: (prompt: string) => void;
}

export function TravelZeroState({
  launchError = null,
  onStart,
}: Readonly<TravelZeroStateProps>) {
  return (
    <section
      className="travel-hero"
      aria-labelledby="travel-home-title"
      id="travel-canvas"
      tabIndex={-1}
    >
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
          <p className="travel-hero__brand">{starterConfig.brand.name}</p>
          <p className="assistant-identity">A new way to find your flight</p>
          <h1 id="travel-home-title">
            Tell us <span className="travel-hero__headline-phrase">where you want to be.</span>
          </h1>
          <p>
            Describe the trip in your own words. We’ll shape the details,
            compare live options, and verify the fare you choose.
          </p>
        </div>
        <TravelComposer
          formLabel="Start a trip"
          onSubmit={onStart}
          placeholder="Islamabad to Rome for two, next weekend"
          submitLabel="Plan my flight"
          variant="hero"
          visibleSubmitLabel="Plan my flight"
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
        <p className="travel-attribution">
          Built on Noodle Seed · Powered by Nuitee
        </p>
        {launchError ? (
          <p className="travel-zero-state__error" role="alert">
            {launchError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
