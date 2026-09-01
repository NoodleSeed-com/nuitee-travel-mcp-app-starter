'use client';

import Image from 'next/image';
import {
  BedDouble,
  Compass,
  Hotel,
  PlaneTakeoff,
} from 'lucide-react';
import {
  type KeyboardEvent,
  type Ref,
  useState,
} from 'react';
import { siteConfig } from '../lib/site-config';
import {
  NEUTRAL_TRAVEL_DEFAULTS,
  type TravelDefaults,
} from '../lib/travel-defaults';
import { TravelComposer } from './travel-composer';

type HeroMode = 'explore' | 'flight' | 'stay' | 'flight-stay';

interface TravelHeroProps {
  readonly defaults?: TravelDefaults;
  readonly inputRef: Ref<HTMLTextAreaElement>;
  readonly launchError?: string | null;
  readonly onStart: (prompt: string) => void;
}

interface HeroModeDefinition {
  readonly id: HeroMode;
  readonly label: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly support: string;
  readonly imageSrc: string;
  readonly imagePosition: string;
  readonly placeholder: string;
  readonly detail: string;
}

const heroModes: readonly HeroModeDefinition[] = [
  {
    id: 'explore',
    label: 'Explore',
    eyebrow: 'Your trip, brought together',
    heading: 'Plan your whole trip',
    support: 'Flights, stays, and rewards—brought together in one conversation.',
    imageSrc: '/images/wayfare-hybrid-hero-v2.jpg',
    imagePosition: '50% 50%',
    placeholder: 'to somewhere warm for two, next week',
    detail: 'A window into what comes next',
  },
  {
    id: 'flight',
    label: 'Flights',
    eyebrow: 'Flight planning',
    heading: 'Choose your horizon',
    support: 'Compare current routes and fares around the journey you have in mind.',
    imageSrc: '/images/immersive/wayfare-cockpit-v1.png',
    imagePosition: '50% 50%',
    placeholder: 'Where do you want to fly?',
    detail: 'Round trip · 1 adult · Economy',
  },
  {
    id: 'stay',
    label: 'Stays',
    eyebrow: 'Stay planning',
    heading: 'Wake up somewhere new',
    support: 'Compare welcoming stays around your destination and travel dates.',
    imageSrc: '/images/immersive/wayfare-stay-v1.png',
    imagePosition: '50% 50%',
    placeholder: 'Where would you like to stay?',
    detail: '2 guests · 1 room · Flexible dates',
  },
  {
    id: 'flight-stay',
    label: 'Flight + Stay',
    eyebrow: 'One connected plan',
    heading: 'From takeoff to check-in',
    support: 'Shape the journey and the stay together without switching planning flows.',
    imageSrc: '/images/immersive/wayfare-flight-stay-v1.png',
    imagePosition: '50% 50%',
    placeholder: 'Plan my flight and stay…',
    detail: 'Return flight · 2 guests · 3 nights',
  },
] as const;

const modeIcons = {
  explore: Compass,
  flight: PlaneTakeoff,
  stay: Hotel,
  'flight-stay': BedDouble,
} as const;

function focusAdjacentTab(
  event: KeyboardEvent<HTMLButtonElement>,
  direction: -1 | 1,
) {
  const tabs = Array.from(
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    ) ?? [],
  );
  const currentIndex = tabs.indexOf(event.currentTarget);
  tabs.at((currentIndex + direction + tabs.length) % tabs.length)?.focus();
}

function HeroHeading({ text }: Readonly<{ text: string }>) {
  const words = text.split(' ');
  const lead = words.slice(0, -2).join(' ');
  const tail = words.slice(-2).join(' ');
  return (
    <>
      {lead ? `${lead} ` : null}
      <span className="travel-hero__heading-tail">{tail}</span>
    </>
  );
}

/**
 * Reusable host-side hero. It changes presentation and prompting context while
 * keeping every request on the existing assistant conversation boundary.
 */
export function TravelHero({
  defaults = NEUTRAL_TRAVEL_DEFAULTS,
  inputRef,
  launchError,
  onStart,
}: Readonly<TravelHeroProps>) {
  const [mode, setMode] = useState<HeroMode>('explore');
  const [loadedImage, setLoadedImage] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const activeMode = heroModes.find(({ id }) => id === mode) ?? heroModes[0];
  const promptOrigin = defaults.origin?.city ?? 'Your departure';
  const placeholder = mode === 'explore'
    ? `${promptOrigin} ${activeMode.placeholder}`
    : activeMode.placeholder;

  function selectMode(nextMode: HeroMode) {
    setMode(nextMode);
    setLoadedImage(null);
  }

  return (
    <section className="travel-hero" aria-labelledby="travel-home-title">
      <div className="travel-hero__content">
        <div
          className={`travel-hero__experience travel-hero__media travel-hero__experience--${mode}`}
          data-image-state={failedImages.has(activeMode.imageSrc)
            ? 'error'
            : loadedImage === activeMode.imageSrc ? 'loaded' : 'loading'}
          data-mode={mode}
        >
          <Image
            alt=""
            className="travel-hero__image"
            fill
            key={activeMode.imageSrc}
            onError={() => {
              setFailedImages((current) => new Set(current).add(activeMode.imageSrc));
            }}
            onLoad={() => setLoadedImage(activeMode.imageSrc)}
            priority
            sizes="(max-width: 767px) 100vw, 1200px"
            src={activeMode.imageSrc}
            style={{ objectPosition: activeMode.imagePosition }}
          />
          <span aria-hidden="true" className="travel-hero__image-skeleton" />
          <span aria-hidden="true" className="travel-hero__media-veil" />

          {mode === 'explore' ? (
            <div
              aria-hidden="true"
              className="travel-hero__window-deck"
              data-testid="hero-window-deck"
            >
              {[0, 1, 2].map((windowIndex) => (
                <span className="travel-hero__window-shell" key={windowIndex}>
                  <span className="travel-hero__window-view" />
                </span>
              ))}
            </div>
          ) : null}

          <div className="travel-hero__interface">
            <div
              aria-label="Choose a planning view"
              className="travel-hero__modes"
              role="tablist"
            >
              {heroModes.map((candidate) => {
                const Icon = modeIcons[candidate.id];
                const selected = candidate.id === mode;
                return (
                  <button
                    aria-controls="travel-hero-panel"
                    aria-selected={selected}
                    className="travel-hero__mode"
                    id={`travel-hero-tab-${candidate.id}`}
                    key={candidate.id}
                    onClick={() => selectMode(candidate.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowLeft') {
                        event.preventDefault();
                        focusAdjacentTab(event, -1);
                      }
                      if (event.key === 'ArrowRight') {
                        event.preventDefault();
                        focusAdjacentTab(event, 1);
                      }
                    }}
                    role="tab"
                    tabIndex={selected ? 0 : -1}
                    type="button"
                  >
                    <Icon aria-hidden="true" />
                    <span>{candidate.label}</span>
                  </button>
                );
              })}
            </div>

            <div
              aria-labelledby={`travel-hero-tab-${mode}`}
              className="travel-hero__panel"
              id="travel-hero-panel"
              role="tabpanel"
            >
              <div className="travel-hero__copy">
                <span>{activeMode.eyebrow}</span>
                <h1 id="travel-home-title">
                  <HeroHeading text={activeMode.heading} />
                </h1>
                <p>{activeMode.support}</p>
              </div>
              <TravelComposer
                formLabel="Plan a trip"
                inputId="travel-prompt"
                inputRef={inputRef}
                onSubmit={onStart}
                placeholder={placeholder}
                submitLabel="Submit trip request"
                variant="hero"
                visibleSubmitLabel="Plan a trip"
              />
              <p className="travel-hero__detail">{activeMode.detail}</p>
            </div>
          </div>
        </div>

        <ul className="travel-starter-prompts" aria-label="Suggested trips">
          {siteConfig.prompts.slice(0, 2).map((prompt) => (
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
      </div>
    </section>
  );
}
