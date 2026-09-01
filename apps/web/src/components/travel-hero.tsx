'use client';

import Image from 'next/image';
import {
  ArrowRight,
  BadgeCheck,
  ListFilter,
  MessageCircle,
  Search,
} from 'lucide-react';
import type { Ref } from 'react';
import { siteConfig } from '../lib/site-config';
import {
  NEUTRAL_TRAVEL_DEFAULTS,
  type TravelDefaults,
} from '../lib/travel-defaults';
import { TravelComposer } from './travel-composer';
import { FlightCatchersBrand } from './flight-catchers-brand';

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
          <h1 id="travel-home-title">Where will you go next?</h1>
          <p>Plan flights, illustrative stays, and rewards in one conversation.</p>
        </div>
        <TravelComposer
          formLabel="Plan a trip"
          inputId="travel-prompt"
          inputRef={inputRef}
          onSubmit={onStart}
          placeholder={`${promptOrigin} to Rome for two, next weekend`}
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
        <p className="travel-demo-disclosure">
          <strong>{siteConfig.disclosure.badge}</strong>
          <span>{siteConfig.disclosure.persistent}</span>
        </p>
        {launchError ? (
          <p className="travel-zero-state__error" role="alert">{launchError}</p>
        ) : null}
        <div
          aria-label="Example conversation to travel plan"
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
              src="/images/wayfare-hybrid-hero-v2.jpg"
            />
            <div className="travel-hero__media-veil" aria-hidden="true" />
            <div className="travel-hero__journey">
              <span>Example planning flow</span>
              <strong>One conversation. A clearer travel plan.</strong>
              <div className="travel-hero__route">
                <span>{routeOrigin}</span>
                <ArrowRight aria-hidden="true" strokeWidth={1.75} />
                <span>Rome (FCO)</span>
              </div>
              <small>2 travelers · Next weekend</small>
            </div>
          </div>

          <article className="travel-hero__story-card travel-hero__story-card--request">
            <span className="travel-hero__story-icon">
              <MessageCircle aria-hidden="true" strokeWidth={1.75} />
            </span>
            <div>
              <strong>Your request</strong>
              <p>Find me a weekend flight to Rome for two.</p>
            </div>
          </article>

          <article className="travel-hero__story-card travel-hero__story-card--wayfare">
            <span className="travel-hero__story-icon travel-hero__story-icon--wayfare">
              <FlightCatchersBrand variant="mark" />
            </span>
            <div>
              <strong>Flight Catchers understands</strong>
              <ul>
                <li>Route and dates</li>
                <li>Traveler count</li>
                <li>Flights, stays, and rewards</li>
              </ul>
            </div>
          </article>

          <ol className="travel-hero__steps" aria-label="Flight Catchers planning steps">
            <li>
              <Search aria-hidden="true" strokeWidth={1.75} />
              <span>Search current flights</span>
            </li>
            <li>
              <ListFilter aria-hidden="true" strokeWidth={1.75} />
              <span>Compare flights and stays</span>
            </li>
            <li>
              <BadgeCheck aria-hidden="true" strokeWidth={1.75} />
              <span>Verify the fare and review the trip</span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
