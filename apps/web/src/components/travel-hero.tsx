'use client';

import Image from 'next/image';
import {
  BedDouble,
  CarFront,
  Compass,
  Hotel,
  Plane,
  PlaneTakeoff,
  ShieldCheck,
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
import {
  coreHeroModes,
  type CoreHeroMode,
  type HeroModeDefinition,
} from '../lib/travel-hero-content';
import { TravelComposer } from './travel-composer';

type HeroMode = CoreHeroMode | 'private-jet' | 'car';

interface TravelHeroProps {
  readonly defaults?: TravelDefaults;
  readonly inputRef: Ref<HTMLTextAreaElement>;
  readonly launchError?: string | null;
  readonly onStart: (prompt: string) => void;
}

const privateDayPrompt =
  'Fly me from Toronto to New York tomorrow morning for four people.';
const privateCockpitPrompt =
  'I need a private jet from London to Nice next Friday for six, returning Sunday evening.';
const privateNightPrompt =
  'Two adults from Dubai to Paris next week. Quiet cabin, overnight departure, and a car on arrival.';
const carCoastPrompt =
  'I need a compact SUV at Lisbon airport next Friday for four days.';
const carAlpinePrompt =
  'Add an electric car at Zurich airport when my flight arrives. Return it in Interlaken five days later.';
const carDesertPrompt =
  'Find me a convertible in Los Angeles for a three-day coastal drive, with one-way return in San Francisco.';

const heroModes: readonly HeroModeDefinition<HeroMode>[] = [
  ...coreHeroModes,
  {
    id: 'private-jet',
    label: 'Private Jets',
    scenes: [
      {
        id: 'private-daylight',
        label: 'Daylight Lounge',
        eyebrow: 'Private aviation',
        heading: 'Private aviation, made personal.',
        support: 'Tell us where you want to go, and we’ll shape the journey.',
        imageSrc: '/images/immersive/private-jets/daylight-lounge-v1.png',
        imagePosition: '50% 50%',
        placeholder: privateDayPrompt,
        detail: 'Conversation-first private aviation preview',
        layout: 'center',
        tone: 'light',
        suggestions: [
          { label: 'Plan a business trip', prompt: privateDayPrompt },
          {
            label: 'Find a weekend escape',
            prompt: 'Plan a private weekend escape from Toronto for two adults next month.',
          },
          {
            label: 'Compare aircraft',
            prompt: 'Help me describe the cabin and aircraft preferences for my private journey.',
          },
        ],
      },
      {
        id: 'private-cockpit',
        label: 'Cockpit Sunset',
        eyebrow: 'Where should we take you next?',
        heading: 'Describe the journey. We’ll handle the details.',
        support: 'One request can include the route, schedule, party, and arrival preferences.',
        imageSrc: '/images/immersive/private-jets/cockpit-sunset-v1.png',
        imagePosition: '50% 50%',
        placeholder: privateCockpitPrompt,
        detail: 'Conversation-first private aviation preview',
        layout: 'center',
        tone: 'dark',
        suggestions: [
          { label: 'Use flexible dates', prompt: privateCockpitPrompt },
          {
            label: 'Show cabin options',
            prompt: 'Help me choose cabin preferences for six travelers on a private flight.',
          },
          {
            label: 'Include ground transfer',
            prompt: 'Plan a private flight and include a car transfer after landing.',
          },
        ],
      },
      {
        id: 'private-night',
        label: 'Night Suite',
        eyebrow: 'Private journeys',
        heading: 'The world, on your time.',
        support: 'Tell me about the trip you have in mind.',
        imageSrc: '/images/immersive/private-jets/night-suite-v1.png',
        imagePosition: '50% 50%',
        placeholder: privateNightPrompt,
        detail: 'Conversation-first private aviation preview',
        layout: 'editorial',
        tone: 'light',
        suggestions: [
          { label: 'Flights', prompt: privateNightPrompt },
          {
            label: 'Cabin preferences',
            prompt: 'Plan an overnight private flight with a quiet cabin for two adults.',
          },
          {
            label: 'Ground transfer',
            prompt: 'Plan an overnight private flight and arrange a car after arrival.',
          },
        ],
      },
    ],
  },
  {
    id: 'car',
    label: 'Cars',
    scenes: [
      {
        id: 'car-coast',
        label: 'Coastal Drive',
        eyebrow: 'Car planning',
        heading: 'Where should the road take you?',
        support: 'Tell us the trip. We’ll find the right car.',
        imageSrc: '/images/immersive/cars/coastal-road-v1.png',
        imagePosition: '50% 50%',
        placeholder: carCoastPrompt,
        detail: 'Conversation-first car rental preview',
        layout: 'center',
        tone: 'light',
        suggestions: [
          { label: 'Airport pickup', prompt: carCoastPrompt },
          {
            label: 'Family friendly',
            prompt: 'Find a family-friendly rental car in Lisbon for four people and their luggage.',
          },
          {
            label: 'Electric',
            prompt: 'Find an electric rental car at Lisbon airport for four days.',
          },
        ],
      },
      {
        id: 'car-alpine',
        label: 'Alpine Arrival',
        eyebrow: 'Continue the journey',
        heading: 'Your ride, planned with the trip.',
        support: 'Tell me what happens after you land.',
        imageSrc: '/images/immersive/cars/alpine-arrival-v1.png',
        imagePosition: '50% 50%',
        placeholder: carAlpinePrompt,
        detail: 'Conversation-first car rental preview',
        layout: 'editorial',
        tone: 'light',
        suggestions: [
          { label: 'Match my flight', prompt: carAlpinePrompt },
          {
            label: 'Automatic',
            prompt: 'Add an automatic rental car at Zurich airport when my flight lands.',
          },
          {
            label: 'Flexible return',
            prompt: 'Find a car at Zurich airport with a flexible return in Interlaken.',
          },
        ],
      },
      {
        id: 'car-desert',
        label: 'Desert Escape',
        eyebrow: 'Road-trip planning',
        heading: 'Drive the destination.',
        support: 'Describe the road trip you have in mind.',
        imageSrc: '/images/immersive/cars/desert-drive-v1.png',
        imagePosition: '50% 50%',
        placeholder: carDesertPrompt,
        detail: 'Conversation-first car rental preview',
        layout: 'center',
        tone: 'dark',
        suggestions: [
          { label: 'Scenic route', prompt: carDesertPrompt },
          {
            label: 'Premium comfort',
            prompt: 'Find a premium comfortable car for a three-day California coastal drive.',
          },
          {
            label: 'One-way return',
            prompt: 'Find a car in Los Angeles with a one-way return in San Francisco.',
          },
        ],
      },
    ],
  },
] as const;

const modeIcons = {
  explore: Compass,
  flight: PlaneTakeoff,
  stay: Hotel,
  'flight-stay': BedDouble,
  insurance: ShieldCheck,
  'private-jet': Plane,
  car: CarFront,
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
 * Reusable host-side hero. Visual modes and scene selectors never start a
 * session; only submitting the shared conversation composer crosses the
 * existing assistant boundary.
 */
export function TravelHero({
  defaults = NEUTRAL_TRAVEL_DEFAULTS,
  inputRef,
  launchError,
  onStart,
}: Readonly<TravelHeroProps>) {
  const [mode, setMode] = useState<HeroMode>('explore');
  const [sceneId, setSceneId] = useState(heroModes[0].scenes[0].id);
  const [loadedImages, setLoadedImages] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const activeMode = heroModes.find(({ id }) => id === mode) ?? heroModes[0];
  const activeScene = activeMode.scenes.find(({ id }) => id === sceneId)
    ?? activeMode.scenes[0];
  const hasScenePicker = activeMode.scenes.length > 1;
  const promptOrigin = defaults.origin?.city ?? 'Your departure';
  const placeholder = mode === 'explore'
    ? `${promptOrigin} ${activeScene.placeholder}`
    : activeScene.placeholder;
  const layout = activeScene.layout ?? 'standard';
  const tone = activeScene.tone ?? 'standard';

  function selectMode(nextMode: HeroMode) {
    const nextDefinition = heroModes.find(({ id }) => id === nextMode)
      ?? heroModes[0];
    setMode(nextMode);
    setSceneId(nextDefinition.scenes[0].id);
  }

  function selectScene(nextSceneId: string) {
    setSceneId(nextSceneId);
  }

  const starterPrompts = mode === 'insurance'
    ? [siteConfig.prompts[3]]
    : siteConfig.prompts.slice(0, 2);

  return (
    <section className="travel-hero" aria-labelledby="travel-home-title">
      <div className="travel-hero__content">
        <div
          className={[
            'travel-hero__experience',
            'travel-hero__media',
            `travel-hero__experience--${mode}`,
            `travel-hero__experience--layout-${layout}`,
            `travel-hero__experience--tone-${tone}`,
          ].join(' ')}
          data-image-state={failedImages.has(activeScene.imageSrc)
            ? 'error'
            : loadedImages.has(activeScene.imageSrc) ? 'loaded' : 'loading'}
          data-mode={mode}
          data-scene={activeScene.id}
        >
          <Image
            alt=""
            className="travel-hero__image"
            fill
            key={activeScene.imageSrc}
            onError={() => {
              setFailedImages((current) => new Set(current).add(activeScene.imageSrc));
            }}
            onLoad={() => {
              setLoadedImages((current) => new Set(current).add(activeScene.imageSrc));
            }}
            priority
            sizes="(max-width: 767px) 100vw, 1200px"
            src={activeScene.imageSrc}
            style={{ objectPosition: activeScene.imagePosition }}
          />
          <span aria-hidden="true" className="travel-hero__image-skeleton" />
          <span aria-hidden="true" className="travel-hero__media-veil" />

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
                <span>{activeScene.eyebrow}</span>
                <h1 id="travel-home-title">
                  <HeroHeading text={activeScene.heading} />
                </h1>
                <p>{activeScene.support}</p>
              </div>
              <TravelComposer
                formLabel={mode === 'private-jet'
                  ? 'Plan a private jet journey'
                  : mode === 'car' ? 'Plan a car rental' : 'Plan a trip'}
                inputId="travel-prompt"
                inputRef={inputRef}
                onSubmit={onStart}
                placeholder={placeholder}
                submitLabel={mode === 'private-jet'
                  ? 'Submit private jet request'
                  : mode === 'car' ? 'Submit car request' : 'Submit trip request'}
                suggestions={activeScene.suggestions}
                suggestionsLabel={`Suggested ${activeMode.label} requests`}
                variant="hero"
                visibleSubmitLabel={hasScenePicker ? undefined : 'Plan a trip'}
              />
              {activeScene.detail ? (
                <p className="travel-hero__detail">{activeScene.detail}</p>
              ) : null}
            </div>
          </div>
        </div>

        {hasScenePicker ? (
          <div
            aria-label={`Choose a ${activeMode.label} atmosphere`}
            className="travel-hero__scene-picker"
            role="tablist"
          >
            {activeMode.scenes.map((scene) => {
              const selected = scene.id === activeScene.id;
              return (
                <button
                  aria-controls="travel-hero-panel"
                  aria-selected={selected}
                  className="travel-hero__scene"
                  key={scene.id}
                  onClick={() => selectScene(scene.id)}
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
                  <Image
                    alt=""
                    fill
                    sizes="(max-width: 767px) 74vw, 22rem"
                    src={scene.imageSrc}
                    style={{ objectPosition: scene.imagePosition }}
                  />
                  <span aria-hidden="true" className="travel-hero__scene-veil" />
                  <span>{scene.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <ul className="travel-starter-prompts" aria-label="Suggested trips">
            {starterPrompts.map((prompt) => (
              <li key={prompt}>
                <button type="button" onClick={() => onStart(prompt)}>
                  {prompt}
                </button>
              </li>
            ))}
          </ul>
        )}
        {launchError ? (
          <p className="travel-zero-state__error" role="alert">{launchError}</p>
        ) : null}
      </div>
    </section>
  );
}
