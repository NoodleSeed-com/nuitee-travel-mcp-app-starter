'use client';

import Image from 'next/image';
import { type Ref, useState } from 'react';
import {
  NEUTRAL_TRAVEL_DEFAULTS,
  type TravelDefaults,
} from '../lib/travel-defaults';
import { coreHeroModes } from '../lib/travel-hero-content';
import { TravelComposer } from './travel-composer';

interface TravelHeroProps {
  readonly defaults?: TravelDefaults;
  readonly inputRef: Ref<HTMLTextAreaElement>;
  readonly launchError?: string | null;
  readonly onStart: (prompt: string) => void;
}

const heroScene = coreHeroModes[0].scenes[0];

/**
 * The single host-side starting point. Wayfare decides which travel
 * capabilities are relevant after the traveler describes their intent.
 */
export function TravelHero({
  defaults = NEUTRAL_TRAVEL_DEFAULTS,
  inputRef,
  launchError,
  onStart,
}: Readonly<TravelHeroProps>) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>(
    'loading',
  );
  const promptOrigin = defaults.origin?.city ?? 'Your departure';

  return (
    <section className="travel-hero" aria-labelledby="travel-home-title">
      <div className="travel-hero__content">
        <div
          className="travel-hero__experience travel-hero__experience--agent-led travel-hero__media"
          data-image-state={imageState}
        >
          <Image
            alt=""
            className="travel-hero__image"
            fill
            onError={() => setImageState('error')}
            onLoad={() => setImageState('loaded')}
            priority
            sizes="(max-width: 767px) 100vw, 1200px"
            src={heroScene.imageSrc}
            style={{ objectPosition: heroScene.imagePosition }}
          />
          <span aria-hidden="true" className="travel-hero__image-skeleton" />
          <span aria-hidden="true" className="travel-hero__media-veil" />

          <div className="travel-hero__interface">
            <div className="travel-hero__panel">
              <div className="travel-hero__copy">
                <span>Your journey starts here</span>
                <h1 id="travel-home-title">Tell us the trip you have in mind</h1>
                <p>
                  Describe the journey once. Wayfare will bring in the relevant
                  travel options as they become useful.
                </p>
              </div>
              <TravelComposer
                formLabel="Plan a trip"
                inputId="travel-prompt"
                inputRef={inputRef}
                onSubmit={onStart}
                placeholder={`${promptOrigin} — describe the trip you have in mind`}
                submitLabel="Submit trip request"
                variant="hero"
                visibleSubmitLabel="Plan my trip"
              />
              <p className="travel-hero__detail">
                For example: A long weekend somewhere warm in October.
              </p>
            </div>
          </div>
        </div>

        {launchError ? (
          <p className="travel-zero-state__error" role="alert">{launchError}</p>
        ) : null}
      </div>
    </section>
  );
}
