'use client';

import Image from 'next/image';
import { type PointerEvent as ReactPointerEvent, type Ref, useState } from 'react';
import {
  NEUTRAL_TRAVEL_DEFAULTS,
  type TravelDefaults,
} from '../lib/travel-defaults';
import { siteConfig } from '../lib/site-config';
import { TravelComposer } from './travel-composer';

interface TravelHeroProps {
  readonly defaults?: TravelDefaults;
  readonly inputRef: Ref<HTMLTextAreaElement>;
  readonly launchError?: string | null;
  readonly onStart: (prompt: string) => void;
}

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
  const animatedPlaceholders = [
    'Tokyo in spring',
    'A long weekend in New York',
    'Return flights to London',
    'Three nights in Lisbon',
  ];
  const resetView = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--travel-view-x', '0px');
    event.currentTarget.style.setProperty('--travel-view-y', '0px');
  };
  const updateView = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontalPosition = (event.clientX - bounds.left) / bounds.width - 0.5;
    const verticalPosition = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty(
      '--travel-view-x',
      `${(-horizontalPosition * 20).toFixed(2)}px`,
    );
    event.currentTarget.style.setProperty(
      '--travel-view-y',
      `${(-verticalPosition * 10).toFixed(2)}px`,
    );
  };

  return (
    <section className="travel-hero" aria-labelledby="travel-home-title">
      <div className="travel-hero__content">
        <div
          className="travel-hero__experience travel-hero__experience--agent-led travel-hero__media"
          data-image-state={imageState}
          onPointerLeave={resetView}
          onPointerMove={updateView}
        >
          <Image
            alt=""
            className="travel-hero__image travel-hero__view"
            draggable={false}
            fill
            onError={() => setImageState('error')}
            onLoad={() => setImageState('loaded')}
            priority
            sizes="(max-width: 767px) 100vw, 1200px"
            src={siteConfig.brand.heroViewImagePath}
          />
          <span aria-hidden="true" className="travel-hero__image-skeleton" />
          <Image
            alt=""
            aria-hidden="true"
            className="travel-hero__cabin"
            draggable={false}
            fill
            priority
            sizes="(max-width: 767px) 100vw, 1200px"
            src={siteConfig.brand.heroCabinImagePath}
          />

          <div className="travel-hero__interface">
            <div className="travel-hero__panel">
              <div className="travel-hero__copy">
                <h1 id="travel-home-title">Tell us the trip you have in mind</h1>
              </div>
              <TravelComposer
                animatedPlaceholders={animatedPlaceholders}
                error={Boolean(launchError)}
                formLabel="Plan a trip"
                inputId="travel-prompt"
                inputRef={inputRef}
                onSubmit={onStart}
                submitLabel="Submit trip request"
                variant="hero"
              />
            </div>
          </div>
        </div>

        <aside aria-label="Technology partners" className="travel-hero__partners">
          <span className="travel-hero__partner">
            <span>Built on</span>
            <Image
              alt="Noodle Seed"
              height={39}
              src="/images/partners/noodle-seed.svg"
              width={250}
            />
          </span>
          <span aria-hidden="true" className="travel-hero__partner-divider" />
          <span className="travel-hero__partner">
            <span>Powered by</span>
            <Image
              alt="Nuitée"
              height={34}
              src="/images/partners/nuitee.svg"
              width={100}
            />
          </span>
        </aside>

        {launchError ? (
          <p className="travel-zero-state__error" role="alert">{launchError}</p>
        ) : null}
      </div>
    </section>
  );
}
