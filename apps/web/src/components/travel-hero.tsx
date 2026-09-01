'use client';

import Image from 'next/image';
import {
  ArrowRight,
  BadgeCheck,
  Hotel,
  MessageCircle,
  PlaneTakeoff,
} from 'lucide-react';
import type { Ref } from 'react';
import { siteConfig } from '../lib/site-config';
import {
  NEUTRAL_TRAVEL_DEFAULTS,
  type TravelDefaults,
} from '../lib/travel-defaults';
import { TravelComposer } from './travel-composer';
import { WayfareMark } from './wayfare-mark';

interface TravelHeroProps {
  readonly defaults?: TravelDefaults;
  readonly inputRef: Ref<HTMLTextAreaElement>;
  readonly launchError?: string | null;
  readonly onStart: (prompt: string) => void;
}

export function TravelHero({
  defaults = NEUTRAL_TRAVEL_DEFAULTS,
  inputRef,
  launchError,
  onStart,
}: Readonly<TravelHeroProps>) {
  const routeOrigin = defaults.origin
    ? `${defaults.origin.city} (${defaults.origin.iata})`
    : 'Your departure';
  const promptOrigin = defaults.origin?.city ?? 'Your departure';
  return (
    <section className="travel-hero" aria-labelledby="travel-home-title">
      <div className="travel-hero__content">
        <div className="travel-hero__copy">
          <h1 id="travel-home-title">Plan your whole trip</h1>
          <p>Flights, stays, and rewards—brought together in one conversation.</p>
        </div>
        <TravelComposer
          formLabel="Plan a trip"
          inputId="travel-prompt"
          inputRef={inputRef}
          onSubmit={onStart}
          placeholder={`${promptOrigin} to somewhere warm for two, next week`}
          submitLabel="Submit trip request"
          variant="hero"
          visibleSubmitLabel="Plan a trip"
        />
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
        <div
          aria-label="One conversation for the whole trip"
          className="travel-hero__media"
          role="group"
        >
          <div className="travel-hero__media-frame">
            <Image
              alt=""
              className="travel-hero__image"
              fill
              priority
              sizes="(max-width: 767px) 100vw, 1080px"
              src={siteConfig.brand.heroImagePath}
              style={{ objectPosition: siteConfig.brand.heroImagePosition }}
            />
            <div className="travel-hero__media-veil" aria-hidden="true" />
            <div className="travel-hero__journey">
              <span>Your trip, brought together</span>
              <strong>Flights, stays, and rewards. One plan.</strong>
              <div className="travel-hero__route">
                <span>{routeOrigin}</span>
                <ArrowRight aria-hidden="true" strokeWidth={1.75} />
                <span>Your next destination</span>
              </div>
              <small>Your dates · Your preferences · One plan</small>
            </div>
          </div>

          <article className="travel-hero__story-card travel-hero__story-card--request">
            <span className="travel-hero__story-icon">
              <MessageCircle aria-hidden="true" strokeWidth={1.75} />
            </span>
            <div>
              <strong>Your request</strong>
              <p>Plan a complete trip for two next week.</p>
            </div>
          </article>

          <article className="travel-hero__story-card travel-hero__story-card--wayfare">
            <span className="travel-hero__story-icon travel-hero__story-icon--wayfare">
              <WayfareMark />
            </span>
            <div>
              <strong>Wayfare understands</strong>
              <ul>
                <li>Route and dates</li>
                <li>Traveler count</li>
                <li>Flights, stays, and rewards</li>
              </ul>
            </div>
          </article>

          <ol
            aria-label="Build your trip with Wayfare"
            className="travel-hero__steps"
          >
            <li>
              <PlaneTakeoff aria-hidden="true" strokeWidth={1.75} />
              <span>Flight</span>
            </li>
            <li>
              <Hotel aria-hidden="true" strokeWidth={1.75} />
              <span>Stay</span>
            </li>
            <li>
              <BadgeCheck aria-hidden="true" strokeWidth={1.75} />
              <span>Rewards review</span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
