'use client';

import Image from 'next/image';
import type React from 'react';
import { landingDestinations } from '../lib/landing-content';

interface DestinationInspirationProps {
  readonly onStart: (prompt: string) => void;
}

export function DestinationInspiration({
  onStart,
}: Readonly<DestinationInspirationProps>): React.JSX.Element {
  return (
    <section
      aria-labelledby="places-to-start-title"
      className="destination-inspiration travel-landing__section"
      id="places-to-start"
    >
      <header className="travel-section-heading">
        <h2 id="places-to-start-title">Places to start</h2>
      </header>
      <ul className="destination-inspiration__grid">
        {landingDestinations.map((destination, index) => (
          <li key={destination.id}>
            <button
              aria-label={`Plan a trip to ${destination.name}`}
              className="destination-card"
              onClick={() => onStart(destination.prompt)}
              type="button"
            >
              <Image
                alt=""
                className="destination-card__image"
                fill
                loading={index === 0 ? 'eager' : 'lazy'}
                sizes="(max-width: 700px) 100vw, (max-width: 1023px) 50vw, 33vw"
                src={destination.imageSrc}
                style={{ objectPosition: destination.imagePosition }}
              />
              <span aria-hidden="true" className="destination-card__scrim" />
              <span className="destination-card__copy">
                <strong>{destination.name}</strong>
                <span>{destination.descriptor}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
